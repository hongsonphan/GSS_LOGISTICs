"""Tiêu chí nghiệm thu: mọi API GET không tham số chạy được (không lỗi 5xx) và không có truy vấn N+1.

- Quét toàn bộ URL /api/... không có tham số đường dẫn, gọi GET bằng tài khoản quản trị.
- N+1: đo số truy vấn khi có 2 chuyến và khi có 8 chuyến (kèm chi phí, phiếu thu chi). Số truy vấn của một API
  danh sách không được tăng theo số dòng quá NPLUS1_TOLERANCE.
"""
import datetime

from django.contrib.auth.models import User
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import URLPattern, URLResolver, get_resolver
from django.utils import timezone

from apps.billing.models import CashTransaction, TripExpense
from apps.customers.models import Customer
from apps.dispatch.models import DispatchTrip
from apps.fleet.models import Vehicle, VehicleType
from apps.personnel.models import Employee, EmployeeRole

# API chỉ ghi (POST), tải file nặng, hoặc cần tham số truy vấn bắt buộc -> bỏ qua trong vòng quét GET
SKIP_PREFIXES = ('/api/schema', '/api/docs', '/api/auth/', '/api/redoc')
# Số truy vấn được phép tăng thêm khi dữ liệu tăng từ 2 lên 8 chuyến (cache, phân trang, đếm…)
NPLUS1_TOLERANCE = 4
# Ngưỡng tuyệt đối số truy vấn cho một request GET (chặn các màn hình tổng hợp chạy hàng trăm truy vấn)
MAX_QUERIES = 150


def _api_paths():
    paths = []

    def walk(patterns, prefix=''):
        for p in patterns:
            route = prefix + str(p.pattern)
            if isinstance(p, URLResolver):
                walk(p.url_patterns, route)
            elif isinstance(p, URLPattern):
                if '<' in route or '(?P' in route or not route.startswith('api/'):
                    continue
                route = route.replace('^', '').replace('$', '')
                paths.append('/' + route)

    walk(get_resolver().url_patterns)
    return sorted({p for p in paths if not p.startswith(SKIP_PREFIXES)})


class ApiSmokeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_superuser('smoke_admin', 'smoke@example.com', 'Pw-Smoke#2026')
        Employee.objects.create(user=cls.user, code='SMK-GD', full_name='Giám đốc thử', phone_number='0900000300',
                                role=EmployeeRole.DIRECTOR)
        today = timezone.now().date()
        cls.customer = Customer.objects.create(code='KH_SMK', name='Khách thử', tax_code='0300000099')
        cls.vehicle = Vehicle.objects.create(license_plate='51C-123.45', vehicle_type=VehicleType.TRACTOR,
                                             registration_expiry=today, insurance_expiry=today)
        cls.driver = Employee.objects.create(code='TXSMK', full_name='Tài xế thử', phone_number='0900000301',
                                             role=EmployeeRole.DRIVER)
        cls.seq = 0

    def _add_trips(self, n):
        for _ in range(n):
            type(self).seq += 1
            i = type(self).seq
            trip = DispatchTrip.objects.create(
                trip_code=f'SMK-{i:03d}', customer=self.customer, vehicle=self.vehicle, driver=self.driver,
                pickup_location='Cát Lái', warehouse_location='Kho A', dropoff_location='ICD', cached_revenue=3_000_000,
                loading_date=timezone.now().date())
            TripExpense.objects.create(trip=trip, driver=self.driver, category='TOLL_FEE', amount=100_000, status='APPROVED')
            CashTransaction.objects.create(code=f'PC-SMK-{i:03d}', transaction_type='OUTFLOW', payment_method='CASH',
                                           category='FUEL_PAYMENT', amount=200_000, transaction_date=datetime.date.today(),
                                           ref_code=trip.trip_code)

    def _sweep(self):
        counts, failures = {}, []
        for path in _api_paths():
            with CaptureQueriesContext(connection) as ctx:
                try:
                    res = self.client.get(path)
                except Exception as exc:  # noqa: BLE001 — ghi nhận để báo cùng lúc
                    failures.append(f'{path}: {type(exc).__name__}: {exc}'[:200])
                    continue
            if res.status_code >= 500:
                failures.append(f'{path}: HTTP {res.status_code}')
            counts[path] = (res.status_code, len(ctx.captured_queries))
        return counts, failures

    def test_get_endpoints_no_5xx_and_no_n_plus_1(self):
        self.client.force_login(self.user)
        self._add_trips(2)
        small, failures = self._sweep()
        self._add_trips(6)
        large, failures2 = self._sweep()
        self.assertGreater(len(small), 40, 'Quét được quá ít API — kiểm tra lại cách liệt kê URL')
        self.assertEqual(failures + failures2, [])
        growth = {p: (small[p][1], large[p][1]) for p in small
                  if p in large and small[p][0] == 200 and large[p][1] - small[p][1] > NPLUS1_TOLERANCE}
        self.assertEqual(growth, {}, 'API có số truy vấn tăng theo số dòng (N+1): {path: (2 chuyến, 8 chuyến)}')
        heavy = {p: c for p, (s, c) in large.items() if c > MAX_QUERIES}
        self.assertEqual(heavy, {}, f'API vượt {MAX_QUERIES} truy vấn')
