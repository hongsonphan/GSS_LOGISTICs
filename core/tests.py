import datetime
import io
import json
from django.test import TestCase
from django.test.client import MULTIPART_CONTENT, encode_multipart, BOUNDARY
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.customers.models import Customer, RouteTariff, Quotation, BookingOrder, BookingStatus
from apps.fleet.models import Vehicle, VehicleType, VehicleStatus, Trailer, VehicleOwnership
from apps.personnel.models import Employee, Department, EmployeeRole
from apps.dispatch.models import DispatchTrip, ShipmentType, TripStatus
from apps.billing.models import (
    TripExpense,
    ExpenseCategory,
    ApprovalStatus,
    ReimbursementStatus,
    CashTransaction,
    TransactionType,
    PaymentMethod,
    CashFlowCategory,
)
from core.workflows import transition_trip, can_transition
from core.validators import validate_uploaded_document

class BimLogisticsCoreTestCase(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(
            code="CUST_TEST",
            name="CÔNG TY TEST VẬN TẢI",
            address="KCN Sóng Thần"
        )

        # 1. Tài khoản Tài xế
        self.driver_user = User.objects.create_user(username="driver_test", password="Password@2026")
        self.driver = Employee.objects.create(
            user=self.driver_user,
            code="TX_TEST",
            full_name="Nguyễn Văn Test",
            nickname="TÀI XẾ TEST",
            phone_number="0909999888",
            department=Department.FLEET,
            role=EmployeeRole.DRIVER,
            base_salary=5000000
        )

        # 2. Tài khoản Điều độ viên
        self.dispatcher_user = User.objects.create_user(username="dispatcher_test", password="Password@2026")
        self.dispatcher = Employee.objects.create(
            user=self.dispatcher_user,
            code="DD_TEST",
            full_name="Trần Điều Độ Test",
            department=Department.DISPATCH,
            role=EmployeeRole.DISPATCHER
        )

        # 3. Tài khoản Giám đốc
        self.director_user = User.objects.create_user(username="director_test", password="Password@2026")
        self.director = Employee.objects.create(
            user=self.director_user,
            code="BGD_TEST",
            full_name="Lê Giám Đốc Test",
            department=Department.MANAGEMENT,
            role=EmployeeRole.DIRECTOR
        )

        # 4. Tài khoản Kế toán
        self.accountant_user = User.objects.create_user(username="accountant_test", password="Password@2026")
        self.accountant = Employee.objects.create(
            user=self.accountant_user,
            code="KT_TEST",
            full_name="Phạm Kế Toán Test",
            department=Department.ACCOUNTING,
            role=EmployeeRole.ACCOUNTANT
        )

        self.vehicle = Vehicle.objects.create(
            license_plate="51C-999.99",
            vehicle_type=VehicleType.TRACTOR,
            registration_expiry=datetime.date(2026, 12, 31),
            status=VehicleStatus.IDLE,
            current_driver=self.driver
        )
        self.tariff = RouteTariff.objects.create(
            customer=self.customer,
            pickup_location="CÁT LÁI",
            delivery_location="KHO TEST",
            freight_price=4000000,
            driver_trip_pay=500000
        )
        self.trip = DispatchTrip.objects.create(
            trip_code="TVL-TEST-001",
            customer=self.customer,
            vehicle=self.vehicle,
            driver=self.driver,
            dispatcher=self.dispatcher,
            pickup_location="CÁT LÁI",
            warehouse_location="KHO TEST",
            dropoff_location="HẠ BÃI",
            status=TripStatus.DRAFT,
            cached_revenue=4000000,
            cached_expense=0,
            cached_profit=4000000,
            cached_margin_percent=100.0
        )

        # Mặc định client xác thực với tư cách Điều độ viên
        self.client.force_login(self.dispatcher_user)

    def test_soft_delete_preserves_data(self):
        """Kiểm tra nguyên tắc No Hard-Delete: xóa mềm không làm mất dữ liệu."""
        trip_id = self.trip.id
        self.trip.delete()

        # Không còn xuất hiện trong objects.all()
        self.assertEqual(DispatchTrip.objects.filter(id=trip_id).count(), 0)

        # Nhưng vẫn tồn tại trong all_objects và is_deleted=True
        trip_in_db = DispatchTrip.all_objects.get(id=trip_id)
        self.assertTrue(trip_in_db.is_deleted)
        self.assertIsNotNone(trip_in_db.deleted_at)

    def test_state_machine_transitions(self):
        """Kiểm tra máy trạng thái 10 bước nghiêm ngặt."""
        # DRAFT -> DISPATCHED (Hợp lệ)
        transition_trip(self.trip, TripStatus.DISPATCHED, actor=self.dispatcher)
        self.assertEqual(self.trip.status, TripStatus.DISPATCHED)

        # DISPATCHED -> ACCEPTED (Hợp lệ)
        transition_trip(self.trip, TripStatus.ACCEPTED, actor=self.driver)
        self.assertEqual(self.trip.status, TripStatus.ACCEPTED)
        self.assertIsNotNone(self.trip.actual_start_time)

        # ACCEPTED -> COMPLETED (Không hợp lệ vì nhảy cóc)
        with self.assertRaises(ValidationError):
            transition_trip(self.trip, TripStatus.COMPLETED, actor=self.driver)

    def test_expense_and_financials_auto_calculation(self):
        """Kiểm tra tính toán tự động P&L chuyến khi có chi phí phát sinh."""
        # Thêm chi phí BOT 200.000 đ (Đã duyệt)
        TripExpense.objects.create(
            trip=self.trip,
            category=ExpenseCategory.BOT_TOLL,
            amount=200000,
            status=ApprovalStatus.APPROVED
        )

        self.trip.refresh_from_db()
        self.assertEqual(self.trip.cached_expense, 200000)
        self.assertEqual(self.trip.cached_profit, 3800000)
        self.assertEqual(float(self.trip.cached_margin_percent), 95.0)

    def test_dashboard_api(self):
        """Kiểm tra API Ban Giám Đốc phản hồi HTTP 200 và cấu trúc dữ liệu chuẩn khi có quyền Giám Đốc."""
        self.client.force_login(self.director_user)
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('funds', data)
        self.assertIn('productivity', data)
        self.assertIn('fleet', data)
        self.assertIn('trips_pnl', data)

    def test_create_trip_api(self):
        """Kiểm tra API tạo lệnh điều động mới với quyền Điều Độ."""
        payload = {
            'customer': 'CÔNG TY MỚI',
            'type': 'Xuất',
            'pickup': 'SPITC',
            'warehouse': 'KHO BÌNH DƯƠNG',
            'dropoff': 'CÁT LÁI',
            'driver': 'TÀI XẾ TEST',
            'container': 'CONT1234567',
            'seal': 'SL999',
            'booking': 'BK888',
            'notes': 'Hàng gấp'
        }
        response = self.client.post('/api/trips/', data=payload, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertTrue(DispatchTrip.objects.filter(container_number='CONT1234567').exists())

    def test_document_deduplication_and_cross_check(self):
        """Kiểm tra tính năng khử trùng lặp chứng từ/chi phí và đối chiếu chéo."""
        from django.core.management import call_command
        from apps.documents.models import TripDocument, DocumentType

        # Tạo 3 chứng từ giống hệt nhau (mô phỏng seed bị lặp)
        for _ in range(3):
            TripDocument.objects.create(
                trip=self.trip,
                document_type=DocumentType.EIR_PICKUP,
                title="Phiếu EIR Lấy Cont Rỗng AP-622 No 0034976",
                ocr_raw_text="Cont: CSNU 8011022 - Seal: 34192379",
                is_verified=True
            )

        # Kiểm tra trước khi dọn: có 3 chứng từ
        self.assertEqual(TripDocument.objects.filter(trip=self.trip).count(), 3)

        # Kiểm tra API defensive deduplication: chỉ trả về 1 chứng từ
        response = self.client.get(f'/api/trips/{self.trip.trip_code}/')
        self.assertEqual(response.status_code, 200)
        docs_in_api = response.json().get('documents', [])
        self.assertEqual(len(docs_in_api), 1)

        # Chạy command dọn dẹp DB
        call_command('deduplicate_data')

        # Sau khi dọn dẹp: DB chỉ còn đúng 1 chứng từ
        self.assertEqual(TripDocument.objects.filter(trip=self.trip).count(), 1)

    # ==========================================================================
    # CÁC TEST CASE BẢO MẬT MỚI (SECURITY AUDIT TEST SUITE)
    # ==========================================================================
    def test_security_unauthenticated_blocked(self):
        """Tiêu chuẩn 11: Kiểm tra người dùng chưa đăng nhập bị chặn (HTTP 401)."""
        self.client.logout()
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, 401)

    def test_security_rbac_driver_cannot_settle_expenses(self):
        """Tiêu chuẩn 11: Tài xế không có quyền chốt sổ kế toán (Bị từ chối HTTP 403)."""
        self.client.force_login(self.driver_user)
        response = self.client.post(f'/api/trips/{self.trip.trip_code}/settle-expenses/')
        self.assertEqual(response.status_code, 403)

    def test_security_accountant_can_settle_expenses(self):
        """Tiêu chuẩn 11: Kế toán viên có quyền chốt sổ chi phí thành công (HTTP 200)."""
        self.client.force_login(self.accountant_user)
        response = self.client.post(f'/api/trips/{self.trip.trip_code}/settle-expenses/')
        self.assertEqual(response.status_code, 200)
        self.trip.refresh_from_db()
        self.assertTrue(self.trip.is_expenses_settled)

    def test_security_file_upload_validation_blocks_malicious_files(self):
        """Tiêu chuẩn 7: Chặn tệp mã độc giả dạng ảnh (VD: file script .sh hoặc giả đuôi .png)."""
        fake_content = b"#!/bin/bash\necho 'Hacked'"
        fake_file = SimpleUploadedFile("hack.sh", fake_content, content_type="application/x-sh")
        
        with self.assertRaises(ValidationError):
            validate_uploaded_document(fake_file)

        # Tệp giả mạo đuôi .png nhưng nội dung là text
        fake_png = SimpleUploadedFile("fake_photo.png", b"NOT_A_REAL_PNG_FILE", content_type="image/png")
        with self.assertRaises(ValidationError):
            validate_uploaded_document(fake_png)

    def test_login_page_renders_successfully(self):
        """Kiểm tra trang đăng nhập HTML phản hồi HTTP 200 và render form."""
        self.client.logout()
        response = self.client.get('/login/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Đăng nhập hệ thống')
        self.assertContains(response, 'BIM LOGISTICS')

    def test_login_post_success_and_logout(self):
        """Kiểm tra đăng nhập thành công cấp Session và JWT token."""
        self.client.logout()
        response = self.client.post('/login/', {
            'username': 'director_test',
            'password': 'Password@2026',
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'localStorage.setItem')

        # Kiểm tra đăng xuất
        logout_res = self.client.get('/logout/')
        self.assertEqual(logout_res.status_code, 200)
        self.assertContains(logout_res, 'localStorage.removeItem')

    def test_login_post_failure_shows_error(self):
        """Kiểm tra đăng nhập sai mật khẩu hiển thị thông báo lỗi."""
        self.client.logout()
        response = self.client.post('/login/', {
            'username': 'admin',
            'password': 'WrongPassword!',
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Tên đăng nhập hoặc mật khẩu không chính xác.')

    def test_unauthenticated_user_redirected_to_login(self):
        """Kiểm tra người dùng chưa đăng nhập khi vào trang chủ (/) bị chuyển hướng sang /login/."""
        self.client.logout()
        response = self.client.get('/')
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login/', response.url)

    def test_driver_can_view_any_trip_detail_safe_method(self):
        """Kiểm tra tài xế nội bộ được phép xem thông tin chi tiết (GET) bất kỳ chuyến xe nào."""
        # Tạo 1 chuyến xe thuộc tài xế khác
        other_driver = Employee.objects.create(
            code='TX999',
            full_name='Tài xế Khác',
            phone_number='0999999999',
            department=Department.FLEET,
            role=EmployeeRole.DRIVER
        )
        other_trip = DispatchTrip.objects.create(
            trip_code='TVL-TEST-OTHER',
            customer=self.customer,
            vehicle=self.vehicle,
            driver=other_driver,
            dispatcher=self.dispatcher,
            pickup_location='Cảng Cát Lái',
            warehouse_location='Kho ICD',
            status=TripStatus.DISPATCHED
        )
        self.client.force_login(self.driver_user)
        response = self.client.get(f'/api/trips/{other_trip.trip_code}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get('id'), 'TVL-TEST-OTHER')

    def test_driver_cannot_modify_other_trip_milestone(self):
        """Tiêu chuẩn 10: Chống IDOR - Tài xế BỊ TỪ CHỐI (HTTP 403) khi gửi cập nhật tiến độ cho chuyến xe của tài xế khác."""
        other_driver = Employee.objects.create(
            code='TX888',
            full_name='Tài xế 888',
            phone_number='0988888888',
            department=Department.FLEET,
            role=EmployeeRole.DRIVER
        )
        other_trip = DispatchTrip.objects.create(
            trip_code='TVL-TEST-IDOR',
            customer=self.customer,
            vehicle=self.vehicle,
            driver=other_driver,
            dispatcher=self.dispatcher,
            pickup_location='Cảng Cát Lái',
            warehouse_location='Kho ICD',
            status=TripStatus.DISPATCHED
        )
        self.client.force_login(self.driver_user)
        response = self.client.post(f'/api/trips/{other_trip.trip_code}/milestones/', {
            'milestone': 'APPROACHING_WAREHOUSE',
            'notes': 'Hack test'
        })
        self.assertEqual(response.status_code, 403)

    def test_trip_detail_api_handles_null_foreign_keys_defensively(self):
        """Defensive Backend: Đảm bảo chuyến xe thiếu điều độ / rơ-moóc / xe hạ vẫn xem chi tiết được 200 OK."""
        null_trip = DispatchTrip.objects.create(
            trip_code='TVL-TEST-NULL',
            customer=self.customer,
            vehicle=self.vehicle,
            driver=self.driver,
            dispatcher=None,
            trailer=None,
            pickup_location='Điểm lấy',
            warehouse_location='Điểm giao',
            status=TripStatus.DRAFT
        )
        self.client.force_login(self.dispatcher_user)
        response = self.client.get(f'/api/trips/{null_trip.trip_code}/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get('customer'), self.customer.name)
        self.assertEqual(data.get('driver'), self.driver.nickname or self.driver.full_name)
        self.assertEqual(data.get('vehicle'), self.vehicle.license_plate)
        self.assertEqual(data.get('dropoff_vehicle'), '-')

    def test_drop_and_hook_split_trip_tracking_in_booking(self):
        """Kiểm thử Nghiệp Vụ Cắt Kéo (Drop & Hook) theo chuẩn TMS: 2 tài xế khác nhau lấy & hạ cont, theo dõi xuyên suốt trong Booking."""
        from apps.customers.models import BookingOrder, BookingStatus

        # 1. Tạo Booking 2 cont từ Sale
        booking = BookingOrder.objects.create(
            booking_code="BK-TEST-DROP-HOOK-01",
            customer=self.customer,
            booking_number="BK-EXP-9999",
            container_size="40HC",
            total_containers=2,
            dispatched_containers=0,
            pickup_location="CẢNG CÁT LÁI",
            delivery_location="KHO TÂN VẠN",
            dropoff_location="ICD SÓNG THẦN",
            selling_freight_price=4500000,
            status=BookingStatus.PENDING_DISPATCH
        )

        # 2. Tạo Tài xế 2 (Hạ cont) & Xe 2 (Xe hạ)
        leg2_user = User.objects.create_user(username="driver_leg2_test", password="Password@2026")
        leg2_driver = Employee.objects.create(
            user=leg2_user,
            code="TX_LEG2",
            full_name="Lê Minh Hải",
            nickname="MINH HẢI",
            department=Department.FLEET,
            role=EmployeeRole.DRIVER
        )
        leg2_vehicle = Vehicle.objects.create(
            license_plate="51D-999.88",
            vehicle_type=VehicleType.TRACTOR,
            registration_expiry=datetime.date(2026, 12, 31),
            status=VehicleStatus.IDLE,
            current_driver=leg2_driver
        )

        # 3. Điều độ phát lệnh điều xe ở chế độ Cắt Kéo (Drop & Hook)
        self.client.force_login(self.dispatcher_user)
        payload = {
            'booking_order_id': booking.id,
            'customer': self.customer.name,
            'type': 'Xuất',
            'container_type': '40HC',
            'container': 'TGHU9998887',
            'booking': booking.booking_number,
            'seal': 'SL-99988',
            'pickup': booking.pickup_location,
            'warehouse': booking.delivery_location,
            'dropoff': booking.dropoff_location,
            'is_split_trip': True,
            'driver': self.driver.nickname,
            'dropoff_driver': leg2_driver.nickname,
            'dropoff_vehicle': leg2_vehicle.license_plate,
            'driver_split_ratio': 60.0,
            'notes': 'Cắt mooc tại kho Tân Vạn D2'
        }
        res_create = self.client.post('/api/trips/', payload, content_type='application/json')
        self.assertEqual(res_create.status_code, 201)
        trip_code = res_create.json()['trip_code']

        # 4. Kiểm tra dữ liệu chuyến xe lưu trong database
        created_trip = DispatchTrip.objects.get(trip_code=trip_code)
        self.assertTrue(created_trip.is_split_trip)
        self.assertEqual(created_trip.driver, self.driver)
        self.assertEqual(created_trip.dropoff_driver, leg2_driver)
        self.assertEqual(created_trip.dropoff_vehicle, leg2_vehicle)
        self.assertEqual(float(created_trip.driver_split_ratio), 60.0)

        # 5. Kiểm tra API Chi tiết Booking trả về danh sách container kèm thông tin cắt kéo
        res_booking = self.client.get(f'/api/bookings/{booking.id}/')
        self.assertEqual(res_booking.status_code, 200)
        bk_data = res_booking.json()
        self.assertEqual(len(bk_data['trips']), 1)
        trip_in_bk = bk_data['trips'][0]
        self.assertTrue(trip_in_bk['is_split_trip'])
        self.assertEqual(trip_in_bk['driver'], self.driver.nickname)
        self.assertEqual(trip_in_bk['dropoff_driver'], leg2_driver.nickname)
        self.assertEqual(trip_in_bk['dropoff_vehicle'], leg2_vehicle.license_plate)

        # 6. Kiểm tra API Bảng kê Bán Hàng / Sales API hiển thị cờ Cắt Kéo
        res_sales = self.client.get('/api/sales/')
        self.assertEqual(res_sales.status_code, 200)
        sales_data = res_sales.json()
        matched_bk = next((b for b in sales_data['bookings'] if b['id'] == booking.id), None)
        self.assertIsNotNone(matched_bk)
        self.assertTrue(matched_bk['has_drop_hook'])
        self.assertEqual(matched_bk['drop_hook_count'], 1)

    def test_master_data_form_options_api(self):
        """Kiểm tra API Form Options Master Data trả về đầy đủ khách hàng, tài xế, xe, rơ-mooc."""
        Trailer.objects.create(
            license_plate="51R-888.99",
            trailer_type="MOOC_XUONG_40",
            payload_capacity_kg=32000,
            registration_expiry=datetime.date(2026, 12, 31)
        )
        self.client.force_login(self.dispatcher_user)
        res = self.client.get('/api/master-data/form-options/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('customers', data)
        self.assertIn('locations', data)
        self.assertIn('drivers', data)
        self.assertIn('vehicles', data)
        self.assertIn('trailers', data)
        self.assertTrue(len(data['trailers']) >= 1)
        self.assertEqual(data['trailers'][0]['plate'], "51R-888.99")

    def test_security_hashids_and_clean_urls(self):
        """Tiêu chuẩn 10: Kiểm tra mã hóa HashID và Clean Semantic SPA URLs."""
        from core.security import get_trip_hashid, decode_trip_hashid, encode_id, decode_id
        
        # 1. Kiểm tra tính toàn vẹn của mã hóa HashID
        trip = self.trip
        self.assertIsNotNone(trip.hashid)
        self.assertTrue(len(trip.hashid) >= 8)
        self.assertEqual(get_trip_hashid(trip.id), trip.hashid)
        self.assertEqual(decode_trip_hashid(trip.hashid), trip.id)

        # 2. Kiểm tra giải mã chuỗi rác/không hợp lệ trả về None an toàn
        self.assertIsNone(decode_trip_hashid("INVALID_HASH_XYZ"))
        self.assertIsNone(decode_trip_hashid(""))

        # 3. Kiểm tra API xem chi tiết chuyến xe bằng HashID bảo mật
        self.client.force_login(self.dispatcher_user)
        res_by_hash = self.client.get(f'/api/trips/{trip.hashid}/')
        self.assertEqual(res_by_hash.status_code, 200)
        data = res_by_hash.json()
        self.assertEqual(data['id'], trip.trip_code)
        self.assertEqual(data['hashid'], trip.hashid)

        # 4. Kiểm tra Clean Semantic SPA Routes trả về HTTP 200 (không bị 404 khi F5)
        clean_routes = [
            '/dashboard/',
            '/dispatch/',
            f'/dispatch/trips/{trip.hashid}/',
            '/sales/',
            '/fleet/',
            '/hr/',
            '/accounting/',
            '/customs/',
            '/settings/',
        ]
        for route in clean_routes:
            resp = self.client.get(route)
            self.assertEqual(resp.status_code, 200, f"Đường dẫn {route} không phản hồi HTTP 200")

    def test_trip_create_with_specific_leg_vehicles(self):
        """Kiểm tra tạo chuyến xe Cắt Kéo với việc lưu chính xác đầu kéo Chặng 1 và Chặng 2."""
        self.client.force_login(self.dispatcher_user)
        
        v1 = Vehicle.objects.create(
            license_plate="61S-999.00",
            vehicle_type=VehicleType.TRACTOR,
            registration_expiry=datetime.date(2026, 12, 31),
            current_driver=self.driver
        )
        v2 = Vehicle.objects.create(
            license_plate="50E-095.78",
            vehicle_type=VehicleType.TRACTOR,
            registration_expiry=datetime.date(2026, 12, 31)
        )

        payload = {
            'customer': self.customer.name,
            'type': 'Nhập',
            'container_type': '40HC',
            'container': 'BIMU9988776',
            'booking': 'BKG-SPEC-001',
            'seal': 'SEAL-SPEC-99',
            'cutoff': 'SI 12:00',
            'pickup': 'CẢNG CÁT LÁI',
            'warehouse': 'KHO TÂN VẠN',
            'dropoff': 'ICD SOWATCO',
            'is_split_trip': True,
            'driver': self.driver.nickname or self.driver.full_name,
            'vehicle': '61S-999.00',
            'dropoff_driver': self.driver.nickname or self.driver.full_name,
            'dropoff_vehicle': '50E-095.78',
            'driver_split_ratio': 50,
            'notes': 'Test lệnh điều động Cắt Kéo thực tế'
        }

        res = self.client.post('/api/trips/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 201)
        res_data = res.json()
        self.assertTrue(res_data['success'])
        trip_code = res_data['trip_code']

        trip = DispatchTrip.objects.get(trip_code=trip_code)
        self.assertEqual(trip.vehicle.license_plate, "61S-999.00")
        self.assertEqual(trip.dropoff_vehicle.license_plate, "50E-095.78")
        self.assertTrue(trip.is_split_trip)
        self.assertEqual(float(trip.driver_split_ratio), 50.0)

        # Kiểm tra API GET chi tiết trả về đúng xe 2 chặng và hashid
        res_get = self.client.get(f'/api/trips/{trip.hashid}/')
        self.assertEqual(res_get.status_code, 200)
        detail = res_get.json()
        self.assertEqual(detail['vehicle'], "61S-999.00")
        self.assertEqual(detail['dropoff_vehicle'], "50E-095.78")
        self.assertTrue(detail['is_split_trip'])

    def test_twin_container_creation_and_detail(self):
        """Kiểm tra tạo chuyến xe Chở Ghép 2 Cont 20ft (Twin 20ft Drayage) & Giám định EIR."""
        self.client.force_login(self.dispatcher_user)

        payload = {
            'customer': self.customer.name,
            'type': 'Nhập',
            'container_type': '2x20DC',
            'is_twin_container': True,
            'container': 'TCLU1234567',
            'seal': 'SL-001',
            'booking': 'BKG-TWIN-001',
            'vgm_weight': '24.0 Tấn',
            'container_2': 'TCLU7654321',
            'seal_2': 'SL-002',
            'booking_2': 'BKG-TWIN-002',
            'vgm_weight_2': '22.5 Tấn',
            'cargo_notes_2': 'Cont 2 dỡ sau tại dock D2',
            'pickup': 'CẢNG CÁT LÁI',
            'warehouse': 'KHO TÂN VẠN',
            'dropoff': 'HẠ BÃI',
            'driver': self.driver.nickname or self.driver.full_name,
            'det_free_days': 5,
            'dem_free_days': 4,
            'container_condition': 'DAMAGED',
            'damage_description': 'Rách nóc cont 10cm có xác nhận bãi'
        }

        res = self.client.post('/api/trips/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 201)
        res_data = res.json()
        self.assertTrue(res_data['success'])
        trip_code = res_data['trip_code']

        trip = DispatchTrip.objects.get(trip_code=trip_code)
        self.assertTrue(trip.is_twin_container)
        self.assertEqual(trip.container_number, "TCLU1234567")
        self.assertEqual(trip.container_number_2, "TCLU7654321")
        self.assertEqual(trip.seal_number_2, "SL-002")
        self.assertEqual(trip.booking_or_bill_2, "BKG-TWIN-002")
        self.assertEqual(trip.vgm_weight_2, "22.5 Tấn")
        self.assertEqual(trip.container_type, "2x20DC")
        self.assertEqual(trip.det_free_days, 5)
        self.assertIsNotNone(trip.det_expiry_date)
        self.assertEqual(trip.container_condition, "DAMAGED")
        self.assertEqual(trip.damage_description, "Rách nóc cont 10cm có xác nhận bãi")

        # Kiểm tra GET chi tiết trả về đầy đủ các trường Cont 2 và DEM/DET
        res_detail = self.client.get(f'/api/trips/{trip.hashid}/')
        self.assertEqual(res_detail.status_code, 200)
        detail = res_detail.json()
        self.assertTrue(detail['is_twin_container'])
        self.assertEqual(detail['container_2'], "TCLU7654321")
        self.assertEqual(detail['seal_2'], "SL-002")
        self.assertEqual(detail['booking_2'], "BKG-TWIN-002")
        self.assertEqual(detail['vgm_weight_2'], "22.5 Tấn")
        self.assertEqual(detail['container_condition'], "DAMAGED")
        self.assertIn('det_status', detail)
        self.assertEqual(detail['det_status']['status'], 'SAFE')

        # Kiểm tra tìm kiếm chuyến xe bằng số Container 2
        res_search = self.client.get('/api/trips/?q=TCLU7654321')
        self.assertEqual(res_search.status_code, 200)
        search_data = res_search.json()
        self.assertGreaterEqual(len(search_data['trips']), 1)
        self.assertEqual(search_data['trips'][0]['id'], trip.trip_code)

    def test_dem_det_status_calculation(self):
        """Kiểm tra logic tính toán cảnh báo quá hạn DEM/DET."""
        from apps.dispatch.api_views import calculate_dem_det_status
        from datetime import date, timedelta

        today = date.today()

        # 1. Quá hạn (OVERDUE)
        self.trip.det_expiry_date = today - timedelta(days=2)
        status_overdue = calculate_dem_det_status(self.trip)
        self.assertEqual(status_overdue['status'], 'OVERDUE')
        self.assertEqual(status_overdue['days_remaining'], -2)

        # 2. Hạn chót hôm nay (TODAY)
        self.trip.det_expiry_date = today
        status_today = calculate_dem_det_status(self.trip)
        self.assertEqual(status_today['status'], 'TODAY')
        self.assertEqual(status_today['days_remaining'], 0)

        # 3. Còn 1 ngày (WARNING)
        self.trip.det_expiry_date = today + timedelta(days=1)
        status_warn = calculate_dem_det_status(self.trip)
        self.assertEqual(status_warn['status'], 'WARNING')
        self.assertEqual(status_warn['days_remaining'], 1)

        # 4. Còn 2 ngày (ATTENTION)
        self.trip.det_expiry_date = today + timedelta(days=2)
        status_attn = calculate_dem_det_status(self.trip)
        self.assertEqual(status_attn['status'], 'ATTENTION')
        self.assertEqual(status_attn['days_remaining'], 2)

        # 5. Còn > 2 ngày (SAFE)
        self.trip.det_expiry_date = today + timedelta(days=5)
        status_safe = calculate_dem_det_status(self.trip)
        self.assertEqual(status_safe['status'], 'SAFE')
        self.assertEqual(status_safe['days_remaining'], 5)

    def test_resolve_customer_and_quotation_booking_crud(self):
        """Kiểm tra phân giải khách hàng dạng 'Name (Code)' và luồng Lưu Báo Giá / Booking."""
        from apps.dispatch.api_views import resolve_customer
        from apps.customers.models import Quotation, BookingOrder

        self.client.force_login(self.director_user)

        # 1. Tạo thêm khách hàng thứ hai để đối chứng
        cust2 = Customer.objects.create(
            code="CUST_20260921094535",
            name="ABC",
            address="KCN Sóng Thần 2"
        )

        # 2. Test resolve_customer
        self.assertEqual(resolve_customer(f"{cust2.name} ({cust2.code})"), cust2)
        self.assertEqual(resolve_customer(cust2.code), cust2)
        self.assertEqual(resolve_customer(cust2.name), cust2)
        self.assertEqual(resolve_customer(str(cust2.id)), cust2)
        self.assertEqual(resolve_customer(self.customer.code), self.customer)

        # 3. Test Tạo Báo Giá với tên khách hàng dạng dropdown label 'ABC (CUST_20260921094535)'
        res_quote = self.client.post('/api/sales/', {
            'action': 'create_quotation',
            'customer': f"{cust2.name} ({cust2.code})",
            'route_description': 'CAT LAI - BINH DUONG',
            'unit_price': 3800000,
            'monthly_trips': 20,
            'status': 'NEGOTIATING'
        }, content_type='application/json')
        self.assertEqual(res_quote.status_code, 200)
        quote_id = res_quote.json()['quotation_id']
        quote = Quotation.objects.get(id=quote_id)
        self.assertEqual(quote.customer, cust2)
        self.assertEqual(quote.route_description, 'CAT LAI - BINH DUONG')
        self.assertEqual(float(quote.unit_price), 3800000.0)

        # 4. Test Cập nhật Báo Giá (PUT /api/quotations/<id>/)
        res_update_quote = self.client.put(f'/api/quotations/{quote_id}/', {
            'customer': self.customer.name,
            'route_description': 'CAT LAI - KCN SONG THAN',
            'unit_price': 4200000,
            'monthly_trips': 25,
            'status': 'APPROVED'
        }, content_type='application/json')
        self.assertEqual(res_update_quote.status_code, 200)
        quote.refresh_from_db()
        self.assertEqual(quote.customer, self.customer)
        self.assertEqual(quote.route_description, 'CAT LAI - KCN SONG THAN')
        self.assertEqual(float(quote.unit_price), 4200000.0)
        self.assertEqual(quote.status, 'APPROVED')

        # 5. Test Tạo Booking với tên khách hàng dạng dropdown label
        res_bk = self.client.post('/api/sales/', {
            'action': 'create_booking',
            'customer': f"{cust2.name} ({cust2.code})",
            'booking_number': 'BK-TEST-999',
            'shipping_line': 'ONE',
            'container_size': '40HC',
            'total_containers': 2,
            'pickup_location': 'CÁT LÁI',
            'delivery_location': 'KHO TEST',
            'dropoff_location': 'HẠ BÃI',
            'selling_freight_price': 4500000,
            'status': 'PENDING_DISPATCH'
        }, content_type='application/json')
        self.assertEqual(res_bk.status_code, 200)
        bk_id = res_bk.json()['booking_id']
        bk = BookingOrder.objects.get(id=bk_id)
        self.assertEqual(bk.customer, cust2)
        self.assertEqual(bk.booking_number, 'BK-TEST-999')

        # 6. Test Cập nhật Booking (PUT /api/bookings/<id>/ - kiểm tra không bị lỗi NameError: data)
        res_update_bk = self.client.put(f'/api/bookings/{bk_id}/', {
            'customer': self.customer.name,
            'booking_number': 'BK-TEST-999-UPDATED',
            'selling_freight_price': 4800000
        }, content_type='application/json')
        self.assertEqual(res_update_bk.status_code, 200)
        bk.refresh_from_db()
        self.assertEqual(bk.customer, self.customer)
        self.assertEqual(bk.booking_number, 'BK-TEST-999-UPDATED')
        self.assertEqual(float(bk.selling_freight_price), 4800000.0)

    def test_booking_file_upload_and_inheritance(self):
        """Kiểm tra đính kèm file Booking (PDF/Ảnh) khi Tạo lệnh điều động & Kế thừa từ BookingOrder."""
        from apps.customers.models import BookingOrder, BookingStatus
        from apps.documents.models import TripDocument, DocumentType

        self.client.force_login(self.director_user)

        # 1. Tạo chuyến mới kèm file PDF booking
        pdf_content = b"%PDF-1.4\n%test pdf content for booking file\n%%EOF"
        pdf_file = SimpleUploadedFile("booking_customer_abc.pdf", pdf_content, content_type="application/pdf")

        res = self.client.post('/api/trips/', {
            'customer': self.customer.name,
            'type': 'Xuất',
            'container': 'TCLU9876543',
            'booking': 'BKG-TEST-PDF',
            'seal': 'SEAL123',
            'pickup': 'CÁT LÁI',
            'warehouse': 'KHO TEST',
            'dropoff': 'HẠ BÃI',
            'driver': self.driver.nickname,
            'booking_file': pdf_file
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data.get('success'))
        trip_code = data.get('trip_code')
        self.assertTrue(trip_code)

        trip = DispatchTrip.objects.get(trip_code=trip_code)
        self.assertTrue(trip.booking_file)
        self.assertTrue(trip.booking_file.name.endswith('.pdf'))

        # Tự động tạo bản ghi chứng từ pháp lý TripDocument loại BOOKING_NOTE
        doc = TripDocument.objects.filter(trip=trip, document_type=DocumentType.BOOKING_NOTE).first()
        self.assertIsNotNone(doc)
        self.assertEqual(doc.extracted_container_no, 'TCLU9876543')
        self.assertTrue(doc.is_verified)

        # Kiểm tra API Detail trả về file_url và booking_file_url
        res_detail = self.client.get(f'/api/trips/{trip_code}/')
        self.assertEqual(res_detail.status_code, 200)
        detail_data = res_detail.json()
        self.assertTrue(detail_data.get('booking_file_url'))
        self.assertTrue(any(d['type'] == 'BOOKING_NOTE' and d.get('file_url') for d in detail_data.get('documents', [])))

        # 2. Tạo BookingOrder ở Sales có đính kèm file hình ảnh (PNG hợp lệ)
        from PIL import Image
        img_buf = io.BytesIO()
        Image.new('RGB', (20, 20), color='green').save(img_buf, format='PNG')
        png_content = img_buf.getvalue()
        png_file = SimpleUploadedFile("booking_image_order.png", png_content, content_type="image/png")

        res_sale = self.client.post('/api/sales/', {
            'action': 'create_booking',
            'customer': self.customer.name,
            'booking_number': 'BKG-INHERIT-99',
            'shipping_line': 'MAERSK',
            'container_size': '40HC',
            'total_containers': 1,
            'pickup_location': 'CÁT LÁI',
            'delivery_location': 'KHO TEST',
            'dropoff_location': 'HẠ BÃI',
            'selling_freight_price': 4200000,
            'status': 'PENDING_DISPATCH',
            'booking_file': png_file
        })
        self.assertEqual(res_sale.status_code, 200)
        sale_bk_id = res_sale.json()['booking_id']
        booking_order = BookingOrder.objects.get(id=sale_bk_id)
        self.assertTrue(booking_order.booking_file)
        self.assertTrue(booking_order.booking_file.name.endswith('.png'))

        # 3. Kế thừa file Booking từ BookingOrder khi Tạo Lệnh Điều Động (không cần tải lại file)
        res_trip_inherited = self.client.post('/api/trips/', {
            'booking_order_id': booking_order.id,
            'customer': self.customer.name,
            'type': 'Xuất',
            'container': 'MSKU1122334',
            'seal': 'SEAL999',
            'pickup': 'CÁT LÁI',
            'warehouse': 'KHO TEST',
            'dropoff': 'HẠ BÃI',
            'driver': self.driver.nickname
        })
        self.assertEqual(res_trip_inherited.status_code, 201)
        trip2_code = res_trip_inherited.json()['trip_code']
        trip2 = DispatchTrip.objects.get(trip_code=trip2_code)
        self.assertTrue(trip2.booking_file)
        self.assertEqual(trip2.booking_file.name, booking_order.booking_file.name)

        doc2 = TripDocument.objects.filter(trip=trip2, document_type=DocumentType.BOOKING_NOTE).first()
        self.assertIsNotNone(doc2)
        self.assertTrue(doc2.file_path.endswith('.png'))

        # 4. Kiểm tra từ chối file độc hại hoặc sai định dạng (.exe)
        bad_file = SimpleUploadedFile("danger.exe", b"MZexecutable_test", content_type="application/octet-stream")
        res_bad = self.client.post('/api/trips/', {
            'customer': self.customer.name,
            'type': 'Nhập',
            'pickup': 'CÁT LÁI',
            'warehouse': 'KHO TEST',
            'driver': self.driver.nickname,
            'booking_file': bad_file
        })
        self.assertEqual(res_bad.status_code, 400)
        self.assertIn('không được hỗ trợ', res_bad.json().get('error', ''))

    # =========================================================================
    # GIẢ LẬP TOÀN DIỆN TẤT CẢ CÁC TÍNH NĂNG (SIMULATION TEST SUITE - GOAL MODE)
    # =========================================================================

    def test_simulation_sales_and_booking_full_flow(self):
        """Giả lập toàn diện: Tạo báo giá -> Sửa báo giá -> Duyệt -> Đổi thành Booking -> Sửa Booking kèm file -> Đổi trạng thái -> Xóa."""
        self.client.force_login(self.director_user)

        # 1. Tạo Báo Giá Tuyến Cước Mới
        res_create_quote = self.client.post('/api/sales/', {
            'action': 'create_quotation',
            'customer': self.customer.name,
            'route_description': 'Cát Lái -> KCN Sóng Thần -> Depot Tân Vạn',
            'container_type': '40HC',
            'unit_price': 3800000,
            'monthly_trips': 25,
            'valid_until': (datetime.date.today() + datetime.timedelta(days=30)).strftime('%Y-%m-%d'),
            'notes': 'Báo giá FTL hàng hạt nhựa',
            'status': 'NEGOTIATING'
        }, content_type='application/json')
        self.assertEqual(res_create_quote.status_code, 200)
        quote_id = res_create_quote.json()['quotation_id']
        quote = Quotation.objects.get(id=quote_id)
        self.assertEqual(quote.status, 'NEGOTIATING')

        # 2. Sửa Báo Giá (Hiệu chỉnh đơn giá & sản lượng)
        res_edit_quote = self.client.put(f'/api/quotations/{quote_id}/', data=json.dumps({
            'customer': self.customer.name,
            'route_description': 'Cát Lái -> KCN Sóng Thần -> Cát Lái (Khứ hồi)',
            'container_type': '40HC',
            'unit_price': 4000000,
            'expected_trips_monthly': 30,
            'valid_until': (datetime.date.today() + datetime.timedelta(days=45)).strftime('%Y-%m-%d'),
            'notes': 'Đã đàm phán lại giá khứ hồi'
        }), content_type='application/json')
        self.assertEqual(res_edit_quote.status_code, 200)
        quote.refresh_from_db()
        self.assertEqual(quote.unit_price, 4000000)

        # 3. Đổi trạng thái Báo Giá -> Duyệt (APPROVED)
        res_approve_quote = self.client.patch(f'/api/quotations/{quote_id}/', data=json.dumps({
            'status': 'APPROVED'
        }), content_type='application/json')
        self.assertEqual(res_approve_quote.status_code, 200)
        quote.refresh_from_db()
        self.assertEqual(quote.status, 'APPROVED')

        # 4. Tiếp nhận Đơn Hàng / Booking từ khách hàng
        res_booking = self.client.post('/api/sales/', data=json.dumps({
            'action': 'create_booking',
            'customer': self.customer.name,
            'booking_number': 'BL-TEST-998877',
            'shipping_line': 'ONE',
            'total_containers': 5,
            'pickup_location': 'CÁT LÁI',
            'delivery_location': 'KHO SÓNG THẦN'
        }), content_type='application/json')
        self.assertEqual(res_booking.status_code, 200)
        booking_id = res_booking.json()['booking_id']
        booking = BookingOrder.objects.get(id=booking_id)
        self.assertEqual(booking.booking_number, 'BL-TEST-998877')
        self.assertEqual(booking.remaining_containers, 5)

        # 5. Sửa Đơn Hàng Booking kèm Đính kèm File Bill/Booking
        test_pdf = SimpleUploadedFile("bill_lading.pdf", b"%PDF-1.4 test booking order", content_type="application/pdf")
        edit_payload = {
            'customer': self.customer.name,
            'booking_number': 'BL-TEST-998877-UPDATED',
            'shipping_line': 'MAERSK',
            'booking_type': 'IMPORT_FCL',
            'container_size': '40HC',
            'total_containers': 8,
            'selling_freight_price': 4200000,
            'pickup_location': 'CẢNG CÁT LÁI',
            'delivery_location': 'KHO SÓNG THẦN 1',
            'dropoff_location': 'DEPOT TÂN VẠN',
            'dem_free_days': 10,
            'det_free_days': 7,
            'booking_file': test_pdf
        }
        res_edit_booking = self.client.put(
            f'/api/bookings/{booking_id}/', 
            data=encode_multipart(BOUNDARY, edit_payload), 
            content_type=MULTIPART_CONTENT
        )
        self.assertEqual(res_edit_booking.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.booking_number, 'BL-TEST-998877-UPDATED')
        self.assertEqual(booking.total_containers, 8)
        self.assertTrue(booking.booking_file)

        # 6. Đổi trạng thái Booking -> Đã Điều Vận (DISPATCHED)
        res_status_bk = self.client.patch(f'/api/bookings/{booking_id}/', data=json.dumps({
            'status': 'DISPATCHED'
        }), content_type='application/json')
        self.assertEqual(res_status_bk.status_code, 200)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'DISPATCHED')

        # 7. Xóa Booking (Soft-delete)
        res_del_bk = self.client.delete(f'/api/bookings/{booking_id}/')
        self.assertEqual(res_del_bk.status_code, 200)
        booking.refresh_from_db()
        self.assertTrue(booking.is_deleted)

    def test_simulation_dispatch_trip_and_editing(self):
        """Giả lập toàn diện: Tạo lệnh điều động -> Sửa thông tin lệnh điều động -> Chuyển 7 mốc trạng thái -> Báo mốc kho."""
        self.client.force_login(self.dispatcher_user)

        # 1. Tạo Lệnh Điều Động Mới
        res_trip = self.client.post('/api/trips/', {
            'customer': self.customer.name,
            'type': 'Xuất',
            'container': 'TGHU1122334',
            'seal': 'SEAL-001',
            'pickup': 'CÁT LÁI',
            'warehouse': 'KHO BÌNH DƯƠNG',
            'dropoff': 'HẠ BÃI CẢNG',
            'driver': self.driver.nickname,
            'vehicle': self.vehicle.license_plate
        })
        self.assertEqual(res_trip.status_code, 201)
        trip_code = res_trip.json()['trip_code']
        trip = DispatchTrip.objects.get(trip_code=trip_code)

        # 2. SỬA LỆNH ĐIỀU ĐỘNG (Hiệu chỉnh container, seal, vị trí, ghi chú qua PATCH)
        res_patch_trip = self.client.patch(f'/api/trips/{trip_code}/', data=json.dumps({
            'container': 'TGHU9988776',
            'seal': 'SEAL-999-VIP',
            'booking': 'BKG-REVISED-2026',
            'pickup': 'CẢNG SP-ITC',
            'warehouse': 'KHO BÌNH DƯƠNG 2',
            'dropoff': 'DEPOT TÂN CẢNG',
            'notes': 'Yêu cầu kiểm tra kỹ chốt khóa rơ-moóc trước khi xuất bến'
        }), content_type='application/json')
        self.assertEqual(res_patch_trip.status_code, 200)
        trip.refresh_from_db()
        self.assertEqual(trip.container_number, 'TGHU9988776')
        self.assertEqual(trip.seal_number, 'SEAL-999-VIP')
        self.assertEqual(trip.pickup_location, 'CẢNG SP-ITC')
        self.assertEqual(trip.special_notes, 'Yêu cầu kiểm tra kỹ chốt khóa rơ-moóc trước khi xuất bến')

        # 3. Chuyển đổi trạng thái qua các bước chuẩn logistics
        self.client.force_login(self.driver_user)
        # Tài xế nhận lệnh (PATCH status: ACCEPTED)
        res_accept = self.client.patch(f'/api/trips/{trip_code}/', data=json.dumps({
            'status': 'ACCEPTED'
        }), content_type='application/json')
        self.assertEqual(res_accept.status_code, 200)

        # Tài xế lấy cont (PATCH status: CONTAINER_PICKED)
        res_picked = self.client.patch(f'/api/trips/{trip_code}/', data=json.dumps({
            'status': 'CONTAINER_PICKED'
        }), content_type='application/json')
        self.assertEqual(res_picked.status_code, 200)

        # Báo mốc thời gian kho 1-chạm (driverReportMilestone ARRIVED_WAREHOUSE)
        res_milestone = self.client.post(f'/api/trips/{trip_code}/milestones/', data=json.dumps({
            'milestone': 'ARRIVED_WAREHOUSE'
        }), content_type='application/json')
        self.assertEqual(res_milestone.status_code, 200)
        trip.refresh_from_db()
        self.assertEqual(trip.status, TripStatus.AT_WAREHOUSE)

    def test_simulation_expenses_and_settlement_workflow(self):
        """Giả lập toàn diện: Thêm chi phí -> Chi hộ KH -> Sửa chi phí -> Khóa sổ -> Chặn sửa/xóa khi khóa -> Mở khóa sổ."""
        self.client.force_login(self.dispatcher_user)

        trip = DispatchTrip.objects.create(
            trip_code="SIM-EXP-001",
            customer=self.customer,
            shipment_type=ShipmentType.EXPORT,
            status=TripStatus.DISPATCHED,
            driver=self.driver,
            vehicle=self.vehicle,
            cached_revenue=5000000
        )

        # 1. Thêm khoản chi Nâng cont
        res_add_exp1 = self.client.post(f'/api/trips/{trip.trip_code}/expenses/', data=json.dumps({
            'category': 'LIFT_ON',
            'amount': 450000,
            'invoice_number': 'HD-LIFTON-01',
            'invoice_lookup_code': 'LK001',
            'notes': 'Phí nâng cont rỗng tại Depot Tân Cảng'
        }), content_type='application/json')
        self.assertEqual(res_add_exp1.status_code, 200)
        exp1_id = res_add_exp1.json()['expense_id']

        # 2. Thêm khoản chi Chi hộ Khách hàng (is_on_behalf_of_customer = True)
        res_add_exp2 = self.client.post(f'/api/trips/{trip.trip_code}/expenses/', data=json.dumps({
            'category': 'CONTAINER_DEPOSIT',
            'amount': 2000000,
            'is_on_behalf_of_customer': True,
            'notes': 'Tiền cược cont hãng tàu ONE - Cty chi hộ thu lại KH'
        }), content_type='application/json')
        self.assertEqual(res_add_exp2.status_code, 200)
        exp2_id = res_add_exp2.json()['expense_id']

        trip.refresh_from_db()
        # Chi phí vận hành công ty chỉ gồm 450.000đ (khoản 2.000.000đ chi hộ tách riêng)
        self.assertEqual(trip.cached_expense, 450000)

        # 3. Hiệu chỉnh chi phí (sửa số tiền và số HĐĐT)
        res_edit_exp1 = self.client.put(f'/api/trips/{trip.trip_code}/expenses/{exp1_id}/', data=json.dumps({
            'category': 'LIFT_ON',
            'amount': 480000,
            'invoice_number': 'HD-LIFTON-01-REVISED',
            'notes': 'Điều chỉnh giá nâng theo biểu phí mới'
        }), content_type='application/json')
        self.assertEqual(res_edit_exp1.status_code, 200)
        trip.refresh_from_db()
        self.assertEqual(trip.cached_expense, 480000)

        # 4. KHÓA SỔ KẾ TOÁN (Chốt sổ bảng kê)
        self.client.force_login(self.accountant_user)
        res_settle = self.client.post(f'/api/trips/{trip.trip_code}/settle-expenses/')
        self.assertEqual(res_settle.status_code, 200)
        trip.refresh_from_db()
        self.assertTrue(trip.is_expenses_settled)

        # 5. Kiểm tra phòng thủ (Defensive Security): Cấm thêm, sửa, xóa khi đã chốt sổ
        res_add_blocked = self.client.post(f'/api/trips/{trip.trip_code}/expenses/', data=json.dumps({
            'category': 'TOLL_FEE', 'amount': 100000
        }), content_type='application/json')
        self.assertEqual(res_add_blocked.status_code, 403)

        res_edit_blocked = self.client.put(f'/api/trips/{trip.trip_code}/expenses/{exp1_id}/', data=json.dumps({
            'amount': 999999
        }), content_type='application/json')
        self.assertEqual(res_edit_blocked.status_code, 403)

        res_del_blocked = self.client.delete(f'/api/trips/{trip.trip_code}/expenses/{exp1_id}/')
        self.assertEqual(res_del_blocked.status_code, 403)

        # 6. MỞ KHÓA SỔ KẾ TOÁN (Unsettle)
        res_unsettle = self.client.post(f'/api/trips/{trip.trip_code}/unsettle-expenses/')
        self.assertEqual(res_unsettle.status_code, 200)
        trip.refresh_from_db()
        self.assertFalse(trip.is_expenses_settled)

        # 7. Xóa khoản chi phí sau khi mở khóa (Thao tác thành công, Soft-delete an toàn)
        res_del_ok = self.client.delete(f'/api/trips/{trip.trip_code}/expenses/{exp2_id}/')
        self.assertEqual(res_del_ok.status_code, 200)
        exp2 = TripExpense.all_objects.get(id=exp2_id)
        self.assertTrue(exp2.is_deleted)

    def test_simulation_overnight_detention_and_auto_allowance(self):
        """Giả lập toàn diện: Cập nhật mốc chờ hạ cont sau 0h -> Tự động tính phí lưu xe & sinh phụ cấp tài xế."""
        self.client.force_login(self.dispatcher_user)

        trip = DispatchTrip.objects.create(
            trip_code="SIM-DET-001",
            customer=self.customer,
            shipment_type=ShipmentType.EXPORT,
            status=TripStatus.AT_WAREHOUSE,
            driver=self.driver,
            vehicle=self.vehicle,
            actual_gate_out_time="21:30 25/09",
            cached_revenue=4500000
        )

        # Điều độ viên cập nhật mốc hẹn hạ sau 0h kèm phụ cấp
        res_detention = self.client.patch(f'/api/trips/{trip.trip_code}/', data=json.dumps({
            'dropoff_appointment_time': 'Sau 00:00 (01:30 ngày 26/09)',
            'actual_dropoff_time': '02:00 26/09',
            'is_overnight_detention': True,
            'overnight_wait_hours': 8.5,
            'detention_reason': 'Kho khách hàng yêu cầu chờ mở bãi Cảng Cát Lái sau 0h',
            'detention_fee_customer': 850000,
            'detention_driver_allowance': 300000,
            'auto_create_driver_allowance': True
        }), content_type='application/json')
        self.assertEqual(res_detention.status_code, 200)
        trip.refresh_from_db()

        self.assertTrue(trip.is_overnight_detention)
        self.assertEqual(trip.overnight_wait_hours, 8.5)
        self.assertEqual(trip.detention_fee_customer, 850000)
        self.assertEqual(trip.detention_driver_allowance, 300000)

        # Kiểm tra khoản chi tự động sinh ra cho tài xế
        allowance_exp = trip.expenses.filter(notes__icontains='Phụ cấp lưu đêm', is_deleted=False).first()
        self.assertIsNotNone(allowance_exp)
        self.assertEqual(allowance_exp.amount, 300000)
        self.assertEqual(allowance_exp.driver, self.driver)

    def test_simulation_master_data_full_crud(self):
        """Giả lập toàn diện: Tạo mới, Sửa và Xóa các danh mục Cài đặt Master Data."""
        self.client.force_login(self.director_user)

        # 1. Danh mục Cảng / Kho (Location)
        res_loc_create = self.client.post('/api/master-data/locations/', data=json.dumps({
            'code': 'LOC_TEST_SP',
            'name': 'Cảng SP-ITC Quốc Tế',
            'location_type': 'PORT',
            'address': 'Phường Phú Hữu, TP Thủ Đức'
        }), content_type='application/json')
        self.assertEqual(res_loc_create.status_code, 201)
        loc_id = res_loc_create.json()['id']

        res_loc_update = self.client.put(f'/api/master-data/locations/{loc_id}/', data=json.dumps({
            'code': 'LOC_TEST_SP',
            'name': 'Cảng SP-ITC Quốc Tế (Cập nhật)',
            'location_type': 'PORT',
            'address': 'Phường Phú Hữu, TP Thủ Đức, TP.HCM'
        }), content_type='application/json')
        self.assertEqual(res_loc_update.status_code, 200)

        res_loc_del = self.client.delete(f'/api/master-data/locations/{loc_id}/')
        self.assertEqual(res_loc_del.status_code, 200)

        # 2. Danh mục Khách Hàng (Customer)
        res_cust_create = self.client.post('/api/master-data/customers/', data=json.dumps({
            'code': 'CUST_VIP_01',
            'name': 'Công Ty CP Nhựa Tiền Phong',
            'address': 'KCN Sóng Thần 2, Bình Dương',
            'tax_code': '0312345678',
            'credit_limit': 200000000,
            'payment_term_days': 30
        }), content_type='application/json')
        self.assertEqual(res_cust_create.status_code, 201)
        cust_id = res_cust_create.json()['id']

        res_cust_del = self.client.delete(f'/api/master-data/customers/{cust_id}/')
        self.assertEqual(res_cust_del.status_code, 200)

        # 3. Danh mục Phương tiện / Đầu kéo (Vehicle)
        res_veh_create = self.client.post('/api/master-data/vehicles/', data=json.dumps({
            'license_plate': '50H-999.88',
            'ownership_type': 'OWNED',
            'vehicle_type': 'TRACTOR',
            'brand': 'Freightliner Cascadia',
            'payload_capacity_kg': 32000
        }), content_type='application/json')
        self.assertEqual(res_veh_create.status_code, 201)
        veh_id = res_veh_create.json()['id']

        res_veh_del = self.client.delete(f'/api/master-data/vehicles/{veh_id}/')
        self.assertEqual(res_veh_del.status_code, 200)

    def test_simulation_graceful_jwt_and_session_resilience(self):
        """Giả lập khả năng phục hồi xác thực (Graceful Fallback): Token hỏng nhưng có Session -> 200 OK."""
        # 1. Đăng nhập qua Session (như người dùng trên trình duyệt)
        self.client.force_login(self.dispatcher_user)

        # 2. Gửi request kèm Header Authorization với JWT token hỏng / hết hạn
        # GracefulJWTAuthentication phải bắt lỗi và fallback về session user, trả về 200 OK!
        bad_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid_signature"
        res = self.client.get('/api/trips/', HTTP_AUTHORIZATION=f"Bearer {bad_token}")
        self.assertEqual(res.status_code, 200)

        # 3. Khi không có Session cookie và gửi bad token -> phải trả về 401 Unauthorized
        self.client.logout()
        res_unauth = self.client.get('/api/trips/', HTTP_AUTHORIZATION=f"Bearer {bad_token}")
        self.assertEqual(res_unauth.status_code, 401)

    def test_reports_api_simulation(self):
        """Giả lập toàn diện: Gọi API Báo Cáo Quản Trị /api/reports/ kiểm tra 6 trụ cột dữ liệu BI."""
        self.client.force_login(self.director_user)

        # 1. Gọi API với kỳ mặc định (tháng này)
        res_rep_month = self.client.get('/api/reports/?period=month')
        self.assertEqual(res_rep_month.status_code, 200)
        data = res_rep_month.json()

        # Kiểm tra cấu trúc phản hồi 9 báo cáo chuẩn TMS BI
        self.assertIn('summary', data)
        self.assertIn('report1_fleet_utilization', data)
        self.assertIn('report2_container_dem_det', data)
        self.assertIn('report3_on_time_performance', data)
        self.assertIn('report4_expenses_reimbursement', data)
        self.assertIn('report5_drop_hook_and_layover', data)
        self.assertIn('report6_osd_exceptions', data)
        self.assertIn('report7_customer_analytics', data)
        self.assertIn('report8_subcontractor_settlements', data)
        self.assertIn('report9_driver_payroll_performance', data)

        # Kiểm tra tính toàn vẹn của Báo cáo 1, 2, 5, 7, 8, 9
        self.assertIn('fleet_pnl', data['report1_fleet_utilization'])
        self.assertIn('driver_scorecards', data['report1_fleet_utilization'])
        self.assertIn('shipping_lines_summary', data['report2_container_dem_det'])
        self.assertIn('records', data['report5_drop_hook_and_layover'])
        self.assertIn('customers', data['report7_customer_analytics'])
        self.assertIn('subcontractors', data['report8_subcontractor_settlements'])
        self.assertIn('drivers', data['report9_driver_payroll_performance'])

        # 2. Gọi API với các kỳ khác nhau: today, week, quarter, all
        for p in ['today', 'week', 'quarter', 'all']:
            res = self.client.get(f'/api/reports/?period={p}')
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json()['period'], p)

        # 3. Kiểm tra cơ chế Data Masking với vai trò Điều Độ Viên (DISPATCHER)
        self.client.force_login(self.dispatcher_user)
        res_dispatcher = self.client.get('/api/reports/?period=month')
        self.assertEqual(res_dispatcher.status_code, 200)
        disp_data = res_dispatcher.json()
        self.assertFalse(disp_data['can_view_finance'])
        self.assertEqual(disp_data['summary']['total_revenue'], 0)
        self.assertEqual(disp_data['summary']['total_profit'], 0)
        # Theo quy chuẩn phân quyền mới: Báo cáo không có quyền được ẨN HOÀN TOÀN (None) chứ không mask dữ liệu
        self.assertIsNone(disp_data['report7_customer_analytics'])
        self.assertIsNone(disp_data['report8_subcontractor_settlements'])
        self.assertIsNone(disp_data['report9_driver_payroll_performance'])


    def test_accounting_advance_and_settlement_workflow(self):
        """Giả lập toàn diện luồng Tạm ứng và Hoàn ứng 2 cấp:
        1. Công ty tạm ứng Quỹ cho Điều vận.
        2. Điều vận trích quỹ tạm ứng Chuyến cho Tài xế.
        3. Tài xế nộp chi phí thực tế -> Kế toán đối soát quyết toán hoàn ứng (thu lại tiền thừa / chi bù).
        4. Điều vận quyết toán hoàn ứng quỹ về Công ty.
        """
        self.client.force_login(self.accountant_user)

        # 1. Tạo yêu cầu tạm ứng Quỹ Điều Vận từ Công ty (ví dụ: 15.000.000 đ)
        res_create_fund = self.client.post('/api/accounting/dispatcher-funds/', data=json.dumps({
            'dispatcher_id': self.dispatcher.id,
            'amount': 15000000,
            'advance_date': '2026-09-26',
            'purpose': 'Quỹ điều vận tuần 4 tháng 9 tạm ứng chuyến & xử lý phát sinh/chi hộ',
            'notes': 'Chuyển khoản Vietcombank'
        }), content_type='application/json')
        self.assertEqual(res_create_fund.status_code, 200)
        fund_id = res_create_fund.json()['fund_id']

        # Kế toán duyệt xuất quỹ
        res_approve = self.client.post(f'/api/accounting/dispatcher-funds/{fund_id}/action/', data=json.dumps({
            'action': 'approve'
        }), content_type='application/json')
        self.assertEqual(res_approve.status_code, 200)

        # 2. Tạo chuyến xe thử nghiệm
        trip = DispatchTrip.objects.create(
            trip_code="ADV-TEST-001",
            customer=self.customer,
            driver=self.driver,
            vehicle=self.vehicle,
            shipment_type=ShipmentType.IMPORT,
            cached_revenue=4200000
        )

        # 3. Điều vận trích Quỹ cấp Tạm ứng Chuyến cho Tài xế (2.000.000 đ)
        res_adv_driver = self.client.post('/api/accounting/driver-advances/', data=json.dumps({
            'trip_id': trip.id,
            'driver_id': self.driver.id,
            'amount': 2000000,
            'advance_date': '2026-09-26',
            'advance_source': 'DISPATCHER_FUND',
            'dispatcher_fund_id': fund_id,
            'purpose': 'Vé BOT, cược cont ONE, nâng bãi cảng',
            'notes': 'Điều vận xuất tiền mặt'
        }), content_type='application/json')
        self.assertEqual(res_adv_driver.status_code, 200)
        advance_id = res_adv_driver.json()['advance_id']

        trip.refresh_from_db()
        self.assertEqual(trip.driver_advance_amount, 2000000)
        self.assertEqual(trip.advance_settlement_status, 'ADVANCED')

        # 4. Kiểm tra API danh sách Tạm ứng & Hoàn ứng
        res_advances_list = self.client.get('/api/accounting/advances/')
        self.assertEqual(res_advances_list.status_code, 200)
        data = res_advances_list.json()
        self.assertGreaterEqual(len(data['dispatcher_funds']), 1)
        self.assertGreaterEqual(len(data['driver_advances']), 1)
        # Số dư quỹ điều vận tự động giảm (15.000.000 - 2.000.000 = 13.000.000)
        fund_item = next(f for f in data['dispatcher_funds'] if f['id'] == fund_id)
        self.assertEqual(fund_item['disbursed_amount'], 2000000)
        self.assertEqual(fund_item['remaining_balance'], 13000000)

        # 5. Quyết toán Hoàn ứng chuyến xe:
        # Tài xế chi thực tế 1.650.000 đ -> Tài xế hoàn nộp lại tiền thừa 350.000 đ
        res_settle = self.client.post(f'/api/accounting/driver-advances/{advance_id}/settle/', data=json.dumps({
            'actual_spent': 1650000,
            'settlement_notes': 'Tài xế đã nộp đủ biên lai BOT và tiền thừa 350.000 đ'
        }), content_type='application/json')
        self.assertEqual(res_settle.status_code, 200)
        settle_res = res_settle.json()
        self.assertEqual(settle_res['diff_type'], 'DRIVER_REFUND')
        self.assertEqual(settle_res['refund_amount'], 350000)

        trip.refresh_from_db()
        self.assertEqual(trip.advance_settlement_status, 'SETTLED')

        # 6. Quyết toán quỹ điều vận về công ty
        res_settle_fund = self.client.post(f'/api/accounting/dispatcher-funds/{fund_id}/action/', data=json.dumps({
            'action': 'settle',
            'notes': 'Kế toán đã nhận đủ chứng từ hóa đơn và hoàn quỹ'
        }), content_type='application/json')
        self.assertEqual(res_settle_fund.status_code, 200)

    def test_phase1_customer_reimbursables_and_debit_note(self):
        """
        Giai đoạn 1: Bảng Kê Chi Hộ & Thu Hồi Tiền Khách Hàng (Debit Note).
        1. Tạo khoản chi hộ khách hàng (nâng cont, cược cont) gắn với chuyến xe.
        2. Tự động khởi tạo trạng thái PENDING.
        3. Gom nhóm lập Debit Note gửi khách hàng.
        4. Xác nhận thu hồi tiền chi hộ 1-chạm & tự động sinh phiếu thu Sổ Quỹ.
        """
        self.client.force_login(self.accountant_user)

        trip = DispatchTrip.objects.create(
            trip_code="TVL-REIMBURSE-001",
            customer=self.customer,
            vehicle=self.vehicle,
            driver=self.driver,
            cached_revenue=4500000,
            status=TripStatus.DELIVERED
        )

        # 1. Tạo 2 khoản chi hộ: Nâng cont 500k, Cược cont 1.500k
        exp1 = TripExpense.objects.create(
            trip=trip,
            category=ExpenseCategory.LIFT_ON,
            amount=500000,
            is_on_behalf_of_customer=True,
            invoice_number="HD-NANG-01",
            invoice_lookup_code="QXC39QWL4H9",
            notes="Phí nâng cont tại Cát Lái"
        )
        exp2 = TripExpense.objects.create(
            trip=trip,
            category=ExpenseCategory.CONTAINER_DEPOSIT,
            amount=1500000,
            is_on_behalf_of_customer=True,
            invoice_number="BL-CUOC-02",
            notes="Cược vỏ cont hãng tàu ONE"
        )

        self.assertEqual(exp1.reimbursement_status, ReimbursementStatus.PENDING)
        self.assertEqual(exp2.reimbursement_status, ReimbursementStatus.PENDING)

        # 2. Kiểm tra API danh sách chi hộ
        res = self.client.get('/api/accounting/reimbursables/?reimbursement_status=ALL')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['kpis']['total_amount'], 2000000)
        self.assertEqual(data['kpis']['pending_amount'], 2000000)
        self.assertEqual(len(data['items']), 2)

        # 3. Gom nhóm lập Debit Note
        res_dn = self.client.post('/api/accounting/reimbursables/', data=json.dumps({
            'action': 'create_debit_note',
            'expense_ids': [exp1.id, exp2.id],
            'debit_note_number': 'DN-2026-TEST-001',
            'notes': 'Gửi phòng kế toán đối soát'
        }), content_type='application/json')
        self.assertEqual(res_dn.status_code, 200)
        self.assertEqual(res_dn.json()['debit_note_number'], 'DN-2026-TEST-001')

        exp1.refresh_from_db()
        self.assertEqual(exp1.reimbursement_status, ReimbursementStatus.BILLED)
        self.assertEqual(exp1.debit_note_number, 'DN-2026-TEST-001')

        # 4. Xác nhận Khách hàng thanh toán hoàn ứng 1-chạm
        res_settle = self.client.post('/api/accounting/reimbursables/', data=json.dumps({
            'action': 'settle_reimbursement',
            'debit_note_number': 'DN-2026-TEST-001',
            'payment_method': 'BANK',
            'bank_name': 'VCB Tân Bình',
            'notes': 'Khách hàng chuyển khoản hoàn ứng đủ 2.000.000 đ'
        }), content_type='application/json')
        self.assertEqual(res_settle.status_code, 200)
        self.assertEqual(res_settle.json()['total_settled'], 2000000)

        exp1.refresh_from_db()
        exp2.refresh_from_db()
        self.assertEqual(exp1.reimbursement_status, ReimbursementStatus.COLLECTED)
        self.assertEqual(exp2.reimbursement_status, ReimbursementStatus.COLLECTED)

        # Tự động ghi 01 phiếu thu Sổ Quỹ
        cash_tx = CashTransaction.objects.filter(ref_code='DN-2026-TEST-001').first()
        self.assertIsNotNone(cash_tx)
        self.assertEqual(cash_tx.transaction_type, TransactionType.INFLOW)
        self.assertEqual(cash_tx.category, CashFlowCategory.REIMBURSABLE_COLLECTION)
        self.assertEqual(cash_tx.amount, 2000000)

    def test_phase1_cashbook_and_cashflow_statement(self):
        """
        Giai đoạn 1: Sổ Quỹ Thu - Chi Mẫu S03a-DN (Tiền Mặt & Ngân Hàng).
        1. Tạo Phiếu Thu tiền mặt (Cước vận tải).
        2. Tạo Phiếu Chi ngân hàng (Nạp tài khoản ETC/BOT).
        3. Kiểm tra tính toán tồn quỹ tiền mặt, số dư ngân hàng và dòng tiền thuần.
        """
        self.client.force_login(self.accountant_user)

        # 1. Phiếu Thu tiền mặt: 10.000.000 đ
        res_in = self.client.post('/api/accounting/cashbook/', data=json.dumps({
            'transaction_type': 'INFLOW',
            'payment_method': 'CASH',
            'category': 'FREIGHT_REVENUE',
            'amount': 10000000,
            'transaction_date': '2026-09-26',
            'partner_type': 'CUSTOMER',
            'partner_name': 'CÔNG TY TNHH SAMPLE',
            'ref_code': 'INV-2026-001',
            'notes': 'Khách hàng thanh toán cước chuyến'
        }), content_type='application/json')
        self.assertEqual(res_in.status_code, 201)

        # 2. Phiếu Chi ngân hàng: 3.000.000 đ
        res_out = self.client.post('/api/accounting/cashbook/', data=json.dumps({
            'transaction_type': 'OUTFLOW',
            'payment_method': 'BANK',
            'category': 'ETC_TOPUP',
            'amount': 3000000,
            'transaction_date': '2026-09-26',
            'partner_type': 'VENDOR',
            'partner_name': 'VETC / ePass',
            'ref_code': 'TOPUP-BOT-01',
            'notes': 'Nạp tiền tài khoản thu phí tự động cho đội xe'
        }), content_type='application/json')
        self.assertEqual(res_out.status_code, 201)

        # 3. Kiểm tra API Sổ Quỹ
        res_book = self.client.get('/api/accounting/cashbook/')
        self.assertEqual(res_book.status_code, 200)
        data = res_book.json()
        self.assertGreaterEqual(data['kpis']['cash_balance'], 10000000)
        self.assertGreaterEqual(len(data['transactions']), 2)

    def test_phase2_subcontractor_settlements(self):
        """
        Giai đoạn 2: Quyết Toán & Đối Soát Nhà Xe Bạn / Thầu Phụ 3PL.
        1. Tạo chuyến xe do xe ngoài chạy (VehicleOwnership.SUBCONTRACTOR).
        2. Thỏa thuận cước và tạm ứng cước xe bạn.
        3. Quyết toán chuyến xe bạn và tự động sinh phiếu chi Sổ Quỹ.
        """
        self.client.force_login(self.accountant_user)

        # Tạo xe bạn (Thầu phụ)
        sub_vehicle = Vehicle.objects.create(
            license_plate="51D-999.88",
            vehicle_type=VehicleType.TRACTOR,
            ownership_type=VehicleOwnership.SUBCONTRACTOR,
            registration_expiry=datetime.date(2027, 1, 1)
        )

        trip = DispatchTrip.objects.create(
            trip_code="TVL-3PL-001",
            customer=self.customer,
            vehicle=sub_vehicle,
            driver=self.driver,
            cached_revenue=5000000,
            status=TripStatus.DELIVERED
        )

        # 1. Cập nhật thỏa thuận cước: Trả xe bạn 3.800.000 đ, Tạm ứng trước 1.500.000 đ
        res_update = self.client.post('/api/accounting/subcontractor-settlements/', data=json.dumps({
            'action': 'update_cost',
            'trip_id': trip.id,
            'subcontractor_cost': 3800000,
            'subcontractor_advance': 1500000,
            'notes': 'Xe bạn chạy tuyến Cát Lái - VSIP 2'
        }), content_type='application/json')
        self.assertEqual(res_update.status_code, 200)

        trip.refresh_from_db()
        self.assertEqual(trip.subcontractor_cost, 3800000)
        self.assertEqual(trip.subcontractor_advance, 1500000)

        # 2. Kiểm tra API danh sách xe bạn
        res_sub = self.client.get('/api/accounting/subcontractor-settlements/')
        self.assertEqual(res_sub.status_code, 200)
        data = res_sub.json()
        self.assertEqual(data['kpis']['total_trips'], 1)
        self.assertEqual(data['kpis']['total_cost'], 3800000)
        self.assertEqual(data['kpis']['total_advance'], 1500000)
        self.assertEqual(data['kpis']['total_remaining'], 2300000)

        # 3. Quyết toán xe bạn: Còn trả 2.300.000 đ
        res_settle = self.client.post('/api/accounting/subcontractor-settlements/', data=json.dumps({
            'action': 'settle',
            'trip_id': trip.id,
            'payment_method': 'BANK',
            'bank_name': 'MB Bank - 99887766',
            'notes': 'Chuyển khoản thanh toán nốt tiền cước xe bạn'
        }), content_type='application/json')
        self.assertEqual(res_settle.status_code, 200)

        trip.refresh_from_db()
        self.assertEqual(trip.subcontractor_settlement_status, 'SETTLED')

        # Kiểm tra tự động sinh phiếu chi Sổ Quỹ cho 2.300.000 đ
        cash_tx = CashTransaction.objects.filter(ref_code='TVL-3PL-001').first()
        self.assertIsNotNone(cash_tx)
        self.assertEqual(cash_tx.transaction_type, TransactionType.OUTFLOW)
        self.assertEqual(cash_tx.category, CashFlowCategory.SUBCONTRACTOR_PAYMENT)
        self.assertEqual(cash_tx.amount, 2300000)

    def test_phase2_bot_toll_audit(self):
        """
        Giai đoạn 2: Đối Soát Chuyên Sâu Vé Cầu Đường BOT vs Định Mức Tuyến.
        1. Tạo biểu cước tuyến có định mức toll_standard_fee = 180.000 đ.
        2. Ghi nhận 2 vé BOT thực tế tổng cộng 250.000 đ (> 15% vượt định mức).
        3. Kiểm tra API trả về cảnh báo HIGH.
        """
        self.client.force_login(self.accountant_user)

        # Tuyến có định mức BOT
        tariff = RouteTariff.objects.create(
            customer=self.customer,
            pickup_location="CÁT LÁI",
            delivery_location="KCN SÓNG THẦN",
            freight_price=3500000,
            driver_trip_pay=500000,
            toll_standard_fee=180000
        )

        trip = DispatchTrip.objects.create(
            trip_code="TVL-BOT-001",
            customer=self.customer,
            pickup_location="CÁT LÁI",
            warehouse_location="KCN SÓNG THẦN",
            vehicle=self.vehicle,
            driver=self.driver,
            cached_revenue=3500000,
            status=TripStatus.DELIVERED
        )

        # Phát sinh vé BOT: 250.000 đ (vượt 180.000 đ)
        TripExpense.objects.create(
            trip=trip,
            category=ExpenseCategory.TOLL_FEE,
            amount=150000,
            invoice_number="BOT-01",
            invoice_issuer="Trạm Thu Phí Xa Lộ Hà Nội"
        )
        TripExpense.objects.create(
            trip=trip,
            category=ExpenseCategory.TOLL_FEE,
            amount=100000,
            invoice_number="BOT-02",
            invoice_issuer="Trạm BOT Cầu Phú Mỹ"
        )

        res = self.client.get('/api/accounting/bot-audit/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data['kpis']['total_trips_with_toll'], 1)
        self.assertGreaterEqual(data['kpis']['variance_count'], 1)

        trip_bot = next(it for it in data['items'] if it['trip_id'] == trip.id)
        self.assertEqual(trip_bot['actual_toll'], 250000)
        self.assertEqual(trip_bot['standard_toll'], 180000)
        self.assertEqual(trip_bot['warning_level'], 'HIGH')

    def test_customs_declaration_lifecycle_and_quick_actions(self):
        """Kiểm thử toàn diện vòng đời Tờ Khai Hải Quan & Các Thao Tác Nhanh (VNACCS/VCIS)."""
        self.client.force_login(self.director_user)

        from apps.customs.models import CustomsDeclaration, CustomsLane, CustomsDeclarationStatus, CustomsDirection

        # 1. Đăng ký tờ khai mới qua API
        create_payload = {
            'declaration_number': '109988776655',
            'declaration_date': datetime.date.today().strftime('%Y-%m-%d'),
            'customer_id': self.customer.id,
            'customs_office_code': '02CI',
            'customs_office_name': 'Chi cục HQ Cửa khẩu Cảng Sài Gòn KV4 (Cát Lái)',
            'declaration_type': 'A11',
            'direction': 'IMPORT',
            'customs_lane': 'GREEN',
            'status': 'SUBMITTED',
            'bill_of_lading': 'BL-TEST-9988',
            'container_numbers': 'TCLU9988771 / SEAL01',
            'tax_amount_vnd': 35000000,
            'is_tax_paid': False,
            'customs_service_fee': 1500000,
            'reimbursable_fee': 400000,
            'inspection_notes': 'Khai báo kiểm thử hệ thống'
        }
        res = self.client.post('/api/customs/declarations/', data=json.dumps(create_payload), content_type='application/json')
        self.assertEqual(res.status_code, 201)
        decl_id = res.json()['id']

        decl = CustomsDeclaration.objects.get(id=decl_id)
        self.assertEqual(decl.declaration_number, '109988776655')
        self.assertEqual(decl.customs_lane, CustomsLane.GREEN)
        self.assertEqual(decl.status, CustomsDeclarationStatus.SUBMITTED)
        self.assertFalse(decl.is_tax_paid)

        # 2. Kiểm tra danh sách và thống kê KPI
        res = self.client.get('/api/customs/declarations/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data['stats']['total'], 1)
        self.assertGreaterEqual(data['stats']['green_count'], 1)

        # 3. Thao tác nhanh 1-chạm: Đổi luồng sang Luồng Vàng
        res = self.client.post(f'/api/customs/declarations/{decl_id}/action/', data=json.dumps({
            'action': 'set_lane',
            'lane': 'YELLOW'
        }), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        decl.refresh_from_db()
        self.assertEqual(decl.customs_lane, CustomsLane.YELLOW)

        # 4. Thao tác nhanh 1-chạm: Xác nhận Thông Quan
        res = self.client.post(f'/api/customs/declarations/{decl_id}/action/', data=json.dumps({
            'action': 'set_cleared'
        }), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        decl.refresh_from_db()
        self.assertEqual(decl.status, CustomsDeclarationStatus.CLEARED)

        # 5. Thao tác nhanh 1-chạm: Đổi trạng thái nộp thuế
        res = self.client.post(f'/api/customs/declarations/{decl_id}/action/', data=json.dumps({
            'action': 'toggle_tax'
        }), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        decl.refresh_from_db()
        self.assertTrue(decl.is_tax_paid)

        # 6. Kiểm tra xuất file Excel Bảng kê tờ khai
        res = self.client.get('/api/customs/declarations/export-excel/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('application/vnd.openxmlformats', res['Content-Type'])

        # 7. Soft Delete
        res = self.client.delete(f'/api/customs/declarations/{decl_id}/')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(CustomsDeclaration.objects.filter(id=decl_id).exists())
        self.assertTrue(CustomsDeclaration.all_objects.filter(id=decl_id, is_deleted=True).exists())

    def test_route_tariff_toll_fee_crud(self):
        """Kiểm thử CRUD Biểu Cước Khách Hàng tích hợp Định mức vé BOT."""
        self.client.force_login(self.director_user)

        # 1. Thêm biểu cước với định mức BOT
        create_payload = {
            'customer_id': self.customer.id,
            'pickup_location': 'CÁT LÁI',
            'delivery_location': 'KCN SÓNG THẦN 2',
            'dropoff_location': 'HẠ BÃI',
            'container_size': '40HC',
            'freight_price': 4200000,
            'driver_trip_pay': 650000,
            'toll_standard_fee': 190000
        }
        res = self.client.post('/api/master-data/tariffs/', data=json.dumps(create_payload), content_type='application/json')
        self.assertEqual(res.status_code, 201)
        tariff_id = res.json()['id']

        tariff = RouteTariff.objects.get(id=tariff_id)
        self.assertEqual(tariff.toll_standard_fee, 190000)

        # 2. Cập nhật biểu cước
        update_payload = {
            'freight_price': 4500000,
            'driver_trip_pay': 700000,
            'toll_standard_fee': 210000
        }
        res = self.client.put(f'/api/master-data/tariffs/{tariff_id}/', data=json.dumps(update_payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        tariff.refresh_from_db()
        self.assertEqual(tariff.toll_standard_fee, 210000)
        self.assertEqual(tariff.freight_price, 4500000)

        # 3. GET danh sách biểu cước kiểm tra trường toll_standard_fee
        res = self.client.get('/api/master-data/tariffs/')
        self.assertEqual(res.status_code, 200)
        tariffs = res.json()['results']
        t_item = next(it for it in tariffs if it['id'] == tariff_id)
        self.assertEqual(t_item['toll_standard_fee'], 210000.0)

    def test_driver_portal_view_and_capability_access(self):
        trip_hash = self.trip.driver_hashid
        self.assertTrue(len(trip_hash) >= 8)

        # 1. Truy cập trang Mobile của tài xế không cần đăng nhập session
        self.client.logout()
        res = self.client.get(f'/driver/{trip_hash}/')
        self.assertEqual(res.status_code, 200)
        content = res.content.decode('utf-8')

        # Xác thực hiển thị thông tin nghiệp vụ vận tải cho tài xế
        self.assertIn(self.trip.trip_code, content)
        self.assertIn(self.driver.full_name, content)
        self.assertIn(self.vehicle.license_plate, content)
        self.assertIn("Báo Mốc Thủ Công", content)

        # Chống lộ dữ liệu nội bộ (Tuyệt đối không hiển thị doanh thu khách hay lợi nhuận trên trang tài xế)
        self.assertNotIn("cached_margin_percent", content)
        self.assertNotIn("Lợi nhuận gộp", content)

        # 2. Truy cập mã chuyến không tồn tại -> 404 an toàn
        res_404 = self.client.get('/driver/INVALID_NON_EXISTENT_HASH/')
        self.assertEqual(res_404.status_code, 404)
        self.assertIn("Không tìm thấy chuyến xe", res_404.content.decode('utf-8'))

        # 3. Báo mốc 1-chạm qua API bằng Capability Token
        milestone_res = self.client.post(
            f'/api/trips/{trip_hash}/milestones/',
            data=json.dumps({'milestone': 'ARRIVED_WAREHOUSE', 'notes': 'Đã đến cổng kho Tân Vạn'}),
            content_type='application/json',
            HTTP_X_TRIP_HASH=trip_hash
        )
        self.assertEqual(milestone_res.status_code, 200)
        self.assertTrue(milestone_res.json()['success'])
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, TripStatus.AT_WAREHOUSE)

        # 4. Kê khai chi phí BOT bằng Capability Token
        exp_res = self.client.post(
            f'/api/trips/{trip_hash}/expenses/',
            data={'category': 'TOLL_FEE', 'amount': 35000, 'notes': 'Trạm BOT Long Thành'},
            HTTP_X_TRIP_HASH=trip_hash
        )
        self.assertEqual(exp_res.status_code, 200)
        self.assertTrue(exp_res.json()['success'])
        self.assertEqual(self.trip.expenses.filter(category=ExpenseCategory.TOLL_FEE).count(), 1)

        # 5. Chụp và gửi chứng từ POD bằng Capability Token
        doc_res = self.client.post(
            f'/api/trips/{trip_hash}/documents/',
            data={'doc_type': 'Biên bản giao nhận hàng', 'container_no': self.trip.container_number},
            HTTP_X_TRIP_HASH=trip_hash
        )
        self.assertEqual(doc_res.status_code, 200)
        self.assertTrue(doc_res.json()['success'])
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.status, TripStatus.DELIVERED)

    # ==========================================================================
    # RBAC & PERMISSION AUDIT TEST SUITE (KIỂM TOÁN PHÂN QUYỀN TOÀN HỆ THỐNG)
    # ==========================================================================
    def test_rbac_driver_blocked_from_sensitive_financial_and_payroll_apis(self):
        """Tài xế bị chặn hoàn toàn khi truy cập P&L, bảng lương và sổ quỹ (HTTP 403)."""
        self.client.force_login(self.driver_user)

        # 1. Báo cáo TMS BI
        res_rep = self.client.get('/api/reports/')
        self.assertEqual(res_rep.status_code, 403)

        # 2. Bảng lương tài xế
        res_pay = self.client.get('/api/personnel/')
        self.assertEqual(res_pay.status_code, 403)

        # 3. Phân hệ kế toán
        res_acc = self.client.get('/api/accounting/')
        self.assertEqual(res_acc.status_code, 403)

        # 4. Sổ quỹ tiền mặt
        res_cash = self.client.get('/api/accounting/cashbook/')
        self.assertEqual(res_cash.status_code, 403)

        # 5. Thu hồi chi hộ (Debit Note)
        res_debit = self.client.get('/api/accounting/reimbursables/')
        self.assertEqual(res_debit.status_code, 403)

        # 6. Quyết toán thầu phụ xe bạn
        res_sub = self.client.get('/api/accounting/subcontractor-settlements/')
        self.assertEqual(res_sub.status_code, 403)

    def test_rbac_dispatcher_access_with_financial_data_masking(self):
        """Điều độ viên xem được báo cáo vận hành nhưng bị MASK toàn bộ số liệu P&L."""
        self.client.force_login(self.dispatcher_user)

        # Điều độ gọi Báo cáo TMS BI: HTTP 200 OK nhưng can_view_finance = False
        res = self.client.get('/api/reports/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data.get('can_view_finance'))

        # Dữ liệu tài chính P&L bị làm mờ (Masking về 0)
        summary = data.get('summary', {})
        self.assertEqual(summary.get('total_revenue'), 0)
        self.assertEqual(summary.get('total_expense'), 0)
        self.assertEqual(summary.get('total_profit'), 0)
        self.assertEqual(summary.get('margin_avg'), 0.0)

        # Nhưng các chỉ số vận hành vẫn hiển thị đầy đủ
        self.assertIn('total_trips', summary)
        self.assertIn('owned_ratio', summary)
        self.assertIn('otp_rate', summary)

        # Điều độ bị chặn xem bảng lương (PersonnelPayrollAPIView)
        res_pay = self.client.get('/api/personnel/')
        self.assertEqual(res_pay.status_code, 403)

        # Điều độ bị chặn truy cập Sổ quỹ (CashBookAPIView)
        res_cash = self.client.get('/api/accounting/cashbook/')
        self.assertEqual(res_cash.status_code, 403)

    def test_rbac_accountant_full_financial_and_payroll_access(self):
        """Kế toán viên có toàn quyền xem P&L tài chính, bảng lương và sổ quỹ."""
        self.client.force_login(self.accountant_user)

        # 1. Báo cáo TMS BI: Xem đầy đủ số liệu tài chính P&L
        res_rep = self.client.get('/api/reports/')
        self.assertEqual(res_rep.status_code, 200)
        self.assertTrue(res_rep.json().get('can_view_finance'))

        # 2. Bảng lương nhân sự
        res_pay = self.client.get('/api/personnel/')
        self.assertEqual(res_pay.status_code, 200)

        # 3. Phân hệ kế toán
        res_acc = self.client.get('/api/accounting/')
        self.assertEqual(res_acc.status_code, 200)

        # 4. Sổ quỹ
        res_cash = self.client.get('/api/accounting/cashbook/')
        self.assertEqual(res_cash.status_code, 200)

    def test_rbac_salesman_access_and_restrictions(self):
        """Nhân viên Kinh doanh truy cập CRM/Báo giá nhưng bị chặn truy cập Sổ quỹ và Bảng lương."""
        sale_user = User.objects.create_user(username="sales_audit", password="Password@2026")
        Employee.objects.create(
            user=sale_user,
            code="SALE_AUDIT",
            full_name="Nguyễn Kinh Doanh",
            department=Department.SALES,
            role=EmployeeRole.SALESMAN
        )
        self.client.force_login(sale_user)

        # Xem CRM Sale & Báo giá: HTTP 200 OK
        res_sales = self.client.get('/api/sales/')
        self.assertEqual(res_sales.status_code, 200)

        # Bị chặn xem bảng lương: HTTP 403
        res_pay = self.client.get('/api/personnel/')
        self.assertEqual(res_pay.status_code, 403)

        # Bị chặn xem sổ quỹ: HTTP 403
        res_cash = self.client.get('/api/accounting/cashbook/')
        self.assertEqual(res_cash.status_code, 403)

        # Bị chặn xem báo cáo TMS BI: HTTP 403
        res_rep = self.client.get('/api/reports/')
        self.assertEqual(res_rep.status_code, 403)

    def test_rbac_director_full_access(self):
        """Ban Giám Đốc có toàn quyền trên toàn bộ các phân hệ và API."""
        self.client.force_login(self.director_user)

        self.assertEqual(self.client.get('/api/dashboard/').status_code, 200)
        self.assertEqual(self.client.get('/api/reports/').status_code, 200)
        self.assertEqual(self.client.get('/api/personnel/').status_code, 200)
        self.assertEqual(self.client.get('/api/accounting/').status_code, 200)
        self.assertEqual(self.client.get('/api/sales/').status_code, 200)
        self.assertEqual(self.client.get('/api/fleet/').status_code, 200)

    def test_public_tracking_portal(self):
        """Khách hàng tra cứu vận đơn công khai qua /tracking/<hashid>/ không cần đăng nhập."""
        self.client.logout()

        # Tạo chuyến xe mẫu
        trip = DispatchTrip.objects.create(
            trip_code="TRACK-TEST-001",
            customer=self.customer,
            driver=self.driver,
            vehicle=self.vehicle,
            container_number="MSKU-1234567",
            container_type="40HC",
            pickup_location="Cảng Cát Lái",
            dropoff_location="Depot Tây Nam",
            cached_revenue=5500000
        )

        # 1. Truy cập qua HashID công khai
        res = self.client.get(f'/tracking/{trip.hashid}/')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "TRACK-TEST-001")
        self.assertContains(res, "MSKU-1234567")
        self.assertContains(res, self.customer.name)
        # Đảm bảo KHÔNG rò rỉ dữ liệu doanh thu nội bộ
        self.assertNotContains(res, "5500000")
        self.assertNotContains(res, "5,500,000")

        # 2. Truy cập qua mã không tồn tại -> 404
        res_404 = self.client.get('/tracking/INVALIDHASH999/')
        self.assertEqual(res_404.status_code, 404)

    def test_customer_milestone_state_machine_integrity(self):
        """Đảm bảo tính nhất quán máy trạng thái: Chuyến ở CONTAINER_PICKED tuyệt đối không đánh dấu bước 6 (POD) hoàn thành."""
        from apps.dispatch.timeline_service import build_customer_milestones
        from apps.documents.models import DocumentType, TripDocument

        trip = DispatchTrip.objects.create(
            trip_code="TRACK-STATE-001",
            customer=self.customer,
            vehicle=self.vehicle,
            driver=self.driver,
            dispatcher=self.dispatcher,
            status=TripStatus.CONTAINER_PICKED,
            shipment_type=ShipmentType.IMPORT,
            container_number="MSKU-9988112",
            container_type="40HC",
            pickup_location="Cảng Cát Lái",
            dropoff_location="Depot Tây Nam"
        )

        # Giả lập tài xế / admin upload trước file POD
        TripDocument.objects.create(
            trip=trip,
            document_type=DocumentType.POD,
            title="Biên bản giao nhận hàng (POD) (#1)",
            file_path="/media/documents/test_pod.png"
        )

        milestones = build_customer_milestones(trip)
        # Mốc 3 (Đã nhận hàng): is_done = True
        self.assertTrue(milestones[2]['is_done'])
        # Mốc 4 (Đang vận chuyển): is_active = True
        self.assertTrue(milestones[3]['is_active'])
        # Mốc 5 (Đã đến kho): is_done = False
        self.assertFalse(milestones[4]['is_done'])
        self.assertEqual(milestones[4]['time'], '')
        # Mốc 6 (Đã giao thành công): is_done = False, time = '' (KHÔNG nhảy cóc)
        self.assertFalse(milestones[5]['is_done'])
        self.assertEqual(milestones[5]['time'], '')


    def test_touchpad_esignature_submission(self):
        """Kiểm thử tài xế tải lên chữ ký cảm ứng điện tử E-Signature chuyển trạng thái DELIVERED."""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.documents.models import DocumentType

        trip = DispatchTrip.objects.create(
            trip_code="ESIGN-TEST-001",
            customer=self.customer,
            driver=self.driver,
            vehicle=self.vehicle,
            container_number="ONEU-9988776",
            status=TripStatus.UNLOADING
        )

        # Tạo ảnh PNG hợp lệ vượt qua validate_uploaded_document và Pillow
        from io import BytesIO
        from PIL import Image
        bio = BytesIO()
        img = Image.new('RGB', (100, 100), color='white')
        img.save(bio, format='PNG')
        bio.seek(0)
        sig_file = SimpleUploadedFile("e_pod_signature.png", bio.read(), content_type="image/png")

        # Đăng nhập tài xế hoặc gửi qua Capability Token X-Trip-Hash
        self.client.force_login(self.driver_user)
        res = self.client.post(f'/api/trips/{trip.trip_code}/documents/', data={
            'doc_type': 'Biên bản giao nhận hàng',
            'document': sig_file,
            'signer_name': 'Nguyễn Văn Tuấn (Thủ kho)',
            'notes': 'Ký điện tử bởi: Nguyễn Văn Tuấn lúc 14:30 27/09'
        }, format='multipart')

        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get('success'))

        trip.refresh_from_db()
        self.assertEqual(trip.status, TripStatus.DELIVERED)
        self.assertTrue(trip.documents.filter(document_type=DocumentType.POD).exists())

    def test_reports_10_and_11_advances_and_expenses(self):
        """
        Kiểm tra tính năng Báo Cáo 10 (Quỹ Tạm Ứng Điều Vận - Kế toán QL) 
        và Báo Cáo 11 (Tạm Ứng & Chi Phí Phát Sinh Tài Xế - Điều Vận QL).
        """
        from apps.billing.models import (
            DispatcherAdvanceFund, DriverTripAdvance, FundStatus,
            DriverAdvanceStatus, AdvanceSourceType, SettlementDiffType,
            ExpenseCategory, ApprovalStatus, TripExpense
        )

        today = datetime.date.today()

        # 1. Tạo gói Quỹ Điều Vận (Cấp 1)
        fund = DispatcherAdvanceFund.objects.create(
            code="TUDV-TEST-0001",
            dispatcher=self.dispatcher,
            amount=10000000,
            advance_date=today,
            purpose="Quỹ điều vận test kiểm thử",
            status=FundStatus.APPROVED,
            approved_by=self.director
        )

        # 2. Tạo Chuyến Xe & Tạm Ứng Chuyến Cho Tài Xế (Cấp 2)
        trip = DispatchTrip.objects.create(
            trip_code="TRIP-ADV-TEST-001",
            customer=self.customer,
            driver=self.driver,
            vehicle=self.vehicle,
            loading_date=today,
            status=TripStatus.DISPATCHED,
            driver_advance_amount=2000000,
            advance_settlement_status='ADVANCED'
        )

        advance = DriverTripAdvance.objects.create(
            code="TUTX-TEST-0001",
            trip=trip,
            driver=self.driver,
            dispatcher_fund=fund,
            advance_source=AdvanceSourceType.DISPATCHER_FUND,
            amount=2000000,
            advance_date=today,
            status=DriverAdvanceStatus.ADVANCED
        )

        # 3. Tạo Chi Phí Phát Sinh Hiện Trường (TripExpense: BOT + Hạ Cont)
        TripExpense.objects.create(
            trip=trip,
            driver=self.driver,
            category=ExpenseCategory.TOLL_FEE,
            amount=500000,
            notes="Vé BOT kiểm thử",
            status=ApprovalStatus.APPROVED
        )
        TripExpense.objects.create(
            trip=trip,
            driver=self.driver,
            category=ExpenseCategory.LIFT_OFF,
            amount=600000,
            notes="Hạ cont kiểm thử",
            status=ApprovalStatus.APPROVED
        )

        # 4. Kiểm tra gọi API Báo Cáo
        self.client.force_login(self.director_user)
        res = self.client.get('/api/reports/?period=all')
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertIn('report10_dispatcher_funds', data)
        self.assertIn('report11_driver_advances_expenses', data)

        # Kiểm tra Báo Cáo 10
        r10 = data['report10_dispatcher_funds']
        self.assertGreaterEqual(r10['total_funds_granted'], 10000000)
        self.assertGreaterEqual(len(r10['funds']), 1)
        found_fund = any(f['code'] == 'TUDV-TEST-0001' for f in r10['funds'])
        self.assertTrue(found_fund)

        # Kiểm tra Báo Cáo 11
        r11 = data['report11_driver_advances_expenses']
        self.assertGreaterEqual(len(r11['trips']), 1)
        test_trip_report = next((t for t in r11['trips'] if t['trip_code'] == 'TRIP-ADV-TEST-001'), None)
        self.assertIsNotNone(test_trip_report)
        self.assertEqual(test_trip_report['advance_amount'], 2000000)
        self.assertEqual(test_trip_report['actual_expenses'], 1100000)
        self.assertEqual(test_trip_report['difference'], 900000)
        self.assertEqual(test_trip_report['settlement_action'], 'REFUND')
        self.assertEqual(test_trip_report['status_label'], 'Đang tạm ứng')

    def test_driver_and_tracking_tokens_isolation_and_customer_view(self):
        """Kiểm thử bảo mật: Phân tách độc lập Driver Token vs Tracking Token và View Khách Hàng tinh gọn."""
        trip = DispatchTrip.objects.create(
            trip_code="SIM-TEST-SECURE-001",
            customer=self.customer,
            pickup_location="Cảng Cát Lái",
            warehouse_location="Kho Tân Tạo, Lô 12",
            dropoff_location="ICD Phước Long 3",
            vehicle=self.vehicle,
            driver=self.driver,
            dispatcher=self.dispatcher,
            container_number="BIMU9998881",
            seal_number="ML-TEST-9988",
            status=TripStatus.IN_TRANSIT
        )

        driver_token = trip.driver_hashid
        tracking_token = trip.tracking_hashid

        # Đăng xuất để kiểm tra hành vi truy cập công khai (Không có quyền nhân viên nội bộ)
        self.client.logout()

        # 1. Hai token phải hoàn toàn khác biệt về giá trị hash (khác domain/salt)
        self.assertNotEqual(driver_token, tracking_token)
        self.assertTrue(len(driver_token) >= 8)
        self.assertTrue(len(tracking_token) >= 8)

        # 2. Khách hàng dùng tracking_token truy cập Cổng Tài Xế -> Phải bị chặn 404
        res_cross_role = self.client.get(f"/driver/{tracking_token}/")
        self.assertEqual(res_cross_role.status_code, 404)

        # 3. Kẻ xấu dùng trip_code thô truy cập cổng công cộng (chưa đăng nhập) -> Phải bị chặn 404
        res_raw_code_driver = self.client.get(f"/driver/{trip.trip_code}/")
        self.assertEqual(res_raw_code_driver.status_code, 404)
        res_raw_code_tracking = self.client.get(f"/tracking/{trip.trip_code}/")
        self.assertEqual(res_raw_code_tracking.status_code, 404)

        # 4. Tài xế dùng đúng driver_token truy cập Cổng Tài Xế -> Thành công 200
        res_driver = self.client.get(f"/driver/{driver_token}/")
        self.assertEqual(res_driver.status_code, 200)

        # 5. Khách hàng dùng đúng tracking_token truy cập Cổng Tra Cứu -> Thành công 200
        res_tracking = self.client.get(f"/tracking/{tracking_token}/")
        self.assertEqual(res_tracking.status_code, 200)
        # 6 mốc chuẩn B2B khách hàng an tâm theo dõi, không đưa 10 bước tracklog nội bộ
        milestones = res_tracking.context['customer_milestones']
        self.assertEqual(len(milestones), 6)
        self.assertEqual(milestones[0]['title'], 'Tiếp nhận đơn')
        self.assertEqual(milestones[1]['title'], 'Đã điều xe')
        self.assertEqual(milestones[2]['title'], 'Đã nhận hàng')
        self.assertEqual(milestones[3]['title'], 'Đang vận chuyển')
        self.assertEqual(milestones[4]['title'], 'Đã đến kho hàng')
        self.assertEqual(milestones[5]['title'], 'Đã giao thành công')

    def test_currency_filters_thousands_separator(self):
        """Kiểm tra bộ lọc định dạng số có phần ngàn chuẩn Việt Nam."""
        from core.templatetags.currency_filters import format_money, money_vnd
        self.assertEqual(format_money(1265000), '1.265.000')
        self.assertEqual(format_money(2000000), '2.000.000')
        self.assertEqual(format_money(35000), '35.000')
        self.assertEqual(format_money(0), '0')
        self.assertEqual(format_money(None), '0')
        self.assertEqual(format_money('550000'), '550.000')
        self.assertEqual(money_vnd(35000), '35.000 đ')

    def test_reports_12_13_14_settlement_and_aging(self):
        """Kiểm tra 3 Báo Cáo mới: Báo Cáo 12 (Quyết toán & Backlog), Báo Cáo 13 (Công Nợ AR) và Báo Cáo 14 (Tuổi đơn tồn đọng)."""
        import datetime
        from django.utils import timezone
        today = timezone.now().date()
        past_date = today - datetime.timedelta(days=45)

        # 1. Tạo chuyến gối đầu tháng trước (chưa chốt)
        trip_backlog = DispatchTrip.objects.create(
            trip_code="TRIP-BACKLOG-001",
            customer=self.customer,
            pickup_location="Cát Lái",
            warehouse_location="Kho Tân Tạo",
            vehicle=self.vehicle,
            driver=self.driver,
            loading_date=past_date,
            cached_revenue=4500000,
            cached_expense=1500000,
            cached_profit=3000000,
            is_expenses_settled=False
        )

        # 2. Tạo chuyến trong kỳ đã quyết toán nội bộ và chốt đối soát khách hàng
        trip_settled = DispatchTrip.objects.create(
            trip_code="TRIP-SETTLED-002",
            customer=self.customer,
            pickup_location="Cát Lái",
            warehouse_location="Kho Tân Tạo",
            vehicle=self.vehicle,
            driver=self.driver,
            loading_date=today,
            cached_revenue=5000000,
            cached_expense=2000000,
            cached_profit=3000000,
            is_expenses_settled=True,
            settled_at=timezone.now(),
            settled_by=self.accountant,
            is_customer_settled=True,
            customer_settlement_status='SETTLED',
            customer_settled_at=timezone.now(),
            customer_settled_by=self.accountant,
            vat_invoice_number="VAT-TEST-001"
        )

        # 3. Gọi API Báo Cáo
        self.client.force_login(self.director_user)
        res = self.client.get('/api/reports/?period=all')
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertIn('report12_settlement_backlog', data)
        self.assertIn('report13_ar_aging', data)
        self.assertIn('report14_unsettled_aging', data)

        # Kiểm tra Report 12 (Settlement Backlog)
        r12 = data['report12_settlement_backlog']
        self.assertGreaterEqual(r12['total_trips_count'], 2)
        self.assertGreaterEqual(r12['settled_trips_count'], 1)
        self.assertGreaterEqual(r12['unsettled_trips_count'], 1)

        # Kiểm tra Report 13 (AR Aging): Chỉ chuyến đã quyết toán khách mới lên nợ AR chính thức
        r13 = data['report13_ar_aging']
        self.assertGreaterEqual(r13['total_receivable'], 5000000)
        self.assertGreaterEqual(r13['total_pending_reconcile'], 4500000)
        self.assertGreaterEqual(len(r13['customers']), 1)

        # Kiểm tra Report 14 (Unsettled Aging)
        r14 = data['report14_unsettled_aging']
        self.assertGreaterEqual(r14['total_unsettled_count'], 1)
        found_backlog = any(r['trip_code'] == 'TRIP-BACKLOG-001' and r['aging_level'] == 'CRITICAL' for r in r14['records'])
        self.assertTrue(found_backlog)

    def test_customer_settlement_ar_lifecycle(self):
        """
        Kiểm tra vòng đời 4 bước quyết toán nghiệp vụ và quy tắc ghi nhận công nợ AR:
        1. Chuyến hoàn thành nội bộ: Có thể quyết toán cho tài xế/thầu phụ độc lập.
        2. Chuyến CHƯA quyết toán với khách hàng -> CHƯA ĐƯỢC TÍNH CÔNG NỢ AR (pending_settlement).
        3. Chốt đối soát/quyết toán khách hàng kèm số Hóa đơn VAT -> LÊN CÔNG NỢ AR CHÍNH THỨC.
        4. Mở lại (UNSETTLE) -> Rút khỏi công nợ AR.
        """
        from apps.dispatch.models import TripStatus
        from django.utils import timezone
        today = timezone.now().date()

        trip = DispatchTrip.objects.create(
            trip_code="TRIP-AR-LIFECYCLE-001",
            customer=self.customer,
            pickup_location="Cảng Cát Lái",
            warehouse_location="KCN Sóng Thần",
            vehicle=self.vehicle,
            driver=self.driver,
            loading_date=today,
            status=TripStatus.DELIVERED,
            cached_revenue=6000000,
            cached_expense=2000000,
            cached_profit=4000000,
            is_expenses_settled=True,  # Đã quyết toán tài xế
            settled_at=timezone.now(),
            settled_by=self.accountant,
            is_customer_settled=False  # CHƯA quyết toán với khách
        )

        # 1. Gọi API Báo Cáo 13: Công nợ AR phải = 0, tiền nằm ở pending_settlement
        self.client.force_login(self.accountant_user)
        res = self.client.get(f'/api/reports/?period=all&customer_id={self.customer.id}')
        self.assertEqual(res.status_code, 200)
        cust_report = next((c for c in res.json().get('report13_ar_aging', {}).get('customers', []) if c['customer_id'] == self.customer.id), None)
        self.assertIsNotNone(cust_report)
        # Chuyến chưa quyết toán khách nên pending_settlement_amount phải có 6tr
        self.assertGreaterEqual(cust_report['pending_settlement_amount'], 6000000)

        # 2. Gọi API Chốt Quyết Toán Khách Hàng (SETTLE) kèm số HĐ VAT
        settle_res = self.client.post(
            '/api/accounting/customer-reconciliation/',
            data=json.dumps({
                'action': 'SETTLE',
                'trip_ids': [trip.id],
                'vat_invoice_number': 'VAT-TEST-9999'
            }),
            content_type='application/json'
        )
        self.assertEqual(settle_res.status_code, 200)
        self.assertTrue(settle_res.json().get('success'))

        trip.refresh_from_db()
        self.assertTrue(trip.is_customer_settled)
        self.assertEqual(trip.customer_settlement_status, 'INVOICED')
        self.assertEqual(trip.vat_invoice_number, 'VAT-TEST-9999')
        self.assertTrue(trip.customer_soa_code.startswith('SOA-'))

        # 3. Kiểm tra lại Báo Cáo 13: Giờ đây chuyến đã LÊN CÔNG NỢ AR CHÍNH THỨC
        res2 = self.client.get(f'/api/reports/?period=all&customer_id={self.customer.id}')
        cust_report2 = next((c for c in res2.json().get('report13_ar_aging', {}).get('customers', []) if c['customer_id'] == self.customer.id), None)
        self.assertIsNotNone(cust_report2)
        self.assertGreaterEqual(cust_report2['total_receivable'], 6000000)

        # 4. Mở lại (UNSETTLE) -> Chuyến rút khỏi công nợ AR
        unsettle_res = self.client.post(
            '/api/accounting/customer-reconciliation/',
            data=json.dumps({
                'action': 'UNSETTLE',
                'trip_ids': [trip.id]
            }),
            content_type='application/json'
        )
        self.assertEqual(unsettle_res.status_code, 200)
        trip.refresh_from_db()
        self.assertFalse(trip.is_customer_settled)
        self.assertEqual(trip.customer_settlement_status, 'PENDING')



import os
import re
import subprocess
from django.conf import settings

class FrontendSyntaxIntegrityTestCase(TestCase):
    """
    BỘ KIỂM THỬ TỰ ĐỘNG CHỐNG LỖI CÚ PHÁP & TRÙNG LẶP BIẾN JAVASCRIPT (ZERO-SYNTAX-REGRESSION)
    Tự động quét và bảo vệ toàn bộ tệp JavaScript trong static/js/ không bị lỗi SyntaxError,
    không bị khai báo trùng lặp biến (let/const redeclaration) làm tê liệt giao diện người dùng.
    """

    def setUp(self):
        self.static_js_dir = os.path.join(settings.BASE_DIR, 'static', 'js')
        self.app_js_path = os.path.join(self.static_js_dir, 'app.js')
        self.column_mgr_path = os.path.join(self.static_js_dir, 'column_manager.js')

    def test_no_duplicate_top_level_let_const_in_app_js(self):
        """Kiểm tra không có bất kỳ biến top-level let/const nào bị khai báo trùng lặp trong app.js"""
        self.assertTrue(os.path.exists(self.app_js_path), "Không tìm thấy tệp static/js/app.js")
        
        with open(self.app_js_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        top_level_vars = {}
        for i, line in enumerate(lines):
            # Match top-level let/const declarations (không thụt đầu dòng)
            m = re.match(r'^(let|const)\s+([a-zA-Z0-9_$]+)', line)
            if m:
                var_name = m.group(2)
                if var_name not in top_level_vars:
                    top_level_vars[var_name] = []
                top_level_vars[var_name].append(i + 1)

        duplicates = {v: l_nums for v, l_nums in top_level_vars.items() if len(l_nums) > 1}
        self.assertEqual(
            len(duplicates), 0,
            f"Phát hiện biến top-level bị khai báo trùng lặp trong static/js/app.js gây Uncaught SyntaxError: {duplicates}"
        )

    def test_node_syntax_check_if_node_available(self):
        """Sử dụng 'node -c' để biên dịch kiểm tra toàn diện cú pháp JS nếu môi trường có Node.js"""
        for js_file in [self.app_js_path, self.column_mgr_path]:
            if os.path.exists(js_file):
                try:
                    result = subprocess.run(
                        ['node', '-c', js_file],
                        capture_output=True,
                        text=True,
                        check=False
                    )
                    self.assertEqual(
                        result.returncode, 0,
                        f"Lỗi cú pháp JavaScript trong tệp {os.path.basename(js_file)}:\n{result.stderr}"
                    )
                except FileNotFoundError:
                    # Môi trường không cài node -> bỏ qua bước node -c nhưng test regex vẫn chạy
                    pass

    def test_essential_global_functions_present_in_app_js(self):
        """Đảm bảo các hàm cốt lõi điều hướng, chuyển tab, mở modal và báo cáo luôn tồn tại trong app.js"""
        with open(self.app_js_path, 'r', encoding='utf-8') as f:
            content = f.read()

        required_symbols = [
            'switchTab',
            'toggleSidebar',
            'setDashboardPeriod',
            'loadDashboardData',
            'switchReportGroup',
            'switchReportSubTab',
            'changeReportPeriod',
            'loadReportsData',
            'formatMoneyVND',
            'viewCustomerARStatement',
            'printCustomerARStatement',
            'exportReportToExcel'
        ]

        missing_symbols = [sym for sym in required_symbols if sym not in content]
        self.assertEqual(
            len(missing_symbols), 0,
            f"Thiếu các hàm điều hướng/nghiệp vụ cốt lõi trong static/js/app.js: {missing_symbols}"
        )


class CurrentUserProfileAPITestCase(TestCase):

    """Bộ kiểm thử cho API định danh và cài đặt hồ sơ cá nhân /api/auth/me/"""
    def setUp(self):
        self.user = User.objects.create_user(
            username="test_profile_user",
            password="InitialPassword@2026",
            email="test_initial@bim.info.vn"
        )
        self.employee = Employee.objects.create(
            user=self.user,
            code="TX_PROF",
            full_name="Nguyễn Văn Ban Đầu",
            phone_number="0911222333",
            role=EmployeeRole.DRIVER,
            department=Department.FLEET
        )

    def test_get_current_user_profile(self):
        self.client.force_login(self.user)
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['username'], 'test_profile_user')
        self.assertEqual(data['email'], 'test_initial@bim.info.vn')
        self.assertIsNotNone(data['employee'])
        self.assertEqual(data['employee']['full_name'], 'Nguyễn Văn Ban Đầu')

    def test_patch_profile_name_and_email(self):
        self.client.force_login(self.user)
        payload = {
            'full_name': 'Nguyễn Văn Cập Nhật',
            'email': 'updated_email@bim.info.vn',
            'phone_number': '0988777666'
        }
        res = self.client.patch('/api/auth/me/', data=json.dumps(payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['user']['full_name'], 'Nguyễn Văn Cập Nhật')
        self.assertEqual(data['user']['email'], 'updated_email@bim.info.vn')
        self.assertEqual(data['user']['phone_number'], '0988777666')

        # Kiểm tra database cập nhật
        self.employee.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.employee.full_name, 'Nguyễn Văn Cập Nhật')
        self.assertEqual(self.user.email, 'updated_email@bim.info.vn')
        self.assertEqual(self.employee.phone_number, '0988777666')

    def test_patch_profile_password_change(self):
        self.client.force_login(self.user)
        # Mật khẩu cũ sai
        res_fail = self.client.patch('/api/auth/me/', data=json.dumps({
            'old_password': 'WrongPassword',
            'new_password': 'NewPassword@2026'
        }), content_type='application/json')
        self.assertEqual(res_fail.status_code, 400)

        # Mật khẩu đúng
        res_ok = self.client.patch('/api/auth/me/', data=json.dumps({
            'old_password': 'InitialPassword@2026',
            'new_password': 'NewPassword@2026'
        }), content_type='application/json')
        self.assertEqual(res_ok.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPassword@2026'))


class SidebarHoverPeekTestCase(TestCase):
    def test_sidebar_hover_peek_assets_and_templates(self):
        # 1. Kiểm tra template sidebar có nút toggle ghim đồng bộ
        with open('templates/components/sidebar.html', 'r', encoding='utf-8') as f:
            s_html = f.read()
        self.assertIn('app-sidebar-header', s_html)
        self.assertIn('id="btn-sidebar-header-toggle"', s_html)
        self.assertIn('id="icon-sidebar-header-arrow-in"', s_html)
        self.assertIn('id="icon-sidebar-header-arrow-out"', s_html)
        self.assertIn('toggleSidebar()', s_html)

        # 2. Kiểm tra template topbar có nút hide/show sidebar
        with open('templates/components/topbar.html', 'r', encoding='utf-8') as f:
            t_html = f.read()
        self.assertIn('id="btn-toggle-sidebar"', t_html)
        self.assertIn('id="icon-sidebar-arrow-in"', t_html)
        self.assertIn('id="icon-sidebar-arrow-out"', t_html)

        # 3. Kiểm tra CSS main.css có rule sidebar-peek
        with open('static/css/main.css', 'r', encoding='utf-8') as f:
            css_text = f.read()
        self.assertIn('.app-sidebar.collapsed.sidebar-peek', css_text)

        # 4. Kiểm tra JS app.js có hàm initSidebarHoverPeek
        with open('static/js/app.js', 'r', encoding='utf-8') as f:
            js_text = f.read()
        self.assertIn('function initSidebarHoverPeek()', js_text)
        self.assertIn('sidebar-peek', js_text)




















