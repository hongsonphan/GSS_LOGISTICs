import os
import sys
import django

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from apps.personnel.models import Employee

print("=== DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG TRONG HỆ THỐNG ===")
users = User.objects.all().order_by('id')
for u in users:
    emp = Employee.objects.filter(user=u).first()
    dept = emp.get_department_display() if emp else "Không có hồ sơ NV"
    pos = emp.get_role_display() if emp else ("Quản trị viên tối cao" if u.is_superuser else "Người dùng hệ thống")
    name = emp.full_name if emp else (u.get_full_name() or u.username)
    print(f"ID: {u.id:2d} | Username: {u.username:12s} | Mã NV: {(emp.code if emp else '-'):8s} | Họ tên: {name:25s} | PB: {dept:22s} | Vị trí: {pos:20s} | Superuser: {u.is_superuser} | Active: {u.is_active}")
