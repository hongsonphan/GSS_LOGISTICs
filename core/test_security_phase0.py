"""Kiểm thử các bản vá bảo mật Giai đoạn 0: media, IDOR chuyến xe, CSRF, khoá đăng nhập."""
import json
import os
import tempfile

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from apps.customers.models import Customer
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.documents.models import DocumentType, TripDocument
from apps.fleet.models import Vehicle, VehicleType
from apps.personnel.models import Employee, EmployeeRole


def _make_trip(code, customer, driver, vehicle):
    return DispatchTrip.objects.create(
        trip_code=code, customer=customer, driver=driver, vehicle=vehicle,
        container_number="TEST1234567", seal_number="SEAL1",
        pickup_location="CẢNG CÁT LÁI", warehouse_location="KHO A", dropoff_location="BÃI B",
        status=TripStatus.DISPATCHED, dispatched_at=timezone.now(),
    )


class Phase0SecurityTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.media_dir = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media_dir)
        self.override.enable()
        customer = Customer.objects.create(code="SEC_CUST", name="Khách Bảo Mật")
        driver = Employee.objects.create(code="SEC_DRV", full_name="Tài Xế A", phone_number="0900000001", role=EmployeeRole.DRIVER)
        vehicle = Vehicle.objects.create(license_plate="51C-000.01", vehicle_type=VehicleType.TRACTOR,
                                         registration_expiry=timezone.now().date(), insurance_expiry=timezone.now().date())
        self.trip_a = _make_trip("SEC-TRIP-A", customer, driver, vehicle)
        self.trip_b = _make_trip("SEC-TRIP-B", customer, driver, vehicle)
        os.makedirs(os.path.join(self.media_dir, "trip_docs"))
        with open(os.path.join(self.media_dir, "trip_docs", "pod_a.jpg"), "wb") as fh:
            fh.write(b"\xff\xd8\xff test")
        with open(os.path.join(self.media_dir, "trip_docs", "pod_b.jpg"), "wb") as fh:
            fh.write(b"\xff\xd8\xff test")
        TripDocument.objects.create(trip=self.trip_a, document_type=DocumentType.POD, title="POD A", file_path="/media/trip_docs/pod_a.jpg")
        TripDocument.objects.create(trip=self.trip_b, document_type=DocumentType.POD, title="POD B", file_path="/media/trip_docs/pod_b.jpg")
        self.staff = User.objects.create_user("sec_staff", password="Str0ng-Pass-2026!", is_staff=True)

    def tearDown(self):
        self.override.disable()

    # ---- Media ----
    def test_media_requires_login_for_anonymous(self):
        self.assertEqual(Client().get("/media/trip_docs/pod_a.jpg").status_code, 404)

    def test_media_served_to_logged_in_user(self):
        c = Client()
        c.force_login(self.staff)
        res = c.get("/media/trip_docs/pod_a.jpg")
        self.assertEqual(res.status_code, 200)
        self.assertIn("inline", res["Content-Disposition"])
        self.assertEqual(res["X-Frame-Options"], "SAMEORIGIN")

    def test_media_path_traversal_blocked(self):
        c = Client()
        c.force_login(self.staff)
        for path in ["/media/../manage.py", "/media/..%2Fmanage.py", "/media/trip_docs/../../manage.py"]:
            self.assertEqual(c.get(path).status_code, 404, path)

    def test_driver_portal_grants_media_of_own_trip_only(self):
        c = Client()
        self.assertEqual(c.get(f"/driver/{self.trip_a.driver_token}/").status_code, 200)
        self.assertEqual(c.get("/media/trip_docs/pod_a.jpg").status_code, 200)
        self.assertEqual(c.get("/media/trip_docs/pod_b.jpg").status_code, 404)

    def test_tracking_page_grants_pod_media(self):
        c = Client()
        self.assertEqual(c.get(f"/tracking/{self.trip_a.tracking_hashid}/").status_code, 200)
        self.assertEqual(c.get("/media/trip_docs/pod_a.jpg").status_code, 200)

    def test_forged_media_cookie_rejected(self):
        c = Client()
        c.cookies["bim_media_scope"] = f"d:{self.trip_a.id}"
        self.assertEqual(c.get("/media/trip_docs/pod_a.jpg").status_code, 404)

    # ---- IDOR chuyến xe ----
    def test_driver_token_cannot_read_other_trip(self):
        c = Client()
        res = c.get(f"/api/trips/{self.trip_b.trip_code}/", HTTP_X_TRIP_HASH=self.trip_a.driver_token)
        self.assertIn(res.status_code, (401, 403))

    def test_driver_token_can_use_own_trip(self):
        c = Client()
        res = c.post(f"/api/trips/{self.trip_a.driver_token}/milestones/", data=json.dumps({"milestone": "DEPARTED"}),
                     content_type="application/json", HTTP_X_TRIP_HASH=self.trip_a.driver_token)
        self.assertEqual(res.status_code, 200)

    def test_anonymous_without_token_denied(self):
        self.assertIn(Client().get(f"/api/trips/{self.trip_a.trip_code}/").status_code, (401, 403))

    # ---- CSRF & đăng nhập ----
    def test_session_api_enforces_csrf_even_with_trip_hash_header(self):
        c = Client(enforce_csrf_checks=True)
        c.force_login(self.staff)
        res = c.post(f"/api/trips/{self.trip_a.driver_token}/milestones/", data=json.dumps({"milestone": "DEPARTED"}),
                     content_type="application/json", HTTP_X_TRIP_HASH=self.trip_a.driver_token)
        self.assertIn(res.status_code, (401, 403))

    def test_basic_auth_disabled(self):
        import base64
        cred = base64.b64encode(b"sec_staff:Str0ng-Pass-2026!").decode()
        res = Client().get("/api/trips/", HTTP_AUTHORIZATION=f"Basic {cred}")
        self.assertIn(res.status_code, (401, 403))

    def test_login_without_csrf_redirects_to_login(self):
        c = Client(enforce_csrf_checks=True)
        res = c.post("/login/", {"username": "sec_staff", "password": "Str0ng-Pass-2026!"})
        self.assertEqual(res.status_code, 302)
        self.assertIn("/login/?expired=1", res["Location"])

    @override_settings(LOGIN_MAX_FAILURES=3, LOGIN_LOCKOUT_SECONDS=60)
    def test_login_lockout_after_failures(self):
        c = Client()
        for _ in range(3):
            self.assertEqual(c.post("/login/", {"username": "sec_staff", "password": "sai"}).status_code, 200)
        res = c.post("/login/", {"username": "sec_staff", "password": "Str0ng-Pass-2026!"})
        self.assertEqual(res.status_code, 429)

    def test_login_success(self):
        res = Client().post("/login/", {"username": "sec_staff", "password": "Str0ng-Pass-2026!"})
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "localStorage.setItem('access_token'")
