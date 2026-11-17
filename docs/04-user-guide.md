# SỔ TAY HƯỚNG DẪN SỬ DỤNG GSS LOGISTICS

**Quy trình vận hành & cẩm nang thao tác từng màn hình — Phiên bản v1.2 (11/2026)**

> **GSS LOGISTICS - GREEN SOLUTIONS SMART** · Liên hệ quản trị viên hệ thống GSS để được hỗ trợ
>
> Tra cứu trực tuyến trong phần mềm: bấm nút **Trợ giúp** trên thanh trên cùng, hoặc mở đường dẫn `/helps` của hệ thống

**Cách đọc sổ tay này:**

- Người mới: đọc **Phần A** (15 phút) để biết cách dùng chung mọi màn hình, rồi đọc phần của phòng ban mình ở **Phần C**.
- Quản trị / người triển khai: làm theo **Phần B** để khai báo danh mục trước khi chạy thật.
- Đầu mỗi phân hệ tại **Phần C** luôn có **Sơ đồ quy trình (Workflow Diagram)** và **Bảng quy trình thao tác chi tiết** để người dùng nắm rõ ngay luồng nghiệp vụ trước khi bấm nút.
- Gặp lỗi hoặc thắc mắc: xem **Phần D – Hỏi đáp**.
- Ký hiệu: **`Tên nút`** là nút bấm trên màn hình · **Menu ➔ Tab** là đường đi · dấu **\*** là ô bắt buộc nhập.

<!-- TOC -->
## MỤC LỤC

- **PHẦN A. LÀM QUEN HỆ THỐNG**
  - [A1. Đăng nhập, giao diện & tài khoản](#a1-đăng-nhập-giao-diện--tài-khoản)
  - [A2. Thao tác chung trên mọi bảng dữ liệu](#a2-thao-tác-chung-trên-mọi-bảng-dữ-liệu)
  - [A3. Thao tác chung trên màn hình chi tiết](#a3-thao-tác-chung-trên-màn-hình-chi-tiết)
  - [A4. Bức tranh tổng thể: một đơn hàng đi qua hệ thống như thế nào](#a4-bức-tranh-tổng-thể-một-đơn-hàng-đi-qua-hệ-thống-như-thế-nào)
  - [A5. Vai trò & quyền truy cập](#a5-vai-trò--quyền-truy-cập)
  - [A6. Việc hằng ngày theo vai trò (dành cho người mới)](#a6-việc-hằng-ngày-theo-vai-trò-dành-cho-người-mới)
- **PHẦN B. CÀI ĐẶT BAN ĐẦU (DANH MỤC GỐC)**
  - [B0. Màn hình Cài đặt & thứ tự khai báo khuyến nghị](#b0-màn-hình-cài-đặt--thứ-tự-khai-báo-khuyến-nghị)
  - [B1. Thông Tin Công Ty](#b1-thông-tin-công-ty)
  - [B2. Vai Trò & Phân Quyền](#b2-vai-trò--phân-quyền)
  - [B3. Khoản Mục Chi](#b3-khoản-mục-chi)
  - [B4. Biểu Phí Lương Chuyến & Phụ Cấp – Kiểm Hóa](#b4-biểu-phí-lương-chuyến--phụ-cấp--kiểm-hóa)
  - [B5. Cảng & Kho Bãi](#b5-cảng--kho-bãi)
  - [B6. Hãng Tàu](#b6-hãng-tàu)
  - [B7. Khách Hàng](#b7-khách-hàng)
  - [B8. Biểu Cước Khách](#b8-biểu-cước-khách)
  - [B9. Thầu Phụ & Nhà Cung Cấp](#b9-thầu-phụ--nhà-cung-cấp)
  - [B10. Đầu Kéo & Xe](#b10-đầu-kéo--xe)
  - [B11. Rơ-Moóc](#b11-rơ-moóc)
  - [B12. Quy Cách Cont & Xe](#b12-quy-cách-cont--xe)
  - [B13. Số Dư Ban Đầu](#b13-số-dư-ban-đầu)
- **PHẦN C. HƯỚNG DẪN THAO TÁC THEO PHÂN HỆ**
  - [C1. Dashboard Tổng quan](#c1-dashboard-tổng-quan)
  - [C2. Sale & Booking](#c2-sale--booking)
  - [C3. Điều vận](#c3-điều-vận)
  - [C4. Cổng tài xế trên điện thoại (Driver Portal)](#c4-cổng-tài-xế-trên-điện-thoại-driver-portal)
  - [C5. Cổng nhà xe (Vendor Portal) & Link tra cứu khách hàng](#c5-cổng-nhà-xe-vendor-portal--link-tra-cứu-khách-hàng)
  - [C6. Hành chính & Nhân sự](#c6-hành-chính--nhân-sự)
  - [C7. Tài chính & Kế toán](#c7-tài-chính--kế-toán)
  - [C8. Xe & Bãi](#c8-xe--bãi)
  - [C9. Dịch vụ Hải quan](#c9-dịch-vụ-hải-quan)
  - [C10. Báo cáo & Thống kê](#c10-báo-cáo--thống-kê)
  - [C11. Giao việc (Tasks)](#c11-giao-việc-tasks)
  - [C12. Bản tin & Thông báo nội bộ](#c12-bản-tin--thông-báo-nội-bộ)
  - [C13. Chat nội bộ & Chuông thông báo](#c13-chat-nội-bộ--chuông-thông-báo)
  - [C14. Biểu đồ tùy biến trên Dashboard](#c14-biểu-đồ-tùy-biến-trên-dashboard)
- **PHẦN D. HỎI ĐÁP & XỬ LÝ SỰ CỐ THƯỜNG GẶP**
  - [D1. Khi tạo lệnh, ô Tài xế hoặc Đầu kéo không có tên cần chọn?](#d1-khi-tạo-lệnh-ô-tài-xế-hoặc-đầu-kéo-không-có-tên-cần-chọn)
  - [D2. Chọn "Chi phí công ty", "Công ty chi hộ" hay "3PL chi hộ"?](#d2-chọn-chi-phí-công-ty-công-ty-chi-hộ-hay-3pl-chi-hộ)
  - [D3. Vì sao không xóa được khách hàng, xe, khoản mục chi…?](#d3-vì-sao-không-xóa-được-khách-hàng-xe-khoản-mục-chi)
  - [D4. In báo giá, lệnh xe, phiếu thu chi bị lệch, mất màu?](#d4-in-báo-giá-lệnh-xe-phiếu-thu-chi-bị-lệch-mất-màu)
  - [D5. Tài xế mất vé BOT hoặc quên chụp POD?](#d5-tài-xế-mất-vé-bot-hoặc-quên-chụp-pod)
  - [D6. Tài xế báo link không mở được / link đã khóa?](#d6-tài-xế-báo-link-không-mở-được--link-đã-khóa)
  - [D7. Nhập Excel bị lỗi hoặc thiếu dòng?](#d7-nhập-excel-bị-lỗi-hoặc-thiếu-dòng)
  - [D8. Lương chuyến của tài xế lấy từ đâu?](#d8-lương-chuyến-của-tài-xế-lấy-từ-đâu)
  - [D9. Vì sao số trên Dashboard / báo cáo khác với số tôi nghĩ?](#d9-vì-sao-số-trên-dashboard--báo-cáo-khác-với-số-tôi-nghĩ)
  - [D10. Màn hình báo "Bạn không có quyền truy cập chức năng này"?](#d10-màn-hình-báo-bạn-không-có-quyền-truy-cập-chức-năng-này)
  - [D11. Quên mật khẩu?](#d11-quên-mật-khẩu)

<!-- /TOC -->

---

# PHẦN A. LÀM QUEN HỆ THỐNG

## A1. Đăng nhập, giao diện & tài khoản

**Đăng nhập:** mở địa chỉ phần mềm ➔ nhập **Tên đăng nhập** và **Mật khẩu** do quản trị viên cấp ➔ bấm **`Đăng nhập`**. Tài xế và Nhà xe **không cần tài khoản thông thường** – tài xế làm việc qua đường link / QR chuyến xe (xem mục C4), nhà xe làm việc qua link phân bổ hoặc cổng Vendor Portal (xem mục C5).

**Bố cục màn hình:**

| Khu vực | Vị trí | Dùng để |
|---|---|---|
| Thanh menu trái (Sidebar) | Bên trái | Chuyển giữa 8 phân hệ cốt lõi. Bấm biểu tượng ô vuông ở đầu thanh để ghim mở / thu gọn. Bạn chỉ thấy những menu được phân quyền. |
| Thanh trên cùng (Topbar) | Phía trên | Tên màn hình đang mở, nút **`Trợ giúp`**, **chuông thông báo**, và **ảnh đại diện** (hồ sơ cá nhân). |
| Vùng làm việc | Giữa | Thẻ chỉ số (KPI) ➔ các tab ➔ thanh công cụ & bộ lọc ➔ bảng dữ liệu. |
| Bong bóng chat | Góc dưới phải | Nhắn tin nội bộ tức thời với đồng nghiệp kèm đính kèm ảnh và tag việc (mục C13). |

**Các menu chính** (thứ tự trên Sidebar chuẩn 8 mục):

| Menu | Đường dẫn | Ai thường dùng |
|---|---|---|
| Dashboard Tổng quan | `/` | Tất cả – Ban Giám Đốc theo dõi KPI, điều hành vận tải |
| Sale & Booking | `/sales` | Kinh doanh, CSKH |
| Điều vận | `/dispatch` | Điều vận / điều độ, quản lý Vendor |
| Xe & Bãi | `/fleet` | Bảo trì vận hành, thủ bãi depot |
| Hành chính & Nhân sự | `/hr` | Hành chính – Nhân sự, Kế toán tiền lương |
| Tài chính & Kế toán | `/accounting` | Kế toán thanh toán, kế toán công nợ, kế toán tổng hợp |
| Dịch vụ Hải quan | `/customs` | Phòng Dịch vụ Hải quan |
| Báo cáo & Thống kê | `/reports` | Ban Giám Đốc, trưởng các bộ phận |

Ngoài ra: **Giao việc** (`/tasks`) và **Bản tin** (`/news`) mở từ khung tương ứng trên Dashboard; **Quyết toán gom chuyến** (`/settlements`) mở từ Điều vận hoặc Kế toán; **Cài đặt** (`/settings`) dành riêng cho Quản trị viên.

**Đổi thông tin cá nhân / mật khẩu:** bấm ảnh đại diện góc phải trên ➔ **`Cài đặt tài khoản`** ➔ bấm **`Sửa`** ➔ sửa Họ tên, Email, Số điện thoại; muốn đổi mật khẩu thì nhập **Mật khẩu hiện tại**, **Mật khẩu mới**, **Xác nhận mật khẩu mới** (để trống nếu không đổi) ➔ **`Lưu`**. Tên đăng nhập do quản trị viên cấp, không tự đổi được.

**Đăng xuất:** ảnh đại diện ➔ **`Đăng xuất`**.

## A2. Thao tác chung trên mọi bảng dữ liệu

Mọi danh sách (báo giá, booking, chuyến xe, phiếu thu chi, nhân sự…) đều dùng chung một kiểu thao tác chuẩn hóa:

| Thành phần | Cách dùng |
|---|---|
| Thẻ chỉ số phía trên | Tóm tắt nhanh số lượng / số tiền của kỳ đang chọn. Một số thẻ bấm được để lọc nhanh trạng thái. |
| Ô **Kỳ** | Chọn **Hôm nay / 10 ngày qua / Tháng này / Quý này / Năm nay / Tất cả** – bảng và thẻ chỉ số tự cập nhật. |
| Các ô lọc (Khách hàng, Trạng thái, Tài xế…) | Chọn giá trị để thu hẹp danh sách. Dòng **Hiển thị: x / y** cho biết đang hiện bao nhiêu dòng trên tổng số. |
| Nút **`Đặt lại`** | Xóa toàn bộ bộ lọc, trở về danh sách đầy đủ ban đầu. |
| Bấm vào **tiêu đề cột** | Sắp xếp tăng / giảm dần theo cột đó (hỗ trợ số, chuỗi, ngày tháng). |
| Nút **`Cột`** | Mở hộp **Tùy Chỉnh Cột Hiển Thị**: bỏ tích để ẩn cột, kéo biểu tượng ⋮⋮ hoặc bấm mũi tên lên/xuống để đổi thứ tự, **`Mặc định`** để khôi phục, **`Hoàn tất`** để đóng. Cấu hình được trình duyệt ghi nhớ riêng cho bạn. Cột có khóa là cột bắt buộc, không ẩn được. |
| Nút **`Xuất Excel`** | Tải danh sách đang lọc về máy dưới dạng Excel `.xlsx`. |
| Nút **`Làm Mới`** | Tải lại dữ liệu mới nhất từ máy chủ mà không cần tải lại cả trang web. |
| Cột **STT** | Đánh số thứ tự các dòng đang hiển thị (sau khi lọc). |
| Nút **`Xem`** ở cuối dòng | Mở màn hình chi tiết của bản ghi. |
| Nút **`In`** (biểu tượng máy in) ở cuối dòng | In nhanh chứng từ của dòng đó (báo giá, booking, phiếu VC, phiếu thu/chi, phiếu tạm ứng, hợp đồng, phiếu lương…). |

## A3. Thao tác chung trên màn hình chi tiết

Khi bấm **`Xem`** hoặc **`Tạo mới`**, hệ thống mở màn hình chi tiết toàn trang. Thanh công cụ phía trên có:

| Nút | Ý nghĩa |
|---|---|
| **`Back`** / **`Quay lại`** | Trở về danh sách trước đó, giữ nguyên trạng thái tab và bộ lọc đang dùng. |
| **`Sửa`** | Mở khóa các ô để chỉnh sửa (màn hình chi tiết mở ra ở chế độ chỉ xem). |
| **`Lưu`** | Lưu thay đổi. Nếu thiếu ô bắt buộc (\*), hệ thống báo đỏ ô đó và không lưu. |
| **`In`** | Mở bản in chuẩn A4/A5 của chứng từ với đầy đủ tiêu đề công ty và ô ký pháp lý. |
| **`Xóa`** | Xóa bản ghi. Hệ thống luôn hỏi xác nhận. Dữ liệu đã phát sinh chứng từ liên quan hoặc chuyến xe đã chạy sẽ bị chặn xóa (xem D3). |

**Mẹo nhập liệu dùng ở nhiều nơi:**

- **Ô chọn có tìm kiếm:** gõ vài chữ để lọc danh sách (khách hàng, địa điểm, tài xế…). Nếu chưa có trong danh mục, nhiều ô có nút **`Tạo mới`** ngay bên cạnh để thêm nhanh mà không phải rời màn hình.
- **Nút giờ nhanh** (08:00, 10:00, 13:00, 18:00, 23:59…) bên dưới ô ngày giờ: bấm để điền giờ ngay lập tức.
- **Đính kèm file:** kéo thả file vào ô, bấm để chọn file, hoặc chụp màn hình rồi bấm **`Dán Ảnh (Ctrl+V)`**. Hỗ trợ JPG, PNG, PDF tối đa 10MB/file.
- **Ô số tiền và trọng lượng:** nhập số nguyên, hệ thống tự định dạng phân cách hàng nghìn (`1.500.000 đ`, `18.500 kg`), không dùng số thập phân.

## A4. Bức tranh tổng thể: một đơn hàng đi qua hệ thống như thế nào

### QUY TRÌNH TOÀN TRÌNH VẬN HÀNH ĐƠN HÀNG CONTAINER GSS (WORKFLOW)

```text
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ BƯỚC 1: KINH DOANH     │ ───► │ BƯỚC 2: BOOKING & B/L  │ ───► │ BƯỚC 3: ĐIỀU VẬN       │
│ • Báo giá đa tuyến     │      │ • Nhập B/L & danh cont │      │ • Tab 1: Nhận booking  │
│ • Theo dõi phễu sale   │      │ • Kiểm tra ISO 6346    │      │ • Tab 2: Phân bổ xe/tài│
│ • Ký hợp đồng dịch vụ  │      │ • Áp quy tắc DEM/DET   │      │ • Giao Vendor / Xe nhà │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
                                                                             │
                                                                             ▼
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│ BƯỚC 5: KẾ TOÁN        │ ◄─── │ BƯỚC 4B: CỔNG NHÀ XE   │ ◄─── │ BƯỚC 4A: CỔNG TÀI XẾ   │
│ • Khóa sổ chi phí      │      │ • Vendor nhận link cont│      │ • Quét QR / mở link    │
│ • SOA & tách chi hộ    │      │ • Gán xe/tài xế        │      │ • 7 mốc hành trình     │
│ • Quyết toán 3PL & Lương│     │ • Hỗ trợ cập nhật mốc  │      │ • Chụp EIR/POD & E-POD │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Việc cần làm | Ai làm | Ở đâu | Kết quả / Ràng buộc |
|---|---|---|---|---|
| **0** | Khai báo danh mục: khách hàng, địa điểm, xe, tài xế, biểu cước… | Quản trị / các phòng | Cài đặt, Nhân sự | Hệ thống sẵn sàng dữ liệu nền tảng |
| **1** | Lập **Báo giá**, theo dõi đến khi khách ký hợp đồng | Kinh doanh | Sale & Booking ➔ Tab 1 | Hợp đồng có hiệu lực, biểu cước được lưu |
| **2** | Tiếp nhận **Booking / B/L**, nạp danh sách container, kiểm tra ISO, áp hạn DEM/DET | Kinh doanh / CSKH | Sale & Booking ➔ Tab 2 | Đơn B/L sẵn sàng phân bổ container |
| **3** | Phân bổ cont cho Nhà xe (Vendor) hoặc gán Xe nội bộ; gửi lệnh email/Zalo | Điều vận | Điều vận ➔ Tab 1 & Tab 2 | Lệnh điều động được phát, cấp link Vendor / QR tài xế |
| **4** | Nhà xe gán xe/tài (nếu Vendor); Tài xế nhận lệnh, bấm 7 mốc, chụp EIR/POD, ký E-POD, kê chi phí | Nhà xe / Bác tài | Cổng Vendor / Cổng tài xế di động | Tiến độ cập nhật thời gian thực, chứng từ số hóa đầy đủ |
| **5** | Giám sát hành trình (Tab 3), giải quyết ngoại lệ (đổi xe, neo đêm, sự cố); quản lý Vendor (Tab 4) | Điều vận | Điều vận ➔ Tab 3 & Tab 4 | Hành trình an toàn, áp dụng 17 khóa bất biến |
| **6** | Đối soát chi phí chuyến, **chốt sổ chuyến (Khóa)**; quyết toán tạm ứng hoàn ứng | Kế toán | Tài chính & Kế toán ➔ Tab 2, 4 | Chi phí chuyến khóa chặt, không sửa xóa được nữa |
| **7** | Lập bảng kê công nợ khách hàng **SOA**, tách riêng **Debit Note chi hộ**, thu hồi tiền | Kế toán | Tài chính & Kế toán ➔ Tab 5, 6, 1 | Xuất bảng kê 26 cột, tự động ghi phiếu thu |
| **8** | Quyết toán thầu phụ 3PL (xe ngoài) và đối soát hoàn chi hộ 3PL | Kế toán | Tài chính & Kế toán ➔ Tab 7 | Tự động sinh phiếu chi thanh toán xe bạn |
| **9** | Chấm công tháng, tính lương Hybrid (lương cơ bản + lương chuyến – tạm ứng) và chi lương | Nhân sự / Kế toán | Hành chính & Nhân sự ➔ Tab 3, 4 | Khóa sổ lương, xuất file Internet Banking |
| **10** | Ban Giám Đốc theo dõi Dashboard 4 vùng và phân tích 17 báo cáo tài chính / vận hành | Ban Giám Đốc | Dashboard & Báo cáo | Báo cáo P&L đa chiều, tối ưu hóa năng suất |

## A5. Vai trò & quyền truy cập

Mỗi tài khoản gắn với một nhân sự có **Phòng ban** và **Chức vụ** (khai báo trong Hồ sơ nhân sự). Quyền xem menu / thao tác được cấp tại **Cài đặt ➔ Khai Báo Ban Đầu ➔ Vai Trò & Phân Quyền** (mục B2).

| Phòng ban | Chức vụ có sẵn | Phạm vi công việc chính |
|---|---|---|
| Ban Giám Đốc | Giám Đốc | Xem toàn bộ KPI, duyệt chi lương, phê duyệt chính sách, phân tích báo cáo P&L |
| Phòng Hành Chính & Kế Toán | Kế toán trưởng, Kế toán thanh toán, Kế toán công nợ, Nhân sự | Sổ quỹ thu chi, quản lý tạm ứng, quyết toán chuyến, bảng kê SOA, Debit Note, tính lương |
| Phòng Điều Vận | Trưởng phòng Điều vận, Điều phối viên, Hỗ trợ điều độ | Tiếp nhận booking, phân bổ container, phát lệnh xe, giám sát 4 tab, quản lý Vendor |
| Phòng Kinh Doanh | Trưởng phòng Kinh doanh, Nhân viên Kinh doanh, CSKH | Lập báo giá, quản lý hợp đồng, tiếp nhận B/L & booking, quản lý hạn DEM/DET |
| Phòng Bảo Trì Vận Hành | Quản lý Đội xe, Nhân viên Bảo trì, Thủ bãi Depot | Quản lý đầu kéo, rơ-moóc, theo dõi hạn kiểm định/bảo hiểm, xuất nhập bãi depot, quét QR |
| Phòng Dịch Vụ Hải Quan | Trưởng phòng Hải quan, Chuyên viên Khai báo VNACCS | Tiếp nhận tờ khai, phân luồng xanh/vàng/đỏ, gắn mã chuyến xe, theo dõi thuế |

> [!NOTE]
> Hệ thống áp dụng công nghệ Row-Level Security (RLS) cách ly tuyệt đối dữ liệu giữa các doanh nghiệp. Nếu bạn không thấy menu mong muốn hoặc bị báo quyền, liên hệ Quản trị viên để kiểm tra nhóm vai trò.

## A6. Việc hằng ngày theo vai trò (dành cho người mới)

| Vai trò | Đầu ngày | Trong ngày | Cuối ngày / cuối kỳ |
|---|---|---|---|
| **Kinh doanh / CSKH** | Xem thẻ *Số đơn gấp* và *Cảnh báo DEM/DET* ở Sale & Booking | Lập báo giá (C2.1), cập nhật phễu sale (C2.2), tạo booking B/L mới, dán danh sách cont (C2.3) | Kiểm tra booking *Chờ điều xe* đã được điều vận phân bổ đủ chưa |
| **Điều vận** | Xem Tab 1 *Lệnh điều độ* và Tab 3 *Theo dõi hành trình* | Phân bổ cont cho Vendor, gán xe/tài (C3.1), gửi link Zalo/email, theo dõi 7 mốc, đổi xe/neo đêm nếu có sự cố (C3.6–C3.7) | Kiểm tra POD/EIR đã thu đủ; cấp lại/thu hồi link tài xế & vendor ở Tab 4; đề nghị cấp Quỹ điều vận nếu số dư thấp (C7.2) |
| **Tài xế** | Mở link QR trên điện thoại, bấm *Nhận chuyến* | Bấm đúng 7 mốc hành trình, chụp camera EIR/POD/seal, kê chi phí đi đường nếu phát sinh (C4) | Hạ cont chụp EIR hạ; nộp hóa đơn gốc để hoàn ứng chuyến |
| **Kế toán** | Xem 4 thẻ tồn quỹ & ngân hàng tại Kế toán | Lập phiếu thu chi (C7.1), duyệt quỹ điều vận, cấp tạm ứng chuyến (C7.2–C7.3) | Quyết toán hoàn ứng, khóa sổ chi phí chuyến, chốt SOA khách, lập Debit Note, quyết toán 3PL (C7.4–C7.9) |
| **Nhân sự** | Xem *Cảnh báo hạn 30 ngày* (GPLX & HĐLĐ) | Cập nhật hồ sơ nhân sự mới, hợp đồng, phụ lục (C6.1–C6.2) | Cuối tháng: tạo kỳ lương, chốt chấm công, tính lương tự động, khóa sổ chi lương (C6.3–C6.4) |
| **Bảo trì / Thủ bãi** | Xem *Cảnh báo đăng kiểm* và *Bảo trì định kỳ* | Cập nhật trạng thái xe/moóc, quét QR xuất nhập bãi cont (C8, C9) | Cập nhật hồ sơ kiểm định mới, đối chiếu cont tồn bãi depot |
| **Ban Giám Đốc** | Mở Dashboard, chọn góc nhìn *Ban Giám Đốc* | Giám sát KPI 4 vùng, xử lý công việc phê duyệt gấp, xem bản tin | Xem báo cáo tài chính P&L, công nợ AR, năng suất OTP (C10); duyệt bảng lương tháng |

---

# PHẦN B. CÀI ĐẶT BAN ĐẦU (DANH MỤC GỐC)

## B0. Màn hình Cài đặt & thứ tự khai báo khuyến nghị

### QUY TRÌNH KHAI BÁO THIẾT LẬP HỆ THỐNG BAN ĐẦU (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. THÔNG TIN CÔNG TY  │ ───► │ 2. NHÂN SỰ & TÀI XẾ   │ ───► │ 3. PHÂN QUYỀN VAI TRÒ │
│ Pháp nhân, MST, Logo  │      │ Hồ sơ, SĐT, GPLX      │      │ Nhóm quyền, Tài khoản │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 6. BIỂU CƯỚC & LƯƠNG  │ ◄─── │ 5. ĐỘI PHƯƠNG TIỆN    │ ◄─── ┌───────────────────────┐
│ Cước khách, lương tài │      │ Đầu kéo, Moóc, Quy cách│     │ 4. MẠNG LƯỚI ĐỐI TÁC  │
│ Khoản chi, Số dư quỹ  │      │ Cảnh báo đăng kiểm    │      │ Cảng, Kho, Hãng tàu,  │
└───────────────────────┘      └───────────────────────┘      │ Khách hàng, Nhà xe    │
                                                              └───────────────────────┘
```

**Bảng thứ tự khai báo khuyến nghị:**

| Bước | Hạng mục | Menu thực hiện | Mục tiêu & Dữ liệu cần có |
|---|---|---|---|
| **1** | Thông tin pháp nhân công ty | Cài đặt ➔ Khai báo ban đầu ➔ Thông tin công ty (B1) | Tên pháp nhân, MST, trụ sở, hotline, tài khoản ngân hàng in lên chứng từ |
| **2** | Hồ sơ nhân sự & đội ngũ tài xế | Hành chính & Nhân sự ➔ Hồ sơ nhân sự (C6.1) | Mã NV, Họ tên, SĐT Zalo, bằng lái GPLX, chức vụ `Tài xế & Giao nhận` |
| **3** | Vai trò & Phân quyền truy cập | Cài đặt ➔ Khai báo ban đầu ➔ Vai trò & Phân quyền (B2) | Gán nhóm quyền (Điều vận, Kế toán, Kinh doanh...) cho từng tài khoản |
| **4** | Cảng biển, Kho bãi, Hãng tàu | Cài đặt ➔ Mạng lưới & Địa điểm (B5, B6) | Danh sách cảng lấy cont/hạ rỗng, kho đóng hàng, mã hãng tàu |
| **5** | Khách hàng & Nhà xe đối tác | Cài đặt ➔ Khách hàng & Đối tác (B7, B9) | Mã khách hàng, mã nhà xe (Vendor 3PL), hợp đồng nguyên tắc |
| **6** | Đầu kéo & Rơ-moóc | Cài đặt ➔ Phương tiện & Thiết bị (B10, B11, B12) | Biển số đầu kéo, biển số moóc, tài xế mặc định, hạn đăng kiểm |
| **7** | Biểu cước khách & Biểu phí lương | Cài đặt ➔ Tài chính & Quản trị (B8, B4) | Đơn giá cước theo tuyến, định mức lương chuyến theo cự ly |
| **8** | Khoản mục chi & Số dư ban đầu | Cài đặt ➔ Tài chính & Quản trị (B3, B13) | Danh mục chi phí (BOT, nâng hạ...), số dư quỹ tiền mặt và ngân hàng |

## B1. Thông Tin Công Ty

**Nơi thực hiện:** Cài đặt ➔ Khai Báo Ban Đầu ➔ **Thông Tin Công Ty** ➔ bấm **`Hiệu Chỉnh Thông Tin`**.
**Dùng để:** tự động in thông tin pháp lý lên báo giá, booking, phiếu vận chuyển, phiếu thu chi, biên bản E-POD và bảng kê SOA.

| Nhóm thông tin | Ô nhập | Ghi chú / ví dụ |
|---|---|---|
| 1. Pháp lý & định danh | Tên Pháp Nhân Đầy Đủ \* | `CÔNG TY TNHH CUNG ỨNG GIẢI PHÁP XANH` |
| | Tên Thương Hiệu / Viết Tắt | `Green Solutions Smart (GSS)` |
| | Mã Số Thuế (MST) \* | 10 hoặc 13 số |
| | Giấy Phép KD Vận Tải | Số giấy phép kinh doanh vận tải đường bộ |
| | Người Đại Diện & Chức Vụ | Họ tên + chức vụ (mặc định *Giám Đốc*) – in tại ô ký duyệt |
| 2. Trụ sở & liên hệ | Địa Chỉ Trụ Sở Chính \* | Địa chỉ theo giấy chứng nhận đăng ký kinh doanh |
| | Hotline / Điện Thoại \* | In trên mọi lệnh điều xe và phiếu giao hàng |
| | Email Liên Hệ, Website Công Ty | Email tiếp nhận đơn hàng và trao đổi đối tác |
| 3. Bãi đỗ xe & trạm điều phối | Tên bãi, Hotline trực bãi, Địa chỉ | Bãi tập kết đầu kéo và depot của công ty |
| 4. Tài khoản ngân hàng | Số Tài Khoản, Tên Ngân Hàng, Chi Nhánh | In trên báo giá, phiếu thu chi, bảng kê công nợ |
| 5. Tham số vận hành mặc định | Thuế VAT (%), Giá dầu P0 tham chiếu, Tỷ lệ điều chỉnh | Giá trị cơ sở tính cước tự động |

## B2. Vai Trò & Phân Quyền

**Nơi thực hiện:** Cài đặt ➔ Khai Báo Ban Đầu ➔ **Vai Trò & Phân Quyền**.

1. Tìm dòng của nhân viên.
2. Đổi **nhóm vai trò**: bấm **`Hiệu Chỉnh Thông Tin`** ➔ chọn nhóm vai trò (Giám Đốc, Kế toán, Điều vận, Kinh doanh, Quản lý xe...) ➔ **`Lưu`**.
3. Cần phân quyền chi tiết từng chức năng: bấm **`Phân Quyền`** ➔ bật/tắt từng quyền (Xem, Thêm, Sửa, Xóa, Duyệt, Báo cáo) ➔ **`Lưu Phân Quyền`**.
4. Người dùng tải lại trang (F5) để kích hoạt quyền mới.

## B3. Khoản Mục Chi

**Nơi thực hiện:** Cài đặt ➔ Tài Chính & Quản Trị ➔ **Khoản Mục Chi**.
Dùng để phân loại chi phí phát sinh khi tài xế hoặc văn phòng kê chi: Nâng cont, Hạ cont, Cược vỏ, Cân xe, Bốc xếp, Vé cầu đường (BOT/ePass), Lưu ca, Sửa xe, Xăng dầu... Mỗi khoản mục quy định rõ: yêu cầu hóa đơn đỏ hay không, loại chi phí mặc định (Chi phí công ty, Công ty chi hộ, hay 3PL chi hộ).

## B4. Biểu Phí Lương Chuyến & Phụ Cấp – Kiểm Hóa

**Nơi thực hiện:** Cài đặt ➔ Tài Chính & Quản Trị ➔ **Biểu Phí Lương Chuyến** và **Phụ Cấp & Kiểm Hóa**.
Khai báo định mức lương khoán chuyến cho tài xế theo từng tuyến đường (nơi lấy cont ➔ nơi trả cont ➔ nơi hạ vỏ), loại cont (20ft, 40ft, kẹp 2x20ft) và phụ cấp kiểm hóa, phụ cấp lưu đêm sau 0h.

## B5. Cảng & Kho Bãi

**Nơi thực hiện:** Cài đặt ➔ Mạng Lưới & Địa Điểm ➔ **Cảng & Kho Bãi**.
Khai báo các cảng biển, ICD (Cát Lái, Cái Mép, Tân Vạn...), kho khách hàng, và depot hạ rỗng. Bắt buộc nhập Tên địa điểm, Địa chỉ, Khu vực (Hồ Chí Minh, Bình Dương, Đồng Nai, Bà Rịa - Vũng Tàu, Đắk Nông...).

## B6. Hãng Tàu

**Nơi thực hiện:** Cài đặt ➔ Mạng Lưới & Địa Điểm ➔ **Hãng Tàu**.
Khai báo các hãng tàu vận tải biển: Maersk, MSC, CMA-CGM, ONE, Evergreen, Yang Ming, Cosco, Hapag-Lloyd... Bao gồm mã hãng tàu, tên đầy đủ, địa chỉ văn phòng, hotline hỗ trợ gia hạn cược vỏ.

## B7. Khách Hàng

**Nơi thực hiện:** Cài đặt ➔ Khách Hàng & Đối Tác ➔ **Khách Hàng**.
Khai báo đối tác thuê vận chuyển: Mã khách hàng, Tên doanh nghiệp, MST, Địa chỉ, Người liên hệ, SĐT, Email nhận bảng kê SOA, Hạn mức công nợ (VNĐ), và Thời hạn thanh toán (ngày).

## B8. Biểu Cước Khách

**Nơi thực hiện:** Cài đặt ➔ Khách Hàng & Đối Tác ➔ **Biểu Cước Khách**.
Khai báo đơn giá cước vận chuyển ký với từng khách hàng theo từng tuyến đường và loại container. Cước này dùng để tự động áp vào chuyến xe khi hoàn tất, đảm bảo doanh thu cước chuẩn xác 100%.

## B9. Thầu Phụ & Nhà Cung Cấp (Vendor 3PL)

**Nơi thực hiện:** Cài đặt ➔ Khách Hàng & Đối Tác ➔ **Thầu Phụ & Nhà Cung Cấp**.
Khai báo các nhà xe đối tác vận chuyển ngoài: Mã nhà xe, Tên nhà xe, MST, Người điều hành, SĐT Zalo, Email nhận lệnh vận chuyển, Tài khoản ngân hàng thụ hưởng. Nhà xe được tạo sẽ xuất hiện trong danh sách phân bổ container và cổng Vendor Portal.

## B10. Đầu Kéo & Xe

**Nơi thực hiện:** Cài đặt ➔ Phương Tiện & Thiết Bị ➔ **Đầu Kéo & Xe**.
Khai báo biển số xe, loại xe (đầu kéo container, xe tải thùng), nhãn hiệu, năm sản xuất, tải trọng cho phép kéo theo, tài xế mặc định, ngày hết hạn đăng kiểm và ngày đến hạn bảo dưỡng định kỳ.

## B11. Rơ-Moóc

**Nơi thực hiện:** Cài đặt ➔ Phương Tiện & Thiết Bị ➔ **Rơ-Moóc**.
Khai báo biển số moóc, loại moóc (moóc xương 40ft, moóc cổ cò, moóc sàn 45ft, moóc lùn 2 trục/3 trục), tải trọng thiết kế và hạn đăng kiểm.

## B12. Quy Cách Cont & Xe

**Nơi thực hiện:** Cài đặt ➔ Phương Tiện & Thiết Bị ➔ **Quy Cách Cont & Xe**.
Danh mục các loại container chuẩn quốc tế: 20GP, 40GP, 40HC, 45HQ, Flat Rack, Reefer và các loại xe tải: 1.5T, 3.5T, 5T, 8T, 15T.

## B13. Số Dư Ban Đầu

**Nơi thực hiện:** Cài đặt ➔ Tài Chính & Quản Trị ➔ **Số Dư Ban Đầu**.
Khai báo số dư khởi tạo tại thời điểm bắt đầu đưa hệ thống vào vận hành: số dư Quỹ tiền mặt công ty, số dư từng Tài khoản ngân hàng, và số dư Quỹ tạm ứng giao cho điều phối viên.

---

# PHẦN C. HƯỚNG DẪN THAO TÁC THEO PHÂN HỆ

## C1. Dashboard Tổng quan

### QUY TRÌNH GIÁM SÁT & VẬN HÀNH DASHBOARD (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. CHỌN GÓC NHÌN & KỲ │ ───► │ 2. THEO DÕI 6 THẺ KPI │ ───► │ 3. GIÁM SÁT HÀNH TRÌNH│
│ • Góc nhìn Ban Giám Đốc│     │ • Doanh thu & Quỹ tiền│      │ • 7 mốc di chuyển cont │
│ • Kỳ: Hôm nay / Tháng │      │ • Xe chạy / Chờ xe    │      │ • Ma trận phân bổ xe  │
│                       │      │ • Cảnh báo DEM/DET    │      │ • Giãn sát đáy màn hình│
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 5. TÙY BIẾN GIAO DIỆN │ ◄─── │ 4. XỬ LÝ VIỆC CẦN LÀM │ ◄────────────────┘
│ • Cài đặt 4 vùng      │      │ • Công việc giao việc  │
│ • Kéo chỉnh độ rộng   │      │ • Đọc bản tin nội bộ  │
│ • Lưu theo trình duyệt│      │ • Phê duyệt nhanh     │
└───────────────────────┘      └───────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Người thực hiện | Thao tác trên phần mềm | Dữ liệu đầu vào | Kết quả đầu ra | Ràng buộc & Kiểm soát |
|---|---|---|---|---|---|
| **1** | Tất cả người dùng | Chọn **Góc nhìn** (Ban Giám Đốc, Điều vận, Kế toán, Kinh doanh, Đội xe) & chọn **Kỳ thời gian** | Phiên đăng nhập, ngày bắt đầu - ngày kết thúc | Toàn bộ dữ liệu 4 vùng Dashboard tự động lọc theo đúng phạm vi | Đúng góc nhìn giúp tập trung đúng chỉ số chuyên trách |
| **2** | Ban Giám Đốc / Trưởng phòng | Quan sát **6 Thẻ Chỉ Số Vận Hành** cốt lõi GSS | Số liệu tổng hợp realtime từ database | Nắm bắt: Tài chính & Quỹ, Doanh thu kế hoạch, Chuyến đang chạy, Tỷ lệ khai thác xe, Đơn chờ gán, **Cảnh báo DEM/DET** | Thẻ cảnh báo DEM/DET đếm ngược cont sắp/quá hạn |
| **3** | Điều phối viên | Mở Tab **Theo dõi hành trình** & **Ma trận nhà xe** | Dữ liệu GPS/mốc chặng do tài xế báo | Theo dõi vị trí từng xe qua 7 bước, xem cont theo từng nhà xe; bấm dòng xem chi tiết | Vùng hành trình tự động co giãn sát đáy màn hình khi ẩn vùng dưới |
| **4** | Nhân viên / Cán bộ | Kiểm tra khung **Công việc cần xử lý ngay** và **Bản tin** | Danh sách tasks được giao, thông báo khẩn | Bấm mở task hoàn tất checklist hoặc đề xuất gia hạn; đọc thông báo | Không bỏ sót nhiệm vụ quá hạn |
| **5** | Mọi người dùng | Bấm **`Cài đặt hiển thị`** hoặc nút **`Hiển thị`** từng vùng | Tùy chọn bật/tắt vùng, độ rộng 50/50, 60/40, tự do kéo | Giao diện tối ưu hóa riêng cho màn hình làm việc cá nhân | Cấu hình lưu tự động theo LocalStorage của trình duyệt |

**Chi tiết các tính năng đặc thù trên Dashboard:**

1. **Bố cục 4 vùng chuẩn mực:**
   - **Vùng 1 (KPI Strip):** 6 thẻ chỉ số trọng yếu. Bấm nút nhỏ chân thẻ để chuyển ngay đến phân hệ tương ứng. Thẻ số 6 cảnh báo rõ ràng số cont quá hạn DEM/DET và cont chờ gán xe.
   - **Vùng 2 (Hành trình chuyến xe):** Tab thông tin hành trình thời gian thực, ma trận nhà xe theo bước, tra cứu B/L và cont. Đặc biệt: **khi ẩn vùng phía dưới, vùng này tự động co giãn tối đa chạm sát đáy màn hình**, giúp điều phối viên quan sát toàn bộ đội xe mà không sinh thanh cuộn thừa.
   - **Vùng 3 (Biểu đồ phân tích):** Diễn biến Doanh thu - Chi phí - Lợi nhuận gộp theo ngày và cơ cấu đội xe / luồng hải quan. Hỗ trợ nút **`Tùy biến`** để tạo biểu đồ phân tích mới (xem C14).
   - **Vùng 4 (Tác vụ & Bản tin):** Danh sách công việc cần làm ngay (dạng List / Kanban) và bản tin truyền thông nội bộ.

## C2. Sale & Booking

### QUY TRÌNH KINH DOANH, BÁO GIÁ & TIẾP NHẬN B/L (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. TẠO BÁO GIÁ        │ ───► │ 2. THEO DÕI PHỄU SALE │ ───► │ 3. TIẾP NHẬN B/L & PO │
│ • Nhập khách hàng     │      │ • Đã gửi ➔ Đàm phán   │      │ • Tạo Booking đơn hàng│
│ • Tuyến cước / dầu P0 │      │ • Chờ ký ➔ Đã ký      │      │ • Hãng tàu, ETA, CutCY│
│ • Điều khoản mẫu      │      │ • In báo giá A4       │      │ • Hạn Free DEM / DET  │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 6. GỬI LỆNH & VENDOR  │ ◄─── │ 5. PHÂN BỔ NHÀ XE     │ ◄─── ┌───────────────────────┐
│ • Gửi email tự động   │      │ • Toolbar công thái học│     │ 4. DÁN / NHẬP CONT    │
│ • Link Vendor Portal  │      │ • Giao cont cho Vendor │      │ • Kiểm tra ISO 6346   │
│ • Chuyển sang Điều vận│      │ • Gán xe nội bộ        │      │ • Chuẩn hóa VGM (kg)  │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Người thực hiện | Thao tác trên phần mềm | Dữ liệu đầu vào | Kết quả đầu ra | Ràng buộc & Điểm kiểm soát |
|---|---|---|---|---|---|
| **1** | Nhân viên Sale | Vào **Sale & Booking** ➔ Tab 1 ➔ **`Tạo Báo Giá`** | Khách hàng, danh sách tuyến, loại cont, cước, giá dầu P0 | Bản ghi Báo giá mới với mã tự sinh | Đầy đủ điều khoản thương mại và hiệu lực báo giá |
| **2** | Sale / CSKH | Cập nhật giai đoạn phễu: Đang đàm phán ➔ Đã ký HĐ; bấm **`In`** | Phản hồi của khách hàng | Báo giá chuẩn A4 gửi khách; chuyển thành Hợp đồng hiệu lực | Báo giá Đã ký mới được tính vào doanh thu kế hoạch |
| **3** | CSKH / Sale | Chuyển Tab 2 ➔ **`Tạo Booking`** (hoặc nhận đơn từ B/L) | Số B/L (MBL/HBL), hãng tàu, tàu/chuyến, cảng lấy, kho trả, hạn Cut-off | Đơn hàng Booking được khởi tạo trạng thái *Chờ điều xe* | Cảnh báo đơn gấp nếu thời gian đóng hàng < 48 giờ |
| **4** | CSKH / Điều độ | Mở Booking ➔ bấm **`Nhập Cont (Dán / Excel)`** | Danh sách số container, số seal, VGM (kg) | Bảng container được nạp vào đơn hàng | **Tự động kiểm tra chuẩn ISO 6346**. Báo đỏ nếu sai mã cont. **VGM hiển thị số nguyên kg (`formatVgmKg`)** |
| **5** | Điều độ / CSKH | Áp dụng **Quy tắc DEM/DET** & Phân bổ container | Quy tắc hãng tàu, danh sách Nhà xe đối tác | Ngày hết hạn DEM/DET được gắn cho từng cont; cont được phân chia cho Nhà xe | **Thanh công cụ công thái học Fitts's Law**: nút giao xe nằm sát bên trái checkbox chọn cont; tìm kiếm nằm bên phải |
| **6** | Điều độ viên | Bấm **`✓ Giao Cho Nhà Xe`** ➔ bấm gửi email lệnh hoặc cấp link | Chọn Nhà xe phụ trách | Phiếu chia cont xuất hiện; link Vendor Portal được kích hoạt; gửi email kèm mẫu phiếu | Cont chuyển trạng thái đã phân bổ, sẵn sàng cho bước điều vận |

### C2.1. Lập báo giá & In báo giá

1. Mở **Sale & Booking** ➔ Tab **1. Báo Giá & Hợp Đồng** ➔ bấm **`Tạo Báo Giá`**.
2. Chọn khách hàng, chọn phương thức định giá:
   - *1. Theo tuyến đường cố định.*
   - *2. Có điều chỉnh theo biến động giá dầu DO 0.05S (nhập P0 cơ sở, bước nhảy và tỷ lệ điều chỉnh).*
   - *3. Trọn gói / bao chuyến định kỳ.*
3. Thêm các tuyến vận chuyển, nhập cự ly (km), đơn giá cước, sản lượng dự kiến/tháng.
4. Chọn giai đoạn: *1. Đã gửi báo giá* ➔ *2. Đang đàm phán* ➔ *3. Chờ ký* ➔ *4. Đã ký Hợp đồng*.
5. Bấm **`In`** để in theo 3 mẫu chuẩn: **Mẫu 1** Tiêu chuẩn đa tuyến, **Mẫu 2** Bảng cước đối tác, **Mẫu 3** Dự án chi tiết (ETA/ETD).

### C2.2. Tiếp nhận Booking theo B/L & Kiểm tra ISO 6346 Container

1. Mở Tab **2. Booking / Đơn Đặt Hàng** ➔ bấm **`Tạo Booking`**.
2. Nhập phân loại dịch vụ (Kéo cont nhập / xuất / nội địa), số B/L (Master Bill / House Bill), hãng tàu, lộ trình 3 điểm (Nơi lấy vỏ ➔ Kho đóng hàng ➔ Nơi hạ vỏ/cảng), hạn cắt máng CY Cut-off.
3. Nhập số ngày miễn phí Free DEM (lưu bãi) và Free DET (lưu vỏ).
4. **Nạp danh sách container:** mở chi tiết đơn hàng ➔ bấm **`Nhập Cont (Dán / Excel)`**.
   - Dán trực tiếp danh sách cont từ thông báo của hãng tàu hoặc tải file Excel mẫu.
   - Hệ thống tự động kiểm tra định dạng công te nơ quốc tế theo thuật toán **ISO 6346 (4 chữ cái + 7 chữ số, tính số kiểm tra Check Digit)**. Nếu số cont bị gõ sai ký tự, hệ thống đánh dấu cảnh báo ngay.
   - Nhập trọng lượng VGM dạng số nguyên (`kg`), hệ thống tự động làm tròn và định dạng rõ ràng, không hiển thị số thập phân thừa.

### C2.3. Công thái học phân bổ container cho Nhà xe (Fitts's Law)

Thanh công cụ container trên đơn Booking và Lệnh điều động được tối ưu theo Luật Fitts:
- **Cụm thao tác hàng loạt (Bên Trái):** nằm ngay sát cột Checkbox chọn cont, bao gồm: nhãn `Đã chọn: X cont`, danh sách chọn `Nhà xe đối tác (Vendor)`, nút `✓ Giao Cho Nhà Xe`, nút `✕ Hủy Giao`. Người dùng tích chọn cont và bấm giao ngay lập tức mà không phải lia chuột sang bên kia màn hình.
- **Cụm tra cứu & sắp xếp (Bên Phải):** ô tìm kiếm số cont/seal, bộ lọc trạng thái cont, dropdown sắp xếp và nút đặt lại.
- **Nút Toàn màn hình (`Fullscreen`):** phóng to toàn bộ bảng danh sách container ra hết màn hình, giúp thao tác duyệt hàng trăm container nhanh chóng mà không bị che khuất.

## C3. Điều vận

### QUY TRÌNH ĐIỀU ĐỘ, PHÁT LỆNH & KIỂM SOÁT HÀNH TRÌNH XE (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ TAB 1: LỆNH ĐIỀU ĐỘ   │ ───► │ TAB 2: PHÂN BỔ & GÁN  │ ───► │ TAB 3: THEO DÕI HÀNH  │
│ • Booking chưa phân bổ│      │ • Xem tiến độ từng xe │      │   TRÌNH (BẢNG / BƯỚC) │
│ • Chia cont cho Vendor│      │ • Gán đầu kéo, moóc,  │      │ • Giám sát 7 chặng    │
│ • Kiểm tra hạn cắt CY │      │   tài xế; mở Phiếu VC │      │ • Áp 17 KHÓA BẤT BIẾN │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ XỬ LÝ NGOẠI LỆ CHUYẾN │ ◄─── │ PHÁT LỆNH & GỬI LINK  │ ◄─── ┌───────────────────────┐
│ • Đổi tài xế (hủy link│      │ • Gửi Zalo / SMS      │      │ TAB 4: QUẢN LÝ VENDOR │
│ • Báo neo đêm sau 0h  │      │ • Gửi email mẫu phiếu │      │ • Cấp tài khoản/token │
│ • Ghi nhận sự cố OS&D │      │ • QR Code chuyến xe   │      │ • Đặt hạn/thu hồi link│
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Người thực hiện | Thao tác trên phần mềm | Dữ liệu đầu vào | Kết quả đầu ra | Ràng buộc & Điểm kiểm soát |
|---|---|---|---|---|---|
| **1** | Điều phối viên | Vào **Điều vận** ➔ Tab **Lệnh điều độ** | Danh sách Booking từ kinh doanh | Nắm bắt booking chưa phân bổ; bấm **`Xem`** để phân chia container | Không phát sinh lệnh trùng lặp cho một container |
| **2** | Điều phối viên | Chuyển Tab **Phân bổ & gán xe** ➔ bấm **`Gán tiếp`** | Danh sách cont đã giao cho nhà xe hoặc xe nội bộ | Gán Đầu kéo, Rơ-moóc, Bác tài phụ trách; khởi tạo chuyến xe | Nút **`Xem`** mở trực tiếp Chi tiết Phiếu Vận Chuyển (`viewTripDetail`); link Lệnh ĐĐ và Phiếu VC bấm được |
| **3** | Điều phối viên | Chọn hình thức phát lệnh: **Xe nhà** hoặc **Xe bạn 3PL** | Số điện thoại tài xế, email nhà xe, cước khoán | Phát lệnh qua Zalo/SMS và **Gửi email tự động** cho nhà xe kèm mẫu phiếu giao hàng HTML/PDF | Hệ thống cấp mã chuyến xe `GSS-...` và sinh link bảo mật `/q/<token>/` |
| **4** | Điều phối viên | Giám sát Tab **Theo dõi hành trình** (3 chế độ xem) | Tín hiệu cập nhật từ điện thoại tài xế | Bảng container, bảng Theo bước hành trình, hoặc bảng Phiếu VC cập nhật tiến độ | **17 KHÓA BẤT BIẾN:** Chặn sửa, xóa, hủy, bỏ gán khi xe đã chạy; cấm lùi bước |
| **5** | Điều phối viên | Mở Tab **Quản lý Vendor** | Danh sách đối tác nhà xe | Quản trị tài khoản, token nhà xe; gia hạn hoặc **Thu hồi link tài xế** | Mọi thao tác cấp lại/thu hồi đều ghi nhật ký kiểm toán `AuditLog` |
| **6** | Điều phối viên | Xử lý ngoại lệ chuyến (nếu có): Đổi tài xế, Báo neo đêm, Ghi nhận sự cố | Lý do phân lại xe, giờ neo xe, biên bản sự cố | Cập nhật chặng mới, link cũ của tài xế trước **bị vô hiệu hóa tức thì** | Phụ cấp neo đêm tự động đưa vào chi phí và lương tài xế |

### C3.1. Bốn tab làm việc chuẩn hóa của màn hình Điều vận

Thanh tab Điều vận được thiết kế tinh gọn với 4 tab chữ thường chuyên biệt:
1. **Lệnh điều độ:** Liệt kê các đơn booking (`BK...`) chưa phân bổ hoặc phân bổ chưa hết số cont. Điều độ bấm **`Xem`** để vào giao cont cho nhà xe.
2. **Phân bổ & gán xe:** Mỗi dòng hiển thị một nhà xe trong một lệnh điều động, thể hiện rõ tỷ lệ *đã gán xe / tổng số cont*.
   - **Nút `Xem` chuẩn xác:** Mở trực tiếp Chi tiết Phiếu Vận Chuyển (`viewTripDetail`) của container. Trường hợp container chưa gán xe, hệ thống bật cảnh báo hướng dẫn mở Lệnh Điều Động.
   - Cột **Lệnh Điều Động** (`dispatch_order_code`) và cột **Phiếu Vận Chuyển** (`trip_code`) đều là liên kết bấm được (clickable).
   - Duy trì nguyên vẹn ngữ cảnh Tab 2 khi quay lại từ màn hình chi tiết chuyến.
3. **Theo dõi hành trình:** Hiển thị toàn bộ các xe đã nhận lệnh và đang thực hiện hành trình. Hỗ trợ 3 chế độ xem: **Bảng container**, **Theo bước hành trình** (cột phân theo 7 mốc), và **Phiếu VC**.
4. **Quản lý Vendor & Tài xế (Tab 4):** Nơi quản trị tài khoản, token và link bảo mật của đối tác nhà xe và lái xe với cơ chế **Chủ động 100%**:
   - *Nút "Màn hình Vendor" (Xem & thao tác hộ):* Nằm trên thanh công cụ và từng dòng nhà xe/phiếu chia. Cho phép Điều vận 1-click mở trực tiếp Cổng Nhà Xe đối tác (tự động điền tài khoản & token qua Magic Link) để xem đúng những gì đối tác thấy, hướng dẫn sử dụng hoặc thao tác khai báo cont/xe/tài hộ nhà xe.
   - *Nút "Mở giao diện Tài xế" (Xem & thao tác hộ):* Nằm trên thanh công cụ và từng dòng chuyến xe. Cho phép Điều vận mở cửa sổ di động chuẩn kích thước smartphone (440x880) của Bác tài (`/q/<token>/`) để vừa điện thoại hướng dẫn tài xế vừa theo dõi màn hình, hoặc bấm xác nhận mốc chặng, tải ảnh chứng từ thay cho tài xế trong trường hợp khẩn cấp.
   - *Cấp Token xác nhận chủ động:* Điều vận có thể tự gõ mã Token theo ý muốn (ví dụ: `ANPHAT-2026`, `HP26`) hoặc bấm `Sinh mã` ngẫu nhiên; chủ động đặt thời hạn hiệu lực (`Vô thời hạn`, `30 ngày`, `90 ngày`, `1 năm`, `7 ngày` hoặc chọn ngày cụ thể).
   - *Tra cứu & Sao chép lại:* Mã token được mã hóa an toàn hai chiều, Điều vận có thể bấm icon con mắt xem mã hoặc sao chép lại bất kỳ lúc nào mà không cần reset làm gián đoạn nhà xe.
   - *Magic Link (Đăng nhập 1-chạm):* Sao chép đường link đăng nhập tự động điền Tên đăng nhập và Token dạng `/vendor/login/?u=...&t=...`.
   - *Mẫu tin nhắn Zalo 1-Click:* Nút `Zalo` tự động soạn sẵn nội dung tin nhắn gửi nhà xe (tài khoản, token, magic link) và gửi bác tài (chuyến xe, số cont, link QR di động).
   - *Link nhà xe:* sao chép link, cấp lại đặt hạn, khóa link hoặc thu hồi phiếu chia cont.
   - *Link tài xế (`/q/<token>/`):* đặt thời hạn link (theo ngày), cấp lại làm mới QR code (vô hiệu link cũ), hoặc thu hồi link ngay lập tức.

### C3.2. Mười bảy (17) Khóa Bất Biến Bảo Vệ Hành Trình Xe

Để đảm bảo tính toàn vẹn pháp lý và chống gian lận, hệ thống kích hoạt **17 khóa bất biến nghiêm ngặt**:
1. **Khóa xóa chuyến xe:** Chuyến xe đã chuyển trạng thái từ `READY` (đã nhận lệnh, đang di chuyển, đã đến kho, có POD...) **tuyệt đối không được xóa**.
2. **Khóa sửa biển số xe & tài xế trực tiếp:** Khi chuyến đã lăn bánh, không được sửa đè biển số hoặc tài xế; bắt buộc thực hiện qua quy trình **`Phân Xe / Tài Xế Khác`** có ghi nhận lý do.
3. **Khóa sửa lộ trình & địa điểm:** Lộ trình lấy cont, giao hàng và hạ rỗng đã phát lệnh bị khóa chặt; thay đổi lộ trình phải hủy chuyến (khi chưa chạy) hoặc tạo chặng phát sinh.
4. **Khóa bỏ gán container:** Container đang trong chuyến xe đang chạy không được phép gỡ ra khỏi lệnh hoặc gán sang chuyến khác.
5. **Khóa số container & seal khi đã hạ rỗng:** Khi đã hoàn tất hạ rỗng, số cont và seal là chứng từ lịch sử pháp lý bất biến.
6. **Khóa lùi bước hành trình:** Hành trình chỉ được đi tiến theo đúng thứ tự 7 bước; hệ thống chặn tuyệt đối việc bấm lùi bước trạng thái.
7. **Khóa nhảy cóc bước:** Không được nhảy cóc qua các bước bắt buộc mà chưa xác nhận mốc trước đó.
8. **Khóa hoàn tất khi thiếu chứng từ:** Các chặng Nhận cont, Giao hàng và Hạ rỗng bắt buộc phải có tối thiểu 1 ảnh chứng từ hợp lệ (EIR, POD) mới cho phép hoàn tất.
9. **Khóa giới hạn tệp đính kèm:** Mỗi chặng giới hạn tối đa 10 tệp chứng từ, ngăn chặn tải tệp rác làm tràn bộ nhớ.
10. **Khóa link tài xế khi đổi người:** Ngay khi điều độ phân tài xế mới, link truy cập `/q/<token>/` của tài xế cũ bị khai tử ngay lập tức.
11. **Khóa link khi hết hạn:** Link tài xế quá thời hạn thiết lập hoặc sau khi hoàn tất chuyến quá thời gian quy định sẽ tự động đóng và hiện thông báo thu hồi.
12. **Khóa chi phí khi kế toán đã chốt sổ:** Bảng kê chi phí chuyến khi đã có xác nhận chốt sổ đối soát của kế toán sẽ chuyển sang chế độ **Read-Only**, cấm sửa/xóa dưới mọi hình thức.
13. **Khóa tự động tính lương:** Lương chuyến chỉ được tính tự động từ các chuyến xe có trạng thái đã hoàn tất hợp lệ.
14. **Khóa đơn giá cước:** Đơn giá cước lấy tự động từ Biểu cước khách hàng hiệu lực tại ngày thực hiện, không cho phép sửa tùy tiện trong view vận hành.
15. **Khóa cách ly doanh nghiệp (Tenant Isolation):** Dữ liệu chuyến, tài xế, chi phí được bảo vệ bằng PostgreSQL Row-Level Security, không bao giờ lộ giữa các công ty.
16. **Khóa địa chỉ bảo mật (Public ID):** Toàn bộ link gửi ra ngoài dùng UUIDv7 hoặc HMAC token, không để lộ khóa số ID nội bộ.
17. **Khóa nhật ký kiểm toán (Audit Trail):** Mọi thao tác can thiệp ngoại lệ, cấp lại link, mở lại sổ sách đều tự động ghi vết kiểm toán vĩnh viễn kèm IP và người thực hiện.

### C3.3. Phát lệnh xe nhà, Xe bạn 3PL & Chạy cắt kéo

- **Xe nhà:** Chọn tài xế, hệ thống tự động điền đầu kéo và rơ-moóc mặc định của tài xế đó. Bấm **`Xác Nhận & Phát Lệnh Zalo`**, hệ thống tự copy nội dung lệnh và mở Zalo số điện thoại bác tài.
- **Xe bạn 3PL:** Chọn Nhà xe đối tác ➔ chọn đầu kéo và tài xế của nhà xe (hoặc gõ nhanh nếu mới) ➔ nhập cước khoán thỏa thuận ➔ hệ thống tạo chuyến và chuyển sang luồng quyết toán 3PL cho kế toán.
- **Gửi email tự động cho nhà xe:** Tại Lệnh điều động, điều độ bấm nút **`Gửi Lệnh Email`**. Hệ thống tự động gửi email cho nhà xe đối tác kèm mẫu phiếu giao hàng HTML/PDF có mã QR tra cứu.
- **Chạy cắt kéo (2 tài xế):** Bật công tắc *Cắt kéo (2 tài)* ➔ chọn tài xế chặng 1 (kéo từ cảng về kho) và tài xế chặng 2 (kéo từ kho đi hạ rỗng) ➔ chọn tỷ lệ thù lao (50-50, 60-40, 70-30...). Hệ thống tự động chia lương chuyến theo đúng tỷ lệ khi kế toán tính lương.

### C3.4. Cập nhật neo đêm sau 0h & Phí lưu xe

Khi xe phải chờ tại kho hoặc cảng qua đêm: mở chuyến ➔ khối Quản lý Free DEM/DET ➔ bấm **`Cập Nhật Neo Đêm`** ➔ nhập giờ hẹn hạ, giờ hạ thực tế, lý do neo xe, số tiền phụ phí thu khách và phụ cấp trả tài xế. Tích chọn *Tự động tạo khoản chi phí phụ cấp tài xế* để hệ thống tự cộng vào bảng lương tài xế.

## C4. Cổng tài xế trên điện thoại (Driver Portal)

### QUY TRÌNH 7 MỐC THAO TÁC TRÊN ĐIỆN THOẠI BÁC TÀI (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. MỞ LINK / QUÉT QR  │ ───► │ 2. XÁC NHẬN CHUYẾN    │ ───► │ 3. LẤY CONT / HÀNG    │
│ • Nhận link qua Zalo  │      │ • Xem lộ trình 3 điểm │      │ • Chụp giám định vỏ   │
│ • Không cần mật khẩu  │      │ • Bấm 'Nhận Chuyến'   │      │ • Chụp phiếu EIR nhận │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 6. HẠ RÕNG & KÊ PHÍ   │ ◄─── │ 5. KÝ E-POD TẠI KHO   │ ◄─── ┌───────────────────────┐
│ • Chụp phiếu EIR hạ   │      │ • Thủ kho ký lên màn  │      │ 4. VÀO DOCK ĐÓNG/DỠ   │
│ • Chụp vé BOT, nâng hạ│      │   hình điện thoại     │      │ • Check-in cổng kho   │
│ • Hoàn tất chuyến     │      │ • Chụp ảnh biên bản   │      │ • Vào dock bốc hàng   │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Người thực hiện | Thao tác trên điện thoại | Hành động thực tế | Chứng từ bắt buộc nộp |
|---|---|---|---|---|
| **1** | Bác tài | Mở link điều độ gửi qua Zalo / SMS hoặc quét QR trên phiếu | Đọc thông tin nơi lấy cont, kho khách, hạn giờ hẹn | Không có |
| **2** | Bác tài | Bấm nút lớn **`XÁC NHẬN NHẬN CHUYẾN`** | Xác nhận sẵn sàng xe và sức khỏe để chạy | Không có |
| **3** | Bác tài | Bấm **`XUẤT PHÁT ĐI LẤY CONT / HÀNG`** ➔ Bấm **`Chụp Chứng Từ`** | Di chuyển vào cảng/bãi lấy cont, kiểm tra tình trạng vỏ cont | Ảnh chụp phiếu **EIR lấy cont**, ảnh tình trạng vỏ và seal |
| **4** | Bác tài | Bấm **`ĐÃ ĐẾN CỔNG KHO — CHECK-IN`** ➔ Bấm **`VÀO DOCK — BẮT ĐẦU ĐÓNG/DỠ`** | Xe đến kho hàng, bảo vệ cân xe và điều vào cửa dock | Giờ check-in ghi nhận tự động |
| **5** | Bác tài & Thủ kho | Bấm **`HÀNG ĐÃ XONG`** ➔ Đưa điện thoại cho thủ kho bấm **`Thủ Kho Ký E-POD`** | Thủ kho ký tay trực tiếp lên màn hình cảm ứng, gõ họ tên | Chữ ký điện tử **E-POD** và ảnh chụp biên bản bàn giao |
| **6** | Bác tài | Bấm **`VẬN CHUYỂN VỀ BÃI HẠ CONT`** ➔ Bấm **`ĐÃ HẠ CONT — LẤY PHIẾU EIR`** | Xe kéo cont rỗng về depot/cảng hạ vỏ | Ảnh chụp phiếu **EIR hạ cont** |
| **7** | Bác tài | Bấm **`Kê Chi Phí`** ➔ Nhập các khoản phát sinh dọc đường | Nộp vé cầu đường BOT, phí nâng hạ, cân xe... | Ảnh chụp vé BOT / hóa đơn điện tử / mã tra cứu |

**Đặc điểm vượt trội của Cổng tài xế GSS:**
- **Không cần cài app, không cần tài khoản:** Chạy trực tiếp trên trình duyệt mọi dòng máy (iPhone, Android).
- **Watermark & GPS thời gian thực:** Ảnh chứng từ chụp trực tiếp từ camera được tự động đóng dấu tọa độ GPS, thời gian chụp thực tế và mã chuyến xe, chống gian lận dùng ảnh cũ.
- **Ký nhận điện tử E-POD:** Thủ kho ký trực tiếp bằng ngón tay lên màn hình, lưu trữ tức thì lên hệ thống, khách hàng xem được ngay tại link tra cứu.
- **Chế độ Ngoại tuyến (Offline Sync Queue):** Khi xe vào vùng mất sóng (cảng kín, kho vùng sâu), tài xế vẫn bấm mốc và chụp ảnh bình thường. Dữ liệu được lưu trong bộ nhớ máy và tự động đồng bộ lên máy chủ ngay khi có mạng trở lại.

## C5. Cổng nhà xe (Vendor Portal) & Link tra cứu khách hàng

### C5.1. Cổng nhà xe đối tác (Vendor Portal - `/vendor/<token>/`)

#### QUY TRÌNH NHÀ XE TỰ PHỤC VỤ & GÁN XE TRÊN CỔNG VENDOR (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. NHẬN LINK / TOKEN  │ ───► │ 2. ĐĂNG NHẬP CỔNG     │ ───► │ 3. GÁN ĐẦU XE & TÀI XẾ│
│ • Nhận qua Zalo/Email │      │ • Giao diện chuẩn TMS │      │ • Chọn xe có sẵn      │
│ • Link bảo mật có hạn │      │ • Theo dõi 4 thẻ KPI  │      │ • Hoặc nhập Excel lô  │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 6. TỰ KHÓA SAU 7 NGÀY │ ◄─── │ 5. THEO DÕI TIẾN ĐỘ   │ ◄─── ┌───────────────────────┐
│ • Đóng link tự động   │      │ • Hỗ trợ tài xế mốc   │      │ 4. XUẤT LỆNH & QR     │
│ • Lưu trữ đối soát 3PL│      │ • Giám sát hạ rỗng    │      │ • In phiếu vận chuyển │
│                       │      │                       │      │ • Gửi QR cho bác tài  │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Người thực hiện | Thao tác trên phần mềm | Dữ liệu đầu vào | Kết quả đầu ra | Ràng buộc & Điểm kiểm soát |
|---|---|---|---|---|---|
| **1** | Điều phối GSS | Tab 4 Điều vận ➔ bấm **`Đặt Token`** hoặc **`Cấp tài khoản`** | Thông tin nhà xe đối tác | Chủ động tự đặt mã Token hoặc sinh mã, đặt hạn dùng (Vô thời hạn, 30/90/365 ngày), tạo Magic Link 1-chạm | Token được mã hóa an toàn, Điều vận xem và sao chép lại bất kỳ lúc nào, ghi vết kiểm toán |
| **2** | Điều độ Nhà xe | Mở link trên máy tính/điện thoại | Đường dẫn được cấp | Truy cập giao diện Topbar trắng sáng hiện đại chuẩn GSS | Hiển thị đúng danh sách cont được GSS phân bổ |
| **3** | Điều độ Nhà xe | Chọn cont ➔ Gán Đầu kéo, Rơ-moóc, Bác tài (hoặc bấm **`Nhập Excel`**) | Danh sách xe và tài xế của nhà xe | Container được gắn xe thực hiện | Không thấy giá cước bán của GSS hay thông tin bảo mật khách hàng |
| **4** | Điều độ Nhà xe | Bấm nút **`Lệnh QR`** hoặc **`In Phiếu`** | Dữ liệu chuyến đã gán | Xuất phiếu vận chuyển hoặc gửi link QR cho tài xế của mình | Bác tài nhà xe thao tác trên Cổng tài xế chuẩn |
| **5** | Điều độ Nhà xe | Theo dõi bảng tiến độ; bấm cập nhật mốc thay tài xế nếu sự cố | Báo cáo từ tài xế qua điện đàm | Cập nhật chặng di chuyển của xe | Hỗ trợ điều hành kịp thời khi tài xế gặp khó khăn |
| **6** | Hệ thống GSS | Tự động giám sát thời hạn | Trạng thái hoàn tất chuyến | Khóa quyền chỉnh sửa sau khi hoàn tất; link tự hủy sau 7 ngày | Bảo mật dữ liệu lịch sử vận tải |

### C5.2. Link tra cứu hành trình cho khách hàng (Public Tracking - `/q/tracking/<token>/`)

#### QUY TRÌNH TRA CỨU HÀNH TRÌNH KHÁCH HÀNG (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. ĐIỀU ĐỘ GỬI LINK   │ ───► │ 2. KHÁCH MỞ TRA CỨU   │ ───► │ 3. XEM E-POD & HOÀN TẤT│
│ • Chi tiết chuyến xe  │      │ • Không cần đăng nhập │      │ • Xem chữ ký thủ kho  │
│ • Bấm 'Link Gửi Khách'│      │ • Tiến độ 6 chặng     │      │ • Tải biên bản POD    │
│ • Gửi Zalo / Email KH │      │ • Vị trí và thời gian │      │ • Đánh giá dịch vụ    │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

- **Tiện ích cho khách hàng:** Khách hàng mở link tra cứu trực tiếp mà không cần tạo tài khoản hay ghi nhớ mật khẩu.
- **Tiến độ 6 mốc trực quan:** *Tiếp nhận đơn ➔ Đã điều xe ➔ Đã đến kho ➔ Đã nhận hàng ➔ Đang vận chuyển ➔ Giao hàng thành công (có E-POD)*.
- **Bảo mật tuyệt đối:** Link khách hàng **hoàn toàn không hiển thị chi phí nội bộ, cước thầu phụ hay số điện thoại riêng của tài xế**, chỉ hiển thị thông tin phục vụ giao nhận hàng hóa.

## C6. Hành chính & Nhân sự

### QUY TRÌNH QUẢN TRỊ NHÂN SỰ & TÍNH LƯƠNG HYBRID (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. HỒ SƠ NHÂN SỰ      │ ───► │ 2. HỢP ĐỒNG LAO ĐỘNG  │ ───► │ 3. CHẤM CÔNG THÁNG    │
│ • Thông tin, CCCD, MST│      │ • Lương căn bản, BHXH │      │ • Khởi tạo 26 công    │
│ • GPLX (cảnh báo 30N) │      │ • Phụ cấp, giảm trừ   │      │ • Chấm X, P, L, Ro    │
│ • Phân loại chức vụ   │      │ • Ký phụ lục điều chỉnh│     │ • Khóa bảng chấm công │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 6. CHI LƯƠNG & NGÂN HÀNG◄─── │ 5. DUYỆT & KHÓA SỔ    │ ◄─── ┌───────────────────────┐
│ • Tự lập Phiếu Chi quỹ│      │ • Điều chỉnh thưởng   │      │ 4. TÍNH LƯƠNG TỰ ĐỘNG │
│ • Xuất Excel Bank     │      │ • Khóa sổ (cấm tính lại)│     │ • Lương công + Lương  │
│ • In phiếu lương cá nhân     │ • In bảng lương tổng  │      │   chuyến (tài xế)     │
└───────────────────────┘      └───────────────────────┘      │ • Trừ tạm ứng & BHXH  │
                                                              └───────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Người thực hiện | Thao tác trên phần mềm | Dữ liệu đầu vào | Kết quả đầu ra | Ràng buộc & Điểm kiểm soát |
|---|---|---|---|---|---|
| **1** | Nhân viên Nhân sự | Vào **Hành chính & Nhân sự** ➔ Tab 1 ➔ **`Thêm Nhân Sự`** | CCCD, SĐT, Email, Bằng lái GPLX, chức vụ | Hồ sơ nhân sự mới | Bắt buộc chức vụ `Tài xế & Giao nhận` đối với bác tài; cảnh báo GPLX hết hạn trước 30 ngày |
| **2** | Nhân viên Nhân sự | Chuyển Tab 2 ➔ **`Tạo Hợp Đồng`** | Loại HĐ, Lương CB, Lương đóng BHXH, phụ cấp | Hợp đồng lao động có hiệu lực; in bản A4 | Căn cứ pháp lý để tính lương ngày công và trích nộp bảo hiểm |
| **3** | Nhân sự / Chấm công | Chuyển Tab 3 ➔ **`Khởi Tạo Công Tự Động`** | Chọn kỳ chấm công, danh sách nhân sự | Bảng chấm công 26 ngày chuẩn | Cập nhật ngày nghỉ phép (P), lễ (L), không lương (Ro) |
| **4** | Kế toán tiền lương | Chuyển Tab 4 ➔ **`Tính Lương Tự Động`** | Bảng chấm công + Dữ liệu chuyến xe hoàn tất | Bảng lương Hybrid chi tiết từng nhân viên | Tự động tổng hợp lương chuyến tài xế từ Điều vận và trừ các khoản tạm ứng chưa hoàn |
| **5** | Kế toán trưởng | Kiểm tra bảng lương, điều chỉnh thưởng/phạt ➔ **`Khóa Sổ`** | Ý kiến phê duyệt của Giám đốc | Kỳ lương chuyển trạng thái *Đã chốt sổ* | Sau khi khóa sổ, không được phép chạy tính lại lương |
| **6** | Thủ quỹ / Kế toán | Bấm **`Chi Trả Lương (Sổ Quỹ)`** ➔ Bấm **`Xuất Excel Bank`** | Số tài khoản, ngân hàng thụ hưởng | Hệ thống tự lập 01 Phiếu Chi trên Sổ Quỹ; file chuyển khoản ngân hàng | In phiếu lương cá nhân gửi cho từng người lao động |

### C6.1. Quản lý hồ sơ nhân sự & Cảnh báo hạn GPLX

- Hồ sơ nhân sự lưu trữ toàn diện: sơ yếu lý lịch, CCCD, mã số thuế cá nhân, số tài khoản ngân hàng, quá trình công tác.
- **Cảnh báo hạn bằng lái GPLX và HĐLĐ 30 ngày:** Trên thanh chỉ số và bảng nhân sự tự động làm nổi bật các tài xế sắp hết hạn bằng lái xe để phòng Nhân sự kịp thời thông báo đi đổi bằng, tránh rủi ro pháp lý khi lưu thông trên đường.

### C6.2. Mô hình tính lương kết hợp (Hybrid Payroll)

Hệ thống tính lương theo công thức tích hợp:
$$	ext{Thực Lĩnh Net} = 	ext{Lương Ngày Công} + 	ext{Lương Chuyến} + 	ext{Phụ Cấp Neo Đêm/Kiểm Hóa} + 	ext{Thưởng KPI} - 	ext{BHXH (10,5\%)} - 	ext{Thuế TNCN} - 	ext{Tạm Ứng Chưa Quyết Toán}$$
- **Đối với văn phòng:** Lương tính theo ngày công thực tế và hiệu quả công việc.
- **Đối với tài xế:** Tự động quét toàn bộ chuyến xe hoàn tất trong kỳ để lấy lương chuyến khoán, cộng lương phụ cấp neo đêm (chờ sau 0h), phụ cấp kiểm hóa, và tự động đối chiếu trừ các khoản tạm ứng chuyến chưa hoàn tất thủ tục hoàn ứng.

## C7. Tài chính & Kế toán

### QUY TRÌNH QUẢN TRỊ DÒNG TIỀN, TẠM ỨNG & QUYẾT TOÁN CÔNG NỢ (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. SỔ QUỸ THU - CHI   │      │ 2. TẠM ỨNG 2 CẤP      │      │ 3. CHỐT SỔ CHUYẾN XE  │
│ • Lập Phiếu Thu (PT)  │      │ • Cấp 1: Cty ➔ Quỹ ĐV │      │ • Tab 4: Quyết toán TX│
│ • Lập Phiếu Chi (PC)  │      │ • Cấp 2: Quỹ ĐV ➔ Tài │      │ • Khóa chi phí chuyến │
│ • Quỹ TM & Ngân hàng  │      │ • Hoàn ứng thừa / thiếu│     │ • Chuyển Read-Only    │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 6. QUYẾT TOÁN GOM     │ ◄─── │ 5. QUYẾT TOÁN 3PL     │ ◄─── ┌───────────────────────┐
│ • Gom nhiều chuyến    │      │ • Tab 7: Xe thuê ngoài│      │ 4. QUYẾT TOÁN KH (SOA)│
│ • Đối soát 1-chạm     │      │ • Đối chiếu cước khoán│      │ • Tab 5: Chốt nợ khách│
│ • Tự lập phiếu bù trừ │      │ • Tự lập Phiếu Chi    │      │ • Tab 6: Debit Note   │
└───────────────────────┘      └───────────────────────┘      │ • Tách riêng chi hộ   │
                                                              └───────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Người thực hiện | Thao tác trên phần mềm | Dữ liệu đầu vào | Kết quả đầu ra | Ràng buộc & Điểm kiểm soát |
|---|---|---|---|---|---|
| **1** | Kế toán thanh toán | Tab 1 ➔ **`Lập Phiếu Thu`** / **`Lập Phiếu Chi`** | Chứng từ gốc, số tiền, tài khoản | Mã phiếu `PT-...` / `PC-...` tự sinh; in mẫu S03a-DN | Cập nhật tức thì số dư Quỹ tiền mặt và Ngân hàng |
| **2** | Điều độ & Kế toán | Tab 3 (Quỹ điều vận) ➔ Tab 2 (Tạm ứng tài xế) | Đề nghị tạm ứng chuyến đi đường | Cấp tiền cho bác tài; số tiền hiện trên điện thoại tài xế | Quyết toán hoàn ứng tự động sinh Phiếu Thu (nộp lại) hoặc Phiếu Chi (bù thiếu) |
| **3** | Kế toán đối soát | Tab 4 ➔ Kiểm tra chi phí chuyến ➔ **`Quyết Toán`** | Hóa đơn, vé BOT, phiếu EIR nộp về | Chuyến xe chuyển trạng thái *Đã chốt sổ chi phí (Khóa)* | Chi phí chuyến bị khóa, cấm sửa xóa; xác nhận P&L chuyến |
| **4** | Kế toán công nợ | Tab 5 ➔ Chọn các chuyến của khách ➔ **`Chốt SOA`** | Danh sách chuyến xe hoàn tất | Lên công nợ phải thu; in Bảng kê vận chuyển 26 cột | **Bất biến:** Khoản chi hộ được tách riêng sang Tab 6 |
| **5** | Kế toán công nợ | Tab 6 ➔ Gom các khoản chi hộ ➔ **`Lập Debit Note`** | Phí nâng hạ, cược cont công ty chi hộ | Bảng Debit Note gửi khách; bấm thu tiền tự sinh Phiếu Thu | Không tính trùng vào doanh thu vận tải chịu thuế |
| **6** | Kế toán thanh toán | Tab 7 ➔ Chọn chuyến xe bạn ➔ **`Quyết Toán 3PL`** | Hợp đồng khoán xe ngoài, hóa đơn nhà xe | Xác nhận cước trả xe bạn; tự động sinh Phiếu Chi trả đối tác | Hoàn trả đầy đủ các khoản 3PL đã chi hộ |
| **7** | Kế toán trưởng | Bấm **`⚡ Quyết Toán Gom Chuyến`** (màn hình `/settlements`) | Nhóm theo Tài xế / Khách hàng / Xe | Quyết toán hàng loạt hàng chục chuyến xe chỉ với 1-chạm | Tự động cân đối bù trừ chênh lệch, tiết kiệm 90% thời gian |

### C7.1. Sổ quỹ: Lập phiếu thu, phiếu chi (Mẫu S03a-DN)

- Lập phiếu thu, phiếu chi đầy đủ thông tin: đối tác, lý do hạch toán, số tiền, tài khoản ngân hàng hoặc quỹ tiền mặt.
- Bản in chuẩn theo chế độ kế toán doanh nghiệp (mẫu 2 liên A4 hoặc A5), có đầy đủ chữ ký: Giám đốc, Kế toán trưởng, Thủ quỹ, Người lập phiếu và Người nộp/nhận tiền.
- Nhiều phiếu được **hệ thống tự động lập**: chi trả lương, hoàn ứng chuyến, thanh toán xe 3PL, thu hồi Debit Note chi hộ.

### C7.2. Tạm ứng hai cấp & Quyết toán hoàn ứng

- **Cấp 1 (Công ty ➔ Quỹ Điều vận):** Công ty xuất một khoản quỹ hạn mức cho điều phối viên trực ca để chủ động ứng tiền cho đội xe.
- **Cấp 2 (Quỹ Điều vận ➔ Tài xế):** Điều phối viên trích từ quỹ để cấp tạm ứng cho từng chuyến xe.
- **Quyết toán hoàn ứng:** Khi chuyến xe hoàn tất, kế toán bấm *Nạp từ chứng từ chuyến*, hệ thống tự động so sánh giữa số tiền đã tạm ứng và tổng chi phí thực tế tài xế đã kê:
  - Nếu tạm ứng > thực chi: tài xế nộp lại tiền thừa ➔ hệ thống tự động sinh **Phiếu Thu**.
  - Nếu thực chi > tạm ứng: công ty chi trả bù cho tài xế ➔ hệ thống tự động sinh **Phiếu Chi**.

### C7.3. Quyết toán khách hàng (SOA) & Tách riêng Debit Note chi hộ

- **Bất biến tài chính:** Chi phí chi hộ (nâng hạ, cược vỏ cont...) tuyệt đối không gộp chung vào doanh thu cước vận chuyển để tránh sai lệch doanh thu chịu thuế và sai lệch lợi nhuận gộp.
- **Debit Note chi hộ:** Gom các khoản chi hộ theo từng khách hàng, xuất bảng kê chi hộ chi tiết đính kèm hóa đơn cảng gửi cho khách. Khi khách thanh toán, bấm *Xác nhận hoàn tiền 1-chạm*, hệ thống tự động hạch toán thu hồi vào sổ quỹ.

## C8. Xe & Bãi

### QUY TRÌNH BẢO TRÌ PHƯƠNG TIỆN & VẬN HÀNH BÃI DEPOT (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. HỒ SƠ XE & MOÓC    │ ───► │ 2. CẢNH BÁO ĐĂNG KIỂM │ ───► │ 3. BẢO DƯỠNG & SỬA XE │
│ • Biển số, tải trọng  │      │ • Hạn kiểm định 30N   │      │ • Cập nhật lịch bảo trì│
│ • Tài xế mặc định     │      │ • Hạn bảo hiểm TNDS   │      │ • Chuyển trạng thái   │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 6. CONT XUẤT BÃI      │ ◄─── │ 5. QUẢN LÝ BÃI DEPOT  │ ◄─── ┌───────────────────────┐
│ • Quét QR xuất bãi    │      │ • Vị trí hàng, ô bãi  │      │ 4. CONT VÀO BÃI DEPOT │
│ • Kiểm tra phiếu EIR  │      │ • Báo cáo tồn bãi     │      │ • Xe đến cổng bãi     │
│ • Hoàn tất lượt xe    │      │ • Cảnh báo lưu bãi quá│      │ • Quét mã QR cont     │
└───────────────────────┘      └───────────────────────┘      │ • Ghi nhận ảnh vỏ     │
                                                              └───────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Người thực hiện | Thao tác trên phần mềm | Dữ liệu đầu vào | Kết quả đầu ra | Ràng buộc & Điểm kiểm soát |
|---|---|---|---|---|---|
| **1** | Quản lý Đội xe | Vào **Xe & Bãi** ➔ Tab 1 (Đầu kéo) hoặc Tab 2 (Rơ-moóc) | Cà-vẹt xe, sổ đăng kiểm, bảo hiểm | Bản ghi phương tiện sẵn sàng vận hành | Gán tài xế mặc định để tự động điền khi điều xe |
| **2** | Cán bộ kỹ thuật | Quan sát các thẻ chỉ số trên cùng | Dữ liệu ngày hết hạn | Danh sách xe quá hạn đăng kiểm, sắp hết hạn trong 30 ngày | Không phân công điều vận các xe đã quá hạn đăng kiểm |
| **3** | Cán bộ kỹ thuật | Bấm sửa xe ➔ đổi trạng thái sang *Hư hỏng / Bảo trì* | Biên bản nghiệm thu sửa chữa | Xe tạm thời bị ẩn khỏi danh sách gợi ý phát lệnh | Đảm bảo an toàn tuyệt đối khi lưu thông |
| **4** | Thủ bãi Depot | Xe chở cont đến bãi ➔ Mở chức năng **Quét QR / Nhập Bãi** | Mã container, ảnh chụp 4 mặt vỏ cont | Lượt xe vào bãi được ghi nhận, gán tọa độ ô bãi | **Quy tắc bãi:** Mỗi cont chỉ nằm bãi tại 1 vị trí ở một thời điểm |
| **5** | Thủ bãi Depot | Kiểm tra bảng tồn bãi container | Danh sách cont đang hạ bãi | Nắm bắt số lượng vỏ rỗng có sẵn để cấp cho hàng xuất | Theo dõi hạn lưu bãi để tránh phát sinh chi phí lưu bãi |
| **6** | Thủ bãi Depot | Xe đến lấy cont ➔ Bấm **Xuất Bãi** (quét QR) | Phiếu cấp rỗng, biển số xe kéo | Ghi nhận giờ rời bãi, xuất hóa đơn nâng hạ (nếu có) | Giờ xuất bãi không được trước giờ nhập bãi |

## C9. Dịch vụ Hải quan

### QUY TRÌNH KHAI BÁO & THÔNG QUAN HÀNG HÓA (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. NHẬN BỘ HỒ SƠ      │ ───► │ 2. TẠO TỜ KHAI VNACCS │ ───► │ 3. PHÂN LUỒNG & THEO DÕI
│ • Invoice, PackingList│      │ • Số tờ khai, loại hình│     │ • Xanh: Thông quan ngay│
│ • Vận đơn B/L, C/O    │      │ • Chi cục mở tờ khai  │      │ • Vàng: Thẩm định hồ sơ│
│ • Đăng ký kiểm tra    │      │ • Gắn Mã chuyến xe GSS│      │ • Đỏ: Kiểm hóa thực tế │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 5. HOÀN TẤT THỦ TỤC   │ ◄─── │ 4. KHAI THUẾ & PHÍ    │ ◄────────────────┘
│ • Thông quan chính thức│     │ • Thuế XNK, thuế VAT  │
│ • In phiếu theo dõi   │      │ • Phí kiểm hóa chi hộ │
│ • Lưu trữ hồ sơ điện tử│     │ • Nộp thuế điện tử    │
└───────────────────────┘      └───────────────────────┘
```

**Bảng chi tiết các bước:**

| Bước | Người thực hiện | Thao tác trên phần mềm | Dữ liệu đầu vào | Kết quả đầu ra | Ràng buộc & Điểm kiểm soát |
|---|---|---|---|---|---|
| **1** | Nhân viên Hải quan | Tiếp nhận chứng từ từ khách hàng hoặc phòng Kinh doanh | Hóa đơn thương mại, hợp đồng ngoại thương, B/L | Kiểm tra tính hợp lệ của bộ hồ sơ hải quan | Đối chiếu mã HS Code và biểu thuế nhập khẩu |
| **2** | Nhân viên Hải quan | Vào **Dịch vụ Hải quan** ➔ bấm **`Thêm Tờ Khai`** | Số tờ khai VNACCS, ngày mở, loại hình (A11, A12, E21...) | Bản ghi tờ khai được khởi tạo; **gắn Mã chuyến xe GSS** | Tài xế thấy được tình trạng tờ khai trên điện thoại |
| **3** | Nhân viên Hải quan | Cập nhật kết quả phân luồng Hải quan | Kết quả phản hồi từ hệ thống Hải quan | Trạng thái: **Luồng Xanh**, **Luồng Vàng**, hoặc **Luồng Đỏ** | Luồng đỏ: lên kế hoạch bốc cont vào bãi kiểm hóa |
| **4** | Nhân viên Hải quan | Khai báo tiền thuế và các khoản phí phát sinh | Biên lai thuế hải quan, phí nâng hạ kiểm hóa | Hạch toán nghĩa vụ thuế; ghi nhận khoản chi hộ kiểm hóa | Chuyển khoản chi hộ sang kế toán thu hồi khách |
| **5** | Nhân viên Hải quan | Bấm **`Đã Thông Quan`** ➔ Đính kèm file tờ khai đã đóng dấu | Tờ khai thông quan chính thức (PDF/ảnh) | Hồ sơ hoàn tất; xe được phép rời cảng/kho | Thông báo cho Điều vận và CSKH để giải phóng hàng |

## C10. Báo cáo & Thống kê

### QUY TRÌNH KHAI THÁC & XUẤT BÁO CÁO ĐA CHIỀU (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. CHỌN KỲ BÁO CÁO    │ ───► │ 2. CHỌN NHÓM BÁO CÁO  │ ───► │ 3. XEM BÁO CÁO & LỌC  │
│ • Hôm nay / Tuần này  │      │ • Doanh thu thực hiện │      │ • Tùy biến cột ẩn/hiện│
│ • Tháng / Quý / Năm   │      │ • Kinh doanh & Khách  │      │ • Lọc khách hàng, xe  │
│ • Khoảng ngày tùy chọn│      │ • Tài chính & Quản trị│      │ • Sắp xếp tăng / giảm │
│                       │      │ • Xe & Vận hành       │      │                       │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 5. ĐỐI SOÁT CÔNG NỢ   │ ◄─── │ 4. XUẤT EXCEL & IN A4 │ ◄────────────────┘
│ • Bảng kê SOA đối tác │      │ • Tải file .xlsx chuẩn │
│ • Bảng kê 26 cột VAT  │      │ • In A4 khổ ngang/dọc │
│ • Chốt nợ khách hàng  │      │ • Đầy đủ ô ký pháp lý │
└───────────────────────┘      └───────────────────────┘
```

**Hệ thống 17 báo cáo quản trị chia thành 4 nhóm chiến lược:**
1. **Doanh thu thực hiện (4 báo cáo):** Doanh thu theo đội xe, Doanh thu theo khách hàng, Chi phí chuyến phát sinh (bảng kê chi hộ), Quyết toán chuyến xe.
2. **Kinh doanh & Khách hàng (3 báo cáo):** Hiệu quả báo giá và tỷ lệ chốt sale, Tiến độ đơn hàng & booking, Danh sách đơn chưa hoàn thành (WIP).
3. **Tài chính & Quản trị (6 báo cáo):** Công nợ phải thu (AR theo tuổi nợ), Tuổi đơn tồn đọng chưa chốt sổ, Quỹ tạm ứng điều vận, Báo cáo tạm ứng & chi phí tài xế, Bảng lương chuyến & tài xế, Báo cáo quyết toán xe thầu phụ 3PL.
4. **Xe & Vận hành (4 báo cáo):** Quản lý vỏ cont & hạn DEM/DET hãng tàu, Tỷ lệ đúng giờ & chất lượng dịch vụ OTP, Chạy cắt kéo & xe neo đêm sau 0h, Biên bản ngoại lệ & sự cố vận tải (OS&D).

- **Xuất bảng kê vận chuyển tháng (Mẫu 26 cột):** Tại báo cáo Công nợ phải thu, bấm **`Bảng Kê`** để tạo bảng kê vận chuyển container 26 cột tiêu chuẩn có thuế VAT (10%, 8%, 0%), sẵn sàng xuất Excel gửi cho khách hàng ký tá đóng dấu.

## C11. Giao việc (Tasks)

### QUY TRÌNH GIAO VIỆC, THỰC HIỆN & NGHIỆM THU (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. PHÁT LỆNH GIAO VIỆC│ ───► │ 2. TIẾP NHẬN & XỬ LÝ  │ ───► │ 3. THỰC HIỆN CHECKLIST│
│ • Tên việc, phòng ban │      │ • Nhận thông báo chuông│     │ • Tích hoàn thành mục │
│ • Người làm, theo dõi │      │ • Xem hạn chót (+1d..)│      │ • Đính kèm ảnh/file   │
│ • Checklist, file đính│      │ • Kéo thẻ trên Kanban │      │ • Thảo luận nội bộ    │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
                                                                          │
┌───────────────────────┐      ┌───────────────────────┐                  ▼
│ 5. NGHIỆM THU ĐÓNG TASK◄─── │ 4. ĐỀ XUẤT GIA HẠN    │ ◄────────────────┘
│ • Người giao duyệt    │      │ • (Nếu trễ) Nhập lý do│
│ • Hoàn thành nhiệm vụ │      │ • Người giao Duyệt/Từ │
│ • Lưu vết lịch sử     │      │   chối gia hạn hạn mới│
└───────────────────────┘      └───────────────────────┘
```

- **Màn hình làm việc linh hoạt:** Chuyển đổi mượt mà giữa dạng **Kanban** (Cần làm ➔ Đang làm ➔ Chờ nghiệm thu ➔ Hoàn thành) và dạng **Danh sách**.
- **Đề xuất gia hạn thông minh:** Khi công việc có nguy cơ chậm tiến độ, người phụ trách bấm *Đề xuất gia hạn*, nhập lý do chính đáng và thời hạn mới. Người giao việc nhận thông báo và có quyền Đồng ý hoặc Từ chối kèm phản hồi.

## C12. Bản tin & Thông báo nội bộ

### QUY TRÌNH BIÊN TẬP & PHỔ BIẾN THÔNG BÀO NỘI BỘ (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. SOẠN THẢO BẢN TIN  │ ───► │ 2. XUẤT BẢN THÔNG BÁO │ ───► │ 3. CÁN BỘ ĐỌC TIN     │
│ • Tiêu đề, danh mục   │      │ • Ghim đầu trang      │      │ • Xem tệp đính kèm    │
│ • Nội dung chi tiết   │      │ • Bật cảnh báo Khẩn   │      │   trực tiếp trình duyệt│
│ • Đính kèm PDF, ảnh...│      │ • Phân quyền phòng ban│      │ • Bình luận thảo luận │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

- **Xem trước file tức thì:** Tệp đính kèm (PDF, Word, Excel, ảnh) được xem trước ngay trên trình duyệt mà không cần tải về máy tính.
- **Thảo luận tương tác:** Cán bộ nhân viên có thể gửi bình luận, đặt câu hỏi dưới từng bài viết để ban lãnh đạo giải đáp trực tiếp.

## C13. Chat nội bộ & Chuông thông báo

### QUY TRÌNH GIAO TIẾP TỨC THỜI & NHẬN THÔNG BÁO (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. MỞ BONG BÓNG CHAT  │ ───► │ 2. GỬI TIN & ĐÍNH KÈM │ ───► │ 3. CHUÔNG THÔNG BÁO   │
│ • Góc dưới bên phải   │      │ • Gửi ảnh hiện trường │      │ • Nhận cảnh báo lệnh  │
│ • Chọn đồng nghiệp    │      │ • Tag thành viên (@)  │      │ • Bấm đi tới chi tiết │
│ • Chat 1-1 / Nhóm     │      │ • Chèn mã task (#)    │      │ • Đánh dấu đã đọc     │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

- **Tích hợp sâu:** Khung chat cho phép gõ `@` để nhắc tên đồng nghiệp và `#` để chèn liên kết trực tiếp tới một công việc đang xử lý.
- **Chuông thông báo thời gian thực:** Cập nhật ngay khi có lệnh điều xe mới, phát sinh sự cố, có người duyệt tạm ứng, hoặc có bình luận mới.

## C14. Biểu đồ tùy biến trên Dashboard

### QUY TRÌNH TẠO BIỂU ĐỒ PHÂN TÍCH THEO NHU CẦU (WORKFLOW)

```text
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│ 1. MỞ BỘ DỰNG BIỂU ĐỒ │ ───► │ 2. CHỌN DỮ LIỆU & TRỤC│ ───► │ 3. CHỌN LOẠI & XEM    │
│ • Dashboard ➔ Tùy biến│      │ • Bảng: Chuyến / Phí..│      │ • Cột, Đường, Donut   │
│ • Chọn nguồn dữ liệu  │      │ • Phân nhóm: Khách/Xe │      │ • Xem trước trực tiếp │
│                       │      │ • Phép tính: SUM/AVG..│      │ • Áp dụng lên màn hình│
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

- Cho phép người dùng tự do thiết lập biểu đồ theo nhu cầu phân tích riêng mà không cần biết lập trình. Bấm **`Mặc định`** trên Dashboard để quay về biểu đồ chuẩn bất kỳ lúc nào.

---

# PHẦN D. HỎI ĐÁP & XỬ LÝ SỰ CỐ THƯỜNG GẶP

## D1. Khi tạo lệnh, ô Tài xế hoặc Đầu kéo không có tên cần chọn?
- **Nguyên nhân:** Tài xế chưa được phân chức vụ `Tài xế & Giao nhận` trong hồ sơ nhân sự, hoặc đầu kéo đang ở trạng thái *Hư hỏng / Bảo trì*.
- **Cách xử lý:** Vào **Hành chính & Nhân sự ➔ Hồ sơ nhân sự**, kiểm tra chức vụ của tài xế. Vào **Xe & Bãi**, kiểm tra tình trạng đầu kéo có đang khả dụng không.

## D2. Chọn "Chi phí công ty", "Công ty chi hộ" hay "3PL chi hộ"?
- **Chi phí công ty:** Công ty tự chịu (vé cầu đường BOT, chi phí cân xe...). Làm giảm lợi nhuận chuyến.
- **Công ty chi hộ:** Công ty trả trước thay khách (phí nâng hạ cảng, cược vỏ cont...). Không làm giảm lợi nhuận chuyến; tự động chuyển sang danh sách lập **Debit Note** thu hồi tiền từ khách.
- **3PL chi hộ:** Tài xế xe bạn (thuê ngoài) tự ứng tiền thanh toán. Sẽ được cộng hoàn trả lại cho nhà xe khi kế toán làm quyết toán 3PL.

## D3. Vì sao không xóa được khách hàng, xe, khoản mục chi…?
- Hệ thống áp dụng **Quy tắc bảo toàn dữ liệu pháp lý**: Bản ghi đã từng phát sinh giao dịch, hợp đồng, lệnh điều xe hoặc chứng từ kế toán sẽ bị chặn xóa cứng. Hãy chuyển trạng thái sang *Ngừng hoạt động / Tạm khóa* thay vì xóa.

## D4. In báo giá, lệnh xe, phiếu thu chi bị lệch, mất màu?
- Khi hộp thoại in của trình duyệt hiện lên, mở mục **Cài đặt khác (More settings)**:
  - Tích chọn ô **Đồ họa nền (Background graphics)** để in đầy đủ màu sắc và viền bảng.
  - Chọn tỷ lệ **Mặc định (Default)** hoặc **100%**.
  - Đặt lề trang là **Tối thiểu (Minimum)** hoặc **Không có (None)**.

## D5. Tài xế mất vé BOT hoặc quên chụp POD?
- Điều độ hoặc tài xế ghi nhận báo sự cố trên chuyến. Tài xế nộp bản kê giải trình, kế toán kiểm tra lịch trình GPS và định mức vé BOT tuyến để xem xét duyệt chi hoặc yêu cầu lấy xác nhận từ trạm thu phí.

## D6. Tài xế báo link không mở được / link đã khóa?
- **Nguyên nhân:** Link đã quá thời hạn sử dụng, chuyến xe đã hoàn tất quá thời gian quy định, hoặc điều phối viên vừa thao tác đổi tài xế khác.
- **Cách xử lý:** Điều phối viên vào **Điều vận ➔ Tab 4 (Quản lý Vendor)** ➔ tìm chuyến xe của tài xế ➔ bấm **`Cấp lại`** hoặc **`Đặt hạn`** để gia hạn thêm ngày sử dụng.

## D7. Nhập Excel bị lỗi hoặc thiếu dòng?
- Tải lại file mẫu chuẩn từ nút **`Tải Mẫu Excel`** trên màn hình. Giữ nguyên định dạng tiêu đề cột, không xóa các cột bắt buộc, lưu file dưới đuôi `.xlsx` chuẩn và kiểm tra không để trống các trường mã đối tác.

## D8. Lương chuyến của tài xế lấy từ đâu?
- Lương chuyến được tự động lấy từ danh mục **Biểu Phí Lương Chuyến** (mục B4) dựa theo cặp lộ trình Lấy cont - Trả cont - Hạ rỗng của chuyến xe. Nếu chuyến chạy cắt kéo, hệ thống tự động chia theo tỷ lệ thỏa thuận (50-50, 60-40...).

## D9. Vì sao số trên Dashboard / báo cáo khác với số tôi nghĩ?
- Kiểm tra lại **Bộ lọc kỳ thời gian** (Hôm nay, Tháng này, Tùy chọn ngày) và **Góc nhìn phòng ban**. Hãy bấm nút **`Làm Mới`** để cập nhật dữ liệu mới nhất từ máy chủ.

## D10. Màn hình báo "Bạn không có quyền truy cập chức năng này"?
- Bạn đang truy cập vào tính năng ngoài phạm vi phân quyền của nhóm vai trò tài khoản. Hãy liên hệ Quản trị viên hệ thống để được kiểm tra và cấp quyền trong **Cài đặt ➔ Vai Trò & Phân Quyền**.

## D11. Quên mật khẩu?
- Liên hệ Quản trị viên hệ thống để được đặt lại mật khẩu khởi tạo mới, hoặc dùng chức năng Quên mật khẩu tại trang đăng nhập nếu tài khoản đã đăng ký email xác thực.
