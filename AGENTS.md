# AGENTS.md

Behavioral guidelines for software engineering on the Bim_Logistics platform (TMS, WMS, Fleet & Supply Chain Management).
Balances developer caution with operational speed: bias toward shipment data integrity, legal freight compliance, and high-reliability logistics workflows.

**Tradeoff:** Tính chính xác của hành trình, an toàn dữ liệu vận đơn/POD và tính liên tục của vận hành cao hơn tốc độ viết code. Không phán đoán mò.

> [!IMPORTANT]
> **BẮT BUỘC CHO TẤT CẢ AI AGENT:**
> Phải đọc kỹ và tuân thủ tuyệt đối 4 nguyên tắc bên dưới cùng quy chuẩn kỹ thuật tại [CODING_STANDARDS.md](file:///E:/Bim_Logistics/CODING_STANDARDS.md) trước khi đề xuất kiến trúc, phân tích luồng vận tải, tạo model, viết API hoặc chỉnh sửa mã nguồn trong dự án này.

---

## 1. Think Before Coding & Designing

**Hiểu rõ luồng vận tải & chuỗi cung ứng trước khi gõ code. Nêu rõ giả định & đánh đổi.**

Trước khi viết hoặc sửa code (Model, API, State Machine, Tracking, Billing):
- **Đối chiếu nghiệp vụ logistics thực tế:** Luôn bám sát quy trình giao nhận thực tế (FTL - Nguyên chuyến, LTL - Ghép hàng, Last-mile - Giao chặng cuối, Đa phương thức). Xác thực rõ chuẩn chứng từ: Vận đơn (BOL), Biên bản giao nhận có chữ ký/hình ảnh (POD - Proof of Delivery), Biên bản bất thường (OS&D - Over, Short, Damage) theo Luật Thương mại 2005 và quy chuẩn vận tải Việt Nam.
- **Kiểm soát chặt chẽ máy trạng thái (State Machine):** Vòng đời đơn hàng/chuyến xe (`Draft ➔ Dispatched ➔ Picked Up ➔ In Transit ➔ Out for Delivery ➔ Delivered ➔ POD Verified ➔ Settled`) phải được quản lý bằng state machine nghiêm ngặt; không cho phép nhảy cóc trạng thái trái logic vận hành.
- **Nêu rõ các phương án thiết kế:** Nếu có nhiều cách xử lý (ví dụ: Real-time WebSocket vs. Polling GPS; Lưu lịch sử tọa độ vào Time-series DB vs. PostgreSQL Partitioning; Tính cước động vs. Bảng giá cố định), phải phân tích ưu/nhược điểm và tải hệ thống trước khi chọn.
- **Dừng lại khi thiếu dữ liệu trọng yếu:** Nếu schema thiếu quy đổi thể tích trọng lượng (CBM vs. Gross Weight), thiếu thông tin tải trọng xe, hoặc thiếu cơ chế ghi nhận sự cố (Exception Management), dừng lại và chỉ rõ vấn đề trước khi code.

---

## 2. Simplicity & Operational Reliability First

**Lượng code tối thiểu giải quyết đúng bài toán Logistics. Ưu tiên độ ổn định hiện trường.**

- **Không over-engineering bài toán điều vận:** Ưu tiên các thuật toán phân bổ đơn, gán xe và tối ưu lộ trình đơn giản, minh bạch và dễ debug; không tự ý tích hợp mô hình AI/ML phức tạp khi chưa có yêu cầu cụ thể.
- **Thiết kế thân thiện với hiện trường (Mobile & Offline-friendly):** Tài xế và thủ kho thường làm việc ở môi trường mạng chập chờn; thiết kế payload API nhẹ, hỗ trợ lưu trữ tạm (local storage/cache) và cơ chế thử lại (retry mechanism) khi có mạng trở lại.
- **Tối ưu hóa truy vấn dữ liệu lớn:** Dữ liệu GPS logs, mốc thời gian tracking (Milestones) và sự kiện quét mã tăng trưởng rất nhanh. Luôn đánh index chính xác, phân trang chặt chẽ, tránh tuyệt đối các truy vấn quét toàn bảng (Full Table Scan).
- **Giao diện tối giản, chuẩn thao tác 2 chạm:** Giao diện tài xế/thủ kho phải rõ ràng, nút bấm to, phân biệt trạng thái bằng màu sắc trực quan (Xanh: Hoàn thành, Hổ phách: Đang vận chuyển, Đỏ: Cảnh báo sự cố); thao tác xác nhận giao hàng không quá 2 bước.

---

## 3. Surgical Changes, Scope Containment & Zero-Regression

**Chỉ can thiệp đúng phạm vi yêu cầu. Tuyệt đối không để việc sửa/thêm tính năng mới làm phát sinh lỗi ở các tính năng cũ.**

Khi chỉnh sửa mã nguồn hoặc cấu trúc dữ liệu:
- **Tập trung đúng trọng tâm yêu cầu (Scope Containment):** Chỉ sửa đúng tệp, đúng hàm, đúng component mà người dùng yêu cầu. Tuyệt đối không chỉnh sửa lan man ngoài phạm vi gây xáo trộn codebase.
- **Đánh giá tác động liên đới (Impact Assessment):** Trước khi sửa/xóa bất kỳ hàm JS, biến, CSS class, component template hoặc API endpoint nào, bắt buộc rà soát toàn bộ các phân hệ phụ thuộc để hiệu chỉnh đồng bộ, đảm bảo tính toàn vẹn 100% của hệ thống.
- **Bảo toàn tính nguyên vẹn cú pháp:** Giữ nghiêm ngặt cấu trúc cú pháp (đặc biệt các thẻ HTML, dấu ngoặc nhọn `{}` trong inline JavaScript/CSS) để lỗi cục bộ không gây tê liệt toàn trang.
- **Bảo toàn lịch sử truy vết (No Hard-Delete on Audit Trails):** Mọi bản ghi về vị trí, sự kiện quét mã (barcode/QR), thay đổi trạng thái đơn, hình ảnh POD và biên bản khiếu nại là chứng cứ pháp lý giải quyết tranh chấp; tuyệt đối không dùng lệnh xóa cứng (`.delete()`), chỉ dùng Soft-Delete và Audit Logging.
- **Bảo tồn dữ liệu người dùng & tài khoản (No Overwrite on Existing Users/Credentials):** Tuyệt đối KHÔNG chạy các script seed hoặc setup commands có logic tự ý ghi đè (`user.email = ...`, `user.set_password(...)`, `emp.full_name = ...`) lên cơ sở dữ liệu thật. Các tài khoản người dùng đã thiết lập/hiệu chỉnh là dữ liệu vận hành bất khả xâm phạm; mọi script khởi tạo chỉ được phép tạo mới nếu chưa tồn tại (`if created:`), tuyệt đối không được tự ý gán lại hay ghi đè.
- **Không làm ảnh hưởng đến các phân hệ lân cận:** Khi sửa module Quản lý đội xe (Fleet) hoặc Kho (WMS), không làm đứt gãy luồng Tính cước vận chuyển (Freight Billing) hay Tích hợp đơn vị vận chuyển bên thứ 3 (3PL APIs).
- **Tuân thủ quy ước đặt tên & thiết kế chung:** Sử dụng PascalCase cho Models, snake_case cho fields/APIs; bảng màu đồng bộ hệ thống BIM (Teal chủ đạo, Emerald thành công, Amber cảnh báo, Rose lỗi/hỏng hóc).
- **Dọn sạch rác phát sinh:** Tự thu dọn các tọa độ mock test, dữ liệu đơn hàng giả lập và migrations thừa sau khi hoàn tất kiểm thử.

---

## 4. Goal-Driven Execution

**Xác định tiêu chí kiểm chứng (Verify). Chạy vòng lặp đến khi đạt chuẩn.**

Mọi tính năng và sửa đổi phải được kiểm chứng bằng kịch bản thực tế:
- "Thêm quy trình xử lý hàng hỏng hóc/thiếu hụt (OS&D)" → "Tạo biên bản sự cố kèm ảnh chụp → Cập nhật trạng thái đơn → Kích hoạt thông báo cho bộ phận CSKH/Điều phối → Kiểm tra dữ liệu ghi nhận đầy đủ".
- "Tính giá cước vận chuyển" → "Kiểm thử công thức so sánh giữa Trọng lượng thực (Gross Weight) và Trọng lượng thể tích (Volumetric Weight: $D \times R \times C / 5000$) → Khớp đúng số liệu bảng giá hợp đồng".
- "API đồng bộ tọa độ GPS xe" → "Gửi payload vị trí → Lưu trữ mốc tracking hợp lệ → Trả về HTTP 200 trong < 200ms".

- **Bắt buộc kiểm thử hồi quy toàn diện (Full Regression Testing & Frontend JS Syntax Verification):**
  * **Frontend Verification:** Bắt buộc chạy `node -c static/js/app.js` và `node -c static/js/column_manager.js` trước mỗi lần commit/deploy để đảm bảo 100% cú pháp JS chuẩn mực, không có biến `let`/`const` bị khai báo trùng lặp (Uncaught SyntaxError) làm tê liệt điều hướng trang và các nút bấm.
  * **Backend & System Verification:** Chạy toàn bộ bộ kiểm thử tự động của dự án (`python manage.py test --keepdb` - bao gồm `FrontendSyntaxIntegrityTestCase`) để xác nhận 100% tính năng mới và các tính năng cũ liên quan đều chạy trơn tru, không phát sinh bất kỳ lỗi hồi quy nào.

Với các tác vụ nhiều bước, luôn tóm tắt kế hoạch:
```
1. [Bước code/sửa file] → Verify: [Kiểm thử cú pháp JS: node -c static/js/app.js / Unit Test: python manage.py test --keepdb]
2. [Bước code/sửa file] → Verify: [Kiểm thử cú pháp JS / Unit Test / Kiểm tra luồng trạng thái]
```

---

**Bộ quy tắc này hiệu quả khi:** Dữ liệu vận chuyển và truy vết POD luôn chính xác 100%, không xảy ra đứt gãy trạng thái đơn, mã nguồn JavaScript chạy mượt mà không lỗi cú pháp làm đứng giao diện, giao diện hiện trường thao tác mượt mà không lỗi giật lag, và mọi giả định nghiệp vụ đều được làm rõ trước khi lập trình.
