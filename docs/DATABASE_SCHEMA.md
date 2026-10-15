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
- `personnel.Employee`: Quản lý hồ sơ nhân sự 360°, CCCD/CMND, MST, BHXH, tài khoản ngân hàng chi lương, phân loại theo `Department` và chức danh `role`. Lưu trữ số GPLX hạng C/FC có cảnh báo hạn 30 ngày, lương cơ bản, lương căn cứ đóng BHXH.
- `personnel.EmployeeDependent`: Người phụ thuộc đăng ký giảm trừ gia cảnh thuế TNCN (4.4tr/người/tháng).
- `personnel.LaborContract`: Hợp đồng lao động (Thử việc, Xác định thời hạn, Không xác định thời hạn, Thời vụ), mức lương, lương BHXH, cảnh báo hạn 30 ngày.
- `personnel.ContractAppendix`: Phụ lục hợp đồng lao động điều chỉnh mức lương, chức danh.
- `personnel.TaxBracket`: Biểu thuế TNCN 7 bậc lũy tiến từng phần kèm số trừ nhanh chuẩn pháp luật Việt Nam.
- `personnel.SalaryDeductionRate`: Tỷ lệ trích nộp bảo hiểm bắt buộc (NLĐ 10.5%, Doanh nghiệp 21.5%, Kinh phí công đoàn 2%).
- `personnel.PayrollPolicyConfig`: Tham số giảm trừ bản thân (11tr), giảm trừ NPT (4.4tr), ngày công tiêu chuẩn (26 ngày), trần BHXH (46.8tr).
- `personnel.PayrollPeriod`: Kỳ tính lương hàng tháng (`YYYY-MM`), vòng đời 4 bước (`DRAFT ➔ REVIEWED ➔ LOCKED ➔ PAID`), liên thông Sổ Quỹ `CashTransaction`.
- `personnel.PayrollSlip`: Phiếu lương cá nhân chi tiết theo động cơ Hybrid Payroll (Lương thời gian, Lương chuyến `DispatchTrip`, Lương cắt kéo, Neo xe, Phụ cấp, Thưởng dầu, BHXH 10.5%, Thuế TNCN 7 bậc, Khấu trừ tạm ứng `DriverTripAdvance`, Thực lĩnh Net).

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
- `customers.BookingOrder`: Đơn hàng đặt xe / Booking tiếp nhận từ Sales/CS; chuẩn hóa lộ trình 3 điểm với ForeignKey `master_data.Location`. Đính kèm tệp tin gốc `booking_file` (`FileField` hỗ trợ PDF/Ảnh $\le 5\text{MB}$ có kiểm tra Magic Bytes và Pillow).

### F. Phân hệ Điều độ Vận tải (`apps/dispatch`)
- `dispatch.DispatchTrip`: Bảng hạt nhân điều hành chuyến xe. Chứa toàn bộ thông tin về loại hình (Nhập/Xuất/Nội địa), số Cont, loại Cont/Xe (`45G1`, `40HC`, `40GP`, `22GP`, `2x20DC`, xe tải `1T` - `15T`), số Seal, Booking/Bill, hạn Cắt Máng CY / Giờ SI, thông tin phiếu EIR (`eir_number`), hãng tàu (`shipping_line`), tên tàu/số chuyến (`vessel_voyage`), cảng đích (`destination_port`), trọng lượng VGM (`vgm_weight`), vị trí bãi cont (`bay_location`), 3 điểm lộ trình chuẩn hóa liên kết ForeignKey tới `master_data.Location` (`pickup_loc`, `warehouse_loc`, `dropoff_loc`), các mốc thời gian chuẩn hóa `DateTimeField` (`actual_gate_in_at`, `actual_gate_out_at`), và máy trạng thái 10 bước.
  - **Tệp tin đính kèm Booking (`booking_file`):** Lưu trữ file booking / lệnh cấp rỗng từ khách hàng hoặc kế thừa từ `BookingOrder`.
  - **Nghiệp vụ Cắt Kéo (Drop & Hook):** `is_split_trip`, `dropoff_driver`, `dropoff_vehicle`, `dropoff_trailer`, `driver_split_ratio`, `driver_allowance`, `dropoff_driver_allowance`.
  - **Nghiệp vụ Chở Ghép 2 Cont 20ft (Twin 20ft Drayage):** `is_twin_container`, `container_number_2`, `seal_number_2`, `booking_or_bill_2`, `vgm_weight_2`, `cargo_notes_2`.
  - **Quản lý Hạn Free DEM/DET & Giám định EIR:** `det_free_days`, `dem_free_days`, `det_expiry_date`, `dem_expiry_date`, `container_condition` (`GOOD`, `DAMAGED`, `CLEANING_REQUIRED`), `damage_description`.
- `dispatch.TripTimelineItem`: Chi tiết các mốc tiến độ thực tế theo thời gian.

### G. Phân hệ Chứng từ Số & OCR (`apps/documents`)
- `documents.TripDocument`: Lưu trữ ảnh chụp phiếu EIR lấy cont, EIR hạ cont, biên bản giao nhận hàng (POD), phiếu cân xe, hóa đơn nâng hạ, và file Booking / Lệnh cấp rỗng (`BOOKING_NOTE`) kèm kết quả nhận diện OCR AI. Tự động sinh bản ghi chứng từ khi chuyến xe có file booking đính kèm.

### H. Phân hệ Chi phí & Đối chiếu (`apps/billing`)
- `billing.TripExpense`: Chi phí phát sinh hiện trường liên kết trực tiếp tới `master_data.ExpenseItem` (`expense_item`) và tương thích ngược với 8 danh mục Bảng Kê Chi Phí Triền Võ (`category`). Hỗ trợ phân loại chứng từ theo `ExpenseReceiptType` (tránh xung đột với documents app), cờ thu hộ/chi hộ khách hàng `is_on_behalf_of_customer`, lưu trữ đầy đủ metadata hóa đơn điện tử: đơn vị phát hành (`invoice_issuer`), số hóa đơn (`invoice_number`), mã tra cứu (`invoice_lookup_code`), link tra cứu online (`invoice_lookup_url`), tiền trước thuế, thuế suất và tiền thuế GTGT. Tự động tính tổng chi phí và cập nhật P&L chuyến xe.
- `billing.DispatcherAdvanceFund`: Quỹ tạm ứng Cấp 1 cấp cho Điều phối viên để điều hành đội xe.
- `billing.DriverTripAdvance`: Quỹ tạm ứng Cấp 2 cấp cho Tài xế theo từng chuyến xe.
- `billing.CashTransaction`: Sổ quỹ dòng tiền Thu - Chi tổng hợp (Mẫu S03a-DN), hỗ trợ thu cước, chi thầu phụ, nạp ETC, tiền mặt và ngân hàng.
- `billing.CustomerInvoice`: Bảng Kê Vận Chuyển & Hóa Đơn Khách Hàng (Accounts Receivable - AR). Gom nhiều chuyến xe (`DispatchTrip`) và các khoản chi hộ trong kỳ đối soát của 1 Khách hàng; quản lý hạn nợ, thuế VAT, tiền đã trả và khóa sổ kế toán.
- `billing.SubcontractorSettlement`: Bảng Kê Đối Soát Nhà Xe Thầu Phụ / Xe Bạn (Accounts Payable - AP). Gom các chuyến xe chạy thuê ngoài để chốt công nợ phải trả cho Đối tác 3PL (TK 331), tự động trừ tạm ứng đã cấp.
- `billing.DriverPayrollSettlement`: Bảng Chốt Lương Chuyến & Quyết Toán Thu Nhập Tài Xế (Payroll Settlement). Cố định thu nhập theo kỳ, lương khoán chuyến, phụ cấp qua đêm, thưởng phạt và trừ tạm ứng tồn.
- `billing.DebitNote`: Bảng Kê Chi Hộ Riêng Biệt (Debit Note). Tập hợp các khoản `TripExpense` có cờ `is_on_behalf_of_customer` để gửi chủ hàng thu tiền hoàn ứng.

### I. Phân hệ Xử lý Sự cố (`apps/exceptions`)
- `exceptions.TripException`: Ghi nhận sự cố kẹt cảng, kẹt kho, vỏ cont hư hỏng, va chạm tai nạn kèm mức độ nghiêm trọng và phương án xử lý.

