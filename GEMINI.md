# MANDATORY AGENT INSTRUCTIONS — BẮT BUỘC ĐỌC TRƯỚC KHI THỰC HIỆN
> [!IMPORTANT]
> **TẤT CẢ AI AGENT KHI THAM GIA DỰ ÁN NÀY BẮT BUỘC PHẢI ĐỌC VÀ TUÂN THỦ CÁC QUY CHUẨN SAU TRƯỚC KHI THỰC HIỆN BẤT KỲ THAO TÁC NÀO:**
> 1. **`AGENTS.md`** (tại gốc dự án): Bộ 4 quy tắc hành vi kỹ thuật (Think Before Coding, Simplicity & Field Reliability, Surgical Changes & Traceability, Goal-Driven Verification).
> 2. **`CODING_STANDARDS.md`** (tại gốc dự án): Chuẩn mực kiến trúc, Database ORM, quy ước đặt tên, Defensive Backend và Design Tokens đồng bộ hệ sinh thái BIM.
> 3. **Bảo vệ toàn vẹn dữ liệu vận tải & chứng từ:** Mọi thông tin vận đơn, biên bản giao nhận (POD), báo cáo sự cố (OS&D) và lịch sử GPS là dữ liệu pháp lý bất khả xâm phạm (Không dùng Hard-Delete).
> 4. **Quy trình trạng thái đơn hàng:** Tuyệt đối tuân thủ State Machine của chuỗi cung ứng, không nhảy cóc trạng thái vận chuyển.
> 5. **Quy tắc Chống Lỗi Hồi Quy & Giới Hạn Phạm Vi (Zero-Regression & Scope Containment):** Chỉ can thiệp đúng phạm vi yêu cầu, đánh giá tác động liên đới toàn diện, bảo đảm sau mỗi lần chỉnh sửa/thêm tính năng thì không phát sinh bất kỳ lỗi nào ở các chức năng cũ (100% tests passed).

---

# BIM LOGISTICS PLATFORM
Hệ thống Quản trị Vận tải & Chuỗi cung ứng (TMS, WMS, Fleet Management, Exception Handling & 3PL Integration) thuộc hệ sinh thái BIM Ecosystem.
