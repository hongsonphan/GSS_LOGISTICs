import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import Group, Permission, User

def setup_rbac():
    print("=== KHỞI TẠO CÁC NHÓM VAI TRÒ & PHÂN QUYỀN CHUẨN DJANGO ===")

    # 1. Định nghĩa 5 nhóm vai trò chuẩn Logistics
    roles_def = {
        'Ban Giám Đốc': {
            'apps': ['dispatch', 'billing', 'customers', 'fleet', 'personnel', 'master_data', 'customs', 'documents', 'exceptions'],
            'perms': 'all'
        },
        'Điều Phối Viên': {
            'apps': ['dispatch', 'fleet', 'customers', 'master_data'],
            'perms': ['view_', 'add_', 'change_']
        },
        'Kế Toán Cước': {
            'apps': ['billing', 'customers', 'dispatch'],
            'perms': ['view_', 'add_', 'change_']
        },
        'Kinh Doanh (Sales)': {
            'apps': ['customers', 'master_data'],
            'perms': ['view_', 'add_', 'change_']
        },
        'Tài Xế Hiện Trường': {
            'apps': [],
            'perms': []
        }
    }

    all_perms = Permission.objects.all()

    for role_name, config in roles_def.items():
        group, created = Group.objects.get_or_create(name=role_name)
        if config['perms'] == 'all':
            target_perms = all_perms.filter(content_type__app_label__in=config['apps'])
        elif isinstance(config['perms'], list) and config['perms']:
            q_perms = []
            for prefix in config['perms']:
                q_perms.extend(list(all_perms.filter(
                    content_type__app_label__in=config['apps'],
                    codename__startswith=prefix
                )))
            target_perms = q_perms
        else:
            target_perms = []

        group.permissions.set(target_perms)
        print(f"-> Nhóm '{role_name}': {group.permissions.count()} quyền hạn.")

    # 2. Gán nhóm cho các user tiêu chuẩn
    user_role_mapping = {
        'admin': 'Ban Giám Đốc',
        'dieudo': 'Điều Phối Viên',
        'ketoan': 'Kế Toán Cước',
        'taixe': 'Tài Xế Hiện Trường',
    }

    for username, role_name in user_role_mapping.items():
        try:
            u = User.objects.get(username=username)
            grp = Group.objects.get(name=role_name)
            u.groups.set([grp])
            if username in ['admin', 'dieudo', 'ketoan']:
                u.is_staff = True
            u.save()
            print(f"-> Gán user '{username}' vào nhóm '{role_name}' (is_staff={u.is_staff}).")
        except User.DoesNotExist:
            print(f"-! User '{username}' chưa tồn tại trong DB.")

    print("=== HOÀN TẤT THIẾT LẬP RBAC ===")

if __name__ == '__main__':
    setup_rbac()
