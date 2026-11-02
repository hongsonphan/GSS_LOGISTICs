"""Hệ thống tài khoản theo chế độ kế toán và bảng ánh xạ hạch toán mặc định.

Chế độ hiện hành: TT99/2025/TT-BTC (thay TT200/2014, hiệu lực 01/01/2026) và TT58/2026/TT-BTC (doanh nghiệp siêu nhỏ,
thay TT132/2018, hiệu lực 01/07/2026). TT133/2016 và TT200/2014 giữ lại để công ty đang dùng vẫn xem/hạch toán được.

Mỗi tài khoản: (số hiệu, tên, loại). Loại: A tài sản, L nợ phải trả, E vốn chủ sở hữu, R doanh thu/thu nhập,
X chi phí, Z xác định kết quả. Tài khoản cha được suy ra từ tiền tố số hiệu.
"""

_COMMON = [
    ('111', 'Tiền mặt', 'A'), ('1111', 'Tiền Việt Nam', 'A'),
    ('112', 'Tiền gửi ngân hàng', 'A'), ('1121', 'Tiền Việt Nam', 'A'),
    ('131', 'Phải thu của khách hàng', 'A'),
    ('133', 'Thuế GTGT được khấu trừ', 'A'), ('1331', 'Thuế GTGT được khấu trừ của hàng hóa, dịch vụ', 'A'),
    ('138', 'Phải thu khác', 'A'), ('1388', 'Phải thu khác', 'A'),
    ('141', 'Tạm ứng', 'A'),
    ('152', 'Nguyên liệu, vật liệu', 'A'),
    ('153', 'Công cụ, dụng cụ', 'A'),
    ('154', 'Chi phí sản xuất, kinh doanh dở dang', 'A'),
    ('211', 'Tài sản cố định', 'A'),
    ('214', 'Hao mòn tài sản cố định', 'A'),
    ('242', 'Chi phí trả trước', 'A'),
    ('331', 'Phải trả cho người bán', 'L'),
    ('333', 'Thuế và các khoản phải nộp Nhà nước', 'L'),
    ('3331', 'Thuế giá trị gia tăng phải nộp', 'L'), ('33311', 'Thuế GTGT đầu ra', 'L'),
    ('3334', 'Thuế thu nhập doanh nghiệp', 'L'), ('3335', 'Thuế thu nhập cá nhân', 'L'),
    ('334', 'Phải trả người lao động', 'L'),
    ('335', 'Chi phí phải trả', 'L'),
    ('338', 'Phải trả, phải nộp khác', 'L'),
    ('3382', 'Kinh phí công đoàn', 'L'), ('3383', 'Bảo hiểm xã hội', 'L'), ('3384', 'Bảo hiểm y tế', 'L'),
    ('3388', 'Phải trả, phải nộp khác', 'L'),
    ('341', 'Vay và nợ thuê tài chính', 'L'),
    ('411', 'Vốn đầu tư của chủ sở hữu', 'E'),
    ('421', 'Lợi nhuận sau thuế chưa phân phối', 'E'),
    ('511', 'Doanh thu bán hàng và cung cấp dịch vụ', 'R'), ('5113', 'Doanh thu cung cấp dịch vụ', 'R'),
    ('515', 'Doanh thu hoạt động tài chính', 'R'),
    ('632', 'Giá vốn hàng bán', 'X'),
    ('635', 'Chi phí tài chính', 'X'),
    ('711', 'Thu nhập khác', 'R'),
    ('811', 'Chi phí khác', 'X'),
    ('821', 'Chi phí thuế thu nhập doanh nghiệp', 'X'),
    ('911', 'Xác định kết quả kinh doanh', 'Z'),
]

# TT99/2025/TT-BTC, Phụ lục II. Số hiệu đối chiếu với Phụ lục II; so với TT200: bỏ 161, 417, 441, 461, 466, 611, 631 và 3385,
# thêm 215 (tài sản sinh học), 332 (phải trả cổ tức, lợi nhuận), 6275, 82111/82112; 111, 511 không còn tài khoản cấp 2 nên
# tiền mặt/tiền gửi/doanh thu hạch toán thẳng vào 111/112/511; bảo hiểm thất nghiệp ở 3386.
# Đổi tên: 112 "Tiền gửi không kỳ hạn", 242 "Chi phí chờ phân bổ", 244 "Ký quỹ, ký cược", 3387 "Doanh thu chờ phân bổ".
_TT99 = [
    ('111', 'Tiền mặt', 'A'),
    ('112', 'Tiền gửi không kỳ hạn', 'A'),
    ('131', 'Phải thu của khách hàng', 'A'),
    ('133', 'Thuế GTGT được khấu trừ', 'A'),
    ('1331', 'Thuế GTGT được khấu trừ của hàng hóa, dịch vụ', 'A'),
    ('1332', 'Thuế GTGT được khấu trừ của TSCĐ', 'A'),
    ('138', 'Phải thu khác', 'A'), ('1381', 'Tài sản thiếu chờ xử lý', 'A'), ('1388', 'Phải thu khác', 'A'),
    ('141', 'Tạm ứng', 'A'),
    ('152', 'Nguyên liệu, vật liệu', 'A'),
    ('153', 'Công cụ, dụng cụ', 'A'),
    ('154', 'Chi phí sản xuất, kinh doanh dở dang', 'A'),
    ('211', 'Tài sản cố định hữu hình', 'A'),
    ('214', 'Hao mòn tài sản cố định', 'A'),
    ('242', 'Chi phí chờ phân bổ', 'A'),
    ('244', 'Ký quỹ, ký cược', 'A'),
    ('331', 'Phải trả cho người bán', 'L'),
    ('332', 'Phải trả cổ tức, lợi nhuận', 'L'),
    ('333', 'Thuế và các khoản phải nộp Nhà nước', 'L'),
    ('3331', 'Thuế giá trị gia tăng phải nộp', 'L'), ('33311', 'Thuế GTGT đầu ra', 'L'),
    ('3334', 'Thuế thu nhập doanh nghiệp', 'L'), ('3335', 'Thuế thu nhập cá nhân', 'L'),
    ('334', 'Phải trả người lao động', 'L'),
    ('335', 'Chi phí phải trả', 'L'),
    ('338', 'Phải trả, phải nộp khác', 'L'),
    ('3382', 'Kinh phí công đoàn', 'L'), ('3383', 'Bảo hiểm xã hội', 'L'), ('3384', 'Bảo hiểm y tế', 'L'),
    ('3386', 'Bảo hiểm thất nghiệp', 'L'), ('3387', 'Doanh thu chờ phân bổ', 'L'), ('3388', 'Phải trả, phải nộp khác', 'L'),
    ('341', 'Vay và nợ thuê tài chính', 'L'),
    ('344', 'Nhận ký quỹ, ký cược', 'L'),
    ('411', 'Vốn đầu tư của chủ sở hữu', 'E'),
    ('421', 'Lợi nhuận sau thuế chưa phân phối', 'E'),
    ('511', 'Doanh thu bán hàng và cung cấp dịch vụ', 'R'),
    ('515', 'Doanh thu hoạt động tài chính', 'R'),
    ('621', 'Chi phí nguyên liệu, vật liệu trực tiếp', 'X'),
    ('622', 'Chi phí nhân công trực tiếp', 'X'),
    ('627', 'Chi phí sản xuất chung', 'X'), ('6275', 'Thuế, phí, lệ phí', 'X'),
    ('632', 'Giá vốn hàng bán', 'X'),
    ('635', 'Chi phí tài chính', 'X'),
    ('641', 'Chi phí bán hàng', 'X'),
    ('642', 'Chi phí quản lý doanh nghiệp', 'X'),
    ('6421', 'Chi phí nhân viên quản lý', 'X'), ('6428', 'Chi phí bằng tiền khác', 'X'),
    ('711', 'Thu nhập khác', 'R'),
    ('811', 'Chi phí khác', 'X'),
    ('821', 'Chi phí thuế thu nhập doanh nghiệp', 'X'),
    ('911', 'Xác định kết quả kinh doanh', 'Z'),
]

# TT58/2026/TT-BTC (doanh nghiệp siêu nhỏ) hướng dẫn ghi sổ theo mẫu S1..S3b-DNSN, không ban hành bảng tài khoản riêng.
# Danh mục dưới đây là tập RÚT GỌN các tài khoản TT99 đủ cho nghiệp vụ vận tải của doanh nghiệp siêu nhỏ để hệ thống vẫn ghi sổ kép;
# không có tài khoản sản xuất (621/622/627) và các tài khoản chuyên biệt khác.
_TT58_CODES = {
    '111', '112', '131', '133', '1331', '138', '1388', '141', '152', '153', '211', '214', '242',
    '331', '333', '3331', '33311', '3334', '3335', '334', '338', '3382', '3383', '3384', '3386', '3388', '341',
    '411', '421', '511', '515', '632', '635', '642', '6421', '6428', '711', '811', '821', '911',
}
_TT58 = [row for row in _TT99 if row[0] in _TT58_CODES]

CHARTS = {
    'TT99': _TT99,
    'TT58': _TT58,
    'TT133': _COMMON + [
        ('3385', 'Bảo hiểm thất nghiệp', 'L'),
        ('3386', 'Nhận ký quỹ, ký cược', 'L'),
        ('642', 'Chi phí quản lý kinh doanh', 'X'),
        ('6421', 'Chi phí bán hàng', 'X'), ('6422', 'Chi phí quản lý doanh nghiệp', 'X'),
    ],
    'TT200': _COMMON + [
        ('3386', 'Bảo hiểm thất nghiệp', 'L'),
        ('344', 'Nhận ký quỹ, ký cược', 'L'),
        ('621', 'Chi phí nguyên liệu, vật liệu trực tiếp', 'X'),
        ('622', 'Chi phí nhân công trực tiếp', 'X'),
        ('627', 'Chi phí sản xuất chung', 'X'),
        ('641', 'Chi phí bán hàng', 'X'),
        ('642', 'Chi phí quản lý doanh nghiệp', 'X'),
        ('6421', 'Chi phí nhân viên quản lý', 'X'), ('6428', 'Chi phí bằng tiền khác', 'X'),
    ],
}

# Ánh xạ nghiệp vụ -> tài khoản. Có thể ghi đè từng công ty qua Company.ledger_account_overrides.
# Ghi chú: chi phí vận hành chuyến (nhiên liệu, cầu đường, sửa xe, lương tài xế) hạch toán thẳng vào 632
# để báo cáo lãi lỗ phản ánh ngay; doanh nghiệp theo TT200 muốn tập hợp qua 621/622/627 -> 154 thì ghi đè.
ACCOUNT_MAP = {
    'TT99': {
        'cash': '111', 'bank': '112', 'receivable': '131', 'vat_in': '1331', 'other_receivable': '1388',
        'advance': '141', 'payable': '331', 'vat_out': '33311', 'pit': '3335', 'salary': '334',
        'union': '3382', 'social_ins': '3383', 'health_ins': '3384', 'unemployment_ins': '3386',
        'revenue': '511', 'other_income': '711', 'cogs': '632', 'fuel': '632', 'toll': '632',
        'maintenance': '632', 'driver_salary': '632', 'admin_salary': '6421', 'admin_other': '6428',
    },
    'TT58': {
        'cash': '111', 'bank': '112', 'receivable': '131', 'vat_in': '1331', 'other_receivable': '1388',
        'advance': '141', 'payable': '331', 'vat_out': '33311', 'pit': '3335', 'salary': '334',
        'union': '3382', 'social_ins': '3383', 'health_ins': '3384', 'unemployment_ins': '3386',
        'revenue': '511', 'other_income': '711', 'cogs': '632', 'fuel': '632', 'toll': '632',
        'maintenance': '632', 'driver_salary': '632', 'admin_salary': '6421', 'admin_other': '6428',
    },
    'TT133': {
        'cash': '1111', 'bank': '1121', 'receivable': '131', 'vat_in': '1331', 'other_receivable': '1388',
        'advance': '141', 'payable': '331', 'vat_out': '33311', 'pit': '3335', 'salary': '334',
        'union': '3382', 'social_ins': '3383', 'health_ins': '3384', 'unemployment_ins': '3385',
        'revenue': '5113', 'other_income': '711', 'cogs': '632', 'fuel': '632', 'toll': '632',
        'maintenance': '632', 'driver_salary': '632', 'admin_salary': '6422', 'admin_other': '6422',
    },
    'TT200': {
        'cash': '1111', 'bank': '1121', 'receivable': '131', 'vat_in': '1331', 'other_receivable': '1388',
        'advance': '141', 'payable': '331', 'vat_out': '33311', 'pit': '3335', 'salary': '334',
        'union': '3382', 'social_ins': '3383', 'health_ins': '3384', 'unemployment_ins': '3386',
        'revenue': '5113', 'other_income': '711', 'cogs': '632', 'fuel': '632', 'toll': '632',
        'maintenance': '632', 'driver_salary': '632', 'admin_salary': '6421', 'admin_other': '6428',
    },
}

REGIMES = tuple(CHARTS)
DEFAULT_REGIME = 'TT99'

# Nhãn hiển thị; legacy=True: chế độ cũ, chỉ còn chọn được khi công ty đang dùng.
REGIME_INFO = {
    'TT99': {'label': 'TT99/2025/TT-BTC (doanh nghiệp, thay TT200 từ 01/01/2026)', 'short': 'TT99/2025', 'legacy': False},
    'TT58': {'label': 'TT58/2026/TT-BTC (doanh nghiệp siêu nhỏ, từ 01/07/2026 - danh mục rút gọn)', 'short': 'TT58/2026', 'legacy': False},
    'TT133': {'label': 'TT133/2016/TT-BTC (cũ)', 'short': 'TT133/2016', 'legacy': True},
    'TT200': {'label': 'TT200/2014/TT-BTC (cũ, đã thay bằng TT99)', 'short': 'TT200/2014', 'legacy': True},
}


def account_type_for(code, regime):
    for c, _name, kind in CHARTS[regime]:
        if c == code:
            return kind
    return None


def resolve(company, key):
    """Số hiệu tài khoản cho nghiệp vụ `key` theo chế độ kế toán và ghi đè của công ty."""
    regime = getattr(company, 'accounting_regime', None) or DEFAULT_REGIME
    overrides = getattr(company, 'ledger_account_overrides', None) or {}
    return overrides.get(key) or ACCOUNT_MAP[regime][key]
