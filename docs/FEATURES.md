# BIM LOGISTICS — TÍNH NĂNG ĐÃ XÂY DỰNG (FEATURES DOCUMENTATION)

> **Phiên bản:** 1.4.9 | **Cập nhật:** 21/09/2026  
> Tài liệu ghi nhận đầy đủ tất cả tính năng đã được thiết kế, lập trình và triển khai trên nền tảng BIM Logistics.

---

## PHÂN HỆ 1: TỔNG QUAN DASHBOARD (Ban Giám Đốc)

### 1.1 Mục đích
Dashboard chiến lược được thiết kế theo chuẩn quốc tế TMS Dashboard (Transport Management KPI Board), giúp Ban Giám Đốc đọc nhanh toàn bộ tình hình vận hành trong dưới 30 giây.

### 1.2 Các Thẻ KPI Trụ Cột (4 Card)

| KPI | Nội dung | Màu sắc |
|---|---|---|
| **Doanh thu Tháng** | Tổng cước phí vận chuyển từ tất cả chuyến xe (kể cả đang chạy) | Teal/Emerald |
| **Chi phí Vận hành** | Tổng chi phí thực tế phát sinh + Operating Ratio % | Rose |
| **Lợi nhuận Gộp** | Doanh thu - Chi phí thực tế; Biên lợi nhuận % (Gross Margin) | Emerald |
| **Năng suất OTD** | On-Time Delivery Rate % + số chuyến hoàn tất hôm nay | Teal |

### 1.3 Dòng Tài chính & Quỹ Khả Dụng

- **Doanh thu | Chi phí:** Hiển thị song song trên cùng 1 hàng
- **Quỹ Khả Dụng — Tiền mặt | Ngân hàng:** Phân tách rõ ràng hai nguồn tiền để BGĐ theo dõi dòng tiền

### 1.4 Các Khối Phân Tích Chuyên Sâu

#### A. Bảng Phân Tích P&L Chuyến Xe Gần Nhất
- Hiển thị 8 chuyến xe mới nhất với đầy đủ: Mã chuyến, Khách hàng, Tuyến đường, Tài xế, Xe, Container, Doanh thu, Chi phí, Lợi nhuận, Biên lợi nhuận %, Trạng thái
- Nhấp vào từng dòng → Mở ngay màn hình Chi Tiết Chuyến Xe

#### B. Trạng Thái Đội Xe (Fleet Status)
- Số xe đang chở hàng (Active)
- Số xe sẵn sàng tại bãi (Idle / Available)
- Số xe bảo trì (Maintenance)
- Fleet Utilization Rate %

#### C. Booking & Hải quan
- Số Booking chờ điều xe / đang điều / đã hoàn tất
- Phân luồng tờ khai Hải quan: Luồng Xanh / Vàng / Đỏ

#### D. Nhân sự Vận hành
- Số tài xế đang chạy / nghỉ phép

### 1.5 Biểu Đồ (Charts — Chart.js 4)

| Biểu đồ | Loại | Mô tả |
|---|---|---|
| Xu hướng 7 ngày | Line Chart | Doanh thu / Chi phí / Lợi nhuận theo ngày |
| Phân bổ Đội xe | Doughnut Chart | Active / Idle / Maintenance |
| Phân luồng Hải quan | Doughnut Chart | Xanh / Vàng / Đỏ |
| Phân tích P&L | Bar Chart (ngang) | Top khách hàng theo doanh thu |

---

## PHÂN HỆ 2: SALE & BOOKING

### 2.1 Sub-tab: Báo Giá Tuyến Cước (Quotation)

**Bảng danh sách báo giá** gồm:
- Mã báo giá (BG-0916-01...)
- Khách hàng
- Tuyến đường (Pickup → Delivery → Dropoff)
- Đơn giá cước (VNĐ/chuyến)
- Số chuyến dự kiến/tháng
- Doanh thu dự kiến
- Trạng thái (Đang thương lượng / Chờ BGĐ duyệt / Đã duyệt / Từ chối / Hết hiệu lực)
- Nút **Tạo Báo Giá** → Modal `modal_quotation.html`

**Modal Tạo/Sửa Báo Giá** gồm:
- Chọn khách hàng (Dropdown)
- Nhập tuyến đường (Lấy → Kho → Hạ)
- Đơn giá cước (có format số phân cách hàng ngàn)
- Số chuyến dự kiến/tháng
- Ghi chú điều khoản đặc biệt
- Trạng thái ban đầu

### 2.2 Sub-tab: Tiếp Nhận Booking

**Bảng Booking** gồm:
- Mã Booking (BK-2026-...)
- Khách hàng & Loại hàng
- Tuyến đường
- Số Cont / Số Booking hãng tàu
- Giá cước đã ký
- Tiến độ điều xe (Chờ / Đang / Hoàn tất)
- Nút **Nhận Booking** → Modal `modal_booking.html`

**Modal Tiếp Nhận Booking** gồm:
- Mã Booking (tự sinh hoặc nhập)
- Chọn khách hàng
- Loại hình vận chuyển (Xuất FCL / Nhập FCL / Nội địa FTL)
- Thông tin Container (Số booking, Số cont, Hãng tàu, Tàu/Chuyến)
- Cảng lấy / Kho đóng / Cảng hạ
- Giá cước bán ra (Selling Freight Price)
- Ngày đóng hàng / Hạn cắt máng
- Hóa đơn thương mại (Commercial Invoice)

---

## PHÂN HỆ 3: ĐIỀU VẬN (Dispatch Management)

### 3.1 Bảng Danh Sách Chuyến Xe

**Cột hiển thị (8 cột chuẩn):**

| Cột | Nội dung |
|---|---|
| Mã / Lịch Đóng | Mã chuyến (TVL-MMYY-NNN) + Ngày giờ đóng hàng |
| Khách hàng & Kho | Tên khách + Tên kho giao hàng |
| Booking / Cont / Seal | Số booking + Số cont + Số seal |
| Invoice / Dock | Hóa đơn thương mại + Cửa Dock bốc hàng |
| Xe Kéo & Xe Hạ | Biển số xe kéo + Badge Xe Nhà / Xe Bạn + Xe hạ (nếu khác) |
| Lưu Ý & Vị Trí Cont | Lưu ý đặc biệt + Badge vị trí cont (Nhà máy / Bãi / Cảng) |
| Nơi Lấy ➔ Nơi Hạ | Lộ trình 3 điểm |
| Trạng thái | Badge màu theo trạng thái |

**Tính năng:**
- Tìm kiếm real-time (Mã chuyến / Số cont / Khách hàng / Biển số)
- Lọc theo trạng thái
- Nhấp vào dòng → Mở Chi tiết chuyến xe
- Nút **+ Tạo Lệnh Điều Động** → Modal `modal_create_trip.html`

### 3.2 Modal Tạo Lệnh Điều Động

Gồm đầy đủ các trường thực tế từ bảng Excel điều độ:
- Khách hàng / Loại hình (Nhập / Xuất / Nội địa)
- Tài xế + Xe kéo
- Số Cont / Loại Cont / Số Seal / Booking
- Lộ trình 3 điểm: Cảng lấy → Kho khách → Cảng hạ
- Ngày giờ đóng hàng + Hạn Cắt máng (Cutoff)
- Hóa đơn thương mại + Cửa Dock
- Vị trí vỏ cont (Nhà máy / Bãi TVL / Cảng/Depot)
- Lưu ý điều vận
- Thông tin EIR: Hãng tàu, Tàu/Chuyến, Cảng đích, VGM

---

## PHÂN HỆ 4: CHI TIẾT CHUYẾN XE (Trip Detail)

### 4.1 Khung Tổng Quan Chuyến

- Header: Mã chuyến + Badge trạng thái + Loại hình + Khách hàng
- 4 thẻ thông tin cơ bản: Số Xe & Tài xế / Số Cont & Vị trí / Seal & Booking / Invoice & Dock
- Lộ trình 3 điểm với icon màu sắc phân biệt

### 4.2 Theo Dõi 5 Mốc Thời Gian Kho Khách

| Mốc | Mô tả |
|---|---|
| ETA Dự kiến | Giờ xe dự kiến đến cổng kho |
| Kho Gọi Vào | Giờ bộ phận kho gọi xe vào cổng |
| Xe Vào Thực Tế | Giờ xe thực tế vào cổng kho |
| Kho Gọi Ra | Giờ bộ phận kho gọi xe kéo cont ra |
| Xe Ra Thực Tế | Giờ xe thực tế kéo ra |

> **Ứng dụng:** Tính thời gian chờ đợi, xử lý tranh chấp phạt lưu xe.

### 4.3 Bảng Kê Chi Phí 8 Mục (Chuẩn Triền Võ)

| STT | Khoản mục | Phân loại |
|---|---|---|
| 1 | HĐ điện tử | Thông tin tra cứu HĐĐT cảng/depot |
| 2 | Nâng (Lift On) | Phí nâng cont lên xe |
| 3 | Hạ (Lift Off) | Phí hạ cont xuống bãi |
| 4 | Cược cont | Tiền cược container |
| 5 | Cân xe | Phí cân xe tại trạm |
| 6 | Bốc xếp | Phí bốc xếp kho |
| 7 | Vé cầu đường | Phí BOT, cầu đường |
| 8 | Chi phí khác | Phí lưu bãi, vá vỏ, sửa chữa gấp... |

**Tính năng Bảng Kê:**
- Hỗ trợ accordion: Bấm vào dòng tổng hợp → Xổ ra từng vé chi tiết
- Hiển thị đầy đủ: Số HĐ, Mã tra cứu HĐĐT, Link tra cứu online, Đơn vị phát hành, Trạng thái duyệt
- Nút Sửa / Xóa trên từng khoản chi (theo phân quyền)
- **Banner Khóa Sổ** khi đã chốt sổ Kế toán

**Công thức tài chính bất biến (Zero Variance):**
```
Tổng Chi Phí = Σ(Khoản chi trong bảng kê thực tế)
Lợi Nhuận Gộp = Doanh Thu Cước - Tổng Chi Phí
Biên Lợi Nhuận = (Lợi Nhuận Gộp / Doanh Thu Cước) × 100%
```

### 4.4 Box P&L Tóm Tắt (3 Thẻ)

- **Doanh Thu Cước:** Giá cước xuất hóa đơn
- **Tổng Chi Phí Thực Tế:** Tổng các khoản chi đã ghi nhận (khớp 100% bảng kê)
- **Lợi Nhuận Gộp (Margin):** Số tiền + Tỷ lệ %

### 4.5 Timeline 10 Bước Điều Vận

Hiển thị trực quan từng bước tiến độ theo thời gian thực:
```
B1. Điều độ phát lệnh Zalo
B2. Tài xế nhận lệnh
B3. Lấy Cont / Hàng (EIR)
B4. Di chuyển trên đường
B5. Báo mốc kho (Sắp đến / Đến cổng / Bắt đầu / Xong)
B6. Giao nhận hàng (POD)
B7. Hạ vỏ cont / Trả hàng
B8. Hoàn tất EIR hạ
B9. Kê khai chi phí
B10. Đối soát & Chốt sổ
```

### 4.6 Chứng Từ Số & Hóa Đơn Đính Kèm

- EIR Lấy Cont / EIR Hạ Cont
- Biên bản giao nhận (POD)
- Hóa đơn điện tử nâng/hạ cảng

### 4.7 Giao Diện App Tài Xế Giả Lập (Driver Mobile Simulator)

Giao diện điện thoại giả lập trực tiếp trong màn hình chi tiết chuyến, hiển thị:

- **Báo mốc kho 1 chạm (Bước 6 SOP):**
  - 🚗 Sắp đến kho (Báo trước 30p)
  - 📍 Đến cổng kho (Check-in)
  - 📦 Đang dỡ/đóng hàng
  - ✅ Đóng xong (Chuẩn bị hạ bãi)

- **Chi phí tài xế đã kê:** Tổng tiền + Danh sách từng khoản (có Sửa/Xóa nếu đang PENDING)
- **Thông tin Vỏ Cont / EIR:** Số Cont, Số EIR, Hãng tàu
- **Nút chụp chứng từ:** Chụp EIR / Chụp POD

### 4.8 Quản Lý Trạng Thái Chốt Sổ Kế Toán

- Nút **🔒 Chốt Sổ Kế Toán:** Khóa cứng toàn bộ bảng kê chi phí
- Nút **🔓 Mở Sổ:** Dành cho Kế toán trưởng mở khóa khi cần hiệu chỉnh
- Mọi chi phí khi chốt sổ chuyển sang `SETTLED` — bất khả xâm phạm

---

## PHÂN HỆ 5: QUẢN LÝ KẾ TOÁN

### 5.1 KPI Kế Toán (4 Thẻ)

- Tổng doanh thu vận tải
- Tổng chi phí thực tế
- Lợi nhuận gộp
- Số chuyến chờ chốt sổ / đã chốt sổ

### 5.2 Bảng Đối Soát Chi Phí

Danh sách tất cả chuyến xe với:
- Mã chuyến, ngày đóng hàng, khách hàng, tuyến đường, tài xế, xe, container
- Doanh thu / Chi phí / Lợi nhuận / Biên lợi nhuận
- Số lượng chứng từ đính kèm / Số hóa đơn có mã tra cứu
- Trạng thái chốt sổ (Chưa chốt / Đã chốt)
- Thông tin người chốt sổ + thời gian chốt

---

## PHÂN HỆ 6: XE & BÃI (Fleet Management)

### 6.1 KPI Đội Xe (3 Thẻ)

- Xe đang hoạt động (Active)
- Xe sẵn sàng tại bãi (Idle)
- Xe đang bảo trì (Maintenance)

### 6.2 Danh Sách Phương Tiện

| Cột | Nội dung |
|---|---|
| Biển số / Loại xe | Biển số (font-mono) + Badge loại xe |
| Nguồn xe | Xe Nhà (Teal) / Xe Bạn (Amber) |
| Tài xế chỉ định | Tên tài xế thường lái |
| Hạn đăng kiểm | Ngày hết hạn + Cảnh báo sắp hết |
| Bảo trì định kỳ | Ngày bảo trì tiếp theo |
| Trạng thái | Active / Idle / Maintenance |

**Tính năng phân loại nguồn xe:**
- **Xe Nhà (OWNED):** Badge Teal — đội xe công ty sở hữu
- **Xe Bạn (SUBCONTRACTOR):** Badge Amber — xe thuê ngoài / 3PL

---

## PHÂN HỆ 7: HÀNH CHÍNH & NHÂN SỰ

### 7.1 KPI Nhân Sự (3 Thẻ)

- Tổng nhân sự đang làm việc
- Tài xế đang chạy hàng
- Tài xế đang nghỉ phép

### 7.2 Bảng Lương Chuyến Tạm Tính

| Cột | Nội dung |
|---|---|
| Mã NV / Tài xế | Mã nhân viên + Tên đầy đủ |
| Số chuyến tháng | Tổng số chuyến đã thực hiện |
| Lương cơ bản | Lương cố định hàng tháng |
| Lương chuyến | = Số chuyến × Định mức lương/chuyến |
| Tạm ứng | Số tiền đã tạm ứng |
| Thực lãnh | = Lương cơ bản + Lương chuyến - Tạm ứng |

---

## PHÂN HỆ 8: DỊCH VỤ HẢI QUAN (Customs Service)

> **Trạng thái:** Placeholder — Phát triển sau

**Đã xây dựng khung:**
- 3 KPI: Luồng Xanh / Vàng / Đỏ (với số lượng tờ khai)
- Khung giao diện sẵn sàng mở rộng

---

## TÍNH NĂNG KỸ THUẬT XUYÊN SUỐT

### A. Single Page Application (SPA)
- Không reload trang khi chuyển phân hệ
- Sidebar navigation điều hướng bằng `showView()` JavaScript
- URL hash routing cơ bản (`#dispatch`, `#sales`...)

### B. Số Format Hàng Ngàn
- Tất cả số tiền hiển thị theo chuẩn Việt Nam: `1.548.000 đ`
- Dùng `Intl.NumberFormat('vi-VN')` + suffix ` đ`
- Áp dụng đồng bộ cả bảng, form nhập và box P&L

### C. Real-time Search & Filter
- Tìm kiếm real-time trên bảng điều vận (không cần bấm Enter)
- Lọc theo trạng thái dropdown

### D. Toast Notifications
- Thông báo thành công / lỗi / cảnh báo góc phải màn hình
- Tự động biến mất sau 4 giây
- Màu sắc: Emerald (success), Rose (danger), Amber (warning), Teal (info)

### E. Responsive Design
- Tailwind CSS responsive breakpoints: `sm:`, `md:`, `xl:`
- Dashboard co giãn từ 1 cột (mobile) lên 4 cột (desktop)
- Bảng dữ liệu có scroll ngang trên màn hình nhỏ

### F. OCR Simulator
- Modal `modal_ocr.html` mô phỏng tài xế chụp ảnh chứng từ
- Giả lập kết quả OCR trích xuất số Cont, Seal, Số HĐ

### G. Vòng Đời Chi Phí 3 Cấp Độ (Expense Lifecycle)

| Trạng thái | Ý nghĩa | Quyền tài xế | Quyền điều độ |
|---|---|---|---|
| `PENDING` | Vừa kê khai, chờ duyệt | Sửa / Xóa | Sửa / Duyệt / Xóa |
| `APPROVED` | Đã duyệt, vào P&L | Không sửa/xóa | Mở lại / Sửa |
| `SETTLED` | Kế toán đã chốt sổ | Không thao tác | Không thao tác |
