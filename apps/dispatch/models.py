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

        # Tính tổng chi phí đã duyệt từ bảng TripExpense
        from apps.billing.models import TripExpense
        approved_expenses = TripExpense.objects.filter(trip=self, status='APPROVED').aggregate(
            total=models.Sum('amount')
        )['total'] or 0

        self.cached_expense = approved_expenses
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
