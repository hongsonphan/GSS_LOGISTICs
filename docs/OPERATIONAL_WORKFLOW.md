# BIM LOGISTICS — OPERATIONAL WORKFLOW (TMS)
**Tài liệu Đặc tả Quy trình Điều vận & Máy trạng thái 10 Bước**

Phiên bản: 1.0  
Áp dụng: Bộ phận Điều vận, Đội xe, Kế toán và Ban Giám Đốc Triền Võ Logistics

---

## 1. QUY TRÌNH 10 BƯỚC THỰC TẾ

```
[B1. Tiếp nhận & Chuẩn bị lệnh]
               │
               ▼
[B2. Phát lệnh Zalo / App (18:00)]
               │
               ▼
[B3. Tài xế xác nhận lệnh]
               │
               ▼
[B4. Lấy Cont / Hàng (Kiểm tra vỏ cont, seal, EIR)]
               │
               ▼
[B5. Vận chuyển theo lộ trình duyệt]
               │
               ▼
[B6. Giao nhận tại kho KH (4 Mốc thời gian)]
               │
               ▼
[B7. Hoàn tất chứng từ giao nhận (Ký POD)]
               │
               ▼
[B8. Hạ Cont & Trả rỗng (EIR hạ cont)]
               │
               ▼
[B9. Xử lý sự cố & Chi phí phát sinh (OCR duyệt)]
               │
               ▼
[B10. Tổng hợp chi phí & Đối chiếu thanh toán]
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
