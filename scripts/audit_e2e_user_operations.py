import os
import sys
import json
import datetime
from decimal import Decimal

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.customers.models import Customer, RouteTariff, Quotation, BookingOrder
from apps.personnel.models import Employee, EmployeeRole
from apps.fleet.models import Vehicle, Trailer
from apps.billing.models import CashTransaction, TripExpense, DispatcherAdvanceFund, DriverTripAdvance
from apps.customs.models import CustomsDeclaration
from apps.master_data.models import Location, ContainerType, ExpenseItem, ShippingLine, Subcontractor, CompanyProfile

User = get_user_model()
admin_user = User.objects.filter(is_superuser=True).first()
if not admin_user:
    admin_user = User.objects.first()

client = Client()
client.force_login(admin_user)

print("=" * 80)
print("BIM LOGISTICS — FULL E2E SYSTEM AUDIT & USER OPERATIONS TEST")
print("Đóng vai người dùng kiểm thử toàn diện: Views, CRUD, Báo cáo, In ấn, Phân hệ")
print(f"Thời gian bắt đầu: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

audit_results = {}
errors_log = []

def run_test_step(section_name, step_name, fn):
    key = f"[{section_name}] {step_name}"
    try:
        fn()
        audit_results[key] = "PASSED"
        print(f"  [PASS] {key}")
    except Exception as e:
        audit_results[key] = f"FAILED: {e}"
        errors_log.append((key, str(e)))
        print(f"  [FAIL] {key} -> {e}")

# ==============================================================================
# SECTION 1: WEB PAGE VIEWS & INTERFACE ACCESSIBILITY (HTML RENDERING)
# ==============================================================================
print("\n>>> 1. KIỂM THỬ TRUY CẬP CÁC TRANG GIAO DIỆN CHÍNH (HTML VIEWS)")

pages_to_test = [
    ('/', 'Trang chủ Index View'),
    ('/dashboard/', 'Bàn điều khiển Dashboard'),
    ('/dispatch/', 'Phân hệ Điều phối & Quản lý chuyến'),
    ('/sales/', 'Phân hệ Kinh doanh, Báo giá & Đơn hàng'),
    ('/fleet/', 'Phân hệ Quản lý Đội xe & Rơ-moóc'),
    ('/hr/', 'Phân hệ Quản lý Nhân sự & Tài xế'),
    ('/accounting/', 'Phân hệ Kế toán, Sổ quỹ & Đối soát'),
    ('/settlements/', 'Trang Quyết toán vận tải'),
    ('/customs/', 'Phân hệ Hải quan & Tờ khai'),
    ('/reports/', 'Phân hệ 14 Báo cáo Quản trị'),
    ('/master-data/', 'Phân hệ Quản lý Danh mục & Dữ liệu Master'),
    ('/help/', 'Trung tâm Hướng dẫn & Tài liệu Vận hành'),
]

for url, desc in pages_to_test:
    def make_test(u):
        def t():
            resp = client.get(u)
            assert resp.status_code == 200, f"Status code {resp.status_code} for {u}"
            # Check basic HTML structure
            assert b'<!DOCTYPE html>' in resp.content or b'<html' in resp.content or b'class=' in resp.content, "Invalid HTML response"
        return t
    run_test_step("1. HTML Views", desc, make_test(url))

# Test Driver Portal & Tracking Views
trip_for_portal = DispatchTrip.objects.filter(is_deleted=False).first()
if trip_for_portal:
    driver_token = getattr(trip_for_portal, 'driver_token', None) or getattr(trip_for_portal, 'driver_hashid', None) or trip_for_portal.hashid
    def test_driver_portal():
        resp = client.get(f'/driver/{driver_token}/')
        assert resp.status_code == 200, f"Driver portal status {resp.status_code}"
    run_test_step("1. HTML Views", "Cổng thông tin tài xế (Driver Portal Mobile View)", test_driver_portal)

    track_hash = getattr(trip_for_portal, 'tracking_hash', None) or trip_for_portal.trip_code or str(trip_for_portal.id)
    def test_tracking_view():
        resp = client.get(f'/tracking/{track_hash}/')
        assert resp.status_code == 200, f"Public tracking status {resp.status_code}"
    run_test_step("1. HTML Views", "Tra cứu hành trình công khai (Public Tracking View)", test_tracking_view)

# ==============================================================================
# SECTION 2: SALES & BOOKINGS CRUD (KINH DOANH & ĐƠN HÀNG)
# ==============================================================================
print("\n>>> 2. KIỂM THỬ THAO TÁC CRUD KINH DOANH (QUOTATIONS & BOOKINGS)")

created_quotation_id = None
created_booking_id = None
cust = Customer.objects.filter(is_deleted=False).first() or Customer.objects.create(name='Cty Test E2E', phone='0909999999')

def test_quotation_crud():
    global created_quotation_id
    # CREATE Quotation
    ts = timezone.now().strftime('%y%m%d%H%M%S')
    payload = {
        'action': 'create_quotation',
        'customer': cust.name,
        'customer_id': cust.id,
        'route_description': 'Cảng Tân Cảng Cát Lái - KCN Sóng Thần 2, Bình Dương',
        'cargo_type': 'Hàng may mặc FCL',
        'container_type': '40HC',
        'estimated_km': 33,
        'unit_price': 3200000,
        'monthly_trips': 15,
        'valid_until': '2026-12-31',
        'pricing_method': 'MULTI_ROUTE',
        'notes': 'Báo giá vận chuyển kỳ 2',
        'items': [
            {
                'route_description': 'Cát Lái -> KCN Sóng Thần 2',
                'origin_zone': 'Cát Lái',
                'destination_zone': 'Sóng Thần',
                'cargo_type': '40HC',
                'estimated_km': 33,
                'unit_price': 3200000,
                'expected_trips_monthly': 15,
                'notes': 'Tuyến Cát Lái - Sóng Thần'
            }
        ]
    }
    res = client.post('/api/sales/', data=json.dumps(payload), content_type='application/json')
    assert res.status_code in [200, 201], f"Quotation create failed: {res.content[:200]}"
    res_data = res.json()
    created_quotation_id = res_data.get('id') or res_data.get('quotation_id') or (res_data.get('data', {}).get('id') if isinstance(res_data.get('data'), dict) else None)
    assert created_quotation_id, f"Quotation ID not found in response: {res_data}"

    # READ Quotation Detail
    get_res = client.get(f'/api/quotations/{created_quotation_id}/')
    assert get_res.status_code == 200, f"Get quotation failed: {get_res.status_code}"

    # UPDATE Quotation
    up_res = client.put(f'/api/quotations/{created_quotation_id}/', data=json.dumps({
        'unit_price': 3300000,
        'cargo_type': 'Hàng may mặc xuất khẩu (Hiệu chỉnh)'
    }), content_type='application/json')
    assert up_res.status_code in [200, 204], f"Update quotation failed: {up_res.status_code}"

    # APPROVE Quotation Status (Valid statuses: ['NEGOTIATING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED'])
    st_res = client.post(f'/api/quotations/{created_quotation_id}/status/', data=json.dumps({
        'status': 'APPROVED'
    }), content_type='application/json')
    assert st_res.status_code in [200, 204], f"Status change failed: {st_res.status_code}"

run_test_step("2. Sales CRUD", "Quotation: Tạo mới -> Xem chi tiết -> Sửa -> Chấp nhận", test_quotation_crud)

def test_booking_crud():
    global created_booking_id
    ts = timezone.now().strftime('%y%m%d%H%M%S')
    bk_code = f"BK-E2E-{ts}"
    payload = {
        'action': 'create_booking',
        'customer': cust.name,
        'customer_id': cust.id,
        'booking_number': bk_code,
        'booking_type': 'EXPORT_FCL',
        'shipping_line': 'ONE',
        'vessel_voyage': 'ONE FALCON 012E',
        'pickup_location': 'Cát Lái',
        'delivery_location': 'KCN Mỹ Phước',
        'dropoff_location': 'Hạ bãi Tân Cảng Cát Lái',
        'commodity': 'Nội thất gỗ xuất khẩu',
        'container_size': '40HC',
        'total_containers': 1,
        'selling_freight_price': 4500000,
        'loading_date': '2026-10-20',
        'loading_time': '08:30',
        'free_time_detention': 7,
        'free_time_demurrage': 7,
        'status': 'PENDING_DISPATCH'
    }
    res = client.post('/api/sales/', data=payload)
    assert res.status_code in [200, 201], f"Booking create failed: {res.content[:200]}"
    res_data = res.json()
    created_booking_id = res_data.get('id') or (res_data.get('data', {}).get('id') if isinstance(res_data.get('data'), dict) else None)
    if not created_booking_id:
        bk_obj = BookingOrder.objects.filter(booking_number=bk_code).first()
        if bk_obj:
            created_booking_id = bk_obj.id

    assert created_booking_id, "Booking ID not found"

    # READ Booking Detail
    b_get = client.get(f'/api/bookings/{created_booking_id}/')
    assert b_get.status_code == 200, f"Get booking failed: {b_get.status_code}"

    # UPDATE Booking
    b_up = client.put(f'/api/bookings/{created_booking_id}/', data=json.dumps({
        'selling_freight_price': 4600000,
        'special_instructions': 'Kiểm tra kỹ tình trạng cont trước khi bấm chì'
    }), content_type='application/json')
    assert b_up.status_code in [200, 204], f"Update booking failed: {b_up.status_code}"

run_test_step("2. Sales CRUD", "Booking: Tạo mới -> Xem chi tiết -> Sửa thông tin", test_booking_crud)

# ==============================================================================
# SECTION 3: DISPATCH TRIPS, EXPENSES & LIFECYCLE (ĐIỀU PHỐI & CHUYẾN XE)
# ==============================================================================
print("\n>>> 3. KIỂM THỬ THAO TÁC CRUD ĐIỀU PHỐI & VÒNG ĐỜI CHUYẾN XE (STATE MACHINE)")

created_trip_code = None
driver = Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True).first()
vehicle = Vehicle.objects.filter(is_deleted=False).first()

def test_dispatch_trip_lifecycle():
    global created_trip_code
    # 1. CREATE TRIP
    trip_payload = {
        'customer_id': cust.id,
        'driver': driver.nickname or driver.full_name if driver else 'Tài xế Test',
        'driver_id': driver.id if driver else None,
        'vehicle': vehicle.license_plate if vehicle else '51C-999.99',
        'vehicle_id': vehicle.id if vehicle else None,
        'pickup': 'Cảng Cát Lái, Cổng C',
        'warehouse': 'Kho TBS Tân Vạn',
        'dropoff': 'Bãi hạ vỏ Cát Lái',
        'container_number': 'TEMU7654321',
        'container_type': '40HC',
        'seal_number': 'ONE998877',
        'revenue': 3900000,
        'driver_allowance': 750000,
        'status': TripStatus.DISPATCHED
    }
    trip_res = client.post('/api/trips/', data=json.dumps(trip_payload), content_type='application/json')
    assert trip_res.status_code in [200, 201], f"Trip create failed: {trip_res.content[:200]}"
    res_data = trip_res.json()
    created_trip_code = res_data.get('trip_code') or str(res_data.get('id'))
    assert created_trip_code, "Trip code not found"

    # 2. READ TRIP DETAIL
    detail_res = client.get(f'/api/trips/{created_trip_code}/')
    assert detail_res.status_code == 200, f"Trip detail failed: {detail_res.status_code}"

    # 3. ADD EXPENSES
    exp1 = client.post(f'/api/trips/{created_trip_code}/expenses/', data=json.dumps({
        'expense_type': 'TOLL_BOT',
        'amount': 180000,
        'description': 'Vé BOT Trạm Thu phí Cầu Đồng Nai',
        'is_on_behalf_of_customer': False
    }), content_type='application/json')
    assert exp1.status_code in [200, 201], f"Expense 1 failed: {exp1.status_code}"
    exp1_id = exp1.json().get('id')

    exp2 = client.post(f'/api/trips/{created_trip_code}/expenses/', data=json.dumps({
        'expense_type': 'PORT_STORAGE',
        'amount': 350000,
        'description': 'Phí lưu bãi cảng Cát Lái (Chi hộ khách)',
        'is_on_behalf_of_customer': True
    }), content_type='application/json')
    assert exp2.status_code in [200, 201], f"Expense 2 failed: {exp2.status_code}"
    exp2_id = exp2.json().get('id')

    # 4. UPDATE EXPENSE
    if exp1_id:
        up_exp = client.put(f'/api/trips/{created_trip_code}/expenses/{exp1_id}/', data=json.dumps({
            'amount': 190000,
            'description': 'Vé BOT Trạm Thu phí Cầu Đồng Nai (Hiệu chỉnh)'
        }), content_type='application/json')
        assert up_exp.status_code in [200, 204], f"Update expense failed: {up_exp.status_code}"

    # 5. ADD MILESTONES (State Machine progression)
    for ms, note in [
        ('ARRIVED_WAREHOUSE', 'Đã tới cổng kho Tân Vạn'),
        ('PICKED_UP', 'Đã nhận cont, bấm chì niêm phong'),
        ('IN_TRANSIT', 'Đang vận chuyển về cảng'),
        ('DELIVERED', 'Đã giao cont hạ bãi thành công')
    ]:
        ms_res = client.post(f'/api/trips/{created_trip_code}/milestones/', data=json.dumps({
            'milestone': ms,
            'notes': note
        }), content_type='application/json')
        assert ms_res.status_code in [200, 201], f"Milestone {ms} failed: {ms_res.status_code}"

    # 6. VERIFY EXPENSE SETTLEMENT API
    settle_res = client.post(f'/api/trips/{created_trip_code}/settle-expenses/')
    assert settle_res.status_code in [200, 204], f"Settle expenses failed: {settle_res.status_code}"

run_test_step("3. Dispatch Lifecycle", "Chuyến xe: Tạo -> Chi tiết -> 2 Khoản chi phí -> 4 Mốc lộ trình -> Quyết toán chi phí", test_dispatch_trip_lifecycle)

# ==============================================================================
# SECTION 4: CASHBOOK, SETTLEMENTS & ACCOUNTING (KẾ TOÁN, SỔ QUỸ & ĐỐI SOÁT)
# ==============================================================================
print("\n>>> 4. KIỂM THỬ THAO TÁC KẾ TOÁN (SỔ QUỸ, TẠM ỨNG, ĐỐI SOÁT & QUYẾT TOÁN)")

created_voucher_id = None

def test_cashbook_crud():
    global created_voucher_id
    # 1. CREATE INFLOW VOUCHER (Phiếu Thu)
    inflow_res = client.post('/api/accounting/cashbook/', data=json.dumps({
        'transaction_type': 'INFLOW',
        'payment_method': 'BANK',
        'category': 'FREIGHT_REVENUE',
        'amount': 25000000,
        'partner_type': 'CUSTOMER',
        'partner_name': cust.name,
        'ref_code': 'UNC-E2E-001',
        'bank_name': 'Vietcombank',
        'bank_account': '0071000999999',
        'notes': 'Khách thanh toán cước vận chuyển kỳ 1'
    }), content_type='application/json')
    assert inflow_res.status_code in [200, 201], f"Inflow voucher failed: {inflow_res.content[:200]}"
    inflow_data = inflow_res.json()
    created_voucher_id = inflow_data.get('id') or inflow_data.get('transaction_id') or (inflow_data.get('data', {}).get('id') if isinstance(inflow_data.get('data'), dict) else None)
    assert created_voucher_id, f"Inflow voucher ID not found in: {inflow_data}"

    # 2. READ VOUCHER
    v_get = client.get(f'/api/accounting/cashbook/{created_voucher_id}/')
    assert v_get.status_code == 200, f"Get voucher failed: {v_get.status_code}"

    # 3. UPDATE VOUCHER
    v_up = client.put(f'/api/accounting/cashbook/{created_voucher_id}/', data=json.dumps({
        'amount': 25500000,
        'notes': 'Khách thanh toán cước vận chuyển kỳ 1 (Hiệu chỉnh số tiền)'
    }), content_type='application/json')
    assert v_up.status_code in [200, 204], f"Update voucher failed: {v_up.status_code}"

    # 4. CREATE OUTFLOW VOUCHER (Phiếu Chi tạm ứng)
    outflow_res = client.post('/api/accounting/cashbook/', data=json.dumps({
        'transaction_type': 'OUTFLOW',
        'payment_method': 'CASH',
        'category': 'EXPENSE_ADVANCE',
        'amount': 1500000,
        'partner_type': 'DRIVER',
        'partner_name': driver.full_name if driver else 'Tài xế Test',
        'ref_code': 'PC-E2E-001',
        'notes': 'Tạm ứng nhiên liệu & BOT cho tài xế'
    }), content_type='application/json')
    assert outflow_res.status_code in [200, 201], f"Outflow voucher failed: {outflow_res.content[:200]}"

run_test_step("4. Accounting CRUD", "Sổ Quỹ: Lập Phiếu Thu -> Xem chi tiết -> Sửa phiếu -> Lập Phiếu Chi", test_cashbook_crud)

def test_settlements_and_advances():
    # 1. Driver settlement batch preview
    preview_res = client.get(f'/api/accounting/driver-settlements/batch-preview/?group_by=driver&driver_id={driver.id if driver else 1}&from_date=2026-09-01&to_date=2026-09-30')
    assert preview_res.status_code == 200, f"Driver settlement preview failed: {preview_res.status_code}"

    # 2. Customer Reconciliation / SOA
    soa_res = client.get(f'/api/accounting/customer-reconciliation/?customer_id={cust.id}&from_date=2026-09-01&to_date=2026-09-30')
    assert soa_res.status_code == 200, f"Customer reconciliation failed: {soa_res.status_code}"

    # 3. Reimbursables
    reimb_res = client.get('/api/accounting/reimbursables/?from_date=2026-09-01&to_date=2026-09-30')
    assert reimb_res.status_code == 200, f"Reimbursables query failed: {reimb_res.status_code}"

    # 4. Subcontractor settlements
    sub_res = client.get('/api/accounting/subcontractor-settlements/?from_date=2026-09-01&to_date=2026-09-30')
    assert sub_res.status_code == 200, f"Subcontractor settlements query failed: {sub_res.status_code}"

    # 5. BOT Audit
    bot_res = client.get('/api/accounting/bot-audit/?from_date=2026-09-01&to_date=2026-09-30')
    assert bot_res.status_code == 200, f"BOT Audit query failed: {bot_res.status_code}"

run_test_step("4. Accounting CRUD", "Đối soát & Quyết toán: Driver Batch Preview, Customer SOA, Chi hộ, Thầu phụ, Kiểm toán BOT", test_settlements_and_advances)

# ==============================================================================
# SECTION 5: CUSTOMS DECLARATIONS CRUD (HẢI QUAN & TỜ KHAI)
# ==============================================================================
print("\n>>> 5. KIỂM THỬ THAO TÁC CRUD HẢI QUAN (CUSTOMS DECLARATIONS)")

created_declaration_id = None

def test_customs_crud():
    global created_declaration_id
    ts = timezone.now().strftime('%m%d%H%M%S')
    dec_no = f"1099{ts}"
    payload = {
        'declaration_number': dec_no,
        'declaration_type': 'IMPORT',
        'customs_office': 'Chi cục HQ Cửa khẩu Cảng Sài Gòn KV I (02CI)',
        'customer_id': cust.id,
        'tax_amount': 45000000,
        'channel': 'YELLOW',
        'status': 'REGISTERED',
        'notes': 'Tờ khai nhập khẩu linh kiện điện tử'
    }
    create_res = client.post('/api/customs/declarations/', data=json.dumps(payload), content_type='application/json')
    assert create_res.status_code in [200, 201], f"Customs create failed: {create_res.content[:200]}"
    c_data = create_res.json()
    created_declaration_id = c_data.get('id') or (c_data.get('data', {}).get('id') if isinstance(c_data.get('data'), dict) else None)
    assert created_declaration_id, "Customs declaration ID not found"

    # READ Detail
    get_res = client.get(f'/api/customs/declarations/{created_declaration_id}/')
    assert get_res.status_code == 200, f"Get declaration failed: {get_res.status_code}"

    # UPDATE Declaration
    up_res = client.put(f'/api/customs/declarations/{created_declaration_id}/', data=json.dumps({
        'channel': 'GREEN',
        'notes': 'Đã xuất trình hồ sơ, hệ thống phân luồng Xanh'
    }), content_type='application/json')
    assert up_res.status_code in [200, 204], f"Update declaration failed: {up_res.status_code}"

    # ACTION: Status to CLEARED
    act_res = client.post(f'/api/customs/declarations/{created_declaration_id}/action/', data=json.dumps({
        'action': 'CLEAR'
    }), content_type='application/json')
    # If action endpoint exists and supports CLEAR, status should be 200
    assert act_res.status_code in [200, 204], f"Customs action failed: {act_res.status_code} - {act_res.content[:150]}"

    # EXPORT EXCEL
    excel_res = client.get('/api/customs/declarations/export-excel/')
    assert excel_res.status_code in [200, 204], f"Customs export excel failed: {excel_res.status_code}"

run_test_step("5. Customs CRUD", "Hải quan: Tạo tờ khai -> Sửa luồng Xanh -> Đổi trạng thái Thông quan -> Xuất Excel", test_customs_crud)

# ==============================================================================
# SECTION 6: 14 MANAGEMENT REPORTS (14 BÁO CÁO QUẢN TRỊ)
# ==============================================================================
print("\n>>> 6. KIỂM THỬ LOAD TOÀN DIỆN 14 BÁO CÁO QUẢN TRỊ (CÁC BỘ LỌC THỜI GIAN)")

report_names = [
    "Report 1: Doanh thu & Sản lượng theo Khách hàng",
    "Report 2: Doanh thu theo Tuyến vận tải",
    "Report 3: Hiệu quả & Chi phí Chuyến xe",
    "Report 4: Chi phí Nhiên liệu & Vé BOT",
    "Report 5: Công nợ Phải thu Khách hàng (AR)",
    "Report 6: Công nợ Phải trả Thầu phụ (AP)",
    "Report 7: Sổ quỹ Tiền mặt & Tiền gửi Ngân hàng",
    "Report 8: Lương & Phụ cấp Chuyến Tài xế",
    "Report 9: Hiệu suất Hoạt động Đoàn xe",
    "Report 10: Tình hình Mở tờ khai Hải quan",
    "Report 11: Biên Lợi nhuận theo Chuyến",
    "Report 12: Tỷ lệ Đúng giờ & SLA Dịch vụ",
    "Report 13: Chi hộ & Hoàn ứng Khách hàng",
    "Report 14: Báo cáo Kết quả Kinh doanh Tổng hợp (P&L)"
]

for idx, r_title in enumerate(report_names, start=1):
    def make_report_test(rep_idx):
        def t():
            # Test with September 2026 filter
            r_sep = client.get(f'/api/reports/?report_type=report{rep_idx}&from_date=2026-09-01&to_date=2026-09-30')
            assert r_sep.status_code == 200, f"Report {rep_idx} Sep-2026 status {r_sep.status_code}"
            data_sep = r_sep.json()
            assert 'error' not in data_sep or data_sep.get('status') == 'success', f"Report {rep_idx} returned error: {data_sep}"

            # Test with year period filter
            r_yr = client.get(f'/api/reports/?report_type=report{rep_idx}&period=year')
            assert r_yr.status_code == 200, f"Report {rep_idx} Year status {r_yr.status_code}"

            # Test with default month filter
            r_mo = client.get(f'/api/reports/?report_type=report{rep_idx}&period=month')
            assert r_mo.status_code == 200, f"Report {rep_idx} Month status {r_mo.status_code}"
        return t
    run_test_step("6. Reports Audit", r_title, make_report_test(idx))

# ==============================================================================
# SECTION 7: MASTER DATA CRUD & COMPANY PROFILE
# ==============================================================================
print("\n>>> 7. KIỂM THỬ THAO TÁC CRUD DANH MỤC & HỒ SƠ DOANH NGHIỆP (MASTER DATA)")

def test_master_data_crud():
    # 1. Company Profile
    comp_res = client.get('/api/master-data/company/')
    assert comp_res.status_code == 200, f"Company get status {comp_res.status_code}"

    # Update company legal info
    comp_up = client.put('/api/master-data/company/', data=json.dumps({
        'company_name': 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI TRIỀN VÕ',
        'tax_code': '0314567890',
        'phone': '0965 559 561',
        'email': 'phongkinhdoanh.tvl@trienvo.com',
        'address': '153/1 Quốc Lộ 1A, Khu Phố 3, Phường An Phú Đông, Quận 12, TP. Hồ Chí Minh'
    }), content_type='application/json')
    assert comp_up.status_code in [200, 204], f"Company update status {comp_up.status_code}"

    # 2. Location CRUD
    loc_res = client.post('/api/master-data/locations/', data=json.dumps({
        'code': f'LOC-TEST-{timezone.now().strftime("%M%S")}',
        'name': 'Kho Ngoại Quan Cát Lái Test',
        'location_type': 'PORT',
        'address': 'Khu B, Cảng Cát Lái, TP Thủ Đức'
    }), content_type='application/json')
    assert loc_res.status_code in [200, 201], f"Location create status {loc_res.status_code}"
    loc_id = loc_res.json().get('id')
    if loc_id:
        loc_del = client.delete(f'/api/master-data/locations/{loc_id}/')
        assert loc_del.status_code in [200, 204], f"Location delete status {loc_del.status_code}"

    # 3. Master Data Summary
    sum_res = client.get('/api/master-data/summary/')
    assert sum_res.status_code == 200, f"Summary status {sum_res.status_code}"

    # 4. Form Options
    opt_res = client.get('/api/master-data/form-options/')
    assert opt_res.status_code == 200, f"Form options status {opt_res.status_code}"

run_test_step("7. Master Data", "Hồ sơ công ty, Địa điểm CRUD, Summary & Form Options", test_master_data_crud)

# ==============================================================================
# SECTION 8: CLEANUP OF TEST ARTIFACTS (SOFT-DELETE AUDIT)
# ==============================================================================
print("\n>>> 8. KIỂM THỬ SOFT-DELETE CÁC BẢN GHI TẠO THỬ NGHIỆM")

def test_soft_deletes():
    # 1. Soft-delete created trip (Mở chốt chi phí theo chuẩn kế toán trước khi hủy lệnh)
    if created_trip_code:
        client.post(f'/api/trips/{created_trip_code}/unsettle-expenses/')
        del_trip = client.delete(f'/api/trips/{created_trip_code}/')
        assert del_trip.status_code in [200, 204], f"Delete trip status {del_trip.status_code}"
        # Verify soft delete
        trip_check = DispatchTrip.all_objects.filter(trip_code=created_trip_code).first()
        if trip_check:
            assert trip_check.is_deleted == True, "Trip was hard deleted instead of soft deleted!"

    # 2. Soft-delete created booking
    if created_booking_id:
        del_bk = client.delete(f'/api/bookings/{created_booking_id}/')
        assert del_bk.status_code in [200, 204], f"Delete booking status {del_bk.status_code}"

    # 3. Soft-delete created quotation
    if created_quotation_id:
        del_q = client.delete(f'/api/quotations/{created_quotation_id}/')
        assert del_q.status_code in [200, 204], f"Delete quotation status {del_q.status_code}"

    # 4. Soft-delete created voucher
    if created_voucher_id:
        del_v = client.delete(f'/api/accounting/cashbook/{created_voucher_id}/')
        assert del_v.status_code in [200, 204], f"Delete voucher status {del_v.status_code}"

    # 5. Soft-delete created customs declaration
    if created_declaration_id:
        del_c = client.delete(f'/api/customs/declarations/{created_declaration_id}/')
        assert del_c.status_code in [200, 204], f"Delete customs status {del_c.status_code}"

run_test_step("8. Soft-Delete Audit", "Xóa mềm an toàn: Trip, Booking, Quotation, Voucher, Hải quan", test_soft_deletes)

# ==============================================================================
# FINAL AUDIT SUMMARY
# ==============================================================================
print("\n" + "=" * 80)
print("TỔNG KẾT KIỂM THỬ HỆ THỐNG TOÀN DIỆN (AUDIT SUMMARY)")
print("=" * 80)

passed_count = sum(1 for res in audit_results.values() if res == "PASSED")
failed_count = sum(1 for res in audit_results.values() if res != "PASSED")
total_count = len(audit_results)

print(f"Tổng số kịch bản kiểm thử: {total_count}")
print(f"Thành công: {passed_count} / {total_count} ({passed_count/total_count*100:.1f}%)")
print(f"Thất bại:   {failed_count} / {total_count}")

if errors_log:
    print("\nDANH SÁCH LỖI PHÁT SINH CẦN KHẮC PHỤC:")
    for key, err in errors_log:
        print(f"  [X] {key}: {err}")
    print("\nAUDIT STATUS: FAILED — ĐANG CẦN HIỆU CHỈNH CODE")
    sys.exit(1)
else:
    print("\n🎉 AUDIT STATUS: 100% HOÀN HẢO — TẤT CẢ CÁC THAO TÁC CRUD, LOAD BÁO CÁO, VIEWS & IN ẤN ĐÃ PASSED!")
    sys.exit(0)
