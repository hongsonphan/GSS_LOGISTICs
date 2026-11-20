## Mục đích
<!-- Một mục đích duy nhất. -->

## Phạm vi thay đổi
-

## Đã kiểm
- [ ] `python scripts/qa.py verify` xanh (`--full` nếu chạm core, master_data, billing, ledger, RLS/quyền)
- [ ] Đã build `app.js` / `tailwind.css` và commit cùng nguồn
- [ ] Có test (lỗi: test tái hiện; tính năng: happy path, quyền, biên, khác công ty)
- [ ] Đã cập nhật `CHANGELOG.md` và tài liệu liên quan

## Rủi ro
- [ ] Có migration (web VPS tự `migrate` khi khởi động)
- [ ] Chạm tiền / sổ cái / quyền / cách ly công ty
- [ ] Không có bí mật, domain máy chủ trong diff
