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
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

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
def create_allocation(booking, subcontractor, count, expires_days=DEFAULT_LINK_DAYS, note=''):
    """Tạo phiếu chia cont; trả (phiếu, token gốc – chỉ hiện một lần)."""
    type(booking).objects.select_for_update().get(pk=booking.pk)  # khóa booking để hai người chia cùng lúc không vượt tổng
    if not subcontractor.is_active:
        raise ValidationError('Nhà xe đã ngừng hoạt động.')
    _check_count(booking, count)
    raw, hashed = _new_token()
    alloc = BookingVendorAllocation.objects.create(
        booking=booking, subcontractor=subcontractor, allocated_containers=count, token_hash=hashed,
        expires_at=timezone.now() + timedelta(days=expires_days) if expires_days else None, note=note[:255])
    return alloc, raw


@transaction.atomic
def resize_allocation(alloc, count):
    alloc = BookingVendorAllocation.objects.select_for_update().get(pk=alloc.pk)
    type(alloc.booking).objects.select_for_update().get(pk=alloc.booking_id)
    _check_count(alloc.booking, count, exclude_pk=alloc.pk)
    used = alloc.trips.filter(is_deleted=False).order_by('-vendor_line_no').values_list('vendor_line_no', flat=True).first() or 0
    if count < used:
        raise ValidationError(f'Không giảm xuống {count} cont vì dòng #{used} đã có chuyến xe.')
    alloc.allocated_containers = count
    alloc.draft_rows = {k: v for k, v in (alloc.draft_rows or {}).items() if int(k) <= count}
    alloc.save(update_fields=['allocated_containers', 'draft_rows', 'updated_at'])
    refresh_status(alloc)
    return alloc


def regenerate_link(alloc, expires_days=DEFAULT_LINK_DAYS):
    """Cấp link mới, link cũ mất hiệu lực ngay."""
    if alloc.status == AllocationStatus.REVOKED:
        raise ValidationError('Phiếu đã thu hồi.')
    raw, hashed = _new_token()
    alloc.token_hash = hashed
    alloc.expires_at = timezone.now() + timedelta(days=expires_days) if expires_days else None
    alloc.save(update_fields=['token_hash', 'expires_at', 'updated_at'])
    return raw


def revoke_allocation(alloc):
    if alloc.trips.filter(is_deleted=False).exists():
        raise ValidationError('Phiếu đã sinh chuyến xe, không thể thu hồi. Hãy khóa phiếu thay vì thu hồi.')
    alloc.status = AllocationStatus.REVOKED
    alloc.token_hash = hash_token(secrets.token_urlsafe(32))  # vô hiệu hóa link cũ
    alloc.save(update_fields=['status', 'token_hash', 'updated_at'])


def set_locked(alloc, locked):
    alloc.locked_at = timezone.now() if locked else None
    alloc.save(update_fields=['locked_at', 'updated_at'])
    refresh_status(alloc)


def refresh_status(alloc):
    if alloc.status == AllocationStatus.REVOKED:
        return alloc.status
    filled = alloc.trips.filter(is_deleted=False).count()
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
def _trip_row(trip):
    return {
        'container_number': trip.container_number or '', 'seal_number': '' if trip.seal_number in ('', '-') else trip.seal_number,
        'tractor_plate': trip.vehicle.license_plate if trip.vehicle_id else '',
        'trailer_plate': (trip.trailer.license_plate if trip.trailer_id else trip.trailer_plate_text) or '',
        'driver_name': trip.subcontractor_driver_name or '', 'driver_phone': trip.subcontractor_driver_phone or '',
        'vendor_note': trip.vendor_note or '',
    }


def row_editable(trip):
    from apps.dispatch.gss_workflow import VENDOR_EDITABLE_STEPS  # nhà xe chỉ sửa tới khi tài xế lên xe nhận cont
    return trip is None or trip.step_status in VENDOR_EDITABLE_STEPS


def rows_for(alloc, for_vendor=True):
    """Đúng N dòng: dòng đã có chuyến lấy từ chuyến, dòng khác lấy từ bản nháp hoặc để trống."""
    trips = {t.vendor_line_no: t for t in alloc.trips.filter(is_deleted=False).select_related('vehicle', 'trailer')}
    drafts = alloc.draft_rows or {}
    out = []
    for n in range(1, alloc.allocated_containers + 1):
        trip = trips.get(n)
        data = _trip_row(trip) if trip else {**{k: '' for k in FIELDS}, **drafts.get(str(n), {})}
        out.append({
            'line_no': n, **data,
            'trip_code': trip.trip_code if trip else None,
            'step_label': trip.get_step_status_display() if trip else '',
            'editable': row_editable(trip) if for_vendor else True,
        })
    return out


def _find_or_create_vehicle(plate, subcontractor):
    from apps.fleet.models import Vehicle, VehicleOwnership, VehicleType
    veh = Vehicle.all_objects.filter(license_plate__iexact=plate).first() if hasattr(Vehicle, 'all_objects') else \
        Vehicle.objects.filter(license_plate__iexact=plate).first()
    if veh:
        if veh.is_deleted:
            raise ValidationError(f'Biển số {plate} đã bị ngừng sử dụng trong danh mục, hãy liên hệ điều vận.')
        if veh.ownership_type != VehicleOwnership.SUBCONTRACTOR or (veh.subcontractor_id and veh.subcontractor_id != subcontractor.id):
            raise ValidationError(f'Biển số {plate} đã thuộc xe khác trong hệ thống, hãy liên hệ điều vận.')
        if not veh.subcontractor_id:
            veh.subcontractor = subcontractor
            veh.save(update_fields=['subcontractor', 'updated_at'])
        return veh
    return Vehicle.objects.create(license_plate=plate, vehicle_type=VehicleType.TRACTOR,
                                  ownership_type=VehicleOwnership.SUBCONTRACTOR, subcontractor=subcontractor)


def _find_trailer(plate):
    from apps.fleet.models import Trailer
    return Trailer.objects.filter(license_plate__iexact=plate).first() if plate else None


def _container_in_use(number, exclude_trip_id=None):
    qs = DispatchTrip.objects.filter(container_number__iexact=number, is_deleted=False) \
        .exclude(status__in=[TripStatus.COMPLETED, TripStatus.CANCELLED])
    if exclude_trip_id:
        qs = qs.exclude(pk=exclude_trip_id)
    return qs.first()


_SHIPMENT = {'EXPORT_FCL': ShipmentType.EXPORT, 'IMPORT_FCL': ShipmentType.IMPORT, 'DOMESTIC': ShipmentType.DOMESTIC}


def _create_trip(alloc, line_no, row):
    from core.sequences import next_code
    b = alloc.booking
    veh = _find_or_create_vehicle(row['tractor_plate'], alloc.subcontractor)
    trailer = _find_trailer(row['trailer_plate'])
    code = next_code(DispatchTrip, 'trip_code', f"DV.{timezone.localdate():%y%m}.", 3)
    trip = DispatchTrip.objects.create(
        trip_code=code, shipment_type=_SHIPMENT.get(b.booking_type, ShipmentType.IMPORT), customer=b.customer,
        booking_order=b, vehicle=veh, trailer=trailer, trailer_plate_text='' if trailer else row['trailer_plate'],
        subcontractor=alloc.subcontractor, subcontractor_driver_name=row['driver_name'],
        subcontractor_driver_phone=row['driver_phone'], vendor_allocation=alloc, vendor_line_no=line_no,
        vendor_note=row['vendor_note'], container_number=row['container_number'],
        container_type=b.container_size or '40HC', seal_number=row['seal_number'] or '-',
        booking_or_bill=b.booking_number or '-', cutoff_time=b.closing_time or '-',
        pickup_location=(b.pickup_location or '').upper(), warehouse_location=(b.delivery_location or '').upper(),
        dropoff_location=(b.dropoff_location or '').upper(), pickup_loc=b.pickup_loc, warehouse_loc=b.delivery_loc,
        dropoff_loc=b.dropoff_loc, loading_date=b.loading_date, loading_time=b.loading_time or '08:00',
        det_free_days=b.free_time_detention or 0, dem_free_days=b.free_time_demurrage or 0,
        det_expiry_date=b.det_expiry, dem_expiry_date=b.dem_expiry,
        special_notes=b.notes or '', status=TripStatus.DRAFT,
    )
    return trip


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
    trips = {t.vendor_line_no: t for t in alloc.trips.select_for_update(of=('self',)).filter(is_deleted=False).select_related('vehicle', 'trailer')}
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
                saved += 1
            elif _is_blank(row):
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
    return {'results': results, 'saved': saved}


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


def allocation_summary(alloc):
    filled = alloc.trips.filter(is_deleted=False).count()
    return {
        'id': alloc.id, 'subcontractor_id': alloc.subcontractor_id,
        'subcontractor': alloc.subcontractor.short_name or alloc.subcontractor.name,
        'allocated_containers': alloc.allocated_containers, 'filled': filled,
        'draft': len(alloc.draft_rows or {}), 'status': alloc.status, 'status_label': alloc.get_status_display(),
        'expires_at': alloc.expires_at.isoformat() if alloc.expires_at else None, 'expired': is_expired(alloc),
        'locked': bool(alloc.locked_at),
        'last_opened_at': alloc.last_opened_at.isoformat() if alloc.last_opened_at else None,
        'last_submitted_at': alloc.last_submitted_at.isoformat() if alloc.last_submitted_at else None,
    }


def effective_notes(booking):
    """Ghi chú điểm đến / cấm đường: ưu tiên của booking, thiếu thì lấy từ danh mục địa điểm giao."""
    loc = booking.delivery_loc
    return {
        'destination_notes': booking.destination_notes or (loc.destination_notes if loc else '') or '',
        'road_restrictions': booking.road_restrictions or (loc.road_restrictions if loc else '') or '',
    }
