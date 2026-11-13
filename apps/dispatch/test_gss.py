import datetime
import io
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image

from apps.customers.models import BookingOrder, Customer, PodTemplate
from apps.depot_yard import service as depot
from apps.depot_yard.models import MovementStatus
from apps.dispatch import gss_attachments as att
from apps.dispatch import gss_dashboard as dash
from apps.dispatch import gss_messages as msg
from apps.dispatch import gss_workflow as wf
from apps.dispatch import vendor_service as vsvc
from apps.dispatch.models import DispatchTrip
from apps.master_data.models import CompanyProfile, Location, Subcontractor
from apps.qr_tracking import service as qr
from apps.qr_tracking.models import PackageStatus
from core import qr_tokens

MEDIA = tempfile.mkdtemp(prefix='gss_test_media_')


def png(name='a.png', size=(40, 40)):
    buf = io.BytesIO()
    Image.new('RGB', size, (200, 30, 30)).save(buf, 'PNG')
    return SimpleUploadedFile(name, buf.getvalue(), content_type='image/png')


@override_settings(MEDIA_ROOT=MEDIA)
class GssBase(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        profile = CompanyProfile.get_default_company()
        profile.business_model = 'GSS_VENDOR_DEPOT_QR'
        profile.save()
        self.staff = get_user_model().objects.create_superuser('dieuvan', 'd@x.vn', 'pw-Test-12345')
        self.customer = Customer.objects.create(code='KH1', name='Khách <b>1</b>', address='HCM')
        self.loc = Location.objects.create(code='KHO1', name='KHO A', destination_notes='Cổng 3', road_restrictions='Cấm 6-9h')
        self.booking = BookingOrder.objects.create(
            booking_code='BK.1', customer=self.customer, booking_number='BKG1', total_containers=5, pickup_location='CAT LAI',
            delivery_location='KHO A', delivery_loc=self.loc, dem_start_date=datetime.date.today(), free_time_demurrage=7,
            det_start_date=datetime.date.today(), free_time_detention=7)
        self.sub = Subcontractor.objects.create(name='Nhà xe A')
        self.alloc, self.raw = vsvc.create_allocation(self.booking, self.sub, 3)

    def trip(self, n=1, cont='CSQU3054383', **extra):
        vsvc.submit_rows(self.alloc, [{'line_no': n, 'tractor_plate': f'51C-000.0{n}', 'container_number': cont,
                                       'driver_name': 'Tài A', 'driver_phone': '0901234567', **extra}])
        return DispatchTrip.objects.get(vendor_allocation=self.alloc, vendor_line_no=n)

    def run_to(self, trip, step, **kw):
        """Đi lần lượt tới `step`, tải chứng từ khi cần."""
        for nxt in wf.STEPS[1:wf.STEPS.index(step) + 1]:
            stage = wf.EVIDENCE_STAGE.get(nxt)
            if stage and not wf.stage_file_count(trip, stage):
                att.add_attachments(trip, stage, [png()])
            trip = wf.advance(trip, nxt, **kw)
        return trip


class WorkflowTests(GssBase):
    def test_new_trip_starts_ready(self):
        t = self.trip()
        self.assertEqual(t.step_status, 'READY')

    def test_driver_must_go_step_by_step_and_never_backwards(self):
        t = self.trip()
        with self.assertRaises(ValidationError):
            wf.advance(t, 'LOADED_ON_VEHICLE')  # nhảy cóc
        t = wf.advance(t, 'ARRIVED_AT_PICKUP')
        with self.assertRaises(ValidationError):
            wf.advance(t, 'READY')

    def test_evidence_required_before_stage_complete(self):
        t = wf.advance(self.trip(), 'ARRIVED_AT_PICKUP')
        with self.assertRaisesMessage(ValidationError, 'chứng từ'):
            wf.advance(t, 'LOADED_ON_VEHICLE')
        att.add_attachments(t, 'PICKUP', [png()])
        t = wf.advance(t, 'LOADED_ON_VEHICLE')
        self.assertEqual(t.status, 'CONTAINER_PICKED')  # đồng bộ TripStatus cũ
        self.assertIsNotNone(t.loaded_at)

    def test_full_journey_completes_and_logs(self):
        t = self.run_to(self.trip(), 'EMPTY_RETURNED')
        self.assertEqual((t.step_status, t.status), ('EMPTY_RETURNED', 'COMPLETED'))
        self.assertIsNotNone(t.actual_end_time)
        self.assertGreaterEqual(t.event_logs.filter(event_type__startswith='STEP_').count(), 6)

    def test_staff_force_needs_reason_and_is_logged(self):
        t = self.trip()
        with self.assertRaises(ValidationError):
            wf.advance(t, 'UNLOADED', user=self.staff, force=True)
        t = wf.advance(t, 'UNLOADED', user=self.staff, force=True, reason='Tài xế mất điện thoại')
        self.assertEqual(t.step_status, 'UNLOADED')
        ev = t.event_logs.filter(event_type='STEP_UNLOADED').first()
        self.assertTrue(ev.metadata['overridden'])
        self.assertEqual(ev.metadata['by'], 'dieuvan')

    def test_driver_cannot_force(self):
        t = self.trip()
        with self.assertRaises(ValidationError):
            wf.advance(t, 'UNLOADED', force=True, reason='lý do dài')  # không có user

    def test_staff_cannot_move_backward_once_advanced(self):
        t = self.run_to(self.trip(), 'EMPTY_RETURNED')
        with self.assertRaisesMessage(ValidationError, 'chuyển ngược lại trạng thái của bước trước'):
            wf.advance(t, 'UNLOADED', user=self.staff, force=True, reason='Nhập nhầm bước hạ rỗng')

    def test_container_number_required_to_load(self):
        t = self.trip(cont='')
        t = wf.advance(t, 'ARRIVED_AT_PICKUP')
        att.add_attachments(t, 'PICKUP', [png()])
        with self.assertRaisesMessage(ValidationError, 'số container'):
            wf.advance(t, 'LOADED_ON_VEHICLE')
        t = wf.advance(t, 'LOADED_ON_VEHICLE', fields={'container_number': 'abcu 1234567'})
        self.assertEqual(t.container_number, 'ABCU 1234567'.upper())

    def test_cancel_only_before_pickup(self):
        t = self.trip()
        self.assertEqual(wf.cancel(t, user=self.staff, reason='Khách hủy lệnh').step_status, 'CANCELLED')
        t2 = self.run_to(self.trip(2, cont='MSKU0000000'), 'LOADED_ON_VEHICLE')
        with self.assertRaises(ValidationError):
            wf.cancel(t2, user=self.staff, reason='Khách hủy lệnh')

    def test_container_swap_keeps_both_numbers(self):
        t = self.run_to(self.trip(), 'RETURNING_EMPTY')
        att.add_attachments(t, 'EMPTY_RETURN', [png()])
        with self.assertRaisesMessage(ValidationError, 'lý do'):
            wf.advance(t, 'EMPTY_RETURNED', swap={'new_number': 'MSKU1111110'})
        t = wf.advance(t, 'EMPTY_RETURNED', swap={'new_number': 'msku 1111110', 'reason': 'Vendor giữ vỏ cũ đóng hàng khác'})
        self.assertEqual((t.container_number, t.return_container_number, t.is_container_swapped), ('CSQU3054383', 'MSKU1111110', True))
        self.assertIn('CSQU3054383 ➔ MSKU1111110', wf.swap_label(t))

    def test_same_number_is_not_a_swap(self):
        t = self.run_to(self.trip(), 'RETURNING_EMPTY')
        att.add_attachments(t, 'EMPTY_RETURN', [png()])
        t = wf.advance(t, 'EMPTY_RETURNED', swap={'new_number': 'csqu3054383'})
        self.assertFalse(t.is_container_swapped)
        self.assertEqual(t.return_container_number, '')

    def test_swap_to_container_in_use_rejected(self):
        self.trip(2, cont='MSKU1111110')
        t = self.run_to(self.trip(), 'RETURNING_EMPTY')
        att.add_attachments(t, 'EMPTY_RETURN', [png()])
        with self.assertRaisesMessage(ValidationError, 'đang dùng'):
            wf.advance(t, 'EMPTY_RETURNED', swap={'new_number': 'MSKU1111110', 'reason': 'đổi vỏ'})


class AttachmentTests(GssBase):
    def test_max_ten_per_stage_enforced_on_server(self):
        t = self.trip()
        att.add_attachments(t, 'PICKUP', [png(f'{i}.png') for i in range(8)])
        with self.assertRaisesMessage(ValidationError, 'còn nhận thêm được 2'):
            att.add_attachments(t, 'PICKUP', [png(f'x{i}.png') for i in range(3)])
        self.assertEqual(wf.stage_file_count(t, 'PICKUP'), 8)  # không nhận nửa chừng
        att.add_attachments(t, 'PICKUP', [png('y1.png'), png('y2.png')])
        self.assertEqual(wf.stage_file_count(t, 'PICKUP'), 10)
        att.add_attachments(t, 'DELIVERY', [png()])  # chặng khác không bị ảnh hưởng
        self.assertEqual(wf.stage_file_count(t, 'DELIVERY'), 1)

    def test_rejects_fake_image_and_bad_stage(self):
        t = self.trip()
        with self.assertRaises(ValidationError):
            att.add_attachments(t, 'PICKUP', [SimpleUploadedFile('virus.png', b'MZ not an image')])
        with self.assertRaises(ValidationError):
            att.add_attachments(t, 'OTHER', [png()])
        with self.assertRaises(ValidationError):
            att.add_attachments(t, 'PICKUP', [])
        self.assertEqual(wf.stage_file_count(t, 'PICKUP'), 0)

    def test_sequence_numbers_and_soft_remove(self):
        t = self.trip()
        docs = att.add_attachments(t, 'PICKUP', [png('a.png'), png('b.png')])
        self.assertEqual([d.sequence_no for d in docs], [1, 2])
        att.remove_attachment(t, docs[0].id, user=self.staff, reason='Ảnh chụp mờ')
        self.assertEqual(wf.stage_file_count(t, 'PICKUP'), 1)
        self.assertTrue(type(docs[0]).all_objects.filter(pk=docs[0].pk, is_deleted=True).exists())  # không xóa cứng
        with self.assertRaises(ValidationError):
            att.remove_attachment(t, docs[1].id, user=None, reason='Ảnh chụp mờ')


class MessageAndPodTests(GssBase):
    def test_message_contains_route_notes_deadlines_and_link(self):
        t = self.trip()
        text = msg.compose_message(t, 'https://gss.example/')
        for part in (t.trip_code, 'CSQU3054383', 'CAT LAI', 'Cổng 3', 'Cấm 6-9h', 'DEM', 'https://gss.example/q/'):
            self.assertIn(part, text)

    def test_open_marks_portal_messages_read(self):
        t = self.trip()
        log = msg.log_message(t, channel='ZALO', content='x', user=self.staff)
        copy = msg.log_message(t, channel='COPY', content='x', user=self.staff)
        msg.mark_opened(t)
        log.refresh_from_db(); copy.refresh_from_db()
        self.assertTrue(log.is_read)
        self.assertFalse(copy.is_read)  # sao chép không có xác nhận

    def test_pod_escapes_values_and_strips_scripts_from_template(self):
        t = self.trip()
        tpl = PodTemplate.objects.create(code='MAU1', name='Mẫu KH1', is_default=False,
                                         header_html='<h1 onclick="x()">{{ customer_name }}</h1><script>alert(1)</script>',
                                         body_html='<p>{{ container_number }} <a href="javascript:alert(1)">x</a></p>', terms_html='')
        self.customer.pod_template = tpl
        self.customer.save()
        html = msg.render_pod(DispatchTrip.objects.get(pk=t.pk))
        self.assertNotIn('<script', html.lower())
        self.assertNotIn('<h1 onclick', html)
        self.assertNotIn('alert(1)', html)
        self.assertNotIn('javascript:', html)
        self.assertIn('Khách &lt;b&gt;1&lt;/b&gt;', html)  # dữ liệu khách bị escape
        self.assertIn('CSQU3054383', html)

    def test_pod_falls_back_to_default_and_includes_swap(self):
        t = self.run_to(self.trip(), 'RETURNING_EMPTY')
        att.add_attachments(t, 'EMPTY_RETURN', [png()])
        t = wf.advance(t, 'EMPTY_RETURNED', swap={'new_number': 'MSKU1111110', 'reason': 'đổi vỏ'})
        html = msg.render_pod(t)
        self.assertIn('BIÊN BẢN GIAO NHẬN', html)
        self.assertIn('hạ rỗng: MSKU1111110', html)


class QrTokenTests(GssBase):
    def test_roundtrip_tamper_and_version(self):
        t = self.trip()
        tok = msg.trip_token(t)
        self.assertEqual(qr.trip_by_token(tok).pk, t.pk)
        self.assertIsNone(qr.trip_by_token(tok[:-1] + ('A' if tok[-1] != 'A' else 'B')))
        self.assertIsNone(qr.trip_by_token('T999999.' + tok.split('.')[1]))
        self.assertIsNone(qr.trip_by_token('garbage'))
        t.qr_version += 1
        t.save()
        self.assertIsNone(qr.trip_by_token(tok))  # QR cũ bị vô hiệu
        self.assertIsNotNone(qr.trip_by_token(msg.trip_token(t)))

    def test_trip_token_is_not_a_package_token(self):
        t = self.trip()
        self.assertIsNone(qr.package_by_token(msg.trip_token(t)))

    def test_qr_svg_renders(self):
        self.assertIn('<svg', qr_tokens.qr_svg('https://x.vn/q/T1.abcdefabcdefabcd/'))


class PackageTests(GssBase):
    def setUp(self):
        super().setUp()
        self.t = self.trip()
        self.pk = qr.add_packages(self.t, [{'seal_number': f'SL-{i}', 'recipient_name': 'Kho B'} for i in (1, 2, 3)])

    def test_numbering_and_duplicate_seal(self):
        self.assertEqual([(p.package_index, p.package_total) for p in self.pk], [(1, 3), (2, 3), (3, 3)])
        with self.assertRaisesMessage(ValidationError, 'trùng'):
            qr.add_packages(self.t, [{'seal_number': 'sl 1'}])  # cùng seal sau khi chuẩn hóa
        with self.assertRaises(ValidationError):
            qr.add_packages(self.t, [{'seal_number': ''}])

    def test_cannot_load_until_all_packages_scanned(self):
        t = wf.advance(self.t, 'ARRIVED_AT_PICKUP')
        att.add_attachments(t, 'PICKUP', [png()])
        qr.scan_package(self.pk[0], 'PICKUP')
        with self.assertRaisesMessage(ValidationError, '1/3'):
            wf.advance(t, 'LOADED_ON_VEHICLE')
        qr.scan_package(self.pk[1], 'PICKUP')
        qr.scan_package(self.pk[2], 'PICKUP')
        self.assertEqual(wf.advance(t, 'LOADED_ON_VEHICLE').step_status, 'LOADED_ON_VEHICLE')

    def _loaded(self):
        t = wf.advance(self.t, 'ARRIVED_AT_PICKUP')
        att.add_attachments(t, 'PICKUP', [png()])
        for p in self.pk:
            qr.scan_package(p, 'PICKUP')
        t = wf.advance(t, 'LOADED_ON_VEHICLE')
        return wf.advance(t, 'ARRIVED_AT_DELIVERY')

    def test_matching_seals_allow_delivery(self):
        t = self._loaded()
        att.add_attachments(t, 'DELIVERY', [png()])
        for p in self.pk:
            out = qr.scan_package(p, 'DELIVERY', seal_seen=p.seal_number.lower())
            self.assertEqual(out['result'], 'OK')
        self.assertEqual(wf.advance(t, 'UNLOADED').step_status, 'UNLOADED')

    def test_seal_mismatch_flags_damaged_and_blocks_unloading(self):
        t = self._loaded()
        att.add_attachments(t, 'DELIVERY', [png()])
        qr.scan_package(self.pk[0], 'DELIVERY', seal_seen='SL-1')
        bad = qr.scan_package(self.pk[1], 'DELIVERY', seal_seen='SL-999')
        qr.scan_package(self.pk[2], 'DELIVERY', seal_seen='SL-3')
        self.assertEqual(bad['result'], 'FAIL')
        self.assertEqual(bad['package']['status'], PackageStatus.DAMAGED)
        self.assertTrue(t.event_logs.filter(event_type='SEAL_ALERT').exists())
        with self.assertRaisesMessage(ValidationError, 'sai seal'):
            wf.advance(t, 'UNLOADED')
        # điều vận xử lý ngoại lệ có lý do
        self.assertEqual(wf.advance(t, 'UNLOADED', user=self.staff, force=True, reason='Đã chụp biên bản kiện rách').step_status, 'UNLOADED')

    def test_scan_guards(self):
        with self.assertRaises(ValidationError):
            qr.scan_package(self.pk[0], 'DELIVERY')  # chưa bốc lên xe
        qr.scan_package(self.pk[0], 'PICKUP')
        again = qr.scan_package(self.pk[0], 'PICKUP')
        self.assertEqual(again['result'], 'WARN')  # quét lặp chỉ cảnh báo
        with self.assertRaises(ValidationError):
            qr.scan_package(self.pk[0], 'LATER')

    def test_cannot_add_packages_after_pickup_and_scan_log_written(self):
        qr.scan_package(self.pk[0], 'PICKUP', actor_label='kho')
        from apps.qr_tracking.models import QRScanLog
        self.assertTrue(QRScanLog.objects.filter(target_type='PACKAGE', target_id=self.pk[0].pk, actor_label='kho').exists())
        t = wf.advance(DispatchTrip.objects.get(pk=self.t.pk), 'ARRIVED_AT_PICKUP')
        att.add_attachments(t, 'PICKUP', [png()])
        qr.scan_package(self.pk[1], 'PICKUP'); qr.scan_package(self.pk[2], 'PICKUP')
        wf.advance(t, 'LOADED_ON_VEHICLE')
        with self.assertRaises(ValidationError):
            qr.add_packages(self.t, [{'seal_number': 'SL-9'}])


@override_settings(MEDIA_ROOT=MEDIA)
class DepotTests(GssBase):
    def setUp(self):
        super().setUp()
        self.yard = depot.default_yard()

    def gin(self, cont='CSQU3054383', **kw):
        return depot.gate_in(self.yard, {'container_number': cont, 'in_vehicle_plate': '51c-111.11', 'cargo_status': 'FULL', **kw}, label='thu bai')

    def test_gate_in_links_trip_and_blocks_duplicate(self):
        t = self.trip()
        m, _ = self.gin()
        self.assertEqual(m.trip_id, t.pk)
        self.assertEqual(m.subcontractor_id, self.sub.pk)
        self.assertEqual(m.in_vehicle_plate, '51C-111.11')
        with self.assertRaisesMessage(ValidationError, 'đang nằm trong bãi'):
            self.gin()

    def test_validation_errors(self):
        for data in ({'container_number': '', 'in_vehicle_plate': 'x'}, {'container_number': 'ABCU1234567'},
                     {'container_number': 'ABCU1234567', 'in_vehicle_plate': '51C', 'cargo_status': 'HALF'},
                     {'container_number': 'ABCU1234567', 'in_vehicle_plate': '51C', 'gate_in_at': (timezone.now() + datetime.timedelta(days=1)).isoformat()}):
            with self.assertRaises(ValidationError):
                depot.gate_in(self.yard, data)

    def test_gate_out_rules_and_reentry(self):
        m, _ = self.gin()
        with self.assertRaisesMessage(ValidationError, 'mục đích'):
            depot.gate_out(m, {'out_vehicle_plate': '51C-222.22'})
        with self.assertRaisesMessage(ValidationError, 'biển số'):
            depot.gate_out(m, {'out_purpose': 'DELIVER'})
        with self.assertRaisesMessage(ValidationError, 'trước giờ đến'):
            depot.gate_out(m, {'out_vehicle_plate': 'x', 'out_purpose': 'DELIVER', 'gate_out_at': (m.gate_in_at - datetime.timedelta(hours=1)).isoformat()})
        m = depot.gate_out(m, {'out_vehicle_plate': '51c-222.22', 'out_purpose': 'RETURN_EMPTY', 'out_driver_name': 'B'})
        self.assertEqual((m.status, m.out_vehicle_plate), (MovementStatus.DEPARTED, '51C-222.22'))
        with self.assertRaisesMessage(ValidationError, 'đã rời bãi'):
            depot.gate_out(m, {'out_vehicle_plate': 'x', 'out_purpose': 'DELIVER'})
        self.gin()  # cùng cont có thể vào bãi lại sau khi đã ra

    def test_stats_and_storage_days(self):
        self.gin('CSQU3054383', gate_in_at=(timezone.now() - datetime.timedelta(days=3)).isoformat())
        self.gin('MSKU0000000', cargo_status='EMPTY', in_vehicle_plate='51C-333.33')
        s = depot.stats(self.yard)
        self.assertEqual((s['in_yard'], s['full'], s['empty'], s['in_today']), (2, 1, 1, 1))
        old = depot.DepotContainerMovement.objects.get(container_number='CSQU3054383')
        self.assertEqual(old.storage_days, 4)  # tính cả ngày đầu

    def test_photos_limit_ten(self):
        m, _ = self.gin()
        depot.add_photos(m, 'IN', [png(f'{i}.png') for i in range(9)])
        with self.assertRaisesMessage(ValidationError, 'còn nhận thêm được 1'):
            depot.add_photos(m, 'IN', [png('a.png'), png('b.png')])
        depot.add_photos(m, 'OUT', [png('c.png')])  # Gate-out đếm riêng


class DashboardTests(GssBase):
    def test_matrix_numbers_equal_list_sizes(self):
        a = self.run_to(self.trip(1), 'EMPTY_RETURNED')
        b = self.run_to(self.trip(2, cont='MSKU0000000'), 'LOADED_ON_VEHICLE')
        self.trip(3, cont='TGHU0000000')
        # DEM của b quá hạn để có cảnh báo
        DispatchTrip.objects.filter(pk=self.trip(3, cont='TGHU0000000').pk).update(det_expiry_date=datetime.date.today() - datetime.timedelta(days=1))
        data = dash.dashboard()
        row = data['matrix'][0]
        self.assertEqual((row['total'], row['pending'], row['received'], row['delivering'], row['returned']), (3, 0, 2, 1, 1))
        for metric in dash.METRICS:
            self.assertEqual(dash.trips_for(self.sub.pk, metric).count(), row[metric], metric)
        self.assertEqual(row['alert'], 1)
        self.assertEqual(data['kpi']['progress']['received'], 2)

    def test_pending_counts_missing_rows(self):
        self.trip(1)
        self.assertEqual(dash.dashboard()['matrix'][0]['pending'], 2)

    def test_swapped_metric(self):
        t = self.run_to(self.trip(), 'RETURNING_EMPTY')
        att.add_attachments(t, 'EMPTY_RETURN', [png()])
        wf.advance(t, 'EMPTY_RETURNED', swap={'new_number': 'MSKU1111110', 'reason': 'đổi vỏ'})
        self.assertEqual(dash.dashboard()['matrix'][0]['swapped'], 1)


@override_settings(MEDIA_ROOT=MEDIA)
class ApiTests(GssBase):
    def token_url(self, trip, tail=''):
        return f'/api/qr/t/{msg.trip_token(trip)}/{tail}'

    def test_driver_token_flow_without_login(self):
        t = self.trip()
        info = self.client.get(self.token_url(t)).json()['data']
        self.assertEqual(info['container_number'], 'CSQU3054383')
        self.assertEqual(info['destination_notes'], 'Cổng 3')
        self.assertNotIn('customer', info)
        self.assertNotIn('Khách', str(info))
        self.assertEqual(info['action']['to'], 'ARRIVED_AT_PICKUP')
        r = self.client.post(self.token_url(t, 'step/'), {'to': 'ARRIVED_AT_PICKUP'}, content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        r = self.client.post(self.token_url(t, 'step/'), {'to': 'LOADED_ON_VEHICLE'}, content_type='application/json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('chứng từ', r.json()['message'])
        up = self.client.post(self.token_url(t, 'attachments/'), {'stage': 'PICKUP', 'files': [png('1.png'), png('2.png')]})
        self.assertEqual(up.status_code, 201, up.content)
        self.assertEqual(up.json()['counts']['PICKUP'], 2)
        r = self.client.post(self.token_url(t, 'step/'), {'to': 'LOADED_ON_VEHICLE'}, content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        # tài xế gửi force/lùi bước vẫn bị từ chối
        r = self.client.post(self.token_url(t, 'step/'), {'to': 'READY', 'force': True, 'reason': 'xxxxxxx'}, content_type='application/json')
        self.assertEqual(r.status_code, 400)

    def test_bad_token_404_and_revoked_by_version(self):
        t = self.trip()
        self.assertEqual(self.client.get('/api/qr/t/T1.AAAAAAAAAAAAAAAA/').status_code, 404)
        old = msg.trip_token(t)
        t.qr_version += 1
        t.save()
        self.assertEqual(self.client.get(f'/api/qr/t/{old}/').status_code, 404)

    def test_finished_trip_is_read_only_for_driver(self):
        t = self.run_to(self.trip(), 'EMPTY_RETURNED')
        self.assertEqual(self.client.post(self.token_url(t, 'attachments/'), {'stage': 'PICKUP', 'files': [png()]}).status_code, 409)
        self.assertEqual(self.client.post(self.token_url(t, 'step/'), {'to': 'READY'}, content_type='application/json').status_code, 409)
        self.assertEqual(self.client.get(self.token_url(t)).status_code, 200)  # vẫn xem được

    def test_package_scan_requires_login_or_matching_trip_token(self):
        t = self.trip()
        p = qr.add_packages(t, [{'seal_number': 'S1'}])[0]
        url = f'/api/qr/p/{qr.package_token(p)}/scan/'
        self.assertEqual(self.client.post(url, {'phase': 'PICKUP'}, content_type='application/json').status_code, 403)
        other = self.trip(2, cont='MSKU0000000')
        self.assertEqual(self.client.post(url, {'phase': 'PICKUP', 'trip_token': msg.trip_token(other)}, content_type='application/json').status_code, 403)
        ok = self.client.post(url, {'phase': 'PICKUP', 'trip_token': msg.trip_token(t)}, content_type='application/json')
        self.assertEqual(ok.status_code, 200, ok.content)

    def test_staff_api_requires_login(self):
        t = self.trip()
        for url in ('/api/gss/dashboard/', '/api/gss/trips/', f'/api/gss/trips/{t.trip_code}/', '/api/depot/stats/', '/api/depot/movements/'):
            self.assertIn(self.client.get(url).status_code, (401, 403), url)
        self.assertIn(self.client.get(f'/api/gss/trips/{t.trip_code}/pod/').status_code, (401, 403))

    def test_staff_endpoints_end_to_end(self):
        t = self.trip()
        self.client.force_login(self.staff)
        d = self.client.get('/api/gss/dashboard/').json()['data']
        self.assertEqual(d['matrix'][0]['total'], 3)
        lst = self.client.get(f'/api/gss/trips/?vendor={self.sub.pk}&metric=all').json()
        self.assertEqual(lst['total'], 1)
        self.assertEqual(lst['results'][0]['docs'], {'PICKUP': 0, 'DELIVERY': 0, 'EMPTY_RETURN': 0})
        pend = self.client.get('/api/gss/trips/?metric=pending').json()['pending']
        self.assertEqual(pend[0]['missing'], 2)
        detail = self.client.get(f'/api/gss/trips/{t.trip_code}/').json()['data']
        self.assertEqual(detail['destination_notes'], 'Cổng 3')
        self.assertEqual(detail['action']['to'], 'ARRIVED_AT_PICKUP')
        r = self.client.post(f'/api/gss/trips/{t.trip_code}/step/', {'to': 'UNLOADED', 'force': True}, content_type='application/json')
        self.assertEqual(r.status_code, 400)  # thiếu lý do
        r = self.client.post(f'/api/gss/trips/{t.trip_code}/step/', {'to': 'UNLOADED', 'force': True, 'reason': 'Ngoại lệ có biên bản'}, content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        up = self.client.post(f'/api/gss/trips/{t.trip_code}/attachments/', {'stage': 'DELIVERY', 'files': [png()]})
        self.assertEqual(up.status_code, 201)
        doc_id = up.json()['attachments'][0]['id']
        self.assertEqual(self.client.delete(f'/api/gss/trips/{t.trip_code}/attachments/{doc_id}/', {'reason': 'x'}, content_type='application/json').status_code, 400)
        self.assertEqual(self.client.delete(f'/api/gss/trips/{t.trip_code}/attachments/{doc_id}/', {'reason': 'chụp nhầm ảnh'}, content_type='application/json').status_code, 200)
        pod = self.client.get(f'/api/gss/trips/{t.trip_code}/pod/')
        self.assertEqual(pod.status_code, 200)
        self.assertIn('text/html', pod['Content-Type'])
        self.assertIn('<svg', self.client.get(f'/api/gss/trips/{t.trip_code}/qr.svg').content.decode())
        pk = self.client.post(f'/api/gss/trips/{t.trip_code}/packages/', {'count': 3, 'seal_prefix': 'SL-', 'seal_start': 1}, content_type='application/json')
        self.assertEqual(pk.status_code, 400)  # chuyến đã giao, không thêm kiện nữa
        m = self.client.post(f'/api/gss/trips/{t.trip_code}/message/', {'channel': 'ZALO'}, content_type='application/json')
        self.assertEqual(m.status_code, 201)
        self.assertIn(t.trip_code, m.json()['log']['content'])
        self.assertEqual(self.client.post(f'/api/gss/trips/{t.trip_code}/message/', {'channel': 'FAX'}, content_type='application/json').status_code, 400)
        res = self.client.get('/api/gss/resolve/', {'token': f'https://x/q/{msg.trip_token(t)}/'}).json()
        self.assertEqual((res['type'], res['trip_code']), ('TRIP', t.trip_code))
        self.assertEqual(self.client.get('/api/gss/resolve/', {'token': 'T1.AAAAAAAAAAAAAAAA'}).status_code, 404)
        labels = self.client.get(f'/api/gss/trips/{t.trip_code}/labels/')
        self.assertIn('Tem QR', labels.content.decode())

    def test_depot_api(self):
        self.client.force_login(self.staff)
        r = self.client.post('/api/depot/movements/', {'container_number': 'CSQU3054383', 'in_vehicle_plate': '51C-1', 'cargo_status': 'FULL'}, content_type='application/json')
        self.assertEqual(r.status_code, 201, r.content)
        mid = r.json()['data']['id']
        dup = self.client.post('/api/depot/movements/', {'container_number': 'CSQU3054383', 'in_vehicle_plate': '51C-1'}, content_type='application/json')
        self.assertEqual(dup.status_code, 400)
        self.assertEqual(self.client.get('/api/depot/stats/').json()['data']['in_yard'], 1)
        ph = self.client.post(f'/api/depot/movements/{mid}/photos/', {'phase': 'IN', 'files': [png()]})
        self.assertEqual(ph.status_code, 201, ph.content)
        lk = self.client.get('/api/depot/lookup/', {'container': 'csqu 3054383'}).json()
        self.assertEqual(lk['in_yard']['id'], mid)
        out = self.client.post(f'/api/depot/movements/{mid}/gate-out/', {'out_vehicle_plate': '51C-2', 'out_purpose': 'DELIVER'}, content_type='application/json')
        self.assertEqual(out.status_code, 200, out.content)
        self.assertEqual(self.client.get('/api/depot/movements/?status=DEPARTED').json()['total'], 1)
        self.assertEqual(self.client.get('/api/depot/movements/?status=IN_YARD').json()['total'], 0)

    def test_features_off_block_everything(self):
        t = self.trip()
        tok = msg.trip_token(t)
        p = CompanyProfile.get_default_company()
        p.business_model = 'INTERNAL_FLEET_PNL'
        p.save()
        self.client.force_login(self.staff)
        for url in ('/api/gss/dashboard/', '/api/depot/stats/', f'/api/qr/t/{tok}/', f'/q/{tok}/'):
            self.assertEqual(self.client.get(url).status_code, 403, url)

    def test_pages_render(self):
        t = self.trip()
        self.assertEqual(self.client.get(f'/q/{msg.trip_token(t)}/').status_code, 200)
        self.assertEqual(self.client.get('/gss/').status_code, 404)  # không còn trang riêng: GSS nằm trong khung chính
        self.client.force_login(self.staff)
        page = self.client.get('/')
        self.assertEqual(page.status_code, 200)
        for js in ('common.js', 'console.js', 'booking.js', 'master.js'):
            self.assertContains(page, js)
        self.assertContains(page, 'id="view-gss"')
        self.assertContains(page, 'id="gss-subnav"')


@override_settings(MEDIA_ROOT=MEDIA, DEBUG=True)
class CommandTests(TestCase):
    def test_init_and_seed_demo_run_and_are_idempotent(self):
        from django.core.management import call_command
        call_command('init_gss', verbosity=0)
        co = CompanyProfile.get_default_company()
        self.assertEqual((co.business_model, co.tax_code, co.bank_account_number), ('GSS_VENDOR_DEPOT_QR', '', ''))
        self.assertTrue(PodTemplate.objects.filter(code='MAC_DINH', is_default=True).exists())
        call_command('seed_gss_demo', verbosity=0)
        n = DispatchTrip.objects.count()
        self.assertGreaterEqual(n, 8)
        call_command('seed_gss_demo', verbosity=0)
        self.assertEqual(DispatchTrip.objects.count(), n)
        data = dash.dashboard()
        self.assertEqual(len(data['matrix']), 3)
        self.assertGreaterEqual(data['kpi']['alerts']['count'], 1)
        self.assertEqual(data['kpi']['yard']['in_yard'], 2)


class PodTemplateApiTests(GssBase):
    def test_crud_sanitize_assign_and_print(self):
        self.client.force_login(self.staff)
        body = {'code': 'mau kh1', 'name': 'Mẫu KH1', 'body_html': '<p onclick="x()">{{ container_number }}</p><script>1</script>', 'is_default': True}
        r = self.client.post('/api/gss/pod-templates/', body, content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        tid = r.json()['data']['id']
        saved = PodTemplate.objects.get(pk=tid)
        self.assertNotIn('script', saved.body_html)
        self.assertNotIn('onclick', saved.body_html)
        self.assertEqual(saved.code, 'MAU KH1')
        self.assertEqual(self.client.post('/api/gss/pod-templates/', {'code': 'MAU KH1', 'name': 'x', 'body_html': 'y'}, content_type='application/json').status_code, 400)
        prev = self.client.get(f'/api/gss/pod-templates/{tid}/preview/')
        self.assertIn('CSQU3054383', prev.content.decode())
        ok = self.client.put(f'/api/gss/customers/{self.customer.pk}/pod-template/', {'template_id': tid}, content_type='application/json')
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(self.client.delete(f'/api/gss/pod-templates/{tid}/').status_code, 400)  # đang gán
        t = self.trip()
        self.assertIn('CSQU3054383', self.client.get(f'/api/gss/trips/{t.trip_code}/pod/').content.decode())
        listing = self.client.get('/api/gss/pod-templates/').json()
        self.assertEqual(listing['customers'][0]['pod_template_id'], tid)

    def test_non_admin_cannot_write_templates(self):
        user = get_user_model().objects.create_user('nv', 'n@x.vn', 'pw-Test-12345')
        self.client.force_login(user)
        r = self.client.post('/api/gss/pod-templates/', {'code': 'A', 'name': 'B', 'body_html': 'C'}, content_type='application/json')
        self.assertIn(r.status_code, (401, 403))


class BookingApiTests(GssBase):
    def setUp(self):
        super().setUp()
        self.client.force_login(self.staff)

    def payload(self, **kw):
        return {'customer_id': self.customer.pk, 'booking_number': 'abc123', 'shipping_line': 'one', 'container_size': '40HC', 'total_containers': 4,
                'pickup_loc_id': self.loc.pk, 'delivery': 'Kho B', 'loading_date': '2026-11-10', 'dem_start_date': '2026-11-10', 'free_time_demurrage': 5,
                'det_start_date': '2026-11-10', 'free_time_detention': 7, 'destination_notes': 'Gọi trước', **kw}

    def post(self, **kw):
        return self.client.post('/api/gss/bookings/', self.payload(**kw), content_type='application/json')

    def test_create_list_detail(self):
        r = self.post()
        self.assertEqual(r.status_code, 201, r.content)
        d = r.json()['data']
        self.assertRegex(d['code'], r'^BK\.\d{4}\.\d{3}$')
        self.assertEqual((d['booking_number'], d['shipping_line'], d['pickup_location'], d['delivery_location']), ('ABC123', 'ONE', 'KHO A', 'KHO B'))
        self.assertEqual(d['dem']['expiry'], '2026-11-14')  # 5 ngày: bắt đầu + 4
        self.assertEqual(self.client.get('/api/gss/bookings/?q=abc123').json()['total'], 1)
        self.assertEqual(self.client.get('/api/gss/bookings/?q=khong-co').json()['total'], 0)
        detail = self.client.get(f"/api/gss/bookings/{d['id']}/").json()['data']
        self.assertEqual(detail['unallocated'], 4)
        self.assertEqual(detail['allocations'], [])

    def test_validation(self):
        for bad in ({'customer_id': 9999}, {'total_containers': 0}, {'total_containers': 501}, {'loading_date': '10/11/2026'},
                    {'selling_freight_price': -1}, {'booking_type': 'X'}, {'free_time_demurrage': 999}, {'pickup_loc_id': None, 'pickup': '', 'delivery': ''}):
            self.assertEqual(self.post(**bad).status_code, 400, bad)

    def test_cannot_shrink_below_allocated_and_cancel_running(self):
        b = BookingOrder.objects.get(booking_code='BK.1')  # đã chia 3/5 ở setUp
        url = f'/api/gss/bookings/{b.pk}/'
        self.assertEqual(self.client.put(url, {'total_containers': 2}, content_type='application/json').status_code, 400)
        self.assertEqual(self.client.put(url, {'total_containers': 3}, content_type='application/json').status_code, 200)
        t = self.run_to(self.trip(), 'LOADED_ON_VEHICLE')
        self.assertEqual(self.client.put(url, {'status': 'CANCELLED'}, content_type='application/json').status_code, 400)

    def test_dem_det_changes_propagate_to_unfinished_trips(self):
        b = BookingOrder.objects.get(booking_code='BK.1')
        loaded = self.run_to(self.trip(1), 'LOADED_ON_VEHICLE')
        ready = self.trip(2, cont='MSKU0000000')
        r = self.client.put(f'/api/gss/bookings/{b.pk}/', {'dem_start_date': '2027-01-01', 'det_start_date': '2027-01-01', 'free_time_demurrage': 3, 'free_time_detention': 4},
                            content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        loaded.refresh_from_db(); ready.refresh_from_db()
        self.assertEqual(ready.dem_expiry_date, datetime.date(2027, 1, 3))
        self.assertEqual(loaded.dem_expiry_date, datetime.date.today() + datetime.timedelta(days=6))  # DEM đã khép sau khi lấy cont
        self.assertEqual(loaded.det_expiry_date, datetime.date(2027, 1, 4))  # DET vẫn theo dõi tới khi trả vỏ

    def test_alert_filter_and_documents(self):
        self.post(dem_start_date='2020-01-01', free_time_demurrage=3)
        self.assertEqual(self.client.get('/api/gss/bookings/?alert=1').json()['total'] >= 1, True)
        self.assertTrue(all(r['dem']['level'] in ('warn', 'overdue') or r['det']['level'] in ('warn', 'overdue')
                            for r in self.client.get('/api/gss/bookings/?alert=1').json()['results']))
        b = BookingOrder.objects.get(booking_code='BK.1')
        up = self.client.post(f'/api/gss/bookings/{b.pk}/documents/', {'files': [png('a.png'), png('b.png')]})
        self.assertEqual(up.status_code, 201, up.content)
        docs = up.json()['data']['documents']
        self.assertEqual(len(docs), 2)
        over = self.client.post(f'/api/gss/bookings/{b.pk}/documents/', {'files': [png(f'{i}.png') for i in range(9)]})
        self.assertEqual(over.status_code, 400)
        rm = self.client.delete(f"/api/gss/bookings/{b.pk}/documents/{docs[0]['id']}/")
        self.assertEqual(len(rm.json()['data']['documents']), 1)

    def test_requires_login(self):
        self.client.logout()
        self.assertIn(self.client.get('/api/gss/bookings/').status_code, (401, 403))

    def test_root_is_main_shell_without_hai_quan(self):
        r = self.client.get('/')
        self.assertEqual(r.status_code, 200)
        html = r.content.decode()
        self.assertIn('Bãi & Phương Tiện', html)
        self.assertIn('Điều vận & Vendor', html)
        self.assertNotIn('Dịch vụ Hải quan</span>', html)
        self.assertEqual(self.client.get('/dashboard/').status_code, 200)
