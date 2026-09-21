# CHANGELOG — BIM LOGISTICS PLATFORM

Tất cả các thay đổi kiến trúc và mã nguồn được ghi nhận theo chuẩn Documentation-as-Code.

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

### Chuẩn Hóa Typography Quốc Tế & Cấu Trúc UI/UX Modular:
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
