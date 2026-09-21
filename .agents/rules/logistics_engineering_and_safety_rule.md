# BIM LOGISTICS ENGINEERING & DATA SANCTITY RULES
(QUY TẮC AN TOÀN DỮ LIỆU & KỸ THUẬT VẬN TẢI LOGISTICS)

Tài liệu này đồng bộ cùng `AGENTS.md`, thiết lập các chuẩn mực bắt buộc khi phát triển hệ thống Bim_Logistics.

---

## 1. NGUYÊN TẮC BẢO TOÀN DỮ LIỆU TRUY VẾT (AUDIT TRAIL & TRACEABILITY)
- Mọi dữ liệu về trạng thái đơn vận, mốc quét mã barcode/QR, hình ảnh ký nhận POD và lịch sử sự cố (hỏng hóc, thiếu hàng, giao chậm) là căn cứ pháp lý quyết toán và bảo hiểm.
- Tuyệt đối cấm sử dụng Hard-Delete. Chỉ dùng Soft-Delete và lưu nhật ký Audit Log đầy đủ thời gian, tác nhân và tọa độ.

## 2. CHUẨN MỰC THIẾT KẾ CHO HIỆN TRƯỜNG (FIELD & MOBILE FIRST)
- Tối ưu kích thước payload API, hỗ trợ cơ chế lưu ngoại tuyến (offline-ready) cho ứng dụng tài xế và kiểm kho.
- Giao diện thao tác hiện trường phải tinh gọn, nút bấm lớn, phản hồi nhanh dưới 2 chạm.

## 3. MÁY TRẠNG THÁI VẬN TẢI (STRICT STATE MACHINE)
- Mọi chuyển dịch trạng thái đơn hàng (`Draft ➔ Dispatched ➔ In Transit ➔ Delivered ➔ POD Verified`) phải thông qua service kiểm soát luồng, cấm cập nhật trực tiếp bỏ qua bước kiểm tra điều kiện tiên quyết.
