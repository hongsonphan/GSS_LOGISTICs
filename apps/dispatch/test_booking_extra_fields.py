"""Booking: 4 trường mới (cargo_value, etd, eta, invoice_no) và số tờ khai hải quan (customs_declaration_number)
qua cả hai đường API: GSS (/api/gss/bookings/) và form cũ (/api/sales/, /api/bookings/<id>/)."""
import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.customers.models import BookingOrder, Customer
from apps.dispatch import gss_bookings as svc
from apps.gss.models import CustomsDeclarationRef
from apps.personnel.models import Employee, EmployeeRole
from core.models import Company, get_default_company

User = get_user_model()


class BookingExtraFieldsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('sale_x', password='password123')
        Employee.objects.create(user=self.user, code='SALEX', full_name='Sale X', phone_number='0933000001', role=EmployeeRole.DIRECTOR)
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.customer = Customer.objects.create(code='KHX', name='Khách X')

    def gss_payload(self, **kw):
        return {'customer_id': self.customer.pk, 'total_containers': 2, 'pickup': 'Cat Lai', 'delivery': 'Kho B', **kw}

    def test_gss_create_read_back_and_clear(self):
        r = self.api.post('/api/gss/bookings/', self.gss_payload(
            cargo_value='1250000.5', etd='2026-12-01', eta='2026-12-10', invoice_no='  INV-001 ',
            customs_declaration_number=' 306123456789 ; 306123456790, 306123456789 '), format='json')
        self.assertEqual(r.status_code, 201, r.content)
        d = r.json()['data']
        self.assertEqual((d['cargo_value'], d['etd'], d['eta'], d['invoice_no']), ('1250000.50', '2026-12-01', '2026-12-10', 'INV-001'))
        self.assertEqual(d['customs_numbers'], ['306123456789', '306123456790'])  # trim + bỏ trùng
        self.assertEqual(d['customs_declaration_number'], '306123456789, 306123456790')
        b = BookingOrder.objects.get(pk=d['id'])
        self.assertEqual(b.cargo_value, Decimal('1250000.50'))
        self.assertEqual(b.customs_refs.filter(is_deleted=False).count(), 2)
        # mở lại: chi tiết và danh sách
        det = self.api.get(f"/api/gss/bookings/{b.pk}/").json()['data']
        self.assertEqual(det['customs_declaration_number'], '306123456789, 306123456790')
        row = self.api.get('/api/gss/bookings/').json()['results'][0]
        self.assertEqual((row['cargo_value'], row['etd'], row['eta'], row['invoice_no']), ('1250000.50', '2026-12-01', '2026-12-10', 'INV-001'))
        # sửa: bỏ một số, giữ số kia (không nhân đôi); số bỏ đi bị xóa mềm
        r = self.api.put(f'/api/gss/bookings/{b.pk}/', {'customs_declaration_number': '306123456790', 'cargo_value': ''}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['data']['customs_numbers'], ['306123456790'])
        self.assertEqual(CustomsDeclarationRef.all_objects.filter(booking=b).count(), 2)  # không xóa cứng
        b.refresh_from_db()
        self.assertIsNone(b.cargo_value)
        # không gửi khóa -> giữ nguyên tờ khai
        self.api.put(f'/api/gss/bookings/{b.pk}/', {'notes': 'x'}, format='json')
        self.assertEqual(b.customs_refs.filter(is_deleted=False).count(), 1)
        # xóa trắng ô -> bỏ hết
        self.api.put(f'/api/gss/bookings/{b.pk}/', {'customs_declaration_number': ''}, format='json')
        self.assertEqual(b.customs_refs.filter(is_deleted=False).count(), 0)

    def test_gss_eta_before_etd_rejected(self):
        r = self.api.post('/api/gss/bookings/', self.gss_payload(etd='2026-12-10', eta='2026-12-01'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('ETA', r.json()['message'])
        self.assertFalse(BookingOrder.objects.exists())
        ok = self.api.post('/api/gss/bookings/', self.gss_payload(etd='2026-12-10', eta='2026-12-10'), format='json')
        self.assertEqual(ok.status_code, 201)
        pk = ok.json()['data']['id']
        self.assertEqual(self.api.put(f'/api/gss/bookings/{pk}/', {'eta': '2026-12-09'}, format='json').status_code, 400)  # so với ETD đã lưu

    def test_gss_bad_values(self):
        for bad in ({'cargo_value': '-1'}, {'cargo_value': 'abc'}, {'cargo_value': '1e30'}, {'invoice_no': 'x' * 101},
                    {'customs_declaration_number': 'A' * 31}, {'etd': '01/12/2026'}):
            self.assertEqual(self.api.post('/api/gss/bookings/', self.gss_payload(**bad), format='json').status_code, 400, bad)
        self.assertFalse(BookingOrder.objects.exists())

    def test_legacy_form_create_update_detail(self):
        r = self.api.post('/api/sales/', data={
            'action': 'create_booking', 'customer': self.customer.name, 'total_containers': '1', 'pickup_location': 'CAT LAI',
            'delivery_location': 'KHO 1', 'cargo_value': '99.9', 'etd': '2026-12-01', 'eta': '2026-12-05', 'invoice_no': 'INV-9',
            'customs_declaration_number': '307000000001'})
        self.assertEqual(r.status_code, 200, r.content)
        bid = r.json()['booking_id']
        det = self.api.get(f'/api/bookings/{bid}/').json()
        self.assertEqual((det['cargo_value'], det['etd'], det['eta'], det['invoice_no']), ('99.90', '2026-12-01', '2026-12-05', 'INV-9'))
        self.assertEqual(det['customs_declaration_number'], '307000000001')
        r = self.api.put(f'/api/bookings/{bid}/', data={'customs_declaration_number': '307000000002', 'invoice_no': '', 'eta': ''})
        self.assertEqual(r.status_code, 200, r.content)
        det = self.api.get(f'/api/bookings/{bid}/').json()
        self.assertEqual((det['customs_declaration_number'], det['invoice_no'], det['eta']), ('307000000002', '', ''))
        # ETA < ETD ở form cũ
        self.assertEqual(self.api.put(f'/api/bookings/{bid}/', data={'eta': '2026-11-01'}).status_code, 400)
        bad = self.api.post('/api/sales/', data={'action': 'create_booking', 'customer': self.customer.name, 'pickup_location': 'A',
                                                 'delivery_location': 'B', 'etd': '2026-12-05', 'eta': '2026-12-01'})
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(BookingOrder.objects.count(), 1)
        # danh sách form cũ trả trường mới
        lst = self.api.get('/api/sales/', {'type': 'bookings'}).json()
        self.assertTrue(lst)

    def test_legacy_form_accepts_discharge_date_and_do_expiry(self):
        """Mục 23: form cũ (POST /api/sales/, PUT/GET /api/bookings/<id>/) nhận và trả Ngày dỡ hàng và Hạn D/O."""
        r = self.api.post('/api/sales/', data={'action': 'create_booking', 'customer': self.customer.name, 'total_containers': '1',
                                               'pickup_location': 'A', 'delivery_location': 'B',
                                               'discharge_date': '2026-12-03', 'do_expiry': '2026-12-10'})
        self.assertEqual(r.status_code, 200, r.content)
        bid = r.json()['booking_id']
        det = self.api.get(f'/api/bookings/{bid}/').json()
        self.assertEqual((det['discharge_date'], det['do_expiry']), ('2026-12-03', '2026-12-10'))
        r = self.api.put(f'/api/bookings/{bid}/', data={'do_expiry': '', 'discharge_date': '2026-12-04'})
        self.assertEqual(r.status_code, 200, r.content)
        det = self.api.get(f'/api/bookings/{bid}/').json()
        self.assertEqual((det['discharge_date'], det['do_expiry']), ('2026-12-04', ''))
        bad = self.api.put(f'/api/bookings/{bid}/', data={'do_expiry': '10/12/2026'})
        self.assertEqual(bad.status_code, 400)

    def test_unknown_customer_is_rejected_not_replaced_by_first_customer(self):
        """Tên khách không nhận ra -> 400, tuyệt đối không tự gán khách đầu tiên (sai khách là sai chứng từ và tiền)."""
        r = self.api.post('/api/sales/', data={'action': 'create_booking', 'customer': 'KHÔNG TỒN TẠI', 'pickup_location': 'A', 'delivery_location': 'B'})
        self.assertEqual(r.status_code, 400, r.content)
        self.assertFalse(BookingOrder.objects.exists())
        from apps.customers.models import Quotation
        r = self.api.post('/api/sales/', {'action': 'create_quotation', 'customer': 'KHÔNG TỒN TẠI', 'items': [{'route_description': 'A -> B', 'unit_price': 1000}]}, format='json')
        self.assertEqual(r.status_code, 400, r.content)
        self.assertFalse(Quotation.objects.exists())

    def test_booking_price_is_never_auto_filled_from_quotation(self):
        """Báo giá chỉ GỢI Ý trên màn hình: tạo booking không nhập giá thì giá = 0, backend không tự điền từ báo giá."""
        from apps.customers.models import Quotation
        q = self.api.post('/api/sales/', {'action': 'create_quotation', 'customer': self.customer.name, 'status': 'APPROVED',
                                          'items': [{'route_description': 'CAT LAI -> KHO 1', 'unit_price': 3500000, 'expected_trips_monthly': 5}]}, format='json')
        self.assertEqual(q.status_code, 200, q.content)
        self.assertTrue(Quotation.objects.filter(customer=self.customer).exists())
        r = self.api.post('/api/sales/', data={'action': 'create_booking', 'customer': self.customer.name, 'total_containers': '1',
                                               'pickup_location': 'CAT LAI', 'delivery_location': 'KHO 1'})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(BookingOrder.objects.get(pk=r.json()['booking_id']).selling_freight_price, 0)
        # nhập tay thì lưu đúng giá nhập tay
        r = self.api.post('/api/sales/', data={'action': 'create_booking', 'customer': self.customer.name, 'total_containers': '1',
                                               'pickup_location': 'CAT LAI', 'delivery_location': 'KHO 1', 'selling_freight_price': '4000000'})
        self.assertEqual(BookingOrder.objects.get(pk=r.json()['booking_id']).selling_freight_price, 4000000)

    def test_active_list_does_not_treat_fully_dispatched_as_completed(self):
        """Booking.status=COMPLETED nghĩa là 'đã điều đủ xe', không phải đã hoàn thành vận chuyển: lệnh điều độ chưa có chuyến hạ rỗng
        thì is_completed phải False (trước đây hiện 'Đã hoàn thành' khi các chuyến mới đến nơi nhận)."""
        from apps.customers.models import BookingStatus
        b = BookingOrder.objects.create(booking_code='BK.9X', customer=self.customer, pickup_location='A', delivery_location='B',
                                        total_containers=2, status=BookingStatus.COMPLETED, company=get_default_company())
        rows = self.api.get('/api/bookings/active/?include_completed=1').json()
        rows = rows['data'] if isinstance(rows, dict) else rows
        row = next(r for r in rows if r['id'] == b.pk)
        self.assertFalse(row['is_completed'])
        self.assertEqual((row['trips_completed'], row['trips_running']), (0, 0))

    def test_other_company_cannot_see_or_edit(self):
        b = BookingOrder.objects.create(booking_code='BK.9', customer=self.customer, pickup_location='A', delivery_location='B',
                                        invoice_no='INV-A', company=get_default_company())
        CustomsDeclarationRef.objects.create(booking=b, number='308000000001', company=b.company)
        other = Company.objects.create(code='B_EXTRA', name='Công ty B')
        boss_b = User.objects.create_user('boss_b_extra', password='password123')
        Employee.objects.create(user=boss_b, code='GDBX', full_name='GĐ B', phone_number='0933000002', role=EmployeeRole.DIRECTOR, company=other)
        api_b = APIClient()
        api_b.force_authenticate(boss_b)
        self.assertEqual(api_b.get(f'/api/gss/bookings/{b.pk}/').status_code, 404)
        self.assertEqual(api_b.get(f'/api/bookings/{b.pk}/').status_code, 404)
        self.assertEqual(api_b.put(f'/api/gss/bookings/{b.pk}/', {'invoice_no': 'HACK', 'customs_declaration_number': 'X1'}, format='json').status_code, 404)
        self.assertEqual(api_b.put(f'/api/bookings/{b.pk}/', data={'invoice_no': 'HACK'}).status_code, 404)
        b.refresh_from_db()
        self.assertEqual(b.invoice_no, 'INV-A')
        self.assertEqual(b.customs_refs.filter(is_deleted=False).count(), 1)

    def test_helpers(self):
        self.assertEqual(svc.split_customs_numbers(' a1\nb2;;a1 ,c3'), ['A1', 'B2', 'C3'])
        self.assertIsNone(svc.parse_cargo_value(''))
        self.assertEqual(svc.parse_cargo_value('1,000.126'), Decimal('1000.13'))
        self.assertEqual(datetime.date(2026, 1, 1), svc._date('2026-01-01', 'x'))


class BookingPriceLinesTests(TestCase):
    """Giá Booking nhiều dòng (mục 18): mỗi loại cont một đơn giá, tra giá qua BookingOrder.price_for."""

    def setUp(self):
        self.user = User.objects.create_user('sale_p', password='password123')
        Employee.objects.create(user=self.user, code='SALEP', full_name='Sale P', phone_number='0933000002', role=EmployeeRole.DIRECTOR)
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.customer = Customer.objects.create(code='KHP', name='Khách P')

    def make(self, **kw):
        data = {'customer_id': self.customer.pk, 'total_containers': 3, 'pickup': 'Cat Lai', 'delivery': 'Kho B',
                'container_size': '20DC, 40HC', **kw}
        r = self.api.post('/api/gss/bookings/', data, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return BookingOrder.objects.get(pk=r.json()['data']['id']), r.json()['data']

    def test_two_lines_price_for_and_mirror(self):
        b, d = self.make(price_lines=[{'container_type': '20DC', 'unit_price': 2500000}, {'container_type': '40HC', 'unit_price': 4000000, 'note': 'gia 40'}])
        self.assertEqual(b.price_for('20dc'), Decimal('2500000'))
        self.assertEqual(b.price_for('40HC'), Decimal('4000000'))
        self.assertEqual(b.price_for('45HC'), 0)   # không có dòng khớp: không tự áp giá khác
        self.assertEqual(b.price_for(''), 0)       # nhiều dòng mà không rõ loại: không đoán
        self.assertEqual(b.selling_freight_price, Decimal('2500000'))  # phản chiếu dòng đầu
        self.assertEqual([l['container_type'] for l in d['price_lines']], ['20DC', '40HC'])
        self.assertEqual(d['price_lines'][1]['note'], 'gia 40')

    def test_validation(self):
        for lines in ([{'container_type': '40HC', 'unit_price': 1}, {'container_type': '40HC', 'unit_price': 2}],   # trùng loại
                      [{'container_type': '45HC', 'unit_price': 1}],                                                  # ngoài ô Size
                      [{'container_type': '20DC', 'unit_price': -5}]):                                                # giá âm
            r = self.api.post('/api/gss/bookings/', {'customer_id': self.customer.pk, 'total_containers': 1, 'pickup': 'A', 'delivery': 'B',
                                                     'container_size': '20DC, 40HC', 'price_lines': lines}, format='json')
            self.assertEqual(r.status_code, 400, lines)
        self.assertEqual(BookingOrder.objects.count(), 0)

    def test_edit_replaces_soft_deletes_and_old_client_keeps_other_lines(self):
        b, _ = self.make(price_lines=[{'container_type': '20DC', 'unit_price': 100}, {'container_type': '40HC', 'unit_price': 200}])
        # client cũ chỉ gửi một số: chỉ sửa dòng đầu
        self.api.put(f'/api/gss/bookings/{b.pk}/', {'selling_freight_price': 150}, format='json')
        self.assertEqual((b.price_for('20DC'), b.price_for('40HC')), (150, 200))
        # bỏ dòng 40HC: xóa mềm, không xóa cứng
        self.api.put(f'/api/gss/bookings/{b.pk}/', {'price_lines': [{'container_type': '20DC', 'unit_price': 150}]}, format='json')
        from apps.customers.models import BookingPriceLine
        self.assertEqual(b.price_lines.filter(is_deleted=False).count(), 1)
        self.assertEqual(BookingPriceLine.all_objects.filter(booking=b).count(), 2)  # sửa tại chỗ, dòng thừa chỉ xóa mềm
        self.assertEqual(b.price_for('40HC'), 0)

    def test_legacy_single_price_and_revenue_plan(self):
        b, d = self.make(selling_freight_price=3000000)   # chỉ gửi giá cũ
        self.assertEqual([(l['container_type'], l['unit_price']) for l in d['price_lines']], [('20DC', 3000000.0)])
        self.assertEqual(b.price_for('20DC'), Decimal('3000000'))
        self.assertEqual(b.revenue_plan(), Decimal('9000000'))  # 3 cont x giá, chưa có danh sách cont thì dùng dòng đầu
