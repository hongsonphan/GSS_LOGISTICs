import datetime
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.personnel.models import (
    Employee, Department, EmployeeRole, EmployeeGender,
    EmployeeDependent, LaborContract, ContractAppendix, ContractType, ContractStatus,
    TaxBracket, SalaryDeductionRate, PayrollPolicyConfig,
    PayrollPeriod, PayrollSlip, PayrollPeriodStatus
)
from apps.customers.models import Customer
from apps.fleet.models import Vehicle, Trailer
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.billing.models import CashTransaction, TransactionType, PaymentMethod, CashFlowCategory, DriverTripAdvance

User = get_user_model()

class PersonnelHRMAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.director_user = User.objects.create_superuser(
            username='director_test',
            password='Password123!',
            email='director@bim.test'
        )
        self.director_emp = Employee.objects.create(
            user=self.director_user,
            code='BGD99',
            full_name='Giám Đốc Test',
            phone_number='0909999999',
            department=Department.MANAGEMENT,
            role=EmployeeRole.DIRECTOR,
            base_salary=25000000,
            insurance_salary=10000000,
            is_social_insurance_participant=True
        )

        # Tài xế
        self.driver_emp = Employee.objects.create(
            code='TX999',
            full_name='Tài Xế Test A',
            nickname='BỤI 99',
            phone_number='0908888888',
            department=Department.FLEET,
            role=EmployeeRole.DRIVER,
            license_number='GPLX-FC-12345',
            license_expiry=datetime.date.today() + datetime.timedelta(days=20), # Sắp hết hạn
            base_salary=6000000,
            insurance_salary=5000000,
            is_social_insurance_participant=True,
            bank_account='0071009999999',
            bank_name='Vietcombank',
            bank_beneficiary='TAI XE TEST A'
        )

        # Khởi tạo Master Data Thuế & BHXH
        brackets = [
            (1, 0, 5000000, Decimal('0.05'), 0),
            (2, 5000000, 10000000, Decimal('0.10'), 250000),
            (3, 10000000, 18000000, Decimal('0.15'), 750000),
            (4, 18000000, 32000000, Decimal('0.20'), 1650000),
            (5, 32000000, 52000000, Decimal('0.25'), 3250000),
            (6, 52000000, 80000000, Decimal('0.30'), 5850000),
            (7, 80000000, None, Decimal('0.35'), 9850000),
        ]
        for lvl, min_i, max_i, r, q in brackets:
            TaxBracket.objects.create(
                bracket_level=lvl, min_income=min_i, max_income=max_i,
                tax_rate=r, quick_subtraction=q
            )

        SalaryDeductionRate.objects.create(
            name="Quy định BHXH VN",
            bhxh_employee_rate=Decimal('0.0800'),
            bhyt_employee_rate=Decimal('0.0150'),
            bhtn_employee_rate=Decimal('0.0100'),
            bhxh_employer_rate=Decimal('0.1750'),
            bhyt_employer_rate=Decimal('0.0300'),
            bhtn_employer_rate=Decimal('0.0100'),
            union_employer_rate=Decimal('0.0200'),
            is_active=True
        )

        PayrollPolicyConfig.objects.create(
            personal_relief=Decimal('11000000'),
            dependent_relief=Decimal('4400000'),
            standard_working_days=Decimal('26.0'),
            max_insurance_salary=Decimal('46800000'),
            is_active=True
        )

        self.client.force_authenticate(user=self.director_user)

    # -------------------------------------------------------------
    # Test Employee CRUD & Stats
    # -------------------------------------------------------------
    def test_list_employees(self):
        res = self.client.get('/api/personnel/employees/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.json()['results']), 2)

    def test_filter_employees_by_role(self):
        res = self.client.get('/api/personnel/employees/?role=DRIVER')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.json()['results']
        self.assertTrue(all(e['role'] == 'DRIVER' for e in results))

    def test_create_employee(self):
        payload = {
            'code': 'TX888',
            'full_name': 'Tài Xế Mới Khai Báo',
            'nickname': 'LONG AN',
            'phone_number': '0907777777',
            'department': 'FLEET',
            'role': 'DRIVER',
            'license_number': 'GPLX-FC-88888',
            'base_salary': 8000000,
            'national_id': '079180000888',
            'bank_account': '1903678908888',
            'bank_name': 'Techcombank',
            'is_active': True
        }
        res = self.client.post('/api/personnel/employees/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.json()['success'])
        self.assertEqual(res.json()['data']['code'], 'TX888')
        self.assertTrue(Employee.objects.filter(code='TX888').exists())

    def test_create_employee_duplicate_code_fails(self):
        payload = {
            'code': 'TX999',
            'full_name': 'Tài Xế Trùng Mã',
            'phone_number': '0901111111',
            'department': 'FLEET',
            'role': 'DRIVER'
        }
        res = self.client.post('/api/personnel/employees/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.json()['success'])

    def test_update_employee(self):
        payload = {
            'full_name': 'Tài Xế Test A (Đã Sửa)',
            'base_salary': 9000000
        }
        res = self.client.put(f'/api/personnel/employees/{self.driver_emp.id}/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.driver_emp.refresh_from_db()
        self.assertEqual(self.driver_emp.full_name, 'Tài Xế Test A (Đã Sửa)')
        self.assertEqual(self.driver_emp.base_salary, 9000000)

    def test_soft_delete_employee(self):
        res = self.client.delete(f'/api/personnel/employees/{self.driver_emp.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.driver_emp.refresh_from_db()
        self.assertFalse(self.driver_emp.is_active)

    def test_employee_stats_and_warnings(self):
        res = self.client.get('/api/personnel/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('stats', data)
        self.assertGreaterEqual(data['stats']['total'], 2)
        # Kiểm tra cảnh báo hạn bằng lái GPLX trong 30 ngày
        self.assertGreaterEqual(data['stats']['expiring_licenses_count'], 1)

    # -------------------------------------------------------------
    # Test Dependent & Labor Contract
    # -------------------------------------------------------------
    def test_create_dependent(self):
        payload = {
            'employee': self.driver_emp.id,
            'full_name': 'Con Tài Xế A',
            'relationship': 'Con',
            'start_date': '2024-01-01',
            'is_active': True
        }
        res = self.client.post('/api/personnel/dependents/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.json()['success'])
        self.assertEqual(self.driver_emp.dependents.count(), 1)

    def test_create_contract_and_appendix(self):
        contract_payload = {
            'contract_number': 'HDLD-TX999-2025',
            'employee': self.driver_emp.id,
            'contract_type': 'DEFINITE_TERM',
            'status': 'ACTIVE',
            'start_date': '2025-01-01',
            'end_date': '2027-12-31',
            'base_salary': 6000000,
            'insurance_salary': 5000000
        }
        res = self.client.post('/api/personnel/contracts/', contract_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        contract_id = res.json()['data']['id']

        # Thêm phụ lục
        app_payload = {
            'contract': contract_id,
            'appendix_number': 'PL01',
            'effective_date': '2025-06-01',
            'new_base_salary': 7000000,
            'change_summary': 'Tăng lương cơ bản'
        }
        res2 = self.client.post('/api/personnel/appendices/', app_payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res2.json()['success'])

    # -------------------------------------------------------------
    # Test Hybrid Payroll Engine & Sổ Quỹ CashTransaction Integration
    # -------------------------------------------------------------
    def test_hybrid_payroll_calculation_and_payout(self):
        # 1. Tạo kỳ lương Tháng 10/2026
        period_res = self.client.post('/api/personnel/periods/', {
            'period_code': '2026-10',
            'name': 'Bảng lương Tháng 10/2026',
            'from_date': '2026-10-01',
            'to_date': '2026-10-31',
            'standard_days': 26.0
        }, format='json')
        self.assertEqual(period_res.status_code, status.HTTP_201_CREATED)
        period_id = period_res.json()['data']['id']

        # 2. Tạo dữ liệu chuyến xe DispatchTrip trong tháng 10 cho tài xế
        customer = Customer.objects.create(name='Khách Hàng Test Lương')
        vehicle = Vehicle.objects.create(license_plate='51C-99999', vehicle_type='TRACTOR', registration_expiry=datetime.date(2027, 1, 1))
        trip1 = DispatchTrip.objects.create(
            trip_code='TRIP-HR-001',
            customer=customer,
            vehicle=vehicle,
            driver=self.driver_emp,
            loading_date=datetime.date(2026, 10, 5),
            driver_allowance=1500000,
            status=TripStatus.COMPLETED
        )
        trip2 = DispatchTrip.objects.create(
            trip_code='TRIP-HR-002',
            customer=customer,
            vehicle=vehicle,
            driver=self.director_emp,
            dropoff_driver=self.driver_emp, # Cắt kéo
            loading_date=datetime.date(2026, 10, 12),
            dropoff_driver_allowance=600000,
            detention_driver_allowance=200000,
            status=TripStatus.COMPLETED
        )

        # 3. Tạo tạm ứng chuyến xe cho tài xế
        DriverTripAdvance.objects.create(
            code='TUTX-HR-001',
            driver=self.driver_emp,
            trip=trip1,
            amount=500000,
            advance_date=datetime.date(2026, 10, 4),
            status='ADVANCED'
        )

        # 4. Kê khai người phụ thuộc cho Giám đốc
        EmployeeDependent.objects.create(
            employee=self.director_emp,
            full_name='Con Giám Đốc',
            relationship='Con',
            start_date=datetime.date(2024, 1, 1),
            is_active=True
        )

        # 5. Chạy tính toán lương tự động (Calculate Engine)
        calc_res = self.client.post(f'/api/personnel/periods/{period_id}/calculate/', {}, format='json')
        self.assertEqual(calc_res.status_code, status.HTTP_200_OK)
        self.assertTrue(calc_res.json()['success'])

        # 6. Kiểm tra chi tiết bảng lương chi tiết (PayrollSlip)
        detail_res = self.client.get(f'/api/personnel/periods/{period_id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        slips = detail_res.json()['slips']
        self.assertGreaterEqual(len(slips), 2)

        driver_slip = next(s for s in slips if s['employee_code'] == 'TX999')
        # Kiểm tra thu nhập chuyến xe của tài xế
        self.assertEqual(Decimal(str(driver_slip['trip_allowance'])), Decimal('1500000'))
        self.assertEqual(Decimal(str(driver_slip['dropoff_allowance'])), Decimal('600000'))
        self.assertEqual(Decimal(str(driver_slip['detention_allowance'])), Decimal('200000'))
        # Kiểm tra trừ tạm ứng
        self.assertEqual(Decimal(str(driver_slip['advance_deductions'])), Decimal('500000'))
        # Bảo hiểm: 5tr * 10.5% = 525,000 đ
        self.assertEqual(Decimal(str(driver_slip['total_insurance_employee'])), Decimal('525000'))

        director_slip = next(s for s in slips if s['employee_code'] == 'BGD99')
        # Giám đốc: lương thời gian 25tr, BHXH 10tr * 10.5% = 1,050,000 đ
        self.assertEqual(Decimal(str(director_slip['base_salary'])), Decimal('25000000'))
        self.assertEqual(Decimal(str(director_slip['total_insurance_employee'])), Decimal('1050000'))
        # Giảm trừ: Bản thân 11tr + 1 NPT 4.4tr = 15.4tr
        self.assertEqual(director_slip['dependents_count'], 1)
        # Thu nhập chịu thuế: 25tr - 1.05tr - 15.4tr = 8.55tr -> Bậc 2 (10%, trừ nhanh 250k): 8.55tr * 10% - 250k = 605,000 đ
        self.assertGreater(Decimal(str(director_slip['pit_amount'])), Decimal('0'))

        # 7. Chuyển trạng thái sang REVIEWED rồi LOCKED
        status_res1 = self.client.post(f'/api/personnel/periods/{period_id}/status/', {'status': 'REVIEWED'}, format='json')
        self.assertEqual(status_res1.status_code, status.HTTP_200_OK)
        status_res2 = self.client.post(f'/api/personnel/periods/{period_id}/status/', {'status': 'LOCKED'}, format='json')
        self.assertEqual(status_res2.status_code, status.HTTP_200_OK)

        # 8. Chuyển trạng thái sang PAID -> Kiểm tra tự động sinh phiếu chi Sổ Quỹ
        status_res3 = self.client.post(f'/api/personnel/periods/{period_id}/status/', {'status': 'PAID'}, format='json')
        self.assertEqual(status_res3.status_code, status.HTTP_200_OK)
        
        period = PayrollPeriod.objects.get(pk=period_id)
        self.assertEqual(period.status, PayrollPeriodStatus.PAID)
        self.assertIsNotNone(period.cash_transaction)
        self.assertEqual(period.cash_transaction.category, CashFlowCategory.PAYROLL_SALARY)
        self.assertEqual(period.cash_transaction.transaction_type, TransactionType.OUTFLOW)
        self.assertEqual(period.cash_transaction.amount, period.total_net)

        # Tất cả slip phải chuyển sang is_paid=True
        self.assertTrue(all(s.is_paid for s in period.slips.all()))

        # 9. Test API xuất danh sách chuyển khoản ngân hàng
        bank_res = self.client.get(f'/api/personnel/periods/{period_id}/bank-export/')
        self.assertEqual(bank_res.status_code, status.HTTP_200_OK)
        bank_data = bank_res.json()
        self.assertIn('records', bank_data)
        self.assertEqual(bank_data['total_employees'], len(bank_data['records']))

        # 10. Test API in phiếu lương
        slip_pk = driver_slip['id']
        print_res = self.client.get(f'/api/personnel/slips/{slip_pk}/print/')
        self.assertEqual(print_res.status_code, status.HTTP_200_OK)
        print_data = print_res.json()
        self.assertIn('company', print_data)
        self.assertIn('employee', print_data)
        self.assertIn('slip', print_data)
