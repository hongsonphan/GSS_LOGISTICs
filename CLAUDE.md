# GSS Logistics (repo GSS_LOGISTICs) – quy tắc làm việc

Dự án GSS-TMS-2026 của Green Solutions Smart, **tách độc lập** khỏi BIM Logistics: repo, CSDL, cổng (web 8086, Postgres 5436), tên container (`gss_logistics_*`) và máy chủ đều riêng. Đặc tả nghiệp vụ: `docs/BRD_GREEN_SOLUTIONS_SMART_GSS.md`.
Không thêm khoá SSH / secret / domain của máy chủ BIM Logistics vào repo này.

## Build bắt buộc trước khi commit (CI sẽ đỏ nếu quên)

CI chạy `--check` cho các file tự sinh; lệch nguồn là fail. Sau khi sửa giao diện, **luôn chạy cả hai lệnh trước khi commit**:

```bash
python scripts/build_app_js.py   # sửa file trong static/js/src/app/** -> build lại static/js/app.js
python scripts/build_css.py      # sửa template/JS có class Tailwind -> build lại static/css/tailwind.css (và tailwind-help.css)
```

Kiểm tra nhanh (phải báo "khớp"):

```bash
python scripts/build_app_js.py --check
python scripts/build_css.py --check
```

- Hook `.githooks/pre-commit` tự chặn commit khi file tự sinh lệch nguồn. Cài một lần cho mỗi bản clone: `git config core.hooksPath .githooks`.
- `static/js/app.js` và `static/css/tailwind*.css` là FILE TỰ SINH: không sửa tay, nhưng phải commit cùng nguồn.
- Thêm file JS mới thì khai báo vào `static/js/src/app/manifest.txt`.
- Thêm/sửa model thì chạy `python manage.py makemigrations` và commit migration.
- Chạy test: `DEBUG=True SECRET_KEY=x python manage.py test apps.billing apps.dispatch`.

## Chạy local bằng Docker (PostgreSQL + Redis + web)

Cần file `.env` ở thư mục gốc (không commit): `DB_PASSWORD` bắt buộc, `DB_NAME=gss_logistics_db`, `DB_USER=gss_logistics_user`. Mẫu: `.env.example`.

```bash
docker compose -p gss_logistics -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

- Web: http://127.0.0.1:8086 · Postgres: 127.0.0.1:5436 · container `gss_logistics_web|postgres|redis`.
- Web tự `migrate` khi khởi động. Dừng: `docker compose -p gss_logistics down` (thêm `-v` sẽ XOÁ dữ liệu CSDL).
- File `docker-compose.local.yml` chỉ dùng trên máy Windows/macOS; VPS Linux dùng `docker-compose.yml` như cũ.

## Triển khai

- Workflow `Deploy VPS` **chỉ chạy tay** (tab Actions) và cần khai báo VPS riêng của GSS: secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` và biến `SITE_URL`. Thư mục trên VPS: `/home/ubuntu/GSS_LOGISTICS`.
- `Uptime`, `Restore drill`, `ZAP` cũng đang chỉ chạy tay cho tới khi có domain/VPS của GSS.
- Khi đã có VPS riêng: thêm lại trigger `workflow_run` (sau CI xanh) vào `.github/workflows/deploy.yml`.
- Không push `master` khi CI cục bộ ở trên chưa khớp.
