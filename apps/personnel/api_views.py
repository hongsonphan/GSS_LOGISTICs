import datetime
from decimal import Decimal
from django.db import models, transaction
from django.db.models import Q, Sum, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core import access

from apps.personnel.models import Employee, Department, EmployeeRole, EmployeeGender
from apps.personnel.serializers import EmployeeSerializer
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.master_data.models import CompanyProfile


class EmployeePermission(permissions.BasePermission):
    """
    Phân hệ Nhân sự (ma trận phân quyền, phân hệ "hr"):
    - Xem danh sách / hồ sơ: mọi nhân sự đăng nhập, nhưng người không có quyền Xem Nhân sự chỉ nhận thông tin danh bạ
      (không CCCD, ngân hàng, địa chỉ, lương) — xem `employee_payload`.
    - Tạo / Sửa / Xoá / Nhập / Xuất: theo quyền tương ứng của phân hệ Nhân sự.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS and not access.action_for(request, view) == 'export':
            return True
        if user.is_superuser:
            return True
        if not access.uses_matrix(user):
            return bool(user.is_staff)
        if access.request_allowed(request, 'hr', view):
            return True
        self.message = access.denied_message('hr', access.action_for(request, view))
        return False


class HRRecordPermission(permissions.BasePermission):
    """Dữ liệu nhân sự nhạy cảm (người phụ thuộc, hợp đồng lao động): cần quyền phân hệ Nhân sự cả khi xem."""
    module = 'hr'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if not access.uses_matrix(user):
            return bool(user.is_staff)
        if access.request_allowed(request, self.module, view):
            return True
        self.message = access.denied_message(self.module, access.action_for(request, view))
        return False


# Thông tin danh bạ được phép trả cho người không có quyền Xem Nhân sự
_DIRECTORY_FIELDS = ('id', 'code', 'full_name', 'nickname', 'phone_number', 'zalo_id', 'email', 'department',
                     'department_display', 'role', 'role_display', 'is_active', 'is_department_head', 'avatar', 'avatar_url')


def employee_payload(request, data, employee=None):
    """Lọc dữ liệu hồ sơ theo quyền: đủ quyền Xem Nhân sự hoặc xem hồ sơ của chính mình -> đầy đủ."""
    user = request.user
    if user.is_superuser or access.can(user, 'hr', 'view') or (not access.uses_matrix(user) and user.is_staff):
        return data
    own = getattr(user, 'employee', None)
    if employee is not None and own is not None and own.pk == employee.pk:
        return data
    strip = lambda d: {k: v for k, v in d.items() if k in _DIRECTORY_FIELDS}
    return [strip(d) for d in data] if isinstance(data, list) else strip(data)


# ==============================================================================
# 1. HỒ SƠ NHÂN SỰ (EMPLOYEE CRUD & STATS)
# ==============================================================================

class EmployeeListCreateAPIView(APIView):
    permission_classes = [EmployeePermission]

    def get(self, request):
        qs = Employee.objects.all().order_by('department', 'role', 'code')
        
        status_filter = request.GET.get('status')
        if status_filter == 'ACTIVE':
            qs = qs.filter(is_active=True)
        elif status_filter == 'INACTIVE':
            qs = qs.filter(is_active=False)

        department = request.GET.get('department')
        if department and department != 'ALL':
            qs = qs.filter(department=department)

        role = request.GET.get('role')
        if role and role != 'ALL':
            qs = qs.filter(role=role)

        q = request.GET.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(code__icontains=q) |
                Q(full_name__icontains=q) |
                Q(nickname__icontains=q) |
                Q(phone_number__icontains=q) |
                Q(national_id__icontains=q) |
                Q(bank_account__icontains=q) |
                Q(license_number__icontains=q)
            )

        if not (request.user.is_superuser or access.can(request.user, 'hr', 'view')):
            # Không có quyền Nhân sự: không cho tìm theo CCCD / số tài khoản
            q_sensitive = request.GET.get('q', '').strip()
            if q_sensitive:
                qs = Employee.objects.filter(pk__in=qs.values('pk')).filter(
                    Q(code__icontains=q_sensitive) | Q(full_name__icontains=q_sensitive) |
                    Q(nickname__icontains=q_sensitive) | Q(phone_number__icontains=q_sensitive))
        serializer = EmployeeSerializer(qs, many=True)
        return Response({
            'results': employee_payload(request, serializer.data),
            'total': qs.count()
        })

    def post(self, request):
        serializer = EmployeeSerializer(data=request.data)
        if serializer.is_valid():
            employee = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã khai báo nhân sự '{employee.full_name}' ({employee.code}) thành công.",
                'data': EmployeeSerializer(employee).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'message': 'Dữ liệu khai báo không hợp lệ.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class EmployeeDetailAPIView(APIView):
    permission_classes = [EmployeePermission]

    def get_object(self, pk):
        return get_object_or_404(Employee, pk=pk)

    def get(self, request, pk):
        employee = self.get_object(pk)
        return Response(employee_payload(request, EmployeeSerializer(employee).data, employee))

    def put(self, request, pk):
        employee = self.get_object(pk)
        serializer = EmployeeSerializer(employee, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã cập nhật hồ sơ '{updated.full_name}' ({updated.code}) thành công.",
                'data': EmployeeSerializer(updated).data
            })
        return Response({
            'success': False,
            'message': 'Dữ liệu cập nhật không hợp lệ.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        employee = self.get_object(pk)

        from apps.dispatch.models import DispatchTrip
        from apps.billing.models import DriverTripAdvance, TripExpense
        from apps.fleet.models import Vehicle
        from django.db.models import Q

        reasons = []
        t_count = DispatchTrip.objects.filter(
            Q(driver=employee) | Q(dropoff_driver=employee) | Q(dispatcher=employee),
            is_deleted=False
        ).count()
        if t_count > 0:
            reasons.append(f"{t_count} chuyến xe điều vận")

        a_count = DriverTripAdvance.objects.filter(driver=employee, is_deleted=False).count()
        if a_count > 0:
            reasons.append(f"{a_count} phiếu tạm ứng tài xế")

        e_count = TripExpense.objects.filter(driver=employee, is_deleted=False).count()
        if e_count > 0:
            reasons.append(f"{e_count} chứng từ chi phí")

        if reasons:
            return Response({
                'error': f"Không thể xóa nhân sự '{employee.full_name}' ({employee.code}) vì đã phát sinh dữ liệu liên quan ({', '.join(reasons)}). Vui lòng xử lý các phát sinh trước khi xóa nhân sự này!"
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        employee.is_active = False
        employee.is_deleted = True
        employee.deleted_at = now
        if employee.user_id:
            employee.user = None
            employee.save(update_fields=['is_active', 'is_deleted', 'deleted_at', 'user'])
        else:
            employee.save(update_fields=['is_active', 'is_deleted', 'deleted_at'])

        # Hủy gán xe nếu đang là tài xế chính của phương tiện
        Vehicle.objects.filter(current_driver=employee).update(current_driver=None)

        # Tắt kích hoạt tài khoản đăng nhập nếu có liên kết
        if employee.user:
            employee.user.is_active = False
            employee.user.save(update_fields=['is_active'])

        return Response({
            'success': True,
            'message': f"Đã chuyển nhân sự '{employee.full_name}' ({employee.code}) sang trạng thái tạm ngưng công tác và xóa mềm an toàn."
        })


class EmployeeStatsAPIView(APIView):
    permission_classes = [EmployeePermission]

    def get(self, request):
        today = timezone.now().date()
        warning_date = today + datetime.timedelta(days=30)

        total_employees = Employee.objects.count()
        active_employees = Employee.objects.filter(is_active=True).count()
        inactive_count = Employee.objects.filter(is_active=False).count()

        drivers_count = Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True).count()
        dispatchers_count = Employee.objects.filter(role=EmployeeRole.DISPATCHER, is_active=True).count()
        accountants_count = Employee.objects.filter(role=EmployeeRole.ACCOUNTANT, is_active=True).count()
        sales_count = Employee.objects.filter(role=EmployeeRole.SALESMAN, is_active=True).count()
        mechanics_count = Employee.objects.filter(role=EmployeeRole.MECHANIC, is_active=True).count()
        directors_count = Employee.objects.filter(role=EmployeeRole.DIRECTOR, is_active=True).count()

        # Cảnh báo hạn GPLX tài xế (trong vòng 30 ngày)
        expiring_licenses = Employee.objects.filter(
            role=EmployeeRole.DRIVER,
            is_active=True,
            license_expiry__isnull=False,
            license_expiry__lte=warning_date
        ).values('id', 'code', 'full_name', 'license_number', 'license_expiry')


        departments = [{'value': c[0], 'label': c[1]} for c in Department.choices]
        roles = [{'value': r[0], 'label': r[1]} for r in EmployeeRole.choices]

        # Tính toán chi tiết 5 Thẻ Vận Hành Nhân Sự & Tiền Lương Thực Tế
        drivers_on_trip = DispatchTrip.objects.filter(
            status__in=[TripStatus.ACCEPTED, TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.RETURNING_EMPTY],
            is_deleted=False
        ).values('driver').distinct().count()
        drivers_standby = max(0, drivers_count - drivers_on_trip)
        office_total = dispatchers_count + accountants_count + sales_count + mechanics_count + directors_count

        exp_lic_count = expiring_licenses.count()
        total_compliance_warning = exp_lic_count

        card_total = {
            'total': total_employees,
            'line_1': f"{active_employees} Đang làm việc",
            'line_2': f"{active_employees} Đang làm việc · {inactive_count} Nghỉ"
        }
        card_drivers = {
            'total': drivers_count,
            'line_1': f"{drivers_on_trip} Trên tuyến",
            'line_2': f"{drivers_standby} Sẵn sàng"
        }
        card_office = {
            'total': office_total,
            'line_1': f"{dispatchers_count} Điều vận · {sales_count} Sales",
            'line_2': f"{accountants_count} Kế toán · {mechanics_count + directors_count} QL"
        }
        card_compliance = {
            'total': total_compliance_warning,
            'line_1': f"{exp_lic_count} GPLX sắp hạn",
            'line_2': ''
        }

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
                'expiring_licenses_count': exp_lic_count,
                # Cấu trúc 5 Thẻ Nhân Sự Chuẩn
                'card_total': card_total,
                'card_drivers': card_drivers,
                'card_office': card_office,
                'card_compliance': card_compliance,
            },
            'expiring_licenses': list(expiring_licenses),
            'options': {
                'departments': departments,
                'roles': roles
            }
        })


class EmployeeExportTemplateAPIView(APIView):
    """
    API Tải file Excel mẫu để nhập hồ sơ nhân sự
    """
    permission_classes = [HRRecordPermission]

    def get(self, request):
        import io
        from django.http import HttpResponse
        from apps.personnel.import_export_service import generate_employee_template
        wb, filename = generate_employee_template()
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class EmployeeImportAPIView(APIView):
    """
    API Nhập danh sách nhân sự từ file Excel (.xlsx, .xls)
    """
    permission_classes = [HRRecordPermission]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'Vui lòng chọn file Excel để nhập dữ liệu!'}, status=status.HTTP_400_BAD_REQUEST)

        update_existing = str(request.POST.get('update_existing', 'false')).lower() in ['true', '1', 'yes']
        from apps.personnel.import_export_service import import_employees_from_excel
        result = import_employees_from_excel(file_obj, update_existing=update_existing, user=request.user)
        if not result.get('success'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class EmployeeExportDataAPIView(APIView):
    """
    API Xuất toàn bộ danh sách nhân sự hiện tại ra file Excel
    """
    permission_classes = [HRRecordPermission]

    def get(self, request):
        import io
        from django.http import HttpResponse
        from apps.personnel.import_export_service import export_employees_to_excel
        from apps.personnel.models import Employee

        qs = Employee.objects.all().order_by('department', 'role', 'code')
        status_filter = request.GET.get('status')
        if status_filter == 'ACTIVE':
            qs = qs.filter(is_active=True)
        elif status_filter == 'INACTIVE':
            qs = qs.filter(is_active=False)

        dept = request.GET.get('department')
        if dept and dept != 'ALL':
            qs = qs.filter(department=dept)

        wb, filename = export_employees_to_excel(qs)
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class AvailableUsersAPIView(APIView):
    """Danh sách tài khoản người dùng để liên kết vào hồ sơ nhân sự."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from core.tenant import company_for_user, users_of_company
        User = get_user_model()
        company = company_for_user(request.user)
        users = users_of_company(company, User.objects.filter(is_active=True)).select_related('employee').order_by('username')
        data = []
        for u in users:
            emp = getattr(u, 'employee', None)
            is_active_emp = emp is not None and not emp.is_deleted
            data.append({
                'id': u.id,
                'username': u.username,
                'full_name': u.get_full_name() or u.username,
                'email': u.email or '',
                'assigned_to_id': emp.id if is_active_emp else None,
                'assigned_to_code': emp.code if is_active_emp else None,
                'assigned_to_name': emp.full_name if is_active_emp else None,
            })
        return Response({'results': data})
