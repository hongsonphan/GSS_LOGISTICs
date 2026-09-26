# TÀI LIỆU DỰ ÁN BIM LOGISTICS (TMS & WMS PLATFORM)

> **Dự án:** BIM Logistics Platform (Triền Võ Logistics)  
> **Phiên bản:** 1.8.1 (Production Demo)  
> **Cập nhật:** 25/09/2026  
> **Mô hình tài liệu:** Documentation-as-Code

Thư mục `docs/` chứa toàn bộ tài liệu kỹ thuật, đặc tả tính năng, quy chuẩn giao diện UI/UX, sơ đồ kiến trúc và nhật ký phát triển của hệ thống BIM Logistics.

---

## 📚 MỤC LỤC TÀI LIỆU TRỌNG YẾU

| Tài liệu | Mô tả chi tiết |
|---|---|
| 📌 **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** | **Tổng quan dự án & Cấu trúc mã nguồn**: Mục tiêu cốt lõi, công nghệ stack (Django, Postgres, Tailwind, Chart.js), cấu trúc thư mục toàn diện và các phân hệ. |
| ✨ **[FEATURES.md](FEATURES.md)** | **Toàn bộ tính năng đã xây dựng**: Đặc tả chi tiết 8 phân hệ (Dashboard BGĐ, Sale & Booking, Điều vận, Chi tiết chuyến xe & P&L 8 mục, Quản lý Kế toán, Xe & Bãi, Nhân sự & Tiền lương, Dịch vụ Hải quan) cùng các cơ chế kỹ thuật. |
| 🎨 **[UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md)** | **Nguyên tắc UI/UX & Design System**: Triết lý Field-First, bảng màu BIM Tailwind Tokens, thang đo Typography 7 bậc chuẩn ERP, thư viện component patterns (KPI card, badge, table, modal, toast), responsive layout và quy tắc thao tác hiện trường (2-touch rule). |
| 🔌 **[API_REFERENCE.md](API_REFERENCE.md)** | **Tài liệu REST API Đầy Đủ**: 14 nhóm endpoints, request payloads mẫu, JSON responses, mã lỗi và cơ chế tự động đồng bộ tài chính Zero Variance. |
| 🗄️ **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** | **Sơ đồ Cơ sở Dữ liệu & ORM Architecture**: Thiết kế models theo chuẩn Modular Monolith, kế thừa TimeStampedModel/SoftDeleteModel, No Hard-Delete, Indexing và Caching Signals. |
| 🔄 **[OPERATIONAL_WORKFLOW.md](OPERATIONAL_WORKFLOW.md)** | **Quy trình Điều vận & Máy trạng thái 10 Bước**: Chu trình vận hành thực tế từ tiếp nhận lệnh, phát lệnh Zalo/App, lấy cont, giao kho, hoàn tất POD, trả rỗng đến đối soát kế toán. |
| 💰 **[EXPENSE_LIFECYCLE_BUSINESS_ANALYSIS.md](EXPENSE_LIFECYCLE_BUSINESS_ANALYSIS.md)** | **Phân tích Nghiệp vụ Vòng đời Chi phí Hiện trường**: Luồng kiểm soát hóa đơn điện tử, vé BOT, phí nâng/hạ, cơ chế duyệt chi phí và nguyên tắc khóa sổ kế toán. |
| 📜 **[CHANGELOG.md](CHANGELOG.md)** | **Nhật ký Thay đổi Phiên bản**: Lịch sử chi tiết từ v1.0.0 đến v1.4.9, ghi nhận từng bugfix, tối ưu hóa giao diện và nâng cấp tính năng. |
| 🤖 **[AI_CONTEXT.md](AI_CONTEXT.md)** | **Ngữ cảnh Kỹ thuật cho AI Agent**: Quy định cốt lõi và các chỉ thị ràng buộc khi AI tham gia bảo trì và phát triển mã nguồn. |

---

## 🏗️ TỔNG HỢP CẤU TRÚC 3 TRỤ CỘT

### 1. Cấu Trúc Dự Án (Project Architecture)
- **Kiến trúc Modular Monolith:** Phân tách rõ ràng giữa nền tảng dùng chung (`core/`) và các phân hệ nghiệp vụ độc lập (`apps/dispatch/`, `apps/billing/`, `apps/customers/`, `apps/fleet/`, `apps/personnel/`, `apps/documents/`, `apps/exceptions/`).
- **Giao diện SPA (Single Page Application):** Giao diện chạy mượt mà không reload trang qua `static/js/app.js` và hệ thống view templates tại `templates/views/`.

### 2. Tính Năng Đã Hoàn Thiện (Implemented Features)
- **7 Phân hệ hoạt động + 1 Phân hệ mở rộng:** Dashboard Ban Giám Đốc, Sale & Tiếp nhận Booking, Điều độ Chuyến xe, Quản lý Kế toán & Đối soát chi phí, Đội xe & Rơ-moóc, Nhân sự & Lương chuyến, Dịch vụ Hải quan.
- **Màn hình Chi tiết Chuyến xe Chuẩn Hiện Trường:** Lộ trình 3 điểm, 5 mốc thời gian tại kho khách hàng, Bảng kê chi phí 8 mục Triền Võ khớp với HĐĐT tra cứu trực tuyến, Timeline 10 bước, Giả lập App Tài xế 1-chạm và Chốt sổ kế toán.

### 3. Nguyên Tắc UI/UX Quốc Tế (Design System)
- **BIM Design Tokens:** Bộ màu nhận diện chuẩn mực (Teal chủ đạo, Emerald thành công, Amber cảnh báo, Rose chi phí/sự cố, Purple chốt sổ).
- **ERP Typography Hierarchy:** Phân cấp cỡ chữ 7 bậc từ Hero KPI (`30px`), Tiêu đề phân hệ (`24px`), Section (`17px`), Card (`15px`), Body chính (`14px`), Sub-info (`13px`) đến Caption/Badge (`12px`).
- **Zero Ambiguity & Zero Variance:** Mọi trạng thái đều có nhãn rõ ràng, số liệu tài chính P&L luôn khớp 100% với tổng chi tiết bảng kê.
