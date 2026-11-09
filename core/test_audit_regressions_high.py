"""Hồi quy cho các lỗi mức Cao của đợt rà soát bảo mật (khoá JWT, throttle, đa doanh nghiệp, media, upload, tài chính)."""
import os
import shutil
import tempfile
from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from rest_framework.test import APIClient

from apps.billing.models import TripExpense
from apps.customers.models import Customer
from apps.dispatch.models import DispatchTrip
from apps.documents.models import TripDocument
from apps.fleet.models import Vehicle
from apps.personnel.models import Employee, EmployeeRole
from core.models import Company, LoginEvent, get_default_company

PW = 'Str0ng-Audit-Pass-2026!'


def make_user(name, role=None, phone='0911000001'):
    user = User.objects.create_user(name, email=f'{name}@example.test', password=PW)
    if role:
        Employee.objects.create(user=user, code=name.upper(), full_name=name, phone_number=phone, role=role)
    return user


class JwtLockoutTests(TestCase):
    def test_failed_token_attempts_are_logged_and_lock(self):
        make_user('lock_x', EmployeeRole.ACCOUNTANT)
        codes = [Client().post('/api/auth/token/', {'username': 'lock_x', 'password': 'sai'}, content_type='application/json').status_code
                 for _ in range(6)]
        self.assertEqual(codes[:5], [401] * 5)
        self.assertEqual(codes[5], 429)
        self.assertEqual(LoginEvent.objects.filter(kind='failed', username='lock_x').count(), 5)

    def test_forged_forwarded_for_does_not_change_throttle_identity(self):
        from rest_framework.request import Request
        from rest_framework.test import APIRequestFactory
        from rest_framework.throttling import AnonRateThrottle
        req = APIRequestFactory().get('/', HTTP_X_FORWARDED_FOR='1.2.3.4, 203.0.113.7', REMOTE_ADDR='10.0.0.1')
        self.assertEqual(AnonRateThrottle().get_ident(Request(req)), '203.0.113.7')


class CrossTenantTests(TestCase):
    def setUp(self):
        self.a = get_default_company()
        self.b = Company.objects.create(code='B_AUDIT', name='Công ty B')
        self.emp_a = Employee.objects.create(code='NVA', full_name='NV A', phone_number='0922000001', role=EmployeeRole.DRIVER, company=self.a)
        self.user_a = make_user('dieudo_ta', EmployeeRole.DISPATCHER, '0922000002')
        self.boss_b = User.objects.create_user('boss_tb', password=PW, email='b@example.test')
        Employee.objects.create(user=self.boss_b, code='GDB', full_name='GĐ B', phone_number='0922000003', role=EmployeeRole.DIRECTOR, company=self.b)
        self.api = APIClient()
        self.api.force_authenticate(self.boss_b)

    def test_employee_hidden_from_other_company(self):
        self.assertEqual(self.api.get(f'/api/personnel/employees/{self.emp_a.pk}/').status_code, 404)

    def test_cannot_manage_access_of_other_company_users(self):
        res = self.api.put(f'/api/access/users/{self.user_a.pk}/', {'groups': ['admin']}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.api.post(f'/api/access/users/{self.user_a.pk}/send-reset/').status_code, 404)

    def test_user_directories_exclude_other_company(self):
        names = {u['username'] for u in self.api.get('/api/collaboration/tasks/directory/').json()['office_users']}
        self.assertNotIn('dieudo_ta', names)


class MediaAccessTests(TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root, True)
        cust = Customer.objects.create(code='KH_M', name='KH M', address='x')
        veh = Vehicle.objects.create(license_plate='51C-0002')
        self.driver = make_user('drv_m', EmployeeRole.DRIVER, '0933000001')
        self.trip = DispatchTrip.objects.create(trip_code='TRIP-M1', customer=cust, vehicle=veh, pickup_location='a',
                                                warehouse_location='b', driver=self.driver.employee)
        os.makedirs(os.path.join(self.root, 'documents'))
        with open(os.path.join(self.root, 'documents', 'TRIP-M1_pod.pdf'), 'wb') as fh:
            fh.write(b'%PDF-1.4 x')
        TripDocument.objects.create(trip=self.trip, title='POD', file_path='/media/documents/TRIP-M1_pod.pdf')

    def _get(self, user, path='/media/documents/TRIP-M1_pod.pdf'):
        c = Client()
        c.force_login(user)
        with override_settings(MEDIA_ROOT=self.root):
            return c.get(path)

    def test_owner_driver_and_dispatcher_can_open(self):
        self.assertEqual(self._get(self.driver).status_code, 200)
        self.assertEqual(self._get(make_user('dd_m', EmployeeRole.DISPATCHER, '0933000002')).status_code, 200)

    def test_other_driver_and_other_company_cannot_open(self):
        self.assertEqual(self._get(make_user('drv_m2', EmployeeRole.DRIVER, '0933000003')).status_code, 404)
        other = Company.objects.create(code='B_MEDIA', name='B')
        boss = User.objects.create_user('boss_mb', password=PW)
        Employee.objects.create(user=boss, code='GDMB', full_name='GĐ', phone_number='0933000004', role=EmployeeRole.DIRECTOR, company=other)
        self.assertEqual(self._get(boss).status_code, 404)

    def test_html_and_svg_are_forced_download(self):
        os.makedirs(os.path.join(self.root, 'office_tasks'))
        for name, data in (('x.html', b'<script>1</script>'), ('x.svg', b'<svg onload="1"/>')):
            with open(os.path.join(self.root, 'office_tasks', name), 'wb') as fh:
                fh.write(data)
            res = self._get(self.driver, f'/media/office_tasks/{name}')
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res['Content-Disposition'].startswith('attachment'))
            self.assertEqual(res['Content-Type'], 'application/octet-stream')


class AttachmentValidationTests(TestCase):
    def test_html_and_oversize_rejected_on_task_attachment(self):
        from apps.collaboration.models import OfficeTask
        task = OfficeTask.objects.create(code='T-AUD', title='t')
        api = APIClient()
        api.force_authenticate(make_user('drv_t', EmployeeRole.DRIVER, '0944000001'))
        url = f'/api/collaboration/tasks/{task.pk}/attachments/'
        for name, data in (('evil.html', b'<script>1</script>'), ('evil.svg', b'<svg/>'), ('big.pdf', b'0' * (11 * 1024 * 1024))):
            res = api.post(url, {'files': SimpleUploadedFile(name, data)}, format='multipart')
            self.assertEqual(res.status_code, 400, name)
        ok = api.post(url, {'files': SimpleUploadedFile('ok.pdf', b'%PDF-1.4')}, format='multipart')
        self.assertEqual(ok.status_code, 201)


class FinanceVisibilityTests(TestCase):
    def setUp(self):
        cust = Customer.objects.create(code='KH_F', name='KH F', address='x')
        veh = Vehicle.objects.create(license_plate='51C-0003')
        self.trip = DispatchTrip.objects.create(trip_code='TRIP-F1', customer=cust, vehicle=veh, pickup_location='a', warehouse_location='b')
        TripExpense.objects.create(trip=self.trip, amount=Decimal('250000'), status='APPROVED')

    def _detail(self, user):
        api = APIClient()
        api.force_authenticate(user)
        return api.get(f'/api/trips/{self.trip.trip_code}/').json()

    def test_driver_sees_no_financials_but_dispatcher_does(self):
        drv_user = make_user('drv_f', EmployeeRole.DRIVER, '0955000001')
        self.trip.driver = drv_user.employee
        self.trip.save()
        drv = self._detail(drv_user)
        self.assertEqual(drv['financials']['expense'], 0)
        self.assertEqual(drv['cost_sheet']['total_expense'], 0)
        disp = self._detail(make_user('dd_f', EmployeeRole.DISPATCHER, '0955000002'))
        self.assertGreater(disp['financials']['expense'], 0)

    def test_pivot_revenue_denied_for_non_finance(self):
        api = APIClient()
        api.force_authenticate(make_user('drv_p', EmployeeRole.DRIVER, '0955000003'))
        self.assertEqual(api.get('/api/dashboard/pivot/?metric=revenue').status_code, 403)
        self.assertEqual(api.get('/api/dashboard/pivot/?metric=trip_count').status_code, 200)
        acc = APIClient()
        acc.force_authenticate(make_user('kt_p', EmployeeRole.ACCOUNTANT, '0955000004'))
        self.assertEqual(acc.get('/api/dashboard/pivot/?metric=revenue').status_code, 200)
