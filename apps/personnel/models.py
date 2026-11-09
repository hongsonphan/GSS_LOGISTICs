from django.db import models
from django.conf import settings
from core.models import CompanyOwnedModel, TimeStampedModel, SoftDeleteModel

class Department(models.TextChoices):
    ADMIN_ACC = 'ADMIN_ACC', 'Phòng Hành Chính & Kế Toán'
    DISPATCH = 'DISPATCH', 'Phòng Điều Vận'
    SALES = 'SALES', 'Phòng Kinh Doanh'
    MAINTENANCE = 'MAINTENANCE', 'Phòng Bảo Trì Vận Hành'
    CUSTOMS = 'CUSTOMS', 'Phòng Dịch Vụ Hải Quan'
    MANAGEMENT = 'MANAGEMENT', 'Ban Giám Đốc'

    # Tương thích ngược dữ liệu cũ
    FLEET = 'FLEET', 'Đội Xe & Bãi (Bảo Trì Vận Hành)'
    ACCOUNTING = 'ACCOUNTING', 'Kế Toán Tài Chính'
    HR = 'HR', 'Hành Chính Nhân Sự'

class EmployeeRole(models.TextChoices):
    # Cấp Quản Trị
    DIRECTOR = 'DIRECTOR', 'Giám Đốc'

    # 1. Phòng Hành Chính & Kế Toán (2 vị trí)
    LEAD_ADMIN_ACC = 'LEAD_ADMIN_ACC', 'Chuyên viên Phụ trách (HC & Kế toán)'
    STAFF_ADMIN_ACC = 'STAFF_ADMIN_ACC', 'Nhân viên (HC & Kế toán)'

    # 2. Phòng Điều Vận (4 vị trí)
    LEAD_DISPATCH = 'LEAD_DISPATCH', 'Chuyên viên Phụ trách (Điều vận)'
    DISPATCHER = 'DISPATCHER', 'Nhân viên Điều vận'
    DISPATCH_ASST = 'DISPATCH_ASST', 'Nhân viên Hỗ trợ (Điều vận)'
    DRIVER = 'DRIVER', 'Tài xế & Giao nhận'

    # 3. Phòng Kinh Doanh (3 vị trí)
    LEAD_SALES = 'LEAD_SALES', 'Chuyên viên Phụ trách (Kinh doanh)'
    SALESMAN = 'SALESMAN', 'Nhân viên Kinh doanh'
    CSKH = 'CSKH', 'Admin / CSKH'

    # 4. Phòng Bảo Trì Vận Hành (2 vị trí)
    LEAD_MAINT = 'LEAD_MAINT', 'Chuyên viên Phụ trách (Bảo trì vận hành)'
    MECHANIC = 'MECHANIC', 'Nhân viên Bảo trì'

    # 5. Phòng Dịch Vụ Hải Quan (2 vị trí)
    LEAD_CUSTOMS = 'LEAD_CUSTOMS', 'Chuyên viên Phụ trách (Dịch vụ hải quan)'
    CUSTOMS_STAFF = 'CUSTOMS_STAFF', 'Nhân viên xử lý (Hải quan)'

    # 6. Bãi depot (GSS)
    YARD_KEEPER = 'YARD_KEEPER', 'Thủ bãi'

    # Tương thích ngược
    ACCOUNTANT = 'ACCOUNTANT', 'Kế toán viên'

class EmployeeGender(models.TextChoices):
    MALE = 'MALE', 'Nam'
    FEMALE = 'FEMALE', 'Nữ'
    OTHER = 'OTHER', 'Khác'

class Employee(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """
    Hồ sơ nhân sự toàn diện 360° Green Solutions Supply.
    Định danh, liên hệ, giấy phép lái xe và tài khoản đăng nhập của nhân viên nội bộ.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='employee')
    code = models.CharField(max_length=20, unique=True, db_index=True) # TX001, DD001, BGD01...
    full_name = models.CharField(max_length=100)
    nickname = models.CharField(max_length=50, blank=True, help_text="Biệt danh hiện trường: BỤI 94, LIBRA, 61S...")
    phone_number = models.CharField(max_length=15, db_index=True)
    zalo_id = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    department = models.CharField(max_length=20, choices=Department.choices, default=Department.FLEET)
    role = models.CharField(max_length=20, choices=EmployeeRole.choices, default=EmployeeRole.DRIVER)

    # Thông tin nhân thân & pháp lý
    gender = models.CharField(max_length=10, choices=EmployeeGender.choices, default=EmployeeGender.MALE)
    date_of_birth = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=20, blank=True, db_index=True, help_text="Số CCCD / CMND")
    national_id_date = models.DateField(null=True, blank=True, help_text="Ngày cấp CCCD")
    national_id_place = models.CharField(max_length=150, blank=True, help_text="Nơi cấp CCCD")
    tax_id = models.CharField(max_length=20, blank=True, db_index=True, help_text="Mã số thuế cá nhân")
    insurance_number = models.CharField(max_length=20, blank=True, help_text="Mã số BHXH")
    permanent_address = models.CharField(max_length=255, blank=True, help_text="Địa chỉ thường trú")
    current_address = models.CharField(max_length=255, blank=True, help_text="Chỗ ở hiện nay")

    # Thông tin tài khoản ngân hàng
    bank_account = models.CharField(max_length=50, blank=True, help_text="Số tài khoản nhận lương")
    bank_name = models.CharField(max_length=100, blank=True, help_text="Tên ngân hàng (Vietcombank, MBBank...)")
    bank_branch = models.CharField(max_length=100, blank=True, help_text="Chi nhánh ngân hàng")
    bank_beneficiary = models.CharField(max_length=100, blank=True, help_text="Tên chủ tài khoản")

    # Thông tin việc làm
    join_date = models.DateField(null=True, blank=True, help_text="Ngày bắt đầu làm việc")
    resign_date = models.DateField(null=True, blank=True, help_text="Ngày thôi việc (nếu có)")

    # Thông tin chuyên môn cho tài xế
    license_number = models.CharField(max_length=50, blank=True, help_text="Số giấy phép lái xe (hạng C, FC)")
    license_expiry = models.DateField(null=True, blank=True, help_text="Hạn giấy phép lái xe")

    # Hồ sơ đính kèm
    avatar = models.FileField(upload_to='personnel/avatars/', blank=True, null=True, help_text="Ảnh chân dung nhân sự")
    signature_image = models.FileField(upload_to='personnel/signatures/', blank=True, null=True, help_text="Chữ ký điện tử / mẫu")

    is_active = models.BooleanField(default=True)
    is_department_head = models.BooleanField(default=False, verbose_name="Trưởng bộ phận / Quản lý", help_text="Đánh dấu là Trưởng phòng / Cấp quản lý bộ phận")
    excluded_permissions = models.ManyToManyField(
        'auth.Permission',
        blank=True,
        related_name='excluded_employees',
        verbose_name="Quyền bị loại trừ khỏi nhóm"
    )

    @classmethod
    def generate_next_code(cls, role=None, department=None):
        """
        Quy tắc sinh mã nhân viên tự động:
        - Tài xế (DRIVER) hoặc Đội xe (FLEET): TX[STT]
        - Điều độ (DISPATCHER) hoặc Điều vận (DISPATCH): DD[STT]
        - Kế toán (ACCOUNTANT) hoặc Kế toán tài chính (ACCOUNTING): KT[STT]
        - Kinh doanh (SALESMAN) hoặc Kinh doanh (SALES): KD[STT]
        - Kỹ thuật / Cơ khí (MECHANIC): CK[STT]
        - Ban Giám Đốc (DIRECTOR / MANAGEMENT): BGD[STT]
        - Khác: NV[STT]
        """
        import re
        if role == EmployeeRole.DRIVER or (department in [Department.DISPATCH, Department.FLEET] and role == EmployeeRole.DRIVER):
            prefix = 'TX'
        elif role in [EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH, EmployeeRole.DISPATCH_ASST] or department == Department.DISPATCH:
            prefix = 'DD'
        elif role in [EmployeeRole.LEAD_ADMIN_ACC, EmployeeRole.STAFF_ADMIN_ACC, EmployeeRole.ACCOUNTANT] or department in [Department.ADMIN_ACC, Department.ACCOUNTING, Department.HR]:
            prefix = 'KT'
        elif role in [EmployeeRole.SALESMAN, EmployeeRole.LEAD_SALES, EmployeeRole.CSKH] or department == Department.SALES:
            prefix = 'KD'
        elif role in [EmployeeRole.MECHANIC, EmployeeRole.LEAD_MAINT] or department in [Department.MAINTENANCE, Department.FLEET]:
            prefix = 'BT'
        elif role in [EmployeeRole.CUSTOMS_STAFF, EmployeeRole.LEAD_CUSTOMS] or department == Department.CUSTOMS:
            prefix = 'HQ'
        elif role == EmployeeRole.DIRECTOR or department == Department.MANAGEMENT:
            prefix = 'BGD'
        else:
            prefix = 'NV'

        codes = cls.all_objects.filter(code__startswith=prefix).values_list('code', flat=True)
        max_num = 0
        pattern = re.compile(rf"^{re.escape(prefix)}(\d+)$", re.IGNORECASE)
        for c in codes:
            match = pattern.match(c or '')
            if match:
                try:
                    num = int(match.group(1))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
        next_num = max_num + 1
        return f"{prefix}{next_num:03d}"

    def save(self, *args, **kwargs):
        if not self.code or not str(self.code).strip():
            self.code = self.generate_next_code(self.role, self.department)
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        """Giải phóng tài khoản đăng nhập khi xóa mềm nhân sự."""
        if self.user_id:
            self.user = None
            self.save(update_fields=['user'])
        super().delete(using=using, keep_parents=keep_parents)

    class Meta:
        ordering = ['code']

    def __str__(self):
        display_name = f"{self.full_name} ({self.nickname})" if self.nickname else self.full_name
        return f"[{self.code}] {display_name}"

    @property
    def hierarchy_level(self):
        """
        Cấp bậc quản trị nội bộ:
        100: Ban Giám Đốc (DIRECTOR / MANAGEMENT / Superuser)
        50: Trưởng phòng / Quản lý bộ phận (is_department_head hoặc HR)
        20: Chuyên viên / Nhân viên văn phòng
        10: Tài xế hiện trường
        """
        if self.role == EmployeeRole.DIRECTOR or self.department == Department.MANAGEMENT:
            return 100
        if self.is_department_head or self.role in [
            EmployeeRole.LEAD_ADMIN_ACC, EmployeeRole.LEAD_DISPATCH,
            EmployeeRole.LEAD_SALES, EmployeeRole.LEAD_MAINT, EmployeeRole.LEAD_CUSTOMS
        ] or self.department in [Department.ADMIN_ACC, Department.HR]:
            return 50
        if self.role == EmployeeRole.DRIVER:
            return 10
        return 20

    def can_post_news(self):
        """
        Kiểm tra quyền đăng bản tin công ty:
        Chỉ Ban Giám Đốc (100), Hành chính Nhân sự (50) hoặc Trưởng các phòng ban (50) mới được đăng thông báo.
        """
        return self.hierarchy_level >= 50

    def can_assign_task_to(self, target_employee):
        """
        Kiểm tra quyền giao việc theo nguyên tắc cấp trên giao cấp dưới:
        1. Ban Giám Đốc (100): Toàn quyền giao việc cho bất kỳ ai.
        2. Tự giao việc cho chính mình (Self-assignment): Luôn được phép để quản lý to-do cá nhân.
        3. Tuyệt đối không ai được giao việc cho Ban Giám Đốc (trừ chính Giám Đốc).
        4. Trưởng phòng (50):
           - Được giao việc cho nhân viên cấp dưới trong cùng phòng ban (hierarchy_level < 50).
           - Riêng HR (50): Được giao việc tuân thủ hồ sơ cho nhân sự các phòng ban khác.
           - Được gửi đề nghị phối hợp công việc ngang hàng cho Trưởng phòng khác (hierarchy_level == 50).
        5. Nhân viên chuyên viên thường (20): Chỉ được tự tạo việc cho chính bản thân mình, không được giao việc cho cấp trên hay đồng nghiệp.
        """
        if not target_employee:
            return True
        if self.id == target_employee.id:
            return True
        if self.hierarchy_level >= 100:
            return True
        if target_employee.hierarchy_level >= 100:
            return False
        if self.hierarchy_level >= 50:
            if self.department == Department.HR:
                return True
            if target_employee.department == self.department and target_employee.hierarchy_level < self.hierarchy_level:
                return True
            if target_employee.hierarchy_level == 50:
                return True
            return False
        return False

    @property
    def active_department(self):
        return self.department

    @property
    def active_role(self):
        return self.role

    @property
    def active_job_title(self):
        return self.get_role_display()
