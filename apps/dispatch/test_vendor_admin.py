"""Tab «Quản lý Vendor»: tổng quan cổng nhà xe, thu hồi / đặt hạn link tài xế, quyền và cách ly công ty."""
import datetime

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone

from apps.dispatch import gss_messages as msg
from apps.dispatch.models import DispatchTrip
from apps.dispatch.test_gss import MEDIA, GssBase
from apps.master_data.models import SubcontractorPortalAccount
from core.models import AuditLog

OVERVIEW = '/api/vendor-admin/overview/'


def driver_url(trip_id):
    return f'/api/vendor-admin/driver-links/{trip_id}/'


@override_settings(MEDIA_ROOT=MEDIA)
class VendorAdminTests(GssBase):
    def login(self):
        self.client.force_login(self.staff)

    def act(self, trip, **body):
        return self.client.post(driver_url(trip.id), body, content_type='application/json')

    def test_requires_login(self):
        self.assertIn(self.client.get(OVERVIEW).status_code, (401, 403))
        t = self.trip()
        self.assertIn(self.client.post(driver_url(t.id), {'action': 'revoke'}, content_type='application/json').status_code, (401, 403))
        # token tài xế không thay được quyền điều vận
        r = self.client.post(driver_url(t.id), {'action': 'revoke'}, content_type='application/json', HTTP_X_TRIP_HASH=msg.trip_token(t))
        self.assertIn(r.status_code, (401, 403))
        t.refresh_from_db()
        self.assertEqual(t.qr_version, 1)

    def test_overview_lists_vendor_account_links_and_driver_links(self):
        t = self.trip()
        acct = SubcontractorPortalAccount(subcontractor=self.sub, username='nxa')
        acct.set_password('abcdef')
        acct.set_confirm_token('GSSV-ABCD1234')
        acct.save()
        self.login()
        data = self.client.get(OVERVIEW).json()['data']
        v = data['vendors'][0]
        self.assertEqual((v['id'], v['account']['username'], v['account']['is_active']), (self.sub.id, 'nxa', True))
        self.assertEqual(v['links_valid'], 1)
        self.assertEqual(v['driver_links_valid'], 1)
        self.assertNotIn('password', str(v['account']))
        self.assertEqual(len(data['links']), 1)
        dl = data['driver_links'][0]
        self.assertEqual(dl['trip_id'], t.id)
        self.assertEqual(dl['state'], 'valid')
        self.assertTrue(dl['link'].endswith(f'/q/{msg.trip_token(t)}/'))

    def test_revoke_kills_old_link_and_audits(self):
        t = self.trip()
        old = msg.trip_token(t)
        self.assertEqual(self.client.get(f'/api/qr/t/{old}/').status_code, 200)
        self.login()
        r = self.act(t, action='revoke')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['data']['state'], 'expired')
        self.client.logout()
        self.assertEqual(self.client.get(f'/api/qr/t/{old}/').status_code, 404)
        t.refresh_from_db()
        self.assertEqual(self.client.get(f'/api/qr/t/{msg.trip_token(t)}/').status_code, 404)  # token mới cũng chưa dùng được
        self.assertTrue(AuditLog.objects.filter(model_label='dispatch.dispatchtrip', object_id=str(t.pk), changes__event='DRIVER_LINK_REVOKE').exists())

    def test_regenerate_gives_new_working_link_with_expiry(self):
        t = self.trip()
        old = msg.trip_token(t)
        self.login()
        r = self.act(t, action='regenerate', days=3)
        self.assertEqual(r.status_code, 200, r.content)
        t.refresh_from_db()
        self.assertGreater(t.qr_expires_at, timezone.now() + datetime.timedelta(days=2, hours=23))
        self.client.logout()
        self.assertEqual(self.client.get(f'/api/qr/t/{old}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/qr/t/{msg.trip_token(t)}/').status_code, 200)

    def test_set_expiry_and_expired_link_rejected(self):
        t = self.trip()
        tok = msg.trip_token(t)
        DispatchTrip.objects.filter(pk=t.pk).update(qr_expires_at=timezone.now() - datetime.timedelta(minutes=1))
        self.assertEqual(self.client.get(f'/api/qr/t/{tok}/').status_code, 404)
        self.login()
        self.assertEqual(self.act(t, action='set_expiry', days=2).status_code, 200)
        self.client.logout()
        self.assertEqual(self.client.get(f'/api/qr/t/{tok}/').status_code, 200)  # gia hạn: cùng token dùng lại được
        self.login()
        self.assertEqual(self.act(t, action='set_expiry', days=0).json()['data']['expires_at'], None)

    def test_invalid_input(self):
        t = self.trip()
        self.login()
        self.assertEqual(self.act(t, action='regenerate', days=9999).status_code, 400)
        self.assertEqual(self.act(t, action='regenerate', days='abc').status_code, 400)
        self.assertEqual(self.act(t, action='nope').status_code, 400)
        self.assertEqual(self.client.post(driver_url(999999), {'action': 'revoke'}, content_type='application/json').status_code, 404)

    def test_non_dispatcher_staff_forbidden(self):
        t = self.trip()
        u = get_user_model().objects.create_user('ketoan_x', 'k@x.vn', 'pw-Test-12345')
        self.client.force_login(u)
        self.assertIn(self.client.get(OVERVIEW).status_code, (401, 403))
        self.assertIn(self.act(t, action='revoke').status_code, (401, 403))

    def test_overview_lists_carrier_without_account_or_links(self):
        from apps.master_data.models import Subcontractor
        Subcontractor.objects.create(name='Nhà xe mới', is_carrier=True)
        self.login()
        names = [v['name'] for v in self.client.get(OVERVIEW).json()['data']['vendors']]
        self.assertIn('Nhà xe mới', names)

    def test_vendor_containers_active_filter(self):
        from apps.gss.models import BookingContainer
        t = self.trip()  # xe đã nhận lệnh (READY) -> thuộc nhóm đang hành trình
        BookingContainer.objects.create(booking=self.booking, line_no=1, container_number='CSQU3054383',
                                        allocation=self.alloc, alloc_line_no=1, trip=t)
        self.login()
        rows = self.client.get('/api/dispatch/vendor-containers/?status=ACTIVE').json()['data']
        self.assertTrue(rows)
        self.assertTrue(all(r['status_code'] in ('ASSIGNED', 'IN_TRANSIT', 'EMPTY_RETURNING') for r in rows))

    def test_proactive_token_issuance_and_magic_link(self):
        self.login()
        # 1. Điều vận chủ động đặt token theo ý muốn và hạn dùng 30 ngày
        res = self.client.post(
            f'/api/vendor-portal-accounts/{self.sub.id}/',
            {
                'username': 'nhaxe_proactive',
                'password': 'Password#2026',
                'confirm_token': 'ANPHAT-2026',
                'token_expiry_preset': '30d',
                'idle_timeout_minutes': 20,
            },
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200, res.content)
        data = res.json()['data']
        self.assertEqual(data['plain_token'], 'ANPHAT-2026')
        self.assertFalse(data['token_expired'])
        self.assertIn('u=nhaxe_proactive', data['magic_link'])
        self.assertIn('t=ANPHAT-2026', data['magic_link'])

        # 2. Overview trả về thông tin token đã giải mã và magic link cho Điều vận
        ov_res = self.client.get(OVERVIEW).json()['data']
        v = next(x for x in ov_res['vendors'] if x['id'] == self.sub.id)
        self.assertEqual(v['account']['plain_token'], 'ANPHAT-2026')
        self.assertIn('t=ANPHAT-2026', v['account']['magic_link'])

        # 3. Nhà xe đăng nhập bằng Token chủ động vừa cấp
        self.client.logout()
        login_res = self.client.post(
            '/api/vendor/auth/login/',
            {
                'username': 'nhaxe_proactive',
                'password': 'Password#2026',
                'confirm_token': 'ANPHAT-2026',
            },
            content_type='application/json'
        )
        self.assertEqual(login_res.status_code, 200, login_res.content)

        # 4. Kiểm tra khi token hết hạn thì bị chặn
        acct = SubcontractorPortalAccount.objects.get(subcontractor=self.sub)
        acct.token_expires_at = timezone.now() - datetime.timedelta(days=1)
        acct.save(update_fields=['token_expires_at'])
        self.client.logout()
        fail_res = self.client.post(
            '/api/vendor/auth/login/',
            {
                'username': 'nhaxe_proactive',
                'password': 'Password#2026',
                'confirm_token': 'ANPHAT-2026',
            },
            content_type='application/json'
        )
        self.assertIn(fail_res.status_code, (400, 401))
