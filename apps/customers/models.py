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
    container_size = models.CharField(max_length=20, default='40HC') # 20DC, 40HC, XE_TAI_10T...
    freight_price = models.DecimalField(max_digits=12, decimal_places=0, help_text="Đơn giá cước xuất hóa đơn")
    driver_trip_pay = models.DecimalField(max_digits=12, decimal_places=0, default=500000, help_text="Định mức lương chuyến tài xế")

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
            ('EXPIRED', 'Hết hiệu lực')
        ],
        default='NEGOTIATING'
    )

    @property
    def expected_revenue(self):
        return self.unit_price * self.expected_trips_monthly

    def __str__(self):
        return f"[{self.quotation_code}] {self.customer.name} - {self.route_description}"
