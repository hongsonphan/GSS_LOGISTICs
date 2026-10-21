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

    def test_single_driver_advance_settle_creates_voucher(self):
        """Kiểm tra quyết toán 1 phiếu hoàn ứng đơn lẻ tự động sinh phiếu thu/chi và trả về cash_transaction."""
        self.client.force_authenticate(user=self.accountant_user)
        url = f'/api/accounting/driver-advances/{self.adv1.id}/settle/'
        payload = {
            'actual_spent': 400000,
            'settlement_notes': 'Quyết toán đơn lẻ test'
        }
        res = self.client.post(url, data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertIn('cash_transaction', res.data)
        self.assertIn('cash_transaction_id', res.data)
        self.assertEqual(res.data['cash_transaction']['amount'], 600000) # 1,000,000 - 400,000 = 600,000 thừa
        self.assertEqual(res.data['cash_transaction']['transaction_type'], 'INFLOW')

    def test_customer_ar_reconciliation_workflow(self):
        """Kiểm tra quy trình chốt đối soát công nợ khách hàng (Customer SOA Reconciliation)."""
        self.client.force_authenticate(user=self.accountant_user)
        url = '/api/accounting/customer-reconciliation/'

        # 1. Chốt đối soát cho trip1 (COMPLETED)
        payload = {
            'action': 'RECONCILE',
            'trip_ids': [self.trip1.id]
        }
        res = self.client.post(url, data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['reconciled_count'], 1)
        self.assertIn('SOA-', res.data['soa_code'])

        self.trip1.refresh_from_db()
        self.assertTrue(self.trip1.customer_reconciled)
        self.assertEqual(self.trip1.customer_reconciled_by, self.accountant_emp)
        self.assertTrue(self.trip1.customer_soa_code.startswith('SOA-'))

        # 2. Mở lại đối soát
        payload_un = {
            'action': 'UNRECONCILE',
            'trip_ids': [self.trip1.id]
        }
        res_un = self.client.post(url, data=payload_un, format='json')
        self.assertEqual(res_un.status_code, status.HTTP_200_OK)
        self.assertTrue(res_un.data['success'])

        self.trip1.refresh_from_db()
        self.assertFalse(self.trip1.customer_reconciled)
        self.assertEqual(self.trip1.customer_soa_code, '')


    def test_expense_payer_type_three_buttons(self):
        """Kiểm tra 3 nút chi phí: TVL_COST | TVL_OBH | SUB_OBH và tác động lên cached_expense."""
        from apps.billing.models import ExpensePayerType, ReimbursementStatus

        # 1. Chi phí TVL: TVL chịu -> TÍNH vào chi phí vận hành chuyến đi
        exp_cost = TripExpense.objects.create(
            trip=self.trip1,
            category=ExpenseCategory.TOLL_FEE,
            amount=200000,
            expense_payer_type=ExpensePayerType.TVL_COST
        )
        self.assertFalse(exp_cost.is_on_behalf_of_customer)
        self.assertFalse(exp_cost.reimburse_to_subcontractor)
        self.assertEqual(exp_cost.reimbursement_status, ReimbursementStatus.NOT_APPLICABLE)

        # 2. TVL chi hộ: TVL ứng trước thu lại từ khách -> KHÔNG tính vào chi phí vận hành
        exp_tvl_obh = TripExpense.objects.create(
            trip=self.trip1,
            category=ExpenseCategory.LIFT_ON,
            amount=450000,
            expense_payer_type=ExpensePayerType.TVL_OBH
        )
        self.assertTrue(exp_tvl_obh.is_on_behalf_of_customer)
        self.assertFalse(exp_tvl_obh.reimburse_to_subcontractor)
        self.assertEqual(exp_tvl_obh.reimbursement_status, ReimbursementStatus.PENDING)

        # 3. 3PL chi hộ: 3PL bỏ tiền túi -> TVL hoàn tiền 3PL + thu lại từ KH -> KHÔNG tính vào chi phí TVL
        exp_sub_obh = TripExpense.objects.create(
            trip=self.trip1,
            category=ExpenseCategory.CONTAINER_DEPOSIT,
            amount=1000000,
            expense_payer_type=ExpensePayerType.SUB_OBH
        )
        self.assertTrue(exp_sub_obh.is_on_behalf_of_customer)
        self.assertTrue(exp_sub_obh.reimburse_to_subcontractor)
        self.assertEqual(exp_sub_obh.reimbursement_status, ReimbursementStatus.PENDING)

        self.trip1.update_financials()
        # cached_expense chỉ gồm exp1 (500k từ setUp) + exp_cost (200k) = 700k
        self.assertEqual(self.trip1.cached_expense, 700000)

    def test_subcontractor_partner_type_and_settlement_reimbursement(self):
        """Kiểm tra phân loại đối tác (CARRIER/GARAGE/SUPPLIER) và đối soát hoàn chi hộ 3PL."""
        from apps.master_data.models import Subcontractor, PartnerType
        from apps.billing.models import ExpensePayerType

        # 1. Tạo đối tác nhà xe CARRIER và GARA
        carrier = Subcontractor.objects.create(
            code='NX_TEST_3PL',
            short_name='TEST 3PL',
            name='Công ty Vận Tải Test 3PL',
            partner_type=PartnerType.CARRIER
        )
        garage = Subcontractor.objects.create(
            code='GARA_TEST',
            short_name='GARA QUẬN 12',
            name='Gara Sửa Chữa Quận 12',
            partner_type=PartnerType.GARAGE
        )

        # 2. Kiểm tra API options điều xe chỉ lấy CARRIER
        self.client.force_authenticate(user=self.accountant_user)
        opt_res = self.client.get('/api/master-data/form-options/')
        self.assertEqual(opt_res.status_code, status.HTTP_200_OK)
        sub_list = opt_res.data.get('subcontractors', [])
        sub_codes = [s['code'] for s in sub_list]
        self.assertIn('NX_TEST_3PL', sub_codes)
        self.assertNotIn('GARA_TEST', sub_codes)

        # 3. Tạo chuyến xe do 3PL chạy với cước 3tr, tạm ứng 1tr, và khoản 3PL chi hộ 500k
        trip_3pl = DispatchTrip.objects.create(
            trip_code='TRIP-3PL-001',
            customer=self.customer,
            subcontractor=carrier,
            vehicle=self.vehicle,
            driver=self.driver_emp,
            subcontractor_cost=Decimal('3000000'),
            subcontractor_advance=Decimal('1000000'),
            status=TripStatus.IN_TRANSIT,
            loading_date=datetime.date.today(),
            cached_revenue=Decimal('4000000')
        )
        TripExpense.objects.create(
            trip=trip_3pl,
            category=ExpenseCategory.LIFT_ON,
            amount=500000,
            expense_payer_type=ExpensePayerType.SUB_OBH
        )

        # 4. Kiểm tra API Quyết toán thầu phụ (Subcontractor Payables)
        settle_res = self.client.get('/api/accounting/subcontractor-settlements/')
        self.assertEqual(settle_res.status_code, status.HTTP_200_OK)
        trips = settle_res.data.get('trips', [])
        target_trip = next((t for t in trips if t['trip_code'] == 'TRIP-3PL-001'), None)
        self.assertIsNotNone(target_trip)
        self.assertEqual(target_trip['subcontractor_cost'], 3000000)
        self.assertEqual(target_trip['sub_reimbursable_expenses'], 500000)
        self.assertEqual(target_trip['subcontractor_advance'], 1000000)
        # Còn phải trả = 3,000,000 (cước) + 500,000 (hoàn chi hộ) - 1,000,000 (tạm ứng) = 2,500,000
        self.assertEqual(target_trip['remaining_payable'], 2500000)
