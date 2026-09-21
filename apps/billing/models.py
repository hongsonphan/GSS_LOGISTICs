from django.db import models
from core.models import TimeStampedModel, SoftDeleteModel

class ExpenseCategory(models.TextChoices):
    BOT_TOLL = 'BOT_TOLL', 'Phí BOT / Cầu đường'
    LIFT_ON_OFF = 'LIFT_ON_OFF', 'Phí Nâng / Hạ Cont'
    PORT_STORAGE = 'PORT_STORAGE', 'Phí Lưu Bãi / Neo Xe'
    WAREHOUSE_TIP = 'WAREHOUSE_TIP', 'Phí Bồi Dưỡng Kho'
    STEVEDORING = 'STEVEDORING', 'Cước Phí Bốc Xếp'
    REPAIR_TIRE = 'REPAIR_TIRE', 'Vá vỏ / Sửa chữa gấp'
    OTHER = 'OTHER', 'Chi phí khác'

class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Chờ duyệt'
    APPROVED = 'APPROVED', 'Đã duyệt'
    REJECTED = 'REJECTED', 'Từ chối'

class TripExpense(TimeStampedModel, SoftDeleteModel):
    """
    Chi phí phát sinh hiện trường do tài xế báo qua App (OCR AI).
    Phải có sự xác nhận của Điều độ trước khi thanh toán.
    """
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, related_name='expenses')
    category = models.CharField(max_length=30, choices=ExpenseCategory.choices, default=ExpenseCategory.BOT_TOLL)
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    receipt_image_path = models.CharField(max_length=500, blank=True)
    
    ocr_raw_text = models.TextField(blank=True, help_text="Dòng chữ trích xuất từ vé trạm/hóa đơn")
    status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    approved_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True)
    company_borne = models.BooleanField(default=True, help_text="Công ty chịu (True) hay trừ tài xế (False)")
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.trip.trip_code} - {self.get_category_display()}: {self.amount:,} đ ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Tự động cập nhật lại P&L chuyến xe
        if self.trip_id:
            self.trip.update_financials()
