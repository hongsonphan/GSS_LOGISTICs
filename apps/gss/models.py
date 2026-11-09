"""Mô hình nghiệp vụ GSS bổ sung (đặc tả 08/11/2026 §4) dựng trên lõi đã có.

Ánh xạ khái niệm đặc tả → mã hiện có (quyết định §0.1 kế hoạch: mở rộng DispatchTrip, không dựng lại DB):
- BillOfLading → `BillOfLading` (MBL ◄ HBL, unique theo hãng phát hành + số); Shipment → `customers.BookingOrder`
  (trỏ tới B/L; cảng, tàu, ETA, ngày dỡ, hạn D/O) + `CustomsDeclarationRef`.
- Leg / TruckRun / RouteTemplate → các model cùng tên ở app này (TruckRun chở tối đa `capacity_teu`, mặc định 2 TEU).
- Equipment (danh sách cont của B/L) → `BookingContainer` (mỗi dòng gắn tối đa 1 chuyến).
- TransportJob → `dispatch.DispatchTrip`; VendorAllocation → `dispatch.BookingVendorAllocation`.
- FreeTimeRule, ChargeCode / RateCard / RateLine, JobCharge (mọi dòng bán/mua; proxy JobCost = phía mua), CostClaim (chi hộ), EInvoice, Statement / StatementLine,
  DeliveryNote: mới, ở app này.
Tiền: Decimal(18,2) + mã tiền tệ. Không xoá cứng chứng từ tài chính (SoftDeleteModel); bảng kê đã chốt thì khoá.
"""
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q

from core.models import (AllObjectsManager, CompanyOwnedModel, PublicIdModel, SoftDeleteManager, SoftDeleteModel,
                         TimeStampedModel)

MONEY = dict(max_digits=18, decimal_places=2, default=Decimal('0'))


# ------------------------------------------------------------------ B/L, tờ khai, danh sách cont
class BillOfLading(PublicIdModel, CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Vận đơn. MBL do hãng tàu phát hành; HBL do forwarder phát hành và trỏ lên MBL (master)."""
    KINDS = [('MBL', 'Master B/L'), ('HBL', 'House B/L')]
    kind = models.CharField(max_length=3, choices=KINDS, default='MBL')
    number = models.CharField(max_length=40, db_index=True)
    issuer = models.ForeignKey('master_data.Party', on_delete=models.PROTECT, null=True, blank=True, related_name='+',
                               help_text='Hãng tàu (MBL) hoặc forwarder (HBL) phát hành')
    issuer_name = models.CharField(max_length=100, blank=True, default='', help_text='Tên/mã hãng khi chưa có trong danh mục')
    master = models.ForeignKey('self', on_delete=models.PROTECT, null=True, blank=True, related_name='houses')

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['company', 'issuer', 'kind', 'number'], condition=Q(issuer__isnull=False),
                                    name='uniq_bl_issuer_number'),
            models.UniqueConstraint(fields=['company', 'issuer_name', 'kind', 'number'], condition=Q(issuer__isnull=True),
                                    name='uniq_bl_issuer_name_number'),
        ]

    def __str__(self):
        return f'{self.kind} {self.number}'


class CustomsDeclarationRef(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Số tờ khai hải quan của B/L (chỉ ghi nhận, không kết nối VNACCS). Một B/L có thể nhiều tờ khai."""
    CHANNELS = [('', 'Chưa phân luồng'), ('GREEN', 'Luồng xanh'), ('YELLOW', 'Luồng vàng'), ('RED', 'Luồng đỏ')]
    booking = models.ForeignKey('customers.BookingOrder', on_delete=models.CASCADE, related_name='customs_refs')
    number = models.CharField(max_length=30)
    declared_on = models.DateField(null=True, blank=True)
    channel = models.CharField(max_length=8, choices=CHANNELS, blank=True, default='')
    note = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['id']
        constraints = [models.UniqueConstraint(fields=['booking', 'number'], condition=Q(is_deleted=False), name='gss_customs_ref_unique')]


class BookingContainer(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Một container của B/L (Equipment). Điều vận phân bổ từng dòng cho nhà xe; dòng sinh tối đa một chuyến."""
    booking = models.ForeignKey('customers.BookingOrder', on_delete=models.CASCADE, related_name='containers')
    line_no = models.PositiveIntegerField(default=1)
    container_number = models.CharField(max_length=15, db_index=True, help_text='Chữ hoa, bỏ khoảng trắng/gạch')
    raw_input = models.CharField(max_length=60, blank=True, default='', help_text='Chuỗi nhập gốc')
    iso_valid = models.BooleanField(default=True)
    container_type = models.CharField(max_length=10, blank=True, default='')
    seal_number = models.CharField(max_length=50, blank=True, default='')
    gross_weight_kg = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    # Giao nhiều điểm: mỗi cont có thể có nơi giao riêng (để trống = nơi giao của B/L)
    delivery_loc = models.ForeignKey('master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    delivery_address = models.CharField(max_length=255, blank=True, default='')
    dem_expiry_override = models.DateField(null=True, blank=True)
    det_expiry_override = models.DateField(null=True, blank=True)
    allocation = models.ForeignKey('dispatch.BookingVendorAllocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='containers')
    alloc_line_no = models.PositiveIntegerField(null=True, blank=True, help_text='Số dòng trong phiếu nhà xe')
    trip = models.OneToOneField('dispatch.DispatchTrip', on_delete=models.SET_NULL, null=True, blank=True, related_name='booking_container')
    notes = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['booking_id', 'line_no']
        constraints = [
            models.UniqueConstraint(fields=['booking', 'container_number'], condition=Q(is_deleted=False), name='gss_bc_unique_cont'),
            models.UniqueConstraint(fields=['allocation', 'alloc_line_no'], condition=Q(is_deleted=False, allocation__isnull=False), name='gss_bc_unique_alloc_line'),
        ]

    def __str__(self):
        return f'{self.container_number} ({self.booking_id})'

    @property
    def dem_expiry(self):
        return self.dem_expiry_override or self.booking.dem_expiry

    @property
    def det_expiry(self):
        return self.det_expiry_override or self.booking.det_expiry


class FreeTimeRule(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Quy tắc ngày miễn phí DEM/DET theo hãng tàu, khách hàng, loại cont. Quy tắc khớp cụ thể nhất được dùng."""
    KINDS = [('DEM', 'DEM (lưu bãi cảng)'), ('DET', 'DET (lưu vỏ)')]
    START_EVENTS = [('DISCHARGE', 'Ngày dỡ hàng'), ('ETA', 'Ngày tàu đến (ETA)'), ('PICKUP', 'Ngày lấy cont khỏi cảng'), ('MANUAL', 'Nhập tay')]
    name = models.CharField(max_length=120)
    shipping_line = models.CharField(max_length=50, blank=True, default='', help_text='Để trống = mọi hãng tàu')
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, null=True, blank=True, related_name='+')
    container_type = models.CharField(max_length=10, blank=True, default='', help_text='Để trống = mọi loại cont')
    kind = models.CharField(max_length=3, choices=KINDS)
    free_days = models.PositiveSmallIntegerField()
    start_event = models.CharField(max_length=10, choices=START_EVENTS, default='DISCHARGE')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['kind', 'shipping_line', 'name']


# ------------------------------------------------------------------ biểu giá
class ChargeCode(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    KINDS = [('FREIGHT', 'Cước vận chuyển'), ('SURCHARGE', 'Phụ phí'), ('REIMBURSABLE', 'Chi hộ')]
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=120)
    kind = models.CharField(max_length=12, choices=KINDS, default='FREIGHT')
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('8'), help_text='% VAT (chi hộ thường 0)')
    revenue_account = models.CharField(max_length=10, blank=True, default='')
    cost_account = models.CharField(max_length=10, blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['kind', 'code']
        constraints = [models.UniqueConstraint(fields=['company', 'code'], condition=Q(is_deleted=False), name='gss_charge_code_unique')]

    def __str__(self):
        return f'{self.code} – {self.name}'


class RateCard(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Bảng giá bán (theo khách) hoặc mua (theo nhà xe). Đã duyệt thì không sửa; đổi giá = tạo phiên bản mới."""
    SIDES = [('SELL', 'Giá bán (khách hàng)'), ('BUY', 'Giá mua (nhà xe)')]
    STATUSES = [('DRAFT', 'Nháp'), ('APPROVED', 'Đã duyệt'), ('ARCHIVED', 'Hết hiệu lực')]
    code = models.CharField(max_length=40)
    name = models.CharField(max_length=150)
    side = models.CharField(max_length=4, choices=SIDES)
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    subcontractor = models.ForeignKey('master_data.Subcontractor', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    valid_from = models.DateField()
    valid_to = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=8, choices=STATUSES, default='DRAFT')
    version = models.PositiveIntegerField(default=1)
    previous = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    currency = models.CharField(max_length=3, default='VND')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['side', '-valid_from', 'code']


class RateLine(TimeStampedModel):
    UNITS = [('CONT', 'Cont'), ('TRIP', 'Chuyến'), ('PACKAGE', 'Kiện'), ('TON', 'Tấn'), ('CBM', 'CBM')]
    card = models.ForeignKey(RateCard, on_delete=models.CASCADE, related_name='lines')
    charge_code = models.ForeignKey(ChargeCode, on_delete=models.PROTECT, related_name='+')
    pickup_loc = models.ForeignKey('master_data.Location', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    delivery_loc = models.ForeignKey('master_data.Location', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    route_text = models.CharField(max_length=150, blank=True, default='', help_text='Tuyến / vùng (khớp chứa trong nơi giao) – để trống = mọi tuyến')
    container_type = models.CharField(max_length=10, blank=True, default='', help_text='Để trống = mọi loại cont')
    unit = models.CharField(max_length=8, choices=UNITS, default='CONT')
    unit_price = models.DecimalField(**MONEY)
    auto_apply = models.BooleanField(default=True, help_text='Tự áp khi chuyến hoàn tất')
    notes = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['card_id', 'id']


RateLine.tenant_path = 'card__company'


class JobCharge(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Dòng bán (SELL = JobCharge) / mua (BUY = JobCost) của một chuyến; chụp đơn giá và dòng giá tại thời điểm áp."""
    SIDES = RateCard.SIDES
    SOURCES = [('AUTO', 'Tự áp biểu giá'), ('MANUAL', 'Nhập tay'), ('CLAIM', 'Chi hộ đã duyệt')]
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, related_name='job_lines')
    side = models.CharField(max_length=4, choices=SIDES)
    charge_code = models.ForeignKey(ChargeCode, on_delete=models.PROTECT, related_name='+')
    description = models.CharField(max_length=255, blank=True, default='')
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal('1'))
    unit = models.CharField(max_length=8, default='CONT')
    unit_price = models.DecimalField(**MONEY)
    amount = models.DecimalField(**MONEY)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    currency = models.CharField(max_length=3, default='VND')
    rate_line = models.ForeignKey(RateLine, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    claim = models.OneToOneField('gss.CostClaim', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    source = models.CharField(max_length=6, choices=SOURCES, default='AUTO')
    snapshot = models.JSONField(default=dict, blank=True)
    manual_reason = models.CharField(max_length=255, blank=True, default='')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        ordering = ['trip_id', 'side', 'id']

    @property
    def is_reimbursable(self):
        return self.charge_code.kind == 'REIMBURSABLE'


class _BuyManager(SoftDeleteManager):
    def get_queryset(self):
        return super().get_queryset().filter(side='BUY')


class _BuyAllManager(AllObjectsManager):
    def get_queryset(self):
        return super().get_queryset().filter(side='BUY')


class JobCost(JobCharge):
    """Phía mua (trả nhà xe) của dòng giá chuyến – proxy của JobCharge với side='BUY'."""
    objects = _BuyManager()
    all_objects = _BuyAllManager()

    class Meta:
        proxy = True

    def save(self, *args, **kwargs):
        self.side = 'BUY'
        super().save(*args, **kwargs)


# ------------------------------------------------------------------ chi hộ, hoá đơn
class EInvoice(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Hoá đơn điện tử (nâng/hạ, chi hộ). Một hoá đơn chỉ gắn một chuyến (chống khai trùng); XML là nguồn sự thật."""
    SOURCES = [('MANUAL', 'Nhập tay'), ('QR', 'Đọc mã QR'), ('XML', 'File XML'), ('OCR', 'OCR')]
    STATUSES = [('PENDING', 'Chờ kế toán xác nhận'), ('CONFIRMED', 'Đã xác nhận'), ('REJECTED', 'Từ chối')]
    seller_tax_code = models.CharField(max_length=14)
    seller_name = models.CharField(max_length=255, blank=True, default='')
    series = models.CharField(max_length=12, help_text='Ký hiệu hoá đơn, vd 1C26TAA')
    number = models.CharField(max_length=12)
    issue_date = models.DateField(null=True, blank=True)
    buyer_name = models.CharField(max_length=255, blank=True, default='', help_text='Đứng tên ai')
    buyer_tax_code = models.CharField(max_length=14, blank=True, default='')
    amount_before_vat = models.DecimalField(**MONEY)
    vat_amount = models.DecimalField(**MONEY)
    total_amount = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, default='VND')
    lookup_code = models.CharField(max_length=60, blank=True, default='')
    lookup_url = models.CharField(max_length=255, blank=True, default='')
    source = models.CharField(max_length=6, choices=SOURCES, default='MANUAL')
    raw_qr = models.TextField(blank=True, default='')
    xml_path = models.CharField(max_length=500, blank=True, default='')
    image_path = models.CharField(max_length=500, blank=True, default='')
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, null=True, blank=True, related_name='einvoices')
    status = models.CharField(max_length=10, choices=STATUSES, default='PENDING')
    checks = models.JSONField(default=dict, blank=True, help_text='Kết quả đối chiếu: số tiền, người mua...')
    confirmed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [models.UniqueConstraint(fields=['company', 'seller_tax_code', 'series', 'number'], condition=Q(is_deleted=False),
                                               name='gss_einvoice_unique')]

    def __str__(self):
        return f'{self.series}/{self.number} – {self.seller_tax_code}'


class CostClaim(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Tài xế / nhà xe khai chi phí chi hộ (nâng, hạ...) hoặc phát sinh, kèm ảnh hoá đơn. Kế toán duyệt."""
    PAYERS = [('VENDOR', 'Nhà xe / tài xế nhà xe ứng'), ('COMPANY', 'GSS chi trực tiếp')]
    STATUSES = [('PENDING', 'Chờ duyệt'), ('APPROVED', 'Đã duyệt'), ('REJECTED', 'Từ chối')]
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, related_name='cost_claims')
    charge_code = models.ForeignKey(ChargeCode, on_delete=models.PROTECT, related_name='+')
    amount = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, default='VND')
    description = models.CharField(max_length=255, blank=True, default='')
    payer = models.CharField(max_length=8, choices=PAYERS, default='VENDOR')
    bill_to_customer = models.BooleanField(default=True, help_text='Thu lại của khách (chi hộ)')
    photo_path = models.CharField(max_length=500, blank=True, default='')
    einvoice = models.ForeignKey(EInvoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='claims')
    status = models.CharField(max_length=8, choices=STATUSES, default='PENDING')
    submitted_label = models.CharField(max_length=150, blank=True, default='')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['-created_at']


# ------------------------------------------------------------------ bảng kê đối soát
class Statement(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    SIDES = [('CUSTOMER', 'Bảng kê khách hàng'), ('VENDOR', 'Bảng kê nhà xe')]
    STATUSES = [('DRAFT', 'Nháp'), ('LOCKED', 'Đã chốt'), ('CANCELLED', 'Đã huỷ')]
    code = models.CharField(max_length=30, unique=True)
    side = models.CharField(max_length=8, choices=SIDES)
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    subcontractor = models.ForeignKey('master_data.Subcontractor', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    period_from = models.DateField()
    period_to = models.DateField()
    status = models.CharField(max_length=10, choices=STATUSES, default='DRAFT')
    currency = models.CharField(max_length=3, default='VND')
    totals = models.JSONField(default=dict, blank=True)
    notes = models.CharField(max_length=255, blank=True, default='')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    locked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def party_name(self):
        p = self.customer if self.side == 'CUSTOMER' else self.subcontractor
        return (getattr(p, 'name', '') or '') if p else ''


class StatementLine(TimeStampedModel):
    SECTIONS = [('FREIGHT', 'Cước & phụ phí'), ('REIMBURSABLE', 'Chi hộ')]
    statement = models.ForeignKey(Statement, on_delete=models.CASCADE, related_name='lines')
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, related_name='+')
    job_line = models.ForeignKey(JobCharge, on_delete=models.PROTECT, null=True, blank=True, related_name='statement_lines')
    section = models.CharField(max_length=12, choices=SECTIONS, default='FREIGHT')
    description = models.CharField(max_length=255, blank=True, default='')
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal('1'))
    unit_price = models.DecimalField(**MONEY)
    amount = models.DecimalField(**MONEY)
    vat_amount = models.DecimalField(**MONEY)
    snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['statement_id', 'section', 'id']


StatementLine.tenant_path = 'statement__company'


# ------------------------------------------------------------------ phiếu giao hàng theo điểm giao
class DeliveryNote(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Phiếu giao hàng cho một điểm giao (Stop) của B/L: chụp lại nội dung đã in (mẫu + dữ liệu) và bản scan có chữ ký."""
    code = models.CharField(max_length=30, unique=True)
    booking = models.ForeignKey('customers.BookingOrder', on_delete=models.PROTECT, related_name='delivery_notes')
    stop_label = models.CharField(max_length=255)
    delivery_loc = models.ForeignKey('master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    trips = models.ManyToManyField('dispatch.DispatchTrip', related_name='delivery_notes', blank=True)
    template_code = models.CharField(max_length=40, blank=True, default='')
    html_snapshot = models.TextField()
    data_snapshot = models.JSONField(default=dict, blank=True)
    signed_scan_path = models.CharField(max_length=500, blank=True, default='')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        ordering = ['-created_at']


# ------------------------------------------------------------------ hành trình nhiều chặng (đặc tả §4: Leg, TruckRun, RouteTemplate)
LEG_KINDS = [
    ('PICKUP', 'Lấy cont / hàng'), ('DELIVERY', 'Giao hàng'), ('EMPTY_RETURN', 'Hạ rỗng'),
    ('EMPTY_PICKUP', 'Lấy rỗng'), ('TRANSFER', 'Chuyển bãi / trung chuyển'),
]


class RouteTemplate(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Mẫu tuyến: danh sách chặng chuẩn (vd. Cảng -> Kho khách -> Depot hạ rỗng) để sinh chặng cho chuyến."""
    code = models.CharField(max_length=30)
    name = models.CharField(max_length=150)
    steps = models.JSONField(default=list, blank=True,
                             help_text='[{"kind": "PICKUP", "location_id": 1, "label": "Cảng Cát Lái"}, ...]')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['code']
        constraints = [models.UniqueConstraint(fields=['company', 'code'], name='uniq_route_template_code')]

    def __str__(self):
        return f'{self.code} - {self.name}'


class TruckRun(PublicIdModel, CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Một lượt xe (đầu kéo + rơ-moóc + tài xế) chạy một hoặc nhiều chặng; tổng TEU không vượt sức chở rơ-moóc."""
    STATUSES = [('PLANNED', 'Kế hoạch'), ('RUNNING', 'Đang chạy'), ('DONE', 'Hoàn tất'), ('CANCELLED', 'Huỷ')]
    code = models.CharField(max_length=30, unique=True)
    subcontractor = models.ForeignKey('master_data.Party', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    vehicle = models.ForeignKey('fleet.Vehicle', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    tractor_plate = models.CharField(max_length=20, blank=True, default='')
    trailer_plate = models.CharField(max_length=20, blank=True, default='')
    driver = models.ForeignKey('master_data.SubcontractorDriver', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    driver_name = models.CharField(max_length=100, blank=True, default='')
    driver_phone = models.CharField(max_length=20, blank=True, default='')
    capacity_teu = models.PositiveSmallIntegerField(default=2, help_text='Sức chở của rơ-moóc (TEU)')
    status = models.CharField(max_length=10, choices=STATUSES, default='PLANNED')
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.code


class Leg(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Một chặng của chuyến (TransportJob): đi từ A tới B với một mục đích (lấy, giao, hạ rỗng...)."""
    STATUSES = [('PLANNED', 'Kế hoạch'), ('DONE', 'Đã chạy'), ('SKIPPED', 'Bỏ qua')]
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.CASCADE, related_name='legs')
    seq = models.PositiveSmallIntegerField()
    kind = models.CharField(max_length=14, choices=LEG_KINDS)
    from_loc = models.ForeignKey('master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    to_loc = models.ForeignKey('master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    from_text = models.CharField(max_length=150, blank=True, default='')
    to_text = models.CharField(max_length=150, blank=True, default='')
    truck_run = models.ForeignKey(TruckRun, on_delete=models.SET_NULL, null=True, blank=True, related_name='legs')
    status = models.CharField(max_length=8, choices=STATUSES, default='PLANNED')
    planned_at = models.DateTimeField(null=True, blank=True)
    done_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['trip_id', 'seq']
        constraints = [models.UniqueConstraint(fields=['trip', 'seq'], condition=Q(is_deleted=False),
                                               name='uniq_leg_seq_per_trip')]

    def __str__(self):
        return f'{self.trip_id}#{self.seq} {self.kind}'

