# SỔ TAY HƯỚNG DẪN SỬ DỤNG HỆ THỐNG BIM LOGISTICS™
## Quy Trình Vận Hành Tiêu Chuẩn & Cẩm Nang Thao Tác Hệ Thống (Phiên Bản v1.0)

> **BIM LOGISTICS - BIZ SOLUTIONS** | **Hotline:** 0903.012.099 | **Email:** bimconsultingvn@gmail.com  
> **Tra cứu trực tuyến:** `https://logistics.bim.info.vn/helps`  

---

# MỤC LỤC CHÍNH

- [PHẦN I: MÔ TẢ PHÂN HỆ & TÍNH NĂNG CỐT LÕI](#phần-i-mô-tả-phân-hệ--tính-năng-cốt-lõi)
  - [1. Nền Tảng Vận Hành & Phân Quyền Vai Trò](#1-nền-tảng-vận-hành--phân-quyền-vai-trò-rbac)
  - [2. Dashboard Ban Giám Đốc (Executive BI)](#2-dashboard-ban-giám-đốc-executive-bi)
  - [3. Phân Hệ Sale & Booking (CRM, Báo Giá & Đơn Hàng)](#3-phân-hệ-sale--booking-crm-báo-giá--đơn-hàng)
  - [4. Phân Hệ Điều Vận & Chuyến Xe ](#4-phân-hệ-điều-vận--chuyến-xe-tms-core-engine)
  - [5. Phân Hệ Quản Lý Đội Xe, Bãi & Nhân Sự (Fleet & HR)](#5-phân-hệ-quản-lý-đội-xe-bãi--nhân-sự-fleet--hr)
  - [6. Phân Hệ Tài Chính, Tạm Ứng & Sổ Quỹ (Accounting & Cash Flow)](#6-phân-hệ-tài-chính-tạm-ứng--sổ-quỹ-accounting--cash-flow)
  - [7. Phân Hệ Thủ Tục Hải Quan Điện Tử (Customs Declaration)](#7-phân-hệ-thủ-tục-hải-quan-điện-tử-customs-declaration)
  - [8. Hệ Thống 14 Báo Cáo Thông Minh BI Vận Tải](#8-hệ-thống-14-báo-cáo-thông-minh-bi-vận-tải)
- [PHẦN II: HƯỚNG DẪN CÀI ĐẶT 13 DANH MỤC GỐC (MASTER DATA)](#phần-ii-hướng-dẫn-cài-đặt-13-danh-mục-gốc-master-data)
  - [1. Khai Báo Hệ Thống / Hồ Sơ Doanh Nghiệp (Company Profile)](#1-khai-báo-hệ-thống--hồ-sơ-doanh-nghiệp-company-profile)
  - [2. Phân Quyền & Vai Trò Hệ Thống (Roles & Permissions)](#2-phân-quyền--vai-trò-hệ-thống-roles--permissions)
  - [3. Biểu Phí Lương Chuyến Tài Xế (Driver Trip Tariffs)](#3-biểu-phí-lương-chuyến-tài-xế-driver-trip-tariffs)
  - [4. Phụ Cấp Tuyến & Kiểm Hóa (Allowances & Inspection Tariffs)](#4-phụ-cấp-tuyến--kiểm-hóa-allowances--inspection-tariffs)
  - [5. Cảng & Kho Bãi Địa Điểm (Locations / Seaports & Warehouses)](#5-cảng--kho-bãi-địa-điểm-locations--seaports--warehouses)
  - [6. Biểu Cước Vận Chuyển Khách Hàng (Customer Freight Tariffs)](#6-biểu-cước-vận-chuyển-khách-hàng-customer-freight-tariffs)
  - [7. Khách Hàng Doanh Nghiệp (Customers CRM)](#7-khách-hàng-doanh-nghiệp-customers-crm)
  - [8. Hãng Tàu Biển (Shipping Lines)](#8-hãng-tàu-biển-shipping-lines)
  - [9. Đầu Kéo & Xe Tải (Tractors & Trucks)](#9-đầu-kéo--xe-tải-tractors--trucks)
  - [10. Rơ-Moóc Vận Tải (Semi-Trailers)](#10-rơ-moóc-vận-tải-semi-trailers)
  - [11. Nhà Xe Thầu Phụ 3PL (Subcontractors / Partner Fleets)](#11-nhà-xe-thầu-phụ-3pl-subcontractors--partner-fleets)
  - [12. Khoản Mục Chi Phí Vận Tải (Expense Catalog)](#12-khoản-mục-chi-phí-vận-tải-expense-catalog)
  - [13. Quy Cách Vỏ Container & Thùng Xe (Container Specifications)](#13-quy-cách-vỏ-container--thùng-xe-container-specifications)
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
  - [7. Phân Hệ Quản Trị Nhân Sự, Hợp Đồng Lao Động & Người Phụ Thuộc (HR Management)](#7-phân-hệ-quản-trị-nhân-sự-hợp-đồng-lao-động--người-phụ-thuộc-hr-management)
  - [8. Phân Hệ Chấm Công & Quản Lý Nghỉ Phép (Monthly Attendance)](#8-phân-hệ-chấm-công--quản-lý-nghỉ-phép-monthly-attendance)
  - [9. Phân Hệ Tính Lương Logistics Hai Động Cơ (Hybrid Payroll) & Chi Trả Sổ Quỹ](#9-phân-hệ-tính-lương-logistics-hai-động-cơ-hybrid-payroll--chi-trả-sổ-quỹ)
  - [10. Quy Chuẩn Thao Tác Bảng Dữ Liệu: Chuẩn 2 Nút Xem & In (Không Dùng Modal)](#10-quy-chuẩn-thao-tác-bảng-dữ-liệu-chuẩn-2-nút-xem--in-không-dùng-modal)

---

# PHẦN I: MÔ TẢ PHÂN HỆ & TÍNH NĂNG CỐT LÕI

## 1. Nền Tảng Vận Hành & Phân Quyền Vai Trò

Nền tảng **BIM Logistics Platform** được thiết kế theo mô hình điều hành khép kín (Full-cycle Logistics) chuyên biệt cho vận tải đường bộ Container FCL, hàng rời FTL và dịch vụ cảng biển tại Việt Nam.

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

## 4. Phân Hệ Điều Vận & Chuyến Xe 

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

# PHẦN II: HƯỚNG DẪN CÀI ĐẶT 13 DANH MỤC GỐC (MASTER DATA)

---

## 1. Khai Báo Hệ Thống / Hồ Sơ Doanh Nghiệp (Company Profile)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Hồ Sơ Doanh Nghiệp`** (hoặc mở modal qua Cài đặt Hệ thống).
- **Mục đích:** Thiết lập thông tin pháp nhân đơn vị vận tải xuất hiện trên báo giá, lệnh vận chuyển và phiếu thu chi.
- **Các trường thông tin chi tiết:**
  * **Tên Công Ty (`*`):** Tên đầy đủ theo ĐKKD (Ví dụ: `CÔNG TY TNHH VẬN TẢI TRIỀN VÕ`).
  * **Mã Số Thuế (`*`):** MST 10 hoặc 13 số phục vụ kê khai và xuất hóa đơn VAT.
  * **Địa Chỉ Trụ Sở (`*`):** Địa chỉ pháp lý ghi nhận trên hóa đơn và chứng từ hợp đồng.
  * **Số Điện Thoại Trụ Sở (`*`):** Hotline liên hệ tổng đài điều hành (Ví dụ: `0965.559.561`).
  * **Email Doanh Nghiệp (`*`):** Hòm thư tiếp nhận booking và đối soát nợ cước.
  * **Số Tài Khoản Ngân Hàng Thụ Hưởng (`*`):** Số tài khoản ngân hàng chính thức nhận tiền cước.
  * **Tên Ngân Hàng & Chi Nhánh (`*`):** Ngân hàng mở tài khoản thụ hưởng.
  * **Họ Tên Người Đại Diện Pháp Luật (`*`):** Họ tên Giám đốc/Tổng Giám đốc ký duyệt văn bản.
- **Thao tác lưu:** Nhập đầy đủ thông tin các trường có dấu `*` ➔ Bấm nút **`Lưu`**.

---

## 2. Phân Quyền & Vai Trò Hệ Thống (Roles & Permissions)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Phân Quyền & Vai Trò`** ➔ Bấm nút **`+ Thêm Nhóm Quyền`**.
- **Mục đích:** Khởi tạo nhóm quyền chức vụ hoặc cấp tài khoản người dùng tương ứng với vị trí làm việc.
- **Các trường thông tin chi tiết:**
  * **Mã Vai Trò (`*`):** Mã viết hoa không dấu (Ví dụ: `DIRECTOR`, `DISPATCHER`, `ACCOUNTANT`, `SALESMAN`, `MECHANIC`, `DRIVER`).
  * **Tên Vai Trò / Chức Danh (`*`):** Tên chức danh tiếng Việt (Ví dụ: `Điều Phối Viên Chuyến Xe`).
  * **Phạm Vi Truy Cập Phân Hệ (`*`):** Đánh dấu các phân hệ cho phép: Dashboard, Sale, Điều Vận, Kế Toán, Đội Xe, Báo Cáo.
  * **Quyền Hạn Thao Tác Chi Tiết (`*`):** Xem, Thêm mới, Sửa, Xóa (Soft-delete), Duyệt báo giá, Quyết toán sổ quỹ.
  * **Ghi Chú Trách Nhiệm:** Mô tả nhiệm vụ và phạm vi ràng buộc trách nhiệm pháp lý.
- **Thao tác lưu:** Tích chọn các quyền hợp lệ ➔ Bấm nút **`Lưu`**.

---

## 3. Biểu Phí Lương Chuyến Tài Xế (Driver Trip Tariffs)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Biểu Phí Lương Tuyến`** ➔ Bấm nút **`+ Thêm Tuyến Lương Mới`**.
- **Mục đích:** Cấu hình mức lương khoán trả cho bác tài theo từng cung đường và loại vỏ cont 20ft/40ft.
- **Các trường thông tin chi tiết:**
  * **Tên Tuyến Đường Vận Tải (`*`):** Lộ trình chi tiết (Ví dụ: `Cảng Cát Lái ➔ KCN VSIP 1 (Bình Dương)`).
  * **Quy Cách Container (`*`):** Chọn loại vỏ `20DC`, `40HC`, `45HC` hoặc `Hàng Rời FTL`.
  * **Mức Lương Khoán Chuyến (`*`) (VNĐ):** Tiền lương chuyến tài xế hưởng khi hoàn thành (Ví dụ: `450.000 đ`).
  * **Định Mức Chi Phí Cầu Đường BOT (VNĐ):** Tiền vé trạm thu phí định mức cho phép tài xế chi trả.
  * **Định Mức Dầu Diesel Tiêu Hao (Lít):** Số lít dầu quy định cho toàn bộ vòng quay chuyến xe.
  * **Mức Phụ Cấp Qua Đêm (VNĐ):** Khoản phụ cấp lưu bãi/chờ dỡ hàng qua đêm nếu có phát sinh.
- **Thao tác lưu:** Điền đầy đủ định mức ➔ Bấm nút **`Lưu`**.

---

## 4. Phụ Cấp Tuyến & Kiểm Hóa (Allowances & Inspection Tariffs)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Phụ Cấp & Kiểm Hóa`** ➔ Bấm nút **`+ Thêm Mức Phụ Cấp`**.
- **Mục đích:** Thiết lập các khoản bồi dưỡng ngoài giờ, phụ cấp lưu ca, nâng hạ khó và phí kiểm hóa hải quan.
- **Các trường thông tin chi tiết:**
  * **Mã Phụ Cấp (`*`):** Mã viết tắt (Ví dụ: `KIEM_HOA_DO`, `LUU_CA_KHO`, `VE_SINH_CONT`, `CAI_CONG_DAP`).
  * **Tên Khoản Phụ Cấp (`*`):** Tên đầy đủ (Ví dụ: `Bồi dưỡng kiểm hóa cont luồng đỏ tại bãi kiểm`).
  * **Loại Phụ Cấp (`*`):** Chọn `Kiểm hóa hải quan`, `Chờ dỡ hàng ngoài giờ`, `Cược bãi cont` hoặc `Phụ phí cung đường xấu`.
  * **Số Tiền Phụ Cấp Định Mức (`*`) (VNĐ):** Mức chi tiêu chuẩn theo quy chế công ty (Ví dụ: `300.000 đ`).
  * **Yêu Cầu Chứng Từ / Biên Bản Đính Kèm:** Đánh dấu Bắt buộc/Không bắt buộc phải có ảnh biên lai chụp kèm.
- **Thao tác lưu:** Điền thông tin chuẩn ➔ Bấm nút **`Lưu`**.

---

## 5. Cảng & Kho Bãi Địa Điểm (Locations / Seaports & Warehouses)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Địa Điểm`** ➔ Bấm nút **`+ Thêm Địa Điểm Mới`**.
- **Mục đích:** Lưu danh bạ cảng biển, ICD, depot cấp/trả vỏ rỗng, kho đóng hàng và bãi đỗ xe công ty.
- **Các trường thông tin chi tiết:**
  * **Mã Địa Điểm (`*`):** Mã viết hoa không dấu (Ví dụ: `CAT_LAI`, `VICT`, `ICD_TRANSIMEX`, `DEPOT_TANAMEXCO`, `KCN_VSIP1`).
  * **Tên Địa Điểm / Cảng / Kho (`*`):** Tên gọi nhận diện (Ví dụ: `Cảng Cát Lái - Cổng C`).
  * **Phân Loại Địa Điểm (`*`):** Chọn `Cảng Biển (SEAPORT)`, `Depot Vỏ Rỗng (DEPOT)`, `Kho Khách Hàng (WAREHOUSE)`, hoặc `Bãi Đỗ Xe (YARD)`.
  * **Mã ICD / Cảng Vụ Hải Quan (`*`):** Mã VNACCS của cảng (Ví dụ: `VNSGN`).
  * **Địa Chỉ Chi Tiết (`*`):** Số nhà, đường, xã/phường, quận/huyện để định vị trên Google Maps.
  * **Tọa Độ GPS (Vĩ độ, Kinh độ):** Tọa độ địa lý dùng cho hệ thống tự động nhận diện mốc geofence xe ra/vào.
  * **Số Điện Thoại Điều Phối Bãi:** Hotline liên hệ bộ phận giao nhận tại cảng hoặc thủ kho.
- **Thao tác lưu:** Nhập chính xác các thông tin ➔ Bấm nút **`Lưu`**.

---

## 6. Biểu Cước Vận Chuyển Khách Hàng (Customer Freight Tariffs)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Biểu Cước Khách Hàng`** ➔ Bấm nút **`+ Thêm Tuyến Cước`**.
- **Mục đích:** Thiết lập bảng giá cước chuẩn áp dụng cho từng đối tác khách hàng theo hợp đồng nguyên tắc.
- **Các trường thông tin chi tiết:**
  * **Khách Hàng Áp Dụng (`*`):** Chọn tên doanh nghiệp khách hàng từ danh bạ.
  * **Cặp Lộ Trình Tuyến Đường (`*`):** Điểm đi ➔ Điểm đến (Ví dụ: `Cảng Cát Lái ➔ KCN Amata Đồng Nai`).
  * **Loại Vỏ Container (`*`):** `20DC`, `40HC`, `45HC` hoặc `Xe Tải Thùng`.
  * **Đơn Giá Cước Vận Chuyển Chưa VAT (`*`) (VNĐ):** Mức cước bán cho khách hàng (Ví dụ: `3.200.000 đ`).
  * **Thuế Suất VAT (`*`):** Thuế suất áp dụng (0%, 8%, 10%).
  * **Ngày Bắt Đầu Áp Dụng (`*`) & Ngày Hết Hạn (`*`):** Thời hạn hiệu lực của bảng cước theo hợp đồng.
  * **Cơ Chế Bù Trừ Nhiên Liệu:** Quy định tăng/giảm cước khi giá dầu DO 0.05S thị trường biến động quá 10%.
- **Thao tác lưu:** Điền đầy đủ thỏa thuận thương mại ➔ Bấm nút **`Lưu`**.

---

## 7. Khách Hàng Doanh Nghiệp (Customers CRM)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Khách Hàng`** ➔ Bấm nút **`+ Thêm Khách Hàng`**.
- **Mục đích:** Quản lý hồ sơ đối tác chủ hàng, nhà máy xuất nhập khẩu và các công ty logistics giao dịch.
- **Các trường thông tin chi tiết:**
  * **Mã Khách Hàng (`*`):** Mã viết tắt viết hoa không dấu (Ví dụ: `SAMSUNG`, `VINFAST`, `THP_GROUP`).
  * **Tên Doanh Nghiệp Đầy Đủ (`*`):** Tên công ty pháp lý (Ví dụ: `CÔNG TY TNHH SAMSUNG ELECTRONICS VIỆT NAM`).
  * **Mã Số Thuế (`*`):** MST 10 hoặc 13 số bắt buộc để phục vụ xuất hóa đơn điện tử hợp lệ.
  * **Địa Chỉ Trụ Sở Doanh Nghiệp (`*`):** Địa chỉ ghi trên giấy phép ĐKKD.
  * **Số Điện Thoại Liên Lạc (`*`):** Số điện thoại người đại diện hoặc phòng XNK.
  * **Email Nhận Hóa Đơn VAT (`*`):** Email hòm thư kế toán nhận hóa đơn cước vận tải.
  * **Người Phụ Trách Giao Nhận:** Tên và số điện thoại quản lý kho hàng bên khách.
  * **Hạn Mức Công Nợ (VNĐ):** Số tiền tối đa khách được phép nợ gối đầu.
  * **Thời Hạn Cho Phép Nợ (Ngày):** Số ngày được thanh toán chậm (Ví dụ: 30 ngày, 45 ngày).
- **Thao tác lưu:** Kiểm tra kỹ mã số thuế ➔ Bấm nút **`Lưu`**.

---

## 8. Hãng Tàu Biển (Shipping Lines)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Hãng Tàu`** ➔ Bấm nút **`+ Thêm Hãng Tàu Mới`**.
- **Mục đích:** Danh mục các hãng vận tải container đường biển phát hành booking và vỏ cont.
- **Các trường thông tin chi tiết:**
  * **Mã Hãng Tàu Chuẩn Quốc Tế (`*`):** Mã định danh SCAC 4 chữ cái (Ví dụ: `MAEU`, `ONE`, `COSCO`, `EVER`, `CMA`, `MSKU`, `SITC`).
  * **Tên Hãng Tàu Đầy Đủ (`*`):** Tên thương mại (Ví dụ: `Ocean Network Express (ONE Lines)`).
  * **Cổng Tra Cứu Lệnh Giao Vỏ (eDO URL):** Địa chỉ website tra cứu lệnh giao nhận điện tử.
  * **Số Ngày Free-Time Mặc Định (Ngày):** Số ngày miễn phí lưu bãi/lưu vỏ DET/DEM tiêu chuẩn (Ví dụ: 7 hoặc 14 ngày).
  * **Quy Trình Cược Cont & Hạ Bãi:** Ghi chú các điều kiện cược tiền vỏ, vệ sinh cont trước khi trả về depot.
- **Thao tác lưu:** Điền chính xác mã hãng tàu ➔ Bấm nút **`Lưu`**.

---

## 9. Đầu Kéo & Xe Tải (Tractors & Trucks)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Đầu Kéo & Xe Tải`** ➔ Bấm nút **`+ Thêm Xe Mới`**.
- **Mục đích:** Quản lý đội phương tiện đầu kéo container, xe tải thùng chở hàng thuộc đội xe nhà hoặc thuê ngoài.
- **Các trường thông tin chi tiết:**
  * **Biển Số Xe (`*`):** Nhập biển số đúng định dạng (Ví dụ: `51C-123.45`, `50H-987.65`).
  * **Loại Phương Tiện (`*`):** Chọn `Đầu Kéo Container (TRACTOR)` hoặc `Xe Tải Thùng (TRUCK)`.
  * **Hình Thức Sở Hữu (`*`):** Chọn `Xe Công Ty (OWNED)` hoặc `Xe Thuê Ngoài / Thầu Phụ (SUBCONTRACTOR)`.
  * **Nhãn Hiệu & Năm Sản Xuất (`*`):** Hãng sản xuất (Ví dụ: `Freightliner Cascadia 2021`, `Hyundai HD1000`).
  * **Hạn Đăng Kiểm Phương Tiện (`*`):** Ngày hết hạn sổ kiểm định an toàn kỹ thuật (Hệ thống tự báo đỏ khi <= 15 ngày).
  * **Hạn Bảo Hiểm Bắt Buộc TNDS (`*`):** Ngày hết hạn bảo hiểm trách nhiệm dân sự xe cơ giới.
  * **Tài Xế Mặc Định Gắn Xe:** Chỉ định tài xế thường trực điều khiển phương tiện này.
  * **Số Thẻ Thu Phí VETC/ePass:** Mã tài khoản dán kính để nạp tiền qua trạm BOT tự động.
- **Thao tác lưu:** Điền đầy đủ hạn đăng kiểm ➔ Bấm nút **`Lưu`**.

---

## 10. Rơ-Moóc Vận Tải (Semi-Trailers)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Rơ-Moóc`** ➔ Bấm nút **`+ Thêm Rơ-Moóc Mới`**.
- **Mục đích:** Quản lý danh mục rơ-moóc xương, moóc sàn, moóc cổ cò phục vụ chở container 20ft, 40ft, 45ft.
- **Các trường thông tin chi tiết:**
  * **Biển Số Rơ-Moóc (`*`):** Biển số moóc (Ví dụ: `51R-098.76`, `50R-123.45`).
  * **Loại Rơ-Moóc (`*`):** Chọn `Moóc Xương 40ft (SKELETON_40)`, `Moóc Cổ Cò 40ft (GOOSENECK)`, `Moóc Xương 20ft 3 Trục (SKELETON_20)`, `Moóc Sàn 45ft (FLATBED)`.
  * **Tải Trọng Cho Phép Chở Khối Lượng Hàng (`*`) (Tấn):** Trọng lượng tối đa được phép kéo theo đăng kiểm (Ví dụ: `31.5 tấn`).
  * **Hạn Đăng Kiểm Rơ-Moóc (`*`):** Ngày hết hạn kiểm định moóc (Cảnh báo trước 15 ngày).
  * **Số Lượng Trục & Tình Trạng Lốp:** Ghi chú 2 trục / 3 trục và thông số vỏ lốp an toàn.
  * **Bãi Đậu Xe Thường Trực:** Bãi đỗ xe hoặc kho depot tập kết rơ-moóc khi không ghép chuyến.
- **Thao tác lưu:** Điền tải trọng và hạn kiểm định ➔ Bấm nút **`Lưu`**.

---

## 11. Nhà Xe Thầu Phụ 3PL (Subcontractors / Partner Fleets)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Nhà Xe Thầu Phụ`** ➔ Bấm nút **`+ Thêm Thầu Phụ Mới`**.
- **Mục đích:** Quản lý danh bạ các công ty xe bạn, đối tác vận tải vệ tinh thuê ngoài khi đội xe nội bộ quá tải.
- **Các trường thông tin chi tiết:**
  * **Mã Nhà Xe (`*`):** Mã viết tắt (Ví dụ: `XE_HOANG_LONG`, `3PL_MINH_TRI`, `THAU_TRUONG_HAI`).
  * **Tên Công Ty / Hộ Kinh Doanh (`*`):** Tên đầy đủ đơn vị thầu phụ.
  * **Mã Số Thuế (`*`):** Bắt buộc để đối soát hóa đơn VAT cước xe bạn chuyển vào.
  * **Người Đại Diện & Hotline Điều Độ (`*`):** Số điện thoại liên hệ trực tiếp khi gán xe gấp.
  * **Số Tài Khoản Ngân Hàng Thanh Toán (`*`):** STK nhận tiền cước chuyển khoản sau khi hoàn thành chuyến.
  * **Tên Ngân Hàng Thụ Hưởng (`*`):** Ngân hàng của đơn vị thầu phụ.
  * **Điều Khoản Thanh Toán Cước:** Thỏa thuận trả ngay sau khi giao POD gốc hoặc gối đầu theo tháng.
- **Thao tác lưu:** Điền đầy đủ thông tin tài khoản ngân hàng ➔ Bấm nút **`Lưu`**.

---

## 12. Khoản Mục Chi Phí Vận Tải (Expense Catalog)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Khoản Mục Chi Phí`** ➔ Bấm nút **`+ Thêm Khoản Mục Chi Phí`**.
- **Mục đích:** Danh mục các loại chi phí phát sinh trong hành trình chuyến xe phục vụ tính P&L và lập Debit Note chi hộ.
- **Các trường thông tin chi tiết:**
  * **Mã Khoản Mục (`*`):** Mã viết hoa chuẩn hóa (Ví dụ: `LIFT_ON`, `LIFT_OFF`, `TOLL_FEE`, `CONTAINER_DEPOSIT`, `WEIGHING`, `POLICE_FEE`, `REPAIR_EXPENSE`).
  * **Tên Khoản Chi Phí (`*`):** Tên hiển thị (Ví dụ: `Phí nâng vỏ cont rỗng tại cảng`, `Vé cầu đường BOT`).
  * **Phân Nhóm Chi Phí (`*`):** Chọn `Nâng Hạ Cảng / Depot`, `Cầu Đường BOT`, `Chi Hộ Khách Hàng`, `Nhiên Liệu Dầu Mỡ`, `Sửa Chữa Dọc Đường` hoặc `Chi Phí Khác`.
  * **Định Mức Đơn Giá Tiêu Chuẩn (VNĐ):** Mức chi phí ước tính mặc định để tự động điền khi tạo lệnh.
  * **Kiểm Soát Hóa Đơn VAT:** Đánh dấu Có/Không yêu cầu bắt buộc tài xế phải lấy hóa đơn điện tử hợp pháp.
- **Thao tác lưu:** Phân loại nhóm chi phí chính xác ➔ Bấm nút **`Lưu`**.

---

## 13. Quy Cách Vỏ Container & Thùng Xe (Container Specifications)
- **Nơi thực hiện:** Vào menu **`Cài đặt & Danh mục`** ➔ Chọn tab **`Quy Cách Container`** ➔ Bấm nút **`+ Thêm Quy Cách Vỏ`**.
- **Mục đích:** Định nghĩa kích thước, thể tích CBM, trọng lượng vỏ và tải trọng chở tối đa của các loại container.
- **Các trường thông tin chi tiết:**
  * **Mã Quy Cách ISO (`*`):** Mã chuẩn (Ví dụ: `20DC`, `40DC`, `40HC`, `45HC`, `20RF`, `40RF`, `FLAT_RACK`, `OPEN_TOP`).
  * **Tên Diễn Giải Quy Cách (`*`):** Tên thường gọi (Ví dụ: `Container 40 Feet Cao (High Cube)`).
  * **Chiều Dài x Rộng x Cao (Mét):** Kích thước lọt lòng thùng hàng.
  * **Thể Tích Chứa Hàng Tiêu Chuẩn (CBM):** Thể tích tính bằng mét khối (Ví dụ: `20DC: 33 CBM`, `40HC: 76 CBM`).
  * **Trọng Lượng Vỏ Không Tải Tare Weight (Tấn):** Cân nặng xác vỏ cont (Ví dụ: `40HC ~ 3.9 tấn`).
  * **Khối Lượng Hàng Chở Tối Đa Payload (Tấn):** Tải trọng an toàn không vượt quá mức cho phép trên đường bộ.
- **Thao tác lưu:** Điền các thông số kỹ thuật ➔ Bấm nút **`Lưu`**.

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

---

## 7. Phân Hệ Quản Trị Nhân Sự, Hợp Đồng Lao Động & Người Phụ Thuộc (HR Management)

- **Nơi thực hiện:** Menu **`Nhân sự`** (`/personnel/`).
- **Phân hệ bao gồm 3 tab quản lý trọng tâm:**
  1. **Tab `Nhân viên`:** Danh sách và hồ sơ 360° của toàn thể cán bộ nhân viên công ty (Khối Văn phòng, Điều vận, Kế toán, Quản lý kho và Đội ngũ Tài xế).
  2. **Tab `Hợp đồng lao động`:** Quản lý vòng đời hợp đồng lao động, loại hợp đồng, mức lương thỏa thuận và lương trích đóng BHXH.
  3. **Tab `Người phụ thuộc`:** Quản lý danh sách người phụ thuộc đăng ký giảm trừ gia cảnh thuế TNCN theo quy định của Tổng cục Thuế.

### 7.1. Hướng Dẫn Khai Báo Hồ Sơ Cán Bộ Nhân Viên & Bác Tài Mới
1. Tại Tab **`Nhân viên`**, bấm nút **`+ Thêm Nhân Viên`**.
2. **Kê khai các trường thông tin:**
   - **Mã Nhân Viên (`*`):** Định dạng viết hoa không dấu (Ví dụ: `NV019`, `TX025`).
   - **Họ Và Tên (`*`):** Tên đầy đủ theo CCCD (Ví dụ: `Hoàng Văn Thật`).
   - **Tên Gọi Thường Dùng (Biệt danh):** Tên gọi hiện trường (Ví dụ: `Thật Xe Tải`).
   - **Số Điện Thoại (`*`):** 10 chữ số dùng để liên hệ và nhận thông báo điều vận.
   - **Phòng Ban (`*`):** Chọn `Đội xe (Fleet)`, `Điều vận (Dispatch)`, `Kế toán (Accounting)`, `Kinh doanh (Sales)`, `Kho bãi (Warehouse)` hoặc `Ban Giám Đốc (Board of Directors)`.
   - **Chức Danh / Vai Trò (`*`):** Chọn `Tài xế`, `Phụ xe`, `Điều phối viên`, `Kế toán`, `Thủ kho`, v.v.
   - **Số CCCD / CMND (`*`):** 12 số CCCD gắn chip để phục vụ kê khai thuế và cơ quan bảo hiểm.
   - **Mã Số Thuế Cá Nhân (MST):** Mã số thuế phục vụ khấu trừ thuế TNCN cuối năm.
   - **Mã Số BHXH:** Mã số sổ bảo hiểm xã hội 10 số.
   - **Hạng Giấy Phép Lái Xe (GPLX):** Bắt buộc đối với Tài xế (Chọn `Hạng C`, `Hạng FC` cho xe đầu kéo container).
   - **Ngày Hết Hạn Bằng Lái:** Hệ thống tự động cảnh báo trước 30 ngày để tài xế đổi bằng.
   - **Thông Tin Ngân Hàng Chi Lương:** Số tài khoản (`*`), Tên ngân hàng (`*`) (Vietcombank, MB, Techcombank...), Chi nhánh, Tên người thụ hưởng.
3. Bấm nút **`Lưu`**. Hồ sơ được kích hoạt ngay lập tức.

### 7.2. Hướng Dẫn Ký Kết Hợp Đồng Lao Động & Thiết Lập Lương Căn Bản
1. Tại Tab **`Hợp đồng lao động`**, bấm nút **`+ Ký Hợp Đồng Mới`**.
2. **Kê khai các thông số pháp lý & tiền lương:**
   - **Số Hợp Đồng (`*`):** Định dạng `HDLD-{Mã NV}-{Năm}` (Ví dụ: `HDLD-TX025-2026`).
   - **Cán Bộ Nhân Viên (`*`):** Chọn nhân sự từ danh sách.
   - **Loại Hợp Đồng (`*`):** Chọn `Thử việc (2 tháng)`, `Xác định thời hạn (12-36 tháng)`, hoặc `Không xác định thời hạn`.
   - **Ngày Bắt Đầu Hiệu Lực (`*`) & Ngày Kết Thúc:** Thời hạn hợp đồng.
   - **Mức Lương Căn Bản HĐLĐ (`*`) (VNĐ):** Mức lương chính làm căn cứ tính lương ngày công thời gian:
     $$\text{Lương 1 ngày công} = \frac{\text{Lương Căn Bản HĐLĐ}}{26\text{ ngày công chuẩn}}$$
   - **Mức Lương Đóng BHXH (`*`) (VNĐ):** Mức lương đăng ký với cơ quan BHXH làm căn cứ trích đóng 10.5% (Tối thiểu không dưới lương tối thiểu vùng và không vượt quá trần 20 lần mức lương cơ sở = 46,800,000 đ theo Nghị định 73/2024/NĐ-CP).
   - **Phụ Cấp Trách Nhiệm / Xăng Xe / Điện Thoại:** Các khoản phụ cấp cố định kèm theo hợp đồng.
3. Bấm nút **`Lưu`**. Trạng thái hợp đồng chuyển sang `ACTIVE` (Đang hiệu lực).

### 7.3. Hướng Dẫn Đăng Ký Người Phụ Thuộc Giảm Trừ Gia Cảnh
1. Tại Tab **`Người phụ thuộc`**, bấm nút **`+ Khai Báo Người Phụ Thuộc`**.
2. **Kê khai thông tin:**
   - **Cán Bộ Nhân Viên (`*`):** Chọn nhân viên đăng ký giảm trừ.
   - **Họ Tên Người Phụ Thuộc (`*`):** Tên con nhỏ, cha mẹ già hết tuổi lao động, hoặc người cần chăm sóc theo Luật Thuế TNCN.
   - **Mối Quan Hệ (`*`):** Chọn `Con ruột/Con nuôi`, `Vợ/Chồng`, `Cha/Mẹ ruột`, v.v.
   - **Số CCCD / Số Khai Sinh (`*`):** Mã định danh phục vụ cơ quan thuế đối soát.
   - **Tháng Bắt Đầu Giảm Trừ (`*`) & Tháng Kết Thúc:** Thời gian hiệu lực áp dụng mức giảm trừ **4,400,000 đ/người/tháng** (theo Nghị quyết 954/2020/UBTVQH14).
3. Bấm nút **`Lưu`**. Khi chạy tính lương, hệ thống sẽ tự động trừ $4,400,000 \times \text{Số NPT}$ vào thu nhập chịu thuế trước khi áp biểu thuế lũy tiến.

---

## 8. Phân Hệ Chấm Công & Quản Lý Nghỉ Phép (Monthly Attendance)

- **Nơi thực hiện:** Menu **`Nhân sự`** ➔ Tab **`Chấm công tháng`**.
- **Kỳ chấm công tiêu chuẩn:** Khớp với kỳ lương hàng tháng (Từ ngày 01 đến ngày cuối tháng; ngày công định mức chuẩn là **26.0 ngày**).

### 8.1. Hướng Dẫn Tự Động Khởi Tạo Bảng Công Toàn Công Ty
1. Chọn Kỳ lương cần chấm công (Ví dụ: `Tháng 09/2026`).
2. Bấm nút **`[Khởi Tạo Công Tự Động]`**.
3. Hệ thống sẽ tự động quét toàn bộ nhân sự đang làm việc (`is_active=True`), khởi tạo bản ghi công với mặc định 26 ngày công chuẩn, giúp bộ phận nhân sự không cần nhập lại danh sách thủ công.

### 8.2. Hướng Dẫn Chấm Công Chi Tiết Từng Nhân Viên
1. Tại dòng của nhân viên cần điều chỉnh công, bấm nút **`Xem`** (icon `fas fa-eye`).
2. **Kê khai số ngày thực tế trong tháng:**
   - **Số Ngày Đi Làm Thực Tế (`worked_days`):** Số ngày có mặt làm việc thực tế tại văn phòng, kho, hoặc điều xe trên đường (Ký hiệu `X`).
   - **Nghỉ Phép Năm Hưởng Lương (`paid_leave_days`):** Số ngày nghỉ phép năm theo Luật Lao động (Ký hiệu `P`) $\rightarrow$ Được tính 100% lương ngày.
   - **Nghỉ Lễ, Tết Hưởng Lương (`holiday_leave_days`):** Số ngày nghỉ Quốc khánh, Tết... có hưởng lương (Ký hiệu `L`) $\rightarrow$ Được tính 100% lương ngày.
   - **Nghỉ Không Hưởng Lương (`unpaid_leave_days`):** Số ngày nghỉ việc riêng không lương (Ký hiệu `Ro`) $\rightarrow$ Bị trừ lương ngày tương ứng.
   - **Nghỉ Hưởng Chế Độ BHXH (`sick_leave_days`, `maternity_leave_days`):** Nghỉ ốm đau hoặc thai sản do cơ quan BHXH chi trả trợ cấp trực tiếp (Ký hiệu `Om`, `Ts`).
3. **Công thức tự động:**
   $$\text{Tổng Ngày Công Hưởng Lương} = \text{Đi Làm Thực Tế} + \text{Phép Năm (P)} + \text{Nghỉ Lễ Tết (L)}$$
4. Bấm nút **`Lưu`**. Dữ liệu công tổng hợp sẽ làm đầu vào trực tiếp cho động cơ tính lương.

---

## 9. Phân Hệ Tính Lương Logistics Hai Động Cơ (Hybrid Payroll) & Chi Trả Sổ Quỹ

Hệ thống tiền lương của BIM Logistics Platform giải quyết triệt để bài toán đặc thù ngành vận tải container: **Kết hợp hài hòa giữa Khối Văn phòng (Lương thời gian) và Khối Tài xế (Lương thời gian + Lương sản lượng chuyến + Khấu trừ tạm ứng dọc đường)**.

### 9.1. Động Cơ Tính Lương Kết Hợp (Hybrid Payroll Engine)
Khi Kế toán bấm **`[Tính Toán Bảng Lương]`** (`POST /api/personnel/periods/{id}/calculate/`), động cơ xử lý tự động chạy ngầm theo 6 bước:

```
[Bảng Công Tháng] ────────┐
                          ├─► [1. Lương Ngày Công] ──┐
[Hợp Đồng Lao Động] ──────┘                          │
                                                     ├─► [TỔNG THU NHẬP GROSS] ─┐
[Chuyến Xe DispatchTrip] ───► [2. Lương Chuyến Xe] ──┘                          │
                                                                                ├─► [THỰC LĨNH NET]
[Tạm Ứng DriverTripAdvance] ─► [Khấu Trừ Tạm Ứng] ───┐                          │
                                                     ├─► [TỔNG CÁC KHOẢN TRỪ] ──┘
[BHXH 10.5% & Thuế TNCN] ───► [Bảo Hiểm & Thuế] ─────┘
```

#### Chi Tiết 3 Khối Cấu Phần Thu Nhập:
1. **Lương Ngày Công Thời Gian (Áp dụng cho 100% CBNV):**
   $$\text{Lương Ngày} = \text{round}\left(\frac{\text{Lương Căn Bản HĐLĐ}}{26} \times \text{Tổng Ngày Công Hưởng Lương}\right)$$
2. **Lương Sản Lượng Chuyến Xe Logistics (Dành riêng cho Tài xế & Phụ xe):**
   Tự động truy vấn toàn bộ các chuyến xe trong tháng của tài xế đạt trạng thái hoàn thành:
   - **Lương chuyến chính (`trip_allowance`):** Lương kéo hàng nguyên chuyến từ Cảng về Kho hoặc ngược lại (kế thừa từ `DispatchTrip.driver_allowance`).
   - **Lương cắt kéo / hạ cont rỗng (`dropoff_allowance`):** Lương phụ hạ cont hoặc kéo cont vỏ trả depot (kế thừa từ `DispatchTrip.dropoff_driver_allowance`).
   - **Phụ cấp neo xe / qua đêm (`detention_allowance`):** Tiền bồi dưỡng tài xế khi xe phải nằm bãi chờ bốc xếp hàng quá giờ quy định.
   - **Thưởng định mức nhiên liệu (`fuel_bonus`):** Thưởng tiết kiệm dầu diesel theo định mức lít quy định của tuyến đường.
3. **Phụ Cấp & Khen Thưởng:**
   - Phụ cấp ăn trưa (tối đa 730,000 đ/tháng được miễn thuế TNCN).
   - Phụ cấp điện thoại công vụ.
   - Thưởng KPI / Thưởng thành tích chuyến xe an toàn xuất sắc.

$$\textbf{TỔNG THU NHẬP (GROSS)} = \text{Lương Ngày} + \text{Lương Chuyến} + \text{Phụ Cấp} + \text{Thưởng KPI}$$

---

### 9.2. Cơ Chế Khấu Trừ Tự Động Tạm Ứng (Advance Deductions)
Khắc phục hoàn toàn tình trạng thất thoát quỹ tạm ứng đường dài của tài xế:
- **Nguồn 1 — Tạm ứng lương cá nhân:** Số tiền nhân viên tạm ứng tiêu dùng trong tháng (`Employee.current_advance`).
- **Nguồn 2 — Tạm ứng chuyến xe chưa hoàn ứng:** Quét toàn bộ các phiếu tạm ứng cấp 2 (`DriverTripAdvance`) của tài xế:
  * **Phiếu đã quyết toán (`SETTLED`):** Tài xế đã nộp đủ hóa đơn dầu, vé BOT và tiền thừa $\rightarrow$ **Không trừ vào lương**.
  * **Phiếu đang tạm ứng (`ADVANCED`):** Tài xế chưa nộp hóa đơn quyết toán hoặc còn nợ tiền ứng $\rightarrow$ **Tự động gom khấu trừ vào lương**.
$$\textbf{Tổng Tạm Ứng Bị Trừ} = \text{Tạm Ứng Lương} + \text{Tạm Ứng Chuyến Chưa Quyết Toán}$$

---

### 9.3. Trích Đóng Bảo Hiểm Bắt Buộc & Thuế TNCN Lũy Tiến
1. **Bảo hiểm xã hội, y tế, thất nghiệp:**
   - Phần Người lao động đóng: **10.5%** mức lương đóng BHXH (BHXH 8%, BHYT 1.5%, BHTN 1%). Mức lương trích đóng không vượt trần 46.8 triệu đồng.
   - Phần Doanh nghiệp đóng: **21.5%** BHXH/BHYT/BHTN + **2%** Kinh phí công đoàn = **23.5%** (hệ thống theo dõi riêng để báo cáo chi phí nhân sự tổng thể).
2. **Thuế Thu nhập Cá nhân (TNCN) theo biểu lũy tiến từng phần:**
   $$\text{Thu Nhập Chịu Thuế} = \text{Gross} - \text{Ăn Trưa (miễn tối đa 730k)} - \text{Điện Thoại} - \text{BHXH (10.5\%)}$$
   $$\text{Thu Nhập Tính Thuế} = \max\left(0, \text{Thu Nhập Chịu Thuế} - 11,000,000 - (\text{Số NPT} \times 4,400,000)\right)$$
   Áp dụng biểu thuế 7 bậc lũy tiến theo Luật Thuế Thu Nhập Cá Nhân. Nếu Thu nhập tính thuế $\le 0$ thì Thuế TNCN $= 0\text{ đ}$.

$$\textbf{THỰC LĨNH CHUYỂN KHOẢN (NET)} = \text{Gross} - \text{Bảo Hiểm (10.5\%)} - \text{Thuế TNCN} - \text{Khấu Trừ Tạm Ứng} - \text{Trừ Khác}$$

---

### 9.4. Hướng Dẫn Kế Toán Điều Chỉnh Bổ Sung & Khóa Sổ Trình Duyệt
1. Bấm nút **`Xem`** tại dòng phiếu lương của nhân viên cần điều chỉnh.
2. Tại màn hình chi tiết, nhập bổ sung: Thưởng KPI, Phụ cấp ăn trưa, hoặc các khoản phạt vi phạm (nếu có) ➔ Bấm nút **`Lưu Thay Đổi`**. Hệ thống sẽ tự động tính lại toàn bộ Gross, Thuế TNCN và Thực lĩnh Net ngay tức thì.
3. Khi toàn bộ bảng lương đã chuẩn xác, Kế toán bấm nút **`[Khóa Bảng Lương]`** (`LOCKED`). Bảng lương chuyển sang trạng thái đã chốt sổ, ngăn chặn việc sửa đổi số liệu trái phép và tự động gửi thông báo trình duyệt lên Ban Giám Đốc.

---

### 9.5. Hướng Dẫn Ban Giám Đốc Duyệt Chi Lương & Tự Động Sinh Sổ Quỹ
1. Ban Giám Đốc đăng nhập hệ thống, truy cập menu **`Nhân sự`** ➔ Tab **`Kỳ tính lương`**.
2. Kiểm tra tổng số nhân sự, tổng Gross, tổng chi phí BHXH và tổng Net cần chuyển khoản.
3. Bấm nút **`[Phê Duyệt & Chi Trả Lương]`** (`POST /api/personnel/periods/{id}/status/` với trạng thái `PAID`).
4. **Cơ chế Tích hợp Dòng tiền Tự động (Auto Cash Integration):**
   - Kỳ lương lập tức chuyển sang trạng thái **`PAID (Đã thanh toán)`**.
   - Hệ thống tự động khởi tạo ngay một **Phiếu Chi Sổ Quỹ (`CashTransaction`)** với:
     * **Mã chứng từ:** `PC-LUONG-YYYYMM` (Ví dụ: `PC-LUONG-202609`).
     * **Số tiền chi:** Khớp chính xác 100% với Tổng Thực Lĩnh Net toàn công ty.
     * **Đối tượng nhận tiền:** Toàn thể Cán bộ Công nhân viên Công ty.
     * **Diễn giải:** `Chi trả Lương Bảng lương Tháng MM/YYYY`.
     * **Trạng thái:** Tự động trừ vào quỹ khả dụng của doanh nghiệp và hạch toán vào Báo cáo Dòng tiền (P&L BI).

---

### 9.6. Hướng Dẫn Xuất Bảng Kê Ngân Hàng Chuyển Khoản Lô (Batch Banking)
1. Tại kỳ lương, bấm nút **`[Xuất File Ngân Hàng]`** (`/bank-export/`).
2. Hệ thống xuất ra bảng kê chi tiết dạng bảng và file Excel/CSV chuẩn UTF-8 BOM gồm:
   - Cột STT, Mã NV, Họ Tên, Tên Người Thụ Hưởng.
   - Số Tài Khoản Ngân Hàng, Tên Ngân Hàng (Vietcombank, Techcombank, MB, ACB, BIDV...).
   - Số Tiền Net chuyển khoản.
   - Nội Dung Chuyển Khoản chuẩn hóa: `TRIEN VO LOGISTICS TRA LUONG THANG MM/YYYY NV {MA_NV}`.
3. Kế toán chỉ cần tải file lên hệ thống Internet Banking Doanh nghiệp để thực hiện lệnh chuyển khoản lô 1 chạm.

---

### 9.7. Hướng Dẫn In Phiếu Lương A4/A5 & Tra Cứu Của Tài Xế
1. **In Phiếu Lương:** Tại dòng phiếu lương, bấm nút **`In`** (icon `fas fa-print`). Hệ thống mở giao diện in phẳng (Printable Payslip View) chuẩn khổ giấy A4/A5 gồm tiêu đề công ty, quốc huy, bảng kê thu nhập, các khoản giảm trừ và dòng ký xác nhận của Người lập biểu, Kế toán trưởng và Giám đốc.
2. **Tài Xế Tra Cứu:** Bác tài đăng nhập tài khoản cá nhân trên điện thoại để xem trực tiếp phiếu lương của mình: số ngày công, danh sách các chuyến xe đã chạy trong tháng, tiền tạm ứng bị trừ và số tiền thực nhận chuyển khoản.

---

## 10. Quy Chuẩn Thao Tác Bảng Dữ Liệu: Chuẩn 2 Nút Xem & In (Không Dùng Modal)

Để mang lại trải nghiệm chuyên nghiệp, mượt mà và trực quan nhất cho người sử dụng trên máy tính cũng như máy tính bảng, toàn bộ hệ thống BIM Logistics Platform được chuẩn hóa theo quy ước giao diện đồng bộ:

### 10.1. Cột Thao Tác Chuẩn 2 Nút Bấm
Trên mọi bảng danh mục và bảng dữ liệu vận hành (Khách hàng, Lệnh điều xe, Chuyến xe, Tạm ứng, Nhân sự, Hợp đồng, Bảng lương), cột **`Thao tác`** luôn bao gồm đúng **2 nút bấm trực quan**:
1. 👁️ **Nút `Xem` (Nút màu xanh lam hoặc xám viền):** Icon `fas fa-eye`. Bấm vào để điều hướng trực tiếp sang trang Chi tiết nghiệp vụ toàn màn hình.
2. 🖨️ **Nút `In` (Nút màu xanh lục/teal):** Icon `fas fa-print`. Bấm vào để mở bản in văn bản phẳng chuẩn A4/A5 (In Báo giá, Lệnh điều xe, Phiếu tạm ứng, Phiếu thu/chi, Phiếu lương).

### 10.2. Trang Chi Tiết Chuyên Biệt (Dedicated Full-Page View — Tuyệt Đối Không Dùng Modal)
- **Loại bỏ Modal Popup:** Không sử dụng các khung popup nhỏ (modal) để xem hay chỉnh sửa thông tin phức tạp vì dễ gây tràn màn hình, che khuất dữ liệu và khó thao tác trên thiết bị di động.
- **Thanh Công Cụ Đồng Bộ Trên Cùng (Standard Top Action Bar):**
  Khi bấm **`Xem`**, hệ thống chuyển sang trang giao diện chi tiết phẳng với thanh công cụ phía trên gồm đầy đủ các hành động nghiệp vụ:
  * ⬅️ **Nút `Quay lại` (`fas fa-arrow-left`):** Trở về bảng danh sách dữ liệu trước đó, giữ nguyên trạng thái tìm kiếm và bộ lọc đã chọn.
  * 💾 **Nút `Lưu Thay Đổi` (`fas fa-save`):** Lưu các thông tin sau khi chỉnh sửa dữ liệu trên biểu mẫu.
  * 🖨️ **Nút `In Chứng Từ` (`fas fa-print`):** In trực tiếp biểu mẫu tài liệu từ trang chi tiết.
  * 🗑️ **Nút `Xóa Mềm` (`fas fa-trash`):** Thực hiện xóa mềm an toàn (`is_deleted=True`), bảo toàn lịch sử truy vết pháp lý và audit log của doanh nghiệp.

