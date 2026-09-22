from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.master_data.models import (
    Location, LocationType,
    ContainerType, ContainerCategory,
    ExpenseItem, ExpenseCategoryGroup,
    DriverSalaryTariff, DriverAllowanceCatalog, AllowanceCategory
)

class MasterDataAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.location = Location.objects.create(
            code='TEST_CAT_LAI',
            name='Cảng Test Cát Lái',
            location_type=LocationType.PORT,
            address='Nguyễn Thị Định, Thủ Đức',
            province='TP.HCM'
        )
        self.tariff = DriverSalaryTariff.objects.create(
            area_group='Khu Vực Củ Chi',
            route_name='KCN Tân Phú Trung',
            salary_rate=600000,
            notes='Test route'
        )
        self.allowance = DriverAllowanceCatalog.objects.create(
            code='TEST_CAI_MEP',
            name='Phụ thêm Cái Mép Test',
            category=AllowanceCategory.PORT,
            amount=500000
        )

    def test_summary_api(self):
        res = self.client.get('/api/master-data/summary/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('driver_tariffs_count', res.data['stats'])
        self.assertGreaterEqual(res.data['stats']['driver_tariffs_count'], 1)

    def test_driver_tariffs_crud(self):
        # List
        res = self.client.get('/api/master-data/driver-tariffs/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data['results']), 1)

        # Create
        create_res = self.client.post('/api/master-data/driver-tariffs/', {
            'area_group': 'Khu Vực Bình Dương',
            'route_name': 'KCN Bàu Bàng Mới',
            'salary_rate': 650000,
            'notes': 'Test create'
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        new_id = create_res.data['id']

        # Update
        update_res = self.client.put(f'/api/master-data/driver-tariffs/{new_id}/', {
            'salary_rate': 680000
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)

        # Delete (soft delete)
        del_res = self.client.delete(f'/api/master-data/driver-tariffs/{new_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertFalse(DriverSalaryTariff.objects.filter(id=new_id).exists())

    def test_allowances_crud(self):
        # List
        res = self.client.get('/api/master-data/allowances/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Create
        create_res = self.client.post('/api/master-data/allowances/', {
            'code': 'TEST_HIEP_PHUOC',
            'name': 'Cảng Hiệp Phước Test',
            'category': 'PORT',
            'amount': 350000
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
