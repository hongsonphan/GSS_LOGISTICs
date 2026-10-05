from rest_framework import serializers
from apps.personnel.models import Employee, Department, EmployeeRole
from django.contrib.auth import get_user_model

User = get_user_model()

class EmployeeSerializer(serializers.ModelSerializer):
    department_label = serializers.CharField(source='get_department_display', read_only=True)
    role_label = serializers.CharField(source='get_role_display', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'code', 'full_name', 'nickname', 'phone_number', 'zalo_id',
            'department', 'department_label', 'role', 'role_label',
            'license_number', 'license_expiry', 'base_salary', 'current_advance',
            'is_active', 'user', 'username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_advance']

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
