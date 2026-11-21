# Nhật ký thay đổi – GSS TMS

Repo khởi tạo ngày 09/11/2026 từ mã nguồn GSS_LOGISTICs (master `1d7884c`), không mang lịch sử git cũ.
Nhật ký của hệ thống trước đó không chuyển sang repo này.

## 2026-11-21 – Bổ Sung Cột Riêng "Tên KH" (Tên Viết Tắt) Cho Màn Hình Phân Bổ & Gán Xe và Bảng Container Hành Trình
- **Bối cảnh & Yêu cầu người dùng:**
  - Trong Tab "Phân bổ & gán xe" (`dispatch-allocations-table`): Tên viết tắt khách hàng (như `THQ`) trước đó hiển thị lồng dòng bên dưới mã phiếu phân bổ `DD.002.BK.2611.006`.
  - Người dùng yêu cầu tách riêng và bổ sung cột **"Tên KH"** lấy tên viết tắt của khách hàng để hiển thị độc lập, rõ ràng và nhất quán với Tab 1 "Lệnh điều độ".
- **Thay đổi kỹ thuật & Giao diện:**
  1. **Tab 2: Phân bổ & Gán xe (`templates/views/view_dispatch.html` & `vendor-admin.js`):**
     - Header bảng `dispatch-allocations-table`: Thêm cột `<th data-col-key="customer_short">Tên KH</th>`.
     - Cột "Phiếu Phân Bổ": Chỉ hiển thị mã phiếu `allocCode` (`DD.STT.[Số Booking]`), bỏ dòng tên khách hàng lồng bên dưới.
     - Cột mới "Tên KH": Hiển thị tên viết tắt khách hàng (`THQ`, font đậm màu teal `font-bold font-heading text-teal-900`), tooltip rê chuột hiển thị tên đầy đủ của khách hàng.
     - Tự động gọi `BimTableColumnManager.apply('dispatch-allocations-table')` sau khi render danh sách.
  2. **Tab 3: Phiếu Vận chuyển / Bảng Container (`templates/views/view_dispatch.html` & `dispatch-order-modal.js`):**
     - Header bảng `dispatch-vendor-containers-table`: Thêm cột `<th data-col-key="customer_short">Tên KH</th>`.
     - Cột "Phiếu Điều Độ": Chỉ hiển thị mã phiếu điều độ `dispatch_order_code`, bỏ tên khách hàng lồng bên dưới.
     - Cột mới "Tên KH": Hiển thị tên viết tắt khách hàng (`THQ`, font đậm màu teal).
  3. **Backend (`apps/dispatch/api_views/vendor_admin.py` & `vendor.py`):**
     - API `/api/vendor-admin/overview/` bổ sung trả về `customer_short_name` và `customer_name`.
     - API `/api/dispatch/vendor-containers/` bổ sung trả về `customer_short_name` và `customer_full_name`.
- **Kiểm thử tự động:**
  - `python scripts/build_app_js.py`: Biên dịch thành công từ 109 file module.
  - `python scripts/qa.py verify --fast`: PASS=6/6, FAIL=0, KẾT LUẬN: ĐẠT.

## 2026-11-21 – Tối Ưu Màn Hình Điều Độ & Theo Dõi Hành Trình: Bổ Sung Tên Viết Tắt KH, Phân Biệt Màu Số Phiếu Điều Độ, Đồng Bộ Đủ Trạng Thái Container & Chuẩn Hóa Timeline Hành Trình
- **Bối cảnh & Yêu cầu người dùng:**
  1. **Tab "Lệnh điều độ":**
     - Bổ sung cột "Tên KH" hiển thị tên viết tắt của khách hàng (`short_name` / `customer_code`).
     - Cột "Phiếu Điều độ": Chỉ hiển thị số phiếu (bỏ badge trạng thái), chia màu mã phiếu trung tính, trang nhã:
       - *Đã phân bổ xong*: Màu xanh (`text-emerald-700 font-mono font-bold`)
       - *Đang phân bổ*: Màu vàng (`text-amber-600 font-mono font-bold`)
       - *Chưa phân bổ*: Màu đỏ (`text-rose-600 font-mono font-bold`)
  2. **Tab "Theo dõi hành trình":**
     - Đổi tên thẻ "Bảng container" $\rightarrow$ "Phiếu Vận chuyển"; lược bỏ thẻ "Phiếu VC" bị trùng lặp.
     - Thanh thống kê trạng thái container: Bổ sung đầy đủ 5 trạng thái để tổng số lượng container khớp chính xác 100% với Tổng Cont:
       - `Chưa phân bổ` (`stats.unassigned` - màu đỏ nhạt)
       - `Chờ gán xe/tài` (`stats.waiting_vehicle` - màu vàng nhạt)
       - `Đã nhận lệnh (chờ chạy)` (`stats.assigned` - màu xanh dương)
       - `Đang trên tuyến` (`stats.in_transit` - màu xanh ngọc)
       - `Đã hoàn thành` (`stats.completed` - màu xám)
     - Đổi tên thẻ "Theo bước hành trình" $\rightarrow$ "Hành trình" và tích hợp đúng component ma trận hành trình xe container 7 mốc (`GSSApp.fleetTimeline`).
     - **Xe container trên Timeline:**
       - Tinh chỉnh kích thước xe SVG nhỏ gọn, vừa vặn và hài hòa (128x44px).
       - Gắn logo biểu tượng Giải Pháp Xanh (lá xanh viền trắng sắc nét) tại cửa buồng lái đầu xe.
- **Thay đổi kỹ thuật & Giao diện:**
  1. **Backend (`apps/dispatch/api_views/sales.py` & `vendor.py`):**
     - Bổ sung trường `customer_short_name` trong `BookingActiveAPIView`.
     - API `/api/dispatch/vendor-containers/` trả về đầy đủ phân rã trạng thái: `unassigned`, `waiting_vehicle`, `assigned`, `in_transit`, `completed`, `total`.
  2. **Giao diện & Logic Điều độ (`templates/views/view_dispatch.html` & `dispatch-order-modal.js`):**
     - Thêm cột `data-col-key="customer_short"` (Tên KH) và ô lọc cột tương ứng trong `dispatch-orders-table`.
     - Chuẩn hóa màu sắc mã `DD.[Số Booking]` theo 3 mức trung tính (xanh, vàng, đỏ).
     - Bổ sung 2 pill trạng thái `Chưa phân bổ` và `Chờ gán xe/tài` trên thanh KPI mini strip; bổ sung các tùy chọn lọc vào dropdown `#filter-vc-status`.
     - Tích hợp gọi `BimTableColumnManager.apply('dispatch-orders-table')` sau mỗi lần render.
  3. **Ma trận Hành trình & Xe container (`vendor-admin.js` & `truck.js`):**
     - Cập nhật hàm `loadJourneyBoard()` nhúng trực tiếp component `GSSApp.fleetTimeline(host)`.
     - Cập nhật hàm `setJourneyMode(mode)` với 2 chế độ chính: `table` (Phiếu Vận chuyển) và `board` (Hành trình).
     - Cập nhật SVG xe container trong `static/js/gss/truck.js`: thêm logo lá xanh thương hiệu GSS trên cabin đầu xe, cân đối kích thước xe.
- **Kiểm thử tự động:**
  - `python scripts/build_app_js.py` & `python scripts/build_css.py`: Biên dịch thành công.
  - `python scripts/qa.py verify --fast`: PASS=6/6, FAIL=0, KẾT LUẬN: ĐẠT.

## 2026-11-21 – Nâng Cấp Màn Hình Tạo Booking, Đổi Tên Phân Hệ Sales & Shipments, Xuất Bảng Gửi Kho & Cảnh Báo Trùng Lặp Dữ Liệu
- **Bối cảnh & Yêu cầu người dùng:**
  - **A. Màn hình Tạo Booking:**
    1. *Tên Nhà Cung Cấp (NCC / Shipper)*: Bổ sung danh mục trong Cài Đặt, có nút "+ Tạo mới" trên form để tạo nhanh; droplist chọn + tìm kiếm gõ free-text.
    2. *Hãng tàu, Tên Tàu, Cảng xuất (POL)*: Bổ sung danh mục tương ứng trong Cài Đặt (Hãng Tàu, Tàu Biển, Cảng Xuất POL), có nút "+ Tạo mới" tại header từng ô, droplist chọn + gõ free-text.
    3. *Cảng nhận hàng (POD)*: Tích hợp từ Danh mục Cảng đã có (Loại PORT / ICD), hỗ trợ chọn từ droplist và gõ free-text.
    4. *Loại Cont / Xe*: Không bắt buộc nhập (bỏ dấu sao đỏ `*`), mặc định là Cont 20GP (`20GP`).
    5. Đổi nhãn *"Ngày hẹn Dỡ hàng"* $\rightarrow$ *"Ngày giao cho Khách"*.
  - **B. Sidebar & Điều hướng:**
    1. Phân hệ "Sale & Booking" đổi tên thành "Sales & Shipments".
    2. Tab "Đơn đặt hàng/ Booking" đổi thành "Đơn đặt hàng/ Shipments".
  - **C. Kết xuất Bảng phân bổ Container gửi Kho theo dõi:**
    - Mẫu cột chuẩn: `STT | Số Cont | Số xe | Tên tài xế | CCCD | Số điện thoại | Ghi chú nếu có`.
    - Hỗ trợ xuất file Excel chuẩn và hiển thị modal có chức năng sao chép nhanh văn bản gửi Zalo/Viber cho thủ kho.
  - **D. Tối ưu thao tác & Chống trùng lặp dữ liệu:**
    - Cảnh báo trùng lặp CCCD của Tài xế thời gian thực (kiểm tra chéo cả Tài xế công ty `Employee` và Tài xế nhà xe 3PL `SubcontractorDriver`).
    - Cảnh báo trùng lặp Mã số thuế (MST) của Khách hàng thời gian thực.
- **Thay đổi kỹ thuật & Giao diện:**
  1. **Backend & Cơ sở dữ liệu (`apps/master_data/models.py`, `api_views.py`, `urls.py`, `import_export_service.py`):**
     - Thêm proxy model `Supplier` (Party có `is_supplier=True`, tiền tố mã `NCC`).
     - Thêm model `Vessel` (`name`, `code`, `imo_number`, `shipping_line`, `flag`, `notes`, `is_active`).
     - Thêm model `PortLoading` (`name`, `code`, `country`, `notes`, `is_active`).
     - Tạo và chạy migration `apps/master_data/migrations/0008_supplier_portloading_vessel.py`.
     - Thêm API CRUD và tra cứu: `SupplierListCreateAPIView`, `VesselListCreateAPIView`, `PortLoadingListCreateAPIView`.
     - Thêm API kiểm tra trùng lặp: `CheckTaxCodeAPIView` (`/api/master-data/check-tax-code/`) và `CheckDriverCitizenIdAPIView` (`/api/master-data/check-driver-citizen-id/`).
     - Mở rộng `MasterDataFormOptionsAPIView` trả về danh sách `suppliers`, `vessels`, `pol_ports`, `pod_ports`.
  2. **Kết xuất Bảng gửi Kho (`apps/gss/vendor_excel.py`, `apps/gss/api.py`, `apps/gss/urls.py`, `containers.py`):**
     - Viết hàm `warehouse_dispatch_excel(booking)` tạo workbook Excel định dạng chuyên nghiệp với các cột: `STT | Số Cont | Số Xe | Tên Tài Xế | CCCD | Số Điện Thoại | Ghi Chú Nếu Có`.
     - Bổ sung `WarehouseDispatchExportAPI` tại `/api/gss/bookings/<pk>/warehouse-dispatch-export/` hỗ trợ cả `?as=xlsx` và `?as=json`.
     - Bổ sung serializer `serialize(c)` container đọc thông tin `driver_cccd`, `driver_phone`, `driver_name`.
  3. **Giao diện Master Data (`view_master_data.html`, `tabs.js`, `table.js`, `form-fields.js`, `form-submit.js`):**
     - Nhóm "Khách Hàng & Đối Tác": thêm tab con "Nhà Cung Cấp / Shipper" (`suppliers`).
     - Nhóm "Mạng Lưới & Địa Điểm": thêm tab con "Tàu Biển" (`vessels`) và "Cảng Xuất (POL)" (`pol_ports`).
     - Tích hợp cảnh báo thời gian thực MST Khách hàng và CCCD Bác tài trực thuộc 3PL.
  4. **Giao diện Booking Detail (`view_booking_detail.html`, `page.js`, `containers.js`, `combobox.js`, `master-options.js`):**
     - Row 2: Cả 5 ô (NCC, Hãng tàu, Tàu biển, Cảng xuất POL, Cảng nhận POD) chuyển sang Combobox chọn + gõ tìm kiếm free-text, có nút "+ Tạo mới" mở nhanh modal Cài Đặt.
     - Row 3: Bỏ bắt buộc loại cont, mặc định Cont 20GP (`20GP`).
     - Row 4: Đổi nhãn thành "Ngày Giao Cho Khách".
     - Toolbar Container: Thêm nút "Gửi Kho Theo Dõi" mở modal xem trước, sao chép Zalo và tải file Excel.
  5. **Đồng bộ Sidebar & Tên phân hệ:**
     - `sidebar.html`, `topbar.html`, `view_sales.html`, `router.js`, `quotation-page.js`, `quotation-print.js`: Đổi thành "Sales & Shipments" và "Đơn đặt hàng/ Shipments".
- **Kiểm thử tự động:**
  - `python scripts/build_app_js.py`: Ghép thành công 109 file module vào `static/js/app.js`.
  - `python scripts/build_css.py`: Biên dịch Tailwind CSS thành công.
  - `python manage.py test apps.master_data apps.gss`: 72 tests PASS.
  - `python scripts/qa.py verify --fast`: PASS=6/6, FAIL=0, KẾT LUẬN: ĐẠT.

## 2026-11-21 – Tối Ưu Bảng "Theo Dõi Hành Trình": Đưa Cột "Phiếu Vận Chuyển" Lên Mặc Định Cột Đầu Sau STT, Bỏ Badge Và Trạng Thái Con
- **Bối cảnh & Yêu cầu người dùng:**
  - Trong Tab "Theo dõi hành trình" (`#dispatch-vendor-containers-table`): Cột "Phiếu Vận Chuyển" được yêu cầu đưa lên làm cột đầu tiên ngay sau STT (vị trí #2).
  - Bỏ hiển thị dạng badge màu xanh to viền đậm và bỏ dòng trạng thái con bên dưới (`step_status_display`) vì các cột phía sau đã có riêng cột "Trạng Thái 7 Bước Hành Trình" thể hiện tiến độ chi tiết.
- **Thay đổi kỹ thuật & Giao diện:**
  1. **Tái cấu trúc Header & Vị trí Cột (`templates/views/view_dispatch.html`):**
     - Đưa cột `<th data-col-key="trip_code">Phiếu Vận Chuyển</th>` lên vị trí ngay sau `<th data-col-key="stt">#</th>`.
     - Thứ tự cột chuẩn: `#` (STT) $\rightarrow$ `Phiếu Vận Chuyển` $\rightarrow$ `Số Container & Quy Cách` $\rightarrow$ `Phiếu Điều Độ / Khách Hàng` $\rightarrow$ `Số B/L` $\rightarrow$ `Nhà Xe Phụ Trách (Vendor)` $\rightarrow$ `Đầu Kéo & Rơ-moóc` $\rightarrow$ `Tài Xế & Số ĐT` $\rightarrow$ `Lộ Trình Vận Chuyển` $\rightarrow$ `Trạng Thái 7 Bước Hành Trình` $\rightarrow$ `Hạn Free` $\rightarrow$ `Thao Tác`.
     - Gắn đầy đủ thuộc tính `data-col-key` trên tất cả các thẻ `th` và `td` tương ứng để quản lý ẩn/hiện cột với `BimTableColumnManager`.
  2. **Tối ưu hiển thị mã Phiếu Vận Chuyển (`dispatch-order-modal.js`):**
     - Bỏ khối giao diện badge (`bg-teal-100`, `border-teal-300`) và bỏ hiển thị text trạng thái con bên dưới (`step_status_display`).
     - Hiển thị tinh gọn mã chuyến `r.trip_code` dạng link font mono đậm (`font-mono font-bold text-teal-800 hover:text-teal-950 hover:underline`), kèm icon mở chi tiết chuyến xe (`ph-arrow-square-out`), giữ thao tác click mở Modal chi tiết (`viewTripDetail(trip_code)`).
     - Trường hợp container chưa gán chuyến xe, hiển thị `--` dạng chữ xám nghiêng tinh giản thay vì badge cảnh báo chiếm dụng diện tích.
     - Tự động gọi `BimTableColumnManager.apply('dispatch-vendor-containers-table')` sau mỗi lần render dữ liệu để đồng bộ trạng thái ẩn/hiện và thứ tự tùy biến cột người dùng đã lưu.
- **Kiểm thử tự động:**
  - `python scripts/build_app_js.py`: Biên dịch thành công từ 109 file module.
  - `python scripts/qa.py verify --fast`: PASS=6/6, FAIL=0, KẾT LUẬN: ĐẠT.

## 2026-11-21 – Bổ Sung Cột Số Vận Đơn (B/L) Cho Các Màn Hình Quản Lý Điều Vận & Cổng Vendor
- **Bối cảnh & Yêu cầu người dùng:**
  - Vì các màn hình quản lý của Điều vận & Vendor bắt buộc phải có cột Số vận đơn B/L, cần bổ sung cột riêng biệt này vào tất cả các bảng quản lý tương ứng.
- **Thay đổi kỹ thuật & Giao diện:**
  1. **Tab 1: Lệnh Điều Độ (`templates/views/view_dispatch.html` & `dispatch-order-modal.js`):**
     - Bổ sung riêng cột **"Số B/L"** (Số vận đơn) ngay cạnh cột "Phiếu Điều Độ", có thể sắp xếp (`sortDispatchOrders('booking_number')`).
     - Bổ sung ô input lọc theo B/L (`filter-col-bl`) trên hàng lọc con thead, tích hợp vào `onDispatchOrdersColumnFilter()` và `clearDispatchOrdersFilters()`.
     - Cột "Phiếu Điều Độ" hiển thị cô đọng mã `DD.[Số Booking]` kèm badge trạng thái; số B/L chuyển sang hiển thị chuyên biệt tại cột mới.
  2. **Tab 2: Phân Bổ & Gán Xe (`templates/views/view_dispatch.html` & `vendor-admin.js`):**
     - Bổ sung cột **"Số B/L"** ngay sau cột "Phiếu Phân Bổ", hiển thị mã B/L (`l.bill_of_lading`).
     - Tích hợp tìm kiếm nhanh theo Số B/L trong ô tìm kiếm tổng thể `alloc-search-input`.
  3. **Tab 3: Bảng Container Hành Trình (`templates/views/view_dispatch.html` & `dispatch-order-modal.js`):**
     - Bổ sung cột **"Số B/L"** ngay sau cột "Phiếu Điều Độ / Khách Hàng", hiển thị số B/L (`r.booking_number`).
  4. **Cổng Đối Tác Nhà Xe - Vendor Portal (`templates/vendor_portal.html`):**
     - Bổ sung cột **"SỐ B/L"** trong Bảng Khai Báo Container ngay sau cột "SỐ CONTAINER", có hỗ trợ sắp xếp (`toggleAssignSort('bill_of_lading')`).
     - Hiển thị giá trị Số B/L từ Booking (`curData.bill_of_lading || b.bill_of_lading`), giúp Nhà xe nắm bắt ngay số vận đơn tương ứng với từng container.
  5. **Màn Hình Lệnh Vận Chuyển (`templates/views/view_transport_order.html` & `transport-order.js`):**
     - Bổ sung cột **"Số B/L"** trong Bảng Danh Sách Container của Lệnh Vận Chuyển (ngay sau cột "Số Container").
- **Kiểm thử tự động:**
  - `python scripts/build_app_js.py` & `python scripts/build_css.py`: Biên dịch thành công.
  - `python scripts/qa.py verify --fast`: PASS=6/6, FAIL=0, KẾT LUẬN: ĐẠT.


## 2026-11-21 – Chuẩn Hóa Cột Mã 3 Màn Hình Điều Độ & Bổ Sung Nút "Cột" (Universal Column Manager)
- **Bối cảnh & Yêu cầu người dùng:**
  - Tab "Lệnh điều độ": Cột "Phiếu Điều độ" hiển thị chuẩn mã `DD.[Số Booking]` (ví dụ `DD.BK.2611.006`).
  - Tab "Phân bổ & Gán xe": Cột "Phiếu Phân bổ" hiển thị chuẩn mã `DD.STT.[Số Booking]` (ví dụ `DD.001.BK.2611.006`, `DD.002.BK.2611.006`).
  - Tab "Theo dõi hành trình": Cột "Phiếu Vận chuyển" hiển thị chuẩn mã `VC.STT.[Số Booking]` (ví dụ `VC.001.BK.2611.006`).
  - Rà soát và bổ sung Nút "Cột" (Column Manager) cho các bảng của phân hệ Điều độ để người dùng có thể tùy chỉnh ẩn/hiện cột, ghim cột, điều chỉnh kéo dãn độ rộng cột và lưu trạng thái vào `localStorage`.
- **Thay đổi kỹ thuật & Giao diện:**
  1. **Tab 1: Lệnh điều độ (`templates/views/view_dispatch.html` & `dispatch-order-modal.js`):**
     - Đặt `id="dispatch-orders-table" data-table-title="Danh Sách Lệnh Điều Độ"`.
     - Thêm nút "Cột" (`openColumnCustomizer('dispatch-orders-table')`) trên thanh toolbar bên cạnh các nút Làm mới, Xóa lọc, Toàn màn hình.
     - Đổi tiêu đề cột thứ 2 thành **"Phiếu Điều Độ"**.
     - Chuẩn hóa hiển thị mã trong cột: luôn hiển thị mã `DD.[Số Booking]` (ví dụ `DD.BK.2611.006`), phân biệt trạng thái bằng badge `CHỜ ĐIỀU ĐỘ` / `ĐÃ ĐIỀU ĐỘ` / `HOÀN TẤT` và dòng số `B/L` bên dưới.
  2. **Tab 2: Phân bổ & Gán xe (`templates/views/view_dispatch.html` & `vendor-admin.js`):**
     - Đặt `id="dispatch-allocations-table" data-table-title="Danh Sách Phân Bổ & Gán Xe"`.
     - Thêm nút "Cột" (`openColumnCustomizer('dispatch-allocations-table')`) trên thanh toolbar bên cạnh nút Làm mới.
     - Đổi tiêu đề cột thứ 2 thành **"Phiếu Phân Bổ"**.
     - Cập nhật hiển thị mã: lấy `allocCode = l.allocation_code || 'DD.001.' + l.booking_code` chuẩn định dạng `DD.STT.[Số Booking]` (ví dụ `DD.001.BK.2611.006`, `DD.002.BK.2611.006`).
  3. **Tab 3: Theo dõi hành trình (`templates/views/view_dispatch.html`, `dispatch-order-modal.js` & `api_views/vendor.py`):**
     - Đặt `id="dispatch-vendor-containers-table" data-table-title="Bảng Container & Tiến Độ Vận Chuyển"`.
     - Thêm nút "Cột" (`openColumnCustomizer('dispatch-vendor-containers-table')`) trên thanh toolbar Bảng container bên cạnh nút Toàn Màn Hình.
     - Đổi tiêu đề cột thứ 3 thành **"Phiếu Điều Độ / Khách Hàng"** (backend `dispatch_code` đổi từ tiền tố cũ `LDD.` sang `DD.BK.YYMM.STT`).
     - Đổi tiêu đề cột thứ 5 thành **"Phiếu Vận Chuyển"** (hiển thị mã `VC.STT.[Số Booking]`).
  4. **Nâng cấp Universal Column Manager (`static/js/src/app/core/table-manager.js`):**
     - Cải tiến `TableColumnInstance.prototype.apply`: bổ sung cơ chế đồng bộ hàng thead thứ 2 (`tr:nth-child(2)`) chứa các ô input tìm kiếm/lọc từng cột (như của `dispatch-orders-table`), giúp các ô lọc luôn thẳng hàng chính xác với các cột dữ liệu khi người dùng ẩn/hiện hoặc đổi thứ tự cột.
- **Kiểm thử tự động:**
  - `python scripts/build_app_js.py`: Build thành công `app.js` từ 109 file.
  - `python scripts/build_css.py`: Tailwind CSS biên dịch đạt chuẩn.
  - `python scripts/qa.py verify`: TỔNG KẾT: PASS=7 FAIL=0 WARN=0, KẾT LUẬN: ĐẠT 100%.


## 2026-11-21 – Kéo bản sao lưu về máy local lúc 00:00
- `scripts/pull_backup_local.ps1`: máy Windows kéo bản sao lưu từ VPS qua SSH (hoặc từ thư mục); chỉ tải bản mới, đối chiếu sha256 và kiểm gzip trước khi nhận, tuỳ chọn mã hoá age, khoá quyền thư mục, giữ theo ngày, cảnh báo khi bản quá cũ; mã thoát 0/1/2/3.
- `scripts/register_backup_task.ps1`: tác vụ Windows 00:00 hằng ngày (lặp mỗi giờ khi mất mạng), chạy bù khi máy bật lại và khi đăng nhập.
- `deploy_vps.sh`/`backup_vps.sh`: bản đầy đủ chuyển sang 23:30 để kịp trước lần kéo 00:00.
- `scripts/backup_ssh_gate.sh`: cổng SSH hạn chế (chỉ ls/cat/scp/sha256sum file sao lưu + `run-backup`) cho khoá kéo sao lưu.
- **Sao lưu GSS dùng thư mục riêng `/home/ubuntu/backups_gss`** (mặc định trong backup/restore/drill/deploy): thư mục cũ `/home/ubuntu/backups` đang dùng chung với BIM_LOGISTICS, lẫn dump hai hệ thống. `deploy_vps.sh` chỉ thay cron của chính GSS (trước đây xoá cả cron sao lưu của BIM).
- Tài liệu: runbook mục 7, `docs/16` mục 5c (kết quả rà soát mã). Đã thử qua SSH thật: kéo, checksum, kiểm gzip đạt.

## 2026-11-20 – Nâng Cấp Quy Trình Ghép Đôi Container 20ft (Kẹp 20): Checkbox Cột Đầu & Nút Ghép Cont Header
- **Bối cảnh & Yêu cầu người dùng:**
  - Nút "Kẹp 20" trước đó dùng hộp thoại `window.prompt()` mặc định của trình duyệt để gõ số dòng, giao diện thô sơ và bất tiện.
  - Người dùng yêu cầu cải tiến trải nghiệm:
    1. Bổ sung ô Checkbox ở cột đầu tiên của từng dòng container để người dùng có thể tick chọn.
    2. Khi tick chọn đủ 2 container 20 feet thì nút **"Ghép Cont"** sẽ tự động xuất hiện trên Header bảng.
    3. Trên Header bảng container: bỏ nút "Thêm Xe / Tài Xế Mới" (do mỗi cột đầu kéo, moóc, tài xế đã có sẵn nút `+` thêm nhanh), đồng thời sắp xếp lại thứ tự nút theo chuẩn:
       `"Ghép Cont" | "Nhập Excel" | "Toàn Màn Hình"`.
- **Thay đổi kỹ thuật & Giao diện (`templates/vendor_portal.html`):**
  1. **Header Bảng Container:**
     - Xóa bỏ nút "+ Thêm Xe / Tài Xế Mới".
     - Thêm nút `id="btn-vendor-pair-conts"`: mặc định ẩn, khi tick chọn đúng 2 container 20ft thì xuất hiện nổi bật (`bg-teal-700 hover:bg-teal-800 text-white`, icon link, nhãn `Ghép Cont (2)`).
     - Thứ tự 3 nút chuẩn xác: `Ghép Cont` $\rightarrow$ `Nhập Excel` $\rightarrow$ `Toàn Màn Hình`.
  2. **Cột đầu tiên của Bảng Container:**
     - Tích hợp ô `<input type="checkbox" class="vendor-cont-checkbox ...">` cùng với số STT dòng.
     - Hàm `onSelectContLineToPair(lineNo, isChecked)`:
       - Kiểm tra chỉ cho phép chọn container loại 20 feet.
       - Giới hạn chọn tối đa 2 container (nếu chọn sang cont thứ 3 sẽ có thông báo nhắc nhở).
       - Khi chọn đủ 2 cont, tự động làm sáng nút "Ghép Cont" trên header và highlight nhẹ 2 dòng được chọn.
  3. **Hàm Ghép Cont Thông Minh `onExecutePairSelectedConts()`:**
     - Thay thế hoàn toàn `prompt()` cũ.
     - Khi bấm "Ghép Cont":
       - Tự động nhận diện dòng nào đã có xe đầu kéo/rơ-moóc/tài xế để sao chép sang dòng còn lại.
       - Trường hợp cả 2 dòng có 2 xe khác nhau, hiển thị xác nhận cho người dùng chọn xe ưu tiên.
       - Tự động gán `paired_with_line_no`, `is_twin_container = true`, cập nhật ghi chú `Kẹp cùng dòng #...` và số container thứ 2 cho cả 2 dòng.
       - Bổ sung `paired_with_line_no`, `is_twin_container`, `container_number_2` vào `buildRowPayload()` để backend đồng bộ chuyến xe chạy kẹp khi Lưu.
     - Bổ sung tính năng Hủy Ghép Cont `onUnpairCont(lineNo)` trực tiếp trên huy hiệu `Kẹp #...` nếu muốn tách riêng.
- **Kiểm thử tự động:**
  - `python scripts/build_app_js.py` & `python scripts/build_css.py`: Thành công.
  - `python scripts/qa.py verify --fast`: PASS=6/6, FAIL=0, KẾT LUẬN: ĐẠT.

## 2026-11-20 – Rà Soát & Chuẩn Hóa Toàn Diện Múi Giờ Hệ Thống Việt Nam (Asia/Ho_Chi_Minh - GMT+7)
- **Bối cảnh & Yêu cầu người dùng:**
  - Rà soát lại tất cả các trường dữ liệu có ghi Ngày giờ, đặc biệt là trường Giờ trong toàn bộ hệ thống Bim_Logisstic_GSS.
  - Xác minh hệ thống đang cập nhật theo giờ nào và đồng bộ chuẩn hóa 100% về đúng giờ hệ thống Việt Nam (GMT+7).
- **Kết quả điều tra hiện trạng ("Đang cập nhật theo giờ nào?"):**
  - **Lưu trữ CSDL:** Hệ thống sử dụng `USE_TZ = True` và `TIME_ZONE = 'Asia/Ho_Chi_Minh'`. Các trường `DateTimeField` (`created_at`, `updated_at`, `actual_gate_in_at`, `settled_at`, `approved_at`, `event_time`, v.v.) được Django ORM lưu trữ chuẩn dưới dạng UTC (+00:00).
  - **Lỗi hiển thị giờ UTC (bị chậm 7 tiếng):** Khi format dữ liệu trả về qua REST API, render giao diện hoặc xuất báo cáo Excel, nhiều vị trí gọi trực tiếp `.strftime('%d/%m/%Y %H:%M')` hoặc `timezone.now().strftime(...)` trên các datetime đối tượng UTC. Do hàm `strftime` của Python không tự động đổi múi giờ, chuỗi thời gian sinh ra bị lấy theo giờ UTC (GMT+0), khiến người dùng thấy giờ bị **chậm 7 tiếng** so với giờ thực tế Việt Nam (ví dụ: thao tác lúc 14:30 nhưng màn hình hiển thị 07:30).
  - **Lỗi mốc thời gian dạng chuỗi:** Các hàm sinh mốc tiến độ tự động gọi `timezone.now().strftime('%H:%M %d/%m')` dẫn đến ghi chuỗi giờ UTC vào các trường text (`time_display`, mốc phát lệnh Zalo).
  - **Lỗi lùi ngày lúc nửa đêm ở Frontend:** Sử dụng `new Date().toISOString().slice(0, 10)` dẫn đến từ 00:00 đến 06:59 sáng hàng ngày ở Việt Nam, ngày mặc định bị lùi 1 ngày về hôm trước.
- **Các cải tiến & Thay đổi kỹ thuật đã thực hiện:**
  1. **Khởi tạo Module Tiện Ích Chuẩn Hóa `core/time_utils.py`:**
     - Cung cấp các hàm tiện ích: `vietnam_now()`, `to_vietnam_time(dt)`, `format_vietnam_datetime(dt, fmt)`, `format_vietnam_time_short(dt, fmt)`, `format_vietnam_date(dt, fmt)`.
     - Tự động phát hiện aware datetime và chuyển đổi an toàn sang `Asia/Ho_Chi_Minh` trước khi format.
  2. **Chuẩn Hóa 100% Format DateTime Phía Backend:**
     - `apps/dispatch/timeline_service.py`: Chuẩn hóa các mốc giờ cổng kho (`actual_gate_in_at`, `actual_gate_out_at`, `actual_dropoff_at`, `actual_start_time`, `created_at`, `pod_doc.created_at`) qua `format_vietnam_time()`.
     - `apps/dispatch/api_views/trips.py`: Đổi toàn bộ các lời gọi `timezone.now().strftime(...)` thành `timezone.localtime().strftime(...)`. Bọc `timezone.localtime()` cho các trường `startTime` (`t.created_at`), chi phí (`exp.created_at`), chứng từ (`doc.created_at`), chốt sổ (`trip.settled_at`).
     - Tự động parse chuỗi giờ Việt Nam khi người dùng PATCH mốc vào cổng/ra cổng kho (`actual_gate_in_time`, `actual_gate_out_time`) bằng `parse_vn_datetime` thay vì gán bừa giờ hiện tại.
     - `apps/dispatch/api_views/trip_documents.py`: Chuẩn hóa `now_str` và `time_display` sang `timezone.localtime()`.
     - `apps/dispatch/api_views/bookings.py`: Chuẩn hóa `created_at` tài liệu và booking sang `timezone.localtime()`.
     - `apps/dispatch/api_views/sales.py`: Chuẩn hóa `created_at` booking đơn hàng sang `timezone.localtime()`.
     - `apps/dispatch/api_views/accounting.py` & `trip_expenses.py`: Chuẩn hóa `settled_at` sang `timezone.localtime()`.
     - `apps/dispatch/reports_api.py`: Chuẩn hóa `approved_at`, `settled_at`, `created_at` sang `timezone.localtime()`.
     - `apps/dispatch/vendor_service.py`: Chuẩn hóa `closing_str` cho lệnh điều động vendor.
     - `apps/billing/advance_views.py`: Chuẩn hóa `approved_at`, `settled_at` của quỹ tạm ứng điều vận và tạm ứng tài xế.
     - `apps/billing/finance_reports_api.py`: Chuẩn hóa `reimbursed_at`, `created_at`, `subcontractor_settled_at`, mã số `debit_note_number` sang giờ Việt Nam.
     - `apps/billing/settlement_voucher_views.py`: Chuẩn hóa `counterparty_confirmed_at`, `settled_at`, `created_at`, `approved_at`, và mã phiếu thanh toán (`next_code`) sang `timezone.localtime()`.
     - `apps/master_data/api_views.py` & `permission_views.py`: Chuẩn hóa `updated_at`, `created_at`, `last_login` sang `timezone.localtime()`.
     - `apps/master_data/import_export_service.py` & `apps/personnel/import_export_service.py`: Chuẩn hóa dòng tiêu đề ngày xuất Excel và tên file xuất dữ liệu sang `timezone.localtime()`.
     - `apps/customs/api_views.py`: Chuẩn hóa ngày tạo tờ khai, dòng tiêu đề xuất báo cáo và tên file Excel tờ khai hải quan.
     - `apps/collaboration/models/tasks.py` & `core/models.py`: Chuẩn hóa hàm `__str__` hiển thị nhật ký task và chuỗi sự kiện tracking.
  3. **Chuẩn Hóa Phía Frontend (JavaScript):**
     - Cập nhật `static/js/src/app/core/utils.js`: Bổ sung `formatDateTimeVN(dateStr)` và `formatDateVN(dateStr)` sử dụng `Intl.DateTimeFormat` với `timeZone: 'Asia/Ho_Chi_Minh'`, và bổ sung hàm `getTodayVNIso()` đảm bảo ngày theo giờ Việt Nam không bị lùi khi thao tác vào khung giờ 00:00 - 06:59 sáng.
     - Build lại file bundle `static/js/app.js` bằng `python scripts/build_app_js.py`.
  4. **Cập Nhật Tài Liệu:**
     - Bổ sung Mục VII vào `docs/09-coding-standards.md` quy định bắt buộc về xử lý thời gian và múi giờ Việt Nam GMT+7.
- **Kiểm thử & Xác nhận:**
  - 100% tệp Python đã được biên dịch cú pháp thành công (`python -m py_compile`).
  - Quét lại toàn bộ codebase: Số lượng gọi `timezone.now().strftime(...)` giảm từ 14 xuống 0; số lượng format datetime không qua localtime giảm từ 50 xuống 0 (các trường hợp còn lại đã được bọc `timezone.localtime()` an toàn).

## 2026-11-20 – Tối Ưu Giao Diện Vendor Portal: Giới Hạn Scroll Hành Trình, Bỏ Badge Danh Mục & Chuẩn Hóa Cỡ Chữ UI/UX
- **Bối cảnh & Yêu cầu người dùng:**
  - **Màn hình Theo Dõi Hành Trình (Hình 1):** Khung bảng bị tràn quá mép dưới màn hình (do tính toán `max-h-[calc(100vh-250px)]` trong khi phần trên đã chiếm ~380px), khiến các dòng cuối cùng (cont 15) bị che khuất và bắt sự kiện cuộn làm người dùng không thể thấy hết nội dung.
  - **Màn hình Xe, Rơ-moóc, Tài xế (Hình 3):** Quá nhiều badge màu sắc (badge đen biển số, badge xanh bằng lái GPLX, badge pill trạng thái) gây rối mắt, cần loại bỏ badge theo đúng nguyên tắc ERP clean.
  - **Cỡ chữ Vendor Portal:** Cỡ chữ quá nhỏ so với app chính (nhiều nơi dùng `text-[10px]`, `text-[11px]`), cần nâng lên chuẩn 12–13px theo tài liệu `docs/10-ui-ux-guidelines.md`.
- **Thay đổi kỹ thuật & Giao diện (`templates/vendor_portal.html`, `static/css/tailwind.css`):**
  1. **Khung Theo Dõi Hành Trình:**
     - Điều chỉnh chiều cao giới hạn khung danh sách hành trình: đổi `max-h-[calc(100vh-250px)]` thành `max-h-[calc(100vh-430px)] min-h-[340px] p-2 pb-14 space-y-2`.
     - Thêm `pb-14` đệm đáy khung để khi cuộn xuống dòng cuối cùng (cont 15), dòng xe cuối cùng luôn nổi trọn vẹn và thoáng đãng trên nền bảng, không bị cấn thanh cuộn hay mép viền.
     - Nâng cỡ chữ tiêu đề 7 mốc và lộ trình: `.vfleet-head` (12.5px font-bold uppercase), `.vfleet-lbl` (12px), `.vfleet-group` (12.5px), biển số/mã chuyến `text-xs font-mono font-black`, số cont `text-[13px] font-mono font-black`.
  2. **Bỏ Badge Màn Hình Xe, Rơ-moóc, Tài Xế:**
     - Chuẩn hóa hàm `makeStatusBadge`: Bỏ hoàn toàn thẻ badge bọc pill có nền và viền (`px-2.5 py-1 rounded-full bg-... border`), thay bằng chữ màu kết hợp **status dot semantic** (`<span class="inline-flex items-center gap-1.5 font-bold text-... text-xs"><span class="w-2 h-2 rounded-full bg-... shrink-0"></span> ${label}</span>`) theo Quy tắc 2.6 trong UI/UX Guidelines.
     - Biển số xe & Rơ-moóc: Bỏ badge nền đen/tím đậm, thay bằng font mono đen đậm chuẩn ERP: `<span class="font-mono font-black text-slate-900 text-sm tracking-wide">`.
     - Quy cách Rơ-moóc: Bỏ badge viền xanh, chuyển thành text thông thường `<span class="font-semibold text-slate-800 text-[13px]">`.
     - Bằng lái (GPLX): Bỏ badge xanh `[Hạng FC]`, chuyển thành text trực quan `<span class="font-bold text-slate-900 text-[13px]">Hạng FC</span> (<span class="font-mono text-slate-500 text-xs">...</span>)`.
     - Tài xế: Bỏ subtitle thừa `Tài xế vận tải Cont`, nâng tên tài xế lên `text-sm font-black text-slate-900`.
  3. **Đồng Bộ Cỡ Chữ Chuẩn UI/UX (Guidelines Mục 2.3, 8 & 17):**
     - Nâng cỡ chữ bảng container gán xe: `table.erp-table` từ `text-xs` lên `text-[13px] tabular-nums`.
     - Số container: `text-[13px] font-mono font-black text-slate-900`.
     - Các ô select phương tiện, tài xế và input: nâng lên `text-[13px] h-8.5`.
     - Topbar & Sidebar: Thay thế triệt để các nhãn `text-[10px]`, `text-[11px]` thành `text-xs` hoặc `text-[13px]`.
     - Build lại CSS Tailwind đồng bộ: `static/css/tailwind.css`.
- **Kiểm thử & Xác nhận:**
  - `python scripts/build_app_js.py`: Thành công.
  - `python scripts/build_css.py`: Thành công.
  - `python scripts/qa.py verify --fast`: PASS=6/6, FAIL=0, KẾT LUẬN: ĐẠT.

## 2026-11-20 – Chuẩn Hóa Quy Tắc Đặt Mã Chứng Từ & Màn Hình Quản Lý (BG, BK, DD, VC)
- **Bối cảnh & Thống nhất nghiệp vụ:**
  - Chuẩn hóa toàn bộ hệ thống mã chứng từ theo chuỗi giá trị vận hành 5 tầng:
    1. **Báo giá (Sales):** `BG.YYMM.STT` (VD: `BG.2611.001`), reset STT theo tháng (001–999).
    2. **Booking (Đơn hàng):** `BK.YYMM.STT` (VD: `BK.2611.001`), reset STT theo tháng (001–999).
    3. **Lệnh Điều Độ (Tổng):** `DD.[Số Booking]` (VD: `DD.BK.2611.001`), gắn kết 1-1 với đơn hàng Booking.
    4. **Lệnh Điều Độ (con - theo Nhà xe):** `DD.STT.[Số Booking]` (VD: `DD.001.BK.2611.001`, `DD.002.BK.2611.001`), STT đếm theo từng nhà xe/phiếu phân bổ trong Booking.
    5. **Lệnh Vận Chuyển (Chuyến xe thực tế):** `VC.STT.[Số Booking]` (VD: `VC.001.BK.2611.001`, `VC.002.BK.2611.001`), STT đếm theo số thứ tự container trong toàn Booking (1 đến N) nhằm loại trừ hoàn toàn nguy cơ trùng mã giữa các nhà xe khi cùng mở cổng phân bổ.
- **Thay đổi kỹ thuật & Hệ thống:**
  - **Backend (`apps/dispatch/vendor_service.py`):**
    - Thêm các hàm chuẩn hóa:
      - `get_allocation_code(alloc)`: Sinh mã `DD.STT.[Số Booking]` cho phiếu phân bổ nhà xe.
      - `get_dispatch_order_code(booking)`: Sinh mã `DD.[Số Booking]` cho lệnh điều độ tổng.
      - `get_trip_code_for_booking(booking, alloc, line_no)`: Tự động tính toán STT container toàn cục dựa trên số cont của các phân bổ trước đó (`offset + line_no`) hoặc thứ tự container trong B/L (`bc.line_no`), đảm bảo duy nhất và an toàn xung đột mã tuyệt đối.
    - Cập nhật `build_trip` sử dụng `get_trip_code_for_booking`.
    - Cập nhật `allocation_summary` trả về các trường `allocation_code`, `dispatch_order_code` và gán vào `transport_order_code` để tương thích ngược.
    - Cập nhật `rows_for` tính sẵn `expected_trip_code` cho các dòng nháp.
  - **Models & Views (`apps/dispatch/models.py`, `apps/customers/models.py`, `apps/dispatch/api_views/trips.py`):**
    - Thêm thuộc tính `@property allocation_code` và `@property dispatch_order_code` vào `BookingVendorAllocation` và `BookingOrder`.
    - Khi tạo chuyến xe thủ công có gắn Booking, tự động áp dụng `get_trip_code_for_booking`.
  - **Giao diện & Màn hình quản lý (`templates/`, `static/js/`):**
    - `view_dispatch_order.html`: Chuyển tiền tố hiển thị Header từ `LDD.--` sang chuẩn `DD.--`.
    - `view_transport_order.html`: Đổi nhãn `LỆNH VẬN CHUYỂN` thành `LỆNH ĐIỀU ĐỘ (CON)` với mã phiếu `DD.STT.[Số Booking]`, các dòng cont bên dưới hiển thị mã `VC.STT.[Số Booking]`.
    - `dispatch-order-modal.js` & `transport-order.js`: Cập nhật logic tiền tố `DD.` và hiển thị mã phân bổ mới.
    - `vendor_portal.html`: Đồng bộ mã chuyến hiển thị sang `VC.[STT].[Số Booking]`.
    - Chạy `scripts/build_app_js.py` cập nhật `static/js/app.js`.
  - **Kiểm thử tự động:**
    - Chạy kiểm thử tự động toàn diện qua `python scripts/qa.py verify`: 7/7 bước ĐẠT (Bao gồm ruff, migration check, system check, và toàn bộ test suites của `apps.gss`, `apps.dispatch`, `apps.billing`).

## 2026-11-20 – Chuẩn Hóa Logic Phân Bổ, Hủy Gán Và Chuyển Nhà Xe Cho Container
- **Bối cảnh & Vấn đề phát hiện:**
  - Khi điều vận gán container cho một nhà xe, sau đó thao tác hủy gán (bỏ phân bổ) hoặc chuyển container sang nhà xe khác:
    1. Số cont được phân bổ của nhà xe cũ không tự động trừ bỏ (`allocated_containers` giữ nguyên con số cũ lớn nhất do `_resize_to_lines` dùng `Max(alloc_line_no)` thay vì đếm thực tế `count()`).
    2. Các dòng thứ tự container (`alloc_line_no`) bị để lại khoảng trống (ví dụ dòng 3 bị khuyết, khi gán lại bị đẩy thành dòng 16), làm cho bảng phân bổ bị thừa dòng ma hoặc lệch số thứ tự.
    3. Tab **"Theo Dõi Hành Trình"** (`vendor_tracking_rows`) vẫn giữ lại chuyến xe của container đã bị hủy gán hoặc chuyển đi, dẫn đến mẫu số hành trình không khớp với số cont đang được giao (ví dụ giao 14 cont nhưng hành trình báo `14/15`).
    4. Sidebar lệnh điều vận hiển thị mẫu số sai (ví dụ `14/15 xe` thay vì `14/14 xe`).
- **Giải pháp & Thay đổi kỹ thuật:**
  - **1. Tự động đánh lại thứ tự dòng & đồng bộ số lượng (`apps/gss/containers.py`):**
    - Bổ sung hàm `reindex_allocation_lines(alloc)`:
      - Quét toàn bộ danh sách container còn hiệu lực của phiếu phân bổ (`is_deleted=False`).
      - Tự động đánh lại số thứ tự dòng liên tục từ `1 .. count` (không còn lỗ hổng hay khoảng trống dòng).
      - Đồng bộ lại `vendor_line_no` của `DispatchTrip` tương ứng với từng container.
      - Chuyển `allocated_containers` về đúng số lượng container thực tế (`len(conts)`).
      - Đồng bộ lại `draft_rows` theo đúng bộ key chỉ số dòng mới.
    - Trong `cs.assign`:
      - Khi gán/hủy gán container: Tự động hủy (`wf.cancel`) các chuyến xe ở trạng thái `READY` thuộc container bị hủy gán/chuyển đi và đặt `t.vendor_line_no = None`.
      - Tự động gọi `reindex_allocation_lines` cho tất cả các phiếu phân bổ (`BookingVendorAllocation`) liên quan (cả nhà xe cũ và nhà xe mới).
    - Trong `cs.remove_container`: Tự động gọi `reindex_allocation_lines` khi xóa container khỏi đơn hàng.
  - **2. Làm sạch hành trình theo dõi nhà xe (`apps/dispatch/vendor_service.py`):**
    - `vendor_tracking_rows(subcontractor, alloc_id)`: Khi lọc theo `alloc_id` trong chế độ `container_mode`, chỉ trả về các chuyến xe thuộc danh sách container ĐANG ĐƯỢC PHÂN BỔ cho nhà xe đó (`container_number__in=valid_cnums`). Loại bỏ triệt để các chuyến mồ côi của container đã hủy gán hoặc điều chuyển.
    - `vendor_overview`: Đồng bộ `target_cnt = a.containers.filter(is_deleted=False).count()` ngay cả khi `target_cnt == 0`, lọc chuyến xe tính KPI `filled/running/done` chỉ theo các container còn hiệu lực của phiếu.
    - `rows_for`: Bổ sung các container đã chuyển đi (cancelled trip) vào cuối bảng với `moved=True, editable=False` mà không làm vỡ chỉ số dòng của các cont đang hoạt động.
  - **3. Kiểm thử tự động:**
    - Bổ sung kiểm thử đơn vị `test_unassign_and_reassign_deducts_allocated_and_tracking` trong `apps/gss/tests.py`: Kiểm tra toàn diện luồng gán 3 cont -> gán xe -> hủy gán 1 cont -> kiểm tra trừ bỏ số lượng, re-index 1..2, dọn dẹp tracking -> chuyển cont sang nhà xe khác. Toàn bộ 39 unit tests và `qa.py verify --fast` đều đạt chuẩn.


## 2026-11-20 – Chuẩn Hóa Số Lượng Cont Phân Bổ (15 Cont) & Cuộn Danh Sách Xe Theo Dõi Hành Trình
- **Bối cảnh & Hiện tượng:**
  1. *Lệch số lượng container trên Cổng Nhà Xe:* Thẻ KPI hiển thị "16 Cont" (chờ gán 1 cont) và sidebar hiển thị "15/16 xe", trong khi nhà xe chỉ được giao 15 cont và đã gán đủ 15/15 cont.
     - *Nguyên nhân:* Backend `vendor_overview` trước đó lấy trường `allocated_containers` cũ trong CSDL (lưu 16 từ lúc khởi tạo) thay vì đếm số container thực tế đang liên kết (`containers.count() = 15`). Đồng thời `computeKpis()` ở frontend ưu tiên lấy `overview.kpis` từ backend khiến con số 16 bị áp đặt.
     - *Xử lý:*
       - Backend (`apps/dispatch/vendor_service.py`): Trong `vendor_overview`, nếu đơn hàng ở `container_mode`, tự động lấy đúng số container thực tế `target_cnt = a.containers.filter(is_deleted=False).count()`, đồng thời tự động đồng bộ lại trường `allocated_containers` trong database về đúng 15.
       - Frontend (`templates/vendor_portal.html`): Hàm `computeKpis()` ưu tiên tính theo danh sách container thực tế của lệnh hiện tại `activeRows.length` (đã loại bỏ dòng điều chuyển `moved`), đảm bảo KPI hiển thị chính xác 15/15 cont, chờ gán 0 cont.
  2. *Không cuộn được danh sách xe ở tab Theo Dõi Hành Trình:*
     - *Nguyên nhân:* Khi người dùng mở chế độ Toàn màn hình ở bảng gán xe rồi chuyển tab qua sidebar (`switchPortalTab`), lớp `overflow-hidden` trên `document.body` chưa được gỡ bỏ khiến toàn bộ trang bị khóa cuộn.
     - *Xử lý:*
       - `switchPortalTab`: Luôn xóa class `overflow-hidden` trên `document.body` và reset cờ fullscreen khi chuyển tab.
       - Cấu trúc cuộn mượt mà cho tab Theo Dõi Hành Trình: Bọc `#vendor-fleet-list` trong khung cuộn `overflow-y-auto max-h-[calc(100vh-250px)]`, đặt thanh tiêu đề 7 mốc `.vfleet-head` ở trạng thái `sticky top-0 z-10`, giúp người dùng cuộn xem trọn vẹn tất cả các chuyến xe (15/15) mà không bị che mất cột mốc.


## 2026-11-20 – Bổ Sung Nút "Toàn Màn Hình" Cho Bảng Container Cổng Nhà Xe (Vendor Portal)
- **Bối cảnh & Yêu cầu:** Tại giao diện Cổng Nhà Xe (`vendor_portal.html`), khi danh sách container lớn cần gán nhiều xe/tài xế, bảng hiển thị bị giới hạn chiều cao gây khó khăn khi thao tác cuộn và chọn xe/tài. Người dùng yêu cầu bổ sung nút "Toàn màn hình" để mở rộng không gian làm việc.
- **Thực hiện chi tiết:**
  - **Nút thao tác:** Bổ sung nút `[ Toàn Màn Hình ]` (icon `ph-corners-out`) ngay cạnh nút `[ Nhập Excel ]` trên thanh tiêu đề bảng container.
  - **Trải nghiệm Fullscreen:**
    - Khi bấm mở: Thẻ section container mở rộng toàn bộ viewport (`fixed inset-0 z-[70] bg-white p-4 lg:p-6 overflow-hidden flex flex-col m-0 rounded-none shadow-2xl h-screen max-h-screen`), bảng container tự co giãn chiếm trọn chiều cao còn lại (`flex-1 max-h-[calc(100vh-180px)]`), khóa cuộn trang (`document.body.classList.add('overflow-hidden')`).
    - Nút tự động chuyển trạng thái thành `[ Thu Gọn (Esc) ]` với icon `ph-corners-in`.
    - Lắng nghe phím `Escape` để thoát fullscreen tiện lợi và nhanh chóng.
    - Bảo toàn trạng thái Toàn màn hình khi người dùng tìm kiếm, lọc trạng thái, sắp xếp hoặc cập nhật gán xe.
    - Điều chỉnh z-index của các Modal liên quan (`modal-quick-add`, `modal-vendor-excel`, `modal-driver-qr-dispatch`, `modal-vendor-row-view`) lên `z-[100]` và thanh lưu nổi `sticky-bar` lên `z-[85]` đảm bảo luôn nổi lên trên cùng khi thao tác trong chế độ Toàn màn hình.
  - **Build giao diện:** Rebuild Tailwind CSS tự động nhận diện các class mới.


## 2026-11-20 – Thống Nhất 1 Từ "Nhập Excel" Cho Toàn Bộ Hệ Thống
- **Yêu cầu & Mục tiêu:** Thống nhất chuẩn xác một cụm từ duy nhất **"Nhập Excel"** cho toàn bộ các nút thao tác nhập dữ liệu bảng tính trên tất cả các phân hệ và thanh công cụ.
- **Phạm vi áp dụng:**
  - **Cổng Nhà Xe (`templates/vendor_portal.html`):** Đổi nhãn nút từ `Nhập Từ Excel` thành chuẩn `Nhập Excel`.
  - **Chi Tiết Đơn Hàng / Booking (`templates/views/view_booking_detail.html`):** Đổi nút nạp container từ `Nhập Từ Excel` thành `Nhập Excel`. Cập nhật các câu hướng dẫn trống bảng cont.
  - **Màn Hình Lập Lệnh & Điều Phối (`templates/views/view_dispatch_order.html` & `modal_dispatch_order.html`):** Đổi nút `+ Nhập Cont (Dán / Excel)` thành chuẩn `Nhập Excel`.
  - **Mã Nguồn Quản Lý Container (`static/js/src/app/sales/booking-page/`):** Cập nhật toàn bộ các thông báo toast và dòng nhắc người dùng (`renderStagedBookingContainers`, `renderSavedBookingContainers`, `doAssignBulkContainers`, `openCreateBookingPage`) từ "Nhập Từ Excel" / "Nhập Cont (Excel / Dán)" sang chuẩn "Nhập Excel".
  - **Quản Lý Vendor (`static/js/src/app/dispatch/vendor-admin.js`):** Đổi mục menu phân bổ xe sang `Nhập Excel (.xlsx)`.
  - **Tài Liệu Hướng Dẫn Sử Dụng (`templates/help.html`):** Đồng bộ các mục hướng dẫn thao tác nhập container sang nhãn chuẩn `Nhập Excel`.
  - Rebuild gói `static/js/app.js` (108 modules).


## 2026-11-20 – Phân Quyền Theo Tab: Ma Trận Theo Cây Sidebar (chuyển từ BIM Logistics sang GSS)
- **Ma trận Vai Trò & Phân Quyền hiển thị theo đúng sidebar:** mỗi phân hệ một dòng tiêu đề, mỗi **tab** một dòng quyền (nhóm con cho Báo cáo), kèm danh sách màn / nút mà dòng đó điều khiển. Giao diện dùng hộp tick như BIM: thu gọn / mở rộng từng phân hệ và nhóm con, hộp tick đầu phân hệ / nhóm con / dòng / cột ở cả 3 tầng (nhóm, chức danh, người). API `GET /api/access/matrix/` thêm `sections`, và mỗi `modules[]` có `section`, `section_label`, `sub_section`, `sub_section_label`, `screens` (khóa cũ `key`, `label`, `description`, `actions` giữ nguyên).
- **Tài chính & Kế toán tách theo tab:** `acc_cashbook` (Sổ quỹ), `acc_dispatcher_fund` (Quỹ điều vận: duyệt / tất toán), `acc_reimburse` (Chi hộ), `acc_driver_settle` (Quyết toán chuyến & tài xế), `acc_customer_settle` (SOA khách), `acc_3pl`, `acc_voucher` (Phiếu quyết toán), `acc_bot` (Vé BOT), `acc_gss` (cước / claim / hóa đơn / bảng kê theo vận đơn GSS); `advances` (Tạm ứng tài xế, lập phiếu quỹ) và `ledger` (Sổ sách) giữ nguyên. Khóa `accounting` cũ chỉ còn là khóa **dẫn xuất** (có quyền ở một tab kế toán bất kỳ ➔ vào được màn Kế toán); khóa dẫn xuất `finance` (tương đương `accounting` cũ) điều khiển xem số liệu tài chính tổng hợp.
- **Cài đặt tách theo tab:** 13 dòng `cfg_opening`, `cfg_accounts`, `cfg_expenses`, `cfg_driver_tariffs`, `cfg_allowances`, `cfg_customers`, `cfg_tariffs`, `cfg_subcontractors`, `cfg_locations`, `cfg_shipping_lines`, `cfg_vehicles`, `cfg_trailers`, `cfg_containers` (thay 4 dòng gộp `cfg_finance` / `cfg_partners` / `cfg_network` / `cfg_fleet`); `cfg_company`, `admin`, `audit_log` giữ riêng.
- **Không ai mất / thêm quyền:** quyền đã lưu theo khóa cũ (nhóm, chức danh, ngoại lệ cá nhân) tự mở rộng sang các khóa mới khi đọc (`LEGACY_EXPAND`); nhóm mặc định và chức danh mặc định (Kế toán, Điều vận, nhân viên hành chính kế toán, trợ lý điều độ) cho kết quả quyền hiệu lực như trước. Không cần migration dữ liệu; lưu lại từ trang Phân quyền sẽ ghi bằng khóa mới.
- **Endpoint chuyển sang khóa tab:** sổ quỹ (`acc_cashbook`; chi tiết phiếu: `advances` hoặc `acc_cashbook`), khoản chi hộ, đối tác 3PL, vé BOT, phiếu quyết toán, quyết toán chuyến (`settle-expenses`, `unsettle-expenses`, bảng quyết toán GSS), duyệt quỹ điều vận, SOA / đối chiếu công nợ khách (`advances` hoặc `acc_customer_settle`), màn GSS (`acc_gss`). Nút bấm / tab trên màn Kế toán ẩn theo đúng khóa tab.
- **Giữ nguyên:** URL, khóa JSON cũ, `AccessGroup` / `RoleAccess` / `UserAccessOverride` (không đổi model), quyền Duyệt tách riêng, ba tầng Nhóm ➔ Chức danh ➔ Người. Test: `core/test_access_tabs.py`.

## 2026-11-20 – Nhật Ký Hoạt Động (chuyển từ BIM Logistics sang GSS)
- **Tính năng mới:** tab **Cài đặt ➔ Khai Báo Ban Đầu ➔ Nhật Ký Hoạt Động** (cũng mở từ menu người dùng, địa chỉ `/audit-log`): xem ai đã tạo / sửa / đổi trạng thái / xóa dữ liệu nào lúc nào (trước ➔ sau từng trường) và nhật ký đăng nhập. Chỉ đọc; bảng chữ thuần, tên tab không số đếm.
- **Bộ lọc:** tìm kiếm, người, loại phiếu, hành động, từ / đến ngày; **Xuất CSV** (tối đa 5000 dòng, cần quyền Xuất). Giá trị trường nhạy cảm (password / token / secret / otp) che `***`.
- **API:** `GET /api/audit/logs/`, `GET /api/audit/logins/` (`core/audit_views.py`). **Cách ly công ty:** nhật ký lọc theo `company` của người xem; nhật ký đăng nhập chỉ gồm tài khoản của công ty.
- **Phân quyền:** dòng ma trận mới `audit_log` (Xem + Xuất, `core/access.py`, lớp `CanViewAuditLog`); mặc định chỉ Admin và Giám đốc, cấp thêm cho người khác ở trang Phân quyền. Có quyền này thì vào được trang Cài đặt (khóa dẫn xuất `settings`). Migration dữ liệu `core/0004_audit_log_permission` thêm Xem + Xuất cho nhóm Admin / Giám đốc đã lưu trong CSDL (chạy lại an toàn, không đổi model); người khác do Admin / Giám đốc cấp ở trang Phân quyền.
- **Giữ nguyên:** `AuditLog`, `LoginEvent`, `core/audit.py`, trigger bất biến CSDL; mọi route, API, khóa JSON cũ.
- **Giới hạn:** không ghi thay đổi qua `QuerySet.update()` / `bulk_create`; thao tác tài xế / nhà xe qua link hiện nhãn chung. Test: `core/test_audit_log_api.py`.

## 2026-11-20 – Chuẩn Hóa Quy Tắc Một Nút Nhập Excel Trên Toàn Bộ Ứng Dụng
- **Bối cảnh & Yêu cầu:**
  - Loại bỏ các cặp nút bấm rời rạc gây rối giao diện (`[Xuất Excel]` và `[Nhập Excel]` hoặc `[Mẫu Excel]` và `[Nhập Excel]`) trên các thanh công cụ (Toolbar) của hệ thống.
  - Áp dụng triệt để quy tắc **Một Nút Duy Nhất: `Nhập Excel`** (hoặc `Nhập Từ Excel`).
  - Khi người dùng nhấn nút này, hệ thống sẽ mở **Modal Chuẩn 2 Bước trực quan**:
    - **Bước 1 (Tải Mẫu / Kết Xuất Dữ Liệu):** Cung cấp nút tải tệp Excel mẫu chuẩn `.xlsx` (hoặc kết xuất dữ liệu hiện tại kèm công thức/danh sách cont) để người dùng điền/bổ sung thông tin.
    - **Bước 2 (Nạp Dữ Liệu):** Khu vực kéo thả hoặc chọn tệp Excel đã điền để tải lên hệ thống và tiến hành đồng bộ dữ liệu.
- **Phạm vi chuẩn hóa toàn diện:**
  1. **Cổng Nhà Xe (`templates/vendor_portal.html`):**
     - Loại bỏ nút `[ Xuất Excel ]` rời rạc trên thanh công cụ tiêu đề.
     - Giữ duy nhất nút `[ Nhập Từ Excel ]` mở `#modal-vendor-excel`. Nút ở Bước 1 chuyển sang gọi trực tiếp `exportVendorExcel()` tải tệp Excel `.xlsx` chuẩn.
  2. **View Chi Tiết Lập Lệnh Điều Vận (`templates/views/view_dispatch_order.html` & `templates/components/modal_dispatch_order.html`):**
     - Gom hai nút `[ Xuất Mẫu Excel ]` và `[ Nhập Excel ]` thành một nút `[ Nhập Excel ]` duy nhất.
     - Tích hợp Modal chuẩn 2 bước `#modal-mdo-excel` (Bước 1 tải file mẫu phân bổ booking, Bước 2 chọn file và nạp lên hệ thống qua `mdoHandleExcelPicked`).
  3. **View Lệnh Vận Chuyển Toàn Màn Hình (`templates/views/view_transport_order.html`):**
     - Đã chuẩn hóa nút `[ Nhập Excel ]` mở Modal 2 bước `#modal-to-excel` (kết xuất container riêng của phiếu chia và nạp lên).
  4. **Modal Phân Bổ Container Tab Quản Lý Vendor (`static/js/src/app/dispatch/vendor-admin.js`):**
     - Gom cụm nút thành một nút `[ Nhập Excel ]` gọi `toOpenExcelModal(allocId)` mở trực tiếp modal 2 bước chuẩn.
  5. **Màn Hình Nhân Sự (`templates/views/view_personnel.html`):**
     - Loại bỏ nút `[ Mẫu Excel ]` dư thừa trên thanh toolbar vì bên trong modal `modal-employee-import` đã tích hợp sẵn hộp Tải Mẫu chuẩn.
  6. **Màn Hình Danh Mục Gốc (`templates/views/view_master_data.html`):**
     - Loại bỏ nút `[ Tải Mẫu Excel ]` dư thừa trên thanh toolbar vì bên trong modal `modal-master-data-import` đã tích hợp sẵn hộp Tải Mẫu chuẩn theo từng danh mục.


## 2026-11-20 – Sửa Nút Quay Lại (Back) Trên Trang Lệnh Vận Chuyển
- **Hiện tượng:** Khi bấm nút `Quay Lại Điều Vận` trên màn hình Lệnh Vận Chuyển, màn hình bị trắng trơn, không hiển thị lại danh sách phân bổ xe.
- **Nguyên nhân:** Hàm `backToAllocations()` tìm element ID `view-dispatch` (sai tên, ID thực tế của view điều vận là `view-dieu-van`) và gọi nhầm hàm `switchDispatchSubTab` (hàm chuẩn là `switchDispatchViewTab('allocations')`). Do không tìm thấy view điều vận để gỡ class `hidden-view`, tất cả các view đều bị ẩn.
- **Xử lý:**
  - Cập nhật `static/js/src/app/dispatch/transport-order.js`: Hàm `backToAllocations()` chuyển sang gọi `switchTab('dieu-van', false)`, gỡ class `hidden-view` cho `view-dieu-van`, kích hoạt đúng Tab 2 `switchDispatchViewTab('allocations')` và nạp lại dữ liệu bảng phân bổ `loadAllocationsTab()`.
  - Rebuild lại `static/js/app.js` và đồng bộ lên production.

## 2026-11-20 – Phân Hệ Lệnh Vận Chuyển Nhà Xe (LVC Dedicated Full-Page View)
- **Bối cảnh & Yêu cầu:**
  - Đổi nút "Lệnh đã gán" thành **"Lệnh Vận chuyển"** tại bảng danh sách phân bổ xe (Tab 2 và Tab 4).
  - Khi bấm vào nút (hoặc bấm vào dòng dữ liệu của nhà xe), mở giao diện toàn màn hình hiển thị đúng các container được phân bổ cho riêng Nhà xe đó (thay vì mở lại Lệnh Điều Độ tổng của cả booking).
  - Bổ sung khối Hạn định thời gian hiển thị đầy đủ 2 dòng thông tin: **Hạn DEM** (Lưu bãi cảng) và **Hạn DET** (Lưu vỏ container) cùng giờ cắt máng/SI.
  - Gom tính năng Excel thành một nút **"Nhập Excel"** duy nhất, mở modal chuẩn 2 bước: Bước 1 tải file mẫu danh sách container, Bước 2 chọn file đã điền xe/tài để nạp lên hệ thống.
- **Thực hiện chi tiết:**
  1. **Đặt tên & Mã định danh:** Đặt tên chứng từ là **`LỆNH VẬN CHUYỂN`** với mã cấu trúc `LVC.<Booking_Code> - <Tên_Nhà_Xe>` (ví dụ: `LVC.2611.003 - HOA LƯ`), phân biệt rõ ràng giữa Lệnh Điều Độ cấp booking và Lệnh Vận Chuyển cấp nhà xe.
  2. **Giao diện toàn màn hình (`templates/views/view_transport_order.html`):**
     - Top Header Bar: Nút `← Quay Lại Điều Vận`, tiêu đề mã LVC, badge tiến độ gán xe, cụm công cụ In Lệnh, Nhập Excel, Gửi Zalo ĐV, Mở Cổng Nhà Xe.
     - Khối thông tin 3 cột: Lộ trình vận chuyển 3 điểm, Thông tin hàng hóa/B/L/Hãng tàu, và Hạn định DEM/DET đầy đủ 2 dòng riêng biệt.
     - 4 Card KPI tiến độ: Tổng cont giao, Chờ gán xe/tài, Đang trên tuyến, Đã hoàn tất.
     - Bảng danh sách chi tiết container: Chỉ lọc đúng các container thuộc phiếu chia của nhà xe, hiển thị mã chuyến VC (có link mở chi tiết chuyến), số cont, loại, seal, điểm giao, xe đầu kéo, rơ-moóc, tài xế, SĐT, trạng thái và các nút thao tác.
  3. **Modal Nhập Excel chuẩn 2 bước (`#modal-to-excel`):**
     - Bước 1: Nút kết xuất dữ liệu ra file Excel mẫu `.xlsx` của riêng phiếu chia này.
     - Bước 2: Vùng chọn file đã điền và nút "Nạp Dữ Liệu Lên Hệ Thống".
  4. **Backend API (`apps/dispatch/vendor_service.py`, `apps/dispatch/api_views/vendor.py`):**
     - Mở rộng hàm `allocation_summary` trả về đầy đủ: `transport_order_code`, `booking_code`, `customer`, `bill_of_lading`, `shipping_line`, `pickup_location`, `delivery_location`, `dropoff_location`, `cargo_name`, `container_type`, `si_cutoff`, `closing_time`, `free_time_demurrage`, `free_time_detention`, `dem_expiry`, `det_expiry`.
     - Tối ưu truy vấn `select_related` tránh N+1 queries.
  5. **Mã frontend module (`static/js/src/app/dispatch/transport-order.js`):**
     - Cài đặt các hàm điều hướng, nạp dữ liệu, render view, modal excel, print, share zalo.
     - Thêm vào `manifest.txt`, tích hợp vào `router.js` và cập nhật các bảng danh sách gọi `openTransportOrderPage(l.id)`.
     - Rebuild bundle `static/js/app.js` (107 file module).

## 2026-11-20 – Chuyển Đổi Mở Toàn Màn Hình Lệnh Đã Gán (Thay Cho Modal Xem Cont) Ở Bảng Phân Bổ
- **Yêu cầu:** Tại màn hình Phân bổ & gán xe (Điều Vận), khi bấm vào nút thao tác hoặc click vào dòng dữ liệu thì mở thẳng ra toàn màn hình Lệnh Phân Bổ / Điều Động chứ không phải dạng popup modal nhỏ. Đồng thời đổi tên nhãn "Xem Cont" thành "Lệnh đã gán" cho chuẩn nghiệp vụ điều vận.
- **Thực hiện chi tiết:**
  - **Đổi nhãn thao tác:** Thay đổi nhãn nút từ `Xem Cont` thành **`Lệnh đã gán`** kèm icon biểu tượng văn bản/lệnh (`ph-clipboard-text`) tại cả Tab 2 ("Phân bổ & gán xe") và Tab 4 ("Quản lý Vendor" - danh sách link nhà xe).
  - **Mở giao diện toàn màn hình:**
    - Thay thế hàm mở modal `vaViewUnallocatedContainersModal(allocId)` bằng hàm điều hướng mở toàn màn hình `openDispatchOrderPage(l.booking_id)` trên toàn bộ dòng `<tr>` và nút bấm `Lệnh đã gán`.
    - Giao diện mở ra chính là View Lập Lệnh & Điều Phối Vận Tải (`#view-dispatch-order`), nạp đầy đủ thông tin booking, lộ trình, danh sách container và trạng thái gán xe/nhà xe tương ứng, có sẵn nút "Quay lại" điều hướng mượt mà.
  - **Rebuild bundle:** Chạy script `python scripts/build_app_js.py` để cập nhật đồng bộ vào `static/js/app.js`.

## 2026-11-20 – Loại Bỏ Dòng Container Đã Điều Chuyển (Moved Rows) Khỏi File Excel Cổng Nhà Xe
- **Hiện tượng:** Khi xuất Excel từ Cổng Nhà Xe, file Excel xuất hiện dòng số 3 bị rỗng Nơi giao hàng, rỗng Số chì, và số cont `EGSU2809351` bị trùng lặp ở cả Dòng 3 và Dòng 16.
- **Nguyên nhân:**
  - Vị trí dòng số 3 là container cũ từng được điều phối nhưng sau đó điều phối viên đã điều chuyển lại sang dòng số 16 (kèm số seal `EMCEEW6325` và điểm giao `KCN NHÂN CƠ`). Dòng 3 vì vậy mang trạng thái `moved = True` ("Đã chuyển cho nhà xe khác hoặc chuyển dòng").
  - Trên giao diện Web Cổng Nhà Xe, hệ thống đã lọc `(state.rows || []).filter(r => !r.moved)` nên chỉ hiển thị đúng 15 container (dòng số 3 bị ẩn).
  - Tuy nhiên hàm xuất Excel (`apps/gss/vendor_excel.py`) trước đó duyệt qua toàn bộ $1..N$ dòng mà chưa loại trừ cờ `moved`, khiến dòng số 3 bị lọt vào file Excel xuất ra.
- **Xử lý:**
  - Cập nhật `apps/gss/vendor_excel.py` (hàm `template_response`): Thêm điều kiện `if r.get('moved'): continue`.
  - Kết quả: File Excel xuất ra đồng bộ 100% với giao diện Web (chỉ xuất đúng 15 container thực tế đang chờ gán xe, không còn dòng số 3 bị rỗng và không bị trùng lặp số cont).

## 2026-11-19 – Đồng Bộ & Chuẩn Hóa Tính Năng Xuất/Nhập Excel (Export Import) Ở Các Màn Hình Gán Xe
- **Yêu cầu:** Ở các màn hình gán xe, cho phép kết xuất dữ liệu container ra file Excel để bổ sung thông tin (đầu kéo, rơ-moóc, tài xế, SĐT, seal, ghi chú) rồi import trở lại hệ thống.
- **Thực hiện chi tiết:**
  1. **Cổng Nhà Xe (`templates/vendor_portal.html`):**
     - Bổ sung nút **"Xuất Excel"** trực tiếp trên thanh công cụ của bảng `Danh Sách Container Được Giao & Gán Xe`, đặt cạnh nút **"Nhập Từ Excel"** và nút **"Thêm Xe / Tài Xế Mới"**.
     - Cài đặt hàm `exportVendorExcel()` kết xuất file Excel `.xlsx` chứa toàn bộ danh sách container của lệnh này (gồm các thông tin đã có, các dòng chưa gán để trống các cột xe/tài).
     - Nâng cấp modal `#modal-vendor-excel`: Chuẩn hóa 2 bước rõ ràng (*Bước 1: Kết Xuất Dữ Liệu Ra Excel*, *Bước 2: Chọn File Đã Điền Để Nạp Lên Hệ Thống*).
     - Nâng cấp thông báo sau khi nạp: Hiển thị rõ số dòng cập nhật thành công và chi tiết từng dòng lỗi (nếu có).
  2. **Chuẩn hóa Định Dạng & Đọc Ghi Excel Backend (`apps/gss/vendor_excel.py`, `apps/dispatch/vendor_service.py`):**
     - Thêm thiết lập Text format `@` cho các cột văn bản (`Số Container`, `Số Chì (Seal)`, `Biển Số Đầu Kéo`, `Biển Số Rơ-moóc`, `SĐT Tài Xế`) để ngăn Excel tự động format số.
     - Xử lý làm sạch ô cell khi đọc: Bỏ `.0` nếu openpyxl trả về kiểu float, tự động bù số `0` ở đầu cho số điện thoại 9 chữ số bị Excel cắt mất số 0 đầu.
     - Hàm `_clean_row` trong `vendor_service.py` tự động nhận diện và khôi phục SĐT chuẩn 10 số.
  3. **Màn hình Lập Lệnh Điều Động Vận Tải (`static/js/src/app/dispatch/dispatch-order-modal.js`):**
     - Sửa hàm `mdoDownloadExcelTemplate()` trỏ đúng endpoint `/api/gss/bookings/${mdoCurrentBooking.id}/allocation-template/` thay cho URL chết 404 trước đây.
     - Cài đặt hoàn chỉnh hàm `mdoUploadExcel(file)` gọi API `/api/gss/bookings/<id>/allocation-import/` (kiểm tra) và `/api/gss/bookings/<id>/allocation-import/commit/` (ghi nhận phân bổ container).
  4. **Màn hình Phân Bổ & Quản Lý Vendor (`static/js/src/app/dispatch/vendor-admin.js`):**
     - Bổ sung bộ đôi nút **"Xuất Excel"** và **"Nhập Excel"** trực tiếp trên Header Modal xem chi tiết container phiếu chia (`vaViewUnallocatedContainersModal`).
     - Đổi nhãn menu dropdown Excel ở cột thao tác thành *Xuất Excel gán xe (.xlsx)* và *Nhập Excel gán xe (.xlsx)*.
  5. **Kiểm thử tự động & QA:**
     - Viết test case `test_vendor_portal_excel_export_and_import` trong `apps/dispatch/test_vendor.py` kiểm tra chu trình khép kín: Export Excel -> Đọc file -> Điền xe/tài xế (với SĐT 9 số) -> Import file -> Tự động chuẩn hóa thành SĐT 10 số có số 0 đầu -> Tạo chuyến xe VC thành công.
     - Chạy `python scripts/qa.py verify` và `python scripts/qa.py audit` đạt 100% (PASS=23, FAIL=0).
     - Rebuild bundle `static/js/app.js` đồng bộ.

## 2026-11-19 – Tối Ưu Bố Trí Cột Thao Tác & Hợp Nhất Nút Excel (Điều Vận - Tab Phân Bổ & Gán Xe)
- **Vấn đề trước khi sửa:**
  - Trong bảng phân bổ điều xe (`view_dispatch.html` - Tab 2), cột "THAO TÁC" chứa 5 nút bấm rời rạc (`Xem Cont`, `Gửi ĐV`, `Excel`, `Nhập`, `Link`).
  - Do chiều rộng cột hạn chế (`w-44` ~ 176px), các nút bị bẻ thành 4 hàng xếp chồng lên nhau, đẩy chiều cao mỗi hàng trong bảng lên tới ~160px. Giao diện bị kéo dài, lãng phí không gian màn hình và thiếu tính hài hòa.
- **Phân tích chức năng các nút:**
  1. `Xem Cont` (`vaViewUnallocatedContainersModal`): Xem danh sách container chi tiết của phiếu phân bổ, hỗ trợ điều phối viên gán xe/tài nhanh.
  2. `Gửi ĐV` (`vaShareVendorBatchZalo`): Gửi Lệnh điều vận tổng cho ĐV nhà xe qua Zalo.
  3. `Excel` (Xuất) (`vaExportAllocExcel`): Xuất file Excel mẫu `.xlsx` danh sách cont phân bổ gửi cho nhà xe điền xe/tài.
  4. `Nhập` (Nhập) (`vaTriggerAllocExcelUpload`): Tải file Excel nhà xe đã điền lên hệ thống để cập nhật hàng loạt xe/tài.
  5. `Link` (`vaCopyAlloc`): Sao chép đường dẫn Cổng Nhà Xe vào clipboard để gửi nhanh.
- **Giải pháp xử lý:**
  - **Hợp nhất cụm Excel:** Gom 2 nút `Excel` (Xuất) và `Nhập` thành 1 nút dropdown duy nhất `Excel ▾` gồm menu hành động: *Xuất file mẫu* và *Nhập file Excel*. Dropdown có menu overlay z-index cao, tự động đóng khi nhấp ngoài.
  - **Bố trí 1 hàng ngang duy nhất (Single-line Action Bar):** Đặt cả 4 nút (`Xem Cont`, `Gửi ĐV`, `Excel ▾`, `Link`) trên 1 hàng ngang với `whitespace-nowrap inline-flex gap-1.5`. Mở rộng `min-w-[320px]` cho cột.
  - **Giảm 72% chiều cao dòng:** Chiều cao ô thao tác giảm từ ~160px xuống còn 45px, bảng dữ liệu cân đối, trực quan và chuyên nghiệp.
  - **Kiểm thử thị giác bằng Playwright:** Tự động mở Tab Phân bổ điều xe, kiểm tra hiển thị 1 dòng (`tdHeight: 45px`, `tdWidth: 366px`) và kiểm tra tương tác click mở dropdown menu `Excel` thành công.
- **Tệp thay đổi:**
  - `templates/views/view_dispatch.html`: Cập nhật tiêu đề bảng `min-w-[320px]`.
  - `static/js/src/app/dispatch/vendor-admin.js`: Tái cấu trúc `renderAllocationsTable`, thêm dropdown Excel hợp nhất và logic toggle.
  - `static/js/app.js`: Rebuild bundle hoàn chỉnh.

## 2026-11-19 – Rà soát tính năng 17–19/11 (vai trò tester)
- Giả lập vòng đời Booking → phân bổ nhà xe → chuyến → hủy/xóa bằng test mới `apps/dispatch/test_regression_lifecycle.py` (7 kịch bản: hủy chuyến READY trả lại số cont/dòng phân bổ; cấm hủy khi xe đã chạy; xóa Booking bị chặn khi còn chuyến, xóa mềm kèm phân bổ/cont và vô hiệu link nhà xe; xóa cont thu gọn phiếu; 404/redirect `/admin`; nhãn 7 bước theo loại hàng). Đều đạt, không phát hiện lỗi nghiệp vụ.
- Sửa: tab «Quản lý Vendor» – nút/dòng "Xem Cont" gọi hàm không tồn tại `vaOpenUnallocatedContsModal` (bấm không có phản hồi) → nối đúng `vaViewUnallocatedContainersModal`; bấm nút trong dòng không còn mở modal hai lần.
- Sửa: cổng nhà xe bỏ số đếm trên tên tab Xe đầu kéo/Rơ-moóc/Tài xế (quy ước 10-ui-ux-guidelines 2.6).
- Sửa: `core/immutability.py` quote tên bảng khi tạo trigger (bộ quét SQL báo FAIL; tên bảng vốn là hằng số nên chưa có rủi ro thực).

## 2026-11-19 – Kiểm Thử Thị Giác Playwright & Mở Khóa Nút Toàn Màn Hình Booking
- **Kiểm thử thị giác bằng Playwright (Visual Regression & DOM Inspection):**
  - Chạy mô phỏng tương tác người dùng thực tế với độ phân giải `1920x1080` trên cả phân hệ Điều Vận và Booking Detail.
  - *Kết quả phân tích lỗi:*
    1. **Nút Toàn Màn Hình bị khóa (`disabled = true`):** Khi xem chi tiết đơn hàng Booking (`viewBookingDetail`), hàm khóa form chế độ xem đã vô tình khóa toàn bộ nút trong form bao gồm `#btn-fullscreen-containers`, hộp tìm kiếm `#cont-table-search-input` và dropdown lọc `#cont-table-filter-vendor`. Do nút bị disabled, trình duyệt chặn hoàn toàn sự kiện `click`, khiến người dùng bấm vào không có phản hồi.
    2. **Xung đột hiển thị CSS (`hidden-view` vs `.gss-fullscreen-mode`):** Khắc phục tình trạng lớp `.gss-fullscreen-mode` ghi đè `display: flex !important` lên các view đang ẩn bằng bộ chọn an toàn `.gss-fullscreen-mode:not(.hidden):not(.hidden-view)`.
    3. **Bộ nhớ đệm trình duyệt (Cache Busting):** Tăng chuỗi phiên bản `main.css?v=2.9.87` trong `templates/base.html` để người dùng nhận ngay lớp CSS toàn màn hình mới mà không cần thao tác xóa cache thủ công.
  - *Xử lý triệt để:*
    + Cập nhật `static/js/src/app/sales/booking-page/page.js`: Mở khóa vĩnh viễn nút `#btn-fullscreen-containers` và các bộ lọc tìm kiếm container khi xem đơn hàng.
    + Cập nhật `static/js/src/app/core/router.js`: Tự động tắt trạng thái toàn màn hình khi người dùng chuyển phân hệ làm việc.
    + Cập nhật `static/css/main.css`: Quy định chặt chẽ `.view.hidden-view { display: none !important; }`.
    + Kiểm thử thị giác bằng Playwright xác nhận thành công: Toàn bộ bảng container của Booking và bảng Điều Vận mở rộng hoàn hảo `width: 1920px, height: 1080px, zIndex: 999999` che kín toàn bộ màn hình, hiển thị đầy đủ thông tin và cuộn mượt mà.

## 2026-11-19 – Sửa Lỗi 500 Khi Xóa Booking (CI Đỏ #61–#63)
- **Vấn đề:** `DELETE /api/bookings/<id>/` trả 500 vì `BookingOrderDetailAPIView.delete` gọi `b.allocations`, trong khi quan hệ ngược của `BookingVendorAllocation.booking` tên là `vendor_allocations`. Test `core.tests.GssLogisticsCoreTestCase.test_simulation_sales_and_booking_full_flow` đỏ.
- **Xử lý:** `apps/dispatch/api_views/bookings.py` đổi sang `b.vendor_allocations`; vẫn chỉ xóa mềm phân bổ và container của booking.

## 2026-11-19 – Chuẩn Hoá Logic Đếm Container Phân Bổ Nhà Xe (Khắc Phục Lỗi Đội Số Lượng Cont Khi Điều Chuyển)
- **Vấn đề:**
  - Khi một Booking có danh sách container cụ thể (Container Mode), người dùng điều chuyển cont giữa các nhà xe (ví dụ từ Nhà xe A sang Nhà xe B).
  - Nhà xe B được gán số dòng tiếp theo (`Max(alloc_line_no) + 1`), làm số dòng của Nhà xe B tăng lên.
  - Tuy nhiên, ở Nhà xe A, hệ thống giữ nguyên dòng cũ ở trạng thái "Đã chuyển cho nhà xe khác" và hàm `_resize_to_lines` tính `allocated_containers` theo `Max(alloc_line_no)`. Do đó, số lượng cont trên phiếu của Nhà xe A không giảm tương ứng mà vẫn giữ dung lượng cũ.
  - Kết quả: Booking có 20 cont nhưng tổng số cont phân bổ hiển thị trên bảng Điều vận Tab 2 và Modal Lệnh điều động bị đội lên thành 21 hoặc 22 cont (ví dụ: Nhà xe 1 hiện 16 cont, Nhà xe 2 hiện 6 cont, tổng 22 cont), và thanh tiến độ không bao giờ đạt 100% do có slot bị khóa chuyển đi.
- **Xử lý toàn diện:**
  - *Backend `apps/dispatch/vendor_service.py`:*
    + `allocated_total(booking)`: Khi ở chế độ Container Mode, đếm số lượng container thực tế đang liên kết với các phiếu chưa bị thu hồi (`BookingContainer.objects.filter(..., allocation__isnull=False).count()`), không cộng dồn `allocated_containers` để tránh tính trùng slot đã chuyển.
    + `allocation_summary(alloc)`: Thuộc tính `allocated_containers` trả về số cont thực tế nhà xe đang chịu trách nhiệm (`active_cnt = alloc.containers.count()`), đồng thời bổ sung `max_line_no` lưu dung lượng dòng tối đa cho Cổng Nhà Xe.
    + `refresh_status(alloc)` & `lifecycle(alloc)`: Căn cứ chỉ tiêu hoàn thành (`target`) theo số cont thực tế của nhà xe, đảm bảo phiếu đạt trạng thái `SUBMITTED` ("Đã gán đủ") và `finished` ("Hoàn tất") khi gán đủ các cont đang giữ.
  - *Backend `apps/dispatch/gss_messages.py`:*
    + Cập nhật `compose_vendor_batch_message`: Báo đúng số lượng container thực tế nhà xe cần điều phối trong tin nhắn Zalo gửi điều vận vendor.
  - *Backend `apps/gss/containers.py`:*
    + Bổ sung tự động resize lại phiếu cũ (`_resize_to_lines(old_alloc)`) khi một container bị xóa khỏi booking (`remove_container`).
  - *Frontend `static/js/src/app/dispatch/dispatch-order-modal.js`:*
    + Cập nhật `mdoRenderVendorCards`: Đọc an toàn `a.containers` khi ở container mode để hiển thị đúng số lượng cont của từng thẻ nhà xe và thống kê `allocatedTotal` không bị lệch so với `totalConts`.
  - *Biên dịch & Kiểm thử:*
    + Biên dịch lại `static/js/app.js` (106 file nguồn).
    + Bổ sung unit test `test_reassign_container_does_not_inflate_total_allocated_containers` trong `apps/gss/tests.py`.
    + Chạy bộ kiểm định `scripts/qa.py verify` đạt 100% (7/7 PASS).

## 2026-11-19 – Nâng Cấp Chế Độ Toàn Màn Hình Doanh Nghiệp (Booking & Điều Vận)
- **Vấn đề:** 
  1. Nút "Toàn Màn Hình" tại Bảng danh sách container Booking (`view_booking_detail.html`) không hiển thị toàn màn hình chuẩn do thiếu lớp CSS toàn màn hình chuyên biệt (lớp `z-[80]` không tồn tại trong Tailwind build và bị giới hạn bởi stacking context).
  2. Phân hệ Điều Vận (`view_dispatch.html`) chưa có nút "Toàn Màn Hình" để điều độ viên và chuyên viên mở rộng bảng theo dõi container/chuyến xe khi làm việc trên màn hình lớn.
- **Xử lý toàn diện:**
  - *CSS Toàn Màn Hình Doanh Nghiệp (`static/css/main.css`):*
    + Xây dựng lớp `.gss-fullscreen-mode` với thuộc tính `position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 999999 !important; overflow: hidden !important;`, đảm bảo giải phóng toàn bộ giới hạn hiển thị, vượt lên trên mọi thanh công cụ, sidebar và modal.
    + Bổ sung định kiểu `:fullscreen` và `:-webkit-full-screen` chuẩn W3C đảm bảo màu nền sạch `#ffffff` và chiều cao tối đa.
  - *Module Booking (`static/js/src/app/sales/booking-page/containers.js`):*
    + Tái cấu trúc hàm `toggleFullscreenContainersTable(force)` sử dụng `.gss-fullscreen-mode` kết hợp Native Fullscreen API (`section.requestFullscreen()` và `document.exitFullscreen()`).
    + Tự động co giãn bảng dữ liệu container (`tableWrap.style.maxHeight = 'calc(100vh - 200px)'`) tận dụng 100% không gian màn hình.
    + Bổ sung bộ lắng nghe sự kiện `fullscreenchange`, `webkitfullscreenchange` và phím `Esc` để tự động khôi phục giao diện mượt mà khi người dùng nhấn Esc.
  - *Module Điều Vận (`templates/views/view_dispatch.html` & `static/js/src/app/dispatch/dispatch-order-modal.js`):*
    + Bổ sung nút "Toàn Màn Hình" đồng bộ chuẩn công thái học trên Thanh Tab chính của Điều Vận (hiện diện xuyên suốt tất cả 4 Tab).
    + Bổ sung nút "Toàn Màn Hình" tiện lợi trên thanh công cụ Tab 1 (Lệnh điều độ) và Tab 3 (Theo dõi hành trình container).
    + Triển khai hàm `toggleDispatchFullscreen(force)` mở rộng toàn bộ bảng Điều Vận (`#view-dieu-van`) ra toàn màn hình, kết hợp Native Fullscreen API và tự động đồng bộ khi bấm phím `Esc`.
  - *Biên dịch và kiểm tra:*
    + Build lại `static/js/app.js` qua `python scripts/build_app_js.py` (khớp 106 file nguồn).
    + Chạy `python manage.py check` xác nhận 0 lỗi.

## 2026-11-19 – Đồng Bộ Xóa Mềm Phân Bổ Nhà Xe & Container Khi Xóa Đơn Hàng Booking
- **Vấn đề:** Khi xóa đơn hàng BookingOrder, các bản ghi phân bổ BookingVendorAllocation và BookingContainer không được đồng bộ đánh dấu xóa mềm (is_deleted=True), khiến các phân bổ của booking đã bị xóa vẫn xuất hiện trên Tab 2 (Phân bổ & gán xe) và Tab 3.
- **Xử lý:**
  - *Backend pps/dispatch/api_views/bookings.py:* Cập nhật \BookingOrderDetailAPIView.delete\ tự động xóa mềm toàn bộ phân bổ (\.allocations.update(is_deleted=True)\) và container (\.containers.update(is_deleted=True)\) trực thuộc booking.
  - *Backend pps/dispatch/api_views/vendor_admin.py:* Thêm bộ lọc bắt buộc \ooking__is_deleted=False\ trong \VendorAdminOverviewAPIView\ ngăn chặn triệt để dữ liệu mồ côi.
  - *Backend pps/dispatch/api_views/vendor.py:* Thêm bộ lọc \ooking__is_deleted=False\ trong \VendorContainersMonitoringAPIView\.
  - *Dọn dẹp CSDL:* Đã xóa sạch 3 phân bổ rác trên hệ thống theo yêu cầu người dùng (allocations 14, 15, 16 của BK.2611.002 và BK.2611.001).

## 2026-11-19 – Fix Chuyển Hướng /admin (Loại bỏ catch-all 404 cản trở APPEND_SLASH)
- **Vấn đề:** Khi truy cập \gss.bim.info.vn/admin\ (không có dấu \/\ cuối), hệ thống trả về trang 404 do bị chặn bởi pattern \
e_path(r'^.*$', custom_404_view)\ ở cuối \urls.py\, vô hiệu hóa cơ chế tự động \APPEND_SLASH\ của Django.
- **Xử lý:**
  - Bổ sung \path('admin', RedirectView.as_view(url='/admin/', permanent=True))\ chuyển hướng 301 tự động vào \dmin/\.
  - Loại bỏ catch-all pattern \
e_path(r'^.*$')\, dựa hoàn toàn vào \handler404 = 'core.exceptions.custom_404_view'\ chuẩn Django, đảm bảo an toàn bảo mật và giữ nguyên chức năng \APPEND_SLASH\ cho toàn hệ thống.
  - Xóa dứt điểm chuyến xe \VC.2611.003\ theo yêu cầu người dùng, giải phóng container và đồng bộ lại tiến độ điều độ booking.

## 2026-11-19 – Sửa Triệt Để Lỗi Chuyến VC Đã Xóa Vẫn Còn Hiển Thị Trên Theo Dõi Hành Trình
- **Nguyên nhân gốc rễ:**
  - Khi xóa chuyến xe (DELETE /api/trips/<code_or_id>/), trường step_status không được cập nhật thành CANCELLED mà vẫn giữ READY.
  - BookingContainer liên kết (	rip_id) không được giải phóng (	rip=None), khiến container vẫn trỏ tới bản ghi chuyến xe đã xóa mềm (is_deleted=True).
  - API giám sát container (VendorContainersMonitoringAPIView) thiếu kiểm tra trạng thái xóa/hủy của c.trip, dẫn tới việc chuyến xe bị xóa vẫn được tính vào nhóm ASSIGNED và lọt vào bộ lọc status=ACTIVE trên Tab 3 Theo dõi hành trình.
  - Phía giao diện (	rip-actions.js:deleteOrCancelTrip) sau khi xóa chỉ làm mới bảng chuyến xe cũ (loadTripsData) mà không kích hoạt làm mới bảng Container (loadVendorContainersTab) hay Kanban board (loadJourneyBoard).
- **Xử lý toàn diện & Chốt chặn phòng thủ:**
  - *Backend pps/dispatch/api_views/trips.py:* Cập nhật TripDetailAPIView.delete đồng bộ 	rip.step_status = 'CANCELLED', giải phóng BookingContainer.objects.filter(trip=trip).update(trip=None), xóa mềm TripContainer, và dọn dòng nháp phân bổ (lloc.draft_rows) kèm làm mới tiến độ booking.
  - *Backend pps/dispatch/api_views/trips.py:* Cập nhật TripListCreateAPIView lọc bắt buộc ilter(is_deleted=False) loại trừ chuyến đã xóa khỏi danh sách.
  - *Backend pps/dispatch/api_views/vendor.py:* Thêm chốt chặn phòng thủ trong VendorContainersMonitoringAPIView: nếu 	.is_deleted hoặc 	.status == 'CANCELLED' hoặc 	.step_status == 'CANCELLED' thì ép 	 = None, tự động chuyển trạng thái container thành WAITING_VEHICLE (hoặc UNASSIGNED) và loại ngay khỏi bộ lọc ACTIVE.
  - *Frontend static/js/src/app/dispatch/trip-actions.js:* Kích hoạt tự động làm mới toàn bộ các tab Điều vận (loadVendorContainersTab, loadJourneyBoard, loadDispatchOrdersTab, loadAllocationsTab) ngay khi xóa chuyến thành công.
  - *Kiểm thử tự động:* Bổ sung unit test 	est_delete_trip_clears_booking_container_and_active_monitoring trong pps/dispatch/test_vendor_admin.py bao quát cả trường hợp API chuẩn và trường hợp CSDL cũ.

## 2026-11-19 – Đồng Nhất & Mở Rộng Không Gian Giao Diện Toàn Ứng Dụng (Spacious Full-Width UI/UX)
- **1. Đồng nhất chuẩn hiển thị Lộ trình vận chuyển 3 điểm trên 1 hàng ngang duy nhất:**
  - Quy chuẩn toàn diện cho tất cả các bảng dữ liệu: Cột lộ trình đạt chuẩn độ rộng `min-w-[440px] whitespace-nowrap`, hiển thị đủ 3 mốc nghiệp vụ TMS (`Lấy cont ➔ Kho đóng/trả hàng ➔ Hạ rỗng`) nối bằng mũi tên xanh teal, loại bỏ hoàn toàn tình trạng ngắt dòng 3–4 tầng gây phình vỡ bảng hoặc cắt cụt chữ (`truncate`).
  - Áp dụng đồng bộ cho:
    + *Phân hệ Điều Vận (`view_dispatch.html`, `dispatch-order-modal.js`, `trip-list.js`, `vendor-admin.js`):* Bảng Lệnh điều động (Tab 1), Bảng Phân bổ & gán xe (Tab 2), Bảng Container & Tiến độ (Tab 3), Bảng Phiếu vận chuyển (Tab 4).
    + *Phân hệ Bán Hàng (`view_sales.html`, `sales-lists.js`, `booking-page/page.js`):* Bảng Đơn hàng (Bookings), Bảng Báo giá (Quotations), Bảng danh sách chuyến xe trong Chi tiết đơn hàng.
    + *Phân hệ Kế Toán (`view_accounting.html`, `trip-costs.js`, `subcontractor.js`):* Bảng đối soát P&L chuyến xe và Bảng quyết toán thầu phụ/xe bạn, mở rộng cột lộ trình và khách hàng `min-w-[380px] whitespace-nowrap` kèm icon vị trí rõ nét.
- **2. Mở rộng không gian hiển thị (Full-Width / Spacious Container Layout):**
  - Mở rộng các màn hình chi tiết chuyên biệt từ các khung co cụm chật chội (`max-w-4xl`, `max-w-5xl`, `max-w-7xl`) thành layout thoáng đãng chuẩn Enterprise TMS `max-w-[1720px] mx-auto` / `max-w-[1600px]`:
    + *`templates/views/view_quotation_detail.html`:* Mở rộng từ `max-w-7xl` lên `max-w-[1720px] mx-auto` đồng nhất với `view_booking_detail` và `view_vendor_detail`.
    + *`templates/views/view_cash_voucher_detail.html`:* Mở rộng từ `max-w-5xl` lên `max-w-[1600px] mx-auto`.
    + *`templates/views/view_employee_form.html`:* Mở rộng từ `max-w-4xl` lên `max-w-[1600px] mx-auto`.
- **3. Chuẩn hóa chuỗi 7 bước hành trình & Kanban Board TMS:**
  - Bổ sung chuỗi con nhộng 7 bước trực quan (`vaRender7StepJourney` với `min-w-[340px]`) tại cột trạng thái của tất cả các bảng container và chuyến xe.
  - Tái cấu trúc Tab Theo bước hành trình thành bảng Kanban 7 cột tương ứng 7 bước của chuỗi TMS, hiển thị đầy đủ thẻ xe, tài xế, cont, lộ trình và nút Xem phiếu VC trực tiếp.
- **4. Công thái học cột Thao tác trên toàn bộ hệ thống:**
  - *Màn hình Quản lý Nhà xe & Phân bổ:* Nút tại bảng Lệnh chưa phân bổ chuyển thành nút `[ Xem Cont ]` mở modal danh sách container chưa gán, giúp Điều vận theo dõi rõ ràng, phân định với màn hình LDD.
  - *Màn hình Đội Xe & Phương Tiện (`view_fleet.html`, `fleet.js`):* Nâng cấp cột Thao tác cho cả bảng Đầu kéo & Xe tải và bảng Rơ-moóc thành nút `[ Xem ]` chuẩn công thái học (`h-7 px-2.5 font-bold inline-flex items-center gap-1 font-heading border border-teal-200`) mở xem và quản lý phương tiện.
- **5. Kiểm thử & Bản dựng:**
  - Biên dịch toàn bộ bundle `static/js/app.js` (106 files) và `static/css/tailwind.css`.
  - Kiểm thử QA Verify toàn diện: `PASS=7, FAIL=0, WARN=0, KẾT LUẬN: ĐẠT`.
  - Kiểm thử thị giác thực tế bằng Playwright Chromium trên local cổng 8086 đã xác thực ảnh chụp màn hình hoàn chỉnh.
- File: `templates/views/view_dispatch.html`, `templates/views/view_sales.html`, `templates/views/view_accounting.html`, `templates/views/view_quotation_detail.html`, `templates/views/view_cash_voucher_detail.html`, `templates/views/view_employee_form.html`, `static/js/src/app/dispatch/*.js`, `static/js/src/app/sales/*.js`, `static/js/src/app/accounting/*.js`, `static/js/src/app/fleet/fleet.js`, `docs/CHANGELOG.md`.

## 2026-11-19 – Bảo mật CSDL và sao lưu/khôi phục (docs/16, Đợt A + B một phần)
- **Nhật ký bất biến thật ở tầng CSDL:** trigger chặn UPDATE/DELETE `core_auditlog`, `core_trackingeventlog` (`core/immutability.py`, dựng lại sau mỗi `migrate`). Chỉ cho `actor_id`/`company_id` về NULL (khoá ngoại SET_NULL); xoá chỉ khi giao dịch đặt `gss.allow_log_purge='on'`.
- **Vai trò `gss_rls` mất quyền TRUNCATE** (`core/rls.py`); `rls.apply` chạy được với user không phải superuser (chỉ cấp tư cách thành viên khi chưa có).
- **`scripts/db_harden.sh` (mới):** tạo user ứng dụng thường `gss_app`, chuyển chủ sở hữu CSDL/bảng sang đó; `docker-compose.yml` dùng `APP_DB_USER`/`APP_DB_PASSWORD` nếu có. Đã kiểm: migrate lại + 193 test `core` đạt với user không phải superuser. **Chưa áp lên stack 8086/VPS.**
- **Sao lưu:** `backup_vps.sh` thêm checksum sha256, kiểm dump đủ dòng kết thúc, quyền file 600, chế độ `BACKUP_MODE=db` (cron 4 giờ/lần, RPO ≤ 4 giờ), bản mã hoá `age` + `rclone` ra ngoài máy chủ (cấu hình qua `OFFSITE_REMOTE`, `BACKUP_AGE_RECIPIENT`; chưa đặt thì cảnh báo). **Chưa cấu hình nơi lưu ngoài, chưa thử với rclone/age thật.**
- **Khôi phục/diễn tập:** `restore_vps.sh` kiểm checksum, giải mã `.age`, khôi phục theo chủ sở hữu `APP_DB_USER`; `restore_drill.sh` kiểm thêm sổ cái cân Nợ/Có, bảng kê chốt có dòng, policy RLS/trigger, checksum, giải nén mẫu media, đo thời gian khôi phục; sửa bảng `customers_customer` (đã là proxy) → `master_data_party`.
- **`deploy_vps.sh`:** ghi điểm khôi phục CSDL trước migrate (`GSS_LOGISTICS_rollback_db.txt`) kèm lệnh quay CSDL; preflight theo user ứng dụng.
- **Chưa làm (xem docs/16 mục 5):** RLS không còn fail-open và `company` NOT NULL (cần sửa trang token), đổi đường `/admin/` và 2FA, WAL/PITR.
- File: `core/immutability.py`, `core/test_immutability.py`, `core/rls.py`, `core/apps.py`, `scripts/*.sh`, `docker-compose.yml`, `.env.example`, `PLATFORM_PATCHES.md`, `docs/16-data-security-dr.md`.

## 2026-11-19 – Tối ưu hóa giao diện Chi tiết Nhà xe: Bung rộng sát viền công thái học & Tinh gọn chuỗi 7 mốc hành trình
- **1. Bung rộng toàn màn hình sát viền chuẩn công thái học ERP:**
  - Loại bỏ giới hạn `max-w-[1720px] mx-auto` trong `templates/views/view_vendor_detail.html`, mở rộng 100% chiều ngang (`w-full`), tinh chỉnh padding 2 bên thành `px-4 sm:px-6` đồng bộ với thanh tiêu đề Topbar.
  - Các bảng danh sách lệnh điều động và phân bổ container (Phân khu A chưa gán xe và Phân khu B đã phân bổ) bung rộng sát 2 bên viền màn hình tương tự như bảng Báo giá cước của phân hệ Kinh doanh, loại bỏ hoàn toàn khoảng trống thừa 2 bên, giải phóng không gian cho cột Lộ trình và Chuỗi mốc hành trình.
- **2. Tinh gọn hiển thị chuỗi 7 mốc hành trình (Hài hòa chuẩn):**
  - Loại bỏ hoàn toàn các số thứ tự `1, 2, 3, 4, 5, 6, 7` trên từng mốc trong hàm `vaRender7StepJourney` (`static/js/src/app/dispatch/vendor-admin.js`), chỉ hiển thị tên mốc ngắn gọn: `Sẵn sàng`, `Đến nhận`, `Nhận cont`, `Đến giao`, `Giao xong`, `Đi hạ rỗng`, `Hạ rỗng`.
  - *Mốc đã hoàn thành (`isPassed`):* Nền xanh lá `bg-emerald-600` với biểu tượng tích check `✓` trắng nhỏ gọn, font bán đậm.
  - *Mốc đang chạy (`isCurrent`):* Nền teal đậm `bg-teal-700` với viền ring sáng `ring-teal-400` và chấm tròn trắng nhấp nháy (`animate-pulse`), tạo điểm nhấn thị giác rõ ràng về vị trí xe.
  - *Mốc chưa tới:* Nhãn chữ xám `bg-slate-50 text-slate-500` thanh lịch, không bị số thứ tự gây choán diện tích.
  - Đường ray nối `h-[2px]` kết nối liền mạch, tổng thể 7 mốc hiển thị gọn gàng, đẹp mắt trên 1 hàng ngang chuẩn mực.
- **3. Kiểm thử & Bản dựng:** Biên dịch lại `static/js/app.js` và `tailwind.css`; toàn bộ 6/6 bài kiểm tra `scripts/qa.py verify --fast` đạt ĐẠT.
- File: `templates/views/view_vendor_detail.html`, `static/js/src/app/dispatch/vendor-admin.js`, `static/js/app.js`, `static/css/tailwind*.css`, `docs/CHANGELOG.md`.

## 2026-11-18 – Nâng Cấp Hệ Thống Toàn Diện Theo 12 Phân Hệ Nghiệp Vụ (GPX Logistics)
- **1. Import & Export Phân Bổ Xe (Round-Trip Excel):**
  - Bổ sung API `VendorAllocationExcelAdminAPIView` (`/api/vendor-allocations/<id>/excel/` GET & POST) cho phép xuất Excel danh sách container phân bổ và import file Excel đã điền biển số xe/tài xế để ghi đè cập nhật vào CSDL.
  - Trên giao diện `vendor-admin.js`, thêm nút `[ Xuất Excel ]` và `[ Nạp Excel ]` trên từng thẻ phiếu chia.
- **2. Danh Mục Loại Container & ISO Seeding:**
  - Idempotent migration `0007_seed_iso_container_types.py` nạp sẵn 10 loại chuẩn ISO Logistics: `20GP`, `40GP`, `40HC`, `45HQ`, `20RF`, `40RF`, `20FR`, `40FR`, `20OT`, `40OT`.
  - Hỗ trợ thêm mới/quản lý loại cont linh hoạt thông qua danh mục hệ thống.
- **3. Gán Mặc Định Đầu Kéo, Rơ-moóc & Tài Xế:**
  - Thêm trường `default_trailer` vào model `Vehicle` (`apps/fleet/models.py`) liên kết trực tiếp với `Trailer`.
  - `MasterDataFormOptionsAPIView` xuất `default_trailer_id` và `default_trailer_plate`.
  - Giao diện `trip-actions.js` tự động điền Rơ-moóc và Tài xế mặc định ngay khi chọn Đầu kéo, đồng thời cho phép hiệu chỉnh tự do.
- **4. Chuẩn Hóa 7 Bước Vận Hành Theo Loại Hàng (Shipment Type):**
  - Giữ nguyên 7 bước máy trạng thái cốt lõi ở tầng backend (`apps/dispatch/gss_workflow.py`), bổ sung lớp ánh xạ trực quan `step_labels_for(shipment_type)`.
  - Hàng Nhập: Đến cảng nhận ➔ Đến kho ➔ Đã giao ➔ Hạ rỗng.
  - Hàng Xuất: Lấy Cont Rỗng ➔ Đến Nhà máy ➔ Đã đóng hàng ➔ Đã hạ Cont.
  - Hàng Nội địa: Đã nhận ➔ Đã giao.
- **5. Xử Lý Xe Kéo 2 Container (Twin Container):**
  - Đã tích hợp tính năng ghép cặp cont 20ft (`is_twin_container`). Bổ sung thông báo trực quan chuyên biệt trên màn hình tài xế khi xe kéo 2 cont để xử lý độc lập từng bước/chứng từ.
- **6. Giao Diện Tài Xế & Chụp Ảnh Chứng Từ Phân Loại Trực Tiếp:**
  - Thiết kế lại các nút chụp chứng từ trực tiếp theo hành động (`EIR Nhận`, `POD Giao Nhận`, `EIR Hạ`, `Seal`), tài xế bấm nút tương ứng hệ thống tự động gắn thẻ chứng từ mà không cần chọn phân loại thủ công.
- **7. Loại Bỏ Hoàn Toàn Kê Khai Chi Phí (Turnkey Vendor Model):**
  - Đóng endpoint `/api/qr/t/<token>/claims/` (trả về 403 Forbidden).
  - Gỡ bỏ hoàn toàn giao diện `claimCard()` trên màn hình tài xế mobile và portal nhà xe.
- **8. Tìm Kiếm & Lọc Đa Tiêu Chí:**
  - Bổ sung thanh tìm kiếm tại Tab Lệnh Điều Vận (Tab 1) và Tab Theo Dõi Nhà Xe (Tab 2), lọc tức thì theo: Số B/L, Số Container, Số Chì (Seal), Mã Lệnh Điều Động.
- **9. Chế Độ Toàn Màn Hình (Fullscreen Modals):**
  - Thêm nút Fullscreen toggle (`btn-edit-trip-fullscreen`) trên modal phân bổ và chỉnh sửa chuyến xe (`modal_edit_trip.html`).
- **10. Ghi Chú Chuyến Đi & Tích Hợp Tin Nhắn:**
  - Bổ sung trường `special_notes` do điều vận nhập trên lệnh chuyến, tự động tích hợp vào nội dung tin nhắn gửi cho tài xế.
- **11. Tin Nhắn Riêng Biệt & Gửi Hàng Loạt Cho Điều Vận Vendor:**
  - Chuẩn hóa cấu trúc tin nhắn gửi tài xế theo đúng format: `GIẢI PHÁP XANH`, `VC: ...`, `Số B/L - Cont - Seal: ...`, `SDT KHO: ...`, `Ghi chú: ...`.
  - Bổ sung API `VendorAllocationBatchMessageAPIView` (`/api/vendor-allocations/<id>/batch-message/`) và nút `[ Gửi Zalo Nhà Xe ]` trên giao diện, tạo sẵn bản tin tổng hợp danh sách link kèm nút mở chat Zalo gửi thẳng cho Điều vận nhà xe.
- **12. Tách Rõ Ràng Hai Cột DEM (Bãi Cảng) & DET (Vỏ Hãng Tàu):**
  - Tách riêng biệt `dem_expiry` (Hạn DEM - Bãi Cảng) và `det_expiry` (Hạn DET - Vỏ Cont) trên header bảng, logic đọc Excel và hiển thị chi tiết.
- **13. Kiểm Thử & Xác Nhận Hệ Thống:**
  - Thêm test suite tự động `apps/dispatch/test_upgrade_features.py` kiểm thử 100% các tính năng nâng cấp (PASS).
  - Bộ kiểm tra cục bộ `python scripts/qa.py verify` đạt kết quả tuyệt đối **PASS=7, FAIL=0, WARN=0**.

## 2026-11-18 – Nhận Diện Thương Hiệu GIẢI PHÁP XANH (Logo + Tên) Đồng Bộ
- Logo chính thức "Giải Pháp Xanh": `static/images/logo_lockup.png` (nền tối, logo viền trắng + `GIẢI PHÁP XANH` / `LOGISTICS` dàn đều), `logo_lockup_light.png` (nền sáng), `logo_outline.png`, `logo_clean.png`, `gss_logo.svg` (logo in), favicon + `apple-touch-icon` (`static/images/brand/`).
- Áp dụng: sidebar, đăng nhập, trang tài khoản, 403/404/500, cổng nhà xe (+ trang chủ), trang tài xế QR, trang tra cứu của khách; đổi tên hiển thị sang GIẢI PHÁP XANH (tiêu đề, footer, tin nhắn lệnh điều xe/tra cứu). Nút thu gọn sidebar dời sang phải để không che logo.
- Chưa đổi: dữ liệu hồ sơ công ty (`short_name` mặc định "Green Solutions Supply Co., Ltd.", tên pháp lý tiếng Anh trên báo giá) và `templates/help.html` (sinh từ `scripts/build_help_page.py`).

## 2026-11-17 – Quy Định Cổng Chạy Local 8086 và Khắc Cốt Ghi Tâm Không Dùng Cổng 8000
- **1. Quy định chuẩn hóa môi trường Local:**
  - Cổng Web Local duy nhất: **`8086`** (`http://127.0.0.1:8086/`) tương ứng container Docker `gss_logistics_web`.
  - Cổng PostgreSQL Local: **`5436`** (`gss_logistics_postgres`).
  - Cổng PostgreSQL QA Test: **`5438`** (`gss_qa_pg`).
  - Cấm tuyệt đối chạy cổng 8000 nhằm tránh xung đột với các stack BIM Logistics (`8085`), Paperless (`8080`) hoặc BIM ERP.
  - Cập nhật quy tắc vào `.agents/rules/backend-rules.md` (Mục 7) và `docs/11-runbook.md`.

## 2026-11-17 – Phản Ứng Tức Thì (Reactive Update) Khi Đổi / Cấp Token Trong Chi Tiết Nhà Xe
- **1. Đồng bộ tức thì Thẻ Tài Khoản & Bảo Mật Portal (Hình 2):**
  - Khắc phục sự cố không cập nhật mã token trên giao diện sau khi bấm "Lưu & Kích hoạt Token":
    - Cập nhật hàm `vaIssueTokenModal()` và `vaAccountModal()` trong `static/js/src/app/dispatch/vendor-admin.js`: Ngay khi nhận được phản hồi thành công từ API `/api/vendor-portal-accounts/<id>/`, hệ thống cập nhật tức thì dữ liệu tài khoản trong bộ nhớ cục bộ `vUpdated.account` (`plain_token`, `token_preview`, `magic_link`, `token_expires_at`).
    - Tự động gọi lại `openVendorDetailPage(vendorId, false)` để render lại ngay lập tức Thẻ Tài khoản & Bảo Mật Portal.
  - Cập nhật hàm `vaReload()`: Tự động kiểm tra trạng thái màn hình chi tiết nhà xe (`view-vendor-detail` đang hiển thị và có `currentActiveVendorId`) để nạp lại dữ liệu đồng bộ từ server mà không làm mất ngữ cảnh người dùng.
- **2. Kết quả thị giác:**
  - Ngay khi bấm "Lưu & Kích hoạt Token" trong modal Đổi Token (Hình 1), Thẻ tài khoản bên dưới (Hình 2) thay đổi tức thì:
    - *Mã Token xác nhận (GSS- 12 số & ký tự):* Chuyển ngay sang mã token mới (gợi ý 4 ký tự cuối hoặc mã đầy đủ khi bấm Hiện).
    - *Đường dẫn Magic Link:* Tự động cập nhật chuỗi token mới trong tham số `&t=GSS-...`.
    - Trạng thái hiệu lực và hạn dùng cập nhật đồng bộ.
- **3. Kiểm thử & Triển khai:**
  - Kiểm thử tự động Playwright (`scripts/test_reactive_token.py`): Mô phỏng quy trình bấm Đổi Token ➔ Sinh mã ➔ Bấm Lưu & Kích hoạt, xác thực assertion mã mới xuất hiện chính xác trên cả modal kết quả và thẻ chi tiết (PASS).
  - QA Verify: Đạt 7/7 PASS.
- File: `static/js/src/app/dispatch/vendor-admin.js`, `static/js/app.js`, `docs/CHANGELOG.md`.

## 2026-11-17 – Chuẩn hóa Màn hình Điều Vận Theo Dõi Nhà Xe: Lộ Trình 1 Hàng, Thao Tác Bác Tài & Xe, Modal Danh Sách Container Thuộc Phiếu Chia
- **1. Mở rộng cột "Lộ Trình Vận Chuyển" trên 1 dòng duy nhất (Hình 1):**
  - Khắc phục triệt để tình trạng gãy dòng chật hẹp của tuyến đường 3 điểm: mở rộng cột lộ trình với `min-w-[440px] whitespace-nowrap`, đảm bảo chuỗi cả 3 địa điểm (ví dụ: `CẢNG CÁT LÁI ➔ KHO NHÀ MÁY ĐẮK NÔNG ➔ DEPOT TÂN CẢNG LONG BÌNH`) nằm trọn vẹn, ngay ngắn trên 1 dòng duy nhất.
  - Thu gọn các cột khác vừa vặn (`w-32` cho Mã chuyến/Cont, `w-36` cho Khách hàng & Booking, `w-36` cho Xe & Tài xế, `min-w-[320px]` cho Ô trạng thái 7 bước hành trình).
- **2. Tối ưu bảng Danh sách Tài xế (Dòng Bác tài):**
  - Loại bỏ nút "Màn hình Tài xế" trên từng dòng Bác tài (do đã gắn trực tiếp vào các chuyến xe ở bảng dưới).
  - Bổ sung 2 nút thao tác chuẩn công thái học:
    - Nút `[ Xem ]`: Mở modal xem hồ sơ chi tiết Bác tài (Họ tên, SĐT, Nhà xe chủ quản, Phương tiện gán, Chuyến xe đang chạy, Trạng thái hoạt động).
    - Nút `[ Zalo / Gọi ]`: Mở liên hệ nhanh qua Chat Zalo trực tiếp hoặc sao chép nhanh số điện thoại để Điều vận viên gọi điện.
- **3. Tối ưu bảng Danh sách Đội xe & Phương tiện:**
  - Đồng bộ 2 nút thao tác tiện ích:
    - Nút `[ Xem ]`: Mở modal hồ sơ chi tiết phương tiện (Biển số xe, Loại phương tiện, Hãng sản xuất/Model, Tải trọng cho phép, Bác tài thường lái & SĐT, Nhà xe quản lý, Trạng thái vận hành).
    - Nút `[ Lịch sử ]`: Mở modal xem toàn bộ danh sách các chuyến xe mà phương tiện này đã tham gia vận chuyển.
- **4. Đổi mới theo dõi Lệnh Chưa Phân Bổ Xe - Modal Danh sách Container (Hình 2):**
  - Xác lập đúng vai trò Màn hình Điều Vận theo dõi các lệnh đã chuyển cho Nhà xe (giám sát cont nào đã gán xe chạy, cont nào chưa gán xe chạy).
  - Loại bỏ hoàn toàn nút "Gán tiếp" (không mở lại màn hình LDD.BK).
  - Thay bằng nút `[ Xem Cont ]` mở Modal chuyên biệt **"Danh sách Container Phiếu Chia"** (`opts.extraWide`):
    - Khối tóm tắt: Lệnh/Booking, Tên nhà xe, Tiến độ phân bổ (`X / Y cont`, cảnh báo số cont còn thiếu), nút Mở Cổng Nhà Xe để hỗ trợ thao tác hộ.
    - Bảng chi tiết từng Container thuộc phiếu:
      - Container đã gán xe: Badge xanh lá `[ Đã gán xe ]` kèm Biển số xe, Bác tài phụ trách, Mã chuyến và nút `[ Xem chuyến ]`.
      - Container chưa gán xe: Badge màu cam nổi bật `[ Chưa gán xe (Chờ nhà xe) ]` hiển thị rõ tình trạng để Điều vận viên giám sát chặt chẽ.
- **5. Kiểm thử & Bản dựng:**
  - Kiểm thử thị giác Playwright: Chụp ảnh xác thực thành công toàn bộ giao diện, modal container, modal bác tài và modal phương tiện.
  - QA Verify: Bộ kiểm thử `python scripts/qa.py verify` đạt kết quả tuyệt đối **7/7 PASS**.
- File: `templates/views/view_vendor_detail.html`, `static/js/src/app/dispatch/vendor-admin.js`, `static/js/app.js`, `static/css/tailwind.css`, `docs/CHANGELOG.md`.

## 2026-11-17 – Ban hành Nguyên tắc Cốt lõi: Nghiêm cấm Agent tự ý thay đổi mật khẩu và tên người dùng
- **1. Thiết lập nguyên tắc bất biến cho Agent (Core Safety Rule):**
  - Cập nhật quy tắc toàn cục `C:\Users\Jack\.gemini\config\AGENTS.md` (Mục 5: BẢO VỆ ĐỊNH DANH & BẢO MẬT TÀI KHOẢN).
  - Cập nhật quy tắc nghiệp vụ backend `.agents/rules/backend-rules.md` (Mục 6: Bảo Vệ Định Danh & Tuyệt Đối Không Tự Ý Đổi Mật Khẩu, Tên Người Dùng).
  - Cập nhật tài liệu an ninh kiến trúc `docs/08-security.md` (Mục IV: NGUYÊN TẮC QUẢN TRỊ ĐỊNH DANH & BẢO VỆ CREDENTIALS CỦA AGENT).
- **2. Quy định thực thi nghiêm ngặt:**
  - Agent AI tuyệt đối **KHÔNG ĐƯỢC TỰ Ý** đổi, đặt lại (reset) mật khẩu hoặc sửa đổi username của bất kỳ tài khoản người dùng nội bộ (`auth.User`), tài khoản quản trị hay tài khoản đối tác (`SubcontractorPortalAccount`) trên Local, QA hay Production trừ khi có lệnh rõ ràng, tường minh từ Người Dùng (USER).
  - Khi gặp lỗi xác thực, Agent bắt buộc phải tra cứu và đối soát nguyên nhân gốc (mã băm, cookie, CSRF, audit log) để báo cáo trung thực, bảo toàn tuyệt đối thông tin định danh và tài khoản hiện hành.
- File: `C:\Users\Jack\.gemini\config\AGENTS.md`, `.agents/rules/backend-rules.md`, `docs/08-security.md`, `docs/CHANGELOG.md`.

## 2026-11-17 – Nâng cấp Bảng Chi Tiết Đội xe & Phương tiện (Mỗi phương tiện 1 dòng) trong Chi Tiết Nhà Xe
- **1. Chuyển đổi Danh sách Đội xe & Phương tiện sang dạng Bảng Chi Tiết (Mỗi xe/phương tiện 1 dòng):**
  - Thay thế khối hiển thị badge/chip nhỏ trước đây bằng bảng dữ liệu SaaS ERP hoàn chỉnh, đồng bộ hoàn hảo với bảng Danh sách Tài xế:
    - *Biển Số Xe / BKS:* Badge font mono bo tròn kèm icon đầu kéo Phosphor `ph-truck` và nhãn thương hiệu xe (`Hyundai`, `Freightliner`, `Hino`...).
    - *Loại Phương Tiện & Tải Trọng:* Phân loại `Đầu kéo Container`, `Rơ-moóc`, `Xe tải` kèm tải trọng thực tế (`30.000 kg`).
    - *Bác Tài Thường Lái:* Hiển thị họ tên bác tài thường xuyên điều khiển phương tiện và số điện thoại liên hệ.
    - *Chuyến Xe Gần Nhất:* Mã chuyến xe gần nhất của phương tiện kèm badge số chuyến đã vận chuyển (click xem chi tiết chuyến).
    - *Trạng Thái Phương Tiện:* Phân loại trạng thái chuẩn: `Đang chạy chuyến` (xanh ngọc), `Sẵn sàng` / `Nằm bãi (Chờ việc)` (xanh dương), `Bảo trì` (cam).
    - *Thao Tác:* Nút `[ Xem chuyến ]` mở trực tiếp chi tiết chuyến xe gần nhất.
- **2. Mở rộng Backend API `VendorAdminOverviewAPIView`:**
  - Kết hợp đồng thời phương tiện khai báo sẵn trong hồ sơ Đội xe (`Vehicle.objects.filter(subcontractor_id=s.id)`) và các phương tiện đã thực hiện chuyến xe (`sub_trips`).
  - Trả về payload cấu trúc phương tiện đầy đủ (`plate`, `vehicle_type`, `brand`, `status`, `payload`, `driver_name`, `driver_phone`, `latest_trip_code`, `trips_count`).
- **3. Kiểm thử & Đồng bộ:**
  - Kiểm thử thị giác Playwright: Xác thực thực tế giao diện bảng phương tiện chi tiết, sắc nét, chuẩn công thái học.
  - QA Verify: Đạt 7/7 PASS.
- File: `apps/dispatch/api_views/vendor_admin.py`, `templates/views/view_vendor_detail.html`, `static/js/src/app/dispatch/vendor-admin.js`, `static/js/app.js`, `docs/CHANGELOG.md`.

## 2026-11-17 – Tối ưu hóa Thẻ Tài khoản Portal 4 hàng, Tách riêng Đội xe & Tài xế, và Nâng cấp Lệnh điều vận với Ô Trạng thái 7 nút hành trình
- **1. Tối ưu Thẻ Tài khoản & Bảo mật Cổng Đối Tác (Portal) - 4 hàng cân đối, rộng rãi:**
  - Thiết kế lại bố cục Thẻ 2 trong trang Chi tiết Nhà xe (iew_vendor_detail.html) giải quyết triệt để khoảng trống dư thừa, tạo cấu trúc 4 hàng đối xứng & thoáng đãng:
    - *Hàng 1 (2 cột):* Tên đăng nhập (User) có nút sao chép và thời gian tự đăng xuất | Mật khẩu (Pass) có tag bảo mật và thời gian đăng nhập gần nhất.
    - *Hàng 2 (2 cột):* Email nhận lệnh & OTP của đối tác | Số điện thoại liên hệ / Zalo trao đổi trực tiếp với Điều vận GSS.
    - *Hàng 3 (Toàn bộ chiều rộng):* Mã Token xác nhận bảo mật cao GSS-[A-Za-z0-9]{12} (hiển thị rộng rãi trọn vẹn, nút mắt ẩn/hiện, nút sao chép, tag trạng thái Hợp lệ/Hết hạn và nút Đổi Token).
    - *Hàng 4 (Toàn bộ chiều rộng):* Đường dẫn Magic Link đăng nhập 1-chạm (ô input readonly font mono đầy đủ, nút sao chép link và nút Mở Cổng Nhà Xe trực tiếp).
  - *Kiến trúc tài khoản:* Độc lập hoàn toàn với uth.User trong Admin Người dùng nội bộ để đảm bảo an ninh thông tin, cô lập dữ liệu đối tác bên ngoài (multi-tenant) và giúp Điều vận viên chủ động 100%.
- **2. Tách bạch rõ ràng Đội xe & Tài xế (Hình 2):**
  - Khối *Danh sách Đội xe & Phương tiện:* Hiển thị trực quan toàn bộ biển số đầu kéo, rơ-moóc của nhà xe kèm badge tổng số phương tiện.
  - Khối *Danh sách Tài xế:* Bảng chi tiết bác tài với Họ tên, Số điện thoại, Chuyến phụ trách, Phương tiện/Cont, Trạng thái chuyến và nút Màn hình Tài xế mở mô phỏng smartphone.
- **3. Nâng cấp khối Lệnh Điều vận thành 2 phân khu & Bổ sung Ô Trạng thái 7 nút:**
  - *Các lệnh Chưa phân bổ xe:* Lọc các phiếu chia / lệnh điều vận chưa gán đủ xe (illed < allocated_containers), thanh tiến trình % và cảnh báo số cont còn thiếu, kèm nút Màn hình Vendor mở phiếu chia gán hộ và nút Gán tiếp.
  - *Các lệnh đã phân bổ:* Liệt kê toàn bộ các chuyến xe đã gán xe & tài xế, hiển thị rõ Mã chuyến, Cont, Khách hàng, Xe & Bác tài, Tuyến đường vận chuyển.
  - *Ô Trạng thái 7 nút (7-Step Journey Stepper):* Chuỗi 7 nút mốc hành trình trực quan: 1. Sẵn sàng ➔ 2. Đến nhận ➔ 3. Nhận cont ➔ 4. Đến giao ➔ 5. Giao xong ➔ 6. Đi hạ rỗng ➔ 7. Hạ rỗng. Bước đã qua sáng xanh lá (completed), bước hiện tại sáng teal viền ring (active), bước chưa tới màu xám nhạt (pending), có tooltip hiển thị thời gian xác nhận chi tiết.
- **4. Kiểm thử thị giác & Đồng bộ hệ thống:**
  - Kiểm thử thị giác Playwright chụp ảnh thực tế đạt độ chuẩn xác 100% công thái học và thẩm mỹ.
  - Bộ kiểm thử python scripts/qa.py verify đạt kết quả 7/7 PASS.
- File: pps/dispatch/api_views/vendor_admin.py, 	emplates/views/view_vendor_detail.html, static/js/src/app/dispatch/vendor-admin.js, static/js/app.js, static/css/tailwind.css, docs/CHANGELOG.md.

## 2026-11-17 – Nâng cấp toàn diện Màn hình Quản lý Vendor: Chuẩn Token bảo mật cao GSS-[A-Za-z0-9]{12}, Bảng tinh giản và Trang Chi Tiết Nhà Xe Toàn Màn Hình (Full-Page View)
- **1. Chuẩn Token Cổng Nhà Xe bảo mật cao:**
  - Token xác nhận của Cổng Đối Tác được cấu hình theo định dạng chuẩn: Tiền tố `GSS-` kết hợp chuỗi 12 ký tự ngẫu nhiên bao gồm chữ hoa, chữ thường và chữ số (ví dụ: `GSS-7aB9xK2mP4qL`), thay cho các mã cũ ngắn hoặc dễ suy đoán.
  - Cập nhật hàm backend `generate_secure_vendor_token()` trong `apps/dispatch/vendor_service.py` và hàm frontend `vaGenRandomToken()` trong `static/js/src/app/dispatch/vendor-admin.js`.
  - Toàn bộ token được mã hóa hai chiều đối xứng Fernet AES trong database, hỗ trợ tra cứu ẩn/hiện mắt và sao chép an toàn.
- **2. Tinh giản tối đa Bảng Quản lý Vendor (Tab 4 Điều vận):**
  - *Loại bỏ các nút ngoài thanh Tab con:* Bỏ 2 nút "Màn hình Vendor" và "Màn hình Tài xế" ngoài thanh Tab bar để tránh trùng lặp và làm rối thanh điều hướng.
  - *Cột Thao tác ngoài bảng chỉ gồm 2 nút:* Giữ lại duy nhất **`[ Xem ]`** (outline xanh ngọc, icon con mắt `ph ph-eye`) và **`[ Khóa / Mở khóa ]`** (outline hồng đỏ, icon `ph ph-lock`), loại bỏ toàn bộ các nút rườm rà ngoài bảng.
- **3. Trang Chi Tiết Nhà Xe Toàn Màn Hình (Dedicated Full-Page View, không dùng modal), tập trung & trực quan:**
  - Khi bấm nút **`[ Xem ]`** trên bất kỳ dòng nhà xe nào, hệ thống chuyển sang Trang Chi Tiết Nhà Xe toàn màn hình (/dispatch/vendors/<id>) không giới hạn tầm nhìn người dùng:
    - *Thanh tác vụ nhanh (Header Quick Actions):* Nút `Màn hình Vendor`, `Màn hình Tài xế`, `Gửi Zalo`, `Khóa / Mở khóa tài khoản`.
    - *Thông tin pháp lý & liên hệ:* Tên doanh nghiệp, MST, địa chỉ trụ sở, bãi xe/kho bãi, người liên hệ & chức vụ, SĐT, email nhận lệnh.
    - *Tài khoản & bảo mật Cổng Nhà xe (User | Pass | Token):* Tên đăng nhập, mật khẩu, Token `GSS-[A-Za-z0-9]{12}`, nút ẩn/hiện, copy, Magic Link đăng nhập 1-chạm, nút `Đặt / Cấp Token` và `Cấu hình User & Pass`.
    - *Đội xe & Bác tài:* Danh sách biển số xe đầu kéo / rơ-moóc hoạt động và danh sách Bác tài kèm nút "Màn hình Tài xế" mở trực tiếp từng chuyến.
    - *Lệnh điều động & Phiếu chia cont:* Liệt kê toàn bộ phiếu chia container kèm nút "Màn hình Vendor" trực tiếp.
- **4. Kiểm thử thị giác (Visual Testing) & QA:**
  - Kiểm thử thị giác tự động bằng Playwright: Xác thực thực tế giao diện bảng tinh gọn và Modal chi tiết hiển thị đầy đủ, không trùng lặp, chuẩn tỷ lệ và công thái học.
  - Bộ kiểm thử QA Verify đạt 7/7 PASS (100% kiểm tra cú pháp, migration, django check, bảo mật, và toàn bộ suite test).
- File: `apps/dispatch/vendor_service.py`, `apps/dispatch/api_views/vendor_admin.py`, `apps/dispatch/test_vendor_admin.py`, `apps/gss/tests.py`, `templates/views/view_dispatch.html`, `static/js/src/app/dispatch/vendor-admin.js`, `static/js/app.js`, `static/css/tailwind.css`, `docs/04-user-guide.md`, `docs/CHANGELOG.md`.

## 2026-11-17 – Khắc phục triệt để lỗi 404 khi Refresh, tối ưu cột Thao tác Vendor và sửa lỗi xác thực Magic Link Cổng Nhà Xe
- **1. Tinh gọn cột Thao tác bảng Quản lý Tài khoản Nhà xe (Tab 4 Điều vận):**
  - *Bỏ nút "Màn hình Vendor" trong cột Thao tác:* Loại bỏ nút "Màn hình Vendor" trên từng dòng bảng tài khoản nhà xe (cả trường hợp đã có và chưa có tài khoản) để tránh trùng lặp dư thừa, vì trên thanh công cụ (Toolbar) ở trên đã có nút "Màn hình Vendor" mở bộ chọn nhanh hoặc mở trực tiếp nhà xe được chọn.
  - *Cột Thao tác trực quan & tập trung:* Chỉ giữ lại các thao tác cốt lõi: `[ Cấp tài khoản ]` (khi chưa có) hoặc `[ Đặt Token ] [ Sửa ] [ Zalo ] [ Mở khóa ] [ Bật/Tắt ]` (khi đã có).
- **2. Xử lý triệt để lỗi 404 khi Refresh / tải lại trang (F5):**
  - *Bổ sung đầy đủ URL Patterns không có dấu gạch chéo cuối (No-slash routes):* Bổ sung các route `dashboard`, `dispatch`, `sales`, `fleet`, `hr`, `accounting`, `customs`, `reports`, `settings`, `danh-muc`, `vendor`, `vendor/login`, `vendor/<str:token>`, `q/<str:token>` trong `config/urls.py`.
  - *Tương thích hoàn hảo với SPA pushState và Nginx Reverse Proxy:* Khi người dùng nhấn F5 hoặc mở trực tiếp đường dẫn Clean Semantic Routes (ví dụ `https://gss.bim.info.vn/dispatch`), hệ thống phục vụ trực tiếp `index_view` mà không bị lỗi 404 hay redirect 301.
- **3. Khắc phục triệt để lỗi Magic Link & xác thực Token Cổng Nhà Xe:**
  - *Tách biệt rõ ràng route `/vendor/login/`:* Cấu hình đường dẫn riêng trong `config/urls.py` và loại trừ chuỗi `'login'` trong `apps/dispatch/vendor_views.py` để không truyền nhầm `initial_token='login'` xuống template.
  - *Nâng cấp logic nhận diện Token trong `VendorPortalAuthStatusAPIView`:* Không coi từ khóa `'login'` là allocation token. Đặc biệt, bổ sung cơ chế kiểm tra chéo: nếu token gửi lên không phải là phiếu chia lệnh booking mà là mã xác nhận tài khoản (`SubcontractorPortalAccount.confirm_token`, ví dụ `GSS-YCZ8OE`), API không trả về 404 `token_invalid` mà trả về `200 OK` kèm `token_hint` chứa tên đăng nhập và tên nhà xe.
  - *Tự động điền thông tin đăng nhập trên `vendor_portal.html`:* Khi đối tác mở Magic Link `https://gss.bim.info.vn/vendor/login/?u=hoangnam&t=GSS-YCZ8OE` (hoặc mở trực tiếp từ tin Zalo), hệ thống tự động điền Tên đăng nhập và Mã Token, hiển thị gợi ý xác nhận hợp lệ và tự động focus vào ô Mật khẩu.
- **4. Kiểm thử & Bản dựng:**
  - Bổ sung unit test `test_vendor_login_route_and_magic_link_auth_status` trong `apps/dispatch/test_vendor_admin.py` (toàn bộ suite test Vendor PASS 100%).
  - Biên dịch lại `static/js/app.js` và `static/css/tailwind.css`; toàn bộ QA verify đạt kết quả ĐẠT.
- File: `config/urls.py`, `apps/dispatch/vendor_views.py`, `apps/dispatch/api_views/vendor.py`, `apps/dispatch/test_vendor_admin.py`, `templates/vendor_portal.html`, `static/js/src/app/dispatch/vendor-admin.js`, `static/js/app.js`, `docs/CHANGELOG.md`.

## 2026-11-17 – Dùng chung giao diện Ma trận Timeline 7 mốc xe container cho Màn hình Theo dõi hành trình Điều vận
- **Đồng bộ thiết kế Ma trận Timeline hành trình xe container (Dùng chung với Dashboard):**
  - *Thay thế giao diện Kanban 6 cột cũ:* Màn hình Theo dõi hành trình (chế độ "Theo bước hành trình" trong Tab 3 Điều vận) chính thức chuyển sang dùng chung component Ma trận Timeline đường ray 7 mốc (`GSSApp.fleetTimeline`) đang hoạt động trên Dashboard.
  - *Tính năng trực quan & Thời gian thực:*
    - Đường ray tiến độ 7 mốc: Sẵn sàng ➔ Đến nơi nhận ➔ Đã nhận cont ➔ Đến nơi giao ➔ Giao xong ➔ Đi hạ rỗng ➔ Hạ rỗng.
    - Đánh dấu sao các điểm thực tế quan trọng: ★ NƠI NHẬN (Cảng/Kho bốc), ★ NƠI GIAO (Nhà máy/Kho khách), ★ NƠI HẠ RỖNG (Depot/ICD).
    - Biểu tượng xe tải container SVG (`GSSTruck`) hiển thị biển số đầu kéo chạy mượt mà theo % tiến độ.
    - Gom nhóm trực quan theo Nhà xe kèm tổng số chuyến và lộ trình rút gọn.
    - Thanh công cụ đầy đủ: Ô tìm kiếm đa năng (biển số, mã chuyến, số cont, tài xế, nhà xe, khách hàng), Dropdown sắp xếp (Nhà xe, Tiến độ Cao➔Thấp, Tiến độ Thấp➔Cao, Biển số A➔Z), các Chip lọc nhanh (Tất cả, Đang chạy, Đã hạ rỗng, theo từng Nhà xe), và nút `↻ Làm mới` dữ liệu tức thì.
    - Bấm vào bất kỳ chuyến xe nào để mở Drawer thao tác nhanh (xem chi tiết, đổi bước, xem chứng từ/ảnh thực tế, in phiếu POD/QR, mở phiếu vận chuyển toàn diện).
- **Kiến trúc & Tái sử dụng (Reusability):**
  - Tái sử dụng 100% component và style `.gss-scope .fleet-*` từ `static/js/gss/console.js` và `static/css/gss.css`, loại bỏ hoàn toàn mã nguồn trùng lặp.
  - Tích hợp liên kết `Mở phiếu vận chuyển` (`window.viewTripDetail`) ngay trong Drawer chi tiết của Timeline.
- **Tài liệu & Bản dựng:** Cập nhật `docs/04-user-guide.md`, `docs/CHANGELOG.md`, `templates/views/view_dispatch.html`, `static/js/src/app/dispatch/vendor-admin.js`, biên dịch `static/js/app.js` và `tailwind.css`.

## 2026-11-17 – Bổ sung nút "Màn hình Vendor" và "Màn hình Tài xế" để xem và hướng dẫn hoặc thao tác hộ
- **Tính năng Màn hình Vendor & Màn hình Tài xế trong tab Quản lý Vendor (Tab 4 Điều vận):**
  - *Nút "Màn hình Vendor" (Cổng Nhà Xe Đối Tác):* Bố trí trên thanh công cụ Tab 4 và từng dòng Nhà xe/Phiếu chia. Khi bấm, hệ thống ưu tiên mở Cổng Nhà Xe của đúng đối tác (tự động điền Tên đăng nhập và Token qua Magic Link). Trường hợp chưa chọn nhà xe, mở modal tìm kiếm nhanh kèm nút mở trực tiếp cổng `/vendor/` hoặc phiếu chia cont.
  - *Nút "Màn hình Tài xế" (Lệnh Điều Xe Di Động):* Bố trí trên thanh công cụ Tab 4 và từng dòng Chuyến xe. Khi bấm, hệ thống mở cửa sổ pop-up mô phỏng đúng kích thước smartphone di động (440x880) hoặc tab mới truy cập `/q/<token>/`. Điều vận có thể vừa gọi điện thoại hướng dẫn tài xế vừa theo dõi màn hình, hoặc bấm xác nhận các mốc chặng (nhận hàng, giao hàng, hạ rỗng, tải chứng từ EIR/POD) thao tác hộ khi tài xế gặp khó khăn.
  - *Thiết kế UI/UX & Chuẩn Icon:* 100% icon sử dụng chuẩn outline Phosphor (`ph ph-desktop`, `ph ph-device-mobile`, `ph ph-arrow-square-out`), bố cục chuẩn chỉ, màu sắc hài hòa và phân cấp công thái học.
- **Tài liệu & Bản dựng:** Cập nhật `docs/04-user-guide.md`, `templates/help.html`; biên dịch lại `static/js/app.js` (106 file nguồn) và `tailwind.css`.

## 2026-11-16 – Nâng cấp tính năng Cấp Token chủ động: tự đặt mã, tùy chọn thời hạn, Magic Link và mẫu tin Zalo 1-Click
- **Cơ chế cấp Token chủ động cho Điều vận:**
  - *Tự đặt mã Token (Custom Token):* Điều vận có thể tự gõ mã Token theo quy ước riêng (ví dụ: `ANPHAT-2026`, `HP26`) hoặc bấm nút `Sinh mã` ngẫu nhiên.
  - *Cấu hình thời hạn linh hoạt:* Chọn hạn dùng `Vô thời hạn`, `30 ngày`, `90 ngày`, `365 ngày`, `7 ngày` hoặc chọn ngày cụ thể; hệ thống tự động kiểm soát hiệu lực khi đăng nhập.
  - *Tra cứu & Sao chép an toàn:* Token được mã hóa hai chiều bằng Fernet AES trong `SubcontractorPortalAccount` (`confirm_token_cipher`), Điều vận có quyền xem (icon mắt `ph ph-eye`) và sao chép lại bất kỳ lúc nào mà không cần reset mã.
  - *Magic Link (Đăng nhập 1-chạm):* Đường link dạng `/vendor/login/?u=...&t=...` tự động điền Tên đăng nhập và Token trên Cổng Nhà Xe, đối tác chỉ cần gõ Mật khẩu.
  - *Mẫu tin nhắn Zalo 1-Click:* Nút `Zalo` (icon outline chuẩn `ph ph-chat-teardrop-text`) soạn sẵn toàn bộ nội dung tin nhắn gửi nhà xe (thông tin tài khoản/token/link) và gửi bác tài (chuyến xe, số cont, link QR di động).
- **Backend & Database:** Thêm `confirm_token_cipher`, `token_expires_at` vào model `SubcontractorPortalAccount` (migration `master_data.0006`); nâng cấp `provision_portal_account` và các API view `vendor.py`, `vendor_admin.py`.
- **Frontend & UI/UX:** Nâng cấp modal `vaAccountModal`, modal `vaIssueTokenModal`, modal kết quả `vaShowTokenResult`, bảng tài khoản Tab 4 Điều vận, bảng chia cont Tab 2, bảng link tài xế Tab 4. Toàn bộ icon tuân thủ chuẩn icon outline Phosphor.
- **Tài liệu & Kiểm thử:** Đồng bộ `docs/04-user-guide.md`, biên dịch lại `templates/help.html` và `tailwind.css`; bổ sung unit test `test_proactive_token_issuance_and_magic_link` trong `test_vendor_admin.py` (QA verify 7/7 PASS).
- File: `apps/master_data/models.py`, `apps/master_data/migrations/0006_*.py`, `apps/dispatch/vendor_service.py`, `apps/dispatch/api_views/vendor.py`, `apps/dispatch/api_views/vendor_admin.py`, `apps/dispatch/test_vendor_admin.py`, `core/security.py`, `templates/vendor_portal.html`, `static/js/src/app/dispatch/vendor-admin.js`, `static/js/app.js`, `static/css/tailwind*.css`, `docs/04-user-guide.md`, `templates/help.html`, `docs/CHANGELOG.md`.

## 2026-11-15 – Viết lại HDSD toàn diện: bổ sung sơ đồ quy trình thao tác (workflow) cho từng phân hệ
- **Tài liệu người dùng (`docs/04-user-guide.md` & `templates/help.html`):** Rà soát và viết lại toàn bộ sổ tay hướng dẫn sử dụng phiên bản v1.2.
- **Quy trình thao tác dạng workflow:** Đầu mỗi phân hệ/tính năng (A4, B0, C1 đến C14) đều được bổ sung sơ đồ trực quan (Workflow Diagram dạng khối/mũi tên ASCII) và bảng quy trình chi tiết (Bước, Người thực hiện, Thao tác trên phần mềm, Dữ liệu đầu vào, Kết quả đầu ra, Ràng buộc & Điểm kiểm soát).
- **Cập nhật tính năng mới đồng bộ:**
  - *Dashboard Tổng quan (C1):* Bố cục 4 vùng, 6 thẻ KPI GSS, vùng hành trình xe co giãn sát đáy màn hình khi ẩn vùng dưới, ma trận nhà xe theo bước.
  - *Sale & Booking (C2):* Quản lý B/L (MBL/HBL), nhập/dán container kiểm tra ISO 6346, chuẩn hóa VGM nguyên kg (`formatVgmKg`), quy tắc DEM/DET, thanh công cụ phân bổ công thái học Fitts's Law.
  - *Điều vận (C3):* Chuẩn hóa 4 tab chữ thường (`Lệnh điều độ`, `Phân bổ & gán xe`, `Theo dõi hành trình`, `Quản lý Vendor`), nút Xem Tab 2 mở đúng Phiếu VC, 17 khóa bất biến bảo vệ chuyến xe, phân bổ Vendor & gửi email lệnh mẫu phiếu giao hàng HTML/PDF.
  - *Cổng tài xế (C4):* Quy trình 7 mốc, camera watermark/GPS, E-POD ký tay cảm ứng, kê chi phí, hàng đợi ngoại tuyến Offline Sync Queue.
  - *Cổng nhà xe Vendor Portal (C5):* Giao diện Topbar trắng sáng hiện đại, 4 thẻ KPI TMS, tự gán xe/tài và nhập Excel, hỗ trợ cập nhật mốc thay tài xế, tự khóa sau 7 ngày.
  - *Public Tracking (C5.2):* Link tra cứu khách hàng 6 chặng không cần tài khoản, xem E-POD, bảo mật giá cước.
  - *Hành chính & Nhân sự (C6):* Cảnh báo GPLX 30 ngày, hợp đồng lao động, chấm công, tính lương kết hợp Hybrid Payroll, xuất file Internet Banking.
  - *Tài chính & Kế toán (C7):* Sổ quỹ S03a-DN, tạm ứng 2 cấp (Quỹ điều vận ➔ Tạm ứng chuyến), chốt sổ chi phí chuyến, bảng kê SOA 26 cột, tách riêng Debit Note chi hộ, quyết toán 3PL và quyết toán gom chuyến.
  - *Xe & Bãi Depot (C8):* Cảnh báo đăng kiểm/bảo trì 30 ngày, quản lý bãi depot container, quét mã QR ra vào cổng bãi.
- File: `docs/04-user-guide.md`, `templates/help.html`, `docs/CHANGELOG.md`.

## 2026-11-15 – Điều vận: 4 tab chữ thường, tab «Quản lý Vendor», hạn dùng và thu hồi link tài xế
- **Tab:** `Lệnh điều độ` (chỉ booking chưa phân bổ hoặc phân bổ chưa hết) · `Phân bổ & gán xe` (mỗi dòng một nhà xe được phân bổ, tiến độ gán xe/tài, bấm để gán tiếp) · `Theo dõi hành trình` (bảng container chỉ xe đã nhận lệnh và đang chạy; thêm chế độ *Theo bước hành trình* và giữ *Phiếu VC*) · `Quản lý Vendor` (tài khoản/token nhà xe, link nhà xe, link tài xế). Bỏ số đếm trên tên tab.
- **Link tài xế `/q/<token>/`:** thêm `DispatchTrip.qr_expires_at` (migration `dispatch.0003`); `qr_tracking.service.trip_by_token` từ chối link hết hạn. Điều vận đặt hạn, cấp lại (tăng `qr_version`) hoặc thu hồi; ghi `AuditLog`.
- **API mới:** `GET /api/vendor-admin/overview/`, `POST /api/vendor-admin/driver-links/<trip_id>/` (action `revoke|regenerate|set_expiry`, `days` 0–365); tiền tố `/api/vendor-admin/` gắn tính năng `vendor_portal`. `GET /api/dispatch/vendor-containers/?status=ACTIVE` (đã nhận lệnh + đang hành trình).
- **Migration mới:** web trên VPS tự `migrate` khi khởi động; stack local 8086 cần khởi động lại để áp dụng.
- File: `apps/dispatch/api_views/vendor_admin.py`, `apps/dispatch/models.py`, `apps/qr_tracking/service.py`, `config/urls.py`, `core/features.py`, `templates/views/view_dispatch.html`, `static/js/src/app/dispatch/vendor-admin.js`, `dispatch-order-modal.js`, test `apps/dispatch/test_vendor_admin.py`.

## 2026-11-15 – Sửa chuẩn logic nút «Xem» Tab 2 Điều vận: mở đúng Phiếu Vận Chuyển (VC)
- **Chuẩn hóa nút «Xem» cột Thao tác Tab 2 (Phân bổ & Gán xe):** Khắc phục lỗi nút Xem mở nhầm trang Lệnh Điều Động (openDispatchOrderPage). Nay nút «Xem» mở trực tiếp Chi tiết Phiếu Vận Chuyển (iewTripDetail(r.trip_code)); trường hợp container chưa được gán xe (chưa phát sinh VC), hệ thống bật modal xác nhận thông báo rõ tình trạng và hỏi người dùng có muốn mở Lệnh Điều Động để kiểm tra/phân bổ không.
- **Tương tác linh hoạt:** Cột Lệnh Điều Động (dispatch_order_code) và cột Phiếu Vận Chuyển (	rip_code) nay đều là các liên kết bấm được (clickable), giúp người dùng xem nhanh từng chứng từ tương ứng chỉ với 1 click.
- **Duy trì ngữ cảnh Tab 2:** Khi quay lại từ màn hình Chi tiết chuyến, hệ thống lưu giữ nguyên trạng thái Tab 2 endor-containers thay vì tự động quay về Tab 1.
- File: static/js/src/app/dispatch/dispatch-order-modal.js, static/js/src/app/core/router.js, static/js/app.js.

## 2026-11-15 – Skill thiết kế giao diện `gss-ui-design`, chốt Sidebar 8 mục, dọn cỡ chữ `gss.css`
- Thêm skill `.claude/skills/gss-ui-design/SKILL.md`: hợp nhất chuẩn BIM + GSS (4 tầng Zero Layout Shift, token, cây quyết định theo loại việc, danh sách cấm, cổng nghiệm thu).
- Chốt Sidebar GSS **8 mục** (không Hải quan) trong `docs/10-ui-ux-guidelines.md` (mục 0 #14, 5.2).
- `static/css/gss.css`: nâng 10 chỗ cỡ chữ 11px/11.5px lên 12px (nhãn form, `.pill`, tiêu đề bảng, KPI, `.steps`, `.thumb`, `.small`, `.kcard .kt/.klink`). Không đổi bố cục khác.
- `static/css/main.css`: nâng `--font-body-sub`, `--font-caption`, `--font-size-sub`, `--font-size-caption` (11/11.5px) và nhãn `.app-form-label`/`.form-label` lên 12px.

## 2026-11-15 – Dashboard: vùng hành trình giãn tới đáy màn hình khi ẩn vùng phía dưới
- Khi tắt vùng "Công việc & Bản tin" (vùng cuối), vùng tab thông tin (Theo dõi hành trình, Danh sách chuyến...) tự kéo cao tới sát đáy khung nhìn; đo theo cỡ màn thực tế, đổi cỡ cửa sổ / thu phóng / đổi tab / thanh lọc đều tự tính lại, không sinh thanh cuộn thừa.
- Chiều cao Thấp/Vừa/Cao là mức tối thiểu (vùng phía trên còn cao thì trang cuộn như cũ); "Tự kéo" giữ theo tay người dùng. Chế độ giãn bỏ dải đệm 64px cuối trang và chừa chỗ cho nút chat nổi ở chân bảng. Bật lại vùng cuối thì trở về cách cũ.
- File: `static/js/src/app/dashboard/layout-settings.js` (`dashFitJourneyToScreen`).

## 2026-11-15 – Rà soát bảo mật toàn repo và dựng lại luồng local → GitHub → VPS cho riêng GSS
- **Kết quả rà soát:** không có khoá/token/.env trong file đang theo dõi hay trong lịch sử git (đã quét toàn bộ lịch sử); `qa.py audit` phần bảo mật: bandit, pip-audit, check --deploy, eval/exec, SQL ghép chuỗi, TLS đều sạch.
- **Chặn lộ khoá:** `.gitignore` thêm `.ssh/`, `gss_deploy*`, `id_*`, `*.pem`; `.dockerignore` loại khoá và `gss_local_credentials.txt` khỏi image; hook `.githooks/pre-commit` chặn commit có `.env`, khoá SSH, file dump/CSDL hoặc nội dung chứa khoá riêng/token (đã thử bằng file giả).
- **CI:** quyền tối thiểu (`contents: read`), huỷ lượt chạy cũ cùng nhánh; job `secrets` (gitleaks) giờ **chặn** (trước đây chỉ cảnh báo vì lịch sử cũ lộ bí mật, lịch sử đã làm lại sạch). Thêm `.github/dependabot.yml` (pip, github-actions, docker hằng tuần).
- **Deploy VPS (`deploy.yml`):** chỉ chạy từ `master`; bắt buộc CI `test` + `secrets` của đúng commit xanh; deploy đúng commit đó bằng fast-forward (không "master mới nhất"); ghim host key qua secret `VPS_HOST_KEY` (không có thì cảnh báo); xoá khoá SSH trên runner sau khi chạy; giới hạn 30 phút.
- **Vô hiệu hoá** `deploy.sh` và `update_all.sh` ở thư mục gốc (chạy `migrate`/restart thẳng trên CSDL thật, không sao lưu, không quay về); cách duy nhất là workflow `Deploy VPS` hoặc `scripts/deploy_vps.sh`.
- `config/settings.py`: production (DEBUG=False) thiếu `DB_HOST` thì báo lỗi, không rơi về SQLite nữa.
- Tài liệu: `docs/15-deployment-guide.md` thêm mục 5 (bảo vệ GitHub: cấm force-push, status checks, secret scanning, 2FA, reviewers) và mục 6 (luồng chuẩn); `CLAUDE.md` cập nhật quy tắc.

## 2026-11-15 – Dashboard Tổng quan: bố cục 4 vùng, 6 thẻ, tab thông tin và cài đặt hiển thị từng vùng
- **Bố cục mới theo mẫu BIM:** thanh đầu (Chào mừng · Góc nhìn · Kỳ xem · **Cài đặt hiển thị** · Làm mới) → **6 thẻ chỉ số** → **biểu đồ** (Tùy biến dữ liệu có sẵn) → **vùng tab thông tin** → **Công việc | Bản tin nội bộ**. Trang `/` dùng chung màn Dashboard của khung (`view_dashboard.html`); không còn nhóm màn GSS riêng «Tổng quan nhà xe» (`GROUPS` trong `static/js/gss/console.js` để trống).
- **Giám đốc có 6 thẻ GSS theo thứ tự:** Kinh doanh · Vận hành chuyến · Khả dụng đội xe theo nhà xe (xe nhà xe đang lăn bánh) · Bãi Đắk Nông (tồn bãi, vào/ra hôm nay) · Cảnh báo DEM/DET · Tài chính & Quỹ. Thẻ Hải quan không còn trên Dashboard Giám đốc (chưa có dữ liệu GSS). Các góc nhìn khác giữ thẻ cũ và thêm thẻ «Cảnh báo DEM/DET» ở cuối.
- **Thẻ «Cảnh báo DEM/DET»:** số cont sắp/quá hạn, quá hạn, chuyến đang chạy, cont chờ nhập xe/tài (`gss_dashboard.kpi_snapshot()`); dòng DEM/DET của thẻ Hải quan không còn gõ cứng «0 cont quá hạn».
- **Vùng tab thông tin:** Theo dõi hành trình (dùng lại `GSSApp.fleetTimeline`) · Danh sách chuyến (thanh tiến độ 7 bước, lộ trình, DEM/DET, lọc theo tiến độ) · Cảnh báo DEM/DET · Chờ nhập xe/tài · **Ma trận nhà xe** (bấm một con số mở đúng danh sách cont, có nút Bỏ lọc) · Tra cứu B/L · cont. Dùng API sẵn có `/api/gss/trips/` và `/api/gss/lookup/`; bấm dòng mở ngăn chi tiết chuyến GSS.
- **Cài đặt hiển thị** (nút đầu trang + nút `Hiển thị` riêng từng vùng): ẩn/hiện vùng, từng thẻ, từng biểu đồ, từng khung Công việc/Bản tin, từng tab; độ rộng **Cố định** (preset tỷ lệ) hoặc **Tự do kéo**; chiều cao Thấp/Vừa/Cao/Tự kéo; Khôi phục mặc định. Lưu `localStorage` khóa `gss_dash_layout_v1` (theo trình duyệt). File mới `static/js/src/app/dashboard/layout-settings.js`.
- Test mới: `DashboardDemDetCardTests` (số thẻ, số liệu, có ở mọi góc nhìn).

## 2026-11-15 – Rà soát Bước 1–3 theo kế hoạch GSS (BRD): gửi lệnh email và mẫu phiếu giao hàng
- **Sửa lỗi «Lưu & Phát Lệnh» không gửi email (Bước 2):** ở màn Lệnh điều vận (`/dispatch/orders/<id>`), khi các nhà xe đã được giao cont theo từng cont, nút chỉ báo «phát hành thành công» mà không gửi email, và dừng sớm với thông báo «thêm ít nhất một nhà xe». Nay nút gửi email lệnh kèm link riêng cho từng nhà xe (`POST /api/bookings/<id>/send-orders/`, tuỳ chọn `subcontractor_ids`), báo rõ nhà xe nào gửi được, nhà xe nào thiếu email hoặc bị khóa.
- Dùng lại link đang chạy của nhà xe (không làm hỏng link đã mở); email liệt kê số cont được giao (tối đa 60 số).
- **Mẫu phiếu giao hàng (Bước 1/5):** form Booking có ô chọn mẫu (lưu `pod_template_id`) và nút «Quản lý mẫu» mở màn tạo/sửa/xóa/xem trước mẫu và gán mẫu cho từng khách hàng (`pod-templates.js`). Thứ tự ưu tiên khi in: mẫu của Booking → mẫu gán cho khách → mẫu mặc định.
- `GET /api/gss/pod-templates/` mở cho Kinh doanh/Điều vận; ghi mẫu vẫn chỉ Quản trị/Giám đốc.
- Test mới: gửi lệnh theo nhà xe (giữ link, báo thiếu email, lọc nhà xe, quyền), chọn mẫu qua API Booking, quyền xem mẫu.

## 2026-11-13 (Cập nhật 18) – Tái Cấu Trúc Giao Diện Cổng Nhà Xe (Vendor Portal) Đồng Bộ 100% Design System & Rules Giao Diện Màn Hình Chính
- **Đồng bộ Topbar chuẩn văn phòng GSS (`h-16 bg-white border-b border-slate-200`):**
  - Loại bỏ hoàn toàn thanh header gradient xanh tối màu (`h-14 bg-gradient-to-r from-teal-800 ...`) gây cảm giác tách rời ứng dụng.
  - Áp dụng Topbar trắng sáng hiện đại chuẩn màn hình chính GSS: Logo GSS tinh gọn, tiêu đề thương hiệu `GREEN SOLUTIONS SMART`, nhãn nhận diện `CỔNG NHÀ XE`, tên nhà xe `font-black text-slate-900 font-heading`.
  - Đồng bộ pill đếm ngược phiên làm việc (`rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-teal-800`), nút Làm Mới và Đăng Xuất theo chuẩn nút toolbar GSS.
- **Tái cấu trúc bộ 4 Thẻ Chỉ Số Vận Hành (KPI Strip Cards):**
  - Đưa từ dạng thẻ nhỏ (p-3.5, 2-cột, text-2xl) sang bộ 4 thẻ KPI chuẩn TMS phân hệ Điều vận (`p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4`).
  - Viền trái nhận diện ngữ nghĩa: Thẻ 1 (Tổng cont: `border-l-indigo-600`), Thẻ 2 (Chờ gán xe: `border-l-amber-500`), Thẻ 3 (Đang chạy tuyến: `border-l-teal-600`), Thẻ 4 (Đã hạ rỗng: `border-l-emerald-600`).
  - Cỡ số hiển thị lớn chuẩn `text-3xl font-black tabular-nums font-heading tracking-tight mt-1` kèm dòng phụ có icon và mô tả rõ ràng.
- **Chuẩn hóa Typography, Khoảng cách (Spacing) & Bảng Dữ Liệu:**
  - Nạp font chữ doanh nghiệp chuẩn `Plus Jakarta Sans`, `Be Vietnam Pro`, `JetBrains Mono` từ `static/css/main.css` và `static/css/contrast.css`.
  - Loại bỏ các cỡ chữ nhỏ vụn vặt (`text-[10px]`, `text-[11px]`, `text-[10.5px]`), nâng lên thang chữ tối thiểu 12px/13px chuẩn ERP.
  - Đồng bộ bảng dữ liệu (`.erp-table`), header cột sticky `bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider py-2.5 px-3 border-b border-slate-300`, hàng hover `hover:bg-teal-50/30`.
  - Chuẩn hóa các ô input, select và nút thao tác dòng (`Xem | In | Lệnh QR`).
- **Nâng cấp Giao diện Subtabs Đội Xe & Các Hộp Thoại (Modals):**
  - Chuyển 3 subtabs (Xe Đầu Kéo, Rơ-moóc, Tài Xế) sang chuẩn khung `bg-slate-100 p-1.5 rounded-xl border border-slate-200` với tab active nền trắng nổi bật.
  - Đồng bộ header các modal (`Thêm Xe/Tài`, `Nhập Excel`, `Lệnh QR Tài Xế`, `Chi Tiết Chuyến`) sang chuẩn gradient GSS `from-teal-800 to-teal-950` bo góc lớn `rounded-2xl`.
- **Tối ưu Công thái học Thao tác Chuột (Fitts's Law) trên Thanh Công Cụ Container Lệnh Điều Động:**
  - Hoán đổi vị trí trực quan giữa hai cụm công cụ trong cả màn hình view toàn trang (iew_dispatch_order.html) và hộp thoại (modal_dispatch_order.html):
    + **Bên TRÁI (cạnh cột Checkbox chọn Container):** Đặt cụm thao tác hàng loạt gồm [Đã chọn: X cont], dropdown [Chọn Nhà xe phụ trách], nút [✓ Giao Cho Nhà Xe] và nút [✕ Hủy Giao]. Giúp người dùng ngay sau khi tick chọn các container ở góc trái bảng có thể thực hiện gán/hủy xe tức thì tại cự ly chuột gần nhất, giảm tối đa quãng đường di chuyển con trỏ chuột.
    + **Bên PHẢI:** Chuyển cụm tra cứu gồm ô tìm kiếm [Tìm số cont, seal, xe...], dropdown bộ lọc trạng thái [Tất cả trạng thái (10)] và nhãn đếm [Đã nạp X container] sang lề phải bảng dữ liệu, tạo phân định thị giác rõ ràng giữa nhóm hành động (action group) và nhóm tra cứu (filter group).

- **Đồng bộ Công thái học Fitts's Law cho Bảng Gán Nhà Xe bên Booking (`view_booking_detail.html`):**
  - Hợp nhất 2 hàng công cụ rời rạc (`#fullpage-cont-bulk-bar` và `#fullpage-cont-filter-bar`) thành 1 thanh Toolbar duy nhất tiết kiệm không gian:
    + **Bên TRÁI (cạnh cột Checkbox `#check-all-booking-conts`):** Nhóm hành động gồm `[Đã chọn: X cont]`, dropdown `[-- Chọn Nhà xe đối tác (Vendor) --]`, nút `[✓ Giao Cho Nhà Xe]` và nút `[✕ Hủy Giao]`.
    + **Bên PHẢI:** Nhóm tra cứu gồm ô tìm kiếm `[Tìm số cont, seal...]`, bộ lọc `[Tất cả trạng thái (10)]`, dropdown `[Sắp xếp]`, badge `[Hiển thị: 0/0]` và nút `[Đặt lại]`.
- **Sửa Lỗi Triệt Để & Nâng Cấp Nút "Toàn Màn Hình" Bảng Container (Booking & Điều Độ):**
  - Bổ sung `id="mdo-modal-containers-table-wrapper"` bị thiếu trong `modal_dispatch_order.html`, khắc phục lỗi bảng không mở rộng chiều cao khi bấm Toàn Màn Hình trong popup.
  - Nâng cấp `toggleMdoContainersTableExpand` và `toggleFullscreenContainersTable` lên lớp phủ `z-[80]` (vượt qua z-index topbar `z-40` và modal cha `z-50`), tự động bung trọn màn hình `max-h-[calc(100vh-210px)]` và khôi phục chính xác `max-h-80` hoặc `max-h-[500px]` / `max-h-[640px]` khi thu gọn.

- **Sửa Lỗi Định Dạng Trọng Lượng VGM (Bỏ 2 Số Thập Phân Kèm Chuẩn Hóa Parse Số Nguyên Kg):**
  - Khắc phục lỗi hiển thị VGM bị phóng đại 100 lần (ví dụ: `24.500 kg` bị hiển thị thành `2.450.000 kg`):
    + **Nguyên nhân:** Quá trình import và cập nhật trước đây ép kiểu qua định dạng tiền tệ / 2 số thập phân (`.00`), dẫn đến chuỗi `"24500.00"`. Khi đưa vào hàm `formatNumberVN` dùng regex `\D` xóa mất dấu chấm thập phân `.`, ghép 2 số 0 đuôi vào phần nguyên (`2450000`).
    + **Xử lý Backend:** Bỏ định dạng 2 số thập phân khi import Excel/text và khi cập nhật container. Chuẩn hóa parse regex thông minh: tự động nhận diện và gỡ dấu phân cách hàng ngàn kiểu Việt Nam (`24.500` hoặc `24,500`), loại bỏ đuôi `.00`/`.0`, lưu và serialize đúng giá trị số nguyên kg nhập vào (`24500`).
    + **Xử lý Frontend:** Bổ sung hàm chuyên dụng `formatVgmKg(val)` và tối ưu `formatNumberVN(val)`: loại bỏ đuôi `.00`, xử lý đúng số float/decimal, format chuẩn quốc tế `24.500 kg` ở cả màn hình Booking, Lệnh Điều Động và Cổng Nhà Xe.

- **Kiểm thử & Xác thực hệ thống:**
  - Build lại `static/css/tailwind.css` và `static/js/app.js` khớp 100% mã nguồn.
  - Chạy toàn bộ bộ kiểm thử tự động `python scripts/qa.py verify`: 7/7 bước ĐẠT (PASS=7, FAIL=0, test `apps.gss apps.dispatch apps.billing` xanh 100%).

## 2026-11-13 (Cập nhật 18) – Cho Phép Điều Độ Nhà Xe Mở Chuyến & Cập Nhật Tiến Trình Chặng Giúp Tài Xế
- **Tính năng Điều độ hỗ trợ tài xế trong Cổng Vendor (Vendor Portal & Theo dõi hành trình):**
  - Trong Modal Chi tiết dòng xe / Chuyến xe (`modal-vendor-row-view`), Điều độ của Vendor được cấp quyền mở chuyến và trực tiếp cập nhật trạng thái tiến trình chặng kế tiếp thay cho tài xế (khi tài xế đang lái xe, mất sóng hoặc chưa kịp thao tác trên điện thoại).
  - Bổ sung **Action Box "Điều Độ Hỗ Trợ Tài Xế"** ngay dưới thanh tiến trình 7 chặng với nút bấm nổi bật: **[Cập Nhật Mốc: [Tên chặng] ([X]/7)]** kèm xác nhận an toàn trước khi chuyển bước.
  - Trên thanh 7 chặng (`renderStepBar`), chặng kế tiếp có chỉ báo tương tác trực quan (viền nét đứt màu teal, nút "Bấm cập nhật") cho phép Điều độ nhấp chuột trực tiếp để chuyển bước.
- **Backend APIs & Workflow Transition:**
  - Bổ sung 2 endpoint chuyên dụng:
    + `POST /api/vendor/portal/allocations/<alloc_id>/step/` (`VendorWorkspaceStepAPIView`) cho phiên đăng nhập tài khoản nhà xe.
    + `POST /api/vendor/<token>/step/` (`VendorPortalStepAPIView`) cho liên kết bảo mật token của nhà xe.
  - Nâng cấp máy trạng thái `apps/dispatch/gss_workflow.py`: Bổ sung cờ `by_vendor=True`, cho phép Điều độ Nhà xe cập nhật chặng tiến tuần tự, tự động ghi nhận nhật ký `TrackingEventLog` với người thao tác `Điều độ nhà xe` và tự động kích hoạt đồng bộ timeline 10 bước `sync_trip_10_step_timeline`.
  - Bổ sung kiểm thử đơn vị `test_vendor_dispatcher_can_advance_step_for_driver` trong `apps/dispatch/test_gss.py` đảm bảo độ tin cậy và không hồi quy.

## 2026-11-13 (Cập nhật 17) – Khóa Bất Biến Hành Trình Xe: Cấm Sửa / Xóa / Hủy Gán Container & Chuyến Xe Đang Chạy, Cấm Lùi Bước Nghiệp Vụ
- **Cấm chuyển trạng thái lùi bước (Backward State Transition):**
  - Trong máy trạng thái điều vận (`apps/dispatch/gss_workflow.py`), tuyệt đối cấm mọi hành vi chuyển trạng thái lùi về bước trước (`ti < ci`). Hành trình vận chuyển hàng hóa là bất biến và chỉ được phép tiến tuần tự theo thời gian thực.
  - Chuyến xe chỉ được hủy khi còn ở trạng thái `READY` (chưa xuất phát đến nơi nhận cont).
- **Khóa bảo vệ toàn diện đối với Container & Chuyến xe đã chạy thực tế (`ARRIVED_AT_PICKUP` trở đi):**
  - **Khóa gán xe & đổi nhà xe:** Ẩn hoàn toàn nút "Bỏ Gán", thay bằng badge trạng thái `Đang chạy (Đã khóa)`. Dropdown đổi nhà xe chuyển sang dạng nhãn cố định có icon khóa.
  - **Khóa chọn hàng loạt:** Vô hiệu hóa checkbox (`disabled`) đối với các container đang chạy trên đường, tự động lọc bỏ khi bấm "Chọn tất cả" hoặc khi thực hiện thao tác hàng loạt.
  - **Cảnh báo xác nhận an toàn khi ở trạng thái `READY`:** Khi container đã phát lệnh điều độ nhưng xe chưa chạy thực tế, hệ thống bật popup xác nhận cảnh báo hủy lệnh điều độ trước khi cho phép bỏ gán hoặc chuyển đổi nhà xe.
  - **Cấm xóa mềm/hủy chuyến xe:** Chặn mọi thao tác xóa/hủy chuyến xe điều độ tại cả API backend (`TripDetailAPIView.delete`) và giao diện frontend (`trip-actions.js`) khi chuyến xe đã phát sinh hành trình thực tế.
  - **Cấm xóa container khỏi đơn hàng:** Chặn thao tác xóa container (`remove_container`, `ContainerDetailAPI.patch`, `containers.js`) khi container đã có chuyến xe đang/đã chạy trên đường.
- **Đồng bộ mã nguồn & Kiểm thử:**
  - Build đầy đủ và đồng bộ `static/js/app.js` và `static/css/tailwind.css`.
  - Toàn bộ 55/55 test case backend và QA verify đều vượt qua 100%.
  - Đã commit và push đồng bộ lên kho GitHub: `https://github.com/hongsonphan/GSS_LOGISTICs`.

## 2026-11-13 (Cập nhật 16) – Xóa Nút Tạo Lệnh Khỏi Tab Theo Dõi Hành Trình & Nổi Bật Chữ GPX Xanh Bold Kèm Biển Số Cỡ Lớn
- **Tối ưu luồng nghiệp vụ tạo lệnh:**
  - Loại bỏ hoàn toàn nút **[+ Lập Lệnh Điều Động]** khỏi Tab 3 (**THEO DÕI HÀNH TRÌNH** - #dispatch-trips-view).
  - Đảm bảo quy tắc nghiệp vụ: Chỉ cho phép tạo lệnh tại **Tab 1: LỆNH ĐIỀU ĐỘ** ([iew_dispatch.html](file:///e:/Bim_Logisstic_GSS/templates/views/view_dispatch.html)).
- **Nâng cấp nhận diện Logo GPX & Biển số xe trên thùng Container:**
  - Chữ **GPX**: Được tô màu xanh ngọc thương hiệu (#0d9488), in siêu đậm (ont-weight: 900), cỡ chữ tăng lên 16px nổi bật rõ rệt hơn hẳn biển số.
  - **Biển số xe**: Tăng kích cỡ chữ lên 15.5px, in đậm ont-weight: 900 (#0f172a), font monospace chuẩn công nghiệp.
  - Kích thước đồ họa xe mở rộng lên 144x48, chữ và logo hiển thị to rõ, sắc sảo và cân đối tuyệt đối trên timeline.
- **Kiểm thử trực quan Playwright:**
  - Xác nhận nút lập lệnh đã biến mất khỏi Tab 3: dispatch_tab3_no_create_button.png.
  - Xác nhận xe container hiển thị chữ GPX xanh nổi bật và biển số to rõ: 	ruck_gpx_green_large.png.

## 2026-11-13 (Cập nhật 15) – Tinh Gọn Nhãn Lộ Trình Timeline Xe (Bỏ Badge) & Tăng Cỡ Chữ Số Container
- **Tăng kích thước Số Container (conts):**
  - Tăng cỡ chữ lên 14.5px, in siêu đậm (ont-weight: 900, letter-spacing: .4px, màu đen tuyền #0f172a), giúp người điều vận dễ dàng rà soát số cont nhanh chóng mà không bị mỏi mắt.
- **Tinh gọn nhãn từng dòng Timeline xe:**
  - Loại bỏ hoàn toàn các khung badge và chữ tiền tố rườm rà NƠI NHẬN, NƠI GIAO, NƠI HẠ RỖNG trên từng dòng chạy của xe.
  - Hiển thị trực tiếp tên địa điểm (CẢNG CÁT LÁI, KHO NHÀ MÁY ĐẮK NÔNG, DEPOT TÂN CẢNG LONG BÌNH) với màu sắc nhận diện sắc nét (xanh teal, xanh dương, tím).
  - Tối ưu lại chiều cao dòng (height: 68px) và đường line (	op: 40px), giúp giao diện thoáng đãng, xe di chuyển thanh thoát.
- **Kiểm thử trực quan & Tự động triển khai:**
  - Tái khởi động container gss_logistics_web trên cổng 8086.
  - Xác nhận trực quan qua Playwright screenshot: leet_timeline_clean_labels.png.

## 2026-11-13 (Cập nhật 14) – Đồng Bộ Style Thanh Tab Điều Vận Theo Chuẩn Tab Booking & Chuẩn Hóa Tên Tab
- **Đồng bộ hóa 100% Style giao diện với Tab Booking / Kinh Doanh:**
  - Khung bao ngoài: Bo góc lớn 
ounded-2xl, nền trắng g-white, viền nhẹ order border-slate-200, đổ bóng mềm shadow-xs, tối thiểu chiều cao min-h-[56px].
  - Nút Tab Active: Cố định h-10 px-4 rounded-xl, viền đôi màu tím indigo order-2 border-indigo-600, nền sáng g-indigo-50/70, chữ đậm 	ext-indigo-900 font-bold font-heading, icon tương ứng 	ext-indigo-600.
  - Nút Tab Inactive: order-2 border-transparent bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200, icon 	ext-slate-500.
- **Chuẩn hóa tên chính xác từng tab theo yêu cầu người dùng:**
  - Tab 1: **LỆNH ĐIỀU ĐỘ** (icon ph-newspaper).
  - Tab 2: **PHÂN BỔ & GÁN XE** (icon ph-stack).
  - Tab 3: **THEO DÕI HÀNH TRÌNH** (icon ph-navigation-arrow).
  - Loại bỏ hoàn toàn số thứ tự, tiền tố, hậu tố trong thẻ hiển thị nhãn tab, đảm bảo tính tối giản, chuyên nghiệp và đồng nhất.
- **Visual Verification qua Playwright:**
  - Chụp ảnh kiểm thử thực tế cả 3 tab khi kích hoạt chuyển đổi: dispatch_tab1_lenh_dieu_do.png, dispatch_tab2_phan_bo_gan_xe.png, dispatch_tab3_theo_doi_hanh_trinh.png.

## 2026-11-13 (Cập nhật 13) – Nâng Cấp Giao Diện Giám Sát Hành Trình Xe Container (Bỏ Chữ T Ngược, Biển Số In Đậm Logo GPX & Nổi Bật 3 Node Điểm Đến)
- **Thiết kế lại đồ họa Xe Container (SVG):**
  - **Loại bỏ hoàn toàn chữ T ngược (⊥):** Xóa bỏ thanh chân chống cơ khí thừa ở giữa rơ-moóc (	ruck.js), gầm xe thanh thoát, liền mạch với hệ thống trục bánh xe thực tế.
  - **Biển số xe in đậm to rõ & Logo Công ty GPX:**
    + Bổ sung khung biển số dập nổi trên thùng container (#f8fafc viền #0f172a), font ui-monospace siêu đậm (ont-weight: 900).
    + Tự động chuẩn hóa tiền tố thương hiệu **GPX** và cấu trúc biển số xe Việt Nam: ví dụ 51C-12345 ➔ **GPX 51C - 123.45**, 51C-234.56 ➔ **GPX 51C - 234.56**, 59C76865 ➔ **GPX 59C - 768.65** đúng theo quy chuẩn hài hòa.
- **Nổi bật trực quan 3 Điểm Node Lộ Trình (NƠI NHẬN | NƠI GIAO | NƠI HẠ RỖNG):**
  - Khắc phục triệt để tình trạng nhãn bị xám mờ (off / #cbd5e1) khi xe chưa đến: Cả 3 điểm node luôn giữ vững nhận diện màu sắc đặc trưng, không bao giờ bị mờ tịt.
  - **1. NƠI NHẬN (Cảng lấy cont / nhận hàng):** Huy hiệu xanh Teal / Emerald (#0f766e trên nền #ccfbf1), chấm định vị teal viền kép trên timeline.
  - **2. NƠI GIAO (Kho nhà máy / giao hàng):** Huy hiệu xanh dương Royal (#1d4ed8 trên nền #dbeafe), chấm định vị xanh dương viền kép.
  - **3. NƠI HẠ RỖNG (Depot hạ vỏ rỗng / trả cont):** Huy hiệu tím phong cách chuyên nghiệp (#7e22ce trên nền #f3e8ff), chấm định vị tím viền kép.
  - Mở rộng không gian hiển thị (padding-top: 36px, height: 84px, nhãn tên max-width: 210px) giúp tên cảng/kho/depot dài hiển thị trọn vẹn, không bị cắt chữ.
  - Header tiến trình đồng bộ các mốc quan trọng: ★ NƠI NHẬN, ★ NƠI GIAO, ★ NƠI HẠ RỖNG.
- **Kiểm thử trực quan (Visual Testing via Playwright):**
  - Đã chụp ảnh xác thực thực tế leet_timeline_verified.png: Xe chạy mượt mà, gầm xe không còn chữ T ngược, biển số GPX in đậm sắc nét, 3 điểm node hiển thị màu sắc rực rỡ, phân định rõ ràng.

## 2026-11-13 (Cập nhật 12) – Tối Ưu Quản Trị Chuỗi Cung Ứng Container 3 Cấp (BK ➔ LDD ➔ VC) & Triển Khai 3 Tab Điều Vận Chuyên Sâu
- **Chuẩn hóa cấu trúc 3 Tab Điều Vận chuẩn mực ngành Vận tải Container:**
  - **Tab 1: `1. Kế Hoạch Lệnh Điều Độ (Theo B/L)`:**
    + Phân định rõ 2 nhóm: **Booking Chờ Điều** mang mã **`BK.yyMM.xxx`** (ví dụ `BK.2611.002`, huy hiệu vàng `CHỜ ĐIỀU ĐỘ`, tiến độ chưa phân bổ) và **Lệnh Đã Điều** mang mã **`LDD.BK.yyMM.xxx`** (ví dụ `LDD.BK.2611.001`, huy hiệu xanh `ĐÃ ĐIỀU ĐỘ`, tiến độ chia cont 100%).
    + Thanh lọc nhanh 3 chế độ: `Tất cả` | `Chờ điều (BK...)` | `Đã điều (LDD...)`.
  - **Tab 2: `2. Vendor Phân Bổ & Gán Xe (Từng Cont)` (TAB MỚI):**
    + Quản lý trực tiếp theo **từng Container cụ thể**: giải quyết bài toán cốt lõi: *Cont nào, giao cho Nhà xe nào, Nhà xe đã gán xe/tài xế chưa, các xe đã chạy hay chưa*.
    + Thanh KPI Mini trực quan đếm tức thì: Tổng Cont, Chưa giao Vendor (🔴), Chờ Vendor gán xe (🟡), Đã gán xe sẵn sàng (🔵), Đang trên tuyến (🟢), Đã hoàn thành (⚪).
    + Hiển thị đầy đủ: Số Cont & Quy cách, Lệnh LDD/Khách hàng, Nhà xe phụ trách (Vendor), Mã Phiếu Vận Chuyển (`VC.yyMM.xxx` nếu đã gán xe, hoặc `Chưa gán xe`), Đầu kéo & Rơ-moóc, Tài xế & SĐT (bấm gọi trực tiếp), Tình trạng vận hành, Hạn DEM/DET.
    + Tích hợp nút **`[Nhắc Zalo]`**: Tự động soạn và copy thông điệp gửi điều hành nhà xe đối tác kèm đường link Cổng Khai Báo trực tiếp.
  - **Tab 3: `3. Theo Dõi Xe Đang Chạy (Phiếu VC)`:**
    + Tập trung giám sát các chuyến xe đang lăn bánh thực tế trên đường, theo dõi tiến độ các chặng nhận - giao - hạ theo danh sách **Phiếu Vận Chuyển (`VC.yyMM.xxx`)**.
- **Chuẩn hóa Hệ Thống Mã Phiếu & Backend API:**
  - Chuyển đổi mã chuyến xe nội bộ và đối tác sang tiếp đầu ngữ **`VC.yyMM.xxx`** (Phiếu Vận Chuyển Chuyến - ví dụ `VC.2611.001`, `VC.2611.003`...).
  - Xây dựng API mới: `GET /api/dispatch/vendor-containers/` ([`vendor.py`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/api_views/vendor.py)) hỗ trợ bộ lọc đa chiều (`vendor_id`, `status`, `q`), tích hợp kiểm toán phân quyền `IsDispatcher`.
  - Nâng cấp `BookingActiveAPIView` ([`sales.py`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/api_views/sales.py)) tính toán cờ `allocated_containers` và `is_fully_dispatched`.
- **Kiểm thử tự động & Visual Verification:**
  - 25/25 test cases trong `test_vendor` pass 100%.
  - Playwright visual testing chụp ảnh thực tế cả 3 tab: `dispatch_tab1_orders.png`, `dispatch_tab2_vendor_containers.png`, `dispatch_tab3_trips_vc.png`.

## 2026-11-13 (Cập nhật 11) – Vá Định Tuyến SPA Lệnh Điều Động & Chặn Tuyệt Đối Lỗ Hổng Lộ Link / URLconf Nội Bộ (CWE-200 Information Disclosure)
- **Vá triệt để lỗi 404 cho Deep-link Lệnh Điều Động:**
  - Bổ sung các routes định tuyến SPA vào [`config/urls.py`](file:///e:/Bim_Logisstic_GSS/config/urls.py): `dispatch/orders/<str:order_id>/`, `dispatch/orders/<str:order_id>`, `dispatch/orders/`, `dispatch/orders` trỏ về `index_view`.
  - Giúp người dùng khi truy cập trực tiếp từ link, click thông báo hoặc F5 tại trang chi tiết Lệnh Điều Động (ví dụ: `/dispatch/orders/13`) được tải trơn tru, khớp với router client-side trong [`app.js`](file:///e:/Bim_Logisstic_GSS/static/js/app.js) để tự động mở tab Điều vận và popup lệnh điều động tương ứng.
- **Triển khai cơ chế Bảo mật Chống Lộ Lọt Thông Tin Cấu Trúc Hệ Thống (Anti-Information Disclosure):**
  - Xây dựng `custom_404_view` và `custom_500_view` tại [`core/exceptions.py`](file:///e:/Bim_Logisstic_GSS/core/exceptions.py): phân tích Header yêu cầu, tự động trả JSON chuẩn cho các cuộc gọi API (`NOT_FOUND`, `INTERNAL_SERVER_ERROR`) và render giao diện chuẩn hóa [`templates/404.html`](file:///e:/Bim_Logisstic_GSS/templates/404.html) cho trình duyệt web.
  - Khai báo `handler404` và `handler500` chính thức trong `config/urls.py`.
  - Bổ sung lớp phòng thủ bắt lỗi cuối cùng `re_path(r'^.*$', custom_404_view, name='catchall-404')` tại cuối danh sách `urlpatterns`: Ngăn chặn hoàn toàn cơ chế mặc định của Django in toàn bộ 70+ URL patterns, endpoints API, đường dẫn admin ra màn hình vàng kỹ thuật ngay cả khi cờ `DEBUG = True` được bật.
- **Kiểm thử tự động & Visual Testing:**
  - Kiểm thử Playwright chụp màn hình thực tế xác nhận: Truy cập URL sai lập tức chuyển sang trang 404 GSS thương hiệu bảo mật cao; truy cập `/dispatch/orders/13` hoạt động bình thường và an toàn.


## 2026-11-13 (Cập nhật 10) – Nâng Cấp Toàn Diện Hồ Sơ "Đội Xe & Tài Xế" Cổng Nhà Xe (3 Tab Phân Loại, List Từng Dòng Chuẩn UI/UX, Kê Khai Chi Tiết + Sửa/Xóa)
- **Tối ưu hóa hiển thị 3 Tab chuyên biệt:**
  - Thay thế bố cục lưới 3 cột hẹp cũ bằng thanh chuyển **3 Tab độc lập, rộng rãi**: **`[Xe Đầu Kéo]`**, **`[Rơ-moóc]`**, **`[Tài Xế]`**, kèm biểu tượng và huy hiệu số lượng động.
  - Mỗi tab trình bày danh sách dạng **Bảng dữ liệu toàn màn hình (Full-width Data Table)** theo từng dòng chuẩn UI/UX TMS quốc tế, phân cấp thông tin rõ ràng, hiệu ứng hover mượt mà.
  - Ô tìm kiếm nhanh tự động thích ứng theo từng tab, kèm nút **`[+ Thêm]`** theo ngữ cảnh tương ứng.
- **Kê khai chi tiết thông tin từng loại phương tiện & nhân sự:**
  - **Tài xế (`SubcontractorDriver`):** Bổ sung các trường chuyên sâu: Ảnh đại diện/chân dung (`avatar_url`), Số CCCD/CMND 12 số (`citizen_id`), Tuổi (`age`), Ngày sinh (`date_of_birth`), Hạng bằng lái (`license_class` FC/FE/C...), Số bằng lái GPLX (`license_number`), Số năm kinh nghiệm (`experience_years`), Trạng thái hoạt động (`status`), Ghi chú (`notes`).
  - **Xe đầu kéo (`Vehicle`):** Mở rộng hiển thị và quản lý đầy đủ: Biển số xe, Hãng/Nhãn hiệu xe (`brand`: Freightliner, Howo, Hino...), Tải trọng kéo theo cho phép (`payload_capacity_kg`), Hạn đăng kiểm định kỳ (`registration_expiry`), Lịch bảo dưỡng tiếp theo (`next_maintenance_date`), Trạng thái hoạt động (`status`: Sẵn sàng chạy / Đang bảo dưỡng / Nằm bãi), Ghi chú (`notes`).
  - **Rơ-moóc (`SubcontractorTrailer`):** Mở rộng quản lý: Biển số moóc, Quy cách/Loại moóc (`trailer_type`: Moóc Xương 40ft, Sàn 40ft, Cổ cò...), Hãng sản xuất (`brand`: Tân Thanh, CIMC...), Tải trọng cho phép (`payload_capacity_kg`), Hạn đăng kiểm (`registration_expiry`), Lịch bảo dưỡng (`next_maintenance_date`), Trạng thái (`status`), Ghi chú (`notes`).
- **Bổ sung tính năng SỬA & XÓA trực quan:**
  - Từng dòng trong danh mục trên Cổng Nhà Xe ([`vendor_portal.html`](file:///e:/Bim_Logisstic_GSS/templates/vendor_portal.html)) đều trang bị đầy đủ nút **`[Sửa]`** (mở modal điền sẵn dữ liệu cũ để cập nhật) và nút **`[Xóa]`** (cảnh báo xác nhận an toàn trước khi xóa).
  - Modal Thêm/Sửa tự động thích ứng chế độ (`quickAddMode = 'add' | 'edit'`), hỗ trợ xem trước ảnh đại diện (avatar preview), lọc tìm kiếm đa năng theo biển số/hãng xe/tên tài xế/CCCD/GPLX/SĐT.
- **Backend API & Database Migrations:**
  - Tạo migrations `master_data.0005_subcontractordriver_age_and_more` và `fleet.0003_vehicle_notes`.
  - Nâng cấp API Catalog trên cả 2 kênh token link và session workspace ([`vendor.py`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/api_views/vendor.py), [`vendor_service.py`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/vendor_service.py)) hỗ trợ đầy đủ các phương thức `POST`, `PUT`, `DELETE` với cơ chế soft-delete an toàn và bảo toàn 100% tương thích ngược.
  - Bổ sung kiểm thử tự động `test_catalog_update_and_delete` trong [`VendorPortalTests`](file:///e:/Bim_Logisstic_GSS/apps/gss/tests.py) đạt chuẩn 100% test pass.

## 2026-11-12 (Cập nhật 9) – Tinh Gọn Lệnh Điều Động (Chuẩn LDD.BK, Loại Bỏ Bảng Quota Thừa, Thẻ Link Cổng Nhà Xe Trực Quan, Sửa Nhà Xe Từng Dòng & Mở Rộng Bảng)
- **Chuẩn hóa Mã Lệnh:**
  - Đồng bộ hiển thị mã lệnh tiền tố `LDD.` (ví dụ: `LDD.BK.2611.001`) trên danh sách Lệnh Điều Động (`#dispatch-orders-tbody`) và trên đầu trang chi tiết Lệnh Điều Động ([`dispatch-order-modal.js`](file:///e:/Bim_Logisstic_GSS/static/js/src/app/dispatch/dispatch-order-modal.js)).
- **Loại bỏ bảng Quota thừa & Thay bằng Thẻ Nhà Xe + Link Cổng Nhà Xe:**
  - Thay thế bảng phân bổ hạn mức thủ công (Section 2 cũ) bằng khối **Các Nhà Xe Được Phân Bổ & Cổng Khai Báo (Vendor Portal)** ([`view_dispatch_order.html`](file:///e:/Bim_Logisstic_GSS/templates/views/view_dispatch_order.html)).
  - Tự động hiển thị thẻ của từng Nhà xe đang phụ trách container (`Hoàng Nam`, `Thành Đạt`...) kèm tiến độ gán xe và 3 nút thao tác trực quan: **`[Mở Cổng Nhà Xe]`** (màu teal nổi bật, mở tab riêng), **`[Copy Link]`** (sao chép link token gửi Zalo), **`[In Phiếu]`** (phiếu điều xe riêng).
- **Cải tiến Bảng Danh Sách Container của B/L:**
  - Bổ sung nút **`[Mở Rộng Bảng]` / `[Thu Gọn Bảng]`** (`toggleMdoContainersTableExpand`) để phóng to bảng toàn màn hình, hỗ trợ thao tác dễ dàng trên các lô lớn 10 - 100 container.
  - Cho phép sửa/đổi Nhà xe trực tiếp ngay trên từng dòng container qua thẻ `<select>` (`mdoChangeSingleContainerVendor`), kèm nút **`[Bỏ Gán]`** (`mdoUnassignSingleContainer`) giúp hủy phân bổ ngay lập tức từng cont mà không cần thao tác phức tạp.
  - Sửa nút **Lưu & Phát Lệnh**: phát hành lệnh trực tiếp dựa trên các container đã phân bổ, hiển thị hộp link kết quả và loại bỏ lỗi chặn chọn nhà xe thủ công.

## 2026-11-12 (Cập nhật 8) – Chuẩn Hoá Triển Khai GitHub & Máy Chủ VPS Production
- **Tài liệu & Cấu hình:**
  - Bổ sung tài liệu đặc tả triển khai chi tiết [`15-deployment-guide.md`](15-deployment-guide.md) tích hợp quy trình A-Z đưa code lên GitHub và cấu hình VPS Ubuntu + Docker + Nginx SSL.
  - Cập nhật [`docs/README.md`](README.md) đồng bộ chỉ mục tài liệu vận hành.
  - Cập nhật [`.env.example`](../.env.example) bổ sung các biến cấu hình Production: `SITE_URL`, `HASHIDS_SALT`.
  - Cập nhật [`.gitignore`](../.gitignore) bảo đảm an toàn dữ liệu và loại bỏ các file phát sinh cục bộ.

## 2026-11-12 (Cập nhật 7) – Hoàn Thiện 4 Giai Đoạn Cốt Lõi (Ghép Cont 2x20', Tra Cứu & Đối Soát B/L, Tự Động Phiếu Giao Hàng, OCR Fallback & Offline Queue)
- **Giai đoạn 1 – Ghép cont `2x20'` & Tra cứu / Đối soát theo MBL/HBL:**
  - Nâng cấp [`submit_rows`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/vendor_service.py) (`_sync_paired_20_trips`) và [`vendor_portal.html`](file:///e:/Bim_Logisstic_GSS/templates/vendor_portal.html) (`showPair20Options`) để liên kết cặp 2 cont 20ft chạy chung đầu kéo thành `is_twin_container=True`, `container_number_2`, đồng bộ bảng `TripContainer`; đồng thời hiển thị 2 dòng gọn gàng trên lưới [`bl.js`](file:///e:/Bim_Logisstic_GSS/static/js/gss/bl.js), [`console.js`](file:///e:/Bim_Logisstic_GSS/static/js/gss/console.js) và Vendor Portal.
  - Bổ sung tìm kiếm & lọc trực tiếp theo `mbl_number`, `hbl_number`, `container_number_2` trong [`gss_search.py`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/gss_search.py), [`gss_settlement.py`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/gss_settlement.py) (`?bl=...`), [`statements.py`](file:///e:/Bim_Logisstic_GSS/apps/gss/statements.py) và [`api.py`](file:///e:/Bim_Logisstic_GSS/apps/gss/api.py).
- **Giai đoạn 2 – Tự động sinh Phiếu giao hàng & Siết bảo mật Vendor:**
  - Thêm [`auto_delivery_note_for_trip`](file:///e:/Bim_Logisstic_GSS/apps/gss/journey.py) và kích hoạt tự động trong [`gss_workflow.py`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/gss_workflow.py) khi chuyến đạt `UNLOADED` hoặc `EMPTY_RETURNED` (idempotent, bám `PodTemplate` của khách hàng).
  - Bổ sung cờ cấu hình `VENDOR_PORTAL_STRICT_3FACTOR` trong `subcontractor_requires_portal_auth` ([`vendor_service.py`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/vendor_service.py)) để ép xác thực 3 lớp cho mọi nhà xe khi bật chế độ production nghiêm ngặt.
- **Giai đoạn 3 – Kiến trúc OCR Hóa đơn Nâng/Hạ (Plug-and-play + Fallback nhập tay):**
  - Tạo module độc lập [`ocr.py`](file:///e:/Bim_Logisstic_GSS/apps/gss/ocr.py) (`is_ocr_configured`, `extract_invoice_from_image`, `fetch_einvoice_files`) và endpoint `GET/POST /api/gss/invoices/ocr/` ([`InvoiceOcrPreviewAPI`](file:///e:/Bim_Logisstic_GSS/apps/gss/api.py), [`urls.py`](file:///e:/Bim_Logisstic_GSS/apps/gss/urls.py)), tích hợp nút `Đọc ảnh OCR` vào form gắn hóa đơn trong [`finance.js`](file:///e:/Bim_Logisstic_GSS/static/js/gss/finance.js) (khi chưa cấu hình OCR vẫn nhập tay bình thường).
- **Giai đoạn 4 – Chuẩn hóa cây lưu trữ `/Storage/...` & Hàng đợi ngoại tuyến (Offline Queue):**
  - Bổ sung [`storage_rel_path`](file:///e:/Bim_Logisstic_GSS/apps/gss/docs.py) và cập nhật [`gss_attachments.py`](file:///e:/Bim_Logisstic_GSS/apps/dispatch/gss_attachments.py) lưu ảnh đã đóng dấu timemark vào `Storage/[Nam_Thang]/[So_BL]/[So_Cont]/Chung_Tu_Hanh_Trinh/...` theo chuẩn tên file quốc tế.
  - Tạo [`offline_queue.js`](file:///e:/Bim_Logisstic_GSS/static/js/gss/offline_queue.js) (IndexedDB) tích hợp vào [`qr_trip.html`](file:///e:/Bim_Logisstic_GSS/templates/qr_trip.html) & [`qr_trip.js`](file:///e:/Bim_Logisstic_GSS/static/js/gss/qr_trip.js) để tài xế lưu tạm thao tác khi mất sóng và tự đồng bộ khi có mạng.
  - Bổ sung kiểm thử [`WorkflowPhasesTests`](file:///e:/Bim_Logisstic_GSS/apps/gss/tests.py) và đồng bộ Sidebar Contrast Theme chuẩn GSS (`#253147` / `#1a2334` / `#0d9488`) trên Vendor Portal.

## 2026-11-12 (Cập nhật 6) – Cổng Nhà Xe Desktop Chuyên Biệt (Portal 3 Yếu Tố + Theo Dõi Hành Trình 7 Chặng + Tự Động Đăng Xuất)
- **Kiến trúc xác thực & cô lập bảo mật Portal Nhà Xe ([models.py](file:///e:/Bim_Logisstic_GSS/apps/master_data/models.py), `master_data.0004_subcontractorportalaccount`, [vendor_service.py](file:///e:/Bim_Logisstic_GSS/apps/dispatch/vendor_service.py), [vendor.py](file:///e:/Bim_Logisstic_GSS/apps/dispatch/api_views/vendor.py)):**
  - Thêm model [`SubcontractorPortalAccount`](file:///e:/Bim_Logisstic_GSS/apps/master_data/models.py) quản lý tài khoản riêng cho từng nhà xe gồm `username`, mật khẩu băm (`PBKDF2`), mã Token xác nhận băm (`SHA-256`), `idle_timeout_minutes` (mặc định 15 phút), và khóa tạm thời sau 5 lần đăng nhập sai (`failed_attempts`, `locked_until`).
  - Bổ sung bộ API xác thực 3 yếu tố (`Username + Password + Confirm Token hoặc Token lệnh của chính nhà xe`): `GET /api/vendor/auth/status/`, `POST /api/vendor/auth/login/`, `POST /api/vendor/auth/logout/`, `POST /api/vendor/auth/heartbeat/`. Sau khi xác thực qua URL `/vendor/<token>/`, trình duyệt xóa token khỏi thanh địa chỉ (`history.replaceState(..., '/vendor/')`).
  - Cơ chế tự động đăng xuất khi không thao tác (`idle_timeout_minutes`): theo dõi `last_seen` trên `HttpOnly` session cookie phía server; các request polling tự động gắn header `X-Vendor-Passive-Poll: 1` không làm mới `last_seen`.
  - Cô lập tuyệt đối: tài khoản nhà xe không map sang `django.contrib.auth.User`, bị chặn hoàn toàn trên toàn bộ API nội bộ GSS (`401`/`403`) và API dữ liệu nhà xe khác (`403`/`404`), đồng thời ẩn hoàn toàn tên khách hàng, biểu giá và số liệu tài chính khỏi payload `/api/vendor/portal/*`.
- **Workspace Desktop Portal & Theo dõi hành trình 7 chặng ([vendor_portal.html](file:///e:/Bim_Logisstic_GSS/templates/vendor_portal.html), [vendor_views.py](file:///e:/Bim_Logisstic_GSS/apps/dispatch/vendor_views.py), [urls.py](file:///e:/Bim_Logisstic_GSS/config/urls.py)):**
  - Nâng cấp `/vendor/` và `/vendor/<token>/` thành màn hình Desktop Portal 3 tab chuyên biệt: **Gán Xe & Điều Hành** (chuẩn hóa lưới dữ liệu `erp-table tabular-nums` đồng bộ với bảng Booking/Điều độ GSS TMS: font chữ `text-xs` 12px+, thanh tìm kiếm nhanh / lọc trạng thái / sắp xếp 2 chiều theo cột, header cố định `sticky`, phụ lục chuẩn ISO 6346 ở chân bảng), **Theo Dõi Hành Trình** (giao diện 7 mốc ngang kèm icon xe đầu kéo SVG dịch chuyển trực quan theo `%` hành trình giống bảng điều hành trung tâm nhưng ẩn hoàn toàn tên khách hàng & tài chính, kèm bộ lọc/sắp xếp, click vào từng xe để mở chi tiết `TrackingEventLog` và tự làm mới 30s) và **Đội Xe & Tài Xế** (danh mục Đầu kéo, Rơ-moóc, Tài xế + nút `+`).
  - Hiển thị đồng hồ đếm ngược phiên làm việc trên thanh trên cùng và nhật ký kiểm thử đơn vị trong [`VendorPortalTests`](file:///e:/Bim_Logisstic_GSS/apps/gss/tests.py).
- **Quản trị cấp tài khoản nhà xe trong Điều vận ([master.js](file:///e:/Bim_Logisstic_GSS/static/js/gss/master.js)):**
  - Tích hợp panel quản lý tài khoản Portal Nhà Xe (tạo user, đặt/đổi mật khẩu, chỉnh thời gian idle, cấp/xoay vòng Token xác nhận, khóa/mở khóa nhanh) vào chi tiết nhà xe qua `VendorPortalAccountAdminAPIView` (`/api/vendor-portal-accounts/<pk>/`).

## 2026-11-12 (Cập nhật 5)
- **Cổng Nhà Xe (Vendor Portal) — Bắt buộc chọn danh mục theo từng nhà xe (Dropdown + Lưu DB qua nút `+`)**:
  - Thêm model [`SubcontractorTrailer`](file:///e:/Bim_Logisstic_GSS/apps/master_data/models.py) (migration `master_data.0003_subcontractortrailer`) lưu danh mục Rơ-moóc riêng theo từng nhà xe thầu phụ, song hành cùng `Vehicle` (`subcontractor`) và `SubcontractorDriver`.
  - Mở rộng `VendorPortalCatalogAPIView` ([apps/dispatch/api_views/vendor.py](file:///e:/Bim_Logisstic_GSS/apps/dispatch/api_views/vendor.py)) & [apps/dispatch/vendor_service.py](file:///e:/Bim_Logisstic_GSS/apps/dispatch/vendor_service.py) hỗ trợ cả `GET` (tổng hợp danh mục Đầu kéo, Rơ-moóc, Tài xế thuộc riêng `alloc.subcontractor`) và `POST` (`add_vendor_catalog_item` lưu mới ngay vào DB).
  - Chuyển đổi toàn bộ ô gán `Đầu Kéo`, `Rơ-moóc`, `Tài Xế` trên bảng và trong Modal `Xem` ([templates/vendor_portal.html](file:///e:/Bim_Logisstic_GSS/templates/vendor_portal.html)) từ ô nhập tự do sang thẻ `<select>` chuẩn xác; `SĐT Tài Xế` tự động đồng bộ `readonly` theo tài xế được chọn; nút `+` gọi `POST /api/vendor/<token>/catalog/` để lưu DB và tự chọn ngay cho dòng hiện tại.
  - Bổ sung unit test `test_catalog_post_persists_per_vendor_and_isolates` trong [apps/gss/tests.py](file:///e:/Bim_Logisstic_GSS/apps/gss/tests.py).

## 2026-11-12 (Cập nhật 4) – Tinh Gọn Thao Tác Bảng (`Xem | In`) & Modal Chi Tiết (`Sửa ↔ Lưu | Xóa | In`) + Hiển Thị Đúng Trạng Thái Cổng Nhà Xe

- **Cổng Nhà Xe (`templates/vendor_portal.html`, `apps/dispatch/vendor_service.py`):**
  - Bổ sung `step_status` vào `rows_for` trong [vendor_service.py](file:///e:/Bim_Logisstic_GSS/apps/dispatch/vendor_service.py#L276-L285).
  - Thêm helper dùng chung [`getVendorRowStatusInfo`](file:///e:/Bim_Logisstic_GSS/templates/vendor_portal.html#L310-L335) trong [vendor_portal.html](file:///e:/Bim_Logisstic_GSS/templates/vendor_portal.html): cột **Trạng Thái** hiển thị đúng trạng thái thực tế của xe/container kèm icon & màu chuẩn (`Đã Phát lệnh Điều độ`, `Đã đến nơi nhận`, `Đã lên xe (đã nhận cont/hàng)`, `Đã đến nơi giao`, `Đã hạ xe / giao xong`, `Đang đi hạ rỗng`, `Đã hạ rỗng (Hoàn tất)`, `Chờ gán xe`, `Đã nhập xe`), thay vì hiển thị mã phiếu `DV.xxxx.xxx` như trước.
  - Tinh gọn cột **Thao Tác** trên bảng về chuẩn **`Xem | In`**, tận dụng khoảng trống mở rộng ô biển số Đầu kéo (`100px`) / Rơ-moóc (`96px`) / Tài xế (`116px`) / SĐT (`94px`) khỏi bị cắt chữ.
  - Nâng cấp modal `#modal-vendor-row-view` hỗ trợ **Xem → bấm `Sửa` chuyển thành `Lưu` → lưu xong quay lại `Sửa`**, kèm `Xóa`, `In`, `Kẹp 20` và thêm nhanh `+` (`z-[60]`); dòng `Chờ gán xe` mở sẵn chế độ nhập với nút `Lưu`; dòng đã lăn bánh chỉ hiện `In | Đóng`. Đồng bộ [uiux-rules.md](../.agents/rules/uiux-rules.md).

## 2026-11-12 (Cập nhật 3) – Vận Tải 100% Vendor, Đồng Bộ 10 Trạng Thái Container, Sửa Toàn Bộ Lỗi UI/Test & Tách Bộ Rules Backend / UI-UX

- **1. Khẳng định mô hình 100% Vendor & xử lý các lỗi Backend (`apps/dispatch/gss_workflow.py`, `apps/gss/containers.py`, `apps/gss/api.py`, `apps/dispatch/vendor_service.py`, `apps/dispatch/api_views/sales.py`):**
  - Sửa `STEP_LABELS['READY']` từ `'Sẵn sàng'` → **`Đã Phát lệnh Điều độ`**, đồng bộ chuẩn **10 trạng thái Container** (`UNASSIGNED`, `ASSIGNED`, `READY`, 5 bước `IN_TRANSIT`, `EMPTY_RETURNED`, `CANCELLED`) kèm `dispatch_status` / `dispatch_status_label` trong API.
  - Bỏ ràng buộc từ chối biển số "xe nhà" trong `vendor_service._find_or_create_vehicle`; chỉ chặn biển số thuộc nhà xe khác và chuẩn hóa về `VehicleOwnership.SUBCONTRACTOR`.
  - Sửa lookup `trip__driver` thay cho `primary_driver` không tồn tại trên `DispatchTrip`, sửa crash `_raw_token` trong `resize_allocation`, khóa `container_number` theo B/L trên Portal, giữ `container_number` tham chiếu từ chuyến `CANCELLED` cho dòng `moved`, trả `warnings` trong `import_containers`, và khôi phục mặc định `skip_invalid=0` cho import 2 pha.

- **2. Tinh chỉnh UI/UX chuẩn Production & Rebuild Bundle (`templates/views/view_sales.html`, `templates/views/view_quotation_detail.html`, `templates/views/view_booking_detail.html`, `templates/views/view_dispatch_order.html`, `templates/vendor_portal.html`, `static/js/src/app/dispatch/dispatch-order-modal.js`, `static/js/src/app/sales/booking-page/containers.js`):**
  - Loại bỏ toàn bộ pill/badge `rounded-full` bên trong `<td>` theo [10-ui-ux-guidelines.md](10-ui-ux-guidelines.md) (thay bằng văn bản đậm màu + icon Phosphor).
  - Sửa độ tương phản `#mdo-header-status-badge` trên nền sáng (`bg-*-100 text-*-800`), thêm `.btn-keep-solid` cho CTA chính `Lưu & Phát Lệnh`, thu nhỏ `chat_bubble` và chừa khoảng đệm `pb-24`/`sm:pr-20`/`pb-32` tránh che nút footer hoặc dòng cuối Vendor Portal trên cả desktop/mobile.
  - Đồng bộ bộ lọc 10 trạng thái container giữa Booking Detail, Lệnh Điều Động (View/Modal) và Cổng Nhà Xe.

- **3. Tách riêng 2 bộ Quy tắc không chồng chéo cho phát triển Skill ([backend-rules.md](../.agents/rules/backend-rules.md), [uiux-rules.md](../.agents/rules/uiux-rules.md)):**
  - Tổng hợp rule độc lập cho **Backend** (mô hình 100% Vendor, SSOT trạng thái, bảo toàn JSONField `_raw_token`, multi-tenant/soft-delete, test QA DB) và **UI/UX** (token màu, `.btn-keep-solid`, cấm pill trong `<td>`, padding sticky/FAB, đồng bộ trạng thái & kiểm thử thị giác Playwright).

## 2026-11-12 (Cập nhật 2) – Chuẩn Hóa Trạng Thái Container, Bộ Lọc Tìm Kiếm & Bộ Nút Từng Dòng (`Xem | Sửa | Lưu | In | Xóa`) Cổng Nhà Xe

- **1. Chuẩn hóa Trạng thái Container & Bộ lọc Lệnh Điều Động ([dispatch-order-modal.js](file:///e:/Bim_Logisstic_GSS/static/js/src/app/dispatch/dispatch-order-modal.js), [view_dispatch_order.html](file:///e:/Bim_Logisstic_GSS/templates/views/view_dispatch_order.html), [containers.js](file:///e:/Bim_Logisstic_GSS/static/js/src/app/sales/booking-page/containers.js)):**
  - Chuyển nhãn trạng thái `Sẵn sàng` (khi chuyến `READY` đã sinh) sang **`Đã Phát lệnh Điều độ`** và nhãn `Đã gán xe & tài` sang **`Đã giao cho Nhà xe`**.
  - Bổ sung hàm `mdoGetContainerStatusInfo` và mở rộng dropdown `#mdo-cont-filter-status` với đầy đủ các trạng thái nghiệp vụ: `Chưa phân bổ`, `Đã giao cho Nhà xe (Tất cả)`, `Chờ Vendor gán xe`, `Đã giao Nhà xe (Đã có xe dự kiến)`, `Đã Phát lệnh Điều độ`, `Đang vận chuyển` (và từng chặng chi tiết: `Đã đến nơi nhận`, `Đã lên xe nhận cont/hàng`, `Đã đến nơi giao`, `Đã hạ xe / giao xong`, `Đang đi hạ rỗng`), `Đã hạ rỗng (Hoàn tất)` và `Đã hủy`. Ô tìm kiếm từ khóa hỗ trợ tìm cả theo mã chuyến (`trip_code`) và nhãn trạng thái.

- **2. Cổng Nhà Xe – Gán Bổ Sung Từng Xe & Bộ Nút Chuẩn Từng Dòng (`Xem | Sửa | Lưu | In | Xóa`) ([vendor_portal.html](file:///e:/Bim_Logisstic_GSS/templates/vendor_portal.html), [vendor_service.py](file:///e:/Bim_Logisstic_GSS/apps/dispatch/vendor_service.py), [vendor.py](file:///e:/Bim_Logisstic_GSS/apps/dispatch/api_views/vendor.py)):**
  - Bổ sung cột **THAO TÁC** trên mỗi dòng container gồm 5 nút chuẩn: **Xem** (mở modal `#modal-vendor-row-view` xem đầy đủ lộ trình & xe/tài), **Sửa** (`toggleEditRow` mở khóa sửa chuyến đã phát lệnh còn ở trạng thái cho phép), **Lưu** (`saveSingleRow` lưu & phát lệnh bổ sung riêng từng xe, cho phép gán trước 1 xe và bổ sung các xe còn lại sau), **In** (`printVendorRow` in phiếu lệnh vận chuyển container riêng lẻ) và **Xóa** (`deleteOrResetRow` gọi `DELETE /api/vendor/<token>/` → `svc.clear_row` để xóa nháp hoặc hủy gán xe còn ở trạng thái `READY` về `Chờ gán xe`).
  - Tinh chỉnh độ rộng các cột gọn cân đối (`1185px` tổng bảng) giúp toàn bộ 12 cột hiển thị trọn vẹn không bị cắt lề trái (`STT`) hay lề phải (`Thao Tác`) trên màn hình laptop `1280px` và `1440px`.

## 2026-11-12 – Tối Ưu Bảng 1 Dòng/Cont, Modal "Nhập Từ Excel" & Chuẩn Hóa File Mẫu Excel Cổng Nhà Xe

- **1. Bố cục bảng 1 dòng / container trên Cổng Nhà Xe (`templates/vendor_portal.html`):**
  - Chuyển danh sách container ở Khối 2 từ dạng card 3 hàng sang bảng dữ liệu ngang gọn gàng (11 cột: `STT`, `Số Container`, `Loại`, `Số Chì / Seal`, `Điểm Giao Hàng`, `Đầu Kéo *`, `Rơ-moóc`, `Tài Xế`, `SĐT Tài Xế`, `Ghi Chú Nhà Xe`, `Trạng Thái`) với khung chứa mở rộng `max-w-[1440px]`.
  - Giữ nguyên toàn bộ thao tác nhập nhanh (datalist, nút `+` thêm nhanh đầu kéo/rơ-moóc/tài xế, đồng bộ SĐT tài xế tự động, nút `Kẹp 20` cho container 20 feet, đánh dấu `dirtyRows` và lưu hàng loạt).

- **2. Gom nút "Nhập Từ Excel" kèm Modal Tải Mẫu & Nhập File Chuẩn Hệ Thống (`templates/vendor_portal.html`):**
  - Thay thế 2 nút riêng biệt trước đây bằng 1 nút duy nhất **Nhập Từ Excel**, mở Modal `#modal-vendor-excel` đồng bộ thiết kế với Modal nhập container của hệ thống (`modal_import_containers.html`).
  - Trong Modal có sẵn banner xanh Teal tải file mẫu (`GET /api/vendor/<token>/excel/`), vùng chọn tệp `.xlsx/.xls` kèm hiển thị tên/dung lượng file và nút xác nhận nạp dữ liệu.

- **3. Đồng bộ chuẩn định dạng & tiêu đề file Excel Nhà Xe (`apps/gss/vendor_excel.py`):**
  - Chuẩn hóa `VENDOR_COLS` và `ALLOC_COLS` sang tiếng Việt viết hoa đầu từ nhất quán, đồng thời nâng cấp `_style(ws)` theo chuẩn GSS TMS: nền tiêu đề Teal `#0F766E`, font `Calibri` 12pt đậm màu trắng (`#FFFFFF`), dòng tiêu đề cao `28`, dòng dữ liệu cao `22` (`#0F172A`), viền mảnh Slate `#CBD5E1`, cố định tiêu đề `A2` và tự động căn độ rộng cột.

## 2026-11-11 – Trang Tiếp Đón Cổng Nhà Xe (`/vendor/`), Theo Dõi Tiến Độ Vendor & Chuẩn Hóa Bộ Nút CRUD (`Xem | Sửa | Lưu | Xóa | In`)

- **1. Khắc phục triệt để đường dẫn `/vendor//` & Bổ sung trang Tiếp Đón Cổng Nhà Xe (`/vendor/`):**
  - Khởi động lại Gunicorn workers (`docker restart gss_logistics_web`) để áp dụng toàn bộ cơ chế lưu `_raw_token` trong `vendor_service.py`, đảm bảo API `/api/bookings/<id>/vendor-allocations/` trả về link có token hợp lệ 100%.
  - Tạo giao diện Cổng Đối Tác Nhà Xe chào đón (`templates/vendor_portal_home.html`) và route `/vendor/` trong `config/urls.py` & `apps/dispatch/vendor_views.py`: Khi đối tác hoặc người dùng truy cập trực tiếp `/vendor/` không kèm token, hệ thống hiển thị cổng tra cứu nhập mã Token hoặc liên kết để vào làm việc mượt mà thay vì báo lỗi 404.

- **2. Minh bạch hóa Trạng Thái Tiếp Theo để theo dõi tiến độ Vendor:**
  - Trên từng dòng Nhà xe (Khối 2) của `view_dispatch_order.html`: Tự động hiển thị badge tiến độ khai báo xe trực quan (`🟡 Chờ Vendor khai báo (0/5 xe)` → `🔵 Đang khai báo (2/5 xe)` → `🟢 Đã khai báo đủ (5/5 xe)`).
  - Trên bảng chi tiết Container (Khối 3): Cập nhật trạng thái sang `🟡 Chờ Vendor gán xe` sau khi phát lệnh và tự động chuyển thành `🟢 Đã gán xe & tài` khi Nhà xe nhập thông tin đầu kéo/tài xế qua Portal hoặc Excel.
  - Khối Result Box sau phát lệnh bổ sung hướng dẫn 3 bước tiếp theo (Gửi link Zalo → Nhà xe khai báo / Mở cổng nhập hộ → Theo dõi tiến độ tự động).

- **3. Chuẩn hóa Bộ Nút Hành Động Chuẩn (`Xem | Sửa | Lưu | Xóa | In`):**
  - Cập nhật thanh footer của `templates/views/view_dispatch_order.html` theo chuẩn ERP CRUD: `← Quay Lại`, `👁️ Xem B/L Gốc`, `🖨️ In Lệnh Tổng` & `In Phiếu Nhà Xe ▾`, `🗑️ Thu Hồi Lệnh`, `✏️ Sửa / Tải Lại`, và nút hành động chính `💾 Lưu & Phát Lệnh Cho Vendor` (nền xanh Teal đặc chuẩn).
  - Cập nhật cột **THAO TÁC** trên bảng Danh Sách Lệnh Điều Động (`dispatch-order-modal.js`): Sử dụng đồng bộ bộ thao tác chuẩn 2 nút `[ 👁️ Xem ]` và `[ 🖨️ In ]` thống nhất với toàn bộ các bảng khác trong hệ thống TMS.

## 2026-11-11 – Chuẩn Hóa Bộ Nút Thao Tác, In Lệnh Theo Từng Nhà Xe & Kích Hoạt Cổng Nhà Xe (Vendor Portal Link)

- **1. Chuẩn hóa bộ nút hành động theo tiêu chuẩn TMS (Primary Button UI):**
  - Chuyển đổi nút "Xác Nhận Phát Lệnh & Phân Bổ Cho Vendor" (cả ở thanh công cụ đầu trang và thanh footer chân trang của `view_dispatch_order.html`) từ dạng viền rỗng (outline `.btn-bim-primary`) sang nút hành động chính tiêu chuẩn của hệ thống:
    + Nền xanh Teal đồng nhất (`bg-teal-700 hover:bg-teal-800 active:bg-teal-900`), chữ trắng nổi bật (`text-white font-extrabold`), hiệu ứng đổ bóng (`shadow-md`) và chuyển động mượt mà.
    + Nút phụ đồng bộ: viền xám nền trắng (`bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`).

- **2. In phiếu Lệnh Điều Động riêng biệt cho từng Nhà Xe (Subcontractor Dispatch Slip):**
  - Khắc phục nhu cầu in ấn gửi lệnh cho riêng từng đối tác vận tải mà không làm lộ các container của nhà xe khác cũng như không lộ đơn giá cước:
    + Tích hợp nút `[ 🖨️ In Phiếu ]` trực tiếp trên từng dòng của Nhà xe trong Bảng phân bổ Khối 2 của trang Lệnh Điều Động.
    + Bổ sung menu thả nổi `[ 🖨️ In Phiếu Theo Nhà Xe ▾ ]` tại thanh công cụ chân trang (bên cạnh `In Lệnh Điều Vận Tổng`), liệt kê đầy đủ danh sách các nhà xe đã được chia cont kèm số lượng cont tương ứng để in nhanh với 1 cú click chuột.
    + Backend `DispatchOrderPrintAPI` (`/api/gss/bookings/<id>/dispatch-order/?vendor=<vendor_id>`): Kết xuất phiếu lệnh điều vận HTML tiêu đề chuẩn `LỆNH ĐIỀU VẬN - [Tên Nhà Xe]`, chỉ lọc đúng các container bàn giao cho nhà xe đó, giấu toàn bộ cước phí và thông tin nhạy cảm.

- **3. Khắc phục sự cố rỗng Token và kích hoạt Cổng Nhà Xe (Vendor Portal Link):**
  - **Nguyên nhân sự cố link `/vendor//`:**
    + Trước đây, model `BookingVendorAllocation` chỉ lưu chuỗi băm bảo mật SHA-256 (`token_hash`) mà không lưu lại `token` gốc khi tạo qua `assign_containers`. API `GET /api/bookings/<id>/vendor-allocations/` trả về danh sách phân bổ nhưng thiếu trường `vendor_link` / `token`, khiến giao diện sinh ra đường dẫn bị khuyết token `http://127.0.0.1:8086/vendor//`.
  - **Giải pháp xử lý:**
    + Cập nhật `apps/dispatch/vendor_service.py` (`create_allocation`, `regenerate_link`, `submit_rows`, `allocation_summary`): Lưu `_raw_token` vào trường `draft_rows['_raw_token']` và tuần tự hóa `vendor_link` đầy đủ (URL tuyệt đối).
    + Cập nhật `apps/gss/containers.py` (`assign`): Lưu `_raw_token` ngay khi khởi tạo phân bổ mới.
    + Cập nhật `apps/dispatch/api_views/vendor.py` (`BookingVendorAllocationsAPIView.get`): Tự động phát hiện và sinh token có hiệu lực tức thì nếu phân bổ cũ chưa có token.
    + Nâng cấp giao diện `dispatch-order-modal.js`:
      * Hiển thị đầy đủ link Cổng Nhà Xe bảo mật `http://127.0.0.1:8086/vendor/<token>/`.
      * Bổ sung bộ 3 nút hành động tiện ích cho mỗi Nhà xe: `[ ↗️ Cổng Nhà Xe ]` (mở ngay cổng nhà xe ở tab mới), `[ 📋 Copy Link ]` (sao chép link vào clipboard để gửi Zalo/SMS cho đối tác), và `[ 🖨️ In Phiếu ]`.

## 2026-11-11 – Khắc Phục Lỗi Router Treo Khi Điều Hướng (Màn Hình Bị Khóa Ở Dashboard)

- **Nguyên nhân sự cố:**
  - Trong tệp `static/js/src/app/dispatch/dispatch-order-modal.js`, hàm tương thích ngược `openDispatchOrderModal` bị khai báo trùng tên hàm (`function openDispatchOrderPage`) dẫn đến biến `openDispatchOrderModal` bị `undefined`, gây lỗi `ReferenceError: openDispatchOrderModal is not defined`.
  - Hàm `closeDispatchOrderModal()` trong `dispatch-order-modal.js` gọi `backToDispatchOrders()`, hàm này kích hoạt `switchDispatchViewTab('orders')` truy cập biến `currentDispatchTab` được khai báo bằng `let` ở cuối file trước khi được khởi tạo (lỗi Temporal Dead Zone - TDZ: `Cannot access 'currentDispatchTab' before initialization`).
  - Do 2 lỗi JavaScript runtime này, quá trình khởi tạo và điều hướng của router (`resolveInitialRoute()` và `switchTab()`) bị dừng đột ngột giữa chừng. Hậu quả là view Dashboard (`view-dashboard`) không được ẩn đi và view đích (như `view-kinh-doanh`, `view-dieu-van`...) không thể hiển thị, khiến người dùng bấm vào bất kỳ phân hệ nào trên Sidebar cũng vẫn bị giữ lại ở màn hình Dashboard Tổng quan.
- **Giải pháp xử lý:**
  - Sửa hàm tương thích ngược `openDispatchOrderModal(preselectedBookingId = null)` chính xác trong `dispatch-order-modal.js`.
  - Tách bạch hàm `closeDispatchOrderModal()`: Chỉ đơn thuần ẩn trang Lệnh Điều Động nếu đang mở, tuyệt đối không tự ý gọi `backToDispatchOrders()` gây xáo trộn luồng router của các tab khác.
  - Chuyển `currentDispatchTab` sang khai báo `var` an toàn, loại bỏ triệt để lỗi TDZ.
  - Build lại `static/js/app.js` (103 modules) và `static/css/tailwind.css`.
  - Kiểm thử tự động bằng Playwright trên cả 8 phân hệ chính: Cả 8 phân hệ (`/dashboard`, `/sales`, `/dispatch`, `/fleet`, `/hr`, `/accounting`, `/reports`, `/settings`) đều chuyển trang mượt mà 100%, tiêu đề Topbar và View hiển thị hoàn toàn chính xác.

## 2026-11-11 – Chuẩn Hóa 3 Bước Quy Trình Nghiệp Vụ Vận Tải: Booking (Gán Tạm) → Điều Vận (Lập Lệnh) → Cổng Nhà Xe (Vendor Portal)

- **Chuẩn hóa nghiệp vụ Phân tầng 3 Bước (3-Tier Logistics Dispatch Lifecycle):**
  1. **Bước 1 (CS - Tạo Booking & Danh sách Container):**
     - Làm rõ nghiệp vụ: Ở giai đoạn Booking, hành động chọn nhà xe đối tác **chỉ là gán tạm / dự kiến**, chưa được coi là trạng thái "Đã gán Vendor" chính thức.
     - Cập nhật giao diện Booking (`view_booking_detail.html` & `containers.js`):
       + Nút gán hàng loạt đổi từ "Giao Cho Nhà Xe" thành `✓ Gán Tạm Nhà Xe (Dự kiến)`.
       + Nút bỏ gán đổi thành `Bỏ Gán Tạm`.
       + Cột `NHÀ XE (DỰ KIẾN)`: Khi có gán tạm, hiển thị badge màu hổ phách `Dự kiến: [Tên nhà xe]`.
       + Cột `TRẠNG THÁI`: Hiển thị badge rõ ràng `Gán tạm (Chờ điều độ phát lệnh)` thay vì "Chưa phát lệnh" mờ nhạt.
       + Bộ lọc trạng thái phân bổ: Hỗ trợ lọc theo `Chưa gán tạm` và `Đã gán tạm (Dự kiến)`.
  2. **Bước 2 (Điều độ viên - Lập Lệnh Điều Động & Phát Lệnh):**
     - Mở trang chuyên biệt `view-dispatch-order` (`/dispatch/orders/<id>`):
       + Tự động kế thừa toàn bộ danh sách container và các vendor đã được CS gán tạm trước đó.
       + Cho phép Điều độ viên duyệt lại, điều chỉnh số lượng hoặc phân bổ thêm nhà xe.
       + Bấm "Xác Nhận Phát Lệnh & Phân Bổ Cho Vendor": Chuyển trạng thái chính thức sang `Đã phát lệnh điều động (Chờ Vendor gán xe)`, cấp phát link Vendor Portal bảo mật cho từng nhà xe đối tác.
  3. **Bước 3 (Vendor - Cổng Nhà Xe Khai Báo & Điều Chỉnh Phương Tiện - `vendor_portal.html`):**
     - Thiết kế lại toàn diện giao diện Cổng Nhà Xe (`templates/vendor_portal.html`) theo tiêu chuẩn Tailwind CSS và Phosphor Icons hiện đại:
       + Hiển thị thông tin hàng hóa, B/L, quy cách cont, lộ trình 3 điểm và hạn DEM/DET ở dạng **chỉ đọc (read-only)** an toàn.
       + **Phương thức 1: Nhập trực tiếp trên Web-form:**
         * Droplist chọn Biển số đầu kéo, Rơ-moóc, Tên & SĐT tài xế từ danh mục có sẵn (`<datalist>` catalog của vendor).
         * Tích hợp tính năng **"Thêm Mới Nhanh"** (+ Thêm nhanh đầu kéo / rơ-moóc / tài xế mới) qua modal popover trực quan.
       + **Phương thức 2: Kết xuất mẫu & Import hàng loạt:**
         * Nút `Tải File Mẫu (Excel)` đã có sẵn danh sách các cont được giao và điểm giao.
         * Nút `Import Lên Hệ Thống` cho phép tải lên file Excel đã điền xe/tài xế trong tích tắc (phục vụ lô 20-50 cont).
       + **Cập nhật linh hoạt & Chống sự cố bãi đổi vỏ cont:**
         * Cho phép Vendor và Điều vận chủ động hiệu chỉnh lại số container khi có sự cố bãi cấp đổi vỏ rỗng mà không bị khóa cứng.
         * Đồng bộ hai chiều giữa `BookingContainer` và `DispatchTrip` trong `apps/dispatch/vendor_service.py`.
       + **Quản lý ghép cont (Kẹp 20 feet):**
         * Bổ sung tính năng `🔗 Kẹp 20` trên từng dòng cont 20 feet: Cho phép chọn nhanh cont 20 khác trong lô để đi cùng xe, tự động đồng bộ Đầu kéo, Rơ-moóc, Tài xế và SĐT.
       + Thanh lưu nổi (Sticky footer bar) hiển thị tiến độ khai báo và nút `Lưu Khai Báo Phương Tiện` kích thước lớn, thân thiện trên cả smartphone của tài xế lẫn máy tính bàn.

## 2026-11-13 — Chuẩn Hóa Lệnh Điều Động (LĐĐ), Phiếu Chuyến Xe & Luồng Cấp Lệnh Tài Xế (Driver QR & Zalo)

- **Chuẩn hóa Mã Lệnh Điều Động (LĐĐ):**
  - Đồng bộ định dạng mã lệnh: `LĐĐ.BK.YYMM.XXX` (ví dụ `LĐĐ.BK.2611.001`) xuyên suốt giao diện từ danh sách Lệnh điều động `#dispatch-orders-tbody`, top bar, tiêu đề trang đến chi tiết đơn hàng.
  - Loại bỏ khối bảng định mức trùng lặp (hình 3 trong tài liệu); thay thế bằng khối thẻ **CÁC NHÀ XE ĐƯỢC PHÂN BỔ & CỔNG KHAI BÁO (VENDOR PORTAL)** (`#mdo-vendor-cards-list`):
    + Hiển thị trực quan từng nhà xe được giao: Tên nhà xe, Số cont phân bổ (`3/5 cont`), ghi chú.
    + Nút bấm hành động nhanh: `[↗ Mở Cổng Nhà Xe]` (mở URL bảo mật của Vendor), `[📋 Copy Link]` (sao chép đường dẫn), `[🖨 In Phiếu Phân Bổ]`.
  - Trên bảng container chi tiết:
    + Thêm dropdown chọn Vendor trực tiếp từng dòng (`mdoChangeSingleContainerVendor`) và nút `[Bỏ Gán]` linh hoạt.
    + Bổ sung nút phóng to toàn màn hình `[⛶ Mở Rộng Bảng]` / `[Thu Gọn Bảng]` giúp điều vận dễ dàng thao tác với lô hàng 50-100 container.

- **Phiếu Chuyến Xe Riêng Biệt & Luồng Cấp Lệnh Tài Xế (Driver QR & Zalo):**
  - **Mỗi lần Vendor gán xe:** Hệ thống tự động khởi tạo/gán một Phiếu Chuyến Xe (`DispatchTrip`) với Mã chuyến riêng biệt (`DV.YYMM.XXX`, vd: `DV.2611.001`) và token bảo mật định danh chuyến xe (`driver_token` / `trip_token`).
  - **Backend (`apps/dispatch/vendor_service.py` & `apps/qr_tracking/api.py`):**
    + Bổ sung `trip_id`, `trip_code`, `trip_token`, `driver_url` (`/q/<trip_token>/`), `zalo_message`, `zalo_url`, và các điểm lộ trình (`pickup`, `warehouse`, `dropoff`, `dem_expiry`, `det_expiry`) vào `rows_for()`.
    + Mở endpoint cấp SVG mã QR bảo mật theo token: `/api/qr/t/<str:token>/qr.svg` (`TripQrSvgAPIView`), cho phép tài xế và nhà xe hiển thị ảnh QR tức thì không cần quyền Dispatcher nội bộ.
  - **Giao diện Cổng Nhà Xe (`templates/vendor_portal.html`):**
    + Cột Trạng thái & Mã chuyến: Hiển thị badge mã chuyến xe `DV.2611.001` kèm trạng thái 7 chặng.
    + Cột Thao tác: Bổ sung nút nổi bật **`[📱 Lệnh QR]`** cho các dòng đã gán xe.
    + Modal điều xe tài xế chuyên biệt **`#modal-driver-qr-dispatch`**:
      * Header: Tiêu đề "LỆNH ĐIỀU XE & MÃ QR TÀI XẾ" kèm badge mã chuyến.
      * Cột trái: Thông tin phương tiện (Đầu kéo, Rơ-moóc, Tài xế, SĐT, Số Container, Số Seal) và Lộ trình 3 điểm (1. Nhận cont -> 2. Giao hàng -> 3. Trả rỗng) cùng hạn DEM/DET.
      * Cột phải: Khung ảnh Mã QR khổ lớn (`/api/qr/t/{token}/qr.svg`) và ô input chứa link truy cập một chạm (`/q/{token}/`).
      * Bộ nút tương tác:
        - `[📋 Copy Tin Nhắn Zalo]`: Tự động định dạng tin nhắn chi tiết (Mã lệnh, cont, xe, tài xế, lộ trình 3 điểm, hạn DEM/DET và link) để gửi qua Zalo cho tài xế.
        - `[💬 Mở Zalo Gửi Ngay]`: Mở trực tiếp cuộc trò chuyện Zalo với số điện thoại tài xế.
        - `[↗ Mở Giao Diện Tài Xế]`: Mở trang mobile app của tài xế (`/q/<token>/`) trong tab mới.
        - `[🖨 In Phiếu Chuyến Xe]`: In phiếu điều xe khổ A4/A5 chuyên nghiệp có sẵn mã QR để tài xế quét bằng điện thoại.
    + Trong modal Xem chi tiết container (`#modal-vendor-row-view`): Tích hợp sẵn thẻ QR chuyến xe và nút Copy Link Zalo.
    + Phiếu in `printVendorRow()`: Tích hợp mã QR SVG độ phân giải cao và hướng dẫn tài xế quét mã QR bằng camera điện thoại/Zalo để cập nhật 7 mốc và gửi ảnh chứng từ.
  - **Kiểm thử tự động & Visual Regression:**
    + Chạy Playwright E2E mô phỏng đăng nhập Vendor, kiểm tra hiển thị nút `[Lệnh QR]`, mở modal, sao chép tin nhắn Zalo, mở giao diện tài xế trên viewport mobile (390x844) và chụp ảnh màn hình lưu vào Artifacts.
    + Kiểm tra toàn diện hệ thống `python scripts/qa.py verify --fast` đạt `PASS=6 FAIL=0`.

- **Sửa Lỗi Nút Mở Rộng Bảng Container (Toàn Màn Hình Chuẩn Booking):**
  - Đồng bộ logic và giao diện nút Mở rộng bảng container tại Section 3 của Lệnh Điều Động (`view_dispatch_order.html` và `modal_dispatch_order.html`) sang chuẩn **Toàn Màn Hình (Fullscreen)** tương tự như phân hệ Booking (`toggleFullscreenContainersTable`):
    + Gán đúng định danh `id="mdo-containers-section"` và `id="mdo-containers-table-wrapper"`.
    + Chuyển nút bấm sang nhãn `[ ⛶ Toàn Màn Hình ]` với icon `ph-corners-out`.
    + Khi bấm: Khối bảng container Section 3 lập tức mở rộng toàn màn hình (`fixed inset-0 z-50 bg-white p-6 overflow-hidden flex flex-col shadow-2xl h-screen`), thanh cuộn bảng tự động điều chỉnh chiếm trọn chiều cao màn hình (`max-h-[calc(100vh-210px)]`).
    + Nút bấm tự động đổi trạng thái sang `[ ⛶ Thu Gọn (Esc) ]` với icon `ph-corners-in`.
    + Hỗ trợ phím tắt `Escape` (Esc) và nút Thu Gọn để khôi phục lại trạng thái ban đầu nhanh chóng.
    + Đã kiểm thử tự động bằng Playwright E2E mô phỏng thao tác bấm mở rộng và nhấn phím Esc thu gọn, chụp màn hình xác thực thành công.
