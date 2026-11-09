"""Tạo chuyến thủ công (ngoài luồng nhà xe tự nhập qua link): xe nhà hoặc xe nhà xe, có hoặc không gắn Booking."""
import datetime

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.customers.models import BookingOrder, Customer
from apps.dispatch import vendor_service as vsvc
from apps.dispatch.models import DispatchTrip
from apps.fleet.models import Vehicle, VehicleOwnership
from apps.master_data.models import Subcontractor


@transaction.atomic
def create_manual_trip(data):
    """Tạo một DispatchTrip từ dict `data`. Quy tắc:
    - Có booking: kế thừa khách/lộ trình/DEM-DET; tổng chuyến (chưa hủy) không vượt tổng cont của booking.
    - Không booking: bắt buộc khách hàng, nơi nhận, nơi giao.
    - Có nhà xe: tự tạo/nhận xe của nhà xe đó; không có nhà xe: xe phải có sẵn trong Đội xe nhà.
    """
    booking = None
    if data.get('booking_id'):
        booking = BookingOrder.objects.select_for_update().filter(pk=data['booking_id'], is_deleted=False).first()
        if not booking:
            raise ValidationError('Không tìm thấy booking.')
        if booking.status == 'CANCELLED':
            raise ValidationError('Booking đã hủy.')
        active = DispatchTrip.objects.filter(booking_order=booking, is_deleted=False).exclude(step_status='CANCELLED').count()
        if active >= booking.total_containers:
            raise ValidationError(f'Booking {booking.booking_code} đã đủ {booking.total_containers} cont, không thêm chuyến được.')
    customer = None
    extra = {}
    if booking is None:
        customer = Customer.objects.filter(pk=data.get('customer_id'), is_deleted=False).first()
        if not customer:
            raise ValidationError('Chuyến không có booking cần chọn khách hàng.')
        extra = {'pickup': str(data.get('pickup') or '').strip(), 'delivery': str(data.get('delivery') or '').strip(),
                 'dropoff': str(data.get('dropoff') or '').strip(), 'container_size': str(data.get('container_size') or '40HC').strip()[:30],
                 'notes': str(data.get('notes') or '').strip()[:4000]}
        if not extra['pickup'] or not extra['delivery']:
            raise ValidationError('Cần nhập nơi nhận và nơi giao.')
        try:
            extra['loading_date'] = datetime.date.fromisoformat(str(data['loading_date'])) if data.get('loading_date') else None
        except ValueError:
            raise ValidationError('Ngày hẹn không hợp lệ (YYYY-MM-DD).')

    sub = None
    if data.get('subcontractor_id'):
        sub = Subcontractor.objects.filter(pk=data['subcontractor_id'], is_deleted=False, is_active=True).first()
        if not sub:
            raise ValidationError('Nhà xe không hợp lệ hoặc đã ngừng hợp tác.')

    row = vsvc._clean_row(data)
    errors, _warnings = vsvc._validate_row(row)
    if not row['tractor_plate']:
        errors.append('Cần nhập biển số xe đầu kéo.')
    if errors:
        raise ValidationError(errors)
    if row['container_number']:
        used = vsvc._container_in_use(row['container_number'])
        if used:
            raise ValidationError(f'Số cont đang dùng ở chuyến {used.trip_code}.')

    if sub:
        vehicle = vsvc._find_or_create_vehicle(row['tractor_plate'], sub)
    else:
        vehicle = Vehicle.objects.filter(license_plate__iexact=row['tractor_plate'], ownership_type=VehicleOwnership.OWNED).first()
        if not vehicle:
            raise ValidationError(f'Biển số {row["tractor_plate"]} chưa có trong Đội xe nhà. Hãy chọn nhà xe nếu đây là xe thuê ngoài.')
    trip = vsvc.build_trip(booking, sub, row, vehicle, customer=customer, extra=extra)
    if booking:
        vsvc.sync_booking_progress(booking)
    return trip
