from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.master_data.models import CompanyProfile
from core import features


class ResolveFeaturesTests(TestCase):
    def test_enterprise_full_enables_everything(self):
        flags = features.resolve_features('ENTERPRISE_FULL')
        self.assertTrue(all(flags.values()))

    def test_gss_profile_hides_customs_and_payroll(self):
        flags = features.resolve_features('GSS_VENDOR_DEPOT_QR')
        self.assertTrue(flags['vendor_portal'] and flags['depot_yard'] and flags['qr_tracking'])
        self.assertFalse(flags['customs'] or flags['payroll'] or flags['hr'] or flags['ledger'])

    def test_fleet_profile_has_no_gss_modules_or_customs(self):
        flags = features.resolve_features('INTERNAL_FLEET_PNL')
        self.assertTrue(flags['payroll'] and flags['fleet_internal'])
        self.assertFalse(flags['vendor_portal'] or flags['customs'])

    def test_overrides_apply_and_unknown_keys_ignored(self):
        flags = features.resolve_features('GSS_VENDOR_DEPOT_QR', {'customs': True, 'bogus': True, 'depot_yard': False})
        self.assertTrue(flags['customs'])
        self.assertFalse(flags['depot_yard'])
        self.assertNotIn('bogus', flags)

    def test_clean_overrides_rejects_non_dict(self):
        with self.assertRaises(ValueError):
            features.clean_overrides(['customs'])
        self.assertEqual(features.clean_overrides({'customs': 1, 'x': 1}), {'customs': True})


class FeatureGateTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser('admin', 'a@x.vn', 'pw-Test-12345')
        self.client.force_login(self.user)
        self.profile = CompanyProfile.get_default_company()

    def _set(self, model, **kw):
        self.profile.business_model = model
        self.profile.enabled_features = kw
        self.profile.save()

    def test_full_model_allows_customs_api(self):
        self._set('ENTERPRISE_FULL')
        self.assertNotEqual(self.client.get('/api/customs/').status_code, 403)

    def test_gss_model_blocks_customs_api_and_page(self):
        self._set('GSS_VENDOR_DEPOT_QR')
        res = self.client.get('/api/customs/')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()['code'], 'feature_disabled')
        self.assertEqual(self.client.get('/customs/').status_code, 403)

    def test_override_can_reenable_feature(self):
        self._set('GSS_VENDOR_DEPOT_QR', customs=True)
        self.assertNotEqual(self.client.get('/api/customs/').status_code, 403)

    def test_company_api_exposes_and_updates_model(self):
        res = self.client.put('/api/master-data/company/', {'business_model': 'GSS_VENDOR_DEPOT_QR', 'warn_days': 3},
                              content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)
        data = self.client.get('/api/master-data/company/').json()['data']
        self.assertEqual(data['business_model'], 'GSS_VENDOR_DEPOT_QR')
        self.assertEqual(data['warn_days'], 3)
        self.assertFalse(data['effective_features']['customs'])

    def test_company_api_rejects_bad_values(self):
        for body in ({'business_model': 'NOPE'}, {'warn_days': 99}, {'enabled_features': 'x'}):
            res = self.client.put('/api/master-data/company/', body, content_type='application/json')
            self.assertEqual(res.status_code, 400, body)
