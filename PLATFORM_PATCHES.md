# Bản vá lớp nền dùng chung (đặc tả §7.3)

GSS TMS và hệ thống gốc (BIM Logistics / GSS_LOGISTICs) dùng chung lớp nền: bảo mật tài khoản, phân quyền, nhật ký kiểm toán,
đa doanh nghiệp, sổ cái. Mỗi bản vá thuộc lớp nền ghi một dòng ở đây, kèm trạng thái đã chuyển sang repo kia hay chưa.

| Ngày | Bản vá | Nơi làm trước | Đã chuyển sang repo kia? | Ghi chú |
| :-- | :-- | :-- | :-- | :-- |
| 2026-11-09 | Bỏ lớp quyền Legacy*: mọi tài khoản theo ma trận phân quyền | GSS TMS | Chưa | Repo gốc còn tài khoản không hồ sơ dùng quyền nhóm Django |
| 2026-11-09 | Mã công khai UUIDv7 (`PublicIdModel`) thay hashids | GSS TMS | Chưa | Đổi link cũ: cần kế hoạch chuyển đổi nếu áp vào repo gốc |
| 2026-11-09 | Row-Level Security PostgreSQL (`core/rls.py`) | GSS TMS | Chưa | Cần vai trò CSDL `gss_rls`; xem `core/test_rls.py` |
| 2026-11-09 | Link tra cứu của khách dùng `tracking_token` riêng | GSS TMS | Chưa | |
| 2026-11-19 | Nhật ký bất biến ở tầng CSDL: trigger chặn UPDATE/DELETE `core_auditlog`, `core_trackingeventlog` (`core/immutability.py`) | GSS TMS | Chưa | Dựng lại sau mỗi `migrate`; dọn nhật ký quá hạn cần `SET LOCAL gss.allow_log_purge='on'` |
| 2026-11-20 | Trang Nhật ký hoạt động (`core/audit_views.py`, quyền `audit_log`, tab Cài đặt) | BIM Logistics | Đã chuyển từ BIM sang GSS (BIM làm trước 13/11) | Chỉnh cho GSS: lọc công ty, không cần migration dữ liệu |
| 2026-11-19 | Thu hồi `TRUNCATE` khỏi vai trò `gss_rls`; `rls.apply` chạy được với user không phải superuser | GSS TMS | Chưa | `scripts/db_harden.sh` tạo user ứng dụng thường (docs/16, S1) |
