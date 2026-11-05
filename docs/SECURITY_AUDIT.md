# SECURITY_AUDIT.md — SECURITY ARCHITECTURE & DATA PRIVACY COMPLIANCE
## 20 Tiêu Chuẩn An Ninh Chuỗi Cung Ứng & Tuân Thủ Bảo Vệ Dữ Liệu Cá Nhân

> **Hệ thống:** GSS Logistics Platform (TMS, WMS & Fleet)  
> **Phiên bản:** v4.7.19 | **Cập nhật lần cuối:** 01/11/2026  
> **Tiêu chuẩn an toàn:** OWASP Top 10, ISO/IEC 27001 & NIST Cybersecurity Framework  
> **Căn cứ pháp lý:** Luật Bảo vệ dữ liệu cá nhân (số 91/2025/QH15) & Nghị định 356/2025/NĐ-CP (thay thế NĐ 13/2023/NĐ-CP)

---

## I. HƯỚNG DẪN DÀNH CHO AI AGENT (SYSTEM PROMPT & GOVERNANCE)

Bạn là chuyên gia về **Kiểm tra An ninh Ứng dụng Chuỗi cung ứng & Vận tải (Logistics & Fleet Security Specialist)**. Khi rà soát mã nguồn hoặc triển khai tính năng:
1. **Kiểm tra (Audit):** Định vị mã nguồn liên quan (API điều phối, API tài xế mobile, upload ảnh POD, models vận đơn, bảng lương) và phân loại: `[ĐẠT]`, `[KHÔNG ĐẠT]`, hoặc `[CẦN NÂNG CẤP]`.
2. **Tái cấu trúc (Refactor):** Khắc phục triệt để lỗ hổng theo nguyên tắc phòng thủ đa lớp (Defense-in-Depth), tối ưu cho cả web điều hành và ứng dụng di động ngoại tuyến.
3. **Tuân thủ pháp lý dữ liệu:** Mọi dữ liệu nhân sự, khách hàng và chứng từ ký nhận phải được bảo vệ nghiêm ngặt theo quy định pháp luật Việt Nam.

---

## II. 20 TIÊU CHUẨN AN NINH CHUỖI CUNG ỨNG (20 SECURITY ESSENTIALS)

### 1. Hash Mật Khẩu Tài Xế & Nhân Viên (Password Hashing)
- **Chuẩn:** Toàn bộ tài khoản bắt buộc mã hóa qua thuật toán Argon2 hoặc PBKDF2 của Django (Work factor $\ge 600.000$ vòng).
- **Hành động:** Kiểm tra luồng cấp tài khoản, đảm bảo không bao giờ lưu mật khẩu plain text hoặc in ra console/log/SMS.

### 2. Giới Hạn Tần Suất Truy Cập (Rate Limiting)
- **Chuẩn:** Chống brute-force và bảo vệ máy chủ khỏi nghẽn lưu lượng.
- **Hành động:** Áp dụng Rate Limit riêng: API tra cứu vận đơn public (tối đa 20 req/phút/IP); API GPS tracking di động (tối đa 1 req/5-10s/device).

### 3. Quản Lý Thời Hạn Phiên Di Động (JWT Token Expiration & Blacklist)
- **Chuẩn:** Thiết bị tài xế dùng JWT Token có thời hạn hợp lý (Access Token 4h, Refresh Token 7 ngày).
- **Hành động:** Cấu hình Simple JWT Token Blacklist. Khi tài xế đổi ca, đăng xuất hoặc bị khóa tài khoản, thu hồi ngay lập tức cặp token.

### 4. Dọn Dẹp Nhật Ký Debug Chứa Dữ Liệu PII (Debug Logging Cleanup)
- **Chuẩn:** Không in ra console/log: số điện thoại cá nhân, địa chỉ nhà riêng, giá trị hàng hóa hoặc token GPS.
- **Hành động:** Rà soát API payload GPS và webhook, loại bỏ toàn bộ `print(request.data)` chứa PII.

### 5. Quản Lý Khóa Bí Mật Bản Đồ & Dịch Vụ 3PL (Secret Key Protection)
- **Chuẩn:** Toàn bộ API Key (Google Maps, VietMap, Mapbox, 3PL, SMS OTP) phải lưu trữ trong biến môi trường `.env`.
- **Hành động:** Tuyệt đối không để lộ API Key trên Frontend/Mobile; mọi tác vụ tính toán lộ trình phải gọi qua Backend proxy.

### 6. Xử Lý Lỗi An Toàn Hiện Trường (Secure Error Handling)
- **Chuẩn:** Khi mất kết nối hoặc lỗi máy chủ, API phản hồi mã lỗi chuẩn kèm thông báo thân thiện; không trả về traceback Django/SQL.
- **Hành động:** Triển khai Custom Exception Handler trả về: `{ "success": false, "error_code": "ERR_CODE", "message": "..." }`.

### 7. Kiểm Định Định Dạng Chứng Từ Giao Nhận POD (File Upload Validation)
- **Chuẩn:** Ảnh ký nhận POD, biên bản hư hỏng OS&D chỉ chấp nhận tệp an toàn (`jpg`, `jpeg`, `png`, `pdf`).
- **Hành động:** Kiểm tra Magic Bytes đầu tệp (thư viện Pillow/python-magic) để chặn mã độc giả dạng đuôi ảnh; tự động nén tối ưu.

### 8. Giới Hạn Dung Lượng Tệp Tải Lên (File Upload Size Limit)
- **Chuẩn:** Ảnh chứng từ POD/EIR giới hạn tối đa $3\text{MB} - 5\text{MB}$ để tránh quá tải đường truyền 4G của tài xế.
- **Hành động:** Validate kích thước tệp ở cả client JavaScript và backend Django serializer; từ chối xử lý tệp $> 5\text{MB}$.

### 9. Xác Thực Dữ Liệu Tải Trọng & Thể Tích CBM Phía Server (Server-side Validation)
- **Chuẩn:** Không tin tưởng tính toán từ client; mọi trọng lượng (Gross Weight) và thể tích (CBM) phải validate ở Backend.
- **Hành động:** Kiểm tra: Gross Weight $\le$ Tải trọng tối đa xe; Kích thước kiện hàng $\le$ Kích thước thùng xe.

### 10. Phòng Chống Tấn Công IDOR Bằng HashID (IDOR Prevention)
- **Chuẩn:** Ngăn chặn việc dò quét dữ liệu chuyến xe hoặc đơn hàng bằng cách thay đổi ID tuần tự (`/trips/123/`).
- **Hành động:** Sử dụng mã HashID có salt bí mật (`HASHIDS_SALT`) cho mọi public URL; kiểm tra phân quyền sở hữu bản ghi.

### 11. Kiểm Soát Phân Quyền Theo Vai Trò (RBAC Access Control)
- **Chuẩn:** Phân quyền nghiêm ngặt giữa: Tài xế, Điều phối viên, Thủ kho, Kế toán và Ban Giám Đốc.
- **Hành động:** Áp dụng Permission Classes trong DRF (`IsDriver`, `IsDispatcher`, `IsAccountant`, `IsAdminOrDirector`).

### 12. Chống Tấn Công SQL Injection (Parameterized ORM Queries)
- **Chuẩn:** Mọi báo cáo sản lượng, P&L, đối soát tài chính phải dùng Django ORM.
- **Hành động:** Tuyệt đối không ghép chuỗi SQL; sử dụng ORM `filter()`, `annotate()`, `aggregate()`.

### 13. Bắt Buộc HTTPS & Mã Hóa Đường Truyền (Enforce HTTPS/TLS)
- **Chuẩn:** Dữ liệu tọa độ GPS, thông tin hàng hóa và đăng nhập bắt buộc truyền qua HTTPS/WSS.
- **Hành động:** Cấu hình HSTS, chuyển hướng SSL bắt buộc và kích hoạt SSL Pinning trên mobile.

### 14. Bổ Sung Các Security Headers Bảo Vệ Cổng Điều Hành (Security Headers)
- **Chuẩn:** Bảo vệ trang quản trị khỏi Clickjacking, MIME sniffing và Cross-Site Scripting (XSS).
- **Hành động:** Bật đầy đủ `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Content Security Policy (CSP) chặt chẽ.

### 15. Bảo Mật Cookie Phiên Làm Việc (Secure Cookies)
- **Chuẩn:** Cổng kế toán và đối soát B2B Portal phải sử dụng cookie phiên bảo mật cao.
- **Hành động:** Bật cờ `HttpOnly`, `Secure`, `SameSite=Lax` cho toàn bộ session và CSRF cookie.

### 16. Cấu Hình CORS Chặt Chẽ (Strict CORS Policy)
- **Chuẩn:** Chỉ mở CORS cho các tên miền chính thức của công ty và app nội bộ; không dùng wildcard `*`.
- **Hành động:** Khai báo danh sách trắng `CORS_ALLOWED_ORIGINS` cụ thể trong `.env`.

### 17. Giới Hạn Truy Cập Cơ Sở Dữ Liệu Từ Internet (Restrict DB Access)
- **Chuẩn:** CSDL PostgreSQL chỉ lắng nghe kết nối nội bộ trong Docker Network / VPC.
- **Hành động:** Đóng cổng 5435/5432 ra Internet công cộng; chỉ ứng dụng backend nội bộ mới được kết nối.

### 18. Nguyên Tắc Đặc Quyền Tối Thiểu Cho User CSDL (Least Privilege DB User)
- **Chuẩn:** Tài khoản ứng dụng runtime không có quyền `DROP DATABASE` hay `SUPERUSER`.
- **Hành động:** Tạo user CSDL riêng biệt cho ứng dụng với quyền CRUD thông thường.

### 19. Tường Lửa Ứng Dụng Web & Chống Bot (WAF & Anti-Bot)
- **Chuẩn:** Bảo vệ cổng tra cứu vận đơn công khai khỏi bot cào quét dữ liệu hành trình.
- **Hành động:** Định tuyến qua Cloudflare WAF, bật Bot Fight Mode và rate limit endpoint `/tracking/`.

### 20. Nhật Ký Kiểm Toán Bất Biến & Cảnh Báo (Audit Logging & Alerting)
- **Chuẩn:** Mọi thao tác đổi trạng thái chuyến, duyệt chi phí, sửa đơn hàng phải được ghi log kiểm toán không thể xóa sửa.
- **Hành động:** Ghi nhận `AuditLog` và `TrackingEventLog` lưu vết: User, IP, thời gian, dữ liệu trước/sau thay đổi.

---

## III. BẢO VỆ DỮ LIỆU CÁ NHÂN & TUÂN THỦ PHÁP LÝ (DATA PRIVACY & COMPLIANCE)

> **Căn cứ pháp lý:** Luật Bảo vệ dữ liệu cá nhân (số 91/2025/QH15) và Nghị định 356/2025/NĐ-CP (có hiệu lực từ 01/01/2026, thay thế Nghị định 13/2023/NĐ-CP).

### 1. Phân Định Vai Trò Pháp Lý
- **Bên Kiểm Soát Dữ Liệu (Data Controller):** Doanh nghiệp sử dụng phần mềm (GSS) — quyết định mục đích và phạm vi thu thập dữ liệu nhân viên, tài xế, khách hàng.
- **Bên Xử Lý Dữ Liệu (Data Processor):** Đơn vị cung cấp và vận hành nền tảng — lưu trữ, sao lưu, bảo trì kỹ thuật theo hợp đồng xử lý dữ liệu.

### 2. Danh Mục Dữ Liệu Cá Nhân Hệ Thống Xử Lý (PII Inventory)

| Nhóm chủ thể | Loại dữ liệu | Mức độ nhạy cảm | Vị trí lưu trữ | Mục đích xử lý |
|---|---|---|---|---|
| **Nhân viên, Tài xế** | Họ tên, biệt danh, SĐT, Zalo, email, giới tính, ngày sinh, ảnh đại diện | Cơ bản | `personnel.Employee`, `media/avatars/` | Quản lý nhân sự, phân công điều vận |
| **Nhân viên, Tài xế** | Số CCCD (ngày/nơi cấp), MST cá nhân, số sổ BHXH, địa chỉ thường trú, số GPLX | Cơ bản (Hạn chế) | `personnel.Employee` | Hợp đồng lao động, BHXH, thuế TNCN |
| **Nhân viên, Tài xế** | Số tài khoản, ngân hàng, lương HĐ, lương đóng BH, tạm ứng, phiếu lương | **Dữ liệu nhạy cảm** (Tài chính) | `personnel.Employee`, `PayrollSlip`, `CashTransaction` | Chi trả lương, tạm ứng, quyết toán |
| **Nhân viên** | Hợp đồng lao động, phụ lục, chữ ký điện tử | Cơ bản (Hạn chế) | `media/personnel/` | Hồ sơ lao động pháp lý |
| **Khách hàng, Đối tác** | Tên người liên hệ, chức vụ, SĐT, email công ty | Cơ bản | `customers.Customer`, `master_data.Subcontractor` | Báo giá, giao dịch, đối soát cước |
| **Người nhận hàng** | Tên người nhận, chữ ký trên POD, ảnh hiện trường | Cơ bản | `documents.TripDocument`, `media/` | Bằng chứng hoàn tất giao hàng |
| **Người dùng hệ thống**| Username, mật khẩu băm, IP, nhật ký thao tác | Cơ bản | `auth.User`, `core.AuditLog` | Xác thực, bảo mật, truy vết sự cố |

> [!NOTE]
> Hệ thống **không** theo dõi tọa độ GPS liên tục ngoài giờ làm việc của tài xế và **không** thu thập dữ liệu sinh trắc học, tôn giáo hay tình trạng sức khỏe cá nhân.

### 3. Biện Pháp Kỹ Thuật Đã Triển Khai
1. **Kiểm soát truy cập tệp nội bộ:** Toàn bộ tệp trong `/media/` (HĐLĐ, CCCD, ảnh POD) đi qua view kiểm tra quyền (`core.media_views`), sử dụng cơ chế Nginx `X-Accel-Redirect`, không mở public.
2. **Cách ly dữ liệu đa doanh nghiệp:** Cơ chế `tenant_scope` đảm bảo người dùng chỉ truy cập dữ liệu thuộc đơn vị mình.
3. **Mã băm URL bảo mật:** Link tra cứu tài xế và khách hàng sử dụng mã băm `Hashids` với salt bí mật, có cơ chế thu hồi tức thì (`revoked_driver_tokens`).
4. **Bảo mật cơ sở dữ liệu:** Mật khẩu CSDL lưu an toàn trong `.env` trên máy chủ (phân quyền 640), được thay đổi định kỳ.
5. **Sao lưu & Diễn tập khôi phục:** Tự động sao lưu mỗi ngày, lưu trữ 14 ngày cuộn vòng; diễn tập khôi phục hàng tuần (`restore_drill.sh`).

### 4. Thời Hạn Lưu Trữ Dữ Liệu Đề Xuất
- **Chứng từ kế toán, phiếu thu chi, bảng lương:** Lưu trữ tối thiểu **10 năm** theo Luật Kế toán.
- **Hồ sơ nhân sự, hợp đồng lao động:** Trong suốt thời gian công tác cộng thêm thời gian giải quyết chế độ BHXH theo luật lao động.
- **Nhật ký kiểm toán (Audit Trail):** Tối thiểu **2 năm** phục vụ điều tra truy vết.
- **Bản sao lưu máy chủ (Backups):** **14 ngày** xoay vòng tự động.

### 5. Quy Trình Ứng Phó Sự Cố Lộ Lọt Dữ Liệu (Incident Response Protocol)
1. **Phát hiện:** Tiếp nhận cảnh báo từ hệ thống giám sát, log Nginx hoặc phản hồi người dùng.
2. **Khoanh vùng khẩn cấp (trong 4 giờ):** Thu hồi các link công khai liên quan, khóa tài khoản nghi vấn, rotate `SECRET_KEY` và `HASHIDS_SALT`.
3. **Đánh giá mức độ:** Xác định danh mục dữ liệu và số lượng cá nhân bị ảnh hưởng từ `AuditLog`.
4. **Báo cáo cơ quan chức năng (trong 72 giờ):** Gửi văn bản thông báo tới Cục An ninh mạng và phòng, chống tội phạm công nghệ cao (A05, Bộ Công an) theo mẫu quy định của Nghị định 356/2025/NĐ-CP.
5. **Khắc phục & Lưu hồ sơ:** Triển khai vá lỗ hổng, cập nhật biện pháp phòng ngừa và lưu trữ hồ sơ phục vụ thanh tra.

---

## IV. KIỂM TOÁN AN NINH LIÊN TỤC (CONTINUOUS SECURITY AUDITING)

Hệ thống tích hợp quy trình CI/CD kiểm toán an ninh tự động:
- **Bandit & Semgrep:** Rà quét lỗ hổng mã nguồn Python tĩnh (Static Application Security Testing - SAST).
- **pip-audit:** Quét lỗ hổng đã công bố (CVE) trong các thư viện phụ thuộc Python.
- **Gitleaks:** Quét tự động chống lộ lọt Secret Keys, Token hoặc mật khẩu vào Git repository.
- **Uptime & SSL Monitoring:** Giám sát tính khả dụng dịch vụ và hạn chứng chỉ số định kỳ mỗi 15 phút.
