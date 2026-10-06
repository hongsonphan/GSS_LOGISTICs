# BIM LOGISTICS — OPERATIONAL WORKFLOW (TMS)
**Tài liệu Đặc tả Quy trình Điều vận & Máy trạng thái 11 Bước Chuẩn**

Phiên bản: 2.0  
Áp dụng: Bộ phận Điều vận, Đội xe, Kế toán và Ban Giám Đốc Triền Võ Logistics

---

## 1. QUY TRÌNH 11 BƯỚC CHUẨN THỰC TẾ

```
[B1. Nhận Booking (Kinh doanh tiếp nhận & lệnh cấp cont)]
               │
               ▼
[B2. Phát lệnh Điều vận (Điều xe, tài xế, phân công phương tiện)]
               │
               ▼
[B3. Xác nhận chuyến (Tài xế bấm nhận chuyến trên App/Zalo)]
               │
               ▼
[B4. Tài xế Xuất phát & Hẹn giờ đến (Bãi lấy cont / Điểm lấy hàng)]
               │
               ▼
[B5. Đã đến Cổng kho (Check-in cổng bảo vệ kho khách hàng)]
               │
               ▼
[B6. Bắt đầu Đóng / Trả (Vào dock kho, tháo niêm/chuẩn bị bốc dỡ)]
               │
               ▼
[B7. Đóng hàng / Xuống hàng xong (Hoàn tất bốc xếp tại dock)]
               │
               ▼
[B8. Đã ký đủ chứng từ Giao / Nhận (POD biên bản giao nhận có chữ ký)]
               │
               ▼
[B9. Vận chuyển về Bãi hạ Rỗng / Cảng Xuất (Kéo cont rời kho về bãi)]
               │
               ▼
[B10. Đã hạ Cont: lấy phiếu (Cẩu hạ cont, nhận phiếu EIR hạ bãi)]
               │
               ▼
[B11. Tổng hợp chi phí & Đối soát Thanh toán (Kế toán chốt sổ)]
```

---

## 2. QUY TẮC MÁY TRẠNG THÁI (STATE MACHINE)

Vòng đời chuyến xe được kiểm soát bằng máy trạng thái bất biến tại `core.workflows`:

| Trạng thái | Diễn giải | Trạng thái kế tiếp cho phép |
| :--- | :--- | :--- |
| `DRAFT` | Lệnh điều động vừa khởi tạo, đang chuẩn bị thông tin | `DISPATCHED`, `CANCELLED` |
| `DISPATCHED` | Điều độ đã gửi thông tin vào nhóm Zalo / App | `ACCEPTED`, `CANCELLED` |
| `ACCEPTED` | Tài xế đã kiểm tra xe, sức khỏe và bấm "Đã nhận" | `CONTAINER_PICKED`, `CANCELLED` |
| `CONTAINER_PICKED` | Đã đến Depot/Cảng lấy cont, đối chiếu số cont/seal | `IN_TRANSIT`, `CANCELLED` |
| `IN_TRANSIT` | Đang di chuyển trên đường theo tuyến quy định | `AT_WAREHOUSE`, `CANCELLED` |
| `AT_WAREHOUSE` | Đã đến kho khách hàng (Báo trước 20-60 phút) | `UNLOADING`, `CANCELLED` |
| `UNLOADING` | Đang thực hiện bốc/trút hàng hóa tại dock | `DELIVERED`, `CANCELLED` |
| `DELIVERED` | Đã hoàn tất đóng/trả hàng và ký biên bản POD | `RETURNING_EMPTY`, `COMPLETED` |
| `RETURNING_EMPTY`| Đang kéo vỏ cont đi hạ tại cảng/depot chỉ định | `COMPLETED`, `CANCELLED` |
| `COMPLETED` | Đã có phiếu hạ EIR, hoàn tất chuyến, chuyển Kế toán | Không có |
| `CANCELLED` | Lệnh bị hủy | Không có |

> [!WARNING]
> Mọi hành vi cố tình đổi trạng thái nhảy cóc (ví dụ từ `ACCEPTED` nhảy thẳng lên `COMPLETED`) sẽ bị hệ thống chặn lại và ném lỗi `ValidationError`.

---

## 3. CƠ CHẾ KIỂM SOÁT CHI PHÍ & CHỨNG TỪ SỐ

1. **Chứng từ vỏ container & Seal (Bước 4 & 8):**
   - Tài xế chụp ảnh 4 góc cont, số seal và phiếu EIR lấy/hạ.
   - Hệ thống OCR AI trích xuất và đối chiếu với Lệnh điều động ban đầu.
2. **Chi phí phát sinh ngoài kế hoạch (Bước 9):**
   - Tài xế chụp ảnh vé trạm BOT, hóa đơn nâng hạ hoặc phí bồi dưỡng kho.
   - Hệ thống ghi nhận trạng thái `PENDING`. Chỉ khi Điều phối viên bấm duyệt (`APPROVED`), khoản chi này mới được tính vào chi phí chuyến xe và trừ vào quỹ tiền mặt của công ty.
