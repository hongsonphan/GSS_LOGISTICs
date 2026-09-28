from rest_framework import permissions
from django.conf import settings
from apps.personnel.models import EmployeeRole, Department


class IsAdminOrDirector(permissions.BasePermission):
    """
    Quyền truy cập dành cho Ban Giám Đốc hoặc Quản trị viên hệ thống (Xem P&L, Báo cáo chiến lược).
    Tuân thủ Tiêu chuẩn 11 (SECURITY_AUDIT.md).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role == EmployeeRole.DIRECTOR)


class IsDispatcher(permissions.BasePermission):
    """
    Quyền truy cập dành cho Điều phối viên & Ban Giám Đốc (Tạo lệnh điều động, gán xe, duyệt chi phí).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [EmployeeRole.DISPATCHER, EmployeeRole.DIRECTOR])


class IsAccountant(permissions.BasePermission):
    """
    Quyền truy cập dành cho Kế toán & Ban Giám Đốc (Chốt sổ chi phí, mở sổ, kiểm toán cước, quản lý quỹ).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [EmployeeRole.ACCOUNTANT, EmployeeRole.DIRECTOR])


class IsSalesOrDirector(permissions.BasePermission):
    """
    Quyền truy cập Báo giá (Quotation) & Đơn hàng Booking (Sale CRM):
    - Đọc (SAFE_METHODS: GET, HEAD, OPTIONS): Kinh doanh, Điều phối, Kế toán, Ban Giám Đốc.
    - Ghi / Cập nhật / Xóa: Nhân viên Kinh doanh (SALESMAN) & Ban Giám Đốc (DIRECTOR).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        if not employee:
            return False
        if request.method in permissions.SAFE_METHODS:
            return bool(employee.role in [
                EmployeeRole.SALESMAN,
                EmployeeRole.DISPATCHER,
                EmployeeRole.ACCOUNTANT,
                EmployeeRole.DIRECTOR
            ])
        return bool(employee.role in [EmployeeRole.SALESMAN, EmployeeRole.DIRECTOR] or employee.department == Department.SALES)


class IsDispatcherOrAccountant(permissions.BasePermission):
    """
    Quyền truy cập nghiệp vụ phối hợp giữa Điều phối và Kế toán (Tạm ứng quỹ, tạm ứng chuyến xe).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [
            EmployeeRole.DISPATCHER,
            EmployeeRole.ACCOUNTANT,
            EmployeeRole.DIRECTOR
        ])


class IsCustomsOrDirector(permissions.BasePermission):
    """
    Quyền truy cập dành cho Nhân viên Thủ tục Hải Quan, Điều độ & Ban Giám Đốc.
    Đăng ký và theo dõi Tờ khai hải quan VNACCS/VCIS.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and (
            employee.role in [EmployeeRole.DIRECTOR, EmployeeRole.DISPATCHER] or
            employee.department == Department.CUSTOMS
        ))


class CanManageFleet(permissions.BasePermission):
    """
    Quyền truy cập Quản lý Đội xe, Rơ-moóc & Bãi xe:
    Kỹ thuật viên bãi xe (Mechanic), Điều độ (Dispatcher) & Ban Giám Đốc.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [
            EmployeeRole.MECHANIC,
            EmployeeRole.DISPATCHER,
            EmployeeRole.DIRECTOR
        ])


class CanViewPayroll(permissions.BasePermission):
    """
    Quyền xem Bảng lương & Tạm ứng nhân sự (Bảo mật tiền lương):
    Chỉ Kế toán viên (ACCOUNTANT) và Ban Giám Đốc (DIRECTOR) được phép truy cập.
    Chặn hoàn toàn Tài xế, Điều độ, Thợ máy xem bảng lương người khác.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [EmployeeRole.ACCOUNTANT, EmployeeRole.DIRECTOR])


class CanViewFinancialReports(permissions.BasePermission):
    """
    Quyền xem Báo cáo Tài chính, Sổ quỹ, P&L, Thu hồi chi hộ, Quyết toán thầu phụ:
    Chỉ Ban Giám Đốc (DIRECTOR) và Kế toán (ACCOUNTANT).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [EmployeeRole.ACCOUNTANT, EmployeeRole.DIRECTOR])


class CanViewOperationalReports(permissions.BasePermission):
    """
    Quyền xem Báo cáo Quản trị Vận hành & Thống kê TMS:
    Cho phép Điều phối (DISPATCHER), Kế toán (ACCOUNTANT), Ban Giám Đốc (DIRECTOR).
    Từ chối Tài xế (DRIVER) và Thợ máy (MECHANIC).
    Lưu ý: Nếu role là DISPATCHER, hệ thống tự động ẩn (mask) các số liệu P&L nhạy cảm.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [
            EmployeeRole.DISPATCHER,
            EmployeeRole.ACCOUNTANT,
            EmployeeRole.DIRECTOR
        ])


class CanManageMasterData(permissions.BasePermission):
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
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in [
            EmployeeRole.DIRECTOR,
            EmployeeRole.ACCOUNTANT,
            EmployeeRole.DISPATCHER
        ])


class IsDriver(permissions.BasePermission):
    """
    Quyền truy cập dành cho Tài xế xe đầu kéo / xe tải.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role == EmployeeRole.DRIVER)


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

        # Hỗ trợ Capability Token từ URL hoặc Header cho Trang Tài Xế Mobile (Chỉ chấp nhận Driver Token)
        trip_identifier = view.kwargs.get('trip_code') or request.headers.get('X-Trip-Hash') or request.GET.get('trip_hash')
        if trip_identifier:
            from core.security import decode_driver_hashid, decode_trip_hashid
            decoded_id = decode_driver_hashid(trip_identifier) or decode_trip_hashid(trip_identifier)
            if decoded_id:
                return True
        return False

    def has_object_permission(self, request, view, obj):
        if request.user and (request.user.is_superuser or request.user.is_staff):
            return True

        if request.user and request.user.is_authenticated:
            # Cho phép xem chi tiết (SAFE_METHODS) cho người dùng hợp lệ
            if request.method in permissions.SAFE_METHODS:
                return True

            # Ràng buộc chặt chẽ với thao tác ghi/sửa đổi (Chống IDOR)
            employee = getattr(request.user, 'employee', None)
            if not employee:
                return False
            if employee.role in [EmployeeRole.DISPATCHER, EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT]:
                return True
            if hasattr(obj, 'driver') and obj.driver == employee:
                return True
            return False

        # Kiểm tra Capability Token chống IDOR cho tài xế truy cập trực tiếp (Tuyệt đối không nhận Tracking Token)
        trip_identifier = view.kwargs.get('trip_code') or request.headers.get('X-Trip-Hash') or request.GET.get('trip_hash')
        if trip_identifier:
            from core.security import decode_driver_hashid, decode_trip_hashid
            decoded_id = decode_driver_hashid(trip_identifier) or decode_trip_hashid(trip_identifier)
            if decoded_id and decoded_id == obj.id:
                return True

        return False
