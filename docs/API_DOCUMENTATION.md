# BIM LOGISTICS — REST API DOCUMENTATION

Toàn bộ các endpoint REST API phục vụ cho Cổng điều hành Web và Ứng dụng Tài xế di động.

---

## 1. Ban Giám Đốc (Management Dashboard)
- **`GET /api/dashboard/`**
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
  - Mô tả: Tạo Lệnh Điều Động mới (Lưu trực tiếp vào Database).
  - Payload mẫu:
    ```json
    {
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
      "notes": "Lưu ý chứng từ về cty sớm"
    }
    ```
- **`GET /api/trips/{trip_code}/`**
  - Mô tả: Chi tiết chuyến xe, lộ trình 3 điểm, timeline 10 bước, chi phí và chứng từ.
- **`POST /api/trips/{trip_code}/expenses/`**
  - Mô tả: Báo cáo chi phí phát sinh từ App tài xế (mô phỏng OCR vé trạm).
- **`POST /api/trips/{trip_code}/documents/`**
  - Mô tả: Tải lên và đối chiếu chứng từ hoàn thành (Phiếu EIR, Biên bản POD).

---

## 3. Nhân Sự, Đội Xe, Kinh Doanh & Hải Quan
- **`GET /api/personnel/`**: Bảng lương chuyến tạm tính theo sản lượng thực tế.
- **`GET /api/fleet/`**: Danh sách phương tiện kèm cảnh báo hạn đăng kiểm và hạn bảo trì.
- **`GET /api/sales/`**: Báo giá, sản lượng và doanh thu dự kiến theo tháng.
- **`GET /api/customs/`**: Phân luồng tờ khai Hải quan (Xanh/Vàng/Đỏ).
