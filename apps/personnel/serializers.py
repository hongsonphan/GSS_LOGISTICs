from rest_framework import serializers
from apps.personnel.models import (
    Employee, Department, EmployeeRole, EmployeeGender,
    EmployeeDependent, LaborContract, ContractAppendix, ContractType, ContractStatus,
    TaxBracket, TaxBracketStatus, SalaryDeductionRate, PayrollPolicyConfig,
    PayrollParameter, AllowanceGroup, AllowanceType,
    PayrollPeriod, PayrollSlip, PayrollPeriodStatus,
    AttendanceCode, DailyAttendance, MonthlyAttendanceSummary
)
from django.contrib.auth import get_user_model

User = get_user_model()

class EmployeeSerializer(serializers.ModelSerializer):
    department_label = serializers.CharField(source='get_department_display', read_only=True)
    role_label = serializers.CharField(source='get_role_display', read_only=True)
    gender_label = serializers.CharField(source='get_gender_display', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    dependents_count = serializers.SerializerMethodField()
    active_contract = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'code', 'full_name', 'nickname', 'phone_number', 'zalo_id', 'email',
            'department', 'department_label', 'role', 'role_label',
            'gender', 'gender_label', 'date_of_birth',
            'national_id', 'national_id_date', 'national_id_place',
            'tax_id', 'insurance_number', 'permanent_address', 'current_address',
            'bank_account', 'bank_name', 'bank_branch', 'bank_beneficiary',
            'join_date', 'resign_date', 'is_social_insurance_participant', 'insurance_salary',
            'license_number', 'license_expiry', 'base_salary', 'current_advance',
            'avatar', 'signature_image',
            'dependents_count', 'active_contract',
            'is_active', 'user', 'username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_advance']

    def get_dependents_count(self, obj):
        return obj.dependents.filter(is_active=True).count()

    def get_active_contract(self, obj):
        c = obj.contracts.filter(status=ContractStatus.ACTIVE).first()
        if c:
            return {
                'id': c.id,
                'contract_number': c.contract_number,
                'contract_type': c.contract_type,
                'contract_type_label': c.get_contract_type_display(),
                'start_date': c.start_date,
                'end_date': c.end_date,
            }
        return None

    def validate_code(self, value):
        code = value.strip().upper()
        if not code:
            raise serializers.ValidationError("Mã nhân viên không được để trống.")
        qs = Employee.all_objects.filter(code=code)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Mã nhân viên '{code}' đã tồn tại trong hệ thống.")
        return code

    def validate_phone_number(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Số điện thoại không được để trống.")
        return val


class EmployeeDependentSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.code', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = EmployeeDependent
        fields = [
            'id', 'employee', 'employee_code', 'employee_name',
            'full_name', 'relationship', 'national_id', 'date_of_birth',
            'tax_id', 'start_date', 'end_date', 'is_active', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContractAppendixSerializer(serializers.ModelSerializer):
    contract_number = serializers.CharField(source='contract.contract_number', read_only=True)

    class Meta:
        model = ContractAppendix
        fields = [
            'id', 'contract', 'contract_number', 'appendix_number',
            'effective_date', 'new_base_salary', 'new_role', 'change_summary',
            'appendix_file', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class LaborContractSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.code', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    contract_type_label = serializers.CharField(source='get_contract_type_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    appendices = ContractAppendixSerializer(many=True, read_only=True)

    class Meta:
        model = LaborContract
        fields = [
            'id', 'contract_number', 'employee', 'employee_code', 'employee_name',
            'contract_type', 'contract_type_label', 'status', 'status_label',
            'sign_date', 'start_date', 'end_date', 'job_title', 'working_address',
            'base_salary', 'insurance_salary', 'allowance_notes', 'contract_file',
            'notes', 'appendices', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_contract_number(self, value):
        val = value.strip() if value else ''
        if not val:
            raise serializers.ValidationError("Số hợp đồng không được để trống.")
        qs = LaborContract.all_objects.filter(contract_number=val)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Số hợp đồng '{val}' đã tồn tại trong hệ thống.")
        return val


class TaxBracketSerializer(serializers.ModelSerializer):
    tax_rate_percent = serializers.SerializerMethodField()
    level = serializers.IntegerField(source='bracket_level', read_only=True)
    quick_deduction = serializers.DecimalField(source='quick_subtraction', max_digits=15, decimal_places=0, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TaxBracket
        fields = [
            'id', 'bracket_level', 'level', 'min_income', 'max_income',
            'tax_rate', 'tax_rate_percent', 'quick_subtraction', 'quick_deduction',
            'quick_formula', 'effective_date', 'expiry_date', 'status', 'status_label',
            'is_active', 'legal_basis', 'description'
        ]

    def get_tax_rate_percent(self, obj):
        if obj.tax_rate >= 1:
            return f"{obj.tax_rate:,.0f}%"
        return f"{int(obj.tax_rate * 100)}%"


class SalaryDeductionRateSerializer(serializers.ModelSerializer):
    total_employee_rate = serializers.SerializerMethodField()
    total_employer_rate = serializers.SerializerMethodField()

    class Meta:
        model = SalaryDeductionRate
        fields = [
            'id', 'name',
            'bhxh_employee_rate', 'bhyt_employee_rate', 'bhtn_employee_rate', 'union_employee_rate', 'total_employee_rate',
            'bhxh_employer_rate', 'bhyt_employer_rate', 'bhtn_employer_rate', 'union_employer_rate', 'total_employer_rate',
            'effective_date', 'description', 'is_active'
        ]

    def get_total_employee_rate(self, obj):
        return float(obj.bhxh_employee_rate + obj.bhyt_employee_rate + obj.bhtn_employee_rate)

    def get_total_employer_rate(self, obj):
        return float(obj.bhxh_employer_rate + obj.bhyt_employer_rate + obj.bhtn_employer_rate + obj.union_employer_rate)


class PayrollPolicyConfigSerializer(serializers.ModelSerializer):
    personal_deduction = serializers.DecimalField(source='personal_relief', max_digits=15, decimal_places=0, read_only=True)
    dependent_deduction = serializers.DecimalField(source='dependent_relief', max_digits=15, decimal_places=0, read_only=True)
    base_salary_cap = serializers.DecimalField(source='max_insurance_salary', max_digits=15, decimal_places=0, read_only=True)

    class Meta:
        model = PayrollPolicyConfig
        fields = [
            'id', 'name', 'personal_relief', 'personal_deduction',
            'dependent_relief', 'dependent_deduction',
            'standard_working_days', 'max_insurance_salary', 'base_salary_cap',
            'legal_basis', 'effective_date', 'is_active'
        ]


class PayrollParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollParameter
        fields = [
            'id', 'code', 'name', 'value', 'unit',
            'legal_basis', 'effective_date', 'expiry_date',
            'is_active', 'order'
        ]


class AllowanceTypeSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source='get_category_display', read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = AllowanceType
        fields = [
            'id', 'group', 'group_name', 'code', 'name',
            'category', 'category_label', 'description', 'legal_basis',
            'default_amount', 'level_1_amount', 'level_2_amount',
            'is_insurance_applicable', 'is_taxable', 'is_active', 'order'
        ]


class AllowanceGroupSerializer(serializers.ModelSerializer):
    items = AllowanceTypeSerializer(many=True, read_only=True)

    class Meta:
        model = AllowanceGroup
        fields = ['id', 'code', 'name', 'description', 'order', 'is_active', 'items']


class PayrollPeriodSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    cash_transaction_code = serializers.CharField(source='cash_transaction.code', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)

    class Meta:
        model = PayrollPeriod
        fields = [
            'id', 'period_code', 'name', 'from_date', 'to_date', 'standard_days',
            'status', 'status_label',
            'total_employees', 'total_gross', 'total_net',
            'total_insurance_employee', 'total_insurance_employer',
            'total_pit', 'total_advances_deducted',
            'cash_transaction', 'cash_transaction_code',
            'approved_by', 'approved_by_name', 'approved_at', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'total_employees', 'total_gross', 'total_net',
            'total_insurance_employee', 'total_insurance_employer',
            'total_pit', 'total_advances_deducted',
            'cash_transaction', 'approved_by', 'approved_at'
        ]


class PayrollSlipSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.code', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_nickname = serializers.CharField(source='employee.nickname', read_only=True)
    employee_phone = serializers.CharField(source='employee.phone_number', read_only=True)
    period_code = serializers.CharField(source='period.period_code', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    role_label = serializers.SerializerMethodField()
    department_label = serializers.SerializerMethodField()

    class Meta:
        model = PayrollSlip
        fields = [
            'id', 'period', 'period_code', 'period_name',
            'employee', 'employee_code', 'employee_name', 'employee_nickname', 'employee_phone',
            'slip_code', 'role', 'role_label', 'department', 'department_label',
            'bank_account', 'bank_name', 'bank_beneficiary',
            'actual_working_days', 'base_salary', 'time_salary',
            'trip_count', 'trip_allowance', 'dropoff_trip_count', 'dropoff_allowance',
            'detention_allowance', 'fuel_bonus',
            'phone_allowance', 'lunch_allowance', 'other_allowance', 'kpi_bonus',
            'gross_income',
            'insurance_base', 'bhxh_employee', 'bhyt_employee', 'bhtn_employee',
            'total_insurance_employee', 'total_insurance_employer', 'union_fee_employer',
            'dependents_count', 'personal_relief_amount', 'dependent_relief_amount',
            'taxable_income', 'pit_amount',
            'advance_deductions', 'other_deductions',
            'net_salary', 'is_paid', 'payment_date', 'payment_method', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'slip_code']

    def get_role_label(self, obj):
        for val, lbl in EmployeeRole.choices:
            if val == obj.role:
                return lbl
        return obj.role

    def get_department_label(self, obj):
        for val, lbl in Department.choices:
            if val == obj.department:
                return lbl
        return obj.department


# ==============================================================================
# 5. SERIALIZERS CHẤM CÔNG (TIMEKEEPING SERIALIZERS)
# ==============================================================================

class AttendanceCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceCode
        fields = [
            'id', 'code', 'name', 'work_weight', 'salary_rate',
            'is_paid', 'color', 'order', 'is_active'
        ]


class DailyAttendanceSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.code', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    code_name = serializers.CharField(source='attendance_code.name', read_only=True)
    color = serializers.CharField(source='attendance_code.color', read_only=True)

    class Meta:
        model = DailyAttendance
        fields = [
            'id', 'employee', 'employee_code', 'employee_name',
            'work_date', 'attendance_code', 'code_symbol', 'code_name', 'color',
            'work_hours', 'overtime_hours', 'notes'
        ]


class MonthlyAttendanceSummarySerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source='employee.code', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_role = serializers.CharField(source='employee.role', read_only=True)
    employee_role_label = serializers.CharField(source='employee.get_role_display', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    department_label = serializers.CharField(source='employee.get_department_display', read_only=True)
    period_code = serializers.CharField(source='period.period_code', read_only=True)
    base_salary = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyAttendanceSummary
        fields = [
            'id', 'employee', 'employee_code', 'employee_name', 'employee_role', 'employee_role_label',
            'department', 'department_label', 'base_salary',
            'period', 'period_code', 'standard_days',
            'worked_days', 'paid_leave_days', 'holiday_days', 'unpaid_leave_days',
            'total_paid_days', 'overtime_hours', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_base_salary(self, obj):
        active_contract = LaborContract.objects.filter(employee=obj.employee, status='ACTIVE').first()
        if active_contract and active_contract.base_salary:
            return float(active_contract.base_salary)
        return float(obj.employee.base_salary or 0)

