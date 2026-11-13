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
        self.assertEqual(r['errors'], 2)  # trùng, sai định dạng; sai số kiểm tra là warning (không chặn nhập)
        self.assertEqual(r['warnings'], 1)
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

    def test_catalog_post_persists_per_vendor_and_isolates(self):
        from apps.fleet.models import Vehicle
        from apps.master_data.models import SubcontractorDriver, SubcontractorTrailer

        # 1. Tạo mới đầu kéo, rơ-moóc, tài xế qua POST catalog cho self.sub2
        r_tr = self.api('post', f'/api/vendor/{self.token}/catalog/', {'kind': 'tractor', 'license_plate': '51C-888.99'})
        self.assertEqual(r_tr.status_code, 201, r_tr.content)
        self.assertTrue(Vehicle.objects.filter(subcontractor=self.sub2, license_plate='51C-888.99', is_deleted=False).exists())

        r_tl = self.api('post', f'/api/vendor/{self.token}/catalog/', {'kind': 'trailer', 'license_plate': '51R-777.66'})
        self.assertEqual(r_tl.status_code, 201, r_tl.content)
        self.assertTrue(SubcontractorTrailer.objects.filter(subcontractor=self.sub2, license_plate='51R-777.66', is_deleted=False).exists())

        r_dr = self.api('post', f'/api/vendor/{self.token}/catalog/', {'kind': 'driver', 'full_name': 'Nguyễn Văn Mới', 'phone': '0912345678'})
        self.assertEqual(r_dr.status_code, 201, r_dr.content)
        self.assertTrue(SubcontractorDriver.objects.filter(subcontractor=self.sub2, full_name='Nguyễn Văn Mới', phone='0912345678', is_deleted=False).exists())

        # 2. Tải lại catalog của self.sub2 phải thấy đủ 3 mục vừa tạo dù chưa gán vào chuyến nào
        cat2 = self.client.get(f'/api/vendor/{self.token}/catalog/').json()['data']
        self.assertIn('51C-888.99', cat2['tractors'])
        self.assertIn('51R-777.66', cat2['trailers'])
        self.assertTrue(any(d['name'] == 'Nguyễn Văn Mới' and d['phone'] == '0912345678' for d in cat2['drivers']))

        # 3. Nhà xe khác không được thấy danh mục của self.sub2
        sub3 = Subcontractor.objects.create(name='Nhà xe C', code='VND03', company=self.sub.company)
        self.client.force_login(self.staff)
        c34 = self.import_conts(C3, C4)
        out1 = self.assign([c34[C3].id], sub3)
        self.client.logout()
        tok1 = out1['link'].rstrip('/').rsplit('/', 1)[-1]
        cat1 = self.client.get(f'/api/vendor/{tok1}/catalog/').json()['data']
        self.assertNotIn('51C-888.99', cat1['tractors'])
        self.assertNotIn('51R-777.66', cat1['trailers'])
        self.assertFalse(any(d['phone'] == '0912345678' for d in cat1['drivers']))

        # 4. Dữ liệu sai định dạng bị từ chối với 409
        bad = self.api('post', f'/api/vendor/{self.token}/catalog/', {'kind': 'driver', 'full_name': 'Thiếu SĐT', 'phone': ''})
        self.assertEqual(bad.status_code, 409)

    def test_catalog_update_and_delete(self):
        from apps.fleet.models import Vehicle
        from apps.master_data.models import SubcontractorDriver, SubcontractorTrailer

        # 1. Thêm mới tài xế có đầy đủ thông tin: ảnh, CCCD, tuổi, bằng lái, số điện thoại, kinh nghiệm
        r = self.api('post', f'/api/vendor/{self.token}/catalog/', {
            'kind': 'driver',
            'full_name': 'Lê Văn Tài',
            'phone': '0933445566',
            'citizen_id': '079123456789',
            'age': 38,
            'license_class': 'FC',
            'license_number': 'GPLX999888',
            'experience_years': 8,
        })
        self.assertEqual(r.status_code, 201)
        drv = SubcontractorDriver.objects.get(phone='0933445566', subcontractor=self.sub2)
        self.assertEqual(drv.citizen_id, '079123456789')
        self.assertEqual(drv.age, 38)
        self.assertEqual(drv.experience_years, 8)

        # 2. Sửa thông tin tài xế qua action update
        r_up = self.api('post', f'/api/vendor/{self.token}/catalog/', {
            'action': 'update',
            'id': drv.id,
            'kind': 'driver',
            'full_name': 'Lê Văn Tài (Đã đổi)',
            'phone': '0933445566',
            'citizen_id': '079123456789',
            'age': 39,
            'license_class': 'FC',
        })
        self.assertEqual(r_up.status_code, 200)
        drv.refresh_from_db()
        self.assertEqual(drv.full_name, 'Lê Văn Tài (Đã đổi)')
        self.assertEqual(drv.age, 39)

        # 3. Xóa tài xế khỏi danh mục qua action delete
        r_del = self.api('post', f'/api/vendor/{self.token}/catalog/', {
            'action': 'delete',
            'kind': 'driver',
            'id': drv.id,
            'value': '0933445566'
        })
        self.assertEqual(r_del.status_code, 200)
        drv.refresh_from_db()
        self.assertTrue(drv.is_deleted)
        self.assertFalse(any(d['phone'] == '0933445566' for d in r_del.json()['data']['drivers']))

    def test_vendor_portal_3factor_auth_lockout_idle_and_isolation(self):
        from apps.master_data.models import SubcontractorPortalAccount

        # 1. Chưa đăng nhập nhân viên không được cấp tài khoản Portal Nhà xe
        unauth_admin = self.api('post', f'/api/vendor-portal-accounts/{self.sub2.id}/', {'username': 'v2'})
        self.assertIn(unauth_admin.status_code, (401, 403))

        # 2. Điều vận GSS cấp tài khoản Portal (user + pw + token xác nhận + idle timeout 5 phút)
        self.client.force_login(self.staff)
        prov = self.api('post', f'/api/vendor-portal-accounts/{self.sub2.id}/', {
            'username': 'vendor_sub2',
            'password': 'StrongPass#2026',
            'idle_timeout_minutes': 5,
            'is_active': True,
        })
        self.assertEqual(prov.status_code, 200, prov.content)
        confirm_token = prov.json()['data']['issued_confirm_token']
        self.assertTrue(len(confirm_token) >= 20)
        self.client.logout()

        # 3. Khi đã bật tài khoản Portal, truy cập token cũ hoặc workspace khi chưa login -> 401
        r_unauth = self.client.get(f'/api/vendor/{self.token}/')
        self.assertEqual(r_unauth.status_code, 401)
        self.assertEqual(r_unauth.json()['details']['code'], 'vendor_auth_required')
        self.assertEqual(self.client.get('/api/vendor/portal/overview/').status_code, 401)

        # 4. Tạo thêm nhà xe sub3 + allocation tok3 để kiểm tra chéo token và cô lập dữ liệu
        self.client.force_login(self.staff)
        sub3 = Subcontractor.objects.create(name='Nhà xe Khác', code='VND09', company=self.sub.company)
        c34 = self.import_conts(C3, C4)
        out3 = self.assign([c34[C3].id], sub3)
        tok3 = out3['link'].rstrip('/').rsplit('/', 1)[-1]
        alloc3 = vs.allocation_by_token(tok3)
        self.client.logout()

        # Token xác nhận sai hoặc token của nhà xe khác bị từ chối
        bad_tok = self.api('post', '/api/vendor/auth/login/', {
            'username': 'vendor_sub2', 'password': 'StrongPass#2026', 'confirm_token': tok3,
        })
        self.assertEqual(bad_tok.status_code, 401)

        # 5. Sai thêm 4 lần (tổng 5 lần tính cả sai token ở trên) -> khóa tạm thời (403 vendor_account_locked)
        for _ in range(3):
            r_fail = self.api('post', '/api/vendor/auth/login/', {
                'username': 'vendor_sub2', 'password': 'WrongPassword1', 'confirm_token': confirm_token,
            })
            self.assertEqual(r_fail.status_code, 401)
        r_lock = self.api('post', '/api/vendor/auth/login/', {
            'username': 'vendor_sub2', 'password': 'WrongPassword1', 'confirm_token': confirm_token,
        })
        self.assertEqual(r_lock.status_code, 403)
        self.assertEqual(r_lock.json()['details']['code'], 'vendor_account_locked')

        # Kể cả đúng mật khẩu vẫn bị chặn trong lúc đang khóa
        r_still_locked = self.api('post', '/api/vendor/auth/login/', {
            'username': 'vendor_sub2', 'password': 'StrongPass#2026', 'confirm_token': confirm_token,
        })
        self.assertEqual(r_still_locked.status_code, 403)

        # Admin GSS mở khóa
        self.client.force_login(self.staff)
        unlock = self.api('post', f'/api/vendor-portal-accounts/{self.sub2.id}/', {'unlock': True})
        self.assertEqual(unlock.status_code, 200)
        self.client.logout()

        # 6. Đăng nhập hợp lệ với Username + Password + Token xác nhận (hoặc token phân bổ của chính nhà xe)
        ok_login = self.api('post', '/api/vendor/auth/login/', {
            'username': 'vendor_sub2', 'password': 'StrongPass#2026', 'confirm_token': confirm_token,
        })
        self.assertEqual(ok_login.status_code, 200, ok_login.content)
        self.assertTrue(ok_login.json()['data']['authenticated'])
        self.assertEqual(ok_login.json()['data']['idle_timeout_minutes'], 5)

        # Phiên nhà xe truy cập được lệnh của chính mình, nhưng TUYỆT ĐỐI KHÔNG truy cập được API nội bộ GSS hay nhà xe khác
        self.assertEqual(self.client.get(f'/api/vendor/{self.token}/').status_code, 200)
        self.assertEqual(self.client.get('/api/vendor/portal/overview/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/vendor/{tok3}/').status_code, 403)
        self.assertEqual(self.client.get(f'/api/vendor/portal/allocations/{alloc3.id}/').status_code, 404)
        self.assertIn(self.client.get('/api/gss/dashboard/').status_code, (401, 403))
        self.assertIn(self.client.get(f'/api/vendor-portal-accounts/{self.sub2.id}/').status_code, (401, 403))

        # 7. Passive polling (X-Vendor-Passive-Poll: 1) KHÔNG được phép làm mới last_seen
        sess = self.client.session
        old_ts = timezone.now().timestamp() - 120
        va = dict(sess['_vendor_auth'])
        va['last_seen'] = old_ts
        sess['_vendor_auth'] = va
        sess.save()

        poll_res = self.client.get('/api/vendor/portal/tracking/', HTTP_X_VENDOR_PASSIVE_POLL='1')
        self.assertEqual(poll_res.status_code, 200)
        self.assertAlmostEqual(self.client.session['_vendor_auth']['last_seen'], old_ts, delta=1.0)

        # 8. Khi quá thời gian idle (5 phút = 300s) -> tự động đăng xuất với mã vendor_session_idle
        sess = self.client.session
        va = dict(sess['_vendor_auth'])
        va['last_seen'] = timezone.now().timestamp() - 305
        sess['_vendor_auth'] = va
        sess.save()

        idle_res = self.client.get('/api/vendor/portal/overview/')
        self.assertEqual(idle_res.status_code, 401)
        self.assertEqual(idle_res.json()['details']['code'], 'vendor_session_idle')
        st_after = self.client.get('/api/vendor/auth/status/').json()
        self.assertFalse(st_after['authenticated'])
        self.assertTrue(SubcontractorPortalAccount.objects.filter(subcontractor=self.sub2).exists())

    def test_vendor_portal_tracking_7_stages_and_sanitized_fields(self):
        # Cấp tài khoản và đăng nhập bằng link token của chính nhà xe
        self.client.force_login(self.staff)
        prov = self.api('post', f'/api/vendor-portal-accounts/{self.sub2.id}/', {
            'username': 'vtrack2',
            'password': 'TrackPass#2026',
            'idle_timeout_minutes': 15,
            'is_active': True,
        })
        self.assertEqual(prov.status_code, 200)
        self.client.logout()

        login_r = self.api('post', '/api/vendor/auth/login/', {
            'username': 'vtrack2',
            'password': 'TrackPass#2026',
            'confirm_token': self.token,
        })
        self.assertEqual(login_r.status_code, 200, login_r.content)

        # Gán xe qua Workspace API
        alloc = vs.allocation_by_token(self.token)
        put_r = self.api('put', f'/api/vendor/portal/allocations/{alloc.id}/', {
            'rows': [{
                'line_no': 1,
                'tractor_plate': '51C-555.11',
                'trailer_plate': '51R-555.11',
                'driver_name': 'Nguyễn Văn Theo Dõi',
                'driver_phone': '0911222333',
            }]
        })
        self.assertEqual(put_r.status_code, 200, put_r.content)
        self.assertEqual(put_r.json()['saved'], 1, put_r.content)
        trip = DispatchTrip.objects.filter(vendor_allocation=alloc, is_deleted=False).first()
        self.assertIsNotNone(trip)
        self.run_to(trip, 'LOADED_ON_VEHICLE')

        # Kiểm tra dữ liệu Theo Dõi 7 chặng & ẩn hoàn toàn thông tin giá/khách hàng
        tr_res = self.client.get(f'/api/vendor/portal/tracking/?alloc_id={alloc.id}')
        self.assertEqual(tr_res.status_code, 200)
        rows = tr_res.json()['data']
        self.assertTrue(len(rows) >= 1)
        row0 = next(r for r in rows if r['trip_id'] == trip.id)
        self.assertEqual(row0['step_status'], 'LOADED_ON_VEHICLE')
        self.assertEqual(row0['step_index'], 3)
        self.assertEqual(len(row0['milestones']), 7)
        self.assertIsNotNone(row0['milestones']['created_at'])
        self.assertIsNotNone(row0['milestones']['arrived_pickup_at'])
        self.assertIsNotNone(row0['milestones']['loaded_at'])
        self.assertIsNone(row0['milestones']['arrived_delivery_at'])
        # Không lộ tên khách hàng hay thông tin tài chính
        raw_dump = json.dumps(row0, ensure_ascii=False)
        self.assertNotIn(self.customer.name, raw_dump)
        for forbidden_key in ('customer', 'customer_name', 'sell_price', 'buy_price', 'total_amount', 'rate_card'):
            self.assertNotIn(forbidden_key, row0)

        # Đăng xuất thủ công xóa sạch session
        self.assertEqual(self.client.post('/api/vendor/auth/logout/').status_code, 200)
        self.assertEqual(self.client.get('/api/vendor/portal/tracking/').status_code, 401)


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



class WorkflowPhasesTests(Base):
    def test_paired_20ft_and_bl_search_settlement(self):
        self.booking.mbl_number = 'MBL-PAIR-999'
        self.booking.hbl_number = 'HBL-PAIR-888'
        self.booking.container_size = '20DC'
        self.booking.save(update_fields=['mbl_number', 'hbl_number', 'container_size'])
        BookingContainer.objects.create(booking=self.booking, line_no=1, container_number=C1, container_type='20DC', seal_number='S1', company=self.booking.company)
        BookingContainer.objects.create(booking=self.booking, line_no=2, container_number=C2, container_type='20DC', seal_number='S2', company=self.booking.company)
        c_list = list(self.booking.containers.filter(is_deleted=False).order_by('line_no'))
        cs.assign(self.booking, [c.id for c in c_list], self.sub, user=self.staff)
        from apps.dispatch.models import BookingVendorAllocation
        alloc = BookingVendorAllocation.objects.get(booking=self.booking, subcontractor=self.sub, is_deleted=False)
        res = vs.submit_rows(alloc, [
            {'line_no': 1, 'tractor_plate': '51C-20001', 'trailer_plate': '51R-20001', 'driver_name': 'Tai 1', 'driver_phone': '0901111111'},
            {'line_no': 2, 'tractor_plate': '51C-20001', 'trailer_plate': '51R-20001', 'driver_name': 'Tai 1', 'driver_phone': '0901111111', 'paired_with_line_no': 1},
        ])
        self.assertEqual(res['saved'], 2, res)
        t1 = DispatchTrip.objects.get(booking_order=self.booking, vendor_line_no=1, is_deleted=False)
        t2 = DispatchTrip.objects.get(booking_order=self.booking, vendor_line_no=2, is_deleted=False)
        self.assertTrue(t1.is_twin_container)
        self.assertEqual(t1.container_number_2, C2)
        self.assertTrue(t2.is_twin_container)
        self.assertEqual(t2.container_number_2, C1)
        self.assertEqual(t1.containers.count(), 2)

        from apps.dispatch import gss_search, gss_settlement
        found_mbl = gss_search.search('MBL-PAIR-999')
        self.assertEqual(len(found_mbl['bookings']), 1)
        qs_bl = gss_settlement.queryset(bl='HBL-PAIR-888')
        self.assertEqual(qs_bl.count(), 2)

    def test_auto_delivery_note_ocr_fallback_and_storage_path(self):
        from django.utils import timezone
        from apps.gss import docs as dc, ocr
        from apps.gss.models import DeliveryNote

        t = self.run_to(self.trip(), 'UNLOADED')
        self.assertTrue(DeliveryNote.objects.filter(trips=t, is_deleted=False).exists())

        res = ocr.extract_invoice_from_image(png('inv.png'))
        self.assertFalse(res['configured'])
        self.assertEqual(res['source'], 'MANUAL')

        r_api = self.client.get('/api/gss/invoices/ocr/')
        self.assertEqual(r_api.status_code, 200)
        self.assertFalse(r_api.json()['data']['ocr_configured'])

        rel = dc.storage_rel_path(t, 'PICKUP', 1, timezone.now(), 'img.jpg', key='abcd1234')
        self.assertTrue(rel.startswith('Storage/'))
        self.assertIn('/Chung_Tu_Hanh_Trinh/', rel)
