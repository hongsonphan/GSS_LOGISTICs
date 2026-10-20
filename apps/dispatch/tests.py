import json
from django.test import TestCase, Client
from django.utils import timezone
from django.contrib.auth.models import User
from apps.customers.models import Customer
from apps.fleet.models import Vehicle, VehicleType
from apps.personnel.models import Employee, EmployeeRole
from apps.dispatch.models import DispatchTrip, TripStatus

class DriverTokenRevocationTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.customer = Customer.objects.create(code="CUST_TEST", name="Công Ty Test")
        self.driver_a = Employee.objects.create(
            code="DRV_A", full_name="Tài Xế A", nickname="Tài A",
            phone_number="0901111111", role=EmployeeRole.DRIVER
        )
        self.driver_b = Employee.objects.create(
            code="DRV_B", full_name="Tài Xế B", nickname="Tài B",
            phone_number="0902222222", role=EmployeeRole.DRIVER
        )
        self.dispatcher = Employee.objects.create(
            code="DISP_01", full_name="Điều Độ Viên", nickname="Điều Độ 1",
            role=EmployeeRole.DISPATCHER
        )
        self.vehicle = Vehicle.objects.create(
            license_plate="51C-123.45",
            vehicle_type=VehicleType.TRACTOR,
            registration_expiry=timezone.now().date(),
            insurance_expiry=timezone.now().date()
        )

        # Tạo chuyến xe gán ban đầu cho Tài Xế A
        self.trip = DispatchTrip.objects.create(
            trip_code="TVL-TEST-TOKEN-01",
            customer=self.customer,
            driver=self.driver_a,
            vehicle=self.vehicle,
            dispatcher=self.dispatcher,
            pickup_location="CẢNG CÁT LÁI",
            warehouse_location="KHO TEST",
            dropoff_location="BÃI RỖNG",
            status=TripStatus.DISPATCHED,
            dispatched_at=timezone.now()
        )

    def test_driver_token_regeneration_and_revocation(self):
        # 1. Kiểm tra chuyến xe tự động có driver_token ban đầu
        token_a = self.trip.driver_token
        self.assertTrue(bool(token_a))
        self.assertEqual(self.trip.driver_hashid, token_a)

        # 2. Tài xế A mở link Driver Portal -> 200 OK
        res_a = self.client.get(f'/driver/{token_a}/')
        self.assertEqual(res_a.status_code, 200)
        self.assertContains(res_a, "TVL-TEST-TOKEN-01")

        from django.contrib.auth.models import User
        self.user = User.objects.create_superuser(username="admin_disp", password="password123")
        self.client.force_login(self.user)

        # 3. Điều độ đổi tài xế sang Tài Xế B qua API PATCH
        patch_res = self.client.patch(
            f'/api/trips/{self.trip.trip_code}/',
            data=json.dumps({'driver_id': self.driver_b.id}),
            content_type='application/json'
        )
        self.assertEqual(patch_res.status_code, 200)

        # Đăng xuất client để giả lập tài xế truy cập không cần login
        self.client.logout()

        # Reload chuyến xe từ database
        self.trip.refresh_from_db()
        token_b = self.trip.driver_token

        # 4. Kiểm tra token mới đã được cấp và khác token cũ
        self.assertEqual(self.trip.driver, self.driver_b)
        self.assertTrue(bool(token_b))
        self.assertNotEqual(token_a, token_b)
        self.assertEqual(self.trip.driver_hashid, token_b)

        # 5. Tài xế B mở link mới -> 200 OK
        res_b = self.client.get(f'/driver/{token_b}/')
        self.assertEqual(res_b.status_code, 200)
        self.assertContains(res_b, "TVL-TEST-TOKEN-01")

        # 6. Tài xế A mở lại link cũ -> 403 Forbidden (Trang cảnh báo link đã thu hồi)
        res_a_old = self.client.get(f'/driver/{token_a}/')
        self.assertEqual(res_a_old.status_code, 403)
        self.assertTemplateUsed(res_a_old, 'driver_portal_revoked.html')

        # 7. Tài xế A cố gọi API báo mốc với token cũ -> Bị từ chối xác thực (401/403/404)
        api_milestone_old = self.client.post(
            f'/api/trips/{token_a}/milestones/',
            data=json.dumps({'milestone': 'DEPARTED'}),
            content_type='application/json'
        )
        self.assertIn(api_milestone_old.status_code, [401, 403, 404])

        # 8. Tài xế B gọi API báo mốc với token mới -> 200 OK
        api_milestone_new = self.client.post(
            f'/api/trips/{token_b}/milestones/',
            data=json.dumps({'milestone': 'DEPARTED'}),
            content_type='application/json'
        )
        self.assertEqual(api_milestone_new.status_code, 200)

class DriverPortalMistakeCorrectionTestCase(TestCase):
    """Kiểm thử tính năng hiệu chỉnh kê khai nhầm trên màn hình Tài Xế (Chi phí, Chứng từ, Số Cont/Seal)."""
    def setUp(self):
        self.client = Client()
        self.customer = Customer.objects.create(code="CUST_TEST2", name="Công Ty Giao Nhận ABC")
        self.driver = Employee.objects.create(
            code="DRV_01", full_name="Trần Văn Tài", nickname="Tài Trần",
            phone_number="0903333333", role=EmployeeRole.DRIVER
        )
        self.vehicle = Vehicle.objects.create(
            license_plate="50E-999.99",
            vehicle_type=VehicleType.TRACTOR,
            registration_expiry=timezone.now().date(),
            insurance_expiry=timezone.now().date()
        )
        self.trip = DispatchTrip.objects.create(
            trip_code="TVL-TEST-CORRECT-01",
            customer=self.customer,
            driver=self.driver,
            vehicle=self.vehicle,
            container_number="TEST1234567",
            seal_number="SEAL111",
            pickup_location="CẢNG CÁT LÁI",
            warehouse_location="KHO THỦ ĐỨC",
            dropoff_location="BÃI PHÚC LONG",
            status=TripStatus.DISPATCHED,
            dispatched_at=timezone.now()
        )
        self.token = self.trip.driver_token

    def test_driver_portal_view_renders_correctly(self):
        res = self.client.get(f'/driver/{self.token}/')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "TVL-TEST-CORRECT-01")
        self.assertContains(res, "Trần Văn Tài")
        self.assertContains(res, "50E-999.99")
        self.assertContains(res, "Chi Phí Đã Kê")
        self.assertContains(res, "Chứng Từ & Hình Ảnh Đã Nộp")
        self.assertContains(res, "Sửa Khoản Chi Phí")
        self.assertContains(res, "Sửa Thông Tin Chứng Từ")

    def test_driver_expense_correction_lifecycle(self):
        # 1. Kê khai chi phí ban đầu (vd: 220.000đ vé BOT)
        add_res = self.client.post(
            f'/api/trips/{self.token}/expenses/',
            data=json.dumps({
                'category': 'TOLL_FEE',
                'amount': 220000,
                'notes': 'Vé BOT cầu Đồng Nai',
                'invoice_number': 'BOT-001'
            }),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(add_res.status_code, 200)
        from apps.billing.models import TripExpense
        exp = TripExpense.objects.filter(trip=self.trip, is_deleted=False).first()
        self.assertIsNotNone(exp)
        self.assertEqual(exp.amount, 220000)

        # 2. Tài xế phát hiện kê nhầm số tiền -> Hiệu chỉnh sửa lại thành 180.000đ qua PUT API
        edit_res = self.client.put(
            f'/api/trips/{self.token}/expenses/{exp.id}/',
            data=json.dumps({
                'category': 'TOLL_FEE',
                'amount': 180000,
                'notes': 'Sửa lại đúng giá vé BOT 180k',
                'invoice_number': 'BOT-001'
            }),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(edit_res.status_code, 200)
        exp.refresh_from_db()
        self.assertEqual(exp.amount, 180000)
        self.assertEqual(exp.notes, 'Sửa lại đúng giá vé BOT 180k')

        # 3. Tài xế kê nhầm hẳn 1 khoản khác (vd nâng cont 500k) và muốn XÓA
        add_res2 = self.client.post(
            f'/api/trips/{self.token}/expenses/',
            data=json.dumps({
                'category': 'LIFT_ON',
                'amount': 500000,
                'notes': 'Kê nhầm chuyến khác'
            }),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(add_res2.status_code, 200)
        exp2 = TripExpense.objects.filter(trip=self.trip, category='LIFT_ON', is_deleted=False).first()
        self.assertIsNotNone(exp2)

        # Xóa khoản chi phí kê nhầm
        del_res = self.client.delete(
            f'/api/trips/{self.token}/expenses/{exp2.id}/',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(del_res.status_code, 200)
        exp2.refresh_from_db()
        self.assertTrue(exp2.is_deleted)

    def test_driver_document_correction_lifecycle(self):
        # 1. Tạo chứng từ (vd: Giám định vỏ cont với số Cont ban đầu)
        add_doc_res = self.client.post(
            f'/api/trips/{self.token}/documents/',
            data={
                'doc_type': 'Ảnh giám định vỏ Cont',
                'container_no': 'TEMU9999999',
                'seal_no': 'SEAL888'
            },
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(add_doc_res.status_code, 200)
        from apps.documents.models import TripDocument
        doc = TripDocument.objects.filter(trip=self.trip, is_deleted=False).first()
        self.assertIsNotNone(doc)
        self.assertEqual(doc.extracted_container_no, 'TEMU9999999')

        # 2. Tài xế nhận thấy nhập nhầm số Seal/Cont -> Sửa lại qua PUT API
        edit_doc_res = self.client.put(
            f'/api/trips/{self.token}/documents/{doc.id}/',
            data=json.dumps({
                'title': 'Ảnh giám định vỏ Cont (Đã sửa)',
                'container_no': 'TEMU1111111',
                'seal_no': 'SEAL777',
                'notes': 'Bác tài cập nhật lại đúng số cont bốc'
            }),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(edit_doc_res.status_code, 200)
        doc.refresh_from_db()
        self.assertEqual(doc.extracted_container_no, 'TEMU1111111')
        self.assertEqual(doc.extracted_seal_no, 'SEAL777')

        # 3. Tài xế chụp trùng 1 ảnh và muốn xóa bớt
        del_doc_res = self.client.delete(
            f'/api/trips/{self.token}/documents/{doc.id}/',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(del_doc_res.status_code, 200)
        doc.refresh_from_db()
        self.assertTrue(doc.is_deleted)

    def test_driver_update_container_seal_on_trip(self):
        # Cập nhật trực tiếp số Container / Seal của chuyến xe
        res = self.client.put(
            f'/api/trips/{self.token}/',
            data=json.dumps({
                'container_number': 'TGHU8888888',
                'seal_number': 'SEAL9999'
            }),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(res.status_code, 200)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.container_number, 'TGHU8888888')
        self.assertEqual(self.trip.seal_number, 'SEAL9999')

    def test_milestone_locking_and_rollback_rules(self):
        # 1. Nhảy cóc trái phép (từ DISPATCHED lên DROPOFF_COMPLETED) -> Bị chặn 400
        jump_res = self.client.post(
            f'/api/trips/{self.token}/milestones/',
            data=json.dumps({'milestone': 'DROPOFF_COMPLETED'}),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(jump_res.status_code, 400)

        # 2. Bước hợp lệ: Nhận chuyến (DISPATCHED -> ACCEPTED)
        res1 = self.client.post(
            f'/api/trips/{self.token}/milestones/',
            data=json.dumps({'milestone': 'ACCEPTED_TRIP'}),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(res1.status_code, 200)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, TripStatus.ACCEPTED)

        # 3. Bước tiếp: Xuất phát (ACCEPTED -> CONTAINER_PICKED)
        res2 = self.client.post(
            f'/api/trips/{self.token}/milestones/',
            data=json.dumps({'milestone': 'DEPARTED'}),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(res2.status_code, 200)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, TripStatus.CONTAINER_PICKED)

        # 4. Rollback 1 bước trước liền kề (CONTAINER_PICKED -> ACCEPTED)
        rollback_res = self.client.post(
            f'/api/trips/{self.token}/milestones/',
            data=json.dumps({'milestone': 'ACCEPTED_TRIP'}),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(rollback_res.status_code, 200)
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, TripStatus.ACCEPTED)

        # 5. Khóa tuyệt đối khi chuyến xe đã hoàn tất (COMPLETED)
        self.trip.status = TripStatus.COMPLETED
        self.trip.save(update_fields=['status'])

        lock_res = self.client.post(
            f'/api/trips/{self.token}/milestones/',
            data=json.dumps({'milestone': 'START_UNLOADING'}),
            content_type='application/json',
            HTTP_X_TRIP_HASH=self.token
        )
        self.assertEqual(lock_res.status_code, 400)
        self.assertIn("hoàn tất", lock_res.json().get('error', '').lower())


class QuotationEnterprisePrintAPITest(TestCase):
    """Kiểm thử tính năng Báo giá, Ghi chú điều khoản & Mẫu in Doanh Nghiệp."""

    def setUp(self):
        self.user = User.objects.create_superuser(username='sales_admin', email='sales@trienvo.com', password='password123')
        self.client.force_login(self.user)
        self.customer = Customer.objects.create(
            code='CUST_MOL',
            name='CÔNG TY TNHH MOL LOGISTICS VIỆT NAM',
            tax_code='0301234567',
            address='KCN VSIP 2, Bình Dương',
            contact_person='Mr. Nguyễn Văn A',
            phone='0987123456'
        )

    def test_create_and_retrieve_quotation_with_notes_and_template(self):
        # 1. Tạo Báo giá kèm Ghi chú điều khoản và Kiểu mẫu in
        payload = {
            'action': 'create_quotation',
            'customer': self.customer.name,
            'origin_zone': 'Cát Lái (TP.HCM)',
            'destination_zone': 'Bình Dương (VSIP 2)',
            'estimated_km': 35,
            'route_description': 'CÁT LÁI ➔ KCN VSIP 2 BÌNH DƯƠNG',
            'unit_price': 3800000,
            'monthly_trips': 20,
            'status': 'NEGOTIATING',
            'notes': '- Đơn giá chưa VAT 8%\n- Phí bốc xếp tại kho khách hàng\n- Neo xe sau 12h: 1.500.000 đ/đêm',
            'template_type': 'STANDARD',
            'contact_person': 'Mr. Nguyễn Văn A',
            'contact_phone': '0987123456',
            'cargo_type': 'Container 40HC'
        }
        res = self.client.post('/api/sales/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        quote_id = data.get('quotation_id')

        # 2. Truy xuất chi tiết Báo giá qua QuotationDetailAPIView
        detail_res = self.client.get(f'/api/quotations/{quote_id}/')
        self.assertEqual(detail_res.status_code, 200)
        q_data = detail_res.json()
        self.assertEqual(q_data['customer_name'], self.customer.name)
        self.assertEqual(q_data['template_type'], 'STANDARD')
        self.assertEqual(q_data['contact_person'], 'Mr. Nguyễn Văn A')
        self.assertEqual(q_data['cargo_type'], 'Container 40HC')
        self.assertIn('Neo xe sau 12h', q_data['notes'])
        self.assertEqual(q_data['unit_price'], 3800000.0)
        self.assertEqual(q_data['expected_revenue'], 76000000.0)
        self.assertEqual(q_data['estimated_km'], 40) # Tự động làm tròn bước 10km (35 -> 40km)

        # 3. Cập nhật đổi kiểu mẫu sang TABLE_MATRIX và sửa ghi chú
        update_payload = {
            'template_type': 'TABLE_MATRIX',
            'notes': 'Cập nhật ghi chú mẫu ma trận đối tác To/From'
        }
        put_res = self.client.put(f'/api/quotations/{quote_id}/', data=json.dumps(update_payload), content_type='application/json')
        self.assertEqual(put_res.status_code, 200)
        
        # 4. Kiểm tra trong danh sách Sales Overview
        sales_overview_res = self.client.get('/api/sales/')
        self.assertEqual(sales_overview_res.status_code, 200)
        quotes = sales_overview_res.json().get('quotations', [])
        found = [q for q in quotes if q['id'] == quote_id]
        self.assertTrue(len(found) > 0)
        self.assertEqual(found[0]['template_type'], 'TABLE_MATRIX')
        self.assertEqual(found[0]['customer_tax_code'], '0301234567')


class BookingDocumentNamingTestCase(TestCase):
    def setUp(self):
        from apps.customers.models import Customer, BookingOrder, BookingDocument
        from django.contrib.auth.models import User
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.client = Client()
        self.user = User.objects.create_superuser(username="admin_booking_test", password="password123")
        self.client.force_login(self.user)
        self.customer = Customer.objects.create(code="CUST_BK", name="Khách Hàng BK Test")

    def test_format_booking_attachment_filename(self):
        from core.validators import format_booking_attachment_filename
        from django.core.files.uploadedfile import SimpleUploadedFile
        file_obj = SimpleUploadedFile("bang_ke_hang_hoa.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 100, content_type="image/png")
        formatted = format_booking_attachment_filename(file_obj, "BK.2610.005")
        self.assertEqual(formatted.name, "BK.2610.005_bang_ke_hang_hoa.png")

        # Thử lại khi đã có prefix
        formatted_again = format_booking_attachment_filename(formatted, "BK.2610.005")
        self.assertEqual(formatted_again.name, "BK.2610.005_bang_ke_hang_hoa.png")

    def test_booking_detail_api_returns_clean_names_and_links(self):
        from apps.customers.models import BookingOrder, BookingDocument
        from django.core.files.uploadedfile import SimpleUploadedFile
        from core.validators import format_booking_attachment_filename

        booking = BookingOrder.objects.create(
            booking_code="BK.2610.099",
            customer=self.customer,
            booking_number="ONE1234567",
            shipping_line="ONE",
            selling_freight_price=4500000
        )
        fake_file = SimpleUploadedFile("bill_goc.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 100, content_type="image/png")
        format_booking_attachment_filename(fake_file, booking.booking_code)
        doc = BookingDocument.objects.create(
            booking=booking,
            file=fake_file,
            file_name=fake_file.name,
            file_size=fake_file.size
        )

        res = self.client.get(f'/api/bookings/{booking.id}/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['booking_code'], "BK.2610.099")
        self.assertEqual(data['documents_count'], 1)
        doc_data = data['documents'][0]
        self.assertTrue(doc_data['name'].startswith("BK.2610.099_"))
        self.assertEqual(doc_data['file_name'], doc_data['name'])
        self.assertTrue(bool(doc_data['url']))
        self.assertEqual(doc_data['file_url'], doc_data['url'])



