# Kế hoạch thực hiện §7.2 – Copy, gọt và chốt mô hình (GĐ0)

Ngày lập 09/11/2026. Kế hoạch đã duyệt và thực hiện ngày 09/11/2026 – xem mục 7. Tài liệu căn cứ vào §4 (mô hình dữ liệu), §7.1 (bảng phân loại) và §7.2–7.3 (quy trình) của đặc tả "GSS — Đặc tả tính năng & kế hoạch chuyển đổi từ BIM Logistics".

## 1. Hiện trạng (kiểm kê ngày 09/11/2026)

| Hạng mục | Số liệu |
| :-- | :-- |
| Lịch sử git | 652 commit, bắt đầu từ commit khởi tạo BIM Logistics (21/09/2026). Remote `origin` = GSS_LOGISTICs, `old-origin` = BIM_LOGISTICS |
| App Django | 14 app nghiệp vụ + `core` |
| Migration | 166 file (`core` 17, `customers` 26, `dispatch` 27, `master_data` 24, `billing` 22, `personnel` 15, …) |
| Mã | khoảng 66 nghìn dòng Python, 115 file JS |
| Dữ liệu CSDL 8086 | **chỉ có dữ liệu minh hoạ**: 1 công ty, 1 khách, 2 đơn, 12 chuyến, 0 nhân viên. Chưa có VPS, chưa có dữ liệu thật |
| Dấu vết TVL | 57 file còn chuỗi "Triền Võ"/"TVL" (model, migration, seed, test, posting) |
| Lớp chuyển tiếp cũ | `migrate_legacy_access`, nhánh Legacy trong `core/permissions.py`, `hashids` trong `core/security.py` |
| Đối tác | 5 bảng tách rời: `customers.Customer`, `master_data.Subcontractor`, `master_data.ShippingLine`, `master_data.Partner`, `master_data.SubcontractorDriver`. Có 25 khoá ngoại trỏ tới chúng |
| Nhân sự/lương | `apps/personnel` có 15 model (hợp đồng, chấm công, lương, thuế TNCN). `Employee` đang được `billing`, `collaboration`, `customers`, `dispatch` dùng làm "người tạo" và "tài xế" |

**Kết luận:** chưa có dữ liệu thật, nên xoá migration và dựng lại CSDL lúc này gần như không tốn gì. Khi GSS đã chạy thật, cùng việc đó sẽ phải viết script chuyển dữ liệu cho từng bảng.

## 2. Nguyên tắc

1. **Giữ hành vi đã nghiệm thu.** Mọi luồng đã chạy (B/L và danh sách cont, phân bổ, cổng nhà xe, QR tài xế, bãi, biểu giá, chi hộ, bảng kê, sổ cái) phải có test trước khi gọt. Sau mỗi bước, bộ test đó vẫn phải xanh.
2. **Gọt từ lá vào gốc.** Mỗi nhóm một commit, chạy test sau mỗi commit.
3. **Anh duyệt bảng GIỮ/SỬA/BỎ/THAY (mục 4) trước khi xoá bất cứ thứ gì.**
4. Repo cũ (BIM_LOGISTICS và nhánh `master` hiện tại) giữ nguyên làm bản tham chiếu. Không force-push đè lịch sử.

## 3. Các bước

### Bước 1 – Repo mới, sạch bí mật (≈ 0,5 ngày)
- Copy cây mã (không có `.git`) sang thư mục mới, đề xuất `E:\GSS_TMS`. Chạy `git init`, commit đầu chưa có lịch sử cũ.
- Xoá: `.env`, `media/`, bản sao lưu, file Excel/ảnh mẫu, fixture và seed có dữ liệu thật, `.gitcred`, `*.bak`.
- Tạo mới bí mật: `SECRET_KEY`, mật khẩu DB, salt, khoá email, khoá ký QR.
- Chạy `gitleaks detect` toàn repo **trước** commit đầu.
- Repo GitHub: cần anh chọn (xem mục 6, câu 1).

### Bước 2 – Gọt phần TVL / BIM không dùng (≈ 2 ngày, mỗi dòng dưới đây là một commit)
1. Nhân sự/lương: hợp đồng, phụ lục, người phụ thuộc, chấm công, kỳ lương, phiếu lương, thuế TNCN, bảng lương tài xế, phụ cấp, cùng giao diện `hr`.
2. Lớp chuyển tiếp: `migrate_legacy_access`, nhánh Legacy* trong phân quyền, `assign_default_company`, `hashids`.
3. Mô hình chuyến TVL: `TripContainer`, `TripTimelineItem`, `sync_trip_data`, máy trạng thái 11 bước cũ, tạm ứng tài xế, quỹ điều vận, quyết toán lương tài xế.
4. Báo cáo/dashboard theo chuyến kiểu TVL, `seed_sample_data`, cùng mọi chuỗi "Triền Võ"/TVL.

### Bước 3 – Dựng mô hình mới theo §4 (≈ 4–5 ngày)
| App mới | Lấy từ | Thay đổi chính |
| :-- | :-- | :-- |
| `core` | giữ | `Employee` thu gọn còn hồ sơ người dùng nội bộ (không lương). Thêm `public_id` UUIDv7 |
| `masterdata` | `master_data` + `customers.Customer` | **Party một bảng** có cờ vai trò (khách, vendor, hãng tàu, NCC, depot) và mã ngắn. `Driver` thuộc vendor, unique theo SĐT. `Vehicle`/`Chassis` unique biển số theo vendor. Thêm `DocumentType`, `MilestoneType`, `DeliveryNoteTemplate` |
| `pricing` | `gss` (ChargeCode/RateCard/RateLine) | chuyển nguyên, khoá ngoại trỏ Party |
| `orders` | `customers.BookingOrder` + `gss.BookingContainer` + `CustomsDeclarationRef` | tách `BillOfLading` (MBL ◄ HBL, unique company+issuer+number), `Shipment`, `Equipment`, `TransportJob` (CONTAINER/LOOSE, unique shipment+equipment, `reused_from_job` cho street-turn), `Stop`, `DeliveryDrop`, `CargoItem` |
| `dispatch` | `BookingVendorAllocation`, vendor portal | `VendorAllocation` (partial unique: một phân bổ hiệu lực mỗi job), `AccessGrant` (đã có token băm), `VendorAccount`, `ImportBatch`, **`Leg`, `TruckRun` (≤ 2 TEU), `RouteTemplate`** |
| `tracking` | `core.TrackingEventLog` | `TrackingEvent` chỉ ghi thêm, có `corrects_event`, nguồn app/QR/tay/import |
| `documents` | `TripDocument` + `capture_meta` | `StoredFile` (UUID, sha256, EXIF, GPS), `FileDerivative`, `DocumentLink` (sinh tên chuẩn) |
| `yard` | `depot_yard` | `GateTransaction`, mỗi equipment chỉ một lượt vào chưa đóng; tồn bãi là view |
| `billing` | `gss` (claims/invoices/statements) + `ledger` | `CostItem`, `EInvoice`, `JobCharge`/**`JobCost` tách bảng**, `Statement`, `DeliveryNote`. Sổ cái giữ nguyên, nối nguồn bút toán vào Statement/JobCharge/JobCost |

Logic nghiệp vụ trong `apps/gss/*.py` (containers, vendor_excel, pricing, claims, statements, docs, journey) đã viết theo đúng khái niệm này. Phần việc chủ yếu là đổi tên model và khoá ngoại, không phải viết lại logic.

### Bước 4 – Xoá migration, sinh `0001_initial` (≈ 0,5 ngày)
- Xoá toàn bộ 166 migration, chạy `makemigrations` sinh một `0001_initial` sạch cho từng app.
- Xoá volume Postgres local, `migrate` từ đầu, chạy lại `seed_gss_demo` (viết lại theo model mới, không dùng dữ liệu thật).

### Bước 5 – Row-Level Security PostgreSQL (≈ 1,5 ngày)
- Mỗi bảng có `company_id`: `ENABLE` và `FORCE ROW LEVEL SECURITY`, policy `company_id = current_setting('app.company_id')::bigint`.
- Middleware chạy `SET LOCAL app.company_id` đầu mỗi request (trong transaction). Lệnh nền và cron đặt biến này theo từng công ty.
- Hai vai trò DB: `gss_app` (web, chịu RLS) và `gss_owner` (migrate/backup, `BYPASSRLS`).
- Giữ `TENANT_ENFORCE` ở tầng ORM làm lớp thứ hai.
- Test: người dùng công ty A không đọc hoặc ghi được dữ liệu công ty B, kể cả qua raw SQL.

### Bước 6 – Đổi tên, CI, tài liệu (≈ 1 ngày)
- Đổi tên project, settings, container Docker, nhãn giao diện (cổng 8086/5436 giữ nguyên).
- Dựng lại CI: build JS/CSS `--check`, test, gitleaks, ZAP và uptime chạy tay. Tạm hạ ngưỡng coverage rồi nâng dần về 72%.
- Viết lại `AGENTS.md`, `data-integrity-rules.md`, CLAUDE.md, runbook. Thêm `PLATFORM_PATCHES.md` (§7.3).

### Tiêu chí hoàn thành
- Đăng nhập, phân quyền, danh mục đối tác, sổ cái chạy được.
- Các luồng GSS đã nghiệm thu chạy lại trên 8086 với `DEMO.BL.001`.
- Test xanh, gitleaks sạch.
- `grep` không còn "Triền Võ", tên nhân viên TVL hay mã chuyến TVL nào.
- ERD mới in trong `docs/`.

Tổng ước lượng: khoảng **9–11 ngày làm việc**. Có thể chạy song song bước 5 với bước 6 sau khi bước 4 xong.

## 4. Bảng GIỮ/SỬA/BỎ/THAY đề xuất (cần anh duyệt)

| Thành phần | Xử lý | Ghi chú |
| :-- | :-- | :-- |
| Bảo mật tài khoản, Argon2id, LoginEvent, quên mật khẩu, CSP, static tự host | GIỮ | chạy lại test bảo mật |
| CompanyOwnedModel, AuditLog, Sequence, TENANT_ENFORCE | SỬA | thêm RLS |
| `core/access.py`, giao diện Vai trò & Phân quyền | SỬA | khai báo lại phân hệ và 7 vai trò |
| Sổ cái `apps/ledger` | SỬA | nối nguồn bút toán mới |
| Customer, Subcontractor, ShippingLine, Partner | THAY | bằng Party một bảng |
| DispatchTrip, TripContainer, máy trạng thái cũ | THAY | bằng TransportJob, Leg, TruckRun, TrackingEvent (máy 7 bước GSS giữ) |
| Link tài xế hashids | THAY | bằng AccessGrant + QR ký số (QR hiện đã dùng token băm) |
| Dashboard theo chuyến | THAY | bằng dashboard theo container + Trip Card (đã có) |
| `apps/personnel` lương/chấm công/hợp đồng | BỎ | ⚠ xem mục 6, câu 2 |
| `billing`: tạm ứng tài xế, quỹ điều vận, quyết toán lương tài xế, phiếu thu chi | BỎ / GIỮ? | ⚠ xem mục 6, câu 2 |
| `collaboration` (chat, tin, việc), `customs`, `exceptions`, `fleet` (xe của công ty) | GIỮ? | ⚠ xem mục 6, câu 2 |
| Báo giá `Quotation`, `RouteTariff` | THAY | bằng `pricing` |
| Toàn bộ migration | BỎ | sinh lại `0001_initial` |
| `apps/gss` (logic đã làm theo đặc tả) | GIỮ | tách vào các app mới ở bước 3 |

## 5. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
| :-- | :-- |
| Gọt nhầm làm hỏng luồng đang chạy | viết test luồng trước khi gọt; mỗi nhóm một commit; repo cũ giữ làm tham chiếu |
| RLS chặn cả lệnh nền và cron | vai trò `gss_owner` riêng cho lệnh quản trị; test riêng cho từng lệnh |
| Giao diện JS đang gọi API theo tên cũ | đổi API và JS cùng một commit; chạy thử trên trình duyệt sau mỗi bước 3.x |
| Party một bảng làm đổi mã ngắn đang dùng trong tên file | giữ nguyên mã ngắn hiện có của nhà xe khi chuyển |
| Hai repo lệch nhau về bản vá bảo mật | `PLATFORM_PATCHES.md` ở cả hai repo (§7.3) |

## 6. Cần anh quyết trước khi bắt đầu

1. **Repo GitHub:** tạo repo mới (ví dụ `GSS_TMS`), hay đổi `GSS_LOGISTICs` thành lịch sử mới (phải xoá lịch sử cũ trên GitHub)? Đề xuất: **repo mới**, giữ `GSS_LOGISTICs` làm bản lưu.
2. **Phần BIM cũ còn dùng cho GSS không?** Đặc tả bảo bỏ nhân sự/lương. Nhưng trước đây anh dặn "không phá yêu cầu cũ". Cần chốt từng nhóm:
   - nhân sự/lương;
   - tạm ứng, quỹ, phiếu thu chi;
   - xe của chính công ty (GSS có xe riêng hay chỉ thuê nhà xe?);
   - chat/tin/việc nội bộ;
   - hải quan;
   - sự cố.

   Đề xuất:
   - bỏ: nhân sự/lương, tạm ứng tài xế;
   - giữ: phiếu thu chi, sự cố, chat/việc;
   - giữ xe công ty nếu GSS có xe riêng.
3. **Khoá chính:** giữ số tự tăng bên trong và thêm `public_id` UUIDv7 cho mọi thứ lộ ra ngoài (URL, API, tên file)? Hay đổi hẳn sang UUID làm khoá chính? Đề xuất: **giữ số tự tăng + `public_id`**, nhanh hơn và an toàn như nhau với người ngoài.
4. **Xoá CSDL local 8086:** đồng ý dựng lại từ đầu (chỉ mất dữ liệu minh hoạ)?
5. **Frontend:** giữ Vanilla JS hay chuyển TypeScript (điểm chờ xác nhận số 7)? Đề xuất: **giữ Vanilla JS** trong GĐ0. TypeScript có thể làm sau và không ảnh hưởng §7.2.
6. **Bãi Đắk Nông** là bãi của GSS hay bãi thuê? Câu này quyết định depot là một vai trò của Party hay là đơn vị nội bộ.

## 7. Kết quả thực hiện (09/11/2026)

Anh duyệt theo đề xuất mặc định. Hai câu chưa có đề xuất được chọn như sau: GSS **giữ xe riêng** của công ty; bãi Đắk Nông
mô hình bằng vai trò `is_depot` của Party + danh mục bãi, nên bãi của GSS hay bãi thuê đều dùng được, không phải đổi mô hình.

| Bước | Trạng thái | Commit |
| :-- | :-- | :-- |
| 1. Repo mới `E:\GSS_TMS`, gitleaks trước commit đầu | Xong. Chưa tạo repo GitHub, chưa push | `ce99e78` |
| 2.1 Bỏ nhân sự/lương | Xong (giữ danh bạ nhân viên) | `0abab1b` |
| 2.2 Bỏ lớp chuyển tiếp: Legacy*, `migrate_legacy_access`, `assign_default_company`, hashids | Xong | `42211b3` |
| 2.3 Mô hình chuyến TVL | Một phần: bỏ cổng tài xế `/driver/`, lệnh dữ liệu cũ, mọi chuỗi TVL. Tạm ứng / quỹ / quyết toán tài xế khoá theo cờ `fleet_internal` (gói GSS tắt) | `e44338c` |
| 3. Mô hình §4 | Party một bảng; BillOfLading MBL ◄ HBL; Leg / TruckRun / RouteTemplate; JobCost; public_id UUIDv7 | `0aa0b43`, `455374d` |
| 4. Xoá migration, sinh `0001_initial` | Xong (166 → bộ khởi tạo sạch) | `0aa0b43` |
| 5. Row-Level Security | Xong cho mọi bảng có `company_id`; vai trò `gss_rls` | `3f7a15c` |
| 6. Đổi tên, CI, tài liệu | CI thêm gitleaks; độ phủ test đo được 80% nên giữ ngưỡng 72% (không cần hạ tạm); CLAUDE.md, ERD, PLATFORM_PATCHES.md | (commit tài liệu) |

Chưa làm trong GĐ0 (lý do):
- Gỡ hẳn tạm ứng tài xế / quỹ điều vận khỏi dashboard, báo cáo và quyết toán kiểu cũ: dính sâu vào ~10 file BIM cũ;
  đã khoá API theo cờ. Nên làm cùng việc dọn giao diện BIM cũ (màn điều vận, kinh doanh, đội xe kiểu cũ đã được màn GSS thay).
- Đổi tên `DispatchTrip` → `TransportJob`, bỏ máy trạng thái 11 bước cũ: báo cáo và sổ cái cũ còn đọc `status`; giữ đồng bộ từ `step_status`.
- Viết lại `DEFAULT_MATRIX` cho 7 vai trò theo §3: cần anh chốt danh sách vai trò.
- `StoredFile` / `DocumentLink` tách bảng, `CargoItem` / `Stop` / `DeliveryDrop` (GĐ4).
