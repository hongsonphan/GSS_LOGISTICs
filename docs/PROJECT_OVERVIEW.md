# BIM LOGISTICS PLATFORM — TỔNG QUAN DỰ ÁN

> **Phiên bản:** 1.4.9  
> **Cập nhật:** 21/09/2026  
> **Trạng thái:** Production-Ready Demo  
> **Công ty:** Triền Võ Logistics (BIM Ecosystem)

---

## 1. GIỚI THIỆU

**BIM Logistics** là nền tảng Quản trị Vận tải & Chuỗi cung ứng (TMS — Transportation Management System) nội bộ được xây dựng đặc thù cho nghiệp vụ logistics container quốc tế và nội địa của Triền Võ Logistics.

### Mục tiêu cốt lõi
| Phân hệ | Mô tả |
|---|---|
| **TMS** | Điều phối xe, phân bổ tuyến, giám sát hành trình 10 bước thực tế |
| **Freight & Billing** | Tính cước cước vận tải, đối soát chi phí, quản lý hóa đơn điện tử |
| **Fleet Management** | Quản lý đội xe, đăng kiểm, bảo trì, phân loại xe nhà / xe bạn |
| **HR & Payroll** | Quản lý nhân sự, lương chuyến tạm tính theo sản lượng thực tế |
| **Sales & Booking** | Báo giá tuyến cước, tiếp nhận booking, CRM phễu khách hàng |
| **Customs Service** | Phân hệ dịch vụ Hải quan (phát triển sau) |
| **Management Dashboard** | Dashboard BGĐ: KPI chiến lược, biểu đồ xu hướng, P&L thời gian thực |

---

## 2. KIẾN TRÚC HỆ THỐNG

### Stack Công nghệ
```
Backend:    Django 4.x + Django REST Framework
Database:   PostgreSQL 16 (Docker) / SQLite3 (Development)
Frontend:   Vanilla JS ES6+ + Tailwind CSS 3 (CDN)
Charts:     Chart.js 4 (Line, Bar, Doughnut)
Icons:      Phosphor Icons
Fonts:      Plus Jakarta Sans (Body) + Be Vietnam Pro (Heading)
Container:  Docker + docker-compose
Port:       8085 (Web) | 5435 (DB)
```

### Mô hình Kiến trúc
```
BIM Logistics — Modular Monolith
├── Single Page Application (SPA) — Không reload trang
├── REST API Backend (Django REST Framework)
├── PostgreSQL Database (Docker)
└── Tích hợp BIM ERP Ecosystem
```

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```
e:/Bim_Logistics/
├── apps/                          # Các phân hệ nghiệp vụ
│   ├── billing/                   # Chi phí & Đối soát
│   ├── customers/                 # Khách hàng, Báo giá, Booking
│   ├── dispatch/                  # Điều vận & API chính
│   ├── documents/                 # Chứng từ số & OCR
│   ├── exceptions/                # Xử lý sự cố OS&D
│   ├── fleet/                     # Quản lý đội xe
│   └── personnel/                 # Nhân sự & Tiền lương
├── core/                          # Nền tảng dùng chung
│   ├── models.py                  # BaseModel, TimeStampedModel, SoftDeleteModel
│   ├── workflows.py               # State Machine Engine
│   ├── tests.py                   # Automated Test Suite
│   └── management/commands/
│       └── seed_data.py           # Dữ liệu mẫu thực tế
├── docs/                          # Tài liệu đặc tả (Documentation-as-Code)
│   ├── PROJECT_OVERVIEW.md        # File này
│   ├── FEATURES.md                # Tất cả tính năng đã xây dựng
│   ├── UI_UX_GUIDELINES.md        # Nguyên tắc giao diện & UX
│   ├── API_REFERENCE.md           # Tài liệu REST API đầy đủ
│   ├── DATABASE_SCHEMA.md         # Sơ đồ CSDL & ORM
│   ├── OPERATIONAL_WORKFLOW.md    # Quy trình điều vận 10 bước
│   ├── EXPENSE_LIFECYCLE_BUSINESS_ANALYSIS.md # Vòng đời chi phí hiện trường
│   └── CHANGELOG.md               # Nhật ký thay đổi phiên bản
├── static/
│   ├── css/main.css               # Design System & Tokens
│   └── js/app.js                  # Toàn bộ SPA JavaScript
├── templates/
│   ├── base.html                  # Khung HTML chính (SPA shell)
│   ├── index.html                 # Entry point
│   ├── components/                # Modals, Sidebar, Topbar
│   │   ├── sidebar.html
│   │   ├── topbar.html
│   │   ├── modal_quotation.html
│   │   ├── modal_booking.html
│   │   ├── modal_create_trip.html
│   │   └── modal_ocr.html
│   └── views/                     # Giao diện từng phân hệ
│       ├── view_dashboard.html
│       ├── view_sales.html
│       ├── view_dispatch.html
│       ├── view_trip_detail.html
│       ├── view_accounting.html
│       ├── view_fleet.html
│       ├── view_personnel.html
│       └── view_customs.html
├── AGENTS.md                      # Quy tắc hành vi AI Agent
├── CODING_STANDARDS.md            # Chuẩn kỹ thuật toàn dự án
├── GEMINI.md                      # Chỉ thị bắt buộc cho AI
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

---

## 4. PHÂN HỆ & TÍNH NĂNG TỔNG QUAN

| Phân hệ | File Template | URL Sidebar | Trạng thái |
|---|---|---|---|
| Dashboard BGĐ | `view_dashboard.html` | `/` (mặc định) | ✅ Hoàn thành |
| Sale & Booking | `view_sales.html` | `#sales` | ✅ Hoàn thành |
| Điều vận | `view_dispatch.html` | `#dispatch` | ✅ Hoàn thành |
| Chi tiết Chuyến xe | `view_trip_detail.html` | (Modal) | ✅ Hoàn thành |
| Quản lý Kế toán | `view_accounting.html` | `#accounting` | ✅ Hoàn thành |
| Xe & Bãi | `view_fleet.html` | `#fleet` | ✅ Hoàn thành |
| Hành chính & Nhân sự | `view_personnel.html` | `#personnel` | ✅ Hoàn thành |
| Dịch vụ Hải quan | `view_customs.html` | `#customs` | 🔄 Phát triển sau |

---

## 5. QUY TẮC ĐẶC BIỆT

### No Hard-Delete (Bất Khả Xâm Phạm)
> Mọi bản ghi vận đơn, chi phí, chứng từ POD là chứng cứ pháp lý. **Tuyệt đối không dùng `.delete()`**. Chỉ dùng `is_deleted = True` (Soft-Delete).

### Zero Variance (Không Chênh Lệch)
> Số tổng hợp P&L phải **luôn bằng** tổng đại số của các dòng chi tiết. Mọi sai lệch giữa bảng kê và ô tổng hợp đều là bug nghiêm trọng.

### State Machine (Máy Trạng Thái)
> Vòng đời chuyến xe phải đi theo đúng thứ tự `DRAFT → DISPATCHED → ACCEPTED → ... → COMPLETED`. Không cho phép nhảy cóc.

---

## 6. LIÊN KẾT TÀI LIỆU

- [Tính năng đã xây dựng](FEATURES.md)
- [Nguyên tắc UI/UX](UI_UX_GUIDELINES.md)
- [Tài liệu API đầy đủ](API_REFERENCE.md)
- [Sơ đồ cơ sở dữ liệu](DATABASE_SCHEMA.md)
- [Quy trình nghiệp vụ điều vận](OPERATIONAL_WORKFLOW.md)
- [Vòng đời chi phí hiện trường](EXPENSE_LIFECYCLE_BUSINESS_ANALYSIS.md)
- [Chuẩn kỹ thuật lập trình](../CODING_STANDARDS.md)
- [Nhật ký thay đổi phiên bản](CHANGELOG.md)
