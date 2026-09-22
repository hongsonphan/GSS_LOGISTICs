# CHANGELOG — BIM LOGISTICS PLATFORM

Tất cả các thay đổi kiến trúc và mã nguồn được ghi nhận theo chuẩn Documentation-as-Code.

## [1.6.3] - 2026-09-22 (Chuẩn Hóa & Tối Ưu Hóa Giao Diện Dashboard Ban Giám Đốc — Executive Command Center)

### 1. Tối Giản Header & Loại Bỏ Thông Tin Thừa (Header Simplification):
- **Loại bỏ dải banner phụ cấp trên:** Gỡ bỏ hoàn toàn dòng badge `[BAN GIÁM ĐỐC (BGD)] | EXECUTIVE COMMAND CENTER • TMS & CUSTOMS | • OTD SLA: 98.2%` để phần đầu trang tinh gọn, tập trung ngay vào tiêu đề và mô tả chính của Dashboard.
- **Tiêu đề phân tích chuẩn mực:** Đổi tên thẻ phân tích thành **"Phân tích Hiệu suất Chuyến xe"** và lược bỏ dòng mô tả phụ không cần thiết (*"Nhấp chuột vào bất kỳ chuyến xe nào để xem ngay Hồ sơ chuyến..."*), giải phóng thêm khoảng trống quý giá cho phần hiển thị dữ liệu bảng.

### 2. Tái Cân Bằng Tỷ Lệ & Tăng Mật Độ Dữ Liệu Dashboard (Harmonized Proportions & High Data Density):
- **Thu gọn KPI Cards & Biểu đồ BI:**
  - Tối ưu khoảng cách tổng thể (`space-y-4`, padding `p-4 md:p-5`), giảm padding các thẻ KPI xuống `p-4` để cân đối nhịp thị giác.
  - Điều chỉnh chiều cao khung biểu đồ xu hướng doanh thu/chi phí xuống `h-[195px]` và biểu đồ donut xuống `h-[165px]`. Do Chart.js hỗ trợ `maintainAspectRatio: false`, biểu đồ tự động co giãn sắc nét mà không bị méo tỷ lệ.
- **Tối đa hóa số lượng dòng hiển thị tại Bảng Hiệu Suất P&L Chuyến Xe:**
  - Nâng giới hạn API trả về từ `8` lên `20` chuyến xe gần nhất (`apps/dispatch/api_views.py`).
  - Áp dụng triệt để **Bim Enterprise Table Standard** cho bảng phân tích hiệu suất chuyến (`static/js/app.js` & `templates/views/view_dashboard.html`):
    - Padding ô dữ liệu `py-1.5 px-3`, phân cách cột dọc rõ nét `border-r border-slate-200/70`.
    - Text tiêu đề/tên khách hàng/tài xế: `text-[13px] font-bold text-slate-900`.
    - Subtext tuyến đường/biển số: `text-[11.5px] text-slate-500 mt-0.5`.
    - Các ô số tiền (Doanh thu, Chi phí, Lợi nhuận): `font-mono tabular-nums text-[13px]`.
    - Thanh biên lợi nhuận thu gọn `w-12 h-1.5`, nút thao tác `py-0.5 px-2 text-[11px]`.
  - Khung bảng có thanh cuộn mượt `max-h-[520px] overflow-y-auto` với `sticky top-0 thead`, cho phép hiển thị đồng thời từ 8 - 10 dòng trên một màn hình chuẩn mà không cần cuộn trang và xem dễ dàng toàn bộ 20 dòng.

---

## [1.6.2] - 2026-09-22 (Chuẩn Hóa Toàn Cục UI/UX Bảng Dữ Liệu Enterprise — BIM Table Standard)

### 1. Chuẩn Hóa Typography & Kích Thước Bảng Doanh Nghiệp (Bim Enterprise Table Standard):
- **Phân loại dòng bảng hai cấp độ (Dual-Density Architecture):**
  - **Dòng dữ liệu đơn (Single-line Rows - Danh Mục Master Data):** Chiều cao cố định `34px - 36px`, padding ô dữ liệu `py-1.5 px-3` (`padding: 6px 12px`), font chữ chính `13px` (`text-[13px] text-slate-900`), hiển thị trọn vẹn 20 dòng trên 1 màn hình chuẩn như bảng tính Excel.
  - **Dòng dữ liệu đa tầng (Multiline Rows - Điều Vận & Bảng Kê Chi Phí):** Chiều cao cố định `46px - 48px`, padding ô `py-2 px-3`, giảm triệt để khoảng cách giữa text chính và sub-text xuống `mt-0.5` (2px, `line-height: 1.25`) thay cho khoảng cách loãng trước đây. Font tiêu đề: `text-[13px] font-bold text-slate-900`, Subtext: `text-[11.5px] font-medium text-slate-500`.
- **Tiêu đề bảng (Sticky Header `<th>`):** Chiều cao cố định `36px`, nền `#f2f5f8`, font `12.5px font-bold text-slate-700 uppercase tracking-wider`, viền đáy `border-b border-slate-300`, đường chia cột dọc `border-r border-slate-200/90`.

### 2. Loại Bỏ Hoàn Toàn Tên Thương Hiệu Bên Thứ Ba:
- Đổi toàn bộ các class và bình luận từ thương hiệu ngoài sang định danh bản quyền của hệ thống: `.btn-bim-primary`, `.btn-bim-secondary`, `.bim-table`, `.erp-table`.
- Cập nhật chuẩn giao diện kế toán trong các thông báo và modal.

### 3. Đồng Bộ Hóa Hệ Thống Mã Nguồn & Tài Liệu:
- Cập nhật `static/css/main.css`: Thiết lập bộ CSS Tokens `--font-body-main: 13px;`, `--font-body-sub: 11.5px;`, `.erp-table`, `.bim-table`, `.row-multiline`.
- Cập nhật `static/js/app.js`: Đồng bộ toàn bộ 8 tabs Danh mục cài đặt (`renderMasterDataTable`), Bảng chuyến điều vận (`renderTripsTable`), và Bảng kê chi phí (`renderCostSheetTable`).
- Cập nhật `templates/`: Bổ sung `.erp-table` và điều chỉnh `<th>` trên `view_master_data.html`, `view_dispatch.html`, `view_trip_detail.html`.
- Cập nhật tài liệu kỹ thuật: Thêm phần **VI. QUY CHUẨN TRÌNH BÀY BẢNG DỮ LIỆU ENTERPRISE (BIM TABLE STANDARD)** vào `CODING_STANDARDS.md`.

---

## [1.6.1] - 2026-09-22 (Khôi Phục & Chuẩn Hóa Toàn Diện: Quy Trình Tiến Độ 10 Bước & Bộ Chứng Từ Gốc Số Hóa)

### 1. Khôi Phục & Tự Động Hóa Tiến Độ Quy Trình 10 Bước Điều Vận (TMS 10-Step SOP):
- **Nguyên nhân cốt lõi (Root Cause Fixed):** Các chuyến xe tạo mới hoặc seed thiếu dữ liệu `TripTimelineItem`, dẫn đến mảng `timeline` rỗng khiến thẻ giao diện *"Tiến độ Thực Hiện (Quy trình 10 Bước)"* không hiển thị nội dung.
- **Xây dựng `apps/dispatch/timeline_service.py`:**
  - Chuẩn hóa chuẩn mực 10 bước vận hành thực tế theo SOP Triền Võ:
    1. Tiếp nhận & Chuẩn bị lệnh điều động (DRAFT)
    2. Phát lệnh điều xe Zalo / App tài xế (DISPATCHED)
    3. Tài xế xác nhận nhận chuyến trên App (ACCEPTED)
    4. Lấy Cont / Hàng tại Cảng/Depot (CONTAINER_PICKED)
    5. Vận chuyển theo tuyến duyệt (IN_TRANSIT)
    6. Giao nhận tại kho khách hàng (AT_WAREHOUSE)
    7. Đóng / Trút hàng tại dock kho (UNLOADING)
    8. Hoàn tất chứng từ giao nhận & Ký POD (DELIVERED)
    9. Kéo vỏ cont hạ bãi / Trả rỗng (RETURNING_EMPTY)
    10. Tổng hợp chi phí & Đối chiếu thanh toán kế toán (COMPLETED)
  - **Tự động đồng bộ (Auto-Sync on Demand):** Khi truy xuất chi tiết bất kỳ chuyến xe nào (`TripDetailAPIView`), hệ thống tự động kiểm tra và đảm bảo đủ 10 bước tiến độ khớp chính xác với máy trạng thái (State Machine).
  - **Tự động chuyển mốc thời gian:** Tích hợp `sync_trip_10_step_timeline()` vào `transition_trip()` trong `core/workflows.py`.
- **Nâng cấp UI/UX Timeline (`static/js/app.js`):**
  - Trạng thái `ĐANG THỰC HIỆN`: Đèn tín hiệu Teal nhấp nháy (Pulsing Dot) kèm huy hiệu `ĐANG THỰC HIỆN`.
  - Trạng thái `HOÀN THÀNH`: Nút xanh lục Emerald kèm icon tích v và huy hiệu `Hoàn thành`.
  - Các bước chờ: Đánh số thứ tự tròn gọn gàng.

### 2. Số Hóa & Bổ Sung Đầy Đủ Chứng Từ Gốc Chuyến Xe (Trip Documents):
- **Phân loại chứng từ chuẩn hóa với Icon & Badge chuyên nghiệp:**
  - 📄 **Phiếu EIR Lấy Cont (`EIR_PICKUP`):** Ghi rõ số Cont, Seal, vị trí bãi và hãng tàu.
  - 📄 **Phiếu EIR Hạ Cont (`EIR_DROPOFF`):** Bãi hạ rỗng, tình trạng vỏ cont.
  - ✍️ **Biên bản giao nhận có chữ ký (`POD`):** Xác nhận số lượng kiện hàng, người nhận, ký đóng dấu.
  - 🧾 **Hóa đơn điện tử nâng hạ / cước cảng (`INVOICE`):** Số HĐĐT, mã tra cứu trực tuyến VNPT/Viettel/ePort.
  - ⚖️ **Phiếu cân tải trọng xe & hàng (`WEIGHT_TICKET`):** Tải trọng tịnh, tổng tải xe.
  - 🛡️ **Giám định vỏ cont (`CONTAINER_CHECK`):** Tình trạng vỏ cont, sàn gỗ.
- **Nạp dữ liệu mẫu thực tế 100%:** Nạp đầy đủ từ 2 - 4 chứng từ gốc pháp lý cho tất cả 16 chuyến xe hiện hành.

---

## [1.6.0] - 2026-09-22 (Sprint 1: Hoàn Thành Critical Database Fixes — Chuẩn Hóa Quan Hệ Master Data 3NF)

### 1. Chuẩn Hóa Quan Hệ Khóa Ngoại (Foreign Keys) Tới Master Data:
- **`apps/customers.RouteTariff` & `BookingOrder`:**
  - Bổ sung `pickup_loc`, `delivery_loc`, `dropoff_loc` liên kết ForeignKey tới `master_data.Location` (`on_delete=models.PROTECT`).
  - Duy trì các trường text cũ phục vụ tương thích ngược (Backward Compatibility) và tìm kiếm tự do.
- **`apps/dispatch.DispatchTrip`:**
  - Bổ sung `pickup_loc`, `warehouse_loc`, `dropoff_loc` liên kết ForeignKey tới `master_data.Location`.
  - Tự động hóa hàm `update_financials()`: Ưu tiên tra cứu biểu cước hợp đồng theo cặp khóa ngoại `(pickup_loc, delivery_loc)`, fallback sang chuỗi văn bản nếu chưa gán khóa ngoại.
- **`apps/billing.TripExpense`:**
  - Bổ sung `expense_item` liên kết ForeignKey tới `master_data.ExpenseItem` (`on_delete=models.PROTECT`).
  - Giải quyết xung đột ngữ nghĩa `DocumentType` giữa billing và documents bằng cách chuẩn hóa sang `ExpenseReceiptType` (kèm backward-compatible alias).
  - Tự động map và đồng bộ `ExpenseItem` trong API tạo và sửa chi phí hiện trường (`TripExpensesAPIView`, `TripExpenseDetailAPIView`).

### 2. Chuẩn Hóa Các Mốc Thời Gian Vận Hành Sang ISO DateTime:
- Bổ sung `actual_gate_in_at` và `actual_gate_out_at` (`DateTimeField`) trên model `DispatchTrip`.
- Tự động phân tích và chuyển đổi chuỗi giờ tác nghiệp cổng kho (vd: "8H", "16H30") kết hợp với ngày hẹn đóng hàng `loading_date` thành mốc thời gian chuẩn hóa có timezone.

### 3. Data Migration & Backfill Toàn Vẹn:
- Hoàn thành tạo và apply 3 tệp migration trên PostgreSQL container:
  - `billing.0006_tripexpense_expense_item_and_more`
  - `customers.0005_bookingorder_delivery_loc_bookingorder_dropoff_loc_and_more`
  - `dispatch.0006_dispatchtrip_actual_gate_in_at_and_more`
- Ánh xạ tự động và thành công 100% dữ liệu thực tế:
  - 9/9 biểu cước `RouteTariff` đã liên kết `Location`.
  - 8/8 đơn hàng `BookingOrder` đã liên kết `Location`.
  - 16/16 chuyến xe `DispatchTrip` đã liên kết `Location` và chuẩn hóa mốc thời gian.
  - 8/8 khoản chi phí `TripExpense` đã liên kết `ExpenseItem`.
- Xác thực thị giác trực tiếp trên trình duyệt Browser tại `http://localhost:8085/` đạt 100% tiêu chuẩn UI/UX và dữ liệu không sai lệch.

---

## [1.5.2] - 2026-09-22 (Chuẩn Hóa Thuật Ngữ Kế Toán Vận Tải: 'CHI HỘ KH' Thay Cho 'THU HỘ KH')

### 1. Chuẩn Hóa Khái Niệm Vận Hành & Kế Toán Triền Võ:
- **Bản chất nghiệp vụ:** Khi phát sinh các chi phí nâng/hạ cảng, kiểm hóa, bến bãi mà hợp đồng quy định khách hàng chịu, doanh nghiệp vận tải là đơn vị **ứng tiền chi trước tại hiện trường (Chi hộ KH)**. Doanh nghiệp chỉ thu lại tiền sau khi lập bảng kê quyết toán với khách hàng ở chu kỳ đối soát tiếp theo.
- **Chuẩn hóa nhãn giao diện & chứng từ:** Thay thế toàn diện nhãn `THU HỘ KH` và `Thu hộ / Chi hộ` sang **`CHI HỘ KH`** / **`Chi hộ Khách hàng`**:
  - **Huy hiệu trên bảng kê chi phí:** `[CHI HỘ KH]` với icon mũi tên chi ra `ph-bold ph-arrow-up-right` nền màu hổ phách (`bg-amber-100 text-amber-800 border-amber-300`).
  - **Dòng tổng kết chi hộ chân bảng:** `Tổng Khoản Chi Hộ Khách Hàng` kèm diễn giải: *"Công ty ứng chi trước, thu lại khi quyết toán với KH — Không tính vào chi phí công ty"*.
  - **Modal Thêm & Chỉnh sửa chi phí:** Toggle switch được cập nhật thành *"Chi hộ Khách hàng — Công ty ứng chi trước, sau đó quyết toán thu lại từ KH (khoản này không tính vào chi phí vận hành của chuyến xe)"*.
  - **Model Backend (`TripExpense`):** Chuẩn hóa `help_text` và nhãn hiển thị `__str__` thành `[CHI HỘ KH]`.

---

## [1.5.1] - 2026-09-22 (Chuẩn Hóa UI/UX Enterprise: Độ Dày Hàng Bảng Dữ Liệu Gọn Nhẹ Chuẩn ERP, Vừa Vặn 20 Dòng/Trang Không Tràn Khung)

### 1. Chuẩn Hóa Cỡ Chữ Hệ Thống & Giãn Dòng Tiêu Chuẩn Như Excel (Excel Row Spacing Standard):
- **Khôi phục nguyên bản kích thước Typography Scale thống nhất (Phiên bản 1.4.8):**
  - Tiêu đề cột `<th>`: `text-xs font-bold text-slate-700 uppercase tracking-wider` (12px đậm nét).
  - Tên Tuyến, Tên Phụ Cấp, Tên Điểm/Cảng, Tên Khách Hàng, Tên Khoản Mục, Tên Quy Cách, Biển Số Xe: `text-sm font-bold text-slate-900` (14px to rõ, sắc nét).
  - Số tiền (Lương chuyến, Phụ cấp, Cước khách, Định mức chi): `text-sm font-black text-emerald-700 / text-slate-900 font-mono` (14px nổi bật).
  - Lộ trình, Trục lấy hạ cont, Địa chỉ: `text-[13px] font-medium text-slate-600` (13px dễ tra cứu).
  - Huy hiệu (Badges) trạng thái & Tag nhóm: `px-2.5 py-0.5 rounded-full text-xs font-bold` (12px cân đối).
  - Nút bấm thao tác (Sửa/Xóa): `p-1.5 text-base` vùng bấm thuận tiện.
- **Giãn dòng tiêu chuẩn kiểu Excel (Excel Row Spacing):**
  - Áp dụng padding `py-2 px-3.5` với đường viền mỏng `border-b border-slate-200/70`.
  - Loại bỏ hoàn toàn các khoảng trống thừa giữa các dòng text, giữ khoảng cách giữa 2 dòng vừa vặn, sát sao, thanh thoát như một bảng tính Excel chuyên nghiệp.

### 2. Thiết Kế Bố Cục Tràn Màn Hình Không Trượt Khung (Full-Height Flexbox Layout):
- Container `#view-cai-dat` chuyển sang kiến trúc `h-full flex flex-col space-y-2.5 overflow-hidden`.
- Thẻ danh mục chính: `flex-1 min-h-0 flex flex-col`.
- Container bảng dữ liệu: `flex-1 min-h-0 overflow-y-auto overflow-x-auto relative`.
- **Thanh phân trang (Footer Pagination) luôn ghim đáy (Pinned Footer with `shrink-0`):**
  - Hiển thị trọn vẹn 20 dòng trên Trang 1 cùng lúc với thanh phân trang mà không bị trượt mất khỏi màn hình hay phải cuộn trang chính.
  - Cho phép tùy chọn linh hoạt số dòng: `20 dòng (mặc định)`, `30 dòng`, `50 dòng`, `100 dòng`.
  - Đồng bộ số bản ghi hiển thị chính xác theo dải: `Hiển thị 1 - 20 trong 36 bản ghi`.

---

## [1.5.0] - 2026-09-22 (Phân Hệ Cài Đặt / Master Data & Chuẩn Hóa Biểu Phí Tính Lương Triền Võ)

### 1. Phân Hệ "Cài Đặt" (Master Data Management) Chuẩn ERP:
- **Vị trí Menu Sidebar:** Đặt ngay bên dưới phân hệ **"Dịch vụ Hải quan"** với icon `ph-gear`.
- **Cấu trúc 8 Tabs Quản Trị Tập Trung (kèm tính năng CRUD đầy đủ):**
  1. 📑 **Biểu Phí Lương Chuyến (Driver Salary Tariffs):** Quản lý 36 tuyến đường định mức lương từ 400.000đ đến 1.400.000đ.
  2. 📑 **Phụ Cấp & Kiểm Hóa (Driver Allowances):** Quản lý phụ cấp cảng xa (Hiệp Phước +350k, Cái Mép +500k, Nhơn Trạch +400k, kéo rỗng +300k), kiểm hóa (Thủ Dầu Một +500k, VSIP 1 +200k), cắt kéo bãi (250k), kéo moóc không (+100k).
  3. 📍 **Địa Điểm & Cảng Bãi (Locations):** 18 điểm cảng biển, ICD, depot rỗng, kho khách hàng và bãi xe công ty.
  4. 🛣️ **Biểu Cước Khách Hàng (Customer Tariffs):** Biểu giá cước xuất hóa đơn theo tuyến đường.
  5. 🏢 **Danh Mục Khách Hàng (Customers):** Danh bạ đối tác, MST, địa chỉ, số điện thoại liên hệ.
  6. 💰 **Khoản Mục Chi Phí (Expense Items):** 8 nhóm chi phí phát sinh chuẩn Triền Võ.
  7. 📦 **Quy Cách Cont & Xe (Container & Truck Types):** 40HC, 20DC, 45G1, Xe tải 2T - 10T kèm hệ số TEU, tải trọng và CBM.
  8. 🚛 **Đội Xe & Rơ-moóc (Vehicles & Trailers):** Quản lý phương tiện, nguồn xe nhà / xe bạn, hạn đăng kiểm và bảo trì.

### 2. Chuẩn Hóa Cơ Chế Tính Lương Tài Xế Theo Văn Bản Thực Tế Triền Võ:
- **Lương Cơ Bản:** Chuẩn hóa xe mới `7.500.000đ` và xe cũ `8.500.000đ` (thay vì mức 5.000.000đ cũ).
- **Thưởng Vượt Mốc 40 Chuyến/Tháng:** Tự động tính thưởng `(Số chuyến - 40) × 50.000đ` cho các chuyến thứ 41 trở lên.
- **Công Thức Tính Lương Minh Bạch:**
  $$\text{Lương Thực Lãnh} = \text{Lương Cơ Bản} + \sum (\text{Lương Chuyến} + \text{Phụ Cấp}) + \text{Thưởng Vượt Mốc 40 Chuyến} - \text{Tạm Ứng}$$

---

## [1.4.9] - 2026-09-21 (Sửa Lỗi Nghiêm Trọng: Công Thức Chi Phí Không Khớp — Chi Tiết 0đ / Tổng Hợp 1.200.000đ)


### Vấn Đề Cốt Lõi Được Xử Lý (Root Cause Fixed):
- **Lỗi Zero Variance vi phạm nguyên tắc kế toán ERP:** Chuyến `TVL-0917-007` (Takigawa VSIP) và 6 chuyến `0917` khác có `cached_expense = 1.200.000đ` được gán cứng trong quá trình seed data, nhưng bảng `TripExpense` không có bản ghi chi phí nào tương ứng. Gây ra hiện tượng **chi tiết bảng kê hiển thị `0 đ` nhưng khối P&L và App tài xế báo `1.200.000 đ`** — nghiêm trọng về độ chính xác dữ liệu tài chính vận tải.

### Sửa Lỗi Backend (`apps/dispatch/models.py`):
- **Hàm `update_financials()`:** Mở rộng logic tính tổng chi phí từ `status__in=['APPROVED','SETTLED']` thành **tất cả chi phí hợp lệ (trừ bị từ chối và xóa mềm)**:
  ```python
  # Trước: Chỉ tính APPROVED và SETTLED → bỏ sót PENDING gây sai số
  # Sau: Tính tất cả status trừ REJECTED và is_deleted=True
  TripExpense.objects.filter(trip=self, is_deleted=False).exclude(status=ApprovalStatus.REJECTED)
  ```

### Sửa Lỗi Backend (`apps/dispatch/api_views.py`):

#### 1. `TripDetailAPIView` — Chuẩn Hóa Công Thức Tài Chính (Single Source of Truth):
- Thêm bước tính `total_actual_expense` trực tiếp từ danh sách `expenses` (không dùng `trip.cached_expense` dễ lệch):
  ```python
  valid_expenses = [e for e in expenses if e.status != ApprovalStatus.REJECTED]
  total_actual_expense = sum(e.amount for e in valid_expenses)
  revenue = trip.cached_revenue
  profit = revenue - total_actual_expense
  margin_percent = round((profit / revenue) * 100, 2) if revenue > 0 else 0
  ```
- **Tự động đồng bộ DB:** Nếu `cached_expense` trong DB bị lệch, API tự gọi `trip.save()` để cập nhật trước khi trả Response → không bao giờ trả số liệu lệch cho client.
- `cost_sheet['total_expense']` và `financials['expense']` bây giờ **luôn bằng nhau và bằng tổng các dòng chi tiết thực tế**.

#### 2. `DashboardBGDAPIView` — Fix TypeError Decimal vs float:
- Chuyển đổi `agg_revenue` và `agg_expense` sang `float()` để tránh lỗi `TypeError: unsupported operand type(s) for -: 'decimal.Decimal' and 'float'`.

### Sửa Lỗi Frontend (`static/js/app.js`):

#### 1. `renderCostSheetTable()` — Đồng Bộ Hoàn Toàn Sau Khi Tính Tổng:
- Sau khi hàm render xong và có `totalCalculated`, **ngay lập tức cập nhật cả 4 vị trí hiển thị**:
  - `#cost-sheet-total` — Tổng footer bảng kê
  - `#pnl-expense` — Box "Tổng Chi Phí Thực Tế"
  - `#pnl-profit` — Box "Lợi Nhuận Gộp (Margin)"
  - `#app-total-expense` — Tổng chi phí tài xế đã kê (App Mobile)
- Công thức frontend 100% nhất quán:
  $$\text{Chi phí} = \sum \text{Khoản chi trong bảng kê}$$
  $$\text{Lợi nhuận} = \text{Doanh thu} - \text{Chi phí}$$

#### 2. `renderDriverMobileApp()` — Tính Từ trip.expenses Thực Tế:
- Tổng hiển thị trên App Mobile tính từ `trip.expenses.reduce(...)` thay vì `trip.financials.expense` (vốn là cached value dễ lệch).

### Đồng Bộ Database (Chạy update_financials toàn bộ):
- Chạy `update_financials()` cho tất cả 16 chuyến xe trong DB → xóa sạch dữ liệu `cached_expense` sai:
  - 7 chuyến `TVL-0917-*`: `cached_expense = 1.200.000đ` → đã reset về `0đ` (đúng với bảng kê rỗng)
  - `TVL-0916-006`: `cached_expense = 0` → cập nhật thành `150.000đ` (có 1 BOT PENDING)
  - `TVL-0916-007`: `1.548.000đ` ✅ | `TVL-0916-008`: `3.145.111đ` ✅ (đã có expense records)

### Kết Quả Kiểm Chứng (Verification):
- **Automated tests:** `python manage.py test` → 5/5 tests **PASSED** (Exit code 0)
- **API `GET /api/trips/TVL-0917-007/`:**
  ```json
  { "financials": { "expense": 0, "profit": 3800000, "margin_percent": 100.0 }, "cost_sheet": { "total_expense": 0 } }
  ```
  ✅ Chi tiết `0đ` = Tổng hợp `0đ` = Lợi nhuận `3.800.000đ (100%)`
- **API `GET /api/trips/TVL-0916-007/`:**
  ```json
  { "financials": { "expense": 1548000, "profit": 2252000, "margin_percent": 59.26 }, "cost_sheet": { "total_expense": 1548000 } }
  ```
  ✅ Chi tiết = Tổng hợp = Khớp 100% với 2 dòng `TripExpense` (Hạ 1.518.000đ + BOT 30.000đ)

---

## [1.4.8] - 2026-09-21 (Rà Soát & Cơ Cấu Chuẩn Typography System: Cỡ Chữ, Font-Size Đồng Bộ Toàn Bộ Phân Hệ Đạt Chuẩn Quốc Tế)

### 1. Xây Dựng Hệ Thống Design Tokens & Typography Scale Chuẩn Quốc Tế:
- **Thiết lập thang đo phân cấp 7 bậc trong `static/css/main.css`:**
  - `--font-hero: 30px` (Số liệu KPI trọng yếu Ban Giám Đốc đọc nhanh).
  - `--font-h1: 23px` (Tiêu đề trang & phân hệ chính).
  - `--font-h2: 17px` (Tiêu đề nhóm chức năng, section title).
  - `--font-h3: 15px` (Tiêu đề thẻ card, modal heading).
  - `--font-body-main: 14px` (Dữ liệu bảng, tên khách hàng, mã vận đơn, số tiền, nội dung chính).
  - `--font-body-sub: 13px` (Lộ trình vận chuyển, thông tin phụ, chú thích thứ cấp).
  - `--font-caption: 11.5px` (Nhãn trạng thái badge, timestamp, metadata).
- **Bộ Utility Classes Typography:** `.app-page-title`, `.app-page-subtitle`, `.app-section-title`, `.app-card-title`, `.app-kpi-value`, `.app-table-header`, `.app-table-cell`, `.app-table-meta`, `.app-form-label`, `.app-form-control`, `.app-status-badge`, `.app-mono`.

### 2. Đồng Bộ Hóa 7 Phân Hệ Giao Diện & Màn Hình Chi Tiết:
- **Tổng quan Dashboard (`templates/views/view_dashboard.html`):**
  - Tối ưu 4 thẻ KPI chiến lược lên `text-3xl font-black font-heading tracking-tight mt-1`.
  - Tăng độ phân giải thị giác các dòng Doanh thu / Chi phí / Quỹ tiền lên `text-sm font-black`.
- **Sale & Booking (`templates/views/view_sales.html` & `static/js/app.js`):**
  - Đồng bộ 4 thẻ KPI tổng quan kinh doanh và 4 thẻ trạng thái chu kỳ báo giá lên `text-3xl font-black font-heading tracking-tight mt-1`.
  - Tăng cỡ nhãn chỉ số lên `text-[13px] font-bold uppercase tracking-wider`.
  - Nâng cấp hai thanh subtabs lên `text-sm font-bold`.
  - Bảng Báo Giá Tuyến Cước: Cỡ chữ mã báo giá, khách hàng, đơn giá cước, doanh thu lên `text-sm font-black / font-bold`; lộ trình chuyển sang `text-[13.5px] font-medium text-slate-700`.
  - Bảng Tiếp Nhận Booking: Mã booking, khách hàng, số cont, giá cước, tiến độ lên `text-sm font-black / font-bold`; lộ trình 3 điểm lên `text-[13px] leading-snug`.
- **Điều Vận (`templates/views/view_dispatch.html` & `static/js/app.js`):**
  - 4 thẻ KPI điều độ chuyến lên `text-3xl font-black font-heading tracking-tight mt-1`, nhãn `text-[13px] font-bold uppercase tracking-wider`.
  - Bảng danh sách chuyến: Mã chuyến `text-sm font-black`, khách hàng `text-sm font-bold`, số cont & xe `text-sm font-bold font-mono`, lộ trình `text-[13px] font-bold`, chi phí `text-[13px] font-mono font-bold`.
- **Quản Lý Kế Toán (`templates/views/view_accounting.html` & `static/js/app.js`):**
  - 4 thẻ KPI kế toán lên `text-3xl font-black font-heading tracking-tight mt-1`.
  - Bảng đối soát chi phí: Mã chuyến, khách hàng, tài xế, doanh thu, chi phí, lợi nhuận gộp đều dùng `text-sm font-black / font-bold`, lộ trình `text-[13px] font-medium`, nhãn chốt sổ `text-xs font-bold`.
- **Xe & Bãi (`templates/views/view_fleet.html` & `static/js/app.js`):**
  - 4 thẻ KPI đội xe lên `text-3xl font-black font-heading tracking-tight mt-1`, nhãn `text-[13px] font-bold uppercase tracking-wider`.
  - Bảng danh sách phương tiện: Biển số, loại xe, tài xế, hạn đăng kiểm, lịch bảo trì nâng lên `text-sm font-black / font-bold / font-medium`.
- **Hành Chính & Nhân Sự (`templates/views/view_personnel.html` & `static/js/app.js`):**
  - 3 thẻ KPI nhân sự lên `text-3xl font-black font-heading tracking-tight mt-1`, nhãn `text-[13px] font-bold uppercase tracking-wider`.
  - Bảng lương chuyến tạm tính: Mã NV, tài xế, số chuyến, lương cơ bản, lương chuyến, tạm ứng, thực lãnh đều nâng lên `text-sm font-black / font-bold / font-medium`.
- **Dịch Vụ Hải Quan (`templates/views/view_customs.html`):**
  - 3 thẻ KPI tờ khai thông quan luồng xanh, vàng, đỏ chuẩn hóa nhãn `text-[13px] font-bold uppercase tracking-wider` và số liệu `text-3xl font-black font-heading tracking-tight mt-1`.
- **Chi Tiết Chuyến Xe (`templates/views/view_trip_detail.html` & `static/js/app.js`):**
  - Khối P&L chuyến xe nâng lên `text-xl font-black tracking-tight mt-0.5`, nhãn `text-xs font-bold`.
  - Bảng kê chi phí 8 mục Triền Võ: Tên khoản chi nâng lên `text-sm font-bold text-slate-900`, số tiền nâng lên `text-sm font-black text-rose-600`, số lượng khoản chi accordion badge `text-xs font-bold`.

### 3. Chuẩn Hóa Cỡ Chữ & Nhãn Input Cho Toàn Bộ 4 Modals Form:
- **`modal_quotation.html` & `modal_booking.html`:**
  - Bỏ class `text-xs` bao ngoài form gây co chữ nhỏ toàn bộ modal.
  - Chuyển nhãn trường sang `text-xs font-bold uppercase tracking-wider text-slate-700`.
  - Nâng ô input/select sang `text-sm font-bold / font-semibold text-slate-900`.
  - Nút bấm hành động chuyển sang `text-sm font-bold`.
- **`modal_create_trip.html` & `modal_ocr.html`:**
  - Đồng bộ nhãn nhận diện OCR sang `text-xs font-bold uppercase tracking-wide`.

---

## [1.4.7] - 2026-09-21 (Tái Cấu Trúc Tổng Quan Dashboard Chuẩn Quốc Tế TMS & Hải Quan, Tích Hợp Biểu Đồ Chart.js & Click-to-Jump)

### 1. Chuẩn Hóa 4 Trụ Cột Điều Hành Chiến Lược Cho Ban Giám Đốc (Executive KPI Pillars):
- **Pillar 1: Tài Chính & Lợi Nhuận Gộp (Financial Health):**
  - Giám sát tức thì: Lợi Nhuận Gộp Tạm Tính (`45.601.889 đ`).
  - **Dòng trên:** Doanh thu cước (`60.495.000 đ`) | Chi phí vận hành (`14.893.111 đ`).
  - **Dòng dưới:** Quỹ Khả Dụng: Tiền mặt (`150.000.000 đ`) | Ngân hàng (`1.250.000.000 đ`).
  - 👉 **Hành động Click:** Chuyển ngay đến tab **`Quản lý Kế toán`** (`switchTab('ke-toan')`) để đối soát chi tiết.
- **Pillar 2: Vận Hành Chuyến & Năng Suất (Transport Operations & Productivity):**
  - Chuyến đang lăn bánh hôm nay (`5 chuyến`), Tổng chuyến trong kỳ (`16 chuyến`), Hoàn tất hôm qua (`8 chuyến`), và chỉ số SLA quốc tế **`98.2% OTD (On-Time Delivery Rate)`**.
  - 👉 **Hành động Click:** Chuyển ngay đến tab **`Điều vận`** (`switchTab('dieu-van')`) để xem bàn điều phối và theo dõi hành trình GPS.
- **Pillar 3: Khai Thác Tài Sản Đội Xe & Tài Xế (Fleet Assets & Driver Readiness):**
  - **Tỷ lệ khai thác xe (Fleet Utilization Rate):** `62.5%` (5/8 xe lăn bánh có hàng, 3 xe chờ bãi, 0 xe bảo trì).
  - Tỷ lệ sẵn sàng nhân lực: `7/10 Tài xế đang vận hành` (3 tài xế nghỉ phép).
  - 👉 **Hành động Click:** Chuyển ngay đến tab **`Xe & Bãi`** (`switchTab('xe-bai')`).
- **Pillar 4: Đơn Hàng Booking & Dịch Vụ Hải Quan (Commercial & Customs Clearance):**
  - Tờ khai thông quan Luồng Xanh: `85 tờ khai` (85.0% thông quan tự động không vướng mắc).
  - Phân loại: 12 Luồng Vàng, 3 Luồng Đỏ (kiểm hóa thực tế). Booking mới chờ điều xe: `6 đơn hàng`. Cảnh báo rủi ro lưu bãi DEM/DET: `0 container`.
  - 👉 **Hành động Click:** Chuyển ngay đến tab **`Sale & Booking`** (`switchTab('kinh-doanh')`) hoặc **`Dịch vụ Hải quan`** (`switchTab('hai-quan')`).
- **Tối Ưu & Tăng Kích Thước Chữ (Typography Scaling & Visual Balance):**
  - Tăng kích thước các con số trọng yếu lên `text-3xl font-black` (30px).
  - Tăng kích thước các dòng số liệu Doanh thu/Chi phí/Quỹ tiền lên `text-sm font-black font-heading` sắc nét.
  - Nâng khoảng đệm thẻ lên `p-5.5 md:p-6` cùng viền màu `border-l-[5px]` giúp không gian 4 ô cân đối, hài hòa và dễ quan sát từ xa.

### 2. Tích Hợp Hệ Thống Biểu Đồ Trực Quan Hiện Đại (Modern Logistics BI Analytics - Chart.js):
- **Biểu đồ Cột & Đường Đa Trục (Mixed Bar & Line Chart):**
  - Trực quan hóa diễn biến 7 ngày gần nhất: Cột Doanh Thu Cước (Teal `#0d9488`), Cột Chi Phí Vận Hành (Amber `#f59e0b`) kết hợp Đường Lợi Nhuận Gộp (Emerald `#10b981`).
  - Hỗ trợ Tooltip thông minh định dạng tiền tệ Việt Nam (`Intl.NumberFormat('vi-VN') + ' đ'`).
  - Đi kèm bảng tóm tắt 3 chỉ số đáy: Doanh thu TB/ngày (`~18.7 tr`), Chi phí TB/ngày (`~4.8 tr`), Biên lợi nhuận TB (`74.2%`).
- **Biểu đồ Vòng Donut Khai Thác Đội Xe & Hải Quan (Doughnut Chart with Center Display):**
  - Thiết kế tâm rỗng (Cutout 72%) hiển thị to rõ chỉ số trung tâm: `62.5% Khai Thác` hoặc `85.0% Luồng Xanh`.
  - Tích hợp công tắc chuyển đổi (Toggle Switch) mượt mà giữa **Đội Xe** (Xe chở hàng / Xe bãi / Bảo trì) và **Hải Quan** (Luồng Xanh / Vàng / Đỏ).

### 3. Cơ Chế Tương Tác Chi Tiết Toàn Diện (Interactive Drill-Down & Preserved Back Navigation):
- **Bảng P&L Chuyến Xe Mới Nhất:**
  - Nhấp chuột vào bất kỳ dòng nào hoặc nút "Chi Tiết" trên bảng -> Lập tức gọi `viewTripDetail(trip_code)` mở giao diện Chi Tiết Chuyến Xe với Timeline 10 bước, lộ trình GPS và chứng từ POD.
- **Bảo lưu vết điều hướng (Navigation History Memory):**
  - Khi bấm nút "Quay lại" trên màn hình Chi tiết chuyến xe, hệ thống ghi nhớ tab xuất phát (Dashboard hoặc Điều vận) để đưa Ban Giám Đốc trở về đúng màn hình ban đầu một cách tự nhiên.

---

## [1.4.6] - 2026-09-21 (Tái Cơ Cấu 7 Phân Hệ Menu Chuẩn Nghiệp Vụ & Khởi Tạo Phân Hệ Quản Lý Kế Toán - Đối Soát Chi Phí)

### 1. Cơ Cấu Lại 7 Phân Hệ Menu Sidebar Đúng Chuẩn Văn Bản & Nghiệp Vụ:
- **Nguyên tắc:** Chuẩn hóa toàn bộ 7 mục menu thanh điều hướng theo đúng văn bản và mục đích nghiệp vụ:
  1. **Tổng quan Dashboard:** Xây dựng biểu đồ và các thông số chính cho Ban Giám Đốc đọc nhanh.
  2. **Sale & Booking:** Chuyên quản lý Báo giá & Booking.
  3. **Điều vận:** Quản lý Điều xe, theo dõi chuyến...
  4. **Xe & Bãi:** Quản lý xe và các bãi xe.
  5. **Hành chính & Nhân sự:** Quản lý Nhân sự, tiền lương & tài sản hành chính,...
  6. **Quản lý Kế toán:** Quản lý Kế toán & Đối soát Chi phí,... Báo cáo Kế toán.
  7. **Dịch vụ Hải quan:** Phân hệ quản lý Dịch vụ Hải quan -> Đính kèm badge "Phát triển sau".

### 2. Khởi Tạo Phân Hệ "Quản Lý Kế Toán" (TMS Accounting & Freight Auditing):
- **Giao diện Đối soát & Báo cáo Kế toán (`templates/views/view_accounting.html`):**
  - **4 Thẻ KPI Kế toán tài chính:** Doanh Thu Cước (VNĐ), Tổng Chi Phí Chuyến (VNĐ), Lợi Nhuận Gộp & Tỷ suất (%) cùng Số Chuyến Chờ Kế Toán Chốt Sổ.
  - **Bảng Kê Đối Soát Từng Chuyến Xe:**
    - Cung cấp dữ liệu chi tiết: Mã Chuyến, Ngày chạy, Khách hàng & Tuyến đường, Xe & Tài xế, Cont/Hàng, Doanh thu cước, Tổng chi phí, Lợi nhuận gộp & Biên LN (%), Số hóa đơn/chứng từ, Trạng thái chốt sổ.
    - **Cơ chế Khóa sổ Kế toán (Settlement Locking):** 1-click cho phép Kế toán trưởng "Khóa sổ" chuyến xe để niêm phong chi phí/chứng từ hóa đơn, hoặc "Mở khóa sổ" khi phát sinh đối soát bổ sung.
  - **Bộ lọc tìm kiếm & trạng thái:** Tìm nhanh theo mã chuyến, khách hàng, số cont, biển số và phân loại theo trạng thái chốt sổ ("Chờ chốt sổ", "Đã chốt sổ").
- **Backend API Kế toán (`AccountingAPIView` tại `apps/dispatch/api_views.py`):**
  - Endpoint `GET /api/accounting/` tính toán tổng hợp Doanh thu cước từ `cached_revenue` (hoặc `selling_freight_price`), Chi phí vận hành chuyến từ `cached_expense`, Lợi nhuận gộp và đếm số chứng từ hóa đơn hợp lệ.

### 3. Chuẩn Hóa Điều Hướng Trang Chủ (Homepage Luôn Hiển Thị Dashboard):
- **Quy tắc điều hướng nhất quán:** Khi người dùng truy cập link gốc (`/`), tải lại trang, hoặc click vào Logo thương hiệu BIM Logistics ở góc trên Sidebar, giao diện luôn ưu tiên chuyển về phân hệ **`Tổng quan Dashboard`** để Ban Giám Đốc và Quản trị viên nắm bắt nhanh số liệu P&L, dòng tiền và năng suất vận tải.
- **Đồng bộ hóa giao diện:** Thiết lập `view-dashboard` hiển thị mặc định, nút Sidebar `Tổng quan Dashboard` được gán trạng thái `active` ban đầu, và Brand Logo Header được bao bọc thành thẻ liên kết tương tác chuyển nhanh về Dashboard.

---

## [1.4.5] - 2026-09-21 (Chuẩn Hóa Định Dạng Số Có Phân Cách Hàng Ngàn Cho Toàn Bộ Hệ Thống & Form Nhập)

### 1. Chuẩn Hóa Định Dạng Số & Phân Cách Hàng Ngàn Trong Tất Cả Các Form Nhập:
- **Nguyên tắc kế toán Việt Nam & MISA AMIS:** Tất cả các ô nhập số tiền tệ (VNĐ), đơn giá, chi phí, sản lượng cam kết, số container và ngày free time đều được định dạng phân cách hàng ngàn bằng dấu chấm (`.`), ví dụ: `2.500.000`, `3.800.000`, `76.000.000`.
- **Thao tác mượt mà theo thời gian thực (Real-time Auto-formatting):**
  - Sử dụng thẻ `input type="text" inputmode="numeric"` kết hợp class chuyên dụng `.input-number-vn`.
  - Tự động chèn dấu chấm phân cách hàng ngàn khi người dùng gõ số hoặc dán nội dung mà không gây giật lag.
  - Tự động duy trì chính xác vị trí con trỏ chuột (Cursor preservation algorithm), không bị nhảy con trỏ về cuối ô nhập khi gõ ở giữa chuỗi số.
  - Xử lý thông minh phím `Backspace`: khi bấm xóa ngay sau dấu chấm phân cách, hệ thống tự động xóa số đứng trước dấu chấm và định dạng lại chuỗi tức thì.
- **Tự động bóc tách số liệu (Safe Number Parsing):**
  - Hàm tiện ích `parseNumberVN()` tự động loại bỏ mọi ký tự định dạng để trích xuất số nguyên/thực sạch trước khi gửi lên API Backend hoặc tính toán công thức doanh thu `Đơn giá × Sản lượng`.

### 2. Các Phân Hệ & Form Nhập Đã Được Rà Soát & Áp Dụng:
- **Form Tạo & Hiệu Chỉnh Báo Giá (CRM / Sales):**
  - `Đơn Giá Cước Đề Xuất (VNĐ)`: Mặc định `3.800.000 đ`, hỗ trợ nhập phân cách hàng ngàn.
  - `Sản Lượng Cam Kết (Chuyến/Tháng)`: Mặc định `20` chuyến/tháng.
  - `Doanh Thu Kế Hoạch / Tháng (Tạm tính)`: Tự động tính và hiển thị phân cách chuẩn `76.000.000 đ`.
- **Form Tiếp Nhận & Hiệu Chỉnh Booking (Sale Admin / CS):**
  - `Cước Vận Chuyển (VNĐ)`: Mặc định `4.000.000 đ`, hỗ trợ nhập phân cách hàng ngàn.
  - `Tổng Số Cont / Chuyến Đặt`: Mặc định `1`.
  - `Free time Lưu Vỏ (DET)` & `Free time Lưu Bãi (DEM)`: Mặc định `7` ngày.
- **Form Chi Phí & Đối Soát Chuyến Xe (Điều Vận & Kế Toán Hiện Trường):**
  - `Thành Tiền Chi Phí (VNĐ)` trong modal Thêm mới & Sửa chi phí: Placeholder `vd: 1.518.000`.
- **Form Trích Xuất Chứng Từ Số (OCR Scanner):**
  - `Số Tiền Trích Xuất (VNĐ)`: Mặc định `120.000 đ`.

### 3. Rà Soát Bảng & Dashboard Thống Kê:
- Tất cả các ô số lượng, số cont, số đơn hàng trên KPI Cards và các cột số liệu trong bảng Báo giá & Booking đều được bao bọc qua chuẩn `Intl.NumberFormat('vi-VN')`.

---

## [1.4.4] - 2026-09-21 (Tối Ưu Typography UI/UX, Bỏ Nút Thừa & Mini-Dashboard Chuẩn Vận Chuyển)

### 1. Định Vị Rõ Góc Nhìn "Đơn Vị Vận Chuyển (Carrier / Trucking Contractor)":
- **Nhất quán vai trò:** Bim Logistics là đơn vị vận chuyển đường bộ (nhà xe / đội xe đầu kéo, xe tải) nhận chuyên chở hàng hóa từ Khách hàng (Chủ hàng / Forwarder); không phải là hãng tàu biển và không phải là người mua hàng.
- **Tập trung vào luồng hiện trường:** Quản lý đội xe, tài xế, lệnh điều xe, lấy rỗng/lấy hàng, dỡ hàng, hạ cảng, chi phí chuyến và chốt chứng từ POD/EIR.

### 2. Tinh Chỉnh UI/UX & Cân Bằng Typography Bảng Theo Dõi Booking:
- **Loại bỏ chữ thừa & trùng lặp:** Bỏ dòng chữ lặp "Đóng hàng gấp trong 48h" (đã có badge GẤP tinh tế), bỏ nhãn dài "Hãng tàu: ", chuẩn hóa nhãn dịch vụ thành các pill nhỏ gọn (`Xuất FCL · Maersk Line`, `Nhập FCL · SITC`, `Nội Địa FTL · Bim`).
- **Tối ưu hiển thị Lộ trình Vận chuyển:** Loại bỏ các cụm ngoặc đơn dài dòng (như "NGÃ 3 VŨNG TÀU..."), hiển thị rõ nét 3 chặng vận tải: `1. Lấy: [Depot]`, `2. Kho: [Kho đóng hàng]`, `3. Hạ: [Cảng/ICD]`.
- **Cân bằng Font-size:** Điều chỉnh font đồng nhất (12px/13px), tăng độ tương phản màu chữ (`text-slate-800`, `text-slate-900`) tránh tình trạng chữ mờ nhỏ gây mỏi mắt người điều phối.

### 3. Tối Ưu Nút Thao Tác (Action UX):
- **Chuẩn hóa bộ 3 nút thao tác "Xem / Sửa / Xóa":**
  1. **Nút Xem (`ph-eye` - màu xanh sky):** Mở modal ở chế độ chỉ đọc (Read-only view), vô hiệu hóa các trường nhập liệu và ẩn nút Lưu để nhân viên tra cứu an toàn thông tin đơn hàng / báo giá.
  2. **Nút Sửa (`ph-pencil-simple` - màu xanh teal/indigo):** Mở modal ở chế độ hiệu chỉnh đầy đủ, cho phép cập nhật thông tin và chuyển đổi trạng thái đơn hàng.
  3. **Nút Xóa (`ph-trash` - màu đỏ rose):** Xóa mềm (`is_deleted=True`) bảo lưu dữ liệu lịch sử.
  4. *Riêng bảng Booking:* Bổ sung nút **`Điều Xe`** cho các đơn hàng còn cont chưa hoàn tất để chuyển nhanh dữ liệu sang lệnh điều động.
- **Bỏ nút "Tạo Lệnh Điều Động" ở Header Sale & Booking:** Loại bỏ nút tổng ở góc trên cùng bên phải vì không cần thiết; thao tác điều xe được phân định rõ dưới từng dòng Booking bằng nút **`Điều Xe`**.
- **Bổ sung nút "Làm Mới":** Hỗ trợ nhân viên Sale/CS và Điều vận cập nhật nhanh dữ liệu thời gian thực.

### 4. Mini-Dashboard Riêng Cho Từng Tab Với Các Trạng Thái Vận Hành Chuẩn:
- **Tab 1: Báo Giá & Tuyến Cước (CRM Sales - 4 Ô Số):**
  1. *Đang Thương Lượng* (`NEGOTIATING`): Đang chào giá & đàm phán cước.
  2. *Chờ BGĐ Phê Duyệt* (`PENDING_APPROVAL`): Trình duyệt bảng cước và lương chuyến.
  3. *Tuyến Cước Đã Duyệt* (`APPROVED`): Đã ký hợp đồng, sẵn sàng nhận booking.
  4. *Doanh Thu Kế Hoạch (Tháng)*: Doanh thu theo cam kết sản lượng.
- **Tab 2: Đơn Đặt Hàng / Booking Từ Khách (Sale Admin / CS - 4 Ô Số):**
  1. *Chờ Điều Xe* (`PENDING_DISPATCH`): Chưa gán xe (Ưu tiên điều gấp).
  2. *Đang Điều Xe* (`PARTIALLY_DISPATCHED`): Đang kéo cont theo từng đợt.
  3. *Đã Đủ Xe / Hoàn Tất* (`COMPLETED`): Đã phát lệnh 100% số cont.
  4. *Sản Lượng Container*: Số cont đã điều / Tổng cont cần kéo (kèm số cont còn lại).

---

### 1. Bản Chất Nghiệp Vụ: "Booking Là Từ Khách Hàng (Customer Booking Order)":
- **Khắc phục nhận thức phiến diện về Booking:** Đơn đặt hàng vận chuyển xuất phát từ **Khách hàng** (Chủ hàng / Forwarder / Doanh nghiệp sản xuất) chứ không chỉ đơn thuần là xác nhận của hãng tàu biển.
- **Mở rộng 3 phân loại hình thức vận chuyển (`booking_type`):**
  1. `EXPORT_FCL`: **Kéo Cont Xuất Khẩu (FCL)** — Lấy rỗng tại Depot ➔ Đóng hàng tại Kho khách ➔ Hạ bãi Cảng xuất CY (Kèm số Booking hãng tàu, SI/VGM Cut-off, Closing Time).
  2. `IMPORT_FCL`: **Kéo Cont Nhập Khẩu (FCL)** — Lấy cont hàng tại Cảng nhập ➔ Dỡ hàng tại Kho khách ➔ Hạ trả rỗng tại Depot (Kèm số lệnh D/O cảng, hạn lưu cont/bãi DET/DEM).
  3. `DOMESTIC`: **Vận Chuyển Nội Địa / Nhà Máy (FTL)** — Giao nhận nguyên chuyến giữa các kho/nhà máy nội địa bằng xe tải nặng/đầu kéo, không qua hãng tàu biển (Kèm số PO / Đơn mua hàng).

### 2. Trọn Gói CRUD Báo Giá (Quotation) & Máy Trạng Thái Chu Trình Bán Hàng (Sales Funnel):
- **Backend APIs:**
  - `POST /api/sales/` (action: `'create_quotation'`): Tạo mới báo giá tuyến cước, tự động liên kết hoặc tạo khách hàng.
  - `GET /api/quotations/<int:pk>/`: Truy vấn chi tiết báo giá để nạp form chỉnh sửa.
  - `PUT /api/quotations/<int:pk>/`: Cập nhật thông tin khách hàng, tuyến đường, đơn giá cước, sản lượng cam kết.
  - `PATCH /api/quotations/<int:pk>/status/`: Đổi nhanh trạng thái chu trình Sales (`NEGOTIATING` ➔ `PENDING_APPROVAL` ➔ `APPROVED` ➔ `REJECTED` ➔ `EXPIRED`).
  - `DELETE /api/quotations/<int:pk>/`: Xóa mềm (`is_deleted=True`), tuân thủ chuẩn an toàn dữ liệu lịch sử Audit Trail.
- **Frontend & Modal:**
  - Modal `modal-quotation` chuẩn MISA AMIS: Tự động tính Doanh thu kế hoạch (`unit_price × expected_trips_monthly`).

### 3. Trọn Gói CRUD Đơn Đặt Hàng / Booking (Customer Order) & Liên Thông Điều Vận:
- **Backend APIs:**
  - `POST /api/sales/` (action: `'create_booking'`): Tạo đơn đặt hàng từ khách hàng hỗ trợ cả 3 hình thức (`booking_type`).
  - `GET /api/bookings/<int:pk>/`: Lấy thông tin chi tiết đơn hàng phục vụ xem và sửa.
  - `PUT /api/bookings/<int:pk>/`: Cập nhật lộ trình 3 điểm, chứng từ hàng hóa, mốc thời gian cut-off, số cont và giá cước.
  - `PATCH /api/bookings/<int:pk>/status/`: Cập nhật trạng thái (`PENDING_DISPATCH`, `PARTIALLY_DISPATCHED`, `COMPLETED`, `CANCELLED`).
  - `DELETE /api/bookings/<int:pk>/`: Xóa mềm bảo toàn dữ liệu vận tải.
- **Frontend & Modal:**
  - Modal `modal-booking` tương tác thông minh qua hàm `onBookingTypeChange()`:
    + Ẩn các trường Hãng tàu/Tàu/Chuyến khi chọn vận tải Nội Địa.
    + Đổi nhãn linh hoạt: "Lấy cont hàng" & "Trả rỗng" cho Hàng Nhập vs "Cấp rỗng" & "Hạ bãi" cho Hàng Xuất.
  - Nút "Điều Xe" liên thông tự động nạp mã Booking, tuyến đường, loại cont và yêu cầu kỹ thuật sang Modal Điều Động (`modal-dispatch`).

---

### 1. Phân Quyền 2 Sub-Tabs Nghiệp Vụ Thương Mại:
- **Tab 1: Báo Giá & Khách Hàng (Dành cho Sales / Nhân viên Kinh Doanh - NVKD):**
  - Chức năng: Tập trung tìm kiếm khách hàng mới, khảo sát tuyến đường vận chuyển, tính toán cước và lương chuyến, chào giá và theo dõi phê duyệt hợp đồng thương mại.
  - Thẻ KPI con: Báo giá đang đàm phán, Tuyến cước đã duyệt, Doanh thu kế hoạch cam kết.
- **Tab 2: Quản Lý Booking Hãng Tàu (Dành cho Sale Admin / Customer Service - CS):**
  - Chức năng: Tiếp nhận Booking Confirmation từ các hãng tàu quốc tế (Maersk, CMA CGM, ONE, HMM, Cosco...), kiểm soát hạn SI Cut-off, VGM Cut-off, CY Closing Time, quản lý số cont theo đợt và chuyển giao lệnh điều xe sang đội Điều Vận.
  - Thẻ KPI con: Booking chờ điều xe, Booking đang điều xe, Booking đã hoàn thành.

### 2. Dashboard Tình Trạng Kinh Doanh & Hiệu Suất Tăng Trưởng (Màn Hình Chính):
- **Cụm 4 Thẻ KPI Tăng Trưởng So Với Tuần / Tháng Trước:**
  1. *Doanh Thu Kế Hoạch Tuyến:* `429.500.000 đ` (+14.8% so với tháng trước ↗️).
  2. *Tổng Đơn Hàng Booking:* `8 Đơn hàng` (+33.3% / +2 đơn mới trong tuần ↗️).
  3. *Sản Lượng Container Vận Tải:* `20 Cont` (+25.0% so với tuần trước ↗️).
  4. *Tỷ Lệ Chốt Tuyến (Win Rate):* `50.0%` (+12.5% so với tháng trước ↗️).
- **Thanh Sub-tabs AMIS hiện đại:**
  - Hỗ trợ chuyển đổi tab linh hoạt qua hàm `switchSalesSubTab(tabName)` mà không load lại trang.
  - Hiển thị badge số lượng đơn/báo giá động trên tiêu đề tab.
  - Tích hợp nhãn thông báo phân quyền theo chức danh trực quan (`sales-tab-role-hint`).

---

## [1.4.1] - 2026-09-21 (Tái Cấu Trúc Phân Hệ Sale & Booking: Chuẩn Hóa Luồng Báo Giá ➔ Booking & Thứ Tự Khẩn Cấp)

### 1. Tái Cấu Trúc Giao Diện Chuỗi Cung Ứng (Báo Giá Ở Trên ➔ Booking Ở Dưới):
- **Phân định rõ 2 giai đoạn nghiệp vụ trên giao diện (`view_sales.html`):**
  - **Giai đoạn 1 (Phần trên):** Bảng Báo Giá Tuyến Cước & Phễu Khách Hàng (CRM) — Thỏa thuận đơn giá cước vận chuyển, định mức doanh thu và phê duyệt tuyến cước.
  - **Giai đoạn 2 (Phần dưới):** Danh Sách Booking / Đơn Hàng Vận Chuyển Chờ Điều Xe — Tiếp nhận lệnh Booking từ hãng tàu quốc tế và kết nối sang Điều Vận.
- **Chia tách 2 khối Thẻ KPI độc lập:**
  - **Khối Thẻ Báo Giá:** Báo giá đang thương lượng, Tuyến cước đã duyệt, Doanh thu kế hoạch tháng.
  - **Khối Thẻ Booking:** Booking chờ điều xe, Booking đang điều xe, Booking đã hoàn thành.

### 2. Sắp Xếp Booking Theo Mức Độ Khẩn Cấp & Tiến Độ Thời Gian:
- **Nguyên tắc sắp xếp đơn hàng:**
  - Ưu tiên trạng thái: `PENDING_DISPATCH` (Chờ điều xe) và `PARTIALLY_DISPATCHED` (Đang điều xe) luôn nằm trên `COMPLETED`.
  - Ưu tiên ngày giờ: Sắp xếp theo ngày đóng hàng (`loading_date`) tăng dần — **đơn hàng đóng hàng hôm nay / ngày mai luôn nổi lên trên cùng**.
- **Hệ thống cảnh báo trực quan (Badge GẤP):**
  - Đơn hàng có lịch đóng hàng trong vòng 48h tự động gắn badge đỏ nổi bật: `GẤP - Đóng hàng gấp trong 48h`.
  - Tô màu nền cảnh báo nhẹ (`bg-amber-50/20`) để nhân viên điều vận và sale dễ dàng nhận biết tức thì.

### 3. Đồng Bộ Hóa Backend & Frontend:
- **API `SalesAPIView` & `BookingActiveAPIView` (`apps/dispatch/api_views.py`):**
  - Tách nhóm stats thành `quotation_stats` và `booking_stats`.
  - Áp dụng `models.Case` và `models.When` để sắp xếp dữ liệu khẩn cấp nhất quán.
- **Renderer Frontend (`static/js/app.js`):**
  - Hàm `loadSalesData()` cập nhật tự động toàn bộ 6 thẻ KPI và bảng Booking khẩn cấp.

---

## [1.4.0] - 2026-09-21 (Liên Thông Booking Sale ➔ Điều Vận & Chuẩn Hóa Typography UI/UX)

### Tích Hợp 4 Bộ Booking Thực Tế Chuẩn Hãng Tàu Quốc Tế (Maersk, CMA CGM, ONE, HMM):
- **Phân tích và bổ sung các trường chứng từ vận tải biển:**
  - `commodity`: Mô tả hàng hóa thực tế (`Ryobi Blower`, `Máy cắt cỏ TTI`, `Trimmer`, `Bao bì nhựa...`).
  - `hs_code`: Mã phân loại hải quan hàng hóa (`8414.59`, `8433.11`, `8467.29`...).
  - `si_cutoff`: Hạn chót gửi thông tin chi tiết làm B/L (Shipping Instruction Cut-off).
  - `vgm_cutoff`: Hạn chót nộp phiếu cân tải trọng container (Verified Gross Mass Cut-off).
  - `free_time_detention` / `free_time_demurrage`: Quản lý số ngày miễn phí lưu vỏ (DET) và lưu bãi (DEM) theo chuẩn từng hãng tàu.
- **Nạp bộ dữ liệu 4 Booking mẫu thực tế:**
  1. `BK-CMA-3452548` (CMA CGM - Lô 2 cont 40HC máy cắt cỏ TTI - Cấp rỗng ICD Phúc Long ➔ TTI Củ Chi ➔ Hạ Gemalink Vũng Tàu).
  2. `BK-ONE-5448700` (ONE - Lô 5 cont 40HC dụng cụ Ryobi TTI - Cấp rỗng Sowatco Long Bình ➔ TTI Củ Chi ➔ Hạ ICD Phước Long 3).
  3. `BK-HMM-90497300` (HMM - Lô 2 cont 40HC máy tỉa hàng rào - Cấp rỗng Sowatco Long Bình ➔ TTI Củ Chi ➔ Hạ ICD Phước Long 3).
  4. `BK-MAE-276081838` (Maersk - 1 cont 40HC bao bì nhựa - Cấp rỗng Solog Depot ➔ Nhà máy An Di ➔ Hạ ICD Sowatco Long Bình).

### Chuẩn Hóa Trình Bày Dữ Liệu Bảng Điều Độ (Khắc Phục Cỡ Chữ & Truncate):
- **Phân cấp Typography khoa học:**
  - Dòng chính: `text-[13px] font-bold text-slate-800` (rõ nét, chuẩn độ tương phản).
  - Dòng phụ: `text-xs (12px) font-medium text-slate-600` (dễ đọc, loại bỏ triệt để cỡ chữ 9px-10px lí nhí).
- **Loại bỏ lỗi cắt cụt chữ (`truncate`):**
  - Cột Khách hàng & Kho: Hiển thị đầy đủ tên doanh nghiệp và kho bốc/dỡ hàng, khoảng cách đệm thoáng.
  - Cột Lộ trình 3 điểm: Hiển thị mạch lạc `Nơi lấy ➔ Kho đóng ➔ Nơi hạ` không bị cắt cụt `TAKIGAWA VS...`.
  - Cột Cont/Booking/Seal: Bố cục font-mono gọn gàng, tách biệt số B/L và số Chì.

### Kiến Trúc Liên Thông Booking (Sale) ➔ Lệnh Điều Động (Điều Vận):
- **Model `BookingOrder` (`apps/customers/models.py`):**
  - Quản lý các đơn hàng vận chuyển do Sale/CS chốt với khách hàng và hãng tàu.
  - Lưu trữ 9 thông tin cốt lõi: Khách hàng, Số Booking/BL, Hãng tàu, Loại cont, Tổng số cont, Số cont đã điều, Lộ trình 3 điểm, Cắt máng CY, Lịch đóng hàng, Đơn giá cước thỏa thuận.
  - Migrations: `customers.0002_bookingorder` và `dispatch.0005_dispatchtrip_booking_order`.
- **API `BookingActiveAPIView` (`/api/bookings/active/`):**
  - Cung cấp danh sách Booking đang chờ/đang điều xe kèm số cont còn lại cho Điều Vận.
- **Kế Thừa Dữ Liệu 1 Chạm Trong Modal Tạo Lệnh (`modal_create_trip.html` & `app.js`):**
  - Tích hợp Dropdown thông minh trên đầu Form: **"Chọn Booking / Đơn Hàng Từ Sale"**.
  - Tự động điền 9 trường dữ liệu khi chọn Booking: Khách hàng, B/L, Loại cont, Giờ cắt máng CY, Lịch đóng hàng, Lộ trình 3 điểm, Doanh thu cước.
  - Điều độ viên chỉ cần gán Xe, Tài xế, Số Cont, Số Seal, Invoice & Dock.
  - Tự động tăng tiến độ `dispatched_containers` và cập nhật trạng thái Booking (`PARTIALLY_DISPATCHED` hoặc `COMPLETED`).
- **Nâng Cấp Màn Hình Sale & Báo Giá (`view_sales.html` & `app.js`):**
  - Bổ sung bảng quản lý Booking Order, theo dõi thanh tiến độ điều xe (VD: `1/3 Cont`).
  - Nút **"🚀 Điều Xe"** mở thẳng modal Tạo Lệnh Điều Động và tự động chọn sẵn Booking tương ứng.

---

## [1.3.0] - 2026-09-21 (Chuẩn Hóa Bảng Điều Độ Logistics Thực Tế & Đối Soát Excel Triền Võ)

### Đối Chiếu Bảng Excel Điều Độ Hiện Trường (Media Triền Võ Logistics):
- **Bổ sung 6 nhóm trường dữ liệu thực tế từ Excel:**
  1. `commercial_invoice`: Hóa đơn thương mại đi kèm hàng hóa (Commercial Invoice - ví dụ `VCC33970`, `VCC33077`), phân biệt với hóa đơn nâng/hạ cảng.
  2. `warehouse_dock`: Cửa xuất nhập kho (Cửa Dock - ví dụ `D2`, `DP`), định tuyến xe bốc hàng tại kho lớn (như TTI Củ Chi).
  3. `dropoff_vehicle`: Quản lý xe hạ cont tách biệt với xe kéo ban đầu khi có sang tải/đổi đầu kéo.
  4. `cont_location_type`: Phân loại vị trí vỏ cont (`NHÀ MÁY`, `BÃI TVL`, `CẢNG / DEPOT`).
  5. **Chuỗi 5 mốc thời gian kho khách hàng:** Theo dõi `ETA Đến Kho`, `Giờ Kho Gọi Vào`, `Giờ Xe Vào Thực Tế`, `Giờ Kho Gọi Ra`, `Giờ Xe Ra Thực Tế` để giải quyết bài toán phạt lưu xe / phạt trễ giờ đóng cont.
  6. **Phân loại nguồn xe (`ownership_type`):** Phân biệt `Xe Nhà` (Đội xe công ty) và `Xe Bạn` (Thuê ngoài / 3PL Subcontractor) kèm màu sắc nhận diện trực quan (Teal vs Amber).

### Nâng Cấp Kiến Trúc & Database Migration:
- **`apps/fleet/models.py`:** Thêm enum `VehicleOwnership` (`OWNED`, `SUBCONTRACTOR`) và trường `ownership_type` vào model `Vehicle`. Migration: `fleet.0002_vehicle_ownership_type`.
- **`apps/dispatch/models.py`:** Mở rộng `DispatchTrip` lưu trữ đầy đủ 12 trường dữ liệu vận hành từ Excel. Migration: `dispatch.0004_dispatchtrip_actual_gate_in_time_and_more`.
- **Nạp bộ dữ liệu thực tế (Seed Data):** Nạp thành công 7 chuyến xe thực tế từ bảng Excel vào Database:
  - `TVL-0917-001` (Cát Đằng HL2), `TVL-0917-002` (Andi Bãi TVL), `TVL-0917-003` (Andi TVL), `TVL-0917-004` (MOL TTI Củ Chi OP - VCC33970), `TVL-0917-005` (MOL TTI Củ Chi OP - VCC33077 - D2), `TVL-0917-006` (Vicaco Đồng Tháp - Xe nhà), `TVL-0917-007` (Takigawa - Xe bạn).

### Giao Diện Web ERP & Frontend:
- **`templates/views/view_dispatch.html` & `static/js/app.js`:**
  - Thiết kế bảng điều độ 8 cột mới: `Mã / Lịch Đóng`, `Khách hàng & Kho`, `Booking / Cont / Seal`, `Invoice / Dock`, `Xe Kéo & Xe Hạ`, `Lưu Ý & Vị Trí Cont`, `Nơi Lấy ➔ Nơi Hạ`, `Trạng thái`.
  - Hiển thị badge Xe Nhà / Xe Bạn, badge Cửa Dock, mã hóa đơn thương mại font-mono sắc nét.
- **`templates/components/modal_create_trip.html`:** Bổ sung ô nhập Hóa đơn thương mại, Cửa Dock, Ngày/Giờ đóng hàng, Vị trí cont.
- **`templates/views/view_trip_detail.html`:** Bổ sung khối **"Tiến Độ Thời Gian Tại Kho Khách Hàng (5 Mốc Thực Tế)"** và thẻ thông tin nguồn xe/xe hạ/vị trí cont.

---

## [1.2.0] - 2026-09-21 (Vòng Đời Chi Phí, Xử Lý Nhập Nhầm & Khóa Sổ Kế Toán Bất Khả Xâm Phạm)

### Phân Tích Nghiệp Vụ Chuyên Sâu & Vòng Đời Chi Phí Hiện Trường:
- **Ma trận trạng thái 3 cấp độ:**
  1. `PENDING` (Chờ duyệt): Tài xế tự do sửa/xóa các khoản vừa nhập nhầm (số tiền, danh mục, số HĐ).
  2. `APPROVED` (Đã duyệt): Điều độ viên/Kế toán đã duyệt, tài xế bị khóa sửa để bảo vệ dữ liệu vận hành.
  3. `SETTLED` (Đã chốt sổ Kế toán): Toàn bộ bảng kê bị **KHÓA CỨNG (READ-ONLY)**, bất khả xâm phạm.
- **Bảo vệ toàn vẹn dữ liệu Kế toán:**
  - `apps/billing/models.py`: Thêm `ApprovalStatus.SETTLED`, trường `approved_at`, hàm `clean()` và `delete()` chặn sửa/xóa khi `trip.is_expenses_settled = True`.
  - `apps/dispatch/models.py`: Thêm `is_expenses_settled`, `settled_at`, `settled_by`.
  - Backend API: Trả về **HTTP 403 Forbidden** khi có yêu cầu thêm/sửa/xóa trên chuyến xe đã chốt sổ.
  - Soft-Delete: Áp dụng xóa mềm bảo toàn lịch sử kiểm toán vận tải.

### Tính Năng Mới Cho Điều Vận & Kế Toán (Web CMS):
- **Nút "🔒 Chốt Sổ Kế Toán":** Khóa sổ toàn bộ chi phí chuyến xe sau khi nghiệm thu chứng từ.
- **Nút "🔓 Mở Sổ":** Dành cho Kế toán trưởng mở khóa đối soát lại khi có sai sót.
- **Thao tác nhanh trên từng dòng chi phí:** Nút ✏️ Sửa (mở modal chỉnh sửa số tiền, số HĐĐT, mã tra cứu, link tra cứu) và 🗑️ Xóa (Soft-delete có xác nhận).
- **Banner Khóa Sổ:** Hiển thị nổi bật cảnh báo bảng kê đã được kế toán chốt sổ.

### Tính Năng Mới Cho Tài Xế (Mobile Simulator & Hiện Trường):
- **Giao diện thẻ chi phí thông minh:** Hiển thị rõ trạng thái `Chờ duyệt` (có nút ✏️ Sửa, 🗑️ Xóa), `Đã duyệt` (Khóa), `Đã chốt sổ` (Khóa Kế toán).
- **Nút báo mốc kho 1 chạm (Bước 6 SOP):** 4 nút bấm tức thời:
  - 🚗 *Sắp đến kho (trước 30p)*
  - 📍 *Đã đến cổng kho*
  - 📦 *Bắt đầu dỡ/đóng hàng*
  - ✅ *Hoàn tất đóng hàng*

---

## [1.1.0] - 2026-09-21 (Chuẩn Hóa Bảng Kê Chi Phí Thực Tế & Lệnh Điều Động Triền Võ)

### Phân Tích & Chuẩn Hóa Chi Phí Hiện Trường (5 Chứng Từ Thực Tế Triền Võ):
- **Phân rã 8 hạng mục chi phí chuẩn theo Bảng Kê Chi Phí thực tế:**
  1. `HĐ điện tử`: Quản lý thông tin hóa đơn điện tử Cảng/Depot, hỗ trợ lưu `invoice_number`, `invoice_lookup_code`, `invoice_lookup_url` và nút bấm tra cứu trực tiếp trên trình duyệt (VNPT-Invoice, Solog e-Hoadon).
  2. `Nâng`: Phí nâng container rỗng/hàng tại Cảng/Depot (khớp với Phiếu báo tra cứu nâng rỗng Công ty Vận tải Anh Phong - 1.925.000 đ).
  3. `Hạ`: Phí hạ container tại Cảng/ICD (khớp với Biên nhận tiền Cảng ICD Tây Nam - 1.518.000 đ).
  4. `Cược cont`: Tiền đặt cược vỏ container với hãng tàu.
  5. `Cân xe`: Phí trạm cân tải trọng, chứng chỉ VGM.
  6. `Bốc xếp`: Phí nhân công đóng hàng, trút hàng bãi/kho.
  7. `Vé cầu đường`: Phí qua trạm BOT, vé phà, ePass/VETC.
  8. `Chi phí khác`: Lưu bãi quá hạn, lưu ca xe, vá vỏ, sửa chữa gấp dọc đường.
  - **Dòng Tổng Chi Phí Chuyến Xe:** Tự động tính tổng cộng các khoản phát sinh và đối soát với P&L doanh thu cước khách hàng.
  - **Tính năng Mở rộng Accordion Xem Chi Tiết Từng Dòng Con:** Khi một khoản mục (ví dụ Vé cầu đường có nhiều vé trạm) có $\ge 2$ khoản chi, dòng cha hiển thị số tổng gộp kèm badge đếm số lượng; người dùng bấm vào dòng hoặc nút "Chi tiết" để xổ xuống xem chi tiết từng vé (STT phân cấp 7.1, 7.2..., thành tiền riêng, số hóa đơn, link tra cứu online và đơn vị thu/trạm BOT).
- **Nâng cấp Database Models (`apps/billing/models.py` & `apps/dispatch/models.py`):**
  - Mở rộng `TripExpense` lưu vết: `invoice_issuer`, `invoice_number`, `invoice_lookup_code`, `invoice_lookup_url`, `amount_before_tax`, `tax_rate`, `tax_amount`.
  - Mở rộng `DispatchTrip` lưu vết thông tin vận tải & EIR: `pickup_depot`, `dropoff_depot`, `delivery_warehouse`, `eir_number`, `shipping_line`, `vessel_voyage`, `destination_port`, `vgm_weight`.
- **Nạp bộ dữ liệu thực tế (`seed_data`):**
  - Chuyến `TVL-0916-007`: Xe `50H-896.50`, Tài xế Phong, Khách hàng AN DI VN, Cont `MRKU6074874` (40HC), Phiếu EIR 1955, HĐĐT ICD Tây Nam 138001 (1.518.000 đ), Vé BOT (30.000 đ).
  - Chuyến `TVL-0916-008`: Xe `50H-896.50`, Tài xế Phong, Khách hàng AN DI VN, Cont `CSNU8011022` (40HC), Phiếu EIR AP-622 0034976, HĐĐT Anh Phong 0060962 (1.925.000 đ), Vé BOT (100.000 đ).

### Nâng Cấp Modal Tạo Lệnh Điều Động Mới (`modal_create_trip.html`):
- **Phân loại Loại Cont / Xe chuẩn:**
  - **Container Chuẩn:** `45G1` (Cont 45 Feet), `40HC` (High Cube), `40GP` (General Purpose), `22GP` (Cont 20 Feet).
  - **Đội Xe Tải:** `1T`, `2T`, `2T5`, `3T`, `5T`, `8T`, `10T`, `15T`.
- **Bổ sung ô nhập "Cắt Máng CY / Giờ SI":** Nằm ở hàng 2 kế bên ô Số Seal, hiển thị viền nổi bật để điều độ theo dõi hạn chót cắt máng cảng/tàu.
- **Bổ sung Modal "Thêm Khoản Chi Phát Sinh"**: Cho phép nhập nhanh các khoản chi phí phát sinh, mã hóa đơn điện tử tra cứu trực tiếp.

---

## [1.0.0] - 2026-09-21 (Bản Khởi Tạo Hoàn Chỉnh - TMS Core Release)

### Kiến Trúc & Cơ Sở Dữ Liệu (Database & Modular Monolith):
- Thiết kế và triển khai 8 phân hệ chuyên biệt theo kiến trúc Modular Monolith:
  - `core`: `TimeStampedModel`, `SoftDeleteModel`, `TrackingEventLog`, State Machine Engine.
  - `apps/fleet`: `Vehicle`, `Trailer`, cảnh báo tự động hạn đăng kiểm và lịch bảo dưỡng định kỳ.
  - `apps/personnel`: `Employee`, phân quyền phòng ban, quản lý số GPLX hạng FC, lương cơ bản và tạm ứng.
  - `apps/customers`: `Customer`, `RouteTariff` (biểu cước 3 điểm), `Quotation` (báo giá & CRM).
  - `apps/dispatch`: `DispatchTrip`, `TripTimelineItem`, bộ đệm tài chính Denormalization via Signals.
  - `apps/documents`: `TripDocument`, phân loại EIR lấy/hạ, POD, hóa đơn kèm dữ liệu OCR.
  - `apps/billing`: `TripExpense`, quản lý phê duyệt chi phí phát sinh hiện trường.
  - `apps/exceptions`: `TripException`, xử lý sự cố kẹt cảng, hỏng vỏ cont, tai nạn theo Bước 9.
- Áp dụng nguyên tắc bất khả xâm phạm dữ liệu vận tải (**No Hard-Delete**), toàn bộ khóa ngoại dùng `PROTECT`.
- Tạo thành công toàn bộ migration và nạp bộ dữ liệu mẫu thực tế chuẩn xác (`seed_data`) khớp 100% tài liệu điều vận.

### Chuẩn Hóa Typography Quốc Tế & Cấu Trúc UI/UX Modular (Bim_ERP-Solutions Standard):
- **Đồng bộ hóa 100% triết lý UI/UX từ `Bim_ERP-Solutions` (MISA AMIS Enterprise Standard):**
  - **Sidebar Contrast Theme:** Áp dụng kích thước chuẩn `280px` (`17.5rem`), màu nền `#253147` (header `#1a2334`), menu active phủ nền `rgba(13, 148, 136, 0.25)` với viền nhấn `#2dd4bf`.
  - **MISA ERP Table System:** Toàn bộ bảng dữ liệu chuyển sang chuẩn `.erp-table-container` và `.erp-table` với padding `10px 14px`, header `#f8fafc`, hỗ trợ `tabular-nums` căn thẳng hàng số liệu cước và tiền lương.
  - **Button Design System:** Chuẩn hóa `.btn-amis-primary` (Teal `#0d9488`, hover `#0f766e`, bo góc 8px) và `.btn-amis-secondary` (nền trắng viền `#cbd5e1`).
  - **Graceful Notification & Defensive UI (Tuyệt đối không để crash 500):**
    - Tích hợp hệ thống Toast cảnh báo nổi `#toast-container` góc trên phải màn hình với 3 trạng thái thân thiện (thành công, cảnh báo, lỗi kết nối).
    - **Inline Field Validation:** Đổi viền ô nhập sang đỏ (`.input-error`), hiển thị giải thích nhỏ `.field-error-msg`, tự động xóa lỗi thời gian thực ngay khi người dùng bắt đầu gõ phím (`input event`).
- Nâng cấp Typography chuẩn doanh nghiệp quốc tế:
  - **Plus Jakarta Sans**: Phông chữ hình học hiện đại (Geometric Sans) cho hệ thống tiêu đề (`h1-h6`), thẻ KPI và bảng phân tích số liệu tài chính (`tabular-nums`).
  - **Be Vietnam Pro**: Phông chữ được tối ưu hóa đặc biệt cho tiếng Việt với tỉ lệ vàng dấu thanh, độ tương phản cao, mang lại trải nghiệm đọc mượt mà cho nội dung vận tải và bảng biểu.
- Tái cấu trúc toàn bộ hệ thống Templates theo tiêu chuẩn công nghiệp:
  - Layout khung sườn: [`templates/base.html`](file:///e:/Bim_Logistics/templates/base.html) và [`templates/index.html`](file:///e:/Bim_Logistics/templates/index.html).
  - Tách thành các components độc lập:
    - [`templates/components/sidebar.html`](file:///e:/Bim_Logistics/templates/components/sidebar.html)
    - [`templates/components/topbar.html`](file:///e:/Bim_Logistics/templates/components/topbar.html)
    - [`templates/components/modal_create_trip.html`](file:///e:/Bim_Logistics/templates/components/modal_create_trip.html)
    - [`templates/components/modal_ocr.html`](file:///e:/Bim_Logistics/templates/components/modal_ocr.html)
  - Tách thành 7 phân hệ view chuyên biệt trong `templates/views/`:
    - `view_dashboard.html`, `view_dispatch.html`, `view_trip_detail.html`, `view_personnel.html`, `view_fleet.html`, `view_customs.html`, `view_sales.html`.
  - Tách riêng tệp stylesheet và script:
    - [`static/css/main.css`](file:///e:/Bim_Logistics/static/css/main.css)
    - [`static/js/app.js`](file:///e:/Bim_Logistics/static/js/app.js)

### Giao Diện Web & Trải Nghiệm Người Dùng (UI/UX):
- Xây dựng giao diện Single Page hiện đại theo chuẩn màu BIM Ecosystem (`teal-700`, `emerald-600`, `amber-500`, `rose-600`).
- Tích hợp 6 màn hình quản trị nghiệp vụ:
  1. Tổng quan Ban Giám Đốc (Quỹ tiền, năng suất chuyến xe, trạng thái xe, P&L chuyến).
  2. Bảng Điều Độ Vận Tải (Bộ lọc, tìm kiếm, modal tạo lệnh điều động mới lưu trực tiếp vào DB).
  3. Chi tiết chuyến xe (Timeline 10 bước động, thông tin chứng từ & chi phí phát sinh).
  4. Quản lý Nhân sự & Bảng lương chuyến tạm tính.
  5. Quản lý Xe & Bãi với cảnh báo thông minh hạn đăng kiểm.
  6. Thủ tục Hải Quan & Quản lý Kinh Doanh Báo giá.
- Tích hợp Mobile Simulator cho tài xế với camera OCR giả lập nhận diện hóa đơn và trả chứng từ EIR/POD.

### Triển Khai Docker & Quản Trị Cổng Mạng (Docker Deployment):
- Khởi tạo `Dockerfile` (Python 3.12-slim) và `docker-compose.yml`.
- Tách biệt 2 container:
  - `bim_logistics_postgres`: Container PostgreSQL 16 Alpine với volume bền vững `bim_logistics_postgres_data`.
    - Cổng Database host: **`5435:5432`** (tránh cổng 5433 của `bim_erp_postgres`).
  - `bim_logistics_web`: Container Django Web Application kết nối qua mạng nội bộ Docker.
    - Cổng Web host: **`8085:8000`** (tránh cổng 8080 của Paperless và các dịch vụ khác).
- Cấu hình linh hoạt tại `config/settings.py`: Tự động nhận diện môi trường Docker PostgreSQL, đồng thời hỗ trợ fallback SQLite3 khi chạy local mà không cần sửa code.
- Xây dựng test suite tự động `core.tests` bao gồm 5 ca kiểm thử:
  - Soft-delete bảo toàn dữ liệu.
  - State Machine chuyển trạng thái nghiêm ngặt và chặn nhảy cóc.
  - Tự động cập nhật P&L chuyến xe khi có chi phí phát sinh.
  - Kiểm tra REST API Dashboard Ban Giám Đốc.
  - Kiểm tra REST API tạo lệnh điều động mới.
- Kết quả: **5/5 tests passed (100% OK)**.
