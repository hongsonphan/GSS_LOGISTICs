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
    sign_date = models.DateField(default=timezone.localdate)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True, help_text="Để trống nếu là HĐ không xác định thời hạn")
    job_title = models.CharField(max_length=100, blank=True, help_text="Chức danh công việc theo HĐ")
    working_address = models.CharField(max_length=255, blank=True, default="Văn phòng / Bãi xe Triền Võ Logistics")
    base_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Mức lương chính theo HĐ")
    insurance_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Lương căn cứ đóng BHXH")
    allowance_notes = models.TextField(blank=True, help_text="Chế độ phụ cấp, công tác phí, thưởng chuyến")
    contract_file = models.FileField(upload_to='personnel/contracts/', blank=True, null=True, help_text="File scan HĐ đính kèm")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-start_date', '-created_at']

    def __str__(self):
        return f"[{self.contract_number}] {self.employee.full_name} - {self.get_contract_type_display()}"


class ContractAppendix(TimeStampedModel, SoftDeleteModel):
    """
    Phụ lục Hợp đồng lao động: Điều chỉnh mức lương, vị trí công tác hoặc gia hạn HĐ.
    """
    contract = models.ForeignKey(LaborContract, on_delete=models.CASCADE, related_name='appendices')
    appendix_number = models.CharField(max_length=50)
    effective_date = models.DateField()
    new_base_salary = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    new_role = models.CharField(max_length=50, blank=True)
    change_summary = models.TextField(help_text="Nội dung điều chỉnh chi tiết")
    appendix_file = models.FileField(upload_to='personnel/contracts/', blank=True, null=True)

    class Meta:
        ordering = ['-effective_date']

    def __str__(self):
        return f"Phụ lục {self.appendix_number} - HĐ: {self.contract.contract_number}"


class TaxBracket(models.Model):
    """
    Biểu thuế thu nhập cá nhân (TNCN) lũy tiến từng phần 7 bậc theo quy định pháp luật Việt Nam.
    """
    bracket_level = models.IntegerField(unique=True, help_text="Bậc 1 đến Bậc 7")
    min_income = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Thu nhập tính thuế tối thiểu (VNĐ)")
    max_income = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True, help_text="Thu nhập tối đa (None = trên 80tr)")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Thuế suất (0.05, 0.10, 0.15...)")
    quick_subtraction = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Số trừ nhanh tương ứng bậc thuế")

    class Meta:
        ordering = ['bracket_level']

    def __str__(self):
        max_str = f"{self.max_income:,} đ" if self.max_income else "trở lên"
        return f"Bậc {self.bracket_level}: {self.min_income:,} đ - {max_str} ({int(self.tax_rate * 100)}%)"


class SalaryDeductionRate(models.Model):
    """
    Tỷ lệ trích đóng các khoản bảo hiểm bắt buộc và công đoàn.
    Chuẩn hiện hành: NLĐ 10.5% (BHXH 8%, BHYT 1.5%, BHTN 1%) - Doanh nghiệp 21.5% (BHXH 17.5%, BHYT 3%, BHTN 1%) + Công đoàn 2%.
    """
    name = models.CharField(max_length=100, default='Quy định BHXH Việt Nam')
    bhxh_employee_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0800)
    bhyt_employee_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0150)
    bhtn_employee_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0100)

    bhxh_employer_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.1750)
    bhyt_employer_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0300)
    bhtn_employer_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0100)
    union_employer_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0200)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        total_emp = (self.bhxh_employee_rate + self.bhyt_employee_rate + self.bhtn_employee_rate) * 100
        total_empr = (self.bhxh_employer_rate + self.bhyt_employer_rate + self.bhtn_employer_rate + self.union_employer_rate) * 100
        return f"{self.name} (NLĐ: {total_emp:.1f}% | DN: {total_empr:.1f}%)"


class PayrollPolicyConfig(models.Model):
    """
    Cấu hình tham số tính lương & chính sách giảm trừ thuế TNCN.
    """
    personal_relief = models.DecimalField(max_digits=12, decimal_places=0, default=11000000, help_text="Mức giảm trừ bản thân: 11,000,000 đ/tháng")
    dependent_relief = models.DecimalField(max_digits=12, decimal_places=0, default=4400000, help_text="Mức giảm trừ mỗi NPT: 4,400,000 đ/tháng")
    standard_working_days = models.DecimalField(max_digits=4, decimal_places=1, default=26.0, help_text="Số ngày công tiêu chuẩn hàng tháng")
    max_insurance_salary = models.DecimalField(max_digits=12, decimal_places=0, default=46800000, help_text="Mức trần đóng BHXH (20 lần lương cơ sở)")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Chính sách Lương (Bản thân: {self.personal_relief:,}đ, NPT: {self.dependent_relief:,}đ, Công: {self.standard_working_days} ngày)"


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

    # Snapshot thông tin nhân sự tại thời điểm tính lương
    role = models.CharField(max_length=20)
    department = models.CharField(max_length=20)
    bank_account = models.CharField(max_length=50, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_beneficiary = models.CharField(max_length=100, blank=True)

    # 1. THU NHẬP THEO THỜI GIAN & CHỨC DANH
    actual_working_days = models.DecimalField(max_digits=4, decimal_places=1, default=26.0)
    base_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Lương căn bản hợp đồng")
    time_salary = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Lương thời gian thực tế = Lương CB / 26 * Ngày công")

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

    # 4. TRÍCH ĐÓNG BẢO HIỂM BẮT BUỘC
    insurance_base = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Mức lương căn cứ đóng BHXH")
    bhxh_employee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="BHXH NLĐ (8%)")
    bhyt_employee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="BHYT NLĐ (1.5%)")
    bhtn_employee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="BHTN NLĐ (1%)")
    total_insurance_employee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng bảo hiểm trừ vào lương (10.5%)")

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
