"""Đặt lại mật khẩu qua email, khoá dò mật khẩu, bắt đổi mật khẩu yếu, hết phiên khi không dùng, cảnh báo thiết bị mới."""
import re
import time

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings

from apps.personnel.models import Employee, EmployeeRole
from core.models import LoginEvent

STRONG = 'Container-Xanh-2026!'
UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'
UA_PHONE = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'


class AccountSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('ketoan01', email='ketoan01@example.com', password=STRONG)
        Employee.objects.create(user=self.user, code='KT01', full_name='Kế Toán Một', phone_number='0900000777',
                                role=EmployeeRole.ACCOUNTANT)

    def login(self, password=STRONG, username='ketoan01', ua=UA_PC, ip='10.0.0.1'):
        return self.client.post('/login/', {'username': username, 'password': password}, HTTP_USER_AGENT=ua, REMOTE_ADDR=ip)

    # ---- Quên mật khẩu
    def test_reset_flow_by_code(self):
        res = self.client.post('/password-reset/', {'identifier': 'kt01'})
        self.assertContains(res, 'đã gửi link')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['ketoan01@example.com'])
        link = re.search(r'https?://[^\s"<]+/password-reset/[^\s"<]+/', mail.outbox[0].body).group(0)
        path = link.split('testserver', 1)[-1]
        self.assertContains(self.client.get(path), 'Đặt mật khẩu mới')
        weak = self.client.post(path, {'new_password1': '12345678', 'new_password2': '12345678'})
        self.assertContains(weak, 'quá ngắn')
        ok = self.client.post(path, {'new_password1': 'Moi-Mat-Khau-2027', 'new_password2': 'Moi-Mat-Khau-2027'})
        self.assertContains(ok, 'Đã đặt mật khẩu mới')
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Moi-Mat-Khau-2027'))
        self.assertContains(self.client.get(path), 'hết hạn')  # link chỉ dùng một lần
        self.assertTrue(LoginEvent.objects.filter(user=self.user, kind='reset_done').exists())
        self.assertIn('Mật khẩu đã được thay đổi', mail.outbox[-1].subject)

    def test_reset_does_not_reveal_accounts_and_is_rate_limited(self):
        known = self.client.post('/password-reset/', {'identifier': 'ketoan01@example.com'})
        unknown = self.client.post('/password-reset/', {'identifier': 'khong-co@example.com'})
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertContains(unknown, 'đã gửi link')
        for _ in range(3):
            self.client.post('/password-reset/', {'identifier': 'x'})
        self.assertEqual(self.client.post('/password-reset/', {'identifier': 'x'}).status_code, 429)

    def test_admin_send_reset(self):
        boss = User.objects.create_superuser('boss', 'b@example.com', STRONG)
        self.client.force_login(boss)
        res = self.client.post(f'/api/access/users/{self.user.pk}/send-reset/', {}, content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIn('boss', mail.outbox[-1].body.lower() + mail.outbox[-1].alternatives[0][0].lower())

    # ---- Khoá dò mật khẩu
    def test_lockout_per_ip_and_account(self):
        for _ in range(5):
            self.login('sai-mat-khau')
        res = self.login()
        self.assertEqual(res.status_code, 429)
        # IP khác vẫn đăng nhập được khi chưa vượt ngưỡng khoá tài khoản
        self.assertEqual(self.login(ip='10.0.0.2').status_code, 200)
        self.client.logout()
        for i in range(10):
            self.login('sai', username='KT01', ip=f'10.1.0.{i}')  # gõ mã NV vẫn tính vào cùng tài khoản
        self.assertEqual(self.login(ip='10.2.0.1').status_code, 429)

    # ---- Mật khẩu yếu phải đổi
    def test_weak_password_forces_change(self):
        self.user.set_password('12345678')
        self.user.save()
        res = self.login('12345678')
        self.assertIn('/account/password/', res.content.decode())
        self.assertEqual(self.client.get('/api/trips/').json().get('code'), 'password_change_required')
        self.assertEqual(self.client.get('/dashboard/').status_code, 302)
        res = self.client.post('/account/password/', {'old_password': '12345678', 'new_password1': STRONG + 'x',
                                                      'new_password2': STRONG + 'x'})
        self.assertContains(res, 'Đã đổi mật khẩu')
        self.assertEqual(self.client.get('/dashboard/').status_code, 200)

    # ---- Hết phiên khi không thao tác
    @override_settings(SESSION_IDLE_HOURS=1)
    def test_idle_timeout(self):
        self.login()
        self.assertEqual(self.client.get('/api/access/me/').status_code, 200)
        session = self.client.session
        session['_bim_last_seen'] = int(time.time()) - 7200
        session.save()
        self.assertEqual(self.client.get('/api/access/me/').status_code, 401)

    # ---- Thiết bị mới
    def test_new_device_alert(self):
        self.login()
        self.client.logout()
        self.assertEqual(len(mail.outbox), 0)  # lần đầu không cảnh báo
        self.login(ua=UA_PC)
        self.client.logout()
        self.assertEqual(len(mail.outbox), 0)  # cùng máy
        self.login(ua=UA_PHONE, ip='113.172.9.9')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('thiết bị mới', mail.outbox[0].subject)
        self.assertTrue(LoginEvent.objects.filter(user=self.user, new_device=True).exists())
