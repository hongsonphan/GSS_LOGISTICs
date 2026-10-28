import datetime

from django.test import TestCase
from django.utils import timezone

from apps.dispatch.time_utils import parse_vn_datetime


class ParseVnDatetimeTests(TestCase):
    base = datetime.date(2026, 10, 27)

    def check(self, text, expected):
        value = parse_vn_datetime(text, self.base)
        self.assertIsNotNone(value, text)
        self.assertEqual(timezone.localtime(value).replace(tzinfo=None), expected)

    def test_formats(self):
        self.check('14:05 27/10/2026', datetime.datetime(2026, 10, 27, 14, 5))
        self.check('27/10/2026 14:05', datetime.datetime(2026, 10, 27, 14, 5))
        self.check('16H30', datetime.datetime(2026, 10, 27, 16, 30))
        self.check('8H', datetime.datetime(2026, 10, 27, 8, 0))
        self.check('9h15 28/10', datetime.datetime(2026, 10, 28, 9, 15))

    def test_invalid(self):
        for text in ['', None, 'chưa rõ', '25:00', '10:00 31/02']:
            self.assertIsNone(parse_vn_datetime(text, self.base), text)


class TripContainerSyncTests(TestCase):
    def setUp(self):
        from apps.customers.models import Customer
        from apps.fleet.models import Vehicle, VehicleType
        self.customer = Customer.objects.create(code='CUST_P5', name='Khách P5')
        today = timezone.now().date()
        self.vehicle = Vehicle.objects.create(license_plate='51C-555.55', vehicle_type=VehicleType.TRACTOR,
                                              registration_expiry=today, insurance_expiry=today)

    def make_trip(self, **kw):
        from apps.dispatch.models import DispatchTrip
        return DispatchTrip.objects.create(trip_code=kw.pop('trip_code', 'P5-01'), customer=self.customer, vehicle=self.vehicle,
                                           pickup_location='A', warehouse_location='B', dropoff_location='C', **kw)

    def test_single_then_twin(self):
        trip = self.make_trip(container_number='ABCU1234567', seal_number='S1')
        self.assertEqual(list(trip.containers.values_list('seq', 'container_number')), [(1, 'ABCU1234567')])
        trip.is_twin_container = True
        trip.container_number_2 = 'XYZU7654321'
        trip.save()
        self.assertEqual(list(trip.containers.values_list('seq', 'container_number')),
                         [(1, 'ABCU1234567'), (2, 'XYZU7654321')])
        trip.is_twin_container = False
        trip.container_number_2 = ''
        trip.save()
        self.assertEqual(trip.containers.count(), 1)

    def test_time_text_fills_datetime(self):
        trip = self.make_trip(trip_code='P5-02', loading_date=datetime.date(2026, 10, 27), actual_gate_in_time='14:05')
        trip.refresh_from_db()
        self.assertEqual(timezone.localtime(trip.actual_gate_in_at).replace(tzinfo=None),
                         datetime.datetime(2026, 10, 27, 14, 5))
