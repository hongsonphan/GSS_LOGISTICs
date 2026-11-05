# GSS LOGISTICS – PHÂN TÍCH HIỆU CHỈNH & KẾ HOẠCH TÁI CẤU TRÚC

## 0. HANDOFF – ĐỌC PHẦN NÀY TRƯỚC (cập nhật 05/11/2026)

> Dành cho các session/agent khác cùng làm dự án GSS. Phần này **thay thế** mọi chỗ mâu thuẫn trong §1–§5 bên dưới (đó là phân tích ban đầu, giữ để tham khảo lý do).
> **Trước khi làm bất cứ việc gì: đọc mục 0.1–0.7, chạy `git log --oneline` trên nhánh dưới đây, và hỏi người dùng nếu việc của bạn chạm vào mục "Đã làm".**

### 0.1. Vị trí mã
- **Nhánh làm việc:** `claude/gss-logistics-restructure-04b156` (worktree `.claude/worktrees/gss-logistics-restructure-04b156`). Commit local: `d9f0511` (GĐ0–5), `06f6893` (Postgres Docker + sửa khóa dòng), `8fb5d7c` (docs).
- **Chưa push, chưa merge vào `master`.** `origin` = GitHub `hongsonphan/BIM_LOGISTICS`, `vps` = máy chủ production. Theo `CLAUDE.md`, push `master` sẽ tự deploy: **không push/merge khi người dùng chưa cho phép.**
- Các worktree khác trên máy (`eager-haslett-1d5af3` detached tại `master`, `pw-local-cong-8088-9a7a41`, các worktree BIM_Logistics) **không chứa công việc này.** Muốn dùng, hãy merge/cherry-pick nhánh trên, đừng viết lại.
- File BRD gốc `docs/BRD_GREEN_SOLUTIONS_SMART_GSS.md` chỉ nằm ở checkout gốc `E:\Bim_Logisstic_GSS\docs\` (chưa commit), không có trong nhánh này.

### 0.2. Quyết định kiến trúc đã chốt (đừng đảo lại nếu chưa hỏi)
1. **Mở rộng `DispatchTrip`**, không tạo `ContainerLeg`. 1 `DispatchTrip` = 1 dòng điều vận của 1 cont.
2. **`step_status`** (READY → ARRIVED_AT_PICKUP → LOADED_ON_VEHICLE* → ARRIVED_AT_DELIVERY → UNLOADED* → RETURNING_EMPTY → EMPTY_RETURNED*; `*` cần ≥1 chứng từ) là máy trạng thái GSS, độc lập với `TripStatus` cũ; mỗi lần chuyển đồng bộ **một chiều** sang `TripStatus`. Logic ở `apps/dispatch/gss_workflow.py`. **Không** dùng `core/workflows.py` cũ cho GSS.
3. Giao diện GSS là **trang độc lập mobile-first** (`static/css/gss.css`, `static/js/gss/*`), **không** viết thêm vào SPA cũ (`static/js/src/app`) ngoài vài chỗ đã làm ở Booking/Danh mục/Công ty.
4. **QR không nhúng dữ liệu**: token ký HMAC `T<id>.<sig>` / `P<id>.<sig>` (`core/qr_tokens.py`), vô hiệu hóa bằng cách tăng `qr_version`. Link nhà xe lưu **băm SHA-256**, chỉ hiện 1 lần.
5. **Ẩn tính năng phải chặn ở API**, không chỉ ẩn menu: `core/features.py` (`FeatureGateMiddleware` + `GATED_PREFIXES`). Thêm module mới → thêm tính năng vào `FEATURES`/`PROFILES` và tiền tố URL vào `GATED_PREFIXES`.
6. Đa tenant trong 1 DB (`Company`, `CompanyOwnedModel`) giữ nguyên, chạy 1 công ty/DB; không phát triển thêm. Module kế toán/lương/hải quan **giữ nhưng ẩn** bằng flag.
7. Không xóa cứng: dùng `SoftDeleteModel`; chứng từ/ảnh gỡ = xóa mềm, giữ file.

### 0.3. Đã làm (đừng làm lại) → ở đâu

| Hạng mục | Mã nguồn chính | Test |
| :-- | :-- | :-- |
| Loại hình DN + feature flag (`business_model`, `enabled_features`, `warn_days`), thẻ cài đặt "mục 7" ở Thông tin công ty | `core/features.py`, `apps/master_data/models.py` (`CompanyProfile`), `apps/master_data/api_views.py`, `static/js/src/app/master-data/company-roles.js` | `core/test_features.py` |
| Booking: DEM/DET tự tính (`dem_start_date`, `det_start_date`, override), ghi chú điểm đến, cấm đường (cả `Location`) | `apps/customers/dem_det.py`, `apps/customers/models.py`, `apps/dispatch/api_views/bookings.py`, `sales/booking-page/vendor-allocations.js` | `apps/dispatch/test_vendor.py` |
| Chia cont cho nhà xe + Vendor Link `/vendor/<token>/` | `BookingVendorAllocation` (`apps/dispatch/models.py`), `vendor_service.py`, `api_views/vendor.py`, `vendor_views.py`, `templates/vendor_portal.html` | `test_vendor.py` |
| Workflow Nhận–Giao–Hạ, đổi vỏ hạ rỗng, hủy chuyến | `gss_workflow.py` (`DispatchTrip.step_status`, `return_container_number`, `is_container_swapped`, `container_swap_reason`, 6 mốc thời gian) | `apps/dispatch/test_gss.py` |
| Chứng từ 1–10 file/chặng | `gss_attachments.py`, `TripDocument.workflow_stage/sequence_no` | `test_gss.py` |
| Tin nhắn tài xế (`DriverNotificationLog`), POD theo khách (`PodTemplate`, `Customer.pod_template`, bộ lọc allowlist) | `gss_messages.py`, `api_views/gss.py` | `test_gss.py` |
| Bãi cont Đắk Nông (Gate-in/out, tồn bãi, ảnh ≤10) | app `apps/depot_yard` (`models.py`, `service.py`, `api.py`) | `test_gss.py` |
| Dashboard ma trận nhà xe (ô số = danh sách cùng 1 bộ lọc) | `gss_dashboard.py` | `test_gss.py` |
| QR lệnh/kiện hàng lẻ có seal, trang tài xế `/q/<token>/` | app `apps/qr_tracking` (`service.py`, `api.py`), `core/qr_tokens.py`, `templates/qr_trip.html`, `static/js/gss/qr_trip.js` | `test_gss.py` |
| Bảng điều hành `/gss/` (Tổng quan · Điều vận · Bãi · Quét QR · Mẫu biên bản) | `apps/dispatch/gss_views.py`, `templates/gss_console.html`, `static/js/gss/console.js`, `common.js` | `test_gss.py` (trang render) |
| Lệnh `init_gss`, `seed_gss_demo`; đổi tên thương hiệu trang đăng nhập theo gói | `apps/dispatch/management/commands/`, `core/context_processors.py` (`brand`) | `CommandTests` |

URL/API mới: `/gss/`, `/vendor/<token>/`, `/q/<token>/`, `/api/gss/*`, `/api/depot/*`, `/api/qr/*`, `/api/bookings/<id>/vendor-allocations/`, `/api/vendor-allocations/<id>/`, `/api/vendor/<token>/` (khai báo trong `config/urls.py`).

### 0.4. Chạy & kiểm thử
- **Chạy local:** `.\scripts\run_local.ps1 -Seed` → server `http://localhost:8088/gss/`, **DB là PostgreSQL trong Docker** (container `gss_local_postgres`, `127.0.0.1:5437`, file `docker-compose.local.yml`). **Không dùng SQLite.** Tài khoản `gss_admin`, mật khẩu ở `gss_local_credentials.txt` (gitignore).
- **Cảnh báo trùng tài nguyên trên máy này:** cổng **8088** đang dùng bởi server của session `gss-logistics-restructure`; stack `gss_logistics_*` (web 8086, Postgres 5436, worktree `eager-haslett`) và `bim_logistics_*` (5435) là của việc khác – **đừng dừng/xóa**. Worktree `pw-local-cong-8088-9a7a41` có tên gợi ý cũng nhắm cổng 8088: kiểm tra `netstat -ano | findstr :8088` trước khi bật server.
- **Test:** `DEBUG=True SECRET_KEY=x python manage.py test core apps` → hiện **407 test đạt** (cả SQLite và Postgres).
- **Bắt buộc trước commit (CLAUDE.md):** `python scripts/build_app_js.py` và `python scripts/build_css.py` (hook `.githooks/pre-commit` tự kiểm). `static/css/gss.css` và `static/js/gss/*` **không** nằm trong pipeline build (viết tay).
- **Postgres ≠ SQLite:** `select_for_update()` kèm `select_related` trên FK nullable bị Postgres từ chối → dùng `select_for_update(of=('self',))`. Luôn chạy test trên Postgres trước khi coi là xong.
- **Windows:** console cp1252 không in được tiếng Việt → lệnh quản trị dùng `core/console.safe_text`.

### 0.5. Điều chỉnh so với BRD/thiết kế ban đầu
- `DispatchTrip.vehicle` là FK bắt buộc ⇒ chuyến chỉ sinh khi nhà xe nhập **biển số đầu kéo**; dòng chưa có biển số lưu nháp trong `BookingVendorAllocation.draft_rows`.
- Dùng lại `BookingOrder.free_time_demurrage/detention` làm số ngày miễn phí (không thêm cột trùng). Hạn = ngày bắt đầu + (số ngày − 1).
- Nhà xe chỉ sửa dòng khi `step_status` ∈ {READY, ARRIVED_AT_PICKUP}; sau đó chỉ điều vận (staff) sửa.
- Cảnh báo seal sai ghi vào `TrackingEventLog` (`SEAL_ALERT`), không tạo `TripException` vì model đó bắt buộc `reported_by` là Employee.
- Zalo: chỉ soạn + sao chép + mở chat; chưa có ZNS/SMS. `opened_at` chỉ có khi tài xế mở link.

### 0.6. Việc CHƯA làm (có thể nhận – hỏi người dùng trước)
1. Màn điều vận **sửa dòng xe/tài thay nhà xe** trên trang Booking (API `PUT /api/vendor-allocations/<id>/` đã sẵn sàng).
2. Ô DEM/DET + ghi chú cho **modal tạo booking nhanh** (hiện chỉ trang chi tiết Booking có).
3. Cột DEM/DET trong bảng "Điều vận" của **SPA cũ**; menu/tiêu đề SPA chính vẫn mang tên BIM Logistics (chỉ trang đăng nhập và `/gss/` đã đổi).
4. Màn **quản trị nhiều bãi** (`Yard` đã hỗ trợ), vai trò **Thủ bãi** riêng (hiện dùng quyền module Điều vận).
5. Tích hợp **Zalo ZNS / SMS** (cần nhà cung cấp, chi phí).
6. **Kiểm thử camera quét QR trên thiết bị thật**, kiểm thử tải, sao lưu/khôi phục, Dockerfile/compose production cho GSS (mới có compose DB local).
7. Dữ liệu pháp lý mặc định của Triền Võ còn trong `CompanyProfile.get_default_company()` (test cũ kiểm tra chuỗi "TRIỀN VÕ"); hiện xử lý bằng lệnh `init_gss`.
8. Merge nhánh này vào `master` + triển khai VPS (chỉ khi người dùng đồng ý).

### 0.7. Quy tắc phối hợp để không trùng lặp
- Trước khi sửa: xem `git log` nhánh `claude/gss-logistics-restructure-04b156`; tìm trong bảng 0.3 xem đã có chưa.
- Mỗi session làm trên **worktree/nhánh riêng**, chỉ sửa tập file riêng; cần chạm file chung (`config/urls.py`, `apps/dispatch/models.py`, `core/features.py`, migration) thì báo người dùng và merge từ nhánh này trước.
- Migration: đánh số tiếp từ `dispatch 0025`, `customers 0023`, `master_data 0018`, `documents 0004`, `depot_yard 0001`, `qr_tracking 0001`; hai session cùng tạo migration sẽ xung đột → chỉ một session tạo migration tại một thời điểm.
- Cập nhật chính file này (§0) mỗi khi hoàn thành/đổi hướng một hạng mục.

---

> Nguồn: `BRD_GREEN_SOLUTIONS_SMART_GSS.md` v1.0.0 (04/11/2026) đối chiếu với mã BIM Logistics v4.7.x.
> Trạng thái: **GĐ0–5 đã xong trên nhánh local (chưa merge/push). Xem mục 0.**
>
> **Quyết định đã chốt (05/11/2026):** mở rộng `DispatchTrip` (phương án B), **không** tạo `ContainerLeg`. Hệ quả:
> - Một `DispatchTrip` = một dòng điều vận của một cont; cont đôi dùng `trip_group` (hoặc cột cont 2 sẵn có), không sinh model gốc mới.
> - Các trường GSS (`vendor_allocation`, `step_status`, `return_container_number`, `is_container_swapped`, `container_swap_reason`, `qr_token_hash`…) thêm vào `DispatchTrip`; logic mới đặt ở module riêng (`apps/dispatch/gss_*.py`), không viết thêm vào `views.py`/`models.py` hiện có để hạn chế nợ kỹ thuật.
> - `step_status` là máy trạng thái **độc lập** với `TripStatus` cũ; chuyển bước GSS đồng bộ một chiều sang `TripStatus` để báo cáo/kế toán cũ vẫn chạy.
> - `TripContainer` giữ nguyên vai trò đồng bộ từ `DispatchTrip`.
> - Các quyết định còn lại (§5.2–5.5) theo phương án khuyến nghị.
>
> **Tiến độ:** GĐ0 – feature flag + loại hình doanh nghiệp: xong (`core/features.py`, `CompanyProfile.business_model/enabled_features/warn_days`, middleware chặn URL/API, ẩn menu, thẻ chọn ở Cài đặt → Thông tin công ty).
>
> **GĐ1 – Booking & chia cont cho nhà xe: xong.** `BookingOrder` (mốc bắt đầu DEM/DET, ghi đè hạn, ghi chú điểm đến, cấm đường; hạn tự tính ở `apps/customers/dem_det.py`), `Location` (cùng 2 ghi chú), `BookingVendorAllocation` + `vendor_service.py` + `/vendor/<token>/`.
> **Điều chỉnh so với thiết kế:** `DispatchTrip.vehicle` bắt buộc nên chuyến chỉ được sinh khi nhà xe nhập biển số đầu kéo; dòng chưa có biển số lưu nháp trong `draft_rows`. Giữ `free_time_demurrage/detention` có sẵn làm số ngày miễn phí (không thêm cột trùng).

---

## 1. Kết luận khảo sát mã hiện có

| Hạng mục | Hiện trạng BIM | Quyết định cho GSS |
| :--- | :--- | :--- |
| Nền tảng (Django, DRF, JWT, soft-delete, AuditLog, TrackingEventLog, sequences, RBAC `core/access`) | Ổn định, có test | **Kế thừa nguyên** |
| Đa doanh nghiệp trong 1 DB (`Company`, `CompanyOwnedModel`, `core/tenant.py`) | Có sẵn, đang bật `TENANT_ENFORCE` | **Giữ nhưng chạy 1 công ty/DB** (BRD chọn "1 khách = 1 DB"); không phát triển thêm |
| `CompanyProfile` | Dữ liệu mặc định cứng của Triền Võ (tên, MST, ngân hàng, logo) | **Viết lại**: bỏ toàn bộ default Triền Võ, thêm `business_model` + `enabled_features` |
| `DispatchTrip` | ~270 trường, gộp cả điều vận, kế toán, lương, tạm ứng, thầu phụ; cont đôi bằng cột `_2` | **Không mở rộng tiếp.** Tách lõi vận chuyển GSS gọn hơn (xem §3) |
| `TripContainer` | Chỉ là bảng phản chiếu từ cột của `DispatchTrip` | **Đảo chiều**: trở thành thực thể gốc (1 cont = 1 dòng điều vận) |
| `TripDocument` | `file_path` là CharField, không giới hạn số file, không gắn bước | **Viết lại** với `FileField`, `workflow_stage`, ràng buộc 1–10 |
| State machine `core/workflows.py` | 11 trạng thái, cho phép nhảy cóc, lỗi bị nuốt (`except: pass`) | **Viết lại** theo 3 chặng của GSS |
| Cổng tài xế (`driver_token`, `/driver/<hash>/`) | Token theo chuyến, có thu hồi | **Kế thừa cơ chế token**, nâng cấp thành Driver Portal + QR |
| Billing, Ledger, Personnel (lương/BHXH), Customs, Collaboration | ~20.000 dòng | **Không đưa vào lõi GSS** – ẩn bằng feature flag (`ENTERPRISE_FULL` mới bật) |
| Frontend SPA (`static/js/src/app`, build `app.js`/Tailwind) | Có pipeline + CI check | **Kế thừa pipeline**, viết view mới |

Hệ quả: GSS **không nên là bản "đắp thêm" lên `DispatchTrip`**. Làm lõi mới (`apps/dispatch` gọn + `depot_yard` + `qr_tracking` + `vendor portal`), còn module cũ (billing/ledger/personnel/customs) giữ nguyên nhưng nằm sau feature flag.

---

## 2. Các điểm cần chuẩn hóa trong BRD (mâu thuẫn / lỗ hổng logic)

### 2.1. Mâu thuẫn nội bộ
1. **Tên `business_model` không thống nhất** – §1.2: `FLEET_PNL / GSS_VENDOR_DEPOT_QR / ENTERPRISE_HYBRID`; §2.1: `GSS_VENDOR_DEPOT_QR / INTERNAL_FLEET_PNL / ENTERPRISE_FULL`; §5.2: `FLEET_PNL / GSS_VENDOR_DEPOT_QR / HYBRID_FULL`.
   → **Chuẩn:** `INTERNAL_FLEET_PNL`, `GSS_VENDOR_DEPOT_QR`, `ENTERPRISE_FULL`.
2. **Tên trạng thái tài xế** – §2.4 dùng 6 mã tiếng Anh (`ARRIVED_AT_PICKUP`…), §5.2 dùng nhãn tiếng Việt, hệ thống cũ có `TripStatus` riêng. → **Chuẩn:** một enum duy nhất `StepStatus` (xem §3.3); `TripStatus` cũ không dùng cho GSS.
3. **Thư mục đích** §4 là `E:/Bim_Logistics_GSS`, thực tế làm trong worktree/nhánh Git hiện tại. → Làm trên nhánh này, không nhân bản thư mục.
4. **Gate-in/Gate-out xuất hiện 2 lần** – §2.6 (phân hệ bãi) và §2.7 (quét QR cập nhật "Gate-in Bãi"). → Chỉ **một nguồn sự thật**: `DepotContainerMovement`; QR chỉ là cách *kích hoạt* tạo bản ghi.
5. "Tối đa 10 file/bước" áp cho điều vận (§2.4), Gate-in (§2.6, 10 ảnh) – cần một cơ chế đính kèm dùng chung (`Attachment` generic), không viết 2 lần.

### 2.2. Lỗ hổng nghiệp vụ & logic
| # | Vấn đề | Chuẩn đề xuất |
| :-- | :--- | :--- |
| L1 | DEM/DET: BRD nhập tay cả "số ngày miễn phí" lẫn "ngày hết hạn" → dễ lệch nhau | Chỉ nhập **mốc bắt đầu** (ngày tàu cập/ngày lấy cont) + **số ngày miễn phí**; `expiry` **tự tính**, cho phép ghi đè có lý do. DEM tính tới ngày *lấy cont khỏi cảng*, DET tính tới ngày *trả vỏ rỗng*. Cảnh báo theo **từng cont**, dừng cảnh báo khi đã đạt mốc tương ứng |
| L2 | "Cảnh báo ≤ 2 ngày" cứng | Tham số hóa `warn_days` (mặc định 2) trong `enabled_features` |
| L3 | Tổng cont chia cho vendor ≠ tổng booking? | Ràng buộc: `Σ allocated ≤ total_containers`; còn dư thì Booking ở trạng thái "Chưa chia đủ"; sửa số lượng chỉ được khi chưa có dòng xe nào bị khóa |
| L4 | Magic link: BRD chỉ nói `expires_at` | Token ngẫu nhiên ≥ 32 byte, **lưu hash** (không lưu thô), hết hạn + thu hồi + giới hạn tốc độ; vendor chỉ sửa được dòng **chưa bắt đầu chạy**; không hiển thị giá/cước cho vendor |
| L5 | Vendor sửa số cont/biển số "bất cứ lúc nào" | Sau khi dòng đã `LOADED` trở đi chỉ **Điều vận GSS** được sửa, vendor chỉ gửi yêu cầu; mọi sửa đổi ghi `AuditLog` (trước/sau, ai, kênh) |
| L6 | Cùng 1 số cont/biển số gán trùng 2 dòng đang chạy | Chặn trùng số cont trong các dòng chưa hoàn tất; cảnh báo xe/tài xế đang bận. Kiểm tra định dạng ISO 6346 (4 chữ + 7 số, check digit) – cảnh báo mềm |
| L7 | Chứng từ "tối thiểu 1 – tối đa 10" nhưng chưa nói ai/khi nào tính | Chặn **chuyển sang trạng thái hoàn tất của chặng** (`LOADED_ON_VEHICLE`, `UNLOADED`, `EMPTY_RETURNED`) khi chưa đủ ≥1 file của chặng đó; trạng thái "đã đến nơi" không yêu cầu file. Giới hạn 10 kiểm tra ở **server** (transaction + khóa dòng), không chỉ ở client |
| L8 | Ngoại lệ không có chứng từ (mất mạng, hỏng điện thoại) | Điều vận có quyền **ghi đè kèm lý do bắt buộc** (ghi `AuditLog`), tài xế thì không |
| L9 | Đổi vỏ khi hạ rỗng | Giữ `container_number` (nhận/giao) và `return_container_number`; **lý do bắt buộc**; vỏ mới phải đúng quy cách/hãng tàu (cảnh báo nếu khác); DET tính theo vỏ **trả về hãng tàu**, nên tra cứu cả hai số. Lịch sử đổi là bất biến |
| L10 | Cont đôi (2×20) | Mỗi cont là **một dòng riêng**, nhóm bằng `trip_group` (kế thừa nhu cầu `container_number_2`) |
| L11 | Hàng lẻ (LCL) dùng chung `DispatchTrip` với FCL | `TripPackageSeal` gắn vào dòng điều vận; quét kiện: đủ kiện + khớp seal mới cho chốt biên bản; seal rách/thiếu → tạo sự cố tự động (`exceptions`) |
| L12 | QR chứa "toàn bộ thông tin" (§2.7) | **QR chỉ chứa URL + token**, không nhúng dữ liệu (tránh lộ thông tin, QR luôn cập nhật). Quyền tác nghiệp xác định theo đăng nhập/vai trò, không theo việc ai cầm QR |
| L13 | Tài xế quét tự cập nhật trạng thái | Cần **xác nhận vị trí tùy chọn** (GPS) và chống quét lặp; trạng thái chỉ đi **tiến**, lùi cần điều vận |
| L14 | "Tích hợp Zalo ZNS/SMS" | Giai đoạn đầu chỉ làm **soạn tin + copy + mở Zalo theo SĐT**; ZNS/SMS là adapter để sau (cần hợp đồng nhà cung cấp). Không hứa "đã đọc" nếu kênh không có xác nhận – `is_read` chỉ đúng với `PORTAL_LINK` |
| L15 | POD "theo mẫu từng công ty" bằng nhiều cột cứng trên `Customer` | Tách `PodTemplate` (HTML template an toàn, biến cố định, sandbox) thay vì `pod_custom_header/terms` rời rạc; mẫu mặc định + mẫu riêng theo khách |
| L16 | Bãi Đắk Nông hard-code | `Yard` là bảng danh mục (có thể nhiều bãi); Đắk Nông là bản ghi mặc định. Thêm **sức chứa**, **vị trí ô bãi (block/row)** tùy chọn |
| L17 | Xóa mềm "tuyệt đối" | Đồng ý; bổ sung: file đính kèm **không xóa vật lý**, chỉ đánh dấu và ẩn; ai xóa/ khôi phục đều có log |
| L18 | Ẩn module bằng sidebar | Ẩn UI **không đủ** – phải chặn ở **API/permission** (`require_feature`), nếu không người dùng vẫn gọi được endpoint |

### 2.3. Phi chức năng (bổ sung vào QA/QC)
- Bảo mật upload: kiểm tra magic bytes + dung lượng (≤ 10 MB/file sau nén), chỉ ảnh/PDF, tên file ngẫu nhiên, phục vụ qua view có kiểm tra quyền (đã có `core/media_views.py`).
- Chịu mạng yếu: hàng đợi upload phía client, thử lại, hiển thị tiến độ từng file; chống gửi đôi (idempotency key).
- Mobile: nút ≥ 48px, một việc mỗi màn hình, chữ ≥ 16px, hoạt động trong Zalo In-App Browser (camera/`getUserMedia` cần HTTPS – kiểm thử riêng).
- Hiệu năng: chỉ mục theo `container_number`, `status`, `gate_in_at`; dashboard dùng truy vấn tổng hợp, không N+1.
- Múi giờ: lưu UTC, hiển thị `Asia/Ho_Chi_Minh`; "hôm nay" tính theo giờ VN.

---

## 3. Thiết kế chuẩn hóa

### 3.1. Mô hình dữ liệu (thu gọn, thay cho §5 của BRD)

```
CompanyProfile(business_model, enabled_features JSON, warn_days, ...)
Location(+ destination_notes, road_restrictions)
Customer(+ pod_template FK)            PodTemplate(code, html, is_default)

BookingOrder(+ dem_free_days, det_free_days, dem_start_date, det_start_date,
             dem_expiry_override, det_expiry_override, total_containers,
             destination_notes, road_restrictions)
   └─ BookingVendorAllocation(booking, subcontractor, allocated_containers,
                              token_hash, expires_at, status, locked_at)
        └─ ContainerLeg  ← thực thể gốc: 1 cont = 1 dòng điều vận
             (allocation FK, line_no, trip_group, container_number, seal_number,
              tractor_plate, trailer_plate, driver_name, driver_phone,
              step_status, return_container_number, swap_reason, qr_token_hash,
              picked_at, delivered_at, returned_at)
             ├─ StageAttachment(leg, stage, seq 1..10, file, uploaded_by, source)
             ├─ PackageSeal(leg, index, package_code, seal_number, qr_token_hash, status,
             │              scanned_at_pickup, scanned_at_delivery)
             ├─ DriverMessageLog(leg, channel, content, sent_by, sent_at, opened_at)
             └─ DepotMovement(yard FK, container_number, gate_in_at/by, gate_out_at/by, ...)
Yard(code, name, capacity)       QRScanLog(token_type, target, scanned_by, result, at)
```
Ghi chú: `ContainerLeg` có thể là **model mới trong `apps/dispatch`** song song `DispatchTrip` (module kế toán/lương cũ vẫn tham chiếu `DispatchTrip`; cầu nối 1–1 khi bật gói `ENTERPRISE_FULL`). Đây là quyết định cần bạn xác nhận (xem §5).

### 3.2. Feature flags
`core/features.py`: `has_feature(name)`, decorator `require_feature` cho view/API, và context processor đẩy xuống JS (`hasFeature`). Danh sách: `vendor_portal`, `depot_yard`, `qr_tracking`, `lcl_packages`, `pod_templates`, `driver_messages`, `dem_det_alerts`, `billing`, `payroll`, `customs`, `fleet_internal`, `ledger`.

### 3.3. Máy trạng thái điều vận GSS (1 enum, chỉ đi tiến)
```
PENDING_VENDOR_INFO → READY → ARRIVED_AT_PICKUP → LOADED_ON_VEHICLE*
  → ARRIVED_AT_DELIVERY → UNLOADED*  → RETURNING_EMPTY → EMPTY_RETURNED*   (* cần ≥1 chứng từ)
  (+ CANCELLED từ bất kỳ bước trước LOADED; lùi bước chỉ Điều vận, có lý do)
```
Mỗi lần chuyển: kiểm tra điều kiện → ghi `TrackingEventLog` + `AuditLog` trong cùng transaction (không nuốt lỗi như `workflows.py` cũ).

### 3.4. UI/UX chuẩn
- **Vai trò → màn hình:** KD (Booking) · Điều vận (bảng điều vận + chia vendor) · Vendor (lưới nhập, chỉ 1 trang) · Tài xế (thẻ chuyến, 1 nút hành động chính) · Thủ bãi (quét → Gate-in/out) · Ban GĐ (Dashboard).
- **Bảng điều vận:** cột cố định (Cont · Vendor · Xe/Tài · Bước hiện tại · DEM/DET · Chứng từ x/10); lọc nhanh theo trạng thái; cảnh báo màu **kèm biểu tượng/chữ** (không chỉ dựa vào màu – hỗ trợ người mù màu và ánh nắng ngoài trời).
- **Dashboard:** 4 KPI + ma trận vendor; mỗi số bấm vào lọc danh sách (đúng BRD); số liệu cùng một nguồn truy vấn với danh sách để không bao giờ lệch.
- **Vendor Portal:** lưới thẻ trên điện thoại (không bảng ngang), lưu nháp tự động, báo "còn thiếu n dòng", không cần đăng nhập.
- **Driver Portal:** hiển thị trước tiên: *điểm đến → ghi chú điểm đến → cấm đường → nút bước kế tiếp*; ảnh chụp qua camera, nén phía client, hiển thị 0/10.
- **Quét QR:** một màn hình, quét xong hiện thẻ kết quả + 1–2 nút hành động hợp lệ với vai trò; âm báo/rung khi khớp/lỗi seal.
- **Ngôn ngữ:** tiếng Việt, thuật ngữ nhất quán (Nhận cont / Giao hàng / Hạ rỗng).

---

## 4. Lộ trình (điều chỉnh từ BRD §6)

| GĐ | Nội dung | Ghi chú thay đổi so với BRD |
| :-- | :--- | :--- |
| 0 | **Dọn nền:** bỏ dữ liệu mặc định Triền Võ, đổi nhận diện GSS, `core/features.py`, sửa `CompanyProfile`, chuẩn hóa `business_model`, ẩn module theo flag **cả ở API** | Thêm mới (BRD thiếu) |
| 1 | Booking (DEM/DET tự tính, ghi chú điểm đến, cấm đường) + `BookingVendorAllocation` + Vendor Portal | Gộp GĐ1–2 BRD phần Booking/vendor |
| 2 | `ContainerLeg` + máy trạng thái + `StageAttachment` 1–10 + đổi vỏ hạ rỗng + gửi tin tài xế + `PodTemplate` | Như GĐ3 BRD, thêm L5–L9 |
| 3 | `Yard` + `DepotMovement` + Dashboard vendor | Như GĐ4 |
| 4 | QR (lệnh, tracking, `PackageSeal`) + màn quét | Như GĐ5, QR chỉ chứa token (L12) |
| 5 | Hardening: phân quyền, kiểm thử tải, nhật ký, sao lưu, đóng gói Docker/triển khai | Thêm mới |

Mỗi giai đoạn: migration + test (`python manage.py test`) + `build_app_js.py` + `build_css.py` (quy tắc CLAUDE.md) trước khi commit.

---

## 5. Quyết định cần chốt trước khi viết mã

1. **Thực thể gốc:** (A) tạo `ContainerLeg` mới, `DispatchTrip` cũ chỉ dùng cho gói `ENTERPRISE_FULL` *(khuyến nghị)*; hay (B) tiếp tục mở rộng `DispatchTrip` (nhanh hơn, nhưng nợ kỹ thuật lớn, khó test).
2. **Module kế toán/lương/hải quan:** giữ trong repo nhưng ẩn (khuyến nghị) hay xóa hẳn khỏi dự án GSS.
3. **Đa tenant trong 1 DB:** để nguyên đang chạy 1 công ty (khuyến nghị) hay gỡ bỏ.
4. **Kênh gửi tin:** GĐ đầu chỉ copy/mở Zalo (khuyến nghị) hay cần ZNS/SMS ngay (cần nhà cung cấp & chi phí).
5. **Lưu file:** đĩa local/volume Docker (khuyến nghị cho GĐ đầu) hay S3-compatible.
>
> **GĐ2–GĐ5: xong (05/11/2026).** Máy trạng thái + chứng từ 1–10 file/chặng + đổi vỏ hạ rỗng (`gss_workflow.py`, `gss_attachments.py`), gửi tin tài xế + POD theo khách (`gss_messages.py`, `PodTemplate`),
> Bãi Đắk Nông (`apps/depot_yard`), Dashboard nhà xe (`gss_dashboard.py`), QR + hàng lẻ có Seal (`apps/qr_tracking`, `core/qr_tokens.py`), Bảng điều hành `/gss/`, trang tài xế `/q/<token>/`.
> **Điều chỉnh:** giao diện GSS mới (`/gss/`, `/vendor/`, `/q/`) là các trang độc lập mobile-first dùng `static/css/gss.css` + `static/js/gss/*` (không qua SPA/Tailwind cũ) để không phụ thuộc vào SPA 10.000+ dòng; đã thêm liên kết ở sidebar.
> Chi tiết chạy và giới hạn: xem `docs/GSS_RUNBOOK.md`.
