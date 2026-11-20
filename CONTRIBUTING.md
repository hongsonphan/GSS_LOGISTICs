# Hướng dẫn đóng góp

Đọc [CLAUDE.md](CLAUDE.md) (bất biến và quy trình) và [docs/09-coding-standards.md](docs/09-coding-standards.md) trước khi sửa.

## Quy trình một thay đổi

1. Đọc [docs/12-backlog.md](docs/12-backlog.md) và tài liệu phân hệ liên quan.
2. Chạy `python scripts/qa.py verify --fast` để biết lỗi có sẵn.
3. Sửa đúng phạm vi. Sửa lỗi: viết test tái hiện trước. Thêm tính năng: test happy path, quyền, biên, khác công ty.
4. Model đổi thì chạy `python manage.py makemigrations` và commit migration cùng model.
5. Build file tự sinh: `python scripts/build_app_js.py` và `python scripts/build_css.py`. Không sửa tay `static/js/app.js`, `static/css/tailwind*.css`, `templates/help.html`.
6. `python scripts/qa.py verify` phải xanh (`--full` khi chạm `core`, `master_data`, `billing`, `ledger`, RLS/quyền).
7. Cập nhật `CHANGELOG.md` và tài liệu liên quan.

## Commit

Một yêu cầu = một mục đích = một commit, theo [Conventional Commits](https://www.conventionalcommits.org/): `feat(dispatch): ...`, `fix(ui): ...`, `docs: ...`. Cài hook: `git config core.hooksPath .githooks`.

## Pull request

- Nhánh từ `master`; PR phải qua CI (`test`, `secrets`) mới merge.
- Mô tả: mục đích, phạm vi, cách đã kiểm, rủi ro (migration, tiền, quyền, cách ly công ty).
- Không `git push --force` lên `master`.

## Bất biến không được vi phạm

Không xóa cứng dữ liệu pháp lý; trạng thái điều vận chỉ đổi qua `apps/dispatch/gss_workflow.py`; tài chính sai số bằng 0; cách ly công ty; không đụng tài khoản và CSDL thật; không bí mật trong repo.
