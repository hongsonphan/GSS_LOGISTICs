# MANDATORY AGENT INSTRUCTIONS — BẮT BUỘC ĐỌC TRƯỚC KHI THỰC HIỆN

> [!IMPORTANT]
> **TẤT CẢ AI AGENT KHI THAM GIA DỰ ÁN NÀY BẮT BUỘC PHẢI ĐỌC VÀ TUÂN THỦ CÁC QUY CHUẨN SAU TRƯỚC KHI THỰC HIỆN BẤT KỲ THAO TÁC NÀO:**
> 1. **[`AGENTS.md`](file:///E:/Bim_Logistics/AGENTS.md)** ← ĐỌC NGAY: Bộ 4 quy tắc hành vi kỹ thuật bắt buộc (Think Before Coding, Simplicity & Field Reliability, Surgical Changes & Zero-Regression, Goal-Driven Verification).
> 2. **[`CODING_STANDARDS.md`](file:///E:/Bim_Logistics/CODING_STANDARDS.md)** ← ĐỌC NGAY: Chuẩn mực kiến trúc, Django ORM, quy ước đặt tên (PascalCase/snake_case), Defensive Backend và Design Tokens BIM.
> 3. **Không dùng Hard-Delete:** Mọi dữ liệu vận đơn, POD, OS&D, GPS là bằng chứng pháp lý — chỉ dùng Soft-Delete (`is_deleted=True`).
> 4. **Tuân thủ State Machine:** Không nhảy cóc trạng thái `Draft ➔ Dispatched ➔ In Transit ➔ Delivered ➔ POD Verified ➔ Settled`.
> 5. **Zero-Regression:** Sau mỗi thay đổi, chạy `python scripts/build_app_js.py --check`, `node -c static/js/app.js` và `python manage.py test --keepdb` — 100% passed mới được xác nhận hoàn thành.

---

# BIM LOGISTICS PLATFORM
Hệ thống Quản trị Vận tải & Chuỗi cung ứng (TMS, WMS, Fleet Management, Exception Handling & 3PL Integration) — Triền Võ Logistics, thuộc hệ sinh thái BIM Ecosystem.

---

# BẢN ĐỒ TÀI LIỆU — ĐỌC KHI CẦN (DOCUMENTATION MAP)

Tùy theo loại tác vụ, Agent **chủ động đọc** file tài liệu tương ứng trước khi thực hiện:

| Khi làm việc với... | Đọc file này trước |
|---|---|
| **Kiến trúc tổng quan, tech stack, cấu trúc thư mục** | [`docs/PROJECT_OVERVIEW.md`](file:///E:/Bim_Logistics/docs/PROJECT_OVERVIEW.md) |
| **Tính năng đã có, tránh viết lại** | [`docs/FEATURES.md`](file:///E:/Bim_Logistics/docs/FEATURES.md) |
| **REST API endpoint, payload, response** | [`docs/API_REFERENCE.md`](file:///E:/Bim_Logistics/docs/API_REFERENCE.md) |
| **Database models, ORM, quan hệ bảng** | [`docs/DATABASE_SCHEMA.md`](file:///E:/Bim_Logistics/docs/DATABASE_SCHEMA.md) |
| **Quy trình điều vận, State Machine 11 bước** | [`docs/OPERATIONAL_WORKFLOW.md`](file:///E:/Bim_Logistics/docs/OPERATIONAL_WORKFLOW.md) |
| **Chi phí chuyến xe, vòng đời TripExpense** | [`docs/EXPENSE_LIFECYCLE.md`](file:///E:/Bim_Logistics/docs/EXPENSE_LIFECYCLE.md) |
| **Giao diện, component, màu sắc, typography** | [`docs/UI_UX_GUIDELINES.md`](file:///E:/Bim_Logistics/docs/UI_UX_GUIDELINES.md) |
| **Lộ trình tính năng, backlog ưu tiên** | [`docs/DEVELOPMENT_PLAN.md`](file:///E:/Bim_Logistics/docs/DEVELOPMENT_PLAN.md) |
| **Lịch sử thay đổi, phiên bản hiện tại** | [`docs/CHANGELOG.md`](file:///E:/Bim_Logistics/docs/CHANGELOG.md) |
| **Bảo mật, audit, 20 tiêu chuẩn** | [`SECURITY_AUDIT.md`](file:///E:/Bim_Logistics/SECURITY_AUDIT.md) |
| **Quy tắc an toàn dữ liệu & kỹ thuật** | [`.agents/rules/data-integrity-rules.md`](file:///E:/Bim_Logistics/.agents/rules/data-integrity-rules.md) |
