import datetime
from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.customers.models import Customer, RouteTariff
from apps.fleet.models import Vehicle, VehicleType, VehicleStatus
from apps.personnel.models import Employee, Department, EmployeeRole
from apps.dispatch.models import DispatchTrip, ShipmentType, TripStatus
from apps.billing.models import TripExpense, ExpenseCategory, ApprovalStatus
from core.workflows import transition_trip, can_transition

class BimLogisticsCoreTestCase(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(
            code="CUST_TEST",
            name="CÔNG TY TEST VẬN TẢI",
            address="KCN Sóng Thần"
        )
        self.driver = Employee.objects.create(
            code="TX_TEST",
            full_name="Nguyễn Văn Test",
            nickname="TÀI XẾ TEST",
            phone_number="0909999888",
            department=Department.FLEET,
            role=EmployeeRole.DRIVER,
            base_salary=5000000
        )
        self.dispatcher = Employee.objects.create(
            code="DD_TEST",
            full_name="Trần Điều Độ Test",
            department=Department.DISPATCH,
            role=EmployeeRole.DISPATCHER
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
        """Kiểm tra API Ban Giám Đốc phản hồi HTTP 200 và cấu trúc dữ liệu chuẩn."""
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('funds', data)
        self.assertIn('productivity', data)
        self.assertIn('fleet', data)
        self.assertIn('trips_pnl', data)

    def test_create_trip_api(self):
        """Kiểm tra API tạo lệnh điều động mới."""
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

