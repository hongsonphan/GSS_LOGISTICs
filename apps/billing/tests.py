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

    def test_settlement_voucher_lifecycle_driver(self):
        """Phiếu quyết toán tài xế: lập -> sửa phát sinh -> duyệt (có phiếu thu) -> mở lại -> xóa."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        res = self.client.post(base, {'party_type': 'DRIVER', 'trip_ids': [self.trip1.id, self.trip2.id], 'with_cash': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        vid = res.data['voucher']['id']
        self.assertEqual(res.data['voucher']['amount'], 200000)
        self.assertEqual(res.data['voucher']['direction'], 'RECEIVE')

        res = self.client.put(f'{base}{vid}/', {'adjustments': {str(self.trip1.id): 50000}}, format='json')
        self.assertEqual(res.data['voucher']['amount'], 150000)

        res = self.client.post(f'{base}{vid}/approve/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.trip1.refresh_from_db()
        self.assertTrue(self.trip1.is_expenses_settled)
        tx = CashTransaction.objects.get(ref_code=res.data['voucher']['code'])
        self.assertEqual(tx.amount, 150000)
        # Phiếu đã duyệt không được sửa/xóa trực tiếp
        self.assertEqual(self.client.delete(f'{base}{vid}/').status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.post(f'{base}{vid}/reopen/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.trip1.refresh_from_db()
        self.assertFalse(self.trip1.is_expenses_settled)
        self.assertFalse(CashTransaction.objects.filter(ref_code=res.data['voucher']['code'], is_deleted=False).exists())
        self.assertEqual(self.client.delete(f'{base}{vid}/').status_code, status.HTTP_200_OK)

    def test_subcontractor_unsettle_removes_voucher_and_blocks_edit_when_settled(self):
        """Hủy quyết toán xe bạn gỡ phiếu chi Sổ quỹ; chuyến đã quyết toán thì không sửa/quyết toán đè được."""
        self.client.force_authenticate(user=self.accountant_user)
        url = '/api/accounting/subcontractor-settlements/'
        self.trip1.subcontractor_cost = 5000000
        self.trip1.subcontractor_advance = 1000000
        self.trip1.save()

        res = self.client.post(url, {'action': 'settle', 'trip_id': self.trip1.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        code = res.data['settlement_code']
        self.assertTrue(CashTransaction.objects.filter(code=code, is_deleted=False).exists())

        res = self.client.post(url, {'action': 'update_cost', 'trip_id': self.trip1.id, 'subcontractor_cost': 1}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        res = self.client.post(url, {'action': 'settle', 'trip_id': self.trip1.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.post(url, {'action': 'unsettle', 'trip_id': self.trip1.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['removed_vouchers'], [code])
        self.assertFalse(CashTransaction.objects.filter(code=code, is_deleted=False).exists())
        self.trip1.refresh_from_db()
        self.assertEqual(self.trip1.subcontractor_settlement_status, 'PENDING')

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

    def test_accounting_driver_advance_and_fund_crud(self):
        """Kiểm thử toàn diện CRUD cho Phiếu Tạm Ứng Tài Xế và Quỹ Điều Vận."""
        import uuid
        from apps.billing.models import DriverTripAdvance, DispatcherAdvanceFund, FundStatus, DriverAdvanceStatus

        self.client.force_authenticate(user=self.accountant_user)

        unique_suffix = uuid.uuid4().hex[:6].upper()
        # 1. Quỹ Điều Vận: GET, PUT, DELETE
        fund = DispatcherAdvanceFund.objects.create(
            code=f'QDV-TEST-{unique_suffix}',
            dispatcher=self.driver_emp,
            amount=10000000,
            advance_date=datetime.date.today(),
            purpose='Quỹ tạm ứng test',
            status=FundStatus.PENDING
        )

        # 1.1 GET Quỹ
        get_fund_res = self.client.get(f'/api/accounting/dispatcher-funds/{fund.id}/')
        self.assertEqual(get_fund_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_fund_res.data['fund']['code'], f'QDV-TEST-{unique_suffix}')
        self.assertEqual(get_fund_res.data['fund']['amount'], 10000000)

        # 1.2 PUT Quỹ (sửa số tiền và ghi chú)
        put_fund_res = self.client.put(f'/api/accounting/dispatcher-funds/{fund.id}/', data={
            'amount': '15000000',
            'notes': 'Cập nhật định mức quỹ lên 15tr'
        }, format='json')
        self.assertEqual(put_fund_res.status_code, status.HTTP_200_OK)
        fund.refresh_from_db()
        self.assertEqual(fund.amount, 15000000)
        self.assertEqual(fund.notes, 'Cập nhật định mức quỹ lên 15tr')

        # 1.3 DELETE Quỹ khi chưa giải ngân
        del_fund_res = self.client.delete(f'/api/accounting/dispatcher-funds/{fund.id}/')
        self.assertEqual(del_fund_res.status_code, status.HTTP_200_OK)
        fund.refresh_from_db()
        self.assertTrue(fund.is_deleted)

        # 2. Phiếu Tạm Ứng Tài Xế: GET, PUT, DELETE
        trip_test = DispatchTrip.objects.create(
            trip_code=f'TRIP-ADV-{unique_suffix}',
            customer=self.customer,
            vehicle=self.vehicle,
            driver=self.driver_emp,
            status=TripStatus.IN_TRANSIT,
            loading_date=datetime.date.today(),
            driver_advance_amount=2000000,
            advance_settlement_status='ADVANCED'
        )
        adv = DriverTripAdvance.objects.create(
            code=f'TUTX-TEST-{unique_suffix}',
            trip=trip_test,
            driver=self.driver_emp,
            amount=2000000,
            advance_date=datetime.date.today(),
            purpose='Chi cầu đường test',
            status=DriverAdvanceStatus.ADVANCED
        )

        # 2.1 GET Phiếu tạm ứng
        get_adv_res = self.client.get(f'/api/accounting/driver-advances/{adv.id}/')
        self.assertEqual(get_adv_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_adv_res.data['advance']['code'], f'TUTX-TEST-{unique_suffix}')
        self.assertEqual(get_adv_res.data['advance']['amount'], 2000000)

        # 2.2 PUT Phiếu tạm ứng (sửa số tiền lên 2.500.000)
        put_adv_res = self.client.put(f'/api/accounting/driver-advances/{adv.id}/', data={
            'amount': '2500000',
            'notes': 'Tài xế xin ứng thêm 500k chi phát sinh'
        }, format='json')
        self.assertEqual(put_adv_res.status_code, status.HTTP_200_OK)
        adv.refresh_from_db()
        self.assertEqual(adv.amount, 2500000)
        trip_test.refresh_from_db()
        self.assertEqual(trip_test.driver_advance_amount, 2500000)

        # 2.3 DELETE Phiếu tạm ứng (Soft delete và hoàn tiền chuyến)
        del_adv_res = self.client.delete(f'/api/accounting/driver-advances/{adv.id}/')
        self.assertEqual(del_adv_res.status_code, status.HTTP_200_OK)
        adv.refresh_from_db()
        self.assertTrue(adv.is_deleted)
        trip_test.refresh_from_db()
        self.assertEqual(trip_test.driver_advance_amount, 0)
        self.assertEqual(trip_test.advance_settlement_status, 'NONE')

        # 3. Xe bạn Thầu phụ: Action 'unsettle' (Hoàn tác quyết toán)
        self.trip1.subcontractor_settlement_status = 'SETTLED'
        self.trip1.save()
        unsettle_res = self.client.post('/api/accounting/subcontractor-settlements/', data={
            'action': 'unsettle',
            'trip_id': self.trip1.id
        }, format='json')
        self.assertEqual(unsettle_res.status_code, status.HTTP_200_OK)
        self.trip1.refresh_from_db()
        self.assertEqual(self.trip1.subcontractor_settlement_status, 'PENDING')

        # 4. Kiểm thử Lọc theo Subcontractor & Quyết toán nhiều chuyến (batch_settle)
        from apps.master_data.models import Subcontractor, PartnerType
        sub_test = Subcontractor.objects.create(
            code='3PL999',
            name='Nhà Xe Test 3PL 999',
            short_name='3PL999',
            partner_type=PartnerType.CARRIER
        )
        trip_batch1 = DispatchTrip.objects.create(
            trip_code=f'TRIP-BATCH-1-{unique_suffix}',
            customer=self.customer,
            vehicle=self.vehicle,
            subcontractor=sub_test,
            status=TripStatus.COMPLETED,
            loading_date=datetime.date.today(),
            subcontractor_cost=3000000,
            subcontractor_advance=1000000,
            subcontractor_settlement_status='PENDING'
        )
        trip_batch2 = DispatchTrip.objects.create(
            trip_code=f'TRIP-BATCH-2-{unique_suffix}',
            customer=self.customer,
            vehicle=self.vehicle,
            subcontractor=sub_test,
            status=TripStatus.COMPLETED,
            loading_date=datetime.date.today(),
            subcontractor_cost=2500000,
            subcontractor_advance=500000,
            subcontractor_settlement_status='PENDING'
        )

        # 4.1 Lọc theo subcontractor_id
        res_filter = self.client.get(f'/api/accounting/subcontractor-settlements/?subcontractor_id={sub_test.id}')
        self.assertEqual(res_filter.status_code, status.HTTP_200_OK)
        trips_filtered = res_filter.data.get('trips', [])
        self.assertTrue(all(t['subcontractor_id'] == sub_test.id for t in trips_filtered))
        self.assertGreaterEqual(len(trips_filtered), 2)

        # 4.2 Tìm kiếm theo tên 3PL
        res_search = self.client.get(f'/api/accounting/subcontractor-settlements/?search=3PL999')
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res_search.data.get('trips', [])), 2)

        # 4.3 Thực hiện batch_settle cho 2 chuyến
        batch_res = self.client.post('/api/accounting/subcontractor-settlements/', data={
            'action': 'batch_settle',
            'trip_ids': [trip_batch1.id, trip_batch2.id],
            'payment_method': 'BANK',
            'bank_name': 'MB Bank',
            'notes': 'Quyết toán gom test đợt 1'
        }, format='json')
        self.assertEqual(batch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(batch_res.data.get('settled_count'), 2)

        trip_batch1.refresh_from_db()
        trip_batch2.refresh_from_db()
        self.assertEqual(trip_batch1.subcontractor_settlement_status, 'SETTLED')
        self.assertEqual(trip_batch2.subcontractor_settlement_status, 'SETTLED')
        self.assertIsNotNone(trip_batch1.subcontractor_settled_at)
        self.assertIsNotNone(trip_batch2.subcontractor_settled_at)


class CustomerMonthlyStatementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='acc_statement_user', password='password123')
        self.emp = Employee.objects.create(
            user=self.user,
            code='NV-ACC-STATEMENT',
            full_name='Kế Toán Đối Soát',
            department=Department.ACCOUNTING,
            role=EmployeeRole.ACCOUNTANT
        )
        self.customer = Customer.objects.create(
            code='SONG_THANH',
            name='CÔNG TY CỔ PHẦN SONG THANH',
            short_name='SONG THANH',
            tax_code='0301234567',
            address='KCN Sóng Thần, Bình Dương'
        )
        self.vehicle = Vehicle.objects.create(license_plate='51C-60193', vehicle_type='TRACTOR')
        from apps.dispatch.models import ShipmentType
        self.trip = DispatchTrip.objects.create(
            trip_code='TVL-ST-2022-001',
            customer=self.customer,
            vehicle=self.vehicle,
            container_number='CULU6019376',
            container_type='40HC',
            shipment_type=ShipmentType.EXPORT,
            pickup_location='GFORTUNE ĐỒNG AN',
            warehouse_location='MINH HƯNG',
            dropoff_location='CÁT LÁI',
            loading_date=datetime.date(2022, 6, 19),
            cached_revenue=4100000,
            status=TripStatus.COMPLETED
        )
        TripExpense.objects.create(
            trip=self.trip,
            category=ExpenseCategory.LIFT_ON,
            invoice_number='HD-NANG-01',
            amount=350000,
            is_on_behalf_of_customer=True
        )
        TripExpense.objects.create(
            trip=self.trip,
            category=ExpenseCategory.LIFT_OFF,
            invoice_number='HD-HA-01',
            amount=250000,
            is_on_behalf_of_customer=True
        )

    def test_number_to_words(self):
        from apps.billing.customer_statement_service import vietnamese_number_to_words
        w1 = vietnamese_number_to_words(4100000)
        self.assertIn('Bốn triệu một trăm nghìn', w1)
        w0 = vietnamese_number_to_words(0)
        self.assertEqual(w0, 'Không đồng.')

    def test_statement_data_structure(self):
        from apps.billing.customer_statement_service import get_customer_monthly_statement_data
        data = get_customer_monthly_statement_data(self.customer.id, month=6, year=2022, vat_rate=10)
        self.assertEqual(data['customer']['code'], 'SONG_THANH')
        self.assertEqual(len(data['rows']), 1)
        row = data['rows'][0]
        self.assertEqual(row['stt'], 1)
        self.assertEqual(row['ngay'], '2022-06-19')
        self.assertEqual(row['ten_khach_hang'], 'SONG THANH')
        self.assertEqual(row['kho'], 'MINH HƯNG')
        self.assertEqual(row['noi_lay'], 'GFORTUNE ĐỒNG AN')
        self.assertEqual(row['noi_ha'], 'CÁT LÁI')
        self.assertEqual(row['nx_code'], 'X')
        self.assertEqual(row['cont_20'], 0)
        self.assertEqual(row['cont_40'], 1)
        self.assertEqual(row['so_cont'], 'CULU6019376')
        self.assertEqual(row['don_gia'], 4100000)
        self.assertEqual(row['cong_cuoc'], 4100000)
        self.assertEqual(row['vat_tien'], 410000)
        self.assertEqual(row['thanh_tien_cuoc'], 4510000)
        self.assertEqual(row['hd_nang'], 'HD-NANG-01')
        self.assertEqual(row['tien_nang'], 350000)
        self.assertEqual(row['hd_ha'], 'HD-HA-01')
        self.assertEqual(row['tien_ha'], 250000)

    def test_api_customer_statement_json(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(f'/api/accounting/customer-statement/?customer_id={self.customer.id}&month=6&year=2022&vat_rate=10')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        self.assertEqual(len(res.data['data']['rows']), 1)

    def test_api_customer_statement_excel_download(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(f'/api/accounting/customer-statement/export-excel/?customer_id={self.customer.id}&month=6&year=2022&vat_rate=10')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.assertGreater(len(res.content), 2000)
