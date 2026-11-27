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

### Changed
- Khôi phục mặc định loại cont `40HC` trong `BookingOrder.container_size` (migration `customers/0005_restore_booking_container_size_default`).
- Hoàn tất mục 9 trong `docs/12-backlog.md` về chuẩn hóa tài liệu kế thừa.

### Fixed
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
