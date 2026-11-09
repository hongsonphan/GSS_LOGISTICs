"""Danh sách container của B/L: nhập bằng dán/Excel (báo lỗi từng dòng), tự tính hạn DEM/DET, phân bổ từng cont cho nhà xe.

Quy ước phân bổ theo cont (khi B/L có danh sách cont):
- Mỗi cont gắn với phiếu nhà xe (`BookingVendorAllocation`) và một số dòng `alloc_line_no` cố định trong phiếu đó;
  số dòng không đánh lại khi đổi nhà xe, dòng bị chuyển đi hiển thị là "đã chuyển" và nhà xe không nhập được.
- Đổi nhà xe chỉ khi cont chưa có chuyến, hoặc chuyến còn ở bước "Sẵn sàng" (chuyến cũ bị huỷ kèm lý do). Mọi lần đổi ghi AuditLog.
- Booking có danh sách cont thì tổng cont = số dòng danh sách; không chia theo số lượng nữa.
"""
import datetime
import re
from collections import OrderedDict

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.dispatch.vendor_service import iso6346_valid
from apps.gss.models import BookingContainer, FreeTimeRule

_CONT_TOKEN = re.compile(r'^[A-Z]{4}\d{7}$')
_TYPE_RE = re.compile(r'^(20|22|40|42|45|L5|25|2[0-9A-Z]|4[0-9A-Z])[A-Z0-9]{1,3}$')
MAX_ROWS = 1000


def normalize_container(raw):
    return re.sub(r'[\s\-./]', '', str(raw or '')).upper()


def normalize_plate(raw):
    """51C-123.45 → 51C12345 (khoá so khớp biển số)."""
    return re.sub(r'[\s.\-]', '', str(raw or '')).upper()


# ------------------------------------------------------------------ đọc dữ liệu nhập
def parse_text(text):
    """Dán từ Excel/email: mỗi dòng 'SỐCONT [LOẠI] [SEAL] [TRỌNG LƯỢNG]', phân tách bằng tab, dấu phẩy, chấm phẩy hoặc khoảng trắng."""
    rows = []
    for i, line in enumerate(str(text or '').splitlines(), start=1):
        if not line.strip():
            continue
        parts = [p.strip() for p in re.split(r'[\t,;|]+', line) if p.strip()]
        if len(parts) == 1:
            parts = line.split()
        # Cho phép "MSCU 123456 7" (số cont có khoảng trắng): ghép các mảnh đầu nếu cần
        head = parts[0]
        j = 1
        while j < len(parts) and len(normalize_container(head)) < 11 and re.match(r'^[A-Za-z0-9]+$', parts[j]):
            head += parts[j]
            j += 1
        rest = parts[j:]
        row = {'source_line': i, 'raw': head, 'container_type': '', 'seal_number': '', 'gross_weight_kg': None}
        for p in rest:
            up = p.upper()
            numeric = bool(re.fullmatch(r'\d+([.,]\d+)?', p))
            if not row['container_type'] and _TYPE_RE.match(up) and len(up) <= 5:
                row['container_type'] = up
            elif numeric and row['seal_number'] and row['gross_weight_kg'] is None:
                row['gross_weight_kg'] = p.replace(',', '.')
            elif not row['seal_number']:
                row['seal_number'] = up[:50]
        rows.append(row)
    return rows


def parse_xlsx(fileobj):
    """Excel: cột A số cont, B loại, C seal, D trọng lượng (kg); dòng tiêu đề tự bỏ qua."""
    from openpyxl import load_workbook
    try:
        wb = load_workbook(fileobj, read_only=True, data_only=True)
    except Exception:
        raise ValidationError('Không đọc được file Excel (.xlsx).')
    ws = wb.worksheets[0]
    rows = []
    for i, vals in enumerate(ws.iter_rows(values_only=True), start=1):
        vals = list(vals or []) + [None] * 4
        first = str(vals[0] or '').strip()
        if not first or (i == 1 and not re.search(r'\d{4,}', first)):
            continue
        rows.append({'source_line': i, 'raw': first, 'container_type': str(vals[1] or '').strip().upper()[:10],
                     'seal_number': str(vals[2] or '').strip().upper()[:50],
                     'gross_weight_kg': str(vals[3]).replace(',', '.') if vals[3] not in (None, '') else None})
        if len(rows) > MAX_ROWS:
            break
    return rows


def validate_rows(booking, rows):
    """Trả danh sách kết quả từng dòng: {source_line, container_number, ok, errors, warnings, action}."""
    existing = {c.container_number: c for c in BookingContainer.objects.filter(booking=booking, is_deleted=False)}
    seen, out = {}, []
    if len(rows) > MAX_ROWS:
        raise ValidationError(f'Tối đa {MAX_ROWS} cont mỗi lần nhập.')
    for r in rows:
        cn = normalize_container(r.get('raw'))
        res = {'source_line': r.get('source_line'), 'raw': r.get('raw', ''), 'container_number': cn,
               'container_type': (r.get('container_type') or '').upper()[:10], 'seal_number': (r.get('seal_number') or '')[:50],
               'gross_weight_kg': None, 'errors': [], 'warnings': [], 'action': 'CREATE'}
        if not _CONT_TOKEN.match(cn):
            res['errors'].append('Số cont phải gồm 4 chữ cái + 7 chữ số.')
        elif not iso6346_valid(cn):
            res['errors'].append('Sai số kiểm tra ISO 6346 (chữ số cuối).')
        if cn in seen:
            res['errors'].append(f'Trùng với dòng {seen[cn]} trong dữ liệu nhập.')
        seen.setdefault(cn, r.get('source_line'))
        w = r.get('gross_weight_kg')
        if w not in (None, ''):
            try:
                res['gross_weight_kg'] = str(round(float(w), 2))
                if float(w) < 0 or float(w) > 100000:
                    raise ValueError
            except (TypeError, ValueError):
                res['errors'].append('Trọng lượng không hợp lệ (kg).')
        if cn in existing:
            res['action'] = 'UPDATE'
        res['ok'] = not res['errors']
        out.append(res)
    return out


@transaction.atomic
def import_containers(booking, rows, *, user=None, commit=True, skip_invalid=False):
    """Hai pha: commit=False chỉ kiểm tra. Có lỗi thì không ghi gì (trừ khi skip_invalid=True – chỉ ghi dòng hợp lệ)."""
    results = validate_rows(booking, rows)
    bad = [r for r in results if not r['ok']]
    summary = {'total': len(results), 'valid': len(results) - len(bad), 'errors': len(bad),
               'create': sum(1 for r in results if r['ok'] and r['action'] == 'CREATE'),
               'update': sum(1 for r in results if r['ok'] and r['action'] == 'UPDATE'), 'results': results, 'committed': False}
    if not commit or (bad and not skip_invalid):
        return summary
    type(booking).objects.select_for_update().get(pk=booking.pk)
    existing = {c.container_number: c for c in BookingContainer.objects.filter(booking=booking, is_deleted=False)}
    next_no = (BookingContainer.objects.filter(booking=booking).aggregate(m=Max('line_no'))['m'] or 0)
    for r in results:
        if not r['ok']:
            continue
        c = existing.get(r['container_number'])
        if c is None:
            next_no += 1
            c = BookingContainer(booking=booking, line_no=next_no, container_number=r['container_number'], company=booking.company)
        c.raw_input = str(r['raw'])[:60]
        c.iso_valid = True
        if r['container_type']:
            c.container_type = r['container_type']
        elif not c.container_type:
            c.container_type = booking.container_size or ''
        if r['seal_number']:
            c.seal_number = r['seal_number']
        if r['gross_weight_kg'] is not None:
            c.gross_weight_kg = r['gross_weight_kg']
        c.save()
    sync_booking_total(booking)
    _audit(booking, 'update', user, {'containers_import': {'create': summary['create'], 'update': summary['update']}})
    summary['committed'] = True
    return summary


def sync_booking_total(booking):
    n = BookingContainer.objects.filter(booking=booking, is_deleted=False).count()
    if n and booking.total_containers != n:
        booking.total_containers = n
        booking.save(update_fields=['total_containers', 'updated_at'])
    return n


def has_container_list(booking):
    return BookingContainer.objects.filter(booking=booking, is_deleted=False).exists()


def remove_container(container, *, user=None, reason=''):
    if container.trip_id and container.trip.step_status != 'CANCELLED':
        raise ValidationError('Cont đã có chuyến xe, hãy huỷ chuyến trước khi xoá khỏi danh sách.')
    container.allocation, container.alloc_line_no = None, None
    container.save(update_fields=['allocation', 'alloc_line_no', 'updated_at'])
    container.delete()
    sync_booking_total(container.booking)
    _audit(container.booking, 'update', user, {'container_removed': container.container_number, 'reason': reason})


# ------------------------------------------------------------------ DEM/DET theo quy tắc
def match_rule(booking, kind, container_type=''):
    """Quy tắc khớp cụ thể nhất (khách > hãng tàu > loại cont)."""
    best, best_score = None, -1
    line = (booking.shipping_line or '').strip().upper()
    for r in FreeTimeRule.objects.filter(is_deleted=False, is_active=True, kind=kind):
        if r.shipping_line and r.shipping_line.strip().upper() != line:
            continue
        if r.customer_id and r.customer_id != booking.customer_id:
            continue
        if r.container_type and r.container_type.upper() != (container_type or booking.container_size or '').upper():
            continue
        score = (4 if r.customer_id else 0) + (2 if r.shipping_line else 0) + (1 if r.container_type else 0)
        if score > best_score:
            best, best_score = r, score
    return best


def _start_date(booking, event):
    return {'DISCHARGE': booking.discharge_date or booking.eta, 'ETA': booking.eta, 'PICKUP': None, 'MANUAL': None}.get(event)


def apply_free_time(booking, *, overwrite_days=True):
    """Áp quy tắc free time cho booking: số ngày miễn phí và (nếu chưa nhập) ngày bắt đầu tính. Trả {kind: tên quy tắc}."""
    applied, fields = {}, []
    for kind, days_field, start_field in (('DEM', 'free_time_demurrage', 'dem_start_date'), ('DET', 'free_time_detention', 'det_start_date')):
        rule = match_rule(booking, kind)
        if not rule:
            continue
        if overwrite_days and getattr(booking, days_field) != rule.free_days:
            setattr(booking, days_field, rule.free_days)
            fields.append(days_field)
        start = _start_date(booking, rule.start_event)
        if start and not getattr(booking, start_field):
            setattr(booking, start_field, start)
            fields.append(start_field)
        applied[kind] = rule.name
    if fields:
        booking.save(update_fields=fields + ['updated_at'])
        propagate_expiry(booking)
    return applied


def propagate_expiry(booking):
    """Cập nhật hạn DEM/DET cho các chuyến chưa xong của booking (theo cont nếu có hạn riêng)."""
    from apps.dispatch.models import DispatchTrip
    by_trip = {c.trip_id: c for c in BookingContainer.objects.filter(booking=booking, is_deleted=False, trip__isnull=False)}
    for t in DispatchTrip.objects.filter(booking_order=booking, is_deleted=False).exclude(step_status__in=['EMPTY_RETURNED', 'CANCELLED']):
        c = by_trip.get(t.id)
        dem = c.dem_expiry if c else booking.dem_expiry
        det = c.det_expiry if c else booking.det_expiry
        if (t.dem_expiry_date, t.det_expiry_date) != (dem, det):
            DispatchTrip.objects.filter(pk=t.pk).update(dem_expiry_date=dem, det_expiry_date=det,
                                                        dem_free_days=booking.free_time_demurrage or 0, det_free_days=booking.free_time_detention or 0)


# ------------------------------------------------------------------ phân bổ theo cont
def _audit(booking, action, user, changes):
    from core.models import AuditLog
    ok = user is not None and getattr(user, 'is_authenticated', False)
    AuditLog.objects.create(actor=user if ok else None, actor_label=user.get_username() if ok else 'hệ thống', action=action,
                            model_label='customers.bookingorder', object_id=str(booking.pk), object_repr=booking.booking_code,
                            changes=changes, company=booking.company)


def _container_locked_reason(c):
    if c.trip_id and c.trip.step_status not in ('READY', 'CANCELLED'):
        return f'cont {c.container_number} đã chạy ({c.trip.get_step_status_display()})'
    return ''


@transaction.atomic
def assign(booking, container_ids, subcontractor, *, user=None, reason='', expires_days=None):
    """Giao các cont cho nhà xe (None = bỏ phân bổ). Trả {'allocation', 'raw_token' (nếu phiếu mới), 'changed', 'errors'}."""
    from apps.dispatch import vendor_service as vs
    from apps.dispatch.models import AllocationStatus, BookingVendorAllocation
    from apps.dispatch import gss_workflow as wf
    type(booking).objects.select_for_update().get(pk=booking.pk)
    qs = BookingContainer.objects.select_for_update(of=('self',)).select_related('trip', 'allocation', 'allocation__subcontractor') \
        .filter(booking=booking, is_deleted=False, pk__in=list(container_ids or []))
    conts = list(qs)
    if not conts:
        raise ValidationError('Chưa chọn cont nào.')
    if subcontractor is not None and not subcontractor.is_active:
        raise ValidationError('Nhà xe đã ngừng hoạt động.')
    errors, changed = [], []
    alloc, raw = None, None
    if subcontractor is not None:
        alloc = BookingVendorAllocation.objects.filter(booking=booking, subcontractor=subcontractor, is_deleted=False) \
            .exclude(status=AllocationStatus.REVOKED).order_by('id').first()
        if alloc is None:
            raw, hashed = vs._new_token()
            days = vs.DEFAULT_LINK_DAYS if expires_days is None else expires_days
            alloc = BookingVendorAllocation.objects.create(
                booking=booking, subcontractor=subcontractor, allocated_containers=0, token_hash=hashed,
                expires_at=timezone.now() + datetime.timedelta(days=days) if days else None, company=booking.company)
            vs.audit_allocation(alloc, 'GRANT', user, {'source': 'assign_containers'})
    for c in conts:
        if alloc is not None and c.allocation_id == alloc.id:
            continue
        why = _container_locked_reason(c)
        if why:
            errors.append(f'Không đổi được nhà xe: {why}.')
            continue
        old_vendor = c.allocation.subcontractor if c.allocation_id else None
        if c.trip_id and c.trip.step_status == 'READY':
            if user is None or not getattr(user, 'is_authenticated', False):
                errors.append(f'Cont {c.container_number} đã có chuyến, cần nhân viên điều vận đổi.')
                continue
            wf.cancel(c.trip, user=user, reason=(reason or 'Đổi nhà xe cho cont')[:255] if len(reason or '') >= 5 else 'Đổi nhà xe cho cont')
            c.trip = None
        old_alloc = c.allocation
        if old_alloc is not None:
            drafts = dict(old_alloc.draft_rows or {})
            drafts.pop(str(c.alloc_line_no), None)
            old_alloc.draft_rows = drafts
            old_alloc.save(update_fields=['draft_rows', 'updated_at'])
        if alloc is not None:
            nxt = (BookingContainer.objects.filter(allocation=alloc).aggregate(m=Max('alloc_line_no'))['m'] or 0)
            nxt = max(nxt, alloc.trips.aggregate(m=Max('vendor_line_no'))['m'] or 0) + 1
            c.allocation, c.alloc_line_no = alloc, nxt
        else:
            c.allocation, c.alloc_line_no = None, None
        c.save(update_fields=['allocation', 'alloc_line_no', 'trip', 'updated_at'])
        changed.append({'container': c.container_number, 'from': (old_vendor.short_name or old_vendor.name) if old_vendor else '',
                        'to': (subcontractor.short_name or subcontractor.name) if subcontractor else ''})
        if old_alloc is not None:
            _resize_to_lines(old_alloc)
    if alloc is not None:
        _resize_to_lines(alloc)
    if changed:
        _audit(booking, 'update', user, {'vendor_assignment': changed, 'reason': reason})
    vs.sync_booking_progress(booking)
    return {'allocation': alloc, 'raw_token': raw, 'changed': changed, 'errors': errors}


def _resize_to_lines(alloc):
    """Phiếu theo cont: số dòng = số dòng lớn nhất đang dùng (cont đang giao hoặc chuyến đã sinh)."""
    from apps.dispatch import vendor_service as vs
    m = max(BookingContainer.objects.filter(allocation=alloc, is_deleted=False).aggregate(m=Max('alloc_line_no'))['m'] or 0,
            alloc.trips.filter(is_deleted=False).exclude(step_status='CANCELLED').aggregate(m=Max('vendor_line_no'))['m'] or 0)
    if alloc.allocated_containers != m:
        alloc.allocated_containers = m
        alloc.save(update_fields=['allocated_containers', 'updated_at'])
    vs.refresh_status(alloc)


def container_for_line(alloc, line_no):
    return BookingContainer.objects.filter(allocation=alloc, alloc_line_no=line_no, is_deleted=False).first()


def link_trip(alloc, line_no, trip):
    c = container_for_line(alloc, line_no)
    if c and c.trip_id != trip.id:
        c.trip = trip
        c.save(update_fields=['trip', 'updated_at'])
        _apply_container_to_trip(c, trip)
    return c


def _apply_container_to_trip(c, trip):
    """Thông tin riêng của cont (loại, nơi giao riêng, hạn DEM/DET riêng) ghi vào chuyến."""
    from apps.dispatch.models import DispatchTrip
    upd = {'dem_expiry_date': c.dem_expiry, 'det_expiry_date': c.det_expiry}
    if c.container_type:
        upd['container_type'] = c.container_type
    if c.delivery_loc_id:
        upd['warehouse_loc_id'] = c.delivery_loc_id
        upd['warehouse_location'] = (c.delivery_loc.name or '').upper()
    elif c.delivery_address:
        upd['warehouse_location'] = c.delivery_address.upper()[:150]
    DispatchTrip.objects.filter(pk=trip.pk).update(**upd)


def serialize(c):
    t = c.trip
    alloc = c.allocation
    return {
        'id': c.id, 'line_no': c.line_no, 'container_number': c.container_number, 'iso_valid': c.iso_valid,
        'container_type': c.container_type, 'seal_number': c.seal_number,
        'gross_weight_kg': str(c.gross_weight_kg) if c.gross_weight_kg is not None else '',
        'delivery_loc_id': c.delivery_loc_id, 'delivery_loc': c.delivery_loc.name if c.delivery_loc_id else '',
        'delivery_address': c.delivery_address,
        'dem_expiry': c.dem_expiry.isoformat() if c.dem_expiry else None, 'det_expiry': c.det_expiry.isoformat() if c.det_expiry else None,
        'dem_expiry_override': c.dem_expiry_override.isoformat() if c.dem_expiry_override else None,
        'det_expiry_override': c.det_expiry_override.isoformat() if c.det_expiry_override else None,
        'allocation_id': alloc.id if alloc else None, 'alloc_line_no': c.alloc_line_no,
        'vendor_id': alloc.subcontractor_id if alloc else None,
        'vendor': (alloc.subcontractor.short_name or alloc.subcontractor.name) if alloc else '',
        'vendor_code': alloc.subcontractor.code if alloc else '',
        'trip_code': t.trip_code if t else None, 'step_status': t.step_status if t else '',
        'step_label': t.get_step_status_display() if t else '',
        'tractor_plate': t.vehicle.license_plate if t and t.vehicle_id else '',
        'driver_name': t.subcontractor_driver_name if t else '', 'driver_phone': t.subcontractor_driver_phone if t else '',
        'locked': bool(_container_locked_reason(c)), 'notes': c.notes,
    }


def list_for(booking):
    qs = BookingContainer.objects.filter(booking=booking, is_deleted=False) \
        .select_related('delivery_loc', 'allocation', 'allocation__subcontractor', 'trip', 'trip__vehicle', 'booking')
    return [serialize(c) for c in qs]


def progress(booking):
    """Tiến độ B/L: tổng cont, đã phân bổ, đã có xe, đang chạy, đã giao, đã hạ rỗng/street-turn."""
    rows = list_for(booking)
    out = OrderedDict(total=len(rows), allocated=0, assigned_truck=0, running=0, delivered=0, done=0)
    for r in rows:
        out['allocated'] += 1 if r['vendor_id'] else 0
        out['assigned_truck'] += 1 if r['trip_code'] else 0
        s = r['step_status']
        out['running'] += 1 if s and s not in ('READY', 'EMPTY_RETURNED', 'CANCELLED') else 0
        out['delivered'] += 1 if s in ('UNLOADED', 'RETURNING_EMPTY', 'EMPTY_RETURNED') else 0
        out['done'] += 1 if s == 'EMPTY_RETURNED' else 0
    return dict(out)
