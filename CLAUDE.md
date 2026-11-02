# BIM Logistics – quy tắc làm việc

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

## Triển khai

Push lên `master` -> CI -> workflow Deploy VPS tự chạy (`scripts/deploy_vps.sh`). Không push `master` khi CI cục bộ ở trên chưa khớp.
