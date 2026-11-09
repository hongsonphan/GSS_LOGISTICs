"""Booking cho GSS: tạo/sửa/hủy, DEM/DET kế thừa xuống các chuyến, tiến độ chia cont. Thay logic Booking 700 dòng của SPA cũ."""
import datetime
import re

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.customers.dem_det import describe
from apps.customers.models import BookingDocument, BookingOrder, BookingStatus, Customer
from apps.dispatch.models import AllocationStatus, BookingVendorAllocation, DispatchTrip
from apps.master_data.models import CompanyProfile, Location
from core.sequences import next_code

BOOKING_TYPES = ['EXPORT_FCL', 'IMPORT_FCL', 'DOMESTIC']
MAX_CONTAINERS = 500
MAX_DOCS = 10
_DATE_FIELDS = ('loading_date', 'dem_start_date', 'det_start_date', 'dem_expiry_override', 'det_expiry_override', 'eta', 'discharge_date', 'do_expiry')
_TEXT_FIELDS = {'booking_number': 50, 'shipping_line': 50, 'vessel_voyage': 100, 'container_size': 30, 'commodity': 255, 'hs_code': 50,
                'si_cutoff': 100, 'vgm_cutoff': 100, 'closing_time': 100, 'loading_time': 20, 'destination_notes': 4000,
                'road_restrictions': 4000, 'notes': 4000, 'mbl_number': 40, 'hbl_number': 40, 'port_of_loading': 100,
                'port_of_discharge': 100, 'supplier_name': 150}
_UPPER = ('booking_number', 'shipping_line', 'mbl_number', 'hbl_number')
_LOC_FIELDS = (('pickup', 'pickup_loc'), ('delivery', 'delivery_loc'), ('dropoff', 'dropoff_loc'))


def _date(value, label):
    if value in (None, ''):
        return None
    try:
        return datetime.date.fromisoformat(str(value).strip())
    except ValueError:
        raise ValidationError(f'{label} không hợp lệ (định dạng YYYY-MM-DD).')


def _int(value, label, lo, hi, default=None):
    if value in (None, ''):
        if default is None:
            raise ValidationError(f'Cần nhập {label}.')
        return default
    try:
        n = int(value)
    except (TypeError, ValueError):
        raise ValidationError(f'{label} phải là số nguyên.')
    if not lo <= n <= hi:
        raise ValidationError(f'{label} phải từ {lo} đến {hi}.')
    return n


def allocation_numbers(booking):
    allocs = BookingVendorAllocation.objects.filter(booking=booking, is_deleted=False).exclude(status=AllocationStatus.REVOKED)
    allocated = allocs.aggregate(t=Sum('allocated_containers'))['t'] or 0
    filled = DispatchTrip.objects.filter(booking_order=booking, is_deleted=False, vendor_allocation__isnull=False).exclude(step_status='CANCELLED').count()
    from apps.gss.models import BookingContainer
    conts = BookingContainer.objects.filter(booking=booking, is_deleted=False)
    n = conts.count()
    if n:  # phân bổ theo từng cont
        allocated = conts.filter(allocation__isnull=False).count()
    return {'allocated': allocated, 'filled': filled, 'unallocated': max(0, booking.total_containers - allocated), 'vendors': allocs.count(),
            'containers': n}


def serialize(b, detail=False):
    warn = CompanyProfile.get_default_company().warn_days
    nums = allocation_numbers(b)
    row = {
        'id': b.id, 'code': b.booking_code, 'customer_id': b.customer_id, 'customer': b.customer.name, 'booking_type': b.booking_type,
        'booking_number': b.booking_number, 'shipping_line': b.shipping_line, 'container_size': b.container_size, 'total_containers': b.total_containers,
        'status': b.status, 'status_label': b.get_status_display(), 'loading_date': b.loading_date.isoformat() if b.loading_date else '',
        'pickup_location': b.pickup_location, 'delivery_location': b.delivery_location, 'dropoff_location': b.dropoff_location,
        'dem': describe(b.dem_expiry, warn), 'det': describe(b.det_expiry, warn), **nums,
        'mbl_number': b.mbl_number, 'hbl_number': b.hbl_number, 'bl_number': b.hbl_number or b.mbl_number, 'cargo_mode': b.cargo_mode,
        'eta': _iso(b.eta), 'container_mode': nums.get('containers', 0) > 0,
    }
    if detail:
        row.update({
            'vessel_voyage': b.vessel_voyage, 'commodity': b.commodity, 'hs_code': b.hs_code, 'si_cutoff': b.si_cutoff, 'vgm_cutoff': b.vgm_cutoff,
            'closing_time': b.closing_time, 'loading_time': b.loading_time, 'free_time_demurrage': b.free_time_demurrage,
            'free_time_detention': b.free_time_detention, 'dem_start_date': _iso(b.dem_start_date), 'det_start_date': _iso(b.det_start_date),
            'dem_expiry_override': _iso(b.dem_expiry_override), 'det_expiry_override': _iso(b.det_expiry_override),
            'destination_notes': b.destination_notes, 'road_restrictions': b.road_restrictions, 'notes': b.notes,
            'selling_freight_price': float(b.selling_freight_price), 'pickup_loc_id': b.pickup_loc_id, 'delivery_loc_id': b.delivery_loc_id,
            'dropoff_loc_id': b.dropoff_loc_id, 'port_of_loading': b.port_of_loading, 'port_of_discharge': b.port_of_discharge,
            'supplier_name': b.supplier_name, 'discharge_date': _iso(b.discharge_date), 'do_expiry': _iso(b.do_expiry),
            'pod_template_id': b.pod_template_id, 'pod_template': b.pod_template.name if b.pod_template_id else '',
            'documents': [{'id': d.id, 'name': d.file_name or d.file.name.rsplit('/', 1)[-1], 'url': d.file.url if d.file else ''} for d in b.documents.filter(is_deleted=False)],
        })
    return row


def _iso(d):
    return d.isoformat() if d else ''


def listing(search='', status='', alert=''):
    qs = BookingOrder.objects.filter(is_deleted=False).select_related('customer')
    if status in BookingStatus.values:
        qs = qs.filter(status=status)
    if search:
        qs = qs.filter(Q(booking_code__icontains=search) | Q(booking_number__icontains=search) | Q(customer__name__icontains=search)
                       | Q(commodity__icontains=search) | Q(mbl_number__icontains=search) | Q(hbl_number__icontains=search)
                       | Q(containers__container_number__icontains=search.replace(' ', '').upper())).distinct()
    return qs.order_by('-created_at', '-id')


@transaction.atomic
def save_booking(data, booking=None):
    """Tạo (booking=None) hoặc cập nhật booking từ dict `data`. Ném ValidationError với thông báo tiếng Việt."""
    creating = booking is None
    if creating:
        customer = Customer.objects.filter(pk=data.get('customer_id'), is_deleted=False).first()
        if not customer:
            raise ValidationError('Chưa chọn khách hàng hợp lệ.')
        booking = BookingOrder(customer=customer)
    else:
        booking = BookingOrder.objects.select_for_update().get(pk=booking.pk)
        if 'customer_id' in data and int(data['customer_id'] or 0) != booking.customer_id:
            if booking.trips.filter(is_deleted=False).exists():
                raise ValidationError('Booking đã có chuyến xe, không đổi khách hàng được.')
            customer = Customer.objects.filter(pk=data['customer_id'], is_deleted=False).first()
            if not customer:
                raise ValidationError('Khách hàng không hợp lệ.')
            booking.customer = customer
    if (b_type := data.get('booking_type')) is not None:
        if b_type not in BOOKING_TYPES:
            raise ValidationError('Loại booking không hợp lệ.')
        booking.booking_type = b_type
    for key, size in _TEXT_FIELDS.items():
        if key in data:
            val = str(data[key] or '').strip()
            if len(val) > size:
                raise ValidationError(f'{key} quá dài (tối đa {size} ký tự).')
            setattr(booking, key, val.upper() if key in _UPPER else val)
    for key in _DATE_FIELDS:
        if key in data:
            setattr(booking, key, _date(data[key], key))
    if creating and not booking.loading_date:
        booking.loading_date = timezone.localdate()
    if 'cargo_mode' in data:
        if data['cargo_mode'] not in ('FCL', 'LCL'):
            raise ValidationError('Hình thức hàng phải là FCL hoặc LCL.')
        booking.cargo_mode = data['cargo_mode']
    if 'pod_template_id' in data:
        from apps.customers.models import PodTemplate
        tid = data.get('pod_template_id')
        booking.pod_template = PodTemplate.objects.filter(pk=tid, is_deleted=False, is_active=True).first() if tid else None
        if tid and booking.pod_template is None:
            raise ValidationError('Mẫu phiếu giao hàng không hợp lệ.')
    has_list = (not creating) and booking.containers.filter(is_deleted=False).exists()
    if ('total_containers' in data or creating) and not has_list:  # có danh sách cont thì tổng = số dòng danh sách
        total = _int(data.get('total_containers'), 'Tổng số cont', 1, MAX_CONTAINERS, default=1 if creating else booking.total_containers)
        if not creating:
            used = max(allocation_numbers(booking)['allocated'], booking.trips.filter(is_deleted=False).exclude(step_status='CANCELLED').count())
            if total < used:
                raise ValidationError(f'Không giảm tổng cont xuống {total}: đã chia/điều {used} cont.')
        booking.total_containers = total
    for key, lo, hi in (('free_time_demurrage', 0, 365), ('free_time_detention', 0, 365)):
        if key in data:
            setattr(booking, key, _int(data[key], key, lo, hi))
    if 'selling_freight_price' in data:
        try:
            price = float(data['selling_freight_price'] or 0)
        except (TypeError, ValueError):
            raise ValidationError('Đơn giá cước không hợp lệ.')
        if price < 0:
            raise ValidationError('Đơn giá cước không được âm.')
        booking.selling_freight_price = price
    for name, fk in _LOC_FIELDS:
        if f'{fk}_id' in data or name in data:
            loc = Location.objects.filter(pk=data.get(f'{fk}_id'), is_deleted=False).first() if data.get(f'{fk}_id') else None
            setattr(booking, fk, loc)
            text = loc.name if loc else str(data.get(name) or '').strip()
            setattr(booking, f'{name}_location', text.upper()[:150])
    if creating and not (booking.pickup_location and booking.delivery_location):
        raise ValidationError('Cần nhập nơi nhận và nơi giao.')
    if (st := data.get('status')) is not None and st != booking.status:
        if st not in BookingStatus.values:
            raise ValidationError('Trạng thái không hợp lệ.')
        if st == BookingStatus.CANCELLED and not creating and booking.trips.filter(is_deleted=False).exclude(step_status__in=['CANCELLED', 'READY']).exists():
            raise ValidationError('Booking có chuyến đã chạy, không hủy được. Hãy hủy từng chuyến trước.')
        booking.status = st
    if creating:
        booking.booking_code = next_code(BookingOrder, 'booking_code', f'BK.{timezone.localdate():%y%m}.', 3)
    booking.save()
    if not creating:
        propagate_dem_det(booking)
        if has_list:
            from apps.gss.containers import propagate_expiry
            propagate_expiry(booking)  # cont có hạn riêng
    return booking


def propagate_dem_det(booking):
    """Cập nhật hạn DEM/DET xuống các chuyến chưa kết thúc: DEM tới khi lấy cont, DET tới khi trả vỏ rỗng."""
    trips = DispatchTrip.objects.filter(booking_order=booking, is_deleted=False)
    trips.exclude(step_status__in=['LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED', 'RETURNING_EMPTY', 'EMPTY_RETURNED', 'CANCELLED']) \
        .update(dem_expiry_date=booking.dem_expiry, dem_free_days=booking.free_time_demurrage or 0)
    trips.exclude(step_status__in=['EMPTY_RETURNED', 'CANCELLED']).update(det_expiry_date=booking.det_expiry, det_free_days=booking.free_time_detention or 0)


def add_documents(booking, files):
    from core.validators import sanitize_filename, validate_uploaded_document
    files = list(files or [])
    if not files:
        raise ValidationError('Chưa chọn file.')
    have = booking.documents.filter(is_deleted=False).count()
    if have + len(files) > MAX_DOCS:
        raise ValidationError(f'Mỗi booking tối đa {MAX_DOCS} file đính kèm (còn nhận thêm {max(MAX_DOCS - have, 0)}).')
    for f in files:
        validate_uploaded_document(f)
    out = []
    for f in files:
        name = re.sub(r'\s+', '_', sanitize_filename(f.name))
        out.append(BookingDocument.objects.create(booking=booking, file=f, file_name=f'{booking.booking_code}_{name}'[:255], file_size=f.size))
    return out
