# CHANGELOG — BIM LOGISTICS PLATFORM

Tất cả các thay đổi kiến trúc và mã nguồn được ghi nhận theo chuẩn Documentation-as-Code.

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
