from django.db import models
from core.models import TimeStampedModel, SoftDeleteModel

class Department(models.TextChoices):
    DISPATCH = 'DISPATCH', 'Phòng Điều Vận'
    FLEET = 'FLEET', 'Đội Xe & Bãi'
    SALES = 'SALES', 'Phòng Kinh Doanh'
    CUSTOMS = 'CUSTOMS', 'Thủ Tục Hải Quan'
    HR = 'HR', 'Hành Chính Nhân Sự'
    ACCOUNTING = 'ACCOUNTING', 'Kế Toán Tài Chính'
    MANAGEMENT = 'MANAGEMENT', 'Ban Giám Đốc'

class EmployeeRole(models.TextChoices):
    DIRECTOR = 'DIRECTOR', 'Ban Giám Đốc'
    DISPATCHER = 'DISPATCHER', 'Điều độ viên'
    DRIVER = 'DRIVER', 'Tài xế'
    ACCOUNTANT = 'ACCOUNTANT', 'Kế toán viên'
    SALESMAN = 'SALESMAN', 'Nhân viên Kinh doanh'
    MECHANIC = 'MECHANIC', 'Kỹ thuật viên bãi xe'

class Employee(TimeStampedModel, SoftDeleteModel):
    code = models.CharField(max_length=20, unique=True, db_index=True) # TX001, DD001, BGD01...
    full_name = models.CharField(max_length=100)
    nickname = models.CharField(max_length=50, blank=True, help_text="Biệt danh hiện trường: BỤI 94, LIBRA, 61S...")
    phone_number = models.CharField(max_length=15, db_index=True)
    zalo_id = models.CharField(max_length=50, blank=True)
    department = models.CharField(max_length=20, choices=Department.choices, default=Department.FLEET)
    role = models.CharField(max_length=20, choices=EmployeeRole.choices, default=EmployeeRole.DRIVER)
    
    # Thông tin chuyên môn cho tài xế
    license_number = models.CharField(max_length=50, blank=True, help_text="Số giấy phép lái xe (hạng C, FC)")
    license_expiry = models.DateField(null=True, blank=True)
    base_salary = models.DecimalField(max_digits=12, decimal_places=0, default=5000000)
    current_advance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tiền tạm ứng trong tháng")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        display_name = f"{self.full_name} ({self.nickname})" if self.nickname else self.full_name
        return f"[{self.code}] {display_name}"
