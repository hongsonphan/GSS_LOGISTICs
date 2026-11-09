import datetime
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.personnel.models import Employee, Department, EmployeeRole, EmployeeGender
from apps.customers.models import Customer
from apps.fleet.models import Vehicle, Trailer
from apps.dispatch.models import DispatchTrip, TripStatus

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
        )

        # Tài xế
        self.driver_emp = Employee.objects.create(
            code='TX999',
            full_name='Tài Xế Test A',
            nickname='TX99',
            phone_number='0908888888',
            department=Department.FLEET,
            role=EmployeeRole.DRIVER,
            license_number='GPLX-FC-12345',
            license_expiry=datetime.date.today() + datetime.timedelta(days=20), # Sắp hết hạn
            bank_account='0071009999999',
            bank_name='Vietcombank',
            bank_beneficiary='TAI XE TEST A'
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
            'license_number': 'GPLX-NEW'
        }
        res = self.client.put(f'/api/personnel/employees/{self.driver_emp.id}/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.driver_emp.refresh_from_db()
        self.assertEqual(self.driver_emp.full_name, 'Tài Xế Test A (Đã Sửa)')
        self.assertEqual(self.driver_emp.license_number, 'GPLX-NEW')

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
            '', 'Phan Minh Hoàng', 'HOÀNG 50B', '0937888999', 'user@gss-logistics.example.com',
            'Đội Xe & Bãi', 'Tài xế', 'Nam', '1990-08-12', '079090001234', '2020-05-10', 'Cục CS QLHC về TTXH',
            '8090001234', '7990001234', 'Xã Phú Hữu, Nhơn Trạch, Đồng Nai', 'Bãi xe Suối Tiên',
            '012345678901', 'Vietcombank', 'CN Thủ Đức', 'PHAN MINH HOANG', '2024-01-15',
            7000000, 5500000, 'GPLX-FC-999888', '2029-08-12', 'Hoạt động'
        ])

        # Dòng 2: Kế toán mới có mã chỉ định KT901
        ws.append([
            'KT901', 'Vũ Thị Thanh Thảo', 'THẢO KT', '0912444555', 'user@gss-logistics.example.com',
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


    def test_delete_employee_soft_deletes(self):
        emp = Employee.objects.create(full_name='Nhân Viên Test Xóa', phone_number='0944000111',
                                      department=Department.HR, role=EmployeeRole.DIRECTOR)
        res = self.client.delete(f'/api/personnel/employees/{emp.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))
        emp.refresh_from_db()
        self.assertTrue(emp.is_deleted)
        self.assertFalse(emp.is_active)

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
        self.director_user.email = "user@gss-logistics.example.com"
        self.director_user.save()

        # Reload Employee và kiểm tra
        emp = Employee.objects.get(id=self.director_emp.id)
        self.assertEqual(emp.full_name, "Nguyễn Minh Thuận")
        self.assertEqual(emp.email, "user@gss-logistics.example.com")
