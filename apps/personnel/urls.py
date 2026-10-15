from django.urls import path
from apps.personnel.api_views import (
    EmployeeListCreateAPIView,
    EmployeeDetailAPIView,
    EmployeeStatsAPIView,
    EmployeeDependentListCreateAPIView,
    EmployeeDependentDetailAPIView,
    LaborContractListCreateAPIView,
    LaborContractDetailAPIView,
    ContractAppendixListCreateAPIView,
    PayrollPolicyConfigAPIView,
    TaxBracketListAPIView,
    TaxBracketDetailAPIView,
    SalaryDeductionRateAPIView,
    PayrollParameterListCreateAPIView,
    PayrollParameterDetailAPIView,
    AllowanceGroupListAPIView,
    AllowanceTypeListCreateAPIView,
    AllowanceTypeDetailAPIView,
    AttendanceCodeListAPIView,
    MonthlyAttendanceSummaryListAPIView,
    MonthlyAttendanceSummaryDetailAPIView,
    MonthlyAttendanceAutoGenerateAPIView,
    PayrollPeriodListCreateAPIView,
    PayrollPeriodDetailAPIView,
    PayrollCalculateAPIView,
    PayrollPeriodStatusAPIView,
    PayrollExportBankAPIView,
    PayrollSlipPrintAPIView,
)

urlpatterns = [
    # 1. Hồ sơ nhân sự
    path('employees/', EmployeeListCreateAPIView.as_view(), name='api-employee-list-create'),
    path('employees/<int:pk>/', EmployeeDetailAPIView.as_view(), name='api-employee-detail'),
    path('stats/', EmployeeStatsAPIView.as_view(), name='api-employee-stats'),

    # 2. Người phụ thuộc
    path('dependents/', EmployeeDependentListCreateAPIView.as_view(), name='api-dependent-list-create'),
    path('dependents/<int:pk>/', EmployeeDependentDetailAPIView.as_view(), name='api-dependent-detail'),

    # 3. Hợp đồng lao động & phụ lục
    path('contracts/', LaborContractListCreateAPIView.as_view(), name='api-contract-list-create'),
    path('contracts/<int:pk>/', LaborContractDetailAPIView.as_view(), name='api-contract-detail'),
    path('appendices/', ContractAppendixListCreateAPIView.as_view(), name='api-appendix-list-create'),

    # 4. Chấm công & Quản lý ngày công
    path('attendance-codes/', AttendanceCodeListAPIView.as_view(), name='api-attendance-codes'),
    path('monthly-attendance/', MonthlyAttendanceSummaryListAPIView.as_view(), name='api-monthly-attendance-list'),
    path('monthly-attendance/<int:pk>/', MonthlyAttendanceSummaryDetailAPIView.as_view(), name='api-monthly-attendance-detail'),
    path('monthly-attendance/auto-generate/', MonthlyAttendanceAutoGenerateAPIView.as_view(), name='api-monthly-attendance-auto-generate'),

    # 5. Chính sách lương, bảo hiểm & thuế TNCN
    path('policy-config/', PayrollPolicyConfigAPIView.as_view(), name='api-payroll-policy-config'),
    path('tax-brackets/', TaxBracketListAPIView.as_view(), name='api-tax-brackets'),
    path('tax-brackets/<int:pk>/', TaxBracketDetailAPIView.as_view(), name='api-tax-bracket-detail'),
    path('deduction-rates/', SalaryDeductionRateAPIView.as_view(), name='api-deduction-rates'),
    path('payroll-parameters/', PayrollParameterListCreateAPIView.as_view(), name='api-payroll-parameters'),
    path('payroll-parameters/<int:pk>/', PayrollParameterDetailAPIView.as_view(), name='api-payroll-parameter-detail'),
    path('allowance-groups/', AllowanceGroupListAPIView.as_view(), name='api-allowance-groups'),
    path('allowance-types/', AllowanceTypeListCreateAPIView.as_view(), name='api-allowance-types'),
    path('allowance-types/<int:pk>/', AllowanceTypeDetailAPIView.as_view(), name='api-allowance-type-detail'),

    # 6. Kỳ lương & Động cơ tính lương
    path('periods/', PayrollPeriodListCreateAPIView.as_view(), name='api-payroll-period-list-create'),
    path('periods/<int:pk>/', PayrollPeriodDetailAPIView.as_view(), name='api-payroll-period-detail'),
    path('periods/<int:pk>/calculate/', PayrollCalculateAPIView.as_view(), name='api-payroll-calculate'),
    path('periods/<int:pk>/status/', PayrollPeriodStatusAPIView.as_view(), name='api-payroll-status'),
    path('periods/<int:pk>/bank-export/', PayrollExportBankAPIView.as_view(), name='api-payroll-bank-export'),
    path('slips/<int:pk>/print/', PayrollSlipPrintAPIView.as_view(), name='api-payroll-slip-print'),
]
