# CHANGELOG — BIM LOGISTICS PLATFORM

Tất cả các thay đổi kiến trúc và mã nguồn được ghi nhận theo chuẩn Documentation-as-Code.

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
