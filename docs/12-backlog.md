# PLAN — Việc tồn đọng cho phiên sau

> Đầu mỗi phiên: Team Leader đọc file này trước khi nhận lệnh. Cuối mỗi phiên: `docs` ghi thêm việc chưa xong, xóa việc đã xong (quy trình ở [`14-ai-team.md`](14-ai-team.md)).
> Mức: **Nặng** (chặn phát hành / sai dữ liệu) · **Vừa** · **Nhẹ**. Cập nhật: 09/11/2026.

## 1. Câu hỏi chờ anh quyết

| # | Câu hỏi | Ảnh hưởng | Nguồn |
|---|---|---|---|
| Q1 | Danh sách 7 vai trò (§3) để viết lại ma trận phân quyền | `backend` – quyền mặc định trong `core/access.py` | Báo cáo GĐ0 mục 3.3 |

## 2. Việc chưa xong

| # | Việc | Vị trí | Người nhận | Mức |
|---|---|---|---|---|
| 1 | Nút "In phiếu quyết toán chuyến" gọi hàm không tồn tại `printTripSettlementVoucher` (phần quyết toán tài xế kiểu BIM). Xóa nút cùng đợt dọn phần cũ, hoặc ẩn ngay | `static/js/src/app/accounting/trip-costs.js:182` | ui-ux (+ billing xác nhận) | Vừa |
| 2 | Dọn phần BIM cũ: tạm ứng tài xế, quỹ điều vận, quyết toán tài xế (đang khóa bằng cờ `fleet_internal`, khoảng 10 file) | `apps/billing/advance_*.py`, `settlement_voucher_views.py`, `static/js/src/app/accounting/**` | billing → ui-ux → qa-tester | Vừa |
| 3 | Đổi `DispatchTrip` → `TransportJob`, bỏ máy 11 bước cũ (`core.workflows`, `TripStatus`) sau khi report/sổ cái chuyển sang máy 7 bước | `apps/dispatch/models.py`, `gss_workflow.py` (`LEGACY_STATUS`), `reports_api.py`, `apps/ledger/posting.py` | dispatch-ops → billing → report-designer | Vừa |
| 4 | `StoredFile`/`DocumentLink` tách bảng; `CargoItem`/`Stop`/`DeliveryDrop` (GĐ4) | `apps/documents`, `apps/gss` | backend, dispatch-ops | Nhẹ |
| 5 | `settings.py` rơi về SQLite khi thiếu `DB_HOST` – trái quy ước "chỉ PostgreSQL". Đề xuất: báo lỗi rõ thay vì tạo `db.sqlite3` | `config/settings.py:136-141` | backend | Vừa |
| 6 | Phân loại 51 chỗ `.delete()` ngoài test: bảng phụ thì ghi chú, bảng pháp lý thì chuyển sang xóa mềm | `qa.py audit` mục bảo mật (vd. `apps/billing/settlement_voucher_views.py:509`) | security (rà) → backend/billing (sửa) | Vừa |
| 7 | Template lệch thẻ `<div>` (mở 363/đóng 362) – kiểm có phải lỗi thật | `templates/views/view_trip_detail.html` | ui-ux | Vừa |
| 8 | Badge/pill trong bảng – đổi sang chữ màu + icon | `reports-center.js:603`, `settlement-voucher.js:665`, `tasks-board.js:261`, `trip-cost-sheet.js:148`, `opening-balance.js:323`, `reports/finance/report-18.js:47` | ui-ux | Nhẹ |
| 9 | Tài liệu kế thừa còn mô tả hệ thống cũ (v4.7.x, máy 11 bước, lệnh test `apps.dispatch --keepdb`, tiêu đề "BIM LOGISTICS"): `docs/14-ai-team.md`, `docs/README.md`, `docs/02-operational-workflow.md`, `docs/03-features.md`, `docs/10-ui-ux-guidelines.md`. Quy tắc làm việc hiện hành nằm ở `CLAUDE.md` + `14-ai-team.md` | `docs/` | docs | Nhẹ |
| 10 | Chạy `bandit`, `pip-audit` cục bộ (máy hiện chưa cài → `qa.py` báo SKIP; CI có chạy) | `pip install bandit pip-audit` | qa-tester | Nhẹ |
| 11 | Chạy thử đội AI với 2–3 lệnh thật, chỉnh prompt agent theo kết quả | `.claude/agents/*.md` | Team Leader | Nhẹ |

## 3. Nhật ký phiên

- **09/11/2026** – Đã làm: dựng đội AI GSS (9 agent, 10 skill) theo mẫu BIM Logistics; thêm `scripts/qa.py` (Postgres tạm 5438); `qa.py audit` trên bản sao mã: test toàn bộ đạt, FAIL còn 1 (mục 2.1), WARN ghi ở mục 2. Đang làm: —. Chưa làm: các mục trên.

## 4. Rà soát tính năng 09/11/2026 (đối chiếu `01-spec-brd.md`, `13-architecture-decisions.md` §0.0 với mã và bản chạy 8086)

**Cách kiểm:** đăng nhập `gss_admin`, mở đủ 8 mục sidebar và 16 màn GSS trong khung BIM: 0 lỗi JS, 1 lỗi API (4.3). Trang tài xế `/q/<token>/` trả 200, dữ liệu không lộ tên khách. Test 458 đạt (báo cáo GĐ0). **Chưa kiểm trực tiếp:** cổng nhà xe `/vendor/<token>/`, thao tác ghi (tạo B/L, phân bổ, chốt bảng kê), camera QR trên điện thoại thật.

> **Lưu ý nguồn yêu cầu:** bản đặc tả 08/11 ("GSS — Đặc tả tính năng & kế hoạch chuyển đổi từ BIM Logistics") **không nằm trong repo**; rà soát này chỉ dựa vào BRD 04/11 và bảng ánh xạ đã ghi. Cần có file đặc tả để đối chiếu đủ.

### 4.1 Đã có và chạy (khớp BRD)
| BRD | Tính năng | Ghi chú |
|---|---|---|
| 2.1 | Cấu hình loại hình doanh nghiệp, ẩn/hiện menu và chặn ở API | `core/features.py`, Cài đặt |
| 2.2 | Booking/B/L, hạn DEM/DET tự tính, ghi chú điểm đến, cấm đường | Sale & Booking: Đơn hàng B/L, Địa điểm, Quy tắc DEM/DET |
| 2.3 | Chia cont cho nhà xe, Vendor Link, Excel phân bổ hai pha | màn Booking; cổng `/vendor/` chưa kiểm tay |
| 2.4 | Máy 7 bước nhận–giao–hạ, chứng từ 1–10 ảnh/chặng, đổi vỏ hạ rỗng | Điều phối chuyến, Trip Card |
| 2.5 | Tin nhắn tài xế, mẫu biên bản giao hàng theo khách | Mẫu phiếu giao hàng |
| 2.6 | Bãi Đắk Nông: gate-in/out, tồn bãi | Bãi & Phương Tiện |
| 2.7 | QR lệnh tài xế, tem hàng lẻ có seal, trang `/q/` | Quét QR + trang tài xế |
| 2.8 | Dashboard theo nhà xe + hành trình xe container | Dashboard (đã làm đợt trước) |
| Đặc tả | Biểu giá, chi hộ + hoá đơn, bảng kê, đối soát cước nhà xe, tra cứu B/L/cont | Tài chính & Kế toán |

### 4.2 Thiếu so với yêu cầu (chưa làm)
| # | Việc | Lý do/ghi chú | Mức |
|---|---|---|---|
| F1 | **Màn hình Chặng / Lượt xe (RouteTemplate, Leg, TruckRun):** API `/api/gss/trips/<mã>/legs/` và model đã có, giao diện thì chưa | không thấy trong `static/js/gss/` | Vừa |
| F2 | Hàng LCL theo kiện, `CargoItem`/`Stop`/`DeliveryDrop` (giao nhiều điểm đủ bộ) | GĐ4, trùng backlog #4 | Nhẹ |
| F3 | OTP cho thao tác ghi của nhà xe | cần kênh SMS/email | Vừa |
| F4 | OCR ảnh hoá đơn, tự tải XML từ cổng tra cứu | cần dịch vụ ngoài | Nhẹ |
| F5 | Object storage S3/MinIO + hàng đợi Celery | cần hạ tầng; hiện file local | Nhẹ |
| F6 | PWA offline bền qua tắt máy (hiện chỉ giữ ảnh trong phiên) | tài xế mất sóng | Vừa |
| F7 | 7 điểm chờ xác nhận cuối đặc tả (mặc định đang dùng, xem `archive/2026-11-09-report-phase1-3.md` mục 3.6) | cần quyết | Vừa |

### 4.3 Cần sửa / lệch với GSS
| # | Việc | Bằng chứng | Mức |
|---|---|---|---|
| X1 | Vào Tài chính & Kế toán, trình duyệt gọi `/api/accounting/advances/` bị **403** (tạm ứng kiểu BIM đã khóa bằng cờ) | bắt được khi mở màn Đối soát cước, Biểu giá | Vừa |
| X2 | **Báo cáo** vẫn là báo cáo BIM: doanh thu theo *đầu xe*, "Quyết toán chuyến", "Chi phí hiện trường"; thiếu báo cáo GSS: cont theo B/L/khách, DEM/DET sắp hạn, đối soát nhà xe, lãi/lỗ theo B/L | thấy ở mục Báo cáo | Vừa |
| X3 | **Hai đường đối soát nhà xe song song:** "Đối soát cước nhà xe" (màn cũ) và "Bảng kê" (`gss.Statement`); màn cũ còn ghi "phân hệ Kế toán (hệ thống cũ)". Cần chốt dùng một đường | `Tài chính & Kế toán` | Vừa |
| X4 | "Sổ sách kế toán" còn là phân hệ BIM cũ (tạm ứng, quỹ điều vận, quyết toán tài xế) | trùng backlog #2 | Vừa |
| X5 | **Hành chính & Nhân sự:** KPI "Đội ngũ tài xế", "Hồ sơ nhân sự" kiểu BIM (tài xế thuộc công ty). GSS thuê nhà xe nên tài xế thuộc nhà xe; cần chốt nhân sự GSS gồm gì (đang 0 bản ghi) | `view-nhan-su` | Nhẹ |
| X6 | Cổng nhà xe, hai tab "Phương tiện & tài xế theo nhà xe" và "Điều phối chuyến" chưa kiểm thao tác ghi bằng tay | chưa chạy thử | Vừa |
