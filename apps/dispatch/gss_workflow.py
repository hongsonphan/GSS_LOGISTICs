"""Máy trạng thái điều vận GSS: Nhận cont → Giao hàng → Hạ rỗng.

READY → ARRIVED_AT_PICKUP → LOADED_ON_VEHICLE* → ARRIVED_AT_DELIVERY → UNLOADED* → RETURNING_EMPTY → EMPTY_RETURNED*
(* cần ≥ 1 chứng từ của chặng tương ứng, tối đa 10 file/chặng).

- Chỉ đi tiến từng bước. Điều vận (nhân viên) được lùi/nhảy bước hoặc bỏ qua chứng từ, nhưng phải có lý do và được ghi vết.
- Tài xế (qua link/QR) chỉ đi tiến đúng bước kế tiếp và phải đủ chứng từ.
- Mỗi lần chuyển ghi `TrackingEventLog` cùng giao dịch và đồng bộ một chiều sang `TripStatus` cũ để báo cáo/kế toán chạy tiếp.
"""
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.dispatch.models import DispatchTrip, TripStatus

STEPS = ['READY', 'ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY', 'EMPTY_RETURNED']
STEP_LABELS = {
    'READY': 'Sẵn sàng', 'ARRIVED_AT_PICKUP': 'Đã đến nơi nhận', 'LOADED_ON_VEHICLE': 'Đã lên xe (đã nhận cont/hàng)',
    'ARRIVED_AT_DELIVERY': 'Đã đến nơi giao', 'UNLOADED': 'Đã hạ xe / giao xong', 'RETURNING_EMPTY': 'Đang đi hạ rỗng',
    'EMPTY_RETURNED': 'Đã hạ rỗng', 'CANCELLED': 'Đã hủy',
}
# Bước hoàn tất của chặng → chặng chứng từ bắt buộc
EVIDENCE_STAGE = {'LOADED_ON_VEHICLE': 'PICKUP', 'UNLOADED': 'DELIVERY', 'EMPTY_RETURNED': 'EMPTY_RETURN'}
STAGE_LABELS = {'PICKUP': 'Nhận cont/hàng', 'DELIVERY': 'Giao hàng', 'EMPTY_RETURN': 'Hạ rỗng'}
TIMESTAMP_FIELD = {
    'ARRIVED_AT_PICKUP': 'arrived_pickup_at', 'LOADED_ON_VEHICLE': 'loaded_at', 'ARRIVED_AT_DELIVERY': 'arrived_delivery_at',
    'UNLOADED': 'unloaded_at', 'RETURNING_EMPTY': 'empty_returning_at', 'EMPTY_RETURNED': 'empty_returned_at',
}
LEGACY_STATUS = {
    'READY': TripStatus.DRAFT, 'ARRIVED_AT_PICKUP': TripStatus.ACCEPTED, 'LOADED_ON_VEHICLE': TripStatus.CONTAINER_PICKED,
    'ARRIVED_AT_DELIVERY': TripStatus.AT_WAREHOUSE, 'UNLOADED': TripStatus.DELIVERED,
    'RETURNING_EMPTY': TripStatus.RETURNING_EMPTY, 'EMPTY_RETURNED': TripStatus.COMPLETED, 'CANCELLED': TripStatus.CANCELLED,
}
MAX_FILES_PER_STAGE = 10
VENDOR_EDITABLE_STEPS = {'READY', 'ARRIVED_AT_PICKUP'}


def stage_file_count(trip, stage):
    from apps.documents.models import TripDocument
    return TripDocument.objects.filter(trip=trip, workflow_stage=stage, is_deleted=False).exclude(file_path='').count()


def next_step(current):
    if current not in STEPS:
        return None
    i = STEPS.index(current)
    return STEPS[i + 1] if i + 1 < len(STEPS) else None


def available_action(trip):
    """Bước kế tiếp mà tài xế có thể bấm, kèm điều kiện còn thiếu (để giao diện hiển thị)."""
    nxt = next_step(trip.step_status)
    if not nxt:
        return None
    stage = EVIDENCE_STAGE.get(nxt)
    have = stage_file_count(trip, stage) if stage else None
    return {
        'to': nxt, 'label': STEP_LABELS[nxt], 'needs_files': bool(stage), 'stage': stage,
        'files': have, 'ready': (not stage) or have >= 1,
        'needs_container_number': nxt == 'LOADED_ON_VEHICLE' and not trip.container_number,
        'allows_swap': nxt == 'EMPTY_RETURNED',
    }


def _guards(trip, target):
    """Các chốt chặn bổ sung của module khác (hàng lẻ có Seal...). Ném ValidationError nếu chưa đạt."""
    from apps.qr_tracking import service as qr_service
    qr_service.guard_step(trip, target)


@transaction.atomic
def advance(trip, target, *, user=None, actor_label='', reason='', fields=None, swap=None, force=False):
    """Chuyển chuyến sang bước `target`. `user` có khi do nhân viên thao tác; `force` chỉ có hiệu lực với nhân viên.

    fields: {'container_number','seal_number'} bổ sung khi nhận cont. swap: {'new_number','reason'} khi hạ rỗng.
    """
    staff = bool(user is not None and getattr(user, 'is_authenticated', False))
    trip = DispatchTrip.objects.select_for_update().get(pk=trip.pk)
    cur = trip.step_status
    reason = (reason or '').strip()
    if target not in STEPS:
        raise ValidationError('Bước đích không hợp lệ.')
    if cur == 'CANCELLED':
        raise ValidationError('Chuyến đã hủy.')
    if target == cur:
        raise ValidationError('Chuyến đang ở bước này rồi.')
    ci, ti = STEPS.index(cur), STEPS.index(target)
    backward, skipping = ti < ci, ti > ci + 1
    if (backward or skipping) and not (staff and force):
        raise ValidationError('Phải đi lần lượt từng bước kế tiếp.' if skipping else 'Tài xế không được lùi bước, hãy liên hệ điều vận.')
    if (backward or skipping or force) and staff and len(reason) < 5:
        raise ValidationError('Cần nhập lý do khi lùi/nhảy bước hoặc bỏ qua kiểm tra.')

    overridden = []
    if not backward:
        if fields:
            for key in ('container_number', 'seal_number'):
                val = (fields.get(key) or '').strip().upper()
                if val:
                    setattr(trip, key, val)
        stage = EVIDENCE_STAGE.get(target)
        if stage:
            n = stage_file_count(trip, stage)
            if n < 1:
                if staff and force:
                    overridden.append(f'bỏ qua chứng từ chặng {STAGE_LABELS[stage]}')
                else:
                    raise ValidationError(f'Phải đính kèm ít nhất 1 chứng từ chặng "{STAGE_LABELS[stage]}" (tối đa {MAX_FILES_PER_STAGE} file) trước khi chuyển bước.')
        if target == 'LOADED_ON_VEHICLE' and not (trip.container_number or '').strip():
            if staff and force:
                overridden.append('thiếu số container')
            else:
                raise ValidationError('Chưa có số container, hãy nhập số cont khi nhận hàng.')
        if not (staff and force):
            _guards(trip, target)
        if target == 'EMPTY_RETURNED':
            _apply_swap(trip, swap)

    now = timezone.now()
    if backward:
        for step in STEPS[ti + 1:]:
            if step in TIMESTAMP_FIELD:
                setattr(trip, TIMESTAMP_FIELD[step], None)
        if cur == 'EMPTY_RETURNED':  # mở lại chuyến đã hoàn tất: bỏ dấu hoàn tất và dữ liệu đổi vỏ / street-turn
            trip.actual_end_time = None
            trip.return_container_number, trip.is_container_swapped, trip.container_swap_reason = '', False, ''
            trip.is_street_turn, trip.street_turn_booking, trip.street_turn_reason = False, None, ''
    if target in TIMESTAMP_FIELD:
        setattr(trip, TIMESTAMP_FIELD[target], now)
    if target == 'ARRIVED_AT_PICKUP' and not trip.actual_start_time:
        trip.actual_start_time = now
    if target == 'EMPTY_RETURNED':
        trip.actual_end_time = now
    trip.step_status = target
    trip.status = LEGACY_STATUS[target]
    trip.save()

    from core.models import TrackingEventLog
    label = actor_label or (user.get_username() if staff else 'tài xế qua link/QR')
    TrackingEventLog.objects.create(
        trip=trip, event_type=f'STEP_{target}', title=f'{STEP_LABELS[target]}',
        description=reason, event_time=now,
        metadata={'from': cur, 'to': target, 'by': label, 'backward': backward, 'overridden': overridden,
                  'swapped': trip.is_container_swapped, 'return_container_number': trip.return_container_number})
    if target == 'EMPTY_RETURNED':
        from apps.gss.pricing import on_trip_completed  # tự áp biểu giá khi hoàn tất (lỗi chỉ ghi log)
        on_trip_completed(trip)
    return trip


def _apply_swap(trip, swap):
    """Đổi số cont khi hạ rỗng: giữ cả số lúc nhận/giao và số thực tế hạ rỗng; lý do bắt buộc."""
    swap = swap or {}
    new_no = (swap.get('new_number') or '').strip().upper().replace(' ', '')
    if not new_no or new_no == (trip.container_number or '').upper():
        trip.return_container_number, trip.is_container_swapped, trip.container_swap_reason = '', False, ''
        return
    why = (swap.get('reason') or '').strip()
    if len(why) < 3:
        raise ValidationError('Cần nhập lý do khi đổi số cont hạ rỗng.')
    from apps.dispatch.vendor_service import iso6346_valid
    if len(new_no) > 30:
        raise ValidationError('Số cont hạ rỗng quá dài.')
    in_use = DispatchTrip.objects.filter(is_deleted=False, container_number__iexact=new_no).exclude(pk=trip.pk) \
        .exclude(step_status__in=['EMPTY_RETURNED', 'CANCELLED']).first()
    if in_use:
        raise ValidationError(f'Số cont {new_no} đang dùng ở chuyến {in_use.trip_code}.')
    trip.return_container_number = new_no
    trip.is_container_swapped = True
    trip.container_swap_reason = why[:255]
    trip._swap_warning = None if iso6346_valid(new_no) else 'Số cont hạ rỗng không khớp số kiểm tra ISO 6346.'


def swap_label(trip):
    if trip.is_container_swapped and trip.return_container_number:
        return f'🔄 Đổi vỏ hạ: {trip.container_number} ➔ {trip.return_container_number}'
    return ''


def cancel(trip, *, user, reason):
    if not (user and user.is_authenticated):
        raise ValidationError('Chỉ nhân viên điều vận được hủy chuyến.')
    if len((reason or '').strip()) < 5:
        raise ValidationError('Cần nhập lý do hủy.')
    with transaction.atomic():
        trip = DispatchTrip.objects.select_for_update().get(pk=trip.pk)
        cur = trip.step_status
        if cur == 'CANCELLED' or (cur in STEPS and STEPS.index(cur) >= STEPS.index('LOADED_ON_VEHICLE')):
            raise ValidationError('Chỉ hủy được chuyến trước khi nhận cont.')
        trip.step_status, trip.status = 'CANCELLED', TripStatus.CANCELLED
        trip.save()
        from core.models import TrackingEventLog
        TrackingEventLog.objects.create(trip=trip, event_type='STEP_CANCELLED', title='Hủy chuyến', description=reason,
                                        metadata={'by': user.get_username()})
    return trip
