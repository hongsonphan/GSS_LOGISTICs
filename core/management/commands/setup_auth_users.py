from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.personnel.models import Employee, Department, EmployeeRole

class Command(BaseCommand):
    help = 'Khởi tạo các tài khoản người dùng mẫu và liên kết với Employee cho môi trường Local / Demo.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== THIET LAP TAI KHOAN NGUOI DUNG BIM LOGISTICS ==="))

        demo_accounts = [
            {
                'username': 'admin',
                'password': 'Admin@2026',
                'email': 'admin@bim.info.vn',
                'is_staff': True,
                'is_superuser': True,
                'emp_code': 'BGD01',
                'full_name': 'Võ Triền (Giám Đốc)',
                'nickname': 'TRIỀN VÕ',
                'role': EmployeeRole.DIRECTOR,
                'department': Department.MANAGEMENT,
                'phone': '0901234567',
            },
            {
                'username': 'dieudo',
                'password': 'DieuDo@2026',
                'email': 'dieudo@bim.info.vn',
                'is_staff': True,
                'is_superuser': False,
                'emp_code': 'DD001',
                'full_name': 'Trần Điều Độ',
                'nickname': 'ĐIỀU ĐỘ TRUNG TÂM',
                'role': EmployeeRole.DISPATCHER,
                'department': Department.DISPATCH,
                'phone': '0909888777',
            },
            {
                'username': 'ketoan',
                'password': 'KeToan@2026',
                'email': 'ketoan@bim.info.vn',
                'is_staff': False,
                'is_superuser': False,
                'emp_code': 'KT001',
                'full_name': 'Trần Thị Kế Toán',
                'nickname': 'KẾ TOÁN CƯỚC',
                'role': EmployeeRole.ACCOUNTANT,
                'department': Department.ACCOUNTING,
                'phone': '0908111222',
            },
            {
                'username': 'taixe',
                'password': 'TaiXe@2026',
                'email': 'taixe@bim.info.vn',
                'is_staff': False,
                'is_superuser': False,
                'emp_code': 'TX001',
                'full_name': 'Nguyễn Văn Bụi',
                'nickname': 'BỤI 94',
                'role': EmployeeRole.DRIVER,
                'department': Department.FLEET,
                'phone': '0903333444',
            },
        ]

        for acc in demo_accounts:
            user, created = User.objects.get_or_create(username=acc['username'])
            user.set_password(acc['password'])
            user.email = acc['email']
            user.is_staff = acc['is_staff']
            user.is_superuser = acc['is_superuser']
            user.is_active = True
            user.save()

            emp = Employee.objects.filter(code=acc['emp_code']).first()
            if not emp:
                emp = Employee.objects.create(
                    code=acc['emp_code'],
                    full_name=acc['full_name'],
                    nickname=acc['nickname'],
                    role=acc['role'],
                    department=acc['department'],
                    phone_number=acc['phone'],
                    user=user,
                )
            else:
                emp.user = user
                emp.full_name = acc['full_name']
                emp.role = acc['role']
                emp.department = acc['department']
                emp.save(update_fields=['user', 'full_name', 'role', 'department'])

            status_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(
                f"[{status_str}] User: {acc['username']} | Role: {acc['role']} ({acc['emp_code']})"
            ))

        self.stdout.write(self.style.SUCCESS("=== HOAN TAT THIET LAP USERS THANH CONG ==="))
