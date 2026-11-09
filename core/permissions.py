from rest_framework import permissions

from core import access
from django.conf import settings
from apps.personnel.models import EmployeeRole, Department


# =============================================================================
# LỚP QUYỀN THEO MA TRẬN PHÂN QUYỀN (core/access.py)
# Người dùng có hồ sơ nhân viên: quyết định bởi ma trận Chức danh × Phân hệ × Thao tác + ngoại lệ cá nhân.
# Tài khoản không có hồ sơ nhân viên: chỉ có quyền từ nhóm được gán (UserAccessOverride / nhóm Django tương ứng).
# =============================================================================
class ModulePermission(permissions.BasePermission):
    module = None

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if access.request_allowed(request, self.module, view):
            return True
        self.message = access.denied_message(self.module, access.action_for(request, view))
        return False


def module_permission(module, name=None):
    """Tạo lớp quyền cho một phân hệ: permission_classes = [module_permission('ledger')]."""
    return type(name or f'Module_{module}_Permission', (ModulePermission,), {'module': module})


def any_module_view(*modules, name='AnyModuleView'):
    """Cho phép xem khi người dùng có quyền Xem ở ít nhất một trong các phân hệ."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if any(access.allowed(user, m, 'view') for m in modules):
            return True
        self.message = 'Bạn không có quyền xem dữ liệu này. Liên hệ Ban Giám Đốc để được cấp quyền.'
        return False
    return type(name, (permissions.BasePermission,), {'has_permission': has_permission})


IsAdminOrDirector = module_permission('admin', 'IsAdminOrDirector')
IsDispatcher = module_permission('dispatch', 'IsDispatcher')
IsAccountant = module_permission('accounting', 'IsAccountant')
IsSalesOrDirector = module_permission('sales', 'IsSalesOrDirector')
IsDispatcherOrAccountant = module_permission('advances', 'IsDispatcherOrAccountant')
IsCustomsOrDirector = module_permission('customs', 'IsCustomsOrDirector')
CanManageFleet = module_permission('fleet', 'CanManageFleet')
CanViewFinancialReports = module_permission('reports_fin', 'CanViewFinancialReports')
CanViewOperationalReports = module_permission('reports_any', 'CanViewOperationalReports')
class CanManageMasterData(permissions.BasePermission):
    """Danh mục / Cài đặt theo từng tab: ghi, xoá, nhập, xuất cần quyền đúng tab (view.cfg_module hoặc view.cfg_module_for(request)).
    Đọc danh sách để chọn trong biểu mẫu chỉ cần quyền Danh mục (đọc) hoặc quyền xem của tab."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        module = getattr(view, 'cfg_module', None)
        resolver = getattr(view, 'cfg_module_for', None)
        if resolver is not None:
            module = resolver(request) or module
        action = access.action_for(request, view)
        if action == 'view':
            read_modules = getattr(view, 'read_modules', None)
            if read_modules is not None:   # danh mục nhạy cảm: chỉ đọc khi thuộc nghiệp vụ liên quan hoặc có quyền tab
                ok = any(access.allowed(user, m, 'view') for m in read_modules) or bool(module and access.allowed(user, module, 'view'))
            else:
                ok = access.allowed(user, 'master_data', 'view') or bool(module and access.allowed(user, module, 'view'))
        else:
            ok = bool(module and access.allowed(user, module, action))
        if not ok:
            self.message = access.denied_message(module or 'master_data', action)
        return ok
CanUseLedger = module_permission('ledger', 'CanUseLedger')
CanViewSettlementVoucherReport = module_permission('rpt_settlement_vouchers', 'CanViewSettlementVoucherReport')
CanManageHR = module_permission('hr', 'CanManageHR')
CanAdministerAccess = module_permission('admin', 'CanAdministerAccess')


class IsDriver(permissions.BasePermission):
    """
    Quyền truy cập dành cho Tài xế xe đầu kéo / xe tải.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role == EmployeeRole.DRIVER)


def _trip_for_driver_capability(identifier):
    """Trả về chuyến xe nếu identifier là Driver Token còn hiệu lực."""
    if not identifier:
        return None
    from apps.dispatch.models import DispatchTrip
    return DispatchTrip.objects.filter(driver_token=identifier).first()


class IsTripDriverOrDispatcher(permissions.BasePermission):
    """
    Quyền truy cập chuyến xe (Chống IDOR - Tiêu chuẩn 10):
    - Đọc (GET, HEAD, OPTIONS): Nhân sự nội bộ đã đăng nhập đều có quyền xem chi tiết chuyến xe.
    - Ghi / Cập nhật (POST, PUT, PATCH, DELETE):
      + Điều phối / Giám đốc / Kế toán / Superuser / Staff có toàn quyền điều chỉnh.
      + Tài xế chỉ được cập nhật mốc thời gian / upload chứng từ của chuyến xe được phân công cho chính mình.
      + Capability Token: Tài xế truy cập qua Capability HashID URL (/driver/<trip_hash>/) được phép thực hiện các thao tác mốc thời gian, upload chứng từ và kê khai chi phí cho đúng chuyến xe đó.
    """
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True

        # Tài xế không đăng nhập: chỉ được thao tác trên ĐÚNG chuyến gắn với Driver Token của mình.
        url_ident = view.kwargs.get('trip_code')
        header_ident = request.headers.get('X-Trip-Hash') or request.GET.get('trip_hash')
        token_trip = _trip_for_driver_capability(header_ident or url_ident)
        if not token_trip:
            return False
        if hasattr(token_trip, 'is_driver_portal_expired') and token_trip.is_driver_portal_expired():
            return False
        if url_ident and header_ident and url_ident != header_ident:
            # URL trỏ tới chuyến khác với token đang cầm -> chặn (chống IDOR)
            from apps.dispatch.api_views import get_trip_by_code_or_hash
            url_trip = get_trip_by_code_or_hash(url_ident)
            return bool(url_trip and url_trip.pk == token_trip.pk)
        return True

    def has_object_permission(self, request, view, obj):
        if request.user and (request.user.is_superuser or request.user.is_staff):
            return True

        if request.user and request.user.is_authenticated:
            # Xem chi tiết (SAFE_METHODS): người có quyền Xem ở phân hệ liên quan; tài xế chỉ xem chuyến của chính mình
            if request.method in permissions.SAFE_METHODS:
                if any(access.allowed(request.user, m, 'view') for m in ('dispatch', 'accounting', 'sales', 'customs', 'fleet')):
                    return True
                emp = getattr(request.user, 'employee', None)
                return bool(emp and emp.pk in (getattr(obj, 'driver_id', None), getattr(obj, 'dropoff_driver_id', None)))

            # Ràng buộc chặt chẽ với thao tác ghi/sửa đổi (Chống IDOR)
            employee = getattr(request.user, 'employee', None)
            if not employee:
                return False
            if employee.role in [EmployeeRole.DISPATCHER, EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT]:
                return True
            if hasattr(obj, 'driver') and obj.driver == employee:
                return True
            if hasattr(obj, 'dropoff_driver') and obj.dropoff_driver == employee:
                return True
            return False

        # Kiểm tra Capability Token chống IDOR cho tài xế truy cập trực tiếp (Tuyệt đối không nhận Tracking Token hay Token cũ đã thu hồi)
        trip_identifier = view.kwargs.get('trip_code') or request.headers.get('X-Trip-Hash') or request.GET.get('trip_hash')
        if trip_identifier:
            if hasattr(obj, 'is_driver_portal_expired') and obj.is_driver_portal_expired():
                return False
            if hasattr(obj, 'driver_token') and obj.driver_token and obj.driver_token == trip_identifier:
                return True

        return False


def check_can_edit_or_delete(user, obj, owner_field='created_by', action='edit'):
    """
    Kiểm tra quyền Sửa/Xóa theo nguyên tắc GSS Logistics:
    1. Ban Giám Đốc (DIRECTOR) hoặc Quản trị viên (superuser): Toàn quyền.
    2. Người tạo (Owner): Được quyền Xem, Sửa, Xóa (với điều kiện chưa phát sinh ràng buộc nghiệp vụ khi Xóa).
    3. Trưởng bộ phận (is_department_head): Được quyền sửa/xóa đối với phiếu của nhân viên trong bộ phận.
    4. Nếu đối tượng chưa có owner (dữ liệu cũ/khởi tạo ban đầu): Cho phép nhân sự phòng ban chuyên môn thao tác.
    5. Cấp chuyên môn nghiệp vụ:
       - Tài xế được cập nhật mốc/cont trên chuyến xe được phân công cho mình (khi sửa, không được xóa).
       - Kế toán được đối soát, chốt duyệt các phiếu tài chính/tạm ứng.
       - Điều vận được cập nhật các chuyến xe của đội xe.
    6. Người khác không phải người tạo và không phải cấp cao hơn: Chỉ được Xem, không được Sửa/Xóa.
    """
    if not user or not user.is_authenticated:
        return False, "Yêu cầu đăng nhập để thực hiện thao tác."
    if user.is_superuser:
        return True, ""
    employee = getattr(user, 'employee', None)
    if not employee:
        return False, "Tài khoản chưa được gán hồ sơ nhân viên nội bộ."
    if employee.role == EmployeeRole.DIRECTOR:
        return True, ""

    # Lấy đối tượng người tạo
    owner = getattr(obj, owner_field, None)

    # 1. Nếu chính là người tạo: Toàn quyền thao tác
    if owner and owner == employee:
        return True, ""

    # 2. Trưởng bộ phận cùng phòng ban quản lý nhân viên tạo phiếu
    if getattr(employee, 'is_department_head', False):
        if owner and getattr(owner, 'department', None) == employee.department:
            return True, ""
        elif not owner and getattr(obj, 'department', None) == employee.department:
            return True, ""

    # 3. Trường hợp đối tượng chưa có owner (phiếu cũ hoặc test seed)
    if not owner:
        # Nếu là Chuyến xe: Điều vận hoặc Kế toán được thao tác
        if hasattr(obj, 'trip_code'):
            if employee.role in [EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH, EmployeeRole.ACCOUNTANT]:
                return True, ""
        # Nếu là Báo giá / Booking: Sales được thao tác
        elif hasattr(obj, 'quotation_code') or hasattr(obj, 'booking_code'):
            if employee.role in [EmployeeRole.SALESMAN, EmployeeRole.LEAD_SALES]:
                return True, ""
        # Nếu là Tạm ứng / Sổ quỹ: Kế toán hoặc Điều vận được thao tác
        elif hasattr(obj, 'dispatcher_fund') or hasattr(obj, 'total_disbursed') or hasattr(obj, 'transaction_type'):
            if employee.role in [EmployeeRole.ACCOUNTANT, EmployeeRole.LEAD_ADMIN_ACC, EmployeeRole.STAFF_ADMIN_ACC, EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH]:
                return True, ""

    # 4. Khi SỬA (action == 'edit'): Cho phép thẩm quyền chức năng cụ thể
    if action == 'edit':
        # Tài xế được cập nhật chuyến xe của mình
        if hasattr(obj, 'driver') and getattr(obj, 'driver') == employee:
            return True, ""
        # Kế toán được đối soát chốt sổ tạm ứng & chi phí
        if employee.role in [EmployeeRole.ACCOUNTANT, EmployeeRole.LEAD_ADMIN_ACC]:
            if hasattr(obj, 'dispatcher_fund') or hasattr(obj, 'total_disbursed') or hasattr(obj, 'is_expenses_settled'):
                return True, ""
        # Điều vận được cập nhật thông tin chuyến xe
        if employee.role in [EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH] and hasattr(obj, 'trip_code'):
            return True, ""

    # 5. Khi XÓA (action == 'delete'):
    # TUYỆT ĐỐI chỉ Người tạo hoặc Ban Giám Đốc/Trưởng phòng mới được xóa!
    if action == 'delete':
        return False, "Chỉ người tạo phiếu này hoặc Ban Giám Đốc mới có quyền xóa!"

    return False, "Bạn không phải người tạo phiếu này và không có thẩm quyền cấp cao hơn để sửa/xóa!"


class SharedConfigWritePermission(permissions.BasePermission):
    """Cấu hình dùng chung giữa các công ty (thuế, chính sách lương, hạng mục chi phí...) không có cột company:
    khi hệ thống có nhiều hơn một doanh nghiệp, chỉ quản trị hệ thống (superuser) được ghi, tránh công ty này sửa chung của công ty khác."""
    message = 'Cấu hình dùng chung nhiều doanh nghiệp chỉ do quản trị hệ thống thay đổi.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS or not request.user or request.user.is_superuser:
            return True
        from core.models import Company
        return Company.objects.filter(is_active=True).count() <= 1


def restricted_by(check, message='Bạn không có quyền xem dữ liệu này.'):
    """Lớp quyền bổ sung: người dùng phải thoả check(user) (superuser luôn được)."""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or check(user)))
    return type('RestrictedBy', (permissions.BasePermission,), {'has_permission': has_permission, 'message': message})


def _sees_finance_master(user):
    return access.can_view_finance(user)


def _sees_pay_master(user):
    return access.can_view_finance(user) or access.can(user, 'dispatch', 'view') or access.can(user, 'hr', 'view')


FinanceMasterOnly = restricted_by(_sees_finance_master, 'Số dư đầu kỳ chỉ dành cho Kế toán / Ban Giám đốc.')
PayMasterOnly = restricted_by(_sees_pay_master, 'Biểu giá lương tài xế và phụ cấp chỉ dành cho Điều vận, Nhân sự, Kế toán.')


class IsDepotStaff(ModulePermission):
    """Bãi depot: Thủ bãi (phân hệ `depot`) hoặc Điều vận/Vận hành (đã có `depot` trong nhóm)."""
    module = 'depot'


def any_module(*modules, name='AnyModulePermission'):
    """Cho phép khi người dùng có quyền (theo thao tác của request) ở ít nhất một trong các phân hệ."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if any(access.request_allowed(request, m, view) for m in modules):
            return True
        self.message = access.denied_message(modules[0], access.action_for(request, view))
        return False
    return type(name, (permissions.BasePermission,), {'has_permission': has_permission})


IsPricing = module_permission('pricing', 'IsPricing')
IsBookingStaff = any_module('sales', 'dispatch', name='IsBookingStaff')
IsFinanceStaff = any_module('accounting', name='IsFinanceStaff')
IsTripFinance = any_module('accounting', 'dispatch', name='IsTripFinance')
