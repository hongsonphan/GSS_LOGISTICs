# BIM LOGISTICS — UI/UX: BẢN TỔNG HỢP ĐỂ CHUẨN HÓA

> **Mục đích:** Gom toàn bộ nội dung liên quan UI/UX rải trong `docs/` về một chỗ, làm đầu vào để viết lại thành **một bộ chuẩn duy nhất**.
> **Trạng thái:** các mâu thuẫn giữa tài liệu đã được chốt ở Phần 0; nội dung bên dưới áp dụng các quyết định đó.
> **Nguồn đã đọc:** `UI_UX_GUIDELINES.md` (chính), `CODING_STANDARDS.md` (IV, VI, VII), `FEATURES.md` (§2, §14.3, §16–19), `USER_GUIDE.md` (A1–A3, C3.4, D4), `AGENTS.md` (II), `DEVELOPMENT_PLAN.md` (Sprint 3), `CHANGELOG.md` (v4.7.13–v4.7.36), cùng ghi chú phản hồi của người dùng (không dùng badge trong bảng).
> Các file `API_REFERENCE`, `DATABASE_SCHEMA`, `SECURITY_AUDIT`, `OPERATIONAL_WORKFLOW`, `PROJECT_OVERVIEW`, `README` không có nội dung UI đáng kể (chỉ trạng thái nghiệp vụ, đã trích ở 3.2).

---

## 0. CÁC QUYẾT ĐỊNH ĐÃ CHỐT (giải quyết mâu thuẫn giữa các tài liệu)

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Badge trạng thái | **Không bọc badge/pill khi không cần thiết** (xem 2.6). Trong bảng: chữ màu + icon. Pill chỉ khi người dùng yêu cầu hoặc là thông tin chính ở header chi tiết |
| 2 | Nút bấm | Hai cấp: **nút toolbar/form/thanh chi tiết** (viền → nền đặc khi hover, 4.4) và **nút thao tác dòng bảng** (`h-7`, nền nhạt) |
| 3 | Bộ nút dòng bảng | Bảng quyết toán: `Quyết toán \| Xem \| In`; bảng Điều vận: `Xem` + `Xóa` |
| 4 | Màu Neutral | `slate` (không dùng `stone`) |
| 5 | Màu "Đang vận chuyển" | Amber chỉ cho chờ/đang xử lý/cảnh báo; đang di chuyển dùng indigo/blue |
| 6 | Header bảng | Theo `CODING_STANDARDS` VI: `bg-slate-100`, cao 36px, 12.5px, sticky |
| 7 | Đường kẻ cột | Giữ `border-r border-slate-200/70` như bảng ERP hiện có (bỏ quy tắc "không kẻ cột") |
| 8 | Cỡ chữ ô bảng | 13px (mật độ cao) |
| 9 | Viền trái thẻ KPI | `border-l-4`, màu theo ngữ nghĩa |
| 10 | Focus ring | `border-teal-600 ring-2 ring-teal-500/20` |
| 11 | Dropzone hover | `hover:border-teal-500` |
| 12 | Timeline | 11 bước |
| 13 | Nhãn trạng thái chuyến | Dùng nhãn tiếng Việt ở 3.1 |
| 14 | Sidebar | 9 mục theo USER_GUIDE A1; Bản tin/Giao việc gỡ khỏi Sidebar |
| 15 | Đánh số mục | Đã đánh số lại toàn bộ |
| 16 | Thanh chi tiết | Thứ tự `Quay lại \| Sửa \| Lưu \| In \| Xóa`, kiểu viền → nền đặc khi hover. Nút Hủy/Lưu nền đặc chỉ dùng ở header form tạo/sửa |
| 17 | Phông & cỡ chữ | Be Vietnam Pro / Plus Jakarta Sans / JetBrains Mono; cỡ chữ tối thiểu **12px**, thang chuẩn ở 2.3 và Phần 9 (các thẻ 8–11px hiện có cần nâng lên) |

---

## 1. TRIẾT LÝ THIẾT KẾ

1. **Field-First:** ba nhóm người dùng, ba yêu cầu khác nhau.

   | Nhóm | Thiết bị | Yêu cầu |
   |---|---|---|
   | Tài xế | Điện thoại 5–6", một tay, nắng/bụi | Nút ≥44px, tương phản cao, ≤2 chạm |
   | Điều độ viên | Desktop/laptop, nhiều màn hình | Bảng rõ, tìm nhanh, ít cuộn, mật độ cao |
   | Ban Giám Đốc | Laptop/tablet, họp | KPI lớn, đọc trong 30 giây, biểu đồ trực quan |

2. **Clarity over Cleverness:** dữ liệu rõ ràng hơn trang trí; mỗi phần tử phải có mục đích.
3. **Progressive Disclosure:** trang chính chỉ tổng hợp; chi tiết mở khi người dùng bấm (Bảng điều vận → bấm dòng → chi tiết chuyến).
4. **Zero Ambiguity:** mọi trạng thái có nhãn chữ rõ + màu; **không dùng icon đơn độc không chữ** (hoặc ít nhất có `title`).
5. **Gọn màn hình dọc:** không thêm thanh tiêu đề phụ lặp thông tin; gộp tiêu đề vào toolbar bộ lọc.
6. **2-Touch Rule (hiện trường):** xác nhận giao hàng/cập nhật trạng thái không quá 2 bước/chạm.
7. **Offline-ready (tài xế/thủ kho):** payload nhẹ, lưu tạm local, có cơ chế thử lại khi mạng chập chờn.
8. **Zero Variance:** số tổng (P&L, KPI) phải khớp 100% với tổng các dòng chi tiết.

---

## 2. DESIGN TOKENS

### 2.1 Màu ngữ nghĩa

| Token | Tailwind | Hex | Dùng cho |
|---|---|---|---|
| Primary | `teal-700/800` | `#0f766e` / `#115e59` | Thương hiệu, nút chính, sidebar active, mã chuyến, focus |
| Success | `emerald-600/700` | `#059669` / `#047857` | Hoàn tất, hợp lệ, POD đủ, đã quyết toán, luồng xanh, tiền mặt |
| Warning | `amber-500/600` | `#f59e0b` / `#d97706` | Chờ xử lý, cần chú ý, bảo dưỡng, luồng vàng |
| Danger | `rose-600/700` | `#e11d48` / `#be123c` | Lỗi, sự cố OS&D, quá hạn, chi phí, hủy, luồng đỏ |
| Info | `blue-600/700` | `#2563eb` / `#1d4ed8` | Thông tin, mốc hành trình, đã tiếp nhận |
| Neutral | `slate-500/600` | `#64748b` / `#475569` | Nháp, chưa xử lý, dữ liệu phụ |
| Locked | `purple-700/800` | `#7e22ce` / `#6b21a8` | Đã chốt sổ kế toán |
| Sales/CRM | `indigo-600/700` | `#4f46e5` / `#4338ca` | Báo giá, kế hoạch, doanh thu tổng thể |

**Cấm** dùng `red/green/yellow` nguyên bản; luôn dùng shade 600/700. Chữ trên nền phải đạt tương phản ≥4.5:1.

### 2.2 Màu viền trái thẻ KPI (`border-l-4`)

| Màu | Ngữ nghĩa |
|---|---|
| Indigo | Kế hoạch, doanh thu, tổng thể |
| Teal | Tiếp nhận, phương tiện, ngân hàng |
| Emerald | Hoàn thành, tiền mặt, luồng xanh |
| Amber | Chờ nhận lệnh, sản lượng, luồng vàng, bảo dưỡng |
| Rose | Cảnh báo, rủi ro, hạn đăng kiểm, luồng đỏ |

### 2.3 Typography

| Cấp | Tailwind | Cỡ / đậm | Dùng cho |
|---|---|---|---|
| Hero KPI | `text-3xl` | 30px / black | Số KPI chiến lược |
| H1 | `text-2xl` | 24px / black | Tiêu đề trang |
| H2 | `text-[17px]` | 17px / bold | Section |
| H3 | `text-[15px]` | 15px / bold | Card, tiêu đề modal |
| Body main | `text-sm` / `text-[13px]` | 14 / 13px / semibold–bold | Form, dữ liệu bảng |
| Body sub | `text-[13px]`; subtext bảng `text-xs` (12px) | 500 | Lộ trình, ghi chú |
| Caption | `text-xs` | 12px / bold | Timestamp, metadata |

Phông: `--font-heading` Be Vietnam Pro (tiêu đề, KPI, nút chính, mã chuyến) · `--font-body` Plus Jakarta Sans (nội dung) · `--font-mono` JetBrains Mono (biển số, số cont, mã HĐĐT, số booking, số liệu bảng).
Nhãn danh mục/tiêu đề KPI/header bảng: `uppercase tracking-wider`.

### 2.4 Số, tiền, ngày

- Phân cách hàng nghìn bằng dấu chấm: `1.548.000 đ`; hàm chuẩn `new Intl.NumberFormat('vi-VN').format(n) + ' đ'`.
- Class `tabular-nums`; ô nhập tiền dùng `.input-number-vn font-mono font-bold text-teal-800`, tự format khi gõ.
- Số/tiền trong bảng **canh phải**. Đơn vị (`VNĐ`/`km`/`kg`) đặt cố định trong ô bên phải `text-xs font-bold text-slate-400`.
- Giờ dùng định dạng 24h; có nút giờ nhanh (08:00, 13:00, 17:00, 23:59) dưới ô ngày giờ.
- Tên viết tắt khách hàng hiển thị và lưu **IN HOA**.

### 2.5 Hình khối

- Bo góc: `rounded-xl` (input, nút) · `rounded-2xl` (card, modal) · `rounded-full` (pill, avatar) · `rounded-lg` (nút nhỏ trong bảng).
- Bóng: `shadow-sm` (card), `shadow-lg` (toast/dropdown), `shadow-2xl` (modal, phone mockup).
- Khoảng cách theo lưới 8px: card `p-5 md:p-6`, giữa hàng input `space-y-4`, giữa ô `gap-4 md:gap-5`, label–input `mb-1.5`.
- Icon: **Phosphor Icons** (`ph-*`), cỡ `text-base`–`text-xl`.

### 2.6 Nguyên tắc "Không bọc badge khi không cần thiết"

- **Mặc định là chữ thuần.** Loại cont, loại xe, loại hình, trạng thái, nhà xe, nhãn nhóm… hiển thị bằng chữ; cần nhấn thì đổi **màu chữ** và/hoặc thêm **icon nhỏ** (`ph-check-circle`, `ph-clock`), không thêm nền, viền, bo tròn.
- **Chỉ dùng badge/pill khi:** người dùng yêu cầu rõ, hoặc đó là thông tin chính cần quét nhanh (vd. trạng thái ở header chi tiết chuyến), có ít giá trị rời rạc và không lặp qua hàng chục dòng.
- Tối đa **1 badge nổi bật mỗi vùng nhìn**; không đặt badge cạnh badge.
- Số đếm trên tab dùng chữ số trong ngoặc hoặc chữ xám (`Tạm ứng (12)`), không dùng chấm tròn màu.
- Tên viết tắt khách hàng: chữ IN HOA thuần, không bọc.
- Khi sửa/thêm cột bảng, kiểm tra không vô tình thêm pill.

---

## 3. MÀU TRẠNG THÁI NGHIỆP VỤ

### 3.1 Trạng thái chuyến xe (`TripStatus`)

| Mã | Nhãn VI | Màu |
|---|---|---|
| `DRAFT` | Chờ duyệt / Nháp | slate |
| `DISPATCHED` | Đã phát lệnh | blue |
| `ACCEPTED` | Tài xế đã nhận lệnh | teal |
| `CONTAINER_PICKED` | Đã lấy cont | cyan |
| `IN_TRANSIT` | Đang di chuyển | indigo |
| `AT_WAREHOUSE` | Đã đến kho khách | violet |
| `UNLOADING` | Đang đóng / trút hàng | amber |
| `DELIVERED` | Giao nhận thành công (có POD) | lime |
| `RETURNING_EMPTY` | Đang kéo hạ bãi | orange |
| `COMPLETED` | Hoàn tất chuyến | emerald |
| `CANCELLED` | Đã hủy | rose |

Cách thể hiện: dạng nền+chữ (`bg-<c>-100 text-<c>-800 border-<c>-200`) ở nơi được phép dùng badge (header chi tiết chuyến, KPI); **trong bảng** dùng chữ màu `text-<c>-700` + icon.

### 3.2 Trạng thái khác

| Ngữ cảnh | Quy ước |
|---|---|
| Quyết toán | Đã quyết toán: `text-emerald-700 font-bold text-xs` + `ph-check-circle` · Chờ: `text-amber-600` + `ph-clock` |
| Chứng từ POD | Đầy đủ: emerald + `ph-check-circle` · Chưa có: `text-slate-400 font-medium` + `ph-clock` |
| Quỹ điều vận | Chờ Cty duyệt (PENDING) · Đang lưu hành (APPROVED/ACTIVE) · Đã hoàn ứng (SETTLED) · Từ chối (REJECTED) → chữ màu + icon, không pill |
| Nguồn xe | Xe nhà (OWNED): teal · Xe bạn/3PL (SUBCONTRACTOR): amber |
| Tờ khai hải quan | Luồng xanh emerald · vàng amber · đỏ rose |
| Hạn (DEM/DET, đăng kiểm, GPLX, HĐLĐ) | Đếm ngược; ≤30 ngày amber, quá hạn rose |
| Timeline bước | Hoàn tất: emerald · Đang làm: teal + `animate-pulse` + `ring-4` · Chưa làm: slate |
| Cảnh báo thất bại | Cảnh báo kiểu vàng/cam thân thiện, không đỏ gắt, trừ lỗi nghiêm trọng |

---

## 4. COMPONENT

### 4.1 Thẻ KPI

- Khung: `bg-white p-5 rounded-2xl border border-slate-200 shadow-xs border-l-4 hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between`.
- Hàng đầu: tiêu đề `text-[13px] font-bold text-slate-500 uppercase tracking-wider` (trái) + (tùy chọn) chữ phụ/icon màu nhỏ bên phải. Mặc định không dùng pill (xem 2.6).
- Số lớn: `text-3xl font-black text-slate-800 tabular-nums font-heading tracking-tight mt-1` + hậu tố `text-sm font-bold text-slate-500`.
- Dòng phụ: **một dòng**, icon màu nhỏ phía trước, dữ liệu cách nhau bằng `·` mờ, có `truncate` + `title`. Không dùng tiền tố in hoa thô (`KẾ HOẠCH:`, `XE NHÀ:`).
- Dải KPI nhỏ 1 hàng ngang kiểu `1 TUYẾN | 15 CHUYẾN | 1 BÁO GIÁ` (số `font-black tabular-nums`, nhãn uppercase, không xuống dòng).
- **Tương tác:** bấm thẻ → nhảy sang subtab tương ứng hoặc áp bộ lọc (thẻ Cảnh báo lọc ngay danh sách cảnh báo).
- Mỗi phân hệ 4–5 thẻ. Bỏ tiền tố đánh số `1.`, `2.` ở tiêu đề thẻ và nút subtab.

### 4.2 Badge / Pill (chỉ dùng khi được phép)

`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-heading` + bộ màu `bg-<c>-100 text-<c>-800 border-<c>-200`. **Mặc định không dùng trong bảng (2.6).**

### 4.3 Bảng dữ liệu (BIM Table Standard)

- Class bắt buộc `.erp-table` / `.bim-table`; bọc `.erp-table-container` (cuộn dọc, header `sticky top-0 z-10`). Tiện ích: `.row-multiline`, `.erp-subtext`/`.bim-subtext`, `.erp-number-cell`.
- **Header `<th>`:** cao 36px, `py-2 px-3`, `12.5px font-bold uppercase tracking-wider text-slate-700`, nền `bg-slate-100`, viền dưới `border-slate-300`.
- **Dòng 1 tầng:** 34–36px, `py-1.5 px-3`, `text-[13px] text-slate-900`, `border-b border-slate-200/70`. Mục tiêu hiển thị trọn **20 dòng** trên màn hình chuẩn.
- **Dòng nhiều tầng (điều vận):** 46–48px, `py-2 px-3`; dòng chính `13px font-bold leading-snug`, subtext `12px font-medium text-slate-500 leading-tight`, cách nhau cố định `mt-0.5` (không dùng `mt-1/2`).
- **Căn lề:** số/tiền canh phải `font-mono tabular-nums font-bold`; mã/biển số/cont `font-mono font-bold 12.5px` (`text-slate-900` hoặc `text-teal-800`); tên canh trái đậm.
- **Hover dòng:** `hover:bg-teal-50/30`.
- **Cột STT** đánh số theo dòng đang hiển thị (sau lọc). Cột checkbox đặt **trước STT** khi có chọn nhiều (master checkbox ở header; dòng đã quyết toán bị khóa/mờ).
- **Chân bảng** (`BimTableFooter`): tổng hợp các cột tiền, căn đúng số cột.
- **Tùy chỉnh cột** (`BimTableColumnManager.register(tableId)`): nút `Cột` mở modal *Tùy Chỉnh Cột Hiển Thị* — tick ẩn/hiện, kéo ⋮⋮ hoặc mũi tên lên/xuống đổi thứ tự, ô tìm cột, `Hiện tất cả`, `Mặc định`, `Hoàn tất`. Cột `data-col-locked="true"` không ẩn được. Mọi cột trong DB phải xuất hiện trong danh sách. Cấu hình lưu theo trình duyệt từng người; kéo rộng cột được.
- **Sắp xếp:** bấm tiêu đề cột; icon `ph-arrows-down-up` / `ph-arrow-up` / `ph-arrow-down`. Có thể thêm dropdown *Sắp xếp nhanh*.
- **Bộ đếm:** `Hiển thị: X / Y` dưới/bên toolbar.

### 4.4 Nút bấm

**Nút toolbar / form / thanh chi tiết** (outline → solid khi hover):

| Loại | Màu | Mặc định | Hover | Dùng cho |
|---|---|---|---|---|
| Primary | Teal | `bg-transparent border-teal-600 text-teal-700` | `hover:bg-teal-600 hover:text-white` | Tạo mới, Lưu, Xem |
| Warning | Amber | `border-amber-600 text-amber-700` | `hover:bg-amber-600` | Sửa, Cập nhật |
| Secondary/Print | Slate | `border-slate-600 text-slate-700` | `hover:bg-slate-700` | In, Đóng, Quay lại |
| Danger | Rose | `border-rose-600 text-rose-700` | `hover:bg-rose-600` | Xóa (có xác nhận), Hủy |
| Finance | Emerald | `border-emerald-600 text-emerald-700` | `hover:bg-emerald-600` | Thu tiền, Xuất Excel |
| Sales | Indigo | `border-indigo-600 text-indigo-700` | `hover:bg-indigo-600` | Báo giá, Khách hàng |

- Chung: `rounded-xl px-3.5 py-2 text-xs font-bold font-heading border-[1.5px] transition-all duration-200`; icon `mr-1.5 text-base`, đổi trắng khi hover; hover/active có `cursor-pointer`.
- **Thanh chi tiết, thứ tự chuẩn:** `Sửa | Lưu | In | Xóa`, đặt `Back/Quay lại` ở đầu thanh.
- Nút chính trên Topbar phân hệ: `bg-teal-700 hover:bg-teal-800 text-white rounded-xl`; nút phụ: `bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl`.

**Nút thao tác dòng bảng:** `h-7 px-2.5 text-xs font-bold rounded-lg` + icon:
- Xem: `bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200` + `ph-eye`.
- In: `bg-white hover:bg-slate-50 text-slate-700 border-slate-200` + `ph-printer`.
- Xóa: `bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border-rose-200`.
- Quyết toán: `bg-emerald-700 hover:bg-emerald-800 text-white` + `ph-check-circle`. Duyệt quỹ: `bg-amber-600 hover:bg-amber-700`. Đã xong: `bg-slate-100` + `ph-check text-emerald-600`.
- Bảng quyết toán dùng bộ `Quyết toán | Xem | In`; bảng Điều vận chỉ `Xem` + `Xóa` (không đặt nút `Sửa` ngoài dòng).

**Quy tắc chung:** Disable nút và hiện spinner khi đang xử lý (chống double-submit); thao tác hủy/xóa luôn có hộp xác nhận; thao tác gom (chọn nhiều) hiện nút `… (n)` chỉ khi đủ điều kiện (vd. ≥2 chuyến) và xác nhận bằng modal nêu số lượng.

### 4.5 Form & ô nhập

- **Ô nhập:** cao `h-10` (40px) hoặc `h-11` (44px cho cảm ứng); `rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900`.
- **Focus:** `focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 focus:outline-none`. **Lỗi:** `border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30`. **Hợp lệ:** icon `ph-check-circle text-emerald-600` bên phải.
- **Label:** luôn ở trên ô, `text-xs md:text-[13px] font-bold text-slate-700 mb-1.5 block`; **không dùng placeholder thay label**. Bắt buộc: dấu `*` `text-rose-600 font-bold`. Helper: `text-xs text-slate-500 mt-1`.
- **Validation:** (1) inline — viền đỏ + dòng mô tả đỏ dưới ô, tự xóa khi bắt đầu gõ; (2) toast cảnh báo + tự focus ô lỗi đầu tiên. **Không dùng `required` HTML5 ẩn** gây lưu im lặng; validate bằng JS có toast (v4.7.34).
- **Ô chọn có tìm kiếm** (combobox): gõ lọc; có nút `+` / `Tạo mới` cạnh ô để tạo nhanh danh mục bằng modal, không rời màn hình. Khi nạp lại danh mục phải giữ nguyên giá trị đang chọn.
- **Dropdown Loại hình vận chuyển:** chỉ `Nhập / Xuất / Nội địa`; chuẩn hóa giá trị đầu vào, **không tự thêm option mới**.
- **Dropzone chứng từ:** `border-2 border-dashed border-slate-200 hover:border-teal-500 bg-slate-50/60 rounded-xl p-4 md:p-5 text-center`; hỗ trợ kéo thả, bấm chọn, dán ảnh (Ctrl+V); JPG/PNG/PDF. Danh sách file: icon theo đuôi (PDF đỏ, Excel xanh lá, ảnh xanh dương), tên rút gọn, dung lượng, nút ✕.

### 4.6 Bố cục form

1. **Header form:** tiêu đề `font-heading font-black text-xl` + tiến độ điền/timestamp (trái); breadcrumb + nút Hủy/Lưu (phải).
2. **Tab phân tầng** (form đa bước): tên nhóm + % hoàn tất; tab active `border-b-2 border-teal-700 text-teal-800 font-bold`.
3. **Lưới:** 2/3 – 1/3 cho trang lớn (cột chính 8/12 là các Card nghiệp vụ; cột phụ 4/12: Trạng thái, Dropzone, Quick Master Data). Nền tổng `bg-slate-100/70`; mỗi nhóm là Card `bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-sm mb-5`.
4. **Tiêu đề nhóm:** `text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 mb-4 border-b border-slate-100`, kèm icon/nút `+ Thêm dòng`.
5. **Ghép cặp bắt buộc cùng hàng:** Mã & Tên đối tác · Nơi đi & Nơi đến · Ngày bắt đầu & kết thúc · SĐT & Email · Số TK & Ngân hàng. Lưới `grid-cols-1 md:grid-cols-2 gap-4 md:gap-5` hoặc `md:grid-cols-3 gap-3.5`.
6. **Cấm "hàng lủng":** hàng 2 cột chỉ có 1 trường → `col-span-2` hoặc ghép thêm trường phụ.
7. **Giữ cân đối:** ví dụ form chuyến xe hàng thông tin phụ chia 4 cột đều (Cắt CY/SI · Invoice · Dock · Giờ hẹn đóng hàng); bỏ trường rác (`Vị trí cont`).
8. **Ba điểm vận chuyển, thứ tự cố định:** `Nơi Lấy Cont` → `Kho Đóng/Trả Hàng` → `Nơi Trả Cont`. Nhãn ghi chú thống nhất: **`Ghi Chú Vận Chuyển / Hàng Hóa`** (form sửa) và **`Ghi Chú Vận Chuyển / Lưu Ý Điều Độ`** (form tạo).

### 4.7 Modal

- Backdrop `bg-black/60 backdrop-blur-sm`; khung `bg-white rounded-2xl shadow-2xl`, `max-w-2xl` (form) / `max-w-4xl` (chi tiết).
- Header `bg-gradient-to-r from-teal-800 to-teal-950 text-white p-5 rounded-t-2xl`, tiêu đề `text-lg font-black font-heading`, có nút Đóng (X) góc phải.
- Body `overflow-y-auto max-h-[70vh]`; footer `border-t bg-slate-50 p-4 flex justify-end gap-3`.
- Click backdrop để đóng chỉ với modal xem, **không** với form đang nhập. ESC đóng.
- `closeModal(id)` phải gỡ cả `hidden-view` và `hidden`.
- **Kỹ thuật:** mọi modal nằm ngang cấp `<body>`, không lồng nhau; thẻ `<div>` mở/đóng phải cân bằng (lỗi unclosed div từng làm ẩn các modal phía sau, v4.7.36).
- Hộp xác nhận (Confirm Modal) cho thao tác không thể hoàn tác, nêu rõ số lượng bản ghi.
- Drawer/Slide-over dùng cho chi tiết nhanh (vd. task trên Dashboard).

### 4.8 Toast

`fixed bottom-6 right-6 z-[9999] max-w-sm p-4 rounded-2xl shadow-lg border`, tự đóng 4000ms.

| Loại | Màu |
|---|---|
| success | `bg-emerald-50 border-emerald-200 text-emerald-800` |
| danger | `bg-rose-50 border-rose-200 text-rose-800` |
| warning | `bg-amber-50 border-amber-200 text-amber-800` |
| info | `bg-teal-50 border-teal-200 text-teal-800` |

Mọi action đều phải có toast kết quả.

### 4.9 Subtabs

`bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto`. Tab chọn: nền đậm/nhạt rõ hoặc gạch chân; tab không chọn: chữ xám, hover mượt. Có thể kèm badge đếm số (vd. Tạm Ứng Tài Xế: số chưa hoàn).

### 4.10 Thanh lọc & tìm kiếm

- Gộp trong toolbar: ô **Kỳ** (Hôm nay / 10 ngày qua / Tháng này / Quý này / Năm nay / Tất cả; có thêm Tuần này, Tháng trước ở quyết toán gom) · lọc Khách hàng/Tài xế/Trạng thái/Loại hình · **ô tìm kiếm đa năng** (mã chuyến, cont, seal, booking, invoice, biển số, vendor) · dropdown sắp xếp nhanh · nút `Đặt lại`, `Cột`, `Xuất Excel`, `Làm Mới`.
- Toggle ẩn/hiện chuyến đã hoàn thành (1 click).

---

## 5. LAYOUT & ĐIỀU HƯỚNG

### 5.1 App shell

Topbar `h-14` (logo, tên màn hình, `Trợ giúp`, chuông thông báo, avatar) · Sidebar `w-64` (thu gọn/ghim được; ẩn hoàn toàn trên mobile) · vùng làm việc `.view` · bong bóng chat góc dưới phải. SPA chuyển view bằng `showView()` (class `hidden-view`); 14 view: dashboard, dispatch, trip-detail, sales, booking-detail, accounting, settlement, fleet, personnel, reports, master-data, customs, quotation-detail, create-trip.

### 5.2 Sidebar

- Active: `bg-teal-700/90 text-white border-l-[3px] border-teal-300`; hover `hover:bg-white/10`.
- Chỉ hiện menu người dùng có quyền.
- Thứ tự (theo USER_GUIDE A1): Dashboard Tổng quan `/` · Sale & Booking `/sales` · Điều vận `/dispatch` · Xe & Bãi `/fleet` · Hành chính & Nhân sự `/hr` · Tài chính & Kế toán `/accounting` · Dịch vụ Hải quan `/customs` · Báo cáo & Thống kê `/reports` · Cài đặt `/settings`.
- **Bản tin** và **Giao việc** đã gỡ khỏi Sidebar; mở từ Dashboard bằng `[Xem tất cả]` / `[Bảng việc]`, và có nút `[← Tổng quan]` ở trang con.
- **Logo/trang chủ luôn về Dashboard**, không về Điều vận.

### 5.3 Avatar dropdown (Topbar)

Avatar tròn + icon vai trò (Vương miện: Giám đốc · Vô lăng: Điều phối · Máy tính: Kế toán · Xe tải: Lái xe), chấm xanh hoạt động, tên/chức vụ. Dropdown: card hồ sơ (họ tên, chức danh, phòng ban, username, email, mã NS) → `Cài đặt` / `Hướng dẫn sử dụng (/helps)` / `Đăng xuất`. Nút Đăng xuất **chỉ nằm trong dropdown này**. Click ngoài hoặc ESC đóng; caret xoay 180°.

### 5.4 Kiến trúc trang 4 tầng (mọi phân hệ chính)

1. **Topbar phân hệ:** trái — tên phân hệ `text-xs font-bold text-slate-500 uppercase tracking-wider` + icon `text-sm`; phải — cụm nút chính (Làm mới, Tạo mới, Xuất Excel…).
2. **Bộ thẻ KPI** (4–5 thẻ, 4.1).
3. **Subtabs** (nếu có, 4.9).
4. **Thẻ dữ liệu:** toolbar lọc + bảng `erp-table`, col-resize, phân trang, audit trail. Tiêu đề danh sách tích hợp vào toolbar.

### 5.5 Thao tác chung trên danh sách và chi tiết (từ USER_GUIDE A2–A3)

- Danh sách: thẻ KPI → Kỳ → bộ lọc → bảng; `Xem` cuối dòng mở chi tiết toàn trang; `In` nhanh ở cuối dòng.
- Chi tiết: mở **chế độ chỉ xem**, bấm `Sửa` mới mở khóa ô; `Back/Quay lại` giữ nguyên bộ lọc danh sách.
- Thiếu ô bắt buộc → báo đỏ ô đó, không lưu.

### 5.6 Màn hình chi tiết chuyến xe (bố trí dọc, full-width)

1. Thanh trên: mã chuyến, trạng thái, loại hình, khách hàng + nút (`Sửa`, `Xóa Phiếu`, `Nhân bản Lệnh`, `Link Tài Xế`, `Nhắn Zalo`, `Link Gửi Khách`, `Màn Hình Tài Xế`).
2. Khung *Cập nhật tiến độ hành trình* (Bước tiếp theo, `Xác Nhận Thay Tài Xế`, `Phân Xe / Tài Xế Khác`, `Thêm Chi Phí`, `Đính Kèm Chứng Từ / POD`, `Ghi Nhận Sự Cố`).
3. Khối 1 — Thông tin vận chuyển & chứng từ EIR (4 thẻ + hành trình 3 điểm).
4. Khối 2 — Hạn Free DEM/DET & EIR (3 thẻ + thanh theo dõi neo đêm).
5. Khối 3 — Tiến độ 7 mốc thời gian thực tế (ETA, kho gọi vào, vào thực tế, kho gọi ra, ra thực tế, giờ hẹn hạ, giờ hạ thực tế).
6. Ghép 2 cont 20ft (nếu có) · Bảng kê chi phí 8 mục + P&L · Timeline 11 bước kèm chứng từ · Chứng từ gốc & HĐĐT.
- Không để chữ bị cắt cụt (truncate) hoặc chen chúc trên laptop/tablet.

### 5.7 Dashboard theo vai trò

- Thanh chào cá nhân hóa + **Executive Role Switcher** (chỉ Ban Giám Đốc/Superuser): Ban Giám Đốc, Kế Toán, Điều Vận, Kinh Doanh, Đội Xe, Nhân Sự. Người thường: ẩn, cố định vai trò.
- 4 thẻ KPI / vai trò (chi tiết nội dung KPI xem `FEATURES.md` §2.2).
- Hàng 3: Widget **Công việc cần xử lý** (mặc định 62%, có List/Kanban mini TODO–IN_PROGRESS–REVIEW; hiển thị Người giao/Người phụ trách/Người theo dõi) và Widget **Bản tin**; thanh kéo `#dash-widget-resizer` (25–75%, đổi tím Indigo khi hover) lưu `localStorage` (`bim_widget_split_ratio`, chế độ xem `bim_dashboard_task_view_mode`). Hai ô luôn **cao bằng nhau** (`items-stretch`).
- Biểu đồ đôi (xu hướng + donut), thanh kéo `#dash-chart-resizer` (20–80%, `bim_chart_split_ratio`), gọi `Chart.resize()` sau khi kéo. Mỗi ô có `openChartCustomizer(n)` và nút `[Mặc định]` riêng. Chọn được nguồn dữ liệu (8 nguồn), trục nhóm, chỉ số, phép tính SUM/AVG/COUNT, loại biểu đồ (bar, horizontal_bar, line, doughnut, pie). Ngôn ngữ thuần Việt, không dùng từ "BI".
- Quy ước màu biểu đồ Ban Giám Đốc: Doanh thu cước = cột Teal · Chi phí = cột Amber · Lợi nhuận gộp = đường Emerald.
- Bảng P&L chi tiết từng chuyến **không** đặt trên Dashboard.

### 5.8 Màn hình Báo cáo

14 báo cáo, 4 nhóm; lọc kỳ Hôm nay/Tuần/Tháng/Quý/Năm/Tất cả; có Xuất Excel và In. Màu theo token: Teal chủ đạo, Emerald thành công, Amber cảnh báo hạn, Rose quá hạn. Biểu đồ: cột chồng, đường xu hướng, đồng hồ gauge công suất.

---

## 6. RESPONSIVE & TRUY CẬP

### 6.1 Breakpoint

| Điểm | Rộng | Layout |
|---|---|---|
| mặc định | <640px | 1 cột, nút to |
| `sm` | ≥640 | 2 cột |
| `md` | ≥768 | 3 cột |
| `xl` | ≥1280 | đầy đủ (KPI `xl:grid-cols-4`, chi tiết chuyến 2/3 + 1/3) |
| `2xl` | ≥1536 | dùng một số cỡ chữ tăng thêm (đã có trong code) |

Kiểm tra trên 1280px, 1440×900 và 1920×1080.

### 6.2 Mobile/Tài xế

- Nút ≥44×44px, khoảng cách ≥8px, nút quan trọng ở nửa dưới màn hình.
- Cổng tài xế truy cập bằng link token, không cần tài khoản.
- Mô phỏng điện thoại: `bg-slate-900 rounded-[2.5rem] border-[6px] border-slate-800`, notch giả, header gradient `from-teal-800 to-teal-950`, body `bg-slate-50`, bottom nav cố định.

### 6.3 Trạng thái tải và thông báo

- Spinner/skeleton khi gọi API; disable nút khi đang gửi; toast sau mọi action.
- Dữ liệu danh mục đồng bộ không cần tải lại trang (BroadcastChannel + poll 15 giây `/api/master-data/version/`); giữ giá trị người dùng đang nhập.

### 6.4 Truy cập

Tương phản ≥4.5:1; không icon đơn độc; focus ring trên mọi phần tử tương tác; hỗ trợ ESC, click-outside; cuộn ngang bảng thay vì làm vỡ layout.

---

## 7. MẪU ĐẶC THÙ LOGISTICS

- **Timeline 11 bước** (4.1 cột USER_GUIDE C3.4): Nhận booking → Phát lệnh → Tài xế nhận → Xuất phát/hẹn đến → Đến cổng kho → Bắt đầu đóng/trả hàng → Đóng/trút xong → Ký đủ chứng từ (POD) → Vận chuyển về bãi hạ → Đã hạ cont (EIR hạ) → Tổng hợp chi phí & đối soát. Hoàn tất=emerald, đang làm=teal pulse, chưa=slate.
- **Hộp P&L chuyến (3 thẻ):** Doanh thu cước `bg-slate-50 text-slate-900` · Tổng chi phí thực tế `bg-rose-50/60 text-rose-700` · Lợi nhuận gộp (kèm %) `bg-emerald-50/60 text-emerald-700`. Phải khớp bảng kê chi tiết.
- **Bảng kê chi phí 8 mục** với cụm 3 nút phân loại trách nhiệm chi trả.
- **Tài chính & Quỹ:** tách Doanh thu | Chi phí (dòng 1); Tiền mặt | Ngân hàng (dòng 2).
- **Sổ quỹ:** 4 thẻ KPI (Tồn quỹ tiền mặt, Số dư ngân hàng, Tổng tồn quỹ, Dòng tiền thuần); phiếu `PT-YYYY-XXX` / `PC-YYYY-XXX`.
- **Kế toán — 7 subtab:** Sổ Quỹ Thu-Chi · Tạm Ứng Tài Xế · Quỹ Điều Vận · Khóa Sổ Chuyến Xe · Khoản Chi Hộ · Xe Bạn (3PL) · Vé BOT Tuyến (badge đếm trên 3 tab đầu có số chờ xử lý).
- **Quyết toán gom chuyến:** gom theo Tài xế/Khách hàng/Đầu xe; kỳ; trạng thái sổ (Chờ / Tất cả / Đã quyết toán – khóa); KPI đối soát (chuyến chọn/tổng, tổng đã tạm ứng, thực chi hợp lệ, chênh lệch hoàn/chi bù).
- **Bảng Điều vận:** 10 cột (STT, Mã chuyến `GSS-MMDD-XXX`, Lịch đóng, Khách hàng & Kho, Booking/Cont/Seal, Invoice/Dock, Xe kéo & Xe hạ, Ghi chú vận chuyển, Nơi lấy → Nơi hạ, Trạng thái); KPI: Tổng chuyến tháng · Đang chạy hôm nay · Chờ duyệt phí · Cảnh báo Cắt Máng; lọc có *Cắt Kéo*, *Ghép 2 Cont 20ft*, *Cảnh báo quá hạn Free DET*. Bỏ cột "Vị trí cont".
- **Cảnh báo chủ động:** chuông thông báo Topbar (vỏ cont còn hạn <24h, chưa hạ bãi khi cách giờ Cắt Máng <2h).

---

## 8. IN ẤN

A4 (A5 cho phiếu thu/chi 1 liên); dọc cho văn bản, ngang cho bảng nhiều cột và bảng kê 26 cột; bật *Background graphics* để giữ logo/viền/màu. Xuất Excel theo chuẩn kế toán VN: tiêu đề công ty, kẻ bảng, định dạng tiền VNĐ.

---

## 9. HIỆU NĂNG TẢI & THỊ GIÁC CHO NGƯỜI DÙNG VĂN PHÒNG

Mục tiêu: màn hình **vào nhanh, đọc lâu không mỏi mắt, chỉ nổi bật đúng thứ cần hành động**.

### 9.1 Giảm màu mè (thị giác)

1. **Nền yên tĩnh:** nền trang `slate-50`/trắng; chỉ dùng nền màu cho vùng cảnh báo thật sự. Không dùng gradient ngoài header modal/phone mockup.
2. **Ngân sách màu:** mỗi màn hình tối đa **1 màu thương hiệu (teal) + 1 màu cảnh báo (amber/rose)** nổi bật cùng lúc. Phần còn lại là slate.
3. **Màu mang nghĩa, không trang trí:** emerald = tốt, amber = chú ý, rose = lỗi/quá hạn, còn lại trung tính. Bỏ màu nền cho cột thông thường, thẻ phụ, tiêu đề nhóm.
4. **Thẻ KPI:** viền trái 4px là điểm nhấn duy nhất; nền trắng, số màu `slate-800`. Không tô nền thẻ theo màu, không viền đủ 4 cạnh màu.
5. **Chữ:** chính `slate-900`/`slate-800`, phụ `slate-500`/`slate-600` (đạt ≥4.5:1). Tránh `slate-400` cho nội dung cần đọc (chỉ dùng cho helper/placeholder).
6. **Bóng & viền:** viền `slate-200` 1px + `shadow-sm` là đủ; bỏ `shadow-lg/2xl` ở thẻ thường; không hiệu ứng nhấp nháy/`animate-pulse` ngoài bước timeline "đang làm".
7. **Hover:** chỉ đổi nền rất nhạt (`teal-50/30`), không phóng to, không làm nhảy layout.
8. **Chữ in hoa:** chỉ cho header cột và nhãn nhóm ngắn; không in hoa cả câu hoặc dữ liệu dài.
9. **Token màu:** không hard-code hex trong template, để sau này làm chế độ dịu mắt (dark) dễ dàng.

### 9.2 Thang chữ vừa phải, thống nhất

| Vai trò | Cỡ | Đậm | Ghi chú |
|---|---|---|---|
| Số KPI lớn | 28–30px (`text-3xl`) | black | Chỉ trên thẻ KPI/Dashboard |
| Tiêu đề trang | 20–24px | bold/black | Một lần mỗi trang |
| Tiêu đề section/card, modal | 15–17px | bold | |
| **Nội dung chính (form, input)** | **14px** | semibold | Cỡ mặc định đọc lâu |
| **Dữ liệu bảng** | **13px** | medium; cột chính bold | Mật độ cao nhưng vẫn dễ đọc |
| Subtext, ghi chú, helper | 12px | medium | |
| Header cột, caption | 12px | bold | **Không nhỏ hơn 12px** |

- Chỉ **3–4 cỡ** trên một màn hình (vd. 24 / 14 / 13 / 12). Cấm cỡ lẻ `text-[8px]`, `[9px]`, `[10.5px]`, `[11px]` cho nội dung cần đọc; thay bằng 12px.
- Độ đậm tối đa 3 mức (`medium`, `semibold`, `bold`). `font-black` chỉ cho số KPI và tiêu đề trang; không đặt cả bảng ở `font-bold`.
- Giãn dòng: `leading-snug` cho bảng, `leading-normal` cho đoạn văn.
- `tabular-nums` cho số để cột thẳng hàng; `font-mono` chỉ cho mã (cont, biển số, số HĐ), không áp cho mọi số tiền.
- Tối đa 2 phông (heading + body) + mono cho mã.

### 9.3 Mật độ & bố cục

- Bảng 34–36px/dòng, 20 dòng/màn hình; không thêm thanh tiêu đề thẻ phụ lặp ý.
- Thông tin quan trọng ở **trên-trái**, hành động chính ở **trên-phải**, thông tin phụ cuộn xuống (Progressive Disclosure).
- Mỗi màn hình **một hành động chính** (một nút teal đặc); các nút còn lại viền/xám.
- Khoảng trắng theo bước 8px; ô bảng không nhỏ hơn `py-1.5`.
- Nhãn ngắn, một nghĩa; thuật ngữ thống nhất toàn hệ thống.

### 9.4 Hiệu năng tải (đo từ mã hiện tại)

Hiện trạng đã kiểm tra trong `templates/base.html` và `static/`:
- `static/js/app.js` ≈ **2,5 MB** một file (`FEATURES.md` ghi ~1 MB là đã cũ).
- 3 file CSS Phosphor (`regular`, `fill`, `bold`) nạp chặn render; thêm `main.css` ≈ 69 KB, `tailwind.css` ≈ 108 KB, `contrast.css`.
- `chart.umd.min.js` nạp đồng bộ trong `<head>` dù chỉ Dashboard/Báo cáo dùng.

Khuyến nghị theo thứ tự lợi ích/chi phí:

| # | Việc | Lợi ích |
|---|---|---|
| 1 | Nén gzip/brotli và cache dài (tên file có hash, `Cache-Control: immutable`) cho JS, CSS, font | Giảm truyền tải nhiều lần; lần sau gần như 0 |
| 2 | Minify `app.js` trong `build_app_js.py` (nếu chưa) | Giảm kích thước và thời gian parse |
| 3 | `defer` cho `app.js`; nạp `chart.umd.min.js` lười, chỉ khi mở Dashboard/Báo cáo | Hết chặn render, trang hiện sớm hơn |
| 4 | Gộp/giảm bộ icon Phosphor (bỏ `bold` nếu ít dùng) hoặc dùng subset | Bớt request và CSS chặn |
| 5 | Tự host font, `font-display: swap`, subset Latin + Vietnamese, tối đa 2–3 độ đậm mỗi font, `preload` font chính | Hết chữ nhấp nháy, giảm dung lượng |
| 6 | Tách `app.js` theo phân hệ, nạp khi vào view (làm sau mục 1–3) | Giảm mạnh JS ban đầu |
| 7 | Bảng dài: phân trang hoặc chỉ dựng ~50–100 dòng; debounce ô tìm kiếm 250–300 ms | Mượt khi có hàng nghìn chuyến |
| 8 | Skeleton thay spinner toàn trang; tải KPI và bảng song song | Cảm giác nhanh hơn |
| 9 | Ảnh chứng từ: thumbnail + `loading="lazy"`, nén khi upload | Giảm băng thông màn hình chi tiết |
| 10 | Bỏ hiệu ứng tốn GPU: `backdrop-blur` trên modal lớn, animation lặp vô hạn | Máy văn phòng yếu vẫn mượt |

Ngân sách đề xuất: JS ban đầu ≤ 600 KB nén, CSS ≤ 100 KB nén, LCP ≤ 2,5 s trên mạng văn phòng, phản hồi sau khi bấm ≤ 100 ms.

---

## 10. QUY TRÌNH KHI SỬA GIAO DIỆN (từ CLAUDE.md, AGENTS.md)

- Sửa nguồn trong `static/js/src/app/**` rồi chạy `python scripts/build_app_js.py`; sửa class Tailwind thì `python scripts/build_css.py`; kiểm tra bằng `--check` trước khi commit. `static/js/app.js` và `static/css/tailwind*.css` là file tự sinh, không sửa tay.
- File JS mới phải khai báo trong `static/js/src/app/manifest.txt`.
- Trước khi đổi/xóa hàm JS, class CSS, component, endpoint: rà soát mọi phân hệ phụ thuộc; giữ nguyên ID DOM và binding JS.
- Cân bằng thẻ HTML, kiểm tra `node -c static/js/app.js`, chạy test (`python manage.py test apps.dispatch --keepdb`).
- Xác minh bằng ảnh trên viewport 1440×900 và 1920×1080.

---

## 11. CHECKLIST TRƯỚC KHI PHÁT HÀNH

- [ ] Mọi số tiền có dấu chấm ngăn nghìn, canh phải, `tabular-nums`.
- [ ] Màu trạng thái đúng quy ước; **không bọc badge khi không cần thiết** (2.6).
- [ ] Không cỡ chữ <12px; ≤4 cỡ chữ mỗi màn hình; ≤1 màu thương hiệu + 1 màu cảnh báo nổi bật mỗi màn hình.
- [ ] Không thêm script/CSS chặn render; bundle trong ngân sách (9.4).
- [ ] Nút có chữ (không icon đơn độc); đúng thứ tự `Sửa | Lưu | In | Xóa`; thao tác xóa có xác nhận.
- [ ] Form: label trên ô, không placeholder thay label, dấu `*`, validate inline + toast, không có hàng lủng.
- [ ] Bảng: `.erp-table`, header sticky, cột tùy chỉnh được, STT/Chân bảng đúng.
- [ ] KPI card đúng khung, bấm được để lọc/nhảy tab.
- [ ] Logo → Dashboard.
- [ ] P&L khớp 100% tổng chi tiết.
- [ ] Responsive 1280/1440/1920; mobile tài xế nút ≥44px.
- [ ] Build `app.js` / `tailwind.css` khớp (`--check`).

---

## 12. QUY ĐỊNH RIÊNG CỦA GSS (theo yêu cầu trực tiếp của người dùng — ưu tiên hơn các mục trên khi mâu thuẫn)

1. **Một giao diện duy nhất tại `/`** (khung BIM, màn GSS nhúng bên trong). Không có trang riêng `/gss/`, không nhánh giao diện thứ hai.
2. **Sidebar GSS (đúng tên):** Dashboard Tổng quan · Sale & Booking · Điều vận & Vendor · Bãi & Phương Tiện · Hành chính & Nhân sự · Tài chính & Kế toán · Báo cáo · Cài đặt. Không có Hải quan, không có link "Điều hành GSS".
3. **Nội dung rộng hết khung**, không chừa lề trống hai bên (không `max-w` + `mx-auto` cho vùng làm việc).
4. **Dashboard Tổng quan gồm:** 5 thẻ KPI (Kinh doanh · Vận hành chuyến · Khả dụng đội xe · Bãi Đắk Nông · Cảnh báo DEM/DET) theo mẫu demo — tiêu đề đánh số + icon, giá trị lớn, 2 dòng phụ, nút điều hướng (ngoại lệ có chủ đích so với 4.1: GSS giữ đánh số) → 2 biểu đồ (cột: cont theo khách hàng; donut: cont chia theo nhà xe) → "Theo dõi hành trình xe container".
5. **"Ma trận theo dõi nhà xe" tạm ẩn** khỏi Dashboard (mã giữ nguyên, bật lại bằng cách bỏ comment `root.append(card)` trong `static/js/gss/console.js`; dữ liệu vẫn nằm trong API).
6. **Theo dõi hành trình xe container:**
   - Hình xe là đầu kéo + sơ mi rơ-moóc, **đầu xe quay sang phải**, vẽ đúng hình mẫu; **biển số in trên thùng xe** (ví dụ `51H-334.70`).
   - Hình xe vẽ **một lần**, dùng lại: `static/js/gss/truck.js` → `GSSTruck.make(biển_số)` (sao chép từ một mẫu). Cần hình xe ở màn khác thì gọi hàm này, không vẽ lại.
   - Ô thông tin bên trái (`fleet-who`): **hàng trên = tên viết tắt khách hàng (bọc viền)**; **hàng dưới = số cont**, xe ghép 2 cont thì `CONT1/CONT2`. Biển số, nhà xe, tài xế chỉ hiện ở tooltip.
   - Tiêu đề 7 mốc: **VIẾT HOA, cỡ chữ lớn (13px)**, được xuống dòng, không đè nhau.
   - Tìm kiếm phải khớp cả số cont thứ 2.
7. **Dữ liệu khách hàng không lộ ra trang tài xế/vendor token** (`customer`, `customer_short` bị loại khỏi payload `/api/qr/t/...`).
