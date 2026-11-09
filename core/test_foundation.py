"""Kiểm thử nền móng kỹ thuật: healthz, tra giá booking theo lịch sử chuyến."""
from django.test import TestCase


class HealthzTestCase(TestCase):
    def test_healthz_ok_without_login(self):
        res = self.client.get("/healthz/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok"})

    def test_healthz_rejects_post(self):
        self.assertEqual(self.client.post("/healthz/").status_code, 405)


class ApiDocsTestCase(TestCase):
    def test_schema_only_for_admin(self):
        from django.contrib.auth.models import User
        self.assertIn(self.client.get("/api/schema/").status_code, (401, 403))
        admin = User.objects.create_user("docs_admin", password="Str0ng-Pass-2026!", is_staff=True)
        self.client.force_login(admin)
        res = self.client.get("/api/schema/")
        self.assertEqual(res.status_code, 200)
        self.assertIn(b"/api/trips/", res.content)

    def test_legacy_import_paths_still_work(self):
        from apps.dispatch.api_views import (  # noqa: F401
            TripDetailAPIView, SalesAPIView, get_trip_by_code_or_hash, resolve_customer, calculate_dem_det_status,
        )
