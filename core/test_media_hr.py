import os
import tempfile

from django.contrib.auth.models import User
from django.test import TestCase, override_settings

from apps.personnel.models import Employee, EmployeeRole


class HrMediaPermissionTests(TestCase):
    def setUp(self):
        self.media_dir = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media_dir)
        self.override.enable()
        for rel in ('personnel/signatures/a.png', 'personnel/signatures/b.png', 'personnel/avatars/a.png'):
            path = os.path.join(self.media_dir, rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as fh:
                fh.write(b'img')
        self.owner_user = User.objects.create_user('nv_owner', password='Pw-Media#2026')
        Employee.objects.create(user=self.owner_user, code='NVM1', full_name='Chủ hồ sơ', phone_number='0900000101',
                                role=EmployeeRole.DISPATCHER, signature_image='personnel/signatures/a.png')
        self.hr_user = User.objects.create_user('nv_hr', password='Pw-Media#2026')
        Employee.objects.create(user=self.hr_user, code='NVM2', full_name='Hành chính', phone_number='0900000102',
                                role=EmployeeRole.LEAD_ADMIN_ACC)

    def tearDown(self):
        self.override.disable()

    def status(self, user, rel):
        self.client.force_login(user)
        return self.client.get('/media/' + rel).status_code

    def test_rules(self):
        self.assertEqual(self.status(self.owner_user, 'personnel/avatars/a.png'), 200)
        self.assertEqual(self.status(self.owner_user, 'personnel/signatures/a.png'), 200)
        self.assertEqual(self.status(self.owner_user, 'personnel/signatures/b.png'), 404)
        self.assertEqual(self.status(self.hr_user, 'personnel/signatures/b.png'), 200)
