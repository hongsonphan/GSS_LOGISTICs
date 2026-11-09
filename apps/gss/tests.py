"""Kiểm thử nghiệp vụ GSS theo đặc tả 08/11/2026 (B/L + danh sách cont, phân bổ theo cont, cổng nhà xe, biểu giá,
chi hộ + hoá đơn, bảng kê + sổ cái, street-turn, phiếu giao hàng theo điểm giao, chứng từ tên chuẩn, quyền)."""
import datetime
import io
import json
import zipfile
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from openpyxl import Workbook, load_workbook

from apps.dispatch import gss_attachments as att
from apps.dispatch import gss_messages as msg
from apps.dispatch import gss_workflow as wf
from apps.dispatch import vendor_service as vs
from apps.dispatch.models import DispatchTrip
from apps.dispatch.test_gss import MEDIA, GssBase, png
from apps.gss import claims as cl
from apps.gss import containers as cs
from apps.gss import pricing as pr
from apps.gss import statements as stm
from apps.gss.models import (BookingContainer, ChargeCode, CostClaim, EInvoice, FreeTimeRule, JobCharge, RateCard, RateLine,
                             Statement)
from apps.master_data.models import CompanyProfile, Subcontractor
from apps.personnel.models import Employee, EmployeeRole


def cont(owner, serial):
    """Số cont hợp lệ ISO 6346 (tính chữ số kiểm tra)."""
    base = f'{owner}{serial:06d}'
    for d in range(10):
        if vs.iso6346_valid(base + str(d)):
            return base + str(d)
    raise AssertionError('không tính được số kiểm tra')


C1, C2, C3, C4 = cont('MSCU', 123456), cont('TGHU', 100001), cont('CAIU', 200002), cont('TCNU', 300003)


def staff(username, role):
    u = User.objects.create_user(username, password='Pw-Gss#2026')
    Employee.objects.create(user=u, code=username.upper()[:10], full_name=f'NV {username}', role=role,
                            phone_number=f'09{abs(hash(username)) % 10**8:08d}', national_id='079123456789', bank_account='0123456789')
    return u


@override_settings(MEDIA_ROOT=MEDIA)
class Base(GssBase):
    def setUp(self):
        super().setUp()
        self.booking.mbl_number, self.booking.hbl_number = 'MBL777', 'HBL987654'
        self.booking.booking_type = 'IMPORT_FCL'
        self.booking.save()
        self.client.force_login(self.staff)
        self.sub.code = 'VND01'
        self.sub.save()
        self.sub2 = Subcontractor.objects.create(name='Nhà xe B', code='VND02')

    def api(self, method, url, body=None, **kw):
        fn = getattr(self.client, method)
        if body is not None and not kw.get('multipart'):
            return fn(url, json.dumps(body), content_type='application/json')
        kw.pop('multipart', None)
        return fn(url, body or {}, **kw)

    def import_conts(self, *numbers):
        r = self.api('post', f'/api/gss/bookings/{self.booking.id}/containers/', {'text': '\n'.join(f'{n}\t40HC\tSL{i}\t25000' for i, n in enumerate(numbers, 1))})
        self.assertEqual(r.status_code, 200, r.content)
        return {c.container_number: c for c in BookingContainer.objects.filter(booking=self.booking)}

    def assign(self, ids, sub):
        r = self.api('post', f'/api/gss/bookings/{self.booking.id}/containers/assign/', {'container_ids': ids, 'subcontractor_id': sub.id if sub else None})
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()


class ContainerListTests(Base):
    def test_paste_validates_each_row_and_two_phase(self):
        bad = 'MSCU1234560\n' + C1 + '\n' + C1 + '\nABC123'
        r = self.api('post', f'/api/gss/bookings/{self.booking.id}/containers/', {'text': bad, 'commit': '0'}).json()['data']
        self.assertEqual(r['errors'], 3)  # sai số kiểm tra, trùng, sai định dạng
        self.assertFalse(r['committed'])
        self.assertFalse(BookingContainer.objects.exists())
        r = self.api('post', f'/api/gss/bookings/{self.booking.id}/containers/', {'text': bad}).json()['data']
        self.assertFalse(r['committed'])  # có lỗi thì không ghi gì
        r = self.api('post', f'/api/gss/bookings/{self.booking.id}/containers/', {'text': f'{C1} 20GP SEAL9 18000\n{C2.lower()}'}).json()['data']
        self.assertTrue(r['committed'])
        c = BookingContainer.objects.get(container_number=C1)
        self.assertEqual((c.container_type, c.seal_number, str(c.gross_weight_kg)), ('20GP', 'SEAL9', '18000.00'))
        self.assertTrue(BookingContainer.objects.filter(container_number=C2).exists())
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.total_containers, 2)
        # nhập lại không tạo trùng, chỉ cập nhật
        r = self.api('post', f'/api/gss/bookings/{self.booking.id}/containers/', {'text': f'{C1} 40HC'}).json()['data']
        self.assertEqual((r['create'], r['update']), (0, 1))
        self.assertEqual(BookingContainer.objects.count(), 2)

    def test_excel_import(self):
        wb = Workbook()
        ws = wb.active
        ws.append(['Số cont', 'Loại', 'Seal', 'Kg'])
        ws.append([C3, '40HC', 'S1', 20000])
        ws.append([C4, '', '', None])
        buf = io.BytesIO()
        wb.save(buf)
        f = SimpleUploadedFile('c.xlsx', buf.getvalue())
        r = self.client.post(f'/api/gss/bookings/{self.booking.id}/containers/', {'file': f})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['data']['create'], 2)

    def test_free_time_rule_most_specific_wins(self):
        self.booking.shipping_line, self.booking.discharge_date, self.booking.dem_start_date = 'MSC', datetime.date(2026, 11, 1), None
        self.booking.save()
        FreeTimeRule.objects.create(name='MSC chung', shipping_line='MSC', kind='DEM', free_days=5, start_event='DISCHARGE')
        FreeTimeRule.objects.create(name='MSC khách 1', shipping_line='MSC', customer=self.customer, kind='DEM', free_days=10, start_event='DISCHARGE')
        FreeTimeRule.objects.create(name='Hãng khác', shipping_line='ONE', kind='DET', free_days=3)
        r = self.api('post', f'/api/gss/bookings/{self.booking.id}/apply-free-time/', {})
        self.assertEqual(r.status_code, 200, r.content)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.free_time_demurrage, 10)
        self.assertEqual(self.booking.dem_expiry, datetime.date(2026, 11, 10))

    def test_customs_refs(self):
        url = f'/api/gss/bookings/{self.booking.id}/customs/'
        self.assertEqual(self.api('post', url, {'number': '105123456789', 'channel': 'GREEN'}).status_code, 201)
        self.assertEqual(self.api('post', url, {'number': '105123456789'}).status_code, 400)
        self.assertEqual(self.api('post', url, {'number': '105999', 'channel': 'BLUE'}).status_code, 400)
        self.assertEqual(len(self.client.get(url).json()['data']), 1)


class AllocationByContainerTests(Base):
    def setUp(self):
        super().setUp()
        self.booking.total_containers = 0
        self.booking.save()
        self.c = self.import_conts(C1, C2, C3)

    def test_assign_vendor_rows_prefilled_and_trip_linked(self):
        out = self.assign([self.c[C1].id, self.c[C2].id], self.sub)
        link = self.client.post  # noqa
        alloc = BookingContainer.objects.get(container_number=C1).allocation
        self.assertIsNotNone(alloc)
        self.assertEqual(alloc.allocated_containers, 2)
        rows = vs.rows_for(alloc)
        self.assertEqual({r['container_number'] for r in rows}, {C1, C2})
        self.assertTrue(all(r['container_locked'] for r in rows))
        # nhà xe cố đổi số cont → bị ép lại số theo B/L; sinh chuyến và gắn vào cont
        line = next(r['line_no'] for r in rows if r['container_number'] == C1)
        res = vs.submit_rows(alloc, [{'line_no': line, 'container_number': C4, 'tractor_plate': '51C-123.45', 'driver_name': 'A', 'driver_phone': '0901234567'}])
        self.assertTrue(res['results'][0]['ok'], res)
        bc = BookingContainer.objects.get(container_number=C1)
        self.assertEqual(bc.trip.container_number, C1)
        self.assertEqual(bc.trip.container_type, '40HC')
        # biển số chuẩn hoá: 51C12345 trùng xe đã có
        line2 = next(r['line_no'] for r in rows if r['container_number'] == C2)
        vs.submit_rows(alloc, [{'line_no': line2, 'tractor_plate': '51C 12345'}])
        self.assertEqual(BookingContainer.objects.get(container_number=C2).trip.vehicle_id, bc.trip.vehicle_id)
        # đếm-số-lượng bị chặn khi có danh sách cont
        with self.assertRaises(ValidationError):
            vs.create_allocation(self.booking, self.sub2, 1)
        self.assertTrue(out['data']['progress']['allocated'] == 2)

    def test_change_vendor_rules(self):
        self.assign([self.c[C1].id, self.c[C2].id], self.sub)
        alloc = BookingContainer.objects.get(container_number=C1).allocation
        rows = {r['container_number']: r['line_no'] for r in vs.rows_for(alloc)}
        vs.submit_rows(alloc, [{'line_no': rows[C1], 'tractor_plate': '51C-111.11'}, {'line_no': rows[C2], 'tractor_plate': '51C-222.22'}])
        t1 = BookingContainer.objects.get(container_number=C1).trip
        t2 = BookingContainer.objects.get(container_number=C2).trip
        wf.advance(t2, 'ARRIVED_AT_PICKUP')
        out = self.assign([self.c[C1].id, self.c[C2].id], self.sub2)['data']
        self.assertEqual(len(out['changed']), 1)  # C1 (chuyến còn Sẵn sàng) đổi được
        self.assertEqual(len(out['errors']), 1)   # C2 đã chạy thì không
        t1.refresh_from_db()
        self.assertEqual(t1.step_status, 'CANCELLED')
        new = BookingContainer.objects.get(container_number=C1)
        self.assertEqual(new.allocation.subcontractor_id, self.sub2.id)
        self.assertIsNone(new.trip)
        old_rows = vs.rows_for(alloc)
        moved = [r for r in old_rows if r['container_number'] == C1]
        self.assertTrue(moved and not moved[0]['editable'])
        from core.models import AuditLog
        self.assertTrue(AuditLog.objects.filter(model_label='customers.bookingorder', changes__has_key='vendor_assignment').exists())
        self.assertTrue(AuditLog.objects.filter(model_label='dispatch.bookingvendorallocation', changes__event='GRANT').exists())

    def test_excel_two_phase_allocation(self):
        r = self.client.get(f'/api/gss/bookings/{self.booking.id}/allocation-template/')
        self.assertEqual(r.status_code, 200)
        wb = load_workbook(io.BytesIO(r.content))
        ws = wb['Phân bổ']
        for row in ws.iter_rows(min_row=2):
            if row[1].value == C1:
                row[6].value = 'VND01'
            if row[1].value == C2:
                row[6].value = 'VND02'
            if row[1].value == C3:
                row[6].value = 'NOPE'
        buf = io.BytesIO()
        wb.save(buf)
        url = f'/api/gss/bookings/{self.booking.id}/allocation-import/'
        p = self.client.post(url, {'file': SimpleUploadedFile('a.xlsx', buf.getvalue())}).json()['data']
        self.assertEqual(p['errors'], 1)
        self.assertIsNone(p['token'])
        ef = self.client.post(url + '?as=xlsx', {'file': SimpleUploadedFile('a.xlsx', buf.getvalue())})
        self.assertIn('spreadsheetml', ef['Content-Type'])
        ws['G4'].value = ''  # bỏ dòng lỗi
        for row in ws.iter_rows(min_row=2):
            if row[1].value == C3:
                row[6].value = None
        buf = io.BytesIO()
        wb.save(buf)
        p = self.client.post(url, {'file': SimpleUploadedFile('a.xlsx', buf.getvalue())}).json()['data']
        self.assertEqual((p['errors'], p['changes']), (0, 2))
        self.assertFalse(BookingContainer.objects.filter(allocation__isnull=False).exists())  # pha 1 không ghi
        c = self.api('post', url + 'commit/', {'token': p['token']})
        self.assertEqual(c.status_code, 200, c.content)
        self.assertEqual(BookingContainer.objects.get(container_number=C2).allocation.subcontractor.code, 'VND02')
        self.assertEqual(self.api('post', url + 'commit/', {'token': p['token']}).status_code, 400)  # dùng lại token
        p2 = self.client.post(url, {'file': SimpleUploadedFile('a.xlsx', buf.getvalue())}).json()['data']
        self.assertEqual(p2['changes'], 0)  # nhập lại không tạo trùng

    def test_file_of_other_booking_rejected(self):
        r = self.client.get(f'/api/gss/bookings/{self.booking.id}/allocation-template/')
        from apps.customers.models import BookingOrder
        other = BookingOrder.objects.create(booking_code='BK.2', customer=self.customer, pickup_location='X', delivery_location='Y')
        p = self.client.post(f'/api/gss/bookings/{other.id}/allocation-import/', {'file': SimpleUploadedFile('a.xlsx', r.content)})
        self.assertEqual(p.status_code, 400)


class VendorPortalTests(Base):
    def setUp(self):
        super().setUp()
        self.c = self.import_conts(C1, C2)
        out = self.assign([self.c[C1].id, self.c[C2].id], self.sub2)
        self.token = out['link'].rstrip('/').rsplit('/', 1)[-1]
        self.client.logout()

    def test_catalog_excel_and_readonly_after_finish(self):
        alloc = vs.allocation_by_token(self.token)
        r = self.client.get(f'/api/vendor/{self.token}/excel/')
        self.assertEqual(r.status_code, 200)
        wb = load_workbook(io.BytesIO(r.content))
        ws = wb.active
        for row in ws.iter_rows(min_row=2):
            row[5].value = f'51C-99{row[0].value}.00'
            row[7].value = 'Tài B'
            row[8].value = f'09012345{row[0].value}0'
        buf = io.BytesIO()
        wb.save(buf)
        up = self.client.post(f'/api/vendor/{self.token}/excel/', {'file': SimpleUploadedFile('x.xlsx', buf.getvalue())})
        self.assertEqual(up.status_code, 200, up.content)
        self.assertEqual(DispatchTrip.objects.filter(vendor_allocation=alloc, is_deleted=False).count(), 2)
        cat = self.client.get(f'/api/vendor/{self.token}/catalog/').json()['data']
        self.assertEqual(len(cat['tractors']), 2)
        self.assertEqual(len(cat['drivers']), 2)
        # hoàn tất mọi chuyến → chỉ xem, sau N ngày link đóng
        for t in DispatchTrip.objects.filter(vendor_allocation=alloc):
            self.run_to(t, 'EMPTY_RETURNED')
        data = self.client.get(f'/api/vendor/{self.token}/').json()['data']
        self.assertTrue(data['lifecycle']['finished'])
        self.assertTrue(all(not r['editable'] for r in data['rows']))
        put = self.client.put(f'/api/vendor/{self.token}/', json.dumps({'rows': [{'line_no': 1, 'vendor_note': 'x'}]}), content_type='application/json')
        self.assertEqual(put.status_code, 409)
        DispatchTrip.objects.filter(vendor_allocation=alloc).update(empty_returned_at=timezone.now() - datetime.timedelta(days=8))
        self.assertEqual(self.client.get(f'/api/vendor/{self.token}/').status_code, 404)

    def test_vendor_excel_of_other_allocation_rejected(self):
        wb = Workbook()
        wb.active.append(['STT'])
        buf = io.BytesIO()
        wb.save(buf)
        r = self.client.post(f'/api/vendor/{self.token}/excel/', {'file': SimpleUploadedFile('x.xlsx', buf.getvalue())})
        self.assertEqual(r.status_code, 409)


class PricingTests(Base):
    def setUp(self):
        super().setUp()
        pr.ensure_default_charge_codes()
        self.cuoc = ChargeCode.objects.get(code='CUOC')
        self.sell = RateCard.objects.create(code='KH1-2026', name='Giá KH1', side='SELL', customer=self.customer, valid_from=datetime.date(2026, 1, 1))
        RateLine.objects.create(card=self.sell, charge_code=self.cuoc, route_text='KHO A', container_type='40HC', unit='CONT', unit_price=Decimal('3500000'))
        generic = RateCard.objects.create(code='CHUNG', name='Giá chung', side='SELL', valid_from=datetime.date(2026, 1, 1))
        RateLine.objects.create(card=generic, charge_code=self.cuoc, unit='CONT', unit_price=Decimal('3000000'))
        self.buy = RateCard.objects.create(code='NX-A', name='Giá nhà xe A', side='BUY', subcontractor=self.sub, valid_from=datetime.date(2026, 1, 1))
        RateLine.objects.create(card=self.buy, charge_code=self.cuoc, unit='CONT', unit_price=Decimal('2800000'))
        for c in (self.sell, generic, self.buy):
            pr.approve(c, self.staff)

    def test_auto_apply_on_completion_and_snapshot(self):
        with self.captureOnCommitCallbacks(execute=True):
            t = self.run_to(self.trip(), 'EMPTY_RETURNED')
        lines = JobCharge.objects.filter(trip=t)
        sell = lines.get(side='SELL')
        self.assertEqual(sell.unit_price, Decimal('3500000'))  # bảng riêng của khách thắng bảng chung
        self.assertEqual(sell.snapshot['card'], 'KH1-2026')
        self.assertEqual(lines.get(side='BUY').amount, Decimal('2800000'))
        t.refresh_from_db()
        self.assertEqual((t.cached_revenue, t.subcontractor_cost), (Decimal('3500000'), Decimal('2800000')))
        # sổ cái chuyến ghi theo cước đã áp
        from apps.ledger.models import JournalEntry
        je = JournalEntry.objects.get(source_type='trip', source_id=str(t.pk))
        self.assertEqual(sum(ln.debit for ln in je.lines.all()), Decimal('6300000'))  # 3,5tr doanh thu + 2,8tr giá vốn

    def test_approved_card_immutable_versioning_and_overlap(self):
        r = self.api('put', f'/api/gss/rate-cards/{self.sell.id}/', {'code': 'X', 'name': 'Y', 'side': 'SELL', 'valid_from': '2026-01-01'})
        self.assertEqual(r.status_code, 400)
        v2 = self.api('post', f'/api/gss/rate-cards/{self.sell.id}/new-version/', {'valid_from': '2026-12-01'})
        self.assertEqual(v2.status_code, 201, v2.content)
        new = RateCard.objects.get(pk=v2.json()['data']['id'])
        self.assertEqual((new.version, new.lines.count()), (2, 1))
        ln = new.lines.first()
        self.api('put', f'/api/gss/rate-lines/{ln.id}/', {'charge_code_id': self.cuoc.id, 'unit': 'CONT', 'unit_price': 4000000, 'route_text': 'KHO A', 'container_type': '40HC'})
        self.assertEqual(self.api('post', f'/api/gss/rate-cards/{new.id}/approve/', {}).status_code, 200)
        self.sell.refresh_from_db()
        self.assertEqual(self.sell.valid_to, datetime.date(2026, 11, 30))
        dup = RateCard.objects.create(code='KH1-DUP', name='trùng', side='SELL', customer=self.customer, valid_from=datetime.date(2026, 6, 1))
        RateLine.objects.create(card=dup, charge_code=self.cuoc, unit='CONT', unit_price=1)
        with self.assertRaises(ValidationError):
            pr.approve(dup, self.staff)

    def test_manual_edit_needs_reason_and_twin_quantity(self):
        t = self.trip()
        DispatchTrip.objects.filter(pk=t.pk).update(container_number_2=C2)
        t = self.run_to(DispatchTrip.objects.get(pk=t.pk), 'EMPTY_RETURNED')
        sell = JobCharge.objects.get(trip=t, side='SELL')
        self.assertEqual(sell.quantity, Decimal('2'))
        r = self.api('put', f'/api/gss/job-lines/{sell.id}/', {'unit_price': 3600000})
        self.assertEqual(r.status_code, 400)
        r = self.api('put', f'/api/gss/job-lines/{sell.id}/', {'unit_price': 3600000, 'reason': 'Khách đồng ý phụ thu'})
        self.assertEqual(r.status_code, 200, r.content)
        t.refresh_from_db()
        self.assertEqual(t.cached_revenue, Decimal('7200000'))


class ClaimsInvoiceStatementTests(Base):
    def setUp(self):
        super().setUp()
        pr.ensure_default_charge_codes()
        self.nang = ChargeCode.objects.get(code='NANG')
        self.cuoc = ChargeCode.objects.get(code='CUOC')
        card = RateCard.objects.create(code='KH', name='KH', side='SELL', customer=self.customer, valid_from=datetime.date(2026, 1, 1))
        RateLine.objects.create(card=card, charge_code=self.cuoc, unit='CONT', unit_price=Decimal('1000000'))
        pr.approve(card, self.staff)
        self.t = self.trip()
        self.token = msg.trip_token(self.t)

    def test_driver_claim_requires_photo_then_review_and_invoice(self):
        self.client.logout()
        url = f'/api/qr/t/{self.token}/claims/'
        self.assertEqual(self.client.post(url, {'charge_code_id': self.nang.id, 'amount': '500000'}).status_code, 400)
        r = self.client.post(url, {'charge_code_id': self.nang.id, 'amount': '500000', 'description': 'Nâng Cát Lái', 'photo': png()})
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(self.client.get(f'/api/qr/t/{self.token}/').json()['data']['claims'])
        self.client.force_login(self.staff)
        claim = CostClaim.objects.get()
        qr_text = 'https://hoadon.example.vn/tracuu?mst=0312345678&khhdon=1C26TAA&shdon=0001234&matracuu=ABC'
        inv = self.api('post', f'/api/gss/claims/{claim.id}/invoice/', {'qr': qr_text, 'total_amount': '540000', 'buyer_name': 'Công ty khác'})
        self.assertEqual(inv.status_code, 201, inv.content)
        checks = inv.json()['data']['checks']
        self.assertFalse(checks['buyer_is_customer'])
        self.assertFalse(checks['amount_match'])
        # cùng hoá đơn khai cho chuyến khác → chặn
        t2 = self.trip(2, cont=C2)
        c2 = cl.submit_claim(t2, charge_code=self.nang, amount=500000, user=self.staff)
        r = self.api('post', f'/api/gss/claims/{c2.id}/invoice/', {'qr': qr_text})
        self.assertEqual(r.status_code, 400)
        self.assertIn('hai container', r.json()['message'])
        rv = self.api('post', f'/api/gss/claims/{claim.id}/review/', {'approve': True})
        self.assertEqual(rv.status_code, 200)
        lines = JobCharge.objects.filter(trip=self.t, source='CLAIM')
        self.assertEqual(set(lines.values_list('side', flat=True)), {'SELL', 'BUY'})

    def test_xml_parse_and_attach(self):
        xml = ('<?xml version="1.0" encoding="UTF-8"?><HDon><DLHDon><TTChung><KHMSHDon>1</KHMSHDon><KHHDon>C26TAA</KHHDon><SHDon>77</SHDon>'
               '<NLap>2026-11-03</NLap></TTChung><NDHDon><NBan><Ten>Cảng Cát Lái</Ten><MST>0300000001</MST></NBan><NMua><Ten>Khách &lt;b&gt;1&lt;/b&gt;</Ten>'
               '<MST></MST></NMua><TToan><TgTCThue>500000</TgTCThue><TgTThue>0</TgTThue><TgTTTBSo>500000</TgTTTBSo></TToan></NDHDon></DLHDon></HDon>').encode()
        data = cl.parse_xml(xml)
        self.assertEqual((data['series'], data['number'], data['total_amount']), ('1C26TAA', '77', '500000'))
        claim = cl.submit_claim(self.t, charge_code=self.nang, amount=500000, user=self.staff)
        r = self.client.post(f'/api/gss/claims/{claim.id}/invoice/', {'xml': SimpleUploadedFile('h.xml', xml, content_type='text/xml')})
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()['data']['checks']['buyer_is_customer'])
        self.assertTrue(r.json()['data']['checks']['amount_match'])
        with self.assertRaises(ValidationError):
            cl.parse_xml(b'<!DOCTYPE x [<!ENTITY a "b">]><HDon/>')

    def test_statements_sections_lock_ledger_and_no_double(self):
        claim = cl.submit_claim(self.t, charge_code=self.nang, amount=500000, user=self.staff)
        cl.review_claim(claim, approve=True, user=self.staff)
        self.run_to(DispatchTrip.objects.get(pk=self.t.pk), 'EMPTY_RETURNED')
        today = timezone.localdate()
        r = self.api('post', '/api/gss/statements/', {'side': 'CUSTOMER', 'party_id': self.customer.id,
                                                      'period_from': str(today - datetime.timedelta(days=1)), 'period_to': str(today)})
        self.assertEqual(r.status_code, 201, r.content)
        st = Statement.objects.get()
        sections = set(st.lines.values_list('section', flat=True))
        self.assertEqual(sections, {'FREIGHT', 'REIMBURSABLE'})
        self.assertEqual(Decimal(st.totals['reimbursable']), Decimal('500000'))
        dup = self.api('post', '/api/gss/statements/', {'side': 'CUSTOMER', 'party_id': self.customer.id, 'period_from': str(today), 'period_to': str(today)})
        self.assertEqual(dup.status_code, 400)  # dòng đã nằm trong bảng kê khác
        self.assertEqual(self.api('post', f'/api/gss/statements/{st.id}/lock/', {}).status_code, 200)
        from apps.ledger.models import JournalEntry
        je = JournalEntry.objects.get(source_type='gss_statement', source_id=str(st.id))
        self.assertTrue(je.lines.exists())
        sell_line = JobCharge.objects.get(trip=self.t, side='SELL', source='AUTO')
        self.assertEqual(self.api('put', f'/api/gss/job-lines/{sell_line.id}/', {'unit_price': 1, 'reason': 'thử sửa sau chốt'}).status_code, 400)
        x = self.client.get(f'/api/gss/statements/{st.id}/?as=xlsx')
        self.assertIn('spreadsheetml', x['Content-Type'])
        self.assertEqual(self.api('post', f'/api/gss/statements/{st.id}/cancel/', {}).status_code, 400)
        self.assertEqual(self.api('post', f'/api/gss/statements/{st.id}/cancel/', {'reason': 'Khách yêu cầu lập lại'}).status_code, 200)
        self.assertFalse(JournalEntry.objects.filter(source_type='gss_statement', source_id=str(st.id)).exists())
        vend = stm.create('VENDOR', self.sub, today, today, user=self.staff)
        self.assertEqual(set(vend.lines.values_list('section', flat=True)), {'REIMBURSABLE'})  # nhà xe: chi hộ đã ứng (chưa có giá mua)


class JourneyDocsTests(Base):
    def test_street_turn_closes_trip_without_empty_return(self):
        from apps.customers.models import BookingOrder
        exp = BookingOrder.objects.create(booking_code='BK.X', customer=self.customer, booking_type='EXPORT_FCL', pickup_location='A', delivery_location='B')
        t = self.run_to(self.trip(), 'UNLOADED')
        r = self.api('post', f'/api/gss/trips/{t.trip_code}/street-turn/', {'booking_id': exp.id, 'reason': 'Lệnh ST-01'})
        self.assertEqual(r.status_code, 200, r.content)
        t.refresh_from_db()
        self.assertTrue(t.is_street_turn)
        self.assertEqual((t.step_status, t.status), ('EMPTY_RETURNED', 'COMPLETED'))
        self.assertEqual(att.counts(t)['EMPTY_RETURN'], 0)
        card = self.client.get(f'/api/gss/trips/{t.trip_code}/card/').json()['data']
        self.assertEqual(card['street_turn']['booking'], 'BK.X')
        self.assertTrue(any(e['type'] == 'STREET_TURN' for e in card['timeline']))
        self.assertIn('finance', card)

    def test_checkpoint_and_camera_only_evidence(self):
        t = wf.advance(self.trip(), 'ARRIVED_AT_PICKUP')
        token = msg.trip_token(t)
        self.client.logout()
        r = self.client.post(f'/api/qr/t/{token}/checkpoint/', {'place': 'Kho Sóng Thần', 'lat': '10.9', 'lng': '106.7'})
        self.assertEqual(r.status_code, 201, r.content)
        lib = self.client.post(f'/api/qr/t/{token}/attachments/', {'stage': 'PICKUP', 'files': [png()], 'capture_source': 'library'})
        self.assertEqual(lib.status_code, 400)
        cam = self.client.post(f'/api/qr/t/{token}/attachments/', {'stage': 'PICKUP', 'files': [png()], 'capture_source': 'camera',
                                                                   'device_time': '2026-11-08T08:00:00+07:00', 'lat': '10.8', 'lng': '106.6'})
        self.assertEqual(cam.status_code, 201, cam.content)
        from apps.documents.models import TripDocument
        d = TripDocument.objects.get(trip=t)
        self.assertEqual(d.capture_meta['source'], 'camera')
        self.assertEqual(d.capture_meta['gps'], {'lat': 10.8, 'lng': 106.6})
        self.assertTrue(d.capture_meta['original'].startswith('/media/gss_docs/'))
        self.assertNotEqual(d.capture_meta['original'], d.file_path)  # bản phái sinh có dấu thời gian

    def test_standard_names_tree_and_zip(self):
        t = self.run_to(self.trip(), 'UNLOADED')
        r = self.client.get(f'/api/gss/bookings/{self.booking.id}/doc-tree/')
        self.assertEqual(r.status_code, 200, r.content[:300])
        tree = r.json()['data']
        self.assertTrue(tree)
        name = tree[0]['path']
        self.assertIn('/HBL987654/', name)
        self.assertIn('/Chung_Tu_Hanh_Trinh/HBL987654_CSQU3054383_VND01_EIR_', name)
        z = self.client.get(f'/api/gss/bookings/{self.booking.id}/doc-tree/?zip=1')
        self.assertEqual(z.status_code, 200)
        names = zipfile.ZipFile(io.BytesIO(z.content)).namelist()
        self.assertTrue(any('_POD_' in n for n in names))
        del t

    def test_delivery_note_per_stop_and_dispatch_order(self):
        from apps.master_data.models import Location
        loc2 = Location.objects.create(code='KHO2', name='KHO B')
        self.booking.total_containers = 0
        self.booking.save()
        c = self.import_conts(C1, C2)
        self.api('patch', f'/api/gss/containers/{c[C2].id}/', {'delivery_loc_id': loc2.id})
        self.assign([c[C1].id, c[C2].id], self.sub)
        alloc = BookingContainer.objects.get(container_number=C1).allocation
        vs.submit_rows(alloc, [{'line_no': r['line_no'], 'tractor_plate': f'51C-00{r["line_no"]}.11'} for r in vs.rows_for(alloc)])
        self.assertEqual(BookingContainer.objects.get(container_number=C2).trip.warehouse_location, 'KHO B')
        stops = self.client.get(f'/api/gss/bookings/{self.booking.id}/delivery-notes/').json()['data']['stops']
        self.assertEqual(len(stops), 2)
        key = next(s['key'] for s in stops if s['label'] == 'KHO B')
        r = self.api('post', f'/api/gss/bookings/{self.booking.id}/delivery-notes/', {'stop_key': key})
        self.assertEqual(r.status_code, 201, r.content)
        note = self.client.get(f'/api/gss/delivery-notes/{r.json()["data"]["id"]}/')
        body = note.content.decode()
        self.assertIn(C2, body)
        self.assertNotIn(C1, body)
        self.assertNotIn('<script', body.replace('<script', '', 0) if False else body.lower().replace('onclick', ''))
        order = self.client.get(f'/api/gss/bookings/{self.booking.id}/dispatch-order/').content.decode()
        self.assertIn('LỆNH ĐIỀU VẬN TỔNG', order)
        self.assertIn(C1, order)
        self.assertNotIn('3.500.000', order)  # không có giá cước

    def test_lookup_by_bl_and_container(self):
        t = self.trip()
        for q in ('HBL987654', t.container_number):
            res = self.client.get('/api/gss/lookup/', {'q': q}).json()['data']
            self.assertEqual(res[0]['booking_code'], 'BK.1', q)


class PermissionTests(Base):
    def test_role_matrix_for_new_modules(self):
        keeper = staff('thubai', EmployeeRole.YARD_KEEPER)
        acc = staff('ketoan', EmployeeRole.ACCOUNTANT)
        sales = staff('kinhdoanh', EmployeeRole.SALESMAN)
        self.client.force_login(keeper)
        for url in ('/api/gss/rate-cards/', '/api/gss/statements/', '/api/gss/claims/'):
            self.assertEqual(self.client.get(url).status_code, 403, url)
        self.assertEqual(self.client.get(f'/api/gss/bookings/{self.booking.id}/containers/').status_code, 200)  # Thủ bãi chỉ xem
        self.assertEqual(self.api('post', f'/api/gss/bookings/{self.booking.id}/containers/', {'text': C1}).status_code, 403)
        self.client.force_login(acc)
        for url in ('/api/gss/rate-cards/', '/api/gss/statements/', '/api/gss/claims/', '/api/gss/invoices/'):
            self.assertEqual(self.client.get(url).status_code, 200, url)
        self.client.force_login(sales)
        self.assertEqual(self.client.get('/api/gss/rate-cards/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/gss/bookings/{self.booking.id}/containers/').status_code, 200)
        self.assertEqual(self.client.get('/api/gss/statements/').status_code, 403)
        card = RateCard.objects.create(code='Z', name='Z', side='SELL', valid_from=datetime.date(2026, 1, 1))
        self.assertEqual(self.client.post(f'/api/gss/rate-cards/{card.id}/approve/').status_code, 403)  # KD không duyệt giá

    def test_driver_and_vendor_pages_never_show_finance(self):
        pr.ensure_default_charge_codes()
        t = self.run_to(self.trip(), 'UNLOADED')
        self.client.logout()
        body = self.client.get(f'/api/qr/t/{msg.trip_token(t)}/').content.decode()
        for word in ('unit_price', 'cached_revenue', 'subcontractor_cost', 'finance'):
            self.assertNotIn(word, body)
