import re
from django.db import models
from django.utils import timezone
from core.models import TimeStampedModel, SoftDeleteModel

def parse_payload_input(val):
    """
    Chuẩn hóa tải trọng theo Sổ Đăng Kiểm Việt Nam (Design / Authorized payload).
    Ví dụ: '30000/27360', '30.000/27.360', '32000', 32000.
    Tự động lọc bỏ các ký tự thừa như '-', '—', 'kg', khoảng trắng.
    Trả về tuple: (payload_capacity_kg, design_payload_kg, payload_display)
    """
    if val is None:
        return 0, None, ''
    
    val_str = str(val).strip()
    val_str = re.sub(r'(?i)\s*kg\s*', '', val_str)
    val_str = val_str.strip().strip('-—').strip()
    
    if not val_str or val_str in ['-', '—']:
        return 0, None, ''

    if '/' in val_str:
        parts = val_str.split('/')
        p1 = re.sub(r'[^\d]', '', parts[0].strip())
        p2 = re.sub(r'[^\d]', '', parts[1].strip())
        try:
            design = int(p1) if p1 else 0
        except ValueError:
            design = 0
        try:
            authorized = int(p2) if p2 else 0
        except ValueError:
            authorized = 0
        
        if design > 0 and authorized > 0:
            disp = f"{design:,}/{authorized:,}".replace(',', '.')
            cap = authorized
        elif design > 0:
            disp = f"{design:,}".replace(',', '.')
            cap = design
        elif authorized > 0:
            disp = f"{authorized:,}".replace(',', '.')
            cap = authorized
        else:
            disp = ''
            cap = 0
            
        return cap, (design if design > 0 else None), disp
    else:
        cleaned = re.sub(r'[^\d]', '', val_str)
        try:
            num = int(cleaned) if cleaned else 0
        except ValueError:
            num = 0
        disp = f"{num:,}".replace(',', '.') if num > 0 else ''
        return num, (num if num > 0 else None), disp

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
    payload_capacity_kg = models.IntegerField(default=30000, help_text="Tải trọng cho phép tham gia giao thông (kg)")
    design_payload_kg = models.IntegerField(null=True, blank=True, help_text="Tải trọng theo thiết kế (kg)")
    payload_display = models.CharField(max_length=50, blank=True, default='', help_text="Tải trọng hiển thị (VD: 30.000/27.360)")
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
    def display_payload(self):
        disp = (self.payload_display or '').strip().strip('-—').strip()
        if disp and disp not in ['—', '-']:
            return disp
        if self.design_payload_kg and self.payload_capacity_kg and self.design_payload_kg != self.payload_capacity_kg:
            return f"{self.design_payload_kg:,}/{self.payload_capacity_kg:,}".replace(',', '.')
        if self.payload_capacity_kg and self.payload_capacity_kg > 0:
            return f"{self.payload_capacity_kg:,}".replace(',', '.')
        return ""

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
    trailer_type = models.CharField(max_length=100, default='Moóc Xương 40ft (3 Trục)', help_text="Moóc xương 40, Moóc cổ cò, Moóc sàn...")
    brand = models.CharField(max_length=50, blank=True)
    payload_capacity_kg = models.IntegerField(default=32000, help_text="Tải trọng cho phép tham gia giao thông (kg)")
    design_payload_kg = models.IntegerField(null=True, blank=True, help_text="Tải trọng theo thiết kế (kg)")
    payload_display = models.CharField(max_length=50, blank=True, default='', help_text="Tải trọng hiển thị (VD: 30.000/27.360)")
    registration_expiry = models.DateField(null=True, blank=True, help_text="Hạn đăng kiểm định kỳ")
    status = models.CharField(max_length=20, default='IDLE')

    class Meta:
        ordering = ['license_plate']

    def __str__(self):
        return f"Rơ-moóc {self.license_plate} ({self.trailer_type})"

    @property
    def display_payload(self):
        disp = (self.payload_display or '').strip().strip('-—').strip()
        if disp and disp not in ['—', '-']:
            return disp
        if self.design_payload_kg and self.payload_capacity_kg and self.design_payload_kg != self.payload_capacity_kg:
            return f"{self.design_payload_kg:,}/{self.payload_capacity_kg:,}".replace(',', '.')
        if self.payload_capacity_kg and self.payload_capacity_kg > 0:
            return f"{self.payload_capacity_kg:,}".replace(',', '.')
        return ""

    @property
    def is_registration_warning(self):
        """Cảnh báo nếu hạn đăng kiểm dưới 15 ngày hoặc đã quá hạn."""
        if not self.registration_expiry:
            return False
        delta = (self.registration_expiry - timezone.now().date()).days
        return delta <= 15
