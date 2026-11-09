"""Excel cho nhà xe (qua link) và Excel phân bổ cont cho điều vận (nhập hai pha: kiểm tra → xem trước → xác nhận).

Mỗi file mẫu có sheet ẩn `_meta` chứa loại mẫu, mã phiếu/booking và dấu phiên bản: nhập nhầm file của lệnh khác bị từ chối.
Ô văn bản xuất ra luôn qua `excel_safe` (chống chèn công thức).
"""
import hashlib
import io

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.http import HttpResponse

XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
VENDOR_COLS = ['STT', 'Số cont', 'Loại', 'Nơi giao', 'Seal', 'Biển số đầu kéo', 'Biển số rơ-moóc', 'Tên tài xế', 'SĐT tài xế', 'Ghi chú']
ALLOC_COLS = ['STT', 'Số cont', 'Loại', 'Seal', 'Nơi giao', 'Nhà xe hiện tại', 'Mã nhà xe (điền)', 'Trạng thái chuyến']
PREVIEW_TTL = 30 * 60


def _response(wb, name):
    buf = io.BytesIO()
    wb.save(buf)
    resp = HttpResponse(buf.getvalue(), content_type=XLSX)
    resp['Content-Disposition'] = f'attachment; filename="{name}"'
    resp['Cache-Control'] = 'no-store'
    return resp


def _meta(wb, kind, ref, version):
    ws = wb.create_sheet('_meta')
    ws.append(['kind', kind])
    ws.append(['ref', str(ref)])
    ws.append(['version', version])
    ws.sheet_state = 'hidden'


def _read_meta(wb):
    if '_meta' not in wb.sheetnames:
        return {}
    return {str(r[0]): str(r[1]) for r in wb['_meta'].iter_rows(values_only=True) if r and r[0]}


def _style(ws):
    from openpyxl.styles import Font, PatternFill
    for c in ws[1]:
        c.font = Font(bold=True)
        c.fill = PatternFill('solid', fgColor='E2E8F0')
    ws.freeze_panes = 'A2'
    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = min(36, max(10, max(len(str(c.value or '')) for c in col) + 2))


def _load(fileobj):
    from openpyxl import load_workbook
    try:
        return load_workbook(fileobj, data_only=True)
    except Exception:
        raise ValidationError('Không đọc được file Excel (.xlsx).')


# ------------------------------------------------------------------ nhà xe
def template_response(alloc, rows):
    from openpyxl import Workbook
    from core.validators import excel_safe
    wb = Workbook()
    ws = wb.active
    ws.title = 'Xe - tài xế'
    ws.append(VENDOR_COLS)
    for r in rows:
        ws.append([r['line_no'], excel_safe(r['container_number']), excel_safe(r.get('container_type', '')), excel_safe(r.get('delivery', '')),
                   excel_safe(r['seal_number']), excel_safe(r['tractor_plate']), excel_safe(r['trailer_plate']), excel_safe(r['driver_name']),
                   excel_safe(r['driver_phone']), excel_safe(r['vendor_note'])])
    _style(ws)
    _meta(wb, 'vendor_rows', alloc.pk, str(alloc.allocated_containers))
    return _response(wb, f'nha-xe-{alloc.booking.booking_code}.xlsx')


def read_rows(alloc, fileobj):
    wb = _load(fileobj)
    meta = _read_meta(wb)
    if meta.get('kind') != 'vendor_rows' or meta.get('ref') != str(alloc.pk):
        raise ValidationError('File không phải mẫu của lệnh này. Hãy tải lại file mẫu từ trang của bạn.')
    ws = wb.worksheets[0]
    rows = []
    for i, vals in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        vals = list(vals or []) + [None] * len(VENDOR_COLS)
        if vals[0] in (None, ''):
            continue
        try:
            line = int(vals[0])
        except (TypeError, ValueError):
            raise ValidationError(f'Dòng {i}: cột STT phải là số.')
        cell = lambda k: '' if vals[k] is None else str(vals[k]).strip()
        rows.append({'line_no': line, 'container_number': cell(1), 'seal_number': cell(4), 'tractor_plate': cell(5),
                     'trailer_plate': cell(6), 'driver_name': cell(7), 'driver_phone': cell(8), 'vendor_note': cell(9)})
        if len(rows) > 300:
            raise ValidationError('File quá nhiều dòng.')
    if not rows:
        raise ValidationError('File chưa có dòng nào.')
    return rows


# ------------------------------------------------------------------ điều vận: phân bổ cont cho nhà xe
def _version(booking):
    from apps.gss.models import BookingContainer
    ids = BookingContainer.objects.filter(booking=booking, is_deleted=False).order_by('id').values_list('id', 'container_number')
    return hashlib.sha256(repr(list(ids)).encode()).hexdigest()[:16]


def allocation_template(booking):
    from openpyxl import Workbook
    from openpyxl.worksheet.datavalidation import DataValidation
    from apps.gss import containers as cs
    from apps.master_data.models import Subcontractor
    from core.validators import excel_safe
    wb = Workbook()
    ws = wb.active
    ws.title = 'Phân bổ'
    ws.append(ALLOC_COLS)
    for r in cs.list_for(booking):
        ws.append([r['line_no'], r['container_number'], excel_safe(r['container_type']), excel_safe(r['seal_number']),
                   excel_safe(r['delivery_loc'] or r['delivery_address']), excel_safe(r['vendor']), excel_safe(r['vendor_code']), r['step_label']])
    _style(ws)
    vendors = wb.create_sheet('Nhà xe')
    vendors.append(['Mã nhà xe', 'Tên'])
    codes = []
    for s in Subcontractor.objects.filter(is_deleted=False, is_active=True).order_by('code'):
        vendors.append([excel_safe(s.code), excel_safe(s.short_name or s.name)])
        codes.append(s.code)
    if codes and ws.max_row > 1:
        dv = DataValidation(type='list', formula1=f"='Nhà xe'!$A$2:$A${len(codes) + 1}", allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f'G2:G{ws.max_row}')
    _meta(wb, 'allocation', booking.pk, _version(booking))
    return _response(wb, f'phan-bo-{booking.booking_code}.xlsx')


def preview_allocation(booking, fileobj, user):
    """Pha 1: đọc file, kiểm tra từng dòng, trả bản xem trước + mã xác nhận (lưu cache 30 phút). Không ghi gì."""
    from apps.gss.models import BookingContainer
    from apps.master_data.models import Subcontractor
    wb = _load(fileobj)
    meta = _read_meta(wb)
    if meta.get('kind') != 'allocation' or meta.get('ref') != str(booking.pk):
        raise ValidationError('File không phải mẫu phân bổ của booking này. Hãy tải file mẫu mới.')
    stale = meta.get('version') != _version(booking)
    conts = {c.container_number: c for c in BookingContainer.objects.filter(booking=booking, is_deleted=False)
             .select_related('allocation__subcontractor', 'trip')}
    subs = {s.code.upper(): s for s in Subcontractor.objects.filter(is_deleted=False)}
    ws = wb.worksheets[0]
    rows, seen = [], set()
    for i, vals in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        vals = list(vals or []) + [None] * len(ALLOC_COLS)
        cn = str(vals[1] or '').strip().upper().replace(' ', '')
        code = str(vals[6] or '').strip().upper()
        if not cn and not code:
            continue
        r = {'row': i, 'container_number': cn, 'vendor_code': code, 'action': 'NOCHANGE', 'errors': [], 'from': '', 'to': ''}
        c = conts.get(cn)
        if not c:
            r['errors'].append('Số cont không có trong danh sách của booking.')
        elif cn in seen:
            r['errors'].append('Số cont lặp lại trong file.')
        seen.add(cn)
        sub = subs.get(code) if code else None
        if code and not sub:
            r['errors'].append(f'Không có nhà xe mã {code}.')
        elif sub is not None and not sub.is_active:
            r['errors'].append(f'Nhà xe {code} đã ngừng hoạt động.')
        if c and not r['errors']:
            cur = c.allocation.subcontractor if c.allocation_id else None
            r['from'] = cur.code if cur else ''
            r['to'] = sub.code if sub else ''
            if (cur.id if cur else None) != (sub.id if sub else None):
                if c.trip_id and c.trip.step_status not in ('READY', 'CANCELLED'):
                    r['errors'].append('Cont đã chạy, không đổi nhà xe được.')
                else:
                    r['action'] = 'ASSIGN' if not cur else ('UNASSIGN' if not sub else 'CHANGE')
        if r['errors']:
            r['action'] = 'ERROR'
        rows.append(r)
    errors = sum(1 for r in rows if r['action'] == 'ERROR')
    plan = [{'container_number': r['container_number'], 'vendor_code': r['to']} for r in rows if r['action'] in ('ASSIGN', 'CHANGE', 'UNASSIGN')]
    token = hashlib.sha256(f'{booking.pk}:{user.pk}:{plan}:{_version(booking)}'.encode()).hexdigest()[:24]
    if not errors and plan:
        cache.set(f'gss_alloc_preview:{token}', {'booking': booking.pk, 'user': user.pk, 'plan': plan, 'version': _version(booking)}, PREVIEW_TTL)
    return {'rows': rows, 'errors': errors, 'changes': len(plan), 'stale': stale,
            'token': token if (not errors and plan) else None,
            'summary': {k: sum(1 for r in rows if r['action'] == k) for k in ('ASSIGN', 'CHANGE', 'UNASSIGN', 'NOCHANGE', 'ERROR')}}


def commit_allocation(booking, token, user, reason=''):
    """Pha 2: áp đúng kế hoạch đã xem trước. Danh sách cont đổi sau khi xem trước thì phải xem trước lại."""
    from apps.gss import containers as cs
    from apps.gss.models import BookingContainer
    from apps.master_data.models import Subcontractor
    data = cache.get(f'gss_alloc_preview:{token}') if token else None
    if not data or data['booking'] != booking.pk or data['user'] != user.pk:
        raise ValidationError('Bản xem trước đã hết hạn hoặc không hợp lệ. Hãy tải file lên lại.')
    if data['version'] != _version(booking):
        raise ValidationError('Danh sách cont đã thay đổi sau khi xem trước. Hãy tải file lên lại.')
    groups = {}
    for p in data['plan']:
        groups.setdefault(p['vendor_code'], []).append(p['container_number'])
    applied, errors = 0, []
    for code, numbers in groups.items():
        sub = Subcontractor.objects.filter(code__iexact=code, is_deleted=False).first() if code else None
        ids = list(BookingContainer.objects.filter(booking=booking, is_deleted=False, container_number__in=numbers).values_list('id', flat=True))
        out = cs.assign(booking, ids, sub, user=user, reason=reason or 'Nhập Excel phân bổ')
        applied += len(out['changed'])
        errors += out['errors']
    cache.delete(f'gss_alloc_preview:{token}')
    return {'applied': applied, 'errors': errors}


def error_workbook(booking, preview):
    """File Excel trả lại: tô đỏ dòng lỗi, thêm cột Lỗi để người dùng sửa và nhập lại."""
    from openpyxl import Workbook
    from openpyxl.styles import PatternFill
    from core.validators import excel_safe
    wb = Workbook()
    ws = wb.active
    ws.title = 'Kết quả kiểm tra'
    ws.append(['Dòng', 'Số cont', 'Mã nhà xe', 'Thao tác', 'Lỗi'])
    red = PatternFill('solid', fgColor='FECDD3')
    for r in preview['rows']:
        ws.append([r['row'], excel_safe(r['container_number']), excel_safe(r['vendor_code']), r['action'], excel_safe('; '.join(r['errors']))])
        if r['errors']:
            for c in ws[ws.max_row]:
                c.fill = red
    _style(ws)
    return _response(wb, f'loi-phan-bo-{booking.booking_code}.xlsx')
