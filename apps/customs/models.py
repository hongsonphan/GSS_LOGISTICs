from django.db import models
from django.utils import timezone
from core.models import CompanyOwnedModel, TimeStampedModel, SoftDeleteModel
from apps.customers.models import Customer


class CustomsLane(models.TextChoices):
    GREEN = 'GREEN', 'Luồng Xanh (1) - Tự động thông quan'
    YELLOW = 'YELLOW', 'Luồng Vàng (2) - Kiểm tra hồ sơ'
    RED = 'RED', 'Luồng Đỏ (3) - Kiểm tra thực tế hàng hóa'


class CustomsDeclarationStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Chờ truyền tờ khai'
    SUBMITTED = 'SUBMITTED', 'Đã đăng ký VNACCS'
    PROCESSING = 'PROCESSING', 'Đang thẩm định hồ sơ'
    INSPECTION = 'INSPECTION', 'Kiểm hóa bãi / cảng'
    CLEARED = 'CLEARED', 'Đã thông quan'
    RELEASED = 'RELEASED', 'Đã lấy hàng qua giám sát'
    CANCELLED = 'CANCELLED', 'Hủy tờ khai'


class CustomsDirection(models.TextChoices):
    IMPORT = 'IMPORT', 'Nhập Khẩu'
    EXPORT = 'EXPORT', 'Xuất Khẩu'


class CustomsDeclaration(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """
    Quản lý Tờ Khai Hải Quan Điện Tử (VNACCS/VCIS).
    Phục vụ dịch vụ khai thuê hải quan, theo dõi phân luồng và liên kết chuyến xe/đơn hàng.
    """
    declaration_number = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        verbose_name="Số Tờ Khai VNACCS (12 chữ số)"
    )
    declaration_date = models.DateField(
        default=timezone.now,
        db_index=True,
        verbose_name="Ngày Đăng Ký Tờ Khai"
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='customs_declarations',
        verbose_name="Doanh Nghiệp / Chủ Hàng"
    )
    customs_office_code = models.CharField(
        max_length=20,
        default='02CI',
        verbose_name="Mã Chi Cục Hải Quan",
        help_text="VD: 02CI (Cát Lái), 51CB (Cái Mép), 43BA (Sóng Thần), 02IK (CPN)..."
    )
    customs_office_name = models.CharField(
        max_length=255,
        default='Chi cục HQ Cửa khẩu Cảng Sài Gòn KV4 (Cát Lái)',
        verbose_name="Tên Chi Cục Hải Quan"
    )
    declaration_type = models.CharField(
        max_length=20,
        default='A11',
        verbose_name="Mã Loại Hình VNACCS",
        help_text="VD: A11 (Nhập KDTD), A12 (Nhập SX), B11 (Xuất KD), E21 (Gia công)..."
    )
    direction = models.CharField(
        max_length=10,
        choices=CustomsDirection.choices,
        default=CustomsDirection.IMPORT,
        verbose_name="Chiều Vận Chuyển"
    )
    customs_lane = models.CharField(
        max_length=10,
        choices=CustomsLane.choices,
        default=CustomsLane.GREEN,
        db_index=True,
        verbose_name="Phân Luồng Hải Quan"
    )
    status = models.CharField(
        max_length=20,
        choices=CustomsDeclarationStatus.choices,
        default=CustomsDeclarationStatus.SUBMITTED,
        db_index=True,
        verbose_name="Trạng Thái Tờ Khai"
    )

    # Đối soát Vận tải & Hàng hóa
    bill_of_lading = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="Số Vận Đơn (B/L)"
    )
    container_numbers = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Số Vỏ Container & Chì"
    )

    # Liên kết phân hệ
    booking_order = models.ForeignKey(
        'customers.BookingOrder',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='customs_declarations',
        verbose_name="Đơn Hàng / Booking Vận Tải"
    )
    dispatch_trip = models.ForeignKey(
        'dispatch.DispatchTrip',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='customs_declarations',
        verbose_name="Chuyến Xe Điều Vận"
    )

    # Tài chính Hải quan
    tax_amount_vnd = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name="Thuế XNK & VAT Phải Nộp (VNĐ)"
    )
    is_tax_paid = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Đã Hoàn Tất Nộp Thuế"
    )
    customs_service_fee = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name="Phí Dịch Vụ Khai Thuê HQ (VNĐ)"
    )
    reimbursable_fee = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name="Chi Hộ Kiểm Hóa / Lệ Phí HQ (VNĐ)"
    )

    # Hiện trường & Hồ sơ
    inspection_notes = models.TextField(
        blank=True,
        default='',
        verbose_name="Ghi Chú Phân Luồng / Biên Bản Kiểm Hóa"
    )
    declaration_document = models.FileField(
        upload_to='customs_docs/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Tệp Đính Kèm Tờ Khai Thông Quan"
    )

    class Meta:
        verbose_name = "Tờ Khai Hải Quan"
        verbose_name_plural = "Danh Sách Tờ Khai Hải Quan"
        ordering = ['-declaration_date', '-id']

    def __str__(self):
        return f"{self.declaration_number} ({self.get_customs_lane_display()}) - {self.customer.name}"
