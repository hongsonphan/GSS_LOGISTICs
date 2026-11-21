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
VENDOR_COLS = [
    'STT', 'Số Container', 'Loại Cont', 'Nơi Giao Hàng', 'Số Chì (Seal)',
    'Biển Số Đầu Kéo', 'Biển Số Rơ-moóc', 'Họ Tên Tài Xế', 'SĐT Tài Xế', 'Ghi Chú',
]
ALLOC_COLS = [
    'STT', 'Số Container', 'Loại Cont', 'Số Chì (Seal)',
    'Nơi Giao Hàng', 'Nhà Xe Hiện Tại', 'Mã Nhà Xe (Điền)', 'Trạng Thái Chuyến',
]
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
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    teal_fill = PatternFill(start_color='0F766E', end_color='0F766E', fill_type='solid')
    header_font = Font(name='Calibri', size=12, bold=True, color='FFFFFF')
    data_font = Font(name='Calibri', size=12, bold=False, color='0F172A')
    thin_side = Side(border_style='thin', color='CBD5E1')
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    ws.row_dimensions[1].height = 28
    for c in ws[1]:
        c.font = header_font
        c.fill = teal_fill
        c.border = thin_border
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

    center_headers = {'STT', 'Loại Cont', 'Số Chì (Seal)', 'SĐT Tài Xế'}
    text_headers = {'Số Container', 'Loại Cont', 'Nơi Giao Hàng', 'Số Chì (Seal)', 'Biển Số Đầu Kéo', 'Biển Số Rơ-moóc', 'Họ Tên Tài Xế', 'SĐT Tài Xế', 'Ghi Chú'}
    for r_idx in range(2, ws.max_row + 1):
        ws.row_dimensions[r_idx].height = 22
        for col_idx, cell in enumerate(ws[r_idx], start=1):
            hdr = str(ws.cell(row=1, column=col_idx).value or '').strip()
            cell.font = data_font
            cell.border = thin_border
            cell.alignment = Alignment(
                horizontal='center' if hdr in center_headers else 'left',
                vertical='center',
            )
            if hdr in text_headers:
                cell.number_format = '@'

    ws.freeze_panes = 'A2'
    for col in ws.columns:
        max_len = max((len(str(c.value or '')) for c in col), default=10)
        hdr = str(col[0].value or '').strip()
        min_w = 8 if hdr == 'STT' else 15
        ws.column_dimensions[col[0].column_letter].width = min(40, max(min_w, max_len + 5))


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
        if r.get('moved'):
            continue
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
        def _cell(k):
            v = vals[k]
            if v is None:
                return ''
            if isinstance(v, float) and v.is_integer():
                v = int(v)
            return str(v).strip()

        d_phone = _cell(8)
        if len(d_phone) == 9 and d_phone.isdigit() and d_phone[0] in '35789':
            d_phone = '0' + d_phone
        rows.append({'line_no': line, 'container_number': _cell(1), 'seal_number': _cell(4), 'tractor_plate': _cell(5),
                     'trailer_plate': _cell(6), 'driver_name': _cell(7), 'driver_phone': d_phone, 'vendor_note': _cell(9)})
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


def warehouse_dispatch_excel(booking):
    """
    Kết xuất Bảng phân bổ container gửi cho Kho theo dõi (Mẫu GSS chuẩn).
    Cột bảng: Số Cont | Số xe | Tên tài xế | Cccd | Số điện thoại | Ghi chú nếu có
    """
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
    from core.validators import excel_safe
    from apps.gss import containers as cs

    wb = Workbook()
    ws = wb.active
    ws.title = 'PhanBo_GuiKho'

    # 1. Tiêu đề chính
    ws.merge_cells('A1:G1')
    ws['A1'] = 'BẢNG PHÂN BỔ PHƯƠNG TIỆN & TÀI XẾ GIAO NHẬN CONTAINER (GỬI KHO)'
    ws['A1'].font = Font(name='Calibri', size=14, bold=True, color='0F766E')
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[1].height = 30

    # 2. Thông tin chung về lô hàng / Kho
    cust_name = booking.customer.name if booking.customer else ''
    delivery_place = booking.delivery_location or (booking.delivery_loc.name if booking.delivery_loc else '')
    bl_no = booking.hbl_number or booking.mbl_number or booking.booking_number or booking.booking_code
    delivery_date = booking.loading_date.strftime('%d/%m/%Y') if booking.loading_date else (booking.discharge_date.strftime('%d/%m/%Y') if booking.discharge_date else '')

    ws['A3'] = 'Khách Hàng:'
    ws['B3'] = cust_name
    ws['E3'] = 'Số Vận Đơn / B/L:'
    ws['F3'] = bl_no

    ws['A4'] = 'Kho Nhận Hàng:'
    ws['B4'] = delivery_place
    ws['E4'] = 'Ngày Giao Dự Kiến:'
    ws['F4'] = delivery_date

    meta_font_bold = Font(name='Calibri', size=11, bold=True, color='334155')
    meta_font_val = Font(name='Calibri', size=11, bold=False, color='0F172A')
    for r in (3, 4):
        ws.row_dimensions[r].height = 20
        ws[f'A{r}'].font = meta_font_bold
        ws[f'B{r}'].font = meta_font_val
        ws[f'E{r}'].font = meta_font_bold
        ws[f'F{r}'].font = meta_font_val

    # 3. Tiêu đề bảng cột (Header row) tại dòng 6
    headers = ['STT', 'Số Cont', 'Số Xe', 'Tên Tài Xế', 'CCCD', 'Số Điện Thoại', 'Ghi Chú Nếu Có']
    header_row = 6
    ws.row_dimensions[header_row].height = 26
    teal_fill = PatternFill(start_color='0F766E', end_color='0F766E', fill_type='solid')
    header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    thin_side = Side(border_style='thin', color='CBD5E1')
    thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = teal_fill
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center', vertical='center')

    # 4. Đổ dữ liệu các container đã phân bổ
    rows_data = cs.list_for(booking)
    data_font = Font(name='Calibri', size=11, bold=False, color='0F172A')

    current_row = 7
    for idx, r in enumerate(rows_data, start=1):
        stt = idx
        cont_no = r.get('container_number') or ''
        plate = r.get('tractor_plate') or ''
        driver_name = r.get('driver_name') or ''
        cccd = r.get('driver_cccd') or ''
        phone = r.get('driver_phone') or ''

        # Ghi chú: seal + loại cont + ghi chú riêng
        notes_parts = []
        if r.get('seal_number'):
            notes_parts.append(f"Seal: {r['seal_number']}")
        if r.get('container_type'):
            notes_parts.append(f"Loại: {r['container_type']}")
        if r.get('notes'):
            notes_parts.append(r['notes'])
        notes_str = ' | '.join(notes_parts)

        row_values = [stt, cont_no, plate, driver_name, cccd, phone, notes_str]
        ws.row_dimensions[current_row].height = 22

        for col_idx, val in enumerate(row_values, start=1):
            cell = ws.cell(row=current_row, column=col_idx, value=excel_safe(val))
            cell.font = data_font
            cell.border = thin_border
            if col_idx in (1, 2, 3, 5, 6):
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.number_format = '@'
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center')
        current_row += 1

    col_widths = {1: 8, 2: 18, 3: 16, 4: 24, 5: 18, 6: 18, 7: 35}
    for col_idx, width in col_widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    safe_code = booking.booking_code.replace('/', '_').replace('\\', '_')
    filename = f"Bang_Phan_Bo_Kho_{safe_code}.xlsx"
    return _response(wb, filename)

