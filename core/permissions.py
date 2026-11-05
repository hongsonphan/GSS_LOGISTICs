from rest_framework import permissions

from core import access
from django.conf import settings
from apps.personnel.models import EmployeeRole, Department


class LegacyIsAdminOrDirector(permissions.BasePermission):
    """
    Quyền truy cập dành cho Ban Giám Đốc hoặc Quản trị viên hệ thống (Xem P&L, Báo cáo chiến lược).
    Chỉ Quản trị viên (superuser/staff) hoặc Giám đốc mới có toàn quyền.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or (request.user.is_staff and request.user.has_perm('auth.change_user')):
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(
            (employee and employee.role == EmployeeRole.DIRECTOR) or
            request.user.groups.filter(name='Ban Giám Đốc').exists()
        )


class LegacyIsDispatcher(permissions.BasePermission):
    """
    Quyền truy cập dành cho Điều phối viên & Ban Giám Đốc:
    - Đọc (SAFE_METHODS: GET, HEAD, OPTIONS): Mọi nhân viên văn phòng (Điều phối, Kế toán, Kinh doanh, Nhân sự, Giám đốc).
    - Ghi (POST, PUT, PATCH, DELETE): Chỉ Điều phối viên & Ban Giám Đốc.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.has_perm('dispatch.view_dispatchtrip') or request.user.has_perm('dispatch.change_dispatchtrip'):
            return True
        employee = getattr(request.user, 'employee', None)
        if not employee:
            return bool(request.user.groups.filter(name__in=['Điều Phối Viên', 'Ban Giám Đốc', 'Kế Toán Cước', 'Kinh Doanh (Sales)']).exists())
        if employee.role == EmployeeRole.DRIVER:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            employee.role in [EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH, EmployeeRole.DIRECTOR] or
            employee.department == Department.DISPATCH or
            request.user.groups.filter(name__in=['Điều Phối Viên', 'Ban Giám Đốc']).exists()
        )


class LegacyIsAccountant(permissions.BasePermission):
    """
    Quyền truy cập dành cho Kế toán & Ban Giám Đốc (Chốt sổ chi phí, mở sổ, kiểm toán cước, quản lý quỹ).
    Kiểm tra quyền billing.view_tripexpense hoặc billing.view_cashtransaction.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.has_perm('billing.view_tripexpense') or request.user.has_perm('billing.view_cashtransaction'):
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(
            (employee and employee.role in [EmployeeRole.ACCOUNTANT, EmployeeRole.DIRECTOR]) or
            request.user.groups.filter(name__in=['Kế Toán Cước', 'Ban Giám Đốc']).exists()
        )


class LegacyIsSalesOrDirector(permissions.BasePermission):
    """
    Quyền truy cập Báo giá (Quotation) & Đơn hàng Booking (Sale CRM):
    - Đọc (SAFE_METHODS: GET, HEAD, OPTIONS): Kinh doanh, Điều phối, Kế toán, Ban Giám Đốc.
    - Ghi / Cập nhật / Xóa: Nhân viên Kinh doanh (SALESMAN) & Ban Giám Đốc (DIRECTOR).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.method in permissions.SAFE_METHODS:
            if request.user.has_perm('customers.view_bookingorder') or request.user.has_perm('customers.view_quotation'):
                return True
        else:
            if request.user.has_perm('customers.change_quotation') or request.user.has_perm('customers.add_quotation'):
                return True

        employee = getattr(request.user, 'employee', None)
        if not employee:
            return bool(request.user.groups.filter(name__in=['Kinh Doanh (Sales)', 'Ban Giám Đốc']).exists())
        if request.method in permissions.SAFE_METHODS:
            return bool(employee.role in [
                EmployeeRole.SALESMAN,
                EmployeeRole.DISPATCHER,
                EmployeeRole.ACCOUNTANT,
                EmployeeRole.DIRECTOR
            ])
        return bool(employee.role in [EmployeeRole.SALESMAN, EmployeeRole.DIRECTOR] or employee.department == Department.SALES)


class LegacyIsDispatcherOrAccountant(permissions.BasePermission):
    """
    Quyền truy cập nghiệp vụ phối hợp giữa Điều phối và Kế toán (Tạm ứng quỹ, tạm ứng chuyến xe).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.has_perm('billing.view_drivertripadvance') or request.user.has_perm('billing.view_dispatcheradvancefund'):
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(
            (employee and employee.role in [EmployeeRole.DISPATCHER, EmployeeRole.ACCOUNTANT, EmployeeRole.DIRECTOR]) or
            request.user.groups.filter(name__in=['Điều Phối Viên', 'Kế Toán Cước', 'Ban Giám Đốc']).exists()
        )


class LegacyIsCustomsOrDirector(permissions.BasePermission):
    """
    Quyền truy cập dành cho Nhân viên Thủ tục Hải Quan, Điều độ & Ban Giám Đốc.
    Đăng ký và theo dõi Tờ khai hải quan VNACCS/VCIS.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.has_perm('customs.view_customsdeclaration'):
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(
            (employee and (
                employee.role in [EmployeeRole.DIRECTOR, EmployeeRole.DISPATCHER] or
                employee.department == Department.CUSTOMS
            )) or
            request.user.groups.filter(name__in=['Điều Phối Viên', 'Ban Giám Đốc']).exists()
        )


class LegacyCanManageFleet(permissions.BasePermission):
    """
    Quyền truy cập Quản lý Đội xe, Rơ-moóc & Bãi xe:
    Kỹ thuật viên bãi xe (Mechanic), Điều độ (Dispatcher) & Ban Giám Đốc.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.has_perm('fleet.view_vehicle') or request.user.has_perm('fleet.change_vehicle'):
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(
            (employee and employee.role in [EmployeeRole.MECHANIC, EmployeeRole.DISPATCHER, EmployeeRole.DIRECTOR]) or
            request.user.groups.filter(name__in=['Điều Phối Viên', 'Ban Giám Đốc']).exists()
        )


class LegacyCanViewPayroll(permissions.BasePermission):
    """
    Quyền xem Bảng lương & Tạm ứng nhân sự (Bảo mật tiền lương):
    Chỉ Kế toán viên (ACCOUNTANT), Quản Lý Nhân Sự và Ban Giám Đốc (DIRECTOR) được phép truy cập.
    Chặn hoàn toàn Tài xế, Điều độ, Thợ máy xem bảng lương người khác.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.has_perm('personnel.view_employee') and (
            request.user.groups.filter(name__in=['Kế Toán Cước', 'Quản Lý Nhân Sự', 'Ban Giám Đốc']).exists()
        ):
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [EmployeeRole.ACCOUNTANT, EmployeeRole.DIRECTOR])


class LegacyCanViewFinancialReports(permissions.BasePermission):
    """
    Quyền xem Báo cáo Tài chính, Sổ quỹ, P&L, Thu hồi chi hộ, Quyết toán thầu phụ:
    Chỉ Ban Giám Đốc (DIRECTOR) và Kế toán (ACCOUNTANT) hoặc người có quyền view_financial_report.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.has_perm('reports.view_financial_report'):
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [EmployeeRole.ACCOUNTANT, EmployeeRole.DIRECTOR])


class LegacyCanViewOperationalReports(permissions.BasePermission):
    """
    Quyền xem Báo cáo Quản trị Vận hành & Thống kê TMS:
    - Cho phép nếu có quyền reports.view_operational_report, view_financial_report hoặc bất kỳ quyền xem báo cáo cụ thể nào.
    - Fallback theo vai trò: Ban Giám Đốc, Kế toán, Điều vận.
    - Nhân viên Kinh doanh hoặc Nhân sự chỉ được xem nếu được cấp quyền báo cáo cụ thể tương ứng.
    - Từ chối Tài xế (DRIVER) và Thợ máy (MECHANIC).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        employee = getattr(request.user, 'employee', None)
        if employee and employee.role in [EmployeeRole.DRIVER, EmployeeRole.MECHANIC]:
            return False

        # Kiểm tra permission cụ thể
        if (request.user.has_perm('reports.view_operational_report') or
            request.user.has_perm('reports.view_financial_report') or
            any(p.startswith('reports.view_report_') for p in request.user.get_all_permissions())):
            return True

        # Fallback theo vai trò chuyên môn vận hành / tài chính
        return bool(
            (employee and employee.role in [
                EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH,
                EmployeeRole.ACCOUNTANT, EmployeeRole.LEAD_ADMIN_ACC, EmployeeRole.STAFF_ADMIN_ACC,
                EmployeeRole.DIRECTOR
            ]) or
            request.user.groups.filter(name__in=['Điều Phối Viên', 'Kế Toán Cước', 'Ban Giám Đốc']).exists()
        )


class LegacyCanManageMasterData(permissions.BasePermission):
    """
    Quyền xem & cấu hình Hệ thống Danh Mục (Master Data):
    - Đọc (SAFE_METHODS: GET, HEAD, OPTIONS): Tất cả nhân viên nội bộ đã đăng nhập.
    - Ghi / Cập nhật (POST, PUT, PATCH, DELETE): Kế toán (cước/biểu giá), Điều độ hoặc Ban Giám Đốc.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_superuser:
            return True
        if request.user.has_perm('master_data.change_driversalarytariff') or request.user.has_perm('master_data.change_location'):
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(
            (employee and employee.role in [EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT, EmployeeRole.DISPATCHER]) or
            request.user.groups.filter(name__in=['Ban Giám Đốc', 'Kế Toán Cước', 'Điều Phối Viên']).exists()
        )


# =============================================================================
# LỚP QUYỀN THEO MA TRẬN PHÂN QUYỀN (core/access.py)
# Người dùng có hồ sơ nhân viên: quyết định bởi ma trận Chức danh × Phân hệ × Thao tác + ngoại lệ cá nhân.
# Tài khoản không có hồ sơ nhân viên: giữ quy tắc cũ (Legacy*) — nhóm/quyền Django.
# =============================================================================
class ModulePermission(permissions.BasePermission):
    module = None
    legacy = None

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if not access.uses_matrix(user):
            return bool(self.legacy and self.legacy().has_permission(request, view))
        if access.request_allowed(request, self.module, view):
            return True
        self.message = access.denied_message(self.module, access.action_for(request, view))
        return False


def module_permission(module, legacy=None, name=None):
    """Tạo lớp quyền cho một phân hệ: permission_classes = [module_permission('ledger')]."""
    return type(name or f'Module_{module}_Permission', (ModulePermission,), {'module': module, 'legacy': legacy})


def any_module_view(*modules, name='AnyModuleView'):
    """Cho phép xem khi người dùng có quyền Xem ở ít nhất một trong các phân hệ (tài khoản không dùng ma trận: như cũ, chỉ cần đăng nhập)."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or not access.uses_matrix(user):
            return True
        if any(access.allowed(user, m, 'view') for m in modules):
            return True
        self.message = 'Bạn không có quyền xem dữ liệu này. Liên hệ Ban Giám Đốc để được cấp quyền.'
        return False
    return type(name, (permissions.BasePermission,), {'has_permission': has_permission})


IsAdminOrDirector = module_permission('admin', LegacyIsAdminOrDirector, 'IsAdminOrDirector')
IsDispatcher = module_permission('dispatch', LegacyIsDispatcher, 'IsDispatcher')
IsAccountant = module_permission('accounting', LegacyIsAccountant, 'IsAccountant')
IsSalesOrDirector = module_permission('sales', LegacyIsSalesOrDirector, 'IsSalesOrDirector')
IsDispatcherOrAccountant = module_permission('advances', LegacyIsDispatcherOrAccountant, 'IsDispatcherOrAccountant')
IsCustomsOrDirector = module_permission('customs', LegacyIsCustomsOrDirector, 'IsCustomsOrDirector')
CanManageFleet = module_permission('fleet', LegacyCanManageFleet, 'CanManageFleet')
CanViewPayroll = module_permission('payroll', LegacyCanViewPayroll, 'CanViewPayroll')
CanViewFinancialReports = module_permission('reports_fin', LegacyCanViewFinancialReports, 'CanViewFinancialReports')
CanViewOperationalReports = module_permission('reports_any', LegacyCanViewOperationalReports, 'CanViewOperationalReports')
class CanManageMasterData(permissions.BasePermission):
    """Danh mục / Cài đặt theo từng tab: ghi, xoá, nhập, xuất cần quyền đúng tab (view.cfg_module hoặc view.cfg_module_for(request)).
    Đọc danh sách để chọn trong biểu mẫu chỉ cần quyền Danh mục (đọc) hoặc quyền xem của tab."""
    legacy = LegacyCanManageMasterData

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if not access.uses_matrix(user):
            return bool(self.legacy().has_permission(request, view))
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
CanUseLedger = module_permission('ledger', LegacyCanViewFinancialReports, 'CanUseLedger')
CanViewSettlementVoucherReport = module_permission('rpt_settlement_vouchers', LegacyCanViewFinancialReports, 'CanViewSettlementVoucherReport')
CanManageHR = module_permission('hr', None, 'CanManageHR')
CanManagePayroll = module_permission('payroll', LegacyCanViewPayroll, 'CanManagePayroll')
CanAdministerAccess = module_permission('admin', LegacyIsAdminOrDirector, 'CanAdministerAccess')


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
    """Trả về chuyến xe nếu identifier là Driver Token còn hiệu lực (hoặc HashID tài xế đời cũ của chuyến chưa có token)."""
    if not identifier:
        return None
    from apps.dispatch.models import DispatchTrip
    trip = DispatchTrip.objects.filter(driver_token=identifier).first()
    if trip:
        return trip
    from core.security import decode_driver_hashid
    decoded_id = decode_driver_hashid(identifier)
    if decoded_id:
        legacy_trip = DispatchTrip.objects.filter(id=decoded_id).first()
        if legacy_trip and not legacy_trip.driver_token:
            return legacy_trip
    return None


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
                if not access.uses_matrix(request.user):
                    return True
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
            from core.security import decode_driver_hashid, decode_trip_hashid
            decoded_id = decode_driver_hashid(trip_identifier) or decode_trip_hashid(trip_identifier)
            if decoded_id and decoded_id == obj.id and (not getattr(obj, 'driver_token', None) or obj.driver_token == trip_identifier):
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
    return access.can_view_finance(user) or access.can(user, 'dispatch', 'view') or access.can(user, 'hr', 'view') or access.can(user, 'payroll', 'view')


FinanceMasterOnly = restricted_by(_sees_finance_master, 'Số dư đầu kỳ chỉ dành cho Kế toán / Ban Giám đốc.')
PayMasterOnly = restricted_by(_sees_pay_master, 'Biểu giá lương tài xế và phụ cấp chỉ dành cho Điều vận, Nhân sự, Kế toán.')
