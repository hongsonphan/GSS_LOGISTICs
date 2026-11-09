from django.conf import settings
from django.db import models
from django.utils import timezone
from core.models import PublicIdModel, CompanyOwnedModel, TimeStampedModel, SoftDeleteModel

class ShipmentType(models.TextChoices):
    IMPORT = 'IMPORT', 'Hàng Nhập'
    EXPORT = 'EXPORT', 'Hàng Xuất'
    DOMESTIC = 'DOMESTIC', 'Nội Địa / Chuyển Kho'

class TripStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Chờ duyệt / Nháp'
    DISPATCHED = 'DISPATCHED', 'Đã phát lệnh Zalo/App'
    ACCEPTED = 'ACCEPTED', 'Tài xế đã nhận lệnh'
    CONTAINER_PICKED = 'CONTAINER_PICKED', 'Đã lấy Cont / Hàng'
    IN_TRANSIT = 'IN_TRANSIT', 'Đang di chuyển'
    AT_WAREHOUSE = 'AT_WAREHOUSE', 'Đã đến kho khách'
    UNLOADING = 'UNLOADING', 'Đang đóng / Trút hàng'
    DELIVERED = 'DELIVERED', 'Giao nhận thành công (Có POD)'
    RETURNING_EMPTY = 'RETURNING_EMPTY', 'Đang kéo hạ bãi'
    COMPLETED = 'COMPLETED', 'Đã hoàn tất chuyến'
    CANCELLED = 'CANCELLED', 'Đã hủy'

class DispatchTrip(PublicIdModel, CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """
    Bảng hạt nhân của toàn bộ hệ thống điều độ vận tải GSS Logistics.
    Quản lý luồng 10 bước, đối soát chứng từ và lợi nhuận chuyến xe.
    """
    trip_code = models.CharField(max_length=30, unique=True, db_index=True) # GSS-0916-001...
    shipment_type = models.CharField(max_length=15, choices=ShipmentType.choices, default=ShipmentType.IMPORT)
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, related_name='trips')
    booking_order = models.ForeignKey(
        'customers.BookingOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trips',
        help_text="Đơn hàng Booking liên thông từ phân hệ Sale"
    )
    
    # Tài nguyên điều động
    vehicle = models.ForeignKey('fleet.Vehicle', on_delete=models.PROTECT, related_name='trips')
    trailer = models.ForeignKey('fleet.Trailer', on_delete=models.PROTECT, null=True, blank=True, related_name='trips')
    driver = models.ForeignKey('personnel.Employee', on_delete=models.PROTECT, null=True, blank=True, related_name='trips', help_text="Tài xế xe nhà (nội bộ)")
    subcontractor = models.ForeignKey(
        'master_data.Subcontractor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='carrier_trips',
        help_text="Đơn vị 3PL / Nhà xe thầu phụ đảm nhận chuyến"
    )
    subcontractor_driver = models.ForeignKey(
        'master_data.SubcontractorDriver',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trips',
        help_text="Tài xế thầu phụ được gán từ danh bạ 3PL"
    )
    subcontractor_driver_name = models.CharField(max_length=100, blank=True, help_text="Họ tên tài xế ngoài (lưu dự phòng / nhập nhanh)")
    subcontractor_driver_phone = models.CharField(max_length=20, blank=True, help_text="SĐT tài xế ngoài")
    dispatcher = models.ForeignKey('personnel.Employee', on_delete=models.PROTECT, null=True, blank=True, related_name='dispatched_trips')

    # Thông tin Vận đơn & Vỏ Container
    container_number = models.CharField(max_length=30, blank=True, db_index=True) # CAAU5214215XX, BỘT SẮT (CONT 40)...
    seal_number = models.CharField(max_length=50, blank=True)
    container_type = models.CharField(max_length=30, default='40HC') # 40HC, 20DC, Xe tải 10T, Xe tải 2T...
    booking_or_bill = models.CharField(max_length=50, blank=True, db_index=True)
    cutoff_time = models.CharField(max_length=100, blank=True, help_text="Giờ cắt máng / SI")
    freetime_days = models.IntegerField(default=0, help_text="Số ngày lưu cont miễn phí")

    # Lộ trình 3 điểm chuẩn thực tế
    pickup_location = models.CharField(max_length=150, help_text="1. Nơi lấy cont/hàng (Cát Lái, SPITC, TĐÁ...)")
    warehouse_location = models.CharField(max_length=150, help_text="2. Nơi đóng/trả hàng (Kho KH: Tân Vạn, WCA...)")
    dropoff_location = models.CharField(max_length=150, blank=True, help_text="3. Nơi hạ vỏ cont / bãi rỗng")
    
    # FK chuẩn hoá quan hệ tới Master Data Location (Sprint 1)
    pickup_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.PROTECT, null=True, blank=True, related_name='pickup_trips',
        help_text="1. Nơi lấy cont/hàng (Master Data Location)"
    )
    warehouse_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.PROTECT, null=True, blank=True, related_name='warehouse_trips',
        help_text="2. Nơi đóng/trả hàng kho KH (Master Data Location)"
    )
    dropoff_loc = models.ForeignKey(
        'master_data.Location', on_delete=models.SET_NULL, null=True, blank=True, related_name='dropoff_trips',
        help_text="3. Nơi hạ vỏ cont / bãi rỗng (Master Data Location)"
    )
    
    # Chi tiết Bãi/Depot & Kho theo Bảng kê chi phí thực tế
    pickup_depot = models.CharField(max_length=100, blank=True, help_text="Cảng lấy / Depot lấy cont (vd: Tây Nam, AP622)")
    dropoff_depot = models.CharField(max_length=100, blank=True, help_text="Cảng hạ / Depot hạ cont (vd: Cát Lái, Tân Cảng)")
    delivery_warehouse = models.CharField(max_length=150, blank=True, help_text="Kho giao hàng thực tế")

    # Thông tin Chứng từ EIR & Hãng tàu hiện trường
    eir_number = models.CharField(max_length=50, blank=True, help_text="Số phiếu giao nhận Container (EIR No)")
    shipping_line = models.CharField(max_length=50, blank=True, help_text="Hãng tàu (MAE, COS, CMA CGM, ONE...)")
    vessel_voyage = models.CharField(max_length=100, blank=True, help_text="Tên tàu / Số chuyến (USAL-UMM SALAL / 637E)")
    destination_port = models.CharField(max_length=100, blank=True, help_text="Cảng đích (NEWARK, LONG BEACH...)")
    vgm_weight = models.CharField(max_length=50, blank=True, help_text="Trọng lượng VGM (vd 10.93 D26C)")
    bay_location = models.CharField(max_length=50, blank=True, help_text="Vị trí bãi cont")

    # Thông tin Hóa đơn thương mại & Cửa Dock kho theo Excel thực tế
    commercial_invoice = models.CharField(max_length=100, blank=True, help_text="Số Invoice thương mại hàng hóa (VCC33970...)")
    warehouse_dock = models.CharField(max_length=50, blank=True, help_text="Cửa Dock bốc hàng tại kho (D2, DP...)")

    # Cấu hình Chặng Điều Động & Nghiệp vụ Cắt Kéo (Drop & Hook)
    is_split_trip = models.BooleanField(default=False, db_index=True, help_text="Chế độ Cắt Kéo / Cắt Mooc (Tài xế & Đầu kéo chặng lấy và hạ khác nhau)")
    dropoff_driver = models.ForeignKey(
        'personnel.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dropoff_driver_trips',
        help_text="Tài xế hạ cont / Chặng 2 (Cắt kéo - Drop & Hook)"
    )
    dropoff_vehicle = models.ForeignKey(
        'fleet.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dropoff_trips',
        help_text="Xe hạ cont (Cột R Excel / Chặng 2)"
    )
    dropoff_trailer = models.ForeignKey(
        'fleet.Trailer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dropoff_trailer_trips',
        help_text="Rơ-mooc hạ cont (nếu đổi mooc)"
    )
    driver_split_ratio = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=50.00,
        help_text="Tỷ lệ phân chia lương tài xế chặng 1 (%)"
    )
    driver_allowance = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Lương/thù lao tài xế chặng 1 (VNĐ)"
    )
    dropoff_driver_allowance = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Lương/thù lao tài xế chặng 2 hạ cont (VNĐ)"
    )

    cont_location_type = models.CharField(max_length=50, blank=True, default='NHÀ MÁY', help_text="Vị trí cont (NHÀ MÁY, BÃI, CẢNG...)")
    cargo_notes = models.CharField(max_length=255, blank=True, help_text="Lưu ý đóng/hạ cont (Cột T trong Excel)")

    # Nghiệp vụ Chở Ghép 2 Cont 20ft (Twin 20ft Drayage)
    is_twin_container = models.BooleanField(
        default=False, 
        db_index=True, 
        help_text="Chế độ chở ghép 2 container 20ft trên cùng 1 chuyến"
    )
    container_number_2 = models.CharField(
        max_length=50, 
        blank=True, 
        help_text="Số vỏ Container thứ 2 (khi chạy kẹp 20ft)"
    )
    seal_number_2 = models.CharField(
        max_length=50, 
        blank=True, 
        help_text="Số chì / Seal Container thứ 2"
    )
    booking_or_bill_2 = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="Số B/L hoặc Booking của Container thứ 2"
    )
    vgm_weight_2 = models.CharField(
        max_length=50, 
        blank=True, 
        help_text="Trọng lượng VGM cont thứ 2"
    )
    cargo_notes_2 = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Ghi chú hàng hóa cho Container thứ 2"
    )

    # Quản lý Hạn Free-time DEM/DET Cảng & Hãng Tàu
    det_free_days = models.IntegerField(
        default=3, 
        help_text="Số ngày miễn phí mượn vỏ cont (Free DET)"
    )
    dem_free_days = models.IntegerField(
        default=3, 
        help_text="Số ngày miễn phí lưu bãi cảng (Free DEM)"
    )
    det_expiry_date = models.DateField(
        null=True, 
        blank=True, 
        db_index=True, 
        help_text="Hạn cuối trả vỏ cont rỗng không bị phạt (Free DET Expiry)"
    )
    dem_expiry_date = models.DateField(
        null=True, 
        blank=True, 
        db_index=True, 
        help_text="Hạn cuối lưu bãi cảng không bị phạt (Free DEM Expiry)"
    )

    # Giám định Tình trạng Vỏ Cont Hiện trường (EIR / CIR Condition)
    container_condition = models.CharField(
        max_length=50, 
        default='GOOD', 
        choices=[
            ('GOOD', 'Nguyên vẹn / Đạt chuẩn'),
            ('DAMAGED', 'Có hư hỏng từ trước (Lập biên bản)'),
            ('CLEANING_REQUIRED', 'Bẩn / Cần vệ sinh')
        ], 
        help_text="Tình trạng vỏ cont khi nhận tại cảng/depot"
    )
    damage_description = models.TextField(
        blank=True, 
        help_text="Chi tiết hư hỏng vỏ cont (Rách bạt, móp vách, thủng nóc, mục sàn...)"
    )
    booking_file = models.FileField(
        upload_to='booking_files/%Y/%m/', 
        null=True, 
        blank=True, 
        help_text="File Booking / Lệnh cấp cont từ khách hàng (Ảnh hoặc PDF)"
    )

    # Theo dõi chi tiết 5 mốc thời gian tại kho khách hàng (Cột B, C, D, E, F, G, H)
    loading_date = models.DateField(null=True, blank=True, help_text="Ngày hẹn đóng hàng (Cột B)")
    loading_time = models.CharField(max_length=50, blank=True, help_text="Giờ hẹn đóng hàng (Cột C, vd: 8H, 16H30)")
    eta_warehouse_time = models.CharField(max_length=50, blank=True, help_text="Giờ dự kiến đến kho (Cột D)")
    warehouse_call_in_time = models.CharField(max_length=50, blank=True, help_text="Giờ kho gọi xe vào cổng (Cột E)")
    actual_gate_in_time = models.CharField(max_length=50, blank=True, help_text="Giờ xe vào cổng kho thực tế (Cột F)")
    warehouse_call_out_time = models.CharField(max_length=50, blank=True, help_text="Giờ kho gọi kéo cont ra (Cột G)")
    actual_gate_out_time = models.CharField(max_length=50, blank=True, help_text="Giờ xe kéo ra cổng thực tế (Cột H)")

    # 2 Mốc bổ sung thực tiễn: Theo dõi xe chờ hạ cont sau 0h & Hạ bãi thực tế (Mốc 6 & Mốc 7)
    dropoff_appointment_time = models.CharField(max_length=50, blank=True, help_text="Mốc 6: Giờ hẹn hạ bãi / Yêu cầu chờ hạ sau 0h (Cột I)")
    actual_dropoff_time = models.CharField(max_length=50, blank=True, help_text="Mốc 7: Giờ hạ bãi thực tế / Phiếu EIR hạ cont (Cột K)")
    dropoff_appointment_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm hẹn hạ bãi (ISO DateTime)")
    actual_dropoff_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm hạ bãi thực tế (ISO DateTime)")

    # Nghiệp vụ Lưu xe & Lưu cont chờ hạ qua đêm (Overnight Detention & Demurrage)
    is_overnight_detention = models.BooleanField(default=False, db_index=True, help_text="Xác nhận xe lưu đêm / neo chờ hạ sau 0h")
    overnight_wait_hours = models.DecimalField(max_digits=5, decimal_places=1, default=0, help_text="Số giờ neo xe chờ hạ qua đêm")
    detention_fee_customer = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Phụ phí lưu xe / neo cont tính cho khách hàng (VNĐ)")
    detention_driver_allowance = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Phụ cấp lưu đêm cho tài xế trực xe (VNĐ)")
    detention_reason = models.CharField(max_length=255, blank=True, help_text="Lý do neo xe (Chờ mở CY cảng lúc 0h, kho yêu cầu, kẹt tải...)")

    # Mốc thời gian chuẩn hóa DateTimeField (Sprint 1)
    actual_gate_in_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm xe vào cổng kho thực tế (ISO DateTime)")
    actual_gate_out_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm xe kéo ra cổng thực tế (ISO DateTime)")

    planned_start_time = models.DateTimeField(null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)

    # Mốc timestamp chuẩn hóa theo quy trình điều vận 9 bước
    dispatched_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm Điều độ phát lệnh App/Zalo cho tài xế")
    accepted_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm tài xế xác nhận nhận chuyến")
    declined_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm tài xế từ chối chuyến")
    decline_reason = models.CharField(max_length=255, blank=True, default='', help_text="Lý do tài xế từ chối chuyến")
    driver_token = models.CharField(max_length=64, blank=True, default='', db_index=True, help_text="Token bảo mật 1 lần duy nhất cho tài xế hiện tại của chuyến (tự động làm mới khi đổi tài xế)")
    tracking_token = models.CharField(max_length=64, blank=True, default='', db_index=True,
                                      help_text="Token link tra cứu của khách hàng")
    revoked_driver_tokens = models.TextField(blank=True, default='', help_text="Danh sách token cũ của các tài xế trước đã bị thu hồi khi đổi tài xế")
    unloading_started_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm bắt đầu đóng/trút hàng tại dock kho")

    status = models.CharField(max_length=25, choices=TripStatus.choices, default=TripStatus.DRAFT, db_index=True)
    # GSS: dòng điều vận do nhà xe nhập qua Vendor Link (xem apps/dispatch/vendor_service.py)
    vendor_allocation = models.ForeignKey(
        'dispatch.BookingVendorAllocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='trips',
        help_text="Phiếu chia cont cho nhà xe sinh ra dòng này")
    vendor_line_no = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Số thứ tự dòng trong phiếu chia (1..N)")
    vendor_note = models.CharField(max_length=255, blank=True, default='', help_text="Ghi chú của nhà xe")
    # GSS: trạng thái tài xế theo 3 chặng Nhận – Giao – Hạ rỗng (xem apps/dispatch/gss_workflow.py)
    step_status = models.CharField(max_length=24, choices=[
        ('READY', 'Sẵn sàng'), ('ARRIVED_AT_PICKUP', 'Đã đến nơi nhận'), ('LOADED_ON_VEHICLE', 'Đã lên xe'),
        ('ARRIVED_AT_DELIVERY', 'Đã đến nơi giao'), ('UNLOADED', 'Đã hạ xe / giao xong'),
        ('RETURNING_EMPTY', 'Đang đi hạ rỗng'), ('EMPTY_RETURNED', 'Đã hạ rỗng'), ('CANCELLED', 'Đã hủy'),
    ], default='READY', db_index=True)
    arrived_pickup_at = models.DateTimeField(null=True, blank=True)
    loaded_at = models.DateTimeField(null=True, blank=True)
    arrived_delivery_at = models.DateTimeField(null=True, blank=True)
    unloaded_at = models.DateTimeField(null=True, blank=True)
    empty_returning_at = models.DateTimeField(null=True, blank=True)
    empty_returned_at = models.DateTimeField(null=True, blank=True)
    # Street-turn: vỏ sau khi dỡ hàng nhập chuyển thẳng sang booking xuất, chuyến nhập kết thúc không có chặng hạ rỗng
    is_street_turn = models.BooleanField(default=False)
    street_turn_booking = models.ForeignKey('customers.BookingOrder', on_delete=models.SET_NULL, null=True, blank=True, related_name='street_turn_trips')
    street_turn_reason = models.CharField(max_length=255, blank=True, default='')
    return_container_number = models.CharField(max_length=30, blank=True, default='', db_index=True, help_text="Số cont thực tế hạ rỗng (khác số lúc nhận/giao khi đổi vỏ)")
    is_container_swapped = models.BooleanField(default=False)
    container_swap_reason = models.CharField(max_length=255, blank=True, default='')
    qr_version = models.PositiveSmallIntegerField(default=1, help_text="Tăng lên để vô hiệu hóa mã QR đã phát")
    trailer_plate_text = models.CharField(max_length=20, blank=True, default='', help_text="Biển số rơ-moóc nhà xe khai (khi chưa có trong danh mục)")
    special_notes = models.TextField(blank=True, help_text="Lưu ý của điều độ, phí cty chịu...")

    # Bộ đệm tài chính (Cached Denormalization via Signals)
    cached_revenue = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Doanh thu cước")
    cached_expense = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng chi phí phát sinh + lương")
    cached_profit = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Lợi nhuận gộp")
    cached_margin_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Biên lợi nhuận %")

    # Khóa sổ Kế toán & Quản lý Tạm ứng - Hoàn ứng
    is_expenses_settled = models.BooleanField(default=False, help_text="Kế toán đã chốt sổ chi phí (Khóa sửa/xóa)")
    settled_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm chốt sổ chi phí")
    settled_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='settled_trips')
    
    # Trạng thái quyết toán với tài xế theo 3 bước: Đối soát -> Duyệt -> Quyết toán
    driver_settlement_status = models.CharField(
        max_length=20, default='PENDING', db_index=True,
        choices=[
            ('PENDING', 'Chưa quyết toán'),
            ('RECONCILING', 'Đối soát'),
            ('APPROVED', 'Đã duyệt'),
            ('SETTLED', 'Đã quyết toán'),
        ],
        help_text="Trạng thái quyết toán tạm ứng / chi phí với tài xế"
    )
    driver_advance_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Tổng tiền tạm ứng chuyến cho tài xế (VNĐ)")
    advance_settlement_status = models.CharField(
        max_length=20,
        default='NO_ADVANCE',
        choices=[
            ('NO_ADVANCE', 'Chưa tạm ứng'),
            ('ADVANCED', 'Đang tạm ứng'),
            ('SETTLED', 'Đã hoàn ứng quyết toán')
        ],
        help_text="Trạng thái hoàn ứng chuyến"
    )

    # Quyết Toán & Đối Soát Công Nợ Khách Hàng (Customer Settlement & AR Billing)
    is_customer_settled = models.BooleanField(default=False, db_index=True, help_text="Đã đối soát & quyết toán chốt số với khách hàng (Mới tính vào công nợ AR)")
    customer_settlement_status = models.CharField(
        max_length=20, 
        default='PENDING', 
        choices=[
            ('PENDING', 'Chưa quyết toán (Chưa tính công nợ)'),
            ('RECONCILING', 'Đối soát (đã gửi phiếu đối soát cho khách)'),
            ('APPROVED', 'Đã duyệt (lên công nợ)'),
            ('SETTLED', 'Đã quyết toán'),
            ('INVOICED', 'Đã xuất hóa đơn VAT'),
            ('PAID', 'Đã thu đủ tiền')
        ], 
        db_index=True, 
        help_text="Trạng thái quyết toán công nợ khách hàng"
    )
    customer_settled_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm chốt quyết toán với khách hàng")
    customer_settled_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_settled_trips', help_text="Kế toán chốt quyết toán công nợ khách hàng")
    customer_soa_code = models.CharField(max_length=50, blank=True, default='', db_index=True, help_text="Mã đợt/bảng kê đối soát công nợ gửi khách (SOA-YYYYMM-XXXX)")
    vat_invoice_number = models.CharField(max_length=50, blank=True, default='', help_text="Số hóa đơn GTGT / VAT xuất cho khách")
    vat_invoice_date = models.DateField(null=True, blank=True, help_text="Ngày phát hành hóa đơn VAT")
    customer_reconciled = models.BooleanField(default=False, db_index=True, help_text="Alias tương thích ngược cho is_customer_settled")
    customer_reconciled_at = models.DateTimeField(null=True, blank=True, help_text="Thời điểm chốt đối soát với khách hàng")
    customer_reconciled_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='reconciled_trips_customer', help_text="Kế toán chốt đối soát công nợ")



    # Quyết toán & Đối soát Nhà Xe Bạn / Thầu Phụ 3PL (Giai đoạn 2)
    subcontractor_cost = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Cước thỏa thuận trả xe bạn / thầu phụ 3PL (VNĐ)"
    )
    subcontractor_advance = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0,
        help_text="Số tiền cước đã tạm ứng trước cho nhà xe bạn (VNĐ)"
    )
    subcontractor_settlement_status = models.CharField(
        max_length=20,
        default='PENDING',
        choices=[
            ('PENDING', 'Chờ quyết toán'),
            ('RECONCILING', 'Đối soát'),
            ('APPROVED', 'Đã duyệt (lên công nợ phải trả)'),
            ('PARTIAL', 'Thanh toán 1 phần'),
            ('SETTLED', 'Đã quyết toán xong')
        ],
        db_index=True,
        help_text="Tình trạng quyết toán tiền cước với nhà xe bạn"
    )
    subcontractor_settled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Thời điểm kế toán chốt quyết toán cước xe bạn"
    )
    subcontractor_notes = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ghi chú thỏa thuận cước và đối soát xe bạn"
    )

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['vendor_allocation', 'vendor_line_no'], name='uniq_trip_vendor_line',
                condition=models.Q(vendor_allocation__isnull=False, is_deleted=False)),
        ]
        indexes = [
            models.Index(fields=['trip_code', 'status']),
            models.Index(fields=['container_number']),
            models.Index(fields=['booking_or_bill']),
            models.Index(fields=['subcontractor_settlement_status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"[{self.trip_code}] {self.customer.name} - {self.get_status_display()}"

    def regenerate_driver_token(self, save=False):
        """Sinh mới mã token truy cập Driver Portal và vô hiệu hóa hoàn toàn link cũ của tài xế trước."""
        import secrets
        if self.driver_token:
            tokens = [t.strip() for t in (self.revoked_driver_tokens or '').split(',') if t.strip()]
            if self.driver_token not in tokens:
                tokens.append(self.driver_token)
            self.revoked_driver_tokens = ','.join(tokens)
        self.driver_token = secrets.token_urlsafe(16)
        if save and self.pk:
            self.save(update_fields=['driver_token', 'revoked_driver_tokens'])
        return self.driver_token

    def is_driver_portal_expired(self):
        """
        Kiểm tra xem link tài xế đã hết hạn chưa.
        Đối với tài xế, khi chuyến đã hoàn tất (xong bước 10), thì 10 phút sau link sẽ tự động bị vô hiệu.
        """
        if self.status == TripStatus.COMPLETED:
            from django.utils import timezone
            import datetime
            completion_time = self.actual_end_time or self.actual_dropoff_at or self.updated_at
            if completion_time and timezone.now() > completion_time + datetime.timedelta(minutes=10):
                return True
        return False

    def get_driver_portal_seconds_left(self):
        """
        Số giây còn lại trước khi link tài xế tự động bị vô hiệu hóa sau khi hoàn tất.
        Trả về None nếu chuyến chưa hoàn tất.
        """
        if self.status == TripStatus.COMPLETED:
            from django.utils import timezone
            import datetime
            completion_time = self.actual_end_time or self.actual_dropoff_at or self.updated_at
            if completion_time:
                expire_at = completion_time + datetime.timedelta(minutes=10)
                seconds = int((expire_at - timezone.now()).total_seconds())
                return max(0, seconds)
        return None

    def save(self, *args, **kwargs):
        if not self.driver_token:
            import secrets
            self.driver_token = secrets.token_urlsafe(16)
        if not self.tracking_token:
            import secrets
            self.tracking_token = secrets.token_urlsafe(16)
        # Chuẩn hoá mốc giờ: điền cột DateTime còn trống từ cột giờ dạng chữ
        from apps.dispatch.time_utils import fill_missing_datetimes
        filled = fill_missing_datetimes(self)
        update_fields = kwargs.get('update_fields')
        if filled and update_fields is not None:
            kwargs['update_fields'] = list(set(update_fields) | set(filled))
        super().save(*args, **kwargs)

    @property
    def revenue(self):
        """Doanh thu cước vận chuyển của chuyến (tương thích các báo cáo kế toán)."""
        return self.cached_revenue

    @property
    def trip_expenses(self):
        """Alias cho related_name expenses tương thích các module kế toán."""
        return self.expenses

    @property
    def pod_document(self):
        """Chứng từ POD / Phiếu giao nhận của chuyến xe."""
        pod_types = ('POD_RETURN', 'EIR_RECEIPT', 'POD', 'E_POD', 'DELIVERY_NOTE')
        if 'documents' in getattr(self, '_prefetched_objects_cache', {}):
            # đã prefetch_related('documents') -> lọc trong bộ nhớ, không truy vấn thêm
            docs = [d for d in self.documents.all() if d.document_type in pod_types and not d.is_deleted]
            return min(docs, key=lambda d: d.pk) if docs else None
        if hasattr(self, 'documents'):
            return self.documents.filter(document_type__in=pod_types, is_deleted=False).first()
        return None

    @property
    def hashid(self):
        """Mã công khai của chuyến (UUIDv7) dùng trong URL nội bộ."""
        return str(self.public_id) if self.public_id else ''

    @property
    def driver_hashid(self):
        """Token link tài xế (thu hồi khi đổi tài xế)."""
        return self.driver_token

    @property
    def assigned_driver_name(self):
        """Họ tên tài xế phụ trách (Hỗ trợ cả Tài xế xe nhà lẫn Tài xế thầu phụ 3PL)."""
        if self.driver:
            return self.driver.nickname or self.driver.full_name
        if self.subcontractor_driver:
            return self.subcontractor_driver.full_name
        return self.subcontractor_driver_name or "Tài xế xe bạn"

    @property
    def assigned_driver_phone(self):
        """Số điện thoại tài xế nhận lệnh."""
        if self.driver:
            return self.driver.phone_number
        if self.subcontractor_driver:
            return self.subcontractor_driver.phone
        return self.subcontractor_driver_phone or ""

    @property
    def carrier_name(self):
        """Đơn vị vận chuyển (Tên nhà xe 3PL hoặc Đội xe nội bộ)."""
        if self.subcontractor:
            return self.subcontractor.name
        if self.vehicle and getattr(self.vehicle, 'subcontractor', None):
            return self.vehicle.subcontractor.name
        if self.vehicle and self.vehicle.ownership_type == 'SUBCONTRACTOR':
            return "Đơn vị 3PL ngoài"
        return "Đội xe nội bộ GSS"

    @property
    def tracking_hashid(self):
        """Token link tra cứu của khách hàng (khác token tài xế)."""
        return self.tracking_token

    def update_financials(self):
        """Tính toán tự động và cache P&L của chuyến xe."""
        # Lấy cước theo tariff nếu cached_revenue chưa gán
        if self.cached_revenue <= 0:
            tariff = None
            if self.pickup_loc_id and self.warehouse_loc_id:
                tariff = self.customer.tariffs.filter(
                    pickup_loc=self.pickup_loc,
                    delivery_loc=self.warehouse_loc
                ).first()
            if not tariff:
                tariff = self.customer.tariffs.filter(
                    pickup_location__iexact=self.pickup_location,
                    delivery_location__iexact=self.warehouse_location
                ).first()
            if tariff:
                self.cached_revenue = tariff.freight_price

        # Tính tổng chi phí thực tế phát sinh từ bảng TripExpense (loại trừ các khoản bị xóa, từ chối hoặc chi hộ KH)
        from apps.billing.models import TripExpense, ApprovalStatus
        total_expenses = TripExpense.objects.filter(
            trip=self, 
            is_deleted=False,
            is_on_behalf_of_customer=False
        ).exclude(
            status=ApprovalStatus.REJECTED
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0

        self.cached_expense = total_expenses
        self.cached_profit = self.cached_revenue - self.cached_expense
        if self.cached_revenue > 0:
            self.cached_margin_percent = round((self.cached_profit / self.cached_revenue) * 100, 2)
        else:
            self.cached_margin_percent = 0

        self.save(update_fields=['cached_revenue', 'cached_expense', 'cached_profit', 'cached_margin_percent'])

class TripTimelineItem(TimeStampedModel):
    """Chi tiết từng mốc trong 10 bước điều vận thực tế hiển thị trên Timeline."""
    trip = models.ForeignKey(DispatchTrip, on_delete=models.CASCADE, related_name='timeline_items')
    step_number = models.IntegerField()
    title = models.CharField(max_length=200)
    time_display = models.CharField(max_length=50, blank=True)
    is_done = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['step_number']

    def __str__(self):
        return f"{self.trip.trip_code} - Bước {self.step_number}: {self.title}"


class TripContainer(TimeStampedModel):
    """Container của chuyến xe (1 chuyến có 1 hoặc 2 container khi chạy kẹp 20ft).

    Dữ liệu chuẩn hoá từ các cột container_number / container_number_2... của DispatchTrip,
    tự đồng bộ mỗi khi lưu chuyến. Dùng cho tra cứu, báo cáo theo container và tích hợp về sau.
    """
    trip = models.ForeignKey(DispatchTrip, on_delete=models.CASCADE, related_name='containers')
    seq = models.PositiveSmallIntegerField(default=1)
    container_number = models.CharField(max_length=50, blank=True, db_index=True)
    seal_number = models.CharField(max_length=50, blank=True)
    container_type = models.CharField(max_length=30, blank=True)
    booking_or_bill = models.CharField(max_length=100, blank=True, db_index=True)
    vgm_weight = models.CharField(max_length=50, blank=True)
    cargo_notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['trip_id', 'seq']
        constraints = [models.UniqueConstraint(fields=['trip', 'seq'], name='uniq_trip_container_seq')]
        verbose_name = 'Container của chuyến'
        verbose_name_plural = 'Container của chuyến'

    def __str__(self):
        return f"{self.trip_id}#{self.seq} {self.container_number}"


def sync_trip_containers(trip):
    """Ghi lại bảng TripContainer từ các cột container trên DispatchTrip."""
    rows = [{
        'seq': 1, 'container_number': trip.container_number or '', 'seal_number': trip.seal_number or '',
        'container_type': trip.container_type or '', 'booking_or_bill': trip.booking_or_bill or '',
        'vgm_weight': trip.vgm_weight or '', 'cargo_notes': trip.cargo_notes or '',
    }]
    if trip.is_twin_container or trip.container_number_2:
        rows.append({
            'seq': 2, 'container_number': trip.container_number_2 or '', 'seal_number': trip.seal_number_2 or '',
            'container_type': trip.container_type or '', 'booking_or_bill': trip.booking_or_bill_2 or '',
            'vgm_weight': trip.vgm_weight_2 or '', 'cargo_notes': trip.cargo_notes_2 or '',
        })
    for row in rows:
        seq = row.pop('seq')
        TripContainer.objects.update_or_create(trip=trip, seq=seq, defaults=row)
    TripContainer.objects.filter(trip=trip).exclude(seq__in=[1, 2][:len(rows)]).delete()


class AllocationStatus(models.TextChoices):
    PENDING = 'PENDING', 'Chờ nhà xe nhập'
    PARTIAL = 'PARTIAL', 'Nhà xe nhập một phần'
    SUBMITTED = 'SUBMITTED', 'Nhà xe đã nhập đủ'
    LOCKED = 'LOCKED', 'Đã khóa'
    REVOKED = 'REVOKED', 'Đã thu hồi'


class BookingVendorAllocation(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Phiếu chia N container của một Booking cho một nhà xe (thầu phụ).

    Nhà xe truy cập bằng link không mật khẩu /vendor/<token>/. Chỉ lưu băm SHA-256 của token;
    token gốc chỉ hiện một lần lúc tạo / tạo lại link.
    """
    booking = models.ForeignKey('customers.BookingOrder', on_delete=models.PROTECT, related_name='vendor_allocations')
    subcontractor = models.ForeignKey('master_data.Subcontractor', on_delete=models.PROTECT, related_name='allocations')
    allocated_containers = models.PositiveSmallIntegerField(help_text="Số cont giao cho nhà xe")
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=12, choices=AllocationStatus.choices, default=AllocationStatus.PENDING, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    draft_rows = models.JSONField(default=dict, blank=True, help_text="Dòng nhà xe đã nhập nhưng chưa đủ biển số để tạo chuyến: {số dòng: {...}}")
    last_opened_at = models.DateTimeField(null=True, blank=True)
    last_submitted_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['booking_id', 'id']
        verbose_name = 'Phiếu chia cont cho nhà xe'
        verbose_name_plural = 'Phiếu chia cont cho nhà xe'

    def __str__(self):
        return f"{self.booking.booking_code} -> {self.subcontractor.name}: {self.allocated_containers} cont"



class DriverNotificationLog(CompanyOwnedModel, TimeStampedModel):
    """Lịch sử soạn/gửi tin điều lệnh cho tài xế (Zalo, SMS, link cổng tài xế)."""
    CHANNELS = [('ZALO', 'Zalo'), ('SMS', 'SMS'), ('PORTAL_LINK', 'Link cổng tài xế'), ('COPY', 'Sao chép')]
    trip = models.ForeignKey(DispatchTrip, on_delete=models.CASCADE, related_name='driver_messages')
    driver_name = models.CharField(max_length=100, blank=True)
    driver_phone = models.CharField(max_length=20, blank=True)
    channel = models.CharField(max_length=12, choices=CHANNELS, default='COPY')
    message_content = models.TextField()
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    sent_at = models.DateTimeField(default=timezone.now)
    opened_at = models.DateTimeField(null=True, blank=True, help_text="Chỉ có ý nghĩa khi tài xế mở link cổng tài xế/QR")
    # MANUAL: điều vận tự gửi rồi ghi nhận; SENT/FAILED: hệ thống gửi qua cổng (core/messaging.py)
    delivery = models.CharField(max_length=8, default='MANUAL', choices=[('MANUAL', 'Gửi tay'), ('SENT', 'Đã gửi'), ('FAILED', 'Gửi lỗi')])
    delivery_error = models.CharField(max_length=200, blank=True, default='')
    provider_ref = models.CharField(max_length=60, blank=True, default='')

    class Meta:
        ordering = ['-sent_at']

    @property
    def is_read(self):
        return self.opened_at is not None


DriverNotificationLog.tenant_path = 'trip__company'
