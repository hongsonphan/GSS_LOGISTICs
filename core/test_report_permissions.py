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
