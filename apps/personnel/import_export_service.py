import io
import re
import datetime
from decimal import Decimal
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from django.db import transaction
from django.utils import timezone
from apps.personnel.models import (
    Employee, Department, EmployeeRole, EmployeeGender
)

# Cấu hình danh mục các cột nhập liệu nhân sự
EMPLOYEE_COLUMNS = [
    {'key': 'code', 'header': 'Mã Nhân Viên (*hoặc để trống)', 'required': False, 'type': 'str', 'sample': 'TX001'},
    {'key': 'full_name', 'header': 'Họ Và Tên (*)', 'required': True, 'type': 'str', 'sample': 'Nguyễn Văn An'},
    {'key': 'nickname', 'header': 'Biệt Danh Hiện Trường', 'required': False, 'type': 'str', 'sample': 'AN 51D'},
    {'key': 'phone_number', 'header': 'Số Điện Thoại (*)', 'required': True, 'type': 'str', 'sample': '0908123456'},
    {'key': 'email', 'header': 'Email', 'required': False, 'type': 'str', 'sample': 'an.nguyen@trienvo.vn'},
    {'key': 'department', 'header': 'Phòng Ban (*)', 'required': False, 'type': 'str', 'sample': 'Đội Xe & Bãi'},
    {'key': 'role', 'header': 'Chức Vụ / Vị Trí (*)', 'required': False, 'type': 'str', 'sample': 'Tài xế'},
    {'key': 'gender', 'header': 'Giới Tính (Nam/Nữ)', 'required': False, 'type': 'str', 'sample': 'Nam'},
    {'key': 'date_of_birth', 'header': 'Ngày Sinh (YYYY-MM-DD)', 'required': False, 'type': 'date', 'sample': '1988-05-15'},
    {'key': 'national_id', 'header': 'Số CCCD / CMND', 'required': False, 'type': 'str', 'sample': '079088012345'},
    {'key': 'national_id_date', 'header': 'Ngày Cấp CCCD', 'required': False, 'type': 'date', 'sample': '2021-04-10'},
    {'key': 'national_id_place', 'header': 'Nơi Cấp CCCD', 'required': False, 'type': 'str', 'sample': 'Cục CS QLHC về TTXH'},
    {'key': 'tax_id', 'header': 'Mã Số Thuế TNCN', 'required': False, 'type': 'str', 'sample': '8012345678'},
    {'key': 'insurance_number', 'header': 'Mã Số BHXH', 'required': False, 'type': 'str', 'sample': '7912345678'},
    {'key': 'permanent_address', 'header': 'Địa Chỉ Thường Trú', 'required': False, 'type': 'str', 'sample': 'Ấp 2, Xã An Phước, H. Long Thành, Đồng Nai'},
    {'key': 'current_address', 'header': 'Chỗ Ở Hiện Nay', 'required': False, 'type': 'str', 'sample': 'Bãi xe Suối Tiên, TP. Thủ Đức'},
    {'key': 'bank_account', 'header': 'Số Tài Khoản Nhận Lương', 'required': False, 'type': 'str', 'sample': '1903123456789'},
    {'key': 'bank_name', 'header': 'Tên Ngân Hàng', 'required': False, 'type': 'str', 'sample': 'Techcombank'},
    {'key': 'bank_branch', 'header': 'Chi Nhánh Ngân Hàng', 'required': False, 'type': 'str', 'sample': 'Chi nhánh Sài Gòn'},
    {'key': 'bank_beneficiary', 'header': 'Tên Chủ Tài Khoản (In hoa)', 'required': False, 'type': 'str', 'sample': 'NGUYEN VAN AN'},
    {'key': 'join_date', 'header': 'Ngày Vào Làm (YYYY-MM-DD)', 'required': False, 'type': 'date', 'sample': '2023-01-10'},
    {'key': 'base_salary', 'header': 'Lương Căn Bản / Khoán (VNĐ)', 'required': False, 'type': 'decimal', 'sample': 6500000},
    {'key': 'insurance_salary', 'header': 'Lương Đóng BHXH (VNĐ)', 'required': False, 'type': 'decimal', 'sample': 5000000},
    {'key': 'license_number', 'header': 'Số Giấy Phép Lái Xe (GPLX)', 'required': False, 'type': 'str', 'sample': '790123456789'},
    {'key': 'license_expiry', 'header': 'Hạn Giấy Phép Lái Xe', 'required': False, 'type': 'date', 'sample': '2028-05-15'},
    {'key': 'is_active', 'header': 'Trạng Thái (Hoạt động/Tạm ngưng)', 'required': False, 'type': 'bool', 'sample': 'Hoạt động'},
]

EMPLOYEE_SAMPLES = [
    [
        'TX001', 'Nguyễn Văn An', 'AN 51D', '0908123456', 'an.nguyen@trienvo.vn',
        'Đội Xe & Bãi', 'Tài xế', 'Nam', '1988-05-15', '079088012345', '2021-04-10', 'Cục CS QLHC về TTXH',
        '8012345678', '7912345678', 'Ấp 2, Xã An Phước, Long Thành, Đồng Nai', 'Bãi xe Suối Tiên, TP. Thủ Đức',
        '1903123456789', 'Techcombank', 'CN Sài Gòn', 'NGUYEN VAN AN', '2023-01-10',
        6500000, 5000000, '790123456789', '2028-05-15', 'Hoạt động'
    ],
    [
        'DD001', 'Trần Quốc Dũng', 'DŨNG ĐIỀU ĐỘ', '0918765432', 'dung.tran@trienvo.vn',
        'Phòng Điều Vận', 'Điều độ viên', 'Nam', '1992-09-20', '079092054321', '2022-08-15', 'Cục CS QLHC về TTXH',
        '8092054321', '7992054321', '15/4 Lê Văn Việt, Tăng Nhơn Phú B, TP. Thủ Đức', '15/4 Lê Văn Việt, TP. Thủ Đức',
        '0441000987654', 'Vietcombank', 'CN Thủ Thiêm', 'TRAN QUOC DUNG', '2022-03-01',
        9000000, 6000000, '', '', 'Hoạt động'
    ],
    [
        'KT001', 'Lê Thị Bích Ngọc', 'NGỌC KẾ TOÁN', '0933555777', 'ngoc.le@trienvo.vn',
        'Kế Toán Tài Chính', 'Kế toán viên', 'Nữ', '1995-11-28', '079095099887', '2023-02-20', 'Cục CS QLHC về TTXH',
        '8095099887', '7995099887', '48 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM', '72/5 Điện Biên Phủ, Bình Thạnh, TP.HCM',
        '0071000555777', 'MB Bank', 'CN Hồ Chí Minh', 'LE THI BICH NGOC', '2023-06-15',
        10000000, 6000000, '', '', 'Hoạt động'
    ]
]

# Mapping chuẩn hóa phòng ban từ nhiều cách viết (4 Ô XANH + PHÒNG HẢI QUAN + BAN GIÁM ĐỐC)
DEPARTMENT_LOOKUP = {
    'ADMIN_ACC': Department.ADMIN_ACC,
    'PHÒNG HÀNH CHÍNH & KẾ TOÁN': Department.ADMIN_ACC,
    'HÀNH CHÍNH & KẾ TOÁN': Department.ADMIN_ACC,
    'HÀNH CHÍNH KẾ TOÁN': Department.ADMIN_ACC,
    'HC & KT': Department.ADMIN_ACC,
    'HR': Department.ADMIN_ACC,
    'ACCOUNTING': Department.ADMIN_ACC,
    'HÀNH CHÍNH NHÂN SỰ': Department.ADMIN_ACC,
    'KẾ TOÁN TÀI CHÍNH': Department.ADMIN_ACC,

    'DISPATCH': Department.DISPATCH,
    'PHÒNG ĐIỀU VẬN': Department.DISPATCH,
    'ĐIỀU VẬN': Department.DISPATCH,
    'ĐIỀU ĐỘ': Department.DISPATCH,

    'SALES': Department.SALES,
    'PHÒNG KINH DOANH': Department.SALES,
    'KINH DOANH': Department.SALES,

    'MAINTENANCE': Department.MAINTENANCE,
    'PHÒNG BẢO TRÌ VẬN HÀNH': Department.MAINTENANCE,
    'BẢO TRÌ VẬN HÀNH': Department.MAINTENANCE,
    'BẢO TRÌ': Department.MAINTENANCE,
    'FLEET': Department.MAINTENANCE,
    'ĐỘI XE & BÃI': Department.MAINTENANCE,

    'CUSTOMS': Department.CUSTOMS,
    'PHÒNG DỊCH VỤ HẢI QUAN': Department.CUSTOMS,
    'DỊCH VỤ HẢI QUAN': Department.CUSTOMS,
    'HẢI QUAN': Department.CUSTOMS,
    'THỦ TỤC HẢI QUAN': Department.CUSTOMS,

    'MANAGEMENT': Department.MANAGEMENT,
    'BAN GIÁM ĐỐC': Department.MANAGEMENT,
    'GIÁM ĐỐC': Department.MANAGEMENT,
    'BGD': Department.MANAGEMENT,
}

# Mapping chuẩn hóa 13 vị trí theo cơ cấu tổ chức
ROLE_LOOKUP = {
    # Cấp quản trị
    'DIRECTOR': EmployeeRole.DIRECTOR,
    'GIÁM ĐỐC': EmployeeRole.DIRECTOR,
    'BAN GIÁM ĐỐC': EmployeeRole.DIRECTOR,

    # 1. Phòng Hành Chính & Kế Toán (2 vị trí)
    'LEAD_ADMIN_ACC': EmployeeRole.LEAD_ADMIN_ACC,
    'CHUYÊN VIÊN PHỤ TRÁCH (HC & KẾ TOÁN)': EmployeeRole.LEAD_ADMIN_ACC,
    'CHUYÊN VIÊN PHỤ TRÁCH HÀNH CHÍNH & KẾ TOÁN': EmployeeRole.LEAD_ADMIN_ACC,
    'PHỤ TRÁCH HÀNH CHÍNH KẾ TOÁN': EmployeeRole.LEAD_ADMIN_ACC,
    'KẾ TOÁN TRƯỞNG': EmployeeRole.LEAD_ADMIN_ACC,

    'STAFF_ADMIN_ACC': EmployeeRole.STAFF_ADMIN_ACC,
    'NHÂN VIÊN (HC & KẾ TOÁN)': EmployeeRole.STAFF_ADMIN_ACC,
    'NHÂN VIÊN HÀNH CHÍNH & KẾ TOÁN': EmployeeRole.STAFF_ADMIN_ACC,
    'NHÂN VIÊN KẾ TOÁN': EmployeeRole.STAFF_ADMIN_ACC,
    'KẾ TOÁN VIÊN': EmployeeRole.STAFF_ADMIN_ACC,
    'ACCOUNTANT': EmployeeRole.STAFF_ADMIN_ACC,

    # 2. Phòng Điều Vận (4 vị trí)
    'LEAD_DISPATCH': EmployeeRole.LEAD_DISPATCH,
    'CHUYÊN VIÊN PHỤ TRÁCH (ĐIỀU VẬN)': EmployeeRole.LEAD_DISPATCH,
    'CHUYÊN VIÊN PHỤ TRÁCH ĐIỀU VẬN': EmployeeRole.LEAD_DISPATCH,
    'TRƯỞNG PHÒNG ĐIỀU VẬN': EmployeeRole.LEAD_DISPATCH,

    'DISPATCHER': EmployeeRole.DISPATCHER,
    'NHÂN VIÊN ĐIỀU VẬN': EmployeeRole.DISPATCHER,
    'ĐIỀU ĐỘ VIÊN': EmployeeRole.DISPATCHER,
    'ĐIỀU VẬN': EmployeeRole.DISPATCHER,

    'DISPATCH_ASST': EmployeeRole.DISPATCH_ASST,
    'NHÂN VIÊN HỖ TRỢ': EmployeeRole.DISPATCH_ASST,
    'NHÂN VIÊN HỖ TRỢ (ĐIỀU VẬN)': EmployeeRole.DISPATCH_ASST,
    'HỖ TRỢ ĐIỀU VẬN': EmployeeRole.DISPATCH_ASST,

    'DRIVER': EmployeeRole.DRIVER,
    'TÀI XẾ & GIAO NHẬN': EmployeeRole.DRIVER,
    'TÀI XẾ': EmployeeRole.DRIVER,
    'LÁI XE': EmployeeRole.DRIVER,

    # 3. Phòng Kinh Doanh (3 vị trí)
    'LEAD_SALES': EmployeeRole.LEAD_SALES,
    'CHUYÊN VIÊN PHỤ TRÁCH (KINH DOANH)': EmployeeRole.LEAD_SALES,
    'CHUYÊN VIÊN PHỤ TRÁCH KINH DOANH': EmployeeRole.LEAD_SALES,
    'TRƯỞNG PHÒNG KINH DOANH': EmployeeRole.LEAD_SALES,

    'SALESMAN': EmployeeRole.SALESMAN,
    'NHÂN VIÊN KINH DOANH': EmployeeRole.SALESMAN,
    'SALES': EmployeeRole.SALESMAN,

    'CSKH': EmployeeRole.CSKH,
    'ADMIN / CSKH': EmployeeRole.CSKH,
    'ADMIN/CSKH': EmployeeRole.CSKH,
    'CSKH': EmployeeRole.CSKH,
    'CHĂM SÓC KHÁCH HÀNG': EmployeeRole.CSKH,

    # 4. Phòng Bảo Trì Vận Hành (2 vị trí)
    'LEAD_MAINT': EmployeeRole.LEAD_MAINT,
    'CHUYÊN VIÊN PHỤ TRÁCH (BẢO TRÌ VẬN HÀNH)': EmployeeRole.LEAD_MAINT,
    'CHUYÊN VIÊN PHỤ TRÁCH BẢO TRÌ': EmployeeRole.LEAD_MAINT,
    'TRƯỞNG PHÒNG BẢO TRÌ': EmployeeRole.LEAD_MAINT,

    'MECHANIC': EmployeeRole.MECHANIC,
    'NHÂN VIÊN BẢO TRÌ': EmployeeRole.MECHANIC,
    'KỸ THUẬT VIÊN BÃI XE': EmployeeRole.MECHANIC,
    'THỢ MÁY': EmployeeRole.MECHANIC,

    # 5. Phòng Dịch Vụ Hải Quan (2 vị trí)
    'LEAD_CUSTOMS': EmployeeRole.LEAD_CUSTOMS,
    'CHUYÊN VIÊN PHỤ TRÁCH (DỊCH VỤ HẢI QUAN)': EmployeeRole.LEAD_CUSTOMS,
    'CHUYÊN VIÊN PHỤ TRÁCH HẢI QUAN': EmployeeRole.LEAD_CUSTOMS,
    'TRƯỞNG PHÒNG HẢI QUAN': EmployeeRole.LEAD_CUSTOMS,

    'CUSTOMS_STAFF': EmployeeRole.CUSTOMS_STAFF,
    'NHÂN VIÊN XỬ LÝ': EmployeeRole.CUSTOMS_STAFF,
    'NHÂN VIÊN XỬ LÝ (HẢI QUAN)': EmployeeRole.CUSTOMS_STAFF,
    'NHÂN VIÊN HẢI QUAN': EmployeeRole.CUSTOMS_STAFF,
}

def parse_date_val(val):
    if not val:
        return None
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.date() if isinstance(val, datetime.datetime) else val
    val_str = str(val).strip()
    if not val_str:
        return None
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d'):
        try:
            return datetime.datetime.strptime(val_str, fmt).date()
        except ValueError:
            pass
    return None

def parse_decimal_val(val, default=Decimal('0')):
    if val is None or str(val).strip() == '':
        return default
    if isinstance(val, (int, float, Decimal)):
        return Decimal(str(int(val)))
    s = str(val).replace(',', '').replace('.', '').replace(' ', '').replace('₫', '').replace('đ', '').strip()
    try:
        return Decimal(s)
    except Exception:
        return default

def parse_bool_val(val, default=True):
    if val is None:
        return default
    s = str(val).strip().lower()
    if s in ['1', 'true', 'yes', 'hoạt động', 'đang làm việc', 'đang hoạt động', 'active']:
        return True
    if s in ['0', 'false', 'no', 'tạm ngưng', 'nghỉ việc', 'đã thôi việc', 'inactive']:
        return False
    return default

def parse_gender_val(val):
    if not val:
        return EmployeeGender.MALE
    s = str(val).strip().upper()
    if s in ['NAM', 'MALE', 'M', '1']:
        return EmployeeGender.MALE
    if s in ['NỮ', 'NU', 'FEMALE', 'F', '0']:
        return EmployeeGender.FEMALE
    return EmployeeGender.OTHER

def generate_employee_template():
    """
    Tạo file Excel mẫu nhập liệu Hồ Sơ Nhân Sự (Format chuẩn Triền Võ Logistics)
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "HoSo_NhanSu"
    ws.views.sheetView[0].showGridLines = True

    # 1. Tiêu đề lớn
    total_cols = len(EMPLOYEE_COLUMNS)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_cols)
    title_cell = ws.cell(row=1, column=1, value="MẪU NHẬP HỒ SƠ NHÂN SỰ & TÀI XẾ — TRIỀN VÕ LOGISTICS")
    title_cell.font = Font(name="Arial", size=13, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36

    # 2. Dòng lưu ý hướng dẫn
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=total_cols)
    note_text = (
        "Lưu ý: Các cột có dấu (*) là bắt buộc. Nếu để trống 'Mã Nhân Viên', hệ thống sẽ tự sinh mã tự động (Tài xế: TX..., Điều độ: DD..., Kế toán: KT...). "
        "Dòng 4, 5, 6 là dữ liệu mẫu minh họa, vui lòng xóa hoặc điền đè thông tin thực tế trước khi tải lên."
    )
    note_cell = ws.cell(row=2, column=1, value=note_text)
    note_cell.font = Font(name="Arial", size=9.5, italic=True, bold=True, color="854D0E")
    note_cell.fill = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")
    note_cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[2].height = 28

    # Style Header & Cell
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="115E59", end_color="115E59", fill_type="solid")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # 3. Ghi Header (Dòng 3)
    ws.row_dimensions[3].height = 28
    for col_idx, col in enumerate(EMPLOYEE_COLUMNS, start=1):
        c = ws.cell(row=3, column=col_idx, value=col['header'])
        c.font = header_font
        c.fill = header_fill
        c.alignment = header_align
        c.border = thin_border

    # 4. Ghi các dòng mẫu (Dòng 4, 5, 6)
    sample_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    sample_font = Font(name="Arial", size=9.5, color="334155")
    for r_idx, sample_row in enumerate(EMPLOYEE_SAMPLES, start=4):
        ws.row_dimensions[r_idx].height = 22
        for c_idx, val in enumerate(sample_row, start=1):
            c = ws.cell(row=r_idx, column=c_idx, value=val)
            c.font = sample_font
            c.fill = sample_fill
            c.border = thin_border
            if isinstance(val, (int, float, Decimal)):
                c.alignment = Alignment(horizontal="right", vertical="center")
                c.number_format = "#,##0"
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

    # 5. Tự động chỉnh độ rộng cột
    for col_idx, col in enumerate(EMPLOYEE_COLUMNS, start=1):
        col_letter = get_column_letter(col_idx)
        max_len = max(len(str(col['header'])), len(str(col.get('sample', ''))))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

    filename = "Mau_Nhap_Ho_So_Nhan_Su.xlsx"
    return wb, filename

def import_employees_from_excel(file_obj, update_existing=False, user=None):
    """
    Dịch vụ đọc và nhập dữ liệu Hồ Sơ Nhân Sự từ file Excel (.xlsx, .xls)
    """
    try:
        wb = openpyxl.load_workbook(file_obj, data_only=True)
    except Exception as e:
        return {
            'success': False,
            'message': f'Không thể đọc file Excel. Định dạng không hợp lệ hoặc file bị hỏng ({str(e)})'
        }

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows or len(rows) < 3:
        return {
            'success': False,
            'message': 'File Excel rỗng hoặc không đúng cấu trúc mẫu!'
        }

    # Tìm dòng header (quét trong 5 dòng đầu tiên)
    header_row_idx = None
    for idx, row in enumerate(rows[:6]):
        row_str = " ".join([str(c or '').strip().lower() for c in row])
        if 'họ và tên' in row_str or 'full_name' in row_str:
            header_row_idx = idx
            break

    if header_row_idx is None:
        return {
            'success': False,
            'message': "Không tìm thấy dòng tiêu đề cột hợp lệ (yêu cầu chứa cột 'Họ Và Tên' hoặc 'full_name')."
        }

    header_row = rows[header_row_idx]
    col_mapping = {}

    for c_idx, h_val in enumerate(header_row):
        if not h_val:
            continue
        h_str = str(h_val).strip().lower()
        for cfg in EMPLOYEE_COLUMNS:
            key = cfg['key']
            cfg_h = cfg['header'].lower()
            if key in h_str or cfg_h.split('(')[0].strip() in h_str:
                col_mapping[c_idx] = cfg
                break

    if not col_mapping:
        return {
            'success': False,
            'message': 'Không thể ánh xạ các cột dữ liệu trong file Excel với danh mục nhân sự.'
        }

    data_rows = rows[header_row_idx + 1:]
    total_rows = 0
    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors = []

    for r_offset, row in enumerate(data_rows, start=header_row_idx + 2):
        if not any(row):
            continue

        first_val = str(row[0] or '').strip()
        if first_val in ['Lưu ý:', 'STT', 'Dòng mẫu']:
            continue

        row_data = {}
        for c_idx, col_cfg in col_mapping.items():
            val = row[c_idx] if c_idx < len(row) else None
            key = col_cfg['key']
            c_type = col_cfg['type']

            if c_type == 'str':
                row_data[key] = str(val).strip() if val is not None else ''
            elif c_type == 'date':
                row_data[key] = parse_date_val(val)
            elif c_type == 'decimal':
                row_data[key] = parse_decimal_val(val)
            elif c_type == 'bool':
                row_data[key] = parse_bool_val(val)
            else:
                row_data[key] = val

        # Kiểm tra nếu là dòng mẫu chưa sửa thì bỏ qua
        full_name = row_data.get('full_name', '').strip()
        code_raw = row_data.get('code', '').strip().upper()
        phone_raw = row_data.get('phone_number', '').strip()

        is_sample = False
        for s in EMPLOYEE_SAMPLES:
            if s[0] == code_raw and s[1].lower() == full_name.lower():
                is_sample = True
                break
        if is_sample:
            skipped_count += 1
            continue

        # Validate bắt buộc
        if not full_name:
            errors.append(f"Dòng {r_offset}: Thiếu Họ và Tên nhân sự bắt buộc.")
            continue
        if not phone_raw:
            errors.append(f"Dòng {r_offset}: Thiếu Số Điện Thoại cho nhân sự '{full_name}'.")
            continue

        total_rows += 1

        # Xử lý transaction savepoint theo dòng (Defensive PostgreSQL)
        try:
            with transaction.atomic():
                dept_raw = str(row_data.get('department') or '').strip().upper()
                department = DEPARTMENT_LOOKUP.get(dept_raw, Department.FLEET)

                role_raw = str(row_data.get('role') or '').strip().upper()
                role = ROLE_LOOKUP.get(role_raw, EmployeeRole.DRIVER)

                gender = parse_gender_val(row_data.get('gender'))

                # Mã nhân viên: nếu trống, tự động sinh mã
                if not code_raw:
                    code = Employee.generate_next_code(role=role, department=department)
                else:
                    code = code_raw

                # Tìm kiếm bản ghi trùng: kiểm tra code hoặc phone_number hoặc national_id
                nat_id = row_data.get('national_id', '').strip()
                emp_mgr = getattr(Employee, 'all_objects', Employee.objects)

                existing = emp_mgr.filter(code=code).first()
                if not existing and phone_raw:
                    existing = emp_mgr.filter(phone_number=phone_raw).first()
                if not existing and nat_id:
                    existing = emp_mgr.filter(national_id=nat_id).first()

                fields_to_save = {
                    'full_name': full_name,
                    'nickname': row_data.get('nickname', ''),
                    'phone_number': phone_raw,
                    'email': row_data.get('email', ''),
                    'department': department,
                    'role': role,
                    'gender': gender,
                    'date_of_birth': row_data.get('date_of_birth'),
                    'national_id': nat_id,
                    'national_id_date': row_data.get('national_id_date'),
                    'national_id_place': row_data.get('national_id_place', ''),
                    'tax_id': row_data.get('tax_id', ''),
                    'insurance_number': row_data.get('insurance_number', ''),
                    'permanent_address': row_data.get('permanent_address', ''),
                    'current_address': row_data.get('current_address', ''),
                    'bank_account': row_data.get('bank_account', ''),
                    'bank_name': row_data.get('bank_name', ''),
                    'bank_branch': row_data.get('bank_branch', ''),
                    'bank_beneficiary': row_data.get('bank_beneficiary', ''),
                    'join_date': row_data.get('join_date') or timezone.now().date(),
                    'base_salary': row_data.get('base_salary', Decimal('5000000')),
                    'insurance_salary': row_data.get('insurance_salary', Decimal('5000000')),
                    'license_number': row_data.get('license_number', ''),
                    'license_expiry': row_data.get('license_expiry'),
                    'is_active': row_data.get('is_active', True),
                    'is_deleted': False,
                    'deleted_at': None
                }

                if existing:
                    if update_existing:
                        for k, v in fields_to_save.items():
                            setattr(existing, k, v)
                        existing.save()
                        updated_count += 1
                    else:
                        skipped_count += 1
                else:
                    fields_to_save['code'] = code
                    Employee.objects.create(**fields_to_save)
                    created_count += 1

        except Exception as ex:
            errors.append(f"Dòng {r_offset} [{full_name}]: {str(ex)}")

    return {
        'success': True,
        'total_rows': total_rows,
        'created_count': created_count,
        'updated_count': updated_count,
        'skipped_count': skipped_count,
        'error_count': len(errors),
        'errors': errors[:50]
    }

def export_employees_to_excel(queryset=None):
    """
    Xuất toàn bộ danh sách nhân sự hiện tại ra file Excel (.xlsx)
    """
    if queryset is None:
        queryset = Employee.objects.all().order_by('department', 'role', 'code')

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "DanhSach_NhanSu"
    ws.views.sheetView[0].showGridLines = True

    total_cols = len(EMPLOYEE_COLUMNS)
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_cols)
    title_cell = ws.cell(row=1, column=1, value=f"DANH SÁCH NHÂN SỰ & TÀI XẾ TRIỀN VÕ LOGISTICS — {timezone.now().strftime('%d/%m/%Y')}")
    title_cell.font = Font(name="Arial", size=13, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36

    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="115E59", end_color="115E59", fill_type="solid")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    ws.row_dimensions[2].height = 28
    for col_idx, col in enumerate(EMPLOYEE_COLUMNS, start=1):
        c = ws.cell(row=2, column=col_idx, value=col['header'])
        c.font = header_font
        c.fill = header_fill
        c.alignment = header_align
        c.border = thin_border

    data_font = Font(name="Arial", size=9.5, color="1E293B")
    for r_idx, emp in enumerate(queryset, start=3):
        ws.row_dimensions[r_idx].height = 22
        row_vals = [
            emp.code,
            emp.full_name,
            emp.nickname,
            emp.phone_number,
            emp.email,
            emp.get_department_display(),
            emp.get_role_display(),
            emp.get_gender_display(),
            emp.date_of_birth.strftime('%Y-%m-%d') if emp.date_of_birth else '',
            emp.national_id,
            emp.national_id_date.strftime('%Y-%m-%d') if emp.national_id_date else '',
            emp.national_id_place,
            emp.tax_id,
            emp.insurance_number,
            emp.permanent_address,
            emp.current_address,
            emp.bank_account,
            emp.bank_name,
            emp.bank_branch,
            emp.bank_beneficiary,
            emp.join_date.strftime('%Y-%m-%d') if emp.join_date else '',
            float(emp.base_salary or 0),
            float(emp.insurance_salary or 0),
            emp.license_number,
            emp.license_expiry.strftime('%Y-%m-%d') if emp.license_expiry else '',
            'Hoạt động' if emp.is_active else 'Tạm ngưng'
        ]
        for c_idx, val in enumerate(row_vals, start=1):
            c = ws.cell(row=r_idx, column=c_idx, value=val)
            c.font = data_font
            c.border = thin_border
            if isinstance(val, (int, float)):
                c.alignment = Alignment(horizontal="right", vertical="center")
                c.number_format = "#,##0"
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

    for col_idx, col in enumerate(EMPLOYEE_COLUMNS, start=1):
        col_letter = get_column_letter(col_idx)
        max_len = len(str(col['header']))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 15)

    filename = f"Danh_Sach_Nhan_Su_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return wb, filename
