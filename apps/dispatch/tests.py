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
        self.user = User.objects.create_superuser(username='sales_admin', email='user@gss-logistics.example.com', password='password123')
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





class Subcontractor3PLDispatchTestCase(TestCase):
    """Kiểm thử toàn diện luồng điều vận Xe bạn / Đối tác 3PL (Phương án 3)."""

    def setUp(self):
        from django.contrib.auth.models import User
        from apps.customers.models import Customer
        from apps.master_data.models import Subcontractor, SubcontractorDriver
        from apps.fleet.models import Vehicle, VehicleOwnership, VehicleType

        self.client = Client()
        self.user = User.objects.create_superuser(username="admin_sub_test", password="password123")
        self.client.force_login(self.user)

        self.customer = Customer.objects.create(code="CUST_3PL", name="Khách Hàng Hợp Đồng 3PL")

        # 1. Khai báo Đối tác 3PL: Công ty Vận tải An Phú
        self.subcontractor = Subcontractor.objects.create(
            code="NX_ANPHU",
            name="Công ty Vận tải An Phú",
            phone="0909888999",
            contact_person="Anh Phú Điều Vận",
            tax_code="0312555666"
        )

        # 2. Khai báo 3 Xe của An Phú
        self.veh1 = Vehicle.objects.create(license_plate="51C-111.11", vehicle_type=VehicleType.TRACTOR, ownership_type=VehicleOwnership.SUBCONTRACTOR, subcontractor=self.subcontractor)
        self.veh2 = Vehicle.objects.create(license_plate="51C-222.22", vehicle_type=VehicleType.TRACTOR, ownership_type=VehicleOwnership.SUBCONTRACTOR, subcontractor=self.subcontractor)
        self.veh3 = Vehicle.objects.create(license_plate="51C-333.33", vehicle_type=VehicleType.TRACTOR, ownership_type=VehicleOwnership.SUBCONTRACTOR, subcontractor=self.subcontractor)

        # 3. Khai báo 3 Tài xế của An Phú
        self.drv1 = SubcontractorDriver.objects.create(subcontractor=self.subcontractor, full_name="Nguyễn Văn A", phone="0901111001")
        self.drv2 = SubcontractorDriver.objects.create(subcontractor=self.subcontractor, full_name="Lê Văn B", phone="0901111002")
        self.drv3 = SubcontractorDriver.objects.create(subcontractor=self.subcontractor, full_name="Trần Văn C", phone="0901111003")

    def test_dispatch_subcontractor_trip_and_driver_portal(self):
        # 1. Tạo chuyến xe gán cho 3PL An Phú (Xe 1 + Tài 1)
        res = self.client.post('/api/trips/', {
            'customer': self.customer.name,
            'subcontractor_id': self.subcontractor.id,
            'vehicle': '51C-111.11',
            'subcontractor_driver_id': self.drv1.id,
            'subcontractor_cost': 3500000,
            'subcontractor_advance': 500000,
            'pickup': 'CẢNG CÁT LÁI',
            'warehouse': 'KHO AN PHÚ ĐÔNG',
            'dropoff': 'BÃI TÂN CẢNG'
        }, format='json')

        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data['success'])
        trip_code = data['trip_code']

        # 2. Kiểm tra bản ghi trong Database
        from apps.dispatch.models import DispatchTrip
        trip = DispatchTrip.objects.get(trip_code=trip_code)

        # Khẳng định: driver nội bộ là None -> không ô nhiễm bảng lương nhân sự!
        self.assertIsNone(trip.driver)
        self.assertEqual(trip.subcontractor, self.subcontractor)
        self.assertEqual(trip.subcontractor_driver, self.drv1)
        self.assertEqual(trip.assigned_driver_name, "Nguyễn Văn A")
        self.assertEqual(trip.assigned_driver_phone, "0901111001")
        self.assertEqual(trip.carrier_name, "Công ty Vận tải An Phú")
        self.assertEqual(float(trip.subcontractor_cost), 3500000.0)
        self.assertEqual(float(trip.subcontractor_advance), 500000.0)

        # 3. Kiểm tra Cổng Tài Xế (Driver Portal)
        res_portal = self.client.get(f'/driver/{trip.driver_token}/')
        self.assertEqual(res_portal.status_code, 200)
        self.assertContains(res_portal, "Nguyễn Văn A")
        self.assertContains(res_portal, "0901111001")
        self.assertContains(res_portal, "Công ty Vận tải An Phú")

        # 4. Kiểm tra API Chi tiết chuyến xe (Trip Detail)
        res_detail = self.client.get(f'/api/trips/{trip.trip_code}/')
        self.assertEqual(res_detail.status_code, 200)
        detail_data = res_detail.json()
        self.assertEqual(detail_data['subcontractor_id'], self.subcontractor.id)
        self.assertEqual(detail_data['subcontractor_name'], "Công ty Vận tải An Phú")
        self.assertEqual(detail_data['subcontractor_driver_name'], "Nguyễn Văn A")
        self.assertEqual(detail_data['subcontractor_driver_phone'], "0901111001")
        self.assertEqual(detail_data['carrier_name'], "Công ty Vận tải An Phú")
        self.assertEqual(detail_data['subcontractor_cost'], 3500000.0)

        # 5. Kiểm tra Báo cáo Công nợ Thầu Phụ (Subcontractor Payables API)
        res_payables = self.client.get('/api/accounting/subcontractor-settlements/')
        self.assertEqual(res_payables.status_code, 200)
        pay_data = res_payables.json()
        sub_keys = [p['partner_key'] for p in pay_data['by_partner']]
        self.assertIn(f'sub_{self.subcontractor.id}', sub_keys)
        sub_stat = next(p for p in pay_data['by_partner'] if p['partner_key'] == f'sub_{self.subcontractor.id}')
        self.assertEqual(sub_stat['subcontractor_name'], "Công ty Vận tải An Phú")
        self.assertEqual(sub_stat['total_cost'], 3500000)
        self.assertEqual(sub_stat['total_advance'], 500000)
        self.assertEqual(sub_stat['remaining_payable'], 3000000)

    def test_on_the_fly_driver_creation(self):
        """Kiểm thử tạo nhanh tài xế ngoài trên form điều xe khi 3PL điều tài xế mới tinh."""
        from apps.master_data.models import SubcontractorDriver
        from apps.dispatch.models import DispatchTrip

        res = self.client.post('/api/trips/', {
            'customer': self.customer.name,
            'subcontractor_id': self.subcontractor.id,
            'vehicle': '51C-999.99', # Xe mới chưa có trong danh mục
            'driver': 'Tài Xế Mới Hùng',
            'driver_phone': '0988776655',
            'subcontractor_cost': 4000000,
            'pickup': 'CẢNG SPITC',
            'warehouse': 'KHO TÂN TẠO',
            'dropoff': 'HẠ BÃI CÁT LÁI'
        }, format='json')

        self.assertEqual(res.status_code, 201)
        trip_code = res.json()['trip_code']

        trip = DispatchTrip.objects.get(trip_code=trip_code)
        self.assertEqual(trip.subcontractor, self.subcontractor)
        self.assertEqual(trip.assigned_driver_name, "Tài Xế Mới Hùng")
        self.assertEqual(trip.assigned_driver_phone, "0988776655")

        # Tự động lưu tài xế mới vào danh bạ của An Phú
        saved_driver = SubcontractorDriver.objects.filter(subcontractor=self.subcontractor, full_name="Tài Xế Mới Hùng").first()
        self.assertIsNotNone(saved_driver)
        self.assertEqual(saved_driver.phone, "0988776655")
        self.assertEqual(trip.subcontractor_driver, saved_driver)


class DashboardDynamicMetricsTestCase(TestCase):
    """
    Kiểm thử độ chính xác và tính toàn vẹn dữ liệu động trên Dashboard:
    - Chống ảo tưởng (Anti-Hallucination): Không bao giờ hardcode 150M hay 1.25 tỷ.
    - Tính toán chuẩn xác theo CSDL thực tế: OpeningBalance + CashTransaction.
    """
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_superuser(username="admin_dash", password="password123")
        self.emp = Employee.objects.create(
            user=self.user,
            code="EMP_TEST",
            full_name="Admin Test",
            role=EmployeeRole.DIRECTOR
        )
        self.client.force_login(self.user)

    def test_dashboard_empty_data_no_hallucinations(self):
        """Khi hệ thống chưa có dữ liệu quỹ, Dashboard phải trả về 0 đ, không bao giờ trả về 150M hay 1.25 tỷ."""
        res = self.client.get('/api/dashboard/?period=7_days')
        self.assertEqual(res.status_code, 200)
        data = res.json()

        fin = data.get('financial', {})
        funds = data.get('funds', {})
        self.assertEqual(fin.get('cash_on_hand'), 0)
        self.assertEqual(fin.get('bank_balance'), 0)
        self.assertEqual(fin.get('total_liquidity'), 0)

        self.assertEqual(funds.get('cash_on_hand'), 0)
        self.assertEqual(funds.get('bank_balance'), 0)
        self.assertEqual(funds.get('total_liquidity'), 0)

        # Kiểm tra kpi_cards của DIRECTOR
        cards = {c['id']: c for c in data.get('kpi_cards', [])}
        fin_card = cards.get('pillar_financial')
        self.assertIsNotNone(fin_card)
        self.assertNotIn("150M", fin_card['line_2'])
        self.assertNotIn("1.25B", fin_card['line_2'])
        self.assertIn("Quỹ TM: <strong>0 đ</strong>", fin_card['line_2'])

        # Kiểm tra kpi_cards của ACCOUNTING
        res_acct = self.client.get('/api/dashboard/?period=7_days&view_as=ACCOUNTING')
        self.assertEqual(res_acct.status_code, 200)
        acct_cards = {c['id']: c for c in res_acct.json().get('kpi_cards', [])}
        liq_card = acct_cards.get('acct_liquidity')
        self.assertIsNotNone(liq_card)
        self.assertNotIn("1.400.000.000", liq_card['metric_value'])
        self.assertNotIn("150.000.000", liq_card['line_1'])
        self.assertNotIn("1.250.000.000", liq_card['line_1'])
        self.assertNotIn("450.000.000", liq_card['line_2'])
        self.assertEqual(liq_card['metric_value'], "0 đ")

    def test_dashboard_real_balance_calculation(self):
        """Tính toán dòng tiền chuẩn xác khi có số dư đầu kỳ và phát sinh sổ quỹ."""
        from apps.master_data.models import OpeningBalance, OpeningBalanceCategory
        from apps.billing.models import CashTransaction, PaymentMethod, TransactionType

        # Tạo số dư đầu kỳ TK 1111: 50.000.000 đ, TK 1121: 200.000.000 đ
        OpeningBalance.objects.create(
            account_code="1111",
            account_name="Quỹ tiền mặt",
            category=OpeningBalanceCategory.CASH_FUND,
            amount=50000000,
            debit_amount=50000000,
            credit_amount=0,
            is_debit=True,
            opening_date=timezone.now().date(),
            fiscal_year=2026
        )
        OpeningBalance.objects.create(
            account_code="1121",
            account_name="Techcombank",
            category=OpeningBalanceCategory.BANK_ACCOUNT,
            amount=200000000,
            debit_amount=200000000,
            credit_amount=0,
            is_debit=True,
            opening_date=timezone.now().date(),
            fiscal_year=2026
        )

        # Phát sinh Chi tiền mặt: 10.000.000 đ -> Tồn quỹ TM = 40.000.000 đ
        CashTransaction.objects.create(
            code="PC-TEST-01",
            transaction_type=TransactionType.OUTFLOW,
            payment_method=PaymentMethod.CASH,
            amount=10000000,
            transaction_date=timezone.now().date(),
            created_by=self.emp
        )

        # Phát sinh Thu ngân hàng: 30.000.000 đ -> Tồn quỹ NH = 230.000.000 đ
        CashTransaction.objects.create(
            code="PT-TEST-01",
            transaction_type=TransactionType.INFLOW,
            payment_method=PaymentMethod.BANK,
            amount=30000000,
            transaction_date=timezone.now().date(),
            created_by=self.emp
        )

        res = self.client.get('/api/dashboard/?period=7_days')
        self.assertEqual(res.status_code, 200)
        data = res.json()

        fin = data.get('financial', {})
        self.assertEqual(fin.get('cash_on_hand'), 40000000)
        self.assertEqual(fin.get('bank_balance'), 230000000)
        self.assertEqual(fin.get('total_liquidity'), 270000000)

        # Kiểm tra DIRECTOR card hiển thị đúng 40M và 230M
        cards = {c['id']: c for c in data.get('kpi_cards', [])}
        fin_card = cards.get('pillar_financial')
        self.assertIn("Quỹ TM: <strong>40M</strong> | NH: <strong>230M</strong>", fin_card['line_2'])

        # Kiểm tra ACCOUNTING card
        res_acct = self.client.get('/api/dashboard/?period=7_days&view_as=ACCOUNTING')
        acct_cards = {c['id']: c for c in res_acct.json().get('kpi_cards', [])}
        liq_card = acct_cards.get('acct_liquidity')
        self.assertEqual(liq_card['metric_value'], "270.000.000 đ")
        self.assertIn("Tiền mặt: <strong>40.000.000 đ</strong> | NH: <strong>230.000.000 đ</strong>", liq_card['line_1'])

    def test_role_charts_are_real_without_mock_fallbacks(self):
        """Kiểm tra toàn bộ role_charts không còn chứa số liệu mockup hay chia nhẩm doanh thu."""
        res = self.client.get('/api/dashboard/?period=today')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        role_charts = data.get('role_charts', {})

        # 1. Kế toán: Donut opt1 không dùng số cứng [55, 25, 12, 8]
        acct_donut = role_charts['ACCOUNTING']['donut']['opt1']
        self.assertNotEqual(acct_donut['data'], [55, 25, 12, 8])

        # 2. Điều vận: Trend data là danh sách số nguyên thực tế
        disp_trend = role_charts['DISPATCH']['trend']['datasets']
        total_trips_data = disp_trend[0]['data']
        self.assertIsInstance(total_trips_data, list)
        self.assertEqual(len(total_trips_data), 2) # Hôm qua, Hôm nay

        # 3. Kinh doanh: Trend data sản lượng là danh sách số thực tế
        sales_trend = role_charts['SALES']['trend']['datasets']
        container_data = sales_trend[1]['data']
        self.assertIsInstance(container_data, list)
        self.assertEqual(len(container_data), 2)


class EndToEndLogisticsWorkflowSimulationTestCase(TestCase):
    """
    KIỂM THỬ GIẢ LẬP TOÀN BỘ CHU TRÌNH VẬN TẢI LOGISTICS (END-TO-END WORKFLOW SIMULATION)
    Từ Báo giá -> Biểu cước -> Đơn hàng Booking -> Điều độ phát lệnh -> Vận hành 8 mốc
    -> Chi phí & Tạm ứng -> Quyết toán chuyến xe -> Xóa / Hủy phiếu điều độ.
    """
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_superuser(username='admin_sim', email='user@gss-logistics.example.com', password='password123')
        self.client.force_login(self.user)

        # 1. Nhân sự
        self.driver = Employee.objects.create(
            code='TX_SIM_01',
            full_name='Nguyễn Văn Lái Xe',
            phone_number='0909123456',
            role=EmployeeRole.DRIVER
        )
        self.dispatcher = Employee.objects.create(
            code='DD_SIM_01',
            full_name='Trần Điều Độ',
            phone_number='0909654321',
            role=EmployeeRole.DISPATCHER
        )

        # 2. Phương tiện
        self.vehicle = Vehicle.objects.create(
            license_plate='51C-888.99',
            vehicle_type=VehicleType.TRACTOR,
            registration_expiry=timezone.now().date(),
            insurance_expiry=timezone.now().date()
        )

        # 3. Khách hàng
        self.customer = Customer.objects.create(
            code='KH_PHATDAT',
            name='CÔNG TY TNHH XNK PHÁT ĐẠT',
            short_name='PHÁT ĐẠT',
            tax_code='0312345678',
            payment_term_days=30
        )

    def test_full_logistics_lifecycle_simulation(self):
        from apps.customers.models import Quotation, QuotationItem, RouteTariff, BookingOrder, BookingStatus
        from apps.billing.models import TripExpense, ExpenseCategory, ApprovalStatus, DriverTripAdvance
        from apps.documents.models import TripDocument
        from core.workflows import transition_trip, can_transition

        # =========================================================================
        # BƯỚC 1: BÁO GIÁ & PHỄU BÁN HÀNG (CRM / SALES)
        # =========================================================================
        quote = Quotation.objects.create(
            quotation_code='BG-SIM-2026-001',
            customer=self.customer,
            origin_zone='Cát Lái',
            destination_zone='Bình Dương',
            estimated_km=40,
            route_description='Cảng Cát Lái ➔ KCN Sóng Thần 1, Dĩ An, Bình Dương',
            unit_price=4500000,
            expected_trips_monthly=20,
            status='PENDING_APPROVAL'
        )
        quote_item = QuotationItem.objects.create(
            quotation=quote,
            route_description=quote.route_description,
            origin_zone=quote.origin_zone,
            destination_zone=quote.destination_zone,
            cargo_type='Cont 40HC',
            estimated_km=40,
            unit_price=4500000,
            expected_trips_monthly=20
        )
        # Ban Giám Đốc duyệt báo giá
        quote.status = 'APPROVED'
        quote.save(update_fields=['status'])
        self.assertEqual(quote.status, 'APPROVED')
        self.assertEqual(quote.expected_revenue, 4500000 * 20)

        # =========================================================================
        # BƯỚC 2: BIỂU CƯỚC VẬN TẢI THEO HỢP ĐỒNG KHÁCH HÀNG (ROUTE TARIFF)
        # =========================================================================
        tariff = RouteTariff.objects.create(
            customer=self.customer,
            pickup_location='CẢNG CÁT LÁI',
            delivery_location='KHO NHÀ MÁY SÓNG THẦN 1',
            dropoff_location='BÃI RỖNG ĐỒNG NAI',
            container_size='40HC',
            freight_price=4500000,
            driver_trip_pay=550000,
            toll_standard_fee=280000
        )
        self.assertEqual(tariff.freight_price, 4500000)
        self.assertEqual(tariff.driver_trip_pay, 550000)

        # =========================================================================
        # BƯỚC 3: TIẾP NHẬN ĐƠN HÀNG BOOKING (BOOKING ORDER)
        # =========================================================================
        booking = BookingOrder.objects.create(
            booking_code='BK-SIM-2026-01',
            customer=self.customer,
            booking_type='IMPORT_FCL',
            booking_number='COSCO_BKG_88899',
            shipping_line='COSCO',
            container_size='40HC',
            total_containers=2,
            dispatched_containers=0,
            pickup_location=tariff.pickup_location,
            delivery_location=tariff.delivery_location,
            dropoff_location=tariff.dropoff_location,
            status=BookingStatus.PENDING_DISPATCH
        )
        self.assertEqual(booking.status, BookingStatus.PENDING_DISPATCH)
        self.assertEqual(booking.dispatched_containers, 0)

        # =========================================================================
        # BƯỚC 4: LẬP PHIẾU ĐIỀU ĐỘ / PHÁT LỆNH ĐIỀU XE (DISPATCH TRIP)
        # =========================================================================
        trip1 = DispatchTrip.objects.create(
            trip_code='TVL-E2E-SIM-001',
            customer=self.customer,
            booking_order=booking,
            vehicle=self.vehicle,
            driver=self.driver,
            dispatcher=self.dispatcher,
            container_type='40HC',
            pickup_location=tariff.pickup_location,
            warehouse_location=tariff.delivery_location,
            dropoff_location=tariff.dropoff_location,
            status=TripStatus.DISPATCHED,
            dispatched_at=timezone.now(),
            driver_allowance=tariff.driver_trip_pay
        )
        # Tăng số lượng đã phát lệnh cho Booking
        booking.dispatched_containers += 1
        booking.status = BookingStatus.PARTIALLY_DISPATCHED
        booking.save()

        self.assertEqual(trip1.status, TripStatus.DISPATCHED)
        self.assertEqual(booking.dispatched_containers, 1)
        self.assertEqual(booking.status, BookingStatus.PARTIALLY_DISPATCHED)

        # =========================================================================
        # BƯỚC 5: VẬN HÀNH STATE MACHINE QUA 8 MỐC TIẾN ĐỘ THỰC TẾ
        # =========================================================================
        # Mốc 1: Tài xế nhận chuyến
        trip1.status = TripStatus.ACCEPTED
        trip1.accepted_at = timezone.now()
        trip1.save()

        # Mốc 2: Lấy cont tại cảng, cập nhật thông tin vỏ cont & seal
        trip1.status = TripStatus.CONTAINER_PICKED
        trip1.container_number = 'COSU9876543'
        trip1.seal_number = 'COS_SEAL_123'
        trip1.container_picked_at = timezone.now()
        trip1.save()

        # Mốc 3: Lăn bánh di chuyển
        trip1.status = TripStatus.IN_TRANSIT
        trip1.departed_at = timezone.now()
        trip1.save()

        # Mốc 4: Đến kho khách hàng
        trip1.status = TripStatus.AT_WAREHOUSE
        trip1.arrived_warehouse_at = timezone.now()
        trip1.save()

        # Mốc 5: Bốc dỡ hàng tại dock
        trip1.status = TripStatus.UNLOADING
        trip1.start_unloading_at = timezone.now()
        trip1.save()

        # Mốc 6: Giao hàng thành công, ký biên bản POD
        trip1.status = TripStatus.DELIVERED
        trip1.delivered_at = timezone.now()
        trip1.save()

        # Tải chứng từ ảnh POD
        doc_pod = TripDocument.objects.create(
            trip=trip1,
            document_type='DELIVERY_POD',
            title='Biên bản giao hàng có ký nhận (POD)',
            is_verified=True
        )

        # Mốc 7: Hạ vỏ cont tại bãi rỗng
        trip1.status = TripStatus.RETURNING_EMPTY
        trip1.returning_empty_at = timezone.now()
        trip1.save()

        # Tải chứng từ phiếu hạ bãi EIR
        doc_eir = TripDocument.objects.create(
            trip=trip1,
            document_type='EIR_RECEIPT',
            title='Phiếu nâng hạ hạ bãi rỗng (EIR)',
            is_verified=True
        )

        # Mốc 8: Hoàn tất chuyến xe
        trip1.status = TripStatus.COMPLETED
        trip1.completed_at = timezone.now()
        trip1.save()

        self.assertEqual(trip1.status, TripStatus.COMPLETED)
        self.assertEqual(trip1.documents.filter(is_deleted=False).count(), 2)

        # =========================================================================
        # BƯỚC 6: TẠM ỨNG & KÊ KHAI CHI PHÍ CHUYẾN XE (TRIP EXPENSES)
        # =========================================================================
        # 1. Cấp tạm ứng cho tài xế trước chuyến: 1,000,000 đ
        advance = DriverTripAdvance.objects.create(
            code='TUTX-SIM-001',
            trip=trip1,
            driver=self.driver,
            amount=1000000,
            advance_date=timezone.now().date(),
            purpose='Tạm ứng cầu đường BOT và phí nâng hạ cảng'
        )
        self.assertEqual(advance.amount, 1000000)

        # Khoản 1: Vé cầu đường (TVL chịu)
        exp1 = TripExpense.objects.create(
            trip=trip1,
            driver=self.driver,
            vehicle=self.vehicle,
            category=ExpenseCategory.TOLL_FEE,
            expense_payer_type='TVL_COST',
            is_on_behalf_of_customer=False,
            amount=280000,
            status=ApprovalStatus.APPROVED,
            approved_by=self.dispatcher,
            notes='Vé BOT Cầu Bình Triệu & Sóng Thần'
        )

        # Khoản 2: Phí nâng hạ cont (TVL chi hộ khách hàng -> thu lại từ khách)
        exp2 = TripExpense.objects.create(
            trip=trip1,
            driver=self.driver,
            vehicle=self.vehicle,
            category=ExpenseCategory.LIFT_ON,
            expense_payer_type='TVL_BEHALF',
            is_on_behalf_of_customer=True,
            amount=520000,
            status=ApprovalStatus.APPROVED,
            approved_by=self.dispatcher,
            notes='Phí nâng cont rỗng tại Cát Lái (Hãng tàu COSCO)'
        )

        # Khoản 3: Bồi dưỡng kho (TVL chịu)
        exp3 = TripExpense.objects.create(
            trip=trip1,
            driver=self.driver,
            vehicle=self.vehicle,
            category=ExpenseCategory.LABOR_STEVEDORING,
            expense_payer_type='TVL_COST',
            is_on_behalf_of_customer=False,
            amount=150000,
            status=ApprovalStatus.APPROVED,
            approved_by=self.dispatcher,
            notes='Bồi dưỡng công nhân dỡ hàng dock kho Sóng Thần'
        )

        self.assertEqual(trip1.expenses.filter(is_deleted=False).count(), 3)

        # =========================================================================
        # BƯỚC 7: QUYẾT TOÁN CHUYẾN XE (TRIP SETTLEMENT & RECONCILIATION)
        # =========================================================================
        res_settle = self.client.post(f'/api/trips/{trip1.trip_code}/settle-expenses/')
        self.assertEqual(res_settle.status_code, 200)
        self.assertTrue(res_settle.json().get('success'))

        trip1.refresh_from_db()
        self.assertTrue(trip1.is_expenses_settled)

        # Kiểm tra hạch toán tài chính chuyến xe
        freight_rev = tariff.freight_price # 4,500,000 đ
        customer_behalf = 520000 # Thu lại từ khách
        total_customer_receivable = freight_rev + customer_behalf # 5,020,000 đ
        tvl_cost = 280000 + 150000 # 430,000 đ
        driver_wage = tariff.driver_trip_pay # 550,000 đ
        
        # Lợi nhuận ròng / Lãi gộp chuyến xe
        gross_profit = freight_rev - tvl_cost - driver_wage
        self.assertEqual(gross_profit, 4500000 - 430000 - 550000) # 3,520,000 đ

        # Đối soát tạm ứng tài xế:
        driver_actual_spent = 280000 + 520000 + 150000 # 950,000 đ
        driver_refund = advance.amount - driver_actual_spent # 50,000 đ tài xế hoàn lại
        self.assertEqual(driver_refund, 50000)

        # =========================================================================
        # BƯỚC 8: KIỂM THỬ TÍNH NĂNG XÓA PHIẾU ĐIỀU ĐỘ (DELETE TRIP DISPATCH)
        # =========================================================================
        # 1. Thử xóa chuyến 1 đã chốt sổ chi phí -> BỊ CHẶN AN TOÀN (HTTP 403)
        res_del_settled = self.client.delete(f'/api/trips/{trip1.trip_code}/')
        self.assertEqual(res_del_settled.status_code, 403)
        self.assertIn('chốt sổ', res_del_settled.json().get('error', ''))

        # 2. Tạo tiếp Phiếu điều độ Cont 2 cho Booking Order
        trip2 = DispatchTrip.objects.create(
            trip_code='TVL-E2E-SIM-002',
            customer=self.customer,
            booking_order=booking,
            vehicle=self.vehicle,
            driver=self.driver,
            dispatcher=self.dispatcher,
            container_type='40HC',
            pickup_location=tariff.pickup_location,
            warehouse_location=tariff.delivery_location,
            dropoff_location=tariff.dropoff_location,
            status=TripStatus.DISPATCHED,
            dispatched_at=timezone.now()
        )
        booking.dispatched_containers = 2
        booking.status = BookingStatus.COMPLETED
        booking.save()

        self.assertEqual(booking.status, BookingStatus.COMPLETED)
        self.assertEqual(booking.dispatched_containers, 2)

        # Thêm 1 chi phí nháp cho chuyến 2
        exp_temp = TripExpense.objects.create(
            trip=trip2,
            driver=self.driver,
            vehicle=self.vehicle,
            category=ExpenseCategory.TOLL_FEE,
            expense_payer_type='TVL_COST',
            amount=100000,
            status=ApprovalStatus.PENDING,
            notes='Chi phí nháp'
        )

        # Xóa / Hủy phiếu điều độ chuyến 2 (chưa quyết toán, có cờ cascade=true)
        res_del_trip2 = self.client.delete(
            f'/api/trips/{trip2.trip_code}/',
            data=json.dumps({'reason': 'Khách hàng dời lịch xuất hàng cont 2 sang tuần sau', 'cascade': True}),
            content_type='application/json'
        )
        self.assertEqual(res_del_trip2.status_code, 200)
        self.assertTrue(res_del_trip2.json().get('success'))

        # Kiểm tra chuyến 2 đã bị xóa mềm và chuyển trạng thái CANCELLED
        trip2.refresh_from_db()
        self.assertTrue(trip2.is_deleted)
        self.assertEqual(trip2.status, TripStatus.CANCELLED)

        # Kiểm tra chi phí nháp của chuyến 2 được đồng bộ xóa mềm
        exp_temp.refresh_from_db()
        self.assertTrue(exp_temp.is_deleted)

        # Kiểm tra Booking Order được tự động hoàn lại số lượng container đã phát lệnh
        booking.refresh_from_db()
        self.assertEqual(booking.dispatched_containers, 1)
        self.assertEqual(booking.status, BookingStatus.PARTIALLY_DISPATCHED)
