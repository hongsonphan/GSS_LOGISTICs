"""Kiểm thử nền móng kỹ thuật: healthz, tra giá booking theo lịch sử chuyến."""
from django.test import TestCase


class HealthzTestCase(TestCase):
    def test_healthz_ok_without_login(self):
        res = self.client.get("/healthz/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok"})

    def test_healthz_rejects_post(self):
        self.assertEqual(self.client.post("/healthz/").status_code, 405)
