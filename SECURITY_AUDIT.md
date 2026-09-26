# SECURITY_AUDIT.md
# 20 Security Essentials for Bim_Logistics Platform (TMS, WMS & Fleet)
> **Bảng danh sách 20 nguyên tắc bảo mật và quy trình Audit & Refactor dành riêng cho AI Agent trên hệ thống Bim_Logistics**

---

## 📋 Hướng dẫn dành cho AI Agent (System Prompt / Context)
Bạn là một AI Agent chuyên gia về **Kiểm tra An ninh Ứng dụng Chuỗi cung ứng & Vận tải (Logistics & Fleet Security Specialist)**. Nhiệm vụ của bạn là rà soát toàn bộ codebase dự án `Bim_Logistics` đối chiếu với **20 nguyên tắc bảo mật trọng yếu** dưới đây.

Khi thực hiện Audit trên codebase:
1. **Kiểm tra (Audit):** Định vị tệp mã nguồn liên quan (API điều phối, API tài xế mobile, upload ảnh POD, models vận đơn, v.v.) và gán nhãn: `[ĐẠT]`, `[KHÔNG ĐẠT]`, hoặc `[CẦN NÂNG CẤP]`.
2. **Tái cấu trúc (Refactor):** Đưa ra giải pháp khắc phục triệt để, tối ưu hóa cho cả môi trường web quản trị và ứng dụng di động tài xế/thủ kho ngoại tuyến.

---

## 🛡️ Bảng 20 Tiêu chuẩn Bảo mật Chi tiết (Tailored for Bim_Logistics)

### 1. Hash mật khẩu tài xế & nhân viên kho (Password Hashing)
- **Chuẩn Logistics:** Tài khoản tài xế, nhân viên kho, điều vận bắt buộc mã hóa qua Argon2 hoặc PBKDF2 của Django.
- **Hành động Agent:** Kiểm tra luồng cấp tài khoản tài xế nhanh từ Web Admin, đảm bảo không bao giờ lưu mật khẩu dạng plain text hay in mật khẩu ra log/SMS.

### 2. Giới hạn tần suất API tài xế & theo dõi đơn (Rate Limiting)
- **Chuẩn Logistics:** Chống spam brute-force vào API tra cứu vận đơn công khai và bảo vệ API cập nhật tọa độ GPS không làm nghẽn server.
- **Hành động Agent:** Áp dụng Rate Limit riêng: API tra cứu vận đơn public (tối đa 20 req/phút/IP); API GPS tracking của tài xế (tối đa 1 request / 5-10 giây / device).

### 3. Quản lý thời hạn phiên làm việc di động (Mobile Token Expiration)
- **Chuẩn Logistics:** Thiết bị tài xế dùng JWT Token có thời hạn hợp lý. Khi tài xế đổi ca hoặc bị khóa tài khoản, token cũ phải bị thu hồi ngay lập tức.
- **Hành động Agent:** Cấu hình JWT Token Blacklist. Khi tài xế ấn "Kết thúc ca" hoặc Đăng xuất, vô hiệu hóa cả Access và Refresh Token.

### 4. Dọn dẹp log chứa dữ liệu hành trình & khách hàng (Debug Logging Cleanup)
- **Chuẩn Logistics:** Không in ra console log: số điện thoại người nhận, địa chỉ nhà riêng, giá trị hàng hóa khai báo hoặc token thiết bị GPS.
- **Hành động Agent:** Rà soát các API nhận payload GPS và webhook đối tác vận chuyển, loại bỏ các lệnh `print(request.data)` chứa PII khách hàng.

### 5. Quản lý Secret Keys bản đồ & API 3PL (Secret Key Protection)
- **Chuẩn Logistics:** API Key dịch vụ bản đồ (Google Maps, VietMap, Mapbox), API kết nối hãng vận chuyển (3PL), SMS OTP secret phải nằm trong `.env`.
- **Hành động Agent:** Tuyệt đối không để API Key bản đồ có quyền thanh toán/tính toán tuyến đường lộ ra ở mã nguồn Frontend/Mobile; mọi tác vụ tính toán lộ trình phải gọi qua Backend proxy.

### 6. Xử lý lỗi an toàn trên ứng dụng hiện trường (Secure Error Handling)
- **Chuẩn Logistics:** Khi mất kết nối hoặc lỗi máy chủ, API phản hồi mã lỗi chuẩn kèm thông báo thân thiện; không trả về traceback Django/SQL cho mobile app.
- **Hành động Agent:** Thiết lập Custom Exception Handler cho DRF trả về format: `{ "success": false, "error_code": "ERR_DISPATCH_FAILED", "message": "Không thể nhận chuyến..." }`.

### 7. Kiểm định định dạng chứng từ giao nhận POD (File Upload Validation)
- **Chuẩn Logistics:** Ảnh chụp ký nhận POD, biên bản hư hỏng hàng hóa (OS&D) bắt buộc chỉ nhận định dạng hình ảnh an toàn (`jpg`, `jpeg`, `png`, `pdf`).
- **Hành động Agent:** Kiểm tra magic bytes của ảnh tải lên từ app tài xế để chặn mã độc giả dạng đuôi ảnh; tự động nén (resize) ảnh để tiết kiệm dung lượng lưu trữ.

### 8. Giới hạn dung lượng ảnh chứng từ (File Upload Size Limit)
- **Chuẩn Logistics:** Ảnh POD chỉ cần rõ nét chữ ký và hiện trạng hàng hóa (tối đa 3MB - 5MB/ảnh) để tránh quá tải đường truyền 4G của tài xế.
- **Hành động Agent:** Giới hạn dung lượng tải lên ở cả mobile client và server backend; từ chối xử lý ảnh vượt quá 5MB.

### 9. Xác thực dữ liệu tải trọng & thể tích CBM (Server-side Validation)
- **Chuẩn Logistics:** Không tin tưởng dữ liệu tính toán từ app; mọi trọng lượng thực (Gross Weight), thể tích (CBM), kích thước 3 chiều phải được validate chặt chẽ ở Backend.
- **Hành động Agent:** Viết serializer validation kiểm tra: Gross Weight $\le$ Tải trọng tối đa của xe; Chiều dài/rộng/cao kiện hàng $\le$ Kích thước thùng xe.

### 10. Phòng chống lỗi lộ thông tin đơn vận IDOR (IDOR Prevention)
- **Chuẩn Logistics:** Ngăn chặn khách hàng hoặc tài xế xem đơn hàng của người khác bằng cách đổi ID trên URL (`/tracking/orders/123/`).
- **Hành động Agent:** Sử dụng mã HashID ngẫu nhiên hoặc UUID cho mã tra cứu vận đơn; luôn kiểm tra quyền: tài xế chỉ xem được chuyến được gán, khách hàng chỉ xem được đơn của mình.

### 11. Kiểm soát phân quyền Đội xe & Kho bãi (RBAC Access Control)
- **Chuẩn Logistics:** Phân quyền nghiêm ngặt giữa: Tài xế (Driver), Điều phối viên (Dispatcher), Thủ kho (Warehouse Keeper), Kế toán cước (Billing), Quản trị viên (Admin).
- **Hành động Agent:** Áp dụng Permission Classes trong DRF (`IsDriver`, `IsDispatcher`, `IsWarehouseKeeper`) cho từng API endpoint tương ứng.

### 12. Chống SQL Injection trong các truy vấn báo cáo sản lượng (Parameterized Queries)
- **Chuẩn Logistics:** Các báo cáo doanh thu vận tải, sản lượng tấn/km, hiệu suất xe lọc theo ngày tháng và biển số phải dùng Django ORM.
- **Hành động Agent:** Rà soát các hàm thống kê, đảm bảo dùng ORM `filter()`, `annotate()`, `aggregate()` thay vì ghép chuỗi câu lệnh SQL.

### 13. Bắt buộc HTTPS cho toàn bộ API di động & Web (Enforce HTTPS)
- **Chuẩn Logistics:** Dữ liệu tọa độ GPS thời gian thực và thông tin hàng hóa bắt buộc truyền qua HTTPS/WSS (WebSocket an toàn).
- **Hành động Agent:** Cấu hình chuyển hướng SSL/TLS bắt buộc và kích hoạt SSL Pinning (nếu có ứng dụng di động riêng).

### 14. Bổ sung các Security Headers cho cổng điều phối (Security Headers)
- **Chuẩn Logistics:** Bảo vệ bảng điều khiển trung tâm (Dispatching Dashboard) khỏi các nguy cơ Clickjacking và XSS.
- **Hành động Agent:** Bật đầy đủ `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` và Content Security Policy (CSP) chặt chẽ.

### 15. Bảo mật Cookie trên cổng đối soát công nợ (Secure Cookies)
- **Chuẩn Logistics:** Cổng đối soát cước vận chuyển cho khách hàng doanh nghiệp (B2B Portal) phải sử dụng Cookie bảo mật cao.
- **Hành động Agent:** Bật cờ `HttpOnly`, `Secure`, `SameSite=Lax` cho toàn bộ cookie xác thực.

### 16. Cấu hình CORS cho ứng dụng di động & tích hợp 3PL (Strict CORS)
- **Chuẩn Logistics:** Chỉ mở CORS cho các domain portal doanh nghiệp và app mobile nội bộ; tuyệt đối không mở wildcard `*` cho các API quản trị nội bộ.
- **Hành động Agent:** Cấu hình danh sách trắng `CORS_ALLOWED_ORIGINS` rõ ràng theo tên miền chính thức của công ty logistics.

### 17. Giới hạn truy cập Database GPS & Điều vận từ Internet (Restrict DB Access)
- **Chuẩn Logistics:** Cơ sở dữ liệu hành trình xe và dữ liệu kho bãi chỉ cho phép truy cập nội bộ trong mạng ảo (Private VPC).
- **Hành động Agent:** Đảm bảo database PostgreSQL/TimescaleDB chỉ lắng nghe trên mạng nội bộ Docker hoặc IP nội bộ, đóng toàn bộ cổng database ra ngoài Internet.

### 18. Quyền tối thiểu cho tài khoản ứng dụng Logistics (Least Privilege DB User)
- **Chuẩn Logistics:** Tài khoản kết nối DB của app logistics chỉ có quyền đọc/ghi dữ liệu, không có quyền `DROP TABLE` hay `ALTER TABLE` trong runtime.
- **Hành động Agent:** Khởi tạo user database riêng biệt với quyền tối thiểu cho dịch vụ vận tải.

### 19. Tích hợp WAF lọc truy cập bất thường vào cổng tra cứu (WAF & Anti-Bot)
- **Chuẩn Logistics:** Cổng tra cứu vận đơn công khai thường xuyên bị đối thủ hoặc bot cào dữ liệu hành trình; bắt buộc định tuyến qua Cloudflare WAF.
- **Hành động Agent:** Kích hoạt Cloudflare Bot Fight Mode và thiết lập quy tắc giới hạn request vào endpoint `/tracking/`.

### 20. Giám sát sự cố vận tải & Đột biến thất thoát hàng hóa (Audit Logging & Alerting)
- **Chuẩn Logistics:** Mọi thay đổi trạng thái đơn, xác nhận POD, báo cáo thất lạc/hỏng hóc (OS&D) phải được ghi log kiểm toán không thể xóa sửa (Immutable Audit Trail).
- **Hành động Agent:** Ghi nhận `TrackingEventLog` với đầy đủ: người thực hiện, thời gian, tọa độ GPS; tích hợp cảnh báo khi tỷ lệ hủy chuyến hoặc sự cố hàng hóa vượt ngưỡng cảnh báo.
