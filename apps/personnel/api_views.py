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

from apps.personnel.models import (
    Employee, Department, EmployeeRole, EmployeeGender,
    EmployeeDependent, LaborContract, ContractAppendix, ContractType, ContractStatus, TaxResidentType,
    TaxBracket, SalaryDeductionRate, PayrollPolicyConfig,
    PayrollPeriod, PayrollSlip, PayrollPeriodStatus,
    PayrollParameter, AllowanceGroup, AllowanceType,
    AttendanceCode, DailyAttendance, MonthlyAttendanceSummary
)
from apps.personnel.serializers import (
    EmployeeSerializer,
    EmployeeDependentSerializer,
    LaborContractSerializer,
    ContractAppendixSerializer,
    TaxBracketSerializer,
    SalaryDeductionRateSerializer,
    PayrollPolicyConfigSerializer,
    PayrollPeriodSerializer,
    PayrollSlipSerializer,
    PayrollParameterSerializer,
    AllowanceGroupSerializer,
    AllowanceTypeSerializer,
    AttendanceCodeSerializer,
    DailyAttendanceSerializer,
    MonthlyAttendanceSummarySerializer
)
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.billing.models import CashTransaction, TransactionType, PaymentMethod, CashFlowCategory, DriverTripAdvance
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


class PayrollPermission(HRRecordPermission):
    """Chấm công, kỳ lương, phiếu lương, cấu hình lương: phân hệ Bảng lương (kể cả khi xem)."""
    module = 'payroll'


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
        qs = Employee.objects.all().prefetch_related('dependents', 'contracts').order_by('department', 'role', 'code')
        
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
        from apps.personnel.models import LaborContract, ContractStatus, EmployeeDependent, PayrollSlip, PayrollPeriodStatus
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

        paid_slips_count = PayrollSlip.objects.filter(
            employee=employee,
            is_deleted=False,
            period__status__in=[PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID]
        ).count()
        if paid_slips_count > 0:
            reasons.append(f"{paid_slips_count} phiếu lương trong kỳ đã chốt/thanh toán")

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

        # Đồng bộ soft-delete các hợp đồng lao động và phụ lục liên quan
        LaborContract.objects.filter(employee=employee, is_deleted=False).update(
            is_deleted=True,
            deleted_at=now,
            status=ContractStatus.TERMINATED
        )

        # Đồng bộ soft-delete người phụ thuộc
        EmployeeDependent.objects.filter(employee=employee, is_deleted=False).update(
            is_deleted=True,
            deleted_at=now
        )

        # Xóa các phiếu lương trong kỳ DRAFT (chưa khóa) nếu có
        PayrollSlip.objects.filter(
            employee=employee,
            is_deleted=False,
            period__status=PayrollPeriodStatus.DRAFT
        ).update(is_deleted=True)

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

        # Cảnh báo hạn Hợp đồng lao động (trong vòng 30 ngày)
        expiring_contracts = LaborContract.objects.filter(
            status=ContractStatus.ACTIVE,
            end_date__isnull=False,
            end_date__lte=warning_date
        ).select_related('employee').values(
            'id', 'contract_number', 'employee__code', 'employee__full_name', 'end_date'
        )

        departments = [{'value': c[0], 'label': c[1]} for c in Department.choices]
        roles = [{'value': r[0], 'label': r[1]} for r in EmployeeRole.choices]
        contract_types = [{'value': ct[0], 'label': ct[1]} for ct in ContractType.choices]

        # Tính toán chi tiết 5 Thẻ Vận Hành Nhân Sự & Tiền Lương Thực Tế
        probation_count = LaborContract.objects.filter(contract_type='PROBATION', status=ContractStatus.ACTIVE).count()
        drivers_on_trip = DispatchTrip.objects.filter(
            status__in=[TripStatus.ACCEPTED, TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.RETURNING_EMPTY],
            is_deleted=False
        ).values('driver').distinct().count()
        drivers_standby = max(0, drivers_count - drivers_on_trip)
        office_total = dispatchers_count + accountants_count + sales_count + mechanics_count + directors_count

        exp_lic_count = expiring_licenses.count()
        exp_cont_count = expiring_contracts.count()
        total_compliance_warning = exp_lic_count + exp_cont_count

        total_base_sal = sum(int(e.base_salary or 0) for e in Employee.objects.filter(is_active=True))
        total_advances = sum(int(d.current_advance or 0) for d in Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True))

        card_total = {
            'total': total_employees,
            'line_1': f"{active_employees} Chính thức · {probation_count} Thử việc",
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
            'line_2': f"{exp_cont_count} HĐLĐ đến hạn"
        }
        card_payroll = {
            'total': f"{total_base_sal:,} đ".replace(',', '.'),
            'line_1': f"Lương: {total_base_sal:,} đ".replace(',', '.'),
            'line_2': f"Ứng: {total_advances:,} đ".replace(',', '.')
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
                'expiring_contracts_count': exp_cont_count,
                # Cấu trúc 5 Thẻ Nhân Sự Chuẩn
                'card_total': card_total,
                'card_drivers': card_drivers,
                'card_office': card_office,
                'card_compliance': card_compliance,
                'card_payroll': card_payroll,
            },
            'expiring_licenses': list(expiring_licenses),
            'expiring_contracts': list(expiring_contracts),
            'options': {
                'departments': departments,
                'roles': roles,
                'contract_types': contract_types
            }
        })


# ==============================================================================
# 2. NGƯỜI PHỤ THUỘC (EMPLOYEE DEPENDENTS)
# ==============================================================================

class EmployeeDependentListCreateAPIView(APIView):
    permission_classes = [HRRecordPermission]

    def get(self, request):
        employee_id = request.GET.get('employee_id')
        qs = EmployeeDependent.objects.all().select_related('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        serializer = EmployeeDependentSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = EmployeeDependentSerializer(data=request.data)
        if serializer.is_valid():
            dep = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã thêm người phụ thuộc '{dep.full_name}' cho NV {dep.employee.full_name}.",
                'data': EmployeeDependentSerializer(dep).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'message': 'Dữ liệu không hợp lệ.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class EmployeeDependentDetailAPIView(APIView):
    permission_classes = [HRRecordPermission]

    def get_object(self, pk):
        return get_object_or_404(EmployeeDependent, pk=pk)

    def put(self, request, pk):
        dep = self.get_object(pk)
        serializer = EmployeeDependentSerializer(dep, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã cập nhật người phụ thuộc '{updated.full_name}'.",
                'data': EmployeeDependentSerializer(updated).data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        dep = self.get_object(pk)
        dep.is_active = False
        dep.is_deleted = True
        dep.save(update_fields=['is_active', 'is_deleted'])
        return Response({'success': True, 'message': 'Đã tạm dừng giảm trừ cho người phụ thuộc.'})


# ==============================================================================
# 3. HỢP ĐỒNG LAO ĐỘNG & PHỤ LỤC (LABOR CONTRACTS)
# ==============================================================================

class LaborContractListCreateAPIView(APIView):
    permission_classes = [HRRecordPermission]

    def get(self, request):
        if request.GET.get('action') == 'suggest_number':
            c_type = request.GET.get('type', 'DEFINITE_TERM')
            year = request.GET.get('year')
            suggested = LaborContract.generate_next_contract_number(c_type, year)
            return Response({'success': True, 'suggested_contract_number': suggested})

        qs = LaborContract.objects.all().select_related('employee').prefetch_related('appendices').order_by('-start_date')
        employee_id = request.GET.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        status_filter = request.GET.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = LaborContractSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = LaborContractSerializer(data=request.data)
        if serializer.is_valid():
            contract = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã tạo Hợp đồng lao động '{contract.contract_number}' thành công.",
                'data': LaborContractSerializer(contract).data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'success': False,
            'message': 'Dữ liệu HĐLĐ không hợp lệ.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class LaborContractDetailAPIView(APIView):
    permission_classes = [HRRecordPermission]

    def get_object(self, pk):
        return get_object_or_404(LaborContract, pk=pk)

    def get(self, request, pk):
        contract = self.get_object(pk)
        return Response(LaborContractSerializer(contract).data)

    def put(self, request, pk):
        contract = self.get_object(pk)
        serializer = LaborContractSerializer(contract, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã cập nhật HĐLĐ '{updated.contract_number}'.",
                'data': LaborContractSerializer(updated).data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        contract = self.get_object(pk)
        contract.is_deleted = True
        contract.status = ContractStatus.TERMINATED
        contract.save()
        return Response({
            'success': True,
            'message': f"Đã chấm dứt và xóa mềm HĐLĐ '{contract.contract_number}'."
        })


class ContractAppendixListCreateAPIView(APIView):
    permission_classes = [HRRecordPermission]

    def post(self, request):
        serializer = ContractAppendixSerializer(data=request.data)
        if serializer.is_valid():
            app = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã thêm phụ lục '{app.appendix_number}' cho HĐ {app.contract.contract_number}.",
                'data': ContractAppendixSerializer(app).data
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ==============================================================================
# 4. CHÍNH SÁCH LƯƠNG, BẢO HIỂM & BIỂU THUẾ TNCN
# ==============================================================================

class PayrollPolicyConfigAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get(self, request):
        config = PayrollPolicyConfig.objects.filter(is_active=True).first()
        if not config:
            config = PayrollPolicyConfig.objects.create()
            config.refresh_from_db()  # nạp lại để giá trị mặc định là Decimal (tránh lỗi Decimal x float)
        return Response(PayrollPolicyConfigSerializer(config).data)

    def put(self, request):
        config = PayrollPolicyConfig.objects.filter(is_active=True).first()
        if not config:
            config = PayrollPolicyConfig.objects.create()
            config.refresh_from_db()  # nạp lại để giá trị mặc định là Decimal (tránh lỗi Decimal x float)
        serializer = PayrollPolicyConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': 'Đã cập nhật tham số chính sách lương & giảm trừ gia cảnh.',
                'data': PayrollPolicyConfigSerializer(updated).data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class TaxBracketListAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get(self, request):
        brackets = TaxBracket.objects.all().order_by('bracket_level')
        serializer = TaxBracketSerializer(brackets, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TaxBracketSerializer(data=request.data)
        if serializer.is_valid():
            bracket = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã thêm bậc thuế {bracket.bracket_level} thành công.",
                'data': TaxBracketSerializer(bracket).data
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class TaxBracketDetailAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get_object(self, pk):
        return get_object_or_404(TaxBracket, pk=pk)

    def get(self, request, pk):
        bracket = self.get_object(pk)
        return Response(TaxBracketSerializer(bracket).data)

    def put(self, request, pk):
        bracket = self.get_object(pk)
        serializer = TaxBracketSerializer(bracket, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã cập nhật bậc thuế {updated.bracket_level}.",
                'data': TaxBracketSerializer(updated).data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        bracket = self.get_object(pk)
        bracket.delete()
        return Response({
            'success': True,
            'message': f"Đã xóa bậc thuế {bracket.bracket_level}."
        })


class PayrollParameterListCreateAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get(self, request):
        params = PayrollParameter.objects.all().order_by('order', 'code')
        serializer = PayrollParameterSerializer(params, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = PayrollParameterSerializer(data=request.data)
        if serializer.is_valid():
            param = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã tạo tham số '{param.name}' ({param.code}).",
                'data': PayrollParameterSerializer(param).data
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class PayrollParameterDetailAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get_object(self, pk):
        return get_object_or_404(PayrollParameter, pk=pk)

    def get(self, request, pk):
        param = self.get_object(pk)
        return Response(PayrollParameterSerializer(param).data)

    def put(self, request, pk):
        param = self.get_object(pk)
        serializer = PayrollParameterSerializer(param, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã cập nhật tham số '{updated.name}'.",
                'data': PayrollParameterSerializer(updated).data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        param = self.get_object(pk)
        param.delete()
        return Response({
            'success': True,
            'message': f"Đã xóa tham số '{param.name}'."
        })


class AllowanceGroupListAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get(self, request):
        groups = AllowanceGroup.objects.prefetch_related('items').filter(is_active=True).order_by('order')
        serializer = AllowanceGroupSerializer(groups, many=True)
        return Response(serializer.data)


class AllowanceTypeListCreateAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get(self, request):
        group_id = request.GET.get('group_id')
        items = AllowanceType.objects.select_related('group').all()
        if group_id:
            items = items.filter(group_id=group_id)
        items = items.order_by('order', 'code')
        serializer = AllowanceTypeSerializer(items, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AllowanceTypeSerializer(data=request.data)
        if serializer.is_valid():
            item = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã tạo danh mục phụ cấp '{item.name}' ({item.code}).",
                'data': AllowanceTypeSerializer(item).data
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AllowanceTypeDetailAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get_object(self, pk):
        return get_object_or_404(AllowanceType, pk=pk)

    def get(self, request, pk):
        item = self.get_object(pk)
        return Response(AllowanceTypeSerializer(item).data)

    def put(self, request, pk):
        item = self.get_object(pk)
        serializer = AllowanceTypeSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': f"Đã cập nhật danh mục phụ cấp '{updated.name}'.",
                'data': AllowanceTypeSerializer(updated).data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        item = self.get_object(pk)
        item.delete()
        return Response({
            'success': True,
            'message': f"Đã xóa phụ cấp '{item.name}'."
        })


class SalaryDeductionRateAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get(self, request):
        rate = SalaryDeductionRate.objects.filter(is_active=True).first()
        if not rate:
            rate = SalaryDeductionRate.objects.create()
            rate.refresh_from_db()  # nạp lại để giá trị mặc định là Decimal (tránh lỗi Decimal x float)
        return Response(SalaryDeductionRateSerializer(rate).data)

    def put(self, request):
        rate = SalaryDeductionRate.objects.filter(is_active=True).first()
        if not rate:
            rate = SalaryDeductionRate.objects.create()
            rate.refresh_from_db()  # nạp lại để giá trị mặc định là Decimal (tránh lỗi Decimal x float)
        serializer = SalaryDeductionRateSerializer(rate, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                'success': True,
                'message': 'Đã cập nhật tỷ lệ trích đóng bảo hiểm.',
                'data': SalaryDeductionRateSerializer(updated).data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ==============================================================================
# 5. CHẤM CÔNG & QUẢN LÝ NGÀY CÔNG (TIMEKEEPING & ATTENDANCE)
# ==============================================================================

class AttendanceCodeListAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get(self, request):
        codes = AttendanceCode.objects.filter(is_active=True).order_by('order', 'code')
        serializer = AttendanceCodeSerializer(codes, many=True)
        return Response(serializer.data)


class MonthlyAttendanceSummaryListAPIView(APIView):
    """
    Danh sách Bảng Chấm Công Tổng Hợp Tháng theo Kỳ lương (PayrollPeriod).
    """
    permission_classes = [PayrollPermission]

    def get(self, request):
        period_id = request.GET.get('period_id')
        period_code = request.GET.get('period_code')

        qs = MonthlyAttendanceSummary.objects.select_related('employee', 'period').all()
        if period_id:
            qs = qs.filter(period_id=period_id)
        elif period_code:
            qs = qs.filter(period__period_code=period_code)
        else:
            latest_period = PayrollPeriod.objects.order_by('-from_date').first()
            if latest_period:
                qs = qs.filter(period=latest_period)

        qs = qs.order_by('employee__department', 'employee__role', 'employee__code')
        serializer = MonthlyAttendanceSummarySerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        employee_id = request.data.get('employee')
        period_id = request.data.get('period')
        if not employee_id or not period_id:
            return Response({'success': False, 'message': 'Thiếu mã nhân viên hoặc kỳ lương'}, status=status.HTTP_400_BAD_REQUEST)

        worked_days = Decimal(str(request.data.get('worked_days', 26.0)))
        paid_leave = Decimal(str(request.data.get('paid_leave_days', 0.0)))
        holiday_days = Decimal(str(request.data.get('holiday_days', 0.0)))
        unpaid_leave = Decimal(str(request.data.get('unpaid_leave_days', 0.0)))
        overtime_hours = Decimal(str(request.data.get('overtime_hours', 0.0)))
        notes = request.data.get('notes', '')

        total_paid_days = worked_days + paid_leave + holiday_days

        summary, created = MonthlyAttendanceSummary.objects.update_or_create(
            employee_id=employee_id,
            period_id=period_id,
            defaults={
                'worked_days': worked_days,
                'paid_leave_days': paid_leave,
                'holiday_days': holiday_days,
                'unpaid_leave_days': unpaid_leave,
                'total_paid_days': total_paid_days,
                'overtime_hours': overtime_hours,
                'notes': notes
            }
        )
        return Response({
            'success': True,
            'message': f"Đã lưu bảng chấm công cho '{summary.employee.full_name}' ({summary.total_paid_days} công).",
            'data': MonthlyAttendanceSummarySerializer(summary).data
        })


class MonthlyAttendanceSummaryDetailAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get_object(self, pk):
        return get_object_or_404(MonthlyAttendanceSummary, pk=pk)

    def put(self, request, pk):
        summary = self.get_object(pk)
        serializer = MonthlyAttendanceSummarySerializer(summary, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            updated.calculate_total_paid_days()
            updated.save()
            return Response({
                'success': True,
                'message': f"Đã cập nhật ngày công cho '{updated.employee.full_name}'.",
                'data': MonthlyAttendanceSummarySerializer(updated).data
            })
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class MonthlyAttendanceAutoGenerateAPIView(APIView):
    """
    Tự động khởi tạo Bảng chấm công tháng cho toàn bộ nhân sự đang hoạt động trong kỳ lương.
    Mặc định: CBNV đi làm đủ ngày công tiêu chuẩn (26 ngày).
    """
    permission_classes = [PayrollPermission]

    def post(self, request):
        period_id = request.data.get('period_id')
        period = get_object_or_404(PayrollPeriod, pk=period_id)

        std_days = period.standard_days or Decimal('26.0')
        employees = Employee.objects.filter(is_active=True)

        created_count = 0
        updated_count = 0

        with transaction.atomic():
            for emp in employees:
                summary, created = MonthlyAttendanceSummary.objects.get_or_create(
                    employee=emp,
                    period=period,
                    defaults={
                        'standard_days': std_days,
                        'worked_days': std_days,
                        'paid_leave_days': Decimal('0.0'),
                        'holiday_days': Decimal('0.0'),
                        'unpaid_leave_days': Decimal('0.0'),
                        'total_paid_days': std_days,
                        'overtime_hours': Decimal('0.0'),
                        'notes': 'Khởi tạo tự động mặc định đủ công'
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        return Response({
            'success': True,
            'message': f"Đã tự động khởi tạo bảng công kỳ '{period.name}': Thêm mới {created_count}, Hiện có {updated_count} nhân sự.",
            'period_code': period.period_code,
            'total_employees': employees.count()
        })


# ==============================================================================
# 6. KỲ LƯƠNG & ĐỘNG CƠ TÍNH LƯƠNG HYBRID (PAYROLL PERIOD & ENGINE)
# ==============================================================================

class PayrollPeriodListCreateAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get(self, request):
        qs = PayrollPeriod.objects.all().select_related('cash_transaction', 'approved_by').order_by('-from_date')
        serializer = PayrollPeriodSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        period_code = request.data.get('period_code', '').strip()
        from_date_str = request.data.get('from_date')
        to_date_str = request.data.get('to_date')
        name = request.data.get('name', '').strip()
        standard_days = request.data.get('standard_days', 26.0)

        if not period_code or not from_date_str or not to_date_str:
            return Response({
                'success': False,
                'message': 'Vui lòng cung cấp đầy đủ Mã kỳ lương, Từ ngày và Đến ngày.'
            }, status=status.HTTP_400_BAD_REQUEST)

        from datetime import datetime
        def parse_date_defensive(d_str):
            if not d_str:
                return None
            s = str(d_str).strip()
            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y'):
                try:
                    return datetime.strptime(s, fmt).date()
                except ValueError:
                    continue
            return s

        from_date_val = parse_date_defensive(from_date_str)
        to_date_val = parse_date_defensive(to_date_str)

        existing_period = PayrollPeriod.all_objects.filter(period_code=period_code).first()
        if existing_period:
            if existing_period.is_deleted:
                existing_period.is_deleted = False
                existing_period.name = name or existing_period.name
                existing_period.from_date = from_date_val
                existing_period.to_date = to_date_val
                existing_period.standard_days = Decimal(str(standard_days))
                existing_period.status = PayrollPeriodStatus.DRAFT
                existing_period.save()
                return Response({
                    'success': True,
                    'message': f"Đã khôi phục kỳ lương '{existing_period.name}' thành công.",
                    'data': PayrollPeriodSerializer(existing_period).data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'message': f"Kỳ lương '{period_code}' đã tồn tại trong hệ thống."
                }, status=status.HTTP_400_BAD_REQUEST)

        if not name:
            name = f"Bảng lương Tháng {period_code}"

        period = PayrollPeriod.objects.create(
            period_code=period_code,
            name=name,
            from_date=from_date_val,
            to_date=to_date_val,
            standard_days=Decimal(str(standard_days)),
            status=PayrollPeriodStatus.DRAFT
        )

        return Response({
            'success': True,
            'message': f"Đã khởi tạo kỳ lương '{period.name}' thành công.",
            'data': PayrollPeriodSerializer(period).data
        }, status=status.HTTP_201_CREATED)


class PayrollPeriodDetailAPIView(APIView):
    permission_classes = [PayrollPermission]

    def get(self, request, pk):
        period = get_object_or_404(PayrollPeriod.objects.select_related('cash_transaction', 'approved_by'), pk=pk)
        slips = period.slips.all().select_related('employee').order_by('employee__code')

        # Hỗ trợ lọc slips theo keyword hoặc phòng ban/chức vụ
        q = request.GET.get('q', '').strip()
        if q:
            slips = slips.filter(
                Q(employee__code__icontains=q) |
                Q(employee__full_name__icontains=q) |
                Q(slip_code__icontains=q)
            )

        role = request.GET.get('role')
        if role and role != 'ALL':
            slips = slips.filter(role=role)

        department = request.GET.get('department')
        if department and department != 'ALL':
            slips = slips.filter(department=department)

        return Response({
            'period': PayrollPeriodSerializer(period).data,
            'slips': PayrollSlipSerializer(slips, many=True).data,
            'slips_count': slips.count()
        })

    def put(self, request, pk):
        period = get_object_or_404(PayrollPeriod, pk=pk)
        if period.status in [PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID]:
            return Response({'success': False, 'message': 'Không thể sửa kỳ lương đã khóa sổ hoặc chi trả.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = PayrollPeriodSerializer(period, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({'success': True, 'message': f"Đã cập nhật thông tin kỳ lương '{updated.name}'.", 'period': PayrollPeriodSerializer(updated).data})
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        period = get_object_or_404(PayrollPeriod, pk=pk)
        if period.status == PayrollPeriodStatus.PAID and period.cash_transaction:
            period.cash_transaction.is_deleted = True
            period.cash_transaction.save()
        period.slips.all().update(is_deleted=True)
        period.is_deleted = True
        period.save()
        return Response({
            'success': True,
            'message': f"Đã xóa mềm kỳ lương '{period.name}' thành công."
        }, status=status.HTTP_200_OK)


class PayrollCalculateAPIView(APIView):
    """
    ĐỘNG CƠ TÍNH TOÁN LƯƠNG KẾT HỢP (HYBRID PAYROLL ENGINE):
    - Tự động quét chuyến xe DispatchTrip (chuyến chính, chuyến cắt kéo, neo xe)
    - Tự động trừ tạm ứng chuyến xe DriverTripAdvance
    - Tính lương thời gian theo ngày công
    - Áp biểu thuế TNCN 7 bậc lũy tiến từng phần
    - Trích đóng bảo hiểm NLĐ 10.5% & DN 21.5%
    """
    permission_classes = [PayrollPermission]

    @staticmethod
    def _calculate_pit(taxable_income, tax_brackets):
        pit_amount = Decimal('0')
        if taxable_income > 0 and tax_brackets:
            for b in tax_brackets:
                if b.max_income is None or taxable_income <= b.max_income:
                    rate_val = b.rate_decimal
                    quick_sub = b.quick_subtraction or Decimal('0')
                    calc_tax = round(taxable_income * rate_val - quick_sub)
                    pit_amount = max(Decimal('0'), Decimal(str(calc_tax)))
                    break
        return pit_amount

    def post(self, request, pk):
        period = get_object_or_404(PayrollPeriod, pk=pk)
        if period.status in [PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID]:
            return Response({
                'success': False,
                'message': f"Kỳ lương đang ở trạng thái '{period.get_status_display()}', không thể tính toán lại."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 1. Tải chính sách & tỷ lệ
        policy = PayrollPolicyConfig.objects.filter(is_active=True).first()
        if not policy:
            policy = PayrollPolicyConfig.objects.create()
            policy.refresh_from_db()  # nạp lại để giá trị mặc định là Decimal (tránh lỗi Decimal x float)

        rate = SalaryDeductionRate.objects.filter(is_active=True).first()
        if not rate:
            rate = SalaryDeductionRate.objects.create()
            rate.refresh_from_db()  # nạp lại để giá trị mặc định là Decimal (tránh lỗi Decimal x float)

        tax_brackets = list(TaxBracket.objects.all().order_by('bracket_level'))

        from_d = period.from_date
        to_d = period.to_date
        std_days = period.standard_days or Decimal('26.0')

        # Dữ liệu ngày công hoặc phụ cấp tùy chỉnh gửi lên từ FE (nếu có)
        overrides = request.data.get('overrides', {}) # { emp_id: { actual_days, phone, lunch, other, kpi, fuel_bonus } }

        employees = Employee.objects.filter(is_active=True).prefetch_related('dependents')

        period_gross = Decimal('0')
        period_net = Decimal('0')
        period_ins_emp = Decimal('0')
        period_ins_empr = Decimal('0')
        period_pit = Decimal('0')
        period_adv_deduct = Decimal('0')

        with transaction.atomic():
            for emp in employees:
                emp_override = overrides.get(str(emp.id), {})

                # 1. Giai đoạn Hợp đồng lao động & Phụ lục hiện hành:
                # Kế thừa toàn bộ thông số kinh tế lao động & chính sách pháp lý từ HĐ hiện hành
                active_contract = emp.active_contract
                latest_appendix = emp.latest_appendix

                base_sal = emp.active_base_salary
                ins_sal = emp.active_insurance_salary
                contract_allowance = emp.active_allowance_amount
                contract_subsidy = emp.active_subsidy_amount
                probation_rate = emp.active_probation_rate
                is_bhxh = emp.active_is_bhxh
                is_tncn = emp.active_is_tncn
                is_cong_doan = emp.active_is_cong_doan
                tax_resident_type = emp.active_tax_resident_type
                active_role = emp.active_role
                active_dept = emp.active_department

                # 2. Giai đoạn Chấm công (Timekeeping): Lấy số ngày công hưởng lương từ Bảng tổng hợp công tháng
                att_summary = MonthlyAttendanceSummary.objects.filter(
                    employee=emp,
                    period=period
                ).first()

                if 'actual_working_days' in emp_override:
                    actual_days = Decimal(str(emp_override['actual_working_days']))
                elif att_summary and att_summary.total_paid_days is not None:
                    actual_days = att_summary.total_paid_days
                else:
                    actual_days = std_days

                # 3. Cấu phần A: LƯƠNG NGÀY CÔNG (Lương thời gian theo công thực tế & tỷ lệ thử việc)
                if std_days > 0:
                    probation_factor = probation_rate / Decimal('100.0') if probation_rate else Decimal('1.0')
                    time_salary = round(base_sal / std_days * actual_days * probation_factor)
                else:
                    time_salary = Decimal('0')

                # 4. Cấu phần B: LƯƠNG SẢN PHẨM CHUYẾN XE (Logistics Trip Piecework - Dành cho tài xế)
                trips_main = DispatchTrip.objects.filter(
                    driver=emp,
                    subcontractor__isnull=True,
                    is_deleted=False
                ).exclude(status=TripStatus.CANCELLED).filter(
                    Q(loading_date__gte=from_d, loading_date__lte=to_d) |
                    Q(loading_date__isnull=True, created_at__date__gte=from_d, created_at__date__lte=to_d)
                )

                trip_count = trips_main.count()
                trip_allowance = trips_main.aggregate(s=Sum('driver_allowance'))['s'] or Decimal('0')

                # Chuyến cắt kéo / hạ cont (dropoff_driver)
                trips_dropoff = DispatchTrip.objects.filter(
                    dropoff_driver=emp,
                    subcontractor__isnull=True,
                    is_deleted=False
                ).exclude(status=TripStatus.CANCELLED).filter(
                    Q(loading_date__gte=from_d, loading_date__lte=to_d) |
                    Q(loading_date__isnull=True, created_at__date__gte=from_d, created_at__date__lte=to_d)
                )
                dropoff_trip_count = trips_dropoff.count()
                dropoff_allowance = trips_dropoff.aggregate(s=Sum('dropoff_driver_allowance'))['s'] or Decimal('0')

                # Neo xe qua đêm
                detention_main = trips_main.aggregate(s=Sum('detention_driver_allowance'))['s'] or Decimal('0')
                detention_drop = trips_dropoff.aggregate(s=Sum('detention_driver_allowance'))['s'] or Decimal('0')
                detention_allowance = detention_main + detention_drop

                # Thưởng định mức nhiên liệu (xăng dầu tiết kiệm)
                fuel_bonus = Decimal(str(emp_override.get('fuel_bonus', 0)))

                # 5. Phụ cấp nghiệp vụ, Trợ cấp HĐ & Thưởng KPI
                phone_allowance = Decimal(str(emp_override.get('phone_allowance', 0)))
                lunch_allowance = Decimal(str(emp_override.get('lunch_allowance', 0)))
                other_allowance = Decimal(str(emp_override.get('other_allowance', 0)))
                kpi_bonus = Decimal(str(emp_override.get('kpi_bonus', 0)))

                # TỔNG GROSS = Lương Thời Gian + Lương Sản Phẩm Chuyến + Phụ Cấp HĐ + Trợ Cấp HĐ + Phụ Cấp Khác + Thưởng KPI
                gross_income = (
                    time_salary +
                    trip_allowance +
                    dropoff_allowance +
                    detention_allowance +
                    fuel_bonus +
                    phone_allowance +
                    lunch_allowance +
                    other_allowance +
                    contract_allowance +
                    contract_subsidy +
                    kpi_bonus
                )

                # 6. Trích nộp bảo hiểm & Công đoàn
                if is_bhxh:
                    ins_base = min(ins_sal or base_sal, policy.max_insurance_salary)
                    bhxh_emp = round(ins_base * rate.bhxh_employee_rate)
                    bhyt_emp = round(ins_base * rate.bhyt_employee_rate)
                    bhtn_emp = round(ins_base * rate.bhtn_employee_rate)
                    total_ins_emp = bhxh_emp + bhyt_emp + bhtn_emp

                    total_ins_empr = round(ins_base * (rate.bhxh_employer_rate + rate.bhyt_employer_rate + rate.bhtn_employer_rate))
                    union_fee_empr = round(ins_base * rate.union_employer_rate)
                else:
                    ins_base = Decimal('0')
                    bhxh_emp = Decimal('0')
                    bhyt_emp = Decimal('0')
                    bhtn_emp = Decimal('0')
                    total_ins_emp = Decimal('0')
                    total_ins_empr = Decimal('0')
                    union_fee_empr = Decimal('0')

                # Đoàn phí công đoàn phía NLĐ (1% LCB nếu tham gia công đoàn)
                if is_cong_doan:
                    union_fee_emp = round(base_sal * rate.union_employee_rate)
                else:
                    union_fee_emp = Decimal('0')

                # 7. Thuế Thu Nhập Cá Nhân (TNCN)
                active_dependents = emp.dependents.filter(
                    is_active=True,
                    start_date__lte=to_d
                ).filter(
                    Q(end_date__isnull=True) | Q(end_date__gte=from_d)
                ).count()

                personal_relief = policy.personal_relief
                dependent_relief = Decimal(active_dependents) * policy.dependent_relief

                pit_amount = Decimal('0')
                taxable_income = Decimal('0')

                if is_tncn:
                    if tax_resident_type == TaxResidentType.CASUAL_10:
                        # Lao động thời vụ / thử việc < 3 tháng / vãng lai: khấu trừ 10% tại nguồn nếu Gross >= 2tr
                        if gross_income >= Decimal('2000000'):
                            taxable_income = gross_income
                            pit_amount = round(gross_income * Decimal('0.10'))
                    elif tax_resident_type == TaxResidentType.NON_RESIDENT:
                        # Cá nhân không cư trú: khấu trừ 20%
                        taxable_income = gross_income
                        pit_amount = round(gross_income * Decimal('0.20'))
                    else:
                        # Cá nhân cư trú: Biểu thuế lũy tiến từng phần
                        # Khoản miễn thuế (ăn trưa <= 730k, điện thoại, trợ cấp phúc lợi hợp đồng)
                        non_taxable = min(lunch_allowance, Decimal('730000')) + phone_allowance + contract_subsidy
                        taxable_income = max(
                            Decimal('0'),
                            gross_income - non_taxable - total_ins_emp - union_fee_emp - personal_relief - dependent_relief
                        )
                        pit_amount = self._calculate_pit(taxable_income, tax_brackets)

                # 8. Khấu trừ tạm ứng:
                emp_salary_advance = emp.current_advance or Decimal('0')

                advances_qs = DriverTripAdvance.objects.filter(
                    driver=emp,
                    is_deleted=False
                ).filter(
                    Q(advance_date__gte=from_d, advance_date__lte=to_d) |
                    Q(advance_date__isnull=True, created_at__date__gte=from_d, created_at__date__lte=to_d)
                )

                unsettled_trip_adv = advances_qs.filter(status='ADVANCED').aggregate(s=Sum('amount'))['s'] or Decimal('0')
                total_trip_adv = advances_qs.aggregate(s=Sum('amount'))['s'] or Decimal('0')

                if emp_salary_advance > 0:
                    auto_adv_deduct = emp_salary_advance + unsettled_trip_adv
                else:
                    auto_adv_deduct = unsettled_trip_adv if unsettled_trip_adv > 0 else total_trip_adv

                advance_deductions = Decimal(str(emp_override.get('advance_deductions', auto_adv_deduct)))
                other_deductions = Decimal(str(emp_override.get('other_deductions', 0)))

                # 9. THỰC LĨNH (NET SALARY)
                net_salary = max(
                    Decimal('0'),
                    gross_income - total_ins_emp - union_fee_emp - pit_amount - advance_deductions - other_deductions
                )

                clean_period = period.period_code.replace('-', '').replace(' ', '')[:25]
                clean_code = emp.code.replace(' ', '')[:25]
                slip_code = f"PS-{clean_period}-{clean_code}"[:64]

                PayrollSlip.objects.update_or_create(
                    period=period,
                    employee=emp,
                    defaults={
                        'slip_code': slip_code,
                        'contract': active_contract,
                        'appendix': latest_appendix,
                        'probation_rate': probation_rate,
                        'is_social_insurance_participant': is_bhxh,
                        'is_taxable': is_tncn,
                        'is_union_member': is_cong_doan,
                        'tax_resident_type': tax_resident_type,
                        'role': active_role,
                        'department': active_dept,
                        'bank_account': emp.bank_account,
                        'bank_name': emp.bank_name,
                        'bank_beneficiary': emp.bank_beneficiary,
                        'actual_working_days': actual_days,
                        'base_salary': base_sal,
                        'time_salary': time_salary,
                        'allowance_amount': contract_allowance,
                        'subsidy_amount': contract_subsidy,
                        'trip_count': trip_count,
                        'trip_allowance': trip_allowance,
                        'dropoff_trip_count': dropoff_trip_count,
                        'dropoff_allowance': dropoff_allowance,
                        'detention_allowance': detention_allowance,
                        'fuel_bonus': fuel_bonus,
                        'phone_allowance': phone_allowance,
                        'lunch_allowance': lunch_allowance,
                        'other_allowance': other_allowance,
                        'kpi_bonus': kpi_bonus,
                        'gross_income': gross_income,
                        'insurance_base': ins_base,
                        'bhxh_employee': bhxh_emp,
                        'bhyt_employee': bhyt_emp,
                        'bhtn_employee': bhtn_emp,
                        'total_insurance_employee': total_ins_emp,
                        'total_insurance_employer': total_ins_empr,
                        'union_fee_employee': union_fee_emp,
                        'union_fee_employer': union_fee_empr,
                        'dependents_count': active_dependents,
                        'personal_relief_amount': personal_relief,
                        'dependent_relief_amount': dependent_relief,
                        'taxable_income': taxable_income,
                        'pit_amount': pit_amount,
                        'advance_deductions': advance_deductions,
                        'other_deductions': other_deductions,
                        'net_salary': net_salary,
                    }
                )

                period_gross += gross_income
                period_net += net_salary
                period_ins_emp += total_ins_emp
                period_ins_empr += total_ins_empr
                period_pit += pit_amount
                period_adv_deduct += advance_deductions

            # Cập nhật tổng thể kỳ lương
            period.total_employees = employees.count()
            period.total_gross = period_gross
            period.total_net = period_net
            period.total_insurance_employee = period_ins_emp
            period.total_insurance_employer = period_ins_empr
            period.total_pit = period_pit
            period.total_advances_deducted = period_adv_deduct
            period.save()

        return Response({
            'success': True,
            'message': f"Đã tính toán thành công bảng lương kỳ '{period.name}' cho {period.total_employees} CBNV.",
            'period': PayrollPeriodSerializer(period).data
        })


class PayrollPeriodStatusAPIView(APIView):
    """
    CẬP NHẬT TRẠNG THÁI VÒNG ĐỜI KỲ LƯƠNG:
    DRAFT ➔ REVIEWED ➔ LOCKED ➔ PAID.
    Khi chuyển sang PAID: Tự động ghi nhận Phiếu Chi (CashTransaction) vào Sổ Quỹ dòng tiền.
    """
    permission_classes = [PayrollPermission]
    access_actions = {'POST': 'approve', 'PUT': 'approve', 'PATCH': 'approve'}  # chốt/duyệt (ma trận phân quyền)

    def post(self, request, pk):
        period = get_object_or_404(PayrollPeriod, pk=pk)
        new_status = request.data.get('status')

        if new_status not in [PayrollPeriodStatus.DRAFT, PayrollPeriodStatus.REVIEWED, PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID]:
            return Response({
                'success': False,
                'message': f"Trạng thái '{new_status}' không hợp lệ."
            }, status=status.HTTP_400_BAD_REQUEST)

        emp = getattr(request.user, 'employee', None)

        with transaction.atomic():
            if new_status == PayrollPeriodStatus.PAID:
                # Kiểm tra xem đã có phiếu chi Sổ Quỹ chưa
                if not period.cash_transaction:
                    today_d = timezone.now().date()
                    cash_code = f"PC-LUONG-{period.period_code.replace('-', '')}"
                    
                    # Đảm bảo mã phiếu chi không trùng
                    cnt = 1
                    base_code = cash_code
                    while CashTransaction.objects.filter(code=cash_code).exists():
                        cash_code = f"{base_code}-{cnt}"
                        cnt += 1

                    cash_tx = CashTransaction.objects.create(
                        code=cash_code,
                        transaction_type=TransactionType.OUTFLOW,
                        payment_method=PaymentMethod.BANK,
                        category=CashFlowCategory.PAYROLL_SALARY,
                        amount=period.total_net,
                        transaction_date=today_d,
                        partner_type='INTERNAL',
                        partner_name=f"Chi trả Lương {period.name}",
                        ref_code=period.period_code,
                        bank_name="Vietcombank / Techcombank (Chi lương lô)",
                        bank_account="Tài khoản doanh nghiệp",
                        created_by=emp,
                        notes=f"Thanh toán lương thực lĩnh cho {period.total_employees} CBNV kỳ {period.name} (Tự động sinh từ Phân hệ Lương)"
                    )
                    period.cash_transaction = cash_tx

                # Đánh dấu đã thanh toán cho toàn bộ slip
                period.slips.all().update(
                    is_paid=True,
                    payment_date=timezone.now().date()
                )

            if new_status in [PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID]:
                period.approved_by = emp
                period.approved_at = timezone.now()

            period.status = new_status
            period.save()

        return Response({
            'success': True,
            'message': f"Đã chuyển kỳ lương '{period.name}' sang trạng thái '{period.get_status_display()}'.",
            'period': PayrollPeriodSerializer(period).data
        })


class PayrollExportBankAPIView(APIView):
    """
    API DỮ LIỆU CHUYỂN KHOẢN NGÂN HÀNG HÀNG LOẠT (BANK BATCH PAYMENT LIST):
    Trả về dữ liệu có cấu trúc phục vụ xuất file Excel chuyển khoản lương qua ngân hàng.
    """
    permission_classes = [PayrollPermission]

    def get(self, request, pk):
        period = get_object_or_404(PayrollPeriod, pk=pk)
        slips = period.slips.filter(net_salary__gt=0).select_related('employee').order_by('employee__code')

        bank_rows = []
        total_transfer = Decimal('0')

        company = CompanyProfile.get_default_company()
        comp_brand = (company.short_name or company.company_name or "TRIEN VO LOGISTICS").upper()

        for idx, slip in enumerate(slips, start=1):
            emp = slip.employee
            beneficiary = slip.bank_beneficiary or emp.bank_beneficiary or emp.full_name.upper()
            acc_num = slip.bank_account or emp.bank_account or ''
            b_name = slip.bank_name or emp.bank_name or ''
            b_branch = emp.bank_branch or ''
            amount = slip.net_salary
            memo = f"{comp_brand} TRA LUONG {period.period_code} NV {emp.code}"

            bank_rows.append({
                'stt': idx,
                'employee_code': emp.code,
                'employee_name': emp.full_name,
                'beneficiary_name': beneficiary,
                'account_number': acc_num,
                'bank_name': b_name,
                'bank_branch': b_branch,
                'amount': int(amount),
                'amount_formatted': f"{amount:,} đ",
                'memo': memo,
                'has_bank_info': bool(acc_num and b_name)
            })
            total_transfer += amount

        return Response({
            'period_code': period.period_code,
            'period_name': period.name,
            'total_employees': len(bank_rows),
            'total_transfer_amount': int(total_transfer),
            'total_transfer_formatted': f"{total_transfer:,} đ",
            'records': bank_rows
        })


class PayrollSlipPrintAPIView(APIView):
    """
    API DỮ LIỆU IN PHIẾU LƯƠNG CÁ NHÂN (FLAT PRINTABLE PAYSLIP DOCUMENT):
    Cung cấp đầy đủ thông tin chuẩn định dạng văn bản phẳng A4/A5 để in hoặc gửi email/Zalo.
    """
    permission_classes = [PayrollPermission]

    def get(self, request, pk):
        slip = get_object_or_404(
            PayrollSlip.objects.select_related('period', 'employee', 'employee__user'),
            pk=pk
        )
        emp = slip.employee
        period = slip.period
        company = CompanyProfile.get_default_company()

        return Response({
            'company': {
                'name': company.company_name,
                'short_name': company.short_name,
                'address': company.address,
                'tax_id': company.tax_code,
                'hotline': company.phone,
                'email': company.email,
                'representative_name': company.representative_name,
                'representative_role': company.representative_role,
                'logo_url': company.logo_url or '/static/images/gss_logo.svg',
            },
            'slip': PayrollSlipSerializer(slip).data,
            'employee': {
                'code': emp.code,
                'full_name': emp.full_name,
                'nickname': emp.nickname,
                'role': slip.get_role_display() if hasattr(slip, 'get_role_display') else emp.get_role_display(),
                'department': emp.get_department_display(),
                'national_id': emp.national_id,
                'tax_id': emp.tax_id,
                'insurance_number': emp.insurance_number,
                'bank_account': slip.bank_account or emp.bank_account,
                'bank_name': slip.bank_name or emp.bank_name,
                'bank_beneficiary': slip.bank_beneficiary or emp.bank_beneficiary,
            },
            'period': {
                'code': period.period_code,
                'name': period.name,
                'from_date': period.from_date,
                'to_date': period.to_date,
                'standard_days': float(period.standard_days),
            }
        })


class PayrollSlipDetailAPIView(APIView):
    """
    API CHI TIẾT & ĐIỀU CHỈNH PHIẾU LƯƠNG:
    Cho phép điều chỉnh các khoản phụ cấp, KPI, khấu trừ khác và tự động tính lại Net.
    """
    permission_classes = [PayrollPermission]

    def get_object(self, pk):
        return get_object_or_404(PayrollSlip.objects.select_related('period', 'employee'), pk=pk)

    def get(self, request, pk):
        slip = self.get_object(pk)
        return Response(PayrollSlipSerializer(slip).data)

    def put(self, request, pk):
        slip = self.get_object(pk)
        if slip.period.status in [PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID]:
            return Response({
                'success': False,
                'message': 'Không thể sửa phiếu lương trong kỳ đã khóa sổ hoặc chi trả.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Cập nhật các trường cho phép chỉnh sửa
        data = request.data
        if 'phone_allowance' in data:
            slip.phone_allowance = Decimal(str(data['phone_allowance'] or 0))
        if 'lunch_allowance' in data:
            slip.lunch_allowance = Decimal(str(data['lunch_allowance'] or 0))
        if 'other_allowance' in data:
            slip.other_allowance = Decimal(str(data['other_allowance'] or 0))
        if 'kpi_bonus' in data:
            slip.kpi_bonus = Decimal(str(data['kpi_bonus'] or 0))
        if 'advance_deductions' in data:
            slip.advance_deductions = Decimal(str(data['advance_deductions'] or 0))
        if 'other_deductions' in data:
            slip.other_deductions = Decimal(str(data['other_deductions'] or 0))
        if 'notes' in data:
            slip.notes = str(data['notes'])

        # Tính toán lại Gross
        slip.gross_income = (
            slip.time_salary +
            slip.trip_allowance +
            slip.dropoff_allowance +
            slip.detention_allowance +
            slip.fuel_bonus +
            slip.phone_allowance +
            slip.lunch_allowance +
            slip.other_allowance +
            (slip.allowance_amount or Decimal('0')) +
            (slip.subsidy_amount or Decimal('0')) +
            slip.kpi_bonus
        )

        # Tính lại thu nhập chịu thuế & Thuế TNCN
        if not slip.is_taxable:
            slip.taxable_income = Decimal('0')
            slip.pit_amount = Decimal('0')
        elif slip.tax_resident_type == TaxResidentType.CASUAL_10:
            if slip.gross_income >= Decimal('2000000'):
                slip.taxable_income = slip.gross_income
                slip.pit_amount = round(slip.gross_income * Decimal('0.10'))
            else:
                slip.taxable_income = Decimal('0')
                slip.pit_amount = Decimal('0')
        elif slip.tax_resident_type == TaxResidentType.NON_RESIDENT:
            slip.taxable_income = slip.gross_income
            slip.pit_amount = round(slip.gross_income * Decimal('0.20'))
        else:
            non_taxable_allowances = min(slip.lunch_allowance, Decimal('730000')) + slip.phone_allowance + (slip.subsidy_amount or Decimal('0'))
            union_fee = slip.union_fee_employee or Decimal('0')
            income_before_relief = max(Decimal('0'), slip.gross_income - non_taxable_allowances - slip.total_insurance_employee - union_fee)
            total_relief = slip.personal_relief_amount + slip.dependent_relief_amount
            slip.taxable_income = max(Decimal('0'), income_before_relief - total_relief)

            tax_brackets = list(TaxBracket.objects.filter(is_active=True).order_by('bracket_level'))
            calc_view = PayrollCalculateAPIView()
            slip.pit_amount = calc_view._calculate_pit(slip.taxable_income, tax_brackets)

        # Tính lại Net
        union_fee = slip.union_fee_employee or Decimal('0')
        slip.net_salary = max(Decimal('0'), slip.gross_income - slip.total_insurance_employee - union_fee - slip.pit_amount - slip.advance_deductions - slip.other_deductions)
        slip.save()

        # Cập nhật tổng của kỳ
        period = slip.period
        period_slips = period.slips.filter(is_deleted=False)
        period.total_gross = sum(s.gross_income for s in period_slips)
        period.total_net = sum(s.net_salary for s in period_slips)
        period.total_pit = sum(s.pit_amount for s in period_slips)
        period.total_advances_deducted = sum(s.advance_deductions for s in period_slips)
        period.save()

        return Response({
            'success': True,
            'message': f"Đã lưu điều chỉnh phiếu lương của '{slip.employee.full_name}'.",
            'slip': PayrollSlipSerializer(slip).data
        })

    def delete(self, request, pk):
        slip = self.get_object(pk)
        if slip.period.status in [PayrollPeriodStatus.LOCKED, PayrollPeriodStatus.PAID]:
            return Response({'success': False, 'message': 'Không thể xóa phiếu lương trong kỳ đã khóa sổ.'}, status=status.HTTP_400_BAD_REQUEST)
        slip.is_deleted = True
        slip.save()
        return Response({'success': True, 'message': 'Đã xóa mềm phiếu lương.'})


# ==============================================================================
# 7. XUẤT NHẬP EXCEL HỒ SƠ NHÂN SỰ (EXCEL IMPORT / EXPORT)
# ==============================================================================
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


# Cấu hình lương dùng chung giữa các công ty: khi có nhiều doanh nghiệp chỉ superuser được ghi
from core.permissions import SharedConfigWritePermission  # noqa: E402

for _cls in (PayrollPolicyConfigAPIView, TaxBracketListAPIView, TaxBracketDetailAPIView, PayrollParameterListCreateAPIView,
             PayrollParameterDetailAPIView, AllowanceTypeListCreateAPIView, AllowanceTypeDetailAPIView, SalaryDeductionRateAPIView):
    _cls.permission_classes = [*_cls.permission_classes, SharedConfigWritePermission]

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
