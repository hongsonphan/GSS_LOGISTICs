from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
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

class EmployeeGender(models.TextChoices):
    MALE = 'MALE', 'Nam'
    FEMALE = 'FEMALE', 'Nữ'
    OTHER = 'OTHER', 'Khác'

class ContractType(models.TextChoices):
    PROBATION = 'PROBATION', 'Thử việc (1 - 2 tháng)'
    DEFINITE_TERM = 'DEFINITE_TERM', 'Xác định thời hạn (1 - 3 năm)'
    INDEFINITE_TERM = 'INDEFINITE_TERM', 'Không xác định thời hạn'
    SEASONAL = 'SEASONAL', 'Thời vụ / Theo mùa vụ'

class ContractStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Dự thảo'
    ACTIVE = 'ACTIVE', 'Đang hiệu lực'
    EXPIRED = 'EXPIRED', 'Đã hết hạn'
    TERMINATED = 'TERMINATED', 'Đã chấm dứt'

class TaxResidentType(models.TextChoices):
    RESIDENT = 'RESIDENT', 'Cá nhân cư trú (Biểu lũy tiến)'
    CASUAL_10 = 'CASUAL_10', 'Thời vụ / Vãng lai (Khấu trừ 10%)'
    NON_RESIDENT = 'NON_RESIDENT', 'Không cư trú (Khấu trừ 20%)'

class PayrollPeriodStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Dự thảo (Đang tính)'
    REVIEWED = 'REVIEWED', 'Đã kiểm tra'
    LOCKED = 'LOCKED', 'Đã chốt sổ (Khóa)'
    PAID = 'PAID', 'Đã thanh toán (Chi quỹ)'


class Employee(TimeStampedModel, SoftDeleteModel):
    """
    Hồ sơ nhân sự toàn diện 360° Triền Võ Logistics.
    Quản lý đầy đủ định danh pháp lý, ngân hàng, BHXH, thuế TNCN, giấy phép lái xe và phân quyền.
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

    # Thông tin tài khoản ngân hàng chi lương
    bank_account = models.CharField(max_length=50, blank=True, help_text="Số tài khoản nhận lương")
    bank_name = models.CharField(max_length=100, blank=True, help_text="Tên ngân hàng (Vietcombank, MBBank...)")
    bank_branch = models.CharField(max_length=100, blank=True, help_text="Chi nhánh ngân hàng")
    bank_beneficiary = models.CharField(max_length=100, blank=True, help_text="Tên chủ tài khoản")

    # Thông tin việc làm & bảo hiểm
    join_date = models.DateField(null=True, blank=True, help_text="Ngày bắt đầu làm việc")
    resign_date = models.DateField(null=True, blank=True, help_text="Ngày thôi việc (nếu có)")
    is_social_insurance_participant = models.BooleanField(default=True, help_text="Tham gia trích nộp BHXH/BHYT/BHTN")
    insurance_salary = models.DecimalField(max_digits=12, decimal_places=0, default=5000000, help_text="Mức lương căn cứ đóng BHXH")

    # Thông tin chuyên môn cho tài xế
    license_number = models.CharField(max_length=50, blank=True, help_text="Số giấy phép lái xe (hạng C, FC)")
    license_expiry = models.DateField(null=True, blank=True, help_text="Hạn giấy phép lái xe")
    base_salary = models.DecimalField(max_digits=12, decimal_places=0, default=5000000, help_text="Lương căn bản / khoán")
    current_advance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tiền tạm ứng trong tháng")

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
        if self.is_department_head or self.department == Department.HR:
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
    def active_contract(self):
        """Hợp đồng lao động đang có hiệu lực pháp lý cao nhất."""
        return self.contracts.filter(
            status=ContractStatus.ACTIVE,
            is_active=True,
            is_deleted=False
        ).order_by('-start_date', '-created_at').first()

    @property
    def latest_appendix(self):
        """Phụ lục hợp đồng mới nhất đang có hiệu lực."""
        c = self.active_contract
        if not c:
            return None
        return c.appendices.filter(
            is_active=True,
            is_deleted=False,
            effective_date__lte=timezone.localdate()
        ).order_by('-effective_date', '-created_at').first()

    @property
    def active_department(self):
        app = self.latest_appendix
        if app and app.new_department:
            return app.new_department
        c = self.active_contract
        if c and c.department:
            return c.department
        return self.department

    @property
    def active_role(self):
        c = self.active_contract
        if c and c.role:
            return c.role
        return self.role

    @property
    def active_job_title(self):
        app = self.latest_appendix
        if app and app.new_role:
            return app.new_role
        c = self.active_contract
        if c and c.job_title:
            return c.job_title
        return self.get_role_display()

    @property
    def active_base_salary(self):
        app = self.latest_appendix
        if app and app.new_base_salary is not None:
            return app.new_base_salary
        c = self.active_contract
        if c and c.base_salary is not None:
            return c.base_salary
        return self.base_salary or Decimal('0')

    @property
    def active_insurance_salary(self):
        app = self.latest_appendix
        if app and app.new_insurance_salary is not None:
            return app.new_insurance_salary
        c = self.active_contract
        if c and c.insurance_salary is not None:
            return c.insurance_salary
        return self.insurance_salary or self.active_base_salary

    @property
    def active_allowance_amount(self):
        app = self.latest_appendix
        if app and app.new_allowance_amount is not None:
            return app.new_allowance_amount
        c = self.active_contract
        if c and c.allowance_amount is not None:
            return c.allowance_amount
        return Decimal('0')

    @property
    def active_subsidy_amount(self):
        app = self.latest_appendix
        if app and app.new_subsidy_amount is not None:
            return app.new_subsidy_amount
        c = self.active_contract
        if c and c.subsidy_amount is not None:
            return c.subsidy_amount
        return Decimal('0')

    @property
    def active_total_salary(self):
        app = self.latest_appendix
        if app and app.new_total_salary is not None:
            return app.new_total_salary
        c = self.active_contract
        if c and c.total_salary is not None and c.total_salary > 0:
            return c.total_salary
        return self.active_base_salary + self.active_allowance_amount + self.active_subsidy_amount

    @property
    def active_is_bhxh(self):
        app = self.latest_appendix
        if app and app.is_social_insurance_participant is not None:
            return app.is_social_insurance_participant
        c = self.active_contract
        if c is not None:
            return c.is_social_insurance_participant
        return self.is_social_insurance_participant

    @property
    def active_is_tncn(self):
        app = self.latest_appendix
        if app and app.is_taxable is not None:
            return app.is_taxable
        c = self.active_contract
        if c is not None:
            return c.is_taxable
        return True

    @property
    def active_is_cong_doan(self):
        app = self.latest_appendix
        if app and app.is_union_member is not None:
            return app.is_union_member
        c = self.active_contract
        if c is not None:
            return c.is_union_member
        return False

    @property
    def active_probation_rate(self):
        app = self.latest_appendix
        if app and app.probation_rate is not None:
            return app.probation_rate
        c = self.active_contract
        if c and c.probation_rate is not None:
            return c.probation_rate
        return Decimal('100.0')

    @property
    def active_tax_resident_type(self):
        c = self.active_contract
        if c and c.tax_resident_type:
            return c.tax_resident_type
        return TaxResidentType.RESIDENT


class EmployeeDependent(TimeStampedModel, SoftDeleteModel):
    """
    Người phụ thuộc đăng ký giảm trừ gia cảnh thuế TNCN theo quy định Luật thuế TNCN (4.4tr/người/tháng).
    """
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='dependents')
    full_name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=50, help_text="Mối quan hệ: Con, Vợ/Chồng, Cha, Mẹ...")
    national_id = models.CharField(max_length=20, blank=True, help_text="CCCD hoặc Giấy khai sinh")
    date_of_birth = models.DateField(null=True, blank=True)
    tax_id = models.CharField(max_length=20, blank=True, help_text="Mã số thuế người phụ thuộc")
    start_date = models.DateField(help_text="Tháng bắt đầu tính giảm trừ")
    end_date = models.DateField(null=True, blank=True, help_text="Tháng kết thúc tính giảm trừ (trống = vô thời hạn)")
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.full_name} ({self.relationship}) - NV: {self.employee.full_name}"


class LaborContract(TimeStampedModel, SoftDeleteModel):
    """
    Hợp đồng lao động Triền Võ Logistics.
    Lưu vết thời hạn, mức lương, chế độ bảo hiểm và file scan hợp đồng có chữ ký.
    """
    contract_number = models.CharField(max_length=50, unique=True, db_index=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='contracts')
    contract_type = models.CharField(max_length=30, choices=ContractType.choices, default=ContractType.DEFINITE_TERM)
    status = models.CharField(max_length=20, choices=ContractStatus.choices, default=ContractStatus.ACTIVE)
    department = models.CharField(max_length=20, choices=Department.choices, default=Department.FLEET, help_text="Phòng ban làm việc theo HĐ")
    role = models.CharField(max_length=20, choices=EmployeeRole.choices, default=EmployeeRole.DRIVER, help_text="Vị trí / Chức danh theo HĐ")
    sign_date = models.DateField(default=timezone.localdate)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True, help_text="Để trống nếu là HĐ không xác định thời hạn")
    job_title = models.CharField(max_length=100, blank=True, help_text="Chức danh công việc chi tiết theo HĐ")
    working_address = models.CharField(max_length=255, blank=True, default="Văn phòng / Bãi xe Triền Võ Logistics")

    # Chế độ tiền lương & trợ cấp theo HĐ
    base_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Mức lương chính theo HĐ")
    insurance_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Lương căn cứ đóng BHXH")
    allowance_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Các khoản phụ cấp lương cố định (điện thoại, trách nhiệm...)")
    subsidy_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Các khoản trợ cấp/hỗ trợ phúc lợi (ăn trưa, xăng xe, nhà ở...)")
    total_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng thu nhập theo hợp đồng")
    probation_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('100.0'), help_text="Tỷ lệ hưởng lương % (VD: 85% thử việc, 100% chính thức)")

    # Cờ tuân thủ pháp lý
    is_social_insurance_participant = models.BooleanField(default=True, help_text="Đóng BHXH theo HĐ (isBHXH)")
    is_taxable = models.BooleanField(default=True, help_text="Khấu trừ thuế TNCN theo HĐ (isTNCN)")
    is_union_member = models.BooleanField(default=False, help_text="Đoàn viên công đoàn - trích 1% LCB (isCongDoan)")
    tax_resident_type = models.CharField(max_length=20, choices=TaxResidentType.choices, default=TaxResidentType.RESIDENT, help_text="Phân loại đối tượng thuế TNCN")
    is_active = models.BooleanField(default=True, help_text="Hợp đồng đang có hiệu lực sử dụng")

    allowance_notes = models.TextField(blank=True, help_text="Chế độ phụ cấp, công tác phí, thưởng chuyến")
    contract_file = models.FileField(upload_to='personnel/contracts/', blank=True, null=True, help_text="File scan HĐ đính kèm")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-start_date', '-created_at']

    def __str__(self):
        return f"[{self.contract_number}] {self.employee.full_name} - {self.get_contract_type_display()}"

    def save(self, *args, **kwargs):
        self.total_salary = (self.base_salary or Decimal('0')) + (self.allowance_amount or Decimal('0')) + (self.subsidy_amount or Decimal('0'))
        super().save(*args, **kwargs)


class ContractAppendix(TimeStampedModel, SoftDeleteModel):
    """
    Phụ lục Hợp đồng lao động: Điều chỉnh mức lương, vị trí công tác hoặc gia hạn HĐ.
    """
    contract = models.ForeignKey(LaborContract, on_delete=models.CASCADE, related_name='appendices')
    appendix_number = models.CharField(max_length=50)
    effective_date = models.DateField()
    new_base_salary = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, help_text="Mức lương chính mới")
    new_insurance_salary = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, help_text="Mức lương đóng BHXH mới nếu điều chỉnh")
    new_allowance_amount = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, help_text="Phụ cấp mới")
    new_subsidy_amount = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, help_text="Trợ cấp mới")
    new_total_salary = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, help_text="Tổng thu nhập mới")
    new_department = models.CharField(max_length=20, choices=Department.choices, blank=True, help_text="Phòng ban mới")
    new_role = models.CharField(max_length=50, blank=True, help_text="Chức danh mới")
    is_social_insurance_participant = models.BooleanField(null=True, blank=True, help_text="Điều chỉnh tham gia BHXH (None = giữ nguyên HĐ)")
    is_taxable = models.BooleanField(null=True, blank=True, help_text="Điều chỉnh tính thuế TNCN (None = giữ nguyên HĐ)")
    is_union_member = models.BooleanField(null=True, blank=True, help_text="Điều chỉnh tham gia công đoàn (None = giữ nguyên HĐ)")
    probation_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Tỷ lệ hưởng lương mới %")
    is_active = models.BooleanField(default=True)
    change_summary = models.TextField(help_text="Nội dung điều chỉnh chi tiết")
    appendix_file = models.FileField(upload_to='personnel/contracts/', blank=True, null=True)

    class Meta:
        ordering = ['-effective_date']

    def __str__(self):
        return f"Phụ lục {self.appendix_number} - HĐ: {self.contract.contract_number}"

    def save(self, *args, **kwargs):
        base = self.new_base_salary if self.new_base_salary is not None else (self.contract.base_salary or Decimal('0'))
        allow = self.new_allowance_amount if self.new_allowance_amount is not None else (self.contract.allowance_amount or Decimal('0'))
        sub = self.new_subsidy_amount if self.new_subsidy_amount is not None else (self.contract.subsidy_amount or Decimal('0'))
        self.new_total_salary = base + allow + sub
        super().save(*args, **kwargs)


# ==============================================================================
# 3. CHẤM CÔNG & QUẢN LÝ NGÀY CÔNG (TIMEKEEPING & ATTENDANCE TRACKING)
# ==============================================================================

class AttendanceCode(TimeStampedModel):
    """
    Bảng khai báo ký hiệu chấm công chuẩn toàn hệ thống (Bim ERP standard).
    X (Đủ công), X/2 (Nửa công), P (Phép năm hưởng lương), L (Nghỉ Lễ hưởng lương),
    CT (Công tác), Ro (Nghỉ không lương), Om (Nghỉ ốm BHXH).
    """
    code = models.CharField(max_length=15, unique=True, help_text="Ký hiệu chấm công (X, P, L, CT, Ro...)")
    name = models.CharField(max_length=100, help_text="Tên diễn giải ký hiệu")
    work_weight = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal('1.0'), help_text="Hệ số ngày công (1.0, 0.5, 0.0)")
    salary_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('100.0'), help_text="Tỷ lệ hưởng lương % (100, 50, 0)")
    is_paid = models.BooleanField(default=True, help_text="Nghỉ hưởng lương hay không")
    color = models.CharField(max_length=30, default="teal", help_text="Mã màu badge hiển thị")
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'code']

    def __str__(self):
        return f"{self.code} - {self.name} ({self.work_weight} công)"


class DailyAttendance(TimeStampedModel, SoftDeleteModel):
    """
    Chấm công chi tiết theo từng ngày của nhân viên trong tháng.
    """
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='daily_attendances')
    work_date = models.DateField(db_index=True)
    attendance_code = models.ForeignKey(AttendanceCode, on_delete=models.SET_NULL, null=True, blank=True, related_name='attendances')
    code_symbol = models.CharField(max_length=15, default='X', help_text="Ký hiệu công ngày (X, P, L, Ro...)")
    work_hours = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('8.0'), help_text="Số giờ làm việc")
    overtime_hours = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('0.0'), help_text="Số giờ tăng ca")
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-work_date', 'employee__code']
        unique_together = ('employee', 'work_date')

    def __str__(self):
        return f"{self.employee.code} - {self.work_date}: {self.code_symbol}"


class MonthlyAttendanceSummary(TimeStampedModel, SoftDeleteModel):
    """
    Bảng tổng hợp công tháng của nhân sự phục vụ tính Lương Ngày Công:
    - standard_days: Công chuẩn (26 ngày)
    - worked_days: Số ngày đi làm thực tế
    - paid_leave_days: Nghỉ phép năm hưởng lương (P)
    - holiday_days: Nghỉ Lễ/Tết hưởng lương (L)
    - unpaid_leave_days: Nghỉ việc riêng không lương (Ro)
    - total_paid_days: Tổng ngày công tính lương thời gian = worked_days + paid_leave_days + holiday_days
    - overtime_hours: Giờ tăng ca
    """
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='monthly_attendances')
    period = models.ForeignKey('PayrollPeriod', on_delete=models.CASCADE, related_name='monthly_attendances')
    standard_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('26.0'))
    worked_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('26.0'), help_text="Số ngày đi làm thực tế")
    paid_leave_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('0.0'), help_text="Nghỉ phép hưởng lương")
    holiday_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('0.0'), help_text="Nghỉ Lễ hưởng lương")
    unpaid_leave_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('0.0'), help_text="Nghỉ không lương")
    total_paid_days = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal('26.0'), help_text="Tổng ngày công tính lương thời gian")
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal('0.0'), help_text="Giờ tăng ca")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['employee__code']
        unique_together = ('employee', 'period')

    def __str__(self):
        return f"{self.employee.full_name} ({self.period.period_code}): {self.total_paid_days}/{self.standard_days} công"

    def calculate_total_paid_days(self):
        self.total_paid_days = self.worked_days + self.paid_leave_days + self.holiday_days
        return self.total_paid_days


class TaxBracketStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Áp dụng'
    SUSPENDED = 'SUSPENDED', 'Tạm ngưng'
    EXPIRED = 'EXPIRED', 'Hết hạn'


class TaxBracket(TimeStampedModel):
    """
    Biểu thuế thu nhập cá nhân (TNCN) lũy tiến từng phần.
    Kế thừa chuẩn mực Bim ERP, cập nhật Luật Thuế TNCN số 109/2025/QH15 (Biểu thuế 5 bậc từ 01/01/2026).
    """
    bracket_level = models.IntegerField(unique=True, help_text="Bậc thuế (1 đến 5 hoặc 7)")
    min_income = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Thu nhập tính thuế tối thiểu (VNĐ)")
    max_income = models.DecimalField(max_digits=15, decimal_places=0, null=True, blank=True, help_text="Thu nhập tối đa (None = trên 100tr)")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Thuế suất % (5.0, 10.0, 20.0...) hoặc hệ số (0.05...)")
    quick_subtraction = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Số trừ nhanh tương ứng bậc thuế (VNĐ)")
    quick_formula = models.CharField(max_length=150, blank=True, default='', help_text="Công thức tính nhanh (Phương pháp rút gọn)")
    effective_date = models.DateField(default="2026-01-01", help_text="Ngày áp dụng hiệu lực")
    expiry_date = models.DateField(null=True, blank=True, help_text="Ngày hết hạn hiệu lực")
    status = models.CharField(max_length=20, choices=TaxBracketStatus.choices, default=TaxBracketStatus.ACTIVE, help_text="Trạng thái áp dụng")
    is_active = models.BooleanField(default=True, help_text="Đang áp dụng")
    legal_basis = models.CharField(
        max_length=255,
        default="Luật Thuế Thu nhập Cá nhân 109/2025/QH15, ban hành ngày 10/12/2025.",
        help_text="Quy định / Căn cứ pháp lý"
    )
    description = models.CharField(max_length=255, blank=True, default='', help_text="Ghi chú chi tiết")

    class Meta:
        ordering = ['bracket_level']

    def __str__(self):
        max_str = f"{self.max_income:,.0f} đ" if self.max_income else "trở lên"
        rate_disp = f"{self.tax_rate:,.0f}%" if self.tax_rate >= 1 else f"{int(self.tax_rate * 100)}%"
        return f"Bậc {self.bracket_level}: {self.min_income:,.0f} đ - {max_str} ({rate_disp})"

    @property
    def level(self):
        return self.bracket_level

    @property
    def quick_deduction(self):
        return self.quick_subtraction

    @property
    def rate_decimal(self):
        """Hệ số thập phân để tính toán: nếu tax_rate=5 thì ra 0.05, nếu 0.05 thì giữ nguyên."""
        if self.tax_rate > 1:
            return self.tax_rate / Decimal('100')
        return self.tax_rate


class PayrollPolicyConfig(TimeStampedModel):
    """
    Cấu hình tham số tính lương & chính sách giảm trừ thuế TNCN toàn hệ thống.
    Đồng bộ chuẩn Bim ERP theo Nghị quyết 110/2025/UBTVQH15 và Nghị định 73/2024/NĐ-CP.
    """
    name = models.CharField(max_length=100, default='Chính sách Lương chuẩn 2026', help_text="Tên chính sách")
    personal_relief = models.DecimalField(max_digits=15, decimal_places=0, default=15500000, help_text="Giảm trừ gia cảnh bản thân (15,500,000 đ/tháng)")
    dependent_relief = models.DecimalField(max_digits=15, decimal_places=0, default=6200000, help_text="Giảm trừ mỗi NPT (6,200,000 đ/người/tháng)")
    standard_working_days = models.DecimalField(max_digits=4, decimal_places=1, default=26.0, help_text="Số ngày công tiêu chuẩn hàng tháng")
    max_insurance_salary = models.DecimalField(max_digits=15, decimal_places=0, default=50800000, help_text="Mức trần đóng BHXH (20 lần lương cơ sở 2.54tr)")
    legal_basis = models.CharField(max_length=255, default="Nghị quyết số 110/2025/UBTVQH15 & Nghị định 73/2024/NĐ-CP", help_text="Căn cứ pháp lý")
    effective_date = models.DateField(default="2026-01-01", help_text="Ngày hiệu lực")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} (Bản thân: {self.personal_relief:,.0f}đ, NPT: {self.dependent_relief:,.0f}đ, Trần: {self.max_insurance_salary:,.0f}đ)"

    @property
    def personal_deduction(self):
        return self.personal_relief

    @property
    def dependent_deduction(self):
        return self.dependent_relief

    @property
    def base_salary_cap(self):
        return self.max_insurance_salary


class PayrollParameter(TimeStampedModel):
    """
    Chi tiết từng tham số chính sách Lương & Thuế theo từng kỳ hiệu lực (kế thừa từ Bim ERP).
    """
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Mã tham số")
    name = models.CharField(max_length=200, help_text="Tên tham số chính sách")
    value = models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text="Giá trị áp dụng")
    unit = models.CharField(max_length=50, default="VNĐ / tháng", help_text="Đơn vị tính")
    legal_basis = models.TextField(blank=True, help_text="Căn cứ áp dụng / Ghi chú pháp lý")
    effective_date = models.DateField(default="2026-01-01", help_text="Ngày hiệu lực")
    expiry_date = models.DateField(null=True, blank=True, help_text="Ngày hết hạn")
    is_active = models.BooleanField(default=True, help_text="Đang áp dụng")
    order = models.IntegerField(default=1, help_text="Thứ tự hiển thị")

    class Meta:
        ordering = ["order", "code"]

    def __str__(self):
        return f"[{self.code}] {self.name}: {self.value:,.0f} {self.unit}"


class SalaryDeductionRate(TimeStampedModel):
    """
    Tỷ lệ trích đóng các khoản bảo hiểm bắt buộc và công đoàn.
    Đồng bộ chuẩn Bim ERP theo Luật BHXH 2024, Luật BHYT, Luật Việc làm và Luật Công đoàn 2024.
    """
    name = models.CharField(max_length=100, default='Quy định BHXH & Công đoàn Việt Nam')
    # Tỷ lệ trích phần Người lao động (10.5% + 1% nếu tham gia đoàn viên)
    bhxh_employee_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0800, help_text="Hưu trí, tử tuất (8%)")
    bhyt_employee_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0150, help_text="BHYT (1.5%)")
    bhtn_employee_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0100, help_text="BHTN (1%)")
    union_employee_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0100, help_text="Đoàn phí công đoàn đoàn viên (1%)")

    # Tỷ lệ trích phần Doanh nghiệp (23.5% = Hưu trí 14% + Ốm đau thai sản 3% + BHTNLĐ 0.5% + BHYT 3% + BHTN 1% + KPCĐ 2%)
    bhxh_employer_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.1750, help_text="BHXH gồm 14% + 3% + 0.5%")
    bhyt_employer_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0300, help_text="BHYT (3%)")
    bhtn_employer_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0100, help_text="BHTN (1%)")
    union_employer_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0200, help_text="Kinh phí công đoàn doanh nghiệp (2%)")

    effective_date = models.DateField(default="2025-07-01", help_text="Ngày hiệu lực")
    description = models.TextField(blank=True, default="Căn cứ Luật BHXH 2024, Luật BHYT và Luật Công đoàn 2024.", help_text="Căn cứ tham chiếu")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        total_emp = (self.bhxh_employee_rate + self.bhyt_employee_rate + self.bhtn_employee_rate) * 100
        total_empr = (self.bhxh_employer_rate + self.bhyt_employer_rate + self.bhtn_employer_rate + self.union_employer_rate) * 100
        return f"{self.name} (NLĐ: {total_emp:.1f}% | DN: {total_empr:.1f}%)"


class AllowanceGroup(TimeStampedModel):
    """
    BẢNG CHA: Nhóm Khoản Thu nhập / Phụ cấp / Trợ cấp / Hỗ trợ (Kế thừa từ Bim ERP).
    """
    code = models.CharField(max_length=30, unique=True, help_text="Mã nhóm khoản (PHU_CAP_LUONG, TRO_CAP, HO_TRO_PHUC_LOI)")
    name = models.CharField(max_length=150, help_text="Tên nhóm khoản")
    description = models.TextField(blank=True, help_text="Mô tả / Quy định & Căn cứ pháp lý")
    order = models.IntegerField(default=0, help_text="Thứ tự hiển thị")
    is_active = models.BooleanField(default=True, help_text="Đang áp dụng")

    class Meta:
        ordering = ["order", "code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class AllowanceType(TimeStampedModel):
    """
    BẢNG CON: Chi tiết các khoản Phụ cấp, Trợ cấp & Hỗ trợ (Kế thừa từ Bim ERP).
    Tích hợp isBHXH, isTNCN, định mức và căn cứ pháp lý.
    """
    CATEGORY_CHOICES = [
        ("ALLOWANCE", "1. Phụ cấp Lương (ghi HĐLĐ)"),
        ("SUBSIDY", "2. Trợ cấp (Ốm đau, Thai sản, Mất việc)"),
        ("SUPPORT", "3. Hỗ trợ & Phúc lợi (Khoán không BHXH)"),
    ]
    group = models.ForeignKey(AllowanceGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name="items")
    code = models.CharField(max_length=30, unique=True, help_text="Mã phụ cấp")
    name = models.CharField(max_length=150, help_text="Tên phụ cấp")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="ALLOWANCE")
    description = models.TextField(blank=True, help_text="Mô tả")
    legal_basis = models.TextField(blank=True, help_text="Ghi chú căn cứ luật / quyết định")
    default_amount = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Mức tiền mặc định")
    level_1_amount = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Định mức Level 1 (VNĐ)")
    level_2_amount = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Định mức Level 2 (VNĐ)")

    is_insurance_applicable = models.BooleanField(default=False, help_text="Đóng BHXH (isBHXH)")
    is_taxable = models.BooleanField(default=True, help_text="Tính thuế TNCN (isTNCN)")
    is_active = models.BooleanField(default=True, help_text="Đang áp dụng")
    order = models.IntegerField(default=0, help_text="Thứ tự")

    class Meta:
        ordering = ["group__order", "category", "order", "code"]

    def __str__(self):
        return f"[{self.code}] {self.name} ({self.get_category_display()})"


class PayrollPeriod(TimeStampedModel, SoftDeleteModel):
    """
    Kỳ tính lương hàng tháng của Triền Võ Logistics (Payroll Period).
    Vòng đời quản lý: DRAFT ➔ REVIEWED ➔ LOCKED ➔ PAID.
    Khi PAID, tự động liên thông tạo phiếu chi trên Sổ Quỹ (CashTransaction).
    """
    period_code = models.CharField(max_length=20, unique=True, db_index=True, help_text="Mã kỳ lương (VD: 2026-10)")
    name = models.CharField(max_length=100, help_text="Tên kỳ lương (VD: Bảng lương Tháng 10/2026)")
    from_date = models.DateField()
    to_date = models.DateField()
    standard_days = models.DecimalField(max_digits=4, decimal_places=1, default=26.0)
    status = models.CharField(max_length=20, choices=PayrollPeriodStatus.choices, default=PayrollPeriodStatus.DRAFT, db_index=True)

    # Số liệu tổng hợp toàn kỳ
    total_employees = models.IntegerField(default=0)
    total_gross = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Tổng thu nhập trước giảm trừ")
    total_net = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Tổng lương thực lĩnh toàn công ty")
    total_insurance_employee = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Tổng BHXH NLĐ đóng")
    total_insurance_employer = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Tổng BHXH DN đóng")
    total_pit = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Tổng thuế TNCN khấu trừ")
    total_advances_deducted = models.DecimalField(max_digits=15, decimal_places=0, default=0, help_text="Tổng tiền hoàn ứng tài xế đã khấu trừ")

    # Liên thông Sổ Quỹ khi chi trả
    cash_transaction = models.ForeignKey(
        'billing.CashTransaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payroll_periods',
        help_text="Phiếu chi Sổ Quỹ tương ứng khi thanh toán lương"
    )
    approved_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_payrolls'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-from_date']

    def __str__(self):
        return f"[{self.period_code}] {self.name} - {self.get_status_display()} ({self.total_net:,} đ)"


class PayrollSlip(TimeStampedModel, SoftDeleteModel):
    """
    Phiếu lương cá nhân chi tiết (Employee Payslip) theo động cơ Hybrid Payroll:
    - Khối văn phòng: Lương thời gian theo ngày công + phụ cấp + thưởng KPI.
    - Khối tài xế: Kế thừa liên thông lương chuyến (chính, cắt kéo, neo xe, thưởng dầu) từ DispatchTrip.
    - Khấu trừ tự động tạm ứng chuyến (DriverTripAdvance).
    - Tính trích nộp BHXH & Thuế TNCN lũy tiến 7 bậc chính xác.
    """
    period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name='slips')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payroll_slips')
    slip_code = models.CharField(max_length=64, unique=True, db_index=True) # PS-202610-TX001

    # Căn cứ hợp đồng lao động & phụ lục áp dụng tính lương
    contract = models.ForeignKey(LaborContract, on_delete=models.SET_NULL, null=True, blank=True, related_name='payroll_slips')
    appendix = models.ForeignKey(ContractAppendix, on_delete=models.SET_NULL, null=True, blank=True, related_name='payroll_slips')
    probation_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('100.0'), help_text="Tỷ lệ hưởng lương % áp dụng")
    is_social_insurance_participant = models.BooleanField(default=True, help_text="Có trích nộp BHXH trong kỳ")
    is_taxable = models.BooleanField(default=True, help_text="Có tính thuế TNCN trong kỳ")
    is_union_member = models.BooleanField(default=False, help_text="Có trích đoàn phí công đoàn")
    tax_resident_type = models.CharField(max_length=20, default='RESIDENT', help_text="Loại đối tượng thuế TNCN áp dụng")

    # Snapshot thông tin nhân sự tại thời điểm tính lương
    role = models.CharField(max_length=20)
    department = models.CharField(max_length=20)
    bank_account = models.CharField(max_length=50, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_beneficiary = models.CharField(max_length=100, blank=True)

    # 1. THU NHẬP THEO THỜI GIAN & CHỨC DANH
    actual_working_days = models.DecimalField(max_digits=4, decimal_places=1, default=26.0)
    base_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Lương căn bản hợp đồng")
    time_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Lương thời gian thực tế = Lương CB / 26 * Ngày công * (Tỷ lệ / 100)")
    allowance_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Phụ cấp cố định theo HĐ")
    subsidy_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Trợ cấp/hỗ trợ theo HĐ")

    # 2. THU NHẬP LOGISTICS SẢN LƯỢNG (TÀI XẾ & ĐIỀU VẬN)
    trip_count = models.IntegerField(default=0, help_text="Số chuyến chạy chính trong kỳ")
    trip_allowance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng lương chuyến chính (driver_allowance)")
    dropoff_trip_count = models.IntegerField(default=0, help_text="Số chuyến cắt kéo / hạ cont")
    dropoff_allowance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng lương cắt kéo (dropoff_driver_allowance)")
    detention_allowance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng phụ cấp neo xe / qua đêm")
    fuel_bonus = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Thưởng định mức tiêu hao nhiên liệu")

    # 3. PHỤ CẤP & THƯỞNG KHÁC
    phone_allowance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Phụ cấp điện thoại")
    lunch_allowance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Phụ cấp ăn trưa")
    other_allowance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Phụ cấp khác / trách nhiệm")
    kpi_bonus = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Thưởng năng suất / KPI")

    # TỔNG THU NHẬP TRƯỚC GIẢM TRỪ (GROSS)
    gross_income = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    # 4. TRÍCH ĐÓNG BẢO HIỂM BẮT BUỘC & CÔNG ĐOÀN
    insurance_base = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Mức lương căn cứ đóng BHXH")
    bhxh_employee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="BHXH NLĐ (8%)")
    bhyt_employee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="BHYT NLĐ (1.5%)")
    bhtn_employee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="BHTN NLĐ (1%)")
    total_insurance_employee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng bảo hiểm trừ vào lương (10.5%)")
    union_fee_employee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Đoàn phí công đoàn NLĐ (1% LCB)")

    # Chi phí bảo hiểm phía Doanh nghiệp (để thống kê chi phí nhân sự)
    total_insurance_employer = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng BH phía DN (21.5%)")
    union_fee_employer = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Kinh phí công đoàn DN (2%)")

    # 5. THUẾ THU NHẬP CÁ NHÂN (TNCN)
    dependents_count = models.IntegerField(default=0, help_text="Số người phụ thuộc tính giảm trừ")
    personal_relief_amount = models.DecimalField(max_digits=12, decimal_places=0, default=11000000)
    dependent_relief_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    taxable_income = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Thu nhập tính thuế lũy tiến")
    pit_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Thuế TNCN khấu trừ")

    # 6. KHẤU TRỪ TẠM ỨNG VÀ KHOẢN KHÁC
    advance_deductions = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Khấu trừ tạm ứng chuyến xe (DriverTripAdvance)")
    other_deductions = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Các khoản phạt / kỷ luật / trừ khác")

    # 7. THỰC LĨNH CUỐI CÙNG (NET TAKE-HOME)
    net_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Thực nhận = Gross - Bảo hiểm - Thuế - Tạm ứng - Trừ khác")

    # Thanh toán
    is_paid = models.BooleanField(default=False)
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(
        max_length=20,
        default='BANK_TRANSFER',
        choices=[
            ('BANK_TRANSFER', 'Chuyển khoản Ngân hàng'),
            ('CASH', 'Tiền mặt tại quỹ')
        ]
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['employee__code']
        unique_together = ('period', 'employee')

    def __str__(self):
        return f"[{self.slip_code}] {self.employee.full_name} ({self.employee.code}): {self.net_salary:,} đ"
