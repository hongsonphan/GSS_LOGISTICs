from django.contrib import admin
from .models import (
    Employee, EmployeeDependent, LaborContract, ContractAppendix,
    TaxBracket, SalaryDeductionRate, PayrollPolicyConfig,
    PayrollPeriod, PayrollSlip,
    AttendanceCode, DailyAttendance, MonthlyAttendanceSummary,
    PayrollParameter, AllowanceGroup, AllowanceType
)

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('code', 'full_name', 'user', 'role', 'department', 'phone_number', 'national_id', 'is_active')
    list_filter = ('role', 'department', 'is_active', ('user', admin.EmptyFieldListFilter), 'is_social_insurance_participant')
    search_fields = ('code', 'full_name', 'nickname', 'phone_number', 'national_id', 'user__username', 'user__email')
    raw_id_fields = ('user',)
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

@admin.register(AttendanceCode)
class AttendanceCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'work_weight', 'salary_rate', 'is_paid', 'color', 'order', 'is_active')
    list_filter = ('is_paid', 'is_active')
    search_fields = ('code', 'name')
    ordering = ('order', 'code')

@admin.register(DailyAttendance)
class DailyAttendanceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'work_date', 'code_symbol', 'attendance_code', 'work_hours', 'overtime_hours', 'is_deleted')
    list_filter = ('work_date', 'code_symbol', 'is_deleted')
    search_fields = ('employee__code', 'employee__full_name', 'code_symbol')
    date_hierarchy = 'work_date'

@admin.register(MonthlyAttendanceSummary)
class MonthlyAttendanceSummaryAdmin(admin.ModelAdmin):
    list_display = ('employee', 'period', 'standard_days', 'worked_days', 'paid_leave_days', 'holiday_days', 'unpaid_leave_days', 'total_paid_days', 'overtime_hours', 'is_deleted')
    list_filter = ('period', 'is_deleted')
    search_fields = ('employee__code', 'employee__full_name', 'period__period_code')

@admin.register(PayrollParameter)
class PayrollParameterAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'value', 'unit', 'legal_basis', 'effective_date', 'expiry_date', 'is_active', 'order')
    list_filter = ('is_active', 'effective_date')
    search_fields = ('code', 'name', 'legal_basis')
    ordering = ('order', 'code')

class AllowanceTypeInline(admin.TabularInline):
    model = AllowanceType
    extra = 1

@admin.register(AllowanceGroup)
class AllowanceGroupAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'description', 'order', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('code', 'name')
    ordering = ('order', 'code')
    inlines = [AllowanceTypeInline]

@admin.register(AllowanceType)
class AllowanceTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'group', 'category', 'default_amount', 'is_insurance_applicable', 'is_taxable', 'is_active', 'order')
    list_filter = ('category', 'group', 'is_insurance_applicable', 'is_taxable', 'is_active')
    search_fields = ('code', 'name', 'group__name')
    ordering = ('order', 'code')

