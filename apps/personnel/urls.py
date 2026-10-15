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
    SalaryDeductionRateAPIView,
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

    # 4. Chính sách lương, bảo hiểm & thuế TNCN
    path('policy-config/', PayrollPolicyConfigAPIView.as_view(), name='api-payroll-policy-config'),
    path('tax-brackets/', TaxBracketListAPIView.as_view(), name='api-tax-brackets'),
    path('deduction-rates/', SalaryDeductionRateAPIView.as_view(), name='api-deduction-rates'),

    # 5. Kỳ lương & Động cơ tính lương
    path('periods/', PayrollPeriodListCreateAPIView.as_view(), name='api-payroll-period-list-create'),
    path('periods/<int:pk>/', PayrollPeriodDetailAPIView.as_view(), name='api-payroll-period-detail'),
    path('periods/<int:pk>/calculate/', PayrollCalculateAPIView.as_view(), name='api-payroll-calculate'),
    path('periods/<int:pk>/status/', PayrollPeriodStatusAPIView.as_view(), name='api-payroll-status'),
    path('periods/<int:pk>/bank-export/', PayrollExportBankAPIView.as_view(), name='api-payroll-bank-export'),
    path('slips/<int:pk>/print/', PayrollSlipPrintAPIView.as_view(), name='api-payroll-slip-print'),
]
