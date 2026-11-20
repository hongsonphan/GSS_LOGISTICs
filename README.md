# GSS TMS

Phần mềm điều hành vận tải container (Transport Management System) của **Green Solutions Smart**: booking / B/L, phân bổ container cho nhà xe, điều vận 7 bước có chứng từ bắt buộc, cổng nhà xe, QR lệnh tài xế, bảng kê đối soát, công nợ và sổ cái. Hỗ trợ nhiều công ty trên một hệ thống, dữ liệu cách ly hai lớp (lọc ORM + PostgreSQL Row-Level Security).

> Phần mềm nội bộ. Xem [LICENSE](LICENSE).

## Công nghệ

Django 5.2 · Django REST Framework · PostgreSQL 16 · Redis · Gunicorn · Tailwind CSS · JavaScript thuần (SPA, nguồn trong `static/js/src/app/`) · Docker Compose.

## Chạy nhanh (local, Docker)

Yêu cầu: Docker Desktop, Python 3.12, Node.js (để build giao diện).

```bash
cp .env.example .env          # điền DB_PASSWORD và SECRET_KEY
docker compose -p gss_logistics -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

- Web: http://127.0.0.1:8086 · PostgreSQL: 127.0.0.1:5436
- Dữ liệu minh hoạ và tài khoản quản trị local (chỉ `DEBUG=True`): xem [docs/11-runbook.md](docs/11-runbook.md).
- Chỉ có **một** cách chạy GSS: stack Docker ở trên. Không dùng SQLite.

## Kiểm thử và chất lượng

```bash
python scripts/qa.py verify          # build khớp, cú pháp JS, ruff, migration, check, test
python scripts/qa.py verify --full   # toàn bộ test như CI
python scripts/qa.py audit           # thêm bảo mật, giao diện, tài liệu
```

Test cần PostgreSQL; `qa.py` tự dựng container tạm `gss_qa_pg` (cổng 5438), không đụng CSDL của stack 8086. Cũng có `make verify` (xem [Makefile](Makefile)).

Trước khi commit phải build file tự sinh (`static/js/app.js`, `static/css/tailwind*.css`):

```bash
python scripts/build_app_js.py && python scripts/build_css.py
git config core.hooksPath .githooks
```

## Cấu trúc thư mục

| Thư mục | Nội dung |
|---|---|
| `apps/gss`, `apps/dispatch` | B/L, container, chặng, điều vận, cổng nhà xe, máy trạng thái 7 bước |
| `apps/billing`, `apps/ledger` | Biểu giá, JobCharge/JobCost, bảng kê, công nợ, sổ cái |
| `apps/master_data`, `apps/documents`, `apps/qr_tracking` | Đối tác, danh mục, kho chứng từ, QR |
| `core/` | Nền tảng: đa công ty, RLS, phân quyền, nhật ký, bảo mật |
| `static/js/src/app/`, `templates/` | Giao diện |
| `scripts/` | `qa.py`, build giao diện, triển khai VPS |
| `docs/` | Tài liệu (mục lục: [docs/README.md](docs/README.md)) |

## Tài liệu

- Mục lục: [docs/README.md](docs/README.md) · Đặc tả nghiệp vụ: [docs/01-spec-brd.md](docs/01-spec-brd.md)
- Kiến trúc: [docs/05-architecture.md](docs/05-architecture.md) · Dữ liệu: [docs/06-database.md](docs/06-database.md) · API: [docs/07-api-reference.md](docs/07-api-reference.md)
- Bảo mật: [docs/08-security.md](docs/08-security.md) · Vận hành: [docs/11-runbook.md](docs/11-runbook.md) · Triển khai: [docs/15-deployment-guide.md](docs/15-deployment-guide.md)
- Quy tắc làm việc: [CLAUDE.md](CLAUDE.md) · Đóng góp: [CONTRIBUTING.md](CONTRIBUTING.md)
- Thay đổi: [CHANGELOG.md](CHANGELOG.md)

## Triển khai

Ba chặng tuần tự: local → GitHub (`master`) → VPS (workflow **Deploy VPS**, chạy tay). Chi tiết: [docs/15-deployment-guide.md](docs/15-deployment-guide.md).

## Bảo mật

Báo lỗ hổng theo [SECURITY.md](SECURITY.md). Không đưa khoá, mật khẩu hay domain máy chủ vào repo.
