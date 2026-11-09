# GSS TMS (thư mục E:\Bim_Logisstic_GSS) – quy tắc làm việc

Phần mềm điều hành vận tải container của Green Solutions Smart. Mã nguồn đã được làm lại sạch ngày 09/11/2026 theo đặc tả §7.2: lịch sử git mới, không mang lịch sử cũ (bản sao lưu lịch sử cũ: `E:\Backup\gss_old_2026-11-09\`). Chỉ có MỘT thư mục dự án này.
Đặc tả nghiệp vụ: `docs/BRD_GREEN_SOLUTIONS_SMART_GSS.md`; kế hoạch GĐ0: `docs/GSS_KE_HOACH_7_2.md`; sơ đồ dữ liệu: `docs/GSS_ERD.md`.
Không đưa khoá SSH / secret / domain máy chủ vào repo. Bản vá thuộc lớp nền (bảo mật, phân quyền) ghi vào `PLATFORM_PATCHES.md`.

## Build bắt buộc trước khi commit (CI sẽ đỏ nếu quên)

```bash
python scripts/build_app_js.py   # sửa file trong static/js/src/app/** -> build lại static/js/app.js
python scripts/build_css.py      # sửa template/JS có class Tailwind -> build lại static/css/tailwind.css (và tailwind-help.css)
python scripts/build_app_js.py --check
python scripts/build_css.py --check
```

- Hook `.githooks/pre-commit` tự chặn commit khi file tự sinh lệch nguồn: `git config core.hooksPath .githooks`.
- `static/js/app.js` và `static/css/tailwind*.css` là FILE TỰ SINH: không sửa tay, nhưng phải commit cùng nguồn.
- Thêm file JS mới thì khai báo vào `static/js/src/app/manifest.txt`.
- Thêm/sửa model thì chạy `python manage.py makemigrations` và commit migration. Migration đã được sinh lại sạch ở GĐ0
  (không còn migration dữ liệu của hệ thống cũ); bảng cache tạo ở `core/migrations/0003_cache_table.py`.
- Chạy test (cần PostgreSQL – RLS và các ràng buộc chỉ có trên Postgres):
  `DEBUG=True SECRET_KEY=x DB_HOST=127.0.0.1 DB_PORT=<cổng> DB_NAME=t DB_USER=postgres DB_PASSWORD=<...> python manage.py test`.
  Dùng một Postgres tạm (vd. `docker run --rm -p 127.0.0.1:5438:5432 -e POSTGRES_PASSWORD=... postgres:16-alpine`), không dùng CSDL của stack 8086.

## Kiến trúc dữ liệu cần nhớ

- **Đối tác một bảng** `master_data.Party` (cờ vai trò). `Customer`, `Subcontractor`, `ShippingLine` là proxy theo vai trò.
- **Mã công khai** `public_id` (UUIDv7, `core.models.PublicIdModel`) dùng trong URL/API; khoá số chỉ dùng nội bộ.
  Link tài xế = `driver_token`, link tra cứu của khách = `tracking_token`, trang lệnh tài xế = QR `/q/<token>/`.
- **Đa doanh nghiệp hai lớp**: lọc ORM (`TENANT_ENFORCE`) + Row-Level Security PostgreSQL (`core/rls.py`, vai trò `gss_rls`).
  Bảng mới có cột `company` tự được bật policy sau `migrate`. Bảng con không có cột `company` phải lọc qua bản ghi cha.
- Vận đơn `gss.BillOfLading` (MBL ◄ HBL), chặng `gss.Leg`, lượt xe `gss.TruckRun` (≤ 2 TEU), mẫu tuyến `gss.RouteTemplate`.

## Chạy local bằng Docker (PostgreSQL + Redis + web)

Cần file `.env` ở thư mục gốc (không commit): `DB_PASSWORD`, `SECRET_KEY` bắt buộc; mẫu `.env.example`.

```bash
docker compose -p gss_logistics -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

- Web: http://127.0.0.1:8086 · Postgres: 127.0.0.1:5436 · container `gss_logistics_web|postgres|redis`.
- Web tự `migrate` khi khởi động. Dừng: `docker compose -p gss_logistics down` (thêm `-v` sẽ XOÁ dữ liệu CSDL).
- Dữ liệu minh hoạ + tài khoản quản trị local (chỉ `DEBUG=True`): `docker compose -p gss_logistics exec web python manage.py seed_gss_demo --create-admin`
  (mật khẩu ghi vào `gss_local_credentials.txt` trong container) – xem `docs/GSS_RUNBOOK.md`.
- **Chỉ có MỘT cách chạy GSS: stack Docker ở trên.** Không dùng SQLite, không chạy `runserver` cổng khác với CSDL riêng.

## Triển khai

- Repo này **chưa có remote GitHub**. Chỉ push khi người dùng yêu cầu; lúc đó ghi đè (xoá hết) nội dung cũ trên `github.com/hongsonphan/GSS_LOGISTICs`. Workflow `Deploy VPS`, `Uptime`, `Restore drill`, `ZAP` chỉ chạy tay khi đã có VPS/domain riêng.
- Không push khi CI cục bộ ở trên chưa khớp.
