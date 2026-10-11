# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG BIM LOGISTICS PLATFORM (TMS)
## Sổ Tay Hướng Dẫn Vận Hành Toàn Diện Từng Phân Hệ, Tính Năng & Trường Dữ Liệu

> **Đơn vị phát triển:** BIM Ecosystem • Công ty TNHH Vận Tải Triền Võ  
> **Phiên bản hệ thống:** 2.9.45  
> **Địa chỉ truy cập Web:** `https://logistics.bim.info.vn/`  
> **Cổng tra cứu trực tuyến:** `/helps`

---

## MỤC LỤC TỔNG QUAN

1. [Tổng Quan Kiến Trúc Vận Hành & Phân Quyền Vai Trò](#1-tổng-quan-kiến-trúc-vận-hành--phân-quyền-vai-trò)
2. [Phân Hệ 1: Dashboard Ban Giám Đốc (Executive BI)](#2-phân-hệ-1-dashboard-ban-giám-đốc-executive-bi)
3. [Phân Hệ 2: Kinh Doanh, Khách Hàng & Báo Giá (CRM & Quotation)](#3-phân-hệ-2-kinh-doanh-khách-hàng--báo-giá-crm--quotation)
4. [Phân Hệ 3: Tiếp Nhận Đơn Hàng & Booking Hãng Tàu (Booking Order)](#4-phân-hệ-3-tiếp-nhận-đơn-hàng--booking-hãng-tàu-booking-order)
5. [Phân Hệ 4: Điều Vận & Phát Lệnh Vận Tải (Dispatch & Trip Order)](#5-phân-hệ-4-điều-vận--phát-lệnh-vận-tải-dispatch--trip-order)
6. [Phân Hệ 5: Chi Tiết Chuyến Xe, Mốc Kho & Chi Phí P&L](#6-phân-hệ-5-chi-tiết-chuyến-xe-mốc-kho--chi-phí-pl)
7. [Phân Hệ 6: Cổng Mobile Tài Xế & Cổng Tra Cứu Khách Hàng (Driver Portal & Public Tracking)](#7-phân-hệ-6-cổng-mobile-tài-xế--cổng-tra-cứu-khách-hàng)
8. [Phân Hệ 7: Quản Lý Đội Xe, Rơ-Moóc & Bãi Đỗ (Fleet Management)](#8-phân-hệ-7-quản-lý-đội-xe-rơ-moóc--bãi-đỗ-fleet-management)
9. [Phân Hệ 8: Hành Chính, Nhân Sự & Lương Chuyến (HR & Payroll)](#9-phân-hệ-8-hành-chính-nhân-sự--lương-chuyến-hr--payroll)
10. [Phân Hệ 9: Kế Toán Vận Tải, Tạm Ứng & Sổ Quỹ Thu-Chi (Cash Flow & Advance Funds)](#10-phân-hệ-9-kế-toán-vận-tải-tạm-ứng--sổ-quỹ-thu-chi-cash-flow--advance-funds)
11. [Phân Hệ 10: Quyết Toán Gom Chuyến & Xe Bạn 3PL (Trip Settlements)](#11-phân-hệ-10-quyết-toán-gom-chuyến--xe-bạn-3pl-trip-settlements)
12. [Phân Hệ 11: Dịch Vụ Hải Quan Điện Tử (Customs Declaration)](#12-phân-hệ-11-dịch-vụ-hải-quan-điện-tử-customs-declaration)
13. [Phân Hệ 12: Hệ Thống 14 Báo Cáo Thông Minh BI & Giám Sát Chi Phí](#13-phân-hệ-12-hệ-thống-14-báo-cáo-thông-minh-bi--giám-sát-chi-phí)
14. [Phân Hệ 13: Hệ Thống Danh Mục Gốc (Master Data) & Phân Quyền (RBAC)](#14-phân-hệ-13-hệ-thống-danh-mục-gốc-master-data--phân-quyền-rbac)

---

## 1. TỔNG QUAN KIẾN TRÚC VẬN HÀNH & PHÂN QUYỀN VAI TRÒ

### 1.1 Chu trình vận chuyển khép kín (End-to-End Workflow)
```
[Báo Giá / Hợp Đồng] ➔ [Tiếp Nhận Booking] ➔ [Phát Lệnh Điều Xe] ➔ [Tài Xế Báo 6 Mốc Hiện Trường]
      ➔ [Kê Khai Chi Phí & Tạm Ứng] ➔ [Thu POD / Biên Bản OS&D] ➔ [Quyết Toán & Chốt Sổ Quỹ] ➔ [Đối Soát Khách Hàng / Xe Bạn]
```

### 1.2 Bảng Phân Quyền Vai Trò (Role-Based Access Control)
| Vai trò | Mã quyền | Quyền hạn chính |
|---|---|---|
| **Ban Giám Đốc** | `DIRECTOR` | Toàn quyền kiểm soát hệ thống, xem P&L, duyệt chi phí, xem tất cả báo cáo tài chính. |
| **Điều Phối Viên** | `DISPATCHER` | Tạo và điều phối chuyến xe, cấp tạm ứng cho tài xế, quản lý mốc thời gian, xử lý sự cố OS&D. |
| **Kế Toán Vận Tải** | `ACCOUNTANT` | Quản lý sổ quỹ thu-chi, duyệt chi phí chuyến, cấp quỹ điều vận, quyết toán cước xe bạn, thu hồi chi hộ. |
| **Nhân Viên Kinh Doanh** | `SALESMAN` | Tạo báo giá, tiếp nhận booking, quản lý thông tin khách hàng, theo dõi tiến độ đơn hàng. |
| **Quản Lý Đội Xe / Bãi** | `MECHANIC` | Quản lý phương tiện, đầu kéo, rơ-moóc, theo dõi hạn đăng kiểm, bảo trì bảo dưỡng xe. |
| **Tài Xế Xe Đầu Kéo** | `DRIVER` | Tiếp nhận lệnh qua Mobile Capability URL, báo mốc thời gian kho, chụp ảnh POD/EIR, kê khai chi phí dọc đường. |

---

## 2. PHÂN HỆ 1: DASHBOARD BAN GIÁM ĐỐC (EXECUTIVE BI)

### 2.1 Mục đích sử dụng
Màn hình trung tâm dành cho Ban Giám Đốc và Quản lý cấp cao theo dõi tức thời sức khỏe tài chính, tiến độ vận hành đội xe và năng suất giao hàng trong ngày.

### 2.2 Các tính năng chính
- **Bộ lọc kỳ toàn cục:** Chọn xem số liệu theo *Hôm nay*, *10 Ngày qua*, *Tháng này*, *Quý này*, *Năm nay*, hoặc *Tùy chọn khoảng ngày*.
- **4 Thẻ Chỉ Số Trụ Cột (KPI Cards):** Doanh thu, Chi phí vận hành (kèm Operating Ratio %), Lợi nhuận gộp (kèm Biên LN %), Tỷ lệ giao hàng đúng hẹn (OTD %).
- **Dòng tiền & Quỹ khả dụng:** Giám sát song song số dư Quỹ Tiền Mặt và Tài Khoản Ngân Hàng.
- **Top 8 Chuyến Xe Mới Nhất:** Xem nhanh tình trạng chuyến, bấm vào dòng để chuyển sang xem chi tiết chuyến xe.
- **Biểu đồ trực quan (Chart.js):** So sánh doanh thu - chi phí và số chuyến theo thời gian.

---

## 3. PHÂN HỆ 2: KINH DOANH, KHÁCH HÀNG & BÁO GIÁ (CRM & QUOTATION)

### 3.1 Mục đích sử dụng
Quản lý cơ sở dữ liệu khách hàng doanh nghiệp, lập báo giá đa tuyến đường, áp dụng công thức phụ phí biến động giá dầu và in bảng báo giá chuẩn A4 gửi đối tác.

### 3.2 Bảng Đặc Tả Trường Dữ Liệu Báo Giá (Quotation)
| Tên trường | Kiểu dữ liệu | Bắt buộc | Ý nghĩa & Hướng dẫn thao tác |
|---|---|---|---|
| **Mã Báo Giá** (`quotation_code`) | Văn bản (Auto) | Có | Mã định danh duy nhất sinh tự động theo quy tắc `BG-MMDD-XX`. |
| **Khách Hàng** (`customer_id`) | Lựa chọn | Có | Chọn khách hàng doanh nghiệp từ danh mục khách hàng. |
| **Ngày Hiệu Lực** (`effective_date`) | Ngày | Có | Ngày báo giá bắt đầu có hiệu lực cam kết dịch vụ. |
| **Ngày Hết Hạn** (`valid_until`) | Ngày | Có | Hạn cuối chấp nhận báo giá (mặc định sau 30 ngày). |
| **Phương Thức Định Giá** (`pricing_method`) | Lựa chọn | Có | `MULTI_ROUTE` (Theo ma trận tuyến), `FUEL_ADJUSTED` (Biến động theo giá dầu), hoặc `FLAT_CHARTER` (Trọn gói theo tháng/chuyến). |
| **Giá Dầu Tham Chiếu** (`base_fuel_price`) | Số (VNĐ/Lít) | Tùy chọn | Mức giá dầu DO tại thời điểm lập báo giá làm mốc bù trừ trượt giá. |
| **Trạng Thái Báo Giá** (`status`) | Lựa chọn | Có | `DRAFT` (Dự thảo), `NEGOTIATING` (Đang đàm phán), `APPROVED` (Đã duyệt), `REJECTED` (Từ chối). |
| **Điều Khoản Thanh Toán** (`payment_terms`) | Văn bản | Tùy chọn | Quy định hạn thanh toán công nợ (Ví dụ: Chuyển khoản trong vòng 30 ngày kể từ khi nhận đủ POD). |

---

## 4. PHÂN HỆ 3: TIẾP NHẬN ĐƠN HÀNG & BOOKING HÃNG TÀU (BOOKING ORDER)

### 4.1 Mục đích sử dụng
Tiếp nhận lệnh vận chuyển cont rỗng/cont hàng từ khách hàng hoặc hãng tàu, kiểm soát hạn chót hạ bãi (Closing time), và phân bổ phát lệnh điều xe từng container.

### 4.2 Bảng Đặc Tả Trường Dữ Liệu Booking Order
| Tên trường | Kiểu dữ liệu | Bắt buộc | Ý nghĩa & Hướng dẫn thao tác |
|---|---|---|---|
| **Mã Đơn / Booking** (`booking_code`) | Văn bản (Auto) | Có | Mã đơn tự sinh theo chuẩn `BK-YYYY-MMDD-XX`. |
| **Số Booking / Số B/L** (`booking_number`) | Văn bản | Có | Mã số booking hãng tàu cấp hoặc số vận đơn đường biển (B/L). |
| **Khách Hàng** (`customer_id`) | Lựa chọn | Có | Doanh nghiệp chủ hàng chỉ định vận chuyển. |
| **Hãng Tàu** (`shipping_line`) | Văn bản / Dropdown | Có | Hãng tàu phát hành vỏ cont (MAEU, ONE, COSCO, EVERGREEN...). |
| **Loại Dịch Vụ** (`service_type`) | Lựa chọn | Có | `EXPORT` (Kéo cont rỗng đóng hàng xuất cảng), `IMPORT` (Kéo cont nhập giao kho), `DOMESTIC` (Vận chuyển nội địa). |
| **Loại Container** (`container_type`) | Lựa chọn | Có | Quy cách vỏ cont: 20DC, 40HC, 45G1, 20RF, 40RF... |
| **Số Lượng Cont** (`total_containers`) | Số nguyên | Có | Tổng số lượng container cần điều phối trong lô hàng. |
| **Nơi Lấy Cont Rỗng** (`empty_pickup_location`) | Lựa chọn | Có | Depot/Cảng chỉ định cấp vỏ rỗng (Ví dụ: Depot Tân Cảng Suối Tiên). |
| **Kho Đóng / Dỡ Hàng** (`loading_warehouse`) | Lựa chọn | Có | Địa chỉ nhà máy hoặc kho hàng của khách hàng đóng/dỡ hàng. |
| **Nơi Hạ Cont Hàng** (`full_dropoff_location`) | Lựa chọn | Có | Cảng hoặc bãi hạ cont đủ điều kiện xuất tàu (Ví dụ: Cảng Cát Lái). |
| **Hạn Cắt Máng (CY Closing)** (`closing_time`) | Ngày & Giờ | Có | Thời hạn cuối cùng cont phải được hạ bãi để kịp xếp lên tàu. |
| **Hạn Nộp SI / VGM** (`si_cutoff` / `vgm_cutoff`) | Ngày & Giờ | Tùy chọn | Hạn chót gửi thông tin chi tiết và phiếu cân khối lượng toàn bộ. |

---

## 5. PHÂN HỆ 4: ĐIỀU VẬN & PHÁT LỆNH VẬN TẢI (DISPATCH & TRIP ORDER)

### 5.1 Mục đích sử dụng
Trái tim của hệ thống TMS: Phân bổ xe đầu kéo, rơ-moóc, tài xế; xử lý cắt kéo (2 chặng), chở ghép 2 cont 20ft, theo dõi hành trình qua máy trạng thái 11 bước.

### 5.2 Bảng Đặc Tả Trường Dữ Liệu Lệnh Điều Động (DispatchTrip)
| Tên trường | Kiểu dữ liệu | Bắt buộc | Ý nghĩa & Hướng dẫn thao tác |
|---|---|---|---|
| **Mã Chuyến Xe** (`trip_code`) | Văn bản (Auto) | Có | Mã chuyến duy nhất sinh tự động dạng `TVL-MMDD-XXX`. |
| **Xe Đầu Kéo** (`vehicle_id`) | Lựa chọn | Có | Chọn đầu kéo đang ở trạng thái rảnh (`AVAILABLE`) hoặc tại bãi. |
| **Rơ-Moóc** (`trailer_id`) | Lựa chọn | Có | Chọn rơ-moóc xương hoặc cổ cò phù hợp với loại cont. |
| **Bác Tài Chính** (`driver_id`) | Lựa chọn | Có | Tài xế phụ trách điều khiển xe chặng 1 (lấy cont và kéo đến kho). |
| **Số Container** (`container_number`) | Văn bản (11 ký tự) | Có | Chuẩn quốc tế ISO 6346 (Ví dụ: `MSKU1234567`). Tự động viết hoa và xóa khoảng trắng. |
| **Số Chì (Seal)** (`seal_number`) | Văn bản | Tùy chọn | Mã số niêm phong kẹp chì của hãng tàu hoặc Hải quan. |
| **Tách Chặng Cắt Kéo** (`is_split_trip`) | Bật / Tắt (Checkbox) | Có | Bật khi xe 1 kéo cont đến kho khách cắm moóc, sau đó xe 2 đến kéo hạ bãi. |
| **Tài Xế & Xe Chặng 2** (`dropoff_driver`, `dropoff_vehicle`) | Lựa chọn | Bắt buộc nếu Cắt kéo | Phân bổ tài xế và đầu kéo cho chặng kéo cont hàng ra cảng hạ bãi. |
| **Tỷ Lệ Chia Lương Cắt Kéo** (`driver_split_ratio`) | Lựa chọn | Tùy chọn | Tỷ lệ phân chia lương chuyến: 50/50, 60/40 hoặc 40/60. |
| **Chở Ghép 2 Cont 20ft** (`is_twin_container`) | Bật / Tắt (Checkbox) | Có | Bật khi ghép 2 vỏ cont 20ft trên cùng 1 rơ-moóc 40ft/45ft. |
| **Hạn Free-time Lưu Vỏ (DET)** (`det_expiry_date`) | Ngày | Có | Hạn chót trả vỏ cont về hãng tàu trước khi bị phạt phí lưu vỏ. |

### 5.3 Máy Trạng Thái 11 Bước Điều Vận (State Machine)
1. `DRAFT`: Bản nháp lệnh điều động.
2. `DISPATCHED`: Đã phát lệnh cho tài xế qua Driver App.
3. `ACCEPTED`: Tài xế đã xác nhận nhận chuyến.
4. `CONTAINER_PICKED`: Đã lấy vỏ cont tại bãi rỗng (kèm phiếu EIR).
5. `IN_TRANSIT`: Xe đang di chuyển trên đường đến kho khách hàng.
6. `AT_WAREHOUSE`: Xe đã đến kho, đang chờ xếp dỡ.
7. `UNLOADING`: Đang tiến hành đóng / rút hàng tại cửa Dock.
8. `DELIVERED`: Đã hoàn tất đóng hàng / giao hàng xong.
9. `RETURNING_EMPTY`: Đang kéo cont về cảng / depot hạ bãi.
10. `COMPLETED`: Chuyến xe hoàn thành đầy đủ, chờ quyết toán.
11. `CANCELLED`: Hủy chuyến (chỉ cho phép khi chưa lăn bánh).

---

## 6. PHÂN HỆ 5: CHI TIẾT CHUYẾN XE, MỐC KHO & CHI PHÍ P&L

### 6.1 Mục đích sử dụng
Xem hồ sơ toàn diện của từng chuyến xe: Timeline tiến độ 11 mốc, 5 mốc thời gian kho khách hàng, kê khai chi phí phát sinh 8 mục, đối chiếu lợi nhuận gộp tức thì.

### 6.2 Bảng Kê Chi Phí Vận Hành (TripExpense)
| Khoản mục chi phí | Mã hệ thống | Tính chất | Yêu cầu HĐĐT |
|---|---|---|---|
| **Nâng Cont** | `LIFT_ON` | Chi phí vận hành | Bắt buộc mã tra cứu hóa đơn cảng |
| **Hạ Cont** | `LIFT_OFF` | Chi phí vận hành | Bắt buộc mã tra cứu hóa đơn cảng |
| **Vé Cầu Đường (BOT)** | `TOLL_FEE` | Chi phí vận hành | Phiếu vé trạm hoặc trừ tài khoản ePass/VETC |
| **Cược Vỏ Container** | `CONTAINER_DEPOSIT` | Tạm ứng thu hồi | Hãng tàu hoàn trả sau khi trả vỏ sạch |
| **Cân Xe (VGM/Tải trọng)** | `WEIGHING` | Chi phí vận hành | Phiếu cân tại trạm cân điện tử |
| **Bốc Xếp Hàng Hóa** | `LABOR_STEVEDORING` | Chi phí vận hành | Chi phí nhân công bốc xếp hiện trường |
| **Lưu Bãi / Lưu Xe** | `OTHER` | Chi phí vận hành / Thu khách | Phí neo xe quá 12h theo quy định hợp đồng |
| **Chi Hộ Khách Hàng** | Toggle `is_on_behalf` | **Không tính vào P&L** | Công ty ứng trước, xuất Debit Note thu lại từ khách |

---

## 7. PHÂN HỆ 6: CỔNG MOBILE TÀI XẾ & CỔNG TRA CỨU KHÁCH HÀNG

### 7.1 Cổng Mobile Dành Cho Tài Xế (`/driver/<token>`)
- **Truy cập an toàn:** Không cần mật khẩu, mở trực tiếp bằng đường link riêng biệt bảo mật cao (Capability Token) nhận qua Zalo/SMS.
- **Thao tác 1 chạm:** Nút bấm to, rõ ràng, xác nhận chuyển mốc theo SOP (Lấy cont ➔ Đến kho ➔ Đóng hàng ➔ Rời kho ➔ Hạ bãi).
- **Chụp ảnh POD & EIR:** Tải ảnh biên bản giao nhận có chữ ký khách hàng và phiếu giao nhận vỏ cont lên máy chủ ngay tại hiện trường.
- **Kê khai chi phí:** Nhập số tiền chi phí nâng/hạ/vé cầu đường kèm ảnh chụp biên lai.
- **Bảo mật nội bộ:** Cổng tài xế tuyệt đối không hiển thị doanh thu bán khách hay tỷ suất lợi nhuận của công ty.

### 7.2 Cổng Tra Cứu Vận Đơn Công Khai (`/tracking/<token>`)
- Dành riêng cho khách hàng chủ hàng tra cứu tình trạng lô hàng theo thời gian thực.
- Hiển thị vị trí mốc thời gian, số xe kéo, số cont, số chì và ảnh chụp biên bản bàn giao POD khi hoàn tất.

---

## 8. PHÂN HỆ 7: QUẢN LÝ ĐỘI XE, RƠ-MOÓC & BÃI ĐỖ (FLEET MANAGEMENT)

### 8.1 Quản lý Đầu kéo (Vehicle)
- **Biển số xe:** Chuẩn định dạng giao thông Việt Nam (Ví dụ: `51C-123.45`).
- **Hình thức sở hữu:** `OWNED` (Xe nhà thuộc sở hữu Triền Võ) hoặc `SUBCONTRACTOR` (Xe liên kết / xe bạn).
- **Theo dõi hạn kiểm định:** Hệ thống tự động quét và gắn badge cảnh báo màu đỏ khi hạn đăng kiểm hoặc bảo dưỡng còn $\le 15$ ngày.
- **Tải trọng cho phép:** Giới hạn tải trọng kéo theo thiết kế phục vụ thuật toán cảnh báo quá tải.

### 8.2 Quản lý Rơ-Moóc (Trailer)
- **Loại moóc:** Moóc xương 40ft (2 trục/3 trục), Moóc cổ cò 40ft (chở cont lạnh), Moóc 20ft, Moóc lùn/sàn phẳng.
- **Biển số rơ-moóc:** Quản lý riêng biệt với đầu kéo để phục vụ thao tác cắt kéo cơ động.

---

## 9. PHÂN HỆ 8: HÀNH CHÍNH, NHÂN SỰ & LƯƠNG CHUYẾN (HR & PAYROLL)

### 9.1 Hồ sơ Nhân sự (Employee)
- **Phòng ban:** Điều Vận, Đội Xe & Bãi, Kinh Doanh, Hải Quan, Kế Toán, Ban Giám Đốc.
- **Thông tin tài xế:** Số bằng lái (GPLX hạng FC), ngày hết hạn GPLX, số điện thoại, định mức lương cơ bản.
- **Tài khoản đăng nhập:** Liên kết user Django với phân quyền truy cập tương ứng.

### 9.2 Bảng Lương Chuyến Tự Động (Trip-Based Payroll)
- Tính toán lương tài xế theo sản lượng chuyến thực tế hoàn thành trong tháng.
- Tự động cộng phụ cấp chặng xa (Cái Mép, Hiệp Phước), phụ cấp hạ bãi sau 0h và trừ tiền tạm ứng tháng.

---

## 10. PHÂN HỆ 9: KẾ TOÁN VẬN TẢI, TẠM ỨNG & SỔ QUỸ THU-CHI (CASH FLOW & ADVANCE FUNDS)

### 10.1 Quỹ Tạm Ứng Điều Vận Cấp 1 (`DispatcherAdvanceFund`)
- Kế toán cấp quỹ hạn mức (Ví dụ: 20.000.000 VNĐ) cho Điều phối viên để chủ động chi tiền dọc đường cho tài xế.
- Mã phiếu: `TUDV-YYYY-XXX`. Trạng thái: *Chờ duyệt ➔ Đang lưu hành ➔ Quyết toán hoàn ứng*.

### 10.2 Tạm Ứng Chuyến Xe Cấp 2 (`DriverTripAdvance`)
- Điều vận trích quỹ cấp cho từng tài xế trước khi lăn bánh.
- Khi xe về, đối chiếu: `Số tiền tạm ứng - Số tiền thực chi = Tiền thừa nộp lại (Phiếu thu) / Tiền thiếu chi bù (Phiếu chi)`.

### 10.3 Sổ Quỹ Thu-Chi (Mẫu S03a-DN)
- **Phiếu Thu (`PT-YYYY-XXX`):** Thu tiền cước khách hàng, thu hoàn ứng tài xế, thu hồi tiền chi hộ.
- **Phiếu Chi (`PC-YYYY-XXX`):** Cấp quỹ điều vận, chi thanh toán cước xe bạn, chi nhiên liệu xăng dầu, nạp thẻ ETC.
- Hỗ trợ in ấn mẫu phiếu thu/chi khổ A4/A5 chuẩn Bộ Tài Chính.

---

## 11. PHÂN HỆ 10: QUYẾT TOÁN GOM CHUYẾN & XE BẠN 3PL (TRIP SETTLEMENTS)

### 11.1 Quyết Toán Gom Chuyến Xe (Batch Settlement)
- Cho phép Kế toán lọc và chốt sổ đồng loạt nhiều chuyến xe đã hoàn thành và thu đủ chứng từ POD.
- Khóa toàn bộ dữ liệu chi phí và doanh thu để phục vụ lập hóa đơn VAT cước vận tải cho khách hàng.

### 11.2 Quyết Toán Cước Xe Bạn / Thầu Phụ (Subcontractor Settle)
- Quản lý cước thỏa thuận trả đối tác xe bạn, số tiền đã ứng trước dọc đường và số dư công nợ còn lại.
- Tự động sinh Ủy nhiệm chi (UNC) và phiếu chi sổ quỹ khi hoàn tất thanh toán.

---

## 12. PHÂN HỆ 11: DỊCH VỤ HẢI QUAN ĐIỆN TỬ (CUSTOMS DECLARATION)

### 12.1 Theo Dõi Tờ Khai Hải Quan
- **Số tờ khai:** Dãy 12 chữ số theo hệ thống VNACCS/VCIS của Tổng cục Hải quan.
- **Phân luồng hải quan:** 
  * 🟢 **Luồng Xanh:** Miễn kiểm tra hồ sơ và hàng hóa, thông quan điện tử ngay.
  * 🟡 **Luồng Vàng:** Chi cục Hải quan kiểm tra hồ sơ giấy/điện tử.
  * 🔴 **Luồng Đỏ:** Kiểm tra thực tế hàng hóa tại cảng (kiểm hóa/soi chiếu).
- **Liên kết điều vận:** Gắn tờ khai vào chuyến xe vận tải để tài xế xuất trình cho cán bộ giám sát cổng cảng.

---

## 13. PHÂN HỆ 12: HỆ THỐNG 14 BÁO CÁO THÔNG MINH BI & GIÁM SÁT CHI PHÍ

1. **Báo cáo 1:** Hiệu suất Đội xe & P&L từng đầu xe (Vehicle Profit Center).
2. **Báo cáo 2:** Quản lý Vỏ Container & Cảnh báo hạn phạt Free-time DEM/DET hãng tàu.
3. **Báo cáo 3:** Đánh giá chất lượng dịch vụ & Tỷ lệ giao hàng đúng hẹn (On-Time Performance - OTP).
4. **Báo cáo 4:** Tổng hợp chi phí tuyến đường & Bảng kê đối soát hoàn tiền Chi hộ khách hàng.
5. **Báo cáo 5:** Theo dõi tác nghiệp Cắt kéo & Lưu xe qua đêm sau 0h (Layover Fee).
6. **Báo cáo 6:** Báo cáo biên bản ngoại lệ & Xử lý sự cố hàng hóa/hư hỏng container (OS&D).
7. **Báo cáo 7:** Báo cáo cơ cấu Doanh thu & Sản lượng TEU theo từng Khách hàng.
8. **Báo cáo 8:** Đối soát công nợ & Quyết toán chi phí Nhà xe Thầu phụ / Xe bạn 3PL.
9. **Báo cáo 9:** Năng suất chuyến & Bảng lương tạm tính của Đội ngũ Tài xế.
10. **Báo cáo 10:** Sổ quỹ tạm ứng điều vận (Kế toán giám sát hạn mức cấp và hoàn ứng).
11. **Báo cáo 11:** Đối soát chi tiết tạm ứng & Chi phí phát sinh từng chuyến xe (Điều vận quản lý).
12. **Báo cáo 12:** Bảng kê quyết toán chuyến xe & Theo dõi backlog chuyến nợ đọng.
13. **Báo cáo 13:** Báo cáo phân tích Tuổi nợ công nợ phải thu khách hàng (AR Aging Analysis).
14. **Báo cáo 14:** Báo cáo tuổi đơn tồn đọng chưa quyết toán (Unsettled Trips Aging).

*Tất cả 14 bảng báo cáo đều trang bị: Cột STT đếm bản ghi cố định, tính năng sắp xếp đa cột (Multi-column sort), bộ lọc tìm kiếm tức thì, tùy biến ẩn/hiện cột (Column Customizer) và xuất in khổ A4 chuẩn mực.*

---

## 14. PHÂN HỆ 13: HỆ THỐNG DANH MỤC GỐC (MASTER DATA) & PHÂN QUYỀN (RBAC)

### 14.1 Các Danh Mục Cốt Lõi
- **Danh mục Địa điểm (Location):** Cảng biển, ICD, Kho hàng, Depot hạ rỗng, Bãi xe.
- **Danh mục Quy cách Container:** 20DC, 40HC, 45G1, kích thước, tải trọng, thể tích CBM.
- **Danh mục Hãng Tàu (Shipping Line):** Mã hãng tàu, số hotline, cổng tra cứu eDO, ngày free-time mặc định.
- **Danh mục Khoản mục Chi phí:** Nâng, Hạ, BOT, Cân xe, Bốc xếp, Cược cont.
- **Hồ sơ Pháp nhân Công ty (Company Profile):** MST, tài khoản ngân hàng, thông tin xuất hóa đơn.

### 14.2 Quản Lý Người Dùng & Phân Quyền (RBAC)
- Khởi tạo tài khoản nhân viên, gán vai trò phòng ban và phân quyền chức năng chi tiết.
- Quản lý nhật ký truy vết an toàn (Audit Trail) - Nghiêm cấm xóa cứng dữ liệu, chỉ sử dụng Soft-Delete (`is_deleted=True`) để bảo toàn chứng cứ pháp lý.

---

> [!TIP]
> **Hỗ trợ kỹ thuật & Vận hành:** Khi gặp sự cố hoặc cần hỗ trợ nghiệp vụ, vui lòng liên hệ Bộ phận Kỹ thuật BIM Logistics qua hotline `0965.559.561` hoặc truy cập trung tâm trợ giúp trực tuyến tại `https://logistics.bim.info.vn/helps`.
