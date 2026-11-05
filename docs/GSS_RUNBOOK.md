# GSS – Hướng dẫn chạy & vận hành

## 1. Chạy local (cổng 8088, PostgreSQL trong Docker)

```powershell
.\scriptsun_local.ps1 -Seed     # lần đầu: DB + migrate + dữ liệu minh họa + tài khoản gss_admin + runserver 8088
.\scriptsun_local.ps1           # các lần sau
```

- Database là container `gss_local_postgres` (`docker-compose.local.yml`, cổng `127.0.0.1:5437`, volume `gss_local_pgdata`), tách riêng khỏi các stack khác trên máy. Không dùng SQLite.
- Django chạy trên máy host với biến `DB_*` trỏ vào container; mật khẩu DB dev mặc định đổi bằng `GSS_LOCAL_DB_PASSWORD`.
- Tài khoản: `gss_admin`; mật khẩu ngẫu nhiên ghi trong `gss_local_credentials.txt` (đã `.gitignore`).
- Xóa sạch dữ liệu local: `docker compose -f docker-compose.local.yml down -v`.
- Mở `http://localhost:8088/gss/`. Camera quét QR cần `localhost` hoặc HTTPS.

## 2. Triển khai khách mới (1 khách = 1 database)

```bash
python manage.py migrate
python manage.py init_gss --name "CÔNG TY ..." --short "GSS"   # đổi nhận diện, bỏ dữ liệu pháp lý mặc định của khách cũ
python manage.py createsuperuser
```

Đặt `DEFAULT_BUSINESS_MODEL=GSS_VENDOR_DEPOT_QR` trong `.env` để công ty tạo lần đầu dùng gói GSS. Đổi gói/bật tắt từng tính năng tại
**Cài đặt → Khai báo → Thông tin công ty → mục 7**.

## 3. Địa chỉ chính

| Địa chỉ | Dùng cho |
| :-- | :-- |
| `/gss/` | Bảng điều hành: Tổng quan nhà xe · Điều vận · Bãi cont · Quét QR · Mẫu biên bản (cần đăng nhập) |
| `/vendor/<token>/` | Nhà xe nhập xe/tài/cont (link không mật khẩu, cấp ở trang Booking) |
| `/q/<token>/` | Tài xế mở từ QR lệnh: xem lưu ý, đổi bước, tải chứng từ, quét kiện hàng lẻ |
| `/api/gss/…`, `/api/depot/…`, `/api/qr/…` | API (xem `apps/dispatch/api_views/gss.py`, `apps/depot_yard/api.py`, `apps/qr_tracking/api.py`) |

## 4. Quy tắc nghiệp vụ đã được kiểm tra tự động

- Trạng thái chỉ đi tiến từng bước; điều vận lùi/nhảy bước hoặc bỏ qua chứng từ phải có lý do và được ghi vết.
- Hoàn tất các chặng **Nhận / Giao / Hạ rỗng** bắt buộc ≥ 1 chứng từ; tối đa 10 file/chặng, kiểm tra ở máy chủ trong giao dịch.
- Đổi số cont khi hạ rỗng: giữ cả hai số, bắt buộc lý do, chặn số đang dùng ở chuyến khác.
- Hàng lẻ: phải quét đủ kiện mới sang bước kế; sai seal/rách seal → cảnh báo và chặn chốt giao (điều vận mới được xử lý ngoại lệ).
- Bãi: một cont chỉ nằm bãi một lần tại một thời điểm; giờ đi không trước giờ đến; ≤ 10 ảnh mỗi lượt vào/ra.
- QR chỉ chứa đường dẫn + token ký HMAC (không nhúng dữ liệu); tăng `qr_version` để vô hiệu hóa QR đã phát.
- Link nhà xe chỉ lưu băm, có hạn, thu hồi/khóa được; nhà xe không thấy giá cước hay tên khách hàng.

## 5. Giới hạn đã biết

- Zalo: chỉ soạn tin, sao chép và mở khung chat theo SĐT tài xế; chưa tích hợp ZNS/SMS (cần hợp đồng nhà cung cấp).
  Trạng thái "đã mở" chỉ có khi tài xế mở link trong tin.
- Một bãi mặc định (Đắk Nông); model `Yard` đã hỗ trợ nhiều bãi nhưng chưa có màn quản trị bãi.
- Quét QR bằng camera chưa kiểm thử trên thiết bị thật trong môi trường tự động (chỉ kiểm thử luồng sau khi quét).
- Điều vận chưa có màn sửa dòng xe/tài thay nhà xe trên trang Booking (API `PUT /api/vendor-allocations/<id>/` đã sẵn sàng).
- Quyền: các API GSS dùng quyền module **Điều vận**; chưa có vai trò "Thủ bãi" riêng.
