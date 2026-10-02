import json
from django.test import TestCase, Client
from django.utils import timezone
from apps.customers.models import Customer
from apps.fleet.models import Vehicle, VehicleType
from apps.personnel.models import Employee, EmployeeRole
from apps.dispatch.models import DispatchTrip, TripStatus

class DriverTokenRevocationTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.customer = Customer.objects.create(code="CUST_TEST", name="Công Ty Test")
        self.driver_a = Employee.objects.create(
            code="DRV_A", full_name="Tài Xế A", nickname="Tài A",
            phone_number="0901111111", role=EmployeeRole.DRIVER
        )
        self.driver_b = Employee.objects.create(
            code="DRV_B", full_name="Tài Xế B", nickname="Tài B",
            phone_number="0902222222", role=EmployeeRole.DRIVER
        )
        self.dispatcher = Employee.objects.create(
            code="DISP_01", full_name="Điều Độ Viên", nickname="Điều Độ 1",
            role=EmployeeRole.DISPATCHER
        )
        self.vehicle = Vehicle.objects.create(
            license_plate="51C-123.45",
            vehicle_type=VehicleType.TRACTOR,
            registration_expiry=timezone.now().date(),
            insurance_expiry=timezone.now().date()
        )

        # Tạo chuyến xe gán ban đầu cho Tài Xế A
        self.trip = DispatchTrip.objects.create(
            trip_code="TVL-TEST-TOKEN-01",
            customer=self.customer,
            driver=self.driver_a,
            vehicle=self.vehicle,
            dispatcher=self.dispatcher,
            pickup_location="CẢNG CÁT LÁI",
            warehouse_location="KHO TEST",
            dropoff_location="BÃI RỖNG",
            status=TripStatus.DISPATCHED,
            dispatched_at=timezone.now()
        )

    def test_driver_token_regeneration_and_revocation(self):
        # 1. Kiểm tra chuyến xe tự động có driver_token ban đầu
        token_a = self.trip.driver_token
        self.assertTrue(bool(token_a))
        self.assertEqual(self.trip.driver_hashid, token_a)

        # 2. Tài xế A mở link Driver Portal -> 200 OK
        res_a = self.client.get(f'/driver/{token_a}/')
        self.assertEqual(res_a.status_code, 200)
        self.assertContains(res_a, "TVL-TEST-TOKEN-01")

        from django.contrib.auth.models import User
        self.user = User.objects.create_superuser(username="admin_disp", password="password123")
        self.client.force_login(self.user)

        # 3. Điều độ đổi tài xế sang Tài Xế B qua API PATCH
        patch_res = self.client.patch(
            f'/api/trips/{self.trip.trip_code}/',
            data=json.dumps({'driver_id': self.driver_b.id}),
            content_type='application/json'
        )
        self.assertEqual(patch_res.status_code, 200)

        # Đăng xuất client để giả lập tài xế truy cập không cần login
        self.client.logout()

        # Reload chuyến xe từ database
        self.trip.refresh_from_db()
        token_b = self.trip.driver_token

        # 4. Kiểm tra token mới đã được cấp và khác token cũ
        self.assertEqual(self.trip.driver, self.driver_b)
        self.assertTrue(bool(token_b))
        self.assertNotEqual(token_a, token_b)
        self.assertEqual(self.trip.driver_hashid, token_b)

        # 5. Tài xế B mở link mới -> 200 OK
        res_b = self.client.get(f'/driver/{token_b}/')
        self.assertEqual(res_b.status_code, 200)
        self.assertContains(res_b, "TVL-TEST-TOKEN-01")

        # 6. Tài xế A mở lại link cũ -> 403 Forbidden (Trang cảnh báo link đã thu hồi)
        res_a_old = self.client.get(f'/driver/{token_a}/')
        self.assertEqual(res_a_old.status_code, 403)
        self.assertTemplateUsed(res_a_old, 'driver_portal_revoked.html')

        # 7. Tài xế A cố gọi API báo mốc với token cũ -> Bị từ chối xác thực (401/403/404)
        api_milestone_old = self.client.post(
            f'/api/trips/{token_a}/milestones/',
            data=json.dumps({'milestone': 'DEPARTED'}),
            content_type='application/json'
        )
        self.assertIn(api_milestone_old.status_code, [401, 403, 404])

        # 8. Tài xế B gọi API báo mốc với token mới -> 200 OK
        api_milestone_new = self.client.post(
            f'/api/trips/{token_b}/milestones/',
            data=json.dumps({'milestone': 'DEPARTED'}),
            content_type='application/json'
        )
        self.assertEqual(api_milestone_new.status_code, 200)
