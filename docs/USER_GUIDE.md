# SỔ TAY HƯỚNG DẪN SỬ DỤNG HỆ THỐNG BIM LOGISTICS (TMS)
## Cẩm Nang Thao Tác Cầm Tay Chỉ Việc — Hướng Dẫn Từng Bước Cho Người Dùng Mới

> **Đơn vị vận hành:** Công ty TNHH Vận Tải Triền Võ (BIM Logistics Platform)  
> **Phiên bản:** 2.9.46 | **Hỗ trợ trực tuyến:** `https://logistics.bim.info.vn/helps`  
> **Hotline hỗ trợ kỹ thuật:** 0965.559.561

---

## NGUYÊN TẮC THAO TÁC CHUNG TOÀN HỆ THỐNG

1. **Nhận biết trường bắt buộc:** Tất cả các ô nhập liệu có dấu sao đỏ **`*`** là thông tin bắt buộc phải nhập. Nếu để trống, hệ thống sẽ báo lỗi và không cho phép lưu.
2. **Nút Lưu chuẩn hóa:** Nút lưu dữ liệu trên toàn bộ các màn hình và hộp thoại luôn mang tên duy nhất là **`Lưu`** (có màu xanh Teal viền, rê chuột vào sẽ hiển thị màu nền đầy đủ).
3. **Quy tắc an toàn dữ liệu:** Hệ thống áp dụng cơ chế xóa mềm an toàn (*Soft-Delete*). Khi bạn bấm nút **`Xóa`**, dữ liệu chỉ bị ẩn đi chứ không bao giờ bị xóa vĩnh viễn khỏi cơ sở dữ liệu để bảo vệ chứng cứ pháp lý và lịch sử truy vết vận tải.

---

## MỤC LỤC HƯỚNG DẪN THAO TÁC NHANH

1. [Cách Tạo Khách Hàng Mới](#1-cách-tạo-khách-hàng-mới)
2. [Cách Lập Bảng Báo Giá Vận Tải Mới & Duyệt Báo Giá](#2-cách-lập-bảng-báo-giá-vận-tải-mới--duyệt-báo-giá)
3. [Cách Tiếp Nhận Booking / Đơn Hàng Mới Từ Hãng Tàu & Khách Hàng](#3-cách-tiếp-nhận-booking--đơn-hàng-mới-từ-hãng-tàu--khách-hàng)
4. [Cách Tạo Lệnh Điều Động Chuyến Xe Mới (Phát Lệnh Cho Xe)](#4-cách-tạo-lệnh-điều-động-chuyến-xe-mới-phát-lệnh-cho-xe)
5. [Cách Xử Lý Chuyến Cắt Kéo (2 Chặng) & Ghép 2 Cont 20ft](#5-cách-xử-lý-chuyến-cắt-kéo-2-chặng--ghép-2-cont-20ft)
6. [Cách Kê Khai Chi Phí Vận Hành & Khoản Chi Hộ Khách Hàng](#6-cách-kê-khai-chi-phí-vận-hành--khoản-chi-hộ-khách-hàng)
7. [Cách Tài Xế Báo 6 Mốc Kho & Chụp Ảnh POD/EIR Trên Điện Thoại](#7-cách-tài-xế-báo-6-mốc-kho--chụp-ảnh-podeir-trên-điện-thoại)
8. [Cách Thêm Mới Đầu Kéo & Rơ-Moóc Vào Đội Xe](#8-cách-thêm-mới-đầu-kéo--rơ-moóc-vào-đội-xe)
9. [Cách Thêm Hồ Sơ Nhân Viên / Bác Tài Mới](#9-cách-thêm-hồ-sơ-nhân-viên--bác-tài-mới)
10. [Cách Kế Toán Cấp Quỹ Tạm Ứng Điều Vận Cấp 1](#10-cách-kế-toán-cấp-quỹ-tạm-ứng-điều-vận-cấp-1)
11. [Cách Điều Vận Cấp Tạm Ứng Dọc Đường Cho Tài Xế Cấp 2](#11-cách-điều-vận-cấp-tạm-ứng-dọc-đường-cho-tài-xế-cấp-2)
12. [Cách Quyết Toán Hoàn Ứng Chuyến Xe & Cân Đối Sổ Quỹ](#12-cách-quyết-toán-hoàn-ứng-chuyến-xe--cân-đối-sổ-quỹ)
13. [Cách Tạo Phiếu Thu / Phiếu Chi Sổ Quỹ Mẫu S03a-DN](#13-cách-tạo-phiếu-thu--phiếu-chi-sổ-quỹ-mẫu-s03a-dn)
14. [Cách Thỏa Thuận Cước & Quyết Toán Xe Bạn / Thầu Phụ 3PL](#14-cách-thỏa-thuận-cước--quyết-toán-xe-bạn--thầu-phụ-3pl)
15. [Cách Khai Báo & Quản Lý Tờ Khai Hải Quan Điện Tử](#15-cách-khai-báo--quản-lý-tờ-khai-hải-quan-điện-tử)
16. [Cách Quyết Toán Gom Chuyến Xe Hàng Loạt (Batch Settlement)](#16-cách-quyết-toán-gom-chuyến-xe-hàng-loạt-batch-settlement)
17. [Cách Xem, Lọc, Tùy Chỉnh Cột & In 14 Báo Cáo BI Khổ A4](#17-cách-xem-lọc-tùy-chỉnh-cột--in-14-báo-cáo-bi-khổ-a4)
18. [Cách Quản Lý Danh Mục Gốc (Địa Điểm, Hãng Tàu, Khoản Mục Chi Phí)](#18-cách-quản-lý-danh-mục-gốc-địa-điểm-hãng-tàu-khoản-mục-chi-phí)

---

## 1. CÁCH TẠO KHÁCH HÀNG MỚI

*Dành cho: Nhân viên Kinh doanh, Kế toán, Quản trị viên.*

### Bước 1: Điều hướng vào màn hình tạo khách hàng
- **Cách 1 (Từ menu Cài đặt):** Trên thanh điều hướng bên trái (Sidebar), bấm vào menu **`Cài đặt`** ➔ Chọn thẻ danh mục **`Khách Hàng`** ➔ Bấm nút **`+ Thêm Khách Hàng`** (nút màu xanh góc trên bên phải).
- **Cách 2 (Từ phân hệ Kinh doanh):** Bấm vào menu **`Sale & Booking`** ➔ Chọn tab con **`Khách Hàng`** ➔ Bấm nút **`+ Thêm Khách Hàng`**.

### Bước 2: Nhập thông tin khách hàng trên hộp thoại
Điền đầy đủ thông tin vào các trường (chú ý các trường có dấu `*` bắt buộc):
1. **Mã Khách Hàng `*`:** Nhập mã viết tắt viết hoa không dấu (Ví dụ: `SAMSUNG`, `VINFAST`, `NESTLE`, `KH-001`). Mã này không được trùng lặp.
2. **Tên Doanh Nghiệp / Khách Hàng `*`:** Nhập tên đầy đủ theo giấy phép ĐKKD (Ví dụ: `CÔNG TY TNHH SAMSUNG ELECTRONICS VIỆT NAM`).
3. **Mã Số Thuế (MST) `*`:** Nhập đúng mã số thuế 10 số hoặc 13 số để phục vụ xuất hóa đơn và đối soát công nợ.
4. **Địa Chỉ Trụ Sở `*`:** Nhập địa chỉ đăng ký kinh doanh của công ty khách hàng.
5. **Người Liên Hệ / Đại Diện:** Nhập họ tên người phụ trách điều vận hoặc kế toán phía khách hàng (Ví dụ: `Anh Tuấn - Điều phối kho`).
6. **Số Điện Thoại Liên Hệ `*`:** Nhập số di động hoặc máy bàn để liên lạc khẩn cấp khi giao nhận hàng.
7. **Email Nhận Hóa Đơn / Báo Giá:** Nhập email để hệ thống gửi liên kết báo giá và chứng từ điện tử.
8. **Kỳ Hạn Thanh Toán (Công nợ):** Nhập số ngày cho phép nợ (Ví dụ: `30` ngày kể từ ngày nhận đủ POD).

### Bước 3: Lưu và hoàn tất
- Kiểm tra lại các trường có dấu `*`.
- Bấm nút **`Lưu`** ở góc dưới bên phải hộp thoại.
- Thông báo *"Đã lưu bản ghi thành công!"* xuất hiện. Khách hàng mới sẽ hiển thị ngay trong danh sách.

---

## 2. CÁCH LẬP BẢNG BÁO GIÁ VẬN TẢI MỚI & DUYỆT BÁO GIÁ

*Dành cho: Nhân viên Kinh doanh, Trưởng phòng Sales, Ban Giám Đốc.*

### Bước 1: Vào phân hệ Báo giá
- Trên thanh điều hướng bên trái, bấm vào menu **`Sale & Booking`**.
- Tại hàng tab phía trên, chọn tab **`Báo Giá`**.
- Bấm nút **`+ Tạo Báo Giá Mới`** (nút màu teal góc phải).

### Bước 2: Nhập thông tin chung của Báo giá
1. **Khách Hàng `*`:** Bấm vào danh sách thả xuống, chọn khách hàng cần báo giá (Ví dụ: `CÔNG TY TNHH SAMSUNG ELECTRONICS`).
2. **Ngày Hiệu Lực `*`:** Chọn ngày bắt đầu áp dụng cước phí (Mặc định là ngày hôm nay).
3. **Ngày Hết Hạn `*`:** Chọn hạn chót báo giá (Thường là 30 ngày sau).
4. **Phương Thức Định Giá `*`:**
   - Chọn **`Theo ma trận tuyến đường (MULTI_ROUTE)`**: Áp dụng đơn giá cố định cho từng tuyến cụ thể.
   - Chọn **`Điều chỉnh theo giá dầu DO (FUEL_ADJUSTED)`**: Tự động tăng/giảm cước khi giá dầu thị trường biến động.
   - Chọn **`Bao chuyến / Trọn gói tháng (FLAT_CHARTER)`**: Thu cước theo tháng hoặc chuyến bao xe.
5. **Giá Dầu DO Tham Chiếu:** Nhập giá dầu DO tại thời điểm báo giá (Ví dụ: `18.500` đ/lít) nếu chọn phương thức biến động theo dầu.
6. **Điều Khoản Thanh Toán & Ghi Chú:** Ghi rõ điều khoản thanh toán (Ví dụ: Chuyển khoản trong 30 ngày sau khi nhận hóa đơn và đủ POD gốc).

### Bước 3: Thêm các tuyến đường và đơn giá cước
- Tại khu vực **"Chi Tiết Các Tuyến Đường Vận Chuyển"**, bấm nút **`+ Thêm Tuyến Đường`**.
- Nhập thông tin từng dòng tuyến:
  * **Tên Tuyến / Lộ Trình `*`:** Nhập nơi đi và nơi đến (Ví dụ: `Cảng Cát Lái ➔ KCN VSIP 1, Bình Dương`).
  * **Loại Container `*`:** Chọn `20DC`, `40HC`, `45G1`...
  * **Đơn Giá Cước (VNĐ) `*`:** Nhập số tiền cước thu khách (Ví dụ: `3.500.000` đ).
  * **Định Mức Lương Tài Xế (VNĐ):** Nhập mức lương khoán chuyến cho tài xế chạy tuyến này (Ví dụ: `450.000` đ).
  * **Định Mức Vé Cầu Đường BOT (VNĐ):** Nhập tiền vé BOT định mức tuyến (Ví dụ: `280.000` đ).
- Có thể bấm **`+ Thêm Tuyến Đường`** nhiều lần để thêm các tuyến khác trong cùng một bản báo giá.

### Bước 4: Lưu báo giá
- Bấm nút **`Lưu`** ở góc dưới. Hệ thống tự động sinh Mã báo giá dạng `BG-MMDD-XX`.
- Báo giá ban đầu ở trạng thái **`Đang thương lượng`** (màu xanh dương).

### Bước 5: Duyệt và in báo giá gửi khách hàng
- Khi Ban Giám Đốc hoặc Trưởng phòng đồng ý: Mở chi tiết báo giá ➔ Bấm nút **`Duyệt Báo Giá`** ➔ Trạng thái chuyển sang **`Đã Duyệt`** (màu xanh ngọc).
- Bấm nút **`In Báo Giá A4`** ➔ Chọn 1 trong 3 mẫu in doanh nghiệp ➔ Trình duyệt mở bản in chuẩn A4 sẵn sàng in ra giấy hoặc lưu thành file PDF gửi khách hàng.

---

## 3. CÁCH TIẾP NHẬN BOOKING / ĐƠN HÀNG MỚI TỪ HÃNG TÀU & KHÁCH HÀNG

*Dành cho: Nhân viên Kinh doanh, Điều phối viên.*

### Bước 1: Vào phân hệ Booking
- Trên thanh điều hướng bên trái, bấm vào menu **`Sale & Booking`**.
- Chọn tab **`Booking & Đơn Hàng`**.
- Bấm nút **`+ Tiếp Nhận Booking`** (nút màu teal).

### Bước 2: Nhập thông tin đơn hàng / booking
1. **Khách Hàng `*`:** Chọn khách hàng gửi đơn vận chuyển.
2. **Số Booking / Số B/L `*`:** Nhập mã số booking do hãng tàu cấp (Ví dụ: `ONEBKK123456`) hoặc số vận đơn đường biển B/L.
3. **Hãng Tàu `*`:** Nhập hoặc chọn hãng tàu (MAEU, ONE, COSCO, EVERGREEN, CMA-CGM, SITC...).
4. **Loại Dịch Vụ `*`:** 
   - Chọn **`Hàng Xuất (EXPORT)`**: Kéo cont rỗng từ depot đến kho khách đóng hàng rồi hạ cảng xuất.
   - Chọn **`Hàng Nhập (IMPORT)`**: Kéo cont có hàng từ cảng về kho khách dỡ hàng rồi trả rỗng.
   - Chọn **`Nội Địa (DOMESTIC)`**: Vận chuyển hàng hóa nguyên chuyến giữa các tỉnh thành.
5. **Loại Container `*`:** Chọn `20DC`, `40HC`, `45G1`, `20RF` (cont lạnh)...
6. **Số Lượng Container `*`:** Nhập tổng số lượng vỏ cont cần điều phối (Ví dụ: `5` cont).
7. **Nơi Cấp Cont Rỗng `*`:** Chọn Depot hoặc Cảng chỉ định lấy vỏ rỗng (Ví dụ: `Depot Tân Cảng Suối Tiên`).
8. **Kho Đóng / Dỡ Hàng `*`:** Chọn nhà máy hoặc kho hàng của khách hàng (Ví dụ: `Kho Samsung - KCN Yên Phong`).
9. **Nơi Hạ Cont Hàng `*`:** Chọn Cảng đích hạ cont (Ví dụ: `Cảng Cát Lái - Bãi Terminal 1`).
10. **Hạn Cắt Máng (CY Closing Time) `*`:** Chọn ngày và giờ cut-off đóng bãi của tàu (Ví dụ: `12/10/2026 18:00`). **Rất quan trọng để cảnh báo trễ tàu.**
11. **Tên Tàu & Số Chuyến:** Nhập tên tàu biển và số chuyến (Ví dụ: `ONE CONTINUITY / 025W`).
12. **Đính Kèm File Lệnh:** Bấm nút chọn file để đính kèm file ảnh chụp hoặc PDF của lệnh giao hàng (Booking Confirmation).

### Bước 3: Lưu và phát lệnh
- Bấm nút **`Lưu`**.
- Đơn hàng được tạo thành công với mã `BK-YYYY-MMDD-XX` ở trạng thái **`Chờ điều xe`**.
- Tại danh sách booking, bạn có thể bấm nút **`Phát Lệnh Xe`** để chuyển trực tiếp thông tin sang lập chuyến xe vận chuyển.

---

## 4. CÁCH TẠO LỆNH ĐIỀU ĐỘNG CHUYẾN XE MỚI (PHÁT LỆNH CHO XE)

*Dành cho: Điều phối viên, Quản lý Đội xe.*

### Bước 1: Vào phân hệ Điều vận
- Trên thanh điều hướng bên trái, bấm vào menu **`Điều vận`**.
- Bấm nút **`+ Lệnh Điều Xe Mới`** (nút màu teal góc trên bên phải).

### Bước 2: Chọn Booking gốc (Nếu có)
- Tại mục **"Kế thừa từ Booking"**, nếu chuyến này nằm trong một lô hàng đã tiếp nhận, hãy chọn mã Booking tương ứng.
- Hệ thống sẽ **tự động điền trước 100%**: Tên khách hàng, loại cont, lộ trình lấy rỗng, kho đóng hàng, cảng hạ và hạn cut-off, giúp bạn tiết kiệm thời gian và tránh sai sót.

### Bước 3: Phân công phương tiện và tài xế
1. **Xe Đầu Kéo `*`:** Bấm chọn biển số xe đầu kéo đang ở trạng thái rảnh tại bãi (Ví dụ: `51C-123.45`).
2. **Rơ-Moóc `*`:** Bấm chọn biển số rơ-moóc xương hoặc cổ cò phù hợp với kích cỡ cont (Ví dụ: `51R-098.76`).
3. **Bác Tài Chính `*`:** Bấm chọn bác tài phụ trách điều khiển xe chặng 1 (Ví dụ: `Nguyễn Văn Bình - BỤI 94`).
4. **Số Container `*`:** Nhập chính xác 11 ký tự số container theo chuẩn ISO (Ví dụ: `MSKU1234567`). Hệ thống sẽ tự động viết hoa toàn bộ.
5. **Số Chì (Seal):** Nhập mã niêm phong kẹp chì (Ví dụ: `ML-VN987654`).
6. **Lịch Hẹn Tại Kho Khách `*`:** Chọn ngày và giờ tài xế phải có mặt tại cổng kho khách hàng.
7. **Hạn Lưu Vỏ (Free-time DET) `*`:** Chọn ngày hết hạn lưu vỏ cont do hãng tàu quy định (Ví dụ: Sau 7 ngày lấy rỗng).

### Bước 4: Lưu và phát lệnh tới tài xế
- Bấm nút **`Lưu`** ở góc dưới. Chuyến xe được tạo với mã dạng `TVL-MMDD-XXX`.
- Bấm nút **`Phát Lệnh Xe`**: Hệ thống sẽ sinh đường link an toàn (Capability URL) gửi đến Zalo hoặc SMS của tài xế để tài xế mở trên điện thoại tiếp nhận chuyến.

---

## 5. CÁCH XỬ LÝ CHUYẾN CẮT KÉO (2 CHẶNG) & GHÉP 2 CONT 20FT

*Dành cho: Điều phối viên.*

### A. Nghiệp vụ Cắt Kéo (Drop & Hook — 2 Chặng Xe)
*Áp dụng khi: Xe 1 lấy cont kéo đến kho khách cắm moóc nằm chờ đóng hàng, sau đó Xe 2 đến kéo cont hàng ra cảng hạ bãi.*

1. Trong hộp thoại tạo/sửa chuyến xe, tìm đến mục **"Tác Nghiệp Cắt Kéo (2 Chặng)"**.
2. **Gạt bật công tắc:** Bấm chọn ô **`Tách 2 chặng cắt kéo (is_split_trip)`**.
3. Khi bật, hệ thống sẽ mở thêm 3 trường phân công cho Chặng 2:
   - **Tài Xế Chặng 2 (Hạ bãi) `*`:** Chọn bác tài sẽ đến kho kéo cont hàng ra cảng.
   - **Xe Đầu Kéo Chặng 2 `*`:** Chọn đầu kéo của chặng 2.
   - **Tỷ Lệ Chia Lương Chuyến:** Chọn tỷ lệ chia lương giữa 2 tài xế (Ví dụ: `50% - 50%` hoặc `60% - 40%`).
4. Bấm **`Lưu`**. Trên danh sách điều vận, chuyến sẽ có badge màu tím ghi rõ: **`Cắt Kéo (2 Chặng)`**.

### B. Nghiệp vụ Chở Ghép 2 Cont 20ft (Twin 20ft Drayage)
*Áp dụng khi: Một đầu kéo chở đồng thời 2 vỏ cont 20ft trên cùng 1 rơ-moóc 40ft/45ft.*

1. Trong hộp thoại điều xe, chọn loại cont là **`20DC`**.
2. **Gạt bật công tắc:** Bấm chọn ô **`Chở Ghép 2 Cont 20ft (is_twin_container)`**.
3. Hệ thống sẽ mở thêm cụm nhập liệu cho vỏ cont thứ 2:
   - **Số Container 2 `*`:** Nhập số vỏ cont thứ hai (Ví dụ: `TGHU9876543`).
   - **Số Chì (Seal) 2:** Nhập số seal của cont thứ hai.
   - **Số B/L hoặc Booking 2:** Nhập booking đi kèm của cont thứ hai.
4. Bấm **`Lưu`**. Doanh thu và chi phí nâng hạ cảng của cả 2 vỏ cont sẽ được hệ thống quản lý chuẩn xác.

---

## 6. CÁCH KÊ KHAI CHI PHÍ VẬN HÀNH & KHOẢN CHI HỘ KHÁCH HÀNG

*Dành cho: Điều phối viên, Tài xế, Kế toán.*

### Bước 1: Mở chi tiết chuyến xe cần kê khai chi phí
- Vào menu **`Điều vận`** ➔ Bấm vào mã chuyến xe (Ví dụ: `TVL-1011-001`) để mở trang chi tiết.
- Cuộn xuống khu vực **"Bảng Kê Chi Phí Phát Sinh & P&L Chuyến Xe"**.
- Bấm nút **`+ Thêm Chi Phí`** (nút màu teal).

### Bước 2: Nhập thông tin khoản chi
1. **Khoản Mục Chi Phí `*`:** Chọn đúng mục chi phí phát sinh:
   - `LIFT_ON`: Phí nâng cont rỗng tại bãi/cảng.
   - `LIFT_OFF`: Phí hạ cont tại cảng đích.
   - `TOLL_FEE`: Tiền vé cầu đường, BOT, trạm thu phí.
   - `CONTAINER_DEPOSIT`: Tiền đặt cược vỏ container hãng tàu.
   - `WEIGHING`: Tiền cân xe tại trạm cân VGM.
   - `LABOR_STEVEDORING`: Chi phí bốc dỡ hàng tại kho.
   - `OTHER`: Phí neo xe quá giờ, vá vỏ dọc đường...
2. **Thành Tiền (VNĐ) `*`:** Nhập số tiền thực chi (Ví dụ: `450.000` đ).
3. **Thuế Suất VAT:** Chọn `0%`, `8%` hoặc `10%` theo hóa đơn.
4. **Mã Tra Cứu HĐĐT / Số Hóa Đơn:** Nhập mã tra cứu hóa đơn điện tử cảng để kế toán đối soát thuế.
5. **Ảnh Chứng Từ / Biên Lai:** Bấm chọn tải lên ảnh chụp phiếu thu hoặc biên lai hóa đơn.

### Bước 3: ĐẶC BIỆT — Xử lý khoản Chi Hộ Khách Hàng (Debit Note)
- **Nếu đây là khoản chi hộ mà công ty chỉ ứng tiền trước và sẽ thu lại 100% từ khách hàng** (Ví dụ: phí kiểm dịch, phí lưu bãi cảng do lỗi khách hàng, nâng hạ chỉ định):
  * **Gạt bật công tắc:** Bấm vào ô **`Chi hộ Khách hàng (is_on_behalf_of_customer)`**.
  * **Quy tắc hệ thống:** Khoản tiền này **TUYỆT ĐỐI KHÔNG TÍNH VÀO CHI PHÍ VẬN HÀNH CỦA XE**. Lợi nhuận P&L của xe không bị giảm đi. Khoản này sẽ tự động chuyển sang Báo cáo 4 và phân hệ Công nợ để xuất giấy đòi tiền (*Debit Note*) thu lại từ khách hàng.

### Bước 4: Lưu khoản chi
- Bấm nút **`Lưu`**. Khoản chi lập tức xuất hiện trong bảng và hệ thống tự động tính lại Lợi nhuận gộp tức thì.

---

## 7. CÁCH TÀI XẾ BÁO 6 MỐC KHO & CHỤP ẢNH POD/EIR TRÊN ĐIỆN THOẠI

*Dành cho: Các Bác Tài điều khiển xe đầu kéo.*

### Bước 1: Mở liên kết nhận lệnh trên điện thoại
- Tài xế mở Zalo hoặc SMS ➔ Bấm vào đường link nhận từ điều độ (Ví dụ: `https://logistics.bim.info.vn/driver/AbCd1234XyZ`).
- Màn hình Driver Portal mở ra với đầy đủ thông tin: Biển số xe, số cont, địa chỉ bãi lấy cont, địa chỉ kho đóng hàng và cảng hạ.

### Bước 2: Báo mốc vận hành bằng nút bấm 1 chạm
Tài xế thực hiện thao tác theo đúng trình tự di chuyển:
1. **Khi nhận chuyến:** Bấm nút màu xanh **`[Xác Nhận Nhận Lệnh]`**.
2. **Khi lấy xong cont rỗng tại bãi:** Bấm nút **`[Đã Lấy Cont Rỗng (EIR)]`**.
3. **Khi xe đến cổng kho khách hàng:** Bấm nút **`[Đã Đến Cổng Kho]`**.
4. **Khi kho bắt đầu đóng/dỡ hàng:** Bấm nút **`[Bắt Đầu Đóng Hàng]`**.
5. **Khi đóng hàng xong, rời kho:** Bấm nút **`[Hoàn Tất, Rời Kho]`**.
6. **Khi hạ cont tại cảng đích:** Bấm nút **`[Đã Hạ Bãi Xong]`**.

### Bước 3: Chụp ảnh chứng từ tải lên máy chủ
- Dưới mỗi mốc, có nút **`[Chụp Ảnh POD / EIR]`**.
- Bác tài bấm nút ➔ Camera điện thoại mở ra ➔ Chụp ảnh biên bản giao nhận có chữ ký thủ kho hoặc phiếu EIR hạ bãi ➔ Bấm **`Tải Lên`**.
- Chứng từ sẽ hiển thị ngay lập tức trên máy tính của Điều phối viên và Kế toán tại văn phòng.

---

## 8. CÁCH THÊM MỚI ĐẦU KÉO & RƠ-MOÓC VÀO ĐỘI XE

*Dành cho: Quản lý Đội xe, Kỹ thuật viên, Ban Giám Đốc.*

### Bước 1: Vào phân hệ Xe & Bãi
- Trên thanh điều hướng bên trái, bấm vào menu **`Xe & Bãi`**.
- Chọn tab **`Đầu Kéo`** hoặc tab **`Rơ-Moóc`**.
- Bấm nút **`+ Thêm Phương Tiện Mới`** (nút màu teal góc phải).

### Bước 2: Nhập thông tin kỹ thuật của xe
1. **Biển Số Xe `*`:** Nhập biển số đúng chuẩn giao thông (Ví dụ: `51C-678.90` đối với đầu kéo, `51R-123.45` đối với moóc).
2. **Loại Phương Tiện `*`:** Chọn `Đầu kéo Container`, `Xe tải 10T`, `Xe tải 2T`...
3. **Hình Thức Sở Hữu `*`:** Chọn `Xe Nhà (OWNED)` nếu thuộc công ty, hoặc `Xe Bạn (SUBCONTRACTOR)` nếu thuê ngoài.
4. **Tải Trọng Kéo Cho Phép (Tấn) `*`:** Nhập tải trọng thiết kế (Ví dụ: `38.5` tấn).
5. **Hạn Đăng Kiểm `*`:** Chọn ngày hết hạn sổ đăng kiểm xe. *(Hệ thống tự động báo đỏ khi còn dưới 15 ngày).*
6. **Hạn Bảo Dưỡng Kế Tiếp:** Nhập ngày dự kiến đưa xe vào xưởng bảo dưỡng thay nhớt.
7. **Bác Tài Mặc Định:** Chọn bác tài chính được giao quản lý đầu kéo này.

### Bước 3: Lưu hoàn tất
- Bấm nút **`Lưu`**. Phương tiện mới sẽ xuất hiện trên sơ đồ bãi xe.

---

## 9. CÁCH THÊM HỒ SƠ NHÂN VIÊN / BÁC TÀI MỚI

*Dành cho: Phòng Hành chính Nhân sự, Ban Giám Đốc.*

### Bước 1: Vào phân hệ Nhân sự
- Trên thanh điều hướng bên trái, bấm vào menu **`Hành chính & Nhân sự`**.
- Bấm nút **`+ Thêm Nhân Sự Mới`** (nút màu teal góc phải).

### Bước 2: Nhập thông tin hồ sơ nhân viên
1. **Mã Nhân Viên `*`:** Nhập mã số nhân viên (Ví dụ: `TX-015` cho tài xế, `DP-002` cho điều phối).
2. **Họ Và Tên `*`:** Nhập họ tên đầy đủ theo CCCD (Ví dụ: `Trần Văn Hùng`).
3. **Phòng Ban `*`:** Chọn `Đội Xe & Bãi` (cho tài xế), `Điều Vận`, `Kế Toán`, `Kinh Doanh`...
4. **Vai Trò Hệ Thống `*`:** Chọn vai trò để phân quyền đăng nhập:
   - `DRIVER`: Tài xế xe đầu kéo.
   - `DISPATCHER`: Điều phối viên.
   - `ACCOUNTANT`: Kế toán.
   - `SALESMAN`: Nhân viên kinh doanh.
5. **Số Điện Thoại Liên Hệ `*`:** Nhập số điện thoại để gọi điều độ và liên kết Zalo.
6. **Biệt Danh Hiện Trường:** Nhập biệt danh gọi bộ đàm của tài xế (Ví dụ: `HÙNG ĐỒNG NAI`).
7. **Thông tin Bằng Lái (Đối với Tài Xế):**
   - **Số GPLX `*`:** Nhập số giấy phép lái xe 12 số.
   - **Hạng GPLX `*`:** Chọn `Hạng FC` (Bắt buộc để điều khiển xe đầu kéo sơ-mi rơ-moóc).
   - **Hạn GPLX `*`:** Nhập ngày hết hạn bằng lái. *(Hệ thống cảnh báo đổi bằng trước 30 ngày).*
8. **Mức Lương Cơ Bản (VNĐ):** Nhập mức lương cứng ký hợp đồng lao động.

### Bước 3: Lưu hồ sơ
- Bấm nút **`Lưu`**.
- Bạn có thể bấm nút **`In Sơ Yếu Hồ Sơ A4`** để in hồ sơ lưu trữ nội bộ theo chuẩn doanh nghiệp.

---

## 10. CÁCH KẾ TOÁN CẤP QUỸ TẠM ỨNG ĐIỀU VẬN CẤP 1

*Dành cho: Kế toán trưởng, Ban Giám Đốc.*

### Mục đích:
Cấp một gói hạn mức tiền mặt (Ví dụ: 20 triệu hoặc 50 triệu) cho Điều phối viên để điều phối chủ động chi tiền dọc đường cho các tài xế trong ca làm việc.

### Các bước thực hiện:
1. Vào menu **`Tài chính & Kế toán`** ➔ Chọn tab **`Tạm Ứng & Hoàn Ứng`** (hoặc mở phân hệ Quyết toán).
2. Tại khu vực **"Quỹ Tạm Ứng Điều Vận (Cấp 1)"**, bấm nút **`+ Cấp Quỹ Điều Vận`**.
3. Điền thông tin gói quỹ:
   - **Điều Phối Viên Nhận Quỹ `*`:** Chọn nhân viên điều vận nhận tiền.
   - **Số Tiền Hạn Mức (VNĐ) `*`:** Nhập số tiền cấp (Ví dụ: `30.000.000` đ).
   - **Nguồn Tiền Xuất Quỹ `*`:** Chọn `Tiền Mặt Tại Két` hoặc `Chuyển Khoản Ngân Hàng`.
   - **Ghi Chú:** Nhập mục đích (Ví dụ: Cấp quỹ ứng phí nâng hạ và BOT ca tuần 41).
4. Bấm nút **`Lưu`**.
5. Gói quỹ được tạo ở trạng thái **`Đang lưu hành`**. Hệ thống sẽ tự động trừ quỹ tiền mặt/ngân hàng của công ty và theo dõi tỷ lệ giải ngân của điều phối viên.

---

## 11. CÁCH ĐIỀU VẬN CẤP TẠM ỨNG DỌC ĐƯỜNG CHO TÀI XẾ CẤP 2

*Dành cho: Điều phối viên.*

### Mục đích:
Trích tiền từ gói Quỹ Điều Vận được giao để phát tạm ứng cho tài xế trước khi xuất bãi chạy chuyến hàng.

### Các bước thực hiện:
1. Trong màn hình **`Điều vận`** hoặc **`Tài chính & Kế toán`**, bấm nút **`+ Cấp Tạm Ứng Tài Xế`**.
2. Nhập thông tin phiếu tạm ứng chuyến:
   - **Mã Chuyến Xe `*`:** Chọn mã chuyến xe tài xế chuẩn bị chạy (Ví dụ: `TVL-1011-001`).
   - **Tài Xế Nhận Tiền `*`:** Hệ thống tự động chọn tài xế đang gán cho chuyến xe đó.
   - **Số Tiền Tạm Ứng (VNĐ) `*`:** Nhập số tiền phát cho tài xế (Ví dụ: `2.500.000` đ).
   - **Nguồn Tiền Trích Ứng `*`:** Chọn `Trích từ Quỹ Điều Vận của tôi` (hoặc `Công ty chi trực tiếp`).
   - **Chi Tiết Dự Kiến:** Ghi rõ cơ cấu tiền ứng (Ví dụ: Nâng hạ 900k + BOT 600k + Dầu 1.000k).
3. Bấm nút **`Lưu`**. Hệ thống sinh mã phiếu `TUTX-YYYY-XXX` và trừ tương ứng vào số dư quỹ của điều phối viên.

---

## 12. CÁCH QUYẾT TOÁN HOÀN ỨNG CHUYẾN XE & CÂN ĐỐI SỔ QUỸ

*Dành cho: Kế toán vận tải, Điều phối viên.*

### Mục đích:
Khi tài xế hoàn thành chuyến hàng trở về bãi, tiến hành đối chiếu giữa **Số tiền đã ứng** và **Số tiền thực tế tài xế đã chi** để thu hồi tiền thừa hoặc chi bù tiền thiếu.

### Các bước thực hiện:
1. Vào menu **`Tài chính & Kế toán`** ➔ Chọn tab **`Tạm Ứng & Hoàn Ứng`**.
2. Tìm dòng phiếu tạm ứng của tài xế (Mã `TUTX-...`) ➔ Bấm nút **`Quyết Toán Hoàn Ứng`** (nút màu vàng hổ phách).
3. Hộp thoại đối soát hiện ra với bảng so sánh tự động:
   - **Tổng tiền đã tạm ứng trước:** Ví dụ: `2.500.000` đ.
   - **Tổng chi phí thực tế có chứng từ:** Ví dụ: `2.100.000` đ.
   - **Chênh lệch đối soát:** `+400.000` đ (Tài xế còn dư tiền).
4. **Xử lý kết quả cân đối:**
   - **Trường hợp 1 (Dư tiền):** Hệ thống chọn phương án **`Tài xế hoàn nộp lại tiền thừa`**. Bấm xác nhận ➔ Hệ thống **tự động sinh Phiếu Thu (`PT-...`)** nhập lại 400.000 đ vào quỹ.
   - **Trường hợp 2 (Thiếu tiền - Chi vượt):** Tài xế chi 2.800.000 đ ➔ Hệ thống chọn **`Công ty chi bù cho tài xế`** 300.000 đ. Bấm xác nhận ➔ Hệ thống **tự động sinh Phiếu Chi (`PC-...`)** để kế toán xuất quỹ trả lại tài xế.
   - **Trường hợp 3 (Khớp đúng 100%):** Khoản ứng chuyển thẳng sang trạng thái **`Đã Hoàn Ứng Xong`**.
5. Bấm nút **`Lưu`** để hoàn tất chốt sổ tạm ứng.

---

## 13. CÁCH TẠO PHIẾU THU / PHIẾU CHI SỔ QUỸ MẪU S03a-DN

*Dành cho: Kế toán thanh toán, Thủ quỹ.*

### Bước 1: Vào phân hệ Sổ Quỹ
- Trên thanh điều hướng bên trái, bấm vào menu **`Tài chính & Kế toán`**.
- Tại tab **`Sổ Quỹ Thu - Chi`**, bấm nút:
  * **`+ Lập Phiếu Thu`** (để ghi nhận dòng tiền vào - Inflow).
  * **`+ Lập Phiếu Chi`** (để ghi nhận dòng tiền ra - Outflow).

### Bước 2: Nhập thông tin chứng từ thu/chi
1. **Loại Nghiệp Vụ `*`:**
   - *Nếu là Phiếu Thu:* Chọn `Thu cước vận tải từ khách hàng`, `Thu hồi tiền chi hộ`, `Hoàn ứng tiền thừa từ tài xế`...
   - *Nếu là Phiếu Chi:* Chọn `Tạm ứng quỹ điều vận`, `Thanh toán cước xe bạn 3PL`, `Chi mua nhiên liệu dầu DO`, `Nạp thẻ thu phí tự động VETC/ePass`, `Sửa chữa xe`...
2. **Đối Tượng Giao Dịch `*`:** Chọn Khách hàng, Nhà xe thầu phụ, hoặc Nhân viên nhận/nộp tiền.
3. **Số Tiền (VNĐ) `*`:** Nhập số tiền phát sinh.
4. **Phương Thức Thanh Toán `*`:** Chọn `Tiền Mặt Tại Két` hoặc `Chuyển Khoản Ngân Hàng`.
5. **Tài Khoản Ngân Hàng:** Nếu chọn chuyển khoản, chọn đúng số tài khoản ngân hàng của công ty xuất/nhận tiền.
6. **Diễn Giải / Nội Dung Thu Chi `*`:** Ghi rõ lý do (Ví dụ: Thu tiền cước chuyến TVL-1011-001 theo HĐ 00123).
7. **Chứng Từ Gốc Kèm Theo:** Nhập số lượng chứng từ gốc đính kèm (Ví dụ: `02` liên hóa đơn).

### Bước 3: Lưu và in phiếu thu/chi
- Bấm nút **`Lưu`**. Phiếu thu mang mã `PT-YYYY-XXX`, phiếu chi mang mã `PC-YYYY-XXX`.
- Bấm nút **`In Phiếu A4/A5`** để in mẫu Phiếu Thu/Phiếu Chi chuẩn mẫu S03a-DN theo Thông tư Bộ Tài Chính có đầy đủ chữ ký 4 bên: Giám đốc, Kế toán trưởng, Người nộp/nhận tiền, Thủ quỹ.

---

## 14. CÁCH THỎA THUẬN CƯỚC & QUYẾT TOÁN XE BẠN / THẦU PHỤ 3PL

*Dành cho: Điều phối viên, Kế toán công nợ.*

### Bước 1: Ghi nhận thỏa thuận cước thuê xe bạn
- Khi điều động một chuyến xe thuộc sở hữu của nhà xe ngoài (Xe bạn/3PL):
- Trong chi tiết chuyến xe, tại mục đối tác xe bạn ➔ Bấm nút **`Thỏa Thuận Cước Xe Bạn`**.
- Điền:
  * **Nhà Xe Thầu Phụ `*`:** Chọn đơn vị vận tải từ danh mục đối tác (Ví dụ: `CÔNG TY VẬN TẢI THÀNH CÔNG`).
  * **Cước Thỏa Thuận (Gross Pay) `*`:** Số tiền cước cam kết trả cho nhà xe bạn (Ví dụ: `4.200.000` đ).
  * **Tạm Ứng Trước Dọc Đường:** Số tiền đã tạm ứng trước cho tài xế xe bạn (Ví dụ: `1.500.000` đ).
- Bấm nút **`Lưu`**. Chuyến xe được ghi nhận vào sổ công nợ nhà xe ngoài.

### Bước 2: Quyết toán và thanh toán cước còn lại
- Khi chuyến xe hoàn thành và nhận đủ biên bản POD:
- Vào menu **`Tài chính & Kế toán`** ➔ Chọn tab **`Xe Thầu Phụ 3PL`**.
- Tìm chuyến xe của đối tác ➔ Bấm nút **`Quyết Toán Cước`**.
- Hệ thống hiển thị số tiền còn phải trả: `4.200.000 - 1.500.000 = 2.700.000 đ`.
- Chọn phương thức thanh toán `Ủy nhiệm chi Ngân hàng` ➔ Bấm **`Lưu`**.
- Hệ thống tự động sinh Phiếu Chi Sổ Quỹ và cập nhật công nợ nhà xe về 0 đ.

---

## 15. CÁCH KHAI BÁO & QUẢN LÝ TỜ KHAI HẢI QUAN ĐIỆN TỬ

*Dành cho: Nhân viên Khai báo Hải quan, Điều phối viên.*

### Bước 1: Vào phân hệ Hải quan
- Trên thanh điều hướng bên trái, bấm vào menu **`Dịch vụ Hải quan`**.
- Bấm nút **`+ Khai Báo Tờ Khai Mới`** (nút màu teal góc phải).

### Bước 2: Nhập thông tin tờ khai VNACCS
1. **Số Tờ Khai Hải Quan `*`:** Nhập dãy 12 số tờ khai hải quan điện tử do hệ thống VNACCS cấp (Ví dụ: `105123456780`).
2. **Doanh Nghiệp Xuất Nhập Khẩu `*`:** Chọn khách hàng chủ hàng đứng tên trên tờ khai.
3. **Loại Hình Tờ Khai `*`:** Chọn loại hình: `E62` (Xuất sản xuất xuất khẩu), `A11` (Nhập kinh doanh tiêu dùng), `A12` (Nhập kinh doanh sản xuất)...
4. **Chi Cục Hải Quan Đăng Ký `*`:** Chọn chi cục thụ lý (Ví dụ: `02CI - Chi cục HQ CK Cảng Sài Gòn KV 1`).
5. **Phân Luồng Hải Quan `*`:**
   - 🟢 **Luồng Xanh (Green):** Miễn kiểm tra chứng từ và hàng hóa, thông quan tự động.
   - 🟡 **Luồng Vàng (Yellow):** Kiểm tra hồ sơ chứng từ điện tử/giấy.
   - 🔴 **Luồng Đỏ (Red):** Kiểm tra thực tế hàng hóa tại bãi kiểm hóa cảng.
6. **Số Container & Seal:** Nhập số vỏ cont và chì niêm phong để liên kết với lệnh điều xe.
7. **Trạng Thái Thông Quan `*`:** `Chờ thông quan`, `Đã thông quan`, `Giải phóng hàng`...

### Bước 3: Lưu và liên kết điều vận
- Bấm nút **`Lưu`**. Tờ khai được lưu trữ an toàn và sẵn sàng xuất trình đối chiếu với cán bộ hải quan cổng cảng.

---

## 16. CÁCH QUYẾT TOÁN GOM CHUYẾN XE HÀNG LOẠT (BATCH SETTLEMENT)

*Dành cho: Kế toán trưởng, Kế toán công nợ.*

### Mục đích:
Khóa sổ đồng loạt nhiều chuyến xe đã hoàn thành và thu đủ chứng từ POD để chuẩn bị xuất hóa đơn cước vận tải cho khách hàng.

### Các bước thực hiện:
1. Trên thanh điều hướng bên trái, bấm vào menu **`Quyết toán`** (hoặc truy cập `/settlements`).
2. Sử dụng bộ lọc trên đầu trang:
   - Chọn **Khách Hàng** cần quyết toán đợt này.
   - Chọn **Khoảng Ngày Vận Chuyển** (Ví dụ: Từ 01/10/2026 đến 10/10/2026).
   - Chọn bộ lọc trạng thái: **`Chỉ chuyến đã thu đủ POD`**.
3. Danh sách các chuyến thỏa mãn điều kiện sẽ hiện ra kèm hộp kiểm (*checkbox*).
4. **Tích chọn các chuyến xe cần gom đợt** (hoặc tích chọn ô trên cùng để chọn tất cả).
5. Hệ thống sẽ tính tổng tự động: Số chuyến chọn, Tổng doanh thu cước, Tổng chi phí, Tổng tiền chi hộ.
6. Bấm nút màu xanh ngọc **`[Khóa Sổ Gom Đợt Quyết Toán]`** ở góc trên.
7. Nhập Mã đợt quyết toán (Ví dụ: `DOT-2026-10A`) ➔ Bấm **`Lưu`**.
8. Tất cả các chuyến được chọn sẽ chuyển sang trạng thái **`Đã Quyết Toán`**, khóa tính năng sửa/xóa chi phí để đảm bảo số liệu kế toán không bị sai lệch.

---

## 17. CÁCH XEM, LỌC, TÙY CHỈNH CỘT & IN 14 BÁO CÁO BI KHỔ A4

*Dành cho: Ban Giám Đốc, Kế toán, Điều phối viên.*

### Bước 1: Mở phân hệ Báo cáo
- Trên thanh điều hướng bên trái, bấm vào menu **`Báo cáo & Thống kê`**.
- Hệ thống chia thành 4 nhóm báo cáo lớn:
  * **Nhóm 1:** Hiệu suất xe P&L, Doanh thu khách hàng, Chi phí tuyến & Chi hộ.
  * **Nhóm 2:** Quản lý vỏ cont DEM/DET, Đúng giờ OTP, Cắt kéo lưu xe sau 0h, Sự cố OS&D.
  * **Nhóm 3:** Sổ quỹ tạm ứng điều vận, Tạm ứng tài xế, Lương chuyến, Xe bạn 3PL.
  * **Nhóm 4:** Công nợ phải thu (AR Aging), Quyết toán chuyến, Tuổi đơn tồn đọng.
- Bấm vào tab báo cáo bạn muốn xem (Ví dụ: Báo Cáo 1, Báo Cáo 12...).

### Bước 2: Tìm kiếm & Sắp xếp dữ liệu
- **Tìm kiếm tức thì:** Nhập từ khóa vào ô tìm kiếm (biển số, tên khách, tài xế, mã chuyến...) ➔ Bảng dữ liệu tự động lọc ngay lập tức.
- **Sắp xếp cột:** Bấm vào tiêu đề cột bất kỳ (có icon mũi tên lên xuống) để sắp xếp tăng dần hoặc giảm dần.
- **Cột STT chuẩn:** Cột đầu tiên luôn là cột **`STT`** đánh số thứ tự từ 1 đến hết để bạn nắm được chính xác số lượng bản ghi hiển thị.

### Bước 3: Tùy biến ẩn / hiện và thứ tự cột (Universal Column Manager)
- Tại góc trên bên phải của bảng, bấm nút **`Cột`** (icon các cột dọc).
- Hộp thoại tùy biến hiện ra:
  * Tích chọn hoặc bỏ chọn ô checkbox để **Ẩn / Hiện** cột theo nhu cầu xem.
  * Bấm nút mũi tên lên/xuống để **Thay đổi thứ tự hiển thị** của cột.
  * Bấm nút **`Khôi phục mặc định`** nếu muốn quay về cấu hình ban đầu.
- Cấu hình cột được trình duyệt **tự động ghi nhớ riêng cho tài khoản của bạn**, lần sau mở lại vẫn giữ nguyên giao diện bạn đã thiết lập.

### Bước 4: In báo cáo khổ A4 chuẩn mực
- Bấm nút **`In Báo Cáo A4`** ở góc trên.
- Hệ thống tự động phân tích số lượng cột:
  * Bảng dưới 8 cột: Tự động định dạng khổ **A4 Dọc (Portrait)**.
  * Bảng từ 8 cột trở lên: Tự động định dạng khổ **A4 Ngang (Landscape)**.
- Trình duyệt hiển thị bản in căn lề chuẩn 15mm-20mm theo Nghị định 30/2020/NĐ-CP, sẵn sàng in ra máy in hoặc xuất file PDF lưu trữ.

---

## 18. CÁCH QUẢN LÝ DANH MỤC GỐC (ĐỊA ĐIỂM, HÃNG TÀU, KHOẢN MỤC CHI PHÍ)

*Dành cho: Quản trị viên hệ thống, Kế toán trưởng.*

### Bước 1: Vào phân hệ Cài đặt Danh mục
- Trên thanh điều hướng bên trái, bấm vào menu **`Cài đặt`** (icon bánh răng).
- Màn hình hiển thị danh sách các tab danh mục dùng chung của công ty.

### Bước 2: Thêm mới bản ghi vào danh mục
1. Bấm chọn tab danh mục cần cấu hình:
   - **Địa Điểm (Locations):** Quản lý cảng biển, cảng cạn ICD, bãi rỗng depot, kho hàng.
   - **Hãng Tàu (Shipping Lines):** Mã hãng tàu (MAEU, ONE...), số hotline, cổng tra cứu lệnh eDO, số ngày free-time mặc định.
   - **Khoản Mục Chi Phí (Expense Catalog):** Danh mục chi phí nâng, hạ, BOT, cân xe, cược cont và định mức tiền mặc định.
   - **Biểu Phí Lương Tuyến:** Định mức tiền lương chuyến cho tài xế theo từng cung đường.
   - **Hồ Sơ Doanh Nghiệp (Company Profile):** Cập nhật tên công ty, MST, số tài khoản ngân hàng thụ hưởng, hotline.
2. Bấm nút **`+ Thêm Mới`** ở góc phải.
3. Điền thông tin vào các trường có dấu **`*`**.
4. Bấm nút **`Lưu`**. Bản ghi mới lập tức có hiệu lực và tự động cập nhật vào các danh sách chọn trên toàn bộ hệ thống.

---

> [!NOTE]
> **Kênh Hỗ Trợ Trực Tuyến & Cập Nhật Hệ Thống:**  
> - Bất kỳ lúc nào cần tra cứu hướng dẫn sử dụng, bạn có thể bấm vào mục **`Trợ giúp & HDSD`** ở thanh menu bên trái hoặc truy cập trực tiếp đường dẫn **`/helps`**.
> - Đội ngũ Kỹ thuật BIM Logistics luôn sẵn sàng đồng hành cùng quý doanh nghiệp tại hotline **`0965.559.561`**.
