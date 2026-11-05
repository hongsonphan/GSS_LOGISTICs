import datetime

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from apps.customers import dem_det
from apps.customers.models import BookingOrder, Customer
from apps.dispatch import vendor_service as svc
from apps.dispatch.models import AllocationStatus, DispatchTrip, TripStatus
from apps.master_data.models import CompanyProfile, Location, Subcontractor


class DemDetTests(TestCase):
    def test_expiry_uses_first_day_convention_and_override(self):
        start = datetime.date(2026, 11, 1)
        self.assertEqual(dem_det.compute_expiry(start, 7), datetime.date(2026, 11, 7))
        self.assertEqual(dem_det.compute_expiry(start, 7, datetime.date(2026, 11, 20)), datetime.date(2026, 11, 20))
        self.assertIsNone(dem_det.compute_expiry(None, 7))
        self.assertIsNone(dem_det.compute_expiry(start, 0))

    def test_alert_levels(self):
        today = datetime.date(2026, 11, 10)
        lv = lambda d, **kw: dem_det.alert_level(datetime.date(2026, 11, d), 2, today=today, **kw)
        self.assertEqual(lv(9), 'overdue')
        self.assertEqual(lv(10), 'warn')
        self.assertEqual(lv(12), 'warn')
        self.assertEqual(lv(13), 'ok')
        self.assertEqual(lv(9, done=True), 'none')
        self.assertEqual(dem_det.alert_level(None, 2, today=today), 'none')


class Iso6346Tests(TestCase):
    def test_known_numbers(self):
        self.assertTrue(svc.iso6346_valid('CSQU3054383'))
        self.assertFalse(svc.iso6346_valid('CSQU3054384'))
        self.assertFalse(svc.iso6346_valid('ABC123'))


class VendorBase(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser('dispatcher', 'd@x.vn', 'pw-Test-12345')
        self.customer = Customer.objects.create(code='KH1', name='Khách 1', address='HCM')
        self.loc = Location.objects.create(code='KHO1', name='KHO A', destination_notes='Cổng số 3, gặp anh Nam',
                                           road_restrictions='Cấm tải 6-9h')
        self.booking = BookingOrder.objects.create(
            booking_code='BK.1', customer=self.customer, booking_number='BKG123', total_containers=10,
            pickup_location='CAT LAI', delivery_location='KHO A', delivery_loc=self.loc,
            dem_start_date=datetime.date(2026, 11, 1), free_time_demurrage=7)
        self.sub_a = Subcontractor.objects.create(name='Nhà xe A')
        self.sub_b = Subcontractor.objects.create(name='Nhà xe B')

    def row(self, n, **kw):
        base = {'line_no': n, 'tractor_plate': f'51C-000.0{n}', 'driver_name': 'Tài A', 'driver_phone': '0901234567'}
        return {**base, **kw}


class AllocationTests(VendorBase):
    def test_cannot_exceed_booking_total(self):
        svc.create_allocation(self.booking, self.sub_a, 6)
        with self.assertRaises(ValidationError):
            svc.create_allocation(self.booking, self.sub_b, 5)
        alloc, _ = svc.create_allocation(self.booking, self.sub_b, 4)
        self.assertEqual(svc.allocated_total(self.booking), 10)
        self.assertEqual(alloc.status, AllocationStatus.PENDING)

    def test_token_is_hashed_and_resolves(self):
        alloc, raw = svc.create_allocation(self.booking, self.sub_a, 2)
        self.assertNotIn(raw, alloc.token_hash)
        self.assertEqual(svc.allocation_by_token(raw).pk, alloc.pk)
        self.assertIsNone(svc.allocation_by_token(raw + 'x'))

    def test_regenerate_invalidates_old_link(self):
        alloc, old = svc.create_allocation(self.booking, self.sub_a, 2)
        new = svc.regenerate_link(alloc)
        self.assertIsNone(svc.allocation_by_token(old))
        self.assertIsNotNone(svc.allocation_by_token(new))

    def test_revoke_frees_quota_and_kills_link(self):
        alloc, raw = svc.create_allocation(self.booking, self.sub_a, 10)
        svc.revoke_allocation(alloc)
        self.assertIsNone(svc.allocation_by_token(raw))
        self.assertEqual(svc.allocated_total(self.booking), 0)

    def test_rows_always_n_lines(self):
        alloc, _ = svc.create_allocation(self.booking, self.sub_a, 4)
        self.assertEqual([r['line_no'] for r in svc.rows_for(alloc)], [1, 2, 3, 4])


class SubmitRowsTests(VendorBase):
    def setUp(self):
        super().setUp()
        self.alloc, self.raw = svc.create_allocation(self.booking, self.sub_a, 3)

    def test_row_with_plate_creates_trip_inheriting_booking(self):
        out = svc.submit_rows(self.alloc, [self.row(1, container_number='CSQU3054383', seal_number='sl1')])
        self.assertTrue(out['results'][0]['ok'], out)
        trip = DispatchTrip.objects.get(vendor_allocation=self.alloc, vendor_line_no=1)
        self.assertEqual(trip.container_number, 'CSQU3054383')
        self.assertEqual(trip.seal_number, 'SL1')
        self.assertEqual(trip.subcontractor, self.sub_a)
        self.assertEqual(trip.customer, self.customer)
        self.assertEqual(trip.dem_expiry_date, datetime.date(2026, 11, 7))
        self.assertEqual(trip.vehicle.ownership_type, 'SUBCONTRACTOR')
        self.assertEqual(trip.status, TripStatus.DRAFT)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.dispatched_containers, 1)
        self.alloc.refresh_from_db()
        self.assertEqual(self.alloc.status, AllocationStatus.PARTIAL)

    def test_all_rows_filled_marks_submitted(self):
        svc.submit_rows(self.alloc, [self.row(n) for n in (1, 2, 3)])
        self.alloc.refresh_from_db()
        self.assertEqual(self.alloc.status, AllocationStatus.SUBMITTED)

    def test_row_without_plate_is_saved_as_draft(self):
        out = svc.submit_rows(self.alloc, [{'line_no': 2, 'container_number': 'CSQU3054383'}])
        self.assertTrue(out['results'][0]['ok'])
        self.assertEqual(DispatchTrip.objects.filter(vendor_allocation=self.alloc).count(), 0)
        self.alloc.refresh_from_db()
        rows = svc.rows_for(self.alloc)
        self.assertEqual(rows[1]['container_number'], 'CSQU3054383')

    def test_line_out_of_range_and_bad_phone_rejected(self):
        out = svc.submit_rows(self.alloc, [self.row(9), self.row(1, driver_phone='abc')])
        self.assertFalse(out['results'][0]['ok'])
        self.assertFalse(out['results'][1]['ok'])
        self.assertEqual(DispatchTrip.objects.count(), 0)

    def test_duplicate_container_rejected_across_rows_and_trips(self):
        out = svc.submit_rows(self.alloc, [self.row(1, container_number='CSQU3054383'), self.row(2, container_number='CSQU3054383')])
        self.assertTrue(out['results'][0]['ok'])
        self.assertFalse(out['results'][1]['ok'])
        other, _ = svc.create_allocation(self.booking, self.sub_b, 1)
        out = svc.submit_rows(other, [self.row(1, tractor_plate='51C-999.99', container_number='CSQU3054383')])
        self.assertFalse(out['results'][0]['ok'])

    def test_invalid_iso_only_warns(self):
        out = svc.submit_rows(self.alloc, [self.row(1, container_number='ABCD1234567')])
        self.assertTrue(out['results'][0]['ok'])
        self.assertTrue(out['results'][0]['warnings'])

    def test_vendor_cannot_edit_after_pickup_but_dispatcher_can(self):
        svc.submit_rows(self.alloc, [self.row(1)])
        trip = DispatchTrip.objects.get(vendor_allocation=self.alloc)
        trip.step_status = 'LOADED_ON_VEHICLE'
        trip.save()
        changed = self.row(1, driver_name='Tài khác')
        self.assertFalse(svc.submit_rows(self.alloc, [changed])['results'][0]['ok'])
        trip.refresh_from_db()
        self.assertEqual(trip.subcontractor_driver_name, 'Tài A')
        self.assertTrue(svc.submit_rows(self.alloc, [changed], source='dispatcher', user=self.user)['results'][0]['ok'])
        trip.refresh_from_db()
        self.assertEqual(trip.subcontractor_driver_name, 'Tài khác')

    def test_locked_and_expired_block_vendor(self):
        svc.set_locked(self.alloc, True)
        with self.assertRaises(ValidationError):
            svc.submit_rows(self.alloc, [self.row(1)])
        svc.set_locked(self.alloc, False)
        self.alloc.expires_at = timezone.now() - datetime.timedelta(minutes=1)
        self.alloc.save()
        with self.assertRaises(ValidationError):
            svc.submit_rows(self.alloc, [self.row(1)])
        self.assertTrue(svc.submit_rows(self.alloc, [self.row(1)], source='dispatcher', user=self.user)['saved'])

    def test_plate_of_own_fleet_vehicle_rejected(self):
        from apps.fleet.models import Vehicle
        Vehicle.objects.create(license_plate='51C-111.11')  # xe nhà
        out = svc.submit_rows(self.alloc, [self.row(1, tractor_plate='51C-111.11')])
        self.assertFalse(out['results'][0]['ok'])

    def test_cannot_shrink_below_filled_line(self):
        svc.submit_rows(self.alloc, [self.row(3)])
        with self.assertRaises(ValidationError):
            svc.resize_allocation(self.alloc, 2)
        self.assertEqual(svc.resize_allocation(self.alloc, 3).allocated_containers, 3)


class VendorApiTests(VendorBase):
    def setUp(self):
        super().setUp()
        profile = CompanyProfile.get_default_company()
        profile.business_model = 'GSS_VENDOR_DEPOT_QR'
        profile.save()
        self.client.force_login(self.user)

    def _create(self, n=3):
        res = self.client.post(f'/api/bookings/{self.booking.pk}/vendor-allocations/',
                               {'subcontractor_id': self.sub_a.pk, 'allocated_containers': n}, content_type='application/json')
        self.assertEqual(res.status_code, 201, res.content)
        return res.json()

    def test_dispatcher_creates_and_lists(self):
        out = self._create()
        self.assertIn('/vendor/', out['link'])
        data = self.client.get(f'/api/bookings/{self.booking.pk}/vendor-allocations/').json()['data']
        self.assertEqual((data['allocated'], data['remaining']), (3, 7))
        self.assertNotIn('link', str(data))

    def test_over_allocation_returns_400(self):
        res = self.client.post(f'/api/bookings/{self.booking.pk}/vendor-allocations/',
                               {'subcontractor_id': self.sub_a.pk, 'allocated_containers': 11}, content_type='application/json')
        self.assertEqual(res.status_code, 400)

    def test_public_portal_flow_without_login(self):
        token = self._create()['link'].rstrip('/').split('/')[-1]
        self.client.logout()
        page = self.client.get(f'/vendor/{token}/')
        self.assertEqual(page.status_code, 200)
        self.assertEqual(page['Referrer-Policy'], 'no-referrer')
        data = self.client.get(f'/api/vendor/{token}/').json()['data']
        self.assertEqual(len(data['rows']), 3)
        self.assertEqual(data['booking']['destination_notes'], 'Cổng số 3, gặp anh Nam')  # lấy từ danh mục địa điểm
        self.assertEqual(data['booking']['road_restrictions'], 'Cấm tải 6-9h')
        self.assertNotIn('Khách 1', str(data))
        self.assertNotIn('selling_freight_price', str(data))
        res = self.client.put(f'/api/vendor/{token}/', {'rows': [{'line_no': 1, 'tractor_plate': '51C-222.22'}]}, content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.json()['results'][0]['ok'])
        self.assertEqual(DispatchTrip.objects.count(), 1)
        from core.models import AuditLog
        self.assertFalse(AuditLog.objects.filter(actor_label='khách (chưa đăng nhập)').exists())

    def test_wrong_token_and_revoked_token_404(self):
        out = self._create()
        token = out['link'].rstrip('/').split('/')[-1]
        self.client.logout()
        self.assertEqual(self.client.get('/api/vendor/not-a-token/').status_code, 404)
        self.client.force_login(self.user)
        alloc_id = out['data']['id']
        self.assertEqual(self.client.patch(f'/api/vendor-allocations/{alloc_id}/', {'action': 'revoke'}, content_type='application/json').status_code, 200)
        self.client.logout()
        self.assertEqual(self.client.get(f'/api/vendor/{token}/').status_code, 404)

    def test_portal_disabled_when_feature_off(self):
        token = self._create()['link'].rstrip('/').split('/')[-1]
        profile = CompanyProfile.get_default_company()
        profile.business_model = 'INTERNAL_FLEET_PNL'
        profile.save()
        self.client.logout()
        self.assertEqual(self.client.get(f'/api/vendor/{token}/').status_code, 403)
        self.assertEqual(self.client.get(f'/vendor/{token}/').status_code, 403)

    def test_dispatcher_requires_login(self):
        self.client.logout()
        res = self.client.get(f'/api/bookings/{self.booking.pk}/vendor-allocations/')
        self.assertIn(res.status_code, (401, 403))

    def test_booking_detail_exposes_dem_det_and_notes(self):
        self.booking.destination_notes = 'Gọi trước 30 phút'
        self.booking.save()
        data = self.client.get(f'/api/bookings/{self.booking.pk}/').json()
        self.assertEqual(data['dem']['expiry'], '2026-11-07')
        self.assertEqual(data['destination_notes'], 'Gọi trước 30 phút')
        res = self.client.put(f'/api/bookings/{self.booking.pk}/', {'det_start_date': '2026-11-02', 'road_restrictions': 'Cầu yếu'},
                              content_type='application/json')
        self.assertEqual(res.status_code, 200, res.content)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.det_start_date, datetime.date(2026, 11, 2))
        self.assertEqual(self.booking.road_restrictions, 'Cầu yếu')
        bad = self.client.put(f'/api/bookings/{self.booking.pk}/', {'dem_start_date': '02/11/2026'}, content_type='application/json')
        self.assertEqual(bad.status_code, 400)
