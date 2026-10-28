"""Hệ thống tài khoản theo chế độ kế toán (TT133/2016 và TT200/2014) và bảng ánh xạ hạch toán mặc định.

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

CHARTS = {
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


def account_type_for(code, regime):
    for c, _name, kind in CHARTS[regime]:
        if c == code:
            return kind
    return None


def resolve(company, key):
    """Số hiệu tài khoản cho nghiệp vụ `key` theo chế độ kế toán và ghi đè của công ty."""
    regime = getattr(company, 'accounting_regime', None) or 'TT133'
    overrides = getattr(company, 'ledger_account_overrides', None) or {}
    return overrides.get(key) or ACCOUNT_MAP[regime][key]
