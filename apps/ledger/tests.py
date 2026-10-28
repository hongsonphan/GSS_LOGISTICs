import datetime
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.billing.models import CashTransaction, TripExpense
from apps.customers.models import Customer
from apps.dispatch.models import DispatchTrip
from apps.fleet.models import Vehicle, VehicleType
from apps.ledger import posting, reports
from apps.ledger.models import Account, JournalEntry, JournalLine
from apps.personnel.models import Employee, EmployeeRole
from core.models import get_default_company


def _balance(company, prefix):
    lines = JournalLine.objects.filter(entry__company=company, account__code__startswith=prefix)
    return sum((ln.debit - ln.credit for ln in lines), Decimal('0'))


class LedgerTestBase(TestCase):
    def setUp(self):
        self.company = get_default_company()
        today = timezone.now().date()
        self.customer = Customer.objects.create(code='KH_LG', name='Khách sổ cái', tax_code='0300000001')
        self.vehicle = Vehicle.objects.create(license_plate='51C-777.77', vehicle_type=VehicleType.TRACTOR,
                                              registration_expiry=today, insurance_expiry=today)
        self.driver = Employee.objects.create(code='TXLG', full_name='Tài Xế Sổ Cái', phone_number='0900000009',
                                              role=EmployeeRole.DRIVER)

    def trip(self, code='LG-01', **kw):
        defaults = dict(trip_code=code, customer=self.customer, vehicle=self.vehicle, driver=self.driver,
                        pickup_location='A', warehouse_location='B', dropoff_location='C')
        defaults.update(kw)
        return DispatchTrip.objects.create(**defaults)


class ChartTests(LedgerTestBase):
    def test_regimes_differ(self):
        posting.ensure_chart(self.company)
        self.assertTrue(Account.objects.filter(company=self.company, code='6422').exists())
        self.assertTrue(Account.objects.filter(company=self.company, code='3385', name__icontains='thất nghiệp').exists())
        self.assertEqual(Account.objects.get(company=self.company, code='1111').parent.code, '111')
        self.company.accounting_regime = 'TT200'
        self.company.save()
        from apps.ledger import charts
        self.assertEqual(charts.resolve(self.company, 'unemployment_ins'), '3386')
        self.assertEqual(charts.resolve(self.company, 'admin_other'), '6428')
        self.company.ledger_account_overrides = {'fuel': '1521'}
        self.assertEqual(charts.resolve(self.company, 'fuel'), '1521')


@override_settings(LEDGER_AUTO_POST=True)
class PostingTests(LedgerTestBase):
    def test_cash_inflow_and_outflow(self):
        with self.captureOnCommitCallbacks(execute=True):
            CashTransaction.objects.create(code='PT-LG-1', transaction_type='INFLOW', payment_method='BANK',
                                           category='FREIGHT_REVENUE', amount=5_000_000, transaction_date=datetime.date(2026, 10, 5),
                                           partner_type='CUSTOMER', partner_name='Khách sổ cái')
            CashTransaction.objects.create(code='PC-LG-1', transaction_type='OUTFLOW', payment_method='CASH',
                                           category='DRIVER_TRIP_ADVANCE', amount=1_000_000, transaction_date=datetime.date(2026, 10, 6),
                                           partner_type='DRIVER', partner_name='Tài Xế Sổ Cái')
        self.assertEqual(_balance(self.company, '1121'), 5_000_000)
        self.assertEqual(_balance(self.company, '131'), -5_000_000)
        self.assertEqual(_balance(self.company, '141'), 1_000_000)
        self.assertEqual(_balance(self.company, '1111'), -1_000_000)
        line = JournalLine.objects.get(account__code='131')
        self.assertIsNotNone(line.partner)
        self.assertEqual(line.partner.tax_code, '0300000001')
        self.assertEqual(JournalLine.objects.get(account__code='141').employee, self.driver)

    def test_idempotent_and_delete(self):
        with self.captureOnCommitCallbacks(execute=True):
            tx = CashTransaction.objects.create(code='PC-LG-2', transaction_type='OUTFLOW', payment_method='BANK',
                                                category='FUEL_PAYMENT', amount=2_000_000, transaction_date=datetime.date(2026, 10, 7))
        with self.captureOnCommitCallbacks(execute=True):
            tx.amount = 2_500_000
            tx.save()
        self.assertEqual(JournalEntry.objects.filter(source_type='cash').count(), 1)
        self.assertEqual(_balance(self.company, '632'), 2_500_000)
        with self.captureOnCommitCallbacks(execute=True):
            tx.is_deleted = True
            tx.save()
        self.assertEqual(JournalEntry.objects.filter(source_type='cash').count(), 0)

    def test_trip_completion_and_expenses(self):
        with self.captureOnCommitCallbacks(execute=True):
            trip = self.trip(cached_revenue=4_000_000)
        self.assertFalse(JournalEntry.objects.filter(source_type='trip').exists())
        with self.captureOnCommitCallbacks(execute=True):
            DispatchTrip.objects.filter(pk=trip.pk).update(status='COMPLETED')
            trip.refresh_from_db()
            trip.save()
            TripExpense.objects.create(trip=trip, driver=self.driver, category='TOLL_FEE', amount=108_000,
                                       tax_amount=8_000, status='APPROVED')
            TripExpense.objects.create(trip=trip, driver=self.driver, category='LIFT_ON', amount=500_000,
                                       status='APPROVED', expense_payer_type='TVL_OBH', is_on_behalf_of_customer=True)
            TripExpense.objects.create(trip=trip, driver=self.driver, category='OTHER', amount=50_000, status='PENDING')
        trip.refresh_from_db()
        self.assertEqual(trip.status, 'COMPLETED')
        self.assertEqual(_balance(self.company, '5113'), -trip.cached_revenue)
        self.assertEqual(_balance(self.company, '632'), 100_000)
        self.assertEqual(_balance(self.company, '1331'), 8_000)
        self.assertEqual(_balance(self.company, '1388'), 500_000)
        self.assertEqual(_balance(self.company, '141'), -608_000)
        for entry in JournalEntry.objects.all():
            entry.check_balanced()

    def test_rebuild_matches_signals(self):
        with self.captureOnCommitCallbacks(execute=True):
            CashTransaction.objects.create(code='PT-LG-9', transaction_type='INFLOW', payment_method='CASH',
                                           category='OTHER_INFLOW', amount=300_000, transaction_date=datetime.date(2026, 10, 1))
        before = list(JournalLine.objects.values_list('account__code', 'debit', 'credit').order_by('account__code'))
        JournalEntry.objects.all().delete()
        posting.rebuild(self.company)
        after = list(JournalLine.objects.values_list('account__code', 'debit', 'credit').order_by('account__code'))
        self.assertEqual(before, after)


@override_settings(LEDGER_AUTO_POST=True)
class ReportTests(LedgerTestBase):
    def setUp(self):
        super().setUp()
        from apps.master_data.models import OpeningBalance
        OpeningBalance.objects.create(account_code='1111', account_name='Tiền mặt', entity_name='Quỹ',
                                      opening_date=datetime.date(2026, 1, 1), debit_amount=10_000_000)
        OpeningBalance.objects.create(account_code='411', account_name='Vốn', entity_name='Vốn góp', category='OTHER',
                                      opening_date=datetime.date(2026, 1, 1), credit_amount=10_000_000)
        with self.captureOnCommitCallbacks(execute=True):
            CashTransaction.objects.create(code='PC-R-1', transaction_type='OUTFLOW', payment_method='CASH',
                                           category='OTHER_OUTFLOW', amount=1_200_000, transaction_date=datetime.date(2026, 9, 15))
            CashTransaction.objects.create(code='PT-R-1', transaction_type='INFLOW', payment_method='CASH',
                                           category='OTHER_INFLOW', amount=700_000, transaction_date=datetime.date(2026, 10, 15))

    def test_trial_balance_balances(self):
        data = reports.trial_balance(self.company, datetime.date(2026, 10, 1), datetime.date(2026, 10, 31))
        t = data['totals']
        self.assertEqual(t['opening_debit'], t['opening_credit'])
        self.assertEqual(t['period_debit'], t['period_credit'])
        self.assertEqual(t['closing_debit'], t['closing_credit'])
        row = {r['code']: r for r in data['rows']}
        self.assertEqual(row['111']['opening_debit'], 8_800_000)
        self.assertEqual(row['111']['closing_debit'], 9_500_000)
        self.assertEqual(row['6422']['opening_debit'], 1_200_000)

    def test_account_ledger(self):
        data = reports.account_ledger(self.company, '111', datetime.date(2026, 10, 1), datetime.date(2026, 10, 31))
        self.assertEqual(data['opening'], 8_800_000)
        self.assertEqual(data['closing'], 9_500_000)
        self.assertEqual(data['rows'][0]['contra'], '711')

    def test_api_and_excel(self):
        user = User.objects.create_superuser('ketoan_lg', 'k@example.com', 'Pw-Ledger#2026')
        self.client.force_login(user)
        res = self.client.get('/api/ledger/trial-balance/?from=2026-10-01&to=2026-10-31')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['form'], 'F01-DNN')
        for url in ('/api/ledger/trial-balance/', '/api/ledger/journal/', '/api/ledger/accounts/111/ledger/'):
            res = self.client.get(url + '?from=2026-10-01&to=2026-10-31&export=xlsx')
            self.assertEqual(res.status_code, 200, url)
            self.assertTrue(res.content.startswith(b'PK'))
        self.assertEqual(self.client.get('/api/ledger/trial-balance/?from=2026-13-01').status_code, 400)

    def test_api_requires_finance_role(self):
        user = User.objects.create_user('nv_lg', password='Pw-Ledger#2026')
        self.client.force_login(user)
        self.assertEqual(self.client.get('/api/ledger/trial-balance/').status_code, 403)

    def test_mapping_api(self):
        import json
        user = User.objects.create_superuser('ketoan_map', 'm@example.com', 'Pw-Ledger#2026')
        self.client.force_login(user)
        data = self.client.get('/api/ledger/mapping/').json()
        self.assertEqual(data['regime'], 'TT133')
        item = {i['key']: i for i in data['items']}
        self.assertEqual(item['fuel']['effective'], '632')
        self.assertNotIn('111', [a['code'] for a in data['accounts']])  # chỉ tài khoản chi tiết
        put = lambda body: self.client.put('/api/ledger/mapping/', json.dumps(body), content_type='application/json')
        self.assertEqual(put({'overrides': {'fuel': '9999'}}).status_code, 400)
        self.assertEqual(put({'overrides': {'khong_co': '632'}}).status_code, 400)
        res = put({'overrides': {'admin_other': '6422', 'fuel': '154'}})
        self.assertEqual(res.status_code, 200, res.content)
        self.company.refresh_from_db()
        self.assertEqual(self.company.ledger_account_overrides, {'fuel': '154'})  # trùng mặc định thì không lưu
        self.assertEqual({i['key']: i for i in res.json()['items']}['fuel']['effective'], '154')

    def test_mapping_regime_change_needs_director(self):
        import json
        user = User.objects.create_user('kt_thuong', password='Pw-Ledger#2026')
        Employee.objects.create(code='KTLG', full_name='Kế Toán Sổ Cái', phone_number='0900000010',
                                role=EmployeeRole.ACCOUNTANT, user=user)
        self.client.force_login(user)
        res = self.client.put('/api/ledger/mapping/', json.dumps({'regime': 'TT200'}), content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(self.client.get('/api/ledger/mapping/').json()['can_change_regime'])
