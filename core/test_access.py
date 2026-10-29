"""Ma trận phân quyền: quyền chức danh, ngoại lệ cá nhân, API trang Phân quyền, chặn rò dữ liệu nhạy cảm."""
import json

from django.contrib.auth.models import Group, Permission, User
from django.core.management import call_command
from django.test import TestCase

from apps.personnel.models import Employee, EmployeeRole
from core import access
from core.models import RoleAccess, UserAccessOverride, get_default_company

PW = 'Pw-Access#2026'


def make_user(username, role, **emp):
    user = User.objects.create_user(username, password=PW)
    Employee.objects.create(user=user, code=username.upper()[:10], full_name=f'NV {username}', role=role,
                            phone_number=f'09{abs(hash(username)) % 10**8:08d}', national_id='079123456789',
                            bank_account='0123456789', **emp)
    return user


class AccessMatrixTests(TestCase):
    def setUp(self):
        self.company = get_default_company()
        self.director = make_user('giamdoc', EmployeeRole.DIRECTOR)
        self.dispatcher = make_user('dieuvan', EmployeeRole.DISPATCHER)
        self.driver = make_user('taixe', EmployeeRole.DRIVER)
        self.accountant = make_user('ketoan', EmployeeRole.ACCOUNTANT)

    def get(self, user, url):
        self.client.force_login(user)
        return self.client.get(url)

    def put(self, user, url, body):
        self.client.force_login(user)
        return self.client.put(url, json.dumps(body), content_type='application/json')

    # ---- quyền chức danh mặc định
    def test_defaults(self):
        self.assertTrue(access.allowed(self.dispatcher, 'dispatch', 'create'))
        self.assertFalse(access.allowed(self.dispatcher, 'accounting', 'view'))
        self.assertTrue(access.allowed(self.accountant, 'ledger', 'view'))
        self.assertEqual(access.effective_grants(self.driver), {'dashboard': ['view'], 'master_data': ['view']})
        self.assertEqual(self.get(self.dispatcher, '/api/trips/').status_code, 200)
        res = self.get(self.dispatcher, '/api/ledger/trial-balance/')
        self.assertEqual(res.status_code, 403)
        self.assertIn('Sổ sách kế toán', res.json().get('detail', '') + json.dumps(res.json(), ensure_ascii=False))

    def test_role_change_applies(self):
        RoleAccess.objects.create(company=self.company, role=EmployeeRole.DISPATCHER, grants={'dashboard': ['view']})
        self.assertEqual(self.get(self.dispatcher, '/api/trips/').status_code, 403)

    def test_user_override_allow_and_deny(self):
        UserAccessOverride.objects.create(user=self.dispatcher, company=self.company,
                                          allow={'ledger': ['view']}, deny={'dispatch': ['create']})
        self.assertEqual(self.get(self.dispatcher, '/api/ledger/trial-balance/').status_code, 200)
        self.client.force_login(self.dispatcher)
        self.assertEqual(self.client.post('/api/trips/', {}, content_type='application/json').status_code, 403)

    def test_inactive_employee_has_no_access(self):
        self.dispatcher.employee.is_active = False
        self.dispatcher.employee.save()
        self.assertEqual(access.effective_grants(User.objects.get(pk=self.dispatcher.pk)), {})

    # ---- dữ liệu nhạy cảm
    def test_employee_directory_hides_sensitive_fields(self):
        rows = self.get(self.driver, '/api/personnel/employees/').json()['results']
        self.assertTrue(rows)
        self.assertNotIn('national_id', rows[0])
        self.assertNotIn('bank_account', rows[0])
        full = self.get(self.accountant, '/api/personnel/employees/').json()['results']
        self.assertIn('national_id', full[0])
        own = self.get(self.driver, f'/api/personnel/employees/{self.driver.employee.pk}/').json()
        self.assertIn('national_id', own)

    def test_payroll_and_hr_export_need_permission(self):
        self.assertEqual(self.get(self.dispatcher, '/api/personnel/periods/').status_code, 403)
        self.assertEqual(self.get(self.dispatcher, '/api/personnel/contracts/').status_code, 403)
        self.assertEqual(self.get(self.dispatcher, '/api/personnel/employees/export-data/').status_code, 403)
        self.assertEqual(self.get(self.accountant, '/api/personnel/periods/').status_code, 200)

    def test_dashboard_hides_finance_for_non_finance(self):
        data = self.get(self.driver, '/api/dashboard/').json()
        self.assertEqual(data['financial']['cash_on_hand'], 0)
        self.assertEqual(self.get(self.accountant, '/api/dashboard/').status_code, 200)

    def test_quick_driver_create_requires_dispatch_or_hr(self):
        self.client.force_login(self.driver)
        res = self.client.post('/api/personnel/drivers/quick-create/', {'full_name': 'A', 'phone_number': '0911111111'},
                               content_type='application/json')
        self.assertEqual(res.status_code, 403)

    # ---- API trang Phân quyền
    def test_matrix_api_admin_only(self):
        self.assertEqual(self.get(self.dispatcher, '/api/access/matrix/').status_code, 403)
        self.assertEqual(self.get(self.dispatcher, '/api/master-data/roles-permissions/').status_code, 403)
        data = self.get(self.director, '/api/access/matrix/').json()
        self.assertTrue(data['can_edit'])
        self.assertIn('dispatch', [m['key'] for m in data['modules']])

    def test_save_role_and_director_keeps_admin(self):
        res = self.put(self.director, '/api/access/roles/DISPATCHER/', {'grants': {'dispatch': ['view'], 'bogus': ['view']}})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(RoleAccess.objects.get(role='DISPATCHER').grants, {'dispatch': ['view']})
        self.put(self.director, '/api/access/roles/DIRECTOR/', {'grants': {}})
        self.assertIn('edit', RoleAccess.objects.get(role='DIRECTOR').grants['admin'])
        self.client.delete('/api/access/roles/DISPATCHER/')
        self.assertFalse(RoleAccess.objects.filter(role='DISPATCHER').exists())

    def test_user_override_api(self):
        res = self.put(self.director, f'/api/access/users/{self.dispatcher.pk}/',
                       {'allow': {'accounting': ['view']}, 'deny': {'dispatch': ['delete']}, 'note': 'Kiêm thủ quỹ'})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(access.allowed(User.objects.get(pk=self.dispatcher.pk), 'accounting', 'view'))
        bad = self.put(self.director, f'/api/access/users/{self.dispatcher.pk}/', {'allow': {'dispatch': ['view']}, 'deny': {'dispatch': ['view']}})
        self.assertEqual(bad.status_code, 400)
        self_lock = self.put(self.director, f'/api/access/users/{self.director.pk}/', {'deny': {'admin': ['edit']}})
        self.assertEqual(self_lock.status_code, 400)

    def test_sidebar_follows_matrix(self):
        html = self.get(self.dispatcher, '/dashboard/').content.decode()
        self.assertIn('data-target="dieu-van"', html)
        self.assertNotIn('data-target="nhan-su"', html)  # điều vận không có quyền Nhân sự / Bảng lương
        self.assertIn('window.BIM_ACCESS = {', html)

    # ---- chuyển đổi không mất quyền cũ
    def test_legacy_migration_keeps_existing_access(self):
        UserAccessOverride.objects.all().delete()
        group, _ = Group.objects.get_or_create(name='Kế Toán Cước')
        self.dispatcher.groups.add(group)
        self.dispatcher.user_permissions.add(Permission.objects.get(codename='view_cashtransaction'))
        call_command('migrate_legacy_access', stdout=open('/dev/null', 'w'))
        user = User.objects.get(pk=self.dispatcher.pk)
        self.assertTrue(access.allowed(user, 'accounting', 'view'))
        ov = UserAccessOverride.objects.get(user=user)
        self.assertIn('Chuyển đổi', ov.note)
        call_command('migrate_legacy_access', stdout=open('/dev/null', 'w'))  # chạy lại không đổi gì
        self.assertEqual(UserAccessOverride.objects.filter(user=user).count(), 1)
