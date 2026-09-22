# BIM LOGISTICS — DATABASE SCHEMA & ORM ARCHITECTURE
**Tài liệu Đặc tả Cấu trúc Cơ sở Dữ liệu Chuẩn (Triền Võ - BIM Logistics)**

Phiên bản: 1.0  
Ngày cập nhật: 21/09/2026  
Mô hình: Django ORM • Modular Monolith • SQLite3 / PostgreSQL

---

## 1. NGUYÊN TẮC THIẾT KẾ CỐT LÕI

1. **Kế thừa Chuẩn mực:**
   - Mọi model kế thừa `TimeStampedModel` (`created_at`, `updated_at`).
   - Mọi model giao dịch, chứng từ kế thừa `SoftDeleteModel` (`is_deleted=True`, `deleted_at`).
2. **Nguyên tắc No Hard-Delete (Bảo vệ tính toàn vẹn pháp lý):**
   - Không cho phép gọi `.delete()` cứng trên dữ liệu vận đơn, chuyến xe và chi phí.
   - Khi xóa, hệ thống chuyển `is_deleted = True` và lưu vết thời gian.
3. **Bảo vệ Khóa ngoại an toàn (`on_delete=models.PROTECT`):**
   - Các bảng Khách hàng (`Customer`), Tài xế (`Employee`), Xe (`Vehicle`), Chuyến xe (`DispatchTrip`) liên kết với nhau bằng `PROTECT` để chống xóa dây chuyền gây mất dấu vết chứng từ.
4. **Denormalization via Signals (Tối ưu hiệu năng & Chống N+1):**
   - Các trường P&L chuyến (`cached_revenue`, `cached_expense`, `cached_profit`, `cached_margin_percent`) được tính toán và lưu trực tiếp trên bảng `DispatchTrip` mỗi khi chi phí phát sinh được duyệt.
5. **Đánh Index chính xác:**
   - Đánh chỉ mục kép và đơn trên các trường: `trip_code`, `container_number`, `booking_or_bill`, `license_plate`, `status`, `created_at`.

---

## 2. DANH MỤC CÁC PHÂN HỆ & BẢNG DỮ LIỆU

### A. Phân hệ Nền tảng (`core`)
- `core.TrackingEventLog`: Lưu chuỗi sự kiện bất biến (Event Sourcing) cho mọi thay đổi trạng thái, tọa độ GPS và thao tác của điều độ/tài xế.

### B. Phân hệ Nhân sự & Tiền lương (`apps/personnel`)
- `personnel.Employee`: Quản lý toàn bộ nhân viên, phân loại theo `Department` (Điều vận, Đội xe, Kinh doanh, Hải quan, Kế toán, BGD) và chức danh. Lưu trữ số GPLX hạng FC, lương cơ bản, tạm ứng.

### C. Phân hệ Quản lý Đội xe (`apps/fleet`)
- `fleet.Vehicle`: Quản lý đầu kéo, xe tải 10T, xe tải 2T. Lưu trữ thông tin đăng kiểm (`registration_expiry`), định kỳ bảo trì (`next_maintenance_date`), tài xế chỉ định, trạng thái hoạt động (`ACTIVE`, `IDLE`, `MAINTENANCE`).
- `fleet.Trailer`: Quản lý sơ-mi rơ-moóc 40ft, moóc cổ cò, moóc xương.

### D. Phân hệ Danh mục Dùng chung (`apps/master_data`)
- `master_data.Location`: Danh mục cảng biển, ICD, Depot bãi rỗng và Kho nhà máy khách hàng chuẩn hóa (`LocationType`: PORT, ICD, DEPOT, WAREHOUSE, YARD).
- `master_data.ContainerType`: Quy cách container và thùng xe tải (20DC, 40HC, 45G1...), chuẩn hóa hệ số TEU, CBM và tải trọng payload kg.
- `master_data.ExpenseItem`: Danh mục động các khoản mục chi phí phát sinh hiện trường (`ExpenseCategoryGroup`: LIFT_ON, LIFT_OFF, TOLL, DEPOSIT, WEIGHING, LABOR, EINVOICE, OTHER).
- `master_data.DriverSalaryTariff`: Biểu phí lương chuyến tài xế phân nhóm theo khu vực kho và tuyến vận chuyển.
- `master_data.DriverAllowanceCatalog`: Danh mục phụ cấp cảng xa, kiểm hóa và tác nghiệp đặc thù.

### E. Phân hệ Khách hàng & Báo giá (`apps/customers`)
- `customers.Customer`: Danh bạ khách hàng doanh nghiệp, mã số thuế, địa chỉ, người liên hệ.
- `customers.RouteTariff`: Biểu cước theo từng tuyến đường, chuẩn hóa liên kết ForeignKey tới `master_data.Location` (`pickup_loc`, `delivery_loc`, `dropoff_loc`), đơn giá cước xuất hóa đơn và định mức lương chuyến tài xế.
- `customers.Quotation`: Quản lý báo giá và phễu khách hàng (CRM).
- `customers.BookingOrder`: Đơn hàng đặt xe / Booking tiếp nhận từ Sales/CS; chuẩn hóa lộ trình 3 điểm với ForeignKey `master_data.Location`.

### F. Phân hệ Điều độ Vận tải (`apps/dispatch`)
- `dispatch.DispatchTrip`: Bảng hạt nhân điều hành chuyến xe. Chứa toàn bộ thông tin về loại hình (Nhập/Xuất/Nội địa), số Cont, loại Cont/Xe (`45G1`, `40HC`, `40GP`, `22GP`, xe tải `1T` - `15T`), số Seal, Booking/Bill, hạn Cắt Máng CY / Giờ SI, thông tin phiếu EIR (`eir_number`), hãng tàu (`shipping_line`), tên tàu/số chuyến (`vessel_voyage`), cảng đích (`destination_port`), trọng lượng VGM (`vgm_weight`), vị trí bãi cont (`bay_location`), free time lưu cont, 3 điểm lộ trình chuẩn hóa liên kết ForeignKey tới `master_data.Location` (`pickup_loc`, `warehouse_loc`, `dropoff_loc`), các mốc thời gian chuẩn hóa `DateTimeField` (`actual_gate_in_at`, `actual_gate_out_at`), và máy trạng thái 10 bước.
- `dispatch.TripTimelineItem`: Chi tiết các mốc tiến độ thực tế theo thời gian.

### G. Phân hệ Chứng từ Số & OCR (`apps/documents`)
- `documents.TripDocument`: Lưu trữ ảnh chụp phiếu EIR lấy cont, EIR hạ cont, biên bản giao nhận hàng (POD), phiếu cân xe, hóa đơn nâng hạ kèm kết quả nhận diện OCR AI.

### H. Phân hệ Chi phí & Đối chiếu (`apps/billing`)
- `billing.TripExpense`: Chi phí phát sinh hiện trường liên kết trực tiếp tới `master_data.ExpenseItem` (`expense_item`) và tương thích ngược với 8 danh mục Bảng Kê Chi Phí Triền Võ (`category`). Hỗ trợ phân loại chứng từ theo `ExpenseReceiptType` (tránh xung đột với documents app), cờ thu hộ/chi hộ khách hàng `is_on_behalf_of_customer`, lưu trữ đầy đủ metadata hóa đơn điện tử: đơn vị phát hành (`invoice_issuer`), số hóa đơn (`invoice_number`), mã tra cứu (`invoice_lookup_code`), link tra cứu online (`invoice_lookup_url`), tiền trước thuế, thuế suất và tiền thuế GTGT. Tự động tính tổng chi phí và cập nhật P&L chuyến xe.

### I. Phân hệ Xử lý Sự cố (`apps/exceptions`)
- `exceptions.TripException`: Ghi nhận sự cố kẹt cảng, kẹt kho, vỏ cont hư hỏng, va chạm tai nạn kèm mức độ nghiêm trọng và phương án xử lý.
