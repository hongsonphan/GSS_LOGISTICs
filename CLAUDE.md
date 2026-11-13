# GSS TMS (thư mục E:\Bim_Logisstic_GSS) – quy tắc làm việc

Phần mềm điều hành vận tải container của Green Solutions Smart. Mã nguồn đã được làm lại sạch ngày 09/11/2026 theo đặc tả §7.2: lịch sử git mới, không mang lịch sử cũ (bản sao lưu lịch sử cũ: `E:\Backup\gss_old_2026-11-09\`). Chỉ có MỘT thư mục dự án này.
Đặc tả nghiệp vụ: `docs/01-spec-brd.md`; kế hoạch GĐ0: `docs/archive/2026-11-09-phase0-copy-trim-model.md`; sơ đồ dữ liệu: `docs/06-database.md`.
Không đưa khoá SSH / secret / domain máy chủ vào repo. Bản vá thuộc lớp nền (bảo mật, phân quyền) ghi vào `PLATFORM_PATCHES.md`.

**Ưu tiên khi đánh đổi:** đúng dữ liệu B/L, chứng từ, tiền > cách ly dữ liệu giữa các công ty > không làm hỏng tính năng đang chạy > tốc độ viết code. Không đoán mò: thiếu dữ kiện nghiệp vụ thì dừng và hỏi.

## Bất biến – không bao giờ vi phạm

1. **Không xóa cứng dữ liệu pháp lý** (B/L, chứng từ chặng, EIR, POD, sự cố, nhật ký hành trình, chứng từ tiền): chỉ xóa mềm / đổi trạng thái.
2. **Trạng thái điều vận chỉ đổi qua `apps/dispatch/gss_workflow.py`** (7 bước Nhận – Giao – Hạ rỗng, chứng từ bắt buộc ≤ 10 file/chặng). Không gán trạng thái trực tiếp trong view.
3. **Tài chính sai số bằng 0:** bảng kê, công nợ, sổ cái = tổng các khoản đã duyệt (JobCharge/JobCost, chi hộ tách riêng); tổng cập nhật qua service/`apps/ledger`, không tính lặp trong view/template.
4. **Cách ly công ty:** mọi dữ liệu thuộc công ty có cột `company` (RLS tự bật) hoặc lọc qua bản ghi cha; không tắt RLS/lọc tenant trong mã. URL/API/link dùng `public_id`/token, không lộ khoá số.
5. **Không đụng tài khoản và CSDL thật:** không ghi đè mật khẩu/email; test không chạy trên CSDL stack 8086 (cổng 5436).
6. **File tự sinh không sửa tay:** `static/js/app.js`, `static/css/tailwind*.css`, `templates/help.html` (sinh từ `docs/04-user-guide.md`).
7. **Migration đi cùng model**; không bí mật/domain máy chủ trong repo; bản vá lớp nền ghi `PLATFORM_PATCHES.md`.

## Quy trình mỗi yêu cầu

1. **Đầu phiên đọc [`docs/12-backlog.md`](docs/12-backlog.md)** (việc dở của phiên trước).
2. **Baseline** – `python scripts/qa.py verify --fast` (hoặc đủ) TRƯỚC khi sửa; ghi lỗi có sẵn.
3. **Phạm vi** – đọc tài liệu phân hệ + BRD; `grep` mọi nơi dùng thứ sắp đổi; chỉ sửa đúng phạm vi, giữ hợp đồng (tên hàm gắn `window`, khóa JSON, URL, tên field, thứ tự `manifest.txt`).
4. **Test** – sửa lỗi: test tái hiện trước; tính năng: happy path + quyền + biên + khác công ty.
5. **Build + verify** – `build_app_js.py`, `build_css.py`, `python scripts/qa.py verify` (`--full` khi chạm `core`, `master_data`, `billing`, `ledger`, RLS/quyền). Phải xanh.
6. **Tài liệu + ghi sổ** – CHANGELOG (+ USER_GUIDE/FEATURES/API khi hành vi đổi); việc xong → `docs/03-features.md`, việc dở → `docs/12-backlog.md`.
7. **Báo cáo trung thực** – đã chạy gì, kết quả gì, còn gì chưa kiểm. Một yêu cầu = một mục đích = một commit.

`scripts/qa.py`: `verify` (build khớp, cú pháp JS, ruff, migration, check, test `apps.gss apps.dispatch apps.billing`), `verify --fast` (bỏ test), `verify --full` (toàn bộ như CI), `audit` (thêm bảo mật, giao diện, tài liệu → `scratch/qa-*.md`). Test cần PostgreSQL: chưa đặt `DB_HOST` thì `qa.py` tự dựng container tạm `gss_qa_pg` ở 127.0.0.1:5438 (dừng: `docker stop gss_qa_pg`).

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
  (mật khẩu ghi vào `gss_local_credentials.txt` trong container) – xem `docs/11-runbook.md`.
- **Chỉ có MỘT cách chạy GSS: stack Docker ở trên.** Không dùng SQLite, không chạy `runserver` cổng khác với CSDL riêng.

## Triển khai

- Repo này **chưa có remote GitHub**. Chỉ push khi người dùng yêu cầu; lúc đó ghi đè (xoá hết) nội dung cũ trên `github.com/hongsonphan/GSS_LOGISTICs`. Workflow `Deploy VPS`, `Uptime`, `Restore drill`, `ZAP` chỉ chạy tay khi đã có VPS/domain riêng.
- Không push khi CI cục bộ ở trên chưa khớp.

## Xác nhận trước khi làm

Hỏi trước khi: commit/push, ghi lên CSDL stack 8086 hoặc khởi động lại stack khi có migration mới, `docker compose down -v`, xóa dữ liệu/file, sửa migration đã commit, `git reset/rebase/force-push`. Đọc/test trên Postgres tạm thì làm thẳng.

## Đội AI và skill (`.claude/`)

Sơ đồ, vai trò, bảng định tuyến: [`docs/14-ai-team.md`](docs/14-ai-team.md). 9 agent: `team-leader`, `ui-ux`, `report-designer`, `backend`, `dispatch-ops`, `billing`, `qa-tester`, `security`, `docs`.
Skill: `/refactor`, `/audit`, `/ship` (chỉ khi người dùng gọi), `/docs-sync`, `/ui-review`, `/new-report`, `/new-screen`, `/model-change`, `/billing-check`, `/tenant-check`. Agent không hỗ trợ skill thì đọc `.claude/skills/<tên>/SKILL.md` và làm theo.

## Điều phối

Nếu bạn là **phiên chính** (nhận lệnh trực tiếp từ người dùng): làm đúng vai `team-leader` trong `.claude/agents/team-leader.md` – đọc PLAN, phân tích lệnh, **chỗ nào chưa rõ thì hỏi người dùng trước khi giao việc**, chia việc cho subagent, kiểm tra bàn giao, `qa-tester` chạy cổng cuối, báo cáo tổng hợp. Lệnh nhỏ một chuyên môn thì tự làm theo skill `refactor`.
Nếu bạn là **subagent** (được giao qua công cụ Agent): chỉ làm việc được giao theo file agent của mình, không tự điều phối, không gọi thêm subagent, không đoán khi thiếu thông tin (ghi vào TỒN ĐỌNG), trả bàn giao đúng mẫu.
