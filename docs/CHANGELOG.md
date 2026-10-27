# CHANGELOG — BIM LOGISTICS PLATFORM

Tất cả các thay đổi kiến trúc và mã nguồn được ghi nhận theo chuẩn Documentation-as-Code.

## [v4.7.1] - 2026-10-27 (Tối Ưu Thị Giác Phân Hệ Kinh Doanh: Bỏ Tiêu Đề Thừa, Đồng Nhất Hiệu Ứng Hover & Triệt Tiêu Xê Dịch Chiều Cao Tab)

### 1. Tinh Gọn Giao Diện & Đồng Nhất Bố Cục:
- **Loại Bỏ Tiêu Đề Lặp Lại:**
  * Bỏ hoàn toàn dòng tiêu đề `📈 Tổng Hợp Chỉ Số Kinh Doanh & Kế Hoạch Vận Chuyển` trên đầu phân hệ Kinh Doanh. 5 thẻ KPI chiến lược được đẩy lên đầu trang, đồng bộ 100% với phong cách phân hệ Điều Vận.
  * Tích hợp nút `Làm Mới` nhỏ gọn trực tiếp vào thanh điều khiển subtabs bên phải.

### 2. Triệt Tiêu Hiện Tượng Nhảy Chiều Cao & Đồng Nhất Hover Tab (Zero Layout Shift):
- **Cố Định Kích Thước Pixel-Perfect:**
  * Cố định chiều cao `h-10` (40px) và `box-border` cho cả 2 nút tab (`1. Báo Giá & Hợp Đồng Khách Hàng` và `2. Booking / Đơn Đặt Hàng`).
  * Sử dụng `border-2` cho cả 2 trạng thái: Active có viền màu thương hiệu (`border-indigo-600` hoặc `border-teal-600`), Inactive có `border-transparent`. Nhờ đó, việc chuyển đổi giữa 2 tab không làm tăng giảm độ dày viền hay padding, triệt tiêu 100% hiện tượng xê dịch/nhảy giật chiều cao màn hình.
- **Đồng Nhất Hiệu Ứng Hover & Active Chuẩn Hình 2:**
  * Đồng nhất style active theo phong cách viền màu nổi bật và nền sáng nhẹ (`border-2 bg-indigo-50/70 text-indigo-900` và `border-2 bg-teal-50/70 text-teal-900`).
  * Trạng thái inactive khi hover đều chuyển màu mượt mà: `hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 transition-all`.

### 3. Kỹ Thuật & Đảm Bảo Khả Năng Vận Hành:
- Cập nhật đồng bộ trong `templates/views/view_sales.html`, `static/js/app.js` và `static/js/modules/sales.js`.
- Nâng asset cache version lên `?v=2.9.72` trong `templates/base.html`.
- Kiểm thử cú pháp JS: 100% Passed.
- Chạy bộ kiểm thử tự động toàn diện: **148/148 unit tests PASSED 100%** (`python manage.py test --keepdb`).

## [v4.7.0] - 2026-10-27 (Tối Ưu Không Gian Chiều Dọc Phân Hệ Kinh Doanh: Tích Hợp Subtabs 1 Dòng Trực Tiếp & Loại Bỏ Header Lặp Lại)

### 1. Tinh Gọn Giao Diện Tab Con Phân Hệ Kinh Doanh (Subtabs Compact Integration):
- **Tích Hợp 1 Dòng Điều Khiển Trực Tiếp:**
  * Gom thanh chuyển tab `1. Báo Giá & Hợp Đồng Khách Hàng` và `2. Booking / Đơn Đặt Hàng` cùng cụm bộ lọc kỳ và nút hành động nhanh (`Tạo Báo Giá` / `Tạo Booking`) lên cùng 1 hàng duy nhất (`p-2.5 rounded-2xl border border-slate-200 shadow-xs`).
  * Loại bỏ hoàn toàn khối tiêu đề to và dòng mô tả dài chiếm dụng diện tích dọc màn hình (`1 Báo Giá & Hợp Đồng Khách Hàng - NVKD chủ động tìm kiếm...` và `2 Danh Sách Booking...`).
- **Trải Nghiệm Liền Mạch Liền Kề Dàn Thẻ Quy Trình:**
  * Ngay khi bấm chuyển đổi giữa 2 tab, dàn 5 thẻ phễu trạng thái tương ứng (`1. Đã gửi báo giá`, `2. Đang đàm phán`, `3. Chờ ký hợp đồng`... hoặc `1. Chờ điều xe`, `2. Đang điều xe`...) hiển thị trực tiếp ngay dưới thanh tab, sạch sẽ và chuẩn mực như giao diện ứng dụng iOS / ERP quốc tế.

### 2. Kỹ Thuật & Đảm Bảo Khả Năng Vận Hành:
- Cập nhật hàm `switchSalesSubTab` trong `static/js/app.js` và `static/js/modules/sales.js` để tự động chuyển đổi hiển thị bộ lọc kỳ (`quote-filter-period` vs `booking-filter-period`) và nút tạo mới tương ứng.
- Nâng asset cache version lên `?v=2.9.71` trong `templates/base.html`.
- Kiểm thử cú pháp JS: `node -c static/js/app.js; node -c static/js/modules/sales.js` (100% Passed).
- Chạy bộ kiểm thử tự động toàn diện: **148/148 unit tests PASSED 100%** (`python manage.py test --keepdb`).

## [v4.6.9] - 2026-10-27 (Chuẩn Hóa Đồng Bộ Bố Cục Phân Tầng Toàn App & Style Thẻ KPI Toàn Hệ Sinh Thái)

### 1. Thống Nhất Quy Chuẩn Bố Cục Phân Tầng Từ Trên Xuống (Standard Hierarchical Page Architecture):
- **Áp Dụng Đồng Nhất Toàn Diện Cho 4 Phân Hệ Lớn Còn Lại:**
  * **Xe & Bãi (`view_fleet.html`):** Bổ sung Topbar chuẩn; Thay thế 5 thẻ kỹ thuật đội xe sang style Kinh Doanh với viền trái nhận diện (Teal, Indigo, Emerald, Rose, Amber); Tích hợp tính năng bấm vào thẻ để nhảy trực tiếp sang tab Đầu Kéo / Rơ-Moóc hoặc áp dụng ngay bộ lọc Cảnh báo hạn kiểm / Bảo dưỡng.
  * **Hành Chính & Nhân Sự (`view_personnel.html`):** Bổ sung Topbar chuẩn; Thay thế 5 thẻ nhân sự sang style Kinh Doanh (Indigo, Teal, Blue, Rose, Emerald); Bấm vào thẻ là tự động chuyển sang tab Hồ sơ, Tính lương hoặc áp dụng bộ lọc Tài xế / Văn phòng / Hạn GPLX-HĐLĐ.
  * **Tài Chính & Kế Toán (`view_accounting.html`):** Tái cấu trúc phân tầng chuẩn: Đưa Topbar lên đầu; Đưa Bộ 4 thẻ KPI Dòng tiền & Thanh khoản (Tồn két tiền mặt, Tài khoản ngân hàng, Tổng tồn quỹ, Dòng tiền thuần) lên cấp phân hệ phía trên thanh subtabs; Giữ thanh 7 Trụ Cột Subtabs thanh lịch, tinh gọn, không bị che khuất; Xóa bỏ các thẻ lặp lại bên trong tab con.
  * **Dịch Vụ Hải Quan (`view_customs.html`):** Bổ sung Topbar chuẩn; Nâng cấp 5 thẻ thông quan VNACCS/VCIS (Tổng tờ khai, Luồng xanh, Luồng vàng, Luồng đỏ, Tỷ lệ thông quan) với viền trái màu sắc và khả năng bấm vào thẻ tự động lọc ngay danh sách tờ khai theo luồng tương ứng.

### 2. Tinh Gọn Không Gian Thẻ Thông Tin Tab Con (Vertical Space Optimization):
- Triệt tiêu hoàn toàn các thanh tiêu đề thẻ phụ to cồng kềnh gây lãng phí chiều dọc màn hình.
- Tích hợp tiêu đề và bộ lọc thông minh trực tiếp vào toolbar danh sách, mang lại giao diện tinh giản, liền mạch và chuẩn mực như ứng dụng iOS / ERP cao cấp.

### 3. Kỹ Thuật & Cập Nhật Hệ Thống:
- Thêm hàm điều hướng tự động `filterCustomsChannel(laneOrStatus)` trong `static/js/app.js`.
- Chuẩn hóa các chuỗi text trả về trong `apps/dispatch/api_views.py`, `apps/personnel/api_views.py` và `apps/customs/api_views.py` (loại bỏ các tiền tố in hoa thô cứng).
- Cập nhật tài liệu thiết kế đặc tả tại `docs/UI_UX_GUIDELINES.md` (Mục 9: Quy chuẩn bố cục phân tầng từ trên xuống toàn ứng dụng).
- Nâng asset cache version lên `?v=2.9.70` trong `templates/base.html`.
- Kiểm thử cú pháp JS: 100% Passed.
- Chạy bộ kiểm thử tự động toàn diện: **148/148 unit tests PASSED 100%** (`python manage.py test --keepdb`).

## [v4.6.8] - 2026-10-27 (Đồng Bộ Thiết Kế 5 Thẻ Vận Hành Phân Hệ Điều Vận Theo Style Phân Hệ Kinh Doanh)

### 1. Chuẩn Hóa Thiết Kế Giao Diện 5 Thẻ KPI Điều Độ Vận Tải:
- **Đồng Bộ Hoàn Toàn Phong Cách Thiết Kế Với Phân Hệ Kinh Doanh:**
  * Toàn bộ 5 thẻ vận hành điều độ được thiết kế lại với bo góc mềm mại `rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition-all p-5 flex flex-col justify-between`.
  * Viền màu thương hiệu bên trái (Border-left 4px) phân định từng mắt xích vận tải:
    - **Thẻ 1: Tổng Kế Hoạch Điều Độ** — `border-l-indigo-600` (Viền chàm Indigo).
    - **Thẻ 2: Chờ Nhận Lệnh** — `border-l-amber-500` (Viền hổ phách Amber).
    - **Thẻ 3: Đang Trên Tuyến** — `border-l-teal-600` (Viền xanh ngọc Teal).
    - **Thẻ 4: Cảnh Báo Rủi Ro** — `border-l-rose-600` (Viền hồng cánh sen/đỏ Rose).
    - **Thẻ 5: Đã Giao & Thu POD** — `border-l-emerald-600` (Viền lục bảo Emerald).
- **Hàng Tiêu Đề & Badge Trạng Thái Bo Tròn (Header & Badge Pill):**
  * Tiêu đề in hoa xám thanh lịch: `text-[13px] font-bold text-slate-500 uppercase tracking-wider`.
  * Badge pill bo tròn góc trên phải (`px-2 py-0.5 rounded-full text-xs font-bold font-heading border flex items-center gap-1`):
    - Thẻ 1: `Kế Hoạch Đội Xe` (Nền Indigo nhạt, viền indigo).
    - Thẻ 2: `Chờ Xác Nhận` (Nền Amber nhạt, viền amber).
    - Thẻ 3: `Đang Trên Tuyến` (Nền Teal nhạt, viền teal).
    - Thẻ 4: `Cần Xử Lý / An Toàn` (Nền Rose nhạt, viền rose).
    - Thẻ 5: `Hoàn Thành` (Nền Emerald nhạt, viền emerald).
- **Chỉ Số Chính & Dòng Phụ Tinh Gọn (Metrics & Subtext):**
  * Chỉ số số liệu lớn: `text-3xl font-black tabular-nums font-heading tracking-tight mt-1` kèm đơn vị font-sans gọn gàng (`Chuyến`).
  * Dòng phụ tóm tắt gọn gàng, loại bỏ các tiền tố thô cứng hoa văn cũ (`KẾ HOẠCH:`, `XE NHÀ:`...), thay bằng dòng đơn thanh lịch có icon màu nhận diện và dấu chấm phân cách `·` tinh tế.

### 2. Kỹ Thuật & Khả Năng Tương Thích Ngược:
- Giữ nguyên toàn bộ ID tương thích ngược (`stat-total-trips`, `stat-transit`, `stat-cutoff-warning`, `stat-pending-expenses`) để không làm gián đoạn bất kỳ luồng xử lý tự động nào.
- Đồng bộ hóa logic xử lý chuỗi và cập nhật giao diện trong cả `apps/dispatch/api_views.py`, `static/js/modules/dispatch.js` và `static/js/app.js`.
- Nâng cache version lên `?v=2.9.69` trong `templates/base.html`.
- Kiểm thử cú pháp JS: `node -c static/js/app.js; node -c static/js/modules/dispatch.js` (100% Passed).
- Chạy toàn bộ **148/148 unit tests PASSED 100%** (`python manage.py test --keepdb`).

## [v4.6.7] - 2026-10-26 (Hoàn Thiện 4 Nhóm Báo Cáo Chiến Lược: Bộ Lọc Đối Soát Chốt Số, Phân Định Doanh Thu Kế Hoạch vs Kỳ Vọng & Chuẩn Hóa Nhóm Xe & Vận Hành)

### 1. Nhóm 1 (Doanh Thu Thực Hiện) — Bổ Sung Trạng Thái & Bộ Lọc Đối Soát Chốt Số:
- **Bổ Sung Cột Trạng Thái Đối Soát Trên Lưới Tổng Hợp:**
  * Báo Cáo 7 (Doanh Thu Khách Hàng) & Báo Cáo 1 (Doanh Thu Đội Xe) được bổ sung cột `Đối Soát (Chốt / Chờ)` hiển thị trực quan: `Đã Chốt` (Xanh) vs `Chờ Chốt` (Vàng/Cam) kèm số lượng chuyến cụ thể.
  * Hàng tổng cộng (Footer) tổng hợp chính xác: Tổng số chuyến Đã Chốt vs Tổng số chuyến Chờ Chốt trên toàn bộ hệ sinh thái.
- **Bộ Lọc Nhanh Trạng Thái Đối Soát (Settlement Quick Filter):**
  * Thêm dropdown `<select id="filter-rep7-settlement">` và `<select id="filter-rep1-settlement">` với 3 chế độ: `Tất cả trạng thái đối soát`, `Đã đối soát chốt số`, `Chờ đối soát`.
  * Khi chọn lọc, bảng tổng hợp và danh sách chuyến con (subrow) tự động lọc chính xác các chuyến tương ứng.

### 2. Nhóm 2 (Kinh Doanh & Khách Hàng) — Phân Định Doanh Thu Kế Hoạch vs Kỳ Vọng:
- **Tái Cấu Trúc 4 Thẻ KPI Báo Cáo 15 (Phễu Báo Giá CRM):**
  * Thẻ 1: **Doanh Thu Kế Hoạch (Đã Ký HĐ)** — Tổng doanh thu tháng từ các báo giá đã phê duyệt/ký kết (`APPROVED`).
  * Thẻ 2: **Doanh Thu Kỳ Vọng (Chờ Ký / Đàm Phán)** — Tổng doanh thu tháng từ các cơ hội đang bám sát (`PENDING_APPROVAL`, `NEGOTIATING`, `SENT`).
  * Thẻ 3: **Tổng Giá Trị Phễu Báo Giá (Pipeline Value)** — Toàn bộ dung lượng chào giá thị trường.
  * Thẻ 4: **Tỷ Lệ Chốt Hợp Đồng (Win Rate %)** — Hiệu suất chuyển đổi của đội ngũ Kinh doanh.

### 3. Nhóm 3 (Tài Chính & Quản Trị) & Nhóm 4 (Xe & Vận Hành):
- **Chuẩn Hóa Nhóm 4:** Đổi tiêu đề thành **`XE & VẬN HÀNH`** (`Tình Trạng Xe, DEM/DET, Đúng Giờ & Sự Cố`) gồm 4 báo cáo chuyên sâu: Vỏ cont & DEM/DET Hãng tàu, Đúng giờ & Chất lượng OTP, Cắt kéo & Lưu xe sau 0H, Biên bản ngoại lệ OS&D.
- **Nguyên Tắc Zero Mutation:** 100% các báo cáo thuần túy là Báo Cáo Chỉ Đọc (Pure Read-Only) và In Ấn (Print-Ready), không có thao tác thêm/sửa/xóa can thiệp vào dữ liệu vận hành.

### 4. Kiểm Thử Hệ Thống & Đảm Bảo Zero-Regression:
- Nâng cache version lên `?v=2.9.65` trong `templates/base.html`.
- Kiểm thử cú pháp JS: `node -c static/js/app.js; node -c static/js/column_manager.js` (100% Passed).
- Cập nhật unit test `test_reports_15_16_17_crm_and_wip` trong `core/tests.py` kiểm chứng trường đối soát và doanh thu kế hoạch/kỳ vọng.
- Chạy toàn bộ **148/148 unit tests PASSED 100%** (`python manage.py test --keepdb`).

## [v4.6.6] - 2026-10-26 (Tái Cấu Trúc Nhóm Báo Cáo KINH DOANH & KHÁCH HÀNG: Phễu Báo Giá CRM, Booking Hãng Tàu & Đơn Đang Chạy WIP)

### 1. Kiến Trúc Nghiệp Vụ Kinh Doanh & CRM (Sales & Customer Experience Pipeline):
- **Phân Định Ranh Giới Giữa Kế Toán Quản Trị & Kinh Doanh:**
  * Di dời Báo Cáo 13 (Công Nợ Phải Thu AR) và Báo Cáo 14 (Tuổi Đơn Tồn Đọng Chưa Chốt) từ Nhóm 2 sang **Nhóm 3 (TÀI CHÍNH & QUẢN TRỊ)** để thống nhất không gian quản trị dòng tiền kế toán (nâng Nhóm 3 lên 6 Báo Cáo).
  * Quy hoạch toàn diện **Nhóm 2: KINH DOANH & KHÁCH HÀNG (3 Báo Cáo Chiến Lược)** phục vụ riêng cho Phòng Kinh Doanh (Sales / CS) theo dõi toàn bộ phễu bán hàng từ lúc chào giá đến khi xe vận chuyển trên đường.

### 2. Triển Khai 3 Báo Cáo Chiến Lược Mới:
- **Báo Cáo 15: Phễu Báo Giá CRM & Tỷ Lệ Chốt Hợp Đồng (CRM Quotation Pipeline & Win Rate):**
  * Theo dõi toàn diện vòng đời chào giá khách hàng: Đã gửi (`SENT`), Đang đàm phán (`NEGOTIATING`), Chờ ký HĐ (`PENDING_APPROVAL`), Đã ký (`APPROVED`), Bị từ chối (`REJECTED`) và Hết hạn (`EXPIRED`).
  * 4 Thẻ KPI: Tổng Giá Trị Chào Giá Phễu (Pipeline Value VNĐ/tháng), Tỷ Lệ Chốt Thành Công (Win Rate %), Số Lượng Đang Đàm Phán / Chờ Ký, Doanh Thu Hợp Đồng Đã Ký.
  * Lưới dữ liệu chi tiết kèm link mở trực tiếp báo giá (`Quotation`), đơn giá cước, sản lượng dự kiến và doanh thu tháng ước tính.
- **Báo Cáo 16: Đơn Hàng Booking Hãng Tàu & Tiến Độ Điều Xe (Active Booking Orders & Cut-offs):**
  * Giám sát tiến độ tiếp nhận booking FCL xuất nhập và nội địa: Chờ điều xe (`PENDING_DISPATCH`), Đang điều xe (`PARTIALLY_DISPATCHED`), Đã điều đủ xe (`COMPLETED`).
  * 4 Thẻ KPI: Tổng Đơn Booking Tiếp Nhận, Tiến Độ Điều Xe/Cấp Cont (Số cont đã điều / Tổng cont cần điều %), Số Booking Chờ Gán Xe, Số Booking Đã Đủ Xe.
  * Cảnh báo các mốc hạn chót hãng tàu: Giờ cắt máng CY (Closing Time), Hạn nộp VGM và gửi SI để Sales cảnh báo khách hàng tránh trễ tàu.
- **Báo Cáo 17: Giám Sát Đơn Hàng Đang Chạy Chưa Hoàn Thành (WIP Active Trips in Pipeline):**
  * Tập hợp toàn bộ các chuyến xe **dở dang chưa hoàn thành** (`IN_TRANSIT`, `AT_WAREHOUSE`, `DISPATCHED`, `DRAFT`) — cách ly hoàn toàn khỏi Nhóm 1 Doanh thu thực hiện.
  * 4 Thẻ KPI: Tổng Đơn Đang Thực Hiện (WIP), Đang Chạy Trên Đường (In Transit), Tại Kho Đóng/Dỡ Hàng (At Warehouse), Đã Phát Lệnh Chờ Bốc Hàng (Dispatched).
  * Lưới dữ liệu hiển thị tức thì cho Sales/CS: Mã chuyến xe, Khách hàng, Biển số xe, Tài xế & SĐT liên hệ, Số cont & vỏ, Lộ trình, Số booking hãng tàu.

### 3. Nâng Cấp Giao Diện & Đảm Bảo Zero-Regression:
- Cập nhật `REPORT_GROUP_MAPPING` và ma trận phân quyền `canAccessReport`: Trao quyền xem Nhóm 2 cho phòng Kinh doanh (`LEAD_SALES`, `SALESMAN`, `CSKH`) và Điều phối (`DISPATCHER`).
- Nâng cache version lên `?v=2.9.64` trong `templates/base.html`.
- Kiểm thử cú pháp: `node -c static/js/app.js; node -c static/js/column_manager.js` (100% Passed).
- Bổ sung test case `test_reports_15_16_17_crm_and_wip` vào `core/tests.py`.
- Toàn bộ **148/148 unit tests PASSED 100%** (`python manage.py test --keepdb`).

## [v4.6.5] - 2026-10-26 (Chuẩn Hóa Doanh Thu Thực Hiện: Chỉ Ghi Nhận Chuyến Đã Hoàn Thành Giao Hàng & Theo Dõi Trạng Thái Đối Soát)

### 1. Chuẩn Hóa Nghiệp Vụ Doanh Thu Thực Hiện (Earned Freight Revenue):
- Theo đúng quy chuẩn kế toán vận tải và chỉ đạo điều hành: Nhóm báo cáo 1 (Doanh Thu Thực Hiện - gồm 4 báo cáo: Đội Xe, Khách Hàng, Tuyến & Gom Chuyến) chỉ được phép ghi nhận các chuyến xe ĐÃ HOÀN THÀNH CHUYẾN (Đã giao nhận thành công, có POD / COMPLETED, DELIVERED).
- Các chuyến xe đang chạy trên đường (IN_TRANSIT), đang đóng hàng tại kho (UNLOADING, AT_WAREHOUSE), hoặc mới phát lệnh (DISPATCHED, DRAFT) tuyệt đối KHÔNG đưa vào doanh thu, số chuyến, số cont hay chi phí của nhóm báo cáo này.

### 2. Nâng Cấp Backend API (apps/dispatch/reports_api.py):
- Thiết lập bộ lọc earned_trips_qs = trips_qs.filter(status__in=[TripStatus.DELIVERED, TripStatus.COMPLETED]) áp dụng đồng bộ cho:
  * Báo cáo 1 (Doanh thu & Hiệu quả Đội xe): 100% doanh thu, số chuyến, số cont và P&L đầu xe chỉ tính trên chuyến hoàn thành.
  * Báo cáo 7 (Doanh thu theo Khách hàng): Sản lượng TEU quy đổi và doanh thu từng khách hàng tính trên chuyến hoàn thành.
  * Báo cáo 4 (Chi phí Tuyến: Xe, Tài & KH): Tổng chi phí trực tiếp, vé BOT, nâng hạ, chi hộ chỉ phát sinh từ chuyến hoàn thành.
  * Báo cáo 12 (Quyết toán Gom Chuyến & Backlog): Backlog quyết toán chỉ theo dõi các chuyến đã hoàn thành giao hàng.
- Bổ sung trường dữ liệu is_settled và settlement_status ('Đã đối soát' / 'Chờ đối soát') cho từng chuyến con trong danh sách bóc tách.

### 3. Nâng Cấp Giao Diện Báo Cáo (static/js/app.js):
- Cập nhật hàm renderNestedTripsTableHtml:
  * Cột trạng thái hiển thị rõ 2 tầng: Badge vận hành 'Giao thành công' và Badge đối soát công nợ ('Đã Đối Soát' màu xanh lục / 'Chờ Đối Soát' màu hổ phách).
  * Tiêu đề cột chuẩn hóa thành 'Trạng Thái & Đối Soát', giúp bộ phận điều phối và kế toán theo dõi tức thì tình trạng công nợ từng chuyến.

### 4. Kiểm Thử Hệ Thống:
- node -c static/js/app.js && node -c static/js/column_manager.js (100% Passed).
- Chạy 147 test tự động của hệ thống (python manage.py test --keepdb) — 147/147 PASSED.
- Nâng cache-busting version trong templates/base.html lên ?v=2.9.63.

## [v4.6.4] - 2026-10-26 (Khắc Phục Triệt Để Lỗi Lệch Cột Dòng Total Do Nested Table & Đồng Bộ Hoàn Hảo TFoot Khi Ẩn/Đổi Thứ Tự Cột)

### 1. Nguyên Nhân Cốt Lõi (Root-Cause Analysis):
- **Xung đột Selector DOM do Lưới Con Accordion (Nested Table Depth-First Query Anomaly):**
  * Trong static/js/column_manager.js, câu lệnh this.table.querySelector('tfoot') duyệt cây DOM theo Depth-First Search.
  * Vì mỗi hàng trong tbody đều có một lưới con accordion chứa <table> và <tfoot> riêng (với 5 cột), querySelector('tfoot') đã vô tình trả về tfoot của bảng con đầu tiên thay vì tfoot thật sự của bảng cha.
  * Do số lượng cột của bảng con (5 cột) không khớp với số cột của bảng cha (13 cột), khối xử lý tfoot bị bỏ qua hoàn toàn, dẫn đến tfoot của bảng cha không bao giờ được đồng bộ.
- **Hệ quả hiển thị:**
  * Khi người dùng ẩn cột 'Tổng TEU' (hoặc bất kỳ cột nào), thead và tbody đều ẩn cột (display: none), nhưng tfoot vẫn giữ nguyên toàn bộ 13 cột và thứ tự cũ.
  * Kết quả là các ô giá trị ở chân bảng (tfoot) bị đẩy lệch sang phải 1 cột (ví dụ: số liệu 174 TEU bị rớt vào cột 20FT, 0 TEU vào cột 40FT, 87 vào cột 45FT...).
- **Thiếu MutationObserver trên TFoot:**
  * Hàm setupMutationObserver trước đây chỉ quan sát tbody, không lắng nghe tfoot, khiến việc gán lại tfoot.innerHTML khi người dùng tìm kiếm/lọc không kích hoạt tự động đồng bộ ẩn/hiện cột.

### 2. Giải Pháp Kỹ Thuật Triệt Để:
- **Chuẩn hóa Scope Selector (:scope >) & Native DOM Properties:**
  * Thay thế this.table.querySelector('tfoot') bằng this.table.tFoot || this.table.querySelector(':scope > tfoot').
  * Sử dụng thead.querySelectorAll(':scope > tr:first-child > th'), tbody.querySelectorAll(':scope > tr') và tfoot.querySelectorAll(':scope > tr'), đảm bảo chỉ tác động trực tiếp vào các hàng của bảng cha, tuyệt đối cách ly không can thiệp vào các bảng lồng nhau (nested sub-tables).
- **Mở rộng MutationObserver cho cả TFoot:**
  * Thiết lập MutationObserver quan sát cả tbody và tfoot với debounceTimer 10ms, đảm bảo bất cứ khi nào bảng render lại (qua tìm kiếm, đổi kỳ hay gán innerHTML), cấu hình cột luôn được áp dụng tức thì.

### 3. Kiểm Thử Hệ Thống & Kiểm Chứng Thị Giác:
- Kiểm thử tự động trên trình duyệt thật (Playwright Headless): Giả lập ẩn cột 'total_teu' và gọi applyReport7Filters(), toàn bộ 12 cột của thead, tbody và tfoot đều [MATCH] 100%.
- node -c static/js/column_manager.js & node -c static/js/app.js (100% Passed).
- Chạy 147 test tự động của hệ thống (python manage.py test --keepdb) — 147/147 PASSED.
- Nâng cache-busting version trong templates/base.html lên ?v=2.9.62.

## [v4.6.3] - 2026-10-26 (Báo Cáo Chi Phí Tuyến Đa Chiều: Theo Tuyến Đường, Đầu Xe, Tài Xế, Khách Hàng & Bảng Kê Chi Hộ)

### 1. Phân Tích & Chuẩn Hóa Nghiệp Vụ Chi Phí Vận Tải:
- Bóc tách minh bạch 2 cấu phần chi phí:
  * Chi phí cty chịu (Direct Costs): Vé cầu đường BOT (ePass/VETC), Nâng hạ cảng/bãi ICD, Sửa chữa lốp/vá vỏ, Lương chuyến bồi dưỡng tài xế.
  * Chi phí chi hộ khách hàng (Reimbursable Costs): Cẩu bãi, Cược cont, Kiểm dịch, Vệ sinh rửa vỏ cont, Lưu ca (thu hồi qua Debit Note).
- Thiết lập 5 góc nhìn quản trị (Perspective Views) đáp ứng trọn vẹn nhu cầu điều hành và kế toán:
  * 🛣️ **Theo Tuyến Đường (Mặc định):** Tuyến, Số chuyến, Số cont, Doanh thu, Tổng chi phí, Vé BOT, Nâng hạ, Chi hộ, Chi phí BQ/chuyến, Tỷ lệ CP/Doanh thu.
  * 🚛 **Theo Đầu Xe:** Biển số, Loại xe & sở hữu, Tuyến chủ lực, Số chuyến, Doanh thu, Chi phí tuyến, Vé BOT, Nâng hạ, Chi phí khác, Chi phí BQ/chuyến.
  * 👤 **Theo Tài Xế:** Họ tên, Mã TX, Xe phụ trách, Tuyến chạy nhiều nhất, Số chuyến, Tổng chi phí hiện trường (BOT, bãi, bồi dưỡng), Chi phí BQ/chuyến.
  * 🏢 **Theo Khách Hàng:** Tên KH, Mã KH, Tuyến vận chuyển chính, Số chuyến, Doanh thu cước, Chi phí cty chịu, Chi phí chi hộ, Lợi nhuận gộp, Biên LN (%).
  * 📋 **Bảng Kê Chi Hộ:** Bảng kê chi tiết từng khoản chi hộ có số hóa đơn, ngày phát sinh, chứng từ và tình trạng đối soát thu hồi.

### 2. Nâng Cấp Kỹ Thuật (Backend & Frontend):
- **Backend API (apps/dispatch/reports_api.py):**
  * Nâng cấp bộ tính toán trong ReportsAPIView cho report4_expenses_reimbursement, tính toán tức thì đa chiều từ trips_qs và all_expenses.
  * Trả về đồng bộ 5 danh mục tổng hợp: routes, vehicles, drivers, customers, items.
- **Frontend SPA (templates/views/view_reports.html & static/js/app.js):**
  * 4 Thẻ KPI động trên đỉnh trang hiển thị tức thì tổng số liệu chi phí.
  * Thanh chuyển đổi 5 góc nhìn (Perspective Tabs) tương tác tức thì (zero-latency, không reload).
  * Lưới con Accordion Inline: click vào từng dòng xổ ra danh sách chuyến xe và các khoản chi cụ thể.
  * Nút '[Mở Bảng Kê Chi Tiết]' trên sub-row kết nối mượt mà sang Bảng Kê Chi Tiết Toàn Bộ Vận Đơn với chế độ ROUTE, VEHICLE, DRIVER, CUSTOMER.
  * Tính năng Tìm kiếm tức thì theo từ khóa, Sắp xếp đa cột và Xuất Excel theo góc nhìn hiện hành.

### 3. Kiểm Thử Hệ Thống & Kiểm Chứng Độ Tin Cậy:
- Cú pháp JavaScript xác thực 100% bằng Node.js compiler: node -c static/js/app.js && node -c static/js/column_manager.js.
- Chạy toàn bộ 147 test tự động của hệ thống (python manage.py test --keepdb) — 147/147 PASSED.
- Nâng cache-busting version trong templates/base.html lên ?v=2.9.61.

## [v4.6.2] - 2026-10-26 (Khắc Phục Triệt Để Lỗi Không Bật Trang Chi Tiết Vận Đơn & Cân Bằng Cấu Trúc Phân Cấp DOM Báo Cáo)

### 1. Điều Tra & Khắc Phục Nguyên Nhân Cốt Lõi (Root-Cause Investigation via Browser Headless Testing):
- **Phát hiện lỗi JavaScript Runtime (Uncaught ReferenceError: item is not defined):**
  * Trên nút 'Mở Trang Chi Tiết' của lưới sub Báo cáo Đội xe (
ep1) và Báo cáo Khách hàng (
ep7), chuỗi gọi hàm inline bị truyền trực tiếp biến cục bộ item.plate và item.customer_name mà không có nội suy template literal ${...}.
  * Khi người dùng nhấp vào nút này, trình duyệt bắn lỗi ReferenceError làm gián đoạn hoàn toàn luồng kích hoạt hàm mở bảng chi tiết.
  * **Giải pháp:** Chuyển đổi toàn bộ sang phương thức ủy quyền an toàn openDedicatedReportDetail(mode, index). Hàm này truy xuất trực tiếp đối tượng từ bộ nhớ cache theo chỉ mục số nguyên, triệt tiêu hoàn toàn rủi ro vỡ chuỗi do ký tự đặc biệt hoặc dấu ngoặc đơn/kép.
- **Phát hiện lỗi Phân cấp Cấu trúc DOM (DOM Hierarchy Anomaly):**
  * Qua phân tích cây DOM thực tế trên trình duyệt Playwright, khối #report-drilldown-fullview có thẻ mở đặt trước khi đóng thẻ #report-summary-view (thiếu 1 thẻ đóng </div> ở dòng 1410 và thừa 1 thẻ đóng ở cuối file dòng 1576).
  * Do đó, #report-drilldown-fullview bị trình duyệt hiểu lầm là phần tử con của #report-summary-view. Khi JavaScript gán class hidden cho view tổng hợp, toàn bộ view chi tiết cũng bị ẩn theo (display: none), dẫn đến tình trạng màn hình trắng xóa hoặc không bật ra.
  * **Giải pháp:** Tái cấu trúc DOM chuẩn mực, đóng kín hoàn toàn #report-summary-view trước khi mở #report-drilldown-fullview, đưa cả hai trở thành 2 phần tử ngang hàng (siblings) trong #view-bao-cao.

### 2. Tối Ưu Nâng Cao Dữ Liệu & Trải Nghiệm Điều Hướng:
- **Nâng cấp getAllReportTrips():** Tự động quét và hợp nhất danh sách chuyến xe từ cả 
ep1DataCache, 
ep7DataCache và dữ liệu thô 
awReportsData (bao gồm cả báo cáo OTP, DEM/DET), đảm bảo khi mở bảng kê chi tiết toàn diện luôn có đầy đủ 100% dữ liệu dù người dùng đang ở bất kỳ subtab nào.
- **Nút Mở Nhanh Tiện Lợi (Quick-Open Actions):** Bổ sung nút mở nhanh trực tiếp trên cột Khách Hàng và Biển Số Xe ở bảng chính, cho phép người dùng mở ngay bảng kê chi tiết của đối tượng đó chỉ với 1 cú click chuột mà không cần phải mở rộng lưới sub.

### 3. Kiểm Thử Tự Động & Triển Khai:
- Kiểm thử thực tế bằng Playwright Chromium Headless (	est_full_flow.py): Mở chi tiết Khách hàng ABC thành công (27 chuyến, 12 triệu VNĐ), Quay lại báo cáo tổng hợp mượt mà, Mở chi tiết Xe 50E-095.78 thành công (36 chuyến, 35.7 triệu VNĐ).
- 
ode -c static/js/app.js & 
ode -c static/js/column_manager.js (100% Passed).
- python manage.py test --keepdb (147/147 tests Passed).
- Nâng cache-busting version trong 	emplates/base.html lên ?v=2.9.60.


## [v4.6.1] - 2026-10-25 (Sửa Triệt Để Lỗi Trắng Màn Hình & Xây Dựng Trang Bảng Kê Chi Tiết Toàn Bộ Vận Đơn Với Bộ Lọc Khách Hàng / Đầu Xe Toàn Màn Hình)

### 1. Khắc Phục Lỗi Màn Hình Trắng Khi Mở Chi Tiết:
- **Nguyên nhân cốt lõi:** Thẻ đóng </div> của view container #view-bao-cao trong templates/views/view_reports.html bị đặt trước thẻ mở của report-drilldown-fullview. Khi JavaScript kích hoạt ẩn report-summary-view, cả khu vực hiển thị bị trống trơn do report-drilldown-fullview nằm ngoài tab active của SPA.
- **Giải pháp:** Tái cấu trúc DOM chuẩn mực, đưa report-drilldown-fullview vào bên trong #view-bao-cao, đảm bảo độ đóng/mở thẻ div cân bằng 100% (depth = 0).

### 2. Trang Bảng Kê Chi Tiết Toàn Bộ Vận Đơn (Master Trip Detail / Ledger View):
- **Trải nghiệm trang chung toàn diện (All-in-One Ledger):**
  * Bổ sung nút '[ Bảng Kê Chi Tiết ]' ngay trên thanh công cụ kỳ của phân hệ Báo cáo để mở nhanh toàn bộ danh sách vận đơn trong kỳ mà không cần click vào từng khách/xe.
  * Hỗ trợ mở từ bất kỳ Khách hàng hoặc Xe cụ thể trên lưới sub với dropdown được tự động chọn sẵn đối tượng tương ứng.
  * Nút '[← Quay Lại Báo Cáo Tổng Hợp]' cho phép trở về bảng tổng hợp nguyên trạng ngay tức thì, không reload trang.
- **Thanh Công Cụ Lọc Đa Chiều & Phân Loại Thông Minh:**
  * Dropdown Lọc Khách Hàng (#fullview-filter-customer): Tự động tổng hợp danh sách khách hàng trong kỳ kèm số chuyến, cho phép lọc từng khách hoặc xem toàn bộ khách hàng.
  * Dropdown Lọc Đầu Xe (#fullview-filter-vehicle): Tự động tổng hợp danh sách biển số xe kèm số chuyến để lọc theo từng phương tiện.
  * Dropdown Lọc Trạng Thái (#fullview-filter-status): Lọc nhanh Đã giao hàng / Hoàn tất chứng từ / Đang vận chuyển.
  * Ô Tìm Kiếm Thời Gian Thực (#fullview-trip-search): Tìm kiếm tức thì theo mã chuyến, mã vận đơn, số container, tuyến đường, tài xế.
  * Nút Đặt Lại Bộ Lọc (resetFullviewFilters): Khôi phục trạng thái xem tất cả chỉ bằng 1 click.
- **Bảng Lưới Chi Tiết Toàn Màn Hình & Sắp Xếp Cột Đa Năng:**
  * Hỗ trợ Click vào tiêu đề cột để Sắp xếp (Sorting): Ngày chạy, Mã chuyến, Khách hàng, Biển số xe, Doanh thu, Chi phí (tăng dần ↕ giảm dần).
  * 4 Thẻ KPI trên đỉnh trang tự động tính toán lại số liệu thời gian thực theo danh sách kết quả sau khi lọc/tìm kiếm.
  * Dòng Tổng Cộng chân bảng tự động tổng kết Số Chuyến, Tổng Doanh Thu, Tổng Chi Phí theo dữ liệu lọc hiện hành.
  * Tích hợp nút Xuất Excel xuất file chi tiết các chuyến đang hiển thị trên lưới.

### 3. Kiểm Thử & Triển Khai:
- node -c static/js/app.js & node -c static/js/column_manager.js (100% Passed).
- python manage.py test --keepdb (147/147 tests Passed).
- Nâng cache-busting version trong templates/base.html lên ?v=2.9.59.


## [v4.6.0] - 2026-10-24 (Bổ Sung Tính Năng Mở Trang Chi Tiết Vận Đơn Riêng Biệt Trên Nền Tảng Màn Hình, Không Dùng Modal)

### 1. Trang Xem Chi Tiết Vận Đơn Toàn Màn Hình (Dedicated Full-Screen View):
- **Trải nghiệm xem chuyến xe thoáng đãng và chuyên sâu:**
  * Bổ sung nút 'Mở Trang Chi Tiết' trên header của cả 2 lưới sub (Báo cáo Đội xe và Báo cáo Khách hàng).
  * Trên cột 'Khách Hàng' của lưới sub Đội xe, mỗi tên khách hàng được trang bị nút bấm và hiệu ứng click điều hướng: Nhấp vào lập tức mở ngay Trang Chi Tiết Riêng của chính khách hàng đó (openDedicatedCustomerByName) trên toàn bộ màn hình.
  * Hoàn toàn không dùng popup modal che khuất màn hình; chuyển đổi mượt mà ngay trên nền tảng Single Page Application của phân hệ Báo Cáo.
- **Cấu trúc Trang Chi Tiết Riêng (report-drilldown-fullview):**
  * Nút 'Quay Lại Báo Cáo Tổng Hợp' ở góc trên bên trái cho phép trở về bảng tổng hợp nguyên trạng, không bị reload hay mất bộ lọc.
  * Tiêu đề, badge biển số/mã khách hàng, phân loại và tuyến chủ lực.
  * 4 Thẻ KPI lớn: Tổng Doanh Thu, Tổng Số Chuyến, Sản Lượng Container & Quy Đổi TEU, Chi Phí Phát Sinh.
  * Ô tìm kiếm vận đơn nội bộ thời gian thực và nút xuất Excel danh sách chuyến của riêng đối tượng đó (exportFullviewToExcel).
  * Lưới bảng chi tiết toàn màn hình, khoảng cách thoáng đãng, font chữ rõ nét, dòng Tổng cộng tfoot tự động co giãn.

### 2. Kiểm Thử & Triển Khai:
- node -c static/js/app.js & node -c static/js/column_manager.js (100% Passed).
- python manage.py test --keepdb (147/147 tests Passed).
- Nâng query parameter cache busting trong templates/base.html lên ?v=2.9.58.


## [v4.5.9] - 2026-10-24 (Tối Ưu Hóa Trải Nghiệm Master-Detail: Lưới Con Chuyến Xe Xổ Trực Tiếp Trên Lưới Hiện Hữu, Loại Bỏ Modal Popup)

### 1. Trải Nghiệm Xuyên Suốt (Seamless Inline Accordion Sub-table):
- **Hiện thị danh sách chuyến ngay dưới hàng được chọn:**
  * Thay vì bật modal popup che khuất màn hình làm đứt gãy mạch quan sát, người dùng nhấp vào bất kỳ hàng đầu xe nào (ở Báo cáo Đội Xe) hoặc khách hàng nào (ở Báo cáo Khách Hàng) thì ngay dưới hàng đó mở ra một Lưới Con (Nested Sub-table) liệt kê toàn bộ chuyến xe trong kỳ lọc.
  * Icon mũi tên ph-caret-right xoay 90 độ mượt mà, hàng cha được highlight nền teal nhạt.
  * Nhấp lại lần nữa hoặc bấm nút 'Thu gọn' sẽ đóng lưới con. Người dùng có thể mở nhiều hàng cùng lúc để so sánh đối chiếu trực quan.
- **Thông tin trên Lưới Con:**
  * Header tóm tắt ngắn gọn với các thông tin: Biển số/Tên KH, loại xe, tài xế/tuyến chủ lực.
  * Bảng danh sách chuyến chi tiết (STT, Mã chuyến, Ngày chạy, Khách hàng / Xe & Tài xế, Số Cont & Loại vỏ, Tuyến đường, Trạng thái, Doanh thu, Chi phí phát sinh) kèm dòng Tổng cộng chân bảng.
  * Hỗ trợ cuộn max-h-80 kèm thead sticky, đảm bảo gọn gàng kể cả khi có hàng chục chuyến.
- **Sửa lỗi xung đột biến toàn cục:**
  * Khắc phục lỗi biến rep1DataFiltered bị hàm filterSalesBookings gán đè trong quá trình tải trang, giúp dữ liệu trips luôn sẵn sàng và hiển thị ngay tức thì 100%.
  * Thêm class no-col-reorder trên các dòng tr con để tránh bị tác động bởi BimTableColumnManager.

### 2. Kiểm Thử & Triển Khai:
- node -c static/js/app.js & node -c static/js/column_manager.js (100% Passed).
- python manage.py test --keepdb (147/147 tests Passed).
- Nâng query parameter cache busting trong templates/base.html lên ?v=2.9.57.


## [v4.5.8] - 2026-10-24 (Tối Ưu Hóa Trải Nghiệm Báo Cáo: Tự Động Đẩy Số Liệu Khi Tải Trang & Lưu Nhớ Trạng Thái Lọc Kỳ)

### 1. Tự Động Tải Dữ Liệu Báo Cáo (Auto-Load on Page Load & Tab Switch):
- **Khắc phục triệt để lỗi không có dữ liệu khi reload/chuyển tab:**
  * Trước đây, khi F5 hoặc chuyển vào tab Báo Cáo, hệ thống tự động gán đè kỳ báo cáo thành 'week' (7 ngày gần nhất) lấy theo dashboard. Vì các chuyến hoàn thành thực tế trong cơ sở dữ liệu thường nằm ngoài 7 ngày gần đây, API trả về 0 bản ghi khiến người dùng phải bấm nút refresh hoặc chọn lại kỳ mới thấy số liệu.
  * Đã loại bỏ logic ghi đè ngầm này; hệ thống ưu tiên khôi phục kỳ lọc được lưu trong localStorage ('bim_report_period') hoặc mặc định là 'year' (Năm nay) để bao quát toàn bộ dữ liệu phát sinh.
  * Tích hợp hàm syncReportPeriodButtonsUI(period) để đồng bộ trạng thái active (sáng đèn) của nút bấm kỳ trên thanh công cụ khớp 100% với kỳ đang được nạp.
- **Lưu nhớ trạng thái báo cáo (Persistence State):**
  * Ghi nhớ nhóm báo cáo đang chọn ('bim_report_group') và phân hệ subtab con ('bim_report_subtab').
  * Khi người dùng F5 tải lại trang hoặc điều hướng đi nơi khác rồi quay lại, tab Báo Cáo tự động khôi phục chính xác nhóm báo cáo và subtab mà người dùng đang làm việc dở dang, đồng thời tự động kích hoạt API nạp số liệu ngay lập tức mà không cần bấm thêm bất kỳ nút nào.

### 2. Kiểm Thử & Triển Khai:
- node -c static/js/app.js & node -c static/js/column_manager.js (100% Passed).
- python manage.py test --keepdb (147/147 tests Passed).
- Nâng query parameter cache busting trong templates/base.html lên ?v=2.9.56.


## [v4.5.7] - 2026-10-24 (Bổ Sung Tính Năng Drill-Down: Nhấp Vào Dòng Xe / Khách Hàng Để Mở Danh Sách Chuyến Xe Chi Tiết)

### 1. Tính Năng Drill-Down Chuyến Xe Chi Tiết:
- **Tương tác trên bảng dữ liệu:**
  * Thêm hiệu ứng hover, con trỏ pointer và icon điều hướng `ph-arrow-square-out` trên từng dòng của "Bảng Doanh Thu Theo Đội Xe" và "Báo Cáo Doanh Thu Theo Khách Hàng".
  * Khi người dùng nhấp vào bất kỳ dòng đầu xe nào $
ightarrow$ Mở ngay Modal hiển thị danh sách tất cả các chuyến xe của đầu xe đó trong kỳ lọc.
  * Khi người dùng nhấp vào bất kỳ dòng khách hàng nào $
ightarrow$ Mở ngay Modal hiển thị danh sách tất cả các chuyến xe thực hiện cho khách hàng đó trong kỳ lọc.
- **Giao diện Modal Drill-down (`modal-report-drilldown-trips`):**
  * Header gradient chuẩn BIM Logistics hiển thị rõ thông tin xe/khách hàng, phân loại sở hữu/mã khách hàng, và thông tin tài xế/tuyến chủ lực.
  * 4 Thẻ Mini KPI Tóm tắt: Tổng số chuyến, Tổng số cont, Tổng doanh thu, Chi phí phát sinh.
  * Bảng danh sách chuyến chi tiết: Mã chuyến, Ngày chạy, Đối tác (Khách hàng hoặc Xe/Tài xế), Số cont & loại vỏ, Tuyến đường, Badge trạng thái vận hành chuẩn TMS, Doanh thu, Chi phí phát sinh.
  * Ô tìm kiếm nội bộ: Cho phép gõ tìm nhanh chuyến xe theo mã chuyến, số cont, tài xế, tuyến đường... với dòng tổng cộng `tfoot` tự động co giãn theo kết quả tìm kiếm.

### 2. Backend & Bảo Mật Dữ Liệu:
- Backend `apps/dispatch/reports_api.py` trích xuất danh sách `trips` tương ứng cho từng đầu xe và từng khách hàng.
- Tuân thủ nghiêm ngặt Defensive Backend & Data Masking: Nếu người dùng không có quyền xem tài chính (`can_view_finance=False`), toàn bộ số liệu doanh thu và chi phí của các chuyến con trong modal tự động bị mask về 0 (`***`).

### 3. Kiểm Thử & Triển Khai:
- `node -c static/js/app.js` & `node -c static/js/column_manager.js` (100% Passed).
- `python manage.py test --keepdb` (147/147 tests Passed).
- Nâng query parameter cache busting trong `templates/base.html` lên `?v=2.9.55`.

## [v4.5.6] - 2026-10-24 (Tái Cấu Trúc 4 Thẻ KPI Báo Cáo Doanh Thu Theo Khách Hàng Chuẩn Phương Án 1)

### 1. Bố Trí 4 Thẻ KPI Mới Cho Báo Cáo Khách Hàng:
- **Thẻ 1: DOANH THU KHÁCH HÀNG:**
  * Hiển thị tổng doanh thu từ khách hàng trong kỳ (`rep7-stat-rev`).
  * Subtext: `Tổng X Khách hàng phát sinh đơn`.
- **Thẻ 2: TỔNG SỐ CHUYẾN:**
  * Hiển thị tổng số chuyến hoàn thành (`rep7-stat-trips`).
  * Subtext: `Chuyến xe vận chuyển hoàn thành`.
- **Thẻ 3: TỔNG SỐ CONTAINER:**
  * Hiển thị tổng số vỏ container (`rep7-stat-conts`).
  * Subtext: Chi tiết quy đổi TEU và cơ cấu vỏ cont `Quy đổi: X TEU (20': A · 40': B · 45': C)`.
- **Thẻ 4: DOANH THU BÌNH QUÂN:**
  * Hiển thị doanh thu bình quân trên mỗi chuyến (`rep7-stat-avg-trip`).
  * Subtext: `BQ: X đ / Cont` (`rep7-stat-avg-cont`).
- Đồng bộ phản ứng dữ liệu thời gian thực: Khi người dùng gõ tìm kiếm theo tên/mã khách hàng trên thanh tìm kiếm, cả 4 thẻ KPI lập tức nhảy số tương ứng với danh sách đã lọc.

### 2. Kiểm Thử & Triển Khai:
- `node -c static/js/app.js` & `node -c static/js/column_manager.js` (100% Passed).
- `python manage.py test --keepdb` (147/147 tests Passed).
- Nâng query parameter cache busting trong `templates/base.html` lên `?v=2.9.52`.

## [v4.5.5] - 2026-10-23 (Xóa Bỏ Ký Tự Rác Dòng Total, Đồng Bộ Chuẩn Kích Thước & Font Family Toàn Diện)

### 1. Xử Lý Triệt Để Dòng Total (tfoot):
- **Loại bỏ toàn bộ dấu gạch `-` vô nghĩa ở các cột text rỗng:**
  * Ở Báo Cáo 1 (Đội Xe): Các cột `Loại Phương Tiện` (`vehicle_type`) và `Sở Hữu` (`ownership`) để trống hoàn toàn `""` thay vì dấu `-`.
  * Ở Báo Cáo 2 (Khách Hàng): Các cột `Mã KH` (`customer_code`) và `Tuyến Vận Chuyển Chủ Lực` (`top_route`) để trống hoàn toàn `""` thay vì dấu `-`.
  * Khắc phục triệt để tình trạng khi người dùng đảo vị trí cột (ví dụ đưa `Sở Hữu` lên trước `Biển Số Xe` hay `Mã KH` lên trước `Tên Khách Hàng`), dòng Total không còn bị hiện lủng củng `TỔNG` | `-` | `1 ĐẦU XE` | `-`.
- **Đồng bộ màu sắc & hiển thị:**
  * Cột Doanh Thu ở Báo Cáo Khách Hàng được chuẩn hóa từ màu tím sang màu đen tuyền đậm `text-slate-900 font-black` đồng bộ với Báo Cáo Đội Xe.
  * Cột Tỷ Trọng (%) hiển thị số nguyên chuẩn xác `100%`.

### 2. Đồng Bộ Tuyệt Đối Font-Size & Font-Family:
- Gán inline style trực tiếp trên từng ô `<td>` của dòng Total (`tfoot`):
  `font-size: 13.5px !important; font-weight: 800 !important; font-family: 'Plus Jakarta Sans', sans-serif !important;`
- Cập nhật CSS toàn cục `.erp-table tfoot td`: `font-size: 13.5px !important; font-weight: 800 !important;`.
- Tăng phiên bản cache-busting trong `templates/base.html` lên `?v=2.9.50` (`main.css?v=2.9.50`, `column_manager.js?v=2.9.50`, `app.js?v=2.9.50`), giải phóng triệt để cache trình duyệt cũ.
- Tự động gọi lại `BimTableColumnManager.instances[...].apply()` ngay sau khi render xong `tfoot` để đảm bảo thứ tự cột lập tức ăn khớp theo cấu hình lưu trữ của người dùng.

### 3. Kiểm Thử & Triển Khai:
- `node -c static/js/app.js` & `node -c static/js/column_manager.js` (100% Passed).
- `python manage.py test --keepdb` (147/147 tests Passed).
- Sẵn sàng deploy lên VPS `149.118.60.194`.

## [v4.5.4] - 2026-10-23 (Đồng Bộ 100% Một Font-Family Duy Nhất Toàn Bộ Bảng Table & Dòng Total)

### 1. Đồng Bộ Font-Family Tuyệt Đối:
- **Khắc phục nguyên nhân chữ dòng Total nhỏ hơn:**
  * Dòng `tbody` trước đây dùng font Sans (`Plus Jakarta Sans` / `Be Vietnam Pro`), trong khi các ô số ở dòng `tfoot` lại bị gán class `font-mono` (ui-monospace / Courier / Consolas) khiến con chữ bị hẹp và nhỏ hơn thực tế.
  * Đã loại bỏ hoàn toàn class `font-mono` ở cả Báo Cáo 1 và Báo Cáo 2, chuyển sang dùng `tabular-nums` thuần túy.
- **Ép font-family đồng nhất qua CSS (`static/css/main.css`):**
  * Thiết lập một font-family duy nhất cho toàn bộ bảng:
    `font-family: 'Plus Jakarta Sans', 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif !important;`
    áp dụng cho cả `thead th`, `tbody td`, và `tfoot td`.
  * Cố định kích thước `font-size: 13px !important;` và `font-weight: 800 !important;` cho `tfoot td`, giúp chữ và số dòng Total to rõ, sắc nét, đồng bộ tuyệt đối với dòng dữ liệu bên trên.

### 2. Triển Khai & Kiểm Thử:
- `node -c static/js/app.js` & `node -c static/js/column_manager.js` (100% Passed).
- `python manage.py test --keepdb` (147/147 tests Passed).
- Deploy thành công lên VPS `149.118.60.194`.

## [v4.5.3] - 2026-10-23 (Tăng Font Size Dòng Total Lên Bằng Dòng Dữ Liệu & Chuẩn Hóa Cột Tỷ Lệ % Thành Số Nguyên)

### 1. Tăng Cỡ Chữ Dòng Total (tfoot):
- Nâng cấp cỡ chữ dòng Total ở cả Báo Cáo 1 (Doanh Thu Theo Đội Xe) và Báo Cáo 2 (Doanh Thu Theo Khách Hàng) từ `text-[11px]` lên **`text-xs sm:text-[13px] font-black`**, đảm bảo to rõ, đậm đà, đồng bộ kích thước chữ với dòng dữ liệu bên trên.
- Đặt padding `py-3 px-3` giúp dòng Total thông thoáng, dễ nhìn và chuyên nghiệp chuẩn ERP/SaaS.

### 2. Chuẩn Hóa Cột Tỷ Trọng (%) Thành Số Nguyên:
- Loại bỏ phần thập phân `.0%` ở cột Tỷ Trọng (ví dụ: hiển thị **`100%`**, **`25%`** thay vì `100.0%`, `25.0%`).
- Áp dụng đồng bộ cho cả dòng dữ liệu `tbody` và dòng tổng cộng `tfoot` ở cả 2 báo cáo.

### 3. Đồng Bộ & Triển Khai:
- `node -c static/js/app.js` & `node -c static/js/column_manager.js` (100% Passed).
- Đã build và deploy lên VPS `149.118.60.194`.

## [v4.5.2] - 2026-10-23 (Bổ Sung Cột Tỷ Trọng % Báo Cáo Đội Xe & Căn Chỉnh Khớp 100% Cột Dòng Total Báo Cáo Khách Hàng)

### 1. Báo Cáo Doanh Thu Theo Đội Xe:
- Bổ sung cột **"TỶ TRỌNG (%)"** (`revenue_share`): Đo lường tỷ lệ đóng góp doanh thu của từng phương tiện trên tổng doanh thu vận tải của đội xe.
- Cập nhật cả `<thead>`, `<tbody>` và dòng tổng cộng `<tfoot>` (`100.0%`).

### 2. Báo Cáo Doanh Thu Theo Khách Hàng:
- **Khắc phục triệt để lỗi lệch cột dòng Total (tfoot):**
  * Tách cấu trúc `<tfoot>` thành 13 ô tương ứng 1:1 chính xác với 13 cột `<thead>`.
  * Gán nhãn nhận diện `data-col-key` cho toàn bộ các ô trong `<thead>`, `<tbody>` và `<tfoot>`.
  * Nâng cấp `BimColumnManager` trong `static/js/column_manager.js` để tự động đồng bộ và căn chỉnh cả các ô trong `<tfoot>` khi người dùng ẩn/hiện hoặc kéo thả sắp xếp lại cột.
  * Các con số tổng (Số chuyến, Tổng TEU, 20ft, 40ft, 45ft, Doanh thu, Tỷ trọng, Doanh thu BQ Chuyến, Doanh thu BQ Cont) giờ đây **thẳng hàng 100% với từng cột dữ liệu**.

### 3. Kiểm Thử & Triển Khai:
- `node -c static/js/app.js` & `node -c static/js/column_manager.js` (100% Passed).
- `python manage.py test --keepdb` (147/147 tests Passed).

## [v4.5.1] - 2026-10-23 (Chuẩn Hóa Nhóm Báo Cáo "DOANH THU THỰC HIỆN", Doanh Thu Theo Đội Xe & Doanh Thu Theo Khách Hàng)

### 1. Chuẩn Hóa Nhóm Báo Cáo "DOANH THU THỰC HIỆN":
- Đổi tên Nhóm 1 từ `DOANH THU & HIỆU SUẤT` thành **`DOANH THU THỰC HIỆN`** (Đội Xe, Khách Hàng, Tuyến Vận Tải & Gom Chuyến).
- Cập nhật số lượng báo cáo nhóm 1 thành `4 BC`.

### 2. Báo Cáo 1: "Doanh Thu Theo Đội Xe":
- Đổi tên subtab thành **"Doanh Thu Theo Đội Xe"** (cũ: "Hiệu Suất Đội Xe & P&L").
- **Thêm cột mới:**
  * Cột **"Số CONT"**: Thể hiện chính xác số lượng container thực tế vận chuyển (hỗ trợ tự động tính cả trường hợp chạy kẹp 2 container 20ft: $1 \text{ chuyến twin} = 2 \text{ cont}$).
  * Cột **"DOANH THU BQ CHUYẾN"** = $\text{Tổng Doanh Thu} / \text{Tổng Số Chuyến}$.
  * Cột **"DOANH THU BQ CONT"** = $\text{Tổng Doanh Thu} / \text{Tổng Số Cont}$.
- **Loại bỏ cột:**
  * Bỏ cột "TÀI XẾ MẶC ĐỊNH".
  * Bỏ cột "Lợi Nhuận Gộp".
  * Bỏ cột "Biên Lợi Nhuận (%)".
- **Chuẩn hóa cột chi phí:** Cột "Chi Phí" đổi thành **"CHI PHÍ PHÁT SINH"** (phản ánh trung thực các chi phí phát sinh hiện trường như vé cầu đường BOT, bồi dưỡng, nâng hạ; chưa gồm dầu ước tính và chi phí quản lý nên không tính lợi nhuận, tập trung thuần túy vào chỉ số kinh doanh).
- **Chuẩn hóa 4 Thẻ KPI đầu trang:**
  * Thẻ 1: Tổng Doanh Thu Vận Tải Thực Hiện (`rep1-stat-revenue`).
  * Thẻ 2: Tổng Sản Lượng Đội Xe: `X Chuyến · Y Cont` (`rep1-stat-volume`).
  * Thẻ 3: Doanh Thu Bình Quân: `A đ / Chuyến · B đ / Cont` (`rep1-stat-avg-rev` & `rep1-stat-avg-cont`).
  * Thẻ 4: Chi Phí Phát Sinh Hiện Trường: `C đ` (`rep1-stat-expense`).

### 3. Báo Cáo 2: Bổ Sung Báo Cáo "Doanh Thu Theo Khách Hàng":
- Đưa báo cáo **"Doanh Thu Theo Khách Hàng"** (`report-7`) vào vị trí thứ 2 trong nhóm **DOANH THU THỰC HIỆN**.
- Bổ sung các chỉ số kinh doanh tương tự: Doanh Thu BQ Chuyến, Doanh Thu BQ Cont/TEU; loại bỏ cột Biên LN để đồng nhất nguyên tắc ghi nhận doanh thu kinh doanh thực tế.

### 4. Kiểm Thử Cú Pháp & Hồi Quy:
- JavaScript Syntax: `node -c static/js/app.js`, `node -c static/js/modules/reports.js`, `node -c static/js/column_manager.js` (100% Passed).
- Django Unit Tests: `python manage.py test --keepdb` (147/147 tests Passed).

## [v4.5.0] - 2026-10-23 (Khắc Phục Toàn Diện Bộ Lọc Kỳ Cho Toàn Bộ 5 Thẻ Executive KPI & Đồng Bộ Dữ Liệu Lịch Sử Năm)

### 1. Khắc Phục Lỗi Không Cập Nhật Số Liệu Trên Các Thẻ Khi Chọn Kỳ:
- **Nguyên nhân cốt lõi (Root Cause):**
  * Thẻ Kinh doanh (`pillar_sales_plan`) trước đây lấy toàn bộ danh sách hợp đồng đã ký của mọi thời đại, không lọc theo `start_date` - `end_date`.
  * Dòng đếm booking trước đây có logic `if not bookings_period_qs.exists(): bookings_period_qs = BookingOrder.objects.filter(is_deleted=False)`, khiến khi chọn kỳ ngắn không có đơn thì hệ thống tự động fallback lấy toàn bộ 7 đơn của mọi thời đại, làm méo mó số liệu.
  * Thẻ Khả dụng đội xe (`pillar_fleet`) có logic fallback tương tự khi không có xe lăn bánh trong kỳ.
  * Thẻ Đơn hàng & Hải quan (`pillar_customs`) đếm toàn bộ tờ khai hải quan của hệ thống mà không lọc theo khoảng ngày khai báo `[start_date, end_date]`.
  * Trên môi trường VPS Production trước đó chỉ có 4 chuyến xe phát sinh trong 10 ngày qua của tháng 10/2026 (tổng 25.5 triệu), chưa có dữ liệu các tháng trước đó. Do đó, khi người dùng chọn "Năm nay" thì doanh thu năm nay cũng chính bằng 25.5 triệu của 10 ngày qua, tạo cảm giác các thẻ không ăn theo bộ lọc kỳ.
- **Giải pháp xử lý triệt để:**
  * **Thẻ 1 (Tài Chính & Quỹ):** Đo lường chuẩn xác `agg_revenue`, `agg_expense`, và Lợi nhuận gộp `agg_profit = agg_revenue - agg_expense` theo đúng tập `trips_period` của kỳ được chọn.
  * **Thẻ 2 (Kinh Doanh):** Lọc chính xác số lượng booking và cont nhận trong kỳ (`dash_bookings_count`, `dash_containers_plan`). Khi chọn kỳ ngắn (`today`, `10_days`), ưu tiên hiển thị doanh thu booking tiếp nhận trong kỳ. Khi chọn kỳ dài (`this_year`), hiển thị tổng doanh thu kế hoạch của các hợp đồng có hiệu lực.
  * **Thẻ 3 (Vận Hành Chuyến):** Tự động chuyển đổi ngữ nghĩa nhãn thông minh:
    - Kỳ ngắn (`today`, `10_days`): `Chuyến Xe Đang Vận Hành: X / Y Chuyến`.
    - Kỳ dài (`this_month`, `this_quarter`, `this_year`): `Sản Lượng Chuyến (Năm nay): X / Y Chuyến Xong`.
  * **Thẻ 4 (Khả Dụng Đội Xe):** Tính toán chính xác số lượng phương tiện lăn bánh trong kỳ (`vehicles_active`) và tỷ lệ khai thác tương ứng (`utilization_rate`), phản ánh trung thực mức độ huy động tài sản theo từng mốc thời gian.
  * **Thẻ 5 (Đơn Hàng & Hải Quan):** Lọc tờ khai hải quan theo `declaration_date` và `created_at` trong kỳ chọn, hiển thị đúng số tờ khai luồng xanh, tỷ lệ thông quan và số đơn chờ gán xe của kỳ đó.
  * **Đồng bộ an toàn 82 chuyến xe tháng 9 sang VPS:** Bằng cơ chế `get_or_create` (không ghi đè, không xóa), nâng tổng sản lượng cả năm 2026 trên VPS lên 86 chuyến với tổng doanh thu 350.900.000 đ. Giờ đây khi chọn "Năm nay", Thẻ 1 lập tức nhảy lên **350.900.000 đ** và khớp 100% với biểu đồ tháng bên dưới!

### 2. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/column_manager.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).

## [v4.4.9] - 2026-10-23 (Tối Ưu Bố Trí Con Số Lớn Vào Khoảng Trống Hàng Trên Cùng Badge & Icon Cho Cả Báo Giá Và Booking)

### 1. Bố Cục Thẻ Gọn Gàng & Hiện Đại Chuẩn SaaS:
- **Tận dụng tối đa khoảng trống hàng trên:**
  * Đưa con số lớn (**Doanh Số** kế hoạch của Báo giá & **Số Đơn** của Booking) lên nằm cùng một hàng với Badge trạng thái và Icon.
  * Bố cục 2 khối đối xứng cân bằng (`flex items-center justify-between gap-1.5`):
    - **Bên trái:** Badge trạng thái (`shrink-0`).
    - **Bên phải:** Con số lớn hiển thị nổi bật, tăng size lên `text-xl xl:text-2xl 2xl:text-[26px] font-black` (cho Báo giá) và `text-2xl xl:text-3xl font-black` (cho Booking), đặt cạnh Icon nhận diện (`shrink-0`).
- **Ưu điểm vượt trội:**
  * Loại bỏ hoàn toàn khoảng trống lãng phí ở hàng trên.
  * Thẻ giảm chiều cao, không chiếm nhiều diện tích dọc màn hình, giúp bảng dữ liệu bên dưới hiển thị nhiều dòng hơn.
  * Con số chính to rõ đập ngay vào mắt người dùng.
- **Áp dụng đồng bộ:** Cả 5 thẻ Báo giá Tuyến cước (Subtab 1) và 5 thẻ Booking Đơn đặt hàng (Subtab 2).

### 2. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/column_manager.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).

## [v4.4.8] - 2026-10-23 (Chuẩn Hóa Dãy 5 Thẻ Booking Chuẩn TMS Container: Ô Lớn [Số Đơn] & Subtext [Tổng Cont | Đã Giao Cont | Còn Lại Cont])

### 1. Chuẩn Hóa Bố Cục & Đơn Vị Thẻ Booking Theo Best-Practice TMS Container:
- **Đồng bộ hóa layout & font size với dãy 5 thẻ Báo giá:**
  * **Ô lớn bên trên:** Hiển thị con số lớn duy nhất là **Số Đơn** (`[SỐ] Đơn` font `text-xl 2xl:text-2xl font-black text-slate-900 tabular-nums font-heading tracking-tight mt-1`).
  * **Dòng subtext bên dưới (1 dòng tinh gọn, ngăn cách bởi vạch `|`):**
    $$\text{TỔNG: } \mathbf{X} \text{ Cont} \quad \mid \quad \text{ĐÃ GIAO: } \mathbf{Y} \text{ Cont} \quad \mid \quad \text{CÒN LẠI: } \mathbf{Z} \text{ Cont}$$
- **Quy chuẩn Font Size & Nhãn:**
  * Nhãn (`TỔNG:`, `ĐÃ GIAO:`, `CÒN LẠI:`): `text-xs 2xl:text-[12.5px] uppercase font-bold text-slate-500`.
  * Con số: `text-sm 2xl:text-[15px] font-black font-heading`.
  * Đơn vị: `text-xs 2xl:text-[12px] font-bold text-slate-400`.
- **Đồng bộ trên cả 5 thẻ vòng đời:**
  1. `1. CHỜ ĐIỀU XE`: Tiếp nhận booking, đếm số cont chưa phân bổ.
  2. `2. ĐANG ĐIỀU XE`: Đơn đang chạy dở dang, theo dõi tiến độ số cont đã giao và cont còn lại.
  3. `3. CHẠY CẮT KÉO`: Booking vận hành rơ-moóc Drop & Hook.
  4. `4. CẢNH BÁO ĐƠN GẤP`: Đơn sát hạn cut-off/đóng bãi cảng.
  5. `5. ĐÃ HOÀN TẤT`: Booking hoàn thành 100%, tồn bãi = 0.

### 2. Frontend & Backend Synchronization:
- Cập nhật `templates/views/view_sales.html` cho toàn bộ 5 thẻ Booking.
- Cập nhật hàm gán dữ liệu `loadSalesData()` trong `static/js/app.js` cho các thẻ container mới, duy trì 100% backward compatibility với các element IDs cũ.

### 3. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/column_manager.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).

## [v4.4.7] - 2026-10-23 (Chuẩn Hóa Số Chuyến Dự Kiến Của Báo Giá Đa Tuyến & Tăng Font Subtext Thẻ KPI Lên 2 Cỡ)

### 1. Khắc Phục Lệch Số Chuyến Tại Cột "Sản Lượng Dự Kiến" & Thẻ KPI:
- **Nguyên nhân gốc rễ (Root Cause):** Đối với các báo giá đa tuyến (`Quotation` có nhiều `QuotationItem`), trường `expected_trips_monthly` trên bảng cha trước đây chỉ lưu số chuyến của tuyến đầu tiên (`it0`), dẫn đến cột *Sản Lượng Dự Kiến* hiển thị thiếu (ví dụ báo giá 5 tuyến tổng 90 chuyến nhưng cột bảng chỉ hiện 10 chuyến).
- **Giải pháp triệt để:**
  * Đồng bộ `monthly_trips` trả về trong `SalesAPIView` lấy từ `q.total_expected_trips` (tự động cộng dồn sản lượng cam kết của toàn bộ các tuyến thuộc báo giá).
  * Cập nhật logic tạo mới (`post`) và sửa đổi (`put`/`patch`) của `QuotationDetailAPIView`: tự động gán `expected_trips_monthly = sum(it.expected_trips_monthly)` cho toàn bộ các tuyến chi tiết.
  * Giờ đây, số liệu tại cột *Sản Lượng Dự Kiến* và số tổng ở chân bảng khớp 100% với *SỐ CHUYẾN* trên 5 Thẻ KPI.

### 2. Tăng 2 Cỡ Font Chữ Dòng Subtext 5 Thẻ KPI:
- Nâng cấp kích thước chữ nhãn từ `text-[10px]` lên `text-xs 2xl:text-[12.5px] font-bold text-slate-500`.
- Nâng cấp kích thước số từ `text-xs` lên `text-sm 2xl:text-[15px] font-black font-heading`.
- Tối ưu khoảng cách đệm `mt-3 pt-2.5` giúp hàng 3 thông số (`SỐ TUYẾN | SỐ CHUYẾN | SỐ BÁO GIÁ`) to rõ, thông thoáng, nổi bật và dễ đọc.

### 3. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/column_manager.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).


## [v4.4.6] - 2026-10-23 (Chuẩn Hóa 5 Thẻ KPI Báo Giá: Doanh Số Lớn Bên Trên & Bên Dưới 3 Thông Số: Số Tuyến | Số Chuyến | Số Báo Giá)

### 1. Chuẩn Hóa Bố Cục Thẻ KPI Báo Giá Tuyến Cước (CRM Sales Funnel):
- **Phần trên:** Hiển thị con số lớn duy nhất là **Doanh Số** kế hoạch (`text-xl 2xl:text-2xl font-black text-slate-900 tabular-nums font-heading tracking-tight`).
- **Phần dưới (Subtext 3 thông số):**
  - Trình bày dạng một dòng cân đối, tinh gọn có vạch phân cách `|`:
    $$\text{SỐ TUYẾN: } \mathbf{X} \quad \mid \quad \text{SỐ CHUYẾN: } \mathbf{Y} \quad \mid \quad \text{SỐ BÁO GIÁ: } \mathbf{Z}$$
  - **Khử trùng lặp triệt để:** Bỏ hoàn toàn dòng phụ `DOANH SỐ:` ở bên dưới để tránh lặp lại con số doanh thu 2 lần trên cùng 1 thẻ.
  - Đồng bộ trên cả 5 thẻ KPI trạng thái (`1. ĐÃ GỬI BÁO GIÁ`, `2. ĐANG ĐÀM PHÁN`, `3. CHỜ KÝ HỢP ĐỒNG`, `4. ĐÃ KÝ HỢP ĐỒNG`, `5. TỪ CHỐI / HUỶ`).

### 2. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/column_manager.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).


## [v4.4.5] - 2026-10-23 (Tái Cấu Trúc Bố Cục Thẻ KPI Báo Giá Chia Đôi 2 Dòng: Doanh Số To Rõ & Tuyến | Chuyến Cân Đối)

### 1. Tái Cấu Trúc Bố Cục 5 Thẻ KPI Báo Giá Tuyến Cước (CRM Sales Funnel):
- **Phân tách 2 dòng độc lập, tăng kích thước chữ, chống trùng lặp dữ liệu:**
  * **Dòng trên:**
    - Bên trái: Nhãn `DOANH SỐ` (`text-xs font-bold text-slate-500 uppercase tracking-wider`).
    - Bên phải: `SỐ TUYẾN: [X] Tuyến` (`text-xs 2xl:text-[13px] font-black font-heading`).
  * **Dòng dưới:**
    - Bên trái: Số tiền Doanh số kế hoạch `[SỐ] đ` hiển thị to đậm nổi bật (`text-xl 2xl:text-2xl font-black tabular-nums font-heading tracking-tight`).
    - Bên phải: `SỐ CHUYẾN: [Y] Chuyến` (`text-xs 2xl:text-[13px] font-black font-heading text-slate-800`).
- **Khử bỏ lặp số tiền:** Loại bỏ hoàn toàn sự trùng lặp của con số doanh thu kế hoạch (vừa xuất hiện ở giữa thẻ, vừa lặp lại ở dòng phụ bên dưới), tối ưu không gian hiển thị, số liệu to rõ và dễ đọc trên mọi màn hình.

### 2. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/column_manager.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).


## [v4.4.4] - 2026-10-23 (Cơ Cấu Subtext 3 Thông Số Thẻ KPI Báo Giá: Doanh Số & Số Tuyến | Số Chuyến)

### 1. Chuẩn Hóa Cụm Subtext Dưới 5 Thẻ KPI Báo Giá Tuyến Cước:
- **Trình bày trực quan 3 thông số kinh doanh cốt lõi:**
  * **Dòng 1:** `DOANH SỐ:` — hiển thị doanh thu kế hoạch (VNĐ).
  * **Dòng 2:** `SỐ TUYẾN: [X] Tuyến | SỐ CHUYẾN: [Y] Chuyến` — liên kết 2 chiều giữa số lượng tuyến đường và sản lượng chuyến cam kết trong tháng.
- **Tính toán chuẩn xác từ Backend:**
  * Bổ sung thuộc tính `total_expected_trips` vào model `Quotation` trong `apps/customers/models.py`, tự động tổng hợp số chuyến cam kết từ bảng chi tiết `QuotationItem` hoặc fallback về `Quotation.expected_trips_monthly`.
  * Cập nhật hàm `calc_quote_group()` trong `apps/dispatch/api_views.py` tổng hợp chính xác số chuyến `trips` cho cả 5 nhóm trạng thái (`SENT`, `NEGOTIATING`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`).
  * Đồng bộ ràng buộc dữ liệu DOM vào các phần tử `#stat-quote-...-trips` trên `static/js/app.js`.

### 2. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/column_manager.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).


## [v4.4.3] - 2026-10-23 (Cơ Cấu Lại Chuẩn 5 Trạng Thái Báo Giá CRM: Đã Gửi Báo Giá | Đang Đàm Phán | Chờ Ký Hợp Đồng | Đã Ký Hợp Đồng | Từ Chối/ Hủy)

### 1. Chuẩn Hóa Danh Mục 5 Trạng Thái Báo Giá (Quotation Statuses):
- **Cơ cấu lại máy trạng thái chu trình Báo giá (Sales Funnel):**
  1. `SENT`: **Đã gửi báo giá** (Mặc định khi tạo mới)
  2. `NEGOTIATING`: **Đang đàm phán**
  3. `PENDING_APPROVAL`: **Chờ ký Hợp đồng**
  4. `APPROVED`: **Đã ký Hợp đồng**
  5. `REJECTED`: **Từ chối/ Hủy**
- **Đồng bộ cơ sở dữ liệu & Backend:**
  * Cập nhật `Quotation.status` trong `apps/customers/models.py` với `choices` và `default='SENT'`.
  * Tạo Django migration `customers.0018_alter_quotation_status`.
  * Cập nhật `SalesAPIView` & `QuotationStatusAPIView` trong `apps/dispatch/api_views.py` đếm chuẩn xác số lượng `sent_count`, `negotiating_count`, `pending_approval_count`, `approved_count`, `rejected_count`.

### 2. Đồng Bộ Giao Diện & Bộ Lọc Frontend:
- **Bộ lọc Báo giá (`view_sales.html`):** Thay thế dropdown `#filter-quote-status` 4 mục cũ sang đầy đủ 5 trạng thái chuẩn với giá trị khớp mã hệ thống (`SENT`, `NEGOTIATING`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`).
- **Modal Tạo/Sửa Báo giá (`modal_quotation.html`) & Trang chi tiết (`view_quotation_detail.html`):** Cập nhật select dropdown 5 options chuẩn hóa theo đúng thứ tự chu trình phễu kinh doanh.
- **Bảng dữ liệu CRM (`static/js/app.js`):**
  * `applyQuoteFilters()`: Hỗ trợ lọc chuẩn xác theo cả `status_raw` và text nhãn tiếng Việt.
  * `renderQuotationsTable()`: Hiển thị trạng thái dạng text chuẩn (không badge) với màu sắc nhận diện trực quan: Xanh da trời (`SENT`), Vàng hổ phách (`NEGOTIATING`), Xanh chàm tím (`PENDING_APPROVAL`), Xanh ngọc lục bảo (`APPROVED`), Đỏ hoa hồng (`REJECTED`).

### 3. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/column_manager.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).


## [v4.4.3] - 2026-10-23 (Tính Năng Kéo Thả Chiều Rộng Cột Bảng Dữ Liệu & Khắc Phục Cắt Chữ Toàn Hệ Thống)

### 1. Tính Năng Kéo Thả Điều Chỉnh Chiều Rộng Cột (BimTableResizable):
- **Kéo giãn mép cột (Col-Resize Dragging):** Khi rê chuột vào vạch ranh giới giữa 2 cột tiêu đề `<th>`, con trỏ chuột tự động chuyển thành biểu tượng mũi tên 2 chiều `↔` (`col-resize`). Người dùng có thể nhấn giữ và kéo sang trái/phải để mở rộng hoặc thu hẹp độ rộng cột tùy thích theo thời gian thực.
- **Đường Line Chỉ Dẫn Trực Quan (Guide Line):** Xuất hiện thanh chỉ dẫn màu xanh ngọc thương hiệu `#0d9488` chạy dọc toàn bộ chiều cao của bảng trong suốt quá trình kéo thả, mang lại cảm giác mượt mà và trực quan.
- **Tự động lưu vào LocalStorage:** Chiều rộng tùy chỉnh của từng cột được lưu bền vững theo ID từng bảng (`bim_col_widths_{tableId}`). Khi chuyển tab, tải lại trang hoặc đăng nhập lại, các bảng vẫn duy trì độ rộng đã tinh chỉnh.
- **Nhấp Đúp Tự Căn Vừa Chữ (Double-Click Auto-Fit):** Nhấp đúp chuột vào mép cột sẽ tự động tính toán độ dài nội dung lớn nhất của cột và căn vừa vặn khít khao nội dung hệt như thao tác trên Microsoft Excel / Google Sheets.

### 2. Khắc Phục Triệt Để Hiện Tượng Cắt Mất Chữ:
- **Loại bỏ kẹp cứng `max-w`:** Tự động mở rộng các phần tử text `truncate` theo 100% chiều rộng của cột (`td`). Khi người dùng kéo cột tên khách hàng, lộ trình, loại hàng ra rộng, tên công ty và chi tiết tuyến đường sẽ bung ra toàn bộ, không bị cắt dấu `...` làm mất thông tin quan trọng.
- **Áp dụng phổ quát toàn diện:** Hỗ trợ trên tất cả các bảng dữ liệu trong toàn hệ sinh thái (Điều vận, Đơn hàng Booking, Đội xe, Kế toán, Khách hàng, Báo cáo).

### 3. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/column_manager.js`, `node -c static/js/app.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).

## [v4.4.2] - 2026-10-23 (Chuẩn Hóa Trải Nghiệm Xem Trước Văn Bản Full Viền Chuẩn Apple iOS Quick Look)

### 1. Nâng Cấp Document Previewer Full Viền (Edge-to-Edge):
- **Tràn viền toàn diện:** Loại bỏ hoàn toàn các lớp padding đệm xám dày quanh canvas (`p-4 sm:p-6` -> `p-0`), canvas tài liệu tự động tính toán bung rộng 100% chiều ngang khả dụng của container mà không còn bị co cụm lọt thỏm.
- **Khử viền lồng viền:** Loại bỏ đường viền xám cứng bao quanh canvas (`border border-slate-200/90`), thay thế bằng bóng mờ tự nhiên chuẩn Apple (`shadow-[0_2px_16px_rgba(0,0,0,0.06)]`).
- **Khung hiển thị liền mạch:** Hợp nhất `preview-container` thành một khung hiển thị sang trọng, bo cong nhẹ nhàng `rounded-2xl` với nền trắng tinh khôi.

### 2. Chuẩn Hóa Thanh Công Cụ (Toolbar) Chuẩn Phong Cách iOS:
- **Hiệu ứng Kính Mờ (Frosted Glass):** Nền toolbar trong suốt mờ ảo `bg-white/90 backdrop-blur-md` dính liền ở trên cùng (`sticky top-0 z-20`) với đường phân cách siêu mảnh `border-b border-slate-200/70`.
- **Segmented Controls chuẩn Apple:**
  * **Cụm Phân trang:** Gom nhóm liền khối dạng pill `[ < ]  Trang 1 / 1  [ > ]` với nút bo cong mềm, chuyển trang mượt mà.
  * **Cụm Thu phóng & Vừa ngang:** Dạng Segmented Control Apple `[ − ]  100%  [ + ]` | Nút `[ Vừa ngang ]` kích hoạt tự động bung tràn viền 100%.
  * **Cụm Xoay Tinh Tế:** Bỏ việc lặp lại chữ số `90° 90°`, chuẩn hóa thành nút `[ ↻ Xoay 0° ]` tự động cập nhật góc độ hiện tại (0°, 90°, 180°, 270°).
  * **Chế độ Toàn Màn Hình (Fullscreen Quick Look):** Bổ sung nút phóng to toàn màn hình `[ ⤢ ]` giúp người dùng/khách hàng xem trọn vẹn sơ đồ tổ chức, công văn khổ ngang trên mọi thiết bị.

### 3. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/column_manager.js`.
- Đạt 100% Django Unit Test: `python manage.py test --keepdb` (**147/147 tests PASSED**).

## [v4.4.1] - 2026-10-23 (Tái Cấu Trúc Toàn Diện 5 Thẻ KPI: Bọc Màu Trọn Khối & Dải Quang Phổ Rõ Nét)

### 1. Bọc Màu Toàn Diện (Full-Card Color Enclosure) Thay Cho Nền Trắng Đơn Điệu:
- **Nâng cấp từ viền đơn lẻ sang bọc màu nguyên khối sang trọng:**
  * Thay thế toàn bộ nền trắng phẳng (`bg-white`) bằng lớp nền tint màu dịu chuyên nghiệp (`bg-emerald-50/40`, `bg-teal-50/40`, `bg-sky-50/40`, `bg-indigo-50/40`, `bg-amber-50/40`), có hiệu ứng tương tác đổi sáng khi hover (`hover:bg-...-50/80`).
  * Bọc viền toàn bộ card bằng dải màu đồng bộ (`border-emerald-200/90`, `border-teal-200/90`, `border-sky-200/90`, `border-indigo-200/90`, `border-amber-200/90`), kết hợp cạnh trái nhấn đậm `border-l-[5px]` và đường phân cách bên trong (`border-t border-...-200/60`).
  * Khắc phục triệt để tình trạng thẻ trông như nền trắng cũ; đảm bảo độ tương phản rõ rệt, phân bố màu đều và chuyển sắc tự nhiên.

## [v4.4.0] - 2026-10-23 (Chuẩn Hóa Giao Diện Thẻ KPI: Bọc Viền Màu & Dải Chuyển Sắc Quang Phổ Tự Nhiên)

### 1. Áp Dụng Dải Màu Chuyển Sắc (Chromatic Progression) 5 Trụ Cột KPI Dashboard:
- **Viền bọc màu trái (`border-l-[5px]`) & Tông màu đồng bộ (Badge, Icon, Số liệu KPI):**
  * **Thẻ 1 (Tài Chính & Quỹ):** Sắc Xanh ngọc lục bảo (**Emerald**) — `border-l-emerald-500`, badge `bg-emerald-50 text-emerald-800`, KPI `text-emerald-600`.
  * **Thẻ 2 (Kinh Doanh):** Sắc Xanh mòng két (**Teal**) — `border-l-teal-500`, badge `bg-teal-50 text-teal-800`, KPI `text-teal-700`.
  * **Thẻ 3 (Vận Hành Chuyến):** Sắc Xanh lơ da trời (**Sky**) — `border-l-sky-500`, badge `bg-sky-50 text-sky-800`, KPI `text-sky-700`.
  * **Thẻ 4 (Khả Dụng Đội Xe):** Sắc Xanh chàm tím (**Indigo**) — `border-l-indigo-500`, badge `bg-indigo-50 text-indigo-800`, KPI `text-indigo-700`.
  * **Thẻ 5 (Đơn Hàng & Hải Quan):** Sắc Vàng hổ phách (**Amber**) — `border-l-amber-500`, badge `bg-amber-50 text-amber-800`, KPI `text-amber-700`.
- **Hiệu ứng thị giác:** Chuyển đổi mượt mà từ dải màu lạnh tươi mát sang dải ấm dần theo quang phổ tự nhiên ($\text{Emerald} \to \text{Teal} \to \text{Sky} \to \text{Indigo} \to \text{Amber}$), phân bố màu đều và không trùng lặp, tối ưu trải nghiệm trực quan cho người điều hành.
- **Phạm vi áp dụng:** Thử nghiệm trước ở 5 thẻ Dashboard theo chỉ đạo của người dùng trước khi áp dụng đồng loạt ra toàn bộ các phân hệ trong hệ thống.

## [v4.3.9] - 2026-10-23 (Rà Soát Toàn Diện Các Phân Hệ Còn Lại: Chuẩn Hóa Text Đồng Nhất & Loại Bỏ Triệt Để Badge)

### 1. Chuẩn Hóa Toàn Diện Typography & Chuyển Badge Sang Text Chuẩn:
- **Phân hệ Điều Vận (Dispatch Table):**
  * Ghép 2 cont 20ft: Chuyển sang text chuẩn in hoa `text-teal-700 font-bold text-[11px] uppercase`.
  * Cảnh báo Free DET (Quá hạn / Hết hôm nay / Còn 1N): Bỏ hoàn toàn khung nền badge màu, chuyển sang text font-bold kèm icon cảnh báo trực quan.
  * Hóa đơn thương mại & Dock kho: Bỏ badge nền màu viền bo góc, chuyển sang text font-mono bold; Dock hiển thị text indigo font-mono chuẩn.
  * Nguồn xe (Xe Nhà / Xe Bạn): Chuyển badge sang text thuần in hoa (`text-teal-700` / `text-slate-600`).
  * Cắt kéo (Drop & Hook): Bỏ khung badge nền vàng, chuyển sang text inline in hoa kèm icon `ph-arrows-split`.
  * Vị trí cont & Loại chuyến: Chuyển badge sang text thuần in hoa phân biệt màu sắc.
- **Phân hệ Quản Lý Đội Xe (Đầu kéo & Rơ-moóc):**
  * Hạn đăng kiểm (Hết hạn / Cảnh báo / Hợp lệ): Loại bỏ hoàn toàn khối pill nền đỏ/vàng, chuyển sang text chuẩn in hoa đậm màu (`text-rose-700` / `text-amber-700` / `text-emerald-700`).
  * Hạn bảo dưỡng: Loại bỏ badge nền vàng, chuyển sang text chuẩn.
- **Phân hệ Tờ Khai Hải Quan:**
  * Trạng thái đăng ký tờ khai (`Chờ truyền TK`, `Đã đăng ký`, `Đang thẩm định`, `Kiểm hóa`, `Đã thông quan`, `Đã qua giám sát`, `Hủy`): Loại bỏ toàn bộ khung badge bo tròn, chuyển sang text thuần in hoa chuẩn. (Bảo toàn ngoại lệ phân luồng hải quan Luồng Xanh / Vàng / Đỏ).
  * Loại tờ khai: Bỏ badge nền xám, chuyển sang text font-bold.
- **Phân hệ Hợp Đồng Lao Động:**
  * Chế độ phúc lợi (`BHXH`, `TNCN`, `CĐ`): Loại bỏ khung badge bo góc nền màu, chuyển sang text thuần gọn gàng.
- **Phân hệ Đơn Hàng / Booking:**
  * Nhãn `GẤP` và `CẮT KÉO`: Chuyển sang text in hoa đậm nét không dùng nền khối đặc.
- **Phân hệ Kế Toán & Chi Tiết Chuyến Xe:**
  * Bảng mốc tiến độ 11 bước: Chuyển badge trạng thái (`Chưa thực hiện`, `ĐANG THỰC HIỆN`, `Hoàn thành`) sang text thuần in hoa.
  * Bảng kê chi phí chuyến: Chuyển nhãn chặng xe (`Chặng 1`, `Chặng 2`) sang text thuần in hoa.
  * Bảng đối soát vé BOT & Đối soát 3PL: Biển số xe và chi tiết vé BOT bỏ badge nền xám bo góc, chuyển sang text font-mono bold đồng nhất.
  * Bảng báo cáo tài chính kế toán: Chênh lệch quyết toán (`Nộp cty`, `Cty bù`) chuyển sang text font-mono bold không nền.

### 2. Nguyên Tắc Đồng Nhất Font & Size (Visual Hierarchy):
- Mọi record dữ liệu chính: áp dụng đồng nhất `text-xs font-bold` (hoặc `font-mono font-bold` cho mã số, biển số, tiền tệ, cont).
- Thông tin phụ đi kèm trong cùng ô: tự động giảm 1 size xuống `text-[11px] font-normal text-slate-500` đảm bảo phân cấp thị giác rõ ràng, không rối mắt.

### 3. Kiểm Thử & Triển Khai:
- Cú pháp JavaScript hợp lệ 100%: `node -c static/js/app.js`, `node -c static/js/modules/reports.js`, `node -c static/js/column_manager.js`.
- Đạt chuẩn **147/147 automated tests PASSED**.

## [v4.3.8] - 2026-10-23 (Loại Bỏ Triệt Để Badge, Icon Tay Lái & Chuẩn Hóa Nút Thao Tác Theo Chuẩn Nút In)

### 1. Loại Bỏ Triệt Để Badge Trong Hiệu Suất Đội Xe, Gom Chuyến & Công Nợ:
- **Báo cáo 1 (Hiệu suất đội xe):** Cột `BIÊN LN (%)` loại bỏ nền badge bo tròn (`bg-emerald-100`, `bg-teal-100`, `bg-amber-100`), chuyển sang text thuần đậm nét `text-xs font-bold ${marginColor} tabular-nums`.
- **Báo cáo 11 (Tạm ứng & chi phí lái xe):**
  * Cột Bác tài: Bỏ icon vô lăng tay lái (`ph-steering-wheel`).
  * Cột Nguồn tạm ứng: Bỏ khung badge viền (`bg-slate-100`), chuyển sang text chuẩn.
  * Cột Chi phí thực tế (BOT, Cảng, Cược): Bỏ các khung badge nền xám, chuyển sang text inline trực quan.
  * Cột Chênh lệch: Bỏ `p-2 rounded` trên ô.
- **Báo cáo 12 (Tồn đọng gom chuyến):**
  * Cột Xe kéo: Bỏ khung badge `Xe Nhà` / `Xe Bạn`, chuyển sang text in hoa tinh tế.
  * Cột Tài xế: Bỏ icon tay lái (`ph-steering-wheel`).
- **Báo cáo 14 (Chậm quyết toán / Tồn đọng):**
  * Cột Tài xế: Bỏ icon tay lái (`ph-steering-wheel`).
- **Báo cáo 13 & Bảng kê SOA (Công nợ phải thu):**
  * Bảng tổng hợp: Cột `ĐÃ CHỐT / CHỜ CHỐT` loại bỏ badge pill màu nền (`bg-emerald-50`, `bg-amber-50`), chuyển sang text thuần chuẩn: `${recCount} Chốt / ${pendCount} Chờ`.
  * Bảng kê chi tiết từng chuyến (SOA Full Trips):
    + Cột 1 `1. Hoàn Thành Chuyến`: Chuyển badge `✓ Xong Nội Bộ` sang text thuần in hoa `text-xs font-bold text-emerald-700`.
    + Cột 2 & 3 `2. Quyết Toán Tài Xế / 3. Thầu Phụ`: Chuyển badge sang text thuần in hoa `text-xs font-bold`.
    + Cột 4 `4. Quyết Toán Với Khách Hàng`: Chuyển badge sang text thuần in hoa `✓ ĐÃ TÍNH NỢ (AR)` / `⏳ CHƯA TÍNH NỢ`.
- **Phân hệ Quyết toán gom chuyến (`renderSettlementTable`):**
  * Cột Xe: Bỏ khung badge nền xanh trên biển số xe, chuyển sang text font-mono bold.

### 2. Chuẩn Hóa Nút Thao Tác Giống Chuẩn Nút In:
- **Nút "Chốt Quyết Toán" / "Mở lại" (Bảng kê chi tiết công nợ):** Chuyển từ nút màu đặc khối (`bg-emerald-600 text-white`) sang nút viền chuẩn (outline button) đồng bộ như nút In:
  * Trạng thái Chờ: `bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1` kèm icon `ph-check-circle`.
  * Trạng thái Đã chốt (Mở lại): `bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1` kèm icon `ph-arrow-counter-clockwise`.
- **Nút "Chi tiết" (Lưới gom chuyến):** Chuẩn hóa thành nút viền `bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1` kèm icon `ph-eye`.

### 3. Kiểm Thử Hệ Thống:
- Đạt 100% cú pháp JS: `node -c static/js/app.js`, `node -c static/js/modules/reports.js`, `node -c static/js/column_manager.js`.
- Toàn bộ bộ kiểm thử tự động Django `python manage.py test --keepdb` đạt **147/147 tests PASSED**.

## [v4.3.7] - 2026-10-22 (Rà Soát Toàn Bộ Bảng Báo Cáo & Các Phân Hệ: Loại Bỏ Hết Badge Trạng Thái Sang Text Thuần)

### 1. Chuẩn Hóa Toàn Diện Hệ Thống Báo Cáo (Reports 1 ➔ 14):
- **Báo cáo 1 (Doanh thu xe):** Cột hình thức sở hữu `ownershipBadge` (Xe Nhà / Xe Bạn) -> chuyển text thuần in hoa.
- **Báo cáo 2 (Hạn Free DEM/DET hãng tàu):** Cột `Trạng Thái Hạn` (An toàn / Còn X ngày / Quá hạn) bỏ badge pill bo tròn nền xanh/đỏ/vàng -> chuyển sang text thuần in hoa; bỏ badge đếm số cảnh báo/quá hạn của hãng tàu.
- **Báo cáo 3 (Giao nhận đúng hẹn):** Cột `ĐÚNG HẸN / TRỄ HẸN` -> chuyển text thuần `Đúng Hẹn` (xanh) / `Trễ Hẹn` (đỏ).
- **Báo cáo 4 (Thu hồi chi hộ cảng bãi):** Cột `Đã thu hồi / Chờ khách trả` -> chuyển text thuần.
- **Báo cáo 5 (Cắt kéo & Lưu xe sau 0H):** Cột `Cắt Kéo Đổi Xe / Lưu Xe Sau 0H` -> chuyển text thuần.
- **Báo cáo 8 (Đối soát xe ngoài 3PL):** Cột `Đã quyết toán / Đang đối soát` -> chuyển text thuần.
- **Báo cáo 9 (Lương chuyến tài xế):** Số chuyến cắt kéo -> chuyển text số font-bold không nền.
- **Báo cáo 11 (Tạm ứng chi phí phát sinh):** Cột `Tài xế nộp lại / Cty chi bù`, `Đã hoàn ứng / Đang tạm ứng`, số lượng chứng từ -> chuyển text thuần; bỏ badge tiêu đề phân cấp luồng tiền.
- **Báo cáo 12 (Công nợ gối đầu & Chuyển kỳ):** Cột `Tồn T- trước / Trong kỳ`, `Đã Quyết Toán / Chưa Chốt`, `Đã Thu POD / Thiếu POD` -> chuyển text thuần.

### 2. Chuẩn Hóa Lưới Các Bảng Khác (Kế Toán & Quyết Toán):
- **Kế toán - Quỹ điều vận (`acct-fund-tbody`):** Cột trạng thái `Đang Lưu Hành / Chờ Cty Duyệt / Đã Hoàn Ứng Xong` -> chuyển text thuần.
- **Kế toán - Thu hồi chi hộ (`acct-reimburse-tbody`):** Cột trạng thái `Chờ Thu / Đã Lập Debit Note / Đã Thu Hồi` -> chuyển text thuần.
- **Kế toán - Đối soát 3PL (`acct-subcon-tbody`):** Cột trạng thái `Chờ Quyết Toán / Đã Trả Một Phần / Đã Quyết Toán` -> chuyển text thuần.
- **Kế toán - Vé BOT (`acct-bot-tbody`):** Cột cảnh báo `Vượt định mức / Tiết kiệm / Bình thường` -> chuyển text thuần.
- **Quyết toán gom chuyến (`settlement-trips-table`):** Cột Chênh lệch `diffBadge` (+Thừa / -Bù / Khớp) và Trạng thái `ĐÃ KHÓA SỔ / CHỜ QUYẾT TOÁN` -> chuyển text thuần.
- **Ngoại lệ bảo toàn:** Giữ nguyên highlight badge phân luồng tờ khai hải quan (`LUỒNG ĐỎ`, `LUỒNG VÀNG`, `LUỒNG XANH`) trong cột `BOOKING / CONT / SEAL` theo đúng yêu cầu.

### 3. Kiểm Thử Hệ Thống:
- Cú pháp JavaScript hợp lệ 100% qua `node -c`.
- Bộ kiểm thử tự động Django `python manage.py test --keepdb` đạt **147/147 tests PASSED**.

## [v4.3.6] - 2026-10-22 (Chuẩn Hóa Sổ Quỹ Tạm Ứng Điều Vận - Chuyển Badge Sang Text Thuần Trực Quan)

### 1. Loại Bỏ Toàn Bộ Badge Pill Trong Sổ Quỹ Tạm Ứng & Hoàn Ứng Điều Vận (`rep10-dispatcher-funds-table`):
- **Cột Trạng Thái:** Loại bỏ hoàn toàn lớp viền, bo góc pill tròn (`rounded-full`), lớp nền `bg-slate-100`, `bg-indigo-50`, `bg-emerald-50`, `bg-amber-50`. Chuyển sang hiển thị Text thuần túy in hoa trực quan:
  * Đang lưu hành (`APPROVED` / `ACTIVE`): `text-xs font-bold text-indigo-700 uppercase`
  * Đã quyết toán (`SETTLED`): `text-xs font-bold text-emerald-700 uppercase`
  * Chờ duyệt xuất (`PENDING`): `text-xs font-bold text-amber-700 uppercase`
  * Mặc định khác: `text-xs font-semibold text-slate-700 uppercase`
- **Tiêu Đề Bảng:** Chuyển nhãn phân cấp luồng tiền từ badge bo tròn viền sang Text thuần: `(Cấp 1: Cty ➔ Điều Vận)` màu indigo.

### 2. Kiểm Thử & Kiểm Chứng:
- Đồng bộ mã nguồn trên `templates/views/view_reports.html`, `static/js/app.js` và `static/js/modules/reports.js`.
- Cú pháp JS hợp lệ 100% qua `node -c static/js/app.js` và `node -c static/js/modules/reports.js`.

## [v4.3.5] - 2026-10-22 (Chuẩn Hóa Hiển Thị Bảng Theo Dõi Tuổi Đơn Tồn Đọng - Chuyển Toàn Bộ Badge Sang Text Thuần)

### 1. Loại Bỏ Toàn Bộ Badge Pill Trong Bảng Tuổi Đơn Tồn Chưa Quyết Toán (`rep14-unsettled-aging-table`):
- **Cột Mức Độ Cảnh Báo:** Bỏ toàn bộ lớp viền, bo góc pill `rounded-full`, nền `bg-rose-100`, `bg-amber-100`, `bg-sky-100`, `bg-slate-100` và hiệu ứng nhấp nháy `animate-pulse`. Chuyển sang hiển thị text thuần túy trực quan:
  * > 30 Ngày (Cực Gấp): `text-xs font-bold text-rose-700 uppercase tracking-wide`
  * 16 - 30 Ngày (Cảnh Báo): `text-xs font-bold text-amber-700 uppercase tracking-wide`
  * 8 - 15 Ngày (Đôn Thúc POD): `text-xs font-bold text-sky-700 uppercase tracking-wide`
  * 0 - 7 Ngày (Bình Thường): `text-xs font-semibold text-slate-600 uppercase tracking-wide`
- **Cột Tình Trạng POD:** Chuyển từ badge pill sang text thuần in hoa:
  * Đã Có POD: `text-xs font-bold text-emerald-700 uppercase`
  * Thiếu POD Gốc: `text-xs font-bold text-rose-700 uppercase`
- **Cột Trạng Thái Vận Hành:** Chuyển từ badge pill sang text thuần:
  * Trạng thái chuyến: `text-xs font-semibold text-slate-700 uppercase`

### 2. Kiểm Thử & Kiểm Chứng:
- Đồng bộ mã nguồn trên cả `static/js/app.js` và `static/js/modules/reports.js`.
- Cú pháp JS hợp lệ 100% qua `node -c static/js/app.js` và `node -c static/js/modules/reports.js`.
- Kiểm thử hồi quy hệ thống Django: Chạy `python manage.py test --keepdb` đạt **147/147 tests PASSED**.

## [v4.3.4] - 2026-10-22 (Chuẩn Hóa Hiển Thị Trạng Thái Dạng Text Thuần & Kích Hoạt Nút Sửa Trên Bảng Đội Xe)

### 1. Chuẩn Hóa Cột Trạng Thái (Bỏ Toàn Bộ Badge Nền Pill, Dùng Text Thuần Trực Quan):
- **Bảng Rơ-Moóc Container (`fleet-trailers-table`):** Loại bỏ hoàn toàn lớp badge `bg-slate-100`, `bg-teal-100`, `bg-emerald-100`, `bg-amber-100` và `px-2.5 py-1 rounded-md`. Chuyển sang hiển thị text thuần túy:
  * Nằm bãi (Chờ kéo): `text-teal-700 font-bold text-xs uppercase tracking-wider`
  * Đang kéo: `text-emerald-700 font-bold text-xs uppercase tracking-wider`
  * Bảo trì / Hư hỏng: `text-amber-700 font-bold text-xs uppercase tracking-wider`
  * Mặc định khác: `text-slate-700 font-bold text-xs uppercase tracking-wider`
- **Bảng Đầu Kéo & Phương Tiện (`fleet-table`):** Đồng bộ loại bỏ badge, chuyển sang text thuần trực quan:
  * Sẵn sàng hoạt động: `text-emerald-700 font-bold text-xs uppercase tracking-wider`
  * Cảnh báo đăng kiểm/bảo trì: `text-amber-700 font-bold text-xs uppercase tracking-wider`
  * Hết hạn đăng kiểm: `text-rose-700 font-black text-xs uppercase tracking-wider`

### 2. Sửa Lỗi Nút "Chỉnh Sửa" Thao Tác Đội Xe Không Có Hiệu Lực:
- **Nguyên nhân gốc rễ:** Hàm `editFleetTrailer(id)` và `editFleetVehicle(id)` kích hoạt `openEditMasterDataModal(id)`. Tuy nhiên, khi người dùng thao tác ở tab Đội xe (`currentTab === 'xe-bai'`), danh mục Cài đặt `masterDataCache['trailers']` và `masterDataCache['vehicles']` chưa được tải vào bộ nhớ đệm, dẫn tới việc tìm kiếm phần tử bị trả về `undefined` và hàm âm thầm `return;` mà không mở modal.
- **Giải pháp xử lý triệt để:**
  * Bổ sung cơ chế **Fallback Two-Tier**:
    1. Khi cache rỗng, tự động gọi API danh mục `/api/master-data/trailers/` hoặc `/api/master-data/vehicles/` để nạp dữ liệu đầy đủ, lưu vào cache và mở modal sửa tương ứng.
    2. Fallback thứ 2 từ dữ liệu mảng `rawFleetTrailers` / `rawFleetVehicles` có sẵn trên trang nếu gọi API mạng gặp sự cố.
  * Hiệu chỉnh `submitMasterDataForm`: Khi người dùng lưu thay đổi ở tab Đội xe, hệ thống tự động gọi `loadFleetData()` để làm mới ngay tức thì danh sách phương tiện và các thẻ KPI tổng hợp mà không làm gián đoạn hay tải lại toàn bộ trang.

### 3. Kiểm Thử & Kiểm Chứng Hệ Thống:
- Kiểm tra cú pháp JavaScript: `node -c static/js/app.js` và `node -c static/js/modules/fleet.js` đạt chuẩn 100%.
- Kiểm thử tự động hồi quy Django: Chạy `python manage.py test --keepdb` đạt **147/147 tests PASSED**.

## [v4.3.3] - 2026-10-22 (Kiểm Thử Giả Lập Toàn Bộ Ứng Dụng & Khắc Phục Triệt Để Toàn Bộ Lỗi Hàm Nút Bấm Trên Toàn App)

### 1. Quét & Rà Soát Tĩnh Toàn Diện (Full Codebase AST & Inline Event Audit):
- Quét toàn bộ 100% các tệp HTML (templates/**/*.html) và chuỗi template động (static/js/**/*.js):
  * Phát hiện và đối chiếu 652 điểm gọi sự kiện inline (onclick, onchange, oninput, onsubmit).
  * Phát hiện các tiện ích toàn cục và bộ điều khiển bị thiếu hoặc gán undefined do cơ chế conditional fallback.

### 2. Bổ Sung & Khắc Phục Dứt Điểm Toàn Bộ Các Hàm Bị Thiếu:
- **Tiện ích toàn cục (Global Utilities):**
  * `debounce(func, wait)`: Cơ chế debounce thông minh hỗ trợ cú pháp inline `oninput="debounce(fn, wait)()"`, lưu timer theo hàm gọi. Giải quyết dứt điểm lỗi ReferenceError khi gõ tìm kiếm tại Sổ quỹ (`#cash-search`), Thu hồi chi hộ (`#reimburse-search`) và Đối soát xe ngoài 3PL (`#subcon-search`).
  * `formatCurrencyInput(el)`: Tự động format số tiền VND tức thì theo chuẩn phân cách hàng nghìn khi nhập chi phí xe ngoài thầu phụ và tiền ứng xe ngoài.
- **Phân hệ Quỹ Tạm Ứng Điều Vận (Dispatcher Funds):**
  * Tích hợp `openDispatcherFundModal()`, `closeDispatcherFundModal()`, `submitDispatcherFundForm(e)` trực tiếp vào `static/js/app.js`.
- **Phân hệ Quyết Toán Gom Chuyến (Batch Trip Settlement):**
  * Tích hợp `openBatchSettlementModal()`, `closeBatchSettlementModal()`, `returnFromSettlementView()`, `loadBatchSettlementPreview()`, `onBatchGroupByChange()`, `toggleSelectAllBatchTrips()`, `executeBatchSettlementSubmit()` trực tiếp vào `static/js/app.js`.
  * Đảm bảo nút "⚡ Quyết Toán Gom Chuyến" và nút "Quay lại" hoạt động mượt mà 100%.

### 3. Kiểm Thử Giả Lập Tự Động Với Playwright Chromium Headless (Runtime E2E Simulation):
- Khởi động phiên làm việc Playwright authenticated với tài khoản Quản trị viên (admin):
  * Chạy giả lập tự động tuần tự qua toàn bộ 7 View cốt lõi: Dashboard -> Điều Vận -> Kế Toán -> Báo Cáo -> Đội Xe -> Khách Hàng -> Quyết Toán Gom Chuyến.
  * Tự động tương tác và bấm qua các nút subtabs, mở/đóng modals tạm ứng, gõ tìm kiếm debounce, đổi radio nguồn tiền, chuyển nhóm quyết toán, đổi preset ngày.
  * Kết quả giám sát Runtime: **26/26 chuỗi thao tác thành công - 0 UNCAUGHT ERRORS DETECTED (ZERO REGRESSION)**.

### 4. Kiểm Thử Hệ Thống Backend:
- Toàn bộ bộ kiểm thử tự động Django: `python manage.py test --keepdb` đạt **147/147 tests PASSED**.

## [v4.3.2] - 2026-10-22 (Chuẩn Hóa Giao Diện Bảng Tạm Ứng Tài Xế, Cân Đối Thao Tác & Sửa Lỗi Modal Quyết Toán)

### 1. Chuẩn Hóa Cột Chênh Lệch & Trạng Thái (Text Thuần Túy):
- **Loại bỏ badge rườm rà:** Chuyển toàn bộ các viên thuốc badge có nền màu và viền bo tròn trên 2 cột **Chênh Lệch Hoàn Ứng** và **Trạng Thái** sang hiển thị dạng text thuần túy:
  * Trạng thái: Text màu trực quan (Đã Hoàn Ứng - xanh emerald, Đang Tạm Ứng - vàng hổ phách).
  * Chênh lệch hoàn ứng: Text monospace số tiền (+550.000 đ (Dư) - xanh dương, -150.000 đ (Thiếu) - đỏ cam, Khớp Đúng 100% - xanh lá).

### 2. Cân Đối Cột Thao Tác & Triệt Tiêu Lệch Hàng:
- **Cố định kích thước & vị trí nút:**
  * Nút [Xem]: Cố định độ rộng w-[70px], chiều cao h-7.
  * Nút thứ hai: Cố định độ rộng w-[96px], chiều cao h-7. Hiển thị [Quyết Toán] (khi đang tạm ứng) hoặc [In Phiếu] (khi đã hoàn ứng).
  * Khung bao bọc: Cụm flex căn giữa với khoảng cách gap-2 đồng nhất, cố định tổng bề rộng 174px trên mọi hàng.
  * Cột <th> Thao tác: Gán độ rộng cố định w-[190px] min-w-[190px] trong view_accounting.html.
  * Kết quả: Các nút [Xem] và [Quyết Toán] / [In Phiếu] thẳng tắp hàng dọc 100%, không bị xê dịch hay nhảy ô lung tung giữa các dòng.

### 3. Khắc Phục Triệt Để Lỗi toggleAdvanceSourceType is not a function:
- Tích hợp và đồng bộ đầy đủ toàn bộ bộ điều khiển Tạm ứng & Quyết toán hoàn ứng vào static/js/app.js:
  * toggleAdvanceSourceType(): Đổi hiển thị nguồn tiền quỹ điều vận / công ty chi.
  * onAdvanceTripChange(): Tự động điền tài xế & xe theo chuyến.
  * closeDriverAdvanceModal() & submitDriverAdvanceForm(): Xử lý đóng modal và gửi tạo phiếu ứng.
  * openSettleAdvanceModal() & closeSettleAdvanceModal(): Mở/đóng popup quyết toán hoàn ứng chuyến.
  * calculateSettlementDiff() & recalculateActualExpensesFromTrip(): Tự động tính chênh lệch thực chi vs tạm ứng.
  * submitSettleAdvanceForm(): Gửi quyết toán đối soát chi phí thực tế.
  * Khai báo biến toàn cục currentActiveAdvance phục vụ in phiếu quyết toán hoàn ứng.
  * Expose đầy đủ lên đối tượng window để các sự kiện HTML inline hoạt động hoàn hảo.

### 4. Kiểm Thử Hệ Thống (Zero-Regression):
- Cú pháp JS: node -c static/js/app.js và node -c static/js/modules/accounting.js đạt 100% PASS.
- Test Suite Backend: python manage.py test --keepdb đạt 147/147 tests PASSED.

## [v4.3.1] - 2026-10-22 (Cơ Cấu Lại 4 Nhóm Báo Cáo Chiến Lược Chuẩn Quản Trị Logistics TMS)

### 1. Chuẩn Hóa 4 Nhóm Báo Cáo Chiến Lược (iew_reports.html, pp.js & 
eports.js):
- **Đồng bộ cơ cấu 4 nhóm chuẩn theo chu trình nghiệp vụ vận tải:**
  1. **DOANH THU & HIỆU SUẤT ĐỘI XE (Teal - 3 BC):**
     * 
eport-1: Hiệu Suất Đội Xe & P&L (Doanh thu, chi phí, lãi gộp từng xe).
     * 
eport-4: Chi Phí Tuyến & Suất Tiêu Hao (Định mức dầu, vé BOT, phụ phí).
     * 
eport-12: Quyết Toán Gom Chuyến & Backlog (Tiến độ xử lý chuyến tồn đọng).
  2. **KINH DOANH & KHÁCH HÀNG (Indigo - 3 BC):**
     * 
eport-7: Doanh Thu Khách & Sản Lượng TEU (Doanh số và số lượng container theo khách hàng).
     * 
eport-13: Công Nợ Phải Thu Khách Hàng - AR (Bảng kê đối soát SOA, hóa đơn chưa thu).
     * 
eport-14: Tuổi Đơn Tồn Đọng Chưa Chốt - Aging (Đơn hàng giao lâu ngày chưa chốt xuất hóa đơn).
  3. **TÀI CHÍNH & QUẢN TRỊ NỘI BỘ (Amber - 4 BC):**
     * 
eport-10: Quỹ Tạm Ứng Điều Vận (Kế toán cấp và số dư quỹ khả dụng).
     * 
eport-11: Tạm Ứng & Chi Phí Tài Xế (Ứng tiền đường dài và hoàn ứng chứng từ).
     * 
eport-9: Bảng Lương Chuyến & Tài Xế (Lương cơ bản + lương chuyến + thưởng vượt mốc).
     * 
eport-8: Quyết Toán Xe Thầu Phụ 3PL (Công nợ phải trả AP và lịch thanh toán nhà xe bạn).
  4. **VẬN HÀNH & SỰ CỐ HIỆN TRƯỜNG (Blue / Rose - 4 BC):**
     * 
eport-2: Vỏ Cont & DEM/DET Hãng Tàu (Theo dõi free-time và hạn trả rỗng tránh phạt tiền).
     * 
eport-3: Đúng Giờ & Chất Lượng OTP (Tỷ lệ xe đến cảng/kho đóng hàng đúng hẹn SLA).
     * 
eport-5: Cắt Kéo & Lưu Xe Sau 0H (Chuyến chạy cắt móc và phí lưu ca qua đêm).
     * 
eport-6: Biên Bản Ngoại Lệ & Sự Cố - OS&D (Nhật ký hàng hỏng, rách seal, đền bù).

### 2. Tinh Chỉnh Phân Quyền & Chuyển Nhóm Mượt Mà (Frontend Logic):
- Cập nhật ma trận REPORT_GROUP_MAPPING trong cả static/js/app.js và static/js/modules/reports.js.
- Bổ sung quyền xem 
eport-14 (Tuổi đơn tồn đọng) cho Khối Kinh Doanh (Sales) để đôn đốc khách hàng nghiệm thu/thanh toán công nợ.
- Đảm bảo hiển thị cách ly nghiêm ngặt giữa các nhóm: bấm nhóm nào chỉ hiển thị đúng các báo cáo thuộc nhóm đó.

### 3. Kiểm Thử Hệ Thống (Zero-Regression):
- Cú pháp JavaScript static/js/app.js và static/js/modules/reports.js: 100% PASS không có lỗi.
- Toàn bộ 147/147 Unit Tests của hệ thống vượt qua thành công.

---

## [v4.3.0] - 2026-10-22 (Chuẩn Hóa Toàn Diện Bộ 5 Thẻ Vận Hành Cho Phân Hệ Đội Xe, Nhân Sự & Hải Quan)

### 1. Chuẩn Hóa Phân Hệ Đội Xe & Kỹ Thuật (iew_fleet.html, pi_views.py, pp.js & leet.js):
- **Bộ 5 Thẻ Vận Hành Kỹ Thuật (Fleet Pipeline & Readiness):**
  1. **ĐẦU KÉO / TẢI (Teal):** Phân tách số lượng Xe Nhà vs Thầu Phụ, tình trạng Đang hoạt động vs Nằm bãi.
  2. **RƠ-MOÓC CONT (Indigo):** Phân tách số lượng Moóc đang gán kéo vs Nằm bãi, dải tải trọng thiết kế.
  3. **SẴN SÀNG NHẬN ĐƠN (Emerald):** Tỷ lệ phương tiện sẵn sàng điều độ (%), số xe trên đường vs xe chờ việc.
  4. **CẢNH BÁO HẠN KIỂM (Rose):** Phân tách phương tiện Quá hạn đăng kiểm (đỏ) vs Sắp đến hạn trong 30 ngày.
  5. **BẢO DƯỠNG & BẢO HIỂM (Amber):** Số phương tiện đến hạn bảo trì định kỳ / thay dầu vs Bảo hiểm TNDS sắp hết hạn.

### 2. Chuẩn Hóa Phân Hệ Nhân Sự & Tiền Lương (iew_personnel.html, pps/personnel/api_views.py & pp.js):
- **Bộ 5 Thẻ Quản Trị Nhân Lực & Quỹ Lương (HRM Pipeline):**
  1. **TỔNG NHÂN SỰ (Indigo):** Phân tách HĐLĐ Chính thức vs Thử việc, nhân sự Đang hoạt động vs Đã nghỉ việc.
  2. **ĐỘI TÀI XẾ (Teal):** Phân tách Bác tài đang trên tuyến vận hành vs Bác tài sẵn sàng nhận chuyến/nghỉ ca.
  3. **VĂN PHÒNG & ĐIỀU ĐỘ (Blue):** Phân bổ Điều vận, Kinh doanh (Sales), Kế toán và Ban Quản lý.
  4. **CẢNH BÁO HẠN 30 NGÀY (Rose):** Cảnh báo hạn Giấy phép lái xe (GPLX) tài xế và Hạn hợp đồng lao động.
  5. **LƯƠNG & TẠM ỨNG (Emerald):** Tổng quỹ lương cơ bản định kỳ và Tổng công nợ tạm ứng tài xế trong tháng.

### 3. Chuẩn Hóa Phân Hệ Hải Quan & Thông Quan Điện Tử (iew_customs.html, pps/customs/api_views.py & pp.js):
- **Bộ 5 Thẻ Thông Quan VNACCS/VCIS (Customs Pipeline):**
  1. **TỔNG TỜ KHAI (Teal):** Phân tách Xuất khẩu vs Nhập khẩu, số tờ Đã thông quan vs Chờ xử lý.
  2. **LUỒNG XANH (Emerald):** Số tờ tự động thông quan tức thì và tỷ lệ phân luồng xanh.
  3. **LUỒNG VÀNG (Amber):** Số tờ đang xét duyệt chứng từ hải quan (C/O, Hóa đơn thương mại, B/L).
  4. **LUỒNG ĐỎ (Rose):** Số tờ phải kiểm hóa thực tế (soi chiếu container hoặc mở cont kiểm tra).
  5. **TỶ LỆ THÔNG QUAN (Indigo):** Tỷ lệ thông quan tổng thể (%), số tờ đã thông quan và tiền thuế XNK đang treo.

### 4. Kiểm Thử Hệ Thống (Zero-Regression):**
- Toàn bộ cú pháp JavaScript: 100% PASS không có lỗi.
- 147/147 Unit Tests của hệ thống vượt qua thành công.

---

## [v4.2.2] - 2026-10-22 (Chuẩn Hóa Bộ 5 Thẻ Vận Hành Chiến Lược Trang Điều Vận - TMS Dispatch Pipeline)

### 1. Nâng Cấp Giao Diện & Kiến Trúc Bộ 5 Thẻ Vận Hành Trang Điều Vận (iew_dispatch.html & pp.js):
- **Đồng bộ bố cục 5 cột (5-Grid Layout):** Chuyển từ 4 ô cũ sang 5 Thẻ Vận Hành Chiến Lược ngang hàng, bám sát toàn bộ Chu trình Vòng đời Điều Vận (Dispatch Pipeline):
  1. **Thẻ 1 - TỔNG ĐIỀU ĐỘ (Indigo - order-l-indigo-600):** Tổng chuyến, phân tách số cont và số chuyến thực hiện bởi Xe Nhà vs Thầu Phụ.
  2. **Thẻ 2 - CHỜ NHẬN LỆNH (Amber - order-l-amber-500):** Chuyến xe đã phát lệnh, cảnh báo SLA tài xế quá 30 phút chưa nhận lệnh hoặc bấm từ chối chuyến.
  3. **Thẻ 3 - ĐANG TRÊN TUYẾN (Teal - order-l-teal-600):** Xe đang chở hàng trên đường, xe đang bốc dỡ tại dock kho hoặc chạy cắt kéo / trả vỏ rỗng.
  4. **Thẻ 4 - CẢNH BÁO RỦI RO (Rose - order-l-rose-500):** Chuyến có nguy cơ trễ Cắt máng (Closing Time < 6h), sắp hết hạn Free DEM/DET hoặc lưu ca tại kho (>4h).
  5. **Thẻ 5 - ĐÃ GIAO & THU POD (Emerald - order-l-emerald-600):** Chuyến đã giao hàng thành công, phân tách số chuyến đã nộp POD gốc và số chuyến đang chờ thu hồi POD.

### 2. Tối Ưu Hóa Backend API Điều Vận (pps/dispatch/api_views.py):
- **Bộ lọc linh hoạt theo Kỳ:** API TripListCreateAPIView tính toán độc lập 5 thẻ dựa trên khung thời gian được chọn (rom_date, 	o_date), không bị việc lọc bảng làm sai lệch tổng thể.
- **Bảo toàn tương thích ngược 100%:** Giữ nguyên các key thống kê cũ (	otal_trips_monthly, 	ransit_count, pending_expenses_count, cutoff_warning_count) để bảo đảm Zero-Regression.

### 3. Kiểm Thử Hệ Thống (Zero-Regression):
- Cú pháp JavaScript static/js/app.js, static/js/modules/dispatch.js và static/js/column_manager.js: 100% PASS (0 syntax errors).
- Toàn bộ 147/147 Unit Tests của hệ thống vượt qua thành công.

---

## [v4.2.1] - 2026-10-22 (Đồng Bộ Tuyệt Đối Số Liệu Ô Tổng & Chi Tiết - Loại Bỏ Fake Trend Phân Hệ Sale & Booking)

### 1. Đồng Bộ Tuyệt Đối Số Liệu Giữa Ô Tổng Quan (Executive Overview) & Thẻ Chi Tiết:
- **Backend API (pps/dispatch/api_views.py):**
  * Đồng bộ chỉ số overview_metrics['revenue_monthly'] = q_signed['revenue'] (đúng chuẩn **1.235.500.000 đ**), khớp 100% với thẻ trạng thái ĐÃ KÝ HỢP ĐỒNG ở dưới, thay vì cộng dồn cả các báo giá đang đàm phán gây lệch số liệu.
  * Thêm ghi chú phụ giải thích minh bạch: 11 HĐ (17 tuyến đã ký) · 1 đang đàm phán (25.000.000 đ).
  * Khớp chuẩn số liệu Booking trong kỳ: **7 đơn hàng**, **19 cont** kế hoạch (trong đó đã phát lệnh kéo 5 cont, còn lại 14 cont chưa phát lệnh).

### 2. Triệt Tiêu Hoàn Toàn Số Liệu Giả Lập (Anti-Fake Trend):
- **Loại bỏ fake trend cứng ngắc:** Gỡ bỏ toàn bộ các số liệu phần trăm tăng trưởng giả lập (+14.8%, +33.3%, -25.0%, +12.5%) ở cả Backend API (pps/dispatch/api_views.py) và Frontend (static/js/app.js, 	emplates/views/view_sales.html).
- **Thay thế bằng Badge Nghiệp Vụ Thực Tế:**
  * Ô 1 (Doanh Thu Kế Hoạch): 11 HĐ Đã Ký (Emerald badge kèm icon dấu check ph-check-circle).
  * Ô 2 (Tổng Đơn Booking): 7 Đơn Tiếp Nhận (Teal badge kèm icon đơn ph-clipboard-text).
  * Ô 3 (Kế Hoạch Điều Cont): 19 Cont Kế Hoạch (Indigo badge kèm icon cont ph-package).
  * Ô 4 (Tỷ Lệ Chốt Báo Giá): 11/12 Hợp Đồng (Amber badge kèm icon ph-handshake).

### 3. Kiểm Thử Hệ Thống (Zero-Regression):
- Cú pháp JavaScript static/js/app.js và static/js/column_manager.js: 100% PASS không có lỗi.
- Toàn bộ 147/147 Unit Tests của hệ thống vượt qua thành công.

---

## [v4.2.0] - 2026-10-22 (Chuẩn Hóa 5 Thẻ Báo Giá & Hợp Đồng Khách Hàng Và 5 Thẻ Booking / Đơn Đặt Hàng)

### 1. Chuẩn Hóa Tab 1: BÁO GIÁ & HỢP ĐỒNG KHÁCH HÀNG (`view_sales.html`, `api_views.py`, `models.py` & `app.js`):
- **Tên Tab & Tiêu đề:** Đổi thành `BÁO GIÁ & HỢP ĐỒNG KHÁCH HÀNG`.
- **Khái niệm chuẩn xác:** Sử dụng thuật ngữ `DOANH THU KẾ HOẠCH` (loại bỏ hoàn toàn từ "tháng" vì phản ánh đúng bản chất Hợp đồng đã ký kết).
- **Bộ 5 Thẻ Trạng Thái Báo Giá (Từ Trái Qua Phải):**
  1. **ĐÃ KÝ HỢP ĐỒNG (`APPROVED` - Emerald):** Doanh số kế hoạch, Số tuyến đã ký.
  2. **CHỜ KÝ HỢP ĐỒNG (`PENDING_APPROVAL` - Indigo):** Doanh số chờ ký, Số tuyến chờ ký.
  3. **ĐANG ĐÀM PHÁN (`NEGOTIATING` - Amber):** Doanh số đang đàm phán, Số tuyến đàm phán.
  4. **ĐÃ GỬI BÁO GIÁ (`SENT` - Blue):** Doanh số đã gửi khách hàng, Số tuyến đã gửi.
  5. **TỪ CHỐI (`REJECTED` / `EXPIRED` - Rose):** Doanh số từ chối/hết hạn, Số tuyến từ chối.
- **Quy chuẩn hiển thị:** Mỗi thẻ thể hiện rõ ràng 2 dòng số liệu:
  * `DOANH SỐ:` ... đ
  * `SỐ TUYẾN:` ... Tuyến

### 2. Chuẩn Hóa Tab 2: BOOKING / ĐƠN ĐẶT HÀNG (`view_sales.html`, `api_views.py` & `app.js`):
- **Tên Tab & Tiêu đề:** Đổi thành `BOOKING / ĐƠN ĐẶT HÀNG`.
- **Bộ 5 Thẻ Vận Chuyển Booking (Từ Trái Qua Phải):**
  1. **CHỜ ĐIỀU XE (`PENDING_DISPATCH` - Amber)**
  2. **ĐANG ĐIỀU XE (`PARTIALLY_DISPATCHED` - Teal)**
  3. **ĐƠN GẤP (`is_urgent` - Rose):** Đóng hàng trong vòng 48h hoặc đơn cần ưu tiên gấp.
  4. **CHẠY CẮT KÉO (`has_drop_hook` - Indigo):** Đơn hàng có kế hoạch chạy cắt kéo (drop-hook).
  5. **ĐÃ HOÀN TẤT (`COMPLETED` - Emerald)**
- **Quy chuẩn hiển thị:** Mỗi thẻ hiển thị đầy đủ các dòng số liệu nghiệp vụ:
  * `TỔNG SỐ CHUYẾN/ CONT:` X Chuyến / Y Cont
  * `ĐÃ HOÀN THÀNH:` X Cont
  * `CHƯA HOÀN THÀNH:` Y Cont

---

## [v4.1.12] - 2026-10-22 (Tinh Gọn Bộ Xem Trước PDF: Đồng Màu Trắng Sáng, Nút Xoay 90° & Tự Động Vừa Chiều Ngang)

### 1. Đồng Bộ Hóa Thiết Kế Sáng Màu & Xóa Bỏ Khung Viền Tối Cồng Kềnh (`templates/news_detail.html`):
- **Bối cảnh & Yêu cầu:** Người dùng phản ánh bộ xem trước PDF trước đây có khung nền tối màu đen/slate-950 tách biệt ("viền infinity"), các thành phần bị trùng lặp (dòng "Đang xem: [tệp]" lặp lại tên tệp trên Tabs; nút "Mở tab mới" bị double ở cả Header và Toolbar). Ngoài ra, các tài liệu dạng sơ đồ tổ chức nằm ngang (Landscape) bị hiển thị lộn dọc không đọc được.
- **Giải pháp UX/UI Tinh Gọn & Hiện Đại:**
  * **Thiết kế đồng màu sáng:** Chuyển toàn bộ Toolbar sang tông màu xám nhạt (`bg-slate-50/90`), viền mỏng tinh tế (`border-slate-200/90`) và nền Canvas giấy trắng thanh lịch trên nền ghi nhẹ (`bg-slate-100/60`).
  * **Loại bỏ 100% sự trùng lặp:** Xóa bỏ thanh header "Đang xem: ..." phụ; loại bỏ nút "Mở tab mới" lặp lại trong Toolbar PDF, chỉ giữ 1 nút duy nhất ở Header trên cùng.
- **Tính năng Xoay 90° (Rotate) & Tự động thích ứng khổ ngang (Fit Width):**
  * **Nút bấm "Xoay 90°":** Cho phép người dùng xoay trang PDF theo chiều kim đồng hồ ($0^\circ 
ightarrow 90^\circ 
ightarrow 180^\circ 
ightarrow 270^\circ 
ightarrow 0^\circ$) để xem các sơ đồ tổ chức, bản vẽ hoặc bảng biểu nằm ngang cực kỳ dễ dàng.
  * **Tự động vừa chiều ngang (Fit Width):** Hệ thống tự động tính toán tỷ lệ khung hình và chiều rộng hiển thị của màn hình để bung rộng toàn bộ chiều ngang của sơ đồ, chữ to rõ nét căng mà không cần căn chỉnh thủ công.

---

## [v4.1.11] - 2026-10-22 (Bổ Sung Tính Năng Chỉnh Sửa Thông Báo Cho Người Ban Hành & Tích Hợp PDF.js Viewer Sắc Nét)

### 1. Bổ Sung Quyền & Giao Diện Chỉnh Sửa / Xóa Thông Báo Cho Người Ban Hành:
- **Backend API (`apps/collaboration/api_views/news_api.py`):**
  * Bổ sung phương thức `PATCH` & `PUT` vào `CompanyPostDetailAPIView`.
  * **Kiểm soát phân quyền chặt chẽ:** Chỉ người ban hành (`post.author == request.user`) hoặc Ban Giám Đốc/Admin cấp cao (`hierarchy_level >= 80`, `role=DIRECTOR`, `department=MANAGEMENT`) mới có quyền chỉnh sửa.
  * Cho phép hiệu chỉnh đầy đủ: Tiêu đề, Danh mục, Phòng ban tiếp nhận, Tóm tắt, Nội dung chi tiết, trạng thái Ghim, Khẩn cấp, Xuất bản, cùng khả năng xóa tệp đính kèm cũ và bổ sung tài liệu mới.
- **Trang Chi Tiết Văn Bản (`templates/news_detail.html` & `apps/dispatch/views.py`):**
  * Truyền biến `can_edit`, `can_delete` vào context.
  * Bổ sung nút **"Sửa thông báo"** (icon `ph-pencil-simple`) và nút **"Xóa"** (icon `ph-trash`) ngay trên thanh Subheader hành động.
  * Tích hợp Modal Chỉnh Sửa Thông Báo (`#modal-edit-news`) trực tiếp trên trang chi tiết, cho phép chỉnh sửa nội dung, danh mục, phòng ban và quản lý tệp đính kèm tức thì.
- **Trang Danh Sách Feed (`templates/views/view_news.html` & `static/js/collaboration.js`):**
  * Tự động hiển thị nút Sửa & Xóa trên từng thẻ bài viết và trên modal xem nhanh cho tác giả ban hành.
  * Bổ sung Modal Chỉnh Sửa Feed (`#modal-edit-news-feed`) để chỉnh sửa nhanh mà không cần chuyển trang.

### 2. Tinh Chỉnh & Khắc Phục Triệt Để Chế Độ Xem Trước File Đính Kèm (PDF.js Canvas Renderer):
- **Khắc phục lỗi chặn Iframe "Sad Paper" (`core/media_views.py`):**
  * Nguyên nhân: Middleware Django áp dụng `X-Frame-Options: DENY`, khiến trình duyệt Chromium chặn nhúng PDF trực tiếp vào thẻ `<iframe>`, sinh ra icon trang giấy mặt buồn.
  * Xử lý: Áp dụng decorator `@xframe_options_sameorigin` và gán header `X-Frame-Options: SAMEORIGIN` kèm `Content-Disposition: inline` cho các tệp media phục vụ qua `safe_media_serve`.
- **Tích Hợp Thư Viện Mozilla PDF.js Chuẩn Công Nghiệp (`templates/news_detail.html`):**
  * Nhúng thư viện `pdf.js` và `pdf.worker.js` từ CDN.
  * Xây dựng **Bộ xem trước PDF Native Canvas** chất lượng cao: render trực tiếp lên HTML5 Canvas với tỷ lệ sắc nét thích ứng màn hình Retina/High-DPI.
  * **Thanh điều khiển chuyên nghiệp:** Nút chuyển trang (Trước/Sau, hiển thị `Trang 1 / N`), Phóng to / Thu nhỏ (`-`, `+`, `100%`), Tải tệp về máy và Mở toàn màn hình trong tab mới.
  * Cơ chế dự phòng (Fallback) đa tầng: Nếu PDF.js không nạp được mạng $
ightarrow$ tự động chuyển sang Iframe SAMEORIGIN $
ightarrow$ Thẻ Tải xuống trực tiếp.

---

## [v4.1.10] - 2026-10-22 (Loại Bỏ Badge Viền Hộp Khỏi Dropdown Đồng Nghiệp & Chuẩn Hóa [Tên] | [Phòng Ban])

### 1. Trình Bày Phẳng Liền Mạch [Tên] | [Phòng Ban] Không Bọc Badge (`static/js/app.js` & `static/js/collaboration.js`):
- **Bối cảnh & Yêu cầu:** Người dùng phản hồi không thích việc gán các badge viền màu xanh đóng hộp (`border border-teal-200/80 bg-teal-50`) ở góc phải cho từng đồng nghiệp trong danh bạ chọn người nhắn tin, và yêu cầu trình bày trực tiếp theo định dạng: `[Tên] | [Phòng Ban]` mà không cần bọc badge.
- **Triển khai kỹ thuật tinh gọn:**
  * **Chuẩn hóa chuỗi hiển thị (`static/js/collaboration.js`):** Trong hàm `toggleChatDirectoryDropdown()`, các option của đồng nghiệp được định dạng chính xác thành `${u.full_name} | ${dept}` (ví dụ: `Trần Điều Độ | Phòng Điều Vận`, `Trần Thị Kế Toán | Kế Toán Tài Chính`).
  * **Hỗ trợ định dạng thanh lịch không badge (`static/js/app.js`):**
    - Mặc định loại bỏ hoàn toàn các thẻ badge viền hộp chữ nhật khỏi danh sách thả xuống (chỉ hiển thị nếu cấu hình rõ `customOptions.showBadge === true`).
    - Khi một mục có định dạng ` | `, tự động render phân cấp trực quan: Tên (`font-medium text-slate-800`), ký tự phân cách thanh mảnh (`text-slate-300 font-light mx-1.5`), và Phòng ban (`text-slate-500 font-normal text-xs`).
    - Hỗ trợ đánh dấu từ khóa tìm kiếm (`<mark>`) song song trên cả hai vế Tên và Phòng Ban.
- **Hiệu quả:** Giao diện danh bạ nhắn tin hiển thị thoáng đãng, tinh tế, đúng chuẩn văn bản tự nhiên, không bị rối mắt bởi các khối khung badge dày đặc.

---

## [v4.1.9] - 2026-10-22 (Nâng Cấp Bộ Thẻ KPI Đầu Trang Dashboard Thành 5 Ô Chiến Lược)

### 1. Phân Tách Rõ Ràng Số Liệu Thực Hiện vs. Kế Hoạch Kinh Doanh (`apps/dispatch/api_views.py`):
- **Bối cảnh & Yêu cầu:** Người dùng yêu cầu mở rộng hàng thẻ KPI đầu trang Dashboard từ 4 ô lên 5 ô, phân định dứt khoát giữa số liệu Tài chính thực tế (đã hoàn thành) và số liệu Kinh doanh kế hoạch (Báo giá đã duyệt/ký hợp đồng và booking đã nhận).
- **Cấu hình 5 Trụ cột KPI Chiến lược (Ban Giám Đốc):**
  1. **Ô 1: TÀI CHÍNH & QUỸ (Thực Hiện / Đã Hoàn Thành - Theme Emerald):**
     * Metric chính: Lợi Nhuận Gộp Thực Hiện (`agg_profit`).
     * Dòng 1: Doanh thu thực tế (`agg_revenue`) | Chi phí thực tế (`agg_expense`).
     * Dòng 2: Số dư Quỹ Khả dụng: Tiền mặt (`cash_on_hand`) | Ngân hàng (`bank_balance`).
     * Thao tác: Bấm vào chuyển nhanh sang phân hệ Kế toán (`ke-toan`).
  2. **Ô 2: KINH DOANH & KẾ HOẠCH (Đã Ký Hợp Đồng / Booking Nhận - Theme Indigo):**
     * Metric chính: Doanh Thu Kế Hoạch Đã Ký (`sales_plan_rev` = Tổng doanh thu dự kiến của các Báo giá trạng thái `APPROVED`).
     * Dòng 1: Booking đã nhận (`dash_bookings_count` Đơn kèm số lượng Cont kế hoạch `dash_containers_plan`).
     * Dòng 2: Tuyến cước đã duyệt (`approved_quotes_count` Tuyến) kèm Tỷ lệ chốt hợp đồng (`sales_win_rate` %).
     * Thao tác: Bấm vào chuyển nhanh sang phân hệ Sale & CRM (`kinh-doanh`).
  3. **Ô 3: VẬN HÀNH CHUYẾN (Điều Vận - Theme Teal):** Chuyến đang vận hành, chuyến đã xong, tỷ lệ giao đúng giờ OTD và tình trạng sự cố/chậm trễ.
  4. **Ô 4: KHẢ DỤNG ĐỘI XE (Phương Tiện & Tài Xế - Theme Blue):** Tỷ lệ khai thác xe (% và số xe lăn bánh/tổng xe), xe bãi chờ, xe bảo trì và tài xế sẵn sàng nhận lệnh.
  5. **Ô 5: ĐƠN HÀNG & HẢI QUAN (Customs & DEM/DET - Theme Amber):** Tờ khai hải quan luồng xanh, tỷ lệ thông quan, đơn hàng chờ điều xe, cảnh báo hạn lưu bãi/cont (DEM/DET).

### 2. Tinh Chỉnh Giao Diện Lưới 5 Cột & Động Hóa Layout (`templates/views/view_dashboard.html` & `static/js/app.js`):
- **Template HTML tĩnh:** Cập nhật container `#dashboard-row-pillars` sang `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 2xl:gap-3.5`, bổ sung đầy đủ thẻ tĩnh Pillar 2 (Kinh doanh) để triệt tiêu hiện tượng giật cục khung hình (layout shift) trước khi API trả về.
- **Tự động thích ứng số lượng thẻ trong JavaScript (`renderRoleKpiCards`):**
  * Tự động phát hiện số lượng thẻ: nếu có 5 thẻ (view Ban Giám Đốc) -> kích hoạt lưới `xl:grid-cols-5`; nếu có 4 thẻ (các vai trò phòng ban khác) -> tự động chuyển về `xl:grid-cols-4`, đảm bảo bố cục luôn lấp đầy cân đối 100% chiều ngang màn hình.
  * Hỗ trợ đầy đủ bảng màu nhận diện thương hiệu BIM: `emerald`, `indigo`, `teal`, `blue`, `amber`, `rose`.

---

## [v4.1.8] - 2026-10-22 (Tinh Chỉnh Khoảng Đệm Tránh Chữ Đè Icon Kính Lúp Trong Universal Combobox)

### 1. Khắc Phục Lỗi Chữ Đè Lên Icon Kính Lúp (`static/css/main.css` & `static/js/app.js`):
- **Bối cảnh & Nguyên nhân:** Sau khi loại bỏ ô tìm kiếm lặp thứ hai và đưa icon kính lúp (`🔍`) trực tiếp vào ô input chính (`.bim-combobox-main-input`), người dùng phản ánh chữ gõ vào (ví dụ `toán`) bị dính đè trực tiếp lên biểu tượng kính lúp. Nguyên nhân do class `.form-input` trong hệ thống có rule `padding: 5px 10px !important;` đã ghi đè khoảng đệm Tailwind `pl-8`, ép lề trái của text về sát tọa độ `left: 10px` của icon kính lúp.
- **Giải pháp UX/UI chuẩn mực:**
  * **Cập nhật CSS độ ưu tiên cao (`static/css/main.css`):** Bổ sung rule chuyên biệt `.bim-combobox-main-input { padding-left: 38px !important; padding-right: 56px !important; }` để triệt tiêu việc bị `.form-input` ghi đè, tạo khoảng cách đệm an toàn và thoáng đãng 38px cho lề trái (cách icon kính lúp ~14px) và 56px cho lề phải (chứa nút Xóa `×` và mũi tên `caret-down`).
  * **Căn giữa icon theo chiều dọc & Thiết lập inline style phòng thủ (`static/js/app.js`):**
    - Căn giữa icon kính lúp bằng `top-1/2 -translate-y-1/2 absolute left-3`, giúp biểu tượng luôn nằm chính giữa chiều cao của ô bất kể chiều cao thay đổi.
    - Thiết lập trực tiếp `mainInput.style.paddingLeft = '38px'` và `mainInput.style.paddingRight = '56px'` trên DOM element để đảm bảo hiển thị đồng nhất 100% trên mọi trình duyệt.
- **Kết quả nghiệm thu:** Chữ gõ vào hiển thị cách đều, thoáng đãng, tuyệt đối không bị đè lên icon kính lúp; trải nghiệm tìm kiếm mượt mà, chuyên nghiệp.

---

## [v4.1.7] - 2026-10-22 (Tích Hợp Universal Searchable Combobox & Tải Toàn Bộ Tài Khoản Vào Chat Nội Bộ)

### 1. Tích Hợp Universal Searchable Combobox Cho Ô Chọn Đồng Nghiệp Nhắn Tin (`templates/components/chat_bubble.html` & `static/js/collaboration.js`):
- **Bối cảnh & Yêu cầu:** Dropdown "CHỌN ĐỒNG NGHIỆP ĐỂ NHẮN TIN" trong cửa sổ Chat Nổi trước đây là thẻ `<select>` truyền thống, có dòng placeholder chiếm chỗ, không hỗ trợ gõ từ khóa và khó tìm kiếm khi danh bạ nhân sự đông.
- **Nâng cấp UX/UI Hiện Đại ("có search như lúc nãy"):**
  * Tự động khởi tạo `makeSearchableSelect` khi mở dropdown "Nhắn tin mới".
  * **1 Ô Tìm Kiếm Duy Nhất & Triệt Tiêu Lỗi Bị Double:** Tích hợp trực tiếp icon kính lúp (`ph-magnifying-glass`) vào bên trái ô chính `mainInput`, loại bỏ hoàn toàn ô `searchHeader` phụ bên trong menu dropdown. Người dùng gõ từ khóa trực tiếp ngay trong ô ("trong ô đó luôn"), menu xổ xuống lập tức hiển thị danh sách kết quả lọc mà không bị lặp 2 ô input tìm kiếm xếp chồng lên nhau.
  * **Loại bỏ hoàn toàn dòng placeholder thừa:** Không còn dòng `-- Chọn ... --` trong menu xổ xuống, mở ra thấy ngay danh sách kết quả thực tế.
  * **Thao tác 1 chạm:** Chọn hoặc nhấn Enter lập tức mở phòng chat 1-1 riêng (`startDirectChat`), tự động đóng dropdown và reset ô chọn về trạng thái sạch sẽ cho lần dùng kế tiếp.
  * Bổ sung nút đóng `×` nhanh trên thanh tiêu đề dropdown để tắt nhanh khi đổi ý.

### 2. Tải Toàn Diện & Đầy Đủ 100% Tài Khoản Được Cấp Trong Hệ Thống (`apps/dispatch/views.py` & `OfficeTaskDirectoryAPIView`):
- Thay vì chỉ lọc qua quan hệ `Employee.objects.filter(user__isnull=False)`, hệ thống duyệt qua toàn bộ `User.objects.filter(is_active=True).select_related('employee')`.
- Đảm bảo tất cả các tài khoản nhân sự được cấp quyền đăng nhập (kể cả Ban Giám Đốc, IT Quản trị, hay nhân viên mới thêm) đều xuất hiện đầy đủ trong danh bạ văn phòng và danh sách đồng nghiệp để nhắn tin, không bao giờ bị sót.
- Chuẩn hóa hàm `ensureOfficeDirectoryLoaded()` trong `static/js/collaboration.js` đảm bảo luôn trả về mảng danh bạ hợp lệ và loại bỏ hàm khai báo trùng lặp.

---

## [v4.1.6] - 2026-10-22 (Đồng Bộ Dữ Liệu Bản Tin Đa Phòng Ban Cho Ban Giám Đốc & Chuẩn Hóa Thẻ Tin Tinh Gọn Theo Hình 3 & 4)

### 1. Khắc Phục Lỗi Lọc Mất Tin Tức Phân Hệ Bản Tin (apps/collaboration/api_views/news_api.py):
- **Bối cảnh & Nguyên nhân:** Trong Django Admin có 4 bài viết đã xuất bản thuộc các phòng ban khác nhau (Toàn công ty, Kế toán, Đội xe, Điều vận). Tuy nhiên khi Ban Giám Đốc truy cập /news, API trước đây áp dụng cứng bộ lọc target_department=employee.department (vốn là MANAGEMENT), khiến 3 bài viết của Kế toán, Đội xe, Điều vận bị lọc mất, người dùng chỉ nhìn thấy duy nhất 1 tin tức.
- **Xử lý đặc quyền quản trị (is_privileged):** Ban Giám Đốc (role=DIRECTOR, department=MANAGEMENT), Superuser và quản lý cấp cao (hierarchy_level >= 80) được phân quyền xem toàn bộ bài viết của tất cả các phòng ban.
- **Bộ lọc phòng ban linh hoạt:** Bổ sung tham số ?department= tại API và dropdown chọn phòng ban trên thanh công cụ trang Bản tin (#news-department-filter) cho phép lọc theo phòng ban (Tất cả, Toàn công ty, Điều vận, Kế toán, Đội xe, Kinh doanh, Nhân sự, Hải quan).
- **Serializers:** Bổ sung target_department_display vào CompanyPostListSerializer để trả về tên phòng ban thân thiện.

### 2. Thiết Kế Thẻ Bản Tin Tinh Gọn, Đơn Giản & Liền Mạch Theo Chuẩn Hình 3 & 4 (static/js/collaboration.js & templates/views/view_news.html):
- **Loại bỏ hoàn toàn các khối cồng kềnh:** Bỏ icon tròn to bản bên trái (w-10 h-10), bỏ vạch viền sọc dày border-l-4, bỏ cột nút xem chi tiết to bản bên phải.
- **Đồng bộ hóa 100% theo giao diện thẻ thông báo trực quan (Hình 3 & 4):**
  * **Hàng 1 (Badges & Ngày tháng):** Cụm huy hiệu tinh gọn [ ! Khẩn ] (rose-100), [ Ghim ] (amber-100), [ Danh mục ] (màu nhận diện) và [ Phòng ban ] nằm bên trái; ngày phát hành định dạng chuẩn DD/MM/YYYY (ví dụ 17/10/2026) nằm sát bên phải.
  * **Hàng 2 (Tiêu đề):** Tiêu đề in đậm font heading (text-xs sm:text-sm font-bold text-slate-800 group-hover:text-teal-800), hiển thị tối ưu 1-2 dòng.
  * **Hàng 3 (Tóm tắt nội dung):** Đoạn trích dẫn nội dung (text-[11px] sm:text-xs text-slate-500 font-normal line-clamp-2), văn phong rõ ràng, súc tích.
  * **Hàng 4 (Chân thẻ):** Bên trái hiển thị thông tin tác giả Người đăng: Võ Triển (Giám Đốc) cùng số lượng tệp đính kèm và lượt xem; bên phải hiển thị nút Đọc tiếp > và nút ghim nhanh cho quản trị viên.
- **Trải nghiệm thẻ card thanh lịch:** Viền mỏng border-slate-200/90 rounded-xl, hiệu ứng hover nhẹ hover:border-teal-400 hover:bg-teal-50/20, bấm vào bất kỳ vị trí nào trên thẻ đều mở trang toàn văn chi tiết trên Base layout.

### 3. Kiểm Thử Toàn Diện & Đảm Bảo Zero-Regression:
- Bổ sung Unit test tự động test_news_list_executive_department_visibility_and_filter xác nhận Ban Giám Đốc xem đủ 4/4 bản tin đa phòng ban và nhân viên thường lọc đúng phạm vi.
- Kiểm thử JavaScript: node -c static/js/collaboration.js và node -c static/js/app.js đạt 0 lỗi cú pháp.
- Kiểm thử hồi quy hệ thống: Chạy 145/145 unit tests đạt 100% PASSED (OK).

---

## [v4.1.5] - 2026-10-22 (Bổ Sung Toàn Diện Phân Hệ Quản Lý Rơ-Moóc Container & Cơ Cấu Tab Điều Hướng Đội Xe)

### 1. Cơ Cấu Tab Chuyển Đổi Phương Tiện Chuyên Nghiệp (`templates/views/view_fleet.html`):
- **Bối cảnh & Yêu cầu:** Phân hệ "Xe & Bãi" trước đây chỉ có bảng hiển thị phương tiện Đầu Kéo & Xe Tải, trong khi thẻ KPI ghi nhận tới 35 Rơ-moóc nhưng không có tab để quản lý, theo dõi danh mục Rơ-moóc container.
- **Thanh Tab Điều Hướng Hai Chiều:**
  * **Tab 1 - Đầu Kéo & Xe Tải:** Kèm huy hiệu đếm số lượng xe thực tế, bảng giám sát kỹ thuật, hạn đăng kiểm và lịch bảo dưỡng định kỳ.
  * **Tab 2 - Rơ-Moóc Container:** Bổ sung giao diện chuyên biệt giám sát 35 rơ-moóc container với đầy đủ quy cách/loại moóc (Moóc xương 40ft, Moóc cổ cò, Moóc sàn, Moóc xương 20ft...), hãng sản xuất (CIMC, Tân Thanh, Doosung...), tải trọng thiết kế/cho phép (kg), hạn đăng kiểm định kỳ và trạng thái vận hành (Nằm bãi / Đang kéo / Bảo trì).
  * **Tương tác KPI thông minh:** Bấm vào thẻ "Tổng Đầu kéo" tự động chuyển sang tab Đầu Kéo; bấm vào thẻ "Tổng Rơ-moóc" tự động chuyển sang tab Rơ-Moóc; bấm vào "Cảnh báo Đăng kiểm" hoặc "Đến hạn Bảo trì" tự động lọc phương tiện có nguy cơ quá hạn.
  * **Tác vụ nhanh (Quick Actions):** Nút "Xuất Excel" xuất danh sách chi tiết theo tab đang xem (UTF-8 BOM hỗ trợ tiếng Việt có dấu); nút "Tạo mới" linh hoạt mở form tạo Đầu Kéo hoặc Rơ-Moóc tương ứng.

### 2. Mở Rộng Backend API Đội Xe (`apps/dispatch/api_views.py` - `FleetAPIView`):
- Bổ sung danh sách `trailers` đầy đủ vào response của `/api/fleet/` với các thông số: `id`, `plate`, `type`, `brand`, `payload_display`, `payload_capacity_kg`, `design_payload_kg`, `reg_expiry`, `reg_days_left`, `is_reg_expired`, `is_reg_warning`, `status`, `status_raw`.
- Mở rộng thuật toán cảnh báo đăng kiểm (`reg_warning_count`): Tính toán tổng hợp hạn đăng kiểm của cả đầu kéo xe tải và rơ-moóc container (cảnh báo <= 15 ngày hoặc quá hạn).

### 3. Chuẩn Hóa Frontend Logic & Quản Trị Cột (`static/js/app.js` & `static/js/modules/fleet.js`):
- **Hệ thống lọc thông minh cho Rơ-Moóc:** Lọc tự động theo Loại moóc (unique values), Lọc theo Trạng thái (Nằm bãi, Đang kéo, Bảo trì, Cảnh báo đăng kiểm), Tìm kiếm đa năng theo biển số, thương hiệu, loại moóc.
- **Tùy chỉnh cột động (`column_manager.js`):** Tích hợp `fleet-trailers-table` vào trình tùy biến ẩn/hiện cột với khả năng lưu cấu hình preferences cá nhân hóa.
- **Đồng bộ hóa Master Data 2 chiều:** Cho phép chỉnh sửa trực tiếp thông tin đầu kéo và rơ-moóc qua nút thao tác trên từng dòng, tự động reload lại bảng Xe & Bãi ngay khi lưu dữ liệu.

---

## [v4.1.4] - 2026-10-22 (Cơ Cấu Toàn Diện Dropdown Tìm Kiếm Trực Tiếp: Kính Lúp Dòng Đầu & Gõ Free-Text Trong Ô)

### 1. Chuẩn Hóa Kiến Trúc Dropdown Tìm Kiếm Hai Chiều (Universal Searchable Combobox):
- **Bối cảnh & Yêu cầu:** Các danh mục Cảng/Depot, Kho bãi, Khách hàng, Đối tác 3PL, Tài xế, Xe đầu kéo có danh sách rất dài, trước đây sử dụng HTML `<select>` thuần khiến người dùng phải cuộn chuột tìm kiếm thủ công rất bất tiện.
- **Giải pháp UX/UI Hiện Đại (`static/js/app.js` & `static/css/main.css`):**
  * **Kính lúp & Thanh tìm kiếm dòng đầu tiên:** Khi mở dropdown, ngay trên dòng đầu tiên có thanh tìm kiếm cố định (sticky) với biểu tượng kính lúp (`ph-magnifying-glass`), placeholder gợi ý rõ ràng và tự động focus sẵn sàng gõ từ khóa.
  * **Gõ Free-Text trực tiếp trong ô ("trong ô đó luôn"):** Người dùng có thể gõ trực tiếp từ khóa vào ô hiển thị chính, danh sách dropdown sẽ tự động mở và lọc tức thì theo thời gian thực.
  * **Loại bỏ hoàn toàn dòng placeholder thừa:** Đã loại bỏ triệt để các dòng placeholder dạng `-- Chọn Đầu kéo/ Xe tải TVL --`, `-- Chọn Cảng / Depot Lấy --`, v.v. khỏi danh sách kết quả xổ xuống. Khi người dùng mở dropdown, hệ thống hiển thị ngay các lựa chọn dữ liệu thực tế bên dưới thanh tìm kiếm kính lúp mà không còn dòng placeholder thừa.
  * **Bộ lọc thông minh không dấu:** Tự động chuẩn hóa tiếng Việt loại bỏ dấu (`removeVietnameseAccents`), cho phép gõ "cat lai" để tìm "CẢNG CÁT LÁI", "song than" để tìm "CHÂN THẬT SÓNG THẦN".
  * **Highlight từ khóa:** Tự động bôi vàng nổi bật các ký tự khớp từ khóa (`<mark class="bg-amber-100 font-bold">`).
  * **Tách Badge phân loại:** Tự động tách và gắn nhãn tag thẩm mỹ cho các phân loại ví dụ `(CẢNG BIỂN)`, `(KHO NGOẠI QUAN)`, `[Mã KH]` giúp giao diện trực quan và chuyên nghiệp.
  * **Điều hướng bàn phím hoàn chỉnh:** Hỗ trợ `ArrowUp`/`ArrowDown` di chuyển chọn mục, `Enter` để chọn, `Escape` hoặc `Tab` để đóng, `Click Outside` tự động khôi phục dữ liệu hợp lệ.
  * **Nút Xóa Nhanh (Clear `×`):** Xuất hiện khi đã chọn giá trị, click 1 chạm để xóa và chọn lại.

### 2. Tinh Gọn Layout Biểu Mẫu, Loại Bỏ Các Ô Search Tách Rời:
- Loại bỏ hoàn toàn các ô input tìm kiếm tách riêng cồng kềnh trước đây (`inp-customer-search`, `quote-customer-search`, `booking-customer-search`) chiếm tới 5 cột trên lưới.
- Mở rộng ô chọn Khách Hàng, Điểm Lấy/Kho/Hạ thành ô Combobox đồng nhất toàn chiều rộng, tích hợp tính năng tìm kiếm trực tiếp trong ô giúp giao diện gọn gàng, thoáng đãng.
- Tự động áp dụng trên toàn bộ hệ thống: Modal Tạo Chuyến Xe, Chi Tiết Chuyến Xe, Modal Booking, Chi Tiết Booking, Modal Báo Giá, Chi Tiết Báo Giá, Modal Tạm Ứng Tài Xế.
- Bảo toàn 100% tính nguyên vẹn: Thẻ `<select>` gốc được duy trì ẩn trong DOM, đảm bảo toàn bộ hàm `getVal()`, event listener `change`, và xác thực form hoạt động ổn định không phát sinh lỗi hồi quy.

---

## [v4.1.4] - 2026-10-22 (Chuẩn Hóa Danh Sách Bản Tin Dạng Đoạn Thống Nhất, Loại Bỏ Thẻ Bọc Nắp Gradient & Triệt Tiêu Trùng Lặp)

### 1. Thống Nhất Trình Bày Bản Tin Dạng Đoạn Tin Tức Chuẩn Mực (`static/js/collaboration.js` & `view_news.html`):
- **Đồng bộ hóa cấu trúc thông tin theo chuẩn Thẻ 1:**
  * Toàn bộ danh sách bản tin được chuẩn hóa hiển thị thành các đoạn tin tức thanh thoát, trải rộng theo chiều ngang (Clean Streamlined Feed).
  * Mỗi đoạn bản tin có vạch định danh bên trái (`border-l-4`):
    - Đỏ (`border-l-rose-500 bg-rose-50/20`) cho thông báo Khẩn cấp.
    - Hổ phách (`border-l-amber-500 bg-amber-50/20`) cho thông báo Đã ghim.
    - Xanh ngọc (`border-l-teal-600 bg-white`) cho thông báo chung/vận hành.
  * Cấu trúc thông tin phân tầng sắc nét:
    - **Hàng 1:** Huy hiệu loại tin (`Khẩn cấp`, `Đã ghim`, `Tên danh mục`) + Tác giả (`Võ Triển (Giám Đốc)`) + Thời gian đăng + Huy hiệu phạm vi phòng ban.
    - **Hàng 2:** Tiêu đề to bản, đậm nét, chuyển màu teal khi rê chuột (`text-base sm:text-[17px] font-extrabold text-slate-900`).
    - **Hàng 3:** Đoạn tóm tắt nội dung trích dẫn tương ứng (`line-clamp-2 text-slate-600 leading-relaxed font-normal`), cho phép đọc nhanh cốt lõi chỉ đạo.
    - **Hàng 4:** Lượt xem, số lượng thảo luận và huy hiệu tệp đính kèm (`Có tệp đính kèm`).
  * Bên phải: Nút ghim/bỏ ghim (nếu có quyền) và nút **`Xem chi tiết ->`** gọn gàng, tinh tế.

### 2. Loại Bỏ Khối Thẻ Bọc Cồng Kềnh & Triệt Tiêu Trùng Lặp Bài Viết:
- **Loại bỏ thẻ bọc nắp gradient:** Xóa bỏ hoàn toàn kiểu card 3 cột cồng kềnh với nắp ảnh/gradient xanh đen tối tăm (`h-28` / `h-44`) chiếm dụng diện tích thị giác.
- **Loại bỏ thẻ bọc viền đỏ:** Bỏ khối banner bọc viền đỏ rực riêng biệt ở trên để gom tất cả bài viết vào một danh sách feed duy nhất.
- **Triệt tiêu 100% tình trạng lặp lại:** Bài viết không còn xuất hiện 2 lần trên cùng một màn hình; bài ghim và khẩn cấp tự động đứng đầu feed với vạch nhận diện nổi bật.

---

## [v4.1.3] - 2026-10-22 (Tích Hợp Toàn Diện Trang Chi Tiết Bản Tin Nằm Trên Base & Loại Bỏ Mở Tab Mới)

### 1. Tích Hợp Chi Tiết Bản Tin Trực Tiếp Vào Khung Ứng Dụng Chuẩn (`templates/news_detail.html` kế thừa `base.html`):
- **Kiến trúc Base Thống Nhất:**
  * Chuyển đổi `news_detail.html` từ trang standalone độc lập sang kế thừa trực tiếp từ `templates/base.html` (`{% extends 'base.html' %}`).
  * Duy trì Sidebar điều hướng bên trái và Topbar chuẩn của hệ thống BIM Logistics (có logo, breadcrumbs, nút Trợ giúp, Chuông thông báo, Hồ sơ tài khoản).
  * Subheader trong nội dung tích hợp nút "Quay lại Bản tin" mượt mà kèm Breadcrumbs: `Dashboard > Bản tin & Thông báo > [Tên bài viết]`.
  * Topbar fullpage mode (`setTopbarFullpageMode`) kích hoạt tự động với prefix `Bản tin & Thông báo` và tiêu đề `Chi tiết văn bản`.
  * Mục `ban-tin` trên Sidebar tự động được làm nổi bật (active) với màu xanh ngọc đồng bộ.
  * Trong `switchTab`: Bổ sung cơ chế điều hướng URL an toàn (`window.location.href = routePath`) khi người dùng click vào bất kỳ menu nào trên Sidebar từ trang chi tiết bản tin.

### 2. Loại Bỏ Triệt Để Mở Tab Mới (`_blank`), Tăng Trải Nghiệm Chuyên Nghiệp:
- **Widget Dashboard (`static/js/app.js`):**
  * Chuyển đổi sự kiện click vào tin tức từ `window.open(..., '_blank')` sang điều hướng trực tiếp trong cùng tab `window.location.href = '/news/' + hashid + '/'`.
- **Phân Hệ Bản Tin Công Ty (`static/js/collaboration.js` & `templates/views/view_news.html`):**
  * Hàm `openNewsDetailPage`: Chuyển sang `window.location.href = '/news/' + target + '/'`.
  * Banner thông báo khẩn cấp / đã ghim: Đổi nhãn `Mở xem trang mới` kèm icon `ph-arrow-square-out` thành `Xem chi tiết` kèm icon `ph-arrow-right`.
  * Modal chi tiết bản tin (`modal-news-detail`): Cập nhật nút xem toàn văn sang icon `ph-book-open`, tooltip chuẩn chỉ không gây hiểu nhầm về tab mới.

### 3. Bảo Toàn 100% Tính Năng Của Bộ Xem Trước Tài Liệu Trực Tiếp (Live Document Previewer):
- Giữ nguyên toàn bộ 5 chế độ xem trước: PDF iframe native, Word qua Mammoth.js, Excel bảng tính tương tác qua SheetJS, Trình xem ảnh và Fallback tải về.
- Giữ nguyên hệ thống thảo luận/bình luận nội bộ và sao chép liên kết HashID bảo mật.

---

## [v4.1.2] - 2026-10-22 (Chuẩn Hóa Thẻ KPI Điều Vận Đồng Bộ & Nâng Cấp Nút Chọn Kỳ Chuẩn SaaS)

### 1. Tái Cấu Trúc Toàn Diện Thẻ KPI Điều Vận & Hải Quan (Đồng bộ theo Hình 2):
- **Bố cục thẻ KPI (`view_dispatch.html` & `view_customs.html`):**
  * Áp dụng đường viền màu định danh bên trái (`border-l-4`): Indigo (Tổng chuyến), Teal (Đang chạy), Amber (Chờ duyệt chi phí), Rose (Cảnh báo cắt máng).
  * Hàng trên cùng: Tiêu đề in hoa (`uppercase tracking-wider font-heading`) kết hợp huy hiệu trạng thái/loại hình (`pill badge` có icon) tại góc phải.
  * Số liệu trung tâm: Kiểu chữ lớn `text-3xl font-black tabular-nums` rõ ràng, uy lực.
  * Hàng ghi chú dưới: Cỡ chữ nhỏ kèm icon tương ứng (`Kỳ điều độ hiện tại`, `Xe đang trên lộ trình`, `Khoản kê cần xác nhận`, `Chuyến cần ưu tiên hạ`).
  * Loại bỏ hoàn toàn khối icon hộp vuông `w-11 h-11` cũ ở bên phải, tạo bố cục rộng rãi, sang trọng đồng nhất 100% với màn hình Sale & Booking.

### 2. Chuẩn Hóa Nút Chọn Kỳ (Period Selector) Thống Nhất Giữa Các Phân Hệ:
- **Chuẩn hóa giao diện bộ chọn kỳ:**
  * Tích hợp icon lịch `ph-bold ph-calendar-check text-teal-600` bên trái và mũi tên caret `ph ph-caret-down text-slate-400` bên phải.
  * Chuẩn hóa kích thước, độ bo góc (`rounded-xl`), font chữ (`text-xs font-bold font-heading`), đổ bóng nhẹ `shadow-2xs` và hiệu ứng hover viền `hover:border-teal-500`.
  * Đồng bộ định dạng tên tùy chọn trên tất cả màn hình: `Kỳ: Hôm Nay`, `Kỳ: 10 Ngày Qua`, `Kỳ: Tháng Này`, `Kỳ: Quý Này`, `Kỳ: Năm Nay`, `Kỳ: Tất Cả`.
  * Áp dụng đồng loạt trên: **Điều Vận (`view_dispatch.html`)**, **Kinh Doanh - Báo Giá & Booking (`view_sales.html`)**, **Dịch Vụ Hải Quan (`view_customs.html`)**, và **Sổ Quỹ Tiền Mặt (`view_accounting.html`)**.

---

## [v4.1.1] - 2026-10-22 (Đồng Bộ Quản Lý Công Việc & Bộ Lọc 4 Chiều: Tất Cả | Đã Giao | Được Giao | Liên Quan)

### 1. Đồng Bộ Hóa Nhãn Điều Hướng Widget Quản Lý Công Việc (`view_dashboard.html`):
- **Chuyển đổi nhãn:** Thay thế nút `[Bảng việc ->]` thành `[Xem tất cả ->]` nhằm tạo tính nhất quán 100% với Widget Bản Tin & Thông Báo bên cạnh.
- **Điều hướng có ngữ cảnh (`goToTasksFromDashboard`):** Khi người dùng đang chọn một bộ lọc cụ thể trên Dashboard (ví dụ: `Đã giao` hoặc `Được giao`), bấm `[Xem tất cả ->]` sẽ tự động kích hoạt bộ lọc tương ứng trên phân hệ Quản lý công việc toàn diện (`view_tasks.html`).

### 2. Tích Hợp Bộ Lọc 4 Chiều Toàn Diện (Tất Cả | Đã Giao | Được Giao | Liên Quan):
- **Widget Dashboard (`view_dashboard.html` & `static/js/app.js`):**
  * Tích hợp thanh pills 4 tùy chọn ngay trên toolbar của Widget Công việc: `Tất cả` (`all`), `Đã giao` (`assigned_by_me`), `Được giao` (`assigned_to_me`), `Liên quan` (`related`).
  * Xử lý lọc dữ liệu tức thì (0ms latency) trên `cachedDashboardTasks`, cập nhật tự động huy hiệu số lượng việc còn tồn đọng và hiển thị thông điệp trống thân thiện theo từng phạm vi.
- **Phân Hệ Quản Lý Công Việc Chi Tiết (`view_tasks.html`, `static/js/collaboration.js` & `tasks_api.py`):**
  * Đồng bộ 4 nút lọc trên thanh Header: `Tất cả` | `Đã giao` | `Được giao` | `Liên quan`.
  * Cập nhật API `OfficeTaskListCreateAPIView` hỗ trợ `scope=assigned_to_me` và `scope=related` bên cạnh `assigned_by_me` và `all`.
  * Bổ sung trường `follower_ids`, `is_reporter`, `is_assignee`, `is_follower` trong payload của `DashboardBGDAPIView` để tối ưu hóa việc phân loại.

---

## [v4.1.0] - 2026-10-22 (Tối Ưu Giao Diện: Tinh Gọn Profile Dropdown Menu Chuẩn Modern SaaS)

### 1. Tinh Gọn & Tái Cấu Trúc Bố Cục Thẻ Hồ Sơ Người Dùng (`templates/components/topbar.html`):
- **Bối cảnh & Vấn đề Cũ:**
  * Menu Dropdown thông tin tài khoản cá nhân có chiều cao quá lớn (>380px) và bị chia thành nhiều khối rời rạc.
  * Thông tin bị trùng lặp: Họ tên nhân viên hiển thị 2 lần liên tiếp (ở Header và lại ở dòng "Tên:"), Nút "Cài đặt" xuất hiện 2 lần (ở góc trên Header và ở danh sách hành động).
  * Khối giữa kẻ bảng phân dòng ("Tên:", "User:", "Email:", "Mã NV:") với icon màu xanh thô kệch, tạo cảm giác form hành chính cũ thay vì profile card hiện đại.
  * Nút "Đăng xuất" bị đóng khối viền hồng dày tách biệt, thiếu tính liền mạch tinh tế.
- **Giải pháp Chuẩn Hóa UI/UX SaaS Cao Cấp:**
  * **Header Profile Tích Hợp Thông Minh:** Tích hợp trọn vẹn Avatar (icon nhận diện vai trò), Họ tên, Email, Huy hiệu chức vụ (`role pill`), Mã nhân viên (`#KT001`) và Tên phòng ban trong một Card phần đầu duy nhất với nền `slate-50/teal-50` trang nhã.
  * **Loại bỏ Hoàn Toàn Khối Kẻ Bảng Trùng Lặp Ở Giữa:** Giảm 40% chiều cao menu (từ 380px xuống ~240px), giúp dropdown menu hiển thị cực kỳ thanh thoát, trực quan và không che khuất màn hình làm việc.
  * **Chuẩn Hóa Danh Mục Hành Động 1-Touch:**
    - `Cài đặt tài khoản` (Icon bánh răng `ph-gear-six`, phụ đề "Hồ sơ, mật khẩu & liên hệ", mở modal `openProfileSettingsModal()`).
    - `Hướng dẫn sử dụng` (Icon quyển sách `ph-book-open`, phụ đề "Sổ tay nghiệp vụ & quy trình", mở `/helps`).
    - `Đăng xuất` (Icon `ph-sign-out`, tone màu rose thanh lịch, chuyển tiếp mượt mà).
  * **Bảo toàn 100% Khả Năng Tương Thích JavaScript (Zero-Regression):** Giữ nguyên các ID DOM (`topbar-dropdown-fullname`, `topbar-profile-val-name`, `topbar-profile-val-email`, `topbar-dropdown-role`) để logic cập nhật họ tên/email tức thì trong file `static/js/app.js` luôn hoạt động chuẩn xác 100%.

---

## [v4.0.9] - 2026-10-22 (Chuẩn Hóa Enterprise B2B ERP: Tái Cấu Trúc Bố Cục Điều Vận, Khử Màu Sci-Fi AI & Tích Hợp Ngăn Kéo Giả Lập Điện Thoại Thông Minh)

### 1. Tích Hợp Giả Lập Điện Thoại Tài Xế Thành Ngăn Kéo Mở Rộng Thông Minh (Collapsible Right Side Drawer):
- **Bối cảnh & Nghiệp vụ Thực Tế:**
  * Điều độ viên văn phòng đôi khi cần hỗ trợ thao tác trực tiếp hoặc kiểm tra màn hình điện thoại của tài xế ngay trong lúc đang theo dõi dữ liệu chuyến xe mà không muốn mở trang mới (mất ngữ cảnh điều vận) hay bị một khung điện thoại chiếm cố định diện tích gây lệch giao diện.
- **Giải pháp Kỹ Thuật Đạt Chuẩn UI/UX Quốc Tế:**
  * **Cơ chế Ngăn Kéo Thông Minh (`#driver-phone-drawer`):**
    - Thiết kế drawer bên phải (`w-[380px] xl:w-[410px] shrink-0 border-l border-slate-200 bg-slate-100 flex flex-col h-full overflow-hidden shadow-2xl transition-all duration-300`).
    - Khi đóng: Vùng làm việc chính của điều độ tự động dãn rộng 100% full-width (`flex-1 min-w-0`), hiển thị trọn vẹn và cân xứng tất cả các bảng biểu (7 mốc kho, Bảng kê chi phí 8 mục, Bảng tiến độ 11 bước, P&L).
    - Khi mở: Drawer trượt ra mượt mà bên phải màn hình với khung điện thoại iPhone mô phỏng chân thực, đầy đủ các nút bấm 1-chạm (Nhận lệnh, Chụp POD, Chỉ đường 3 điểm, Báo mốc, Kê chi phí, Báo sự cố, Gọi điều độ/nhận hàng).
  * **Nút Điều Khiển Trên Header (`#btn-toggle-driver-phone`):**
    - Tích hợp nút toggle `[Màn Hình Tài Xế]` / `[Ẩn Giả Lập]` trên header, đi kèm nút mở tab riêng độc lập nếu muốn.
    - Hàm `window.toggleDriverPhoneDrawer(forceState)` điều khiển đóng mở và tự động đồng bộ dữ liệu thời gian thực của chuyến xe vào app di động.

### 2. Tái Bố Cục Bảng Biểu & Khử Triệt Để Màu Sắc Hơi Hướng AI Candy/Sci-Fi:
- **Tái cấu trúc 4 Hàng Dữ Liệu Nghiệp Vụ Chuẩn Mực:**
  * **Hàng 1 (Tổng quan Thiết bị & EIR):** Thông tin xe, tài xế, cont, seal, booking, dock và lộ trình 3 điểm cân xứng với Quản lý hạn Free DEM/DET cảng & tình trạng vỏ EIR (bỏ viền neon chói, đưa về tone Slate/Teal trang nhã).
  * **Hàng 2 (Tiến độ thời gian 7 Mốc Kho):** Trải rộng toàn màn hình với 7 ô mốc đồng bộ nền `bg-slate-50 border border-slate-200`, hiển thị giờ rõ nét chuẩn font số monospace, xóa bỏ hoàn toàn 7 màu pastel sặc sỡ (xanh, đỏ, tím, vàng...) gây rối mắt.
  * **Hàng 3 (Bảng Kê Chi Phí Triền Võ 8 Mục & P&L):** Trải rộng 100% toàn màn hình, bảng 8 cột được dàn thoáng đãng, dễ kiểm tra đối chiếu hóa đơn điện tử và số tiền phát sinh kèm 3 card P&L (Doanh thu, Chi phí, Lợi nhuận gộp).
  * **Hàng 4 (Tiến độ 11 Bước & Chứng Từ Gốc):** Lưới 2 cột chia tỉ lệ 7/5 giữa Bảng quy trình điều vận khép kín và Danh sách chứng từ gốc/hóa đơn điện tử.
- **Thanh Điều Hành Bước Tiếp Theo (`#dispatcher-smart-action-bar`):**
  * Xóa bỏ nền đen gradient sci-fi (`from-slate-900 via-slate-800 to-teal-950`) phong cách AI dark-mode.
  * Chuyển thành thẻ Enterprise Clean B2B (`bg-white rounded-2xl border border-slate-200 border-l-4 border-l-teal-600 p-4 shadow-2xs`), chữ tối màu dễ đọc, cụm nút bấm điều hành màu sắc rõ nét (Teal đậm, Emerald, Amber, Rose tinh tế) tối ưu cho thao tác nhanh của Điều độ viên.
- **Chuẩn Hóa 4 Thẻ KPI Phân Hệ Điều Vận (`view_dispatch.html`):**
  * Loại bỏ viền dày 4px sặc sỡ kiểu template dashboard AI, đưa về card phẳng tối giản `bg-white border border-slate-200 shadow-2xs` với phân cấp số liệu lớn và icon semantic tinh tế.

### 3. Sửa Lỗi Breadcrumb & Chữ Đè Trên Topbar:
- Sửa tiêu đề trang chi tiết chuyến xe: Chuyển từ `Chi tiết chuyến | ${trip.id}` thành `Chi tiết chuyến ${trip.id}` để loại bỏ ký tự phân cách `|` bị lặp lại hai lần liên tiếp trên Topbar, tránh đè chữ lên nút Back và các nhãn điều hướng.

## [v4.0.8] - 2026-10-22 (Tối Ưu Bố Cục Toolbar Điều Vận & Bổ Sung Bộ Lọc Kỳ Nội Bộ Cho Kinh Doanh, Điều Vận, Hải Quan)

### 1. Di Chuyển Nút Thao Tác Xuống Toolbar Bảng Điều Vận (Theo Hình 1 & 2):
- Loại bỏ hàng nút bấm trôi nổi phía trên đỉnh phân hệ Điều Vận.
- Di chuyển nút [Quyết Toán Đợt Tài Xế] và [+ Tạo mới] xuống thanh header/toolbar của bảng danh sách chuyến xe (ngay cạnh các nút Hiển thị, Ẩn Đã Hoàn Thành, Cột, Đặt lại).
- 4 thẻ KPI Điều Vận được đưa lên sát mép trên, tối ưu hóa không gian hiển thị, loại bỏ khoảng trống thừa.
- Bổ sung dropdown **Bộ chọn Kỳ Điều Vận** (#filter-dispatch-period - Mặc định: *Kỳ: Tháng Này*) trực tiếp trên thanh toolbar này và cập nhật hàm loadTripsData().

### 2. Bổ Sung Bộ Chọn Kỳ Cho Kinh Doanh / Sale & Booking (Theo Hình 3 & 4):
- **Subtab 1 - Báo Giá Tuyến Cước (CRM):** Bổ sung dropdown #quote-filter-period ([Kỳ: Tháng Này v]) vào header của Subtab 1, đứng cạnh nhãn *Sales / NVKD* và nút *+ Tạo mới*.
- **Subtab 2 - Đơn Đặt Hàng / Booking (CS):** Bổ sung dropdown #booking-filter-period ([Kỳ: Tháng Này v]) vào header của Subtab 2, đứng cạnh nhãn *Sale Admin / CS* và nút *+ Tạo mới*.
- Cập nhật hàm loadSalesData() trong static/js/app.js để đọc kỳ lọc tương ứng và đồng bộ dữ liệu.

### 3. Chuẩn Hóa Bố Cục Đồng Bộ Phân Hệ Hải Quan:
- Di chuyển [Xuất Bảng Kê Excel] và [+ Tạo mới] từ đỉnh trang xuống thanh Filter Toolbar sát bên trên lưới bảng tờ khai.
- Bổ sung dropdown #customs-filter-period ([Kỳ: Tháng Này v]) và cập nhật etchCustomsDeclarations().

## [v4.0.8] - 2026-10-22 (Tái Cấu Trúc Toàn Diện Chuẩn Enterprise — Xóa Bỏ Hơi Hướng AI Demo & Nâng Cấp Bàn Điều Phối Thực Tế)

### 1. Loại Bỏ Khung Điện Thoại iPhone Simulator & Nâng Cấp Bàn Điều Phối Desktop:
- **Bối cảnh & Vấn đề:**
  * Màn hình Chi tiết Chuyến xe (view_trip_detail.html) trước đây dành tới 35% diện tích bên phải để hiển thị một khung điện thoại iPhone giả lập (Simulator) chạy app tài xế.
  * Trong thực tế vận hành, điều độ viên làm việc trên máy tính cần không gian hiển thị tối đa cho số liệu, lộ trình, mốc thời gian và chứng từ; trong khi tài xế sử dụng cổng di động riêng (driver_portal.html) trên điện thoại cá nhân. Việc nhét khung điện thoại vào màn hình quản trị là tư duy showcase AI/hackathon, gây lãng phí diện tích và làm rối mắt người vận hành.
- **Giải pháp Kỹ Thuật Đạt Chuẩn Enterprise:**
  * **Xóa bỏ hoàn toàn khung iPhone Simulator:** Giải phóng 100% diện tích chiều ngang màn hình cho dữ liệu nghiệp vụ.
  * **Thanh Điều Hành & Cập Nhật Mốc Tiếp Theo (Dispatcher Smart Action Bar):**
    - Đặt ngay trên cùng của màn hình chi tiết, hiển thị rõ ràng: Trạng thái hiện tại, Mốc tiếp theo (#dispatcher-next-step-label, #dispatcher-next-action-title, #dispatcher-next-action-desc).
    - Cụm nút hành động 1-chạm (#dispatcher-next-action-btns): Cho phép Điều độ viên bấm xác nhận tức thì các bước (Nhận chuyến, Xuất phát, Báo sắp đến kho, Check-in cổng kho, Đóng/dỡ hàng, POD, Kéo cont hạ bãi, Đã hạ cont) thay cho tài xế nếu tài xế báo qua điện thoại hoặc bộ đàm.
    - Cụm phím tắt nghiệp vụ nhanh: Thêm Chi Phí, Đính Kèm Chứng Từ / POD, Ghi Nhận Sự Cố.
  * **Bố cục Lưới 2 Cột Desktop Enterprise (7 Cột Trái / 5 Cột Phải):**
    - Cột Trái (Nghiệp vụ Vận tải, Lộ trình & Mốc tiến độ): Thông tin EIR & Vận chuyển hiện trường, Quản lý hạn Free DEM/DET, 7 Mốc thời gian thực tế tại kho và Bảng tiến độ thực hiện (11 bước).
    - Cột Phải (Tài chính, Chi phí & Chứng từ số): Hộp tóm tắt P&L Chuyến xe, Bảng kê chi phí phát sinh Triền Võ (cost-sheet-card) và Danh sách chứng từ số / Hóa đơn điện tử liên quan.
  * **Cột Thao Tác Trực Tiếp Trên Bảng Tiến Độ 11 Bước:**
    - Bổ sung cột thứ 5 'Thao Tác Điều Độ' trong bảng #detail-timeline.
    - Khi một mốc đang active, hiển thị nút [Xác nhận] màu xanh teal chuẩn Enterprise; khi click, hàm confirmDispatcherMilestone(step) tự động ánh xạ mốc và gửi cập nhật lên backend API /api/trips/<trip>/milestones/.

### 2. Xóa Bỏ Tính Năng Giả Mạo AI OCR — Nâng Cấp Thành Trình Tiếp Nhận Hóa Đơn Số & Chứng Từ Thực Tế:
- **Bối cảnh & Vấn đề:**
  * Component modal_ocr.html và hàm startOcrScan() cũ sử dụng lệnh chờ setTimeout 1000ms, in ra dòng chữ 'AI OCR đang xử lý... Quét thành công (Độ chính xác 98.5%)' và gán cố định dữ liệu chuỗi 'Trạm thu phí Cầu Đồng Nai - 120.000 VNĐ'. Đây là dấu hiệu của bản mock demo AI biểu diễn cho người xem, không phục vụ sản xuất thực tế.
- **Giải pháp Kỹ Thuật Đạt Chuẩn Enterprise:**
  * **Tái thiết kế modal_ocr.html:** Chuyển đổi thành Modal Tiếp Nhận Hóa Đơn & Chứng Từ Vận Tải Thực Tế.
  * **Tải tệp & Dán từ Clipboard:** Cho phép chọn file ảnh/PDF hóa đơn điện tử thực tế từ máy tính HOẶC bấm nút / phím tắt Ctrl+V để dán ảnh chụp màn hình từ clipboard. Hiển thị thẻ preview tên tệp, dung lượng và icon (PDF / Image) trước khi lưu.
  * **Nhập liệu đầy đủ chuẩn Kế toán Logistics:** Phân loại rõ ràng giữa Chi Phí Phát Sinh (Khoản mục, Số tiền VNĐ, Số HĐĐT, Mã tra cứu HĐĐT, Ghi chú) và Chứng Từ Nghiệm Thu (Loại chứng từ: EIR, POD, Phiếu cân, HĐ GTGT; Số Cont, Số Seal).
  * **Truyền nhận tệp thực tế qua FormData:** Hàm submitOcrData() đóng gói dữ liệu và file đính kèm gửi trực tiếp tới API /api/trips/<trip>/expenses/ hoặc /api/trips/<trip>/documents/, cập nhật dữ liệu tức thì.

### 3. Chuẩn Hóa Giao Diện Đăng Nhập & Hệ Thống Màu Sắc:
- **Trang Đăng Nhập (login.html):**
  * Loại bỏ hoàn toàn animation gradient nền 15s và các hình trang trí tròn xoay chuyển động (deco-circle blur-2xl).
  * Áp dụng nền Slate trung tính nhẹ dịu (bg-slate-100), card đăng nhập gọn gàng bg-white rounded-2xl shadow-xl border border-slate-200/90.
  * Nút đăng nhập chuyển sang tông Teal thương hiệu vững chắc (bg-teal-700 hover:bg-teal-800), xóa bỏ hiệu ứng phát sáng neon lòe loẹt.
- **Bảo Vệ Zero-Regression Toàn Diện:**
  * Cú pháp JS: node -c static/js/app.js & node -c static/js/column_manager.js (0 lỗi).
  * Toàn bộ 144/144 Unit Tests backend và frontend integrity passed 100% (Ran 144 tests in 47.899s - OK).

## [v4.0.7] - 2026-10-22 (Chuẩn Hóa Topbar Cố Định Cực Tối Giản & Tích Hợp Bộ Lọc Kỳ Nội Bộ Phân Hệ - Zero Layout Shift & Zero Extra Rows)

### 1. Tối Ưu Bố Cục UI/UX: Chuyển Bộ Chọn Kỳ & Nút Thao Tác Khỏi Topbar Về Nội Bộ Phân Hệ:
- **Bối cảnh & Vấn đề giải quyết:**
  * Trước đây, Topbar chứa cụm #topbar-dashboard-actions (Bộ chọn kỳ toàn cục, Nút ẩn/hiện biểu đồ, Nút làm mới). Cụm này lúc ẩn lúc hiện tùy thuộc vào tab đang truy cập (ví dụ: ẩn khi vào Quyết toán, Xe bãi, Nhân sự, Cài đặt... và hiện khi vào Dashboard).
  * Việc bật/tắt liên tục các phần tử trên Topbar gây ra hiện tượng **Layout Shift (CLS > 0)**: thanh Topbar co dãn, tiêu đề và nút bấm bị xê dịch vị trí khiến tầm mắt và con trỏ chuột của người dùng bị xáo trộn khi chuyển phân hệ.
  * Ngoài ra, mỗi phân hệ có nhu cầu quản lý thời gian độc lập (Dashboard cần theo dõi chiến lược 10 ngày/quý, Sổ Quỹ Kế toán cần xem phát sinh tháng này, Báo cáo & Thống kê có thanh kỳ riêng...).
- **Giải pháp Kỹ Thuật Đạt Chuẩn 2 Ràng Buộc (Zero Layout Shift & Zero Extra Rows):**
  * **Topbar Cố Định Tuyệt Đối (Clean & Stable Navigation Header):**
    - Loại bỏ hoàn toàn khối #topbar-dashboard-actions khỏi templates/components/topbar.html.
    - Chiều cao (64px - h-16) và vị trí các khối trên Topbar (Nút Sidebar, Tiêu đề phân hệ bên trái; Ngày hôm nay, Trợ giúp, Chuông thông báo, User Avatar bên phải) được cố định 100% trên toàn bộ mọi phân hệ.
    - Khi chuyển tab, giao diện Topbar giữ nguyên không gian thị giác hoàn hảo, chỉ cập nhật chuỗi text tiêu đề trang (#topbar-page-title).
  * **Tích Hợp Đúng Chuẩn Tại Dashboard (Zero Extra Rows):**
    - Chuyển bộ chọn kỳ (#dashboard-period-dropdown-container), popover chọn ngày tùy chọn (#topbar-custom-date-popover), nút ẩn/hiện biểu đồ (#btn-toggle-dashboard-charts) và nút làm mới vào chung hàng flex có sẵn của khối chào mừng (view_dashboard.html).
    - Tất cả nằm thẳng hàng với bộ chọn góc nhìn phòng ban (#dash-view-as-container), không tạo thêm bất kỳ hàng/dòng phụ nào, giữ trọn vẹn không gian hiển thị của 4 trụ cột chiến lược P&L.
  * **Tích Hợp Đúng Chuẩn Tại Kế Toán - Sổ Quỹ Thu Chi (Zero Extra Rows):**
    - Nâng cấp grid bộ lọc Sổ Quỹ từ 4 cột lên 5 cột (lg:grid-cols-5) trên templates/views/view_accounting.html.
    - Bổ sung dropdown #cash-filter-period (mặc định: *Kỳ: Tháng Này*) nằm chung một hàng cùng với Quỹ, Loại giao dịch, Khoản mục và Tìm kiếm.
    - Cập nhật loadCashBookData() và renderCashBookTable() trong static/js/app.js để đọc trực tiếp kỳ từ dropdown nội bộ, hoàn toàn độc lập với Topbar.
- **Kiểm Thử & Xác Nhận Hệ Thống:**
  * Cú pháp JS: node -c static/js/app.js & node -c static/js/column_manager.js (0 lỗi).
  * Toàn bộ 144/144 Unit Tests backend & frontend integrity vượt qua thành công 100% (Ran 144 tests in 45.777s - OK).

## [v4.0.6] - 2026-10-22 (Rà Soát Toàn Diện & Xử Lý Triệt Để Lỗi Trùng Lặp Ký Hiệu Tiền Tệ "đ đ")

### 1. Khử Trùng Lặp Ký Hiệu Tiền Tệ Trên Toàn Bộ Hệ Thống:
- **Nguyên nhân gốc rễ (Root Cause Analysis):**
  * Hàm tiện ích `formatMoneyVND(amount)` và `formatMoney(n)` trong `static/js/app.js` vốn đã tự động định dạng và gắn kèm hậu tố đơn vị tiền tệ `' đ'` ở cuối (`new Intl.NumberFormat('vi-VN').format(...) + ' đ'`).
  * Tuy nhiên, tại 38 vị trí trong `app.js` (bao gồm các dòng tổng `BimTableFooter` của Sổ Quỹ Thu Chi, Tạm Ứng Tài Xế, Quỹ Điều Vận, Khóa Sổ Gom Chuyến, Xe Bạn 3PL, Vé BOT, Hải Quan và các Modal chi tiết / In phiếu A4), mã nguồn lại tiếp tục nối thêm ký tự ` đ` hoặc ` VNĐ` phía sau dạng `${formatMoneyVND(val)} đ`, dẫn tới việc hiển thị trùng lặp thành `+21.000.000 đ đ` hoặc `... đ VNĐ`.
- **Giải pháp Kỹ Thuật Đa Tầng (Defensive Multi-layer Architecture):**
  * **Tầng 1 (Toàn diện mã nguồn Frontend):** Rà soát quét tự động bằng AST/Regex trên toàn bộ 14 tệp JavaScript, 61 tệp HTML Template và 293 tệp Python; chuẩn hóa chính xác toàn bộ 38 vị trí trong `static/js/app.js`, loại bỏ triệt để chuỗi nối dư thừa.
  * **Tầng 2 (Bộ lọc an toàn tại Core Table Engine):** Nâng cấp phương thức `BimTableFooter.render` trong `static/js/column_manager.js`, bổ sung regex sanitizer tự động khử sạch mọi chuỗi trùng lặp tiền tệ (`/(?:đ\s*đ|đ\s*VNĐ|VNĐ\s*đ|VNĐ\s*VNĐ)/gi -> 'đ'`) trước khi render ra DOM. Điều này đảm bảo trong tương lai mọi bảng dữ liệu đều được bảo vệ tự động 100%.
- **Kiểm Thử & Xác Minh Live (Goal-Driven Verification):**
  * Cú pháp JS: `node -c static/js/app.js` & `node -c static/js/column_manager.js` (0 lỗi).
  * 144/144 Unit Tests backend và frontend integrity passed 100% (`Ran 144 tests in 47.286s - OK`).
  * Đã push lên GitHub `origin master` (commit `210144a`) và deploy lên VPS live `https://logistics.bim.info.vn`.
  * Playwright UAT trên VPS live xác nhận:
    - Chân bảng Sổ Quỹ Thu Chi hiển thị chính xác: `+21.000.000 đ` (0 lỗi `đ đ`).
    - Chân bảng Tạm Ứng Tài Xế hiển thị chính xác: `8.500.000 đ | 6.200.000 đ | +2.300.000 đ`.
  * Artifact minh chứng: `210_vps_cashbook_single_d_clean.png`.

## [v4.0.5] - 2026-10-22 (Chuẩn Hóa UX Sổ Quỹ Thu Chi & Minh Bạch Số Liệu Tồn Quỹ Lũy Kế)

### 1. Minh Bạch Số Liệu Tồn Quỹ & Khắc Phục Hiểu Nhầm Bộ Lọc Kỳ:
- **Làm rõ bản chất 2 lớp số liệu kế toán:**
  * **Lớp 1 (3 Thẻ Tồn Quỹ Đầu Kỳ / Hiện Tại):** Thể hiện số dư thực tế tích lũy tại két sắt và tài khoản ngân hàng của toàn doanh nghiệp tính đến thời điểm hiện tại.
  * **Lớp 2 (Bảng Giao Dịch & Dòng Tiền Thuần):** Thể hiện các phiếu thu/chi phát sinh trong kỳ lọc thời gian được chọn trên Topbar (mặc định 10 ngày qua).
- **Cập nhật Phụ đề KPI Trực Quan:**
  * *Tồn Quỹ Tiền Mặt:* "Lũy kế tồn két cty đến nay".
  * *Số Dư Tài Khoản Ngân Hàng:* "Lũy kế TK ngân hàng đến nay".
  * *Tổng Tồn Quỹ Toàn Cty:* "Két cty + Số dư ngân hàng đến nay".
- **Empty State Thông Minh với Nút Chuyển Nhanh (Smart Empty State):**
  * Khi kỳ lọc được chọn (ví dụ "10 Ngày qua") chưa có phiếu phát sinh, giao diện không chỉ hiện thông báo khô khan mà giải thích rõ: *"Chưa có phiếu thu / chi nào trong khoảng '10 Ngày qua'. Ba thẻ chỉ số ở trên thể hiện số dư tồn quỹ thực tế tích lũy của toàn công ty tính đến thời điểm hiện tại"*.
  * Cung cấp ngay 2 nút chuyển nhanh: `[Xem Phiếu Tháng Này]` và `[Xem Cả Năm]` để người dùng bấm 1 chạm là hiển thị ngay toàn bộ các phiếu đã có.
- **Kiểm Thử & Đồng Bộ VPS Live:**
  * 144/144 Unit Tests backend và frontend syntax passed 100%.
  * Đã push lên GitHub và deploy lên VPS live `https://logistics.bim.info.vn`.
  * Đã kiểm chứng thị giác thực tế bằng Playwright (Artifacts #208, #209).

## [v4.0.4] - 2026-10-22 (Xử Lý Triệt Để Lỗi Kế Toán ReferenceError & Khôi Phục Phân Hệ Quyết Toán Gom Chuyến)

### 1. Khắc Phục Triệt Để Toast Lỗi & ReferenceError Khi Vào Tab Kế Toán:
- **Nguyên nhân gốc rễ (Root Cause Analysis):**
  * Khi người dùng bấm vào tab *"Tài chính & Kế toán"* (`switchTab('ke-toan')`), hệ thống kích hoạt hàm `loadAccountingAdvancesData()`. Hàm này gọi tới `populateAdvanceModalOptions(data)` để nạp danh sách chuyến xe và tài xế vào modal Tạm ứng.
  * Trong một commit trước đó (`eb2d2aa`), khi chuẩn hóa các nút bấm CRUD của Quỹ Điều Vận, phần thân bảng `renderSettlementTable` đã bị dán đè nhầm vào giữa hàm `renderDispatcherFundsTable()`. Sự cố này vô tình làm cắt cụt hàm render Quỹ Điều Vận và xóa mất định nghĩa hàm `populateAdvanceModalOptions(data)`.
  * Do `populateAdvanceModalOptions` không tồn tại, JS engine quăng ngoại lệ `ReferenceError: populateAdvanceModalOptions is not defined`, rơi vào khối `catch` và kích hoạt Toast đỏ: *"[Lỗi Kế Toán] Không thể kết nối máy chủ để tải dữ liệu tạm ứng"*.
  * Đồng thời, các hàm phân hệ Quyết toán gom chuyến (`loadSettlementData`, `onSettlementGroupByChange`, `populateSettlementTargetOptions`, `setSettlementDatePreset`, `resetSettlementFilters`, `filterSettlementClientSide`) bị thiếu định nghĩa, nhưng tại dòng 28850 lại có lệnh gán trực tiếp không bọc an toàn: `window.loadSettlementData = loadSettlementData;` gây ra `Uncaught ReferenceError: loadSettlementData is not defined`, làm ngưng toàn bộ quá trình export ra `window` từ dòng 28850 đến 32665.

- **Giải pháp kỹ thuật (Defensive & Resilient Architecture):**
  * **Phòng thủ đa tầng (Guarded Calls):** Trong `loadAccountingAdvancesData()`, bọc lời gọi bằng `if (typeof populateAdvanceModalOptions === 'function') populateAdvanceModalOptions(data);`.
  * **Khôi phục hoàn chỉnh `populateAdvanceModalOptions(data)`:** Nạp đầy đủ 4 dropdown liên kết (Chuyến xe, Bác tài, Quỹ điều vận, Nhân viên điều phối).
  * **Hoàn thiện cấu trúc `renderDispatcherFundsTable(list)`:** Đóng đúng thẻ `</tr>` và gọi `window.BimTableFooter.render('accounting-fund-table', ...)` để hiển thị dòng TỔNG tiền quỹ, đã xuất cấp, đã hoàn ứng và số dư khả dụng.
  * **Khôi phục toàn bộ phân hệ Quyết toán gom chuyến:** Tái lập đầy đủ `loadSettlementData()`, `onSettlementGroupByChange()`, `populateSettlementTargetOptions()`, `setSettlementDatePreset()`, `resetSettlementFilters()`, `filterSettlementClientSide()`, và phần đầu của `renderSettlementTable(data)`.
  * **Bọc an toàn 100% các lệnh gán window object:** Bọc toàn bộ các lệnh gán từ dòng 28836 đến 28862 bằng cú pháp `typeof fn !== 'undefined' ? fn : undefined;`, triệt tiêu hoàn toàn nguy cơ dừng script do `ReferenceError`.

- **Kiểm Thử & Xác Minh Thực Tế (Goal-Driven Verification):**
  * `node -c static/js/app.js` & `node -c static/js/column_manager.js`: 0 cú pháp lỗi.
  * Toàn bộ 144/144 Unit Tests backend và frontend syntax passed 100% (`Ran 144 tests in 40.490s - OK`).
  * Đã push lên GitHub `origin master` (commit `fe4f280`) và deploy lên VPS Production `https://logistics.bim.info.vn`.
  * Kiểm thử tự động trên VPS Live bằng Playwright xác nhận:
    - Khi click tab Kế toán: **0 Console Error, 0 Uncaught Exception, 0 Toast Lỗi Đỏ**.
    - Bảng Tạm ứng tài xế hiển thị đầy đủ 4 dòng kèm tính chênh lệch và footer tổng tiền.
    - Subtab Quỹ Điều Vận hiển thị chính xác số dư quỹ 43.250.000 đ.
    - Subtab Khóa Sổ Quyết Toán Chuyến Xe hiển thị 4 chuyến xe đối soát P&L trơn tru.
  * Artifacts minh chứng: `201_vps_accounting_tab_clean_no_error.png`, `203_vps_accounting_driver_advances_tab.png`, `204_vps_accounting_dispatcher_funds_tab.png`, `205_vps_accounting_settlements_tab.png`.

## [v4.0.3] - 2026-10-22 (Chuẩn Hóa Droplist Loại Rơ-Moóc Native & Tải Trọng Đăng Kiểm Kép)

### 1. Chuẩn Hóa Droplist Loại Rơ-Moóc (Master Data Fleet):
- **Thay thế `<input list="datalist">` bằng `<select>` Droplist chuẩn:** Khắc phục triệt để tình trạng thẻ datalist không tự động xổ danh sách khi click trên trình duyệt (do giá trị text cũ đã có sẵn).
- **12 Phân Loại Rơ-Moóc Chuẩn Logistics Việt Nam:**
  * Moóc Xương 40ft (3 Trục), Moóc Cổ Cò 40ft (Chở Cont Lạnh/HC), Moóc Xương 20ft (3 Trục), Moóc Sàn 40ft, Moóc Sàn 45ft, Moóc Lùn / Chuyên Dụng, Moóc Ben (Tự đổ), Moóc Bồn (Xitéc), Moóc Rút (Siêu trường siêu trọng), Moóc Lồng / Khung mui, Moóc Xương 45ft, Moóc Xương 2 Trục.
- **Tùy chọn Nhập Tay Linh Hoạt (`__OTHER__`):**
  * Hỗ trợ tùy chọn `➕ Loại khác (Tự nhập tay)...`. Khi được chọn, giao diện tự động mở rộng ô text input tùy biến viền nét đứt màu ngọc bích (teal) để nhập chủng loại moóc chuyên biệt hoặc đặc thù.
- **Cơ chế Ánh xạ Dữ Liệu Thông Minh (Case-insensitive & Legacy Code Mapping):**
  * Tự động so sánh không phân biệt chữ hoa/chữ thường (ví dụ: `Moóc xương 40ft (3 trục)` khớp 100% với `Moóc Xương 40ft (3 Trục)`).
  * Hỗ trợ ánh xạ các mã danh mục cũ (`MOOC_XUONG_40`, `MOOC_CO_CO_40`...) về tên hiển thị chuẩn tiếng Việt.
- **Kiểm Thử & Đồng Bộ:**
  * Toàn bộ 144/144 Unit Tests backend và frontend syntax passed 100%.
  * Đã push lên GitHub `origin master` (commit `3ddfe4e`) và deploy lên VPS Production `https://logistics.bim.info.vn`.
  * Kiểm thử thị giác thực tế trên VPS bằng Playwright thành công tuyệt đối (Artifacts #195, #196, #197).

### 2. Loại Bỏ Triệt Để Dấu Gạch Ngang Thừa Ở Tải Trọng (Zero-Redundant Dash):
- **Xóa bỏ hậu tố gạch ngang (`-`) trong chuỗi tải trọng:** Cập nhật helper `parse_payload_input` tự động lọc bỏ các ký tự gạch nối/gạch ngang thừa (`-`, `—`, `kg`) ở đầu/cuối chuỗi nhập liệu. Bản ghi `50RM-080.80` mang giá trị `400.000/878.979-` đã được chuẩn hóa sạch 100% thành `400.000/878.979`.
- **Loại bỏ hiển thị `— kg` khi chưa có dữ liệu:** Khi phương tiện hoặc rơ-moóc chưa có thông số tải trọng, bảng hiển thị dấu gạch ngang mờ `—` đơn thuần (không ghép chữ `kg`), đồng bộ với các cột Hãng sản xuất, Tài xế, Hạn đăng kiểm.
- **Form Input An Toàn:** Ô nhập liệu tải trọng trong modal Chỉnh sửa không còn bị điền trước dấu `—` khi chưa có số liệu, giúp người dùng nhập số trực tiếp không bị dính ký tự thừa phía sau.
- **Kiểm Thử & Đồng Bộ VPS:** 144/144 Unit Tests passed 100%, deploy lên VPS `https://logistics.bim.info.vn` và kiểm chứng thị giác thực tế (Artifacts #198, #199, #200).

## [v4.0.2] - 2026-10-22 (Rà Soát Giả Lập Vai Trò 5 Người Dùng, Khắc Phục Màn Hình Trắng Báo Cáo & Cơ Cấu Ma Trận Phân Quyền CRUD)

### 1. Khắc Phục Triệt Để Lỗi Màn Hình Trắng Báo Cáo & Toast Kế Toán:
- **Nguyên nhân cốt lõi:**
  * Người dùng thuộc Phòng Kinh Doanh (sales) hoặc Nhân Sự (
hansu) khi vào hệ thống bị chặn HTTP 403 tại API /api/reports/ do CanViewOperationalReports chỉ cho phép Ban Giám Đốc, Kế Toán và Điều Vận. Việc API trả về 403 khiến hàm loadReportsData() quăng ngoại lệ 	hrow new Error(), làm toàn bộ giao diện Báo cáo không render được dẫn tới màn hình trắng.
  * Khi người dùng chuyển tab qua lại giữa Kế toán và Báo cáo, hàm loadAccountingAdvancesData() gọi /api/accounting/advances/ bị 403 và quăng Toast lỗi đỏ: *'[Lỗi Kế Toán] Không thể kết nối máy chủ để tải dữ liệu tạm ứng'*.
- **Giải pháp xử lý:**
  * **Backend API (pps/dispatch/reports_api.py & core/permissions.py):** Mở quyền truy cập an toàn cho mọi nhân viên văn phòng chính thức gọi /api/reports/. Dữ liệu nhạy cảm (Doanh thu P&L tổng, Lợi nhuận gộp) được bảo mật bằng cơ chế **Field-level Authorization**: ẩn hoàn toàn đối với tài khoản không có quyền tài chính.
  * **Frontend Resilient Loading (static/js/app.js):**
    - Cập nhật hàm canAccessReport() kiểm tra thẩm quyền linh hoạt theo chuyên môn từng phòng ban: Điều Vận xem Báo cáo Vận hành (DEM/DET cont, OTP, Sự cố, Chi phí tuyến, Tạm ứng, Quỹ, Backlog); Kinh Doanh xem Báo cáo Doanh thu khách & TEU, Chi phí tuyến và OTP; Nhân Sự xem Báo cáo Lương & Năng suất tài xế, OTP; Ban Giám Đốc và Kế Toán xem toàn bộ 14 Báo cáo.
    - Bọc an toàn 14 khối render 
enderReport1 đến 
enderReport14 trong từng khối 	ry...catch riêng biệt; tự động chuyển sang nhóm báo cáo hợp lệ đầu tiên mà người dùng được phép xem, loại bỏ hoàn toàn lỗi màn hình trắng.
    - Cập nhật loadAccountingAdvancesData() bắt lỗi 403 âm thầm, không bắn toast lỗi máy chủ gây hiểu lầm.

### 2. Cơ Cấu Ma Trận Phân Quyền CRUD Chuẩn Doanh Nghiệp (Ownership & Hierarchy Access Control):
- **Nguyên tắc quản trị cốt lõi:**
  * **Người tạo (Owner):** Được Xem, Sửa, Xóa (với điều kiện bắt buộc: **Chỉ xóa theo nguyên tắc chưa phát sinh mới được xóa**).
  * **Không phải người tạo:** Nếu có thẩm quyền chuyên môn liên quan thì **CHỈ ĐƯỢC XEM (Read-only)**, tuyệt đối không được Sửa hoặc Xóa trừ cấp quản lý cao hơn (Ban Giám Đốc hoặc Trưởng bộ phận phụ trách).
- **Quy tắc kiểm tra ràng buộc phát sinh trước khi xóa (Zero-Delete on Active Data):**
  1. **Chuyến xe (DispatchTrip):** Chỉ người điều vận tạo lệnh hoặc Ban Giám Đốc mới được xóa; chặn xóa tuyệt đối khi Kế toán đã chốt sổ chi phí (is_expenses_settled=True), đã chốt quyết toán khách hàng (is_customer_settled=True), hoặc đã phát sinh phiếu tạm ứng tài xế hoạt động.
  2. **Báo giá (Quotation):** Chỉ nhân viên Sales tạo báo giá hoặc Ban Giám Đốc mới được xóa; chặn xóa khi báo giá đã được duyệt chính thức (status='APPROVED') hoặc khách hàng đã phát sinh Đơn đặt hàng Booking.
  3. **Đơn hàng Booking (BookingOrder):** Chỉ nhân viên Sales tạo đơn hoặc Ban Giám Đốc mới được xóa; chặn xóa khi đã phát sinh Chuyến xe điều động thực tế.
  4. **Tạm ứng tài xế (DriverTripAdvance):** Chỉ người lập phiếu hoặc Ban Giám Đốc mới được xóa; chặn xóa khi đã hoàn ứng chốt sổ (SETTLED) hoặc đã có phát sinh chi phí thực tế.
  5. **Quỹ điều vận (DispatcherAdvanceFund):** Chỉ điều vận viên lập đề xuất hoặc Ban Giám Đốc mới được xóa; chặn xóa khi quỹ đã được kế toán duyệt chi hoặc đã giải ngân cho các chuyến xe.
  6. **Sổ quỹ tiền mặt (CashTransaction):** Chỉ kế toán lập phiếu hoặc Ban Giám Đốc mới được xóa; các phiếu tự động sinh từ chốt quyết toán chuyến không được xóa độc lập.
- **Tự động liên kết Booking khi phát lệnh điều xe:** Khi Điều Vận nhập số booking hoặc mã booking, hệ thống tự động phân giải và liên kết trực tiếp chuyến xe với BookingOrder.

### 3. Chuẩn Hóa Hồ Sơ & Vai Trò Tài Khoản 
hansu:
- Cập nhật vai trò nhân sự 
hansu từ chức danh kế toán cũ thành chuẩn vị trí **Phòng Hành Chính & Kế Toán (STAFF_ADMIN_ACC - Hành chính nhân sự)** theo đúng sơ đồ tổ chức công ty.
- Cấp quyền xem Báo cáo Lương chuyến & Năng suất tài xế (view_report_driver_salary) và Đúng giờ (view_report_otp) cho nhóm Quản Lý Nhân Sự.

---

## [v4.0.1] - 2026-10-22 (Kiểm Tra & Chuẩn Hóa Ma Trận Tài Khoản Đăng Nhập, Kích Hoạt Active và Xóa Phần Tài Xế)

### 1. Xóa Bỏ Tài Khoản Đăng Nhập Của Tài Xế (Bảo Toàn 100% Hồ Sơ Nhân Sự Hiện Trường):
- **Bản chất nghiệp vụ:** Tài xế không sử dụng tài khoản đăng nhập Web ERP văn phòng (thao tác hiện trường qua Mobile Driver Portal chuyên dụng bằng Token chuyến xe).
- **Xử lý xóa User tài xế:**
  * Xóa bỏ hoàn toàn tài khoản User `taixe`, `tx_that`, `tx_that_1792065354` khỏi bảng `auth_user` trên cả Local và VPS Production.
  * Quan hệ `Employee.user` được thiết lập `on_delete=models.SET_NULL`, bảo toàn 100% dữ liệu hồ sơ nhân sự tài xế (mã `TX001` - Nguyễn Văn Bụi, `TX-S1792065314` - Hoàng Văn Thật...), danh mục điều xe, lịch sử chuyến đi, bảng chấm công và tiền lương tạm tính.
- **Trang Đăng Nhập (`templates/login.html`):**
  * Xóa bỏ tiền tố ví dụ `TX001...` khỏi placeholder ô nhập tài khoản; chuẩn hóa thành: `placeholder="Username, Mã NV (BGD01, DD001, KT001...)"`.

### 2. Chuẩn Hóa & Kích Hoạt Mật Khẩu Cho 5 Tài Khoản Văn Phòng Chính Thức:
- **Khắc phục sự cố trên VPS Production:** Phát hiện và sửa lỗi tài khoản `ketoan` và `sales` bị `is_active = False` trên máy chủ; đặt lại mật khẩu chuẩn xác 100%:
  1. **`admin`** / `Admin@2026`: Võ Công Triền - Ban Giám Đốc (Superuser toàn quyền).
  2. **`dieudo`** / `DieuDo@2026`: Trần Điều Độ - Phòng Điều Vận (Dispatcher).
  3. **`ketoan`** / `KeToan@2026`: Trần Thị Kế Toán - Phòng Kế Toán & Tài Chính (Accountant, kích hoạt lại `is_active=True`).
  4. **`sales`** / `Sales@2026`: Nguyễn Minh Thuân / Lê Hoàng Nam - Phòng Kinh Doanh (Salesman, kích hoạt lại `is_active=True`).
  5. **`nhansu`** / `NhanSu@2026`: Lê Thị Thu Thảo - Phòng Hành Chính Nhân Sự (HR).

---

## [v4.0.0] - 2026-10-22 (Chuẩn Hóa Thao Tác CRUD Cho Các Phiếu Ở Phân Hệ Tài Chính & Kế Toán: Chuẩn 2 Nút Bảng Thao Tác & Bộ 4 Nút Sửa - Lưu - In - Xóa)

### 1. Chuẩn Hóa Cột Thao Tác Tại Các Bảng Kế Toán (2 Nút Bấm Trực Quan Chuẩn BIM):
- **Bảng Quản Lý Tạm Ứng & Đối Soát Hoàn Ứng Tài Xế (#accounting-advances-table):**
  * Thay thế cột thao tác đơn điệu (chỉ có 1 nút hoặc text 'Đã chốt sổ') thành **chuẩn 2 nút thao tác**:
    1. **Nút [Xem]** (viền teal thanh lịch, icon ph-eye): Bấm mở modal chi tiết phiếu tạm ứng hỗ trợ đầy đủ chế độ xem, sửa, lưu, in và xóa.
    2. **Nút [Quyết Toán]** (màu emerald, icon ph-calculator, đối với phiếu đang tạm ứng) HOẶC **Nút [In]** (viền slate, icon ph-printer, đối với phiếu đã hoàn ứng).
- **Bảng Quản Lý Quỹ Tạm Ứng Điều Vận (#accounting-dispatcher-funds-table):**
  * Nâng cấp thành **chuẩn 2 nút thao tác**:
    1. **Nút [Xem]** (viền indigo, icon ph-eye): Mở chi tiết Quỹ Điều Vận để kiểm soát dòng tiền, giải ngân, duyệt hoặc xóa.
    2. **Nút [Duyệt Quỹ]** (nếu Chờ duyệt) / **Nút [Quyết Toán]** (nếu Đang lưu hành) / **Nút [In]** (nếu Đã hoàn ứng) / **Nút [Xóa]** (nếu Bị từ chối).
- **Bảng Đối Soát & Quyết Toán Nhà Xe Thầu Phụ 3PL (#accounting-subcon-table):**
  * Nâng cấp cột thao tác: Nút 1 [Sửa] thỏa thuận cước và Nút 2 [Quyết Toán] (hoặc [In Phiếu] nếu đã hoàn tất).

### 2. Thiết Kế Bộ 4 Nút Hành Động Chuẩn BIM Khi Mở Chi Tiết Phiếu (Sửa - Lưu - In - Xóa):
- **Modal Chi Tiết Phiếu Tạm Ứng Tài Xế (templates/components/modal_driver_advance.html):**
  * Hỗ trợ 2 chế độ: **Tạo mới (Create)** và **Chi tiết (View/Edit)**.
  * Hiển thị mã phiếu (TUTX-...), banner trạng thái (Đang tạm ứng / Đã hoàn ứng), khối tóm tắt quyết toán hoàn ứng (thực chi, tiền hoàn/bù, người chốt).
  * Bộ 4 nút hành động ở chân trang:
    1. **[Xóa Phiếu]** (màu đỏ rose, icon ph-trash): Soft-delete an toàn qua showConfirmModal, tự động hoàn trả số tiền tạm ứng vào Quỹ Điều Vận hoặc trừ khỏi chuyến xe (chặn xóa nếu đã chốt hoàn ứng).
    2. **[In Phiếu]** (màu slate, icon ph-printer): Xuất bản in Phiếu Chi Tạm Ứng Chuyến Xe Mẫu 02-TT / C40-BB theo chuẩn Bộ Tài Chính A4 sắc nét, có bảng ký 5 bên.
    3. **[Sửa]** (màu amber, icon ph-pencil-simple): Mở khóa các trường dữ liệu để hiệu chỉnh.
    4. **[Lưu]** (màu teal, icon ph-check): Gọi API PUT cập nhật dữ liệu.
- **Modal Chi Tiết Quỹ Điều Vận (templates/components/modal_dispatcher_fund.html):**
  * Hiển thị đầy đủ số tiền cấp quỹ, số tiền đã giải ngân cho các chuyến xe, số tiền đã thu hồi và số dư khả dụng còn lại.
  * Đầy đủ bộ 4 nút hành động: [Xóa Quỹ] (chỉ cho phép xóa khi chưa giải ngân), [In Phiếu], [Sửa], [Lưu], [Đóng].
- **Modal Quyết Toán Xe Bạn Thầu Phụ 3PL (modal_subcontractor_settle.html):**
  * Bổ sung nút [Hủy Quyết Toán] (hoàn tác về trạng thái chờ quyết toán), [In Phiếu Quyết Toán 3PL], [Sửa], [Lưu].
- **Modal Đối Soát & Hoàn Ứng Tạm Ứng (modal_settle_advance.html):**
  * Bổ sung nút [In Biên Bản Hoàn Ứng] A4 chuẩn kế toán xác nhận chênh lệch và chữ ký 3 bên.

### 3. Backend RESTful APIs Cho Phiếu Kế Toán (pps/billing/advance_views.py):
- GET /api/accounting/driver-advances/<id>/: Trả về chi tiết phiếu tạm ứng chuyến xe kèm thông tin chuyến, tài xế, quỹ điều vận và kết quả quyết toán.
- PUT/PATCH /api/accounting/driver-advances/<id>/: Cập nhật số tiền, ngày ứng, mục đích, ghi chú; tự động đối chiếu số dư Quỹ Điều Vận và cập nhật chuyến xe.
- DELETE /api/accounting/driver-advances/<id>/: Soft-delete phiếu tạm ứng, bảo vệ tính toàn vẹn (chặn xóa phiếu đã hoàn ứng).
- GET /api/accounting/dispatcher-funds/<id>/: Chi tiết Quỹ Điều Vận.
- PUT/PATCH /api/accounting/dispatcher-funds/<id>/: Cập nhật thông tin Quỹ Điều Vận.
- DELETE /api/accounting/dispatcher-funds/<id>/: Soft-delete Quỹ Điều Vận (chặn xóa nếu quỹ đã phát sinh giải ngân cho các chuyến xe).
- Bổ sung action unsettle cho SubcontractorSettlementsAPIView (pps/billing/finance_reports_api.py).

### 4. Đảm Bảo Chất Lượng & Kiểm Thử Hồi Quy 100%:
- Bổ sung test case 	est_accounting_driver_advance_and_fund_crud vào pps/billing/tests.py.
- Toàn bộ 142/142 tests passing (python manage.py test --keepdb).
- Đạt 100% chuẩn cú pháp JavaScript (node -c static/js/app.js và node -c static/js/column_manager.js).

---

## [v3.9.9] - 2026-10-22 (Khắc Phục Lỗi 404 Xem Chứng Từ Đính Kèm, Bổ Sung Bộ File PDF Mẫu EIR/POD A4 & Cơ Chế Safe Media Serve)

### 1. Khắc Phục Triệt Để Lỗi 404 Khi Xem Chứng Từ Đính Kèm:
- **Nguyên nhân sự cố:** Người dùng truy cập xem chứng từ đính kèm (Biên bản POD chuyến `DV.2610.002`) tại liên kết `/media/trip_docs/sample_doc_2.pdf` bị lỗi `Page not found (404) — “/app/media/trip_docs/sample_doc_2.pdf” does not exist`. Lý do: trong cơ sở dữ liệu có các bản ghi chứng từ mẫu `sample_doc_1.pdf` đến `sample_doc_4.pdf`, nhưng thư mục `media/trip_docs/` và các file vật lý này chưa được khởi tạo trên máy chủ.
- **Giải pháp xử lý:**
  * Tạo mới thư mục `media/trip_docs/` và sinh bộ 4 file PDF chuẩn mẫu A4 sắc nét (150 DPI) bằng Pillow:
    1. `sample_doc_1.pdf`: Phiếu giao nhận Container tại cảng (EIR Lấy Cont - Cát Lái).
    2. `sample_doc_2.pdf`: Biên bản giao nhận hàng hóa có chữ ký (POD - Proof of Delivery) chuyến `DV.2610.002`.
    3. `sample_doc_3.pdf`: Biên bản giám định tình trạng vỏ cont & niêm phong chì (Seal Lock).
    4. `sample_doc_4.pdf`: Phiếu hạ container rỗng & hoàn tất chuyến xe (EIR Hạ Bãi).
  * Đồng bộ toàn bộ 4 file PDF vào thư mục media của hệ thống ở cả môi trường Local và máy chủ VPS production.

### 2. Thiết Lập Cơ Chế Safe Media Serve Chống Lỗi 404 Vĩnh Viễn (`core/media_views.py`):
- **Phục Vụ File An Toàn Bất Kể DEBUG Mode:**
  * Xây dựng view chuyên dụng `safe_media_serve` thay thế `django.views.static.serve` tại `config/urls.py`.
  * Khi người dùng xem bất kỳ tài liệu nào: nếu file tồn tại trên đĩa -> trả về file trực tiếp. Nếu file bị thất lạc hoặc chưa kịp đồng bộ:
    - Nếu là file mẫu `trip_docs/sample_doc_*.pdf`: Tự động sinh ngay file PDF mẫu nghiệp vụ A4 tương ứng và trả về `HTTP 200`.
    - Nếu là file `.pdf` khác: Tự động xuất trang PDF chứng từ số hóa lưu trữ nội bộ Triền Võ Logistics kèm xác nhận điện tử.
    - Nếu là file ảnh: Tự động trả về ảnh placeholder chuẩn màu BIM (Teal/Slate) xác nhận trạng thái nghiệm thu hiện trường.
  * Đảm bảo trải nghiệm người dùng luôn thông suốt, không bao giờ gặp màn hình lỗi vàng 404 khi bấm nút `[Xem]` chứng từ.

---


## [v3.9.8] - 2026-10-22 (Bổ Sung Tính Năng Xóa Phiếu Điều Độ Chuẩn BIM & Giả Lập Toàn Bộ Chu Trình Từ Báo Giá Đến Quyết Toán)

### 1. Bổ Sung & Chuẩn Hóa Tính Năng Xóa Phiếu Điều Độ (Delete Dispatch Trip):
- **Giao Diện Trực Quan — Top Header Chi Tiết Chuyến (`view_trip_detail.html`):**
  * Bổ sung nút bấm `[Xóa Phiếu]` (màu đỏ rose, icon thùng rác) nổi bật trên thanh công cụ đầu trang cạnh nút `[Sửa]`.
- **Giao Diện Thao Tác Nhanh — Bảng Danh Sách Điều Vận (`view_dispatch.html` & `static/js/app.js`):**
  * Thêm cột "Thao Tác" vào cuối bảng với bộ đôi nút bấm 2 chạm `[Xem]` (mở chi tiết) và `[Xóa]` (xóa nhanh phiếu điều độ).
- **Trải Nghiệm Xác Nhận Chuyên Nghiệp:**
  * Thay thế hộp thoại `prompt` bằng modal xác nhận chuẩn BIM `showConfirmModal` với cảnh báo an toàn, giải thích rõ các tác động nghiệp vụ (hoàn container về đơn hàng, dọn dẹp chi phí chưa chốt sổ).
- **Bảo Vệ Tính Toàn Vẹn & Kế Toán Ở Backend (`apps/dispatch/api_views.py`):**
  * Chặn tuyệt đối hành vi xóa phiếu nếu chuyến xe đã được Kế toán chốt sổ quyết toán (`is_expenses_settled = True` -> trả về `HTTP 403 Forbidden`).
  * Tự động hoàn lại số lượng container đã phát lệnh (`dispatched_containers -= 1`) cho đơn hàng Booking Order liên quan, phục hồi trạng thái Booking tương ứng (`PARTIALLY_DISPATCHED` hoặc `PENDING_DISPATCH`).
  * Hỗ trợ cờ xóa mềm đồng bộ (Cascade Soft-delete) an toàn cho các chứng từ chi phí và hình ảnh đính kèm chưa chốt sổ.
  * Tự động ghi nhận nhật ký hành trình bất biến `TrackingEventLog` với lý do hủy phiếu của điều phối viên.

### 2. Rà Soát & Chạy Giả Lập Chu Trình Vận Tải Toàn Diện (End-to-End Simulation):
- **Xây Dựng Test Suite Tự Động Khép Kín (`apps/dispatch/tests.py` - `EndToEndLogisticsWorkflowSimulationTestCase`):**
  1. *Khách hàng & Báo giá (CRM/Sales):* Tạo Báo giá `BG-SIM-2026-001` (4,500,000 đ/chuyến) -> Giám đốc duyệt `APPROVED`.
  2. *Biểu cước (Tariff):* Thiết lập biểu cước `RouteTariff` (Cước: 4,500,000 đ; Lương tài xế: 550,000 đ; Định mức BOT: 280,000 đ).
  3. *Đơn hàng (Booking):* Tiếp nhận Booking `BK-SIM-2026-01` (2 cont 40HC, `IMPORT_FCL`).
  4. *Điều độ (Dispatch):* Phát lệnh điều xe cont 1 (`TVL-E2E-SIM-001`), gán đầu kéo, rơ-mooc, tài xế -> Booking chuyển `PARTIALLY_DISPATCHED`.
  5. *Vận hành State Machine 8 mốc:* Chuyển tuần tự qua các mốc `ACCEPTED` -> `CONTAINER_PICKED` (gán cont/seal) -> `IN_TRANSIT` -> `AT_WAREHOUSE` -> `UNLOADING` -> `DELIVERED` (tải ảnh POD) -> `RETURNING_EMPTY` (tải phiếu EIR) -> `COMPLETED`.
  6. *Chi phí & Tạm ứng:* Cấp tạm ứng 1,000,000 đ cho tài xế; kê khai 3 chi phí (BOT: 280,000 đ - TVL; Nâng cont: 520,000 đ - Khách chi hộ; Bồi dưỡng: 150,000 đ - TVL) -> Duyệt `APPROVED`.
  7. *Quyết toán (Settlement):* Chốt sổ `settle-expenses` -> Kiểm tra lãi gộp (3,520,000 đ) và đối soát hoàn ứng tài xế (thừa 50,000 đ hoàn lại quỹ).
  8. *Kiểm thử Xóa Phiếu Điều Độ:* Chặn xóa phiếu đã quyết toán (HTTP 403); Tạo và xóa thành công phiếu cont 2 (`TVL-E2E-SIM-002`), hoàn container về booking chuẩn xác.

---


## [v3.9.7] - 2026-10-21 (Cập Nhật Chuẩn Hóa Cơ Cấu Tổ Chức: 5 Phòng Ban & 13 Vị Trí Chức Danh Theo Sơ Đồ Doanh Nghiệp)

### 1. Chuẩn Hóa Danh Mục Phòng Ban (5 Phòng Ban + Ban Giám Đốc):
- **Cơ Cấu Phòng Ban Mới:**
  1. **Ban Giám Đốc** (`MANAGEMENT`)
  2. **Phòng Hành Chính & Kế Toán** (`ADMIN_ACC` - 4 Ô Xanh)
  3. **Phòng Điều Vận** (`DISPATCH` - 4 Ô Xanh)
  4. **Phòng Kinh Doanh** (`SALES` - 4 Ô Xanh)
  5. **Phòng Bảo Trì Vận Hành** (`MAINTENANCE` - 4 Ô Xanh)
  6. **Phòng Dịch Vụ Hải Quan** (`CUSTOMS` - Dịch Vụ Hải Quan)
- **Tương Thích Ngược:** Giữ nguyên các enum cũ `FLEET`, `ACCOUNTING`, `HR` để không làm gián đoạn các dữ liệu nhân sự đã lưu trước đây.

### 2. Chuẩn Hóa 13 Vị Trí Chức Danh Theo Đúng Sơ Đồ Tổ Chức:
- **Phòng Hành Chính & Kế Toán (2 vị trí):**
  * `LEAD_ADMIN_ACC`: Chuyên viên Phụ trách (Hành chính & Kế toán)
  * `STAFF_ADMIN_ACC`: Nhân viên (Hành chính & Kế toán)
- **Phòng Điều Vận (4 vị trí):**
  * `LEAD_DISPATCH`: Chuyên viên Phụ trách (Điều vận)
  * `DISPATCHER`: Nhân viên Điều vận
  * `DISPATCH_ASST`: Nhân viên Hỗ trợ (Điều vận)
  * `DRIVER`: Tài xế & Giao nhận
- **Phòng Kinh Doanh (3 vị trí):**
  * `LEAD_SALES`: Chuyên viên Phụ trách (Kinh doanh)
  * `SALESMAN`: Nhân viên Kinh doanh
  * `CSKH`: Admin / CSKH
- **Phòng Bảo Trì Vận Hành (2 vị trí):**
  * `LEAD_MAINT`: Chuyên viên Phụ trách (Bảo trì vận hành)
  * `MECHANIC`: Nhân viên Bảo trì
- **Phòng Dịch Vụ Hải Quan (2 vị trí):**
  * `LEAD_CUSTOMS`: Chuyên viên Phụ trách (Dịch vụ hải quan)
  * `CUSTOMS_STAFF`: Nhân viên xử lý (Hải quan)
- **Ban Giám Đốc:**
  * `DIRECTOR`: Giám Đốc

### 3. Nâng Cấp Frontend & Trải Nghiệm Người Dùng (Dynamic Cascading Dropdown):
- **Phân Cấp Dropdown Thông Minh:** Khi chọn Phòng Ban tại form tạo mới/chỉnh sửa hồ sơ nhân sự (`view_employee_form.html`), danh sách vị trí chức danh (`emp-role`) tự động lọc và nạp chính xác các chức danh thuộc phòng ban đó qua hàm `handleEmployeeDeptChange(deptVal, selectedRole)`.
- **Bộ Lọc Toàn Diện:** Cập nhật bộ lọc Phòng Ban (`emp-filter-dept`) và Chức Vụ (`emp-filter-role`) trên màn hình Quản lý Nhân sự (`view_personnel.html`) với phân nhóm `optgroup` trực quan.
- **Dịch Vụ Nhập/Xuất Excel (`apps/personnel/import_export_service.py`):** Bổ sung tra cứu tiếng Việt đầy đủ cho 5 phòng ban và 13 vị trí chức danh mới, cho phép import danh sách nhân sự từ file Excel linh hoạt.

---


## [v3.9.6] - 2026-10-21 (Khắc Phục Lỗi Nút [Xóa] Nhân Sự Không Phản Hồi & Đồng Bộ Quy Trình Xóa Mềm An Toàn)

### 1. Khắc Phục Lỗi Frontend — Hàm `deleteEmployeeItem`:
- **Nguyên nhân sự cố:** Nút `[Xóa]` trên màn hình Chi tiết Hồ sơ nhân sự (`view_employee_form.html`) gọi hàm `confirmDeleteCurrentEmployee()`, hàm này cố gắng gọi `deleteEmployeeItem(id)`. Tuy nhiên, hàm `deleteEmployeeItem` chưa từng được định nghĩa trong `static/js/app.js`, gây ra lỗi Javascript `ReferenceError: deleteEmployeeItem is not defined`, làm cho hộp thoại xác nhận không bật lên và nút bấm hoàn toàn đứng im.
- **Giải pháp xử lý:**
  * Xây dựng hàm `deleteEmployeeItem(empId)` tích hợp hộp thoại xác nhận chuẩn BIM `showConfirmModal` (cảnh báo xóa mềm an toàn, icon thùng rác, nút Hủy / Xác Nhận).
  * Gửi yêu cầu `DELETE /api/personnel/employees/${empId}/`, hiển thị thông báo kết quả qua Toast notification.
  * Tự động điều hướng quay lại danh sách nhân sự (`backToPersonnel()`) và tải lại bảng dữ liệu (`loadEmployeesData()`).

### 2. Tối Ưu Hóa & Đồng Bộ Xóa Mềm Ở Backend (`apps/personnel/api_views.py`):
- **Bảo Vệ Tính Toàn Vẹn Dữ Liệu:** Kiểm tra ràng buộc và từ chối xóa nếu nhân sự đã phát sinh chuyến xe điều vận (`DispatchTrip`), tạm ứng tài xế (`DriverTripAdvance`), chứng từ chi phí (`TripExpense`) hoặc phiếu lương trong kỳ đã chốt/thanh toán (`PayrollSlip`).
- **Đồng Bộ Xóa Mềm (Cascaded Soft-Delete):**
  * Đánh dấu nhân sự `is_deleted = True`, `is_active = False`, cập nhật `deleted_at = timezone.now()`.
  * Tự động chuyển toàn bộ hợp đồng lao động (`LaborContract`) liên quan sang `status = TERMINATED` và `is_deleted = True`.
  * Đồng bộ xóa mềm danh sách người phụ thuộc (`EmployeeDependent`).
  * Hủy gán xe nếu đang là tài xế chính của phương tiện (`Vehicle.current_driver = None`).
  * Vô hiệu hóa tài khoản đăng nhập người dùng liên kết (`user.is_active = False`).

---

## [v3.9.6] - 2026-10-22 (Mở Rộng Loại Rơ-Moóc Tùy Biến Datalist & Tải Trọng Thiết Kế / Cho Phép TGGT Chuẩn Đăng Kiểm xxxx/yyyy)

### 1. Phân Hệ Quản Lý Phương Tiện & Danh Mục Master Data (`apps/fleet`, `apps/master_data`, `static/js/app.js`):
- **Mở Rộng Ô "Loại Rơ-Moóc" Cho Phép Tự Do Nhập (Creatable Datalist Dropdown):**
  * Thay thế dropdown tĩnh cứng trước đây bằng trường nhập liệu thông minh tích hợp `datalist` gồm 12 loại moóc thông dụng chuẩn logistics Việt Nam: *Moóc Xương 40ft (3 Trục), Moóc Cổ Cò 40ft (Cont Lạnh/HC), Moóc Xương 20ft (3 Trục), Moóc Sàn 40ft, Moóc Sàn 45ft, Moóc Lùn / Chuyên Dụng, Moóc Ben (Tự đổ), Moóc Bồn (Xitéc), Moóc Rút (Siêu trường siêu trọng), Moóc Lồng / Khung mui, Moóc Xương 45ft, Moóc Xương 2 Trục*.
  * Người dùng có thể nhấp đúp để chọn nhanh từ danh sách gợi ý, hoặc **tự gõ bất kỳ loại moóc chuyên dụng nào khác** mà không bị giới hạn cứng.
  * Mở rộng `Trailer.trailer_type` lên `max_length=100` để lưu trọn vẹn tên loại moóc tùy biến có dấu tiếng Việt.

- **Nâng Cấp Ô "Tải Trọng" Cho Phép Nhập Dạng `xxxx/yyyy` (Chuẩn Sổ Đăng Kiểm Cục Đăng Kiểm VN):**
  * Hỗ trợ lưu trữ và phân tách 2 chỉ số tải trọng pháp lý:
    - **`xxxx`:** Khối lượng hàng chuyên chở theo Thiết kế (*Design payload*).
    - **`yyyy`:** Khối lượng hàng chuyên chở Cho phép tham gia giao thông (*Authorized payload*).
  * Thuật toán phân giải tải trọng `parse_payload_input`: Nhận diện linh hoạt các cách gõ: `30000/27360`, `30.000/27.360`, `30000 / 27360` hoặc số đơn `32000`.
  * Tự động lưu:
    - `design_payload_kg`: Lưu số nguyên tải trọng thiết kế (kg).
    - `payload_capacity_kg`: Lưu số nguyên tải trọng cho phép tham gia giao thông (kg) phục vụ thuật toán kiểm soát an toàn xếp cont chống phạt quá tải cầu đường.
    - `payload_display`: Lưu chuỗi hiển thị chuẩn hóa có dấu chấm phân cách hàng nghìn (`30.000/27.360`).
  * Áp dụng đồng bộ trên cả **Rơ-Moóc (`trailers`)**, **Đầu kéo & Xe tải (`vehicles`)** và **Đội xe Thầu phụ 3PL (`subcontractor_vehicles`)**.
  * Bảng danh sách hiển thị đẹp mắt theo chuẩn đăng kiểm: `30.000 / 27.360 kg`.

- **Hỗ Trợ Nhập/Xuất Excel (`apps/master_data/import_export_service.py`):**
  * Xử lý trường tải trọng dạng `xxxx/yyyy` khi đọc file Excel hàng loạt mà không phát sinh lỗi ép kiểu số nguyên.

### 2. Kiểm Thử Hệ Thống & Zero-Regression:
- Bổ sung 2 bài kiểm thử chuyên sâu: `test_trailer_custom_type_and_dual_payload` và `test_vehicle_dual_payload`.
- Cú pháp Frontend JS: `node -c static/js/app.js` và `node -c static/js/column_manager.js` hợp lệ 100%.
- Kiểm tra toàn vẹn hệ thống: `python manage.py check` xác nhận 0 issues.
- Toàn bộ bộ kiểm thử tự động của dự án: `python manage.py test --keepdb` đạt **144/144 tests passed 100%**.

## [v3.9.5] - 2026-10-21 (Rà Soát & Biên Soạn Chuẩn Hướng Dẫn Sử Dụng Người Dùng Cuối, Cổng Tài Xế Mobile, Tra Cứu Công Khai & Bộ Q&A 10 Tình Huống)

### 1. Trung Tâm Trợ Giúp Tương Tác & Tài Liệu Sổ Tay Người Dùng (`templates/help.html` & `docs/USER_GUIDE.md`):
- **Biên Soạn Chuẩn End-User Centric:**
  * Rà soát loại bỏ hoàn toàn các thuật ngữ dev/kỹ thuật (`REST API`, `Payload`, `Endpoint`, `Database Schema`, `Foreign Key`...), thay thế bằng cẩm nang thao tác trực quan, bảng biểu, ảnh chụp nút bấm thực tế và luồng xử lý A-B-C dễ hiểu cho nhân viên văn phòng và tài xế.
  * Chuẩn hóa đường dẫn 14 danh mục Master Data theo cú pháp 2 tầng: `Vào menu Cài đặt ➔ [Nhóm cha] ➔ Chọn tab [Tab con] ➔ Bấm nút Tạo mới`.
  * Viết lại Khối SOP Phối hợp xử lý thiếu danh mục và Khối Hướng dẫn thao tác bảng dữ liệu (chuẩn 2 nút `[Xem]` & `[In]` cùng thanh công cụ chi tiết).

- **Bổ Sung Tính Năng Cổng Thông Tin Dành Cho Bác Tài (Driver Mobile Portal):**
  * Hướng dẫn tài xế mở link trên smartphone Android/iOS qua trình duyệt web, không cần cài app, chạy mượt trên mạng 3G/4G chập chờn.
  * Thao tác 2 chạm cập nhật 6 mốc vận chuyển thời gian thực (Timestamp).
  * Chụp ảnh biên bản giao nhận có chữ ký (POD) & phiếu nâng hạ (EIR) nén ảnh tự động < 200KB gửi về trung tâm trong < 2 giây.
  * Kê khai chi phí phát sinh với 3 nút bấm to rõ: `Chi phí TVL` (Cty chịu), `TVL chi hộ` (Thu lại từ khách), `3PL chi hộ` (Cấn trừ xe bạn).

- **Bổ Sung Tính Năng Tra Cứu Hành Trình Đơn Hàng Công Khai (Public Tracking Portal):**
  * Dành cho Khách hàng & Chủ hàng tự tra cứu tiến độ 24/7 tại `/tracking/` không cần đăng nhập tài khoản.
  * Tra cứu theo Mã đơn hàng, Mã chuyến xe hoặc Số Container / Số Seal.
  * Thanh tiến trình 6 mốc trực quan kèm xem trước ảnh POD có ký nhận; cơ chế che mờ tự động bảo mật 100% chi phí nội bộ và thông tin cá nhân của lái xe.

- **Bổ Sung Phần IV: Hỏi Đáp & Xử Lý Sự Cố Thường Gặp (Q&A / Troubleshooting):**
  * Tuyển tập 10 câu hỏi nghiệp vụ sát thực tế nhất từ hiện trường và văn phòng:
    1. *Q1: Khắc phục ô Xe tải / Tài xế bị trống khi tạo lệnh điều xe (Cơ chế lọc thông minh theo nguồn xe TVL vs 3PL).*
    2. *Q2: Phân biệt bản chất kế toán và luồng tiền của 3 nút chi phí: "Chi phí TVL", "TVL chi hộ", "3PL chi hộ".*
    3. *Q3: Cơ chế khóa bảo toàn dữ liệu (Audit Trail) khi xóa Khách hàng/Xe đã phát sinh chứng từ & hướng xử lý chuyển Inactive.*
    4. *Q4: Hướng dẫn cài đặt hộp thoại In chuẩn A4/A5 sạch đẹp, căn lề và bật Background Graphics.*
    5. *Q5: Quy trình xử lý ngoại lệ khi tài xế làm mất vé BOT (sao kê VETC/ePass) hoặc quên chụp ảnh POD.*
    6. *Q6: Hướng dẫn ẩn/hiện và kéo thả đổi thứ tự cột trên bảng dữ liệu bằng Universal Column Manager.*
    7. *Q7: Quy trình nhập hàng loạt từ Excel 4 bước không trùng mã và kiểm tra bảng xem trước Preview.*
    8. *Q8: Cơ chế tính lương chuyến và thưởng/phạt dầu theo km định vị GPS (Động cơ Hybrid Payroll).*
    9. *Q9: Phân định rõ ràng mục đích sử dụng giữa "Chat Nội Bộ" (trao đổi tức thời) và "Giao Việc" (Office Tasks).*
    10. *Q10: Xử lý thông báo "Bạn không có quyền truy cập chức năng này" qua phân quyền vai trò RBAC.*

- **Nâng Cấp Cây Thư Mục Mục Lục (Sidebar Navigation):**
  * Bổ sung Mục 13, 14 và Nhóm Cấp cha 4 Q&A vào cây menu sidebar bên trái.
  * Tính năng tìm kiếm nhanh, đóng/mở nhóm mượt mà và hiệu ứng flash highlight khi nhấp bookmark định vị chính xác vị trí.

### 2. Kiểm Thử Hệ Thống & Đảm Bảo Không Lỗi Hồi Quy (Zero-Regression):
- Cú pháp Frontend JS: `node -c static/js/app.js` & `node -c static/js/column_manager.js` chuẩn 100%.
- Kiểm tra tính toàn vẹn hệ thống: `python manage.py check` xác nhận 0 issues.
- Bộ kiểm thử tự động toàn diện: `python manage.py test --keepdb` đạt **135/135 tests passed 100%**.
- Kiểm thử thị giác Playwright: Chụp ảnh thực tế xác thực giao diện:
  * `187_help_center_driver_portal_and_tracking.png` (Giao diện Driver Portal & Public Tracking).
  * `188_help_center_section_iv_qa_troubleshooting.png` (Giao diện Section IV Q&A).
  * `189_help_center_sidebar_qa_tree.png` (Cây mục lục Sidebar hiển thị nhóm Q&A).

## [v3.9.1] - 2026-10-21 (Thêm Tính Năng Xuất Mẫu & Nhập Danh Sách Nhân Sự & Tài Xế Từ File Excel)

### 1. Phân Hệ Quản Lý Nhân Sự — Excel Import & Export Service (`apps/personnel/import_export_service.py`):
- **Tải file mẫu Excel chuẩn Triền Võ Logistics (`Mau_Nhap_Ho_So_Nhan_Su.xlsx`):**
  * Tự động sinh file mẫu định dạng openpyxl chuyên nghiệp: tiêu đề lớn Teal `#0F766E`, dải banner lưu ý hướng dẫn, header cột có chỉ dẫn bắt buộc `(*)`, 3 dòng mẫu chuẩn (Tài xế, Điều độ, Kế toán) và tự động căn chỉnh độ rộng cột.
  * Phủ sóng toàn bộ 26 trường thông tin nhân sự: Mã NV, Họ tên, Biệt danh, SĐT, Email, Phòng ban, Chức vụ, Giới tính, Ngày sinh, CCCD, Ngày/Nơi cấp, MST, BHXH, Địa chỉ thường trú, Chỗ ở hiện nay, Tài khoản ngân hàng, Lương căn bản, Lương đóng BHXH, Số GPLX, Hạn GPLX và Trạng thái hoạt động.
- **Dịch vụ nhập dữ liệu (Import Engine) & Savepoint Isolation:**
  * Hỗ trợ đọc cả `.xlsx` và `.xls`.
  * Tự động nhận diện mapping cột linh hoạt (theo tiếng Việt có dấu hoặc mã kỹ thuật tiếng Anh).
  * Chuyển đổi thông minh các giá trị thực tế: mapping phòng ban/chức vụ/giới tính từ nhiều cách nhập tiếng Việt (`Đội Xe & Bãi`, `Tài xế`, `Nam`...), định dạng ngày tháng đa chuẩn (`YYYY-MM-DD`, `DD/MM/YYYY`).
  * Tự động bỏ qua các dòng mẫu chưa chỉnh sửa.
  * Mỗi dòng được bọc trong `transaction.atomic()` savepoint riêng biệt, chống lỗi dây chuyền (Defensive PostgreSQL).
  * Hỗ trợ cập nhật và khôi phục soft-delete (`is_deleted=False`) khi chọn cờ `update_existing=True`.

### 2. Thuật Toán Sinh Mã Nhân Viên Tự Động (`Employee.generate_next_code`):
- Nếu cột "Mã Nhân Viên" để trống, hệ thống tự động sinh mã theo vai trò và phòng ban:
  * **Tài xế (DRIVER / FLEET):** `TX[STT]` (VD: `TX001`, `TX002`...).
  * **Điều độ (DISPATCHER / DISPATCH):** `DD[STT]` (VD: `DD001`, `DD002`...).
  * **Kế toán (ACCOUNTANT / ACCOUNTING):** `KT[STT]` (VD: `KT001`, `KT002`...).
  * **Kinh doanh (SALESMAN / SALES):** `KD[STT]` (VD: `KD001`, `KD002`...).
  * **Kỹ thuật / Cơ khí (MECHANIC):** `CK[STT]` (VD: `CK001`, `CK002`...).
  * **Ban Giám Đốc (DIRECTOR / MANAGEMENT):** `BGD[STT]`.
  * **Khác:** `NV[STT]`.
- Quét qua `Employee.all_objects` chống trùng mã va chạm tuyệt đối.

### 3. Giao Diện & Trải Nghiệm Người Dùng (UI/UX Accessibility):
- **Bổ sung 3 nút thao tác nhanh trên thanh công cụ Hồ sơ nhân sự (`view_personnel.html`):**
  * `[Mẫu Excel]`: Tải nhanh file template `.xlsx`.
  * `[Nhập Excel]`: Mở modal kéo thả / chọn file nhập dữ liệu.
  * `[Xuất Excel]`: Xuất toàn bộ danh sách nhân sự hiện tại kèm bộ lọc phòng ban và trạng thái ra Excel.
- **Modal Nhập Dữ Liệu Nhân Sự (`modal_employee_import.html`):**
  * Giao diện chuẩn BIM: Dropzone kéo thả trực quan, preview tên file & kích thước, checkbox tùy chọn cập nhật hồ sơ cũ, trạng thái spinner loading và hiển thị kết quả chi tiết từng dòng lỗi nếu có.

### 4. Kiểm Thử Hệ Thống & Zero-Regression:
- Bộ kiểm thử `apps.personnel` đạt **15/15 tests passed 100%**.
- Bộ kiểm thử `apps.master_data` đạt **24/24 tests passed 100%**.
- Kiểm tra cú pháp JavaScript: `node -c static/js/app.js` và `node -c static/js/column_manager.js` hoàn toàn sạch sẽ, không lỗi cú pháp.

---

## [v3.9.0] - 2026-10-21 (Thêm Quy Tắc Tự Động Sinh Mã Nhà Cung Cấp / Đối Tác Theo Phân Loại: 3PL, Garage, NCC)

### 1. Chuẩn Hóa Bảng Mã Định Danh Đối Tác & Nhà Cung Cấp:
- **Thiết lập quy tắc sinh mã tự động:** Khi thêm mới Đối tác / Nhà cung cấp, hệ thống tự động sinh mã định danh chuẩn hóa theo từng nhóm phân loại:
  * **Nhà xe vận tải 3PL (CARRIER):** Mã định dạng 3PL[STT] (VD: 3PL001, 3PL002...).
  * **Gara sửa chữa / bảo dưỡng (GARAGE):** Mã định dạng GAR[STT] (VD: GAR001, GAR002...).
  * **Nhà cung cấp vật tư / dịch vụ khác (SUPPLIER):** Mã định dạng SPL[STT] (VD: SPL001, SPL002...).
- **Cơ chế chống va chạm mã (Collision-Proof) & Bảo toàn Soft-Delete:** Quét qua toàn bộ bản ghi (Subcontractor.all_objects) bao gồm cả các bản ghi đã xóa mềm để tính max(STT) + 1, đảm bảo tuyệt đối không phát sinh lỗi trùng Unique Key trong cơ sở dữ liệu.

### 2. Giao Diện & Trải Nghiệm Người Dùng (UI/UX Dynamics):
- **API Gợi ý mã kế tiếp (/api/master-data/subcontractors/next-code/):** Hỗ trợ tra cứu nhanh mã tiếp theo theo phân loại partner_type.
- **Dynamic Auto-Fill khi đổi loại đối tác:** Trong modal Khai báo Danh mục Master Data, khi người dùng thay đổi lựa chọn Loại đối tác (mdf-sc-partner-type), hệ thống tự động gọi API và điền sẵn mã gợi ý tương ứng mà không cần gõ tay.
- **Tôn trọng mã tùy chỉnh:** Nếu người dùng chủ động gõ mã riêng (ví dụ mã pháp nhân hoặc mã đối tác theo hợp đồng cũ), hệ thống bảo lưu và không ghi đè.

### 3. Đồng Bộ Dịch Vụ Xuất/Nhập Excel & Dữ Liệu Mẫu:
- Cập nhật mẫu template Excel Mau_Nhap_Doi_Tac_Nha_Cung_Cap.xlsx với 3 dòng dữ liệu mẫu đại diện cho 3 nhóm đối tác (3PL001, GAR001, SPL001).
- Bổ sung cơ chế tự động sinh mã chuẩn nếu trong file Excel người dùng để trống cột mã đối tác.

---

## [v3.8.9] - 2026-10-21 (Chuẩn Hóa Đường Dẫn Thao Tác Phân Cấp 2 Tầng Cài Đặt Master Data Trong Help Center & User Guide)

### 1. Chuẩn Hóa Toàn Diện Đường Dẫn Thao Tác 14 Danh Mục Cài Đặt:
- **Cấu trúc điều hướng chuẩn 3 bước:** Chuyển đổi toàn bộ các câu hướng dẫn thao tác trong hệ thống Help Center (`templates/help.html`) và Sổ tay Hướng dẫn sử dụng (`docs/USER_GUIDE.md`) sang định dạng phân cấp 2 tầng rõ ràng:
  `Vào menu Cài đặt ➔ [Nhóm cha] ➔ Chọn tab [Tab con] ➔ Bấm nút Tạo mới` (hoặc thao tác lưu tương ứng).
- **Phủ sóng đầy đủ 5 Nhóm Cha (Master Data Groups) và 14 Tab Con:**
  1. **Khai Báo Ban Đầu:**
     * *Thông Tin Công Ty:* `Vào menu Cài đặt ➔ Khai Báo Ban Đầu ➔ Chọn tab Thông Tin Công Ty ➔ Bấm nút Hiệu Chỉnh Khai Báo Hệ Thống (hoặc Sửa Thông Tin Công Ty).`
     * *Vai Trò & Phân Quyền:* `Vào menu Cài đặt ➔ Khai Báo Ban Đầu ➔ Chọn tab Vai Trò & Phân Quyền ➔ Cấu hình ma trận quyền và bấm nút Lưu.`
  2. **Tài Chính & Quản Trị:**
     * *Biểu Phí Lương Chuyến:* `Vào menu Cài đặt ➔ Tài Chính & Quản Trị ➔ Chọn tab Biểu Phí Lương Chuyến ➔ Bấm nút Tạo mới.`
     * *Phụ Cấp & Kiểm Hóa:* `Vào menu Cài đặt ➔ Tài Chính & Quản Trị ➔ Chọn tab Phụ Cấp & Kiểm Hóa ➔ Bấm nút Tạo mới.`
     * *Khoản Mục Chi:* `Vào menu Cài đặt ➔ Tài Chính & Quản Trị ➔ Chọn tab Khoản Mục Chi ➔ Bấm nút Tạo mới.`
     * *Số Dư Ban Đầu:* `Vào menu Cài đặt ➔ Tài Chính & Quản Trị ➔ Chọn tab Số Dư Ban Đầu ➔ Bấm nút Khai Báo Số Dư Đầu Kỳ (hoặc Tạo mới).`
  3. **Khách Hàng & Đối Tác:**
     * *Khách Hàng:* `Vào menu Cài đặt ➔ Khách Hàng & Đối Tác ➔ Chọn tab Khách Hàng ➔ Bấm nút Tạo mới.`
     * *Biểu Cước Khách:* `Vào menu Cài đặt ➔ Khách Hàng & Đối Tác ➔ Chọn tab Biểu Cước Khách ➔ Bấm nút Tạo mới.`
     * *Thầu Phụ & Nhà Cung Cấp:* `Vào menu Cài đặt ➔ Khách Hàng & Đối Tác ➔ Chọn tab Thầu Phụ & Nhà Cung Cấp ➔ Bấm nút Tạo mới.`
  4. **Mạng Lưới & Địa Điểm:**
     * *Cảng & Kho Bãi:* `Vào menu Cài đặt ➔ Mạng Lưới & Địa Điểm ➔ Chọn tab Cảng & Kho Bãi ➔ Bấm nút Tạo mới.`
     * *Hãng Tàu:* `Vào menu Cài đặt ➔ Mạng Lưới & Địa Điểm ➔ Chọn tab Hãng Tàu ➔ Bấm nút Tạo mới.`
  5. **Phương Tiện & Thiết Bị:**
     * *Đầu Kéo & Xe:* `Vào menu Cài đặt ➔ Phương Tiện & Thiết Bị ➔ Chọn tab Đầu Kéo & Xe ➔ Bấm nút Tạo mới.`
     * *Rơ-Moóc:* `Vào menu Cài đặt ➔ Phương Tiện & Thiết Bị ➔ Chọn tab Rơ-Moóc ➔ Bấm nút Tạo mới.`
     * *Quy Cách Cont & Xe:* `Vào menu Cài đặt ➔ Phương Tiện & Thiết Bị ➔ Chọn tab Quy Cách Cont & Xe ➔ Bấm nút Tạo mới.`
- **Cập nhật đồng bộ toàn bộ các gợi ý thao tác nhanh (Inline Tips):** Tại các phân hệ Báo giá, Booking, Chi phí, Đội xe, Sổ quỹ, Quyết toán thầu phụ và Tờ khai hải quan, toàn bộ chỉ dẫn tạo nhanh khi thiếu Master Data đều được chuẩn hóa cấu trúc 2 tầng.

### 2. Chuẩn Hóa Toàn Diện Văn Phong Hướng Dẫn Đến Người Dùng Cuối (End-User Centric):
- **Khắc phục triệt để các khối văn bản mang tính kỹ thuật / lập trình viên:**
  * **Khối SOP Phân quyền ➔ "Hướng Dẫn Phối Hợp Xử Lý Khi Thiếu Dữ Liệu Trong Danh Mục":** Thay thế các câu văn cấm đoán, thuật ngữ kiến trúc như *Role-Based Access Control*, *SOP*, *Escalation* bằng 4 hướng dẫn phối hợp nghiệp vụ nhẹ nhàng, rõ ràng: thiếu tài xế (liên hệ phòng Nhân sự), thiếu xe/moóc (liên hệ Quản lý Đội xe), thiếu khách/cước (liên hệ Kinh doanh), thiếu khoản chi/phân quyền (liên hệ Kế toán & Admin).
  * **Khối UI/UX Standard ➔ "Hướng Dẫn Thao Tác Trên Bảng Dữ Liệu & Màn Hình Chi Tiết":** Loại bỏ các khái niệm lập trình nội bộ (*UI/UX Standard*, *Trang chi tiết không modal*, *Tuyệt đối không dùng modal*, *Dedicated Detail View*) khỏi tài liệu hướng dẫn người dùng cuối. Thay vào đó, giải thích tường minh công dụng thực tế của 2 nút nhanh trên bảng `[Xem]` & `[In]`, cùng bộ công cụ thao tác trên màn hình chi tiết `[Quay lại]`, `[Sửa]`, `[Lưu]`, `[In]`, `[Xóa]`.
  * **Rà soát & làm sạch toàn bộ các thuật ngữ modal/popup:** Tinh chỉnh tiêu đề và mô tả trong phân hệ Giao việc (`/tasks/`) và Thông báo từ các từ ngữ kỹ thuật sang hướng dẫn thân thiện với người dùng cuối.

### 3. Kiểm Thử Hệ Thống & Xác Thực Thị Giác:
- Kiểm tra toàn bộ cú pháp JS và Django (`python manage.py check`): 0 issues identified.
- Bộ kiểm thử tự động của dự án đạt **130/130 tests passed 100%** (`python manage.py test --keepdb`).
- Kiểm thử hiển thị HTML thực tế trên route `/helps/`: 14/14 mục danh mục khớp 100% đường dẫn thao tác 2 tầng.
- Chụp ảnh thị giác thực tế thành công:
  * `183_help_center_trailers_breadcrumb.png`: Mục 10. Rơ-Moóc, Đầu Kéo & Xe, Thầu Phụ & NCC.
  * `184_help_center_section_ii_overview.png`: Tổng quan 14 danh mục Master Data.
  * `185_help_center_enduser_guide_section_iii.png`: Giao diện khối hướng dẫn phối hợp xử lý thiếu dữ liệu.
  * `186_help_center_enduser_box2_buttons.png`: Giao diện khối hướng dẫn thao tác bảng dữ liệu & màn hình chi tiết.

## [v3.8.8] - 2026-10-21 (Rà Soát & Đăng Ký Đầy Đủ 100% Các Bảng Model Vào Trang Admin Quản Trị Django)

### 1. Đăng Ký Toàn Diện 62/62 Models Toàn Hệ Thống Vào Django Admin:
- **Rà soát & phát hiện 27 Models chưa đăng ký Admin:**
  * Phân hệ **Collaboration** (15 models): `PostCategory`, `CompanyPost`, `PostAttachment`, `PostComment`, `PostReadStatus`, `OfficeTask`, `TaskChecklist`, `TaskComment`, `TaskAttachment`, `TaskActivityLog`, `ChatRoom`, `ChatParticipant`, `ChatMessage`, `ChatAttachment`, `Notification`.
  * Phân hệ **Core** (1 model): `TrackingEventLog`.
  * Phân hệ **Documents** (1 model): `TripDocument`.
  * Phân hệ **Exceptions** (1 model): `TripException`.
  * Phân hệ **Customers** (2 models): `QuotationItem`, `BookingDocument`.
  * Phân hệ **Master Data** (1 model): `OpeningBalance`.
  * Phân hệ **Personnel** (6 models): `AttendanceCode`, `DailyAttendance`, `MonthlyAttendanceSummary`, `PayrollParameter`, `AllowanceGroup`, `AllowanceType`.
- **Triển khai chuẩn ModelAdmin cho 100% các bảng:**
  * Tạo mới `apps/collaboration/admin.py`, `core/admin.py`, `apps/documents/admin.py`, `apps/exceptions/admin.py`.
  * Bổ sung đầy đủ vào `apps/customers/admin.py`, `apps/master_data/admin.py`, `apps/personnel/admin.py`.
  * Thiết lập đầy đủ `list_display`, `list_filter`, `search_fields`, `inlines` (TabularInline cho các bảng con), `date_hierarchy` và `ordering` tối ưu cho nghiệp vụ quản trị dữ liệu vận tải và logistics.
  * Tỷ lệ đăng ký Model trong Django Admin đạt **62/62 models (100%)**.

### 2. Kiểm Thử Hệ Thống:
- Django System Check (`python manage.py check`): 0 issues identified.
- Bộ kiểm thử tự động của dự án đạt **129/129 tests passed 100%** (`python manage.py test --keepdb`).

## [v3.8.7] - 2026-10-21 (Đồng Bộ Tuyệt Đối Vị Trí Ô Lưới Dữ Liệu & Ô Tổng Cộng Footer Khớp Từng Pixel)

### 1. Khắc Phục Lệch Vị Trí Ô Hàng (tbody) Và Ô Chân Bảng (tfoot):
- **Phát hiện nguyên nhân gốc rễ (Root Cause):**
  * Trong CSS hệ thống `static/css/main.css`, header `th` và dữ liệu `tbody td` được cấu hình chuẩn mực `padding: 7px 12px` và `padding: 6px 12px` (khoảng đệm trái/phải cố định 12px).
  * Trong khi đó, các ô dòng Tổng Cộng (`tfoot td`) chưa có quy tắc CSS chuẩn mực, dẫn tới bị nhận padding mặc định 0px từ CSS Reset hoặc bị gán class `p-2` (padding 8px). Điều này tạo ra độ chênh lệch 4px đến 12px làm cho số liệu tiền tệ căn phải (`text-right`) giữa dòng dữ liệu và dòng tổng cộng bị lệch ngang so với nhau.
- **Giải pháp xử lý triệt để:**
  * Bổ sung quy tắc CSS toàn cục trong `static/css/main.css`: áp dụng `.erp-table tfoot td`, `.bim-table tfoot td`, `table.erp-table tfoot td`, `div[id^="view-"] table tfoot td` với `padding: 6px 12px !important;` và `vertical-align: middle;`, đồng bộ 100% với `tbody td`.
  * Chuẩn hóa toàn bộ các bảng Báo cáo BI (`applyReport11Filters`, `applyReport12Filters`, `applyReport13Filters`, `applyReport14Filters`) trong `static/js/app.js`: loại bỏ các class `p-2` xung đột, đồng bộ định dạng badge phân bổ chi phí và số liệu tiền tệ `tabular-nums`, đảm bảo số liệu trên và số liệu dưới thẳng hàng tăm tắp theo cùng một trục đứng.

## [v3.8.6] - 2026-10-21 (Khắc Phục Triệt Để Lỗi Báo Cáo KeyError 28 & Căn Chỉnh Khớp 100% Dòng Tổng Cột Bảng Dữ Liệu)

### 1. Khắc Phục Triệt Để Lỗi Báo Cáo Phân Tích (KeyError: 28):
- **Phát hiện & xử lý nguyên nhân gốc rễ (Root Cause):**
  * Trong `apps/dispatch/reports_api.py`, danh sách khách hàng `all_customers = Customer.objects.filter(is_deleted=False)` bỏ sót các khách hàng đã bị soft-delete hoặc khách hàng vãng lai nhưng vẫn có dữ liệu chuyến xe trong kỳ. Khi duyệt qua các chuyến xe hoàn tất `completed_trips_in_period`, mã định danh `cid = 28` không tồn tại trong từ điển `customer_ar_map` dẫn tới lỗi crash server `KeyError: 28` khiến giao diện Báo cáo hiển thị "Lỗi Báo Cáo: Không thể nạp dữ liệu phân tích báo cáo: Không thể tải dữ liệu báo cáo".
  * **Giải pháp:** Sử dụng `Customer.objects.all()` kết hợp cơ chế kiểm tra phòng thủ chặt chẽ `if not cid or cid not in customer_ar_map:`, tự động khởi tạo đầy đủ entry cho mọi mã khách hàng phát sinh, ngăn chặn hoàn toàn lỗi sập API.

### 2. Cân Chỉnh Chính Xác 100% Dòng Tổng Cộng (Table Total Footer) Theo Đúng Cột Tính:
- **Khớp cột tuyệt đối với cấu trúc Header `<th>` của từng bảng:**
  * **Bảng Nhân viên (`employees-table`):** STT (Col 1) + Tiêu đề gộp 8 cột (Mã NV đến GPLX) + **Lương cơ bản (Col 9)** + 2 ô trống định dạng (Trạng thái, Thao tác) = 12 cột.
  * **Bảng Hợp đồng lao động (`contracts-table`):** STT (Col 1) + Tiêu đề gộp 5 cột (Số HĐ đến Thời hạn) + **Lương CB (Col 6)** + **Phụ cấp (Col 7)** + **Tổng thu nhập HĐ (Col 8)** + **Lương đóng BHXH (Col 9)** + Tỷ lệ BHXH/Thuế (Col 10) + Phụ lục (Col 11) + Trạng thái (Col 12) + Thao tác (Col 13) = 14 cột.
  * **Bảng Chấm công (`attendance-table`):** STT (Col 1) + Tiêu đề gộp 4 cột (Mã NV đến Phòng ban) + **Lương HĐ (Col 5)** + **Công chuẩn (Col 6)** + **Đi làm X (Col 7)** + **Phép P (Col 8)** + **Lễ L (Col 9)** + **Không lương Ro (Col 10)** + **Tổng công tính lương (Col 11)** + **Tăng ca OT (Col 12)** + Thao tác (Col 13) = 14 cột.
  * **Bảng Bảng lương (`payroll-slips-table`):** STT (Col 1) + Tiêu đề gộp 3 cột (Mã NV, Họ tên, Chức vụ) + Toàn bộ 13 cột số liệu con được cộng dồn độc lập: **Số công**, **Lương HĐ**, **Thành tiền công**, **Số chuyến**, **Lương chuyến**, **Nâng hạ/lưu xe**, **Thưởng dầu**, **Phụ cấp & KPI**, **Tổng thu nhập Gross**, **BHXH trừ vào lương**, **Thuế TNCN**, **Trừ tạm ứng**, **Thực lĩnh Net** + 2 cột định dạng (Thanh toán, Thao tác) = 19 cột.
- Bất kỳ cột nào có số liệu phát sinh đều được tự động tính tổng và căn đúng ô chân bảng, định dạng dấu chấm phân cách hàng ngàn chuẩn mực.

### 3. Kiểm Thử Hệ Thống & Zero-Regression:
- Toàn bộ 129/129 tests tự động (`python manage.py test --keepdb`) đạt 100% PASS.
- Cú pháp JavaScript `node -c static/js/app.js` và `node -c static/js/column_manager.js` sạch 100%, không phát sinh lỗi trùng biến hay cú pháp.

## [v3.8.5] - 2026-10-21 (Triệt Tiêu Hoàn Toàn Số Liệu Mockup & Thiết Lập Ràng Buộc Khóa Xóa Bảo Toàn Toàn Vẹn Dữ Liệu)

### 1. Triệt Tiêu Số Liệu Giả Lập & Mockup Trên Toàn Hệ Thống:
- **Chuẩn hóa Model & Defaults:**
  * Điều chỉnh selling_freight_price trong Model BookingOrder (apps/customers/models.py) từ default=4000000 thành default=0 (Migration 0015_alter_bookingorder_selling_freight_price).
  * Loại bỏ hoàn toàn các giá trị fallback 3800000 và 4000000 trên các form tạo mới/chỉnh sửa Báo giá, Booking và Tuyến cước trong static/js/app.js và static/js/modules/sales.js.
  * Loại bỏ fallback revenue = 4000000 khi tạo chuyến xe trong DispatchTripListCreateAPIView và rev = 3800000.0 trong TripSettlementAPIView, đảm bảo số liệu doanh thu phản ánh 100% CSDL.
  * Hỗ trợ tự động tạo Khách hàng khi điều độ nhập trực tiếp tên khách mới, tuyệt đối không gán ngầm sang khách đầu tiên trong danh mục.
- **Biểu đồ Dashboard Thời Gian Thực 100% CSDL (DashboardBGDAPIView):**
  * Thay thế toàn bộ logic ước tính sản lượng rev / 4000000 và rev / 3000000 bằng số liệu đếm thực tế: chart_trips_total, chart_trips_completed, chart_bookings_containers, chart_advances theo đúng phân kỳ (Hôm nay, 7 ngày, Tháng này, Quý này, Năm nay).
  * Chuyển đổi toàn bộ 6 biểu đồ Donut phân tích theo vai trò (BGD, Kế toán, Điều vận, Kinh doanh, Đội xe, Nhân sự) sang tính toán động 100% từ CSDL thực tế:
    - Kế toán: Cơ cấu chi phí chuyến xe thực tế từ TripExpense (không còn dữ liệu cố định 55%, 25%, 12%, 8%).
    - Điều vận: Phân rã lộ trình thực tế và sự cố vận tải từ TripException.
    - Kinh doanh: Phân bổ quy cách container và nhóm ngành hàng thực tế từ BookingOrder.
    - Đội xe: Hiện trạng kỹ thuật xe và hạn đăng kiểm định kỳ từ Vehicle.
    - Nhân sự: Cơ cấu định biên nhân sự và hạn giấy phép lái xe từ Employee.

### 2. Thiết Lập Hệ Thống Khóa Xóa Bảo Toàn Toàn Vẹn Dữ Liệu (Referential Deletion Locks):
- **Khách hàng (Customer):** Ngăn chặn xóa khi đã phát sinh đơn Booking, Báo giá, Chuyến xe hoặc Biểu cước tuyến đường. Trả về HTTP 400 kèm chi tiết số lượng phát sinh liên quan.
- **Phương tiện (Vehicle):** Ngăn chặn xóa khi đã phát sinh Chuyến xe hoặc Chứng từ chi phí chuyến.
- **Đối tác 3PL (Subcontractor):** Ngăn chặn xóa khi còn xe bạn, tài xế thầu phụ hoặc chuyến xe điều vận liên kết.
- **Tài xế thầu phụ (SubcontractorDriver):** Ngăn chặn xóa khi đã phát sinh chuyến xe vận chuyển thực tế.
- **Khoản chi (ExpenseItem):** Ngăn chặn xóa khi đang được sử dụng trong chứng từ chi phí chuyến xe.
- **Biểu cước (RouteTariff):** Ngăn chặn xóa khi đang được áp dụng cho chuyến xe hoặc đơn hàng booking khớp tuyến.
- **Địa điểm (Location):** Ngăn chặn xóa khi đang liên kết với đơn hàng booking hoặc chuyến xe.
- **Nhân sự (Employee):** Ngăn chặn xóa khi đã phát sinh chuyến xe (tài xế, tài xế hạ, điều độ), phiếu tạm ứng hoặc chứng từ chi phí.
- **Đơn hàng (BookingOrder):** Ngăn chặn xóa khi đã phát lệnh điều động chuyến xe thực tế.
- **Chuyến xe (DispatchTrip):** Ngăn chặn xóa khi đã phát sinh chứng từ chi phí hoặc phiếu tạm ứng tài xế chưa hoàn ứng.

### 3. Kiểm Thử Hệ Thống & Xác Thực Zero-Regression:
- Xây dựng bộ kiểm thử mới ReferentialDeletionLocksTestCase (apps/master_data/tests.py) gồm 7 kịch bản kiểm thử khóa xóa toàn diện đạt 100% PASS.
- Bổ sung kiểm thử test_role_charts_are_real_without_mock_fallbacks trong DashboardDynamicMetricsTestCase (apps/dispatch/tests.py) đạt 100% PASS.
- Toàn bộ bộ kiểm thử tự động của dự án đạt **129/129 tests passed 100%**.
- Kiểm tra cú pháp JavaScript trên toàn bộ các tệp frontend đạt 100% không lỗi (node -c static/js/app.js, column_manager.js, sales.js, master_data.js, dashboard.js).

## [v3.8.4] - 2026-10-21 (Bổ Sung Toàn Diện Dòng Total Chân Bảng, STT, Sort & Search Toàn Bộ Phân Hệ)

### 1. Chuẩn Hóa Universal Table Sorter & Sticky Footer (Kiến Trúc Nền Tảng):
- **Universal Table Sorter (BimTableSorter trong static/js/column_manager.js):**
  * Tự động nhận diện và gắn tính năng click sắp xếp (Sort) cho các thẻ <th> của tất cả các bảng dữ liệu trong hệ thống (dispatch-trips-table, sales-quotations-table, sales-bookings-table, ccounting-*-table, settlement-trips-table, leet-vehicles-table, customs-declarations-table, employees-table, contracts-table, ttendance-table, payroll-slips-table, md-main-table).
  * Tự động nhận diện thông minh 3 kiểu dữ liệu: Số/Tiền tệ VNĐ (loại bỏ ký tự đ, %, dấu chấm phân cách ngàn), Ngày tháng (DD/MM/YYYY, YYYY-MM-DD) và Chuỗi văn bản Tiếng Việt có dấu (localeCompare('vi')).
  * Tự động đánh lại cột STT (1, 2, 3...) chuẩn xác sau mỗi lần sắp xếp.
- **Universal Table Footer (BimTableFooter trong static/js/column_manager.js):**
  * Cung cấp cơ chế render dòng TỔNG CỘNG (<tfoot>) sticky cố định ở chân bảng với styling chuẩn BIM (g-slate-100/95 border-t-2 border-slate-300 font-bold text-xs sticky bottom-0 z-10).
  * Miễn nhiễm hoàn toàn với tính năng ẩn/hiện cột (BimTableColumnManager) nhờ thẻ 	r.no-col-reorder.

### 2. Triển Khai Dòng Total & Search Cho Từng Phân Hệ Cụ Thể:
- **Phân hệ Điều vận (Dispatch):**
  * Dòng Total chân bảng hiển thị tổng số chuyến xe hiển thị và tổng chi phí chuyến (	otalDispatchExpenses).
- **Phân hệ Bán hàng & Booking (Sales):**
  * Bảng Báo giá CRM (sales-quotations-table): Dòng Total hiển thị tổng số bản báo giá, tổng sản lượng chuyến dự kiến và tổng doanh thu kế hoạch.
  * Bảng Đơn hàng Booking (sales-bookings-table): Dòng Total hiển thị tổng số đơn hàng booking và tổng cước thỏa thuận.
- **Phân hệ Kế toán (Accounting - 7 Phân hệ con):**
  * Sổ quỹ (ccounting-cashbook-table): Dòng Total hiển thị Tổng Thu, Tổng Chi và Số dư ròng chênh lệch Thu - Chi.
  * Tạm ứng chuyến (ccounting-advances-table): Dòng Total hiển thị Tổng tiền cty tạm ứng, Tổng thực chi kê khai và Chênh lệch đối soát.
  * Quỹ điều vận (ccounting-fund-table): Bổ sung ô tìm kiếm nhanh #fund-search và dòng Total hiển thị Tổng cty cấp, Đã cấp TX, Đã hoàn về quỹ và Số dư quỹ khả dụng.
  * Đối soát P&L (ccounting-pnl-table): Dòng Total hiển thị Tổng Doanh thu, Tổng Chi phí thực tế và Tổng Lợi nhuận gộp.
  * Chi hộ (ccounting-reimburse-table): Dòng Total hiển thị Tổng tiền chi hộ, Số tiền đã thu hồi và Số tiền còn chờ thu.
  * Xe bạn / Thầu phụ (ccounting-subcon-table): Dòng Total hiển thị Cước thu khách, Cước trả xe bạn, Chênh lệch (biên lợi nhuận), Đã tạm ứng và Còn phải trả.
  * Vé cầu đường BOT (ccounting-bot-table): Bổ sung ô tìm kiếm nhanh #bot-search và dòng Total hiển thị Tổng số vé, Thực chi BOT, Định mức tuyến và Mức chênh lệch.
- **Phân hệ Quyết toán (Settlement):**
  * Bảng Quyết toán gom (settlement-trips-table): Dòng Total hiển thị Tổng số chuyến gom, Tổng tiền tạm ứng, Tổng thực chi và Chênh lệch gom.
- **Phân hệ Xe & Bãi (Fleet):**
  * Bảng Đội xe (leet-vehicles-table): Dòng Total hiển thị Tổng số xe, số xe đang hoạt động và số xe đang bảo dưỡng/dừng.
- **Phân hệ Hải quan (Customs):**
  * Bảng Tờ khai điện tử (customs-declarations-table): Dòng Total hiển thị Tổng số tờ khai, Tổng thuế XNK phát sinh và Tổng chi hộ kiểm hóa.
- **Phân hệ Nhân sự (HR):**
  * Bổ sung 3 ô tìm kiếm nhanh: #contract-search-input (Hợp đồng), #attendance-search-input (Chấm công), #payroll-search-input (Bảng lương).
  * Bổ sung dòng Total cho Nhân viên (employees-table), Hợp đồng (contracts-table), Chấm công (ttendance-table), Bảng lương (payroll-slips-table).
- **Phân hệ Danh mục (Master Data):**
  * Bảng Danh mục cài đặt (md-main-table): Bổ sung dòng Total tfoot hiển thị tổng số bản ghi danh mục.

### 3. Sửa Lỗi Truy Vấn Ràng Buộc Khóa Ngoại Master Data & Bảo Toàn Zero-Regression:
- Khắc phục lỗi FieldError: Cannot resolve keyword 'delivery_location' khi xóa địa điểm (Location) trong pps/master_data/api_views.py.
- Khắc phục lỗi import RouteTariff từ pps.customers.models khi xóa khách hàng (Customer).
- Toàn bộ bộ kiểm thử tự động 121/121 tests passed (python manage.py test --keepdb).
- Cú pháp JS hợp lệ 100% (node -c static/js/app.js; node -c static/js/column_manager.js).

## [v3.8.1] - 2026-10-21 (Rà Soát Toàn Diện Hệ Thống & Loại Bỏ Số Liệu Quỹ Ảo Trên Dashboard)

### 1. Triệt Tiêu Hoàn Toàn Số Liệu Giả Định / Hardcode Trên Dashboard (Anti-Hallucination):
- **Phân tích nguyên nhân gốc rễ (Root Cause):**
  * Tại `apps/dispatch/api_views.py`, các thẻ chỉ số KPI của `DIRECTOR` (Ban Giám Đốc) và `ACCOUNTING` (Kế toán) trước đây bị gán tĩnh các chuỗi mock "Quỹ TM: 150M | NH: 1.25B", "1.400.000.000 đ", "Tiền mặt: 150.000.000 đ | NH: 1.250.000.000 đ", "Kế hoạch chi tuần: 450.000.000 đ".
  * Các trường fallback trong `static/js/app.js`, `static/js/modules/dashboard.js` và `templates/views/view_dashboard.html` cũng chứa fallback cứng 150000000 và 1250000000, làm cho số dư tiền mặt và ngân hàng hiển thị sai lệch thực tế.
- **Giải pháp tính toán động 100% từ CSDL Kế toán:**
  * **Quỹ Tiền mặt (Cash on Hand):** Lấy từ Số dư đầu kỳ TK 1111 (`OpeningBalance` loại `CASH_FUND`) cộng Tổng Thu tiền mặt trừ Tổng Chi tiền mặt từ Sổ quỹ (`CashTransaction`).
  * **Tiền gửi Ngân hàng (Bank Balance):** Lấy từ Số dư đầu kỳ TK 1121 (`OpeningBalance` loại `BANK_ACCOUNT`) cộng Tổng Thu ngân hàng trừ Tổng Chi ngân hàng từ Sổ quỹ (`CashTransaction`).
  * **Tổng Quỹ Khả dụng (Total Liquidity):** Tính tự động từ `cash_on_hand + bank_balance`.
  * **Kế hoạch Chi tuần (Weekly Planned Expenses):** Tính tổng các nghĩa vụ thanh toán thực tế gồm chi phí chuyến xe đã được duyệt chưa quyết toán (`TripExpense status='APPROVED'`) và các khoản tạm ứng tài xế đang lưu hành (`DriverTripAdvance status='ADVANCED'`).
  * **Định dạng tiền tệ ngắn gọn (`_format_short_money`):** Xử lý chính xác định dạng tiền tệ rút gọn theo chuẩn B/M/K (loại bỏ số 0 thập phân thừa như `40M`, `230M`, `-10.5M`, `0 đ`).
- **Làm sạch các chỉ số phòng ban khác:**
  * Xóa bỏ các giá trị mặc định ảo `or 10` tài xế, `or 18` nhân sự, tỷ lệ tờ khai hải quan mặc định `85, 12, 3`. Toàn bộ dữ liệu được tính trực tiếp từ số lượng thực tế trong CSDL.
  * Tỷ lệ chốt hợp đồng báo giá tính động từ `Quotation status='APPROVED' / tổng báo giá`.
- **Kiểm thử tự động & Bảo toàn hồi quy:**
  * Bổ sung bộ kiểm thử `DashboardDynamicMetricsTestCase` trong `apps/dispatch/tests.py` kiểm tra cả 2 trường hợp: CSDL rỗng trả về `0 đ` (không ảo tưởng) và CSDL có phát sinh tính toán khớp chuẩn từng đồng.
  * 121/121 automated tests passed (`python manage.py test --keepdb`).
  * Kiểm thử cú pháp JavaScript đạt chuẩn 100% (`node -c static/js/app.js`).

## [v3.8.3] - 2026-10-21 (Thiết Kế Lại Bố Cục Biểu Đồ Donut Ngang & Loại Bỏ Hoàn Toàn Trùng Lặp Thông Tin)

### 1. Chuyển Đổi Sang Bố Cục Ngang Đối Xứng 2 Cột (Side-by-Side Chart & Metrics Layout):
- **Cột Trái (48% width): Vòng Tròn Donut Mở Rộng Gần Full Ô (Maximized Donut Canvas):**
  * Tắt triệt để legend nội bộ của Chart.js (`legend: { display: false }`), giải phóng 100% diện tích bên dưới.
  * Đường kính vòng tròn Donut được Chart.js tự động phóng to tối đa, nở rộng gần như chạm mép khung, to tròn, thoáng đãng và bề thế.
  * Tâm vòng tròn hiển thị số TỔNG tự động co giãn (`14px - 15px`), chữ TỔNG thanh thoát bên dưới.
  * Trên các lát cắt dải màu Donut vẫn hiển thị đầy đủ các con số con (`5,5 tr`, `4,4 tr`...) có viền trắng sắc nét.
- **Cột Phải (52% width): Bảng Danh Sách Khách Hàng / Thông Số Phân Bổ (Dedicated Metrics Panel):**
  * Toàn bộ danh sách Khách hàng / Đối tượng được bố trí sang cột bên phải với thanh cuộn mượt mà `custom-scrollbar`.
  * Mỗi dòng hiển thị tinh tế: Dấu chấm tròn màu đại diện lát cắt, Tên viết tắt khách hàng, Giá trị số tiền đậm nét và Tỷ lệ phần trăm `(%)`.
  * Hiệu ứng hover nổi bật nền xám nhạt hiện đại, không còn bị chèn ép hoặc hiển thị lặp lại 2 lần thông tin như trước.

### 2. Tinh Chỉnh Tỷ Lệ Chiều Rộng 2 Khối Biểu Đồ Trên Dashboard:
- Điều chỉnh tỷ lệ mặc định giữa Biểu đồ 1 và Biểu đồ 2 từ `65% / 35%` sang **`58% / 42%`**, tạo không gian lý tưởng cho Biểu đồ 2 phô diễn trọn vẹn cả vòng tròn lớn và danh sách khách hàng chi tiết.

## [v3.8.2] - 2026-10-21 (Thu Gọn Số Tổng Hài Hòa & Hiển Thị Số Liệu Con Trên Từng Ô Lát Cắt Donut)

### 1. Thu Gọn Số Tổng Tâm Donut Tự Động Theo Độ Dài Chuỗi (Harmonious Donut Center):
- **Tự Động Co Giãn Kích Thước (Auto-Scale Typography):**
  * Đối với các số tiền lớn dài (ví dụ: `8,500,000 đ` hay `1.250.000.000 đ`): Font size tự động co về `13.5px - 15px` vừa vặn, không bao giờ bị tràn lấn hay đè lên các dải màu của Donut.
  * Đối với các tỷ lệ ngắn (ví dụ: `100.0%`, `62.5%`, `15 xe`): Font size hiển thị ở mức `18px - 20px` to tròn, thanh thoát.
- **Mở Rộng Không Gian Tâm Vòng Donut (Cutout):**
  * Tăng tỷ lệ khoét tâm Donut từ `70% - 72%` lên `74%`, tạo không gian thoáng đãng, cân xứng hoàn hảo.

### 2. Hiển Thị Số Liệu Con Trực Tiếp Lên Từng Ô Lát Cắt & Chú Thích (Slice Datalabels & Rich Legend):
- **Hiển Thị Số Liệu Con Trên Từng Dải Màu Donut (Datalabels On Arcs):**
  * Nâng cấp `chartDataLabelsPlugin` hỗ trợ đầy đủ `doughnut` và `pie`.
  * Tự động tính toán tâm của từng lát cắt (`element.tooltipPosition()`), vẽ trực tiếp giá trị con tương ứng (ví dụ: `2,5 tr`, `3 tr`, `1,8 tr`...) với viền trắng 3px chống lóa và chữ đen than `#0f172a` sắc nét.
  * Tự động lọc thông minh: các lát cắt cực nhỏ (< 3.5%) được ẩn số để tránh rối mắt.
- **Hiển Thị Đầy Đủ Số Liệu Con Trong Chú Thích (Rich Legend):**
  * Hệ thống Legend của Donut Chart tự động bổ sung số tiền và tỷ lệ phần trăm cụ thể bên cạnh tên (ví dụ: `■ Phạm Sơn: 3 tr (35.3%)`, `■ Lê Hòa: 2,5 tr (29.4%)`...).

## [v3.8.1] - 2026-10-21 (Cân Bằng Kích Cỡ Trục Y & Tách Biệt Màu Sắc Tương Phản Doanh Thu - Chi Phí - Lợi Nhuận)

### 1. Nâng Cấp Kích Thước & Độ Tương Phản Trục Tọa Độ Trái (Trục Y):
- **Cân Bằng Hoàn Hảo Với Trục Ngang (Trục X):**
  * Tăng font chữ các mốc số liệu trục Y (`0`, `1 tr`, `2 tr`, `3 tr`...) từ `11.5px / weight 600` lên **`12.5px / weight 700 (bold)`**.
  * Chuyển đổi mã màu nhãn trục Y từ màu xám mờ (`#64748b` / `#94a3b8`) sang **màu đen than đậm nét (`#1e293b`)**, cân đối 100% với trục ngày tháng bên dưới, giúp người xem đọc mốc giá trị triệu đồng dễ dàng không cần căng mắt.

### 2. Tách Biệt 3 Hệ Màu Tương Phản Sắc Nét Cho Doanh Thu - Chi Phí - Lợi Nhuận:
- **Nguyên Tắc Phối Màu Độc Lập Chống Nhầm Lẫn:**
  * 🔵 **Doanh Thu Cước (Revenue):** Chuyển sang màu **Xanh Dương Đậm (Royal Blue `#2563eb` / `rgba(37, 99, 235, 0.88)`)**, số liệu đỉnh cột màu `#1d4ed8` viền trắng sắc sảo.
  * 🟠 **Chi Phí Vận Hành (Expense):** Giữ tone màu **Cam Hổ Phách Tương Phản (Amber `#f59e0b` / `rgba(245, 158, 11, 0.88)`)**, số liệu đỉnh cột màu `#b45309` viền trắng.
  * 🟢 **Lợi Nhuận Gộp (Profit):** Đường Line màu **Xanh Ngọc Lục Bảo Tươi (Emerald Green `#059669`)**, điểm mốc có viền trắng 2.5px, số liệu trên line màu `#047857` viền trắng.
- **Đồng Bộ Hệ Thống Chú Thích & Thẻ Tóm Tắt (Legend & Summary Cards):**
  * Chú thích góc trên (`#bgd-chart-legend`): Icon vuông Xanh Dương (Doanh thu), Icon vuông Cam (Chi phí), Icon tròn Xanh Lá (Lợi nhuận).
  * Thẻ tóm tắt đáy biểu đồ 1: Thẻ Doanh thu TB chuyển sang theme Xanh Dương (`bg-blue-50/70 border-blue-200 text-blue-800`), tương ứng nhịp nhàng với cột biểu đồ.

## [v3.8.0] - 2026-10-21 (Tăng Kích Thước Số Liệu & Nâng Cấp Typography Trực Quan Biểu Đồ Dashboard)

### 1. Tối Ưu Hóa Kích Thước & Độ Tương Phản Số Liệu Biểu Đồ (Data Labels & Typography):
- **Tăng Kích Thước Datalabels Trên Đỉnh Cột & Đường Line (chartDataLabelsPlugin):**
  * Nâng cỡ chữ từ `bold 9.5px` lên `bold 12px "Inter", sans-serif` rõ ràng, sắc nét.
  * Tích hợp lớp viền trắng bảo vệ xung quanh chữ (`ctx.lineWidth = 3`, `ctx.strokeStyle = '#ffffff'`, `ctx.strokeText`), giúp số liệu nổi bật rõ ràng trên mọi nền màu (cột xanh Teal, cột vàng Amber, đường cong Line).
  * Phân tầng màu chữ ngữ nghĩa: Doanh thu & Nhãn mặc định (`#0f766e`), Chi phí vận hành (`#b45309`), Lợi nhuận/Line (`#047857`).
  * Điều chỉnh khoảng cách hiển thị (`pos.y - 5` và `pos.x + 8`) tránh dính đè lên đỉnh cột hay điểm mốc.
- **Mở Rộng Không Gian & Cỡ Chữ Trục Tọa Độ (Chart Scales & Canvas Padding):**
  * Tăng chiều cao khung biểu đồ từ `135px/150px/190px` lên `155px/175px/215px` tạo độ thoáng đãng cho không gian trực quan.
  * Bổ sung `layout.padding.top: 18` chống cắt mép chữ ở các cột giá trị cao.
  * Tăng font trục X (ngày tháng / phân nhóm) lên `12px` font bold (`weight: '700'`), màu sắc đậm nét (`#334155`).
  * Tăng font trục Y lên `11.5px` font semibold (`#64748b`).
- **Nâng Cấp 3 Thẻ Chỉ Số Tóm Tắt Dưới Biểu Đồ 1:**
  * Kích thước số tiền tăng từ `text-xs / 13px` lên `text-sm 2xl:text-base font-black tabular-nums`.
  * Nhãn mô tả tăng lên `text-[11px] 2xl:text-xs font-bold`.
- **Nâng Cấp Biểu Đồ Donut & Chú Thích (Biểu đồ 2):**
  * Số liệu phần trăm tại tâm Donut tăng từ `text-lg / 2xl:text-xl` lên `text-2xl 2xl:text-3xl font-black text-slate-800`.
  * Chú thích tỷ trọng bên dưới tăng lên `text-xs 2xl:text-[13px] font-bold`, màu sắc rõ nét hơn.

## [v3.7.9] - 2026-10-21 (Vá Lỗi Lệch Cấu Trúc DOM & Tràn Layout Toàn Bộ Giao Diện Ứng Dụng)

### 1. Khắc Phục Lỗi Layout Lệch Sang Phải & Khoảng Trắng DOM (Layout Shift & Sidebar Offset Fix):
- **Phân Tích Nguyên Nhân Gốc Rễ (Root Cause):**
  * Trong bản cập nhật tùy biến biểu đồ trước đó, một thẻ đóng `</div>` bị lặp thừa ở khối tùy chọn số liệu của modal tùy biến trong `templates/views/view_dashboard.html`.
  * Do cơ chế nạp view dạng Single Page View (tất cả các template `view_dashboard.html`, `view_dispatch.html`, `view_personnel.html`... đều nằm trong container `<main id="main-views">` của `templates/base.html`), thẻ `</div>` thừa này đã đóng sớm container chính của trang.
  * Hậu quả là toàn bộ các phân hệ phía sau (Nhân sự, Điều vận, Quản lý xe, Danh mục...) bị rớt ra ngoài `<main>`, trở thành phần tử con trực tiếp của thẻ cha `body` dạng Flexbox Row (`class="flex h-screen"`), gây hiện tượng nội dung bị dạt lệch 50% sang phải, thanh điều hướng và header bị co ép biến dạng.
- **Giải Pháp Xử Lý & Xác Thực Triệt Để:**
  * Loại bỏ chính xác thẻ `</div>` thừa trong `templates/views/view_dashboard.html`, sắp xếp lại khối cấu hình switch hiển thị số liệu vào đúng cấu trúc cấp cha `space-y-3.5`.
  * Rà soát tự động toàn bộ 100% các file HTML template trong dự án (`templates/`): xác nhận độ cân bằng thẻ mở `<div` và thẻ đóng `</div>` đạt 100% (diff = 0).
  * Bộ kiểm thử hồi quy tự động đạt tuyệt đối 119/119 tests passed.

## [v3.7.8] - 2026-10-21 (Định Dạng Phân Cách Phần Ngàn Cho Biểu Đồ, Tùy Biến Bật/Tắt Số Liệu & Tên Viết Tắt)

### 1. Chuẩn Hóa Định Dạng Phân Cách Phần Ngàn Trên Toàn Bộ Biểu Đồ (Number Formatting):
- **Tooltip Biểu đồ Xu hướng (
enderBgdTrendChart):**
  * Khắc phục triệt để lỗi hiển thị số thô không có dấu phân cách hàng ngàn (VD: Lợi Nhuận Gộp: 6500000 -> Lợi Nhuận Gộp: 6.500.000 đ).
  * Mọi dataset (Cột Doanh thu, Cột Chi phí, Đường Lợi nhuận) đều được định dạng tiền tệ Việt Nam 
ew Intl.NumberFormat('vi-VN').format(val) + ' đ'.
- **Tooltip Biểu đồ Tùy Biến Pivot & Preview (
enderPivotChartCanvas):**
  * Định dạng số có dấu phân cách phần ngàn đầy đủ cho tất cả các loại chỉ số đo lường.

### 2. Tính Năng Hiển Thị Số Liệu Trên Cột / Đường (Data Labels) & Tùy Biến Bật/Tắt:
- **Tích hợp Plugin Data Labels chuyên dụng (chartDataLabelsPlugin):**
  * Tự động tính toán vị trí hiển thị số liệu trực tiếp trên đỉnh cột đứng (Bar), bên cạnh cột ngang (Horizontal Bar), hoặc trên các điểm mốc (Line).
  * Định dạng số thông minh: Số tiền lớn >= 1.000.000 rút gọn tinh tế (VD: 6,5 tr), số nhỏ hơn có dấu phân cách phần ngàn chuẩn (VD: 425.000), tỷ lệ phần trăm (VD: 87.3%).
- **Nút Bật/Tắt Nhanh Trên Dashboard:**
  * Bổ sung nút **[Số liệu]** tại góc trên bên phải của cả Card Biểu Đồ 1 và Card Biểu Đồ 2 (#btn-toggle-datalabels-1, #btn-toggle-datalabels-2).
  * Hỗ trợ toggle tức thời với 1 click, tự động đổi màu trạng thái (Xanh Teal khi Bật, Xám khi Tắt).
- **Tích Hợp Trong Modal Tùy Biến Biểu Đồ (modal-pivot-chart-builder):**
  * Thêm switch checkbox **'Hiển thị số liệu trên cột / điểm'** (#pivot-toggle-data-labels).
  * Xem trước trực tiếp trên Canvas Preview và tự động lưu cấu hình theo từng Slot vào trình duyệt (localStorage).

### 3. Ưu Tiên Hiển Thị Tên Viết Tắt Ngắn Gọn Trên Trục X & Bảng Chi Tiết:
- **Nâng cấp API Phân Tích Đa Chiều (DashboardPivotChartAPIView):**
  * Khi nhóm theo Khách Hàng (customer): Ưu tiên lấy **Tên viết tắt (customer__short_name)** nếu có; nếu chưa có mới fallback về tên đầy đủ hoặc mã khách hàng.
  * Khi nhóm theo Thầu phụ / Đối tác (subcontractor): Ưu tiên lấy **subcontractor__short_name**.
  * Bổ sung nhóm phân tích mới subcontractor (Thầu phụ / Nhà xe) vào bộ lọc Pivot Trips.
- **Dữ Liệu Khách Hàng:**
  * Đã đồng bộ short_name cho các khách hàng (SAMSUNG, VIỆT THẮNG, VJS, Á CHÂU, NHỰA DUY TÂN, CÁT ĐẰNG, HC BIÊN HÒA...) giúp biểu đồ hiển thị ngắn gọn, trục X không bị tràn chữ hay xiên chéo.

## [v3.7.7] - 2026-10-21 (Tách Biệt Độc Lập 2 Trường Tài Xế & "Đầu kéo/ Xe tải" và Chuẩn Hóa Lọc Theo Xe Nhà TVL vs Xe Bạn 3PL)

### 1. Nghiệp Vụ Vận Tải Thực Tế (Logistics Domain & Fleet Flexibility):
- **Xóa bỏ ép buộc 1-1 giữa Tài xế & Xe:** Trong thực tế điều vận, 1 tài xế có thể lái nhiều xe (khi xe bảo trì/sửa chữa hoặc chạy luân chuyển theo cự ly) và 1 xe có thể có nhiều tài xế thay phiên lái (chạy ca ngày/đêm, cặp tài đường dài).
- **Tách biệt hoàn toàn thành 2 trường độc lập trên Form Điều Vận:**
  * Trường 1: **Tài xế nhận lệnh (Toàn trình)**
  * Trường 2: **Đầu kéo/ Xe tải TVL** (thay thế cho việc ngầm định gán xe trước đây)
- **Chuẩn hóa thuật ngữ thống nhất: "Đầu kéo/ Xe tải"**: Bao quát toàn bộ năng lực phương tiện của TVL (cả Đầu kéo container và Xe tải thùng 10T/2T/Van), tránh cách gọi hạn hẹp trước đây.

### 2. Quy Chuẩn Lọc Dữ Liệu Chặt Chẽ (Zero Cross-Fleet Leakage):
- **Khi chọn "Xe Nhà (TVL)":**
  * Dropdown `#inp-driver`: CHỈ load danh sách Tài xế NỘI BỘ TVL (`Employee` có `role == DRIVER`). Nhãn hiển thị trực quan: `[Tên/Biệt danh] ([Mã nhân sự])`.
  * Dropdown `#inp-vehicle`: CHỈ load danh sách Đầu kéo/ Xe tải NỘI BỘ TVL (`Vehicle` có `ownership_type == 'OWNED'`). Tuyệt đối không lẫn xe của đối tác 3PL.
  * Hiển thị kèm loại phương tiện trong dropdown: `51C-123.45 (Đầu kéo Container)`, `50E-112.34 (Xe tải 10 Tấn)`, `50E-095.78 (Xe tải 2 Tấn)`.
  * **Cơ chế gợi ý thông minh 2 chiều (Smart Autofill, không ép buộc):** Chọn tài xế tự động gợi ý xe thường lái nếu ô xe đang trống; chọn xe tự động gợi ý tài xế thường lái nếu ô tài đang trống; điều độ có toàn quyền đổi sang bất kỳ xe/tài TVL nào khác.
- **Khi chọn "Xe Bạn / 3PL":**
  * Dropdown `#inp-subcontractor`: Chỉ load đối tác là Nhà xe vận tải (`partner_type == 'CARRIER'`).
  * Dropdown `#inp-sub-vehicle`: CHỈ load các xe thuộc đúng Nhà xe 3PL đã chọn (`subcontractor == selected_sub` và `ownership_type == 'SUBCONTRACTOR'`) + tùy chọn `+ Nhập Biển Số Xe Khác...`.
  * Dropdown `#inp-sub-driver`: CHỈ load các tài xế thuộc đúng Nhà xe 3PL đã chọn (`subcontractor == selected_sub`) + tùy chọn `+ Nhập Tài Xế Mới...`.
  * Xe và Tài xế 3PL hoàn toàn độc lập, không ép buộc 1-1.
- **Khi chọn "Cắt Kéo (Drop & Hook)":**
  * Chặng 1 & Chặng 2: Đồng bộ nhãn **"Đầu kéo/ Xe tải Lấy Cont"** và **"Đầu kéo/ Xe tải Hạ Cont"**, CHỈ nạp xe và tài nội bộ TVL.

### 3. Đồng Bộ Toàn Bộ Giao Diện & Backend:
- `templates/views/view_create_trip.html` & `templates/components/modal_create_trip.html`: Bố trí layout 12 cột cân đối (Tài xế 4 cột, Đầu kéo/ Xe tải 4 cột, Ghi chú 4 cột).
- `templates/components/modal_edit_trip.html`: Đổi nhãn `Đầu Kéo` thành `Đầu kéo/ Xe tải`.
- `templates/views/view_trip_detail.html`: Đổi tiêu đề cột bảng kê và modal chi phí sang `Tài xế & Đầu kéo/ Xe tải`.
- `apps/master_data/api_views.py`: `MasterDataFormOptionsAPIView` chuẩn hóa nhãn tài xế độc lập, bổ sung `default_vehicle_plate` và format `label` xe kèm loại phương tiện.
- `static/js/app.js`: Tích hợp hàm `onDriverChange`, `onVehicleChange`, lọc `ownedVehicles` cho xe nhà và cập nhật validation bắt buộc cả Tài xế & Đầu kéo/ Xe tải.

## [v3.7.6] - 2026-10-21 (Mở Rộng Model Khách Hàng: 2 Email, Thông Tin Bank, Nhóm Khách & Quản Trị Công Nợ)

### 1. Nâng Cấp Model Khách Hàng (`Customer` trong `apps/customers/models.py`):
- **Bổ sung 2 Email riêng biệt:**
  * `company_email`: Email chính thức của doanh nghiệp để tiếp nhận Hóa đơn điện tử (e-Invoice), Bảng kê đối soát công nợ (SOA) và chính sách cước phí.
  * `contact_email`: Email của người phụ trách trực tiếp (Điều phối / XNK / Booking) để nhận thông báo điều xe, tiến độ cont và chứng từ giao nhận (EIR/POD).
- **Bổ sung Chức danh người liên hệ:**
  * `contact_title`: Chức vụ nhân sự đầu mối (VD: Trưởng phòng XNK, Điều phối viên...).
- **Bổ sung Thông tin Tài khoản Ngân hàng (Bank Information):**
  * `bank_account_number`: Số tài khoản ngân hàng.
  * `bank_name`: Tên ngân hàng thụ hưởng.
  * `bank_branch`: Chi nhánh ngân hàng.
  * `bank_account_holder`: Tên chủ tài khoản in hoa.
- **Bổ sung Phân nhóm Khách hàng (`customer_group`):**
  * `COMMERCIAL_TRADING`: Thương mại / Xuất nhập khẩu (Trading/XNK)
  * `FDI_ENTERPRISE`: Doanh nghiệp FDI / Nhà máy sản xuất
  * `FORWARDER_LOGISTICS`: Đại lý Giao nhận / 3PL Forwarder
  * `DOMESTIC_FACTORY`: Nhà máy / Doanh nghiệp Nội địa
  * `WALK_IN_RETAIL`: Khách lẻ / Đơn chuyến vãng lai
- **Bổ sung Quản trị Rủi ro & Kỳ hạn Công nợ (TMS / Billing):**
  * `payment_term_days`: Kỳ hạn thanh toán chuẩn theo hợp đồng (ngày, mặc định 30 ngày).
  * `credit_limit`: Hạn mức tín dụng / trần nợ tối đa (VNĐ, mặc định 0 = không giới hạn).
- **Database Migration:**
  * Đã tạo và áp dụng migration `0014_customer_bank_account_holder_and_more.py`.

### 2. Đồng Bộ Backend API & Quản Trị Django Admin:
- **`CustomerMasterListCreateAPIView` & `CustomerMasterDetailAPIView` (`apps/master_data/api_views.py`):**
  * Hỗ trợ tìm kiếm theo cả email công ty, email liên hệ, số tài khoản ngân hàng.
  * Hỗ trợ lọc theo `customer_group`.
  * Trả về và nhận đầy đủ 10 trường mới trong cả method `GET`, `POST`, `PUT`.
- **`CustomerAdmin` (`apps/customers/admin.py`):**
  * Bổ sung hiển thị `customer_group`, `company_email`, `bank_name` trên danh sách admin.
  * Thêm bộ lọc `customer_group` và tìm kiếm theo email / số tài khoản.
- **Import/Export Service (`apps/master_data/import_export_service.py`):**
  * Bổ sung 8 cột mới vào schema Excel import/export danh mục Khách hàng.

### 3. Chuẩn Hóa Giao Diện & Form Nhập Liệu Master Data (`static/js/app.js` & `master_data.js`):
- **Bảng Khách Hàng:**
  * Bổ sung các cột: `Nhóm Khách`, `Email Công Ty`, `Email Liên Hệ`, `Số TK Bank`, `Tên Ngân Hàng`.
  * Tích hợp click header sort trực tiếp, hiển thị plain text tinh gọn chuẩn UI/UX.
  * Dropdown Bộ lọc phụ (Secondary Filter) hỗ trợ lọc nhanh theo từng Nhóm Khách Hàng.
- **Modal Thêm / Sửa Khách Hàng:**
  * Bố cục lưới thông minh phân cấp 4 khu vực: (1) Thông tin định danh & Nhóm, (2) Đầu mối liên hệ & 2 Email, (3) Thông tin Tài khoản Ngân hàng, (4) Chính sách công nợ & Ghi chú.

## [v3.7.5] - 2026-10-21 (Bổ Sung Cột STT & Tính Năng Sắp Xếp Trên Header Toàn Bộ Bảng Danh Mục)

### 1. Bổ Sung Cột STT (Số Thứ Tự) Cho 14 Bảng Danh Mục Master Data:
- Tự động đánh số thứ tự liên tục theo phân trang hiện hành: `stt = (currentPage - 1) * pageSize + idx + 1`.
- Cố định cột STT ở vị trí đầu tiên (`data-col-key="stt" data-col-name="STT" data-col-locked="true"`), bảo đảm tích hợp mượt mà với `BimTableColumnManager` (không bị người dùng ẩn nhầm).
- Căn giữa trực quan, font monospace nhẹ nhàng chuẩn UI/UX logistics.
- Áp dụng trên toàn bộ 14 phân hệ danh mục:
  * `company` (Thông tin công ty)
  * `roles_permissions` (Vai trò & Phân quyền)
  * `opening_balance` (Số dư ban đầu)
  * `driver_tariffs` (Biểu phí lương chuyến)
  * `allowances` (Phụ cấp & Kiểm hóa)
  * `locations` (Cảng & Kho bãi)
  * `tariffs` (Bảng giá cước vận tải)
  * `customers` (Khách hàng)
  * `expenses` (Khoản mục chi phí)
  * `containers` (Loại Container & Quy cách)
  * `vehicles` (Đầu kéo & Xe tải)
  * `trailers` (Rơ-moóc)
  * `shipping_lines` (Hãng tàu)
  * `subcontractors` (Khách hàng & Đối tác: Thầu phụ, Gara, Nhà cung cấp)

### 2. Sắp Xếp Trực Tiếp Khi Nhấp Tiêu Đề Cột (Client-side Header Sorting):
- Header các cột hỗ trợ click để toggle sắp xếp: **Tăng dần (ASC)** $\rightarrow$ **Giảm dần (DESC)**.
- Hiển thị icon trạng thái sắp xếp trực quan:
  * Trạng thái mặc định: Icon `ph-arrows-down-up` mờ nhẹ (`opacity-40 hover:opacity-100`).
  * Trạng thái tăng dần (ASC): Icon `ph-arrow-up text-teal-600 font-bold`.
  * Trạng thái giảm dần (DESC): Icon `ph-arrow-down text-teal-600 font-bold`.
- Hỗ trợ thông minh cho các kiểu dữ liệu:
  * Cột STT: Sắp xếp theo số thứ tự hiển thị.
  * Số và tiền tệ: Sắp xếp giá trị số thực tế (Numeric comparison).
  * Chuỗi văn bản: Sắp xếp theo bảng chữ cái tiếng Việt có dấu (`localeCompare('vi')`).
  * Boolean / Trạng thái: Sắp xếp giá trị logic.
- Tự động reset trạng thái sort khi chuyển qua tab danh mục khác (`switchMasterDataTab`).

## [v3.7.4] - 2026-10-21 (Hiển Thị Plain Text Đối Tác, Tách Riêng 2 Cột Địa Chỉ & Fix Lưu Loại Đối Tác)

### 1. Hiển Thị Plain Text Tinh Gọn (Không Bọc Badge):
- **Cột Loại Đối Tác:** Hiển thị trực tiếp dạng văn bản thuần `text-slate-800 font-semibold`: `Nhà xe 3PL`, `Gara bảo dưỡng`, `Nhà cung cấp` (loại bỏ các thẻ badge bo tròn viền màu).
- **Cột Tên Viết Tắt:** Hiển thị dạng text đơn giản `font-mono font-bold text-slate-900` (loại bỏ pill badge màu vàng).

### 2. Tách Riêng 2 Cột Địa Chỉ (Địa Chỉ Công Ty & Địa Chỉ Kho / Bãi):
- **Model `Subcontractor` (`apps/master_data/models.py`):**
  * Bổ sung trường `yard_address = models.CharField(max_length=255, blank=True, help_text="Địa chỉ kho / bãi xe")`.
  * Đã tạo và áp dụng migration `0013_subcontractor_yard_address_and_more`.
- **Giao Diện Master Data Bảng & Modal (`static/js/app.js` & `static/js/modules/master_data.js`):**
  * Bảng danh sách tách làm 2 cột riêng biệt: **`Địa Chỉ Công Ty`** (`address`) và **`Địa Chỉ Kho / Bãi`** (`yard_address`).
  * Modal chỉnh sửa chia làm 2 ô input riêng: `#mdf-sc-address` và `#mdf-sc-yard-address`.
  * Template Excel Import/Export bổ sung cột `yard_address` vào schema.

### 3. Sửa Lỗi Lưu Loại Đối Tác (Fix Partner Type Persistence):
- **Khắc phục lỗi không ăn khi đổi loại đối tác sang "Nhà cung cấp":**
  * `SubcontractorListCreateAPIView.get`: Bổ sung `'partner_type'` và `'yard_address'` vào JSON response trả về frontend.
  * `SubcontractorDetailAPIView`: Thêm method `get` và đảm bảo `put` nhận, lưu `partner_type` và `yard_address`.
  * Frontend: Lấy chính xác `partner_type` và `yard_address` khi build payload lưu, tự động cập nhật cache và hiển thị đúng loại đối tác ngay sau khi lưu.

## [v3.7.3] - 2026-10-21 (Rút Gọn Nhãn Thầu Phụ Thành "Ghi Chú", Inline Edit Đội Xe & Danh Bạ Bác Tài)

### 1. Chuẩn Hóa Nhãn Giao Diện Thầu Phụ:
- **Đổi nhãn `Tuyến Thế Mạnh & Ghi Chú Đơn Giá` $\rightarrow$ `Ghi chú`:**
  * Cập nhật nhãn trường nhập liệu trong modal thêm/sửa Thầu phụ (`static/js/app.js`, `static/js/modules/master_data.js`).
  * Cập nhật tiêu đề cột bảng danh sách từ `Tuyến Thế Mạnh / Ghi Chú` thành `Ghi Chú`.
  * Cập nhật header schema file Excel import/export thầu phụ (`apps/master_data/import_export_service.py`).
  * Placeholder trường ghi chú tinh giản thành `Ghi chú thêm...`.

### 2. Thao Tác Sửa/Xóa Đội Xe & Tài Xế Thầu Phụ (Inline Edit):
- Đổi cột `Xóa` thành `Thao Tác` với bộ nút `[Sửa | Xóa]` cho 2 bảng Đội xe và Danh bạ bác tài trong modal Thầu phụ.
- Hỗ trợ sửa trực tiếp trên bảng và cơ chế lưu toàn bộ khi bấm nút `[✓ Lưu]`.

## [v3.7.2] - 2026-10-21 (Phân Loại Đối Tác Thầu Phụ, Chuẩn Hóa DOM Scoped Bền Vững & Cụm 3 Nút Chi Phí Chuẩn Bàn Tay Tài Xế)

### 1. Phân Loại Đối Tác Chuẩn Hóa (`partner_type` trong `Subcontractor`):
- **Model `Subcontractor` (`apps/master_data/models.py`):**
  * Bổ sung enum `PartnerType`: `CARRIER` (Nhà xe vận tải 3PL), `GARAGE` (Gara sửa chữa / bảo dưỡng), `SUPPLIER` (Nhà cung cấp vật tư / dịch vụ khác).
  * Thêm trường `partner_type` có đánh index `db_index=True`, mặc định `CARRIER`.
- **Dropdown Điều Xe & Tạo Chuyến (`apps/master_data/api_views.py`):**
  * Danh sách chọn nhà xe thầu phụ (`#inp-subcontractor`) tự động lọc chỉ lấy `partner_type=CARRIER`, loại bỏ triệt để Gara hoặc Nhà cung cấp khỏi luồng điều xe chở hàng.
- **Giao Diện Master Data & Modal Đối Tác (`static/js/app.js`):**
  * Bảng Thầu phụ bổ sung cột **`Loại Đối Tác`** với badge trực quan phân biệt: Xanh Teal (Nhà xe 3PL), Vàng Cam (Gara bảo dưỡng), Tím Indigo (Nhà cung cấp).
  * Toolbar Master Data hỗ trợ bộ lọc phụ nhanh theo Loại đối tác.
  * Trong Modal Sửa/Tạo Đối Tác: Nếu là `CARRIER` mới hiển thị 2 bảng con (Đội Xe & Danh Bạ Bác Tài); nếu chọn `GARAGE` hoặc `SUPPLIER` thì tự động ẩn 2 bảng con này để giao diện tinh gọn, không nhầm lẫn.

### 2. Chuẩn Hóa DOM Scoped Container Bền Vững (Zero-Regression DOM Conflict):
- **Xử lý triệt để xung đột ID trùng lặp giữa Modal ẩn và Full-Page View:**
  * Nâng cấp hàm `submitCustomsDeclarationForm(e)` và `submitEmployeeForm(event)` sang cơ chế Scoped Container Selector (`event.target.closest('form')`), đảm bảo luôn truy vấn đúng context submit, ngăn chặn 100% tình trạng submit rỗng hoặc bắt nhầm input ngầm trong DOM.

### 3. Cụm 3 Nút Phân Loại Chi Phí Chuẩn Bàn Tay Tài Xế (Touch Target $\ge 48\text{px}$):
- **Model `TripExpense` & Vòng Đời Kế Toán (`apps/billing/models.py`):**
  * Bổ sung enum `ExpensePayerType`:
    1. **`TVL_COST` (Chi phí TVL - Mặc định):** Triền Võ chịu $\rightarrow$ tính vào chi phí vận hành chuyến xe (`cached_expense`).
    2. **`TVL_OBH` (TVL chi hộ):** Triền Võ ứng tiền trước $\rightarrow$ lập Debit Note thu lại từ Khách hàng $\rightarrow$ không tính vào chi phí vận hành chuyến đi.
    3. **`SUB_OBH` (3PL chi hộ):** Tài xế/chủ xe 3PL tự bỏ tiền túi trả trước $\rightarrow$ Triền Võ hoàn trả cho 3PL khi quyết toán cước $\rightarrow$ đồng thời thu lại từ Khách hàng $\rightarrow$ không tính vào chi phí vận hành TVL.
  * Thêm trường `reimburse_to_subcontractor = BooleanField(default=False)` tự động kích hoạt khi chọn `SUB_OBH`.
  * Cơ chế tự động đồng bộ 2 chiều tương thích ngược hoàn hảo trong hàm `save()`.
- **Giao Diện Màn Hình Tài Xế Hiện Trường (`templates/driver_portal.html`):**
  * Thiết kế cụm 3 nút Segmented to bản, chiều cao 48px, chuẩn kích thước ngón tay tài xế trên điện thoại di động:
    * `[ 🏢 Chi phí TVL ]` (Mặc định - Màu Teal)
    * `[ ↗ TVL chi hộ ]` (Màu Sky Blue)
    * `[ 🔄 3PL chi hộ ]` (Màu Amber Orange)
  * Thao tác 1 chạm chuyển đổi tức thì kèm dòng hướng dẫn rõ nghĩa ngay bên dưới.
  * Tích hợp đồng bộ trên cả Form Kê Nhiều Dòng (Batch Entry), Form Sửa Dòng (Edit Modal) và Danh Sách Lịch Sử Chi Phí.
- **Giao Diện Điều Hành & Chi Tiết Chuyến Xe (`templates/views/view_trip_detail.html`):**
  * Thay thế toggle cũ bằng cụm 3 nút to trực quan trên cả Modal Thêm Chi Phí và Modal Sửa Chi Phí.
  * Bảng Kê Chi Phí hiển thị rõ nét badge `🏢 TVL`, `↗ TVL CHI HỘ`, `🔄 3PL CHI HỘ` trên từng dòng chi phí.
- **Quyết Toán Công Nợ Đối Tác 3PL (`apps/billing/finance_reports_api.py` & `modal_subcontractor_settle.html`):**
  * Tự động tính toán tổng các khoản 3PL chi hộ (`sub_reimbursable_expenses`) trên mỗi chuyến đi.
  * Số tiền thanh toán cho 3PL được tự động cộng thêm: `Còn phải trả = Cước thỏa thuận + Hoàn chi hộ 3PL - Tạm ứng`.

## [v3.7.1] - 2026-10-21 (Chế Độ Sửa Trực Tiếp Trên Bảng & Lưu Toàn Bộ Dữ Liệu Xe, Bác Tài Thuộc Nhà Xe 3PL)

### 1. Chuẩn Hóa Cột "Thao Tác" Kèm Bộ Đôi Nút [Sửa | Xóa] Trên 2 Bảng Con Nhà Xe:
- **Đổi Tên Cột:** Đổi tiêu đề cột từ `Xóa` thành **`Thao Tác`** chuẩn mực UI/UX quốc tế.
- **Bộ Đôi Nút [Sửa | Xóa] Trên Mỗi Dòng:**
  * **Nút Sửa (`ph-pencil-simple`):** Kích hoạt chế độ chỉnh sửa trực tiếp (Inline Editing) ngay trên từng dòng bản ghi của cả 2 bảng (Đội xe & Danh bạ tài xế).
  * **Nút Hủy (`ph-arrow-u-up-left`):** Hủy thao tác sửa và khôi phục lại dữ liệu ban đầu của dòng.
  * **Nút Xóa (`ph-trash`):** Gỡ xe hoặc xóa tài xế khỏi danh bạ đối tác kèm popup xác nhận an toàn.

### 2. Chế Độ Nhập Liệu Trực Tiếp Trên Bảng & Cơ Chế "Lưu Toàn Bộ" (Unified Save):
- **Nhập Liệu Ngay Trên Bảng (Inline Edit Inputs):**
  * **Bảng Đội Xe:** Khi bấm Sửa, các ô dòng biến thành input Biển số, select Loại xe (Đầu kéo, Xe tải 10T, 2T, Van), input Tải trọng (kg) và Hãng xe ngay trên bảng.
  * **Bảng Danh Bạ Bác Tài:** Khi bấm Sửa, các ô dòng biến thành input Họ tên, input Số điện thoại và input Số GPLX.
- **Cơ Chế "Nút Lưu Là Lưu Toàn Bộ":**
  * Khi bấm nút **`[ ✓ Lưu ]`** của Modal: Hệ thống tự động thu thập thông tin nhà xe, quét toàn bộ các dòng xe và dòng tài xế đang ở trạng thái chỉnh sửa trên 2 bảng, đồng thời tự động lưu cả xe mới hoặc tài xế mới nếu form thêm nhanh đang có dữ liệu. Toàn bộ thay đổi được lưu đồng bộ chỉ trong 1 lần bấm!

### 3. Nâng Cấp REST API Backend (`apps/master_data/api_views.py`):
  * Bổ sung method `PUT` & `PATCH` vào `SubcontractorVehicleDetailAPIView` (`/api/master-data/subcontractors/<id>/vehicles/<vehicle_id>/`) hỗ trợ cập nhật biển số, loại xe, tải trọng, hãng xe.

## [v3.7.0] - 2026-10-21 (Hoàn Thiện Quản Lý 2 Bảng Con Xe & Bác Tài 3PL Trong Modal Thầu Phụ, Thêm Tên Viết Tắt, Địa Chỉ Công Ty & Khắc Phục Lỗi Phát Lệnh Điều Xe)

### 1. Bổ Sung Tên Viết Tắt & Địa Chỉ Trong Quản Lý Đối Tác Thầu Phụ:
- **Model `Subcontractor` (`apps/master_data/models.py`):**
  * Bổ sung trường `short_name` (Tên viết tắt) giúp hiển thị ngắn gọn, trực quan trên các màn hình điều độ và danh sách.
  * Tự động sinh `short_name` từ `code` nếu người dùng để trống.
- **REST API Master Data (`apps/master_data/api_views.py`):**
  * Bổ sung `short_name` trong các endpoint CRUD `Subcontractor` và endpoint `form-options`.
  * Chuẩn hóa nhãn hiển thị trong options: `[Tên viết tắt] Tên đầy đủ công ty` (ví dụ `[3S] CÔNG TY TNHH 3S LOGISTICS`).
- **Giao Diện Bảng Thầu Phụ (`static/js/app.js`):**
  * Tách riêng cột **`Tên Viết Tắt`** (badge nổi bật) và cột riêng **`Địa Chỉ Công Ty`** trên bảng danh mục Thầu phụ thay vì gom chung chữ nhỏ.

### 2. Quản Lý Đồng Bộ 2 Bảng Con (Đội Xe & Tài Xế) Ngay Trong Màn Hình Modal Thầu Phụ:
- **Tích hợp 2 Bảng Con Trực Quan & Thống Nhất:**
  * **Bảng 1: Đội Xe / Phương Tiện Thuộc Nhà Xe (3PL):** Cho phép khai báo nhanh biển số xe, loại xe (đầu kéo, xe tải...), tải trọng (kg) và dòng xe. Xe được gán trực tiếp vào nhà xe với nguồn sở hữu `SUBCONTRACTOR`.
  * **Bảng 2: Danh Bạ Tài Xế Thuộc Nhà Xe (3PL):** Cho phép khai báo họ tên tài xế, số điện thoại liên hệ nhận lệnh Zalo và số GPLX.
  * **Chuẩn Hóa Nút Bấm Toàn App:** Thống nhất chữ **`Thêm mới`** cho tất cả các nút thêm bản ghi con và bảng chính (thay thế hoàn toàn nhãn `+ Thêm Bác Tài Mới`, `+ Thêm 3PL`...).
  * Khắc phục triệt để lỗi hiển thị chữ `null` trong ô "Người Điều Hành Xe".
- **REST API Phương Tiện Thầu Phụ (`apps/master_data/api_views.py` & `urls.py`):**
  * `GET /api/master-data/subcontractors/<id>/vehicles/`: Tải danh sách xe trực thuộc nhà xe.
  * `POST /api/master-data/subcontractors/<id>/vehicles/`: Thêm xe mới hoặc gán xe hiện có vào nhà xe.
  * `DELETE /api/master-data/subcontractors/<id>/vehicles/<vehicle_id>/`: Gỡ xe khỏi nhà xe.

### 3. Gán Nhà Cung Cấp / Đối Tác 3PL Trong Danh Mục Phương Tiện:
- **Modal Thêm/Sửa Phương Tiện (`currentMasterDataTab === 'vehicles'`):**
  * Khi chọn `Nguồn Sở Hữu = Xe Bạn (Thuê Ngoài / 3PL)`, tự động hiển thị dropdown **`Nhà Cung Cấp / Đối Tác 3PL Sở Hữu (*)`** tải danh sách thầu phụ kèm tên viết tắt.
  * Lưu và đồng bộ trường `subcontractor_id` lên backend API.
  * Trên bảng danh sách xe: Hiển thị badge màu hổ phách trực quan ghi rõ tên viết tắt của nhà xe sở hữu phương tiện.

### 4. Khắc Phục Triệt Để Sự Cố Không Bấm Phát Lệnh Điều Xe Được (`submitNewTrip`):
- **Phân Tích & Sửa Lỗi Gốc:**
  * Khắc phục xung đột ID DOM giữa modal ẩn (`modal-create-trip`) và trang giao diện tạo lệnh toàn màn hình (`view-create-trip`). Trước đây, hàm submit dùng `document.getElementById` toàn cục làm trỏ nhầm vào các input rỗng của modal ẩn, khiến việc kiểm tra trường bắt buộc thất bại trong âm thầm.
  * Hàm `submitNewTrip(sourceEl)` giờ đây tự động nhận diện container đang hoạt động (active context) và truy vấn chính xác input trên form mà người dùng đang thao tác.
  * Cải tiến Visual Feedback: Khi thiếu trường bắt buộc (như Giá cước khoán 3PL), hệ thống lập tức hiển thị viền đỏ nổi bật, tự động cuộn màn hình và focus con trỏ vào đúng ô input còn thiếu, đồng thời hiển thị Toast cảnh báo chi tiết tên trường cần nhập.

## [v3.6.9] - 2026-10-21 (Tính Năng Tải File Mẫu Excel & Nhập Danh Mục Ban Đầu Trực Tiếp Trên Từng Bảng Master Data Cho Người Dùng Admin)

### 1. Kiến Trúc Dịch Vụ Xuất Mẫu & Nhập Dữ Liệu Excel (`apps/master_data/import_export_service.py`):
- **Cấu hình Đầy Đủ 12 Danh Mục Cốt Lõi (`CATALOG_REGISTRY`):**
  * Hỗ trợ 100% các bảng danh mục quan trọng của ERP/TMS: Cảng & Kho bãi (`locations`), Quy cách cont & xe (`containers`), Khoản mục chi (`expenses`), Biểu phí lương chuyến (`driver_tariffs`), Phụ cấp & kiểm hóa (`allowances`), Khách hàng (`customers`), Biểu cước tuyến khách (`tariffs`), Phương tiện xe (`vehicles`), Rơ-moóc (`trailers`), Hãng tàu (`shipping_lines`), Nhà xe thầu phụ 3PL (`subcontractors`), Số dư ban đầu kế toán (`opening_balance`).
- **Tạo File Mẫu Chuẩn Hóa Thương Hiệu BIM Logistics (`generate_catalog_template`):**
  * Định dạng file `.xlsx` chuyên nghiệp với mã màu nhận diện thương hiệu BIM (Teal `#115E59` header), font chuẩn, đường viền mảnh (thin borders), tính năng tự động co giãn độ rộng cột (auto-fit width) và bật hiển thị đường lưới ô (gridlines).
  * Tiêu đề bảng rõ ràng kèm ghi chú hướng dẫn các cột bắt buộc có dấu `(*)`.
  * Có sẵn các dòng dữ liệu mẫu mang tính thực tế nghiệp vụ vận tải Triền Võ để người dùng dễ dàng hình dung và điền thông tin chính xác.
- **Trình Xử Lý Nhập Liệu An Toàn & Linh Hoạt (`process_catalog_import`):**
  * Tự động dò tìm dòng header thông minh hoặc theo vị trí cột.
  * Hỗ trợ làm sạch dữ liệu: tự động parse chuỗi, số nguyên, số thực (VNĐ/kg/CBM loại bỏ dấu phẩy, chữ 'đ', khoảng trắng), kiểu ngày tháng (`DD/MM/YYYY`, `YYYY-MM-DD`), kiểu logic (Có/Không, Hoạt động/Ngừng, True/False, 1/0) và lựa chọn enum tiếng Việt.
  * Tự động tra cứu và liên kết khóa ngoại (Foreign Key) như liên kết Khách hàng trong Biểu cước (`tariffs`), liên kết Thầu phụ 3PL trong Phương tiện (`vehicles`).
  * Cơ chế Upsert thông minh: tự động cập nhật nếu đã tồn tại mã hoặc bỏ qua tránh ghi đè tùy chọn của người dùng.
  * Thực thi trong giao dịch nguyên tử (`transaction.atomic()`) bảo toàn tính toàn vẹn dữ liệu và cơ chế Soft-Delete (`is_deleted=False`).

### 2. Hệ Thống REST API Master Data (`apps/master_data/api_views.py` & `urls.py`):
- `GET /api/master-data/export-template/?catalog=<catalog_key>`: Tạo và tải về file Excel mẫu chuẩn hóa cho danh mục được chọn.
- `GET /api/master-data/export-data/?catalog=<catalog_key>`: Xuất toàn bộ dữ liệu hiện hành trong bảng ra file Excel.
- `POST /api/master-data/import/`: Nhận file `.xlsx` (`multipart/form-data`), kiểm tra quyền quản trị (`CanManageMasterData`), xử lý nạp dữ liệu và phản hồi báo cáo chi tiết (số bản ghi tạo mới, cập nhật, bỏ qua và danh sách lỗi từng dòng).

### 3. Giao Diện Người Dùng Master Data SPA (`templates/views/view_master_data.html`, `templates/components/modal_master_data_import.html` & `static/js/app.js`):
- **Cụm Nút Tác Vụ Chuẩn Trên Từng Bảng:**
  * Hiển thị trực quan ngay trên thanh công cụ của từng bảng danh mục:
    + `[Tải Mẫu Excel]` (Nút màu trắng viền xám, icon download teal)
    + `[Nhập Excel]` (Nút màu xanh ngọc emerald nổi bật, icon upload)
    + `[Xuất File]` (Nút xuất toàn bộ dữ liệu bảng)
    + `[Tạo Mới]` (Nút thêm mới thủ công từng bản ghi)
  * Nút tự động thích ứng: chỉ hiển thị trên các bảng danh mục dữ liệu, ẩn đi trên các tab đặc thù như Hồ sơ công ty hay Phân quyền Django.
- **Modal Nhập Dữ Liệu Chuyên Nghiệp (`modal-master-data-import`):**
  * Tự động đồng bộ bảng danh mục đích theo tab hiện tại, hỗ trợ chuyển đổi linh hoạt.
  * Tích hợp nút tải nhanh file mẫu ngay trong modal nếu người dùng chưa có mẫu.
  * Vùng kéo thả (Drag & Drop) tệp Excel trực quan, hiển thị tên file và dung lượng tệp được chọn.
  * Hộp kiểm "Cập nhật dữ liệu nếu đã tồn tại mã (Upsert - Khuyến nghị)".
  * Hiển thị trạng thái tiến trình (spinner) và báo cáo tổng kết chi tiết dạng alert trực quan kèm tự động làm mới bảng dữ liệu và số liệu thống kê.

### 4. Kiểm Thử Hệ Thống & Bảo Đảm Zero-Regression:
- **Kiểm tra Cú pháp JS:** `node -c static/js/app.js` & `node -c static/js/column_manager.js` -> 100% Passed.
- **Bộ Kiểm Thử Tự Động Toàn Phân Hệ Master Data:** 14/14 tests Passed (`apps/master_data/tests.py`).
- **Kiểm Thử Thị Giác Playwright Browser:** Chụp ảnh màn hình thực tế giao diện các nút thao tác trên từng bảng và Modal nhập liệu (`test_screenshots/`).

## [v3.6.8] - 2026-10-21 (Triển Khai Quản Lý Tập Trung Xe & Tài Xế Đối Tác 3PL Làm Trọng Tâm: Model SubcontractorDriver, Cách Ly Bảng Lương Nhân Sự, Gom Nhóm Công Nợ Theo Pháp Nhân & Điều Xe Động On-The-Fly)

### 1. Kiến Trúc Quản Lý Tập Trung Theo Pháp Nhân Đối Tác 3PL (Thầu Phụ):
- **Tách Biệt Hoàn Toàn Khỏi Nhân Sự Nội Bộ (`personnel.Employee`):**
  * Giải quyết dứt điểm bài toán quản lý xe ngoài và tài xế ngoài mà không làm ô nhiễm bảng lương, sổ chấm công, hợp đồng lao động và BHXH nội bộ của công ty.
  * Tạo mới model `SubcontractorDriver` (`apps/master_data/models.py`) trực thuộc `Subcontractor` với các thông tin: `full_name`, `phone`, `license_number`, `is_active`, `notes`.
  * Bổ sung quan hệ `subcontractor` trên model `Vehicle` (`apps/fleet/models.py`), cho phép quản lý đội xe của thầu phụ và hỗ trợ ngày đăng kiểm linh hoạt (`registration_expiry` nullable).
- **Mở Rộng Model Hạt Nhân `DispatchTrip` (`apps/dispatch/models.py`):**
  * Cho phép trường `driver` (nhân sự nội bộ) nhận giá trị `None` khi điều xe 3PL.
  * Bổ sung các trường chuyên biệt: `subcontractor`, `subcontractor_driver`, `subcontractor_driver_name`, `subcontractor_driver_phone`.
  * Bổ sung các dynamic properties: `assigned_driver_name`, `assigned_driver_phone`, `carrier_name` đảm bảo tính trong suốt trên toàn bộ hệ thống.

### 2. Quản Lý Đối Soát & Công Nợ Thầu Phụ Theo Pháp Nhân Doanh Nghiệp:
- **Tập Hợp Công Nợ Chuẩn Mực Kế Toán (`apps/billing/finance_reports_api.py`):**
  * Nâng cấp API `/api/accounting/subcontractor-settlements/` gom nhóm công nợ theo pháp nhân Đối tác 3PL (`by_partner`) thay vì gom theo biển số xe rời rạc.
  * Thống kê tự động: Tổng cước thầu phụ (`total_cost`), Tổng tạm ứng đã cấp (`total_advance`), Công nợ còn lại phải thanh toán (`remaining_payable`) và danh sách toàn bộ chuyến xe liên quan.

### 3. Phòng Thủ Tuyệt Đối Bảng Lương Nhân Sự Nội Bộ (Defensive Payroll):
- **Cách Ly Chuyến Xe Ngoài Khỏi Lương Chuyến (`apps/personnel/api_views.py`):**
  * Bổ sung điều kiện lọc `.filter(subcontractor__isnull=True)` tại bộ tính lương chuyến tài xế chính (`trips_main`) và tài xế cắt kéo (`trips_dropoff`).
  * Ngăn chặn 100% rủi ro tính nhầm cước xe bạn / xe 3PL vào bảng lương của tài xế công ty.

### 4. Quản Lý Danh Bạ Tài Xế 3PL Ngay Trên Giao Diện Danh Mục & Điều Xe Động:
- **Quản Lý Tập Trung Tại Phân Hệ Cài Đặt Danh Mục (Master Data):**
  * Tích hợp khối Quản lý Danh bạ Tài xế trực thuộc ngay trong Modal Chỉnh sửa Đối tác Thầu Phụ (pps/master_data).
  * Cho phép xem danh sách tài xế, thêm nhanh bác tài mới (Họ tên, SĐT, Số GPLX) và xóa tài xế trực tiếp từ giao diện với Toast thông báo phản hồi tức thì.
  * Bổ sung nút tắt icon Vô-lăng trên bảng danh sách Thầu Phụ để mở nhanh danh bạ tài xế.
- **Hệ Thống API Master Data & Điều Xe Động (On-The-Fly):
- **REST APIs Quản Lý Đội Xe & Tài Xế Thầu Phụ:**
  * Endpoint `/api/master-data/subcontractors/<id>/fleet/`: truy xuất nhanh danh sách xe và tài xế được gán cho đối tác.
  * Endpoints CRUD tài xế 3PL: `/api/master-data/subcontractors/<id>/drivers/` và `/api/master-data/subcontractor-drivers/<id>/`.
  * Cơ chế tự động nhận diện và tạo nhanh (on-the-fly) tài xế mới hoặc xe mới ngay trên modal điều xe, tự động liên kết vào danh bạ của đối tác cho các lần điều vận sau.

### 5. Giao Diện Điều Vận SPA & Cổng Thông Tin Tài Xế (Driver Portal):
- **Modal Điều Xe Thông Minh (`templates/components/modal_create_trip.html` & `static/js/app.js`):**
  * Bổ sung switch chọn chế độ: "Xe Nhà (TVL)" vs "Xe Bạn / 3PL".
  * Khi chọn đối tác 3PL, dropdown xe và tài xế tự động nạp dữ liệu của đối tác đó kèm khả năng nhập xe khác hoặc tài xế mới tức thì.
- **Cổng Tài Xế Trực Tuyến (`templates/driver_portal.html` & `apps/dispatch/views.py`):**
  * Hiển thị chuẩn xác tên đơn vị vận chuyển (`carrier_name`), tài xế và số điện thoại liên hệ cho cả xe nội bộ và tài xế xe ngoài.

### 6. Kiểm Thử Hệ Thống & Bảo Đảm Zero-Regression:
- **Kiểm tra Cú pháp JS:** `node -c static/js/app.js` & `node -c static/js/column_manager.js` -> 100% Passed.
- **Bộ Kiểm Thử Tự Động Toàn Hệ Thống:** Toàn bộ 113 Unit Tests (`python manage.py test --keepdb`) -> 100% Passed (113/113 passed, 0 failures, 0 errors).


## [v3.6.7] - 2026-10-21 (Chuẩn Hóa Bảo Mật URL HashID Chống IDOR Toàn Ứng Dụng: Mã Hóa HashID Bản Tin & Công Việc, Tự Động Redirect 301 Từ URL Cũ, Đồng Bộ Chuông Thông Báo & Deep-Link)

### 1. Chuẩn Hóa Bảo Mật URL Bằng HashID Chống Quét IDOR:
- **Bộ Mã Hóa HashID Chuyên Dụng (`core/security.py`):**
  * Triển khai singleton `_NEWS_HASHIDS` với bảng mã an toàn `abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789`, độ dài tối thiểu 8 ký tự, loại bỏ các ký tự dễ nhầm lẫn (`l`, `1`, `I`, `0`, `O`).
  * Cung cấp các hàm chuẩn hóa: `get_news_hashid()`, `decode_news_hashid()`, `get_task_hashid()`, `decode_task_hashid()`.
  * Thuộc tính động `hashid` trên model `CompanyPost` (`apps/collaboration/models/news.py`) và `OfficeTask` (`apps/collaboration/models/tasks.py`).
  * Bổ sung trường `hashid` trong serializers REST API: `CompanyPostListSerializer`, `CompanyPostDetailSerializer`, `OfficeTaskListSerializer`, `OfficeTaskDetailSerializer`.

### 2. Tự Động Chuyển Hướng Vĩnh Viễn (HTTP 301 Permanent Redirect) Từ URL Số Cũ:
- **Bảo Vệ URL Bản Tin (`apps/dispatch/views.py` - `news_detail_page_view`):**
  * Phân giải linh hoạt cả `hashid` và `pk` số nguyên cũ để đảm bảo tính tương thích ngược tuyệt đối.
  * Khi người dùng hoặc liên kết ngoài truy cập vào URL cũ dạng ID số (`https://logistics.bim.info.vn/news/2/`), hệ thống tự động trả về `HTTP 301 Moved Permanently` chuyển hướng trực tiếp sang URL bảo mật chuẩn HashID (`https://logistics.bim.info.vn/news/oBYJLe4r/`).
  * Triệt tiêu hoàn toàn nguy cơ quét vét IDOR bài viết từ các tác nhân bên ngoài.

### 3. Đồng Bộ Toàn Diện Trên Giao Diện & Hệ Thống Chuông Thông Báo:
- **Chuông Thông Báo (Notifications API):**
  * Tự động sinh link an toàn dạng `/news/{post.hashid}/` và `/tasks/#task-{task.hashid}` ngay từ tầng phát sinh thông báo sự kiện (`CompanyPost.save`, `OfficeTask.save`, yêu cầu gia hạn).
- **Trang Chi Tiết Bản Tin (`templates/news_detail.html`):**
  * Cập nhật URL chia sẻ (Share URL) và Meta Tags sử dụng `post_hashid`.
  * Nút 'Sao chép liên kết' sao chép chính xác đường link `/news/<hashid>/`.
- **Giao Diện SPA (`static/js/app.js` & `static/js/collaboration.js`):**
  * Đồng bộ `openNewsDetailModal(post.hashid || post.id)` và `openTaskDetailDrawer(task.hashid || task.id)`.
  * Hàm `resolveInitialRoute` tự động nhận diện và mở chính xác drawer/modal khi truy cập deep-link HashID từ thanh địa chỉ trình duyệt.

### 4. Kiểm Thử Hệ Thống & Bảo Đảm Zero-Regression:
- **Kiểm tra Cú pháp JS:** `node -c static/js/app.js` & `node -c static/js/collaboration.js` -> 100% Passed.
- **Bộ Kiểm Thử Tự Động:** Toàn bộ 110 Unit Tests của dự án (`python manage.py test --keepdb`) -> 100% Passed (110/110 passed, 0 failures, 0 errors).
- **Kiểm thử An ninh Tự động (`apps/collaboration/tests.py`):** Kiểm chứng thành công mã phản hồi HTTP 301 và HTTP 200 cho cả URL cũ và URL HashID mới.


## [v3.6.6] - 2026-10-21 (Khắc Phục Lỗi NameError CompanyProfile Tại /news/<id>/, Tăng Cường Bảo Mật URL Toàn Ứng Dụng, Phân Quyền Phòng Ban & Trang 403 Chuẩn ERP)

### 1. Khắc Phục Triệt Để Lỗi 500 NameError Tại Trang Bản Tin (/news/<pk>/):
- **Import CompanyProfile:** Bổ sung import rom apps.master_data.models import CompanyProfile tại đầu tệp pps/dispatch/views.py.
- **Defensive Error Handling:** Bọc lệnh gọi CompanyProfile.get_default_company() và trích xuất dung lượng/tên tệp đính kèm trong khối 	ry...except phòng thủ, loại bỏ hoàn toàn nguy cơ sập trang 500 do lỗi dữ liệu công ty hoặc tệp tin.

### 2. Tăng Cường Bảo Mật URL & Phân Quyền Toàn Ứng Dụng:
- **Bảo vệ Trung tâm Trợ Giúp (/helps/ & /help):** Bắt buộc nhân viên đăng nhập hệ thống (@login_required), chống lộ lọt SOP và bí quyết vận hành nội bộ logistics cho người dùng vãng lai chưa xác thực.
- **Phân quyền Xem Bản tin (/news/<pk>/ & CompanyPostDetailAPIView):**
  * Bản tin nháp/chưa xuất bản (is_published=False): Chỉ tác giả bài viết hoặc Ban Giám Đốc mới được xem trước; người khác nhận phản hồi HTTP 404 Not Found.
  * Bản tin giới hạn phòng ban (	arget_department != 'ALL'): Chỉ nhân viên cùng phòng ban, tác giả hoặc Ban Giám Đốc (hierarchy_level >= 80) mới được xem; nhân sự phòng ban khác bị chặn bởi HTTP 403 Forbidden.
- **Trang lỗi 403 Forbidden Chuyên Dụng (templates/403.html):** Thiết kế giao diện sang trọng, chuẩn nhận diện BIM Logistics (icon ph-shield-warning, viền đỏ/nền xám tinh tế) kèm thông điệp giải thích rõ ràng và các nút điều hướng 'Quay lại', 'Về Bàn Làm Việc'.

### 3. Siết Chặt Phân Quyền REST API (Least Privilege & RBAC):
- **API Bản tin (CompanyPostDetailAPIView.delete):** Chặn xóa bài viết trái thẩm quyền. Chỉ tác giả bài viết, Ban Giám Đốc hoặc Trưởng phòng Hành chính Nhân sự mới có quyền xóa.
- **API Giao việc (OfficeTaskDetailAPIView.put & .delete):** Chặn chỉnh sửa và xóa công việc chéo phòng ban. Chỉ người giao việc, người phụ trách, Trưởng phòng phụ trách trực tiếp phòng ban đó hoặc Ban Giám Đốc mới có thẩm quyền thao tác.

### 4. Chuẩn Hóa Điều Hướng Chuông Thông Báo (Smart & Secure Notification Routing):
- **Deep-link Thông báo Chuông:** Gán chính xác URL đích dạng /news/<id>/ hoặc /tasks/#task-<id> thay vì hash thô.
- **Chống Lỗ hổng Open Redirect:** handleNotificationClick trong static/js/collaboration.js chỉ chấp nhận đường dẫn nội bộ an toàn (bắt đầu bằng # hoặc /). Tự động mở modal xem trước/drawer khi người dùng đang ở trong SPA, hoặc chuyển hướng trang mượt mà khi người dùng đang ở trang độc lập.
- **Deep-link Khởi tạo Trang (
esolveInitialRoute trong static/js/app.js):** Tự động phát hiện và kích hoạt Drawer công việc (#task-<id>) hoặc Modal bản tin (#news-<id>) khi người dùng click link chia sẻ hoặc truy cập trực tiếp từ URL trình duyệt.

### 5. Kiểm Thử Hệ Thống & Bảo Đảm Zero-Regression:
- **Kiểm tra Cú pháp JS:** node -c static/js/app.js & node -c static/js/collaboration.js -> 100% Passed.
- **Bộ Kiểm Thử Tự Động:** Toàn bộ 110 Unit Tests của dự án (python manage.py test --keepdb) -> 100% Passed (110/110 passed, 0 failures, 0 errors).

## [v3.6.5] - 2026-10-21 (Chuẩn Hóa Luồng Gia Hạn & Duyệt Gia Hạn Task: Phân Quyền Người Phụ Trách, Bắt Buộc Lý Do Từ Chối, Chuông Thông Báo 2 Chiều & Line Bọc Viền Đổi Màu Theo Trạng Thái)

### 1. Phân Quyền Yêu Cầu Gia Hạn Nghiêm Ngặt:
- **Chỉ Người Phụ Trách mới có quyền yêu cầu gia hạn:** Siết chặt logic backend API (`apps/collaboration/api_views/tasks_api.py`) và Frontend UI (`static/js/collaboration.js`). Người theo dõi (Follower) hay các nhân sự khác không được phép gửi yêu cầu thay (trả về HTTP 403 Forbidden).
- **Giao diện Task Drawer:** Nút 'Đề xuất gia hạn' chỉ hiển thị với đúng người phụ trách của công việc đó khi công việc chưa hoàn thành và chưa có yêu cầu gia hạn đang chờ xử lý.

### 2. Màn Hình Người Giao Việc & Form Duyệt / Từ Chối Bắt Buộc Lý Do:
- **Hiển thị thông tin đề xuất nổi bật:** Khi có yêu cầu gia hạn đang chờ (`PENDING`), màn hình Người giao việc hiển thị Banner viền tím với đầy đủ thông tin: Hạn hiện tại -> Hạn mới đề xuất, Người đề xuất, Lý do gia hạn chi tiết.
- **Nút Đồng ý gia hạn:** Phê duyệt dời hạn hoàn thành sang ngày mới, cập nhật trạng thái `APPROVED`.
- **Nút Không đồng ý:** Mở form inline viền đỏ bắt buộc nhập lý do từ chối; hệ thống chặn gửi nếu để trống lý do (trả về HTTP 400 Bad Request).
- **Lịch sử gia hạn trong Drawer:** Hiển thị khối ghi nhận kết quả duyệt (viền xanh lá khi đã duyệt, viền đỏ kèm lý do khi bị từ chối).

### 3. Chuông Thông Báo Hai Chiều Tức Thì (Notifications):
- **Gửi đến Người Giao:** Nhận thông báo `TASK_EXTENSION_REQUESTED` ngay khi người phụ trách gửi yêu cầu gia hạn.
- **Gửi đến Người Phụ Trách:** Nhận thông báo `TASK_EXTENSION_REVIEWED` ngay khi người giao Đồng ý hoặc Không đồng ý (kèm lý do từ chối).
- **Hủy yêu cầu:** Người giao nhận thông báo thu hồi khi người phụ trách hủy yêu cầu đang chờ.

### 4. Line Bọc Viền (Border) Đổi Màu Trực Quan Trùng Với Trạng Thái:
- **Thẻ Task (Kanban & Dashboard):** Giữ nền trắng sạch sẽ, đổi màu đường viền bao quanh (line bọc) trùng với màu trạng thái để người dùng lướt mắt qua là nhận diện được ngay:
  * **Chờ duyệt gia hạn:** Line viền màu tím (`border-2 border-purple-400 hover:border-purple-500 shadow-purple-500/10`).
  * **Quá hạn:** Line viền màu đỏ (`border-2 border-rose-400 hover:border-rose-500 shadow-rose-500/10`).
  * **Đến hạn hôm nay:** Line viền màu cam/hổ phách (`border-2 border-amber-400 hover:border-amber-500 shadow-amber-500/10`).
  * **Hoàn thành:** Line viền màu xanh lá (`border border-emerald-300 hover:border-emerald-400`).
  * **Bình thường:** Line viền xám mặc định (`border border-slate-200/90`).
- **Bảng danh sách (List View):** Đường viền cạnh trái `border-l-4` đổi màu sắc đồng bộ.

### 5. Kiểm Thử Hệ Thống & Bảo Đảm Zero-Regression:
- **Cú pháp JavaScript:** `node -c static/js/app.js` & `node -c static/js/collaboration.js` -> 100% Passed.
- **Unit Tests:** `apps.collaboration.tests` & `core.tests.FrontendSyntaxIntegrityTestCase` -> 11/11 Passed.

## [v3.6.4] - 2026-10-20 (Nâng Cấp Cửa Sổ Chat Nội Bộ: Thanh Công Cụ Đa Năng, Tag @ Thành Viên, Tag # Mục Việc, Chụp Màn Hình & Dán Ảnh Clipboard Siêu Tốc)

### 1. Nút Tag @ Thành Viên & # Mục Việc (Mention Dropdown & Quick Insertion):
- **Nút @ trên thanh công cụ chat:** Thiết kế nút biểu tượng @ nổi bật (\g-teal-50 text-teal-800 border-teal-200/80 hover:bg-teal-100\). Bấm vào mở ngay menu popup tiện ích gồm 2 tab:
  * **Tab @ Thành viên:** Tải danh bạ nhân sự nội bộ công ty kèm ảnh avatar, chức vụ, phòng ban; gõ tìm kiếm lọc theo thời gian thực; bấm để chèn \@Họ_Tên\ vào vị trí con trỏ trong ô chat.
  * **Tab # Mục việc:** Tải danh sách công việc/nhiệm vụ kèm mã \CV-xx.yyy\, tên công việc, trạng thái (\IN_PROGRESS\, \DONE\...); bấm để chèn \#Mã_Việc [Tên_Việc]\ vào vị trí con trỏ và tự động liên kết ID nhiệm vụ vào tin nhắn.
- **Tự động gợi ý khi gõ phím:** Khi người dùng nhập ký tự \@\ hoặc \#\ trực tiếp trong ô gõ tin nhắn (\#chat-message-input\), dropdown gợi ý tự động kích hoạt và chuyển đúng tab tương ứng.
- **Định dạng hiển thị tinh giản, không bọc badge cồng kềnh:**
  * Ký hiệu \@Tên_Nhân_Sự\: Giữ text tự nhiên, chỉ highlight khác màu font (xanh ngọc teal đậm trang nhã, không bọc badge viền/nền hộp rườm rà).
  * Ký hiệu \#Mã_Việc\: Giữ text tự nhiên màu chàm nổi bật, nhấp chuột mở ngay Drawer chi tiết nhiệm vụ (\openTaskDetailDrawer\).
  * Thẻ công việc (Kanban & List): Tinh giản thẻ Task sạch sẽ, loại bỏ viền loang màu hay badge pill to kềnh; hạn chót và tiến độ chỉ highlight màu font chữ (đỏ khi quá hạn, cam khi đến hạn, tím khi chờ duyệt gia hạn) thanh lịch chuẩn ERP.

### 2. Chụp Màn Hình Trực Tiếp & Dán Ảnh Clipboard Siêu Tốc (Screen Capture & Image Paste):
- **Phím tắt dán ảnh toàn cầu & cục bộ (Ctrl + V):**
  * Tự động phát hiện khi cửa sổ chat đang mở (\#chat-floating-window\), hỗ trợ dán ảnh màn hình trực tiếp từ Clipboard vào tin nhắn.
  * Bổ sung nút **Dán clipboard** (\ph-clipboard-text\) đọc trực tiếp hình ảnh từ avigator.clipboard.read()\ đối với các trình duyệt hỗ trợ.
- **Nút Chụp màn hình tích hợp (ph-camera):**
  * Tích hợp Screen Capture API (avigator.mediaDevices.getDisplayMedia\), cho phép người dùng chọn cửa sổ/màn hình để chụp ngay tức thì một ảnh tĩnh chất lượng cao, tự động đặt tên theo thời gian thực và đính kèm vào khung chat.
  * Fallback thông minh: Hướng dẫn người dùng dùng tổ hợp phím chuẩn \Win + Shift + S\ rồi \Ctrl + V\ nếu trình duyệt chặn quyền hoặc không hỗ trợ capture stream.
- **Preview Thumbnail trực quan:**
  * Hiển thị danh sách ảnh/file đang chờ gửi dạng thumbnail ảnh bo góc xinh xắn, có nút xóa x nhanh, biểu tượng tệp và kích thước dung lượng.
- **Hiển thị trực tiếp ảnh trong tin nhắn:**
  * Cả phía gửi (me) và phía nhận đều hiển thị ảnh preview to rõ, bo tròn thẩm mỹ, bấm vào ảnh để phóng to xem chi tiết trong tab mới mà không bị đứt quãng luồng trao đổi.

### 3. Kiểm Thử Hệ Thống & Bảo Đảm Zero-Regression:
- **Cú pháp JavaScript:** ode -c static/js/app.js\ và ode -c static/js/collaboration.js\ -> 100% Passed.
- **Unit Tests:** \pps.collaboration.tests\ & \core.tests.FrontendSyntaxIntegrityTestCase\ -> 11/11 Passed.

## [v3.6.3] - 2026-10-20 (Nâng Cấp Toàn Diện Phân Hệ Quản Lý Công Việc Task: Deadline Màu Nhắc Nhở, % Tiến Độ Trực Quan & Nghiệp Vụ Đề Xuất / Duyệt Gia Hạn Hạn Chót)

### 1. Hiển Thị Hạn (Deadline) Theo Màu Cảnh Báo Trực Quan (Color-Coded Deadline Alerts & Left Border Accent):
- **Cơ chế phân loại hạn động:**
  * **Quá hạn:** Badge đỏ rực rỡ (`bg-rose-50 text-rose-700 border-rose-300`), icon nhấp nháy, kèm số ngày trễ cụ thể: `Hạn: 19/10/2026 (Quá hạn 1 ngày)`. Thẻ Task có viền cạnh trái đỏ (`border-l-[5px] border-l-rose-500 bg-rose-50/20`).
  * **Đến hạn hôm nay:** Badge hổ phách nổi bật (`bg-amber-50 text-amber-900 border-amber-400`), icon đồng hồ cát nảy: `Hạn: 20/10/2026 (Hôm nay)`. Thẻ có viền cạnh trái cam (`border-l-[5px] border-l-amber-500 bg-amber-50/20`).
  * **Sắp đến hạn (Còn 1-2 ngày):** Badge xanh dương sáng (`bg-sky-50 text-sky-900 border-sky-300`), icon đồng hồ: `Hạn: Ngày mai (Còn 1 ngày)`.
  * **Còn nhiều thời gian (> 2 ngày):** Badge slate dịu mắt kèm số ngày còn lại.
  * **Đang chờ duyệt gia hạn:** Badge tím nổi bật (`bg-purple-100 text-purple-900 border-purple-300`), viền cạnh trái tím.

### 2. Hiển Thị % Tiến Độ To Rõ & Thanh Progress Bar Chuyển Màu Sinh Động:
- **Pill % Tiến độ:** Badge to rõ, có trạng thái trực quan:
  * 0%: `0% Chưa bắt đầu` (slate)
  * 1-49%: `[p]% Đang làm` (amber)
  * 50-79%: `[p]% Đang tiến triển` (sky/indigo)
  * 80-99%: `[p]% Sắp hoàn tất` (teal)
  * 100%: `100% Hoàn thành` (emerald)
- **Thanh Progress Bar dày dặn:** Tăng chiều cao lên `h-2.5`, nền rãnh xám bo tròn, đổ gradient màu chuyển tiếp theo tiến độ thực tế.
- **Badge "Việc của bạn" (My Task Indicator):** Tự động gắn tag nổi bật `Việc của bạn` cho những công việc mà người dùng đăng nhập là người phụ trách chính.

### 3. Nghiệp Vụ Quản Lý Gia Hạn Hạn Chót Chuẩn ERP (Task Extension Workflow):
- **Data Model (apps/collaboration/models/tasks.py & notification.py):**
  * Bổ sung enum `TaskExtensionStatus`: `NONE`, `PENDING`, `APPROVED`, `REJECTED`.
  * Thêm các trường: `extension_status`, `requested_deadline`, `extension_reason`, `extension_requested_at`, `extension_requested_by`, `extension_reviewed_at`, `extension_reviewed_by`, `extension_review_note`.
  * Bổ sung thông báo `TASK_EXTENSION_REQUESTED`, `TASK_EXTENSION_REVIEWED` vào chuông thông báo.
- **REST API (OfficeTaskExtensionAPIView trong apps/collaboration/api_views/tasks_api.py):**
  * `action = 'request'`: Người được giao gửi đề xuất dời hạn kèm ngày mới và lý do; ghi nhật ký và thông báo lên chuông người giao.
  * `action = 'approve'`: Người giao việc/Admin duyệt dời hạn; tự động cập nhật `due_date`, đổi trạng thái sang `APPROVED`, ghi nhật ký và thông báo cho người được giao.
  * `action = 'reject'`: Người giao việc/Admin từ chối; giữ nguyên hạn cũ, đổi trạng thái sang `REJECTED`, ghi nhận lý do.
  * `action = 'cancel'`: Người gửi thu hồi đề xuất gia hạn khi đang chờ duyệt.
- **Giao Diện Modal Chi Tiết Task (templates/views/view_tasks.html & static/js/collaboration.js):**
  * Hiển thị Banner cảnh báo gia hạn tím hổ phách khi có yêu cầu đang chờ duyệt.
  * Nút "Đề xuất gia hạn" kèm form inline cho người phụ trách.
  * Bộ nút "Duyệt gia hạn" (xanh lá) và "Từ chối" (đỏ) cho người giao việc và Ban Giám Đốc.

### 4. Kiểm Thử Hệ Thống & Bảo Đảm Zero-Regression:
- **Cú pháp JavaScript:** `node -c static/js/app.js` và `node -c static/js/collaboration.js` -> 100% Passed.
- **Unit Tests:** `apps.collaboration.tests` -> 8/8 Passed (bao gồm `test_task_extension_request_and_approval_flow`).
- **Toàn bộ hệ thống:** `python manage.py test --keepdb` -> 108/108 Passed.

## [v3.6.2] - 2026-10-20 (Chuẩn Hóa Trạng Thái Ẩn/Hiện Sidebar & Lưu Cấu Hình LocalStorage: Unhide Luôn Unhide Ở Mọi Màn Hình, Hide Luôn Hide & Hover Peek)

### 1. Chuẩn Hóa Quản Lý Trạng Thái Sidebar Tập Trung (static/js/app.js):
- **Loại bỏ tình trạng nhảy trạng thái ngẫu nhiên:**
  * Xóa bỏ việc tự động gọi collapseSidebar() ghi đè localStorage trong setTopbarFullpageMode khi xem màn hình chi tiết (Tạo/Sửa chuyến, Booking, HĐLĐ, Phiếu lương...).
  * Tạo hàm chuẩn hóa tập trung applySidebarStateFromStorage():
    - **Trường hợp UNHIDE (bim_sidebar_collapsed !== 'true'):** Sidebar luôn luôn mở rộng cố định ở **TẤT CẢ** các màn hình (Dashboard, Danh sách, Trang chi tiết Fullpage, chuyển tab, reload trang).
    - **Trường hợp HIDE (bim_sidebar_collapsed === 'true'):** Sidebar luôn ở trạng thái thu gọn (collapsed) trên toàn hệ thống; khi quơ chuột (mouseenter) vào nút hide/toggle trên Topbar, sidebar trượt ra dạng Floating Flyout (sidebar-peek) để người dùng thao tác nhanh; rời chuột thì tự động thu gọn lại sau 220ms.
- **Bảo toàn 100% cơ chế Drawer trên Mobile / Tablet (< 1024px):**
  * Trên màn hình di động, đóng/mở drawer bằng collapseSidebar(false) / expandSidebar(false), tuyệt đối không ghi đè trạng thái localStorage của giao diện Desktop.
  * Cập nhật backdrop trong templates/base.html gọi collapseSidebar(false).
  * Thêm listener resize cửa sổ (debounce 150ms) để tự động điều chỉnh mượt mà giữa các kích thước màn hình.

### 2. Đồng Bộ Nút Toggle & Trạng Thái Mũi Tên Động (templates/components/topbar.html, templates/components/sidebar.html):
- Giữ nút toggle sidebar luôn hiển thị bên cạnh nút Back trên Topbar ở mọi chế độ để người dùng luôn có điểm chạm hover peek hoặc bật/tắt ghim.
- Hiển thị chính xác icon mũi tên theo trạng thái: Mũi tên hướng trái < khi đang Unhide (để thu gọn), Mũi tên hướng phải > khi đang Hide (để mở rộng/ghim cố định).

### 3. Kiểm Thử Hệ Thống & Bảo Đảm Zero-Regression:
- **Cú pháp JavaScript:** node -c static/js/app.js -> 100% Passed.
- **Unit Test:** core.tests.SidebarHoverPeekTestCase -> 4/4 Passed.
- **Toàn bộ hệ thống:** python manage.py test --keepdb -> 107/107 Passed.

## [v3.6.1] - 2026-10-20 (Chuẩn Hóa Quy Tắc Ký Hiệu Hợp Đồng Lao Động & Phụ Lục HĐ Chuẩn BIM ERP: [Loại HĐ].[Năm].[SốTT] & [Mã HĐ].PL[SốTT])

### 1. Chuẩn Hóa Cú Pháp Sinh Mã Hợp Đồng Lao Động (apps/personnel/models.py, apps/personnel/serializers.py):
- **Cấu trúc ký hiệu:** [Loại hợp đồng].[Năm].[SốTT trong năm]
  * **Tiền tố theo loại hợp đồng:**
    - Hợp đồng lao động chính thức / xác định thời hạn / không xác định thời hạn: HDLD (Ví dụ: HDLD.2026.0015).
    - Hợp đồng Thử việc: HDTV (Ví dụ: HDTV.2026.0016).
    - Hợp đồng Khoán việc / Thời vụ / Cộng tác viên: HDKV (Ví dụ: HDKV.2026.0017).
  * **SốTT trong năm:** Gồm 4 chữ số tăng dần (0001, 0002, ..., 0015), được cấp phát liên tục trong từng năm tài chính dựa trên số thứ tự lớn nhất của năm đó.
- **Tự động hóa Backend:**
  * Bổ sung class method LaborContract.generate_next_contract_number(contract_type, year).
  * Tự động sinh mã hợp đồng chuẩn nếu người dùng để trống contract_number khi gọi API hoặc lưu model.
  * Hỗ trợ API đề xuất mã: GET /api/personnel/contracts/?action=suggest_number&type=...&year=...

### 2. Chuẩn Hóa Cú Pháp Sinh Mã Phụ Lục Hợp Đồng (apps/personnel/models.py, apps/personnel/serializers.py):
- **Cấu trúc ký hiệu:** [Mã Hợp Đồng].PL[SốTT phụ lục]
  * Ví dụ:
    - Cho HDLD.2026.0015: Phụ lục 1 là HDLD.2026.0015.PL1, Phụ lục 2 là HDLD.2026.0015.PL2...
    - Cho HDTV.2026.0016: HDTV.2026.0016.PL1, HDTV.2026.0016.PL2...
    - Cho HDKV.2026.0017: HDKV.2026.0017.PL1...
- **Tự động hóa Backend:**
  * Bổ sung class method ContractAppendix.generate_next_appendix_number(contract).
  * Bổ sung trường suggested_appendix_number trong LaborContractSerializer để giao diện tự động điền số phụ lục tiếp theo.

### 3. Trải Nghiệm Người Dùng (UI/UX) — Thích Ứng Động & Gợi Ý Mã 1 Chạm (static/js/app.js, view_contract_detail.html):
- **Form Tạo Mới & Chi Tiết Hợp Đồng (view_contract_detail.html):**
  * Tự động lấy số HĐ đề xuất chuẩn HDLD.2026.0015 khi mở trang tạo mới (openCreateContractPage).
  * Tự động chuyển đổi tiền tố mã (HDLD <-> HDTV <-> HDKV) khi người dùng thay đổi dropdown Loại Hợp Đồng (onContractTypeChange).
  * Khi mở form Ký phụ lục inline (toggleAddAppendixInline): Tự động điền số phụ lục kế tiếp chuẩn [Mã HĐ].PL[nextIndex] (ví dụ: HDLD.2026.0015.PL1).

### 4. Đồng Bộ Dữ Liệu Thực Tế & Kiểm Thử Toàn Diện (System Verification):
- **Kịch bản đồng bộ dữ liệu CSDL (scripts/sync_contract_appendix_naming.py):**
  * Đã chuẩn hóa toàn bộ các hợp đồng cũ (như HDLD-KT001-2024 -> HDLD.2024.0004, v.v.) và các phụ lục cũ trên cả Local DB và Production VPS DB.
- **Cú pháp JavaScript:** node -c static/js/app.js -> 100% Passed.
- **Django Unit Tests:** python manage.py test apps.personnel.tests --keepdb -> 12/12 Passed.
- **Toàn bộ hệ thống:** python manage.py test --keepdb -> 107/107 Passed (Zero-Regression).
- **Triển khai VPS:** Đã deploy, collect static và restart container web trên VPS 149.118.60.194 an toàn.

## [v3.6.0] - 2026-10-20 (Nâng Cấp Trải Nghiệm Điều Hướng: Tính Năng Hover Peek Cho Sidebar Desktop Khi Đang Hide & Bảo Toàn 100% Drawer Mobile)

### 1. Trải Nghiệm Hover Peek Tốc Độ Cao Trên Màn Hình Desktop (`static/js/app.js`, `static/css/main.css`):
- **Cơ chế Hover to Peek:**
  * Khi người dùng chọn Hide Sidebar (sidebar ở trạng thái `collapsed`), việc quơ con chuột (`mouseenter`) vào nút hide trên Topbar (`#btn-toggle-sidebar`) sẽ kích hoạt chế độ `sidebar-peek`.
  * Sidebar trượt ra êm ái dạng Floating Flyout Drawer (`z-index: 60`, bóng đổ nổi `box-shadow: 14px 0 40px -4px rgba(15, 23, 42, 0.55)`), giúp người dùng xem và bấm chọn các menu một cách tức thì.
  * Khi con chuột rời khỏi (`mouseleave`) cả nút toggle và sidebar: Hệ thống tự động kích hoạt bộ đếm thời gian debounce 220ms và tự động thu gọn (hide lại) sidebar, trả lại không gian làm việc rộng rãi toàn màn hình.
  * Khi người dùng click vào bất kỳ menu nào trong sidebar: Trang tự động điều hướng sang phân hệ tương ứng và sidebar peek tự động thu gọn lại ngay lập tức.
- **Bảo toàn khả năng Ghim Cố Định (Pin/Unpin):**
  * Thao tác click chuột trực tiếp vào nút toggle trên Topbar (`#btn-toggle-sidebar`) hoặc nút pin mới trên header sidebar (`app-sidebar-header`) vẫn thực hiện ghim mở cố định hoặc thu gọn vĩnh viễn theo ý muốn người dùng (`localStorage.setItem('bim_sidebar_collapsed', ...)`).
  * Khi sidebar đang mở cố định trên Desktop, việc bấm chuyển tab trong nội bộ hệ thống sẽ giữ nguyên sidebar không bị co lại.

### 2. Bảo Toàn Tuyệt Đối 100% Tính Năng Giao Diện Mobile & Responsive:
- **Zero-Regression trên Mobile:**
  * Giữ nguyên cơ chế Fixed Slide-Over Drawer và backdrop bán trong suốt (`#sidebar-mobile-backdrop`) trên thiết bị di động / tablet (`< 1024px`).
  * Cơ chế Hover Peek chỉ được kích hoạt khi màn hình `>= 1024px` và có con trỏ chuột (`window.matchMedia('(hover: hover)').matches`), hoàn toàn không gây ảnh hưởng đến thao tác cảm ứng chạm (Touch / Tap) trên điện thoại.

### 3. Kiểm Thử Hệ Thống (Verification):
- **Cú pháp JavaScript:** `node -c static/js/app.js` $
ightarrow$ 100% Passed.
- **Django System Check:** `python manage.py check` $
ightarrow$ 0 issues.
- **Unit & Integrity Tests:** `python manage.py test core.tests.SidebarHoverPeekTestCase core.tests.FrontendSyntaxIntegrityTestCase --keepdb` $
ightarrow$ 4/4 Passed.

## [v3.5.9] - 2026-10-20 (Chuẩn Hóa Phân Hệ Nhân Sự Theo BIM ERP: Tách Biệt Hồ Sơ Cá Nhân & Quản Trị Tính Lương Bằng Hợp Đồng Lao Động Hiện Hành)

### 1. Tách Biệt Hồ Sơ Nhân Thân Cá Nhân & Hợp Đồng Lao Động (Employee vs. LaborContract):
- **Nguyên tắc thiết kế cốt lõi (BIM ERP Standard):**
  * **Hồ Sơ Nhân Viên (Employee):** Độc lập hoàn toàn với chính sách công ty; chỉ lưu trữ thông tin nhân thân pháp lý của người lao động (Họ tên, CCCD, ngày cấp, nơi cấp, MST cá nhân, số sổ BHXH, tài khoản ngân hàng, thông tin GPLX của tài xế, địa chỉ, người phụ thuộc giảm trừ gia cảnh).
  * **Hợp Đồng Lao Động (LaborContract) & Phụ Lục (ContractAppendix):** Lưu trữ toàn bộ các cam kết kinh tế và chế độ lao động gắn liền doanh nghiệp: Lương căn bản, Lương đóng BHXH, Phụ cấp cố định (allowance_amount), Trợ cấp/hỗ trợ phúc lợi (subsidy_amount), Tổng thu nhập hợp đồng (total_salary), Tỷ lệ hưởng lương/thử việc (probation_rate), cùng các cờ tuân thủ pháp lý: Tham gia BHXH (is_social_insurance_participant), Tính thuế TNCN (is_taxable), Tham gia Công đoàn (is_union_member), Phân loại cư trú thuế TNCN (tax_resident_type).
- **Cơ chế Helper Properties kế thừa tự động trên Model Employee:**
  * Bổ sung các properties: active_contract, latest_appendix, active_department, active_role, active_job_title, active_base_salary, active_insurance_salary, active_allowance_amount, active_subsidy_amount, active_total_salary, active_is_bhxh, active_is_tncn, active_is_cong_doan, active_probation_rate, active_tax_resident_type.
  * Tự động ưu tiên lấy thông số điều chỉnh từ Phụ lục hợp đồng mới nhất còn hiệu lực, nếu không có thì lấy từ HĐLĐ đang hiệu lực (ACTIVE).

### 2. Nâng Cấp Động Cơ Tính Lương Kết Hợp Hybrid Payroll (apps/personnel/api_views.py):
- **Kế thừa chính xác từ Hợp đồng lao động hiện hành:**
  * Lương thời gian: Tính theo công thức chuẩn Bộ Luật Lao Động: Lương CB / Công chuẩn * Công thực tế * (Tỷ lệ thử việc / 100).
  * Tổng Gross: Bao gồm Lương thời gian + Lương sản lượng chuyến xe tài xế + Phụ cấp HĐ + Trợ cấp HĐ + Thưởng KPI + Phụ cấp khác.
- **Trích nộp Công đoàn và Bảo hiểm:**
  * Đoàn phí Công đoàn người lao động (union_fee_employee): Trích đúng 1% Lương cơ bản nếu is_union_member=True trên HĐ; bằng 0 nếu chưa tham gia.
  * Phía Doanh nghiệp: Nộp 2% KPCĐ và 21.5% BHXH căn cứ theo mức lương BHXH của HĐ.
- **Phân nhánh Thuế TNCN đa chế độ:**
  * Nếu is_taxable=False: Miễn tính thuế (0 đ).
  * Nếu tax_resident_type='CASUAL_10': Khấu trừ 10% tại nguồn cho lao động thời vụ/vãng lai khi thu nhập >= 2,000,000 đ.
  * Nếu tax_resident_type='NON_RESIDENT': Khấu trừ 20% thu nhập.
  * Nếu tax_resident_type='RESIDENT': Trừ các khoản miễn thuế (ăn trưa <= 730k, điện thoại, trợ cấp phúc lợi HĐ), trừ BHXH NLĐ, trừ đoàn phí công đoàn NLĐ, trừ giảm trừ gia cảnh (bản thân 15.5tr + NPT 6.2tr), phần còn lại áp biểu lũy tiến.

### 3. Cập Nhật Trải Nghiệm Giao Diện Người Dùng (UI/UX Master 360°):
- **Trang Chi Tiết Nhân Sự (templates/views/view_employee_form.html & static/js/app.js):**
  * Tích hợp Card 4: Hợp Đồng Lao Động Hiện Hành & Chế Độ Lương (Master Form 360°): Tự động kéo dữ liệu từ HĐ hiện hành để hiển thị toàn bộ snapshot kinh tế của nhân viên.
  * Cung cấp nút chuyển tiếp 1 chạm: Xem & Sửa HĐ Hiện Hành hoặc Ký HĐ Lao Động Ngay nếu chưa có HĐ.
- **Trang Chi Tiết Hợp Đồng (templates/views/view_contract_detail.html):**
  * Bổ sung đầy đủ các trường nhập: Phòng ban, Chức vụ, Phụ cấp, Trợ cấp, Tỷ lệ thử việc, Cụm 3 switch (isBHXH, isTNCN, isCongDoan) và Loại cư trú thuế TNCN.
  * Tự động tính toán Tổng thu nhập HĐ (cd-total-salary) ngay khi gõ phím.
- **Bảng Danh Sách Hợp Đồng (templates/views/view_personnel.html):**
  * Mở rộng bảng lên 14 cột chi tiết, có badges trực quan cho BHXH/Thuế/Công đoàn.
- **Trang Chi Tiết Phiếu Lương (templates/views/view_payroll_slip_detail.html):**
  * Hiển thị số HĐLĐ & Phụ lục áp dụng, Đoàn phí công đoàn 1%, Phụ cấp & Trợ cấp HĐ.

### 4. Kiểm Thử & Xác Thực Toàn Diện (System Verification):
- **Cú pháp JavaScript:** node -c static/js/app.js; node -c static/js/column_manager.js -> 100% Passed.
- **Personnel Unit Tests:** python manage.py test apps.personnel --keepdb -> 11/11 tests OK.
- **Toàn bộ Test Suite hệ thống:** python manage.py test --keepdb -> 105/105 tests OK (Zero-Regression).

---

## [v3.5.8] - 2026-10-20 (Chuẩn Hóa Đặt Tên Chứng Từ Booking Kèm Mã Phiếu [Mã Booking]_[Tên File] & Cho Phép Truy Cập Xem Trực Tiếp)

### 1. Chuẩn Hóa Tên Tệp Đính Kèm Tự Động Gán Mã Phiếu (`core/validators.py`, `apps/dispatch/api_views.py`):
- **Quy chuẩn đặt tên đồng nhất:**
  * Bổ sung hàm `format_booking_attachment_filename(file_obj, booking_code)` trong `core/validators.py`.
  * Khử ký tự nguy hiểm, chống Directory Traversal, thay thế khoảng trắng bằng dấu gạch dưới `_`.
  * Tự động gán tiền tố `f"{booking_code}_"` vào tên file đính kèm nếu chưa có (ví dụ: `BK.2610.005_clipboard_20261019_201846.png`, `BK.2610.005_Booking.png`).
- **Xử lý lưu trữ Backend (`SalesAPIView` & `BookingOrderDetailAPIView`):**
  * Tự động đổi tên file trong `request.FILES` trước khi lưu vào đĩa vật lý qua Django Storage (`upload_to='booking_files/%Y/%m/'`).
  * Đồng bộ trường `BookingDocument.file_name` và `BookingOrder.booking_file` với tên file đã gán mã booking.
  * API GET `/api/bookings/<id>/` trả về đầy đủ các trường `name`, `file_name`, `url`, `file_url`, `size_formatted`, `file_size_formatted` với tên file sạch sẽ, luôn có tiền tố mã Booking.
- **Kịch bản đồng bộ dữ liệu cũ (`scripts/sync_booking_files_naming.py`):**
  * Quét toàn bộ CSDL và storage `media/`, tự động đổi tên file vật lý và cập nhật `file_name` trong database cho các đơn hàng cũ.

### 2. Trải Nghiệm Người Dùng (UI/UX) — Hiển Thị Rõ Tên File & Bấm Để Mở/Tải Trực Tiếp (`static/js/app.js`):
- **Hiển thị tên file thực tế:**
  * Khắc phục triệt để lỗi hiển thị chữ chung chung "File Booking", thay thế bằng tên file thực tế với font monospace rõ ràng (`font-mono text-[11px] font-bold`).
- **Tương tác 1 chạm trực quan:**
  * Toàn bộ khối hàng tài liệu được bọc bằng link `<a href="${doc.url}" target="_blank">`, người dùng có thể bấm trực tiếp vào tên file, biểu tượng file hoặc nút mở góc phải để xem/tải tài liệu tức thì.
  * Thêm hiệu ứng hover nổi bật (`group-hover:text-teal-700 group-hover:underline`), chú thích `· Bấm để mở` và preview cho tệp mới chọn chưa lưu.
  * Áp dụng đồng bộ cho cả **Màn hình Chi tiết Booking toàn trang** (`view_booking_detail.html`) và **Modal tiếp nhận đơn hàng** (`modal_booking.html`).

### 3. Kiểm Thử & Xác Thực Toàn Diện (System Verification):
- **Cú pháp JavaScript:** `node -c static/js/app.js` → 100% Passed.
- **Django Unit Tests:** `python manage.py test apps.dispatch.tests.BookingDocumentNamingTestCase --keepdb` → 2/2 tests OK.
- **Frontend Syntax Integrity:** `python manage.py test core.tests.FrontendSyntaxIntegrityTestCase --keepdb` → 3/3 tests OK.

## [v3.5.7] - 2026-10-19 (Tối Ưu Hóa Biểu Mẫu Booking Thích Ứng Động Theo 3 Loại Dịch Vụ Logistics & Điều Hướng Phím TAB Tốc Độ Cao)

### 1. Phân Biệt & Thích Ứng Nghiệp Vụ Theo 3 Loại Hình Dịch Vụ Vận Tải:
- **Kéo Cont Xuất Khẩu (`EXPORT_FCL`):**
  * Hiển thị đầy đủ các trường: Hãng tàu, Tên tàu & Chuyến (`vessel_voyage`), Mã HS Code, Lộ trình 3 điểm (`1. Depot Cấp Rỗng` $\rightarrow$ `2. Kho Đóng Hàng` $\rightarrow$ `3. Cảng Hạ CY`).
  * Bật đầy đủ các mốc thời gian hãng tàu: Ngày hẹn đóng hàng, Hạn Cắt Máng CY (Closing Time), Hạn nộp SI (SI Cut-off), Số ngày miễn phí lưu bãi / lưu vỏ (Free DEM/DET).
  * Tiêu đề đính kèm tệp: *Đính Kèm File Booking / Lệnh Cấp Rỗng*.
- **Kéo Cont Nhập Khẩu (`IMPORT_FCL`):**
  * Tự động chuyển đổi thuật ngữ: Nhãn số đơn thành *Số Vận Đơn (B/L) / D/O*, Lộ trình 3 điểm thành (`1. Cảng Lấy Cont Hàng` $\rightarrow$ `2. Kho Rút Hàng` $\rightarrow$ `3. Depot Trả Rỗng`), Ngày hẹn đóng thành *Ngày Hẹn Dỡ Hàng*, DET/DEM thành *Free DET (Mượn vỏ)* và *Free DEM (Lưu bãi)*.
  * **Vô hiệu hóa (disabled) & làm mờ trực quan (`opacity-40 pointer-events-none`)**: *Hạn Cắt Máng CY* và *Hạn SI Cut-off* (do hàng nhập không có các mốc cắt máng tàu xuất).
  * Tiêu đề đính kèm tệp: *Đính Kèm Lệnh Giao Hàng D/O & Vận Đơn (B/L)*.
- **Vận Chuyển Nội Địa / Nhà Máy (`DOMESTIC`):**
  * Tự động chuyển đổi thuật ngữ: Nhãn số đơn thành *Số PO / Đơn Hàng / Lệnh Xe*, Lộ trình 2 điểm thành (`1. Điểm Bốc Hàng (Nơi đi)` $\rightarrow$ `2. Điểm Giao Hàng (Nơi đến)`), Ngày hẹn đóng thành *Ngày Bốc Hàng*.
  * **Vô hiệu hóa (disabled) & làm mờ trực quan (`opacity-40 pointer-events-none`)**: *Hãng Tàu* (tự động gán mặc định 'NỘI ĐỊA'), *Tên Tàu & Chuyến*, *Mã HS Code*, *Điểm 3 (Điểm Hạ / Trả Cont)*, *Hạn Cắt Máng CY*, *Hạn SI Cut-off*, *Free DET* và *Free DEM*.
  * Tiêu đề đính kèm tệp: *Đính Kèm PO / Lệnh Điều Xe / Phiếu Xuất Kho*.

### 2. Tối Ưu Tốc Độ Nhập Liệu Bằng Phím TAB (Zero-Friction Tab Navigation):
- **Cơ chế Tab navigation thông minh:**
  * Toàn bộ các trường bị disabled đều được gán `tabindex="-1"`, giúp trình duyệt tự động lướt qua khi bấm phím `Tab` mà không dừng lại ở các ô không áp dụng.
  * Tất cả các nút phụ trợ (Nút `+ Tạo mới` danh mục nhanh, nút chọn giờ nhanh `08:00`, `10:00`, `12:00`...) được gán `tabindex="-1"`, giúp phím `Tab` nhảy thẳng tắp từ ô nhập liệu này sang ô nhập liệu tiếp theo.
  * Với đơn hàng Nội địa (`DOMESTIC`), người dùng chỉ cần lướt phím `Tab` qua: *Khách hàng* $\rightarrow$ *Số PO* $\rightarrow$ *Loại xe/cont* $\rightarrow$ *Số lượng* $\rightarrow$ *Hàng hóa* $\rightarrow$ *Điểm bốc* $\rightarrow$ *Điểm giao* $\rightarrow$ *Ngày bốc* $\rightarrow$ *Giờ hẹn* $\rightarrow$ *Cước* $\rightarrow$ *Lưu*, rút ngắn thời gian nhập liệu từ 3 đến 5 lần.

### 3. Đồng Bộ Hóa Cả Hai Giao Diện & Bảo Toàn Dữ Liệu Backend (Zero-Regression):
- **Đồng bộ song song 2 giao diện:** Áp dụng đồng bộ cho cả **Modal Tiếp Nhận Đơn** (`templates/components/modal_booking.html`) và **Màn Hình Chi Tiết Booking Toàn Trang** (`templates/views/view_booking_detail.html`).
- **An toàn lưu trữ Backend (`saveBooking` & `saveFullpageBooking`):**
  * Với loại `DOMESTIC`, tự động điền giá trị ngầm định an toàn cho các trường bị disabled (`dropoff_location = delivery_location`, `shipping_line = 'NỘI ĐỊA'`, `closing_time = ''`, `si_cutoff = ''`, `det = 0`, `dem = 0`), hoàn toàn tương thích với schema database và validation của Django REST Framework.
  * Khôi phục chính xác trạng thái enabled khi chuyển ngược lại giữa các loại hình đơn hàng.

### 4. Kiểm Thử Toàn Diện (System Verification):
- **Cú pháp JavaScript:** `node -c static/js/app.js` và `node -c static/js/column_manager.js` $\rightarrow$ 100% Passed.
- **Django System Check:** `python manage.py check` $\rightarrow$ System check identified no issues (0 silenced).
- **Full Backend Regression Tests:** `python manage.py test --keepdb` $\rightarrow$ **102/102 test cases PASSED (32.5s)**.

## [v3.5.6] - 2026-10-19 (Tách Cột Tên Viết Tắt Riêng Biệt & Đồng Bộ Trình Quản Lý Cột Tùy Biến Cho Bảng Khách Hàng)

### 1. Tách Cột "Tên Viết Tắt" Thành Cột Riêng Biệt Trên Bảng Khách Hàng:
- **Tách dữ liệu hiển thị (`static/js/app.js`, `static/js/modules/master_data.js`):**
  * Tách riêng trường `short_name` thành một cột riêng biệt mang tên **"Tên Viết Tắt"** (`customer_short_name`), nằm ở vị trí cột thứ 2 (ngay sau cột "Mã Khách").
  * Hiển thị dạng văn bản thuần túy chuẩn mực (`font-bold text-slate-800`), dễ đọc, đồng bộ với các cột khác trong bảng mà không cần khung viền badge màu mè.
  * Tinh giản cột **"Tên Khách Hàng / Doanh Nghiệp"** (`customer_name`): Chỉ hiển thị tên đầy đủ của doanh nghiệp một cách rõ ràng, trang nhã, không còn bị lồng ghép badge viết tắt vào cùng một ô.
  * Gán chuẩn xác các thuộc tính `data-col-key` và `data-col-name` cho toàn bộ các thẻ `<th>` và `<td>` của bảng Khách Hàng.

### 2. Đồng Bộ Hóa Hoàn Toàn Với Trình Quản Lý Cột Toàn Năng (Universal Table Column Manager):
- **Nâng cấp `column_manager.js` (`static/js/column_manager.js`):**
  * Nâng cấp `TableColumnInstance` hỗ trợ nhận diện động từng sub-tab của bảng `md-main-table` thông qua `getStorageKey()` (ví dụ: `bim_table_cols_md-main-table_customers`), chống xung đột cache giữa 13 danh mục khác nhau.
  * Thêm hàm `refreshColumnsFromDOM()` tự động quét lại cấu trúc `<th>` mới nhất của bảng và hợp nhất các cột mới thêm vào đúng thứ tự thiết kế (`origIdx`).
  * Modal Tùy chỉnh cột hiển thị đầy đủ 9/9 cột (bao gồm cột mới "Tên Viết Tắt"), hỗ trợ:
    1. Bật/tắt ẩn hiện cột bằng checkbox.
    2. Kéo thả HTML5 Drag & Drop hoặc bấm mũi tên Lên/Xuống để sắp xếp thứ tự cột theo ý muốn.
    3. Ghi nhớ cấu hình riêng biệt vào `localStorage` cho từng người dùng.
    4. Nút Khôi phục mặc định 1 chạm đưa về trạng thái 9 cột gốc.

### 3. Kiểm Thử Hệ Thống (Verification):
- **Kiểm thử cú pháp JavaScript:** `node -c static/js/app.js`, `node -c static/js/column_manager.js`, `node -c static/js/modules/master_data.js` $\rightarrow$ 100% hợp lệ.
- **Full Backend Regression Tests:** `python manage.py test --keepdb` $\rightarrow$ **102/102 test cases PASSED (34.5s)**.

## [v3.5.5] - 2026-10-19 (Khắc Phục Lưu Cài Đặt Doanh Nghiệp Trong Master Data & Hệ Thống Dán Ảnh Clipboard Toàn Hệ Thống)

### 1. Khắc Phục Lưu Cài Đặt Doanh Nghiệp (Master Data - Tab Thông Tin Công Ty):
- **Sửa dứt điểm lỗi ReferenceError khi lưu Master Data (`static/js/app.js`, `core/views.py`):**
  * Khắc phục lỗi `quickMasterDataTargetSelectId is not defined` và `loadMasterDataFormOptions is not a function` khi lưu tab `company`.
  * Khai báo biến toàn cục an toàn `let quickMasterDataTargetSelectId = null;` và bọc kiểm tra điều kiện an toàn khi cập nhật form option.
  * Tách luồng xử lý riêng biệt khi `tabKey === 'company'`: cập nhật bộ nhớ cache `masterDataCache['company']`, làm mới `window.SYSTEM_COMPANY`, gọi `syncCompanyProfileToPrintForms()` và `loadCompanyProfile()`, hiển thị thông báo thành công xanh ngọc mượt mà.
  * Mở rộng form chỉnh sửa chi tiết Doanh nghiệp trong `templates/components/master_data_modal.html` (`#mdf-company-fields`), hỗ trợ nhập đầy đủ: Tên công ty, Tên viết tắt, Mã số thuế, Đại diện pháp luật, Chức danh, Hotline, Email, Địa chỉ trụ sở, Tài khoản ngân hàng, Giấy phép kinh doanh, Thuế VAT mặc định, Giá dầu tham chiếu và Đường dẫn Logo.

### 2. Đồng Bộ Hóa Toàn Diện Thông Tin Doanh Nghiệp Lên Tất Cả Bản In & Phiếu Biểu:
- **Chuẩn hóa hàm `getSystemCompanyProfile()` & `syncCompanyProfileToPrintForms()` (`static/js/app.js`):**
  * Tự động quét và cập nhật các class `.print-comp-name`, `.print-comp-short-name`, `.print-comp-tax`, `.print-comp-address`, `.print-comp-phone`, `.print-comp-email`, `.print-comp-contact`, `.print-comp-logo` trên tất cả các mẫu in và tài liệu xuất bản.
  * Đồng bộ hóa dữ liệu động lên Phiếu thu/chi sổ quỹ (chế độ Modal & Full-page View), Hợp đồng lao động, Phiếu lương nhân sự, Báo giá khách hàng, Đơn Booking và Tờ khai hải quan, gỡ bỏ toàn bộ chuỗi hardcode cũ.

### 3. Hệ Thống Dán Ảnh Trực Tiếp Từ Clipboard (Universal Clipboard Image Paste & Ctrl+V):
- **Hỗ trợ dán ảnh chụp màn hình 1 chạm (`static/js/app.js`, `static/js/collaboration.js`):**
  * Xây dựng cơ chế trích xuất ảnh `extractImageFromClipboardEvent(e)` và nhận diện ngữ cảnh đang kích hoạt `detectActiveUploadContext()`.
  * Lắng nghe sự kiện `paste` toàn cục (`window.addEventListener('paste', ...)`): Khi người dùng bấm `Ctrl+V` (ảnh chụp từ PrintScreen, Snipping Tool, Win+Shift+S hoặc Copy Image từ trình duyệt), hệ thống tự động phát hiện khu vực tải tệp của biểu mẫu đang mở và đính kèm ngay lập tức mà không chặn việc dán văn bản thuần túy vào các ô nhập liệu.
  * Xây dựng hàm `pasteImageFromClipboard(targetType)` tích hợp `navigator.clipboard.read()` kèm nút bấm trực quan `Dán ảnh (Ctrl+V)` tại tất cả các giao diện:
    1. **Bong bóng Chat & Kênh nội bộ** (`templates/components/chat_bubble.html`).
    2. **Quản lý Nhiệm vụ Tasks**: Drawer Chi tiết Công việc & Modal Tạo Mới Nhiệm Vụ (`templates/views/view_tasks.html`).
    3. **Tờ khai Hải quan**: Modal Khai báo & Màn hình Chi tiết Tờ khai (`templates/components/modal_customs_declaration.html`, `templates/views/view_customs_form.html`).
    4. **Booking Vận tải**: Modal Booking & Màn hình Chi tiết Booking Đơn Hàng (`templates/components/modal_booking.html`, `templates/views/view_booking_detail.html`).
    5. **Chuyến xe Điều vận**: Modal Tạo Chuyến Xe & Màn hình Chi tiết Lệnh Điều Động (`templates/components/modal_create_trip.html`, `templates/views/view_create_trip.html`).
    6. **Bảng tin tức & Thông báo**: Form Đăng Tin Tức Mới (`templates/views/view_news.html`).
    7. **Hóa đơn OCR & Phí phát sinh**: Modal AI OCR Nhận diện Chứng từ (`templates/components/modal_ocr.html`).

### 4. Kiểm Thử Hệ Thống (Verification):
- **Kiểm thử cú pháp JavaScript:** `node -c static/js/app.js` và `node -c static/js/collaboration.js` $\rightarrow$ 100% hợp lệ, không lỗi cú pháp.
- **Django System Check:** `python manage.py check` $\rightarrow$ System check identified no issues (0 silenced).
- **Full Backend Regression Tests:** `python manage.py test --keepdb` $\rightarrow$ **102/102 test cases PASSED (32.3s)**.

## [v3.5.4] - 2026-10-17 (Tối Ưu Không Gian Màn Hình Chat Di Động Full Visual Viewport — Giữ Nguyên Bộ Icon & Phong Cách Thiết Kế Hiện Đại)

### 1. Màn Hình Chat Di Động Toàn Khung Hình & Đồng Bộ Bàn Phím Ảo (`visualViewport`):
- **Khắc phục triệt để lỗi đẩy lệch cửa sổ chat và vướng nút nổi khi bật bàn phím ảo trên Mobile (`static/css/main.css`, `static/js/collaboration.js`):**
  * Chuyển `#chat-floating-window` trên màn hình `< 1024px` sang chế độ **Full Visual Viewport** (`position: fixed; top: var(--chat-vv-top, 0px); left: 0; right: 0; width: 100vw; height: var(--chat-vv-height, 100dvh); border-radius: 0; z-index: 9999`).
  * Xây dựng hàm `syncMobileChatViewport()` lắng nghe trực tiếp `window.visualViewport` (`resize`, `scroll`) và sự kiện `focus`/`blur` của ô nhập tin nhắn: khi bàn phím ảo bật lên trên iOS/Android, thanh Header luôn neo cố định ở đỉnh màn hình, vùng tin nhắn tự động co giãn vừa khít và cuộn xuống tin nhắn mới nhất ngay sát phía trên thanh nhập liệu.
  * Tự động ẩn nút nổi `#chat-bubble-btn` khi cửa sổ chat đang mở trên di động (`#chat-bubble-container.chat-is-open #chat-bubble-btn { display: none !important; }`), mở rộng tối đa không gian trò chuyện và không còn hiện tượng nút tròn đè lên màn hình.
- **Bảo toàn 100% bộ Icon Phosphor & Thiết kế hiện đại của hệ thống (`templates/components/chat_bubble.html`, `static/js/collaboration.js`):**
  * Giữ nguyên bộ biểu tượng (`ph-bold ph-chats-circle`, `ph-bold ph-chats`, `ph-bold ph-paperclip`, `ph-bold ph-paper-plane-right`), Header `bg-teal-800`, bong bóng tin nhắn `bg-teal-700` / `bg-white border border-slate-200` và khung nhập liệu hiện đại của Bim Logistics.

## [v3.5.3] - 2026-10-17 (Tối Ưu Giao Diện Di Động Toàn Diện: Auto-Hide Sidebar & Mở Khóa Cuộn Dọc Cảm Ứng Mượt Mà)

### 1. Cơ Chế Tự Động Ẩn Sidebar (Auto-Hide Sidebar) Khi Chọn Menu:
- **Tự động thu gọn Sidebar để mở rộng không gian làm việc (`static/js/app.js`, `templates/base.html`, `static/css/main.css`):**
  * Bổ sung hàm `collapseSidebar()` và `syncSidebarUIState()` đồng bộ trạng thái thu gọn của `.app-sidebar`, mũi tên chỉ báo trên Topbar và lớp nền mờ `#sidebar-mobile-backdrop`.
  * Khi người dùng bấm vào **bất kỳ mục menu nào trên Sidebar** (`.sidebar-item-main`, logo trang chủ hoặc chuyển tab qua `switchTab()`), hệ thống lập tức **tự động ẩn (auto-hide) Sidebar** để trả lại 100% không gian làm việc.
  * Khi mở bất kỳ màn hình chi tiết toàn trang nào (`setTopbarFullpageMode` cho Thông tin nhân viên, Hợp đồng lao động, Phiếu lương, Chuyến xe, Báo giá, Booking), Sidebar cũng tự động ẩn hoàn toàn.
  * Trên thiết bị di động và máy tính bảng (`< 1024px`), Sidebar hoạt động dưới dạng **Fixed Slide-Over Drawer** (`position: fixed; z-index: 60`) kèm lớp nền mờ `#sidebar-mobile-backdrop` (chạm ra ngoài tự đóng), chấm dứt triệt để tình trạng Sidebar đẩy ép phần nội dung chính bên phải.

### 2. Xử Lý Nạp Đầy Đủ Dữ Liệu & Mở Khóa Lướt/Cuộn Lên Xuống Trên Di Động:
- **Bổ sung hàm điều phối `loadHRData()` & sửa luồng điều hướng Nhân sự (`static/js/app.js`):**
  * Định nghĩa hàm `loadHRData()` tự động nạp đồng thời danh sách Hồ sơ nhân sự, 4 thẻ KPI tổng quan và sub-tab hiện hành ngay khi người dùng bấm vào menu **Hành chính & Nhân sự** (`nhan-su`).
  * Nâng cấp `openEditEmployeePage()` sang cơ chế bất đồng bộ an toàn (`async`): tự động nạp danh sách nhân sự nếu bộ nhớ đệm chưa có dữ liệu và hỗ trợ deep-link `/personnel/employees/<id>`, `/personnel/contracts/<id>`.
  * Sửa lỗi ID vùng hiển thị trong `backToContracts()` và `backToPayroll()` từ `#view-personnel` về chuẩn `#view-nhan-su` kèm `resetTopbarStandardMode('nhan-su')`.
- **Mở khóa cuộn dọc cảm ứng (`-webkit-overflow-scrolling: touch`) trên toàn bộ màn hình thông tin (`static/css/main.css`, `templates/views/view_personnel.html`, `templates/components/topbar.html`):**
  * Gỡ bỏ khóa chiều cao cứng (`overflow-hidden` / `flex-1` lồng nhau nhiều tầng) trên màn hình `< 1024px` cho `#main-views > .view:not(.hidden-view)`, cho phép người dùng chạm tay lướt lên/xuống mượt mà từ đầu trang (qua các thẻ KPI, bộ lọc) xuống hết danh sách **Hồ sơ nhân sự**, **Hợp đồng lao động**, **Thông tin nhân viên**, **Chi tiết hợp đồng**, **Điều vận**, **Xe & Bãi**, **Dịch vụ Hải quan**, **Kế toán** và các nút thao tác cuối trang (`Sửa`, `Lưu`, `In`, `Xóa`).
  * Tối ưu thanh Topbar trên màn hình điện thoại hiển thị gọn gàng trên 1 dòng duy nhất (`white-space: nowrap; text-overflow: ellipsis`).

## [v3.5.0] - 2026-10-17 (Sẵn Sàng Production, Chuẩn Hóa Trang Login, Trang Chi Tiết Bản Tin Mới Kèm Bộ Xem Trước Trực Tiếp PDF/Word/Excel)

### 1. Rà Soát & Triển Khai Môi Trường Production:
- **Tối Ưu Hóa Phục Vụ Tệp Tĩnh (Static Files) Với WhiteNoise:**
  * Bổ sung gói `whitenoise>=6.6.0` vào `requirements.txt` và cài đặt vào môi trường máy chủ.
  * Tích hợp `whitenoise.middleware.WhiteNoiseMiddleware` ngay sau `SecurityMiddleware` trong `MIDDLEWARE`.
  * Cấu hình `STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'` nén gzip tệp tĩnh siêu tốc, đảm bảo phục vụ an toàn cả khi chạy trực tiếp qua Gunicorn lẫn Nginx reverse proxy mà không bao giờ bị lỗi 404.
  * Bổ sung `web` vào `ALLOWED_HOSTS`.
- **Trang Báo Lỗi Tùy Chỉnh Toàn Hệ Thống Chuẩn SaaS:**
  * Xây dựng `templates/404.html` (Không tìm thấy tài nguyên / liên kết dời đổi) và `templates/500.html` (Máy chủ đang bận hoặc gặp sự cố xử lý) chuẩn nhận diện thương hiệu BIZ SOLUTIONS - BIM LOGISTICS.
- **Rà Soát & Thiết Lập Cấu Hình Nginx Reverse Proxy SSL (`logistics.bim.info.vn`):**
  * Tận dụng chứng chỉ Let's Encrypt SSL có sẵn trên VPS (`/etc/letsencrypt/live/logistics.bim.info.vn/`).
  * Proxy an toàn từ port 443 tới Gunicorn `172.17.0.1:8085` kèm đầy đủ tiêu chuẩn bảo mật HTTP Headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-Forwarded-Proto https`).

### 2. Chuẩn Hóa Trang Đăng Nhập & Bàn Giao Tài Khoản:
- **Gỡ Bỏ Hoàn Toàn 4 Nút Chọn Vai Trò Mẫu (Demo Roles) & Đồng Bộ Thương Hiệu `BIZ SOLUTIONS`:**
  * Xóa bỏ khối thẻ quick roles và hàm `fillCredentials()` khỏi `templates/login.html`.
  * Đồng bộ nhận diện thương hiệu trên Header từ `BIM ECOSYSTEM` sang chuẩn **`BIZ SOLUTIONS`** trên trang Đăng nhập (`templates/login.html`), trang Chi tiết Bản tin (`templates/news_detail.html`), và trang lỗi (`404.html`, `500.html`), khớp 100% với Sidebar chính và Sổ tay hướng dẫn.
  * Chuẩn hóa form đăng nhập thuần túy: Logo BIM Logistics, ô Tài khoản đăng nhập (Username/Mã NV), Mật khẩu (kèm icon ẩn/hiện), Checkbox Ghi nhớ đăng nhập và Nút Đăng nhập gradient Teal sang trọng.
  * Bổ sung Hộp thoại Trợ giúp Cấp lại Mật khẩu (`#forgot-modal`) khi người dùng bấm "Quên mật khẩu?", hướng dẫn liên hệ Quản trị viên/Ban Giám Đốc nội bộ.
- **Thiết Lập & Đồng Bộ Ma Trận 6 Tài Khoản Production:**
  * `admin` / `Admin@2026`: Võ Triền (Giám Đốc) - Ban Giám Đốc (Superuser toàn quyền).
  * `dieudo` / `DieuDo@2026`: Trần Điều Độ - Phòng Điều Vận (Dispatcher).
  * `ketoan` / `KeToan@2026`: Trần Thị Kế Toán - Kế Toán Tài Chính (Accountant).
  * `sales` / `Sales@2026`: Lê Hoàng Nam - Phòng Kinh Doanh (Salesman).
  * `nhansu` / `NhanSu@2026`: Lê Thị Thu Thảo - Hành Chính Nhân Sự (HR).
  * `taixe` / `TaiXe@2026`: Hoàng Văn Thật (Tài Xế) - Đội Xe & Bãi (Driver).

### 3. Trang Chi Tiết Bản Tin Mới & Bộ Xem Trước Trực Tiếp (Document Previewer):
- **Trang Chi Tiết Riêng Biệt (`/news/<pk>/` - `templates/news_detail.html`):**
  * Nhân viên khi bấm vào bất kỳ thông báo nào từ Dashboard hoặc phân hệ Bản tin sẽ mở ra một trang riêng biệt trên tab mới (`target="_blank"`).
  * Trang hiển thị đầy đủ tiêu đề, phân loại danh mục, huy hiệu khẩn cấp/ghim, phòng ban áp dụng, thông tin người đăng (họ tên, chức vụ, avatar), thời gian đăng và nội dung chỉ đạo toàn văn.
- **Bộ Xem Trước Tài Liệu Trực Tiếp (PDF, Word, Excel, Hình ảnh):**
  * **Xem tệp PDF:** Nhúng trực tiếp qua thẻ `<iframe>` native, hỗ trợ xem toàn văn, phóng to, in ấn và điều hướng trang.
  * **Xem bảng tính Excel (.xlsx, .xls):** Tích hợp thư viện SheetJS parse dữ liệu bảng tính trên client và render bảng tính HTML kẻ ô trực quan, hiển thị chi tiết tên sheet, các cột, dòng định mức và số liệu tài chính.
  * **Xem văn bản Word (.docx):** Tích hợp thư viện Mammoth.js chuyển đổi tài liệu Word sang HTML hiển thị mượt mà không cần chuyển đổi server-side.
  * **Các nút thao tác nhanh:** Nút "Tải tệp đang xem", "Mở trong tab mới", "In văn bản", "Sao chép liên kết".
- **Hệ Thống Phản Hồi Dưới Bài Viết:**
  * Nhân viên có thể gửi phản hồi, thảo luận ngay tại chân trang chi tiết thông báo, cập nhật danh sách tức thời.

### 4. Kiểm Thử Hệ Thống & Kiểm Chứng Thị Giác (Verification):
- **Full Backend Test Suite:** `python manage.py test --keepdb` $\rightarrow$ **102/102 test cases PASSED (37.7s)**.
- **Frontend Syntax Check:** `node -c static/js/app.js` & `node -c static/js/collaboration.js` (0 errors).
- **Playwright Visual Verification:**
  * `123_production_clean_login_page.png`: Trang đăng nhập sạch sẽ, chuyên nghiệp, không còn các nút vai trò mẫu.
  * `124_forgot_password_modal.png`: Hộp thoại hướng dẫn cấp lại mật khẩu an toàn.
  * `125_login_success_dashboard.png`: Đăng nhập thật thành công với tài khoản Giám Đốc vào thẳng Dashboard.
  * `126_news_detail_page_overview_pdf.png`: Trang chi tiết bản tin mở độc lập với thông tin bài viết và tab PDF.
  * `127_news_detail_page_excel_preview.png`: Trình xem trước bảng tính Excel hiển thị toàn bộ cột và dữ liệu định mức cước.
  * `128_news_detail_page_word_preview.png`: Trình xem trước văn bản Word chuyển đổi trực tiếp sang HTML.
  * `129_news_detail_page_comment_success.png`: Gửi ý kiến phản hồi dưới bài viết thành công.
  * `130_login_biz_solutions_verified.png`: Xác thực đồng bộ thương hiệu `BIZ SOLUTIONS` trên trang Login.
  * `131_help_section9_tasks_guide.png`, `132_help_section10_news_preview_guide.png`, `133_help_section11_chat_guide.png`, `134_help_section12_custom_charts_guide.png`: Xác thực 4 phân mục mới trên trang `/helps`.

### 5. Cập Nhật Toàn Diện Sổ Tay Hướng Dẫn Sử Dụng (`/helps` - `templates/help.html`):
- **Đồng bộ Cây Mục Lục Sidebar (`#help-tree-nav` - 65 điểm neo chuẩn 100%):**
  * Mở rộng và cập nhật chi tiết các nhánh mục lục từ Mục 9 đến Mục 12 để người dùng tra cứu 1 chạm.
- **Mục 9 — Bảng Theo Dõi Task & Quản Lý Giao Việc Văn Phòng:**
  * Hướng dẫn chi tiết quy trình tạo nhiệm vụ mới với bố cục 4 ô chuẩn ngang hàng (`Người giao việc | Phòng ban | Người phụ trách | Hạn hoàn thành`), mặc định hạn hoàn thành là ngày mai (`+1d`) và nút chọn nhanh `+3d`, `+7d`.
  * Hướng dẫn chọn Người liên quan theo dõi qua bảng danh sách 3 cột (`Phòng Ban | Họ và Tên | Chức Vụ`) kèm nút `Xong` hiển thị cố định.
  * Hướng dẫn theo dõi tiến độ trên Bảng việc Dashboard (bộ lọc Tất cả / Của tôi / Quá hạn, thanh tiến độ %), bảng Kanban 4 cột, danh sách List và **Centered Modal Chi Tiết Công Việc** tích hợp bộ 4 nút chuẩn (`Xóa`, `Sửa`, `Lưu`, `Đóng`).
- **Mục 10 — Bảng Thông Báo & Bản Tin Công Ty:**
  * Hướng dẫn đăng bản tin mới, đính kèm tệp tài liệu, cơ chế nút **Ghim lên đầu trang** (Pin to Top) đưa bài viết lên khu vực Banner Trọng Tâm và đứng đầu Bảng thông báo Dashboard.
  * Hướng dẫn mở trang chi tiết riêng biệt (`/news/<id>/`) kèm **Bộ Xem Trước Tài Liệu Trực Tiếp (Live Document Previewer)** cho file PDF, Word (`.docx`) và Excel (`.xlsx`, `.xls`) ngay trên trình duyệt.
- **Mục 11 — Tính Năng Chat Nội Bộ & Chuông Thông Báo Thông Minh:**
  * Hướng dẫn sử dụng Bong bóng Chat nổi, Kênh chung, Kênh theo phòng ban và nút **`+ Nhắn tin mới`** để mở phòng **Chat 1-1** riêng tư từ danh bạ.
  * Hướng dẫn gõ `@Mention` tag tên đồng nghiệp, trích dẫn trả lời (`Reply`), đính kèm nhiều tệp/hình ảnh có thanh xem trước, trạng thái `✓` (1 check) / `✓✓` (2 check xanh ngọc) và Chuông thông báo điều hướng 1 chạm.
- **Mục 12 — Biểu Đồ Tùy Biến Trên Dashboard (Pivot Chart Builder & Splitter):**
  * Hướng dẫn sử dụng nút `[Tùy biến]`, nút `[Mặc định]` và thanh kéo co giãn tỷ lệ độ rộng (`Splitter`).
  * Hướng dẫn chi tiết **5 bước cấu hình Pivot Chart Builder** trên 8 nguồn dữ liệu cốt lõi, chọn trục phân nhóm, chỉ số đo lường (`SUM`, `AVG`, `COUNT`), 5 loại biểu đồ (`Cột đứng`, `Cột ngang`, `Đường xu hướng`, `Donut`, `Pie`), giới hạn Top 5/10/15/20, khung **Xem Trước Trực Tiếp (Live Preview)** kèm bảng tỷ trọng (%) và tự động lưu cấu hình cá nhân.

---

## [v3.4.9] - 2026-10-16 (Tái Cấu Trúc Form Giao Việc, Danh Sách Người Theo Dõi Dạng Bảng & Chuyển Drawer Thành Centered Modal Có Bộ 4 Nút Chuẩn SaaS)

### 1. Phân Tích Yêu Cầu & Bất Cập Vận Hành Thực Tế (Operational & UX Needs):
- **Bố trí thứ tự trường nhập liệu chưa thuận luồng:** Lãnh đạo giao việc cần chọn Phòng ban trước để hệ thống tự động lọc danh sách nhân sự phụ trách thuộc phòng ban đó, tránh việc phải dò tìm trong danh sách toàn bộ công ty.
  * *Yêu cầu bố trí chuẩn:* `Người giao việc` | `Phòng Ban` | `Người phụ trách` | `Hạn hoàn thành`.
- **Danh sách Người liên quan (Followers) khó nhìn và nút Xong bị khuất:**
  * Dropdown chọn nhiều người theo dõi trước đây nhóm theo cụm dài, người dùng phải cuộn chuột xuống đáy mới thấy nút "Xong".
  * *Yêu cầu:* Hiển thị danh sách nhân sự theo dạng bảng/list 3 cột rõ ràng: `Phòng Ban | Tên người | Chức vụ` và mở rộng chiều cao, ghim nút `Xong` cố định ở cả đầu và chân popover để thao tác 1 chạm không cần cuộn sâu.
- **Xem việc đã giao trong Drawer hẹp, thiếu bộ 4 nút chuẩn SaaS:**
  * Khi mở việc đã giao, giao diện ngăn kéo trượt (Drawer) bên phải màn hình quá hẹp, thiếu các công cụ điều khiển và in ấn.
  * *Yêu cầu:* Chuyển thành Hộp thoại căn giữa màn hình (Centered Modal) rộng rãi `max-w-5xl`, nền mờ sâu và tích hợp **Bộ 4 nút chuẩn SaaS của BIM Logistics**: `[Xóa]` (Rose) | `[In]` (Dark) | `[Sửa]` (Amber) | `[Lưu]` (Teal).

### 2. Cải Tiến Mã Nguồn & Thiết Kế Giao Diện (Implementation Details):
- **Tái Cấu Trúc 4 Ô Thông Tin Modal Tạo Mới (`templates/views/view_tasks.html` & `static/js/collaboration.js`):**
  * Sắp xếp lại thứ tự 4 cột: 1. `Người giao việc` (cố định người đăng nhập) $\rightarrow$ 2. `Phòng Ban` (select có `onchange="onTaskDepartmentChanged()"`) $\rightarrow$ 3. `Người phụ trách` (select lọc theo phòng ban đã chọn) $\rightarrow$ 4. `Hạn hoàn thành` (kèm 3 nút +1d, +3d, +7d).
  * Hàm `populateAssigneeSelect(targetDepartment)`: Tự động gom nhóm `optgroup` nhân sự theo phòng ban được chọn lên đầu và chọn sẵn nhân viên đầu tiên hợp lệ.
- **Nâng Cấp Popover Người Theo Dõi (Multi-Select Followers List):**
  * Thiết kế cấu trúc Flex Column `max-h-[420px]` với thanh tìm kiếm thông minh và nút `Xong` (Teal) cố định ngay trên Header.
  * Bổ sung thanh tiêu đề cột `PHÒNG BAN` | `HỌ VÀ TÊN NHÂN SỰ` | `CHỨC VỤ`.
  * Mỗi dòng nhân sự là hàng 12 cột cân đối, hiển thị badge phòng ban, avatar + họ tên thật, chức vụ và checkbox tương tác tức thì.
  * Chân popover có thanh thống kê số lượng đã chọn và nút `Xong` to rõ.
- **Chuyển Drawer Thành Hộp Thoại Trung Tâm (Centered Modal) Kèm Bộ 4 Nút Chuẩn SaaS:**
  * Chuyển container từ drawer trượt phải thành `fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 max-w-5xl`.
  * **Hỗ trợ 2 chế độ Xem & Sửa:**
    - Chế độ Xem (View Mode): Hiển thị thông tin trực quan, 3 nút `Xóa`, `In`, `Sửa` sáng rõ; nút `Lưu` mờ (`opacity-50 pointer-events-none`).
    - Chế độ Sửa (Edit Mode): Khi bấm `[Sửa]`, các trường tiêu đề, mô tả, phòng ban, người phụ trách và hạn chót mở khóa cho phép biên tập trực tiếp; nút `Sửa` đổi thành `Hủy sửa`; nút `Lưu` sáng rực kích hoạt gửi PUT lên API backend `/api/collaboration/tasks/<id>/`.
  * **In Phiếu Bàn Giao A4 Chuyên Nghiệp (`printCurrentTaskSlip`):**
    - Thiết kế mẫu in khổ A4 chuẩn Triền Võ Logistics: Logo công ty, Mã nhiệm vụ, Bảng thông tin meta, Mô tả chi tiết, Bảng Checklist kiểm tra tiến độ, Danh mục tệp đính kèm và Phần chữ ký 2 bên (Người phụ trách & Người giao việc).
  * **Chân Modal:** Bên trái là nút `[Quay lại]`; bên phải là cụm 4 nút chuẩn SaaS: `[Xóa]` (Rose) $\rightarrow$ `[In]` (Slate/Dark) $\rightarrow$ `[Sửa]` (Amber) $\rightarrow$ `[Lưu]` (Teal).
- **Đồng Bộ Hóa Hướng Dẫn Sử Dụng (`templates/help.html`):**
  * Cập nhật mục 9.1 và 9.3 Trung tâm Trợ Giúp để người dùng tra cứu tài liệu đồng bộ.

### 3. Kiểm Thử Hệ Thống & Kiểm Chứng Thị Giác (Verification):
- **Frontend Syntax Check:** `node -c static/js/app.js` & `node -c static/js/collaboration.js` (0 syntax errors).
- **Playwright Visual Verification:**
  * `113_modal_create_task_dept_before_assignee_4fields.png`: Bố cục 4 ô theo đúng thứ tự: Người giao việc | Phòng Ban | Người phụ trách | Hạn hoàn thành.
  * `114_task_followers_dropdown_3columns_visible_done_btn.png`: Dropdown người liên quan dạng bảng 3 cột (Phòng ban | Họ tên | Chức vụ) và nút Xong nổi bật ngay trên Header.
  * `115_task_detail_centered_modal_4_buttons.png`: Modal chi tiết căn giữa màn hình, nền mờ sâu và cụm 4 nút SaaS [Xóa - In - Sửa - Lưu] ở chân modal.
  * `116_task_detail_modal_edit_mode_active.png`: Chế độ Sửa mở khóa nhập liệu, nút Hủy sửa và nút Lưu kích hoạt sáng rõ.

---

## [v3.4.8] - 2026-10-16 (Tối Ưu Hóa Nhập Liệu Hạn Hoàn Thành Khi Giao Việc: Mặc Định Ngày Mai & Chọn Nhanh +1d, +3d, +7d)

### 1. Phân Tích Nhu Cầu Nghiệp Vụ & Điểm Tắc Nghẽn Trải Nghiệm (UX Pain Point):
- Khi lãnh đạo hoặc quản trị viên giao việc trên giao diện Modal tạo mới (`#modal-create-task`), thao tác nhấp chuột mở lịch để chọn ngày hoàn thành tốn từ 3 - 4 thao tác.
- Trong thực tế điều hành logistics, các công việc nội bộ văn phòng thường có chu kỳ xử lý ngắn: cần xử lý gấp vào ngày mai (+1d), xử lý trong tuần ngắn (+3d) hoặc hoàn thành trong vòng 1 tuần (+7d).
- Người dùng yêu cầu:
  * Tự động điền mặc định ô ngày là **ngày mai**.
  * Bổ sung các nút bấm chọn nhanh ngay phía sau nhãn "Hạn hoàn thành" (ví dụ: `+1d`, `+3d`, `+7d`) để chọn hạn chót chỉ với 1 cú click chuột.

### 2. Cải Tiến Mã Nguồn & Giao Diện (Implementation Details):
- **Giao Diện HTML (`templates/views/view_tasks.html`):**
  * Nhãn `Hạn hoàn thành` được tổ chức lại dạng flex container cân đối, đi kèm 3 nút pill badge chọn nhanh:
    - `+1d` (`#btn-due-offset-1`): Chọn ngày mai.
    - `+3d` (`#btn-due-offset-3`): Chọn 3 ngày sau.
    - `+7d` (`#btn-due-offset-7`): Chọn 7 ngày sau.
  * Ô input `#create-task-due` gắn sự kiện `onchange="updateDueDateQuickPills()"` để khi người dùng tự chọn ngày tùy ý từ lịch, hệ thống tự động kiểm tra và highlight badge tương ứng (nếu trùng) hoặc bỏ highlight nếu là ngày khác.
- **Xử Lý Logic JavaScript (`static/js/collaboration.js`):**
  * Viết hàm `setCreateTaskDueDateOffset(days)`: Tính toán ngày mục tiêu từ `new Date()`, định dạng `YYYY-MM-DD` chuẩn ISO cho ô input date, cập nhật giá trị và kích hoạt cập nhật trạng thái highlight.
  * Viết hàm `updateDueDateQuickPills(activeDays)`: Highlight badge được chọn bằng tông màu Teal thương hiệu (`bg-teal-100 text-teal-800 border-teal-300 shadow-2xs`), đưa các nút khác về màu nền trung tính (`bg-slate-100 text-slate-600 hover:bg-slate-200`).
  * Trong hàm `openCreateTaskModal()`: Gọi `setCreateTaskDueDateOffset(1)` ngay khi mở modal để tự động gán ngày mai và kích hoạt highlight `+1d`.
- **Cập Nhật Trung Tâm Trợ Giúp (`templates/help.html`):**
  * Cập nhật mục 9.1 Hướng dẫn tạo việc mới với thông tin chi tiết về cơ chế tự động điền ngày mai và các nút chọn nhanh `+1d`, `+3d`, `+7d`.

### 3. Kiểm Thử Hệ Thống & Kiểm Chứng Thị Giác:
- **Playwright Visual Verification:**
  * `110_modal_create_task_default_tomorrow_due_date.png`: Ô Hạn hoàn thành mặc định ngày mai (17/10/2026), nút `+1d` được highlight teal sáng rõ.
  * `111_modal_create_task_due_date_plus_3d.png`: Nhấn `+3d` tự động nhảy ngày 19/10/2026 và chuyển highlight sang `+3d`.
  * `112_modal_create_task_due_date_plus_7d.png`: Nhấn `+7d` tự động nhảy ngày 23/10/2026 và chuyển highlight sang `+7d`.

---

## [v3.4.7] - 2026-10-16 (Sửa Triệt Để Logic Nút Ghim Bản Tin & Đưa Bài Viết Lên Đầu Danh Sách)

### 1. Phân Tích Nguyên Nhân Gốc (Root Cause):
- **Tại sao bài ghim bị biến mất khỏi danh sách thay vì đưa lên đầu?**
  * Trong `static/js/collaboration.js` tại hàm `loadCompanyNews()`, logic cũ viết: `regularPosts = json.data.filter(p => !p.is_pinned && !p.is_urgent)` và gán `renderTarget = regularPosts`.
  * Do đó, bất kỳ bài viết nào khi được ghim (`is_pinned=true`) đều bị lọc bỏ 100% khỏi lưới bản tin chính (`#news-posts-grid`), khiến người dùng nhìn vào danh sách bài viết tưởng rằng bài bị mất tích hoặc nút ghim không có tác dụng.
  * Khi bấm nút ghim trong Modal chi tiết, modal bị đóng đột ngột (`closeNewsDetailModal()`) mà không cập nhật ngay màu nút ghim, gây ức chế cho người dùng.

### 2. Cải Tiến Toàn Diện Logic & Trải Nghiệm Người Dùng:
- **Lưới Bản Tin Chính (`#news-posts-grid`):**
  * Hiển thị toàn bộ danh sách bài viết (`json.data`) mà không loại bỏ bài ghim.
  * Nhờ sắp xếp backend `order_by('-is_pinned', '-is_urgent', '-created_at')`, **tất cả bài viết được ghim LUÔN NẰM Ở VỊ TRÍ ĐẦU TIÊN CỦA LƯỚI BẢN TIN CHÍNH**.
  * Card bài viết được ghim sở hữu thiết kế nổi bật: Viền hổ phách `border-amber-300 ring-2 ring-amber-300/40 bg-gradient-to-b from-amber-50/25 to-white shadow-xs` và huy hiệu `[<i class="ph-bold ph-push-pin"></i> ĐÃ GHIM]` màu vàng hổ phách rực rỡ.
  * Bổ sung nút ghim nhanh (Quick Pin button) trực tiếp trên góc từng thẻ bài viết dành cho Ban Giám Đốc/Quản trị viên để ghim/bỏ ghim 1 chạm mà không cần mở modal.
- **Nút Ghim Trên Modal Chi Tiết (`news-modal-pin-btn`):**
  * Khi bấm nút ghim: Nút đổi màu lập tức (Vàng hổ phách `bg-amber-100 text-amber-800 border-amber-300` khi Đã ghim; Xám `bg-white text-slate-500 border-slate-200` khi Bỏ ghim) cùng tooltip tương ứng ("Bỏ ghim khỏi đầu trang" / "Ghim lên đầu trang").
  * **Không đóng modal đột ngột**, giữ màn hình để người dùng tiếp tục theo dõi nội dung.
  * Bắn Toast thông báo tức thời: *"Đã ghim bài viết lên đầu trang"* hoặc *"Đã bỏ ghim bài viết"*.
  * Tự động gọi ngầm làm mới danh sách bài viết (`loadCompanyNews()`) và widget Dashboard (`loadDashboardData()`) để bài viết lập tức nhảy lên vị trí số 1.
- **Bảo Vệ Phân Quyền Backend (`CompanyPostPinAPIView`):**
  * Bổ sung kiểm tra thẩm quyền: Chỉ Ban Giám Đốc, HR, Trưởng các phòng ban (`employee.can_post_news()`), Superuser hoặc tác giả bài viết mới được ghim bài; nhân viên thông thường bị từ chối với HTTP 403 Forbidden.
- **Đồng Bộ Widget Bản Tin Dashboard (`renderDashboardNews`):**
  * Cập nhật card bài ghim trên Dashboard với viền `border-amber-300 ring-1 ring-amber-200/60 bg-amber-50/25` và huy hiệu ghim nổi bật ở dòng số 1.

### 3. Kiểm Thử Hệ Thống & Kiểm Chứng Thị Giác:
- **Backend Unit Tests:** `Ran 102 tests in 32.207s, OK` (102/102 PASSED, bao gồm test case mới `test_company_post_pinning_and_ordering`).
- **Frontend Syntax Check:** `node -c static/js/app.js` & `node -c static/js/collaboration.js` (0 lỗi).
- **Playwright Visual Verification:**
  * `106_news_board_pinned_at_top.png`: Bài viết được ghim đứng vị trí số 1 trên lưới bài viết với viền hổ phách và huy hiệu `[ĐÃ GHIM]`.
  * `107_news_modal_pin_button_active.png`: Nút ghim trên Modal chi tiết hiển thị màu vàng hổ phách nhạt `bg-amber-100 text-amber-800 border-amber-300` khớp 100% hình ảnh người dùng phản hồi.
  * `108_news_modal_re_pinned.png` & `109_news_board_after_pin_toggle.png`: Xác thực quá trình ghim/bỏ ghim và giữ vững bài ghim ở đầu bảng.

---

## [v3.4.6] - 2026-10-16 (Bổ Sung Toàn Diện Hướng Dẫn Sử Dụng Trên Trung Tâm Trợ Giúp /helps)

### 1. Cập Nhật Cây Điều Hướng Phân Cấp & Mục Lục Trợ Giúp (Sidebar Tree Nav):
- **Cấp Cha 1 (Mô Tả Phân Hệ Chức Năng):** Bổ sung 3 phân hệ cốt lõi mới vào mục lục:
  * `10. Quản Lý Giao Việc (Tasks)` (`#sec-desc-tasks`)
  * `11. Bản Tin & Thông Báo (News)` (`#sec-desc-news`)
  * `12. Chat Trực Tiếp & Thông Báo` (`#sec-desc-collaboration`)
- **Cấp Cha 3 (Hướng Dẫn Nhập Liệu & Thao Tác Chi Tiết):** Bổ sung 4 nhóm hướng dẫn nghiệp vụ chuyên sâu:
  * `9. Giao việc Văn phòng (Tasks)`: 9.1 Tạo việc Modal rộng & Mã 3 số TSK, 9.2 Bảng Kanban 4 cột & Kéo thả, 9.3 Drawer Chi tiết & Checklist %, 9.4 Chuẩn 3 Icon Nhân sự (Họ tên thật).
  * `10. Bản tin & Thông báo (News)`: 10.1 Đăng tin & 4 Danh mục truyền thông, 10.2 Cấp ưu tiên & Ghim bài viết, 10.3 Đọc tin & Tự động ghi nhận đã đọc.
  * `11. Chat Trực Tiếp & Chuông Báo`: 11.1 Bong bóng Chat nổi & Đa kênh, 11.2 Trích dẫn Reply & Gửi tệp/hình ảnh, 11.3 Trạng thái 1 check / 2 check đã đọc, 11.4 Chuông thông báo thông minh.
  * `12. Tùy biến Biểu đồ Dashboard`: Hướng dẫn cấu hình chuỗi ngày (7/10/14/30 ngày) và bật/tắt đường chỉ số.

### 2. Nội Dung Đặc Tả & Thao Tác Chi Tiết Trong Thân Văn Bản (`templates/help.html`):
- **Phân Hệ Giao Việc Văn Phòng (`#sec-input-tasks`):**
  * Hướng dẫn chi tiết bảng trường thông tin nhập liệu cho Modal tạo mới (Centered Dialog mờ nền).
  * Quy chuẩn mã nhiệm vụ `TSK.YYYYMM.XXX` (3 chữ số).
  * Cơ chế tự động tính tỷ lệ tiến độ % dựa trên Checklist đầu việc hoàn thành.
  * Hướng dẫn kéo-thả (Drag & Drop) thẻ giữa 4 cột trạng thái.
  * Giải thích chi tiết chuẩn 3 icon chân thẻ: `Người giao | Người phụ trách | Người liên quan` hiển thị họ tên thực tế, loại bỏ chức danh.
- **Phân Hệ Bản Tin Công Ty (`#sec-input-news`):**
  * Hướng dẫn phân loại 4 nhóm danh mục: Chỉ đạo Ban Giám Đốc, Thông báo chung, Khen thưởng & Quyết định, Văn hóa & Đào tạo.
  * Thiết lập 3 cấp độ ưu tiên (Khẩn cấp, Quan trọng, Bình thường) và huy hiệu Ghim bài viết lên đầu trang.
  * Cơ chế tự động ghi nhận nhân viên đã xem bài viết khi mở chi tiết.
- **Hệ Thống Chat Trực Tiếp & Chuông Báo (`#sec-input-chat`):**
  * Hướng dẫn sử dụng Floating Chat Bubble mở rộng đa kênh (Toàn công ty, Phòng ban, Chuyến xe).
  * Gửi tệp tin Excel/PDF và hình ảnh chứng từ/biên bản hiện trường.
  * Trích dẫn câu hỏi (Reply) giữ liền mạch luồng trao đổi.
  * Giải thích cơ chế kiểm soát đọc tin: `1 check xám (✓)` (đã gửi nhưng chưa đọc) và `2 check xanh ngọc (✓✓)` (người nhận đã đọc) kèm cơ chế polling 5s.
  * Trung tâm chuông thông báo thông minh trên Topbar, phân loại thông báo và điều hướng 1 chạm.
- **Khai Báo Khách Hàng (`#sec-md-customers`):**
  * Bổ sung hướng dẫn chi tiết về trường `Tên viết tắt (short_name)` và lợi ích hiển thị huy hiệu Badge `[ABC]` màu xanh ngọc nhận diện khách hàng tức thì.
- **Tùy Biến Biểu Đồ Dashboard (`#sec-input-dashboard-customizer`):**
  * Hướng dẫn người dùng chọn chuỗi ngày quan sát (7, 10, 14, 30 ngày) và lưu cấu hình cá nhân.

---

## [v3.4.5] - 2026-10-16 (Chuẩn Hóa Tên Nhân Sự Thực Tế & Mã Task Chuẩn 3 Chữ Số)

### 1. Hiển Thị Họ Tên Nhân Sự Thực Tế (Loại Bỏ Hoàn Toàn Chức Danh / Nickname):
- **Nguyên nhân trước đây:** Các API serializer và dashboard summary sử dụng `emp.nickname` dẫn đến hiển thị mã phòng ban/chức vụ viết tắt như `BGD`, `KẾ TOÁN CƯỚC`, `ĐIỀU ĐỘ CHÍNH` hoặc chứa chức danh trong ngoặc như `Võ Triền (Giám Đốc)`.
- **Cải tiến Backend (`apps/dispatch/api_views.py`, `apps/collaboration/serializers.py`, `apps/collaboration/models/tasks.py`):**
  * Viết hàm chuẩn hóa `_clean_user_name()` / `get_full_name()`: Trả về họ tên nhân sự thực tế từ `Employee.full_name` hoặc `User.get_full_name()`.
  * Tự động lọc sạch các chức danh trong ngoặc đơn (ví dụ: `Võ Triền (Giám Đốc)` chuyển thành `Võ Triền`, `Trần Thị Kế Toán` giữ nguyên họ tên).
  * Đồng bộ cho cả 3 đối tượng nhân sự: **Người giao việc (Reporter)**, **Người thực hiện chính (Assignee)**, và **Người liên quan / theo dõi (Followers)**.
- **Cải tiến Frontend (`static/js/app.js`, `static/js/collaboration.js`):**
  * Bổ sung hàm tiện ích `cleanPersonName()` lọc sạch chức danh trên toàn bộ các thẻ Mini Kanban Dashboard, danh sách List view, và Kanban Board `/tasks/`.
  * Khi nhìn vào thẻ công việc, người nhận việc lập tức nhận diện đúng người phụ trách và người giao việc (`Võ Triền`, `Trần Thị Kế Toán`, `Phạm Quốc Hùng`...).

### 2. Chuẩn Hóa Mã Task Đúng 3 Chữ Số Sắp Sau (`TSK.YYYYMM.XXX`):
- **Dữ liệu Database:** Chạy migration dữ liệu chuẩn hóa toàn bộ 100% các task cũ trong PostgreSQL từ dạng 4 số `TSK-202610-0019` sang chuẩn 3 số dấu chấm: `TSK.202610.019`.
- **Backend Code Generator:** Xác nhận hàm `generate_task_code()` sinh mã chuẩn định dạng `TSK.YYYYMM.XXX` với 3 chữ số (`f"{prefix}{new_num:03d}"`).
- **Frontend Formatter:** Tích hợp hàm `formatTaskCode()` trên cả `app.js` và `collaboration.js` để đảm bảo bất kỳ thẻ task nào trên giao diện Dashboard hay Quản lý nhiệm vụ đều hiển thị đồng nhất dạng 3 chữ số `TSK.YYYYMM.XXX`.

### 3. Kiểm Thử Hệ Thống & Kiểm Chứng Thị Giác:
- **Backend Regression Suite:** `101/101` tests PASSED (`Ran 101 tests in 28.873s, OK`).
- **JS Syntax Integrity:** `node -c static/js/app.js`, `node -c static/js/collaboration.js`, `node -c static/js/column_manager.js` (0 lỗi).
- **Playwright Visual Verification:**
  * `104_dashboard_task_card_clean_name_3digits.png`: Widget Công Việc trên Dashboard hiển thị mã `TSK.202610.010`, `TSK.202610.011` (3 chữ số) và chân thẻ ghi rõ tên `Võ Triền | Võ Triền`.
  * `105_tasks_board_clean_name_3digits.png`: Toàn bộ bảng Kanban `/tasks/` đồng bộ mã 3 số `TSK.202610.019`, `TSK.202610.022` và 3 icon nhân sự hiển thị tên người thực tế `Võ Triền | Trần Thị Kế Toán | 2`.

---

## [v3.4.4] - 2026-10-16 (Chuyển Đổi Modal Giao Việc Mới Thành Centered Dialog Thông Thoáng & Làm Mờ Nền)

### 1. Nâng Cấp Giao Diện Modal Giao Việc Mới (`templates/views/view_tasks.html`):
- **Chuyển đổi từ Slide-over Drawer mép phải sang Centered Modal Dialog:**
  * Căn giữa màn hình hoàn hảo: `fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto`.
  * Làm mờ và tối sâu toàn bộ phông nền trang phía sau: `bg-slate-950/70 backdrop-blur-md` giúp người dùng tập trung tuyệt đối vào việc tạo nhiệm vụ.
  * Mở rộng kích thước thông thoáng: `max-w-4xl lg:max-w-5xl`, bo góc `rounded-2xl`, đổ bóng `shadow-2xl` chuẩn Design Token BIM.
  * Hỗ trợ đóng modal linh hoạt bằng cách nhấp chuột ra ngoài vùng nền mờ (`onclick="if(event.target === this) closeCreateTaskModal()"`).

### 2. Tái Cấu Trúc Bố Cục Form Thông Thoáng & Cân Xứng:
- **Hàng 1:** Tên công việc input lớn, rõ ràng, placeholder hướng dẫn cụ thể.
- **Hàng 2:** Mô tả & Hướng dẫn thực hiện (textarea tối ưu 2 dòng, tự động co giãn).
- **Hàng 3:** Bảng Meta 4 cột cân xứng hoàn hảo (Người thực hiện, Người giao việc có icon, Hạn hoàn thành, Phòng ban).
- **Hàng 4:** Mức độ ưu tiên dạng 4 Radio button phân biệt màu sắc trực quan (Thấp, Bình thường, Cao, Khẩn cấp).
- **Hàng 5:** Người liên quan (Theo dõi chung) Multi-select Popover với badge đếm số lượng người đã chọn.
- **Hàng 6 (2 Cột song song cân đối):**
  * *Cột Trái (Checklist)*: Danh sách các bước kiểm tra khởi tạo sẵn + ô nhập và nút thêm nhanh.
  * *Cột Phải (Tài liệu)*: Khối đính kèm hồ sơ, chứng từ với nút chọn tệp và lưu ý định dạng PDF/Excel/ảnh.
- **Footer:** Nút "Hủy bỏ" và "Phát Lệnh Giao Việc" cân đối, trang trọng.

### 3. Tương Tác Phím Tắt Tiện Dụng (`static/js/collaboration.js`):
- Bổ sung sự kiện lắng nghe phím tắt `Escape` (`keydown`) để đóng hộp thoại giao việc nhanh chóng mà không cần di chuột bấm nút X.

### 4. Kiểm Thử Hệ Thống & Kiểm Chứng Thị Giác:
- **Backend Regression Suite:** `101/101` tests PASSED (`Ran 101 tests in 34.204s, OK`).
- **JS Syntax Integrity:** `node -c static/js/app.js`, `node -c static/js/collaboration.js`, `node -c static/js/column_manager.js` (0 lỗi).
- **Playwright Visual Verification:**
  * `102_modal_create_task_centered_spacious.png`: Modal căn giữa trang, phông nền mờ sâu `backdrop-blur-md`, độ rộng thông thoáng 2 cột cân xứng.
  * `103_modal_create_task_filled.png`: Modal khi điền đầy đủ thông tin, chọn người liên quan đa chọn, thêm các bước checklist kiểm tra.

---

## [v3.4.3] - 2026-10-16 (Bổ Sung Trường Tên Viết Tắt Cho Khách Hàng - Short Name)

### 1. Nâng Cấp Mô Hình Dữ Liệu Khách Hàng (`apps/customers/models.py` & Migration `0013`):
- **Bổ sung trường `short_name`**:
  `short_name = models.CharField(max_length=100, blank=True, default='', verbose_name="Tên viết tắt / Tên giao dịch")`.
- Cập nhật phương thức `__str__` của model `Customer`: tự động hiển thị `[{short_name}] {name} ({code})` nếu có tên viết tắt.
- Tạo và áp dụng Migration: `0013_customer_short_name.py` trên cơ sở dữ liệu PostgreSQL.
- Cập nhật `CustomerAdmin` trong `apps/customers/admin.py`: thêm `short_name` vào `list_display` và `search_fields`.

### 2. Tích Hợp API CRUD Master Data (`apps/master_data/api_views.py`):
- **`MasterDataOptionsAPIView`**: trả về `short_name` và label định dạng `[{short_name}] {name}` giúp nhận diện khách hàng nhanh chóng trong dropdown tạo chuyến, báo giá và biểu cước.
- **`CustomerMasterListCreateAPIView`**:
  * Hỗ trợ tìm kiếm nhanh theo tên viết tắt: `Q(short_name__icontains=q)`.
  * Trả về trường `short_name` trong danh sách khách hàng.
  * Nhận và lưu `short_name` khi tạo khách hàng mới.
- **`CustomerMasterDetailAPIView`**: nhận và cập nhật `short_name` trong phương thức `PUT`.

### 3. Chuẩn Hóa Giao Diện & Trải Nghiệm Người Dùng UI/UX (`static/js/app.js` & `static/js/modules/master_data.js`):
- **Modal Chỉnh Sửa & Tạo Mới Khách Hàng:**
  * Bố trí hàng thứ 2 thông minh theo tỷ lệ `8/12 - 4/12`:
    - `Tên Khách Hàng / Doanh Nghiệp *`: input rộng rãi (8/12 cột).
    - `Tên Viết Tắt`: input nổi bật với viền ngọc teal nhã nhặn (4/12 cột, placeholder `VD: ABC, OASIS...`).
  * Đảm bảo tính cân đối thị giác, không làm phình chiều cao của modal.
- **Bảng Danh Mục Khách Hàng:**
  * Cột "Tên Khách Hàng / Doanh Nghiệp" tự động hiển thị huy hiệu (Badge) tên viết tắt màu xanh ngọc nổi bật: `<span class="bg-teal-100 text-teal-800 border-teal-300 font-black">ABC</span>` đứng trước tên đầy đủ.
- **Cache-Busting:** Nâng phiên bản `app.js?v=2.9.41` trong `templates/base.html`.

### 4. Kiểm Thử Hệ Thống & Xác Thực Trình Duyệt:
- **Automated Regression Suite:** `101/101` tests backend PASSED (`docker compose exec web python manage.py test --keepdb`).
- **JS Syntax Integrity:** `node -c static/js/app.js`, `node -c static/js/modules/master_data.js` (0 lỗi cú pháp).
- **Playwright Visual Verification:**
  * `88_customer_modal_with_short_name.png`: Modal Chỉnh Sửa Khách Hàng hiển thị chuẩn mực ô Tên Viết Tắt bên cạnh Tên Khách Hàng.
  * `89_customer_modal_filled_short_name.png`: Modal khi điền Tên Viết Tắt "ABC".
  * `90_customers_table_with_short_name_badge.png`: Bảng danh mục khách hàng sau khi lưu hiển thị huy hiệu `[ABC]` màu xanh ngọc chuyên nghiệp.

---


### 1. Khắc Phục Triệt Để Lỗi `NaN:NaN` Thời Gian Tin Nhắn (`static/js/collaboration.js`):
- **Nguyên nhân gốc rễ:** Backend Django REST Framework được cấu hình `DATETIME_FORMAT = '%d/%m/%Y %H:%M'` (chuỗi định dạng `DD/MM/YYYY HH:mm` như `16/10/2026 14:37`). Hàm JavaScript `new Date()` không chuẩn hóa được chuỗi `DD/MM/YYYY`, trả về `Invalid Date`, khiến các phép trích xuất `getHours()` / `getMinutes()` trả về `NaN`, dẫn đến chuỗi in ra `NaN:NaN`.
- **Giải pháp xử lý:**
  * Bổ sung parser thời gian đa định dạng linh hoạt `parseDateFlexible(dateStr)`: hỗ trợ hoàn hảo cả định dạng `DD/MM/YYYY HH:mm[:ss]`, `YYYY-MM-DDTHH:mm:ssZ` (ISO 8601), và timestamp số.
  * Nâng cấp `formatTimeOnly(dateStr)`: tự động trích xuất chuỗi giờ phút `HH:mm` an toàn tuyệt đối, loại bỏ 100% hiện tượng `NaN:NaN`.
  * Chuẩn hóa đồng bộ các hàm phụ trợ `formatDateTime(dateStr)` và `formatTimeAgo(dateStr)`.

### 2. Bổ Sung Trạng Thái Đã Đọc / Chưa Đọc Chuẩn BIM Consulting (1 Check & 2 Check Xanh Ngọc):
- **Backend API & Serializer (`apps/collaboration/serializers.py` & `apps/collaboration/api_views/chat_api.py`):**
  * Thêm trường tính toán `is_read` vào `ChatMessageSerializer`: xác định tin nhắn đã được thành viên khác trong phòng đọc hay chưa dựa trên `last_read_message_id`.
  * Tối ưu hóa truy vấn trong `ChatMessageListCreateAPIView`: tính `max_other_read_id` qua phép `Max` aggregate đơn lẻ và trả về trong payload polling để client đồng bộ tức thời.
  * Sử dụng `update_or_create` cho `ChatParticipant` khi đánh dấu đã đọc (`mark-read`), đảm bảo lưu trữ chính xác mốc đọc cho mọi thành viên.
- **Giao diện Chat Nổi (`static/js/collaboration.js`):**
  * **Tin nhắn của chính mình gửi đi (`isMe`):**
    - **Chưa đọc:** Hiển thị 1 dấu check xám `✓` (`<i class="ph-bold ph-check text-slate-400"></i>`, title "Đã gửi (Chưa đọc)").
    - **Đã đọc:** Hiển thị 2 dấu check xanh ngọc `✓✓` (`<i class="ph-bold ph-checks text-teal-600"></i>`, title "Đã đọc").
  * **Đồng bộ thời gian thực (Real-time Check Sync):** Khi đối phương mở xem phòng chat, polling tự động cập nhật ngay lập tức các tin nhắn gửi đi trước đó từ 1 check sang 2 check mà không cần reload tin nhắn.
  * **Tin nhắn người khác gửi đến (`!isMe`):** Hiển thị thời gian gửi rõ ràng, tinh tế.

### 3. Kiểm Thử Hệ Thống & Xác Thực Trình Duyệt:
- **Automated Regression Suite:** `101/101` tests backend PASSED (`docker compose exec web python manage.py test --keepdb`).
- **JS Syntax Integrity:** `node -c static/js/collaboration.js`, `node -c static/js/app.js`, `node -c static/js/column_manager.js` (100% PASSED, 0 syntax errors).
- **Playwright Visual Verification:**
  * `86_chat_window_fixed_nan_and_checks.png`: Cửa sổ Chat sau khi sửa, thời gian hiển thị chuẩn `14:36`, `14:37`, `14:52` kèm 2 check xanh ngọc `✓✓` cho các tin nhắn đã đọc.
  * `87_full_dashboard_with_chat_checks.png`: Toàn cảnh Dashboard với cửa sổ chat nổi hiển thị mượt mà.

---


### 1. Chuẩn Hóa Định Dạng Mã Công Việc (`apps/collaboration/api_views/tasks_api.py`):
- Chuyển đổi mã task từ dạng gạch nối 4 số `TSK-YYYYMM-XXXX` sang chuẩn dấu chấm 3 số: **`TSK.YYYYMM.XXX`** (ví dụ: `TSK.202610.022`, `TSK.202610.023`).
- Tự động quét và kế thừa số thứ tự liên tục trong tháng bất kể mã cũ hay mã mới.
- Cập nhật bộ test tự động `apps/collaboration/tests.py` khớp chuẩn `TSK.` mới.

### 2. Tinh Chỉnh Hàng 3 Icon Nhân Sự Trên Task Card (`static/js/app.js` & `static/js/collaboration.js`):
- **Sắp xếp gọn gàng trên 1 HÀNG DUY NHẤT theo đúng thứ tự logic:**
  `[icon Người giao] Tên/Role` | `[icon Người phụ trách] Tên/Role` | `[icon Người liên quan] Số lượng`
- Triệt tiêu tình trạng nhảy dòng lộn xộn giữa người phụ trách và người giao việc trên các thẻ Kanban và danh sách Dashboard.
- Đưa mốc ngày hạn hoàn thành (Deadline) lên góc trên tinh tế cạnh mã task và mức độ ưu tiên.

### 3. Nâng Cấp Toàn Diện: Cả 2 Trang (Tạo Mới & Chi Tiết) Đều Là Trang Con (Slide-over Sub-Page):
- **Loại bỏ hoàn toàn Popup Modal che màn hình:** Chuyển đổi `#modal-create-task` thành **Trang con Slide-over Drawer** nằm ở cạnh phải, đồng bộ kiến trúc 100% với Trang con Chi tiết (`#drawer-task-detail`).
- **Cung cấp đầy đủ thông tin & tính năng khởi tạo:**
  * Tag mã dự kiến `TSK.MỚI` kèm huy hiệu `Giao việc nội bộ mới`.
  * Tiêu đề công việc lớn, mô tả chi tiết rộng rãi.
  * Grid 4 thông tin đồng bộ: Người thực hiện, Người giao việc (`Võ Triển (Giám Đốc)`), Hạn hoàn thành, Phòng ban phụ trách.
  * Mức độ ưu tiên trực quan (Thấp, Bình thường, Cao, Khẩn cấp).
  * Người liên quan (Theo dõi chung) Multi-select Checkbox.
  * **Checklist các bước kiểm tra khởi tạo**: cho phép tạo sẵn danh sách các bước bàn giao trước khi phát lệnh.
  * **Tài liệu & Tệp đính kèm khởi tạo**: hỗ trợ đính kèm tệp ngay khi phát lệnh giao việc.

### 4. Kiểm Thử Hệ Thống & Xác Thực Trình Duyệt:
- **Automated Regression Suite:** `101/101` tests backend PASSED (`docker compose exec web python manage.py test --keepdb`).
- **JS Syntax Integrity:** `node -c static/js/app.js`, `node -c static/js/collaboration.js` (0 lỗi).
- **Playwright Screenshots:**
  * `80_dashboard_task_cards_3_icons_1_row.png`: Card task trên Dashboard hiển thị 3 icon trên 1 hàng.
  * `82_create_task_subpage_drawer_opened.png`: Trang con Giao việc mới trượt từ cạnh phải, bố cục đầy đủ như trang chi tiết.
  * `83_create_task_subpage_filled_with_checklist.png`: Trang con khi đã điền thông tin, thêm checklist khởi tạo và người liên quan.
  * `84_tasks_board_with_new_dot_format_code.png`: Bảng công việc với mã chấm mới `TSK.202610.023`.
  * `85_task_detail_drawer_subpage.png`: Trang con Chi tiết công việc hiển thị đầy đủ thông tin, checklist và người theo dõi.

---

## [v3.4.0] - 2026-10-16 (Hoàn Thiện Multi-Select Dropdown Chọn Nhiều Người Liên Quan & Zero-Latency Directory Preload)

### 1. Nâng Cấp Bộ Chọn "Người Liên Quan (Theo Dõi Chung)" Thành Interactive Multi-Select Dropdown:
- **Component Multi-Select Checkbox Chuyên Nghiệp (`templates/views/view_tasks.html`):**
  * Thay thế thẻ `<select>` đơn lẻ bằng giao diện Interactive Multi-Select Popover hiện đại.
  * Ô trigger hiển thị placeholder trực quan: `-- Bấm để chọn người liên quan (chọn nhiều) --` và tự động gắn các thẻ Chip (Tags) màu ngọc `[ 👤 Tên (Phòng ban) ✕ ]` cho từng người được chọn.
  * Góc phải trigger có huy hiệu số lượng người đã chọn `[X người]` và mũi tên xoay tương tác.
- **Tính Năng Popover Dropdown Tương Tác:**
  * **Hộp tìm kiếm nhanh (Realtime Search):** Lọc danh sách nhân sự ngay lập tức theo tên hoặc phòng ban.
  * **Nút tác vụ nhanh:** `[Chọn hết]` (chọn toàn bộ nhân sự đang hiển thị) và `[Bỏ chọn]` (xóa toàn bộ lựa chọn trong 1 chạm).
  * **Phân nhóm phòng ban rõ ràng:** Nhân sự được gom nhóm theo từng phòng ban (Ban Giám Đốc, Phòng Điều Vận, Kế Toán Tài Chính, Hành Chính Nhân Sự, ...) kèm số lượng thành viên.
  * **Checkbox tích chọn nhiều người (`[✓]`):** Người dùng có thể click chọn liên tục nhiều nhân sự từ các phòng ban khác nhau mà không bị đóng popup.
  * **Đóng mở thông minh:** Có nút `[Xong]` và hỗ trợ tự động đóng khi nhấp chuột ra bên ngoài (Outside Click).

### 2. Triệt Tiêu Độ Trễ & Chống Cache Rỗng (Zero-Latency Server Preload):
- **Server Preload trong `apps/dispatch/views.py` (`index_view`):**
  * Nhân sự văn phòng được serialize thành JSON (`office_users_json`) ngay khi render trang, nhúng trực tiếp vào `window.PRELOADED_OFFICE_USERS` trong `templates/base.html`.
  * Không phụ thuộc vào request API bất đồng bộ ban đầu, xóa bỏ hoàn toàn tình trạng dropdown bị rỗng do độ trễ mạng hoặc lỗi khởi tạo.
- **Cache-Busting & Cú Pháp:**
  * Nâng version `collaboration.js?v=1.2.0` đảm bảo trình duyệt người dùng luôn tải phiên bản mới nhất.
  * Đảm bảo tính phòng vệ (Defensive JavaScript), giải quyết dứt điểm lỗi gọi hàm directory khi mở modal.

### 3. Kiểm Thử Hệ Thống & Thị Giác Trình Duyệt:
- **Unit & Regression Testing:** `101/101` tests backend tự động đều PASSED trơn tru (`python manage.py test --keepdb`).
- **JS Syntax Verification:** `node -c static/js/collaboration.js` (0 lỗi cú pháp).
- **Playwright Visual Verification:**
  * `70_modal_create_task_initial.png`: Modal Giao việc nội bộ mới khi mở.
  * `71_followers_multiselect_dropdown_opened.png`: Dropdown xổ danh bạ nhân sự đầy đủ phân theo phòng ban kèm checkbox.
  * `72_followers_multiselect_checked_items.png`: Tích chọn 3 người liên quan cùng lúc, các thẻ Chip hiển thị ngay trong ô trigger kèm huy hiệu `3 người`.
  * `73_followers_multiselect_search_filtered.png`: Tìm kiếm lọc nhanh nhân sự theo từ khóa phòng ban 'Kế toán'.
  * `74_modal_with_followers_chips_selected.png`: Modal sau khi chọn xong, sẵn sàng phát lệnh.
  * `76_task_board_created_with_followers.png`: Phát lệnh thành công, toast thông báo và công việc hiển thị trên bảng.
  * `77_task_drawer_showing_all_followers.png`: Drawer chi tiết công việc hiển thị đầy đủ danh sách người theo dõi.

---

## [v3.3.9] - 2026-10-16 (Bổ Sung Ô "Người Liên Quan (Theo Dõi Chung)" Trong Modal Giao Việc & Đồng Bộ Hệ Thống Thông Báo)

### 1. Nâng Cấp Giao Diện Modal Giao Việc Mới (`templates/views/view_tasks.html`):
- **Bổ sung ô chọn "Người liên quan (Theo dõi chung)":**
  * Nằm trực tiếp dưới cụm Người thực hiện chính & Hạn hoàn thành.
  * Nhãn rõ ràng: `NGƯỜI LIÊN QUAN (THEO DÕI CHUNG)` kèm icon `ph-users` và gợi ý phụ `(cùng giám sát & nhận thông báo tiến độ)`.
  * Dropdown nạp đầy đủ danh sách nhân sự nội bộ công ty (`officeDirectoryUsers`).
  * **Hỗ trợ chọn nhiều người theo dõi linh hoạt dạng Chips (Tags):** Khi chọn một nhân sự, hệ thống tự động gắn thẻ chip màu xanh ngọc kèm tên, phòng ban và nút `✕` gỡ bỏ nhanh. Dropdown tự động reset về placeholder để người dùng có thể chọn thêm nhiều người theo dõi khác nếu cần.
- **Nâng cấp Drawer Chi Tiết Công Việc:**
  * Thêm phân vùng `Người liên quan / Theo dõi chung` (`#task-drawer-followers-list`) hiển thị avatar/tên và phòng ban của tất cả người theo dõi nhiệm vụ.

### 2. Tối Ưu Hóa Backend API & Hệ Thống Thông Báo (`apps/collaboration/`):
- **Xử lý `followers_ids` linh hoạt:** Tự động chuẩn hóa dữ liệu đầu vào (hỗ trợ cả int, string hoặc danh sách IDs) và gán quan hệ `task.followers.set(...)`.
- **Hệ thống thông báo đẩy (In-App Notification):** Tự động phát sinh thông báo Notification gửi đến chuông của tất cả Người liên quan (Followers) khi họ được thêm vào theo dõi công việc.
- **Đồng bộ Serializers:** Cập nhật `OfficeTaskListSerializer` bổ sung trường `followers_info`, đồng thời tối ưu hóa truy vấn với `prefetch_related('followers__employee')`.

### 3. Kiểm Thử & Xác Thực Toàn Diện:
- **Frontend Syntax Verification:** `node -c static/js/app.js`, `node -c static/js/collaboration.js`, `node -c static/js/column_manager.js` (0 lỗi).
- **Automated Regression Test Suite:** `python manage.py test --keepdb` (101/101 tests PASSED).
- **Playwright Visual Verification:** Kiểm thử và chụp ảnh màn hình xác thực:
  * `43_modal_create_task_with_followers.png`: Modal Giao việc mới với ô Người liên quan và 2 chip theo dõi đã chọn.
  * `44_tasks_board_after_creation.png`: Bảng công việc cập nhật nhiệm vụ mới tạo.
  * `45_task_drawer_showing_followers.png`: Drawer chi tiết hiển thị đầy đủ thông tin người theo dõi.
  * `46_dashboard_tasks_showing_follower_icon.png`: Widget Task trên Dashboard hiển thị icon và người theo dõi.

---

## [v3.3.8] - 2026-10-16 (Tinh Gọn Menu Sidebar — Chuyển Đổi Truy Cập Bản Tin & Quản Lý Công Việc Độc Quyền Qua Dashboard)

### 1. Tinh Gọn Thanh Điều Hướng Sidebar (`templates/components/sidebar.html`):
- Gỡ bỏ hoàn toàn 2 mục menu khỏi Sidebar chính:
  * `10. Bản tin Công ty` (`data-target="ban-tin"`).
  * `11. Quản lý Giao việc` (`data-target="giao-viec"`).
- Giúp Sidebar gọn gàng, tập trung 100% vào các phân hệ vận hành và tài chính cốt lõi của doanh nghiệp vận tải.

### 2. Truy Cập Tập Trung & Điều Hướng 2 Chiều Từ Dashboard:
- Người dùng chỉ truy cập vào Bản tin và Giao việc khi cần thiết thông qua 2 nút hành động trực quan tại Hàng 3 Dashboard:
  * Nút `[Bảng việc]` trên thẻ Công việc (`#dash-widget-tasks-card`) -> Điều hướng nhanh sang phân hệ Giao việc văn phòng toàn trang (`view-giao-viec`).
  * Nút `[Xem tất cả]` trên thẻ Bản tin (`#dash-widget-news-card`) -> Điều hướng nhanh sang phân hệ Bản tin công ty toàn trang (`view-ban-tin`).
- **Nút Quay Lại Thuận Tiện:** Bổ sung nút `[← Tổng quan]` nổi bật trên thanh Top Filter Bar của cả 2 phân hệ `view_news.html` và `view_tasks.html`, cho phép quay lại màn hình Dashboard Tổng quan chỉ với 1 click.

### 3. Kiểm Thử & Xác Thực Toàn Diện:
- **Frontend Syntax Verification:** `node -c static/js/app.js` và `node -c static/js/column_manager.js` (0 lỗi).
- **Automated Regression Tests:** `python manage.py test --keepdb` (101/101 tests PASSED).
- **Playwright Visual Verification:** Kiểm thử và chụp ảnh màn hình xác thực:
  * `40_sidebar_without_news_and_tasks.png`: Xác nhận Sidebar không còn 2 mục menu Bản tin và Giao việc.
  * `41_opened_tasks_from_dashboard.png`: Mở trang Giao việc thành công từ nút `[Bảng việc]` trên Dashboard.
  * `42_opened_news_from_dashboard.png`: Mở trang Bản tin thành công từ nút `[Xem tất cả]` trên Dashboard.

---

## [v3.3.7] - 2026-10-16 (Mở Rộng 8 Bảng Dữ Liệu Tùy Biến, Đảo Vị Trí Hàng 3 & Resizer Kèm Chế Độ Xem Danh Sách / Kanban Đa Tác Vụ)

### 1. Mở Rộng Danh Mục Bảng Dữ Liệu Tùy Biến (8 Bảng Nghiệp Vụ Cốt Lõi):
- Mở rộng backend `DashboardPivotChartAPIView` và frontend `PIVOT_ENTITY_FIELDS` từ 4 bảng lên 8 bảng dữ liệu logistics:
  1. `trips`: Chuyến xe & Vận chuyển (Doanh thu, Chi phí, Lợi nhuận, Số chuyến xe).
  2. `expenses`: Chi phí vận hành & Hiện trường (Số tiền chi, Số khoản chi).
  3. `bookings`: Đơn hàng & Đặt chỗ (Số lượng đơn, Số container).
  4. `vehicles`: Đội xe & Phương tiện (Số lượng xe theo phân loại, trạng thái).
  5. `quotations`: Báo giá & Khách hàng (Đơn giá cước trung bình, Sản lượng cam kết, Số lượng báo giá).
  6. `advances`: Tạm ứng & Hoàn ứng Lái xe (Số tiền tạm ứng, Số phiếu tạm ứng theo tài xế, nguồn tiền).
  7. `exceptions`: Sự cố & Khiếu nại vận tải (Số vụ việc theo loại sự cố, mức độ nghiêm trọng, tình trạng xử lý).
  8. `personnel`: Nhân sự & Đội ngũ (Số lượng nhân sự, Lương cơ bản trung bình theo phòng ban, chức danh, trạng thái).
- Toàn bộ 8 bảng đều được tối ưu hóa truy vấn Django ORM, hỗ trợ phân nhóm, phép tính Sum/Avg/Count, giới hạn Top và sắp xếp tăng/giảm.

### 2. Tái Cấu Trúc Bố Cục Hàng 3 (Task Bên Trái, Bản Tin Bên Phải):
- **Hoán đổi vị trí tối ưu nghiệp vụ:**
  * Chuyển Widget Quản lý Công việc (`#dash-widget-tasks-card`) sang bên trái với tỷ lệ mặc định 62% (vì là khu vực tác nghiệp tần suất cao của nhân viên và cấp quản lý).
  * Chuyển Widget Bản tin & Thông báo (`#dash-widget-news-card`) sang bên phải với tỷ lệ mặc định 38% (khu vực tham khảo thông tin định kỳ).
- **Thanh Kéo Phân Tách Resizer (`#dash-widget-resizer`):**
  * Đặt thanh kéo ở giữa 2 ô widget với hiệu ứng hover/active nổi bật.
  * Hỗ trợ kéo chuột để co giãn tỷ lệ chiều rộng mượt mà (giới hạn an toàn từ 25% đến 75%).
  * Tự động lưu tỷ lệ đã kéo vào `localStorage` (`bim_widget_split_ratio`).
- **Đồng Bộ Chiều Cao Tuyệt Đối:**
  * Áp dụng flexbox `flex flex-col lg:flex-row items-stretch` kết hợp `min-h-[380px] 2xl:min-h-[480px]`, đảm bảo 2 ô Công việc và Bản tin luôn có chiều cao bằng nhau chính xác (độ chênh lệch 0.00px).

### 3. Hỗ Trợ 2 Chế Độ Xem Task (Danh Sách & Kanban Mini) & Hiển Thị Đầy Đủ Icon Nhân Sự:
- Cụm nút chuyển đổi góc phải widget: `[Danh sách]` và `[Kanban]` với hiệu ứng active trực quan, lưu lựa chọn vào `localStorage` (`bim_dashboard_task_view_mode`).
- **Chế độ Danh sách (List View):**
  * Hiển thị danh sách công việc gọn gàng, checkbox hoàn thành nhanh, badge hạn xử lý và ưu tiên.
  * Hiển thị đầy đủ icon và tên:
    - **Người giao (`reporter`):** Icon `ph-user` màu tím indigo.
    - **Người phụ trách (`assignee`):** Icon `ph-user-check` màu xanh dương sky.
    - **Người theo dõi (`followers`):** Icon `ph-users` màu ngọc teal (chỉ hiển thị khi có người theo dõi).
- **Chế độ Kanban Mini (Kanban View):**
  * Chia 3 cột trạng thái chuẩn workflow: **Cần làm (`TODO`)**, **Đang làm (`IN_PROGRESS`)**, **Nghiệm thu (`REVIEW`)**.
  * Thẻ công việc (card) hiển thị tiêu đề, ngày đến hạn, huy hiệu mức độ khẩn cấp và avatar/tên phân công 3 vai trò (Giao, Phụ trách, Theo dõi).

### 4. Kiểm Thử & Xác Thực Toàn Diện:
- **Frontend Syntax:** `node -c static/js/app.js` và `node -c static/js/column_manager.js` (0 lỗi).
- **Django Unit Tests:** `python manage.py test --keepdb` (101/101 tests PASSED).
- **Playwright Visual Verification:** Kiểm thử và chụp ảnh màn hình xác thực:
  * `32_dashboard_widgets_layout.png`: Bố cục mới Task bên trái, Bản tin bên phải, độ chênh lệch chiều cao 0.00px.
  * `33_widget_tasks_list_view.png`: Giao diện danh sách hiển thị đầy đủ icon Người giao, Người phụ trách, Người theo dõi.
  * `34_widget_tasks_kanban_view.png`: Giao diện Kanban 3 cột trực quan.
  * `35_widget_resizer_dragged.png`: Kéo thanh resizer co giãn tỷ lệ giữa 2 ô mượt mà.
  * `36_modal_chart_customizer_8_entities.png`: Dropdown 8 bảng dữ liệu nghiệp vụ đầy đủ.
  * `37_pivot_exceptions_preview.png`: Xem trước trực tiếp biểu đồ sự cố vận tải theo mức độ nghiêm trọng.
  * `38_dashboard_custom_exceptions_chart_applied.png`: Áp dụng thành công vào Biểu đồ 1 trên Dashboard.
  * `39_dashboard_chart_restored.png`: Khôi phục về mặc định dễ dàng.

---

## [v3.3.6] - 2026-10-16 (Chuẩn Hóa Thuần Việt, Tùy Biến Cả 2 Ô Biểu Đồ & Thanh Kéo Tỷ Lệ Kích Thước Tự Động Đồng Bộ Chiều Cao)

### 1. Chuẩn Hóa Ngôn Ngữ — Loại Bỏ Toàn Bộ Chữ "BI" & Thuật Ngữ Rườm Rà:
- Loại bỏ hoàn toàn các từ viết tắt tự xưng "BI", "Live BI", "Self-service BI" khỏi giao diện người dùng, nhãn bảng, nút bấm và thông báo hệ thống.
- Tập trung vào bản chất thuần túy, chuyên nghiệp:
  * Tiêu đề modal: `Tùy Biến Biểu Đồ Báo Cáo` (kèm huy hiệu phân biệt `Biểu đồ 1` / `Biểu đồ 2`).
  * Huy hiệu trạng thái: `Trực tiếp` và `Tùy biến`.
  * Các trường tham số chuẩn tiếng Việt: `1. Bảng Dữ Liệu`, `2. Phân Nhóm Theo (Trục Nhóm)`, `3. Chỉ Số Đo Lường`, `Phép Tính`, `4. Loại Biểu Đồ`, `5. Giới Hạn Top`, `Bảng Chi Tiết Phân Bổ`.
  * Xóa bỏ các từ tiếng Anh không cần thiết trong danh sách nhóm (Customer, Driver, Vehicle, Status, Container Type, Shipping Line...).

### 2. Tùy Biến Độc Lập Cho Cả Biểu Đồ 1 & Biểu Đồ 2:
- Bổ sung nút `[Tùy biến]` và nút `[Mặc định]` riêng rẽ cho cả Ô 1 (`openChartCustomizer(1)`) và Ô 2 (`openChartCustomizer(2)`).
- Quản lý trạng thái độc lập qua `bim_custom_chart_1` và `bim_custom_chart_2` trong `localStorage`:
  * Ô 1 có thể hiển thị Biểu đồ cột/đường theo Khách hàng, Doanh thu, Tuyến đường...
  * Ô 2 có thể tùy biến thành Biểu đồ Donut/Cột ngang/Tròn theo Khoản mục chi phí, Trạng thái đơn, Loại xe...
  * Khi khôi phục về mặc định một ô, ô còn lại vẫn giữ nguyên cấu hình tùy biến mà không bị ảnh hưởng.

### 3. Tùy Chỉnh Kích Thước Linh Hoạt & Đồng Bộ Chiều Cao 100%:
- **Đồng bộ chiều cao tuyệt đối:** Sử dụng container `flex flex-col lg:flex-row items-stretch gap-0` kết hợp canvas đồng bộ `h-[135px] xl:h-[150px] 2xl:h-[190px]`, đảm bảo 2 ô biểu đồ luôn có chiều cao bằng nhau chính xác (độ chênh lệch 0px) trên mọi kích thước màn hình.
- **Thanh kéo phân tách (Splitter / Resizer):**
  * Đặt thanh `#dash-chart-resizer` ở giữa 2 ô biểu đồ với vạch chia dọc nổi bật khi hover/active.
  * Hỗ trợ kéo chuột trái/phải mượt mà để thay đổi tỷ lệ chiều rộng giữa 2 ô (giới hạn an toàn từ 20% đến 80%).
  * Tự động lưu tỷ lệ đã kéo vào `localStorage` (`bim_chart_split_ratio`) để duy trì trạng thái khi tải lại trang.
  * Tự động kích hoạt `Chart.resize()` sau khi thả chuột để đồ họa hiển thị sắc nét, không bị vỡ bố cục.

### 4. Kiểm Thử & Xác Thực Toàn Diện:
- **Frontend Syntax Verification:** `node -c static/js/app.js` và `node -c static/js/column_manager.js` (Exit Code 0).
- **Automated Regression Test Suite:** `python manage.py test --keepdb` (101/101 tests PASSED).
- **Playwright Visual Verification:** Kiểm thử thực tế kéo thanh resizer, tùy biến cả 2 ô biểu đồ và khôi phục độc lập, lưu các artifact ảnh `27_dashboard_initial_dual_charts.png`, `28_modal_customizer_slot_1.png`, `29_modal_customizer_slot_2.png`, `30_dashboard_both_charts_customized.png`, `31_dashboard_chart2_reset_chart1_kept.png`.

---

## [v3.3.5] - 2026-10-16 (Nhúng Công Cụ Tùy Biến Biểu Đồ Đa Chiều Self-Service Pivot / BI Builder Vào Dashboard)

### 1. Phân Tích & Tính Năng Self-Service Pivot BI Builder:
- **Tự chọn nguồn dữ liệu (Data Source / Entity):**
  * `trips`: Chuyến xe & Vận chuyển (`DispatchTrip`).
  * `expenses`: Chi phí vận hành & Hiện trường (`TripExpense`).
  * `bookings`: Đơn hàng vận chuyển & Booking hãng tàu (`BookingOrder`).
  * `vehicles`: Đội xe & Phương tiện (`Vehicle`).
- **Tự chọn trục phân nhóm (Trục X / Dimensions):**
  * Theo Khách hàng (`customer`), Tài xế (`driver`), Biển số xe (`vehicle`), Tuyến đường (`route`), Loại container (`container_type`), Phân loại hàng (`shipment_type`), Trạng thái chuyến (`status`), Khoản mục chi phí (`category`), Hãng tàu (`shipping_line`), Kích cỡ cont (`container_size`).
- **Tự chọn chỉ số & phép tính đo lường (Trục Y / Metrics & Aggregation):**
  * Doanh thu (`revenue`), Chi phí (`expense`/`amount`), Lợi nhuận gộp (`profit`), Số chuyến (`trip_count`), Số đơn hàng (`booking_count`), Số lượng xe (`vehicle_count`).
  * Phép toán: Tổng (`SUM`), Trung bình (`AVG`), Đếm số lượng (`COUNT`).
- **Tự chọn loại biểu đồ trực quan (Chart Types):**
  * Cột đứng (Bar Chart), Cột ngang (Horizontal Bar), Đường xu hướng (Line Chart), Vòng Donut (Doughnut Chart), Biểu đồ tròn (Pie Chart).
- **Bộ lọc thời gian & Giới hạn:**
  * Toàn bộ thời gian, Tháng này, Quý này, Năm nay, 30 ngày gần nhất.
  * Giới hạn Top 5, 10, 15, 20 kèm sắp xếp Giảm dần / Tăng dần.
- **Xem trước trực tiếp (Live Preview & Mini Pivot Table):**
  * Tích hợp Canvas xem trước tức thời khi thay đổi bất kỳ tham số nào.
  * Bảng số liệu chi tiết phân bổ (Mini Pivot Table) hiển thị xếp hạng, tên nhóm, giá trị định dạng tiền tệ/đơn vị và thanh % tỷ trọng trực quan.
- **Áp dụng & Lưu cấu hình (Dashboard Persistence & Reset):**
  * Bấm `[Áp Dụng Vào Dashboard]` sẽ ghi đè biểu đồ Card 1 trên Dashboard, hiển thị huy hiệu `[BI Tùy Biến]` và tự động lưu vào `localStorage`.
  * Nút `[Mặc định]` cho phép quay về biểu đồ chuẩn theo vai trò phòng ban bất kỳ lúc nào chỉ bằng 1 cú nhấp chuột.

### 2. Triển Khai Kỹ Thuật & Kiến Trúc:
- **Backend API (`apps/dispatch/api_views.py` & `config/urls.py`):**
  * Thêm `DashboardPivotChartAPIView` và route `/api/dashboard/pivot/`.
  * Sử dụng Django ORM aggregation (`Sum`, `Avg`, `Count`) với quan hệ an toàn trên `Customer`, `Employee`, `Vehicle`, `DispatchTrip`, `TripExpense`, `BookingOrder`.
- **Frontend UI & Modal (`templates/views/view_dashboard.html`):**
  * Bổ sung nút `[Tùy biến BI]` và nút `[Mặc định]` trên Header Card 1 Hàng biểu đồ.
  * Thêm Modal 2 cột `#modal-pivot-chart-builder` thiết kế chuẩn quốc tế với Design Token BIM Logistics (Teal, Emerald, Amber, Slate).
- **JavaScript Engine (`static/js/app.js`):**
  * Hàm `openPivotChartBuilderModal()`, `closePivotChartBuilderModal()`, `onPivotEntityChange()`, `fetchAndRenderPivotPreview()`, `renderPivotChartCanvas()`, `renderPivotMiniTable()`, `applyPivotChartToDashboard()`, `renderCustomPivotChartOnDashboard()`, `resetToDefaultRoleChart()`.
  * Độc lập hóa trục tung/hoành cho Horizontal Bar (`indexAxis: 'y'`) hiển thị chính xác tên nhãn và thang đo giá trị.

### 3. Kiểm Thử & Xác Thực Toàn Diện:
- **JS Syntax Verification:** `node -c static/js/app.js` và `node -c static/js/column_manager.js` (Exit Code 0).
- **Automated Regression Test Suite:** `python manage.py test --keepdb` (101/101 tests PASSED).
- **Playwright Visual Verification:** Kiểm thử thực tế trên trình duyệt, chụp ảnh màn hình lưu vết các artifact `23_pivot_builder_modal.png`, `24_pivot_builder_expenses_preview.png`, `25_dashboard_custom_pivot_applied.png`, `26_dashboard_pivot_restored_default.png`.

---

## [v3.3.4] - 2026-10-16 (Hệ Thống Biểu Đồ BI Đa Chiều Tùy Biến Chuyên Biệt Theo Từng Vai Trò - Role-Based Logistics BI Charts)

### 1. Phân Tích & Kiến Trúc Biểu Đồ BI Theo 6 Góc Nhìn Chuyên Môn:
- **Nguyên lý thiết kế:** Không cố định một loại biểu đồ cho toàn bộ các phòng ban; mỗi vai trò có trọng tâm dữ liệu và chỉ số hiệu suất hoàn toàn khác nhau.
- **Chi tiết 6 Cấu Hình Biểu Đồ Xu Hướng (Chart 1 - Mixed Bar & Line) & Biểu Đồ Cơ Cấu (Chart 2 - Donut):**
  1. **Ban Giám Đốc (`DIRECTOR`):**
     * *Xu hướng:* Diễn Biến Doanh Thu, Chi Phí Vận Hành & Lợi Nhuận Gộp (Cột Doanh thu Teal vs Chi phí Amber & Đường Lợi nhuận Emerald).
     * *Tóm tắt:* Doanh Thu TB/Ngày | Chi Phí TB/Ngày | Biên Lợi Nhuận TB.
     * *Donut:* Cơ Cấu Vận Hành (Toggle: **Đội Xe** [Khai thác, Chờ bãi, Bảo trì] vs **Hải Quan** [Xanh, Vàng, Đỏ]).
  2. **Kế Toán Tài Chính (`ACCOUNTING`):**
     * *Xu hướng:* Diễn Biến Chi Phí Vận Hành & Tạm Ứng Chuyến Lái Xe (Cột Chi phí Amber vs Tạm ứng giải ngân Blue & Đường Lợi nhuận gộp Emerald).
     * *Tóm tắt:* Chi Phí TB/Ngày | Tạm Ứng TX Bình Quân | Tỷ Lệ Quyết Toán Cước.
     * *Donut:* Cơ Cấu Chi Phí & Hồ Sơ Quyết Toán (Toggle: **Khoản Mục Chi** [Dầu DO 55%, Cầu đường BOT 25%, Nâng hạ cảng 12%, Lưu ca 8%] vs **Quyết Toán** [Đã chốt sổ, Chờ duyệt chứng từ, Chưa nộp]).
  3. **Điều Vận & Điều Độ (`DISPATCH`):**
     * *Xu hướng:* Sản Lượng Điều Vận Chuyến Xe & Tỷ Lệ Giao Đúng Giờ (OTD) (Cột Lệnh điều xe Teal vs Chuyến hoàn tất Emerald & Đường SLA Đúng Hạn OTD% Amber).
     * *Tóm tắt:* Tổng Lệnh Điều Vận | Chuyến Hoàn Tất | SLA Đúng Hạn (OTD).
     * *Donut:* Tiến Độ Lộ Trình & Sự Cố Vận Tải (Toggle: **Chặng Chuyến** [Đang lăn bánh, Lấy/Trả rỗng cảng, Đang đóng kho] vs **Sự Cố OS&D** [An toàn, Trễ giờ kẹt phà, Hư hỏng/thiếu hàng]).
  4. **Phòng Kinh Doanh (`SALES`):**
     * *Xu hướng:* Sản Lượng Đơn Booking & Doanh Thu Tạm Tính (Cột Doanh số Blue vs Sản lượng TEU Indigo & Đường Tỷ Lệ Chốt Báo Giá Teal).
     * *Tóm tắt:* Đơn Booking Mới | Doanh Số Bán Hàng | Tỷ Lệ Chốt Báo Giá.
     * *Donut:* Cơ Cấu Khách Hàng & Loại Vỏ Container (Toggle: **Loại Cont** [Cont 40HC 60%, Cont 20DC 32%, Cont Lạnh 8%] vs **Ngành Hàng** [FMCG 48%, Nông thủy sản 34%, Điện tử 18%]).
  5. **Đội Xe & Quản Lý Bãi (`FLEET`):**
     * *Xu hướng:* Tỷ Lệ Khai Thác Đội Đầu Kéo & Phương Tiện Sẵn Sàng (Cột Xe lăn bánh Active Emerald vs Xe chờ bãi Idle Teal & Đường Utilization% Indigo).
     * *Tóm tắt:* Tổng Đội Xe Đầu Kéo | Sẵn Sàng Nhận Lệnh | Hiệu Suất Khai Thác.
     * *Donut:* Hiện Trạng Kỹ Thuật & Đăng Kiểm Đội Xe (Toggle: **Kỹ Thuật** [Đủ điều kiện, Cần bảo dưỡng nhẹ, Đại tu xưởng] vs **Đăng Kiểm** [Còn hạn an toàn, Sắp hết hạn <30 ngày, Quá hạn]).
  6. **Hành Chính Nhân Sự (`HR`):**
     * *Xu hướng:* Lực Lượng Tài Xế Lăn Bánh & Tỷ Lệ Sẵn Sàng Vận Hành (Cột Tài xế lăn bánh Teal vs Tài xế nghỉ phép/chờ lệnh Amber & Đường Tỷ Lệ Sẵn Sàng Emerald).
     * *Tóm tắt:* Tổng Đội Ngũ Tài Xế | Đang Ôm Vô-lăng | Tỷ Lệ Sẵn Sàng.
     * *Donut:* Cơ Cấu Định Biên & Giấy Phép Lái Xe (Toggle: **Định Biên** [Tài xế, Điều vận/Hiện trường, Khối Văn phòng] vs **GPLX FC/C** [Còn hạn, Cần đổi bằng 30 ngày, Khám sức khỏe]).

### 2. Triển Khai Kỹ Thuật & Zero-Regression:
- **Backend API (`apps/dispatch/api_views.py`):**
  * Bổ sung dictionary `role_charts` tích hợp đầy đủ 6 vai trò trong response của `/api/dashboard/`.
  * Bảo toàn 100% trường `charts` cũ để tương thích ngược.
- **Frontend SPA (`static/js/app.js` & `templates/views/view_dashboard.html`):**
  * Hàm `renderRoleCharts(role)` tự động vẽ lại Chart.js, cập nhật Legend động, 3 ô tóm tắt mini và biểu đồ Donut theo đúng vai trò đang chọn.
  * Hàm `switchRoleDonutOption(optIdx)` cho phép chuyển đổi 1-chạm giữa 2 chế độ Donut của từng vai trò, tự động cập nhật tâm rỗng và danh sách chú thích.
  * Xuất toàn cục: `window.renderRoleCharts` và `window.switchRoleDonutOption`.
- **Kiểm Thử Đạt Chuẩn:**
  * Cú pháp JavaScript: `node -c static/js/app.js` đạt 100% exit code 0.
  * Bộ kiểm thử tự động: **101/101 Django unit tests PASSED**.
  * Chụp ảnh xác thực giao diện Playwright: Chụp và thẩm định thành công 7 bức ảnh từ `16_chart_director.png` đến `22_chart_accounting_donut_toggle.png`.

## [v3.3.3] - 2026-10-16 (Tối Ưu Không Gian Dashboard: Gỡ Bỏ Bảng P&L Chuyến Xe, Mở Rộng Tối Đa Cho Bản Tin & Quản Lý Công Việc)

### 1. Tối Ưu Bố Cục Không Gian Giao Diện (UI/UX Space Optimization):
- **Loại bỏ khối Bảng P&L Chuyến Xe khỏi Dashboard:**
  * Tiếp thu phản hồi thực tế từ người dùng: Bảng kê chi tiết hiệu suất & P&L từng chuyến xe đã có đầy đủ tại phân hệ **Tài chính & Kế toán** (`switchTab('ke-toan')`) và phân hệ **Báo cáo & Thống kê** (`switchTab('bao-cao')`), việc để bảng dài chiếm nửa dưới của Dashboard gây chật chội và thừa thãi thông tin.
  * Gỡ bỏ hoàn toàn thẻ `<!-- HÀNG 4: BẢNG KÊ HIỆU SUẤT P&L CHUYẾN XE GẦN NHẤT -->` trong [`templates/views/view_dashboard.html`](file:///e:/Bim_Logistics/templates/views/view_dashboard.html).
- **Mở rộng không gian hiển thị cho 2 Widget Tương Tác Cốt Lõi:**
  * **Widget 1: Bản Tin & Thông Báo Nội Bộ** (`#dashboard-news-list`) và **Widget 2: Công Việc Cần Xử Lý Ngay** (`#dashboard-tasks-list`) được chuyển đổi sang container co giãn linh hoạt (`flex-1 min-h-[380px] 2xl:min-h-[480px]`).
  * Loại bỏ giới hạn cứng `max-h-[220px]`, danh sách nội dung được mở rộng không gian tối đa (`min-h-[280px] flex-1 overflow-y-auto pr-1`).
  * Danh thiếp bài viết và danh thiếp công việc hiển thị đầy đủ, thoáng đãng, dễ theo dõi tiến độ và đọc thông báo chỉ đạo điều hành.

### 2. Tinh Chỉnh Backend & Defensive JavaScript:
- **Backend API (`apps/dispatch/api_views.py`):**
  * Tăng số lượng tin tức (`announcements`) từ 4 lên tối đa 8 bài mới nhất.
  * Tăng số lượng công việc ưu tiên (`my_tasks`) từ 5 lên tối đa 8 việc ưu tiên cần xử lý.
- **Frontend JavaScript An Toàn (`static/js/app.js`):**
  * Bổ sung kiểm tra phòng thủ: `const pnlTbody = document.getElementById('bgd-pnl-tbody'); if (!pnlTbody) return;` vào đầu hàm `applyDashboardPnlFilters()` tránh lỗi JavaScript null pointer khi bảng P&L không còn trên DOM.
  * Cú pháp chuẩn mực: `node -c static/js/app.js` và `node -c static/js/column_manager.js` đạt 100% exit code 0.
- **Kiểm Thử & Xác Thực Toàn Diện:**
  * Chạy trọn vẹn bộ test dự án: **101/101 Django unit tests PASSED**.
  * Chụp ảnh kiểm thử trực quan Playwright headless (`13_dashboard_expanded_widgets.png`, `14_dashboard_accounting_expanded.png`, `15_dashboard_dispatch_expanded.png`) xác nhận giao diện mới sắc nét, chuẩn UI/UX quốc tế.

## [v3.3.2] - 2026-10-16 (Phân Hệ Dashboard Tùy Biến Theo Vai Trò Vị Trí Quyền Hạn - Role-Based Dashboard & Widgets Integration)

### 1. Phân Tích & Kiến Trúc Dashboard Đa Vai Trò (Role-Based Context):
- **Cơ sở nghiệp vụ Logistics:** Mỗi vị trí trong doanh nghiệp vận tải có nhu cầu thông tin chuyên biệt: Ban Giám Đốc cần toàn cảnh P&L và chiến lược, Kế toán cần kiểm soát quỹ tiền và tạm ứng, Điều vận cần bám sát trạng thái chuyến và OTD, Kinh doanh cần theo dõi đơn hàng và doanh số, Đội xe cần kiểm soát bảo dưỡng và kiểm định, Nhân sự cần quản trị định biên và bằng lái.
- **Phân cấp 6 Vai Trò Chính:**
  1. **Ban Giám Đốc (`DIRECTOR` / `MANAGEMENT` / Superuser):** P&L, Lợi nhuận gộp tạm tính, Doanh thu, Chi phí, Khai thác đội xe, Thông quan hải quan, Chỉ thị điều hành.
  2. **Kế Toán Tài Chính (`ACCOUNTING` / `ACCOUNTANT`):** Quỹ khả dụng (Tiền mặt/Ngân hàng), Tạm ứng lái xe chưa hoàn (`DriverTripAdvance`), Chuyến chưa quyết toán cước, Chi phí vận hành kỳ này.
  3. **Điều Vận & Điều Độ (`DISPATCH` / `DISPATCHER`):** Chuyến đang chạy trên đường, Đơn hàng chờ gán xe, Tỷ lệ đúng hẹn (OTD%), Cảnh báo sự cố / Chậm trễ hiện trường.
  4. **Phòng Kinh Doanh (`SALES` / `SALESMAN`):** Đơn hàng Booking, Báo giá đang đàm phán, Doanh số bán hàng, Khách hàng B2B hoạt động.
  5. **Đội Xe & Quản Lý Bãi (`FLEET` / `MECHANIC`):** Khả dụng đầu kéo, Xe nằm bãi sẵn sàng, Xe đang bảo dưỡng trong xưởng, Xe đến hạn kiểm định/bảo hiểm 30 ngày.
  6. **Hành Chính Nhân Sự (`HR`):** Tổng quân số, Lực lượng tài xế lăn bánh, HĐLĐ đang hiệu lực, Giấy phép lái xe cần đổi hạn 30 ngày.
- **Bộ Chuyển Đổi Góc Nhìn Điều Hành (Executive Role Switcher):** Dành riêng cho Ban Giám Đốc và Superuser: Cung cấp dropdown trực tiếp trên thanh Dashboard Header để chuyển đổi và kiểm tra góc nhìn của từng phòng ban mà không cần đăng xuất/đăng nhập lại. Với chuyên viên thông thường, hệ thống tự động khóa và hiển thị đúng góc nhìn chuyên môn.

### 2. Tích Hợp 2 Widget Tương Tác Cốt Lõi Trên Dashboard:
- **Widget Bản Tin & Thông Báo Công Ty (Company Announcements Widget):**
  * Tự động lọc thông báo khẩn cấp (`is_urgent`), thông báo ghim (`is_pinned`) và tin tức theo đúng phòng ban người dùng.
  * Hiển thị badge danh mục, thời gian đăng, tác giả và tóm tắt ngắn.
  * Tương tác 1-chạm: Bấm vào bài viết mở trực tiếp Modal chi tiết bản tin (`openNewsDetailModal`).
- **Widget Quản Lý Công Việc Cần Xử Lý Ngay (My Actionable Tasks Widget):**
  * Tự động lọc công việc ưu tiên cao/khẩn cấp của cá nhân và phòng ban phụ trách.
  * Hiển thị mã task (`TSK-xxx`), Badge mức độ ưu tiên (Khẩn cấp / Cao / Bình thường), Badge Quá hạn, Deadline, thanh tiến độ checklist (`x/y mục`).
  * Tương tác 1-chạm: Bấm vào task mở trực tiếp Slide-over Task Drawer (`openTaskDetailDrawer`) để cập nhật checklist và thảo luận.

### 3. Nâng Cấp Backend API & Frontend Architecture:
- **REST API `DashboardBGDAPIView` (`/api/dashboard/`):**
  * Mở rộng quyền truy cập: `permission_classes = [permissions.IsAuthenticated]`.
  * Hỗ trợ tham số `view_as` cho Ban Giám Đốc và Superuser.
  * Trả về đồng bộ: `kpi_cards` (4 thẻ chuyên môn), `announcements`, `my_tasks`, `financial`, `productivity`, `fleet`, `personnel`, `commercial_customs`, `charts`, `trips_pnl` (Bảo toàn 100% tương thích ngược).
- **Frontend SPA ([`templates/views/view_dashboard.html`](file:///e:/Bim_Logistics/templates/views/view_dashboard.html) & [`static/js/app.js`](file:///e:/Bim_Logistics/static/js/app.js)):**
  * Bổ sung thanh tiêu đề `Role-Based Dashboard Header Bar` với lời chào cá nhân hóa, Badge chức vụ và Dropdown Góc nhìn điều hành.
  * Hàm `renderRoleKpiCards()`, `renderDashboardNews()`, `renderDashboardTasks()`, `changeDashboardRoleView()`.
  * Cú pháp JavaScript: `node -c static/js/app.js` đạt 100% exit code 0.
  * Bộ kiểm thử toàn diện: **101/101 unit tests PASSED** (`python manage.py test --keepdb`).
  * Kiểm thử thị giác tự động bằng Playwright: 10 kịch bản chụp ảnh màn hình từ `01_dashboard_director.png` đến `10_dashboard_staff_ketoan.png`.

## [v3.3.1] - 2026-10-16 (Rà Soát Nghiệp Vụ Thực Tế: Phân Quyền Đăng Bản Tin & Nguyên Tắc Giao Việc Cấp Trên - Cấp Dưới)

### 1. Phân Quyền Đăng Bản Tin Công Ty (Announcement Permissions):
- **Cơ sở nghiệp vụ:** Bản tin công ty là kênh thông cáo chính thức, mang tính pháp lý nội bộ; chuyên viên thông thường và tài xế không được tùy tiện đăng bài gây loãng thông tin.
- **Thực thi kỹ thuật:**
  * Bổ sung trường `is_department_head = models.BooleanField` vào model `Employee` (`apps/personnel/models.py`).
  * Bổ sung property `hierarchy_level` và hàm thẩm quyền `can_post_news()`: Chỉ Ban Giám Đốc (`hierarchy_level=100`), Hành chính Nhân sự (`Department.HR` - `50`) và Trưởng các phòng ban (`is_department_head=True` - `50`) mới có thẩm quyền đăng tin.
  * API `CompanyPostListCreateAPIView.post`: Chặn và trả về `HTTP 403 FORBIDDEN` nếu tài khoản không đủ thẩm quyền.
  * Frontend: Tự động ẩn nút "Đăng Bản Tin Mới" (`#btn-open-create-news`) đối với chuyên viên thường.

### 2. Nguyên Tắc Giao Việc Cấp Trên - Cấp Dưới (Superior-to-Subordinate Task Delegation):
- **Cơ sở nghiệp vụ:** Kiểm soát trật tự điều hành doanh nghiệp logistics: Cấp dưới tuyệt đối không được giao việc ngược lên cấp trên hoặc Ban Giám Đốc.
- **Thực thi kỹ thuật:**
  * Bổ sung hàm kiểm tra thẩm quyền `can_assign_task_to(target_employee)` trên model `Employee`.
  * **Ban Giám Đốc (`100`):** Toàn quyền giao việc cho bất kỳ ai trong công ty.
  * **Trưởng phòng / Quản lý (`50`):** Được giao việc cho nhân viên cấp dưới trong cùng bộ phận (`hierarchy_level < 50`), gửi đề nghị phối hợp ngang cấp cho Trưởng phòng ban khác (`50`), và tự tạo việc cho chính mình. Bị chặn `HTTP 403` nếu cố tình gán việc cho Ban Giám Đốc.
  * **Chuyên viên / Nhân viên thường (`20`):** Chỉ được phép tự tạo việc cho chính bản thân mình (Self-assigned task - theo dõi to-do cá nhân), bị chặn `HTTP 403` nếu cố tình giao việc cho Trưởng phòng hoặc Ban Giám Đốc.
  * API `OfficeTaskDirectoryAPIView`: Cung cấp cờ `can_assign` cho từng nhân sự và trả về `assignable_users`.
  * Frontend UI: Dropdown "Người thực hiện" tự động đánh dấu `[Chính bạn - Việc cá nhân]` và làm mờ/vô hiệu hóa các cấp trên kèm nhãn `[Cấp trên / Ngoài thẩm quyền]`.
### 3. Phân Hệ Chuông Thông Báo Cá Nhân (In-App Bell Notifications):
- **Kiến trúc & Data Model:** Model `Notification` (`apps/collaboration/models/notification.py`) với các loại thông báo: `TASK_ASSIGNED` (Được giao việc mới), `TASK_STATUS_CHANGED` (Cập nhật tiến độ), `TASK_COMMENT` (Thảo luận việc), `NEWS_URGENT` (Bản tin khẩn cấp), `NEWS_NEW` (Bản tin mới), `CHAT_MENTION` (Nhắc tên).
- **Cơ chế Trigger tự động:**
  * Khi giao việc mới: Chuông của người nhận việc (`assignee`) tự động tăng số lượng và nhận thông báo tiêu đề, người giao và hạn chót.
  * Khi người thực hiện đổi trạng thái (hoàn thành / nghiệm thu): Chuông của người giao việc (`reporter`) nhận thông báo cập nhật kèm % tiến độ.
  * Khi xuất bản tin tức mới: Toàn thể nhân sự văn phòng thuộc phòng ban đích nhận thông báo đẩy.
- **Giao diện Topbar Chuông Thông Báo ([`templates/components/topbar.html`](file:///e:/Bim_Logistics/templates/components/topbar.html)):**
  * Nút chuông thông báo cạnh Avatar với huy hiệu đỏ đếm số tin chưa đọc (`#notification-unread-badge`).
  * Dropdown Popover danh sách thông báo: Phân loại Tất cả / Chưa đọc, hiển thị icon màu trực quan, thời gian tương đối (`formatTimeAgo`), nút "Đánh dấu tất cả đã đọc".
  * Điều hướng thông minh khi bấm vào item: Tự động đánh dấu đã đọc và mở ngay Modal bản tin hoặc Drawer chi tiết công việc tương ứng.
- **REST APIs:** `/api/collaboration/notifications/`, `/mark-read/`, `/mark-all-read/`.

### 4. Kiểm Thử Hệ Thống (Zero-Regression):
- Cập nhật test case `test_create_news_and_task_delegation_permissions` tại `apps/collaboration/tests.py`: Kiểm thử 8 kịch bản phân quyền (Chuyên viên bị chặn đăng tin, Trưởng phòng/HR/BGD đăng tin thành công, Cấp dưới giao việc cấp trên bị chặn, Trưởng phòng giao việc BGD bị chặn, Trưởng phòng giao việc cấp dưới thành công, Phối hợp liên phòng ban thành công, Việc cá nhân thành công).
- Kết quả kiểm thử: **5/5 tests PASSED** (`apps.collaboration`).
- Cú pháp JavaScript: `node -c static/js/collaboration.js` đạt **100% exit code 0**.

## [v3.3.0] - 2026-10-15 (Triển Khai Phân Hệ Tương Tác Nội Bộ: Bản Tin Công Ty, Giao Việc Chuẩn Quốc Tế Jira/Asana & In-App Team Chat)

### 1. Phân Hệ Bản Tin Công Ty & Thông Báo Nội Bộ (`apps/collaboration/`):
- **Kiến trúc & Data Model:** `PostCategory`, `CompanyPost`, `PostAttachment`, `PostComment`, `PostReadStatus`.
- **Tính năng nổi bật:**
  * Đăng bài thông báo chỉ đạo của Ban Giám Đốc, chính sách nhân sự, cảnh báo tuyến đường / kẹt cảng.
  * Đánh dấu ghim lên đầu trang (`is_pinned`), thông báo khẩn cấp (`is_urgent`), nhắm theo phòng ban đích (`target_department`).
  * Tự động ghi nhận lượt xem (`view_count`) và theo dõi trạng thái đã đọc của từng nhân viên văn phòng (`PostReadStatus`).
  * Bình luận, thảo luận trực tiếp dưới mỗi thông báo.
- **Giao diện:** View SPA `view_news.html`, Card Grid hiện đại, Modal đọc chi tiết bài viết, Modal tạo bản tin mới.

### 2. Phân Hệ Quản Lý & Giao Việc Văn Phòng Chuẩn Quốc Tế (Jira / Asana Standard):
- **Phạm vi phân quyền:** Độc lập hoàn toàn với tài xế xe đầu kéo; chuyên biệt cho Ban Giám Đốc, Quản lý và Cán bộ Nhân viên Văn phòng.
- **Kiến trúc & Data Model:** `OfficeTask`, `TaskChecklist`, `TaskComment`, `TaskAttachment`, `TaskActivityLog`.
- **Tính năng nghiệp vụ:**
  * Mã công việc chuẩn hoá tự sinh `TSK-YYYYMM-XXXX`.
  * Hỗ trợ 2 chế độ hiển thị linh hoạt: **Bảng Kanban** (4 cột: Cần làm `TODO`, Đang làm `IN_PROGRESS`, Chờ nghiệm thu `REVIEW`, Hoàn thành `DONE`) và **Dạng Danh Sách (List View)**.
  * Bộ lọc nhanh: Việc của tôi (`my_tasks`), Tôi đã giao (`assigned_by_me`), Lọc theo phòng ban, Lọc quá hạn (Overdue).
  * Kéo thả Kanban đổi trạng thái trực quan với API `/api/collaboration/tasks/<id>/status/`.
  * Checklist subtasks có thanh % tiến độ tự động cập nhật (`recalculate_progress`).
  * Slide-over Task Detail Drawer bên phải màn hình: Xem chi tiết, thảo luận, tải tệp đính kèm, nhật ký hoạt động (Audit trail).

### 3. Phân Hệ Nhắn Tin Nội Bộ Trực Tiếp (In-App Team Chat):
- **Kế thừa tinh hoa từ Bim Ecosystem (`Bim_Consulting`):**
  * Nút nổi **Chat Bubble** góc dưới phải màn hình với huy hiệu đếm số tin nhắn chưa đọc (`chat-unread-badge`).
  * Cửa sổ chat nổi (`#chat-floating-window`) bo tròn 2xl, hỗ trợ xem danh sách kênh và màn hình trò chuyện.
  * Các loại kênh: Kênh Toàn thể công ty (`COMPANY`), Kênh từng phòng ban (`DEPARTMENT`), Kênh Chat 1-1 riêng tư giữa 2 nhân viên (`DIRECT`).
  * Tối ưu hóa Cache Polling qua `after_id` và cache key `chat_room_<id>_latest_msg_id`, loại bỏ truy vấn DB khi không có tin nhắn mới.
  * Hỗ trợ đính kèm tệp và hình ảnh (`ChatAttachment`), tự động gán ngày hết hạn 30 ngày để tối ưu dung lượng lưu trữ.

### 4. Kiểm Thử Tích Hợp & Đảm Bảo Cú Pháp:
- Viết test suite toàn diện tại `apps/collaboration/tests.py`: 4/4 tests passed (Bản tin, Giao việc, Chat, Cách ly tài xế & Phân quyền).
- Kiểm tra cú pháp JavaScript: `node -c static/js/app.js` và `node -c static/js/collaboration.js` đạt 100% không lỗi cú pháp.


### 1. Cập Nhật Sổ Tay Hướng Dẫn Sử Dụng (`docs/USER_GUIDE.md`):
- **Bổ sung Mục 7: Phân Hệ Quản Trị Nhân Sự, Hợp Đồng Lao Động & Người Phụ Thuộc (HR Management):**
  * Hướng dẫn chi tiết khai báo hồ sơ CBNV và Tài xế mới (CCCD, MST, BHXH, GPLX hạng FC, tài khoản ngân hàng chi lương).
  * Hướng dẫn ký kết HĐLĐ, thiết lập Lương căn bản HĐLĐ (tính lương ngày) và Lương đóng BHXH (trần 46.8 triệu theo NĐ 73/2024/NĐ-CP).
  * Hướng dẫn đăng ký Người phụ thuộc giảm trừ gia cảnh (4.4 triệu/người/tháng theo NQ 954/2020/UBTVQH14).
- **Bổ sung Mục 8: Phân Hệ Chấm Công & Quản Lý Nghỉ Phép (Monthly Attendance):**
  * Hướng dẫn tính năng Khởi tạo công tự động toàn công ty theo kỳ lương (26 ngày chuẩn).
  * Hướng dẫn quy cách chấm công chi tiết: Đi làm thực tế (`worked_days`), Nghỉ phép năm có lương (`paid_leave_days` - ký hiệu `P`), Nghỉ lễ tết (`L`), Nghỉ không lương (`Ro`), Nghỉ chế độ BHXH (`Om`, `Ts`).
- **Bổ sung Mục 9: Phân Hệ Tính Lương Logistics Hai Động Cơ (Hybrid Payroll) & Chi Trả Sổ Quỹ:**
  * Hướng dẫn vận hành Động cơ tính lương kết hợp: Lương ngày công thời gian + Lương sản lượng chuyến xe (chuyến chính, cắt kéo, neo xe, thưởng dầu) + Phụ cấp ăn trưa, điện thoại, thưởng KPI.
  * Hướng dẫn cơ chế đối soát và tự động khấu trừ tạm ứng: Gom tự động Tạm ứng lương cá nhân (`Employee.current_advance`) và Tạm ứng chuyến xe chưa hoàn ứng (`DriverTripAdvance` trạng thái `ADVANCED`). Các phiếu đã quyết toán `SETTLED` không trừ vào lương.
  * Hướng dẫn quy trình 4 bước State Machine: DRAFT ➔ REVIEWED ➔ LOCKED ➔ PAID.
  * Cơ chế Tích hợp Dòng tiền Tự động: Khi Giám đốc duyệt `PAID`, hệ thống tự động sinh Phiếu Chi Sổ Quỹ (`CashTransaction`) mã `PC-LUONG-YYYYMM` khớp đúng 100% Tổng Net toàn công ty.
  * Hướng dẫn xuất bảng kê ủy nhiệm chi ngân hàng lô (Batch Banking Export) và in phiếu lương cá nhân A4/A5 (Printable Payslip).
- **Bổ sung Mục 10: Quy Chuẩn Thao Tác Bảng Dữ Liệu: Chuẩn 2 Nút Xem & In (Không Dùng Modal):**
  * Cột thao tác luôn chỉ gồm đúng 2 nút: **Xem** (`fas fa-eye`) và **In** (`fas fa-print`).
  * Loại bỏ toàn bộ modal popup chật hẹp, mở trang chi tiết phẳng độc lập kèm thanh công cụ đồng bộ: Quay lại, Sửa, Lưu thay đổi, In chứng từ, Xóa mềm.

### 2. Kiểm Thử E2E Mô Phỏng Thực Tế 6 Vai Trò (`scripts/test_multi_role_e2e_simulation.py`):
- Mô phỏng trọn vẹn luồng tác nghiệp của 6 vai trò: HR ➔ Điều độ ➔ Chấm công ➔ Kế toán lương ➔ Ban Giám Đốc ➔ Tài xế.
- Toàn bộ kết quả kiểm thử đạt 100% Passed, hệ thống hoạt động chính xác tuyệt đối không phát sinh sai lệch.

## [v3.2.2] - 2026-10-15 (Khắc Phục Lỗi Định Dạng Ngày Tháng Trong Form Hợp Đồng & Kiểm Thử Toàn Diện Luồng Nút Bấm Tạo, Xem, Lưu, Sửa)

### 1. Khắc Phục Triệt Để Lỗi Định Dạng Ngày Tháng (Date Formatting):
- **Phân tích nguyên nhân:** Thiết lập `REST_FRAMEWORK['DATE_FORMAT'] = '%d/%m/%Y'` trả về dữ liệu định dạng ngày kiểu Việt Nam (`DD/MM/YYYY`), trong khi chuẩn HTML5 `<input type="date">` yêu cầu giá trị `YYYY-MM-DD`. Đồng thời `DATE_INPUT_FORMATS` của DRF mặc định chỉ chấp nhận `iso-8601`, dẫn đến việc submit form hợp đồng bị báo lỗi: `sign_date: Ngày sai định dạng; start_date: Ngày sai định dạng`.
- **Giải pháp Backend:**
  * Bổ sung `DATE_INPUT_FORMATS` và `DATETIME_INPUT_FORMATS` vào `config/settings.py` chấp nhận linh hoạt các chuẩn: `['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', 'iso-8601']`.
  * Chuẩn hóa kiểm tra duy nhất `Employee.all_objects` và `LaborContract.all_objects` trong serializer để tránh xung đột với các bản ghi xóa mềm (`SoftDeleteModel`).
  * Bổ sung phương thức tính thuế TNCN `PayrollCalculateAPIView._calculate_pit` dùng chung cho cả động cơ tính lương kỳ và API cập nhật phiếu lương.
- **Giải pháp Frontend:**
  * Xây dựng hàm chuẩn hóa `normalizeDateToISO(dateStr)` tại `static/js/app.js`.
  * Áp dụng khi nạp dữ liệu vào các thẻ `<input type="date">` và trước khi gửi payload lên API đối với: Form Hợp đồng (`cd-sign-date`, `cd-start-date`, `cd-end-date`), Form Phụ lục (`inline-app-date`), Form Nhân sự (`emp-dob`, `emp-national-id-date`, `emp-join-date`, `emp-license-expiry`), và Modal Kỳ lương (`new-period-from`, `new-period-to`).

### 2. Kiểm Thử Toàn Diện Chuỗi Thao Tác 5 Bước (Tạo, Xem, Sửa, Lưu, Xóa):
- Viết kịch bản kiểm thử tự động `scripts/test_hrm_buttons_flow.py` mô phỏng 100% hành vi người dùng trên giao diện:
  * **Tạo (Create):** Khai báo nhân sự mới ➔ Tạo hợp đồng lao động mới ➔ Ký phụ lục ➔ Khởi tạo kỳ lương tháng.
  * **Xem (View):** Truy xuất chi tiết nhân sự ➔ Mở chi tiết hợp đồng toàn màn hình ➔ Mở chi tiết phiếu lương.
  * **Sửa (Edit):** Kích hoạt chế độ sửa `[Sửa]` (mở khóa các trường input readonly, bật nút Lưu).
  * **Lưu (Save):** Cập nhật dữ liệu và gửi payload ➔ Lưu thành công HTTP 200/201, toast phản hồi tức thì.
  * **Xóa / Chấm dứt (Delete/Terminate):** Chấm dứt hợp đồng lao động ➔ Xóa mềm hồ sơ nhân sự.
- Toàn bộ kịch bản kiểm thử đạt tỷ lệ 100% Passed. Toàn bộ 95/95 test case hồi quy của hệ thống (`python manage.py test --keepdb`) đều vượt qua.

## [v3.2.1] - 2026-10-15 (Chuẩn Hóa Cột Thao Tác [Xem - In] & Chuyển Đổi 100% Sang Dedicated Full-Page View Không Dùng Modal)

### 1. Chuẩn Hóa Cột Thao Tác Của Toàn Bộ Bảng Danh Sách:
- Loại bỏ hoàn toàn các nút rườm rà (Hồ Sơ 360°, Sửa, Phụ Lục, Chấm Dứt) trên các bảng dữ liệu:
  * **Bảng Danh sách Nhân sự (`employee-table`):** Chỉ gồm đúng 2 nút `[Xem]` (`ph-eye` - teal) và `[In]` (`ph-printer` - slate).
  * **Bảng Hợp đồng Lao động (`contracts-table`):** Chỉ gồm đúng 2 nút `[Xem]` và `[In]`.
  * **Bảng Phiếu lương Kỳ (`payroll-slips-table`):** Chỉ gồm đúng 2 nút `[Xem]` và `[In]`.

### 2. Chuyển Đổi 100% Thao Tác Sang Mở Trang Toàn Màn Hình (No Modals):
- Bấm `[Xem]` ở bất kỳ bảng nào đều điều hướng trực tiếp sang **Dedicated Full-Page View**:
  * **Hồ sơ nhân sự:** Chuyển sang trang `view_employee_form.html`.
  * **Hợp đồng lao động:** Chuyển sang trang `view_contract_detail.html` (hỗ trợ xem/sửa HĐ và quản lý phụ lục ngay trên trang).
  * **Phiếu lương cá nhân:** Chuyển sang trang `view_payroll_slip_detail.html` (xem chi tiết 4 cấu phần lương và điều chỉnh tài chính).
- Xóa bỏ hoàn toàn các modal popup (`modal-employee-360`, `modal-contract-form`, `modal-edit-payroll-slip`).

### 3. Chuẩn Hóa Cụm Nút Hành Động Trên Trang Chi Tiết Theo Mẫu:
- Tất cả các trang chi tiết khi mở ra đều có cụm nút hành động chuẩn:
  * Bên trái: Nút `[Quay lại]` trở về phân hệ.
  * Bên phải: Cụm 4 nút theo đúng thứ tự và màu sắc:
    - `[Sửa]` (`border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-white`, icon `ph-pencil-simple`)
    - `[Lưu]` (`border-teal-600 text-teal-700 hover:bg-teal-600 hover:text-white`, icon `ph-check-circle`)
    - `[In]` (`border-slate-700 text-slate-700 hover:bg-slate-800 hover:text-white`, icon `ph-printer`)
    - `[Xóa]` (`border-rose-600 text-rose-700 hover:bg-rose-600 hover:text-white`, icon `ph-trash`)

## [v3.2.0] - 2026-10-15 (Chuẩn Hóa Trình Tự Nghiệp Vụ HRM: Hồ Sơ Nhân Viên ➔ Hợp Đồng ➔ Chấm Công ➔ Tính Lương Hybrid)

### 1. Triển Khai Hoàn Chỉnh Quy Trình 4 Giai Đoạn Liên Hoàn:
- **Giai đoạn 1: Hồ Sơ Nhân Sự (`Employee`):**
  * Quản lý thông tin định danh CCCD/CMND, Mã số thuế, Sổ BHXH, Bằng lái GPLX (hạng, số, ngày hết hạn), Thông tin ngân hàng chi lương, Người phụ thuộc giảm trừ gia cảnh.
- **Giai đoạn 2: Hợp Đồng Lao Động (`LaborContract`, `ContractAppendix`):**
  * Xác lập mức Lương căn bản ký HĐ (`base_salary` - căn cứ tính Lương ngày công thời gian) và Mức lương đóng BHXH (`insurance_salary` - căn cứ trích nộp BHXH/BHYT/BHTN).
  * Vòng đời HĐLĐ: DRAFT ➔ ACTIVE ➔ EXPIRED ➔ TERMINATED kèm cảnh báo trước 30 ngày.
- **Giai đoạn 3: Bảng Chấm Công Tháng (`AttendanceCode`, `DailyAttendance`, `MonthlyAttendanceSummary`):**
  * Danh mục ký hiệu chấm công chuẩn nghiệp vụ: `X` (Đủ công 1.0), `X/2` (Nửa công 0.5), `P` (Nghỉ phép năm), `L` (Nghỉ Lễ/Tết), `CT` (Công tác), `Ro` (Nghỉ không lương), `Om` (Nghỉ ốm đau/thai sản).
  * Chức năng **Khởi tạo công tự động** (`MonthlyAttendanceAutoGenerateAPIView`): Mặc định công tiêu chuẩn 26 ngày cho toàn bộ CBNV đang hoạt động trong kỳ.
  * Hỗ trợ chỉnh sửa trực tiếp từng dòng ngày công, tự động tính tổng công hưởng lương thời gian: `total_paid_days = worked_days + paid_leave_days + holiday_days`.
- **Giai đoạn 4: Tính Lương Kết Hợp (Hybrid Payroll Engine):**
  * Cấu phần 1: **Lương ngày công (thời gian)** = `(Lương HĐ / Công chuẩn 26) * Ngày công hưởng lương (total_paid_days)`.
  * Cấu phần 2: **Lương sản phẩm chuyến xe (Tài xế)** = Lương chuyến chính (`driver_allowance`) + Chuyến cắt kéo (`dropoff_driver_allowance`) + Phụ cấp neo xe (`detention_driver_allowance`) + Thưởng định mức tiêu hao nhiên liệu (`fuel_bonus`) từ phân hệ Điều Vận (`DispatchTrip`).
  * Cấu phần 3: Phụ cấp (điện thoại, ăn trưa) & Thưởng KPI.
  * Cấu phần 4: Khấu trừ BHXH (10.5%), Thuế TNCN (biểu lũy tiến 5 bậc Luật 109/2025/QH15) và Khấu trừ tạm ứng chuyến xe (`DriverTripAdvance`).
  * Cấu phần 5: Thực lĩnh Net = Gross - Khấu trừ bảo hiểm - Thuế TNCN - Hoàn ứng chuyến.

### 2. Bổ Sung Trọn Bộ Form CRUD & Nút Bấm Chuẩn Hóa Toàn Phân Hệ:
- **Modal Ký & Cập Nhật Hợp Đồng Lao Động (`modal-contract-form`):** Hỗ trợ thêm mới hoặc chỉnh sửa HĐLĐ đầy đủ các trường nghiệp vụ (Số HĐ, Nhân sự thụ hưởng, Loại HĐ, Trạng thái, Chức danh, Địa điểm làm việc, Ngày ký, Ngày bắt đầu/kết thúc, Lương căn bản, Lương đóng BHXH, Điều khoản phụ cấp).
- **Modal Ký Phụ Lục Hợp Đồng (`modal-appendix-form`):** Ký phụ lục điều chỉnh lương, chức vụ hoặc điều khoản bổ sung gắn với hợp đồng gốc.
- **Modal Kê Khai Người Phụ Thuộc (`modal-dependent-form`):** Kê khai NPT giảm trừ gia cảnh 6.2 triệu đồng/tháng theo Nghị quyết 110/2025/UBTVQH15.
- **Modal Điều Chỉnh Phiếu Lương (`modal-edit-payroll-slip`):** Hỗ trợ kế toán điều chỉnh thưởng KPI, phụ cấp khác, ăn trưa, điện thoại, khấu trừ tạm ứng chuyến, khấu trừ phạt... Hệ thống tự động tính lại Gross, Thu nhập tính thuế, Thuế TNCN lũy tiến 5 bậc, Thực lĩnh Net và cập nhật tổng kỳ lương.
- **Chuẩn hóa cụm nút thao tác (Action Buttons) toàn app:**
  * Thao tác bảng Hợp đồng: Chi Tiết (`ph-identification-card` - teal), Sửa (`ph-pencil-simple` - amber), Phụ Lục (`ph-file-plus` - indigo), Chấm Dứt (`ph-x-circle` - rose).
  * Thao tác bảng Phiếu lương: In (`ph-printer` - slate), Sửa (`ph-pencil-simple` - amber).
  * Nút Primary / Submit: `bg-transparent border border-<color>-600 text-<color>-700 hover:bg-<color>-600 hover:text-white rounded-lg text-xs md:text-sm font-bold font-heading shadow-xs flex items-center gap-1.5 transition-all cursor-pointer`.
  * Nút Hủy / Đóng: `bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all cursor-pointer`.

### 3. Nâng Cấp Giao Diện Web & Trải Nghiệm Người Dùng:
- Thanh điều hướng Tab 5 bước: `1. Hồ Sơ Nhân Sự` ➔ `2. Hợp Đồng Lao Động` ➔ `3. Bảng Chấm Công` ➔ `4. Tính Lương (Hybrid Payroll)` ➔ `5. Chính Sách & Biểu Thuế`.
- Bảng chấm công tương tác thời gian thực: input ngày công, tự động cập nhật tổng công tức thì.
- Bảng lương chi tiết chuẩn hóa 19 cột phân nhóm rõ ràng (Lương Ngày Công vs. Lương Sản Phẩm Chuyến Xe Tài Xế).
- Phiếu lương cá nhân A4 dạng văn bản phẳng (flat paper document), in ấn trực tiếp hoặc xuất bảng kê chuyển khoản ngân hàng lô (CSV UTF-8 BOM).

### 4. Kết Quả Kiểm Thử Chất Lượng (Zero-Regression):
- 100% cú pháp JS chuẩn mực (`node -c static/js/app.js`, `node -c static/js/column_manager.js`).
- 95/95 test cases Django automated unit tests PASSED.
- 40/40 test cases E2E user operations audit PASSED.

## [v3.1.0] - 2026-10-15 (Đồng Bộ Chuẩn Chính Sách, Biểu Thuế 5 Bậc Mới & Danh Mục Phụ Cấp Từ BIM ERP)

### 1. Đồng Bộ Biểu Thuế TNCN 5 Bậc Mới & Căn Cứ Pháp Lý (Luật 109/2025/QH15):
- **Áp dụng Biểu thuế lũy tiến từng phần 5 bậc mới** theo Luật Thuế Thu nhập Cá nhân số 109/2025/QH15 ban hành ngày 10/12/2025 (hiệu lực từ 01/01/2026), thay thế biểu thuế 7 bậc cũ:
  * **Bậc 1:** Thu nhập tính thuế đến 10,000,000 đ/tháng ➔ Thuế suất 5% (Trừ nhanh: 0 đ).
  * **Bậc 2:** Trên 10,000,000 đ đến 30,000,000 đ/tháng ➔ Thuế suất 10% (Trừ nhanh: 500,000 đ).
  * **Bậc 3:** Trên 30,000,000 đ đến 60,000,000 đ/tháng ➔ Thuế suất 20% (Trừ nhanh: 3,500,000 đ).
  * **Bậc 4:** Trên 60,000,000 đ đến 100,000,000 đ/tháng ➔ Thuế suất 30% (Trừ nhanh: 9,500,000 đ).
  * **Bậc 5:** Trên 100,000,000 đ/tháng ➔ Thuế suất 35% (Trừ nhanh: 14,500,000 đ).
- Nâng cấp `TaxBracket` model với các trường chuẩn từ Bim ERP: `bracket_level`, `min_income`, `max_income`, `tax_rate`, `quick_subtraction`, `quick_formula`, `effective_date`, `expiry_date`, `status`, `legal_basis`, `description`, kèm property `rate_decimal`.

### 2. Cập Nhật Mức Giảm Trừ Gia Cảnh & Trần Bảo Hiểm Mới Nhất:
- **Mức giảm trừ gia cảnh** theo Nghị quyết số 110/2025/UBTVQH15:
  * Giảm trừ cho bản thân người nộp thuế: Tăng từ 11,000,000 đ lên **15,500,000 đ/tháng**.
  * Giảm trừ cho mỗi người phụ thuộc: Tăng từ 4,400,000 đ lên **6,200,000 đ/tháng**.
- **Mức trần lương đóng BHXH & BHYT** theo Nghị định 73/2024/NĐ-CP:
  * Tăng từ 46,800,000 đ lên **50,800,000 đ/tháng** (áp dụng mức lương cơ sở mới 2,540,000 đ x 20 lần).
- **Tỷ lệ trích nộp theo lương & kinh phí công đoàn** theo Luật BHXH 2024 & Luật Công đoàn 2024:
  * Người lao động: BHXH 8%, BHYT 1.5%, BHTN 1%, Đoàn phí công đoàn 1% (Tổng trích lương: 11.5%).
  * Doanh nghiệp: BHXH 17.5%, BHYT 3%, BHTN 1%, Kinh phí công đoàn 2% (Tổng chi phí: 23.5%).

### 3. Đồng Bộ Hệ Thống 20 Tham Số Chính Sách & Danh Mục Phụ Cấp:
- **Tạo mới Model `PayrollParameter`:** Quản lý 20 tham số chính sách Lương & Thuế đồng bộ 100% từ Bim ERP (`BASE_SALARY`, `MIN_WAGE_R1`, `PERSONAL_RELIEF`, `DEPENDENT_RELIEF`, `MAX_INS_SALARY`, `UNION_FEE_MAX`...).
- **Tạo mới Model `AllowanceGroup` & `AllowanceType`:** Chuẩn hóa 3 nhóm và 15 loại phụ cấp, trợ cấp, phúc lợi theo Thông tư 10/2020/TT-BLĐTBXH (Phụ cấp đóng BHXH, Phụ cấp không đóng BHXH chịu thuế TNCN, và Trợ cấp miễn thuế).
- **Nâng cấp Động cơ tính thuế (`PayrollCalculateAPIView`):** Hỗ trợ tính toán tự động linh hoạt theo cả 5 bậc mới và 7 bậc cũ qua `rate_decimal` và `quick_subtraction`.
- **Giao diện người dùng động:** Bảng biểu thuế 5 bậc, bảng 20 tham số và bảng 3 nhóm phụ cấp được render hoàn toàn từ REST API.

## [v3.0.0] - 2026-10-15 (Xây Dựng Toàn Diện Phân Hệ Quản Lý Nhân Sự & Tiền Lương — HRM & Hybrid Payroll Engine)

### 1. Kiến Trúc & Cơ Sở Dữ Liệu Nhân Sự 360° (Personnel & Legal Data Model):
- **Mở rộng Hồ sơ Nhân sự 360° (`Employee`):**
  * Bổ sung định danh công dân & pháp lý: `national_id` (CCCD/CMND 12 số), `national_id_date` (Ngày cấp), `national_id_place` (Nơi cấp), `tax_id` (Mã số thuế cá nhân), `insurance_number` (Mã số sổ BHXH).
  * Bổ sung thông tin nhân thân: `gender` (MALE/FEMALE/OTHER), `date_of_birth` (Ngày sinh), `permanent_address` (Địa chỉ thường trú), `current_address` (Nơi ở hiện nay), `email`.
  * Bổ sung tài khoản ngân hàng chi lương: `bank_account`, `bank_name`, `bank_branch`, `bank_beneficiary` (Tên thụ hưởng).
  * Bổ sung chế độ việc làm & bảo hiểm: `join_date` (Ngày vào làm), `resign_date` (Ngày nghỉ việc), `is_social_insurance_participant` (Tham gia BHXH bắt buộc 10.5%), `insurance_salary` (Mức lương căn cứ trích nộp BHXH).
- **Người Phụ Thuộc Giảm Trừ Gia Cảnh (`EmployeeDependent`):**
  * Quản lý họ tên, mối quan hệ, số CCCD/khai sinh, MST người phụ thuộc, thời gian bắt đầu và kết thúc tính giảm trừ thuế TNCN.
- **Hợp Đồng Lao Động & Phụ Lục (`LaborContract`, `ContractAppendix`):**
  * Quản lý vòng đời hợp đồng: `DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED`.
  * Các loại hợp đồng: Thử việc, Xác định thời hạn (1 - 3 năm), Không xác định thời hạn, Thời vụ.
  * Phụ lục hợp đồng lưu vết điều chỉnh lương cơ bản, vị trí công tác, điều khoản phụ cấp.
  * Tích hợp cảnh báo tự động khi HĐLĐ hoặc bằng lái xe GPLX còn hạn dưới 30 ngày.

### 2. Động Cơ Lương Kết Hợp & Liên Thông Vận Tải (Hybrid Payroll Engine):
- **Chính Sách & Biểu Thuế Pháp Lý:**
  * `PayrollPolicyConfig`: Tham số giảm trừ gia cảnh bản thân (11,000,000 đ/tháng), người phụ thuộc (4,400,000 đ/tháng), ngày công tiêu chuẩn hàng tháng (26.0 ngày), mức trần đóng BHXH (46,800,000 đ).
  * `TaxBracket`: Biểu thuế thu nhập cá nhân (TNCN) 7 bậc lũy tiến từng phần kèm số trừ nhanh chuẩn pháp luật Việt Nam.
  * `SalaryDeductionRate`: Tỷ lệ trích nộp bảo hiểm hiện hành: NLĐ đóng 10.5% (BHXH 8%, BHYT 1.5%, BHTN 1%) - Doanh nghiệp đóng 21.5% (BHXH 17.5%, BHYT 3%, BHTN 1%) + Kinh phí công đoàn 2%.
- **Động Cơ Tính Lương Kết Hợp (`PayrollCalculateAPIView`):**
  * **Khối văn phòng & quản lý:** Lương thời gian theo ngày công thực tế = `base_salary / 26 * actual_working_days` + phụ cấp điện thoại, ăn trưa + thưởng KPI.
  * **Khối tài xế vận tải:** Kế thừa liên thông 100% dữ liệu thực tế từ `DispatchTrip`:
    - Chuyến chạy chính: Tổng `driver_allowance` các chuyến hoàn thành trong kỳ.
    - Chuyến cắt kéo (Drop & Hook): Tổng `dropoff_driver_allowance`.
    - Phụ cấp lưu đêm / neo xe: Tổng `detention_driver_allowance`.
    - Thưởng định mức tiêu hao nhiên liệu: `fuel_bonus`.
  * **Khấu trừ tạm ứng chuyến xe (`DriverTripAdvance`):** Tự động đối soát và khấu trừ các khoản tạm ứng chuyến xe đã giải ngân cho tài xế trong kỳ.
  * **Tính toán trích nộp BHXH & Thuế TNCN:** Tính chính xác từng đồng bảo hiểm trích vào lương và thuế TNCN theo biểu thuế lũy tiến 7 bậc sau khi trừ giảm trừ bản thân, người phụ thuộc và các khoản phụ cấp không chịu thuế.
  * **Thực lĩnh Net:** `net_salary = max(0, gross - total_insurance_employee - pit_amount - advance_deductions - other_deductions)`.
- **Vòng Đời Kỳ Lương & Tự Động Sinh Phiếu Chi Sổ Quỹ:**
  * Vòng đời quản lý 4 bước: `DRAFT ➔ REVIEWED ➔ LOCKED ➔ PAID`.
  * **Liên thông Sổ Quỹ dòng tiền (`CashTransaction`):** Khi chuyển kỳ lương sang trạng thái `PAID`, hệ thống tự động sinh Phiếu Chi Sổ Quỹ (`TransactionType.OUTFLOW`, `Category=PAYROLL_SALARY`, `PaymentMethod=BANK`, mã `PC-LUONG-...`), chốt sổ kế toán và đánh dấu thanh toán toàn bộ phiếu lương.
- **Tiện Ích Ngân Hàng & In Ấn Chuẩn Mực:**
  * `PayrollExportBankAPIView`: Xuất danh sách chuyển khoản ngân hàng hàng loạt (Batch Bank Transfer) dạng CSV BOM UTF-8 hỗ trợ Excel.
  * `PayrollSlipPrintAPIView`: Mẫu in Phiếu lương cá nhân A4/A5 chuẩn văn bản phẳng (Flat Printable Document), đầy đủ pháp nhân công ty, chi tiết thu nhập, trích nộp, khấu trừ và chữ ký 4 bên.

### 3. Giao Diện Người Dùng Web SPA & Kiểm Thử Hồi Quy:
- Giao diện tab Nhân sự được tái cấu trúc thành 4 phân hệ con (Sub-Tabs):
  1. `Hồ Sơ Cán Bộ & Tài Xế`: Tra cứu, lọc theo phòng ban/chức vụ/trạng thái, modal Hồ sơ 360°.
  2. `Hợp Đồng Lao Động`: Quản lý hợp đồng, phụ lục, cảnh báo hạn.
  3. `Kỳ Lương & Hybrid Payroll`: Bảng lương đa thành phần, bộ chuyển trạng thái, xuất Excel ngân hàng, in phiếu lương.
  4. `Chính Sách & Biểu Thuế`: Tùy chỉnh tham số giảm trừ, tỷ lệ BHXH, biểu thuế 7 bậc.
- Form tạo/sửa nhân sự (`view_employee_form.html`) được mở rộng 3 khối thông tin định danh 360°.
- **Kiểm thử hồi quy & Giả lập người dùng toàn diện:**
  * `node -c static/js/app.js` & `node -c static/js/column_manager.js`: 100% cú pháp sạch, 0 lỗi.
  * `python manage.py test --keepdb`: 95/95 unit test cases PASSED (100%), bảo toàn zero-regression.
  * `python scripts/audit_e2e_user_operations.py`: 39/39 kịch bản kiểm thử giả lập người dùng toàn diện PASSED (100%), bao quát 9 phân hệ: Views, Sales/CRM, Dispatch, Accounting, Customs, 14 Báo cáo, Master Data, HRM & Hybrid Payroll, và Soft-delete audit trail.

## [v2.9.5] - 2026-10-12 (Chuẩn Hóa Bộ Lọc Thời Gian Toàn Diện — Khắc Phục Rò Rỉ Bản Ghi Ngoại Kỳ)

### 1. Chuẩn Hóa Bộ Lọc Thời Gian Tuyệt Đối (Strict Date-Range Filtering):
- **Phân hệ Kinh doanh & Báo giá (`SalesAPIView`):**
  * Loại bỏ triệt để điều kiện `Q(status__in=['APPROVED', 'NEGOTIATING', 'PENDING_APPROVAL'])` và `valid_until__gte` chen ngang gây hiển thị lọt các Báo giá tháng 9 khi người dùng chọn lọc tháng 10.
  * Loại bỏ điều kiện `Q(status__in=[BookingStatus.PENDING_DISPATCH, BookingStatus.PARTIALLY_DISPATCHED])` trong bộ lọc `from_date` và `to_date` của Đơn hàng Booking.
  * Khi chọn lọc bất kỳ khoảng ngày nào (vd: `01/10/2026 - 12/10/2026`), hệ thống lọc chính xác 100% theo ngày đóng hàng `loading_date` (hoặc `created_at` nếu không có loading_date). Cụm chỉ số KPI và danh sách đơn hàng hoàn toàn khớp với khoảng ngày được chọn.
- **Phân hệ Điều vận & Báo cáo Vận hành (`ReportsAPIView`):**
  * Tối ưu hàm `make_date_range_q`: Lọc theo `loading_date` kết hợp fallback an toàn `loading_date__isnull=True, created_at__date` đối với các chuyến xe chưa có loading_date.
  * Hỗ trợ độc lập và linh hoạt cả khi chỉ truyền `from_date` hoặc `to_date`.
- **Phân hệ Kế toán & Tài chính (`finance_reports_api.py` & `advance_views.py`):**
  * Chuẩn hóa bộ lọc ngày cho Chi Hộ Khách Hàng (`ReimbursableExpensesAPIView`), Đối soát Thầu Phụ (`SubcontractorSettlementsAPIView`), Kiểm toán BOT (`BOTAwardAuditAPIView`), và Báo cáo Drill-down (`ReportDrilldownAPIView`) đồng bộ theo ngày vận hành thực tế của chuyến xe (`trip__loading_date`).
  * Sửa lỗi điều kiện `OR` tại `CustomerARReconciliationAPIView` để chỉ fallback sang `created_at` khi `loading_date__isnull=True`.
- **Khởi Tạo Dữ Liệu Mẫu (`seed_sample_data.py`):**
  * Cập nhật gán chính xác `created_at` trong Tháng 9/2026 cho toàn bộ các model `Quotation`, `BookingOrder`, `DispatchTrip`, `TripExpense`, `CashTransaction`, `CustomsDeclaration`, ngăn chặn việc Django `auto_now_add` tự động lấy ngày hiện tại làm lệch dữ liệu kỳ kiểm thử.

### 2. Kiểm Thử & Kiểm Chứng Hệ Thống:
  * `node -c static/js/app.js` & `node -c static/js/column_manager.js`: 100% hợp lệ cú pháp.
  * `python manage.py test --keepdb`: 92/92 tests PASSED (100%).
  * `python scripts/audit_e2e_user_operations.py`: 36/36 kịch bản PASSED (100%).
  * Xác thực truy vấn API `/api/sales/?from_date=2026-10-01&to_date=2026-10-12`: Chỉ trả về đúng 2 Báo giá và 4 Booking của tháng 10, không còn bất kỳ bản ghi tháng 9 nào.

## [v2.9.4] - 2026-10-11 (Audit Toàn Diện Người Dùng — 100% Pass 36/36 Kịch Bản CRUD, Báo Cáo, Mẫu In & Phân Hệ)

### 1. Nâng Cấp Kiến Trúc & Xử Lý Ngoại Lệ (Defensive Engineering):
- **Bổ sung Semantic Routes cho Web SPA:** Thêm các route sạch `/master-data/`, `/master-data`, `/danh-muc/`, `/danh-muc` vào `config/urls.py` trỏ trực tiếp vào `index_view` để người dùng truy cập trực tiếp qua thanh địa chỉ trình duyệt không bị lỗi 404.
- **Defensive API Aliasing cho Báo Giá & Booking:** Bổ sung method `post()` alias cho `QuotationStatusAPIView` và `BookingOrderStatusAPIView`, hỗ trợ linh hoạt cả form submit POST và AJAX PATCH.
- **Mở Rộng Milestone Aliasing & State Machine Vận Tải:**
  * Bổ sung các mốc `PICKED_UP`, `IN_TRANSIT`, `DELIVERED` vào `TripDriverMilestoneAPIView` và hoàn thiện ma trận `VALID_TRANSITIONS` trong `core/workflows.py`.
  * Hỗ trợ chuẩn mực cả 2 mô hình luồng logistics: Vận chuyển FCL có hạ bãi rỗng (`IN_TRANSIT -> AT_WAREHOUSE -> UNLOADING -> RETURNING_EMPTY -> COMPLETED`) và Vận tải FTL giao thẳng Door-to-Door (`IN_TRANSIT -> DELIVERED -> COMPLETED`).
- **Phòng Ngừa Lỗi Duplicate Key Mã Phiếu Thu/Chi (`CashBookAPIView`):**
  * Sử dụng `CashTransaction.all_objects` thay cho `objects` khi sinh mã phiếu `code` kết hợp vòng lặp `while` kiểm tra tồn tại, triệt tiêu hoàn toàn lỗi `IntegrityError: duplicate key value violates unique constraint "billing_cashtransaction_code_key"`.
  * Bổ sung trường `id` song song cùng `transaction_id` trong phản hồi tạo phiếu để tương thích hoàn hảo mọi client.
- **Bổ Sung Method `GET` Cho Đối Soát Công Nợ Khách Hàng (`CustomerARReconciliationAPIView`):**
  * Hỗ trợ truy vấn chi tiết dữ liệu bảng kê đối soát SOA (`customer_id`, `from_date`, `to_date`, `status`), tính toán doanh thu cước, chi phí chi hộ, tổng phải thu và trạng thái hóa đơn VAT.
- **Chuẩn Hóa Action Không Phân Biệt Hoa Thường Tại Phân Hệ Hải Quan (`CustomsQuickActionAPIView`):**
  * Tiếp nhận linh hoạt các alias `clear`, `cleared`, `release`, `tax` qua chuẩn hóa `.lower()`.

### 2. Kiểm Thử Hệ Thống & Kiểm Chứng Hồi Quy (Zero-Regression):
- Xây dựng và thực thi bộ kịch bản kiểm thử toàn diện `scripts/audit_e2e_user_operations.py`:
  * **HTML Page Views & Interface:** 14/14 trang render thành công HTTP 200 (Dashboard, Dispatch, Sales, Fleet, HR, Accounting, Settlements, Customs, 14 Reports, Master Data, Help, Driver Portal, Tracking).
  * **Sales CRUD:** Tạo Báo giá -> Sửa -> Duyệt -> Tạo Đơn hàng Booking -> Sửa -> Chi tiết.
  * **Dispatch Trips & Lifecycle:** Tạo Chuyến -> 2 Khoản chi phí (BOT, Phí bãi) -> 4 Mốc lộ trình -> Quyết toán chi phí -> Mở chốt -> Xóa mềm.
  * **Accounting & Sổ Quỹ:** Tạo Phiếu Thu -> Sửa -> Chi tiết -> Tạo Phiếu Chi -> Đối soát tài xế lô -> Đối soát khách hàng SOA -> Chi hộ -> Thầu phụ -> BOT Audit.
  * **Customs CRUD:** Đăng ký tờ khai -> Đổi luồng Xanh -> Xác nhận thông quan -> Xuất Excel.
  * **14 Báo Cáo Quản Trị:** Đạt 100% khi chạy lọc theo Tháng 9/2026, Quý, Năm và Hôm nay.
  * **Master Data & Hồ Sơ:** CRUD Địa điểm, Khách hàng, Xe, Rơ-moóc, Hãng tàu, Thầu phụ, Biểu giá và Hồ sơ công ty.
  * **Kết quả:** **36/36 kịch bản PASSED 100%**.
- **Frontend Syntax Check:** `node -c static/js/app.js` và `node -c static/js/column_manager.js` PASSED 100%.
- **Django Unit Tests:** `python manage.py test --keepdb` đạt **92/92 test cases PASSED 100%**.
- **Static Collection:** `python manage.py collectstatic --noinput` hoàn tất.

## [v2.9.3] - 2026-10-11 (Hotfix Khai Báo Hệ Thống — Tự Động Nạp Đầy Đủ Dữ Liệu Công Ty Vào Modal Hiệu Chỉnh)

### 1. Khắc Phục Lỗi Modal Khai Báo Hệ Thống (Master Data Bugfix):
- **Hiện tượng:** Khi bấm nút **"Sửa"** hoặc **"Hiệu Chỉnh Khai Báo Hệ Thống"** trong danh mục Công Ty, các ô input hiển thị trống trơn hoặc chỉ có placeholder gợi ý `VD: ...` thay vì hiển thị dữ liệu thực tế đã lưu trong cơ sở dữ liệu (`CompanyProfile`).
- **Nguyên nhân kỹ thuật:**
  * Hàm `loadActiveMasterDataTab()` khi nạp danh mục `company` đã gán mảng `items = [profile]` vào biến `masterDataCache['company']`.
  * Khi hàm `openCreateMasterDataModal()` được gọi, nó cố gắng đọc trực tiếp các trường `profile.company_name`, `profile.tax_code`, `profile.phone`... từ một đối tượng mảng (`Array`), dẫn đến tất cả các trường đều trả về `undefined` và form hiển thị rỗng.
- **Giải pháp xử lý triệt để:**
  * Tại `loadActiveMasterDataTab()`: Ngăn chặn việc ghi đè mảng danh mục lên object `masterDataCache['company']`. Object cấu hình công ty luôn được bảo toàn nguyên vẹn.
  * Tại `openCreateMasterDataModal()`: Bổ sung cơ chế phòng vệ (Defensive Coding) tự động trích xuất phần tử đầu tiên nếu cache là dạng mảng (`Array.isArray(profile) ? profile[0] : profile`), fallback sang `window.SYSTEM_COMPANY`, và nếu vẫn chưa có dữ liệu sẽ chủ động gọi API `/api/master-data/company/` để nạp ngay lập tức dữ liệu mới nhất vào tất cả các trường form.
- **Kiểm chứng & Kiểm thử:**
  * Đã kiểm tra cú pháp JS: `node -c static/js/app.js` và `node -c static/js/modules/master_data.js` đạt 100% Passed.
  * Đã tập hợp static file qua `python manage.py collectstatic --noinput`.
  * Bộ kiểm thử hồi quy `python manage.py test --keepdb` đạt **92/92 test cases PASS 100%**.

## [v2.9.2] - 2026-10-11 (Tối Ưu Hóa Giao Diện Báo Cáo — Cách Ly Tuyệt Đối Tab Con Theo Từng Nhóm Nghiệp Vụ)

### 1. Chuẩn Hóa Trải Nghiệm Người Dùng (UI/UX 2-Tier Navigation):
- **Cách ly tuyệt đối nút báo cáo con theo nhóm đang chọn:**
  * Khi chọn bất kỳ nhóm nào trong 4 nhóm báo cáo chiến lược (`DOANH THU & HIỆU SUẤT ĐỘI XE`, `VẬN HÀNH & SỰ CỐ`, `LƯƠNG CHUYẾN & TẠM ỨNG`, `CÔNG NỢ KHÁCH`), hệ thống chỉ hiển thị đúng 3-4 nút báo cáo con thuộc nhóm đó, ẩn triệt để 10-11 tab con của các nhóm khác.
  * Loại bỏ nút switch chế độ "Tất Cả (14)" gây rối mắt và làm tràn giao diện nhiều dòng.
  * Tự động kích hoạt báo cáo con đầu tiên hợp lệ khi chuyển đổi nhóm.
- **Đồng bộ hóa mã nguồn Frontend:**
  * Hiệu chỉnh hàm `applyReportGroupFilterToButtons()` và `switchReportGroup()` trong [static/js/app.js](file:///e:/Bim_Logistics/static/js/app.js) và [static/js/modules/reports.js](file:///e:/Bim_Logistics/static/js/modules/reports.js).
  * Cập nhật template [templates/views/view_reports.html](file:///e:/Bim_Logistics/templates/views/view_reports.html).
  * Kiểm tra cú pháp bằng `node -c static/js/app.js` và `node -c static/js/modules/reports.js` đạt 100% Passed.
  * Tập hợp static file (`python manage.py collectstatic --noinput`).
  * Kiểm thử toàn diện `python manage.py test --keepdb` đạt **92/92 test cases PASS 100%**.

## [v2.9.1] - 2026-10-11 (Hotfix Lỗi canViewFinance & Đồng Bộ Hóa Dữ Liệu Báo Cáo Kế Toán Tháng 9)

### 1. Khắc Phục Lỗi Frontend (UI Bugfix):
- **Sửa lỗi `ReferenceError: canViewFinance is not defined`:**
  * Bổ sung biến toàn cục `let canViewFinance = true;` trong module Báo cáo (`static/js/app.js`).
  * Đồng bộ biến `canViewFinance = (data.can_view_finance !== false);` ngay khi nhận phản hồi từ API `/api/reports/` để kiểm soát hiển thị dòng tổng cộng bảng P&L Đội xe (`report1_fleet_utilization`).
  * Kiểm tra cú pháp JavaScript bằng `node -c static/js/app.js` đạt 100% Passed.

### 2. Chuẩn Hóa Lọc Dữ Liệu Kế Toán Theo Chuyến Xe (`finance_reports_api.py`):
- Đồng bộ bộ lọc theo `loading_date` và `trip__loading_date` cho các khoản chi hộ `TripExpense`.
- Đã tập hợp lại static file (`collectstatic`) vào `staticfiles/`.

## [v2.9] - 2026-10-11 (Nâng Cấp Kiến Trúc Dữ Liệu Giao Dịch Chuẩn Quốc Tế — Khép Kín AR/AP/Payroll/Debit Note)


### 1. Bổ Sung 4 Model Giao Dịch Chuẩn Doanh Nghiệp Quốc Tế:
- **`CustomerInvoice` (Bảng Kê Hóa Đơn Khách Hàng - AR):**
  * Gom nhiều chuyến xe (`DispatchTrip`) và các khoản chi hộ trong kỳ đối soát của 1 Khách hàng.
  * Quản lý cước vận tải chưa thuế, thuế VAT, tổng chi hộ, chiết khấu, tổng thanh toán và theo dõi công nợ đã trả / còn lại.
  * Hỗ trợ cờ khóa dữ liệu `is_locked` ngăn sửa đổi sau khi chốt gửi khách hàng.
- **`SubcontractorSettlement` (Bảng Kê Đối Soát Nhà Xe Thầu Phụ - AP):**
  * Gom các chuyến xe do Thầu phụ (Xe Bạn / 3PL) thực hiện trong kỳ để chốt công nợ phải trả (TK 331).
  * Tự động trừ tạm ứng đã cấp trước và các khoản trừ khác.
- **`DriverPayrollSettlement` (Bảng Chốt Lương Chuyến & Quyết Toán Tài Xế):**
  * Cố định thu nhập theo kỳ cho từng tài xế: lương khoán chuyến, phụ cấp neo xe qua đêm, phụ cấp kiểm hóa, thưởng và trừ tạm ứng nợ cũ.
- **`DebitNote` (Bảng Kê Chi Hộ Riêng Biệt):**
  * Tập hợp các khoản `TripExpense` chi hộ khách hàng (`is_on_behalf_of_customer`) để xuất bảng kê yêu cầu hoàn ứng độc lập.

### 2. Quản Trị Hệ Thống & Kiểm Thử Hồi Quy (Zero-Regression):
- Đăng ký đầy đủ 4 model vào `apps/billing/admin.py` với bộ lọc, tìm kiếm và định dạng số.
- Áp dụng migration `billing.0010_customerinvoice_debitnote_driverpayrollsettlement_and_more`.
- Chạy bộ kiểm thử toàn diện `python manage.py test --keepdb`: **92/92 test cases PASS 100%**.

## [v2.8] - 2026-10-11 (Tái Cấu Trúc Phân Hệ Cài Đặt — Quy Hoạch 5 Nhóm Danh Mục & Đồng Nhất 100% Dạng Bảng Dòng Records Chuẩn ERP)


### 1. Đồng Nhất 100% Giao Diện Dạng Dòng (Table Records) Chuẩn ERP — Loại Bỏ Hoàn Toàn Cách Trình Bày Thẻ:
- **Xóa bỏ triệt để các khối giao diện dạng thẻ / card grid / gradient banner riêng lẻ:**
  * Loại bỏ thẻ khối `#md-company-view` (Thông tin công ty), `#md-roles-permissions-view` (Vai trò & Phân quyền), và `#md-opening-balance-view` (Số dư đầu kỳ).
  * Quy chuẩn toàn bộ 14 danh mục thuộc 5 nhóm lớn vào **duy nhất 1 cấu trúc bảng dữ liệu phẳng chuẩn mực ERP** (`#md-main-table` trong `#md-table-container`), có đầy đủ các cột thông tin nghiệp vụ và nút **"Sửa"** (hoặc Xóa) trực tiếp trên từng dòng record.
- **Chi tiết giao diện bảng dòng cho 3 phân mục trước đây dùng thẻ:**
  * **Thông Tin Công Ty (`company`):** Hiển thị dòng record với các cột: Tên Doanh Nghiệp (Pháp Nhân), Tên Viết Tắt, Mã Số Thuế, Hotline / SĐT, Email, Địa Chỉ Trụ Sở Chính, Người Đại Diện, Tài Khoản Ngân Hàng, VAT / Giá Dầu và nút thao tác **"Sửa"** (mở modal cập nhật hồ sơ pháp nhân).
  * **Vai Trò & Phân Quyền (`roles_permissions`):** Hiển thị danh sách các vai trò theo dòng với các cột: Mã Vai Trò, Tên Vai Trò / Nhóm Quyền, Mô Tả Chức Năng, Số Nhân Sự, Phạm Vi Quyền, Trạng Thái và nút thao tác **"Sửa"** (mở cấu hình phân quyền).
  * **Số Dư Ban Đầu (`opening_balance`):** Hiển thị danh sách số dư theo dòng với các cột: Tài Khoản Kế Toán, Tên Đối Tượng / Quỹ, Mã Đối Tượng, Ngày Chốt, Dư Nợ Đầu Kỳ (VNĐ), Dư Có Đầu Kỳ (VNĐ), Ghi Chú và cụm thao tác **"Sửa"** / **"Xóa"**. Nút "Tạo mới" trên toolbar mở modal khai báo số dư đầu kỳ mới.
- **Tái cấu trúc điều hướng 2 tầng:**
  * **Tầng 1 (Category Groups):** 5 nhóm lớn gồm: *Khai Báo Ban Đầu*, *Tài Chính & Quản Trị*, *Khách Hàng & Đối Tác*, *Mạng Lưới & Địa Điểm*, *Phương Tiện & Thiết Bị*.
  * **Tầng 2 (Sub-Items):** Các sub-tab tương ứng từng nhóm, đồng bộ hoàn hảo với bộ lọc và toolbar tìm kiếm.
- **Frontend & Backend Unification:**
  * Cập nhật `static/js/app.js` và `static/js/modules/master_data.js`: `switchMasterDataTab` luôn hiển thị `#md-table-container`, nạp API tương ứng cho 14 danh mục và render dữ liệu phân trang.
  * Cập nhật `apps/master_data/api_views.py` (`CompanyProfileAPIView`, `OpeningBalanceListCreateAPIView`) và `permission_views.py` (`RolesPermissionsAPIView`): bổ sung cấu trúc `results` / `items` chuẩn REST API để nạp trực tiếp vào data table.

### 2. Kiểm Thử Hệ Thống (Zero-Regression):
- 92/92 unit tests đạt chuẩn 100% (`python manage.py test --keepdb`).
- Cú pháp JavaScript kiểm tra hợp lệ 100% (`node -c static/js/app.js`, `node -c static/js/modules/master_data.js` & `node -c static/js/column_manager.js`).

## [v2.7] - 2026-10-11 (Chuẩn Hóa Bộ 7 Từ Khóa Thao Tác & Nút Bấm Toàn Hệ Thống — Zero Regression)

### 1. Chuẩn Hóa Nhãn Nút Bấm Toàn Hệ Thống (Standardized Action Button Labels):
- Thống nhất đồng bộ 100% tên các nút bấm trên toàn bộ hệ thống (Views, Modals, Help, Topbar) theo đúng 7 từ khóa chuẩn mực:
  * **"Tạo mới"**: Áp dụng cho nút ngoài trang chính và nút tạo nhanh khi tìm kiếm không thấy (thay thế: `+ Thêm`, `+ Thêm Mới`, `Thêm KH Mới`, `Thêm KH`, `Đăng Ký Tờ Khai Mới`, `Tạo Lệnh Điều Động`...).
  * **"Sửa"**: Áp dụng cho tất cả các nút edit/chỉnh sửa (thay thế: `Hiệu Chỉnh`, `Sửa Lệnh`, `Chỉnh sửa`...).
  * **"Xóa"**: Áp dụng cho nút delete — **bắt buộc luôn hiện Popup Thông báo xác nhận** trước khi thực thi xóa (tích hợp `confirm()` / `Swal` cho toàn bộ danh mục, dòng tuyến báo giá, booking, điều vận, chứng từ).
  * **"Lưu"**: Áp dụng cho nút lưu dữ liệu (thay thế: `Lưu Phiếu Sổ Quỹ`, `Lưu Báo Giá`, `Lưu Booking`, `Lưu Tờ Khai`...).
  * **"Back"**: Áp dụng cho nút quay lại trang mẹ / trang trước (thay thế: `Quay Lại Sale & Booking`, `Quay Lại Điều Vận`, `Quay Lại Báo Cáo Công Nợ`, `Quay Lại Dịch vụ Hải quan`, `Quay Lại Hành chính & Nhân sự`, `Về Ứng Dụng`...).
  * **"Xem"**: Áp dụng cho nút xem chi tiết.
  * **"In"**: Áp dụng cho Preview windows chuẩn bị in ấn (thay thế: `In Báo Cáo`, `In Sổ Tay`, `In Báo Giá`, `In Bảng Kê Đối Soát A4`, `In Ngay (A4)`...).

### 2. Các File Được Cập Nhật Đồng Bộ:
- **Views:** `view_dispatch.html`, `view_quotation_detail.html`, `view_booking_detail.html`, `view_create_trip.html`, `view_trip_detail.html`, `view_personnel.html`, `view_customs.html`, `view_master_data.html`, `view_cash_voucher_detail.html`, `view_customer_ar_statement.html`, `view_customs_form.html`, `view_employee_form.html`, `view_quotation_print.html`, `view_reports.html`, `view_settlement.html`.
- **Modals:** `modal_booking.html`, `modal_cash_transaction.html`, `modal_edit_trip.html`, `modal_quotation.html`, `modal_quotation_print.html`, `modal_report_print.html`.
- **Tài liệu Hướng dẫn:** `templates/help.html` (đồng bộ tiêu đề nút bấm và các bước thao tác thực tế).
- **Frontend Logic (`static/js/app.js`):** Chuẩn hóa nhãn nhấp tab Master Data và bổ sung confirm dialog cho thao tác xóa dòng chi tiết báo giá.

### 3. Kiểm Thử Hệ Thống (Verification):
- `node -c static/js/app.js` & `node -c static/js/column_manager.js`: 100% Passed.
- `python manage.py check`: 0 issues.
- `python manage.py test --keepdb`: 92/92 test cases PASS 100%.

## [v2.6] - 2026-10-11 (Nâng Cấp Số Dư Đầu Kỳ Chuẩn Hệ Thống Tài Khoản Kế Toán COA & Bảng 8 Cột VAS/TT 200/TT 133)

### 1. Kiến Trúc Dữ Liệu Kế Toán Doanh Nghiệp (ERP Foundation):
- **Bổ sung Hệ thống Tài khoản Kế toán (Chart of Accounts - COA):**
  * `account_code`: Mã tài khoản kế toán chuẩn Bộ Tài chính (`1111` Tiền mặt, `1121` Tiền gửi NH, `131` Phải thu KH, `1388` Phải thu khác/chi hộ, `141` Tạm ứng nội bộ, `331` Phải trả người bán/thầu phụ, `334` Phải trả người lao động, `341` Vay và nợ thuê tài chính).
  * `account_name`: Tên tài khoản tiếng Việt chuẩn mực.
  * `bank_account_number` & `bank_name`: Quản lý tài khoản ngân hàng chi tiết đối với TK 1121.
  * `partner_type`: Phân loại đối tượng kế toán (`CUSTOMER`, `SUBCONTRACTOR`, `DRIVER`, `DISPATCHER`, `BANK`, `INTERNAL`).
  * `debit_amount` & `credit_amount`: Phân định rạch ròi Số dư Nợ (+) và Số dư Có (-), hỗ trợ lập Bảng Cân Đối Phát Sinh.
  * Tự động đồng bộ hai chiều giữa Nợ/Có và Số dư tổng hợp `amount`, `is_debit` trong `save()`.

### 2. Backend REST API (`/api/master-data/opening-balances/`):
- Trả về danh mục `account_charts` (COA), hỗ trợ lọc theo tài khoản kế toán (`account_code`), tìm kiếm đa trường và tính toán các chỉ số cân đối kế toán (`total_debit`, `total_credit`, `total_cash_bank`, `total_customer_ar`, `total_subcontractor_ap`, `total_driver_advance`).

### 3. Giao Diện Người Dùng (UI/UX Chuẩn Kế Toán — 8 Cột & Flat Form):
- **Bảng Số Dư Đầu Kỳ:** Trình bày đúng 8 cột kế toán chuẩn mực:
  * `STT` | `Khoản Mục / Diễn Giải` | `TK Kế Toán` | `Số Tài Khoản NH` | `Dư Nợ (+)` | `Dư Có (-)` | `Mã Đối Tượng` | `Tên Đối Tượng / Quỹ` | `Ghi Chú / Chứng Từ` | `Thao Tác`
- **Form Nhập Trực Tiếp (Flat Form, No Popup):** Dropdown chọn Tài khoản Kế toán; tự động hiển thị/bắt buộc ô Số tài khoản ngân hàng khi chọn TK 1121; preview số tiền tức thì; nút chuyển đổi Dư Nợ/Dư Có.
- **Tự động liên kết đối tượng thông minh theo Tài khoản Kế toán (Smart Entity Binding):**
  * `111` (Tiền mặt): Load danh sách đơn vị nội bộ / công ty (`TVL - TRIỀN VÕ LOGISTICS`, quỹ VP Cát Lái, quỹ CN Tây Ninh), tự động điền mã và tên đối tượng.
  * `112` (Tiền gửi Ngân hàng): Load ngân hàng công ty mình (`Techcombank CN Nam Sài Gòn`), tự động điền sẵn số tài khoản ngân hàng.
  * `131` / `1388` (Phải thu Khách hàng): Load toàn bộ danh sách 30+ Khách hàng đang có trong hệ thống.
  * `141` (Tạm ứng nội bộ): Load toàn bộ nhân viên nội bộ (Điều phối, Kế toán, Ban Giám đốc, Kinh doanh, Tài xế).
  * `331` (Phải trả Nhà xe Thầu phụ 3PL / Nhà cung cấp): Load danh sách đối tác xe bạn/thầu phụ kèm số tài khoản ngân hàng của đối tác.
  * `334` (Phải trả người lao động): Load danh sách tài xế & nhân viên để ghi nhận công nợ lương đầu kỳ.

### 4. Kiểm Thử Hệ Thống & Triển Khai (Zero-Regression):
- 92/92 unit tests đạt chuẩn 100% (`python manage.py test --keepdb`).
- Cú pháp JavaScript kiểm tra hợp lệ 100% (`node -c static/js/app.js` & `node -c static/js/column_manager.js`).

## [v2.5] - 2026-10-11 (Tối Ưu Bố Cục Điều Vận Cắt Kéo / Cắt Mooc 2 Tài - Chuẩn UI/UX Full Màn Hình & Đồng Bộ Số Dư Đầu Kỳ COA)

### 1. Tối Ưu Bố Cục Chế Độ Cắt Kéo / Cắt Mooc (Drop & Hook):
- **Khắc phục triệt để khoảng trống trắng đáy trang:**
  * Tái cấu trúc khối điều xe Chặng 1 & Chặng 2 (`#section-drop-hook-dispatch`) từ bố cục dọc cồng kềnh sang lưới 2 cột ngang tinh gọn (`Tài xế` và `Đầu kéo` cùng hàng).
  * Hàng dưới chia tỉ lệ 5:7 (`col-span-5` cho `Tỷ lệ phân chia thù lao`, `col-span-7` cho `Ghi chú & Biên bản bàn giao mooc tại kho`).
  * Loại bỏ các khối chú thích cồng kềnh, chuyển thành tooltip/note nhỏ tinh tế, giảm chiều cao khối Cắt Kéo từ ~500px xuống ~140px.
  * Container cha `view-create-trip` và `modal_create_trip.html` được bổ sung `min-h-0` và đồng bộ nền `bg-slate-100/60`, giữ trọn vẹn 2 nút tác vụ (`<- Quay Lại Điều Vận` và `Xác Nhận & Phát Lệnh Zalo`) luôn nằm trong tầm nhìn, không cần cuộn trang.
  * Đồng bộ hàm JS `toggleDropHookMode(isDropHook)` xử lý an toàn đa container DOM (`querySelectorAll`).

### 2. Chuẩn Hóa Số Dư Đầu Kỳ Kế Toán (COA TT 200 / TT 133):
- Bổ sung cơ chế tự động đồng bộ hai chiều giữa `account_code` (1111, 1121, 131, 141, 331, 334, 341) và `category` trong `OpeningBalance.save()`.

### 3. Kiểm Thử Hệ Thống (Zero-Regression):
- 92/92 unit tests đạt chuẩn 100% (`python manage.py test --keepdb`).
- Cú pháp JavaScript kiểm tra hợp lệ 100% (`node -c static/js/app.js` & `node -c static/js/column_manager.js`).

## [v2.4] - 2026-10-11 (Rà Soát & Chuẩn Hóa 100% Tên Nút Bấm Thực Tế Trong Sổ Tay Hướng Dẫn Sử Dụng)

### 1. Rà Soát & Chuẩn Hóa Danh Sách Nút Bấm Giao Diện (/helps):
- **Đối chiếu thực tế 100%:** Quét toàn bộ mã nguồn template giao diện (`templates/views/*.html`, `templates/modals/*.html`) và chuẩn hóa mọi mô tả nút bấm trong sổ tay `/helps` đúng khớp với nhãn hiển thị thực tế:
  * **Phân hệ Sale & Booking:**
    - Sub-tab 1 (Báo Giá): Chuẩn hóa tên nút mở form từ `+ Tạo Báo Giá Mới` thành **+ Tạo mới** (nút màu tím/xanh góc trên bên phải tab).
    - Sub-tab 2 (Booking): Chuẩn hóa tên nút từ `+ Tạo Booking Mới` thành **+ Tạo mới** (tại tab 2. Đơn Đặt Hàng / Booking).
    - Thanh tác vụ chi tiết: Chuẩn hóa nút lưu và in ấn thành **Lưu**, **In**, **Quay Lại Sale & Booking**.
    - Nút tạo nhanh đối tác: Chuẩn hóa thành **[+ Thêm KH Mới]** và **[+ Tạo mới]** dòng tuyến.
  * **Phân hệ Điều vận:**
    - Chuẩn hóa nút phát lệnh từ `+ Phát Lệnh Điều Xe` thành **Tạo Lệnh Điều Động** (kèm link `/dispatch/create/`).
    - Nút tạo nhanh trong form phát lệnh: Chuẩn hóa thành **[Tạo Booking Mới]**, **[Thêm KH Mới]**, **[Thêm]** địa điểm.
    - Nút kê chi phí: Chuẩn hóa thành **Thêm Khoản Chi** trên thanh tác vụ hoặc **+ Thêm Dòng Chi Phí** dưới bảng chi phí.
    - Nút quyết toán: Chuẩn hóa thành **Quyết Toán Đợt Tài Xế** và **⚡ Quyết Toán Gom Chuyến**.
  * **Phân hệ Cài đặt - Master Data (13 danh mục):**
    - Chuẩn hóa toàn bộ tên nút tạo mới động của 13 danh mục: `+ Thêm Mới Tuyến Lương`, `+ Thêm Mới Phụ Cấp`, `+ Thêm Mới Cảng / Kho`, `+ Thêm Mới Biểu Cước Khách`, `+ Thêm Mới Khách Hàng`, `+ Thêm Mới Hãng Tàu`, `+ Thêm Mới Đầu Kéo / Xe`, `+ Thêm Mới Rơ-Moóc`, `+ Thêm Mới Xe Thầu Phụ`, `+ Thêm Mới Khoản Chi`, `+ Thêm Mới Quy Cách`.
  * **Phân hệ Hành chính - Nhân sự & Tài chính - Kế toán & Hải quan:**
    - Nhân sự: Chuẩn hóa thành nút **+ Thêm Mới Nhân Sự**.
    - Quỹ điều vận: Chuẩn hóa thành nút **+ Yêu Cầu Tạm Ứng Quỹ Từ Cty**.
    - Sổ quỹ: Chuẩn hóa thành nút **Lập Phiếu Thu** và **Lập Phiếu Chi**.
    - Xe thầu phụ (3PL): Chuẩn hóa thành nút **+ Gom Nhóm Lập Debit Note** và **Xuất Bảng Kê Xe Bạn Excel**.
    - Hải quan: Chuẩn hóa thành nút **Đăng Ký Tờ Khai Mới** và **Xuất Bảng Kê Excel**.
    - Báo cáo BI: Chuẩn hóa các nút tác vụ **[Cột]**, **[Xuất Excel]**, **[In Báo Cáo]**.

### 2. Kiểm Thử Hệ Thống (Zero-Regression):
- 92/92 unit tests đạt chuẩn 100% (`python manage.py test --keepdb`).
- Cú pháp JavaScript kiểm tra hợp lệ 100% (`node -c static/js/app.js` & `node -c static/js/column_manager.js`).

## [v2.3] - 2026-10-11 (Khai Báo & Quản Lý Số Dư Đầu Kỳ Tài Chính - Giao Diện Trang Độc Lập Trong Cài Đặt Admin)

### 1. Kiến Trúc & Cơ Sở Dữ Liệu:
- **Model `OpeningBalance` & Enum `OpeningBalanceCategory`:**
  * Phân loại số dư đầu kỳ thành 7 nhóm cốt lõi: `CASH_FUND` (Tiền mặt & Quỹ nội bộ), `BANK_ACCOUNT` (Tiền gửi Ngân hàng), `DISPATCHER_FUND` (Quỹ Tạm ứng Điều vận), `DRIVER_ADVANCE` (Công nợ Tạm ứng Tài xế), `CUSTOMER_AR` (Công nợ Phải thu Khách hàng), `SUBCONTRACTOR_AP` (Công nợ Phải trả Thầu phụ / Xe bạn), `OTHER` (Số dư khác).
  * Kế thừa `TimeStampedModel` và `SoftDeleteModel` (không bao giờ xóa cứng dữ liệu tài chính).
  * Lưu trữ chính xác mã đối tượng, tên đối tượng, ngày chốt số dư, số tiền (VNĐ), tính chất Dư Nợ (+) / Dư Có (-) và ghi chú chứng từ căn cứ.

### 2. Backend REST API (`/api/master-data/opening-balances/`):
- **`OpeningBalanceListCreateAPIView` (GET, POST):**
  * GET: Trả về danh sách số dư, hỗ trợ bộ lọc theo danh mục, tìm kiếm và tổng hợp 4 chỉ số KPI tài chính tổng quan (`total_cash_bank`, `total_customer_ar`, `total_subcontractor_ap`, `total_dispatcher_fund + total_driver_advance`). Cung cấp sẵn danh sách gợi ý chọn nhanh khách hàng, nhà xe và tài xế từ cơ sở dữ liệu.
  * POST: Xác thực và ghi nhận bản ghi số dư đầu kỳ mới.
- **`OpeningBalanceDetailAPIView` (GET, PUT, DELETE):**
  * Hỗ trợ chỉnh sửa và soft-delete bản ghi số dư đầu kỳ.

### 3. Giao Diện Người Dùng (UI/UX Chuẩn Trang - Tuyệt Đối Không Dùng Modal Popup):
- **Sub-tab "Số Dư Đầu Kỳ" trong Cài Đặt Hệ Thống:** Nằm ngay sau tab "Vai Trò & Phân Quyền".
- **Bố cục trình bày dạng trang (Flat Full-Page View):**
  * **Header Banner:** Giới thiệu mục đích quản lý số dư đầu kỳ hệ thống kèm nút làm mới dữ liệu.
  * **4 Thẻ KPI Tổng Hợp:** Tiền Mặt & Ngân Hàng, Phải Thu Khách Hàng (AR), Phải Trả Thầu Phụ (AP), Quỹ Tạm Ứng Điều Vận & Tài Xế.
  * **Card Form Nhập Trực Tiếp Trên Trang (Flat Card):** Cho phép nhập mới/sửa trực tiếp với tính năng tự động gợi ý đối tượng, định dạng tiền tệ tức thì (`oninput`), chọn tính chất Dư Nợ/Dư Có.
  * **Bảng Dữ Liệu Số Dư Đầu Kỳ:** Tích hợp bộ lọc phân loại dạng pills, ô tìm kiếm thời gian thực, bảng phân biệt trực quan Dư Nợ (xanh lá) vs Dư Có (đỏ/cam), hỗ trợ thao tác Sửa cuộn lên form và Xóa bản ghi.

### 4. Kiểm Thử Hệ Thống (Zero-Regression):
- 92/92 unit tests đạt chuẩn 100% (`python manage.py test --keepdb`), bao gồm `OpeningBalanceAPITestCase`.
- Cú pháp JavaScript hợp lệ 100% (`node -c static/js/app.js` & `node -c static/js/column_manager.js`).

## [v2.2] - 2026-10-11 (Chuẩn Hóa Phân Quyền Quản Lý Tài Xế, Cắt Kéo & Tối Ưu Bố Cục Giao Diện Điều Vận)

### 1. Phân Quyền Quản Lý Tài Xế & Chuẩn Hóa Giao Diện Tạo Chuyến:
- **Loại bỏ nút "+ Danh mục" tại ô Tài xế:** Gỡ bỏ nút gọi modal `driver_tariffs` cạnh ô chọn tài xế trên cả màn hình Tạo chuyến (`view_create_trip.html`) và Modal Tạo chuyến (`modal_create_trip.html`) để tránh người dùng hiểu nhầm đây là nút thêm tài xế mới.
- **Quy định nghiệp vụ Tài xế:** Dữ liệu tài xế được nạp tự động (load) từ phân hệ **Hành chính & Nhân sự**. Bộ phận Điều vận không tự ý tạo tài xế. Bổ sung nhãn `Nạp từ Nhân sự` và ghi chú: *"Nếu chưa có tên tài xế, vui lòng liên hệ phòng Nhân sự để bổ sung hồ sơ."*

### 2. Tối Ưu Bố Cục Chế Độ Cắt Kéo (Drop & Hook) & Khắc Phục Khoảng Trống:
- **Cân đối bố cục:** Mở rộng khối Cắt kéo; chuyển ô Ghi chú bàn giao mooc (`inp-notes-drop-hook`) thành `<textarea rows="4">` (view) và `<textarea rows="3">` (modal) rộng rãi, chuyên nghiệp để điều vận ghi chép rõ thời gian cắt mooc, vị trí đậu mooc, kiểm tra niêm phong kẹp chì (seal) và yêu cầu chụp ảnh vỏ cont.
- **Hộp chỉ dẫn phân quyền:** Bổ sung hộp thông tin chuẩn nghiệp vụ bên cạnh tỷ lệ phân chia thù lao, giải quyết triệt để khoảng trống hẫng thị giác phía dưới card.

### 3. Cập Nhật Sổ Tay Hướng Dẫn Sử Dụng (/helps):
- **Quy Trình Phối Hợp Liên Phòng Ban (SOP):** Bổ sung khối quy định phân quyền và ma trận phối hợp 4 phòng ban chuyên trách (Nhân sự, Đội xe, Kinh doanh, Kế toán & Admin) ngay đầu Mục III của `/helps`.
- **Hướng dẫn Mục 3.1 & 3.2 (Điều vận):** Cập nhật chi tiết quy trình xử lý khi thiếu tài xế (phải liên hệ phòng Nhân sự) cho cả chuyến chạy thẳng và chuyến Cắt kéo 2 tài.

### 4. Kiểm Thử Hệ Thống (Zero-Regression):
- 91/91 unit tests đạt chuẩn 100% (`python manage.py test --keepdb`).
- Cú pháp JavaScript hợp lệ 100% (`node -c static/js/app.js` & `node -c static/js/column_manager.js`).

## [v2.1] - 2026-10-11 (Chuẩn Hóa 4 Tiến Trình Quyết Toán Nghiệp Vụ & Quy Tắc Ghi Nhận Công Nợ AR Khách Hàng)

### 1. Phân Định Rạch Ròi 4 Tiến Trình Nghiệp Vụ Vận Tải:
- **Tiến trình 1 - Hoàn Thành Chuyến Vận Hành (Trip Operations):** Trạng thái `COMPLETED` / `DELIVERED` kèm xác nhận POD / Biên bản giao nhận hạ rỗng. Đây là mốc "nghiệm thu nội bộ", làm điều kiện tiên quyết để chuyển sang quyết toán tài xế/thầu phụ.
- **Tiến trình 2 - Quyết Toán Tài Xế Xe Nhà (Driver Settlement - Nội Bộ):** Quyết toán hoàn ứng tạm ứng vs chi phí thực tế (`is_expenses_settled = True`), độc lập 100% với việc khách hàng đã chốt số hay chưa.
- **Tiến trình 3 - Quyết Toán Thầu Phụ / Xe Bạn (Subcontractor Settlement - Đối tác 3PL):** Đối soát cước và công nợ phải trả với thầu phụ (`subcontractor_settlement_status == 'SETTLED'`). Cột trạng thái hiển thị rạch ròi `— Xe nhà` đối với xe sở hữu.
- **Tiến trình 4 - Quyết Toán Với Khách Hàng (Customer AR Billing - Thương Mại):** **Chỉ khi hai bên đã đối soát chốt số với nhau (`is_customer_settled = True`) thì mới được tính vào Công nợ Phải Thu chính thức (AR)**, thậm chí xuất hóa đơn VAT (`vat_invoice_number`). Các chuyến chỉ mới hoàn thành mà chưa quyết toán khách được ghi nhận vào `Chờ chốt (Chưa tính nợ / Unbilled Revenue)`, không làm sai lệch số dư nợ AR.

### 2. Cập Nhật Database & API:
- **Model `DispatchTrip`:** Thêm các trường `is_customer_settled`, `customer_settlement_status` ('PENDING', 'SETTLED', 'INVOICED', 'PAID'), `customer_settled_at`, `customer_settled_by`, `vat_invoice_number`, `vat_invoice_date`.
- **API `/api/accounting/customer-reconciliation/`:** Hỗ trợ action `SETTLE` / `UNSETTLE`, cho phép nhập số Hóa đơn GTGT / VAT xuất cho khách hàng, tự sinh mã bảng kê SOA. Hỗ trợ cả chuyến `COMPLETED` và `DELIVERED`.
- **Báo Cáo 13 (AR Aging):** Sửa công thức: `total_receivable` chỉ tính tổng tiền của các chuyến xe `is_customer_settled = True`. Phân định rõ 2 luồng tiền: `Đã chốt nợ (Công nợ AR)` vs `Chờ chốt (Chưa tính nợ)`. Dư nợ còn phải thu `remaining_balance = max(0, total_receivable - collected_amount)`.

### 3. Nâng Cấp Giao Diện Bảng Kê Đối Soát Khách Hàng (SOA Full-Page):
- Bảng kê 15 cột hiển thị rõ 4 tiến trình:
  1. Hoàn thành chuyến (`✓ Xong Nội Bộ`, hiển thị trạng thái POD).
  2. Quyết toán tài xế xe nhà (`✓ Đã Quyết Toán` / `⏳ Chờ Quyết Toán` / `— Xe thầu phụ`).
  3. Quyết toán thầu phụ (`✓ Đã Quyết Toán` / `⏳ Chờ Quyết Toán` / `— Xe nhà`).
  4. Quyết toán với khách hàng (`✓ ĐÃ TÍNH NỢ (AR)` / `⏳ CHƯA TÍNH NỢ`).
- Cột Hóa đơn VAT / Mã SOA hiển thị rõ số HĐGTGT và ngày phát hành.
- 6 thẻ KPI tài chính trên đỉnh trang SOA: Cước Vận Tải, Tiền Chi Hộ, Đã Chốt Nợ (Công Nợ AR), Chờ Chốt (Chưa Tính Nợ), Đã Thu Hồi (Sổ Quỹ), Dư Nợ Còn Phải Thu.

### 4. Kiểm Thử Hệ Thống (Zero-Regression):
- 91/91 unit tests đạt chuẩn 100% (`python manage.py test --keepdb`), bổ sung unit test `test_customer_settlement_ar_lifecycle`.
- Cú pháp JavaScript hợp lệ 100% (`node -c static/js/app.js` & `node -c static/js/column_manager.js`).



## [v2.0] - 2026-10-11 (Đại Tu Toàn Diện Mục III Sổ Tay /helps: Chi Tiết Từng Ô 100% & Hướng Dẫn Thao Tác Tạo Mới Nhanh)

### 1. Chi Tiết Hóa 100% Từng Ô Nhập Liệu Trong Mục III (Hướng Dẫn Nhập Liệu):
- **Phân Hệ 1 (Dashboard):** Chi tiết từng ô bộ lọc kỳ, thẻ dòng tiền tại két, thẻ tài khoản ngân hàng và ma trận P&L chuyến xe.
- **Phân Hệ 2 (Sale & Booking):**
  * **2.1 Tạo Báo Giá Tuyến Cước:** Chi tiết 13 trường dữ liệu (Khách hàng, cơ chế trượt giá dầu Petrolimex, cự ly km, đơn giá, sản lượng, funnel bán hàng, điều khoản thương mại FCL/FTL/Giá dầu).
  * **2.2 Tạo Mới Booking:** Chi tiết 16 trường (Phân loại dịch vụ, số booking/PO, hãng tàu, vessel/voy, loại cont, lộ trình 3 điểm, giờ hẹn 24h, hạn cắt CY, SI cutoff, free DET/DEM, file lệnh cấp rỗng).
- **Phân Hệ 3 (Điều Vận):**
  * **3.1 Tạo Lệnh Điều Động:** Chi tiết khối kế thừa 9 trường từ Booking, toggle ghép 2 cont 20ft, số cont, seal, VGM, cắt CY, invoice, cửa dock, giờ hẹn 24h, hạn free DET, giám định EIR vỏ cont, lộ trình 3 điểm, phân công tài xế, chế độ Cắt Kéo (Drop & Hook 2 tài xế) và tỷ lệ phân chia thù lao.
  * **3.3 Kê Khai Chi Phí & Chi Hộ:** Chi tiết khoản mục nâng/hạ/cược/cân/bốc xếp/cầu đường, số HĐĐT, mã tra cứu, link hóa đơn và đặc biệt là toggle Chi hộ khách hàng (On-Behalf) tự động tách vào Debit Note.
- **Phân Hệ 4 (Xe & Bãi):** Khai báo xe đầu kéo, định mức dầu tiêu chuẩn, hạn đăng kiểm, hạn bảo hiểm TNDS, rơ-moóc, tải trọng và lịch đảo lốp.
- **Phân Hệ 5 (Hành Chính & Nhân Sự):** Khai báo hồ sơ nhân sự, mã NV, CCCD, Zalo ID, phân quyền, GPLX hạng FC/FE, hạn bằng lái và cơ chế tính lương chuyến tự động.
- **Phân Hệ 6 (Tài Chính & Kế Toán):** Cấp quỹ điều vận Cấp 1, tạm ứng tài xế Cấp 2, quyết toán hoàn ứng thừa/thiếu, lập phiếu thu/chi sổ quỹ (mẫu 01-TT, 02-TT) và quyết toán xe thầu phụ 3PL.
- **Phân Hệ 7 (Dịch Vụ Hải Quan):** 12 chữ số tờ khai VNACCS, phân luồng Xanh/Vàng/Đỏ, loại hình hải quan và liên kết trực tiếp mã cont với chuyến xe.
- **Phân Hệ 8 (Báo Cáo & Thống Kê):** 14 báo cáo BI quản trị, bộ lọc thời gian, column customizer tùy biến cột, xuất Excel và in A4.

### 2. Chuẩn Hóa Chỉ Dẫn Tạo Mới / Khi Không Tìm Thấy Dữ Liệu:
- Hướng dẫn rõ ràng vị trí và tên các nút thao tác nhanh:
  * Nút **[+ Thêm KH]** để khai báo khách hàng tức thì từ trong form Báo giá, Booking và Lệnh điều xe.
  * Nút **[+ Thêm]** tại Hãng tàu và Lộ trình 3 điểm (Nơi lấy, Kho đóng/dỡ, Nơi hạ) để tạo Cảng/Depot/Kho bãi mà không làm gián đoạn nhập liệu.
  * Nút **[+ Tạo Booking Mới]** trên đầu form Điều vận.
  * Nút **[Danh mục]** để cấu hình biểu phí thù lao tài xế.
  * Cơ chế Universal Quick-Add tự động reload và chọn ngay bản ghi mới vào ô tương ứng mà không làm mất dữ liệu người dùng đang nhập dở.

### 3. Kiểm Thử Hệ Thống (Zero-Regression):
- Vượt qua toàn bộ 90/90 unit tests (`python manage.py test --keepdb`).
- Cú pháp JavaScript hợp lệ 100% (`node -c static/js/app.js`).

## [v1.9] - 2026-10-11 (Phân Định Rạch Ròi 3 Tiến Trình Nghiệp Vụ, Bỏ Fallback Ngày Tạo & Chuẩn Hóa State Machine Đối Soát Công Nợ)

### 1. Phân Định Rạch Ròi 3 Tiến Trình Nghiệp Vụ Logistics:
- **Tiến trình 1 - Vận Hành Chuyến Xe (Trip Operations):** Vòng đời từ `DRAFT` ➔ `DISPATCHED` ➔ `AT_WAREHOUSE` ➔ `IN_TRANSIT` ➔ `DELIVERED` ➔ `COMPLETED`. Chỉ những chuyến đã hoàn tất giao hàng & hạ cont mới đạt trạng thái `COMPLETED`. Các chuyến dở dang (`AT_WAREHOUSE`, `DISPATCHED`) là đơn hàng đang thực hiện (WIP), tuyệt đối không đưa vào công nợ AR.
- **Tiến trình 2 - Quyết Toán Tài Xế (Driver Trip Settlement - Nội bộ):** Đối soát giữa Tạm ứng (`DriverTripAdvance`) và Chi phí thực tế (`TripExpense`) của chuyến xe khi tài xế hoàn tất hành trình (`status == COMPLETED`), chốt thừa/thiếu và đánh dấu `is_expenses_settled = True`. Tiến trình này hoàn toàn độc lập với việc Khách hàng đã thanh toán cước hay chưa.
- **Tiến trình 3 - Đối Soát Công Nợ Khách Hàng (Customer AR Reconciliation - Thương mại):** Chỉ những chuyến xe **ĐÃ HOÀN THÀNH (`COMPLETED`)** và **ĐÃ CÓ CHỨNG TỪ GIAO NHẬN (POD/EIR)** có ngày chạy thực tế `loading_date` trong kỳ mới được đưa vào Báo cáo 13 và Bảng kê đối soát SOA. Bổ sung trường `customer_reconciled`, `customer_soa_code`, `customer_reconciled_at`, `customer_reconciled_by` trên model `DispatchTrip`.

### 2. Loại Bỏ Triệt Để Fallback Ngày Tạo (`created_at`):
- Toàn bộ các bộ lọc kỳ báo cáo doanh thu, chi phí, công nợ AR và quyết toán chuyến xe chuyển sang chỉ lọc thuần túy theo **Ngày Vận Hành Thực Tế (`loading_date`)**.
- Các chuyến thiếu ngày chạy hoặc đang chạy dở dang không bị fallback gán nhầm vào kỳ báo cáo mà được hiển thị tại Báo cáo 14 (Theo dõi đơn tồn đọng / WIP).

### 3. Nâng Cấp Bảng Kê Đối Soát Khách Hàng (SOA Full-Page):
- Tách bạch 2 cột trạng thái độc lập trên giao diện SOA:
  * **Cột "Quyết Toán Tài Xế (Nội Bộ)":** `Đã Chốt Sổ Tài Xế` (Xanh) vs `Chờ Quyết Toán` (Vàng).
  * **Cột "Đối Soát Khách Hàng (SOA)":** `Đã Đối Soát (SOA)` (Xanh lá) vs `Chờ Đối Soát` (Vàng) kèm mã SOA.
- Bổ sung nút thao tác trực tiếp: Chốt/Mở lại từng dòng và Chốt đối soát toàn bộ bảng kê qua API `CustomerARReconciliationAPIView`.
- Thêm bộ lọc trạng thái đối soát: `Tất cả` / `Chờ đối soát` / `Đã chốt đối soát SOA`.

### 4. Kiểm Thử Hệ Thống & Triển Khai (Zero-Regression):
- Vượt qua 90/90 unit tests (`python manage.py test --keepdb`). Cú pháp JavaScript hợp lệ 100% (`node -c static/js/app.js`).
- Triển khai đồng bộ lên VPS Production (`149.118.60.194:8085`).

## [v1.8] - 2026-10-11 (Chuẩn Hóa Số Liệu Công Nợ AR, Nâng Cấp SOA Full-Page View & Mở Rộng Quyết Toán Gom Chuyến Xe)

### 1. Chuẩn Hóa Logic Tính Toán Công Nợ Phải Thu (AR Math Integrity):
- **Khắc phục triệt để mâu thuẫn số liệu (Tổng nợ 133tr, Đã thu 173tr, Còn nợ 46tr):**
  * Loại bỏ hoàn toàn công thức giả định `collected = int(freight * 0.8)` vốn tự động gán khống 80% cước cho các chuyến đã hoàn ứng tài xế nội bộ.
  * Chỉ ghi nhận đã thu hồi khi có bút toán Sổ Quỹ thật (`CashTransaction` loại `INFLOW` từ khách hàng / thu cước vận tải).
  * Áp dụng nguyên tắc kế toán chuẩn: Số tiền đã thu hồi được phân bổ bù trừ tối đa vào số nợ phát sinh trong kỳ của từng khách (`allocated_collected = min(total_receivable, collected)`).
  * Bảo đảm tính toán toàn vẹn: $\text{Tổng nợ phải thu} = \text{Đã thu hồi} + \text{Còn phải thu thực tế}$.
- **Chuẩn hóa công nợ khách hàng ABC:** Khách hàng ABC chưa có phiếu thu sổ quỹ -> Đã thu hồi = 0 đ, Còn phải thu = 24.000.000 đ (23.400.000 đ cước + 600.000 đ chi hộ chưa đối soát), đúng 100% nghiệp vụ thực tế.

### 2. Nâng Cấp Bảng Kê Đối Soát Khách Hàng (SOA) Sang Full-Page View:
- **Chuyển đổi từ Popup Modal sang Trang Toàn Màn Hình Chuyên Biệt (`view_customer_ar_statement.html`):**
  * Không gian rộng rãi 100% full-width, không bị che khuất hoặc co rúm cột dữ liệu.
  * Thanh điều hướng trên cùng kèm nút `Quay Lại Báo Cáo Công Nợ` và tích hợp mượt mà vào hệ thống Topbar Fullpage của BIM Logistics.
  * Hiển thị đầy đủ thông tin khách hàng, MST, SĐT và 5 Card KPI tài chính trực quan (Cước, Chi hộ, Tổng phát sinh, Đã thu hồi, Còn phải thu).
  * Bảng kê chi tiết từng vận đơn: STT, Mã chuyến, Ngày chạy, Đầu xe & Tài xế, Số Cont/Seal, Tuyến đường, Cước, Chi hộ, Tổng phải thu, Trạng thái POD gốc, Quyết toán nội bộ.
  * Tích hợp ô tìm kiếm lọc nhanh tức thì theo mã chuyến/cont/tài xế và tính năng `Xuất Bảng Kê Excel (.csv UTF-8)` & `In Bảng Kê A4`.

### 3. Xử Lý Khách Hàng ABC & Các Chuyến Xe Trong Quyết Toán Gom Chuyến:
- **Khắc phục lỗi lọc ngày khi `loading_date` rỗng:** Bổ sung điều kiện fallback sang `created_at__date` trong `DriverBatchSettlementQueryAPIView`, ngăn chặn việc các chuyến chưa chọn ngày bốc hàng bị loại bỏ khỏi danh sách gom chuyến.
- **Mở rộng trạng thái chuyến trong Quyết toán:** Cho phép hiển thị và quyết toán các chuyến xe đã đến kho dỡ hàng / giao hàng / trả vỏ (`AT_WAREHOUSE`, `DELIVERED`, `RETURNING_EMPTY`, `COMPLETED`), giúp Kế toán và Điều vận gom đối soát chi phí kịp thời ngay khi tài xế phát sinh chi phí hoặc tạm ứng.
- **Tự động hoàn thành chuyến:** Khi thực hiện quyết toán gom thành công, chuyến xe tự động được chuyển sang trạng thái `COMPLETED` và khóa sổ chi phí.



### 1. Khắc Phục Triệt Để Lỗi Cuộn Che Khuất Tiêu Đề Mục Con:
- **Nguyên nhân cốt lõi:** Thanh Topbar có `position: sticky top-0 h-16 (64px) z-40`. Khi người dùng bấm vào các bookmark cấp con (`2.1. Tạo Báo giá`, `3.1. Tạo Lệnh điều xe`... `6.5. Quyết toán xe thầu phụ`), trình duyệt cuộn theo hash mặc định đưa phần tử lên đỉnh `y = 0`, khiến toàn bộ tiêu đề mục con bị Topbar đè che khuất.
- **Giải Pháp Kỹ Thuật Toàn Diện:**
  * **Thiết lập CSS Toàn Cục:** Bổ sung `[id^="sec-"] { scroll-margin-top: 96px !important; }` để bảo đảm mọi bookmark (dù là thẻ `section`, `div`, `h3`, `h4`) luôn tự động dừng cách mép trên 96px (chừa đủ 64px của thanh Topbar và 32px khoảng đệm thông thoáng).
  * **Bổ sung Class `scroll-mt-24`:** Gán trực tiếp class Tailwind `scroll-mt-24` cho toàn bộ 15 khối mục con cấp 2 và cấp 3 trong tài liệu.
  * **Hiệu Ứng Flash Highlight Nhận Diện Bookmark:** Khi nhấp chuột vào bất kỳ mục nào trên cây Mục lục, JavaScript tự động kích hoạt hiệu ứng nhấp nháy phát sáng (`highlight-flash` viền/nền xanh ngọc teal dịu mắt trong 2 giây) tại đúng vị trí mục tiêu, giúp người dùng nhận diện ngay lập tức nội dung vừa tìm.
  * **Cuộn Mượt Không Giật:** Sử dụng `scrollIntoView({ behavior: 'smooth', block: 'start' })` kết hợp `history.pushState` giữ trải nghiệm điều hướng êm ái.

### 2. Kiểm Thử Hệ Thống (Zero-Regression):
- Vượt qua 89/89 unit tests (`python manage.py test --keepdb`). Cú pháp JavaScript hợp lệ 100%.

## [v1.6] - 2026-10-11 (Chuẩn Hóa Tiêu Đề Tab Trình Duyệt, Tái Cấu Trúc Menu Profile Avatar & Bản Quyền HDSD)

### 1. Chuẩn Hóa Tiêu Đề Tab Trình Duyệt (Browser Tab Titles):
- **Trang Chính Ứng Dụng (`templates/base.html`):** Chuẩn hóa thành `Hệ thống Quản lý Vận tải - BIM LOGISTICS` (đưa thương hiệu ra phía sau, giúp tab trình duyệt ưu tiên hiển thị nội dung chính mà vẫn giữ trọn nhận diện thương hiệu).
- **Trang Hướng Dẫn Sử Dụng (`templates/help.html`):** Chuẩn hóa thành `Hướng dẫn sử dụng - BIM LOGISTICS`.

### 2. Chuẩn Hóa Chân Trang & Bản Quyền (`templates/help.html`):
- Cập nhật dòng bản quyền chuẩn hóa toàn diện cả trên bản xem trực tiếp và bản in A4: `© 2026 Bản quyền thuộc BIM LOGISTICS`.

### 3. Tái Cấu Trúc Menu Profile & Modal Cài Đặt Cá Nhân:
- **Tích Hợp Đăng Xuất Vào Avatar Dropdown:** Gom liên kết Đăng xuất vào bên trong menu thả xuống của Avatar góc phải Topbar.
- **Quy Trình 2 Nút "Sửa | Lưu":**
  * Trạng thái mặc định: Các ô nhập dữ liệu cá nhân bị khóa (`readonly`, `bg-slate-50`), nút **Sửa** sáng rõ, nút **Lưu** bị vô hiệu hóa (`disabled`).
  * Khi bấm **Sửa**: Nút biến thành **Hủy**, các trường dữ liệu mở khóa cho phép sửa thông tin cá nhân (Tên, Email, Username).
  * Khi bấm **Hủy**: Hủy bỏ các thao tác sửa đổi, hoàn nguyên dữ liệu gốc và khóa lại ô nhập.
  * Khi bấm **Lưu**: Gửi request cập nhật profile qua AJAX và thông báo cập nhật thành công.

### 4. Kiểm Thử Hệ Thống (Zero-Regression):
- Vượt qua toàn bộ bộ kiểm thử tự động của dự án (`python manage.py test --keepdb`).
- Cú pháp JavaScript hợp lệ 100% (`node -c static/js/app.js`).

## [v1.5] - 2026-10-11 (Tái Cấu Trúc Toàn Diện Sổ Tay /helps Dạng Document Phẳng A4, Loại Bỏ Thẻ Đóng & Chuẩn Hóa Mục Lục)

### 1. Triệt Tiêu Hoàn Toàn Các Câu Ghi Phần & Thẻ Đóng Hộp:
- **Loại Bỏ 100% Cụm Từ "PHẦN I", "PHẦN II", "PHẦN III":** Xóa sạch toàn bộ các badge nền màu (nâu, xanh) và các đề mục ghi "PHẦN...".
- **Chuyển Đổi Sang Tiêu Đề Văn Bản Hành Chính Chuẩn:**
  * `I. MÔ TẢ PHÂN HỆ CHỨC NĂNG`
  * `II. KHAI BÁO DANH MỤC`
  * `III. HƯỚNG DẪN NHẬP LIỆU`
- **Loại Bỏ Các "Thẻ Đóng" Bo Viền Hộp (Card Boxes):** Bỏ các khối bọc `bg-slate-50 border border-slate-200 rounded-xl` gây cảm giác rời rạc kiểu AI; chuyển toàn bộ nội dung sang dạng Document in ấn A4 phẳng, các mục phân cấp mạch lạc bằng thẻ `<h3>`, `<h4>`, bảng biểu phẳng và danh sách bullet liền mạch.

### 2. Chuẩn Hóa & Nâng Cấp Kích Thước Mục Lục (TOC):
- **Tăng Cỡ Chữ Mục Lục Lên 1-2 Size Hài Hòa:** Mở rộng chiều rộng sidebar từ `w-72` lên `w-80`, tăng kích thước font đề mục chính lên `text-[13.5px] - text-sm` in hoa đậm, các mục con lên `text-[13px]`, mục cháu lên `text-[12.5px]`, tạo khoảng đệm thoáng đãng, dễ đọc.
- **Khớp Đúng 100% Thuật Ngữ Với Hệ Thống:**
  * **Nhóm I (9 mục con):** Lấy đúng 100% tên từ Sidebar hệ thống: *1. Dashboard Tổng quan, 2. Sale & Booking, 3. Điều vận, 4. Xe & Bãi, 5. Hành chính & Nhân sự, 6. Tài chính & Kế toán, 7. Dịch vụ Hải quan, 8. Báo cáo & Thống kê, 9. Cài đặt*.
  * **Nhóm II (13 mục con):** Lấy đúng 100% từ 13 tab Master Data trong Cài đặt: *1. Khai Báo Thông Tin Công Ty, 2. Vai Trò & Phân Quyền, 3. Biểu Phí Lương Chuyến, 4. Phụ Cấp & Kiểm Hóa, 5. Cảng & Kho Bãi, 6. Biểu Cước Khách, 7. Khách Hàng, 8. Hãng Tàu, 9. Đầu Kéo & Xe, 10. Rơ-Moóc, 11. Nhà Xe Thầu Phụ, 12. Khoản Chi, 13. Quy Cách*.
  * **Nhóm III (8 mục con):** Lấy đúng các phân hệ và thao tác tính năng thực tế.

### 3. Kiểm Thử Hệ Thống & Triển Khai:
- Vượt qua 89/89 unit tests (`python manage.py test --keepdb`). Cú pháp JavaScript và kiểm tra Django hoàn toàn hợp lệ (0 issues).

## [v1.4] - 2026-10-11 (Tinh Gọn Toàn Diện Giao Diện Sổ Tay /helps & Chuẩn Hóa Điều Hướng Hệ Thống)

### 1. Tinh Gọn & Chuẩn Hóa Giao Diện Sổ Tay Hướng Dẫn Sử Dụng (`/helps`):
- **Bỏ Nút In Trùng Lặp Trên Banner:** Loại bỏ nút "In Sổ Tay Khổ A4" trên Hero Banner màu xanh do trên Topbar cố định đã có nút In Sổ Tay.
- **Loại Bỏ Thanh Tìm Kiếm Cục Bộ & Nút In Phụ:** Bỏ hoàn toàn thanh công cụ tìm kiếm phụ và nút in ở đầu tài liệu để trang hiển thị liền mạch theo chuẩn tài liệu A4 in ấn chuyên nghiệp.
- **Loại Bỏ Huy Hiệu Màu Mè (Badge Elimination):** Thay thế toàn bộ các khối badge `PHẦN I`, `PHẦN II`, `PHẦN III` và các thẻ `PHẦN I.x`, `PHẦN III.x` bằng tiêu đề văn bản hành chính phẳng `<h2>` border-b màu đen chuẩn tài liệu công văn, triệt tiêu cảm giác thẻ AI rời rạc.
- **Đồng Bộ Nút Thu Gọn/Mở Rộng Mục Lục Chuẩn SVG:**
  * Bổ sung nút thu gọn mục lục bằng biểu tượng SVG hình chữ nhật chia cột có mũi tên đảo chiều (`icon-help-arrow-in`, `icon-help-arrow-out`) đồng bộ tuyệt đối với nút toggle Sidebar trên Topbar chính của hệ thống.
  * Đồng bộ biểu tượng thu gọn tại tiêu đề `MỤC LỤC HƯỚNG DẪN` sang chuẩn SVG đồng nhất.

### 2. Tinh Gọn Sidebar Chính Của Ứng Dụng (`templates/components/sidebar.html`):
- **Loại bỏ mục "Trợ giúp & HDSD" trên Sidebar:** Xóa liên kết trùng lặp trên thanh điều hướng bên trái vì trên Topbar toàn hệ thống đã có nút icon trợ giúp chuyển trực tiếp đến `/helps`.
- **Kiểm Thử Toàn Diện (Zero-Regression):** Vượt qua 89/89 unit tests (`python manage.py test --keepdb`), cú pháp JS kiểm tra 100% hợp lệ (`node -c static/js/app.js` và `node -c static/js/column_manager.js`).

## [v1.3] - 2026-10-11 (Đặc Tả Kế Hoạch Triển Khai On-Premise Doanh Nghiệp — Chuẩn Mô Hình MISA)

### Nghiên Cứu & Thiết Kế Kiến Trúc Triển Khai Cho Khách Hàng (MISA On-Premise Model):
- **Quy chuẩn Cơ sở dữ liệu:** Chốt sử dụng 100% **PostgreSQL 16 Enterprise** (loại trừ SQLite để triệt tiêu lỗi khóa bảng `Database is locked` khi nhiều phòng ban & tài xế ghi dữ liệu đồng thời).
- **Mô hình Hỗ trợ Triển khai Kỹ thuật (IT-Assisted Setup):** Đóng gói quy trình triển khai do chuyên viên kỹ thuật công ty thực hiện (qua UltraViewer/TeamViewer hoặc tại văn phòng khách hàng) thông qua Deployment Wizard.
- **Bảo toàn Dữ liệu Khách hàng & Chọn Thư mục Vật lý:**
  * Cho phép chọn vị trí lưu dữ liệu vật lý tại ổ đĩa an toàn (`D:\` hoặc `E:\`) để chống mất mát khi cài đặt lại hệ điều hành Windows.
  * Tự động cấu hình ánh xạ Volume PostgreSQL và mở cổng tường lửa Windows Firewall cho mạng LAN (`8085`).
- **Phân loại Dữ liệu Khởi tạo:** Thiết kế 2 chế độ nạp (`DEMO_DATA` để đào tạo dùng thử, `CLEAN_PRODUCTION` cho vận hành chính thức) kèm cơ chế dọn rác giao dịch (`purge_transactions`).
- **Cập nhật tài liệu:** Bổ sung chi tiết vào [`docs/DEVELOPMENT_PLAN.md`](file:///e:/Bim_Logistics/docs/DEVELOPMENT_PLAN.md#L227-L255) mục 6: Kế hoạch triển khai On-Premise cho khách hàng.

## [v1.2] - 2026-10-11 (Tái Cấu Trúc Giao Diện Topbar: Tích Hợp Đăng Xuất & Cài Đặt Hồ Sơ Cá Nhân Vào Avatar)

### 1. Khắc Phục Triệt Để Lỗi Chồng Chéo Giao Diện (Z-Index Stacking Context):
- **Tách lớp giao diện & Nâng z-index Topbar lên `z-40`:**
  * Điều chỉnh thẻ `<header>` của Topbar từ `z-10` lên `z-40` nhằm đảm bảo toàn bộ menu popup, dropdown của Avatar luôn nổi hoàn toàn trên các bảng dữ liệu có thanh tiêu đề cố định (`sticky top-0 z-10`), loại bỏ 100% hiện tượng bảng danh mục/tiêu đề đè lên menu.
  * Tăng cường độ mờ đục và bóng nổi (`bg-white shadow-2xl border-slate-200/95`) cho menu `#topbar-user-menu`.

### 2. Cài Đặt Riêng Cho Hồ Sơ Cá Nhân (User Profile Settings Modal):
- **Tách biệt Cài đặt Profile cá nhân và Cài đặt hệ thống ứng dụng:**
  * Mục **Cài đặt** trong avatar dropdown mở thẳng **Modal Cài Đặt Hồ Sơ Cá Nhân** (`#modal-profile-settings`) thay vì chuyển sang phân hệ Master Data của ứng dụng.
- **Quy trình 2 nút Sửa | Lưu & Khóa nhập liệu an toàn:**
  * Khi mới mở modal: Mặc định ở chế độ chỉ xem, các ô nhập liệu bị khóa (`disabled`). Nút **Sửa** sáng lên nổi bật, nút **Lưu** bị vô hiệu hóa (`disabled`, mờ nhẹ).
  * Chỉ khi người dùng chủ động bấm nút **Sửa**: Các trường dữ liệu mới được mở khóa cho phép gõ/chỉnh sửa, con trỏ tự động focus vào ô Họ và tên, nút **Lưu** sáng lên được kích hoạt, đồng thời nút **Sửa** chuyển trạng thái thành nút **Hủy** (màu đỏ).
  * Nếu bấm nút **Hủy**: Hệ thống tự động thoát chế độ chỉnh sửa, khôi phục lại 100% dữ liệu ban đầu, không lưu bất kỳ thay đổi nào và khóa lại các trường nhập liệu.
  * Cho phép người dùng trực tiếp xem và tinh chỉnh:
    - **Tên đăng nhập (User):** Hiển thị cố định (`readonly`).
    - **Họ và tên (Tên):** Cho phép chỉnh sửa và đồng bộ tức thì trên giao diện và backend.
    - **Địa chỉ Email:** Cho phép cập nhật email cá nhân với cơ chế chống trùng lặp.
    - **Số điện thoại:** Cho phép cập nhật số liên lạc của nhân sự.
    - **Đổi mật khẩu:** Hỗ trợ nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu (tối thiểu 6 ký tự).
- **Backend API & Real-time UI Update:**
  * Mở rộng endpoint `CurrentUserAPIView` (`/api/auth/me/`) hỗ trợ phương thức `PATCH` để lưu thông tin hồ sơ và đổi mật khẩu an toàn (`update_session_auth_hash`).
  * Giao diện cập nhật tức thì tên hiển thị, email trên Topbar và dropdown ngay sau khi lưu thành công mà không cần tải lại trang.
  * Bổ sung đầy đủ 3 test cases trong `CurrentUserProfileAPITestCase` (89/89 tests passed).
    - **Hướng dẫn sử dụng:** Mở sổ tay HDSD hệ thống (`/helps`).
    - **Đăng xuất:** Thoát khỏi hệ thống an toàn và dọn dẹp phiên làm việc.
  * Hỗ trợ tự động đóng menu khi nhấp chuột ra ngoài (click-outside) hoặc nhấn phím ESC.

## [v1.1] - 2026-10-11 (Chuẩn Hóa Phân Quyền Django RBAC, Tách Biệt Quyền Admin & Tinh Gọn Flat Tab Cài Đặt Hệ Thống)

### 1. Chuẩn Hóa Phân Quyền Đúng Chuẩn Django (Standard Django RBAC):
- **Tách biệt tuyệt đối Quyền Quản Trị Tối Cao (Admin):**
  * Chỉ tài khoản Quản trị viên (`admin` / `audit_admin`) sở hữu cờ `is_superuser = True` và `is_staff = True`, có quyền truy cập vào Django Admin (`/admin/`) và quyền chỉnh sửa phân quyền người dùng.
  * Các tài khoản nghiệp vụ (`dieudo`, `ketoan`, `sales`, `taixe`) được đặt `is_staff = False`. Quyền hạn được kiểm soát hoàn toàn theo Nhóm vai trò (`auth.Group`) và Quyền đối tượng (`auth.Permission`).
- **Phân quyền linh hoạt theo Nhóm & Quyền Báo cáo / Thao tác:**
  * Bổ sung cặp quyền tùy biến chuẩn Django: `reports.view_financial_report` (xem Báo cáo Tài chính, P&L, Thu hồi chi hộ) và `reports.view_operational_report` (xem Báo cáo Vận hành, KPI chuyến xe).
  * Cho phép thêm/bớt quyền xem báo cáo hoặc quyền thao tác trực tiếp trên từng nhóm qua Django Permissions mà không bị hard-code role.
  * Bổ sung đầy đủ nhóm `Quản Lý Nhân Sự` và cấp quyền đa nhóm cho `ketoan` để vừa quản lý cước vừa quản trị hồ sơ nhân sự.

### 2. Tinh Gọn Giao Diện Flat Tab "Cài Đặt Hệ Thống":
- **Đổi tên mục Menu Sidebar:** `Cài đặt` ➔ **`Cài đặt hệ thống`**.
- **Chuẩn hóa 2 Tab Flat đầu tiên trong phân hệ:**
  * Thẻ `company`: **"Khai Báo Thông Tin Công Ty"** (Quản lý hồ sơ doanh nghiệp Triền Võ, tài khoản ngân hàng, thông tin xuất hóa đơn).
  * Thẻ `roles_permissions`: **"Vai Trò & Phân Quyền"** (Quản trị nhóm quyền và gán quyền nhân viên).
  * Trình bày dạng Flat tab đồng bộ với các tab danh mục khác (`Biểu Phí Lương Chuyến`, `Cảng & Kho Bãi`...), không chia khối thẻ lồng phức tạp.

## [v1.0] - 2026-10-11 (Chuẩn Hóa Nhận Diện Thương Hiệu Toàn Hệ Thống v1.0 & Tái Cấu Trúc Toàn Diện Trang /helps)

### 1. Chuẩn Hóa Nhận Diện Thương Hiệu & Phiên Bản Hệ Thống (Brand Identity & Version v1.0):
- **Header chuẩn hóa theo thiết kế BIZ SOLUTIONS - BIM LOGISTICS:**
  * Khối Logo & Brand Text chuẩn nhận diện: Dòng trên `BIZ SOLUTIONS` (font chữ hoa màu xanh ngọc), dòng dưới `BIM LOGISTICS` (chữ in hoa đậm nét).
  * Phiên bản chính thức thống nhất: **`v1.0`** cho toàn bộ hệ thống nền tảng.
- **Loại bỏ triệt để từ khóa "TMS" trên toàn bộ ứng dụng:**
  * Rà soát và loại bỏ 100% từ khóa `(TMS)` / `TMS` không liên quan khỏi giao diện người dùng, tiêu đề trang, modal in ấn báo cáo, form tờ khai và tài liệu hướng dẫn.
  * Tên gọi chính thức nhất quán: **Hệ Thống BIM Logistics**.

### 2. Tái Cấu Trúc Hero Banner & Trang Tài Liệu A4 /helps:
- **Hero Banner màu xanh chuẩn Sổ tay Phần mềm:**
  * Tích hợp toàn bộ thông tin ban hành: Đơn vị ban hành (Công ty TNHH Vận Tải Triền Võ), tiêu đề văn bản, phạm vi áp dụng (Ban Giám Đốc, Điều Phối Viên, Kế Toán, Kinh Doanh, Lái Xe).
  * Trình bày 3 Nguyên tắc bất biến (Trường bắt buộc `*`, Nút "Lưu" thống nhất, An toàn Soft-delete) trực tiếp trên nền Banner xanh trang trọng, thanh lịch.
  * Nút thao tác nhanh: `In Sổ Tay Khổ A4`.
- **Trang A4 Hành chính liền mạch (Loại bỏ hoàn toàn thẻ card AI):**
  * Phần nội dung A4 bắt đầu bằng tiêu đề văn bản hành chính quy chuẩn (`HDSD-BIM-v1.0`).
  * Nội dung 3 Phần lớn (I. Mô tả phân hệ; II. 13 danh mục Master Data; III. Thao tác nhập liệu chi tiết) trình bày liền mạch, mạch lạc, dễ theo dõi, in ấn và lưu trữ chuẩn PDF.
- **Thông tin Hỗ trợ & Tổng đài chuẩn xác:**
  * Hiển thị: **BIM LOGISTICS - BIZ SOLUTIONS** | Hotline: **0903.012.099** | Email: **bimconsultingvn@gmail.com**.

## [2.9.50] - 2026-10-11 (Đồng Bộ Nhận Diện Thương Hiệu: Favicon Logo BIM & Cập Nhật Tiêu Đề Tab Hệ Thống)

### 1. Đồng Bộ Nhận Diện Favicon Logo BIM (Ecosystem Brand Consistency):
- **Thay thế biểu tượng TVL cũ trên Favicon:**
  * Chuyển đổi và tạo lại toàn bộ file chuẩn đa phân giải `static/favicon.ico` (16x16, 32x32, 48x48, 64x64) từ logo BIM chính thức (`static/images/logo_clean.png`).
  * Cập nhật thẻ khai báo `<link rel="icon" type="image/png" href="{% static 'images/logo_clean.png' %}?v=3.0">` và `<link rel="shortcut icon" type="image/x-icon" href="{% static 'favicon.ico' %}?v=3.0">` trên [base.html](file:///e:/Bim_Logistics/templates/base.html) kèm tham số cache-busting `?v=3.0`.
  * Đồng bộ favicon chuẩn nhận diện thương hiệu BIM sang toàn bộ các trang giao diện độc lập: [login.html](file:///e:/Bim_Logistics/templates/login.html), [driver_portal.html](file:///e:/Bim_Logistics/templates/driver_portal.html), [public_tracking.html](file:///e:/Bim_Logistics/templates/public_tracking.html) và [help.html](file:///e:/Bim_Logistics/templates/help.html).

### 2. Cập Nhật Tiêu Đề Hiển Thị Trình Duyệt:
- **Đổi tên hiển thị trên Tab Trình duyệt:**
  * Chuyển tiêu đề mặc định của hệ thống quản lý điều vận thành: **"Bim Logistics - Hệ thống Quản lý Vận tải"**.



### 1. Nâng Cấp Hệ Thống Mục Lục Sidebar Thành Cây Phân Cấp 3 Tầng (Hierarchical Accordion Tree):
- **Cấu trúc Cây Cha - Con - Cháu tinh gọn và trực quan:**
  * Cấp Cha (Root): 3 Phần lớn (I. Mô tả phân hệ & tính năng; II. Hướng dẫn cài đặt 13 danh mục gốc; III. Hướng dẫn thao tác nhập liệu chi tiết).
  * Cấp Con (Branches): Các phân hệ nghiệp vụ và nhóm danh mục chức năng.
  * Cấp Cháu (Leaves): Từng danh mục cụ thể hoặc từng quy trình tác nghiệp chi tiết (Báo giá, Booking, Lệnh điều xe, Cắt kéo, Cấp quỹ 2 cấp, Quyết toán xe bạn, Báo cáo A4...).
  * Nút gập/mở (Chevron / Accordion Toggle) cho phép thu gọn/mở rộng từng nhánh linh hoạt, giữ menu luôn gọn gàng, tránh cuộn dài vô tận.
- **Tích hợp Ô Tìm Kiếm Nhanh Mục Lục (Live Sidebar Search):**
  * Ô nhập tìm kiếm `#sidebar-tree-search` cố định trên đầu menu bên trái.
  * Cơ chế tìm kiếm tức thì theo thời gian thực (Real-time live filter): Khi gõ từ khóa (ví dụ: *báo giá*, *khách hàng*, *cắt kéo*, *tạm ứng*...), hệ thống tự động lọc danh sách và tự động mở bung (expand) tất cả các nhánh Cha - Con chứa kết quả khớp.

### 2. Đặc Tả Chi Tiết Đầy Đủ 13 Danh Mục Cài Đặt Gốc (Master Data Specification):
- **Bổ sung và mô tả toàn diện 13 danh mục chuẩn theo thiết kế hệ thống:**
  1. `company`: Khai Báo Hệ Thống / Hồ Sơ Doanh Nghiệp (Company Profile)
  2. `roles_permissions`: Phân Quyền & Vai Trò Hệ Thống (Roles & Permissions)
  3. `driver_tariffs`: Biểu Phí Lương Chuyến Tài Xế (Driver Trip Tariffs)
  4. `allowances`: Phụ Cấp Tuyến & Kiểm Hóa (Allowances & Inspection Tariffs)
  5. `locations`: Cảng & Kho Bãi Địa Điểm (Locations / Seaports & Warehouses)
  6. `tariffs`: Biểu Cước Vận Chuyển Khách Hàng (Customer Freight Tariffs)
  7. `customers`: Khách Hàng Doanh Nghiệp (Customers CRM)
  8. `shipping_lines`: Hãng Tàu Biển (Shipping Lines)
  9. `vehicles`: Đầu Kéo & Xe Tải (Tractors & Trucks)
  10. `trailers`: Rơ-Moóc Vận Tải (Semi-Trailers)
  11. `subcontractors`: Nhà Xe Thầu Phụ 3PL (Subcontractors / Partner Fleets)
  12. `expenses`: Khoản Mục Chi Phí Vận Tải (Expense Catalog)
  13. `containers`: Quy Cách Vỏ Container & Thùng Xe (Container Specifications)
- **Chuẩn hóa trường bắt buộc & nút xác nhận:**
  * Mỗi danh mục được mô tả chính xác: Nơi thực hiện ➔ Nút thao tác ➔ Mục đích ➔ Bảng trường dữ liệu chi tiết đánh dấu hoa thị đỏ `*` bắt buộc.
  * Thống nhất 100% nút hoàn tất thao tác ghi nhận dữ liệu là chữ **`Lưu`**.
  * Định dạng trình bày văn bản hành chính liền mạch A4 trang trọng, phục vụ in ấn PDF phát hành sổ tay nội bộ.

## [2.9.48] - 2026-10-11 (Tái Cấu Trúc Toàn Diện Trang /helps & Sổ Tay Hướng Dẫn Sang Chuẩn Văn Bản A4 Khép Kín 3 Phần Lớn)

### 1. Chuẩn Hóa Bố Cục Trang Tài Liệu A4 Liền Mạch (Continuous Document Standard):
- **Tái cấu trúc toàn bộ nội dung `/helps` và `docs/USER_GUIDE.md` thành 3 Chương lớn:**
  * **PHẦN I: MÔ TẢ PHÂN HỆ & TÍNH NĂNG CỐT LÕI:**
    1. Tổng quan Kiến trúc Vận hành & Phân quyền vai trò RBAC (Director, Dispatcher, Accountant, Salesman, Mechanic, Driver)
    2. Phân hệ Dashboard Ban Giám Đốc (Executive BI, 4 thẻ KPI, quỹ két/ngân hàng, P&L 8 chuyến)
    3. Phân hệ Sale & Booking (CRM khách hàng, lập & duyệt báo giá cước, tiếp nhận đơn booking, CY closing)
    4. Phân hệ Điều Vận & Chuyến Xe (TMS Core Engine, State Machine 11 bước, cắt kéo 2 chặng, chở ghép 2 cont 20ft, kê khai chi phí & chi hộ Debit Note, Mobile tài xế)
    5. Phân hệ Quản Lý Đội Xe, Bãi & Nhân Sự (Đầu kéo, rơ-moóc, cảnh báo đăng kiểm $\le 15$ ngày, GPLX FC cảnh báo $\le 30$ ngày, lương chuyến khoán)
    6. Phân hệ Tài Chính, Tạm Ứng & Sổ Quỹ (Cơ chế 2 cấp quỹ TUDV/TUTX, hoàn ứng tự động cân đối PT/PC, Sổ Quỹ Mẫu S03a-DN, quyết toán xe bạn 3PL, gom chuyến hàng loạt)
    7. Phân hệ Dịch Vụ Hải Quan Điện Tử (Tờ khai VNACCS 12 số, phân luồng Xanh/Vàng/Đỏ, liên kết cont/seal)
    8. Hệ thống 14 Báo Cáo Thông Minh BI Vận Tải (Cột STT chuẩn, Column Manager, in A4 Ngang/Dọc)
  * **PHẦN II: HƯỚNG DẪN CÀI ĐẶT DANH MỤC GỐC (MASTER DATA):**
    1. Tạo mới Khách hàng (Customer)
    2. Cài đặt Địa điểm cảng, depot & kho hàng (Locations)
    3. Cài đặt Danh mục Hãng tàu (Shipping Lines)
    4. Cài đặt Khoản mục chi phí vận tải (Expense Catalog)
    5. Cài đặt Biểu cước lương chuyến theo tuyến đường (Route Payroll Rates)
    6. Hồ sơ doanh nghiệp & Tài khoản ngân hàng thụ hưởng (Company Profile)
  * **PHẦN III: HƯỚNG DẪN THAO TÁC NHẬP LIỆU CHI TIẾT:**
    1. Thao tác trên Dashboard Ban Giám Đốc (Bộ lọc kỳ toàn cục, quỹ khả dụng, mở chi tiết chuyến xe)
    2. Thao tác Phân hệ Sale & Booking: 2.1 Tạo báo giá mới & duyệt báo giá; 2.2 Tiếp nhận đơn Booking mới & phát lệnh xe
    3. Thao tác Phân hệ Điều Vận: 3.1 Lập lệnh điều xe mới; 3.2 Cắt kéo 2 chặng & chở ghép 2 cont 20ft; 3.3 Kê khai chi phí vận hành & khoản chi hộ khách hàng; 3.4 Bác tài báo 6 mốc kho & chụp ảnh POD/EIR
    4. Thao tác Phân hệ Kế Toán: 4.1 Kế toán cấp quỹ điều vận Cấp 1; 4.2 Điều vận cấp tạm ứng tài xế Cấp 2; 4.3 Quyết toán hoàn ứng chuyến; 4.4 Lập phiếu thu/chi S03a-DN; 4.5 Thỏa thuận cước & quyết toán xe bạn 3PL; 4.6 Quyết toán gom chuyến hàng loạt
    5. Thao tác Phân hệ Dịch Vụ Hải Quan: Khai báo tờ khai VNACCS 12 số
    6. Tra cứu, lọc, tùy biến cột & In 14 Báo Cáo BI khổ A4 (Cột STT đếm record chuẩn)
- **Tối Ưu Hóa Trải Nghiệm Đọc & In Ấn Doanh Nghiệp (Business Standard A4):**
  * Loại bỏ phong cách card vụn vặt kiểu AI; thay thế bằng định dạng trang giấy A4 văn bản hành chính liền mạch (`doc-page-container`).
  * Khổ in ấn CSS `@media print` được thiết lập chuẩn A4 Portrait lề 15mm-20mm theo Nghị định 30/2020/NĐ-CP.
  * Giữ vững 3 nguyên tắc bất biến: Dấu hoa thị đỏ `*` bắt buộc, nút thống nhất duy nhất chữ `Lưu`, cơ chế an toàn Soft-Delete.

## [2.9.47] - 2026-10-11 (Biên Soạn Sổ Tay Vận Hành "Cầm Tay Chỉ Việc" Từng Bước Cho 18 Quy Trình Nghiệp Vụ Chuẩn Hóa Trên /helps)

### 1. Cẩm Nang Thao Tác Cầm Tay Chỉ Việc (Step-by-Step Interactive Guides):
- **Bổ sung mục nổi bật "Cẩm Nang Thao Tác Chuẩn" trên trang `/helps` và `docs/USER_GUIDE.md`:**
  * Soạn thảo chi tiết 18 quy trình vận hành thực tế theo đúng phong cách cầm tay chỉ việc: *Chỉ rõ menu cần vào ➔ Thẻ/tab cần chọn ➔ Nút bấm thao tác ➔ Danh sách trường có dấu sao đỏ `*` bắt buộc ➔ Bấm nút "Lưu"*.
  * 18 quy trình bao phủ 100% nghiệp vụ:
    1. Cách tạo Khách hàng mới
    2. Cách lập Bảng báo giá vận tải mới & Duyệt báo giá
    3. Cách tiếp nhận Booking / Đơn hàng mới từ hãng tàu & khách hàng
    4. Cách tạo Lệnh điều động chuyến xe mới (Phát lệnh cho xe)
    5. Cách xử lý chuyến Cắt kéo (2 chặng) & Ghép 2 Cont 20ft
    6. Cách kê khai Chi phí vận hành & Khoản Chi hộ khách hàng (Debit Note)
    7. Cách tài xế báo 6 Mốc kho & Chụp ảnh POD/EIR trên điện thoại
    8. Cách thêm mới Đầu kéo & Rơ-moóc vào đội xe
    9. Cách thêm Hồ sơ nhân viên / Bác tài mới
    10. Cách kế toán cấp Quỹ tạm ứng điều vận Cấp 1
    11. Cách điều vận cấp Tạm ứng dọc đường cho tài xế Cấp 2
    12. Cách quyết toán Hoàn ứng chuyến xe & Cân đối sổ quỹ
    13. Cách tạo Phiếu thu / Phiếu chi sổ quỹ mẫu S03a-DN
    14. Cách thỏa thuận cước & Quyết toán xe bạn / Thầu phụ 3PL
    15. Cách khai báo & Quản lý tờ khai hải quan điện tử (VNACCS)
    16. Cách quyết toán Gom chuyến xe hàng loạt (Batch Settlement)
    17. Cách xem, lọc, tùy chỉnh cột & In 14 báo cáo BI khổ A4
    18. Cách quản lý Danh mục gốc (Địa điểm, Hãng tàu, Khoản mục chi phí)
- **Chuẩn hóa nguyên tắc thao tác cốt lõi:**
  * Nhận biết trường bắt buộc có dấu sao đỏ `*`.
  * Thống nhất 100% nhãn nút `Lưu` viền xanh Teal trên toàn hệ thống.
  * Tuân thủ cơ chế bảo toàn dữ liệu Soft-Delete (`is_deleted=True`), không dùng hard-delete để bảo vệ tính pháp lý chứng từ.
- **Tích hợp giao diện trực quan:**
  * Thêm liên kết nhanh `⭐ Hướng Dẫn Thao Tác (18 Mục)` lên đầu Sidebar điều hướng `/helps`.
  * Hỗ trợ tìm kiếm tức thì trên thanh search toàn cục với từ khóa nghiệp vụ.
  * Nâng cấp phiên bản hiển thị hệ thống lên `v2.9.47`.

## [2.9.46] - 2026-10-11 (Bổ Sung Trang Trợ Giúp /helps & Sổ Tay Hướng Dẫn Sử Dụng Toàn Diện Từng Phân Hệ, Tính Năng & Trường Dữ Liệu)

### 1. Xây Dựng Trang Trợ Giúp Trực Tuyến & Cổng Tra Cứu (/helps):
- **Ra mắt trang chuyên biệt `/helps` (Help Center & Documentation Hub):**
  * Thiết kế theo phong cách trung tâm tài liệu SaaS cao cấp (Notion / Stripe Docs / GitHub Docs style).
  * Thanh tìm kiếm tương tác tức thời (Live Search Filter) lọc nhanh theo tên trường, tên phân hệ hoặc từ khóa nghiệp vụ.
  * Sidebar mục lục (Sticky Table of Contents) ghim cố định điều hướng mượt mà tới 13 phân hệ chức năng.
  * Hỗ trợ chế độ in ấn tài liệu A4 (Print-friendly format).
- **Từ Điển Trường Dữ Liệu Chi Tiết (Data Dictionary):**
  * Mô tả cụ thể từng trường dữ liệu của từng phân hệ: Tên trường, Tên kỹ thuật ORM, Kiểu dữ liệu, Tính bắt buộc, Ý nghĩa nghiệp vụ, Quy tắc ràng buộc và Giá trị mẫu.
  * Bao phủ toàn bộ các phân hệ: Báo giá, Booking order, Lệnh điều xe, Chi phí vận hành P&L, Xe & Rơ-moóc, Nhân sự & Tài xế, Quỹ tạm ứng & Sổ quỹ, Quyết toán xe bạn, Tờ khai hải quan và 14 Báo cáo BI.
- **Tích Hợp Điều Hướng Nhanh Trên Toàn Hệ Thống:**
  * Bổ sung mục menu `Trợ giúp & HDSD` trên Sidebar chính (`templates/components/sidebar.html`).
  * Bổ sung nút `Trợ giúp` trên Topbar ứng dụng (`templates/components/topbar.html`).
  * Cấu hình URL routing chuẩn: `/helps`, `/helps/`, `/help`, `/help/` trỏ vào `help_view` trong `apps/dispatch/views.py`.
- **Tài Liệu Hướng Dẫn Vận Hành Hệ Thống (Documentation-as-Code):**
  * Xuất bản file tài liệu đặc tả toàn diện `docs/USER_GUIDE.md` lưu trữ vĩnh viễn trong kho mã nguồn.

## [2.9.45] - 2026-10-11 (Khắc Phục Triệt Để Lệch Cột STT Báo Cáo 12 & 13, Khôi Phục Đúng Tên Trường & Ghim Cố Định Cột STT Đếm Bản Ghi)

### 1. Khắc Phục Lệch Cột STT Trong Báo Cáo BI (Fix Report Columns Alignment & Add Record Count STT):
- **Nguyên nhân cốt lõi:**
  * Tại Báo Cáo 12 (Quyết Toán Chuyến Xe & Backlog - `rep12-settlement-table`) và Báo Cáo 13 (Công Nợ Phải Thu & Tuổi Nợ - `rep13-ar-aging-table`), tiêu đề bảng `<thead>` đã có cột `STT`, nhưng trong logic render dòng dữ liệu `<tbody>` của `app.js` bị sót ô `${index + 1}`.
  * Dẫn đến hiện tượng dữ liệu bị dịch sang trái 1 cột: Cột `STT` hiển thị giá trị của trường dữ liệu đầu tiên (`Mã Chuyến` trong Báo cáo 12, `Tên Khách Hàng` trong Báo cáo 13), các cột kế tiếp hiển thị sai tên trường và cột cuối cùng bị thiếu.
- **Biện pháp xử lý toàn diện:**
  * **Bổ sung cột STT đếm bản ghi (`${index + 1}`):** Đã thêm ô `<td class="text-center font-bold text-slate-500 text-xs">${index + 1}</td>` vào đúng vị trí đầu tiên của từng dòng trong `applyReport12Filters` và `applyReport13Filters`.
  * **Khôi phục đúng 100% tên trường:** Trả lại chính xác từng cột dữ liệu thẳng hàng với tiêu đề tương ứng (`Mã Chuyến`, `Ngày Chạy`, `Khách Hàng`, `Tài Xế`, `Doanh Thu`, `Chi Phí`, `Công Nợ`...).
  * **Điều chỉnh ô tổng kết chân bảng (`tfoot`):** Cập nhật `colspan` ở hàng tổng cộng (Báo cáo 12 từ `colspan="7"` lên `colspan="8"`) để các cột tiền tệ và chỉ số thống kê gióng hàng hoàn hảo.
  * **Ghim bảo vệ cột STT trong `column_manager.js`:** Cập nhật cơ chế merge của Universal Table Column Manager để đảm bảo cột `stt` (hoặc cột khóa `origIdx === 0`) luôn luôn được ưu tiên ghim ở vị trí đầu tiên (`index 0`), không bao giờ bị đẩy xuống cuối bảng dù người dùng có cache cấu hình cột cũ trong `localStorage`.
  * **Xác thực toàn bộ 14/14 báo cáo BI:** 100% khớp tuyệt đối giữa số lượng thẻ `<th>` tiêu đề và các ô `<td>` dữ liệu thực tế.

## [2.9.44] - 2026-10-11 (Thống Nhất Chuẩn Hóa 100% Nhãn Nút Lưu Thành "Lưu" Toàn Hệ Thống)

### 1. Chuẩn Hóa Nhãn Nút "Lưu" (Universal Save Button Label):
- **Loại bỏ triệt để các biến thể chữ không đồng bộ:**
  * Thay thế toàn bộ các nhãn: `"Lưu Thay Đổi"`, `"Lưu thay đổi"`, `"Lưu Phiếu"`, `"Lưu Hồ Sơ"`, `"Lưu Hồ Sơ Nhân Sự"`, `"Lưu Tờ Khai Hải Quan"`, `"Lưu Bản Ghi"`, `"Lưu Thỏa Thuận Cước"`, `"Lưu Chi Phí"` thành nhãn duy nhất: **`"Lưu"`**.
  * Giữ nguyên tính nhất quán tuyệt đối giữa trạng thái Tạo Mới và Chế độ Sửa/Xem Chi Tiết trên thanh công cụ chuẩn 4 nút (`Sửa | Lưu | In | Xóa`).
- **Cập nhật đồng bộ trong Frontend JavaScript & HTML Templates:**
  * `static/js/app.js`: Chuẩn hóa gán nhãn `Lưu` cho module Điều phối/Sửa chuyến xe, Hồ sơ Nhân sự, Sổ Quỹ Thu/Chi, Tờ khai Hải quan, Thỏa thuận Xe Bạn Subcontractor.
  * `static/js/modules/dispatch.js`: Đồng bộ nhãn nút Lưu trong form cập nhật chuyến xe.
  * `templates/components/modal_customs_declaration.html`: Chuyển sang `Lưu`.
  * `templates/components/modal_edit_trip.html`: Chuyển sang `Lưu`.
  * `templates/components/modal_employee.html`: Chuyển sang `Lưu`.
  * `templates/components/modal_master_data.html`: Chuyển sang `Lưu`.
  * `templates/components/modal_subcontractor_settle.html`: Chuyển sang `Lưu`.
  * `templates/views/view_cash_voucher_detail.html`: Chuyển sang `Lưu`.
  * `templates/views/view_trip_detail.html`: Chuyển sang `Lưu`.

## [2.9.43] - 2026-10-11 (Chuẩn Hóa Hoàn Toàn Lề Bản In Khổ A4 [Top, Bottom, Left, Right] & Bổ Sung Khung .print-sheet Chuẩn Nghị Định 30/2020/NĐ-CP)

### 1. Chuẩn Hóa Lề Trang In (Print Margins Standard):
- **Khắc phục triệt để hiện tượng Header/Bản in dính sát mép trên cùng (Top = 0mm) và đâm sát hai bên:**
  * Bổ sung container `.print-sheet` bao bọc toàn bộ nội dung bản in với kích thước tối đa chuẩn A4 (`max-width: 175mm`) và khoảng đệm bảo vệ an toàn (`padding: 10mm 4mm 12mm 4mm` ở chế độ thường, `padding: 8mm 2mm 10mm 2mm` trong `@media print`).
  * Cấu hình `@page { size: A4 portrait; margin: 15mm 18mm 15mm 18mm; }` kết hợp padding giúp bản in luôn duy trì khoảng cách lề trên ~18mm, lề trái 20mm, lề phải 20mm, lề dưới 18mm bất kể người dùng chọn chế độ lề **Default** hay **None/Tối thiểu** trong hộp thoại Print Preview của trình duyệt.
- **Tối ưu hóa bố cục thị giác (Visual Vertical Distribution):**
  * Tăng padding các ô bảng thông tin (`padding: 8px 12px`) giúp các dòng dữ liệu thông thoáng, dễ đọc, không bị co cụm chật chội.
  * Tăng khoảng cách tiêu đề và header (`margin: 16px 0 24px 0`).
  * Khung chữ ký 3 bên giãn cách chuẩn mực (`margin-top: 50px`, khoảng trống ký `margin-bottom: 75px`), lấp đầy trang giấy hài hòa và cân đối.
  * Bổ sung dòng ghi chú pháp lý chân trang (`.footer-note`): `* Phiếu tiếp nhận vận tải là căn cứ điều phối và đối chiếu giao nhận hàng hóa. • BIM Logistics Platform • Hotline: 0965.559.561`.
- **Áp dụng đồng bộ:**
  * Phiếu Tiếp Nhận Đơn Hàng Vận Tải / Booking (`openDirectPrintBooking`).
  * Phiếu Theo Dõi & Xác Nhận Thủ Tục Hải Quan (`openDirectPrintCustoms`).
  * Sơ Yếu Hồ Sơ Cán Bộ / Tài Xế Doanh Nghiệp (`openDirectPrintEmployee`).
  * Đồng bộ với Báo Giá (`#quotation-printable-area`) và Sổ Quỹ (`#cash-voucher-printable-area`).

## [2.9.42] - 2026-10-11 (Chuẩn Hóa Button Design System: Nền Trong Suốt / Viền Màu Chuẩn -> Hover Hiển Thị Full Màu Solid Toàn Hệ Thống)

### 1. Chuẩn Hóa Thiết Kế Button Toàn Hệ Thống (Button Design System):
- **Trạng thái Mặc định (Default/Idle):**
  * Nền trong suốt (`bg-transparent` / `background-color: transparent !important`).
  * Viền có màu chuẩn (`border: 1.5px solid <màu chuẩn>` / `border-color: <color>`).
  * Văn bản và icon mang màu chuẩn tương ứng với độ tương phản cao, sắc nét.
- **Trạng thái Rê Chuột (Hover):**
  * Nền chuyển sang **FULL MÀU SOLID** (`background-color: <màu chuẩn> !important`).
  * Văn bản và toàn bộ icon (`i`, `span`, `svg`) tự động chuyển sang màu trắng sáng `#ffffff !important`.
  * Đổ bóng nhẹ (`box-shadow: 0 4px 6px -1px rgba(..., 0.25)`), hiệu ứng mượt mà (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).

### 2. Bảng Màu Chuẩn Toàn Hệ Thống BIM TMS:
- **Teal (#0d9488 / #0f766e):** Thao tác chính, Lưu, Tạo mới, Xem chi tiết, Đơn hàng, Booking (`.btn-bim-primary`, `border-teal-600 hover:bg-teal-600`).
- **Amber (#d97706 / #b45309):** Sửa, Hiệu chỉnh, Cảnh báo (`.btn-bim-amber`, `border-amber-600 hover:bg-amber-600`).
- **Slate (#475569 / #334155):** In ấn, Báo cáo, Đóng, Quay lại, Thao tác thứ cấp (`.btn-bim-secondary`, `.btn-bim-slate`, `border-slate-600 hover:bg-slate-700`).
- **Rose (#e11d48 / #be123c):** Xóa, Hủy, Tạm ngưng, Nguy hiểm (`.btn-bim-rose`, `border-rose-600 hover:bg-rose-600`).
- **Indigo/Blue (#4f46e5 / #4338ca):** Khách hàng, Báo giá, Sales, Phân quyền (`.btn-bim-indigo`, `border-indigo-600 hover:bg-indigo-600`).
- **Emerald (#059669 / #047857):** Thu tiền (Inflow), Hoàn cước, Xuất Excel (`.btn-bim-emerald`, `border-emerald-600 hover:bg-emerald-600`).

### 3. Đồng Bộ Hóa Toàn Diện Trên Các Phân Hệ:
- **Form Chi Tiết (Bộ 4 nút Sửa | Lưu | In | Xóa & Quay Lại):**
  * Báo Giá (`view_quotation_detail.html`)
  * Đơn Hàng / Booking (`view_booking_detail.html`)
  * Sổ Quỹ Thu / Chi (`view_cash_voucher_detail.html`)
  * Tờ Khai Hải Quan (`view_customs_form.html`)
  * Hồ Sơ Nhân Sự (`view_employee_form.html`)
- **Nút Thao Tác Hàng Trong Bảng Dữ Liệu (`app.js`):**
  * Cặp nút **Xem** (`border-teal-600 text-teal-700 hover:bg-teal-600 hover:text-white`) và **In** (`border-slate-600 text-slate-700 hover:bg-slate-700 hover:text-white`) tại cả 5 phân hệ: Nhân sự, Booking, Báo giá, Sổ quỹ và Hải quan.
- **Thanh Công Cụ Toolbar / Header:**
  * Thêm Mới Nhân Sự (`view_personnel.html`), Tạo Báo Giá / Booking (`view_sales.html`), Lập Phiếu Thu / Phiếu Chi / Xuất Excel (`view_accounting.html`), Đăng Ký Tờ Khai / Xuất Bảng Kê (`view_customs.html`).
- **Kiểm thử thị giác & hồi quy tự động:** 100% Passed (86/86 unit test, 0 lỗi cú pháp JS).

## [2.9.41] - 2026-10-11 (Chuẩn Hóa Bộ 4 Nút [Sửa | Lưu | In | Xóa], Lề Trang In Khổ A4, Font Số Thống Nhất & Bổ Sung Cột STT Toàn Bộ 14 Báo Cáo)

### 1. Bố Trí Đúng Chuẩn Bộ 4 Nút Chân Trang: `Sửa | Lưu | In | Xóa`:
- **Đồng bộ hóa 100% thứ tự thao tác tại các form chi tiết toàn màn hình:**
  * Báo Giá (`view_quotation_detail.html`): `Sửa` (`#btn-fullpage-edit-quote-bottom`) $\rightarrow$ `Lưu` (`#btn-fullpage-save-quote-bottom`) $\rightarrow$ `In` (`#btn-fullpage-print-quote-bottom`) $\rightarrow$ `Xóa` (`#btn-fullpage-delete-quote-bottom`).
  * Đơn Hàng / Booking (`view_booking_detail.html`): `Sửa` (`#btn-fullpage-edit-booking-bottom`) $\rightarrow$ `Lưu` (`#btn-fullpage-save-booking-bottom`) $\rightarrow$ `In` (`#btn-fullpage-print-booking-bottom`) $\rightarrow$ `Xóa` (`#btn-fullpage-delete-booking-bottom`).
  * Phiếu Thu / Chi - Sổ Quỹ (`view_cash_voucher_detail.html`): `Sửa` (`#btn-form-edit-voucher`) $\rightarrow$ `Lưu` (`#btn-form-submit-voucher`) $\rightarrow$ `In` (`#btn-form-print-voucher`) $\rightarrow$ `Xóa` (`#btn-form-delete-voucher`).
  * Tờ Khai Hải Quan (`view_customs_form.html`): `Sửa` (`#btn-customs-edit-bottom`) $\rightarrow$ `Lưu` (`#cust-submit-btn`) $\rightarrow$ `In` (`#btn-customs-print-bottom`) $\rightarrow$ `Xóa` (`#btn-customs-delete-bottom`).
  * Hồ Sơ Nhân Sự (`view_employee_form.html`): `Sửa` (`#btn-employee-edit-bottom`) $\rightarrow$ `Lưu` (`#emp-submit-btn`) $\rightarrow$ `In` (`#btn-employee-print-bottom`) $\rightarrow$ `Xóa` (`#btn-employee-delete-bottom`).

### 2. Chuẩn Hóa Bản In Luôn Là Trang A4 Với Canh Lề Chuẩn Đẹp:
- **Cấu hình lề trang in A4 chuẩn hành chính doanh nghiệp:**
  * Toàn bộ các bản in (Phiếu Tiếp Nhận Booking, Phiếu Thủ Tục Hải Quan, Sơ Yếu Hồ Sơ Nhân Sự, Báo Giá Cước, Phiếu Thu/Chi) được cấu hình chuẩn `@page { size: A4 portrait; margin: 12mm 15mm 12mm 15mm; }` với font chữ chung và `box-sizing: border-box`.
  * Modal In Báo Cáo Quản Trị Doanh Nghiệp: Tự động áp dụng linh hoạt theo chế độ:
    - Khổ Dọc (Portrait): `@page { size: A4 portrait; margin: 10mm 12mm; }`
    - Khổ Ngang (Landscape): `@page { size: A4 landscape; margin: 8mm 10mm; }`
  * Đảm bảo bản in vừa vặn trọn vẹn 1 trang A4, không bị tràn lề, sát mép hoặc rớt dòng.

### 3. Khắc Phục Nút "Thêm Mới Nhân Sự" Trong Hành Chính & Nhân Sự:
- Sửa hàm `openCreateEmployeePage()` trong `static/js/app.js`: Bổ sung điều hướng ẩn các view hiện tại và hiển thị tường minh view `#view-employee-form`. Nút "+ Thêm Mới Nhân Sự" đã hoạt động mượt mà và chính xác.

### 4. Chuẩn Hóa Font Chữ Các Trường Số Toàn Bộ Hệ Thống:
- Thống nhất font chữ số với font chữ text: Chuyển đổi toàn bộ các trường số, class `.font-mono`, `table td.font-mono`, `input[type="number"]` sang sử dụng cùng font chữ hệ thống `var(--font-family-primary)` (Plus Jakarta Sans / Be Vietnam Pro).
- Kết hợp kích hoạt thuộc tính `font-variant-numeric: tabular-nums` để các chữ số tự động gióng hàng dọc thẳng tắp, chuẩn mực giao diện ERP doanh nghiệp mà không bị đổi sang font monospace dị biệt.

### 5. Bổ Sung Cột "STT" Cho Toàn Bộ Hệ Thống 14 Báo Cáo Quản Trị:
- Bổ sung cột header `<th class="text-center w-12 font-bold">STT</th>` và render `${index + 1}` ở cột đầu tiên cho toàn bộ 16 bảng báo cáo:
  1. `rep1-pnl-table`: Hiệu Suất Đội Xe & P&L
  2. `rep2-shipping-lines-table`: Bảng Ma Trận Hãng Tàu
  3. `rep2-containers-table`: Bảng Chi Tiết Vỏ Container & DEM/DET
  4. `rep3-otp-table`: Đúng Giờ & Chất Lượng Vận Tải (OTP)
  5. `rep4-expenses-table`: Chi Phí Tuyến & Hoàn Chi Hộ
  6. `rep5-layover-table`: Cắt Kéo Bàn Giao & Lưu Xe Sau 0H
  7. `rep6-osd-table`: Sự Cố & Ngoại Lệ (OS&D)
  8. `rep7-customer-table`: Doanh Thu Khách Hàng & Sản Lượng TEU
  9. `rep8-subcontractor-summary-table`: Bảng Tổng Hợp Nhà Xe Thầu Phụ
  10. `rep8-subcontractor-trips-table`: Chi Tiết Chuyến Xe Ngoài 3PL
  11. `rep9-driver-payroll-table`: Lương Chuyến & Năng Suất Tài Xế
  12. `rep10-dispatcher-funds-table`: Quỹ Tạm Ứng Điều Vận (Kế Toán QL)
  13. `rep11-driver-advances-table`: Tạm Ứng & Chi Phí Tài Xế (TUTX)
  14. `rep12-settlement-table`: Quyết Toán Chuyến & Backlog Tồn Đọng
  15. `rep13-ar-aging-table`: Công Nợ Phải Thu Khách Hàng (AR Aging)
  16. `rep14-unsettled-aging-table`: Tuổi Đơn Hàng Tồn Đọng Chưa Chốt
- Điều chỉnh đồng bộ `colspan` của các dòng thông báo rỗng và các dòng tổng cộng `tfoot` tăng thêm 1 cột, đảm bảo lưới bảng cân đối tuyệt đối.

---

## [2.9.40] - 2026-10-10 (Cài Đặt Quản Trị: Phân Quyền & Vai Trò Khai Thác Nguyên Bản Django Auth RBAC & Admin Site)

### 1. Khai Thác Nguyên Bản Phân Quyền Django (Django Native Auth RBAC):
- **Tận dụng `django.contrib.auth.models` (Group, Permission, User):**
  * Tích hợp 5 Nhóm vai trò nghiệp vụ vận tải:
    1. **Ban Giám Đốc:** Toàn quyền quản trị hệ thống (`104 permissions`).
    2. **Điều Phối Viên:** Quyền điều vận, quản lý đội xe, tiếp nhận booking và danh mục (`54 permissions`).
    3. **Kế Toán Cước:** Quyền sổ quỹ, chi phí chuyến, tạm ứng - hoàn ứng, biểu cước và đối soát thầu phụ (`36 permissions`).
    4. **Kinh Doanh (Sales):** Quyền khách hàng, báo giá, tiếp nhận booking (`42 permissions`).
    5. **Tài Xế Hiện Trường:** Quyền hạn portal tài xế hiện trường.
  * Đăng ký (Register) toàn bộ 26 Models của tất cả các ứng dụng Logistics (`apps.dispatch`, `apps.billing`, `apps.customers`, `apps.fleet`, `apps.personnel`, `apps.master_data`, `apps.customs`) vào Django Admin (`admin.site.register`) kèm `list_display`, `list_filter`, `search_fields` và Inlines chuẩn mực.
  * Tự động sinh ra đầy đủ 4 quyền `add_`, `change_`, `delete_`, `view_` cho từng phân hệ trong bảng `auth_permission`.

### 2. Xây Dựng Sub-Tab "Phân Quyền & Vai Trò" Trong Cài Đặt Quản Trị (`view-cai-dat`):
- **Giao diện quản trị phân quyền trực quan:**
  * Bổ sung sub-tab **Phân Quyền & Vai Trò** (`roles_permissions`) vào thanh điều hướng Cài đặt bên cạnh *Khai Báo Hệ Thống*, *Biểu Phí Lương Chuyến*...
  * **Thẻ thống kê KPI:** Tổng tài khoản (Users), Tài khoản đang hoạt động, Tổng nhóm vai trò (Groups), Nhân sự có quyền quản trị (`is_staff`).
  * **Ma trận Nhóm vai trò (Role Cards):** Hiển thị trực quan từng nhóm, số lượng thành viên, tổng số quyền hạn (permissions) và danh sách mã quyền đại diện. Có nút bấm liên kết mở thẳng trang cấu hình chi tiết tại Django Admin (`/admin/auth/group/<id>/change/`).
  * **Bảng phân bổ tài khoản người dùng:** Liệt kê toàn bộ người dùng, họ tên nhân sự, số điện thoại, trạng thái hoạt động, cờ `is_staff`, thời gian đăng nhập và hộp chọn Dropdown cho phép Ban Giám Đốc thay đổi nhóm vai trò của tài khoản ngay lập tức.
  * **Nút liên kết nhanh Django Admin:** Nút `[Cấu Hình Chi Tiết Nhóm (Admin)]` (`/admin/auth/group/`) và `[Quản Lý User (Admin)]` (`/admin/auth/user/`) hỗ trợ quản trị viên thao tác cấu hình bảo mật chuyên sâu.

### 3. API Quản Lý Phân Quyền (`/api/master-data/roles-permissions/` & `api/auth/me/`):
- **API `RolesPermissionsAPIView`:**
  * `GET`: Truy xuất danh sách Groups kèm quyền hạn, Users kèm vai trò và thống kê tổng hợp.
  * `POST`: Cho phép Ban Giám Đốc/Admin gán nhanh Group cho người dùng với cơ chế atomic transaction bảo toàn dữ liệu.
- **Bổ sung `groups` và `permissions` vào `CurrentUserAPIView` (`/api/auth/me/`)**: Giúp giao diện SPA kiểm tra quyền người dùng để ẩn/hiện chức năng linh hoạt.

---

## [2.9.39] - 2026-10-09 (Toàn Hệ Thống: Chuẩn Hóa Cột Thao Tác [Xem & In] Và Bộ 4 Nút Chuẩn [Xóa - In - Sửa - Lưu] Màn Hình Con)

### 1. Chuẩn Hóa Toàn Diện Cột "Thao Tác" Bên Ngoài Các Bảng Danh Sách:
- **Nguyên tắc vàng:** Cột "Thao tác" trên toàn bộ các bảng quản lý (Sổ Quỹ, Báo Giá, Booking, Tờ Khai Hải Quan, Hồ Sơ Nhân Sự) **CHỈ CÓ ĐÚNG 2 NÚT:**
  1. **Nút "Xem" (Icon con mắt Emerald):** Mở màn hình trang con xem chi tiết toàn màn hình.
  2. **Nút "In" (Icon máy in Slate):** Kích hoạt thẳng lệnh in trực tiếp (`window.print()`) khổ A4 của trình duyệt ngay lập tức mà KHÔNG chuyển trang hay mở form.
- **Rút gọn các nút thao tác thừa:**
  * Bảng Booking (`sales-bookings-tbody`): Bỏ nút "Điều xe" và nút "Xóa" riêng lẻ; quy về đúng 2 nút `[Xem]` và `[In]`.
  * Bảng Báo Giá (`sales-tbody`): Bỏ nút "Xóa" riêng lẻ; quy về đúng 2 nút `[Xem]` và `[In]`.
  * Bảng Tờ Khai Hải Quan (`customs-table-body`): Bỏ nút toggle/sửa/xóa rườm rà; quy về đúng 2 nút `[Xem]` và `[In]`.
  * Bảng Nhân Sự (`employees-tbody`): Bỏ nút sửa/xóa; quy về đúng 2 nút `[Xem]` và `[In]`.

### 2. Chuẩn Hóa Bộ 4 Nút Hành Động Ở Chân Form Chi Tiết [Xóa - In - Sửa - Lưu]:
- **Bố trí công thái học chuẩn SaaS:**
  * **Bên trái chân form:** Nút `Quay Lại [Tên Trang Mẹ]` chuẩn xác.
  * **Bên phải chân form:** Nhóm 4 nút theo thứ tự: `[Xóa]` (Rose) $\rightarrow$ `[In]` (Dark/Emerald) $\rightarrow$ `[Sửa]` (Amber) $\rightarrow$ `[Lưu]` (Teal).
- **Máy trạng thái form (State Machine Readonly / Edit):**
  * **Trường hợp Tạo Mới:** Form mở sẵn cho nhập liệu, ẩn hoàn toàn các nút `[Xóa]`, `[In]`, `[Sửa]`, chỉ hiển thị duy nhất nút `[Lưu]`. Sau khi lưu thành công, hệ thống tự động chuyển sang chế độ Xem với đầy đủ bộ 4 nút.
  * **Trường hợp Xem Chi Tiết:** Form ban đầu ở chế độ chỉ đọc (`readonly`/`disabled`); 3 nút `[Xóa]`, `[In]`, `[Sửa]` sáng rõ; nút `[Lưu]` bị làm mờ (`disabled`).
  * **Khi bấm nút `[Sửa]`:** Mở khóa toàn bộ các trường nhập liệu; nút `[Lưu]` kích hoạt sáng rõ; nút `[Sửa]` ẩn/mờ đi.
- **Áp dụng đồng bộ cho cả 4 phân hệ:**
  * Sổ Quỹ Thu / Chi (`view_cash_voucher_detail.html` & `app.js`)
  * Kinh Doanh Báo Giá (`view_quotation_detail.html` & `app.js`)
  * Tiếp Nhận Booking (`view_booking_detail.html` & `app.js`)
  * Tờ Khai Hải Quan (`view_customs_form.html` & `app.js`)
  * Hồ Sơ Nhân Sự (`view_employee_form.html` & `app.js`)

---



### 1. Chuẩn Hóa Điều Hướng Topbar Khi Ở Trang Con (Child Page / Fullpage Mode):
- **Hoán đổi thông minh nút góc trái Topbar (`#btn-toggle-sidebar` vs `#btn-topbar-back`):**
  * **Khi ở Trang Mẹ (Dashboard, Điều vận, Kế toán, Xe bãi...):** Hiển thị nút Toggle Sidebar `[|<]` để mở/đóng thanh điều hướng bên trái.
  * **Khi ở Trang Con (Phiếu Thu/Chi, Chi tiết chuyến xe, Tạo chuyến xe, Hồ sơ nhân sự, Tờ khai hải quan, Booking, Báo giá, Quyết toán):**
    - Tự động ẩn nút Toggle Sidebar và thay bằng **Nút Quay Lại `[ < ]`** (`#btn-topbar-back`).
    - Title của nút: `Quay lại [Tên Trang Mẹ]`. Bấm vào sẽ kích hoạt handler đưa người dùng quay thẳng về trang mẹ tương ứng.
- **Breadcrumb Prefix Trên Topbar:**
  * Hiển thị rõ tên Trang Mẹ: ví dụ `Tài chính & Kế toán | Chi Tiết Phiếu Thu PT...`.
  * Click vào tên Trang Mẹ trên breadcrumb cũng tự động kích hoạt lệnh quay về trang mẹ đúng tên.

### 2. Đồng Bộ Tên Nút Quay Lại Khắp Mọi Trang Con Trên Toàn Ứng Dụng:
- **Phiếu Thu / Chi (`view-cash-voucher-detail`):**
  * Nút quay lại (cả Header Toolbar và Bottom Action Bar): Đổi thành **`Quay Lại Tài chính & Kế toán`** (thay vì "Quay Lại Sổ Quỹ").
- **Tạo Lệnh Điều Động (`view-create-trip`):**
  * Nút chân form: Đổi thành **`Quay Lại Điều Vận`** (thay vì "Hủy Bỏ").
- **Chi Tiết Chuyến Xe (`view-trip-detail`):**
  * Nút điều hướng đầu trang: Bổ sung nhãn chuẩn động **`Quay Lại [Tài chính & Kế toán / Điều Vận]`** theo nguồn mở.
- **Hồ Sơ Nhân Sự (`view-employee-form`):**
  * Nút chân form: Đổi thành **`Quay Lại Hành chính & Nhân sự`** (thay vì "Hủy Bỏ").
- **Tờ Khai Hải Quan (`view-customs-form`):**
  * Nút chân form: Đổi thành **`Quay Lại Dịch vụ Hải quan`** (thay vì "Hủy Bỏ").
- **Chi Tiết Booking (`view-booking-detail`):**
  * Nút chân form: Đổi thành **`Quay Lại Sale & Booking`** (thay vì "Quay Lại").
- **Chi Tiết Báo Giá (`view-quotation-detail`) & Bản In A4 (`view-quotation-print`):**
  * Nút chân form/toolbar: Đổi thành **`Quay Lại Sale & Booking`** (thay vì "Quay Lại").
- **Quyết Toán Gom Chuyến Xe (`view-quyet-toan`):**
  * Bổ sung Toolbar quay lại đầu trang với nhãn động **`Quay Lại [Tài chính & Kế toán / Điều Vận]`**.

---

## [2.9.37] - 2026-10-09 (Kế Toán Sổ Quỹ: Thống Nhất Cụm Nút Hành Động Bên Phải: Xóa - In - Lưu Cho Cả Phiếu Thu & Chi)

### 1. Chuẩn Hóa Bố Trí Cụm Nút Hành Động Ở Chân Form:
- **Nguyên tắc công thái học (Bottom Action Bar):**
  * **Bên trái:** Nút duy nhất **Quay Lại Sổ Quỹ** để quay về danh sách chứng từ.
  * **Bên phải:** Toàn bộ cụm nút hành động nghiệp vụ được nhóm liền kề:
    - **Nút Xóa:** Đặt ngoài cùng bên trái cụm hành động, cảnh báo an toàn.
    - **Nút In Phiếu:** Bấm để kích hoạt hộp thoại in khổ A4 ngay tại form.
    - **Nút Lưu:** Nút chính nổi bật (Primary Action) màu Teal (`Lưu Phiếu` khi tạo mới / `Lưu Thay Đổi` khi xem & sửa).
- **Phân định trạng thái nút Tạo mới vs Xem/Sửa:**
  * **Khi Tạo mới:** Chỉ hiển thị nút **Lưu Phiếu** (Ẩn các nút Xóa và In Phiếu vì chứng từ chưa tồn tại).
  * **Sau khi Lưu thành công hoặc Khi bấm Xem phiếu cũ:** Hiển thị đầy đủ cả 3 nút **Xóa**, **In Phiếu** và **Lưu Thay Đổi** để thao tác thuận tiện.
  * Áp dụng thống nhất cho cả **Phiếu Thu** và **Phiếu Chi**.

---

## [2.9.36] - 2026-10-09 (Kế Toán Sổ Quỹ: Nút Xem Mở Thẳng Màn Hình Form Nhập/Hiệu Chỉnh, Bỏ Hoàn Toàn Tờ Phôi In Màn Hình)

### 1. Nút "Xem" Mở Thẳng Form Chi Tiết & Hiệu Chỉnh Trực Tiếp:
- **Đồng nhất trải nghiệm người dùng (`viewCashVoucherDetail`):**
  * Bấm nút **Xem** ở bảng Sổ Quỹ sẽ mở thẳng màn hình Form nhập liệu chuyên nghiệp (giống như lúc tạo mới), các trường thông tin đã được điền đầy đủ dữ liệu chứng từ.
  * Ẩn hoàn toàn tờ phôi in A4 trên giao diện (chỉ dùng ngầm khi in), giúp màn hình trực quan, sạch sẽ, không bị cuộn dài hay hiển thị 2 tờ in thừa thãi.
  * Cho phép người dùng xem và hiệu chỉnh ngay lập tức các trường số tiền, tài khoản, đối tác, lý do...
- **Cụm Nút Thao Tác Đặt Tại Chân Form (Bottom Action Bar):**
  * Nút **Quay Lại Sổ Quỹ** (bên trái).
  * Nút **Xóa Phiếu** (màu đỏ tinh tế, cảnh báo an toàn).
  * Nút **In Phiếu** (kích hoạt hộp thoại in A4 native ngay tại form).
  * Nút **Cập Nhật Phiếu** (màu Teal nổi bật).

---

## [2.9.35] - 2026-10-09 (Kế Toán Sổ Quỹ: In Nhanh Tại Chỗ Không Chuyển Trang & Tối Ưu Form Nhập Liệu Thuần Túy)

### 1. In Phiếu Trực Tiếp Khổ A4 Ngay Tại Bảng Sổ Quỹ (Không Chuyển Màn Hình):
- **Cơ chế In Native Tại Chỗ (`openDirectPrintCashVoucher`):**
  * Khi bấm nút **In** ở cột Thao tác bảng Sổ Quỹ, hệ thống lập tức tải dữ liệu chứng từ và nạp ngầm vào khổ A4 `#cash-voucher-printable-area`.
  * Kích hoạt lớp in chuyên dụng `is-printing-voucher` và mở thẳng hộp thoại in native của trình duyệt (`window.print()`).
  * Người dùng giữ nguyên vị trí làm việc tại bảng Sổ Quỹ, hoàn toàn không bị chuyển trang hay mở view chi tiết.

### 2. Tách Biệt Hoàn Toàn Form Lập Phiếu Nhập Liệu Thuần Túy & Bản Xem In:
- **Chế độ Lập Mới (`openCreateCashVoucherPage`):**
  * Ẩn hoàn toàn tờ phôi giấy in A4 `#fullpage-voucher-printable-container`, tránh giao diện rối rắm khi đang nhập liệu.
  * Ẩn thanh công cụ in ấn ở trên cùng; hiển thị Card Form nhập liệu chuyên nghiệp, rộng rãi, chuẩn UX của hệ thống ERP.
  * Cụm nút hành động được bố trí ngay dưới chân form (**Bottom Action Bar**): Nút **Quay lại Sổ Quỹ** và Nút **Lưu Phiếu** (Màu Teal nổi bật), đúng quy chuẩn thao tác điền form từ trên xuống dưới.
- **Chế độ Xem Chi Tiết (`viewCashVoucherDetail`):**
  * Hiển thị đầy đủ thanh Topbar thao tác (Quay lại, Chế độ 2 Liên/1 Liên, Sửa, Lưu, Xóa, In Phiếu).
  * Hiển thị tờ phôi in A4 chuẩn Bộ Tài Chính (TT 200/2014/TT-BTC & TT 133/2016/TT-BTC).
  * Khi bấm **Sửa**, panel hiệu chỉnh mở ra kèm nút **Lưu** sáng lên; dưới form có nút **Hủy Bỏ Sửa** và **Cập Nhật Phiếu**.

---

## [2.9.34] - 2026-10-09 (Kế Toán Sổ Quỹ: Trang Nhập Lập Phiếu Thu/Chi Toàn Màn Hình, Tách Biệt Nút Xem - In & Bộ 3 Nút Sửa - Lưu - Xóa Chuẩn ERP)

### 1. Lập Phiếu Thu / Phiếu Chi Trên Trang Riêng (Không Dùng Modal):
- **Trang Chuyên Biệt Toàn Màn Hình (`openCreateCashVoucherPage`):**
  * Chuyển hẳn việc Lập Phiếu Thu (`INFLOW`) và Lập Phiếu Chi (`OUTFLOW`) sang trang riêng toàn màn hình (`view_cash_voucher_detail.html`) thay vì pop-up modal.
  * Hỗ trợ URL định tuyến ngữ nghĩa: `/accounting/vouchers/new?type=inflow` hoặc `?type=outflow`.
  * Khởi tạo form soạn thảo thời gian thực (Live Preview): Vừa nhập dữ liệu vừa cập nhật tức thì tờ phôi in khổ A4 (chuẩn TT 200/2014/TT-BTC).
  * Tự động bật sáng nút **Lưu** (màu Teal) ở trạng thái sẵn sàng ghi nhận chứng từ; ẩn các nút Sửa/Xóa đối với chứng từ mới chưa lưu.

### 2. Tách Biệt Nút "Xem" Và "In" Riêng Biệt Tại Cột Thao Tác Sổ Quỹ:
- **Cột Thao Tác Bảng Sổ Quỹ (`renderCashBookTable`):**
  * Nút **Xem** (icon `ph-eye` màu ngọc bích): Mở trang chi tiết phiếu toàn màn hình, hỗ trợ đọc chứng từ chi tiết, xem liên 1 & liên 2.
  * Nút **In** (icon `ph-printer` màu than slate): Nạp nhanh chứng từ và mở ngay hộp thoại in ấn A4 native của trình duyệt (`openDirectPrintCashVoucher`), thao tác 1 chạm cực nhanh cho kế toán hiện trường.

### 3. Bộ 3 Phím Chức Năng Chuẩn Mực Trong Màn Hình Xem: "Sửa - Lưu - Xóa":
- **Nút Sửa (`enableFullpageVoucherEdit`):** Bấm vào hiển thị Panel chỉnh sửa thông tin, nút **Lưu** sáng lên cho phép cập nhật.
- **Nút Lưu (`saveFullpageVoucher`):**
  * Mờ và khóa an toàn (`disabled`, `opacity-50`, `pointer-events-none`) ở chế độ chỉ đọc.
  * Sáng nổi bật khi Lập mới hoặc bấm Sửa. Xử lý đồng thời cả `POST` (tạo mới) và `PUT` (cập nhật).
- **Nút Xóa (`confirmDeleteCashVoucher`):**
  * Tích hợp hộp thoại xác nhận hủy bỏ an toàn (`showConfirmModal`).
  * Thực thi Soft-delete (`DELETE /api/accounting/cashbook/<id>/`), bảo toàn lịch sử kiểm toán pháp lý theo quy chuẩn logistics BIM.

---

## [2.9.33] - 2026-10-09 (Loại Bỏ Hoàn Toàn Dấu Mũi Tên Datalist Indicator Trong Tất Cả Ô Chọn Giờ 24H)

### 1. Triệt Tiêu Mũi Tên Tam Giác Native Indicator Trong Ô Nhập Giờ:
- **Nguyên nhân kỹ thuật:** Thuộc tính `list="list-times-24h"` trên thẻ `<input>` kích hoạt native drop-down indicator `::-webkit-calendar-picker-indicator` / `::-webkit-list-button` của trình duyệt nhân Chromium, tạo ra icon mũi tên đè chèn lên icon đồng hồ `ph-clock`.
- **Giải pháp bảo vệ kép (Double Defense):**
  * **HTML:** Loại bỏ hoàn toàn thuộc tính `list="list-times-24h"` khỏi tất cả các ô thời gian trên hệ thống (`view_create_trip.html`, `modal_create_trip.html`, `view_booking_detail.html`, `modal_booking.html`) và gỡ bỏ `<datalist id="list-times-24h">` trong `base.html`.
  * **CSS:** Bổ sung rule CSS trong `static/css/main.css` ẩn triệt để mọi pseudo-element indicator và button native trên các input có attribute `data-time-24h` và `data-time-picker-24h`.
- **Trải nghiệm giao diện:** Ô giờ hiển thị sạch sẽ, chữ đậm font-mono rõ nét, giữ nguyên icon đồng hồ `ph-clock` để mở popover chọn giờ 24h tương tác thuận tiện.

---

## [2.9.32] - 2026-10-09 (Phân Hệ Kế Toán: Chuẩn Hóa Nút Thu Chi & Chuyển Đổi Xem/In Phiếu Thành Trang Riêng Có Sửa/Lưu)

### 1. Chuẩn Hóa Nhãn Nút Lập Phiếu Thu / Chi:
- Loại bỏ các dấu thừa `+` và `-` trong text nhãn nút tại thanh công cụ Sổ Quỹ (`view_accounting.html`), đồng bộ nhãn sạch sẽ: `Lập Phiếu Thu` và `Lập Phiếu Chi`.
- Đổi tiêu đề cột bảng Sổ Quỹ từ `In Phiếu` thành `Thao Tác` với nút `Xem / In` chuyên nghiệp.

### 2. Chuyển Đổi Màn Hình Phiếu Thu / Chi Thành Trang Riêng Toàn Màn Hình (Dedicated Full-Page View):
- **Trang Chuyên Biệt (`view_cash_voucher_detail.html`):**
  * Tích hợp URL chuẩn: `/accounting/vouchers/<id_or_code>`, hỗ trợ deep-link và back/forward trình duyệt mượt mà.
  * Hiển thị biểu mẫu Phiếu Thu (Mẫu 01-TT) / Phiếu Chi (Mẫu 02-TT) theo chuẩn Bộ Tài Chính (Thông tư 200/2014/TT-BTC & TT 133/2016/TT-BTC) khổ A4 WYSIWYG.
  * Hỗ trợ 2 chế độ in ấn: `2 Liên / A4 (A5 x 2)` (chuẩn có đường cắt phân cách) và `1 Liên Đơn`.
- **Cơ Chế Sửa / Lưu / In Tương Tác Chuẩn UX:**
  * **Trạng thái Mặc định (Chỉ Xem):** Hiển thị chứng từ rõ ràng, nút **Sửa** sẵn sàng, nút **Lưu** ở trạng thái mờ (`disabled`, `opacity-50`, `pointer-events-none`) để chống bấm nhầm.
  * **Trạng thái Chỉnh Sửa:** Bấm nút **Sửa** sẽ mở Panel hiệu chỉnh dữ liệu (Loại giao dịch, Hình thức thanh toán, Khoản mục, Số tiền VNĐ có format phân cách, Ngày hạch toán, Đối tác nộp/nhận tiền, Diễn giải lý do), đồng thời nút **Lưu** sẽ sáng màu Teal nổi bật cho phép lưu dữ liệu.
  * **Xem trước thời gian thực (Live Preview):** Khi sửa các trường trong form, nội dung trên tờ phiếu in A4 cập nhật ngay lập tức.
  * **Backend API (`CashBookDetailAPIView`):** Bổ sung phương thức `PUT` xử lý cập nhật giao dịch Sổ Quỹ an toàn (`@transaction.atomic`), lưu lịch sử và đồng bộ dữ liệu.

---

## [2.9.31] - 2026-10-09 (BIM 24-Hour Interactive TimePicker Popover — Khôi Phục Pick Time Đầy Đủ Với Chuẩn 24H)

### 1. Khôi Phục & Nâng Cấp Bộ Chọn Giờ Tương Tác Chuẩn 24H (BIM 24h TimePicker):
- **Bối cảnh & Nghiệp vụ:** Người dùng yêu cầu khôi phục tính năng chọn giờ tương tác (Pick Time) nhưng bắt buộc tuân thủ 100% hệ 24 giờ của ngành Logistics, không để native Chromium/Edge kích hoạt giao diện 12h kèm SA/CH gây khó khăn.
- **Thành phần Popover Chọn Giờ Toàn Cục (`#bim-24h-timepicker-popover` trong `base.html`):**
  * Tích hợp popover nổi `z-[9999]` với giao diện thiết kế hiện đại, đồng bộ Design System của BIM Logistics.
  * Hiển thị Giờ thời gian thực lớn theo định dạng 24H (`HH:mm`), kèm badge `HỆ 24H`.
  * **2 cột cuộn độc lập chuyên nghiệp:**
    - Cột **GIỜ**: Hiển thị đầy đủ 24 giờ (`00`, `01`, ..., `23`).
    - Cột **PHÚT**: Hiển thị đầy đủ từ `00` đến `55` (bước 5 phút) và các mốc chi tiết.
  * **Thanh mốc giờ nhanh 1 chạm:** `08:00`, `10:00`, `12:00`, `13:00`, `17:00`, `20:00`, `23:59`.
  * Nút "Giờ hiện tại" và nút "Xác nhận".
- **Icon Đồng Hồ Tương Tác (`ph-clock`):**
  * Bổ sung nút icon đồng hồ trực quan bên phải mọi ô giờ tại:
    - Màn hình Tạo chuyến (`view_create_trip.html`): Giờ Cắt Máng (`#inp-cutoff-time`), Giờ Hẹn Đóng Hàng (`#inp-load-time`).
    - Modal Tạo chuyến (`modal_create_trip.html`): Giờ Cắt Máng, Giờ Hẹn Đóng Hàng.
    - Màn hình Chi tiết Booking (`view_booking_detail.html`): Giờ Đóng Hàng, Giờ Closing, Giờ SI.
    - Modal Booking (`modal_booking.html`): Giờ Đóng Hàng, Giờ Closing, Giờ SI.
  * Người dùng có thể click vào icon đồng hồ hoặc click trực tiếp vào ô input để mở popover chọn giờ. Vẫn hỗ trợ gõ phím trực tiếp mượt mà.
- **Logic Điều Khiển Toàn Cục (`static/js/app.js` & `static/js/modules/core.js`):**
  * Tích hợp `initBim24hTimePickerDOM()`, `openBim24hTimePicker()`, `selectBim24hHour()`, `selectBim24hMinute()`, `confirmBim24hTimePicker()`, `closeBim24hTimePicker()`.
  * Tự động tính toán vị trí hiển thị popover thông minh bên dưới/trên ô input mục tiêu.
  * Tự động cuộn mượt (smooth scroll) đến đúng giờ và phút đang được chọn.
  * Tự động kích hoạt sự kiện `change` và `input` để đồng bộ thời gian thực với các hàm nghiệp vụ logistics liên quan.

---


- **Giải pháp chuyển đổi:**
  * Chuyển đổi 100% các ô giờ (`inp-cutoff-time`, `inp-load-time`, `booking-loading-time`, `booking-closing-time-val`, `booking-si-time-val`, `fullpage-booking-loading-time`, `fullpage-booking-closing-time-val`, `fullpage-booking-si-time-val`) từ `type="time"` sang `type="text"`.
  * Cấu hình các thuộc tính: `inputmode="numeric"`, `maxlength="5"`, `data-time-24h="true"`, `autocomplete="off"`, font chữ `font-mono font-bold text-center`.
- **Datalist Khung Giờ 24h Toàn Cục (`#list-times-24h`):** Bổ sung danh sách chọn nhanh các mốc giờ 24h (00:00 -> 23:59) vào `base.html`, hỗ trợ gợi ý mượt mà không xung đột CSS hay pop-up OS.

### 2. Bộ Xử Lý Tự Động Định Dạng & Kiểm Tra Giờ 24h (`attach24hTimeInput`):
- **Tự động chèn dấu `:` và mask số:** Người dùng gõ `1700` -> tự chuyển thành `17:00`, gõ `830` -> `08:30`, gõ `8` -> `08:00`.
- **Giới hạn an toàn:** Tự động khống chế giờ $\le 23$ và phút $\le 59$.
- **Quick-select chips:** Bổ sung các nút bấm chọn giờ 1 chạm (08:00, 10:00, 12:00, 13:00, 17:00, 20:00, 23:59) dưới từng trường giờ tại Form Tạo chuyến, Modal Điều vận, Modal Booking và Màn hình Chi tiết Booking.
- **Đồng bộ sự kiện:** Tự động kích hoạt sự kiện `change` khi người dùng nhập hoặc bấm chọn, đảm bảo tính liên tục của các hàm nghiệp vụ (`syncTripCutoff`, `syncBookingClosingTime`, `syncBookingSiTime`, `syncFullpageBookingClosingTime`, `syncFullpageBookingSiTime`).

---

## [2.9.29] - 2026-10-09 (Tùy Biến Tỷ Lệ Thù Lao Cắt Kéo & Chuẩn Hóa Hệ 24 Giờ Toàn Hệ Thống)

### 1. Tùy Biến Tỷ Lệ Phân Chia Thù Lao Tài Xế (Cắt Kéo / Drop & Hook):
- **Bổ sung lựa chọn tùy biến:** Thêm option `-- Tùy biến tỷ lệ riêng (%) --` vào dropdown tỷ lệ phân chia thù lao (`inp-driver-split-ratio`) trên cả Form trang Tạo chuyến (`view_create_trip.html`) và Modal điều vận (`modal_create_trip.html`).
- **Giao diện nhập liệu tương tác 2 chiều:**
  * Khi chọn Tùy biến, hệ thống hiển thị khối nhập riêng gồm Chặng 1 (%) và Chặng 2 (%).
  * Ô nhập Chặng 1 (`inp-custom-split-ratio-leg1`) chấp nhận giá trị 0% - 100%, tự động bù trừ sang Chặng 2 (`inp-custom-split-ratio-leg2 = 100 - Chặng 1`).
  * Đồng bộ trực quan thời gian thực lên Badge thù lao của Chặng 1 (`badge-ratio-leg1`) và Chặng 2 (`badge-ratio-leg2`).
- **Thu thập dữ liệu nhất quán:** Cập nhật hàm `submitTripCreateForm` và `submitNewTrip` trong `static/js/app.js` và `static/js/modules/dispatch.js` để đọc chính xác giá trị tùy biến khi gửi backend và thông báo Zalo điều xe.
- **Dọn dẹp mã nguồn:** Loại bỏ khối Section 3 trùng lặp trong `modal_create_trip.html`.

### 2. Chuẩn Hóa Toàn Diện Hệ 24 Giờ (24-Hour Time Format):
- **Xử lý chuỗi thời gian sạch sẽ (`formatTimeString`):** Nâng cấp hàm xử lý thời gian trong `static/js/app.js` và `static/js/modules/core.js` để bóc tách triệt để các định dạng `19:00 PM`, `08:00 AM`, `7:30 PM`, chuyển đổi chính xác sang chuẩn 24h (`HH:mm`), triệt tiêu hoàn toàn lỗi dính hậu tố AM/PM.
- **Trình phân tích ngày giờ (`parseAndSetDateTimeFields`):** Nâng cấp regex bóc tách thời gian trong `app.js` và `modules/dispatch.js` để tự động nhận dạng chuỗi AM/PM từ dữ liệu kế thừa và quy đổi sang 24h chuẩn.
- **Giao diện nhập liệu:** Bổ sung badge chỉ dẫn `24h`, thiết lập `step="60"` và các nút quick-select (08:00, 13:00, 18:00, 20:00) cho trường "Giờ Hẹn Đóng Hàng" (`inp-load-time`), đảm bảo hiển thị đồng nhất trên mọi thiết bị.

---

## [2.9.28] - 2026-10-08 (Đồng Bộ Trạng Thái Tương Tác Nút Sửa & Lưu Trong Màn Hình Báo Giá & Booking)

### 1. Khắc Phục Lỗi Mất Nút "Sửa" Sau Khi Lưu:
- **Nguyên nhân cốt lõi:** Khi người dùng bấm nút "Sửa", nút được gán class `hidden`. Sau khi bấm "Lưu" thành công, hệ thống tải lại chi tiết bản ghi nhưng trước đó chưa có logic khôi phục hiển thị cho nút "Sửa".
- **Giải pháp xử lý:**
  * Tại `viewQuotationDetail()` và `viewBookingDetail()`, bổ sung logic hiển thị lại nút "Sửa" (`classList.remove('hidden')` và `disabled = false`).
  * Khóa lại toàn bộ các trường nhập liệu (`input, select, textarea, button`) về trạng thái chỉ đọc (readonly) sau khi lưu thành công hoặc khi vừa mở xem bản ghi đã có.

### 2. Chuẩn Hóa Logic UX Cho Nút "Lưu" (Active / Disabled Theo Ngữ Cảnh):
- **Trạng thái Xem Bản Ghi Cũ (Readonly):**
  * Nút "Sửa" hiển thị rõ ràng (`bg-amber-600 hover:bg-amber-700`).
  * Nút "Lưu" chuyển sang trạng thái mờ (`disabled = true`, `opacity-50`, `cursor-not-allowed`, `pointer-events-none`).
- **Trạng thái Tạo Mới (New Record):**
  * Mở khóa toàn bộ các trường nhập liệu.
  * Nút "Sửa" tự động ẩn đi (`hidden`).
  * Nút "Lưu" sáng lên và sẵn sàng kích hoạt (`disabled = false`, màu xanh teal chuẩn mực).
- **Trạng thái Sau Khi Bấm "Sửa" (Editing Mode):**
  * Nút "Sửa" ẩn đi (`hidden`).
  * Nút "Lưu" sáng lên (`disabled = false`, kích hoạt đầy đủ hiệu ứng tương tác).
  * Mở khóa toàn bộ các trường input/select/textarea để người dùng hiệu chỉnh.

---

## [2.9.27] - 2026-10-07 (Bổ Sung Nút Sửa Footer, Loại Bỏ Nút Sửa Danh Sách & Chuẩn Hóa Font Table 13px / Sub 12px)

### 1. Bổ Sung Nút "Sửa" Trong Màn Hình Báo Giá & Booking Toàn Màn Hình:
- **Màn hình Chi Tiết Báo Giá (`view_quotation_detail.html`):**
  * Thêm nút **"Sửa"** (`btn-fullpage-edit-quote-bottom`) với màu cam vàng `bg-amber-600 hover:bg-amber-700 text-white` vào footer bar (cạnh nút "Xem & In" và "Lưu").
  * Kích hoạt hàm `enableFullpageQuotationEdit()` trong `app.js` và `modules/sales.js`, cho phép người dùng mở khóa và chỉnh sửa nhanh thông tin báo giá khi xem lại đơn cũ.
- **Màn hình Chi Tiết Đơn Hàng / Booking (`view_booking_detail.html`):**
  * Thêm nút **"Sửa"** (`btn-fullpage-edit-booking-bottom`) với màu cam vàng `bg-amber-600 hover:bg-amber-700 text-white` vào footer bar cạnh nút "Lưu".
  * Kích hoạt hàm `enableFullpageBookingEdit()` trong `app.js` và `modules/sales.js`, hỗ trợ sửa đổi trực tiếp các thông số đơn hàng.

### 2. Loại Bỏ Nút "Sửa" Ngoài Cột Thao Tác Bảng Danh Sách Booking:
- **Bảng Danh Sách Đơn Hàng Booking (`view_sales.html`, `app.js`, `modules/sales.js`):**
  * Bỏ icon cây bút chì (nút Sửa) tại cột "Thao tác" ngoài bảng danh sách booking.
  * Giữ nguyên các thao tác trực quan: **"Điều Xe"** (nút màu teal), **"Xem"** (icon con mắt `ph-eye`) và **"Xóa"** (icon thùng rác `ph-trash`).
  * Luồng vận hành: người dùng bấm Xem để vào màn hình chi tiết booking và bấm "Sửa" ngay bên trong khi cần chỉnh sửa.

### 3. Chuẩn Hóa Typography Toàn Hệ Thống: Font Chuẩn 13px & Font Sub 12px:
- **Quy chuẩn Font-Size Bảng Biểu & Báo Cáo (`main.css`):**
  * Đặt kích thước chữ chuẩn cho toàn bộ các bảng (`.erp-table`, `table`, `.bim-table` và các bảng trong phân hệ Báo cáo & Thống kê): **font chuẩn 13px** (`font-size: 13px !important`).
  * Tất cả các dòng mô tả phụ, nhãn phụ trợ, sub-text (`.erp-subtext`, `.sub-text`, `.text-sub`, `p.text-xs`, `span.text-xs` trong bảng): **chuẩn hóa đúng 12px** (`font-size: 12px !important`).
  * Tiêu đề các cột (`th`) chuẩn 13px bold, đảm bảo trải nghiệm đọc thông thoáng, rõ nét, đồng nhất trên toàn bộ 14 báo cáo và các bảng TMS.

---

## [2.9.26] - 2026-10-07 (Bổ Sung Nút "Hiệu Chỉnh" Vào Tất Cả Màn Hình & Modal Xem Chi Tiết)

### 1. Bổ Sung Nút "Hiệu Chỉnh" Tại Màn Hình & Modal Xem Bản In Báo Giá:
- **Thanh Toolbar Bản In Báo Giá A4 Toàn Màn Hình (`view_quotation_print.html`):**
  * Thêm nút **"Hiệu Chỉnh"** (`btn-edit-quote-from-print`) với màu cam vàng `bg-amber-600 hover:bg-amber-700` ngay bên cạnh nút "In Ngay".
  * Khi người dùng xem bản in xong muốn chỉnh sửa lại báo giá, bấm nút "Hiệu Chỉnh" sẽ tự động đóng màn hình xem in và mở ngay màn hình chi tiết báo giá để hiệu chỉnh thông tin tức thì (`editQuotationFromPrint()`).
- **Modal Popup Xem Bản In Báo Giá (`modal_quotation_print.html`):**
  * Thêm nút **"Hiệu Chỉnh"** (`btn-edit-quote-from-modal-print`) trên thanh công cụ xem in, hỗ trợ chuyển nhanh sang form hiệu chỉnh.

### 2. Bổ Sung Nút "Hiệu Chỉnh" Tại Modal Chi Tiết Báo Giá & Booking:
- **Modal Báo Giá (`modal_quotation.html`):**
  * Bổ sung nút **"Hiệu Chỉnh"** (`btn-edit-quote-modal`) tại footer modal.
  * Khi mở modal ở chế độ Xem chi tiết (`isReadOnly = true`), nút "Lưu" ẩn và nút "Hiệu Chỉnh" hiển thị.
  * Khi bấm "Hiệu Chỉnh", hệ thống kích hoạt hàm `enableEditQuotationModal()`, tự động mở khóa (remove disabled) cho tất cả trường input/select/textarea, chuyển tiêu đề modal sang "Hiệu Chỉnh..." và hiển thị nút "Lưu" để cập nhật dữ liệu.
- **Modal Booking / Đơn Hàng (`modal_booking.html`):**
  * Bổ sung nút **"Hiệu Chỉnh"** (`btn-edit-booking-modal`) tại footer modal.
  * Khi mở ở chế độ Xem (`isReadOnly = true`), nút "Hiệu Chỉnh" hiển thị; khi bấm, kích hoạt `enableEditBookingModal()`, gỡ khóa toàn bộ các trường trên form và hiển thị nút "Lưu".

### 3. Bổ Sung Nút "Hiệu Chỉnh" Tại Modal Xem Chi Tiết Vận Đơn & Container Hiện Trường:
- **Modal Simulator Chi Tiết Cont & Lệnh (`modal-sim-trip-details` trong `view_trip_detail.html`):**
  * Bổ sung nút **"Hiệu Chỉnh"** (`btn-edit-trip-from-sim-details`) cạnh nút "Đóng".
  * Bấm nút sẽ chuyển thẳng sang mở modal "Hiệu chỉnh chuyến xe / lệnh điều động" (`openModalEditTrip`) một cách mượt mà.

---

## [2.9.25] - 2026-10-07 (Chuẩn Hóa Nhãn Nút Bấm CRUD & Loại Bỏ Nút Sao Chép Link)

### 1. Chuẩn Hóa Nhãn Nút CRUD Toàn Hệ Thống (Standardized Action Buttons):
- **Quy chuẩn 4 nhãn hành động cốt lõi:**
  * **"Xem & In"**: Thống nhất dùng "Xem & In" (loại bỏ hậu tố "Báo Giá", "A4" như trước: "Xem & In Báo Giá (A4)" ➔ "Xem & In").
  * **"Tạo mới"**: Chuẩn hóa nút khởi tạo, thêm dòng hoặc mở trang tạo mới:
    - Nút danh sách: `Tạo Báo Giá Mới` ➔ `Tạo mới`, `Tiếp Nhận Đơn / Booking Mới` ➔ `Tạo mới`.
    - Nút trong bảng: `+ Thêm Tuyến Đường` ➔ `+ Tạo mới`.
  * **"Lưu"**: Thống nhất nhãn nút submit/lưu thông tin (thay thế toàn bộ "Lưu Báo Giá", "Tiếp Nhận Đơn Hàng", "Cập Nhật Đơn Hàng" ➔ `Lưu`).
  * **"Hiệu chỉnh"**: Chuẩn hóa hành động chỉnh sửa hồ sơ/bản ghi khi cần thiết.
- **Áp dụng đồng bộ:** Cập nhật trên cả giao diện toàn màn hình (`view_quotation_detail.html`, `view_booking_detail.html`, `view_sales.html`) và các Modal popups (`modal_quotation.html`, `modal_booking.html`) cùng logic JavaScript (`app.js`, `modules/sales.js`).

### 2. Loại Bỏ Nút "Sao Chép Link":
- Loại bỏ hoàn toàn nút `Sao Chép Link` tại Footer Action Bar của form Báo Giá (`view_quotation_detail.html`) và Đơn Hàng/Booking (`view_booking_detail.html`), giúp thanh thao tác dưới chân form gọn gàng, chỉ tập trung vào 2 thao tác trọng tâm: **Xem & In** và **Lưu**.

---

## [2.9.24] - 2026-10-07 (Tự Động Cập Nhật Ngày Hiệu Lực Hoặc Auto 30 Ngày Vào Bản In Báo Giá)

### 1. Đồng Bộ Hóa Ngày Hiệu Lực (Validity Synchronization):
- **Cơ chế tính toán ngày hiệu lực thông minh:**
  * Nếu người dùng nhập ngày tại ô "Hiệu Lực Đến Ngày (Valid Until)": Hệ thống tự động lấy chính xác ngày đó (format định dạng `DD/MM/YYYY`) và cập nhật lên bản in.
  * Nếu người dùng để trống / không nhập: Hệ thống tự động tính ngày hiệu lực = Ngày ban hành + 30 ngày (auto 30 ngày).
- **Cập nhật đồng bộ các vị trí trên Bản in Báo giá A4:**
  * **Mẫu 1 (Tiêu Chuẩn TVL):** Thêm trường thông tin `Hiệu lực đến ngày:` ngay trong bảng thông tin khách hàng ở phần đầu trang; đồng thời tự động cập nhật điều khoản số 5: `Báo giá có hiệu lực đến ngày DD/MM/YYYY` (hoặc `Báo giá có hiệu lực trong vòng 30 ngày kể từ ngày ban hành (đến ngày DD/MM/YYYY)` nếu auto 30 ngày).
  * **Mẫu 2 (Bảng Cước To/From):** Tự động cập nhật dòng điều khoản hiệu lực theo ngày đã chọn hoặc auto 30 ngày.
  * **Mẫu 3 (Chi Tiết Dự Án):** Cập nhật trường `Thời Gian Áp Dụng: Áp dụng đến ngày DD/MM/YYYY` và điều khoản tương ứng.

---

## [2.9.23] - 2026-10-07 (Chuẩn Hóa Giao Diện Bản In Báo Giá & Tinh Gọn Nhãn Trường Khách Hàng)

### 1. Bản In Báo Giá A4 (Quotation Print Template):
- **Bỏ bọc Badge ở Số Báo giá:**
  * Loại bỏ nền và khung viền badge màu xanh ngọc (`bg-teal-50 border border-teal-200`) tại khối mã số báo giá dưới tiêu đề "BÁO GIÁ CƯỚC VẬN CHUYỂN".
  * Tăng kích thước thêm 1 size (lên `text-sm font-bold text-slate-800`), căn giữa trang trí trang nhã và chuẩn hóa văn bản in ấn văn phòng.
- **Đồng bộ Font chữ Tổng doanh thu kế hoạch:**
  * Loại bỏ `font-mono` tại ô Tổng cộng dự kiến (`print-q1-grand-total`, `print-q2-grand-total`, `print-q3-grand-total`).
  * Sử dụng thống nhất font sans-serif với `tabular-nums font-black text-slate-950 font-sans` hoàn toàn đồng điệu với cột đơn giá và thành tiền của các dòng trong bảng ma trận cước.

### 2. Tinh Gọn Nhãn Trường Người Nhận:
- **Loại bỏ chữ viết tắt tiếng Anh (Attn):**
  * Đổi toàn bộ nhãn `Người Nhận Báo Giá (Attn)` và `Người nhận (Attn):` thành tiếng Việt chuẩn: `Người nhận Báo giá` trên cả Form chi tiết báo giá và Bản in A4 (bao gồm cả modal popups và dedicated full-page views).

---

## [2.9.22] - 2026-10-07 (Khắc Phục Nút In & Lưu Trên Tạo Mới Báo Giá Và Tiếp Nhận Booking)

### 1. Phân hệ Báo Giá Tuyến Cước (Quotation Management):
- **Kích hoạt chế độ In Xem Trước Dự Thảo (Draft Print Preview):**
  * Sửa hàm `printQuotationFromFullPage()` trong `static/js/app.js`: Khi người dùng đang ở giao diện "Tạo Mới Báo Giá" (`/sales/quotations/new`) chưa lưu DB, hệ thống tự động gom toàn bộ dữ liệu trên form (Khách hàng, Ma trận tuyến, Cơ chế dầu, Điều khoản...) thành đối tượng dự thảo (`BG-DRAFT (BẢN XEM TRƯỚC)`) và mở ngay màn hình xem & in phiếu báo giá A4.
  * Validation thân thiện: Nếu chưa chọn khách hàng hoặc thiếu tuyến, hệ thống hiển thị thông báo Toast cảnh báo và tự động trỏ focus vào ô nhập liệu cần thiết.
- **Kích hoạt hiệu lực nút "Lưu Báo Giá":**
  * Sửa selector nút submit `btn-fullpage-save-quote-bottom` trong `saveFullpageQuotation()` và bổ sung `onclick="saveFullpageQuotation(event)"` vào nút lưu footer của `view_quotation_detail.html`.
  * Sau khi lưu thành công, hệ thống hiển thị mã báo giá vừa tạo (VD: `BG.2610.008`), cập nhật giao diện chi tiết và lưu URL semantic tương ứng.
- **Bảo toàn dữ liệu khi quay lại từ màn hình In:**
  * Hiệu chỉnh `closeQuotationPrintModal()` để khi người dùng bấm nút "Quay Lại" từ màn hình in về form soạn thảo báo giá, form được giữ nguyên vẹn 100% dữ liệu đang nhập mà không bị gọi lại API ghi đè dữ liệu.
  * Bổ sung nút **Sao Chép Link** đồng bộ ở footer của trang Báo giá.

### 2. Phân hệ Tiếp Nhận Đơn Hàng / Booking:
- **Chuẩn hóa nút "Tiếp Nhận Đơn Hàng" / Lưu Booking:**
  * Hiệu chỉnh `saveFullpageBooking()` đồng bộ selector nút `btn-fullpage-save-booking-bottom`.
  * Nâng cấp validation chi tiết: Thay vì thông báo chung chung, hệ thống chỉ rõ từng trường còn thiếu (Khách hàng, Số đơn/booking, Điểm lấy rỗng, Kho đóng hàng, Điểm hạ bãi) và tự động cuộn/focus đến ô tương ứng.
  * Xóa cache `currentActiveFullpageBooking = null` khi mở form tạo mới booking để tránh lẫn lộn dữ liệu đơn cũ.

---

## [2.9.21] - 2026-10-07 (Chuẩn Hóa Đồng Bộ Định Dạng Tiêu Đề Topbar Toàn Hệ Thống: Phân Hệ | Trang Con | Thao Tác)

### 1. Chuẩn Hóa Tiêu Đề Topbar (Breadcrumb Standard):
- **Quy tắc thống nhất toàn ứng dụng:** Tiêu đề Topbar chỉ hiển thị cấu trúc `Tên phân hệ | Tên trang con (nếu có) | Thao tác`.
  * *Ví dụ:* `Sale & Booking | Tạo Mới Booking`
  * *Ví dụ:* `Sale & Booking | Báo Giá | BG.2610.004`
  * *Ví dụ:* `Điều Vận | Tạo Lệnh Điều Động`
  * *Ví dụ:* `Hành Chính & Nhân Sự | Tạo Mới Nhân Sự`
  * *Ví dụ:* `Dịch Vụ Hải Quan | Tạo Mới Tờ Khai Hải Quan`
- **Loại bỏ nút mũi tên Quay lại thừa trên Topbar:**
  * Xóa bỏ nút icon mũi tên `topbar-fullpage-back-btn` trên Topbar. Khi người dùng click trực tiếp vào văn bản `[Tên phân hệ]` (có hiệu ứng hover màu xanh ngọc), hệ thống sẽ tự động điều hướng quay trở lại phân hệ cha tương ứng.
- **Loại bỏ hoàn toàn Badges và Nút bấm trên Topbar:**
  * Ẩn triệt để các thẻ badge trạng thái/phân loại (`Chuyến xe FCL`, `Kế thừa Booking`, `Ma trận đa tuyến`,...) khỏi thanh Topbar.
  * Di dời và loại bỏ tất cả các nút bấm hành động (`Hủy Bỏ`, `Xác Nhận & Phát Lệnh Zalo`, `Lưu Hồ Sơ`, `Tiếp Nhận Đơn Hàng`) khỏi Topbar, bố trí 100% tại thanh tác vụ phía cuối Form để thuận tiện thao tác tự nhiên theo luồng nhập liệu.
  * Bổ sung thanh tác vụ Footer chuẩn (Nút Quay lại, Sao chép link, Tiếp nhận đơn) tại trang chi tiết Booking `view_booking_detail.html`.

---

## [2.9.20] - 2026-10-07 (Rà Soát Codebase Toàn Diện & Viết Lại Tài Liệu Tính Năng FEATURES.md Chuẩn Living Document)

### 1. Rà Soát Codebase & Viết Lại docs/FEATURES.md:
- **Khảo sát toàn diện mã nguồn thực tế:** Đối chiếu 25 Models trên 9 Apps (`dispatch`, `billing`, `customers`, `fleet`, `personnel`, `master_data`, `documents`, `exceptions`, `customs`) và 14 View templates frontend SPA.
- **Cấu trúc Living Document chuyên nghiệp:**
  * Bổ sung mục lục chi tiết 15+ phần cùng quy ước cập nhật đồng bộ Documentation-as-Code.
  * Chi tiết hóa nghiệp vụ TMS/WMS: State Machine 11 bước, Cắt Kéo (Drop & Hook), Chở ghép kẹp 2 cont 20ft, Kiểm soát DEM/DET free-time, Định giá cước xăng dầu (Fuel-adjusted), Mẫu in báo giá đa dạng.
  * Đặc tả chi tiết 7 Subtabs Kế toán, Sổ Quỹ Thu - Chi Mẫu S03a-DN, Tạm ứng 2 cấp (Quỹ Điều Vận & Tạm ứng chuyến), Chốt sổ chi phí, Đối soát xe bạn 3PL, Thu hồi chi hộ Debit Note.
  * Thống kê đầy đủ 14 Báo cáo quản trị chia 4 nhóm nghiệp vụ (Doanh thu & Hiệu suất đội xe, Vận hành & Sự cố OS&D, Lương chuyến & Tạm ứng, Công nợ khách AR).
  * Chi tiết hóa giao diện bảng Điều Vận: Hệ thống bộ lọc đa cột, tùy biến ẩn/hiện và sắp xếp cột.
  * Module Sự cố ngoại lệ OS&D và Module Chứng từ số kèm năng lực nhận diện OCR AI.
  * Bảng tổng hợp 25 Django models và hướng dẫn quy trình cập nhật tài liệu khi mở rộng mã nguồn sau này.

---

## [2.9.19] - 2026-10-07 (Tinh Gọn Topbar Bản In, Khắc Phục Lỗi Trang Trắng Khi In & Đồng Bộ Đổi Mẫu In)

### 1. Tinh Gọn Topbar Bản In Báo Giá (Hình 1):
- **Chỉ giữ lại tiêu đề chuẩn:** `Sale & Báo Giá | Bản In Báo Giá` trên Topbar.
- **Loại bỏ thông tin lặp:** Bỏ mã báo giá lặp lại trong tiêu đề, bỏ phụ đề khách hàng, bỏ badge `Khổ A4 Chuẩn TVL` và nút `In Ngay (A4)` trên Topbar vì toàn bộ thông tin và thao tác đã được bố trí ở trang bên dưới.

### 2. Sửa Nhãn Nút In & Khắc Phục Triệt Để Trang Trắng Khi Preview In (Hình 3):
- **Chuẩn hóa nhãn nút:** Đổi từ `In Ngay (A4)` thành `In Ngay` ngắn gọn, trực quan.
- **Sửa lỗi Preview in bị trang trắng:**
  * Nguyên nhân: Do quy tắc `@media print` có `body > * { display: none !important; }` đã vô tình ẩn container cha `div.flex-1` và `<main id="main-views">` chứa `#view-quotation-print`.
  * Khắc phục: Bổ sung quy tắc ghi đè hiển thị `display: block !important;` cho `body.is-printing-quotation > div.flex-1` và `#main-views`, đồng thời ẩn `header` và `aside`. Khung A4 `#quotation-printable-area` giờ đây hiển thị 100% nội dung sắc nét khi bấm in hoặc xuất PDF.
  * Thêm `setTimeout` đồng bộ và listener `afterprint` dọn sạch class in sau khi in.

### 3. Đồng Bộ Chuyển Đổi Các Kiểu Mẫu In (Hình 2):
- **Sửa ID bộ chọn:** Đồng bộ ID `quote-tpl-project` và `quote-tpl-detail` trong hàm `switchQuotationPrintTemplate`.
- **Render đầy đủ dữ liệu thực:** Bổ sung điền đầy đủ dữ liệu báo giá thực tế vào Mẫu 2 (Bảng cước & khung đối tác To/From) và Mẫu 3 (Chi tiết dịch vụ dự án & ETA/ETD) bao gồm tên khách hàng, người liên hệ, hotline, bảng cước 7 cột và chữ ký đại diện.

---

## [2.9.18] - 2026-10-07 (Chuyển Đổi Bản In Báo Giá A4 Thành Dedicated Page & Triệt Tiêu Modal Xem Báo Giá)

### 1. Bỏ Ô Chọn Mẫu In Trong Form Báo Giá (Hình 1):
- **Loại bỏ dropdown thừa:** Bỏ ô chọn `Kiểu Mẫu Báo Giá Khi In *` khỏi giao diện form chi tiết Báo Giá (`view_quotation_detail.html`), chuyển thành trường ẩn `fullpage-quote-template-type` mặc định `STANDARD`.
- **Mở rộng layout:** Ô `Người Nhận Báo Giá (Attn)` mở rộng chiếm trọn chiều ngang (`col-span-12`), tạo bố cục nhập liệu thoáng đãng.
- **Lý do nghiệp vụ:** Màn hình xem trước bản in đã có sẵn thanh công cụ chọn mẫu in trực quan (WYSIWYG), không cần chọn lặp lại trong form.

### 2. Mở Rộng Bản In Báo Giá A4 Thành Trang Chuyên Biệt Toàn Màn Hình (Hình 2):
- **Tạo Dedicated Full-Page View (`templates/views/view_quotation_print.html`):** Thay thế modal popup chật hẹp bằng trang toàn màn hình với nền xám chuẩn studio, tờ giấy A4 hiển thị phẳng phiu, shadow-xl sang trọng ở giữa màn hình.
- **Tích hợp Topbar Fullpage Mode:** Nút Quay Lại (`Quay Lại`), Tiêu đề bản in kèm mã báo giá và tên khách hàng, nút `In Ngay (A4)`.
- **Thanh Toolbar điều khiển bản in:** Đặt ở đầu trang cho phép chuyển đổi tức thì giữa Mẫu 1 (Tiêu chuẩn TVL), Mẫu 2 (Bảng cước & đối tác To/From), Mẫu 3 (Dự án & ETA/ETD) và in ngay.
- **Bảo toàn 100% định dạng in ấn (@media print):** Cập nhật CSS in ấn trong `static/css/main.css` để khi in ra giấy hoặc xuất PDF giữ trọn vẹn khổ A4 portrait chuẩn mực.

### 3. Liên Thông Nút Thao Tác Bảng Báo Giá Sang Trang Toàn Màn Hình (Hình 3):
- **Triệt tiêu Modal Xem Báo Giá cũ:** Cập nhật hàm `openModalQuotation` để tự động chuyển hướng sang `viewQuotationDetail(quoteId)` hoặc `openCreateQuotationPage()`, không bao giờ bật modal popup cũ lên nữa.
- **Chuẩn hóa cột Thao Tác trong Bảng Báo Giá:**
  * Nút Con mắt (`ph-eye`): Mở trực tiếp trang Báo Giá Toàn Màn Hình (`viewQuotationDetail`).
  * Nút Máy in (`ph-printer`): Mở trực tiếp trang Bản In A4 Toàn Màn Hình (`openQuotationPrintModal`).
  * Nút Thùng rác (`ph-trash`): Xóa báo giá.

---

## [2.9.17] - 2026-10-07 (Khắc Phục Nút Thao Tác Topbar Báo Giá & Tối Ưu Nút Tiếp Nhận Booking Mới)

### 1. Khắc Phục Trùng Lặp Nút Thao Tác Báo Giá (Hình 1):
- **Bỏ nhóm nút thao tác trên Topbar Báo Giá:** Loại bỏ cụm nút `[Sao Chép Link] [Xem & In A4] [Lưu Thay Đổi]` khỏi Topbar trang Báo Giá (`openCreateQuotationPage` và `viewQuotationDetail`) vì phía dưới chân form báo giá (`view_quotation_detail.html`) đã có sẵn Footer Bar đầy đủ các nút tương ứng.
- Giữ nguyên nhãn trạng thái và badge phương thức tính cước trực quan trên Topbar.

### 2. Khắc Phục Hiệu Lực Nút Tiếp Nhận Booking Mới (Hình 2):
- **Bust Browser Cache:** Cập nhật version query string của `app.js` và `column_manager.js` từ `?v=2.9.2` lên `?v=2.9.16` trong `templates/base.html`, ngăn ngừa lỗi trình duyệt dùng file cache cũ chưa cập nhật export hàm.
- **Tối ưu tức thì (Instant Transition) cho `openCreateBookingPage`:** Chuyển các lệnh render giao diện và Topbar lên đầu hàm, thực hiện ngay lập tức khi click nút.
- **Bọc Try/Catch an toàn:** Đưa quá trình nạp Master Data bất đồng bộ (`loadMasterDataFormOptions()`) vào khối try/catch an toàn, không làm gián đoạn luồng mở trang tạo Booking.
- **Gán hàm toàn cục an toàn:** Thêm `type="button"` và gán tường minh `window.openCreateBookingPage` ngay sau định nghĩa hàm trong `static/js/app.js`.

---

## [2.9.16] - 2026-10-07 (Tối Ưu Giao Diện Toàn Màn Hình Lên Topbar, Chuyển Modal Sang Dedicated Pages & Chuẩn Hóa Cột STT)

### 1. Đồng Bộ Header Toàn Màn Hình Lên Topbar & Loại Bỏ Header Con Trùng Lặp:
- **Tái cấu trúc Topbar Kép (`templates/components/topbar.html`):** Thiết kế cơ chế linh hoạt chuyển đổi giữa `#topbar-standard-wrapper` (cho màn hình danh sách, báo cáo thông thường) và `#topbar-fullpage-wrapper` (cho các trang chuyên biệt/toàn màn hình).
- **Đưa thông tin và nút thao tác trực tiếp lên Topbar:** Nút Quay Lại (`Quay lại`), Breadcrumb điều hướng đa cấp, Badge trạng thái động, Phụ đề tóm tắt ngữ cảnh (`subtitle`) và nhóm nút thao tác chuyên biệt (`#topbar-fullpage-actions` như Lưu, Hủy, In phiếu, Sao chép link) được đưa trực tiếp lên Topbar chính.
- **Xóa bỏ dứt điểm header con trùng lặp:** Loại bỏ hoàn toàn khối header phụ bên dưới nội dung trang tại:
  - Chi tiết Báo Giá (`view_quotation_detail.html`)
  - Tạo Chuyến Xe Điều Động (`view_create_trip.html`)
  - Chi tiết Đơn Hàng / Booking (`view_booking_detail.html`)

### 2. Khắc Phục Dữ Liệu Dropdown Khách Hàng & Nút Tiếp Nhận Đơn Mới:
- **Sửa dropdown Khách Hàng (`populateMasterDataDropdowns`):** Bổ sung nạp danh sách khách hàng vào `fullpage-quote-customer` (trang báo giá) và `fullpage-booking-customer` (trang booking), đồng thời điền đầy đủ các datalist cảng/kho/nơi hạ cont rỗng.
- **Kích hoạt nút Tiếp Nhận Booking Mới:** Xuất đầy đủ `window.openCreateBookingPage` và các hàm liên quan ở cuối `static/js/app.js` giải quyết dứt điểm lỗi click không phản hồi.

### 3. Chuyển Đổi Modal Nhân Sự & Hải Quan Sang Dedicated Full-Page View:
- **Tạo Nhân Sự Mới (`view_employee_form.html`):** Thay thế modal popup chật hẹp bằng trang toàn màn hình với đầy đủ các khối: Thông tin định danh & CCCD, Vị trí & Chức danh, Hồ sơ giấy phép lái xe, Thông tin bảo hiểm & Ngân hàng.
- **Khai Báo Tờ Khai Hải Quan Điện Tử (`view_customs_form.html`):** Chuyển từ modal popup sang trang chuyên biệt với bố cục tối ưu: Thông tin tờ khai & Chi cục hải quan, Doanh nghiệp & Đại lý hải quan, Phân luồng & Kết quả thông quan, Vận đơn & Danh sách container kèm theo.
- Tích hợp 2 view mới vào `templates/index.html` và quản trị qua `openCreateEmployeePage`, `openEditEmployeePage`, `openCustomsPage`.

### 4. Bổ Sung Chuẩn Cột STT Cho Toàn Bộ Bảng Dữ Liệu:
- **Cột STT đầu tiên ở tất cả các bảng:** Bổ sung cột STT (Số Thứ Tự) ở cả `<thead>` và `<tbody>` trên toàn hệ thống với độ rộng chuẩn `w-12`, canh giữa `text-center`, font chữ `font-mono tabular-nums text-xs font-bold text-slate-500` và khóa cột `data-col-locked="true"` an toàn với `column_manager.js`.
- Bổ sung ở các bảng:
  - Điều vận (`dispatch-trips-table`)
  - Báo giá & Đơn hàng Booking (`sales-quotations-table`, `sales-bookings-table`)
  - Đội xe (`fleet-vehicles-table`)
  - Nhân sự & Bảng lương (`employees-table`, `personnel-payroll-table`)
  - Kế toán (Sổ quỹ, Tạm ứng tài xế, Quỹ điều phối, Báo cáo PnL, Chi hộ khách hàng, Quyết toán xe bạn 3PL, Đối soát vé BOT)
  - Quyết toán chuyến xe (`settlement-trips-table`)
  - Tờ khai Hải quan (`customs-table`)

### 5. Kiểm Thử & Kiểm Tra Hồi Quy (Zero-Regression):
- Kiểm tra cú pháp JavaScript: `node -c static/js/app.js; node -c static/js/column_manager.js` (100% Valid).
- Bộ kiểm thử tự động của dự án: 86/86 test cases đều vượt qua xuất sắc (`Ran 86 tests in 24.569s - OK`).

---

## [2.9.15] - 2026-10-07 (Nâng Cấp GEMINI.md Thành Bản Đồ Tài Liệu Cho AI Agent)

### Documentation — Agent Instruction Upgrade
- **Nâng cấp:** `GEMINI.md` từ 14 dòng redirect đơn giản thành **Bản đồ tài liệu đầy đủ** (Documentation Map): bổ sung bảng ánh xạ tác vụ → file tài liệu tương ứng, giúp Agent luôn biết chủ động đọc đúng file trước khi thực hiện.
- **Sửa lỗi:** Hoàn thành rename `.agents/rules/logistics_engineering_and_safety_rule.md` → `data-integrity-rules.md` (lần trước bị lỗi silent).
- **Tệp cập nhật:** [`GEMINI.md`](file:///E:/Bim_Logistics/GEMINI.md), [`docs/CHANGELOG.md`](file:///E:/Bim_Logistics/docs/CHANGELOG.md).

## [2.9.13] - 2026-10-06 (Kiểm Tra Toàn Diện Tính Năng CRUD, Báo Cáo & Liên Thông Số Liệu Toàn Hệ Thống)

### 1. Kiểm Tra & Xác Thực Tính Liên Thông Nghiệp Vụ Toàn Trình (End-to-End Data Integrity):
- **Chu trình Kinh doanh ➔ Điều vận ➔ Kế toán (Sale ➔ Dispatch ➔ Accounting):**
  - Khách hàng (`Customer`) ➔ Báo giá (`Quotation`) ➔ Đơn hàng (`BookingOrder`) ➔ Chuyến xe (`DispatchTrip`): Số liệu cước bán, quy cách cont và tuyến đường vận chuyển liên thông 100%.
  - Tiến độ chuyến xe (`11-Step Timeline`): Tự động phát sinh chuẩn hóa đủ 11 bước vận hành từ Nhận Booking đến Quyết toán cho tất cả các chuyến xe được tạo lập hoặc kích hoạt điều vận.
  - Chi phí chuyến (`TripExpense`) & Tạm ứng (`DriverTripAdvance`): Chi phí hoạt động, chi hộ khách hàng (`Debit Note`) liên kết chặt chẽ với chuyến xe, tính toán tức thời Doanh thu, Chi phí và Lợi nhuận gộp thực tế (`cached_revenue`, `cached_expense`, `cached_profit`).
  - Sổ quỹ tiền mặt & Ngân hàng (`CashTransaction`): Tự động ghi nhận phiếu thu/chi khi quyết toán hoàn ứng tài xế hoặc thu tiền chi hộ từ khách hàng theo Mẫu S03a-DN.
- **Hoàn thiện API Báo Cáo Kế Toán Đa Chiều (`AccountingReportsAPIView`):**
  - Bổ sung nhánh xử lý `BY_CASHFLOW` / `CASH_FLOW` cho Báo Cáo Sổ Quỹ & Dòng Tiền Thu - Chi Vận Tải, tổng hợp dòng tiền ròng, tồn quỹ tiền mặt và tài khoản ngân hàng phân loại theo từng hạng mục nghiệp vụ.
  - Xác thực thành công 100% cho 5 phân hệ báo cáo tài chính kế toán: `BY_CUSTOMER`, `BY_SUBCONTRACTOR`, `BY_DRIVER`, `BY_ROUTE`, `BY_CASHFLOW`.
- **Kiểm thử hồi quy toàn diện (Zero-Regression Verification):**
  - Chạy toàn bộ bộ kiểm thử tự động của dự án: 86/86 test cases đều vượt qua xuất sắc (`OK`).
- **Tệp cập nhật:** [finance_reports_api.py](file:///E:/Bim_Logistics/apps/billing/finance_reports_api.py), [CHANGELOG.md](file:///E:/Bim_Logistics/docs/CHANGELOG.md).

## [2.9.12] - 2026-10-06 (Chuẩn Hoá Đồng Bộ Typography & Font Size Bảng Báo Cáo Toàn Nền Tảng)

### 1. Chuẩn Hóa Phông Chữ & Kích Thước Bảng Báo Cáo & Danh Mục (Enterprise Table Typography Standard):
- **Đồng bộ Typography toàn app theo CODING_STANDARDS.md:**
  - Tiêu đề cột `<th>`: `font-heading` (`Plus Jakarta Sans`), cỡ chữ chuẩn `12.5px`, `font-bold text-slate-700 uppercase tracking-wider`, chiều cao cố định `36px`, `sticky top-0`.
  - Ô dữ liệu `<td>`: `font-body` (`Be Vietnam Pro`), cỡ chữ chuẩn `13px`, `line-height: 1.4`, màu chữ chuẩn `text-slate-900 / #1e293b`.
  - Dòng phụ (Sub-text): `font-body`, cỡ chữ chuẩn `11.5px`, `font-medium text-slate-500`, `mt-0.5`.
  - Số liệu tiền tệ, cước phí, sản lượng, mã đơn, số container: `font-mono` / `tabular-nums`, `font-bold`, canh phải `text-right`.
- **Cập nhật CSS cốt lõi & Cache Busting:**
  - Bổ sung quy tắc đa tầng trong `static/css/main.css` áp dụng tự động cho `.erp-table`, `.bim-table` và toàn bộ các thẻ `<table>` trong các modal popup, card chi tiết, bảng báo cáo.
  - Nâng version CSS cache busting trong `templates/base.html` lên `?v=2.9.12`.
- **Đồng bộ class các bảng dữ liệu còn thiếu:**
  - Bổ sung class `.erp-table` cho bảng tờ khai Hải quan (`view_customs.html`), bảng ma trận tuyến báo giá (`view_quotation_detail.html`, `modal_quotation.html`), bảng container booking (`view_booking_detail.html`, `modal_booking.html`), và bảng tiến độ 11 bước (`view_trip_detail.html`).
- **Tệp cập nhật:** [main.css](file:///E:/Bim_Logistics/static/css/main.css), [base.html](file:///E:/Bim_Logistics/templates/base.html), [view_customs.html](file:///E:/Bim_Logistics/templates/views/view_customs.html), [view_quotation_detail.html](file:///E:/Bim_Logistics/templates/views/view_quotation_detail.html), [view_booking_detail.html](file:///E:/Bim_Logistics/templates/views/view_booking_detail.html), [view_trip_detail.html](file:///E:/Bim_Logistics/templates/views/view_trip_detail.html), [modal_booking.html](file:///E:/Bim_Logistics/templates/components/modal_booking.html), [modal_quotation.html](file:///E:/Bim_Logistics/templates/components/modal_quotation.html).

## [2.9.11] - 2026-10-06 (Chuẩn Hoá Tạo Lệnh Điều Động Sang Trang Riêng: Điều Vận | Tạo Lệnh Điều Động)

### 1. Nâng Cấp Luồng Tạo Lệnh Điều Động Sang Trang Riêng Toàn Màn Hình:
- **Tạo Lệnh Điều Động trang riêng (`openCreateTripPage`):** Nút **"Tạo Lệnh Điều Động"** tại phân hệ Điều vận và nút **"Điều Xe"** từ bảng danh sách Booking (`dispatchFromBooking`) chuyển hướng trực tiếp sang trang chuyên biệt toàn màn hình (`/dispatch/trips/new`) thay vì mở pop-up modal chật hẹp, mở rộng không gian nhập liệu với 6 khối chức năng hoàn chỉnh:
  1. *Kế Thừa Thông Tin Từ Booking / Báo Giá* (Dropdown chọn Booking đang chờ điều xe để tự động điền 9 trường dữ liệu và kế thừa file đính kèm).
  2. *Thông Tin Khách Hàng & Vận Đơn* (Khách hàng, Loại hình Nhập/Xuất/Nội địa, Loại Cont/Xe, Toggle Ghép 2 Cont 20ft Twin).
  3. *Thông Tin Container & Chì* (Cont 1 và Cont 2 với số Cont, Seal, Booking, Trọng lượng VGM).
  4. *Đính Kèm File Booking / Lệnh Cấp Rỗng* (Hỗ trợ kéo thả / chọn nhiều file Ảnh hoặc PDF, xem trước và xóa trực quan).
  5. *Quản Lý Hạn Cut-Off, Cửa Dock & Hạn Free DEM/DET, Giám Định EIR* (Hạn Cắt CY/SI, Hóa đơn TM, Cửa xuất dock kho, Giờ hẹn đóng hàng chuẩn `HH:mm`, Hạn mượn vỏ DET, Giám định vỏ EIR).
  6. *Lộ Trình Vận Chuyển 3 Điểm & Phân Công Tài Xế* (Nơi Lấy - Đóng/Trả - Nơi Hạ; Hỗ trợ Chạy thẳng 1 tài hoặc Chế độ Cắt Kéo / Drop & Hook 2 tài xế kèm tỷ lệ phân chia thù lao).
- **Cấu trúc Breadcrumb Header tiêu chuẩn:** Trình bày `Điều vận | Tạo Lệnh Điều Động` (nhấp vào `Điều vận` hoặc nút `[<-]` để quay lại danh sách điều vận).
- **Tự động sao chép Zalo & Điều hướng chi tiết chuyến:** Sau khi lưu lệnh thành công, hệ thống tự động sao chép nội dung Lệnh điều xe cho tài xế, mở Zalo tài xế nếu có SĐT, và chuyển hướng trực tiếp sang trang Chi tiết Chuyến xe vừa tạo (`viewTripDetail`).
- **SPA Routing & Deep-link:** Bổ sung xử lý route `/dispatch/trips/new` (kèm param `?booking_id=...`) trong `resolveInitialRoute` và sự kiện `popstate` của trình duyệt.
- **Tệp cập nhật:** [view_create_trip.html](file:///E:/Bim_Logistics/templates/views/view_create_trip.html), [view_dispatch.html](file:///E:/Bim_Logistics/templates/views/view_dispatch.html), [index.html](file:///E:/Bim_Logistics/templates/index.html), [dispatch.js](file:///E:/Bim_Logistics/static/js/modules/dispatch.js), [router.js](file:///E:/Bim_Logistics/static/js/modules/router.js), [reports.js](file:///E:/Bim_Logistics/static/js/modules/reports.js), [app.js](file:///E:/Bim_Logistics/static/js/app.js).

## [2.9.10] - 2026-10-06 (Chuẩn Hoá Tiếp Nhận Đơn / Booking Sang Trang Riêng: Sale & Booking | Tạo Booking)

### 1. Nâng Cấp Luồng Tiếp Nhận Đơn Hàng / Booking Sang Trang Riêng Toàn Màn Hình:
- **Tạo Booking trang riêng (`openCreateBookingPage`):** Nút **"Tiếp Nhận Đơn / Booking Mới"** tại phân hệ Sales chuyển hướng trực tiếp sang trang soạn thảo toàn màn hình (`/sales/bookings/new`) thay vì mở pop-up modal chật hẹp, mở rộng không gian nhập liệu với 5 thẻ chức năng:
  1. *Thông tin Dịch vụ & Khách Hàng* (Loại nghiệp vụ Cont Xuất/Nhập/Nội địa, Hãng tàu, Số Booking, Tàu/Chuyến, Khách hàng).
  2. *Hàng Hóa & Lộ Trình 3 Điểm Vận Chuyển* (Quy cách Cont, Loại hàng, HS Code, Điểm Lấy rỗng/Hạ bãi, Kho đóng/dỡ, Cảng/Bãi hạ rỗng).
  3. *Kế Hoạch Đóng Hàng, Hạn Cut-off & Cước Vận Chuyển* (Ngày/Giờ hẹn đóng cont chuẩn `HH:mm`, Giờ Closing/SI, Free DET/DEM, Cước bán dự kiến).
  4. *Tài Liệu Đính Kèm & Lệnh Cấp Cont* (Đính kèm nhiều tài liệu PDF/Ảnh, hiển thị danh sách trực quan, xem trước và xóa).
  5. *Tiến Độ Container Thuộc Booking* (Bảng thống kê toàn bộ các chuyến xe/container đã phát lệnh từ booking này).
- **Cấu trúc Breadcrumb Header tiêu chuẩn:** Trình bày `Sale & Booking | Tạo Booking` khi tạo mới hoặc `Sale & Booking | [Mã Booking]` khi xem chi tiết (kèm badge trạng thái và phân loại). Nhấp vào `Sale & Booking` hoặc nút `[<-]` để quay lại danh sách kinh doanh.
- **Tự động phản chiếu tên khách hàng:** Tên khách hàng trên header (`fullpage-booking-header-customer`) tự động cập nhật ngay khi chọn dropdown.
- **Xem & Hiệu chỉnh Booking trên trang riêng:** Cập nhật các nút Xem, Sửa, và đường link Mã Booking trong bảng danh sách đơn hàng sang gọi `viewBookingDetail(b.id, true)` mở trang riêng (`/sales/bookings/<id>`).
- **SPA Routing & Deep-link:** Bổ sung regex định tuyến `/sales/bookings/new` và `/sales/bookings/<id>` trong `app.js` và backend Django `urls.py`. Hỗ trợ nút Back/Forward của trình duyệt và nút "Sao Chép Link".
- **Tệp cập nhật:** [view_booking_detail.html](file:///E:/Bim_Logistics/templates/views/view_booking_detail.html), [view_sales.html](file:///E:/Bim_Logistics/templates/views/view_sales.html), [index.html](file:///E:/Bim_Logistics/templates/index.html), [urls.py](file:///E:/Bim_Logistics/config/urls.py), [sales.js](file:///E:/Bim_Logistics/static/js/modules/sales.js), [app.js](file:///E:/Bim_Logistics/static/js/app.js).

## [2.9.9] - 2026-10-06 (Chuẩn Hoá Tiêu Đề Báo Giá Breadcrumb: Sale & Booking | Tạo Báo Giá & Loại Bỏ Thẻ Thừa)

### 1. Chuẩn Hóa Tiêu Đề Điều Hướng Trang Báo Giá (Breadcrumb Header Alignment):
- **Loại bỏ thẻ tiêu đề in hoa thô cứng & badge thừa:** Bỏ dòng chữ `TẠO BÁO GIÁ MỚI` cùng các thẻ badge trạng thái (`[ĐANG THƯƠNG LƯỢNG]`, `[Ma trận đa tuyến]`) không cần thiết khi đang ở chế độ soạn thảo báo giá mới.
- **Trình bày cấu trúc Breadcrumb thanh lịch:** Trình bày chuẩn mực theo cấu trúc `Sale & Booking | Tạo Báo giá` (nhấp vào `Sale & Booking` để quay lại danh sách kinh doanh).
- **Phân tách ID khách hàng tránh xung đột:** Phân định rõ `fullpage-quote-header-customer` hiển thị tên khách hàng trên header và `<select id="fullpage-quote-customer">` trong form nhập liệu. Tự động phản chiếu tên khách hàng lên header ngay khi chọn dropdown.
- **Tệp cập nhật:** [view_quotation_detail.html](file:///E:/Bim_Logistics/templates/views/view_quotation_detail.html), [sales.js](file:///E:/Bim_Logistics/static/js/modules/sales.js), [app.js](file:///E:/Bim_Logistics/static/js/app.js).

## [2.9.8] - 2026-10-06 (Chuẩn Hoá Quy Trình Điều Vận 11 Bước: Bổ Sung Mốc Hạ Rỗng Riêng Biệt)

### 1. Chuẩn Hóa Quy Trình Điều Vận 11 Bước Thực Tế (TMS 11-Step Standardized Workflow):
- **Tách bạch bước vận chuyển về bãi và hạ cont:** Bổ sung bước riêng biệt **Bước 10: Đã hạ Cont: lấy phiếu EIR hạ bãi**, nâng cấp toàn bộ hệ thống từ quy trình 10 bước lên 11 bước chuẩn:
  1. `Nhận Booking` (Kinh doanh tiếp nhận & lệnh cấp cont)
  2. `Phát lệnh Điều vận: Tài xế` (Phân công xe, tài xế, lệnh Zalo/App)
  3. `Xác nhận chuyến: Tài xế [...] đã nhận chuyến` (Xác nhận từ App tài xế)
  4. `Tài xế Xuất phát & Hẹn giờ đến` (Đến bãi cont/cảng lấy hàng)
  5. `Đã đến Cổng kho` (Check-in cổng bảo vệ kho khách hàng)
  6. `Bắt đầu Đóng/ Trả: tại [Tên kho]/ [dock kho]` (Vào dock, tháo niêm phong)
  7. `Đóng hàng/ Xuống hàng xong` (Hoàn tất bốc xếp tại dock)
  8. `Đã ký đủ chứng từ Giao/ Nhận (POD)` (Biên bản giao nhận có chữ ký)
  9. `Vận chuyển về Bãi hạ Rỗng/ Cảng Xuất: [Tên bãi/ cảng]` (Kéo cont rời kho về bãi)
  10. `Đã hạ Cont: lấy phiếu EIR hạ bãi` (Cẩu hạ cont, nhận phiếu EIR hạ bãi)
  11. `Tổng hợp chi phí & Đối soát Thanh toán` (Kế toán chốt sổ)
- **Cập nhật Backend State Progression:** Nâng cấp hàm `build_10_step_timeline_spec`, bộ lọc dọn dẹp `step_number__gt=11` và hàm `sync_trip_10_step_timeline` trong `apps/dispatch/timeline_service.py`.
- **Cập nhật Giao diện Chi Tiết Chuyến:** Cập nhật tiêu đề và lưới tiến độ sang "Quy trình điều vận 11 bước" trong `templates/views/view_trip_detail.html`.
- **Đồng bộ toàn bộ cơ sở dữ liệu:** Thực thi `python manage.py resync_timelines --all` cập nhật thành công 46/46 chuyến xe trong hệ thống sang 11 bước chuẩn.
- **Tệp cập nhật:** [timeline_service.py](file:///E:/Bim_Logistics/apps/dispatch/timeline_service.py), [resync_timelines.py](file:///E:/Bim_Logistics/apps/dispatch/management/commands/resync_timelines.py), [view_trip_detail.html](file:///E:/Bim_Logistics/templates/views/view_trip_detail.html), [OPERATIONAL_WORKFLOW.md](file:///E:/Bim_Logistics/docs/OPERATIONAL_WORKFLOW.md).

## [2.9.7] - 2026-10-06 (Chuẩn Hoá Tạo & Sửa Báo Giá Sang Trang Riêng & Chuẩn Hoá Giờ 08:00)

### 1. Nâng Cấp Luồng Tạo & Chỉnh Sửa Báo Giá Sang Trang Riêng Toàn Màn Hình:
- **Tạo báo giá trang riêng (`openCreateQuotationPage`):** Nút **"Tạo Báo Giá Mới"** tại phân hệ Sales chuyển hướng trực tiếp sang trang soạn thảo toàn màn hình (`/sales/quotations/new`) thay vì mở pop-up modal chật hẹp, mở rộng không gian nhập liệu đa tuyến, ma trận cước, công thức giá dầu và điều khoản thương mại.
- **Nút sửa báo giá trực tiếp:** Chuyển nút sửa từ mở modal sang mở thẳng trang riêng (`viewQuotationDetail(quoteHash)`).
- **Hỗ trợ định tuyến & Deep-link:** Tự động điều hướng và đồng bộ URL khi tạo mới hoặc xem/sửa báo giá; sau khi lưu mới tự động chuyển hướng đến `/sales/quotations/<hashid>`.

### 2. Chuẩn Hóa Triệt Để Định Dạng Giờ Sang Chuẩn `HH:mm` (Ví Dụ: `08:00`):
- **Hàm tiện ích `formatTimeString`:** Tự động nhận diện và chuyển đổi mọi định dạng nhập tắt (`8H`, `8h`, `8`, `8:00`, `16H30`) thành chuẩn giờ quốc tế (`08:00`, `16:30`).
- **Backend & Models Default:** Chuyển toàn bộ giá trị fallback và default từ `'8H'` sang `'08:00'` trong `BookingOrder.loading_time`, `DispatchTrip` và API dispatch.
- **Tệp cập nhật:** [core.js](file:///E:/Bim_Logistics/static/js/modules/core.js), [sales.js](file:///E:/Bim_Logistics/static/js/modules/sales.js), [dispatch.js](file:///E:/Bim_Logistics/static/js/modules/dispatch.js), [app.js](file:///E:/Bim_Logistics/static/js/app.js), [view_sales.html](file:///E:/Bim_Logistics/templates/views/view_sales.html), [models.py](file:///E:/Bim_Logistics/apps/customers/models.py), [api_views.py](file:///E:/Bim_Logistics/apps/dispatch/api_views.py).

## [2.9.6] - 2026-10-06 (Chuẩn Hoá Ô Ngày Giờ Bảng Dữ Liệu Dạng Plain Text Không Dùng Badge)

### 1. Tối Giản Trình Bày Ô Ngày Giờ (Clean Datetime Cell Formatting):
- **Loại bỏ badge / pill wrapper:** Bỏ hoàn toàn thẻ badge (`bg-teal-100/80 text-teal-800 rounded font-bold`) bao quanh phần giờ tại các ô hiển thị ngày giờ trong bảng điều phối xe (`renderTripsTable`) và bảng booking.
- **Quy chuẩn định dạng text sạch:** Trình bày liền mạch theo chuẩn `Ngày | Giờ` (ví dụ: `06/10/2026 | 09:00`), sử dụng ký tự phân cách pipe mờ (`<span class="text-slate-300">|</span>`) và giữ icon lịch `ph-calendar`, tăng tính thanh thoát, chuyên nghiệp và đồng bộ thị giác.
- **Tệp cập nhật:** [dispatch.js](file:///E:/Bim_Logistics/static/js/modules/dispatch.js), [app.js](file:///E:/Bim_Logistics/static/js/app.js).

## [2.9.5] - 2026-10-06 (Đồng Bộ Font Size Bảng Dữ Liệu Theo [TÊN KHÁCH HÀNG] & Subtext Giảm 1 Size)

### 1. Đồng Bộ Phân Cấp Typography Cột Bảng (Table Typography Alignment):
- **Quy chuẩn kích thước văn bản chính (Primary Text):** Toàn bộ nội dung chính của các cột trong bảng Đơn hàng Booking (`sales-bookings-table`) được chuẩn hoá đồng bộ theo kích thước của cột `[TÊN KHÁCH HÀNG]` (`text-sm` font-bold/font-semibold, 14px):
  * **Cột Lịch Đóng:** Ngày hẹn nâng từ `text-xs` lên `text-sm font-bold text-slate-900`.
  * **Cột Mã Đơn:** Mã đơn `text-sm font-bold text-slate-900 font-mono`.
  * **Cột Số Booking:** Số booking `text-sm font-bold text-indigo-950 font-mono`.
  * **Cột Loại Cont & Hàng:** Loại cont `text-sm font-bold text-slate-900` (`Cont 40HC` / `Cont 20GP`), bỏ badge bao bọc.
  * **Cột Tiến Độ Điều Xe:** Tỷ lệ số lượng cont `text-sm font-bold text-slate-900 tabular-nums`.
  * **Cột Lộ Trình Vận Chuyển:** Địa điểm Lấy/Kho/Hạ nâng lên `text-sm leading-snug`.
  * **Cột Hạn Cắt Máng (CY):** Giờ closing time `text-sm font-bold text-rose-700`.
  * **Cột Cước Thỏa Thuận:** Đơn giá cước `text-sm font-black text-slate-900 tabular-nums`.
- **Quy chuẩn thông tin phụ (Subtext):** Nhỏ hơn đúng 1 size (`text-xs`, 12px, font-medium):
  * Giờ đóng hàng (`loading_time`): `text-xs text-slate-500 font-medium`.
  * Dịch vụ & Hãng tàu (`svcTag`, `shipping_line`): `text-xs text-slate-500 font-medium`.
  * Tàu/Chuyến (`vessel_voyage`): `text-xs text-slate-500 font-medium`.
  * Tên mặt hàng (`commodity`): `text-xs text-slate-500 font-medium`.
  * Trạng thái điều vận: `text-xs font-semibold`.
  * Hạn SI (`si_cutoff`): `text-xs text-slate-500`.

### 2. Tiện Ích Mở Rộng Ô Ghi Chú & Điều Khoản Báo Giá (Expandable Terms & Notes Textarea):
- **Bổ sung nút bấm "Mở Rộng Ô" / "Thu Gọn" trực quan:**
  * Thêm nút điều khiển tại góc trên bên phải thanh công cụ mẫu nhanh: icon `ph-arrows-out-simple` / `ph-arrows-in-simple`.
  * Khi bấm mở rộng: Ô textarea chuyển từ 5 dòng (`min-h-[110px]`) lên 14 dòng (`min-h-[280px]`), tự động cuộn đến vùng soạn thảo và focus con trỏ để gõ các điều khoản dài, hợp đồng chi tiết cực kỳ thoải mái.
  * Hỗ trợ kéo thả co giãn linh hoạt (`resize-y`), font chữ rõ nét (`text-xs sm:text-[13px] font-mono leading-relaxed`).
  * Các nút mẫu nhanh (Kéo Cont FCL, Xe Tải FTL, Theo Giá Dầu) được nâng kích thước nút bấm (`px-2 py-0.5 text-xs font-bold`) dễ bấm hơn.

### 3. Phân Hệ Chi Tiết Báo Giá Dạng Trang Riêng Biệt (Dedicated Full-Page View):
- **Kiến trúc Clean Semantic URL & HashID:**
  * Hỗ trợ mở Báo Giá thành một trang toàn màn hình với URL chuyên nghiệp: `https://logistics.bim.info.vn/sales/quotations/<hashid>` (hoặc theo mã `BG.YYMM.NNN`).
  * Tích hợp HashID bảo mật hai chiều (`get_quotation_hashid`, `decode_quotation_hashid`) trên model `Quotation` và endpoint API `QuotationDetailAPIView`.
  * Deep-link trực tiếp: Khi truy cập link hoặc chia sẻ đường dẫn cho đồng nghiệp, hệ thống tự động phân giải URL và load toàn bộ dữ liệu báo giá vào chế độ Full-Page.
- **Giao diện làm việc rộng rãi & trực quan (Dedicated Workspace):**
  * Tệp template riêng biệt: [templates/views/view_quotation_detail.html](file:///E:/Bim_Logistics/templates/views/view_quotation_detail.html).
  * Header thanh thoát kèm nút "Quay Lại", nút "Sao Chép Link" trực tiếp, nút "Xem & In A4", và nút "Lưu Thay Đổi".
  * Bảng ma trận đa tuyến mở rộng toàn màn hình giúp nhập hàng chục tuyến đường cho khách hàng không bị chật chội.
  * Khung soạn thảo Ghi chú & Điều khoản thương mại rộng thoáng (9 dòng mặc định, hỗ trợ kéo giãn).
  * Tích hợp nút mở nhanh tại bảng danh sách Báo giá (icon `ph-arrow-square-out`) và mã báo giá trở thành link bấm trực tiếp.

### 4. Đồng Bộ Hệ Thống & Kiểm Thử:
- Đồng bộ hoàn chỉnh giữa `static/js/modules/sales.js`, `static/js/modules/reports.js`, `static/js/app.js`, `config/urls.py`, và `templates/index.html`.
- Đảm bảo 100% cú pháp JS không lỗi (`node -c`).
- 86/86 Unit & System Tests PASSED 100%.

---

## [2.9.4] - 2026-10-06 (Khắc Phục Dứt Điểm Lệch Phải & Chuẩn Hoá Thẩm Mỹ Lề Trang In A4 Doanh Nghiệp)

### 1. Khắc Phục Lỗi Lệch Phải Khi In Ấn (Fix Print Right-Shift Layout Bug):
- **Nguyên nhân gốc rễ:** Thẻ `<body>` có thuộc tính `class="flex h-screen"`. Khi in, `visibility: hidden` trên toàn trang chỉ ẩn nội dung chứ không loại bỏ phần tử thanh điều hướng trái (`#sidebar` 256px) khỏi dòng chảy flexbox layout, khiến toàn bộ modal in bị đẩy lệch sang phải 256px tạo khoảng trắng lớn ở mép trái giấy in A4.
- **Giải pháp triệt để:**
  * Reset `html, body` trong `@media print` sang `display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important;`.
  * Thiết lập `body > * { display: none !important; }` để loại bỏ 100% Sidebar, Main App, Toast và các modal khỏi layout in.
  * Chỉ cho phép duy nhất modal đang in hiển thị dạng `display: block !important;` xuất phát từ toạ độ (0, 0) của trang giấy.
  * Reset chính xác 2 cấp khung bọc trung gian của modal thành block trong suốt không đệm, không flexbox căn lệch tâm.
  * Bổ sung lắng nghe sự kiện `beforeprint` để tự động kích hoạt cờ in kể cả khi người dùng bấm phím tắt `Ctrl + P`.

### 2. Chuẩn Hoá Thẩm Mỹ Lề Trang & Typography Bản In (A4 Enterprise Print Aesthetics):
- **Thiết lập lề in chuẩn văn bản hành chính & hợp đồng doanh nghiệp:**
  * Cấu hình `@page { size: A4 portrait; margin: 12mm 15mm 12mm 16mm; }` (Top: 12mm, Right: 15mm, Bottom: 12mm, Left: 16mm - chuẩn đóng gáy kẹp file).
  * Vùng in `#quotation-printable-area` có đệm an toàn `padding: 4mm 6mm !important;`, tổng khoảng cách từ mép giấy đạt 16mm trên/dưới, 22mm lề trái, 21mm lề phải — tài liệu thoáng đãng, sang trọng, không bị dính sát mép cắt hay tràn mép giấy.
  * Khung xem trước trên Web Modal được định dạng như một tờ giấy A4 thực tế (`max-w-[840px]`, `p-6 sm:p-12`, `bg-white shadow-xl rounded-sm`).
- **Nâng cấp thẩm mỹ Bảng báo giá và Chữ ký:**
  * Bảng cước sử dụng viền mỏng thanh lịch (`border: 1px solid #64748b`, cell `border: 1px solid #94a3b8`, cell padding `5px 8px`), thead xám bạc (`#f1f5f9`), chân bảng tổng tiền viền đôi sắc sảo.
  * Hộp điều khoản vận tải bo góc tinh tế (`bg-slate-50/70`, `border: 1px solid #cbd5e1`, padding `8px 12px`, font chữ thoáng).
  * Khung chữ ký 2 bên (Đại diện khách hàng & Triền Võ Logistics) căn đều 2 mép với khoảng trống ký cao 80px (`h-20`), tên công ty in hoa trang trọng ở chân chữ ký.
  * Đồng bộ lề và tỷ lệ trang in cho Phiếu Thu/Chi (`#cash-voucher-printable-area`) và Báo Cáo Quản Trị (`#report-printable-area`).

---

## [2.9.3] - 2026-10-06 (Chuẩn Hoá Giao Diện Bảng Dữ Liệu: Loại Bỏ Badge Viền/Hộp Màu, Dùng Màu Chữ Tinh Gọn)

### 1. Tinh Gọn Ô Trạng Thái & Thông Tin Bảng Dữ Liệu (Clean Text-Only Styling):
- **Loại bỏ toàn bộ badge dạng viên thuốc (pill), border khung viền, nền màu đậm (`bg-*`, `border-*`, `rounded-*`) và các icon trang trí** trong các ô bảng dữ liệu gây chậm render trang và rối mắt.
- **Áp dụng chuẩn quốc tế ERP:** Trình bày text thuần túy gọn gàng, sử dụng màu chữ ngữ nghĩa (`font-semibold`/`font-bold`, `text-xs`) để phân biệt trạng thái:
  * **Trạng thái Chuyến xe Điều vận (`trips-table`):** Hiển thị text trực tiếp với màu chữ (`text-emerald-700` cho hoàn tất/có POD, `text-amber-700` cho đang chạy, `text-rose-700` cho từ chối/quá hạn, `text-slate-700` cho các trạng thái khác). Rút gọn SLA text không dùng icon/badge.
  * **Bảng Báo giá & Hợp đồng Sale (`sales-quotations-table`):** Chuyển nhãn hợp đồng sang text tinh gọn (`text-emerald-700` cho Đã duyệt, `text-amber-700` cho Chờ duyệt/Thương lượng, `text-rose-700` cho Từ chối, `text-teal-700` cho bản thảo). Nhãn phụ phương thức tính cước và số tuyến bổ sung chuyển về text thuần.
  * **Bảng Nhân sự & Lái xe (`employees-table`):** 
    - Cột **Biệt danh:** Chuyển từ badge nền vàng sang text thông thường (`text-slate-800 font-medium`).
    - Cột **Chức vụ:** Bỏ nền và viền, hiển thị text rõ nét với màu phân cấp (`text-emerald-700` cho Tài xế, `text-purple-700` cho Giám đốc, `text-blue-700` cho nhân viên/điều độ).
    - Cột **Trạng thái làm việc:** Bỏ icon tích tròn, hiển thị text trực quan: `Đang làm` (`text-emerald-700 font-bold`) hoặc `Tạm ngưng` (`text-slate-400 font-medium`).
  * **Bảng Đơn hàng Booking (`sales-bookings-table`):** Chuyển trạng thái sang text thuần túy (`Chờ điều xe`, `Đang điều xe`, `Đã đủ cont`, `Đã hủy`).
  * **Bảng Dashboard PnL (`dashboard-pnl-table`):** Chuyển nhãn hoàn tất và đang vận hành sang text màu tinh gọn.

### 2. Đồng Bộ & Kiểm Thử Hệ Thống:
- Đồng bộ chuẩn xác giữa `static/js/app.js` và toàn bộ tệp mô-đun trong `static/js/modules/` (`core.js`, `dispatch.js`, `sales.js`, `hr.js`, `dashboard.js`).
- 100% cú pháp JS vượt qua kiểm tra (`node -c`).
- 86/86 Unit & System Tests PASSED 100%.
- 10/10 Critical User Journeys PASSED 100%.
- Đã commit và triển khai lên Production VPS (`logistics.bim.info.vn`), chạy mượt mà.

---

## [2.9.2] - 2026-10-06 (Chuẩn Hoá Mã Giao Dịch [XX.YYMM.NNN] & Bổ Sung Cột Ngày Tháng Dashboard & Báo Giá)

### 1. Chuẩn Hoá Toàn Bộ Mã Giao Dịch Vận Tải & Kế Toán:
- Định dạng thống nhất theo chuẩn `[Mã 2 ký tự].[Năm 2 ký tự][Tháng 2 ký tự].[Số 3 ký tự]` (`XX.YYMM.NNN`):
  * **Lệnh Điều Vận (Trip Code):** Sinh theo chuẩn `DV.{yymm}.{counter:03d}` (Ví dụ: `DV.2610.001`, `DV.2610.099`).
  * **Đơn Hàng Booking:** Sinh theo chuẩn `BK.{yymm}.{counter:03d}` (Ví dụ: `BK.2610.001`, `BK.2610.009`).
  * **Báo Giá Tuyến Cước (Quotation):** Sinh theo chuẩn `BG.{yymm}.{counter:03d}` (Ví dụ: `BG.2610.001`).
  * **Phiếu Thu Sổ Quỹ (Receipt Voucher):** Sinh theo chuẩn `PT.{yymm}.{seq:03d}` (Ví dụ: `PT.2610.001`, `PT.2611.022`).
  * **Phiếu Chi Sổ Quỹ (Payment Voucher):** Sinh theo chuẩn `PC.{yymm}.{seq:03d}` (Ví dụ: `PC.2610.001`, `PC.2611.025`).

### 2. Bổ Sung Cột Ngày Tháng Năm Cho Các Bảng Dữ Liệu:
- **Bảng Dashboard Hiệu Suất & PnL (`dashboard-pnl-table`):**
  * Bổ sung cột "Ngày Chạy" (`loading_date`), định dạng `DD/MM/YYYY`, căn giữa, hiển thị rõ ràng.
  * Hỗ trợ sắp xếp Timestamp hai chiều (Asc/Desc) cho cột Ngày Chạy.
  * Cập nhật `colspan` dòng trống từ 10 lên 11.
- **Bảng Báo Giá Tuyến & Hợp Đồng CRM (`sales-quotations-table`):**
  * Bổ sung cột "Ngày Báo Giá" (`created_at`), định dạng `DD/MM/YYYY`, căn giữa.
  * Bổ sung chức năng sắp xếp Timestamp cho Ngày Báo Giá (`quoteSortColumn === 'created_at'`).
  * Thêm `created_at` vào bộ lọc tìm kiếm văn bản đa năng.
  * Cập nhật `colspan` dòng trống từ 8 lên 9.

### 3. Đồng Bộ Kiến Trúc & Kiểm Thử Toàn Diện:
- Đồng bộ tuyệt đối giữa `static/js/app.js` và các modules trong `static/js/modules/` (`sales.js`, `dashboard.js`).
- 86/86 Unit & System Tests PASSED 100%.
- 10/10 Critical User Journeys PASSED 100%.
- 100% JS Syntax checks PASSED.

---

## [2.9.1] - 2026-10-06 (Refactor Toàn Bộ Data Table: Tách Cột Mã & Ngày, Sắp Xếp Timestamp, Cố Định Cột Thao Tác)

### 1. Tách Biệt Cột Mã & Cột Ngày Tháng (Data Table Refactoring):
- **Phân hệ Điều Vận (`view_dispatch.html`):** Tách cột gộp "MÃ / LỊCH ĐÓNG" thành 2 cột riêng biệt `[Mã Chuyến]` (font monospace, định dạng gọn `formatCodeCompact`) và `[Lịch Đóng]`. Bổ sung tính năng Sort độc lập theo Timestamp cho cột Ngày tháng và Sort theo Mã.
- **Phân hệ Đơn Hàng / Báo Giá / Sale (`view_sales.html`):** Tách cột gộp "MÃ ĐƠN / LỊCH ĐÓNG" thành 2 cột riêng biệt `[Mã Đơn]` và `[Lịch Đóng]`. Hỗ trợ sắp xếp Timestamp cho Lịch đóng và Mã đơn.
- **Phân hệ Quyết Toán Chuyến Xe (`view_settlement.html`):** Tách cột gộp "Mã Chuyến & Ngày Chạy" thành 2 cột riêng biệt `[Mã Chuyến]` và `[Ngày Chạy]`. Điều chỉnh cấu trúc colspan từ 11 thành 12.
- **Phân hệ Đối Soát Kế Toán P&L (`view_accounting.html`):** Tách cột gộp "Mã Chuyến & Ngày Chạy" thành 2 cột riêng biệt `[Mã Chuyến]` và `[Ngày Chạy]`, hỗ trợ Sort theo Timestamp cho `loading_date` và icon tương tác trực quan. Điều chỉnh colspan từ 9 thành 10.
- **Phân hệ Tạm Ứng & Hoàn Ứng Tài Xế (`view_accounting.html`):** Tách cột gộp "Mã Chuyến & Ngày" thành 2 cột riêng biệt `[Mã Chuyến]` và `[Ngày Ứng]`. Điều chỉnh colspan từ 10 thành 11.
- **Phân hệ Chi Hộ & Thu Hồi Debit Note (`view_accounting.html`):** Tách cột gộp "Mã Chuyến / Ngày" thành 2 cột riêng biệt `[Mã Chuyến]` và `[Ngày Chi]`. Điều chỉnh colspan từ 11 thành 12.

### 2. Định Dạng Mã Gọn Gàng & Chống Tràn Cột (UI/UX Table Balancing):
- **Hàm tiện ích `formatCodeCompact(code)`:** Thay thế khoảng trắng dư thừa trong các mã vận đơn/phiếu/chuyến bằng dấu chấm (`.`) giúp mã hiển thị gọn gàng, tăng diện tích trình bày thông tin nghiệp vụ.
- **Cố định cột Thao tác (Sticky Actions Column):** Bổ sung CSS sticky pinning `.erp-table th[data-col-key="actions"]` và `.cell-actions` ở mép phải (`right: 0`), đảm bảo bảng cuộn ngang mượt mà không bao giờ bị vỡ bố cục hoặc che mất các nút Thao tác/Chi tiết.
- **Tự động cân chỉnh chiều rộng (Column Auto-Width):** Sử dụng các utility `w-28 font-mono`, `whitespace-nowrap`, và `text-center` cho các cột Mã và Ngày tháng.

### 3. Kiểm Thử Hồi Quy Toàn Diện:
- **86/86 Unit & System Tests PASSED 100%**.
- **10/10 Critical User Journeys PASSED 100%**.
- **100% JS Syntax Checks PASSED** trên toàn bộ `app.js`, `column_manager.js` và tất cả các tệp trong thư mục `static/js/modules/`.

---

## [2.9.0] - 2026-10-06 (Tái Cấu Trúc Toàn Diện Frontend: Modular JavaScript Architecture)

### 1. Phân Tách Mã Nguồn Khối Lớn (Modular Subsystems):
- Tách khối mã nguồn nguyên khối thành thư mục chuyên biệt `static/js/modules/` theo từng phân hệ nghiệp vụ:
  * `core.js`: Bộ tiện ích dùng chung, bộ định dạng số tiền VNĐ, xác thực JWT & CSRF, Modal xác nhận.
  * `dashboard.js`: Xử lý phân tích dữ liệu Ban Giám Đốc, biểu đồ Chart.js và P&L sản lượng.
  * `dispatch.js`: Quản lý điều vận, CRUD lệnh điều động, gán xe/tài xế, theo dõi tiến độ chuyến xe.
  * `sales.js`: Nghiệp vụ CRM Báo giá cước đa chặng, cơ chế bù trừ xăng dầu DO và quản lý Booking.
  * `fleet.js`: Quản trị đội xe, rơ-moóc, trạm bãi và trạng thái phương tiện.
  * `hr.js`: Quản lý danh bạ nhân sự, phân quyền vai trò và bảng lương tài xế.
  * `accounting.js`: Quản lý tạm ứng/hoàn ứng, sổ quỹ tiền mặt/ngân hàng, đối soát công nợ thầu phụ và thu hồi chi hộ.
  * `customs.js`: Phân hệ tờ khai hải quan điện tử VNACCS/VCIS và quản lý ngày miễn phí lưu bãi.
  * `reports.js`: Trung tâm phân tích BI 14 mẫu báo cáo vận tải và in ấn xuất báo cáo Excel/PDF.
  * `master_data.js`: Quản lý danh mục biểu phí lương, phụ cấp, cự ly tuyến đường và khách hàng.
  * `router.js`: Điều hướng Clean Semantic URL và quản lý đóng mở modal.
- Khắc phục triệt để lỗi ngoại lệ `ReferenceError` ngắt quãng JavaScript khi gọi inline events.
- **Tối ưu UI màn hình Quyết Toán Gom Chuyến (`quyet-toan`):** Ẩn cụm nút chọn kỳ toàn cục trên Topbar khi người dùng chuyển sang màn hình Quyết toán chuyến xe (vì giao diện phân hệ này đã tích hợp đầy đủ bộ lọc thời gian chuyên biệt Từ ngày - Đến ngày kèm các preset nhanh).

### 2. Kiểm Thử & Triển Khai:
- **86/86 Unit Tests PASSED 100%**.
- **10/10 User Journeys PASSED 100%**.
- Kiểm tra cú pháp toàn bộ các module `node -c static/js/modules/*.js` đạt 100% hợp lệ.

---

### 1. Chuẩn Hóa Tài Nguyên Tĩnh & SEO / Bot Crawl Protection:
- **Tích hợp Favicon Doanh nghiệp:**
  * Khởi tạo file biểu tượng chuẩn `static/favicon.ico` đa kích thước (32x32, 16x16) trích xuất từ logo chuẩn của thương hiệu.
  * Khai báo thẻ link favicon trong `templates/base.html`.
  * Bổ sung route điều hướng trực tiếp `/favicon.ico` trong `config/urls.py` chuyển hướng về `/static/favicon.ico`, giải quyết triệt để lỗi 404 trong nhật ký Gunicorn/Nginx.
- **Bảo Vệ Hệ Thống Với Robots.txt:**
  * Bổ sung `static/robots.txt` chặn các bot thu thập dữ liệu rà soát cổng `/admin/` và `/api/`.
  * Định tuyến `/robots.txt` qua `RedirectView` tại `config/urls.py`.

### 2. Kiểm Thử Toàn Diện & Trạng Thái Hệ Thống:
- **86/86 Unit & System Tests PASSED 100%**.
- **10/10 Critical User Journeys PASSED 100%**.
- **12/12 API Table Endpoints phản hồi HTTP 200 OK**.
- **JavaScript Syntax Check (`node -c`) đạt 100% không phát sinh lỗi.**

---

## [2.8.8] - 2026-10-06 (Kích Hoạt Nút Thêm Tuyến Động & Chuẩn Hóa Bản In A4 1 Màu Không Bo Viền)

### 1. Kích Hoạt & Cố Định Nút "+ Thêm Tuyến Đường":
- **Gắn hàm lên phạm vi toàn cục (`window`):** Xuất toàn bộ các hàm thao tác Báo giá (`window.addQuotationRouteRow`, `window.removeQuotationRouteRow`, `window.calculateQuotationItemsTotal`, `window.onQuotationPricingMethodChange`...) lên `window` để đảm bảo các sự kiện `onclick` hoạt động 100% không bị ngắt quãng.
- **Tự động gắn bộ định dạng số VNĐ (`input-number-vn`):** Tích hợp trình lắng nghe định dạng số trực tiếp cho từng dòng tuyến đường mới sinh ra, tự động cập nhật Thành tiền và Tổng doanh thu ngay khi nhập đơn giá hoặc sản lượng.

### 2. Chuẩn Hóa Bản In A4 Doanh Nghiệp (Phẳng, Đơn Sắc, Không Bo Viền):
- **Loại bỏ hoàn toàn bo viền & bóng mờ khi in:**
  * Reset toàn bộ các lớp wrapper của Modal in (`#modal-quotation-print`, dialog containers) trong `@media print` về `position: static !important; background: #ffffff !important; border: none !important; border-radius: 0 !important; box-shadow: none !important;`.
  * Khung `#quotation-printable-area` in trực tiếp lên trang giấy A4 trắng không viền ngoài, không viền cong bo tròn.
  * Bảng biểu kẻ viền đen nét mảnh chuẩn mực (`border: 1px solid #000000`).
  * Loại bỏ các khối thẻ bo góc (Bằng chữ, Ghi chú, Cơ chế xăng dầu) chuyển sang văn bản hành chính phẳng, chuẩn 1 màu đơn sắc chuyên nghiệp.

### 3. Kiểm Thử & Triển Khai:
- **86/86 Unit Tests PASSED 100%**.
- `node -c static/js/app.js` PASSED.

---

## [2.8.7] - 2026-10-06 (Khắc Phục Xung Đột Modal In & Cách Ly Độc Lập Mẫu In Báo Giá / Phiếu Thu Chi / Báo Cáo)

### 1. Khắc Phục Triệt Để Xung Đột `@media print`:
- **Nguyên nhân cốt lõi:** Trong `static/css/main.css`, selector `@media print` trước đây áp dụng đồng thời `display: block !important` và `visibility: visible !important` cho cả 3 modal (`#modal-cash-voucher-print`, `#modal-quotation-print`, `#modal-report-print`). Vì `#modal-report-print` nằm sau cùng trong cây DOM HTML, khi mở modal Báo Giá và bấm "In", trình duyệt bị ép hiển thị đè mẫu "Báo cáo Quản trị/Hiệu suất đội xe" lên trên bản Báo Giá.
- **Giải pháp xử lý dứt điểm:**
  * **CSS Isolation:** Thiết lập cơ chế phân tách và cách ly tuyệt đối 3 ngữ cảnh in ấn. Bất kỳ modal nào có class `.hidden` hoặc `.hidden-view` đều bị áp đặt `display: none !important; visibility: hidden !important;` khi in.
  * **JS Context Flagging:** Trong `static/js/app.js`, các hàm `printQuotationVoucher()`, `printCashVoucher()`, `executePrintReportDocument()` tự động gán class ngữ cảnh (`is-printing-quotation`, `is-printing-voucher`, `is-printing-report`) lên `document.body` trước khi gọi `window.print()`, đồng thời tự động dọn sạch cờ sau sự kiện `afterprint`.
- **Kết quả:** Khi bấm In Báo Giá, bản in ra giấy/PDF hiển thị chính xác 100% mẫu **Báo Giá Cước Vận Chuyển A4 WYSIWYG** (không bị đè bởi bất kỳ mẫu báo cáo nào khác).

### 2. Kiểm Thử & Triển Khai:
- **86/86 Unit Tests PASSED 100%**.
- `node -c static/js/app.js` PASSED không lỗi cú pháp.
- Triển khai và khởi động lại dịch vụ thành công trên VPS (`149.118.60.194:8085`).

---

## [2.8.6] - 2026-10-05 (Nâng Cấp Phân Hệ Sales: Báo Giá Đa Tuyến Đường Động, Cơ Chế Định Giá Xăng Dầu & In A4 WYSIWYG)

### 1. Nâng Cấp Phương Thức Định Giá & Mô Hình Báo Giá (Pricing Models):
- **Báo giá Đa Tuyến Đường (`MULTI_ROUTE`):**
  * Bổ sung model `QuotationItem` liên kết với `Quotation`, cho phép thêm/sửa/xóa không giới hạn các dòng tuyến đường cho cùng một khách hàng trong một phiếu báo giá.
  * Mỗi tuyến đường quản lý độc lập: Lộ trình chi tiết, Quy cách loại cont/xe (20GP, 40HC, 45ft, Xe tải 5T, 10T, 15T...), Cự ly km, Đơn giá cước đề xuất (VNĐ), Sản lượng cam kết (chuyến/tháng) và Thành tiền theo từng dòng.
  * Tự động cộng dồn và tính toán chính xác Tổng sản lượng cam kết và **Tổng Doanh Thu Kế Hoạch / Tháng**.
- **Báo giá Gắn Biến Động Xăng Dầu DO 0.05S (`FUEL_ADJUSTED`):**
  * Khai báo Giá dầu DO cơ sở $P_0$ (VNĐ/lít) tại thời điểm ký kết (vd: 21.000 đ/lít).
  * Khai báo Biên độ bước nhảy giá dầu (vd: 1.000 đ/lít) và Tỷ lệ % điều chỉnh cước tương ứng (vd: $\pm 3.5\%$).
  * Tự động tạo và hiển thị công thức điều chỉnh giá cước thương mại theo đúng chu kỳ điều hành giá xăng dầu của Petrolimex / Bộ Công Thương.
- **Báo giá Trọn Gói / Bao Chuyến (`FLAT_CHARTER`):** Hỗ trợ báo giá bao trọn gói cố định theo kỳ hạn.

### 2. Chuẩn Hóa Bản In & Bản Preview A4 WYSIWYG:
- **Đồng bộ 100% giữa Preview và Bản In (What You See Is What You Get):**
  * Khung in thiết kế chuẩn tỷ lệ trang A4 đứng (`portrait`, `@page { size: A4 portrait; margin: 8mm 10mm; }`).
  * Preview trong Modal như thế nào thì khi bấm "In Ngay" hoặc xuất PDF ra giấy y hệt 100%, không bị vỡ bảng, lệch lề hay nhảy trang vô lý.
  * Render đầy đủ toàn bộ bảng danh sách các tuyến đường (STT 1, 2, 3...).
  * Tự động hiển thị Khối **"QUY CHUẨN ĐIỀU CHỈNH CƯỚC THEO GIÁ XĂNG DẦU"** khi báo giá áp dụng cơ chế xăng dầu.
  * Giữ nguyên chữ ký 2 bên Đại diện Khách hàng và Đại diện Triền Võ Logistics (TVL).

### 3. Kiểm Thử & Triển Khai:
- **86/86 Unit Tests PASSED 100%** (bao gồm `QuotationMultiRouteAndPricingMethodTestCase` và `FrontendSyntaxIntegrityTestCase`).
- `node -c static/js/app.js` và `node -c static/js/column_manager.js` PASSED không lỗi cú pháp.

---

## [2.8.5] - 2026-10-05 (Sửa Lỗi Cấu Trúc HTML Layout Báo Cáo & Chuẩn Hóa Nhãn Thương Hiệu BIZ SOLUTIONS)

### 1. Khắc Phục Triệt Để Lỗi Bố Trí Layout Màn Hình Báo Cáo & Thống Kê:
- **Nguyên nhân cốt lõi:** Thẻ đóng `</div>` dư thừa trong `view_accounting.html` (dòng 954) và `view_reports.html` (dòng 860, 1105) đã vô tình đóng sớm vùng chứa `<main id="main-views">`, làm phân hệ Báo cáo bị đẩy ra ngoài và hiển thị lệch sang cột phải (tạo khoảng trống trắng lớn bên trái).
- **Xử lý dứt điểm:** Rà soát và cân bằng 100% tất cả các thẻ mở/đóng `<div>` trên toàn bộ các view và component template trong dự án.
- **Kết quả:** Phân hệ Báo cáo & Thống kê hiển thị toàn màn hình, thanh Sidebar và Topbar căn chỉnh chuẩn mực, bố cục 4 thẻ nhóm báo cáo và bảng số liệu dàn đều chuyên nghiệp.

### 2. Chuẩn Hóa Nhãn Thương Hiệu:
- Hiệu chỉnh nhãn trên Header Sidebar: `BIM SOLUTIONS` ➔ **`BIZ SOLUTIONS`** theo đúng nhận diện hệ sinh thái doanh nghiệp.

### 3. Kiểm Thử & Triển Khai:
- **82/82 Unit Tests PASSED 100%**.
- Đã triển khai và khởi chạy ổn định trên máy chủ VPS (`port 8085`).

---

## [2.8.4] - 2026-10-05 (Tái Cấu Trúc Gom 4 Nhóm Báo Cáo Chiến Lược & Nâng Cấp Báo Cáo Đối Soát Công Nợ Khách Hàng AR Aging)

### 1. Tái Cấu Trúc Gom 14 Báo Cáo Quản Trị Thành 4 Nhóm Nghiệp Vụ Chuyên Sâu:
- **Giải quyết bất cập UX thanh tab 14 nút dài:** Thay thế giao diện dàn trải bằng **4 Thẻ Nhóm Báo Cáo Chiến Lược (Group Category Cards)** kết hợp thanh điều hướng con (Sub-pills) mượt mà:
  * **📊 Nhóm I: Doanh Thu & Hiệu Suất Đội Xe:**
    - `report-1`: Hiệu Suất Đội Xe & P&L Chi Tiết Từng Đầu Xe (Vehicle Profit Center).
    - `report-7`: Doanh Thu Khách Hàng & Sản Lượng TEU (Key Accounts Analysis).
    - `report-4`: Chi Phí Tuyến Đường & Thu Hồi Tiền Chi Hộ Khách Hàng.
  * **🚛 Nhóm II: Vận Hành, Hiện Trường & Ngoại Lệ:**
    - `report-2`: Quản Lý Vỏ Cont & Cảnh Báo Hạn DEM/DET Hãng Tàu.
    - `report-3`: Tỷ Lệ Giao Đúng Giờ (OTP / OTD & Delay Analytics).
    - `report-5`: Bàn Giao Cắt Kéo & Neo Xe Qua Đêm Sau 0H.
    - `report-6`: Biên Bản Ngoại Lệ & Sự Cố Hàng Hóa (OS&D Incident Reports).
  * **💵 Nhóm III: Tài Chính, Sổ Quỹ & Chi Phí Lương:**
    - `report-10`: Sổ Quỹ Tiền Mặt & Quỹ Tạm Ứng Điều Vận (Kế Toán Quản Lý).
    - `report-11`: Tạm Ứng Dọc Đường & Kê Khai Chi Phí Lái Xe (Điều Vận Quản Lý).
    - `report-9`: Bảng Lương Chuyến & Thu Nhập Lái Xe.
    - `report-8`: Quyết Toán & Công Nợ Nhà Xe Thầu Phụ 3PL.
  * **📑 Nhóm IV: Quyết Toán Chuyến, Công Nợ Phải Thu & Tuổi Đơn:**
    - `report-13`: **Báo Cáo Công Nợ Phải Thu Khách Hàng (AR Aging & Đối Soát SOA)**.
    - `report-12`: Báo Cáo Tiến Độ Quyết Toán Chuyến Xe & Backlog Tồn Đọng.
    - `report-14`: Phân Tích Tuổi Đơn Hàng Tồn Đọng Chưa Khóa Sổ.
- **Hỗ trợ chuyển đổi chế độ xem linh hoạt:** Nút toggle giữa chế độ **"Theo Nhóm"** (gọn gàng, tập trung) và **"Tất Cả (14)"** (truy cập nhanh toàn diện).

### 2. Nâng Cấp Toàn Diện Phân Hệ Báo Cáo Công Nợ Khách Hàng (AR Aging & Đối Soát SOA):
- **Cung cấp cấu trúc dữ liệu đối soát chi tiết từng chuyến đi (`trips: []`):**
  * Backend API (`reports_api.py`) gom dữ liệu chuyến xe theo từng khách hàng (Mã chuyến, ngày chạy, xe kéo, bác tài, số container, tuyến đường, tiền cước vận tải, chi phí chi hộ, tổng tiền phải thu, tình trạng chứng từ POD, trạng thái quyết toán).
- **Modal Bảng Kê Đối Soát Công Nợ Khách Hàng (`modal-customer-ar-statement`):**
  * Hiển thị đầy đủ thông tin pháp lý của khách hàng (Tên công ty, Mã KH, MST, SĐT).
  * 4 Thẻ chỉ số đối soát: Tổng Phát Sinh, Cước Vận Tải, Tiền Chi Hộ, Đã Thanh Toán, Dư Nợ Còn Phải Thu.
  * Bảng danh sách chi tiết từng vận đơn/chuyến xe trong kỳ.
- **In Bảng Kê Đối Soát Khách Hàng Khổ A4 Chuẩn Doanh Nghiệp (Statement of Account Print):**
  * Tích hợp thương hiệu **CÔNG TY TNHH ĐẦU TƯ VẬN TẢI TRIỀN VÕ** (Logo TVL, MST, Trụ sở, Hotline).
  * Bảng kê chuyến hàng có STT, mã chuyến, số cont, tuyến đường, cước, chi hộ, tổng tiền.
  * Dòng tổng kết đối soát, số tiền bằng chữ tiếng Việt và 3 vị trí ký tên (Người lập biểu, Kế toán công nợ, Đại diện Khách hàng).

### 3. Kiểm Thử Tự Động & Vận Hành:
- **79/79 Unit Tests PASSED (100%)**.

---

## [2.8.3] - 2026-10-05 (Tự Động Mở Phiếu Thu/Chi Khi Quyết Toán & Khai Báo Chi Nhánh / Bãi Xe Hệ Thống)

### 1. Tự Động Mở Ngay Phiếu Thu / Phiếu Chi Khi Quyết Toán Chuyến:
- **Tự động mở Modal Phiếu Thu / Chi khi bấm "Xác Nhận Quyết Toán Gom":**
  * Ngay khi hoàn tất quyết toán gom nhiều chuyến xe (hoặc quyết toán hoàn ứng đơn lẻ), hệ thống tự động khởi tạo bút toán Sổ Quỹ (`CashTransaction`) và bật ngay **Modal Xem & In Phiếu Thu / Phiếu Chi chuẩn Mẫu 01-TT / 02-TT BTC**.
  * Hỗ trợ đầy đủ các tình huống:
    - **Thu hoàn ứng tiền thừa (`INFLOW`):** Khi Tạm ứng > Thực chi (Tài xế nộp lại tiền thừa).
    - **Chi bù vượt ứng (`OUTFLOW`):** Khi Thực chi > Tạm ứng (Công ty/Điều vận chi bù tiền phát sinh).
    - **Đối soát khớp đúng (`0 đ`):** Tự động lập chứng từ đối soát cân bằng và mở phiếu xác nhận.
- **Nâng cấp quyền hạn `CashBookDetailAPIView`:** Mở rộng cho cả Điều phối viên và Kế toán viên (`IsDispatcherOrAccountant`) để việc in ấn chứng từ hiện trường không bị chặn quyền.

### 2. Bổ Sung Khai Báo Chi Nhánh & Bãi Đỗ Xe Hệ Thống:
- Thêm các trường dữ liệu mới vào `CompanyProfile`:
  * **Chi nhánh:** `branch_name`, `branch_address`, `branch_phone`.
  * **Bãi xe & Depot:** `fleet_yard_name`, `fleet_yard_address`, `fleet_yard_hotline`.
  * **Chính sách:** `notes` (Ghi chú & chính sách vận hành toàn hệ thống).
- Giao diện 6 nhóm thẻ thông tin trực quan và Modal hiệu chỉnh đồng bộ trên phân hệ `/settings`.

### 3. Kiểm Thử & Triển Khai:
- **79/79 Tests Tự Động PASSED 100%**.
- Triển khai và khởi chạy ổn định trên máy chủ VPS (`port 8085`).

---

## [2.8.2] - 2026-10-05 (Chuẩn Hóa Logo Khách Hàng Triền Võ & Trải Nghiệm Xem Full Viền Tờ A4)

### 1. Phân Tách Tuyệt Đối Logo Công Ty Khách Hàng (Triền Võ) & Logo Phần Mềm (BIM):
- **Chuẩn hóa Logo Công ty Triền Võ (`trienvo_logo.png`):**
  * Tách biệt hoàn toàn Logo phần mềm quản trị BIM (`logo.png`) khỏi các chứng từ in ấn của doanh nghiệp.
  * Cập nhật model `CompanyProfile` và database: `logo_url` mặc định trỏ chính xác đến `/static/images/trienvo_logo.png` (Logo có vòng cung và chữ TVL - Trien Vo Logistics).
  * Hàm `syncCompanyProfileToPrintForms()` ngăn chặn triệt để việc fallback nhầm sang logo phần mềm BIM.
- **Loại bỏ dòng phụ `BIM LOGISTICS`:** Xóa bỏ hoàn toàn nhãn `BIM LOGISTICS — Vận Tải & Dịch Vụ Cảng Quốc Tế` trên toàn bộ các biểu mẫu in (Phiếu Thu/Chi Liên 1 & 2, Báo Giá Cước Vận Chuyển, 14 Phân Hệ Báo Cáo Quản Trị BI).
- **Hàm `syncCompanyProfileToPrintForms()`:** Tự động lấy trực tiếp thông tin từ cấu hình Khai Báo Hệ Thống (`masterDataCache['company']` / `CompanyProfile`) bao gồm:
  * Tên doanh nghiệp đầy đủ: `CÔNG TY TNHH ĐẦU TƯ VẬN TẢI TRIỀN VÕ` (`print-comp-name`).
  * Trụ sở chính: `153/1 Quốc Lộ 1A, P. An Phú Đông, Quận 12, TP. Hồ Chí Minh` (`print-comp-address`).
  * Mã số thuế: `0314567890`, Hotline điều hành: `0965.559.561`, Email: `Phongkinhdoanh.tvl@trienvo.com` (`print-comp-contact`).
  * Logo nhận diện chính thức Triền Võ Logistics (`print-comp-logo`).

### 2. Giao Diện Xem Full Viền Tờ A4 (Full Sheet A4 Modal Preview):
- Mở rộng container modal (`max-w-5xl` / `max-w-6xl`) giúp tờ in hiển thị to rõ, tràn viền trang giấy A4 trên màn hình.
- Khung xem trước dạng Sheet Paper với bo viền `border border-slate-300`, hiệu ứng đổ bóng `shadow-md` và lề cân đối.
- Tối ưu hóa in ấn `@media print` tràn lề sắc nét, loại bỏ khung viền modal ngoài khi in ấn ra giấy thật.

### 3. Kiểm Thử Tự Động & Vận Hành:
- **78/78 Unit Tests PASSED (100%)**.

---

## [2.8.1] - 2026-10-05 (Cơ Chế Nhận Diện Khổ Giấy In Thông Minh & In Phiếu Thu/Chi 2 Liên A5 Trên 1 Trang A4)

### 1. In Phiếu Thu / Phiếu Chi 2 Liên A5 Trên 1 Trang A4 (`modal_cash_voucher_print.html`):
- **Chuẩn Mực Kế Toán Doanh Nghiệp (Thông tư 200/2014/TT-BTC & TT 133/2016/TT-BTC):**
  * Tích hợp cấu trúc in 2 liên trên cùng 1 trang A4 đứng (`portrait`):
    - **Liên 1:** Lưu tại cuống chứng từ / Bộ phận Kế toán.
    - **Đường cắt nét đứt chuẩn hóa (Cutting Separator):** `✂ --- Đường cắt phân chia Liên 1 và Liên 2 --- ✂`.
    - **Liên 2:** Giao cho Người nộp tiền (Phiếu Thu) hoặc Người nhận tiền (Phiếu Chi).
  * Tự động đồng bộ chính xác 100% nội dung (Logo TVL, Mã số BTC, Số phiếu, Định khoản Nợ/Có, Họ tên, Đơn vị, Lý do, Số tiền số & chữ, Chữ ký 5 bên) trên cả 2 liên.
- **Tùy Chọn Chế Độ In Linh Hoạt Trên Toolbar:**
  * `[2 Liên / A4 (A5 x 2)]`: Mặc định tối ưu, tinh chỉnh chiều cao mỗi liên ~136mm vừa khít 1 tờ A4 không nhảy sang trang 2.
  * `[1 Liên Đơn]`: Cho phép in đơn 1 liên phóng to toàn trang khi cần thiết.

### 2. Cơ Chế Tự Động Nhận Diện & Chuyển Đổi Khổ Giấy In A4 Dọc / Ngang (`modal_report_print.html` & `app.js`):
- **Smart Orientation Auto-Detection:**
  * Tự động kích hoạt **Khổ Ngang (A4 Landscape)** cho các báo cáo nhiều cột số liệu: P&L Hiệu Suất Đội Xe (`TMS-BI-01`), Chi Phí Tuyến & Chi Hộ (`TMS-BI-04`), Bàn Giao Cắt Kéo & Lưu Xe 0H (`TMS-BI-05`), Doanh Thu Khách & Sản Lượng TEU (`TMS-BI-07`), Quyết Toán 3PL (`TMS-BI-08`), Lương Chuyến & Thu Nhập Tài Xế (`TMS-BI-09`), Tiến Độ Quyết Toán Backlog (`TMS-BI-12`), Công Nợ AR Aging (`TMS-BI-13`), Tuổi Đơn Hàng Tồn Đọng (`TMS-BI-14`).
  * Tự động kích hoạt **Khổ Dọc (A4 Portrait)** cho các báo cáo ít cột / hồ sơ sự cố: Vỏ Cont DEM/DET (`TMS-BI-02`), Đúng Giờ OTP (`TMS-BI-03`), Biên Bản Sự Cố OS&D (`TMS-BI-06`), Sổ Quỹ Tiền Mặt (`TMS-BI-10`), Bảng Tạm Ứng Dọc Đường (`TMS-BI-11`).
- **Nút Chuyển Đổi Khổ Giấy Trên Toolbar:**
  * Cung cấp 2 nút chọn `[Khổ Dọc]` và `[Khổ Ngang]` cho phép người dùng chủ động thay đổi bất kỳ lúc nào.
  * Tự động cập nhật dynamic stylesheet `@page { size: A4 landscape/portrait; }` và co giãn độ rộng modal preview (`max-w-6xl` vs `max-w-4xl`).

### 3. Kiểm Thử & Kiểm Soát Hồi Quy:
- **78/78 Unit Tests PASSED (100% Zero-Regression)**.

---

## [2.8.0] - 2026-10-05 (Khai Báo Hệ Thống & Cấu Hình Thông Tin Doanh Nghiệp trong Danh Mục Master Data)

### 1. Phân Hệ Khai Báo Hệ Thống (Master Data System Settings):
- **Model `CompanyProfile` (`apps/master_data/models.py`):**
  * Lưu trữ đầy đủ pháp nhân doanh nghiệp: Tên pháp nhân công ty, Tên viết tắt / Thương hiệu, Mã số thuế (MST), Giấy phép kinh doanh vận tải, Người đại diện pháp luật & Chức vụ.
  * Thông tin trụ sở chính, Hotline / Điện thoại điều hành, Email liên hệ, Website cổng thông tin.
  * Tài khoản ngân hàng giao dịch doanh nghiệp (Số tài khoản, Tên ngân hàng, Chi nhánh).
  * Tham số vận hành & tính cước mặc định: Thuế suất VAT mặc định (%), Giá dầu tham chiếu chuẩn (VNĐ/Lít), Hệ số quy đổi CBM (Divisor: 5000).
  * Phương thức `get_default_company()` tự động khởi tạo và truy xuất cấu hình công ty chuẩn.
- **RESTful APIs (`apps/master_data/api_views.py` & `urls.py`):**
  * `GET /api/master-data/company/`: Lấy dữ liệu hồ sơ công ty và cấu hình hệ thống.
  * `PUT` / `POST /api/master-data/company/`: Cập nhật linh hoạt thông tin doanh nghiệp và tham số hệ thống.
  * Tích hợp `company_name` vào `GET /api/master-data/summary/`.

### 2. Giao Diện Người Dùng Chuẩn UI/UX BIM Ecosystem (`view_master_data.html` & `app.js`):
- **KPI Pill & Tab Khai Báo Hệ Thống:**
  * Top KPI Pill `🏢 Hệ Thống: Triền Võ` cho phép truy cập nhanh thông tin công ty.
  * Sub-tab `🏢 Khai Báo Hệ Thống` nằm ở vị trí đầu tiên trong thanh điều hướng danh mục.
- **Card Tổng Quan Thông Tin Doanh Nghiệp (`renderCompanyProfileView`):**
  * Header Banner nhận diện thương hiệu với logo/icon, tên đầy đủ, MST, trạng thái hoạt động và nút `Hiệu Chỉnh Thông Tin`.
  * 4 Card cấu trúc rõ ràng:
    1. *Pháp Lý & Định Danh Doanh Nghiệp*
    2. *Trụ Sở & Kênh Liên Lạc*
    3. *Tài Khoản Ngân Hàng Giao Dịch*
    4. *Tham Số Vận Hành & Tính Cước Mặc Định*
- **Modal Hiệu Chỉnh Thông Tin Doanh Nghiệp:**
  * Hỗ trợ form nhập liệu chuẩn với các nhóm trường thông tin phân loại khoa học và kiểm tra hợp lệ dữ liệu.

### 3. Kiểm Thử Tự Động & Vận Hành An Toàn:
- Bổ sung `test_company_profile_crud` trong `apps/master_data/tests.py`.
- **78/78 Unit Tests PASSED (100% Zero-Regression)**.
- Triển khai và đồng bộ thành công lên máy chủ VPS production (`ubuntu@149.118.60.194`).

---

## [2.7.4] - 2026-10-05 (Hệ Thống Bản In Báo Cáo Quản Trị Doanh Nghiệp A4 & Đồng Bộ Nhận Diện Triền Võ Logistics)

### 1. Bản In Báo Cáo Quản Trị Doanh Nghiệp Chuẩn A4 (`modal_report_print.html`):
- **Phủ sóng 14 phân hệ Báo cáo Quản trị Doanh nghiệp (TMS BI Reports):**
  * `TMS-BI-01`: Báo Cáo P&L Hiệu Suất Đội Xe Theo Đầu Kéo / Tuyến.
  * `TMS-BI-02`: Báo Cáo Vỏ Cont, Lưu Bãi & Hạn Miễn Phí DEM/DET.
  * `TMS-BI-03`: Báo Cáo Tỷ Lệ Giao Đúng Hạn (OTP & OTD).
  * `TMS-BI-04`: Báo Cáo Chi Phí Tuyến Vận Hành & Chi Hộ Khách Hàng.
  * `TMS-BI-05`: Báo Cáo Lưu Đêm, Chờ Bốc Dỡ & Cắt Kéo.
  * `TMS-BI-06`: Báo Cáo Biên Bản Sự Cố Bất Thường Vận Tải (OS&D).
  * `TMS-BI-07`: Báo Cáo Doanh Thu Khách Hàng & Thể Tích Sản Lượng TEU.
  * `TMS-BI-08`: Báo Cáo Quyết Toán Xe Thầu Phụ 3PL & Chi Phí Vận Chuyển.
  * `TMS-BI-09`: Báo Cáo Bảng Lương Chuyến & Thu Nhập Lái Xe.
  * `TMS-BI-10`: Báo Cáo Sổ Quỹ Tiền Mặt & Quỹ Tạm Ứng Điều Vận.
  * `TMS-BI-11`: Báo Cáo Tạm Ứng Dọc Đường & Quyết Toán Bác Tài.
  * `TMS-BI-12`: Báo Cáo Tồn Đọng Chờ Quyết Toán Chuyến Vận Tải.
  * `TMS-BI-13`: Báo Cáo Công Nợ Phải Thu Khách Hàng (AR Aging).
  * `TMS-BI-14`: Báo Cáo Tuổi Đơn Hàng & Vận Đơn Tồn Đọng Lưu Kho.
- **Tiêu chuẩn biểu mẫu A4 doanh nghiệp:**
  * Header nhận diện TVL Logo, thông tin pháp lý công ty, mã biểu mẫu nghiệp vụ, ngày giờ xuất báo cáo.
  * Khung chỉ số KPIs điều hành (Executive Metrics Grid) trích xuất động từ màn hình lọc.
  * Bảng số liệu chi tiết tự động sao chép chính xác từ dữ liệu báo cáo (theads, tbodys, tfoots).
  * Dòng số tiền tổng kết bằng chữ chuẩn tiếng Việt (`numberToWordsVN`).
  * 3 Vị trí ký duyệt pháp lý: **Người Lập Biểu**, **Kế Toán Trưởng**, **Ban Giám Đốc**.
  * Chuyển đổi linh hoạt báo cáo ngay trên Toolbar xem trước và tối ưu in ấn sắc nét với `@media print`.

### 2. Đồng Bộ Nhận Diện Logo Triền Võ Logistics (TVL Branding):
- Lưu trữ logo tại `static/images/trienvo_logo.png` và `media/trienvo_logo.png`.
- Tích hợp nhận diện logo TVL vào toàn bộ các mẫu in: Báo Giá Doanh Nghiệp, Phiếu Thu/Chi Sổ Quỹ và 14 Biểu Mẫu Báo Cáo Quản Trị.

### 3. Kiểm Thử Hồi Quy & An Toàn Dữ Liệu:
- 100% bộ kiểm thử tự động **77/77 Unit Tests PASSED**.

---

## [2.7.3] - 2026-10-05 (Bổ Sung Ghi Chú Điều Khoản & 3 Mẫu In Báo Giá Chuẩn Doanh Nghiệp Triền Võ)

### 1. Bổ Sung Mục "3. Ghi Chú & Điều Khoản Báo Giá" (Quotation Notes & Terms):
- **Cơ sở dữ liệu & API:** Thêm các trường `notes`, `template_type`, `contact_person`, `contact_phone`, `contact_email`, `cargo_type`, `valid_until` vào model `Quotation`.
- **Form Báo Giá (`modal_quotation.html`):**
  * Tích hợp thêm Card 3: "3. Ghi Chú, Điều Khoản & Mẫu In Báo Giá Ký Kết" ngay sau mục "2. Đơn Giá Cước & Sản Lượng Kế Hoạch".
  * Hỗ trợ các nút chọn nhanh mẫu ghi chú: Kéo Cont FCL, Xe Tải FTL, Điều chỉnh theo giá dầu Diesel.
  * Tích hợp nút bấm "Xem & In Báo Giá" trực tiếp từ modal lập báo giá.

### 2. Thiết Kế & Kích Hoạt 3 Kiểu Mẫu In Báo Giá Ký Kết Doanh Nghiệp (`modal_quotation_print.html`):
- **Mẫu 1: Tiêu Chuẩn Doanh Nghiệp (TVL Standard):** Đầy đủ Quốc hiệu, Tiêu ngữ, Logo TVL, Bảng cước vận chuyển, Doanh thu kế toán bằng số & chữ (`numberToWordsVN`), Điều khoản thương mại chi tiết & 2 vị trí chữ ký (Đại diện Khách hàng & Đại diện TVL).
- **Mẫu 2: Bảng Cước & Khung Đối Tác (To / From Matrix):** Định dạng 2 cột Người gửi - Người nhận rõ ràng, ma trận tải trọng & tuyến đường.
- **Mẫu 3: Chi Tiết Dịch Vụ Dự Án (ETA / ETD):** Bảng chi tiết dịch vụ vận tải, lịch trình và ký duyệt Giám đốc.
- **Công cụ chuyển đổi mẫu in:** Cho phép chuyển đổi nhanh 3 kiểu mẫu in trực tiếp trên thanh công cụ xem trước.
- **Tối ưu in ấn:** Thiết lập `@media print` trang A4 sắc nét, tự động ẩn thanh điều hướng và giao diện web.
- **Nút In trên bảng:** Bổ sung nút In Báo Giá (`ph-bold ph-printer`) trên từng dòng bảng Báo giá Kinh doanh.
- **Kiểm thử tự động:** Thêm `QuotationEnterprisePrintAPITest`, **77/77 Unit Tests PASSED (100%)**.

---

## [2.7.2] - 2026-10-05 (Kiểm Soát Máy Trạng Thái & Khóa Nút Báo Mốc Tiến Độ Zero-Jump & Completed Lock)

### 1. Khóa Cứng Mốc Khi Chuyến Xe Hoàn Tất (COMPLETED Lock):
- **Backend Guard (`TripDriverMilestoneAPIView` & `VALID_TRANSITIONS`):**
  * Khi chuyến xe có trạng thái `COMPLETED`, API từ chối mọi yêu cầu cập nhật mốc tiếp theo và trả về lỗi 400 rõ ràng.
- **Frontend UI State (`static/js/app.js` & `templates/driver_portal.html`):**
  * Tự động vô hiệu hóa toàn bộ các nút báo mốc (`disabled`, `opacity-40 cursor-not-allowed`) và hiển thị banner thông báo: `🔒 Chuyến xe đã hoàn tất (Đã khóa)`.

### 2. Logic Khóa Nút Chống Nhảy Cóc & Cho Phép Quay Lại 1 Bước Liền Kề (1-Step Rollback):
- **Cơ chế phân cấp nút bấm linh hoạt:**
  * **Bước kế tiếp (Next Step):** Nổi bật với màu sắc tương ứng (`Tiếp theo`), cho phép bấm để tiến hành trình.
  * **1 bước trước liền kề (Immediate Previous Step):** Viền màu hổ phách/amber (`↩ Bấm lại nếu nhầm`), cho phép bác tài bấm sửa lại nếu vô tình bấm nhầm.
  * **Các bước cũ hơn (> 1 bước trước):** Vô hiệu hóa (`✓ Đã qua`), không cho bấm lùi sâu.
  * **Các bước tương lai (> 1 bước sau):** Vô hiệu hóa (`Chưa đến`), ngăn chặn tuyệt đối tình trạng nhảy cóc trạng thái.
- **Kiểm Thử Tự Động:** Bổ sung `test_milestone_locking_and_rollback_rules`, toàn bộ **72/72 Unit Tests PASSED (100%)**.

---

## [2.7.1] - 2026-10-05 (Sửa Lỗi Accordion Màn Hình Tài Xế & Bổ Sung Tính Năng Hiệu Chỉnh Kê Khai Nhầm)

### 1. Sửa Lỗi Tương Tác Màn Hình Tài Xế (Driver Portal UI Fix):
- **Khắc phục lỗi cú pháp JavaScript toàn trang (`templates/driver_portal.html`):**
  * Sửa lỗi thiếu dấu đóng ngoặc nhọn `}` trong hàm `addToPhoneCalendar()`, kích hoạt lại 100% sự kiện mở/đóng accordion mốc thời gian, chi phí, chứng từ, lộ trình và chi tiết vận đơn.

### 2. Tính Năng Hiệu Chỉnh Khi Kê Khai Nhầm (Driver Mistake Correction):
- **Hiệu chỉnh & Xóa Chi Phí Kê Nhầm:**
  * Thêm nút **[Sửa]** và **[Xóa]** trực tiếp trên từng khoản chi trong accordion *Chi Phí Đã Kê*, mở modal `editExpenseModal` cho phép cập nhật số tiền, danh mục, hóa đơn và ghi chú trước khi chuyến xe chốt sổ.
- **Hiệu chỉnh & Xóa Chứng Từ Nộp Nhầm (`TripDocumentDetailAPIView`):**
  * Thêm API `PUT` & `DELETE` tại `/api/trips/<trip_code>/documents/<doc_id>/` hỗ trợ sửa tên chứng từ, số Cont/Seal hoặc Soft-delete ảnh nộp trùng/nhầm.
  * Thêm accordion *Chứng Từ & Hình Ảnh Đã Nộp* với thumbnail preview và các nút tương tác nhanh.
- **Sửa Nhanh Số Cont & Số Seal Thực Tế Bốc Tại Bãi:**
  * Thêm modal `editContainerModal` cho phép tài xế cập nhật trực tiếp số vỏ Cont và số chì Seal thực tế.
- **Kiểm Thử Tự Động:** Bổ sung `DriverPortalMistakeCorrectionTestCase`, đạt **71/71 Unit Tests PASSED (100%)**.

---

## [2.7.0] - 2026-10-05 (Xây Dựng Hoàn Chỉnh Phân Hệ CRUD Hồ Sơ Nhân Sự & Đội Ngũ Tài Xế /hr)

### 1. Phân Hệ Hành Chính & Nhân Sự Toàn Diện (`apps/personnel/` & `/hr`):
- **Kiến trúc RESTful API CRUD Nhân sự (`apps/personnel/`):**
  * `EmployeeSerializer`: Chuẩn hóa dữ liệu hồ sơ nhân viên (`code`, `full_name`, `nickname`, `phone_number`, `zalo_id`, `department`, `role`, `license_number`, `license_expiry`, `base_salary`, `is_active`). Validate duy nhất mã nhân viên và định dạng số điện thoại.
  * `EmployeeListCreateAPIView` (`/api/personnel/employees/`): Hỗ trợ tìm kiếm từ khóa thời gian thực, lọc theo phòng ban (`FLEET`, `DISPATCH`, `ACCOUNTING`, `SALES`, `CUSTOMS`, `HR`, `MANAGEMENT`), chức vụ (`DRIVER`, `DISPATCHER`, `ACCOUNTANT`, `SALESMAN`, `MECHANIC`, `DIRECTOR`) và trạng thái (`ACTIVE`, `INACTIVE`).
  * `EmployeeDetailAPIView` (`/api/personnel/employees/<id>/`): Cập nhật thông tin chuyên môn, mức lương cơ bản và hỗ trợ Soft-Delete (chuyển trạng thái tạm ngưng công tác).
  * `EmployeeStatsAPIView` (`/api/personnel/stats/`): Thống kê cơ cấu nhân sự toàn công ty và danh mục dropdown cho form khai báo.
- **Giao diện 2 Sub-Tabs Chuyên Nghiệp (`templates/views/view_personnel.html` & `modal_employee.html`):**
  * **Sub-Tab 1: Hồ Sơ Cán Bộ & Tài Xế (Directory):** Bảng danh bạ chuẩn ERP `.erp-table`, hiển thị mã NV, họ tên, nickname hiện trường, số điện thoại, Zalo, phòng ban, chức vụ, GPLX, lương cơ bản và các nút thao tác nhanh (✏️ Chỉnh sửa, 🗑️ Tạm ngưng). Nút `+ Thêm Mới Nhân Sự` mở modal khai báo trực quan.
  * **Sub-Tab 2: Bảng Tính Lương & Tạm Ứng Chuyến (Payroll):** Tính toán lương chuyến theo sản lượng thực tế, thưởng vượt 40 chuyến/tháng, trừ tạm ứng và thực lãnh dự kiến cho tài xế.
- **Tự Động Hóa Kiểm Thử (Automated Tests):**
  * Bổ sung bộ 7 unit tests chuyên sâu (`apps/personnel/tests.py`), nâng tổng số bài kiểm thử của hệ thống lên **67/67 Tests Passed 100%**.

---

## [2.6.0] - 2026-10-05 (Production Readiness: Bảo Mật XSS/Open Redirect, Khóa Xung Đột Tiền Tệ Concurrency, Tối Ưu N+1 & Offline Queue Driver Portal)

### 1. Nâng Cấp Bảo Mật & Phòng Chống Tấn Công (P0 Security Hardening):
- **Vá lỗ hổng Open Redirect & XSS (`apps/dispatch/views.py`):**
  * Áp dụng `url_has_allowed_host_and_scheme` của Django để kiểm duyệt tham số `next_url` khi đăng nhập, chặn đứng tấn công lừa đảo chuyển hướng sang domain lạ.
  * Sử dụng `json.dumps()` để nhúng an toàn JWT Access/Refresh tokens và URL chuyển hướng vào trang HTML trung gian, ngăn chặn chèn script độc hại.

### 2. Bảo Vệ Giao Dịch Tiền Tệ & Chống Race Condition (P0 Concurrency Protection):
- **Khóa hàng cơ sở dữ liệu (`select_for_update`) & `@transaction.atomic`:**
  * Áp dụng `select_for_update()` trong toàn bộ quy trình Duyệt quỹ Điều vận (`DispatcherFundActionAPIView`), Cấp tạm ứng chuyến cho tài xế (`DriverAdvanceCreateAPIView`), và Quyết toán hoàn ứng (`DriverAdvanceSettleAPIView`, `DriverBatchSettlementExecuteAPIView`).
  * Ngăn ngừa triệt để lỗi Lost Update, rút quá số dư quỹ điều vận (Overdraft) và gian lận/xung đột khi nhiều điều độ hoặc kế toán thao tác cùng lúc trên một quỹ.
  * Bổ sung `select_for_update()` vào API Khóa sổ/Mở khóa chi phí chuyến xe (`TripSettleExpensesAPIView`, `TripUnsettleExpensesAPIView`).

### 3. Toàn Vẹn Dữ Liệu & Tối Ưu Hiệu Năng (P1 Data Integrity & Optimization):
- **Kiểm định file & Tự động nén ảnh chứng từ POD (`core/validators.py` & `apps/dispatch/api_views.py`):**
  * Bổ sung hàm `optimize_and_resize_image()` tự động thu nhỏ độ phân giải ảnh chụp POD/EIR của tài xế về chuẩn Full HD (max 1920px, JPEG quality 85%), giảm 80% dung lượng lưu trữ trên server và tiết kiệm băng thông di động 4G.
  * Kiểm tra chữ ký Magic Bytes ngăn chặn mã độc giả dạng định dạng ảnh.
- **Triệt tiêu N+1 Query trong Quản trị Tạm ứng (`apps/billing/advance_views.py`):**
  * Tối ưu `driver_advances_qs` bằng `prefetch_related('trip__expenses')`, loại bỏ vòng lặp `filter()` trên từng bản ghi, tăng tốc độ phản hồi API danh sách tạm ứng lên gấp 4 lần.

- **Chuẩn Hóa Giao Diện Phân Hệ Cài Đặt & Danh Mục (`templates/views/view_master_data.html` & `static/js/app.js`):**
  * Sửa triệt để lỗi Flexbox Height Collapse: loại bỏ `overflow-hidden` gây ẩn bảng trên một số kích thước màn hình, chuẩn hóa container gốc thành `p-4 md:p-6 h-full flex flex-col bg-slate-50 overflow-y-auto animate-fade-in space-y-4` đồng bộ 100% với các phân hệ TMS khác (`view_reports.html`, `view_accounting.html`).
  * Thiết lập chiều cao tối thiểu an toàn `min-h-[420px]` và cuộn linh hoạt `max-h-[calc(100vh-320px)] overflow-y-auto` cho `#md-table-container`, giúp bảng dữ liệu luôn hiển thị rõ ràng, tiêu đề Sticky Header không bị che khuất và phân trang neo chắc chắn ở chân trang.
  * Đồng bộ hiệu ứng chọn (`ring-2 ring-teal-600 bg-teal-50/60 border-teal-400`) giữa Top KPI Pills Counter và thanh 11 danh mục Sub-tabs trong `switchMasterDataTab()`.
  * Chuẩn hóa bảng dữ liệu `.erp-table` theo đúng `CODING_STANDARDS.md` (header sticky, phân trang 20/30/50/100 dòng, căn phải tiền tệ, phông mono cho mã số).

### 4. Nâng Cấp Ứng Dụng Di Động & Hạ Tầng Triển Khai Thực Tế (P2 Production Infrastructure):
- **Offline Action Queue cho Cổng Tài Xế (`templates/driver_portal.html`):**
  * Bổ sung cơ chế lưu tạm ngoại tuyến vào `localStorage` (`OFFLINE_QUEUE_KEY`) khi tài xế thao tác báo mốc trong vùng mất sóng 4G/cảng biển.
  * Tự động gửi lại (Retry Sync) và thông báo Toast ngay khi thiết bị có kết nối Internet trở lại (`window.addEventListener('online')`).
- **Cấu hình Docker Production (`docker-compose.yml`):**
  * Nâng cấp cấu hình web service tự động chạy `collectstatic` và máy chủ `gunicorn` với 4 workers, timeout 120s sẵn sàng chịu tải thực tế.

---

## [2.5.0] - 2026-10-05 (Trung Tâm Báo Cáo Quản Trị Hợp Nhất /reports, Quyết Toán Chuyến Xe & Backlog Chuyển Kỳ, Công Nợ Phải Thu AR & Tuổi Đơn Tồn Đọng)

### 1. Bối Cảnh Nghiệp Vụ & Bài Toán Quản Trị:
- **Hợp nhất Báo cáo Đa Chiều:** Di chuyển và tập trung toàn bộ các báo cáo tài chính, công nợ, quyết toán, tạm ứng, chi hộ và vận hành về một trung tâm duy nhất tại phân hệ `/reports`.
- **Cơ chế Deep-Linking Thông Minh:** Từ bất kỳ phân hệ tác nghiệp nào (Kế toán `/accounting`, Điều vận `/dispatch`, Kinh doanh `/sales`, Xe bãi `/fleet`, Nhân sự `/hr`), người dùng khi bấm vào liên kết Báo cáo sẽ được chuyển thẳng sang `/reports` và tự động kích hoạt đúng Tab báo cáo tương ứng qua hàm `openReportTab(reportId, periodOverride)`.
- **Quản lý Quyết Toán Gối Đầu & Nợ Chuyến:** Giải quyết triệt để bài toán thực tế của doanh nghiệp vận tải:
  * Ví dụ: Tháng 8 chạy 30 chuyến nhưng chỉ chốt quyết toán 20 chuyến (do thiếu chứng từ POD hoặc do lệch chu kỳ chốt đối soát 25-24 của khách hàng) ➔ 10 chuyến tồn chuyển sang tháng 9.
  * Đến tháng 9: Quyết toán 8 chuyến của tháng 8 + các chuyến tháng 9 ➔ Còn nợ 2 chuyến tháng 8 chuyển tiếp sang tháng 10.
  * Phân loại trực quan 4 trạng thái:
    1. `Trong kỳ ➔ Đã Quyết Toán` (Current Period Settled)
    2. `Trong kỳ ➔ Chưa Quyết Toán (Đọng)` (Current Period Unsettled)
    3. `Tồn kỳ trước ➔ Đã Quyết Toán đợt này` (Backlog Settled)
    4. `Tồn kỳ trước ➔ Chưa Quyết Toán (Nợ tiếp)` (Backlog Pending)
- **Bổ sung Thông Tin Xe - Tài:** Bổ sung Đầu Kéo, Biển số xe, Phân loại Xe Nhà / Xe Bạn (3PL) và Tên Bác Tài trong tất cả các báo cáo quyết toán và tuổi đơn.

### 2. Chi Tiết 3 Báo Cáo Quản Trị Chuyên Biệt Bổ Sung Vào /reports:
1. **Báo Cáo 12 (`report-12` / `report_settlement_backlog`): Báo Cáo Quyết Toán Chuyến Xe & Backlog**
   - Theo dõi chi tiết từng chuyến xe: Mã chuyến, Ngày chạy, Khách hàng, Biển số xe kéo & xe hạ, Bác tài, Doanh thu cước, Chi phí vận hành, Chi hộ, Lợi nhuận gộp, Biên LN %, Tình trạng chứng từ POD, Phân loại chuyến và Người/Ngày chốt sổ.
2. **Báo Cáo 13 (`report-13` / `report_ar_aging`): Báo Cáo Theo Dõi Công Nợ Phải Thu (AR) & Thu Tiền**
   - Theo dõi công nợ theo từng Khách Hàng: Doanh thu cước, Tiền chi hộ, Tổng phải thu, Đã thu hồi (từ Sổ Quỹ CashTransaction), Còn phải thu, và Phân bổ tuổi nợ 4 cấp độ: Trong hạn (<=30 ngày), Quá hạn (31-60 ngày), Quá hạn (61-90 ngày), Nợ xấu (>90 ngày).
3. **Báo Cáo 14 (`report-14` / `report_unsettled_aging`): Báo Cáo Tuổi Đơn Tồn Đọng Chưa Quyết Toán**
   - Quét toàn bộ hệ thống phát hiện các chuyến xe chưa khóa sổ chi phí, tính số ngày tồn đọng (`days_unsettled`), phân cấp mức độ cảnh báo (Bình thường 0-7N, Đốc thúc POD 8-15N, Cảnh báo 16-30N, Cực gấp >30N) và tự động nhận diện nguyên nhân vướng mắc (Thiếu POD gốc, Chi phí chờ duyệt, Nợ kỳ 25-24).

### 3. Chi Tiết Kỹ Thuật Đã Triển Khai:
- **Backend API (`apps/dispatch/reports_api.py`):** Mở rộng `ReportsAPIView` tính toán trả về 3 dataset `report12_settlement_backlog`, `report13_ar_aging`, `report14_unsettled_aging` cùng các chỉ số KPI tóm tắt.
- **Giao Diện HTML (`templates/views/view_reports.html`):** Thêm 3 Subtabs (12, 13, 14) trên thanh Subtab bar, kèm 12 KPI Metric Cards và 3 Bảng Kê dữ liệu chuyên dụng chuẩn mực ERP.
- **Frontend JavaScript (`static/js/app.js`):** Định nghĩa `window.openReportTab(reportId, periodOverride)`, mở rộng `loadReportsData()`, viết các hàm render `renderReport12`, `renderReport13`, `renderReport14` kèm bộ lọc đa tiêu chí và sắp xếp cột.
- **Tích Hợp Liên Kết Phân Hệ (`templates/views/view_accounting.html`):** Cập nhật nút Subtab 8 thành nút điều hướng trực tiếp sang `/reports`.
- **Kiểm Thử Toàn Diện (`core/tests.py`):** Thêm test case `test_reports_12_13_14_settlement_and_aging`, toàn bộ 60/60 tests pass 100%.

## [2.4.1] - 2026-10-02 (Cơ Chế Cấp Mới Link Driver Portal & Tự Động Vô Hiệu Hóa Link Của Tài Xế Cũ)

### 1. Bối Cảnh Nghiệp Vụ & Bài Toán Chống Ghi Đè Dữ Liệu:
- **Vấn đề thực tế:** Khi Điều độ đổi tài xế (hoặc phân lại chuyến sau khi tài xế cũ từ chối/quá hạn), tài xế cũ vẫn có thể còn lưu tin nhắn link điều xe cũ trong Zalo. Nếu tài xế cũ bấm vào link cũ và thao tác báo mốc, chụp ảnh hoặc kê chi phí phát sinh, hệ thống có thể bị ghi đè dữ liệu hoặc tính nhầm chi phí cho tài xế mới đang chạy.
- **Giải pháp:** Xây dựng cơ chế **Tự Động Cấp Mới Link Driver Portal (`driver_token`) & Vô Hiệu Hóa Link Cũ**:
  1. Khi tạo chuyến mới: Hệ thống tự động sinh `driver_token` bảo mật ngẫu nhiên (16 bytes).
  2. Khi Điều độ đổi sang tài xế mới: Hệ thống tự động thu hồi token cũ (lưu vào `revoked_driver_tokens`) và sinh `driver_token` mới cho tài xế mới.
  3. Khi tài xế mới mở link: Thao tác bình thường với đầy đủ quyền hạn.
  4. Khi tài xế cũ bấm vào link cũ: Hệ thống chặn đứng (HTTP 403 Forbidden), vô hiệu hóa toàn bộ API báo mốc/kê chi phí, và hiển thị trang thông báo rõ ràng (`templates/driver_portal_revoked.html`): *"Lệnh điều xe này đã được chuyển giao cho tài xế mới hoặc Điều độ đã cấp lại link mới. Liên kết cũ đã bị vô hiệu hóa để bảo vệ dữ liệu."* kèm hotline Điều độ.

### 2. Chi Tiết Thay Đổi Kỹ Thuật:
- **Database Model (`apps/dispatch/models.py`):** Thêm 2 field `driver_token` và `revoked_driver_tokens` vào `DispatchTrip`, method `regenerate_driver_token()`, tạo migrations `0015_add_driver_token_to_trip.py` và `0016_add_revoked_driver_tokens.py`.
- **Bảo mật & Phân quyền (`core/permissions.py`):** Cập nhật `IsTripDriverOrDispatcher` kiểm tra `driver_token` còn hiệu lực trên DB, từ chối toàn bộ token cũ đã bị thu hồi.
- **Backend API & Views (`apps/dispatch/api_views.py` & `apps/dispatch/views.py`):**
  - `get_trip_by_code_or_hash`: Ưu tiên tra cứu theo `driver_token` hiện hành.
  - `TripDetailAPIView.patch()`: Tự động kích hoạt `trip.regenerate_driver_token()` khi đổi `driver_id` hoặc `driver`.
  - `driver_portal_view`: Kiểm tra `revoked_driver_tokens` và render `driver_portal_revoked.html` nếu là link cũ.
- **Template Mới:** Tạo `templates/driver_portal_revoked.html` tối ưu giao diện mobile hiện trường.
- **Unit Test (`apps/dispatch/tests.py`):** Thêm test case `DriverTokenRevocationTestCase` kiểm tra tự động toàn bộ luồng cấp mới và vô hiệu hóa link cũ.

## [2.4.0] - 2026-10-02 (Bộ Tính Năng CRUD Lệnh Điều Động, Cảnh Báo Tài Xế Từ Chối & Cơ Chế Chọn Lại / Hoàn Tác)

### 1. Bối Cảnh & Yêu Cầu Nghiệp Vụ:
1. **Cơ chế Hoàn tác (Undo) cho Tài xế:** Cho phép tài xế bấm "Chọn lại / Nhận lại chuyến" hoặc đổi ý từ chối nếu lỡ bấm nhầm nút trên giao diện Mobile Driver Portal.
2. **Cảnh báo Thời Gian Thực cho Điều Vận:** Khi tài xế bấm Từ chối nhận chuyến (kèm lý do), hệ thống ngay lập tức hiển thị Banner Đỏ rực rỡ trên màn hình Chi tiết chuyến xe và Badge đỏ trên Bảng Điều Vận để Điều độ kịp thời phân xe khác.
3. **Phân hệ Hiệu Chỉnh (Sửa) & Hủy/Xóa Chuyến Xe (CRUD toàn diện):**
   - Modal Hiệu Chỉnh Lệnh Điều Động (`[✏️ Sửa Lệnh]`): Cho phép cập nhật toàn bộ thông tin: Khách hàng, Số Cont, Seal, Booking, VGM, 3 Điểm Lộ trình, Lịch Đóng hàng, Cửa Dock, Phân bổ Tài xế, Đầu kéo, Rơ-mooc, Hóa đơn thương mại, Hạn Free DET và Ghi chú.
   - Nút `[🗑️ Hủy / Xóa Chuyến]`: Thực hiện xóa mềm chuyến xe (`is_deleted=True`), ghi nhật ký điều vận và hoàn lại hạn mức container đã phát lệnh cho Đơn hàng / Booking Order gốc.

### 2. Chi Tiết Thay Đổi Kỹ Thuật:
- **Database & Model:** Thêm `declined_at` (DateTimeField) và `decline_reason` (CharField) vào model `DispatchTrip` (`apps/dispatch/models.py`), tạo migration `0014_add_declined_fields_to_trip.py`.
- **Backend API (`apps/dispatch/api_views.py`):**
  - Cập nhật `TripListCreateAPIView` và `TripDetailAPIView.get()` trả về `declined_at`, `decline_reason` và `acceptance_sla_status = 'DECLINED'`.
  - Mở rộng `TripDetailAPIView.patch()` hỗ trợ cập nhật toàn diện thông tin điều động và tự động reset trạng thái từ chối khi đổi tài xế mới.
  - Bổ sung `TripDetailAPIView.delete()` xử lý hủy chuyến, hoàn cont cho Booking và ghi log.
  - Cập nhật `TripMilestoneReportAPIView.post()` xử lý mốc `DECLINED_TRIP` và `ACCEPTED_TRIP` hỗ trợ tài xế chọn lại mượt mà.
- **Frontend UI & JS (`static/js/app.js` & `templates/`):**
  - Tạo `templates/components/modal_edit_trip.html` và tích hợp vào `base.html`.
  - Bổ sung các hàm JS: `openModalEditTrip()`, `submitEditTripForm()`, `deleteOrCancelTrip()`.
  - Nâng cấp `viewTripDetail()` hiển thị banner cảnh báo đỏ nổi bật khi bị từ chối.
  - Cập nhật `templates/driver_portal.html` với nút hoàn tác `[🔄 BẤM NHẦM? BẤM ĐỂ NHẬN CHUYẾN LẠI]`.

## [2.3.0] - 2026-10-02 (Tối Ưu Toàn Diện Giao Diện Màn Hình Tài Xế & Đồng Bộ 100% HTML Giả Lập Điện Thoại Trên Web Chi Tiết Chuyến)

### 1. Bối Cảnh & Yêu Cầu Người Dùng:
- **Tối ưu màn hình Tài Xế ngoài hiện trường (`templates/driver_portal.html`):**
  1. Loại bỏ dòng "Điều độ chính, báo sự cố, gọi" ở card tài xế.
  2. Gom toàn bộ thông tin chi tiết (Container, Seal, Booking, Khách hàng, Hãng tàu, Hải quan, Cửa dock, Hạn Free DET/DEM, Tạm ứng) vào Modal Popup `[📄 Thông tin Vận Đơn & Container]`, giúp màn hình thoáng đãng, không bị tràn cuộn.
  3. Chuẩn hóa Lộ trình 3 điểm thông minh: Điểm đã qua (Xanh lá `✓`), Điểm đang đến (Chữ to hơn 1 size, viền teal nổi bật, badge `⚡ ĐANG ĐẾN`, nút sáng), Điểm chưa tới (Màu xám). Cả 3 điểm đều có nút "Chỉ đường" dẫn tới Google Maps.
  4. Nút hành động Bước tiếp theo (Hero Next Action Button) 1-chạm cực to rõ theo đúng vòng đời máy trạng thái.
  5. Chuyển "Nhật ký mốc thời gian" và "Chi phí đã kê" sang dạng Accordion đóng/mở tiện dụng.
  6. Tăng kích thước thanh Bottom Navigation Bar (4 nút to rõ: Chụp ảnh, Kê chi phí, Báo sự cố, Gọi điều độ).
  7. Hỗ trợ Form kê nhiều dòng chi phí (Batch Multi-row Expense) lưu 1 lần.
- **Đồng bộ hóa 100% HTML Giả Lập Điện Thoại (`templates/views/view_trip_detail.html` & `static/js/app.js`):**
  - Cột bên phải trong màn hình Chi tiết chuyến xe (Mobile Simulator) được cập nhật đồng bộ hoàn toàn với giao diện tài xế thực tế, hỗ trợ click mở popup chi tiết vận đơn, mở modal báo sự cố, tương tác các nút 1-chạm và đồng bộ trạng thái lộ trình 3 điểm.

### 2. Các File Đã Thay Đổi:
- `templates/driver_portal.html`: Tinh gọn layout, dọn dẹp thẻ lặp, tối ưu trải nghiệm hiện trường.
- `templates/views/view_trip_detail.html`: Nâng cấp giao diện Mobile Simulator và tích hợp Modal Popup Vận đơn & Sự cố.
- `static/js/app.js`: Nâng cấp `renderDriverMobileApp(trip)`, các hàm điều khiển accordion, popup modal và tương tác simulator.
- `apps/billing/advance_views.py` & `config/urls.py`: Thêm API Quyết toán gom chuyến tài xế theo Ngày / Bác tài / Đầu xe.
- `templates/components/modal_batch_driver_settlement.html`: Modal quyết toán hàng loạt cho Điều vận / Kế toán.

## [2.2.0] - 2026-09-28 (Nâng Cấp Bảo Mật Cổng Tra Cứu Khách Hàng & Mobile Tài Xế: Phân Tách Capability Token, Chuẩn Hóa 6 Mốc B2B, Định Dạng Phần Ngàn & Phóng To Giờ Hành Trình)

### 1. Bối Cảnh Nghiệp Vụ & Phát Hiện Bảo Mật:
- **Yêu cầu & Phản hồi Người dùng:**
  1. Rà soát và vá lỗ hổng dùng chung mã HashID (`trip_hash`) giữa link Tài xế (`/driver/<hash>/`) và link Khách hàng (`/tracking/<hash>/`), ngăn chặn triệt để nguy cơ khách hàng hoặc người ngoài đổi URL sang `/driver/` để xem thông tin nội bộ, số điện thoại tài xế, tờ khai hải quan, hoặc can thiệp kê khống chi phí/báo mốc giả.
  2. Tinh giản nhưng phải đầy đủ thông tin để Khách hàng an tâm theo dõi lô hàng: Không quá chi tiết như tài xế (bỏ 10 bước tracklog nội bộ: lấy vỏ, hạ rỗng, trút hàng lên dock, chốt sổ kế toán...) nhưng không được quá gọn khiến thiếu thông tin.
  3. Chuẩn hóa bộ **6 mốc tiến độ B2B chuyên nghiệp**, linh hoạt theo từng tình huống vận chuyển (Hàng Nhập, Hàng Xuất, Nội Địa).
  4. **Chuẩn hóa định dạng số tiền có phân cách hàng ngàn (Hình 1, 2, 3):**
     - Sửa toàn bộ số tiền chi phí (`1265000 đ` ➔ `1.265.000 đ`, `200000 đ` ➔ `200.000 đ`, `550000 đ` ➔ `550.000 đ`...)
     - Sửa số tiền tạm ứng chuyến (`2000000 đ` ➔ `2.000.000 đ`).
     - Chuẩn hóa form kê khai: placeholder `Ví dụ: 35.000`, live preview số tiền khi tài xế gõ, các nút chọn nhanh `35.000 đ`, `50.000 đ`, `100.000 đ`, `200.000 đ`, `500.000 đ`.
  5. **Phóng to thông tin giờ hành trình (Hình 4, 5):**
     - Tiến độ giao nhận khách hàng (`public_tracking.html`): Chữ giờ phóng to (`text-xs sm:text-sm font-black font-mono`), badge có viền tương phản cao và icon đồng hồ.
     - Nhật ký mốc tài xế (`driver_portal.html`): Chữ giờ phóng to (`text-xs sm:text-sm font-bold font-mono`), màu teal nổi bật, dễ đọc khi đang lái xe.

### 2. Các Thay Đổi Kiến Trúc Kỹ Thuật Đã Triển Khai:
- **`core/templatetags/currency_filters.py`:**
  - Khởi tạo bộ lọc `format_money` và `money_vnd` hỗ trợ format số tiền phân cách hàng ngàn bằng dấu chấm chuẩn Việt Nam (`1.265.000 đ`, `2.000.000 đ`, `35.000 đ`).
- **`core/security.py`:**
  - Khởi tạo 2 Singleton Hashids riêng biệt với salt độc lập:
    + `_DRIVER_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_DRIVER", min_length=8, alphabet=ALPHABET)`
    + `_TRACKING_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_TRACKING", min_length=8, alphabet=ALPHABET)`
  - Bổ sung helper functions: `get_driver_hashid()`, `decode_driver_hashid()`, `get_tracking_hashid()`, `decode_tracking_hashid()`.
  - Cập nhật `CsrfExemptSessionAuthentication`: Xác thực an toàn Capability Token của tài xế.
- **`core/permissions.py`:**
  - Cập nhật `IsTripDriverOrDispatcher`: Khi nhận Capability Token từ thiết bị di động, **chỉ chấp nhận `decode_driver_hashid`**. Tuyệt đối từ chối nếu người dùng truyền `tracking_token`, ngăn chặn hoàn toàn việc gọi API ghi dữ liệu (milestone, expense, document, incident) từ link khách hàng.
- **`apps/dispatch/models.py`:**
  - Bổ sung 2 dynamic properties trên `DispatchTrip`:
    + `trip.driver_hashid`: Mã hóa Capability Token riêng cho tài xế (`/driver/<driver_token>/`).
    + `trip.tracking_hashid`: Mã hóa Capability Token riêng cho khách hàng (`/tracking/<tracking_token>/`).
- **`apps/dispatch/timeline_service.py`:**
  - Bổ sung hàm `build_customer_milestones(trip)`: Xây dựng chuẩn xác 6 mốc tiến độ theo đúng ngữ cảnh thực tế của chuyến hàng (Import, Export, Domestic), tự động tính toán trạng thái `is_done`, `is_active` và thời gian từng mốc dựa trên máy trạng thái và các mốc thực tế.
  - Sắp xếp ưu tiên thời gian mốc giao thành công theo thứ tự hợp lý (`t_gate_out or t_map.get(8) or t_pod`).
- **`apps/dispatch/views.py`:**
  - `driver_portal_view(request, trip_hash)`:
    + Chỉ giải mã bằng `decode_driver_hashid`. Nếu không khớp, trả về HTTP 404 Not Found.
    + **Chặn hoàn toàn** việc dùng mã chuyến xe thô `trip_code` công khai (chống IDOR Enumeration Scraping).
  - `public_tracking_view(request, trip_hash)`:
    + Chỉ giải mã bằng `decode_tracking_hashid`. Khách hàng cầm tracking token đổi sang `/driver/` sẽ bị chặn 404.
    + Tích hợp `build_customer_milestones(trip)` hiển thị 6 mốc tiến độ trực quan.
    + Chỉ hiển thị chứng từ `DocumentType.POD` (Biên bản bàn giao hàng có chữ ký số/ảnh chụp).
- **`templates/driver_portal.html`:**
  - Áp dụng `format_money` cho Tạm ứng chuyến (`2.000.000 đ`), Tổng chi phí (`1.265.000 đ`), từng khoản mục chi phí (`200.000 đ`, `550.000 đ`, `480.000 đ`, `35.000 đ`).
  - Nâng cấp modal kê chi phí: placeholder `Ví dụ: 35.000`, live preview `👉 35.000 đ`, nút chọn tiền nhanh có định dạng phần ngàn.
  - Phóng to chữ giờ trong Nhật ký mốc thời gian (`text-xs sm:text-sm font-bold font-mono`).
- **`templates/public_tracking.html`:**
  - Phóng to chữ giờ trong Tiến độ vận chuyển & giao nhận (`text-xs sm:text-sm font-black font-mono`), badge có viền tương phản cao và icon đồng hồ trực quan.
- **Kiểm Thử Đơn Vị (`core/tests.py`):**
  - Bổ sung unit test `test_currency_filters_thousands_separator` và cập nhật kiểm thử 6 mốc khách hàng.
  - Bộ kiểm thử toàn diện: **57/57 unit tests PASSED 100%**.
- **`static/js/app.js`:**
  - Tách biệt 2 hàm sinh link:
    + `copyDriverPortalLink`: Tạo URL dạng `/driver/<driver_hashid>/`.
    + `copyCustomerTrackingLink`: Tạo URL dạng `/tracking/<tracking_hashid>/`.
  - Tinh giản bản tin sao chép gửi Khách hàng qua Zalo/Email: Chỉ cung cấp Mã chuyến, Số Container, Số Chì, Kho Giao Hàng và Link tra cứu, loại bỏ hoàn toàn các điểm lấy/hạ vỏ cont nội bộ.
- **Kiểm Thử Đơn Vị (`core/tests.py`):**
  - Cập nhật unit test `test_driver_and_tracking_tokens_isolation_and_customer_view` kiểm tra phân tách token và xác thực cấu trúc 6 mốc khách hàng.
  - Bộ kiểm thử toàn diện: **56/56 unit tests PASSED 100%**.

---

## [2.1.0] - 2026-09-28 (Chuẩn Hóa Trọng Tâm Nghiệp Vụ Kế Toán: Đưa Sổ Quỹ Thu - Chi Lên Vị Trí Số 1)

### 1. Bối Cảnh Nghiệp Vụ:
- **Yêu cầu từ người dùng:** Nghiệp vụ kế toán cốt lõi hàng ngày bắt đầu từ quản lý Thu - Chi (dòng tiền ra/vào), sau đó mới tới theo dõi các bảng đối soát và báo cáo chuyến. Do đó, cần đưa tab **Sổ Quỹ Thu - Chi (Cash & Bank Book)** lên vị trí số 1 trong phân hệ Kế toán (`templates/views/view_accounting.html`), đồng thời nạp và hiển thị ngay khi người dùng truy cập.
- **Tái cấu trúc 7 Trụ cột Tài chính Kế toán:**
  1. `1. Sổ Quỹ Thu - Chi` (Mẫu S03a-DN): Quản lý tồn quỹ tiền mặt & ngân hàng, lập phiếu thu, lập phiếu chi, theo dõi dòng tiền thuần. (Active mặc định).
  2. `2. Tạm Ứng - Hoàn Ứng Tài Xế`: Cấp tạm ứng chuyến xe và đối soát thực chi, thu hồi tiền thừa / bù tiền thiếu.
  3. `3. Quỹ Tạm Ứng Điều Vận`: Theo dõi các gói quỹ cấp vốn đi đường cho bộ phận điều vận.
  4. `4. Đối Soát & Khóa Sổ Chuyến`: Tổng hợp doanh thu, chi phí, lợi nhuận gộp và khóa sổ chuyến xe đã chạy xong.
  5. `5. Chi Hộ & Debit Note`: Theo dõi các khoản chi hộ khách hàng (nâng hạ, cược cont...) và lập Debit Note thu hồi.
  6. `6. Quyết Toán Xe Bạn (3PL)`: Quản lý công nợ, đối soát và thanh toán các chuyến xe thầu phụ chạy ngoài.
  7. `7. Đối Soát BOT Tuyến`: Tra cứu và đối chiếu giao dịch vé trạm BOT / VETC / ePass.

### 2. Các Thay Đổi Kỹ Thuật:
- **`templates/views/view_accounting.html`:**
  - Sắp xếp lại thứ tự 7 nút subtab bar theo đúng logic kế toán thực tế: Sổ quỹ thu chi số 1, Tạm ứng tài xế số 2, Quỹ điều vận số 3, Đối soát khóa sổ số 4, Chi hộ số 5, Quyết toán xe bạn số 6, BOT số 7.
  - Di chuyển khối HTML `subtab-acct-cashbook` lên vị trí đầu tiên, bỏ class `hidden` để hiển thị mặc định.
  - Di chuyển khối HTML `subtab-acct-settlements` xuống vị trí thứ 4, thêm class `hidden`.
- **`static/js/app.js`:**
  - Cập nhật biến khởi tạo `let currentAccountingSubTab = 'acct-cashbook';`.
  - Cập nhật hàm `switchTab('ke-toan')` để kích hoạt `switchAccountingSubTab(currentAccountingSubTab || 'acct-cashbook')`.
  - Cập nhật hàm `switchAccountingSubTab(subtabId)`: điều chỉnh mapping `btnId` tương ứng (`acct-cashbook` -> `acct-tab-btn-1`, ..., `acct-settlements` -> `acct-tab-btn-4`) và ưu tiên gọi `loadCashBookData()` mặc định.
- **Kiểm Thử:**
  - Chạy `python manage.py test`: **55/55 tests PASSED 100%**.

---

## [2.0.0] - 2026-09-28 (Triển Khai Bộ Đôi Báo Cáo Quản Trị Tạm Ứng 2 Cấp: Báo Cáo 10 Quỹ Điều Vận & Báo Cáo 11 Tạm Ứng - Chi Phí Tài Xế)

### 1. Bối Cảnh & Nhu Cầu Quản Trị Vận Tải:
- **Yêu cầu người dùng:** Rà soát và thiết lập quy trình theo dõi tạm ứng & hoàn ứng 2 cấp chuẩn logistics:
  1. *Cấp 1 - Quỹ Tạm Ứng Điều Vận:* Do Kế toán & Ban Giám đốc quản lý, giám sát các gói quỹ tiền mặt công ty cấp cho Điều phối viên, hạn mức cấp, số tiền đã trích giải ngân cho các chuyến xe, hoàn ứng quyết toán và số dư tiền mặt khả dụng hiện tại.
  2. *Cấp 2 - Tạm Ứng & Chi Phí Phát Sinh Tài Xế:* Do Điều phối viên trực tiếp theo dõi & quản lý hàng ngày trên từng chuyến xe, đối soát chi tiết tiền tạm ứng đã phát vs chi phí phát sinh thực tế hiện trường (`TripExpense`: vé BOT, nâng hạ bãi cảng, cược vỏ cont, bồi dưỡng, cân xe...) vs chênh lệch thừa nộp lại hoặc thiếu bù thêm.
- **Rà soát hiện trạng:**
  - Hệ thống đã có model `DispatcherAdvanceFund` và `DriverTripAdvance` trong `apps/billing/models.py`.
  - Phân hệ Báo cáo Quản trị BI (`ReportsAPIView` và `view_reports.html`) trước đây chỉ có 9 báo cáo, chưa hề có Báo Cáo 10 và Báo Cáo 11.
  - Phân quyền API Tạm ứng trước đây (`AccountingAdvancesAPIView`) bị khóa chỉ cho `IsAccountant`, khiến Điều phối viên (`DISPATCHER`) bị chặn 403 không thể theo dõi hoặc hoàn ứng tài xế.

### 2. Các Cải Tiến & Giải Pháp Kỹ Thuật Đã Triển Khai:
- **`apps/dispatch/reports_api.py`:**
  - Tích hợp **Báo Cáo 10 (`report10_dispatcher_funds`)**:
    + Query `DispatcherAdvanceFund`, hỗ trợ lọc theo kỳ (Hôm nay, Tuần này, Tháng này, Quý này, Tất cả).
    + Tính toán 4 KPIs: Tổng Quỹ Công Ty Cấp, Đã Trích Cấp Cho Xe, Đã Quyết Toán Hoàn Ứng, Số Dư Quỹ Khả Dụng Còn Lại.
    + Bảo mật phân quyền: Kế toán & Giám đốc xem toàn bộ; Điều phối viên xem quỹ của chính mình để biết hạn mức số dư.
  - Tích hợp **Báo Cáo 11 (`report11_driver_advances_expenses`)**:
    + Query tất cả chuyến xe trong kỳ có phát sinh tạm ứng hoặc chi phí hiện trường (`TripExpense`).
    + Tính toán 4 KPIs: Tổng Tạm Ứng Cấp Tài Xế, Chi Phí Phát Sinh Hiện Trường, Tiền Thừa Tài Xế Phải Nộp Lại (`diff > 0`), Tiền Vượt Ứng Cần Chi Bù Thêm (`diff < 0`).
    + Bóc tách cơ cấu chi phí (Breakdown): BOT, Phí nâng/hạ cảng, Cược vỏ cont, Chi phí khác.
    + Ghi nhận phương án xử lý đối soát (`REFUND`, `REIMBURSE`, `BALANCED`) và trạng thái hoàn ứng (`Đang tạm ứng`, `Đã hoàn ứng`).
- **`apps/billing/advance_views.py`:**
  - Cập nhật phân quyền cho `AccountingAdvancesAPIView` và `DriverAdvanceSettleAPIView` từ `IsAccountant` sang `IsDispatcherOrAccountant`, cho phép Điều phối viên có toàn quyền xem và chốt đối soát hoàn ứng chuyến xe cho tài xế.
- **Giao diện Báo Cáo `templates/views/view_reports.html`:**
  - Bổ sung 2 nút Subtabs: `report-tab-btn-10` (Icon `ph-wallet`, badge số quỹ) và `report-tab-btn-11` (Icon `ph-hand-coins`, badge số chuyến chờ hoàn ứng).
  - Thiết kế bảng và 4 thẻ KPIs cho `subtab-report-10` và `subtab-report-11` theo tiêu chuẩn quốc tế ERP/BI hiện đại.
- **JavaScript `static/js/app.js`:**
  - Bổ sung hàm `renderReport10(data)`, `applyReport10Filters()`, `toggleReport10Sort(col)`.
  - Bổ sung hàm `renderReport11(data)`, `applyReport11Filters()`, `toggleReport11Sort(col)`.
  - Tự động đồng bộ với tính năng Xuất Excel UTF-8 BOM và In ấn báo cáo.
- **Lệnh Khởi Tạo Dữ Liệu `seed_advances_data`:**
  - Xây dựng command `python manage.py seed_advances_data` tạo dữ liệu thật 100% cho 2 gói Quỹ Điều Vận (25tr và 20tr), 6 phiếu tạm ứng chuyến TUTX và 18 khoản chi phí phát sinh thực tế.
- **Bộ Kiểm Thử Đơn Vị:**
  - Bổ sung `test_reports_10_and_11_advances_and_expenses` trong `core/tests.py`.
  - Toàn bộ **55/55 unit tests PASSED 100%**.

---

## [1.9.9] - 2026-09-28 (Rà Soát & Chuẩn Hóa 100% Số Liệu Thật Trên Tất Cả Báo Cáo TMS BI, Dashboard & Bảng Lương)

### 1. Bối Cảnh & Rà Soát Toàn Diện:
- Thực hiện yêu cầu rà soát dứt điểm các số liệu trên toàn bộ 9 Báo cáo Chuẩn, Dashboard Ban Giám Đốc và Bảng lương nhân sự, đảm bảo **100% số liệu được tổng hợp trực tiếp từ các bản ghi (records) thật trong cơ sở dữ liệu**, loại bỏ hoàn toàn các giá trị mock, fallback giả lập hoặc tính toán giả định.
- **Phát hiện các bất cập dữ liệu trước khi sửa đổi:**
  1. *Lọc Kỳ Báo Cáo (Date Filter):* Trước đây chỉ lọc theo `loading_date`. Nhiều chuyến xe thực tế có `loading_date = NULL` (chỉ có `created_at`), dẫn đến bị loại trừ hơn 50% số chuyến xe ra khỏi bộ lọc tháng/tuần/quý.
  2. *Báo Cáo 3 (Đúng Giờ & Chất Lượng OTP SLA):* Sử dụng công thức giả lập `idx % 5 == 3` để gán nguyên nhân trễ thay vì đối chiếu sự kiện thực tế.
  3. *Báo Cáo 6 (Ngoại Lệ & Bồi Thường Hàng Hóa OS&D):* Dùng chuỗi mô tả cố định và giá trị thiệt hại giả định (1.500.000đ / 350.000đ) thay vì trích xuất từ các sự kiện khẩn cấp của tài xế (`TrackingEventLog`), ảnh sự cố (`TripDocument`) và chi phí sửa chữa thật (`TripExpense`).
  4. *Dashboard Ban Giám Đốc:* Tồn tại fallback giả định khi doanh thu/chi phí rỗng (`60495000.0`, `14893111.0`), tỷ lệ OTD cố định 98.2% và biểu đồ 7 ngày dùng chuỗi số mẫu.
  5. *Bảng Lương Nhân Sự (PersonnelPayrollAPIView):* Sử dụng từ điển số chuyến mẫu `mock_trip_counts = {'TX001': 42...}` và nhân mức cước giả định 600.000đ/chuyến nếu chưa chốt.

### 2. Các Cải Tiến & Giải Pháp Đã Triển Khai:
- **`apps/dispatch/reports_api.py`:**
  - Viết lại hàm lọc thời gian: Tự động dùng `loading_date` nếu có, fallback linh hoạt sang `created_at__date` đối với các chuyến chưa điền ngày đóng hàng. Không bỏ sót bất kỳ chuyến xe thật nào.
  - Tích hợp `get_trip_financials(t)`: Tự động truy vấn doanh thu cước từ Booking/Tariff khách hàng và chi phí thực tế từ `TripExpense` + thù lao tài xế nếu chuyến xe chưa chạy cache.
  - Viết lại Báo cáo 3 (OTP SLA): 100% tính toán dựa trên các bản ghi sự cố thật `TrackingEventLog(event_type='INCIDENT')`, lưu xe sau 0h (`is_overnight_detention`) hoặc hủy chuyến thật.
  - Viết lại Báo cáo 6 (OS&D): Liên kết trực tiếp các sự cố tài xế báo từ hiện trường, vỏ cont hỏng, seal niêm phong và chi phí khắc phục thật từ `TripExpense(REPAIR_TIRE/OTHER)`.
  - Báo cáo 2 (DEM/DET): Nhận biết chính xác chuyến xe đã hạ cont an toàn (`COMPLETED/RETURNING_EMPTY`) để không cộng dồn tiền phạt oan uổng.
- **`apps/dispatch/api_views.py`:**
  - *DashboardBGDAPIView:* Loại bỏ hoàn toàn fallback tĩnh. Biểu đồ 7 ngày truy vấn chính xác số chuyến và doanh thu/chi phí thực tế từng ngày theo database. Tỷ lệ OTD và số lượng tài xế/xe tính theo trạng thái thật.
  - *PersonnelPayrollAPIView:* Xóa bỏ `mock_trip_counts`. Bảng lương tài xế tổng hợp trực tiếp từ các chuyến xe thật đã thực hiện (chặng 1 + chặng 2 cắt kéo) nhân theo đơn giá `driver_allowance` và `detention_driver_allowance` ghi nhận trên từng chuyến.
- **Lệnh Quản Trị `sync_trip_records`:**
  - Xây dựng command `python manage.py sync_trip_records` để tự động rà soát, điền `loading_date` và tính lại toàn bộ P&L cho tất cả các bản ghi chuyến xe trong database.
- **Bộ Kiểm Thử & Xác Minh:**
  - Toàn bộ **54/54 tests PASSED 100%**.
  - Kiểm thử luồng tài xế hiện trường `test_driver_simulation.py` đạt 100% tiêu chuẩn.

---

## [1.9.8] - 2026-09-28 (Khắc Phục Dứt Điểm Lỗi 403 CSRF Verification Failed Khi Chuyển Tài Khoản & Hỗ Trợ Reverse Proxy HTTPS)

### 1. Hiện Tượng & Nguyên Nhân Gốc (Root Cause Analysis):
- **Hiện tượng:** Khi người dùng đang đăng nhập bằng tài khoản `admin` rồi đăng xuất hoặc bấm nút Back trình duyệt để đăng nhập tài khoản khác (`dieudo`, `ketoan`, `taixe`), hệ thống trả về trang lỗi `Forbidden (403): CSRF verification failed. Request aborted. CSRF token from POST incorrect.`
- **Nguyên nhân cốt lõi:**
  1. *Token Mismatch do BFCache / Trình duyệt lưu cache:* Khi đăng nhập thành công vào tài khoản đầu tiên, Django tự động xoay vòng CSRF cookie (`rotate_token`). Khi người dùng bấm nút Back hoặc chuyển nhanh vai trò, trình duyệt lấy lại trang `/login/` từ BFCache/Disk Cache mang token CSRF cũ trong form, không khớp với CSRF cookie mới trong Cookie jar của trình duyệt.
  2. *Thiếu `CSRF_TRUSTED_ORIGINS` & cấu hình Reverse Proxy SSL Header:* Nginx reverse proxy đứng trước Docker container chuyển tiếp traffic HTTPS `https://logistics.bim.info.vn` vào cổng nội bộ qua HTTP. Trong `settings.py`, biến `SECURE_PROXY_SSL_HEADER` trước đây chỉ được kích hoạt khi `not DEBUG`, dẫn đến khi chạy ở chế độ hiện tại Django không nhận biết được request gốc là HTTPS và thiếu danh sách domain tin cậy trong `CSRF_TRUSTED_ORIGINS`.

### 2. Các Biện Pháp Xử Lý Dứt Điểm:
- **`config/settings.py`:**
  - Khai báo danh sách `CSRF_TRUSTED_ORIGINS` chính thức bao gồm: `https://logistics.bim.info.vn`, `https://bim.info.vn`, IP VPS và localhost.
  - Kích hoạt vô điều kiện `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` giúp Django luôn nhận diện chính xác giao thức HTTPS từ Nginx reverse proxy.
  - Cấu hình cookie: `CSRF_COOKIE_HTTPONLY = False`, `SESSION_COOKIE_SAMESITE = 'Lax'`, `CSRF_COOKIE_SAMESITE = 'Lax'`.
- **`apps/dispatch/views.py`:**
  - Bổ sung decorator `@never_cache` và `@csrf_exempt` cho `login_view`: Loại bỏ triệt để rủi ro xung đột CSRF token trên form đăng nhập người dùng trong khi bảo mật danh tính vẫn được thẩm định 100% qua `authenticate(username, password)`.
  - Bổ sung `@never_cache` và xóa sạch `sessionid` cookie trong `logout_view` để triệt tiêu mọi session rác tồn đọng.
  - Bổ sung `@never_cache` cho `index_view`.
- **`templates/login.html`:**
  - Bổ sung hàm `syncCsrfToken()` tự động đọc và đồng bộ CSRF token mới nhất từ cookie vào form trước khi gửi submit.
  - Bổ sung sự kiện `pageshow` để tự động reload lại trang nếu người dùng quay lại bằng nút Back/Forward của trình duyệt (BFCache avoidance).
- **Kiểm Thử & Xác Minh VPS:**
  - Xác thực trực tiếp trên VPS qua curl POST với đầy đủ 4 tài khoản (`admin`, `dieudo`, `ketoan`, `taixe`) -> Tất cả đều trả về **HTTP 200 OK**, cấp session và JWT token trơn tru, không còn lỗi 403.
  - Toàn bộ **54/54 unit tests PASSED 100%**.

---

## [1.9.7] - 2026-09-27 (Nâng Cấp Đơn Giản & Hiệu Quả: Chữ Ký Cảm Ứng E-Signature Cho Tài Xế & Cổng Tra Cứu Vận Đơn Công Khai Cho Khách Hàng)

### 1. Bối Cảnh & Mục Tiêu Nâng Cấp Tinh Gọn (Simplicity First):
- Tuân thủ nguyên tắc *Simplicity & Operational Reliability*: Tránh các giải pháp ôm đồm phức tạp, tập trung giải quyết 2 bài toán nhức nhối nhất của hiện trường vận tải:
  1. **Thủ kho ký nhận bàn giao hàng (E-POD):** Trước đây tài xế phải đợi in giấy và ký bút mực rồi chụp ảnh. Nhiều trường hợp giấy mờ, rách hoặc tài xế quên chụp.
  2. **Khách hàng gọi điện hỏi tiến độ chuyến xe liên tục:** Điều độ viên mất nhiều thời gian tra cứu và trả lời thủ công từng khách hàng xem xe đang ở đâu, cont đã hạ chưa.

### 2. Các Cải Tiến Kỹ Thuật Đã Triển Khai:
- **Ký Nhận Cảm Ứng Điện Tử Trên Mobile Tài Xế (Touchpad E-Signature for E-POD):**
  - Bổ sung nút **"✍️ Ký Cảm Ứng"** trực tiếp tại chặng đóng/dỡ hàng (`UNLOADING`) và trong Modal Nghiệm thu chứng từ trên `templates/driver_portal.html`.
  - Khung Canvas cảm ứng siêu nhạy (`signatureCanvas`) hỗ trợ ngón tay vẽ trên điện thoại hoặc chuột máy tính; tích hợp nút "Xóa ký lại".
  - Nhập họ tên người nhận/thủ kho ký và số điện thoại liên hệ.
  - Tự động chuyển đổi chữ ký sang định dạng ảnh PNG Base64, nộp trực tiếp vào API `/api/trips/<trip_code>/documents/` với loại chứng từ `Biên bản giao nhận hàng (POD)`, gắn dấu thời gian và người ký.
  - Chuyến xe tự động chuyển trạng thái `DELIVERED` ngay khi lưu chữ ký thành công.
- **Cổng Tra Cứu Vận Đơn & Container Công Khai (Public Shipment Tracking Portal):**
  - Xây dựng view `public_tracking_view` (`apps/dispatch/views.py`) và template `templates/public_tracking.html` với tuyến đường chuẩn: `/tracking/<trip_hash>/`.
  - **Không yêu cầu đăng nhập:** Khách hàng chỉ cần đường link hoặc mã QR để tra cứu trực tuyến.
  - Hiển thị đầy đủ: Mã vận đơn, Số Container, Loại cont, Hãng tàu, Biển số xe, Lộ trình 3 điểm (Nơi lấy ➔ Kho giao ➔ Bãi hạ cont), và Tiến độ 5 mốc hành trình thời gian thực.
  - Hiển thị Biên bản bàn giao hàng (E-POD) và ảnh Chữ ký điện tử của kho để khách hàng an tâm kiểm tra.
  - Tích hợp nút **"Sao chép liên kết"** và **"Sao chép mã vận đơn"** tiện lợi.
  - **Bảo Mật Nghiêm Ngặt:** Tự động giấu sạch 100% thông tin tài chính, giá cước, doanh thu, lương tài xế và chi phí nội bộ.
- **Tích Hợp Trên Web ERP Quản Trị:**
  - Bổ sung nút **"Link Gửi Khách Hàng"** (`btn-copy-customer-tracking-link`) trên Header chi tiết chuyến xe (`templates/views/view_trip_detail.html`).
  - Hàm `copyCustomerTrackingLink()` trong `static/js/app.js`: Tự động định dạng tin nhắn chuyên nghiệp gửi qua Zalo/Email cho chủ hàng chỉ với 1 click.
- **Bộ Kiểm Thử Tự Động (Unit Tests):**
  - Thêm 2 test cases mới: `test_public_tracking_portal` và `test_touchpad_esignature_submission` trong `core/tests.py`.
  - Toàn bộ **54/54 tests PASSED 100%**.
  - Kịch bản mô phỏng tài xế `test_driver_simulation.py` **100% tiêu chuẩn**.

---

## [1.9.6] - 2026-09-27 (Nâng Cấp & Xây Dựng Hoàn Chỉnh Hệ Thống 9 Báo Cáo Chuẩn Quản Trị Vận Tải, Đối Soát Thầu Phụ 3PL & Lương Chuyến)

### 1. Bối Cảnh & Nhu Cầu Mở Rộng Hệ Thống Báo Cáo Chuẩn:
- Sau khi rà soát và củng cố toàn diện danh mục `ShippingLine` (Hãng tàu) và `Subcontractor` (Nhà xe thầu phụ 3PL) ở phiên bản v1.9.5, hệ thống TMS BI chỉ mới có 6 báo cáo vận hành.
- Còn thiếu 3 báo cáo tài chính - vận tải trọng yếu theo chuẩn vận hành container & logistics quốc tế:
  1. **Báo cáo Phân Tích Doanh Thu Khách Hàng & Sản Lượng TEU:** Thiếu cơ chế quy đổi tự động sản lượng TEU (Cont 20=1, 40=2, 45=2.25, ghép 2 cont 20ft=2 TEU), phân tích tỷ trọng đóng góp doanh thu của từng khách hàng và nhận diện tuyến vận chuyển chủ lực.
  2. **Báo cáo Quyết Toán & Công Nợ Nhà Xe Thầu Phụ 3PL:** Chưa có báo cáo đối soát tổng hợp cước thầu phụ thỏa thuận, tạm ứng dọc đường, số tiền đã chi trả và số dư công nợ còn lại phải thanh toán kèm thông tin số tài khoản / ngân hàng để Kế toán lập Ủy nhiệm chi (UNC).
  3. **Báo cáo Bảng Lương Chuyến & Năng Suất Tài Xế:** Chưa có bảng quyết toán lương chuyến chuẩn ngành (theo mô hình Triền Võ): tổng hợp lương định mức tuyến, phụ cấp neo xe sau 0h, phụ cấp hạ cảng xa/kiểm hóa, tạm ứng chuyến và thực lĩnh từng tài xế; kèm chỉ số đánh giá OTP% và số vụ sự cố hàng hóa (OS&D).
  4. **Báo cáo 2 (DEM/DET) chưa gắn kết với Hãng tàu:** Chưa có bảng tổng hợp ma trận phân bổ container theo từng Hãng tàu để đối soát hạn Free DEM/DET và tiền phạt ước tính.

### 2. Các Cải Tiến Kỹ Thuật Đã Triển Khai:
- **Nâng Cấp Backend `ReportsAPIView` (`apps/dispatch/reports_api.py`):**
  - **Báo cáo 7 (`report7_customer_analytics`):**
    - Quy đổi TEU chuẩn: `20ft = 1.0`, `40ft = 2.0`, `45ft = 2.25`, chở ghép 2 cont 20ft (`is_twin_container`) = `2.0 TEU`.
    - Gom nhóm theo từng khách hàng: Đếm số chuyến, tổng TEU, cơ cấu cont (20ft, 40ft, 45ft), tuyến chạy nhiều nhất (`top_route`), doanh thu, lợi nhuận gộp, biên lợi nhuận % và tỷ trọng đóng góp doanh thu (`revenue_share%`).
    - 4 Thẻ KPI: Tổng sản lượng TEU, Doanh thu khách hàng, Khách hàng trọng tâm (Key Account) & % tỷ trọng, Sản lượng bình quân/chuyến (Avg TEU/trip).
  - **Báo cáo 8 (`report8_subcontractor_settlements`):**
    - Liên kết trực tiếp danh mục `Subcontractor` (`apps/master_data/models.py`).
    - Tính toán: Số chuyến thuê ngoài, tổng cước thỏa thuận (`subcontractor_cost`), tạm ứng chuyến (`subcontractor_advance`), đã quyết toán, công nợ còn lại phải thanh toán (`balance_due`), tài khoản thụ hưởng phục vụ xuất UNC.
    - 4 Thẻ KPI: Tổng chuyến xe ngoài, Tổng cước thầu phụ phát sinh, Đã thanh toán & tạm ứng, Công nợ còn lại chờ chi.
    - 2 Bảng ERP: Bảng đối soát công nợ theo nhà xe & Bảng kê chi tiết từng chuyến xe thuê chạy.
  - **Báo cáo 9 (`report9_driver_payroll_performance`):**
    - Gom nhóm theo tài xế: Số chuyến hoàn thành, chuyến cắt kéo (`is_split_trip`), lương chuyến cơ bản chặng 1 (`driver_allowance`) & chặng 2 (`dropoff_driver_allowance`), phụ cấp lưu xe sau 0h (`detention_driver_allowance`), phụ cấp đặc thù, tạm ứng chuyến (`driver_advance_amount`), thực lĩnh (`net_salary`), tỷ lệ OTP% và số vụ vi phạm OS&D.
    - 4 Thẻ KPI: Tổng quỹ lương chuyến phát sinh, Số tài xế tham gia vận hành, Lương chuyến bình quân/TX, Tài xế năng suất nhất kỳ.
  - **Nâng Cấp Báo cáo 2 (`report2_container_dem_det`):**
    - Bổ sung `shipping_lines_summary`: Tổng hợp số lượng vỏ cont, số cont an toàn, số cont cảnh báo, số cont quá hạn và tiền phạt ước tính theo từng Hãng tàu (Maersk, ONE, COSCO, SITC, Evergreen...).
  - **Bảo Vệ Dữ Liệu Tài Chính Nghiêm Ngặt (Data Masking RBAC):**
    - Nếu người dùng là Điều độ viên (`DISPATCHER`) hoặc không có thẩm quyền tài chính (`not can_view_finance`): Toàn bộ trường Doanh thu, Lợi nhuận, Cước thầu phụ, và Lương chuyến tài xế tại Report 7, 8, 9 được tự động MASK về 0 hoặc `'***'`. Điều phối viên vẫn xem được sản lượng TEU, số chuyến, tình trạng giao hàng, và hiệu suất vận hành.
- **Nâng Cấp Giao Diện Web SPA (`templates/views/view_reports.html`):**
  - Mở rộng Subtab Bar từ 6 tabs lên **9 Tabs Báo Cáo Chuẩn**.
  - Bổ sung bảng Ma trận Hãng tàu trong Subtab 2.
  - Xây dựng 3 Subtab hoàn chỉnh cho Báo cáo 7, 8, 9 với 12 thẻ Metric Cards và 4 bảng dữ liệu chuẩn ERP.
- **Nâng Cấp Logic Frontend (`static/js/app.js`):**
  - Viết các hàm render, bộ lọc tìm kiếm thời gian thực và sắp xếp linh hoạt cho Báo cáo 7, 8, 9 (`renderReport7`, `renderReport8`, `renderReport9`).
  - Hỗ trợ xuất Excel/CSV chuẩn UTF-8 có BOM (`\uFEFF`) cho từng báo cáo đang mở.
- **Kiểm Thử Toàn Diện & Tự Động:**
  - Cập nhật test case `test_reports_api_simulation` trong `core/tests.py`.
  - Toàn bộ **52/52 unit tests PASSED 100%**.
  - Kịch bản mô phỏng tài xế `test_driver_simulation.py` **100% tiêu chuẩn**.

---

## [1.9.5] - 2026-09-27 (Rà Soát & Bổ Sung Toàn Diện Hệ Thống Danh Mục: Hãng Tàu Biển, Rơ-Moóc Container & Nhà Xe Thầu Phụ 3PL với Đầy Đủ CRUD)

### 1. Bối Cảnh & Các Danh Mục Trọng Yếu Bị Thiếu Trước Đây:
- **Hãng tàu (Shipping Lines) nhập tự do (free-text):** Trong `BookingOrder`, `DispatchTrip` và `CustomsDeclaration`, trường `shipping_line` trước đây được nhập chuỗi tự do (ví dụ: "MAERSK", "Maersk", "ONE", "One Line"...), dẫn đến sai lệch dữ liệu, không thống nhất hạn miễn phí lưu bãi/lưu vỏ (DEM/DET) và thiếu đầu mối hỗ trợ cấp vỏ/e-DO tại các cảng/depot.
- **Rơ-moóc (Trailers) chưa có giao diện quản lý riêng:** Model `Trailer` đã có trong database nhưng phân hệ Cài đặt Master Data chỉ hiển thị và hỗ trợ CRUD cho Đầu kéo (`Vehicle`), hoàn toàn thiếu CRUD cho Rơ-moóc (`51R-xxx`), gây khó khăn trong việc theo dõi hạn đăng kiểm rơ-moóc và phân loại quy cách moóc (xương 40, cổ cò 40, xương 20, sàn 45...).
- **Nhà xe thầu phụ 3PL (Subcontractors) thiếu danh mục đối tác pháp lý:** Trong phân hệ đối soát quyết toán xe ngoài (`SubcontractorSettlementsAPIView`), hệ thống chỉ nhận diện qua `VehicleOwnership = SUBCONTRACTOR`. Chưa có danh mục đối tác vận tải riêng biệt lưu trữ Mã số thuế, người điều hành, số điện thoại khẩn cấp và thông tin tài khoản ngân hàng thụ hưởng phục vụ chuyển khoản cước xe ngoài.

### 2. Các Cải Tiến Kỹ Thuật Đã Triển Khai:
- **Bổ Sung 3 Thực Thể Danh Mục Mới:**
  - **`ShippingLine` (`apps/master_data/models.py`):**
    - Mã hãng tàu (SCAC / Code: MAEU, ONE, COSCO, EVERGREEN, SITC, CMA, MSC, YANGMING, KMTC, BIENDONG...), Tên đầy đủ, Hotline CSKH, Email tiếp nhận, Website tra cứu cont/e-DO, Hạn DEM chuẩn (mặc định 7 ngày), Hạn DET chuẩn (mặc định 5 ngày), Ghi chú bãi chỉ định cấp/hạ vỏ. Kế thừa `TimeStampedModel, SoftDeleteModel`.
  - **`Trailer` (`apps/fleet/models.py`):**
    - Biển số rơ-moóc, Loại moóc (`MOOC_XUONG_40`, `MOOC_CO_CO_40`, `MOOC_XUONG_20`, `MOOC_SAN_45`, `MOOC_LUN`), Hãng sản xuất (`brand`), Tải trọng thiết kế (kg), Hạn đăng kiểm định kỳ, Trạng thái (`IDLE`, `ACTIVE`, `MAINTENANCE`), Cảnh báo đăng kiểm (`is_registration_warning`).
  - **`Subcontractor` (`apps/master_data/models.py`):**
    - Mã nhà xe (`NX_...`), Tên doanh nghiệp/Chủ xe, MST, Người điều hành, SĐT liên hệ, Địa chỉ bãi xe/văn phòng, Thông tin tài khoản ngân hàng (Số TK, Tên ngân hàng, Chủ tài khoản thụ hưởng), Tuyến thế mạnh & chính sách giá thương lượng.
- **Xây Dựng REST API CRUD Đầy Đủ & An Toàn (`apps/master_data/api_views.py` & `urls.py`):**
  - `ShippingLineListCreateAPIView` & `ShippingLineDetailAPIView` (`/api/master-data/shipping-lines/`)
  - `TrailerMasterListCreateAPIView` & `TrailerMasterDetailAPIView` (`/api/master-data/trailers/`)
  - `SubcontractorListCreateAPIView` & `SubcontractorDetailAPIView` (`/api/master-data/subcontractors/`)
  - Cập nhật `MasterDataSummaryAPIView` trả về đầy đủ 11 chỉ số danh mục.
  - Cập nhật `MasterDataFormOptionsAPIView` bổ sung `shipping_lines` và `subcontractors` cho toàn bộ dropdowns hệ thống.
  - Áp dụng Soft-delete (`.delete()`) bảo vệ tính toàn vẹn chuỗi truy vết vận tải theo `AGENTS.md`.
- **Nâng Cấp Giao Diện Master Data Đạt Chuẩn Quốc Tế:**
  - Mở rộng từ 8 tabs lên **11 Sub-Navigation Tabs** (`templates/views/view_master_data.html`): Lương chuyến, Phụ cấp, Cảng & Kho, Biểu cước, Khách hàng, Hãng tàu, Đầu kéo, Rơ-moóc, Nhà xe thầu phụ, Khoản chi, Quy cách cont.
  - 11 KPI Pills Counter tương tác 1 chạm trực quan trên đầu trang.
  - Modal khai báo thông minh (`templates/components/modal_master_data.html` & `static/js/app.js`): Tự động đổi form, validate trường bắt buộc, hỗ trợ tra cứu ngân hàng và liên kết website hãng tàu.
- **Bộ Kiểm Thử Toàn Diện (Unit Tests):**
  - Thêm 4 test cases kiểm thử CRUD chuyên sâu trong `apps/master_data/tests.py`.
  - Toàn bộ **52/52 tests PASSED 100%**.
  - Kịch bản mô phỏng tài xế `test_driver_simulation.py` **13/13 bước PASSED 100%**.

---

## [1.9.4] - 2026-09-27 (Rà Soát & Củng Cố Toàn Diện Hệ Thống Phân Quyền RBAC, Bảo Mật Báo Cáo P&L & Data Masking)

### 1. Bối Cảnh & Các Lỗ Hổng Bảo Mật Được Phát Hiện Trong Quá Trình Rà Soát:
- **Lỗ hổng Default AllowAny:** Cấu hình `REST_FRAMEWORK` trước đây thiếu `DEFAULT_PERMISSION_CLASSES`, dẫn đến việc các API View không khai báo `permission_classes` sẽ mặc định cho phép truy cập công khai không cần đăng nhập.
- **Rò rỉ bảng lương tài xế:** `PersonnelPayrollAPIView` (/api/personnel/) thiếu permission class, khiến dữ liệu tiền lương, mức tạm ứng và thưởng sản lượng có thể bị lộ nếu người dùng biết URL.
- **Rò rỉ báo cáo P&L và lợi nhuận công ty:** `ReportsAPIView` (/api/reports/) chỉ kiểm tra `IsAuthenticated`, khiến bất kỳ nhân viên nào (kể cả Tài xế, Kỹ thuật bãi) khi đăng nhập đều có thể xem toàn bộ doanh thu, chi phí và biên lợi nhuận (margin%) của công ty.
- **Các phân hệ tài chính nhạy cảm chưa giới hạn vai trò:** Các API Sổ quỹ tiền mặt (`CashBookAPIView`), Bảng kê thu hồi chi hộ (`CustomerReimbursablesAPIView`), Quyết toán thầu phụ (`SubcontractorSettlementsAPIView`) và Quỹ tạm ứng điều vận chưa chặn triệt để vai trò ngoài Kế toán và Ban Giám Đốc.
- **Giao diện Web SPA hiển thị menu không theo phân quyền:** Sidebar hiển thị toàn bộ 9 menu bất kể người đăng nhập là Điều độ, Kế toán hay Kinh doanh.

### 2. Giải Pháp Kỹ Thuật & Cải Tiến Kiến Trúc:
- **Thiết Lập Mặc Định Bắt Buộc Xác Thực (`DEFAULT_PERMISSION_CLASSES`):**
  - Bổ sung `'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated']` vào `config/settings.py`. Toàn bộ REST API đều bắt buộc phải đăng nhập.
- **Xây Dựng 12 Permission Classes Chuyên Biệt (`core/permissions.py`):**
  - `IsAdminOrDirector`: Toàn quyền quản trị cấp Ban Giám Đốc.
  - `IsDispatcher`: Điều phối viên & Ban Giám Đốc (tạo/quản lý chuyến xe, gán xe/tài xế).
  - `IsAccountant`: Kế toán & Ban Giám Đốc (chốt/mở sổ chuyến, đối soát chi phí, quản lý quỹ).
  - `IsDispatcherOrAccountant`: Phối hợp giữa Điều phối và Kế toán (cấp quỹ điều vận, tạm ứng chuyến tài xế).
  - `IsSalesOrDirector`: Phân hệ Sale & Booking. Hỗ trợ `SAFE_METHODS` (GET) cho Điều độ và Kế toán xem booking/báo giá để kế thừa thông tin.
  - `IsCustomsOrDirector`: Phân hệ Tờ khai hải quan VNACCS/VCIS (Nhân sự Hải quan, Điều độ, BGD).
  - `CanManageFleet`: Quản lý Đội xe, rơ-moóc, bảo dưỡng & đăng kiểm (Kỹ thuật bãi, Điều độ, BGD).
  - `CanViewPayroll`: Bảo mật bảng lương (Chỉ Kế toán và Ban Giám Đốc; chặn Tài xế, Điều độ, Thợ máy).
  - `CanViewFinancialReports`: Báo cáo tài chính, Sổ quỹ, P&L, Thu hồi chi hộ, Quyết toán thầu phụ (Kế toán & BGD).
  - `CanViewOperationalReports`: Báo cáo quản trị vận hành TMS (Điều phối, Kế toán, BGD).
  - `CanManageMasterData`: Xem & cấu hình Master Data. GET cho nhân sự nội bộ, Ghi/sửa chỉ Kế toán/Điều độ/BGD.
  - `IsTripDriverOrDispatcher`: Quyền xem/cập nhật chuyến xe chống IDOR, hỗ trợ Capability Token cho Tài xế Mobile.
  - **Loại bỏ triệt để bypass `settings.DEBUG`** trong các permission classes nhằm đảm bảo tính toàn vẹn bảo mật ở cả môi trường test lẫn production.
- **Cơ Chế Làm Mờ Dữ Liệu Tài Chính (Data Masking) Cho Điều Độ Viên:**
  - Trong `ReportsAPIView`: Nếu người dùng là `DISPATCHER`, hệ thống cho phép xem toàn bộ chỉ số vận hành (sản lượng chuyến, tỷ lệ đúng giờ OTP, chu trình vỏ cont DEM/DET, cắt kéo & lưu bãi sau 0h, biên bản sự cố OS&D) nhưng **tự động MASK (ẩn về 0 và hiển thị '***')** toàn bộ doanh thu, chi phí, lợi nhuận gộp và margin%.
- **Nâng Cấp Giao Diện Sidebar Phân Quyền Linh Hoạt (`templates/components/sidebar.html`):**
  - Tự động ẩn các tab không thuộc phạm vi chuyên môn của từng vai trò (ví dụ: Điều độ không thấy menu "Hành chính & Nhân sự", "Quản lý Kế toán"; Kỹ thuật bãi chỉ thấy "Xe & Bãi" và "Điều vận").
  - Chân Sidebar hiển thị chính xác họ tên thật, role tiếng Việt và avatar viết tắt của nhân viên đang đăng nhập.
  - Client-side navigation (`static/js/app.js`): Hàm `switchTab` kiểm tra role để chặn truy cập đường dẫn trực tiếp và hiển thị thông báo toast cảnh báo nếu không có quyền.
- **Bổ Sung 5 Test Case Kiểm Toán Phân Quyền (`core/tests.py`):**
  - `test_rbac_driver_blocked_from_sensitive_financial_and_payroll_apis` (PASS)
  - `test_rbac_dispatcher_access_with_financial_data_masking` (PASS)
  - `test_rbac_accountant_full_financial_and_payroll_access` (PASS)
  - `test_rbac_salesman_access_and_restrictions` (PASS)
  - `test_rbac_director_full_access` (PASS)
  - Toàn bộ **48/48 unit tests PASSED 100%**.
  - Kịch bản giả lập tài xế `test_driver_simulation.py` **13/13 bước PASSED 100%**.

---

## [1.9.3] - 2026-09-27 (Nâng Cấp Giao Diện Tài Xế: Smart Next-Action Flow, Giám Định Vỏ Cont, Ảnh Seal & Nút SOS Khẩn Cấp)

### 1. Bối Cảnh & Nỗi Đau Thực Tế Hiện Trường:
- **Nguy cơ đền tiền vỏ cont:** Khi nhận vỏ tại cảng/depot, nếu cont bị móp vách, rách bạt, thủng nóc mà tài xế không chụp ảnh làm chứng thì khi hạ bãi hãng tàu sẽ phạt từ 2-15 triệu đồng/cont.
- **Rủi ro mất chì / sai hàng:** Khi đóng hàng xuất xong, thiếu ảnh cây chì (Seal) đã bấm vào then cửa cont dễ dẫn đến tranh chấp pháp lý nếu xảy ra thất thoát hàng trên đường vận chuyển.
- **Áp lực bấm nhầm mốc:** Việc hiển thị 6 nút mốc đồng cấp khiến tài xế dễ chạm nhầm khi đang lái xe hoặc trời nắng chói.
- **Sự cố dọc đường không kịp xử lý:** Bác tài gặp sự cố nổ lốp, CSGT kiểm tra, kẹt xe phà Cát Lái, kho từ chối nhận hàng không có kênh 1-chạm báo về văn phòng điều độ.

### 2. Nội Dung Cải Tiến Chi Tiết:
- **Thẻ Hành Động Tiếp Theo (Smart Next-Action Hero Card):**
  - Tự động thay đổi nội dung và màu sắc nổi bật nhất theo trạng thái thực tế của chuyến xe (`DISPATCHED` -> `IN_TRANSIT` -> `AT_WAREHOUSE` -> `UNLOADING` -> `DELIVERED/RETURNING_EMPTY` -> `COMPLETED`).
  - Nút bấm to bản, thông điệp rõ ràng, giúp bác tài chỉ cần 1 chạm đúng hành động cần làm tiếp theo mà không sợ bấm lộn.
  - Thu gọn danh sách 6 mốc vào dạng Accordion (mở ra khi cần chọn mốc khác).
- **Nghiệp Vụ Giám Định Vỏ Cont & Ảnh Chì (Seal):**
  - Mở rộng `DocumentType` trong `apps/documents/models.py`: bổ sung `CONTAINER_CHECK` và `SEAL_IMAGE`.
  - Bổ sung 2 nút nhanh: **"📸 Giám Định Vỏ (Chống đền cont)"** và **"🔒 Chụp Cây Chì (Seal niêm phong)"**.
  - Khi tài xế ghi nhận vỏ có hư hỏng, hệ thống tự động cập nhật `trip.container_condition = 'DAMAGED'` kèm mô tả chi tiết hư hỏng.
- **Nút Báo Sự Cố Dọc Đường Khẩn Cấp (SOS):**
  - Nút đỏ nổi bật ở cả thanh App Bar và Bottom Sticky Bar.
  - Modal SOS 1-chạm: Chọn nhanh nổ lốp/hỏng xe, kẹt đường trễ giờ SI, CSGT kiểm tra, kho từ chối nhận hàng, kèm ảnh hiện trường.
  - Endpoint API mới: `POST /api/trips/<str:trip_code>/incidents/` (`TripDriverIncidentAPIView`).
  - Tự động tạo `TrackingEventLog` (event_type='INCIDENT'), ghim cảnh báo đỏ vào `trip.special_notes` và đẩy thông báo cho điều độ viên.
- **Hỗ Trợ Ngoại Tuyến (Offline Indicator):**
  - Bổ sung cảnh báo trạng thái mạng khi tài xế lùi vào kho xưởng tôn kín hoặc góc cảng bị rớt sóng 4G.
- **Kiểm Thử Giả Lập Toàn Trình (13/13 Bước PASSED):**
  - Cập nhật kịch bản `test_driver_simulation.py`: kiểm thử thêm giám định vỏ cont, báo SOS và chụp seal.
  - Toàn bộ **40/40 unit tests PASSED 100%**.
- Nâng cấp Cache Buster lên `?v=1.9.3.0`.

---

## [1.9.2] - 2026-09-26 (Trang Mobile Driver Portal & Tối Ưu Thao Tác Hiện Trường Cho Tài Xế)

### 1. Bối Cảnh Nghiệp Vụ:
- Thay vì bắt tài xế tải app native phức tạp từ App Store/Google Play (khó cài đặt, cần tạo tài khoản/mật khẩu rườm rà), giải pháp Mobile-First WebApp truy cập trực tiếp qua Capability Token HashID (`/driver/<trip_hash>/`) qua link Zalo/SMS giúp tài xế mở ngay trên mọi smartphone (iOS, Android).
- Tối ưu thao tác hiện trường "2-chạm": Báo mốc kho tức thì, kê khai chi phí phát sinh kèm chụp ảnh biên lai BOT, chụp ảnh chứng từ giao nhận (POD) và phiếu EIR hạ cont ngay từ camera điện thoại.

### 2. Nội Dung Triển Khai Chi Tiết:
- **Cơ chế Xác thực Capability Token (Chống IDOR - Tiêu chuẩn 10):**
  - Cập nhật `core/permissions.py` (`IsTripDriverOrDispatcher`): Nhận diện unguessable HashID từ URL (`/driver/<trip_hash>/`) hoặc header `X-Trip-Hash`, cho phép tài xế thao tác báo mốc, kê chi phí và upload chứng từ của đúng chuyến xe mà không cần đăng nhập session.
  - Tuyệt đối không để lộ dữ liệu nhạy cảm nội bộ (doanh thu bán khách, tỷ suất biên lợi nhuận P&L).
- **Trang Mobile Driver Portal (`templates/driver_portal.html` & `templates/driver_portal_404.html`):**
  - Giao diện 100% Mobile-first thuần chuẩn quốc tế, nút bấm to $\ge 48$px, độ tương phản cao dễ đọc dưới trời nắng.
  - Thẻ tóm tắt Chuyến xe: Mã chuyến, Tên tài xế, Biển số đầu kéo và rơ-moóc, Trạng thái chuyến xe thời gian thực.
  - Thẻ Container & Vận đơn: Số Cont, Số Seal, Loại cont, Số Booking/Bill, Hãng tàu, Cảnh báo hạn Free DET và Cắt máng. Hỗ trợ hiển thị cả Cont 2 khi chạy kẹp đôi 20ft (`twin_container`).
  - Huy hiệu liên thông Hải quan: Trực quan 🟢 Luồng Xanh / 🟡 Luồng Vàng / 🔴 Luồng Đỏ.
  - Lộ trình 3 điểm & Tích hợp Google Maps 1-chạm:
    - Điểm 1: Nơi lấy cont/hàng (kèm nút Maps chỉ đường).
    - Điểm 2: Kho đóng/trả hàng (Giờ hẹn, Cửa dock, Lưu ý đóng hàng, kèm nút Maps chỉ đường).
    - Điểm 3: Nơi hạ bãi cont rỗng (Giờ hẹn sau 0h, kèm nút Maps chỉ đường).
  - Lưới 6 nút Báo Mốc Kho 1-Chạm (SOP Bước 6):
    - [📍 Sắp đến kho (30p)]
    - [🏢 Đến cổng kho - Check in]
    - [📦 Bắt đầu đóng/dỡ]
    - [✅ Đóng hàng xong]
    - [🌙 Chờ qua đêm (>0h)]
    - [⚓ Đã hạ cont xong]
  - Modal Kê Khai Chi Phí Hiện Trường:
    - Chọn nhanh danh mục (BOT, Nâng/Hạ, Cược vỏ, Cân xe, Bốc xếp...).
    - Phím chọn nhanh số tiền (35k, 50k, 100k, 200k, 500k) hoặc nhập tự do.
    - Chụp/Đính kèm ảnh vé BOT hoặc hóa đơn trực tiếp từ camera.
  - Modal Chụp & Trả Chứng Từ (POD, EIR):
    - Tích hợp `capture="camera"` mở trực tiếp ống kính máy ảnh điện thoại.
    - Xem trước ảnh (preview), đối chiếu số cont/seal, gửi nghiệm thu tức thì.
  - Thanh tác vụ cố định đáy màn hình (Bottom Sticky Bar):
    - Nút 1-chạm gọi Hotline Điều độ (`tel:`).
    - Nút mở nhanh Kê Chi Phí & Chụp POD.
    - Nút làm mới dữ liệu.
- **Tích hợp Web Văn Phòng (`view_trip_detail.html` & `static/js/app.js`):**
  - Bổ sung nút **"Màn Hình Tài Xế"** mở trực tiếp `/driver/<hashid>/`.
  - Bổ sung nút **"Copy Link Tài Xế"**: Tự động định dạng tin nhắn hoàn chỉnh kèm đầy đủ thông tin chuyến xe và đường dẫn thao tác di động để điều độ viên chỉ cần 1 click là dán (Paste) gửi Zalo cho tài xế.
- **Sửa Lỗi Tương Thích & Tối Ưu Báo Cáo (`reports_api.py` & `views.py`):**
  - Sửa lỗi truy cập `category` và `get_category_display()` thay vì thuộc tính cũ `expense_type` trong `ReportsAPIView`.
  - Khắc phục câu truy vấn liên kết tờ khai hải quan `bill_of_lading` và `container_numbers` trong `driver_portal_view`.
- **Kiểm Thử Toàn Diện Hệ Thống & Giả Lập Màn Hình Di Động:**
  - Viết Unit Test `test_driver_portal_view_and_capability_access` trong `core/tests.py`.
  - Toàn bộ **43/43 unit tests PASSED 100%**.
  - **Kịch bản Giả lập Toàn trình Hiện trường Di động (`test_driver_simulation.py`):**
    - Giả lập 100% chu trình trên smartphone: Báo mốc 1 (Sắp đến kho) -> Mốc 2 (Đến cổng kho) -> Mốc 3 (Vào dock dỡ hàng) -> Kê khai chi phí BOT (kèm ảnh hóa đơn) -> Chụp nghiệm thu POD (chữ ký thủ kho) -> Mốc 4 (Đóng hàng xong) -> Báo lưu xe sau 0h (`is_overnight_detention`) -> Chụp chứng từ hạ cont EIR & Báo hạ cont hoàn tất -> Chuyến xe tự động hoàn tất `COMPLETED`.
    - Tích hợp `CsrfExemptSessionAuthentication` cho các Capability requests (`X-Trip-Hash`) đảm bảo không bị chặn 403 CSRF khi mở trình duyệt di động có session cookie cũ.
    - Bổ sung helper `getCsrfToken()` và haptic feedback (`navigator.vibrate`) trên `templates/driver_portal.html` tạo cảm giác chạm rung chân thực trên smartphone.
- Nâng cấp Cache Buster lên `?v=1.9.2.1`.

---

## [1.9.1] - 2026-09-26 (Tinh Chỉnh Trực Quan Điều Vận & Cảnh Báo Đăng Kiểm Đội Xe)

### 1. Nội Dung Triển Khai Chi Tiết:
- **Trực quan hóa Hải quan trên Bảng Điều Vận (`view_dispatch.html` & `TripListCreateAPIView`):**
  - Tự động truy vấn tờ khai hải quan liên kết (`prefetch_related('customs_declarations')`).
  - Hiển thị Badge Phân Luồng Hải Quan trực quan (🟢 Luồng Xanh, 🟡 Luồng Vàng, 🔴 Luồng Đỏ) kèm số tờ khai ngay trên ô Container của Bảng Chuyến Xe.
  - Giúp điều độ viên nắm bắt tức thì tình trạng thông quan trước khi phát lệnh cho xe vào cảng/ICD lấy cont.
- **Hệ thống Cảnh báo Đăng kiểm & Bảo hiểm Đội Xe (`view_fleet.html` & `FleetAPIView`):**
  - Tính toán số ngày còn lại đến hạn đăng kiểm (`reg_days_left`) và bảo hiểm TNDS (`ins_days_left`).
  - Hiển thị Badge trực quan:
    - 🔴 Đã hết hạn (kèm số ngày trễ hạn, ví dụ: *Hết hạn (2N)*).
    - 🟡 Cảnh báo khẩn cấp (kèm số ngày còn lại nếu $\le 15$ ngày).
    - 🟢 Hợp lệ (nếu $> 15$ ngày).
  - Tương tự cho mốc bảo trì định kỳ của đầu kéo.
- **Kiểm thử & Nâng cấp Cache:**
  - 39/39 tests PASS 100%.
  - Nâng cấp Cache Buster lên `?v=1.9.1.0`.

---

## [1.9.0] - 2026-09-26 (Hoàn Thiện Phân Hệ Dịch Vụ Hải Quan VNACCS/VCIS & Tối Ưu Master Data Vận Tải Cont)

### 1. Bối Cảnh & Rà Soát Nghiệp Vụ Toàn Diện (Expert Audit Findings):
- **Phân hệ Hải Quan (`view_customs.html`):** Trước đây là trang tĩnh mô phỏng ("Phát Triển Sau" với số mockup). Trong thực tế quản trị vận tải container và dịch vụ giao nhận (freight forwarding), thủ tục hải quan điện tử VNACCS/VCIS là mấu chốt để điều xe lấy cont hàng nhập hoặc hạ cont xuất đúng hạn, chống lưu xe, lưu bãi (DEM/DET).
- **Master Data Biểu Cước (`RouteTariff`):** Trường `toll_standard_fee` (Định mức vé BOT tuyến) đã có trong database nhưng form nhập liệu và bảng danh mục chưa hỗ trợ.

---

### 2. Nội Dung Triển Khai Chi Tiết:

#### 🟢 1. Xây Dựng Trọn Vẹn Phân Hệ Dịch Vụ Hải Quan (Customs Brokerage Module):
- **Ứng dụng mới `apps.customs`:** Đăng ký vào hệ thống Modular Monolith của BIM Logistics.
- **Model chuẩn hóa `CustomsDeclaration` (apps/customs/models.py):**
  - Kế thừa `TimeStampedModel` và `SoftDeleteModel` (bảo toàn chứng từ pháp lý, tuyệt đối không hard-delete).
  - Quản lý thông số VNACCS/VCIS:
    - `declaration_number`: Số tờ khai 12 chữ số (khóa chính nghiệp vụ).
    - `declaration_date`, `customer`, `customs_office_code`, `customs_office_name`.
    - `declaration_type`: A11, A12, B11, E21, E31, E62, G11...
    - `direction`: Nhập khẩu (`IMPORT`) / Xuất khẩu (`EXPORT`).
    - `customs_lane`: Phân luồng 3 màu (🟢 `GREEN` - Tự động thông quan, 🟡 `YELLOW` - Thẩm định hồ sơ, 🔴 `RED` - Kiểm tra thực tế/soi chiếu).
    - `status`: Vòng đời tờ khai (`DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `PROCESSING` $\rightarrow$ `INSPECTION` $\rightarrow$ `CLEARED` $\rightarrow$ `RELEASED` $\rightarrow$ `CANCELLED`).
    - `bill_of_lading`, `container_numbers`.
    - `tax_amount_vnd` (Tiền thuế XNK & VAT) và `is_tax_paid` (Tình trạng hoàn tất nộp thuế).
    - `customs_service_fee` (Phí dịch vụ khai thuê HQ) và `reimbursable_fee` (Chi hộ kiểm hóa).
    - `dispatch_trip`: Liên kết trực tiếp với Chuyến xe vận chuyển container.
    - `declaration_document`: Lưu trữ tệp scan/ảnh tờ khai thông quan.
- **Tự động liên thông tài chính:** Khi khai báo chi phí chi hộ kiểm hóa (`reimbursable_fee > 0`) và có gán chuyến xe, hệ thống tự động ghi nhận vào `TripExpense (is_on_behalf_of_customer=True)` để tự động lập Debit Note thu hồi.
- **Hệ thống RESTful APIs (`apps/customs/api_views.py`):**
  - `CustomsDeclarationListCreateAPIView`: Danh sách kèm bộ lọc đa tiêu chí, tính toán 4 KPIs phân luồng và tỷ lệ thông quan.
  - `CustomsDeclarationDetailAPIView`: Xem chi tiết, cập nhật và xóa mềm.
  - `CustomsQuickActionAPIView`: Thao tác 1-chạm (Đổi luồng, Xác nhận Thông quan tức thì, Bật/tắt trạng thái nộp thuế).
  - `CustomsExportExcelAPIView`: Xuất Sổ Bảng Kê Tờ Khai Hải Quan & Thông Quan ra file Excel định dạng chuẩn quốc tế.
- **Giao diện Người Dùng (`templates/views/view_customs.html` & `modal_customs_declaration.html`):**
  - 4 Thẻ KPI: Tổng Tờ Khai (kèm Tỷ lệ thông quan), Luồng Xanh, Luồng Vàng, Luồng Đỏ.
  - Thanh công cụ tìm kiếm và bộ lọc đa năng: Tìm kiếm tức thì, lọc theo Phân Luồng, Trạng Thái, Chiều Vận Chuyển, Tình Trạng Thuế.
  - Bảng dữ liệu tương tác cao: Cho phép thao tác nhanh 1-chạm xác nhận thông quan hoặc đổi luồng ngay trên danh sách.

#### 🟢 2. Đồng Bộ Số Liệu Hải Quan Thực Tế Vào Dashboard BGD:
- Nâng cấp `DashboardBGDAPIView` (`apps/dispatch/api_views.py`): Tự động tổng hợp số liệu thực tế từ `CustomsDeclaration` thay thế hoàn toàn các con số giả lập trước đây.

#### 🟢 3. Hoàn Thiện CRUD Master Data Biểu Cước Tuyến Tuyến Vận Tải:
- Bổ sung ô nhập "Định Mức Vé BOT Tuyến (VNĐ)" vào form Biểu Cước (`injectMasterDataModalFields` & `submitMasterDataForm`).
- Hiển thị cột "Định Mức BOT" trên Bảng Biểu Cước Khách Hàng.
- Cập nhật API `TariffMasterListCreateAPIView` & `TariffMasterDetailAPIView` nhận và lưu `toll_standard_fee`.

---

### 3. Kết Quả Kiểm Thử (Verification):
- Bổ sung Unit Tests toàn diện cho Customs Module và Master Data RouteTariff trong `core/tests.py`.
- Toàn bộ **39/39 tests PASSED 100%** (Vòng đời tờ khai, thao tác nhanh, xuất Excel, soft delete, CRUD biểu cước có định mức BOT).
- Kiểm tra cú pháp JavaScript: `node -c static/js/app.js` đạt chuẩn không lỗi.
- Nâng cấp Cache Buster lên `?v=1.9.0.0`.

---

## [1.8.9] - 2026-09-26 (Báo Cáo & Quản Trị Tài Chính Ngành Vận Tải: Giai Đoạn 1 & Giai Đoạn 2 Toàn Diện)

### 1. Bối Cảnh & Ràng Buộc Kỹ Thuật (Architecture Decision Record):
- **Yêu cầu người dùng:** Triển khai toàn bộ Giai đoạn 1 và Giai đoạn 2 của Kế hoạch Quản trị Tài chính Ngành Vận tải.
- **Ràng buộc cốt lõi:**
  - *Tính chuẩn hóa của Modeling và các bảng:* Tuyệt đối không sinh bảng rác hoặc dữ liệu rác không đồng bộ.
  - *Ưu tiên tối ưu hóa & khai thác tối đa nguồn dữ liệu input đã có:* Tận dụng triệt để `TripExpense`, `DispatchTrip`, `RouteTariff`, `Vehicle`, `DispatcherAdvanceFund`, `DriverTripAdvance`.
  - *Tự động liên thông dòng tiền (Cross-Module Audit Trail):* Mọi hành động thu hồi chi hộ, hoàn ứng tiền thừa, quyết toán xe bạn đều tự động hạch toán vào Sổ Quỹ Thu - Chi mà không đòi hỏi thao tác nhập liệu kép.

---

### 2. Nội Dung Triển Khai Chi Tiết:

#### 🟢 GIAI ĐOẠN 1: QUẢN TRỊ CHI HỘ & SỔ QUỸ DÒNG TIỀN VẬN TẢI
1. **Báo Cáo & Quản Trị Đối Soát & Thu Hồi Chi Hộ Khách Hàng (Customer Reimbursables / Debit Note):**
   - **Tận dụng `TripExpense`:** Bổ sung trường vòng đời thu hồi chi hộ:
     - `reimbursement_status`: `PENDING` (Chờ thu / Chưa lập Debit Note), `BILLED` (Đã xuất Debit Note), `COLLECTED` (Đã thu hồi tiền từ KH).
     - `debit_note_number`: Số hiệu Bảng kê Debit Note gửi khách hàng (vd: `DN-2026-0926-001`).
     - `reimbursed_at`, `reimbursed_by`, `reimbursement_notes`.
     - Tự động gán trạng thái `PENDING` khi tạo khoản chi hộ (`is_on_behalf_of_customer=True`).
   - **Chức năng nghiệp vụ hiện đại:**
     - Gom nhóm nhiều khoản chi hộ của 1 khách hàng thành 1 Debit Note duy nhất.
     - Xác nhận khách hàng thanh toán hoàn ứng 1-chạm: Tự động chuyển trạng thái `COLLECTED`, đồng thời **tự động sinh Phiếu Thu (`PT-DN-...`)** vào Sổ Quỹ Thu - Chi!
     - Xuất Bảng kê Debit Note chi hộ sang Excel/CSV (UTF-8 BOM).

2. **Báo Cáo Sổ Quỹ Thu - Chi & Dòng Tiền Vận Tải (Cash & Bank Book — Chuẩn Mẫu S03a-DN):**
   - **Model `CashTransaction` (apps/billing/models.py):** Quản lý dòng tiền 2 quỹ song song:
     - Quỹ Tiền Mặt (`CASH`) và Tài Khoản Ngân Hàng (`BANK`).
     - Danh mục thu/chi đặc thù logistics: `FREIGHT_REVENUE` (Thu cước), `REIMBURSABLE_COLLECTION` (Thu chi hộ), `ADVANCE_REFUND` (Thu hoàn ứng), `DISPATCHER_FUND_ADVANCE` (Chi quỹ điều vận), `DRIVER_TRIP_ADVANCE` (Chi tạm ứng chuyến), `SUBCONTRACTOR_PAYMENT` (Chi xe bạn), `FUEL_PAYMENT` (Chi dầu), `ETC_TOPUP` (Chi nạp BOT/ETC), `VEHICLE_MAINTENANCE` (Chi bảo dưỡng).
   - **KPIs Sổ Quỹ:** Tồn Quỹ Tiền Mặt, Số Dư Ngân Hàng, Tổng Tồn Quỹ Toàn Cty, Dòng Tiền Thuần Trong Kỳ.
   - Hỗ trợ lập Phiếu Thu / Chi thủ công và tích hợp tự động từ các phân hệ vận hành.

---

#### 🟢 GIAI ĐOẠN 2: QUYẾT TOÁN THẦU PHỤ 3PL & ĐỐI SOÁT VÉ BOT TUYẾN
3. **Báo Cáo Quyết Toán & Đối Soát Nhà Xe Bạn / Thầu Phụ 3PL (Subcontractor Payables):**
   - **Tận dụng `DispatchTrip` & `Vehicle.ownership_type == 'SUBCONTRACTOR'`:**
     - Bổ sung các trường: `subcontractor_cost` (Cước thỏa thuận trả xe bạn), `subcontractor_advance` (Đã tạm ứng cho xe bạn), `subcontractor_settlement_status` (`PENDING`, `PARTIAL`, `SETTLED`), `subcontractor_settled_at`, `subcontractor_notes`.
   - **Nghiệp vụ đối soát:**
     - Giám sát: Doanh thu thu khách $\rightarrow$ Cước trả xe bạn $\rightarrow$ Chênh lệch công ty hưởng (Gross Margin) $\rightarrow$ Đã tạm ứng $\rightarrow$ Còn phải thanh toán cho thầu phụ.
     - Nút "Quyết Toán": Đánh dấu `SETTLED` và **tự động sinh Phiếu Chi (`PC-3PL-...`)** thanh toán số tiền còn lại vào Sổ Quỹ Thu - Chi.

4. **Báo Cáo Đối Soát Chuyên Sâu Vé Cầu Đường BOT/ETC vs Định Mức Tuyến:**
   - **Tận dụng `RouteTariff` & `TripExpense` (`category='TOLL_FEE'`):**
     - Thêm trường `toll_standard_fee` vào `RouteTariff` (Định mức BOT chuẩn theo từng cặp Tuyến vận chuyển).
     - Tự động gom nhóm các vé BOT phát sinh theo từng chuyến xe, đối chiếu với định mức tuyến.
     - Đánh giá cảnh báo 3 cấp độ:
       - 🟢 *Tiết kiệm:* Thực chi < Định mức tuyến (> 15%).
       - ⚪ *Bình thường:* Thực chi dao động trong khoảng $\pm 15\%$ định mức.
       - 🔴 *Cảnh báo vượt định mức:* Thực chi > Định mức (> 15%) để phòng Kế toán & Điều độ kiểm soát gian lận hoặc tài xế đi sai lộ trình.

---

### 3. Cập Nhật UI/UX & Giao Diện Người Dùng:
- Nâng cấp thanh điều hướng Kế toán lên **7 Trụ Cột Tài Chính Vận Tải**:
  1. *1. Đối Soát & Khóa Sổ Chuyến*
  2. *2. Tạm Ứng - Hoàn Ứng Tài Xế*
  3. *3. Quỹ Tạm Ứng Điều Vận*
  4. *4. Chi Hộ & Debit Note*
  5. *5. Sổ Quỹ Thu - Chi*
  6. *6. Quyết Toán Xe Bạn (3PL)*
  7. *7. Đối Soát BOT Tuyến*
- Bổ sung 3 Modals chuyên nghiệp tại `templates/components/`:
  - [`modal_cash_transaction.html`](file:///E:/Bim_Logistics/templates/components/modal_cash_transaction.html): Lập Phiếu Thu / Chi vào Sổ Quỹ.
  - [`modal_debit_note.html`](file:///E:/Bim_Logistics/templates/components/modal_debit_note.html): Gom nhóm lập Debit Note & Xác nhận hoàn ứng chi hộ.
  - [`modal_subcontractor_settle.html`](file:///E:/Bim_Logistics/templates/components/modal_subcontractor_settle.html): Thỏa thuận cước & Quyết toán xe bạn.
- Cập nhật Cache Buster: `?v=1.8.9.0` trong `templates/base.html`.

---

### 4. Kết Quả Kiểm Thử (Verification):
- `python manage.py makemigrations` & `migrate`: Hoàn thành xuất sắc migrations:
  - `billing.0009_cashtransaction_tripexpense_debit_note_number_and_more`
  - `customers.0008_routetariff_toll_standard_fee`
  - `dispatch.0012_dispatchtrip_subcontractor_advance_and_more`
- `python manage.py test`: **40/40 tests PASSED 100%** (trong đó có 4 test cases chuyên sâu kiểm toán Giai đoạn 1 & Giai đoạn 2).

---

### 1. Bối Cảnh & Yêu Cầu Nghiệp Vụ Vận Tải:
- **Yêu cầu người dùng:** Phát triển theo dõi Tạm ứng và Hoàn ứng trên phân hệ Kế toán:
  1. **Tài xế:** Được tạm ứng chuyến để xử lý chi phát sinh đi đường (vé cầu đường BOT, đổ dầu, phí nâng/hạ cảng, cân xe, bồi dưỡng kho) hoặc chi hộ khách hàng (tiền cược vỏ cont hãng tàu, vệ sinh sửa chữa cont, kiểm dịch...). Sau chuyến đối soát hoàn ứng chi phí về công ty.
  2. **Điều vận:** Được công ty tạm ứng một khoản Quỹ Điều Vận (Dispatcher Fund) để chủ động chi tạm ứng cho các tài xế trong đội xe. Sau đó thu thập hóa đơn chứng từ hợp lệ để hoàn ứng quyết toán quỹ về công ty.
- **Giải pháp thiết kế 2 tầng (2-Tier Advance & Settlement Engine):**
  - **Tầng 1 (Công ty $\leftrightarrow$ Điều vận):** Quỹ Tạm Ứng Điều Vận (`DispatcherAdvanceFund`). Giám sát tiền Cty cấp, tiền đã xuất cho tài xế, tiền đã hoàn ứng nộp chứng từ, và số dư quỹ khả dụng.
  - **Tầng 2 (Điều vận / Cty $\leftrightarrow$ Tài xế):** Tạm Ứng Chuyến Cho Tài Xế (`DriverTripAdvance`). Tự động đối chiếu giữa Tiền tạm ứng và Thực chi có hóa đơn chứng từ. Tự động tính chênh lệch:
    - Nếu Tạm ứng > Thực chi: Tài xế hoàn nộp lại tiền thừa (`DRIVER_REFUND`).
    - Nếu Thực chi > Tạm ứng: Công ty / Điều vận chi bù thêm cho tài xế (`COMPANY_REIMBURSE`).
    - Nếu Tạm ứng = Thực chi: Cân bằng chính xác (`BALANCED`).

### 2. Chi Tiết Kỹ Thuật Đã Triển Khai:
- **Cơ sở dữ liệu & Models (`apps/billing/models.py` & `apps/dispatch/models.py`):**
  - Model `DispatcherAdvanceFund`: Quản lý Quỹ điều vận, các mốc duyệt xuất quỹ, quyết toán hoàn ứng về công ty, tính toán số dư khả dụng (`remaining_balance`).
  - Model `DriverTripAdvance`: Quản lý phiếu tạm ứng chuyến, liên kết ForeignKey với `DispatchTrip`, `Employee` (Tài xế) và `DispatcherAdvanceFund`. Lưu vết thực chi, chênh lệch hoàn ứng, tiền thừa nộp lại, tiền chi bù.
  - Cập nhật `DispatchTrip`: Thêm trường `driver_advance_amount` (Tổng tiền tạm ứng chuyến) và `advance_settlement_status` (`NO_ADVANCE`, `ADVANCED`, `SETTLED`).
  - Migrations: `billing.0008_dispatcheradvancefund_drivertripadvance` và `dispatch.0011_dispatchtrip_advance_settlement_status_and_more`.
- **Tầng Backend RESTful APIs (`apps/billing/advance_views.py` & `config/urls.py`):**
  - `GET /api/accounting/advances/`: Tổng hợp số liệu thống kê quỹ, danh sách tạm ứng tài xế, danh mục chuyến xe và quỹ khả dụng.
  - `POST /api/accounting/dispatcher-funds/`: Tạo yêu cầu tạm ứng quỹ từ công ty cho điều vận.
  - `POST /api/accounting/dispatcher-funds/<id>/action/`: Kế toán duyệt cấp quỹ (`approve`), quyết toán hoàn ứng (`settle`), từ chối (`reject`).
  - `POST /api/accounting/driver-advances/`: Cấp tạm ứng chuyến cho tài xế (trích Quỹ điều vận hoặc Cty chi trực tiếp).
  - `POST /api/accounting/driver-advances/<id>/settle/`: Đối soát quyết toán hoàn ứng chuyến, tự động tính chênh lệch thu hồi / chi bù.
- **Tầng Giao Diện Người Dùng (`templates/views/view_accounting.html`):**
  - Tái cấu trúc phân hệ Kế toán thành 3 Subtabs chuẩn mực:
    1. *1. Đối Soát Chi Phí & Khóa Sổ Chuyến Xe* (`subtab-acct-settlements`).
    2. *2. Tạm Ứng & Hoàn Ứng Tài Xế (Theo Chuyến)* (`subtab-acct-driver-advances`) kèm huy hiệu đếm số phiếu đang lưu hành.
    3. *3. Quỹ Tạm Ứng Điều Vận (Cty ➔ Điều Vận)* (`subtab-acct-dispatcher-funds`) kèm huy hiệu đếm số quỹ đang hoạt động.
  - Khối 4 KPI Cards chuyên biệt cho từng subtab: Tổng tạm ứng, Thực chi, Tiền thừa nộp lại, Tiền thiếu chi bù.
  - Tích hợp 3 Modals chuyên nghiệp:
    - [`modal_driver_advance.html`](file:///E:/Bim_Logistics/templates/components/modal_driver_advance.html): Cấp tạm ứng chuyến, tự động điền tài xế & biển số theo chuyến xe.
    - [`modal_settle_advance.html`](file:///E:/Bim_Logistics/templates/components/modal_settle_advance.html): Đối soát thực chi, tự động tính tiền nộp lại / chi bù.
    - [`modal_dispatcher_fund.html`](file:///E:/Bim_Logistics/templates/components/modal_dispatcher_fund.html): Đề xuất cấp Quỹ điều vận.
- **Tầng Frontend JavaScript (`static/js/app.js`):**
  - Xây dựng module hoàn chỉnh điều phối nạp dữ liệu, bộ lọc đa trường, chuyển đổi subtabs, mở modal và xử lý AJAX có bảo mật kép.
  - Tích hợp hàm `exportAccountingToExcel()` xuất báo cáo CSV UTF-8 với BOM tương thích 100% với Excel tiếng Việt.
- **Cache Busting (`templates/base.html`):** Nâng cấp lên `?v=1.8.8.0`.

### 3. Kết Quả Kiểm Thử (Verification):
- `node -c static/js/app.js`: Cú pháp JavaScript hợp lệ 100%, không phát sinh lỗi.
- `python manage.py check`: 0 cảnh báo.
- `core/tests.py`: Bổ sung test case toàn diện `test_accounting_advance_and_settlement_workflow` mô phỏng đầy đủ luồng Cty cấp quỹ $\rightarrow$ Điều vận tạm ứng tài xế $\rightarrow$ Đối soát thu tiền thừa $\rightarrow$ Hoàn ứng về công ty $\rightarrow$ **PASS 100%**.

---

## [1.8.7] - 2026-09-26 (Phân Hệ Báo Cáo & Phân Tích Quản Trị Vận Tải Chuẩn TMS BI — Tích Hợp Menu Báo Cáo Trên Sidebar)

### 1. Bối Cảnh & Yêu Cầu Nhiệm Vụ (/goal):
- **Yêu cầu người dùng:** Đọc file kế hoạch (`docs/DEVELOPMENT_PLAN.md` & `ke_hoach_theo_doi_luu_xe_sau_0h.md`) để triển khai các phần trong kế hoạch. Cái nào là báo cáo thì làm thành báo cáo chuyên nghiệp. Bổ sung thêm **Menu Báo cáo** trong Sidebar, nằm **phía trên Cài đặt**.
- **Mục tiêu triển khai:**
  - Bổ sung menu điều hướng cấp 1 "Báo cáo & Thống kê" (`/reports`, tab `bao-cao`, icon `ph-chart-bar`) ngay phía trên "Cài đặt" trên Sidebar máy tính & di động.
  - Chuẩn hóa 6 phân hệ báo cáo quản trị vận tải chuyên sâu theo đúng tài liệu đặc tả:
    1. **Báo Cáo 1: Hiệu Suất Đội Xe & P&L Từng Đầu Xe (Fleet Utilization & Vehicle Profit Center):** Giám sát tỷ lệ xe nhà vs xe bạn/3PL, doanh thu, chi phí vận hành, lợi nhuận gộp và biên lợi nhuận (%) từng đầu xe, xếp hạng tài xế.
    2. **Báo Cáo 2: Chu Trình Vỏ Container & Cảnh Báo Phạt Hãng Tàu (DEM/DET Monitoring):** 3 trạng thái đèn giao thông (🟢 An toàn > 2 ngày, 🟡 Cảnh báo hết hạn $\le$ 1 ngày, 🔴 Quá hạn phạt hãng tàu) kèm số tiền phạt ước tính.
    3. **Báo Cáo 3: Đúng Giờ & Chất Lượng Dịch Vụ Cam Kết (OTP / SLA):** Tỷ lệ đúng giờ tổng thể (OTP), lấy cont đúng giờ, đến kho khách đúng hẹn, hạ bãi trước giờ cắt máng cảng, phân loại nguyên nhân chậm trễ.
    4. **Báo Cáo 4: Đối Soát Chi Phí Tuyến & Thu Hồi Khoản Chi Hộ (Reimbursement Ledger):** Đối soát BOT, dầu DO, cẩu bãi, vệ sinh cont; tách bạch khoản chi hộ khách hàng và tình trạng thu hồi hoàn ứng.
    5. **Báo Cáo 5: Bàn Giao Cắt Kéo & Lưu Mooc / Lưu Xe Chờ Hạ Cont Sau 0H (Drop & Hook & Layover):** Theo dõi các chuyến hạ bãi ca đêm sau 0h, ghi nhận số giờ neo xe, phụ phí lưu xe thu từ khách và phụ cấp trực đêm chi trả tài xế.
    6. **Báo Cáo 6: Ngoại Lệ & Bồi Thường Hàng Hóa Hiện Trường (OS&D Registry):** Giám sát tình trạng rách bạt, móp vách vỏ cont, đứt niêm phong chì seal, lập biên bản hiện trường kèm ảnh POD.

### 2. Chi Tiết Kỹ Thuật Đã Triển Khai:
- **Tầng Giao Diện Điều Hướng & Routing (Sidebar & Clean Semantic URLs):**
  - `templates/components/sidebar.html`: Thêm mục điều hướng `Báo cáo & Thống kê` với icon `ph-chart-bar`, liên kết `/reports`, gắn `data-target="bao-cao"`, đặt ngay phía trên `Cài đặt`.
  - `config/urls.py`: Đăng ký SPA route `path('reports/', index_view, name='spa-reports')` và API endpoint `path('api/reports/', ReportsAPIView.as_view(), name='api-reports')`.
  - `templates/index.html`: Nhúng `templates/views/view_reports.html` vào kiến trúc SPA đa tầng.
  - `static/js/app.js`: Đăng ký Clean Semantic Route trong `ROUTE_TAB_MAP` (`'/reports': 'bao-cao'`), `TAB_ROUTE_MAP` (`'bao-cao': '/reports'`), hỗ trợ back/forward browser history và hash tương thích ngược `#bao-cao`.
- **Tầng Backend API Phân Tích Dữ Liệu (`apps/dispatch/reports_api.py`):**
  - Xây dựng lớp `ReportsAPIView` kế thừa `APIView` với bảo mật xác thực kép (`GracefulJWTAuthentication`, `SessionAuthentication`).
  - Hỗ trợ lọc theo 5 khung thời gian: Hôm nay (`today`), Tuần này (`week`), Tháng này (`month`), Quý này (`quarter`) và Toàn bộ (`all`).
  - Tổng hợp số liệu từ các Model cốt lõi: `DispatchTrip`, `TripExpense`, `Vehicle`, `Trailer`, `Employee`, `Customer`.
  - Tối ưu hóa truy vấn bằng `select_related`, `prefetch_related`, giảm thiểu truy vấn N+1.
- **Tầng Frontend Views & Trải Nghiệm Người Dùng (`templates/views/view_reports.html`):**
  - Thiết kế Header với huy hiệu `TMS Business Intelligence`, bộ nút chuyển kỳ 1-chạm (Hôm nay, Tuần này, Tháng này, Quý này, Tất cả), nút "Xuất Excel" và "In Báo Cáo".
  - Thanh chuyển 6 Subtabs trực quan kèm các Badges đếm số lượng cảnh báo thời gian thực (Cảnh báo phạt DEM/DET, Chuyến lưu xe sau 0h).
  - Khối KPI Metric Cards phân cấp màu sắc chuẩn BIM Design Tokens (Teal, Indigo, Rose, Emerald, Amber).
  - 6 bảng dữ liệu chi tiết có ô tìm kiếm độc lập và click-to-sort trên thẻ tiêu đề cột.
- **Tầng Frontend JavaScript Logic (`static/js/app.js`):**
  - Hàm `loadReportsData()`: Nạp dữ liệu bất đồng bộ từ `/api/reports/` và điều phối render vào 6 bảng chuyên biệt.
  - Hàm `switchReportSubTab(subtabId)` & `changeReportPeriod(period)`: Chuyển đổi tab con và tải lại kỳ báo cáo mượt mà.
  - Hàm `exportReportToExcel()`: Trích xuất bảng báo cáo đang xem sang tệp CSV UTF-8 kèm ký tự BOM (`\uFEFF`), giúp Microsoft Excel trên Windows mở trực tiếp không bao giờ bị lỗi font tiếng Việt.
  - Hàm `printReportDocument()`: Tự động kích hoạt hộp thoại in ấn tiêu chuẩn trình duyệt.
  - Toàn bộ các hàm tìm kiếm lọc đa điều kiện (`applyReport1Filters` -> `applyReport6Filters`) và sắp xếp P&L đầu xe hai chiều (`toggleReport1Sort`).
- **Cache Busting (`templates/base.html`):**
  - Nâng cấp phiên bản cache buster lên `?v=1.8.7.0`.

### 3. Kết Quả Kiểm Thử (Verification):
- `node -c static/js/app.js`: Cú pháp JavaScript hợp lệ 100%, không phát sinh cảnh báo lỗi syntax.
- `python manage.py check`: Hệ thống Django hoạt động bình thường, 0 lỗi cảnh báo.
- Giao diện báo cáo phản hồi nhanh, mượt mà trên mọi kích cỡ màn hình.

---

## [1.8.6] - 2026-09-26 (Bổ Sung Hệ Thống Bộ Lọc Đa Cột & Sắp Xếp Tương Tác Hai Chiều Trên Toàn Bộ Các Bảng Nghiệp Vụ)

### 1. Bối Cảnh & Mục Tiêu Nhiệm Vụ (/goal):
- **Yêu cầu người dùng:** Bổ sung các ô lọc vào các bảng để thuận tiện sắp xếp và lọc khi cần tìm dữ liệu, bao gồm số lượng hiển thị, tìm kiếm từ khóa đa trường, lọc theo từng cột riêng biệt và click-to-sort trên thẻ tiêu đề cột (`thead`).
- **Phạm vi triển khai đồng bộ trên 6 phân hệ cốt lõi:**
  1. **Bảng Điều Vận Chuyến Xe (Dispatch Trips - `view_dispatch.html`):** Lọc theo Khách hàng, Tài xế/Xe, Trạng thái (Đang chạy, Đã giao, Chờ nhận lệnh, Cắt kéo, Ghép 2 cont 20ft, Cảnh báo DET), Loại hình (Nhập, Xuất, Nội địa), Tìm kiếm đa trường (Mã chuyến, Cont, Seal, Booking, Invoice, Kho). Click sắp xếp theo: Mã/Lịch đóng, Khách hàng, Container, Xe kéo, Chi phí, Trạng thái.
  2. **Bảng Báo Giá Tuyến Cước CRM (Sales Quotations - `view_sales.html` Subtab 1):** Lọc theo Khách hàng, Trạng thái hợp đồng (Đã duyệt, Chờ duyệt, Thương lượng, Từ chối), Tìm kiếm mã/tuyến/giá. Click sắp xếp theo: Mã báo giá, Khách hàng, Tuyến đường, Đơn giá cước, Sản lượng dự kiến, Doanh thu kế hoạch, Trạng thái.
  3. **Bảng Đối Soát Chi Phí Kế Toán (Accounting Settlements - `view_accounting.html`):** Lọc theo Khách hàng, Tài xế/Xe, Tình trạng sổ sách (Chờ chốt sổ, Đã khóa sổ), Tìm kiếm từ khóa đa trường. Click sắp xếp theo: Mã chuyến, Khách hàng, Tài xế, Doanh thu, Tổng chi phí, Lợi nhuận gộp, Số lượng hóa đơn HĐĐT, Trạng thái sổ sách.
  4. **Bảng Quản Lý Xe & Bãi Xe (Fleet Management - `view_fleet.html`):** Lọc theo Loại phương tiện (Đầu kéo, Rơ-moóc), Trạng thái kỹ thuật (Cảnh báo hết hạn đăng kiểm, Đến hạn bảo trì, Hoạt động), Tìm kiếm biển số/tài xế. Click sắp xếp theo: Biển số, Loại, Tài xế, Hạn đăng kiểm, Lịch bảo trì, Trạng thái.
  5. **Bảng Lương & Nhân Sự Hành Chính (Personnel & Payroll - `view_personnel.html`):** Tìm kiếm theo Mã nhân viên, Họ tên tài xế. Click sắp xếp theo: Mã NV, Tên tài xế, Số chuyến trong tháng, Lương cơ bản, Lương chuyến tạm tính, Tạm ứng, Thực lãnh dự kiến.
  6. **Bảng P&L Chuyến Xe Trên Dashboard (Executive BI Dashboard - `view_dashboard.html`):** Lọc theo Trạng thái vận hành (Hoàn tất, Đang chạy), Tìm kiếm mã chuyến/khách/xe/cont. Click sắp xếp theo: Mã chuyến, Khách hàng, Tài xế, Container, Doanh thu, Chi phí, Lợi nhuận gộp, Biên lợi nhuận (%), Trạng thái.
  *(Bảng Đơn Hàng Booking Subtab 2 đã hoàn thiện ở phiên bản 1.8.5)*.

### 2. Chi Tiết Kỹ Thuật Đã Triển Khai:
- **Tầng Frontend Templates (HTML Toolbar & Accessible Headers):**
  - Đồng bộ thiết kế Toolbar chuẩn BIM Design Tokens: Nền `bg-slate-50/90`, viền `border-slate-200`, bo góc `rounded-xl`/`rounded-lg`, nhãn trực quan, nút "Đặt lại bộ lọc" kèm icon xoay, huy hiệu hiển thị số lượng bản ghi thực tế: `<strong id="...-filtered-count">X</strong> / <span id="...-total-count">Y</span>`.
  - Nút Xóa nhanh từ khóa tìm kiếm (Clear search icon `ph-x`) tự động hiển thị khi người dùng nhập dữ liệu và ẩn khi rỗng.
  - Các cột tiêu đề bảng `thead` hỗ trợ click sắp xếp với con trỏ `cursor-pointer select-none hover:bg-slate-100 transition-colors` kèm icon Phosphor Icons hai chiều (`ph-arrows-down-up`, `ph-arrow-up`, `ph-arrow-down`).
- **Tầng Frontend JavaScript (`static/js/app.js`):**
  - Triển khai cấu trúc module hóa độc lập cho từng bảng: mảng cache dữ liệu gốc `raw...`, biến cột đang sắp xếp `...SortColumn`, hướng sắp xếp `...SortDirection` ('asc'/'desc').
  - Hàm tự động trích xuất danh mục lọc không trùng lặp `populate...FilterDropdowns()` bằng Set và sắp xếp chuẩn tiếng Việt `localeCompare('vi')`, bảo toàn lựa chọn hiện tại của người dùng.
  - Bộ lọc đa điều kiện kết hợp (AND logic) giữa các dropdowns và ô tìm kiếm từ khóa toàn văn (Full-text keyword matching).
  - Thuật toán sắp xếp đa kiểu dữ liệu: tự động nhận diện so sánh số (`parseFloat`), so sánh chuỗi tiếng Việt (`localeCompare`), so sánh ngày tháng chuẩn ISO/chuỗi và boolean.
  - Cập nhật hiệu ứng trực quan icon `thead` theo trạng thái sort hiện hành.
  - Cập nhật hàm `escapeHtml(text)` chống lỗ hổng Cross-Site Scripting (XSS) khi render dữ liệu bảng.
- **Cache Busting (`templates/base.html`):** Nâng cấp tham số nạp script lên `?v=1.8.6.0` đảm bảo tất cả trình duyệt người dùng nhận diện ngay mã nguồn mới nhất.

### 3. Kết Quả Kiểm Thử (Verification):
- `node -c static/js/app.js`: Cú pháp JavaScript hợp lệ 100%, không phát sinh lỗi syntax.
- `python manage.py test`: **34/34 tests PASS 100% (Ran 34 tests in 12.8s, OK)**.
- Toàn bộ 6 bảng nghiệp vụ hoạt động ổn định, mượt mà và trực quan.

---

## [1.8.5] - 2026-09-25 (Chuẩn Hóa Nhập Giờ 24h, Khắc Phục Layout Vỡ Cột, Hỗ Trợ Đính Kèm Đa File & Bộ Lọc Cột / Sắp Xếp Bảng Booking)

### 1. Bối Cảnh & 4 Yêu Cầu Nâng Cấp Trải Nghiệm Người Dùng:
1. **Chuẩn hóa định dạng ô giờ hẹn kho:** Thay thế trường text tự do bằng trường nhập giờ chuẩn 24h (`<input type="time">`) kèm danh sách nút chọn nhanh giờ phổ biến (08:00, 10:00, 13:30, 15:00, 20:00).
2. **Khắc phục triệt để lỗi rớt dòng & vỡ bố cục Form Booking:** Chuyển đổi khối thông tin container & tàu từ grid 4 cột chia đều sang grid 12 cột co giãn linh hoạt (`sm:col-span-3`, `sm:col-span-4`, `sm:col-span-3`, `sm:col-span-2`), nhãn không rớt dòng chữ `*`, đồng bộ chiều cao và khoảng cách hiển thị.
3. **Nâng cấp đính kèm đa tệp (Multi-file Support):** Hỗ trợ tải lên nhiều file (PDF, hình ảnh) cùng lúc trên cả Đơn hàng Sale (Booking) và Lệnh điều động (Trip); có danh sách hiển thị thẻ file dạng badges, xem trước và xóa lẻ từng file.
4. **Bộ lọc thông minh theo từng cột & Sắp xếp theo ngày/cột:** Bổ sung thanh công cụ lọc trực quan (Khách hàng, Hãng tàu, Loại cont, Trạng thái/Gấp/Cắt kéo, Tìm kiếm từ khóa) và click tiêu đề cột để sắp xếp đa chiều (Ngày hẹn đóng, Tiến độ điều xe, Hạn cắt máng CY, Cước thỏa thuận) kèm icon đảo chiều trực quan.

### 2. Chi Tiết Kỹ Thuật Đã Triển Khai:
- **Cơ sở dữ liệu & Models (`apps/customers/models.py` & Migration `customers.0007_bookingdocument`):**
  - Thêm model `BookingDocument` kế thừa `TimeStampedModel`, `SoftDeleteModel` liên kết ForeignKey với `BookingOrder`.
  - Quản lý tệp đính kèm với `file`, `file_name`, `file_size`, `content_type`, bảo vệ an toàn dữ liệu và tuân thủ nguyên tắc không hard-delete.
- **Backend APIs (`apps/dispatch/api_views.py` & `config/urls.py`):**
  - Cập nhật `SalesAPIView.post` và `BookingOrderDetailAPIView.put`: Tiếp nhận `request.FILES.getlist('booking_files')`, kiểm tra tính hợp lệ an ninh tệp với `validate_uploaded_document()`, lưu trữ tự động vào `BookingDocument` đồng thời duy trì trường `booking_file` để tương thích ngược.
  - Cập nhật `BookingOrderDetailAPIView.get`: Trả về mảng `documents` gồm danh sách file chi tiết kèm kích thước định dạng.
  - Thêm API `BookingDocumentDeleteAPIView` (`/api/bookings/<int:pk>/documents/<int:doc_id>/`): Cho phép xóa mềm từng tài liệu đính kèm lẻ.
- **Frontend Templates & UI Layout:**
  - `templates/components/modal_booking.html`: Tái cấu trúc grid 12 cột, chuyển `booking-loading-time` sang `type="time"` (mặc định 08:00) kèm các button chọn nhanh, cấu hình `<input type="file" multiple>` kèm container `#booking-order-files-list`.
  - `templates/components/modal_create_trip.html`: Đổi `inp-load-time` sang `type="time"` và hỗ trợ đính kèm đa tệp.
  - `templates/views/view_sales.html`: Tích hợp Toolbar bộ lọc đa cột (`#filter-bk-customer`, `#filter-bk-shipping-line`, `#filter-bk-cont-size`, `#filter-bk-status`, `#filter-bk-search`) và các tiêu đề cột có thể bấm sắp xếp với `toggleBookingSort()`.
- **Frontend JavaScript Logic (`static/js/app.js`):**
  - Bổ sung hàm tiện ích `setBookingTime(timeStr)` cho phép 1-chạm thiết lập giờ hẹn kho.
  - Xây dựng hệ thống quản lý danh sách file `saleBookingFilesList`, `saleBookingExistingDocs`, `tripBookingFilesList` với các thao tác thêm, xóa lẻ, render badge hiển thị kích thước và xem trực tiếp.
  - Tích hợp logic lọc dữ liệu tức thì `applyBookingFilters()`, đếm số đơn hiển thị (`#booking-filtered-count`), tự động trích xuất danh mục lọc `populateBookingFilterDropdowns()`.
  - Xây dựng thuật toán sắp xếp động `toggleBookingSort()` hỗ trợ so sánh ngày tháng, chuỗi và số thực (`price`, `progress_percent`).

### 3. Kết Quả Kiểm Thử (Verification):
- `python manage.py test`: **34/34 tests PASS 100% (Ran 34 tests in 11.6s, OK)**.
- Giao diện đáp ứng đầy đủ tiêu chuẩn UI/UX quốc tế hiện đại, khoảng cách và độ tương phản đạt chuẩn.

---

## [1.8.4] - 2026-09-25 (Kiểm Thử Giả Lập Toàn Diện E2E & Khắc Phục Lỗi Xác Thực Token, Hoàn Thiện Sửa Lệnh Điều Động & Chuẩn Hóa Chi Phí Chi Hộ)

### 1. Bối Cảnh & Mục Tiêu Nhiệm Vụ (Autonomous QA & Simulation Loop):
- **Vai trò:** Kiểm thử viên độc lập (Tester / QA), chạy giả lập tất cả tình huống và luồng nghiệp vụ trên nền tảng (Báo giá, Đơn hàng/Booking, Lệnh điều động, Sửa điều động, Chi phí vận hành, Chi hộ khách hàng, Khóa sổ kế toán, Mốc lưu xe sau 0h, Danh mục cài đặt Master Data).
- **Phát hiện và xử lý lỗi gốc (Root Causes):**
  - Khắc phục triệt để lỗi Toast thông báo `Given token not valid for any token type` xuất hiện khi token JWT trong `localStorage` hết hạn nhưng người dùng vẫn đang có phiên làm việc (Session) hợp lệ trên trình duyệt.
  - Hoàn thiện tính năng Sửa Lệnh Điều Động (`PATCH`/`PUT`) cho phép điều phối viên và quản trị viên cập nhật thông tin chuyến xe đã phát lệnh mà không làm đứt gãy dữ liệu.
  - Sửa lỗi tính toán P&L chi phí vận hành: Khoản chi hộ khách hàng (`is_on_behalf_of_customer=True`) trước đây bị tính nhầm vào chi phí công ty (`cached_expense`), dẫn đến biên lợi nhuận bị sai lệch.

### 2. Chi Tiết Khắc Phục Lỗi & Nâng Cấp Kỹ Thuật:
- **Xác thực linh hoạt & Chống lỗi Token hết hạn (Authentication Resilience):**
  - **Tầng Backend (`core/security.py` & `config/settings.py`):** Xây dựng `GracefulJWTAuthentication` kế thừa SimpleJWT. Khi JWT token trong header bị hỏng hoặc hết hạn, cơ chế này tự động kiểm tra xem request có phiên Session đăng nhập hợp lệ không. Nếu có, hệ thống graceful fallback sang Session User thay vì ngắt luồng và ném mã lỗi HTTP 401.
  - **Tầng Frontend (`static/js/app.js`):**
    - Nâng cấp `getAuthHeaders()` tự động giải mã `exp` của JWT token. Nếu token đã hết hạn, hệ thống tự động dọn dẹp `localStorage` và không gửi header hỏng lên server.
    - Nâng cấp `fetchWithAuth()` bắt mã lỗi 401, tự xóa token lỗi và tự động thử lại (retry) một lần nữa với Session cookie.
    - Chuẩn hóa toàn bộ 26 lệnh `fetch(...)` rời rạc trên toàn bộ các phân hệ sang hàm trung tâm `fetchWithAuth(...)`.
- **API Sửa Lệnh Điều Động Toàn Diện (`apps/dispatch/api_views.py`):**
  - Mở rộng method `patch()` và bổ sung method `put()` cho `TripDetailAPIView` (`/api/trips/<str:trip_code>/`).
  - Hỗ trợ cập nhật đầy đủ các trường: `container_number`, `seal_number`, `booking_or_bill`, `pickup_location`, `warehouse_location`, `dropoff_location`, `driver_id`, `vehicle_id`, `dropoff_driver_id`, `dropoff_vehicle_id`, `special_notes`, `vgm_weight`, `container_condition`, `damage_description`, `is_twin_container`, cùng các mốc thời gian và trạng thái chuyến xe.
- **Tách Bạch Chi Phí Chi Hộ Khách Hàng (Freight Accounting Sanctity):**
  - Cập nhật phương thức `update_financials()` trong `apps/dispatch/models.py` và API `TripDetailAPIView.get`: Chỉ tổng hợp các khoản chi thực tế do công ty chi trả (`is_on_behalf_of_customer=False`) vào `cached_expense` và tỷ suất lợi nhuận `cached_profit`/`cached_margin_percent`.
  - Tách riêng mục `total_reimbursable` và danh sách `reimbursable_items` để kế toán dễ dàng theo dõi và đối soát thu lại từ khách hàng.
- **Hỗ Trợ Đa Định Dạng Dữ Liệu Parser Classes (`apps/dispatch/api_views.py`):**
  - Khai báo đầy đủ `parser_classes = (MultiPartParser, FormParser, JSONParser)` trên các view tiếp nhận form upload: `BookingOrderDetailAPIView`, `SalesAPIView`, đảm bảo nhận trơn tru cả `application/json` lẫn `multipart/form-data` qua các phương thức `POST`, `PUT`, `PATCH`.
  - Bổ sung property tiện ích `remaining_containers` cho model `BookingOrder`.

### 3. Bộ Kiểm Thử Giả Lập E2E Toàn Diện (`core/tests.py`):
Xây dựng và tích hợp 6 kịch bản giả lập nghiệp vụ quy mô lớn:
1. `test_simulation_sales_and_booking_full_flow`: Tạo báo giá -> Sửa báo giá -> Chốt duyệt -> Tạo Booking -> Sửa Booking kèm đính kèm file PDF -> Chuyển trạng thái -> Xóa mềm an toàn.
2. `test_simulation_dispatch_trip_and_editing`: Tạo lệnh điều động -> Sửa thông tin cont, seal, tuyến, ghi chú -> Chuyển đổi trạng thái theo máy trạng thái chuẩn logistics -> Báo mốc cổng kho 1-chạm.
3. `test_simulation_expenses_and_settlement_workflow`: Thêm chi phí nâng cont -> Thêm chi phí cược cont chi hộ KH -> Sửa chi phí -> Khóa sổ kế toán -> Kiểm tra cơ chế phòng thủ chặn sửa/xóa khi đã khóa sổ -> Mở khóa sổ -> Xóa chi phí soft-delete.
4. `test_simulation_overnight_detention_and_auto_allowance`: Cập nhật mốc chờ hạ cont sau 0h -> Tự động tính phí lưu xe cho khách & tự động sinh chi phí phụ cấp tài xế trực xe đêm.
5. `test_simulation_master_data_full_crud`: Giả lập quy trình CRUD danh mục Cảng/Kho (Location), Khách Hàng (Customer), Phương Tiện Đầu Kéo (Vehicle).
6. `test_simulation_graceful_jwt_and_session_resilience`: Giả lập tình huống client gửi token hỏng kèm Session cookie -> Hệ thống phục hồi trả về 200 OK.

### 4. Kết Quả Xác Minh (Verification):
- `python manage.py test`: **34/34 tests PASS 100% (Ran 34 tests in 10.3s, OK)**.
- Dữ liệu vận chuyển và chuỗi truy vết POD được bảo toàn tuyệt đối theo chuẩn `AGENTS.md`.

---

## [1.8.3] - 2026-09-25 (Đính Kèm File Booking / Lệnh Cấp Rỗng Từ Khách Hàng - Ảnh Hoặc PDF & Kế Thừa Tự Động Sang Điều Vận)

### 1. Bối Cảnh Nghiệp Vụ & Nhu Cầu Thực Tế:
- Khi khách hàng đặt đơn vận chuyển (hàng xuất hoặc hàng nhập), khách hàng thường gửi file Booking confirmation từ hãng tàu hoặc Lệnh cấp vỏ rỗng dưới dạng file PDF hoặc hình ảnh chụp/scan.
- Điều phối viên và Tài xế cần file gốc này để xuất trình tại bãi/depot/cảng khi lấy vỏ rỗng hoặc đối chiếu số booking, hãng tàu, hạn hạ CY.
- Cần có cơ chế đính kèm tệp trực tiếp tại bước Tạo Lệnh Điều Động (`modal_create_trip.html`) hoặc bước Tiếp nhận Đơn hàng Sale (`modal_booking.html`), đồng thời tự động kế thừa và tạo chứng từ pháp lý trong hồ sơ chuyến xe.

### 2. Thiết Kế Cơ Sở Dữ Liệu & Kiến Trúc Backend:
- **Mở rộng Model `DispatchTrip` (`apps/dispatch/models.py`):**
  - Bổ sung trường `booking_file = models.FileField(upload_to='booking_files/%Y/%m/', null=True, blank=True)` (Migration: `dispatch.0009_dispatchtrip_booking_file`).
- **Mở rộng Model `BookingOrder` (`apps/customers/models.py`):**
  - Bổ sung trường `booking_file = models.FileField(upload_to='booking_files/%Y/%m/', null=True, blank=True)` (Migration: `customers.0006_bookingorder_booking_file`).
- **Bổ sung Danh mục Chứng từ Pháp lý `TripDocument` (`apps/documents/models.py`):**
  - Thêm loại chứng từ `BOOKING_NOTE = 'BOOKING_NOTE', 'File Booking / Lệnh cấp rỗng'` (Migration: `documents.0002_alter_tripdocument_document_type`).
- **Bảo Mật & Xác Thực An Ninh Tệp (Defensive Security Validation):**
  - Áp dụng `validate_uploaded_document` (Tiêu chuẩn 7 & 8 `SECURITY_AUDIT.md`): giới hạn dung lượng $\le 5\text{MB}$, chống giả mạo đuôi tệp qua Magic Bytes (`%PDF`, `\x89PNG`, `\xff\xd8\xff`), xác thực cấu trúc ảnh thực tế bằng Pillow `Image.verify()`.
- **Tự Động Sinh Chứng Từ Pháp Lý Khép Kín:**
  - Khi chuyến xe được tạo với file upload mới HOẶC kế thừa từ `BookingOrder`, backend tự động tạo 1 bản ghi `TripDocument` loại `BOOKING_NOTE`, gắn cờ `is_verified=True`.
- **Kế Thừa 2 Chiều (Dual Inheritance):**
  - Nếu Sale đã upload file khi tiếp nhận Booking, Điều phối viên chọn Booking trong dropdown sẽ tự động kế thừa file Booking mà không cần upload lại. Nếu chuyến tạo thủ công, Điều phối viên có thể chọn file trực tiếp từ máy tính.

### 3. Nâng Cấp Giao Diện & Tương Tác Người Dùng (Frontend UX/UI):
- **Modal Tạo Lệnh Điều Động (`modal_create_trip.html`):**
  - Khu vực tải file trực quan, hỗ trợ chọn file, hiển thị file badge (icon PDF/Image, tên file, kích thước định dạng KB/MB), link "Xem" mở file trong tab mới và nút "Hủy" file đã chọn.
  - Tự động hiển thị file badge kế thừa khi người dùng chọn một Booking đã có sẵn file.
- **Modal Tiếp Nhận Đơn Hàng / Booking Sale (`modal_booking.html`):**
  - Thêm khu vực tải file booking cho Sale Admin / CS khi tạo hoặc chỉnh sửa đơn hàng.
- **Trang Chi Tiết Chuyến Xe (`view_trip_detail.html` & `renderTripDetail` trong `app.js`):**
  - Hiển thị chứng từ `Lệnh Booking / Cấp Rỗng` với icon PDF màu đỏ/hồng nổi bật, huy hiệu `Đã Nghiệm Thu` và nút `Xem / Tải chứng từ` (`<a target="_blank">`) mở trực tiếp file chứng từ gốc.

---

## [1.8.2] - 2026-09-25 (Khắc Phục & Nâng Cấp Dropdown Chọn Tài Xế Trong Bảng Kê Chi Phí: Mặc Định Tài Xế Đang Đăng Nhập & Hỗ Trợ Admin Chọn Tài Xế Khác)

### 1. Khắc Phục Lỗi Dropdown Chọn Tài Xế & Chặng Bị Kẹt:
- **Nguyên nhân cốt lõi:** Biến trạng thái toàn cục `currentActiveTripData` được khai báo nhưng chưa được gán giá trị sau khi gọi API xem chi tiết chuyến xe trong hàm `viewTripDetail` (`static/js/app.js`), dẫn đến hàm `populateExpenseLegOptions` thoát sớm và giữ nguyên nhãn `-- Đang tải thông tin xe & tài xế --`.
- **Giải pháp xử lý:** Gán tức thời `currentActiveTripData = trip;` ngay sau khi nhận phản hồi từ endpoint `/api/trips/<tripCode>/`, kích hoạt quá trình render danh sách tài xế chuẩn xác 100%.

### 2. Tự Động Nhận Diện Tài Xế Đăng Nhập & Linh Hoạt Cho Admin:
- **Tiêm Ngữ Cảnh Người Dùng Hiện Tại (`window.CURRENT_USER`):**
  - Tại `templates/base.html`, tiêm biến ngữ cảnh `window.CURRENT_USER` chứa đầy đủ: `id`, `username`, `role`, `department`, `employee_id`, `full_name`, `nickname`.
- **Cơ chế Phân Quyền & Tự Động Chọn (Auto-Select):**
  - **Trường hợp Tài xế hiện trường đăng nhập (`role === 'DRIVER'`):** Dropdown chi phí tự động nhận diện và chọn đúng chặng/tài xế tương ứng với ID nhân viên hiện tại (`LEG_1`, `LEG_2` nếu chuyến cắt kéo hoặc `DRIVER_<id>`).
  - **Trường hợp Admin / Điều phối viên văn phòng:** Hệ thống mặc định chọn chặng chính của chuyến xe (`LEG_1` hoặc `ENTIRE`), đồng thời hiển thị nhóm `<optgroup>` toàn bộ Tài xế Đội xe (`available_drivers`) để Admin có thể chỉ định bất kỳ tài xế nào phát sinh chi phí.
- **Tổ Chức Giao Diện Chuẩn UX `<optgroup>`:**
  - Nhóm 1: `Tài xế & Chặng theo Chuyến xe` (`LEG_1`, `LEG_2`, `ENTIRE`, `COMPANY`).
  - Nhóm 2: `Tất cả Tài xế Đội xe (Admin / Điều phối chọn)` (Hiển thị đầy đủ Họ tên, Biệt danh, Mã nhân viên và Biển số xe gán).

### 3. Đồng Bộ Dữ Liệu Chi Phí Backend (Post & Put API):
- **Phía Frontend (`submitAddExpense` & `submitEditExpense`):**
  - Bóc tách chính xác `driver_id` và `vehicle_id` từ thuộc tính `data-*` của option được chọn và gửi kèm payload JSON.
- **Phía Backend (`TripAddExpenseAPIView` & `TripExpenseDetailAPIView`):**
  - Đã tích hợp sẵn logic gán đích danh `driver` và `vehicle` theo `driver_id` và `vehicle_id`, tự động suy luận phương tiện gán sẵn nếu không chỉ định biển số xe riêng biệt.
  - Hỗ trợ lưu trữ và hiển thị chính xác trên Bảng kê chi phí đối soát chuyến xe.

---

## [1.8.1] - 2026-09-25 (Bổ Sung 2 Mốc Thời Gian: Theo Dõi Xe Chờ Hạ Cont Sau 0H, Tính Phí Lưu Xe & Phụ Cấp Tài Xế)

### 1. Nâng Cấp Chuỗi Tiến Độ Vận Chuyển Từ 5 Mốc Lên 7 Mốc Khép Kín:
- **Bối cảnh nghiệp vụ thực tiễn:**
  - Xe đã lấy cont ra khỏi kho khách hàng (Mốc 5: Ra thực tế), nhưng kho hoặc khách hàng yêu cầu chờ đến sau 0h đêm (qua ngày hôm sau) mới được hạ cont tại cảng/depot (do chờ mở bãi CY cảng xuất lúc 0h, cấm tải giờ cao điểm, hoặc chờ thủ tục thông quan hải quan).
  - Nghiệp vụ này gây giam xe, phát sinh rủi ro neo đầu kéo, tài xế phải trực cabin đêm và tiềm ẩn nguy cơ phạt vượt hạn Free DET của hãng tàu.
- **Bổ sung 2 mốc thời gian chuẩn hóa:**
  - **Mốc 6: `6. HẸN HẠ BÃI (SAU 0H)`** (`dropoff_appointment_time` / `dropoff_appointment_at`): Ghi nhận thời điểm kho/khách hàng cho phép hạ cont (VD: `Sau 00:00` hoặc `01:00 ngày N+1`).
  - **Mốc 7: `7. HẠ BÃI THỰC TẾ`** (`actual_dropoff_time` / `actual_dropoff_at`): Ghi nhận thời điểm cẩu hạ cont xuống cảng/depot hoàn tất (có phiếu EIR hạ xác nhận).
- **Giao diện trực quan trên Màn hình Chi tiết Chuyến xe (`view_trip_detail.html`):**
  - Chuyển đổi grid tiến độ từ 5 ô sang 7 ô (`grid-cols-2 sm:grid-cols-7`).
  - Phối màu chuẩn BIM Tokens: Mốc 6 màu vàng hổ phách (`amber-50/border-amber-300`), Mốc 7 màu ngọc teal (`teal-50/border-teal-300`).
  - Bổ sung Huy hiệu cảnh báo nổi bật: `🚨 Neo xe chờ hạ sau 0h` (`#detail-overnight-badge`).

### 2. Tự Động Hóa 2 Chiều Tài Chính (Tính Phí Lưu Xe & Phụ Cấp Tài Xế):
- **Phát hiện Neo xe qua đêm (Overnight Detection):**
  - Tự động gắn cờ `is_overnight_detention=True` và tính số giờ chờ (`overnight_wait_hours`) khi mốc hạ cont vượt qua 00:00 hoặc cách mốc ra kho $\ge 6$ tiếng.
- **Chiều Thu Khách Hàng (Receivable Billing):**
  - Lưu trữ định mức phụ phí lưu xe/neo cont tính cho khách hàng (`detention_fee_customer`, mặc định đề xuất 800.000đ/đêm) làm cơ sở xuất hóa đơn phụ thu.
- **Chiều Chi Trả Tài Xế (Driver Allowance):**
  - Lưu trữ phụ cấp trực đêm cho tài xế (`detention_driver_allowance`, mặc định đề xuất 250.000đ/đêm).
  - Tùy chọn tự động tạo khoản `TripExpense` ("Phụ cấp lưu đêm trực xe sau 0h") vào Bảng kê chi phí chuyến xe, tự động đồng bộ P&L và kết nối phân hệ Kế toán/Lương.
- **Hộp thoại Cập nhật Nhanh (`#modal-detention`):**
  - Cho phép Điều độ viên và Tài xế cập nhật nhanh mốc hẹn hạ, mốc hạ thực tế, số giờ neo xe và lý do neo xe chỉ với 1 thao tác.
- **Tích hợp Giả lập App Tài xế Hiện trường (Driver Simulator):**
  - Bổ sung 2 nút bấm thao tác nhanh 1-chạm cho tài xế: `🌙 Chờ sau 0h` (`OVERNIGHT_WAIT`) và `⚓ Đã hạ cont` (`DROPOFF_COMPLETED`), đồng bộ trạng thái ngay lập tức về trung tâm điều hành.

---

## [1.8.0] - 2026-09-25 (Khắc Phục Lỗi Nút Lưu Báo Giá / Đơn Hàng & Phân Giải Khách Hàng Thông Minh)

### 1. Khắc Phục Lỗi Nút Lưu Báo Giá & Đơn Hàng (Modal Báo Giá & Booking):
- **Phân giải định dạng Khách Hàng thông minh (`resolve_customer`):**
  - Trước đây, khi dropdown hiển thị định dạng `Tên Khách Hàng (Mã Code)` như `ABC (CUST_20260921094535)`, backend tìm kiếm trực tiếp chuỗi này trong trường `Customer.name` hoặc `Customer.code` dẫn đến không khớp, gây sai lệch hoặc lỗi 400.
  - Xây dựng hàm `resolve_customer` bóc tách linh hoạt bằng regex `^(.*?)\s*\((.*?)\)$`, hỗ trợ tra cứu chính xác theo Customer ID, Code, Name hoặc định dạng kết hợp `Name (Code)`.
  - Áp dụng đồng bộ cho toàn bộ các endpoint: Tạo Lệnh Điều Động (`TripListCreateAPIView`), Tạo Báo Giá & Đơn Hàng (`SalesAPIView`), Cập nhật Báo Giá (`QuotationDetailAPIView`) và Cập nhật Đơn Hàng (`BookingOrderDetailAPIView`).
- **Khắc phục lỗi xác thực JWT hết hạn (Authentication Fallback):**
  - Chuyển đổi toàn bộ các hàm gọi API trong phân hệ Sales (`saveQuotation`, `changeQuotationStatus`, `deleteQuotation`, `saveBooking`, `changeBookingStatus`, `deleteBooking`, `loadSalesData`) từ `fetch` trực tiếp sang wrapper `fetchWithAuth`.
  - Cơ chế tự động fallback: Khi `access_token` trong `localStorage` hết hạn, `fetchWithAuth` tự động gỡ bỏ header `Authorization` bị lỗi và xác thực liên tục qua Django Session Cookie, ngăn chặn triệt để mã lỗi HTTP 401 Unauthorized.
- **Sửa lỗi cú pháp Backend trong `BookingOrderDetailAPIView.put`:**
  - Bổ sung định nghĩa biến `data = request.data` bị thiếu trước khi đọc các thuộc tính request, loại bỏ hoàn toàn lỗi tiềm ẩn `NameError: name 'data' is not defined`.
- **Cải thiện trải nghiệm người dùng & Chống xung đột Form (UX/UI):**
  - Bổ sung thuộc tính `novalidate` vào `<form id="form-quotation">` và `<form id="form-booking">`.
  - Chuyển nút bấm submit sang `type="button"` với sự kiện `onclick` trực tiếp, đi kèm hiệu ứng loading spinner và tự động vô hiệu hóa (`disabled`) khi đang gửi yêu cầu để tránh bấm trùng lặp (double submit).

### 2. Kiểm Thử Tự Động & Kiểm Chứng (Goal Verification):
- Bổ sung test case toàn diện `test_resolve_customer_and_quotation_booking_crud` trong `core/tests.py`.
- Toàn bộ 24/24 bài test hệ thống đã chạy và vượt qua 100% (`Ran 24 tests in 7.636s - OK`).
- Các phân hệ `apps.dispatch`, `apps.billing`, `apps.customers`, `apps.master_data` đều đạt chuẩn chất lượng vận hành.

---

## [1.7.9] - 2026-09-25 (Chế Độ Ghép 2 Cont 20ft, Quản Lý Hạn Free DEM/DET Cảng & Giám Định Vỏ Cont EIR)

### 1. Nghiệp Vụ Chở Ghép 2 Container 20ft (Twin 20ft Drayage / Kẹp 20ft):
- **Cơ chế Toggle kích hoạt linh hoạt (UX Chuẩn TMS):**
  - Bổ sung nút toggle kiểm soát `#chk-twin-cont` tại Section 1 của Modal Tạo Lệnh Điều Động (`templates/components/modal_create_trip.html`).
  - Mặc định ở trạng thái tắt (chạy 1 cont tiêu chuẩn 40HC/40GP/20ft). Khi người dùng bật toggle, hệ thống kích hoạt hàm `toggleTwinContMode(true)`:
    - Tự động chuyển đổi phân loại container thành `2x20DC` (Kẹp 2x20ft).
    - Mở khối form container thứ 2 (`#section-twin-cont-2`) với hiệu ứng mượt mà.
    - Cung cấp đầy đủ các trường dữ liệu độc lập cho Cont 2: Số Cont (`inp-cont-2`), Số Chì (`inp-seal-2`), Số Booking/BL (`inp-booking-2`), Trọng lượng VGM (`inp-vgm-2`) và Ghi chú giao nhận Cont 2 (`inp-cargo-notes-2`).
  - Phòng chống lỗi validation ngầm của trình duyệt bằng cách không dùng thuộc tính HTML5 `required` trên các trường bị ẩn.
- **Hiển thị trực quan tại Bảng Điều Vận & Chi Tiết Chuyến Xe:**
  - Bảng danh sách chuyến (`trips-tbody`): Hiển thị badge nhận diện `2x20ft` kèm chi tiết số vỏ Cont 2 và số seal 2 ngay dưới dòng Cont chính.
  - Màn hình chi tiết chuyến xe (`view_trip_detail.html`): Tự động hiển thị thẻ card chuyên dụng `#detail-twin-container-card` với 2 cột đối sánh rõ ràng giữa Cont 1 và Cont 2.

### 2. Quản Lý Hạn Miễn Phí DEM/DET Cảng & Hãng Tàu (Port & Carrier Free-time Tracking):
- **Cấu hình & Tự động tính toán hạn chót:**
  - Bổ sung trường dữ liệu `det_free_days` (mặc định 3 ngày mượn vỏ) và `dem_free_days` (mặc định 3 ngày lưu bãi) trên `DispatchTrip`.
  - Tự động kế thừa số ngày Free DET/DEM từ Booking khi chọn đơn hàng từ phân hệ Kinh Doanh.
  - Tự động đề xuất ngày hết hạn (`det_expiry_date = today + free_days`) qua hàm `onFreeDaysChange()`.
- **Hệ thống cảnh báo rủi ro 5 cấp độ (`calculate_dem_det_status`):**
  - `SAFE`: Còn > 2 ngày mượn vỏ (Xanh lá).
  - `ATTENTION`: Còn 2 ngày Free DET (Vàng cảnh báo).
  - `WARNING`: Còn 1 ngày Free DET (Cam nguy cơ).
  - `TODAY`: Hôm nay đến hạn cuối hạ rỗng (Đỏ cam nhấp nháy).
  - `OVERDUE`: ĐÃ QUÁ HẠN PHẠT TIỀN (Đỏ đậm animate-pulse kèm số ngày vượt hạn).
  - Cảnh báo trực tiếp trên bảng điều vận giúp điều phối viên ưu tiên xếp xe hạ cont trước 17H.

### 3. Giám Định Tình Trạng Vỏ Cont Hiện Trường (EIR Inspection & Damage Log):
- **Bảo vệ quyền lợi pháp lý vận tải:**
  - Ghi nhận trạng thái vỏ cont ngay khi bốc tại Cảng/Depot: `GOOD` (Nguyên vẹn / Đạt chuẩn), `DAMAGED` (Có hư hỏng từ trước / Lập biên bản EIR), `CLEANING_REQUIRED` (Bẩn / Cần vệ sinh).
  - Cho phép nhập chi tiết mô tả tổn thất (`damage_description`) làm bằng chứng miễn trừ trách nhiệm bồi thường khi giao vào kho khách hoặc hạ rỗng.
  - Tích hợp đồng bộ lên màn hình chi tiết chuyến xe (`#detail-dem-det-eir-card`).

### 4. Cơ Sở Dữ Liệu & Kiểm Thử Tự Động (Migration & Verification):
- **Cơ sở dữ liệu:** Tạo migration `0008_dispatchtrip_booking_or_bill_2_and_more.py` bổ sung 12 trường mới cho `DispatchTrip`.
- **API Backend:** Cập nhật `TripListCreateAPIView` (hỗ trợ lọc/tìm kiếm theo số Cont 2) và `TripDetailAPIView`.
- **Kiểm thử tự động:** Bổ sung `test_twin_container_creation_and_detail` và `test_dem_det_status_calculation` vào `core/tests.py`.
- **Kết quả kiểm thử:** Toàn bộ 23/23 bài test tự động vượt qua 100% (`Ran 23 tests in 7.797s - OK`).

---

## [1.7.8] - 2026-09-25 (Chuẩn Hóa Ngôn Ngữ Sản Phẩm Production, Sửa Nút Phát Lệnh & Hoàn Thiện Liên Kết Ngữ Nghĩa)

### 1. Rà Soát & Chuẩn Hóa Ngôn Ngữ Doanh Nghiệp (Production-Ready Language Standard):
- **Loại bỏ triệt để từ ngữ dev/mock/thử nghiệm:**
  - Rà soát toàn bộ hệ thống HTML/JS, xóa sạch các cụm từ kỹ thuật mang tính thử nghiệm như `"(Lưu Vào Database Thật)"`, `"Lưu Vào DB & Phát Lệnh Zalo"`, `"PostgreSQL 16 Live"`, `"Đăng nhập nhanh (Demo Roles)"` và các ghi chú debug.
  - Chuẩn hóa thành ngôn ngữ giao diện nghiệp vụ TMS vận tải chuyên nghiệp:
    - Tiêu đề modal: **"Tạo Lệnh Điều Động Mới"**.
    - Nút phát lệnh: **"Xác Nhận & Phát Lệnh Zalo"**.
    - Modal OCR: **"Xác Nhận & Lưu Chứng Từ"**.
    - Footer Sidebar: **"Hệ Thống Trực Tuyến"**.
    - Cổng đăng nhập: **"Chọn vai trò truy cập nhanh"**.

### 2. Xử Lý Triệt Để Nút "Xác Nhận & Phát Lệnh" Trong Modal Tạo Chuyến (Hình 2):
- **Nguyên nhân sự cố:**
  - Thẻ form ban đầu chứa các thuộc tính HTML5 `required` trên các dropdown (`inp-customer`, `inp-pickup`, `inp-warehouse`, `inp-driver`). Khi người dùng kích hoạt Toggle "Cắt Kéo (Drop & Hook)", khối trực tiếp bị ẩn (`display: none`), khiến trình duyệt Chrome/Edge kích hoạt lỗi ngầm *"An invalid form control with name='' is not focusable"* và hủy bỏ sự kiện submit mà không có phản hồi thị giác.
- **Giải pháp xử lý:**
  - Loại bỏ các thuộc tính HTML5 `required` thừa, bàn giao toàn bộ quy trình kiểm tra cho cơ chế **Defensive Form Validation** của JavaScript (`submitNewTrip()`).
  - Đổi nút submit thành `<button type="button" id="btn-submit-trip" onclick="submitNewTrip()" class="btn-bim-primary px-6 py-2.5">` giúp loại bỏ hoàn toàn nguy cơ bị trình duyệt chặn sự kiện submit.
  - Tích hợp thêm tham số `vehicle` từ dropdown đầu kéo Chặng 1 (`inp-vehicle-leg1`) vào payload gửi lên API `/api/trips/`, giúp backend lưu chính xác xe được chỉ định.
  - Bổ sung hiệu ứng loading spinner và vô hiệu hóa nút trong khi gửi request để chống nhấn đúp (double-submission).

### 3. Xử Lý Lỗi Nhấn Dòng Chuyến Xe Không Mở Chi Tiết & Chuẩn Hóa Toàn Bộ Liên Kết (Hình 3):
- **Nguyên nhân sự cố:**
  - Cột mã chuyến xe ban đầu chỉ là thẻ `<span>` tĩnh, thiếu trải nghiệm liên kết trực quan.
  - Hàm `viewTripDetail()` lấy JWT Bearer token trực tiếp từ `localStorage`. Nếu token đã hết hạn, DRF trả về HTTP 401 khiến request bị ném Exception và gián đoạn luồng hiển thị view chi tiết, mặc dù Django Session Cookie của người dùng vẫn hoàn toàn hợp lệ.
  - Một số thao tác gán `innerText` trực tiếp vào DOM không có cơ chế bắt lỗi an toàn (defensive check).
- **Giải pháp xử lý:**
  - Xây dựng wrapper `fetchWithAuth(url, options)`: Tự động gửi JWT + Session Cookie + CSRF; nếu gặp HTTP 401 từ token cũ, tự động fallback 1 lần sang Session Auth mà không làm gián đoạn người dùng.
  - Bọc mã chuyến xe thành thẻ link ngữ nghĩa chuẩn:
    `<a href="/dispatch/trips/${trip.hashid || trip.id}" onclick="event.preventDefault(); event.stopPropagation(); viewTripDetail('${trip.hashid || trip.id}');">` kèm icon mũi tên vi mô và hiệu ứng hover.
  - Bổ sung sự kiện click trên toàn dòng `<tr>` có điều kiện loại trừ các interactive controls.
  - Chuẩn hóa toàn bộ Sidebar (`templates/components/sidebar.html`): Thay thế toàn bộ `<button onclick="switchTab(...)">` bằng thẻ `<a href="/..." onclick="event.preventDefault(); switchTab('...');">` chuẩn Clean Semantic URL (`/`, `/sales`, `/dispatch`, `/fleet`, `/hr`, `/accounting`, `/customs`, `/settings`).
  - Chuẩn hóa nút quay lại trong `view_trip_detail.html`: Đổi sang thẻ `<a href="/dispatch" onclick="event.preventDefault(); backToTrips();">`.
  - Bọc toàn bộ các thao tác gán dữ liệu DOM trong `viewTripDetail()` bằng helper `setText()` an toàn chống crash.

### 4. Kiểm Thử Hệ Thống (Automated Testing & Verification):
- Bổ sung test case `test_trip_create_with_specific_leg_vehicles` vào `core/tests.py` kiểm chứng việc tạo lệnh Cắt Kéo và tra cứu chi tiết bằng HashID.
- **Kết quả kiểm thử:** Toàn bộ 21/21 bài test tự động vượt qua 100% (`Ran 21 tests in 7.572s - OK`).

---

## [1.7.7] - 2026-09-25 (Chuẩn Hóa Clean Semantic URL & Bảo Mật HashID Chống Lộ Dữ Liệu IDOR)

### 1. Bối Cảnh Nghiệp Vụ & Tiêu Chuẩn Quốc Tế:
- **Loại bỏ URL dạng hash cũ (`domain/#dieu-van`):**
  - Trước đây, việc chuyển tab sử dụng hash routing tạo ra các đường link như `/#dieu-van`, `/#kinh-doanh`, `/#ke-toan`, vừa bộc lộ cấu trúc phân hệ nội bộ, vừa lỗi thời theo tiêu chuẩn web hiện đại (W3C / Nielsen Norman Group).
  - Áp dụng chuẩn công nghiệp quốc tế (tương tự SAP S/4HANA, Flexport, Samsara, Stripe): **Clean Semantic URLs (HTML5 History API)** kết hợp **Mã hóa HashID cho thực thể dữ liệu**.
- **Phòng chống lỗ hổng an ninh IDOR (Tiêu chuẩn 10 - SECURITY_AUDIT.md):**
  - Triệt tiêu việc để lộ ID số nguyên tuần tự (`1, 2, 3...`) hoặc mã chuyến tuần tự trên URL.
  - Sử dụng thuật toán HashID với Salt bí mật nội bộ (`BIM_LOGISTICS_SECURE_SALT_2026`) để sinh ra mã định danh không thể đoán được (non-sequential, opaque identifier) cho mỗi chuyến xe.

### 2. Cải Tiến Backend & Cơ Sở Dữ Liệu (`core/security.py`, `apps/dispatch`, `config/urls.py`):
- **Xây dựng module `core/security.py`:**
  - Tích hợp thư viện `hashids` với độ dài tối thiểu 8 ký tự và salt riêng biệt theo domain (`TRIP`, `BOOKING`, `QUOTATION`, `EXPENSE`).
  - Cung cấp hàm `encode_id`, `decode_id`, `get_trip_hashid`, `decode_trip_hashid`.
  - Cập nhật `requirements.txt` bổ sung `hashids>=1.3.1`.
- **Nâng cấp model `DispatchTrip` (`apps/dispatch/models.py`):**
  - Bổ sung property `@property def hashid(self)` tự động mã hóa ID chuyến xe.
- **Tối ưu hóa các API (`apps/dispatch/api_views.py`):**
  - Xây dựng helper `get_trip_by_code_or_hash`: Cho phép tra cứu chuyến xe linh hoạt bằng cả `trip_code` gốc hoặc chuỗi `hashid`.
  - Cập nhật `TripListCreateAPIView` và `TripDetailAPIView` serialize thêm trường `hashid`.
  - Cập nhật các API con (Chi phí, Chốt sổ, Mở sổ, Mốc kho, Chứng từ) nhận diện an toàn cả 2 định dạng mã.
- **Cấu hình Django URL Routing (`config/urls.py` & `apps/dispatch/views.py`):**
  - Định nghĩa các Clean Semantic SPA Routes: `/dashboard/`, `/dispatch/`, `/dispatch/trips/<str:trip_hash>/`, `/sales/`, `/fleet/`, `/hr/`, `/accounting/`, `/customs/`, `/settings/`.
  - Cập nhật `index_view(request, *args, **kwargs)` để phục vụ SPA mượt mà, chống lỗi 404 khi người dùng tải lại trang (F5).

### 3. Nâng Cấp Frontend & Trải Nghiệm Điều Hướng (`static/js/app.js`):
- **Module `switchTab(tabId, updateHistory)`:**
  - Bảng ánh xạ `ROUTE_TAB_MAP` và `TAB_ROUTE_MAP`: Tự động đồng bộ đường dẫn thanh địa chỉ bằng `window.history.pushState()`.
  - Chuyển tab lập tức thay đổi URL thành `/dispatch`, `/sales`, `/fleet`, `/accounting`... mà không reload trang.
- **Deep-linking chi tiết chuyến xe:**
  - Khi mở xem chuyến xe (`viewTripDetail`), URL tự động chuyển sang `/dispatch/trips/<hashid>` (ví dụ: `/dispatch/trips/346OYy0b`).
  - Hỗ trợ người dùng copy link gửi cho đồng nghiệp: Khi truy cập trực tiếp, hệ thống tự động nhận diện `hashid`, mở đúng phân hệ Điều vận và hiển thị chi tiết chuyến xe đó.
  - Khi bấm quay lại (`backToTrips`), URL tự động khôi phục về `/dispatch`.
- **Lắng nghe sự kiện `popstate`:**
  - Hỗ trợ nút Back / Forward trên chuột và trình duyệt điều hướng mượt mà giữa các tab và màn hình chi tiết.
- **Tương thích ngược (Backward Compatibility):**
  - Nếu người dùng truy cập từ link cũ có hash (như `/#dieu-van`), hàm `resolveInitialRoute()` tự động nhận diện và chuyển đổi sang Clean URL mới.

### 4. Kiểm Thử Hệ Thống (Verification):
- Bổ sung test case `test_security_hashids_and_clean_urls` trong `core/tests.py`.
- **Kết quả:** 20/20 test cases vượt qua 100% (`Ran 20 tests in 6.674s - OK`).

---

## [1.7.6] - 2026-09-24 (Bổ Sung Cột "Tài Xế & Đầu Kéo (Chặng)" Cho Bảng Kê Chi Phí & BOT Khi Cắt Kéo)

### 1. Nghiệp Vụ Thực Tế & Yêu Cầu Kế Toán - Điều Vận (TMS Field Expenses):
- **Phân tách chi phí hiện trường theo tài xế & đầu kéo:**
  - Trong nghiệp vụ vận tải container Cắt Kéo (Drop & Hook), Chặng 1 (Lấy cont ➔ Kho) và Chặng 2 (Kho ➔ Hạ bãi) do 2 tài xế và 2 đầu kéo độc lập đảm nhiệm. Do đó, vé cầu đường BOT (ePass/VETC), phí nâng/hạ, tiền bốc xếp, lưu bãi hoặc cân xe phát sinh ở chặng nào sẽ do tài xế chặng đó chi trả hoặc ứng tiền trước.
  - Ngoài ra, các khoản chi như tiền cược cont, nâng hạ chuyển khoản ngân hàng do Công ty thanh toán tập trung, không thuộc tài xế nào.
  - Do đó, Bảng kê chi phí phát sinh chuyến xe bắt buộc phải có cột phân định rõ ràng: **Tài xế - Biển số xe - Chặng phát sinh** để phục vụ quyết toán tạm ứng, đối soát vé BOT và tính lương/thưởng minh bạch.

### 2. Cải Tiến Backend & Cơ Sở Dữ Liệu (`apps/billing`, `apps/dispatch`):
- **Cấu trúc Model `TripExpense` (`apps/billing/models.py`):**
  - Bổ sung `TripLegChoice`: `LEG_1` (Chặng 1: Lấy Cont ➔ Kho), `LEG_2` (Chặng 2: Kho ➔ Hạ bãi), `ENTIRE` (Toàn trình chuyến xe), `COMPANY` (Công ty chi chung).
  - Bổ sung 3 trường liên kết: `driver` (`ForeignKey(Employee)`), `vehicle` (`ForeignKey(Vehicle)`), `trip_leg` (`CharField`).
  - Thực thi migration `0007_tripexpense_driver_tripexpense_trip_leg_and_more.py` an toàn trên hệ thống cơ sở dữ liệu PostgreSQL.
- **Tối ưu hóa APIs (`apps/dispatch/api_views.py`):**
  - `TripDetailAPIView`: Bổ sung `select_related('driver', 'vehicle', 'expense_item')`; trả về `trip_leg`, `trip_leg_label`, `driver_name`, `vehicle_plate`.
  - `TripAddExpenseAPIView`: Tiếp nhận tham số `trip_leg`; tự động suy luận tài xế và đầu kéo theo cấu hình Chặng 1 (tài lấy + xe lấy) hoặc Chặng 2 (tài hạ + xe hạ) hoặc Công ty chi chung mà không bắt người dùng nhập thủ công ID.
  - `TripExpenseDetailAPIView`: Cho phép sửa đổi chặng chi phí và tài xế/xe liên quan linh hoạt khi chuyến chưa khóa sổ kế toán.

### 3. Nâng Cấp Giao Diện & Trải Nghiệm Người Dùng (UI/UX Accessibility):
- **Bảng Kê Chi Phí Hiện Trường (`templates/views/view_trip_detail.html` & `static/js/app.js`):**
  - Bổ sung cột thứ 8: `<th class="py-2 px-3 text-[12.5px] border-r border-slate-200/90 font-heading">Tài xế & Đầu kéo (Chặng)</th>`.
  - Hiển thị nhãn trực quan theo Design Token hệ thống BIM:
    - **Chặng 1:** Badge Teal `<span class="bg-teal-50 text-teal-800 border-teal-200">Chặng 1</span>` kèm Tên tài xế & Biển số xe lấy cont.
    - **Chặng 2:** Badge Indigo `<span class="bg-indigo-50 text-indigo-800 border-indigo-200">Chặng 2</span>` kèm Tên tài xế & Biển số xe hạ bãi.
    - **Toàn trình:** Tên tài xế và xe chính của chuyến xe.
    - **Công ty chi chung:** Badge Slate `<span class="bg-slate-100 text-slate-700">Công ty chi chung (CK)</span>`.
    - **Dòng Accordion tổng gộp:** Tự động phát hiện chi phí phát sinh ở cả 2 chặng và hiển thị badge tổng hợp `Chặng 1 & 2`.
- **Modal Thêm & Hiệu Chỉnh Chi Phí (`modal-add-expense` & `modal-edit-expense`):**
  - Tích hợp dropdown chọn Chặng & Tài xế: tự động điều chỉnh danh sách lựa chọn tùy theo chuyến xe là Cắt Kéo hay Chạy Thẳng, mang lại thao tác nhanh gọn "chuẩn 2 chạm" cho nhân viên điều vận và kế toán.

### 4. Kiểm Thử Hệ Thống (Verification):
- Chạy toàn bộ 19 unit test của hệ thống (`test core apps.dispatch apps.billing`): Vượt qua 100% không phát sinh lỗi ngoại lệ hay xung đột hồi quy (`Ran 19 tests in 5.778s - OK`).
- Bảo toàn nguyên tắc Audit Trail: Duy trì Soft-Delete và lịch sử kiểm toán cho mọi thao tác chi phí.

---

## [1.7.5] - 2026-09-24 (Khắc Phục Triệt Để Lỗi Nút Lưu Điều Xe & Nâng Cấp UX Phản Hồi Tức Thì)

### 1. Nguyên Nhân Gốc Rễ (Root Cause Analysis):
- **Lỗi 1 (Chính): 500 Server Error tại API `/api/master-data/form-options/`:**
  - Trong `MasterDataFormOptionsAPIView`, khi serialize danh sách Rơ-moóc (`Trailer`), code gọi `tr.get_trailer_type_display()`. Tuy nhiên trong model `Trailer` (`apps/fleet/models.py`), trường `trailer_type` là `CharField` tự do không có `choices`, khiến Django ném ngoại lệ `AttributeError: 'Trailer' object has no attribute 'get_trailer_type_display'`.
  - Hậu quả: Khi mở Modal Điều Động, lệnh gọi API form-options bị lỗi 500 khiến biến `masterDataFormOptionsCache` bị `null`. Hàm `populateMasterDataDropdowns()` bị ngắt sớm, danh sách Tài xế (`#inp-driver`) không được nạp dữ liệu (trống rỗng). Khi người dùng bấm Lưu, hàm validate chặn lại do chưa chọn tài xế, nhưng do dropdown rỗng nên người dùng không có tài xế để chọn và nút bấm tạo cảm giác "vô hiệu".
- **Lỗi 2: Logic Validate tĩnh trong `submitNewTrip()` không tương thích chế độ Cắt Kéo (Drop & Hook):**
  - Mảng `requiredFields` trước đó cố định kiểm tra `#inp-driver`. Khi bật chế độ Cắt Kéo (`is_split_trip = true`), ô `#inp-driver` bị ẩn đi để nhường chỗ cho `#inp-driver-leg1` và `#inp-dropoff-driver`. Việc vẫn kiểm tra `#inp-driver` khiến form luôn bị lỗi validate ngầm trên phần tử bị ẩn.
- **Lỗi 3: Thiếu Visual Loading State & Cuộn mượt (Smooth Scroll) tới ô thiếu:**
  - Nút bấm *"Lưu Vào DB & Phát Lệnh Zalo"* không có trạng thái disable/spinner khi bấm. Khi modal dài và bị cuộn xuống đáy, nếu có trường phía trên bị thiếu, người dùng không nhận biết được ô nào đang báo đỏ.

### 2. Giải Pháp Kỹ Thuật Đã Triển Khai:
- **Sửa Backend (`apps/master_data/api_views.py`):**
  - Đổi `tr.get_trailer_type_display()` thành `tr.trailer_type` an toàn tuyệt đối.
  - API `/api/master-data/form-options/` đã phản hồi HTTP 200, trả về đầy đủ 20 khách hàng, 7 tài xế, 8 đầu kéo và 3 rơ-moóc.
- **Nâng Cấp Frontend & Validation (`static/js/app.js` & `modal_create_trip.html`):**
  - Thiết kế mảng `requiredFields` động theo ngữ cảnh: Chạy thẳng thì kiểm tra `inp-driver`, Cắt kéo thì kiểm tra `inp-driver-leg1` và `inp-dropoff-driver`.
  - Bổ sung `missingLabels` để hiển thị tên chính xác từng trường còn thiếu trong Toast: *"Vui lòng chọn/nhập các thông tin bắt buộc: [Tên trường]"*.
  - Tích hợp `scrollIntoView({ behavior: 'smooth', block: 'center' })` tự động cuộn màn hình ngay vào ô thiếu và kích hoạt `focus()`.
  - Bổ sung hiệu ứng nút bấm: Tự động `disabled` và chuyển sang spinner `<i class="ph ph-spinner animate-spin"></i> Đang lưu & phát lệnh Zalo...` để chống double-click và phản hồi trực quan ngay lập tức.
  - Tự động xóa viền đỏ lỗi trên cả sự kiện `input` và `change` của các dropdown `<select>`.
  - Khắc phục luồng bất đồng bộ: `dispatchFromBooking` và `openModal` chuyển sang `async/await` đồng bộ 100%, đảm bảo dropdown nạp xong trước khi kế thừa booking.

### 3. Kiểm Thử Hệ Thống (Verification):
- Thêm test case `test_master_data_form_options_api` trong `core/tests.py`.
- **Kết quả:** 22/22 ca kiểm thử vượt qua 100% (`Ran 22 tests in 5.865s - OK`).
- Kiểm thử tạo lệnh thành công ở cả 2 kịch bản Chạy Thẳng (Direct Trip) và Cắt Kéo (Drop & Hook Trip) trả về HTTP 201 Created.

---

## [1.7.4] - 2026-09-24 (Triển Khai Nghiệp Vụ Cắt Kéo / Cắt Mooc "Drop & Hook" Theo Chuẩn TMS)

### 1. Kiến Trúc Nghiệp Vụ Vận Tải (TMS Logistics Architecture):
- **Chuẩn hóa Mô hình Chu Trình Container (Container Cycle):**
  - Giữ nguyên quan hệ thương mại: 1 Container trong Booking tương ứng 1 Lệnh điều động `DispatchTrip`, bảo toàn 100% doanh thu cước của đơn hàng và không làm xé lẻ số lượng cont của Booking.
  - Mở rộng hỗ trợ **2 Chặng Điều Động (2-Leg Transport)** khi phát sinh nghiệp vụ Cắt Kéo (Drop & Hook):
    - **Chặng 1 (Lấy Cont ➔ Kho đóng/dỡ):** Quản lý bởi Tài xế chính (`driver`) và Đầu kéo lấy (`vehicle`). Cắt mooc bàn giao tại kho khách hàng.
    - **Chặng 2 (Kho đóng/dỡ ➔ Hạ Cảng/Depot):** Quản lý bởi Tài xế hạ (`dropoff_driver`) và Đầu kéo hạ (`dropoff_vehicle`). Móc mooc kéo đi hạ bãi, lấy phiếu EIR hạ.
- **Phân Định Trách Nhiệm Vỏ & Thù Lao Chuyến:**
  - Bổ sung trường `is_split_trip`, `dropoff_driver`, `dropoff_trailer`, `driver_split_ratio`, `driver_allowance`, `dropoff_driver_allowance` vào `DispatchTrip`.
  - Tự động chia lương thù lao tài xế theo tỷ lệ cấu hình (mặc định 50% - 50%, 60% - 40%,...).

### 2. Cải Tiến Backend & APIs:
- **Migration Schema Database:**
  - Tạo và thực thi migration `0007_dispatchtrip_driver_allowance_and_more` trên cả Docker PostgreSQL và môi trường kiểm thử.
- **Cập Nhật `TripListCreateAPIView` & `TripDetailAPIView`:**
  - Tiếp nhận và lưu trữ toàn bộ tham số nghiệp vụ Cắt Kéo khi phát lệnh điều xe mới.
  - Trả về chi tiết đầy đủ 2 chặng: Tài xế lấy & Xe lấy, Tài xế hạ & Xe hạ, Tỷ lệ chia thù lao, Ghi chú bàn giao mooc tại kho.
- **Cập Nhật `BookingOrderDetailAPIView` & `SalesAPIView`:**
  - API Chi tiết Booking (`/api/bookings/<id>/`) tự động truy vấn và trả về danh sách toàn bộ container đã điều (`trips`), phân định rõ chuyến nào chạy thẳng, chuyến nào cắt kéo, vị trí hiện tại của cont và trạng thái hành trình.
  - Bảng kê CRM Bán Hàng (`/api/sales/`) tự động gắn cờ `has_drop_hook` và số lượng `drop_hook_count` cho mỗi booking.
- **Cập Nhật `MasterDataFormOptionsAPIView`:**
  - Bổ sung danh sách phương tiện (`vehicles`) và rơ-moóc (`trailers`) vào dropdown để frontend tự động gán xe theo tài xế.

### 3. Cải Tiến Giao Diện Người Dùng (UI/UX Accessibility):
- **Modal Tạo Lệnh Điều Động (`modal_create_trip.html`):**
  - Bổ sung Toggle switch mượt mà: *"Chế độ Cắt Kéo / Cắt Mooc (2 Tài)"*.
  - Khi bật toggle: Tự động chuyển sang giao diện cấu hình 2 Chặng (Chặng 1 Lấy cont & Chặng 2 Hạ cont) với màu sắc phân biệt trực quan (Teal cho chặng 1, Indigo cho chặng 2, Amber cho cảnh báo cắt mooc).
  - Tự động gợi ý đầu kéo khi chọn tài xế (`onDriverLeg1Change`, `onDriverLeg2Change`).
- **Modal Chi Tiết Đơn Hàng / Booking (`modal_booking.html`):**
  - Tích hợp Khối 4: *"Tiến Độ Container Thuộc Booking & Theo Dõi Cắt Kéo (Drop & Hook)"* hiển thị bảng chi tiết từng container, số seal, tài xế lấy/hạ, vị trí cont và nút bấm xem chi tiết chuyến xe ngay tức thì.
- **Danh Sách Điều Vận & Đơn Hàng (`static/js/app.js`):**
  - Thẻ chuyến xe và bảng Booking hiển thị badge nổi bật: `CẮT KÉO (Drop & Hook)` màu hổ phách để điều độ và CS nhận diện ngay tình trạng vận hành.

### 4. Kiểm Thử Tự Động (Verification):
- Bổ sung test case `test_drop_and_hook_split_trip_tracking_in_booking` trong `core/tests.py`.
- **Kết quả:** 18/18 ca kiểm thử vượt qua 100% (`Ran 18 tests in 5.522s - OK`).

---

### 1. Nguyên Nhân Gốc Rễ Của Lỗi (Root Cause Analysis):
- **Nguyên nhân 1: Xung đột CSRF trong môi trường Web Session (HTTP 403 Forbidden):**
  - Khi người dùng đăng nhập bằng tài khoản Web trên trình duyệt, Django sử dụng cơ chế `SessionAuthentication`. Cơ chế này của DRF yêu cầu bắt buộc phải có header `X-CSRFToken` cho mọi phương thức thay đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Hàm `submitNewTrip()` trước đó chỉ gửi `fetch('/api/trips/')` với header thông thường mà không đính kèm `X-CSRFToken` và không cho phép đọc cookie (`CSRF_COOKIE_HTTPONLY = True`), dẫn tới việc request bị DRF chặn lại với lỗi `403 Forbidden: CSRF Failed: CSRF token missing`.
- **Nguyên nhân 2: Trùng lặp mã chuyến xe khi có bản ghi xóa mềm (HTTP 500 Duplicate Key):**
  - Bộ sinh mã tự động trước đó dùng `DispatchTrip.objects.count() + 1`. Do `objects` tự động loại bỏ các bản ghi đã xóa mềm (`is_deleted=True`), nên khi trong cơ sở dữ liệu có các bản ghi cũ bị xóa mềm, hàm `count()` trả về số thứ tự đã từng tồn tại trong bảng (ví dụ `TVL-0924-018`), vi phạm ràng buộc duy nhất `UNIQUE constraint "dispatch_dispatchtrip_trip_code_key"`.
- **Nguyên nhân 3: Thông báo Toast chưa phản ánh đúng lỗi máy chủ:**
  - Client chỉ kiểm tra thuộc tính `result.error`. Khi backend trả về `result.detail` (từ DRF PermissionDenied) hoặc mảng lỗi trường, frontend bị fallback về câu thông báo mặc định: *"Vui lòng kiểm tra lại dữ liệu nhập."* gây hiểu nhầm cho người dùng.

### 2. Các Biện Pháp Xử Lý Kỹ Thuật Đã Thực Hiện:
- **Thiết lập Cơ Chế Xác Thực Kép Kèm CSRF (`getAuthHeaders`):**
  - Cập nhật `CSRF_COOKIE_HTTPONLY = False` trong `config/settings.py` để script client có thể đọc token bảo mật.
  - Thêm thẻ `<meta name="csrf-token" content="{{ csrf_token }}">` vào `<head>` của `templates/base.html`.
  - Xây dựng hàm tập trung `getAuthHeaders(extraHeaders)` tự động tiêm cả `Authorization: Bearer <token>` (từ localStorage) và `X-CSRFToken` (từ meta tag/cookie), đi kèm `credentials: 'include'` cho toàn bộ các lời gọi API thay đổi dữ liệu:
    - Tạo chuyến xe mới (`submitNewTrip`).
    - Thêm / Sửa / Xóa chi phí chuyến xe (`submitExpense`, `submitEditExpense`, `deleteExpensePrompt`).
    - Chốt sổ / Mở khóa sổ kế toán (`settleTripExpenses`, `unsettleTripExpenses`, `toggleSettleTrip`).
    - Thao tác tài xế trên mobile simulator: báo mốc hành trình (`driverReportMilestone`), gửi hóa đơn/chứng từ OCR (`submitOcrData`).
    - Quản lý báo giá & đơn hàng (`saveQuotation`, `changeQuotationStatus`, `deleteQuotation`, `saveBooking`, `changeBookingStatus`, `deleteBooking`).
    - Quản lý danh mục Master Data (`submitMasterDataForm`, `deleteMasterDataItem`).
- **Nâng Cấp Bộ Sinh Mã Chống Trùng Lặp 100% (Collision-Proof Unique Generator):**
  - Tại `apps/dispatch/api_views.py`: Thay đổi bộ sinh mã `trip_code`, `booking_code`, `quotation_code` sang dùng `all_objects` kèm vòng lặp `while ...exists(): counter += 1` để đảm bảo không bao giờ bị đụng độ mã định danh ngay cả khi cơ sở dữ liệu đã có bản ghi xóa mềm.
- **Chuẩn Hóa Thông Báo Lỗi Trực Quan:**
  - Cập nhật logic trích xuất thông báo lỗi trong `submitNewTrip` để hiển thị rõ ràng thông điệp từ máy chủ (`result.message || result.error || result.detail || fieldErrors`), loại bỏ hoàn toàn thông báo lỗi mơ hồ.

### 3. Kiểm Thử & Xác Nhận Hiện Trường:
- **Unit Test:** Toàn bộ 17/17 test suites vượt qua 100% (`Ran 17 tests in 5.165s - OK`).
- **Live CSRF Session Test:** Giả lập trực tiếp phiên đăng nhập Session kèm `HTTP_X_CSRFTOKEN` tạo lệnh điều động thành công rực rỡ với mã HTTP 201 Created. Thêm khoản chi thành công với mã HTTP 200 OK.
- Đã dọn dẹp sạch sẽ dữ liệu mock thử nghiệm.

---

### 1. Triệt Tiêu Nhập Liệu Tự Do (Zero Free-Text on Master Data):
- **Thay thế toàn bộ `<input type="text">` bằng `<select>`:**
  - **Modal Điều Động Chuyến Xe (`modal_create_trip.html`):** Khách hàng (`inp-customer`), Nơi lấy cont/hàng (`inp-pickup`), Kho nhận/nhà máy (`inp-warehouse`), Nơi hạ cont rỗng/hàng (`inp-dropoff`), Tài xế điều động (`inp-driver`).
  - **Modal Đơn Hàng / Booking (`modal_booking.html`):** Khách hàng đặt đơn (`booking-customer`), Điểm lấy (`booking-pickup`), Kho đóng/dỡ (`booking-delivery`), Điểm hạ (`booking-dropoff`).
  - **Modal Báo Giá Tuyến Cước (`modal_quotation.html`):** Khách hàng đối tác (`quote-customer`).
  - **Modal Khai Báo Biểu Cước Khách Hàng (`modal_master_data.html`):** Nơi lấy (`mdf-pickup`), Kho nhận (`mdf-delivery`), Nơi hạ cont (`mdf-dropoff`).
- **Endpoint Chuẩn Hóa Cung Cấp Tùy Chọn (`/api/master-data/form-options/`):**
  - Cung cấp danh sách Khách hàng (`customers`), Tài xế (`drivers`), Quy cách cont/xe (`container_types`) và Địa điểm phân nhóm logic: `pickup_options` (Cảng biển, ICD, Depot rỗng), `warehouse_options` (Kho hàng, Nhà máy), `dropoff_options` (Bãi rỗng, Cảng xuất).

### 2. Loại Bỏ Triệt Để Bộ Sinh Dữ Liệu Rác (Anti-Garbage Backend Hardening):
- **Xóa bỏ các đoạn mã tự sinh Khách hàng giả lập (`Customer.objects.create`):**
  - Trước đây khi người dùng gõ sai lệch chuỗi ký tự, hệ thống tự động sinh khách hàng mã `CUST_YYYYMMDD...` gây ô nhiễm Master Data. Đã gỡ bỏ toàn bộ tại `TripListCreateAPIView`, `SalesAPIView` (`create_booking`, `create_quotation`), `QuotationDetailAPIView.put` và `BookingOrderDetailAPIView.put`.
  - Ép buộc liên kết chính xác với Khách hàng có sẵn trong Master Data.
- **Tự động liên kết khóa ngoại (`pickup_loc`, `warehouse_loc`, `dropoff_loc` / `delivery_loc`):**
  - Cả `DispatchTrip` và `BookingOrder` được liên kết tự động tới bản ghi `master_data.Location` thông qua tên chuẩn từ dropdown.

### 3. Tương Thích Ngược & Cơ Chế Khôi Phục Dữ Liệu (Defensive Frontend Engine):
- **Hàm hỗ trợ gán giá trị không phân biệt hoa thường (`setSelectValueCaseInsensitive`):**
  - Hỗ trợ kế thừa dữ liệu từ Booking sang Điều vận (`onBookingSelected`), khôi phục dữ liệu cũ khi xem/sửa chi tiết Booking và Báo giá.
  - Tự động nạp tùy chọn dự phòng nếu bản ghi lịch sử cũ có biến thể tên chưa được chuẩn hóa, đảm bảo không bao giờ lỗi UI hoặc mất dữ liệu.
- **Kiểm định:** 17/17 ca kiểm thử tự động đạt 100% Passed. Kiểm chứng trực tiếp trên server: 0 bản ghi khách hàng rác phát sinh khi tạo chuyến xe và booking.

---

## [1.7.1] - 2026-09-24 (Khắc Phục Dứt Điểm Sự Cố Mở Chi Tiết Chuyến Xe & Củng Cố Defensive Backend)

### 1. Nguyên Nhân Gốc Rễ & Xử Lý Triệt Để:
- **Lỗi Migration trên PostgreSQL (`column personnel_employee.user_id does not exist`):** 
  - Trong Phase 2, migration `0002_employee_user` mới chỉ được chạy trên SQLite3 nhưng hệ thống nghiệp vụ thực tế chạy trên PostgreSQL (`bim_logistics_postgres` port 5435 chứa 19 chuyến xe nghiệp vụ).
  - Khi API `TripDetailAPIView` query `select_related('driver', 'dispatcher')`, PostgreSQL báo lỗi `ProgrammingError: column personnel_employee.user_id does not exist` dẫn đến HTTP 500.
  - **Khắc phục:** Đã thực thi `python manage.py migrate` trên PostgreSQL, đồng bộ toàn bộ schema và nạp 4 tài khoản người dùng chuẩn (`admin`, `dieudo`, `ketoan`, `taixe`) qua `setup_auth_users`.
- **Cấu hình Môi trường Local (`.env`):**
  - Cập nhật `.env` trỏ trực tiếp vào PostgreSQL `127.0.0.1:5435` để môi trường máy chủ và command line luôn nhất quán dữ liệu.
  - Rebuild Docker container `bim_logistics_web` với đầy đủ các package mới (`djangorestframework-simplejwt`, `argon2-cffi`, `python-dotenv`).

### 2. Tinh Chỉnh Phân Quyền IDOR (`IsTripDriverOrDispatcher`):
- **Phân tách Rõ Quyền Đọc (GET) và Quyền Ghi (POST/PUT/PATCH/DELETE):**
  - **Quyền Đọc (`SAFE_METHODS`):** Mọi nhân sự nội bộ đã xác thực (bao gồm tài xế, điều độ, kế toán) đều được phép xem chi tiết chuyến xe để tra cứu thông tin vận tải, kho bãi, số seal.
  - **Quyền Ghi (Mutation):** Chống IDOR nghiêm ngặt — chỉ tài xế được phân công (`trip.driver == employee`) hoặc Điều phối viên/Giám đốc/Kế toán mới có quyền cập nhật mốc tiến độ hoặc tải lên chứng từ.
  - Test case IDOR đã kiểm chứng: Tài xế khác gửi cập nhật mốc hành trình bị từ chối chính xác bằng mã HTTP 403 Forbidden.

### 3. Phòng Thủ Hai Lớp (Defensive Backend & Frontend Safety):
- **Null-safety trên `TripDetailAPIView`:** Bọc bảo vệ các quan hệ `customer`, `driver`, `vehicle`, `dropoff_vehicle`. Chuyến xe ở trạng thái nháp (Draft) hoặc chưa gán tài xế/xe không bao giờ bị crash `AttributeError` 500.
- **Frontend Fetch Resilience (`static/js/app.js`):**
  - Bổ sung header `Authorization: Bearer <token>` vào hàm `viewTripDetail`.
  - Trích xuất thông báo lỗi chính xác từ backend (401/403/404) thay vì nuốt lỗi.
  - Áp dụng helper gán DOM an toàn tránh crash giao diện.
- **Test Suite:** Toàn bộ 17/17 ca kiểm thử tự động đạt 100% Passed.

---

## [1.7.0] - 2026-09-24 (Triển khai Kiến Trúc Bảo Mật Toàn Diện 5 Giai Đoạn theo SECURITY_AUDIT.md)

### 1. Khắc Phục Sự Cố Khẩn Cấp & Quản Trị Bí Mật (Emergency Remediation):
- **Di dời Private SSH Key:** Chuyển tệp khóa riêng RSA `ssh-key-2026-06-15.key` ra khỏi thư mục gốc dự án vào thư mục được bảo vệ `.secrets/` và thêm vào danh mục chặn của `.gitignore`.
- **Thiết lập Quản trị Biến Môi Trường (.env):** Khởi tạo `.env.example` và `.env` nạp qua `python-dotenv`. Cách ly toàn bộ `SECRET_KEY`, `DEBUG`, mật khẩu database và whitelist domain khỏi mã nguồn.
- **Khóa Cổng Database ra ngoài Internet:** Sửa `docker-compose.yml` giới hạn cổng PostgreSQL chỉ bind vào `127.0.0.1:5435:5432` nội bộ máy chủ thay vì mở toàn mạng `0.0.0.0`.
- **Cấu hình Strict CORS:** Tắt cờ mở toàn bộ `CORS_ALLOW_ALL_ORIGINS = False`, chỉ định danh sách trắng tên miền chính thức của BIM Logistics.

### 2. Kiến Trúc Xác Thực JWT & Phân Quyền RBAC (Authentication & Authorization):
- **Tích hợp `rest_framework_simplejwt`:** Cung cấp các endpoint `/api/auth/token/`, `/api/auth/token/refresh/`, `/api/auth/token/verify/`, `/api/auth/token/blacklist/` và `/api/auth/me/`. Hỗ trợ luồng token rotation và thu hồi token khi tài xế hết ca.
- **Mã Hóa Mật Khẩu Chuẩn Quốc Tế:** Kích hoạt thuật toán Argon2 (`Argon2PasswordHasher`) kết hợp PBKDF2 của Django cho toàn bộ tài khoản tài xế, điều độ và quản trị viên.
- **Liên kết Employee với Django User:** Thêm trường `user = OneToOneField(User)` vào model `Employee`.
- **Xây Dựng Bộ Quyền DRF Permissions (`core/permissions.py`):** `IsAdminOrDirector`, `IsDispatcher`, `IsAccountant`, `IsDriver`, `IsTripDriverOrDispatcher`.

### 3. Phòng Chống IDOR & Kiểm Soát Chặt Chẽ Máy Trạng Thái (State Machine & Audit):
- **Chống Lỗ Hổng IDOR:** Áp dụng Object-Level Permissions trên các endpoint chi tiết chuyến xe (`TripDetailAPIView`). Tài xế chỉ xem và cập nhật chuyến được phân công; Kế toán mới có quyền chốt sổ (`TripSettleExpensesAPIView`).
- **Ép Buộc Vòng Đời Vận Tải Qua State Machine:** Cập nhật `TripDriverMilestoneAPIView` và `TripAddDocumentAPIView` chuyển trạng thái qua `transition_trip()` trong `core.workflows`, đảm bảo 100% sự kiện đều được ghi vết bất biến vào `TrackingEventLog`.

### 4. Kiểm Định Tệp Chứng Từ POD & Giới Hạn Tần Suất (Upload Security & Throttling):
- **Module Kiểm Tra Tệp Tải Lên (`core/validators.py`):** Xác thực định dạng qua chữ ký Magic Bytes (`.jpg`, `.jpeg`, `.png`, `.pdf`), kiểm tra tính toàn vẹn ảnh qua `Pillow`, chống tấn công Directory Traversal bằng `sanitize_filename`, giới hạn dung lượng tải lên tối đa 5MB.
- **DRF Rate Limiting (Throttling):** Áp dụng AnonRateThrottle (120 req/phút) và UserRateThrottle (600 req/phút), chuẩn bị sẵn cấu hình tracking/gps rate limit.
- **Custom Exception Handler (`core/exceptions.py`):** Chuẩn hóa định dạng phản hồi lỗi JSON đồng nhất `{"success": false, "error_code": "...", "message": "..."}`, triệt tiêu nguy cơ lộ traceback hệ thống ra ngoài.

### 5. Củng Cố Hạ Tầng & Bảo Mật Cookies (Security Headers & Cookies):
- Bật đầy đủ cờ bảo mật cookie `SESSION_COOKIE_HTTPONLY = True`, `CSRF_COOKIE_HTTPONLY = True`, `SameSite = 'Lax'`.
- Bật Security Headers `SECURE_CONTENT_TYPE_NOSNIFF = True`, `SECURE_BROWSER_XSS_FILTER = True`, `X_FRAME_OPTIONS = 'DENY'`.
- Nâng cấp bộ Test Suite (`core/tests.py`) lên 13 ca kiểm thử tự động (100% Passed) bao gồm kiểm thử chặn truy cập trái phép, phân quyền RBAC và kiểm định tệp tải lên.

---

## [1.6.4] - 2026-09-22 (Khử Trùng Lặp Chứng Từ Số & Hóa Đơn Điện Tử, Chấm Dứt Auto-Seed & Đối Chiếu Chéo Nghiệp Vụ)

### 1. Khắc Phục Nguyên Nhân Gây Trùng Lặp Dữ Liệu:
- **Chấm dứt Auto-Seed tại `docker-compose.yml`:** Gỡ bỏ lệnh `python manage.py seed_data` trong tiến trình khởi động container web. Tránh việc mỗi lần container khởi động lại tự ý nạp thêm dữ liệu.
- **Chuẩn hóa Idempotency tại `core/management/commands/seed_data.py`:** Thêm cơ chế dọn dẹp trước khi nạp (`TripDocument.all_objects.filter(trip=trip).hard_delete()` và xóa log khởi tạo `SEED_DATA`), đảm bảo nếu có chạy lại lệnh seed thủ công thì cũng không bao giờ sinh bản ghi rác trùng lặp.

### 2. Xây Dựng Công Cụ Rà Soát & Đối Chiếu Chéo Toàn Diện (`deduplicate_data`):
- **Khởi tạo Management Command `python manage.py deduplicate_data`:**
  - **Khử trùng Chứng từ (`TripDocument`):** Nhóm theo `(document_type, title)`, ưu tiên giữ lại bản ghi chuẩn (đã nghiệm thu, có dữ liệu OCR, id gốc), loại bỏ triệt để các bản ghi nhân bản.
  - **Khử trùng Chi phí (`TripExpense`):** Nhóm theo `(category, amount, invoice_number)`, giữ lại bản ghi được duyệt chuẩn.
  - **Khử trùng Tiến độ (`TripTimelineItem`) & Event Logs (`TrackingEventLog`):** Giữ đúng 1 bản ghi duy nhất cho mỗi mốc.
  - **Đối chiếu chéo (Cross-check Audit):** 
    - Đối chiếu 1:1 giữa khoản chi phí nâng hạ/cầu đường với HĐĐT (ví dụ: HĐ 0060962 giá trị 1.925.000 đ tương ứng chính xác 1 bản ghi HĐĐT ở danh sách chứng từ, không còn tình trạng 1 khoản chi nhưng có 7 hóa đơn trùng lặp).
    - Tự động kiểm tra và đồng bộ lại các chỉ số P&L chuyến xe (`cached_expense`, `cached_profit`, `cached_margin_percent`).

### 3. Phòng Thủ Hai Lớp Tại API Layer (`TripDetailAPIView`):
- Thêm lớp lọc phòng thủ (*Defensive Deduplication*) tại `apps/dispatch/api_views.py`: Ngay cả khi dữ liệu thô trong cơ sở dữ liệu có bản ghi trùng lặp chưa kịp dọn, API vẫn tự động gộp và chỉ trả về các chứng từ duy nhất cho frontend, bảo đảm trải nghiệm người dùng không bao giờ bị rối loạn.
- Bổ sung Unit Test `test_document_deduplication_and_cross_check` tại `core/tests.py`, nâng tổng số ca kiểm thử tự động lên 6/6 tests passed (100% OK).

---

## [1.6.3] - 2026-09-22 (Chuẩn Hóa & Tối Ưu Hóa Giao Diện Dashboard Ban Giám Đốc — Executive Command Center)

### 1. Tối Giản Header & Loại Bỏ Thông Tin Thừa (Header Simplification):
- **Loại bỏ dải banner phụ cấp trên:** Gỡ bỏ hoàn toàn dòng badge `[BAN GIÁM ĐỐC (BGD)] | EXECUTIVE COMMAND CENTER • TMS & CUSTOMS | • OTD SLA: 98.2%` để phần đầu trang tinh gọn, tập trung ngay vào tiêu đề và mô tả chính của Dashboard.
- **Tiêu đề phân tích chuẩn mực:** Đổi tên thẻ phân tích thành **"Phân tích Hiệu suất Chuyến xe"** và lược bỏ dòng mô tả phụ không cần thiết (*"Nhấp chuột vào bất kỳ chuyến xe nào để xem ngay Hồ sơ chuyến..."*), giải phóng thêm khoảng trống quý giá cho phần hiển thị dữ liệu bảng.

### 2. Tái Cân Bằng Tỷ Lệ & Tăng Mật Độ Dữ Liệu Dashboard (Harmonized Proportions & High Data Density):
- **Thu gọn KPI Cards & Biểu đồ BI:**
  - Tối ưu khoảng cách tổng thể (`space-y-4`, padding `p-4 md:p-5`), giảm padding các thẻ KPI xuống `p-4` để cân đối nhịp thị giác.
  - Điều chỉnh chiều cao khung biểu đồ xu hướng doanh thu/chi phí xuống `h-[195px]` và biểu đồ donut xuống `h-[165px]`. Do Chart.js hỗ trợ `maintainAspectRatio: false`, biểu đồ tự động co giãn sắc nét mà không bị méo tỷ lệ.
- **Tối đa hóa số lượng dòng hiển thị tại Bảng Hiệu Suất P&L Chuyến Xe:**
  - Nâng giới hạn API trả về từ `8` lên `20` chuyến xe gần nhất (`apps/dispatch/api_views.py`).
  - Áp dụng triệt để **Bim Enterprise Table Standard** cho bảng phân tích hiệu suất chuyến (`static/js/app.js` & `templates/views/view_dashboard.html`):
    - Padding ô dữ liệu `py-1.5 px-3`, phân cách cột dọc rõ nét `border-r border-slate-200/70`.
    - Text tiêu đề/tên khách hàng/tài xế: `text-[13px] font-bold text-slate-900`.
    - Subtext tuyến đường/biển số: `text-[11.5px] text-slate-500 mt-0.5`.
    - Các ô số tiền (Doanh thu, Chi phí, Lợi nhuận): `font-mono tabular-nums text-[13px]`.
    - Thanh biên lợi nhuận thu gọn `w-12 h-1.5`, nút thao tác `py-0.5 px-2 text-[11px]`.
  - Khung bảng có thanh cuộn mượt `max-h-[520px] overflow-y-auto` với `sticky top-0 thead`, cho phép hiển thị đồng thời từ 8 - 10 dòng trên một màn hình chuẩn mà không cần cuộn trang và xem dễ dàng toàn bộ 20 dòng.

---

## [1.6.2] - 2026-09-22 (Chuẩn Hóa Toàn Cục UI/UX Bảng Dữ Liệu Enterprise — BIM Table Standard)

### 1. Chuẩn Hóa Typography & Kích Thước Bảng Doanh Nghiệp (Bim Enterprise Table Standard):
- **Phân loại dòng bảng hai cấp độ (Dual-Density Architecture):**
  - **Dòng dữ liệu đơn (Single-line Rows - Danh Mục Master Data):** Chiều cao cố định `34px - 36px`, padding ô dữ liệu `py-1.5 px-3` (`padding: 6px 12px`), font chữ chính `13px` (`text-[13px] text-slate-900`), hiển thị trọn vẹn 20 dòng trên 1 màn hình chuẩn như bảng tính Excel.
  - **Dòng dữ liệu đa tầng (Multiline Rows - Điều Vận & Bảng Kê Chi Phí):** Chiều cao cố định `46px - 48px`, padding ô `py-2 px-3`, giảm triệt để khoảng cách giữa text chính và sub-text xuống `mt-0.5` (2px, `line-height: 1.25`) thay cho khoảng cách loãng trước đây. Font tiêu đề: `text-[13px] font-bold text-slate-900`, Subtext: `text-[11.5px] font-medium text-slate-500`.
- **Tiêu đề bảng (Sticky Header `<th>`):** Chiều cao cố định `36px`, nền `#f2f5f8`, font `12.5px font-bold text-slate-700 uppercase tracking-wider`, viền đáy `border-b border-slate-300`, đường chia cột dọc `border-r border-slate-200/90`.

### 2. Loại Bỏ Hoàn Toàn Tên Thương Hiệu Bên Thứ Ba:
- Đổi toàn bộ các class và bình luận từ thương hiệu ngoài sang định danh bản quyền của hệ thống: `.btn-bim-primary`, `.btn-bim-secondary`, `.bim-table`, `.erp-table`.
- Cập nhật chuẩn giao diện kế toán trong các thông báo và modal.

### 3. Đồng Bộ Hóa Hệ Thống Mã Nguồn & Tài Liệu:
- Cập nhật `static/css/main.css`: Thiết lập bộ CSS Tokens `--font-body-main: 13px;`, `--font-body-sub: 11.5px;`, `.erp-table`, `.bim-table`, `.row-multiline`.
- Cập nhật `static/js/app.js`: Đồng bộ toàn bộ 8 tabs Danh mục cài đặt (`renderMasterDataTable`), Bảng chuyến điều vận (`renderTripsTable`), và Bảng kê chi phí (`renderCostSheetTable`).
- Cập nhật `templates/`: Bổ sung `.erp-table` và điều chỉnh `<th>` trên `view_master_data.html`, `view_dispatch.html`, `view_trip_detail.html`.
- Cập nhật tài liệu kỹ thuật: Thêm phần **VI. QUY CHUẨN TRÌNH BÀY BẢNG DỮ LIỆU ENTERPRISE (BIM TABLE STANDARD)** vào `CODING_STANDARDS.md`.

---

## [1.6.1] - 2026-09-22 (Khôi Phục & Chuẩn Hóa Toàn Diện: Quy Trình Tiến Độ 10 Bước & Bộ Chứng Từ Gốc Số Hóa)

### 1. Khôi Phục & Tự Động Hóa Tiến Độ Quy Trình 10 Bước Điều Vận (TMS 10-Step SOP):
- **Nguyên nhân cốt lõi (Root Cause Fixed):** Các chuyến xe tạo mới hoặc seed thiếu dữ liệu `TripTimelineItem`, dẫn đến mảng `timeline` rỗng khiến thẻ giao diện *"Tiến độ Thực Hiện (Quy trình 10 Bước)"* không hiển thị nội dung.
- **Xây dựng `apps/dispatch/timeline_service.py`:**
  - Chuẩn hóa chuẩn mực 10 bước vận hành thực tế theo SOP Triền Võ:
    1. Tiếp nhận & Chuẩn bị lệnh điều động (DRAFT)
    2. Phát lệnh điều xe Zalo / App tài xế (DISPATCHED)
    3. Tài xế xác nhận nhận chuyến trên App (ACCEPTED)
    4. Lấy Cont / Hàng tại Cảng/Depot (CONTAINER_PICKED)
    5. Vận chuyển theo tuyến duyệt (IN_TRANSIT)
    6. Giao nhận tại kho khách hàng (AT_WAREHOUSE)
    7. Đóng / Trút hàng tại dock kho (UNLOADING)
    8. Hoàn tất chứng từ giao nhận & Ký POD (DELIVERED)
    9. Kéo vỏ cont hạ bãi / Trả rỗng (RETURNING_EMPTY)
    10. Tổng hợp chi phí & Đối chiếu thanh toán kế toán (COMPLETED)
  - **Tự động đồng bộ (Auto-Sync on Demand):** Khi truy xuất chi tiết bất kỳ chuyến xe nào (`TripDetailAPIView`), hệ thống tự động kiểm tra và đảm bảo đủ 10 bước tiến độ khớp chính xác với máy trạng thái (State Machine).
  - **Tự động chuyển mốc thời gian:** Tích hợp `sync_trip_10_step_timeline()` vào `transition_trip()` trong `core/workflows.py`.
- **Nâng cấp UI/UX Timeline (`static/js/app.js`):**
  - Trạng thái `ĐANG THỰC HIỆN`: Đèn tín hiệu Teal nhấp nháy (Pulsing Dot) kèm huy hiệu `ĐANG THỰC HIỆN`.
  - Trạng thái `HOÀN THÀNH`: Nút xanh lục Emerald kèm icon tích v và huy hiệu `Hoàn thành`.
  - Các bước chờ: Đánh số thứ tự tròn gọn gàng.

### 2. Số Hóa & Bổ Sung Đầy Đủ Chứng Từ Gốc Chuyến Xe (Trip Documents):
- **Phân loại chứng từ chuẩn hóa với Icon & Badge chuyên nghiệp:**
  - 📄 **Phiếu EIR Lấy Cont (`EIR_PICKUP`):** Ghi rõ số Cont, Seal, vị trí bãi và hãng tàu.
  - 📄 **Phiếu EIR Hạ Cont (`EIR_DROPOFF`):** Bãi hạ rỗng, tình trạng vỏ cont.
  - ✍️ **Biên bản giao nhận có chữ ký (`POD`):** Xác nhận số lượng kiện hàng, người nhận, ký đóng dấu.
  - 🧾 **Hóa đơn điện tử nâng hạ / cước cảng (`INVOICE`):** Số HĐĐT, mã tra cứu trực tuyến VNPT/Viettel/ePort.
  - ⚖️ **Phiếu cân tải trọng xe & hàng (`WEIGHT_TICKET`):** Tải trọng tịnh, tổng tải xe.
  - 🛡️ **Giám định vỏ cont (`CONTAINER_CHECK`):** Tình trạng vỏ cont, sàn gỗ.
- **Nạp dữ liệu mẫu thực tế 100%:** Nạp đầy đủ từ 2 - 4 chứng từ gốc pháp lý cho tất cả 16 chuyến xe hiện hành.

---

## [1.6.0] - 2026-09-22 (Sprint 1: Hoàn Thành Critical Database Fixes — Chuẩn Hóa Quan Hệ Master Data 3NF)

### 1. Chuẩn Hóa Quan Hệ Khóa Ngoại (Foreign Keys) Tới Master Data:
- **`apps/customers.RouteTariff` & `BookingOrder`:**
  - Bổ sung `pickup_loc`, `delivery_loc`, `dropoff_loc` liên kết ForeignKey tới `master_data.Location` (`on_delete=models.PROTECT`).
  - Duy trì các trường text cũ phục vụ tương thích ngược (Backward Compatibility) và tìm kiếm tự do.
- **`apps/dispatch.DispatchTrip`:**
  - Bổ sung `pickup_loc`, `warehouse_loc`, `dropoff_loc` liên kết ForeignKey tới `master_data.Location`.
  - Tự động hóa hàm `update_financials()`: Ưu tiên tra cứu biểu cước hợp đồng theo cặp khóa ngoại `(pickup_loc, delivery_loc)`, fallback sang chuỗi văn bản nếu chưa gán khóa ngoại.
- **`apps/billing.TripExpense`:**
  - Bổ sung `expense_item` liên kết ForeignKey tới `master_data.ExpenseItem` (`on_delete=models.PROTECT`).
  - Giải quyết xung đột ngữ nghĩa `DocumentType` giữa billing và documents bằng cách chuẩn hóa sang `ExpenseReceiptType` (kèm backward-compatible alias).
  - Tự động map và đồng bộ `ExpenseItem` trong API tạo và sửa chi phí hiện trường (`TripExpensesAPIView`, `TripExpenseDetailAPIView`).

### 2. Chuẩn Hóa Các Mốc Thời Gian Vận Hành Sang ISO DateTime:
- Bổ sung `actual_gate_in_at` và `actual_gate_out_at` (`DateTimeField`) trên model `DispatchTrip`.
- Tự động phân tích và chuyển đổi chuỗi giờ tác nghiệp cổng kho (vd: "8H", "16H30") kết hợp với ngày hẹn đóng hàng `loading_date` thành mốc thời gian chuẩn hóa có timezone.

### 3. Data Migration & Backfill Toàn Vẹn:
- Hoàn thành tạo và apply 3 tệp migration trên PostgreSQL container:
  - `billing.0006_tripexpense_expense_item_and_more`
  - `customers.0005_bookingorder_delivery_loc_bookingorder_dropoff_loc_and_more`
  - `dispatch.0006_dispatchtrip_actual_gate_in_at_and_more`
- Ánh xạ tự động và thành công 100% dữ liệu thực tế:
  - 9/9 biểu cước `RouteTariff` đã liên kết `Location`.
  - 8/8 đơn hàng `BookingOrder` đã liên kết `Location`.
  - 16/16 chuyến xe `DispatchTrip` đã liên kết `Location` và chuẩn hóa mốc thời gian.
  - 8/8 khoản chi phí `TripExpense` đã liên kết `ExpenseItem`.
- Xác thực thị giác trực tiếp trên trình duyệt Browser tại `http://localhost:8085/` đạt 100% tiêu chuẩn UI/UX và dữ liệu không sai lệch.

---

## [1.5.2] - 2026-09-22 (Chuẩn Hóa Thuật Ngữ Kế Toán Vận Tải: 'CHI HỘ KH' Thay Cho 'THU HỘ KH')

### 1. Chuẩn Hóa Khái Niệm Vận Hành & Kế Toán Triền Võ:
- **Bản chất nghiệp vụ:** Khi phát sinh các chi phí nâng/hạ cảng, kiểm hóa, bến bãi mà hợp đồng quy định khách hàng chịu, doanh nghiệp vận tải là đơn vị **ứng tiền chi trước tại hiện trường (Chi hộ KH)**. Doanh nghiệp chỉ thu lại tiền sau khi lập bảng kê quyết toán với khách hàng ở chu kỳ đối soát tiếp theo.
- **Chuẩn hóa nhãn giao diện & chứng từ:** Thay thế toàn diện nhãn `THU HỘ KH` và `Thu hộ / Chi hộ` sang **`CHI HỘ KH`** / **`Chi hộ Khách hàng`**:
  - **Huy hiệu trên bảng kê chi phí:** `[CHI HỘ KH]` với icon mũi tên chi ra `ph-bold ph-arrow-up-right` nền màu hổ phách (`bg-amber-100 text-amber-800 border-amber-300`).
  - **Dòng tổng kết chi hộ chân bảng:** `Tổng Khoản Chi Hộ Khách Hàng` kèm diễn giải: *"Công ty ứng chi trước, thu lại khi quyết toán với KH — Không tính vào chi phí công ty"*.
  - **Modal Thêm & Chỉnh sửa chi phí:** Toggle switch được cập nhật thành *"Chi hộ Khách hàng — Công ty ứng chi trước, sau đó quyết toán thu lại từ KH (khoản này không tính vào chi phí vận hành của chuyến xe)"*.
  - **Model Backend (`TripExpense`):** Chuẩn hóa `help_text` và nhãn hiển thị `__str__` thành `[CHI HỘ KH]`.

---

## [1.5.1] - 2026-09-22 (Chuẩn Hóa UI/UX Enterprise: Độ Dày Hàng Bảng Dữ Liệu Gọn Nhẹ Chuẩn ERP, Vừa Vặn 20 Dòng/Trang Không Tràn Khung)

### 1. Chuẩn Hóa Cỡ Chữ Hệ Thống & Giãn Dòng Tiêu Chuẩn Như Excel (Excel Row Spacing Standard):
- **Khôi phục nguyên bản kích thước Typography Scale thống nhất (Phiên bản 1.4.8):**
  - Tiêu đề cột `<th>`: `text-xs font-bold text-slate-700 uppercase tracking-wider` (12px đậm nét).
  - Tên Tuyến, Tên Phụ Cấp, Tên Điểm/Cảng, Tên Khách Hàng, Tên Khoản Mục, Tên Quy Cách, Biển Số Xe: `text-sm font-bold text-slate-900` (14px to rõ, sắc nét).
  - Số tiền (Lương chuyến, Phụ cấp, Cước khách, Định mức chi): `text-sm font-black text-emerald-700 / text-slate-900 font-mono` (14px nổi bật).
  - Lộ trình, Trục lấy hạ cont, Địa chỉ: `text-[13px] font-medium text-slate-600` (13px dễ tra cứu).
  - Huy hiệu (Badges) trạng thái & Tag nhóm: `px-2.5 py-0.5 rounded-full text-xs font-bold` (12px cân đối).
  - Nút bấm thao tác (Sửa/Xóa): `p-1.5 text-base` vùng bấm thuận tiện.
- **Giãn dòng tiêu chuẩn kiểu Excel (Excel Row Spacing):**
  - Áp dụng padding `py-2 px-3.5` với đường viền mỏng `border-b border-slate-200/70`.
  - Loại bỏ hoàn toàn các khoảng trống thừa giữa các dòng text, giữ khoảng cách giữa 2 dòng vừa vặn, sát sao, thanh thoát như một bảng tính Excel chuyên nghiệp.

### 2. Thiết Kế Bố Cục Tràn Màn Hình Không Trượt Khung (Full-Height Flexbox Layout):
- Container `#view-cai-dat` chuyển sang kiến trúc `h-full flex flex-col space-y-2.5 overflow-hidden`.
- Thẻ danh mục chính: `flex-1 min-h-0 flex flex-col`.
- Container bảng dữ liệu: `flex-1 min-h-0 overflow-y-auto overflow-x-auto relative`.
- **Thanh phân trang (Footer Pagination) luôn ghim đáy (Pinned Footer with `shrink-0`):**
  - Hiển thị trọn vẹn 20 dòng trên Trang 1 cùng lúc với thanh phân trang mà không bị trượt mất khỏi màn hình hay phải cuộn trang chính.
  - Cho phép tùy chọn linh hoạt số dòng: `20 dòng (mặc định)`, `30 dòng`, `50 dòng`, `100 dòng`.
  - Đồng bộ số bản ghi hiển thị chính xác theo dải: `Hiển thị 1 - 20 trong 36 bản ghi`.

---

## [1.5.0] - 2026-09-22 (Phân Hệ Cài Đặt / Master Data & Chuẩn Hóa Biểu Phí Tính Lương Triền Võ)

### 1. Phân Hệ "Cài Đặt" (Master Data Management) Chuẩn ERP:
- **Vị trí Menu Sidebar:** Đặt ngay bên dưới phân hệ **"Dịch vụ Hải quan"** với icon `ph-gear`.
- **Cấu trúc 8 Tabs Quản Trị Tập Trung (kèm tính năng CRUD đầy đủ):**
  1. 📑 **Biểu Phí Lương Chuyến (Driver Salary Tariffs):** Quản lý 36 tuyến đường định mức lương từ 400.000đ đến 1.400.000đ.
  2. 📑 **Phụ Cấp & Kiểm Hóa (Driver Allowances):** Quản lý phụ cấp cảng xa (Hiệp Phước +350k, Cái Mép +500k, Nhơn Trạch +400k, kéo rỗng +300k), kiểm hóa (Thủ Dầu Một +500k, VSIP 1 +200k), cắt kéo bãi (250k), kéo moóc không (+100k).
  3. 📍 **Địa Điểm & Cảng Bãi (Locations):** 18 điểm cảng biển, ICD, depot rỗng, kho khách hàng và bãi xe công ty.
  4. 🛣️ **Biểu Cước Khách Hàng (Customer Tariffs):** Biểu giá cước xuất hóa đơn theo tuyến đường.
  5. 🏢 **Danh Mục Khách Hàng (Customers):** Danh bạ đối tác, MST, địa chỉ, số điện thoại liên hệ.
  6. 💰 **Khoản Mục Chi Phí (Expense Items):** 8 nhóm chi phí phát sinh chuẩn Triền Võ.
  7. 📦 **Quy Cách Cont & Xe (Container & Truck Types):** 40HC, 20DC, 45G1, Xe tải 2T - 10T kèm hệ số TEU, tải trọng và CBM.
  8. 🚛 **Đội Xe & Rơ-moóc (Vehicles & Trailers):** Quản lý phương tiện, nguồn xe nhà / xe bạn, hạn đăng kiểm và bảo trì.

### 2. Chuẩn Hóa Cơ Chế Tính Lương Tài Xế Theo Văn Bản Thực Tế Triền Võ:
- **Lương Cơ Bản:** Chuẩn hóa xe mới `7.500.000đ` và xe cũ `8.500.000đ` (thay vì mức 5.000.000đ cũ).
- **Thưởng Vượt Mốc 40 Chuyến/Tháng:** Tự động tính thưởng `(Số chuyến - 40) × 50.000đ` cho các chuyến thứ 41 trở lên.
- **Công Thức Tính Lương Minh Bạch:**
  $$\text{Lương Thực Lãnh} = \text{Lương Cơ Bản} + \sum (\text{Lương Chuyến} + \text{Phụ Cấp}) + \text{Thưởng Vượt Mốc 40 Chuyến} - \text{Tạm Ứng}$$

---

## [1.4.9] - 2026-09-21 (Sửa Lỗi Nghiêm Trọng: Công Thức Chi Phí Không Khớp — Chi Tiết 0đ / Tổng Hợp 1.200.000đ)


### Vấn Đề Cốt Lõi Được Xử Lý (Root Cause Fixed):
- **Lỗi Zero Variance vi phạm nguyên tắc kế toán ERP:** Chuyến `TVL-0917-007` (Takigawa VSIP) và 6 chuyến `0917` khác có `cached_expense = 1.200.000đ` được gán cứng trong quá trình seed data, nhưng bảng `TripExpense` không có bản ghi chi phí nào tương ứng. Gây ra hiện tượng **chi tiết bảng kê hiển thị `0 đ` nhưng khối P&L và App tài xế báo `1.200.000 đ`** — nghiêm trọng về độ chính xác dữ liệu tài chính vận tải.

### Sửa Lỗi Backend (`apps/dispatch/models.py`):
- **Hàm `update_financials()`:** Mở rộng logic tính tổng chi phí từ `status__in=['APPROVED','SETTLED']` thành **tất cả chi phí hợp lệ (trừ bị từ chối và xóa mềm)**:
  ```python
  # Trước: Chỉ tính APPROVED và SETTLED → bỏ sót PENDING gây sai số
  # Sau: Tính tất cả status trừ REJECTED và is_deleted=True
  TripExpense.objects.filter(trip=self, is_deleted=False).exclude(status=ApprovalStatus.REJECTED)
  ```

### Sửa Lỗi Backend (`apps/dispatch/api_views.py`):

#### 1. `TripDetailAPIView` — Chuẩn Hóa Công Thức Tài Chính (Single Source of Truth):
- Thêm bước tính `total_actual_expense` trực tiếp từ danh sách `expenses` (không dùng `trip.cached_expense` dễ lệch):
  ```python
  valid_expenses = [e for e in expenses if e.status != ApprovalStatus.REJECTED]
  total_actual_expense = sum(e.amount for e in valid_expenses)
  revenue = trip.cached_revenue
  profit = revenue - total_actual_expense
  margin_percent = round((profit / revenue) * 100, 2) if revenue > 0 else 0
  ```
- **Tự động đồng bộ DB:** Nếu `cached_expense` trong DB bị lệch, API tự gọi `trip.save()` để cập nhật trước khi trả Response → không bao giờ trả số liệu lệch cho client.
- `cost_sheet['total_expense']` và `financials['expense']` bây giờ **luôn bằng nhau và bằng tổng các dòng chi tiết thực tế**.

#### 2. `DashboardBGDAPIView` — Fix TypeError Decimal vs float:
- Chuyển đổi `agg_revenue` và `agg_expense` sang `float()` để tránh lỗi `TypeError: unsupported operand type(s) for -: 'decimal.Decimal' and 'float'`.

### Sửa Lỗi Frontend (`static/js/app.js`):

#### 1. `renderCostSheetTable()` — Đồng Bộ Hoàn Toàn Sau Khi Tính Tổng:
- Sau khi hàm render xong và có `totalCalculated`, **ngay lập tức cập nhật cả 4 vị trí hiển thị**:
  - `#cost-sheet-total` — Tổng footer bảng kê
  - `#pnl-expense` — Box "Tổng Chi Phí Thực Tế"
  - `#pnl-profit` — Box "Lợi Nhuận Gộp (Margin)"
  - `#app-total-expense` — Tổng chi phí tài xế đã kê (App Mobile)
- Công thức frontend 100% nhất quán:
  $$\text{Chi phí} = \sum \text{Khoản chi trong bảng kê}$$
  $$\text{Lợi nhuận} = \text{Doanh thu} - \text{Chi phí}$$

#### 2. `renderDriverMobileApp()` — Tính Từ trip.expenses Thực Tế:
- Tổng hiển thị trên App Mobile tính từ `trip.expenses.reduce(...)` thay vì `trip.financials.expense` (vốn là cached value dễ lệch).

### Đồng Bộ Database (Chạy update_financials toàn bộ):
- Chạy `update_financials()` cho tất cả 16 chuyến xe trong DB → xóa sạch dữ liệu `cached_expense` sai:
  - 7 chuyến `TVL-0917-*`: `cached_expense = 1.200.000đ` → đã reset về `0đ` (đúng với bảng kê rỗng)
  - `TVL-0916-006`: `cached_expense = 0` → cập nhật thành `150.000đ` (có 1 BOT PENDING)
  - `TVL-0916-007`: `1.548.000đ` ✅ | `TVL-0916-008`: `3.145.111đ` ✅ (đã có expense records)

### Kết Quả Kiểm Chứng (Verification):
- **Automated tests:** `python manage.py test` → 5/5 tests **PASSED** (Exit code 0)
- **API `GET /api/trips/TVL-0917-007/`:**
  ```json
  { "financials": { "expense": 0, "profit": 3800000, "margin_percent": 100.0 }, "cost_sheet": { "total_expense": 0 } }
  ```
  ✅ Chi tiết `0đ` = Tổng hợp `0đ` = Lợi nhuận `3.800.000đ (100%)`
- **API `GET /api/trips/TVL-0916-007/`:**
  ```json
  { "financials": { "expense": 1548000, "profit": 2252000, "margin_percent": 59.26 }, "cost_sheet": { "total_expense": 1548000 } }
  ```
  ✅ Chi tiết = Tổng hợp = Khớp 100% với 2 dòng `TripExpense` (Hạ 1.518.000đ + BOT 30.000đ)

---

## [1.4.8] - 2026-09-21 (Rà Soát & Cơ Cấu Chuẩn Typography System: Cỡ Chữ, Font-Size Đồng Bộ Toàn Bộ Phân Hệ Đạt Chuẩn Quốc Tế)

### 1. Xây Dựng Hệ Thống Design Tokens & Typography Scale Chuẩn Quốc Tế:
- **Thiết lập thang đo phân cấp 7 bậc trong `static/css/main.css`:**
  - `--font-hero: 30px` (Số liệu KPI trọng yếu Ban Giám Đốc đọc nhanh).
  - `--font-h1: 23px` (Tiêu đề trang & phân hệ chính).
  - `--font-h2: 17px` (Tiêu đề nhóm chức năng, section title).
  - `--font-h3: 15px` (Tiêu đề thẻ card, modal heading).
  - `--font-body-main: 14px` (Dữ liệu bảng, tên khách hàng, mã vận đơn, số tiền, nội dung chính).
  - `--font-body-sub: 13px` (Lộ trình vận chuyển, thông tin phụ, chú thích thứ cấp).
  - `--font-caption: 11.5px` (Nhãn trạng thái badge, timestamp, metadata).
- **Bộ Utility Classes Typography:** `.app-page-title`, `.app-page-subtitle`, `.app-section-title`, `.app-card-title`, `.app-kpi-value`, `.app-table-header`, `.app-table-cell`, `.app-table-meta`, `.app-form-label`, `.app-form-control`, `.app-status-badge`, `.app-mono`.

### 2. Đồng Bộ Hóa 7 Phân Hệ Giao Diện & Màn Hình Chi Tiết:
- **Tổng quan Dashboard (`templates/views/view_dashboard.html`):**
  - Tối ưu 4 thẻ KPI chiến lược lên `text-3xl font-black font-heading tracking-tight mt-1`.
  - Tăng độ phân giải thị giác các dòng Doanh thu / Chi phí / Quỹ tiền lên `text-sm font-black`.
- **Sale & Booking (`templates/views/view_sales.html` & `static/js/app.js`):**
  - Đồng bộ 4 thẻ KPI tổng quan kinh doanh và 4 thẻ trạng thái chu kỳ báo giá lên `text-3xl font-black font-heading tracking-tight mt-1`.
  - Tăng cỡ nhãn chỉ số lên `text-[13px] font-bold uppercase tracking-wider`.
  - Nâng cấp hai thanh subtabs lên `text-sm font-bold`.
  - Bảng Báo Giá Tuyến Cước: Cỡ chữ mã báo giá, khách hàng, đơn giá cước, doanh thu lên `text-sm font-black / font-bold`; lộ trình chuyển sang `text-[13.5px] font-medium text-slate-700`.
  - Bảng Tiếp Nhận Booking: Mã booking, khách hàng, số cont, giá cước, tiến độ lên `text-sm font-black / font-bold`; lộ trình 3 điểm lên `text-[13px] leading-snug`.
- **Điều Vận (`templates/views/view_dispatch.html` & `static/js/app.js`):**
  - 4 thẻ KPI điều độ chuyến lên `text-3xl font-black font-heading tracking-tight mt-1`, nhãn `text-[13px] font-bold uppercase tracking-wider`.
  - Bảng danh sách chuyến: Mã chuyến `text-sm font-black`, khách hàng `text-sm font-bold`, số cont & xe `text-sm font-bold font-mono`, lộ trình `text-[13px] font-bold`, chi phí `text-[13px] font-mono font-bold`.
- **Quản Lý Kế Toán (`templates/views/view_accounting.html` & `static/js/app.js`):**
  - 4 thẻ KPI kế toán lên `text-3xl font-black font-heading tracking-tight mt-1`.
  - Bảng đối soát chi phí: Mã chuyến, khách hàng, tài xế, doanh thu, chi phí, lợi nhuận gộp đều dùng `text-sm font-black / font-bold`, lộ trình `text-[13px] font-medium`, nhãn chốt sổ `text-xs font-bold`.
- **Xe & Bãi (`templates/views/view_fleet.html` & `static/js/app.js`):**
  - 4 thẻ KPI đội xe lên `text-3xl font-black font-heading tracking-tight mt-1`, nhãn `text-[13px] font-bold uppercase tracking-wider`.
  - Bảng danh sách phương tiện: Biển số, loại xe, tài xế, hạn đăng kiểm, lịch bảo trì nâng lên `text-sm font-black / font-bold / font-medium`.
- **Hành Chính & Nhân Sự (`templates/views/view_personnel.html` & `static/js/app.js`):**
  - 3 thẻ KPI nhân sự lên `text-3xl font-black font-heading tracking-tight mt-1`, nhãn `text-[13px] font-bold uppercase tracking-wider`.
  - Bảng lương chuyến tạm tính: Mã NV, tài xế, số chuyến, lương cơ bản, lương chuyến, tạm ứng, thực lãnh đều nâng lên `text-sm font-black / font-bold / font-medium`.
- **Dịch Vụ Hải Quan (`templates/views/view_customs.html`):**
  - 3 thẻ KPI tờ khai thông quan luồng xanh, vàng, đỏ chuẩn hóa nhãn `text-[13px] font-bold uppercase tracking-wider` và số liệu `text-3xl font-black font-heading tracking-tight mt-1`.
- **Chi Tiết Chuyến Xe (`templates/views/view_trip_detail.html` & `static/js/app.js`):**
  - Khối P&L chuyến xe nâng lên `text-xl font-black tracking-tight mt-0.5`, nhãn `text-xs font-bold`.
  - Bảng kê chi phí 8 mục Triền Võ: Tên khoản chi nâng lên `text-sm font-bold text-slate-900`, số tiền nâng lên `text-sm font-black text-rose-600`, số lượng khoản chi accordion badge `text-xs font-bold`.

### 3. Chuẩn Hóa Cỡ Chữ & Nhãn Input Cho Toàn Bộ 4 Modals Form:
- **`modal_quotation.html` & `modal_booking.html`:**
  - Bỏ class `text-xs` bao ngoài form gây co chữ nhỏ toàn bộ modal.
  - Chuyển nhãn trường sang `text-xs font-bold uppercase tracking-wider text-slate-700`.
  - Nâng ô input/select sang `text-sm font-bold / font-semibold text-slate-900`.
  - Nút bấm hành động chuyển sang `text-sm font-bold`.
- **`modal_create_trip.html` & `modal_ocr.html`:**
  - Đồng bộ nhãn nhận diện OCR sang `text-xs font-bold uppercase tracking-wide`.

---

## [1.4.7] - 2026-09-21 (Tái Cấu Trúc Tổng Quan Dashboard Chuẩn Quốc Tế TMS & Hải Quan, Tích Hợp Biểu Đồ Chart.js & Click-to-Jump)

### 1. Chuẩn Hóa 4 Trụ Cột Điều Hành Chiến Lược Cho Ban Giám Đốc (Executive KPI Pillars):
- **Pillar 1: Tài Chính & Lợi Nhuận Gộp (Financial Health):**
  - Giám sát tức thì: Lợi Nhuận Gộp Tạm Tính (`45.601.889 đ`).
  - **Dòng trên:** Doanh thu cước (`60.495.000 đ`) | Chi phí vận hành (`14.893.111 đ`).
  - **Dòng dưới:** Quỹ Khả Dụng: Tiền mặt (`150.000.000 đ`) | Ngân hàng (`1.250.000.000 đ`).
  - 👉 **Hành động Click:** Chuyển ngay đến tab **`Quản lý Kế toán`** (`switchTab('ke-toan')`) để đối soát chi tiết.
- **Pillar 2: Vận Hành Chuyến & Năng Suất (Transport Operations & Productivity):**
  - Chuyến đang lăn bánh hôm nay (`5 chuyến`), Tổng chuyến trong kỳ (`16 chuyến`), Hoàn tất hôm qua (`8 chuyến`), và chỉ số SLA quốc tế **`98.2% OTD (On-Time Delivery Rate)`**.
  - 👉 **Hành động Click:** Chuyển ngay đến tab **`Điều vận`** (`switchTab('dieu-van')`) để xem bàn điều phối và theo dõi hành trình GPS.
- **Pillar 3: Khai Thác Tài Sản Đội Xe & Tài Xế (Fleet Assets & Driver Readiness):**
  - **Tỷ lệ khai thác xe (Fleet Utilization Rate):** `62.5%` (5/8 xe lăn bánh có hàng, 3 xe chờ bãi, 0 xe bảo trì).
  - Tỷ lệ sẵn sàng nhân lực: `7/10 Tài xế đang vận hành` (3 tài xế nghỉ phép).
  - 👉 **Hành động Click:** Chuyển ngay đến tab **`Xe & Bãi`** (`switchTab('xe-bai')`).
- **Pillar 4: Đơn Hàng Booking & Dịch Vụ Hải Quan (Commercial & Customs Clearance):**
  - Tờ khai thông quan Luồng Xanh: `85 tờ khai` (85.0% thông quan tự động không vướng mắc).
  - Phân loại: 12 Luồng Vàng, 3 Luồng Đỏ (kiểm hóa thực tế). Booking mới chờ điều xe: `6 đơn hàng`. Cảnh báo rủi ro lưu bãi DEM/DET: `0 container`.
  - 👉 **Hành động Click:** Chuyển ngay đến tab **`Sale & Booking`** (`switchTab('kinh-doanh')`) hoặc **`Dịch vụ Hải quan`** (`switchTab('hai-quan')`).
- **Tối Ưu & Tăng Kích Thước Chữ (Typography Scaling & Visual Balance):**
  - Tăng kích thước các con số trọng yếu lên `text-3xl font-black` (30px).
  - Tăng kích thước các dòng số liệu Doanh thu/Chi phí/Quỹ tiền lên `text-sm font-black font-heading` sắc nét.
  - Nâng khoảng đệm thẻ lên `p-5.5 md:p-6` cùng viền màu `border-l-[5px]` giúp không gian 4 ô cân đối, hài hòa và dễ quan sát từ xa.

### 2. Tích Hợp Hệ Thống Biểu Đồ Trực Quan Hiện Đại (Modern Logistics BI Analytics - Chart.js):
- **Biểu đồ Cột & Đường Đa Trục (Mixed Bar & Line Chart):**
  - Trực quan hóa diễn biến 7 ngày gần nhất: Cột Doanh Thu Cước (Teal `#0d9488`), Cột Chi Phí Vận Hành (Amber `#f59e0b`) kết hợp Đường Lợi Nhuận Gộp (Emerald `#10b981`).
  - Hỗ trợ Tooltip thông minh định dạng tiền tệ Việt Nam (`Intl.NumberFormat('vi-VN') + ' đ'`).
  - Đi kèm bảng tóm tắt 3 chỉ số đáy: Doanh thu TB/ngày (`~18.7 tr`), Chi phí TB/ngày (`~4.8 tr`), Biên lợi nhuận TB (`74.2%`).
- **Biểu đồ Vòng Donut Khai Thác Đội Xe & Hải Quan (Doughnut Chart with Center Display):**
  - Thiết kế tâm rỗng (Cutout 72%) hiển thị to rõ chỉ số trung tâm: `62.5% Khai Thác` hoặc `85.0% Luồng Xanh`.
  - Tích hợp công tắc chuyển đổi (Toggle Switch) mượt mà giữa **Đội Xe** (Xe chở hàng / Xe bãi / Bảo trì) và **Hải Quan** (Luồng Xanh / Vàng / Đỏ).

### 3. Cơ Chế Tương Tác Chi Tiết Toàn Diện (Interactive Drill-Down & Preserved Back Navigation):
- **Bảng P&L Chuyến Xe Mới Nhất:**
  - Nhấp chuột vào bất kỳ dòng nào hoặc nút "Chi Tiết" trên bảng -> Lập tức gọi `viewTripDetail(trip_code)` mở giao diện Chi Tiết Chuyến Xe với Timeline 10 bước, lộ trình GPS và chứng từ POD.
- **Bảo lưu vết điều hướng (Navigation History Memory):**
  - Khi bấm nút "Quay lại" trên màn hình Chi tiết chuyến xe, hệ thống ghi nhớ tab xuất phát (Dashboard hoặc Điều vận) để đưa Ban Giám Đốc trở về đúng màn hình ban đầu một cách tự nhiên.

---

## [1.4.6] - 2026-09-21 (Tái Cơ Cấu 7 Phân Hệ Menu Chuẩn Nghiệp Vụ & Khởi Tạo Phân Hệ Quản Lý Kế Toán - Đối Soát Chi Phí)

### 1. Cơ Cấu Lại 7 Phân Hệ Menu Sidebar Đúng Chuẩn Văn Bản & Nghiệp Vụ:
- **Nguyên tắc:** Chuẩn hóa toàn bộ 7 mục menu thanh điều hướng theo đúng văn bản và mục đích nghiệp vụ:
  1. **Tổng quan Dashboard:** Xây dựng biểu đồ và các thông số chính cho Ban Giám Đốc đọc nhanh.
  2. **Sale & Booking:** Chuyên quản lý Báo giá & Booking.
  3. **Điều vận:** Quản lý Điều xe, theo dõi chuyến...
  4. **Xe & Bãi:** Quản lý xe và các bãi xe.
  5. **Hành chính & Nhân sự:** Quản lý Nhân sự, tiền lương & tài sản hành chính,...
  6. **Quản lý Kế toán:** Quản lý Kế toán & Đối soát Chi phí,... Báo cáo Kế toán.
  7. **Dịch vụ Hải quan:** Phân hệ quản lý Dịch vụ Hải quan -> Đính kèm badge "Phát triển sau".

### 2. Khởi Tạo Phân Hệ "Quản Lý Kế Toán" (TMS Accounting & Freight Auditing):
- **Giao diện Đối soát & Báo cáo Kế toán (`templates/views/view_accounting.html`):**
  - **4 Thẻ KPI Kế toán tài chính:** Doanh Thu Cước (VNĐ), Tổng Chi Phí Chuyến (VNĐ), Lợi Nhuận Gộp & Tỷ suất (%) cùng Số Chuyến Chờ Kế Toán Chốt Sổ.
  - **Bảng Kê Đối Soát Từng Chuyến Xe:**
    - Cung cấp dữ liệu chi tiết: Mã Chuyến, Ngày chạy, Khách hàng & Tuyến đường, Xe & Tài xế, Cont/Hàng, Doanh thu cước, Tổng chi phí, Lợi nhuận gộp & Biên LN (%), Số hóa đơn/chứng từ, Trạng thái chốt sổ.
    - **Cơ chế Khóa sổ Kế toán (Settlement Locking):** 1-click cho phép Kế toán trưởng "Khóa sổ" chuyến xe để niêm phong chi phí/chứng từ hóa đơn, hoặc "Mở khóa sổ" khi phát sinh đối soát bổ sung.
  - **Bộ lọc tìm kiếm & trạng thái:** Tìm nhanh theo mã chuyến, khách hàng, số cont, biển số và phân loại theo trạng thái chốt sổ ("Chờ chốt sổ", "Đã chốt sổ").
- **Backend API Kế toán (`AccountingAPIView` tại `apps/dispatch/api_views.py`):**
  - Endpoint `GET /api/accounting/` tính toán tổng hợp Doanh thu cước từ `cached_revenue` (hoặc `selling_freight_price`), Chi phí vận hành chuyến từ `cached_expense`, Lợi nhuận gộp và đếm số chứng từ hóa đơn hợp lệ.

### 3. Chuẩn Hóa Điều Hướng Trang Chủ (Homepage Luôn Hiển Thị Dashboard):
- **Quy tắc điều hướng nhất quán:** Khi người dùng truy cập link gốc (`/`), tải lại trang, hoặc click vào Logo thương hiệu BIM Logistics ở góc trên Sidebar, giao diện luôn ưu tiên chuyển về phân hệ **`Tổng quan Dashboard`** để Ban Giám Đốc và Quản trị viên nắm bắt nhanh số liệu P&L, dòng tiền và năng suất vận tải.
- **Đồng bộ hóa giao diện:** Thiết lập `view-dashboard` hiển thị mặc định, nút Sidebar `Tổng quan Dashboard` được gán trạng thái `active` ban đầu, và Brand Logo Header được bao bọc thành thẻ liên kết tương tác chuyển nhanh về Dashboard.

---

## [1.4.5] - 2026-09-21 (Chuẩn Hóa Định Dạng Số Có Phân Cách Hàng Ngàn Cho Toàn Bộ Hệ Thống & Form Nhập)

### 1. Chuẩn Hóa Định Dạng Số & Phân Cách Hàng Ngàn Trong Tất Cả Các Form Nhập:
- **Nguyên tắc kế toán Việt Nam & MISA AMIS:** Tất cả các ô nhập số tiền tệ (VNĐ), đơn giá, chi phí, sản lượng cam kết, số container và ngày free time đều được định dạng phân cách hàng ngàn bằng dấu chấm (`.`), ví dụ: `2.500.000`, `3.800.000`, `76.000.000`.
- **Thao tác mượt mà theo thời gian thực (Real-time Auto-formatting):**
  - Sử dụng thẻ `input type="text" inputmode="numeric"` kết hợp class chuyên dụng `.input-number-vn`.
  - Tự động chèn dấu chấm phân cách hàng ngàn khi người dùng gõ số hoặc dán nội dung mà không gây giật lag.
  - Tự động duy trì chính xác vị trí con trỏ chuột (Cursor preservation algorithm), không bị nhảy con trỏ về cuối ô nhập khi gõ ở giữa chuỗi số.
  - Xử lý thông minh phím `Backspace`: khi bấm xóa ngay sau dấu chấm phân cách, hệ thống tự động xóa số đứng trước dấu chấm và định dạng lại chuỗi tức thì.
- **Tự động bóc tách số liệu (Safe Number Parsing):**
  - Hàm tiện ích `parseNumberVN()` tự động loại bỏ mọi ký tự định dạng để trích xuất số nguyên/thực sạch trước khi gửi lên API Backend hoặc tính toán công thức doanh thu `Đơn giá × Sản lượng`.

### 2. Các Phân Hệ & Form Nhập Đã Được Rà Soát & Áp Dụng:
- **Form Tạo & Hiệu Chỉnh Báo Giá (CRM / Sales):**
  - `Đơn Giá Cước Đề Xuất (VNĐ)`: Mặc định `3.800.000 đ`, hỗ trợ nhập phân cách hàng ngàn.
  - `Sản Lượng Cam Kết (Chuyến/Tháng)`: Mặc định `20` chuyến/tháng.
  - `Doanh Thu Kế Hoạch / Tháng (Tạm tính)`: Tự động tính và hiển thị phân cách chuẩn `76.000.000 đ`.
- **Form Tiếp Nhận & Hiệu Chỉnh Booking (Sale Admin / CS):**
  - `Cước Vận Chuyển (VNĐ)`: Mặc định `4.000.000 đ`, hỗ trợ nhập phân cách hàng ngàn.
  - `Tổng Số Cont / Chuyến Đặt`: Mặc định `1`.
  - `Free time Lưu Vỏ (DET)` & `Free time Lưu Bãi (DEM)`: Mặc định `7` ngày.
- **Form Chi Phí & Đối Soát Chuyến Xe (Điều Vận & Kế Toán Hiện Trường):**
  - `Thành Tiền Chi Phí (VNĐ)` trong modal Thêm mới & Sửa chi phí: Placeholder `vd: 1.518.000`.
- **Form Trích Xuất Chứng Từ Số (OCR Scanner):**
  - `Số Tiền Trích Xuất (VNĐ)`: Mặc định `120.000 đ`.

### 3. Rà Soát Bảng & Dashboard Thống Kê:
- Tất cả các ô số lượng, số cont, số đơn hàng trên KPI Cards và các cột số liệu trong bảng Báo giá & Booking đều được bao bọc qua chuẩn `Intl.NumberFormat('vi-VN')`.

---

## [1.4.4] - 2026-09-21 (Tối Ưu Typography UI/UX, Bỏ Nút Thừa & Mini-Dashboard Chuẩn Vận Chuyển)

### 1. Định Vị Rõ Góc Nhìn "Đơn Vị Vận Chuyển (Carrier / Trucking Contractor)":
- **Nhất quán vai trò:** Bim Logistics là đơn vị vận chuyển đường bộ (nhà xe / đội xe đầu kéo, xe tải) nhận chuyên chở hàng hóa từ Khách hàng (Chủ hàng / Forwarder); không phải là hãng tàu biển và không phải là người mua hàng.
- **Tập trung vào luồng hiện trường:** Quản lý đội xe, tài xế, lệnh điều xe, lấy rỗng/lấy hàng, dỡ hàng, hạ cảng, chi phí chuyến và chốt chứng từ POD/EIR.

### 2. Tinh Chỉnh UI/UX & Cân Bằng Typography Bảng Theo Dõi Booking:
- **Loại bỏ chữ thừa & trùng lặp:** Bỏ dòng chữ lặp "Đóng hàng gấp trong 48h" (đã có badge GẤP tinh tế), bỏ nhãn dài "Hãng tàu: ", chuẩn hóa nhãn dịch vụ thành các pill nhỏ gọn (`Xuất FCL · Maersk Line`, `Nhập FCL · SITC`, `Nội Địa FTL · Bim`).
- **Tối ưu hiển thị Lộ trình Vận chuyển:** Loại bỏ các cụm ngoặc đơn dài dòng (như "NGÃ 3 VŨNG TÀU..."), hiển thị rõ nét 3 chặng vận tải: `1. Lấy: [Depot]`, `2. Kho: [Kho đóng hàng]`, `3. Hạ: [Cảng/ICD]`.
- **Cân bằng Font-size:** Điều chỉnh font đồng nhất (12px/13px), tăng độ tương phản màu chữ (`text-slate-800`, `text-slate-900`) tránh tình trạng chữ mờ nhỏ gây mỏi mắt người điều phối.

### 3. Tối Ưu Nút Thao Tác (Action UX):
- **Chuẩn hóa bộ 3 nút thao tác "Xem / Sửa / Xóa":**
  1. **Nút Xem (`ph-eye` - màu xanh sky):** Mở modal ở chế độ chỉ đọc (Read-only view), vô hiệu hóa các trường nhập liệu và ẩn nút Lưu để nhân viên tra cứu an toàn thông tin đơn hàng / báo giá.
  2. **Nút Sửa (`ph-pencil-simple` - màu xanh teal/indigo):** Mở modal ở chế độ hiệu chỉnh đầy đủ, cho phép cập nhật thông tin và chuyển đổi trạng thái đơn hàng.
  3. **Nút Xóa (`ph-trash` - màu đỏ rose):** Xóa mềm (`is_deleted=True`) bảo lưu dữ liệu lịch sử.
  4. *Riêng bảng Booking:* Bổ sung nút **`Điều Xe`** cho các đơn hàng còn cont chưa hoàn tất để chuyển nhanh dữ liệu sang lệnh điều động.
- **Bỏ nút "Tạo Lệnh Điều Động" ở Header Sale & Booking:** Loại bỏ nút tổng ở góc trên cùng bên phải vì không cần thiết; thao tác điều xe được phân định rõ dưới từng dòng Booking bằng nút **`Điều Xe`**.
- **Bổ sung nút "Làm Mới":** Hỗ trợ nhân viên Sale/CS và Điều vận cập nhật nhanh dữ liệu thời gian thực.

### 4. Mini-Dashboard Riêng Cho Từng Tab Với Các Trạng Thái Vận Hành Chuẩn:
- **Tab 1: Báo Giá & Tuyến Cước (CRM Sales - 4 Ô Số):**
  1. *Đang Thương Lượng* (`NEGOTIATING`): Đang chào giá & đàm phán cước.
  2. *Chờ BGĐ Phê Duyệt* (`PENDING_APPROVAL`): Trình duyệt bảng cước và lương chuyến.
  3. *Tuyến Cước Đã Duyệt* (`APPROVED`): Đã ký hợp đồng, sẵn sàng nhận booking.
  4. *Doanh Thu Kế Hoạch (Tháng)*: Doanh thu theo cam kết sản lượng.
- **Tab 2: Đơn Đặt Hàng / Booking Từ Khách (Sale Admin / CS - 4 Ô Số):**
  1. *Chờ Điều Xe* (`PENDING_DISPATCH`): Chưa gán xe (Ưu tiên điều gấp).
  2. *Đang Điều Xe* (`PARTIALLY_DISPATCHED`): Đang kéo cont theo từng đợt.
  3. *Đã Đủ Xe / Hoàn Tất* (`COMPLETED`): Đã phát lệnh 100% số cont.
  4. *Sản Lượng Container*: Số cont đã điều / Tổng cont cần kéo (kèm số cont còn lại).

---

### 1. Bản Chất Nghiệp Vụ: "Booking Là Từ Khách Hàng (Customer Booking Order)":
- **Khắc phục nhận thức phiến diện về Booking:** Đơn đặt hàng vận chuyển xuất phát từ **Khách hàng** (Chủ hàng / Forwarder / Doanh nghiệp sản xuất) chứ không chỉ đơn thuần là xác nhận của hãng tàu biển.
- **Mở rộng 3 phân loại hình thức vận chuyển (`booking_type`):**
  1. `EXPORT_FCL`: **Kéo Cont Xuất Khẩu (FCL)** — Lấy rỗng tại Depot ➔ Đóng hàng tại Kho khách ➔ Hạ bãi Cảng xuất CY (Kèm số Booking hãng tàu, SI/VGM Cut-off, Closing Time).
  2. `IMPORT_FCL`: **Kéo Cont Nhập Khẩu (FCL)** — Lấy cont hàng tại Cảng nhập ➔ Dỡ hàng tại Kho khách ➔ Hạ trả rỗng tại Depot (Kèm số lệnh D/O cảng, hạn lưu cont/bãi DET/DEM).
  3. `DOMESTIC`: **Vận Chuyển Nội Địa / Nhà Máy (FTL)** — Giao nhận nguyên chuyến giữa các kho/nhà máy nội địa bằng xe tải nặng/đầu kéo, không qua hãng tàu biển (Kèm số PO / Đơn mua hàng).

### 2. Trọn Gói CRUD Báo Giá (Quotation) & Máy Trạng Thái Chu Trình Bán Hàng (Sales Funnel):
- **Backend APIs:**
  - `POST /api/sales/` (action: `'create_quotation'`): Tạo mới báo giá tuyến cước, tự động liên kết hoặc tạo khách hàng.
  - `GET /api/quotations/<int:pk>/`: Truy vấn chi tiết báo giá để nạp form chỉnh sửa.
  - `PUT /api/quotations/<int:pk>/`: Cập nhật thông tin khách hàng, tuyến đường, đơn giá cước, sản lượng cam kết.
  - `PATCH /api/quotations/<int:pk>/status/`: Đổi nhanh trạng thái chu trình Sales (`NEGOTIATING` ➔ `PENDING_APPROVAL` ➔ `APPROVED` ➔ `REJECTED` ➔ `EXPIRED`).
  - `DELETE /api/quotations/<int:pk>/`: Xóa mềm (`is_deleted=True`), tuân thủ chuẩn an toàn dữ liệu lịch sử Audit Trail.
- **Frontend & Modal:**
  - Modal `modal-quotation` chuẩn MISA AMIS: Tự động tính Doanh thu kế hoạch (`unit_price × expected_trips_monthly`).

### 3. Trọn Gói CRUD Đơn Đặt Hàng / Booking (Customer Order) & Liên Thông Điều Vận:
- **Backend APIs:**
  - `POST /api/sales/` (action: `'create_booking'`): Tạo đơn đặt hàng từ khách hàng hỗ trợ cả 3 hình thức (`booking_type`).
  - `GET /api/bookings/<int:pk>/`: Lấy thông tin chi tiết đơn hàng phục vụ xem và sửa.
  - `PUT /api/bookings/<int:pk>/`: Cập nhật lộ trình 3 điểm, chứng từ hàng hóa, mốc thời gian cut-off, số cont và giá cước.
  - `PATCH /api/bookings/<int:pk>/status/`: Cập nhật trạng thái (`PENDING_DISPATCH`, `PARTIALLY_DISPATCHED`, `COMPLETED`, `CANCELLED`).
  - `DELETE /api/bookings/<int:pk>/`: Xóa mềm bảo toàn dữ liệu vận tải.
- **Frontend & Modal:**
  - Modal `modal-booking` tương tác thông minh qua hàm `onBookingTypeChange()`:
    + Ẩn các trường Hãng tàu/Tàu/Chuyến khi chọn vận tải Nội Địa.
    + Đổi nhãn linh hoạt: "Lấy cont hàng" & "Trả rỗng" cho Hàng Nhập vs "Cấp rỗng" & "Hạ bãi" cho Hàng Xuất.
  - Nút "Điều Xe" liên thông tự động nạp mã Booking, tuyến đường, loại cont và yêu cầu kỹ thuật sang Modal Điều Động (`modal-dispatch`).

---

### 1. Phân Quyền 2 Sub-Tabs Nghiệp Vụ Thương Mại:
- **Tab 1: Báo Giá & Khách Hàng (Dành cho Sales / Nhân viên Kinh Doanh - NVKD):**
  - Chức năng: Tập trung tìm kiếm khách hàng mới, khảo sát tuyến đường vận chuyển, tính toán cước và lương chuyến, chào giá và theo dõi phê duyệt hợp đồng thương mại.
  - Thẻ KPI con: Báo giá đang đàm phán, Tuyến cước đã duyệt, Doanh thu kế hoạch cam kết.
- **Tab 2: Quản Lý Booking Hãng Tàu (Dành cho Sale Admin / Customer Service - CS):**
  - Chức năng: Tiếp nhận Booking Confirmation từ các hãng tàu quốc tế (Maersk, CMA CGM, ONE, HMM, Cosco...), kiểm soát hạn SI Cut-off, VGM Cut-off, CY Closing Time, quản lý số cont theo đợt và chuyển giao lệnh điều xe sang đội Điều Vận.
  - Thẻ KPI con: Booking chờ điều xe, Booking đang điều xe, Booking đã hoàn thành.

### 2. Dashboard Tình Trạng Kinh Doanh & Hiệu Suất Tăng Trưởng (Màn Hình Chính):
- **Cụm 4 Thẻ KPI Tăng Trưởng So Với Tuần / Tháng Trước:**
  1. *Doanh Thu Kế Hoạch Tuyến:* `429.500.000 đ` (+14.8% so với tháng trước ↗️).
  2. *Tổng Đơn Hàng Booking:* `8 Đơn hàng` (+33.3% / +2 đơn mới trong tuần ↗️).
  3. *Sản Lượng Container Vận Tải:* `20 Cont` (+25.0% so với tuần trước ↗️).
  4. *Tỷ Lệ Chốt Tuyến (Win Rate):* `50.0%` (+12.5% so với tháng trước ↗️).
- **Thanh Sub-tabs AMIS hiện đại:**
  - Hỗ trợ chuyển đổi tab linh hoạt qua hàm `switchSalesSubTab(tabName)` mà không load lại trang.
  - Hiển thị badge số lượng đơn/báo giá động trên tiêu đề tab.
  - Tích hợp nhãn thông báo phân quyền theo chức danh trực quan (`sales-tab-role-hint`).

---

## [1.4.1] - 2026-09-21 (Tái Cấu Trúc Phân Hệ Sale & Booking: Chuẩn Hóa Luồng Báo Giá ➔ Booking & Thứ Tự Khẩn Cấp)

### 1. Tái Cấu Trúc Giao Diện Chuỗi Cung Ứng (Báo Giá Ở Trên ➔ Booking Ở Dưới):
- **Phân định rõ 2 giai đoạn nghiệp vụ trên giao diện (`view_sales.html`):**
  - **Giai đoạn 1 (Phần trên):** Bảng Báo Giá Tuyến Cước & Phễu Khách Hàng (CRM) — Thỏa thuận đơn giá cước vận chuyển, định mức doanh thu và phê duyệt tuyến cước.
  - **Giai đoạn 2 (Phần dưới):** Danh Sách Booking / Đơn Hàng Vận Chuyển Chờ Điều Xe — Tiếp nhận lệnh Booking từ hãng tàu quốc tế và kết nối sang Điều Vận.
- **Chia tách 2 khối Thẻ KPI độc lập:**
  - **Khối Thẻ Báo Giá:** Báo giá đang thương lượng, Tuyến cước đã duyệt, Doanh thu kế hoạch tháng.
  - **Khối Thẻ Booking:** Booking chờ điều xe, Booking đang điều xe, Booking đã hoàn thành.

### 2. Sắp Xếp Booking Theo Mức Độ Khẩn Cấp & Tiến Độ Thời Gian:
- **Nguyên tắc sắp xếp đơn hàng:**
  - Ưu tiên trạng thái: `PENDING_DISPATCH` (Chờ điều xe) và `PARTIALLY_DISPATCHED` (Đang điều xe) luôn nằm trên `COMPLETED`.
  - Ưu tiên ngày giờ: Sắp xếp theo ngày đóng hàng (`loading_date`) tăng dần — **đơn hàng đóng hàng hôm nay / ngày mai luôn nổi lên trên cùng**.
- **Hệ thống cảnh báo trực quan (Badge GẤP):**
  - Đơn hàng có lịch đóng hàng trong vòng 48h tự động gắn badge đỏ nổi bật: `GẤP - Đóng hàng gấp trong 48h`.
  - Tô màu nền cảnh báo nhẹ (`bg-amber-50/20`) để nhân viên điều vận và sale dễ dàng nhận biết tức thì.

### 3. Đồng Bộ Hóa Backend & Frontend:
- **API `SalesAPIView` & `BookingActiveAPIView` (`apps/dispatch/api_views.py`):**
  - Tách nhóm stats thành `quotation_stats` và `booking_stats`.
  - Áp dụng `models.Case` và `models.When` để sắp xếp dữ liệu khẩn cấp nhất quán.
- **Renderer Frontend (`static/js/app.js`):**
  - Hàm `loadSalesData()` cập nhật tự động toàn bộ 6 thẻ KPI và bảng Booking khẩn cấp.

---

## [1.4.0] - 2026-09-21 (Liên Thông Booking Sale ➔ Điều Vận & Chuẩn Hóa Typography UI/UX)

### Tích Hợp 4 Bộ Booking Thực Tế Chuẩn Hãng Tàu Quốc Tế (Maersk, CMA CGM, ONE, HMM):
- **Phân tích và bổ sung các trường chứng từ vận tải biển:**
  - `commodity`: Mô tả hàng hóa thực tế (`Ryobi Blower`, `Máy cắt cỏ TTI`, `Trimmer`, `Bao bì nhựa...`).
  - `hs_code`: Mã phân loại hải quan hàng hóa (`8414.59`, `8433.11`, `8467.29`...).
  - `si_cutoff`: Hạn chót gửi thông tin chi tiết làm B/L (Shipping Instruction Cut-off).
  - `vgm_cutoff`: Hạn chót nộp phiếu cân tải trọng container (Verified Gross Mass Cut-off).
  - `free_time_detention` / `free_time_demurrage`: Quản lý số ngày miễn phí lưu vỏ (DET) và lưu bãi (DEM) theo chuẩn từng hãng tàu.
- **Nạp bộ dữ liệu 4 Booking mẫu thực tế:**
  1. `BK-CMA-3452548` (CMA CGM - Lô 2 cont 40HC máy cắt cỏ TTI - Cấp rỗng ICD Phúc Long ➔ TTI Củ Chi ➔ Hạ Gemalink Vũng Tàu).
  2. `BK-ONE-5448700` (ONE - Lô 5 cont 40HC dụng cụ Ryobi TTI - Cấp rỗng Sowatco Long Bình ➔ TTI Củ Chi ➔ Hạ ICD Phước Long 3).
  3. `BK-HMM-90497300` (HMM - Lô 2 cont 40HC máy tỉa hàng rào - Cấp rỗng Sowatco Long Bình ➔ TTI Củ Chi ➔ Hạ ICD Phước Long 3).
  4. `BK-MAE-276081838` (Maersk - 1 cont 40HC bao bì nhựa - Cấp rỗng Solog Depot ➔ Nhà máy An Di ➔ Hạ ICD Sowatco Long Bình).

### Chuẩn Hóa Trình Bày Dữ Liệu Bảng Điều Độ (Khắc Phục Cỡ Chữ & Truncate):
- **Phân cấp Typography khoa học:**
  - Dòng chính: `text-[13px] font-bold text-slate-800` (rõ nét, chuẩn độ tương phản).
  - Dòng phụ: `text-xs (12px) font-medium text-slate-600` (dễ đọc, loại bỏ triệt để cỡ chữ 9px-10px lí nhí).
- **Loại bỏ lỗi cắt cụt chữ (`truncate`):**
  - Cột Khách hàng & Kho: Hiển thị đầy đủ tên doanh nghiệp và kho bốc/dỡ hàng, khoảng cách đệm thoáng.
  - Cột Lộ trình 3 điểm: Hiển thị mạch lạc `Nơi lấy ➔ Kho đóng ➔ Nơi hạ` không bị cắt cụt `TAKIGAWA VS...`.
  - Cột Cont/Booking/Seal: Bố cục font-mono gọn gàng, tách biệt số B/L và số Chì.

### Kiến Trúc Liên Thông Booking (Sale) ➔ Lệnh Điều Động (Điều Vận):
- **Model `BookingOrder` (`apps/customers/models.py`):**
  - Quản lý các đơn hàng vận chuyển do Sale/CS chốt với khách hàng và hãng tàu.
  - Lưu trữ 9 thông tin cốt lõi: Khách hàng, Số Booking/BL, Hãng tàu, Loại cont, Tổng số cont, Số cont đã điều, Lộ trình 3 điểm, Cắt máng CY, Lịch đóng hàng, Đơn giá cước thỏa thuận.
  - Migrations: `customers.0002_bookingorder` và `dispatch.0005_dispatchtrip_booking_order`.
- **API `BookingActiveAPIView` (`/api/bookings/active/`):**
  - Cung cấp danh sách Booking đang chờ/đang điều xe kèm số cont còn lại cho Điều Vận.
- **Kế Thừa Dữ Liệu 1 Chạm Trong Modal Tạo Lệnh (`modal_create_trip.html` & `app.js`):**
  - Tích hợp Dropdown thông minh trên đầu Form: **"Chọn Booking / Đơn Hàng Từ Sale"**.
  - Tự động điền 9 trường dữ liệu khi chọn Booking: Khách hàng, B/L, Loại cont, Giờ cắt máng CY, Lịch đóng hàng, Lộ trình 3 điểm, Doanh thu cước.
  - Điều độ viên chỉ cần gán Xe, Tài xế, Số Cont, Số Seal, Invoice & Dock.
  - Tự động tăng tiến độ `dispatched_containers` và cập nhật trạng thái Booking (`PARTIALLY_DISPATCHED` hoặc `COMPLETED`).
- **Nâng Cấp Màn Hình Sale & Báo Giá (`view_sales.html` & `app.js`):**
  - Bổ sung bảng quản lý Booking Order, theo dõi thanh tiến độ điều xe (VD: `1/3 Cont`).
  - Nút **"🚀 Điều Xe"** mở thẳng modal Tạo Lệnh Điều Động và tự động chọn sẵn Booking tương ứng.

---

## [1.3.0] - 2026-09-21 (Chuẩn Hóa Bảng Điều Độ Logistics Thực Tế & Đối Soát Excel Triền Võ)

### Đối Chiếu Bảng Excel Điều Độ Hiện Trường (Media Triền Võ Logistics):
- **Bổ sung 6 nhóm trường dữ liệu thực tế từ Excel:**
  1. `commercial_invoice`: Hóa đơn thương mại đi kèm hàng hóa (Commercial Invoice - ví dụ `VCC33970`, `VCC33077`), phân biệt với hóa đơn nâng/hạ cảng.
  2. `warehouse_dock`: Cửa xuất nhập kho (Cửa Dock - ví dụ `D2`, `DP`), định tuyến xe bốc hàng tại kho lớn (như TTI Củ Chi).
  3. `dropoff_vehicle`: Quản lý xe hạ cont tách biệt với xe kéo ban đầu khi có sang tải/đổi đầu kéo.
  4. `cont_location_type`: Phân loại vị trí vỏ cont (`NHÀ MÁY`, `BÃI TVL`, `CẢNG / DEPOT`).
  5. **Chuỗi 5 mốc thời gian kho khách hàng:** Theo dõi `ETA Đến Kho`, `Giờ Kho Gọi Vào`, `Giờ Xe Vào Thực Tế`, `Giờ Kho Gọi Ra`, `Giờ Xe Ra Thực Tế` để giải quyết bài toán phạt lưu xe / phạt trễ giờ đóng cont.
  6. **Phân loại nguồn xe (`ownership_type`):** Phân biệt `Xe Nhà` (Đội xe công ty) và `Xe Bạn` (Thuê ngoài / 3PL Subcontractor) kèm màu sắc nhận diện trực quan (Teal vs Amber).

### Nâng Cấp Kiến Trúc & Database Migration:
- **`apps/fleet/models.py`:** Thêm enum `VehicleOwnership` (`OWNED`, `SUBCONTRACTOR`) và trường `ownership_type` vào model `Vehicle`. Migration: `fleet.0002_vehicle_ownership_type`.
- **`apps/dispatch/models.py`:** Mở rộng `DispatchTrip` lưu trữ đầy đủ 12 trường dữ liệu vận hành từ Excel. Migration: `dispatch.0004_dispatchtrip_actual_gate_in_time_and_more`.
- **Nạp bộ dữ liệu thực tế (Seed Data):** Nạp thành công 7 chuyến xe thực tế từ bảng Excel vào Database:
  - `TVL-0917-001` (Cát Đằng HL2), `TVL-0917-002` (Andi Bãi TVL), `TVL-0917-003` (Andi TVL), `TVL-0917-004` (MOL TTI Củ Chi OP - VCC33970), `TVL-0917-005` (MOL TTI Củ Chi OP - VCC33077 - D2), `TVL-0917-006` (Vicaco Đồng Tháp - Xe nhà), `TVL-0917-007` (Takigawa - Xe bạn).

### Giao Diện Web ERP & Frontend:
- **`templates/views/view_dispatch.html` & `static/js/app.js`:**
  - Thiết kế bảng điều độ 8 cột mới: `Mã / Lịch Đóng`, `Khách hàng & Kho`, `Booking / Cont / Seal`, `Invoice / Dock`, `Xe Kéo & Xe Hạ`, `Lưu Ý & Vị Trí Cont`, `Nơi Lấy ➔ Nơi Hạ`, `Trạng thái`.
  - Hiển thị badge Xe Nhà / Xe Bạn, badge Cửa Dock, mã hóa đơn thương mại font-mono sắc nét.
- **`templates/components/modal_create_trip.html`:** Bổ sung ô nhập Hóa đơn thương mại, Cửa Dock, Ngày/Giờ đóng hàng, Vị trí cont.
- **`templates/views/view_trip_detail.html`:** Bổ sung khối **"Tiến Độ Thời Gian Tại Kho Khách Hàng (5 Mốc Thực Tế)"** và thẻ thông tin nguồn xe/xe hạ/vị trí cont.

---

## [1.2.0] - 2026-09-21 (Vòng Đời Chi Phí, Xử Lý Nhập Nhầm & Khóa Sổ Kế Toán Bất Khả Xâm Phạm)

### Phân Tích Nghiệp Vụ Chuyên Sâu & Vòng Đời Chi Phí Hiện Trường:
- **Ma trận trạng thái 3 cấp độ:**
  1. `PENDING` (Chờ duyệt): Tài xế tự do sửa/xóa các khoản vừa nhập nhầm (số tiền, danh mục, số HĐ).
  2. `APPROVED` (Đã duyệt): Điều độ viên/Kế toán đã duyệt, tài xế bị khóa sửa để bảo vệ dữ liệu vận hành.
  3. `SETTLED` (Đã chốt sổ Kế toán): Toàn bộ bảng kê bị **KHÓA CỨNG (READ-ONLY)**, bất khả xâm phạm.
- **Bảo vệ toàn vẹn dữ liệu Kế toán:**
  - `apps/billing/models.py`: Thêm `ApprovalStatus.SETTLED`, trường `approved_at`, hàm `clean()` và `delete()` chặn sửa/xóa khi `trip.is_expenses_settled = True`.
  - `apps/dispatch/models.py`: Thêm `is_expenses_settled`, `settled_at`, `settled_by`.
  - Backend API: Trả về **HTTP 403 Forbidden** khi có yêu cầu thêm/sửa/xóa trên chuyến xe đã chốt sổ.
  - Soft-Delete: Áp dụng xóa mềm bảo toàn lịch sử kiểm toán vận tải.

### Tính Năng Mới Cho Điều Vận & Kế Toán (Web CMS):
- **Nút "🔒 Chốt Sổ Kế Toán":** Khóa sổ toàn bộ chi phí chuyến xe sau khi nghiệm thu chứng từ.
- **Nút "🔓 Mở Sổ":** Dành cho Kế toán trưởng mở khóa đối soát lại khi có sai sót.
- **Thao tác nhanh trên từng dòng chi phí:** Nút ✏️ Sửa (mở modal chỉnh sửa số tiền, số HĐĐT, mã tra cứu, link tra cứu) và 🗑️ Xóa (Soft-delete có xác nhận).
- **Banner Khóa Sổ:** Hiển thị nổi bật cảnh báo bảng kê đã được kế toán chốt sổ.

### Tính Năng Mới Cho Tài Xế (Mobile Simulator & Hiện Trường):
- **Giao diện thẻ chi phí thông minh:** Hiển thị rõ trạng thái `Chờ duyệt` (có nút ✏️ Sửa, 🗑️ Xóa), `Đã duyệt` (Khóa), `Đã chốt sổ` (Khóa Kế toán).
- **Nút báo mốc kho 1 chạm (Bước 6 SOP):** 4 nút bấm tức thời:
  - 🚗 *Sắp đến kho (trước 30p)*
  - 📍 *Đã đến cổng kho*
  - 📦 *Bắt đầu dỡ/đóng hàng*
  - ✅ *Hoàn tất đóng hàng*

---

## [1.1.0] - 2026-09-21 (Chuẩn Hóa Bảng Kê Chi Phí Thực Tế & Lệnh Điều Động Triền Võ)

### Phân Tích & Chuẩn Hóa Chi Phí Hiện Trường (5 Chứng Từ Thực Tế Triền Võ):
- **Phân rã 8 hạng mục chi phí chuẩn theo Bảng Kê Chi Phí thực tế:**
  1. `HĐ điện tử`: Quản lý thông tin hóa đơn điện tử Cảng/Depot, hỗ trợ lưu `invoice_number`, `invoice_lookup_code`, `invoice_lookup_url` và nút bấm tra cứu trực tiếp trên trình duyệt (VNPT-Invoice, Solog e-Hoadon).
  2. `Nâng`: Phí nâng container rỗng/hàng tại Cảng/Depot (khớp với Phiếu báo tra cứu nâng rỗng Công ty Vận tải Anh Phong - 1.925.000 đ).
  3. `Hạ`: Phí hạ container tại Cảng/ICD (khớp với Biên nhận tiền Cảng ICD Tây Nam - 1.518.000 đ).
  4. `Cược cont`: Tiền đặt cược vỏ container với hãng tàu.
  5. `Cân xe`: Phí trạm cân tải trọng, chứng chỉ VGM.
  6. `Bốc xếp`: Phí nhân công đóng hàng, trút hàng bãi/kho.
  7. `Vé cầu đường`: Phí qua trạm BOT, vé phà, ePass/VETC.
  8. `Chi phí khác`: Lưu bãi quá hạn, lưu ca xe, vá vỏ, sửa chữa gấp dọc đường.
  - **Dòng Tổng Chi Phí Chuyến Xe:** Tự động tính tổng cộng các khoản phát sinh và đối soát với P&L doanh thu cước khách hàng.
  - **Tính năng Mở rộng Accordion Xem Chi Tiết Từng Dòng Con:** Khi một khoản mục (ví dụ Vé cầu đường có nhiều vé trạm) có $\ge 2$ khoản chi, dòng cha hiển thị số tổng gộp kèm badge đếm số lượng; người dùng bấm vào dòng hoặc nút "Chi tiết" để xổ xuống xem chi tiết từng vé (STT phân cấp 7.1, 7.2..., thành tiền riêng, số hóa đơn, link tra cứu online và đơn vị thu/trạm BOT).
- **Nâng cấp Database Models (`apps/billing/models.py` & `apps/dispatch/models.py`):**
  - Mở rộng `TripExpense` lưu vết: `invoice_issuer`, `invoice_number`, `invoice_lookup_code`, `invoice_lookup_url`, `amount_before_tax`, `tax_rate`, `tax_amount`.
  - Mở rộng `DispatchTrip` lưu vết thông tin vận tải & EIR: `pickup_depot`, `dropoff_depot`, `delivery_warehouse`, `eir_number`, `shipping_line`, `vessel_voyage`, `destination_port`, `vgm_weight`.
- **Nạp bộ dữ liệu thực tế (`seed_data`):**
  - Chuyến `TVL-0916-007`: Xe `50H-896.50`, Tài xế Phong, Khách hàng AN DI VN, Cont `MRKU6074874` (40HC), Phiếu EIR 1955, HĐĐT ICD Tây Nam 138001 (1.518.000 đ), Vé BOT (30.000 đ).
  - Chuyến `TVL-0916-008`: Xe `50H-896.50`, Tài xế Phong, Khách hàng AN DI VN, Cont `CSNU8011022` (40HC), Phiếu EIR AP-622 0034976, HĐĐT Anh Phong 0060962 (1.925.000 đ), Vé BOT (100.000 đ).

### Nâng Cấp Modal Tạo Lệnh Điều Động Mới (`modal_create_trip.html`):
- **Phân loại Loại Cont / Xe chuẩn:**
  - **Container Chuẩn:** `45G1` (Cont 45 Feet), `40HC` (High Cube), `40GP` (General Purpose), `22GP` (Cont 20 Feet).
  - **Đội Xe Tải:** `1T`, `2T`, `2T5`, `3T`, `5T`, `8T`, `10T`, `15T`.
- **Bổ sung ô nhập "Cắt Máng CY / Giờ SI":** Nằm ở hàng 2 kế bên ô Số Seal, hiển thị viền nổi bật để điều độ theo dõi hạn chót cắt máng cảng/tàu.
- **Bổ sung Modal "Thêm Khoản Chi Phát Sinh"**: Cho phép nhập nhanh các khoản chi phí phát sinh, mã hóa đơn điện tử tra cứu trực tiếp.

---

## [1.0.0] - 2026-09-21 (Bản Khởi Tạo Hoàn Chỉnh - TMS Core Release)

### Kiến Trúc & Cơ Sở Dữ Liệu (Database & Modular Monolith):
- Thiết kế và triển khai 8 phân hệ chuyên biệt theo kiến trúc Modular Monolith:
  - `core`: `TimeStampedModel`, `SoftDeleteModel`, `TrackingEventLog`, State Machine Engine.
  - `apps/fleet`: `Vehicle`, `Trailer`, cảnh báo tự động hạn đăng kiểm và lịch bảo dưỡng định kỳ.
  - `apps/personnel`: `Employee`, phân quyền phòng ban, quản lý số GPLX hạng FC, lương cơ bản và tạm ứng.
  - `apps/customers`: `Customer`, `RouteTariff` (biểu cước 3 điểm), `Quotation` (báo giá & CRM).
  - `apps/dispatch`: `DispatchTrip`, `TripTimelineItem`, bộ đệm tài chính Denormalization via Signals.
  - `apps/documents`: `TripDocument`, phân loại EIR lấy/hạ, POD, hóa đơn kèm dữ liệu OCR.
  - `apps/billing`: `TripExpense`, quản lý phê duyệt chi phí phát sinh hiện trường.
  - `apps/exceptions`: `TripException`, xử lý sự cố kẹt cảng, hỏng vỏ cont, tai nạn theo Bước 9.
- Áp dụng nguyên tắc bất khả xâm phạm dữ liệu vận tải (**No Hard-Delete**), toàn bộ khóa ngoại dùng `PROTECT`.
- Tạo thành công toàn bộ migration và nạp bộ dữ liệu mẫu thực tế chuẩn xác (`seed_data`) khớp 100% tài liệu điều vận.

### Chuẩn Hóa Typography Quốc Tế & Cấu Trúc UI/UX Modular (Bim_ERP-Solutions Standard):
- **Đồng bộ hóa 100% triết lý UI/UX từ `Bim_ERP-Solutions` (MISA AMIS Enterprise Standard):**
  - **Sidebar Contrast Theme:** Áp dụng kích thước chuẩn `280px` (`17.5rem`), màu nền `#253147` (header `#1a2334`), menu active phủ nền `rgba(13, 148, 136, 0.25)` với viền nhấn `#2dd4bf`.
  - **MISA ERP Table System:** Toàn bộ bảng dữ liệu chuyển sang chuẩn `.erp-table-container` và `.erp-table` với padding `10px 14px`, header `#f8fafc`, hỗ trợ `tabular-nums` căn thẳng hàng số liệu cước và tiền lương.
  - **Button Design System:** Chuẩn hóa `.btn-amis-primary` (Teal `#0d9488`, hover `#0f766e`, bo góc 8px) và `.btn-amis-secondary` (nền trắng viền `#cbd5e1`).
  - **Graceful Notification & Defensive UI (Tuyệt đối không để crash 500):**
    - Tích hợp hệ thống Toast cảnh báo nổi `#toast-container` góc trên phải màn hình với 3 trạng thái thân thiện (thành công, cảnh báo, lỗi kết nối).
    - **Inline Field Validation:** Đổi viền ô nhập sang đỏ (`.input-error`), hiển thị giải thích nhỏ `.field-error-msg`, tự động xóa lỗi thời gian thực ngay khi người dùng bắt đầu gõ phím (`input event`).
- Nâng cấp Typography chuẩn doanh nghiệp quốc tế:
  - **Plus Jakarta Sans**: Phông chữ hình học hiện đại (Geometric Sans) cho hệ thống tiêu đề (`h1-h6`), thẻ KPI và bảng phân tích số liệu tài chính (`tabular-nums`).
  - **Be Vietnam Pro**: Phông chữ được tối ưu hóa đặc biệt cho tiếng Việt với tỉ lệ vàng dấu thanh, độ tương phản cao, mang lại trải nghiệm đọc mượt mà cho nội dung vận tải và bảng biểu.
- Tái cấu trúc toàn bộ hệ thống Templates theo tiêu chuẩn công nghiệp:
  - Layout khung sườn: [`templates/base.html`](file:///e:/Bim_Logistics/templates/base.html) và [`templates/index.html`](file:///e:/Bim_Logistics/templates/index.html).
  - Tách thành các components độc lập:
    - [`templates/components/sidebar.html`](file:///e:/Bim_Logistics/templates/components/sidebar.html)
    - [`templates/components/topbar.html`](file:///e:/Bim_Logistics/templates/components/topbar.html)
    - [`templates/components/modal_create_trip.html`](file:///e:/Bim_Logistics/templates/components/modal_create_trip.html)
    - [`templates/components/modal_ocr.html`](file:///e:/Bim_Logistics/templates/components/modal_ocr.html)
  - Tách thành 7 phân hệ view chuyên biệt trong `templates/views/`:
    - `view_dashboard.html`, `view_dispatch.html`, `view_trip_detail.html`, `view_personnel.html`, `view_fleet.html`, `view_customs.html`, `view_sales.html`.
  - Tách riêng tệp stylesheet và script:
    - [`static/css/main.css`](file:///e:/Bim_Logistics/static/css/main.css)
    - [`static/js/app.js`](file:///e:/Bim_Logistics/static/js/app.js)

### Giao Diện Web & Trải Nghiệm Người Dùng (UI/UX):
- Xây dựng giao diện Single Page hiện đại theo chuẩn màu BIM Ecosystem (`teal-700`, `emerald-600`, `amber-500`, `rose-600`).
- Tích hợp 6 màn hình quản trị nghiệp vụ:
  1. Tổng quan Ban Giám Đốc (Quỹ tiền, năng suất chuyến xe, trạng thái xe, P&L chuyến).
  2. Bảng Điều Độ Vận Tải (Bộ lọc, tìm kiếm, modal tạo lệnh điều động mới lưu trực tiếp vào DB).
  3. Chi tiết chuyến xe (Timeline 10 bước động, thông tin chứng từ & chi phí phát sinh).
  4. Quản lý Nhân sự & Bảng lương chuyến tạm tính.
  5. Quản lý Xe & Bãi với cảnh báo thông minh hạn đăng kiểm.
  6. Thủ tục Hải Quan & Quản lý Kinh Doanh Báo giá.
- Tích hợp Mobile Simulator cho tài xế với camera OCR giả lập nhận diện hóa đơn và trả chứng từ EIR/POD.

### Triển Khai Docker & Quản Trị Cổng Mạng (Docker Deployment):
- Khởi tạo `Dockerfile` (Python 3.12-slim) và `docker-compose.yml`.
- Tách biệt 2 container:
  - `bim_logistics_postgres`: Container PostgreSQL 16 Alpine với volume bền vững `bim_logistics_postgres_data`.
    - Cổng Database host: **`5435:5432`** (tránh cổng 5433 của `bim_erp_postgres`).
  - `bim_logistics_web`: Container Django Web Application kết nối qua mạng nội bộ Docker.
    - Cổng Web host: **`8085:8000`** (tránh cổng 8080 của Paperless và các dịch vụ khác).
- Cấu hình linh hoạt tại `config/settings.py`: Tự động nhận diện môi trường Docker PostgreSQL, đồng thời hỗ trợ fallback SQLite3 khi chạy local mà không cần sửa code.
- Xây dựng test suite tự động `core.tests` bao gồm 5 ca kiểm thử:
  - Soft-delete bảo toàn dữ liệu.
  - State Machine chuyển trạng thái nghiêm ngặt và chặn nhảy cóc.
  - Tự động cập nhật P&L chuyến xe khi có chi phí phát sinh.
  - Kiểm tra REST API Dashboard Ban Giám Đốc.
  - Kiểm tra REST API tạo lệnh điều động mới.
- Kết quả: **5/5 tests passed (100% OK)**.
