"""Ma trận phân quyền theo TAB (cây sidebar): khóa riêng từng tab Tài chính & Kế toán / Cài đặt, tương thích khóa cũ, chặn đúng tab."""
import json

from django.test import SimpleTestCase, TestCase

from apps.personnel.models import EmployeeRole
from core import access
from core.context_processors import _menu
from core.models import AccessGroup, UserAccessOverride, get_default_company
from core.test_access import make_user


class MatrixStructureTests(SimpleTestCase):
    def test_every_row_sits_in_a_sidebar_section(self):
        payload = access.matrix_payload()
        sections = {s['key']: {sub['key'] for sub in s['sub_sections']} for s in payload['sections']}
        self.assertEqual(len(payload['modules']), len(access.MODULE_KEYS))
        for m in payload['modules']:
            self.assertIn(m['section'], sections, m['key'])
            if m['sub_section']:
                self.assertIn(m['sub_section'], sections[m['section']], m['key'])
            self.assertTrue(m['actions'] and all(a in access.ACTION_KEYS for a in m['actions']), m['key'])
            self.assertIn('view', m['actions'], m['key'])

    def test_accounting_and_settings_are_split_per_tab(self):
        for key in access.ACC_FROM_ACCOUNTING + access.CFG_DATA_KEYS + ['cfg_company', 'audit_log']:
            self.assertIn(key, access.MODULE_KEYS)
        # khóa cũ chỉ còn là khóa dẫn xuất / khóa mở rộng, không nằm trong ma trận
        for legacy in ('accounting', 'cfg_finance', 'cfg_partners', 'cfg_network', 'cfg_fleet'):
            self.assertNotIn(legacy, access.MODULE_KEYS)
        self.assertEqual(set(access.CFG_TAB_MODULE.values()) - {'admin'}, set(access.CFG_KEYS) | {'audit_log'})

    def test_legacy_keys_expand(self):
        out = access._clean({'accounting': ['view', 'create'], 'cfg_finance': ['view'], 'reports_fin': ['view']})
        for k in access.ACC_FROM_ACCOUNTING:
            self.assertEqual(out[k], ['view', 'create'], k)
        for k in access.CFG_FINANCE_KEYS:
            self.assertEqual(out[k], ['view'], k)
        self.assertEqual(out['rpt_pnl'], ['view'])
        self.assertNotIn('cfg_customers', out)

    def test_default_groups_keep_effective_rights(self):
        acc = access.default_group_grants('accounting')
        for k in access.ACC_FROM_ACCOUNTING + access.CFG_DATA_KEYS:
            self.assertEqual(acc[k], list(access.MODULE_ACTIONS[k]), k)
        disp = access.default_group_grants('dispatch')
        self.assertNotIn('acc_cashbook', disp)            # điều vận không có sổ quỹ (như trước)
        self.assertNotIn('acc_dispatcher_fund', disp)     # duyệt quỹ vẫn thuộc Kế toán
        self.assertIn('advances', disp)
        self.assertEqual(disp['cfg_customers'], list(access.MODULE_ACTIONS['cfg_customers']))
        self.assertNotIn('acc_3pl', access.default_group_grants('sales'))


class TabEnforcementTests(TestCase):
    def setUp(self):
        self.company = get_default_company()
        self.accountant = make_user('ketoan_t', EmployeeRole.ACCOUNTANT)
        self.dispatcher = make_user('dieuvan_t', EmployeeRole.DISPATCHER)
        self.cash_only = make_user('quy_t', EmployeeRole.DRIVER)
        UserAccessOverride.objects.create(user=self.cash_only, allow={'acc_cashbook': ['view', 'create', 'edit', 'export']})

    def code(self, user, url, method='get', body=None):
        self.client.force_login(user)
        if method == 'get':
            return self.client.get(url).status_code
        return getattr(self.client, method)(url, json.dumps(body or {}), content_type='application/json').status_code

    def test_cashbook_only_user_is_limited_to_that_tab(self):
        self.assertEqual(self.code(self.cash_only, '/api/accounting/cashbook/'), 200)
        for url in ('/api/accounting/reimbursables/', '/api/accounting/subcontractor-settlements/', '/api/accounting/bot-audit/',
                    '/api/accounting/settlement-vouchers/', '/api/accounting/customer-statement/'):
            self.assertEqual(self.code(self.cash_only, url), 403, url)

    def test_accountant_default_keeps_all_accounting_tabs(self):
        for url in ('/api/accounting/cashbook/', '/api/accounting/reimbursables/', '/api/accounting/subcontractor-settlements/',
                    '/api/accounting/bot-audit/', '/api/accounting/settlement-vouchers/', '/api/accounting/advances/'):
            self.assertNotEqual(self.code(self.accountant, url), 403, url)

    def test_dispatcher_does_not_gain_accounting_tabs(self):
        for url in ('/api/accounting/cashbook/', '/api/accounting/reimbursables/', '/api/accounting/settlement-vouchers/',
                    '/api/accounting/subcontractor-settlements/', '/api/accounting/bot-audit/'):
            self.assertEqual(self.code(self.dispatcher, url), 403, url)
        self.assertNotEqual(self.code(self.dispatcher, '/api/accounting/advances/'), 403)   # Tạm ứng vẫn thuộc điều vận

    def test_dispatcher_fund_approval_stays_with_accounting(self):
        url = '/api/accounting/dispatcher-funds/999999/action/'
        self.assertEqual(self.code(self.dispatcher, url, 'post', {'action': 'approve'}), 403)
        self.assertNotEqual(self.code(self.accountant, url, 'post', {'action': 'approve'}), 403)

    def test_settings_tab_rights_are_per_tab(self):
        user = make_user('cfg_t', EmployeeRole.DRIVER)
        UserAccessOverride.objects.create(user=user, allow={'cfg_customers': ['view', 'create']})
        self.assertNotEqual(self.code(user, '/api/master-data/customers/', 'post', {}), 403)
        self.assertEqual(self.code(user, '/api/master-data/tariffs/', 'post', {}), 403)
        self.assertEqual(self.code(user, '/api/master-data/locations/', 'post', {}), 403)

    def test_derived_keys_menu_and_finance_gate(self):
        adv_only = make_user('adv_t', EmployeeRole.DRIVER)
        UserAccessOverride.objects.create(user=adv_only, allow={'advances': ['view']})
        self.assertTrue(_menu(adv_only)['menu']['accounting'])          # vào được màn Kế toán (tab Tạm ứng)
        self.assertFalse(access.can_view_finance(adv_only))             # nhưng không xem số liệu tài chính
        self.assertTrue(access.can_view_finance(self.cash_only))
        self.assertFalse(access.can_view_finance(self.dispatcher))

    def test_saved_legacy_group_row_still_grants(self):
        AccessGroup.objects.create(company=self.company, key='accounting', grants={'accounting': ['view'], 'dashboard': ['view']})
        self.client.force_login(self.accountant)
        if hasattr(self.accountant, '_bim_access'):
            del self.accountant._bim_access
        self.assertIn('view', access.effective_grants(self.accountant).get('acc_voucher', []))
        self.assertNotIn('create', access.effective_grants(self.accountant).get('acc_voucher', []))

    def test_matrix_api_returns_tree(self):
        director = make_user('gd_t', EmployeeRole.DIRECTOR)
        self.client.force_login(director)
        data = self.client.get('/api/access/matrix/').json()
        self.assertTrue(data['sections'])
        row = next(m for m in data['modules'] if m['key'] == 'acc_cashbook')
        self.assertEqual(row['section'], 'accounting')
        self.assertTrue(row['screens'])
