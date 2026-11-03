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

    def _approve(self, base, vid, **extra):
        """Bước 2 (Duyệt): đối tượng xác nhận bảng kê rồi mới duyệt."""
        self.client.put(f'{base}{vid}/', {'counterparty_confirmed': True, 'counterparty_confirm_note': 'Xác nhận qua email'}, format='json')
        return self.client.post(f'{base}{vid}/approve/', extra, format='json')

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

        # Phát sinh khác 0 bắt buộc có lý do
        res = self.client.put(f'{base}{vid}/', {'adjustments': {str(self.trip1.id): 50000}}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        res = self.client.put(f'{base}{vid}/', {'adjustments': {str(self.trip1.id): 50000},
                                                 'adjustment_notes': {str(self.trip1.id): 'Phí cân xe tài xế tự chi'}}, format='json')
        self.assertEqual(res.data['voucher']['amount'], 150000)
        update_log = res.data['voucher']['logs'][-1]
        self.assertEqual(update_log['action'], 'UPDATE')
        self.assertIn(('Phát sinh', 0, 50000), [(c['field'], c['old'], c['new']) for c in update_log['changes']])

        # Bước 2 - Duyệt: cần đối tượng xác nhận bảng kê; duyệt xong chốt số liệu, chưa phát sinh tiền
        res = self.client.post(f'{base}{vid}/approve/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('xác nhận', res.data['error'])
        self.trip1.refresh_from_db()
        self.assertEqual(self.trip1.driver_settlement_status, 'RECONCILING')
        res = self._approve(base, vid)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['voucher']['status'], 'APPROVED')
        self.trip1.refresh_from_db()
        self.assertTrue(self.trip1.is_expenses_settled)
        self.assertEqual(self.trip1.driver_settlement_status, 'APPROVED')
        self.assertFalse(CashTransaction.objects.filter(ref_code=res.data['voucher']['code']).exists())
        self.adv1.refresh_from_db()
        self.assertEqual(self.adv1.status, DriverAdvanceStatus.ADVANCED)   # tạm ứng chưa đóng
        # Phiếu đã duyệt không được sửa/xóa trực tiếp
        self.assertEqual(self.client.delete(f'{base}{vid}/').status_code, status.HTTP_400_BAD_REQUEST)

        # Bước 3 - Quyết toán: phát sinh phiếu thu hoàn ứng, đóng tạm ứng
        res = self.client.post(f'{base}{vid}/settle/', {'with_cash': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['voucher']['status'], 'SETTLED')
        tx = CashTransaction.objects.get(ref_code=res.data['voucher']['code'])
        self.assertEqual(tx.amount, 150000)
        self.trip1.refresh_from_db()
        self.assertEqual((self.trip1.driver_settlement_status, self.trip1.advance_settlement_status), ('SETTLED', 'SETTLED'))
        self.adv1.refresh_from_db()
        self.assertEqual(self.adv1.status, DriverAdvanceStatus.SETTLED)
        # Đã quyết toán: không mở lại đối soát trực tiếp, phải hủy quyết toán (có lý do) trước
        self.assertEqual(self.client.post(f'{base}{vid}/reopen/', {'reason': 'x'}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.post(f'{base}{vid}/unsettle/', {}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        res = self.client.post(f'{base}{vid}/unsettle/', {'reason': 'Nhập nhầm số tiền'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['voucher']['status'], 'APPROVED')
        self.assertFalse(CashTransaction.objects.filter(ref_code=res.data['voucher']['code'], is_deleted=False).exists())
        self.adv1.refresh_from_db()
        self.assertEqual(self.adv1.status, DriverAdvanceStatus.ADVANCED)

        # Mở lại đối soát bắt buộc có lý do và bỏ xác nhận của đối tượng
        self.assertEqual(self.client.post(f'{base}{vid}/reopen/', {}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        res = self.client.post(f'{base}{vid}/reopen/', {'reason': 'Nhập thiếu phí cân'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual([g['action'] for g in res.data['voucher']['logs']],
                         ['CREATE', 'UPDATE', 'CONFIRM', 'APPROVE', 'SETTLE', 'UNSETTLE', 'REOPEN'])
        self.assertEqual(res.data['voucher']['logs'][-1]['reason'], 'Nhập thiếu phí cân')
        self.assertFalse(res.data['voucher']['counterparty_confirmed'])
        self.trip1.refresh_from_db()
        self.assertFalse(self.trip1.is_expenses_settled)
        self.assertEqual(self.trip1.driver_settlement_status, 'RECONCILING')
        self.assertEqual(self.client.delete(f'{base}{vid}/').status_code, status.HTTP_200_OK)
        self.trip1.refresh_from_db()
        self.assertEqual(self.trip1.driver_settlement_status, 'PENDING')

    def test_voucher_mixed_drivers_split_by_party(self):
        """Chọn chuyến của nhiều tài xế: mặc định báo lỗi, bật split_by_party thì mỗi tài xế một phiếu."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        self.trip2.driver = self.accountant_emp
        self.trip2.save(update_fields=['driver'])
        payload = {'party_type': 'DRIVER', 'trip_ids': [self.trip1.id, self.trip2.id]}
        res = self.client.post(base, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        res = self.client.post(base, dict(payload, split_by_party=True), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(len(res.data['vouchers']), 2)
        self.assertEqual({v['trips_count'] for v in res.data['vouchers']}, {1})

    def test_voucher_driver_ignores_cancelled_advance_and_allocates_per_advance(self):
        """Tạm ứng đã hủy không tính; thực chi phân bổ lần lượt lên từng phiếu tạm ứng."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        DriverTripAdvance.objects.create(
            code='TUTX-TEST-CXL', trip=self.trip1, driver=self.driver_emp, amount=700000,
            advance_date=datetime.date.today(), status=DriverAdvanceStatus.CANCELLED)
        adv2 = DriverTripAdvance.objects.create(
            code='TUTX-TEST-002', trip=self.trip1, driver=self.driver_emp, amount=200000,
            advance_date=datetime.date.today() + datetime.timedelta(days=1), status=DriverAdvanceStatus.ADVANCED)
        res = self.client.post(base, {'party_type': 'DRIVER', 'trip_ids': [self.trip1.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        line = res.data['voucher']['lines'][0]
        self.assertEqual(line['advance'], 1200000)
        self.assertEqual(line['spent'], 500000)
        self.assertEqual([a['code'] for a in line['advance_lines']], ['TUTX-TEST-001', 'TUTX-TEST-002'])
        self.assertEqual(line['advance_lines'][0]['source_code'], 'COMPANY_DIRECT')
        self.assertEqual(line['expense_lines'][0]['payer'], 'Chi phí TVL')
        vid = res.data['voucher']['id']
        self.assertEqual(self._approve(base, vid).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post(f'{base}{vid}/settle/', {}, format='json').status_code, status.HTTP_200_OK)
        self.adv1.refresh_from_db()
        adv2.refresh_from_db()
        self.assertEqual((self.adv1.actual_spent, self.adv1.refund_amount), (500000, 500000))
        self.assertEqual((adv2.actual_spent, adv2.refund_amount), (0, 200000))

    def test_voucher_reselecting_same_trips_reuses_draft_and_overlap_lists_existing(self):
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        res = self.client.post(base, {'party_type': 'CUSTOMER', 'trip_ids': [self.trip1.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        vid = res.data['voucher']['id']
        again = self.client.post(base, {'party_type': 'CUSTOMER', 'trip_ids': [self.trip1.id]}, format='json')
        self.assertEqual(again.status_code, status.HTTP_200_OK, again.data)
        self.assertEqual((again.data['voucher']['id'], again.data['reused']), (vid, True))
        overlap = self.client.post(base, {'party_type': 'CUSTOMER', 'trip_ids': [self.trip1.id, self.trip2.id]}, format='json')
        self.assertEqual(overlap.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual([v['id'] for v in overlap.data['existing_vouchers']], [vid])

    def test_voucher_driver_salary_deduction_option(self):
        """Tích 'Trừ lương tài xế' khi quyết toán: lưu trên phiếu, giữ qua lần sửa, ghi vào khoản chi khi duyệt, có log."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        res = self.client.post(base, {'party_type': 'DRIVER', 'trip_ids': [self.trip1.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        vid = res.data['voucher']['id']
        line = res.data['voucher']['lines'][0]
        self.assertEqual((line['salary_deduct'], line['expense_lines'][0]['id']), (0, self.exp1.id))

        # Tích trừ lương: số tiền mặt hoàn ứng không đổi, chỉ ghi nhận khoản trừ lương
        res = self.client.put(f'{base}{vid}/', {'salary_deductions': {str(self.exp1.id): True}}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        line = res.data['voucher']['lines'][0]
        self.assertEqual((line['salary_deduct'], res.data['voucher']['amount']), (500000, 500000))
        self.assertIn(('Trừ lương tài xế', 0, 500000), [(c['field'], c['old'], c['new']) for c in res.data['voucher']['logs'][-1]['changes']])

        # Sửa các thông tin khác không làm mất lựa chọn đã tích
        res = self.client.put(f'{base}{vid}/', {'notes': 'ghi chú'}, format='json')
        self.assertEqual(res.data['voucher']['lines'][0]['salary_deduct'], 500000)
        self.exp1.refresh_from_db()
        self.assertTrue(self.exp1.company_borne)  # chưa duyệt thì chưa đổi khoản chi

        res = self._approve(base, vid)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.exp1.refresh_from_db()
        self.assertFalse(self.exp1.company_borne)

    def test_voucher_code_format_per_party(self):
        """Mã phiếu: QTTX / QTKH / QT3PL + .yymm. + số thứ tự 3 chữ số (đếm riêng theo từng loại)."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        yymm = datetime.date.today().strftime('%y%m')
        self.trip1.subcontractor_cost = 1000000
        self.trip1.save()
        codes = {}
        for party in ('DRIVER', 'CUSTOMER', 'PARTNER'):
            res = self.client.post(base, {'party_type': party, 'trip_ids': [self.trip1.id]}, format='json')
            self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
            codes[party] = res.data['voucher']['code']
        self.assertEqual(codes, {'DRIVER': f'QTTX.{yymm}.001', 'CUSTOMER': f'QTKH.{yymm}.001', 'PARTNER': f'QT3PL.{yymm}.001'})

    def test_reports_show_saved_and_reconciled_customer_settlement_status(self):
        """Phiếu khách hàng mới lưu -> báo cáo hiện 'Đã lưu quyết toán (chờ duyệt)'; duyệt xong -> 'Đã đối soát'."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        admin = User.objects.create_user(username='rep_admin', password='password123', is_staff=True, is_superuser=True)

        def trip_statuses():
            self.client.force_authenticate(user=admin)
            data = self.client.get('/api/reports/?period=all').data
            found = []

            def walk(node):
                if isinstance(node, dict):
                    if node.get('trip_code') == self.trip1.trip_code and 'settlement_status' in node:
                        found.append(node['settlement_status'])
                    for v in node.values():
                        walk(v)
                elif isinstance(node, list):
                    for v in node:
                        walk(v)
            walk(data)
            self.client.force_authenticate(user=self.accountant_user)
            return set(found)

        self.assertEqual(trip_statuses(), {'Chờ đối soát'})
        res = self.client.post(base, {'party_type': 'CUSTOMER', 'trip_ids': [self.trip1.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(trip_statuses(), {'Đối soát (chờ duyệt)'})
        self.assertEqual(self._approve(base, res.data['voucher']['id']).status_code, status.HTTP_200_OK)
        self.assertEqual(trip_statuses(), {'Đã đối soát'})

    def test_customer_revenue_report_shows_settled_unrun_trips_as_unrealized_only(self):
        """Chuyến chưa chạy nhưng đã có phiếu quyết toán khách: hiện ở báo cáo theo khách (cột Chưa thực hiện),
        KHÔNG tính vào doanh thu thực hiện và không vào báo cáo theo đội xe."""
        admin = User.objects.create_user(username='rep_admin2', password='password123', is_staff=True, is_superuser=True)
        trip = DispatchTrip.objects.create(
            trip_code='ACC-TEST-001', customer=self.customer, vehicle=self.vehicle,
            status=TripStatus.ACCEPTED, loading_date=datetime.date.today(), cached_revenue=Decimal('2000000'))

        def report():
            self.client.force_authenticate(user=admin)
            data = self.client.get('/api/reports/?period=all').data
            self.client.force_authenticate(user=self.accountant_user)
            return data

        def customer_row(data):
            return next((c for c in data['report7_customer_analytics']['customers'] if c['customer_name'] == self.customer.name), None)

        before = customer_row(report())
        res = self.client.post('/api/accounting/settlement-vouchers/', {'party_type': 'CUSTOMER', 'trip_ids': [trip.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        data = report()
        row = customer_row(data)
        self.assertEqual((row['unrealized_revenue'], row['unrealized_trips_count']), (2000000, 1))
        self.assertEqual(row['revenue'], before['revenue'] if before else 0)       # chưa tính vào doanh thu thực hiện
        self.assertEqual(row['trips_count'], before['trips_count'] if before else 0)
        self.assertIn('ACC-TEST-001', [t['trip_code'] for t in row['trips']])
        self.assertEqual(data['report7_customer_analytics']['total_unrealized_revenue'], 2000000)
        # Báo cáo theo đội xe: chưa chạy thì chưa có
        fleet = data['report1_fleet_utilization']
        codes = [t['trip_code'] for v in (fleet.get('fleet_pnl') or fleet.get('vehicles') or []) for t in v.get('trips', [])]
        self.assertNotIn('ACC-TEST-001', codes)

    def test_ar_report_counts_approved_customer_voucher_even_if_trip_not_run(self):
        """Công nợ phải thu: phiếu quyết toán khách đã duyệt (chuyến chưa chạy, chưa có ngày chạy) vẫn thành công nợ chính thức,
        số tiền theo phiếu (cước + chi hộ + phát sinh)."""
        admin = User.objects.create_user(username='rep_admin3', password='password123', is_staff=True, is_superuser=True)
        trip = DispatchTrip.objects.create(
            trip_code='AR-TEST-001', customer=self.customer, vehicle=self.vehicle,
            status=TripStatus.ACCEPTED, cached_revenue=Decimal('2000000'))
        TripExpense.objects.create(trip=trip, driver=self.driver_emp, category=ExpenseCategory.TOLL_FEE, amount=100000,
                                   status=ApprovalStatus.APPROVED, is_on_behalf_of_customer=True)
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        res = self.client.post(base, {'party_type': 'CUSTOMER', 'trip_ids': [trip.id], 'adjustments': {str(trip.id): 50000},
                                      'adjustment_notes': {str(trip.id): 'Phụ phí dầu'}}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)

        def ar_row():
            self.client.force_authenticate(user=admin)
            data = self.client.get('/api/reports/?period=all').data
            self.client.force_authenticate(user=self.accountant_user)
            return next((c for c in data['report13_ar_aging']['customers'] if c['customer_name'] == self.customer.name), None)

        row = ar_row()
        self.assertEqual(row['reconciled_amount'] if row else 0, 0)  # mới lưu, chưa duyệt: chưa tính công nợ
        self.assertEqual(self._approve(base, res.data['voucher']['id']).status_code, status.HTTP_200_OK)
        row = ar_row()
        self.assertEqual(row['reconciled_amount'], 2150000)
        self.assertEqual((row['freight_revenue'], row['reimbursable_amount'], row['adjustment_amount']), (2000000, 100000, 50000))

    def test_customer_three_stage_flow_updates_trip_status_and_ar(self):
        """Khách hàng: Đối soát (chuyến RECONCILING, chưa lên công nợ) -> Duyệt (APPROVED, lên công nợ) -> Quyết toán (SETTLED)."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        res = self.client.post(base, {'party_type': 'CUSTOMER', 'trip_ids': [self.trip1.id], 'with_cash': True}, format='json')
        vid = res.data['voucher']['id']
        self.assertEqual(res.data['voucher']['status'], 'DRAFT')
        self.trip1.refresh_from_db()
        self.assertEqual((self.trip1.customer_settlement_status, self.trip1.is_customer_settled), ('RECONCILING', False))
        # chưa có xác nhận của khách: không duyệt được
        self.assertEqual(self.client.post(f'{base}{vid}/approve/', {}, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._approve(base, vid).status_code, status.HTTP_200_OK)
        self.trip1.refresh_from_db()
        self.assertEqual((self.trip1.customer_settlement_status, self.trip1.is_customer_settled), ('APPROVED', True))
        self.assertEqual(self.trip1.customer_soa_code, res.data['voucher']['code'])
        self.assertFalse(CashTransaction.objects.filter(ref_code=res.data['voucher']['code']).exists())  # Duyệt chưa phát sinh tiền
        # chuyến đã lên công nợ: không lập phiếu thứ hai
        self.assertEqual(self.client.post(base, {'party_type': 'CUSTOMER', 'trip_ids': [self.trip1.id]}, format='json').status_code,
                         status.HTTP_400_BAD_REQUEST)
        res = self.client.post(f'{base}{vid}/settle/', {'with_cash': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.trip1.refresh_from_db()
        self.assertEqual((self.trip1.customer_settlement_status, self.trip1.is_customer_settled), ('SETTLED', True))
        # Hủy quyết toán trả về Đã duyệt, vẫn còn trong công nợ
        self.assertEqual(self.client.post(f'{base}{vid}/unsettle/', {'reason': 'sai số'}, format='json').status_code, status.HTTP_200_OK)
        self.trip1.refresh_from_db()
        self.assertEqual((self.trip1.customer_settlement_status, self.trip1.is_customer_settled), ('APPROVED', True))
        # Mở lại đối soát: gỡ khỏi công nợ
        self.assertEqual(self.client.post(f'{base}{vid}/reopen/', {'reason': 'khách đổi số'}, format='json').status_code, status.HTTP_200_OK)
        self.trip1.refresh_from_db()
        self.assertEqual((self.trip1.customer_settlement_status, self.trip1.is_customer_settled), ('RECONCILING', False))

    def test_partner_three_stage_flow_payable_only_after_settlement(self):
        """3PL: Duyệt = lên công nợ phải trả (chưa trả tiền); Quyết toán = chi trả thực tế."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        self.trip1.subcontractor_cost = 3000000
        self.trip1.subcontractor_advance = 500000
        self.trip1.save()
        res = self.client.post(base, {'party_type': 'PARTNER', 'trip_ids': [self.trip1.id], 'with_cash': True}, format='json')
        vid = res.data['voucher']['id']
        self.trip1.refresh_from_db()
        self.assertEqual(self.trip1.subcontractor_settlement_status, 'RECONCILING')
        self.assertEqual(self._approve(base, vid).status_code, status.HTTP_200_OK)
        self.trip1.refresh_from_db()
        self.assertEqual(self.trip1.subcontractor_settlement_status, 'APPROVED')
        self.assertFalse(CashTransaction.objects.filter(ref_code=res.data['voucher']['code']).exists())
        res = self.client.post(f'{base}{vid}/settle/', {'with_cash': True, 'payment_method': 'BANK'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        tx = CashTransaction.objects.get(ref_code=res.data['voucher']['code'])
        self.assertEqual((tx.transaction_type, int(tx.amount)), ('OUTFLOW', 2500000))
        self.trip1.refresh_from_db()
        self.assertEqual(self.trip1.subcontractor_settlement_status, 'SETTLED')

    def test_approved_voucher_posts_adjustments_to_ledger_and_reopen_removes_them(self):
        """Phát sinh kế toán trên phiếu được ghi sổ khi Duyệt (khách: 131/5113, tài xế: 632/141, 3PL: 632/331) và gỡ khi mở lại."""
        from django.test import override_settings
        from apps.ledger.models import JournalLine
        from apps.master_data.models import Subcontractor

        def bal(prefix):
            lines = JournalLine.objects.filter(account__code__startswith=prefix)
            return int(sum((ln.debit - ln.credit for ln in lines), Decimal('0')))

        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        t1 = self.trip1
        sub = Subcontractor.objects.create(name='3PL T', code='3PLT')
        DispatchTrip.objects.filter(id=t1.id).update(subcontractor=sub, subcontractor_cost=1000000)
        t1.refresh_from_db()
        with override_settings(LEDGER_AUTO_POST=True):
            cases = [('CUSTOMER', '131', 300000, '5113'), ('DRIVER', '141', 50000, '632'), ('PARTNER', '331', 70000, '632')]
            for party, acct, adj, other in cases:
                with self.captureOnCommitCallbacks(execute=True):
                    res = self.client.post(base, {'party_type': party, 'trip_ids': [t1.id], 'adjustments': {str(t1.id): adj},
                                                  'adjustment_notes': {str(t1.id): 'phát sinh'}}, format='json')
                self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
                vid = res.data['voucher']['id']
                before = (bal(acct), bal(other))
                with self.captureOnCommitCallbacks(execute=True):
                    self.assertEqual(self._approve(base, vid).status_code, status.HTTP_200_OK)
                after = (bal(acct), bal(other))
                if party == 'CUSTOMER':      # Nợ 131 / Có 5113
                    self.assertEqual((after[0] - before[0], after[1] - before[1]), (adj, -adj))
                elif party == 'DRIVER':      # Nợ 632 / Có 141
                    self.assertEqual((after[0] - before[0], after[1] - before[1]), (-adj, adj))
                else:                        # Nợ 632 / Có 331
                    self.assertEqual((after[0] - before[0], after[1] - before[1]), (-adj, adj))
                with self.captureOnCommitCallbacks(execute=True):
                    self.assertEqual(self.client.post(f'{base}{vid}/reopen/', {'reason': 'kiểm tra'}, format='json').status_code, status.HTTP_200_OK)
                self.assertEqual((bal(acct), bal(other)), before)   # mở lại đối soát thì bút toán bị gỡ
                with self.captureOnCommitCallbacks(execute=True):
                    self.assertEqual(self.client.delete(f'{base}{vid}/').status_code, status.HTTP_200_OK)

    def test_voucher_partner_direction_flips_when_advance_exceeds_cost(self):
        self.client.force_authenticate(user=self.accountant_user)
        self.trip1.subcontractor_cost = 1000000
        self.trip1.subcontractor_advance = 1500000
        self.trip1.save()
        res = self.client.post('/api/accounting/settlement-vouchers/', {'party_type': 'PARTNER', 'trip_ids': [self.trip1.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual((res.data['voucher']['amount'], res.data['voucher']['direction']), (500000, 'RECEIVE'))

    def test_voucher_customer_skips_billed_on_behalf_expenses(self):
        self.client.force_authenticate(user=self.accountant_user)
        for amount, kwargs in ((100000, {}), (200000, {'debit_note_number': 'DN-1'}), (300000, {'reimbursement_status': 'COLLECTED'})):
            TripExpense.objects.create(
                trip=self.trip1, driver=self.driver_emp, category=ExpenseCategory.TOLL_FEE, amount=amount,
                status=ApprovalStatus.APPROVED, is_on_behalf_of_customer=True, **kwargs)
        res = self.client.post('/api/accounting/settlement-vouchers/', {'party_type': 'CUSTOMER', 'trip_ids': [self.trip1.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual([e['amount'] for e in res.data['voucher']['lines'][0]['expense_lines']], [100000])

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

    def test_legacy_settle_paths_blocked_for_trips_in_voucher(self):
        """Chuyến đã nằm trong phiếu quyết toán thì không chốt/mở lại trực tiếp bằng đường cũ."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        res = self.client.post(base, {'party_type': 'DRIVER', 'trip_ids': [self.trip1.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        vid, vcode = res.data['voucher']['id'], res.data['voucher']['code']
        # phiếu nháp: không chốt trực tiếp
        res = self.client.post('/api/accounting/', {'action': 'batch_settle', 'trip_codes': [self.trip1.trip_code]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(vcode, res.data['error'])
        # chọn lại đúng chuyến của phiếu nháp: mở lại phiếu cũ, không lập phiếu thứ hai
        res = self.client.post(base, {'party_type': 'DRIVER', 'trip_ids': [self.trip1.id]}, format='json')
        self.assertEqual((res.status_code, res.data['voucher']['id']), (status.HTTP_200_OK, vid))
        self.assertEqual(self._approve(base, vid).status_code, status.HTTP_200_OK)
        # phiếu đã duyệt: không mở lại từng chuyến
        res = self.client.post(f'/api/trips/{self.trip1.trip_code}/unsettle-expenses/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        res = self.client.post('/api/accounting/', {'action': 'batch_unsettle', 'trip_codes': [self.trip1.trip_code]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        # mở lại phiếu thì mở lại chuyến được
        self.assertEqual(self.client.post(f'{base}{vid}/reopen/', {'reason': 'Kiểm tra'}, format='json').status_code, status.HTTP_200_OK)
        res = self.client.post('/api/accounting/', {'action': 'batch_unsettle', 'trip_codes': [self.trip1.trip_code]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

    def test_settlement_voucher_report_is_read_only(self):
        """Báo cáo bảng kê: liệt kê + chi tiết + xuất Excel, không có thao tác ghi."""
        self.client.force_authenticate(user=self.accountant_user)
        base = '/api/accounting/settlement-vouchers/'
        res = self.client.post(base, {'party_type': 'DRIVER', 'trip_ids': [self.trip1.id, self.trip2.id], 'with_cash': True}, format='json')
        vid = res.data['voucher']['id']
        self._approve(base, vid)

        rep = self.client.get('/api/reports/settlement-vouchers/')
        self.assertEqual(rep.status_code, status.HTTP_200_OK, rep.content)
        self.assertEqual(rep.data['summary']['count'], 1)
        self.assertEqual(rep.data['summary']['approved'], 1)
        self.assertEqual(rep.data['summary']['total_receive'], 200000)
        self.assertEqual(self.client.get('/api/reports/settlement-vouchers/?party_type=CUSTOMER').data['summary']['count'], 0)
        detail = self.client.get(f'/api/reports/settlement-vouchers/{vid}/')
        self.assertEqual(len(detail.data['voucher']['lines']), 2)
        xlsx = self.client.get('/api/reports/settlement-vouchers/?export=xlsx')
        self.assertEqual(xlsx.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', xlsx['Content-Type'])
        # báo cáo không nhận thao tác ghi
        self.assertIn(self.client.post('/api/reports/settlement-vouchers/', {}, format='json').status_code, (403, 405))
        self.assertIn(self.client.delete(f'/api/reports/settlement-vouchers/{vid}/').status_code, (403, 405))

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
