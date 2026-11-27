# Nhật ký thay đổi

Tất cả các thay đổi đáng chú ý của dự án GSS TMS sẽ được ghi lại trong tệp này.  
Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/). Nhật ký chi tiết từng ngày nằm ở [docs/CHANGELOG.md](docs/CHANGELOG.md); tệp này ghi các mốc phát hành.

## [Chưa phát hành]

### Added
- **Lưới cont tách 2 cột Hạn DEM | Hạn DET** hiển thị `23:59 dd/mm/yyyy` (nhập được `23:59 21/11/2026` hoặc `21/11/2026`; 2 cột riêng không tự chép DEM sang DET).
- **Hóa đơn cho & Ghi chú tài xế theo từng cont:** lưới cont khi tạo/sửa Booking có thêm cột "Hóa đơn cho" (GPX | KH | Vendor) và "Ghi chú tài xế" (vd. cổng vào); model `BookingContainer.invoice_to`, `driver_note` (migration `gss/0005`), API nhập/sửa/đọc cont trả hai trường. Tin nhắn lệnh điều xe (Zalo cổng nhà xe và `compose_message`) có 2 dòng: `Ghi chú chung` (lưu ý điểm đến + cấm đường/giờ cấm tải của booking) và `Ghi chú cont` (ghi chú tài xế của dòng cont + ghi chú nhà xe); trang tài xế `/q/<token>/` hiển thị ghi chú kèm nút "Xem ghi chú".
- **Tinh chỉnh Form Booking:** Tái cơ cấu layout, loại bỏ trường Tàu/Chuyến không cần thiết, chuẩn hóa dropdown Quy cách Cont nạp động từ CSDL (`master_data.ContainerType`: 10 loại cont ISO), cho phép tiếp nhận đơn hàng trước khi có báo giá/kho đóng hàng/depot trả rỗng (`templates/views/view_booking_detail.html`, `templates/components/modal_booking.html`).
- **Rà soát & Chuẩn hóa toàn diện dữ liệu lịch sử CSDL:** Xây dựng công cụ chuyên dụng `scripts/standardize_existing_data.py` chuẩn hóa mã Khách hàng (`CUS001`, `CUS002`), Mạng lưới Địa điểm (`PRT001`, `PRT002`, `WHS001`, `WHS002`), Thầu phụ Nhà xe (`3PL001` - `3PL005`), Biển số xe/moóc theo Thông tư 24/2023/TT-BCA và mã Chuyến xe `VC.2611.002` (100% dữ liệu đạt chuẩn).
- **Chuẩn hóa hiển thị hạn DEM/DET:** Hiển thị thuần số nguyên (bỏ ký tự 'd') trên toàn bộ các bảng điều vận, vendor và popup.
- **Mở rộng logic lọc booking Sales & Shipments:** API `SalesAPIView` hiển thị thống nhất các đơn hàng mới tạo có ngày đóng hàng sang đầu tháng sau.
- **Rà soát & Đồng bộ 16 tệp tài liệu kỹ thuật (`docs/01` đến `docs/16`):** Chuẩn hóa 100% tài liệu sang mô hình máy 7 bước GSS, PostgreSQL 16 (cấm SQLite3, cấm cổng 8000/8085 cũ), thay thế toàn bộ lệnh test `--keepdb` sang `scripts/qa.py verify`, đảm bảo tài liệu là Single Source of Truth.

- **Đồng bộ tức thời trang Lệnh điều độ và Booking:** `core/live-sync.js` thêm màn `view-dispatch-order` và `view-booking-detail`; chủ đề `dispatch` nay gồm cả `BookingVendorAllocation` và `gss.BookingContainer` (`apps/master_data/signals.py`). Tài xế/nhà xe đổi bước thì bảng cont và thẻ nhà xe tự làm mới (nhịp 5 giây), hoãn khi điều độ viên đang chọn cont hoặc đang ở chế độ Sửa.
- **Cổng nhà xe:** hiện ghi chú booking ("Lưu ý cho tài xế"), cột Số B/L đúng khóa `bl_number`; API cổng trả thêm `booking.notes`; trên điện thoại 4 thẻ thống kê xếp 2x2 gọn và có gợi ý vuốt ngang.

### Changed
- **Đơn giá cước booking chỉ GỢI Ý từ báo giá, không tự điền:** form Booking (trang đầy đủ và modal) hiện gợi ý kèm nút "Áp dụng"; ô giá mặc định để trống thay vì 4.000.000; `POST /api/sales/ create_booking` không còn tự áp giá từ báo giá/biểu cước khi giá = 0 (giá = đúng giá người dùng nhập).
- **Màn tài xế có nút gọi nhanh:** `GET /api/qr/t/<token>/` trả thêm `dispatcher_name`, `dispatcher_phone`, `warehouse_phone` (điều phối viên của chuyến, thiếu thì hotline công ty; số kho giao); `qr_trip.js` hiện nút gọi khi có số.
- **Loại cont theo dòng cont (mục 17):** `build_trip` lấy loại cont từ `BookingContainer.container_type` của đúng dòng (không lấy ô Size của booking); import lưới yêu cầu mỗi dòng có loại khi booking ghi nhiều loại và tự điền khi chỉ 1 loại; ô Size tối đa 4 loại (form và `save_booking`); helper `booking_container_types` ở `apps/customers/models.py`.
- **Form Booking cũ nhận `discharge_date`, `do_expiry`** (`POST /api/sales/`, `PUT/GET /api/bookings/<id>/`).
- **Tin tài xế một nguồn duy nhất:** nút Zalo ở Quản lý Vendor (`vaShareDriverZalo`), sao chép lệnh/mở Zalo ở trang chi tiết chuyến, tạo lệnh mới và phân lại tài xế (`buildDriverZaloMessage` nay lấy từ `/api/gss/trips/<mã>/message/`) đều ra cùng cấu trúc; mẫu cũ "LỆNH ĐIỀU ĐỘNG GIẢI PHÁP XANH - Bác tài…" chỉ còn làm dự phòng khi mất mạng. Tin Zalo gửi nhà xe không còn kèm tên khách hàng.
- **Tin gửi tài xế theo cấu trúc mới (người dùng duyệt 27/11):** `compose_message` (`apps/dispatch/gss_messages.py`) và bản tin trong cổng nhà xe (`vendor_portal.html`) cùng một cấu trúc: `GIẢI PHÁP XANH LOGISTICS`, `Lệnh Vận chuyển`, `Tài xế · SĐT | Xe`, `Thông tin: Số B/L | Cont · loại | Seal`, `Hạn DEM · Hạn DET` (dạng `23:59 dd/mm/yyyy`), `Mặt hàng`, `Giờ hẹn`, `Lộ trình` 3 điểm (kèm `SĐT kho` khi có), khối `Ghi chú` 3 dòng (ghi chú booking; ghi chú điểm đến/cấm đường gồm lưu ý điểm đến, giờ cấm tải và ghi chú tài xế của dòng cont; ghi chú chuyến/cont của chủ vendor), `Điều phối` (điều phối viên của chuyến, thiếu thì hotline công ty), link. Dòng không có dữ liệu thì bỏ (ghi chú) hoặc hiện "—". Bỏ việc lấy SĐT khách hàng thay cho SĐT kho.
- Dòng cont mới thêm ở lưới cont lấy loại cont mặc định theo loại đã chọn ở booking (trước đây luôn 40HC).
- Ô số có giá trị "0" (đơn giá, số chuyến...) chọn hết khi vào ô, gõ số không còn bị chèn trước số 0 (`core/number-input.js`).
- Tiêu đề màn tài xế `/q/<token>/` không còn bị logo đè ở màn 375px (`static/css/gss.css`).
- Khôi phục mặc định loại cont `40HC` trong `BookingOrder.container_size` (migration `customers/0005_restore_booking_container_size_default`).
- Hoàn tất mục 9 trong `docs/12-backlog.md` về chuẩn hóa tài liệu kế thừa.

### Removed
- **Modal tạo nhanh Booking** (`templates/components/modal_booking.html`, `static/js/src/app/sales/booking-modal.js`, `lookupBookingPrice`, `onBookingPriceManualInput`): không còn nơi nào mở modal từ khi có trang Booking đầy đủ; nút Xem ở danh sách gọi thẳng `viewBookingDetail`.

### Fixed
- **Trạng thái lệnh điều độ sai:** `GET /api/bookings/active/` coi booking `COMPLETED` (nghĩa là "đã điều đủ xe") là hoàn thành và đếm chuyến theo trạng thái cũ, nên đơn có chuyến mới đến nơi nhận hiện "Đã hoàn thành". Nay hoàn thành = các chuyến đã `EMPTY_RETURNED`; API trả thêm `trips_running`; danh sách hiện "Đã chia đủ n/n cont · k đang chạy".
- **Tab Theo dõi hành trình đếm sai:** `VendorContainersMonitoringAPIView` dùng mã bước không tồn tại (`EN_ROUTE_PICKUP`, `EN_ROUTE_DELIVERY`, `EMPTY_RETURNING`) nên chuyến đã đến nơi nhận bị tính là "chờ chạy"; nay theo đúng máy 7 bước.
- **Chi tiết chuyến:** hết hiện chữ "null ngày" khi chưa có hạn DET (hiện "Chưa đặt hạn DET"); loại cont lấy từ chuyến (API trả `container_type`) thay vì mặc định "Cont 40".
- **Nhầm nhà xe cùng tên ngắn:** các ô chọn nhà xe ở trang Lệnh điều độ và bộ lọc Theo dõi hành trình hiện kèm mã (vd. `3PL005 · THÀNH ĐẠT`).
- **Phân quyền giao diện chặt hơn:** `access.js` coi thiếu `BIM_ACCESS` là không có quyền; nút Tạo/Xóa/Xuất trong modal ẩn theo quyền của phân hệ (bảng `MODAL_MODULE`). Máy chủ vẫn kiểm tra lại mọi thao tác.
- Đổi tiêu đề cột "Hạn DEM (Bãi)/Hạn DET (Vỏ)" thành "Free DEM/DET (ngày)" vì cột hiển thị số ngày free-time.
- **Tạo booking/báo giá không còn tự gán khách hàng đầu tiên** khi tên khách không nhận ra: trả 400 "Vui lòng chọn khách hàng hợp lệ" (`apps/dispatch/api_views/sales.py`). Trước đây tên sai/typo làm chứng từ gắn nhầm khách.
- Khắc phục lỗi ẩn đơn hàng Booking mới tạo trên màn hình Sales & Shipments khi ngày đóng hàng rơi vào đầu tháng sau (`2026-12-01`).
- Sửa lỗi thẻ HTML trùng lặp và đồng bộ hóa các mốc tiến độ điều vận trên toàn hệ thống.

## [0.2.0] - 2026-11-26
### Added
- Quy chuẩn vận hành Sub-Agent tuần tự qua 5 Cổng Chất Lượng (`.agents/rules/agentic-pipeline-rules.md` & `docs/14-ai-team.md`).
- Bổ sung `PublicIdModel` (UUIDv7 RFC 9562) cho các thực thể giao tiếp đối tác bên ngoài: `Statement`, `DeliveryNote`, `CostClaim`.
- Composite Index `(trip, side)` trên `JobCharge` tối ưu hóa hiệu năng truy vấn đối soát chi phí.
- Migration sạch `apps/gss/migrations/0004_remove_routetemplate_uniq_route_template_code_and_more.py`.
- Bổ sung các quyết định kiến trúc chuẩn quốc tế ADR-006 đến ADR-012 vào `docs/13-architecture-decisions.md`.

### Changed
- Bỏ ràng buộc `unique=True` toàn bảng trên `Statement.code`, `DeliveryNote.code`, `TruckRun.code`; chuyển sang `UniqueConstraint` scoped theo `company` và `is_deleted=False`.
- Chuyển đổi toàn bộ trạng thái trong các bảng dữ liệu ERP sang dạng chữ màu in đậm + icon phẳng, loại bỏ badge bo tròn `rounded-full` trong `trip-expenses.js`, `trip-detail.js`, `transport-order.js`, `vendor-admin.js`, `booking-page/page.js`, `quotation-page.js` sang `rounded-md` phẳng.
- Đồng bộ toàn bộ tài liệu kỹ thuật sang chuẩn stack Django 5.2, PostgreSQL 16 (port 5436/5438) và URL chuẩn `localhost:8086`. Tuyệt đối loại bỏ các tham chiếu SQLite và port 8000/8085.

### Fixed
- Vá các lỗ hổng IDOR trên API kiện hàng (`GssPackageDetailAPIView`, `GssPackageScanAPIView`) và rò rỉ dữ liệu Tenant trong quản lý mẫu in POD (`GssPodTemplatesAPIView`, `GssCustomerPodTemplateAPIView`).
- Sửa lỗi nhân đôi cụm Modal (xóa bỏ 537 dòng code trùng lặp) và sửa lỗi cú pháp typo `</div>>` trong `view_trip_detail.html`. Cân bằng hoàn hảo 285 thẻ mở = 285 thẻ đóng (100% template HTML trong `templates/` đã cân bằng thẻ).
- Chặn lỗ hổng bypass trạng thái tại `TripDetailAPIView.patch()` và đồng bộ `step_status` tại `TripDriverMilestoneAPIView`.

### Security
- Siết chặt kiểm tra `trip__company=request.company` trên toàn bộ API tác nghiệp điều vận và kiện hàng.
- Bổ sung quy định bất khả xâm phạm về Bảo vệ Định danh và Mật khẩu tài khoản theo `RULE[user_global]`.
- Ngăn chặn lộ lọt mã số chứng từ và khóa tự tăng nội bộ giữa các doanh nghiệp.

## [0.1.0] - 2026-11-20
Mốc đầu tiên sau khi làm lại repo sạch (09/11/2026): booking/B/L, phân bổ container cho nhà xe, cổng nhà xe, điều vận 7 bước, QR lệnh tài xế, phân quyền theo tab, nhật ký hoạt động, bảng kê đối soát.
