"""Chia container của Booking cho nhà xe và nhận danh sách xe/tài/cont qua Vendor Link.

Quy tắc chính (xem docs/GSS_RESTRUCTURE_PLAN.md §2.2):
- Tổng cont chia cho các nhà xe không vượt `booking.total_containers`.
- Token ngẫu nhiên, chỉ lưu băm SHA-256; link hết hạn / thu hồi / khóa được.
- Nhà xe chỉ sửa được dòng chưa bắt đầu chạy; từ sau đó chỉ điều vận GSS sửa.
- Dòng có biển số xe mới sinh `DispatchTrip` (Vehicle bắt buộc); dòng thiếu biển số lưu nháp trong `draft_rows`.
- Không để trùng số cont giữa các chuyến đang chạy; số cont sai chuẩn ISO 6346 chỉ cảnh báo.
"""
import hashlib
import re
import secrets
import time
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.dispatch import gss_workflow as wf
from apps.dispatch.models import (
    AllocationStatus, BookingVendorAllocation, DispatchTrip, ShipmentType, TripStatus,
)

DEFAULT_LINK_DAYS = 30
_PLATE_RE = re.compile(r'^[A-Z0-9][A-Z0-9 .\-]{3,18}$')
_PHONE_RE = re.compile(r'^\+?[0-9 .\-]{8,16}$')
_CONT_RE = re.compile(r'^[A-Z]{4}\d{7}$')
FIELDS = ('container_number', 'seal_number', 'tractor_plate', 'trailer_plate', 'driver_name', 'driver_phone', 'vendor_note')


# ---------- token ----------
def hash_token(raw):
    return hashlib.sha256(raw.encode()).hexdigest()


def _new_token():
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def audit_allocation(alloc, event, user=None, extra=None):
    """Nhật ký kiểm toán cho mọi lần cấp / cấp lại / thu hồi / khoá / mở khoá quyền nhà xe."""
    from core.models import AuditLog
    ok = user is not None and getattr(user, 'is_authenticated', False)
    AuditLog.objects.create(
        actor=user if ok else None, actor_label=user.get_username() if ok else 'hệ thống', action='update',
        model_label='dispatch.bookingvendorallocation', object_id=str(alloc.pk),
        object_repr=f'{alloc.booking.booking_code} · {alloc.subcontractor.short_name or alloc.subcontractor.name}'[:255],
        changes={'event': event, **(extra or {})}, company=alloc.company)


def container_mode(booking):
    """Booking có danh sách cont (apps.gss): phân bổ theo từng cont thay vì theo số lượng."""
    from apps.gss.models import BookingContainer
    return BookingContainer.objects.filter(booking=booking, is_deleted=False).exists()


def lifecycle(alloc):
    """Vòng đời quyền nhà xe: hoàn tất khi mọi dòng đã có chuyến và mọi chuyến đã hạ rỗng/huỷ;
    sau đó nhà xe chỉ xem trong `vendor_readonly_days` ngày rồi link tự đóng."""
    from apps.master_data.models import CompanyProfile
    trips = list(alloc.trips.filter(is_deleted=False).values_list('step_status', 'empty_returned_at', 'updated_at'))
    active = [t for t in trips if t[0] != 'CANCELLED']
    finished = bool(active) and len(active) >= alloc.allocated_containers and all(t[0] == 'EMPTY_RETURNED' for t in active)
    finished_at = max((t[1] or t[2] for t in active), default=None) if finished else None
    days = CompanyProfile.get_default_company().vendor_readonly_days
    closed = bool(finished_at and finished_at + timedelta(days=days) < timezone.now())
    return {'finished': finished, 'finished_at': finished_at.isoformat() if finished_at else None, 'readonly': finished,
            'closed': closed, 'readonly_days': days}


def allocation_by_token(raw):
    """Phiếu ứng với token; None nếu sai/đã thu hồi/đã xóa. Hết hạn do nơi gọi kiểm tra bằng `is_expired`."""
    if not raw or len(raw) > 100:
        return None
    return (BookingVendorAllocation.objects
            .select_related('booking', 'booking__customer', 'subcontractor')
            .filter(token_hash=hash_token(raw), is_deleted=False)
            .exclude(status=AllocationStatus.REVOKED).first())


def is_expired(alloc):
    return bool(alloc.expires_at and alloc.expires_at < timezone.now())


# ---------- chia cont ----------
def allocated_total(booking, exclude_pk=None):
    qs = BookingVendorAllocation.objects.filter(booking=booking, is_deleted=False).exclude(status=AllocationStatus.REVOKED)
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    return qs.aggregate(t=Sum('allocated_containers'))['t'] or 0


def _check_count(booking, count, exclude_pk=None):
    if not isinstance(count, int) or count < 1:
        raise ValidationError('Số cont chia phải là số nguyên ≥ 1.')
    left = booking.total_containers - allocated_total(booking, exclude_pk)
    if count > left:
        raise ValidationError(f'Chỉ còn {max(left, 0)} cont chưa chia của booking {booking.booking_code}.')


@transaction.atomic
def create_allocation(booking, subcontractor, count, expires_days=DEFAULT_LINK_DAYS, note='', user=None, **kwargs):
    """Tạo phiếu chia cont; trả (phiếu, token gốc – chỉ hiện một lần)."""
    type(booking).objects.select_for_update().get(pk=booking.pk)  # khóa booking để hai người chia cùng lúc không vượt tổng
    if container_mode(booking):
        raise ValidationError('Booking đã có danh sách cont: hãy phân bổ từng cont cho nhà xe ở bảng danh sách cont.')
    if not subcontractor.is_active:
        raise ValidationError('Nhà xe đã ngừng hoạt động.')
    _check_count(booking, count)
    raw, hashed = _new_token()
    drafts = dict(kwargs.get('draft_rows') if 'draft_rows' in kwargs else {})
    drafts['_raw_token'] = raw
    alloc = BookingVendorAllocation.objects.create(
        booking=booking, subcontractor=subcontractor, allocated_containers=count, token_hash=hashed,
        expires_at=timezone.now() + timedelta(days=expires_days) if expires_days else None, note=note[:255],
        draft_rows=drafts)
    audit_allocation(alloc, 'GRANT', user, {'containers': count, 'expires_days': expires_days})
    return alloc, raw


@transaction.atomic
def resize_allocation(alloc, count):
    alloc = BookingVendorAllocation.objects.select_for_update().get(pk=alloc.pk)
    type(alloc.booking).objects.select_for_update().get(pk=alloc.booking_id)
    if container_mode(alloc.booking):
        raise ValidationError('Phiếu theo danh sách cont: thêm/bớt cont ở bảng danh sách cont của booking.')
    _check_count(alloc.booking, count, exclude_pk=alloc.pk)
    used = alloc.trips.filter(is_deleted=False).order_by('-vendor_line_no').values_list('vendor_line_no', flat=True).first() or 0
    if count < used:
        raise ValidationError(f'Không giảm xuống {count} cont vì dòng #{used} đã có chuyến xe.')
    alloc.allocated_containers = count
    alloc.draft_rows = {k: v for k, v in (alloc.draft_rows or {}).items() if str(k).isdigit() and int(k) <= count or str(k).startswith('_')}
    alloc.save(update_fields=['allocated_containers', 'draft_rows', 'updated_at'])
    refresh_status(alloc)
    return alloc


def regenerate_link(alloc, expires_days=DEFAULT_LINK_DAYS, user=None):
    """Cấp link mới, link cũ mất hiệu lực ngay."""
    if alloc.status == AllocationStatus.REVOKED:
        raise ValidationError('Phiếu đã thu hồi.')
    raw, hashed = _new_token()
    alloc.token_hash = hashed
    alloc.expires_at = timezone.now() + timedelta(days=expires_days) if expires_days else None
    alloc.save(update_fields=['token_hash', 'expires_at', 'updated_at'])
    audit_allocation(alloc, 'REGRANT', user, {'expires_days': expires_days})
    return raw


def revoke_allocation(alloc, user=None):
    if alloc.trips.filter(is_deleted=False).exists():
        raise ValidationError('Phiếu đã sinh chuyến xe, không thể thu hồi. Hãy khóa phiếu thay vì thu hồi.')
    alloc.status = AllocationStatus.REVOKED
    alloc.token_hash = hash_token(secrets.token_urlsafe(32))  # vô hiệu hóa link cũ
    alloc.save(update_fields=['status', 'token_hash', 'updated_at'])
    audit_allocation(alloc, 'REVOKE', user)


def set_locked(alloc, locked, user=None):
    alloc.locked_at = timezone.now() if locked else None
    alloc.save(update_fields=['locked_at', 'updated_at'])
    refresh_status(alloc)
    audit_allocation(alloc, 'LOCK' if locked else 'UNLOCK', user)


def refresh_status(alloc):
    if alloc.status == AllocationStatus.REVOKED:
        return alloc.status
    filled = alloc.trips.filter(is_deleted=False).exclude(step_status='CANCELLED').count()
    if alloc.locked_at:
        new = AllocationStatus.LOCKED
    elif filled >= alloc.allocated_containers:
        new = AllocationStatus.SUBMITTED
    elif filled or alloc.draft_rows:
        new = AllocationStatus.PARTIAL
    else:
        new = AllocationStatus.PENDING
    if new != alloc.status:
        alloc.status = new
        alloc.save(update_fields=['status', 'updated_at'])
    return new


# ---------- kiểm tra dữ liệu ----------
def iso6346_valid(number):
    """Kiểm tra số cont theo ISO 6346 (4 chữ + 6 số + số kiểm tra)."""
    if not _CONT_RE.match(number):
        return False
    values, n = {}, 10
    for ch in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        if n % 11 == 0:
            n += 1
        values[ch] = n
        n += 1
    total = sum((values[c] if c.isalpha() else int(c)) * (2 ** i) for i, c in enumerate(number[:10]))
    return total % 11 % 10 == int(number[10])


def _norm_plate(v):
    return re.sub(r'\s+', ' ', (v or '').strip().upper())


def _clean_row(raw):
    row = {k: str(raw.get(k) or '').strip() for k in FIELDS}
    row['container_number'] = re.sub(r'[\s\-.]', '', row['container_number']).upper()
    row['seal_number'] = row['seal_number'].upper()
    row['tractor_plate'] = _norm_plate(row['tractor_plate'])
    row['trailer_plate'] = _norm_plate(row['trailer_plate'])
    row['driver_name'] = row['driver_name'][:100]
    row['vendor_note'] = row['vendor_note'][:255]
    return row


def _validate_row(row):
    errors, warnings = [], []
    if row['tractor_plate'] and not _PLATE_RE.match(row['tractor_plate']):
        errors.append('Biển số xe đầu kéo không hợp lệ.')
    if row['trailer_plate'] and not _PLATE_RE.match(row['trailer_plate']):
        errors.append('Biển số rơ-moóc không hợp lệ.')
    if row['driver_phone'] and not _PHONE_RE.match(row['driver_phone']):
        errors.append('Số điện thoại tài xế không hợp lệ.')
    cn = row['container_number']
    if cn:
        if not _CONT_RE.match(cn):
            warnings.append('Số cont không đúng dạng 4 chữ + 7 số.')
        elif not iso6346_valid(cn):
            warnings.append('Số cont không khớp số kiểm tra ISO 6346, hãy kiểm tra lại.')
    return errors, warnings


def _is_blank(row):
    return not any(row[k] for k in FIELDS)


# ---------- đọc / ghi dòng ----------
def _serialize_milestones(trip):
    """Mốc thời gian 7 chặng hành trình của chuyến xe (không lộ thông tin nội bộ GSS)."""
    if not trip:
        return {}
    iso = lambda dt: dt.isoformat() if dt else None
    return {
        'created_at': iso(getattr(trip, 'created_at', None)),
        'arrived_pickup_at': iso(getattr(trip, 'arrived_pickup_at', None)),
        'loaded_at': iso(getattr(trip, 'loaded_at', None)),
        'arrived_delivery_at': iso(getattr(trip, 'arrived_delivery_at', None)),
        'unloaded_at': iso(getattr(trip, 'unloaded_at', None)),
        'empty_returning_at': iso(getattr(trip, 'empty_returning_at', None)),
        'empty_returned_at': iso(getattr(trip, 'empty_returned_at', None)),
    }


def _step_index(step_status):
    if step_status in wf.STEPS:
        return wf.STEPS.index(step_status) + 1
    return 0


def _trip_events_map(trip_ids):
    """Lấy tối đa 10 sự kiện TrackingEventLog mới nhất cho mỗi chuyến (ẩn actor nội bộ)."""
    if not trip_ids:
        return {}
    from core.models import TrackingEventLog
    out = {}
    logs = (
        TrackingEventLog.objects.filter(trip_id__in=trip_ids)
        .order_by('trip_id', '-event_time')
        .values('trip_id', 'event_type', 'title', 'description', 'event_time')
    )
    for row in logs:
        bucket = out.setdefault(row['trip_id'], [])
        if len(bucket) < 10:
            bucket.append({
                'event_type': row['event_type'],
                'title': row['title'],
                'description': row['description'] or '',
                'event_time': row['event_time'].isoformat() if row['event_time'] else None,
            })
    return out


def _trip_row(trip):
    return {
        'container_number': trip.container_number or '', 'seal_number': '' if trip.seal_number in ('', '-') else trip.seal_number,
        'tractor_plate': trip.vehicle.license_plate if trip.vehicle_id else '',
        'trailer_plate': (trip.trailer.license_plate if trip.trailer_id else trip.trailer_plate_text) or '',
        'driver_name': trip.subcontractor_driver_name or '', 'driver_phone': trip.subcontractor_driver_phone or '',
        'vendor_note': trip.vendor_note or '',
        'is_twin_container': bool(trip.is_twin_container),
        'container_number_2': trip.container_number_2 or '',
    }


def row_editable(trip):
    from apps.dispatch.gss_workflow import VENDOR_EDITABLE_STEPS  # nhà xe chỉ sửa tới khi tài xế lên xe nhận cont
    return trip is None or trip.step_status in VENDOR_EDITABLE_STEPS


def rows_for(alloc, for_vendor=True):
    """Đúng N dòng: dòng đã có chuyến lấy từ chuyến, dòng khác lấy từ bản nháp hoặc để trống."""
    from apps.gss.models import BookingContainer
    trips = {t.vendor_line_no: t for t in alloc.trips.filter(is_deleted=False).exclude(step_status='CANCELLED').select_related('vehicle', 'trailer')}
    events_map = _trip_events_map([t.id for t in trips.values()])
    cancelled_cn = {t.vendor_line_no: t.container_number for t in alloc.trips.filter(is_deleted=False, step_status='CANCELLED').order_by('id') if t.container_number}
    drafts = alloc.draft_rows or {}
    by_line = {c.alloc_line_no: c for c in BookingContainer.objects.filter(allocation=alloc, is_deleted=False).select_related('delivery_loc')}
    cmode = bool(by_line) or container_mode(alloc.booking)
    finished = lifecycle(alloc)['finished'] if for_vendor else False
    out = []
    for n in range(1, alloc.allocated_containers + 1):
        trip = trips.get(n)
        bc = by_line.get(n)
        data = _trip_row(trip) if trip else {**{k: '' for k in FIELDS}, **drafts.get(str(n), {})}
        moved = cmode and bc is None and trip is None
        if moved and not data.get('container_number') and n in cancelled_cn:
            data['container_number'] = cancelled_cn[n]
        if bc is not None and not trip:
            data['container_number'] = bc.container_number
            data['seal_number'] = data.get('seal_number') or bc.seal_number
        step_status = trip.step_status if trip else ''
        from apps.dispatch import gss_messages as msg
        trip_tok = msg.trip_token(trip) if trip else None
        driver_url = f'/q/{trip_tok}/' if trip_tok else None
        out.append({
            'line_no': n, **data,
            'trip_id': trip.id if trip else None,
            'trip_code': trip.trip_code if trip else None,
            'trip_token': trip_tok,
            'driver_token': trip.driver_token if trip else None,
            'driver_url': driver_url,
            'zalo_message': msg.compose_message(trip, '') if trip else '',
            'zalo_url': msg.zalo_url(trip.subcontractor_driver_phone) if trip else '',
            'pickup': (trip.pickup_location or '') if trip else '',
            'warehouse': (trip.warehouse_location or '') if trip else '',
            'dropoff': (trip.dropoff_location or '') if trip else '',
            'dem_expiry': trip.dem_expiry_date.strftime('%d/%m/%Y') if (trip and trip.dem_expiry_date) else '',
            'det_expiry': trip.det_expiry_date.strftime('%d/%m/%Y') if (trip and trip.det_expiry_date) else '',
            'step_status': step_status,
            'step_index': _step_index(step_status),
            'step_label': wf.STEP_LABELS.get(step_status, trip.get_step_status_display()) if trip else ('Đã chuyển cho nhà xe khác' if moved else ''),
            'milestones': _serialize_milestones(trip) if trip else {},
            'events': events_map.get(trip.id, []) if trip else [],
            'editable': (not moved and not finished and row_editable(trip)) if for_vendor else not moved,
            'container_locked': bool(bc is not None), 'moved': moved,
            'container_type': (bc.container_type if bc else '') or alloc.booking.container_size,
            'delivery': ((bc.delivery_loc.name if bc.delivery_loc_id else bc.delivery_address) if bc else '') or '',
        })
    return out


def _find_or_create_vehicle(plate, subcontractor):
    from apps.fleet.models import Vehicle, VehicleOwnership, VehicleType
    veh = _by_plate_key(getattr(Vehicle, 'all_objects', Vehicle.objects), plate)
    if veh:
        if veh.is_deleted:
            raise ValidationError(f'Biển số {plate} đã bị ngừng sử dụng trong danh mục, hãy liên hệ điều vận.')
        if veh.subcontractor_id and veh.subcontractor_id != subcontractor.id:
            raise ValidationError(f'Biển số {plate} đã thuộc nhà xe khác trong hệ thống, hãy liên hệ điều vận.')
        upd = []
        if veh.ownership_type != VehicleOwnership.SUBCONTRACTOR:
            veh.ownership_type = VehicleOwnership.SUBCONTRACTOR
            upd.append('ownership_type')
        if not veh.subcontractor_id or veh.ownership_type != VehicleOwnership.SUBCONTRACTOR:
            veh.subcontractor = subcontractor
            upd.append('subcontractor')
        if upd:
            upd.append('updated_at')
            veh.save(update_fields=upd)
        return veh
    return Vehicle.objects.create(
        license_plate=plate,
        vehicle_type=VehicleType.TRACTOR,
        ownership_type=VehicleOwnership.SUBCONTRACTOR,
        subcontractor=subcontractor,
        **({'company': subcontractor.company} if getattr(subcontractor, 'company_id', None) else {}),
    )



def _by_plate_key(manager, plate):
    """Tìm theo biển số chuẩn hoá: bỏ khoảng trắng, dấu chấm, gạch ngang, chữ hoa."""
    from django.db.models import Value
    from django.db.models.functions import Replace, Upper
    from apps.gss.containers import normalize_plate
    key = normalize_plate(plate)
    if not key:
        return None
    expr = Upper(Replace(Replace(Replace('license_plate', Value(' '), Value('')), Value('.'), Value('')), Value('-'), Value('')))
    return manager.annotate(_pk=expr).filter(_pk=key).order_by('is_deleted', 'id').first() if hasattr(manager.model, 'is_deleted') \
        else manager.annotate(_pk=expr).filter(_pk=key).order_by('id').first()


def _find_trailer(plate):
    from apps.fleet.models import Trailer
    return _by_plate_key(Trailer.objects, plate) if plate else None


def _container_in_use(number, exclude_trip_id=None):
    qs = DispatchTrip.objects.filter(container_number__iexact=number, is_deleted=False) \
        .exclude(status__in=[TripStatus.COMPLETED, TripStatus.CANCELLED])
    if exclude_trip_id:
        qs = qs.exclude(pk=exclude_trip_id)
    return qs.first()


_SHIPMENT = {'EXPORT_FCL': ShipmentType.EXPORT, 'IMPORT_FCL': ShipmentType.IMPORT, 'DOMESTIC': ShipmentType.DOMESTIC}


def _create_trip(alloc, line_no, row):
    veh = _find_or_create_vehicle(row['tractor_plate'], alloc.subcontractor)
    return build_trip(alloc.booking, alloc.subcontractor, row, veh, alloc=alloc, line_no=line_no)


def build_trip(booking, subcontractor, row, vehicle, *, alloc=None, line_no=None, customer=None, extra=None):
    """Sinh một DispatchTrip. Dùng chung cho dòng nhà xe nhập (alloc) và chuyến tạo thủ công (không alloc).

    booking có thể None (chuyến ngoài Booking): khi đó cần customer và extra={'pickup','delivery','dropoff','container_size','loading_date'}.
    """
    from core.sequences import next_code
    b, extra = booking, extra or {}
    trailer = _find_trailer(row['trailer_plate'])
    code = next_code(DispatchTrip, 'trip_code', f"VC.{timezone.localdate():%y%m}.", 3)
    common = dict(
        trip_code=code, vehicle=vehicle, trailer=trailer, trailer_plate_text='' if trailer else row['trailer_plate'],
        subcontractor=subcontractor, subcontractor_driver_name=row['driver_name'], subcontractor_driver_phone=row['driver_phone'],
        vendor_allocation=alloc, vendor_line_no=line_no, vendor_note=row['vendor_note'], container_number=row['container_number'],
        seal_number=row['seal_number'] or '-', status=TripStatus.DRAFT)
    if b is not None:
        return DispatchTrip.objects.create(
            shipment_type=_SHIPMENT.get(b.booking_type, ShipmentType.IMPORT), customer=b.customer, booking_order=b,
            container_type=b.container_size or '40HC', booking_or_bill=b.booking_number or '-', cutoff_time=b.closing_time or '-',
            pickup_location=(b.pickup_location or '').upper(), warehouse_location=(b.delivery_location or '').upper(),
            dropoff_location=(b.dropoff_location or '').upper(), pickup_loc=b.pickup_loc, warehouse_loc=b.delivery_loc,
            dropoff_loc=b.dropoff_loc, loading_date=b.loading_date, loading_time=b.loading_time or '08:00',
            det_free_days=b.free_time_detention or 0, dem_free_days=b.free_time_demurrage or 0,
            det_expiry_date=b.det_expiry, dem_expiry_date=b.dem_expiry, special_notes=b.notes or '', **common)
    return DispatchTrip.objects.create(
        shipment_type=ShipmentType.DOMESTIC, customer=customer, container_type=extra.get('container_size') or '40HC',
        booking_or_bill='-', pickup_location=(extra.get('pickup') or '').upper(), warehouse_location=(extra.get('delivery') or '').upper(),
        dropoff_location=(extra.get('dropoff') or '').upper(), loading_date=extra.get('loading_date'), special_notes=extra.get('notes', ''), **common)


def _apply_row(trip, alloc, row):
    """Cập nhật chuyến sẵn có; trả về dict {trường: (cũ, mới)} đã đổi."""
    changes = {}
    veh = trip.vehicle
    if row['tractor_plate'] and row['tractor_plate'].upper() != (veh.license_plate or '').upper():
        new_veh = _find_or_create_vehicle(row['tractor_plate'], alloc.subcontractor)
        changes['tractor_plate'] = (veh.license_plate, new_veh.license_plate)
        trip.vehicle = new_veh
    trailer = _find_trailer(row['trailer_plate'])
    old_tr = (trip.trailer.license_plate if trip.trailer_id else trip.trailer_plate_text) or ''
    if row['trailer_plate'] != old_tr:
        changes['trailer_plate'] = (old_tr, row['trailer_plate'])
        trip.trailer = trailer
        trip.trailer_plate_text = '' if trailer else row['trailer_plate']
    pairs = (('container_number', 'container_number'), ('subcontractor_driver_name', 'driver_name'),
             ('subcontractor_driver_phone', 'driver_phone'), ('vendor_note', 'vendor_note'))
    for attr, key in pairs:
        if (getattr(trip, attr) or '') != row[key]:
            changes[key] = (getattr(trip, attr) or '', row[key])
            setattr(trip, attr, row[key])
    seal_old = '' if trip.seal_number in ('', '-') else trip.seal_number
    if seal_old != row['seal_number']:
        changes['seal_number'] = (seal_old, row['seal_number'])
        trip.seal_number = row['seal_number'] or '-'
    return changes


def _log_changes(alloc, trip, changes, source, user=None):
    from core.models import AuditLog
    AuditLog.objects.create(
        actor=user if (user is not None and getattr(user, 'is_authenticated', False)) else None,
        actor_label=(user.get_username() if user is not None and getattr(user, 'is_authenticated', False)
                     else f'nhà xe {alloc.subcontractor.short_name or alloc.subcontractor.code} qua link'),
        action='update', model_label='dispatch.dispatchtrip', object_id=str(trip.pk), object_repr=trip.trip_code,
        changes={k: {'old': a, 'new': b} for k, (a, b) in changes.items()} | {'_source': source}, company=trip.company)


def _sync_paired_20_trips(rows, trips):
    """Liên kết cặp 2 cont 20ft chạy chung đầu kéo (is_twin_container + container_number_2 + sync_trip_containers)."""
    from apps.dispatch.models import sync_trip_containers
    for raw in rows:
        try:
            n = int(raw.get('line_no'))
            pair_n = int(raw.get('paired_with_line_no'))
        except (TypeError, ValueError):
            continue
        if n == pair_n:
            continue
        t1, t2 = trips.get(n), trips.get(pair_n)
        if not t1 or not t2:
            continue
        for pri, sec in ((t1, t2), (t2, t1)):
            pri.is_twin_container = True
            pri.container_number_2 = sec.container_number or ''
            pri.seal_number_2 = '' if sec.seal_number in ('', '-') else sec.seal_number
            pri.save(update_fields=['is_twin_container', 'container_number_2', 'seal_number_2', 'updated_at'])
            sync_trip_containers(pri)


@transaction.atomic
def submit_rows(alloc, rows, source='vendor', user=None):
    """Lưu các dòng gửi lên. rows: list dict có `line_no`. Trả {'results': [...], 'saved': n}.

    Lỗi một dòng không làm hỏng các dòng khác; mỗi kết quả có `ok`, `errors`, `warnings`.
    """
    alloc = BookingVendorAllocation.objects.select_for_update().select_related('booking', 'subcontractor').get(pk=alloc.pk)
    if alloc.status == AllocationStatus.REVOKED:
        raise ValidationError('Phiếu đã bị thu hồi.')
    if source == 'vendor':
        if alloc.locked_at:
            raise ValidationError('Phiếu đã khóa, nhà xe không thể sửa. Liên hệ điều vận GSS.')
        if is_expired(alloc):
            raise ValidationError('Link đã hết hạn, hãy xin điều vận GSS cấp link mới.')
        if lifecycle(alloc)['finished']:
            raise ValidationError('Lệnh đã hoàn tất, nhà xe chỉ còn xem. Liên hệ điều vận GSS nếu cần sửa.')
    from apps.gss.models import BookingContainer
    by_line = {c.alloc_line_no: c for c in BookingContainer.objects.filter(allocation=alloc, is_deleted=False)}
    cmode = bool(by_line) or container_mode(alloc.booking)
    trips = {t.vendor_line_no: t for t in alloc.trips.select_for_update(of=('self',)).filter(is_deleted=False).exclude(step_status='CANCELLED').select_related('vehicle', 'trailer')}
    drafts = dict(alloc.draft_rows or {})
    seen_containers, results, saved = {}, [], 0
    for raw in rows:
        try:
            n = int(raw.get('line_no'))
        except (TypeError, ValueError):
            results.append({'line_no': raw.get('line_no'), 'ok': False, 'errors': ['Thiếu số dòng.'], 'warnings': []})
            continue
        res = {'line_no': n, 'ok': True, 'errors': [], 'warnings': []}
        results.append(res)
        if not 1 <= n <= alloc.allocated_containers:
            res.update(ok=False, errors=[f'Dòng #{n} ngoài phạm vi 1..{alloc.allocated_containers}.'])
            continue
        row = _clean_row(raw)
        bc = by_line.get(n)
        if cmode and bc is None and not trips.get(n):
            res.update(ok=False, errors=['Dòng này đã chuyển cho nhà xe khác.'])
            continue
        if bc is not None and not trips.get(n):
            row['container_number'] = bc.container_number
            row['seal_number'] = row['seal_number'] or bc.seal_number.upper()
        errs, warns = _validate_row(row)
        res['errors'], res['warnings'] = errs, warns
        trip = trips.get(n)
        if trip and source == 'vendor' and not row_editable(trip):
            res.update(ok=False, errors=res['errors'] + ['Chuyến đã bắt đầu chạy, nhà xe không tự sửa được. Liên hệ điều vận GSS.'])
            continue
        if row['container_number']:
            other_line = seen_containers.get(row['container_number'])
            if other_line and other_line != n:
                res['errors'].append(f'Số cont trùng với dòng #{other_line}.')
            seen_containers[row['container_number']] = n
            used = _container_in_use(row['container_number'], trip.pk if trip else None)
            if used:
                res['errors'].append(f'Số cont đang dùng ở chuyến {used.trip_code}.')
        if res['errors']:
            res['ok'] = False
            continue
        try:
            if trip:
                if _is_blank(row):
                    continue  # nhà xe không xóa chuyến qua link
                changes = _apply_row(trip, alloc, row)
                if changes:
                    trip.save()
                    _log_changes(alloc, trip, changes, source, user)
                    saved += 1
            elif row['tractor_plate']:
                trip = _create_trip(alloc, n, row)
                trips[n] = trip
                drafts.pop(str(n), None)
                if bc is not None:
                    from apps.gss.containers import link_trip
                    link_trip(alloc, n, trip)
                saved += 1
            elif _is_blank(row) or (bc is not None and not any(row[k] for k in FIELDS if k not in ('container_number', 'seal_number'))):
                drafts.pop(str(n), None)
            else:
                drafts[str(n)] = row
                res['warnings'].append('Chưa có biển số xe đầu kéo nên dòng này mới được lưu nháp.')
                saved += 1
        except ValidationError as exc:
            res.update(ok=False, errors=res['errors'] + list(exc.messages))
    alloc.draft_rows = drafts
    alloc.last_submitted_at = timezone.now()
    alloc.save(update_fields=['draft_rows', 'last_submitted_at', 'updated_at'])
    refresh_status(alloc)
    sync_booking_progress(alloc.booking)
    _sync_paired_20_trips(rows, trips)
    return {'results': results, 'saved': saved}


@transaction.atomic
def clear_row(alloc, line_no, source='vendor', user=None):
    """Xóa nháp hoặc hủy gán xe dòng còn ở trạng thái READY (chưa chạy) để gán lại."""
    from core.models import AuditLog, TrackingEventLog
    from apps.gss.models import BookingContainer
    alloc = BookingVendorAllocation.objects.select_for_update().select_related('booking', 'subcontractor').get(pk=alloc.pk)
    if alloc.status == AllocationStatus.REVOKED:
        raise ValidationError('Phiếu đã bị thu hồi.')
    if source == 'vendor':
        if alloc.locked_at:
            raise ValidationError('Phiếu đã khóa, nhà xe không thể sửa/xóa. Liên hệ điều vận GSS.')
        if is_expired(alloc):
            raise ValidationError('Link đã hết hạn, hãy xin điều vận GSS cấp link mới.')
        if lifecycle(alloc)['finished']:
            raise ValidationError('Lệnh đã hoàn tất, nhà xe chỉ còn xem.')
    try:
        n = int(line_no)
    except (TypeError, ValueError):
        raise ValidationError('Số dòng không hợp lệ.')
    if not 1 <= n <= alloc.allocated_containers:
        raise ValidationError(f'Dòng #{n} ngoài phạm vi.')
    trip = alloc.trips.select_for_update().filter(is_deleted=False, vendor_line_no=n).exclude(step_status='CANCELLED').first()
    if trip:
        if source == 'vendor' and trip.step_status != 'READY':
            raise ValidationError('Chuyến đã bắt đầu thực hiện, không thể hủy gán xe qua cổng nhà xe. Liên hệ điều vận GSS.')
        old_plate = trip.vehicle.license_plate if trip.vehicle_id else ''
        trip.step_status = 'CANCELLED'
        trip.status = TripStatus.CANCELLED
        trip.is_deleted = True
        trip.vendor_line_no = None
        trip.save(update_fields=['step_status', 'status', 'is_deleted', 'vendor_line_no', 'updated_at'])
        BookingContainer.objects.filter(allocation=alloc, alloc_line_no=n, trip=trip).update(trip=None, updated_at=timezone.now())
        TrackingEventLog.objects.create(
            trip=trip, event_type='STEP_CANCELLED', title='Hủy gán xe',
            description=f'Hủy gán xe {old_plate} ở dòng #{n}', event_time=timezone.now(),
            metadata={'by': user.get_username() if (user and getattr(user, 'is_authenticated', False)) else f'nhà xe {alloc.subcontractor.short_name or alloc.subcontractor.code}'},
        )
        AuditLog.objects.create(
            actor=user if (user and getattr(user, 'is_authenticated', False)) else None,
            actor_label=user.get_username() if (user and getattr(user, 'is_authenticated', False)) else f'nhà xe {alloc.subcontractor.short_name or alloc.subcontractor.code} qua link',
            action='update', model_label='dispatch.dispatchtrip', object_id=str(trip.pk), object_repr=trip.trip_code,
            changes={'vendor_line_no': {'old': n, 'new': None}, '_source': source, '_action': 'clear_row'},
            company=trip.company,
        )
    drafts = dict(alloc.draft_rows or {})
    drafts.pop(str(n), None)
    alloc.draft_rows = drafts
    alloc.save(update_fields=['draft_rows', 'updated_at'])
    refresh_status(alloc)
    sync_booking_progress(alloc.booking)
    return {'cleared_line': n, 'message': f'Đã xóa/hủy gán xe dòng #{n}.'}


def sync_booking_progress(booking):
    """Cập nhật số cont đã điều và trạng thái booking theo số chuyến đang hoạt động."""
    from apps.customers.models import BookingStatus
    n = DispatchTrip.objects.filter(booking_order=booking, is_deleted=False).exclude(status=TripStatus.CANCELLED).count()
    if booking.status == BookingStatus.CANCELLED:
        return
    new_status = (BookingStatus.COMPLETED if n >= booking.total_containers
                  else BookingStatus.PARTIALLY_DISPATCHED if n else BookingStatus.PENDING_DISPATCH)
    if booking.dispatched_containers != n or booking.status != new_status:
        booking.dispatched_containers = n
        booking.status = new_status
        booking.save(update_fields=['dispatched_containers', 'status', 'updated_at'])


def allocation_summary(alloc, request=None):
    filled = alloc.trips.filter(is_deleted=False).exclude(step_status='CANCELLED').count()
    raw = (alloc.draft_rows or {}).get('_raw_token')
    vendor_link = request.build_absolute_uri(f'/vendor/{raw}/') if (request and raw) else ''
    return {
        'id': alloc.id, 'subcontractor_id': alloc.subcontractor_id,
        'subcontractor': alloc.subcontractor.short_name or alloc.subcontractor.name,
        'allocated_containers': alloc.allocated_containers, 'filled': filled,
        'draft': len(alloc.draft_rows or {}), 'status': alloc.status, 'status_label': alloc.get_status_display(),
        'expires_at': alloc.expires_at.isoformat() if alloc.expires_at else None, 'expired': is_expired(alloc),
        'locked': bool(alloc.locked_at), 'container_mode': container_mode(alloc.booking),
        'containers': alloc.containers.filter(is_deleted=False).count(), 'lifecycle': lifecycle(alloc),
        'last_opened_at': alloc.last_opened_at.isoformat() if alloc.last_opened_at else None,
        'last_submitted_at': alloc.last_submitted_at.isoformat() if alloc.last_submitted_at else None,
        'vendor_link': vendor_link,
    }


def effective_notes(booking):
    """Ghi chú điểm đến / cấm đường: ưu tiên của booking, thiếu thì lấy từ danh mục địa điểm giao."""
    loc = booking.delivery_loc
    return {
        'destination_notes': booking.destination_notes or (loc.destination_notes if loc else '') or '',
        'road_restrictions': booking.road_restrictions or (loc.road_restrictions if loc else '') or '',
    }


def send_vendor_allocation_email(alloc, raw_token, request=None):
    """Gửi email thông báo Lệnh Điều Động và link điều phối bảo mật cho Nhà xe."""
    import logging
    from django.conf import settings
    from django.core.mail import send_mail
    logger = logging.getLogger(__name__)

    sub = alloc.subcontractor
    to_email = getattr(sub, 'company_email', '') or getattr(sub, 'contact_email', '') or getattr(sub, 'email', '')
    if not to_email:
        logger.info(f"Subcontractor {sub.name} chưa cấu hình email, bỏ qua gửi email.")
        return False, "Nhà xe chưa có địa chỉ email liên hệ trong danh mục."

    if request:
        base_url = request.build_absolute_uri('/')[:-1]
    else:
        base_url = getattr(settings, 'SITE_URL', 'http://127.0.0.1:8086').rstrip('/')

    vendor_link = f"{base_url}/vendor/{raw_token}/"
    b = alloc.booking
    notes = effective_notes(b)

    brand = getattr(settings, 'EMAIL_BRAND_NAME', 'GSS TMS')
    subject = f"[{brand}] Lệnh Điều Động Vận Tải - Booking {b.booking_code} - {sub.name}"
    message = f"""Kính gửi Quý đối tác vận tải {sub.name},

Phòng Điều Vận trân trọng gửi thông tin Lệnh Điều Động vận chuyển thuộc Booking {b.booking_code}:
- Số lượng container được phân bổ: {alloc.allocated_containers} cont ({b.container_size or '40HC'})
- Lộ trình vận chuyển: {b.pickup_location or 'Nơi lấy'} -> {b.delivery_location or 'Nơi giao'} -> {b.dropoff_location or 'Hạ rỗng'}
- Hạn lệnh DEM / DET: {b.dem_expiry or '—'} / {b.det_expiry or '—'}
- Ghi chú điểm đến: {notes.get('destination_notes') or 'Theo chỉ dẫn kho'}
- Lưu ý cấm đường / giờ cấm tải: {notes.get('road_restrictions') or 'Tuân thủ biển báo giao thông'}

Quý nhà xe vui lòng bấm vào liên kết bảo mật dưới đây để gán Đầu kéo, Rơ-moóc và Bác tài nhận lệnh:
{vendor_link}

(Quý nhà xe cũng có thể chọn trực tiếp xe/tài đã từng chạy từ droplist hoặc tải file Excel mẫu về điền và tải lên hệ thống).

Trân trọng,
Phòng Điều Vận - Green Solutions Smart (GSS)
"""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False,
        )
        logger.info(f"Đã gửi email điều phối cho {sub.name} ({to_email}) thành công.")
        return True, f"Đã gửi email thành công tới {to_email}"
    except Exception as e:
        logger.warning(f"Lỗi gửi email cho nhà xe {sub.name}: {e}")
        return False, f"Lỗi gửi email: {str(e)}"


def _ensure_vendor_writable(alloc, action_label='sửa'):
    """Kiểm tra phiếu phân bổ còn cho phép nhà xe thao tác hay đã thu hồi / khóa / hết hạn / hoàn tất."""
    if alloc.status == AllocationStatus.REVOKED:
        raise ValidationError('Phiếu đã bị thu hồi.')
    if alloc.locked_at:
        raise ValidationError(f'Phiếu đã khóa, nhà xe không thể {action_label}. Liên hệ điều vận GSS.')
    if is_expired(alloc):
        raise ValidationError('Link đã hết hạn, hãy xin điều vận GSS cấp link mới.')
    if lifecycle(alloc)['finished']:
        raise ValidationError('Lệnh đã hoàn tất, nhà xe chỉ còn xem. Liên hệ điều vận GSS nếu cần sửa.')


def _phone_key(phone):
    """Chuẩn hóa SĐT để gộp trùng khi lấy danh mục tài xế của nhà xe."""
    raw = (phone or '').strip()
    digits = re.sub(r'\D', '', raw)
    return digits or raw.lower()


def vendor_catalog(subcontractor):
    """Trả về danh mục Đầu kéo, Rơ-moóc và Tài xế thuộc riêng một nhà xe."""
    from apps.fleet.models import Vehicle
    from apps.gss.containers import normalize_plate
    from apps.master_data.models import SubcontractorDriver, SubcontractorTrailer

    tractors_qs = (
        Vehicle.objects.filter(subcontractor=subcontractor, is_deleted=False)
        .order_by('license_plate')[:500]
    )
    tractors = [v.license_plate for v in tractors_qs]
    tractors_detail = []
    for v in tractors_qs:
        tractors_detail.append({
            'id': v.id,
            'plate': v.license_plate,
            'license_plate': v.license_plate,
            'brand': v.brand or '',
            'payload_capacity_kg': v.payload_capacity_kg or 0,
            'display_payload': v.display_payload,
            'registration_expiry': v.registration_expiry.strftime('%Y-%m-%d') if v.registration_expiry else '',
            'next_maintenance_date': v.next_maintenance_date.strftime('%Y-%m-%d') if v.next_maintenance_date else '',
            'status': v.status or 'IDLE',
            'notes': getattr(v, 'notes', '') or '',
        })

    trailers_map = {}
    trailers_detail_map = {}
    for tr in (
        SubcontractorTrailer.objects.filter(subcontractor=subcontractor, is_deleted=False, is_active=True)
        .order_by('license_plate')[:500]
    ):
        clean = _norm_plate(tr.license_plate)
        key = normalize_plate(clean)
        if clean and key and key not in trailers_map:
            trailers_map[key] = clean
            trailers_detail_map[key] = {
                'id': tr.id,
                'plate': clean,
                'license_plate': clean,
                'trailer_type': tr.trailer_type or 'Moóc Xương 40ft',
                'brand': getattr(tr, 'brand', '') or '',
                'payload_capacity_kg': getattr(tr, 'payload_capacity_kg', 32000) or 32000,
                'registration_expiry': tr.registration_expiry.strftime('%Y-%m-%d') if getattr(tr, 'registration_expiry', None) else '',
                'next_maintenance_date': tr.next_maintenance_date.strftime('%Y-%m-%d') if getattr(tr, 'next_maintenance_date', None) else '',
                'status': getattr(tr, 'status', 'ACTIVE') or 'ACTIVE',
                'notes': tr.notes or '',
            }

    drivers_map = {}
    for d in (
        SubcontractorDriver.objects.filter(subcontractor=subcontractor, is_deleted=False, is_active=True)
        .order_by('full_name')[:500]
    ):
        clean_phone = (d.phone or '').strip()
        key = _phone_key(clean_phone)
        if clean_phone and key and key not in drivers_map:
            drivers_map[key] = {
                'id': d.id,
                'phone': clean_phone,
                'name': (d.full_name or '').strip(),
                'full_name': (d.full_name or '').strip(),
                'citizen_id': getattr(d, 'citizen_id', '') or '',
                'age': getattr(d, 'age', None),
                'date_of_birth': d.date_of_birth.strftime('%Y-%m-%d') if getattr(d, 'date_of_birth', None) else '',
                'license_number': d.license_number or '',
                'license_class': getattr(d, 'license_class', '') or 'FC',
                'experience_years': getattr(d, 'experience_years', 0) or 0,
                'avatar_url': getattr(d, 'avatar_url', '') or '',
                'status': getattr(d, 'status', 'ACTIVE') or 'ACTIVE',
                'notes': d.notes or '',
            }

    trips = (
        DispatchTrip.objects.filter(subcontractor=subcontractor, is_deleted=False)
        .select_related('trailer')
        .order_by('-id')[:2000]
    )
    for t in trips:
        tp = _norm_plate((t.trailer.license_plate if t.trailer_id else t.trailer_plate_text) or '')
        tkey = normalize_plate(tp)
        if tp and tkey and tkey not in trailers_map:
            trailers_map[tkey] = tp
            trailers_detail_map[tkey] = {
                'id': None,
                'plate': tp,
                'license_plate': tp,
                'trailer_type': 'Moóc Xương 40ft',
                'brand': '',
                'payload_capacity_kg': 32000,
                'registration_expiry': '',
                'next_maintenance_date': '',
                'status': 'ACTIVE',
                'notes': '',
            }
        phone = (t.subcontractor_driver_phone or '').strip()
        pkey = _phone_key(phone)
        if phone and pkey and pkey not in drivers_map:
            drivers_map[pkey] = {
                'id': None,
                'phone': phone,
                'name': (t.subcontractor_driver_name or '').strip(),
                'full_name': (t.subcontractor_driver_name or '').strip(),
                'citizen_id': '',
                'age': None,
                'date_of_birth': '',
                'license_number': '',
                'license_class': 'FC',
                'experience_years': 0,
                'avatar_url': '',
                'status': 'ACTIVE',
                'notes': '',
            }

    trailers = sorted(trailers_map.values(), key=lambda s: s.upper())[:500]
    trailers_detail = sorted(trailers_detail_map.values(), key=lambda x: x['plate'].upper())[:500]
    drivers = sorted(drivers_map.values(), key=lambda d: ((d['name'] or '').lower(), d['phone']))[:500]

    return {
        'tractors': tractors,
        'trailers': trailers,
        'drivers': drivers,
        'tractors_detail': tractors_detail,
        'trailers_detail': trailers_detail,
    }


def _parse_custom_date(val):
    from datetime import datetime
    if not val:
        return None
    val_str = str(val).strip()[:10]
    for fmt in ('%Y-%m-%d', '%d/%m/%Y'):
        try:
            return datetime.strptime(val_str, fmt).date()
        except Exception:
            pass
    return None


@transaction.atomic
def add_vendor_catalog_item(alloc, payload):
    """Lưu mới (hoặc khôi phục) Đầu kéo / Rơ-moóc / Tài xế vào danh mục riêng của nhà xe."""
    alloc = BookingVendorAllocation.objects.select_related('booking', 'subcontractor').get(pk=alloc.pk)
    _ensure_vendor_writable(alloc, 'thêm danh mục')
    return upsert_subcontractor_catalog_item(alloc.subcontractor, payload)


@transaction.atomic
def upsert_subcontractor_catalog_item(sub, payload):
    """Tạo mới hoặc khôi phục Đầu kéo / Rơ-moóc / Tài xế trực tiếp cho một nhà xe."""
    from apps.master_data.models import SubcontractorDriver, SubcontractorTrailer
    from apps.fleet.models import Vehicle

    data = payload or {}
    action = str(data.get('action') or '').strip().lower()
    if action == 'delete':
        return delete_subcontractor_catalog_item(sub, data)
    if action == 'update' or data.get('id'):
        return update_subcontractor_catalog_item(sub, data)

    kind = str(data.get('kind') or '').strip().lower()

    if kind == 'tractor':
        plate = _norm_plate(data.get('license_plate') or data.get('plate') or data.get('value') or '')
        if not plate or not _PLATE_RE.match(plate):
            raise ValidationError('Biển số xe đầu kéo không hợp lệ.')
        veh = _find_or_create_vehicle(plate, sub)
        upd = []
        if 'brand' in data:
            veh.brand = str(data['brand'])[:50]; upd.append('brand')
        if 'payload_capacity_kg' in data:
            try: veh.payload_capacity_kg = int(data['payload_capacity_kg']); upd.append('payload_capacity_kg')
            except Exception: pass
        if 'registration_expiry' in data:
            veh.registration_expiry = _parse_custom_date(data['registration_expiry']); upd.append('registration_expiry')
        if 'next_maintenance_date' in data:
            veh.next_maintenance_date = _parse_custom_date(data['next_maintenance_date']); upd.append('next_maintenance_date')
        if 'status' in data and data['status']:
            veh.status = str(data['status'])[:20]; upd.append('status')
        if 'notes' in data:
            veh.notes = str(data['notes']); upd.append('notes')
        if upd:
            veh.save(update_fields=upd)
        item = {'kind': 'tractor', 'id': veh.id, 'value': veh.license_plate, 'plate': veh.license_plate}

    elif kind == 'trailer':
        plate = _norm_plate(data.get('license_plate') or data.get('plate') or data.get('value') or '')
        if not plate or not _PLATE_RE.match(plate):
            raise ValidationError('Biển số rơ-moóc không hợp lệ.')
        tr = _by_plate_key(SubcontractorTrailer.all_objects.filter(subcontractor=sub), plate)
        if tr:
            upd = []
            if tr.is_deleted:
                tr.is_deleted = False; upd.append('is_deleted')
            if not tr.is_active:
                tr.is_active = True; upd.append('is_active')
            if tr.license_plate != plate:
                tr.license_plate = plate; upd.append('license_plate')
            if 'trailer_type' in data and data['trailer_type']:
                tr.trailer_type = str(data['trailer_type'])[:100]; upd.append('trailer_type')
            if 'brand' in data:
                tr.brand = str(data['brand'])[:50]; upd.append('brand')
            if 'payload_capacity_kg' in data:
                try: tr.payload_capacity_kg = int(data['payload_capacity_kg']); upd.append('payload_capacity_kg')
                except Exception: pass
            if 'registration_expiry' in data:
                tr.registration_expiry = _parse_custom_date(data['registration_expiry']); upd.append('registration_expiry')
            if 'next_maintenance_date' in data:
                tr.next_maintenance_date = _parse_custom_date(data['next_maintenance_date']); upd.append('next_maintenance_date')
            if 'status' in data and data['status']:
                tr.status = str(data['status'])[:20]; upd.append('status')
            if 'notes' in data:
                tr.notes = str(data['notes']); upd.append('notes')
            if upd:
                upd.append('updated_at')
                tr.save(update_fields=upd)
        else:
            tr = SubcontractorTrailer.objects.create(
                subcontractor=sub,
                license_plate=plate,
                trailer_type=str(data.get('trailer_type') or 'Moóc Xương 40ft')[:100],
                brand=str(data.get('brand') or '')[:50],
                payload_capacity_kg=int(data.get('payload_capacity_kg') or 32000),
                registration_expiry=_parse_custom_date(data.get('registration_expiry')),
                next_maintenance_date=_parse_custom_date(data.get('next_maintenance_date')),
                status=str(data.get('status') or 'ACTIVE')[:20],
                notes=str(data.get('notes') or ''),
            )
        item = {'kind': 'trailer', 'id': tr.id, 'value': tr.license_plate, 'plate': tr.license_plate}

    elif kind == 'driver':
        name = str(data.get('full_name') or data.get('name') or '').strip()[:100]
        phone = str(data.get('phone') or '').strip()[:20]
        if not name:
            raise ValidationError('Vui lòng nhập họ tên tài xế.')
        if not phone or not _PHONE_RE.match(phone):
            raise ValidationError('Số điện thoại tài xế không hợp lệ.')
        target_key = _phone_key(phone)
        existing = None
        for d in SubcontractorDriver.all_objects.filter(subcontractor=sub).order_by('is_deleted', 'id'):
            if _phone_key(d.phone) == target_key:
                existing = d
                break
        if existing:
            upd = []
            if existing.is_deleted:
                existing.is_deleted = False; upd.append('is_deleted')
            if not existing.is_active:
                existing.is_active = True; upd.append('is_active')
            if existing.full_name != name:
                existing.full_name = name; upd.append('full_name')
            if existing.phone != phone:
                existing.phone = phone; upd.append('phone')
            if 'citizen_id' in data:
                existing.citizen_id = str(data['citizen_id'])[:20]; upd.append('citizen_id')
            if 'age' in data and data['age']:
                try: existing.age = int(data['age']); upd.append('age')
                except Exception: pass
            if 'date_of_birth' in data:
                existing.date_of_birth = _parse_custom_date(data['date_of_birth']); upd.append('date_of_birth')
            if 'license_number' in data:
                existing.license_number = str(data['license_number'])[:50]; upd.append('license_number')
            if 'license_class' in data and data['license_class']:
                existing.license_class = str(data['license_class'])[:20]; upd.append('license_class')
            if 'experience_years' in data and data['experience_years']:
                try: existing.experience_years = int(data['experience_years']); upd.append('experience_years')
                except Exception: pass
            if 'avatar_url' in data:
                existing.avatar_url = str(data['avatar_url'])[:500]; upd.append('avatar_url')
            if 'status' in data and data['status']:
                existing.status = str(data['status'])[:20]; upd.append('status')
            if 'notes' in data:
                existing.notes = str(data['notes']); upd.append('notes')
            if upd:
                upd.append('updated_at')
                existing.save(update_fields=upd)
            drv = existing
        else:
            age_val = None
            if data.get('age'):
                try: age_val = int(data['age'])
                except Exception: pass
            exp_val = 0
            if data.get('experience_years'):
                try: exp_val = int(data['experience_years'])
                except Exception: pass

            drv = SubcontractorDriver.objects.create(
                subcontractor=sub,
                full_name=name,
                phone=phone,
                citizen_id=str(data.get('citizen_id') or '')[:20],
                age=age_val,
                date_of_birth=_parse_custom_date(data.get('date_of_birth')),
                license_number=str(data.get('license_number') or '')[:50],
                license_class=str(data.get('license_class') or 'FC')[:20],
                experience_years=exp_val,
                avatar_url=str(data.get('avatar_url') or '')[:500],
                status=str(data.get('status') or 'ACTIVE')[:20],
                notes=str(data.get('notes') or ''),
            )
        item = {'kind': 'driver', 'id': drv.id, 'name': drv.full_name, 'phone': drv.phone}
    else:
        raise ValidationError('Loại danh mục không hợp lệ.')

    return {'item': item, 'catalog': vendor_catalog(sub)}


@transaction.atomic
def update_subcontractor_catalog_item(sub, payload):
    """Cập nhật chi tiết Đầu kéo / Rơ-moóc / Tài xế của nhà xe."""
    from apps.fleet.models import Vehicle
    from apps.master_data.models import SubcontractorDriver, SubcontractorTrailer

    data = payload or {}
    kind = str(data.get('kind') or '').strip().lower()
    item_id = data.get('id')

    if kind == 'tractor':
        plate = _norm_plate(data.get('license_plate') or data.get('plate') or data.get('value') or '')
        if not plate or not _PLATE_RE.match(plate):
            raise ValidationError('Biển số xe đầu kéo không hợp lệ.')
        veh = None
        if item_id:
            veh = Vehicle.objects.filter(id=item_id, subcontractor=sub, is_deleted=False).first()
        if not veh:
            veh = _find_or_create_vehicle(plate, sub)
        veh.license_plate = plate
        if 'brand' in data: veh.brand = str(data['brand'])[:50]
        if 'payload_capacity_kg' in data:
            try: veh.payload_capacity_kg = int(data['payload_capacity_kg'])
            except Exception: pass
        if 'registration_expiry' in data:
            veh.registration_expiry = _parse_custom_date(data['registration_expiry'])
        if 'next_maintenance_date' in data:
            veh.next_maintenance_date = _parse_custom_date(data['next_maintenance_date'])
        if 'status' in data and data['status']:
            veh.status = str(data['status'])[:20]
        if 'notes' in data:
            veh.notes = str(data['notes'])
        veh.save()
        item = {'kind': 'tractor', 'id': veh.id, 'value': veh.license_plate, 'plate': veh.license_plate}

    elif kind == 'trailer':
        plate = _norm_plate(data.get('license_plate') or data.get('plate') or data.get('value') or '')
        if not plate or not _PLATE_RE.match(plate):
            raise ValidationError('Biển số rơ-moóc không hợp lệ.')
        tr = None
        if item_id:
            tr = SubcontractorTrailer.objects.filter(id=item_id, subcontractor=sub, is_deleted=False).first()
        if not tr:
            tr = _by_plate_key(SubcontractorTrailer.all_objects.filter(subcontractor=sub), plate)
        if not tr:
            tr = SubcontractorTrailer(subcontractor=sub)
        tr.license_plate = plate
        tr.is_deleted = False
        tr.is_active = True
        if 'trailer_type' in data and data['trailer_type']: tr.trailer_type = str(data['trailer_type'])[:100]
        if 'brand' in data: tr.brand = str(data['brand'])[:50]
        if 'payload_capacity_kg' in data:
            try: tr.payload_capacity_kg = int(data['payload_capacity_kg'])
            except Exception: pass
        if 'registration_expiry' in data:
            tr.registration_expiry = _parse_custom_date(data['registration_expiry'])
        if 'next_maintenance_date' in data:
            tr.next_maintenance_date = _parse_custom_date(data['next_maintenance_date'])
        if 'status' in data and data['status']:
            tr.status = str(data['status'])[:20]
        if 'notes' in data:
            tr.notes = str(data['notes'])
        tr.save()
        item = {'kind': 'trailer', 'id': tr.id, 'value': tr.license_plate, 'plate': tr.license_plate}

    elif kind == 'driver':
        name = str(data.get('full_name') or data.get('name') or '').strip()[:100]
        phone = str(data.get('phone') or '').strip()[:20]
        if not name:
            raise ValidationError('Vui lòng nhập họ tên tài xế.')
        if not phone or not _PHONE_RE.match(phone):
            raise ValidationError('Số điện thoại tài xế không hợp lệ.')
        drv = None
        if item_id:
            drv = SubcontractorDriver.objects.filter(id=item_id, subcontractor=sub, is_deleted=False).first()
        if not drv:
            target_key = _phone_key(phone)
            for d in SubcontractorDriver.all_objects.filter(subcontractor=sub):
                if _phone_key(d.phone) == target_key:
                    drv = d
                    break
        if not drv:
            drv = SubcontractorDriver(subcontractor=sub)
        drv.full_name = name
        drv.phone = phone
        drv.is_deleted = False
        drv.is_active = True
        if 'citizen_id' in data: drv.citizen_id = str(data['citizen_id'])[:20]
        if 'age' in data and data['age']:
            try: drv.age = int(data['age'])
            except Exception: pass
        if 'date_of_birth' in data:
            drv.date_of_birth = _parse_custom_date(data['date_of_birth'])
        if 'license_number' in data: drv.license_number = str(data['license_number'])[:50]
        if 'license_class' in data and data['license_class']: drv.license_class = str(data['license_class'])[:20]
        if 'experience_years' in data and data['experience_years']:
            try: drv.experience_years = int(data['experience_years'])
            except Exception: pass
        if 'avatar_url' in data: drv.avatar_url = str(data['avatar_url'])[:500]
        if 'status' in data and data['status']: drv.status = str(data['status'])[:20]
        if 'notes' in data: drv.notes = str(data['notes'])
        drv.save()
        item = {'kind': 'driver', 'id': drv.id, 'name': drv.full_name, 'phone': drv.phone}
    else:
        raise ValidationError('Loại danh mục không hợp lệ.')

    return {'item': item, 'catalog': vendor_catalog(sub)}


@transaction.atomic
def delete_subcontractor_catalog_item(sub, payload):
    """Xóa (soft-delete) Đầu kéo / Rơ-moóc / Tài xế khỏi danh mục nhà xe."""
    from apps.fleet.models import Vehicle
    from apps.master_data.models import SubcontractorDriver, SubcontractorTrailer

    data = payload or {}
    kind = str(data.get('kind') or '').strip().lower()
    item_id = data.get('id')
    val = str(data.get('value') or data.get('plate') or data.get('license_plate') or data.get('phone') or '').strip()

    if kind == 'tractor':
        q = Vehicle.objects.filter(subcontractor=sub, is_deleted=False)
        v = None
        if item_id:
            v = q.filter(id=item_id).first()
        if not v and val:
            plate = _norm_plate(val)
            v = _by_plate_key(q, plate)
        if v:
            v.is_deleted = True
            v.save(update_fields=['is_deleted', 'updated_at'])
    elif kind == 'trailer':
        q = SubcontractorTrailer.objects.filter(subcontractor=sub, is_deleted=False)
        tr = None
        if item_id:
            tr = q.filter(id=item_id).first()
        if not tr and val:
            plate = _norm_plate(val)
            tr = _by_plate_key(q, plate)
        if tr:
            tr.is_deleted = True
            tr.is_active = False
            tr.save(update_fields=['is_deleted', 'is_active', 'updated_at'])
    elif kind == 'driver':
        q = SubcontractorDriver.objects.filter(subcontractor=sub, is_deleted=False)
        drv = None
        if item_id:
            drv = q.filter(id=item_id).first()
        if not drv and val:
            target_key = _phone_key(val)
            for d in q:
                if _phone_key(d.phone) == target_key:
                    drv = d
                    break
        if drv:
            drv.is_deleted = True
            drv.is_active = False
            drv.save(update_fields=['is_deleted', 'is_active', 'updated_at'])
    else:
        raise ValidationError('Loại danh mục không hợp lệ.')

    return {'success': True, 'catalog': vendor_catalog(sub)}



# ---------- xác thực & phiên Portal Nhà Xe ----------
VENDOR_SESSION_KEY = '_vendor_auth'
VENDOR_MAX_FAILED = 5
VENDOR_LOCK_MINUTES = 15


def subcontractor_requires_portal_auth(subcontractor):
    from django.conf import settings
    if getattr(settings, 'VENDOR_PORTAL_STRICT_3FACTOR', False):
        return True
    from apps.master_data.models import SubcontractorPortalAccount
    return SubcontractorPortalAccount.objects.filter(subcontractor=subcontractor, is_deleted=False, is_active=True).exists()


def _record_login_failure(acct):
    acct.failed_attempts = int(acct.failed_attempts or 0) + 1
    upd = ['failed_attempts', 'updated_at']
    if acct.failed_attempts >= VENDOR_MAX_FAILED:
        acct.locked_until = timezone.now() + timedelta(minutes=VENDOR_LOCK_MINUTES)
        upd.append('locked_until')
    acct.save(update_fields=upd)


def vendor_login(request, username, password, confirm_token=''):
    """Xác thực 3 lớp cho Portal Nhà xe: Username + Password + Mã Token xác nhận (hoặc token lệnh của nhà xe)."""
    from apps.master_data.models import SubcontractorPortalAccount

    uname = str(username or '').strip()
    pw = str(password or '')
    tok = str(confirm_token or '').strip()
    if not uname or not pw or not tok:
        raise ValidationError('Vui lòng nhập đầy đủ Tên đăng nhập, Mật khẩu và Mã Token xác nhận.')

    acct = (
        SubcontractorPortalAccount.objects
        .select_related('subcontractor')
        .filter(username__iexact=uname, is_deleted=False)
        .first()
    )
    if not acct or not acct.is_active or not acct.subcontractor.is_active:
        raise ValidationError('Tên đăng nhập hoặc thông tin xác thực không đúng.')

    if acct.locked_until and acct.locked_until > timezone.now():
        mins = max(1, int((acct.locked_until - timezone.now()).total_seconds() // 60) + 1)
        raise ValidationError(
            f'Tài khoản đang tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau {mins} phút hoặc liên hệ Điều vận GSS.',
            code='vendor_account_locked',
        )

    if not acct.check_password(pw):
        _record_login_failure(acct)
        if acct.locked_until and acct.locked_until > timezone.now():
            raise ValidationError(
                'Đã nhập sai 5 lần liên tiếp. Tài khoản tạm khóa 15 phút hoặc liên hệ Điều vận GSS mở khóa.',
                code='vendor_account_locked',
            )
        raise ValidationError('Tên đăng nhập, mật khẩu hoặc mã Token xác nhận không đúng.')

    token_ok = acct.check_confirm_token(tok)
    matched_alloc = None
    if not token_ok:
        alloc = allocation_by_token(tok)
        if alloc and alloc.subcontractor_id == acct.subcontractor_id and not lifecycle(alloc)['closed']:
            token_ok = True
            matched_alloc = alloc

    if not token_ok:
        _record_login_failure(acct)
        if acct.locked_until and acct.locked_until > timezone.now():
            raise ValidationError(
                'Đã nhập sai quá nhiều lần. Tài khoản tạm khóa 15 phút hoặc liên hệ Điều vận GSS mở khóa.',
                code='vendor_account_locked',
            )
        raise ValidationError('Mã Token xác nhận không hợp lệ hoặc không thuộc nhà xe này.')

    now_dt = timezone.now()
    acct.failed_attempts = 0
    acct.locked_until = None
    acct.last_login_at = now_dt
    acct.save(update_fields=['failed_attempts', 'locked_until', 'last_login_at', 'updated_at'])

    if hasattr(request, 'session'):
        try:
            request.session.cycle_key()
        except Exception:
            pass
        now_ts = int(time.time())
        idle_secs = max(60, int(acct.idle_timeout_minutes or 15) * 60)
        request.session[VENDOR_SESSION_KEY] = {
            'account_id': acct.id,
            'subcontractor_id': acct.subcontractor_id,
            'username': acct.username,
            'idle_seconds': idle_secs,
            'logged_in_at': now_ts,
            'last_seen': now_ts,
        }
        request.session.modified = True

    return {
        'authenticated': True,
        'username': acct.username,
        'subcontractor_id': acct.subcontractor_id,
        'subcontractor': acct.subcontractor.short_name or acct.subcontractor.name,
        'subcontractor_code': acct.subcontractor.code or '',
        'idle_timeout_minutes': int(acct.idle_timeout_minutes or 15),
        'matched_alloc_id': matched_alloc.id if matched_alloc else None,
    }


def vendor_logout(request):
    if hasattr(request, 'session'):
        request.session.pop(VENDOR_SESSION_KEY, None)
        request.session.modified = True


def vendor_session_state(request, touch=True):
    """Kiểm tra phiên Vendor hiện tại & thời gian nhàn rỗi; trả ( (acct, sess, remaining_secs), status_code_str )."""
    from apps.master_data.models import SubcontractorPortalAccount

    if not hasattr(request, 'session'):
        return None, 'unauthenticated'
    sess = request.session.get(VENDOR_SESSION_KEY)
    if not isinstance(sess, dict) or not sess.get('account_id'):
        return None, 'unauthenticated'

    now_ts = int(time.time())
    idle_secs = max(60, int(sess.get('idle_seconds') or 900))
    last_seen = int(sess.get('last_seen') or sess.get('logged_in_at') or now_ts)
    elapsed = now_ts - last_seen
    if elapsed > idle_secs:
        vendor_logout(request)
        return None, 'idle_expired'

    acct = (
        SubcontractorPortalAccount.objects
        .select_related('subcontractor')
        .filter(pk=sess.get('account_id'), is_deleted=False, is_active=True, subcontractor__is_active=True)
        .first()
    )
    if not acct or acct.subcontractor_id != sess.get('subcontractor_id'):
        vendor_logout(request)
        return None, 'account_disabled'

    # Đồng bộ idle_timeout_minutes mới nhất nếu admin đổi
    live_idle = max(60, int(acct.idle_timeout_minutes or 15) * 60)
    remaining = max(0, live_idle - elapsed)
    if touch:
        sess['last_seen'] = now_ts
        sess['idle_seconds'] = live_idle
        request.session[VENDOR_SESSION_KEY] = sess
        request.session.modified = True
        remaining = live_idle
    return (acct, sess, remaining), 'ok'


def provision_portal_account(subcontractor, data, user=None):
    """Tạo hoặc cập nhật tài khoản Portal cho nhà xe (chỉ Điều vận/Admin GSS gọi)."""
    from apps.master_data.models import SubcontractorPortalAccount

    d = data or {}
    acct = SubcontractorPortalAccount.all_objects.filter(subcontractor=subcontractor).first()
    creating = acct is None

    raw_uname = str(d.get('username') or '').strip()
    if creating and not raw_uname:
        raw_uname = (subcontractor.code or f'vendor{subcontractor.id}').lower()
    if raw_uname:
        if len(raw_uname) < 3:
            raise ValidationError('Tên đăng nhập phải có ít nhất 3 ký tự.')
        dup = SubcontractorPortalAccount.all_objects.filter(username__iexact=raw_uname).exclude(subcontractor=subcontractor).exists()
        if dup:
            raise ValidationError(f'Tên đăng nhập "{raw_uname}" đã được dùng cho nhà xe khác.')

    raw_pw = d.get('password')
    if creating and (not raw_pw or len(str(raw_pw)) < 6):
        raise ValidationError('Mật khẩu khởi tạo phải có ít nhất 6 ký tự.')
    if raw_pw not in (None, '') and len(str(raw_pw)) < 6:
        raise ValidationError('Mật khẩu mới phải có ít nhất 6 ký tự.')

    idle_mins = d.get('idle_timeout_minutes')
    if idle_mins not in (None, ''):
        try:
            idle_mins = int(idle_mins)
        except (TypeError, ValueError):
            raise ValidationError('Thời gian tự đăng xuất không hợp lệ.')
        if not 1 <= idle_mins <= 480:
            raise ValidationError('Thời gian tự đăng xuất phải từ 1 đến 480 phút.')

    if creating:
        acct = SubcontractorPortalAccount(
            subcontractor=subcontractor,
            username=raw_uname,
            idle_timeout_minutes=idle_mins if isinstance(idle_mins, int) else 15,
            is_active=bool(d.get('is_active', True)),
        )
    else:
        if acct.is_deleted:
            acct.is_deleted = False
        if raw_uname:
            acct.username = raw_uname
        if isinstance(idle_mins, int):
            acct.idle_timeout_minutes = idle_mins
        if 'is_active' in d:
            acct.is_active = bool(d.get('is_active'))
        if d.get('unlock'):
            acct.failed_attempts = 0
            acct.locked_until = None

    if raw_pw not in (None, ''):
        acct.set_password(str(raw_pw))

    issued_token = None
    if d.get('regenerate_token') or (creating and not d.get('confirm_token')):
        issued_token = 'GSSV-' + secrets.token_urlsafe(12).upper()
        acct.set_confirm_token(issued_token)
    elif d.get('confirm_token'):
        issued_token = str(d.get('confirm_token')).strip()
        if len(issued_token) < 6:
            raise ValidationError('Mã Token xác nhận phải có ít nhất 6 ký tự.')
        acct.set_confirm_token(issued_token)

    acct.notes = str(d.get('notes', acct.notes) or '')[:500]
    acct.save()

    from core.models import AuditLog
    ok_user = user is not None and getattr(user, 'is_authenticated', False)
    AuditLog.objects.create(
        actor=user if ok_user else None,
        actor_label=user.get_username() if ok_user else 'hệ thống',
        action='update',
        model_label='master_data.subcontractorportalaccount',
        object_id=str(acct.pk),
        object_repr=f'{acct.username} -> {subcontractor.short_name or subcontractor.name}'[:255],
        changes={'username': acct.username, 'idle_timeout_minutes': acct.idle_timeout_minutes, 'is_active': acct.is_active, 'token_rotated': bool(issued_token)},
        company=subcontractor.company,
    )
    return {
        'has_account': True,
        'username': acct.username,
        'confirm_token_preview': acct.confirm_token_preview,
        'issued_confirm_token': issued_token,
        'idle_timeout_minutes': acct.idle_timeout_minutes,
        'is_active': acct.is_active,
        'locked': bool(acct.locked_until and acct.locked_until > timezone.now()),
        'locked_until': acct.locked_until.isoformat() if acct.locked_until else None,
        'last_login_at': acct.last_login_at.isoformat() if acct.last_login_at else None,
    }


def vendor_overview(subcontractor):
    """Tổng hợp các Lệnh / Booking và KPI điều xe thuộc riêng nhà xe hiện tại (ẩn hoàn toàn khách hàng & tài chính)."""
    allocs = (
        BookingVendorAllocation.objects
        .filter(subcontractor=subcontractor, is_deleted=False)
        .exclude(status=AllocationStatus.REVOKED)
        .select_related('booking')
        .order_by('-id')[:60]
    )
    items = []
    total_cont = 0
    assigned_cont = 0
    in_transit_cont = 0
    completed_cont = 0

    for a in allocs:
        lc = lifecycle(a)
        if lc['closed']:
            continue
        trips = list(a.trips.filter(is_deleted=False).exclude(step_status='CANCELLED').values_list('step_status', flat=True))
        filled = len(trips)
        running = sum(1 for st in trips if st in ('ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY'))
        done = sum(1 for st in trips if st == 'EMPTY_RETURNED')
        total_cont += a.allocated_containers
        assigned_cont += filled
        in_transit_cont += running
        completed_cont += done
        b = a.booking
        items.append({
            'alloc_id': a.id,
            'booking_code': b.booking_code,
            'bl_number': b.hbl_number or b.mbl_number or b.booking_number or '',
            'shipping_line': b.shipping_line or '',
            'container_size': b.container_size or '',
            'commodity': b.commodity or '',
            'pickup_location': b.pickup_location or '',
            'delivery_location': b.delivery_location or '',
            'dropoff_location': b.dropoff_location or '',
            'loading_date': b.loading_date.isoformat() if b.loading_date else None,
            'allocated_containers': a.allocated_containers,
            'filled': filled,
            'running': running,
            'completed': done,
            'status': a.status,
            'status_label': a.get_status_display(),
            'locked': bool(a.locked_at),
            'expired': is_expired(a),
            'lifecycle': lc,
        })

    return {
        'subcontractor_id': subcontractor.id,
        'subcontractor': subcontractor.short_name or subcontractor.name,
        'subcontractor_code': subcontractor.code or '',
        'kpis': {
            'allocations_count': len(items),
            'total_containers': total_cont,
            'assigned_count': assigned_cont,
            'pending_count': max(0, total_cont - assigned_cont),
            'in_transit_count': in_transit_cont,
            'completed_count': completed_cont,
        },
        'allocations': items,
    }


def vendor_tracking_rows(subcontractor, alloc_id=None):
    """Danh sách chuyến xe để nhà xe theo dõi hành trình 7 chặng & nhật ký sự kiện của chính mình."""
    qs = (
        DispatchTrip.objects
        .filter(subcontractor=subcontractor, is_deleted=False)
        .exclude(step_status='CANCELLED')
        .select_related('vehicle', 'trailer', 'booking_order', 'vendor_allocation')
        .order_by('-id')
    )
    if alloc_id:
        qs = qs.filter(vendor_allocation_id=alloc_id)
    trips = list(qs[:200])
    events_map = _trip_events_map([t.id for t in trips])
    out = []
    for t in trips:
        b = t.booking_order
        out.append({
            'trip_id': t.id,
            'trip_code': t.trip_code,
            'alloc_id': t.vendor_allocation_id,
            'line_no': t.vendor_line_no,
            'booking_code': b.booking_code if b else '',
            'bl_number': (b.hbl_number or b.mbl_number or b.booking_number) if b else (t.booking_or_bill or ''),
            'container_number': t.container_number or '',
            'is_twin_container': bool(t.is_twin_container),
            'container_number_2': t.container_number_2 or '',
            'container_type': t.container_type or '',
            'seal_number': '' if t.seal_number in ('', '-') else t.seal_number,
            'tractor_plate': t.vehicle.license_plate if t.vehicle_id else '',
            'trailer_plate': (t.trailer.license_plate if t.trailer_id else t.trailer_plate_text) or '',
            'driver_name': t.subcontractor_driver_name or '',
            'driver_phone': t.subcontractor_driver_phone or '',
            'pickup_location': t.pickup_location or (b.pickup_location if b else ''),
            'delivery_location': t.warehouse_location or (b.delivery_location if b else ''),
            'dropoff_location': t.dropoff_location or (b.dropoff_location if b else ''),
            'loading_date': t.loading_date.isoformat() if t.loading_date else None,
            'loading_time': t.loading_time or '',
            'step_status': t.step_status,
            'step_index': _step_index(t.step_status),
            'step_label': wf.STEP_LABELS.get(t.step_status, t.get_step_status_display()),
            'milestones': _serialize_milestones(t),
            'events': events_map.get(t.id, []),
            'vendor_note': t.vendor_note or '',
            'editable': row_editable(t),
        })
    return out

