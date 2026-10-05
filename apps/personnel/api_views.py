from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from apps.personnel.models import Employee, Department, EmployeeRole
from apps.personnel.serializers import EmployeeSerializer
from core.permissions import CanViewPayroll, IsAdminOrDirector

class EmployeePermission(permissions.BasePermission):
    """
    Quyền truy cập Phân hệ Nhân Sự:
    - Đọc (GET, HEAD, OPTIONS): Tất cả nhân sự nội bộ đã đăng nhập (hỗ trợ điều độ gán xe, kiểm tra liên lạc).
    - Ghi / Cập nhật / Xóa (POST, PUT, PATCH, DELETE): Kế toán viên, Ban Giám Đốc hoặc Quản trị viên hệ thống.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_superuser or request.user.is_staff:
            return True
        emp = getattr(request.user, 'employee', None)
        return bool(emp and emp.role in [EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT])


class EmployeeListCreateAPIView(APIView):
    """
    API Danh sách & Khai báo Nhân sự mới (Employee CRUD).
    Hỗ trợ tìm kiếm theo Mã NV, Họ Tên, Biệt danh, SĐT và lọc theo Phòng ban / Chức vụ.
    """
    permission_classes = [EmployeePermission]

    def get(self, request):
        qs = Employee.objects.all().order_by('department', 'role', 'code')
        
        # 1. Lọc theo trạng thái
        status_filter = request.GET.get('status')
        if status_filter == 'ACTIVE':
            qs = qs.filter(is_active=True)
        elif status_filter == 'INACTIVE':
            qs = qs.filter(is_active=False)

        # 2. Lọc theo Phòng Ban
        department = request.GET.get('department')
        if department and department != 'ALL':
            qs = qs.filter(department=department)

        # 3. Lọc theo Chức Vụ / Vai Trò
        role = request.GET.get('role')
        if role and role != 'ALL':
            qs = qs.filter(role=role)

        # 4. Tìm kiếm từ khóa (Keyword search)
        q = request.GET.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(code__icontains=q) |
                Q(full_name__icontains=q) |
                Q(nickname__icontains=q) |
                Q(phone_number__icontains=q) |
                Q(license_number__icontains=q)
            )

        serializer = EmployeeSerializer(qs, many=True)
        return Response({
            'results': serializer.data,
            'total': qs.count()
        })

    def post(self, request):
        serializer = EmployeeSerializer(data=request.data)
        if serializer.is_valid():
            employee = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã thêm mới nhân sự '{employee.full_name}' ({employee.code}) thành công.",
                'data': EmployeeSerializer(employee).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'message': 'Dữ liệu khai báo không hợp lệ. Vui lòng kiểm tra lại.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class EmployeeDetailAPIView(APIView):
    """
    API Xem chi tiết, Cập nhật và Xóa mềm (Soft-Delete) Hồ sơ nhân sự.
    """
    permission_classes = [EmployeePermission]

    def get_object(self, pk):
        return get_object_or_404(Employee, pk=pk)

    def get(self, request, pk):
        employee = self.get_object(pk)
        return Response(EmployeeSerializer(employee).data)

    def put(self, request, pk):
        employee = self.get_object(pk)
        serializer = EmployeeSerializer(employee, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã cập nhật hồ sơ nhân sự '{updated.full_name}' ({updated.code}) thành công.",
                'data': EmployeeSerializer(updated).data
            })
        return Response({
            'success': False,
            'message': 'Dữ liệu cập nhật không hợp lệ.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        employee = self.get_object(pk)
        # Soft-delete: Đổi trạng thái sang ngừng hoạt động
        employee.is_active = False
        employee.save(update_fields=['is_active'])
        return Response({
            'success': True,
            'message': f"Đã chuyển nhân sự '{employee.full_name}' ({employee.code}) sang trạng thái tạm ngưng công tác."
        })


class EmployeeStatsAPIView(APIView):
    """
    Thống kê tổng quan cơ cấu nhân sự toàn công ty.
    """
    permission_classes = [EmployeePermission]

    def get(self, request):
        total_employees = Employee.objects.count()
        active_employees = Employee.objects.filter(is_active=True).count()
        drivers_count = Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True).count()
        dispatchers_count = Employee.objects.filter(role=EmployeeRole.DISPATCHER, is_active=True).count()
        accountants_count = Employee.objects.filter(role=EmployeeRole.ACCOUNTANT, is_active=True).count()
        sales_count = Employee.objects.filter(role=EmployeeRole.SALESMAN, is_active=True).count()
        mechanics_count = Employee.objects.filter(role=EmployeeRole.MECHANIC, is_active=True).count()
        directors_count = Employee.objects.filter(role=EmployeeRole.DIRECTOR, is_active=True).count()
        inactive_count = Employee.objects.filter(is_active=False).count()

        # Danh sách phòng ban và chức vụ để populate dropdown form
        departments = [{'value': c[0], 'label': c[1]} for c in Department.choices]
        roles = [{'value': r[0], 'label': r[1]} for r in EmployeeRole.choices]

        return Response({
            'stats': {
                'total': total_employees,
                'active': active_employees,
                'inactive': inactive_count,
                'drivers': drivers_count,
                'dispatchers': dispatchers_count,
                'accountants': accountants_count,
                'sales': sales_count,
                'mechanics': mechanics_count,
                'directors': directors_count,
            },
            'options': {
                'departments': departments,
                'roles': roles
            }
        })
