from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.personnel.models import Employee, Department, EmployeeRole

User = get_user_model()

class EmployeeCRUDAPITestCase(TestCase):
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
            base_salary=20000000
        )
        self.driver_emp = Employee.objects.create(
            code='TX999',
            full_name='Tài Xế Test A',
            nickname='BỤI 99',
            phone_number='0908888888',
            department=Department.FLEET,
            role=EmployeeRole.DRIVER,
            license_number='GPLX-FC-12345',
            base_salary=7500000
        )
        self.client.force_authenticate(user=self.director_user)

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
            'is_active': True
        }
        res = self.client.post('/api/personnel/employees/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.json()['success'])
        self.assertEqual(res.json()['data']['code'], 'TX888')
        self.assertTrue(Employee.objects.filter(code='TX888').exists())

    def test_create_employee_duplicate_code_fails(self):
        payload = {
            'code': 'TX999', # Duplicate
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

    def test_employee_stats(self):
        res = self.client.get('/api/personnel/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('stats', data)
        self.assertIn('options', data)
        self.assertGreaterEqual(data['stats']['total'], 2)
