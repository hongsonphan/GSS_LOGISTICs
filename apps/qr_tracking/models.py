from django.db import models
from django.utils import timezone

from core.models import CompanyOwnedModel, SoftDeleteModel, TimeStampedModel


class PackageStatus(models.TextChoices):
    CREATED = 'CREATED', 'Đã tạo'
    LOADED = 'LOADED', 'Đã lên xe'
    IN_TRANSIT = 'IN_TRANSIT', 'Đang vận chuyển'
    DELIVERED = 'DELIVERED', 'Đã giao'
    DAMAGED = 'DAMAGED', 'Hỏng / rách seal'
    MISSING = 'MISSING', 'Thiếu'


class TripPackageSeal(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Kiện hàng lẻ (LCL) có seal riêng, mỗi kiện một tem QR."""
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, related_name='packages')
    package_code = models.CharField(max_length=40, unique=True)
    package_index = models.PositiveSmallIntegerField(help_text="Kiện thứ i")
    package_total = models.PositiveSmallIntegerField(help_text="Trên tổng N kiện")
    seal_number = models.CharField(max_length=50)
    qr_version = models.PositiveSmallIntegerField(default=1)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cbm = models.DecimalField(max_digits=8, decimal_places=3, default=0)
    recipient_name = models.CharField(max_length=150, blank=True)
    recipient_address = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=12, choices=PackageStatus.choices, default=PackageStatus.CREATED, db_index=True)
    scanned_at_pickup = models.DateTimeField(null=True, blank=True)
    scanned_at_delivery = models.DateTimeField(null=True, blank=True)
    delivered_seal_ok = models.BooleanField(null=True, blank=True, help_text="Seal khi giao có khớp không")
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['trip_id', 'package_index']
        constraints = [
            models.UniqueConstraint(fields=['trip', 'package_index'], condition=models.Q(is_deleted=False),
                                    name='uniq_trip_package_index'),
        ]

    def __str__(self):
        return f"{self.package_code} ({self.package_index}/{self.package_total})"


class QRScanLog(models.Model):
    """Nhật ký quét QR, chỉ thêm, không sửa."""
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    target_type = models.CharField(max_length=8, choices=[('TRIP', 'Lệnh/Cont'), ('PACKAGE', 'Kiện hàng')])
    target_id = models.PositiveIntegerField(db_index=True)
    action = models.CharField(max_length=30)
    result = models.CharField(max_length=10, choices=[('OK', 'OK'), ('WARN', 'Cảnh báo'), ('FAIL', 'Lỗi')], default='OK')
    detail = models.CharField(max_length=255, blank=True)
    actor_label = models.CharField(max_length=150, blank=True)
    ip_address = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['target_type', 'target_id'])]
