"""Ma trận phân quyền: Chức danh × Phân hệ × Thao tác, cộng ngoại lệ từng người.

- Quyền hiệu lực của một người = quyền của chức danh (RoleAccess, chưa cấu hình thì dùng DEFAULT_MATRIX)
  + quyền cho thêm − quyền chặn riêng (UserAccessOverride).
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

# Chức danh theo phòng ban (thứ tự hiển thị)
ROLE_GROUPS = [
    ('Ban Giám đốc', ['DIRECTOR']),
    ('Hành chính & Kế toán', ['LEAD_ADMIN_ACC', 'STAFF_ADMIN_ACC', 'ACCOUNTANT']),
    ('Điều vận', ['LEAD_DISPATCH', 'DISPATCHER', 'DISPATCH_ASST', 'DRIVER']),
    ('Kinh doanh', ['LEAD_SALES', 'SALESMAN', 'CSKH']),
    ('Bảo trì vận hành', ['LEAD_MAINT', 'MECHANIC']),
    ('Dịch vụ hải quan', ['LEAD_CUSTOMS', 'CUSTOMS_STAFF']),
]

ALL = 'view create edit delete approve export'
VIEW = 'view export'


def _m(**mods):
    return {k: [a for a in v.split() if a in MODULE_ACTIONS[k]] for k, v in mods.items()}


# Mặc định: dựng theo quy tắc phân quyền đang chạy trong mã trước đây (core/permissions.py)
_ACC = dict(dashboard='view', accounting=ALL, advances=ALL, ledger=ALL, payroll=ALL, reports_fin=VIEW, reports_ops=VIEW,
            sales=VIEW, dispatch=VIEW, customs='', master_data='view create edit delete export', hr=ALL, fleet='')
DEFAULT_MATRIX = {
    'DIRECTOR': _m(**{k: ALL for k in MODULE_KEYS}),
    'ACCOUNTANT': _m(**_ACC),
    'LEAD_ADMIN_ACC': _m(**_ACC),
    'STAFF_ADMIN_ACC': _m(dashboard='view', accounting='view create edit export', advances='view create edit export',
                          ledger='view export', reports_fin=VIEW, reports_ops=VIEW, sales=VIEW, dispatch=VIEW,
                          master_data='view', hr='view create edit export'),
    'LEAD_DISPATCH': _m(dashboard='view', dispatch=ALL, advances=ALL, fleet=ALL, customs=ALL,
                        sales=VIEW, reports_ops=VIEW, master_data='view create edit delete export'),
    'DISPATCHER': _m(dashboard='view', dispatch=ALL, advances=ALL,
                     fleet='view create edit delete export', customs='view create edit delete export', sales=VIEW,
                     reports_ops=VIEW, master_data='view create edit delete export'),
    'DISPATCH_ASST': _m(dashboard='view', dispatch='view create edit export', master_data='view'),
    'DRIVER': _m(dashboard='view', master_data='view'),
    'LEAD_SALES': _m(dashboard='view', sales=ALL, dispatch=VIEW, master_data='view'),
    'SALESMAN': _m(dashboard='view', sales='view create edit delete export', dispatch=VIEW, master_data='view'),
    'CSKH': _m(dashboard='view', sales='view create edit export', dispatch=VIEW, master_data='view'),
    'LEAD_MAINT': _m(dashboard='view', fleet=ALL, dispatch=VIEW, master_data='view'),
    'MECHANIC': _m(dashboard='view', fleet='view create edit export', dispatch=VIEW, master_data='view'),
    'LEAD_CUSTOMS': _m(dashboard='view', customs=ALL, dispatch=VIEW, master_data='view'),
    'CUSTOMS_STAFF': _m(dashboard='view', customs='view create edit export', dispatch=VIEW, master_data='view'),
}


def _clean(grants):
    """Chuẩn hoá {module: [actions]} — bỏ phân hệ/thao tác không hợp lệ, sắp xếp theo thứ tự chuẩn."""
    out = {}
    for mod, acts in (grants or {}).items():
        if mod in MODULE_ACTIONS and isinstance(acts, (list, tuple)):
            keep = [a for a in MODULE_ACTIONS[mod] if a in acts]
            if keep:
                out[mod] = keep
    return out


def default_grants(role):
    return {k: list(v) for k, v in DEFAULT_MATRIX.get(role, {'dashboard': ['view']}).items()}


def role_grants(company, role):
    from core.models import RoleAccess
    row = RoleAccess.objects.filter(company=company, role=role).first() if company else None
    return _clean(row.grants) if row else default_grants(role)


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
            pairs = _to_set(role_grants(company_for_user(user), employee.role))
            ov = UserAccessOverride.objects.filter(user=user).first()
            if ov:
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
