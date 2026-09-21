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
    dropoff_vehicle = models.ForeignKey('fleet.Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='dropoff_trips', help_text="Xe hạ cont (Cột R Excel)")
    cont_location_type = models.CharField(max_length=50, blank=True, default='NHÀ MÁY', help_text="Vị trí cont (NHÀ MÁY, BÃI, CẢNG...)")
    cargo_notes = models.CharField(max_length=255, blank=True, help_text="Lưu ý đóng/hạ cont (Cột T trong Excel)")

    # Theo dõi chi tiết 5 mốc thời gian tại kho khách hàng (Cột B, C, D, E, F, G, H)
    loading_date = models.DateField(null=True, blank=True, help_text="Ngày hẹn đóng hàng (Cột B)")
    loading_time = models.CharField(max_length=50, blank=True, help_text="Giờ hẹn đóng hàng (Cột C, vd: 8H, 16H30)")
    eta_warehouse_time = models.CharField(max_length=50, blank=True, help_text="Giờ dự kiến đến kho (Cột D)")
    warehouse_call_in_time = models.CharField(max_length=50, blank=True, help_text="Giờ kho gọi xe vào cổng (Cột E)")
    actual_gate_in_time = models.CharField(max_length=50, blank=True, help_text="Giờ xe vào cổng kho thực tế (Cột F)")
    warehouse_call_out_time = models.CharField(max_length=50, blank=True, help_text="Giờ kho gọi kéo cont ra (Cột G)")
    actual_gate_out_time = models.CharField(max_length=50, blank=True, help_text="Giờ xe kéo ra cổng thực tế (Cột H)")

    planned_start_time = models.DateTimeField(null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=25, choices=TripStatus.choices, default=TripStatus.DRAFT, db_index=True)
    special_notes = models.TextField(blank=True, help_text="Lưu ý của điều độ, phí cty chịu...")

    # Bộ đệm tài chính (Cached Denormalization via Signals)
    cached_revenue = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Doanh thu cước")
    cached_expense = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng chi phí phát sinh + lương")
    cached_profit = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Lợi nhuận gộp")
    cached_margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Biên lợi nhuận %")

    # Khóa sổ Kế toán (Bảo vệ tính bất khả xâm phạm)
    is_expenses_settled = models.BooleanField(default=False, help_text="Kế toán đã chốt sổ chi phí (Khóa sửa/xóa)")
    settled_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm chốt sổ chi phí")
    settled_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='settled_trips')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['trip_code', 'status']),
            models.Index(fields=['container_number']),
            models.Index(fields=['booking_or_bill']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"[{self.trip_code}] {self.customer.name} - {self.get_status_display()}"

    def update_financials(self):
        """Tính toán tự động và cache P&L của chuyến xe."""
        # Lấy cước theo tariff nếu cached_revenue chưa gán
        if self.cached_revenue <= 0:
            tariff = self.customer.tariffs.filter(
                pickup_location__iexact=self.pickup_location,
                delivery_location__iexact=self.warehouse_location
            ).first()
            if tariff:
                self.cached_revenue = tariff.freight_price

        # Tính tổng chi phí thực tế phát sinh từ bảng TripExpense (loại trừ các khoản bị xóa hoặc từ chối)
        from apps.billing.models import TripExpense, ApprovalStatus
        total_expenses = TripExpense.objects.filter(
            trip=self, 
            is_deleted=False
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
