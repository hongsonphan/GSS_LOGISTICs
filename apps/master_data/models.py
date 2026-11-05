from django.db import models
from core.models import CompanyOwnedModel, TimeStampedModel, SoftDeleteModel

class LocationType(models.TextChoices):
    PORT = 'PORT', 'Cảng Biển'
    ICD = 'ICD', 'Cảng Cạn (ICD)'
    DEPOT = 'DEPOT', 'Bãi Rỗng / Depot'
    WAREHOUSE = 'WAREHOUSE', 'Kho Hàng / Nhà Máy'
    YARD = 'YARD', 'Bãi Đỗ Xe Công Ty'

class Location(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
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

class PartnerType(models.TextChoices):
    CARRIER = 'CARRIER', 'Nhà xe vận tải (3PL)'
    GARAGE = 'GARAGE', 'Gara sửa chữa / Bảo dưỡng'
    SUPPLIER = 'SUPPLIER', 'Nhà cung cấp vật tư / Dịch vụ khác'

class Subcontractor(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """
    Danh mục Nhà Xe Thầu Phụ / Đối Tác Vận Tải 3PL (Xe Bạn), Gara và Nhà Cung Cấp.
    Quản lý thông tin nhà xe, người điều hành và tài khoản ngân hàng phục vụ đối soát cước.
    """
    PREFIX_MAP = {
        PartnerType.CARRIER: '3PL',
        PartnerType.GARAGE: 'GAR',
        PartnerType.SUPPLIER: 'SPL',
    }

    partner_type = models.CharField(
        max_length=20,
        choices=PartnerType.choices,
        default=PartnerType.CARRIER,
        db_index=True,
        help_text="Phân loại đối tác: Nhà xe 3PL, Gara sửa chữa, hoặc Nhà cung cấp khác"
    )
    code = models.CharField(max_length=50, unique=True, db_index=True) # 3PL001, GAR001, SPL001...
    short_name = models.CharField(max_length=100, blank=True, help_text="Tên viết tắt của nhà xe để hiển thị ngắn gọn khi điều xe")
    name = models.CharField(max_length=200) # Công ty TNHH Vận tải Hoàng Nam...
    tax_code = models.CharField(max_length=30, blank=True)
    contact_person = models.CharField(max_length=100, blank=True) # Người phụ trách điều xe
    phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=255, blank=True, help_text="Địa chỉ công ty")
    yard_address = models.CharField(max_length=255, blank=True, help_text="Địa chỉ kho / bãi xe")
    bank_account_number = models.CharField(max_length=50, blank=True, help_text="Số tài khoản ngân hàng")
    bank_name = models.CharField(max_length=100, blank=True, help_text="Tên ngân hàng thụ hưởng")
    bank_account_holder = models.CharField(max_length=150, blank=True, help_text="Tên chủ tài khoản")
    notes = models.TextField(blank=True, help_text="Ghi chú")
    is_active = models.BooleanField(default=True, db_index=True)
    partner = models.ForeignKey('master_data.Partner', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='subcontractor_profiles', help_text='Đối tác hợp nhất (tự đồng bộ)')

    class Meta:
        ordering = ['name']
        verbose_name = 'Nhà Xe Thầu Phụ'
        verbose_name_plural = 'Danh mục Nhà Xe Thầu Phụ'

    def __str__(self):
        return f"{self.name} ({self.code})"

    @classmethod
    def generate_next_code(cls, partner_type=None):
        """
        Quy tắc sinh mã tự động cho Nhà cung cấp / Đối tác:
        - 3PL (CARRIER) -> 3PL[STT] (VD: 3PL001, 3PL002...)
        - Gara sửa chữa (GARAGE) -> GAR[STT] (VD: GAR001, GAR002...)
        - Nhà cung cấp (SUPPLIER) -> SPL[STT] (VD: SPL001, SPL002...)
        """
        import re
        if not partner_type or partner_type not in cls.PREFIX_MAP:
            partner_type = PartnerType.CARRIER
            
        prefix = cls.PREFIX_MAP.get(partner_type, '3PL')
        # Quét tất cả bản ghi (kể cả đã soft delete) để không vi phạm ràng buộc Unique
        codes = cls.all_objects.filter(code__startswith=prefix).values_list('code', flat=True)
        max_num = 0
        pattern = re.compile(rf"^{re.escape(prefix)}(\d+)$")
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
            self.code = self.generate_next_code(self.partner_type)
        if not self.short_name or not str(self.short_name).strip():
            self.short_name = self.code
        super().save(*args, **kwargs)

class SubcontractorDriver(TimeStampedModel, SoftDeleteModel):
    """
    Danh mục Tài xế thuộc Đơn vị 3PL / Nhà xe Thầu phụ (Xe Bạn).
    Quản lý danh sách tài xế của đối tác, số điện thoại để gửi lệnh điều xe và theo dõi hành trình.
    """
    subcontractor = models.ForeignKey(
        Subcontractor,
        on_delete=models.CASCADE,
        related_name='drivers',
        help_text="Nhà xe / Đơn vị 3PL quản lý"
    )
    full_name = models.CharField(max_length=100, db_index=True, help_text="Họ và tên tài xế")
    phone = models.CharField(max_length=20, db_index=True, help_text="Số điện thoại liên hệ / Zalo nhận lệnh")
    license_number = models.CharField(max_length=50, blank=True, help_text="Số giấy phép lái xe (GPLX)")
    is_active = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, help_text="Ghi chú về tài xế (kinh nghiệm, xe hay lái...)")

    class Meta:
        ordering = ['subcontractor', 'full_name']
        verbose_name = 'Tài xế Thầu phụ'
        verbose_name_plural = 'Danh mục Tài xế Thầu phụ'

    def __str__(self):
        return f"{self.full_name} ({self.phone}) - {self.subcontractor.name}"


class CompanyProfile(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """
    Khai báo Thông tin Công ty & Tham số Hệ thống Cài đặt Tổng thể (System Settings).
    Lưu trữ pháp nhân doanh nghiệp, thông tin thuế, tài khoản ngân hàng và tham số tính cước.
    """
    company_name = models.CharField(max_length=255, default='CÔNG TY TNHH CUNG ỨNG GIẢI PHÁP XANH', help_text="Tên pháp nhân công ty")
    short_name = models.CharField(max_length=100, blank=True, default='Green Solutions Supply Co., Ltd.', help_text="Tên thương hiệu / viết tắt")
    tax_code = models.CharField(max_length=50, blank=True, default='0316657112', help_text="Mã số thuế")
    phone = models.CharField(max_length=50, blank=True, default='', help_text="Hotline / Số điện thoại liên hệ")
    email = models.CharField(max_length=100, blank=True, default='', help_text="Email liên hệ")
    website = models.CharField(max_length=255, blank=True, default='', help_text="Website công ty")
    address = models.CharField(max_length=255, blank=True, default='302/5 Lê Đức Thọ, Phường An Nhơn, TP Hồ Chí Minh, Việt Nam', help_text="Địa chỉ trụ sở chính")
    representative_name = models.CharField(max_length=100, blank=True, default='', help_text="Người đại diện pháp luật")
    representative_role = models.CharField(max_length=100, blank=True, default='', help_text="Chức vụ người đại diện")
    bank_account_number = models.CharField(max_length=50, blank=True, default='', help_text="Số tài khoản ngân hàng")
    bank_name = models.CharField(max_length=150, blank=True, default='', help_text="Tên ngân hàng")
    bank_branch = models.CharField(max_length=150, blank=True, default='', help_text="Chi nhánh ngân hàng")
    operating_license = models.CharField(max_length=100, blank=True, default='', help_text="Giấy phép kinh doanh vận tải")
    
    # Thông tin Chi nhánh & Văn phòng Đại diện
    branch_name = models.CharField(max_length=200, blank=True, default='', help_text="Tên chi nhánh / Văn phòng đại diện")
    branch_address = models.CharField(max_length=255, blank=True, default='', help_text="Địa chỉ văn phòng chi nhánh")
    branch_phone = models.CharField(max_length=50, blank=True, default='', help_text="Điện thoại / Hotline chi nhánh")

    # Thông tin Bãi đỗ xe & Trạm điều phối nội bộ
    fleet_yard_name = models.CharField(max_length=200, blank=True, default='', help_text="Tên bãi đỗ xe / Depot")
    fleet_yard_address = models.CharField(max_length=255, blank=True, default='', help_text="Địa chỉ bãi đỗ xe")
    fleet_yard_hotline = models.CharField(max_length=50, blank=True, default='', help_text="Hotline quản lý trực bãi xe")

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
                company_name='CÔNG TY TNHH CUNG ỨNG GIẢI PHÁP XANH',
                short_name='Green Solutions Supply Co., Ltd.',
                tax_code='0316657112',
                address='302/5 Lê Đức Thọ, Phường An Nhơn, TP Hồ Chí Minh, Việt Nam',
                notes='Tên quốc tế: GREEN SOLUTIONS SUPPLY COMPANY LIMITED',
                default_vat_rate=8.00,
                fuel_reference_price=21000,
                cbm_formula_divisor=5000,
                logo_url='/static/images/trienvo_logo.png',
                is_default=True,
            )
        return obj


ACCOUNT_CHART_CHOICES = [
    ('1111', '1111 - Tiền mặt tại quỹ (Tiền Việt Nam)'),
    ('1121', '1121 - Tiền gửi Ngân hàng (Việt Nam Đồng)'),
    ('131', '131 - Phải thu của khách hàng (Công nợ cước vận tải)'),
    ('1388', '1388 - Phải thu khác (Chi hộ nâng hạ, cược cont)'),
    ('141', '141 - Tạm ứng nội bộ (Quỹ Điều vận & Tài xế)'),
    ('331', '331 - Phải trả người bán (Cước Xe bạn / Thầu phụ 3PL)'),
    ('334', '334 - Phải trả người lao động (Lương/thù lao tài xế)'),
    ('3388', '3388 - Phải trả khác'),
    ('341', '341 - Vay và nợ thuê tài chính (Vay mua xe đầu kéo/mooc)'),
]

ACCOUNT_NAME_MAP = {
    '111': 'Tiền mặt tại quỹ',
    '1111': 'Tiền mặt tại quỹ',
    '112': 'Tiền gửi Ngân hàng',
    '1121': 'Tiền gửi Ngân hàng',
    '131': 'Phải thu của khách hàng',
    '1388': 'Phải thu khác (Chi hộ)',
    '141': 'Tạm ứng nội bộ',
    '331': 'Phải trả người bán (Thầu phụ)',
    '334': 'Phải trả người lao động (Lương)',
    '3388': 'Phải trả khác',
    '341': 'Vay và nợ thuê tài chính',
}


class OpeningBalanceCategory(models.TextChoices):
    CASH_FUND = 'CASH_FUND', 'Tiền mặt & Quỹ nội bộ (TK 111)'
    BANK_ACCOUNT = 'BANK_ACCOUNT', 'Tiền gửi Ngân hàng (TK 112)'
    CUSTOMER_AR = 'CUSTOMER_AR', 'Công nợ Phải thu Khách hàng (TK 131)'
    DISPATCHER_FUND = 'DISPATCHER_FUND', 'Quỹ Tạm ứng Điều vận (TK 141)'
    DRIVER_ADVANCE = 'DRIVER_ADVANCE', 'Công nợ Tạm ứng Tài xế (TK 141)'
    SUBCONTRACTOR_AP = 'SUBCONTRACTOR_AP', 'Công nợ Phải trả Thầu phụ / Xe bạn (TK 331)'
    SALARY_PAYABLE = 'SALARY_PAYABLE', 'Phải trả người lao động / Lương (TK 334)'
    OTHER = 'OTHER', 'Số dư tài khoản khác'


class OpeningBalance(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """
    Số dư đầu kỳ tài chính theo Chuẩn Mực Kế Toán Doanh Nghiệp (TT 200/2014 & TT 133/2016).
    Cung cấp số dư ban đầu cho Sổ Quỹ (111, 112), Sổ Công nợ (131, 331), Tạm ứng (141) và Bảng Cân Đối Phát Sinh.
    """
    # 1. Hệ thống Tài khoản Kế toán (COA)
    account_code = models.CharField(max_length=20, default='1111', db_index=True, help_text="Tài khoản kế toán (1111, 1121, 131, 141, 331, 334, 341)")
    account_name = models.CharField(max_length=200, default='Tiền mặt tại quỹ', help_text="Tên tài khoản kế toán")
    
    # Dành riêng cho Tiền gửi Ngân hàng (TK 112)
    bank_account_number = models.CharField(max_length=50, blank=True, help_text="Số tài khoản ngân hàng (dành cho TK 112)")
    bank_name = models.CharField(max_length=150, blank=True, help_text="Tên ngân hàng chi nhánh (dành cho TK 112)")

    # 2. Phân loại danh mục vận tải (tương thích nghiệp vụ)
    category = models.CharField(max_length=30, choices=OpeningBalanceCategory.choices, default=OpeningBalanceCategory.CASH_FUND, db_index=True)
    
    # 3. Đối tượng theo dõi chi tiết (Sub-ledger partner)
    partner_type = models.CharField(max_length=30, blank=True, default='INTERNAL', choices=[
        ('CUSTOMER', 'Khách hàng'),
        ('SUBCONTRACTOR', 'Nhà xe bạn / Thầu phụ 3PL'),
        ('DRIVER', 'Tài xế'),
        ('DISPATCHER', 'Điều phối viên'),
        ('BANK', 'Ngân hàng'),
        ('INTERNAL', 'Nội bộ công ty'),
        ('OTHER', 'Đối tượng khác'),
    ])
    entity_code = models.CharField(max_length=50, blank=True, help_text="Mã đối tượng (Mã KH, Mã Tài xế, Mã Nhà xe...)")
    entity_name = models.CharField(max_length=200, help_text="Tên đối tượng / Tên quỹ / Tên tài khoản")

    # 4. Thời gian chốt & Số dư Kế toán
    opening_date = models.DateField(help_text="Ngày chốt số dư đầu kỳ")
    fiscal_year = models.IntegerField(default=2026, help_text="Năm tài chính")
    
    debit_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Số dư Nợ đầu kỳ (VNĐ)")
    credit_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Số dư Có đầu kỳ (VNĐ)")
    
    # Trường tương thích ngược
    amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Số dư đầu kỳ tổng hợp (VNĐ)")
    is_debit = models.BooleanField(default=True, help_text="True: Dư Nợ; False: Dư Có")

    notes = models.TextField(blank=True, help_text="Diễn giải chứng từ / hợp đồng / biên bản đối soát căn cứ")
    created_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_opening_balances'
    )

    class Meta:
        ordering = ['account_code', 'entity_name']
        verbose_name = 'Số dư đầu kỳ kế toán'
        verbose_name_plural = 'Danh mục Số dư đầu kỳ kế toán'

    def __str__(self):
        sign = "+" if self.is_debit else "-"
        tk = self.account_code or "TK"
        return f"[{tk} - {self.entity_name}]: {sign}{self.amount:,} đ ({self.opening_date})"

    def save(self, *args, **kwargs):
        # 1. Nếu account_code chưa được chỉ định hoặc giữ mặc định '1111' trong khi category khác CASH_FUND, suy luận account_code từ category
        CATEGORY_TO_ACCOUNT = {
            OpeningBalanceCategory.CASH_FUND: '1111',
            OpeningBalanceCategory.BANK_ACCOUNT: '1121',
            OpeningBalanceCategory.CUSTOMER_AR: '131',
            OpeningBalanceCategory.DISPATCHER_FUND: '141',
            OpeningBalanceCategory.DRIVER_ADVANCE: '141',
            OpeningBalanceCategory.SUBCONTRACTOR_AP: '331',
            OpeningBalanceCategory.SALARY_PAYABLE: '334',
            OpeningBalanceCategory.OTHER: '3388',
        }
        if (not self.account_code or self.account_code == '1111') and self.category != OpeningBalanceCategory.CASH_FUND:
            self.account_code = CATEGORY_TO_ACCOUNT.get(self.category, '1111')

        # 2. Đồng bộ account_name nếu chưa có hoặc đang mang tên mặc định của quỹ tiền mặt
        if not self.account_name or (self.account_name == 'Tiền mặt tại quỹ' and self.account_code != '1111'):
            self.account_name = ACCOUNT_NAME_MAP.get(self.account_code, self.account_code)
        
        # 3. Đồng bộ debit_amount / credit_amount và amount / is_debit
        if self.debit_amount > 0 and self.credit_amount == 0:
            self.amount = self.debit_amount
            self.is_debit = True
        elif self.credit_amount > 0 and self.debit_amount == 0:
            self.amount = self.credit_amount
            self.is_debit = False
        else:
            if self.is_debit:
                self.debit_amount = self.amount
                self.credit_amount = 0
            else:
                self.credit_amount = self.amount
                self.debit_amount = 0

        # 4. Tự động gán category và partner_type phù hợp với account_code
        if self.account_code.startswith('111'):
            self.category = OpeningBalanceCategory.CASH_FUND
        elif self.account_code.startswith('112'):
            self.category = OpeningBalanceCategory.BANK_ACCOUNT
        elif self.account_code == '131':
            self.category = OpeningBalanceCategory.CUSTOMER_AR
            self.partner_type = 'CUSTOMER'
        elif self.account_code == '331':
            self.category = OpeningBalanceCategory.SUBCONTRACTOR_AP
            self.partner_type = 'SUBCONTRACTOR'
        elif self.account_code == '334':
            self.category = OpeningBalanceCategory.SALARY_PAYABLE
            self.partner_type = 'DRIVER'

        super().save(*args, **kwargs)

class Partner(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Đối tác hợp nhất (một pháp nhân = một đối tác) dùng cho công nợ và sổ cái.

    Một công ty có thể vừa là Khách hàng vừa là Nhà xe/Nhà cung cấp: hai hồ sơ Customer và Subcontractor
    trỏ chung về một Partner (khớp theo Mã số thuế). Customer/Subcontractor vẫn là nơi người dùng nhập liệu;
    Partner được đồng bộ tự động khi lưu hai hồ sơ đó.
    """
    code = models.CharField(max_length=30, db_index=True)
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=100, blank=True, default='')
    tax_code = models.CharField(max_length=30, blank=True, default='', db_index=True)
    address = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    email = models.CharField(max_length=150, blank=True, default='')
    bank_account_number = models.CharField(max_length=50, blank=True, default='')
    bank_name = models.CharField(max_length=150, blank=True, default='')
    bank_account_holder = models.CharField(max_length=150, blank=True, default='')
    is_customer = models.BooleanField(default=False, db_index=True)
    is_carrier = models.BooleanField(default=False, db_index=True, help_text='Nhà xe thầu phụ / 3PL')
    is_supplier = models.BooleanField(default=False, db_index=True, help_text='Gara, nhà cung cấp')

    class Meta:
        ordering = ['name']
        verbose_name = 'Đối tác'
        verbose_name_plural = 'Đối tác (hợp nhất)'
        constraints = [
            models.UniqueConstraint(fields=['company', 'code'], name='uniq_partner_code_per_company'),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


# Cách ly đa doanh nghiệp cho model con không có cột company (xem core.models.tenant_scope)
SubcontractorDriver.tenant_path = 'subcontractor__company'
