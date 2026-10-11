from django.db import models
from core.models import TimeStampedModel, SoftDeleteModel

class LocationType(models.TextChoices):
    PORT = 'PORT', 'Cảng Biển'
    ICD = 'ICD', 'Cảng Cạn (ICD)'
    DEPOT = 'DEPOT', 'Bãi Rỗng / Depot'
    WAREHOUSE = 'WAREHOUSE', 'Kho Hàng / Nhà Máy'
    YARD = 'YARD', 'Bãi Đỗ Xe Công Ty'

class Location(TimeStampedModel, SoftDeleteModel):
    """
    Danh mục Địa điểm, Cảng, ICD, Depot cont rỗng và Kho khách hàng.
    Chuẩn hóa lộ trình 3 điểm (Nơi lấy -> Kho giao -> Nơi hạ).
    """
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    location_type = models.CharField(max_length=20, choices=LocationType.choices, default=LocationType.PORT)
    address = models.CharField(max_length=255, blank=True)
    province = models.CharField(max_length=50, blank=True, default='TP. Hồ Chí Minh')
    contact_person = models.CharField(max_length=100, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['location_type', 'name']
        verbose_name = 'Địa điểm / Cảng bãi'
        verbose_name_plural = 'Danh mục Địa điểm / Cảng bãi'

    def __str__(self):
        return f"[{self.get_location_type_display()}] {self.name} ({self.code})"

class ContainerCategory(models.TextChoices):
    CONTAINER = 'CONTAINER', 'Container Đường Biển'
    TRUCK = 'TRUCK', 'Xe Tải Thùng / Đường Bộ'

class ContainerType(TimeStampedModel, SoftDeleteModel):
    """
    Danh mục Quy cách Container và Thùng Xe tải chở hàng.
    Chuẩn hóa thông số TEU, tải trọng và thể tích CBM.
    """
    code = models.CharField(max_length=30, unique=True, db_index=True) # 40HC, 20DC, 45G1, 40GP...
    name = models.CharField(max_length=100) # Container 40ft Cao (40HC)...
    category = models.CharField(max_length=20, choices=ContainerCategory.choices, default=ContainerCategory.CONTAINER)
    teu_factor = models.DecimalField(max_digits=4, decimal_places=2, default=1.0, help_text="Hệ số TEU quy đổi (20DC=1, 40HC=2, 45G1=2.25)")
    max_payload_kg = models.IntegerField(default=30000, help_text="Tải trọng cho phép chở (kg)")
    cbm_capacity = models.DecimalField(max_digits=6, decimal_places=2, default=67.0, help_text="Thể tích chứa hàng (CBM)")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['category', 'code']
        verbose_name = 'Quy cách Cont & Xe'
        verbose_name_plural = 'Danh mục Quy cách Cont & Xe'

    def __str__(self):
        return f"{self.code} - {self.name}"

class ExpenseCategoryGroup(models.TextChoices):
    LIFT_ON = 'LIFT_ON', 'Nâng Cont'
    LIFT_OFF = 'LIFT_OFF', 'Hạ Cont'
    TOLL = 'TOLL', 'Vé Cầu Đường / BOT'
    DEPOSIT = 'DEPOSIT', 'Cược Container'
    WEIGHING = 'WEIGHING', 'Cân Xe'
    LABOR = 'LABOR', 'Bốc Xếp / Bồi Dưỡng Kho'
    EINVOICE = 'EINVOICE', 'Hóa Đơn Điện Tử Cảng'
    OTHER = 'OTHER', 'Chi Phí Khác'

class ExpenseItem(TimeStampedModel, SoftDeleteModel):
    """
    Danh mục Khoản mục Chi phí phát sinh hiện trường.
    Cho phép quản lý động các khoản chi mà không cần sửa cứng code.
    """
    code = models.CharField(max_length=30, unique=True, db_index=True) # LIFT_ON, TOLL_FEE...
    name = models.CharField(max_length=100) # Phí nâng cont, Vé BOT...
    group_type = models.CharField(max_length=30, choices=ExpenseCategoryGroup.choices, default=ExpenseCategoryGroup.TOLL)
    default_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Định mức tiền ngầm định (VNĐ)")
    requires_invoice = models.BooleanField(default=False, help_text="Bắt buộc có hóa đơn điện tử / mã tra cứu")
    notes = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['group_type', 'name']
        verbose_name = 'Khoản mục chi phí'
        verbose_name_plural = 'Danh mục Khoản mục chi phí'

    def __str__(self):
        return f"[{self.get_group_type_display()}] {self.name} ({self.code})"

class DriverSalaryTariff(TimeStampedModel, SoftDeleteModel):
    """
    Biểu phí Lương chuyến Lái xe Container tính theo lộ trình vận chuyển hàng hóa.
    (Áp dụng chuẩn theo Thông báo lương chính thức của Triền Võ Logistics)
    """
    area_group = models.CharField(max_length=100, db_index=True, help_text="Nhóm khu vực kho: Củ Chi, Long An, Tây Ninh, Bình Dương, Đồng Nai, TP.HCM, Vũng Tàu, Tuyến đặc thù")
    route_name = models.CharField(max_length=200, help_text="Tên chi tiết tuyến / KCN / Nhà máy (vd: KCN Phước Đông, KCN Tân Phú Trung...)")
    pickup_drop_area = models.CharField(max_length=255, default='Cát Lái, SPITC, Thủ Đức, Tân Vạn, Sóng Thần, VICT, Q4, Q7', help_text="Khu vực lấy / hạ cont chuẩn")
    estimated_km = models.IntegerField(default=0, help_text="Cự ly ước tính theo tuyến (km) - chuẩn hóa làm tròn bước 10km")
    salary_rate = models.DecimalField(max_digits=12, decimal_places=0, help_text="Mức lương chuyến tài xế được hưởng (VNĐ)")
    notes = models.CharField(max_length=255, blank=True, help_text="Ghi chú điều kiện đặc biệt (vd: Lấy/hạ Cát Lái +50k...)")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['area_group', 'route_name']
        verbose_name = 'Biểu phí lương chuyến tài xế'
        verbose_name_plural = 'Danh mục Biểu phí lương chuyến tài xế'

    def save(self, *args, **kwargs):
        if self.estimated_km and self.estimated_km > 0:
            rounded = int(round(float(self.estimated_km) / 10.0) * 10)
            self.estimated_km = max(10, rounded)
        super().save(*args, **kwargs)

    def __str__(self):
        km_str = f" (~{self.estimated_km}km)" if self.estimated_km else ""
        return f"[{self.area_group}] {self.route_name}{km_str} - {self.salary_rate:,.0f} đ"

class AllowanceCategory(models.TextChoices):
    PORT = 'PORT', 'Phụ Thêm Cảng Xa'
    INSPECTION = 'INSPECTION', 'Phụ Thu Kiểm Hóa'
    OPERATION = 'OPERATION', 'Phụ Cấp Tác Nghiệp Đặc Thù'

class DriverAllowanceCatalog(TimeStampedModel, SoftDeleteModel):
    """
    Danh mục Phụ cấp cảng xa, Kiểm hóa và Tác nghiệp vận chuyển.
    (Chuẩn theo văn bản Triền Võ Logistics: Hiệp Phước, Cái Mép, Nhơn Trạch, TTI cắt kéo...)
    """
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=30, choices=AllowanceCategory.choices, default=AllowanceCategory.PORT)
    amount = models.DecimalField(max_digits=12, decimal_places=0, help_text="Số tiền phụ cấp tài xế (VNĐ)")
    notes = models.CharField(max_length=255, blank=True, help_text="Điều kiện áp dụng phụ cấp")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Phụ cấp & Kiểm hóa'
        verbose_name_plural = 'Danh mục Phụ cấp & Kiểm hóa'

    def __str__(self):
        return f"[{self.get_category_display()}] {self.name}: +{self.amount:,.0f} đ"

class ShippingLine(TimeStampedModel, SoftDeleteModel):
    """
    Danh mục Hãng Tàu / Hãng Vận Chuyển Biển Quốc Tế & Nội Địa.
    Chuẩn hóa hãng tàu, đầu mối hỗ trợ cấp vỏ, e-DO và thời hạn DEM/DET mặc định.
    """
    code = models.CharField(max_length=30, unique=True, db_index=True) # MAEU, ONE, COSCO, SITC, EVERGREEN, CMA, MSC...
    name = models.CharField(max_length=150) # Maersk Line, Ocean Network Express...
    contact_phone = models.CharField(max_length=50, blank=True)
    contact_email = models.CharField(max_length=100, blank=True)
    website = models.CharField(max_length=255, blank=True, help_text="Cổng tra cứu cont / lệnh giao hàng điện tử (eDO)")
    free_dem_days = models.IntegerField(default=7, help_text="Số ngày miễn phí lưu bãi mặc định (DEM)")
    free_det_days = models.IntegerField(default=5, help_text="Số ngày miễn phí lưu vỏ mặc định (DET)")
    notes = models.TextField(blank=True, help_text="Ghi chú điều kiện cấp cont / hạ rỗng đặc thù")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['code']
        verbose_name = 'Hãng Tàu'
        verbose_name_plural = 'Danh mục Hãng Tàu'

    def __str__(self):
        return f"{self.code} - {self.name}"

class Subcontractor(TimeStampedModel, SoftDeleteModel):
    """
    Danh mục Nhà Xe Thầu Phụ / Đối Tác Vận Tải 3PL (Xe Bạn).
    Quản lý thông tin nhà xe, người điều hành và tài khoản ngân hàng phục vụ đối soát cước.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True) # NX_HOANGNAM, NX_MINHTHU...
    name = models.CharField(max_length=200) # Công ty TNHH Vận tải Hoàng Nam...
    tax_code = models.CharField(max_length=30, blank=True)
    contact_person = models.CharField(max_length=100, blank=True) # Người phụ trách điều xe
    phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=255, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True, help_text="Số tài khoản ngân hàng")
    bank_name = models.CharField(max_length=100, blank=True, help_text="Tên ngân hàng thụ hưởng")
    bank_account_holder = models.CharField(max_length=150, blank=True, help_text="Tên chủ tài khoản")
    notes = models.TextField(blank=True, help_text="Tuyến thế mạnh, chính sách công nợ")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Nhà Xe Thầu Phụ'
        verbose_name_plural = 'Danh mục Nhà Xe Thầu Phụ'

    def __str__(self):
        return f"{self.name} ({self.code})"

class CompanyProfile(TimeStampedModel, SoftDeleteModel):
    """
    Khai báo Thông tin Công ty & Tham số Hệ thống Cài đặt Tổng thể (System Settings).
    Lưu trữ pháp nhân doanh nghiệp, thông tin thuế, tài khoản ngân hàng và tham số tính cước.
    """
    company_name = models.CharField(max_length=255, default='CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI TRIỀN VÕ', help_text="Tên pháp nhân công ty")
    short_name = models.CharField(max_length=100, blank=True, default='TRIỀN VÕ LOGISTICS', help_text="Tên thương hiệu / viết tắt")
    tax_code = models.CharField(max_length=50, blank=True, default='0312345678', help_text="Mã số thuế")
    phone = models.CharField(max_length=50, blank=True, default='0903.123.456', help_text="Hotline / Số điện thoại liên hệ")
    email = models.CharField(max_length=100, blank=True, default='Phongkinhdoanh.tvl@trienvo.com', help_text="Email liên hệ")
    website = models.CharField(max_length=255, blank=True, default='https://trienvo.com', help_text="Website công ty")
    address = models.CharField(max_length=255, blank=True, default='153/1 Quốc Lộ 1A, P. An Phú Đông, Quận 12, TP. Hồ Chí Minh', help_text="Địa chỉ trụ sở chính")
    representative_name = models.CharField(max_length=100, blank=True, default='Võ Văn Triền', help_text="Người đại diện pháp luật")
    representative_role = models.CharField(max_length=100, blank=True, default='Giám Đốc', help_text="Chức vụ người đại diện")
    bank_account_number = models.CharField(max_length=50, blank=True, default='19030000000001', help_text="Số tài khoản ngân hàng")
    bank_name = models.CharField(max_length=150, blank=True, default='Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)', help_text="Tên ngân hàng")
    bank_branch = models.CharField(max_length=150, blank=True, default='Chi nhánh Nam Sài Gòn', help_text="Chi nhánh ngân hàng")
    operating_license = models.CharField(max_length=100, blank=True, default='GP-VT-2024/TPHCM', help_text="Giấy phép kinh doanh vận tải")
    
    # Thông tin Chi nhánh & Văn phòng Đại diện
    branch_name = models.CharField(max_length=200, blank=True, default='Văn Phòng Chi Nhánh', help_text="Tên chi nhánh / Văn phòng đại diện")
    branch_address = models.CharField(max_length=255, blank=True, default='', help_text="Địa chỉ văn phòng chi nhánh")
    branch_phone = models.CharField(max_length=50, blank=True, default='', help_text="Điện thoại / Hotline chi nhánh")

    # Thông tin Bãi đỗ xe & Trạm điều phối nội bộ
    fleet_yard_name = models.CharField(max_length=200, blank=True, default='Bãi Đỗ Xe & Trạm Điều Phối TVL', help_text="Tên bãi đỗ xe / Depot")
    fleet_yard_address = models.CharField(max_length=255, blank=True, default='Đường Nguyễn Thị Định, P. Cát Lái, TP. Thủ Đức, TP. Hồ Chí Minh', help_text="Địa chỉ bãi đỗ xe")
    fleet_yard_hotline = models.CharField(max_length=50, blank=True, default='0903.999.888', help_text="Hotline quản lý trực bãi xe")

    # Tham số vận hành & Cấu hình hệ thống
    default_vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=8.00, help_text="Thuế suất VAT mặc định (%)")
    fuel_reference_price = models.DecimalField(max_digits=12, decimal_places=0, default=21000, help_text="Giá dầu tham chiếu chuẩn (VNĐ/Lít)")
    cbm_formula_divisor = models.IntegerField(default=5000, help_text="Hệ số quy đổi thể tích CBM (mặc định 5000)")
    logo_url = models.CharField(max_length=255, blank=True, default='/static/images/trienvo_logo.png', help_text="Đường dẫn file logo công ty")
    notes = models.TextField(blank=True, help_text="Ghi chú cấu hình và chính sách vận hành")
    is_default = models.BooleanField(default=True, help_text="Là hồ sơ công ty mặc định")

    class Meta:
        ordering = ['-is_default', 'company_name']
        verbose_name = 'Thông tin Công ty / Khai báo Hệ thống'
        verbose_name_plural = 'Khai báo Thông tin Công ty'

    def __str__(self):
        return f"{self.short_name or self.company_name} (MST: {self.tax_code})"

    @classmethod
    def get_default_company(cls):
        obj = cls.objects.filter(is_default=True).first()
        if not obj:
            obj = cls.objects.first()
        if not obj:
            obj = cls.objects.create(
                company_name='CÔNG TY TNHH ĐẦU TƯ VẬN TẢI TRIỀN VÕ',
                short_name='TRIỀN VÕ LOGISTICS',
                tax_code='0314567890',
                phone='0965 559 561',
                email='Phongkinhdoanh.tvl@trienvo.com',
                website='https://trienvo.com',
                address='153/1 Quốc Lộ 1A, P. An Phú Đông, Quận 12, TP. Hồ Chí Minh',
                representative_name='Võ Văn Triền',
                representative_role='Giám Đốc',
                bank_account_number='19030000000001',
                bank_name='Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)',
                bank_branch='Chi nhánh Nam Sài Gòn',
                operating_license='GP-VT-2024/TPHCM',
                branch_name='Văn Phòng Chi Nhánh Tây Ninh',
                branch_address='Khu Công Nghiệp Phước Đông, Huyện Gò Dầu, Tỉnh Tây Ninh',
                branch_phone='0903.123.789',
                fleet_yard_name='Bãi Đỗ Xe & Trạm Điều Phối Cát Lái TVL',
                fleet_yard_address='Đường Nguyễn Thị Định, P. Cát Lái, TP. Thủ Đức, TP. Hồ Chí Minh',
                fleet_yard_hotline='0903.999.888',
                default_vat_rate=8.00,
                fuel_reference_price=21000,
                cbm_formula_divisor=5000,
                logo_url='/static/images/trienvo_logo.png',
                is_default=True,
            )
        return obj


class OpeningBalanceCategory(models.TextChoices):
    CASH_FUND = 'CASH_FUND', 'Tiền mặt & Quỹ nội bộ'
    BANK_ACCOUNT = 'BANK_ACCOUNT', 'Tiền gửi Ngân hàng'
    DISPATCHER_FUND = 'DISPATCHER_FUND', 'Quỹ Tạm ứng Điều vận'
    DRIVER_ADVANCE = 'DRIVER_ADVANCE', 'Công nợ Tạm ứng Tài xế'
    CUSTOMER_AR = 'CUSTOMER_AR', 'Công nợ Phải thu Khách hàng'
    SUBCONTRACTOR_AP = 'SUBCONTRACTOR_AP', 'Công nợ Phải trả Thầu phụ / Xe bạn'
    OTHER = 'OTHER', 'Số dư khác'


class OpeningBalance(TimeStampedModel, SoftDeleteModel):
    """
    Số dư đầu kỳ tài chính (Tiền mặt, Ngân hàng, Quỹ điều vận, Công nợ tài xế, Công nợ khách hàng, Thầu phụ).
    Dành cho quản trị Admin cấu hình số dư ban đầu khi đưa hệ thống vào vận hành.
    """
    category = models.CharField(max_length=30, choices=OpeningBalanceCategory.choices, default=OpeningBalanceCategory.CASH_FUND, db_index=True)
    entity_code = models.CharField(max_length=50, blank=True, help_text="Mã đối tượng (Mã KH, Mã Tài xế, Số TK...)")
    entity_name = models.CharField(max_length=200, help_text="Tên đối tượng / Tên quỹ / Tên tài khoản")
    opening_date = models.DateField(help_text="Ngày chốt số dư đầu kỳ")
    amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Số dư đầu kỳ (VNĐ)")
    is_debit = models.BooleanField(default=True, help_text="True: Dư Nợ (Phải thu/Tồn quỹ); False: Dư Có (Phải trả/Nợ cty)")
    notes = models.TextField(blank=True, help_text="Diễn giải chứng từ / hợp đồng / căn cứ số dư")
    created_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_opening_balances'
    )

    class Meta:
        ordering = ['category', 'entity_name']
        verbose_name = 'Số dư đầu kỳ'
        verbose_name_plural = 'Danh mục Số dư đầu kỳ'

    def __str__(self):
        sign = "+" if self.is_debit else "-"
        return f"[{self.get_category_display()}] {self.entity_name}: {sign}{self.amount:,} đ ({self.opening_date})"


