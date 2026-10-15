from rest_framework import serializers
from apps.personnel.models import (
    Employee, Department, EmployeeRole, EmployeeGender,
    EmployeeDependent, LaborContract, ContractAppendix, ContractType, ContractStatus,
    TaxBracket, SalaryDeductionRate, PayrollPolicyConfig,
    PayrollPeriod, PayrollSlip, PayrollPeriodStatus
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
        qs = Employee.objects.filter(code=code)
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


class TaxBracketSerializer(serializers.ModelSerializer):
    tax_rate_percent = serializers.SerializerMethodField()

    class Meta:
        model = TaxBracket
        fields = [
            'id', 'bracket_level', 'min_income', 'max_income',
            'tax_rate', 'tax_rate_percent', 'quick_subtraction'
        ]

    def get_tax_rate_percent(self, obj):
        return f"{int(obj.tax_rate * 100)}%"


class SalaryDeductionRateSerializer(serializers.ModelSerializer):
    total_employee_rate = serializers.SerializerMethodField()
    total_employer_rate = serializers.SerializerMethodField()

    class Meta:
        model = SalaryDeductionRate
        fields = [
            'id', 'name',
            'bhxh_employee_rate', 'bhyt_employee_rate', 'bhtn_employee_rate', 'total_employee_rate',
            'bhxh_employer_rate', 'bhyt_employer_rate', 'bhtn_employer_rate', 'union_employer_rate', 'total_employer_rate',
            'is_active'
        ]

    def get_total_employee_rate(self, obj):
        return float(obj.bhxh_employee_rate + obj.bhyt_employee_rate + obj.bhtn_employee_rate)

    def get_total_employer_rate(self, obj):
        return float(obj.bhxh_employer_rate + obj.bhyt_employer_rate + obj.bhtn_employer_rate + obj.union_employer_rate)


class PayrollPolicyConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPolicyConfig
        fields = [
            'id', 'personal_relief', 'dependent_relief',
            'standard_working_days', 'max_insurance_salary', 'is_active'
        ]


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
