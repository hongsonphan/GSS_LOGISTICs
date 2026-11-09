"""Hồi quy cho 3 lỗi nghiêm trọng của đợt rà soát bảo mật (cửa hậu mật khẩu, XSS tên hiển thị, sửa chi phí không kiểm quyền)."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import Client, TestCase
from rest_framework.test import APIClient

from apps.billing.models import TripExpense
from apps.customers.models import Customer
from apps.dispatch.models import DispatchTrip
from apps.fleet.models import Vehicle
from apps.personnel.models import Employee, EmployeeRole

PW = 'Str0ng-Audit-Pass-2026!'


def make_user(name, role=None, phone='0911000001'):
    user = User.objects.create_user(name, email=f'{name}@example.test', password=PW)
    if role:
        Employee.objects.create(user=user, code=name.upper(), full_name=name, phone_number=phone, role=role)
    return user


class NoFallbackPasswordTests(TestCase):
    def test_hardcoded_passwords_do_not_authenticate(self):
        user = make_user('ketoan_x', EmployeeRole.ACCOUNTANT)
        for pw in ('admin', 'admin123', 'Admin@2026', 'KeToan@2026', 'Sales@2026'):
            res = Client().post('/api/auth/token/', {'username': 'ketoan_x', 'password': pw}, content_type='application/json')
            self.assertEqual(res.status_code, 401, pw)
        user.refresh_from_db()
        self.assertTrue(user.check_password(PW))  # mật khẩu thật không bị ghi đè

    def test_real_password_still_works(self):
        make_user('ketoan_y', EmployeeRole.ACCOUNTANT)
        res = Client().post('/api/auth/token/', {'username': 'ketoan_y', 'password': PW}, content_type='application/json')
        self.assertEqual(res.status_code, 200)


class ScriptEmbeddingTests(TestCase):
    def test_display_name_cannot_break_out_of_script(self):
        payload = '</script><script>window.__pwned=1</script>'
        driver = make_user('driver_x', EmployeeRole.DRIVER)
        api = APIClient()
        api.force_authenticate(driver)
        self.assertEqual(api.patch('/api/auth/me/', {'full_name': payload}, format='json').status_code, 200)
        boss = make_user('boss_x', EmployeeRole.DIRECTOR, phone='0911000002')
        client = Client()
        client.force_login(boss)
        html = client.get('/').content.decode()
        self.assertNotIn(payload, html)
        self.assertNotIn('<script>window.__pwned', html)
        self.assertIn('\u003c/script\u003e', html)


class TripExpenseObjectPermissionTests(TestCase):
    def setUp(self):
        cust = Customer.objects.create(code='KH_X', name='Khách X', address='x')
        veh = Vehicle.objects.create(license_plate='51C-0001')
        self.trip = DispatchTrip.objects.create(trip_code='TRIP-X1', customer=cust, vehicle=veh, pickup_location='a', warehouse_location='b')
        self.exp = TripExpense.objects.create(trip=self.trip, amount=Decimal('100000'), status='PENDING')

    def _put(self, user, **data):
        api = APIClient()
        if user:
            api.force_authenticate(user)
        return api.put(f'/api/trips/{self.trip.trip_code}/expenses/{self.exp.pk}/', data, format='json')

    def test_unrelated_users_cannot_edit_or_delete(self):
        for name, role, phone in (('drv_other', EmployeeRole.DRIVER, '0911000003'), ('mech_x', EmployeeRole.MECHANIC, '0911000004'),
                                  ('sales_x', EmployeeRole.SALESMAN, '0911000005'), ('noemp_x', None, '')):
            user = make_user(name, role, phone)
            self.assertEqual(self._put(user, amount=999, status='APPROVED').status_code, 403, name)
            api = APIClient()
            api.force_authenticate(user)
            res = api.delete(f'/api/trips/{self.trip.trip_code}/expenses/{self.exp.pk}/')
            self.assertEqual(res.status_code, 403, name)
        self.exp.refresh_from_db()
        self.assertEqual(self.exp.amount, 100000)
        self.assertEqual(self.exp.status, 'PENDING')
        self.assertFalse(self.exp.is_deleted)

    def test_dispatcher_can_edit_amount(self):
        user = make_user('dieudo_x', EmployeeRole.DISPATCHER, '0911000006')
        self.assertEqual(self._put(user, amount=150000).status_code, 200)
        self.exp.refresh_from_db()
        self.assertEqual(self.exp.amount, 150000)

    def test_driver_link_cannot_self_approve(self):
        DispatchTrip.objects.filter(pk=self.trip.pk).update(driver_token='DRVTOKENX1')
        api = APIClient()
        res = api.put(f'/api/trips/DRVTOKENX1/expenses/{self.exp.pk}/', {'amount': 120000, 'status': 'APPROVED'}, format='json',
                      HTTP_X_TRIP_HASH='DRVTOKENX1')
        self.assertEqual(res.status_code, 200)
        self.exp.refresh_from_db()
        self.assertEqual(self.exp.status, 'PENDING')
