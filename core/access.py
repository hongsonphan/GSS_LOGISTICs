"""Phân quyền 3 tầng: Nhóm → Chức danh → Người.

- Nhóm (Admin, Giám đốc, Kinh doanh, Nhân sự, Kế toán, Điều vận, Vận hành, Hải quan): bộ quyền đầy đủ của nhóm
  theo ma trận Phân hệ × Thao tác (AccessGroup; chưa cấu hình thì dùng GROUPS mặc định).
- Chức danh (EmployeeRole): thuộc một nhóm -> mặc định có toàn bộ quyền của nhóm, thêm / bớt quyền theo vị trí (RoleAccess).
- Người: quyền chức danh + nhóm bổ sung (vd. thêm nhóm Admin) + ngoại lệ cá nhân cho thêm / chặn (UserAccessOverride).
- Quản trị hệ thống (superuser) luôn đủ quyền. Tài khoản không gắn hồ sơ nhân viên dùng quy tắc cũ (nhóm Django).
- Các lớp quyền DRF trong core/permissions.py gọi `allowed()` / `request_allowed()`.
"""
from django.contrib.auth.models import AnonymousUser

# ----------------------------------------------------------------------------- Danh mục
ACTIONS = [
    ('view', 'Xem'),
    ('create', 'Tạo mới'),
    ('edit', 'Sửa'),
    ('delete', 'Xoá'),
    ('approve', 'Duyệt / Chốt'),
    ('export', 'Xuất / In'),
]
ACTION_KEYS = [a for a, _ in ACTIONS]

# Báo cáo (mỗi báo cáo là một dòng trong ma trận): (khoá, tên, mô tả, nhóm: fin | ops | sales)
REPORTS = [
    ('pnl', 'Lãi lỗ tổng hợp', 'Doanh thu, chi phí, lợi nhuận và biên lãi', 'fin'),
    ('customer_rev', 'Doanh thu theo khách hàng', 'Doanh thu và lãi gộp từng khách hàng', 'fin'),
    ('subcontractor', 'Quyết toán thầu phụ 3PL', 'Cước trả đối tác vận tải thầu phụ', 'fin'),
    ('driver_salary', 'Bảng lương chuyến & tài xế', 'Lương chuyến, thưởng phạt theo tài xế', 'fin'),
    ('dispatcher_funds', 'Quỹ tạm ứng điều vận', 'Số dư và biến động quỹ điều vận', 'fin'),
    ('settlement_backlog', 'Chuyến tồn quyết toán', 'Chuyến đã chạy nhưng chưa quyết toán', 'fin'),
    ('settlement_vouchers', 'Bảng kê quyết toán & đối soát', 'Bảng kê quyết toán tài xế, đối tác 3PL, khách hàng đã lập (chỉ xem, in, xuất)', 'fin'),
    ('ar_aging', 'Công nợ phải thu (AR)', 'Tuổi nợ phải thu theo khách hàng', 'fin'),
    ('unsettled_aging', 'Tuổi đơn tồn đọng chưa chốt', 'Đơn tồn đọng chưa chốt theo số ngày', 'fin'),
    ('driver_advances', 'Tạm ứng & chi phí tài xế', 'Tạm ứng, chi phí phát sinh, chênh lệch đối soát từng chuyến', 'fin'),
    ('dem_det', 'DEM/DET', 'Phí lưu container, lưu bãi', 'ops'),
    ('otp', 'Tỷ lệ đúng giờ (OTP)', 'Giao đúng hẹn theo chuyến, khách, tuyến', 'ops'),
    ('route_cost', 'Chi phí theo tuyến', 'Chi phí bình quân từng tuyến', 'ops'),
    ('layover', 'Lưu đêm / chờ', 'Chuyến lưu đêm, thời gian chờ', 'ops'),
    ('incidents', 'Sự cố & chất lượng', 'Sự cố, hư hỏng, khiếu nại', 'ops'),
    ('wip_trips', 'Chuyến đang chạy (WIP)', 'Chuyến đang thực hiện', 'ops'),
    ('crm_quotations', 'Báo giá (CRM)', 'Báo giá theo trạng thái, khách hàng', 'sales'),
    ('active_bookings', 'Booking đang chạy', 'Booking đang xử lý', 'sales'),
]
REPORT_KEYS = [f'rpt_{r[0]}' for r in REPORTS]
REPORT_CATEGORY = {f'rpt_{r[0]}': r[3] for r in REPORTS}
# Phân hệ tổng hợp (không hiện trong ma trận, tự tính từ quyền từng dòng) để các chỗ kiểm tra cũ vẫn dùng được:
#   reports_any: xem được ít nhất một báo cáo; reports_fin: xem được Lãi lỗ hoặc Doanh thu khách (số liệu lãi lỗ);
#   reports_ops: xem được ít nhất một báo cáo vận hành; settings: xem được ít nhất một tab Cài đặt (kể cả Nhật ký hoạt động);
#   accounting: có quyền ở ít nhất một tab Tài chính & Kế toán (dùng cho menu, cổng trang);
#   finance: có quyền ở ít nhất một tab TÀI CHÍNH (tương đương quyền "accounting" cũ), dùng cho can_view_finance.
ACTION_LABELS = dict(ACTIONS)

# Dòng Tài chính & Kế toán tách ra từ khoá 'accounting' cũ (quyền hiệu lực không đổi cho ai nhờ LEGACY_EXPAND)
ACC_FROM_ACCOUNTING = ['acc_cashbook', 'acc_dispatcher_fund', 'acc_reimburse', 'acc_driver_settle', 'acc_customer_settle', 'acc_3pl',
                       'acc_voucher', 'acc_bot', 'acc_gss']
ACC_GATE_KEYS = list(ACC_FROM_ACCOUNTING)                       # nguồn của khoá dẫn xuất 'finance'
ACC_ANY_KEYS = ACC_FROM_ACCOUNTING + ['advances', 'ledger']     # nguồn của khoá dẫn xuất 'accounting' (menu, cổng trang)
# Tab Cài đặt tách từ 4 khoá cũ (cfg_finance / cfg_partners / cfg_network / cfg_fleet)
CFG_FINANCE_KEYS = ['cfg_opening', 'cfg_accounts', 'cfg_expenses', 'cfg_driver_tariffs', 'cfg_allowances']
CFG_PARTNER_KEYS = ['cfg_customers', 'cfg_tariffs', 'cfg_subcontractors']
CFG_NETWORK_KEYS = ['cfg_locations', 'cfg_shipping_lines']
CFG_FLEET_KEYS = ['cfg_vehicles', 'cfg_trailers', 'cfg_containers']
CFG_DATA_KEYS = CFG_FINANCE_KEYS + CFG_PARTNER_KEYS + CFG_NETWORK_KEYS + CFG_FLEET_KEYS
CFG_KEYS = ['cfg_company'] + CFG_DATA_KEYS
# Dòng quyền của trang Cài đặt tính cả Nhật ký hoạt động (chỉ Xem / Xuất): có quyền này thì vào được trang Cài đặt
SETTINGS_KEYS = CFG_KEYS + ['audit_log']
# Tab của trang Cài đặt -> phân hệ quyền (roles_permissions thuộc Quản trị hệ thống); mỗi tab một khoá
CFG_TAB_MODULE = {
    'company': 'cfg_company', 'roles_permissions': 'admin', 'audit_log': 'audit_log',
    'opening_balance': 'cfg_opening', 'account_settings': 'cfg_accounts', 'expenses': 'cfg_expenses',
    'driver_tariffs': 'cfg_driver_tariffs', 'allowances': 'cfg_allowances',
    'customers': 'cfg_customers', 'tariffs': 'cfg_tariffs', 'subcontractors': 'cfg_subcontractors',
    'suppliers': 'cfg_customers',
    'locations': 'cfg_locations', 'shipping_lines': 'cfg_shipping_lines',
    'vessels': 'cfg_shipping_lines', 'pol_ports': 'cfg_locations',
    'vehicles': 'cfg_vehicles', 'trailers': 'cfg_trailers', 'containers': 'cfg_containers',
}
DERIVED_MODULES = {
    'reports_any': lambda keys: any(k in REPORT_CATEGORY for k in keys),
    'reports_fin': lambda keys: bool(keys & {'rpt_pnl', 'rpt_customer_rev'}),
    'reports_ops': lambda keys: any(REPORT_CATEGORY.get(k) == 'ops' for k in keys),
    'settings': lambda keys: bool(keys & set(SETTINGS_KEYS)),   # vào được trang Cài đặt: xem được ít nhất một tab
    'accounting': lambda keys: bool(keys & set(ACC_ANY_KEYS)),
    'finance': lambda keys: bool(keys & set(ACC_GATE_KEYS)),
}
DERIVED_LABELS = {
    'reports_any': 'Báo cáo & Thống kê', 'reports_fin': 'Báo cáo tài chính', 'reports_ops': 'Báo cáo vận hành',
    'settings': 'Cài đặt', 'accounting': 'Tài chính & Kế toán', 'finance': 'Tài chính & Kế toán',
}
# Khoá cũ (đã bỏ khỏi ma trận) -> các khoá thay thế; dữ liệu đã lưu theo khoá cũ vẫn đọc được và được mở rộng khi đọc
LEGACY_EXPAND = {
    'reports_fin': [k for k in REPORT_KEYS if REPORT_CATEGORY[k] == 'fin'],
    'reports_ops': [k for k in REPORT_KEYS if REPORT_CATEGORY[k] == 'ops'],
    'accounting': ACC_FROM_ACCOUNTING,
    'cfg_finance': CFG_FINANCE_KEYS, 'cfg_partners': CFG_PARTNER_KEYS, 'cfg_network': CFG_NETWORK_KEYS, 'cfg_fleet': CFG_FLEET_KEYS,
}

A_ALL = ['view', 'create', 'edit', 'delete', 'approve', 'export']
A_CRUD = ['view', 'create', 'edit', 'delete', 'export']

# Cây theo đúng sidebar: (khoá, nhãn, biểu tượng phosphor, [(khoá nhóm con, nhãn)])
SECTIONS = [
    ('dashboard', 'Tổng quan', 'ph-squares-four', []),
    ('sales', 'Sales & Shipments', 'ph-handshake', []),
    ('dispatch', 'Điều vận & Vendor', 'ph-truck', []),
    ('depot', 'Bãi depot (Thủ bãi)', 'ph-warehouse', []),
    ('fleet', 'Bãi & Phương Tiện', 'ph-garage', []),
    ('hr', 'Nhân sự', 'ph-users', []),
    ('accounting', 'Tài chính & Kế toán', 'ph-calculator', []),
    ('customs', 'Hải quan', 'ph-file-text', []),
    ('reports', 'Báo cáo & Thống kê', 'ph-chart-bar', [
        ('fin', 'Tài chính & quản trị'), ('ops', 'Vận hành'), ('sales', 'Kinh doanh & khách hàng')]),
    ('settings', 'Cài đặt', 'ph-gear', []),
]
SECTION_KEYS = [s[0] for s in SECTIONS]
SECTION_LABELS = {s[0]: s[1] for s in SECTIONS}

_RPT_ROWS = [
    ('reports', f'rpt_{r[0]}', r[1], r[2], ['view', 'export'], ['Xem báo cáo', 'Xuất Excel / In'], r[3]) for r in REPORTS
]

# (phân hệ sidebar, khoá, nhãn tab, mô tả, thao tác áp dụng, màn / nút do tab điều khiển, nhóm con)
# Màn / nút mở từ tab KHÔNG có khoá riêng: quyền do hàng tab quyết định.
_ROWS = [
    ('dashboard', 'dashboard', 'Tổng quan', 'Trang Dashboard và số liệu tổng hợp theo vai trò', ['view'],
     ['Dashboard theo vai trò', 'Thẻ chỉ số và biểu đồ'], ''),

    ('sales', 'sales', 'Báo giá, Booking & Khách hàng', 'Báo giá, booking, khách hàng, công nợ khách', A_ALL,
     ['Tạo / sửa báo giá', 'Đổi trạng thái báo giá (Duyệt / Ký kết)', 'Tạo / sửa booking', 'In báo giá', 'Xoá báo giá / booking'], ''),
    ('sales', 'pricing', 'Biểu giá', 'Khoản phí, bảng giá bán theo khách / mua theo nhà xe, duyệt và phiên bản giá', A_ALL,
     ['Bảng giá bán', 'Bảng giá mua nhà xe', 'Duyệt / chốt phiên bản giá'], ''),

    ('dispatch', 'dispatch', 'Chuyến xe, lệnh điều động & Vendor', 'Chuyến xe, lệnh điều động, mốc thời gian, chứng từ chuyến (Duyệt: các bước chốt của điều vận)', A_ALL,
     ['Tạo chuyến', 'Chi tiết chuyến', 'Sửa chuyến', 'Đổi trạng thái chuyến', 'Điều xe - tài xế', 'Lệnh điều động / lệnh vận chuyển nhà xe', 'Chứng từ, chi phí chuyến'], ''),

    ('depot', 'depot', 'Bãi depot (Thủ bãi)', 'Gate-in/Gate-out container, ảnh hiện trạng, tồn bãi, xuất Excel bãi', ['view', 'create', 'edit', 'export'],
     ['Gate-in / Gate-out', 'Ảnh hiện trạng', 'Tồn bãi', 'Xuất Excel bãi'], ''),

    ('fleet', 'fleet', 'Đầu kéo, rơ-moóc & bảo dưỡng', 'Đầu kéo, rơ-moóc, bảo dưỡng, hạn đăng kiểm', A_CRUD,
     ['Thêm / sửa xe, rơ-moóc', 'Chi tiết xe', 'Cảnh báo đăng kiểm, bảo hiểm, bảo dưỡng'], ''),

    ('hr', 'hr', 'Hồ sơ nhân sự & tài khoản', 'Hồ sơ nhân viên (CCCD, ngân hàng, địa chỉ), tài khoản đăng nhập', A_CRUD,
     ['Thêm / sửa hồ sơ', 'Chi tiết nhân viên', 'Nhập / xuất danh sách nhân sự', 'Tài khoản đăng nhập'], ''),

    ('accounting', 'acc_cashbook', 'Sổ quỹ thu - chi', 'Phiếu thu, phiếu chi, sổ quỹ tiền mặt / ngân hàng', A_ALL,
     ['Tạo phiếu thu / chi', 'Chi tiết phiếu', 'Sửa / xoá phiếu', 'In phiếu', 'Xuất sổ quỹ'], ''),
    ('accounting', 'advances', 'Tạm ứng tài xế & lập phiếu quỹ điều vận', 'Cấp và quyết toán tạm ứng tài xế, lập phiếu quỹ điều vận, quyết toán gom tài xế', A_ALL,
     ['Tạo tạm ứng', 'Chi tiết tạm ứng', 'Quyết toán / hoàn ứng', 'Lập phiếu quỹ điều vận', 'Quyết toán gom tài xế'], ''),
    ('accounting', 'acc_dispatcher_fund', 'Quỹ điều vận (duyệt / tất toán)', 'Duyệt xuất quỹ, từ chối, tất toán quỹ ứng điều vận', A_ALL,
     ['Duyệt / từ chối phiếu quỹ', 'Tất toán quỹ', 'In phiếu quỹ'], ''),
    ('accounting', 'acc_reimburse', 'Khoản chi hộ', 'Khoản chi hộ khách hàng cần thu hồi', A_ALL,
     ['Danh sách chi hộ', 'Đánh dấu đã thu hồi', 'Xuất bảng kê chi hộ'], ''),
    ('accounting', 'acc_driver_settle', 'Quyết toán chuyến & tài xế', 'Đối soát, chốt sổ chi phí chuyến, duyệt khoản chi', A_ALL,
     ['Đối soát chi phí chuyến', 'Chốt / mở sổ chi phí chuyến', 'Duyệt / từ chối khoản chi', 'Bảng quyết toán GSS'], ''),
    ('accounting', 'acc_customer_settle', 'Quyết toán khách hàng (SOA)', 'Đối chiếu công nợ khách hàng, bảng kê SOA theo tháng', A_ALL,
     ['Đối chiếu công nợ khách', 'Bảng kê SOA hàng tháng', 'Xuất Excel SOA'], ''),
    ('accounting', 'acc_3pl', 'Đối tác 3PL', 'Quyết toán cước trả đối tác vận tải thầu phụ', A_ALL,
     ['Bảng quyết toán 3PL', 'Chốt quyết toán 3PL', 'Xuất bảng quyết toán'], ''),
    ('accounting', 'acc_voucher', 'Phiếu quyết toán', 'Phiếu quyết toán tài xế, đối tác 3PL, khách hàng', A_ALL,
     ['Lập phiếu quyết toán', 'Chi tiết phiếu', 'Duyệt / mở lại phiếu', 'Chốt thanh toán / bù trừ', 'In phiếu quyết toán'], ''),
    ('accounting', 'ledger', 'Sổ sách kế toán', 'Cân đối tài khoản, nhật ký chung, sổ cái, ánh xạ tài khoản', ['view', 'edit', 'export'],
     ['Cân đối tài khoản', 'Nhật ký chung', 'Sổ cái theo tài khoản', 'Xuất Excel theo mẫu'], ''),
    ('accounting', 'acc_bot', 'Vé BOT tuyến', 'Đối soát vé BOT theo tuyến', A_ALL,
     ['Đối soát vé BOT', 'Xuất bảng đối soát'], ''),
    ('accounting', 'acc_gss', 'Vận đơn GSS: cước, claim, hoá đơn, bảng kê', 'Phụ phí / claim / hoá đơn / bảng kê đối chiếu theo vận đơn (màn GSS)', A_ALL,
     ['Cước và chi phí theo chuyến', 'Claim', 'Hoá đơn', 'Bảng kê đối chiếu'], ''),

    ('customs', 'customs', 'Tờ khai hải quan', 'Tờ khai VNACCS, phân luồng, thông quan', A_CRUD,
     ['Tạo tờ khai', 'Chi tiết tờ khai', 'Đổi luồng / nộp thuế', 'Thông quan', 'In tờ khai'], ''),

    *_RPT_ROWS,

    ('settings', 'cfg_company', 'Khai báo ban đầu (thông tin công ty)', 'Thông tin công ty, mã số thuế, tham số hệ thống', ['view', 'edit'],
     ['Sửa thông tin công ty'], ''),
    ('settings', 'admin', 'Vai trò & phân quyền', 'Phân quyền Nhóm - Chức danh - Người, tài khoản người dùng, thông tin công ty', ['view', 'edit'],
     ['Ma trận phân quyền', 'Tài khoản người dùng'], ''),
    ('settings', 'audit_log', 'Nhật ký hoạt động', 'Xem ai tạo / sửa / xoá / duyệt gì, lúc nào và lịch sử đăng nhập (chỉ đọc); Xuất = tải CSV. Mặc định chỉ Admin và Giám đốc', ['view', 'export'],
     ['Nhật ký thay đổi dữ liệu', 'Nhật ký đăng nhập', 'Lọc theo người / loại phiếu / ngày', 'Xuất CSV'], ''),
    ('settings', 'cfg_opening', 'Số dư ban đầu', 'Số dư đầu kỳ các tài khoản', A_CRUD, ['Thêm / sửa số dư', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_accounts', 'Cài đặt tài khoản', 'Chế độ kế toán, ánh xạ nghiệp vụ - tài khoản sổ cái', A_CRUD,
     ['Đổi chế độ kế toán', 'Ánh xạ tài khoản', 'Hạch toán lại'], ''),
    ('settings', 'cfg_expenses', 'Khoản mục chi', 'Danh mục khoản mục chi phí', A_CRUD, ['Thêm / sửa khoản mục', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_driver_tariffs', 'Biểu phí lương chuyến', 'Biểu giá lương chuyến của tài xế', A_CRUD, ['Thêm / sửa biểu phí', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_allowances', 'Phụ cấp & kiểm hóa', 'Danh mục phụ cấp, phí kiểm hóa', A_CRUD, ['Thêm / sửa phụ cấp', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_customers', 'Khách hàng', 'Danh mục khách hàng', A_CRUD, ['Thêm / sửa khách hàng', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_tariffs', 'Biểu cước khách', 'Biểu giá cước theo khách hàng, tuyến', A_CRUD, ['Thêm / sửa biểu cước', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_subcontractors', 'Thầu phụ & nhà cung cấp', 'Nhà thầu phụ 3PL, xe và tài xế thầu phụ', A_CRUD,
     ['Thêm / sửa thầu phụ', 'Xe thầu phụ', 'Tài xế thầu phụ', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_locations', 'Cảng & kho bãi', 'Cảng, ICD, kho, bãi, địa điểm', A_CRUD, ['Thêm / sửa địa điểm', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_shipping_lines', 'Hãng tàu', 'Danh mục hãng tàu', A_CRUD, ['Thêm / sửa hãng tàu', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_vehicles', 'Đầu kéo & xe', 'Danh mục đầu kéo và xe tải (dữ liệu gốc)', A_CRUD, ['Thêm / sửa xe', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_trailers', 'Rơ-moóc', 'Danh mục rơ-moóc (dữ liệu gốc)', A_CRUD, ['Thêm / sửa rơ-moóc', 'Nhập / xuất Excel'], ''),
    ('settings', 'cfg_containers', 'Quy cách cont & xe', 'Loại container, quy cách xe', A_CRUD, ['Thêm / sửa quy cách', 'Nhập / xuất Excel'], ''),
    ('settings', 'master_data', 'Đọc danh mục (chọn trong biểu mẫu)',
     'Chọn khách hàng, địa điểm, xe, loại chi phí... trong các biểu mẫu (chỉ đọc; sửa danh mục theo các dòng Cài đặt)', ['view'],
     ['Danh sách chọn trong biểu mẫu'], ''),
]

# (khoá, tên, mô tả, thao tác áp dụng) - tên là nhãn TAB trên giao diện; phân hệ sidebar nằm ở MODULE_META
MODULES = [(r[1], r[2], r[3], list(r[4])) for r in _ROWS]
MODULE_META = {r[1]: {'section': r[0], 'sub_section': r[6], 'screens': list(r[5])} for r in _ROWS}
MODULE_KEYS = [m[0] for m in MODULES]
MODULE_ACTIONS = {m[0]: m[3] for m in MODULES}
MODULE_ACTIONS.update({k: ['view', 'export'] for k in DERIVED_MODULES})  # chỉ để tra cứu, không nằm trong MODULE_KEYS

ALL = 'view create edit delete approve export'
VIEW = 'view export'


def matrix_payload():
    """Dữ liệu cho trang Phân quyền: modules (cây theo sidebar + tab), sections, actions."""
    subs = {s[0]: dict(s[3]) for s in SECTIONS}
    modules = []
    for key, label, desc, acts in MODULES:
        meta = MODULE_META[key]
        modules.append({
            'key': key, 'label': label, 'description': desc,
            'actions': [a for a in ACTION_KEYS if a in acts],
            'section': meta['section'], 'section_label': SECTION_LABELS[meta['section']],
            'sub_section': meta['sub_section'], 'sub_section_label': subs.get(meta['section'], {}).get(meta['sub_section'], ''),
            'screens': list(meta['screens']),
        })
    sections = [{'key': k, 'label': lbl, 'icon': icon, 'sub_sections': [{'key': sk, 'label': sl} for sk, sl in sub]}
                for k, lbl, icon, sub in SECTIONS]
    return {'modules': modules, 'sections': sections, 'actions': [{'key': k, 'label': lbl} for k, lbl in ACTIONS]}


def _expand_legacy(grants):
    """Đổi khoá báo cáo cũ (reports_fin / reports_ops) thành từng báo cáo; giữ nguyên các khoá khác."""
    out = {}
    for mod, acts in (grants or {}).items():
        for target in LEGACY_EXPAND.get(mod, [mod]):
            out[target] = sorted(set(out.get(target, [])) | set(acts if isinstance(acts, (list, tuple)) else []))
    return out


def _m(**mods):
    mods = {k: v.split() for k, v in mods.items()}
    return {k: [a for a in MODULE_ACTIONS[k] if a in v] for k, v in _expand_legacy(mods).items()}


# ----------------------------------------------------------------------------- Nhóm quyền (mặc định)
# Bộ dòng dùng chung cho các nhóm mặc định (khớp quyền hiệu lực trước khi tách dòng)
ACC_ALL = {k: ALL for k in ACC_FROM_ACCOUNTING}          # tất cả tab tách từ 'accounting' cũ
CFG_ALL = {k: ALL for k in CFG_DATA_KEYS}                # tất cả tab Cài đặt dữ liệu

# (khoá, tên, mô tả, biểu tượng, quyền đầy đủ của nhóm)
GROUPS = [
    ('admin', 'Admin', 'Quản trị hệ thống: toàn quyền, cấu hình, phân quyền, tài khoản', 'ph-shield-star',
     _m(**{k: ALL for k in MODULE_KEYS})),
    ('director', 'Giám đốc', 'Ban Giám đốc: xem và duyệt mọi phân hệ, phân quyền', 'ph-crown',
     _m(**{k: ALL for k in MODULE_KEYS})),
    ('sales', 'Kinh doanh', 'Báo giá, booking, khách hàng; theo dõi chuyến của khách', 'ph-handshake',
     _m(dashboard='view', sales=ALL, pricing='view create edit export', dispatch=VIEW, customs='view', master_data='view',
        rpt_crm_quotations=VIEW, rpt_active_bookings=VIEW, rpt_wip_trips=VIEW)),
    ('hr', 'Nhân sự', 'Hồ sơ nhân viên và tài khoản đăng nhập', 'ph-users-three',
     _m(dashboard='view', hr=ALL, master_data='view')),
    ('accounting', 'Kế toán', 'Sổ quỹ, quyết toán, tạm ứng, sổ sách, lương, báo cáo tài chính', 'ph-calculator',
     _m(dashboard='view', **ACC_ALL, pricing=ALL, advances=ALL, ledger=ALL, hr='view export', reports_fin=VIEW,
        reports_ops=VIEW, sales=VIEW, dispatch=VIEW, master_data='view', cfg_company='view', **CFG_ALL,
        rpt_crm_quotations=VIEW, rpt_active_bookings=VIEW)),
    ('dispatch', 'Điều vận & Vendor', 'Chuyến xe, lệnh điều động, tạm ứng tài xế, quỹ điều vận', 'ph-truck',
     _m(dashboard='view', dispatch=ALL, depot=ALL, advances=ALL, fleet='view create edit export', customs='view', sales=VIEW,
        reports_ops=VIEW, master_data='view', cfg_company='view', **CFG_ALL,
        rpt_crm_quotations=VIEW, rpt_active_bookings=VIEW, rpt_driver_advances=VIEW)),
    ('operations', 'Vận hành', 'Đội xe, rơ-moóc, bảo dưỡng, đăng kiểm, bãi xe', 'ph-wrench',
     _m(dashboard='view', fleet=ALL, depot=ALL, dispatch=VIEW, reports_ops=VIEW, master_data='view')),
    ('customs', 'Hải quan', 'Tờ khai VNACCS, phân luồng, thông quan', 'ph-stamp',
     _m(dashboard='view', customs=ALL, dispatch=VIEW, sales='view', master_data='view', rpt_crm_quotations=VIEW, rpt_active_bookings=VIEW, rpt_wip_trips=VIEW)),
    ('yard', 'Thủ bãi', 'Thủ bãi depot: nhận/xuất container, chụp ảnh hiện trạng, xem lệnh điều xe liên quan', 'ph-warehouse',
     _m(dashboard='view', depot='view create edit export', dispatch='view', master_data='view')),
    ('driver', 'Tài xế hiện trường', 'Tài xế: xem chuyến được giao, cập nhật mốc và chứng từ', 'ph-steering-wheel',
     _m(dashboard='view', master_data='view')),
]
GROUP_KEYS = [g[0] for g in GROUPS]
GROUP_LABELS = {g[0]: g[1] for g in GROUPS}
# Tên nhóm Django (bảng Nhóm trong trang admin, dữ liệu thật) -> khoá quyền mặc định; nhóm tạo thêm trong admin có khoá grp<id>
GROUP_ALIASES = {
    'Admin': 'admin', 'Quản trị hệ thống': 'admin',
    'Ban Giám Đốc': 'director', 'Giám đốc': 'director',
    'Kinh Doanh (Sales)': 'sales', 'Kinh Doanh': 'sales',
    'Hành chính & Nhân Sự': 'hr', 'Quản Lý Nhân Sự': 'hr', 'Nhân sự': 'hr',
    'Tài chính & Kế toán': 'accounting', 'Kế Toán Cước': 'accounting', 'Kế toán': 'accounting',
    'Điều Vận': 'dispatch', 'Điều Phối Viên': 'dispatch',
    'Vận Hành': 'operations', 'Hải Quan': 'customs', 'Thủ bãi': 'yard', 'Thủ Bãi': 'yard',
    'Tài Xế Hiện Trường': 'driver',
}


def available_groups():
    """Các nhóm thật trong cơ sở dữ liệu (bảng Nhóm của Django) theo thứ tự tạo: [{key, label, description, icon, pk}]."""
    from django.contrib.auth.models import Group
    builtin = {g[0]: g for g in GROUPS}
    out, seen = [], set()
    for grp in Group.objects.order_by('id'):
        key = GROUP_ALIASES.get(grp.name)
        if not key or key in seen:
            key = f'grp{grp.pk}'
        seen.add(key)
        info = builtin.get(key)
        out.append({'key': key, 'label': grp.name, 'description': info[2] if info else '', 'icon': info[3] if info else 'ph-users', 'pk': grp.pk})
    if not out:  # cài mới, chưa có nhóm nào trong CSDL: dùng bộ nhóm mặc định
        out = [{'key': k, 'label': lbl, 'description': d, 'icon': i, 'pk': None} for k, lbl, d, i, _g in GROUPS]
    return out


def available_group_keys():
    return [g['key'] for g in available_groups()]


def user_group_keys(user):
    """Khoá các nhóm thật mà tài khoản đang là thành viên (bảng Nhóm của Django)."""
    ids = set(user.groups.values_list('id', flat=True)) if getattr(user, 'pk', None) else set()
    return [g['key'] for g in available_groups() if g['pk'] in ids]
# Nhóm luôn giữ quyền quản trị phân quyền (tránh tự khoá mất quyền vào trang Phân quyền)
LOCKED_GROUP_GRANTS = {'admin': {'admin': ['view', 'edit']}, 'director': {'admin': ['view', 'edit']}}

# Chức danh -> (nhóm, thêm, bớt) mặc định
POSITIONS = {
    'DIRECTOR': ('director', {}, {}),
    'LEAD_ADMIN_ACC': ('accounting', {}, {}),
    'ACCOUNTANT': ('accounting', {}, {}),
    'STAFF_ADMIN_ACC': ('accounting', {}, _m(**{k: 'delete approve' for k in ACC_FROM_ACCOUNTING}, advances='delete approve', ledger='edit',
                                              **{k: 'delete' for k in CFG_DATA_KEYS})),
    'LEAD_DISPATCH': ('dispatch', {}, {}),
    'DISPATCHER': ('dispatch', {}, {}),
    'DISPATCH_ASST': ('dispatch', {}, _m(dispatch='delete approve', advances='delete approve', **{k: 'delete' for k in CFG_DATA_KEYS})),
    'YARD_KEEPER': ('yard', {}, {}),
    'DRIVER': ('', _m(dashboard='view', master_data='view'), {}),
    'LEAD_SALES': ('sales', {}, {}),
    'SALESMAN': ('sales', {}, _m(sales='approve')),
    'CSKH': ('sales', {}, _m(sales='delete approve')),
    'LEAD_MAINT': ('operations', {}, {}),
    'MECHANIC': ('operations', {}, _m(fleet='delete')),
    'LEAD_CUSTOMS': ('customs', {}, {}),
    'CUSTOMS_STAFF': ('customs', {}, _m(customs='delete')),
}
# Thứ tự hiển thị chức danh trong trang Phân quyền
ROLE_ORDER = list(POSITIONS)


def _clean(grants):
    """Chuẩn hoá {module: [actions]} — bỏ phân hệ/thao tác không hợp lệ, sắp xếp theo thứ tự chuẩn."""
    out = {}
    for mod, acts in _expand_legacy(grants if isinstance(grants, dict) else {}).items():
        if mod in MODULE_KEYS and isinstance(acts, (list, tuple)):
            keep = [a for a in MODULE_ACTIONS[mod] if a in acts]
            if keep:
                out[mod] = keep
    return out


def default_group_grants(key):
    for k, _l, _d, _i, grants in GROUPS:
        if k == key:
            return {m: list(a) for m, a in grants.items()}
    return {}


def _with_locked(key, grants):
    for mod, acts in LOCKED_GROUP_GRANTS.get(key, {}).items():
        grants[mod] = [a for a in MODULE_ACTIONS[mod] if a in set(grants.get(mod, [])) | set(acts)]
    return grants


def group_grants(company, key, _cache=None):
    if not key:
        return {}
    from core.models import AccessGroup
    row = AccessGroup.objects.filter(company=company, key=key).first() if company else None
    return _with_locked(key, _clean(row.grants) if row else default_group_grants(key))


def default_position(role):
    group, add, remove = POSITIONS.get(role, ('', {'dashboard': ['view']}, {}))
    return group, {m: list(a) for m, a in add.items()}, {m: list(a) for m, a in remove.items()}


def position_config(company, role):
    """(nhóm, thêm, bớt) của chức danh."""
    from core.models import RoleAccess
    row = RoleAccess.objects.filter(company=company, role=role).first() if company else None
    if row is None:
        return _fold_missing_group(company, *default_position(role))
    group, add, remove = row.group or '', _clean(row.add), _clean(row.remove)
    return _fold_missing_group(company, group, add, remove)


def _fold_missing_group(company, group, add, remove):
    """Nhóm của chức danh chưa có trong cơ sở dữ liệu: giữ quyền mặc định của nhóm đó như quyền riêng của chức danh."""
    if group and group not in available_group_keys():
        add = _from_set(_to_set(add) | _to_set(group_grants(company, group)))
        group = ''
    return group, add, remove


def role_grants(company, role):
    """Quyền của chức danh = quyền nhóm + thêm − bớt."""
    group, add, remove = position_config(company, role)
    pairs = (_to_set(group_grants(company, group)) | _to_set(add)) - _to_set(remove)
    return _from_set(pairs)


def _to_set(grants):
    return {(m, a) for m, acts in (grants or {}).items() for a in acts}


def _from_set(pairs):
    out = {}
    for m in MODULE_KEYS:
        acts = [a for a in MODULE_ACTIONS[m] if (m, a) in pairs]
        if acts:
            out[m] = acts
    return out


def _with_derived(grants):
    for name, test in DERIVED_MODULES.items():
        acts = [act for act in ('view', 'export')
                if test({m for m, acts_ in grants.items() if act in acts_ and m in MODULE_KEYS})]
        if acts:
            grants[name] = acts
    return grants


def effective_grants(user):
    """{module: [actions]} của người dùng; ghi nhớ trên đối tượng user trong một request."""
    if user is None or isinstance(user, AnonymousUser) or not user.is_authenticated or not user.is_active:
        return {}
    cached = getattr(user, '_bim_access', None)
    if cached is not None:
        return cached
    if user.is_superuser:
        grants = _with_derived({m: list(MODULE_ACTIONS[m]) for m in MODULE_KEYS})
    else:
        employee = getattr(user, 'employee', None)
        # tài khoản không hồ sơ nhân viên: chỉ có quyền của nhóm được gán
        from core.models import UserAccessOverride
        from core.tenant import company_for_user
        company = company_for_user(user)
        pairs = _to_set(role_grants(company, employee.role)) if employee is not None else set()
        ov = UserAccessOverride.objects.filter(user=user).first()
        if ov:
            extra_keys = list(ov.groups or [])
        else:
            extra_keys = []
        keys = available_group_keys()
        for key in dict.fromkeys(extra_keys + user_group_keys(user)):
            if key in keys:
                pairs |= _to_set(group_grants(company, key))
        if ov:
            pairs |= _to_set(_clean(ov.allow))
            pairs -= _to_set(_clean(ov.deny))
        grants = _with_derived(_from_set(pairs))
    user._bim_access = grants
    return grants


def allowed(user, module, action='view'):
    return action in effective_grants(user).get(module, [])


METHOD_ACTION = {'GET': 'view', 'HEAD': 'view', 'OPTIONS': 'view', 'POST': 'create', 'PUT': 'edit', 'PATCH': 'edit', 'DELETE': 'delete'}


def action_for(request, view=None):
    """Thao tác của request: theo phương thức HTTP; view có thể khai báo `access_actions = {'POST': 'approve'}`.
    GET có ?export= hoặc đường dẫn chứa 'export' tính là Xuất."""
    method = request.method.upper()
    custom = getattr(view, 'access_actions', None) or {}
    if method in custom:
        return custom[method]
    action = METHOD_ACTION.get(method, 'edit')
    if action == 'view':
        path = request.path.lower()
        if request.GET.get('export') or 'export' in path or '/print' in path:
            return 'export'
    return action


def request_allowed(request, module, view=None):
    action = action_for(request, view)
    if allowed(request.user, module, action):
        return True
    # Thao tác Xuất ngầm định có khi được Xem nếu phân hệ không có ô Xuất riêng
    if action == 'export' and 'export' not in MODULE_ACTIONS.get(module, []):
        return allowed(request.user, module, 'view')
    return False


def denied_message(module, action):
    labels = dict((m[0], m[1]) for m in MODULES)
    if module in labels:
        meta = MODULE_META.get(module, {})
        mod = f"{SECTION_LABELS.get(meta.get('section'), '')} › {labels[module]}".strip(' ›')
    else:
        mod = DERIVED_LABELS.get(module, module)
    act = dict(ACTIONS).get(action, action)
    return f'Bạn không có quyền "{act}" trong phân hệ {mod}. Liên hệ Ban Giám đốc để được cấp quyền.'


def can(user, module, action='view'):
    """Kiểm tra quyền ngoài vòng DRF (trong view/template). Tài khoản không có hồ sơ nhân viên: chỉ superuser."""
    if user is not None and getattr(user, 'is_superuser', False):
        return True
    return allowed(user, module, action)


def can_view_finance(user):
    """Số liệu tài chính tổng hợp (quỹ, doanh thu, lãi lỗ): Báo cáo tài chính / Kế toán."""
    return bool(can(user, 'reports_fin', 'view') or can(user, 'finance', 'view'))


def can_view_trip_finance(user):
    """Doanh thu / chi phí / lãi của từng chuyến: ngoài nhóm tài chính còn có Điều vận (sửa chuyến) và Kinh doanh. Tài xế, thợ máy, tài khoản không hồ sơ và link công khai thì không."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    return bool(can_view_finance(user) or can(user, 'dispatch', 'edit') or can(user, 'sales', 'view'))
