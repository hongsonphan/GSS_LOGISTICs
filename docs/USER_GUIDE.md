# SỔ TAY HƯỚNG DẪN SỬ DỤNG HỆ THỐNG BIM LOGISTICS (TMS)
## Quy Trình Vận Hành Tiêu Chuẩn & Cẩm Nang Thao Tác Cầm Tay Chỉ Việc

> **Đơn vị ban hành:** Công ty TNHH Vận Tải Triền Võ (BIM Logistics Platform)  
> **Phiên bản tài liệu:** v2.9.48 | **Tra cứu trực tuyến:** `https://logistics.bim.info.vn/helps`  
> **Tổng đài hỗ trợ 24/7:** 0965.559.561 | **Email:** support@trienvo.com  

---

## 3 NGUYÊN TẮC BẤT BIẾN KHI THAO TÁC TRÊN TOÀN BỘ HỆ THỐNG

1. **Trường thông tin bắt buộc (`*`):** Tất cả các ô nhập liệu có dấu hoa thị màu đỏ `*` bắt buộc phải điền đầy đủ dữ liệu. Hệ thống sẽ chặn và cảnh báo nếu để trống.
2. **Nút "Lưu" thống nhất:** Nút bấm hoàn tất hoặc xác nhận dữ liệu trên mọi màn hình và hộp thoại luôn mang tên duy nhất là chữ **`Lưu`**.
3. **Bảo toàn dữ liệu pháp lý (Soft-Delete):** Thao tác Xóa không bao giờ xóa vĩnh viễn dữ liệu pháp lý (vận đơn, POD, chi phí, GPS). Bản ghi chỉ bị ẩn (`is_deleted=True`) để bảo vệ chứng cứ pháp lý và lịch sử truy vết vận tải.

---

# MỤC LỤC CHÍNH

- [PHẦN I: MÔ TẢ PHÂN HỆ & TÍNH NĂNG CỐT LÕI](#phần-i-mô-tả-phân-hệ--tính-năng-cốt-lõi)
  - [1. Nền Tảng Vận Hành & Phân Quyền Vai Trò (RBAC)](#1-nền-tảng-vận-hành--phân-quyền-vai-trò-rbac)
  - [2. Dashboard Ban Giám Đốc (Executive BI)](#2-dashboard-ban-giám-đốc-executive-bi)
  - [3. Phân Hệ Sale & Booking (CRM, Báo Giá & Đơn Hàng)](#3-phân-hệ-sale--booking-crm-báo-giá--đơn-hàng)
  - [4. Phân Hệ Điều Vận & Chuyến Xe (TMS Core Engine)](#4-phân-hệ-điều-vận--chuyến-xe-tms-core-engine)
  - [5. Phân Hệ Quản Lý Đội Xe, Bãi & Nhân Sự (Fleet & HR)](#5-phân-hệ-quản-lý-đội-xe-bãi--nhân-sự-fleet--hr)
  - [6. Phân Hệ Tài Chính, Tạm Ứng & Sổ Quỹ (Accounting & Cash Flow)](#6-phân-hệ-tài-chính-tạm-ứng--sổ-quỹ-accounting--cash-flow)
  - [7. Phân Hệ Thủ Tục Hải Quan Điện Tử (Customs Declaration)](#7-phân-hệ-thủ-tục-hải-quan-điện-tử-customs-declaration)
  - [8. Hệ Thống 14 Báo Cáo Thông Minh BI Vận Tải](#8-hệ-thống-14-báo-cáo-thông-minh-bi-vận-tải)
- [PHẦN II: HƯỚNG DẪN CÀI ĐẶT DANH MỤC GỐC (MASTER DATA)](#phần-ii-hướng-dẫn-cài-đặt-danh-mục-gốc-master-data)
  - [1. Tạo Mới Khách Hàng (Customer)](#1-tạo-mới-khách-hàng-customer)
  - [2. Cài Đặt Địa Điểm Cảng, Depot & Kho Hàng (Locations)](#2-cài-đặt-địa-điểm-cảng-depot--kho-hàng-locations)
  - [3. Cài Đặt Danh Mục Hãng Tàu (Shipping Lines)](#3-cài-đặt-danh-mục-hãng-tàu-shipping-lines)
  - [4. Cài Đặt Khoản Mục Chi Phí Vận Tải (Expense Catalog)](#4-cài-đặt-khoản-mục-chi-phí-vận-tải-expense-catalog)
  - [5. Cài Đặt Biểu Cước Lương Chuyến Theo Tuyến Đường (Route Payroll Rates)](#5-cài-đặt-biểu-cước-lương-chuyến-theo-tuyến-đường-route-payroll-rates)
  - [6. Hồ Sơ Doanh Nghiệp & Tài Khoản Ngân Hàng Thụ Hưởng (Company Profile)](#6-hồ-sơ-doanh-nghiệp--tài-khoản-ngân-hàng-thụ-hưởng-company-profile)
- [PHẦN III: HƯỚNG DẪN THAO TÁC NHẬP LIỆU CHI TIẾT](#phần-iii-hướng-dẫn-thao-tác-nhập-liệu-chi-tiết)
  - [1. Dashboard Ban Giám Đốc](#1-dashboard-ban-giám-đốc)
  - [2. Phân Hệ Sale & Booking](#2-phân-hệ-sale--booking)
    - [2.1. Hướng Dẫn Tạo Mới Bảng Báo Giá (Quotation) & Duyệt Báo Giá](#21-hướng-dẫn-tạo-mới-bảng-báo-giá-quotation--duyệt-báo-giá)
    - [2.2. Hướng Dẫn Tiếp Nhận Booking / Đơn Hàng Vận Tải Mới](#22-hướng-dẫn-tiếp-nhận-booking--đơn-hàng-vận-tải-mới)
  - [3. Phân Hệ Điều Vận & Chuyến Xe](#3-phân-hệ-điều-vận--chuyến-xe)
    - [3.1. Hướng Dẫn Lập Lệnh Điều Xe Mới (Phát Lệnh Cho Phương Tiện)](#31-hướng-dẫn-lập-lệnh-điều-xe-mới-phát-lệnh-cho-phương-tiện)
    - [3.2. Hướng Dẫn Xử Lý Chuyến Cắt Kéo (2 Chặng) & Chở Ghép 2 Cont 20ft](#32-hướng-dẫn-xử-lý-chuyến-cắt-kéo-2-chặng--chở-ghép-2-cont-20ft)
    - [3.3. Hướng Dẫn Kê Khai Chi Phí Vận Hành & Khoản Chi Hộ Khách Hàng (Debit Note)](#33-hướng-dẫn-kê-khai-chi-phí-vận-hành--khoản-chi-hộ-khách-hàng-debit-note)
    - [3.4. Hướng Dẫn Bác Tài Báo 6 Mốc Kho & Chụp Ảnh POD/EIR Trên Điện Thoại](#34-hướng-dẫn-bác-tài-báo-6-mốc-kho--chụp-ảnh-podeir-trên-điện-thoại)
  - [4. Phân Hệ Kế Toán, Tạm Ứng & Sổ Quỹ](#4-phân-hệ-kế-toán-tạm-ứng--sổ-quỹ)
    - [4.1. Hướng Dẫn Kế Toán Cấp Quỹ Điều Vận Cấp 1](#41-hướng-dẫn-kế-toán-cấp-quỹ-điều-vận-cấp-1)
    - [4.2. Hướng Dẫn Điều Vận Cấp Tạm Ứng Dọc Đường Cho Tài Xế Cấp 2](#42-hướng-dẫn-điều-vận-cấp-tạm-ứng-dọc-đường-cho-tài-xế-cấp-2)
    - [4.3. Hướng Dẫn Quyết Toán Hoàn Ứng Chuyến Xe & Cân Đối Sổ Quỹ](#43-hướng-dẫn-quyết-toán-hoàn-ứng-chuyến-xe--cân-đối-sổ-quỹ)
    - [4.4. Hướng Dẫn Tạo Phiếu Thu / Phiếu Chi Sổ Quỹ Mẫu S03a-DN](#44-hướng-dẫn-tạo-phiếu-thu--phiếu-chi-sổ-quỹ-mẫu-s03a-dn)
    - [4.5. Hướng Dẫn Thỏa Thuận Cước & Quyết Toán Xe Bạn / Thầu Phụ 3PL](#45-hướng-dẫn-thỏa-thuận-cước--quyết-toán-xe-bạn--thầu-phụ-3pl)
    - [4.6. Hướng Dẫn Quyết Toán Gom Chuyến Xe Hàng Loạt (Batch Settlement)](#46-hướng-dẫn-quyết-toán-gom-chuyến-xe-hàng-loạt-batch-settlement)
  - [5. Phân Hệ Dịch Vụ Hải Quan Điện Tử](#5-phân-hệ-dịch-vụ-hải-quan-điện-tử)
  - [6. Hướng Dẫn Tra Cứu, Lọc, Tùy Biến Cột & In 14 Báo Cáo BI Khổ A4](#6-hướng-dẫn-tra-cứu-lọc-tùy-biến-cột--in-14-báo-cáo-bi-khổ-a4)

---

# PHẦN I: MÔ TẢ PHÂN HỆ & TÍNH NĂNG CỐT LÕI

## 1. Nền Tảng Vận Hành & Phân Quyền Vai Trò (RBAC)

Nền tảng **BIM Logistics Platform** được thiết kế theo mô hình điều hành khép kín (Full-cycle Logistics TMS) chuyên biệt cho vận tải đường bộ Container FCL, hàng rời FTL và dịch vụ cảng biển tại Việt Nam.

### Chu Trình Luồng Dữ Liệu 7 Bước Khép Kín:
```
1. Báo Giá Tuyến ➔ 2. Booking Hãng Tàu ➔ 3. Phát Lệnh Điều Xe ➔ 4. Tài Xế Báo 6 Mốc ➔ 5. Thu POD/EIR ➔ 6. Quyết Toán Chuyến ➔ 7. Xuất HĐ & Sổ Quỹ
```

### Bảng Phân Quyền Vai Trò Người Dùng:
| Vai Trò | Mã Quyền | Phạm Vi Quyền Hạn & Thao Tác Cho Phép |
|---|---|---|
| **Ban Giám Đốc** | `DIRECTOR` | Toàn quyền hệ thống, phê duyệt báo giá, giám sát P&L chi phí, duyệt cấp quỹ và xem toàn bộ 14 báo cáo BI. |
| **Điều Phối Viên** | `DISPATCHER` | Tạo và phân công chuyến xe, cắt kéo, chở ghép 20ft, cấp tạm ứng cho tài xế, quản lý mốc kho và biên bản sự cố OS&D. |
| **Kế Toán Vận Tải** | `ACCOUNTANT` | Quản lý sổ quỹ thu-chi, duyệt chi phí chuyến, quản lý quỹ điều vận, quyết toán xe bạn 3PL, thu hồi chi hộ và đối soát nợ. |
| **Kinh Doanh (Sales)** | `SALESMAN` | Tạo báo giá, tiếp nhận booking order từ chủ hàng, quản lý danh bạ khách hàng và in mẫu báo giá A4 gửi đối tác. |
| **Quản Lý Xe & Bãi** | `MECHANIC` | Quản trị danh mục đầu kéo, rơ-moóc, theo dõi hạn đăng kiểm, lịch bảo dưỡng kỹ thuật và định vị xe nằm bãi. |
| **Tài Xế Xe Đầu Kéo** | `DRIVER` | Truy cập Driver Portal qua Capability URL riêng trên điện thoại, báo 6 mốc kho, chụp ảnh biên bản POD/EIR và kê khai chi phí. |

---

## 2. Dashboard Ban Giám Đốc (Executive BI)

Màn hình trung tâm tổng hợp các chỉ số vận hành và tài chính thời gian thực:
- **Bộ lọc kỳ toàn cục:** Hôm nay, 10 Ngày qua, Tháng này, Quý này, Năm nay, hoặc Tùy chọn ngày.
- **4 Thẻ KPI Trụ Cột:** Doanh Thu, Chi Phí Vận Hành, Lợi Nhuận Gộp (Margin %), và Tỷ Lệ Giao Đúng Hẹn (OTD %).
- **Dòng Tiền & Quỹ Khả Dụng:** Quản lý số dư Tiền mặt tại két và Tài khoản Ngân hàng.
- **Bảng P&L 8 Chuyến Gần Nhất:** Xem nhanh lãi/lỗ từng chuyến vừa hoàn thành.

---

## 3. Phân Hệ Sale & Booking (CRM, Báo Giá & Đơn Hàng)

Kết nối giữa Phòng Kinh doanh và Khách hàng:
- **Quản lý Khách Hàng (CRM):** Thông tin pháp lý, mã số thuế, hạn mức công nợ.
- **Lập & Duyệt Báo Giá:** Báo giá theo ma trận tuyến đường, bù trừ giá dầu DO, hoặc bao chuyến; duyệt và in báo giá chuẩn A4.
- **Tiếp Nhận Booking Order:** Ghi nhận số booking, hãng tàu, quy cách vỏ, hạn cắt máng CY closing, địa điểm cấp rỗng/hạ bãi.
- **Chuyển Tiếp Phát Lệnh Xe:** 1 chạm để chuyển toàn bộ dữ liệu đơn hàng sang Lệnh điều xe Điều vận.

---

## 4. Phân Hệ Điều Vận & Chuyến Xe (TMS Core Engine)

Phân hệ trọng yếu nhất của hệ thống:
- **Phân công phương tiện:** Gán Đầu kéo, Rơ-moóc, Tài xế theo thời gian thực.
- **Tuân thủ State Machine 11 bước:** `Draft ➔ Dispatched ➔ Accepted ➔ Container Picked ➔ In Transit ➔ At Warehouse ➔ Unloading ➔ Delivered ➔ Returning Empty ➔ Completed ➔ Settled`.
- **Nghiệp vụ Cắt Kéo 2 Chặng (`is_split_trip`):** Xe 1 cắm moóc tại kho, Xe 2 kéo ra cảng; tự động chia lương chuyến cho 2 bác tài.
- **Nghiệp vụ Chở Ghép 2 Cont 20ft (`is_twin_container`):** Quản lý đồng thời 2 cont 20ft trên 1 rơ-moóc 40ft/45ft.
- **Kê khai Chi Phí & Tách Biệt Khoản Chi Hộ (`is_on_behalf_of_customer`):** Chi hộ khách không trừ vào chi phí của xe, tự động kết chuyển sang Debit Note.
- **Cổng Mobile Tài Xế (Driver Portal):** Báo 6 mốc di chuyển và chụp ảnh chứng từ POD/EIR gửi về văn phòng.

---

## 5. Phân Hệ Quản Lý Đội Xe, Bãi & Nhân Sự (Fleet & HR)

- **Quản lý Phương Tiện:** Đầu kéo container, rơ-moóc xương/cổ cò; quản lý hình thức Xe Nhà (`OWNED`) hoặc Xe Thuê Ngoài (`SUBCONTRACTOR`).
- **Cảnh báo hạn đăng kiểm xe:** Cảnh báo đỏ tự động khi hạn đăng kiểm còn $\le 15$ ngày.
- **Quản lý Nhân Viên & Hồ Sơ Tài Xế:** Số GPLX hạng FC, hạn bằng lái (cảnh báo trước 30 ngày), số điện thoại và biệt danh gọi bộ đàm.
- **Bảng Tính Lương Chuyến Khoán:** Tự động tổng hợp lương chuyến theo sản lượng thực tế hoàn thành.

---

## 6. Phân Hệ Tài Chính, Tạm Ứng & Sổ Quỹ (Accounting & Cash Flow)

- **Cơ chế tạm ứng 2 cấp an toàn dòng tiền:**
  * **Cấp 1:** Kế toán cấp Quỹ Điều Vận (`TUDV`) cho Điều phối viên.
  * **Cấp 2:** Điều phối viên trích quỹ cấp Tạm Ứng Chuyến (`TUTX`) cho Bác tài.
- **Hoàn ứng & Cân đối tự động:** Thừa tiền tự sinh **Phiếu Thu (PT-...)**, thiếu tiền tự sinh **Phiếu Chi (PC-...)**.
- **Sổ Quỹ Thu - Chi Mẫu S03a-DN:** Chuẩn Bộ Tài Chính, hỗ trợ in A4/A5 ký 4 bên.
- **Quyết Toán Xe Bạn 3PL:** Thỏa thuận cước và tự động sinh phiếu chi thanh toán sau khi thu đủ POD.
- **Khóa Sổ Gom Chuyến Hàng Loạt (Batch Settlement):** Gom nhiều chuyến xe xuất hóa đơn VAT.

---

## 7. Phân Hệ Thủ Tục Hải Quan Điện Tử (Customs Declaration)

- Quản lý tờ khai hải quan 12 số hệ thống VNACCS/VCIS.
- Theo dõi phân luồng hải quan: Luồng Xanh, Luồng Vàng, Luồng Đỏ.
- Liên kết số container và chì seal phục vụ đối chiếu thông quan tại cổng cảng.

---

## 8. Hệ Thống 14 Báo Cáo Thông Minh BI Vận Tải

Trang bị 14 báo cáo đa chiều theo 4 nhóm chủ đề:
- Cột **STT** chuẩn đếm số lượng record hiển thị.
- Tính năng **Universal Column Manager** tùy biến ẩn/hiện và đổi vị trí cột.
- Sắp xếp đa cột tăng/giảm dần trực tiếp trên bảng.
- In ấn tự động nhận diện khổ **A4 Dọc** hoặc **A4 Ngang** theo số lượng cột.

---

# PHẦN II: HƯỚNG DẪN CÀI ĐẶT DANH MỤC GỐC (MASTER DATA)

## 1. Tạo Mới Khách Hàng (Customer)

- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Khách Hàng`** ➔ Bấm nút **`+ Thêm Khách Hàng`** (hoặc vào menu **`Sale & Booking`** ➔ tab **`Khách Hàng`** ➔ Bấm nút **`+ Thêm Khách Hàng`**).
- **Các trường bắt buộc cần điền:**
  * **Mã Khách Hàng (`*`):** Nhập mã viết tắt viết hoa không dấu (Ví dụ: `SAMSUNG`, `VINFAST`, `KH-001`). Mã không được trùng lặp.
  * **Tên Doanh Nghiệp (`*`):** Nhập tên đầy đủ theo Giấy phép ĐKKD (Ví dụ: `CÔNG TY TNHH SAMSUNG ELECTRONICS VIỆT NAM`).
  * **Mã Số Thuế (`*`):** Nhập chính xác MST 10 hoặc 13 số để xuất hóa đơn điện tử hợp lệ.
  * **Địa Chỉ Trụ Sở (`*`):** Nhập địa chỉ đăng ký kinh doanh in trên hóa đơn VAT.
  * **Số Điện Thoại (`*`):** Số điện thoại liên lạc khi giao nhận hàng.
  * **Người Liên Hệ:** Tên người phụ trách kho/kế toán khách hàng.
  * **Kỳ Hạn Công Nợ:** Số ngày cho phép nợ (Ví dụ: 30 ngày).
- **Hoàn tất:** Bấm nút **`Lưu`**.

---

## 2. Cài Đặt Địa Điểm Cảng, Depot & Kho Hàng (Locations)

- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Địa Điểm`** ➔ Bấm nút **`+ Thêm Địa Điểm Mới`**.
- **Các trường bắt buộc cần điền:**
  * **Mã Địa Điểm (`*`):** Mã viết hoa không dấu (Ví dụ: `CAT_LAI`, `ICD_TRANSIMEX`, `KCN_VSIP1`).
  * **Tên Địa Điểm (`*`):** Tên đầy đủ (Ví dụ: `Cảng Cát Lái - Cổng C`, `Depot Tanamexco`).
  * **Loại Địa Điểm (`*`):** Chọn `Cảng Biển (SEAPORT)`, `Depot Vỏ Rỗng (DEPOT)`, `Kho Khách Hàng (WAREHOUSE)` hoặc `Bãi Đỗ Xe (YARD)`.
  * **Mã ICD / Cảng Vụ (`*`):** Nhập mã hải quan cảng (Ví dụ: `VNSGN`).
  * **Địa Chỉ Chi Tiết (`*`):** Địa chỉ số nhà, đường, quận/huyện để tài xế định vị.
- **Hoàn tất:** Bấm nút **`Lưu`**.

---

## 3. Cài Đặt Danh Mục Hãng Tàu (Shipping Lines)

- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Hãng Tàu`** ➔ Bấm nút **`+ Thêm Hãng Tàu Mới`**.
- **Các trường bắt buộc cần điền:**
  * **Mã Hãng Tàu (`*`):** Nhập mã chuẩn quốc tế (Ví dụ: `MAEU`, `ONE`, `COSCO`, `EVERGREEN`, `CMA`, `SITC`...).
  * **Tên Hãng Tàu (`*`):** Tên đầy đủ (Ví dụ: `Hãng Tàu ONE Lines Việt Nam`).
  * **Cổng Tra Cứu eDO:** Đường dẫn website tra cứu lệnh giao nhận cont điện tử.
  * **Số Ngày Free-Time Mặc Định:** Số ngày miễn phí lưu bãi/cont (mặc định 7 hoặc 14 ngày).
- **Hoàn tất:** Bấm nút **`Lưu`**.

---

## 4. Cài Đặt Khoản Mục Chi Phí Vận Tải (Expense Catalog)

- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Khoản Mục Chi Phí`** ➔ Bấm nút **`+ Thêm Khoản Mục Chi Phí`**.
- **Các trường bắt buộc cần điền:**
  * **Mã Khoản Chi (`*`):** Mã kỹ thuật (Ví dụ: `LIFT_ON`, `LIFT_OFF`, `TOLL_FEE`, `CONTAINER_DEPOSIT`, `WEIGHING`).
  * **Tên Khoản Mục (`*`):** Tên hiển thị (Ví dụ: `Phí nâng vỏ cont rỗng`, `Vé cầu đường BOT`).
  * **Nhóm Chi Phí (`*`):** Chọn Nâng hạ cảng, Cầu đường, Chi hộ, Nhiên liệu...
  * **Định Mức Mặc Định (VNĐ):** Mức tiền tiêu chuẩn tự động điền khi tạo lệnh.
  * **Yêu Cầu HĐĐT (VAT):** Đánh dấu Có/Không để kiểm soát hóa đơn khi duyệt chi.
- **Hoàn tất:** Bấm nút **`Lưu`**.

---

## 5. Cài Đặt Biểu Cước Lương Chuyến Theo Tuyến Đường (Route Payroll Rates)

- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Biểu Phí Lương Tuyến`** ➔ Bấm nút **`+ Thêm Tuyến Lương Mới`**.
- **Các trường bắt buộc cần điền:**
  * **Tên Tuyến Đường (`*`):** Lộ trình (Ví dụ: `Cảng Cát Lái ➔ KCN VSIP 1`).
  * **Quy Cách Cont (`*`):** Chọn `20DC` hoặc `40HC`.
  * **Mức Lương Khoán Cho Bác Tài (`*`) (VNĐ):** Tiền lương chuyến trả cho tài xế (Ví dụ: `450.000 đ`).
  * **Định Mức Vé BOT (VNĐ):** Tiền vé cầu đường BOT định mức (Ví dụ: `200.000 đ`).
  * **Định Mức Dầu DO (Lít):** Định mức tiêu hao dầu (Ví dụ: `40 lít`).
- **Hoàn tất:** Bấm nút **`Lưu`**.

---

## 6. Hồ Sơ Doanh Nghiệp & Tài Khoản Ngân Hàng Thụ Hưởng (Company Profile)

- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Hồ Sơ Doanh Nghiệp`**.
- **Các trường bắt buộc cần điền:**
  * **Tên Doanh Nghiệp (`*`):** `CÔNG TY TNHH VẬN TẢI TRIỀN VÕ`.
  * **Mã Số Thuế (`*`):** Nhập MST doanh nghiệp in trên báo giá và phiếu thu/chi.
  * **Địa Chỉ Trụ Sở (`*`):** Địa chỉ văn phòng công ty.
  * **Số Điện Thoại (*) & Email (*):** Thông tin CSKH in trên bản in hợp đồng.
  * **Số Tài Khoản Ngân Hàng Thụ Hưởng (`*`):** STK nhận thanh toán cước từ khách hàng.
  * **Tên Ngân Hàng & Chi Nhánh (`*`):** Ví dụ: `Vietcombank - CN Nam Sài Gòn`.
- **Hoàn tất:** Bấm nút **`Lưu`**.

---

# PHẦN III: HƯỚNG DẪN THAO TÁC NHẬP LIỆU CHI TIẾT

## 1. Dashboard Ban Giám Đốc

### 1.1. Cách Sử Dụng Bộ Lọc Kỳ Báo Cáo Toàn Cục
1. Tại góc trên cùng bên phải màn hình Dashboard, nhấp vào thanh chọn thời gian.
2. Chọn mốc: **Hôm nay**, **10 Ngày qua**, **Tháng này**, **Quý này**, **Năm nay** hoặc **Tùy chọn ngày**.
3. Hệ thống tự động cập nhật lại toàn bộ 4 thẻ KPI, biểu đồ doanh thu và bảng chuyến xe mà không cần tải lại trang.

### 1.2. Cách Tra Cứu Dòng Tiền & Quỹ Khả Dụng
- Thẻ **Tiền mặt tại két**: Hiển thị số tiền mặt tồn quỹ thực tế để phục vụ tiếp quỹ điều vận.
- Thẻ **Tài khoản ngân hàng**: Hiển thị số dư các tài khoản thanh toán nhận tiền cước chuyển khoản từ khách hàng.

### 1.3. Cách Mở Nhanh Hồ Sơ Chuyến Từ Bảng P&L 8 Chuyến Gần Nhất
- Nhấp chuột trực tiếp vào bất kỳ dòng chuyến xe nào hoặc bấm vào Mã Chuyến (Ví dụ: `TVL-1011-001`). Hệ thống lập tức chuyển sang trang **Chi Tiết Chuyến Xe** để kiểm tra chứng từ POD và danh sách các khoản chi phí.

---

## 2. Phân Hệ Sale & Booking

### 2.1. Hướng Dẫn Tạo Mới Bảng Báo Giá (Quotation) & Duyệt Báo Giá
- **Nơi thực hiện:** Vào menu **`Sale & Booking`** ➔ Tab **`Báo Giá`** ➔ Bấm nút **`+ Tạo Báo Giá Mới`**.
- **Các bước nhập liệu:**
  1. **Khách Hàng (`*`):** Chọn tên khách hàng từ danh sách.
  2. **Ngày Hiệu Lực (`*`) & Hết Hạn (`*`):** Chọn khoảng thời gian áp dụng báo giá.
  3. **Phương Thức Định Giá (`*`):** Chọn `Theo ma trận tuyến đường`, `Điều chỉnh theo giá dầu DO` hoặc `Bao chuyến`.
  4. **Thêm tuyến cước:** Bấm **`+ Thêm Tuyến Đường`** ➔ Nhập **Tên Tuyến Đường (`*`)**, **Loại Cont (`*`)**, **Đơn Giá Cước (`*`)**, Lương tài xế và Vé BOT định mức.
  5. Bấm nút **`Lưu`**.
  6. **Duyệt & In:** Mở chi tiết báo giá ➔ Bấm **`Duyệt Báo Giá`** ➔ Bấm **`In Báo Giá A4`** để xuất bản in ký hợp đồng.

### 2.2. Hướng Dẫn Tiếp Nhận Booking / Đơn Hàng Vận Tải Mới
- **Nơi thực hiện:** Vào menu **`Sale & Booking`** ➔ Tab **`Booking & Đơn Hàng`** ➔ Bấm nút **`+ Tiếp Nhận Booking`**.
- **Các trường bắt buộc cần điền:**
  * **Khách Hàng (`*`):** Chọn khách hàng gửi đơn vận chuyển.
  * **Số Booking / Số B/L (`*`):** Nhập mã booking hãng tàu cấp (Ví dụ: `ONEBKK123456`).
  * **Hãng Tàu (`*`):** Chọn hãng tàu phát hành vỏ cont.
  * **Loại Dịch Vụ (`*`):** Chọn `Hàng Xuất (EXPORT)`, `Hàng Nhập (IMPORT)` hoặc `Nội Địa (DOMESTIC)`.
  * **Quy cách & Số lượng cont (`*`):** Chọn loại cont (`40HC`) và số lượng vỏ cont.
  * **Hạn Cắt Máng (CY Closing Time) (`*`):** Chọn ngày giờ tàu đóng bãi xếp cont.
  * **Địa điểm lộ trình (`*`):** Nơi cấp rỗng, Kho đóng hàng và Nơi hạ bãi. Đính kèm file ảnh lệnh.
- **Hoàn tất:** Bấm nút **`Lưu`**.
- **Phát Lệnh Xe:** Bấm nút **`Phát Lệnh Xe`** tại dòng đơn hàng để chuyển sang phân hệ Điều vận.

---

## 3. Phân Hệ Điều Vận & Chuyến Xe

### 3.1. Hướng Dẫn Lập Lệnh Điều Xe Mới (Phát Lệnh Cho Phương Tiện)
- **Nơi thực hiện:** Vào menu **`Điều vận`** ➔ Bấm nút **`+ Lệnh Điều Xe Mới`** (hoặc bấm từ danh sách Booking).
- **Các trường bắt buộc cần điền:**
  * **Kế thừa Booking:** Chọn mã Booking gốc để tự điền thông tin khách hàng, loại cont và hạn closing.
  * **Xe Đầu Kéo (`*`):** Chọn biển số đầu kéo đang rảnh tại bãi (Ví dụ: `51C-123.45`).
  * **Rơ-Moóc (`*`):** Chọn biển số moóc phù hợp (Ví dụ: `51R-098.76`).
  * **Bác Tài Chính (`*`):** Chọn tài xế phụ trách điều khiển xe.
  * **Số Container (`*`) & Số Seal:** Nhập 11 ký tự số cont (Ví dụ: `MSKU1234567`) và số seal chì niêm phong.
  * **Lịch Hẹn Kho (`*`) & Hạn Lưu Vỏ DET (`*`):** Giờ có mặt tại kho khách và hạn cuối trả vỏ rỗng.
- **Hoàn tất:** Bấm nút **`Lưu`** ➔ Bấm nút **`Phát Lệnh Xe`** để gửi liên kết cho tài xế.

### 3.2. Hướng Dẫn Xử Lý Chuyến Cắt Kéo (2 Chặng) & Chở Ghép 2 Cont 20ft
- **A. Nghiệp vụ Cắt Kéo (2 Chặng):**
  1. Trong hộp thoại Điều Xe, gạt bật: **Tách 2 chặng cắt kéo (`is_split_trip`)**.
  2. Chọn **Xe đầu kéo chặng 2 (`*`)** và **Tài xế chặng 2 (`*`)**.
  3. Chọn Tỷ lệ phân chia lương chuyến (`50% - 50%` hoặc `60% - 40%`).
  4. Bấm nút **`Lưu`**.
- **B. Nghiệp vụ Chở Ghép 2 Cont 20ft:**
  1. Chọn quy cách cont là `20DC`.
  2. Gạt bật: **Chở Ghép 2 Cont 20ft (`is_twin_container`)**.
  3. Nhập bổ sung: **Số Container 2 (`*`)**, Số Chì 2 và Số B/L 2.
  4. Bấm nút **`Lưu`**.

### 3.3. Hướng Dẫn Kê Khai Chi Phí Vận Hành & Khoản Chi Hộ Khách Hàng (Debit Note)
- **Nơi thực hiện:** Chi tiết chuyến xe ➔ Bảng P&L ➔ Bấm nút **`+ Thêm Chi Phí`**.
- **Nhập liệu:**
  * **Khoản Mục Chi Phí (`*`):** Chọn khoản mục (`LIFT_ON`, `LIFT_OFF`, `TOLL_FEE`, `CONTAINER_DEPOSIT`...).
  * **Thành Tiền (`*`) (VNĐ):** Nhập số tiền thực chi.
  * **Thuế VAT & Mã HĐĐT:** Thuế suất, mã tra cứu HĐĐT cảng và ảnh biên lai đính kèm.
- **LƯU Ý ĐẶC BIỆT KHOẢN CHI HỘ:** Nếu là khoản công ty chi trước thu lại từ khách, bắt buộc gạt bật công tắc: **`Chi hộ Khách hàng (is_on_behalf_of_customer)`**. Khoản này **KHÔNG TRỪ VÀO CHI PHÍ CỦA XE**, P&L xe không bị giảm đi và tự động kết chuyển sang danh sách thu hồi nợ (Debit Note).
- **Hoàn tất:** Bấm nút **`Lưu`**.

### 3.4. Hướng Dẫn Bác Tài Báo 6 Mốc Kho & Chụp Ảnh POD/EIR Trên Điện Thoại
- **Nơi thực hiện:** Mở đường liên kết do điều độ gửi qua Zalo/SMS (truy cập trực tiếp không cần mật khẩu).
- **6 Nút mốc di chuyển thực tế:**
  1. Bấm **`[Xác Nhận Nhận Lệnh]`** khi bắt đầu xuất phát.
  2. Bấm **`[Đã Lấy Cont Rỗng (EIR)]`** khi lấy cont tại bãi depot.
  3. Bấm **`[Đã Đến Cổng Kho]`** khi xe đến kho khách.
  4. Bấm **`[Bắt Đầu Đóng Hàng]`** khi kho mở cửa dỡ/đóng hàng.
  5. Bấm **`[Hoàn Tất, Rời Kho]`** khi kho đóng hàng xong và kẹp seal.
  6. Bấm **`[Đã Hạ Bãi Xong]`** khi hạ cont tại cảng đích.
- **Chụp ảnh POD/EIR:** Bấm **`[Chụp Ảnh POD / EIR]`** ➔ Chụp biên bản giao nhận có chữ ký ➔ Bấm nút **`Tải Lên`**.

---

## 4. Phân Hệ Kế Toán, Tạm Ứng & Sổ Quỹ

### 4.1. Hướng Dẫn Kế Toán Cấp Quỹ Điều Vận Cấp 1
- **Nơi thực hiện:** Menu **`Tài chính & Kế toán`** ➔ Tab **`Tạm Ứng & Hoàn Ứng`** ➔ Khu vực Quỹ Điều Vận ➔ Bấm nút **`+ Cấp Quỹ Điều Vận`**.
- **Nhập liệu:** Điều Phối Viên Nhận Quỹ (`*`), Số Tiền Hạn Mức (`*`) (VNĐ), Nguồn Xuất Quỹ (`*`) (Tiền mặt/Chuyển khoản).
- **Hoàn tất:** Bấm nút **`Lưu`**.

### 4.2. Hướng Dẫn Điều Vận Cấp Tạm Ứng Dọc Đường Cho Tài Xế Cấp 2
- **Nơi thực hiện:** Menu **`Điều vận`** (hoặc **`Tài chính & Kế toán`**) ➔ Bấm nút **`+ Cấp Tạm Ứng Tài Xế`**.
- **Nhập liệu:** Mã Chuyến Xe (`*`), Bác Tài Nhận Tiền (`*`), Số Tiền Tạm Ứng (`*`) (VNĐ), Nguồn Trích Ứng (`Trích từ Quỹ Điều Vận của tôi`).
- **Hoàn tất:** Bấm nút **`Lưu`** (tự động sinh mã `TUTX-...` và trừ hạn mức cá nhân điều phối viên).

### 4.3. Hướng Dẫn Quyết Toán Hoàn Ứng Chuyến Xe & Cân Đối Sổ Quỹ
- **Nơi thực hiện:** Tab **`Tạm Ứng & Hoàn Ứng`** ➔ Dòng phiếu `TUTX-...` ➔ Bấm nút **`Quyết Toán Hoàn Ứng`**.
- **Cân đối chênh lệch tự động:**
  * Dư tiền: Chọn *Tài xế hoàn nộp lại tiền thừa* ➔ Tự sinh **Phiếu Thu (PT-...)**.
  * Thiếu tiền: Chọn *Công ty chi bù cho tài xế* ➔ Tự sinh **Phiếu Chi (PC-...)**.
  * Khớp tiền: Chuyển thẳng sang trạng thái *Đã Hoàn Ứng Xong*.
- **Hoàn tất:** Bấm nút **`Lưu`**.

### 4.4. Hướng Dẫn Tạo Phiếu Thu / Phiếu Chi Sổ Quỹ Mẫu S03a-DN
- **Nơi thực hiện:** Menu **`Tài chính & Kế toán`** ➔ Tab **`Sổ Quỹ Thu - Chi`** ➔ Bấm nút **`+ Lập Phiếu Thu`** hoặc **`+ Lập Phiếu Chi`**.
- **Nhập liệu:** Loại Nghiệp Vụ (`*`), Đối Tượng Giao Dịch (`*`), Số Tiền (`*`) (VNĐ), Phương Thức (`*`), Diễn Giải (`*`).
- **Hoàn tất:** Bấm nút **`Lưu`**. Bấm nút **`In Phiếu A4/A5`** để in mẫu Bộ Tài Chính ký 4 bên.

### 4.5. Hướng Dẫn Thỏa Thuận Cước & Quyết Toán Xe Bạn / Thầu Phụ 3PL
1. **Ghi nhận thỏa thuận:** Trong chi tiết chuyến xe ngoài ➔ Bấm **`Thỏa Thuận Cước Xe Bạn`** ➔ Chọn Nhà Xe (`*`), Cước Thỏa Thuận (`*`), Số tiền ứng trước ➔ Bấm nút **`Lưu`**.
2. **Quyết toán cước:** Khi xe thu đủ POD ➔ Tab **`Xe Thầu Phụ 3PL`** ➔ Bấm nút **`Quyết Toán Cước`** ➔ Bấm nút **`Lưu`** (tự sinh Phiếu Chi chuyển khoản cho nhà xe).

### 4.6. Hướng Dẫn Quyết Toán Gom Chuyến Xe Hàng Loạt (Batch Settlement)
1. Truy cập menu **`Quyết toán`** (`/settlements`).
2. Lọc theo Khách Hàng, khoảng ngày, và chỉ chuyến đã thu đủ POD.
3. Tích chọn các ô vuông của các chuyến xe cần gom đợt.
4. Bấm nút **`[Khóa Sổ Gom Đợt Quyết Toán]`** ➔ Nhập Mã đợt (Ví dụ: `DOT-2026-10A`) ➔ Bấm nút **`Lưu`**.

---

## 5. Phân Hệ Dịch Vụ Hải Quan Điện Tử

- **Nơi thực hiện:** Menu **`Dịch vụ Hải quan`** ➔ Bấm nút **`+ Khai Báo Tờ Khai Mới`**.
- **Các trường bắt buộc:**
  * **Số Tờ Khai (`*`):** Nhập 12 số tờ khai VNACCS.
  * **Chủ Hàng XNK (`*`) & Loại Hình (`*`):** Khách hàng và mã loại hình (E62, A11...).
  * **Phân Luồng (`*`):** Chọn Luồng Xanh, Vàng hoặc Đỏ.
  * **Số Container & Seal:** Nhập cont và seal chì để đối chiếu cổng cảng.
- **Hoàn tất:** Bấm nút **`Lưu`**.

---

## 6. Hướng Dẫn Tra Cứu, Lọc, Tùy Biến Cột & In 14 Báo Cáo BI Khổ A4

- **Cột STT chuẩn đếm số record:** Cột đầu tiên luôn là cột **STT** tự động đếm thứ tự chính xác từng dòng dữ liệu hiển thị sau khi lọc.
- **Tìm kiếm tức thì & Sắp xếp:** Nhập từ khóa vào ô tìm kiếm trên đầu bảng để lọc nhanh. Bấm tiêu đề cột để đảo chiều sắp xếp tăng/giảm dần.
- **Universal Column Manager:** Bấm nút **`Cột`** ở góc phải bảng để ẩn/hiện hoặc đổi vị trí cột theo nhu cầu cá nhân.
- **In ấn A4 chuẩn mực:** Bấm nút **`In Báo Cáo A4`**. Hệ thống tự động chọn khổ **A4 Dọc** (dưới 8 cột) hoặc **A4 Ngang** (từ 8 cột trở lên), căn lề chuẩn 15mm-20mm theo Nghị định 30/2020/NĐ-CP.
