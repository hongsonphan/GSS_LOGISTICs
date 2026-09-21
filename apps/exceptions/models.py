from django.db import models
from core.models import TimeStampedModel, SoftDeleteModel

class ExceptionType(models.TextChoices):
    PORT_CONGESTION = 'PORT_CONGESTION', 'Kẹt Cảng / Kẹt Bãi'
    WAREHOUSE_DELAY = 'WAREHOUSE_DELAY', 'Kho không nhận / Kẹt Kho'
    DAMAGED_CONTAINER = 'DAMAGED_CONTAINER', 'Vỏ Cont Hư Hỏng (Thủng/Rách/Bẩn)'
    TRAFFIC_ACCIDENT = 'TRAFFIC_ACCIDENT', 'Va chạm / Tai nạn giao thông'
    VEHICLE_BREAKDOWN = 'VEHICLE_BREAKDOWN', 'Xe hỏng hóc giữa đường'
    OTHER = 'OTHER', 'Sự cố khác'

class ExceptionSeverity(models.TextChoices):
    LOW = 'LOW', 'Nhẹ (Không ảnh hưởng tiến độ)'
    MEDIUM = 'MEDIUM', 'Trung bình (Chậm trễ 1-3 giờ)'
    HIGH = 'HIGH', 'Nghiêm trọng (Cắt máng, Hỏng hàng)'
    CRITICAL = 'CRITICAL', 'Khẩn cấp (Tai nạn, Đền bù)'

class TripException(TimeStampedModel, SoftDeleteModel):
    """Ghi nhận sự cố bất thường theo Bước 9 của Quy trình Điều Vận."""
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, related_name='exceptions')
    exception_type = models.CharField(max_length=30, choices=ExceptionType.choices, default=ExceptionType.PORT_CONGESTION)
    severity = models.CharField(max_length=20, choices=ExceptionSeverity.choices, default=ExceptionSeverity.MEDIUM)
    description = models.TextField()
    evidence_image_path = models.CharField(max_length=500, blank=True)
    reported_by = models.ForeignKey('personnel.Employee', on_delete=models.PROTECT, related_name='reported_exceptions')
    resolution_note = models.TextField(blank=True, help_text="Phương án giải quyết từ điều độ")
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_exception_type_display()}] {self.trip.trip_code} ({self.get_severity_display()})"
