import datetime
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.dispatch.models import DispatchTrip, TripStatus
from apps.personnel.models import Employee, Department, EmployeeRole
from apps.fleet.models import Vehicle
from apps.customers.models import Customer
from apps.billing.models import (
    DispatcherAdvanceFund,
    DriverTripAdvance,
    FundStatus,
    DriverAdvanceStatus,
    AdvanceSourceType,
    SettlementDiffType,
    TripExpense,
    ApprovalStatus,
    PaymentMethod,
    TransactionType,
    CashFlowCategory,
    CashTransaction,
    ExpenseCategory
)

User = get_user_model()

class DriverBatchSettlementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Tạo Accountant User
        self.accountant_user = User.objects.create_user(
            username='acc_test', password='password123', email='acc@bim.vn', is_staff=False
        )
        self.accountant_emp = Employee.objects.create(
            user=self.accountant_user,
            code='NV-ACC-01',
            full_name='Kế Toán Viên Test',
            department=Department.ACCOUNTING,
            role=EmployeeRole.ACCOUNTANT,
            phone_number='0909111222'
        )

        # Tạo Driver User
        self.driver_user = User.objects.create_user(
            username='driver_bui94', password='password123', email='bui94@bim.vn'
        )
        self.driver_emp = Employee.objects.create(
            user=self.driver_user,
            code='TX-BUI94',
            full_name='Nguyễn Văn Bụi',
            nickname='BỤI 94',
            department=Department.FLEET,
            role=EmployeeRole.DRIVER,
            phone_number='0901234567'
        )

        # Tạo Xe & Khách hàng
        self.vehicle = Vehicle.objects.create(
            license_plate='50H-896.50',
            vehicle_type='TRACTOR',
            registration_expiry=datetime.date.today() + datetime.timedelta(days=180),
            current_driver=self.driver_emp
        )
        self.customer = Customer.objects.create(
            code='CUST-ABC',
            name='CÔNG TY ABC'
        )

        # Tạo 2 chuyến xe COMPLETED
        self.trip1 = DispatchTrip.objects.create(
            trip_code='SIM-TEST-001',
            customer=self.customer,
            driver=self.driver_emp,
            vehicle=self.vehicle,
            status=TripStatus.COMPLETED,
            loading_date=datetime.date.today(),
            is_expenses_settled=False
        )
        self.trip2 = DispatchTrip.objects.create(
            trip_code='SIM-TEST-002',
            customer=self.customer,
            driver=self.driver_emp,
            vehicle=self.vehicle,
            status=TripStatus.COMPLETED,
            loading_date=datetime.date.today(),
            is_expenses_settled=False
        )

        # Gán Chi phí cho Chuyến 1 (500,000 đ) & Chuyến 2 (300,000 đ) -> Tổng chi = 800,000 đ
        self.exp1 = TripExpense.objects.create(
            trip=self.trip1,
            driver=self.driver_emp,
            category=ExpenseCategory.TOLL_FEE,
            amount=500000,
            status=ApprovalStatus.APPROVED
        )
        self.exp2 = TripExpense.objects.create(
            trip=self.trip2,
            driver=self.driver_emp,
            category=ExpenseCategory.LIFT_ON,
            amount=300000,
            status=ApprovalStatus.APPROVED
        )

        # Gán Tạm ứng cho Chuyến 1 (1,000,000 đ) -> Tổng tạm ứng = 1,000,000 đ. Thừa 200,000 đ
        self.adv1 = DriverTripAdvance.objects.create(
            code='TUTX-TEST-001',
            trip=self.trip1,
            driver=self.driver_emp,
            advance_source=AdvanceSourceType.COMPANY_DIRECT,
            amount=1000000,
            advance_date=datetime.date.today(),
            status=DriverAdvanceStatus.ADVANCED
        )

    def test_batch_settlement_query_preview(self):
        """Kiểm tra API query preview gom chuyến."""
        self.client.force_authenticate(user=self.accountant_user)
        url = '/api/accounting/driver-settlements/batch-preview/?group_by=driver'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertGreaterEqual(res.data['summary']['total_trips'], 2)

    def test_batch_settlement_execute_success(self):
        """Kiểm tra thực thi quyết toán gom 2 chuyến thành công và tự động lập phiếu thu hoàn ứng."""
        self.client.force_authenticate(user=self.accountant_user)
        url = '/api/accounting/driver-settlements/batch-settle/'
        payload = {
            'trip_ids': [self.trip1.id, self.trip2.id],
            'settlement_notes': 'Quyết toán đợt test tự động',
            'payment_method': 'BANK',
            'auto_create_cash_transaction': True
        }
        res = self.client.post(url, data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['settled_trips_count'], 2)
        self.assertEqual(res.data['total_advance'], 1000000)
        self.assertEqual(res.data['total_spent'], 800000)
        self.assertEqual(res.data['net_difference'], 200000)

        # Kiểm tra chuyến xe đã khóa sổ
        self.trip1.refresh_from_db()
        self.trip2.refresh_from_db()
        self.assertTrue(self.trip1.is_expenses_settled)
        self.assertTrue(self.trip2.is_expenses_settled)
        self.assertEqual(self.trip1.settled_by, self.accountant_emp)

        # Kiểm tra chi phí chuyển sang SETTLED
        self.exp1.refresh_from_db()
        self.assertEqual(self.exp1.status, ApprovalStatus.SETTLED)

        # Kiểm tra tạm ứng chuyển sang SETTLED
        self.adv1.refresh_from_db()
        self.assertEqual(self.adv1.status, DriverAdvanceStatus.SETTLED)

        # Kiểm tra Sổ quỹ đã tạo Phiếu Thu (PT) 200,000 đ
        cash_tx = CashTransaction.objects.filter(partner_type='DRIVER', transaction_type=TransactionType.INFLOW).last()
        self.assertIsNotNone(cash_tx)
        self.assertEqual(cash_tx.amount, 200000)
        self.assertEqual(cash_tx.category, CashFlowCategory.ADVANCE_REFUND)

    def test_batch_settlement_reject_uncompleted_trip(self):
        """Từ chối quyết toán nếu có chuyến xe chưa hoàn thành (chưa COMPLETED)."""
        self.trip2.status = TripStatus.IN_TRANSIT
        self.trip2.save()

        self.client.force_authenticate(user=self.accountant_user)
        url = '/api/accounting/driver-settlements/batch-settle/'
        payload = {
            'trip_ids': [self.trip1.id, self.trip2.id],
            'settlement_notes': 'Test reject',
            'payment_method': 'BANK',
            'auto_create_cash_transaction': True
        }
        res = self.client.post(url, data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('SIM-TEST-002', res.data['error'])

    def test_cash_book_detail_voucher_api(self):
        """Kiểm tra API chi tiết phiếu thu / chi để phục vụ xem và in ấn Mẫu 01-TT/02-TT."""
        # Tạo 1 phiếu thu
        tx = CashTransaction.objects.create(
            code='PT-202610-TEST',
            transaction_type=TransactionType.INFLOW,
            payment_method=PaymentMethod.BANK,
            category=CashFlowCategory.ADVANCE_REFUND,
            amount=200000,
            transaction_date=datetime.date.today(),
            partner_type='DRIVER',
            partner_name='Nguyễn Văn Bụi (BỤI 94)',
            ref_code='SIM-TEST-001, SIM-TEST-002',
            created_by=self.accountant_emp,
            notes='Thu hoàn ứng tiền thừa đợt test'
        )

        self.client.force_authenticate(user=self.accountant_user)
        url = f'/api/accounting/cashbook/{tx.id}/'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['transaction']['code'], 'PT-202610-TEST')
        self.assertEqual(res.data['transaction']['amount'], 200000)
        self.assertEqual(res.data['transaction']['transaction_type'], 'INFLOW')

        # Test query by code
        url_by_code = f'/api/accounting/cashbook/{tx.code}/'
        res_code = self.client.get(url_by_code)
        self.assertEqual(res_code.status_code, status.HTTP_200_OK)
        self.assertEqual(res_code.data['transaction']['id'], tx.id)
