from django.db import models
from core.models import TimeStampedModel, SoftDeleteModel

class ExpenseCategory(models.TextChoices):
    """
    8 danh mục chi phí phát sinh chuẩn theo Bảng Kê Chi Phí thực tế của Triền Võ Logistics.
    """
    LIFT_ON = 'LIFT_ON', 'Nâng'
    LIFT_OFF = 'LIFT_OFF', 'Hạ'
    CONTAINER_DEPOSIT = 'CONTAINER_DEPOSIT', 'Cược cont'
    WEIGHING = 'WEIGHING', 'Cân xe'
    LABOR_STEVEDORING = 'LABOR_STEVEDORING', 'Bốc xếp'
    TOLL_FEE = 'TOLL_FEE', 'Vé cầu đường'
    OTHER = 'OTHER', 'Chi phí khác'
    
    # Backward-compatible choices
    BOT_TOLL = 'BOT_TOLL', 'Vé cầu đường (Cũ)'
    LIFT_ON_OFF = 'LIFT_ON_OFF', 'Phí Nâng / Hạ Cont (Cũ)'
    PORT_STORAGE = 'PORT_STORAGE', 'Phí Lưu Bãi / Neo Xe (Cũ)'
    WAREHOUSE_TIP = 'WAREHOUSE_TIP', 'Phí Bồi Dưỡng Kho (Cũ)'
    STEVEDORING = 'STEVEDORING', 'Cước Phí Bốc Xếp (Cũ)'
    REPAIR_TIRE = 'REPAIR_TIRE', 'Vá vỏ / Sửa chữa gấp (Cũ)'

class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Chờ duyệt'
    APPROVED = 'APPROVED', 'Đã duyệt'
    REJECTED = 'REJECTED', 'Từ chối'
    SETTLED = 'SETTLED', 'Đã chốt sổ Kế toán'

class ExpenseReceiptType(models.TextChoices):
    EINVOICE = 'EINVOICE', 'Hóa đơn điện tử'
    EIR_RECEIPT = 'EIR_RECEIPT', 'Phiếu EIR giao nhận cont'
    TOLL_TICKET = 'TOLL_TICKET', 'Vé cầu đường / BOT'
    WEIGHING_TICKET = 'WEIGHING_TICKET', 'Phiếu cân xe'
    OTHER_RECEIPT = 'OTHER_RECEIPT', 'Chứng từ / Biên lai khác'

# Alias tương thích ngược để không xung đột namespace với documents.DocumentType
DocumentType = ExpenseReceiptType

class TripExpense(TimeStampedModel, SoftDeleteModel):
    """
    Chi phí phát sinh hiện trường theo Bảng Kê Chi Phí thực tế của Triền Võ Logistics.
    Lưu vết đầy đủ hóa đơn điện tử, mã tra cứu, link tra cứu, tiền thuế VAT và ảnh chứng từ.
    """
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, related_name='expenses')
    
    # Chuẩn hoá danh mục chi phí (Sprint 1)
    expense_item = models.ForeignKey(
        'master_data.ExpenseItem',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='trip_expenses',
        help_text="Khoản mục chi phí từ Master Data (Dynamic Catalog)"
    )
    category = models.CharField(max_length=30, choices=ExpenseCategory.choices, default=ExpenseCategory.TOLL_FEE)
    amount = models.DecimalField(max_digits=12, decimal_places=0, help_text="Thành tiền thực thanh toán (đã gồm VAT nếu có)")
    
    # Quản lý Hóa đơn điện tử & Chứng từ đối soát
    document_type = models.CharField(max_length=30, choices=ExpenseReceiptType.choices, default=ExpenseReceiptType.EINVOICE)
    invoice_issuer = models.CharField(max_length=200, blank=True, help_text="Đơn vị phát hành (ICD Tây Nam, VT Anh Phong, AP622...)")
    invoice_number = models.CharField(max_length=50, blank=True, help_text="Số hóa đơn (138001, 0060962...)")
    invoice_lookup_code = models.CharField(max_length=100, blank=True, help_text="Mã tra cứu HĐĐT (HD11202609-06654, QXC39QWL4H9...)")
    invoice_lookup_url = models.CharField(max_length=300, blank=True, help_text="Link tra cứu hóa đơn điện tử")
    
    amount_before_tax = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tiền trước thuế GTGT")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Thuế suất % (vd 8%, 10%)")
    tax_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tiền thuế GTGT")
    
    receipt_image_path = models.CharField(max_length=500, blank=True, help_text="Đường dẫn ảnh chứng từ chụp thực tế")
    ocr_raw_text = models.TextField(blank=True, help_text="Dòng chữ trích xuất từ vé trạm/hóa đơn qua OCR")
    
    status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.APPROVED)
    approved_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm phê duyệt / chốt sổ")
    company_borne = models.BooleanField(default=True, help_text="Công ty chịu (True) hay trừ lương tài xế (False)")
    is_on_behalf_of_customer = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Chi hộ Khách hàng: Công ty ứng chi trước, sau đó quyết toán thu lại từ KH (không tính vào chi phí vận hành)"
    )
    notes = models.CharField(max_length=255, blank=True, help_text="Ghi chú thêm của tài xế hoặc kế toán")

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['trip', 'category']),
            models.Index(fields=['trip', 'expense_item']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['invoice_lookup_code']),
        ]

    def __str__(self):
        chi_ho_label = " [CHI HỘ KH]" if self.is_on_behalf_of_customer else ""
        return f"{self.trip.trip_code} - {self.get_category_display()}: {self.amount:,} đ ({self.get_status_display()}){chi_ho_label}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.trip_id and getattr(self.trip, 'is_expenses_settled', False):
            raise ValidationError("Bảng kê chi phí của chuyến xe này đã được Kế toán chốt sổ. Không thể thêm hoặc sửa chi phí!")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
        # Tự động cập nhật lại P&L chuyến xe
        if self.trip_id:
            self.trip.update_financials()

    def delete(self, *args, **kwargs):
        from django.core.exceptions import ValidationError
        if self.trip_id and getattr(self.trip, 'is_expenses_settled', False):
            raise ValidationError("Bảng kê chi phí đã được Kế toán chốt sổ. Không thể xóa chi phí!")
        super().delete(*args, **kwargs)
        if self.trip_id:
            self.trip.update_financials()
