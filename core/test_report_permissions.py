"""Quyền xem từng báo cáo và việc một người thuộc nhiều nhóm."""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from apps.personnel.models import Employee, EmployeeRole
from core import access
from core.models import AccessGroup, UserAccessOverride, get_default_company

PW = 'Str0ng-Report-Pass-2026!'


def make_user(name, role, phone):
    user = User.objects.create_user(name, email=f'{name}@example.test', password=PW)
    Employee.objects.create(user=user, code=name.upper(), full_name=name, phone_number=phone, role=role)
    return user


def report_payload(user):
    api = APIClient()
    api.force_authenticate(user)
    res = api.get('/api/reports/')
    return res, (res.json() if res.status_code == 200 else {})


def visible(body):
    data = body.get('data', body)
    return {k.split('_')[0] for k, v in data.items() if k.startswith('report') and v}


class PerReportPermissionTests(TestCase):
    def test_each_report_is_its_own_row_in_the_matrix(self):
        keys = {m[0] for m in access.MODULES}
        self.assertTrue({'rpt_pnl', 'rpt_ar_aging', 'rpt_dem_det', 'rpt_crm_quotations'} <= keys)
        self.assertNotIn('reports_fin', keys)

    def test_defaults_keep_previous_visibility(self):
        acc = access.default_group_grants('accounting')
        self.assertIn('view', acc['rpt_pnl'])
        self.assertIn('view', acc['rpt_dem_det'])
        self.assertNotIn('rpt_pnl', access.default_group_grants('dispatch'))
        self.assertIn('rpt_driver_advances', access.default_group_grants('dispatch'))
        self.assertNotIn('rpt_dem_det', access.default_group_grants('sales'))

    def test_deny_hides_only_that_report(self):
        user = make_user('dv_rpt', EmployeeRole.DISPATCHER, '0971000001')
        res, body = report_payload(user)
        self.assertEqual(res.status_code, 200)
        before = visible(body)
        self.assertIn('report2', before)
        UserAccessOverride.objects.create(user=user, company=get_default_company(), deny={'rpt_dem_det': ['view']})
        res, body = report_payload(User.objects.get(pk=user.pk))
        self.assertEqual(visible(body), before - {'report2'})

    def test_allow_shows_extra_report(self):
        user = make_user('sl_rpt', EmployeeRole.SALESMAN, '0971000002')
        _res, body = report_payload(user)
        self.assertNotIn('report3', visible(body))
        UserAccessOverride.objects.create(user=user, company=get_default_company(), allow={'rpt_otp': ['view']})
        _res, body = report_payload(User.objects.get(pk=user.pk))
        self.assertIn('report3', visible(body))

    def test_user_without_any_report_is_refused(self):
        user = make_user('drv_rpt', EmployeeRole.DRIVER, '0971000003')
        res, _ = report_payload(user)
        self.assertEqual(res.status_code, 403)

    def test_legacy_stored_keys_still_work(self):
        AccessGroup.objects.create(company=get_default_company(), key='sales', grants={'dashboard': ['view'], 'reports_fin': ['view']})
        user = make_user('sl2_rpt', EmployeeRole.SALESMAN, '0971000004')
        grants = access.effective_grants(user)
        self.assertIn('view', grants['rpt_pnl'])
        self.assertIn('view', grants['reports_fin'])
        self.assertNotIn('rpt_dem_det', grants)


class MultipleGroupTests(TestCase):
    def test_user_gets_union_of_two_groups(self):
        user = make_user('multi_g', EmployeeRole.ACCOUNTANT, '0971000005')
        self.assertFalse(access.allowed(user, 'dispatch', 'create'))
        UserAccessOverride.objects.create(user=user, company=get_default_company(), groups=['dispatch', 'customs'])
        user = User.objects.get(pk=user.pk)
        self.assertTrue(access.allowed(user, 'accounting', 'approve'))   # nhóm chính (Kế toán)
        self.assertTrue(access.allowed(user, 'dispatch', 'create'))      # nhóm kiêm nhiệm 1
        self.assertTrue(access.allowed(user, 'customs', 'create'))       # nhóm kiêm nhiệm 2

    def test_api_saves_two_groups_and_deny_still_wins(self):
        boss = make_user('boss_mg', EmployeeRole.DIRECTOR, '0971000006')
        target = make_user('tgt_mg', EmployeeRole.SALESMAN, '0971000007')
        api = APIClient()
        api.force_authenticate(boss)
        res = api.put(f'/api/access/users/{target.pk}/', {'groups': ['dispatch', 'hr'], 'deny': {'hr': ['delete']}}, format='json')
        self.assertEqual(res.status_code, 200)
        row = next(u for u in res.json()['users'] if u['id'] == target.pk)
        self.assertEqual(row['groups'], ['dispatch', 'hr'])
        target = User.objects.get(pk=target.pk)
        self.assertTrue(access.allowed(target, 'hr', 'edit'))
        self.assertFalse(access.allowed(target, 'hr', 'delete'))


class ReportMigrationTests(TestCase):
    def test_convert_legacy_grants(self):
        import importlib
        convert = importlib.import_module('core.migrations.0012_report_permissions').convert
        out, changed = convert({'sales': ['view'], 'reports_fin': ['view', 'export'], 'advances': ['view']}, True)
        self.assertTrue(changed)
        self.assertNotIn('reports_fin', out)
        self.assertEqual(out['rpt_pnl'], ['export', 'view'])
        self.assertIn('rpt_crm_quotations', out)
        self.assertIn('rpt_driver_advances', out)
        self.assertNotIn('rpt_dem_det', out)
        again, changed = convert(out, True)
        self.assertFalse(changed)
        self.assertEqual(again, out)


class RealDatabaseGroupTests(TestCase):
    """Nhóm quyền lấy từ bảng Nhóm thật của cơ sở dữ liệu (trang admin), không phải danh sách cố định trong code."""

    def setUp(self):
        from django.contrib.auth.models import Group
        for name in ('Ban Giám Đốc', 'Hành chính & Nhân Sự', 'Kinh Doanh (Sales)', 'Tài Xế Hiện Trường', 'Tài chính & Kế toán', 'Điều Vận'):
            Group.objects.create(name=name)
        self.boss = make_user('boss_rg', EmployeeRole.DIRECTOR, '0972000001')
        self.api = APIClient()
        self.api.force_authenticate(self.boss)

    def test_matrix_lists_exactly_the_database_groups(self):
        groups = self.api.get('/api/access/matrix/').json()['groups']
        self.assertEqual([g['label'] for g in groups],
                         ['Ban Giám Đốc', 'Hành chính & Nhân Sự', 'Kinh Doanh (Sales)', 'Tài Xế Hiện Trường', 'Tài chính & Kế toán', 'Điều Vận'])

    def test_new_admin_group_appears_with_empty_rights(self):
        from django.contrib.auth.models import Group
        grp = Group.objects.create(name='Kho bãi')
        groups = self.api.get('/api/access/matrix/').json()['groups']
        row = next(g for g in groups if g['label'] == 'Kho bãi')
        self.assertEqual(row['key'], f'grp{grp.pk}')
        self.assertEqual(row['grants'], {})

    def test_two_groups_saved_as_real_django_group_membership(self):
        target = make_user('tgt_rg', EmployeeRole.SALESMAN, '0972000002')
        res = self.api.put(f'/api/access/users/{target.pk}/', {'groups': ['dispatch', 'accounting']}, format='json')
        self.assertEqual(res.status_code, 200)
        names = set(User.objects.get(pk=target.pk).groups.values_list('name', flat=True))
        self.assertEqual(names, {'Kinh Doanh (Sales)', 'Điều Vận', 'Tài chính & Kế toán'})
        target = User.objects.get(pk=target.pk)
        self.assertTrue(access.allowed(target, 'dispatch', 'create'))
        self.assertTrue(access.allowed(target, 'accounting', 'approve'))
        res = self.api.put(f'/api/access/users/{target.pk}/', {'groups': ['dispatch']}, format='json')
        names = set(User.objects.get(pk=target.pk).groups.values_list('name', flat=True))
        self.assertEqual(names, {'Kinh Doanh (Sales)', 'Điều Vận'})
        self.assertFalse(access.allowed(User.objects.get(pk=target.pk), 'accounting', 'approve'))

    def test_membership_set_in_django_admin_counts(self):
        from django.contrib.auth.models import Group
        user = make_user('adm_rg', EmployeeRole.SALESMAN, '0972000003')
        self.assertFalse(access.allowed(user, 'dispatch', 'create'))
        user.groups.add(Group.objects.get(name='Điều Vận'))
        self.assertTrue(access.allowed(User.objects.get(pk=user.pk), 'dispatch', 'create'))

    def test_position_without_database_group_keeps_its_rights(self):
        mech = make_user('mech_rg', EmployeeRole.MECHANIC, '0972000004')   # nhóm Vận hành không có trong CSDL
        self.assertTrue(access.allowed(mech, 'fleet', 'create'))
        self.assertFalse(access.allowed(mech, 'accounting', 'view'))


class SettingsTabTests(TestCase):
    """Trang Cài đặt phân quyền theo từng tab: tab không được cấp thì không xem được, chỉ xem thì không sửa được."""

    def api(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_salesman_has_no_settings_menu_or_tabs_by_default(self):
        sales = make_user('sl_set', EmployeeRole.SALESMAN, '0973000001')
        acc = make_user('kt_set', EmployeeRole.ACCOUNTANT, '0973000002')
        self.assertFalse(access.allowed(sales, 'settings', 'view'))
        self.assertTrue(access.allowed(acc, 'settings', 'view'))
        from core.context_processors import _menu
        self.assertFalse(_menu(sales)['menu']['settings'])
        self.assertTrue(_menu(acc)['menu']['settings'])

    def test_view_only_tab_cannot_write(self):
        user = make_user('kt2_set', EmployeeRole.ACCOUNTANT, '0973000003')
        UserAccessOverride.objects.create(user=user, company=get_default_company(),
                                          deny={'cfg_network': ['create', 'edit', 'delete']})
        api = self.api(User.objects.get(pk=user.pk))
        self.assertEqual(api.get('/api/master-data/locations/').status_code, 200)
        self.assertEqual(api.post('/api/master-data/locations/', {'code': 'X', 'name': 'Y', 'location_type': 'PORT'}, format='json').status_code, 403)
        self.assertEqual(api.post('/api/master-data/shipping-lines/', {}, format='json').status_code, 403)
        self.assertNotEqual(api.post('/api/master-data/customers/', {}, format='json').status_code, 403)  # tab Khách hàng & Đối tác vẫn ghi được

    def test_tab_without_permission_cannot_write_or_export(self):
        sales = make_user('sl3_set', EmployeeRole.SALESMAN, '0973000004')
        api = self.api(sales)
        self.assertEqual(api.get('/api/master-data/locations/').status_code, 200)   # đọc để chọn trong biểu mẫu
        self.assertEqual(api.post('/api/master-data/locations/', {}, format='json').status_code, 403)
        self.assertEqual(api.post('/api/master-data/customers/', {}, format='json').status_code, 403)
        self.assertEqual(api.get('/api/master-data/export-data/?catalog=customers').status_code, 403)
        self.assertEqual(api.put('/api/master-data/company/', {'short_name': 'X'}, format='json').status_code, 403)

    def test_granting_one_tab_opens_only_that_tab(self):
        sales = make_user('sl4_set', EmployeeRole.SALESMAN, '0973000005')
        UserAccessOverride.objects.create(user=sales, company=get_default_company(),
                                          allow={'cfg_partners': ['view', 'create', 'edit', 'export']})
        sales = User.objects.get(pk=sales.pk)
        self.assertTrue(access.allowed(sales, 'settings', 'view'))
        api = self.api(sales)
        self.assertNotEqual(api.post('/api/master-data/customers/', {}, format='json').status_code, 403)
        self.assertEqual(api.get('/api/master-data/export-data/?catalog=customers').status_code, 200)
        self.assertEqual(api.get('/api/master-data/export-data/?catalog=vehicles').status_code, 403)
        self.assertEqual(api.post('/api/master-data/vehicles/', {}, format='json').status_code, 403)

    def test_migration_moves_master_data_writes_to_tabs(self):
        import importlib
        convert = importlib.import_module('core.migrations.0014_settings_tab_permissions').convert
        out, changed = convert({'master_data': ['view', 'create', 'edit', 'export'], 'dashboard': ['view']})
        self.assertTrue(changed)
        self.assertEqual(out['master_data'], ['view'])
        self.assertEqual(out['cfg_partners'], ['view', 'create', 'edit', 'export'])
        self.assertEqual(out['cfg_company'], ['view'])
        self.assertFalse(convert(out)[1])
