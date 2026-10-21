from django.db import models
from django.utils import timezone
from core.models import TimeStampedModel, SoftDeleteModel

class VehicleType(models.TextChoices):
    TRACTOR = 'TRACTOR', 'Đầu kéo Container'
    TRUCK_10T = 'TRUCK_10T', 'Xe tải 10 Tấn'
    TRUCK_2T = 'TRUCK_2T', 'Xe tải 2 Tấn'
    VAN = 'VAN', 'Xe tải nhỏ / Van'

class VehicleStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Đang chạy (Có hàng)'
    IDLE = 'IDLE', 'Nằm bãi (Chờ việc)'
    MAINTENANCE = 'MAINTENANCE', 'Hư hỏng / Bảo trì'
    DECOMMISSIONED = 'DECOMMISSIONED', 'Ngừng sử dụng'

class VehicleOwnership(models.TextChoices):
    OWNED = 'OWNED', 'Xe nhà (Đội xe công ty)'
    SUBCONTRACTOR = 'SUBCONTRACTOR', 'Xe bạn (Thuê ngoài / 3PL)'

class Vehicle(TimeStampedModel, SoftDeleteModel):
    license_plate = models.CharField(max_length=20, unique=True, db_index=True) # 51C-123.45, 61C-393.29...
    vehicle_type = models.CharField(max_length=20, choices=VehicleType.choices, default=VehicleType.TRACTOR)
    ownership_type = models.CharField(max_length=20, choices=VehicleOwnership.choices, default=VehicleOwnership.OWNED, help_text="Xe nhà hay Xe bạn/3PL")
    subcontractor = models.ForeignKey(
        'master_data.Subcontractor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehicles',
        help_text="Nhà xe / Đơn vị 3PL sở hữu nếu là xe ngoài (SUBCONTRACTOR)"
    )
    brand = models.CharField(max_length=50, blank=True) # Freightliner, Hyundai, Hino...
    payload_capacity_kg = models.IntegerField(default=30000, help_text="Tải trọng cho phép (kg)")
    registration_expiry = models.DateField(null=True, blank=True, help_text="Hạn đăng kiểm định kỳ")
    insurance_expiry = models.DateField(null=True, blank=True, help_text="Hạn bảo hiểm TNDS")
    status = models.CharField(max_length=20, choices=VehicleStatus.choices, default=VehicleStatus.IDLE)
    
    current_driver = models.ForeignKey(
        'personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_vehicles'
    )
    last_maintenance_date = models.DateField(null=True, blank=True)
    next_maintenance_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['license_plate']

    def __str__(self):
        return f"{self.license_plate} ({self.get_vehicle_type_display()})"

    @property
    def is_registration_warning(self):
        """Cảnh báo nếu hạn đăng kiểm dưới 15 ngày hoặc đã quá hạn."""
        if not self.registration_expiry:
            return False
        delta = (self.registration_expiry - timezone.now().date()).days
        return delta <= 15

    @property
    def is_maintenance_warning(self):
        """Cảnh báo đến hạn bảo trì trong vòng 7 ngày hoặc đã quá hạn."""
        if not self.next_maintenance_date:
            return False
        delta = (self.next_maintenance_date - timezone.now().date()).days
        return delta <= 7

class Trailer(TimeStampedModel, SoftDeleteModel):
    license_plate = models.CharField(max_length=20, unique=True, db_index=True) # 51R-444.22
    trailer_type = models.CharField(max_length=30, default='MOOC_XUONG_40', help_text="Moóc xương 40, Moóc cổ cò...")
    brand = models.CharField(max_length=50, blank=True)
    payload_capacity_kg = models.IntegerField(default=32000)
    registration_expiry = models.DateField(null=True, blank=True, help_text="Hạn đăng kiểm định kỳ")
    status = models.CharField(max_length=20, default='IDLE')

    class Meta:
        ordering = ['license_plate']

    def __str__(self):
        return f"Rơ-moóc {self.license_plate}"

    @property
    def is_registration_warning(self):
        """Cảnh báo nếu hạn đăng kiểm dưới 15 ngày hoặc đã quá hạn."""
        if not self.registration_expiry:
            return False
        delta = (self.registration_expiry - timezone.now().date()).days
        return delta <= 15
