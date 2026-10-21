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

    def test_company_profile_crud(self):
        from apps.master_data.models import CompanyProfile
        # 1. GET current profile (auto created if none)
        res = self.client.get('/api/master-data/company/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))
        self.assertIn('TRIỀN VÕ', res.data['data']['company_name'])
        self.assertEqual(res.data['data']['tax_code'], '0314567890')
        self.assertEqual(res.data['data']['logo_url'], '/static/images/trienvo_logo.png')

        # 2. PUT update profile
        update_res = self.client.put('/api/master-data/company/', {
            'company_name': 'CÔNG TY TNHH VẬN TẢI & LOGISTICS TRIỀN VÕ',
            'short_name': 'TRIEN VO LOGISTICS CORP',
            'tax_code': '0319999888',
            'phone': '0903.888.999',
            'branch_name': 'Chi Nhánh Hải Phòng',
            'branch_address': 'KCN Đình Vũ, Hải Phòng',
            'branch_phone': '0225.3123.456',
            'fleet_yard_name': 'Bãi Xe Trung Tâm Sóng Thần',
            'fleet_yard_address': 'ĐT743, Dĩ An, Bình Dương',
            'fleet_yard_hotline': '0918.888.999',
            'notes': 'Chính sách kiểm đếm hàng hóa & seal nghiêm ngặt',
            'default_vat_rate': 10.0,
            'fuel_reference_price': 22500,
            'cbm_formula_divisor': 6000
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertTrue(update_res.data.get('success'))
        self.assertEqual(update_res.data['data']['short_name'], 'TRIEN VO LOGISTICS CORP')
        self.assertEqual(update_res.data['data']['branch_name'], 'Chi Nhánh Hải Phòng')
        self.assertEqual(update_res.data['data']['fleet_yard_name'], 'Bãi Xe Trung Tâm Sóng Thần')
        self.assertEqual(update_res.data['data']['default_vat_rate'], 10.0)
        self.assertEqual(update_res.data['data']['fuel_reference_price'], 22500.0)
        self.assertEqual(update_res.data['data']['cbm_formula_divisor'], 6000)

        # 3. Verify in DB
        company = CompanyProfile.get_default_company()
        self.assertEqual(company.short_name, 'TRIEN VO LOGISTICS CORP')
        self.assertEqual(company.tax_code, '0319999888')
        self.assertEqual(company.branch_name, 'Chi Nhánh Hải Phòng')
        self.assertEqual(company.branch_address, 'KCN Đình Vũ, Hải Phòng')
        self.assertEqual(company.fleet_yard_name, 'Bãi Xe Trung Tâm Sóng Thần')
        self.assertEqual(company.fleet_yard_hotline, '0918.888.999')
        self.assertEqual(company.notes, 'Chính sách kiểm đếm hàng hóa & seal nghiêm ngặt')
        self.assertEqual(float(company.default_vat_rate), 10.0)


class OpeningBalanceAPITestCase(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from apps.master_data.models import OpeningBalance, OpeningBalanceCategory
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(username='ob_admin', email='ob@test.com', password='password123')
        self.client.force_authenticate(user=self.admin_user)

        self.b1 = OpeningBalance.objects.create(
            account_code='1111',
            account_name='Tiền mặt tại quỹ',
            category=OpeningBalanceCategory.CASH_FUND,
            entity_code='QTM_VP',
            entity_name='Quỹ Tiền Mặt Văn Phòng',
            opening_date='2026-01-01',
            debit_amount=50000000,
            credit_amount=0,
            amount=50000000,
            is_debit=True,
            notes='Tồn quỹ đầu kỳ'
        )
        self.b2 = OpeningBalance.objects.create(
            account_code='131',
            account_name='Phải thu của khách hàng',
            category=OpeningBalanceCategory.CUSTOMER_AR,
            entity_code='KH_SAMSUNG',
            entity_name='Công ty TNHH Samsung',
            opening_date='2026-01-01',
            debit_amount=120000000,
            credit_amount=0,
            amount=120000000,
            is_debit=True,
            notes='Nợ cước tháng trước'
        )

    def test_opening_balance_crud(self):
        # 1. GET list & KPIs
        res = self.client.get('/api/master-data/opening-balances/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))
        self.assertEqual(len(res.data['items']), 2)
        self.assertEqual(res.data['kpis']['total_cash_bank'], 50000000.0)
        self.assertEqual(res.data['kpis']['total_customer_ar'], 120000000.0)
        self.assertIn('account_charts', res.data)

        # 2. POST create với TK 1121 Ngân hàng
        create_res = self.client.post('/api/master-data/opening-balances/', {
            'account_code': '1121',
            'bank_account_number': '19030000000001',
            'bank_name': 'Techcombank Nam SG',
            'entity_code': 'TCB',
            'entity_name': 'Tài khoản Ngân hàng Techcombank',
            'opening_date': '2026-01-01',
            'debit_amount': 25000000,
            'credit_amount': 0,
            'amount': 25000000,
            'is_debit': True,
            'notes': 'Sao kê đầu kỳ'
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(create_res.data.get('success'))
        new_id = create_res.data['data']['id']
        self.assertEqual(create_res.data['data']['account_code'], '1121')
        self.assertEqual(create_res.data['data']['bank_account_number'], '19030000000001')

        # 3. PUT update
        update_res = self.client.put(f'/api/master-data/opening-balances/{new_id}/', {
            'debit_amount': 30000000,
            'notes': 'Sao kê điều chỉnh đầu kỳ'
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data['data']['debit_amount'], 30000000.0)

        # 4. DELETE
        del_res = self.client.delete(f'/api/master-data/opening-balances/{new_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertTrue(del_res.data.get('success'))


    def test_subcontractor_3pl_drivers_and_fleet(self):
        """Kiểm thử nghiệp vụ Quản lý Đối tác 3PL (Phương án 3): 1 Đối tác có 3 xe và 3 tài xế."""
        from apps.master_data.models import Subcontractor, SubcontractorDriver
        from apps.fleet.models import Vehicle, VehicleOwnership, VehicleType

        # 1. Tạo Đối tác 3PL: Công ty Vận tải An Phú
        sub = Subcontractor.objects.create(
            code='NX_ANPHU',
            name='Công ty Vận tải An Phú (3PL)',
            phone='0909111222',
            contact_person='Anh Phú',
            tax_code='0312999888'
        )

        # 2. Tạo 3 Xe của An Phú
        v1 = Vehicle.objects.create(license_plate='51C-111.11', vehicle_type=VehicleType.TRACTOR, ownership_type=VehicleOwnership.SUBCONTRACTOR, subcontractor=sub)
        v2 = Vehicle.objects.create(license_plate='51C-222.22', vehicle_type=VehicleType.TRACTOR, ownership_type=VehicleOwnership.SUBCONTRACTOR, subcontractor=sub)
        v3 = Vehicle.objects.create(license_plate='51C-333.33', vehicle_type=VehicleType.TRACTOR, ownership_type=VehicleOwnership.SUBCONTRACTOR, subcontractor=sub)

        # 3. Tạo 3 Tài xế của An Phú
        d1 = SubcontractorDriver.objects.create(subcontractor=sub, full_name='Nguyễn Văn A', phone='0901111001', license_number='FC-111')
        d2 = SubcontractorDriver.objects.create(subcontractor=sub, full_name='Lê Văn B', phone='0901111002', license_number='FC-222')
        d3 = SubcontractorDriver.objects.create(subcontractor=sub, full_name='Trần Văn C', phone='0901111003', license_number='FC-333')

        # 4. Kiểm tra API Fleet của Subcontractor (/api/master-data/subcontractors/<id>/fleet/)
        fleet_res = self.client.get(f'/api/master-data/subcontractors/{sub.id}/fleet/')
        self.assertEqual(fleet_res.status_code, status.HTTP_200_OK)
        self.assertTrue(fleet_res.data.get('success'))
        self.assertEqual(len(fleet_res.data['vehicles']), 3)
        self.assertEqual(len(fleet_res.data['drivers']), 3)

        plates = [v['license_plate'] for v in fleet_res.data['vehicles']]
        self.assertIn('51C-111.11', plates)
        self.assertIn('51C-222.22', plates)
        self.assertIn('51C-333.33', plates)

        driver_names = [d['full_name'] for d in fleet_res.data['drivers']]
        self.assertIn('Nguyễn Văn A', driver_names)
        self.assertIn('Lê Văn B', driver_names)
        self.assertIn('Trần Văn C', driver_names)

        # 5. Kiểm tra API Drivers list & create (/api/master-data/subcontractors/<id>/drivers/)
        drv_res = self.client.get(f'/api/master-data/subcontractors/{sub.id}/drivers/')
        self.assertEqual(drv_res.status_code, status.HTTP_200_OK)
        self.assertEqual(drv_res.data['total'], 3)

        # Thêm tài xế thứ 4 cho An Phú qua API
        add_drv = self.client.post(f'/api/master-data/subcontractors/{sub.id}/drivers/', {
            'full_name': 'Hoàng Văn D',
            'phone': '0901111004',
            'license_number': 'FC-444'
        }, format='json')
        self.assertEqual(add_drv.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SubcontractorDriver.objects.filter(subcontractor=sub).count(), 4)
