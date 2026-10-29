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
    ('reports_ops', 'Báo cáo vận hành', 'Báo cáo điều vận, DEM/DET, đúng giờ, chi phí tuyến', ['view', 'export']),
    ('reports_fin', 'Báo cáo tài chính', 'Lãi lỗ, doanh thu khách hàng, công nợ, quỹ', ['view', 'export']),
    ('master_data', 'Danh mục', 'Cảng, kho, tuyến, đơn giá, loại chi phí, đối tác', ['view', 'create', 'edit', 'delete', 'export']),
    ('admin', 'Quản trị hệ thống', 'Phân quyền, tài khoản người dùng, thông tin công ty', ['view', 'edit']),
]
MODULE_KEYS = [m[0] for m in MODULES]
MODULE_ACTIONS = {m[0]: m[3] for m in MODULES}

ALL = 'view create edit delete approve export'
VIEW = 'view export'


def _m(**mods):
    return {k: [a for a in v.split() if a in MODULE_ACTIONS[k]] for k, v in mods.items()}


# ----------------------------------------------------------------------------- Nhóm quyền (mặc định)
# (khoá, tên, mô tả, biểu tượng, quyền đầy đủ của nhóm)
GROUPS = [
    ('admin', 'Admin', 'Quản trị hệ thống: toàn quyền, cấu hình, phân quyền, tài khoản', 'ph-shield-star',
     _m(**{k: ALL for k in MODULE_KEYS})),
    ('director', 'Giám đốc', 'Ban Giám đốc: xem và duyệt mọi phân hệ, phân quyền', 'ph-crown',
     _m(**{k: ALL for k in MODULE_KEYS})),
    ('sales', 'Kinh doanh', 'Báo giá, booking, khách hàng; theo dõi chuyến của khách', 'ph-handshake',
     _m(dashboard='view', sales=ALL, dispatch=VIEW, customs='view', master_data='view create edit export')),
    ('hr', 'Nhân sự', 'Hồ sơ nhân viên, hợp đồng, chấm công, bảng lương', 'ph-users-three',
     _m(dashboard='view', hr=ALL, payroll=ALL, master_data='view')),
    ('accounting', 'Kế toán', 'Sổ quỹ, quyết toán, tạm ứng, sổ sách, lương, báo cáo tài chính', 'ph-calculator',
     _m(dashboard='view', accounting=ALL, advances=ALL, ledger=ALL, payroll=ALL, hr='view export', reports_fin=VIEW,
        reports_ops=VIEW, sales=VIEW, dispatch=VIEW, master_data='view create edit delete export')),
    ('dispatch', 'Điều vận', 'Chuyến xe, lệnh điều động, tạm ứng tài xế, quỹ điều vận', 'ph-truck',
     _m(dashboard='view', dispatch=ALL, advances=ALL, fleet='view create edit export', customs='view', sales=VIEW,
        reports_ops=VIEW, master_data='view create edit delete export')),
    ('operations', 'Vận hành', 'Đội xe, rơ-moóc, bảo dưỡng, đăng kiểm, bãi xe', 'ph-wrench',
     _m(dashboard='view', fleet=ALL, dispatch=VIEW, reports_ops=VIEW, master_data='view')),
    ('customs', 'Hải quan', 'Tờ khai VNACCS, phân luồng, thông quan', 'ph-stamp',
     _m(dashboard='view', customs=ALL, dispatch=VIEW, sales='view', master_data='view')),
]
GROUP_KEYS = [g[0] for g in GROUPS]
GROUP_LABELS = {g[0]: g[1] for g in GROUPS}
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
    for mod, acts in (grants or {}).items():
        if mod in MODULE_ACTIONS and isinstance(acts, (list, tuple)):
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
        return default_position(role)
    group = row.group if row.group in GROUP_KEYS or row.group == '' else default_position(role)[0]
    return group, _clean(row.add), _clean(row.remove)


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


def effective_grants(user):
    """{module: [actions]} của người dùng; ghi nhớ trên đối tượng user trong một request."""
    if user is None or isinstance(user, AnonymousUser) or not user.is_authenticated or not user.is_active:
        return {}
    cached = getattr(user, '_bim_access', None)
    if cached is not None:
        return cached
    if user.is_superuser:
        grants = {m: list(MODULE_ACTIONS[m]) for m in MODULE_KEYS}
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
                for key in ov.groups or []:
                    if key in GROUP_KEYS:
                        pairs |= _to_set(group_grants(company, key))
                pairs |= _to_set(_clean(ov.allow))
                pairs -= _to_set(_clean(ov.deny))
            grants = _from_set(pairs)
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
