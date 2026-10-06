import os
import sys
import json
import datetime
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

User = get_user_model()
admin_user = User.objects.filter(is_superuser=True).first()

client = Client()
client.force_login(admin_user)

print('=== STARTING 10 CRITICAL USER JOURNEYS TEST ===')
journey_results = {}
errors_detailed = []

# --- JOURNEY 1: QUOTATIONS (SALE) ---
try:
    cust = Customer.objects.first() or Customer.objects.create(name='Test Customer Journey', phone='0901234567')
    quote_res = client.post('/api/sales/', data=json.dumps({
        'customer_id': cust.id,
        'pickup_address': 'Cảng Cát Lái, Q2, TP.HCM',
        'delivery_address': 'KCN VSIP 1, Thuận An, Bình Dương',
        'cargo_type': 'Hàng may mặc xuất khẩu',
        'container_type': '40HC',
        'distance_km': 45.5,
        'rate': 3500000,
        'valid_until': '2026-12-31',
        'pricing_method': 'STANDARD',
        'vat_rate': 8,
        'payment_terms': 'Công nợ 30 ngày',
        'routes': [
            {
                'pickup_location': 'Cảng Cát Lái',
                'delivery_location': 'KCN VSIP 1, Bình Dương',
                'container_type': '40HC',
                'distance_km': 45.5,
                'rate': 3500000,
                'note': 'Tuyến chính'
            },
            {
                'pickup_location': 'Cảng SP-ITC',
                'delivery_location': 'KCN Tân Bình',
                'container_type': '20GP',
                'distance_km': 25.0,
                'rate': 2200000,
                'note': 'Tuyến phụ'
            }
        ]
    }), content_type='application/json')
    assert quote_res.status_code in [200, 201], f'Status {quote_res.status_code}: {quote_res.content[:200]}'
    journey_results['Journey 1: Quotations (Multi-route)'] = 'PASSED'
except Exception as e:
    journey_results['Journey 1: Quotations (Multi-route)'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 1', str(e)))

# --- JOURNEY 2: BOOKINGS (SALE) ---
try:
    cust = Customer.objects.first()
    ts = timezone.now().strftime('%y%m%d%H%M%S')
    book_res = client.post('/api/sales/', data={
        'action': 'create_booking',
        'customer': cust.name,
        'booking_number': f'BK-{ts}',
        'booking_type': 'EXPORT_FCL',
        'shipping_line': 'ONE',
        'vessel_voyage': 'ONE APUS 002E',
        'pickup_location': 'Cát Lái',
        'delivery_location': 'Kho Logis, Sóng Thần',
        'dropoff_location': 'Hạ bãi Cát Lái',
        'commodity': 'Thiết bị điện tử',
        'container_size': '40HC',
        'total_containers': 2,
        'selling_freight_price': 3800000,
        'loading_date': '2026-10-15',
        'loading_time': '08:00',
        'free_time_detention': 7,
        'free_time_demurrage': 7,
        'status': 'PENDING_DISPATCH'
    })
    assert book_res.status_code in [200, 201], f'Status {book_res.status_code}: {book_res.content[:200]}'
    journey_results['Journey 2: Bookings Creation'] = 'PASSED'
except Exception as e:
    journey_results['Journey 2: Bookings Creation'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 2', str(e)))

# --- JOURNEY 3: DISPATCH TRIP CREATION & LIFECYCLE ---
try:
    cust = Customer.objects.first()
    driver = Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True).first()
    vehicle = Vehicle.objects.first()
    trip_res = client.post('/api/trips/', data=json.dumps({
        'customer_id': cust.id,
        'driver': driver.nickname or driver.full_name if driver else '',
        'driver_id': driver.id if driver else None,
        'vehicle': vehicle.license_plate if vehicle else '',
        'vehicle_id': vehicle.id if vehicle else None,
        'pickup': 'Cảng Cát Lái',
        'warehouse': 'KCN Mỹ Phước 3',
        'dropoff': 'Hạ bãi Cát Lái',
        'container_number': 'TCLU1234567',
        'container_type': '40HC',
        'seal_number': 'SEAL987654',
        'revenue': 4200000,
        'driver_allowance': 800000,
        'status': TripStatus.DISPATCHED
    }), content_type='application/json')
    assert trip_res.status_code in [200, 201], f'Trip create status {trip_res.status_code}: {trip_res.content[:200]}'
    created_trip_code = trip_res.json().get('trip_code') or trip_res.json().get('id')

    # Add expense
    exp_res = client.post(f'/api/trips/{created_trip_code}/expenses/', data=json.dumps({
        'expense_type': 'TOLL_BOT',
        'amount': 150000,
        'description': 'Vé BOT Cầu Phú Mỹ',
        'is_on_behalf_of_customer': False
    }), content_type='application/json')
    assert exp_res.status_code in [200, 201], f'Expense add status {exp_res.status_code}: {exp_res.content[:200]}'

    # Add milestone
    ms_res = client.post(f'/api/trips/{created_trip_code}/milestones/', data=json.dumps({
        'milestone': 'ARRIVED_WAREHOUSE',
        'notes': 'Tài xế đã đến cổng kho kiểm tra cont'
    }), content_type='application/json')
    assert ms_res.status_code in [200, 201], f'Milestone add status {ms_res.status_code}: {ms_res.content[:200]}'

    journey_results['Journey 3: Dispatch Trip Lifecycle'] = 'PASSED'
except Exception as e:
    journey_results['Journey 3: Dispatch Trip Lifecycle'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 3', str(e)))

# --- JOURNEY 4: DRIVER PORTAL ACCESS ---
try:
    test_trip = DispatchTrip.objects.filter(is_deleted=False).first()
    if test_trip:
        driver_token = getattr(test_trip, 'driver_token', None) or getattr(test_trip, 'driver_hashid', None) or test_trip.hashid
        portal_res = client.get(f'/driver/{driver_token}/')
        assert portal_res.status_code == 200, f'Driver portal status {portal_res.status_code}'
    journey_results['Journey 4: Driver Portal Access'] = 'PASSED'
except Exception as e:
    journey_results['Journey 4: Driver Portal Access'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 4', str(e)))

# --- JOURNEY 5: PUBLIC TRACKING ---
try:
    test_trip = DispatchTrip.objects.filter(is_deleted=False).first()
    if test_trip:
        thash = getattr(test_trip, 'tracking_hash', None) or test_trip.trip_code or str(test_trip.id)
        track_res = client.get(f'/tracking/{thash}/')
        assert track_res.status_code == 200, f'Public tracking status {track_res.status_code}'
    journey_results['Journey 5: Public Tracking Portal'] = 'PASSED'
except Exception as e:
    journey_results['Journey 5: Public Tracking Portal'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 5', str(e)))

# --- JOURNEY 6: CASH TRANSACTIONS & SỔ QUỸ ---
try:
    cash_res = client.post('/api/accounting/cashbook/', data=json.dumps({
        'transaction_type': 'INFLOW',
        'payment_method': 'BANK',
        'category': 'FREIGHT_REVENUE',
        'amount': 15000000,
        'partner_type': 'CUSTOMER',
        'partner_name': 'Công ty TNHH Vận Tải Mẫu',
        'ref_code': 'UNC-99281',
        'bank_name': 'Vietcombank',
        'bank_account': '0071000123456',
        'notes': 'Khách thanh toán cước vận chuyển chuyến'
    }), content_type='application/json')
    assert cash_res.status_code in [200, 201], f'Cash create status {cash_res.status_code}: {cash_res.content[:200]}'
    journey_results['Journey 6: Cashbook Transactions'] = 'PASSED'
except Exception as e:
    journey_results['Journey 6: Cashbook Transactions'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 6', str(e)))

# --- JOURNEY 7: DRIVER BATCH SETTLEMENT ---
try:
    driver = Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True).first()
    preview_res = client.get(f'/api/accounting/driver-settlements/batch-preview/?group_by=driver&driver_id={driver.id if driver else 1}&from_date=2026-01-01&to_date=2026-12-31')
    assert preview_res.status_code == 200, f'Batch preview status {preview_res.status_code}: {preview_res.content[:200]}'
    journey_results['Journey 7: Driver Settlement Query'] = 'PASSED'
except Exception as e:
    journey_results['Journey 7: Driver Settlement Query'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 7', str(e)))

# --- JOURNEY 8: CUSTOMS DECLARATIONS ---
try:
    cust = Customer.objects.first()
    ts = timezone.now().strftime('%m%d%H%M%S')
    dec_no = f'1059{ts}'
    customs_res = client.post('/api/customs/declarations/', data=json.dumps({
        'declaration_number': dec_no,
        'declaration_type': 'IMPORT',
        'customs_office': 'Cát Lái (02CI)',
        'customer_id': cust.id,
        'tax_amount': 25000000,
        'status': 'REGISTERED'
    }), content_type='application/json')
    assert customs_res.status_code in [200, 201], f'Customs create status {customs_res.status_code}: {customs_res.content[:200]}'
    journey_results['Journey 8: Customs Declarations'] = 'PASSED'
except Exception as e:
    journey_results['Journey 8: Customs Declarations'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 8', str(e)))

# --- JOURNEY 9: 14 REPORTS GENERATION ---
try:
    for i in range(1, 15):
        rep_res = client.get(f'/api/reports/?report_type=report{i}')
        assert rep_res.status_code == 200, f'Report {i} status {rep_res.status_code}'
    journey_results['Journey 9: All 14 Reports Generation'] = 'PASSED'
except Exception as e:
    journey_results['Journey 9: All 14 Reports Generation'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 9', str(e)))

# --- JOURNEY 10: MASTER DATA ---
try:
    loc_res = client.get('/api/master-data/locations/')
    assert loc_res.status_code == 200, f'Locations status {loc_res.status_code}'
    veh_res = client.get('/api/master-data/vehicles/')
    assert veh_res.status_code == 200, f'Vehicles status {veh_res.status_code}'
    summary_res = client.get('/api/master-data/summary/')
    assert summary_res.status_code == 200, f'Summary status {summary_res.status_code}'
    journey_results['Journey 10: Master Data Exploration'] = 'PASSED'
except Exception as e:
    journey_results['Journey 10: Master Data Exploration'] = f'FAILED: {e}'
    errors_detailed.append(('Journey 10', str(e)))

print('\n=== JOURNEY RESULTS SUMMARY ===')
for j, res in journey_results.items():
    icon = '✅' if 'PASSED' in res else '❌'
    print(f'{icon} {j}: {res}')

if errors_detailed:
    print(f'\nTotal errors encountered: {len(errors_detailed)}')
    for item in errors_detailed:
        print(f' - {item[0]}: {item[1]}')
    sys.exit(1)
else:
    print('\n🎉 ALL 10 USER JOURNEYS PASSED WITH 0 ERRORS!')
