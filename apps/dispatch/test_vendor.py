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


class ContainerTypeFromGridTests(VendorBase):
    """Mục 17: loại cont của chuyến lấy từ DÒNG CONT ở lưới, không lấy từ ô Size (có thể ghi nhiều loại) của booking."""

    def setUp(self):
        super().setUp()
        self.booking.container_size = '20GP,40HC'
        self.booking.save()
        self.alloc, _ = svc.create_allocation(self.booking, self.sub_a, 2)

    def test_trip_takes_type_of_its_grid_row_not_booking_size(self):
        from apps.gss.models import BookingContainer
        BookingContainer.objects.create(booking=self.booking, company=self.booking.company, line_no=1, container_number='CSQU3054383',
                                        container_type='20GP', allocation=self.alloc, alloc_line_no=1)
        BookingContainer.objects.create(booking=self.booking, company=self.booking.company, line_no=2, container_number='MSCU1234565',
                                        container_type='40HC', allocation=self.alloc, alloc_line_no=2)
        svc.submit_rows(self.alloc, [self.row(1, container_number='CSQU3054383'), self.row(2, container_number='MSCU1234565')])
        types = dict(DispatchTrip.objects.filter(booking_order=self.booking).values_list('container_number', 'container_type'))
        self.assertEqual(types, {'CSQU3054383': '20GP', 'MSCU1234565': '40HC'})  # không phải chuỗi '20GP,40HC'

    def test_without_grid_row_uses_first_booking_type(self):
        svc.submit_rows(self.alloc, [self.row(1, container_number='CSQU3054383')])
        t = DispatchTrip.objects.get(booking_order=self.booking)
        self.assertEqual(t.container_type, '20GP')

    def test_import_requires_type_when_booking_has_several_and_autofills_when_one(self):
        from apps.gss import containers as cs
        rows = [{'raw': 'CSQU3054383', 'source_line': 1}]
        res = cs.validate_rows(self.booking, rows)[0]
        self.assertFalse(res['ok'])
        self.assertIn('nhiều loại cont', ' '.join(res['errors']))
        res = cs.validate_rows(self.booking, [{'raw': 'CSQU3054383', 'source_line': 1, 'container_type': '40HC'}])[0]
        self.assertTrue(res['ok'])
        self.booking.container_size = '20GP'
        self.booking.save()
        res = cs.validate_rows(self.booking, rows)[0]
        self.assertTrue(res['ok'])
        self.assertEqual(res['container_type'], '20GP')  # booking chỉ 1 loại: tự điền cho dòng

    def test_helper_parses_and_limits_to_four_types(self):
        from apps.customers.models import MAX_CONTAINER_TYPES, booking_container_types
        self.assertEqual(booking_container_types(' 20gp ; 40HC/40hc,,45HC '), ['20GP', '40HC', '45HC'])
        self.assertEqual(booking_container_types('Cont 20GP'), [])  # chuỗi tự do không phải loại cont hợp lệ
        self.assertEqual(MAX_CONTAINER_TYPES, 4)
        from apps.dispatch import gss_bookings
        with self.assertRaises(ValidationError):
            gss_bookings.save_booking({'container_size': '20GP,40GP,40HC,45HC,20RF'}, self.booking)


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
        self.assertEqual(DispatchTrip.objects.filter(vendor_allocation=self.alloc).count(), 0)

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
        from apps.fleet.models import Vehicle, VehicleOwnership
        Vehicle.objects.create(license_plate='51C-111.11', ownership_type=VehicleOwnership.SUBCONTRACTOR, subcontractor=self.sub_b)  # xe vendor khác
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
        self.assertIn('vendor_link', str(data))

    def test_send_orders_emails_each_vendor_with_own_link_and_keeps_link(self):
        from django.core import mail
        self.sub_a.company_email = 'a@xe.vn'
        self.sub_a.save()
        self.sub_b.company_email = ''
        self.sub_b.save()
        first = self._create(3)
        res = self.client.post(f'/api/bookings/{self.booking.pk}/vendor-allocations/',
                               {'subcontractor_id': self.sub_b.pk, 'allocated_containers': 2}, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        token_a = first['link'].rstrip('/').split('/')[-1]
        mail.outbox.clear()
        out = self.client.post(f'/api/bookings/{self.booking.pk}/send-orders/', {}, content_type='application/json')
        body = out.json()
        self.assertEqual(body['data']['total'], 2)
        self.assertEqual(body['data']['sent'], 1)          # nhà xe B chưa có email -> báo rõ, không im lặng
        self.assertTrue(body['success'])
        self.assertIn('chưa có địa chỉ email', body['message'])
        self.assertFalse([r for r in body['data']['results'] if r['sent'] is False and 'email' not in r['message']])
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['a@xe.vn'])
        self.assertIn(f'/vendor/{token_a}/', mail.outbox[0].body)      # dùng lại đúng link đang chạy
        self.assertIsNotNone(svc.allocation_by_token(token_a))

    def test_send_orders_can_target_selected_vendors(self):
        from django.core import mail
        for s in (self.sub_a, self.sub_b):
            s.company_email = f'{s.pk}@xe.vn'
            s.save()
        self._create(2)
        self.client.post(f'/api/bookings/{self.booking.pk}/vendor-allocations/',
                         {'subcontractor_id': self.sub_b.pk, 'allocated_containers': 2}, content_type='application/json')
        mail.outbox.clear()
        out = self.client.post(f'/api/bookings/{self.booking.pk}/send-orders/', {'subcontractor_ids': [self.sub_b.pk]},
                               content_type='application/json').json()
        self.assertEqual((out['data']['total'], out['data']['sent']), (1, 1))
        self.assertEqual([m.to for m in mail.outbox], [[f'{self.sub_b.pk}@xe.vn']])
        bad = self.client.post(f'/api/bookings/{self.booking.pk}/send-orders/', {'subcontractor_ids': ['x']}, content_type='application/json')
        self.assertEqual(bad.status_code, 400)

    def test_send_orders_requires_dispatcher_and_allocations(self):
        res = self.client.post(f'/api/bookings/{self.booking.pk}/send-orders/', {}, content_type='application/json')
        self.assertEqual(res.status_code, 400)             # chưa có phiếu nào
        self.client.logout()
        res = self.client.post(f'/api/bookings/{self.booking.pk}/send-orders/', {}, content_type='application/json')
        self.assertIn(res.status_code, (401, 403))

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
        self.assertEqual(DispatchTrip.objects.filter(booking_order=self.booking).count(), 1)
        from core.models import AuditLog
        self.assertFalse(AuditLog.objects.filter(actor_label='khách (chưa đăng nhập)').exists())

    def test_portal_shows_booking_driver_notes(self):
        """Ghi chú của booking ("Lưu ý cho tài xế") phải hiện trên cổng nhà xe, cùng B/L để cột Số B/L không trống."""
        self.booking.notes = 'Kho nhận hàng 7h-17h, cấm đường 6h-9h'
        self.booking.hbl_number = 'HBL-NOTE-1'
        self.booking.save()
        token = self._create()['link'].rstrip('/').split('/')[-1]
        self.client.logout()
        b = self.client.get(f'/api/vendor/{token}/').json()['data']['booking']
        self.assertEqual(b['notes'], 'Kho nhận hàng 7h-17h, cấm đường 6h-9h')
        self.assertEqual(b['bl_number'], 'HBL-NOTE-1')
        # trang cổng dùng đúng khóa bl_number/notes (không dùng khóa sai làm cột B/L trống)
        html = self.client.get(f'/vendor/{token}/').content.decode()
        self.assertIn('b.bl_number || b.booking_number', html)
        self.assertIn('b.notes ?', html)

    def test_live_sync_dispatch_topic_bumps_on_allocation_and_containers(self):
        """Giao cont cho nhà xe / đổi cont phải làm tăng phiên bản chủ đề 'dispatch' để trang điều độ tự làm mới."""
        import time
        before = self.client.get('/api/master-data/sync/').json()['topics']['dispatch']
        time.sleep(0.01)
        with self.captureOnCommitCallbacks(execute=True):
            self._create(2)
        after = self.client.get('/api/master-data/sync/').json()['topics']['dispatch']
        self.assertGreater(after, before)

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

    def test_vendor_portal_excel_export_and_import(self):
        import io
        import openpyxl
        token = self._create()['link'].rstrip('/').split('/')[-1]
        self.client.logout()

        # 1. Export Excel qua token cổng nhà xe
        res = self.client.get(f'/api/vendor/{token}/excel/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

        # 2. Đọc file Excel kiểm tra cấu trúc
        wb = openpyxl.load_workbook(io.BytesIO(res.content))
        ws = wb.worksheets[0]
        self.assertEqual(ws.cell(row=1, column=1).value, 'STT')
        self.assertEqual(ws.cell(row=1, column=6).value, 'Biển Số Đầu Kéo')
        self.assertEqual(ws.cell(row=1, column=9).value, 'SĐT Tài Xế')

        # Điền thông tin xe và tài xế bổ sung (thử nghiệm SĐT 9 số không có 0 đầu)
        ws.cell(row=2, column=6, value='59C-99999')
        ws.cell(row=2, column=7, value='59R-11111')
        ws.cell(row=2, column=8, value='Bác Tài GSS')
        ws.cell(row=2, column=9, value='987654321')

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)

        # 3. Import lại file Excel đã điền thông tin
        post_res = self.client.post(f'/api/vendor/{token}/excel/', {'file': out}, format='multipart')
        self.assertEqual(post_res.status_code, 200)
        data = post_res.json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data.get('saved'), 1)

        # 4. Kiểm tra chuyến xe được tạo với SĐT chuẩn hoá có số 0
        from apps.dispatch.models import DispatchTrip
        trip = DispatchTrip.objects.filter(vendor_line_no=1, vehicle__license_plate='59C-999.99').first()
        self.assertIsNotNone(trip)
        self.assertEqual(trip.subcontractor_driver_phone, '0987654321')
        self.assertEqual(trip.subcontractor_driver_name, 'Bác Tài GSS')

    def test_revoke_and_unassign_restores_initial_state(self):
        from apps.customers.models import BookingStatus
        from apps.gss.models import BookingContainer
        from apps.gss import containers as cs

        # 1. Tạo 2 containers cho booking
        c1 = BookingContainer.objects.create(booking=self.booking, container_number='TCLU1234567', line_no=1)
        c2 = BookingContainer.objects.create(booking=self.booking, container_number='TCLU7654321', line_no=2)
        self.booking.total_containers = 2
        self.booking.status = BookingStatus.PENDING_DISPATCH
        self.booking.dispatched_containers = 0
        self.booking.save()

        # Phân bổ 2 cont cho subcontractor
        out = cs.assign(self.booking, [c1.id, c2.id], self.sub_a, user=self.user)
        alloc = out['allocation']
        self.assertIsNotNone(alloc)
        self.assertEqual(alloc.allocated_containers, 2)
        c1.refresh_from_db()
        c2.refresh_from_db()
        self.assertEqual(c1.allocation_id, alloc.id)
        self.assertEqual(c2.allocation_id, alloc.id)

        # Kiểm tra API active bookings trước khi revoke
        res = self.client.get('/api/bookings/active/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        item = next(b for b in (data if isinstance(data, list) else data.get('data', [])) if b['id'] == self.booking.id)
        self.assertEqual(item['allocated_containers'], 2)
        self.assertTrue(item['is_fully_dispatched'])
        self.assertIn(self.sub_a.short_name or self.sub_a.name, item['vendor_summary'])

        # 2. Thu hồi phân bổ (Revoke allocation)
        patch_res = self.client.patch(f'/api/vendor-allocations/{alloc.id}/', {'action': 'revoke'}, content_type='application/json')
        self.assertEqual(patch_res.status_code, 200)

        # 3. Kiểm tra trạng thái đã được hoàn trả nguyên vẹn 100%
        alloc.refresh_from_db()
        self.assertEqual(alloc.status, AllocationStatus.REVOKED)
        self.assertEqual(alloc.allocated_containers, 0)

        c1.refresh_from_db()
        c2.refresh_from_db()
        self.assertIsNone(c1.allocation)
        self.assertIsNone(c1.alloc_line_no)
        self.assertIsNone(c2.allocation)
        self.assertIsNone(c2.alloc_line_no)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.PENDING_DISPATCH)
        self.assertEqual(self.booking.dispatched_containers, 0)

        # Kiểm tra lại qua API /api/bookings/active/
        res2 = self.client.get('/api/bookings/active/')
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        item2 = next(b for b in (data2 if isinstance(data2, list) else data2.get('data', [])) if b['id'] == self.booking.id)
        self.assertEqual(item2['allocated_containers'], 0)
        self.assertFalse(item2['is_fully_dispatched'])
        self.assertEqual(item2['vendor_summary'], '')
