from django.db import models
from core.models import CompanyOwnedModel, TimeStampedModel, SoftDeleteModel

class Customer(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    CUSTOMER_GROUP_CHOICES = [
        ('COMMERCIAL_TRADING', 'Thương mại / Xuất nhập khẩu (Trading/XNK)'),
        ('FDI_ENTERPRISE', 'Doanh nghiệp FDI / Nhà máy sản xuất'),
        ('FORWARDER_LOGISTICS', 'Đại lý Giao nhận / 3PL Forwarder'),
        ('DOMESTIC_FACTORY', 'Nhà máy / Doanh nghiệp Nội địa'),
        ('WALK_IN_RETAIL', 'Khách lẻ / Đơn chuyến vãng lai'),
    ]

    code = models.CharField(max_length=50, unique=True, db_index=True) # TDA_VICACO, OASIS, WCA_TTI, TAKIGAWA...
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=100, blank=True, default='', verbose_name="Tên viết tắt / Tên giao dịch")
    customer_group = models.CharField(
        max_length=50,
        choices=CUSTOMER_GROUP_CHOICES,
        default='COMMERCIAL_TRADING',
        blank=True,
        db_index=True,
        verbose_name="Nhóm khách hàng"
    )
    tax_code = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255)
    
    # Email và đầu mối liên hệ
    company_email = models.EmailField(max_length=150, blank=True, default='', verbose_name="Email Công ty (Nhận HĐĐT / Công nợ)")
    contact_person = models.CharField(max_length=100, blank=True)
    contact_title = models.CharField(max_length=100, blank=True, default='', verbose_name="Chức vụ người liên hệ")
    contact_email = models.EmailField(max_length=150, blank=True, default='', verbose_name="Email Người liên hệ (Vận hành / Booking)")
    phone = models.CharField(max_length=20, blank=True)

    # Thông tin tài khoản ngân hàng
    bank_account_number = models.CharField(max_length=50, blank=True, default='', verbose_name="Số tài khoản ngân hàng")
    bank_name = models.CharField(max_length=150, blank=True, default='', verbose_name="Tên ngân hàng")
    bank_branch = models.CharField(max_length=150, blank=True, default='', verbose_name="Chi nhánh ngân hàng")
    bank_account_holder = models.CharField(max_length=150, blank=True, default='', verbose_name="Chủ tài khoản ngân hàng")

    # Chính sách công nợ & Quản trị rủi ro (TMS / CRM)
    payment_term_days = models.IntegerField(default=30, verbose_name="Kỳ hạn thanh toán (ngày)")
    credit_limit = models.DecimalField(max_digits=14, decimal_places=0, default=0, verbose_name="Hạn mức nợ tối đa (VNĐ)")

    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        display_name = f"[{self.short_name}] {self.name}" if self.short_name else self.name
        return f"{display_name} ({self.code})"

class RouteTariff(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Biểu cước vận tải theo tuyến của khách hàng."""
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='tariffs')
    pickup_location = models.CharField(max_length=150) # CÁT LÁI, SPITC, VSIP 2...
    delivery_location = models.CharField(max_length=150) # KHO WCA, MACSTAR TÂN VẠN, VSIP 3...
    dropoff_location = models.CharField(max_length=150, blank=True) # SOLOG LIBRA, HẠ BÃI...
    
    # Khu vực tuyến (Origin & Destination Zones) phục vụ phân nhóm & tra cứu nhanh
    origin_zone = models.CharField(max_length=100, blank=True, default='', db_index=True, help_text="Khu vực xuất phát / lấy cont: Cát Lái, Cái Mép, Hiệp Phước, TP.HCM...")
    destination_zone = models.CharField(max_length=100, blank=True, default='', db_index=True, help_text="Khu vực giao nhận / kho hàng: Bình Dương, Đồng Nai, Tây Ninh, Long An, Củ Chi...")
    
    # Cự ly ước tính theo tuyến (làm tròn bội số 10km: 10km, 20km, 30km...)
    estimated_km = models.IntegerField(default=0, help_text="Cự ly ước tính theo tuyến (km) - chuẩn hóa làm tròn bước 10km")

    # FK chuẩn hoá quan hệ tới Master Data Location (Sprint 1)
    pickup_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.PROTECT, null=True, blank=True, related_name='pickup_tariffs',
        help_text="Địa điểm lấy cont/hàng (Master Data)"
    )
    delivery_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.PROTECT, null=True, blank=True, related_name='delivery_tariffs',
        help_text="Địa điểm giao hàng/kho khách (Master Data)"
    )
    dropoff_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='dropoff_tariffs',
        help_text="Địa điểm hạ rỗng/bãi cont (Master Data)"
    )
    container_size = models.CharField(max_length=20, default='40HC') # 20DC, 40HC, XE_TAI_10T...
    freight_price = models.DecimalField(max_digits=12, decimal_places=0, help_text="Đơn giá cước xuất hóa đơn")
    driver_trip_pay = models.DecimalField(max_digits=12, decimal_places=0, default=500000, help_text="Định mức lương chuyến tài xế")
    toll_standard_fee = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Định mức vé cầu đường / BOT chuẩn theo tuyến (VNĐ)")

    class Meta:
        ordering = ['customer', 'pickup_location']

    def save(self, *args, **kwargs):
        # Tự động làm tròn số km theo bước 10km (VD: 24km -> 20km, 26km -> 30km, tối thiểu 10km nếu > 0)
        if self.estimated_km and self.estimated_km > 0:
            rounded = int(round(float(self.estimated_km) / 10.0) * 10)
            self.estimated_km = max(10, rounded)
        super().save(*args, **kwargs)

    def __str__(self):
        zone_info = f" [{self.origin_zone} ➔ {self.destination_zone}]" if self.origin_zone or self.destination_zone else ""
        km_info = f" (~{self.estimated_km}km)" if self.estimated_km else ""
        return f"{self.customer.name}:{zone_info} {self.pickup_location} -> {self.delivery_location}{km_info} ({self.freight_price:,} đ)"

class Quotation(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Báo giá và Phễu bán hàng (CRM / Sales)."""
    quotation_code = models.CharField(max_length=30, unique=True, db_index=True) # BG-0916-01
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='quotations')
    origin_zone = models.CharField(max_length=100, blank=True, default='', help_text="Khu vực đi: Cát Lái, Cái Mép...")
    destination_zone = models.CharField(max_length=100, blank=True, default='', help_text="Khu vực đến: Bình Dương, Đồng Nai, Tây Ninh...")
    estimated_km = models.IntegerField(default=0, help_text="Số km ước tính (bước 10km)")
    route_description = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=12, decimal_places=0)
    expected_trips_monthly = models.IntegerField(default=10)
    status = models.CharField(
        max_length=30,
        choices=[
            ('SENT', 'Đã gửi báo giá'),
            ('NEGOTIATING', 'Đang đàm phán'),
            ('PENDING_APPROVAL', 'Chờ ký Hợp đồng'),
            ('APPROVED', 'Đã ký Hợp đồng'),
            ('REJECTED', 'Từ chối/ Hủy'),
            ('EXPIRED', 'Hết hiệu lực')
        ],
        default='SENT'
    )
    # Phương thức báo giá & cơ chế định giá cước (Pricing Method)
    pricing_method = models.CharField(
        max_length=30,
        default='MULTI_ROUTE',
        choices=[
            ('MULTI_ROUTE', 'Báo giá theo tuyến đường (Ma trận đa tuyến)'),
            ('FUEL_ADJUSTED', 'Báo giá điều chỉnh theo biến động giá dầu DO'),
            ('FLAT_CHARTER', 'Báo giá trọn gói / bao chuyến / theo tháng')
        ],
        help_text="Phương thức báo giá áp dụng"
    )

    # Các thông số điều chỉnh theo giá xăng dầu DO 0.05S
    base_fuel_price = models.DecimalField(
        max_digits=10, 
        decimal_places=0, 
        default=21000, 
        help_text="Giá dầu DO cơ sở P0 tại thời điểm báo giá (VNĐ/lít)"
    )
    fuel_step_vnd = models.DecimalField(
        max_digits=10, 
        decimal_places=0, 
        default=1000, 
        help_text="Biên độ biến động giá dầu mỗi bước (VNĐ/lít)"
    )
    fuel_ratio_percent = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=3.5, 
        help_text="Tỷ lệ điều chỉnh giá cước (%) trên mỗi bước biến động giá dầu"
    )
    fuel_surcharge_formula = models.CharField(
        max_length=255, 
        blank=True,
        default="Mỗi khi giá dầu DO 0.05S Petrolimex thay đổi 1.000 đ/lít so với giá cơ sở, đơn giá cước vận chuyển sẽ điều chỉnh tăng/giảm tương ứng 3.5%",
        help_text="Diễn giải công thức phụ phí / điều chỉnh xăng dầu"
    )

    notes = models.TextField(blank=True, default='', help_text="Điều khoản & ghi chú báo giá (VAT, bốc xếp, phí neo, điều khoản thương mại)")
    template_type = models.CharField(
        max_length=30,
        default='STANDARD',
        choices=[
            ('STANDARD', 'Mẫu 1: Tiêu Chuẩn Doanh Nghiệp (Quốc hiệu & Điều khoản TVL)'),
            ('TABLE_MATRIX', 'Mẫu 2: Bảng Cước & Khung Đối Tác (To/From Matrix)'),
            ('PROJECT_DETAIL', 'Mẫu 3: Chi Tiết Dịch Vụ & Lộ Trình Dự Án'),
        ],
        help_text="Mẫu in báo giá"
    )
    contact_person = models.CharField(max_length=100, blank=True, default='', help_text="Đại diện khách hàng / Attn")
    contact_phone = models.CharField(max_length=50, blank=True, default='', help_text="SĐT liên hệ khách hàng")
    contact_email = models.CharField(max_length=100, blank=True, default='', help_text="Email liên hệ khách hàng")
    cargo_type = models.CharField(max_length=150, blank=True, default='Hàng tổng hợp / Container', help_text="Loại hàng hóa / Quy cách xe cont")
    valid_until = models.DateField(null=True, blank=True, help_text="Hiệu lực báo giá đến ngày")
    created_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_quotations',
        help_text="Nhân viên kinh doanh lập báo giá"
    )

    def save(self, *args, **kwargs):
        if self.estimated_km and self.estimated_km > 0:
            rounded = int(round(float(self.estimated_km) / 10.0) * 10)
            self.estimated_km = max(10, rounded)
        super().save(*args, **kwargs)

    @property
    def total_expected_trips(self):
        items = self.items.filter(is_deleted=False) if hasattr(self, 'items') else None
        if items and items.exists():
            return sum(it.expected_trips_monthly for it in items)
        return self.expected_trips_monthly or 0

    @property
    def expected_revenue(self):
        # Nếu có các dòng tuyến đường chi tiết (QuotationItem), tính tổng doanh thu kế hoạch của tất cả các dòng
        items = self.items.filter(is_deleted=False) if hasattr(self, 'items') else None
        if items and items.exists():
            return sum((it.unit_price * it.expected_trips_monthly) for it in items)
        return self.unit_price * self.expected_trips_monthly

    @property
    def hashid(self):
        """Mã hoá id thành hashid an toàn cho định tuyến URL."""
        from core.security import get_quotation_hashid
        return get_quotation_hashid(self.id)

    def __str__(self):
        return f"[{self.quotation_code}] {self.customer.name} - {self.route_description}"


class QuotationItem(TimeStampedModel, SoftDeleteModel):
    """
    Chi tiết từng dòng tuyến đường trong một Báo Giá (Hỗ trợ báo giá nhiều tuyến cho cùng 1 khách hàng).
    """
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    route_description = models.CharField(max_length=255, help_text="Mô tả tuyến đường: Điểm đi -> Điểm đến")
    origin_zone = models.CharField(max_length=100, blank=True, default='', help_text="Khu vực đi: Cát Lái, Cái Mép...")
    destination_zone = models.CharField(max_length=100, blank=True, default='', help_text="Khu vực đến: Bình Dương, Đồng Nai...")
    cargo_type = models.CharField(max_length=100, blank=True, default='Cont 40HC', help_text="Quy cách cont / Loại xe")
    estimated_km = models.IntegerField(default=0, help_text="Cự ly ước tính (km)")
    unit_price = models.DecimalField(max_digits=12, decimal_places=0, help_text="Đơn giá cước vận chuyển (VNĐ)")
    expected_trips_monthly = models.IntegerField(default=1, help_text="Sản lượng cam kết (chuyến/tháng)")
    surcharges = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Phụ phí nếu có (VNĐ)")
    notes = models.CharField(max_length=255, blank=True, default='', help_text="Ghi chú riêng của tuyến")

    class Meta:
        ordering = ['id']

    @property
    def line_revenue(self):
        return self.unit_price * self.expected_trips_monthly

    def __str__(self):
        return f"{self.route_description} ({self.unit_price:,} đ x {self.expected_trips_monthly})"

class BookingStatus(models.TextChoices):
    PENDING_DISPATCH = 'PENDING_DISPATCH', 'Chờ điều xe'
    PARTIALLY_DISPATCHED = 'PARTIALLY_DISPATCHED', 'Đang điều xe'
    COMPLETED = 'COMPLETED', 'Đã điều đủ xe'
    CANCELLED = 'CANCELLED', 'Đã hủy'

class BookingOrder(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """
    Đơn hàng vận chuyển / Booking hãng tàu do bộ phận Sale / CS tiếp nhận.
    Là căn cứ để bộ phận Điều Vận kế thừa dữ liệu và phát lệnh điều xe.
    """
    booking_code = models.CharField(max_length=30, unique=True, db_index=True) # VD: BK-2026-0917-01
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='bookings')
    booking_type = models.CharField(
        max_length=30,
        default='EXPORT_FCL',
        choices=[
            ('EXPORT_FCL', 'Kéo Cont Xuất Khẩu (FCL)'),
            ('IMPORT_FCL', 'Kéo Cont Nhập Khẩu (FCL)'),
            ('DOMESTIC', 'Vận Chuyển Nội Địa / Nhà Máy (FTL)'),
        ],
        help_text="Phân loại dịch vụ vận chuyển khách đặt"
    )
    booking_number = models.CharField(max_length=50, blank=True, db_index=True, help_text="Số Booking hãng tàu hoặc số PO khách hàng")
    shipping_line = models.CharField(max_length=50, blank=True, help_text="Hãng tàu: ONE, MAERSK, COSCO, EVERGREEN hoặc Nội Địa...")
    vessel_voyage = models.CharField(max_length=100, blank=True, help_text="Tên tàu / Số chuyến")
    destination_port = models.CharField(max_length=100, blank=True, help_text="Cảng đích / Nước nhập khẩu")
    
    container_size = models.CharField(max_length=30, default='40HC', help_text="40HC, 20GP, 45G1, Xe tải...")
    total_containers = models.IntegerField(default=1, help_text="Tổng số cont / chuyến cần điều")
    dispatched_containers = models.IntegerField(default=0, help_text="Số cont / chuyến đã phát lệnh")

    # Hàng hóa & Chứng từ theo chuẩn Hãng tàu
    commodity = models.CharField(max_length=255, blank=True, help_text="Tên loại hàng hóa (vd: Mowers, Dụng cụ Ryobi, Sacks...)")
    hs_code = models.CharField(max_length=50, blank=True, help_text="Mã HS Code hàng hóa")

    # Lộ trình 3 điểm
    pickup_location = models.CharField(max_length=150, help_text="1. Nơi cấp rỗng / bãi lấy cont")
    delivery_location = models.CharField(max_length=150, help_text="2. Nơi đóng / dỡ hàng (Kho khách)")
    dropoff_location = models.CharField(max_length=150, blank=True, help_text="3. Nơi hạ bãi / cảng xuất / trả rỗng")
    
    # FK chuẩn hoá quan hệ tới Master Data Location (Sprint 1)
    pickup_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='pickup_bookings',
        help_text="Địa điểm lấy cont/hàng (Master Data)"
    )
    delivery_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_bookings',
        help_text="Địa điểm đóng/dỡ hàng kho khách (Master Data)"
    )
    dropoff_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='dropoff_bookings',
        help_text="Địa điểm hạ rỗng/cảng xuất (Master Data)"
    )

    # 3 Mốc Cut-off & Thời hạn Hãng tàu
    si_cutoff = models.CharField(max_length=100, blank=True, help_text="Hạn chót gửi chi tiết vận đơn SI")
    vgm_cutoff = models.CharField(max_length=100, blank=True, help_text="Hạn chót nộp phiếu cân tải trọng VGM")
    closing_time = models.CharField(max_length=100, blank=True, help_text="Hạn chót cắt máng CY / Closing Time")
    loading_date = models.DateField(null=True, blank=True, help_text="Ngày hẹn đóng hàng")
    loading_time = models.CharField(max_length=20, default='08:00', blank=True, help_text="Giờ hẹn đóng hàng")
    free_time_detention = models.IntegerField(default=7, help_text="Số ngày miễn phí lưu vỏ (DET)")
    free_time_demurrage = models.IntegerField(default=7, help_text="Số ngày miễn phí lưu bãi (DEM)")

    # Thương mại
    selling_freight_price = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Đơn giá cước thỏa thuận với khách (VNĐ)")
    booking_file = models.FileField(
        upload_to='booking_files/%Y/%m/', 
        null=True, 
        blank=True, 
        help_text="File Booking / Lệnh cấp cont từ khách hàng (Ảnh hoặc PDF)"
    )
    status = models.CharField(max_length=30, choices=BookingStatus.choices, default=BookingStatus.PENDING_DISPATCH)
    notes = models.TextField(blank=True, help_text="Yêu cầu đặc biệt của khách hàng")
    created_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_bookings',
        help_text="Nhân viên tiếp nhận và lập đơn booking"
    )

    @property
    def remaining_containers(self):
        return max(0, self.total_containers - self.dispatched_containers)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.booking_code}] {self.customer.name} - {self.booking_number} ({self.dispatched_containers}/{self.total_containers} Cont)"


class BookingDocument(TimeStampedModel, SoftDeleteModel):
    """
    Quản lý đa tệp đính kèm cho Đơn Đặt Hàng / Booking (Ảnh lệnh cấp vỏ, PDF Booking confirmation...).
    """
    booking = models.ForeignKey(BookingOrder, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='booking_files/%Y/%m/', help_text="File tài liệu đính kèm (Ảnh hoặc PDF)")
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(default=0, help_text="Kích thước tệp (bytes)")

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.booking.booking_code}] {self.file_name or self.file.name}"
