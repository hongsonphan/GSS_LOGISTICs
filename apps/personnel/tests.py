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
    def test_available_users_api(self):
        res = self.client.get('/api/personnel/users-available/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in res.json()['results']]
        self.assertIn(self.director_user.username, usernames)

    def test_assign_user_to_employee_and_release_on_delete(self):
        test_user = User.objects.create_user(username='test_acc_link', password='Password123!')
        emp = Employee.objects.create(
            code='NV_TEST_LINK',
            full_name='Nhân Sự Gán User',
            phone_number='0912345678',
            department=Department.ADMIN_ACC,
            role=EmployeeRole.STAFF_ADMIN_ACC,
            user=test_user
        )
        self.assertEqual(emp.user, test_user)

        # Xóa nhân sự sẽ tự giải phóng user
        emp.delete()
        emp.refresh_from_db()
        self.assertIsNone(emp.user)

        # Gán lại cho nhân sự mới hoàn toàn hợp lệ
        emp2 = Employee.objects.create(
            code='NV_TEST_LINK_2',
            full_name='Nhân Sự Gán User 2',
            phone_number='0912345679',
            department=Department.ADMIN_ACC,
            role=EmployeeRole.STAFF_ADMIN_ACC,
            user=test_user
        )
        self.assertEqual(emp2.user, test_user)

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
            'contract_number': 'HDLD.2025.0001',
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
            'appendix_number': 'HDLD.2025.0001.PL1',
            'effective_date': '2025-06-01',
            'new_base_salary': 7000000,
            'change_summary': 'Tăng lương cơ bản'
        }
        res2 = self.client.post('/api/personnel/appendices/', app_payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res2.json()['success'])

    def test_contract_and_appendix_numbering_rules(self):
        """
        Kiểm thử quy tắc sinh mã HĐLĐ và Phụ lục theo chuẩn:
        - HĐLĐ: HDLD.2026.xxxx
        - Phụ lục: HDLD.2026.xxxx.PL1, HDLD.2026.xxxx.PL2
        - HDTV: HDTV.2026.xxxx
        - HDKV: HDKV.2026.xxxx
        """
        # 1. Sinh số tự động
        hdld_code = LaborContract.generate_next_contract_number('DEFINITE_TERM', 2026)
        self.assertTrue(hdld_code.startswith('HDLD.2026.'))
        
        hdtv_code = LaborContract.generate_next_contract_number('PROBATION', 2026)
        self.assertTrue(hdtv_code.startswith('HDTV.2026.'))

        hdkv_code = LaborContract.generate_next_contract_number('SEASONAL', 2026)
        self.assertTrue(hdkv_code.startswith('HDKV.2026.'))

        # 2. Tạo HĐ qua API không truyền contract_number -> hệ thống tự sinh theo rule
        c_res = self.client.post('/api/personnel/contracts/', {
            'employee': self.driver_emp.id,
            'contract_type': 'DEFINITE_TERM',
            'sign_date': '2026-01-01',
            'start_date': '2026-01-01',
            'base_salary': 8000000,
        }, format='json')
        self.assertEqual(c_res.status_code, status.HTTP_201_CREATED)
        c_data = c_res.json()['data']
        contract_num = c_data['contract_number']
        self.assertTrue(contract_num.startswith('HDLD.2026.'))

        # 3. Tạo Phụ lục 1 tự sinh số
        app1_res = self.client.post('/api/personnel/appendices/', {
            'contract': c_data['id'],
            'effective_date': '2026-03-01',
            'change_summary': 'Điều chỉnh phụ cấp PL1',
        }, format='json')
        self.assertEqual(app1_res.status_code, status.HTTP_201_CREATED)
        app1_data = app1_res.json()['data']
        self.assertEqual(app1_data['appendix_number'], f"{contract_num}.PL1")

        # 4. Tạo Phụ lục 2 tự sinh số
        app2_res = self.client.post('/api/personnel/appendices/', {
            'contract': c_data['id'],
            'effective_date': '2026-06-01',
            'change_summary': 'Điều chỉnh lương PL2',
        }, format='json')
        self.assertEqual(app2_res.status_code, status.HTTP_201_CREATED)
        app2_data = app2_res.json()['data']
        self.assertEqual(app2_data['appendix_number'], f"{contract_num}.PL2")

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

    def test_active_contract_integration_and_union_deduction(self):
        """
        Kiểm thử chuyên sâu tính lương theo Hợp Đồng Lao Động Hiện Hành (BIM ERP Standard):
        - HĐLĐ thiết lập: Lương CB, Lương BHXH, Phụ cấp, Trợ cấp, Tỷ lệ hưởng lương, Trích nộp BHXH/Thuế/Công đoàn
        - Phụ lục điều chỉnh mức lương mới
        - Tính toán kỳ lương: Kế thừa đầy đủ các thông số HĐ hiện hành & phụ lục, trích 1% đoàn phí công đoàn NLĐ.
        """
        # 1. Ký Hợp đồng lao động mới cho tài xế
        contract_res = self.client.post('/api/personnel/contracts/', {
            'contract_number': 'HDLD-TEST-2026',
            'employee': self.driver_emp.id,
            'contract_type': 'DEFINITE_TERM',
            'status': 'ACTIVE',
            'department': 'FLEET',
            'role': 'DRIVER',
            'job_title': 'Tài xế container đường dài',
            'start_date': '2026-01-01',
            'end_date': '2027-01-01',
            'base_salary': 8000000,
            'insurance_salary': 6000000,
            'allowance_amount': 1500000,
            'subsidy_amount': 730000,
            'probation_rate': 100.0,
            'is_social_insurance_participant': True,
            'is_taxable': True,
            'is_union_member': True,
            'tax_resident_type': 'RESIDENT'
        }, format='json')
        self.assertEqual(contract_res.status_code, status.HTTP_201_CREATED)
        contract_id = contract_res.json()['data']['id']

        # Kiểm tra Employee property helper
        self.driver_emp.refresh_from_db()
        self.assertIsNotNone(self.driver_emp.active_contract)
        self.assertEqual(self.driver_emp.active_base_salary, Decimal('8000000'))
        self.assertEqual(self.driver_emp.active_insurance_salary, Decimal('6000000'))
        self.assertEqual(self.driver_emp.active_allowance_amount, Decimal('1500000'))
        self.assertEqual(self.driver_emp.active_subsidy_amount, Decimal('730000'))
        self.assertEqual(self.driver_emp.active_total_salary, Decimal('10230000'))
        self.assertTrue(self.driver_emp.active_is_bhxh)
        self.assertTrue(self.driver_emp.active_is_tncn)
        self.assertTrue(self.driver_emp.active_is_cong_doan)

        # 2. Tạo Phụ lục hợp đồng điều chỉnh lương
        app_res = self.client.post('/api/personnel/appendices/', {
            'contract': contract_id,
            'appendix_number': 'PL02/HDLD-TEST',
            'effective_date': '2026-02-01',
            'new_base_salary': 9000000,
            'new_insurance_salary': 7000000,
            'new_allowance_amount': 2000000,
            'new_subsidy_amount': 800000,
            'change_summary': 'Điều chỉnh nâng bậc lương và phụ cấp trách nhiệm'
        }, format='json')
        self.assertEqual(app_res.status_code, status.HTTP_201_CREATED)

        self.driver_emp.refresh_from_db()
        self.assertIsNotNone(self.driver_emp.latest_appendix)
        self.assertEqual(self.driver_emp.active_base_salary, Decimal('9000000'))
        self.assertEqual(self.driver_emp.active_insurance_salary, Decimal('7000000'))
        self.assertEqual(self.driver_emp.active_total_salary, Decimal('11800000'))

        # 3. Tính lương cho kỳ Tháng 11/2026
        period_res = self.client.post('/api/personnel/periods/', {
            'period_code': '2026-11',
            'name': 'Bảng lương Tháng 11/2026',
            'from_date': '2026-11-01',
            'to_date': '2026-11-30',
            'standard_days': 26.0
        }, format='json')
        self.assertEqual(period_res.status_code, status.HTTP_201_CREATED)
        p_id = period_res.json()['data']['id']

        calc_res = self.client.post(f'/api/personnel/periods/{p_id}/calculate/', {}, format='json')
        self.assertEqual(calc_res.status_code, status.HTTP_200_OK)

        # 4. Kiểm tra phiếu lương của tài xế kế thừa từ HĐ và phụ lục
        slip = PayrollSlip.objects.get(period_id=p_id, employee=self.driver_emp)
        self.assertEqual(slip.contract_id, contract_id)
        self.assertEqual(slip.base_salary, Decimal('9000000'))
        self.assertEqual(slip.allowance_amount, Decimal('2000000'))
        self.assertEqual(slip.subsidy_amount, Decimal('800000'))
        # Đoàn phí công đoàn 1% LCB: 9,000,000 * 1% = 90,000 đ
        self.assertEqual(slip.union_fee_employee, Decimal('90000'))
        # Bảo hiểm NLĐ: 7,000,000 * 10.5% = 735,000 đ
        self.assertEqual(slip.total_insurance_employee, Decimal('735000'))
        # Kiểm tra Net = Gross - BHXH - Công đoàn - Thuế - Tạm ứng
        expected_net = slip.gross_income - slip.total_insurance_employee - slip.union_fee_employee - slip.pit_amount - slip.advance_deductions - slip.other_deductions
        self.assertEqual(slip.net_salary, expected_net)


    def test_employee_auto_code_generation(self):
        # Kiểm tra quy tắc sinh mã tự động theo vai trò và phòng ban
        code_driver = Employee.generate_next_code(role=EmployeeRole.DRIVER)
        self.assertTrue(code_driver.startswith('TX'))
        self.assertGreaterEqual(len(code_driver), 5) # TX001

        code_disp = Employee.generate_next_code(role=EmployeeRole.DISPATCHER)
        self.assertTrue(code_disp.startswith('DD'))

        code_acc = Employee.generate_next_code(role=EmployeeRole.ACCOUNTANT)
        self.assertTrue(code_acc.startswith('KT'))

        # Tạo nhân sự không truyền code -> tự sinh mã
        emp1 = Employee.objects.create(
            full_name='Lái xe Tự Sinh Mã 1',
            phone_number='0988111222',
            role=EmployeeRole.DRIVER,
            department=Department.FLEET
        )
        self.assertEqual(emp1.code, code_driver)

        # Tạo nhân sự thứ 2 cùng vai trò -> tăng STT
        emp2 = Employee.objects.create(
            full_name='Lái xe Tự Sinh Mã 2',
            phone_number='0988333444',
            role=EmployeeRole.DRIVER,
            department=Department.FLEET
        )
        expected_stt = int(emp1.code.replace('TX', '')) + 1
        self.assertEqual(emp2.code, f"TX{expected_stt:03d}")

    def test_export_employee_template_and_data_api(self):
        # 1. Tải mẫu template
        res_tpl = self.client.get('/api/personnel/employees/export-template/')
        self.assertEqual(res_tpl.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', res_tpl['Content-Type'])
        self.assertIn('Mau_Nhap_Ho_So_Nhan_Su.xlsx', res_tpl['Content-Disposition'])

        # 2. Xuất dữ liệu nhân sự hiện tại
        res_data = self.client.get('/api/personnel/employees/export-data/')
        self.assertEqual(res_data.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', res_data['Content-Type'])
        self.assertIn('Danh_Sach_Nhan_Su', res_data['Content-Disposition'])

    def test_import_employees_create_and_update(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.personnel.import_export_service import generate_employee_template

        wb, _ = generate_employee_template()
        ws = wb.active

        # Thêm 2 dòng nhân viên mới vào file Excel
        # Dòng 1: Tài xế mới để trống mã NV (tự sinh TX...)
        ws.append([
            '', 'Phan Minh Hoàng', 'HOÀNG 50B', '0937888999', 'hoang.phan@trienvo.vn',
            'Đội Xe & Bãi', 'Tài xế', 'Nam', '1990-08-12', '079090001234', '2020-05-10', 'Cục CS QLHC về TTXH',
            '8090001234', '7990001234', 'Xã Phú Hữu, Nhơn Trạch, Đồng Nai', 'Bãi xe Suối Tiên',
            '012345678901', 'Vietcombank', 'CN Thủ Đức', 'PHAN MINH HOANG', '2024-01-15',
            7000000, 5500000, 'GPLX-FC-999888', '2029-08-12', 'Hoạt động'
        ])

        # Dòng 2: Kế toán mới có mã chỉ định KT901
        ws.append([
            'KT901', 'Vũ Thị Thanh Thảo', 'THẢO KT', '0912444555', 'thao.vu@trienvo.vn',
            'Kế Toán Tài Chính', 'Kế toán viên', 'Nữ', '1996-03-25', '079096005555', '2022-01-15', 'Cục CS QLHC về TTXH',
            '8096005555', '7996005555', 'Q. Bình Thạnh, TP.HCM', 'Q. Bình Thạnh, TP.HCM',
            '987654321098', 'Techcombank', 'CN Sài Gòn', 'VU THI THANH THAO', '2024-02-01',
            11000000, 6000000, '', '', 'Hoạt động'
        ])

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)

        uploaded = SimpleUploadedFile(
            'test_employees_import.xlsx',
            out.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        res = self.client.post('/api/personnel/employees/import/', {
            'file': uploaded,
            'update_existing': 'true'
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))
        self.assertEqual(res.data.get('created_count'), 2)

        # Kiểm tra database: 2 nhân viên đã được tạo
        emp_hoang = Employee.objects.get(phone_number='0937888999')
        self.assertEqual(emp_hoang.full_name, 'Phan Minh Hoàng')
        self.assertTrue(emp_hoang.code.startswith('TX'))

        emp_thao = Employee.objects.get(code='KT901')
        self.assertEqual(emp_thao.full_name, 'Vũ Thị Thanh Thảo')
        self.assertEqual(emp_thao.role, EmployeeRole.STAFF_ADMIN_ACC)

        # Test xóa mềm (soft-delete) sau đó import lại có cờ update_existing=True -> khôi phục
        emp_thao.is_deleted = True
        emp_thao.save()

        out2 = io.BytesIO()
        wb.save(out2)
        out2.seek(0)
        uploaded2 = SimpleUploadedFile(
            'test_employees_import_update.xlsx',
            out2.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        res2 = self.client.post('/api/personnel/employees/import/', {
            'file': uploaded2,
            'update_existing': 'true'
        }, format='multipart')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data.get('updated_count'), 2)

        emp_thao.refresh_from_db()
        self.assertFalse(emp_thao.is_deleted)


    def test_delete_employee_with_contracts_and_reasons(self):
        # 1. Tạo nhân viên có hợp đồng lao động
        emp = Employee.objects.create(
            full_name='Nhân Viên Test Xóa',
            phone_number='0944000111',
            department=Department.HR,
            role=EmployeeRole.DIRECTOR
        )
        contract = LaborContract.objects.create(
            employee=emp,
            contract_number='HDLD-TEST-DELETE-001',
            contract_type=ContractType.DEFINITE_TERM,
            start_date=datetime.date(2024, 1, 1),
            status=ContractStatus.ACTIVE
        )
        dep = EmployeeDependent.objects.create(
            employee=emp,
            full_name='Người Phụ Thuộc Test',
            relationship='Con',
            start_date=datetime.date(2024, 1, 1)
        )

        # Xóa nhân viên -> thành công, hợp đồng và người phụ thuộc tự động đồng bộ soft-delete
        res = self.client.delete(f'/api/personnel/employees/{emp.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))

        emp.refresh_from_db()
        self.assertTrue(emp.is_deleted)
        self.assertFalse(emp.is_active)

        contract.refresh_from_db()
        self.assertTrue(contract.is_deleted)
        self.assertEqual(contract.status, ContractStatus.TERMINATED)

        dep.refresh_from_db()
        self.assertTrue(dep.is_deleted)

    def test_org_chart_departments_and_13_positions(self):
        """
        Kiểm tra toàn diện cơ cấu tổ chức theo sơ đồ:
        - 5 Phòng ban (4 ô xanh + hải quan) + Ban Giám Đốc
        - 13 Vị trí (+ Giám Đốc)
        - Quy tắc sinh mã tương ứng từng phòng ban/vị trí
        """
        # 1. Ban Giám Đốc
        self.assertEqual(Department.MANAGEMENT, 'MANAGEMENT')
        self.assertEqual(EmployeeRole.DIRECTOR, 'DIRECTOR')
        code_dir = Employee.generate_next_code(role=EmployeeRole.DIRECTOR, department=Department.MANAGEMENT)
        self.assertTrue(code_dir.startswith('BGD'))

        # 2. Phòng Hành Chính & Kế Toán (2 vị trí)
        self.assertEqual(Department.ADMIN_ACC, 'ADMIN_ACC')
        self.assertEqual(EmployeeRole.LEAD_ADMIN_ACC, 'LEAD_ADMIN_ACC')
        self.assertEqual(EmployeeRole.STAFF_ADMIN_ACC, 'STAFF_ADMIN_ACC')
        code_lead_acc = Employee.generate_next_code(role=EmployeeRole.LEAD_ADMIN_ACC, department=Department.ADMIN_ACC)
        self.assertTrue(code_lead_acc.startswith('KT'))

        # 3. Phòng Điều Vận (4 vị trí)
        self.assertEqual(Department.DISPATCH, 'DISPATCH')
        self.assertEqual(EmployeeRole.LEAD_DISPATCH, 'LEAD_DISPATCH')
        self.assertEqual(EmployeeRole.DISPATCHER, 'DISPATCHER')
        self.assertEqual(EmployeeRole.DISPATCH_ASST, 'DISPATCH_ASST')
        self.assertEqual(EmployeeRole.DRIVER, 'DRIVER')
        code_driver = Employee.generate_next_code(role=EmployeeRole.DRIVER, department=Department.DISPATCH)
        self.assertTrue(code_driver.startswith('TX'))
        code_lead_disp = Employee.generate_next_code(role=EmployeeRole.LEAD_DISPATCH, department=Department.DISPATCH)
        self.assertTrue(code_lead_disp.startswith('DD'))

        # 4. Phòng Kinh Doanh (3 vị trí)
        self.assertEqual(Department.SALES, 'SALES')
        self.assertEqual(EmployeeRole.LEAD_SALES, 'LEAD_SALES')
        self.assertEqual(EmployeeRole.SALESMAN, 'SALESMAN')
        self.assertEqual(EmployeeRole.CSKH, 'CSKH')
        code_lead_sales = Employee.generate_next_code(role=EmployeeRole.LEAD_SALES, department=Department.SALES)
        self.assertTrue(code_lead_sales.startswith('KD'))
        code_cskh = Employee.generate_next_code(role=EmployeeRole.CSKH, department=Department.SALES)
        self.assertTrue(code_cskh.startswith('KD'))

        # 5. Phòng Bảo Trì Vận Hành (2 vị trí)
        self.assertEqual(Department.MAINTENANCE, 'MAINTENANCE')
        self.assertEqual(EmployeeRole.LEAD_MAINT, 'LEAD_MAINT')
        self.assertEqual(EmployeeRole.MECHANIC, 'MECHANIC')
        code_lead_maint = Employee.generate_next_code(role=EmployeeRole.LEAD_MAINT, department=Department.MAINTENANCE)
        self.assertTrue(code_lead_maint.startswith('BT'))

        # 6. Phòng Dịch Vụ Hải Quan (2 vị trí)
        self.assertEqual(Department.CUSTOMS, 'CUSTOMS')
        self.assertEqual(EmployeeRole.LEAD_CUSTOMS, 'LEAD_CUSTOMS')
        self.assertEqual(EmployeeRole.CUSTOMS_STAFF, 'CUSTOMS_STAFF')
        code_lead_customs = Employee.generate_next_code(role=EmployeeRole.LEAD_CUSTOMS, department=Department.CUSTOMS)
        self.assertTrue(code_lead_customs.startswith('HQ'))

    def test_user_to_employee_name_and_email_sync(self):
        """Kiểm thử khi cập nhật Họ Tên & Email của User trong Django Admin thì Employee tự động đồng bộ."""
        self.director_user.last_name = "Nguyễn Minh"
        self.director_user.first_name = "Thuận"
        self.director_user.email = "dieudo.tvl@trienvo.com"
        self.director_user.save()

        # Reload Employee và kiểm tra
        emp = Employee.objects.get(id=self.director_emp.id)
        self.assertEqual(emp.full_name, "Nguyễn Minh Thuận")
        self.assertEqual(emp.email, "dieudo.tvl@trienvo.com")



class PayrollCalculateFreshInstallTestCase(TestCase):
    """Hệ thống mới chưa có cấu hình tỷ lệ BHXH: tính lương không được lỗi 500 (Decimal x float)."""

    def test_calculate_without_existing_rates(self):
        from apps.personnel.models import PayrollPolicyConfig, SalaryDeductionRate
        PayrollPolicyConfig.objects.all().delete()
        SalaryDeductionRate.objects.all().delete()
        client = APIClient()
        user = User.objects.create_superuser(username='hr_fresh', password='Password123!', email='hr@bim.test')
        Employee.objects.create(user=user, code='NV-FRESH', full_name='Nhân viên mới', phone_number='0907777777',
                                department=Department.MANAGEMENT, role=EmployeeRole.DIRECTOR, base_salary=15000000,
                                insurance_salary=10000000, is_social_insurance_participant=True)
        client.force_authenticate(user)
        res = client.post('/api/personnel/periods/', {'period_code': '2026-11', 'name': 'Lương T11', 'from_date': '2026-11-01',
                                                      'to_date': '2026-11-30', 'standard_days': 26}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        period_id = res.json().get('id') or res.json().get('data', {}).get('id')
        calc = client.post(f'/api/personnel/periods/{period_id}/calculate/', {}, format='json')
        self.assertEqual(calc.status_code, status.HTTP_200_OK, calc.content[:300])
