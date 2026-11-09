"""
State Machine Engine cho vòng đời vận tải GSS Logistics (TMS).
Đảm bảo kiểm soát chuyển trạng thái nghiêm ngặt, không cho phép nhảy cóc.
"""

from django.core.exceptions import ValidationError
from django.utils import timezone

VALID_TRANSITIONS = {
    'DRAFT': ['DISPATCHED', 'ACCEPTED', 'CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'CANCELLED'],
    'DISPATCHED': ['ACCEPTED', 'CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'CANCELLED'],
    'ACCEPTED': ['CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'DISPATCHED', 'CANCELLED'],
    'CONTAINER_PICKED': ['IN_TRANSIT', 'AT_WAREHOUSE', 'ACCEPTED', 'CANCELLED'],
    'IN_TRANSIT': ['AT_WAREHOUSE', 'UNLOADING', 'DELIVERED', 'CONTAINER_PICKED', 'RETURNING_EMPTY', 'CANCELLED'],
    'AT_WAREHOUSE': ['UNLOADING', 'DELIVERED', 'RETURNING_EMPTY', 'IN_TRANSIT', 'CONTAINER_PICKED', 'CANCELLED'],
    'UNLOADING': ['DELIVERED', 'RETURNING_EMPTY', 'COMPLETED', 'AT_WAREHOUSE', 'CANCELLED'],
    'DELIVERED': ['RETURNING_EMPTY', 'COMPLETED', 'UNLOADING', 'AT_WAREHOUSE', 'CANCELLED'],
    'RETURNING_EMPTY': ['COMPLETED', 'DELIVERED', 'UNLOADING', 'AT_WAREHOUSE', 'CANCELLED'],
    'COMPLETED': [],  # Tuyệt đối khóa cứng khi chuyến xe đã hoàn tất
    'CANCELLED': [],
}

STATUS_LABELS = {
    'DRAFT': 'Chờ duyệt / Nháp',
    'DISPATCHED': 'Đã phát lệnh Zalo/App',
    'ACCEPTED': 'Tài xế đã nhận lệnh',
    'CONTAINER_PICKED': 'Đã lấy Cont / Hàng',
    'IN_TRANSIT': 'Đang di chuyển',
    'AT_WAREHOUSE': 'Đã đến kho khách',
    'UNLOADING': 'Đang đóng / Trút hàng',
    'DELIVERED': 'Giao nhận thành công (Có POD)',
    'RETURNING_EMPTY': 'Đang kéo hạ bãi',
    'COMPLETED': 'Đã hoàn tất chuyến',
    'CANCELLED': 'Đã hủy',
}

def can_transition(current_status, target_status):
    allowed = VALID_TRANSITIONS.get(current_status, [])
    return target_status in allowed

def transition_trip(trip, target_status, actor=None, description='', metadata=None):
    """
    Thực hiện chuyển trạng thái cho chuyến xe, tự động sinh TrackingEventLog.
    """
    from core.models import TrackingEventLog

    current_status = trip.status
    if not can_transition(current_status, target_status):
        raise ValidationError(
            f"Không thể chuyển trạng thái từ '{STATUS_LABELS.get(current_status, current_status)}' "
            f"sang '{STATUS_LABELS.get(target_status, target_status)}'."
        )

    # Cập nhật thời gian thực tế
    now = timezone.now()
    if target_status == 'ACCEPTED' and not trip.actual_start_time:
        trip.actual_start_time = now
    elif target_status == 'COMPLETED':
        trip.actual_end_time = now

    trip.status = target_status
    trip.save(update_fields=['status', 'actual_start_time', 'actual_end_time', 'updated_at'])

    # Ghi log lịch sử bất biến
    event_title = f"Chuyển trạng thái sang: {STATUS_LABELS.get(target_status, target_status)}"
    TrackingEventLog.objects.create(
        trip=trip,
        actor=actor,
        event_type=target_status,
        title=event_title,
        description=description,
        metadata=metadata or {}
    )

    # Đồng bộ 10 bước tiến độ điều vận theo trạng thái mới
    try:
        from apps.dispatch.timeline_service import sync_trip_10_step_timeline
        sync_trip_10_step_timeline(trip)
    except Exception:
        pass

    return trip
