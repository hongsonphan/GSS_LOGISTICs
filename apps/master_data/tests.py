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
        from django.contrib.auth.models import User
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(username='master_admin', email='admin@test.com', password='password123')
        self.client.force_authenticate(user=self.admin_user)
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

    def test_shipping_lines_crud(self):
        from apps.master_data.models import ShippingLine
        # List
        res = self.client.get('/api/master-data/shipping-lines/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Create
        create_res = self.client.post('/api/master-data/shipping-lines/', {
            'code': 'TEST_EVERGREEN',
            'name': 'Evergreen Marine Corp Test',
            'contact_phone': '028-3512-1888',
            'contact_email': 'test@evergreen.com',
            'website': 'https://www.evergreen-marine.com',
            'free_dem_days': 7,
            'free_det_days': 5,
            'notes': 'Test hạ bãi Cát Lái'
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        sl_id = create_res.data['id']

        # Update
        update_res = self.client.put(f'/api/master-data/shipping-lines/{sl_id}/', {
            'free_dem_days': 10,
            'free_det_days': 7,
            'name': 'Evergreen Shipping Updated'
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        sl = ShippingLine.objects.get(id=sl_id)
        self.assertEqual(sl.free_dem_days, 10)
        self.assertEqual(sl.name, 'Evergreen Shipping Updated')

        # Delete (soft delete)
        del_res = self.client.delete(f'/api/master-data/shipping-lines/{sl_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertFalse(ShippingLine.objects.filter(id=sl_id).exists())

    def test_trailers_crud(self):
        from apps.fleet.models import Trailer
        # List
        res = self.client.get('/api/master-data/trailers/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Create
        create_res = self.client.post('/api/master-data/trailers/', {
            'license_plate': '51R-999.88',
            'trailer_type': 'MOOC_XUONG_40',
            'brand': 'Tân Thanh',
            'payload_capacity_kg': 32000,
            'registration_expiry': '2027-12-31',
            'status': 'IDLE'
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        tr_id = create_res.data['id']

        # Update
        update_res = self.client.put(f'/api/master-data/trailers/{tr_id}/', {
            'payload_capacity_kg': 32500,
            'status': 'ACTIVE'
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        tr = Trailer.objects.get(id=tr_id)
        self.assertEqual(tr.status, 'ACTIVE')
        self.assertEqual(tr.payload_capacity_kg, 32500)

        # Delete (soft delete)
        del_res = self.client.delete(f'/api/master-data/trailers/{tr_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertFalse(Trailer.objects.filter(id=tr_id).exists())

    def test_subcontractors_crud(self):
        from apps.master_data.models import Subcontractor
        # List
        res = self.client.get('/api/master-data/subcontractors/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Create
        create_res = self.client.post('/api/master-data/subcontractors/', {
            'code': 'NX_TEST_PHUOCHAI',
            'name': 'Công ty Vận tải Phước Hải Test',
            'tax_code': '0319988776',
            'contact_person': 'Phước Hải',
            'phone': '0909.112.233',
            'bank_account_number': '123456789',
            'bank_name': 'Vietcombank',
            'bank_account_holder': 'CTY PHUOC HAI',
            'notes': 'Chuyên tuyến Bình Dương'
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        sc_id = create_res.data['id']

        # Update
        update_res = self.client.put(f'/api/master-data/subcontractors/{sc_id}/', {
            'phone': '0909.999.888',
            'notes': 'Cập nhật tuyến Vũng Tàu'
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        sc = Subcontractor.objects.get(id=sc_id)
        self.assertEqual(sc.phone, '0909.999.888')

        # Delete (soft delete)
        del_res = self.client.delete(f'/api/master-data/subcontractors/{sc_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertFalse(Subcontractor.objects.filter(id=sc_id).exists())

    def test_form_options_includes_new_catalogs(self):
        res = self.client.get('/api/master-data/form-options/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('shipping_lines', res.data)
        self.assertIn('subcontractors', res.data)
        self.assertIn('trailers', res.data)
