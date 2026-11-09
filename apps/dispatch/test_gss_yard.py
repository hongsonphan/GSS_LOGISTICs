from apps.dispatch.test_gss import GssBase


class YardApiTests(GssBase):
    def setUp(self):
        super().setUp()
        self.client.force_login(self.staff)

    def post(self, url, body):
        return self.client.post(url, body, content_type='application/json')

    def test_create_edit_validate_and_isolation(self):
        r = self.post('/api/depot/yards/', {'code': 'bd01', 'name': 'Bãi Bình Dương', 'capacity': 50})
        self.assertEqual(r.status_code, 200, r.content)
        yid = r.json()['data']['id']
        self.assertEqual(r.json()['data']['code'], 'BD01')
        for bad in ({'code': 'x', 'name': 'a'}, {'code': 'BD01', 'name': 'trùng mã'}, {'code': 'OK1', 'name': 'a', 'capacity': -3}, {'code': 'OK2', 'name': ''}):
            self.assertEqual(self.post('/api/depot/yards/', bad).status_code, 400, bad)
        mv = self.post('/api/depot/movements/', {'container_number': 'CSQU3054383', 'in_vehicle_plate': '51C-1', 'yard_id': yid})
        self.assertEqual(mv.status_code, 201, mv.content)
        self.assertEqual(self.client.get(f'/api/depot/stats/?yard={yid}').json()['data']['in_yard'], 1)
        self.assertEqual(self.client.get('/api/depot/stats/').json()['data']['in_yard'], 0)  # bãi mặc định tách biệt
        off = self.client.put(f'/api/depot/yards/{yid}/', {'code': 'BD01', 'name': 'x', 'capacity': 1, 'is_active': False}, content_type='application/json')
        self.assertEqual(off.status_code, 400)  # còn cont tồn
        self.client.put(f'/api/depot/yards/{yid}/', {'code': 'BD01', 'name': 'x', 'capacity': 1}, content_type='application/json')
        second = self.post('/api/depot/movements/', {'container_number': 'MSKU0000000', 'in_vehicle_plate': '51C-2', 'yard_id': yid})
        self.assertEqual(second.status_code, 201)
        self.assertTrue(second.json()['warnings'])  # vượt sức chứa chỉ cảnh báo
        listing = self.client.get('/api/depot/yards/?all=1').json()['results']
        self.assertEqual({y['code'] for y in listing}, {'DAKNONG', 'BD01'})


class YardKeeperRoleTests(GssBase):
    """Thủ bãi: chỉ thao tác bãi, không cấu hình bãi, không vào kế toán/điều xe ghi."""

    def setUp(self):
        super().setUp()
        from django.contrib.auth.models import User
        from apps.personnel.models import Employee, EmployeeRole
        self.keeper = User.objects.create_user('thubai', password='Pw-Yard#2026')
        Employee.objects.create(user=self.keeper, code='THUBAI', full_name='Thu bai', role=EmployeeRole.YARD_KEEPER,
                                phone_number='0911222333', national_id='079123456780', bank_account='0123456780')
        self.client.force_login(self.keeper)

    def test_grants(self):
        from core import access
        g = access.effective_grants(self.keeper)
        self.assertEqual(g['depot'], ['view', 'create', 'edit', 'export'])
        self.assertEqual(g['dispatch'], ['view'])
        self.assertNotIn('accounting', g)

    def test_yard_operations_allowed_config_denied(self):
        self.assertEqual(self.client.get('/api/depot/yards/').status_code, 200)
        self.assertEqual(self.client.get('/api/depot/stats/').status_code, 200)
        r = self.client.post('/api/depot/movements/', {'container_number': 'CSQU3054383', 'in_vehicle_plate': '51C-9'}, content_type='application/json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(self.client.get('/api/depot/export/').status_code, 200)
        self.assertEqual(self.client.post('/api/depot/yards/', {'code': 'ZZ1', 'name': 'x'}, content_type='application/json').status_code, 403)
        self.assertEqual(self.client.get('/api/ledger/trial-balance/').status_code, 403)
        self.assertEqual(self.client.get('/api/gss/settlement/').status_code, 403)


class DemDetAlertTests(GssBase):
    def _expire(self, trip, dem=None, det=None):
        from apps.dispatch.models import DispatchTrip
        DispatchTrip.objects.filter(pk=trip.pk).update(dem_expiry_date=dem, det_expiry_date=det)

    def test_notify_once_per_level_and_stops_after_done(self):
        import datetime
        from apps.collaboration.models import Notification
        from apps.dispatch import gss_alerts
        today = datetime.date.today()
        t = self.trip()
        self._expire(t, dem=today + datetime.timedelta(days=1), det=today - datetime.timedelta(days=1))
        alerts = gss_alerts.pending_alerts(today, 2)
        self.assertEqual({(a['kind'], a['level']) for a in alerts}, {('DEM', 'warn'), ('DET', 'overdue')})
        first = gss_alerts.notify(today, 2)
        self.assertEqual(first['created'], 2)  # 1 người nhận (superuser) × 2 cảnh báo
        self.assertEqual(gss_alerts.notify(today, 2)['created'], 0)  # chạy lại không trùng
        self.assertEqual(Notification.objects.filter(recipient=self.staff, target_type='GSS_DEMDET').count(), 2)
        # đã lấy cont khỏi cảng => hết cảnh báo DEM; trả vỏ rỗng => hết cả DET
        t = self.run_to(t, 'LOADED_ON_VEHICLE')
        self._expire(t, dem=today, det=today - datetime.timedelta(days=1))
        self.assertEqual({a['kind'] for a in gss_alerts.pending_alerts(today, 2)}, {'DET'})
        t = self.trip(2, cont='MSKU0000000')
        t = self.run_to(t, 'EMPTY_RETURNED')
        self._expire(t, dem=today, det=today - datetime.timedelta(days=1))
        self.assertNotIn(t.trip_code, [a['trip'].trip_code for a in gss_alerts.pending_alerts(today, 2)])

    def test_api_and_command(self):
        import datetime
        from django.core.management import call_command
        t = self.trip()
        self._expire(t, dem=datetime.date.today())
        self.client.force_login(self.staff)
        r = self.client.get('/api/gss/dem-det-alerts/').json()
        self.assertEqual(r['total'], 1)
        self.assertEqual(r['results'][0]['kind'], 'DEM')
        self.assertEqual(self.client.post('/api/gss/dem-det-alerts/').json()['data']['created'], 1)
        call_command('notify_dem_det', '--dry-run')
        call_command('notify_dem_det')


class AutoMessagingTests(GssBase):
    def setUp(self):
        super().setUp()
        self.client.force_login(self.staff)
        self.t = self.trip()

    def post(self, **body):
        return self.client.post(f'/api/gss/trips/{self.t.trip_code}/message/', {'channel': 'ZALO', **body}, content_type='application/json')

    def test_disabled_by_default_manual_only(self):
        self.assertFalse(self.client.get(f'/api/gss/trips/{self.t.trip_code}/message/').json()['can_send'])
        self.assertEqual(self.post(send=True).status_code, 400)
        self.assertEqual(self.post().json()['log']['delivery'], 'MANUAL')

    def test_console_provider_marks_sent(self):
        from django.test import override_settings
        with override_settings(MESSAGING_PROVIDER='console'):
            r = self.post(send=True)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['log']['delivery'], 'SENT')

    def test_webhook_failure_is_logged_not_raised(self):
        from unittest import mock
        import urllib.error
        from django.test import override_settings
        with override_settings(MESSAGING_PROVIDER='webhook', MESSAGING_WEBHOOK_URL='https://gw.example.invalid/send', MESSAGING_WEBHOOK_TOKEN='secret-token'):
            with mock.patch('urllib.request.urlopen', side_effect=urllib.error.URLError('down')):
                r = self.post(send=True)
            self.assertEqual(r.status_code, 502)
            self.assertEqual(r.json()['log']['delivery'], 'FAILED')
            self.assertNotIn('secret-token', r.content.decode())
        with override_settings(MESSAGING_PROVIDER='webhook', MESSAGING_WEBHOOK_URL='http://insecure.example/send'):
            self.assertEqual(self.post(send=True).status_code, 502)  # http bị từ chối khi DEBUG tắt


class GlobalSearchTests(GssBase):
    def test_search_groups_and_permissions(self):
        from django.contrib.auth.models import User
        from apps.personnel.models import Employee, EmployeeRole
        t = self.trip(cont='CSQU3054383')
        self.client.force_login(self.staff)
        r = self.client.get('/api/gss/search/', {'q': 'CSQU3054'}).json()
        self.assertEqual([x['trip_code'] for x in r['trips']], [t.trip_code])
        self.assertEqual(self.client.get('/api/gss/search/', {'q': 'BKG1'}).json()['bookings'][0]['booking_code'], 'BK.1')
        self.assertTrue(self.client.get('/api/gss/search/', {'q': 'Nhà xe'}).json()['vendors'])
        self.assertEqual(self.client.get('/api/gss/search/', {'q': 'C'}).json()['trips'], [])  # quá ngắn
        keeper = User.objects.create_user('thubai2', password='Pw-Yard#2026')
        Employee.objects.create(user=keeper, code='THUBAI2', full_name='Thu bai 2', role=EmployeeRole.YARD_KEEPER,
                                phone_number='0911222334', national_id='079123456781', bank_account='0123456781')
        self.client.force_login(keeper)
        k = self.client.get('/api/gss/search/', {'q': 'BKG1'}).json()
        self.assertEqual(k['bookings'], [])  # Thủ bãi không có quyền Kinh doanh
        self.assertEqual(self.client.get('/api/gss/search/', {'q': 'CSQU3054'}).json()['trips'][0]['trip_code'], t.trip_code)  # chỉ Xem Điều vận
