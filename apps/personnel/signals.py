from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=User)
def sync_user_to_employee(sender, instance, created, **kwargs):
    """
    Tự động đồng bộ Họ Tên & Email từ User sang Employee tương ứng.
    Bảo đảm khi Quản trị viên cập nhật Họ Tên trong Django Admin (/admin/auth/user/),
    hồ sơ nhân sự và tên hiển thị trên Topbar, Chat, Giao việc được cập nhật ngay lập tức.
    """
    try:
        from apps.personnel.models import Employee
        emp = getattr(instance, 'employee', None)
        if not emp:
            emp = getattr(Employee, 'all_objects', Employee.objects).filter(user=instance).first()

        if emp:
            # Quy ước Họ Tên tiếng Việt: Họ (last_name) + Tên (first_name)
            last = (instance.last_name or '').strip()
            first = (instance.first_name or '').strip()

            if last and first:
                if first.startswith(last):
                    vn_full_name = first
                else:
                    vn_full_name = f"{last} {first}".strip()
            elif first:
                vn_full_name = first
            elif last:
                vn_full_name = last
            else:
                vn_full_name = emp.full_name

            update_fields = []
            if vn_full_name and emp.full_name != vn_full_name:
                emp.full_name = vn_full_name
                update_fields.append('full_name')

            if instance.email and emp.email != instance.email:
                emp.email = instance.email
                update_fields.append('email')

            if update_fields:
                emp.save(update_fields=update_fields)
    except Exception as e:
        pass
