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

class CatalogReadAndRevisionTests(TestCase):
    """Danh mục nhạy cảm không đọc được bởi tài xế; đồng bộ danh mục tức thì giữa người dùng."""

    def api(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_driver_cannot_read_partner_and_fleet_catalogs(self):
        from apps.customers.models import Customer
        Customer.objects.create(code='KH_R', name='KH R', address='x')
        driver = self.api(make_user('drv_cat', EmployeeRole.DRIVER, '0974000001'))
        for path in ('/api/customers/', '/api/master-data/customers/', '/api/master-data/tariffs/',
                     '/api/master-data/subcontractors/', '/api/master-data/vehicles/', '/api/master-data/trailers/'):
            self.assertEqual(driver.get(path).status_code, 403, path)
        body = driver.get('/api/master-data/form-options/').json()
        self.assertEqual(body['customers'], [])
        self.assertEqual(body['vehicles'], [])
        self.assertTrue(body['locations']['all'] is not None)   # địa điểm vẫn đọc được

    def test_business_roles_still_read_catalogs(self):
        for name, role, phone in (('dd_cat', EmployeeRole.DISPATCHER, '0974000002'), ('sl_cat', EmployeeRole.SALESMAN, '0974000003'),
                                  ('kt_cat', EmployeeRole.ACCOUNTANT, '0974000004')):
            api = self.api(make_user(name, role, phone))
            self.assertEqual(api.get('/api/master-data/customers/').status_code, 200, name)
            self.assertEqual(api.get('/api/master-data/form-options/').status_code, 200, name)

    def test_version_changes_for_other_users_when_catalog_is_saved(self):
        maker = self.api(make_user('kt2_cat', EmployeeRole.ACCOUNTANT, '0974000005'))
        watcher = self.api(make_user('dd2_cat', EmployeeRole.DISPATCHER, '0974000006'))
        before = watcher.get('/api/master-data/version/').json()['version']
        res = maker.post('/api/master-data/locations/', {'code': 'KHO_NEW', 'name': 'Kho mới', 'location_type': 'WAREHOUSE'}, format='json')
        self.assertIn(res.status_code, (200, 201))
        after = watcher.get('/api/master-data/version/').json()['version']
        self.assertNotEqual(before, after)
        names = [x['name'] for x in watcher.get('/api/master-data/form-options/').json()['locations']['all']]
        self.assertIn('Kho mới', names)   # người dùng khác thấy ngay trong ô chọn

    def test_version_requires_login(self):
        self.assertIn(APIClient().get('/api/master-data/version/').status_code, (401, 403))


class PriceLookupTests(TestCase):
    def test_lookup_without_quote_or_tariff_does_not_crash(self):
        from apps.customers.models import Customer
        cust = Customer.objects.create(code='KH_PL', name='KH PL', address='x')
        api = APIClient()
        api.force_authenticate(make_user('sl_pl', EmployeeRole.SALESMAN, '0975000001'))
        res = api.get('/api/sales/price-lookup/', {'customer_id': cust.pk, 'pickup': 'a', 'delivery': 'Kho X'})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()['found'])

    def test_driver_cannot_read_prices_or_bookings(self):
        api = APIClient()
        api.force_authenticate(make_user('drv_pl', EmployeeRole.DRIVER, '0975000002'))
        self.assertEqual(api.get('/api/sales/price-lookup/').status_code, 403)
        self.assertEqual(api.get('/api/bookings/active/').status_code, 403)


class TripDetailVisibilityTests(TestCase):
    def test_driver_sees_only_own_trip(self):
        from apps.customers.models import Customer
        from apps.dispatch.models import DispatchTrip
        from apps.fleet.models import Vehicle
        mine = make_user('drv_own', EmployeeRole.DRIVER, '0976000001')
        other = make_user('drv_oth', EmployeeRole.DRIVER, '0976000002')
        cust = Customer.objects.create(code='KH_TV', name='KH TV', address='x')
        veh = Vehicle.objects.create(license_plate='51C-7777')
        DispatchTrip.objects.create(trip_code='T-MINE', customer=cust, vehicle=veh, pickup_location='a', warehouse_location='b', driver=mine.employee)
        DispatchTrip.objects.create(trip_code='T-OTHER', customer=cust, vehicle=veh, pickup_location='a', warehouse_location='b', driver=other.employee)
        api = APIClient()
        api.force_authenticate(mine)
        self.assertEqual(api.get('/api/trips/T-MINE/').status_code, 200)
        self.assertEqual(api.get('/api/trips/T-OTHER/').status_code, 403)
        disp = APIClient()
        disp.force_authenticate(make_user('dd_tv', EmployeeRole.DISPATCHER, '0976000003'))
        self.assertEqual(disp.get('/api/trips/T-OTHER/').status_code, 200)


class DashboardTripListTests(TestCase):
    def test_driver_dashboard_has_no_trip_list(self):
        from apps.customers.models import Customer
        from apps.dispatch.models import DispatchTrip
        from apps.fleet.models import Vehicle
        cust = Customer.objects.create(code='KH_DB', name='KH DB', address='x')
        veh = Vehicle.objects.create(license_plate='51C-8888')
        DispatchTrip.objects.create(trip_code='T-DB', customer=cust, vehicle=veh, pickup_location='a', warehouse_location='b')
        drv = APIClient()
        drv.force_authenticate(make_user('drv_db', EmployeeRole.DRIVER, '0977000001'))
        self.assertEqual(drv.get('/api/dashboard/').json()['trips_pnl'], [])
        disp = APIClient()
        disp.force_authenticate(make_user('dd_db', EmployeeRole.DISPATCHER, '0977000002'))
        self.assertTrue(disp.get('/api/dashboard/').json()['trips_pnl'])
