from django.contrib.auth.backends import ModelBackend

class BimPermissionBackend(ModelBackend):
    """
    Custom Authentication Backend cho GSS Logistics.
    Kế thừa chuẩn ModelBackend của Django, nhưng bổ sung cơ chế loại trừ quyền
    (Excluded / Negative Permissions) từ Employee.excluded_permissions.
    Xác thực mật khẩu chỉ qua mã băm (không có mật khẩu dự phòng).
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        return super().authenticate(request, username=username, password=password, **kwargs)

    def _get_excluded_permissions(self, user_obj):
        if not user_obj.is_authenticated:
            return set()
        emp = getattr(user_obj, 'employee', None)
        if not emp or not emp.pk:
            return set()
        
        # Lấy set string 'app_label.codename'
        return {
            f"{p.content_type.app_label}.{p.codename}"
            for p in emp.excluded_permissions.select_related('content_type').all()
        }

    def get_all_permissions(self, user_obj, obj=None):
        if not user_obj.is_active or user_obj.is_anonymous or obj is not None:
            return set()
        if user_obj.is_superuser:
            return super().get_all_permissions(user_obj, obj)

        raw_perms = super().get_all_permissions(user_obj, obj)
        excluded = self._get_excluded_permissions(user_obj)
        return raw_perms - excluded

    def has_perm(self, user_obj, perm, obj=None):
        if not user_obj.is_active or user_obj.is_anonymous:
            return False
        if user_obj.is_superuser:
            return True
        return perm in self.get_all_permissions(user_obj, obj)

    def has_module_perms(self, user_obj, app_label):
        if not user_obj.is_active or user_obj.is_anonymous:
            return False
        if user_obj.is_superuser:
            return True
        for p in self.get_all_permissions(user_obj):
            if p.startswith(f"{app_label}."):
                return True
        return False
