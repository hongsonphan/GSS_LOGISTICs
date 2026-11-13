from django.conf import settings
from django.db import models
from core.models import (AllObjectsManager, CompanyOwnedModel, PublicIdModel, SoftDeleteManager,
                         SoftDeleteModel, TimeStampedModel)

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
    destination_notes = models.TextField(blank=True, help_text="Hướng dẫn tài xế khi tiếp cận (liên hệ, cổng vào, an toàn lao động...)")
    road_restrictions = models.TextField(blank=True, help_text="Cấm đường / giờ cấm tải / cầu yếu quanh địa điểm")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    unlocode = models.CharField(max_length=10, blank=True, default='', help_text="Mã UN/LOCODE (cảng, ICD)")
    opening_hours = models.CharField(max_length=100, blank=True, default='', help_text="Khung giờ nhận hàng, vd 07:30-11:30, 13:30-17:00")
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
    (Áp dụng chuẩn theo Thông báo lương chính thức của Green Solutions Supply)
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
    (Chuẩn theo văn bản Green Solutions Supply: Hiệp Phước, Cái Mép, Nhơn Trạch, TTI cắt kéo...)
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

class PartnerType(models.TextChoices):
    CARRIER = 'CARRIER', 'Nhà xe vận tải (3PL)'
    GARAGE = 'GARAGE', 'Gara sửa chữa / Bảo dưỡng'
    SUPPLIER = 'SUPPLIER', 'Nhà cung cấp vật tư / Dịch vụ khác'


class Party(PublicIdModel, CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Đối tác – MỘT bảng cho mọi vai trò (đặc tả §4: Party có cờ vai trò và mã ngắn).

    Vai trò: khách hàng, nhà xe (vendor), nhà cung cấp/gara, hãng tàu, depot. Một bản ghi có thể có nhiều vai trò.
    Mã `code` là mã ngắn (vd 3PL001) dùng cả khi đặt tên file chứng từ.
    Các model `customers.Customer`, `master_data.Subcontractor`, `master_data.ShippingLine` là proxy lọc theo vai trò.
    Sổ cái gom theo pháp nhân: `canonical` = bản ghi sớm nhất cùng MST trong công ty.
    """
    CUSTOMER_GROUP_CHOICES = [
        ('COMMERCIAL_TRADING', 'Thương mại / Xuất nhập khẩu (Trading/XNK)'),
        ('FDI_ENTERPRISE', 'Doanh nghiệp FDI / Nhà máy sản xuất'),
        ('FORWARDER_LOGISTICS', 'Đại lý Giao nhận / 3PL Forwarder'),
        ('DOMESTIC_FACTORY', 'Nhà máy / Doanh nghiệp Nội địa'),
        ('WALK_IN_RETAIL', 'Khách lẻ / Đơn chuyến vãng lai'),
    ]

    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=100, blank=True, default='', verbose_name="Tên viết tắt / Tên giao dịch")
    tax_code = models.CharField(max_length=30, blank=True, default='', db_index=True)
    address = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')

    # Vai trò
    is_customer = models.BooleanField(default=False, db_index=True)
    is_carrier = models.BooleanField(default=False, db_index=True, help_text='Nhà xe / vendor vận tải')
    is_supplier = models.BooleanField(default=False, db_index=True, help_text='Gara, nhà cung cấp')
    is_shipping_line = models.BooleanField(default=False, db_index=True)
    is_depot = models.BooleanField(default=False, db_index=True)
    partner_type = models.CharField(max_length=20, choices=PartnerType.choices, default=PartnerType.CARRIER, db_index=True,
                                    help_text="Với nhà xe / NCC: 3PL, gara hay nhà cung cấp khác")

    # Liên hệ
    company_email = models.EmailField(max_length=150, blank=True, default='', verbose_name="Email công ty (nhận HĐĐT / công nợ)")
    contact_person = models.CharField(max_length=100, blank=True, default='')
    contact_title = models.CharField(max_length=100, blank=True, default='')
    contact_email = models.CharField(max_length=150, blank=True, default='')
    contact_phone = models.CharField(max_length=50, blank=True, default='')
    website = models.CharField(max_length=255, blank=True, default='', help_text="Hãng tàu: cổng tra cứu cont / e-DO")

    # Ngân hàng
    bank_account_number = models.CharField(max_length=50, blank=True, default='')
    bank_name = models.CharField(max_length=150, blank=True, default='')
    bank_branch = models.CharField(max_length=150, blank=True, default='')
    bank_account_holder = models.CharField(max_length=150, blank=True, default='')

    # Khách hàng
    customer_group = models.CharField(max_length=50, choices=CUSTOMER_GROUP_CHOICES, default='COMMERCIAL_TRADING', blank=True,
                                      db_index=True, verbose_name="Nhóm khách hàng")
    payment_term_days = models.IntegerField(default=30, verbose_name="Kỳ hạn thanh toán (ngày)")
    credit_limit = models.DecimalField(max_digits=14, decimal_places=0, default=0, verbose_name="Hạn mức nợ tối đa (VNĐ)")
    pod_template = models.ForeignKey('customers.PodTemplate', on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='customers', help_text="Mẫu phiếu giao hàng riêng; trống = mẫu mặc định")
    # Nhà xe
    yard_address = models.CharField(max_length=255, blank=True, default='', help_text="Địa chỉ kho / bãi xe")
    # Hãng tàu
    free_dem_days = models.IntegerField(default=7, help_text="Hãng tàu: số ngày miễn phí lưu bãi mặc định (DEM)")
    free_det_days = models.IntegerField(default=5, help_text="Hãng tàu: số ngày miễn phí lưu vỏ mặc định (DET)")

    notes = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Đối tác'
        verbose_name_plural = 'Đối tác'
        constraints = [models.UniqueConstraint(fields=['company', 'code'], name='uniq_party_code_per_company')]

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def roles(self):
        return [r for r in ('customer', 'carrier', 'supplier', 'shipping_line', 'depot') if getattr(self, 'is_' + r)]

    @property
    def canonical(self):
        """Pháp nhân dùng cho sổ cái: bản ghi sớm nhất cùng MST trong công ty (không có MST thì là chính nó)."""
        tax = (self.tax_code or '').strip()
        if not tax:
            return self
        first = Party.all_objects.filter(company_id=self.company_id, tax_code=tax, is_deleted=False).order_by('id').first()
        return first or self

    # Tên cũ: hồ sơ khách/nhà xe trước đây trỏ tới "Partner" hợp nhất
    partner = canonical


class _RoleManager(SoftDeleteManager):
    def __init__(self, *roles):
        super().__init__()
        self.roles = roles

    def get_queryset(self):
        q = models.Q()
        for r in self.roles:
            q |= models.Q(**{r: True})
        return super().get_queryset().filter(q)


class _RoleAllManager(AllObjectsManager):
    def __init__(self, *roles):
        super().__init__()
        self.roles = roles

    def get_queryset(self):
        q = models.Q()
        for r in self.roles:
            q |= models.Q(**{r: True})
        return super().get_queryset().filter(q)


def role_managers(*roles):
    return _RoleManager(*roles), _RoleAllManager(*roles)


class ShippingLine(Party):
    """Hãng tàu (proxy của Party, vai trò is_shipping_line)."""
    objects, all_objects = role_managers('is_shipping_line')

    class Meta:
        proxy = True
        ordering = ['code']
        verbose_name = 'Hãng Tàu'
        verbose_name_plural = 'Danh mục Hãng Tàu'

    def save(self, *args, **kwargs):
        self.is_shipping_line = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.name}"

class Subcontractor(Party):
    """
    Nhà xe thầu phụ / đối tác vận tải 3PL, gara và nhà cung cấp (proxy của Party: vai trò is_carrier / is_supplier).
    """
    PREFIX_MAP = {
        PartnerType.CARRIER: '3PL',
        PartnerType.GARAGE: 'GAR',
        PartnerType.SUPPLIER: 'SPL',
    }
    objects, all_objects = role_managers('is_carrier', 'is_supplier')

    class Meta:
        proxy = True
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
        if self.partner_type == PartnerType.CARRIER:
            self.is_carrier = True
        else:
            self.is_supplier = True
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
    citizen_id = models.CharField(max_length=20, blank=True, default='', db_index=True, help_text="Số CCCD / CMND")
    age = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Tuổi tài xế")
    date_of_birth = models.DateField(null=True, blank=True, help_text="Ngày tháng năm sinh")
    license_number = models.CharField(max_length=50, blank=True, default='', help_text="Số giấy phép lái xe (GPLX)")
    license_class = models.CharField(max_length=20, blank=True, default='FC', help_text="Hạng bằng lái (VD: FC, C, E...)")
    experience_years = models.PositiveSmallIntegerField(default=0, blank=True, help_text="Số năm kinh nghiệm lái xe")
    avatar_url = models.CharField(max_length=500, blank=True, default='', help_text="Ảnh chân dung / đại diện")
    status = models.CharField(max_length=20, default='ACTIVE', help_text="Trạng thái (ACTIVE, LEAVE, OFF...)")
    is_active = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, default='', help_text="Ghi chú về tài xế (kinh nghiệm, xe hay lái...)")

    class Meta:
        ordering = ['subcontractor', 'full_name']
        verbose_name = 'Tài xế Thầu phụ'
        verbose_name_plural = 'Danh mục Tài xế Thầu phụ'

    def __str__(self):
        return f"{self.full_name} ({self.phone}) - {self.subcontractor.name}"


class SubcontractorTrailer(TimeStampedModel, SoftDeleteModel):
    """
    Danh mục Rơ-moóc thuộc Đơn vị 3PL / Nhà xe Thầu phụ.
    Lưu riêng theo từng nhà xe để dùng lại khi chọn từ droplist trên Cổng Nhà Xe.
    """
    subcontractor = models.ForeignKey(
        Subcontractor,
        on_delete=models.CASCADE,
        related_name='trailers',
        help_text="Nhà xe / Đơn vị 3PL quản lý"
    )
    license_plate = models.CharField(max_length=20, db_index=True, help_text="Biển số rơ-moóc")
    trailer_type = models.CharField(max_length=100, blank=True, default='', help_text="Loại moóc (VD: Moóc Xương 40ft)")
    brand = models.CharField(max_length=50, blank=True, default='', help_text="Hãng sản xuất / Thương hiệu moóc")
    payload_capacity_kg = models.IntegerField(default=32000, blank=True, help_text="Tải trọng cho phép tham gia giao thông (kg)")
    registration_expiry = models.DateField(null=True, blank=True, help_text="Hạn đăng kiểm định kỳ")
    next_maintenance_date = models.DateField(null=True, blank=True, help_text="Lịch bảo dưỡng định kỳ tiếp theo")
    status = models.CharField(max_length=20, default='ACTIVE', help_text="Trạng thái (ACTIVE, MAINTENANCE, IDLE...)")
    is_active = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, default='', help_text="Ghi chú về rơ-moóc")

    class Meta:
        ordering = ['subcontractor', 'license_plate']
        verbose_name = 'Rơ-moóc Thầu phụ'
        verbose_name_plural = 'Danh mục Rơ-moóc Thầu phụ'

    def __str__(self):
        return f"{self.license_plate} - {self.subcontractor.name}"


class SubcontractorPortalAccount(TimeStampedModel, SoftDeleteModel):
    """
    Tài khoản Cổng Nhà Xe (Vendor Portal) tách biệt hoàn toàn với tài khoản nhân viên nội bộ GSS.
    Xác thực 3 yếu tố: Username + Password + Mã Token xác nhận (hoặc token lệnh của chính nhà xe),
    kèm cơ chế tự động đăng xuất khi không thao tác (`idle_timeout_minutes`).
    """
    subcontractor = models.OneToOneField(
        Subcontractor,
        on_delete=models.CASCADE,
        related_name='portal_account',
        help_text="Nhà xe sở hữu tài khoản Portal"
    )
    username = models.CharField(max_length=80, unique=True, db_index=True, help_text="Tên đăng nhập riêng của nhà xe")
    password_hash = models.CharField(max_length=255, help_text="Mật khẩu đã băm (PBKDF2)")
    confirm_token_hash = models.CharField(max_length=64, blank=True, default='', db_index=True, help_text="SHA-256 của mã token xác nhận")
    confirm_token_preview = models.CharField(max_length=24, blank=True, default='', help_text="Gợi ý 4 ký tự cuối token")
    idle_timeout_minutes = models.PositiveSmallIntegerField(default=15, help_text="Tự động đăng xuất sau N phút không thao tác")
    is_active = models.BooleanField(default=True, db_index=True)
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['username']
        verbose_name = 'Tài khoản Portal Nhà xe'
        verbose_name_plural = 'Tài khoản Portal Nhà xe'

    def __str__(self):
        return f"{self.username} -> {self.subcontractor.name}"

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(str(raw_password))

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        if not self.password_hash or raw_password is None:
            return False
        return check_password(str(raw_password), self.password_hash)

    def set_confirm_token(self, raw_token):
        import hashlib
        clean = (raw_token or '').strip()
        if not clean:
            self.confirm_token_hash = ''
            self.confirm_token_preview = ''
            return
        self.confirm_token_hash = hashlib.sha256(clean.encode()).hexdigest()
        self.confirm_token_preview = f"••••{clean[-4:]}" if len(clean) >= 4 else '••••'

    def check_confirm_token(self, raw_token):
        import hashlib
        import secrets
        clean = (raw_token or '').strip()
        if not clean or not self.confirm_token_hash:
            return False
        candidate = hashlib.sha256(clean.encode()).hexdigest()
        return secrets.compare_digest(candidate, self.confirm_token_hash)


class CompanyProfile(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """
    Khai báo Thông tin Công ty & Tham số Hệ thống Cài đặt Tổng thể (System Settings).
    Lưu trữ pháp nhân doanh nghiệp, thông tin thuế, tài khoản ngân hàng và tham số tính cước.
    """
    company_name = models.CharField(max_length=255, default='CÔNG TY TNHH CUNG ỨNG GIẢI PHÁP XANH', help_text="Tên pháp nhân công ty")
    company_name_en = models.CharField(max_length=255, blank=True, default='GREEN SOLUTIONS SUPPLY COMPANY LIMITED', help_text="Tên quốc tế / tên tiếng Anh")
    short_name = models.CharField(max_length=100, blank=True, default='Green Solutions Supply Co., Ltd.', help_text="Tên thương hiệu / viết tắt")
    tax_code = models.CharField(max_length=50, blank=True, default='0316657112', help_text="Mã số thuế")
    phone = models.CharField(max_length=50, blank=True, default='', help_text="Hotline / Số điện thoại liên hệ")
    email = models.CharField(max_length=100, blank=True, default='', help_text="Email liên hệ")
    website = models.CharField(max_length=255, blank=True, default='', help_text="Website công ty")
    address = models.CharField(max_length=255, blank=True, default='302/5 Lê Đức Thọ, Phường An Nhơn, TP Hồ Chí Minh, Việt Nam', help_text="Địa chỉ trụ sở chính")
    representative_name = models.CharField(max_length=100, blank=True, default='', help_text="Người đại diện pháp luật")
    representative_role = models.CharField(max_length=100, blank=True, default='Giám Đốc', help_text="Chức vụ người đại diện")
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
    logo_url = models.CharField(max_length=255, blank=True, default='/static/images/gss_logo.svg', help_text="Đường dẫn file logo công ty")
    notes = models.TextField(blank=True, help_text="Ghi chú cấu hình và chính sách vận hành")
    is_default = models.BooleanField(default=True, help_text="Là hồ sơ công ty mặc định")

    # Loại hình doanh nghiệp: quyết định các phân hệ được bật (xem core/features.py)
    business_model = models.CharField(
        max_length=30, default='ENTERPRISE_FULL', choices=[
            ('GSS_VENDOR_DEPOT_QR', 'Điều phối nhà xe, Bãi cont & QR (GSS)'),
            ('INTERNAL_FLEET_PNL', 'Đội xe nội bộ & P&L'),
            ('ENTERPRISE_FULL', 'Toàn bộ tính năng'),
        ], help_text="Loại hình doanh nghiệp")
    enabled_features = models.JSONField(default=dict, blank=True, help_text="Ghi đè bật/tắt từng tính năng: {tên: true/false}")
    warn_days = models.PositiveSmallIntegerField(default=2, help_text="Cảnh báo DEM/DET khi còn ≤ n ngày")
    vendor_readonly_days = models.PositiveSmallIntegerField(default=7, help_text="Nhà xe còn xem (chỉ đọc) bao nhiêu ngày sau khi mọi chuyến của lệnh hoàn tất")

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
                company_name_en='GREEN SOLUTIONS SUPPLY COMPANY LIMITED',
                short_name='Green Solutions Supply Co., Ltd.',
                tax_code='0316657112',
                address='302/5 Lê Đức Thọ, Phường An Nhơn, TP Hồ Chí Minh, Việt Nam',
                representative_role='Giám Đốc',
                default_vat_rate=8.00,
                fuel_reference_price=21000,
                cbm_formula_divisor=5000,
                logo_url='/static/images/gss_logo.svg',
                is_default=True,
                business_model=getattr(settings, 'DEFAULT_BUSINESS_MODEL', 'ENTERPRISE_FULL'),
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

# Cách ly đa doanh nghiệp cho model con không có cột company (xem core.models.tenant_scope)
SubcontractorDriver.tenant_path = 'subcontractor__company'
SubcontractorTrailer.tenant_path = 'subcontractor__company'
SubcontractorPortalAccount.tenant_path = 'subcontractor__company'
