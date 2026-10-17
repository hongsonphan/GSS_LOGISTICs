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
from django.contrib.auth import authenticate
from apps.personnel.models import Employee, Department, EmployeeRole

ACCOUNTS_CONFIG = [
    {
        'username': 'admin',
        'password': 'Admin@2026',
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
        'password': 'DieuDo@2026',
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
        'password': 'KeToan@2026',
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
        'password': 'Sales@2026',
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
        'password': 'NhanSu@2026',
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
        'password': 'TaiXe@2026',
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
    u.set_password(acc['password'])
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

    # Kiểm tra xác thực ngay lập tức
    auth_ok = authenticate(username=acc['username'], password=acc['password']) is not None
    status_str = "HỢP LỆ (AUTH OK)" if auth_ok else "LỖI XÁC THỰC"
    print(f"[{status_str}] Tài khoản: {acc['username']:10s} | Mật khẩu: {acc['password']:12s} | Họ tên: {acc['full_name']:28s} | Phòng ban: {acc['department']:12s} | Vị trí: {acc['role']:12s}")

print("\nHoàn tất thiết lập tài khoản Production!")
