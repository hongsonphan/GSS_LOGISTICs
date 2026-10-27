from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from apps.customers.models import Customer, RouteTariff, Quotation, QuotationItem, BookingOrder, BookingStatus
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.personnel.models import Employee

User = get_user_model()

class BookingAndSettlementEnhancementTestCase(TestCase):
    """
    Bộ kiểm thử cho các yêu cầu mới [v4.7.5]:
    1. Tra cứu giá cước báo giá tự động khi lập Booking & Bắt buộc nhập giá
    2. Sắp xếp Booking mới nhất lên đầu danh sách Active Bookings
    3. Quyết toán khách hàng (Customer Settlement SOA)
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='test_user_disp', password='Password123!')
        self.employee = Employee.objects.create(user=self.user, full_name='Giám Đốc Test', role='DIRECTOR')
        self.client.force_authenticate(user=self.user)

        self.customer = Customer.objects.create(name='Công Ty TNHH Logistics Test', code='KH-TEST-001')
        from apps.fleet.models import Vehicle
        self.vehicle = Vehicle.objects.create(license_plate='51C-999.88', vehicle_type='TRACTOR')
        self.driver = Employee.objects.create(full_name='Tài Xế Test', role='DRIVER')

    def test_booking_price_lookup_and_auto_fill(self):
        # 1. Tạo Báo giá APPROVED cho khách hàng
        quote = Quotation.objects.create(
            quotation_code='BG-TEST-2610',
            customer=self.customer,
            status='APPROVED',
            route_description='Cát Lái -> Kho Sóng Thần',
            unit_price=4800000,
            origin_zone='Cát Lái',
            destination_zone='Sóng Thần'
        )

        # 2. Gọi API tra cứu giá cước: /api/sales/price-lookup/
        res = self.client.get('/api/sales/price-lookup/', {
            'customer': self.customer.name,
            'pickup': 'Cát Lái',
            'delivery': 'Kho Sóng Thần'
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['found'])
        self.assertEqual(data['price'], 4800000)
        self.assertIn('BG-TEST-2610', data['source'])

    def test_booking_order_requires_price_when_no_quote(self):
        # Khách hàng mới chưa có báo giá và không gửi selling_freight_price -> HTTP 400
        new_cust = Customer.objects.create(name='Khách Hàng Chưa Có Báo Giá', code='KH-NO-QUOTE')
        res = self.client.post('/api/sales/', data={
            'action': 'create_booking',
            'customer': new_cust.name,
            'booking_number': 'BL-TEST-ERR-PRICE',
            'total_containers': 1,
            'pickup_location': 'CÁT LÁI',
            'delivery_location': 'ĐỊA ĐIỂM LẠ',
            'selling_freight_price': 0
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('bắt buộc', res.json().get('error', '').lower())

    def test_active_bookings_ordered_by_newest_first(self):
        # Tạo booking 1
        b1 = BookingOrder.objects.create(
            booking_code='BK.2610.001',
            customer=self.customer,
            booking_number='BL-001',
            total_containers=2,
            pickup_location='CÁT LÁI',
            delivery_location='KHO 1',
            selling_freight_price=4000000,
            status=BookingStatus.PENDING_DISPATCH
        )
        # Tạo booking 2 sau booking 1
        b2 = BookingOrder.objects.create(
            booking_code='BK.2610.002',
            customer=self.customer,
            booking_number='BL-002',
            total_containers=3,
            pickup_location='CÁT LÁI',
            delivery_location='KHO 2',
            selling_freight_price=4500000,
            status=BookingStatus.PENDING_DISPATCH
        )

        # Gọi API /api/bookings/active/
        res = self.client.get('/api/bookings/active/')
        self.assertEqual(res.status_code, 200)
        bookings = res.json()
        self.assertGreaterEqual(len(bookings), 2)
        # b2 mới tạo phải đứng TRÊN b1
        idx_b2 = next(i for i, b in enumerate(bookings) if b['id'] == b2.id)
        idx_b1 = next(i for i, b in enumerate(bookings) if b['id'] == b1.id)
        self.assertLess(idx_b2, idx_b1, "Booking mới tạo hơn phải hiển thị phía trên booking cũ!")

    def test_customer_reconciliation_settle_and_unsettle(self):
        trip = DispatchTrip.objects.create(
            trip_code='DV.2610.999',
            customer=self.customer,
            vehicle=self.vehicle,
            driver=self.driver,
            status=TripStatus.COMPLETED,
            pickup_location='CÁT LÁI',
            warehouse_location='KHO TEST',
            dropoff_location='BÃI HẠ',
            cached_revenue=Decimal('5000000')
        )

        # 1. Chốt quyết toán khách hàng
        res_settle = self.client.post('/api/accounting/customer-reconciliation/', data={
            'action': 'SETTLE',
            'trip_ids': [trip.id]
        }, format='json')
        self.assertEqual(res_settle.status_code, 200)
        trip.refresh_from_db()
        self.assertTrue(trip.is_customer_settled)

        # 2. Mở lại quyết toán
        res_unsettle = self.client.post('/api/accounting/customer-reconciliation/', data={
            'action': 'UNSETTLE',
            'trip_ids': [trip.id]
        }, format='json')
        self.assertEqual(res_unsettle.status_code, 200)
        trip.refresh_from_db()
        self.assertFalse(trip.is_customer_settled)
