# GSS LOGISTICS — OPERATIONAL WORKFLOW & EXPENSE LIFECYCLE ARCHITECTURE
## Quy Trình Điều Vận 7 Bước GSS, Máy Trạng Thái Tập Trung & Vòng Đời Chi Phí Kế Toán

> **Hệ thống:** GSS TMS Platform (Container Transportation Management System)  
> **Phiên bản:** v4.8.0 | **Cập nhật lần cuối:** 26/11/2026  
> **Áp dụng:** Phòng Điều vận, Đối tác Nhà xe (Vendor 3PL), Lái xe Hiện trường & Phòng Tài chính - Kế toán GSS  
> **Tiêu chuẩn:** Máy trạng thái tập trung bất biến (`apps/dispatch/gss_workflow.py`), Zero Variance P&L

---

## 1. QUY TRÌNH ĐIỀU VẬN 7 BƯỚC TẬP TRUNG GSS (7-STEP GSS WORKFLOW)

Vòng đời điều phối và vận chuyển container của GSS TMS được kiểm soát nghiêm ngặt qua **Máy trạng thái 7 bước tập trung** (`apps/dispatch/gss_workflow.py`), gắn liền với chốt chặn kiểm soát chứng từ pháp lý thực địa (EIR / POD / Hạ rỗng):

```mermaid
flowchart TD
    S1["1. READY<br/>(Đã phát lệnh điều độ / Nhà xe gán xe)"]
    S2["2. ARRIVED_AT_PICKUP<br/>(Đã đến nơi nhận cont / kho xuất)"]
    S3["3. LOADED_ON_VEHICLE*<br/>(Đã lên xe / Đã nhận cont hàng)"]
    S4["4. ARRIVED_AT_DELIVERY<br/>(Đã đến nơi giao / Kho khách hàng)"]
    S5["5. UNLOADED*<br/>(Đã hạ xe / Giao xong hàng)"]
    S6["6. RETURNING_EMPTY<br/>(Đang đi hạ rỗng / Trả vỏ bãi)"]
    S7["7. EMPTY_RETURNED*<br/>(Đã hạ rỗng / Hoàn tất chuyến)"]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7

    note["* Bắt buộc có chứng từ đính kèm (1–10 file/chặng):<br/>- Bước 3: Chứng từ Lấy cont (EIR bãi / Cảng)<br/>- Bước 5: Biên bản giao hàng (E-POD có chữ ký)<br/>- Bước 7: Phiếu hạ rỗng có xác nhận của bãi cont"]
```

---

## 1.1 KIẾN TRÚC MÃ CHỨNG TỪ 5 TẦNG ĐỒNG BỘ (5-TIER TMS DOCUMENT HIERARCHY)

Để phục vụ quản lý chuỗi cung ứng chặt chẽ từ Sales đến Điều vận nội bộ, Nhà xe thầu phụ (Vendor) và Lái xe hiện trường, hệ thống chuẩn hóa 5 tầng mã chứng từ liên kết dòng chảy (flow traceability):

1. **`BG.YYMM.STT` (Báo Giá Khách Hàng - Sales):**
   - Sinh ra khi Sale lập báo giá cho khách (VD: `BG.2611.001`).
   - STT 3 chữ số, tự động reset theo tháng. Là căn cứ tạo Booking khi khách chốt giá.
2. **`BK.YYMM.STT` (Đơn Đặt Chỗ / Booking Khách Hàng):**
   - Sinh ra khi Phòng Kinh doanh tiếp nhận đơn hàng/Booking từ khách hàng (VD: `BK.2611.001`).
   - STT 3 chữ số, reset theo tháng. Thể hiện nhu cầu vận chuyển tổng thể của lô hàng (chưa có phương tiện).
3. **`DD.[Số Booking]` (Lệnh Điều Độ Tổng Lô Hàng):**
   - Kế thừa 1-1 từ Booking (VD: `DD.BK.2611.001`).
   - Thể hiện kế hoạch điều độ và phân bổ tổng thể số lượng container của Booking cho các nhà xe / đội xe nội bộ.
4. **`DD.STT.[Số Booking]` (Lệnh Điều Độ Con / Phiếu Phân Bổ Nhà Xe):**
   - Tự động sinh ra khi Điều vận phân bổ container cho từng nhà xe (VD: Booking chia 2 nhà xe sinh `DD.001.BK.2611.001` và `DD.002.BK.2611.001`).
   - STT đếm theo từng nhà xe/phiếu phân bổ trong Booking. Là phiếu giao việc chính thức cho từng Nhà xe (truy cập qua Cổng Vendor Portal).
5. **`VC.STT.[Số Booking]` (Lệnh Vận Chuyển / Vận Đơn Chuyến Xe Lăn Bánh):**
   - **Sinh ra ngay khi Container được gán cụ thể Đầu kéo + Rơ-moóc + Tài xế** (do Nhà xe khai báo trên Cổng Vendor Portal hoặc Điều vận chỉ định).
   - **Quy tắc STT:** Đếm theo **số thứ tự của Container trong toàn bộ Booking (1 đến N)**:
     - Ví dụ: Booking `BK.2611.001` có 5 cont:
       - Nhà xe 1 nhận 3 cont: sinh `VC.001.BK.2611.001`, `VC.002.BK.2611.001`, `VC.003.BK.2611.001`.
       - Nhà xe 2 nhận 2 cont: sinh `VC.004.BK.2611.001`, `VC.005.BK.2611.001`.
   - **Ưu điểm vượt trội:** Loại trừ hoàn toàn nguy cơ trùng mã (collision) khi nhiều nhà xe cùng nhập liệu đồng thời, mỗi cont có mã duy nhất tuyệt đối.
   - Tại Tab 3 và giao diện Mobile Tài xế, hệ thống giám sát hành trình các xe lăn bánh trên tuyến theo từng Phiếu VC.

---

## 2. MÁY TRẠNG THÁI ĐIỀU VẬN 7 BƯỚC TẬP TRUNG (`apps/dispatch/gss_workflow.py`)

Vòng đời chuyến xe được kiểm soát bằng máy trạng thái đơn định (Deterministic Finite State Machine) tại `apps/dispatch/gss_workflow.py`, đảm bảo **không bao giờ nhảy cóc trạng thái trái quy luật vận tải** và đồng bộ một chiều sang `TripStatus` cũ để phục vụ báo cáo/kế toán:

```mermaid
stateDiagram-v2
    [*] --> READY : Đã gán xe & Phát lệnh điều độ
    READY --> ARRIVED_AT_PICKUP : Xe đến bãi / cảng nhận cont
    READY --> CANCELLED : Điều độ hủy lệnh
    
    ARRIVED_AT_PICKUP --> LOADED_ON_VEHICLE : Đã nhận cont/hàng (Cần ≥1 chứng từ PICKUP)
    ARRIVED_AT_PICKUP --> CANCELLED : Hủy do sự cố
    
    LOADED_ON_VEHICLE --> ARRIVED_AT_DELIVERY : Xe đến kho khách hàng giao hàng
    ARRIVED_AT_DELIVERY --> UNLOADED : Giao xong hàng (Cần ≥1 chứng từ POD DELIVERY)
    
    UNLOADED --> RETURNING_EMPTY : Xe kéo vỏ cont đi hạ bãi
    RETURNING_EMPTY --> EMPTY_RETURNED : Đã hạ rỗng (Cần ≥1 chứng từ EMPTY_RETURN)
    
    EMPTY_RETURNED --> [*] : Hoàn tất chuyến & Chốt kế toán
    CANCELLED --> [*] : Lưu vết hủy chuyến
```

### Bảng Ma Trận Chuyển Trạng Thái 7 Bước & Ràng Buộc Chứng Từ:

| Bước | Mã trạng thái | Tên hiển thị | Tác nhân kích hoạt | Ràng buộc chứng từ & Điều kiện kiểm soát |
|:---:|---|---|---|---|
| **1** | `READY` | Đã Phát Lệnh Điều Độ | Điều độ / Nhà xe | Đã gán Nhà xe (`subcontractor`), Đầu kéo và Tài xế. |
| **2** | `ARRIVED_AT_PICKUP` | Đã đến nơi nhận | Tài xế (QR) / Điều độ | Xe đến cổng Cảng/Depot hoặc kho xuất hàng. |
| **3** | `LOADED_ON_VEHICLE` | Đã lên xe / Đã nhận cont | Tài xế (QR) / Điều độ | **Bắt buộc:** Có số Container + ≥ 1 chứng từ chặng `PICKUP` (Phiếu EIR lấy cont). |
| **4** | `ARRIVED_AT_DELIVERY` | Đã đến nơi giao | Tài xế (QR) / Điều độ | Xe đến cổng kho / nhà máy người nhận. |
| **5** | `UNLOADED` | Đã hạ xe / Giao xong | Tài xế (QR) / Điều độ | **Bắt buộc:** ≥ 1 chứng từ chặng `DELIVERY` (Biên bản E-POD có ký nhận). |
| **6** | `RETURNING_EMPTY` | Đang đi hạ rỗng | Tài xế (QR) / Điều độ | Xe kéo cont rỗng rời kho di chuyển về bãi hạ. |
| **7** | `EMPTY_RETURNED` | Đã hạ rỗng (Hoàn tất) | Tài xế (QR) / Điều độ | **Bắt buộc:** ≥ 1 chứng từ chặng `EMPTY_RETURN` (Phiếu hạ rỗng bãi/cảng). Hỗ trợ đổi vỏ hoặc street-turn. |
| **-** | `CANCELLED` | Đã hủy | Điều độ / Ban Giám Đốc | Bắt buộc nhập lý do hủy (≥ 5 ký tự) và ghi nhật ký Audit Trail. |

> **Bất biến Invariant 2:** Trạng thái điều vận **chỉ được phép thay đổi qua `apps/dispatch/gss_workflow.advance()`**, tuyệt đối không cập nhật trực tiếp trường `status` hay `step_status` trong view/template.

---

## 3. CÁC QUY TRÌNH LOGISTICS ĐẶC THÙ (SPECIALIZED LOGISTICS WORKFLOWS)

### 3.1 Nghiệp Vụ Cắt Kéo / Cắt Moóc (Drop & Hook — 2 Chặng)
- **Bản chất nghiệp vụ:** Xe đầu kéo 1 kéo rơ-moóc mang cont đến kho khách hàng, để lại rơ-moóc tại kho để công nhân bốc dỡ dần (Uncoupling). Đầu kéo 1 rời đi nhận chuyến khác. Sau khi xếp dỡ xong, đầu kéo 2 (hoặc chính đầu kéo 1) đến móc lại moóc (Coupling) kéo đi hạ bãi.
- **Kiểm soát hệ thống:**
  * Cờ `is_split_trip = True`.
  * Quản lý riêng: `driver` (Tài xế chặng 1 - Lấy cont đưa vào kho) và `dropoff_driver` (Tài xế chặng 2 - Kéo cont ra hạ bãi).
  * Tỷ lệ phân chia lương chuyến: `driver_split_ratio` (Mặc định 50% - 50% hoặc 60% - 40% tùy tuyến).
  * Phụ cấp cắt moóc riêng biệt: `driver_allowance` và `dropoff_driver_allowance`.

### 3.2 Nghiệp Vụ Chở Ghép 2 Container 20ft (Twin 20ft Drayage / Kẹp 20)
- **Bản chất nghiệp vụ:** 1 đầu kéo + 1 rơ-moóc xương 40ft chở đồng thời 2 container 20ft cùng lúc để tối ưu hóa năng suất nhiên liệu và cước vận tải.
- **Kiểm soát hệ thống:**
  * Cờ `is_twin_container = True`.
  * Quản trị 2 bộ số liệu song song: Cont 1 (`container_number`, `seal_number`, `booking_or_bill`, `vgm_weight`) và Cont 2 (`container_number_2`, `seal_number_2`, `booking_or_bill_2`, `vgm_weight_2`).
  * Định mức cước và lương chuyến tự động nhân hệ số ghép cont.

### 3.3 Hệ Thống Cảnh Báo Quá Hạn Vỏ Cont (DEM/DET Watchdog Engine)
- **Cơ chế:** Tự động tính toán số ngày miễn phí lưu bãi (**Free Demurrage**) và miễn phí lưu vỏ cont (**Free Detention**) dựa trên ngày lấy cont thực tế:
  * 🟢 **Màu Xanh (An Toàn):** Còn hạn Free-time $> 48$ giờ.
  * 🟡 **Màu Vàng (Cảnh Báo):** Còn hạn Free-time $\le 24$ giờ $\rightarrow$ Đẩy cảnh báo lên bảng điều vận ưu tiên xếp xe hạ vỏ.
  * 🔴 **Màu Đỏ (Khẩn Cấp):** Quá hạn Free-time $\rightarrow$ Tự động đếm ngày trễ và ước tính tiền phạt hãng tàu (\$20 - \$80/ngày/cont).

---

## 4. VÒNG ĐỜI 3 GIAI ĐOẠN CỦA KHOẢN CHI PHÍ (EXPENSE STATE MACHINE)

Tại Bước 11 của chu trình vận hành, toàn bộ chi phí phát sinh hiện trường (`TripExpense`) trải qua 3 giai đoạn được kiểm soát chặt chẽ:

```mermaid
stateDiagram-v2
    [*] --> PENDING: Tài xế kê khai / OCR AI tạo
    PENDING --> PENDING: Tài xế / Điều độ sửa đổi
    PENDING --> DELETED: Tài xế / Điều độ xóa mềm (Soft-delete)
    PENDING --> APPROVED: Điều độ viên phê duyệt
    APPROVED --> PENDING: Điều độ mở lại (Recall to Pending)
    APPROVED --> SETTLED: Kế toán bấm "Chốt Sổ Chuyến Xe"
    SETTLED --> [*]: KHÓA CỨNG BẤT KHẢ XÂM PHẠM
```

### Chi Tiết Phân Quyền Theo 3 Cấp Độ:
1. **Giai đoạn 1: Chờ Duyệt (`PENDING`) — Tự do hiệu chỉnh:**
   - **Tài xế:** Được phép sửa số tiền, đổi danh mục, cập nhật ghi chú hoặc xóa mềm khoản chi do mình vừa nhập sai.
   - **Điều độ viên:** Được phép chỉnh sửa số tiền, chuẩn hóa lại danh mục, hoặc bấm Duyệt (`APPROVED`) / Từ chối.
2. **Giai đoạn 2: Điều Độ Đã Duyệt (`APPROVED`) — Kiểm soát thay đổi:**
   - Khoản chi đã được Điều phối viên xác nhận và chính thức đưa vào số liệu P&L tạm tính của chuyến xe.
   - **Tài xế:** KHÔNG ĐƯỢC tự ý xóa hay sửa. Nếu phát hiện sai sót, tài xế phải liên hệ Điều độ viên yêu cầu mở lại.
   - **Điều độ viên:** Có quyền mở lại (`Recall to Pending`) hoặc điều chỉnh số tiền khi đối soát lại hóa đơn gốc.
3. **Giai đoạn 3: Kế Toán Đã Chốt Sổ (`SETTLED` / `LOCKED`) — Bất khả xâm phạm:**
   - Kế toán viên bấm **"Chốt Sổ Chi Phí Chuyến Xe"**.
   - **Nguyên tắc bất biến:**
     * Toàn bộ bảng kê chi phí chuyển sang trạng thái `SETTLED` và bị **KHÓA CỨNG (READ-ONLY)**.
     * Không một ai (kể cả Tài xế, Điều độ viên hay Admin) được phép sửa hoặc xóa các dòng chi phí này.
     * Mọi nút Sửa/Xóa bị vô hiệu hóa hoàn toàn; hiển thị biểu tượng 🔒 Khóa sổ kèm tên Kế toán viên và ngày giờ chốt số.
     * Mọi phát sinh tài chính sau khi khóa sổ phải lập bút toán điều chỉnh riêng (`ExpenseAdjustment`), tuyệt đối không sửa đổi bảng kê lịch sử.

---

## 5. BẢNG KÊ 8 KHOẢN MỤC CHI PHÍ & 3 DÒNG PHÂN LOẠI CHI TRẢ

### 5.1 Danh Mục 8 Khoản Mục Chi Phí Hiện Trường
| STT | Khoản mục Chi phí | Mã Category | Mục đích & Ràng buộc chứng từ |
|:---:|---|---|---|
| **1** | **Phí Nâng Cont** | `LIFT_ON` | Cảng/Depot nâng cont lên rơ-moóc; bắt buộc có mã tra cứu HĐĐT. |
| **2** | **Phí Hạ Cont** | `LIFT_OFF` | Cảng/Depot cẩu hạ cont xuống bãi; bắt buộc có mã tra cứu HĐĐT. |
| **3** | **Vé Cầu Đường / BOT / ETC** | `TOLL` | Trạm thu phí đường bộ; đối chiếu biểu phí theo tuyến đường. |
| **4** | **Cược Vỏ Cont Hãng Tàu** | `DEPOSIT` | Tiền cọc vỏ cont; hoàn ứng 100% khi trả vỏ cont nguyên vẹn. |
| **5** | **Phí Cân Xe / Cân Hàng** | `WEIGHING` | Cân tải trọng tại trạm cân/kho; đính kèm phiếu cân. |
| **6** | **Bồi Dưỡng Bốc Xếp / Kho** | `LABOR` | Bồi dưỡng công nhân bốc dỡ tại dock kho khách hàng. |
| **7** | **Chi Hộ Khách Hàng (OBH)** | `EINVOICE` | Tiền cước hãng tàu/phí cảng thanh toán hộ chủ hàng; thu lại qua Debit Note. |
| **8** | **Chi Phí Khác** | `OTHER` | Vá lốp khẩn cấp, rửa vỏ cont bẩn, bảo quản nhiệt độ cont lạnh. |

### 5.2 Ba Dòng Phân Loại Chi Trả (`expense_payer_type`)
1. **`COMPANY_COST` (Chi Phí Nội Bộ GSS):** Chi phí phục vụ vận hành do GSS chịu. Được trừ vào doanh thu để tính Lợi nhuận gộp P&L của chuyến xe.
2. **`COMPANY_OBH` (GSS Chi Hộ Khách Hàng — On Behalf of Customer):** Tiền GSS ứng trước cho chủ hàng. Gom vào **Bảng Kê Chi Hộ (Debit Note)** để thu lại 100%, không tính vào P&L chuyến xe.
3. **`SUB_OBH` (Chi Hộ Xe Bạn / Thầu Phụ 3PL):** Tiền tài xế nộp hộ cho xe thuê ngoài 3PL. Được cấn trừ khi lập Bảng Kê Quyết Toán Công Nợ Thầu Phụ (`SubcontractorSettlement`).

---

## 6. QUẢN TRỊ DÒNG TIỀN SỔ QUỸ S03a-DN & TẠM ỨNG 2 CẤP

### 6.1 Cơ Chế Tạm Ứng 2 Cấp Độ (Two-Tier Advance Mechanism)
- **Cấp 1 — Quỹ Tạm Ứng Điều Vận (`DispatcherAdvanceFund`):** Kế toán xuất quỹ tiền mặt/ngân hàng cấp hạn mức quỹ lưu động cho Trưởng phòng Điều vận.
- **Cấp 2 — Tạm Ứng Chuyến Xe Tài Xế (`DriverTripAdvance`):** Điều phối viên trích từ Quỹ Điều Vận để cấp tạm ứng cho tài xế trước mỗi chuyến đi. Khi chuyến hoàn tất, số tiền thực chi hợp lệ được đối soát hoàn ứng và tất toán vào quỹ.

### 6.2 Sổ Quỹ Thu - Chi Mẫu S03a-DN (`CashTransaction`)
Hệ thống hạch toán dòng tiền minh bạch theo chuẩn kế toán Việt Nam (Thông tư 200/2014/TT-BTC & 133/2016/TT-BTC):
- Thu cước khách hàng, Thu hoàn ứng Debit Note.
- Chi tạm ứng điều vận, Chi thanh toán thầu phụ 3PL, Chi nạp tài khoản ETC/ePass.
- Quản lý tách bạch giữa: **Tồn Quỹ Tiền Mặt tại Két** và **Số Dư Tài Khoản Ngân Hàng**.

---

## 7. NGUYÊN TẮC ZERO VARIANCE FINANCIAL AUDIT

1. **Công thức P&L Bất Biến:**
   $$\text{Lợi Nhuận Gộp Chuyến (Profit)} = \text{Doanh Thu Cước (Revenue)} - \sum \text{Chi Phí Hợp Lệ (COMPANY\_COST)}$$
   $$\text{Tỷ Suất Lợi Nhuận (Margin \%)} = \frac{\text{Lợi Nhuận Gộp}}{\text{Doanh Thu Cước}} \times 100\%$$
2. **Cập Nhật Tự Động Qua Signals:**
   Mỗi khi bản ghi `TripExpense` được phê duyệt hoặc chốt sổ, hàm `update_financials()` trên `DispatchTrip` tự động kích hoạt tính toán lại và lưu vào các trường cache (`cached_revenue`, `cached_expense`, `cached_profit`, `cached_margin_percent`), triệt tiêu hoàn toàn sai lệch số liệu giữa bảng kê và báo cáo tổng hợp.
