from rest_framework import serializers
from apps.personnel.models import Employee
from django.contrib.auth import get_user_model

User = get_user_model()

class EmployeeSerializer(serializers.ModelSerializer):
    department_label = serializers.CharField(source='get_department_display', read_only=True)
    role_label = serializers.CharField(source='get_role_display', read_only=True)
    gender_label = serializers.CharField(source='get_gender_display', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Employee
        fields = [
            'id', 'code', 'full_name', 'nickname', 'phone_number', 'zalo_id', 'email',
            'department', 'department_label', 'role', 'role_label',
            'gender', 'gender_label', 'date_of_birth',
            'national_id', 'national_id_date', 'national_id_place',
            'tax_id', 'insurance_number', 'permanent_address', 'current_address',
            'bank_account', 'bank_name', 'bank_branch', 'bank_beneficiary',
            'join_date', 'resign_date',
            'license_number', 'license_expiry',
            'avatar', 'signature_image',
            'is_active', 'user', 'username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

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

    def validate_user(self, value):
        if value:
            qs = Employee.all_objects.filter(user=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            # Tự động giải phóng user từ hồ sơ nhân sự cũ đã xóa mềm
            deleted_holders = qs.filter(is_deleted=True)
            if deleted_holders.exists():
                deleted_holders.update(user=None)
            # Kiểm tra nếu tài khoản đang được liên kết với nhân sự khác
            active_holder = qs.filter(is_deleted=False).first()
            if active_holder:
                raise serializers.ValidationError(
                    f"Tài khoản '{value.username}' hiện đang được liên kết với nhân sự {active_holder.code} ({active_holder.full_name}). Vui lòng gỡ liên kết ở nhân sự đó trước."
                )
        return value
