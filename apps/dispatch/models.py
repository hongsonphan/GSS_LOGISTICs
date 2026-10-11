from django.db import models
from django.utils import timezone
from core.models import TimeStampedModel, SoftDeleteModel

class ShipmentType(models.TextChoices):
    IMPORT = 'IMPORT', 'Hàng Nhập'
    EXPORT = 'EXPORT', 'Hàng Xuất'
    DOMESTIC = 'DOMESTIC', 'Nội Địa / Chuyển Kho'

class TripStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Chờ duyệt / Nháp'
    DISPATCHED = 'DISPATCHED', 'Đã phát lệnh Zalo/App'
    ACCEPTED = 'ACCEPTED', 'Tài xế đã nhận lệnh'
    CONTAINER_PICKED = 'CONTAINER_PICKED', 'Đã lấy Cont / Hàng'
    IN_TRANSIT = 'IN_TRANSIT', 'Đang di chuyển'
    AT_WAREHOUSE = 'AT_WAREHOUSE', 'Đã đến kho khách'
    UNLOADING = 'UNLOADING', 'Đang đóng / Trút hàng'
    DELIVERED = 'DELIVERED', 'Giao nhận thành công (Có POD)'
    RETURNING_EMPTY = 'RETURNING_EMPTY', 'Đang kéo hạ bãi'
    COMPLETED = 'COMPLETED', 'Đã hoàn tất chuyến'
    CANCELLED = 'CANCELLED', 'Đã hủy'

class DispatchTrip(TimeStampedModel, SoftDeleteModel):
    """
    Bảng hạt nhân của toàn bộ hệ thống điều độ vận tải Bim Logistics.
    Quản lý luồng 10 bước, đối soát chứng từ và lợi nhuận chuyến xe.
    """
    trip_code = models.CharField(max_length=30, unique=True, db_index=True) # TVL-0916-001...
    shipment_type = models.CharField(max_length=15, choices=ShipmentType.choices, default=ShipmentType.IMPORT)
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, related_name='trips')
    booking_order = models.ForeignKey(
        'customers.BookingOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trips',
        help_text="Đơn hàng Booking liên thông từ phân hệ Sale"
    )
    
    # Tài nguyên điều động
    vehicle = models.ForeignKey('fleet.Vehicle', on_delete=models.PROTECT, related_name='trips')
    trailer = models.ForeignKey('fleet.Trailer', on_delete=models.PROTECT, null=True, blank=True, related_name='trips')
    driver = models.ForeignKey('personnel.Employee', on_delete=models.PROTECT, related_name='trips')
    dispatcher = models.ForeignKey('personnel.Employee', on_delete=models.PROTECT, null=True, blank=True, related_name='dispatched_trips')

    # Thông tin Vận đơn & Vỏ Container
    container_number = models.CharField(max_length=30, blank=True, db_index=True) # CAAU5214215XX, BỘT SẮT (CONT 40)...
    seal_number = models.CharField(max_length=50, blank=True)
    container_type = models.CharField(max_length=30, default='40HC') # 40HC, 20DC, Xe tải 10T, Xe tải 2T...
    booking_or_bill = models.CharField(max_length=50, blank=True, db_index=True)
    cutoff_time = models.CharField(max_length=100, blank=True, help_text="Giờ cắt máng / SI")
    freetime_days = models.IntegerField(default=0, help_text="Số ngày lưu cont miễn phí")

    # Lộ trình 3 điểm chuẩn thực tế
    pickup_location = models.CharField(max_length=150, help_text="1. Nơi lấy cont/hàng (Cát Lái, SPITC, TĐÁ...)")
    warehouse_location = models.CharField(max_length=150, help_text="2. Nơi đóng/trả hàng (Kho KH: Tân Vạn, WCA...)")
    dropoff_location = models.CharField(max_length=150, blank=True, help_text="3. Nơi hạ vỏ cont / bãi rỗng")
    
    # FK chuẩn hoá quan hệ tới Master Data Location (Sprint 1)
    pickup_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.PROTECT, null=True, blank=True, related_name='pickup_trips',
        help_text="1. Nơi lấy cont/hàng (Master Data Location)"
    )
    warehouse_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.PROTECT, null=True, blank=True, related_name='warehouse_trips',
        help_text="2. Nơi đóng/trả hàng kho KH (Master Data Location)"
    )
    dropoff_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='dropoff_trips',
        help_text="3. Nơi hạ vỏ cont / bãi rỗng (Master Data Location)"
    )
    
    # Chi tiết Bãi/Depot & Kho theo Bảng kê chi phí thực tế
    pickup_depot = models.CharField(max_length=100, blank=True, help_text="Cảng lấy / Depot lấy cont (vd: Tây Nam, AP622)")
    dropoff_depot = models.CharField(max_length=100, blank=True, help_text="Cảng hạ / Depot hạ cont (vd: Cát Lái, Tân Cảng)")
    delivery_warehouse = models.CharField(max_length=150, blank=True, help_text="Kho giao hàng thực tế")

    # Thông tin Chứng từ EIR & Hãng tàu hiện trường
    eir_number = models.CharField(max_length=50, blank=True, help_text="Số phiếu giao nhận Container (EIR No)")
    shipping_line = models.CharField(max_length=50, blank=True, help_text="Hãng tàu (MAE, COS, CMA CGM, ONE...)")
    vessel_voyage = models.CharField(max_length=100, blank=True, help_text="Tên tàu / Số chuyến (USAL-UMM SALAL / 637E)")
    destination_port = models.CharField(max_length=100, blank=True, help_text="Cảng đích (NEWARK, LONG BEACH...)")
    vgm_weight = models.CharField(max_length=50, blank=True, help_text="Trọng lượng VGM (vd 10.93 D26C)")
    bay_location = models.CharField(max_length=50, blank=True, help_text="Vị trí bãi cont")

    # Thông tin Hóa đơn thương mại & Cửa Dock kho theo Excel thực tế
    commercial_invoice = models.CharField(max_length=100, blank=True, help_text="Số Invoice thương mại hàng hóa (VCC33970...)")
    warehouse_dock = models.CharField(max_length=50, blank=True, help_text="Cửa Dock bốc hàng tại kho (D2, DP...)")

    # Cấu hình Chặng Điều Động & Nghiệp vụ Cắt Kéo (Drop & Hook)
    is_split_trip = models.BooleanField(default=False, db_index=True, help_text="Chế độ Cắt Kéo / Cắt Mooc (Tài xế & Đầu kéo chặng lấy và hạ khác nhau)")
    dropoff_driver = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dropoff_driver_trips',
        help_text="Tài xế hạ cont / Chặng 2 (Cắt kéo - Drop & Hook)"
    )
    dropoff_vehicle = models.ForeignKey(
        'fleet.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dropoff_trips',
        help_text="Xe hạ cont (Cột R Excel / Chặng 2)"
    )
    dropoff_trailer = models.ForeignKey(
        'fleet.Trailer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dropoff_trailer_trips',
        help_text="Rơ-mooc hạ cont (nếu đổi mooc)"
    )
    driver_split_ratio = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=50.00,
        help_text="Tỷ lệ phân chia lương tài xế chặng 1 (%)"
    )
    driver_allowance = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Lương/thù lao tài xế chặng 1 (VNĐ)"
    )
    dropoff_driver_allowance = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Lương/thù lao tài xế chặng 2 hạ cont (VNĐ)"
    )

    cont_location_type = models.CharField(max_length=50, blank=True, default='NHÀ MÁY', help_text="Vị trí cont (NHÀ MÁY, BÃI, CẢNG...)")
    cargo_notes = models.CharField(max_length=255, blank=True, help_text="Lưu ý đóng/hạ cont (Cột T trong Excel)")

    # Nghiệp vụ Chở Ghép 2 Cont 20ft (Twin 20ft Drayage)
    is_twin_container = models.BooleanField(
        default=False, 
        db_index=True, 
        help_text="Chế độ chở ghép 2 container 20ft trên cùng 1 chuyến"
    )
    container_number_2 = models.CharField(
        max_length=50, 
        blank=True, 
        help_text="Số vỏ Container thứ 2 (khi chạy kẹp 20ft)"
    )
    seal_number_2 = models.CharField(
        max_length=50, 
        blank=True, 
        help_text="Số chì / Seal Container thứ 2"
    )
    booking_or_bill_2 = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="Số B/L hoặc Booking của Container thứ 2"
    )
    vgm_weight_2 = models.CharField(
        max_length=50, 
        blank=True, 
        help_text="Trọng lượng VGM cont thứ 2"
    )
    cargo_notes_2 = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Ghi chú hàng hóa cho Container thứ 2"
    )

    # Quản lý Hạn Free-time DEM/DET Cảng & Hãng Tàu
    det_free_days = models.IntegerField(
        default=3, 
        help_text="Số ngày miễn phí mượn vỏ cont (Free DET)"
    )
    dem_free_days = models.IntegerField(
        default=3, 
        help_text="Số ngày miễn phí lưu bãi cảng (Free DEM)"
    )
    det_expiry_date = models.DateField(
        null=True, 
        blank=True, 
        db_index=True, 
        help_text="Hạn cuối trả vỏ cont rỗng không bị phạt (Free DET Expiry)"
    )
    dem_expiry_date = models.DateField(
        null=True, 
        blank=True, 
        db_index=True, 
        help_text="Hạn cuối lưu bãi cảng không bị phạt (Free DEM Expiry)"
    )

    # Giám định Tình trạng Vỏ Cont Hiện trường (EIR / CIR Condition)
    container_condition = models.CharField(
        max_length=50, 
        default='GOOD', 
        choices=[
            ('GOOD', 'Nguyên vẹn / Đạt chuẩn'),
            ('DAMAGED', 'Có hư hỏng từ trước (Lập biên bản)'),
            ('CLEANING_REQUIRED', 'Bẩn / Cần vệ sinh')
        ], 
        help_text="Tình trạng vỏ cont khi nhận tại cảng/depot"
    )
    damage_description = models.TextField(
        blank=True, 
        help_text="Chi tiết hư hỏng vỏ cont (Rách bạt, móp vách, thủng nóc, mục sàn...)"
    )
    booking_file = models.FileField(
        upload_to='booking_files/%Y/%m/', 
        null=True, 
        blank=True, 
        help_text="File Booking / Lệnh cấp cont từ khách hàng (Ảnh hoặc PDF)"
    )

    # Theo dõi chi tiết 5 mốc thời gian tại kho khách hàng (Cột B, C, D, E, F, G, H)
    loading_date = models.DateField(null=True, blank=True, help_text="Ngày hẹn đóng hàng (Cột B)")
    loading_time = models.CharField(max_length=50, blank=True, help_text="Giờ hẹn đóng hàng (Cột C, vd: 8H, 16H30)")
    eta_warehouse_time = models.CharField(max_length=50, blank=True, help_text="Giờ dự kiến đến kho (Cột D)")
    warehouse_call_in_time = models.CharField(max_length=50, blank=True, help_text="Giờ kho gọi xe vào cổng (Cột E)")
    actual_gate_in_time = models.CharField(max_length=50, blank=True, help_text="Giờ xe vào cổng kho thực tế (Cột F)")
    warehouse_call_out_time = models.CharField(max_length=50, blank=True, help_text="Giờ kho gọi kéo cont ra (Cột G)")
    actual_gate_out_time = models.CharField(max_length=50, blank=True, help_text="Giờ xe kéo ra cổng thực tế (Cột H)")

    # 2 Mốc bổ sung thực tiễn: Theo dõi xe chờ hạ cont sau 0h & Hạ bãi thực tế (Mốc 6 & Mốc 7)
    dropoff_appointment_time = models.CharField(max_length=50, blank=True, help_text="Mốc 6: Giờ hẹn hạ bãi / Yêu cầu chờ hạ sau 0h (Cột I)")
    actual_dropoff_time = models.CharField(max_length=50, blank=True, help_text="Mốc 7: Giờ hạ bãi thực tế / Phiếu EIR hạ cont (Cột K)")
    dropoff_appointment_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm hẹn hạ bãi (ISO DateTime)")
    actual_dropoff_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm hạ bãi thực tế (ISO DateTime)")

    # Nghiệp vụ Lưu xe & Lưu cont chờ hạ qua đêm (Overnight Detention & Demurrage)
    is_overnight_detention = models.BooleanField(default=False, db_index=True, help_text="Xác nhận xe lưu đêm / neo chờ hạ sau 0h")
    overnight_wait_hours = models.DecimalField(max_digits=5, decimal_places=1, default=0, help_text="Số giờ neo xe chờ hạ qua đêm")
    detention_fee_customer = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Phụ phí lưu xe / neo cont tính cho khách hàng (VNĐ)")
    detention_driver_allowance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Phụ cấp lưu đêm cho tài xế trực xe (VNĐ)")
    detention_reason = models.CharField(max_length=255, blank=True, help_text="Lý do neo xe (Chờ mở CY cảng lúc 0h, kho yêu cầu, kẹt tải...)")

    # Mốc thời gian chuẩn hóa DateTimeField (Sprint 1)
    actual_gate_in_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm xe vào cổng kho thực tế (ISO DateTime)")
    actual_gate_out_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm xe kéo ra cổng thực tế (ISO DateTime)")

    planned_start_time = models.DateTimeField(null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)

    # Mốc timestamp chuẩn hóa theo quy trình điều vận 9 bước
    dispatched_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm Điều độ phát lệnh App/Zalo cho tài xế")
    accepted_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm tài xế xác nhận nhận chuyến")
    declined_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm tài xế từ chối chuyến")
    decline_reason = models.CharField(max_length=255, blank=True, default='', help_text="Lý do tài xế từ chối chuyến")
    driver_token = models.CharField(max_length=64, blank=True, default='', db_index=True, help_text="Token bảo mật 1 lần duy nhất cho tài xế hiện tại của chuyến (tự động làm mới khi đổi tài xế)")
    revoked_driver_tokens = models.TextField(blank=True, default='', help_text="Danh sách token cũ của các tài xế trước đã bị thu hồi khi đổi tài xế")
    unloading_started_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm bắt đầu đóng/trút hàng tại dock kho")

    status = models.CharField(max_length=25, choices=TripStatus.choices, default=TripStatus.DRAFT, db_index=True)
    special_notes = models.TextField(blank=True, help_text="Lưu ý của điều độ, phí cty chịu...")

    # Bộ đệm tài chính (Cached Denormalization via Signals)
    cached_revenue = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Doanh thu cước")
    cached_expense = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng chi phí phát sinh + lương")
    cached_profit = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Lợi nhuận gộp")
    cached_margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Biên lợi nhuận %")

    # Khóa sổ Kế toán & Quản lý Tạm ứng - Hoàn ứng
    is_expenses_settled = models.BooleanField(default=False, help_text="Kế toán đã chốt sổ chi phí (Khóa sửa/xóa)")
    settled_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm chốt sổ chi phí")
    settled_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='settled_trips')
    
    driver_advance_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng tiền tạm ứng chuyến cho tài xế (VNĐ)")
    advance_settlement_status = models.CharField(
        max_length=20,
        default='NO_ADVANCE',
        choices=[
            ('NO_ADVANCE', 'Chưa tạm ứng'),
            ('ADVANCED', 'Đang tạm ứng'),
            ('SETTLED', 'Đã hoàn ứng quyết toán')
        ],
        help_text="Trạng thái hoàn ứng chuyến"
    )

    # Quyết Toán & Đối Soát Công Nợ Khách Hàng (Customer Settlement & AR Billing)
    is_customer_settled = models.BooleanField(default=False, db_index=True, help_text="Đã đối soát & quyết toán chốt số với khách hàng (Mới tính vào công nợ AR)")
    customer_settlement_status = models.CharField(
        max_length=20, 
        default='PENDING', 
        choices=[
            ('PENDING', 'Chưa quyết toán (Chưa tính công nợ)'),
            ('SETTLED', 'Đã quyết toán chốt nợ'),
            ('INVOICED', 'Đã xuất hóa đơn VAT'),
            ('PAID', 'Đã thu đủ tiền')
        ], 
        db_index=True, 
        help_text="Trạng thái quyết toán công nợ khách hàng"
    )
    customer_settled_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm chốt quyết toán với khách hàng")
    customer_settled_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_settled_trips', help_text="Kế toán chốt quyết toán công nợ khách hàng")
    customer_soa_code = models.CharField(max_length=50, blank=True, default='', db_index=True, help_text="Mã đợt/bảng kê đối soát công nợ gửi khách (SOA-YYYYMM-XXXX)")
    vat_invoice_number = models.CharField(max_length=50, blank=True, default='', help_text="Số hóa đơn GTGT / VAT xuất cho khách")
    vat_invoice_date = models.DateField(null=True, blank=True, help_text="Ngày phát hành hóa đơn VAT")
    customer_reconciled = models.BooleanField(default=False, db_index=True, help_text="Alias tương thích ngược cho is_customer_settled")
    customer_reconciled_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm chốt đối soát với khách hàng")
    customer_reconciled_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='reconciled_trips_customer', help_text="Kế toán chốt đối soát công nợ")



    # Quyết toán & Đối soát Nhà Xe Bạn / Thầu Phụ 3PL (Giai đoạn 2)
    subcontractor_cost = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Cước thỏa thuận trả xe bạn / thầu phụ 3PL (VNĐ)"
    )
    subcontractor_advance = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Số tiền cước đã tạm ứng trước cho nhà xe bạn (VNĐ)"
    )
    subcontractor_settlement_status = models.CharField(
        max_length=20,
        default='PENDING',
        choices=[
            ('PENDING', 'Chờ quyết toán'),
            ('PARTIAL', 'Thanh toán 1 phần'),
            ('SETTLED', 'Đã quyết toán xong')
        ],
        db_index=True,
        help_text="Tình trạng quyết toán tiền cước với nhà xe bạn"
    )
    subcontractor_settled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Thời điểm kế toán chốt quyết toán cước xe bạn"
    )
    subcontractor_notes = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ghi chú thỏa thuận cước và đối soát xe bạn"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['trip_code', 'status']),
            models.Index(fields=['container_number']),
            models.Index(fields=['booking_or_bill']),
            models.Index(fields=['subcontractor_settlement_status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"[{self.trip_code}] {self.customer.name} - {self.get_status_display()}"

    def regenerate_driver_token(self, save=False):
        """Sinh mới mã token truy cập Driver Portal và vô hiệu hóa hoàn toàn link cũ của tài xế trước."""
        import secrets
        if self.driver_token:
            tokens = [t.strip() for t in (self.revoked_driver_tokens or '').split(',') if t.strip()]
            if self.driver_token not in tokens:
                tokens.append(self.driver_token)
            self.revoked_driver_tokens = ','.join(tokens)
        self.driver_token = secrets.token_urlsafe(16)
        if save and self.pk:
            self.save(update_fields=['driver_token', 'revoked_driver_tokens'])
        return self.driver_token

    def save(self, *args, **kwargs):
        if not self.driver_token:
            import secrets
            self.driver_token = secrets.token_urlsafe(16)
        super().save(*args, **kwargs)

    @property
    def hashid(self):
        """Mã hóa ID chuyến xe thành chuỗi HashID bảo mật chống IDOR (Tiêu chuẩn 10)."""
        from core.security import get_trip_hashid
        return get_trip_hashid(self.id)

    @property
    def driver_hashid(self):
        """Mã hóa Capability Token riêng cho Cổng Tài Xế Mobile (Driver Portal)."""
        if self.driver_token:
            return self.driver_token
        from core.security import get_driver_hashid
        return get_driver_hashid(self.id)

    @property
    def tracking_hashid(self):
        """Mã hóa Capability Token riêng cho Cổng Tra Cứu Khách Hàng (Customer Tracking)."""
        from core.security import get_tracking_hashid
        return get_tracking_hashid(self.id)

    def update_financials(self):
        """Tính toán tự động và cache P&L của chuyến xe."""
        # Lấy cước theo tariff nếu cached_revenue chưa gán
        if self.cached_revenue <= 0:
            tariff = None
            if self.pickup_loc_id and self.warehouse_loc_id:
                tariff = self.customer.tariffs.filter(
                    pickup_loc=self.pickup_loc,
                    delivery_loc=self.warehouse_loc
                ).first()
            if not tariff:
                tariff = self.customer.tariffs.filter(
                    pickup_location__iexact=self.pickup_location,
                    delivery_location__iexact=self.warehouse_location
                ).first()
            if tariff:
                self.cached_revenue = tariff.freight_price

        # Tính tổng chi phí thực tế phát sinh từ bảng TripExpense (loại trừ các khoản bị xóa, từ chối hoặc chi hộ KH)
        from apps.billing.models import TripExpense, ApprovalStatus
        total_expenses = TripExpense.objects.filter(
            trip=self, 
            is_deleted=False,
            is_on_behalf_of_customer=False
        ).exclude(
            status=ApprovalStatus.REJECTED
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0

        self.cached_expense = total_expenses
        self.cached_profit = self.cached_revenue - self.cached_expense
        if self.cached_revenue > 0:
            self.cached_margin_percent = round((self.cached_profit / self.cached_revenue) * 100, 2)
        else:
            self.cached_margin_percent = 0

        self.save(update_fields=['cached_revenue', 'cached_expense', 'cached_profit', 'cached_margin_percent'])

class TripTimelineItem(TimeStampedModel):
    """Chi tiết từng mốc trong 10 bước điều vận thực tế hiển thị trên Timeline."""
    trip = models.ForeignKey(DispatchTrip, on_delete=models.CASCADE, related_name='timeline_items')
    step_number = models.IntegerField()
    title = models.CharField(max_length=200)
    time_display = models.CharField(max_length=50, blank=True)
    is_done = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['step_number']

    def __str__(self):
        return f"{self.trip.trip_code} - Bước {self.step_number}: {self.title}"
