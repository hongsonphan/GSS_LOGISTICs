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

class TripLegChoice(models.TextChoices):
    LEG_1 = 'LEG_1', 'Chặng 1: Lấy cont ➔ Giao kho'
    LEG_2 = 'LEG_2', 'Chặng 2: Móc mooc ➔ Hạ cảng'
    ENTIRE = 'ENTIRE', 'Toàn trình (Chạy thẳng)'
    COMPANY = 'COMPANY', 'Công ty chi chung'

# Alias tương thích ngược để không xung đột namespace với documents.DocumentType
class ReimbursementStatus(models.TextChoices):
    NOT_APPLICABLE = 'NOT_APPLICABLE', 'Không phải chi hộ'
    PENDING = 'PENDING', 'Chờ thu / Chưa gửi Debit Note'
    BILLED = 'BILLED', 'Đã xuất Debit Note'
    COLLECTED = 'COLLECTED', 'Đã thu hồi tiền từ khách'

class TripExpense(TimeStampedModel, SoftDeleteModel):
    """
    Chi phí phát sinh hiện trường theo Bảng Kê Chi Phí thực tế của Triền Võ Logistics.
    Lưu vết đầy đủ hóa đơn điện tử, mã tra cứu, link tra cứu, tiền thuế VAT và ảnh chứng từ.
    Đặc biệt: Ghi nhận chính xác Tài xế & Đầu kéo chịu trách nhiệm chi phí theo từng chặng (Chạy thẳng / Cắt kéo).
    """
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.CASCADE, related_name='expenses')
    driver = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trip_expenses',
        help_text="Tài xế phát sinh chi phí / nhận hoàn ứng tiền"
    )
    vehicle = models.ForeignKey(
        'fleet.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trip_expenses',
        help_text="Đầu kéo phát sinh chi phí"
    )
    trip_leg = models.CharField(
        max_length=20,
        choices=TripLegChoice.choices,
        default=TripLegChoice.ENTIRE,
        help_text="Chặng vận chuyển phát sinh chi phí (Chặng 1 / Chặng 2 / Toàn trình / Công ty)"
    )
    
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
    receipt_image = models.FileField(
        upload_to='receipts/%Y/%m/', null=True, blank=True,
        help_text="Ảnh chụp hóa đơn, biên lai giấy hoặc PDF hóa đơn điện tử cảng"
    )
    receipt_image_path = models.CharField(max_length=500, blank=True, help_text="Đường dẫn ảnh chứng từ chụp thực tế")
    receipt_type = models.CharField(max_length=30, choices=ExpenseReceiptType.choices, default=ExpenseReceiptType.OTHER_RECEIPT)
    document_type = models.CharField(max_length=30, choices=ExpenseReceiptType.choices, default=ExpenseReceiptType.EINVOICE)
    
    invoice_issuer = models.CharField(max_length=200, blank=True, help_text="Đơn vị phát hành (ICD Tây Nam, VT Anh Phong, AP622...)")
    invoice_number = models.CharField(max_length=50, blank=True, help_text="Số hóa đơn (138001, 0060962...)")
    invoice_lookup_code = models.CharField(max_length=100, blank=True, help_text="Mã tra cứu HĐĐT (HD11202609-06654, QXC39QWL4H9...)")
    invoice_lookup_url = models.CharField(max_length=300, blank=True, help_text="Link tra cứu hóa đơn điện tử")
    
    amount_before_tax = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tiền trước thuế GTGT")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Thuế suất % (vd 8%, 10%)")
    tax_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tiền thuế GTGT")
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
    reimbursement_status = models.CharField(
        max_length=20,
        choices=ReimbursementStatus.choices,
        default=ReimbursementStatus.NOT_APPLICABLE,
        db_index=True,
        help_text="Trạng thái thu hồi khoản chi hộ từ khách hàng"
    )
    debit_note_number = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        help_text="Số bảng kê / Debit Note gửi khách hàng gom nhóm (vd: DN-2026-001)"
    )
    reimbursed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Thời điểm xác nhận khách hàng đã hoàn tiền chi hộ"
    )
    reimbursed_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='collected_expenses',
        help_text="Kế toán xác nhận thu hồi tiền chi hộ"
    )
    reimbursement_notes = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ghi chú đối soát thu hồi chi hộ"
    )
    notes = models.CharField(max_length=255, blank=True, help_text="Ghi chú thêm của tài xế hoặc kế toán")

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['trip', 'category']),
            models.Index(fields=['trip', 'expense_item']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['invoice_lookup_code']),
            models.Index(fields=['reimbursement_status']),
            models.Index(fields=['debit_note_number']),
        ]

    @property
    def is_settled(self):
        return self.status == ApprovalStatus.SETTLED or self.reimbursement_status == ReimbursementStatus.COLLECTED

    @property
    def expense_type(self):
        return self.category

    @property
    def expense_name(self):
        if self.expense_item:
            return self.expense_item.name
        return self.get_category_display()

    def __str__(self):
        chi_ho_label = f" [CHI HỘ KH: {self.get_reimbursement_status_display()}]" if self.is_on_behalf_of_customer else ""
        return f"{self.trip.trip_code} - {self.get_category_display()}: {self.amount:,} đ ({self.get_status_display()}){chi_ho_label}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.trip_id and getattr(self.trip, 'is_expenses_settled', False):
            raise ValidationError("Bảng kê chi phí của chuyến xe này đã được Kế toán chốt sổ. Không thể thêm hoặc sửa chi phí!")

    def save(self, *args, **kwargs):
        self.clean()
        if self.is_on_behalf_of_customer and self.reimbursement_status == ReimbursementStatus.NOT_APPLICABLE:
            self.reimbursement_status = ReimbursementStatus.PENDING
        elif not self.is_on_behalf_of_customer:
            self.reimbursement_status = ReimbursementStatus.NOT_APPLICABLE
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


# =========================================================================
# QUẢN LÝ TẠM ỨNG VÀ HOÀN ỨNG 2 CẤP (DISPATCHER FUND & DRIVER ADVANCES)
# =========================================================================

class FundStatus(models.TextChoices):
    PENDING = 'PENDING', 'Chờ duyệt cấp quỹ'
    APPROVED = 'APPROVED', 'Đang lưu hành (Hoạt động)'
    SETTLED = 'SETTLED', 'Đã quyết toán hoàn ứng'
    REJECTED = 'REJECTED', 'Từ chối cấp quỹ'

class DriverAdvanceStatus(models.TextChoices):
    ADVANCED = 'ADVANCED', 'Đang tạm ứng'
    SETTLED = 'SETTLED', 'Đã hoàn ứng quyết toán'
    CANCELLED = 'CANCELLED', 'Đã hủy'

class AdvanceSourceType(models.TextChoices):
    DISPATCHER_FUND = 'DISPATCHER_FUND', 'Trích từ Quỹ Điều vận'
    COMPANY_DIRECT = 'COMPANY_DIRECT', 'Công ty chi trực tiếp'

class SettlementDiffType(models.TextChoices):
    BALANCED = 'BALANCED', 'Khớp đúng (Không chênh lệch)'
    DRIVER_REFUND = 'DRIVER_REFUND', 'Tài xế hoàn lại tiền thừa'
    COMPANY_REIMBURSE = 'COMPANY_REIMBURSE', 'Công ty/Điều vận chi bù thêm'


class DispatcherAdvanceFund(TimeStampedModel, SoftDeleteModel):
    """
    Quỹ Tạm Ứng Cấp 1: Công ty tạm ứng cho Điều vận để phục vụ chi phí đội xe.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Mã phiếu tạm ứng quỹ (TUDV-2026-...)")
    dispatcher = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.PROTECT,
        related_name='dispatcher_advance_funds',
        help_text="Điều phối viên / Trưởng đội xe nhận tiền tạm ứng"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=0, help_text="Số tiền công ty tạm ứng (VNĐ)")
    advance_date = models.DateField(help_text="Ngày tạm ứng")
    purpose = models.CharField(max_length=255, default='Quỹ điều vận tạm ứng chuyến xe & chi phát sinh', help_text="Mục đích tạm ứng quỹ")
    status = models.CharField(max_length=20, choices=FundStatus.choices, default=FundStatus.PENDING, db_index=True)
    
    approved_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_dispatcher_funds',
        help_text="Kế toán / Giám đốc duyệt xuất quỹ"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    settled_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settled_dispatcher_funds',
        help_text="Kế toán duyệt hoàn ứng quyết toán quỹ về cty"
    )
    settled_at = models.DateTimeField(null=True, blank=True)
    settlement_notes = models.TextField(blank=True, help_text="Ghi chú khi quyết toán hoàn ứng về công ty")
    notes = models.TextField(blank=True, help_text="Ghi chú thêm")

    class Meta:
        ordering = ['-advance_date', '-created_at']

    def __str__(self):
        return f"[{self.code}] {self.dispatcher.full_name}: {self.amount:,} đ ({self.get_status_display()})"

    @property
    def total_disbursed(self):
        """Tổng tiền đã cấp cho tài xế từ quỹ này."""
        return sum(a.amount for a in self.trip_advances.filter(is_deleted=False, status__in=['ADVANCED', 'SETTLED']))

    @property
    def total_settled_spent(self):
        """Tổng chi phí thực tế đã gom hoàn ứng về từ các chuyến dùng quỹ này."""
        return sum(a.actual_spent for a in self.trip_advances.filter(is_deleted=False, status='SETTLED'))

    @property
    def total_refunds_returned(self):
        """Tổng tiền tài xế đã trả lại tiền thừa vào quỹ này."""
        return sum(a.refund_amount for a in self.trip_advances.filter(is_deleted=False, status='SETTLED'))

    @property
    def remaining_balance(self):
        """Số dư quỹ điều vận hiện tại = Tiền ứng ban đầu - Tiền đã phát cho tài xế + Tiền tài xế hoàn lại."""
        if self.status != FundStatus.APPROVED:
            return 0
        return self.amount - self.total_disbursed + self.total_refunds_returned


class DriverTripAdvance(TimeStampedModel, SoftDeleteModel):
    """
    Quỹ Tạm Ứng Cấp 2: Tạm ứng theo từng Chuyến xe cho Tài xế để xử lý chi phát sinh hoặc chi hộ.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Mã phiếu tạm ứng chuyến (TUTX-2026-...)")
    trip = models.ForeignKey(
        'dispatch.DispatchTrip',
        on_delete=models.PROTECT,
        related_name='driver_advances',
        help_text="Chuyến xe được cấp tạm ứng"
    )
    driver = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.PROTECT,
        related_name='trip_advances_received',
        help_text="Tài xế nhận tiền tạm ứng"
    )
    dispatcher_fund = models.ForeignKey(
        DispatcherAdvanceFund,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trip_advances',
        help_text="Trích từ Quỹ điều vận (nếu có)"
    )
    advance_source = models.CharField(
        max_length=30,
        choices=AdvanceSourceType.choices,
        default=AdvanceSourceType.DISPATCHER_FUND,
        help_text="Nguồn tiền tạm ứng: Quỹ điều vận hoặc Công ty chi trực tiếp"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=0, help_text="Số tiền tạm ứng cho tài xế (VNĐ)")
    advance_date = models.DateField(help_text="Ngày tài xế nhận tạm ứng")
    purpose = models.CharField(
        max_length=255,
        default='Chi phí cầu đường BOT, nâng hạ, cược cont, kiểm dịch',
        help_text="Mục đích tạm ứng (Phát sinh / Chi hộ)"
    )
    status = models.CharField(
        max_length=20,
        choices=DriverAdvanceStatus.choices,
        default=DriverAdvanceStatus.ADVANCED,
        db_index=True
    )
    
    # Quyết toán / Hoàn ứng
    actual_spent = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Tổng chi phí thực tế tài xế đã chi (gồm cả chi phí cty và chi hộ)"
    )
    settlement_diff_type = models.CharField(
        max_length=30,
        choices=SettlementDiffType.choices,
        default=SettlementDiffType.BALANCED,
        help_text="Loại chênh lệch hoàn ứng: Khớp / Tài xế hoàn tiền thừa / Cty chi bù"
    )
    refund_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Số tiền tài xế hoàn nộp lại (nếu tạm ứng > thực chi)"
    )
    reimburse_amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Số tiền công ty/điều vận chi bù cho tài xế (nếu thực chi > tạm ứng)"
    )
    settled_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm hoàn ứng quyết toán")
    settled_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settled_driver_advances',
        help_text="Kế toán / Điều vận chốt hoàn ứng"
    )
    settlement_notes = models.TextField(blank=True, help_text="Ghi chú đối soát hoàn ứng")
    notes = models.TextField(blank=True, help_text="Ghi chú khi cấp tạm ứng")

    class Meta:
        ordering = ['-advance_date', '-created_at']

    def __str__(self):
        return f"[{self.code}] {self.driver.full_name} ({self.trip.trip_code}): {self.amount:,} đ ({self.get_status_display()})"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.amount <= 0:
            raise ValidationError("Số tiền tạm ứng phải lớn hơn 0 đ!")


# =========================================================================
# SỔ QUỸ THU - CHI & DÒNG TIỀN VẬN TẢI (CASH & BANK BOOK - S03a-DN)
# =========================================================================

class TransactionType(models.TextChoices):
    INFLOW = 'INFLOW', 'Thu tiền vào (+)'
    OUTFLOW = 'OUTFLOW', 'Chi tiền ra (-)'

class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Tiền mặt (Quỹ cty)'
    BANK = 'BANK', 'Tài khoản Ngân hàng'

class CashFlowCategory(models.TextChoices):
    # Dòng thu
    FREIGHT_REVENUE = 'FREIGHT_REVENUE', 'Thu cước vận tải từ khách hàng'
    REIMBURSABLE_COLLECTION = 'REIMBURSABLE_COLLECTION', 'Thu hồi chi hộ (Debit Note)'
    ADVANCE_REFUND = 'ADVANCE_REFUND', 'Thu hoàn ứng tiền thừa (Tài xế/Điều vận)'
    OTHER_INFLOW = 'OTHER_INFLOW', 'Thu khác'
    # Dòng chi
    DISPATCHER_FUND_ADVANCE = 'DISPATCHER_FUND_ADVANCE', 'Chi tạm ứng Quỹ Điều vận'
    DRIVER_TRIP_ADVANCE = 'DRIVER_TRIP_ADVANCE', 'Chi tạm ứng Chuyến xe (Tài xế)'
    ADVANCE_REIMBURSE = 'ADVANCE_REIMBURSE', 'Chi bù vượt ứng (Hoàn ứng tài xế)'
    SUBCONTRACTOR_PAYMENT = 'SUBCONTRACTOR_PAYMENT', 'Chi thanh toán cước Thầu phụ / Xe bạn'
    FUEL_PAYMENT = 'FUEL_PAYMENT', 'Chi mua xăng dầu'
    ETC_TOPUP = 'ETC_TOPUP', 'Chi nạp tiền tài khoản BOT/ETC'
    VEHICLE_MAINTENANCE = 'VEHICLE_MAINTENANCE', 'Chi sửa chữa bảo dưỡng xe'
    PAYROLL_SALARY = 'PAYROLL_SALARY', 'Chi trả lương nhân viên & tài xế'
    OTHER_OUTFLOW = 'OTHER_OUTFLOW', 'Chi phí khác'

class CashTransaction(TimeStampedModel, SoftDeleteModel):
    """
    Sổ Quỹ Thu - Chi Tổng Hợp & Quản Trị Dòng Tiền Vận Tải (Mẫu S03a-DN).
    Ghi nhận minh bạch dòng tiền thực tế qua Quỹ Tiền Mặt và Tài Khoản Ngân Hàng.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Mã phiếu thu/chi (PT-2026-..., PC-2026-...)")
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices, db_index=True)
    payment_method = models.CharField(max_length=10, choices=PaymentMethod.choices, default=PaymentMethod.BANK)
    category = models.CharField(max_length=35, choices=CashFlowCategory.choices, db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=0, help_text="Số tiền giao dịch (VNĐ)")
    transaction_date = models.DateField(db_index=True, help_text="Ngày ghi nhận thu/chi")
    
    partner_type = models.CharField(max_length=30, blank=True, choices=[
        ('CUSTOMER', 'Khách hàng'),
        ('DRIVER', 'Tài xế'),
        ('DISPATCHER', 'Điều phối viên'),
        ('SUBCONTRACTOR', 'Nhà xe bạn / Thầu phụ'),
        ('VENDOR', 'Nhà cung cấp / Trạm BOT / Gara'),
        ('INTERNAL', 'Nội bộ công ty'),
    ])
    partner_name = models.CharField(max_length=150, blank=True, help_text="Tên đối tượng nộp hoặc nhận tiền")
    ref_code = models.CharField(max_length=100, blank=True, db_index=True, help_text="Số chứng từ tham chiếu (Mã chuyến, Mã Debit Note, Mã tạm ứng...)")
    
    bank_name = models.CharField(max_length=100, blank=True, help_text="Tên ngân hàng (nếu thanh toán ngân hàng)")
    bank_account = models.CharField(max_length=50, blank=True, help_text="Số tài khoản ngân hàng")
    
    created_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_cash_transactions',
        help_text="Kế toán lập phiếu thu/chi"
    )
    notes = models.TextField(blank=True, help_text="Diễn giải chi tiết lý do thu/chi")

    class Meta:
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['transaction_type', 'payment_method']),
            models.Index(fields=['category', 'transaction_date']),
            models.Index(fields=['ref_code']),
        ]

    def __str__(self):
        sign = "+" if self.transaction_type == TransactionType.INFLOW else "-"
        return f"[{self.code}] {self.get_payment_method_display()} {sign}{self.amount:,} đ ({self.get_category_display()})"


# =========================================================================
# QUẢN LÝ GIAO DỊCH THƯƠNG MẠI & TÀI CHÍNH QUỐC TẾ (ENTERPRISE BILLING)
# =========================================================================

class SettlementStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Bản nháp'
    CONFIRMED = 'CONFIRMED', 'Đã xác nhận / Đã gửi'
    PARTIAL = 'PARTIAL', 'Thanh toán một phần'
    PAID = 'PAID', 'Đã tất toán'
    CANCELLED = 'CANCELLED', 'Đã hủy'


class CustomerInvoice(TimeStampedModel, SoftDeleteModel):
    """
    Bảng Kê Vận Chuyển & Hóa Đơn Khách Hàng (Accounts Receivable - AR).
    Gom nhiều chuyến xe (DispatchTrip) và các khoản chi hộ trong kỳ đối soát của 1 Khách hàng.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Mã hóa đơn / Bảng kê (INV-2026-..., BK-2026-...)")
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        related_name='customer_invoices',
        help_text="Khách hàng / Chủ hàng đối soát"
    )
    period_start = models.DateField(help_text="Ngày bắt đầu kỳ đối soát")
    period_end = models.DateField(help_text="Ngày kết thúc kỳ đối soát")
    issue_date = models.DateField(auto_now_add=True, help_text="Ngày lập hóa đơn / bảng kê")
    due_date = models.DateField(null=True, blank=True, help_text="Hạn thanh toán công nợ")

    trips = models.ManyToManyField(
        'dispatch.DispatchTrip',
        blank=True,
        related_name='customer_invoices',
        help_text="Danh sách chuyến xe đối soát trong hóa đơn này"
    )

    freight_subtotal = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tổng tiền cước vận tải chưa thuế")
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=8, help_text="Thuế suất GTGT %")
    vat_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tiền thuế GTGT cước")
    reimbursement_total = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tổng tiền chi hộ thu lại (Debit Note)")
    discount_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Chiết khấu thương mại (nếu có)")
    grand_total = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tổng tiền thanh toán cuối cùng (VNĐ)")
    paid_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Số tiền khách hàng đã thanh toán")

    status = models.CharField(max_length=20, choices=SettlementStatus.choices, default=SettlementStatus.DRAFT, db_index=True)
    is_locked = models.BooleanField(default=False, help_text="Đã khóa dữ liệu sau khi gửi khách hàng")

    created_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_customer_invoices',
        help_text="Kế toán công nợ lập bảng kê"
    )
    notes = models.TextField(blank=True, help_text="Ghi chú điều khoản thanh toán")

    class Meta:
        ordering = ['-issue_date', '-created_at']
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['period_start', 'period_end']),
        ]

    def __str__(self):
        return f"[{self.code}] {self.customer.name}: {self.grand_total:,} đ ({self.get_status_display()})"

    @property
    def remaining_balance(self):
        return max(0, self.grand_total - self.paid_amount)


class SubcontractorSettlement(TimeStampedModel, SoftDeleteModel):
    """
    Bảng Kê Đối Soát Nhà Xe Thầu Phụ / Xe Bạn (Accounts Payable - AP).
    Gom các chuyến xe chạy thuê ngoài để chốt công nợ phải trả cho Đối tác 3PL (TK 331).
    """
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Mã quyết toán thầu phụ (DS-TP-2026-...)")
    subcontractor = models.ForeignKey(
        'master_data.Subcontractor',
        on_delete=models.PROTECT,
        related_name='settlements',
        help_text="Nhà xe bạn / Đối tác thầu phụ"
    )
    period_start = models.DateField(help_text="Ngày bắt đầu kỳ đối soát")
    period_end = models.DateField(help_text="Ngày kết thúc kỳ đối soát")

    trips = models.ManyToManyField(
        'dispatch.DispatchTrip',
        blank=True,
        related_name='subcontractor_settlements',
        help_text="Danh sách chuyến xe do thầu phụ này vận chuyển"
    )

    total_freight_cost = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tổng tiền cước thuê thầu phụ")
    advance_deducted = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Số tiền tạm ứng đã chi trước cho thầu phụ")
    other_deductions = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Các khoản trừ khác (phạt, hư hỏng hàng nếu có)")
    payable_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tổng số tiền còn phải trả thầu phụ")
    paid_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Số tiền công ty đã chi trả")

    status = models.CharField(max_length=20, choices=SettlementStatus.choices, default=SettlementStatus.DRAFT, db_index=True)
    is_locked = models.BooleanField(default=False, help_text="Khóa đối soát sau khi chốt")

    created_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_subcontractor_settlements'
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subcontractor', 'status']),
        ]

    def __str__(self):
        return f"[{self.code}] {self.subcontractor.name}: {self.payable_amount:,} đ ({self.get_status_display()})"


class DriverPayrollSettlement(TimeStampedModel, SoftDeleteModel):
    """
    Bảng Chốt Lương Chuyến & Quyết Toán Thu Nhập Tài Xế (Payroll Settlement).
    Cố định số liệu thu nhập sản lượng theo kỳ cho tài xế, trừ các khoản tạm ứng còn tồn.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Mã bảng lương chuyến (LC-TX-2026-...)")
    driver = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.PROTECT,
        related_name='payroll_settlements',
        help_text="Tài xế nhận quyết toán lương chuyến"
    )
    period_start = models.DateField(help_text="Ngày bắt đầu kỳ chốt lương")
    period_end = models.DateField(help_text="Ngày kết thúc kỳ chốt lương")

    trips = models.ManyToManyField(
        'dispatch.DispatchTrip',
        blank=True,
        related_name='driver_payroll_settlements',
        help_text="Các chuyến xe tính lương trong kỳ"
    )

    base_trip_salary = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tổng tiền lương khoán chuyến theo biểu cước")
    overnight_allowance = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tổng phụ cấp neo xe / qua đêm")
    customs_inspection_allowance = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tổng phụ cấp kiểm hóa / chuyển bãi")
    bonus_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tiền thưởng sản lượng / an toàn")
    deductions = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Các khoản trừ (ứng tồn, phạt vi phạm)")
    net_salary = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Thực nhận lương chuyến (VNĐ)")
    paid_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Số tiền công ty đã chi trả")

    status = models.CharField(max_length=20, choices=SettlementStatus.choices, default=SettlementStatus.DRAFT, db_index=True)
    is_locked = models.BooleanField(default=False, help_text="Đã khóa sổ lương")

    created_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_driver_payrolls'
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-period_end', '-created_at']
        indexes = [
            models.Index(fields=['driver', 'status']),
            models.Index(fields=['period_start', 'period_end']),
        ]

    def __str__(self):
        return f"[{self.code}] {self.driver.full_name}: {self.net_salary:,} đ ({self.get_status_display()})"


class DebitNote(TimeStampedModel, SoftDeleteModel):
    """
    Bảng Kê Chi Hộ Riêng Biệt (Debit Note / Phí Nâng Hạ, Cược Cont, Kiểm Hóa).
    Tập hợp các khoản TripExpense có cờ is_on_behalf_of_customer để gửi chủ hàng thu tiền hoàn ứng.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True, help_text="Mã Debit Note (DN-2026-...)")
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.PROTECT,
        related_name='debit_notes',
        help_text="Khách hàng nhận Debit Note"
    )
    issue_date = models.DateField(auto_now_add=True, help_text="Ngày phát hành")
    due_date = models.DateField(null=True, blank=True, help_text="Hạn hoàn tiền")

    expenses = models.ManyToManyField(
        'billing.TripExpense',
        blank=True,
        related_name='parent_debit_notes',
        help_text="Các khoản chi hộ cấu thành Debit Note này"
    )

    total_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Tổng tiền chi hộ cần thu lại (VNĐ)")
    collected_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Số tiền khách hàng đã hoàn trả")
    status = models.CharField(max_length=20, choices=SettlementStatus.choices, default=SettlementStatus.CONFIRMED, db_index=True)

    created_by = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_debit_notes'
    )
    notes = models.TextField(blank=True, help_text="Ghi chú đối soát")

    class Meta:
        ordering = ['-issue_date', '-created_at']
        indexes = [
            models.Index(fields=['customer', 'status']),
        ]

    def __str__(self):
        return f"[{self.code}] {self.customer.name}: {self.total_amount:,} đ ({self.get_status_display()})"


