import datetime
from decimal import Decimal
from django.db import models, transaction
from django.db.models import Q, Sum, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.personnel.models import (
    Employee, Department, EmployeeRole, EmployeeGender,
    EmployeeDependent, LaborContract, ContractAppendix, ContractType, ContractStatus,
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


class EmployeePermission(permissions.BasePermission):
    """
    Quyền truy cập Phân hệ Nhân Sự:
    - Đọc (GET, HEAD, OPTIONS): Nhân sự nội bộ đã đăng nhập.
    - Ghi / Cập nhật / Xóa: Kế toán viên, Ban Giám Đốc hoặc Quản trị viên hệ thống.
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
        return Response(EmployeeSerializer(employee).data)

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
        employee.is_active = False
        employee.is_deleted = True
        employee.save(update_fields=['is_active', 'is_deleted'])
        return Response({
            'success': True,
            'message': f"Đã chuyển nhân sự '{employee.full_name}' ({employee.code}) sang trạng thái tạm ngưng công tác và xóa mềm."
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
                'expiring_licenses_count': expiring_licenses.count(),
                'expiring_contracts_count': expiring_contracts.count(),
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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

    def get(self, request):
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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

    def get(self, request):
        config = PayrollPolicyConfig.objects.filter(is_active=True).first()
        if not config:
            config = PayrollPolicyConfig.objects.create()
        return Response(PayrollPolicyConfigSerializer(config).data)

    def put(self, request):
        config = PayrollPolicyConfig.objects.filter(is_active=True).first()
        if not config:
            config = PayrollPolicyConfig.objects.create()
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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

    def get(self, request):
        groups = AllowanceGroup.objects.prefetch_related('items').filter(is_active=True).order_by('order')
        serializer = AllowanceGroupSerializer(groups, many=True)
        return Response(serializer.data)


class AllowanceTypeListCreateAPIView(APIView):
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

    def get(self, request):
        rate = SalaryDeductionRate.objects.filter(is_active=True).first()
        if not rate:
            rate = SalaryDeductionRate.objects.create()
        return Response(SalaryDeductionRateSerializer(rate).data)

    def put(self, request):
        rate = SalaryDeductionRate.objects.filter(is_active=True).first()
        if not rate:
            rate = SalaryDeductionRate.objects.create()
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
    permission_classes = [EmployeePermission]

    def get(self, request):
        codes = AttendanceCode.objects.filter(is_active=True).order_by('order', 'code')
        serializer = AttendanceCodeSerializer(codes, many=True)
        return Response(serializer.data)


class MonthlyAttendanceSummaryListAPIView(APIView):
    """
    Danh sách Bảng Chấm Công Tổng Hợp Tháng theo Kỳ lương (PayrollPeriod).
    """
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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

        if PayrollPeriod.objects.filter(period_code=period_code).exists():
            return Response({
                'success': False,
                'message': f"Kỳ lương '{period_code}' đã tồn tại."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not name:
            name = f"Bảng lương Tháng {period_code}"

        period = PayrollPeriod.objects.create(
            period_code=period_code,
            name=name,
            from_date=from_date_str,
            to_date=to_date_str,
            standard_days=Decimal(str(standard_days)),
            status=PayrollPeriodStatus.DRAFT
        )

        return Response({
            'success': True,
            'message': f"Đã khởi tạo kỳ lương '{period.name}' thành công.",
            'data': PayrollPeriodSerializer(period).data
        }, status=status.HTTP_201_CREATED)


class PayrollPeriodDetailAPIView(APIView):
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

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

        rate = SalaryDeductionRate.objects.filter(is_active=True).first()
        if not rate:
            rate = SalaryDeductionRate.objects.create()

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

                # 1. Giai đoạn Hợp đồng lao động: Ưu tiên lấy lương cơ bản ghi trong HĐLĐ đang hiệu lực
                active_contract = emp.contracts.filter(
                    status=ContractStatus.ACTIVE,
                    is_deleted=False
                ).order_by('-start_date').first()
                if active_contract and active_contract.base_salary and active_contract.base_salary > 0:
                    base_sal = active_contract.base_salary
                else:
                    base_sal = emp.base_salary or Decimal('0')

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

                # 3. Cấu phần A: LƯƠNG NGÀY CÔNG (Lương thời gian theo công thực tế)
                if std_days > 0:
                    time_salary = round(base_sal / std_days * actual_days)
                else:
                    time_salary = Decimal('0')

                # 4. Cấu phần B: LƯƠNG SẢN PHẨM CHUYẾN XE (Logistics Trip Piecework - Dành cho tài xế)
                trips_main = DispatchTrip.objects.filter(
                    driver=emp,
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

                # 5. Phụ cấp nghiệp vụ & Thưởng KPI
                phone_allowance = Decimal(str(emp_override.get('phone_allowance', 0)))
                lunch_allowance = Decimal(str(emp_override.get('lunch_allowance', 0)))
                other_allowance = Decimal(str(emp_override.get('other_allowance', 0)))
                kpi_bonus = Decimal(str(emp_override.get('kpi_bonus', 0)))

                # TỔNG GROSS = Lương Ngày Công + Lương Sản Phẩm Chuyến + Phụ Cấp + Thưởng KPI
                gross_income = (
                    time_salary +
                    trip_allowance +
                    dropoff_allowance +
                    detention_allowance +
                    fuel_bonus +
                    phone_allowance +
                    lunch_allowance +
                    other_allowance +
                    kpi_bonus
                )

                # 6. Trích nộp bảo hiểm (Mức lương BHXH ưu tiên lấy từ HĐLĐ đang hiệu lực)
                if emp.is_social_insurance_participant:
                    if active_contract and active_contract.insurance_salary and active_contract.insurance_salary > 0:
                        ins_sal = active_contract.insurance_salary
                    else:
                        ins_sal = emp.insurance_salary or base_sal
                    ins_base = min(ins_sal, policy.max_insurance_salary)
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

                # 5. Thuế Thu Nhập Cá Nhân (TNCN)
                # Đếm số NPT đang hiệu lực trong kỳ
                active_dependents = emp.dependents.filter(
                    is_active=True,
                    start_date__lte=to_d
                ).filter(
                    Q(end_date__isnull=True) | Q(end_date__gte=from_d)
                ).count()

                personal_relief = policy.personal_relief
                dependent_relief = Decimal(active_dependents) * policy.dependent_relief

                # Khoản không tính thuế (tiền ăn trưa <= 730k, phụ cấp điện thoại công việc)
                non_taxable = min(lunch_allowance, Decimal('730000')) + phone_allowance

                taxable_income = max(
                    Decimal('0'),
                    gross_income - non_taxable - total_ins_emp - personal_relief - dependent_relief
                )

                # Tìm bậc thuế lũy tiến tương ứng (Hỗ trợ 5 bậc mới theo Luật 109/2025/QH15 hoặc 7 bậc cũ)
                pit_amount = Decimal('0')
                if taxable_income > 0 and tax_brackets:
                    for b in tax_brackets:
                        if b.max_income is None or taxable_income <= b.max_income:
                            rate_val = b.rate_decimal
                            quick_sub = b.quick_subtraction or Decimal('0')
                            calc_tax = round(taxable_income * rate_val - quick_sub)
                            pit_amount = max(Decimal('0'), calc_tax)
                            break

                # 6. Khấu trừ hoàn ứng chuyến xe (DriverTripAdvance)
                # Tìm các khoản tạm ứng của tài xế phát sinh trong kỳ
                advances_qs = DriverTripAdvance.objects.filter(
                    driver=emp,
                    is_deleted=False
                ).filter(
                    Q(advance_date__gte=from_d, advance_date__lte=to_d) |
                    Q(advance_date__isnull=True, created_at__date__gte=from_d, created_at__date__lte=to_d)
                )
                auto_adv_deduct = advances_qs.aggregate(s=Sum('amount'))['s'] or Decimal('0')
                # Hỗ trợ ghi đè từ payload nếu có điều chỉnh
                advance_deductions = Decimal(str(emp_override.get('advance_deductions', auto_adv_deduct)))
                other_deductions = Decimal(str(emp_override.get('other_deductions', 0)))

                # 7. THỰC LĨNH (NET SALARY)
                net_salary = max(
                    Decimal('0'),
                    gross_income - total_ins_emp - pit_amount - advance_deductions - other_deductions
                )

                clean_period = period.period_code.replace('-', '').replace(' ', '')[:25]
                clean_code = emp.code.replace(' ', '')[:25]
                slip_code = f"PS-{clean_period}-{clean_code}"[:64]

                PayrollSlip.objects.update_or_create(
                    period=period,
                    employee=emp,
                    defaults={
                        'slip_code': slip_code,
                        'role': emp.role,
                        'department': emp.department,
                        'bank_account': emp.bank_account,
                        'bank_name': emp.bank_name,
                        'bank_beneficiary': emp.bank_beneficiary,
                        'actual_working_days': actual_days,
                        'base_salary': base_sal,
                        'time_salary': time_salary,
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
    permission_classes = [EmployeePermission]

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
    permission_classes = [EmployeePermission]

    def get(self, request, pk):
        period = get_object_or_404(PayrollPeriod, pk=pk)
        slips = period.slips.filter(net_salary__gt=0).select_related('employee').order_by('employee__code')

        bank_rows = []
        total_transfer = Decimal('0')

        for idx, slip in enumerate(slips, start=1):
            emp = slip.employee
            beneficiary = slip.bank_beneficiary or emp.bank_beneficiary or emp.full_name.upper()
            acc_num = slip.bank_account or emp.bank_account or ''
            b_name = slip.bank_name or emp.bank_name or ''
            b_branch = emp.bank_branch or ''
            amount = slip.net_salary
            memo = f"TRIEN VO LOGISTICS TRA LUONG {period.period_code} NV {emp.code}"

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
    permission_classes = [EmployeePermission]

    def get(self, request, pk):
        slip = get_object_or_404(
            PayrollSlip.objects.select_related('period', 'employee', 'employee__user'),
            pk=pk
        )
        emp = slip.employee
        period = slip.period

        return Response({
            'company': {
                'name': "CÔNG TY TNHH TIẾP VẬN TRIỀN VÕ (BIM LOGISTICS)",
                'address': "Số 10, Đường 12, P. Long Bình, TP. Thủ Đức, TP. Hồ Chí Minh",
                'tax_id': "0316888888",
                'hotline': "0908 123 456",
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
