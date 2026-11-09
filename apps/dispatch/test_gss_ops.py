import io

from apps.depot_yard import service as depot
from apps.dispatch.models import DispatchTrip
from apps.dispatch.test_gss import GssBase
from apps.master_data.models import CompanyProfile


class ManualTripTests(GssBase):
    def setUp(self):
        super().setUp()
        self.client.force_login(self.staff)

    def post(self, **kw):
        base = {'booking_id': self.booking.pk, 'subcontractor_id': self.sub.pk, 'tractor_plate': '51C-123.45', 'container_number': 'CSQU3054383', 'driver_name': 'Tài X'}
        return self.client.post('/api/gss/manual-trips/', {**base, **kw}, content_type='application/json')

    def test_manual_trip_with_booking_inherits_and_syncs(self):
        r = self.post()
        self.assertEqual(r.status_code, 201, r.content)
        t = DispatchTrip.objects.get(trip_code=r.json()['data']['trip_code'])
        self.assertEqual((t.booking_order, t.customer, t.subcontractor, t.vendor_allocation), (self.booking, self.customer, self.sub, None))
        self.assertEqual(t.dem_expiry_date, self.booking.dem_expiry)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.dispatched_containers, 1)

    def test_booking_capacity_enforced(self):
        self.booking.total_containers = 1
        self.booking.save()
        self.assertEqual(self.post().status_code, 201)
        r = self.post(tractor_plate='51C-222.22', container_number='MSKU0000000')
        self.assertEqual(r.status_code, 400)
        self.assertIn('đã đủ', r.json()['message'])

    def test_without_booking_needs_customer_and_route(self):
        body = {'subcontractor_id': self.sub.pk, 'tractor_plate': '51C-555.55'}
        self.assertEqual(self.client.post('/api/gss/manual-trips/', body, content_type='application/json').status_code, 400)
        ok = self.client.post('/api/gss/manual-trips/', {**body, 'customer_id': self.customer.pk, 'pickup': 'A', 'delivery': 'B'}, content_type='application/json')
        self.assertEqual(ok.status_code, 201, ok.content)
        self.assertIsNone(DispatchTrip.objects.get(trip_code=ok.json()['data']['trip_code']).booking_order)

    def test_internal_vehicle_must_exist_and_duplicates_blocked(self):
        r = self.post(subcontractor_id=None, tractor_plate='99X-000.00')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Đội xe nhà', r.json()['message'])
        from apps.fleet.models import Vehicle
        Vehicle.objects.create(license_plate='51C-777.77')
        self.assertEqual(self.post(subcontractor_id=None, tractor_plate='51C-777.77').status_code, 201)
        self.assertEqual(self.post(tractor_plate='51C-888.88').status_code, 400)  # trùng số cont đang chạy
        self.assertEqual(self.post(tractor_plate='bad!!', container_number='').status_code, 400)

    def test_requires_login(self):
        self.client.logout()
        self.assertIn(self.client.post('/api/gss/manual-trips/', {}, content_type='application/json').status_code, (401, 403))


class SettlementTests(GssBase):
    def setUp(self):
        super().setUp()
        self.client.force_login(self.staff)
        self.t = self.run_to(self.trip(), 'EMPTY_RETURNED')

    def act(self, **kw):
        return self.client.post(f'/api/gss/settlement/{self.t.trip_code}/', kw, content_type='application/json')

    def test_list_and_summary(self):
        j = self.client.get('/api/gss/settlement/').json()
        self.assertEqual(j['total'], 1)
        self.assertEqual((j['results'][0]['status'], j['results'][0]['docs_complete'], j['results'][0]['completed']), ('PENDING', True, True))
        self.assertEqual(j['summary'][0]['trips'], 1)

    def test_cost_validation_and_flow(self):
        self.assertEqual(self.act(action='update_cost', cost=-5, advance=0).status_code, 400)
        self.assertEqual(self.act(action='update_cost', cost='abc', advance=0).status_code, 400)
        self.assertEqual(self.act(action='update_cost', cost=1000000, advance=2000000).status_code, 400)  # tạm ứng > cước
        self.assertEqual(self.act(action='reconcile').status_code, 400)  # chưa có cước
        self.assertEqual(self.act(action='update_cost', cost=3000000, advance=1000000, notes='ok').status_code, 200)
        r = self.act(action='reconcile')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual((r.json()['data']['status'], r.json()['data']['remaining']), ('RECONCILING', 2000000))
        # sửa cước sau khi chốt -> phải chốt lại
        self.assertEqual(self.act(action='update_cost', cost=3500000, advance=1000000).json()['data']['status'], 'PENDING')
        self.act(action='reconcile')
        self.assertEqual(self.act(action='reopen', reason='x').status_code, 400)
        self.assertEqual(self.act(action='reopen', reason='Nhà xe xin chỉnh cước').json()['data']['status'], 'PENDING')

    def test_blocked_when_not_completed_or_missing_docs(self):
        other = self.trip(2, cont='MSKU0000000')
        self.client.post(f'/api/gss/settlement/{other.trip_code}/', {'action': 'update_cost', 'cost': 1000000, 'advance': 0}, content_type='application/json')
        r = self.client.post(f'/api/gss/settlement/{other.trip_code}/', {'action': 'reconcile'}, content_type='application/json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('hạ rỗng', r.json()['message'])
        from apps.documents.models import TripDocument
        TripDocument.objects.filter(trip=self.t, workflow_stage='DELIVERY').update(is_deleted=True)
        self.act(action='update_cost', cost=1000000, advance=0)
        r = self.act(action='reconcile')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Thiếu chứng từ', r.json()['message'])
        self.assertEqual(self.act(action='reconcile', reason='Có biên bản giấy lưu ở kho').status_code, 200)  # ngoại lệ có lý do

    def test_accounting_locked_trips_cannot_be_edited(self):
        DispatchTrip.objects.filter(pk=self.t.pk).update(subcontractor_settlement_status='SETTLED')
        r = self.act(action='update_cost', cost=1, advance=0)
        self.assertEqual(r.status_code, 400)
        self.assertIn('Kế toán', r.json()['message'])

    def test_export_excel_and_formula_safety(self):
        DispatchTrip.objects.filter(pk=self.t.pk).update(subcontractor_notes='=HYPERLINK("http://x")')
        res = self.client.get('/api/gss/settlement/export/')
        self.assertEqual(res.status_code, 200)
        from openpyxl import load_workbook
        wb = load_workbook(io.BytesIO(res.content))
        self.assertEqual(wb.sheetnames, ['Tổng hợp nhà xe', 'Chi tiết cont'])
        detail = list(wb['Chi tiết cont'].iter_rows(values_only=True))
        self.assertTrue(str(detail[1][-1]).startswith("'="))  # không chạy được công thức
        self.assertEqual(self.client.get('/api/gss/trips-export/').status_code, 200)

    def test_requires_login_and_feature(self):
        p = CompanyProfile.get_default_company()
        p.enabled_features = {'accounting': False}
        p.save()
        self.assertEqual(self.client.get('/api/gss/settlement/').status_code, 403)
        p.enabled_features = {}
        p.save()
        self.client.logout()
        self.assertIn(self.client.get('/api/gss/settlement/').status_code, (401, 403))

    def test_depot_export(self):
        depot.gate_in(depot.default_yard(), {'container_number': 'ABCU1234567', 'in_vehicle_plate': '51C-1'})
        res = self.client.get('/api/depot/export/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('spreadsheetml', res['Content-Type'])
