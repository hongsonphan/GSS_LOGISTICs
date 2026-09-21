# BIM LOGISTICS — NGUYÊN TẮC UI/UX & DESIGN SYSTEM

> **Phiên bản:** 1.4.9 | **Cập nhật:** 21/09/2026  
> Tài liệu này định nghĩa toàn bộ nguyên tắc thiết kế giao diện, hệ thống màu sắc, typography, component pattern và trải nghiệm người dùng áp dụng xuyên suốt nền tảng BIM Logistics.

---

## 1. TRIẾT LÝ THIẾT KẾ CỐT LÕI

### 1.1 Field-First Design (Ưu tiên Hiện trường)

Người dùng chính gồm 3 nhóm với điều kiện sử dụng rất khác nhau:

| Nhóm | Thiết bị | Điều kiện | Yêu cầu |
|---|---|---|---|
| **Tài xế** | Điện thoại 5-6" | Bụi bặm, cabin xe, ánh sáng mạnh/yếu, 1 tay | Nút to ≥44px, tương phản cao, thao tác ≤2 chạm |
| **Điều độ viên** | Desktop / Laptop | Văn phòng, cùng lúc nhiều màn hình | Bảng dữ liệu rõ ràng, tìm kiếm nhanh, ít scroll |
| **Ban Giám Đốc** | Laptop / Tablet | Họp, di chuyển | KPI to, đọc được trong 30 giây, biểu đồ trực quan |

### 1.2 Clarity Over Cleverness
> Ưu tiên hiển thị dữ liệu rõ ràng, dễ hiểu hơn thiết kế phức tạp. Mọi phần tử phải có mục đích rõ ràng.

### 1.3 Progressive Disclosure (Tiết lộ Dần Dần)
> Trang chính hiển thị thông tin tổng hợp cần thiết. Chi tiết chỉ hiện khi người dùng chủ động bấm vào.
> Ví dụ: Bảng điều vận → Nhấp dòng → Màn hình chi tiết chuyến xe.

### 1.4 Zero Ambiguity (Không Nhầm Lẫn)
> Mọi trạng thái phải có nhãn chữ RÕ RÀNG kèm màu sắc phân biệt. Không dùng icon đơn độc không có text.

---

## 2. HỆ THỐNG MÀU SẮC (COLOR DESIGN TOKENS)

### 2.1 Bảng Màu Thương Hiệu BIM

| Token | Màu Tailwind | Hex | Ý nghĩa |
|---|---|---|---|
| **Primary** | `teal-700` / `teal-800` | `#0f766e` / `#115e59` | Màu chủ đạo thương hiệu BIM |
| **Success** | `emerald-600` / `emerald-700` | `#059669` / `#047857` | Thành công, hoàn tất, hợp lệ |
| **Warning** | `amber-500` / `amber-600` | `#f59e0b` / `#d97706` | Cảnh báo, đang xử lý, cần chú ý |
| **Danger** | `rose-600` / `rose-700` | `#e11d48` / `#be123c` | Lỗi, sự cố, chi phí, nguy hiểm |
| **Info** | `blue-600` / `blue-700` | `#2563eb` / `#1d4ed8` | Thông tin, đang vận chuyển |
| **Neutral** | `slate-500` / `slate-600` | `#64748b` / `#475569` | Nháp, chưa xử lý, dữ liệu phụ |
| **Purple** | `purple-700` / `purple-800` | `#7e22ce` / `#6b21a8` | Đã chốt sổ kế toán (locked) |

### 2.2 Áp Dụng Màu Theo Trạng Thái Chuyến Xe

| Trạng thái | Màu Badge | Mô tả |
|---|---|---|
| `DRAFT` | `bg-slate-100 text-slate-700` | Nháp / Chờ duyệt |
| `DISPATCHED` | `bg-blue-100 text-blue-800` | Đã phát lệnh |
| `ACCEPTED` | `bg-teal-100 text-teal-800` | Tài xế đã nhận |
| `CONTAINER_PICKED` | `bg-cyan-100 text-cyan-800` | Đã lấy cont |
| `IN_TRANSIT` | `bg-indigo-100 text-indigo-800` | Đang di chuyển |
| `AT_WAREHOUSE` | `bg-violet-100 text-violet-800` | Đến kho khách |
| `UNLOADING` | `bg-amber-100 text-amber-800` | Đang bốc/dỡ hàng |
| `DELIVERED` | `bg-lime-100 text-lime-800` | Đã giao hàng (POD) |
| `RETURNING_EMPTY` | `bg-orange-100 text-orange-800` | Đang kéo vỏ hạ bãi |
| `COMPLETED` | `bg-emerald-100 text-emerald-800` | Hoàn tất chuyến |
| `CANCELLED` | `bg-rose-100 text-rose-800` | Đã hủy |

### 2.3 Màu Nguồn Xe (Vehicle Ownership)

| Loại | Màu Badge | Ý nghĩa |
|---|---|---|
| Xe Nhà (OWNED) | `bg-teal-100 text-teal-800` | Đội xe công ty sở hữu |
| Xe Bạn (SUBCONTRACTOR) | `bg-amber-100 text-amber-800` | Thuê ngoài / 3PL |

---

## 3. HỆ THỐNG TYPOGRAPHY (THANG ĐO CHỮ)

### 3.1 Typography Scale 7 Bậc (Chuẩn ERP Quốc Tế)

| Level | Tailwind | Pixel | Weight | Ứng dụng |
|---|---|---|---|---|
| **Hero KPI** | `text-3xl` | 30px | `font-black` (900) | Số liệu KPI chiến lược BGĐ |
| **H1 Page Title** | `text-2xl` | 24px | `font-black` (900) | Tiêu đề trang, tên phân hệ |
| **H2 Section** | `text-[17px]` | 17px | `font-bold` (700) | Tiêu đề nhóm, section heading |
| **H3 Card** | `text-[15px]` | 15px | `font-bold` (700) | Tiêu đề thẻ card, modal title |
| **Body Main** | `text-sm` | 14px | `font-semibold/bold` | Dữ liệu bảng, tên KH, số tiền, form input |
| **Body Sub** | `text-[13px]` | 13px | `font-medium` (500) | Lộ trình, ghi chú, phụ chú |
| **Caption** | `text-xs` | 12px | `font-bold` (700) | Badge trạng thái, timestamp, metadata |

### 3.2 Font Family

```css
--font-heading: 'Be Vietnam Pro', sans-serif;   /* Tiêu đề, KPI, Badge */
--font-body: 'Plus Jakarta Sans', sans-serif;    /* Nội dung chính */
--font-mono: 'JetBrains Mono', monospace;        /* Mã số cont, biển số, mã HĐĐT */
```

**Quy tắc áp dụng:**
- Class `font-heading`: Mọi tiêu đề, nút hành động chính, mã chuyến
- Class `font-mono`: Biển số xe, số container, mã tra cứu HĐĐT, số Booking
- Body text mặc định: Plus Jakarta Sans

### 3.3 Số Tiền (Currency Display)

- Phân cách hàng ngàn bằng dấu chấm: `1.548.000 đ`
- Hàm chuẩn: `new Intl.NumberFormat('vi-VN').format(n) + ' đ'`
- Font: `tabular-nums` (monospaced cho số) để căn cột thẳng
- Áp dụng: **Mọi ô hiển thị số tiền** — bảng, form, card KPI, box P&L

---

## 4. COMPONENT PATTERNS

### 4.1 KPI Card (Thẻ Chỉ Số)

```
┌─────────────────────────────────────┐
│ [Icon]  Tiêu đề KPI                 │
│         text-[13px] uppercase        │
│                                     │
│ 1.548.000 đ  ← text-3xl font-black  │
│                                     │
│ ▲ +12% so với tuần trước  ← caption │
└─────────────────────────────────────┘
```

**Quy tắc:**
- Viền trái màu brand: `border-l-[5px] border-teal-600`
- Padding: `p-5 md:p-6`
- Background: `bg-white` với `shadow-sm`
- Icon: Phosphor Icons, size `text-xl` / `text-2xl`

### 4.2 Status Badge (Nhãn Trạng Thái)

```html
<span class="px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading
             bg-emerald-100 text-emerald-800 border-emerald-200">
  HOÀN TẤT
</span>
```

**Quy tắc:**
- Luôn `uppercase tracking-wider` để dễ phân biệt
- Font: `font-heading font-bold`
- Border: Cùng màu nhưng nhạt hơn (`border-emerald-200`)
- Padding: `px-2.5 py-1` (không quá to, không quá nhỏ)

### 4.3 Data Table (Bảng Dữ Liệu)

```
Header: bg-slate-50, text-xs font-bold uppercase tracking-wider text-slate-700
Row:    hover:bg-teal-50/30, divide-y divide-slate-100
Cell main:   text-sm font-bold/black text-slate-900
Cell meta:   text-[13px] text-slate-500
Cell number: font-mono tabular-nums
```

**Quy tắc:**
- Header cố định màu `bg-slate-50`
- Hover row: `hover:bg-teal-50/30` (Teal nhạt — brand color)
- Cell số tiền: Căn phải, `font-mono tabular-nums`
- Cell tên: Căn trái, `font-bold`
- Không dùng border giữa các cột (chỉ dùng `divide-y`)

### 4.4 Action Button (Nút Hành Động)

| Loại | Classes | Dùng khi |
|---|---|---|
| **Primary** | `bg-teal-700 hover:bg-teal-800 text-white` | Hành động chính: Tạo mới, Lưu |
| **Success** | `bg-emerald-600 hover:bg-emerald-700 text-white` | Thêm chi phí, Xác nhận |
| **Warning** | `bg-amber-500 hover:bg-amber-600 text-white` | Sửa, Cập nhật |
| **Danger** | `bg-rose-600 hover:bg-rose-700 text-white` | Xóa (có xác nhận) |
| **Secondary** | `bg-slate-100 hover:bg-slate-200 text-slate-700` | Hủy, Đóng |
| **Lock** | `bg-indigo-700 hover:bg-indigo-800 text-white` | Chốt sổ kế toán |

**Quy tắc:**
- Tất cả nút: `rounded-xl px-3.5 py-2 text-xs font-bold font-heading transition-all`
- Icon trong nút: Phosphor Icons, `mr-1.5 text-base`
- Nút ≥44px chiều cao trên mobile (đáp ứng WCAG touch target)

### 4.5 Form Input (Ô Nhập Liệu)

```
Label: text-xs font-bold uppercase tracking-wider text-slate-700
Input: text-sm font-semibold text-slate-900
       border border-slate-300 rounded-xl
       focus:ring-2 focus:ring-teal-500 focus:border-teal-500
       px-3 py-2
```

**Quy tắc:**
- Label luôn ở trên input, không dùng placeholder làm label
- Format số tiền: Tự động thêm dấu phân cách khi người dùng gõ
- Required field: Gắn thêm dấu `*` màu rose
- Error state: `border-rose-500 ring-rose-200`

### 4.6 Modal (Cửa Sổ Popup)

```
Backdrop:   bg-black/60 backdrop-blur-sm
Container:  bg-white rounded-2xl shadow-2xl
            max-w-2xl (form) / max-w-4xl (detail)
Header:     bg-gradient-to-r from-teal-800 to-teal-950 text-white
            p-5 rounded-t-2xl
Footer:     border-t bg-slate-50 p-4 flex justify-end gap-3
```

**Quy tắc:**
- Tiêu đề modal: `text-lg font-black font-heading` trên nền Teal
- Scroll nội dung: Modal body có `overflow-y-auto max-h-[70vh]`
- Luôn có nút Đóng (X) góc trên phải
- Đóng modal khi click backdrop (cho modal xem, không áp dụng với form đang nhập)

### 4.7 Toast Notification

```
Position:   fixed bottom-6 right-6 z-[9999]
Container:  flex items-center space-x-3 p-4 rounded-2xl shadow-lg border
            max-w-sm
Auto-close: 4000ms
```

| Loại | Colors |
|---|---|
| `success` | `bg-emerald-50 border-emerald-200 text-emerald-800` |
| `danger`  | `bg-rose-50 border-rose-200 text-rose-800` |
| `warning` | `bg-amber-50 border-amber-200 text-amber-800` |
| `info`    | `bg-teal-50 border-teal-200 text-teal-800` |

---

## 5. LAYOUT & NAVIGATION

### 5.1 App Shell Structure

```
┌─────────────────────────────────────────────────┐
│  TOPBAR (h-14)    Logo + User + Notifications   │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ SIDEBAR  │  MAIN CONTENT AREA                   │
│  (w-64)  │  .view (hidden / active)             │
│          │                                      │
│ Collaps- │                                      │
│ ible     │                                      │
└──────────┴──────────────────────────────────────┘
```

### 5.2 Sidebar Navigation

- Chiều rộng: `w-64` desktop / Ẩn hoàn toàn trên mobile
- Active link: `bg-teal-700/90 text-white` + viền trái `border-l-[3px] border-teal-300`
- Hover: `hover:bg-white/10`
- Mục menu (từ trên xuống theo thứ tự ưu tiên):

```
1. 📊 Tổng quan Dashboard     → view-dashboard (mặc định khi vào trang)
2. 💼 Sale & Booking           → view-sales
3. 🚚 Điều vận                 → view-dispatch
4. 🚛 Xe & Bãi                 → view-fleet
5. 👥 Hành chính & Nhân sự    → view-personnel
6. 📒 Quản lý Kế toán          → view-accounting
7. 🛃 Dịch vụ Hải quan         → view-customs
```

> **Lưu ý quan trọng:** Link logo / homepage luôn dẫn về view `Dashboard`, không phải Điều vận hay bất kỳ phân hệ nào khác.

### 5.3 View Switching (SPA Navigation)

```javascript
function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden-view'));
    document.getElementById(`view-${viewName}`).classList.remove('hidden-view');
    // Active sidebar link
}
```

---

## 6. RESPONSIVE DESIGN

### 6.1 Breakpoints (Tailwind)

| Breakpoint | Pixel | Áp dụng |
|---|---|---|
| Default | <640px | Mobile — 1 cột, nút to |
| `sm:` | ≥640px | Tablet ngang — 2 cột |
| `md:` | ≥768px | Tablet lớn — 3 cột |
| `xl:` | ≥1280px | Desktop — Layout đầy đủ |

### 6.2 Grid Layout Dashboard

```css
/* Mobile: 1 cột */
grid-cols-1

/* Tablet: 2 cột */
sm:grid-cols-2

/* Desktop: 4 cột KPI cards */
xl:grid-cols-4
```

### 6.3 Trip Detail Layout

```css
/* Mobile: 1 cột (bảng kê trên, App tài xế dưới) */
flex-col

/* Desktop: 2 cột (bảng kê 2/3, App tài xế 1/3) */
xl:flex-row
xl:w-2/3 + xl:w-1/3
```

---

## 7. ACCESSIBILITY & PERFORMANCE

### 7.1 Contrast Ratios (WCAG AA)

- Tất cả text trên background phải đạt tỷ lệ tương phản ≥4.5:1 (text thường)
- Icon-only không được sử dụng — luôn kèm text hoặc `title` attribute
- Focus ring: `focus:ring-2 focus:ring-teal-500` trên tất cả interactive elements

### 7.2 Touch Targets (Mobile)

- Nút bấm tối thiểu 44×44px (WCAG 2.5.5)
- Khoảng cách giữa các nút kề nhau ≥8px
- Tài xế thao tác 1 tay → nút quan trọng ở phần dưới màn hình

### 7.3 Loading States

- Hiển thị spinner hoặc skeleton khi đang fetch API
- Disabled nút khi đang xử lý request (tránh double-submit)
- Toast thông báo kết quả sau mọi action

### 7.4 Số Tiền & Dữ Liệu Tài Chính

> **BẮT BUỘC:** Mọi ô hiển thị số tiền phải áp dụng format phân cách hàng ngàn.  
> **BẮT BUỘC:** Số tổng hợp P&L phải khớp 100% với tổng các dòng chi tiết (Zero Variance).

---

## 8. DESIGN PATTERNS ĐẶC THÙ LOGISTICS

### 8.1 Timeline Tiến Độ (10-Step Workflow)

```
● Hoàn tất  ─── Emerald dot + Emerald border
◉ Đang làm  ─── Teal dot (animate-pulse) + Teal border + ring-4
○ Chưa làm  ─── Slate dot + Slate border
```

### 8.2 P&L Summary Box (3 Thẻ Tài Chính)

```
┌─────────────┐  ┌──────────────────┐  ┌───────────────────────────┐
│ Doanh Thu   │  │ Tổng Chi Phí     │  │ Lợi Nhuận Gộp (Margin)   │
│ Cước        │  │ Thực Tế          │  │                           │
│             │  │                  │  │                           │
│ 3.800.000 đ │  │ 1.548.000 đ      │  │ 2.252.000 đ (59.3%)      │
└─────────────┘  └──────────────────┘  └───────────────────────────┘
 bg-slate-50      bg-rose-50/60         bg-emerald-50/60
 text-slate-900   text-rose-700         text-emerald-700
```

### 8.3 Driver Mobile App Simulator

Giao diện điện thoại giả lập với:
- Khung: `bg-slate-900 rounded-[2.5rem] border-[6px] border-slate-800`
- Notch giả: Thanh đen nhỏ trên cùng
- Header: Gradient `from-teal-800 to-teal-950`
- Body: `bg-slate-50` với scrollable content
- Bottom nav (giả lập): Fixed bottom

### 8.4 Phân Tách Hai Nguồn Tiền

```
┌─────────────────────────────────┐
│ Tài chính & Quỹ                 │
│                                 │
│ Doanh thu │ Chi phí             │  ← Dòng 1
│           │                     │
│ Quỹ Khả Dụng:                   │
│ Tiền mặt  │ Ngân hàng           │  ← Dòng 2
└─────────────────────────────────┘
```

---

## 9. ĐÁC ĐIỂM THẨM MỸ

- **Không dùng màu nguyên bản** (red, green, yellow Tailwind) — Luôn dùng shade (600, 700)
- **Góc bo tròn nhất quán:** `rounded-xl` (input), `rounded-2xl` (card/modal), `rounded-full` (badge)
- **Shadow nhẹ:** `shadow-sm` (card), `shadow-lg` (modal), `shadow-2xl` (phone mockup)
- **Khoảng trắng hào phóng:** Padding `p-5 md:p-6`, gap `gap-4 md:gap-6`
- **Uppercase tracking-wider:** Tất cả nhãn danh mục, tiêu đề thẻ KPI, badge

---

## 10. CHECKLIST THIẾT KẾ (Before Releasing)

- [ ] Tất cả số tiền có dấu phân cách hàng ngàn?
- [ ] Tất cả badge trạng thái có màu đúng quy ước?
- [ ] Tất cả nút hành động có icon + text (không icon đơn độc)?
- [ ] Form input có label rõ ràng (không dùng placeholder thay label)?
- [ ] Toast thông báo kết quả sau mọi action?
- [ ] P&L box khớp 100% với tổng bảng kê chi tiết?
- [ ] Nhấp logo/homepage → Về Dashboard (không phải Điều vận)?
- [ ] Responsive test trên màn hình 1280px và 1920px?
