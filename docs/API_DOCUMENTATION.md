# BIM LOGISTICS — REST API DOCUMENTATION

Toàn bộ các endpoint REST API phục vụ cho Cổng điều hành Web và Ứng dụng Tài xế di động.

---

## 0. Xác thực & Phân quyền (Authentication & Authorization)
Hệ thống hỗ trợ xác thực kép: **JWT Bearer Token** (dành cho Mobile App & 3PL Integration) và **Session Authentication** (dành cho Web Admin SPA).

- **`POST /api/auth/token/`**
  - Mô tả: Đăng nhập cấp cặp Access Token (thời hạn 4 giờ) và Refresh Token (thời hạn 7 ngày).
  - Payload mẫu:
    ```json
    { "username": "driver_01", "password": "UserPassword2026" }
    ```
  - Phản hồi:
    ```json
    { "access": "eyJhbGciOi...", "refresh": "eyJhbGciOi..." }
    ```
- **`POST /api/auth/token/refresh/`**: Đổi Access Token mới khi hết hạn bằng Refresh Token.
- **`POST /api/auth/token/blacklist/`**: Đăng xuất / Kết thúc ca làm việc, vô hiệu hóa Refresh Token ngay lập tức.
- **`GET /api/auth/me/`**: Lấy thông tin tài khoản đang đăng nhập kèm phân quyền nhân sự (`role`, `department`).

---

## 1. Ban Giám Đốc (Management Dashboard)
- **`GET /api/dashboard/`**
  - Phân quyền: `IsAdminOrDirector` (Ban Giám Đốc hoặc Quản trị viên).
  - Mô tả: Lấy tổng hợp quỹ tiền mặt, số dư ngân hàng, kế hoạch chi tuần, số chuyến xe hôm qua/hôm nay, trạng thái đội xe và bảng phân tích P&L chuyến xe gần nhất.
  - Phản hồi mẫu:
    ```json
    {
      "funds": { "cash_on_hand": 150000000, "bank_balance": 1250000000, "weekly_planned_expenses": 450000000 },
      "productivity": { "completed_yesterday": 51, "today_active": 2, "monthly_gross_profit": 850000000 },
      "fleet": { "active": 5, "idle": 1, "maintenance": 0 },
      "trips_pnl": [...]
    }
    ```

---

## 2. Phòng Điều Vận (Trips & Dispatch)
- **`GET /api/trips/?q={keyword}&status={status}`**
  - Mô tả: Lấy danh sách chuyến xe kèm tìm kiếm và lọc trạng thái.
- **`POST /api/trips/`**
  - Mô tả: Tạo Lệnh Điều Động mới (Lưu trực tiếp vào Database, hỗ trợ JSON hoặc `multipart/form-data`).
  - Hỗ trợ tải tệp đính kèm `booking_file` (PDF/Ảnh $\le 5\text{MB}$) hoặc kế thừa tự động từ `booking_order_id`. Khi có file, hệ thống tự động sinh bản ghi chứng từ pháp lý `TripDocument` loại `BOOKING_NOTE`.
  - Payload mẫu (FormData / JSON):
    ```json
    {
      "booking_order_id": 12,
      "customer": "TĐÁ - VICACO",
      "type": "Nhập",
      "pickup": "SPITC",
      "warehouse": "KHO MACSTAR",
      "dropoff": "HẠ BÃI",
      "driver": "BỤI 94",
      "container": "CAAU5214215XX",
      "seal": "SL-998877",
      "booking": "235601091589",
      "cutoff": "SI 10:00",
      "notes": "Lưu ý chứng từ về cty sớm",
      "booking_file": "<File: booking.pdf / booking.png>"
    }
    ```
- **`GET /api/trips/{trip_code}/`**
  - Mô tả: Chi tiết chuyến xe, lộ trình 3 điểm, timeline 10 bước, chi phí, `booking_file_url` và danh sách chứng từ kèm link tải trực tiếp (`file_url`).
- **`POST /api/trips/{trip_code}/expenses/`**
  - Mô tả: Báo cáo chi phí phát sinh từ App tài xế (mô phỏng OCR vé trạm).
- **`POST /api/trips/{trip_code}/documents/`**
  - Mô tả: Tải lên và đối chiếu chứng từ hoàn thành (Phiếu EIR, Biên bản POD).

---

## 3. Nhân Sự, Đội Xe, Kinh Doanh & Hải Quan
- **`GET /api/personnel/`**: Bảng lương chuyến tạm tính theo sản lượng thực tế.
- **`GET /api/fleet/`**: Danh sách phương tiện kèm cảnh báo hạn đăng kiểm và hạn bảo trì.
- **`GET /api/sales/`**: Báo giá, sản lượng và doanh thu dự kiến theo tháng.
- **`POST /api/sales/`**: Tiếp nhận Đơn đặt hàng / Booking mới (`action: 'create_booking'`) hoặc Tạo Báo giá (`action: 'create_quotation'`). Hỗ trợ đính kèm `booking_file` (PDF/Ảnh).
- **`GET /api/customs/`**: Phân luồng tờ khai Hải quan (Xanh/Vàng/Đỏ).

---

## 4. Quản Lý Danh Mục (Master Data APIs)
- **`GET /api/master-data/form-options/`**: Lấy toàn bộ danh sách tùy chọn dropdown chuẩn hóa cho các biểu mẫu giao diện (Khách hàng, Lộ trình Nơi lấy/Nơi đóng/Nơi hạ, Tài xế, Quy cách vỏ cont). Ngăn ngừa việc nhập liệu tự do phát sinh dữ liệu rác.
- **`GET /api/master-data/summary/`**: Thống kê số lượng bản ghi danh mục (tuyến lương, phụ cấp, cảng/kho, biểu cước, khách hàng, khoản chi, quy cách cont, xe).
