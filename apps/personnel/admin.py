from django.contrib import admin
from .models import (
    Employee, EmployeeDependent, LaborContract, ContractAppendix,
    TaxBracket, SalaryDeductionRate, PayrollPolicyConfig,
    PayrollPeriod, PayrollSlip
)

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('code', 'full_name', 'nickname', 'role', 'department', 'phone_number', 'national_id', 'bank_account', 'is_active')
    list_filter = ('role', 'department', 'is_active', 'is_social_insurance_participant')
    search_fields = ('code', 'full_name', 'nickname', 'phone_number', 'national_id', 'bank_account')
    ordering = ('code',)

@admin.register(EmployeeDependent)
class EmployeeDependentAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'employee', 'relationship', 'national_id', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active', 'relationship')
    search_fields = ('full_name', 'employee__code', 'employee__full_name', 'national_id')

@admin.register(LaborContract)
class LaborContractAdmin(admin.ModelAdmin):
    list_display = ('contract_number', 'employee', 'contract_type', 'status', 'start_date', 'end_date', 'base_salary')
    list_filter = ('contract_type', 'status')
    search_fields = ('contract_number', 'employee__code', 'employee__full_name')

@admin.register(ContractAppendix)
class ContractAppendixAdmin(admin.ModelAdmin):
    list_display = ('appendix_number', 'contract', 'effective_date', 'new_base_salary', 'new_role')
    search_fields = ('appendix_number', 'contract__contract_number')

@admin.register(TaxBracket)
class TaxBracketAdmin(admin.ModelAdmin):
    list_display = ('bracket_level', 'min_income', 'max_income', 'tax_rate', 'quick_subtraction')
    ordering = ('bracket_level',)

@admin.register(SalaryDeductionRate)
class SalaryDeductionRateAdmin(admin.ModelAdmin):
    list_display = ('name', 'bhxh_employee_rate', 'bhyt_employee_rate', 'bhtn_employee_rate', 'is_active')

@admin.register(PayrollPolicyConfig)
class PayrollPolicyConfigAdmin(admin.ModelAdmin):
    list_display = ('personal_relief', 'dependent_relief', 'standard_working_days', 'max_insurance_salary', 'is_active')

class PayrollSlipInline(admin.TabularInline):
    model = PayrollSlip
    extra = 0
    fields = ('employee', 'slip_code', 'role', 'gross_income', 'total_insurance_employee', 'pit_amount', 'advance_deductions', 'net_salary', 'is_paid')
    readonly_fields = fields

@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ('period_code', 'name', 'from_date', 'to_date', 'status', 'total_employees', 'total_gross', 'total_net', 'cash_transaction')
    list_filter = ('status',)
    search_fields = ('period_code', 'name')
    inlines = [PayrollSlipInline]

@admin.register(PayrollSlip)
class PayrollSlipAdmin(admin.ModelAdmin):
    list_display = ('slip_code', 'period', 'employee', 'role', 'gross_income', 'net_salary', 'is_paid', 'payment_method')
    list_filter = ('is_paid', 'role', 'department', 'period')
    search_fields = ('slip_code', 'employee__code', 'employee__full_name')
