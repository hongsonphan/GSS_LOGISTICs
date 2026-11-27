"""Trang Nhật ký hoạt động: quyền (chỉ Giám đốc / Admin mặc định, trưởng được cấp qua ma trận), lọc, xuất CSV, che dữ liệu nhạy cảm."""
import importlib

from django.test import SimpleTestCase, TestCase

from apps.customers.models import Customer
from apps.personnel.models import EmployeeRole
from core import access
from core.models import AuditLog, LoginEvent, UserAccessOverride, get_default_company
from core.test_access import make_user

migration = importlib.import_module('core.migrations.0004_audit_log_permission')


class AuditLogMatrixTests(SimpleTestCase):
    def test_row_view_and_export_only(self):
        self.assertIn('audit_log', access.MODULE_KEYS)
        self.assertEqual(access.MODULE_ACTIONS['audit_log'], ['view', 'export'])
        self.assertIn('audit_log', access.SETTINGS_KEYS)

    def test_only_admin_and_director_by_default(self):
        for key in ('admin', 'director'):
            self.assertEqual(access.default_group_grants(key)['audit_log'], ['view', 'export'], key)
        for key in ('sales', 'hr', 'accounting', 'dispatch', 'operations', 'customs', 'driver'):
            self.assertNotIn('audit_log', access.default_group_grants(key), key)


class AuditLogMigrationTests(SimpleTestCase):
    def test_migration_grant_idempotent(self):
        out, changed = migration.grant({'dashboard': ['view']})
        self.assertTrue(changed)
        self.assertEqual(out['audit_log'], ['view', 'export'])
        self.assertEqual(migration.grant(out), (out, False))
        self.assertEqual(migration.grant(None), (None, False))


class AuditLogApiTests(TestCase):
    def setUp(self):
        self.company = get_default_company()
        self.director = make_user('giamdoc2', EmployeeRole.DIRECTOR)
        self.dispatcher = make_user('dieuvan2', EmployeeRole.DISPATCHER)
        self.lead = make_user('truongdv', EmployeeRole.LEAD_DISPATCH)
        self.client.force_login(self.director)
        self.customer = Customer.objects.create(code='KH_NK', name='KH Nhật ký', short_name='NKH')
        self.customer.name = 'KH Nhật ký 2'
        self.customer.save()

    def get(self, user, url):
        self.client.force_login(user)
        return self.client.get(url)

    def test_default_access(self):
        self.assertEqual(self.get(self.director, '/api/audit/logs/').status_code, 200)
        self.assertEqual(self.get(self.dispatcher, '/api/audit/logs/').status_code, 403)
        self.assertEqual(self.get(self.lead, '/api/audit/logs/').status_code, 403)
        self.assertEqual(self.get(self.dispatcher, '/api/audit/logins/').status_code, 403)
        self.assertIn(self.client.__class__().get('/api/audit/logs/').status_code, (401, 403))   # chưa đăng nhập

    def test_lead_granted_via_matrix_but_export_separate(self):
        UserAccessOverride.objects.create(user=self.lead, allow={'audit_log': ['view']})
        self.assertEqual(self.get(self.lead, '/api/audit/logs/').status_code, 200)
        self.assertEqual(self.get(self.lead, '/api/audit/logs/?export=csv').status_code, 403)   # có Xem, chưa có Xuất

    def test_list_filters_and_labels(self):
        data = self.get(self.director, '/api/audit/logs/?model=customers.Customer&with_filters=1').json()
        self.assertGreaterEqual(data['count'], 2)
        row = data['results'][0]                       # mới nhất: lần sửa tên
        self.assertEqual(row['kind'], 'update')
        self.assertEqual(row['model_name'].lower(), str(Customer._meta.verbose_name).lower())
        self.assertTrue(any(c['new'] == 'KH NHẬT KÝ 2' for c in row['changes']))
        self.assertTrue(any(m['key'] == 'customers.Customer' for m in data['filters']['models']))
        only_create = self.get(self.director, '/api/audit/logs/?kind=create&model=customers.Customer').json()
        self.assertTrue(all(r['kind'] == 'create' for r in only_create['results']))
        none = self.get(self.director, '/api/audit/logs/?q=khong-ton-tai-xyz').json()
        self.assertEqual(none['count'], 0)

    def test_status_and_delete_kinds(self):
        AuditLog.objects.create(action='update', model_label='customers.Customer', object_id='9', object_repr='X',
                                changes={'status': ['DRAFT', 'APPROVED']}, company=self.company, actor_label='u1')
        AuditLog.objects.create(action='delete', model_label='customers.Customer', object_id='9', object_repr='X',
                                changes={'hard_delete': [False, True]}, company=self.company, actor_label='u1')
        st = self.get(self.director, '/api/audit/logs/?kind=status').json()
        self.assertEqual(st['count'], 1)
        self.assertEqual(st['results'][0]['summary'], 'Trạng thái: DRAFT → APPROVED')
        hd = self.get(self.director, '/api/audit/logs/?kind=hard_delete').json()
        self.assertEqual(hd['count'], 1)
        self.assertEqual(hd['results'][0]['kind_label'], 'Xoá vĩnh viễn')
        by_actor = self.get(self.director, '/api/audit/logs/?actor=u1').json()
        self.assertEqual(by_actor['count'], 2)

    def test_sensitive_values_masked_and_read_only(self):
        AuditLog.objects.create(action='update', model_label='customers.Customer', object_id='9', object_repr='X',
                                changes={'api_token': ['abc', 'def']}, company=self.company, actor_label='u1')
        row = self.get(self.director, '/api/audit/logs/?actor=u1').json()['results'][0]
        self.assertEqual((row['changes'][0]['old'], row['changes'][0]['new']), ('***', '***'))
        self.client.force_login(self.director)
        for method in (self.client.post, self.client.put, self.client.delete):
            self.assertIn(method('/api/audit/logs/').status_code, (403, 405))   # không có thao tác ghi / xoá

    def test_company_scope(self):
        from core.models import Company
        other = Company.objects.create(name='Cty khác')
        AuditLog.objects.create(action='create', model_label='customers.Customer', object_id='77', object_repr='CỦA CÔNG TY KHÁC',
                                changes={}, company=other, actor_label='u2')
        data = self.get(self.director, '/api/audit/logs/?q=CỦA CÔNG TY KHÁC').json()
        self.assertEqual(data['count'], 0)

    def test_export_csv(self):
        res = self.get(self.director, '/api/audit/logs/?export=csv')
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/csv', res['Content-Type'])
        text = res.content.decode('utf-8-sig')
        self.assertIn('Thời gian', text.splitlines()[0])
        self.assertIn('KH NHẬT KÝ', text)   # tên đối tác tự viết HOA khi lưu

    def test_login_events(self):
        LoginEvent.objects.create(user=self.dispatcher, username='dieuvan2', kind='login', ip_address='1.2.3.4')
        LoginEvent.objects.create(username='la', kind='failed', ip_address='9.9.9.9')
        data = self.get(self.director, '/api/audit/logins/?kind=login&with_filters=1').json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['username'], 'dieuvan2')
        self.assertEqual(data['results'][0]['name'], 'NV DIEUVAN2')
        self.assertEqual(self.get(self.director, '/api/audit/logins/?q=9.9.9').json()['count'], 1)
        self.assertEqual(self.get(self.director, '/api/audit/logins/?export=csv').status_code, 200)

    def test_menu_flag(self):
        from core.context_processors import _menu
        self.assertTrue(_menu(self.director)['menu']['audit_log'])
        self.assertFalse(_menu(self.dispatcher)['menu']['audit_log'])

    def test_settings_page_opens_with_audit_log_only(self):
        """Chỉ có quyền Nhật ký (không có cfg_*) vẫn vào được trang Cài đặt (khoá dẫn xuất 'settings')."""
        UserAccessOverride.objects.create(user=self.lead, allow={'audit_log': ['view']})
        self.assertIn('view', access.effective_grants(self.lead).get('settings', []))
