# AGENTS.md — AI AGENT GOVERNANCE & ENGINEERING PROTOCOLS
## Hướng Dẫn Kỹ Thuật, Đạo Đức Vận Hành & Bản Đồ Kiến Trúc Dành Cho AI Agent

> **Hệ thống:** BIM Logistics Platform (TMS, WMS, Fleet & Supply Chain Management)  
> **Hệ sinh thái:** BIM Ecosystem (BIM ERP Solutions & BIM Consulting)  
> **Phiên bản:** v4.7.19 | **Cập nhật lần cuối:** 01/11/2026  
> **Tiêu chuẩn quản trị:** ISO/IEC/IEEE 42010 Architecture Governance  
> **Nguyên tắc đánh đổi (Tradeoff):** Tính chính xác của hành trình, an toàn dữ liệu vận đơn/POD và tính liên tục của vận hành cao hơn tốc độ viết code. Không phán đoán mò.

---

## I. NHẬN DIỆN DỰ ÁN & CHỈ THỊ BẮT BUỘC (PROJECT IDENTITY & CORE INVARIANTS)

**BIM Logistics** là nền tảng Quản trị Vận tải (TMS), Quản trị Kho bãi (WMS), Quản trị Đội xe (Fleet Management) và Đối soát Chi phí Vận tải Đa phương thức phục vụ Triền Võ Logistics.

> [!IMPORTANT]
> **5 NGUYÊN TẮC BẤT KHẢ XÂM PHẠM (ARCHITECTURAL INVARIANTS):**
> 1. **No Hard-Delete:** Mọi dữ liệu vận đơn, phiếu EIR, ảnh ký nhận POD, tọa độ và biên bản sự cố là chứng cứ pháp lý giải quyết tranh chấp — tuyệt đối cấm dùng `.delete()`, chỉ dùng Soft-Delete (`is_deleted=True`).
> 2. **Deterministic State Machine:** Vòng đời chuyến xe trải qua 11 bước vận hành được quản lý tập trung qua `core.workflows`, ngăn chặn mọi hành vi nhảy cóc trạng thái trái quy luật vận tải.
> 3. **Zero Variance Financial Accounting:** Số liệu P&L chuyến xe và đối soát sổ quỹ luôn bằng tổng đại số chi tiết của từng khoản mục chi phí được duyệt.
> 4. **User & Account Sanctity:** Tuyệt đối cấm chạy script có logic ghi đè (`set_password`, `user.email = ...`) lên tài khoản đang vận hành thực tế.
> 5. **Zero-Regression Verification:** Sau mỗi lần chỉnh sửa, bắt buộc chạy `python scripts/build_app_js.py --check`, `node -c static/js/app.js` và `python manage.py test apps.dispatch --keepdb` — 100% passed mới được xác nhận hoàn thành.

---

## II. BỘ 4 NGUYÊN TẮC KỸ THUẬT HÀNH VI (4 BEHAVIORAL PROTOCOLS)

### 1. Think Before Coding & Designing
**Hiểu rõ luồng vận tải & chuỗi cung ứng trước khi gõ code. Nêu rõ giả định & đánh đổi.**
- **Đối chiếu nghiệp vụ logistics thực tế:** Luôn bám sát quy trình giao nhận thực tế (FTL - Nguyên chuyến, LTL - Ghép hàng, Đa phương thức). Xác thực rõ chuẩn chứng từ: Vận đơn (BOL), Phiếu EIR lấy/hạ, Biên bản giao nhận có chữ ký (POD), Biên bản bất thường (OS&D) theo Luật Thương mại 2005.
- **Kiểm soát chặt chẽ máy trạng thái (State Machine):** Vòng đời đơn hàng/chuyến xe (`DRAFT ➔ DISPATCHED ➔ ACCEPTED ➔ CONTAINER_PICKED ➔ IN_TRANSIT ➔ AT_WAREHOUSE ➔ UNLOADING ➔ DELIVERED ➔ RETURNING_EMPTY ➔ COMPLETED`) phải được quản lý bằng state machine nghiêm ngặt.
- **Dừng lại khi thiếu dữ liệu trọng yếu:** Nếu schema thiếu quy đổi thể tích trọng lượng (CBM vs. Gross Weight), thiếu thông tin tải trọng xe, hoặc thiếu cơ chế ghi nhận sự cố, dừng lại và chỉ rõ vấn đề trước khi code.

### 2. Simplicity & Operational Reliability First
**Lượng code tối thiểu giải quyết đúng bài toán Logistics. Ưu tiên độ ổn định hiện trường.**
- **Không over-engineering bài toán điều vận:** Ưu tiên các thuật toán phân bổ đơn, gán xe và tối ưu lộ trình đơn giản, minh bạch và dễ debug.
- **Thiết kế thân thiện với hiện trường (Field-First & Offline-ready):** Tài xế và thủ kho làm việc ở môi trường mạng chập chờn; thiết kế payload API nhẹ, hỗ trợ lưu trữ tạm (local storage/cache) và cơ chế thử lại (retry mechanism).
- **Giao diện tối giản, chuẩn thao tác 2 chạm (2-Touch Rule):** Nút bấm to $\ge 44$px, phân biệt trạng thái bằng màu sắc trực quan (Xanh: Hoàn thành, Hổ phách: Đang vận chuyển, Đỏ: Cảnh báo sự cố); thao tác xác nhận giao hàng không quá 2 bước.

### 3. Surgical Changes, Scope Containment & Zero-Regression
**Chỉ can thiệp đúng phạm vi yêu cầu. Tuyệt đối không để việc sửa/thêm tính năng mới làm phát sinh lỗi ở các tính năng cũ.**
- **Tập trung đúng trọng tâm (Scope Containment):** Chỉ sửa đúng tệp, đúng hàm, đúng component được yêu cầu. Tuyệt đối không sửa lan man ngoài phạm vi gây xáo trộn codebase.
- **Đánh giá tác động liên đới (Impact Assessment):** Trước khi sửa/xóa bất kỳ hàm JS, biến, CSS class, template component hoặc API endpoint nào, bắt buộc rà soát toàn bộ các phân hệ phụ thuộc để đồng bộ.
- **Bảo toàn tính nguyên vẹn cú pháp:** Giữ nghiêm ngặt cấu trúc cú pháp HTML/JS/CSS để lỗi cục bộ không gây tê liệt toàn trang.
- **Tuân thủ quy ước đặt tên:** Sử dụng PascalCase cho Models, snake_case cho fields/methods/APIs; bảng màu đồng bộ hệ thống BIM (Teal chủ đạo, Emerald thành công, Amber cảnh báo, Rose lỗi/hỏng hóc).

### 4. Goal-Driven Execution & Verification
**Xác định tiêu chí kiểm chứng (Verify). Chạy vòng lặp đến khi đạt chuẩn 100%.**
- Mọi tính năng và sửa đổi phải được kiểm chứng bằng kịch bản thực tế:
  * **Frontend Source of Truth:** `static/js/app.js` là file tự sinh. Chỉ sửa mã trong `static/js/src/app/<phân hệ>/`, sau đó chạy `python scripts/build_app_js.py` và commit cả nguồn lẫn `app.js`.
  * **Frontend Verification:** Bắt buộc chạy `node -c static/js/app.js` trước mỗi lần xác nhận tác vụ để đảm bảo 100% cú pháp JS chuẩn mực.
  * **Backend Verification:** Chạy kiểm thử tự động của dự án (`python manage.py test apps.dispatch --keepdb`) để xác nhận không phát sinh lỗi hồi quy.

---

## III. BẢN ĐỒ TÀI LIỆU KIẾN TRÚC PHẦN MỀM (DOCUMENTATION MAP)

Hệ thống tài liệu dự án được cấu trúc theo chuẩn quốc tế **ISO/IEC/IEEE 42010**, **Arc42 Template** và **C4 Model**. Tùy theo loại tác vụ, Agent **chủ động đọc** file tài liệu tương ứng trước khi thực hiện:

| STT | Tài liệu Kiến trúc | Đường dẫn tệp | Mục đích & Phạm vi nghiệp vụ | Chuẩn quốc tế |
|:---:|---|---|---|---|
| **01** | **Documentation Hub** | [`README.md`](README.md) | Cổng thông tin điều hướng toàn bộ 13 tài liệu kiến trúc phần mềm | Arc42 Section 1 |
| **02** | **Agent Governance** | [`AGENTS.md`](AGENTS.md) | *(File này)* Nhận diện dự án, 4 quy tắc hành vi, kiểm chứng & bản đồ tài liệu | ISO 42010 Governance |
| **03** | **Coding Standards** | [`CODING_STANDARDS.md`](CODING_STANDARDS.md) | Clean Architecture, Django ORM First, Defensive Backend, Design Tokens BIM | ISO 25010 Quality |
| **04** | **Security & Privacy** | [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) | 20 chuẩn an ninh TMS/WMS + Luật Bảo vệ dữ liệu cá nhân (91/2025/QH15 & NĐ 356) | OWASP / ISO 27001 |
| **05** | **System Overview & C4** | [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) | Tổng quan hệ thống, C4 Level 1 & Level 2, Bounded Contexts & Cấu hình Email SMTP | C4 Architecture Model |
| **06** | **Feature Specifications** | [`FEATURES.md`](FEATURES.md) | Đặc tả 22 phân hệ tính năng nghiệp vụ TMS/WMS, UI details, tổng hợp 25 Models | Functional Requirements |
| **07** | **API Reference** | [`API_REFERENCE.md`](API_REFERENCE.md) | Hợp đồng giao tiếp RESTful API 9 phân hệ, Auth JWT/Session, payloads, mã lỗi | OpenAPI 3.0 Contract |
| **08** | **Database Schema** | [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) | Sơ đồ CSDL, ORM, Core Domain ERD 25 models, chiến lược Indexing & Signals | Data Layer Architecture |
| **09** | **Operational Workflow** | [`OPERATIONAL_WORKFLOW.md`](OPERATIONAL_WORKFLOW.md) | Chu trình 11 bước, State Machine chuyến xe, Vòng đời chi phí & Sổ quỹ S03a-DN | State Machine Architecture |
| **10** | **UI/UX Guidelines** | [`UI_UX_GUIDELINES.md`](UI_UX_GUIDELINES.md) | Triết lý Field-First, Design Tokens BIM, Thang đo Typography 7 bậc chuẩn ERP | ISO 9241 Ergonomics |
| **11** | **Development Roadmap** | [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) | Lộ trình TMS nâng cao, 5 Architecture Decision Records (ADRs) & On-Premise MISA | Architecture Roadmap & ADR |
| **12** | **Release Changelog** | [`CHANGELOG.md`](CHANGELOG.md) | Lịch sử phát hành và thay đổi mã nguồn chi tiết từ v1.0.0 đến v4.7.19 | SemVer / Keep a Changelog |
| **13** | **System User Manual** | [`USER_GUIDE.md`](USER_GUIDE.md) | Cẩm nang hướng dẫn sử dụng phần mềm toàn diện từng màn hình cho người dùng cuối | End-User Operational Manual |
