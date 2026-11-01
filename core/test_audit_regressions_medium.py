"""Hồi quy cho các lỗi mức Trung bình của đợt rà soát bảo mật."""
import io
import re

import openpyxl
from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import Client, TestCase
from rest_framework.test import APIClient

from apps.personnel.models import Employee, EmployeeRole
from core.models import Company
from core.validators import excel_safe

PW = 'Str0ng-Audit-Pass-2026!'


def make_user(name, role=None, phone='0966000001', **kw):
    user = User.objects.create_user(name, email=f'{name}@example.test', password=PW, **kw)
    if role:
        Employee.objects.create(user=user, code=name.upper(), full_name=name, phone_number=phone, role=role)
    return user


class ExcelInjectionTests(TestCase):
    def test_excel_safe(self):
        for v in ('=1+1', '+1', '-1', '@x', '\tx'):
            self.assertTrue(excel_safe(v).startswith("'"))
        self.assertEqual(excel_safe('Nguyễn Văn A'), 'Nguyễn Văn A')
        self.assertEqual(excel_safe(5), 5)

    def test_employee_export_neutralises_formula(self):
        Employee.objects.create(code='EXP1', full_name='=HYPERLINK("http://evil","x")', phone_number='0966000009', role=EmployeeRole.DRIVER)
        api = APIClient()
        api.force_authenticate(make_user('boss_e', EmployeeRole.DIRECTOR, '0966000002'))
        res = api.get('/api/personnel/employees/export-data/')
        self.assertEqual(res.status_code, 200)
        wb = openpyxl.load_workbook(io.BytesIO(res.content))
        formulas = [c.value for ws in wb for row in ws.iter_rows() for c in row if c.data_type == 'f']
        self.assertEqual(formulas, [])


class ErrorHandlingTests(TestCase):
    def setUp(self):
        self.api = APIClient(raise_request_exception=False)
        self.api.force_authenticate(make_user('boss_h', EmployeeRole.DIRECTOR, '0966000003'))

    def test_non_numeric_ids_are_400_not_500(self):
        for path in ('/api/accounting/customer-reconciliation/?customer_id=%27', '/api/reports/?vehicle_id=%27',
                     '/api/customs/?customer_id=99999999999999999999'):
            self.assertEqual(self.api.get(path).status_code, 400, path)

    def test_statement_does_not_echo_orm_message(self):
        res = self.api.get('/api/accounting/customer-statement/?customer_id=%27')
        self.assertNotIn('expected a number', res.content.decode())


class MasterDataPermissionTests(TestCase):
    def test_driver_cannot_read_sensitive_master_data(self):
        api = APIClient()
        api.force_authenticate(make_user('drv_md', EmployeeRole.DRIVER, '0966000004'))
        for path in ('/api/master-data/opening-balances/', '/api/master-data/driver-tariffs/', '/api/master-data/allowances/'):
            self.assertEqual(api.get(path).status_code, 403, path)

    def test_accountant_can_read_opening_balances(self):
        api = APIClient()
        api.force_authenticate(make_user('kt_md', EmployeeRole.ACCOUNTANT, '0966000005'))
        self.assertEqual(api.get('/api/master-data/opening-balances/').status_code, 200)

    def test_only_admin_module_can_edit_company_profile(self):
        sales = APIClient()
        sales.force_authenticate(make_user('sales_md', EmployeeRole.SALESMAN, '0966000006'))
        self.assertEqual(sales.put('/api/master-data/company/', {'short_name': 'HACK'}, format='json').status_code, 403)
        boss = APIClient()
        boss.force_authenticate(make_user('boss_md', EmployeeRole.DIRECTOR, '0966000007'))
        self.assertEqual(boss.put('/api/master-data/company/', {'short_name': 'OK'}, format='json').status_code, 200)

    def test_shared_config_write_needs_superuser_when_multiple_companies(self):
        kt = APIClient()
        kt.force_authenticate(make_user('kt_sc', EmployeeRole.ACCOUNTANT, '0966000008'))
        url = '/api/personnel/tax-brackets/'
        self.assertNotEqual(kt.post(url, {}, format='json').status_code, 403)  # một công ty: như cũ
        Company.objects.create(code='B_SC', name='B')
        self.assertEqual(kt.post(url, {}, format='json').status_code, 403)
        self.assertEqual(kt.get(url).status_code, 200)
        root = APIClient()
        root.force_authenticate(make_user('root_sc', is_superuser=True, is_staff=True))
        self.assertNotEqual(root.post(url, {}, format='json').status_code, 403)


class JwtRevocationTests(TestCase):
    def test_tokens_die_after_password_change(self):
        user = make_user('jwt_x', EmployeeRole.ACCOUNTANT, '0966000010')
        tok = Client().post('/api/auth/token/', {'username': 'jwt_x', 'password': PW}, content_type='application/json').json()
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION='Bearer ' + tok['access'])
        self.assertEqual(api.get('/api/auth/me/').status_code, 200)
        user.set_password('Another-Long-Pass-2026!')
        user.save()
        self.assertEqual(api.get('/api/auth/me/').status_code, 401)
        self.assertEqual(APIClient().post('/api/auth/token/refresh/', {'refresh': tok['refresh']}, format='json').status_code, 401)

    def test_refresh_works_when_password_unchanged(self):
        make_user('jwt_y', EmployeeRole.ACCOUNTANT, '0966000011')
        tok = Client().post('/api/auth/token/', {'username': 'jwt_y', 'password': PW}, content_type='application/json').json()
        res = APIClient().post('/api/auth/token/refresh/', {'refresh': tok['refresh']}, format='json')
        self.assertEqual(res.status_code, 200)


class ResetPerAccountLimitTests(TestCase):
    def test_victim_gets_at_most_five_emails_per_hour_across_ips(self):
        cache.clear()
        make_user('victim_x', EmployeeRole.ACCOUNTANT, '0966000012')
        mail.outbox.clear()
        c = Client()
        for i in range(1, 13):
            ip = f'6.6.6.{i}'
            c.post('/password-reset/', {'identifier': 'victim_x'}, REMOTE_ADDR=ip, HTTP_X_REAL_IP=ip)
        self.assertEqual(len(mail.outbox), 5)
