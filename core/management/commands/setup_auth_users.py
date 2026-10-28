from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.personnel.models import Employee, Department, EmployeeRole

class Command(BaseCommand):
    help = 'Khởi tạo các tài khoản người dùng mẫu và liên kết với Employee cho môi trường Local / Demo.'

    def handle(self, *args, **options):
        from django.conf import settings
        from django.core.management.base import CommandError
        # Tài khoản demo có mật khẩu mẫu cố định -> tuyệt đối không chạy trên hệ thống thật
        if not settings.DEBUG:
            raise CommandError('setup_auth_users chỉ dùng cho môi trường dev/demo (DEBUG=True). Không chạy trên production.')
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
                'username': 'sales',
                'password': 'Sales@2026',
                'email': 'sales@bim.info.vn',
                'is_staff': False,
                'is_superuser': False,
                'emp_code': 'KD001',
                'full_name': 'Nguyễn Văn Sales',
                'nickname': 'KINH DOANH',
                'role': EmployeeRole.SALESMAN,
                'department': Department.SALES,
                'phone': '0901888999',
                'group_name': 'Kinh Doanh (Sales)'
            },
            {
                'username': 'nhansu',
                'password': 'NhanSu@2026',
                'email': 'nhansu@bim.info.vn',
                'is_staff': False,
                'is_superuser': False,
                'emp_code': 'NS001',
                'full_name': 'Lê Thị Thu Thảo',
                'nickname': 'QUẢN LÝ NHÂN SỰ',
                'role': EmployeeRole.ACCOUNTANT,
                'department': Department.HR,
                'phone': '0903334455',
                'group_name': 'Quản Lý Nhân Sự'
            },
        ]

        for acc in demo_accounts:
            user, created = User.objects.get_or_create(username=acc['username'])
            if created:
                user.set_password(acc['password'])
                user.email = acc['email']
                user.is_staff = acc['is_staff']
                user.is_superuser = acc['is_superuser']
                user.is_active = True
                user.save()
                self.stdout.write(self.style.SUCCESS(f"[Created User] Khoi tao tai khoan moi: {acc['username']}"))
            else:
                # BẢO VỆ DỮ LIỆU ĐÃ CẤU HÌNH CỦA NGƯỜI DÙNG:
                # Tuyệt đối không được ghi đè email, mật khẩu hay họ tên của tài khoản đã tồn tại!
                self.stdout.write(self.style.NOTICE(f"[Preserved User] Tai khoan {acc['username']} da ton tai - Giu nguyen email/mat khau nguoi dung da cau hinh."))

            emp = getattr(Employee, 'all_objects', Employee.objects).filter(code=acc['emp_code']).first()
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
                if not emp.user:
                    emp.user = user
                    emp.is_deleted = False
                    emp.save(update_fields=['user', 'is_deleted'])

            # Gán Nhóm vai trò (Group) tương ứng
            group_name = acc.get('group_name')
            if not group_name:
                if acc['username'] == 'admin':
                    group_name = 'Ban Giám Đốc'
                elif acc['username'] == 'dieudo':
                    group_name = 'Điều Phối Viên'
                elif acc['username'] == 'ketoan':
                    group_name = 'Kế Toán Cước'
            
            if group_name:
                from django.contrib.auth.models import Group
                grp = Group.objects.filter(name=group_name).first()
                if grp:
                    user.groups.set([grp])

            status_str = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(
                f"[{status_str}] User: {acc['username']} | Role: {acc['role']} ({acc['emp_code']})"
            ))

        # Loại trừ tài khoản taixe khỏi quyền truy cập hệ thống
        taixe_user = User.objects.filter(username='taixe').first()
        if taixe_user:
            taixe_user.is_active = False
            taixe_user.groups.clear()
            taixe_user.save()
            # Hủy liên kết user khỏi Employee tài xế (TX001)
            Employee.objects.filter(user=taixe_user).update(user=None)
            self.stdout.write(self.style.WARNING("[Deactivated] Tai khoan taixe da duoc vo hieu hoa va tach khoi he thong."))

        self.stdout.write(self.style.SUCCESS("=== HOAN TAT THIET LAP USERS THANH CONG ==="))
