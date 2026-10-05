import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.customers.models import Customer, Quotation, QuotationItem, BookingOrder, BookingStatus
from apps.personnel.models import Employee, Department, EmployeeRole

User = get_user_model()

class QuotationMultiRouteAndPricingMethodTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='sales_mgr', password='password123', is_staff=True)
        self.employee = Employee.objects.create(
            user=self.user,
            code='SALES_TEST_01',
            full_name='Trần Văn Sales',
            department=Department.SALES,
            role=EmployeeRole.SALESMAN,
            phone_number='0988888888'
        )
        self.client.force_authenticate(user=self.user)

        self.customer = Customer.objects.create(
            name='CÔNG TY TNHH LOGISTICS TOÀN CẦU',
            code='CUST_GLOBAL_01',
            tax_code='0312345678',
            address='KCN VSIP 1, Bình Dương',
            phone='0909123456',
            contact_person='Mr. Toàn'
        )

    def test_quotation_creation_with_multi_routes(self):
        """Kiểm thử tạo báo giá với nhiều dòng tuyến đường (Multi-route)."""
        q = Quotation.objects.create(
            quotation_code='BG-TEST-01',
            customer=self.customer,
            pricing_method='MULTI_ROUTE',
            route_description='Cát Lái ➔ VSIP 1',
            unit_price=3500000,
            expected_trips_monthly=20
        )

        item1 = QuotationItem.objects.create(
            quotation=q,
            route_description='Cát Lái ➔ KCN VSIP 1 Bình Dương',
            cargo_type='Cont 40HC',
            estimated_km=30,
            unit_price=3500000,
            expected_trips_monthly=20
        )
        item2 = QuotationItem.objects.create(
            quotation=q,
            route_description='Cái Mép ➔ KCN VSIP 1 Bình Dương',
            cargo_type='Cont 40HC',
            estimated_km=80,
            unit_price=5200000,
            expected_trips_monthly=15
        )

        # Revenue = 3.500.000 * 20 + 5.200.000 * 15 = 70.000.000 + 78.000.000 = 148.000.000
        self.assertEqual(q.items.count(), 2)
        self.assertEqual(q.expected_revenue, 148000000)

    def test_quotation_fuel_adjusted_method(self):
        """Kiểm thử báo giá có gắn biến động giá dầu DO."""
        q = Quotation.objects.create(
            quotation_code='BG-TEST-02',
            customer=self.customer,
            pricing_method='FUEL_ADJUSTED',
            base_fuel_price=21500,
            fuel_step_vnd=1000,
            fuel_ratio_percent=3.5,
            route_description='Cát Lái ➔ Nhơn Trạch',
            unit_price=4000000,
            expected_trips_monthly=10
        )
        self.assertEqual(q.pricing_method, 'FUEL_ADJUSTED')
        self.assertEqual(q.base_fuel_price, 21500)
        self.assertEqual(q.fuel_step_vnd, 1000)
        self.assertEqual(q.fuel_ratio_percent, 3.5)

    def test_api_create_quotation_with_items(self):
        """Kiểm thử API POST /api/sales/ tạo báo giá đa tuyến đường và cơ chế xăng dầu."""
        payload = {
            'action': 'create_quotation',
            'customer': self.customer.name,
            'pricing_method': 'FUEL_ADJUSTED',
            'base_fuel_price': 22000,
            'fuel_step_vnd': 1000,
            'fuel_ratio_percent': 3.5,
            'status': 'NEGOTIATING',
            'template_type': 'STANDARD',
            'items': [
                {
                    'route_description': 'Cát Lái ➔ KCN Sóng Thần 2',
                    'cargo_type': 'Cont 40HC',
                    'estimated_km': 30,
                    'unit_price': 3600000,
                    'expected_trips_monthly': 25
                },
                {
                    'route_description': 'SPITC ➔ KCN Sóng Thần 2',
                    'cargo_type': 'Cont 20GP',
                    'estimated_km': 20,
                    'unit_price': 2800000,
                    'expected_trips_monthly': 10
                }
            ]
        }
        res = self.client.post('/api/sales/', data=payload, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('success'))
        self.assertEqual(res.data.get('items_count'), 2)

        q_id = res.data.get('quotation_id')
        q = Quotation.objects.get(pk=q_id)
        self.assertEqual(q.pricing_method, 'FUEL_ADJUSTED')
        self.assertEqual(q.items.count(), 2)
        # Expected rev = 3.600.000 * 25 + 2.800.000 * 10 = 90.000.000 + 28.000.000 = 118.000.000
        self.assertEqual(q.expected_revenue, 118000000)

    def test_api_quotation_detail_and_update_items(self):
        """Kiểm thử API GET & PUT /api/quotations/<id>/ với danh sách tuyến đường."""
        q = Quotation.objects.create(
            quotation_code='BG-TEST-03',
            customer=self.customer,
            pricing_method='MULTI_ROUTE',
            route_description='Cát Lái ➔ VSIP',
            unit_price=3500000,
            expected_trips_monthly=10
        )
        QuotationItem.objects.create(
            quotation=q,
            route_description='Cát Lái ➔ VSIP',
            cargo_type='Cont 40HC',
            estimated_km=30,
            unit_price=3500000,
            expected_trips_monthly=10
        )

        # GET detail
        res_get = self.client.get(f'/api/quotations/{q.id}/')
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(len(res_get.data.get('items', [])), 1)

        # PUT update with 3 items
        update_payload = {
            'customer': self.customer.name,
            'pricing_method': 'MULTI_ROUTE',
            'status': 'APPROVED',
            'items': [
                {'route_description': 'Tuyến 1: Cát Lái ➔ VSIP 1', 'cargo_type': 'Cont 40HC', 'estimated_km': 30, 'unit_price': 3500000, 'expected_trips_monthly': 20},
                {'route_description': 'Tuyến 2: Cái Mép ➔ VSIP 1', 'cargo_type': 'Cont 40HC', 'estimated_km': 80, 'unit_price': 5200000, 'expected_trips_monthly': 10},
                {'route_description': 'Tuyến 3: Cát Lái ➔ VSIP 2', 'cargo_type': 'Cont 40HC', 'estimated_km': 40, 'unit_price': 4100000, 'expected_trips_monthly': 15}
            ]
        }
        res_put = self.client.put(f'/api/quotations/{q.id}/', data=update_payload, format='json')
        self.assertEqual(res_put.status_code, 200)
        self.assertTrue(res_put.data.get('success'))
        self.assertEqual(len(res_put.data['quotation']['items']), 3)

        q.refresh_from_db()
        self.assertEqual(q.items.count(), 3)
        self.assertEqual(q.status, 'APPROVED')
