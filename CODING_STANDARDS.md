# BIM LOGISTICS — CODING STANDARDS & ENGINEERING GUIDELINES
(QUY CHUẨN LẬP TRÌNH & KIẾN TRÚC HỆ THỐNG BIM_LOGISTICS)

> **Kế thừa & Tổng hợp từ:** `Bim_ERP-Solutions` (Modular Monolith, Data Safety, Defensive Backend) và `Bim_Consulting` (Business First, State Machine, Caching Signals & Design Tokens).  
> **Áp dụng cho:** Toàn bộ mã nguồn, cấu hình database, API và giao diện của nền tảng **Bim_Logistics** (TMS, WMS, Fleet & Supply Chain Management).

---

## I. TRIẾT LÝ KIẾN TRÚC CỐT LÕI (CORE ARCHITECTURE)

### 1. Business First — Technology Second
- Mọi quyết định kỹ thuật (cấu trúc bảng, API, UI/UX) đều phải phục vụ trực tiếp cho tính liên tục của chuỗi cung ứng và hiện trường vận tải (tài xế, điều phối, thủ kho). Không tối ưu kỹ thuật bằng cách phá vỡ luồng vận hành thực tế.

### 2. Kiến trúc Modular Monolith
Hệ thống tổ chức theo mô hình Modular Monolith đồng bộ với BIM ERP:
```text
Bim_Logistics/
├── core/                  # Nền tảng dùng chung
│   ├── models/            # BaseModel, TimeStampedModel, SoftDeleteModel
│   ├── audit/             # ActivityLog, TrackingEventLog
│   ├── security/          # HashID IDOR prevention, JWT Helper
│   └── workflows/         # State Machine Engine cho đơn vận và chuyến xe
├── apps/ (hoặc modules/)
│   ├── fleet/             # Quản lý phương tiện, thiết bị, bảo dưỡng, tài xế
│   ├── orders/            # Đơn hàng vận tải, Vận đơn (BOL), gom hàng (Consolidation)
│   ├── dispatch/          # Điều phối xe, lập chuyến, phân bổ tuyến đường
│   ├── tracking/          # Giám sát hành trình, mốc Milestone, GPS logs
│   ├── warehouse/         # Quản lý kho (WMS), vị trí bin/rack, nhập/xuất/tồn
│   ├── billing/           # Tính cước, biểu phí (CBM/Gross Weight), phụ phí lưu kho
│   └── exceptions/        # Xử lý sự cố (OS&D - Over, Short, Damage), bồi thường
```

---

## II. QUY CHUẨN CƠ SỞ DỮ LIỆU & ORM (DATABASE & ORM STANDARDS)

### 1. Kế thừa Model Chuẩn mực
- Mọi model nghiệp vụ bắt buộc phải kế thừa `TimeStampedModel` (`created_at`, `updated_at`).
- Mọi dữ liệu giao dịch (Đơn vận, Chuyến xe, Kiện hàng, Chứng từ POD, Sự cố) bắt buộc kế thừa `SoftDeleteModel` (`is_deleted=True`).

### 2. Nguyên tắc Bất Khả Xâm Phạm Dữ Liệu & Không Xóa Cứng (No Hard-Delete)
- **Tuyệt đối cấm `.delete()` cứng** trên các bảng dữ liệu vận tải và chứng từ. Mọi thao tác hủy đều chuyển trạng thái `CANCELLED` hoặc `is_deleted = True`.
- **Ràng buộc Khóa ngoại an toàn:** Luôn chỉ định rõ `related_name`. Thiết lập `on_delete=models.PROTECT` đối với các bảng tham chiếu quan trọng (Xe, Tài xế, Khách hàng, Biểu phí), tránh dùng `CASCADE` gây xóa dây chuyền dữ liệu lịch sử vận đơn.

### 3. Hiệu năng & Chống nghẽn N+1 Query
- **Denormalization & Signal Caching:** CẤM lặp vòng `for` trên Template hoặc View để tính toán tổng trọng lượng chuyến, tổng thể tích CBM hay trạng thái chặng. Phải tính toán tự động và cache vào các trường tổng hợp (`cached_total_weight`, `cached_cbm`, `current_status`) thông qua **Django Signals** hoặc transaction hook khi kiện hàng thay đổi.
- **Tối ưu truy vấn danh sách lớn:** Mọi Query/API lấy danh sách đơn hàng hoặc chuyến xe phải sử dụng `select_related` (cho Foreign Key 1-1, N-1) và `prefetch_related` (cho Many-to-Many, quan hệ ngược).
- **Đánh Index chính xác:** Luôn đánh `db_index=True` hoặc `UniqueConstraint` cho các trường tìm kiếm thường xuyên: mã vận đơn (`tracking_code`), mã chuyến (`trip_code`), biển số xe (`license_plate`), mốc thời gian sự kiện (`event_time`).

### 4. Quy tắc An toàn Môi trường Database
- Trước khi chạy `makemigrations`, `migrate`, seed test data hoặc chạy test suite, bắt buộc kiểm tra kết nối với Database Container (Docker PostgreSQL). Không tự ý âm thầm fallback sang DB khác.
- Tuyệt đối không tự ý chạy script sửa đổi trực tiếp dữ liệu DB trên môi trường thực tế khi chưa có kịch bản phê duyệt rõ ràng.

---

## III. QUY CHUẨN VIẾT CODE BACKEND & API (BACKEND & API STANDARDS)

### 1. Quy ước Đặt tên (Naming Conventions)
- **Models / Classes:** PascalCase (VD: `ShipmentOrder`, `FreightTrip`, `DeliveryMilestone`).
- **Fields / Methods / Variables:** snake_case (VD: `tracking_code`, `gross_weight`, `calculate_freight_charge()`).
- **Apps / Directories:** lowercase (VD: `dispatch`, `tracking`).
- **API Endpoints:** kebab-case, danh từ số nhiều (VD: `/api/v1/shipment-orders/`, `/api/v1/trips/{hash_id}/track/`).

### 2. Máy Trạng thái Vận tải Nghiêm ngặt (State Machine)
- Vòng đời đơn vận tải phải tuân thủ nghiêm ngặt:
  $$\text{Draft} \longrightarrow \text{Dispatched} \longrightarrow \text{Picked Up} \longrightarrow \text{In Transit} \longrightarrow \text{Out for Delivery} \longrightarrow \text{Delivered} \longrightarrow \text{POD Verified} \longrightarrow \text{Settled}$$
- Mọi thao tác đổi trạng thái phải đi qua service trung tâm (`core.workflows` / transition method). Cấm thực hiện gán trực tiếp `order.status = 'DELIVERED'` tùy tiện trong View nếu chưa thỏa mãn điều kiện tiên quyết (ví dụ: đã đính kèm ảnh chụp POD).

### 3. Kiến trúc Phòng thủ Backend (Defensive Backend)
- **Validate trước khi gán DB:** Mọi View xử lý POST/PUT phải kiểm tra tính hợp lệ của trọng tải, thể tích, giới hạn tải trọng trục xe và tính logic của mốc thời gian trước khi lưu.
- **Bắt ngoại lệ toàn diện:** Mọi khối lệnh lưu dữ liệu, gọi API dịch vụ 3PL hoặc xử lý tệp phải bọc trong `try...except Exception as e:`.
- **Tuyệt đối không để văng lỗi 500:** Khi có lỗi, backend ghi log chi tiết (`logger.error`) và phản hồi thông điệp lỗi nghiệp vụ an toàn qua `messages.warning()` (với Django Templates) hoặc `{ "success": false, "message": "..." }` kèm HTTP code thích hợp (với REST API).

### 4. Chuẩn REST API & Sẵn sàng cho Ứng dụng Di động
- Sử dụng **HashID** hoặc UUID cho các mã định danh công khai trên URL để chống tấn công IDOR.
- Xác thực API qua **Simple JWT**.
- Payload cho app tài xế/kho phải tinh gọn, hỗ trợ cơ chế lưu tạm ngoại tuyến (Offline-friendly cache) và tự động đồng bộ lại khi có kết nối mạng.

---

## IV. QUY CHUẨN GIAO DIỆN & TRẢI NGHIỆM (UI/UX & DESIGN TOKENS)

Hệ thống kế thừa chuẩn mực bảng màu thương hiệu của BIM Ecosystem:

| Token | Màu Tailwind | Ý nghĩa & Phạm vi Ứng dụng trong Logistics |
| :--- | :--- | :--- |
| **Primary Brand** | `teal-700` / `teal-800` | Màu thương hiệu chủ đạo: Header, Sidebar active, Nút chính, Mã đơn vận |
| **Success** | `emerald-600` / `emerald-700` | Giao hàng thành công, POD đã ký duyệt, Xe sẵn sàng hoạt động |
| **Warning / InProgress** | `amber-500` / `amber-600` | Đang vận chuyển, Chờ gom hàng, Xe đang bốc dỡ, Cần chú ý |
| **Neutral / Draft** | `stone-400` / `stone-600` | Đơn hàng nháp, Chưa điều xe, Trạng thái chờ |
| **Information** | `blue-600` / `blue-700` | Thông tin hành trình, Mốc trạm dừng, Điều phối viên đã tiếp nhận |
| **Exception / Danger** | `rose-600` / `rose-700` | Sự cố OS&D: Hàng hỏng hóc, Thất lạc, Giao trễ, Hỏng xe khẩn cấp |

*Tuyệt đối không dùng màu Red/Green/Yellow nguyên bản gây chói mắt và phá vỡ tính thẩm mỹ doanh nghiệp.*

### Hai cơ chế cảnh báo dữ liệu bắt buộc:
1. **Inline Field Validation (Tại chỗ):** Ô nhập sai đổi viền sang `border-rose-500`, có dòng mô tả lỗi màu đỏ phía dưới (*“Trọng lượng không được vượt quá tải trọng xe”*). Tự động xóa cảnh báo đỏ ngay khi người dùng bắt đầu gõ phím.
2. **Toast / Popup Alert (Góc màn hình):** Cảnh báo tông vàng hổ phách/cam thân thiện, tự động focus chuột vào trường lỗi đầu tiên.

### Nguyên tắc thao tác hiện trường (2-Touch Rule):
- Giao diện dành cho tài xế cập nhật trạng thái hoặc quét mã QR POD phải hiển thị nút bấm to tối thiểu 44px, độ tương phản cao, thao tác hoàn tất trong vòng 2 chạm trên màn hình di động.

---

## V. GHI NHẬT KÝ & TRUY VẾT PHÁP LÝ (AUDIT & COMPLIANCE)

1. **Chuỗi sự kiện bất biến (Immutable Event Sourcing):** Mọi sự kiện quét mã vạch, thay đổi vị trí trạm, bàn giao ký nhận và hình ảnh chứng từ POD phải được ghi nhận vào `TrackingEventLog` với đầy đủ: `timestamp`, `actor_id`, `latitude/longitude`, `event_type`.
2. **Tuân thủ Pháp lý & Thuế Việt Nam:**
   - Vận đơn (BOL) và Biên bản giao nhận (POD) phải đầy đủ trường thông tin theo quy định của Luật Thương mại 2005.
   - Luồng tính phí vận tải, phụ phí xăng dầu và lưu kho bãi phải khớp đúng với quy định hóa đơn điện tử dịch vụ logistics (Nghị định 123/2020/NĐ-CP) để sẵn sàng kết nối sang phân hệ Kế toán của `Bim_ERP-Solutions`.

---

## VI. QUY CHUẨN TRÌNH BÀY BẢNG DỮ LIỆU ENTERPRISE (BIM TABLE STANDARD)

Toàn bộ bảng dữ liệu danh mục, điều vận, đối soát và kế toán trên hệ thống BIM Logistics bắt buộc tuân thủ quy chuẩn thiết kế gọn gàng, giãn dòng chuẩn như Excel, tối ưu hóa không gian hiển thị (hiển thị trọn vẹn 20 dòng trên màn hình tiêu chuẩn):

### 1. Kích Thước & Giãn Dòng Chuẩn (Dimensions & Density)
- **Tiêu đề bảng (Header `<th>`):**
  - Chiều cao dòng: Cố định `36px` (`sticky top-0 bg-slate-100 z-10`).
  - Padding: `py-2 px-3` (hoặc `padding: 7px 12px` trong CSS).
  - Phông chữ: `12.5px`, `font-bold text-slate-700 uppercase tracking-wider`.
  - Đường kẻ: Viền dưới `border-b border-slate-300`, đường kẻ ngăn cột dọc `border-r border-slate-200/90 last:border-r-0`.
- **Dòng dữ liệu đơn hàng (Single-line `<tr>` / Master Data):**
  - Chiều cao dòng: `34px - 36px` (chuẩn mật độ cao như Excel, không để khoảng trống thừa).
  - Padding ô dữ liệu `<td>`: `py-1.5 px-3` (hoặc `padding: 6px 12px`).
  - Phông chữ chính: `13px` (`text-[13px] text-slate-900`).
  - Phân cách dòng: Viền dưới `border-b border-slate-200/70`, viền cột `border-r border-slate-200/70 last:border-r-0`.
- **Dòng dữ liệu đa tầng (Multiline `<tr>` / Dispatch Trips / Accordion):**
  - Chiều cao dòng: `46px - 48px` (chứa dòng thông tin chính và dòng phụ).
  - Padding ô dữ liệu `<td>`: `py-2 px-3` (hoặc `padding: 7px 12px`).
  - Khoảng cách dòng chính và sub-text: Cố định `mt-0.5` (`margin-top: 2px`, `line-height: 1.25`), tuyệt đối không dùng `mt-1` hay `mt-2` gây loãng layout.
  - Phông chữ chính: `text-[13px] font-bold text-slate-900 leading-snug`.
  - Phông chữ phụ (Subtext): `text-[11.5px] font-medium text-slate-500 leading-tight`.

### 2. Canh Chỉnh & Kiểu Dữ Liệu Ô (Cell Alignment & Formats)
- **Cột Số & Tiền tệ:** Luôn canh phải (`text-right font-mono tabular-nums text-[13px] font-bold`).
- **Mã định danh / Biển số / Container:** Phông đơn cách (`font-mono font-bold text-[12.5px] text-slate-900` hoặc `text-teal-800`).
- **Trạng thái & Nhãn (Pill Badges):** Kích thước siêu gọn `text-[10.5px] - 11px`, padding `px-2 py-0.2 rounded-full font-bold uppercase`.
- **Thao tác nhanh (Action Buttons):** Nút biểu tượng nhỏ `p-1 text-sm rounded hover:bg-slate-100`.

### 3. Quy Ước Lớp CSS (Immutable Classes)
- Bắt buộc gắn class `.erp-table` hoặc `.bim-table` trên thẻ `<table>`.
- Sử dụng `.erp-table-container` để bọc bảng có scroll dọc, giữ Header `sticky`.
- Class tiện ích: `.row-multiline`, `.erp-subtext` / `.bim-subtext`, `.erp-number-cell`.
