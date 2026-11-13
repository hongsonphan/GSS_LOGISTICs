# Báo cáo kết quả – triển khai đặc tả GSS 08/11/2026

Ngày 09/11/2026 · nhánh `claude/gss-logistics-restructure-04b156`, đã gộp vào `master` (local, **chưa push**) · chạy tại http://127.0.0.1:8086

## 1. Kết quả tổng quát

- Đã xây phần lớn tính năng GĐ1–GĐ3 của đặc tả trên lõi hiện có, **không phá yêu cầu cũ**: luồng chia cont theo số lượng, cổng nhà xe, QR tài xế, bãi, đối soát cước nhà xe vẫn chạy như trước.
- Kiểm thử: **458 test tự động đạt** trên PostgreSQL sạch (thêm 23 test nghiệp vụ mới trong `apps/gss/tests.py`); build JS/CSS khớp.
- Đã chạy thử trên stack 8086 bằng trình duyệt với dữ liệu minh hoạ `DEMO.BL.001`: danh sách cont, phân bổ, Trip Card, trang tài xế, cổng nhà xe, biểu giá, chi hộ, bảng kê (lập → chốt → ghi sổ → xuất Excel) đều chạy. Hai lỗi giao diện phát hiện khi chạy thử (tiêu đề cột bảng chỉ hiện 1 chữ, link chứng từ dính liền) đã sửa.

## 2. Đã làm theo từng phân hệ của đặc tả

| Mục đặc tả | Đã làm |
| :-- | :-- |
| 5.1 Danh mục | Địa điểm thêm toạ độ, UN/LOCODE, khung giờ nhận hàng (hiện cho tài xế); quy tắc DEM/DET theo hãng tàu/khách/loại cont; mẫu phiếu giao hàng chọn được theo đơn |
| 5.2 Biểu giá | Khoản phí (cước/phụ phí/chi hộ, VAT, tài khoản); bảng giá bán theo khách, mua theo nhà xe; hiệu lực, duyệt, phiên bản; chặn trùng hiệu lực; **tự áp giá khi chuyến hoàn tất**, chụp đơn giá; sửa tay bắt buộc lý do + nhật ký |
| 5.3 Đơn hàng theo B/L | MBL/HBL, cảng xếp/dỡ, ETA, ngày dỡ, hạn D/O, FCL/LCL; nhiều tờ khai; **nhập danh sách cont bằng dán hoặc Excel, kiểm tra ISO 6346 từng dòng, hai pha**; nơi giao riêng từng cont (giao nhiều điểm); hạn DEM/DET tự tính, có hạn riêng từng cont |
| 5.4 Điều vận & phân bổ | Chọn nhà xe từng cont hoặc hàng loạt; **Excel phân bổ hai pha** (mẫu có mã phiên bản ẩn, xem trước, file kết quả tô đỏ lỗi, nhập lại không trùng); đổi nhà xe có lịch sử; in lệnh điều vận tổng và theo nhà xe (không lộ giá) |
| 5.5 Cổng nhà xe | Số cont khoá theo B/L; gõ tìm biển số/rơ-moóc/tài xế đã dùng (chưa có thì tạo mới); tải/nhập Excel; **tự chỉ-xem khi mọi chuyến hoàn tất, link tự đóng sau 7 ngày** (cấu hình được); nhật ký cấp/cấp lại/thu hồi/khoá/mở khoá |
| 5.6 Tài xế & hành trình | Ảnh bằng chứng chỉ chụp camera; lưu EXIF, GPS, giờ thiết bị + máy chủ, **bản gốc + bản phái sinh có dấu thời gian**; mốc "qua trạm/bãi"; **street-turn**; khai chi hộ kèm ảnh hoá đơn; mất sóng thì giữ ảnh và tự gửi lại khi có mạng |
| 5.7 Chứng từ | Tên chuẩn `{BL}_{CONT}_{VENDOR}_{TYPE}_{YYYYMMDD}_{SEQ}`, cây thư mục ảo, tải zip theo B/L |
| 5.8 Hoá đơn điện tử | Đọc mã QR trên ảnh hoá đơn (giải mã ở trình duyệt), nhập tay, **XML gốc là nguồn sự thật** (chặn DOCTYPE/ENTITY); chặn trùng; **một hoá đơn không gắn hai container**; cảnh báo người mua ≠ khách; đối chiếu số tiền |
| 5.9 QR & bãi | Giữ nguyên (đã có) + vai trò Thủ bãi |
| 5.10 Dashboard, Trip Card, tra cứu | Trip Card: B/L, tờ khai, DEM/DET, nhà xe/xe/tài (nút gọi), timeline (đổi vỏ, street-turn, qua trạm), chứng từ tên chuẩn, tài chính chuyến; **tra cứu theo B/L / số cont**; tiến độ theo B/L |
| 5.11 Phiếu giao hàng & đối soát | Phiếu giao hàng **theo từng điểm giao**, lưu bản chụp + scan có chữ ký; **bảng kê khách/nhà xe**, chi hộ mục riêng, chốt khoá + **bút toán sổ cái**, huỷ có lý do, xuất Excel |
| 3. Phân quyền | Thêm phân hệ `pricing` (Biểu giá); Kế toán toàn quyền giá/bảng kê; KD xem/sửa giá nhưng không duyệt; Thủ bãi không vào giá/bảng kê |

Ghi sổ: cước bán/mua đã áp ghi theo từng chuyến khi hoàn tất (cơ chế sổ cái sẵn có); chốt bảng kê chỉ ghi phần chi hộ (nhà xe: Nợ 138/Có 331; khách: Nợ 131/Có 138) để không ghi trùng.

## 3. Chưa làm – cần anh quyết hoặc cần hạ tầng/nhà cung cấp

1. **§7.2 dựng repo mới, xoá migration, Party một bảng, UUIDv7, Row-Level Security**: đổi kiến trúc lớn, phá dữ liệu hiện có → không tự làm; cần anh duyệt kế hoạch riêng.
2. **Object storage S3/MinIO, hàng đợi Celery**: cần hạ tầng; hiện lưu file local, xử lý ảnh trong request (đã nén ở thiết bị).
3. **OCR ảnh hoá đơn, tự tải XML từ cổng tra cứu**: cần dịch vụ OCR / API nhà cung cấp hoá đơn. Hiện có đọc QR + tải XML tay.
4. **OTP cho thao tác ghi của nhà xe**: cần kênh SMS/email (lớp gửi tin `core/messaging.py` đã có, chưa có nhà cung cấp).
5. **PWA offline đầy đủ** (hàng đợi bền qua tắt máy), **RouteTemplate/Leg/TruckRun** đa chặng tổng quát, hàng xuất/LCL theo kiện/xe tải hàng rời (GĐ4).
6. **7 điểm chờ xác nhận** cuối đặc tả. Mặc định đang dùng: SĐT là khoá nhận diện tài xế; nhà xe xem chỉ-đọc 7 ngày; nhà xe **không** thấy giá; kế toán duyệt chi phí tài xế khai; cảnh báo (không chặn) khi hoá đơn chi hộ không đứng tên khách.
7. Push GitHub / VPS: chưa, theo thoả thuận chạy local trước.

## 4. Cách xem nhanh

- Đăng nhập `gss_admin` (mật khẩu trong `gss_local_credentials.txt` trong container web).
- Sale & Booking → Đơn hàng B/L & phân bổ → mở **DEMO.BL.001**.
- Tài chính & Kế toán → Bảng kê / Chi hộ & hoá đơn / Biểu giá. Dashboard → Tra cứu B/L · cont.
- Hướng dẫn thao tác: `docs/11-runbook.md` §8; ánh xạ đặc tả → mã: `docs/13-architecture-decisions.md` §0.0.
