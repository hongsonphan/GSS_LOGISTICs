from django.db import models
from core.models import TimeStampedModel, SoftDeleteModel

class Customer(TimeStampedModel, SoftDeleteModel):
    code = models.CharField(max_length=50, unique=True, db_index=True) # TDA_VICACO, OASIS, WCA_TTI, TAKIGAWA...
    name = models.CharField(max_length=255)
    tax_code = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

class RouteTariff(TimeStampedModel, SoftDeleteModel):
    """Biểu cước vận tải theo tuyến của khách hàng."""
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='tariffs')
    pickup_location = models.CharField(max_length=150) # CÁT LÁI, SPITC, VSIP 2...
    delivery_location = models.CharField(max_length=150) # KHO WCA, MACSTAR TÂN VẠN, VSIP 3...
    dropoff_location = models.CharField(max_length=150, blank=True) # SOLOG LIBRA, HẠ BÃI...
    
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

    def __str__(self):
        return f"{self.customer.name}: {self.pickup_location} -> {self.delivery_location} ({self.freight_price:,} đ)"

class Quotation(TimeStampedModel, SoftDeleteModel):
    """Báo giá và Phễu bán hàng (CRM / Sales)."""
    quotation_code = models.CharField(max_length=30, unique=True, db_index=True) # BG-0916-01
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='quotations')
    route_description = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=12, decimal_places=0)
    expected_trips_monthly = models.IntegerField(default=10)
    status = models.CharField(
        max_length=30,
        choices=[
            ('NEGOTIATING', 'Đang thương lượng'),
            ('PENDING_APPROVAL', 'Chờ Ban Giám Đốc duyệt'),
            ('APPROVED', 'Đã duyệt (Tháng này)'),
            ('REJECTED', 'Từ chối / Không chốt'),
            ('EXPIRED', 'Hết hiệu lực')
        ],
        default='NEGOTIATING'
    )

    @property
    def expected_revenue(self):
        return self.unit_price * self.expected_trips_monthly

    def __str__(self):
        return f"[{self.quotation_code}] {self.customer.name} - {self.route_description}"

class BookingStatus(models.TextChoices):
    PENDING_DISPATCH = 'PENDING_DISPATCH', 'Chờ điều xe'
    PARTIALLY_DISPATCHED = 'PARTIALLY_DISPATCHED', 'Đang điều xe'
    COMPLETED = 'COMPLETED', 'Đã điều đủ xe'
    CANCELLED = 'CANCELLED', 'Đã hủy'

class BookingOrder(TimeStampedModel, SoftDeleteModel):
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
    loading_time = models.CharField(max_length=20, default='8H', blank=True, help_text="Giờ hẹn đóng hàng")
    free_time_detention = models.IntegerField(default=7, help_text="Số ngày miễn phí lưu vỏ (DET)")
    free_time_demurrage = models.IntegerField(default=7, help_text="Số ngày miễn phí lưu bãi (DEM)")

    # Thương mại
    selling_freight_price = models.DecimalField(max_digits=12, decimal_places=0, default=4000000, help_text="Đơn giá cước thỏa thuận với khách (VNĐ)")
    booking_file = models.FileField(
        upload_to='booking_files/%Y/%m/', 
        null=True, 
        blank=True, 
        help_text="File Booking / Lệnh cấp cont từ khách hàng (Ảnh hoặc PDF)"
    )
    status = models.CharField(max_length=30, choices=BookingStatus.choices, default=BookingStatus.PENDING_DISPATCH)
    notes = models.TextField(blank=True, help_text="Yêu cầu đặc biệt của khách hàng")

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
