# GSS – Hướng dẫn chạy & vận hành

## 1. Chạy local – MỘT cách duy nhất (Docker: web 8086 + PostgreSQL 5436 + Redis)

```bash
# cần file .env (DB_PASSWORD, DB_NAME=gss_logistics_db, DB_USER=gss_logistics_user) – mẫu .env.example
docker compose -p gss_logistics -f docker-compose.yml -f docker-compose.local.yml up -d --build
docker compose -p gss_logistics exec web python manage.py seed_gss_demo --create-admin   # tùy chọn: dữ liệu minh họa + tài khoản gss_admin
```

- Mở `http://127.0.0.1:8086/` (khung duy nhất, các màn GSS nằm trong sidebar). Camera quét QR cần `localhost`/`127.0.0.1` hoặc HTTPS.
- Web tự `migrate` khi khởi động. Dừng: `docker compose -p gss_logistics down` (thêm `-v` sẽ XÓA dữ liệu).
- `seed_gss_demo` chỉ chạy khi `DEBUG=True`; chạy lại không nhân đôi dữ liệu. Mật khẩu `gss_admin` sinh ngẫu nhiên, đọc bằng `docker compose -p gss_logistics exec web cat gss_local_credentials.txt`.
- Chạy test trên Postgres của stack: `DB_HOST=127.0.0.1 DB_PORT=5436 DB_NAME=gss_logistics_db DB_USER=gss_logistics_user DB_PASSWORD=... python manage.py test core apps`.

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
| `/` | Ứng dụng GSS duy nhất (khung BIM): Dashboard · Sale & Booking (Booking, Khách hàng, Địa điểm, Mẫu biên bản) · Điều vận & Vendor (Điều phối chuyến) · Bãi & Phương Tiện (Bãi cont, Phương tiện & tài xế theo nhà xe, Quét QR) · HC&NS · TC&KT · Báo cáo · Cài đặt (cần đăng nhập) |
| `/?legacy=1` | Mở hệ thống BIM cũ (kế toán, nhân sự, hải quan…), ghi nhớ trong phiên |
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

- Zalo/SMS: mặc định chỉ soạn tin, sao chép và mở khung chat theo SĐT tài xế. Gửi tự động đã có sẵn lớp cổng (`core/messaging.py`,
  mục 6) nhưng chưa thử với nhà cung cấp thật (cần hợp đồng ZNS/SMS). Trạng thái "đã mở" chỉ có khi tài xế mở link trong tin.
- Nhiều bãi: API quản trị bãi đã có (`/api/depot/yards/`); màn hình do FE nối.
- Quét QR bằng camera chưa kiểm thử trên thiết bị thật trong môi trường tự động (chỉ kiểm thử luồng sau khi quét).
- Điều vận chưa có màn sửa dòng xe/tài thay nhà xe trên trang Booking (API `PUT /api/vendor-allocations/<id>/` đã sẵn sàng).
- Quyền: API GSS dùng module **Điều vận**; API bãi dùng module **Bãi depot** (`depot`): vai trò **Thủ bãi** (`YARD_KEEPER`, nhóm `yard`)
  có Xem/Tạo/Sửa/Xuất bãi + chỉ Xem Điều vận, không cấu hình bãi, không vào kế toán. Điều vận và Vận hành có `depot` đầy đủ.


## 6. Vận hành định kỳ & gửi tin tự động

**Cảnh báo DEM/DET** (chuông thông báo cho Điều vận + quản trị, chống trùng theo ngày còn lại):

```bash
docker compose -p gss_logistics exec web python manage.py notify_dem_det            # tạo thông báo
docker compose -p gss_logistics exec web python manage.py notify_dem_det --dry-run  # chỉ liệt kê
```

Trên VPS lên lịch mỗi sáng: `0 7 * * * cd /home/ubuntu/GSS_LOGISTICS && docker compose exec -T web python manage.py notify_dem_det`.
API: `GET /api/gss/dem-det-alerts/` (danh sách), `POST` cùng đường dẫn (chạy tay). Số ngày cảnh báo = `CompanyProfile.warn_days`.

**Gửi Zalo/SMS tự động** (tắt mặc định). Đặt trong `.env`:

| Biến | Ý nghĩa |
| :-- | :-- |
| `MESSAGING_PROVIDER` | rỗng = tắt; `console` = chỉ ghi log (thử); `webhook` = gọi cổng trung gian |
| `MESSAGING_WEBHOOK_URL` | địa chỉ https của cổng (nhận JSON `{channel,to,text,template_id,params}`) |
| `MESSAGING_WEBHOOK_TOKEN` | gửi dạng `Authorization: Bearer …` (không ghi log/CSDL) |
| `MESSAGING_TEMPLATE_ID` | mã mẫu tin ZNS (nếu nhà cung cấp yêu cầu) |

`POST /api/gss/trips/<mã>/message/` với `{"channel":"ZALO","send":true}` gửi qua cổng; kết quả ghi `delivery` = `SENT`/`FAILED` trong lịch sử.
Không có `send` thì chỉ ghi nhận đã gửi tay (`MANUAL`) như trước.

## 7. Sao lưu, khôi phục, triển khai VPS riêng

- Sao lưu hằng ngày: `scripts/backup_vps.sh` (cron `0 2 * * *`; CSDL + media, giữ 14 ngày). Diễn tập khôi phục: `scripts/restore_drill.sh`
  (đối chiếu cả bảng GSS: phiếu chia cont, lượt ra vào bãi, nhật ký quét QR).
- Khôi phục thật: `bash scripts/restore_vps.sh [db_….sql.gz] [media_….tar.gz]` — tự sao lưu `pre_restore_*` trước, khôi phục vào CSDL tạm
  rồi mới thay CSDL đang chạy (lỗi giữa chừng thì CSDL hiện tại giữ nguyên), phải gõ tên CSDL để xác nhận.
- Triển khai lần đầu trên VPS mới: cài Docker; clone repo vào `/home/ubuntu/GSS_LOGISTICS`; tạo `.env` (`DB_PASSWORD`, `SECRET_KEY`, `ALLOWED_HOSTS`,
  `DEFAULT_BUSINESS_MODEL=GSS_VENDOR_DEPOT_QR`); `docker compose up -d --build`; `python manage.py init_gss --name "…" --short GSS`;
  tạo quản trị `createsuperuser`; cài cron sao lưu + `notify_dem_det`; trỏ domain (HTTPS) rồi khai báo secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
  và biến `SITE_URL` cho workflow `Deploy VPS` (chạy tay). **Chưa triển khai: cần VPS/domain của GSS và sự đồng ý của chủ dự án.**

## 8. Nghiệp vụ theo đặc tả 08/11/2026 (B/L, phân bổ theo cont, biểu giá, chi hộ, bảng kê)

1. **Đơn hàng theo B/L** (Sale & Booking → Đơn hàng B/L & phân bổ): nhập MBL/HBL, ETA, ngày dỡ, hạn D/O. Ở chi tiết đơn → "Nhập cont (dán / Excel)":
   kiểm tra ISO 6346 từng dòng, có lỗi thì không ghi; xác nhận để ghi. Sửa từng cont: loại, seal, trọng lượng, nơi giao riêng, hạn DEM/DET riêng.
2. **Quy tắc DEM/DET** (Sale & Booking → Quy tắc DEM/DET) rồi "Áp quy tắc DEM/DET" ở đơn (tự áp khi nhập cont nếu đơn có ngày dỡ/ETA).
3. **Phân bổ**: tích chọn cont → chọn nhà xe → "Giao cho nhà xe" (phiếu mới hiện link MỘT lần). Hoặc "Tải file mẫu phân bổ" → điền mã nhà xe →
   "Nhập file phân bổ" (xem trước, có lỗi thì tải file kết quả đánh dấu lỗi) → xác nhận. Đổi nhà xe: chỉ khi cont chưa chạy (chuyến "Sẵn sàng" bị huỷ, cần lý do).
4. **Nhà xe** mở link: số cont đã khoá theo B/L, gõ tìm biển số/tài xế đã dùng, hoặc tải/nhập Excel. Khi mọi chuyến hoàn tất: chỉ xem, sau 7 ngày link đóng.
5. **Tài xế** (QR lệnh): ảnh chứng từ chỉ chụp camera (ghi GPS nếu cho phép, giờ thiết bị/máy chủ, bản gốc + bản có dấu thời gian); "Qua trạm / bãi";
   "Khai chi phí chi hộ" kèm ảnh hoá đơn. Mất sóng: ảnh được giữ và tự gửi lại khi có mạng (không đóng trang).
6. **Điều vận**: Trip Card (mở chuyến) có B/L, tờ khai, gọi tài xế, street-turn (sau khi dỡ hàng), tài chính chuyến, thư viện chứng từ tên chuẩn.
   In "Lệnh điều vận tổng" / theo nhà xe; "Lập phiếu giao hàng" theo từng điểm giao (lưu bản chụp, tải scan có chữ ký); "Tải zip theo cây thư mục".
7. **Kế toán** (Tài chính & Kế toán): *Biểu giá* (khoản phí; bảng giá bán/mua → duyệt → phiên bản mới khi đổi giá); giá tự áp khi chuyến hạ rỗng/street-turn.
   *Chi hộ & hoá đơn*: gắn hoá đơn (ảnh có QR tự đọc / nhập tay / XML gốc), xác nhận, duyệt khoản khai. *Bảng kê đối soát*: lập theo khách/nhà xe + kỳ,
   chi hộ tách mục riêng, chốt (khoá + bút toán chi hộ), huỷ có lý do, xuất Excel. *Sổ sách kế toán*: phân hệ kế toán đầy đủ.
8. Dữ liệu minh hoạ: `seed_gss_demo` nay thêm đơn **DEMO.BL.001** (6 cont MSC, 2 nhà xe, biểu giá, quy tắc DEM/DET, 1 chuyến hoàn tất có giá tự áp và 1 khoản chi hộ chờ duyệt).
