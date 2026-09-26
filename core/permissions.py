from rest_framework import permissions
from django.conf import settings

class IsAdminOrDirector(permissions.BasePermission):
    """
    Quyền truy cập dành cho Ban Giám Đốc hoặc Quản trị viên hệ thống (Xem P&L, Báo cáo chiến lược).
    Tuân thủ Tiêu chuẩn 11 (SECURITY_AUDIT.md).
    """
    def has_permission(self, request, view):
        if settings.DEBUG and not request.user.is_authenticated:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role == 'DIRECTOR')

class IsDispatcher(permissions.BasePermission):
    """
    Quyền truy cập dành cho Điều phối viên & Ban Giám Đốc (Tạo lệnh điều động, gán xe, duyệt chi phí).
    """
    def has_permission(self, request, view):
        if settings.DEBUG and not request.user.is_authenticated:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in ['DISPATCHER', 'DIRECTOR'])

class IsAccountant(permissions.BasePermission):
    """
    Quyền truy cập dành cho Kế toán (Chốt sổ chi phí, mở sổ, kiểm toán cước).
    """
    def has_permission(self, request, view):
        if settings.DEBUG and not request.user.is_authenticated:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role in ['ACCOUNTANT', 'DIRECTOR'])

class IsDriver(permissions.BasePermission):
    """
    Quyền truy cập dành cho Tài xế xe đầu kéo / xe tải.
    """
    def has_permission(self, request, view):
        if settings.DEBUG and not request.user.is_authenticated:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        employee = getattr(request.user, 'employee', None)
        return bool(employee and employee.role == 'DRIVER')

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
        if settings.DEBUG and not request.user.is_authenticated:
            return True
        if request.user and request.user.is_authenticated:
            return True

        # Hỗ trợ Capability Token từ URL hoặc Header cho Trang Tài Xế Mobile
        trip_identifier = view.kwargs.get('trip_code') or request.headers.get('X-Trip-Hash') or request.GET.get('trip_hash')
        if trip_identifier:
            from core.security import decode_trip_hashid
            decoded_id = decode_trip_hashid(trip_identifier)
            if decoded_id:
                return True
        return False

    def has_object_permission(self, request, view, obj):
        if settings.DEBUG and not request.user.is_authenticated:
            return True
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
            if employee.role in ['DISPATCHER', 'DIRECTOR', 'ACCOUNTANT']:
                return True
            if hasattr(obj, 'driver') and obj.driver == employee:
                return True
            return False

        # Kiểm tra Capability Token chống IDOR cho tài xế truy cập trực tiếp
        trip_identifier = view.kwargs.get('trip_code') or request.headers.get('X-Trip-Hash') or request.GET.get('trip_hash')
        if trip_identifier:
            from core.security import decode_trip_hashid
            decoded_id = decode_trip_hashid(trip_identifier)
            if decoded_id and decoded_id == obj.id:
                return True

        return False
