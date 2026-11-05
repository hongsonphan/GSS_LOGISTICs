# SỔ TAY HƯỚNG DẪN SỬ DỤNG GSS LOGISTICS

**Quy trình vận hành & cẩm nang thao tác từng màn hình — Phiên bản v1.1 (10/2026)**

> **GSS LOGISTICS - GREEN SOLUTIONS SMART** · Liên hệ quản trị viên hệ thống GSS để được hỗ trợ
>
> Tra cứu trực tuyến trong phần mềm: bấm nút **Trợ giúp** trên thanh trên cùng, hoặc mở đường dẫn `/helps` của hệ thống

**Cách đọc sổ tay này:**

- Người mới: đọc **Phần A** (15 phút) để biết cách dùng chung mọi màn hình, rồi đọc phần của phòng ban mình ở **Phần C**.
- Quản trị / người triển khai: làm theo **Phần B** để khai báo danh mục trước khi chạy thật.
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
  - [C5. Link tra cứu hành trình cho khách hàng](#c5-link-tra-cứu-hành-trình-cho-khách-hàng)
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
  - [D2. Chọn "Chi phí công ty", "Công ty chi hộ" hay "3PL chi hộ"?](#d2-chọn-chi-phí-tvl-tvl-chi-hộ-hay-3pl-chi-hộ)
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

**Đăng nhập:** mở địa chỉ phần mềm ➔ nhập **Tên đăng nhập** và **Mật khẩu** do quản trị viên cấp ➔ bấm **`Đăng nhập`**. Tài xế **không cần tài khoản** – tài xế làm việc qua đường link chuyến xe (xem mục C4).

**Bố cục màn hình:**

| Khu vực | Vị trí | Dùng để |
|---|---|---|
| Thanh menu trái (Sidebar) | Bên trái | Chuyển giữa các phân hệ. Bấm biểu tượng ô vuông ở đầu thanh để ghim mở / thu gọn. Bạn chỉ thấy những menu được phân quyền. |
| Thanh trên cùng (Topbar) | Phía trên | Tên màn hình đang mở, nút **`Trợ giúp`**, **chuông thông báo**, và **ảnh đại diện** (hồ sơ cá nhân). |
| Vùng làm việc | Giữa | Thẻ chỉ số (KPI) ➔ các tab ➔ bộ lọc ➔ bảng dữ liệu. |
| Bong bóng chat | Góc dưới phải | Nhắn tin nội bộ với đồng nghiệp (mục C13). |

**Các menu chính** (thứ tự trên Sidebar):

| Menu | Đường dẫn | Ai thường dùng |
|---|---|---|
| Dashboard Tổng quan | `/` | Tất cả – Ban Giám Đốc theo dõi tổng thể |
| Sale & Booking | `/sales` | Kinh doanh, CSKH |
| Điều vận | `/dispatch` | Điều vận / điều độ |
| Xe & Bãi | `/fleet` | Bảo trì vận hành |
| Hành chính & Nhân sự | `/hr` | Hành chính – Nhân sự, Kế toán lương |
| Tài chính & Kế toán | `/accounting` | Kế toán |
| Dịch vụ Hải quan | `/customs` | Phòng Hải quan |
| Báo cáo & Thống kê | `/reports` | Ban Giám Đốc, trưởng bộ phận |
| Cài đặt | `/settings` | Quản trị hệ thống |

Ngoài ra: **Giao việc** (`/tasks`) và **Bản tin** (`/news`) mở từ khung tương ứng trên Dashboard; **Quyết toán gom chuyến** (`/settlements`) mở từ Điều vận hoặc Kế toán.

**Đổi thông tin cá nhân / mật khẩu:** bấm ảnh đại diện góc phải trên ➔ **`Cài đặt tài khoản`** ➔ bấm **`Sửa`** ➔ sửa Họ tên, Email, Số điện thoại; muốn đổi mật khẩu thì nhập **Mật khẩu hiện tại**, **Mật khẩu mới**, **Xác nhận mật khẩu mới** (để trống nếu không đổi) ➔ **`Lưu`**. Tên đăng nhập do quản trị viên cấp, không tự đổi được.

**Đăng xuất:** ảnh đại diện ➔ **`Đăng xuất`**.

## A2. Thao tác chung trên mọi bảng dữ liệu

Mọi danh sách (báo giá, booking, chuyến xe, phiếu thu chi, nhân sự…) đều dùng chung một kiểu thao tác:

| Thành phần | Cách dùng |
|---|---|
| Thẻ chỉ số phía trên | Tóm tắt nhanh số lượng / số tiền của kỳ đang chọn. Một số thẻ bấm được để lọc nhanh. |
| Ô **Kỳ** | Chọn **Hôm nay / 10 ngày qua / Tháng này / Quý này / Năm nay / Tất cả** – bảng và thẻ chỉ số tự cập nhật. |
| Các ô lọc (Khách hàng, Trạng thái, Tài xế…) | Chọn giá trị để thu hẹp danh sách. Dòng **Hiển thị: x / y** cho biết đang hiện bao nhiêu dòng trên tổng số. |
| Nút **`Đặt lại`** | Xóa toàn bộ bộ lọc, trở về danh sách đầy đủ. |
| Bấm vào **tiêu đề cột** | Sắp xếp tăng / giảm dần theo cột đó. |
| Nút **`Cột`** | Mở hộp **Tùy Chỉnh Cột Hiển Thị**: bỏ tích để ẩn cột, kéo biểu tượng ⋮⋮ hoặc bấm mũi tên lên/xuống để đổi thứ tự, **`Mặc định`** để khôi phục, **`Hoàn tất`** để đóng. Cấu hình được trình duyệt ghi nhớ riêng cho bạn. Cột có khóa là cột bắt buộc, không ẩn được. |
| Nút **`Xuất Excel`** | Tải danh sách đang lọc về máy dưới dạng Excel. |
| Nút **`Làm Mới`** | Tải lại dữ liệu mới nhất từ máy chủ. |
| Cột **STT** | Đánh số thứ tự các dòng đang hiển thị (sau khi lọc). |
| Nút **`Xem`** ở cuối dòng | Mở màn hình chi tiết của bản ghi. |
| Nút **`In`** (biểu tượng máy in) ở cuối dòng | In nhanh chứng từ của dòng đó (báo giá, booking, phiếu thu/chi, phiếu tạm ứng, hợp đồng, phiếu lương…). |

## A3. Thao tác chung trên màn hình chi tiết

Khi bấm **`Xem`** hoặc **`Tạo mới`**, hệ thống mở màn hình chi tiết toàn trang. Thanh công cụ phía trên có:

| Nút | Ý nghĩa |
|---|---|
| **`Back`** / **`Quay lại`** | Trở về danh sách, giữ nguyên bộ lọc đang dùng. |
| **`Sửa`** | Mở khóa các ô để chỉnh sửa (màn hình chi tiết mở ra ở chế độ chỉ xem). |
| **`Lưu`** | Lưu thay đổi. Nếu thiếu ô bắt buộc (\*), hệ thống báo đỏ ô đó và không lưu. |
| **`In`** | Mở bản in chuẩn A4/A5 của chứng từ. |
| **`Xóa`** | Xóa bản ghi. Hệ thống luôn hỏi xác nhận. Dữ liệu đã phát sinh chứng từ liên quan sẽ không xóa được (xem D3). |

**Mẹo nhập liệu dùng ở nhiều nơi:**

- **Ô chọn có tìm kiếm:** gõ vài chữ để lọc danh sách (khách hàng, địa điểm, tài xế…). Nếu chưa có trong danh mục, nhiều ô có nút **`Tạo mới`** ngay bên cạnh để thêm nhanh mà không phải rời màn hình.
- **Nút giờ nhanh** (08:00, 13:00, 17:00, 23:59…) bên dưới ô ngày giờ: bấm để điền giờ ngay.
- **Đính kèm file:** kéo thả file vào ô, bấm để chọn file, hoặc chụp màn hình rồi bấm **`Dán Ảnh (Ctrl+V)`**. Hỗ trợ JPG, PNG, PDF.
- **Ô số tiền:** chỉ cần gõ số, hệ thống tự thêm dấu phân cách hàng nghìn.

## A4. Bức tranh tổng thể: một đơn hàng đi qua hệ thống như thế nào

| Bước | Việc cần làm | Ai làm | Ở đâu |
|---|---|---|---|
| 0 | Khai báo danh mục: khách hàng, địa điểm, xe, tài xế, biểu cước… | Quản trị / các phòng | Cài đặt, Nhân sự |
| 1 | Lập **Báo giá**, theo dõi đến khi khách ký hợp đồng | Kinh doanh | Sale & Booking ➔ Tab 1 |
| 2 | Tiếp nhận **Booking / Đơn đặt hàng** của khách | Kinh doanh / CSKH | Sale & Booking ➔ Tab 2 |
| 3 | Tạo **Lệnh điều xe**, gán xe & tài xế, phát lệnh qua Zalo | Điều vận | Điều vận ➔ `Tạo mới` |
| 4 | (Nếu cần) cấp **Tạm ứng chuyến** cho tài xế | Điều vận / Kế toán | Tài chính & Kế toán ➔ Tab 2 |
| 5 | Tài xế mở link, **báo mốc**, chụp **EIR / POD**, kê **chi phí** | Tài xế | Cổng tài xế trên điện thoại |
| 6 | Theo dõi tiến độ, xử lý sự cố, đổi tài xế, kiểm tra chi phí | Điều vận | Chi tiết chuyến xe |
| 7 | **Quyết toán hoàn ứng** với tài xế, **chốt sổ** chi phí chuyến | Kế toán | Tài chính & Kế toán ➔ Tab 2, 4 |
| 8 | **Quyết toán khách hàng (SOA)**, lập **Debit Note** chi hộ, thu tiền | Kế toán | Tài chính & Kế toán ➔ Tab 5, 6, 1 |
| 9 | **Quyết toán xe thầu phụ 3PL** (nếu thuê xe ngoài) | Kế toán | Tài chính & Kế toán ➔ Tab 7 |
| 10 | Tính **lương** (lương ngày công + lương chuyến – tạm ứng) và chi lương | Nhân sự / Kế toán | Hành chính & Nhân sự ➔ Tab 3, 4 |
| 11 | Xem **báo cáo** lãi lỗ, công nợ, hiệu suất | Ban Giám Đốc | Báo cáo & Thống kê |

## A5. Vai trò & quyền truy cập

Mỗi tài khoản gắn với một nhân sự có **Phòng ban** và **Chức vụ** (khai báo trong Hồ sơ nhân sự). Quyền xem menu / thao tác được cấp tại **Cài đặt ➔ Khai Báo Ban Đầu ➔ Vai Trò & Phân Quyền** (mục B2).

| Phòng ban | Chức vụ có sẵn | Phạm vi công việc chính |
|---|---|---|
| Ban Giám Đốc | Giám Đốc | Xem toàn bộ, duyệt chi lương, theo dõi báo cáo |
| Phòng Hành Chính & Kế Toán | Chuyên viên Phụ trách (HC & Kế toán), Nhân viên (HC & Kế toán) | Sổ quỹ, tạm ứng, quyết toán, công nợ, nhân sự, lương |
| Phòng Điều Vận | Chuyên viên Phụ trách (Điều vận), Nhân viên Điều vận, Nhân viên Hỗ trợ (Điều vận), Tài xế & Giao nhận | Lập lệnh, phân xe, theo dõi chuyến, quỹ điều vận |
| Phòng Kinh Doanh | Chuyên viên Phụ trách (Kinh doanh), Nhân viên Kinh doanh, Admin / CSKH | Báo giá, booking, khách hàng |
| Phòng Bảo Trì Vận Hành | Chuyên viên Phụ trách (Bảo trì vận hành), Nhân viên Bảo trì | Đầu kéo, rơ-moóc, đăng kiểm, bảo dưỡng |
| Phòng Dịch Vụ Hải Quan | Chuyên viên Phụ trách (Dịch vụ hải quan), Nhân viên xử lý (Hải quan) | Tờ khai, phân luồng, thuế |

> Nếu bạn không thấy một menu, hoặc gặp thông báo *"Bạn không có quyền truy cập chức năng này"*, hãy liên hệ quản trị viên để được cấp quyền (xem D10).

## A6. Việc hằng ngày theo vai trò (dành cho người mới)

| Vai trò | Đầu ngày | Trong ngày | Cuối ngày / cuối kỳ |
|---|---|---|---|
| **Kinh doanh / CSKH** | Xem thẻ *Số đơn gấp* và *Cảnh báo đơn gấp* ở Sale & Booking | Lập báo giá (C2.1), cập nhật giai đoạn phễu (C2.2), nhập booking mới (C2.3) | Kiểm tra booking *Chờ điều xe* đã được điều vận nhận chưa |
| **Điều vận** | Lọc chuyến *Chờ nhận lệnh*, *Cảnh báo rủi ro* ở Điều vận | Tạo lệnh từ booking (C3.1), gửi Zalo, theo dõi mốc, xác nhận thay tài xế, đổi xe, xử lý sự cố (C3.4–C3.7) | Kiểm tra POD / EIR đã đủ, chi phí đã kê đủ; đề nghị quỹ điều vận khi số dư thấp (C7.2) |
| **Tài xế** | Mở link chuyến trên Zalo, bấm *Nhận chuyến* | Bấm từng mốc, chụp EIR / seal / POD, kê chi phí (C4) | Hạ cont, chụp EIR hạ; nộp hóa đơn để quyết toán tạm ứng |
| **Kế toán** | Xem 4 thẻ quỹ ở Tài chính & Kế toán | Lập phiếu thu chi (C7.1), duyệt quỹ, cấp tạm ứng (C7.2–C7.3) | Quyết toán hoàn ứng, chốt sổ chuyến, chốt SOA khách, lập Debit Note, quyết toán 3PL (C7.3–C7.9) |
| **Nhân sự** | Xem *Cảnh báo hạn 30N* (GPLX & HĐLĐ) | Cập nhật hồ sơ, hợp đồng (C6.1–C6.2) | Cuối tháng: tạo kỳ lương, chấm công, tính lương, khóa sổ (C6.3–C6.4) |
| **Bảo trì xe** | Xem *Cảnh báo hạn kiểm* và *Bảo trì & BH* ở Xe & Bãi | Cập nhật trạng thái xe / moóc, ngày bảo trì kế tiếp (C8) | Gia hạn đăng kiểm, bảo hiểm khi có giấy tờ mới |
| **Ban Giám Đốc** | Dashboard góc nhìn *Ban Giám Đốc* (C1) | Theo dõi việc cần xử lý, bản tin | Xem báo cáo lãi lỗ, công nợ, OTP (C10); duyệt chi lương (C6.4) |

---

# PHẦN B. CÀI ĐẶT BAN ĐẦU (DANH MỤC GỐC)

## B0. Màn hình Cài đặt & thứ tự khai báo khuyến nghị

**Nơi thực hiện:** Menu **Cài đặt**. Màn hình chia **5 nhóm** (hàng nút trên cùng), mỗi nhóm có các tab con:

| Nhóm | Các tab con |
|---|---|
| Khai Báo Ban Đầu | Thông Tin Công Ty · Vai Trò & Phân Quyền |
| Tài Chính & Quản Trị | Số Dư Ban Đầu · Khoản Mục Chi · Biểu Phí Lương Chuyến · Phụ Cấp & Kiểm Hóa |
| Khách Hàng & Đối Tác | Khách Hàng · Biểu Cước Khách · Thầu Phụ & Nhà Cung Cấp |
| Mạng Lưới & Địa Điểm | Cảng & Kho Bãi · Hãng Tàu |
| Phương Tiện & Thiết Bị | Đầu Kéo & Xe · Rơ-Moóc · Quy Cách Cont & Xe |

**Thao tác chung trên mọi tab danh mục:**

1. Chọn nhóm ➔ chọn tab con.
2. Bấm **`Tạo mới`** ➔ điền thông tin ➔ **`Lưu`**.
3. Sửa: bấm **`Xem`**/biểu tượng bút ở dòng cần sửa ➔ **`Sửa`** ➔ **`Lưu`**.
4. Ngừng dùng một mục: bỏ tích **Đang hoạt động / Đang sử dụng** thay vì xóa – mục đó không còn xuất hiện trong các ô chọn nhưng lịch sử vẫn giữ nguyên.
5. Dùng ô **Bộ lọc**, ô tìm kiếm và **Số dòng / trang** (20–100) để tra cứu; nút **`Cột`** để ẩn/hiện cột.

**Nhập hàng loạt từ Excel** (áp dụng cho mọi danh mục trừ Thông tin công ty và Phân quyền):

1. Bấm **`Tải Mẫu Excel`** để lấy file mẫu đúng cấu trúc của tab đang mở.
2. Điền dữ liệu vào file mẫu (giữ nguyên dòng tiêu đề; mỗi mã / biển số chỉ xuất hiện một lần).
3. Bấm **`Nhập Excel`** ➔ chọn **Bảng danh mục đích cần nhập** ➔ chọn file `.xlsx` (tối đa 15MB).
4. Tích **Cập nhật dữ liệu nếu đã tồn tại mã (Upsert)** nếu muốn ghi đè dòng trùng mã; bỏ tích thì hệ thống bỏ qua dòng trùng và chỉ thêm dòng mới.
5. Bấm **`Bắt Đầu Nhập Dữ Liệu`** và chờ thông báo kết quả.
6. **`Xuất File`** để tải toàn bộ danh mục hiện có ra Excel.

**Thứ tự khai báo khuyến nghị khi bắt đầu dùng phần mềm** (mục sau dùng dữ liệu của mục trước):

1. Thông Tin Công Ty (B1)
2. Hồ sơ nhân sự & tài xế – tại menu Hành chính & Nhân sự (C6)
3. Vai Trò & Phân Quyền cho từng tài khoản (B2)
4. Cảng & Kho Bãi (B5), Hãng Tàu (B6)
5. Khách Hàng (B7), Thầu Phụ & Nhà Cung Cấp (B9)
6. Quy Cách Cont & Xe (B12), Đầu Kéo & Xe (B10), Rơ-Moóc (B11)
7. Biểu Cước Khách (B8), Biểu Phí Lương Chuyến (B4), Phụ Cấp & Kiểm Hóa (B4)
8. Khoản Mục Chi (B3), Số Dư Ban Đầu (B13)

## B1. Thông Tin Công Ty

**Nơi thực hiện:** Cài đặt ➔ Khai Báo Ban Đầu ➔ **Thông Tin Công Ty** ➔ **`Hiệu Chỉnh Thông Tin`** / **`Sửa`**.
**Dùng để:** in tự động lên báo giá, booking, lệnh điều xe, phiếu thu chi, biên bản POD, bảng kê công nợ.

| Nhóm thông tin | Ô nhập | Ghi chú / ví dụ |
|---|---|---|
| 1. Pháp lý & định danh | Tên Pháp Nhân Đầy Đủ \* | `CÔNG TY TNHH CUNG ỨNG GIẢI PHÁP XANH` |
| | Tên Thương Hiệu / Viết Tắt | `Green Solutions Supply Co., Ltd.` |
| | Mã Số Thuế (MST) \* | 10 hoặc 13 số |
| | Giấy Phép KD Vận Tải | Số giấy phép kinh doanh vận tải |
| | Người Đại Diện & Chức Vụ | Họ tên + chức vụ (mặc định *Giám Đốc*) – in ở ô ký duyệt |
| 2. Trụ sở & liên hệ | Địa Chỉ Trụ Sở Chính \* | Theo đăng ký kinh doanh |
| | Hotline / Điện Thoại \* | In trên mọi chứng từ |
| | Email Liên Hệ, Website Công Ty | |
| 3. Chi nhánh / VP đại diện | Tên, Điện thoại, Địa chỉ chi nhánh | Không bắt buộc |
| 4. Bãi đỗ xe & trạm điều phối | Tên bãi, Hotline trực bãi, Địa chỉ bãi | Bãi tập kết đầu kéo của công ty |
| 5. Tài khoản ngân hàng | Số Tài Khoản, Tên Ngân Hàng, Chi Nhánh | In trên báo giá, bảng kê để khách chuyển khoản |
| 6. Tham số vận hành mặc định | Thuế VAT Mặc Định (%), Giá Dầu Tham Chiếu (VNĐ/lít), Mẫu Số Quy Đổi CBM | Dùng làm giá trị mặc định khi lập báo giá |
| 7. Ghi chú & chính sách | Ghi Chú Vận Hành / Tiêu Chuẩn Phục Vụ | Quy định chung, ví dụ phụ phí ngoài giờ |

## B2. Vai Trò & Phân Quyền

**Nơi thực hiện:** Cài đặt ➔ Khai Báo Ban Đầu ➔ **Vai Trò & Phân Quyền**.
**Dùng để:** quyết định mỗi tài khoản thấy menu nào, được thêm / sửa / xóa / duyệt gì và xem được báo cáo nào.

Bảng hiển thị danh sách tài khoản: Họ tên / Nhân sự, Tài khoản, Số điện thoại, **Nhóm vai trò**, Quyền Admin, Trạng thái, Đăng nhập cuối.

**Cách cấp quyền:**

1. Tìm dòng của nhân sự.
2. Đổi **nhóm vai trò** (ví dụ nhóm Kế toán, nhóm Điều vận): bấm **`Hiệu Chỉnh Thông Tin`** ➔ chọn nhóm ➔ **`Lưu`**. Người dùng nhận toàn bộ quyền của nhóm.
3. Cần quyền riêng cho một người: bấm **`Phân Quyền`** ➔ tích chọn từng quyền theo phân hệ (dùng **`Chọn nhóm này`** / **`Bỏ nhóm này`** để chọn nhanh cả nhóm, **`Chọn tất cả`** / **`Bỏ chọn tất cả`**) – bao gồm quyền xem từng báo cáo ➔ **`Lưu Phân Quyền`**. Dòng có cấu hình riêng sẽ hiện biểu tượng *Đã có cấu hình quyền tùy biến riêng lẻ*.
4. Người dùng cần **tải lại trang** (F5) để áp dụng quyền mới.

> Tài khoản đăng nhập được gắn với hồ sơ nhân sự. Nhân sự nghỉ việc: chuyển **Trạng thái công tác** sang *Tạm ngưng / Nghỉ việc* trong hồ sơ nhân sự (C6.1).

## B3. Khoản Mục Chi

**Nơi thực hiện:** Cài đặt ➔ Tài Chính & Quản Trị ➔ **Khoản Mục Chi** ➔ **`Tạo mới`**.
**Dùng để:** danh mục các loại chi phí phát sinh trên chuyến (để tính lãi lỗ chuyến và lập Debit Note chi hộ).

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Mã Khoản Chi \* | Viết hoa không dấu: `LIFT_ON`, `LIFT_OFF`, `TOLL_FEE`, `CONTAINER_DEPOSIT`… |
| Nhóm Chi Phí | Vé Cầu Đường / BOT · Nâng Cont · Hạ Cont · Cược Container · Cân Xe · Bốc Xếp / Bồi Dưỡng · Hóa Đơn Điện Tử Cảng · Chi Phí Khác |
| Tên Khoản Mục Chi Phí \* | `Phí nâng cont rỗng tại cảng`, `Vé BOT`… |
| Định Mức Tiền Ngầm Định (VNĐ) | Số tiền gợi ý sẵn khi kê chi phí |
| Bắt buộc có HĐĐT / Mã tra cứu | Tích nếu khoản chi này phải có hóa đơn điện tử |
| Ghi Chú & Điều Kiện Áp Dụng | Quy định chứng từ thanh toán |
| Đang sử dụng | Bỏ tích để ngừng dùng |

## B4. Biểu Phí Lương Chuyến & Phụ Cấp – Kiểm Hóa

**a) Biểu Phí Lương Chuyến** – Cài đặt ➔ Tài Chính & Quản Trị ➔ **Biểu Phí Lương Chuyến** ➔ **`Tạo mới`**. Quy định tiền lương chuyến trả cho tài xế theo khu vực kho.

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Khu Vực Kho \* | Củ Chi, Long An, Tây Ninh, Bình Dương, Đồng Nai, TP.HCM, Vũng Tàu, Tuyến đặc thù |
| Tên Tuyến / KCN / Nhà Máy \* | `KCN Phước Đông`, `KCN Bàu Bàng` |
| Trục Lấy / Hạ Cont Chuẩn | `Cát Lái`, `SPITC`, `Thủ Đức` |
| Cự Ly Ước Tính (km) | |
| Mức Lương Chuyến (VNĐ) \* | Ví dụ `450.000` |
| Ghi Chú Điều Kiện Áp Dụng | Ví dụ *Lấy/hạ Cát Lái + 50k* |
| Đang hoạt động / áp dụng | |

**b) Phụ Cấp & Kiểm Hóa** – Cài đặt ➔ Tài Chính & Quản Trị ➔ **Phụ Cấp & Kiểm Hóa** ➔ **`Tạo mới`**.

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Mã Phụ Cấp \* | `CANG_HIEP_PHUOC`, `KIEM_HOA_DO` |
| Phân Loại | Phụ Thêm Cảng Xa · Phụ Thu Kiểm Hóa · Phụ Cấp Tác Nghiệp Đặc Thù |
| Tên Phụ Cấp / Tác Nghiệp \* | `Phụ thêm Cảng Cái Mép` |
| Số Tiền Phụ Cấp (VNĐ) \* | |
| Điều Kiện Áp Dụng | Ví dụ *Lấy hoặc hạ cont tại cảng Cái Mép* |
| Đang hoạt động / áp dụng | |

## B5. Cảng & Kho Bãi

**Nơi thực hiện:** Cài đặt ➔ Mạng Lưới & Địa Điểm ➔ **Cảng & Kho Bãi** ➔ **`Tạo mới`**.
**Dùng để:** nguồn cho các ô *Nơi lấy cont, Kho đóng/dỡ, Nơi hạ cont* trên booking, lệnh điều xe, biểu cước. Địa chỉ được dùng cho nút **Chỉ đường** (Google Maps) trên điện thoại tài xế – nên nhập đầy đủ.

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Mã Địa Điểm \* | `CAT_LAI`, `KHO_WCA` |
| Phân Loại | Cảng Biển · Cảng Cạn (ICD) · Bãi Rỗng / Depot · Kho Hàng / Nhà Máy · Bãi Đỗ Xe Công Ty |
| Tên Địa Điểm \* | `Cảng Cát Lái`, `Kho WCA Tân Vạn` |
| Tỉnh / Thành Phố, Địa Chỉ Chi Tiết | Số nhà, đường, phường, quận/huyện |
| Số Điện Thoại Liên Hệ, Người Phụ Trách / Đầu Mối | Điều độ cảng / thủ kho |
| Ghi Chú Vận Hành | Giờ làm việc kho, quy định vào cổng |
| Đang hoạt động | |

## B6. Hãng Tàu

**Nơi thực hiện:** Cài đặt ➔ Mạng Lưới & Địa Điểm ➔ **Hãng Tàu** ➔ **`Tạo mới`**.

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Mã Hãng Tàu \* | `MAEU`, `ONE`, `COSCO` |
| Tên Hãng Tàu / Đơn Vị Vận Chuyển \* | `Ocean Network Express` |
| Hotline CSKH / Cấp Vỏ, Email Tiếp Nhận e-DO | |
| Website Lấy e-DO / Tra Cứu Container | |
| Free DEM Chuẩn (Ngày), Free DET Chuẩn (Ngày) | Số ngày miễn phí lưu bãi / lưu vỏ mặc định |
| Ghi Chú Quy Định Cấp Vỏ / Hạ Rỗng | Depot chỉ định, lưu ý của hãng |
| Đang hoạt động | |

## B7. Khách Hàng

**Nơi thực hiện:** Cài đặt ➔ Khách Hàng & Đối Tác ➔ **Khách Hàng** ➔ **`Tạo mới`** (hoặc bấm **`Tạo mới`** cạnh ô Khách hàng khi đang lập báo giá / booking).

| Nhóm | Ô nhập | Cách nhập / ví dụ |
|---|---|---|
| Định danh | Mã Khách Hàng | Để trống – hệ thống tự sinh |
| | Mã Số Thuế (MST) | Cần để xuất hóa đơn |
| | Nhóm Khách Hàng \* | Thương mại / XNK · Doanh nghiệp FDI / Nhà máy · Đại lý 3PL / Forwarder · Nhà máy nội địa · Khách lẻ / Vãng lai |
| | Tên Khách Hàng / Doanh Nghiệp \* | Tên đầy đủ theo ĐKKD |
| | Tên Viết Tắt | `SAMSUNG`, `HHP` – hiển thị thành cột riêng trên bảng |
| | Địa Chỉ Xuất Hóa Đơn / Văn Phòng \* | |
| | Email Công Ty (Nhận HĐĐT / Công Nợ) | |
| Liên hệ | Người Phụ Trách, Chức Vụ, Số Điện Thoại, Email Người Liên Hệ | Đầu mối vận hành / booking |
| Ngân hàng | Số TK, Tên Ngân Hàng, Chi Nhánh, Tên Chủ Tài Khoản | |
| Công nợ | Kỳ Hạn Thanh Toán (Ngày), Hạn Mức Nợ Tối Đa (VNĐ) | `0` = không giới hạn |
| | Ghi Chú & Điều Kiện Vận Hành / Hợp Đồng | Chính sách công nợ, quy định giao nhận |

## B8. Biểu Cước Khách

**Nơi thực hiện:** Cài đặt ➔ Khách Hàng & Đối Tác ➔ **Biểu Cước Khách** ➔ **`Tạo mới`**.
**Dùng để:** giá cước đã thỏa thuận theo từng tuyến của từng khách; đồng thời là định mức lương chuyến và vé BOT chuẩn của tuyến (dùng để đối chiếu vé BOT ở Kế toán ➔ Tab 8).

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Khách Hàng Áp Dụng \* | Chọn từ danh mục khách hàng |
| 1. Khu Vực Đi / Lấy Cont · 2. Khu Vực Đến / Giao Hàng | `Cát Lái` ➔ `VSIP` |
| Nơi Lấy (Cảng / ICD) \* · Kho Nhận (Nhà Máy / Kho) \* · Nơi Hạ Cont (Bãi / Cảng) | Chọn từ danh mục Cảng & Kho Bãi |
| Quy Cách Cont / Phương Tiện | 20', 40', xe tải… |
| Cự Ly Ước Tính (km) | |
| Đơn Giá Cước (HĐ) \* | Ví dụ `4.000.000` |
| Lương Chuyến Tài Xế \* | Ví dụ `600.000` |
| Vé BOT / Cầu Đường Chuẩn | Định mức BOT của tuyến, ví dụ `150.000` |

## B9. Thầu Phụ & Nhà Cung Cấp

**Nơi thực hiện:** Cài đặt ➔ Khách Hàng & Đối Tác ➔ **Thầu Phụ & Nhà Cung Cấp** ➔ **`Tạo mới`**.
**Dùng để:** nhà xe thuê ngoài (3PL), gara sửa chữa, nhà cung cấp vật tư. Với nhà xe 3PL, khai báo luôn **đội xe** và **tài xế** của họ để điều vận chọn khi phát lệnh xe bạn.

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Loại Đối Tác \* | Nhà xe vận tải (3PL) · Gara sửa chữa / Bảo dưỡng · Nhà cung cấp vật tư / Dịch vụ |
| Tên Viết Tắt \* | `3S`, `HOANGNAM` |
| Mã Đối Tác / Nhà Xe | Để trống – tự sinh theo loại (`3PL001`, `GAR001`, `SPL001`) |
| Tên Doanh Nghiệp / Đơn Vị \* | |
| Mã Số Thuế, Người Điều Hành Xe | |
| Số Điện Thoại Điều Xe \* | Số gọi khi cần xe gấp |
| Địa Chỉ Công Ty, Địa Chỉ Kho / Bãi Xe | |
| Số Tài Khoản, Tên Ngân Hàng, Chủ Tài Khoản | Để chuyển cước khi quyết toán |
| Ghi chú, Đang hợp tác | |
| **Đội Xe / Phương Tiện Thuộc Nhà Xe** | Thêm từng dòng: Biển số \*, Loại (Đầu kéo / Xe tải 10T / 2T / Van), Tải trọng, Hãng xe |
| **Danh Bạ Tài Xế Thuộc Nhà Xe** | Thêm từng dòng: Họ tên \*, Số điện thoại \*, Số GPLX |

## B10. Đầu Kéo & Xe

**Nơi thực hiện:** Cài đặt ➔ Phương Tiện & Thiết Bị ➔ **Đầu Kéo & Xe** ➔ **`Tạo mới`** (hoặc menu Xe & Bãi ➔ **`Thêm Đầu Kéo`**).

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Biển Số Xe \* | `51H-123.45` |
| Nguồn Sở Hữu | Xe Nhà (Đội Xe Công Ty) · Xe Bạn (Thuê Ngoài / 3PL) |
| Nhà Cung Cấp / Đối Tác 3PL Sở Hữu \* | Chỉ hiện khi chọn *Xe Bạn* |
| Loại Phương Tiện | Đầu kéo Container · Xe tải 10 Tấn · Xe tải 2 Tấn · Xe tải nhỏ / Van |
| Hãng Sản Xuất / Dòng Xe | `Freightliner`, `Hino` |
| Tài Xế Mặc Định Gắn Xe | Khi chọn tài xế trên lệnh điều xe, hệ thống tự gợi ý xe này |
| Tải Trọng TK / Cho Phép (kg) | `30000/27360` |
| Hạn Đăng Kiểm · Hạn Bảo Hiểm · Bảo Trì Kế Tiếp | Hệ thống cảnh báo khi sắp đến hạn (trong 30 ngày) |
| Trạng Thái Phương Tiện | Nằm bãi (Chờ việc) · Đang chạy (Có hàng) · Hư hỏng / Bảo trì · Ngừng sử dụng |

## B11. Rơ-Moóc

**Nơi thực hiện:** Cài đặt ➔ Phương Tiện & Thiết Bị ➔ **Rơ-Moóc** ➔ **`Tạo mới`**.

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Biển Số Rơ-Moóc \* | `51R-123.45` |
| Loại Rơ-Moóc \* | Chọn trong danh sách, hoặc **Loại khác (Tự nhập tay)** |
| Hãng Sản Xuất | `Tân Thanh`, `CIMC`, `Doosung` |
| Tải Trọng TK / Cho Phép (kg) | |
| Hạn Đăng Kiểm Định Kỳ | |
| Trạng Thái Hoạt Động | Nằm bãi (Chờ kéo) · Đang gắn xe kéo · Bảo trì / Sửa chữa |

## B12. Quy Cách Cont & Xe

**Nơi thực hiện:** Cài đặt ➔ Phương Tiện & Thiết Bị ➔ **Quy Cách Cont & Xe** ➔ **`Tạo mới`**.

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Mã Quy Cách \* | `40HC`, `20DC`, `TAI_10T` |
| Phân Loại Phương Tiện / Thùng | Container Đường Biển · Xe Tải Thùng / Đường Bộ |
| Tên Quy Cách / Tên Loại Thùng \* | `Container 40ft Cao (40HC)` |
| Hệ Số TEU | 20' = 1, 40' = 2 |
| Tải Trọng Cho Phép (kg), Thể Tích Chứa (CBM) | |
| Đang hoạt động | |

## B13. Số Dư Ban Đầu

**Nơi thực hiện:** Cài đặt ➔ Tài Chính & Quản Trị ➔ **Số Dư Ban Đầu** ➔ **`Tạo mới`**.
**Dùng để:** khai báo số dư tiền mặt, ngân hàng, công nợ tại ngày bắt đầu dùng phần mềm. Mỗi quỹ / mỗi đối tượng công nợ khai một dòng.

| Ô nhập | Cách nhập / ví dụ |
|---|---|
| Tài Khoản Kế Toán \* | 1111 Tiền mặt · 1121/1122 Tiền gửi ngân hàng · 131 Phải thu khách hàng · 141 Tạm ứng · 331 Phải trả NCC / thầu phụ · 334 Phải trả người lao động |
| Ngày Chốt Số Dư Đầu Kỳ \* | Ngày chốt sổ trước khi chạy phần mềm |
| Tên Đối Tượng / Quỹ / Tài Khoản \* | `Quỹ tiền mặt GSS`, `KH Công ty ABC` |
| Mã Đối Tượng / Biển Số / Mã NV | Mã KH, mã tài xế… |
| Tính Chất Số Dư \* | **Dư Nợ** (tiền, tài sản, phải thu) hoặc **Dư Có** (phải trả) |
| Số Tiền (VNĐ) \* | |
| Số Tài Khoản NH (Nếu có), Ghi Chú / Căn Cứ Chứng Từ | Biên bản kiểm quỹ, sao kê, biên bản đối chiếu công nợ |

---

# PHẦN C. HƯỚNG DẪN THAO TÁC THEO PHÂN HỆ

## C1. Dashboard Tổng quan

**Nơi thực hiện:** bấm logo hoặc menu **Dashboard Tổng quan**. Đây là màn hình mở ra đầu tiên sau khi đăng nhập.

**Các khu vực trên màn hình:**

| Khu vực | Nội dung | Thao tác |
|---|---|---|
| **Góc nhìn** (ô chọn đầu trang) | Ban Giám Đốc · Tài Chính & Kế Toán · Điều Vận & Điều Độ · Kinh Doanh · Đội Xe & Bãi · Hành Chính & Nhân Sự | Đổi góc nhìn để ưu tiên chỉ số của phòng ban đó. |
| **Bộ lọc kỳ** | Hôm nay · 10 Ngày qua · Tháng này · Quý này · Năm nay · Tùy chọn ngày… | Chọn *Tùy chọn ngày…* ➔ nhập **Từ ngày / Đến ngày** ➔ **`Áp dụng`**. Toàn bộ thẻ và biểu đồ cập nhật theo kỳ. |
| **5 thẻ chỉ số** | 1. Tài chính & Quỹ (lợi nhuận gộp, doanh thu, chi phí, quỹ tiền mặt, ngân hàng) · 2. Kinh doanh (doanh thu kế hoạch, booking đã nhận, tuyến đã ký) · 3. Vận hành chuyến (chuyến đang chạy, đã xong, % đúng giờ OTD) · 4. Khả dụng đội xe (tỷ lệ khai thác, xe chờ, bảo trì, tài xế sẵn sàng) · 5. Đơn hàng & Hải quan (tờ khai luồng xanh/vàng/đỏ, đơn chờ gán xe, cont quá hạn DEM/DET) | Bấm nút nhỏ cuối thẻ (**Sổ kế toán**, **Sale & CRM**, **Bàn điều xe**, **Quản lý xe**, **Thông quan**) để mở phân hệ tương ứng. |
| **Biểu đồ Doanh thu – Chi phí – Lợi nhuận** | Cột doanh thu, chi phí và đường lợi nhuận theo ngày | **`Số liệu`** hiện giá trị trên cột · **`Tùy biến`** mở bộ dựng biểu đồ (C14) · **`Mặc định`** trả về biểu đồ gốc · **`Ẩn Biểu Đồ`** để thu gọn · **`Làm Mới`** để tải lại. |
| **Cơ cấu vận hành** | Tỷ lệ xe đang có hàng / chờ ở bãi / bảo dưỡng; hoặc cơ cấu luồng hải quan | Chuyển giữa **`Đội Xe`** và **`Hải Quan`**. |
| **Công Việc Cần Xử Lý Ngay** | Việc được giao / đã giao / liên quan đến bạn | Lọc **Tất cả / Đã giao / Được giao / Liên quan**, xem dạng **Danh sách** hoặc **Kanban**, bấm **`Xem tất cả`** để mở màn hình Giao việc (C11). |
| **Bản Tin & Thông Báo** | Tin mới của công ty và phòng ban | Bấm vào tin để đọc chi tiết; bấm nút **Bản tin** để mở toàn bộ (C12). |

## C2. Sale & Booking

**Nơi thực hiện:** Menu **Sale & Booking**. Màn hình có 5 thẻ chỉ số (doanh thu thực hiện, doanh thu dự kiến, tổng đơn hàng, số đơn gấp đóng trong 48h, tỷ lệ chốt báo giá) và 2 tab:

- **Tab 1. Báo Giá & Hợp Đồng Khách Hàng** – phễu bán hàng theo 5 giai đoạn.
- **Tab 2. Booking / Đơn Đặt Hàng** – đơn vận chuyển thực tế khách gửi.

### C2.1. Lập báo giá mới

1. Vào **Sale & Booking** ➔ Tab **1. Báo Giá & Hợp Đồng** ➔ bấm **`Tạo Báo Giá`**.
2. **Mục 1 – Khách hàng & phương thức định giá:**

| Ô nhập | Cách nhập |
|---|---|
| Khách Hàng / Đối Tác Doanh Nghiệp \* | Chọn từ danh mục. Khách mới: bấm **`Tạo mới`** cạnh ô. |
| Phương Thức Báo Giá & Định Giá \* | **1.** Theo tuyến đường (ma trận nhiều tuyến) · **2.** Có điều chỉnh theo giá dầu DO 0.05S · **3.** Trọn gói / bao chuyến định kỳ |
| Quy Cách Hàng Hóa Mặc Định | Loại cont / xe áp dụng mặc định cho các tuyến |
| Giá Dầu Cơ Sở P0, Mỗi Bước Nhảy Giá Dầu, Tỷ Lệ Điều Chỉnh Cước (%) | Chỉ khi chọn phương thức 2. Ví dụ: giá dầu thay đổi 1.000 đ/lít so với 21.000 đ thì cước tăng/giảm 3,5%. |

3. **Mục 2 – Danh sách tuyến:** bấm **`+ Tạo mới`** để thêm từng tuyến. Mỗi dòng nhập **Lộ trình / Mô tả tuyến \***, **Loại cont / xe**, **Cự ly (km)**, **Đơn giá cước \***, **Sản lượng (chuyến/tháng)**. Hệ thống tự tính *Thành tiền / tháng* và *Tổng doanh thu kế hoạch*. Bấm biểu tượng thùng rác cuối dòng để xóa tuyến.
4. Chọn **Giai Đoạn Chu Trình Báo Giá \***: *1. Đã gửi báo giá* (mặc định khi mới gửi).
5. **Mục 3 – Thông tin in:** Người nhận báo giá, SĐT, Email khách, **Hiệu lực đến ngày**, **Ghi chú & điều khoản thương mại** (bấm mẫu nhanh **Kéo Cont FCL / Xe Tải FTL / Theo Giá Dầu** để điền sẵn điều khoản, rồi sửa lại cho phù hợp).
6. Bấm **`Lưu`**.

### C2.2. Theo dõi báo giá đến khi ký hợp đồng

Báo giá **không có nút duyệt riêng** – trạng thái đi theo phễu bán hàng. Khi có tiến triển, mở báo giá (**`Xem`**) ➔ **`Sửa`** ➔ đổi **Giai Đoạn Chu Trình Báo Giá** ➔ **`Lưu`**:

| Giai đoạn | Khi nào chọn |
|---|---|
| 1. Đã gửi báo giá | Vừa gửi cho khách |
| 2. Đang đàm phán | Khách đang trả giá / điều chỉnh |
| 3. Chờ ký Hợp đồng | Đã thống nhất giá, chờ ký |
| 4. Đã ký Hợp đồng | Đã ký – được tính vào *Doanh thu dự kiến* và *Tỷ lệ chốt* |
| 5. Từ chối / Hủy | Khách không đồng ý |

Năm thẻ phía trên Tab 1 thống kê số tiền, số tuyến, số báo giá theo từng giai đoạn. Lọc theo **Khách hàng** và **Trạng thái** ở thanh bộ lọc.

**In báo giá:** bấm **`In`** ở dòng báo giá (hoặc **`Xem & In`** trong màn hình chi tiết) ➔ chọn mẫu: **Mẫu 1** Tiêu chuẩn (quốc hiệu, đa tuyến) · **Mẫu 2** Bảng cước & khung đối tác (To/From) · **Mẫu 3** Chi tiết dịch vụ dự án (ETA/ETD) ➔ **`In`**. Xem cài đặt máy in ở D4.

### C2.3. Tiếp nhận Booking / Đơn đặt hàng

1. Vào **Sale & Booking** ➔ Tab **2. Booking / Đơn Đặt Hàng** ➔ bấm **`Tạo Booking`**.
2. Điền thông tin:

| Mục | Ô nhập | Cách nhập |
|---|---|---|
| 1. Dịch vụ & booking | Phân Loại Dịch Vụ \* | Kéo Cont Xuất Khẩu · Kéo Cont Nhập Khẩu · Vận Chuyển Nội Địa |
| | Khách Hàng \* | Chọn từ danh mục (hoặc **`Tạo mới`**) |
| | Số Booking / PO \* | Số booking hãng tàu hoặc số PO của khách |
| | Hãng Tàu, Tên Tàu & Chuyến (Vessel/Voy) | |
| | Loại Cont / Xe \* | Cont 40HC · 20GP · 45 Feet · 40GP · Xe tải 15T / 8T / 5T |
| | Số Lượng Cont \* | Tổng số cont của booking |
| 2. Hàng hóa & lộ trình | Tên Hàng Hóa Thực Tế, Mã HS Code | |
| | 1. Điểm Lấy Cont \* · 2. Kho Đóng / Dỡ \* · 3. Điểm Hạ / Trả Cont \* | Chọn từ danh mục Cảng & Kho Bãi |
| 3. Kế hoạch & cước | Ngày Hẹn Đóng \*, Giờ Hẹn Tại Kho | Dùng nút giờ nhanh 08:00 / 10:00 / 13:00 / 18:00 |
| | Hạn Cắt Máng CY, Hạn SI Cut-off | Hạn chót của hãng tàu – hệ thống cảnh báo khi gần đến hạn |
| | Free DET (Ngày), Free DEM (Ngày) | Số ngày miễn phí lưu vỏ / lưu bãi |
| | Cước Vận Chuyển \* | Cước đã thỏa thuận với khách |
| | Trạng Thái Đơn \* | Mặc định *Chờ điều xe* |
| | Ghi Chú / Yêu Cầu Đặc Biệt | |
| | Đính Kèm File Booking / Lệnh Cấp Rỗng | JPG, PNG, PDF ≤ 10MB – kéo thả hoặc **`Dán Ảnh (Ctrl+V)`** |

3. Bấm **`Lưu`**. Booking xuất hiện ở thẻ **1. Chờ điều xe** và trong danh sách chờ của phòng Điều vận.

**Theo dõi tiến độ booking:** các thẻ trên Tab 2 chia đơn theo *Chờ điều xe · Đang điều xe · Chạy cắt kéo · Cảnh báo đơn gấp · Đã hoàn tất*. Mở booking (**`Xem`**), **Mục 4 – Tiến độ container** liệt kê từng chuyến đã phát lệnh từ booking này (mã chuyến, tài xế chặng 1/2, lộ trình, trạng thái); bấm **`Xem`** ở dòng để mở chuyến. Trạng thái đơn tự chuyển *Đang điều xe* ➔ *Đã điều đủ cont* khi số chuyến đủ số cont.

> Booking **không tự sinh lệnh xe**. Sau khi lưu booking, phòng Điều vận tạo lệnh và chọn booking này (C3.1).

## C3. Điều vận

**Nơi thực hiện:** Menu **Điều vận**. Thẻ chỉ số: *Tổng kế hoạch · Chờ nhận lệnh · Đang trên tuyến · Cảnh báo rủi ro (gần cắt máng, hạn rỗng/kho) · Đã giao & thu POD*.

**Bảng chuyến xe:** mỗi dòng là một lệnh điều xe (Mã chuyến, Lịch đóng, Khách hàng & kho, Booking / Cont / Seal, Xe kéo & xe hạ, Nơi lấy ➔ Nơi hạ, Trạng thái). Các biểu tượng cảnh báo trên dòng: *chờ tài xế xác nhận*, *tài xế chưa nhận chuyến sau hơn 60 phút*, *còn 1 ngày Free DET*, *hôm nay hết hạn trả vỏ*, *ghép 2 cont 20ft*.

**Bộ lọc:** Kỳ, Khách hàng, Tài xế / Xe, Trạng thái (bao gồm *Chạy cắt kéo*, *Ghép 2 cont 20ft*, *Cảnh báo quá hạn Free DET*), Loại hình (Nhập / Xuất / Nội địa). Nút **`Ẩn Đã Hoàn Thành`** để chỉ xem chuyến đang chạy.

### C3.1. Tạo lệnh điều xe & phát lệnh cho tài xế

1. Vào **Điều vận** ➔ bấm **`Tạo mới`**.
2. **Kế thừa từ booking (khuyến nghị):** ở ô *Kế Thừa Thông Tin Từ Booking*, chọn booking đang chờ điều xe – hệ thống tự điền khách hàng, loại hình, loại cont, số booking, lộ trình, giờ hẹn, hạn cắt máng, file đính kèm. Không có booking: bỏ qua và nhập tay, hoặc bấm **`Tạo Booking Mới`**.
3. **Mục 1 – Khách hàng & vận đơn:**

| Ô nhập | Cách nhập |
|---|---|
| Khách hàng / Chủ hàng \* | |
| Loại Hình Vận Chuyển \* | Hàng Nhập (Cảng ➔ Kho) · Hàng Xuất (Kho ➔ Cảng) · Nội địa / Chuyển kho |
| Loại Cont / Xe \* | 40HC · 40GP · 45G1 · 22GP (20 feet) · Kẹp 2x20ft · Xe tải 1T–15T |
| Số Booking / B/L, Số Container, Số Chì (Seal), Trọng Lượng VGM | Có thể để trống và bổ sung sau – tài xế cũng sửa được số cont/seal trên điện thoại |
| Đính kèm file booking / lệnh cấp rỗng | JPG, PNG, PDF tối đa 5MB |
| Cắt CY / SI, Hóa Đơn TM (Invoice), Cửa Xuất (Dock Kho), Giờ Hẹn Đóng Hàng | |
| Vị Trí Vỏ Hiện Tại | Tại nhà máy khách · Tại bãi công ty · Tại cảng / bãi cont |
| Free Mượn Vỏ (DET – ngày), Hạn Chót Trả Vỏ | Hệ thống đếm ngược và cảnh báo |
| Giám Định Vỏ (Phiếu EIR), Ghi chú hư hỏng | Nguyên vẹn · Có hư hỏng từ trước · Bẩn / cần vệ sinh |

4. **Mục 2 – Lộ trình 3 điểm:** **1. Nơi Lấy (Cảng / ICD) \*** ➔ **2. Nơi Đóng/Trả (Kho KH) \*** ➔ **3. Nơi Hạ (Bãi rỗng / Cảng)**.
5. **Mục 3 – Phân công tài xế:** chọn **`Xe Nhà (TVL)`** hoặc **`Xe Bạn / 3PL`**:
   - **Xe nhà:** chọn **Tài xế nhận lệnh (Toàn trình) \*** – xe mặc định của tài xế được gợi ý ở ô **Đầu kéo / Xe tải TVL \*** (chỉ hiện xe nội bộ). Tài xế chưa có trong danh sách: bấm **`Thêm tài xế`** ➔ nhập Họ tên và SĐT ➔ **`Lưu & Chọn Ngay`**. Nhập **Ghi chú phí công ty chịu / lưu ý điều độ** nếu cần.
   - **Xe bạn / 3PL:** xem C3.3.
6. Bấm **`Xác Nhận & Phát Lệnh Zalo`**. Hệ thống:
   - tạo mã chuyến (ví dụ `TVL-1028-001`) với trạng thái *Đã phát lệnh*;
   - **sao chép sẵn nội dung lệnh kèm đường link** của tài xế và mở cửa sổ Zalo tới số điện thoại tài xế ➔ bạn chỉ cần bấm **Ctrl+V** rồi gửi.

### C3.2. Chạy cắt kéo (2 tài xế) & ghép 2 cont 20ft

**Cắt kéo (Drop & Hook)** – tài xế 1 lấy cont giao kho, tài xế 2 móc moóc kéo về bãi hạ:

1. Tại Mục 3 của lệnh, bật **Cắt Kéo (2 Tài)**.
2. Chọn **Tài xế Lấy Cont \*** và **Đầu kéo Lấy Cont \*** (tự theo tài xế).
3. **Tài xế Hạ Cont** và **Đầu kéo Hạ Cont**: chọn ngay, hoặc để trống và gán sau.
4. Chọn **Tỷ lệ phân chia thù lao** chặng 1 / chặng 2: 50–50 · 60–40 · 40–60 · 70–30 · hoặc *Tùy biến* rồi nhập % từng chặng.
5. Nhập ghi chú bàn giao moóc tại kho (nếu có) ➔ **`Xác Nhận & Phát Lệnh Zalo`**.
6. Gán tài xế chặng 2 sau: mở chi tiết chuyến ➔ bấm **`Gán Tài 2 Ngay`** hoặc **`Sửa`** ➔ chọn *Bác Tài Hạ Cont (Chặng 2)* ➔ **`Lưu`**.

Lương chuyến của mỗi tài xế được chia theo tỷ lệ đã chọn khi tính lương.

**Ghép 2 cont 20ft (Twin 20ft):**

1. Bật **Ghép 2 Cont 20ft (Twin 20ft)** ở đầu Mục 1 (hoặc chọn Loại cont *Kẹp 2x20ft*).
2. Khung **Container #2** xuất hiện: nhập **Số Booking Cont 2**, **Số Cont 2**, **Số Chì Cont 2**, **VGM 2**.
3. Phát lệnh như bình thường.

### C3.3. Thuê xe ngoài (Xe bạn / 3PL)

1. Tại Mục 3 bấm **`Xe Bạn / 3PL`**.
2. Chọn **Nhà Xe / Đối Tác 3PL \*** (chưa có: bấm **`Thêm 3PL`**). Danh sách xe và tài xế tự lọc theo nhà xe.
3. Chọn **Đầu kéo / Xe tải 3PL \*** và **Bác Tài 3PL \***. Nếu chưa khai báo: chọn *+ Nhập Biển Số Xe Khác…* / *+ Nhập Tài Xế Mới…* để nhập tay.
4. Nhập **Giá Cước Khoán Trả 3PL (VNĐ) \***, **Tạm ứng dọc đường** (nếu có) và **Ghi chú thỏa thuận cước**.
5. **`Xác Nhận & Phát Lệnh Zalo`**. Chuyến sẽ xuất hiện ở **Tài chính & Kế toán ➔ Tab 7. Quyết Toán Đối Tác 3PL** để kế toán quyết toán (C7.7).

### C3.4. Màn hình chi tiết chuyến xe

Bấm **`Xem`** ở dòng chuyến. Thanh trên cùng hiển thị mã chuyến, trạng thái, loại hình, khách hàng và các nút:

| Nút | Dùng để |
|---|---|
| **`Sửa`** | Hiệu chỉnh lệnh: khách hàng, loại cont, số cont/seal/booking, lộ trình 3 điểm, ngày & giờ đóng hàng, dock, tài xế & xe chặng 1, **Rơ-Moóc**, tài xế & xe chặng 2, hóa đơn TM, hạn Free DET, vị trí cont, lưu ý ➔ **`Lưu`**. Trong hộp này có nút **`Hủy / Xóa Chuyến`**. |
| **`Xóa Phiếu`** | Xóa lệnh (có xác nhận). |
| **`Nhân bản Lệnh`** | Tạo nhanh lệnh mới giống lệnh này (dùng khi booking có nhiều cont). |
| **`Link Tài Xế`** | Sao chép đường link cổng tài xế để gửi lại. |
| **`Nhắn Zalo`** | Mở Zalo tới tài xế. |
| **`Link Gửi Khách`** | Sao chép link tra cứu hành trình cho khách hàng (C5). |
| **`Màn Hình Tài Xế`** | Xem mô phỏng đúng màn hình tài xế đang thấy, thao tác thay khi cần. |

**Khung "Cập nhật tiến độ hành trình":** hiển thị **Bước tiếp theo** của chuyến. Khi tài xế báo qua điện thoại / bộ đàm mà không bấm được, điều độ bấm **`Xác Nhận Thay Tài Xế`** để ghi nhận mốc. Nút **`Phân Xe / Tài Xế Khác`** dùng để đổi tài xế (C3.6). Thao tác nhanh: **`Thêm Chi Phí`**, **`Đính Kèm Chứng Từ / POD`**, **`Ghi Nhận Sự Cố`**.

**Các khối thông tin bên dưới:**

- **Thông tin vận chuyển & chứng từ EIR:** số xe & tài xế, số cont & vị trí, seal & booking, invoice & dock, hành trình 3 điểm.
- **Quản lý hạn Free DEM/DET & EIR:** đếm ngược hạn trả vỏ (DET), hạn bãi (DEM), tình trạng vỏ; theo dõi lưu xe – nút **`Cập Nhật Neo Đêm`** (C3.7).
- **Ghép 2 cont 20ft:** thông tin cont thứ 2 (nếu có).
- **Tiến độ thời gian 7 mốc thực tế:** 1. Hẹn đến (ETA) · 2. Kho gọi vào · 3. Vào thực tế · 4. Kho gọi ra · 5. Ra thực tế · 6. Giờ hẹn hạ · 7. Giờ hạ thực tế.
- **Bảng kê chi phí phát sinh hiện trường** và tổng **Doanh thu cước – Tổng chi phí thực tế – Lợi nhuận gộp** (C3.5).
- **Tiến độ thực hiện quy trình 11 bước** (bảng bên dưới) kèm chứng từ đính kèm từng bước.
- **Chứng từ gốc & hóa đơn điện tử:** EIR, vé BOT, POD đã tải lên – bấm để xem ảnh gốc.

**Quy trình 11 bước của một chuyến:**

| Bước | Nội dung | Chứng từ đi kèm |
|---|---|---|
| 1 | Nhận booking | File booking / lệnh cấp cont |
| 2 | Phát lệnh điều vận (tài xế – biển số) | |
| 3 | Tài xế xác nhận nhận chuyến | |
| 4 | Tài xế xuất phát & hẹn giờ đến (nơi lấy cont) | Phiếu EIR nhận cont, ảnh số cont & seal |
| 5 | Đã đến cổng kho | |
| 6 | Bắt đầu đóng / trả hàng tại kho (dock) | Packing list / lệnh giao hàng |
| 7 | Đóng hàng / xuống hàng xong | Ảnh seal mới, phiếu cân |
| 8 | Đã ký đủ chứng từ giao nhận (POD) | Biên bản POD có chữ ký |
| 9 | Vận chuyển về bãi hạ / cảng | |
| 10 | Đã hạ cont, lấy phiếu EIR hạ bãi | Phiếu EIR hạ cont |
| 11 | Tổng hợp chi phí & đối soát thanh toán | Bảng kê chi phí & hóa đơn điện tử |

Trạng thái chuyến tương ứng: *Chờ duyệt / Nháp ➔ Đã phát lệnh ➔ Tài xế đã nhận lệnh ➔ Đã lấy cont ➔ Đang di chuyển ➔ Đã đến kho khách ➔ Đang đóng / trút hàng ➔ Giao nhận thành công (có POD) ➔ Đang kéo hạ bãi ➔ Đã hoàn tất chuyến* (hoặc *Đã hủy*).

### C3.5. Kê chi phí chuyến & phân loại chi phí

Chi phí có thể do **tài xế kê trên điện thoại** (C4) hoặc **văn phòng kê thay**:

1. Chi tiết chuyến ➔ **`Thêm Chi Phí`** (hoặc nút **`Tạo mới`** ở *Bảng kê chi phí phát sinh*).
2. Nhập:

| Ô nhập | Cách nhập |
|---|---|
| Khoản mục chi phí \* | Nâng · Hạ · Cược cont · Cân xe · Bốc xếp · Vé cầu đường (BOT / phà / ePass) · Chi phí khác |
| Tài xế & Đầu kéo (chặng phát sinh) \* | Chọn đúng chặng nếu chuyến cắt kéo |
| Thành tiền (VNĐ) \* | |
| Số hóa đơn, Mã tra cứu HĐĐT, Đơn vị thu / phát hành, Link tra cứu HĐĐT | Bắt buộc với khoản mục yêu cầu hóa đơn |
| Ghi chú chi phí | |
| **Phân loại chi phí \*** | **`Chi phí công ty`** · **`Công ty chi hộ`** · **`3PL chi hộ`** (giải thích bên dưới) |

3. Bấm **`Lưu`**. Muốn sửa / xóa: dùng biểu tượng bút / thùng rác ở dòng chi phí (**`Cập Nhật`** để lưu).

| Phân loại | Bản chất | Hệ thống xử lý |
|---|---|---|
| **Chi phí công ty** | Công ty chịu (BOT, cân xe, bốc xếp…) | Tính vào chi phí chuyến – làm giảm lợi nhuận chuyến |
| **Công ty chi hộ** | Công ty trả trước thay khách (nâng hạ, cược vỏ…) | **Không** trừ lợi nhuận chuyến; chuyển sang danh sách thu hồi **Debit Note** (Kế toán ➔ Tab 6) |
| **3PL chi hộ** | Tài xế xe bạn tự trả trước | Cộng hoàn cho nhà xe khi quyết toán 3PL (Kế toán ➔ Tab 7) |

**Đính kèm hóa đơn / chứng từ:** **`Đính Kèm Chứng Từ / POD`** ➔ chọn **`Chi Phí Phát Sinh`** (tải ảnh hóa đơn, nhập khoản mục, số tiền, số HĐ, mã tra cứu) hoặc **`Chứng Từ Nghiệm Thu (EIR / POD)`** (chọn loại: EIR, POD có chữ ký, phiếu cân, hóa đơn GTGT cảng, ảnh giám định vỏ; nhập số cont, seal) ➔ **`Lưu & Đính Kèm`**.

**Trạng thái khoản chi:** *Chờ duyệt ➔ Đã duyệt ➔ Đã chốt sổ Kế toán* (hoặc *Từ chối*). Khi kế toán đã chốt sổ chuyến (C7.4), bảng kê hiện **"Bảng kê đã được kế toán chốt sổ đối soát – Read Only"** và không sửa / xóa được nữa.

### C3.6. Đổi tài xế, báo sự cố

**Đổi tài xế:** chi tiết chuyến ➔ **`Phân Xe / Tài Xế Khác`** ➔ chọn **Bác Tài Thay Thế \*** (đầu kéo mặc định của tài xế mới được gán tự động) ➔ nhập **Lý do phân lại xe** ➔ **`Xác Nhận & Mở Zalo Mới`** ➔ dán (Ctrl+V) lệnh gửi cho tài xế mới. **Link cũ của tài xế trước bị vô hiệu ngay** để tránh ghi đè dữ liệu.

**Tài xế từ chối chuyến:** chuyến hiện cảnh báo đỏ kèm lý do – điều độ dùng **`Phân Xe / Tài Xế Khác`** để giao cho người khác.

**Ghi nhận sự cố:** chi tiết chuyến ➔ **`Ghi Nhận Sự Cố`** ➔ chọn loại (kẹt xe / trễ giờ hẹn · vỏ cont rách / hư seal · kho không cho vào dock · xe hỏng / nổ lốp · kiểm tra tải trọng / CSGT · khác) ➔ mô tả & vị trí ➔ **`Gửi Báo Sự Cố`**. Sự cố được tổng hợp ở báo cáo **Biên bản ngoại lệ & sự cố (OS&D)**.

### C3.7. Xe chờ hạ sau 0h & phí lưu xe qua đêm

Dùng khi kho / cảng yêu cầu chờ sau 0h mới được hạ cont:

1. Chi tiết chuyến ➔ khối *Quản lý hạn Free DEM/DET* ➔ **`Cập Nhật Neo Đêm`**.
2. Nhập **6. Giờ hẹn hạ bãi \*** (nút nhanh *Sau 00:00*, *02:00*) và **7. Giờ hạ thực tế** (nút **`Bây Giờ`**).
3. Chọn **Lý do neo xe**: kho yêu cầu chờ sau 0h · cảng chưa mở CY · cấm giờ xe container · chờ thông quan · khác.
4. Kiểm tra **Số giờ neo xe**, tích **Lưu qua đêm (> 0H)** nếu có.
5. Nhập **Thu khách hàng (phụ phí lưu xe)** và **Chi tài xế (phụ cấp trực đêm)**; tích *Tự động tạo khoản chi phí phụ cấp tài xế vào bảng kê* để đưa vào chi phí chuyến và lương tài xế.
6. **`Lưu`**.

### C3.8. Quyết toán đợt cho tài xế (gom nhiều chuyến)

Từ **Điều vận** bấm **`Quyết Toán Đợt Tài Xế`** (hoặc mở `/settlements`) – xem hướng dẫn chi tiết ở C7.9.

## C4. Cổng tài xế trên điện thoại (Driver Portal)

Tài xế **không cần cài app, không cần mật khẩu**: mở đường link điều độ gửi qua Zalo. Mỗi link chỉ dùng cho **một chuyến và một tài xế**; khi đổi tài xế, link cũ tự khóa; khi chuyến hoàn tất, link tự đóng sau một thời gian (có đồng hồ đếm ngược).

**Màn hình chính:** trạng thái chuyến, tên tài xế, điểm đến hiện tại kèm nút **`Chỉ đường`** (Google Maps), và một **thẻ "việc cần làm tiếp"** với nút lớn. Tài xế chỉ cần bấm lần lượt theo nút hiện ra; mỗi lần bấm hệ thống hỏi **Xác nhận cập nhật mốc?** ➔ **`ĐỒNG Ý XÁC NHẬN`** (bấm nhầm thì **`Quay Lại / Chưa Bấm`**).

**Các mốc tài xế bấm theo thứ tự:**

| # | Nút trên điện thoại | Khi nào bấm |
|---|---|---|
| 1 | **`Xác Nhận Nhận Chuyến`** (hoặc **`Từ Chối`** + nhập lý do) | Ngay khi nhận link |
| 2 | **`XUẤT PHÁT ĐI LẤY CONT / HÀNG`** | Bắt đầu chạy. Nên chụp *Giám định vỏ cont* trước khi xuất phát. |
| 3 | **`Báo Sắp Đến (30p)`** / **`Đến Cổng Kho`** | Sắp tới kho / tới nơi |
| 4 | **`ĐÃ ĐẾN CỔNG KHO — CHECK-IN`** | Vào tới cổng kho – ghi nhận giờ bắt đầu chờ |
| 5 | **`VÀO DOCK — BẮT ĐẦU ĐÓNG / DỠ HÀNG`** | Bảo vệ gọi xe vào dock |
| 6 | **`Hàng Đã Xong`** (kèm chụp POD hoặc **`Thủ Kho Ký E-POD`**) | Đóng / dỡ xong, đã có biên bản giao nhận |
| 7 | **`VẬN CHUYỂN VỀ BÃI HẠ CONT`** | Xe rời kho |
| 8 | **`ĐÃ HẠ CONT — LẤY PHIẾU EIR`** | Hạ cont xong, chụp phiếu EIR hạ. Nếu phải chờ sau 0h: **`Báo Lưu Xe Chờ Hạ Sau 00:00`**. |

Bấm nhầm *Từ chối*: bấm **`BẤM NHẦM? BẤM ĐỂ NHẬN CHUYẾN LẠI`**.

**Chụp chứng từ:** **`Chụp / Tải Ảnh Chứng Từ`** ➔ chọn loại: 1. Giám định vỏ cont (kèm *Đạt chuẩn / Có hư hỏng*) · 2. Phiếu EIR lấy cont · 3. Biên bản POD · 4. Ảnh chì (seal) · 5. Phiếu EIR hạ cont · 6. Vé BOT / hóa đơn ➔ chụp một hoặc nhiều ảnh ➔ nhập **Số cont / Số seal đối chiếu** ➔ **`GỬI NGHIỆM THU CHỨNG TỪ`**.

**Ký nhận điện tử (E-POD):** **`Thủ Kho Ký E-POD`** ➔ thủ kho ký tay lên màn hình ➔ nhập **Họ tên người ký \*** (SĐT tùy chọn) ➔ **`Xác Nhận & Lưu E-POD`**. Bấm **`Xóa ký lại`** nếu ký hỏng.

**Kê chi phí đi đường:** **`Kê Chi Phí`** ➔ **`+ THÊM KHOẢN CHI PHÍ MỚI`** cho từng khoản: chọn người chịu (**Chi phí công ty / Công ty chi hộ / 3PL chi hộ** – xem C3.5), loại chi phí (Vé BOT, Nâng cont, Hạ cont, Cược vỏ, Phiếu cân, Bốc xếp, Khác), **số tiền \***, số hóa đơn / vé, ghi chú ➔ **`LƯU & GỬI DUYỆT`**. Khoản đã kê xem ở mục **Chi Phí Đã Kê**, sửa / xóa được khi chưa chốt sổ.

**Các nút khác:** **`Báo Sự Cố`** (chọn loại, mô tả, chụp ảnh ➔ **`GỬI CẢNH BÁO KHẨN TỚI ĐIỀU ĐỘ`**) · **`Gọi Điều Độ`** · **`Gọi Nhận Hàng`** · **`Sửa số Cont / Seal`** (trong *Chi tiết vận đơn*) · **Nhật ký mốc thời gian** · **Chứng từ & hình ảnh đã nộp** · **Báo mốc thủ công**. Thông tin tạm ứng chuyến, hạn Free DET, giờ cắt máng, tình trạng tờ khai hải quan hiển thị trong *Chi tiết vận đơn*. Tài xế **không** thấy doanh thu hay lợi nhuận.

## C5. Link tra cứu hành trình cho khách hàng

1. Điều độ mở chi tiết chuyến ➔ **`Link Gửi Khách`** ➔ link (dạng `/tracking/...`) được sao chép ➔ gửi cho khách qua Zalo / email.
2. Khách mở link, **không cần đăng nhập**, xem: mã chuyến, trạng thái, thanh tiến độ 6 mốc (*Tiếp nhận đơn ➔ Đã điều xe ➔ Đã đến kho hàng ➔ Đã nhận hàng ➔ Đang vận chuyển ➔ Đã giao thành công*) kèm thời gian, và **biên bản E-POD** có chữ ký sau khi giao xong. Khách có thể bấm **`Chia Sẻ Link`**.
3. Link khách hàng **không** hiển thị chi phí, cước thầu phụ hay thông tin cá nhân tài xế, và không truy cập được cổng tài xế.

## C6. Hành chính & Nhân sự

**Nơi thực hiện:** Menu **Hành chính & Nhân sự**. Thẻ chỉ số: tổng nhân sự, đội tài xế, khối văn phòng, **cảnh báo hạn 30 ngày (GPLX & HĐLĐ)**, lương & tạm ứng. Có 5 tab:

1. Hồ Sơ Nhân Sự · 2. Hợp Đồng Lao Động · 3. Bảng Chấm Công · 4. Tính Lương (Hybrid Payroll) · 5. Chính Sách & Biểu Thuế.

### C6.1. Hồ sơ nhân sự (kể cả tài xế)

1. Tab **1. Hồ Sơ Nhân Sự** ➔ **`Thêm Nhân Sự`**.
2. Điền:

| Mục | Ô nhập | Ghi chú |
|---|---|---|
| 1. Cá nhân & liên hệ | Mã Nhân Viên \*, Họ Và Tên Đầy Đủ \*, Biệt Danh, Giới Tính, Ngày Sinh | Mã ví dụ `TX025`, `NV019`. Biệt danh hiển thị trên lệnh điều xe. |
| | Số Điện Thoại \*, Số Zalo, Email, Chỗ ở hiện nay, Địa chỉ thường trú | Số điện thoại dùng để mở Zalo khi phát lệnh |
| 2. Pháp lý & ngân hàng | Số CCCD, Ngày cấp, Nơi cấp, MST cá nhân, Số sổ BHXH | Cần cho thuế TNCN và BHXH |
| | Số TK, Tên ngân hàng, Tên chủ TK (in hoa) | Dùng xuất file chuyển lương |
| 3. Chuyên môn & trạng thái | Phòng Ban Công Tác \*, Chức Vụ / Vai Trò \* | Tài xế chọn *Tài xế & Giao nhận* – chỉ người có vai trò này mới hiện trong ô chọn tài xế khi điều xe |
| | Trạng thái công tác | Đang làm việc / Tạm ngưng – Nghỉ việc |
| | Ngày bắt đầu làm việc, Ngày thôi việc | |
| | Số GPLX, Ngày hết hạn bằng lái | Cảnh báo trước 30 ngày |
| 4. Hợp đồng hiện hành | (tự động) | Lương lấy từ hợp đồng lao động đang hiệu lực |

3. **`Lưu`**.

**Nhập nhiều nhân sự từ Excel:** **`Mẫu Excel`** để tải file mẫu ➔ điền ➔ **`Nhập Excel`** ➔ chọn file ➔ tích *Cập nhật hồ sơ nếu Mã NV hoặc SĐT đã tồn tại* nếu muốn ghi đè ➔ **`Bắt Đầu Nhập Dữ Liệu`**. **`Xuất Excel`** để tải danh sách.

Lọc danh sách theo **Phòng ban**, **Chức vụ**, **Trạng thái**.

### C6.2. Hợp đồng lao động & phụ lục

1. Tab **2. Hợp Đồng Lao Động** ➔ **`Tạo Hợp Đồng`** (hoặc **`Ký HĐ Mới`**).
2. **Mục 1 – Thông tin hợp đồng:** Số Hợp Đồng \*, Nhân viên ký HĐ \*, Loại hợp đồng \* (*Xác định thời hạn · Không xác định thời hạn · Thử việc · Khoán việc / Thời vụ*), Trạng thái hiệu lực, Phòng ban \*, Chức vụ \*, Chức danh chi tiết \*, Địa điểm làm việc, Ngày ký \*, Ngày bắt đầu hiệu lực \*, Ngày hết hạn (để trống nếu không xác định thời hạn).
3. **Mục 2 – Tiền lương:**

| Ô nhập | Ý nghĩa |
|---|---|
| Lương Căn Bản HĐ \* | Căn cứ tính lương ngày công |
| Lương Đóng BHXH Bắt Buộc \* | Căn cứ trích BHXH 8%, BHYT 1,5%, BHTN 1% |
| Tỷ Lệ Hưởng Lương (%) \* | 100% chính thức, 85% thử việc |
| Phụ Cấp Cố Định | Trách nhiệm, kiêm nhiệm, điện thoại… |
| Trợ Cấp / Hỗ Trợ Phúc Lợi | Ăn trưa, xăng xe, nhà ở |
| Tổng Thu Nhập HĐ | Tự tính = Lương CB + Phụ cấp + Trợ cấp |
| Loại Đối Tượng Thuế TNCN \* | Cư trú (biểu lũy tiến) · Thời vụ / vãng lai (khấu trừ 10%) · Không cư trú (20%) |
| Đóng BHXH · Tính thuế TNCN · Công đoàn (1%) | Bật / tắt theo từng người |

4. **`Lưu`**. Bấm **`In`** để in hợp đồng A4.
5. **Phụ lục (tăng lương, đổi vị trí):** mở hợp đồng ➔ Mục 3 ➔ **`Ký Phụ Lục Mới`** ➔ nhập Số phụ lục \*, Ngày hiệu lực \*, lương chính / lương BHXH / phụ cấp / trợ cấp mới, phòng ban / chức danh mới, nội dung điều chỉnh \* ➔ **`Lưu Phụ Lục`**.
6. **Chấm dứt hợp đồng:** mở hợp đồng ➔ đổi trạng thái *Đã chấm dứt* (hệ thống hỏi xác nhận).

### C6.3. Bảng chấm công tháng

1. Tab **3. Bảng Chấm Công** ➔ chọn **Kỳ chấm công** (kỳ lương phải được tạo trước ở Tab 4 – C6.4 bước 1).
2. Bấm **`Khởi Tạo Công Tự Động`**: hệ thống tạo dòng công cho mọi nhân sự đang làm việc với mặc định 26 công chuẩn.
3. Sửa trực tiếp trên bảng từng người: **Đi làm (X)**, **Nghỉ phép (P)**, **Nghỉ lễ (L)**, **Không lương (Ro)**, **Tăng ca (giờ)**. *Tổng công tính lương* = X + P + L (X/2 = nửa công).
4. Bấm **`Lưu`** ở từng dòng hoặc **`Lưu Bảng Chấm Công`** để lưu tất cả.

### C6.4. Tính lương & chi lương

1. **Tạo kỳ lương:** Tab **4. Tính Lương** ➔ **`Tạo Kỳ Lương Mới`** ➔ nhập **Mã kỳ (YYYY-MM) \***, Tên kỳ, **Từ ngày \***, **Đến ngày \***, Số ngày công chuẩn ➔ **`Khởi Tạo`**.
2. Chấm công cho kỳ (C6.3).
3. Chọn **Kỳ lương** ➔ **`Tính Lương Tự Động`**. Hệ thống tính cho từng người:
   - **Lương ngày công** = Lương HĐ ÷ công chuẩn × tổng công tính lương × tỷ lệ hưởng;
   - **Lương chuyến xe** (tài xế): lương chuyến chính, cắt kéo & neo xe, thưởng dầu – lấy từ các chuyến đã hoàn tất trong kỳ;
   - cộng **phụ cấp & KPI** ➔ **Tổng Gross**;
   - trừ **BHXH 10,5%**, **thuế TNCN**, **tạm ứng chuyến chưa quyết toán** ➔ **Thực lĩnh Net**.
4. **Điều chỉnh từng người:** bấm **`Xem`** ở dòng ➔ **`Sửa`** ➔ nhập Thưởng KPI, Phụ cấp khác / điện thoại / ăn trưa, Khấu trừ tạm ứng, Khấu trừ khác, Ghi chú lý do ➔ **`Lưu`** (tự tính lại Gross, thuế, Net).
5. **Khóa sổ:** kiểm tra xong ➔ **`Khóa Sổ`** – kỳ chuyển *Đã chốt sổ*, không tính lại được nữa.
6. **Chi lương:** **`Chi Trả Lương (Sổ Quỹ)`** ➔ xác nhận ➔ kỳ chuyển *Đã thanh toán* và hệ thống tự lập **một Phiếu Chi trên Sổ Quỹ** bằng tổng thực lĩnh Net.
7. **File chuyển khoản lô:** **`Xuất Excel Bank`** – danh sách STK, ngân hàng, số tiền, nội dung chuyển khoản để tải lên Internet Banking.
8. **Phiếu lương:** biểu tượng **`In`** ở dòng ➔ **Xem trước & In phiếu lương cá nhân** ➔ **`In Phiếu`**.

Trạng thái kỳ lương: *Dự thảo (đang tính) ➔ Đã kiểm tra ➔ Đã chốt sổ (khóa) ➔ Đã thanh toán (chi quỹ)*.

### C6.5. Chính sách & biểu thuế

Tab **5. Chính Sách & Biểu Thuế** chứa tham số dùng khi tính lương – chỉ quản trị / kế toán trưởng chỉnh:

1. **Giảm trừ gia cảnh & ngày công chuẩn:** giảm trừ bản thân 15,5 triệu/tháng, mỗi người phụ thuộc 6,2 triệu/tháng (NQ 110/2025/UBTVQH15, từ 01/01/2026), 26 công chuẩn, trần lương đóng BHXH ➔ **`Lưu Cấu Hình`**.
2. **Tỷ lệ trích bảo hiểm & công đoàn** (người lao động / doanh nghiệp) ➔ **`Lưu Tỷ Lệ`**.
3. **Biểu thuế TNCN lũy tiến 5 bậc** (Luật 109/2025/QH15, áp dụng từ 01/01/2026).
4. **20 tham số quy định** lương & thuế đồng bộ.
5. **Danh mục phụ cấp, trợ cấp & phúc lợi** (3 nhóm / 15 loại) – phân loại có tính BHXH / thuế TNCN hay không.

> Số người phụ thuộc của từng nhân viên hiện do quản trị viên khai báo (chưa có ô nhập trên màn hình hồ sơ). Cần đăng ký người phụ thuộc, hãy gửi thông tin cho quản trị viên.

## C7. Tài chính & Kế toán

**Nơi thực hiện:** Menu **Tài chính & Kế toán**. Bốn thẻ trên cùng: *Tồn quỹ tiền mặt · Số dư ngân hàng · Tổng tồn quỹ · Dòng tiền thuần (thu – chi)*. Có 8 tab:

| Tab | Dùng để |
|---|---|
| 1. Sổ Quỹ Thu - Chi | Lập và tra cứu phiếu thu / phiếu chi (mẫu S03a-DN) |
| 2. Tạm Ứng Tài Xế | Cấp tạm ứng chuyến và quyết toán hoàn ứng với tài xế |
| 3. Quỹ Điều Vận | Quỹ công ty giao cho điều phối viên để ứng cho tài xế |
| 4. Quyết Toán Tài Xế | Đối soát chi phí – lợi nhuận và **chốt sổ** từng chuyến |
| 5. Quyết Toán Khách Hàng | Chốt doanh thu cước + chi hộ với khách (SOA) |
| 6. Khoản Chi Hộ | Gom khoản chi hộ lập **Debit Note** và xác nhận thu hồi |
| 7. Quyết Toán Đối Tác 3PL | Quyết toán cước xe thuê ngoài |
| 8. Vé BOT Tuyến | Đối chiếu vé BOT thực tế với định mức tuyến |

### C7.1. Sổ quỹ: lập phiếu thu / phiếu chi

1. Tab **1. Sổ Quỹ Thu - Chi** ➔ **`Lập Phiếu Thu`** hoặc **`Lập Phiếu Chi`**.
2. Nhập:

| Ô nhập | Cách nhập |
|---|---|
| Loại Giao Dịch \* | Phiếu Thu (tiền vào) / Phiếu Chi (tiền ra) |
| Hình Thức Thanh Toán \* | Tài khoản ngân hàng (chuyển khoản) / Quỹ tiền mặt |
| Khoản Mục Thu / Chi \* | Ví dụ: thu cước vận tải, thu hồi chi hộ, thu hoàn ứng; chi tạm ứng quỹ điều vận, chi tạm ứng chuyến, chi thầu phụ, chi xăng dầu, chi nạp ETC, chi sửa xe… |
| Số Tiền (VNĐ) \*, Ngày Hạch Toán \* | |
| Phân Loại Đối Tác, Tên Đối Tác Nộp / Nhận Tiền | Khách hàng · Tài xế · Điều phối viên · Nhà xe bạn · Nhà cung cấp / Trạm BOT / Gara · Nội bộ |
| Mã Tham Chiếu / Chứng Từ Gốc, Tên & STK Ngân Hàng | |
| Diễn Giải Lý Do Thu / Chi | In trên phiếu |

3. **`Lưu`** – mã phiếu tự sinh dạng `PT-...` / `PC-...`.
4. **In:** biểu tượng **`In`** ở dòng ➔ chọn **2 Liên / A4 (A5 x 2)** hoặc **1 Liên Đơn** ➔ **`In Phiếu`**. Phiếu có đủ ô ký: Giám đốc, Kế toán trưởng, Người nộp/nhận tiền, Người lập, Thủ quỹ.

Lọc sổ quỹ theo Kỳ, Quỹ (tiền mặt / ngân hàng), loại thu / chi, khoản mục. **`Xuất Sổ Quỹ Excel`** để tải sổ.

> Nhiều phiếu được **hệ thống tự lập**: quyết toán hoàn ứng có chênh lệch, quyết toán xe bạn, thu hồi Debit Note, chi lương. Không lập tay trùng các phiếu này.

### C7.2. Quỹ điều vận (tạm ứng cấp 1: Công ty ➔ Điều phối viên)

1. **Điều vận đề nghị:** Tab **3. Quỹ Điều Vận** ➔ **`+ Yêu Cầu Tạm Ứng Quỹ Từ Cty`** ➔ chọn **Điều phối viên nhận quỹ \***, **Số tiền \***, **Ngày xuất quỹ \***, mục đích, hình thức chi (CK / tiền mặt) ➔ **`Tạo Phiếu Tạm Ứng Quỹ`**. Phiếu ở trạng thái *Chờ duyệt cấp quỹ* (mã `TUDV-...`).
2. **Kế toán duyệt:** bấm **`Duyệt Quỹ`** ở dòng ➔ xác nhận **`Duyệt Xuất Quỹ`** ➔ quỹ chuyển *Đang lưu hành*. Quỹ bị từ chối có thể **`Xóa`**.
3. Bảng quỹ theo dõi: tiền công ty ứng, **đã cấp tài xế**, **đã hoàn ứng về công ty**, **số dư khả dụng**.
4. **Kết thúc quỹ:** khi điều vận đã quyết toán hết các phiếu tạm ứng tài xế, bấm **`Quyết Toán`** ở dòng quỹ ➔ quỹ chuyển *Đã quyết toán hoàn ứng*.

### C7.3. Tạm ứng chuyến cho tài xế (cấp 2) & quyết toán hoàn ứng

**Cấp tạm ứng:**

1. Tab **2. Tạm Ứng Tài Xế** ➔ **`Cấp Tạm Ứng Chuyến`**.
2. Chọn **Chuyến xe \***, **Tài xế nhận tiền \***, nhập **Số tiền \***, **Ngày cấp \***.
3. **Nguồn tiền \***: **Trích Quỹ Điều Vận** (chọn quỹ đang có số dư) hoặc **Cty Chi Trực Tiếp**.
4. Mục đích tạm ứng, ghi chú ➔ **`Xác Nhận Cấp Tạm Ứng`**. Mã phiếu `TUTX-...`, trạng thái *Đang tạm ứng*. Số tiền hiện trên điện thoại tài xế.

**Quyết toán hoàn ứng (sau khi chuyến xong):**

1. Bấm **`Quyết Toán`** ở dòng phiếu `TUTX-...`.
2. Nhập **Tổng chi phí thực tế tài xế đã chi \*** – bấm **`Nạp từ chứng từ chuyến`** để lấy tổng các khoản đã kê trên chuyến.
3. Hệ thống hiện **chênh lệch**:
   - Tạm ứng > thực chi ➔ tài xế nộp lại tiền thừa ➔ tự lập **Phiếu Thu**;
   - Thực chi > tạm ứng ➔ công ty chi bù ➔ tự lập **Phiếu Chi**;
   - Bằng nhau ➔ không lập phiếu.
4. Nhập ghi chú ➔ **`Xác Nhận Quyết Toán Hoàn Ứng`**. Có thể **`In Biên Bản Hoàn Ứng`**.

Phiếu tạm ứng **chưa quyết toán** cuối kỳ sẽ bị **trừ vào lương** tài xế khi tính lương. Nhiều chuyến cùng lúc: dùng **`⚡ Quyết Toán Gom Chuyến`** (C7.9).

### C7.4. Quyết toán tài xế – chốt sổ chi phí chuyến

Tab **4. Quyết Toán Tài Xế**: mỗi dòng là một chuyến với Doanh thu cước, Tổng chi phí, Lợi nhuận gộp, Chứng từ / HĐĐT, Trạng thái sổ sách. Thẻ trên cùng tổng hợp doanh thu, chi phí, lợi nhuận và số chuyến chờ chốt.

1. Lọc *Chờ kế toán đối soát & chốt*.
2. Bấm **`Xem`** để mở chuyến, đối chiếu bảng kê chi phí với hóa đơn / vé / EIR.
3. Đúng ➔ bấm **`Quyết Toán`** ở dòng ➔ chuyến chuyển *Đã chốt sổ chi phí (Khóa)*, các khoản chi phí bị khóa không sửa được.
4. Cần sửa lại: bấm **`Mở Lại`** để mở khóa.
5. In phiếu quyết toán chuyến bằng biểu tượng **`In`**.

### C7.5. Quyết toán khách hàng (SOA)

1. Tab **5. Quyết Toán Khách Hàng** ➔ lọc theo **Khách hàng** và *Chờ quyết toán khách hàng*.
2. Kiểm tra từng chuyến: ngày đóng, số cont / B/L, lộ trình, **cước bán**, **chi hộ**, **tổng thu**, chứng từ POD.
3. Tích chọn các chuyến (hoặc **Chọn tất cả**) ➔ **`⚡ Chốt Quyết Toán Khách Hàng`** ➔ xác nhận. Các chuyến chuyển *Đã chốt quyết toán (SOA)* và được tính vào công nợ phải thu.
4. Bỏ chốt một chuyến: **`Mở Lại`** ở dòng.
5. **`Xem Bảng Kê SOA`** để mở bảng đối soát công nợ của khách (in / gửi khách xác nhận) – xem thêm báo cáo *Công nợ phải thu (AR)* ở C10.

### C7.6. Khoản chi hộ & Debit Note

Tab **6. Khoản Chi Hộ** liệt kê mọi khoản **Công ty chi hộ** từ các chuyến.

1. Lọc *Chờ thu / Chưa gửi Debit Note*, tích chọn các khoản của cùng một khách.
2. **`+ Gom Nhóm Lập Debit Note`** ➔ nhập **Mã số Debit Note \*** (in trên bảng kê gửi khách), **Kênh thu tiền \*** (chuyển khoản / tiền mặt), ngân hàng nhận, ghi chú ➔ **`Xác Nhận Lập Debit Note`**. Trạng thái *Đã xuất Debit Note*.
3. **`Xuất Debit Note Excel`** để gửi bảng kê cho khách.
4. Khi khách trả tiền: bấm **`Thu Tiền`** ở dòng, hoặc chọn nhiều khoản ➔ **`Xác Nhận KH Hoàn Tiền 1-Chạm`** ➔ trạng thái *Đã thu hồi tiền từ khách*, hệ thống tự ghi **Phiếu Thu** vào Sổ quỹ.

### C7.7. Quyết toán đối tác 3PL (xe bạn)

1. Tab **7. Quyết Toán Đối Tác 3PL**: mỗi dòng một chuyến xe thuê ngoài – biển số, tài xế, cước thu khách, **cước trả xe bạn**, chênh lệch công ty hưởng, đã tạm ứng, còn phải trả.
2. Bấm **`Quyết Toán`** ➔ kiểm tra / sửa **Cước thỏa thuận trả xe bạn \***, **Đã tạm ứng trước**; hệ thống cộng **Hoàn chi hộ 3PL** và tính **Còn phải trả xe bạn**.
3. Chọn **Hình thức chi trả \*** (chuyển khoản / tiền mặt), STK & ngân hàng nhận, ghi chú ➔ **`Lưu`**. Hệ thống tự lập **01 Phiếu Chi** cho số tiền còn phải trả.
4. In phiếu đối soát cước xe bạn A4 bằng **`In`**; xuất tổng hợp bằng **`Xuất Bảng Kê Xe Bạn Excel`**. Dòng đã xong hiện **`Đã Xong`** (bấm để xem lại; có nút **`Hủy Quyết Toán`** nếu cần làm lại).

### C7.8. Đối chiếu vé BOT tuyến

Tab **8. Vé BOT Tuyến** so sánh tổng vé BOT tài xế đã chi của từng chuyến với **định mức BOT của tuyến** (khai báo ở Biểu cước khách – B8). Chuyến chi vượt định mức trên 15% được đánh dấu cảnh báo để kiểm tra. **`Xuất Báo Cáo BOT`** để tải ra Excel.

### C7.9. Quyết toán gom chuyến (nhiều chuyến một lần)

**Nơi thực hiện:** Kế toán ➔ **`Quyết Toán Chuyến`** / **`⚡ Quyết Toán Gom Chuyến`**, hoặc Điều vận ➔ **`Quyết Toán Đợt Tài Xế`** (màn hình `/settlements`).

1. Chọn **Gom nhóm theo**: Tài xế · Khách hàng · Đầu xe.
2. Chọn **Từ ngày / Đến ngày** (hoặc nút nhanh *Hôm nay / Tuần này / Tháng này / Tháng trước*), **Bác tài**, **Trạng thái sổ** ➔ **`Lọc Dữ Liệu`**.
3. Bảng hiện từng chuyến: tạm ứng, thực chi kê khai, **chênh lệch**, chứng từ POD. Chọn nhanh bằng **`Chọn tất cả`**, **`Chỉ chuyến chờ quyết toán`**, **`Chuyến khớp đúng (0đ)`**, **`Chuyến có chênh lệch`**.
4. Kiểm tra 3 ô tổng: *Tổng đã tạm ứng · Tổng thực chi hợp lệ · Chênh lệch đối soát*.
5. Tích **Tự động lập Phiếu Thu / Phiếu Chi khi có chênh lệch**, chọn **Hình thức** (chuyển khoản / tiền mặt).
6. Bấm **`XÁC NHẬN QUYẾT TOÁN GOM (n CHUYẾN)`**.

## C8. Xe & Bãi

**Nơi thực hiện:** Menu **Xe & Bãi**. Thẻ chỉ số: số đầu kéo / xe tải (xe nhà – thầu phụ), số rơ-moóc, tỷ lệ xe sẵn sàng nhận đơn, **cảnh báo hạn đăng kiểm 30 ngày** (quá hạn / sắp đến hạn), số xe đến hạn bảo dưỡng / bảo hiểm.

**Hai tab:** **1. Đầu Kéo & Xe Tải** · **2. Rơ-Moóc Container**.

| Việc cần làm | Thao tác |
|---|---|
| Thêm xe mới | **`Thêm Đầu Kéo`** ➔ nhập như B10 ➔ **`Lưu`** |
| Sửa thông tin, gia hạn đăng kiểm / bảo hiểm, cập nhật lịch bảo trì | Bấm biểu tượng bút ở dòng xe / moóc ➔ sửa ➔ **`Lưu`** |
| Xem xe sắp hết hạn đăng kiểm | Ô Trạng thái ➔ *Cảnh báo hết hạn đăng kiểm* |
| Xem xe đến hạn bảo trì | Ô Trạng thái ➔ *Đến hạn bảo trì định kỳ* |
| Đưa xe vào sửa chữa | Sửa xe ➔ Trạng thái *Hư hỏng / Bảo trì* (xe không được gợi ý khi phát lệnh) |
| Theo dõi moóc | Tab 2, lọc *Nằm bãi / Đang kéo / Hư hỏng – Bảo trì* |
| Tải danh sách | **`Xuất Excel`** |

Bảng đầu kéo hiển thị: biển số, loại, tài xế mặc định, hạn đăng kiểm, lịch bảo trì dự kiến, trạng thái. Bảng moóc: biển số, quy cách / loại moóc, hãng sản xuất, tải trọng, hạn đăng kiểm, trạng thái.

## C9. Dịch vụ Hải quan

**Nơi thực hiện:** Menu **Dịch vụ Hải quan**. Thẻ chỉ số: tổng tờ khai (xuất / nhập / đã thông quan), số tờ **luồng xanh**, **luồng vàng**, **luồng đỏ**, tỷ lệ thông quan và tiền thuế còn treo.

**Thêm tờ khai:**

1. Bấm **`Thêm Tờ Khai`**.
2. **Mục 1 – Tờ khai & khách hàng:** **Số tờ khai VNACCS \***, **Ngày đăng ký \***, **Doanh nghiệp / khách hàng \***, Chiều vận chuyển (nhập / xuất), **Loại hình VNACCS \*** (A11, A12, B11, E21, E31, E62, G11, H11), Chi cục hải quan mở tờ khai.
3. **Mục 2 – Phân luồng & trạng thái:** **Phân luồng \*** (Xanh – tự động thông quan · Vàng – thẩm định hồ sơ · Đỏ – kiểm tra thực tế / soi chiếu), **Trạng thái hồ sơ** (Chờ truyền ➔ Đã đăng ký VNACCS ➔ Đang thẩm định ➔ Kiểm hóa ➔ Đã thông quan ➔ Đã qua KV giám sát, hoặc Hủy), Số vận đơn (B/L), Số container, **Mã chuyến xe liên kết** (gắn với lệnh điều xe – tài xế sẽ thấy tình trạng tờ khai trên điện thoại).
4. **Mục 3 – Thuế & chi phí:** thuế XNK & VAT phải nộp, trạng thái nộp thuế, chi hộ kiểm hóa / nâng hạ, phí dịch vụ khai hải quan, ghi chú tiến độ, đính kèm tờ khai (PDF / ảnh, hỗ trợ **`Dán ảnh (Ctrl+V)`**).
5. **`Lưu`**.

**Cập nhật tiến độ:** mở tờ khai (**`Xem`**) ➔ **`Sửa`** ➔ đổi phân luồng / trạng thái / thuế ➔ **`Lưu`**. Lọc danh sách theo phân luồng, trạng thái, chiều vận chuyển, tình trạng thuế, kỳ.

## C10. Báo cáo & Thống kê

**Nơi thực hiện:** Menu **Báo cáo & Thống kê**.

**Cách dùng chung:**

1. Chọn kỳ: **Hôm Nay · Tuần Này · Tháng Này · Quý Này · Năm Nay · Tất Cả**.
2. Chọn **nhóm báo cáo** (4 nút lớn) ➔ chọn **báo cáo** (hàng tab bên dưới).
3. Trên mỗi bảng: sắp xếp theo cột, **`Cột`** để ẩn/hiện, bấm số liệu / dòng để xem chi tiết (nếu có).
4. **`Bảng Kê Chi Tiết`** – danh sách vận đơn thực hiện, lọc theo khách hàng / đầu xe / trạng thái.
5. **`Xuất Excel`** để tải; **`In`** ➔ chọn phân hệ báo cáo ➔ **`Khổ Dọc`** / **`Khổ Ngang`** ➔ **`In`** (bản in có tiêu đề công ty, kỳ báo cáo, ô ký Người lập – Kế toán trưởng – Giám đốc).

**Danh mục báo cáo (17 báo cáo, 4 nhóm):**

| Nhóm | Báo cáo | Trả lời câu hỏi |
|---|---|---|
| **Doanh thu thực hiện** | Doanh thu theo đội xe | Mỗi xe / tài xế làm ra bao nhiêu doanh thu, lợi nhuận |
| | Doanh thu theo khách hàng | Khách nào mang lại doanh thu, sản lượng TEU lớn nhất |
| | Chi phí chuyến (phát sinh) | Chi phí theo tuyến / đầu xe / tài xế / khách; bảng kê chi hộ |
| | Quyết toán chuyến | Chuyến nào đã / chưa quyết toán, phân bổ doanh thu – chi phí |
| **Kinh doanh & khách hàng** | Báo giá khách hàng | Phễu báo giá và tỷ lệ chuyển đổi |
| | Đơn hàng & Booking | Booking đang mở và tiến độ điều xe |
| | Đơn chưa hoàn thành | Đơn / chuyến đang chạy dở (WIP) |
| **Tài chính & quản trị** | Công nợ phải thu (AR) | Dư nợ từng khách theo tuổi nợ (hiện tại, 31–60, 61–90, > 90 ngày) |
| | Tuổi đơn tồn đọng chưa chốt | Chuyến nào lâu chưa khóa sổ và vì sao |
| | Quỹ tạm ứng điều vận | Quỹ đã cấp – đã dùng – đã hoàn của từng điều phối viên |
| | Tạm ứng & chi phí tài xế | Tạm ứng và chi phí từng chuyến, chênh lệch hoàn ứng |
| | Bảng lương chuyến & tài xế | Lương chuyến, phụ cấp, năng suất từng tài xế |
| | Quyết toán xe thầu phụ 3PL | Công nợ với từng nhà xe, chi tiết chuyến thuê ngoài |
| **Xe & vận hành** | Vỏ cont & DEM/DET hãng tàu | Cont theo hãng tàu, cont sắp / đã quá hạn lưu vỏ, lưu bãi |
| | Đúng giờ & chất lượng OTP | Tỷ lệ đúng giờ theo mốc, nguyên nhân trễ |
| | Cắt kéo & lưu xe sau 0H | Chuyến cắt kéo và nhật ký xe chờ hạ qua đêm |
| | Biên bản ngoại lệ & sự cố (OS&D) | Sự cố hiện trường đã ghi nhận |

**Đối soát công nợ một khách hàng:** báo cáo **Công nợ phải thu (AR)** ➔ ở dòng khách:

- **`Đối Soát`** mở **Bảng kê đối soát công nợ (SOA)**: cước vận tải, tiền chi hộ, đã chốt nợ, chờ chốt, đã thu hồi, dư nợ còn phải thu; danh sách chuyến có nút **`Chốt Quyết Toán Khách (Lên Nợ)`** / **`Mở Lại`**; **`In SOA`**, **`Xuất CSV`**.
- **`Bảng Kê`** mở **Bảng kê vận chuyển tháng mẫu 26 cột** ➔ chọn Tháng, Năm, VAT (10% / 8% / 0%) ➔ **`Tải Excel (.xlsx)`** hoặc **`In A4 (Ngang)`** để gửi khách ký xác nhận.

## C11. Giao việc (Tasks)

**Nơi thực hiện:** Dashboard ➔ khung *Công Việc Cần Xử Lý Ngay* ➔ **`Xem tất cả`** (đường dẫn `/tasks`). Bấm **`Tổng quan`** để quay về Dashboard.

**Xem danh sách:** chuyển **`Kanban`** (4 cột: *Cần làm · Đang thực hiện · Chờ nghiệm thu · Hoàn thành* – kéo thả thẻ giữa các cột để đổi trạng thái) hoặc **`Danh sách`**. Lọc **Tất cả / Đã giao** (bạn giao) **/ Được giao** (bạn làm) **/ Liên quan** (bạn theo dõi), và theo phòng ban.

**Giao việc mới:**

1. **`Giao Việc Mới`**.
2. Nhập **Tên công việc \***, mô tả & hướng dẫn; người giao là bạn (tự động).
3. Chọn **phòng ban**, **Người phụ trách \***, **Hạn hoàn thành** (nút nhanh **`+1d`**, **`+3d`**, **`+7d`**), **Mức độ ưu tiên** (Thấp · Bình thường · Cao · Khẩn cấp).
4. **Người liên quan (theo dõi chung):** mở danh sách ➔ tích nhiều người (**`Chọn hết`** / **`Bỏ chọn`**) ➔ **`Xong`**.
5. Thêm **Checklist kiểm tra** (từng bước cần hoàn thành) và **tệp đính kèm** (PDF, Excel, ảnh – tối đa 10MB/tệp).
6. **`Phát Lệnh Giao Việc`** – người phụ trách và người liên quan nhận thông báo chuông.

**Trong màn hình chi tiết công việc:** tích hoàn thành từng mục checklist (**`Thêm`** để bổ sung), tải thêm tệp (**`Dán ảnh (Ctrl+V)`**), trao đổi ở khung **Thảo luận** (**`Gửi`**), xem **Nhật ký hoạt động**, liên kết chuyến xe (nếu có); **`Sửa`** / **`Lưu`** / **`In`** / **`Xóa`**.

**Xin gia hạn:** người phụ trách bấm **`Đề xuất gia hạn`** ➔ nhập **Hạn mới \*** và **Lý do \*** ➔ **`Gửi đề xuất đến người giao việc`** (có thể **`Thu hồi đề xuất`**). Người giao việc bấm **`Đồng ý gia hạn`** hoặc **`Không đồng ý`** (bắt buộc nhập lý do ➔ **`Gửi phản hồi từ chối`**).

## C12. Bản tin & Thông báo nội bộ

**Nơi thực hiện:** Dashboard ➔ khung *Bản Tin & Thông Báo* ➔ nút **Bản tin** (đường dẫn `/news`).

**Đọc tin:** lọc theo danh mục / phòng ban ➔ bấm vào tin để xem toàn văn. Tệp đính kèm (PDF, Word, Excel, ảnh) **xem trước ngay trên trình duyệt**, không cần tải về. Bên dưới là khung **Ý kiến phản hồi & thảo luận** (**`Gửi`**). Số **lượt xem** hiển thị trên mỗi tin.

**Đăng tin:**

1. **`Đăng Bản Tin Mới`**.
2. Nhập **Tiêu đề \***, Danh mục, **Phòng ban nhận tin** (toàn công ty hoặc một phòng), tích **Ghim lên đầu trang** / **Thông báo khẩn cấp** nếu cần.
3. Nhập **Tóm tắt ngắn** (hiện ngoài danh sách), **Nội dung chi tiết \***, **Ảnh bìa** (tùy chọn), **Tài liệu đính kèm** (công văn, quyết định, biểu mẫu – hỗ trợ dán ảnh).
4. **`Xuất bản Bản tin`**. Sửa tin: mở tin ➔ sửa ➔ thêm / gỡ tệp ➔ **`Lưu thay đổi`**.

## C13. Chat nội bộ & Chuông thông báo

**Chat:** bấm **bong bóng chat** góc dưới phải ➔ **`Nhắn tin mới`** ➔ chọn đồng nghiệp ➔ gõ tin ➔ Enter. Trong khung soạn: **`Thành viên (@)`** để nhắc tên người, **`Mục việc (#)`** để chèn liên kết tới một công việc. Gửi được ảnh / tệp (kẹt cảng, ảnh seal…). Số trên bong bóng là tin chưa đọc.

**Chuông thông báo** (thanh trên cùng): báo lệnh mới, việc được giao, bình luận, đề xuất gia hạn, tin nhắn… Mở chuông ➔ lọc **`Tất cả`** / **`Chưa đọc`** ➔ bấm thông báo để đi tới nội dung ➔ **`Đã đọc tất cả`** để xóa số đếm.

**Khi nào dùng gì:** trao đổi nhanh, gửi ảnh hiện trường ➔ **Chat**. Việc cần người chịu trách nhiệm, hạn chót, checklist nghiệm thu ➔ **Giao việc**. Thông báo chính thức cho cả phòng / công ty ➔ **Bản tin**.

## C14. Biểu đồ tùy biến trên Dashboard

**Nơi thực hiện:** Dashboard ➔ biểu đồ *Diễn biến doanh thu, chi phí…* ➔ **`Tùy biến`**.

1. **Bảng dữ liệu:** Chuyến xe & vận chuyển · Chi phí vận hành · Đơn hàng & đặt chỗ · Đội xe & phương tiện · Báo giá & khách hàng · Tạm ứng lái xe · Sự cố & khiếu nại · Nhân sự & đội ngũ.
2. **Phân nhóm theo** (trục nhóm): ví dụ khách hàng, tài xế, tuyến…
3. **Chỉ số đo lường** và **Phép tính**: Tổng (SUM) · Trung bình (AVG) · Đếm (COUNT).
4. **Loại biểu đồ:** Cột đứng · Cột ngang · Đường xu hướng · Donut · Pie.
5. **Thời gian** (toàn bộ, tháng / quý / năm hiện tại, 30 ngày gần nhất), **Giới hạn Top** (5–20), **Thứ tự sắp xếp**, tích **Hiển thị số liệu trên cột / điểm** nếu muốn.
6. Xem trước ngay ở khung **Xem trước biểu đồ trực tiếp** kèm bảng tỷ trọng ➔ **`Áp Dụng Vào Biểu Đồ`**. **`Làm lại`** để chọn lại, **`Hủy bỏ`** để thoát; trên Dashboard bấm **`Mặc định`** để trở về biểu đồ gốc.

---

# PHẦN D. HỎI ĐÁP & XỬ LÝ SỰ CỐ THƯỜNG GẶP

## D1. Khi tạo lệnh, ô Tài xế hoặc Đầu kéo không có tên cần chọn?

- Ô tài xế xe nhà chỉ hiện nhân sự có chức vụ **Tài xế & Giao nhận** và đang **Đang làm việc**. Kiểm tra hồ sơ ở Hành chính & Nhân sự (C6.1), hoặc bấm **`Thêm tài xế`** ngay trên lệnh để thêm nhanh.
- Ô đầu kéo xe nhà chỉ hiện **xe nhà**; xe đang *Hư hỏng / Bảo trì* hoặc *Ngừng sử dụng* sẽ không được gợi ý. Kiểm tra ở Xe & Bãi (C8).
- Chọn **Xe Bạn / 3PL** thì danh sách xe và tài xế lọc theo **nhà xe đã chọn** – khai báo đội xe, tài xế của nhà xe ở Cài đặt ➔ Thầu Phụ & Nhà Cung Cấp (B9), hoặc chọn *+ Nhập biển số / tài xế mới* để nhập tay.

## D2. Chọn "Chi phí công ty", "Công ty chi hộ" hay "3PL chi hộ"?

| Chọn | Khi nào | Ví dụ |
|---|---|---|
| **Chi phí công ty** | Công ty chịu chi phí, không thu lại của khách | Vé BOT, cân xe, bốc xếp, bồi dưỡng kho |
| **Công ty chi hộ** | Công ty trả trước, sẽ thu lại 100% từ khách qua Debit Note | Phí nâng hạ hãng tàu, cược vỏ, vệ sinh cont |
| **3PL chi hộ** | Tài xế xe bạn tự trả trước, công ty hoàn lại khi quyết toán cước | Nhà xe trả phí nâng hạ, lưu ca |

Chọn sai sẽ làm sai lợi nhuận chuyến và công nợ – sửa lại khoản chi trước khi kế toán chốt sổ.

## D3. Vì sao không xóa được khách hàng, xe, khoản mục chi…?

Danh mục đã được dùng trên chứng từ (báo giá, booking, chuyến xe, phiếu thu chi) được bảo vệ để giữ đúng sổ sách. Cách xử lý: mở danh mục ➔ **`Sửa`** ➔ bỏ tích **Đang hoạt động** (hoặc chuyển trạng thái *Ngừng sử dụng / Tạm ngưng*) ➔ **`Lưu`**. Mục đó sẽ không còn hiện trong ô chọn mới nhưng lịch sử vẫn nguyên.

Chuyến xe đã **chốt sổ** không sửa / xóa được chi phí – nhờ kế toán **`Mở Lại`** (C7.4) nếu thật sự cần sửa.

## D4. In báo giá, lệnh xe, phiếu thu chi bị lệch, mất màu?

Trong hộp thoại in của Chrome / Edge:

1. **Khổ giấy:** A4 (A5 cho phiếu thu/chi 1 liên).
2. **Hướng:** Dọc cho văn bản; Ngang cho bảng nhiều cột và bảng kê 26 cột.
3. **Lề:** Mặc định.
4. Tích **Đồ họa nền (Background graphics)** để in đủ logo, viền và màu trạng thái.

Nếu bấm In mà không thấy gì: trình duyệt đã chặn cửa sổ bật lên – cho phép **pop-up** với địa chỉ phần mềm rồi bấm lại.

## D5. Tài xế mất vé BOT hoặc quên chụp POD?

- **Mất vé BOT:** lấy hóa đơn điện tử từ tài khoản VETC / ePass, kê chi phí bằng **`Thêm Chi Phí`** và đính kèm hóa đơn đó (C3.5).
- **Quên chụp POD:** xin thủ kho chụp lại biên bản gửi qua Zalo / email ➔ mở chi tiết chuyến trên máy tính ➔ **`Đính Kèm Chứng Từ / POD`** ➔ **`Chứng Từ Nghiệm Thu (EIR / POD)`** ➔ chọn *Biên bản giao nhận có chữ ký (POD)* ➔ **`Lưu & Đính Kèm`**.

## D6. Tài xế báo link không mở được / link đã khóa?

- Link bị khóa khi chuyến đã **đổi tài xế** (chỉ link mới có hiệu lực) hoặc chuyến đã hoàn tất quá thời gian cho phép.
- Gửi lại link: chi tiết chuyến ➔ **`Link Tài Xế`** (sao chép) hoặc **`Nhắn Zalo`**.
- Tài xế không tự bấm được: điều độ dùng **`Xác Nhận Thay Tài Xế`** hoặc **`Màn Hình Tài Xế`** để cập nhật thay (C3.4).

## D7. Nhập Excel bị lỗi hoặc thiếu dòng?

1. Luôn dùng file từ nút **`Tải Mẫu Excel`** của đúng danh mục, giữ nguyên dòng tiêu đề.
2. Mỗi mã / biển số / mã nhân viên chỉ xuất hiện một lần trong file.
3. Ngày tháng nhập dạng ngày của Excel (hoặc `YYYY-MM-DD`); số điện thoại, MST, số tài khoản để dạng **Text** để không mất số 0 đầu.
4. Dòng trùng mã: tích **Upsert** nếu muốn cập nhật, bỏ tích nếu chỉ thêm mới (dòng trùng sẽ bị bỏ qua).
5. Đọc thông báo kết quả sau khi nhập để biết dòng nào lỗi.

## D8. Lương chuyến của tài xế lấy từ đâu?

- **Lương chuyến** của mỗi chuyến lấy theo **Lương chuyến tài xế** của tuyến (Biểu cước khách – B8, hoặc Biểu phí lương chuyến – B4), cộng phụ cấp kiểm hóa / cảng xa (B4) và phụ cấp neo đêm (C3.7) nếu có.
- Chuyến **cắt kéo** được chia cho 2 tài xế theo tỷ lệ đã chọn khi lập lệnh.
- Khi tính lương (C6.4), hệ thống cộng lương chuyến của các chuyến đã hoàn tất trong kỳ vào lương ngày công, rồi **trừ các phiếu tạm ứng chuyến chưa quyết toán**. Muốn không bị trừ, tài xế cần nộp chứng từ để kế toán quyết toán hoàn ứng trước khi chốt lương.

## D9. Vì sao số trên Dashboard / báo cáo khác với số tôi nghĩ?

- Kiểm tra **kỳ** đang chọn (Hôm nay, Tháng này…) – mỗi màn hình có bộ lọc kỳ riêng.
- Doanh thu *thực hiện* chỉ tính chuyến đã hoàn tất; doanh thu *dự kiến* tính báo giá *Đã ký hợp đồng*.
- Công nợ phải thu chỉ tính chuyến **đã chốt quyết toán khách hàng** (C7.5).
- Bấm **`Làm Mới`** để tải lại số liệu mới nhất.

## D10. Màn hình báo "Bạn không có quyền truy cập chức năng này"?

Tài khoản của bạn chưa được cấp quyền cho chức năng đó. Liên hệ trưởng bộ phận hoặc quản trị viên. Quản trị viên vào **Cài đặt ➔ Khai Báo Ban Đầu ➔ Vai Trò & Phân Quyền** ➔ dòng của bạn ➔ **`Phân Quyền`** (hoặc đổi nhóm vai trò bằng **`Hiệu Chỉnh Thông Tin`**) ➔ **`Lưu Phân Quyền`**. Sau đó bạn tải lại trang (F5).

## D11. Quên mật khẩu?

Liên hệ quản trị viên hệ thống để đặt lại mật khẩu. Sau khi đăng nhập được, tự đổi mật khẩu tại ảnh đại diện ➔ **`Cài đặt tài khoản`** (A1).

---

*Hỗ trợ kỹ thuật: Liên hệ quản trị viên hệ thống GSS để được hỗ trợ*

