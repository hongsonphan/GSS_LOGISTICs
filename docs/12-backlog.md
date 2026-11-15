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

## 5. Cập nhật 14/11/2026 – tính năng mới từ 11–13/11 (theo `CHANGELOG.md`) và tình trạng các mục F/X

**Đã có thêm (chưa ghi vào `03-features.md`):** quy trình 3 bước Booking (gán tạm `BK.yyMM.xxx`) → Lệnh điều động (`LĐĐ.BK.yyMM.xxx`, phát lệnh) → Cổng nhà xe; phiếu vận chuyển `VC.yyMM.xxx`; 3 tab Điều vận (kế hoạch theo B/L · Vendor phân bổ & gán xe từng cont · theo dõi xe đang chạy) + nút Nhắc Zalo; cổng nhà xe desktop `/vendor/` (tài khoản riêng nhà xe, đăng nhập 3 yếu tố, tự đăng xuất khi nhàn rỗi, quản lý đội xe/tài xế, Excel mẫu/import, ghép cont 2×20', điều độ mở chuyến thay nhà xe); QR lệnh tài xế dạng SVG + tin Zalo; khoá bất biến hành trình (cấm sửa/xóa/lùi bước khi xe đã chạy); tự sinh phiếu giao hàng; OCR hoá đơn dạng cắm-rút có nhập tay dự phòng (`apps/gss/ocr.py`); hàng đợi ngoại tuyến IndexedDB cho trang tài xế; tìm theo MBL/HBL/cont thứ 2; sửa VGM; tài liệu triển khai `15-deployment-guide.md`.

**Tình trạng mục cũ:** X1 xong (ẩn tab tạm ứng BIM + bỏ gọi API 403, chưa kiểm lại bằng trình duyệt) · F3 một phần (nhà xe đã có tài khoản + token, chưa OTP) · F4 một phần (khung OCR có, chưa nối nhà cung cấp) · F6 một phần (hàng đợi IndexedDB có, chưa kiểm trên máy thật) · còn nguyên: F1, F2, F5, F7, X2, X3, X4, X5, X6 (X6 nay có thể kiểm, vì cổng nhà xe đã làm lại).

**Lệch quy ước cần dọn:** `CHANGELOG.md` viết theo kiểu "Cập nhật N" quá dài, thiếu số `03-features.md`/`04-user-guide.md`/`README.md` chưa phản ánh phần mới; mục 4 file này là bản 09/11, đọc kèm mục 5.

## 6. Kiểm thử trình duyệt 15/11/2026 (stack 8086, `gss_admin`, cổng nhà xe, trang tài xế)

| # | Phát hiện | Mức |
|---|---|---|
| B1 | **[Quyết định 15/11: giữ nguyên giao diện BIM mới, không gắn lại tab cũ; chức năng cần thiết phải đưa vào màn BIM hiện có — xem mục 7]** **Mất lối vào các màn GSS:** commit `740ad10` rút `GROUPS` trong `static/js/gss/console.js` còn mỗi `dashboard`, nên Bảng kê đối soát, Chi hộ & hoá đơn, Biểu giá, Quy tắc DEM/DET, Đối soát cước nhà xe, Mẫu phiếu giao hàng, Khách hàng, Địa điểm, Phương tiện theo nhà xe, Quét QR không còn nút mở trên menu (màn vẫn đăng ký trong `GSSApp.screens` và vẫn dựng được bằng `GSSApp.show('<tên>')`, nhưng `GSSApp.go()` chỉ còn mở Dashboard). Cần quyết: gắn lại vào tab, hay thay bằng màn BIM mới | Nặng |
| B2 | `seed_gss_demo --create-admin` chạy lại bị `IntegrityError` (trùng `DEMO-KHO`), không idempotent; mật khẩu trong `gss_local_credentials.txt` cũ (không khớp tài khoản) | Vừa |
| B3 | Trang tài xế `/q/`: nút "Ghi nhận đã qua" và "Chụp ảnh hoá đơn" cao 42px (< 44px chuẩn hiện trường) | Nhẹ |
| B4 | Dữ liệu thử để lại trên DB local: tài khoản cổng `qa_hoangnam` (nhà xe Hoàng Nam), đầu kéo `99Z-999.99` | Nhẹ |

Đã đạt: 8 mục sidebar 0 lỗi JS/API (hết 403 `/api/accounting/advances/`, X1 xong); tab kế toán chỉ còn Sổ quỹ + Khoản chi hộ; cổng nhà xe đăng nhập 3 yếu tố, 3 tab tải được, không lộ giá/khách, thêm nhanh đầu kéo ghi thành công; trang tài xế mobile không cuộn ngang, không lộ khách/giá.


## 7. Đánh giá mở rộng tính năng (15/11/2026) – giữ giao diện BIM hiện tại

Nền kiểm tra: `qa.py verify` đạt (build khớp, migration, check, test `apps.gss apps.dispatch apps.billing`). Nguyên tắc: không dựng lại tab GSS cũ; đưa chức năng cần thiết vào màn BIM đang có.

| Ưu tiên | Hạng mục | Đặt ở đâu | Công | Phụ thuộc |
|---|---|---|---|---|
| P0 | Đưa **Biểu giá, Bảng kê đối soát, Chi hộ & hoá đơn** vào Tài chính & Kế toán (nhóm "Quyết toán & Đối soát"); chốt X3 (một đường đối soát) | tab mới thay "Khách Hàng"/"Đối Tác 3PL" cũ | Vừa | quyết X3 |
| P0 | Đưa **Quy tắc DEM/DET** và **Mẫu phiếu giao hàng** vào Cài đặt (Tài Chính & Quản Trị / Khách Hàng & Đối Tác) | Cài đặt | Nhỏ | — |
| P1 | **Báo cáo GSS** thay báo cáo BIM (lãi/lỗ theo B/L, theo nhà xe, cont theo trạng thái, DEM/DET sắp hạn, công nợ nhà xe/khách) – X2 | Báo cáo | Vừa | P0 (cần Biểu giá để có số) |
| P1 | Dọn phần BIM cũ (tạm ứng, quỹ điều vận, quyết toán tài xế), SQLite fallback, `.delete()` pháp lý, pill trong bảng (backlog #2, #5, #6, #8) | billing + ui-ux | Vừa | sau P0 |
| P1 | Sửa nhỏ: seed idempotent (B2), nút tài xế ≥44px (B3), chốt Nhân sự GSS (X5) | — | Nhỏ | quyết X5 |
| P2 | **Chặng/Lượt xe** (F1): giao diện gán chặng, tối đa 2 TEU/lượt, mẫu tuyến | Điều vận | Vừa | cần nhu cầu thật (hiện ghép 2×20' đã có ở cổng nhà xe) |
| P2 | OTP/Zalo ZNS/SMS (F3), OCR hoá đơn nối nhà cung cấp (F4) | cổng nhà xe, chi hộ | Vừa | chọn nhà cung cấp, chi phí |
| P2 | Kiểm thử thiết bị thật: camera QR, offline tài xế (F6) | trang `/q/` | Nhỏ | điện thoại thật |
| P3 | LCL theo kiện, giao nhiều điểm đủ bộ (F2) | Booking/Điều vận | Lớn | có khách LCL |
| P3 | S3/MinIO + Celery (F5); VPS + domain + push GitHub | hạ tầng | Vừa | quyết hạ tầng |
| Tài liệu | Cập nhật `03-features.md`, `04-user-guide.md`, rút gọn `CHANGELOG.md` theo phần mới 11–13/11 | docs | Nhỏ | — |

Cần chốt: X3 (một đường đối soát), X5 (nhân sự GSS gồm gì), F7 (7 điểm đặc tả), Q1 (7 vai trò), nhà cung cấp OTP/OCR.

## 8. Đối chiếu kế hoạch GSS (PDF "GPX_ Build Application Plan", gồm bổ sung 09/11/2026) với hiện trạng 15/11/2026

Ký hiệu: ✔ đã có · ◐ một phần · ✘ chưa có. "UI mất" = máy chủ còn, giao diện không còn lối vào (mục 6, B1).

| Mục kế hoạch | Tình trạng | Ghi chú |
|---|---|---|
| B1 Tờ khai, B/L, danh sách cont (dán/import), seal, NCC, cảng xuất/nhận, nhiều nơi giao, depot, hạn lệnh | ✔ | `BookingOrder`, `BookingContainer`, `CustomsDeclarationRef` |
| B1 Đính kèm bộ chứng từ nhập khẩu vào đơn | ✔ | giao diện đính kèm + xoá mềm trên Booking mới |
| B1 Chọn mẫu phiếu giao hàng theo khách | ◐ | chọn mẫu trên form Booking ✔ (15/11); màn tạo/sửa mẫu và gán cho khách vẫn **UI mất** |
| B2 Danh sách cont theo B/L, gán Vendor trực tiếp/hàng loạt | ✔ | Booking + tab Phân bổ |
| B2 Excel mẫu phân bổ + import có kiểm lỗi | ✔ | đã nối trên Booking mới (`containers.js`), có test hai pha |
| B2 In lệnh tổng/chi tiết | ✔ | |
| B2 "Gửi lệnh" → email từng Vendor kèm link token | ◐ | nút gửi hàng loạt + test ✔ (15/11); chưa gửi SMTP thật |
| B3 Cổng nhà xe: droplist, thêm nhanh, Excel, sửa cont/xe/tài, ghép 2×20' | ✔ | đã thử đăng nhập + thêm nhanh |
| B4 Chia tuyến đa chặng (Cát Lái → Sóng Thần → Đắk Nông → Nhà máy → Depot) | ◐ | model `Leg/TruckRun/RouteTemplate` + API; **chưa có giao diện** (F1) |
| B4 Tài xế QR, ghi chú điểm đến/cấm đường, mốc trạng thái, qua trạm/bãi, ≤10 ảnh/bước | ✔ | trang `/q/` |
| B4 Đổi cont rỗng khi hạ; street-turn | ✔ | |
| B5 Tự sinh phiếu giao hàng theo mẫu khách | ✔ | `auto_delivery_note_for_trip` |
| B5 Chuyến xong tự sang đối soát | ◐ | JobCharge tự áp ✔; **Biểu giá/Bảng kê UI mất** |
| 4.1 Nút chụp theo nghiệp vụ, đổi tên file tự động, timemark, cây `/Storage/...` | ✔ | `apps/gss/docs.py`, `gss_attachments.py` |
| 4.2 OCR hoá đơn nâng/hạ (MST, ký hiệu, số, mã tra cứu, tiền) | ◐ | đọc QR + nhập tay + khung `ocr.py`; chưa có engine OCR |
| 4.2 Tự tải PDF/XML hoá đơn gốc | ✘ | cần API nhà cung cấp |
| 4.3 QR container/chuyến; QR seal kiện LCL | ✔ / ◐ | container ✔; kiện LCL có nền, chưa kiểm sâu |
| 4.4 Quản lý bãi nhập-xuất-tồn | ✔ | tab Bãi Container & Quét QR |
| 4.5 Dashboard theo cont + vendor, ghép cont tự co chữ, Trip Card drill-down | ✔ | |
| 4.6 Tra cứu theo B/L/cont | ✔ | Dashboard → Tra cứu |
| 4.6 Bảng kê đối soát khách/vendor | ◐ | máy chủ ✔, **UI mất** |
| 5 Web responsive + mobile web cho tài xế/bãi | ✔ | |
| 5 Zalo Mini App / app di động | ✘ | hiện là mobile web |
| 5 Nén ảnh trên thiết bị; storage middleware | ◐ | nén ✔; lưu local, chưa S3 |
| 5 RBAC + token riêng mỗi link Vendor | ✔ | |
| **09/11 Kết nối Zalo: khách nhắn nhóm Zalo, kéo dữ liệu về chung với team** | ✘ | yêu cầu mới, chưa có trong BRD repo; cần làm rõ (xem dưới) |

### Kế hoạch triển khai (đã xếp lại theo đúng thứ tự của PDF, 15/11/2026)
1. **Đợt 1 – Bước 1–3 (đang làm, đã xong phần dưới, CHƯA commit):**
   - ✔ Excel phân bổ xuất/nhập có kiểm lỗi, gán trực tiếp/hàng loạt, in lệnh tổng/chi tiết, Excel và ghép 2×20' của nhà xe: đã có sẵn trên màn Booking mới và có test.
   - ✔ «Lưu & Phát Lệnh» nay gửi email lệnh thật (trước đó không gửi khi nhà xe đã giao theo cont) + email liệt kê số cont; đã chạy trên stack local (backend console), **chưa gửi SMTP thật**.
   - ✔ Chọn mẫu phiếu giao hàng trên form Booking + màn «Quản lý mẫu» (tạo/sửa/xóa/xem trước/gán cho khách); đã thử trên trình duyệt với 2 mẫu cho 2 khách (Minh Phúc, Đắk Nông XNK).
   - ✔ Đính kèm bộ chứng từ nhập khẩu: giao diện và xoá mềm đã có.
   - ◐ **Còn lại:** thử SMTP thật; khối «Chia cont cho nhà xe» (`vendor-allocations.js`) đang nằm trong vùng ẩn của trang Booking (luồng thật ở màn Lệnh điều vận) — cần quyết định bỏ hay giữ; biển số đầu kéo được chuẩn hoá bỏ dấu chấm (51C-12345) nhưng rơ-moóc giữ nguyên (51R-456.78); truy cập thẳng `/sales` trả 404 (đi qua menu thì vào được).
2. **Đợt 2 – Đa chặng (Bước 4):** giao diện chuỗi chặng Cát Lái → Sóng Thần → Đắk Nông → Nhà máy → Depot, mốc qua trạm và timeline trên Trip Card.
3. **Đợt 3 – Đối soát (mục 4.6), tối giản:** lọc B/L ↔ số cont ↔ khách ↔ nhà xe trên chuyến hoàn tất, xuất bảng kê khách và nhà xe; Biểu giá/Chi hộ chỉ làm đến mức bảng kê cần; chốt X3.
4. **Đợt 4 – Hoá đơn:** chọn engine OCR hoặc nhà cung cấp, nối tự tải XML/PDF.
5. **Đợt 5 – Zalo:** làm rõ phạm vi (xem câu hỏi), rồi làm kênh nhận tin.
6. **Đợt 6 – Mở rộng:** kiện LCL đầy đủ, báo cáo GSS (X2), dọn BIM cũ, Zalo Mini App, S3.

### Câu hỏi cần chốt cho yêu cầu Zalo 09/11
Zalo không cho đọc tự do nhóm chat cá nhân; hướng khả thi phải qua Zalo OA/nhóm của OA do Zalo duyệt (cần xác minh điều kiện hiện hành với Zalo trước khi cam kết). Cần anh cho biết: (a) khách nhắn vào nhóm Zalo nào (nhóm thường hay OA), (b) muốn "kéo về" tin nhắn, ảnh hay chỉ trạng thái, (c) dữ liệu kéo về gắn vào B/L/chuyến tự động hay người xử lý gắn tay.
