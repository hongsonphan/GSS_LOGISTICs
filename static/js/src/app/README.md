# Mã nguồn frontend: static/js/src/app/

`static/js/app.js` là FILE TỰ SINH, ghép từ các file trong thư mục này. Trình duyệt vẫn chỉ nạp một file `app.js` như trước, nên hành vi không đổi.

## Quy trình sửa code

1. Sửa file trong `static/js/src/app/<phân hệ>/`.
2. Chạy `python scripts/build_app_js.py` để build lại `app.js`.
3. Commit cả file nguồn lẫn `app.js`.

`deploy.sh` chạy `python3 scripts/build_app_js.py --check` và dừng nếu `app.js` lệch với nguồn (ví dụ có người sửa thẳng vào `app.js`).

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `core/` | Hàm dùng chung: định dạng số/ngày, gọi API kèm token, toast & modal xác nhận, ô nhập giờ 24h, ô số, dán ảnh từ clipboard, combobox tìm kiếm, nạp danh mục cho form, sidebar/topbar/hồ sơ cá nhân, bộ chọn giờ, router (switchTab, URL) |
| `dashboard/` | Dashboard theo vai trò, biểu đồ, trình dựng biểu đồ pivot, thanh kéo chia khung |
| `dispatch/` | Danh sách chuyến, chi tiết chuyến, sửa/huỷ/đổi tài xế, chi phí chuyến, mô phỏng app tài xế, tạo lệnh điều động, OCR chứng từ |
| `sales/` | Danh sách báo giá & booking, modal và trang báo giá, in báo giá, modal và trang booking |
| `fleet/` | Xe đầu kéo, rơ-moóc |
| `hr/` | Danh sách nhân sự, form nhân sự, nhập/xuất Excel, hợp đồng & phụ lục, chấm công & bảng lương |
| `accounting/` | Chi phí chuyến, tạm ứng & quỹ điều độ, quyết toán gom chuyến, chi hộ, sổ quỹ, phiếu thu/chi toàn trang, thầu phụ, BOT, quyết toán khách hàng, trung tâm báo cáo kế toán |
| `master-data/` | Danh mục, hồ sơ công ty & phân quyền, số dư đầu kỳ, nhập/xuất Excel danh mục, xe & tài xế thầu phụ |
| `reports/` | Báo cáo 1–17, bảng kê toàn trang, drill-down, bảng kê/công nợ khách hàng, in báo cáo |
| `customs/` | Tờ khai hải quan |
| `zz-global-exports.js` | Gán hàm lên `window` cho các `onclick` trong template. Luôn nằm cuối. |

## Quy tắc

- Thứ tự ghép nằm trong `manifest.txt`. Thêm file mới thì khai báo vào đây, nếu không build sẽ báo lỗi.
- Mọi file chạy chung một phạm vi toàn cục (classic script). Không khai báo trùng tên `let`/`const`/`function` giữa các file.
- Hàm khai báo bằng `function` được hoisting, đặt ở file nào cũng gọi được. Biến `let`/`const` chỉ dùng được ở thời điểm nạp nếu file khai báo nó đứng trước trong `manifest.txt`.
