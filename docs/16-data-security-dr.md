# 16 – Đánh giá cấu trúc dữ liệu, bảo mật, ứng phó tấn công, sao lưu/khôi phục

> Ngày: 19/11/2026. Dựa trên đọc mã và script (`core/rls.py`, `core/models.py`, `config/settings.py`, `docker-compose.yml`, `scripts/backup_vps.sh`, `restore_vps.sh`, `restore_drill.sh`, `deploy_vps.sh`) và `docs/06`, `08`, `11`.
> **Chưa chạy gì trên CSDL thật hay VPS.** Mọi mục "Gap" là kết luận từ mã/tài liệu; mục nào cần thử thật ghi rõ.

## 1. Cấu trúc dữ liệu

**Đang tốt:** một bảng đối tác `Party`; `public_id` UUIDv7 cho URL/API; cột `company` + RLS tự bật sau `migrate`; xóa mềm; FK `PROTECT`; chuỗi sự kiện `TrackingEventLog`.

| # | Gap | Hậu quả | Mức |
|---|---|---|---|
| D1 | `DispatchTrip` còn là tên TransportJob + cột mô hình chuyến cũ, máy 11 bước song song 7 bước (backlog #3) | Hai nguồn sự thật về trạng thái; báo cáo/sổ cái đọc máy cũ | Vừa |
| D2 | `JobCost` là proxy của `JobCharge` (`side='BUY'`) | Một lỗi lọc `side` trộn giá bán và giá mua → sai tiền | Vừa |
| D3 | `company` cho phép NULL, policy RLS cho thấy dòng `company_id IS NULL` | Dòng chưa gán công ty lộ cho mọi công ty | Nặng khi có >1 công ty |
| D4 | Bảng con không có cột `company` không được RLS bảo vệ | Chỉ còn lớp lọc ORM | Vừa |
| D5 | `StoredFile`/`DocumentLink` chưa tách; file nằm đĩa local (`media/`), không băm nội dung | Không phát hiện file bị sửa/mất ngoài DB | Vừa |
| D6 | `docs/06-database.md` phần B còn mô tả BIM, SQLite, v4.7.x | Tài liệu sai dẫn tới quyết định sai | Nhẹ |

## 2. Bảo mật

| # | Gap | Bằng chứng | Mức |
|---|---|---|---|
| S1 | **App kết nối CSDL bằng `POSTGRES_USER` = superuser** của image Postgres | `docker-compose.yml` (`POSTGRES_USER: gss_logistics_user`, web dùng chính user này). Trái tiêu chuẩn #18 của `08-security.md` | Nặng |
| S2 | RLS **fail-open**: biến `app.company_id` chưa đặt thì không lọc; trang công khai dùng token, lệnh quản trị, migration chạy không RLS | `core/rls.py` (docstring + `cond`) | Nặng |
| S3 | Vai trò `gss_rls` có `DELETE, TRUNCATE` trên mọi bảng, kể cả `AuditLog`, `TrackingEventLog`, chứng từ | `core/rls.py` `apply()` | Nặng (vi phạm bất biến 1) |
| S4 | "Nhật ký bất biến" chỉ bất biến theo quy ước: không trigger/quyền DB chặn UPDATE/DELETE; `AuditLog.actor` `SET_NULL`, `company` `SET_NULL` | `core/models.py:98,195` | Nặng |
| S5 | `/admin/` ở đường dẫn mặc định, không 2FA (chưa thấy) | `config/urls.py:108` | Vừa |
| S6 | `media/` và mã nguồn gắn bind-mount `.:/app` vào container production; ảnh CCCD/POD nằm đĩa thường, không mã hoá | `docker-compose.yml` | Vừa |
| S7 | `X_FRAME_OPTIONS=SAMEORIGIN` (tài liệu ghi DENY); `CSRF_COOKIE_HTTPONLY=False`; `CORS_ALLOW_CREDENTIALS=True` | `config/settings.py` | Nhẹ |
| S8 | `docs/08-security.md` mô tả hệ cũ (JWT, Hashids, v4.7.19), không nhắc RLS/UUIDv7/token băm | — | Vừa |
| S9 | Uptime, ZAP đang tắt lịch (chưa có domain); bandit/pip-audit chưa chạy cục bộ | workflows, backlog #10 | Vừa |

## 3. Kịch bản tấn công và hiện trạng ứng phó

| Kịch bản | Hiện có | Thiếu |
|---|---|---|
| Lộ mật khẩu/phiên người dùng | khoá đăng nhập 5 lần/15 phút, cookie HttpOnly/Secure | 2FA cho Admin/Kế toán; nút "đăng xuất mọi phiên" |
| Lộ link nhà xe/tài xế/khách | token băm, hạn, thu hồi, `qr_version` | quy trình thu hồi hàng loạt đã diễn tập chưa |
| Lỗi mã/SQLi chạm CSDL bằng superuser (S1) | ORM tham số hoá | **một lỗi là mất mọi công ty**; cần user ứng dụng không superuser |
| Kẻ có quyền ghi xoá nhật ký (S3, S4) | PROTECT, xóa mềm | khoá ở tầng CSDL: REVOKE + trigger chặn UPDATE/DELETE |
| Ransomware / xoá nhầm VPS | sao lưu hằng ngày cùng máy | **bản sao ngoài máy chủ, bất biến** (mục 4) |
| Deploy lỗi migration | chạy thử trên bản sao, tự quay mã | quay mã **không quay CSDL** đã migrate; cần điểm khôi phục trước migrate |
| Lộ `.env`/SECRET_KEY | gitleaks, quyền 640 | quy trình xoay khoá (đổi SECRET_KEY làm mất phiên; ghi trong runbook) |

Quy trình sự cố trong `08-security.md` mục II.5 (4 giờ khoanh vùng, 72 giờ báo A05) giữ nguyên, bổ sung: **ai** quyết định, **ai** gọi, mẫu thông báo khách hàng.

## 4. Sao lưu và khôi phục

**Hiện có:** `backup_vps.sh` (pg_dump nén + tar media, 02:00, giữ 14 ngày, kiểm bản rỗng); `restore_vps.sh` (sao lưu `pre_restore`, khôi phục vào CSDL tạm rồi mới thay, phải gõ tên CSDL); `restore_drill.sh` hằng tuần; sao lưu trước mỗi lần deploy.

| # | Gap | Hậu quả | Mức |
|---|---|---|---|
| B1 | Bản sao lưu **cùng máy** với dữ liệu (`/home/ubuntu/backups`), không offsite | Mất VPS/ransomware/xoá nhầm = mất cả hai | **Nặng** |
| B2 | Không mã hoá bản sao lưu; chứa CCCD, lương, ảnh chứng từ | Lộ bản sao lưu = lộ PII | Nặng |
| B3 | RPO = tối đa 24 giờ (một lần/ngày); không WAL/PITR | Mất tới 1 ngày chứng từ, bảng kê | Nặng |
| B4 | Không có checksum/ký; chỉ kiểm "không rỗng" và `gunzip -t` | Hỏng âm thầm vẫn qua | Vừa |
| B5 | Drill chỉ so số dòng 12 bảng, không chạy `manage.py check`/đối chiếu tổng sổ cái, không thử khôi phục media thật, không đo RTO | "Khôi phục đạt" chưa chứng minh dùng được | Vừa |
| B6 | `restore_vps.sh` tạo DB bằng `--no-owner`; quyền/vai trò `gss_rls` chỉ dựng lại khi web chạy `migrate` | OK nhưng chưa có test tự động cho đường này | Vừa |
| B7 | `deploy_vps.sh` tự quay **mã**, không quay **CSDL**; dùng `git checkout -B` | Migration phá dữ liệu không tự hoàn tác | Vừa |
| B8 | Không có giám sát sao lưu (cảnh báo khi cron lỡ) ngoài drill tuần | Phát hiện chậm | Vừa |
| B9 | Không có tài liệu RTO/RPO, danh sách ai làm gì khi mất VPS | Hoảng loạn khi sự cố | Vừa |

**Mục tiêu đề xuất (cần anh chốt):** RPO ≤ 15 phút, RTO ≤ 4 giờ cho CSDL; media RPO ≤ 24 giờ.

## 5. Đề xuất theo thứ tự (không đổi hành vi nghiệp vụ)

**Đợt A – không cần đụng model, rủi ro thấp (làm trước):**
1. Sao lưu offsite mã hoá (age/gpg) + `sha256` + thư viện 3-2-1; nơi lưu do anh chọn (B1, B2, B4).
2. WAL archiving + `pg_basebackup` hằng tuần để PITR (B3), hoặc nâng tần suất pg_dump lên mỗi 4 giờ nếu chưa muốn WAL.
3. Nâng drill: `check`, đối chiếu tổng bảng kê = tổng dòng, khôi phục media mẫu, đo thời gian → ghi RTO thực (B5).
4. Điểm khôi phục trước migrate trong `deploy_vps.sh` kèm lệnh quay CSDL (B7).
5. Viết lại `08-security.md`, `06-database.md` phần B, thêm kịch bản sự cố (S8, D6, B9).

**Đợt B – chạm CSDL/RLS, cần `--full`, migration, báo anh trước:**
6. Tách user ứng dụng khỏi superuser (S1); `gss_rls` bỏ `TRUNCATE`, `DELETE` chỉ trên bảng được phép (S3).
7. Trigger chặn UPDATE/DELETE cho `AuditLog`, `TrackingEventLog`, chứng từ pháp lý (S4).
8. RLS không còn fail-open cho request đã đăng nhập; `company` NOT NULL cho bảng thuộc công ty (S2, D3).
9. Đổi đường `/admin/`, 2FA cho Admin/Kế toán (S5).

**Đợt C – cấu trúc dữ liệu (lớn):** gộp máy 11→7 bước, `TransportJob`, `JobCost` bảng riêng, `StoredFile` có băm (D1, D2, D5).

## 5b. Tiến độ (19/11/2026)

| Mục | Trạng thái |
|---|---|
| B1/B2 offsite mã hoá | **Script xong** (`backup_vps.sh`: age + rclone, đối chiếu checksum bản ngoài). **Chưa cấu hình nơi lưu, chưa thử age/rclone thật** |
| B3 RPO | Cron 4 giờ/lần bản chỉ CSDL → RPO ≤ 4 giờ. WAL/PITR (RPO ~15 phút) **chưa làm** |
| B4 checksum | Xong (ghi, kiểm khi khôi phục và drill) |
| B5 drill | Xong: sổ cái cân, bảng kê chốt, RLS/trigger, giải nén mẫu media, đo thời gian. RTO đo trên máy dev Windows (~2 phút cho CSDL rỗng) không đại diện VPS: **đo lại trên VPS** |
| B7 điểm khôi phục trước migrate | Xong (`GSS_LOGISTICS_rollback_db.txt`; quay CSDL vẫn là thao tác tay có chủ đích) |
| S1 user thường | **Script + cấu hình xong, đã kiểm trên Postgres tạm. Chưa áp lên stack 8086/VPS** (cần anh đồng ý, đặt `APP_DB_*` trong `.env`) |
| S3 TRUNCATE | Xong (thu hồi). `DELETE` vẫn còn trên bảng nghiệp vụ (cần cho xoá mềm/dọn bảng phụ) |
| S4 nhật ký bất biến | Xong cho `AuditLog`, `TrackingEventLog`. Chứng từ pháp lý (EIR/POD/sổ cái) **chưa** có trigger |
| S2, D3 (RLS fail-open, `company` NOT NULL) | **Chưa làm**: trang công khai dùng token chạy không đặt `app.company_id`; phải sửa các trang đó đặt công ty theo bản ghi gốc trước khi đóng fail-open. Cần phiên riêng + `--full` |
| S5 `/admin/`, 2FA | **Chưa làm** (`config/urls.py` đang có thay đổi chưa commit của phiên FrontEnd) |
| S8, D6 tài liệu | Cập nhật `08-security.md` (đầu file), runbook mục 7; `06-database.md` phần B vẫn là tài liệu kế thừa |

## 6. Cần anh quyết

1. Nơi lưu bản sao ngoài máy chủ (VPS thứ hai, S3-tương thích, ổ ngoài?) và ngân sách.
2. Mục tiêu RPO/RTO ở mục 4.
3. Có làm Đợt B ngay không (đụng RLS, quyền CSDL, migration, cần cửa sổ bảo trì).
