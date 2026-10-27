import io
import datetime
from decimal import Decimal
from django.db.models import Q
from django.utils import timezone

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from apps.customers.models import Customer
from apps.dispatch.models import DispatchTrip, TripStatus, ShipmentType
from apps.master_data.models import CompanyProfile


def vietnamese_number_to_words(n):
    """
    Chuyển đổi số tiền thành chữ tiếng Việt chuẩn kế toán.
    Ví dụ: 4100000 -> 'Bốn triệu một trăm nghìn đồng chẵn.'
    """
    if n is None:
        return 'Không đồng.'
    try:
        num = int(round(float(n)))
    except (ValueError, TypeError):
        return 'Không đồng.'

    if num == 0:
        return 'Không đồng.'

    is_negative = num < 0
    num = abs(num)

    digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
    scale_units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ']

    def read_three_digits(group, show_zero_hundred=False):
        h = group // 100
        t = (group % 100) // 10
        u = group % 10
        res = []

        if h > 0 or show_zero_hundred:
            res.append(digits[h] + ' trăm')
            if t == 0 and u > 0:
                res.append('lẻ')

        if t > 1:
            res.append(digits[t] + ' mươi')
            if u == 1:
                res.append('mốt')
            elif u == 5:
                res.append('lăm')
            elif u > 0:
                res.append(digits[u])
        elif t == 1:
            res.append('mười')
            if u == 5:
                res.append('lăm')
            elif u > 0:
                res.append(digits[u])
        elif t == 0 and u > 0 and not show_zero_hundred and h == 0:
            res.append(digits[u])

        return ' '.join(res)

    chunks = []
    temp = num
    while temp > 0:
        chunks.append(temp % 1000)
        temp //= 1000

    words = []
    for i in range(len(chunks) - 1, -1, -1):
        chunk = chunks[i]
        if chunk > 0:
            show_zero_h = (i < len(chunks) - 1)
            chunk_str = read_three_digits(chunk, show_zero_hundred=show_zero_h)
            if chunk_str:
                unit = scale_units[i]
                if unit:
                    words.append(f"{chunk_str} {unit}")
                else:
                    words.append(chunk_str)

    text = ' '.join(words).strip()
    # Viết hoa chữ cái đầu và thêm 'đồng chẵn.'
    if text:
        text = text[0].upper() + text[1:] + ' đồng chẵn.'
    else:
        text = 'Không đồng.'

    if is_negative:
        text = 'Âm ' + text[0].lower() + text[1:]
    return text


def get_system_company_info():
    """
    Lấy thông tin pháp nhân công ty Triển Võ để in trên header Bảng Kê.
    """
    co = CompanyProfile.objects.filter(is_deleted=False).first()
    return {
        'company_name': (co.company_name if co and co.company_name else 'CÔNG TY TNHH DỊCH VỤ GIAO NHẬN VẬN TẢI TRIỂN VÕ').upper(),
        'address': (co.address if co and co.address else 'Số 44B/1 Trần Quang Khải, Khu phố 9, Phường Tân Định, Thành phố Hồ Chí Minh, Việt Nam'),
        'tax_code': (co.tax_code if co and co.tax_code else '0315001374'),
        'phone': (co.phone if co and co.phone else '0965 559 561'),
        'email': (co.email if co and co.email else 'phongkinhdoanh.tvl@trienvo.com'),
        'representative_name': (co.representative_name if co and co.representative_name else 'Võ Văn Triền'),
        'representative_role': (co.representative_role if co and co.representative_role else 'Giám Đốc')
    }


def get_customer_monthly_statement_data(customer_id, month=None, year=None, from_date=None, to_date=None, status='ALL', vat_rate=10):
    """
    Trích xuất toàn bộ dữ liệu bảng kê vận chuyển tháng cho khách hàng.
    Trả về cấu trúc 26 cột đúng chuẩn file Excel thực tế của Triển Võ Logistics.
    """
    try:
        vat_rate = float(vat_rate)
    except (ValueError, TypeError):
        vat_rate = 10.0

    customer = Customer.objects.filter(id=customer_id, is_deleted=False).first()
    if not customer:
        customer = Customer.objects.filter(code=customer_id, is_deleted=False).first()

    customer_info = {
        'id': customer.id if customer else None,
        'code': customer.code if customer else str(customer_id),
        'name': customer.name if customer else f"KHÁCH HÀNG #{customer_id}",
        'short_name': customer.short_name or (customer.name if customer else f"KH #{customer_id}"),
        'tax_code': customer.tax_code if customer else '',
        'address': customer.address if customer else '',
        'phone': customer.phone if customer else '',
        'contact_person': customer.contact_person if customer else ''
    }

    company_info = get_system_company_info()

    # Xác định khoảng thời gian
    fd = None
    td = None
    today = timezone.localdate() if hasattr(timezone, 'localdate') else datetime.date.today()

    if month and year:
        try:
            m = int(month)
            y = int(year)
            fd = datetime.date(y, m, 1)
            # Ngày cuối cùng của tháng
            if m == 12:
                td = datetime.date(y + 1, 1, 1) - datetime.timedelta(days=1)
            else:
                td = datetime.date(y, m + 1, 1) - datetime.timedelta(days=1)
            statement_title = f"BẢNG KÊ VẬN CHUYỂN THÁNG {m}/{y}"
        except (ValueError, TypeError):
            m = today.month
            y = today.year
            fd = datetime.date(y, m, 1)
            td = today
            statement_title = f"BẢNG KÊ VẬN CHUYỂN THÁNG {m}/{y}"
    elif from_date and to_date:
        try:
            fd = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
            td = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
            if fd.month == td.month and fd.year == td.year:
                statement_title = f"BẢNG KÊ VẬN CHUYỂN THÁNG {fd.month}/{fd.year}"
            else:
                statement_title = f"BẢNG KÊ VẬN CHUYỂN TỪ {fd.strftime('%d/%m/%Y')} ĐẾN {td.strftime('%d/%m/%Y')}"
        except ValueError:
            m = today.month
            y = today.year
            statement_title = f"BẢNG KÊ VẬN CHUYỂN THÁNG {m}/{y}"
    else:
        m = today.month
        y = today.year
        statement_title = f"BẢNG KÊ VẬN CHUYỂN THÁNG {m}/{y}"

    # Query chuyến xe
    qs = DispatchTrip.objects.filter(is_deleted=False)
    if customer:
        qs = qs.filter(customer=customer)
    elif customer_id:
        qs = qs.filter(customer_id=customer_id)

    if fd:
        qs = qs.filter(Q(loading_date__gte=fd) | Q(loading_date__isnull=True, created_at__date__gte=fd))
    if td:
        qs = qs.filter(Q(loading_date__lte=td) | Q(loading_date__isnull=True, created_at__date__lte=td))

    status_filter = (status or 'ALL').upper()
    if status_filter == 'SETTLED':
        qs = qs.filter(is_customer_settled=True)
    elif status_filter == 'PENDING':
        qs = qs.filter(is_customer_settled=False)
    elif status_filter == 'COMPLETED':
        qs = qs.filter(status__in=[TripStatus.COMPLETED, TripStatus.DELIVERED])

    # Sắp xếp theo ngày vận chuyển tăng dần (Loading Date)
    trips_qs = qs.select_related(
        'customer', 'driver', 'vehicle', 'trailer',
        'dropoff_driver', 'dropoff_vehicle', 'booking_order'
    ).prefetch_related(
        'expenses'
    ).order_by('loading_date', 'created_at')

    rows = []
    tot_don_gia = 0
    tot_ha_xa = 0
    tot_neo = 0
    tot_phu_thu = 0
    tot_cong_cuoc = 0
    tot_vat = 0
    tot_thanh_tien_cuoc = 0
    tot_tien_nang = 0
    tot_tien_ha = 0
    tot_tien_cuoc = 0
    tot_cont_20 = 0
    tot_cont_40 = 0

    for idx, t in enumerate(trips_qs, start=1):
        # 1. Ngày vận chuyển
        t_date = t.loading_date or t.created_at.date()
        date_str = t_date.strftime('%Y-%m-%d')
        date_display = t_date.strftime('%d/%m/%Y')

        # 2. Khách hàng
        cust_name = customer_info['short_name'] if customer_info['short_name'] else (t.customer.name if t.customer else '')

        # 3. Lộ trình 3 điểm
        kho = t.warehouse_location or t.delivery_warehouse or ''
        noi_lay = t.pickup_location or t.pickup_depot or ''
        noi_ha = t.dropoff_location or t.dropoff_depot or ''

        # 4. Loại hình N/X/NĐ
        shipment_type = t.shipment_type or ShipmentType.IMPORT
        if shipment_type == ShipmentType.IMPORT:
            nx_code = 'N'
            nx_display = 'HÀNG NHẬP'
        elif shipment_type == ShipmentType.EXPORT:
            nx_code = 'X'
            nx_display = 'HÀNG XUẤT'
        else:
            nx_code = 'NĐ'
            nx_display = 'NỘI ĐỊA'

        # 5. Phân loại Container 20' / 40'
        ctype = str(t.container_type or '40HC').upper()
        is_twin = getattr(t, 'is_twin_container', False)
        if '20' in ctype or is_twin:
            cont_20 = 2 if is_twin else 1
            cont_40 = 0
        else:
            cont_20 = 0
            cont_40 = 1

        tot_cont_20 += cont_20
        tot_cont_40 += cont_40

        # 6. Số Container & Booking/Bill
        cont_num = t.container_number or ''
        if is_twin and getattr(t, 'container_number_2', ''):
            cont_num = f"{cont_num} / {t.container_number_2}"
        
        booking_or_bill = t.booking_or_bill or (t.booking_order.booking_number if t.booking_order else '')

        # 7. Cước vận chuyển: Đơn giá, Hạ xa, Neo, Phụ thu, Cộng, VAT, Thành tiền
        rev_val = getattr(t, 'cached_revenue', None) if getattr(t, 'cached_revenue', None) is not None else getattr(t, 'revenue', 0)
        don_gia = int(rev_val or 0)
        ha_xa = 0  # Phụ phí hạ xa (nếu có chi phí hạ xa khách chịu)
        neo = int(getattr(t, 'detention_fee_customer', 0) or 0)
        phu_thu = 0

        # Rà soát các chi phí phát sinh khách chịu
        active_expenses = [e for e in t.expenses.all() if not e.is_deleted]

        # Kiểm tra phụ thu khác nếu có
        for exp in active_expenses:
            if exp.is_on_behalf_of_customer and exp.category in ['PORT_STORAGE', 'WAREHOUSE_TIP', 'OTHER']:
                # Nếu là phí lưu bãi cảng do khách chịu thì tính vào phụ thu/neo
                if exp.category == 'PORT_STORAGE':
                    neo += int(exp.amount or 0)
                else:
                    phu_thu += int(exp.amount or 0)

        cong_cuoc = don_gia + ha_xa + neo + phu_thu
        vat_tien = int(round(cong_cuoc * (vat_rate / 100.0))) if vat_rate > 0 else 0
        thanh_tien_cuoc = cong_cuoc + vat_tien

        # 8. Hóa đơn nâng cont (LIFT_ON)
        lift_on_exps = [e for e in active_expenses if e.category in ['LIFT_ON', 'LIFT_ON_OFF']]
        hd_nang = ', '.join([e.invoice_number for e in lift_on_exps if e.invoice_number]) if lift_on_exps else ''
        tien_nang = sum(int(e.amount or 0) for e in lift_on_exps)

        # 9. Hóa đơn hạ cont (LIFT_OFF)
        lift_off_exps = [e for e in active_expenses if e.category == 'LIFT_OFF']
        hd_ha = ', '.join([e.invoice_number for e in lift_off_exps if e.invoice_number]) if lift_off_exps else ''
        tien_ha = sum(int(e.amount or 0) for e in lift_off_exps)

        # 10. Cược vỏ cont (CONTAINER_DEPOSIT)
        deposit_exps = [e for e in active_expenses if e.category == 'CONTAINER_DEPOSIT']
        tien_cuoc = sum(int(e.amount or 0) for e in deposit_exps)

        # 11. Ghi chú, Số xe, Tình trạng đã trả
        ghi_chu = t.cargo_notes or t.special_notes or ''
        so_xe = t.vehicle.license_plate if t.vehicle else ''
        if getattr(t, 'is_split_trip', False) and t.dropoff_vehicle and t.dropoff_vehicle != t.vehicle:
            so_xe = f"{so_xe} / {t.dropoff_vehicle.license_plate}"

        da_tra = 'Đã chốt' if getattr(t, 'is_customer_settled', False) else ''

        # Tổng thành tiền từng dòng = cước vận chuyển + nâng + hạ + cược
        tong_tien_chuyen = thanh_tien_cuoc + tien_nang + tien_ha + tien_cuoc

        tot_don_gia += don_gia
        tot_ha_xa += ha_xa
        tot_neo += neo
        tot_phu_thu += phu_thu
        tot_cong_cuoc += cong_cuoc
        tot_vat += vat_tien
        tot_thanh_tien_cuoc += thanh_tien_cuoc
        tot_tien_nang += tien_nang
        tot_tien_ha += tien_ha
        tot_tien_cuoc += tien_cuoc

        rows.append({
            'stt': idx,
            'trip_id': t.id,
            'trip_code': t.trip_code,
            'ngay': date_str,
            'ngay_display': date_display,
            'ten_khach_hang': cust_name,
            'kho': kho,
            'noi_lay': noi_lay,
            'noi_ha': noi_ha,
            'nx_code': nx_code,
            'nx_display': nx_display,
            'cont_20': cont_20,
            'cont_40': cont_40,
            'so_cont': cont_num,
            'booking_or_bill': booking_or_bill,
            'don_gia': don_gia,
            'ha_xa': ha_xa,
            'neo': neo,
            'phu_thu': phu_thu,
            'cong_cuoc': cong_cuoc,
            'vat_rate': vat_rate,
            'vat_tien': vat_tien,
            'thanh_tien_cuoc': thanh_tien_cuoc,
            'hd_nang': hd_nang,
            'tien_nang': tien_nang,
            'hd_ha': hd_ha,
            'tien_ha': tien_ha,
            'tien_cuoc': tien_cuoc,
            'ghi_chu': ghi_chu,
            'so_xe': so_xe,
            'da_tra': da_tra,
            'tong_tien_chuyen': tong_tien_chuyen,
            'is_settled': getattr(t, 'is_customer_settled', False),
            'vat_invoice_number': getattr(t, 'vat_invoice_number', '') or ''
        })

    # Tổng cộng toàn bộ các khoản phải thanh toán
    grand_total = tot_thanh_tien_cuoc + tot_tien_nang + tot_tien_ha + tot_tien_cuoc
    grand_total_words = vietnamese_number_to_words(grand_total)

    totals = {
        'total_trips': len(rows),
        'total_cont_20': tot_cont_20,
        'total_cont_40': tot_cont_40,
        'don_gia': tot_don_gia,
        'ha_xa': tot_ha_xa,
        'neo': tot_neo,
        'phu_thu': tot_phu_thu,
        'cong_cuoc': tot_cong_cuoc,
        'vat_tien': tot_vat,
        'thanh_tien_cuoc': tot_thanh_tien_cuoc,
        'tien_nang': tot_tien_nang,
        'tien_ha': tot_tien_ha,
        'tien_cuoc': tot_tien_cuoc,
        'grand_total': grand_total,
        'grand_total_words': grand_total_words
    }

    return {
        'company': company_info,
        'customer': customer_info,
        'statement_title': statement_title,
        'period': {
            'month': month,
            'year': year,
            'from_date': fd.strftime('%Y-%m-%d') if fd else None,
            'to_date': td.strftime('%Y-%m-%d') if td else None,
            'vat_rate': vat_rate,
            'status': status_filter
        },
        'rows': rows,
        'totals': totals
    }


def export_customer_monthly_statement_excel(statement_data):
    """
    Sinh file Excel (.xlsx) chuẩn định dạng 26 cột y hệt file đính kèm của Triển Võ Logistics.
    Gồm:
    - 3 dòng đầu: Tên cty, địa chỉ, MST
    - Dòng 5: Tiêu đề BẢNG KÊ VẬN CHUYỂN THÁNG ...
    - Dòng 7: KHÁCH HÀNG: ...
    - Dòng 8 & 9: Header 2 tầng (Colspan / Rowspan)
    - Dòng 10+: Dữ liệu chi tiết từng chuyến xe
    - Dòng CỘNG : Tổng cộng các cột
    - Dòng THÀNH TIỀN : Tổng tiền thanh toán + Bằng chữ
    - Chữ ký 2 bên (Khách hàng & Triển Võ)
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Bang_Ke_Van_Chuyen"
    ws.views.sheetView[0].showGridLines = True

    company = statement_data['company']
    customer = statement_data['customer']
    statement_title = statement_data['statement_title']
    rows = statement_data['rows']
    totals = statement_data['totals']
    vat_rate = statement_data['period'].get('vat_rate', 10)

    # Styles
    font_bold_title = Font(name="Times New Roman", size=14, bold=True, color="000000")
    font_company_name = Font(name="Times New Roman", size=11, bold=True, color="000000")
    font_company_meta = Font(name="Times New Roman", size=10, bold=False, color="333333")
    font_customer = Font(name="Times New Roman", size=11, bold=True, color="000000")
    font_header = Font(name="Times New Roman", size=9, bold=True, color="000000")
    font_data = Font(name="Times New Roman", size=9, color="000000")
    font_data_bold = Font(name="Times New Roman", size=9, bold=True, color="000000")
    font_totals = Font(name="Times New Roman", size=10, bold=True, color="000000")
    font_italic = Font(name="Times New Roman", size=9.5, italic=True, color="333333")

    fill_header_main = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid") # Xanh nhạt
    fill_header_freight = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid") # Cam nhạt
    fill_header_lift = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid") # Xanh lá nhạt
    fill_total_row = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid") # Vàng nhạt

    thin_border_side = Side(border_style="thin", color="000000")
    double_border_side = Side(border_style="double", color="000000")

    cell_border = Border(
        left=thin_border_side,
        right=thin_border_side,
        top=thin_border_side,
        bottom=thin_border_side
    )

    total_border = Border(
        left=thin_border_side,
        right=thin_border_side,
        top=thin_border_side,
        bottom=double_border_side
    )

    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center")

    num_format_money = '#,##0'

    # 1. Company Information Header (Rows 1-3)
    ws['A1'] = company['company_name']
    ws['A1'].font = font_company_name

    ws['A2'] = f"ĐỊA CHỈ: {company['address']}"
    ws['A2'].font = font_company_meta

    ws['A3'] = f"MST: {company['tax_code']}"
    ws['A3'].font = font_company_meta

    # 2. Title (Row 5)
    ws['A5'] = statement_title.upper()
    ws['A5'].font = font_bold_title
    ws['A5'].alignment = Alignment(horizontal="center", vertical="center")
    ws.merge_cells('A5:Z5')
    ws.row_dimensions[5].height = 25

    # 3. Customer Info (Row 7)
    ws['B7'] = f"KHÁCH HÀNG: {customer['name'].upper()}"
    ws['B7'].font = font_customer

    # 4. Table Headers (Row 8 & Row 9)
    # 26 Columns: A to Z
    # Definition of headers: (col_idx, title_r1, title_r2, is_merged_v, colspan, fill)
    headers_config = [
        # Col 1: STT
        ('A', 'STT', '', True, 1, fill_header_main),
        # Col 2: NGÀY
        ('B', 'NGÀY', '', True, 1, fill_header_main),
        # Col 3: TÊN KHÁCH HÀNG
        ('C', 'TÊN KHÁCH HÀNG', '', True, 1, fill_header_main),
        # Col 4: KHO
        ('D', 'KHO', '', True, 1, fill_header_main),
        # Col 5: NƠI LẤY
        ('E', 'NƠI LẤY', '', True, 1, fill_header_main),
        # Col 6: NƠI HẠ
        ('F', 'NƠI HẠ', '', True, 1, fill_header_main),
        # Col 7: N/X
        ('G', 'N/X', '', True, 1, fill_header_main),
        # Col 8 & 9: CONT (20', 40')
        ('H', 'CONT', '20\'', False, 2, fill_header_main),
        ('I', '', '40\'', False, 0, fill_header_main),
        # Col 10: SỐ CONT
        ('J', 'SỐ CONT', '', True, 1, fill_header_main),
        # Col 11: BOOKING / BILL
        ('K', 'BOOKING/\nBILL', '', True, 1, fill_header_main),
        # Col 12-18: CƯỚC VẬN CHUYỂN
        ('L', 'CƯỚC VẬN CHUYỂN', 'ĐƠN GIÁ', False, 7, fill_header_freight),
        ('M', '', 'HẠ XA', False, 0, fill_header_freight),
        ('N', '', 'NEO', False, 0, fill_header_freight),
        ('O', '', 'PHỤ THU', False, 0, fill_header_freight),
        ('P', '', 'CỘNG', False, 0, fill_header_freight),
        ('Q', '', f'VAT {int(vat_rate)}%' if vat_rate > 0 else 'VAT', False, 0, fill_header_freight),
        ('R', '', 'THÀNH TIỀN', False, 0, fill_header_freight),
        # Col 19-20: HĐ NÂNG
        ('S', 'HĐ NÂNG', 'HĐ', False, 2, fill_header_lift),
        ('T', '', 'TIỀN', False, 0, fill_header_lift),
        # Col 21-22: HĐ HẠ
        ('U', 'HĐ HẠ', 'HĐ', False, 2, fill_header_lift),
        ('V', '', 'TIỀN', False, 0, fill_header_lift),
        # Col 23: CƯỢC
        ('W', 'CƯỢC', '', True, 1, fill_header_main),
        # Col 24: GHI CHÚ
        ('X', 'GHI CHÚ', '', True, 1, fill_header_main),
        # Col 25: SỐ XE
        ('Y', 'SỐ XE', '', True, 1, fill_header_main),
        # Col 26: ĐÃ TRẢ
        ('Z', 'ĐÃ TRẢ', '', True, 1, fill_header_main),
    ]

    ws.row_dimensions[8].height = 24
    ws.row_dimensions[9].height = 20

    # Fill base cells for header
    for col_letter, title_r1, title_r2, is_merged_v, span, fill in headers_config:
        cell_r8 = ws[f'{col_letter}8']
        cell_r9 = ws[f'{col_letter}9']

        cell_r8.font = font_header
        cell_r8.alignment = align_center
        cell_r8.fill = fill
        cell_r8.border = cell_border

        cell_r9.font = font_header
        cell_r9.alignment = align_center
        cell_r9.fill = fill
        cell_r9.border = cell_border

        if is_merged_v:
            cell_r8.value = title_r1
            ws.merge_cells(f'{col_letter}8:{col_letter}9')
        else:
            if title_r1:
                cell_r8.value = title_r1
            if title_r2:
                cell_r9.value = title_r2

    # Perform horizontal merges for multi-column headers
    ws.merge_cells('H8:I8')   # CONT (20', 40')
    ws.merge_cells('L8:R8')   # CƯỚC VẬN CHUYỂN
    ws.merge_cells('S8:T8')   # HĐ NÂNG
    ws.merge_cells('U8:V8')   # HĐ HẠ

    # 5. Populate Data Rows (Starting at row 10)
    current_row = 10
    for r in rows:
        ws.row_dimensions[current_row].height = 19
        row_cells = [
            ('A', r['stt'], align_center, False, None),
            ('B', r['ngay'], align_center, False, None),
            ('C', r['ten_khach_hang'], align_left, False, None),
            ('D', r['kho'], align_left, False, None),
            ('E', r['noi_lay'], align_left, False, None),
            ('F', r['noi_ha'], align_left, False, None),
            ('G', r['nx_code'], align_center, False, None),
            ('H', r['cont_20'] if r['cont_20'] > 0 else '', align_center, False, None),
            ('I', r['cont_40'] if r['cont_40'] > 0 else '', align_center, False, None),
            ('J', r['so_cont'], align_center, True, None),
            ('K', r['booking_or_bill'], align_center, False, None),
            ('L', r['don_gia'] if r['don_gia'] > 0 else 0, align_right, False, num_format_money),
            ('M', r['ha_xa'] if r['ha_xa'] > 0 else '', align_right, False, num_format_money),
            ('N', r['neo'] if r['neo'] > 0 else '', align_right, False, num_format_money),
            ('O', r['phu_thu'] if r['phu_thu'] > 0 else '', align_right, False, num_format_money),
            ('P', r['cong_cuoc'], align_right, True, num_format_money),
            ('Q', r['vat_tien'] if r['vat_tien'] > 0 else '', align_right, False, num_format_money),
            ('R', r['thanh_tien_cuoc'], align_right, True, num_format_money),
            ('S', r['hd_nang'], align_center, False, None),
            ('T', r['tien_nang'] if r['tien_nang'] > 0 else 0, align_right, False, num_format_money),
            ('U', r['hd_ha'], align_center, False, None),
            ('V', r['tien_ha'] if r['tien_ha'] > 0 else 0, align_right, False, num_format_money),
            ('W', r['tien_cuoc'] if r['tien_cuoc'] > 0 else 0, align_right, False, num_format_money),
            ('X', r['ghi_chu'], align_left, False, None),
            ('Y', r['so_xe'], align_center, False, None),
            ('Z', r['da_tra'], align_center, False, None),
        ]

        for col_l, val, align, is_bold, num_fmt in row_cells:
            cell = ws[f'{col_l}{current_row}']
            cell.value = val
            cell.font = font_data_bold if is_bold else font_data
            cell.alignment = align
            cell.border = cell_border
            if num_fmt and isinstance(val, (int, float, Decimal)):
                cell.number_format = num_fmt

        current_row += 1

    # 6. Summary Rows: CỘNG & THÀNH TIỀN
    # Row CỘNG :
    row_cong = current_row
    ws.row_dimensions[row_cong].height = 22
    for col_i in range(1, 27):
        letter = get_column_letter(col_i)
        c = ws[f'{letter}{row_cong}']
        c.fill = fill_total_row
        c.border = cell_border
        c.font = font_totals

    ws[f'C{row_cong}'] = "CỘNG :"
    ws[f'C{row_cong}'].alignment = Alignment(horizontal="right", vertical="center")

    # Cont sums
    ws[f'H{row_cong}'] = totals['total_cont_20']
    ws[f'H{row_cong}'].alignment = align_center
    ws[f'I{row_cong}'] = totals['total_cont_40']
    ws[f'I{row_cong}'].alignment = align_center

    # Money sums
    money_cols = [
        ('L', totals['don_gia']),
        ('M', totals['ha_xa']),
        ('N', totals['neo']),
        ('O', totals['phu_thu']),
        ('P', totals['cong_cuoc']),
        ('Q', totals['vat_tien']),
        ('R', totals['thanh_tien_cuoc']),
        ('T', totals['tien_nang']),
        ('V', totals['tien_ha']),
        ('W', totals['tien_cuoc']),
    ]
    for col_l, val in money_cols:
        cell = ws[f'{col_l}{row_cong}']
        cell.value = val
        cell.alignment = align_right
        cell.number_format = num_format_money

    current_row += 1

    # Row THÀNH TIỀN :
    row_tt = current_row
    ws.row_dimensions[row_tt].height = 24
    for col_i in range(1, 27):
        letter = get_column_letter(col_i)
        c = ws[f'{letter}{row_tt}']
        c.fill = fill_total_row
        c.border = total_border
        c.font = font_totals

    ws[f'C{row_tt}'] = "THÀNH TIỀN :"
    ws[f'C{row_tt}'].alignment = Alignment(horizontal="right", vertical="center")

    cell_grand = ws[f'L{row_tt}']
    cell_grand.value = totals['grand_total']
    cell_grand.alignment = align_right
    cell_grand.number_format = num_format_money
    cell_grand.font = Font(name="Times New Roman", size=11, bold=True, color="000000")

    current_row += 1

    # Row Số tiền bằng chữ
    row_words = current_row
    ws[f'C{row_words}'] = f"Số tiền bằng chữ: {totals['grand_total_words']}"
    ws[f'C{row_words}'].font = font_italic
    ws.merge_cells(f'C{row_words}:R{row_words}')
    current_row += 2

    # 7. Signature Blocks (Khách Hàng & Triển Võ Logistics)
    # Left: Khách Hàng (Col B to F)
    # Right: Triển Võ Logistics (Col S to Y)
    row_sig_title = current_row
    ws.row_dimensions[row_sig_title].height = 20

    ws[f'B{row_sig_title}'] = f"ĐẠI DIỆN {customer['name'].upper()}"
    ws[f'B{row_sig_title}'].font = font_customer
    ws[f'B{row_sig_title}'].alignment = Alignment(horizontal="center", vertical="center")
    ws.merge_cells(f'B{row_sig_title}:F{row_sig_title}')

    ws[f'S{row_sig_title}'] = company['company_name']
    ws[f'S{row_sig_title}'].font = font_company_name
    ws[f'S{row_sig_title}'].alignment = Alignment(horizontal="center", vertical="center")
    ws.merge_cells(f'S{row_sig_title}:Y{row_sig_title}')

    row_sig_sub = current_row + 1
    ws[f'B{row_sig_sub}'] = "(Ký, ghi rõ họ tên và đóng dấu)"
    ws[f'B{row_sig_sub}'].font = font_italic
    ws[f'B{row_sig_sub}'].alignment = Alignment(horizontal="center", vertical="center")
    ws.merge_cells(f'B{row_sig_sub}:F{row_sig_sub}')

    ws[f'S{row_sig_sub}'] = "(Người lập bảng - Kế toán - Giám đốc duyệt)"
    ws[f'S{row_sig_sub}'].font = font_italic
    ws[f'S{row_sig_sub}'].alignment = Alignment(horizontal="center", vertical="center")
    ws.merge_cells(f'S{row_sig_sub}:Y{row_sig_sub}')

    # Space for stamps/signatures
    ws.row_dimensions[current_row + 2].height = 45

    # 8. Column widths auto-adjustment
    col_widths = {
        'A': 6,   # STT
        'B': 12,  # NGÀY
        'C': 18,  # TÊN KH
        'D': 16,  # KHO
        'E': 20,  # NƠI LẤY
        'F': 20,  # NƠI HẠ
        'G': 6,   # N/X
        'H': 6,   # 20'
        'I': 6,   # 40'
        'J': 15,  # SỐ CONT
        'K': 15,  # BOOKING/BILL
        'L': 14,  # ĐƠN GIÁ
        'M': 10,  # HẠ XA
        'N': 10,  # NEO
        'O': 10,  # PHỤ THU
        'P': 14,  # CỘNG
        'Q': 11,  # VAT
        'R': 15,  # THÀNH TIỀN
        'S': 12,  # HĐ NÂNG
        'T': 12,  # TIỀN NÂNG
        'U': 12,  # HĐ HẠ
        'V': 12,  # TIỀN HẠ
        'W': 12,  # CƯỢC
        'X': 20,  # GHI CHÚ
        'Y': 14,  # SỐ XE
        'Z': 10,  # ĐÃ TRẢ
    }
    for col_l, width in col_widths.items():
        ws.column_dimensions[col_l].width = width

    # Set landscape print orientation
    ws.page_setup.orientation = ws.ORIENTATION_LANDSCAPE
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
