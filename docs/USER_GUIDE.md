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
- [PHẦN II: HƯỚNG DẪN CÀI ĐẶT 14 DANH MỤC GỐC (MASTER DATA)](#phần-ii-hướng-dẫn-cài-đặt-14-danh-mục-gốc-master-data)
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
  - [11. Thầu Phụ & Nhà Cung Cấp 3PL (Subcontractors & Suppliers)](#11-thầu-phụ--nhà-cung-cấp-3pl-subcontractors--suppliers)
  - [12. Khoản Mục Chi Phí Vận Tải (Expense Catalog)](#12-khoản-mục-chi-phí-vận-tải-expense-catalog)
  - [13. Quy Cách Vỏ Container & Thùng Xe (Container Specifications)](#13-quy-cách-vỏ-container--thùng-xe-container-specifications)
  - [14. Số Dư Ban Đầu Kế Toán (Opening Balances)](#14-số-dư-ban-đầu-kế-toán-opening-balances)
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
  - [10. Hướng Dẫn Thao Tác Bảng Dữ Liệu & Màn Hình Chi Tiết](#10-hướng-dẫn-thao-tác-bảng-dữ-liệu--màn-hình-chi-tiết)
  - [11. Bảng Theo Dõi Task & Quản Lý Giao Việc Văn Phòng (Office Tasks)](#11-bảng-theo-dõi-task--quản-lý-giao-việc-văn-phòng-office-tasks)
  - [12. Bảng Thông Báo & Bản Tin Nội Bộ (Đính Kèm & Xem Trước)](#12-bảng-thông-báo--bản-tin-nội-bộ-đính-kèm--xem-trước)
  - [13. Tính Năng Chat Trực Tiếp (Floating Chat) & Chuông Thông Báo](#13-tính-năng-chat-trực-tiếp-floating-chat--chuông-thông-báo)
  - [14. Cổng Thông Tin Dành Cho Bác Tài (Driver Mobile Portal)](#14-cổng-thông-tin-dành-cho-bác-tài-driver-mobile-portal)
  - [15. Cổng Tra Cứu Hành Trình Đơn Hàng Công Khai (Public Tracking Portal)](#15-cổng-tra-cứu-hành-trình-đơn-hàng-công-khai-public-tracking-portal)
  - [16. Biểu Đồ Tùy Biến (Dashboard Pivot Chart Builder)](#16-biểu-đồ-tùy-biến-dashboard-pivot-chart-builder)
- [PHẦN IV: HỎI ĐÁP & XỬ LÝ SỰ CỐ THƯỜNG GẶP (Q&A / TROUBLESHOOTING)](#phần-iv-hỏi-đáp--xử-lý-sự-cố-thường-gặp-qa--troubleshooting)
  - [Q1. Ô Xe/Tài xế bị trống khi tạo lệnh điều xe](#q1-khi-tạo-lệnh-điều-xe-mới-tại-sao-ô-đầu-kéo-xe-tải-hoặc-ô-tài-xế-bị-trống-không-chọn-được)
  - [Q2. Phân biệt 3 nút: Chi phí TVL, TVL chi hộ, 3PL chi hộ](#q2-phân-biệt-và-sử-dụng-đúng-3-nút-phân-loại-chi-phí-chi-phí-tvl-tvl-chi-hộ-và-3pl-chi-hộ)
  - [Q3. Điểm khóa xóa dữ liệu đã phát sinh](#q3-tại-sao-khi-bấm-nút-xóa-khách-hàng--xe-tải--khoản-mục-chi-thì-hệ-thống-cảnh-báo-đỏ-và-không-cho-xóa)
  - [Q4. In Báo giá, Lệnh xe, Phiếu thu chi chuẩn A4/A5](#q4-làm-thế-nào-để-in-báo-giá-lệnh-điều-xe-phiếu-thuchi-ra-giấy-a4a5-sạch-đẹp-chuẩn-lề)
  - [Q5. Xử lý mất vé BOT hoặc quên chụp POD](#q5-xử-lý-thế-nào-khi-tài-xế-làm-mất-vé-cầu-đường-bot-hoặc-quên-chụp-ảnh-biên-bản-giao-nhận-pod)
  - [Q6. Ẩn/hiện & đổi thứ tự cột trên bảng dữ liệu](#q6-tôi-muốn-ẩnhiện-hoặc-kéo-thả-đổi-vị-trí-cột-trên-bảng-dữ-liệu-thì-làm-thế-nào)
  - [Q7. Nhập hàng loạt từ Excel không trùng mã](#q7-nhập-hàng-loạt-danh-mục-từ-file-excel-như-thế-nào-để-không-bị-lỗi-trùng-mã-hoặc-sai-định-dạng)
  - [Q8. Cách tính lương chuyến & thưởng dầu](#q8-lương-chuyến-và-thưởngphạt-dầu-của-bác-tài-được-hệ-thống-tự-động-tính-toán-dựa-trên-những-yếu-tố-nào)
  - [Q9. Khi nào dùng Chat nội bộ và khi nào dùng Giao việc (Tasks)?](#q9-khi-nào-nên-dùng-khung-chat-nội-bộ-và-khi-nào-nên-dùng-chức-năng-giao-việc-tasks)
  - [Q10. Xử lý khi báo không có quyền truy cập chức năng](#q10-xử-lý-thế-nào-khi-màn-hình-hiển-thị-thông-báo-bạn-không-có-quyền-truy-cập-chức-năng-này)

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

# PHẦN II: HƯỚNG DẪN CÀI ĐẶT 14 DANH MỤC GỐC (MASTER DATA)

---

## 1. Khai Báo Hệ Thống / Hồ Sơ Doanh Nghiệp (Company Profile)
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Khai Báo Ban Đầu`** ➔ Chọn tab **`Thông Tin Công Ty`** ➔ Bấm nút **`Sửa Thông Tin Công Ty`** (hoặc **`Hiệu Chỉnh Khai Báo Hệ Thống`**).
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Khai Báo Ban Đầu`** ➔ Chọn tab **`Vai Trò & Phân Quyền`** ➔ Cấu hình ma trận quyền và bấm nút **`Lưu`**.
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Tài Chính & Quản Trị`** ➔ Chọn tab **`Biểu Phí Lương Chuyến`** ➔ Bấm nút **`Tạo mới`**.
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Tài Chính & Quản Trị`** ➔ Chọn tab **`Phụ Cấp & Kiểm Hóa`** ➔ Bấm nút **`Tạo mới`**.
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Mạng Lưới & Địa Điểm`** ➔ Chọn tab **`Cảng & Kho Bãi`** ➔ Bấm nút **`Tạo mới`**.
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Khách Hàng & Đối Tác`** ➔ Chọn tab **`Biểu Cước Khách`** ➔ Bấm nút **`Tạo mới`**.
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Khách Hàng & Đối Tác`** ➔ Chọn tab **`Khách Hàng`** ➔ Bấm nút **`Tạo mới`**.
- **Mục đích:** Quản lý hồ sơ đối tác chủ hàng, nhà máy xuất nhập khẩu và các công ty logistics giao dịch.
- **Các trường thông tin chi tiết:**
  * **Mã Khách Hàng (`*`):** Mã hệ thống tự động hoặc thủ công viết hoa không dấu (Ví dụ: `KH001`, `SAMSUNG`, `VINFAST`, `THP_GROUP`).
  * **Tên Viết Tắt (`short_name`):** Tên thương hiệu ngắn gọn (Ví dụ: `HHP`, `SAMSUNG`, `TRIỀN VÕ`), được hiển thị thành một **cột riêng biệt** trên bảng dữ liệu dưới dạng văn bản chuẩn mực, rõ ràng và có thể tùy biến ẩn/hiện hoặc đổi thứ tự.
  * **Tên Doanh Nghiệp Đầy Đủ (`*`):** Tên công ty pháp lý (Ví dụ: `CÔNG TY TNHH VẬT LIỆU XÂY DỰNG HOÀNG HẢI PHÁT`). Cột này được trình bày độc lập, rõ ràng, không bị lồng badge viết tắt.
  * **Mã Số Thuế (`*`):** MST 10 hoặc 13 số bắt buộc để phục vụ xuất hóa đơn điện tử hợp lệ.
  * **Địa Chỉ Trụ Sở Doanh Nghiệp (`*`):** Địa chỉ ghi trên giấy phép ĐKKD.
  * **Người Liên Hệ & Số Điện Thoại:** Tên người liên hệ kèm số điện thoại liên lạc.
  * **Số Biểu Cước Đang Áp Dụng:** Số lượng tuyến cước liên kết với khách hàng.
  * **Ghi Chú:** Các yêu cầu giao nhận đặc thù.
- **Tính năng Tùy Biến Cột (Universal Column Manager):**
  * Bấm nút **`Cột`** trên thanh công cụ để mở bảng **"Tùy Chỉnh Cột Hiển Thị (9/9)"**.
  * Dễ dàng **Ẩn/Hiện** bất kỳ cột nào bằng Checkbox (cột *Tên Viết Tắt*, *Địa Chỉ*, *Ghi Chú*...).
  * **Thay đổi thứ tự cột:** Bấm mũi tên Lên/Xuống hoặc dùng chuột **Kéo & Thả (Drag & Drop)** để xếp thứ tự cột theo ý muốn.
  * **Khôi phục mặc định:** Bấm nút **"Khôi Phục Mặc Định"** để đưa cấu hình về chuẩn 9 cột ban đầu bất cứ lúc nào.
- **Thao tác lưu:** Kiểm tra kỹ mã số thuế ➔ Bấm nút **`Lưu`**.

---

## 8. Hãng Tàu Biển (Shipping Lines)
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Mạng Lưới & Địa Điểm`** ➔ Chọn tab **`Hãng Tàu`** ➔ Bấm nút **`Tạo mới`**.
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Phương Tiện & Thiết Bị`** ➔ Chọn tab **`Đầu Kéo & Xe`** ➔ Bấm nút **`Tạo mới`**.
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Phương Tiện & Thiết Bị`** ➔ Chọn tab **`Rơ-Moóc`** ➔ Bấm nút **`Tạo mới`**.
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

## 11. Thầu Phụ & Nhà Cung Cấp 3PL (Subcontractors & Suppliers)
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Khách Hàng & Đối Tác`** ➔ Chọn tab **`Thầu Phụ & Nhà Cung Cấp`** ➔ Bấm nút **`Tạo mới`**.
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Tài Chính & Quản Trị`** ➔ Chọn tab **`Khoản Mục Chi`** ➔ Bấm nút **`Tạo mới`**.
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
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Phương Tiện & Thiết Bị`** ➔ Chọn tab **`Quy Cách Cont & Xe`** ➔ Bấm nút **`Tạo mới`**.
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

## 14. Số Dư Ban Đầu Kế Toán (Opening Balances)
- **Nơi thực hiện:** Vào menu **`Cài đặt`** ➔ **`Tài Chính & Quản Trị`** ➔ Chọn tab **`Số Dư Ban Đầu`** ➔ Bấm nút **`Khai Báo Số Dư Đầu Kỳ`** (hoặc **`Tạo mới`**).
- **Mục đích:** Khai báo số dư tiền mặt tại két và số dư tài khoản ngân hàng tại thời điểm doanh nghiệp bắt đầu đưa phần mềm vào vận hành chính thức.
- **Các trường thông tin chi tiết:**
  * **Loại Quỹ / Tài Khoản (`*`):** Chọn `Tiền Mặt Tại Quỹ` hoặc `Tài Khoản Ngân Hàng Doanh Nghiệp`.
  * **Số Dư Khởi Tạo (`*`) (VNĐ):** Nhập số dư thực tế theo sổ quỹ tiền mặt hoặc sao kê số dư tài khoản ngân hàng.
  * **Ngày Khóa Sổ / Bắt Đầu Áp Dụng (`*`):** Ngày chốt số dư làm căn cứ tính toán lũy kế thu chi.
  * **Ghi Chú Xác Nhận:** Số biên bản kiểm kê quỹ tiền mặt hoặc chứng từ xác nhận số dư tài khoản.
- **Thao tác lưu:** Nhập chính xác số dư đối soát ➔ Bấm nút **`Lưu`**.

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

## 10. Hướng Dẫn Thao Tác Bảng Dữ Liệu & Màn Hình Chi Tiết

Trên tất cả các bảng dữ liệu vận hành của hệ thống (Khách hàng, Lệnh điều xe, Chuyến xe, Tạm ứng, Nhân sự, Hợp đồng, Bảng lương...), các nút chức năng được thiết kế đồng bộ giúp bạn dễ dàng theo dõi, chỉnh sửa và in ấn chứng từ:

### 10.1. Thao Tác Nhanh Trên Bảng Danh Sách: Nút [Xem] & Nút [In]
Tại mỗi dòng dữ liệu trên bảng, cột **`Thao tác`** cung cấp 2 nút bấm trực quan:
1. 👁️ **Nút `Xem`:** Bấm vào để mở màn hình chi tiết toàn diện của bản ghi. Màn hình chi tiết hiển thị đầy đủ mọi trường thông tin, các chứng từ liên quan, lịch sử hành trình và tiến độ xử lý giúp bạn nắm bắt trọn vẹn nghiệp vụ.
2. 🖨️ **Nút `In`:** Bấm vào để mở ngay cửa sổ xem trước và in tài liệu (Báo giá, Lệnh điều xe, Phiếu tạm ứng, Phiếu thu/chi, Phiếu lương) theo mẫu chuẩn A4/A5 để ký duyệt hoặc bàn giao.

### 10.2. Thao Tác Trên Màn Hình Chi Tiết
Khi bạn bấm nút **`Xem`** để vào màn hình chi tiết, thanh công cụ phía trên cung cấp các nút thao tác nghiệp vụ:
* ⬅️ **Nút `Quay lại`:** Trở về bảng danh sách dữ liệu trước đó, vẫn giữ nguyên từ khóa tìm kiếm và bộ lọc đang áp dụng.
* ✏️ **Nút `Sửa`:** Mở khóa các ô nhập liệu trên biểu mẫu để bạn cập nhật hoặc bổ sung thông tin.
* 💾 **Nút `Lưu`:** Lưu lại các nội dung vừa chỉnh sửa vào cơ sở dữ liệu hệ thống.
* 🖨️ **Nút `In`:** In trực tiếp tài liệu hoặc văn bản từ màn hình chi tiết.
* 🗑️ **Nút `Xóa`:** Xóa bản ghi (chỉ thực hiện được khi bạn có quyền hạn và dữ liệu chưa phát sinh các giao dịch ràng buộc liên quan nhằm đảm bảo an toàn dữ liệu).



---

## 11. Bảng Theo Dõi Task & Quản Lý Giao Việc Văn Phòng (Office Tasks)

Hệ thống cung cấp không gian làm việc số tích hợp giúp các phòng ban (Điều vận, CSKH, Kế toán, Kỹ thuật bãi) giao việc và kiểm soát tiến độ không bị trôi việc:
- **Tạo Task Mới:** Nhập tiêu đề, phân loại ưu tiên (Khẩn cấp, Cao, Trung bình, Thấp), hạn chót (Due date).
- **Phân bổ nhân sự:** Chọn 1 người chịu trách nhiệm chính (**Assignee**) và nhiều người theo dõi (**Followers**). Khi có bình luận mới hoặc thay đổi trạng thái, tất cả thành viên theo dõi đều nhận thông báo chuông tức thời.
- **Xem Dạng Bảng Kanban Trực Quan:** Kéo thả thẻ công việc giữa 4 cột trạng thái: `Mới tiếp nhận` ➔ `Đang thực hiện` ➔ `Chờ nghiệm thu / Review` ➔ `Hoàn thành`.
- **Checklist Công Việc Con:** Tạo danh sách các đầu việc con cần hoàn thành trước khi chốt nghiệm thu task.

---

## 12. Bảng Thông Báo & Bản Tin Nội Bộ (Đính Kèm & Xem Trước)

Kênh truyền thông chính thức của ban lãnh đạo tới toàn thể cán bộ nhân viên:
- **Đăng Bản Tin:** Ban Giám Đốc hoặc Hành chính nhân sự đăng thông báo kèm mức độ ưu tiên (Thông báo chung, Khẩn cấp, Quy định nội bộ).
- **Hỗ Trợ Đính Kèm Đa Định Dạng:** Đính kèm file PDF, Word, Excel, hình ảnh chứng từ.
- **Xem Trước Tài Liệu Trực Tiếp (Document Previewer):** Người đọc chỉ cần bấm vào tệp đính kèm để xem trước tài liệu trực tiếp trên trình duyệt mà không cần tải về máy tính.
- **Ghi Nhận Lượt Đọc (Read Tracking):** Hệ thống tự động ghi nhận nhân viên nào đã đọc thông báo, thời gian đọc giúp quản lý nắm bắt độ lan tỏa của chính sách.

---

## 13. Tính Năng Chat Trực Tiếp (Floating Chat) & Chuông Thông Báo

- **Cửa Sổ Chat Nổi (Floating Chat Bubble):** Xuất hiện ở góc dưới bên phải mọi màn hình làm việc, cho phép nhắn tin tức thời giữa các cá nhân hoặc theo nhóm điều phối mà không làm gián đoạn công việc đang làm dở.
- **Gửi Tệp & Ảnh Hiện Trường:** Hỗ trợ gửi ảnh tình trạng kẹt cảng, ảnh seal, vị trí kho nhanh chóng.
- **Trạng Thái Hoạt Động (Online/Offline):** Chấm xanh báo hiệu đồng nghiệp đang trực tuyến sẵn sàng phản hồi.
- **Chuông Thông Báo Thông Minh:** Tự động reo chuông và hiển thị badge đỏ khi có Lệnh điều xe mới, Báo giá được duyệt, Khoản chi được duyệt hoặc có tin nhắn mới gửi đến bạn.

---

## 14. Cổng Thông Tin Dành Cho Bác Tài (Driver Mobile Portal)

Thiết kế chuyên biệt cho điện thoại thông minh, không cần cài app, chạy mượt trên trình duyệt điện thoại:
1. **Truy Cập Nhanh:** Mở link chuyến xe nhận qua tin nhắn Zalo/SMS hoặc quét mã QR trên Lệnh điều xe giấy.
2. **Cập Nhật 6 Mốc Hành Trình Bằng 1 Chạm:**
   - *Mốc 1:* Nhận lệnh & Xuất bến
   - *Mốc 2:* Đến cảng / Kho lấy rỗng
   - *Mốc 3:* Đã lấy rỗng & Gắn Seal (Nhập số Seal, số Cont)
   - *Mốc 4:* Đang vận chuyển (In Transit)
   - *Mốc 5:* Đã đến điểm giao nhận
   - *Mốc 6:* Đã giao xong & Ký nhận POD
3. **Chụp Ảnh Biên Bản Giao Nhận (POD) & Phiếu Nâng Hạ (EIR):** Chụp trực tiếp từ camera điện thoại, ảnh tự nén dung lượng nhẹ gửi về trung tâm trong < 2 giây.
4. **Kê Khai Chi Phí Phát Sinh Với 3 Nút Bấm:**
   - 🟢 **`Chi phí TVL`:** Khoản công ty chịu (BOT, cân xe, dầu, sửa lốp).
   - 🟡 **`TVL chi hộ`:** Khoản công ty ứng trước cho khách hàng (Phí nâng hạ hãng tàu, cược cont, rửa cont).
   - 🔴 **`3PL chi hộ`:** Khoản tài xế xe bạn (thầu phụ) tự chi trước để cấn trừ tiền cước.

---

## 15. Cổng Tra Cứu Hành Trình Đơn Hàng Công Khai (Public Tracking Portal)

Dành cho Khách hàng và Chủ hàng theo dõi tiến độ đơn hàng 24/7 không cần tài khoản đăng nhập:
1. **Truy Cập:** Vào đường dẫn công khai `/tracking/` hoặc quét mã QR in trên Báo giá/Hợp đồng.
2. **Tra Cứu:** Nhập Mã đơn hàng (VD: `SO-202610-001`), Mã chuyến xe hoặc Số Container / Seal ➔ Bấm `[Tra cứu hành trình]`.
3. **Thông Tin Hiển Thị:**
   - Thanh tiến trình 6 mốc vận chuyển thời gian thực.
   - Nơi lấy hàng, nơi giao hàng, số hiệu phương tiện.
   - Xem trước ảnh biên bản giao nhận có chữ ký (POD Preview) sau khi giao xong.
   - **Bảo mật tuyệt đối:** Ẩn toàn bộ chi phí nội bộ, cước mua thầu phụ và thông tin cá nhân tài xế.

---

## 16. Biểu Đồ Tùy Biến (Dashboard Pivot Chart Builder)

Công cụ phân tích dữ liệu trực quan cho Ban Giám Đốc và Trưởng phòng ban:
- **5 Bước Cấu Hình:** Chọn nguồn dữ liệu ➔ Chọn loại biểu đồ (Cột, Đường, Tròn, Miền) ➔ Chọn trục phân nhóm (Khách hàng, Lái xe, Tuyến đường...) ➔ Chọn chỉ số đo lường (Doanh thu, Lợi nhuận gộp, Số chuyến) ➔ Chọn khoảng thời gian.
- **Xem Trước Trực Tiếp (Live Preview):** Hệ thống vẽ biểu đồ ngay khi bạn chọn thông số, kèm bảng tỷ trọng phân bổ (%).
- **Áp Dụng Lên Dashboard:** Tự động lưu cấu hình theo tài khoản người dùng và duy trì trên Dashboard màn hình chính.

---

# PHẦN IV: HỎI ĐÁP & XỬ LÝ SỰ CỐ THƯỜNG GẶP (Q&A / TROUBLESHOOTING)

### Q1. Khi tạo Lệnh điều xe mới, tại sao ô "Đầu kéo/ Xe tải" hoặc ô "Tài xế" bị trống không chọn được?
- **Nguyên nhân:** Hệ thống áp dụng cơ chế lọc thông minh 2 trường độc lập:
  * Nếu chọn `Xe nhà TVL`: Dropdown chỉ hiển thị xe thuộc sở hữu công ty và tài xế nội bộ đang có trạng thái `Sẵn sàng` (chưa bận chuyến khác).
  * Nếu chọn `Xe thuê ngoài (3PL)`: Dropdown chỉ hiển thị phương tiện và tài xế đã được khai báo thuộc đơn vị thầu phụ đó.
- **Cách xử lý:** Kiểm tra lại ô Nguồn phương tiện. Nếu xe hoặc tài xế mới chưa có tên, vào menu `Cài đặt ➔ Phương tiện & Thiết bị` hoặc `Nhân sự` để khai báo bổ sung.

---

### Q2. Phân biệt và sử dụng đúng 3 nút phân loại chi phí: "Chi phí TVL", "TVL chi hộ" và "3PL chi hộ"?
| Nút Phân Loại | Bản Chất Dòng Tiền | Hạch Toán Kế Toán | Ví Dụ Thực Tế |
|---|---|---|---|
| **Chi phí TVL** | Công ty chịu 100% | Tính vào Giá vốn chuyến xe (COGS) | Vé cầu đường BOT, Cân xe, Dầu máy |
| **TVL chi hộ** | Công ty ứng trước thay khách hàng | Xuất Debit Note thu lại 100% từ khách hàng | Phí cược cont, nâng hạ cảng, rửa cont |
| **3PL chi hộ** | Tài xế xe bạn (thầu phụ) tự chi | Cấn trừ vào công nợ chuyến xe của thầu phụ | Thầu phụ tự chi phí bốc xếp, lưu ca |

---

### Q3. Tại sao khi bấm nút [Xóa] Khách hàng / Xe tải / Khoản mục chi thì hệ thống cảnh báo đỏ và không cho xóa?
- **Cơ chế khóa bảo toàn dữ liệu (Audit Trail Protection):** Khi một danh mục đã từng phát sinh ít nhất 1 chứng từ (Báo giá, Booking, Chuyến xe, Phiếu thu/chi), hệ thống **khóa cứng quyền xóa** để bảo vệ tính toàn vẹn của sổ sách kế toán và hồ sơ pháp lý.
- **Hướng xử lý chuẩn:** Bấm nút **[Sửa]** và chuyển trạng thái đối tượng sang `Ngừng hoạt động (Inactive)`. Đối tượng sẽ biến mất khỏi các dropdown chọn mới nhưng toàn bộ dữ liệu lịch sử vẫn được bảo toàn.

---

### Q4. Làm thế nào để in Báo giá, Lệnh điều xe, Phiếu thu/chi ra giấy A4/A5 sạch đẹp, chuẩn lề?
Khi bấm nút **[In]**, kiểm tra 4 thông số trong hộp thoại in của trình duyệt (Chrome/Edge):
1. **Khổ giấy:** Chọn `A4` (cho Báo giá, Lệnh xe, Phiếu lương) hoặc `A5` (cho Phiếu thu/chi).
2. **Hướng giấy:** Chọn `Portrait (Dọc)` cho văn bản; chọn `Landscape (Ngang)` cho bảng báo cáo nhiều cột.
3. **Lề (Margins):** Chọn `Default` hoặc `Custom` 10mm.
4. **Đồ họa nền (Background graphics) - BẮT BUỘC:** Tích chọn ô này để in đầy đủ màu logo, viền bảng và các badge trạng thái.

---

### Q5. Xử lý thế nào khi tài xế làm mất vé cầu đường (BOT) hoặc quên chụp ảnh biên bản giao nhận POD?
- **Vé BOT mất:** Điều phối viên tra cứu báo cáo GPS và trích xuất hóa đơn điện tử từ tài khoản giao thông (VETC / ePass) nộp làm chứng từ thay thế cho Kế toán.
- **POD quên chụp:** Liên hệ ngay thủ kho bên nhận xin chụp lại biên bản gửi qua Zalo/Email, sau đó mở màn hình chi tiết chuyến xe trên máy tính bấm nút **[Tải ảnh POD bổ sung]**.

---

### Q6. Tôi muốn ẩn/hiện hoặc kéo thả đổi vị trí cột trên bảng dữ liệu thì làm thế nào?
1. Bấm nút **[Cột]** ở góc trên bên phải bảng dữ liệu.
2. Bỏ dấu tích ở các cột không cần theo dõi.
3. Kéo thả biểu tượng `⋮⋮` để đổi thứ tự cột theo ý muốn.
4. Bấm **[Lưu cấu hình]**. Trình duyệt sẽ ghi nhớ cấu hình riêng cho tài khoản của bạn.

---

### Q7. Nhập hàng loạt danh mục từ file Excel như thế nào để không bị lỗi trùng mã hoặc sai định dạng?
1. Vào menu `Cài đặt ➔ Danh mục cần nhập` ➔ Bấm **[Nhập Excel]**.
2. Bấm **[Tải file mẫu Excel (.xlsx)]** để lấy cấu trúc chuẩn.
3. Điền dữ liệu: Ngày tháng định dạng `YYYY-MM-DD`, số điện thoại để dạng Text, Mã số không trùng lặp.
4. Tải file lên và kiểm tra bảng Xem trước (Preview). Nếu không có dòng đỏ thì bấm **[Xác nhận nhập dữ liệu]**.

---

### Q8. Lương chuyến và thưởng/phạt dầu của Bác tài được hệ thống tự động tính toán dựa trên những yếu tố nào?
- **Lương chuyến:** = [Lương khoán tuyến theo Biểu phí] + [Phụ cấp kiểm hóa/hạ cont] + [Lưu ca nếu có].
- **Định mức dầu tiêu chuẩn:** = [Số km vận hành GPS] × [Định mức xe (lít/100km)].
- **Thưởng/Phạt dầu:** = ([Định mức tiêu chuẩn] - [Lít dầu thực đổ]) × [Đơn giá dầu]. Tiết kiệm được thưởng cộng vào lương; hao hụt vượt định mức bị trừ vào lương.

---

### Q9. Khi nào nên dùng khung "Chat Nội Bộ" và khi nào nên dùng chức năng "Giao Việc" (Tasks)?
- Dùng **Chat Nội Bộ** khi: Trao đổi nhanh, thông báo kẹt cảng, gửi ảnh tức thời, thảo luận việc tức thì.
- Dùng **Giao Việc (Tasks)** khi: Công việc có người phụ trách (Assignee), người theo dõi (Followers), hạn chót hoàn thành (Due date) và checklist công việc con cần nghiệm thu.

---

### Q10. Xử lý thế nào khi màn hình hiển thị thông báo "Bạn không có quyền truy cập chức năng này"?
- **Nguyên nhân:** Tài khoản của bạn thuộc vai trò (Role) không được cấp quyền cho tính năng này.
- **Cách xử lý:** Liên hệ Quản trị viên hệ thống (Admin) hoặc Trưởng bộ phận. Admin truy cập `Cài đặt ➔ Vai trò & Phân quyền` để kích hoạt thêm quyền cho chức danh của bạn chỉ trong 30 giây.
