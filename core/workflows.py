"""
State Machine Engine cho vòng đời vận tải Bim Logistics (TMS).
Đảm bảo kiểm soát chuyển trạng thái nghiêm ngặt, không cho phép nhảy cóc.
"""

from django.core.exceptions import ValidationError
from django.utils import timezone

VALID_TRANSITIONS = {
    'DRAFT': ['DISPATCHED', 'CANCELLED'],
    'DISPATCHED': ['ACCEPTED', 'CANCELLED'],
    'ACCEPTED': ['CONTAINER_PICKED', 'CANCELLED'],
    'CONTAINER_PICKED': ['IN_TRANSIT', 'CANCELLED'],
    'IN_TRANSIT': ['AT_WAREHOUSE', 'CANCELLED'],
    'AT_WAREHOUSE': ['UNLOADING', 'CANCELLED'],
    'UNLOADING': ['DELIVERED', 'CANCELLED'],
    'DELIVERED': ['RETURNING_EMPTY', 'COMPLETED', 'CANCELLED'],
    'RETURNING_EMPTY': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],
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

    return trip
