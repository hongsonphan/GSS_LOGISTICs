"""Mô hình §4 bổ sung ở GĐ0: vận đơn MBL ◄ HBL, chặng (Leg), lượt xe (TruckRun ≤ 2 TEU), JobCost, mã công khai."""
import json
import uuid

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import override_settings

from apps.dispatch.test_gss import MEDIA, GssBase
from apps.gss import legs as lg
from apps.gss.models import BillOfLading, ChargeCode, JobCharge, JobCost, Leg, RouteTemplate
from apps.master_data.models import Location, ShippingLine


@override_settings(MEDIA_ROOT=MEDIA)
class BillOfLadingTests(GssBase):
    def test_booking_numbers_create_mbl_and_hbl_linked(self):
        ShippingLine.objects.create(code='MSC', name='Mediterranean Shipping Company')
        self.booking.shipping_line = 'msc'
        self.booking.mbl_number, self.booking.hbl_number = 'medu1234567', 'HBL-001'
        self.booking.save()
        self.booking.refresh_from_db()
        hbl = self.booking.bill_of_lading
        self.assertEqual((hbl.kind, hbl.number), ('HBL', 'HBL-001'))
        self.assertEqual((hbl.master.kind, hbl.master.number, hbl.master.issuer.code), ('MBL', 'MEDU1234567', 'MSC'))
        self.assertEqual(uuid.UUID(str(hbl.public_id)).version, 7)
        # lưu lại không tạo trùng
        self.booking.save()
        self.assertEqual(BillOfLading.objects.count(), 2)

    def test_same_issuer_and_number_is_unique(self):
        sl = ShippingLine.objects.create(code='ONE', name='ONE')
        BillOfLading.objects.create(kind='MBL', number='X1', issuer=sl)
        with self.assertRaises(IntegrityError), transaction.atomic():
            BillOfLading.objects.create(kind='MBL', number='X1', issuer=sl)

    def test_clearing_numbers_unlinks(self):
        self.booking.mbl_number = 'M1'
        self.booking.save()
        self.assertIsNotNone(BillOfLading.objects.filter(number='M1').first())
        self.booking.mbl_number = ''
        self.booking.save()
        self.booking.refresh_from_db()
        self.assertIsNone(self.booking.bill_of_lading)


@override_settings(MEDIA_ROOT=MEDIA)
class LegAndTruckRunTests(GssBase):
    def setUp(self):
        super().setUp()
        self.client.force_login(self.staff)

    def test_default_legs_follow_trip_and_steps(self):
        t = self.trip(dropoff_location='DEPOT TÂN CẢNG')
        t.dropoff_location = 'DEPOT TÂN CẢNG'
        t.save()
        legs = lg.ensure_legs(t)
        self.assertEqual([(x.seq, x.kind) for x in legs], [(1, 'DELIVERY'), (2, 'EMPTY_RETURN')])
        self.assertEqual(legs[1].to_text, 'DEPOT TÂN CẢNG')
        t = self.run_to(t, 'UNLOADED')
        self.assertEqual(list(Leg.objects.filter(trip=t).values_list('status', flat=True)), ['DONE', 'PLANNED'])
        from apps.dispatch import gss_attachments as att
        from apps.dispatch import gss_workflow as wf
        from apps.dispatch.test_gss import png
        t = wf.advance(t, 'RETURNING_EMPTY')
        att.add_attachments(t, 'EMPTY_RETURN', [png()])
        wf.advance(t, 'EMPTY_RETURNED')
        self.assertEqual(set(Leg.objects.filter(trip=t).values_list('status', flat=True)), {'DONE'})

    def test_route_template_builds_custom_legs(self):
        port = Location.objects.create(code='CL', name='Cảng Cát Lái')
        tpl = RouteTemplate.objects.create(code='R1', name='Cảng -> kho -> trạm -> depot', steps=[
            {'kind': 'PICKUP', 'location_id': port.pk}, {'kind': 'DELIVERY', 'location_id': self.loc.pk},
            {'kind': 'TRANSFER', 'label': 'Trạm cân'}, {'kind': 'EMPTY_RETURN', 'label': 'Depot'}])
        t = self.trip()
        legs = lg.ensure_legs(t, tpl, rebuild=True)
        self.assertEqual([(x.from_text, x.to_text, x.kind) for x in legs],
                         [('Cảng Cát Lái', 'KHO A', 'DELIVERY'), ('KHO A', 'Trạm cân', 'TRANSFER'), ('Trạm cân', 'Depot', 'EMPTY_RETURN')])

    def test_truck_run_capacity_two_teu(self):
        t20a = self.trip(1, cont='CSQU3054383')
        t20b = self.trip(2, cont='MSCU1234566')
        t40 = self.trip(3, cont='TGHU1000014')
        for t, ctype in ((t20a, '20GP'), (t20b, '20GP'), (t40, '40HC')):
            t.container_type = ctype
            t.save()
        run = lg.assign_legs(lg.ensure_legs(t20a)[:1], tractor_plate='51C-123.45')
        lg.assign_legs(lg.ensure_legs(t20b)[:1], run=run)
        self.assertEqual(lg.run_teu(run), 2)
        with self.assertRaises(ValidationError):
            lg.assign_legs(lg.ensure_legs(t40)[:1], run=run)
        self.assertTrue(run.code.startswith('LX.'))

    def test_legs_api(self):
        t = self.trip()
        r = self.client.get(f'/api/gss/trips/{t.trip_code}/legs/')
        self.assertEqual(r.status_code, 200, r.content)
        data = r.json()['data']
        self.assertEqual(data['teu'], 2)
        r = self.client.post(f'/api/gss/trips/{t.trip_code}/legs/', json.dumps({'action': 'assign', 'trailer_plate': '51R-1'}),
                             content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(all(x['truck_run'] for x in r.json()['data']['legs']))


@override_settings(MEDIA_ROOT=MEDIA)
class JobCostProxyTests(GssBase):
    def test_job_cost_is_buy_side(self):
        t = self.trip()
        cc = ChargeCode.objects.create(code='CUOCX', name='Cước', kind='FREIGHT')
        JobCharge.objects.create(trip=t, side='SELL', charge_code=cc, amount=100)
        cost = JobCost.objects.create(trip=t, charge_code=cc, amount=70)
        self.assertEqual(cost.side, 'BUY')
        self.assertEqual(list(JobCost.objects.values_list('amount', flat=True)), [70])
        self.assertEqual(JobCharge.objects.count(), 2)
