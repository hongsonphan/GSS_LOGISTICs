# Nhật ký thay đổi – GSS TMS

Repo khởi tạo ngày 09/11/2026 từ mã nguồn GSS_LOGISTICs (master `1d7884c`), không mang lịch sử git cũ.
Nhật ký của hệ thống trước đó không chuyển sang repo này.

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
