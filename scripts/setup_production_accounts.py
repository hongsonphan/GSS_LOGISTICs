import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth.models import User
from apps.personnel.models import Employee, Department, EmployeeRole

ACCOUNTS_CONFIG = [
    {
        'username': 'admin',
        'email': 'admin@trienvo.com',
        'first_name': 'Võ',
        'last_name': 'Triền',
        'code': 'BGD01',
        'full_name': 'Võ Triền (Giám Đốc)',
        'department': Department.MANAGEMENT,
        'role': EmployeeRole.DIRECTOR,
        'is_superuser': True,
        'is_staff': True,
    },
    {
        'username': 'dieudo',
        'email': 'dieudo@trienvo.com',
        'first_name': 'Trần',
        'last_name': 'Điều Độ',
        'code': 'DD001',
        'full_name': 'Trần Điều Độ',
        'department': Department.DISPATCH,
        'role': EmployeeRole.DISPATCHER,
        'is_superuser': False,
        'is_staff': True,
    },
    {
        'username': 'ketoan',
        'email': 'ketoan@trienvo.com',
        'first_name': 'Trần Thị',
        'last_name': 'Kế Toán',
        'code': 'KT001',
        'full_name': 'Trần Thị Kế Toán',
        'department': Department.ACCOUNTING,
        'role': EmployeeRole.ACCOUNTANT,
        'is_superuser': False,
        'is_staff': True,
    },
    {
        'username': 'sales',
        'email': 'sales@trienvo.com',
        'first_name': 'Lê Hoàng',
        'last_name': 'Nam',
        'code': 'KD001',
        'full_name': 'Lê Hoàng Nam',
        'department': Department.SALES,
        'role': EmployeeRole.SALESMAN,
        'is_superuser': False,
        'is_staff': True,
    },
    {
        'username': 'nhansu',
        'email': 'nhansu@trienvo.com',
        'first_name': 'Lê Thị Thu',
        'last_name': 'Thảo',
        'code': 'NS001',
        'full_name': 'Lê Thị Thu Thảo',
        'department': Department.HR,
        'role': EmployeeRole.ACCOUNTANT, # Role HR
        'is_superuser': False,
        'is_staff': True,
    },
    {
        'username': 'taixe',
        'email': 'taixe@trienvo.com',
        'first_name': 'Hoàng Văn',
        'last_name': 'Thật',
        'code': 'TX001',
        'full_name': 'Hoàng Văn Thật (Tài Xế)',
        'department': Department.FLEET,
        'role': EmployeeRole.DRIVER,
        'is_superuser': False,
        'is_staff': False,
    },
]

print("=== THIẾT LẬP VÀ KIỂM CHỨNG TÀI KHOẢN PRODUCTION TRIỀN VÕ LOGISTICS ===")
for acc in ACCOUNTS_CONFIG:
    u, created = User.objects.get_or_create(username=acc['username'])
    # Không bao giờ ghi đè mật khẩu tài khoản đang vận hành. Tài khoản mới: mật khẩu lấy từ biến môi trường
    # GSS_PASSWORD_<TÊN_ĐĂNG_NHẬP>; không có thì khoá mật khẩu và dùng "Quên mật khẩu" để người dùng tự đặt.
    if created:
        env_pw = os.environ.get('GSS_PASSWORD_' + acc['username'].upper(), '')
        if env_pw:
            u.set_password(env_pw)
        else:
            u.set_unusable_password()
        u.email = acc['email']
        u.first_name = acc['first_name']
        u.last_name = acc['last_name']
        u.is_superuser = acc['is_superuser']
        u.is_staff = acc['is_staff']
        u.is_active = True
        u.save()

    # Tạo hoặc liên kết Employee
    emp, emp_created = Employee.objects.get_or_create(
        code=acc['code'],
        defaults={
            'full_name': acc['full_name'],
            'department': acc['department'],
            'role': acc['role'],
            'phone_number': '0901234567',
            'user': u,
        }
    )
    if emp.user != u:
        emp.user = u
        emp.save()

    print(f"[{'TẠO MỚI' if created else 'GIỮ NGUYÊN'}] Tài khoản: {acc['username']:10s} | Họ tên: {acc['full_name']:28s} | Phòng ban: {acc['department']:12s} | Vị trí: {acc['role']:12s}")

print("\nHoàn tất thiết lập tài khoản Production!")
