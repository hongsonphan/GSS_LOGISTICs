# BIM LOGISTICS — API REFERENCE (Tài liệu REST API Đầy Đủ)
## Interface Architecture & RESTful API Specification

> **Phiên bản:** v4.7.18 | **Cập nhật lần cuối:** 01/11/2026  
> **Base URL:** `http://localhost:8085`  
> **Data Format:** JSON / Multipart Form-Data (Tải tệp $\le 5$MB)  
> **Kiến trúc:** RESTful API • JWT & Session Authentication • Django REST Framework  
> **Tiêu chuẩn:** OpenAPI 3.0 / Arc42 Section 6 (Runtime & Interface Architecture)

---

## TỔNG QUAN ENDPOINTS

| Method | Endpoint | Class | Mô tả |
|---|---|---|---|
| `GET` | `/api/dashboard/` | `DashboardBGDAPIView` | Dashboard Ban Giám Đốc |
| `GET` | `/api/trips/` | `TripListCreateAPIView` | Danh sách chuyến xe + KPI điều vận |
| `POST` | `/api/trips/` | `TripListCreateAPIView` | Tạo lệnh điều động mới |
| `GET` | `/api/trips/{trip_code}/` | `TripDetailAPIView` | Chi tiết chuyến xe + Bảng kê P&L |
| `POST` | `/api/trips/{trip_code}/expenses/` | `TripAddExpenseAPIView` | Thêm khoản chi phí phát sinh |
| `PUT` | `/api/trips/{trip_code}/expenses/{id}/` | `TripExpenseDetailAPIView` | Sửa khoản chi phí |
| `DELETE` | `/api/trips/{trip_code}/expenses/{id}/` | `TripExpenseDetailAPIView` | Xóa mềm khoản chi phí |
| `POST` | `/api/trips/{trip_code}/settle/` | `TripSettleExpensesAPIView` | Kế toán chốt sổ |
| `POST` | `/api/trips/{trip_code}/unsettle/` | `TripUnsettleExpensesAPIView` | Kế toán mở khóa sổ |
| `POST` | `/api/trips/{trip_code}/documents/` | `TripAddDocumentAPIView` | Tải lên chứng từ (EIR, POD) |
| `POST` | `/api/trips/{trip_code}/transition/` | `TripWorkflowTransitionAPIView` | Chuyển trạng thái chuyến xe |
| `GET/POST` | `/api/personnel/employees/` | `EmployeeListCreateAPIView` | Danh sách & Khai báo nhân sự 360° |
| `GET/PUT/DEL`| `/api/personnel/employees/{id}/` | `EmployeeDetailAPIView` | Chi tiết, cập nhật & tạm ngưng nhân sự |
| `GET` | `/api/personnel/stats/` | `EmployeeStatsAPIView` | Thống kê cơ cấu nhân sự & cảnh báo hạn |
| `GET/POST` | `/api/personnel/dependents/` | `EmployeeDependentListCreateAPIView` | Danh sách & thêm người phụ thuộc |
| `GET/POST` | `/api/personnel/contracts/` | `LaborContractListCreateAPIView` | Hợp đồng lao động & cảnh báo hạn |
| `POST` | `/api/personnel/appendices/` | `ContractAppendixListCreateAPIView` | Thêm phụ lục hợp đồng lao động |
| `GET/PUT` | `/api/personnel/policy-config/` | `PayrollPolicyConfigAPIView` | Tham số giảm trừ gia cảnh & ngày công |
| `GET` | `/api/personnel/tax-brackets/` | `TaxBracketListAPIView` | Biểu thuế TNCN 7 bậc lũy tiến |
| `GET/PUT` | `/api/personnel/deduction-rates/`| `SalaryDeductionRateAPIView` | Tỷ lệ trích nộp BHXH bắt buộc |
| `GET/POST` | `/api/personnel/periods/` | `PayrollPeriodListCreateAPIView` | Danh mục kỳ lương & Tạo kỳ lương mới |
| `GET` | `/api/personnel/periods/{id}/` | `PayrollPeriodDetailAPIView` | Chi tiết kỳ lương & bảng lương slips |
| `POST` | `/api/personnel/periods/{id}/calculate/` | `PayrollCalculateAPIView` | Động cơ tính toán lương Hybrid Payroll |
| `POST` | `/api/personnel/periods/{id}/status/` | `PayrollPeriodStatusAPIView` | Chuyển trạng thái & Chi tiền Sổ Quỹ |
| `GET` | `/api/personnel/periods/{id}/bank-export/` | `PayrollExportBankAPIView` | Xuất dữ liệu chuyển khoản ngân hàng lô |
| `GET` | `/api/personnel/slips/{id}/print/` | `PayrollSlipPrintAPIView` | Dữ liệu in phiếu lương cá nhân A4/A5 |
| `GET` | `/api/fleet/` | `FleetAPIView` | Danh sách đội xe |
| `GET` | `/api/bookings/active/` | `BookingActiveAPIView` | Booking chờ điều xe |
| `GET/POST` | `/api/sales/` | `SalesAPIView` | Báo giá + Doanh thu |
| `POST` | `/api/sales/quotations/` | `CreateQuotationAPIView` | Tạo báo giá mới |
| `GET` | `/api/customs/` | `CustomsAPIView` | Phân luồng Hải quan |
| `GET` | `/api/accounting/` | `AccountingAPIView` | Đối soát chi phí kế toán |

---

## 1. DASHBOARD BAN GIÁM ĐỐC

### `GET /api/dashboard/`

**Mô tả:** Lấy toàn bộ chỉ số chiến lược cho Dashboard BGĐ.

**Response:**
```json
{
  "finance": {
    "cash_on_hand": 150000000,
    "bank_balance": 1250000000,
    "weekly_planned_expenses": 450000000,
    "monthly_revenue": 85000000,
    "monthly_expense": 32500000,
    "monthly_gross_profit": 52500000,
    "profit_margin": 61.76,
    "operating_ratio": 38.24,
    "pending_settle_count": 3
  },
  "productivity": {
    "completed_yesterday": 8,
    "today_active": 2,
    "total_trips": 16,
    "ontime_delivery_rate": 94.5,
    "monthly_gross_profit": 52500000
  },
  "fleet": {
    "active": 5,
    "idle": 3,
    "maintenance": 1,
    "total": 9,
    "utilization_rate": 55.56
  },
  "personnel": {
    "active": 5,
    "on_leave": 2
  },
  "commercial_customs": {
    "pending_bookings": 3,
    "active_bookings": 2,
    "completed_bookings": 5,
    "customs_green": 85,
    "customs_yellow": 12,
    "customs_red": 3,
    "customs_clearance_rate": 85.0
  },
  "charts": {
    "daily_trend": {
      "labels": ["15/09", "16/09", "17/09", "18/09", "19/09", "20/09", "21/09"],
      "revenue": [12000000, 15000000, 9000000, 18000000, 11000000, 14000000, 6000000],
      "expense": [4800000, 6000000, 3600000, 7200000, 4400000, 5600000, 2400000],
      "profit": [7200000, 9000000, 5400000, 10800000, 6600000, 8400000, 3600000]
    },
    "fleet_split": {
      "labels": ["Xe đang chở hàng (Active)", "Xe sẵn sàng tại bãi (Idle)", "Xe đang bảo trì (Maintenance)"],
      "data": [5, 3, 1]
    },
    "customs_split": {
      "labels": ["Luồng Xanh (Thông quan)", "Luồng Vàng (Nộp hồ sơ)", "Luồng Đỏ (Kiểm hóa)"],
      "data": [85, 12, 3]
    }
  },
  "funds": {
    "cash_on_hand": 150000000,
    "bank_balance": 1250000000,
    "weekly_planned_expenses": 450000000
  },
  "trips_pnl": [
    {
      "trip_code": "TVL-0916-007",
      "customer": "TAKIGAWA VSIP 3 → VSIP 2",
      "route": "CÁT LÁI → KHO WCA → HẠ BÃI",
      "driver": "BỤI 94",
      "vehicle": "51H-123.45",
      "container": "CAAU5214215XX",
      "revenue": 3800000,
      "expense": 1548000,
      "profit": 2252000,
      "margin": 59.26,
      "status": "COMPLETED"
    }
  ]
}
```

---

## 2. DANH SÁCH CHUYẾN XE

### `GET /api/trips/?q={keyword}&status={status}`

**Query params:**
- `q`: Từ khóa tìm kiếm (Mã chuyến / Số cont / Booking / Khách hàng / Biển số xe)
- `status`: Lọc trạng thái (label tiếng Việt hoặc key tiếng Anh)

**Response:**
```json
{
  "stats": {
    "total_trips_monthly": 128,
    "transit_count": 5,
    "pending_expenses_count": 3,
    "cutoff_warning_count": 1
  },
  "trips": [
    {
      "id": "TVL-0917-001",
      "customer": "TAKIGAWA VSIP 3 → VSIP 2",
      "type": "Hàng Nhập",
      "type_raw": "IMPORT",
      "pickup": "CÁT LÁI",
      "warehouse": "KHO WCA TÂN VẠN",
      "dropoff": "HẠ BÃI SOLOG",
      "status": "IN_TRANSIT",
      "status_label": "Đang di chuyển",
      "driver": "BỤI 94",
      "vehicle": "51H-123.45",
      "vehicle_ownership": "Xe Nhà",
      "vehicle_ownership_code": "OWNED",
      "dropoff_vehicle": "-",
      "container": "CAAU5214215XX",
      "seal": "SL-998877",
      "booking": "235601091589",
      "commercial_invoice": "VCC33970",
      "warehouse_dock": "D2",
      "cont_location_type": "NHÀ MÁY",
      "cargo_notes": "Lưu ý chứng từ về cty sớm",
      "loading_date": "17/09/2026",
      "loading_time": "8H",
      "eta_warehouse_time": "10H30",
      "warehouse_call_in_time": "-",
      "actual_gate_in_time": "-",
      "warehouse_call_out_time": "-",
      "actual_gate_out_time": "-",
      "cutoff": "SI 10:00",
      "notes": "",
      "revenue": 3800000,
      "expense": 0,
      "profit": 3800000
    }
  ]
}
```

---

## 3. TẠO LỆNH ĐIỀU ĐỘNG

### `POST /api/trips/`

**Request body:**
```json
{
  "customer": "TĐÁ - VICACO",
  "type": "Nhập",
  "driver": "BỤI 94",
  "container": "CAAU5214215XX",
  "container_type": "40HC",
  "seal": "SL-998877",
  "booking": "235601091589",
  "commercial_invoice": "VCC33970",
  "warehouse_dock": "D2",
  "cont_location_type": "NHÀ MÁY",
  "cargo_notes": "Lưu ý chứng từ về cty sớm",
  "loading_time": "8H",
  "pickup": "CÁT LÁI",
  "warehouse": "KHO WCA TÂN VẠN",
  "dropoff": "HẠ BÃI",
  "cutoff": "SI 10:00",
  "notes": "Lưu ý chứng từ về cty sớm",
  "booking_order_id": 5
}
```

**Ghi chú:**
- `booking_order_id` (tuỳ chọn): Kế thừa dữ liệu từ Booking trong Sale module
- Nếu không truyền `booking_order_id`, hệ thống tạo chuyến độc lập
- `container_type`: `40HC`, `20DC`, `45G1`, `40GP`, `22GP`, `XE_TAI_10T`, `XE_TAI_2T`

**Response:**
```json
{
  "success": true,
  "message": "Tạo lệnh điều động TVL-0917-017 thành công!",
  "trip_code": "TVL-0917-017"
}
```

---

## 4. CHI TIẾT CHUYẾN XE

### `GET /api/trips/{trip_code}/`

**Response:**
```json
{
  "id": "TVL-0916-007",
  "customer": "TAKIGAWA VSIP 3 → VSIP 2",
  "type": "Hàng Nhập",
  "pickup": "CÁT LÁI",
  "warehouse": "KHO WCA TÂN VẠN",
  "dropoff": "HẠ BÃI SOLOG",
  "eir_number": "EIR-54321",
  "shipping_line": "MAE",
  "vessel_voyage": "USAL-UMM SALAL / 637E",
  "destination_port": "NEWARK",
  "vgm_weight": "10.93 D26C",
  "status": "COMPLETED",
  "status_label": "Đã hoàn tất chuyến",
  "driver": "BỤI 94",
  "driver_phone": "0909123456",
  "vehicle": "51H-123.45",
  "container": "CAAU5214215XX",
  "seal": "SL-998877",
  "booking": "235601091589",
  "loading_date": "16/09/2026",
  "loading_time": "8H",
  "eta_warehouse_time": "10H30",
  "warehouse_call_in_time": "10H15",
  "actual_gate_in_time": "10H22",
  "warehouse_call_out_time": "14H00",
  "actual_gate_out_time": "14H12",
  "timeline": [
    {
      "step": 1,
      "title": "Điều độ phát lệnh Zalo",
      "time": "18:00 15/09",
      "done": true,
      "active": false
    }
  ],
  "expenses": [
    {
      "id": 12,
      "category_code": "TOLL_FEE",
      "category_name": "Vé cầu đường (BOT)",
      "amount": 30000,
      "status": "SETTLED",
      "status_label": "Đã chốt sổ",
      "time": "08:30 16/09",
      "invoice_issuer": "VEC - Tổng Công ty Đầu tư Phát triển đường cao tốc VN",
      "invoice_number": "HD0001234",
      "invoice_lookup_code": "8C-001234",
      "invoice_lookup_url": "https://hoadondientu.gdt.gov.vn/",
      "amount_before_tax": 27273,
      "tax_rate": 10.0,
      "tax_amount": 2727,
      "can_edit": false,
      "can_delete": false
    }
  ],
  "cost_sheet": {
    "fee_einvoice": {
      "has_invoice": true,
      "invoices": ["HD0001234 (8C-001234)"]
    },
    "fee_lift_on": 1518000,
    "fee_lift_off": 0,
    "fee_deposit": 0,
    "fee_weighing": 0,
    "fee_labor": 0,
    "fee_toll": 30000,
    "fee_other": 0,
    "total_expense": 1548000
  },
  "documents": [
    {
      "id": 8,
      "type": "document",
      "name": "Biên bản giao nhận hàng (POD)",
      "details": "AI Nhận diện: Biên bản giao nhận - Cont: CAAU5214215XX",
      "time": "14:00 16/09",
      "is_verified": true
    }
  ],
  "is_expenses_settled": true,
  "settled_at": "15:30 16/09/2026",
  "settled_by": "Kế toán Trưởng",
  "financials": {
    "revenue": 3800000,
    "expense": 1548000,
    "profit": 2252000,
    "margin_percent": 59.26
  }
}
```

> **Quy tắc Zero Variance:**  
> `financials.expense` == `cost_sheet.total_expense` == `Σ(expenses[].amount)` (trừ REJECTED)

---

## 5. THÊM CHI PHÍ PHÁT SINH

### `POST /api/trips/{trip_code}/expenses/`

**Request body:**
```json
{
  "category": "TOLL_FEE",
  "amount": 60000,
  "status": "APPROVED",
  "invoice_issuer": "VEC - Tổng Công ty Đầu tư Phát triển đường cao tốc VN",
  "invoice_number": "HD0009988",
  "invoice_lookup_code": "8C-009988",
  "invoice_lookup_url": "https://hoadondientu.gdt.gov.vn/",
  "amount_before_tax": 54545,
  "tax_rate": 10.0,
  "tax_amount": 5455,
  "notes": "Vé BOT vé Mỹ Phước - Tân Vạn"
}
```

**Các giá trị `category`:**
| Code | Mô tả |
|---|---|
| `LIFT_ON` | Phí nâng cont (Lift On) |
| `LIFT_OFF` | Phí hạ cont (Lift Off) |
| `CONTAINER_DEPOSIT` | Tiền cược container |
| `WEIGHING` | Phí cân xe |
| `LABOR_STEVEDORING` | Phí bốc xếp / bồi dưỡng kho |
| `TOLL_FEE` | Vé cầu đường (BOT) |
| `OTHER` | Chi phí khác |

**Lỗi trả về khi chốt sổ:**
```json
{
  "error": "Chuyến xe đã được Kế toán chốt sổ đối soát, không thể thêm khoản chi phí mới."
}
```

---

## 6. SỬA / XÓA CHI PHÍ

### `PUT /api/trips/{trip_code}/expenses/{expense_id}/`

**Request body (tuỳ chọn các trường cần sửa):**
```json
{
  "amount": 65000,
  "notes": "Đã kiểm tra lại — vé 65k"
}
```

### `DELETE /api/trips/{trip_code}/expenses/{expense_id}/`

> **Lưu ý:** Đây là Soft-Delete — bản ghi được đánh dấu `is_deleted=True`, không xóa cứng.

---

## 7. CHỐT SỔ KẾ TOÁN

### `POST /api/trips/{trip_code}/settle/`

**Hành động:**
- Đặt `trip.is_expenses_settled = True`
- Cập nhật tất cả `TripExpense.status → SETTLED`
- Ghi nhận `settled_at` + `settled_by`
- Chạy lại `update_financials()` để đồng bộ P&L

**Response:**
```json
{
  "success": true,
  "message": "Kế toán đã chốt sổ chi phí cho chuyến xe TVL-0916-007 thành công!",
  "settled_at": "15:30 16/09/2026",
  "settled_by": "Kế toán Trưởng",
  "cached_expense": 1548000,
  "cached_profit": 2252000
}
```

### `POST /api/trips/{trip_code}/unsettle/`

**Hành động:**
- Đặt `is_expenses_settled = False`
- Chuyển `TripExpense.status SETTLED → APPROVED`
- Dùng khi cần hiệu chỉnh sau khi đã chốt sổ (chỉ Kế toán trưởng)

---

## 8. CHỨNG TỪ SỐ

### `POST /api/trips/{trip_code}/documents/`

```json
{
  "doc_type": "Biên bản giao nhận hàng",
  "container_no": "CAAU5214215XX",
  "seal_no": "SL-998877"
}
```

**Giá trị `doc_type`:**
- `Phiếu EIR Hạ Cont`
- `Biên bản giao nhận hàng`
- `Phiếu cân xe`
- `Hóa đơn GTGT`

---

## 9. CHUYỂN TRẠNG THÁI CHUYẾN XE

### `POST /api/trips/{trip_code}/transition/`

```json
{
  "action": "dispatch",
  "notes": "Phát lệnh chuyến đêm"
}
```

**Các `action` hợp lệ (theo State Machine):**

| Action | From | To |
|---|---|---|
| `dispatch` | `DRAFT` | `DISPATCHED` |
| `accept` | `DISPATCHED` | `ACCEPTED` |
| `pick_container` | `ACCEPTED` | `CONTAINER_PICKED` |
| `start_transit` | `CONTAINER_PICKED` | `IN_TRANSIT` |
| `arrive_warehouse` | `IN_TRANSIT` | `AT_WAREHOUSE` |
| `start_unloading` | `AT_WAREHOUSE` | `UNLOADING` |
| `deliver` | `UNLOADING` | `DELIVERED` |
| `return_empty` | `DELIVERED` | `RETURNING_EMPTY` |
| `complete` | `RETURNING_EMPTY` | `COMPLETED` |
| `cancel` | Bất kỳ | `CANCELLED` |

---

## 10. NHÂN SỰ — BẢNG LƯƠNG TẠM TÍNH

### `GET /api/personnel/`

**Response:**
```json
[
  {
    "code": "TVL-DRV-001",
    "name": "Nguyễn Văn Bụi (BỤI 94)",
    "trips": 25,
    "base_salary": 6000000,
    "trip_salary": 12500000,
    "advance": 3000000,
    "net_salary": 15500000
  }
]
```

---

## 11. ĐỘI XE

### `GET /api/fleet/`

**Response:**
```json
{
  "total_tractors": 5,
  "total_trailers": 25,
  "reg_warning_count": 1,
  "maint_warning_count": 2,
  "vehicles": [
    {
      "plate": "51H-123.45",
      "type": "Đầu kéo Container",
      "driver": "BỤI 94",
      "reg_expiry": "15/03/2027",
      "maint_date": "01/10/2026",
      "ownership_type": "Xe Nhà",
      "ownership_code": "OWNED",
      "is_reg_warning": false,
      "is_maint_warning": true,
      "status": "Đang hoạt động",
      "status_raw": "ACTIVE"
    }
  ]
}
```

---

## 12. BOOKING ĐANG HOẠT ĐỘNG

### `GET /api/bookings/active/`

Lấy danh sách booking chờ điều xe hoặc đang điều xe, dùng cho dropdown kế thừa khi tạo lệnh điều động.

---

## 13. SALES & BÁO GIÁ

### `GET /api/sales/`

Trả về danh sách Báo giá + Booking với KPI doanh số.

### `POST /api/sales/quotations/`

Tạo báo giá mới từ phân hệ Sale.

---

## 14. KẾ TOÁN — ĐỐI SOÁT

### `GET /api/accounting/`

Trả về toàn bộ dữ liệu cho màn hình đối soát kế toán: KPI + danh sách chuyến xe với trạng thái chốt sổ.

---

## LƯU Ý KỸ THUẬT QUAN TRỌNG

### Zero Variance Enforcement
API `GET /api/trips/{trip_code}/` tự động kiểm tra và đồng bộ nếu `cached_expense` trong DB lệch với tổng thực tế:
```python
if trip.cached_expense != total_actual_expense:
    trip.cached_expense = total_actual_expense
    trip.save(update_fields=['cached_expense', 'cached_profit', 'cached_margin_percent'])
```

### Soft Delete
Mọi hành động xóa đều dùng Soft-Delete:
```python
expense.delete()  # override delete() → is_deleted=True
```

### Công thức tài chính chuẩn
```
valid_expenses = expenses WHERE status != REJECTED AND is_deleted=False
total_actual_expense = SUM(valid_expenses.amount)
profit = cached_revenue - total_actual_expense
margin_percent = (profit / cached_revenue) × 100  [if revenue > 0]
```
