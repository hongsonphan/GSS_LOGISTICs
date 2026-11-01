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
# Phân hệ tổng hợp (không hiện trong ma trận, tự tính từ quyền từng báo cáo) để các chỗ kiểm tra cũ vẫn dùng được:
#   reports_any: xem được ít nhất một báo cáo; reports_fin: xem được Lãi lỗ hoặc Doanh thu khách (số liệu lãi lỗ);
#   reports_ops: xem được ít nhất một báo cáo vận hành.
DERIVED_MODULES = {
    'reports_any': lambda keys: bool(keys),
    'reports_fin': lambda keys: bool(keys & {'rpt_pnl', 'rpt_customer_rev'}),
    'reports_ops': lambda keys: any(REPORT_CATEGORY[k] == 'ops' for k in keys),
}
# Khoá phân hệ báo cáo cũ (trước khi tách từng báo cáo) -> các báo cáo tương ứng; dữ liệu đã lưu theo khoá cũ vẫn đọc được
LEGACY_EXPAND = {
    'reports_fin': [k for k in REPORT_KEYS if REPORT_CATEGORY[k] == 'fin'],
    'reports_ops': [k for k in REPORT_KEYS if REPORT_CATEGORY[k] == 'ops'],
}

# (khoá, tên, mô tả, thao tác áp dụng)
MODULES = [
    ('dashboard', 'Tổng quan', 'Trang Dashboard và số liệu tổng hợp theo vai trò', ['view']),
    ('sales', 'Kinh doanh', 'Báo giá, booking, khách hàng, công nợ khách', ['view', 'create', 'edit', 'delete', 'approve', 'export']),
    ('dispatch', 'Điều vận', 'Chuyến xe, lệnh điều động, mốc thời gian, chứng từ chuyến', ['view', 'create', 'edit', 'delete', 'approve', 'export']),
    ('fleet', 'Xe & Bãi', 'Đầu kéo, rơ-moóc, bảo dưỡng, hạn đăng kiểm', ['view', 'create', 'edit', 'delete', 'export']),
    ('customs', 'Hải quan', 'Tờ khai VNACCS, phân luồng, thông quan', ['view', 'create', 'edit', 'delete', 'export']),
    ('accounting', 'Tài chính & Kế toán', 'Sổ quỹ thu chi, quyết toán chuyến, chi hộ, đối tác 3PL, vé BOT', ['view', 'create', 'edit', 'delete', 'approve', 'export']),
    ('advances', 'Tạm ứng & Quỹ điều vận', 'Cấp và quyết toán tạm ứng tài xế, quỹ ứng điều vận', ['view', 'create', 'edit', 'delete', 'approve', 'export']),
    ('ledger', 'Sổ sách kế toán', 'Cân đối tài khoản, nhật ký chung, sổ cái, ánh xạ tài khoản', ['view', 'edit', 'export']),
    ('hr', 'Nhân sự', 'Hồ sơ nhân viên (CCCD, ngân hàng, địa chỉ), hợp đồng lao động', ['view', 'create', 'edit', 'delete', 'export']),
    ('payroll', 'Bảng lương', 'Kỳ lương, phiếu lương, cấu hình lương và khấu trừ', ['view', 'create', 'edit', 'delete', 'approve', 'export']),
    *[(f'rpt_{k}', f'Báo cáo · {label}', desc, ['view', 'export']) for k, label, desc, _c in REPORTS],
    ('master_data', 'Danh mục', 'Cảng, kho, tuyến, đơn giá, loại chi phí, đối tác', ['view', 'create', 'edit', 'delete', 'export']),
    ('admin', 'Quản trị hệ thống', 'Phân quyền, tài khoản người dùng, thông tin công ty', ['view', 'edit']),
]
MODULE_KEYS = [m[0] for m in MODULES]
MODULE_ACTIONS = {m[0]: m[3] for m in MODULES}
MODULE_ACTIONS.update({k: ['view', 'export'] for k in DERIVED_MODULES})  # chỉ để tra cứu, không nằm trong MODULE_KEYS

ALL = 'view create edit delete approve export'
VIEW = 'view export'


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
# (khoá, tên, mô tả, biểu tượng, quyền đầy đủ của nhóm)
GROUPS = [
    ('admin', 'Admin', 'Quản trị hệ thống: toàn quyền, cấu hình, phân quyền, tài khoản', 'ph-shield-star',
     _m(**{k: ALL for k in MODULE_KEYS})),
    ('director', 'Giám đốc', 'Ban Giám đốc: xem và duyệt mọi phân hệ, phân quyền', 'ph-crown',
     _m(**{k: ALL for k in MODULE_KEYS})),
    ('sales', 'Kinh doanh', 'Báo giá, booking, khách hàng; theo dõi chuyến của khách', 'ph-handshake',
     _m(dashboard='view', sales=ALL, dispatch=VIEW, customs='view', master_data='view create edit export',
        rpt_crm_quotations=VIEW, rpt_active_bookings=VIEW, rpt_wip_trips=VIEW)),
    ('hr', 'Nhân sự', 'Hồ sơ nhân viên, hợp đồng, chấm công, bảng lương', 'ph-users-three',
     _m(dashboard='view', hr=ALL, payroll=ALL, master_data='view')),
    ('accounting', 'Kế toán', 'Sổ quỹ, quyết toán, tạm ứng, sổ sách, lương, báo cáo tài chính', 'ph-calculator',
     _m(dashboard='view', accounting=ALL, advances=ALL, ledger=ALL, payroll=ALL, hr='view export', reports_fin=VIEW,
        reports_ops=VIEW, sales=VIEW, dispatch=VIEW, master_data='view create edit delete export', rpt_crm_quotations=VIEW, rpt_active_bookings=VIEW)),
    ('dispatch', 'Điều vận', 'Chuyến xe, lệnh điều động, tạm ứng tài xế, quỹ điều vận', 'ph-truck',
     _m(dashboard='view', dispatch=ALL, advances=ALL, fleet='view create edit export', customs='view', sales=VIEW,
        reports_ops=VIEW, master_data='view create edit delete export', rpt_crm_quotations=VIEW, rpt_active_bookings=VIEW, rpt_driver_advances=VIEW)),
    ('operations', 'Vận hành', 'Đội xe, rơ-moóc, bảo dưỡng, đăng kiểm, bãi xe', 'ph-wrench',
     _m(dashboard='view', fleet=ALL, dispatch=VIEW, reports_ops=VIEW, master_data='view')),
    ('customs', 'Hải quan', 'Tờ khai VNACCS, phân luồng, thông quan', 'ph-stamp',
     _m(dashboard='view', customs=ALL, dispatch=VIEW, sales='view', master_data='view', rpt_crm_quotations=VIEW, rpt_active_bookings=VIEW, rpt_wip_trips=VIEW)),
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
    'Vận Hành': 'operations', 'Hải Quan': 'customs',
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
    'STAFF_ADMIN_ACC': ('accounting', {}, _m(accounting='delete approve', advances='delete approve', ledger='edit',
                                              payroll='delete approve', master_data='delete')),
    'LEAD_DISPATCH': ('dispatch', {}, {}),
    'DISPATCHER': ('dispatch', {}, {}),
    'DISPATCH_ASST': ('dispatch', {}, _m(dispatch='delete approve', advances='delete approve', master_data='delete')),
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
    keys = {m for m, acts in grants.items() if m in REPORT_CATEGORY and 'view' in acts}
    exported = {m for m, acts in grants.items() if m in REPORT_CATEGORY and 'export' in acts}
    for name, test in DERIVED_MODULES.items():
        acts = (['view'] if test(keys) else []) + (['export'] if test(exported) else [])
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
        if employee is None:
            grants = None  # dùng quy tắc cũ
        else:
            from core.models import UserAccessOverride
            from core.tenant import company_for_user
            company = company_for_user(user)
            pairs = _to_set(role_grants(company, employee.role))
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


def uses_matrix(user):
    return effective_grants(user) is not None


def allowed(user, module, action='view'):
    grants = effective_grants(user)
    if grants is None:
        return False
    return action in grants.get(module, [])


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
    mod = dict((m[0], m[1]) for m in MODULES).get(module, module)
    act = dict(ACTIONS).get(action, action)
    return f'Bạn không có quyền "{act}" trong phân hệ {mod}. Liên hệ Ban Giám đốc để được cấp quyền.'


def can(user, module, action='view'):
    """Kiểm tra quyền ngoài vòng DRF (trong view/template). Tài khoản không có hồ sơ nhân viên: chỉ superuser."""
    if user is not None and getattr(user, 'is_superuser', False):
        return True
    return allowed(user, module, action)


def can_view_finance(user):
    """Số liệu tài chính tổng hợp (quỹ, doanh thu, lãi lỗ): Báo cáo tài chính / Kế toán; tài khoản cũ không hồ sơ thì theo is_staff."""
    return bool(can(user, 'reports_fin', 'view') or can(user, 'accounting', 'view')
                or (user is not None and getattr(user, 'is_authenticated', False) and not uses_matrix(user) and user.is_staff))


def can_view_trip_finance(user):
    """Doanh thu / chi phí / lãi của từng chuyến: ngoài nhóm tài chính còn có Điều vận (sửa chuyến) và Kinh doanh. Tài xế, thợ máy, tài khoản không hồ sơ và link công khai thì không."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    return bool(can_view_finance(user) or can(user, 'dispatch', 'edit') or can(user, 'sales', 'view'))
