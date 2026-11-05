from django.db import models
from django.utils import timezone

from core.models import CompanyOwnedModel, SoftDeleteModel, TimeStampedModel


class Yard(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Bãi container / depot (mặc định: Bãi Cont Đắk Nông)."""
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=150)
    address = models.CharField(max_length=255, blank=True)
    capacity = models.PositiveIntegerField(default=0, help_text="Sức chứa (số cont); 0 = không giới hạn")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CargoStatus(models.TextChoices):
    FULL = 'FULL', 'Cont hàng'
    EMPTY = 'EMPTY', 'Cont rỗng'


class MovementStatus(models.TextChoices):
    IN_YARD = 'IN_YARD', 'Đang tồn bãi'
    DEPARTED = 'DEPARTED', 'Đã rời bãi'


class OutPurpose(models.TextChoices):
    DELIVER = 'DELIVER', 'Giao khách'
    RETURN_EMPTY = 'RETURN_EMPTY', 'Kéo về cảng hạ rỗng'
    TRANSFER = 'TRANSFER', 'Chuyển bãi'
    OTHER = 'OTHER', 'Khác'


class DepotContainerMovement(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Một lượt cont vào bãi (Gate-in) và rời bãi (Gate-out). Nguồn sự thật duy nhất cho tồn bãi."""
    yard = models.ForeignKey(Yard, on_delete=models.PROTECT, related_name='movements')
    container_number = models.CharField(max_length=30, db_index=True)
    container_type = models.CharField(max_length=30, blank=True, help_text="20DC, 40HC...")
    shipping_line = models.CharField(max_length=50, blank=True)
    cargo_status = models.CharField(max_length=6, choices=CargoStatus.choices, default=CargoStatus.EMPTY)
    condition_notes = models.CharField(max_length=255, blank=True, help_text="Tình trạng kỹ thuật vỏ")
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.SET_NULL, null=True, blank=True, related_name='depot_movements')
    subcontractor = models.ForeignKey('master_data.Subcontractor', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    status = models.CharField(max_length=10, choices=MovementStatus.choices, default=MovementStatus.IN_YARD, db_index=True)
    gate_in_at = models.DateTimeField(default=timezone.now, db_index=True)
    in_vehicle_plate = models.CharField(max_length=20, blank=True)
    in_trailer_plate = models.CharField(max_length=20, blank=True)
    in_driver_name = models.CharField(max_length=100, blank=True)
    in_driver_phone = models.CharField(max_length=20, blank=True)
    gate_in_by = models.CharField(max_length=150, blank=True)

    gate_out_at = models.DateTimeField(null=True, blank=True, db_index=True)
    out_vehicle_plate = models.CharField(max_length=20, blank=True)
    out_trailer_plate = models.CharField(max_length=20, blank=True)
    out_driver_name = models.CharField(max_length=100, blank=True)
    out_driver_phone = models.CharField(max_length=20, blank=True)
    out_purpose = models.CharField(max_length=14, choices=OutPurpose.choices, blank=True)
    gate_out_by = models.CharField(max_length=150, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-gate_in_at']
        constraints = [
            # Một cont chỉ nằm trong bãi một lần tại một thời điểm
            models.UniqueConstraint(fields=['container_number'], name='uniq_container_in_yard',
                                    condition=models.Q(status='IN_YARD', is_deleted=False)),
        ]
        indexes = [models.Index(fields=['yard', 'status'])]

    def __str__(self):
        return f"{self.container_number} @ {self.yard.name} ({self.get_status_display()})"

    @property
    def storage_days(self):
        end = self.gate_out_at or timezone.now()
        return max(0, (timezone.localtime(end).date() - timezone.localtime(self.gate_in_at).date()).days) + 1


class MovementPhoto(TimeStampedModel):
    movement = models.ForeignKey(DepotContainerMovement, on_delete=models.CASCADE, related_name='photos')
    phase = models.CharField(max_length=3, choices=[('IN', 'Gate-in'), ('OUT', 'Gate-out')], default='IN')
    file_path = models.CharField(max_length=500)
    sequence_no = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['phase', 'sequence_no']


MovementPhoto.tenant_path = 'movement__company'
