# BIM LOGISTICS PLATFORM
# AI_CONTEXT.md

Version: 1.0  
Last Updated: 2026-09-21  
Status: Approved  

> [!IMPORTANT]
> **MANDATORY INSTRUCTION FOR AGENTS:**
> Trước khi thực hiện bất kỳ thay đổi nào trong dự án, Agent bắt buộc phải đọc và tuân thủ [AGENTS.md](file:///E:/Bim_Logistics/AGENTS.md) và [CODING_STANDARDS.md](file:///E:/Bim_Logistics/CODING_STANDARDS.md) tại thư mục gốc của dự án.

---

# PROJECT IDENTITY
BIM LOGISTICS là nền tảng Quản trị Vận tải & Chuỗi cung ứng nội bộ và đa phương thức (Modular Monolith Logistics Platform).
Mục tiêu cốt lõi:
- **TMS (Transportation Management):** Điều phối xe, tối ưu chuyến, lập lộ trình, giám sát hành trình thời gian thực.
- **WMS (Warehouse Management):** Quản lý kho bãi, phân bổ vị trí bin/rack, quản lý nhập - xuất - tồn.
- **Freight & Billing:** Tính cước theo CBM/Gross Weight, đối soát chứng từ, quản lý phụ phí.
- **Exception Management (OS&D):** Xử lý sự cố giao hàng hỏng hóc, thiếu hụt, giao trễ và khiếu nại bồi thường.
- **Hệ sinh thái BIM:** Tích hợp chặt chẽ với HRM & Kế toán của `Bim_ERP-Solutions` và quy trình bàn giao SOP của `Bim_Consulting`.

---

# CORE PHILOSOPHY
- **Field & Business First:** Mọi kiến trúc và UI đều phục vụ độ tin cậy vận hành của tài xế, điều vận và thủ kho.
- **Modular Monolith:** Tách bạch Core (nền tảng chung) và Apps nghiệp vụ (Fleet, Orders, Dispatch, Tracking, Billing).
- **Data Driven & Traceability:** Không xóa cứng dữ liệu hành trình, bảo toàn chuỗi chứng cứ pháp lý (BOL, POD).

---

# DATABASE RULES
1. **ORM First**: Luôn dùng Django ORM.
2. **BaseModel**: Mọi model phải kế thừa `TimeStampedModel`, model giao dịch kế thừa `SoftDeleteModel`.
3. **No Hard-Delete**: Tuyệt đối không dùng `.delete()` cứng trên dữ liệu vận tải; chỉ dùng `is_deleted = True`.
4. **Denormalization via Signals**: Không loop tính toán CBM/tiến độ trên UI; tính tự động và lưu cache bằng Signals.

---

# UI/UX & TAILWIND DESIGN TOKENS (ĐỒNG BỘ HỆ SINH THÁI BIM)
- **Teal**: Primary Brand Color (Header, Nút chính, Mã vận đơn).
- **Emerald**: Success, Giao hàng thành công, POD hợp lệ.
- **Amber**: Warning, Đang vận chuyển, Chờ bốc dỡ.
- **Stone**: Neutral, Đơn nháp, Chờ điều xe.
- **Blue**: Information, Trạm dừng, Lộ trình dự kiến.
- **Rose**: Exception, Sự cố OS&D, Hàng hỏng hóc.
