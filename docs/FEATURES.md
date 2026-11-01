# FEATURES.md — BIM LOGISTICS PLATFORM
## Tài liệu Đặc tả Tính năng Đầy đủ (Living Document)

> **Phiên bản:** v4.7.18 | **Cập nhật lần cuối:** 2026-11-01
> **Trạng thái:** Production-Ready
> **Công ty:** Triền Võ Logistics (BIM Ecosystem)
> **Mục đích:** Tài liệu này ghi nhận **toàn bộ tính năng đã được lập trình và triển khai** trên nền tảng BIM Logistics, được cập nhật liên tục sau mỗi thay đổi. Dùng để tham khảo trước khi phát triển tính năng mới (tránh viết lại những gì đã có).

> [!IMPORTANT]
> **Quy ước cập nhật:** Bất kỳ khi nào thêm tính năng mới hoặc thay đổi tính năng cũ, bắt buộc cập nhật file này đồng thời với `docs/CHANGELOG.md`.

---

## MỤC LỤC

1. [Kiến trúc & Stack kỹ thuật](#1-kiến-trúc--stack-kỹ-thuật)
2. [Phân hệ 1: Dashboard Ban Giám Đốc](#2-phân-hệ-1-dashboard-ban-giám-đốc)
3. [Phân hệ 2: Kinh doanh & Báo giá (Sales & Quotation)](#3-phân-hệ-2-kinh-doanh--báo-giá)
4. [Phân hệ 3: Tiếp nhận Booking & Đơn hàng](#4-phân-hệ-3-tiếp-nhận-booking--đơn-hàng)
5. [Phân hệ 4: Điều vận & Phát lệnh (Dispatch)](#5-phân-hệ-4-điều-vận--phát-lệnh)
6. [Phân hệ 5: Chi tiết Chuyến xe & P&L](#6-phân-hệ-5-chi-tiết-chuyến-xe--pl)
7. [Phân hệ 6: Quản lý Chi phí & Kế toán](#7-phân-hệ-6-quản-lý-chi-phí--kế-toán)
8. [Phân hệ 7: Tạm ứng & Hoàn ứng](#8-phân-hệ-7-tạm-ứng--hoàn-ứng)
9. [Phân hệ 8: Báo cáo Tài chính Đa chiều](#9-phân-hệ-8-báo-cáo-tài-chính-đa-chiều)
10. [Phân hệ 9: Quản lý Đội xe & Rơ-moóc](#10-phân-hệ-9-quản-lý-đội-xe--rơ-moóc)
11. [Phân hệ 10: Nhân sự & Lương chuyến](#11-phân-hệ-10-nhân-sự--lương-chuyến)
12. [Phân hệ 11: Dịch vụ Hải quan](#12-phân-hệ-11-dịch-vụ-hải-quan)
13. [Phân hệ 12: Quản lý Danh mục Master Data](#13-phân-hệ-12-quản-lý-danh-mục-master-data)
14. [Tính năng Kỹ thuật nền tảng (Core)](#14-tính-năng-kỹ-thuật-nền-tảng-core)
15. [Bảo mật & Phân quyền](#15-bảo-mật--phân-quyền)
16. [Chi tiết UI — Bảng Điều vận (view_dispatch.html)](#16-chi-tiết-ui--bảng-điều-vận-view_dispatchhtml)
17. [Chi tiết UI — Phân hệ Kế toán (view_accounting.html)](#17-chi-tiết-ui--phân-hệ-kế-toán-view_accountinghtml)
18. [Chi tiết UI — Quyết toán Gom chuyến (view_settlement.html)](#18-chi-tiết-ui--quyết-toán-gom-chuyến-view_settlementhtml)
19. [Chi tiết UI — Hệ thống Báo cáo (view_reports.html)](#19-chi-tiết-ui--hệ-thống-báo-cáo-view_reportshtml)
20. [Phân hệ Sự cố Vận tải (OS&D — TripException)](#20-phân-hệ-sự-cố-vận-tải-osd--tripexception)
21. [Phân hệ Chứng từ Pháp lý (TripDocument)](#21-phân-hệ-chứng-từ-pháp-lý-tripdocument)
22. [Tổng hợp Models & Counts](#22-tổng-hợp-models--counts)
23. [Hướng dẫn Cập nhật Tài liệu này](#-hướng-dẫn-cập-nhật-tài-liệu-này)

---

## 1. Kiến trúc & Stack kỹ thuật

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| **Backend** | Django 4.x (Python) | Modular Monolith — tách biệt `core/` và `apps/` |
| **Database** | SQLite3 (dev) / PostgreSQL (prod) | Kế thừa `TimeStampedModel` + `SoftDeleteModel` |
| **REST API** | Django REST Framework | JWT Auth + Session Auth, Base URL `localhost:8085` |
| **Frontend** | Vanilla JS SPA (`app.js` ~1MB) | Không reload trang, 14 view, quản lý cột động |
| **Styling** | Tailwind CSS | Design Tokens BIM: Teal/Emerald/Amber/Rose |
| **Charts** | Chart.js | Revenue/expense bar chart, trend lines |
| **Auth** | `simplejwt` + Django Sessions | JWT (4h access, 7d refresh) + Token Blacklist |
| **Media** | File upload cục bộ | `booking_files/`, `receipts/`, `documents/`, `incidents/` |

### Cấu trúc Apps
```
apps/
├── dispatch/       → Điều vận, Lệnh xe, State Machine
├── billing/        → Chi phí, Tạm ứng, Sổ quỹ
├── customers/      → Khách hàng, Biểu cước, Báo giá, Booking
├── fleet/          → Đội xe, Rơ-moóc
├── personnel/      → Nhân sự, Tài xế
├── master_data/    → Danh mục: Địa điểm, Loại cont, Chi phí, Hãng tàu...
├── documents/      → Chứng từ đính kèm (EIR, POD, BOL)
├── exceptions/     → Sự cố vận tải (OS&D)
└── customs/        → Dịch vụ Hải quan
```

---

## 2. Phân hệ 1: Dashboard Đa Vai Trò Tùy Biến (Role-Based Dashboard)

**View:** `view_dashboard.html` | **API:** `GET /api/dashboard/?period=...&view_as=...` | **Quyền:** `IsAuthenticated`

Hệ thống Dashboard thông minh được thiết kế theo chuẩn quản trị quốc tế, tự động tùy biến và thích ứng nội dung hiển thị dựa trên vai trò, bộ phận và thẩm quyền của người đăng nhập.

### 2.1 Thanh Tiêu Đề Điều Hành & Executive Role Switcher
- **Lời chào cá nhân hóa:** Tự động nhận diện tên nhân sự, chức danh và huy hiệu màu đặc trưng của từng phòng ban.
- **Bộ chuyển đổi góc nhìn (Executive Role Switcher):** Dành riêng cho Ban Giám Đốc và Superuser: Dropdown trực tiếp trên thanh Header cho phép Giám đốc chuyển đổi và quan sát hệ thống qua góc nhìn chuyên môn của bất kỳ phòng ban nào (`Ban Giám Đốc`, `Kế Toán`, `Điều Vận`, `Kinh Doanh`, `Đội Xe`, `Nhân Sự`). Với chuyên viên thông thường, dropdown tự động ẩn và cố định đúng vai trò nghiệp vụ.

### 2.2 Bộ Thẻ Số Liệu KPI Động Theo Vai Trò (4 Cards / Role)
1. **Ban Giám Đốc (`DIRECTOR`):**
   * *1. Tài Chính & Quỹ:* Lợi nhuận gộp tạm tính, Doanh thu, Chi phí vận hành, Quỹ tiền mặt & Ngân hàng.
   * *2. Vận Hành Chuyến:* Chuyến đang vận hành, Tổng chuyến kỳ, Đã hoàn tất, Tỷ lệ đúng giờ OTD%.
   * *3. Khả Dụng Đội Xe:* Tỷ lệ khai thác xe (Utilization %), Số xe bãi chờ lệnh, Xe bảo trì, Quân số tài xế.
   * *4. Đơn Hàng & Hải Quan:* Tờ khai hải quan luồng xanh, Đơn hàng chờ gán xe, Cảnh báo DEM/DET.
2. **Kế Toán Tài Chính (`ACCOUNTING`):**
   * *1. Quỹ Khả Dụng:* Tổng quỹ tiền mặt + ngân hàng (1.4 Tỷ), kế hoạch chi quỹ tuần.
   * *2. Tạm Ứng Lái Xe:* Tổng tiền tài xế đang giữ ứng chưa quyết toán (`DriverTripAdvance`), số tài xế giữ ứng.
   * *3. Chuyến Chưa Quyết Toán:* Số chuyến cần kiểm toán hóa đơn dầu, vé BOT và chi phí phát sinh.
   * *4. Chi Phí Vận Hành:* Tổng chi phí kỳ này, Operating Ratio % và doanh thu phát sinh tương ứng.
3. **Điều Vận & Điều Độ (`DISPATCH`):**
   * *1. Chuyến Đang Vận Hành:* Số lượng chuyến xe FTL đang lăn bánh trên đường, giám sát hành trình.
   * *2. Đơn Chờ Gán Xe:* Số đơn hàng Booking mới cần phân bổ tài xế và đầu kéo container.
   * *3. Tỷ Lệ Giao Đúng Hạn (OTD):* Chỉ số SLA giao hàng đúng hẹn (≥ 98.0%), số chuyến trễ hẹn.
   * *4. Sự Cố & Cảnh Báo:* Số vụ việc bất thường (OS&D), tai nạn, hỏng hóc hoặc lưu ca đêm (Detention).
4. **Phòng Kinh Doanh (`SALES`):**
   * *1. Đơn Hàng Booking:* Tổng lượng đơn vận chuyển tiếp nhận, tiến độ thực hiện chỉ tiêu tháng.
   * *2. Báo Giá Chờ Duyệt:* Số lượng hồ sơ báo giá đang đàm phán với khách hàng B2B.
   * *3. Doanh Số Bán Hàng:* Doanh thu tạm tính trong kỳ, biên lợi nhuận gộp.
   * *4. Khách Hàng Hoạt Động:* Số lượng đối tác B2B phát sinh đơn hàng, tờ khai thông quan.
5. **Đội Xe & Quản Lý Bãi (`FLEET`):**
   * *1. Khả Dụng Đầu Kéo:* Tỷ lệ xe lăn bánh (Utilization rate), tài xế phụ trách.
   * *2. Xe Sẵn Sàng Tại Bãi:* Số lượng đầu kéo nằm bãi đã kiểm tra an toàn kỹ thuật, đầy bình nhiên liệu.
   * *3. Bảo Dưỡng / Sửa Chữa:* Số xe đang nằm xưởng bảo dưỡng lốp, thay nhớt, kiểm tra động cơ.
   * *4. Hạn Kiểm Định & Bảo Hiểm:* Số phương tiện sắp hết hạn đăng kiểm trong vòng 30 ngày cần đưa đi xét xe.
6. **Hành Chính Nhân Sự (`HR`):**
   * *1. Quân Số Nhân Sự:* Tổng định biên nhân sự toàn công ty, tách biệt khối Văn phòng vs. Đội Tài xế.
   * *2. Tài Xế Đang Vận Hành:* Số lượng tài xế đang ôm vô-lăng, số tài xế nghỉ phép / chờ lệnh.
   * *3. Hợp Đồng Lao Động:* Tình trạng tuân thủ pháp lý HĐLĐ, trích nộp BHXH/BHYT.
   * *4. Hạn Giấy Phép Lái Xe:* Số lượng bằng lái hạng C/FC của tài xế sắp hết hạn trong 30 ngày cần gia hạn.

### 2.3 Hai Widget Tương Tác Cốt Lõi Trên Dashboard & Thanh Kéo Tỷ Lệ (Widget Resizer)
Bố cục Hàng 3 được tối ưu hóa theo tần suất tác nghiệp hiện trường với thanh kéo tùy chỉnh kích thước và đồng bộ chiều cao tuyệt đối (độ chênh lệch 0.00px):
- **Widget 1 (Bên Trái) — Quản Lý Công Việc Cần Xử Lý (My Actionable Tasks - Chiếm 62% Mặc Định):**
  * Đặt tại vị trí ưu tiên bên trái do là phân hệ tác nghiệp hàng ngày với tần suất thao tác cao của nhân viên và cấp quản lý.
  * Hỗ trợ chuyển đổi nhanh giữa 2 chế độ hiển thị:
    - **Chế độ Danh sách (List View):** Hiển thị danh sách task gọn gàng kèm checkbox hoàn thành, hạn xử lý và ưu tiên. Hiển thị rõ ràng icon + tên: **Người giao** (`reporter`), **Người phụ trách** (`assignee`), **Người theo dõi** (`followers` - nếu có).
    - **Chế độ Kanban Mini (Kanban View):** Chia 3 cột chuẩn workflow: **Cần làm (`TODO`)**, **Đang làm (`IN_PROGRESS`)**, **Nghiệm thu (`REVIEW`)**. Mỗi thẻ card hiển thị tiêu đề, mức độ ưu tiên, ngày hết hạn và avatar/tên phân công 3 vai trò.
  * Tự động lưu chế độ xem đã chọn vào `localStorage` (`bim_dashboard_task_view_mode`).
  * Click vào task mở trực tiếp Slide-over Drawer để cập nhật tiến độ, đánh dấu checklist hoặc trao đổi.
- **Thanh Kéo Phân Tách Resizer Ngăn Giữa (`#dash-widget-resizer`):**
  * Nằm giữa 2 ô widget với vạch chia dọc thanh thoát, đổi màu tím Indigo khi hover/kéo.
  * Hỗ trợ kéo chuột trái/phải để co giãn linh hoạt tỷ lệ độ rộng giữa Công việc và Bản tin (từ 25% đến 75%), lưu trạng thái vào `localStorage` (`bim_widget_split_ratio`).
- **Truy cập tập trung từ Dashboard & Gỡ bỏ khỏi Sidebar:**
  * Hai phân hệ Bản tin Công ty và Giao việc Văn phòng đã được gỡ khỏi danh mục Sidebar để tinh gọn tối đa thanh điều hướng.
  * Người dùng truy cập toàn trang khi cần thông qua nút `[Bảng việc]` trên Widget Task và `[Xem tất cả]` trên Widget Bản tin.
  * Mỗi phân hệ đều trang bị nút `[← Tổng quan]` trên thanh tiêu đề để quay lại Dashboard ngay lập tức.

### 2.4 Hệ Thống Biểu Đồ Trực Quan Đa Chiều Theo Vai Trò
Hệ thống tự động tùy biến cặp biểu đồ (Chart 1 - Xu hướng chuỗi thời gian & Chart 2 - Cơ cấu Donut) theo đúng góc nhìn chuyên môn của 6 vai trò:
1. **Ban Giám Đốc (`DIRECTOR`):**
   * *Xu hướng:* Doanh Thu Cước (Cột Teal), Chi Phí Vận Hành (Cột Amber), Lợi Nhuận Gộp (Đường Emerald).
   * *Tóm tắt:* Doanh Thu TB/Ngày, Chi Phí TB/Ngày, Biên Lợi Nhuận TB (%).
   * *Donut:* Cơ Cấu Vận Hành (Toggle: **Đội Xe** [Khai thác, Chờ bãi, Bảo trì] vs **Hải Quan** [Xanh, Vàng, Đỏ]).
2. **Kế Toán Tài Chính (`ACCOUNTING`):**
   * *Xu hướng:* Chi Phí Vận Hành (Cột Amber), Tạm Ứng Giải Ngân (Cột Blue), Lợi Nhuận Gộp (Đường Emerald).
   * *Tóm tắt:* Chi Phí TB/Ngày, Tạm Ứng TX Bình Quân, Tỷ Lệ Quyết Toán Cước (%).
   * *Donut:* Cơ Cấu Chi Phí & Hồ Sơ Quyết Toán (Toggle: **Khoản Mục Chi** [Dầu DO 55%, Cầu đường BOT 25%, Nâng hạ cảng 12%, Khác 8%] vs **Quyết Toán** [Đã chốt, Chờ duyệt chứng từ, Chưa nộp]).
3. **Điều Vận & Điều Độ (`DISPATCH`):**
   * *Xu hướng:* Lệnh Điều Xe (Cột Teal), Chuyến Hoàn Tất (Cột Emerald), Tỷ Lệ Giao Đúng Giờ (Đường OTD% Amber).
   * *Tóm tắt:* Tổng Lệnh Điều Vận, Chuyến Hoàn Tất, SLA Đúng Hạn (OTD%).
   * *Donut:* Tiến Độ Lộ Trình & Sự Cố (Toggle: **Chặng Chuyến** [Đang lăn bánh, Lấy/Trả rỗng, Đang đóng kho] vs **Sự Cố OS&D** [An toàn, Cảnh báo trễ cảng, Hư hỏng/thiếu hàng]).
4. **Phòng Kinh Doanh (`SALES`):**
   * *Xu hướng:* Doanh Số Booking (Cột Blue), Sản Lượng TEU/Cont (Cột Indigo), Tỷ Lệ Chốt Báo Giá (Đường Win Rate% Teal).
   * *Tóm tắt:* Đơn Booking Mới, Doanh Số Bán Hàng, Tỷ Lệ Chốt Báo Giá (%).
   * *Donut:* Cơ Cấu Khách Hàng & Loại Vỏ Container (Toggle: **Loại Cont** [Cont 40HC, Cont 20DC, Cont Lạnh] vs **Ngành Hàng** [FMCG, Nông sản, Điện tử]).
5. **Đội Xe & Quản Lý Bãi (`FLEET`):**
   * *Xu hướng:* Xe Hoạt Động Active (Cột Emerald), Xe Nằm Bãi Idle (Cột Teal), Tỷ Lệ Khai Thác (Đường Utilization% Indigo).
   * *Tóm tắt:* Tổng Đội Xe Đầu Kéo, Sẵn Sàng Nhận Lệnh, Hiệu Suất Khai Thác (%).
   * *Donut:* Hiện Trạng Kỹ Thuật & Đăng Kiểm Đội Xe (Toggle: **Kỹ Thuật** [Đủ điều kiện, Cần bảo dưỡng nhẹ, Sửa chữa xưởng] vs **Đăng Kiểm** [Còn hạn, Sắp hết hạn <30 ngày, Quá hạn]).
6. **Hành Chính Nhân Sự (`HR`):**
   * *Xu hướng:* Tài Xế Lăn Bánh (Cột Teal), Tài Xế Nghỉ Phép/Chờ (Cột Amber), Tỷ Lệ Sẵn Sàng (Đường Emerald).
   * *Tóm tắt:* Tổng Đội Ngũ Tài Xế, Đang Ôm Vô-lăng, Tỷ Lệ Sẵn Sàng (%).
   * *Donut:* Cơ Cấu Định Biên & Giấy Phép Lái Xe (Toggle: **Định Biên** [Tài xế, Điều vận/Hiện trường, Khối Văn phòng] vs **GPLX FC/C** [Còn hạn, Cần đổi bằng 30 ngày, Khám sức khỏe]).

- **Tối ưu không gian:** Nút thu gọn / mở rộng biểu đồ cho phép phóng to tối đa 100% màn hình cho 2 Widget Bản Tin & Công Việc khi cần tập trung tác nghiệp.

### 2.5 Công Cụ Tùy Biến Biểu Đồ Báo Cáo & Thanh Kéo Tỷ Lệ Kích Thước
**API:** `GET /api/dashboard/pivot/?entity=...&group_by=...&metric=...&agg=...&chart_type=...&period=...&limit=...&sort=...` | **Quyền:** `IsAuthenticated`

Cho phép người dùng tự do phân tích dữ liệu đa chiều theo nhu cầu nghiệp vụ cho **cả 2 ô biểu đồ (Biểu đồ 1 & Biểu đồ 2)**:
- **Chuẩn hóa ngôn ngữ thuần Việt:** Loại bỏ hoàn toàn các từ viết tắt tự xưng "BI", tập trung vào bản chất dữ liệu logistics chuyên nghiệp, dễ hiểu.
- **Tùy biến độc lập cho cả 2 ô:**
  * Biểu đồ 1 bên trái (`openChartCustomizer(1)`): Cột đứng/ngang, đường xu hướng hoặc vòng Donut theo Doanh thu, Khách hàng, Chuyến xe...
  * Biểu đồ 2 bên phải (`openChartCustomizer(2)`): Tùy biến tương tự Biểu đồ 1 theo Chi phí, Khoản mục chi, Đơn hàng, Trạng thái xe...
  * Nút `[Mặc định]` độc lập cho từng ô: Khôi phục một ô về biểu đồ vai trò mặc định mà không làm mất cấu hình tùy biến của ô còn lại.
- **Mở rộng 8 nguồn bảng dữ liệu nghiệp vụ:**
  1. `trips`: Chuyến xe & Vận chuyển (Doanh thu, Chi phí, Lợi nhuận gộp, Số chuyến xe).
  2. `expenses`: Chi phí vận hành & Hiện trường (Tổng chi phí, Số lượng khoản chi).
  3. `bookings`: Đơn hàng & Đặt chỗ (Số lượng booking, Tổng số container).
  4. `vehicles`: Đội xe & Phương tiện (Số lượng phương tiện theo trạng thái, loại xe).
  5. `quotations`: Báo giá & Khách hàng (Đơn giá cước TB, Sản lượng cam kết, Số lượng báo giá).
  6. `advances`: Tạm ứng & Hoàn ứng Lái xe (Tổng số tiền ứng, Số phiếu ứng theo tài xế, nguồn tiền).
  7. `exceptions`: Sự cố & Khiếu nại vận tải (Số lượng sự cố theo loại sự cố, mức độ nghiêm trọng, tình trạng xử lý).
  8. `personnel`: Nhân sự & Đội ngũ (Tổng số nhân sự, Lương cơ bản TB theo phòng ban, chức danh, trạng thái).
- **Tự chọn trục phân nhóm:** Khách hàng, Tài xế, Biển số xe, Tuyến đường, Loại Container, Loại hàng, Trạng thái chuyến, Khoản mục chi phí, Hãng tàu, Phòng ban, Mức độ sự cố...
- **Tự chọn chỉ số & phép tính:** Doanh thu, Chi phí, Lợi nhuận gộp, Số chuyến xe, Số lượng đơn hàng, Số lượng xe. Phép tính: Tổng cộng (`SUM`), Trung bình (`AVG`), Đếm số lượng (`COUNT`).
- **Tự chọn loại biểu đồ:** Cột đứng (`bar`), Cột ngang (`horizontal_bar`), Đường xu hướng (`line`), Vòng tròn Donut (`doughnut`), Biểu đồ tròn (`pie`).
- **Thanh kéo phân tách (Splitter / Resizer) & Đồng bộ chiều cao:**
  * Thanh kéo chuột `#dash-chart-resizer` đặt ở giữa 2 ô biểu đồ, cho phép tùy chỉnh độ rộng linh hoạt từ 20% đến 80%.
  * Tự động lưu tỷ lệ kéo vào `localStorage` (`bim_chart_split_ratio`) và tự động gọi `Chart.resize()` để giữ nguyên độ sắc nét.
  * Hai ô biểu đồ luôn đảm bảo **cùng chiều cao 100% (chênh lệch 0px)** nhờ cấu trúc CSS Flexbox `items-stretch`.

*(Lưu ý: Bảng phân tích chi tiết hiệu suất & P&L từng chuyến xe đã được tinh giản khỏi trang Dashboard tổng quan để nhường không gian cho 2 Widget tương tác trên; toàn bộ số liệu P&L chi tiết được quy tụ đầy đủ tại Phân hệ 6: Quản lý Chi phí & Kế toán và Phân hệ 8: Báo cáo Tài chính Đa chiều).*

*(Lưu ý: Bảng phân tích chi tiết hiệu suất & P&L từng chuyến xe đã được tinh giản khỏi trang Dashboard tổng quan để nhường không gian cho 2 Widget tương tác trên; toàn bộ số liệu P&L chi tiết được quy tụ đầy đủ tại Phân hệ 6: Quản lý Chi phí & Kế toán và Phân hệ 8: Báo cáo Tài chính Đa chiều).*

---

## 3. Phân hệ 2: Kinh doanh & Báo giá

**View:** `view_sales.html`, `view_quotation_detail.html` | **API:** `GET/POST /api/sales/`, `POST /api/sales/quotations/`

### 3.1 Quản lý Báo giá (Quotation)
- **Tạo Báo giá mới:** Mã báo giá tự động (`BG-MMDD-XX`), chọn Khách hàng, nhập tuyến đường đa điểm, đơn giá cước, sản lượng tháng dự kiến
- **Báo giá đa tuyến (QuotationItem):** 1 báo giá chứa nhiều dòng tuyến đường với giá cước riêng biệt
- **3 Phương thức định giá:**
  - `MULTI_ROUTE` — Báo giá theo ma trận tuyến đường
  - `FUEL_ADJUSTED` — Điều chỉnh theo biến động giá dầu DO (công thức phụ phí xăng dầu tự động)
  - `FLAT_CHARTER` — Trọn gói / Bao chuyến / Theo tháng
- **Trạng thái báo giá:** `Đang thương lượng` → `Chờ BGĐ duyệt` → `Đã duyệt` / `Từ chối` / `Hết hiệu lực`
- **3 Mẫu in báo giá (Print Template):**
  - Mẫu 1: Tiêu chuẩn Doanh nghiệp (Quốc hiệu & Điều khoản TVL)
  - Mẫu 2: Bảng cước & Khung đối tác (To/From Matrix)
  - Mẫu 3: Chi tiết Dịch vụ & Lộ trình Dự án
- **Hiệu lực báo giá:** Quản lý ngày hết hiệu lực, thông tin người phụ trách và liên hệ

### 3.2 Quản lý Biểu cước Tuyến (RouteTariff)
- Biểu cước theo từng tuyến của từng khách hàng: Nơi lấy → Kho giao → Nơi hạ
- Lưu: Đơn giá cước, Định mức lương tài xế, Định mức vé BOT chuẩn tuyến
- Phân vùng khu vực: `origin_zone` / `destination_zone` (Bình Dương, Đồng Nai, Tây Ninh...)
- Tính km tự động làm tròn bước 10km

### 3.3 Quản lý Khách hàng (Customer)
- CRUD: Mã KH, Tên, MST, Địa chỉ, Đầu mối liên hệ, SĐT
- Liên kết: Biểu cước tuyến, Booking, Chuyến xe

---

## 4. Phân hệ 3: Tiếp nhận Booking & Đơn hàng

**View:** `view_sales.html`, `view_booking_detail.html` | **API:** `POST /api/sales/`, `GET /api/bookings/active/`

### 4.1 Tạo Booking Order
- **Mã booking tự động:** `BK-YYYY-MMDD-XX`
- **3 loại dịch vụ:** Kéo Cont Xuất FCL | Kéo Cont Nhập FCL | Vận chuyển Nội địa FTL
- **Thông tin vận đơn hãng tàu:** Số Booking, Hãng tàu, Tàu/Chuyến, Cảng đích
- **Lộ trình 3 điểm:** Nơi cấp rỗng → Kho đóng/dỡ → Nơi hạ bãi
- **Hàng hóa:** Tên loại hàng, HS Code, Quy cách cont (40HC/20GP/45G1...)
- **3 Mốc cut-off hãng tàu:** SI Cutoff | VGM Cutoff | CY Closing Time
- **Theo dõi tiến độ phát lệnh:** Tổng cont cần điều / Số cont đã phát lệnh / Còn lại
- **Trạng thái:** `Chờ điều xe` → `Đang điều xe` → `Đã điều đủ xe` / `Hủy`
- **Đính kèm đa file:** Upload nhiều file booking (ảnh/PDF) vào `BookingDocument`

### 4.2 Booking chờ điều xe (Active Bookings)
- API riêng `GET /api/bookings/active/` để điều vận xem nhanh các booking cần phát lệnh
- Hiển thị: Số cont còn lại, ngày đóng hàng, tuyến đường

---

## 5. Phân hệ 4: Điều vận & Phát lệnh

**View:** `view_dispatch.html`, `view_create_trip.html` | **API:** `GET/POST /api/trips/`

### 5.1 Tạo Lệnh điều động (DispatchTrip)
- **Mã chuyến tự động:** `TVL-MMDD-XXX` (hoặc `DV.YYMM.XXX`)
- **Kế thừa từ Booking:** Tự động điền thông tin tuyến đường, container type, cutoff từ BookingOrder
- **3 loại hàng:** Hàng Nhập | Hàng Xuất | Nội địa
- **Tách Biệt 2 Trường Độc Lập — Tài Xế & "Đầu kéo/ Xe tải":**
  * Không gán cố định 1-1, cho phép 1 tài xế lái nhiều xe (khi xe bảo dưỡng) và nhiều tài xế thay phiên lái 1 xe (ca ngày/đêm).
  * **Chế độ Xe Nhà (TVL):**
    - Ô 1: `Tài xế nhận lệnh (Toàn trình) *` — Chỉ load tài xế nội bộ TVL (`Employee` có `role=DRIVER`).
    - Ô 2: `Đầu kéo/ Xe tải TVL *` — Chỉ load xe nội bộ TVL (`ownership_type=OWNED`). Dropdown hiển thị kèm loại xe: `51C-123.45 (Đầu kéo Container)`, `50E-112.34 (Xe tải 10 Tấn)`...
    - Cơ chế gợi ý thông minh 2 chiều: chọn tài gợi ý xe, chọn xe gợi ý tài (không ép buộc).
  * **Chế độ Xe Bạn / 3PL:**
    - Ô 1: `Nhà Xe / Đối Tác 3PL *` — Chỉ lọc đối tác `CARRIER`.
    - Ô 2: `Đầu kéo/ Xe tải 3PL *` — Chỉ load xe thuộc đúng Nhà xe 3PL đó (`subcontractor == sub`).
    - Ô 3: `Bác Tài 3PL *` — Chỉ load tài xế thuộc đúng Nhà xe 3PL đó (`subcontractor == sub`).
  * **Chế độ Cắt Kéo (Drop & Hook):**
    - Chặng 1: `Tài xế Lấy Cont *` + `Đầu kéo/ Xe tải Lấy Cont *` (chỉ load nội bộ TVL).
    - Chặng 2: `Tài xế Hạ Cont *` + `Đầu kéo/ Xe tải Hạ Cont *` (chỉ load nội bộ TVL).
- **Thông tin Container:** Số cont, Số seal, Số B/L hoặc Booking, Hãng tàu, Tàu/Chuyến, Cảng đích, VGM, Bay Location
- **Thông tin hiện trường:** Số phiếu EIR, Số Invoice, Cửa Dock bốc hàng, Ghi chú
- **Lịch kho:** Ngày hẹn đóng, Giờ hẹn, ETA kho, 5 mốc thời gian thực tế
- **Upload file Booking:** Ảnh/PDF ≤ 5MB, tự động tạo `TripDocument` loại `BOOKING_NOTE`
- **Tình trạng vỏ Cont (EIR Condition):** `Nguyên vẹn` | `Có hư hỏng (lập biên bản)` | `Bẩn/Cần vệ sinh`

### 5.2 Nghiệp vụ Cắt Kéo (Drop & Hook — 2 Chặng)
- **`is_split_trip = True`:** Tách biệt tài xế/xe chặng lấy cont và chặng hạ bãi
- Phân công riêng: Tài xế hạ cont (Chặng 2), Xe hạ, Rơ-moóc hạ
- Tỷ lệ chia lương chuyến tự động theo `driver_split_ratio`

### 5.3 Nghiệp vụ Chở Ghép 2 Cont 20ft (Twin 20ft Drayage)
- **`is_twin_container = True`:** Chở 2 container 20ft trên cùng 1 đầu kéo
- Lưu riêng: Số cont 2, Số seal 2, Số B/L 2, VGM 2, Ghi chú hàng 2

### 5.4 Quản lý Hạn Free-time DEM/DET
- Khai báo: Số ngày DEM miễn phí, Số ngày DET miễn phí
- Lưu ngày hết hạn (`det_expiry_date`, `dem_expiry_date`) — indexed để cảnh báo trước deadline

### 5.5 State Machine 11 Bước Điều vận

```
DRAFT → DISPATCHED → ACCEPTED → CONTAINER_PICKED → IN_TRANSIT
     → AT_WAREHOUSE → UNLOADING → DELIVERED → RETURNING_EMPTY
     → COMPLETED → (CANCELLED)
```

- Mỗi chuyển trạng thái ghi timestamp tự động (`dispatched_at`, `accepted_at`...)
- API chuyển trạng thái: `POST /api/trips/{trip_code}/transition/`
- Chặn nhảy cóc trạng thái sai thứ tự qua `TripWorkflowTransitionAPIView`

### 5.6 Driver Portal (Token-based)
- Tự động sinh `driver_token` (URL-safe, 16 bytes) cho mỗi chuyến
- Thu hồi token cũ khi đổi tài xế (`revoked_driver_tokens`)
- Tài xế truy cập qua link token duy nhất (không cần đăng nhập)

### 5.7 Bộ lọc & Tìm kiếm Danh sách chuyến
- Tìm theo: Mã chuyến, Số cont, Tên khách, Biển số xe, Tài xế
- Lọc theo: Trạng thái, Loại hàng (Nhập/Xuất/Nội địa), Ngày tạo
- Phân trang kết quả

### 5.8 Tiêu chí KPI Điều vận (trong response danh sách)
- Tổng chuyến trong tháng, đang chạy, hoàn thành hôm nay
- OTD Rate (%), doanh thu tháng, chi phí vận hành

---

## 6. Phân hệ 5: Chi tiết Chuyến xe & P&L

**View:** `view_trip_detail.html` | **API:** `GET /api/trips/{trip_code}/`

### 6.1 Thông tin tổng hợp đầu trang
- Mã chuyến, Khách hàng, Loại hàng, Trạng thái (badge màu)
- Lộ trình 3 điểm: Nơi lấy → Kho → Nơi hạ
- Phân công: Tài xế, Xe, Rơ-moóc, Điều độ viên
- Số container, Seal, Booking/B/L, Hãng tàu, Tàu/Chuyến

### 6.2 Timeline 11 Bước (`TripTimelineItem`)
- Hiển thị trực quan 11 mốc vận hành theo chiều dọc
- Mỗi bước: Trạng thái (Done ✅ / Active 🔵 / Pending ⬜), Tiêu đề, Thời gian thực tế
- Tự động cập nhật khi chuyển trạng thái

### 6.3 5 Mốc Thời gian tại Kho Khách hàng
| Mốc | Nội dung |
|---|---|
| Ngày & Giờ hẹn đóng | Lịch khách hàng yêu cầu |
| ETA Kho | Giờ xe dự kiến đến |
| Kho gọi xe vào | Giờ bảo vệ/kho kêu xe vào cổng |
| Xe vào cổng (thực tế) | `actual_gate_in_time` |
| Kho gọi kéo ra / Xe ra cổng | `actual_gate_out_time` |

### 6.4 Bảng Kê Chi phí 8 Mục & Cụm 3 Nút Phân Loại Trách Nhiệm (TripExpense Table)
| Danh mục | Mã |
|---|---|
| Nâng cont | LIFT_ON |
| Hạ cont | LIFT_OFF |
| Cược cont | CONTAINER_DEPOSIT |
| Cân xe | WEIGHING |
| Bốc xếp | LABOR_STEVEDORING |
| Vé cầu đường BOT | TOLL_FEE |
| Chi phí khác | OTHER |
| *(Chi hộ KH — riêng biệt)* | is_on_behalf_of_customer / TVL_OBH / SUB_OBH |

**Cụm 3 Nút Phân Loại Trách Nhiệm Chi Phí (Touch Target >= 48px):**
- **[ 🏢 Chi phí TVL ] (TVL_COST - Mặc định):** Chi phí do Triền Võ chịu -> tính vào cached_expense chuyến xe.
- **[ ↗ TVL chi hộ ] (TVL_OBH):** Triền Võ ứng tiền trước chi hộ cho Khách hàng -> thu lại qua Debit Note -> không tính vào chi phí TVL.
- **[ 🔄 3PL chi hộ ] (SUB_OBH):** Tài xế/chủ xe 3PL tự chi tiền trước cho Khách hàng -> Triền Võ hoàn tiền lại cho 3PL trong Bảng Kê Quyết Toán Thầu Phụ (sub_reimbursable_expenses) -> đồng thời thu lại từ Khách qua Debit Note -> không tính vào chi phí TVL.

**Thông tin mỗi khoản chi:**
- Đơn vị phát hành, Số hóa đơn, Mã tra cứu HĐĐT, Link tra cứu
- Số tiền trước thuế, Thuế suất VAT, Tiền thuế, Thành tiền
- Ảnh chứng từ đính kèm
- Chặng phát sinh (Chặng 1 / Chặng 2 / Toàn trình / Công ty)
- Trạng thái duyệt: `Chờ duyệt` / `Đã duyệt` / `Từ chối` / `Đã chốt sổ`

### 6.5 Tổng P&L Chuyến xe (Tự động cập nhật)
- **Cước vận chuyển (Revenue):** Từ biểu cước tuyến hoặc nhập tay
- **Tổng chi phí (Expense):** Tổng các khoản đã duyệt (loại trừ chi hộ KH)
- **Lợi nhuận gộp (Profit):** Revenue − Expense
- **Biên lợi nhuận (Margin %):** Tự động tính, cache vào `cached_margin_percent`
- **Cơ chế Denormalization:** `update_financials()` chạy tự động mỗi khi thêm/sửa/xóa chi phí

### 6.6 Giả lập Driver App (1-Chạm)
- Nút: Xác nhận chuyến | Lấy Cont | Đến kho | Đóng hàng | Giao hàng | Hạ rỗng
- Mỗi nút ghi timestamp tương ứng vào `DispatchTrip`

### 6.7 Upload Chứng từ (TripDocument)
- Upload: EIR lấy cont, EIR hạ cont, POD giao hàng, Booking Note
- Lưu: Tên file, loại chứng từ, ngày upload, link tải

---

## 7. Phân hệ 6: Quản lý Chi phí & Kế toán

**View:** `view_accounting.html` | **API:** `POST /api/trips/{trip_code}/expenses/`

### 7.1 Thêm / Sửa Chi phí Phát sinh
- Thêm khoản chi từ Web Admin hoặc giả lập Driver App
- Chọn danh mục từ `ExpenseItem` (Master Data động)
- Nhập: Số tiền, Số HĐ, Mã tra cứu HĐĐT, Link tra cứu, Upload ảnh chứng từ
- Gắn thuế VAT (8% / 10% / 0%)

### 7.2 Cơ chế Chi hộ Khách hàng (Debit Note)
- Đánh dấu `is_on_behalf_of_customer = True` — tách riêng khỏi chi phí vận hành
- Trạng thái thu hồi: `Chờ thu` → `Đã xuất Debit Note` → `Đã thu hồi tiền`
- Số Debit Note gom nhóm (`DN-2026-XXX`)

### 7.3 Chốt sổ Kế toán (Settle/Unsettle)
- `POST /api/trips/{trip_code}/settle/` — Khóa toàn bộ chi phí, ngăn sửa/xóa
- `POST /api/trips/{trip_code}/unsettle/` — Mở khóa để điều chỉnh (có quyền)
- Ghi nhận: Người chốt sổ + Thời điểm chốt

### 7.4 Sổ quỹ Thu-Chi (CashTransaction — Mẫu S03a-DN)
- Ghi nhận tự động phiếu thu/chi khi quyết toán hoàn ứng tài xế hoặc thu tiền chi hộ
- **Dòng Thu:** Cước vận tải từ KH, Thu hồi chi hộ, Hoàn ứng tiền thừa tài xế
- **Dòng Chi:** Tạm ứng quỹ điều vận, Tạm ứng chuyến xe, Chi bù hoàn ứng, Thanh toán xe bạn, Mua xăng dầu, Nạp ETC, Sửa chữa xe
- Phân tách **Tiền mặt** vs **Ngân hàng**
- Mã phiếu tự động: `PT-YYYY-XXX` (thu) / `PC-YYYY-XXX` (chi)

---

## 8. Phân hệ 7: Tạm ứng & Hoàn ứng

**View:** `view_settlement.html` | **API:** `apps/billing/advance_views.py`

### 8.1 Quỹ Tạm ứng Điều vận Cấp 1 (DispatcherAdvanceFund)
- Công ty tạm ứng cho Điều vận để phục vụ chi phí đội xe
- Mã phiếu: `TUDV-YYYY-XXX`
- Trạng thái: `Chờ duyệt cấp quỹ` → `Đang lưu hành` → `Đã quyết toán hoàn ứng` / `Từ chối`
- Theo dõi số dư: Tiền ứng − Tiền đã cấp cho tài xế + Tiền tài xế hoàn lại

### 8.2 Tạm ứng Chuyến xe Cấp 2 (DriverTripAdvance)
- Tạm ứng theo từng chuyến cho từng Tài xế
- Mã phiếu: `TUTX-YYYY-XXX`
- Nguồn tiền: `Trích từ Quỹ điều vận` / `Công ty chi trực tiếp`
- Trạng thái: `Đang tạm ứng` → `Đã hoàn ứng` / `Đã hủy`
- Quyết toán: Thực chi vs Tạm ứng → `Khớp đúng` / `Tài xế hoàn tiền thừa` / `Công ty chi bù`

### 8.3 Quyết toán Nhà xe Thầu phụ / Xe bạn (3PL)
- Cước thỏa thuận trả xe bạn, Số tiền đã tạm ứng trước
- Trạng thái: `Chờ quyết toán` / `Thanh toán 1 phần` / `Đã quyết toán xong`

---

## 9. Phân hệ 8: Báo cáo Tài chính Đa chiều

**View:** `view_reports.html` | **API:** `apps/billing/finance_reports_api.py`

### 9.1 Các chiều phân tích (5 Report Types)
| Báo cáo | Endpoint | Nội dung |
|---|---|---|
| `BY_CUSTOMER` | `/api/reports/` | Doanh thu, chi phí, lợi nhuận theo từng Khách hàng |
| `BY_SUBCONTRACTOR` | `/api/reports/` | Chi phí và đối soát cước theo từng Nhà xe Thầu phụ |
| `BY_DRIVER` | `/api/reports/` | Sản lượng chuyến, lương tạm tính theo từng Tài xế |
| `BY_ROUTE` | `/api/reports/` | Hiệu suất sinh lời theo từng Tuyến đường |
| `BY_CASHFLOW` | `/api/reports/` | Sổ quỹ & Dòng tiền Thu-Chi, tồn quỹ tiền mặt + ngân hàng |

### 9.2 Báo cáo chuyến xe (DispatchTrip Reports)
- **`apps/dispatch/reports_api.py`:** Xuất báo cáo hoạt động đội xe, P&L từng chuyến

---

## 10. Phân hệ 9: Quản lý Đội xe & Rơ-moóc

**View:** `view_fleet.html` | **API:** `GET /api/fleet/`

### 10.1 Quản lý Đầu kéo (Vehicle)
- **4 Loại xe:** Đầu kéo Container | Xe tải 10T | Xe tải 2T | Van/Xe nhỏ
- **2 Loại sở hữu:** Xe nhà (Đội xe công ty) | Xe bạn (Thuê ngoài/3PL)
- **4 Trạng thái:** Đang chạy | Nằm bãi | Bảo trì | Ngừng sử dụng
- **Thông tin kỹ thuật:** Tải trọng (kg), Hãng xe (Freightliner, Hyundai, Hino...)
- **Cảnh báo tự động:**
  - ⚠️ Hạn đăng kiểm còn ≤ 15 ngày hoặc đã hết hạn
  - ⚠️ Hạn bảo trì còn ≤ 7 ngày hoặc đã hết hạn
- Gán Tài xế hiện tại, ngày bảo trì lần cuối và tiếp theo

### 10.2 Quản lý Rơ-moóc (Trailer)
- Biển số, Loại moóc (Xương 40ft, Cổ cò...), Tải trọng
- Hạn đăng kiểm + Cảnh báo ≤ 15 ngày

---

## 11. Phân hệ 10: Nhân sự & Lương chuyến

**View:** `view_personnel.html` | **API:** `GET /api/personnel/`

### 11.1 Trình Tự Nghiệp Vụ Quản Trị Nhân Sự & Tiền Lương 4 Giai Đoạn Liên Hoàn:
1. **Giai đoạn 1: Hồ Sơ Nhân Sự 360° (`Employee`):**
   - Quản lý đầy đủ định danh CCCD/CMND, Mã số thuế cá nhân, Sổ BHXH, Bằng lái GPLX (hạng bằng, ngày hết hạn), Thông tin tài khoản ngân hàng chi lương, Người phụ thuộc giảm trừ gia cảnh (`EmployeeDependent`).
2. **Giai đoạn 2: Hợp Đồng Lao Động & Phụ Lục (`LaborContract`, `ContractAppendix`):**
   - Quản lý vòng đời hợp đồng: DRAFT ➔ ACTIVE ➔ EXPIRED ➔ TERMINATED, cảnh báo hết hạn trước 30 ngày.
   - Xác lập rõ: Mức lương căn bản ký HĐ (`base_salary` - căn cứ tính Lương ngày công) và Mức lương đóng BHXH (`insurance_salary` - căn cứ trích nộp BHXH 10.5%).
3. **Giai đoạn 3: Bảng Chấm Công Tháng (`AttendanceCode`, `MonthlyAttendanceSummary`):**
   - Bộ ký hiệu chấm công chuẩn nghiệp vụ: X (1.0 công), X/2 (0.5 công), P (Phép năm), L (Lễ tết), Ro (Không lương), CT (Công tác), Om (Ốm đau).
   - Tự động khởi tạo công tiêu chuẩn (26 ngày) cho CBNV; hỗ trợ sửa trực tiếp từng dòng ngày công và tự động tính `total_paid_days`.
4. **Giai đoạn 4: Tính Lương Kết Hợp (Hybrid Payroll Engine):**
   - **Lương ngày công (thời gian):** `(Lương HĐ / 26) * Ngày công hưởng lương`.
   - **Lương sản phẩm chuyến xe (Tài xế):** Tổng lương chuyến chính (`driver_allowance`) + Lương cắt kéo (`dropoff_driver_allowance`) + Phụ cấp neo xe (`detention_driver_allowance`) + Thưởng định mức dầu (`fuel_bonus`) kế thừa trực tiếp từ `DispatchTrip`.
   - **Khấu trừ pháp lý & hoàn ứng:** Trích nộp BHXH (10.5%), Thuế TNCN (biểu lũy tiến 5 bậc Luật 109/2025/QH15 sau giảm trừ gia cảnh 15.5tr bản thân & 6.2tr NPT), Khấu trừ tạm ứng chuyến xe (`DriverTripAdvance`).
   - **Thực lĩnh Net:** Gross - BHXH - Thuế TNCN - Hoàn ứng.
   - **Thanh toán & Xuất file:** Xuất bảng kê chuyển khoản ngân hàng lô (CSV UTF-8 BOM), in phiếu lương cá nhân dạng văn bản phẳng A4.

---

## 12. Phân hệ 11: Dịch vụ Hải quan

**View:** `view_customs.html` | **API:** `GET /api/customs/`

### 12.1 Phân luồng Tờ khai Hải quan
- **3 Luồng:** Xanh (Thông quan tự động) | Vàng (Kiểm tra hồ sơ) | Đỏ (Kiểm tra thực tế hàng hóa)
- Theo dõi trạng thái từng tờ khai
- *Phân hệ đang trong giai đoạn mở rộng*

---

## 13. Phân hệ 12: Quản lý Danh mục Master Data

**View:** `view_master_data.html` | **API:** `GET /api/master-data/form-options/`, `GET /api/master-data/summary/`

### 13.1 Danh mục Địa điểm (Location)
- 5 Loại: `Cảng Biển` | `Cảng Cạn (ICD)` | `Bãi Rỗng/Depot` | `Kho Hàng/Nhà Máy` | `Bãi Đỗ Xe Công ty`
- Thông tin: Mã, Tên, Địa chỉ, Tỉnh/TP, Đầu mối liên hệ

### 13.2 Danh mục Quy cách Container & Xe (ContainerType)
- Mã chuẩn: `40HC`, `20DC`, `45G1`, `40GP`...
- Thông số: Hệ số TEU, Tải trọng (kg), Thể tích CBM

### 13.3 Danh mục Khoản mục Chi phí (ExpenseItem) — Dynamic Catalog
- 8 Nhóm: Nâng | Hạ | BOT | Cược | Cân xe | Bốc xếp | HĐĐT Cảng | Khác
- Định mức tiền ngầm định, Yêu cầu có HĐĐT hay không

### 13.4 Biểu phí Lương chuyến Tài xế (DriverSalaryTariff)
- Theo nhóm khu vực: Củ Chi, Long An, Tây Ninh, Bình Dương, Đồng Nai, Vũng Tàu...
- Theo tuyến chi tiết (KCN, Nhà máy cụ thể)
- Khu vực lấy/hạ chuẩn + Cự ly (km) + Mức lương chuyến

### 13.5 Danh mục Phụ cấp Tài xế (DriverAllowanceCatalog)
- 3 Loại: Phụ thêm Cảng xa | Phụ thu Kiểm hóa | Phụ cấp Tác nghiệp đặc thù
- VD: Cảng Cái Mép +200k, Cảng Hiệp Phước +150k, Kiểm hóa +50k/lần

### 13.6 Danh mục Hãng Tàu (ShippingLine)
- Mã chuẩn: MAEU, ONE, COSCO, SITC, EVERGREEN, CMA, MSC...
- Thông tin: SĐT, Email, Website cổng tra cứu eDO
- Ngày DEM/DET miễn phí mặc định của từng hãng

### 13.7 Danh mục Đối Tác Thầu Phụ / 3PL / Gara / NCC (Subcontractor)
- **Phân loại đối tác (partner_type):**
  * CARRIER (Nhà xe vận tải 3PL / Xe bạn): Lọc vào dropdown điều xe #inp-subcontractor. Hiển thị 2 bảng con Đội xe & Bác tài trong modal.
  * GARAGE (Gara sửa chữa / bảo dưỡng): Ẩn 2 bảng con xe & bác tài, tách biệt khỏi luồng điều xe hàng.
  * SUPPLIER (Nhà cung cấp vật tư / dịch vụ): Ẩn 2 bảng con xe & bác tài.
- **Thông tin doanh nghiệp:** Tên viết tắt (short_name), Tên pháp nhân, MST, Số điện thoại, Địa chỉ công ty (ddress), Người liên hệ, STK ngân hàng.
- **2 Bảng con trực tiếp (Inline Editing & Action Buttons):**
  * *Bảng con Đội xe (Vehicle):* Thêm mới trực tiếp, sửa biển số, loại xe, tải trọng, ngày đăng kiểm.
  * *Bảng con Danh bạ bác tài (SubcontractorDriver):* Thêm mới trực tiếp, sửa họ tên, SĐT, số bằng lái GPLX, ghi chú.

### 13.8 Thông tin Công ty & Cài đặt Hệ thống (CompanyProfile)
- Pháp nhân: Tên, MST, Đại diện, GPLX vận tải
- Tài khoản ngân hàng, Logo, Địa chỉ trụ sở + Chi nhánh
- Tham số hệ thống: VAT mặc định, Giá dầu tham chiếu, Hệ số CBM

### 13.10 Tính năng Xuất Mẫu & Nhập Danh Mục Ban Đầu Từ Excel (Master Data Import/Export)
- **Tải Mẫu Excel Chuẩn Hóa:** Cho phép tải template Excel (`.xlsx`) cho 12 danh mục với header chuẩn BIM Logistics, giải thích định dạng và dữ liệu mẫu thực tế.
- **Nhập Danh Mục Hàng Loạt:** Hỗ trợ kéo thả/chọn file Excel để nạp dữ liệu ban đầu cho các bảng Cảng bãi, Khách hàng, Biểu cước, Đội xe, Lương chuyến, Khoản chi, Số dư đầu kỳ.
- **Cơ Chế Upsert Thông Minh:** Tự động nhận diện bản ghi đã tồn tại qua mã định danh để cập nhật thông tin thay vì báo lỗi trùng lặp.
- **API Endpoints:**
  * `GET /api/master-data/export-template/?catalog=<catalog>` — Tải file mẫu.
  * `GET /api/master-data/export-data/?catalog=<catalog>` — Xuất dữ liệu hiện tại.
  * `POST /api/master-data/import/` — Nạp dữ liệu từ file Excel.

### 13.9 API Form Options
- `GET /api/master-data/form-options/` — Tổng hợp tất cả dropdown options cho form giao diện
- `GET /api/master-data/summary/` — Số lượng bản ghi mỗi danh mục

---

## 14. Tính năng Kỹ thuật nền tảng (Core)

### 14.1 Cơ sở dữ liệu & ORM
- **Soft-Delete toàn hệ thống:** `is_deleted=True`, `deleted_at` — không bao giờ xóa cứng dữ liệu vận tải
- **Audit Timestamps:** `created_at`, `updated_at` trên mọi model
- **Bảo vệ khóa ngoại:** `on_delete=PROTECT` trên các bảng trọng yếu (Customer, Driver, Vehicle, Trip)
- **Denormalization P&L:** `cached_revenue`, `cached_expense`, `cached_profit`, `cached_margin_percent` tự động cập nhật qua `update_financials()`
- **Index:** `trip_code`, `container_number`, `booking_or_bill`, `license_plate`, `status`, `created_at`

### 14.2 Signals & Automation
- Tự động cập nhật P&L khi thêm/sửa/xóa `TripExpense`
- Tự động cập nhật `advance_settlement_status` trên `DispatchTrip`
- `resync_timelines` management command: Đồng bộ lại toàn bộ timeline 11 bước

### 14.3 Frontend SPA (Single Page Application)
- **`static/js/app.js` (~1MB):** Engine SPA trung tâm, quản lý routing 14 view không reload trang
- **`static/js/src/app/core/table-manager.js`:** Quản lý hiển thị/ẩn cột trong bảng, lưu preference người dùng
- **14 View:** dashboard, dispatch, trip-detail, sales, booking-detail, accounting, settlement, fleet, personnel, reports, master-data, customs, quotation-detail, create-trip

### 14.4 Tracking & Traceability
- `TripTimelineItem`: 11 mốc vận hành chuẩn hóa, tự động tạo khi phát lệnh
- `tracking_hashid`: Token Capability riêng cho Customer Tracking Portal
- `driver_token`: Token Capability riêng cho Driver App (auto-rotate khi đổi tài xế)

### 14.5 Management Commands
- `python manage.py resync_timelines` — Đồng bộ lại timeline 11 bước cho tất cả chuyến
- `python manage.py seed_sample_data` — Tạo dữ liệu mẫu cho demo/dev

### 14.6 Kiểm thử Tự động
- **86 Test cases** (tính đến v2.9.13) — 100% passed
- `FrontendSyntaxIntegrityTestCase`: Tự động kiểm tra cú pháp JS mỗi lần test
- Chạy: `python manage.py test --keepdb`
- Kiểm tra JS: `python scripts/build_app_js.py --check && node -c static/js/app.js`

---

## 15. Bảo mật & Phân quyền

*(Chi tiết đầy đủ tại [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md))*

| Tiêu chuẩn | Trạng thái |
|---|---|
| Mã hóa mật khẩu (Argon2/PBKDF2) | ✅ Django default |
| JWT Token Blacklist (Đăng xuất an toàn) | ✅ `simplejwt` blacklist |
| Rate Limiting API | ✅ Cấu hình riêng |
| HashID chống IDOR | ✅ `hashids` library — `/trips/<hashid>/` thay vì `/trips/1/` |
| No Hard-Delete dữ liệu pháp lý | ✅ SoftDeleteModel toàn hệ thống |
| CORS & CSRF Protection | ✅ Django middleware |
| File upload validation (PDF/Image ≤ 5MB) | ✅ API validation |
| Permission classes theo role | ✅ `IsAdminOrDirector`, `IsDriver`, `IsDispatcher`... |
| Driver Token rotate khi đổi tài xế | ✅ `revoked_driver_tokens` |

---

## 16. Chi tiết UI — Bảng Điều vận (view_dispatch.html)

### 16.1 Bộ lọc đa cột (Column Filters Bar)
| Filter | Loại | Tùy chọn đặc biệt |
|---|---|---|
| Khách hàng | Dropdown | Tất cả khách hàng |
| Tài xế / Đầu xe | Dropdown | Tất cả tài xế & xe |
| Trạng thái | Dropdown | Đang điều vận, Đang vận chuyển, Đã giao, Hoàn thành, Chờ nhận lệnh, **Cắt Kéo (Drop & Hook)**, **Ghép 2 Cont 20ft**, **Cảnh báo Quá hạn Free DET** |
| Loại hình | Dropdown | Hàng Nhập FCL, Hàng Xuất FCL, Nội Địa |
| Tìm kiếm đa năng | Text | Tìm số cont, seal, booking, mã chuyến, invoice... |

### 16.2 Các cột của bảng dispatch (có thể ẩn/hiện & sắp xếp)
| Cột | Sắp xếp | Nội dung |
|---|---|---|
| STT | Không | Số thứ tự cố định |
| Mã Chuyến | ✅ | Mã `TVL-MMDD-XXX` |
| Lịch Đóng | ✅ | Ngày & giờ hẹn đóng/khởi hành |
| Khách hàng & Kho | ✅ | Tên KH + Kho giao hàng |
| Booking / Cont / Seal | ✅ | Số B/L, Số container, Số seal |
| Invoice / Dock | Không | Số hóa đơn thương mại, Cửa dock |
| Xe Kéo & Xe Hạ | ✅ | Biển số xe chặng 1 & chặng 2 (Cắt kéo) |
| Lưu Ý & Vị Trí Cont | Không | Ghi chú điều độ, vị trí bãi cont |
| Nơi Lấy ➔ Nơi Hạ | ✅ | Tuyến đường 3 điểm |
| Trạng thái | ✅ | Badge màu theo TripStatus |

### 16.3 Tính năng bổ sung trên bảng
- **Ẩn/hiện chuyến đã hoàn thành** — toggle 1 click
- **Tùy chỉnh cột** — modal column manager, lưu preference
- **Đặt lại bộ lọc** — 1 click reset về mặc định
- **Bộ đếm hiển thị:** `X / Y chuyến xe`
- **KPI Cards:** Tổng chuyến tháng | Đang chạy hôm nay | Chờ duyệt phí | Cảnh báo Cắt Máng

---

## 17. Chi tiết UI — Phân hệ Kế toán (view_accounting.html)

### 17.1 Cấu trúc 7 Subtab

| Tab | Nội dung | Badge |
|---|---|---|
| **Sổ Quỹ Thu - Chi** | Hạch toán mẫu S03a-DN, Tiền mặt & Ngân hàng | — |
| **Tạm Ứng Tài Xế** | Danh sách TUTX, trạng thái hoàn ứng | 🔶 Số chưa hoàn |
| **Quỹ Điều Vận** | Quản lý TUDV, số dư quỹ | 🔷 Số đang lưu hành |
| **Khóa Sổ Chuyến Xe** | Danh sách chuyến chờ/đã chốt sổ | — |
| **Khoản Chi Hộ** | Debit Note, trạng thái thu hồi | 🟢 Số chờ thu |
| **Xe Bạn (3PL)** | Quyết toán cước xe thầu phụ | 🔴 Số chờ quyết toán |
| **Vé BOT Tuyến** | Đối chiếu cầu đường theo tuyến | — |

### 17.2 KPI Cards Sổ Quỹ
- **Tồn Quỹ Tiền Mặt** — Tiền mặt tại két công ty
- **Số Dư Tài Khoản Ngân hàng** — Tài khoản thanh toán
- **Tổng Tồn Quỹ Toàn Cty** — Tiền mặt + Ngân hàng
- **Dòng Tiền Thuần Trong Kỳ** — Thu: X | Chi: Y

### 17.3 Thao tác
- **Lập Phiếu Thu** (`PT-YYYY-XXX`) — Modal tạo mới
- **Lập Phiếu Chi** (`PC-YYYY-XXX`) — Modal tạo mới
- **Xuất Excel** — Toàn bộ sổ quỹ theo kỳ lọc
- **Quyết Toán Chuyến** — Chuyển sang `view_settlement`

---

## 18. Chi tiết UI — Quyết toán Gom chuyến (view_settlement.html)

### 18.1 Bộ lọc gom nhóm
- **Gom nhóm theo:** Tài Xế | Khách Hàng | Đầu Xe
- **Kỳ thời gian:** Từ ngày – Đến ngày + Preset nhanh: Hôm nay / Tuần này / Tháng này / Tháng trước
- **Trạng thái sổ:** Chờ quyết toán | Tất cả | Đã quyết toán (Khóa)
- **Tìm kiếm:** mã chuyến, cont, tuyến, tài xế

### 18.2 KPI Cards đối soát
- Chuyến được chọn / Tổng chuyến
- Tổng Đã Tạm Ứng (TUTX)
- Tổng Thực Chi Hợp Lệ
- Chênh lệch hoàn ứng (Hoàn lại / Chi bù)

---

## 19. Chi tiết UI — Hệ thống Báo cáo (view_reports.html)

**14 báo cáo** chia thành 4 nhóm nghiệp vụ, lọc theo kỳ: Hôm nay / Tuần / Tháng / Quý / Năm / Tất cả. Xuất Excel & In báo cáo.

### Nhóm 1: Doanh thu & Hiệu suất Đội xe (3 báo cáo)
| # | Tên báo cáo | Nội dung chính |
|---|---|---|
| BC-1 | **Hiệu Suất Đội Xe & P&L** | Tỷ lệ xe nhà khai thác, sản lượng chuyến, P&L tổng hợp |
| BC-7 | **Doanh Thu Khách & Sản Lượng TEU** | Doanh thu theo từng khách hàng, TEU quy đổi |
| BC-4 | **Chi Phí Tuyến & Hoàn Chi Hộ** | Chi phí theo tuyến, trạng thái thu hồi Debit Note |

### Nhóm 2: Vận hành & Sự cố (4 báo cáo)
| # | Tên báo cáo | Nội dung chính |
|---|---|---|
| BC-2 | **Vỏ Cont & DEM/DET Hãng Tàu** | Cảnh báo hết hạn free DEM/DET, chi phí phạt lưu |
| BC-3 | **Đúng Giờ & Chất Lượng OTP** | On-Time Performance theo từng tuyến/kho |
| BC-5 | **Cắt Kéo & Lưu Xe Sau 0H** | Thống kê Drop & Hook, phí lưu xe qua đêm |
| BC-6 | **Ngoại Lệ & Sự Cố (OS&D)** | Kẹt cảng, kẹt kho, hỏng cont, tai nạn, hỏng xe |

### Nhóm 3: Lương chuyến & Tạm ứng (4 báo cáo)
| # | Tên báo cáo | Nội dung chính |
|---|---|---|
| BC-10 | **Quỹ Tạm Ứng Điều Vận (Kế Toán QL)** | Tình trạng quỹ TUDV, số dư, hoàn ứng |
| BC-11 | **Tạm Ứng & Chi Phí Tài Xế (Điều Vận QL)** | TUTX chưa hoàn ứng, chi tiết từng tài xế |
| BC-9 | **Lương Chuyến & Tài Xế** | Bảng lương tạm tính theo sản lượng thực tế |
| BC-8 | **Quyết Toán Xe Thầu Phụ 3PL** | Đối soát cước xe bạn, tình trạng thanh toán |

### Nhóm 4: Công nợ Khách (3 báo cáo)
| # | Tên báo cáo | Nội dung chính |
|---|---|---|
| BC-13 | **Công Nợ Phải Thu (AR)** | Cước chưa thu theo từng khách hàng |
| BC-12 | **Quyết Toán Chuyến & Backlog** | Chuyến chưa chốt sổ, phân tích tồn đọng |
| BC-14 | **Tuổi Đơn Tồn Đọng Chưa Chốt** | Ranking chuyến tồn đọng lâu nhất (aging) |

---

## 20. Phân hệ Sự cố Vận tải (OS&D — TripException)

**Model:** `apps/exceptions/models.py`

### 20.1 Loại sự cố (ExceptionType)
| Loại | Mô tả |
|---|---|
| `PORT_CONGESTION` | Kẹt Cảng / Kẹt Bãi |
| `WAREHOUSE_DELAY` | Kho không nhận / Kẹt Kho |
| `DAMAGED_CONTAINER` | Vỏ Cont Hư Hỏng (Thủng/Rách/Bẩn) |
| `TRAFFIC_ACCIDENT` | Va chạm / Tai nạn giao thông |
| `VEHICLE_BREAKDOWN` | Xe hỏng hóc giữa đường |
| `OTHER` | Sự cố khác |

### 20.2 Mức độ nghiêm trọng (ExceptionSeverity)
- `LOW` — Nhẹ (Không ảnh hưởng tiến độ)
- `MEDIUM` — Trung bình (Chậm trễ 1–3 giờ)
- `HIGH` — Nghiêm trọng (Cắt máng, Hỏng hàng)
- `CRITICAL` — Khẩn cấp (Tai nạn, Đền bù)

### 20.3 Thông tin ghi nhận
- Chuyến xe liên quan, Loại sự cố, Mức độ, Mô tả chi tiết
- Ảnh hiện trường (`evidence_image_path`)
- Người báo cáo (Driver/Dispatcher)
- Phương án giải quyết từ điều độ (`resolution_note`)
- Trạng thái: `Chưa xử lý` / `Đã xử lý` + Thời điểm xử lý xong

---

## 21. Phân hệ Chứng từ Pháp lý (TripDocument)

**Model:** `apps/documents/models.py`

### 21.1 Loại chứng từ (DocumentType)
| Loại | Mô tả |
|---|---|
| `EIR_PICKUP` | Phiếu EIR Lấy Cont |
| `EIR_DROPOFF` | Phiếu EIR Hạ Cont |
| `POD` | Biên bản giao nhận có chữ ký (POD) |
| `WEIGHT_TICKET` | Phiếu Cân Hàng/Xe |
| `CONTAINER_CHECK` | Ảnh giám định vỏ Cont |
| `SEAL_IMAGE` | Ảnh Niêm Phong Chì (Seal) |
| `INCIDENT_PHOTO` | Ảnh Hiện Trường Sự Cố |
| `INVOICE` | Hóa đơn GTGT nâng hạ / cước |
| `BOOKING_NOTE` | File Booking / Lệnh cấp rỗng |

### 21.2 Tính năng OCR AI
- `ocr_raw_text` — Dữ liệu OCR thô trích xuất từ tài liệu
- `ocr_confidence` — Độ tin cậy nhận diện (%)
- `extracted_container_no` — Số cont tự động nhận diện
- `extracted_seal_no` — Số seal tự động nhận diện
- **Nghiệm thu** bởi điều phối viên: `is_verified`, `verified_by`, `verified_at`

---

## 22. Tổng hợp Models & Counts

| App | Model chính | Số model | Ghi chú |
|---|---|---|---|
| `dispatch` | `DispatchTrip`, `TripTimelineItem` | 2 | Hạt nhân hệ thống |
| `billing` | `TripExpense`, `DispatcherAdvanceFund`, `DriverTripAdvance`, `CashTransaction` | 4 | Tài chính & sổ quỹ |
| `customers` | `Customer`, `RouteTariff`, `Quotation`, `QuotationItem`, `BookingOrder`, `BookingDocument` | 6 | CRM & Sales |
| `fleet` | `Vehicle`, `Trailer` | 2 | Đội xe |
| `personnel` | `Employee` | 1 | Nhân sự |
| `master_data` | `Location`, `ContainerType`, `ExpenseItem`, `DriverSalaryTariff`, `DriverAllowanceCatalog`, `ShippingLine`, `Subcontractor`, `CompanyProfile` | 8 | Danh mục |
| `documents` | `TripDocument` | 1 | Chứng từ pháp lý |
| `exceptions` | `TripException` | 1 | Sự cố OS&D |
| `customs` | *(đang phát triển)* | — | Hải quan |
| `collaboration` | `PostCategory`, `CompanyPost`, `OfficeTask`, `ChatRoom`, `ChatMessage` | 5 | Tương tác & Giao việc |
| **Tổng** | | **30 models** | |

---

## 23. Phân hệ 13: Bản Tin Công Ty, Giao Việc Chuẩn Quốc Tế & Team Chat (`collaboration`)

### 23.1 Bản Tin Công Ty & Thông Báo Nội Bộ
- **View:** `view_news.html` | **API:** `/api/collaboration/news/`
- **Models:** `PostCategory`, `CompanyPost`, `PostAttachment`, `PostComment`, `PostReadStatus`
- **Chức năng:** Đăng thông báo, phân loại danh mục, ghim bài viết (`is_pinned`), đánh dấu khẩn cấp (`is_urgent`), tự động ghi nhận lượt xem và trạng thái đã đọc của từng nhân sự, bình luận phản hồi dưới bản tin.

### 23.2 Quản Lý & Giao Việc Văn Phòng (Jira / Asana Standard)
- **View:** `view_tasks.html` | **API:** `/api/collaboration/tasks/`
- **Models:** `OfficeTask`, `TaskChecklist`, `TaskComment`, `TaskAttachment`, `TaskActivityLog`
- **Phạm vi phân quyền:** Độc lập với tài xế xe đầu kéo; chuyên biệt cho Ban Giám Đốc, Quản lý và Nhân viên Văn phòng.
- **Chức năng:**
  * Mã công việc tự sinh `TSK-YYYYMM-XXXX`.
  * Hỗ trợ 2 chế độ hiển thị: **Bảng Kanban** 4 cột trực quan (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`) và **Danh sách (List View)**.
  * Kéo thả Kanban đổi trạng thái trực quan.
  * Phân công nhiệm vụ 3 vai trò: **Người giao (`reporter`)**, **Người thực hiện chính (`assignee`)**, và **Người liên quan theo dõi chung (`followers`)**.
  * Modal Giao việc hỗ trợ chọn nhiều người liên quan (Followers) dạng thẻ chip linh hoạt kèm thông báo tự động.
  * Checklist subtasks tự động tính % tiến độ hoàn thành công việc.
  * Slide-over Task Detail Drawer bên phải: trao đổi, hiển thị người theo dõi, đính kèm tài liệu, nhật ký hoạt động (Audit trail).

### 23.3 Tin Nhắn Nội Bộ Trực Tiếp (In-App Team Chat)
- **Component:** `chat_bubble.html` | **API:** `/api/collaboration/chat/`
- **Models:** `ChatRoom`, `ChatParticipant`, `ChatMessage`, `ChatAttachment`
- **Chức năng:** Nút nổi Chat Bubble góc phải, đếm số tin chưa đọc, kênh toàn công ty (`COMPANY`), kênh phòng ban (`DEPARTMENT`), kênh chat riêng 1-1 (`DIRECT`). Tối ưu Cache Polling qua `after_id` và tự động hết hạn file đính kèm sau 30 ngày để tiết kiệm dung lượng.

---

## 📝 Hướng dẫn Cập nhật Tài liệu này

Khi thêm tính năng mới hoặc thay đổi tính năng hiện có, **bắt buộc cập nhật** theo quy trình:

```
1. Hoàn thành code + test pass
2. Cập nhật section tương ứng trong FEATURES.md này
3. Thêm entry vào docs/CHANGELOG.md với phiên bản mới
4. Commit cả 3 thay đổi trong cùng 1 commit
```

> **Template thêm tính năng mới:**
> ```markdown
> ### X.Y Tên tính năng mới
> - **View:** `view_xxx.html` | **API:** `METHOD /api/path/` | **Model:** `ModelName`
> - Mô tả ngắn gọn tính năng làm gì
> - Các trạng thái/choices đặc biệt (nếu có)
> - Business logic quan trọng (nếu có)
> ```
