import datetime
from decimal import Decimal
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from django.db import transaction
from django.utils import timezone

from apps.master_data.models import (
    Location, LocationType,
    ContainerType, ContainerCategory,
    ExpenseItem, ExpenseCategoryGroup,
    DriverSalaryTariff, DriverAllowanceCatalog, AllowanceCategory,
    ShippingLine, Subcontractor,
    OpeningBalance, OpeningBalanceCategory,
    ACCOUNT_NAME_MAP
)
from apps.customers.models import Customer, RouteTariff
from apps.fleet.models import Vehicle, Trailer, VehicleType, VehicleOwnership, VehicleStatus, parse_payload_input


# --- HELPER PARSING FUNCTIONS ---

def parse_str(val, default=''):
    if val is None:
        return default
    return str(val).strip()

def parse_int(val, default=0):
    if val is None or val == '':
        return default
    try:
        cleaned = str(val).replace(',', '').replace('.', '').replace(' ', '').strip()
        return int(float(cleaned))
    except Exception:
        return default

def parse_decimal(val, default=Decimal('0')):
    if val is None or val == '':
        return default
    try:
        cleaned = str(val).replace(',', '').replace(' ', '').replace('đ', '').replace('VND', '').replace('VNĐ', '').strip()
        return Decimal(cleaned)
    except Exception:
        return default

def parse_bool(val, default=True):
    if val is None or val == '':
        return default
    s = str(val).strip().lower()
    if s in ['1', 'true', 'yes', 'y', 'có', 'co', 'dung', 'đúng', 'hoạt động', 'hoat dong', 'kích hoạt', 'kich hoat', 'đang dùng']:
        return True
    if s in ['0', 'false', 'no', 'n', 'không', 'khong', 'sai', 'tạm ngưng', 'tam ngung', 'ngừng']:
        return False
    return default

def parse_date(val, default=None):
    if val is None or val == '':
        return default
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.date() if isinstance(val, datetime.datetime) else val
    s = str(val).strip()
    # Try formats
    for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d']:
        try:
            return datetime.datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return default


# --- CATALOG CONFIGURATIONS ---

CATALOG_REGISTRY = {
    'locations': {
        'title': 'DANH MỤC ĐỊA ĐIỂM / CẢNG BÃI / KHO HÀNG / DEPOT',
        'sheet_name': 'DiaDiem_CangBai',
        'filename': 'Mau_Nhap_Dia_Diem_Cang_Bai.xlsx',
        'model': Location,
        'unique_fields': ['code'],
        'columns': [
            {'key': 'code', 'header': 'Mã Địa Điểm (*)', 'required': True, 'type': 'str', 'sample': 'CANG_CAT_LAI'},
            {'key': 'name', 'header': 'Tên Cảng / Kho / Bãi (*)', 'required': True, 'type': 'str', 'sample': 'Cảng Cát Lái - Tân Cảng Sài Gòn'},
            {
                'key': 'location_type', 'header': 'Phân Loại (*)', 'required': True, 'type': 'choice',
                'sample': 'Cảng Biển',
                'choices': {
                    'Cảng Biển': LocationType.PORT, 'PORT': LocationType.PORT,
                    'Cảng Cạn (ICD)': LocationType.ICD, 'Cảng Cạn': LocationType.ICD, 'ICD': LocationType.ICD,
                    'Bãi Rỗng / Depot': LocationType.DEPOT, 'Bãi Rỗng': LocationType.DEPOT, 'DEPOT': LocationType.DEPOT,
                    'Kho Hàng / Nhà Máy': LocationType.WAREHOUSE, 'Kho Hàng': LocationType.WAREHOUSE, 'Nhà Máy': LocationType.WAREHOUSE, 'WAREHOUSE': LocationType.WAREHOUSE,
                    'Bãi Đỗ Xe Công Ty': LocationType.YARD, 'Bãi Đỗ Xe': LocationType.YARD, 'YARD': LocationType.YARD
                }
            },
            {'key': 'province', 'header': 'Tỉnh / Thành', 'required': False, 'type': 'str', 'sample': 'TP. Hồ Chí Minh'},
            {'key': 'address', 'header': 'Địa Chỉ Chi Tiết', 'required': False, 'type': 'str', 'sample': 'Đường Nguyễn Thị Định, P. Cát Lái, TP. Thủ Đức'},
            {'key': 'contact_person', 'header': 'Người Phụ Trách / Liên Hệ', 'required': False, 'type': 'str', 'sample': 'Trực ban Cảng'},
            {'key': 'contact_phone', 'header': 'Số Điện Thoại Liên Hệ', 'required': False, 'type': 'str', 'sample': '028.3742.3456'},
            {'key': 'notes', 'header': 'Ghi Chú Vận Hành', 'required': False, 'type': 'str', 'sample': 'Cửa A, B vào nhận cont ca 1-2'},
            {'key': 'is_active', 'header': 'Trạng Thái', 'required': False, 'type': 'bool', 'sample': 'Hoạt động'}
        ],
        'samples': [
            ['CANG_CAT_LAI', 'Cảng Cát Lái - Tân Cảng Sài Gòn', 'Cảng Biển', 'TP. Hồ Chí Minh', 'Đường Nguyễn Thị Định, P. Cát Lái, TP. Thủ Đức', 'Trực ban Cảng', '028.3742.3456', 'Nhận cont e-Port', 'Hoạt động'],
            ['ICD_SONG_THAN', 'Cảng Cạn ICD Sóng Thần', 'Cảng Cạn (ICD)', 'Bình Dương', 'Đường ĐT743, KCN Sóng Thần 1, Dĩ An', 'Đ/đ Sóng Thần', '0274.379.1122', 'Kiểm tra hạ rỗng', 'Hoạt động'],
            ['KHO_TBS_TAN_VAN', 'Kho TBS Logistics Tân Vạn', 'Kho Hàng / Nhà Máy', 'Bình Dương', 'Khu phố Ngãi Thắng, P. Bình Thắng, Dĩ An', 'Thủ kho A', '0903.111.222', 'Cần đăng ký trước 2h', 'Hoạt động'],
            ['DEPOT_SOLOG', 'Depot Solog Libra Mỹ Phước Tân Vạn', 'Bãi Rỗng / Depot', 'Bình Dương', 'Đường Mỹ Phước - Tân Vạn, Thuận An', 'Điều hành bãi', '0912.333.444', 'Cấp vỏ hãng tàu ONE, SITC', 'Hoạt động']
        ]
    },

    'containers': {
        'title': 'DANH MỤC QUY CÁCH CONTAINER & THÙNG XE TẢI',
        'sheet_name': 'QuyCach_Cont_Xe',
        'filename': 'Mau_Nhap_Quy_Cach_Container.xlsx',
        'model': ContainerType,
        'unique_fields': ['code'],
        'columns': [
            {'key': 'code', 'header': 'Mã Quy Cách (*)', 'required': True, 'type': 'str', 'sample': '40HC'},
            {'key': 'name', 'header': 'Tên Loại Cont / Thùng (*)', 'required': True, 'type': 'str', 'sample': 'Container 40ft Cao (40HC)'},
            {
                'key': 'category', 'header': 'Phân Loại (*)', 'required': True, 'type': 'choice',
                'sample': 'Container Đường Biển',
                'choices': {
                    'Container Đường Biển': ContainerCategory.CONTAINER, 'Container': ContainerCategory.CONTAINER, 'CONTAINER': ContainerCategory.CONTAINER,
                    'Xe Tải Thùng / Đường Bộ': ContainerCategory.TRUCK, 'Xe Tải': ContainerCategory.TRUCK, 'TRUCK': ContainerCategory.TRUCK
                }
            },
            {'key': 'teu_factor', 'header': 'Hệ Số TEU (20DC=1, 40HC=2)', 'required': False, 'type': 'decimal', 'sample': '2.0'},
            {'key': 'max_payload_kg', 'header': 'Tải Trọng Tối Đa (kg)', 'required': False, 'type': 'int', 'sample': '30480'},
            {'key': 'cbm_capacity', 'header': 'Thể Tích (CBM)', 'required': False, 'type': 'decimal', 'sample': '76.4'},
            {'key': 'is_active', 'header': 'Trạng Thái', 'required': False, 'type': 'bool', 'sample': 'Hoạt động'}
        ],
        'samples': [
            ['20DC', 'Container 20ft Tiêu Chuẩn (20DC)', 'Container Đường Biển', '1.0', '28000', '33.2', 'Hoạt động'],
            ['40DC', 'Container 40ft Thường (40DC/GP)', 'Container Đường Biển', '2.0', '28800', '67.7', 'Hoạt động'],
            ['40HC', 'Container 40ft Cao (40HC/HQ)', 'Container Đường Biển', '2.0', '30480', '76.4', 'Hoạt động'],
            ['45G1', 'Container 45ft Cao (45HC)', 'Container Đường Biển', '2.25', '30480', '86.0', 'Hoạt động'],
            ['XE_TAI_10T', 'Xe Tải Thùng Kín 10 Tấn', 'Xe Tải Thùng / Đường Bộ', '1.5', '10000', '48.0', 'Hoạt động']
        ]
    },

    'expenses': {
        'title': 'DANH MỤC KHOẢN MỤC CHI PHÍ HIỆN TRƯỜNG',
        'sheet_name': 'KhoanMucChi',
        'filename': 'Mau_Nhap_Khoan_Muc_Chi.xlsx',
        'model': ExpenseItem,
        'unique_fields': ['code'],
        'columns': [
            {'key': 'code', 'header': 'Mã Khoản Chi (*)', 'required': True, 'type': 'str', 'sample': 'LIFT_ON'},
            {'key': 'name', 'header': 'Tên Khoản Mục Chi Phí (*)', 'required': True, 'type': 'str', 'sample': 'Phí Nâng Container'},
            {
                'key': 'group_type', 'header': 'Nhóm Chi Phí (*)', 'required': True, 'type': 'choice',
                'sample': 'Nâng Cont',
                'choices': {
                    'Nâng Cont': ExpenseCategoryGroup.LIFT_ON, 'LIFT_ON': ExpenseCategoryGroup.LIFT_ON,
                    'Hạ Cont': ExpenseCategoryGroup.LIFT_OFF, 'LIFT_OFF': ExpenseCategoryGroup.LIFT_OFF,
                    'Vé Cầu Đường / BOT': ExpenseCategoryGroup.TOLL, 'Vé BOT': ExpenseCategoryGroup.TOLL, 'TOLL': ExpenseCategoryGroup.TOLL,
                    'Cược Container': ExpenseCategoryGroup.DEPOSIT, 'DEPOSIT': ExpenseCategoryGroup.DEPOSIT,
                    'Cân Xe': ExpenseCategoryGroup.WEIGHING, 'WEIGHING': ExpenseCategoryGroup.WEIGHING,
                    'Bốc Xếp / Bồi Dưỡng Kho': ExpenseCategoryGroup.LABOR, 'Bốc Xếp': ExpenseCategoryGroup.LABOR, 'LABOR': ExpenseCategoryGroup.LABOR,
                    'Hóa Đơn Điện Tử Cảng': ExpenseCategoryGroup.EINVOICE, 'Hóa Đơn Điện Tử': ExpenseCategoryGroup.EINVOICE, 'EINVOICE': ExpenseCategoryGroup.EINVOICE,
                    'Chi Phí Khác': ExpenseCategoryGroup.OTHER, 'OTHER': ExpenseCategoryGroup.OTHER
                }
            },
            {'key': 'default_amount', 'header': 'Định Mức Tiền Mặc Định (VNĐ)', 'required': False, 'type': 'decimal', 'sample': '650000'},
            {'key': 'requires_invoice', 'header': 'Bắt Buộc Hóa Đơn HĐĐT (Có/Không)', 'required': False, 'type': 'bool', 'sample': 'Có'},
            {'key': 'notes', 'header': 'Ghi Chú Nghiệp Vụ', 'required': False, 'type': 'str', 'sample': 'Theo biên lai e-Port'},
            {'key': 'is_active', 'header': 'Trạng Thái', 'required': False, 'type': 'bool', 'sample': 'Hoạt động'}
        ],
        'samples': [
            ['LIFT_ON', 'Phí Nâng Container 40ft', 'Nâng Cont', '650000', 'Có', 'Áp dụng cảng Cát Lái, VICT', 'Hoạt động'],
            ['LIFT_OFF', 'Phí Hạ Container Rỗng 40ft', 'Hạ Cont', '550000', 'Có', 'Biên lai depot hạ rỗng', 'Hoạt động'],
            ['TOLL_FEE', 'Vé Cầu Đường / Trạm Thu Phí BOT', 'Vé Cầu Đường / BOT', '0', 'Không', 'Theo vé thực tế hành trình', 'Hoạt động'],
            ['CONTAINER_DEPOSIT', 'Tiền Cược Vỏ Container', 'Cược Container', '2000000', 'Có', 'Hoàn cược sau khi hạ rỗng', 'Hoạt động'],
            ['WEIGHING_FEE', 'Phí Cân Xe / Phiếu Cân VGM', 'Cân Xe', '120000', 'Có', 'Phiếu cân bàn', 'Hoạt động'],
            ['LABOR_FEE', 'Bồi Dưỡng Bốc Xếp / Xe Nâng Kho', 'Bốc Xếp / Bồi Dưỡng Kho', '200000', 'Không', 'Chi phí hiện trường', 'Hoạt động']
        ]
    },

    'driver_tariffs': {
        'title': 'DANH MỤC BIỂU PHÍ LƯƠNG CHUYẾN TÀI XẾ',
        'sheet_name': 'LuongChuyen_LaiXe',
        'filename': 'Mau_Nhap_Bieu_Phi_Luong_Chuyen.xlsx',
        'model': DriverSalaryTariff,
        'unique_fields': ['area_group', 'route_name'],
        'columns': [
            {'key': 'area_group', 'header': 'Nhóm Khu Vực Kho (*)', 'required': True, 'type': 'str', 'sample': 'Tây Ninh'},
            {'key': 'route_name', 'header': 'Tên Tuyến / KCN / Nhà Máy (*)', 'required': True, 'type': 'str', 'sample': 'KCN Phước Đông - Gò Dầu'},
            {'key': 'pickup_drop_area', 'header': 'Trục Lấy / Hạ Cont Chuẩn', 'required': False, 'type': 'str', 'sample': 'Cát Lái, SPITC, Sóng Thần, Tân Vạn'},
            {'key': 'estimated_km', 'header': 'Cự Ly Ước Tính (km)', 'required': False, 'type': 'int', 'sample': '70'},
            {'key': 'salary_rate', 'header': 'Mức Lương Chuyến (VNĐ) (*)', 'required': True, 'type': 'decimal', 'sample': '650000'},
            {'key': 'notes', 'header': 'Ghi Chú Điều Kiện Tuyến', 'required': False, 'type': 'str', 'sample': 'Lấy Cái Mép +200k'},
            {'key': 'is_active', 'header': 'Trạng Thái', 'required': False, 'type': 'bool', 'sample': 'Hoạt động'}
        ],
        'samples': [
            ['Tây Ninh', 'KCN Phước Đông - Gò Dầu', 'Cát Lái, SPITC, Sóng Thần, Tân Vạn', '70', '650000', 'Lấy/hạ Cái Mép phụ cấp thêm', 'Hoạt động'],
            ['Tây Ninh', 'KCN Trảng Bàng / KCX Linh Trung 3', 'Cát Lái, SPITC, Sóng Thần, Tân Vạn', '55', '550000', 'Tuyến thường', 'Hoạt động'],
            ['Bình Dương', 'KCN Mỹ Phước 1, 2, 3 - Bến Cát', 'Cát Lái, SPITC, Sóng Thần, Tân Vạn', '50', '500000', 'Tuyến chuẩn', 'Hoạt động'],
            ['Bình Dương', 'KCN VSIP 1 - Thuận An', 'Cát Lái, SPITC, Sóng Thần, Tân Vạn', '30', '380000', 'Tuyến ngắn', 'Hoạt động'],
            ['Đồng Nai', 'KCN Nhơn Trạch 1, 2, 3, 5, 6', 'Cát Lái, SPITC, Sóng Thần, Tân Vạn', '45', '450000', 'Qua phà Cát Lái hoặc cao tốc', 'Hoạt động'],
            ['Long An', 'KCN Thuận Đạo - Bến Lức', 'Cát Lái, SPITC, Sóng Thần, Tân Vạn', '50', '520000', 'Tuyến Long An', 'Hoạt động']
        ]
    },

    'allowances': {
        'title': 'DANH MỤC PHỤ CẤP CẢNG XA & KIỂM HÓA',
        'sheet_name': 'PhuCap_KiemHoa',
        'filename': 'Mau_Nhap_Phu_Cap_Kiem_Hoa.xlsx',
        'model': DriverAllowanceCatalog,
        'unique_fields': ['code'],
        'columns': [
            {'key': 'code', 'header': 'Mã Phụ Cấp (*)', 'required': True, 'type': 'str', 'sample': 'PC_CAI_MEP'},
            {'key': 'name', 'header': 'Tên Khoản Phụ Cấp (*)', 'required': True, 'type': 'str', 'sample': 'Phụ Cấp Cảng Xa Cái Mép - Thị Vải'},
            {
                'key': 'category', 'header': 'Phân Loại (*)', 'required': True, 'type': 'choice',
                'sample': 'Phụ Thêm Cảng Xa',
                'choices': {
                    'Phụ Thêm Cảng Xa': AllowanceCategory.PORT, 'Cảng Xa': AllowanceCategory.PORT, 'PORT': AllowanceCategory.PORT,
                    'Phụ Thu Kiểm Hóa': AllowanceCategory.INSPECTION, 'Kiểm Hóa': AllowanceCategory.INSPECTION, 'INSPECTION': AllowanceCategory.INSPECTION,
                    'Phụ Cấp Tác Nghiệp Đặc Thù': AllowanceCategory.OPERATION, 'Tác Nghiệp': AllowanceCategory.OPERATION, 'OPERATION': AllowanceCategory.OPERATION
                }
            },
            {'key': 'amount', 'header': 'Mức Tiền Phụ Cấp (VNĐ) (*)', 'required': True, 'type': 'decimal', 'sample': '300000'},
            {'key': 'notes', 'header': 'Điều Kiện Áp Dụng', 'required': False, 'type': 'str', 'sample': 'Lấy hoặc hạ cont tại cụm cảng Cái Mép'},
            {'key': 'is_active', 'header': 'Trạng Thái', 'required': False, 'type': 'bool', 'sample': 'Hoạt động'}
        ],
        'samples': [
            ['PC_CAI_MEP', 'Phụ Cấp Cảng Xa Cái Mép - Thị Vải', 'Phụ Thêm Cảng Xa', '300000', 'Lấy/hạ tại cảng Cái Mép, SSIT, CMIT, TCIT', 'Hoạt động'],
            ['PC_HIEP_PHUOC', 'Phụ Cấp Cảng Hiệp Phước (Nhà Bè)', 'Phụ Thêm Cảng Xa', '150000', 'Lấy/hạ tại Tân Cảng Hiệp Phước', 'Hoạt động'],
            ['PC_KIEM_HOA_HQ', 'Phụ Cấp Kiểm Hóa Hải Quan', 'Phụ Thu Kiểm Hóa', '200000', 'Tài xế kéo xe phục vụ soi chiếu / mở cont kiểm hóa', 'Hoạt động'],
            ['PC_CAT_KEO', 'Phụ Cấp Đảo Moóc / Cắt Kéo', 'Phụ Cấp Tác Nghiệp Đặc Thù', '100000', 'Để moóc tại kho khách rồi quay lại kéo sau', 'Hoạt động']
        ]
    },

    'customers': {
        'title': 'DANH MỤC KHÁCH HÀNG & CHỦ HÀNG DOANH NGHIỆP',
        'sheet_name': 'KhachHang',
        'filename': 'Mau_Nhap_Khach_Hang.xlsx',
        'model': Customer,
        'unique_fields': ['code'],
        'columns': [
            {'key': 'code', 'header': 'Mã Khách Hàng (*)', 'required': True, 'type': 'str', 'sample': 'KH_SAMVINA'},
            {'key': 'name', 'header': 'Tên Đầy Đủ Doanh Nghiệp (*)', 'required': True, 'type': 'str', 'sample': 'CÔNG TY TNHH SAMVINA LOGISTICS'},
            {'key': 'short_name', 'header': 'Tên Viết Tắt / Giao Dịch', 'required': False, 'type': 'str', 'sample': 'SAMVINA'},
            {'key': 'customer_group', 'header': 'Nhóm Khách Hàng', 'required': False, 'type': 'str', 'sample': 'COMMERCIAL_TRADING'},
            {'key': 'tax_code', 'header': 'Mã Số Thuế', 'required': False, 'type': 'str', 'sample': '0315897645'},
            {'key': 'address', 'header': 'Địa Chỉ Trụ Sở (*)', 'required': True, 'type': 'str', 'sample': 'Tòa nhà Pearl Plaza, 561A Điện Biên Phủ, P. 25, Bình Thạnh, TP.HCM'},
            {'key': 'company_email', 'header': 'Email Công Ty (HĐĐT/Công Nợ)', 'required': False, 'type': 'str', 'sample': 'ketoan@samvina.vn'},
            {'key': 'contact_person', 'header': 'Người Phụ Trách', 'required': False, 'type': 'str', 'sample': 'Nguyễn Văn Minh'},
            {'key': 'contact_title', 'header': 'Chức Vụ Người Liên Hệ', 'required': False, 'type': 'str', 'sample': 'Trưởng phòng XNK'},
            {'key': 'contact_email', 'header': 'Email Người Liên Hệ', 'required': False, 'type': 'str', 'sample': 'minh.nguyen@samvina.vn'},
            {'key': 'phone', 'header': 'Số Điện Thoại / Hotline', 'required': False, 'type': 'str', 'sample': '0909.123.456'},
            {'key': 'bank_account_number', 'header': 'Số Tài Khoản Bank', 'required': False, 'type': 'str', 'sample': '0123456789'},
            {'key': 'bank_name', 'header': 'Tên Ngân Hàng', 'required': False, 'type': 'str', 'sample': 'Vietcombank'},
            {'key': 'bank_branch', 'header': 'Chi Nhánh Ngân Hàng', 'required': False, 'type': 'str', 'sample': 'CN Tân Bình, TP.HCM'},
            {'key': 'payment_term_days', 'header': 'Kỳ Hạn Thanh Toán (Ngày)', 'required': False, 'type': 'int', 'sample': 30},
            {'key': 'credit_limit', 'header': 'Hạn Mức Nợ (VNĐ)', 'required': False, 'type': 'int', 'sample': 100000000},
            {'key': 'notes', 'header': 'Ghi Chú Công Nợ / Hợp Đồng', 'required': False, 'type': 'str', 'sample': 'Hạn thanh toán 30 ngày từ ngày xuất hóa đơn'}
        ],
        'samples': [
            ['KH_SAMVINA', 'CÔNG TY TNHH SAMVINA LOGISTICS', 'SAMVINA', 'COMMERCIAL_TRADING', '0315897645', 'Tòa nhà Pearl Plaza, 561A Điện Biên Phủ, P. 25, Bình Thạnh, TP.HCM', 'ketoan@samvina.vn', 'Nguyễn Văn Minh', 'Trưởng phòng XNK', 'minh.nguyen@samvina.vn', '0909.123.456', '0123456789', 'Vietcombank', 'CN Tân Bình', 30, 100000000, 'Công nợ 30 ngày'],
            ['KH_VICACO', 'CÔNG TY CỔ PHẦN VICACO CONTAINER', 'VICACO', 'FORWARDER_LOGISTICS', '0304561234', '12 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM', 'accountant@vicaco.vn', 'Trần Thị Thu', 'Điều phối viên', 'thu.tran@vicaco.vn', '0988.765.432', '9876543210', 'Techcombank', 'CN Sài Gòn', 45, 200000000, 'Hợp đồng FCL nguyên chuyến'],
            ['KH_WCA_TTI', 'CÔNG TY TNHH TECHTRONIC INDUSTRIES VN (TTI)', 'TTI VIỆT NAM', 'FDI_ENTERPRISE', '3702891234', 'KCN Đại Đăng, TP. Thủ Dầu Một, Bình Dương', 'ap@tti-group.com', 'Mr. David Lee', 'Supply Chain Manager', 'david.lee@tti-group.com', '0274.389.9999', '1122334455', 'HSBC', 'CN TP.HCM', 60, 500000000, 'Cần tài xế có thẻ an toàn']
        ]
    },

    'tariffs': {
        'title': 'DANH MỤC BIỂU CƯỚC VẬN CHUYỂN KHÁCH HÀNG',
        'sheet_name': 'BieuCuoc_KhachHang',
        'filename': 'Mau_Nhap_Bieu_Cuoc_Khach_Hang.xlsx',
        'model': RouteTariff,
        'unique_fields': ['customer_code', 'pickup_location', 'delivery_location', 'container_size'],
        'columns': [
            {'key': 'customer_code', 'header': 'Mã Hoặc Tên Khách Hàng (*)', 'required': True, 'type': 'str', 'sample': 'KH_SAMVINA'},
            {'key': 'origin_zone', 'header': 'Khu Vực Xuất Phát', 'required': False, 'type': 'str', 'sample': 'Cát Lái'},
            {'key': 'destination_zone', 'header': 'Khu Vực Giao Hàng', 'required': False, 'type': 'str', 'sample': 'Tây Ninh'},
            {'key': 'pickup_location', 'header': 'Nơi Lấy Cont (*)', 'required': True, 'type': 'str', 'sample': 'Cảng Cát Lái'},
            {'key': 'delivery_location', 'header': 'Kho Giao Nhận / Nhà Máy (*)', 'required': True, 'type': 'str', 'sample': 'KCN Phước Đông'},
            {'key': 'dropoff_location', 'header': 'Nơi Hạ Cont Rỗng / Bãi', 'required': False, 'type': 'str', 'sample': 'Depot Solog Tân Vạn'},
            {'key': 'container_size', 'header': 'Quy Cách Cont (20DC, 40HC...) (*)', 'required': True, 'type': 'str', 'sample': '40HC'},
            {'key': 'freight_price', 'header': 'Đơn Giá Cước Doanh Thu (VNĐ) (*)', 'required': True, 'type': 'decimal', 'sample': '4200000'},
            {'key': 'driver_trip_pay', 'header': 'Định Mức Lương Tài Xế (VNĐ)', 'required': False, 'type': 'decimal', 'sample': '650000'},
            {'key': 'toll_standard_fee', 'header': 'Định Mức BOT Tuyến (VNĐ)', 'required': False, 'type': 'decimal', 'sample': '180000'},
            {'key': 'estimated_km', 'header': 'Cự Ly Ước Tính (km)', 'required': False, 'type': 'int', 'sample': '70'}
        ],
        'samples': [
            ['KH_SAMVINA', 'Cát Lái', 'Tây Ninh', 'Cảng Cát Lái', 'KCN Phước Đông', 'Depot Solog Tân Vạn', '40HC', '4200000', '650000', '180000', '70'],
            ['KH_SAMVINA', 'Cát Lái', 'Tây Ninh', 'Cảng Cát Lái', 'KCN Phước Đông', 'Depot Cát Lái', '20DC', '3300000', '550000', '180000', '70'],
            ['KH_VICACO', 'Cái Mép', 'Bình Dương', 'Cảng Cái Mép', 'KCN VSIP 1', 'ICD Sóng Thần', '40HC', '5100000', '750000', '260000', '85'],
            ['KH_WCA_TTI', 'Cát Lái', 'Bình Dương', 'Cảng Cát Lái', 'KCN Đại Đăng', 'Depot TBS Tân Vạn', '40HC', '3500000', '480000', '120000', '40']
        ]
    },

    'vehicles': {
        'title': 'DANH MỤC PHƯƠNG TIỆN (ĐẦU KÉO & XE TẢI)',
        'sheet_name': 'DoiXe_PhuongTien',
        'filename': 'Mau_Nhap_Phuong_Tien_Xe.xlsx',
        'model': Vehicle,
        'unique_fields': ['license_plate'],
        'columns': [
            {'key': 'license_plate', 'header': 'Biển Số Xe (*)', 'required': True, 'type': 'str', 'sample': '51C-123.45'},
            {
                'key': 'vehicle_type', 'header': 'Loại Phương Tiện (*)', 'required': True, 'type': 'choice',
                'sample': 'Đầu kéo Container',
                'choices': {
                    'Đầu kéo Container': VehicleType.TRACTOR, 'Đầu kéo': VehicleType.TRACTOR, 'TRACTOR': VehicleType.TRACTOR,
                    'Xe tải 10 Tấn': VehicleType.TRUCK_10T, 'TRUCK_10T': VehicleType.TRUCK_10T,
                    'Xe tải 2 Tấn': VehicleType.TRUCK_2T, 'TRUCK_2T': VehicleType.TRUCK_2T,
                    'Xe tải nhỏ / Van': VehicleType.VAN, 'VAN': VehicleType.VAN
                }
            },
            {
                'key': 'ownership_type', 'header': 'Nguồn Sở Hữu (*)', 'required': True, 'type': 'choice',
                'sample': 'Xe nhà (Đội xe công ty)',
                'choices': {
                    'Xe nhà (Đội xe công ty)': VehicleOwnership.OWNED, 'Xe nhà': VehicleOwnership.OWNED, 'OWNED': VehicleOwnership.OWNED,
                    'Xe bạn (Thuê ngoài / 3PL)': VehicleOwnership.SUBCONTRACTOR, 'Xe bạn': VehicleOwnership.SUBCONTRACTOR, 'SUBCONTRACTOR': VehicleOwnership.SUBCONTRACTOR
                }
            },
            {'key': 'subcontractor_code', 'header': 'Mã Nhà Xe Thầu Phụ (Nếu là xe ngoài)', 'required': False, 'type': 'str', 'sample': ''},
            {'key': 'brand', 'header': 'Hãng Sản Xuất', 'required': False, 'type': 'str', 'sample': 'Freightliner Cascadia'},
            {'key': 'payload_capacity_kg', 'header': 'Tải Trọng Cho Phép (kg)', 'required': False, 'type': 'int', 'sample': '30000'},
            {'key': 'registration_expiry', 'header': 'Hạn Đăng Kiểm (DD/MM/YYYY)', 'required': False, 'type': 'date', 'sample': '31/12/2026'},
            {'key': 'insurance_expiry', 'header': 'Hạn Bảo Hiểm TNDS (DD/MM/YYYY)', 'required': False, 'type': 'date', 'sample': '31/12/2026'},
            {
                'key': 'status', 'header': 'Trạng Thái Hoạt Động', 'required': False, 'type': 'choice',
                'sample': 'Nằm bãi (Chờ việc)',
                'choices': {
                    'Đang chạy (Có hàng)': VehicleStatus.ACTIVE, 'Đang chạy': VehicleStatus.ACTIVE, 'ACTIVE': VehicleStatus.ACTIVE,
                    'Nằm bãi (Chờ việc)': VehicleStatus.IDLE, 'Nằm bãi': VehicleStatus.IDLE, 'IDLE': VehicleStatus.IDLE,
                    'Hư hỏng / Bảo trì': VehicleStatus.MAINTENANCE, 'Bảo trì': VehicleStatus.MAINTENANCE, 'MAINTENANCE': VehicleStatus.MAINTENANCE,
                    'Ngừng sử dụng': VehicleStatus.DECOMMISSIONED, 'DECOMMISSIONED': VehicleStatus.DECOMMISSIONED
                }
            }
        ],
        'samples': [
            ['51C-393.29', 'Đầu kéo Container', 'Xe nhà (Đội xe công ty)', '', 'Freightliner Cascadia', '30000', '15/12/2026', '20/12/2026', 'Nằm bãi (Chờ việc)'],
            ['50H-112.45', 'Đầu kéo Container', 'Xe nhà (Đội xe công ty)', '', 'Hyundai Xcient', '32000', '28/11/2026', '30/11/2026', 'Nằm bãi (Chờ việc)'],
            ['60C-556.78', 'Đầu kéo Container', 'Xe bạn (Thuê ngoài / 3PL)', 'THAU_PHU_HOANG_NAM', 'International Prostar', '30000', '05/01/2027', '10/01/2027', 'Nằm bãi (Chờ việc)'],
            ['51D-889.01', 'Xe tải 10 Tấn', 'Xe nhà (Đội xe công ty)', '', 'Hino 500 Series', '10000', '10/10/2026', '15/10/2026', 'Nằm bãi (Chờ việc)']
        ]
    },

    'trailers': {
        'title': 'DANH MỤC RƠ-MOÓC CHỞ CONTAINER',
        'sheet_name': 'RoMooc',
        'filename': 'Mau_Nhap_Ro_Mooc.xlsx',
        'model': Trailer,
        'unique_fields': ['license_plate'],
        'columns': [
            {'key': 'license_plate', 'header': 'Biển Số Rơ-Moóc (*)', 'required': True, 'type': 'str', 'sample': '51R-444.22'},
            {'key': 'trailer_type', 'header': 'Quy Cách / Loại Moóc (*)', 'required': True, 'type': 'str', 'sample': 'Moóc xương 40ft (3 trục)'},
            {'key': 'brand', 'header': 'Hãng Sản Xuất', 'required': False, 'type': 'str', 'sample': 'CIMC'},
            {'key': 'payload_capacity_kg', 'header': 'Tải Trọng Cho Phép (kg)', 'required': False, 'type': 'int', 'sample': '32500'},
            {'key': 'registration_expiry', 'header': 'Hạn Đăng Kiểm (DD/MM/YYYY)', 'required': False, 'type': 'date', 'sample': '15/11/2026'},
            {'key': 'status', 'header': 'Trạng Thái', 'required': False, 'type': 'str', 'sample': 'Nằm bãi'}
        ],
        'samples': [
            ['51R-444.22', 'Moóc xương 40ft (3 trục)', 'CIMC', '32500', '15/11/2026', 'Nằm bãi'],
            ['51R-123.88', 'Moóc cổ cò 40ft (chở cont HC)', 'Tân Thanh', '31800', '20/12/2026', 'Nằm bãi'],
            ['50R-055.67', 'Moóc xương 20ft (chở 1 cont 20 nặng)', 'Doosung', '33000', '10/01/2027', 'Nằm bãi']
        ]
    },

    'shipping_lines': {
        'title': 'DANH MỤC HÃNG TÀU BIỂN QUỐC TẾ & NỘI ĐỊA',
        'sheet_name': 'HangTau',
        'filename': 'Mau_Nhap_Hang_Tau.xlsx',
        'model': ShippingLine,
        'unique_fields': ['code'],
        'columns': [
            {'key': 'code', 'header': 'Mã Hãng Tàu (*)', 'required': True, 'type': 'str', 'sample': 'MAEU'},
            {'key': 'name', 'header': 'Tên Đầy Đủ Hãng Vận Chuyển (*)', 'required': True, 'type': 'str', 'sample': 'Maersk Line A/S'},
            {'key': 'contact_phone', 'header': 'Hotline CSKH / Cấp Cont', 'required': False, 'type': 'str', 'sample': '028.3823.8566'},
            {'key': 'contact_email', 'header': 'Email Tiếp Nhận Lệnh', 'required': False, 'type': 'str', 'sample': 'vnmcsv@maersk.com'},
            {'key': 'website', 'header': 'Cổng Tra Cứu / Lệnh Điện Tử (e-DO)', 'required': False, 'type': 'str', 'sample': 'https://maersk.com'},
            {'key': 'free_dem_days', 'header': 'Số Ngày Miễn Phí Lưu Bãi (DEM)', 'required': False, 'type': 'int', 'sample': '7'},
            {'key': 'free_det_days', 'header': 'Số Ngày Miễn Phí Lưu Vỏ (DET)', 'required': False, 'type': 'int', 'sample': '5'},
            {'key': 'notes', 'header': 'Ghi Chú Điều Kiện Cấp Cont / Hạ Rỗng', 'required': False, 'type': 'str', 'sample': 'Cấp cont sạch xuất khẩu'},
            {'key': 'is_active', 'header': 'Trạng Thái', 'required': False, 'type': 'bool', 'sample': 'Hoạt động'}
        ],
        'samples': [
            ['MAEU', 'Maersk Line A/S', '028.3823.8566', 'vnmcsv@maersk.com', 'https://maersk.com', '7', '5', 'Cấp vỏ tại Cát Lái hoặc ICD Tân Cảng', 'Hoạt động'],
            ['ONE', 'Ocean Network Express (ONE)', '028.4458.1111', 'vn.cs@one-line.com', 'https://one-line.com', '7', '5', 'Lệnh e-DO qua Tân Cảng e-Port', 'Hoạt động'],
            ['COSCO', 'COSCO Shipping Lines (Vietnam)', '028.3829.4567', 'cs.sgn@coscon.com', 'https://lines.coscoshipping.com', '7', '7', 'Lưu ý kiểm tra phí vệ sinh vỏ', 'Hoạt động'],
            ['SITC', 'SITC Container Lines', '028.5404.7415', 'cs@sitc.vn', 'https://sitc.vn', '5', '5', 'Hạ rỗng bãi Solog Libra', 'Hoạt động'],
            ['CMA', 'CMA CGM Vietnam', '028.3914.8400', 'sgn.genmbox@cma-cgm.com', 'https://cma-cgm.com', '7', '5', 'Yêu cầu kiểm tra cược cont', 'Hoạt động']
        ]
    },

    'subcontractors': {
        'title': 'DANH MỤC ĐỐI TÁC / NHÀ XE THẦU PHỤ & NHÀ CUNG CẤP',
        'sheet_name': 'DoiTac_NhaCungCap',
        'filename': 'Mau_Nhap_Doi_Tac_Nha_Cung_Cap.xlsx',
        'model': Subcontractor,
        'unique_fields': ['code'],
        'columns': [
            {'key': 'partner_type', 'header': 'Loại Đối Tác (CARRIER/GARAGE/SUPPLIER)', 'required': False, 'type': 'str', 'sample': 'CARRIER'},
            {'key': 'code', 'header': 'Mã Đối Tác (*: 3PL[STT], GAR[STT], SPL[STT])', 'required': False, 'type': 'str', 'sample': '3PL001'},
            {'key': 'short_name', 'header': 'Tên Viết Tắt', 'required': False, 'type': 'str', 'sample': 'HOANGNAM'},
            {'key': 'name', 'header': 'Tên Doanh Nghiệp / Đơn Vị (*)', 'required': True, 'type': 'str', 'sample': 'Công Ty TNHH Vận Tải Hoàng Nam'},
            {'key': 'tax_code', 'header': 'Mã Số Thuế', 'required': False, 'type': 'str', 'sample': '0316789123'},
            {'key': 'contact_person', 'header': 'Người Điều Xe / Phụ Trách', 'required': False, 'type': 'str', 'sample': 'Nguyễn Hoàng Nam'},
            {'key': 'phone', 'header': 'Số Điện Thoại Điều Xe (*)', 'required': True, 'type': 'str', 'sample': '0908.555.777'},
            {'key': 'address', 'header': 'Địa Chỉ Công Ty', 'required': False, 'type': 'str', 'sample': 'Số 45 QL1A, P. Linh Trung, TP. Thủ Đức'},
            {'key': 'yard_address', 'header': 'Địa Chỉ Kho / Bãi Xe', 'required': False, 'type': 'str', 'sample': 'Bãi xe Suối Tiên, QL1A, TP. Thủ Đức'},
            {'key': 'bank_account_number', 'header': 'Số Tài Khoản Ngân Hàng', 'required': False, 'type': 'str', 'sample': '1903555888999'},
            {'key': 'bank_name', 'header': 'Tên Ngân Hàng Thụ Hưởng', 'required': False, 'type': 'str', 'sample': 'Techcombank Chi nhánh Sài Gòn'},
            {'key': 'bank_account_holder', 'header': 'Chủ Tài Khoản Ngân Hàng', 'required': False, 'type': 'str', 'sample': 'CTY TNHH VT HOANG NAM'},
            {'key': 'notes', 'header': 'Ghi Chú', 'required': False, 'type': 'str', 'sample': 'Nhà xe vận tải 3PL tuyến Cái Mép - Bình Dương'},
            {'key': 'is_active', 'header': 'Trạng Thái', 'required': False, 'type': 'bool', 'sample': 'Hoạt động'}
        ],
        'samples': [
            ['CARRIER', '3PL001', 'HOANGNAM', 'Công Ty TNHH Vận Tải Hoàng Nam', '0316789123', 'Nguyễn Hoàng Nam', '0908.555.777', 'Số 45 QL1A, Linh Trung, Thủ Đức', 'Bãi xe Suối Tiên, Thủ Đức', '1903555888999', 'Techcombank', 'CTY TNHH VT HOANG NAM', 'Nhà xe vận tải 3PL tuyến Cái Mép - Bình Dương', 'Hoạt động'],
            ['GARAGE', 'GAR001', 'AUTOFAST', 'Gara Sửa Chữa & Bảo Dưỡng Auto Fast', '0317890456', 'Trần Minh Thư', '0918.222.333', 'KCN Sóng Thần 2, Dĩ An, Bình Dương', 'Trạm dịch vụ KCN Sóng Thần', '0441000123456', 'Vietcombank', 'GARA AUTO FAST', 'Gara sửa chữa máy gầm, điện lạnh đầu kéo', 'Hoạt động'],
            ['SUPPLIER', 'SPL001', 'MINHPHAT', 'Công Ty Cung Cấp Vỏ Xe & Phụ Tùng Minh Phát', '0319888777', 'Lê Minh Phát', '0933.888.999', '120 Xa Lộ Hà Nội, TP. Thủ Đức', '', '0071000999888', 'MB Bank', 'CTY PHU TUNG MINH PHAT', 'Nhà cung cấp lốp xe Bridgestone, dầu nhớt Castrol', 'Hoạt động']
        ]
    },

    'opening_balance': {
        'title': 'DANH MỤC SỐ DƯ ĐẦU KỲ KẾ TOÁN (SỔ QUỸ & CÔNG NỢ)',
        'sheet_name': 'SoDu_DauKy',
        'filename': 'Mau_Nhap_So_Du_Dau_Ky.xlsx',
        'model': OpeningBalance,
        'unique_fields': ['account_code', 'entity_name', 'opening_date'],
        'columns': [
            {'key': 'account_code', 'header': 'Tài Khoản Kế Toán (1111, 1121, 131, 141, 331, 334...) (*)', 'required': True, 'type': 'str', 'sample': '1111'},
            {'key': 'account_name', 'header': 'Tên Tài Khoản', 'required': False, 'type': 'str', 'sample': 'Tiền mặt tại quỹ'},
            {'key': 'entity_name', 'header': 'Tên Đối Tượng / Tên Quỹ (*)', 'required': True, 'type': 'str', 'sample': 'Quỹ Tiền Mặt Triền Võ'},
            {'key': 'entity_code', 'header': 'Mã Đối Tượng (Mã KH / Mã Nhà Xe / Mã TX)', 'required': False, 'type': 'str', 'sample': 'QUY_TM'},
            {
                'key': 'partner_type', 'header': 'Phân Loại Đối Tượng', 'required': False, 'type': 'str',
                'sample': 'Nội bộ công ty'
            },
            {'key': 'opening_date', 'header': 'Ngày Chốt Số Dư (DD/MM/YYYY) (*)', 'required': True, 'type': 'date', 'sample': '01/01/2026'},
            {'key': 'debit_amount', 'header': 'Dư Nợ Đầu Kỳ (VNĐ)', 'required': False, 'type': 'decimal', 'sample': '50000000'},
            {'key': 'credit_amount', 'header': 'Dư Có Đầu Kỳ (VNĐ)', 'required': False, 'type': 'decimal', 'sample': '0'},
            {'key': 'bank_account_number', 'header': 'Số Tài Khoản (Nếu là TK 1121)', 'required': False, 'type': 'str', 'sample': ''},
            {'key': 'bank_name', 'header': 'Tên Ngân Hàng (Nếu là TK 1121)', 'required': False, 'type': 'str', 'sample': ''},
            {'key': 'notes', 'header': 'Diễn Giải Chứng Từ / Biên Bản Chốt', 'required': False, 'type': 'str', 'sample': 'Số dư chốt đầu năm tài chính'}
        ],
        'samples': [
            ['1111', 'Tiền mặt tại quỹ', 'Quỹ Tiền Mặt Điều Vận Triền Võ', 'QUY_TM_CHINH', 'Nội bộ công ty', '01/01/2026', '50000000', '0', '', '', 'Số dư tiền mặt tại két văn phòng'],
            ['1121', 'Tiền gửi Ngân hàng', 'Tài Khoản Techcombank TVL', 'TCB_1903', 'Ngân hàng', '01/01/2026', '250000000', '0', '19030000000001', 'Techcombank Chi nhánh Nam Sài Gòn', 'Số dư tài khoản thanh toán'],
            ['131', 'Phải thu của khách hàng', 'CÔNG TY TNHH SAMVINA LOGISTICS', 'KH_SAMVINA', 'Khách hàng', '01/01/2026', '125000000', '0', '', '', 'Công nợ cước vận tải tháng 12/2025'],
            ['331', 'Phải trả người bán (Thầu phụ)', 'Công Ty TNHH Vận Tải Hoàng Nam', 'THAU_PHU_HOANG_NAM', 'Nhà xe bạn / Thầu phụ 3PL', '01/01/2026', '0', '48000000', '', '', 'Cước thuê ngoài chưa thanh toán']
        ]
    }
}


# --- TEMPLATE GENERATOR ---

def generate_catalog_template(catalog_key):
    """
    Tạo tệp Excel mẫu chuẩn hóa (.xlsx) cho danh mục được chọn,
    kèm tiêu đề thương hiệu BIM, định dạng cột, hướng dẫn chi tiết và dữ liệu mẫu thực tế.
    """
    config = CATALOG_REGISTRY.get(catalog_key)
    if not config:
        raise ValueError(f"Không tìm thấy cấu hình mẫu cho danh mục: '{catalog_key}'")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = config.get('sheet_name', 'MasterData')
    ws.views.sheetView[0].showGridLines = True

    # Palettes (Chuẩn Design Tokens BIM Logistics)
    header_fill = PatternFill(start_color="115E59", end_color="115E59", fill_type="solid") # Teal 800
    sample_fill = PatternFill(start_color="F0FDFA", end_color="F0FDFA", fill_type="solid") # Teal 50
    note_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")   # Slate 50

    title_font = Font(name='Arial', size=13, bold=True, color='0F766E')
    subtitle_font = Font(name='Arial', size=9, italic=True, color='64748B')
    header_font = Font(name='Arial', size=10, bold=True, color='FFFFFF')
    sample_font = Font(name='Arial', size=9, italic=True, color='0F766E')
    body_font = Font(name='Arial', size=9, bold=False, color='1E293B')

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    columns = config['columns']
    num_cols = len(columns)
    last_col_letter = get_column_letter(num_cols)

    # 1. Main Title
    ws.merge_cells(f'A1:{last_col_letter}1')
    ws['A1'].value = f"BIỂU MẪU NHẬP DỮ LIỆU BAN ĐẦU: {config['title']}"
    ws['A1'].font = title_font
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[1].height = 28

    # 2. Subtitle / Note
    ws.merge_cells(f'A2:{last_col_letter}2')
    ws['A2'].value = (
        "Lưu ý: Các cột có dấu (*) là thông tin bắt buộc. "
        "Các dòng màu xanh nhạt bên dưới là DỮ LIỆU MẪU để tham khảo — "
        "hãy xóa các dòng mẫu này hoặc ghi đè bằng dữ liệu thực tế trước khi tải lên hệ thống."
    )
    ws['A2'].font = subtitle_font
    ws['A2'].alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    ws.row_dimensions[2].height = 20

    # 3. Column Headers (Row 4)
    ws.row_dimensions[4].height = 32
    for idx, col in enumerate(columns, 1):
        cell = ws.cell(row=4, column=idx, value=col['header'])
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = thin_border

    # 4. Sample Rows (Rows 5+)
    samples = config.get('samples', [])
    for row_idx, sample_row in enumerate(samples, 5):
        ws.row_dimensions[row_idx].height = 22
        for col_idx, val in enumerate(sample_row, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.fill = sample_fill
            cell.font = sample_font
            cell.border = thin_border
            # Align right for numbers
            if any(term in columns[col_idx-1]['header'] for term in ['(VNĐ)', '(kg)', '(CBM)', 'Cự Ly', 'Số Ngày']):
                cell.alignment = Alignment(horizontal='right', vertical='center')
            elif any(term in columns[col_idx-1]['header'] for term in ['Trạng Thái', 'Phân Loại', 'Mã', 'Biển Số', 'Ngày']):
                cell.alignment = Alignment(horizontal='center', vertical='center')
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center')

    # Auto-fit column widths
    for col_idx, col in enumerate(columns, 1):
        header_len = len(str(col['header']))
        max_sample_len = max([len(str(s[col_idx-1])) for s in samples] + [header_len])
        ws.column_dimensions[get_column_letter(col_idx)].width = max(max_sample_len + 4, 15)

    return wb, config['filename']


# --- EXPORT EXISTING DATA ---

def generate_catalog_data_export(catalog_key):
    """
    Xuất toàn bộ dữ liệu hiện có trong danh mục ra file Excel (.xlsx).
    """
    config = CATALOG_REGISTRY.get(catalog_key)
    if not config:
        raise ValueError(f"Không tìm thấy cấu hình cho danh mục: '{catalog_key}'")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = config.get('sheet_name', 'MasterData')
    ws.views.sheetView[0].showGridLines = True

    header_fill = PatternFill(start_color="115E59", end_color="115E59", fill_type="solid")
    title_font = Font(name='Arial', size=13, bold=True, color='0F766E')
    subtitle_font = Font(name='Arial', size=9, italic=True, color='64748B')
    header_font = Font(name='Arial', size=10, bold=True, color='FFFFFF')
    body_font = Font(name='Arial', size=9, bold=False, color='1E293B')

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    columns = config['columns']
    num_cols = len(columns)
    last_col_letter = get_column_letter(num_cols)

    ws.merge_cells(f'A1:{last_col_letter}1')
    ws['A1'].value = f"DỮ LIỆU HIỆN HÀNH: {config['title']}"
    ws['A1'].font = title_font
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[1].height = 28

    ws.merge_cells(f'A2:{last_col_letter}2')
    ws['A2'].value = f"Ngày xuất: {timezone.now().strftime('%d/%m/%Y %H:%M')} | Hệ Thống Quản Trị Vận Tải Triền Võ (BIM Logistics)"
    ws['A2'].font = subtitle_font
    ws['A2'].alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[2].height = 20

    ws.row_dimensions[4].height = 30
    for idx, col in enumerate(columns, 1):
        cell = ws.cell(row=4, column=idx, value=col['header'])
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = thin_border

    # Query records
    model = config['model']
    if hasattr(model, 'all_objects'):
        qs = model.objects.filter(is_deleted=False)
    else:
        qs = model.objects.all()

    # Pre-fetch if tariffs
    if catalog_key == 'tariffs':
        qs = qs.select_related('customer')
    elif catalog_key == 'vehicles':
        qs = qs.select_related('subcontractor', 'current_driver')

    row_num = 5
    for item in qs:
        ws.row_dimensions[row_num].height = 20
        for col_idx, col in enumerate(columns, 1):
            key = col['key']
            val = ''
            if key == 'customer_code':
                val = getattr(item.customer, 'code', '') or getattr(item.customer, 'name', '')
            elif key == 'subcontractor_code':
                val = getattr(item.subcontractor, 'code', '') if item.subcontractor else ''
            elif hasattr(item, f'get_{key}_display'):
                val = getattr(item, f'get_{key}_display')()
            else:
                val = getattr(item, key, '')

            if isinstance(val, (datetime.date, datetime.datetime)):
                val = val.strftime('%d/%m/%Y')
            elif isinstance(val, bool):
                val = 'Hoạt động' if val else 'Tạm ngưng'
            elif isinstance(val, Decimal):
                val = float(val)

            cell = ws.cell(row=row_num, column=col_idx, value=val)
            cell.font = body_font
            cell.border = thin_border
            if any(term in col['header'] for term in ['(VNĐ)', '(kg)', '(CBM)', 'Cự Ly', 'Số Ngày']):
                cell.alignment = Alignment(horizontal='right', vertical='center')
            elif any(term in col['header'] for term in ['Trạng Thái', 'Phân Loại', 'Mã', 'Biển Số', 'Ngày']):
                cell.alignment = Alignment(horizontal='center', vertical='center')
            else:
                cell.alignment = Alignment(horizontal='left', vertical='center')
        row_num += 1

    for col_idx, col in enumerate(columns, 1):
        ws.column_dimensions[get_column_letter(col_idx)].width = max(len(str(col['header'])) + 4, 16)

    filename = f"Xuat_Du_Lieu_{catalog_key}_{timezone.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return wb, filename


# --- IMPORT PROCESSOR ---

def process_catalog_import(catalog_key, file_obj, update_existing=True, user=None):
    """
    Xử lý đọc và nhập dữ liệu từ tệp Excel vào danh mục hệ thống.
    Hỗ trợ tạo mới, cập nhật nếu đã tồn tại mã, kiểm tra tính hợp lệ và trả về báo cáo chi tiết.
    """
    config = CATALOG_REGISTRY.get(catalog_key)
    if not config:
        return {
            'success': False,
            'message': f"Danh mục '{catalog_key}' không hỗ trợ tính năng nhập Excel.",
            'created_count': 0, 'updated_count': 0, 'skipped_count': 0, 'errors': []
        }

    try:
        wb = openpyxl.load_workbook(file_obj, data_only=True)
    except Exception as e:
        return {
            'success': False,
            'message': f"Không thể đọc file Excel. Vui lòng kiểm tra định dạng tệp (.xlsx): {str(e)}",
            'created_count': 0, 'updated_count': 0, 'skipped_count': 0, 'errors': []
        }

    ws = wb.active
    columns = config['columns']
    model = config['model']

    # Tìm dòng header (thường ở dòng 4 hoặc dòng có chứa tiêu đề cột bắt buộc)
    header_row_idx = None
    col_mapping = {} # col_idx (0-based) -> col_config

    for r_idx, row in enumerate(ws.iter_rows(values_only=True), 1):
        row_strs = [str(c or '').strip().lower() for c in row]
        # Kiểm tra xem dòng này có chứa ít nhất 1 header không
        matched = 0
        current_map = {}
        for c_idx, val in enumerate(row_strs):
            if not val:
                continue
            for col_cfg in columns:
                expected_hdr = col_cfg['header'].lower()
                clean_exp = expected_hdr.replace('(*)', '').strip()
                if clean_exp in val or val in clean_exp:
                    current_map[c_idx] = col_cfg
                    matched += 1
                    break
        if matched >= 1:
            header_row_idx = r_idx
            col_mapping = current_map
            break

    if not header_row_idx or not col_mapping:
        # Fallback: gán theo đúng thứ tự các cột của mẫu (bỏ qua dòng 1-4)
        header_row_idx = 4
        col_mapping = {idx: col for idx, col in enumerate(columns)}

    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors = []

    # Map cache để tra cứu nhanh khi import (tra cứu trên all_objects để không bỏ sót bản ghi đã soft-deleted)
    customers_map = {}
    if catalog_key == 'tariffs':
        cust_mgr = getattr(Customer, 'all_objects', Customer.objects)
        for c in cust_mgr.all():
            customers_map[c.code.strip().upper()] = c
            customers_map[c.name.strip().upper()] = c
            if c.short_name:
                customers_map[c.short_name.strip().upper()] = c

    subcontractors_map = {}
    if catalog_key == 'vehicles':
        sub_mgr = getattr(Subcontractor, 'all_objects', Subcontractor.objects)
        for s in sub_mgr.all():
            subcontractors_map[s.code.strip().upper()] = s
            subcontractors_map[s.name.strip().upper()] = s

    # Bắt đầu duyệt dữ liệu từ dòng sau header
    rows_data = list(ws.iter_rows(values_only=True))[header_row_idx:]

    for row_offset, row in enumerate(rows_data, start=header_row_idx + 1):
        # Bỏ qua dòng trống hoàn toàn
        if not any(row):
            continue

        # Bỏ qua dòng mẫu nếu người dùng chưa xóa
        first_val = str(row[0] or '').strip()
        if first_val in ['Lưu ý:', 'STT', 'Dòng mẫu']:
            continue

        row_data = {}
        row_errors = []

        for c_idx, col_cfg in col_mapping.items():
            if c_idx >= len(row):
                val = None
            else:
                val = row[c_idx]

            key = col_cfg['key']
            col_type = col_cfg['type']
            is_req = col_cfg.get('required', False)

            # Parse theo kiểu dữ liệu
            if key == 'payload_capacity_kg':
                cap, design, disp = parse_payload_input(val)
                parsed = cap
                row_data['design_payload_kg'] = design
                row_data['payload_display'] = disp
            elif col_type == 'str':
                parsed = parse_str(val)
            elif col_type == 'int':
                parsed = parse_int(val)
            elif col_type == 'decimal':
                parsed = parse_decimal(val)
            elif col_type == 'bool':
                parsed = parse_bool(val, default=True)
            elif col_type == 'date':
                parsed = parse_date(val)
            elif col_type == 'choice':
                raw_str = parse_str(val)
                choices_dict = col_cfg.get('choices', {})
                # Tìm exact hoặc case-insensitive
                parsed = choices_dict.get(raw_str)
                if not parsed:
                    for k_c, v_c in choices_dict.items():
                        if k_c.lower() == raw_str.lower():
                            parsed = v_c
                            break
                if not parsed and is_req and raw_str:
                    # Fallback default value from first choice
                    parsed = list(choices_dict.values())[0]
            else:
                parsed = val

            if is_req and (parsed is None or parsed == ''):
                row_errors.append(f"Thiếu thông tin bắt buộc: '{col_cfg['header']}'")

            row_data[key] = parsed

        # Kiểm tra lỗi của dòng
        if row_errors:
            errors.append(f"Dòng {row_offset}: {', '.join(row_errors)}")
            continue

        # Tự động nhận diện và bỏ qua các dòng mẫu chưa được xóa/sửa từ file template
        is_unmodified_sample = False
        for s_row in config.get('samples', []):
            if s_row and len(s_row) > 0:
                s_code = str(s_row[0]).strip().upper()
                cur_code = str(row_data.get(columns[0]['key'], '')).strip().upper()
                if s_code == cur_code:
                    # Nếu trường thứ 2 (thường là Tên) cũng trùng khớp hoàn toàn -> là dòng mẫu
                    if len(s_row) > 1 and len(columns) > 1:
                        s_name = str(s_row[1]).strip().upper()
                        cur_name = str(row_data.get(columns[1]['key'], '')).strip().upper()
                        if s_name == cur_name:
                            is_unmodified_sample = True
                            break
                    else:
                        is_unmodified_sample = True
                        break

        if is_unmodified_sample:
            skipped_count += 1
            continue

        # Xử lý từng dòng trong transaction savepoint riêng biệt để lỗi dòng này không ảnh hưởng đến dòng khác (Defensive PostgreSQL)
        try:
            with transaction.atomic():
                # Xử lý theo từng loại danh mục
                if catalog_key == 'tariffs':
                    cust_code = parse_str(row_data.get('customer_code', '')).upper()
                    cust = customers_map.get(cust_code)
                    if not cust:
                        errors.append(f"Dòng {row_offset}: Không tìm thấy khách hàng với mã/tên '{row_data.get('customer_code')}'")
                        continue

                    lookup_kwargs = {
                        'customer': cust,
                        'pickup_location': row_data.get('pickup_location'),
                        'delivery_location': row_data.get('delivery_location'),
                        'container_size': row_data.get('container_size', '40HC')
                    }
                    tariff_mgr = getattr(RouteTariff, 'all_objects', RouteTariff.objects)
                    existing = tariff_mgr.filter(**lookup_kwargs).first()
                    fields_to_set = {
                        'origin_zone': row_data.get('origin_zone', ''),
                        'destination_zone': row_data.get('destination_zone', ''),
                        'dropoff_location': row_data.get('dropoff_location', ''),
                        'freight_price': row_data.get('freight_price', Decimal('0')),
                        'driver_trip_pay': row_data.get('driver_trip_pay', Decimal('500000')),
                        'toll_standard_fee': row_data.get('toll_standard_fee', Decimal('0')),
                        'estimated_km': row_data.get('estimated_km', 0),
                        'is_deleted': False,
                        'deleted_at': None
                    }
                    if existing:
                        if update_existing:
                            for f_k, f_v in fields_to_set.items():
                                setattr(existing, f_k, f_v)
                            existing.save()
                            updated_count += 1
                        else:
                            skipped_count += 1
                    else:
                        RouteTariff.objects.create(**lookup_kwargs, **fields_to_set)
                        created_count += 1

                elif catalog_key == 'vehicles':
                    sub_code = parse_str(row_data.pop('subcontractor_code', '')).upper()
                    sub = subcontractors_map.get(sub_code) if sub_code else None
                    if sub:
                        row_data['subcontractor'] = sub
                        row_data['ownership_type'] = VehicleOwnership.SUBCONTRACTOR

                    plate = row_data.get('license_plate', '').strip()
                    veh_mgr = getattr(Vehicle, 'all_objects', Vehicle.objects)
                    existing = veh_mgr.filter(license_plate__iexact=plate).first()
                    row_data['is_deleted'] = False
                    row_data['deleted_at'] = None
                    if existing:
                        if update_existing:
                            for f_k, f_v in row_data.items():
                                setattr(existing, f_k, f_v)
                            existing.save()
                            updated_count += 1
                        else:
                            skipped_count += 1
                    else:
                        Vehicle.objects.create(**row_data)
                        created_count += 1

                elif catalog_key == 'driver_tariffs':
                    area = row_data.get('area_group')
                    route = row_data.get('route_name')
                    dt_mgr = getattr(DriverSalaryTariff, 'all_objects', DriverSalaryTariff.objects)
                    existing = dt_mgr.filter(area_group=area, route_name=route).first()
                    row_data['is_deleted'] = False
                    row_data['deleted_at'] = None
                    if existing:
                        if update_existing:
                            for f_k, f_v in row_data.items():
                                setattr(existing, f_k, f_v)
                            existing.save()
                            updated_count += 1
                        else:
                            skipped_count += 1
                    else:
                        DriverSalaryTariff.objects.create(**row_data)
                        created_count += 1

                elif catalog_key == 'opening_balance':
                    acc = row_data.get('account_code', '1111')
                    ent = row_data.get('entity_name', '')
                    op_date = row_data.get('opening_date') or timezone.now().date()
                    ob_mgr = getattr(OpeningBalance, 'all_objects', OpeningBalance.objects)
                    existing = ob_mgr.filter(account_code=acc, entity_name=ent, opening_date=op_date).first()
                    
                    # Tự động gán category & account_name
                    if not row_data.get('account_name'):
                        row_data['account_name'] = ACCOUNT_NAME_MAP.get(acc, 'Tài khoản kế toán')
                    row_data['is_deleted'] = False
                    row_data['deleted_at'] = None
                    
                    deb = row_data.get('debit_amount', Decimal('0'))
                    crd = row_data.get('credit_amount', Decimal('0'))
                    row_data['amount'] = deb if deb > 0 else crd
                    row_data['is_debit'] = deb >= crd

                    if existing:
                        if update_existing:
                            for f_k, f_v in row_data.items():
                                setattr(existing, f_k, f_v)
                            existing.save()
                            updated_count += 1
                        else:
                            skipped_count += 1
                    else:
                        if user and hasattr(user, 'employee'):
                            row_data['created_by'] = user.employee
                        OpeningBalance.objects.create(**row_data)
                        created_count += 1

                else:
                    # Các model có unique field 'code' hoặc 'license_plate' (Customer, Location, ExpenseItem, ContainerType, ShippingLine, Subcontractor, Trailer, Allowance)
                    model_mgr = getattr(model, 'all_objects', model.objects)
                    unique_field = config['unique_fields'][0]
                    # Nếu là đối tác / thầu phụ mà chưa có mã, tự sinh theo phân loại
                    if catalog_key == 'subcontractors':
                        if not row_data.get('code'):
                            row_data['code'] = Subcontractor.generate_next_code(row_data.get('partner_type'))
                        if not row_data.get('short_name'):
                            row_data['short_name'] = row_data.get('code')
                    unique_val = row_data.get(unique_field)
                    existing = model_mgr.filter(**{f"{unique_field}__iexact": unique_val}).first()
                    row_data['is_deleted'] = False
                    row_data['deleted_at'] = None
                    if existing:
                        if update_existing:
                            for f_k, f_v in row_data.items():
                                setattr(existing, f_k, f_v)
                            existing.save()
                            updated_count += 1
                        else:
                            skipped_count += 1
                    else:
                        model.objects.create(**row_data)
                        created_count += 1

        except Exception as e:
            errors.append(f"Dòng {row_offset}: Lỗi lưu dữ liệu: {str(e)}")

    total_success = created_count + updated_count
    msg = f"Đã nhập thành công {total_success} bản ghi ({created_count} tạo mới, {updated_count} cập nhật)."
    if skipped_count > 0:
        msg += f" Bỏ qua {skipped_count} bản ghi trùng/mẫu."
    if errors:
        msg += f" Có {len(errors)} lỗi phát sinh."

    return {
        'success': total_success > 0 or len(errors) == 0,
        'message': msg,
        'created_count': created_count,
        'updated_count': updated_count,
        'skipped_count': skipped_count,
        'error_count': len(errors),
        'errors': errors[:30] # Giới hạn tối đa 30 lỗi hiển thị
    }
