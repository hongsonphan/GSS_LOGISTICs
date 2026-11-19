"""Giả lập vòng đời Booking → phân bổ nhà xe → chuyến → hủy/xóa (rà soát tính năng 17–19/11/2026)."""
from django.test import override_settings

from apps.customers.models import BookingOrder
from apps.dispatch import vendor_service as vsvc
from apps.dispatch.gss_workflow import available_action, step_labels_for
from apps.dispatch.models import BookingVendorAllocation, DispatchTrip
from apps.dispatch.test_gss import MEDIA, GssBase
from apps.gss import containers as cont
from apps.gss.models import BookingContainer


@override_settings(MEDIA_ROOT=MEDIA)
class LifecycleTests(GssBase):
    def login(self):
        self.client.force_login(self.staff)

    def test_delete_ready_trip_frees_line_and_counters(self):
        t = self.trip()
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.dispatched_containers, 1)
        self.login()
        r = self.client.delete(f'/api/trips/{t.trip_code}/')
        self.assertEqual(r.status_code, 200, r.content)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.dispatched_containers, 0)
        t.refresh_from_db()
        self.assertTrue(t.is_deleted)
        # dòng 1 được dùng lại với cont khác
        t2 = self.trip()
        self.assertNotEqual(t2.pk, t.pk)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.dispatched_containers, 1)

    def test_cannot_delete_trip_after_it_started(self):
        t = self.run_to(self.trip(), 'ARRIVED_AT_PICKUP')
        self.login()
        r = self.client.delete(f'/api/trips/{t.trip_code}/')
        self.assertEqual(r.status_code, 400)
        t.refresh_from_db()
        self.assertFalse(t.is_deleted)

    def test_booking_delete_blocked_by_trip_then_allowed_and_cascades(self):
        t = self.trip()
        self.login()
        url = f'/api/bookings/{self.booking.pk}/'
        self.assertEqual(self.client.delete(url).status_code, 400)
        self.assertEqual(self.client.delete(f'/api/trips/{t.trip_code}/').status_code, 200)
        r = self.client.delete(url)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(BookingOrder.objects.filter(pk=self.booking.pk, is_deleted=False).exists())
        self.assertFalse(BookingVendorAllocation.objects.filter(booking=self.booking, is_deleted=False).exists())
        # link nhà xe của booking đã xóa không còn dùng được
        self.client.logout()
        self.assertIn(self.client.get(f'/api/vendor/{self.raw}/').status_code, (403, 404, 410))

    def test_container_remove_resizes_allocation(self):
        rows = [{'raw': n, 'source_line': i + 1} for i, n in enumerate(('CSQU3054383', 'MSKU0000000', 'TEMU6000003'))]
        cont.import_containers(self.booking, rows, skip_invalid=True)
        ids = list(BookingContainer.objects.filter(booking=self.booking, is_deleted=False).values_list('id', flat=True))
        self.assertGreaterEqual(len(ids), 1)
        sub = self.sub
        cont.assign(self.booking, ids, sub)
        a = BookingVendorAllocation.objects.filter(booking=self.booking, subcontractor=sub, is_deleted=False).order_by('-id').first()
        before = a.containers.filter(is_deleted=False).count()
        c = BookingContainer.objects.get(pk=ids[0])
        cont.remove_container(c)
        a.refresh_from_db()
        self.assertEqual(a.containers.filter(is_deleted=False).count(), before - 1)
        self.assertLessEqual(a.allocated_containers, before)

    def test_unknown_url_404_and_admin_redirect(self):
        self.assertEqual(self.client.get('/khong-ton-tai-xyz/').status_code, 404)
        r = self.client.get('/admin')
        self.assertIn(r.status_code, (301, 302))
        self.assertEqual(self.client.get('/login').status_code, 301)

    def test_step_labels_per_shipment_type(self):
        for st in ('IMPORT', 'EXPORT', 'DOMESTIC', None, 'xyz'):
            labels = step_labels_for(st)
            self.assertEqual(len(labels), 8, st)
        t = self.trip()
        self.assertEqual(available_action(t)['label'], step_labels_for(t.shipment_type)['ARRIVED_AT_PICKUP'])

    def test_expired_driver_link_is_not_served_raw_404_page(self):
        """V1 backlog: link hết hạn phải báo rõ cho tài xế (hiện 404 trần)."""
        t = self.trip()
        from apps.dispatch import gss_messages as msg
        tok = msg.trip_token(t)
        self.login()
        self.client.post(f'/api/vendor-admin/driver-links/{t.id}/', {'action': 'revoke'}, content_type='application/json')
        self.client.logout()
        r = self.client.get(f'/q/{tok}/')
        self.assertIn(r.status_code, (200, 404, 410))
        if r.status_code == 404:
            self.assertContains(r, 'hết hạn', status_code=404)
