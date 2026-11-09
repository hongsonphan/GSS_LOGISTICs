"""Bãi container (Đắk Nông): Gate-in / Gate-out, tồn bãi theo thời gian thực, ảnh kiểm định tại cổng (tối đa 10 ảnh/lượt)."""
import datetime
import re
import uuid

from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.depot_yard.models import CargoStatus, DepotContainerMovement, MovementPhoto, MovementStatus, OutPurpose, Yard
from core.validators import optimize_and_resize_image, sanitize_filename, validate_uploaded_document

DEFAULT_YARD_CODE = 'DAKNONG'
MAX_PHOTOS = 10
_CONT_RE = re.compile(r'^[A-Z0-9]{4,20}$')


def default_yard():
    yard = Yard.objects.filter(code=DEFAULT_YARD_CODE).first()
    if yard is None:
        yard = Yard.objects.create(code=DEFAULT_YARD_CODE, name='Bãi Cont Đắk Nông', address='Đắk Nông')
    return yard


def _norm_cont(v):
    return re.sub(r'[\s\-.]', '', (v or '')).upper()


def _plate(v):
    return re.sub(r'\s+', ' ', (v or '').strip().upper())[:20]


def _find_trip(container_number, trip_code=None):
    from apps.dispatch.models import DispatchTrip
    qs = DispatchTrip.objects.filter(is_deleted=False).exclude(step_status='CANCELLED')
    if trip_code:
        return qs.filter(trip_code=trip_code).first()
    return qs.filter(Q(container_number__iexact=container_number) | Q(return_container_number__iexact=container_number)) \
        .exclude(step_status='EMPTY_RETURNED').order_by('-created_at').first()


def serialize(m, with_photos=False):
    d = {
        'id': m.id, 'yard': m.yard.name, 'yard_id': m.yard_id, 'container_number': m.container_number,
        'container_type': m.container_type, 'shipping_line': m.shipping_line, 'cargo_status': m.cargo_status,
        'cargo_label': m.get_cargo_status_display(), 'condition_notes': m.condition_notes, 'status': m.status,
        'status_label': m.get_status_display(), 'storage_days': m.storage_days,
        'trip_code': m.trip.trip_code if m.trip_id else '', 'subcontractor': (m.subcontractor.short_name or m.subcontractor.name) if m.subcontractor_id else '',
        'subcontractor_id': m.subcontractor_id, 'customer': m.customer.name if m.customer_id else '',
        'gate_in_at': m.gate_in_at.isoformat(), 'in_vehicle_plate': m.in_vehicle_plate, 'in_trailer_plate': m.in_trailer_plate,
        'in_driver_name': m.in_driver_name, 'in_driver_phone': m.in_driver_phone,
        'gate_out_at': m.gate_out_at.isoformat() if m.gate_out_at else None, 'out_vehicle_plate': m.out_vehicle_plate,
        'out_driver_name': m.out_driver_name, 'out_driver_phone': m.out_driver_phone, 'out_purpose': m.out_purpose,
        'out_purpose_label': m.get_out_purpose_display() if m.out_purpose else '', 'notes': m.notes,
    }
    if with_photos:
        d['photos'] = [{'phase': p.phase, 'seq': p.sequence_no, 'url': p.file_path} for p in m.photos.all()]
    return d


@transaction.atomic
def gate_in(yard, data, *, label=''):
    cont = _norm_cont(data.get('container_number'))
    if not _CONT_RE.match(cont):
        raise ValidationError('Số container không hợp lệ.')
    plate = _plate(data.get('in_vehicle_plate'))
    if not plate:
        raise ValidationError('Cần nhập biển số xe chở cont đến.')
    cargo = data.get('cargo_status') or CargoStatus.EMPTY
    if cargo not in CargoStatus.values:
        raise ValidationError('Tình trạng cont (hàng/rỗng) không hợp lệ.')
    gate_in_at = _parse_dt(data.get('gate_in_at')) or timezone.now()
    if gate_in_at > timezone.now() + datetime.timedelta(minutes=5):
        raise ValidationError('Giờ đến không được ở tương lai.')
    exists = DepotContainerMovement.objects.filter(container_number=cont, status=MovementStatus.IN_YARD, is_deleted=False).select_related('yard').first()
    if exists:
        raise ValidationError(f'Cont {cont} đang nằm trong bãi {exists.yard.name} từ {timezone.localtime(exists.gate_in_at):%d/%m/%Y %H:%M}. Hãy ghi Gate-out trước.')
    trip = _find_trip(cont, data.get('trip_code'))
    if data.get('trip_code') and not trip:
        raise ValidationError('Không tìm thấy lệnh điều vận để liên kết.')
    try:
        m = DepotContainerMovement.objects.create(
            yard=yard, container_number=cont, container_type=(data.get('container_type') or (trip.container_type if trip else ''))[:30],
            shipping_line=(data.get('shipping_line') or '')[:50], cargo_status=cargo, condition_notes=(data.get('condition_notes') or '')[:255],
            trip=trip, subcontractor=trip.subcontractor if trip else None, customer=trip.customer if trip else None,
            gate_in_at=gate_in_at, in_vehicle_plate=plate, in_trailer_plate=_plate(data.get('in_trailer_plate')),
            in_driver_name=(data.get('in_driver_name') or '')[:100], in_driver_phone=(data.get('in_driver_phone') or '')[:20],
            gate_in_by=label[:150], notes=(data.get('notes') or '')[:255])
    except IntegrityError:
        raise ValidationError(f'Cont {cont} vừa được ghi vào bãi bởi người khác.')
    warnings = []
    cap = yard.capacity
    if cap and DepotContainerMovement.objects.filter(yard=yard, status=MovementStatus.IN_YARD, is_deleted=False).count() > cap:
        warnings.append(f'Bãi vượt sức chứa {cap} cont.')
    return m, warnings


@transaction.atomic
def gate_out(movement, data, *, label=''):
    m = DepotContainerMovement.objects.select_for_update().select_related('yard').get(pk=movement.pk)
    if m.status != MovementStatus.IN_YARD:
        raise ValidationError('Cont đã rời bãi.')
    plate = _plate(data.get('out_vehicle_plate'))
    if not plate:
        raise ValidationError('Cần nhập biển số xe kéo cont đi.')
    purpose = data.get('out_purpose')
    if purpose not in OutPurpose.values:
        raise ValidationError('Cần chọn mục đích xuất bãi.')
    out_at = _parse_dt(data.get('gate_out_at')) or timezone.now()
    if out_at < m.gate_in_at:
        raise ValidationError('Giờ đi không được trước giờ đến.')
    if out_at > timezone.now() + datetime.timedelta(minutes=5):
        raise ValidationError('Giờ đi không được ở tương lai.')
    m.status, m.gate_out_at, m.out_vehicle_plate, m.out_purpose = MovementStatus.DEPARTED, out_at, plate, purpose
    m.out_trailer_plate = _plate(data.get('out_trailer_plate'))
    m.out_driver_name = (data.get('out_driver_name') or '')[:100]
    m.out_driver_phone = (data.get('out_driver_phone') or '')[:20]
    m.gate_out_by = label[:150]
    if data.get('notes'):
        m.notes = str(data['notes'])[:255]
    m.save()
    return m


def _parse_dt(value):
    if not value:
        return None
    from django.utils.dateparse import parse_datetime
    dt = parse_datetime(str(value))
    if dt is None:
        raise ValidationError('Ngày giờ không hợp lệ.')
    return timezone.make_aware(dt) if timezone.is_naive(dt) else dt


def add_photos(movement, phase, files, *, label=''):
    if phase not in ('IN', 'OUT'):
        raise ValidationError('Giai đoạn ảnh không hợp lệ.')
    files = list(files or [])
    if not files:
        raise ValidationError('Chưa chọn ảnh.')
    for f in files:
        validate_uploaded_document(f)
    saved = []
    try:
        with transaction.atomic():
            m = DepotContainerMovement.objects.select_for_update().get(pk=movement.pk)
            have = MovementPhoto.objects.filter(movement=m, phase=phase).count()
            if have + len(files) > MAX_PHOTOS:
                raise ValidationError(f'Tối đa {MAX_PHOTOS} ảnh mỗi lượt; còn nhận thêm được {max(MAX_PHOTOS - have, 0)} ảnh.')
            out = []
            for i, f in enumerate(files, start=have + 1):
                opt = optimize_and_resize_image(f)
                name = default_storage.save(f'depot/{m.pk}/{phase}_{i:02d}_{uuid.uuid4().hex[:8]}_{sanitize_filename(opt.name)}', opt)
                saved.append(name)
                out.append(MovementPhoto.objects.create(movement=m, phase=phase, file_path=f'/media/{name}', sequence_no=i))
            return out
    except Exception:
        for n in saved:
            try:
                default_storage.delete(n)
            except Exception:
                pass
        raise


def stats(yard=None, warn_storage_days=7):
    """Chỉ số bãi theo thời gian thực. `yard=None` = tất cả bãi."""
    base = DepotContainerMovement.objects.filter(is_deleted=False)
    if yard:
        base = base.filter(yard=yard)
    in_yard = base.filter(status=MovementStatus.IN_YARD).select_related('subcontractor', 'customer')
    today = timezone.localdate()
    start = timezone.make_aware(datetime.datetime.combine(today, datetime.time.min))
    by_sub, by_cust = {}, {}
    long_stay = 0
    for m in in_yard:
        key = (m.subcontractor.short_name or m.subcontractor.name) if m.subcontractor_id else 'Chưa rõ nhà xe'
        by_sub[key] = by_sub.get(key, 0) + 1
        ck = m.customer.name if m.customer_id else 'Chưa rõ chủ hàng'
        by_cust[ck] = by_cust.get(ck, 0) + 1
        if m.storage_days > warn_storage_days:
            long_stay += 1
    agg = in_yard.aggregate(total=Count('id'), full=Count('id', filter=Q(cargo_status='FULL')), empty=Count('id', filter=Q(cargo_status='EMPTY')))
    return {
        'in_yard': agg['total'] or 0, 'full': agg['full'] or 0, 'empty': agg['empty'] or 0,
        'in_today': base.filter(gate_in_at__gte=start).count(), 'out_today': base.filter(gate_out_at__gte=start).count(),
        'long_stay': long_stay, 'by_subcontractor': by_sub, 'by_customer': by_cust,
        'capacity': yard.capacity if yard else None,
    }
