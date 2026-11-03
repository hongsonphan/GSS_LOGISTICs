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
        from apps.customers.models import Customer, BookingOrder
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

    def test_trailer_custom_type_and_dual_payload(self):
        """Kiểm thử người dùng tự do nhập loại rơ-moóc mới và tải trọng dạng xxxx/yyyy chuẩn đăng kiểm."""
        from apps.fleet.models import Trailer, parse_payload_input

        # 1. Kiểm thử parse_payload_input helper
        cap1, design1, disp1 = parse_payload_input("30000/27360")
        self.assertEqual(cap1, 27360)
        self.assertEqual(design1, 30000)
        self.assertEqual(disp1, "30.000/27.360")

        cap2, design2, disp2 = parse_payload_input("30.000/27.360")
        self.assertEqual(cap2, 27360)
        self.assertEqual(design2, 30000)
        self.assertEqual(disp2, "30.000/27.360")

        cap3, design3, disp3 = parse_payload_input("32000")
        self.assertEqual(cap3, 32000)
        self.assertEqual(design3, 32000)
        self.assertEqual(disp3, "32.000")

        # Kiểm thử tự động loại bỏ dấu gạch ngang thừa, ký tự kg và khoảng trắng
        cap4, design4, disp4 = parse_payload_input("400.000/878.979- kg")
        self.assertEqual(cap4, 878979)
        self.assertEqual(design4, 400000)
        self.assertEqual(disp4, "400.000/878.979")

        cap5, design5, disp5 = parse_payload_input("—")
        self.assertEqual(cap5, 0)
        self.assertIsNone(design5)
        self.assertEqual(disp5, "")

        cap6, design6, disp6 = parse_payload_input("")
        self.assertEqual(cap6, 0)
        self.assertIsNone(design6)
        self.assertEqual(disp6, "")

        # 2. Tạo rơ-moóc với loại tùy chỉnh người dùng tự gõ và tải trọng dạng 30000/27360
        res = self.client.post('/api/master-data/trailers/', {
            'license_plate': '51R-888.99',
            'trailer_type': 'Moóc Ben Tự Đổ (Hàng Nặng)',
            'brand': 'Doosung',
            'payload_capacity_kg': '30000/27360',
            'registration_expiry': '2027-06-30',
            'status': 'IDLE'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        tr_id = res.data['id']

        tr = Trailer.objects.get(id=tr_id)
        self.assertEqual(tr.trailer_type, 'Moóc Ben Tự Đổ (Hàng Nặng)')
        self.assertEqual(tr.design_payload_kg, 30000)
        self.assertEqual(tr.payload_capacity_kg, 27360)
        self.assertEqual(tr.payload_display, '30.000/27.360')
        self.assertEqual(tr.display_payload, '30.000/27.360')

        # 3. Kiểm tra GET API trả về payload_display chuẩn
        get_res = self.client.get('/api/master-data/trailers/')
        matched = [x for x in get_res.data['results'] if x['id'] == tr_id]
        self.assertTrue(len(matched) > 0)
        self.assertEqual(matched[0]['payload_display'], '30.000/27.360')
        self.assertEqual(matched[0]['trailer_type'], 'Moóc Ben Tự Đổ (Hàng Nặng)')

        # 4. Cập nhật sang dạng số đơn
        up_res = self.client.put(f'/api/master-data/trailers/{tr_id}/', {
            'payload_capacity_kg': '32.500'
        }, format='json')
        self.assertEqual(up_res.status_code, status.HTTP_200_OK)
        tr.refresh_from_db()
        self.assertEqual(tr.payload_capacity_kg, 32500)
        self.assertEqual(tr.payload_display, '32.500')

    def test_vehicle_dual_payload(self):
        """Kiểm thử đầu kéo / xe tải nhập tải trọng xxxx/yyyy chuẩn đăng kiểm."""
        from apps.fleet.models import Vehicle

        res = self.client.post('/api/master-data/vehicles/', {
            'license_plate': '51C-777.88',
            'vehicle_type': 'TRACTOR',
            'ownership_type': 'OWNED',
            'brand': 'Freightliner Cascadia',
            'payload_capacity_kg': '34985/32345',
            'registration_expiry': '2027-12-31',
            'insurance_expiry': '2027-12-31',
            'status': 'IDLE'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        v_id = res.data['id']

        veh = Vehicle.objects.get(id=v_id)
        self.assertEqual(veh.design_payload_kg, 34985)
        self.assertEqual(veh.payload_capacity_kg, 32345)
        self.assertEqual(veh.payload_display, '34.985/32.345')

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

        # Update partner_type to SUPPLIER and set yard_address
        update_res = self.client.put(f'/api/master-data/subcontractors/{sc_id}/', {
            'phone': '0909.999.888',
            'partner_type': 'SUPPLIER',
            'address': '123 Nguyễn Văn Cừ, Q5',
            'yard_address': 'Bãi xe KCN Cát Lái, P. Thạnh Mỹ Lợi, TP Thủ Đức',
            'notes': 'Cập nhật tuyến Vũng Tàu'
        }, format='json')
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        sc = Subcontractor.objects.get(id=sc_id)
        self.assertEqual(sc.phone, '0909.999.888')
        self.assertEqual(sc.partner_type, 'SUPPLIER')
        self.assertEqual(sc.yard_address, 'Bãi xe KCN Cát Lái, P. Thạnh Mỹ Lợi, TP Thủ Đức')

        # List verify partner_type and yard_address
        list_res = self.client.get('/api/master-data/subcontractors/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        item = next((x for x in list_res.data['results'] if x['id'] == sc_id), None)
        self.assertIsNotNone(item)
        self.assertEqual(item['partner_type'], 'SUPPLIER')
        self.assertEqual(item['yard_address'], 'Bãi xe KCN Cát Lái, P. Thạnh Mỹ Lợi, TP Thủ Đức')

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

        # 6. Kiểm tra API Vehicles list & create (/api/master-data/subcontractors/<id>/vehicles/)
        veh_res = self.client.get(f'/api/master-data/subcontractors/{sub.id}/vehicles/')
        self.assertEqual(veh_res.status_code, status.HTTP_200_OK)
        self.assertEqual(veh_res.data['total'], 3)

        # Thêm xe thứ 4 cho An Phú qua API
        add_veh = self.client.post(f'/api/master-data/subcontractors/{sub.id}/vehicles/', {
            'license_plate': '51C-444.44',
            'vehicle_type': 'TRACTOR',
            'payload_capacity_kg': '32000',
            'brand': 'Freightliner'
        }, format='json')
        self.assertEqual(add_veh.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Vehicle.objects.filter(subcontractor=sub).count(), 4)

        # Gỡ xe khỏi An Phú
        del_veh = self.client.delete(f'/api/master-data/subcontractors/{sub.id}/vehicles/{v1.id}/')
        self.assertEqual(del_veh.status_code, status.HTTP_200_OK)
        v1.refresh_from_db()
        self.assertIsNone(v1.subcontractor)
        self.assertEqual(Vehicle.objects.filter(subcontractor=sub).count(), 3)

        # 7. Kiểm tra Tên viết tắt (short_name) trong options
        sub.short_name = 'AN PHU'
        sub.save()
        opt_res = self.client.get('/api/master-data/form-options/')
        self.assertEqual(opt_res.status_code, status.HTTP_200_OK)
        sub_opts = opt_res.data.get('subcontractors', [])
        anphu_opt = next((x for x in sub_opts if x['id'] == sub.id), None)
        self.assertIsNotNone(anphu_opt)
        self.assertEqual(anphu_opt['short_name'], 'AN PHU')
        self.assertIn('[AN PHU]', anphu_opt['label'])

    def test_export_template_api(self):
        res = self.client.get('/api/master-data/export-template/?catalog=locations')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.assertIn('attachment;', res['Content-Disposition'])

        res_cust = self.client.get('/api/master-data/export-template/?catalog=customers')
        self.assertEqual(res_cust.status_code, status.HTTP_200_OK)

        res_invalid = self.client.get('/api/master-data/export-template/?catalog=nonexistent')
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_export_data_api(self):
        res = self.client.get('/api/master-data/export-data/?catalog=locations')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    def test_import_master_data_locations(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.master_data.import_export_service import generate_catalog_template

        wb, _ = generate_catalog_template('locations')
        ws = wb.active
        ws.append(['TEST_NEW_LOC', 'Cảng Mới Nhập Excel', 'Cảng Biển', 'Bình Dương', 'KCN VSIP', 'Anh Test', '0912345678', 'Test ghi chu', 'Hoạt động'])

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)

        uploaded_file = SimpleUploadedFile(
            'locations_import.xlsx',
            out.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        res = self.client.post('/api/master-data/import/', {
            'catalog': 'locations',
            'file': uploaded_file,
            'update_existing': 'true'
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))
        self.assertGreaterEqual(res.data.get('created_count'), 1)
        self.assertTrue(Location.objects.filter(code='TEST_NEW_LOC').exists())

        # Test Upsert: Nhập lại với tên được chỉnh sửa
        out_update = io.BytesIO()
        ws.cell(row=ws.max_row, column=2, value='Cảng Mới Đã Cập Nhật Tên')
        wb.save(out_update)
        out_update.seek(0)

        uploaded_file_2 = SimpleUploadedFile(
            'locations_import_2.xlsx',
            out_update.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        res_update = self.client.post('/api/master-data/import/', {
            'catalog': 'locations',
            'file': uploaded_file_2,
            'update_existing': 'true'
        }, format='multipart')

        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertTrue(res_update.data.get('success'))
        self.assertGreaterEqual(res_update.data.get('updated_count'), 1)
        loc = Location.objects.get(code='TEST_NEW_LOC')
        self.assertEqual(loc.name, 'Cảng Mới Đã Cập Nhật Tên')

    def test_import_master_data_customers_and_tariffs(self):
        import io
        from decimal import Decimal
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.customers.models import Customer, RouteTariff
        from apps.master_data.import_export_service import generate_catalog_template

        # 1. Import Khách hàng
        wb_c, _ = generate_catalog_template('customers')
        ws_c = wb_c.active
        ws_c.append(['KH_IMPORT_TEST', 'Công Ty Test Import Cước', 'TEST IMPORT', '0319998888', '123 Test Street, Q12', 'Nguyễn Test', '0909999888', 'Hợp đồng mới'])

        out_c = io.BytesIO()
        wb_c.save(out_c)
        out_c.seek(0)

        uploaded_cust = SimpleUploadedFile(
            'customers_import.xlsx',
            out_c.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        res_c = self.client.post('/api/master-data/import/', {
            'catalog': 'customers',
            'file': uploaded_cust,
            'update_existing': 'true'
        }, format='multipart')

        self.assertEqual(res_c.status_code, status.HTTP_200_OK)
        self.assertTrue(Customer.objects.filter(code='KH_IMPORT_TEST').exists())

        # 2. Import Biểu cước RouteTariff cho khách hàng vừa tạo
        wb_t, _ = generate_catalog_template('tariffs')
        ws_t = wb_t.active
        ws_t.append(['KH_IMPORT_TEST', 'Cát Lái', 'Bình Dương', 'Cảng Cát Lái', 'Kho Test Sóng Thần', 'Depot Sóng Thần', '40HC', 3800000, 520000, 150000, 45])

        out_t = io.BytesIO()
        wb_t.save(out_t)
        out_t.seek(0)

        uploaded_tariff = SimpleUploadedFile(
            'tariffs_import.xlsx',
            out_t.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        res_t = self.client.post('/api/master-data/import/', {
            'catalog': 'tariffs',
            'file': uploaded_tariff,
            'update_existing': 'true'
        }, format='multipart')

        self.assertEqual(res_t.status_code, status.HTTP_200_OK)
        self.assertTrue(RouteTariff.objects.filter(customer__code='KH_IMPORT_TEST', container_size='40HC').exists())


class ReferentialDeletionLocksTestCase(TestCase):
    """Bộ kiểm thử kiểm tra tính toàn vẹn dữ liệu: Khóa xóa Master Data & Giao dịch khi đã có phát sinh liên quan."""

    def setUp(self):
        from django.contrib.auth.models import User
        from apps.customers.models import Customer, BookingOrder
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(username='del_admin', email='del_admin@test.com', password='password123')
        self.client.force_authenticate(user=self.admin_user)

        self.customer = Customer.objects.create(
            code='KH_LOCK_TEST',
            name='Công Ty Test Khóa Xóa',
            short_name='TestLock'
        )

    def test_customer_delete_locked_when_has_booking(self):
        from apps.customers.models import BookingOrder
        # 1. Tạo booking cho khách hàng
        booking = BookingOrder.objects.create(
            booking_code='BK-LOCK-001',
            customer=self.customer,
            pickup_location='Cảng Cát Lái',
            delivery_location='KCN Sóng Thần'
        )

        # 2. Gửi request xóa khách hàng -> Bị chặn (400 Bad Request)
        res = self.client.delete(f'/api/master-data/customers/{self.customer.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể xóa khách hàng', res.data.get('error', ''))
        self.assertIn('đơn hàng Booking', res.data.get('error', ''))

        # Khách hàng vẫn còn trong hệ thống
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_deleted)

        # 3. Khi xóa booking trước -> Xóa khách hàng thành công
        booking.delete()
        res_ok = self.client.delete(f'/api/master-data/customers/{self.customer.id}/')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertTrue(self.customer.is_deleted)

    def test_vehicle_delete_locked_when_has_trip(self):
        from apps.fleet.models import Vehicle, VehicleType, VehicleOwnership
        from apps.dispatch.models import DispatchTrip
        veh = Vehicle.objects.create(
            license_plate='51C-LOCK99',
            vehicle_type=VehicleType.TRACTOR,
            ownership_type=VehicleOwnership.OWNED
        )
        trip = DispatchTrip.objects.create(
            trip_code='TRIP-LOCK-001',
            customer=self.customer,
            vehicle=veh
        )

        # Gửi request xóa xe -> Bị chặn
        res = self.client.delete(f'/api/master-data/vehicles/{veh.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể xóa phương tiện', res.data.get('error', ''))
        veh.refresh_from_db()
        self.assertFalse(veh.is_deleted)

    def test_subcontractor_delete_locked_when_has_driver(self):
        from apps.master_data.models import Subcontractor, SubcontractorDriver
        sc = Subcontractor.objects.create(
            code='SC_LOCK_TEST',
            name='Nhà Xe Đối Tác Khóa Xóa',
            short_name='NX Lock'
        )
        SubcontractorDriver.objects.create(
            subcontractor=sc,
            full_name='Tài Xế Bạn Test',
            phone='0909999888'
        )

        # Gửi request xóa đối tác -> Bị chặn
        res = self.client.delete(f'/api/master-data/subcontractors/{sc.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể xóa đối tác', res.data.get('error', ''))
        sc.refresh_from_db()
        self.assertFalse(sc.is_deleted)

    def test_expense_item_delete_locked_when_has_expenses(self):
        from apps.master_data.models import ExpenseItem
        from apps.billing.models import TripExpense, ExpenseCategory
        from apps.dispatch.models import DispatchTrip
        from apps.fleet.models import Vehicle, VehicleType, VehicleOwnership
        veh = Vehicle.objects.create(
            license_plate='51C-LOCK88',
            vehicle_type=VehicleType.TRACTOR,
            ownership_type=VehicleOwnership.OWNED
        )
        item = ExpenseItem.objects.create(
            code='EXP_LOCK_TEST',
            name='Phí Nâng Kiểm Hóa Test'
        )
        trip = DispatchTrip.objects.create(
            trip_code='TRIP-LOCK-002',
            customer=self.customer,
            vehicle=veh
        )
        TripExpense.objects.create(
            trip=trip,
            expense_item=item,
            amount=500000,
            category=ExpenseCategory.LIFT_ON
        )

        # Gửi request xóa khoản chi -> Bị chặn
        res = self.client.delete(f'/api/master-data/expense-items/{item.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể xóa khoản chi', res.data.get('error', ''))
        item.refresh_from_db()
        self.assertFalse(item.is_deleted)

    def test_booking_delete_locked_when_has_trip(self):
        from apps.customers.models import BookingOrder
        from apps.dispatch.models import DispatchTrip
        from apps.fleet.models import Vehicle, VehicleType, VehicleOwnership
        veh = Vehicle.objects.create(
            license_plate='51C-LOCK77',
            vehicle_type=VehicleType.TRACTOR,
            ownership_type=VehicleOwnership.OWNED
        )
        booking = BookingOrder.objects.create(
            booking_code='BK-LOCK-002',
            customer=self.customer,
            pickup_location='Cát Lái',
            delivery_location='KCN Sóng Thần'
        )
        DispatchTrip.objects.create(
            trip_code='TRIP-LOCK-003',
            customer=self.customer,
            booking_order=booking,
            vehicle=veh
        )

        # Xóa booking -> Bị chặn
        res = self.client.delete(f'/api/bookings/{booking.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể xóa đơn Booking', res.data.get('error', ''))
        booking.refresh_from_db()
        self.assertFalse(booking.is_deleted)

    def test_trip_delete_locked_when_has_expenses(self):
        from apps.dispatch.models import DispatchTrip
        from apps.billing.models import TripExpense, ExpenseCategory
        from apps.fleet.models import Vehicle, VehicleType, VehicleOwnership
        veh = Vehicle.objects.create(
            license_plate='51C-LOCK66',
            vehicle_type=VehicleType.TRACTOR,
            ownership_type=VehicleOwnership.OWNED
        )
        trip = DispatchTrip.objects.create(
            trip_code='TRIP-LOCK-004',
            customer=self.customer,
            vehicle=veh
        )
        TripExpense.objects.create(
            trip=trip,
            amount=300000,
            category=ExpenseCategory.TOLL_FEE
        )

        # Xóa trip -> Bị chặn
        res = self.client.delete(f'/api/trips/{trip.trip_code}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('đã phát sinh', res.data.get('error', ''))
        trip.refresh_from_db()
        self.assertFalse(trip.is_deleted)

    def test_employee_delete_locked_when_has_trip(self):
        from apps.personnel.models import Employee, EmployeeRole
        from apps.dispatch.models import DispatchTrip
        from apps.fleet.models import Vehicle, VehicleType, VehicleOwnership
        emp = Employee.objects.create(
            code='TX_LOCK_TEST',
            full_name='Tài Xế Khóa Xóa Test',
            role=EmployeeRole.DRIVER
        )
        veh = Vehicle.objects.create(
            license_plate='51C-LOCK55',
            vehicle_type=VehicleType.TRACTOR,
            ownership_type=VehicleOwnership.OWNED
        )
        trip = DispatchTrip.objects.create(
            trip_code='TRIP-LOCK-005',
            customer=self.customer,
            vehicle=veh,
            driver=emp
        )

        # Xóa nhân viên -> Bị chặn (400 Bad Request)
        res = self.client.delete(f'/api/personnel/employees/{emp.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Không thể xóa nhân sự', res.data.get('error', ''))
        emp.refresh_from_db()
        self.assertFalse(emp.is_deleted)

    def test_import_soft_deleted_customer_and_savepoint_isolation(self):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.customers.models import Customer
        from apps.master_data.import_export_service import generate_catalog_template

        # 1. Tạo customer KH001 rồi xóa mềm (is_deleted=True)
        c = Customer.all_objects.filter(code='KH001').first()
        if not c:
            c = Customer.objects.create(code='KH001', name='Khách hàng Cũ KH001', address='Địa chỉ cũ')
        c.is_deleted = True
        c.save()

        # 2. Tạo file Excel nhập chứa KH001 và KH002
        wb, _ = generate_catalog_template('customers')
        ws = wb.active
        # Dòng lỗi (thiếu tên bắt buộc)
        ws.append(['KH_ERROR', '', 'LỖI', 'COMMERCIAL_TRADING', '', '', '', '', '', '', '', '', '', '', 30, 0, ''])
        # Dòng KH001 (khôi phục & cập nhật)
        ws.append(['KH001', 'CÔNG TY KH001 ĐÃ HỒI PHỤC', 'KH001', 'COMMERCIAL_TRADING', '0310001111', '123 Đường Mới', '', '', '', '', '', '', '', '', 30, 0, 'Hồi phục'])
        # Dòng KH002 (tạo mới)
        ws.append(['KH002', 'CÔNG TY KH002 MỚI', 'KH002', 'COMMERCIAL_TRADING', '0310002222', '456 Đường Mới', '', '', '', '', '', '', '', '', 30, 0, 'Tạo mới'])

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)

        uploaded = SimpleUploadedFile(
            'customers_test_upsert.xlsx',
            out.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        res = self.client.post('/api/master-data/import/', {
            'catalog': 'customers',
            'file': uploaded,
            'update_existing': 'true'
        }, format='multipart')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # KH001 được cập nhật/khôi phục, KH002 được tạo mới, KH_ERROR bị lỗi nhưng không làm sập transaction
        self.assertEqual(res.data.get('updated_count'), 1)
        self.assertEqual(res.data.get('created_count'), 1)
        self.assertEqual(res.data.get('error_count'), 1)

        # Kiểm tra database: KH001 đã được khôi phục is_deleted=False
        c_restored = Customer.objects.get(code='KH001')
        self.assertFalse(c_restored.is_deleted)
        self.assertEqual(c_restored.name, 'CÔNG TY KH001 ĐÃ HỒI PHỤC')
        self.assertTrue(Customer.objects.filter(code='KH002').exists())


    def test_subcontractor_auto_code_generation_rules(self):
        from apps.master_data.models import Subcontractor, PartnerType

        # 1. Test generate_next_code cho từng loại
        code_3pl = Subcontractor.generate_next_code(PartnerType.CARRIER)
        self.assertTrue(code_3pl.startswith('3PL'))
        self.assertEqual(len(code_3pl), 6) # e.g. 3PL001

        code_gar = Subcontractor.generate_next_code(PartnerType.GARAGE)
        self.assertTrue(code_gar.startswith('GAR'))
        self.assertEqual(len(code_gar), 6) # e.g. GAR001

        code_spl = Subcontractor.generate_next_code(PartnerType.SUPPLIER)
        self.assertTrue(code_spl.startswith('SPL'))
        self.assertEqual(len(code_spl), 6) # e.g. SPL001

        # 2. Tạo đối tác không truyền code -> tự sinh code
        sub1 = Subcontractor.objects.create(
            partner_type=PartnerType.CARRIER,
            name='Nhà xe Test 3PL 1',
            phone='0909000111'
        )
        self.assertEqual(sub1.code, code_3pl)

        # Tạo đối tác 3PL thứ 2 -> code tăng STT
        sub2 = Subcontractor.objects.create(
            partner_type=PartnerType.CARRIER,
            name='Nhà xe Test 3PL 2',
            phone='0909000222'
        )
        expected_stt2 = int(sub1.code.replace('3PL', '')) + 1
        self.assertEqual(sub2.code, f"3PL{expected_stt2:03d}")

        # Xóa mềm sub2 (soft delete) -> mã tiếp theo vẫn không trùng
        sub2.is_deleted = True
        sub2.save()
        next_3pl = Subcontractor.generate_next_code(PartnerType.CARRIER)
        self.assertEqual(next_3pl, f"3PL{expected_stt2 + 1:03d}")

    def test_subcontractor_next_code_api_and_creation(self):
        from apps.master_data.models import Subcontractor, PartnerType

        # 1. API GET next-code
        res_carrier = self.client.get('/api/master-data/subcontractors/next-code/?partner_type=CARRIER')
        self.assertEqual(res_carrier.status_code, status.HTTP_200_OK)
        self.assertTrue(res_carrier.data['code'].startswith('3PL'))

        res_garage = self.client.get('/api/master-data/subcontractors/next-code/?partner_type=GARAGE')
        self.assertEqual(res_garage.status_code, status.HTTP_200_OK)
        self.assertTrue(res_garage.data['code'].startswith('GAR'))

        res_supplier = self.client.get('/api/master-data/subcontractors/next-code/?partner_type=SUPPLIER')
        self.assertEqual(res_supplier.status_code, status.HTTP_200_OK)
        self.assertTrue(res_supplier.data['code'].startswith('SPL'))

        # 2. API POST tạo Garage không truyền code -> tự sinh GARxxx
        res_create_gar = self.client.post('/api/master-data/subcontractors/', {
            'partner_type': PartnerType.GARAGE,
            'name': 'Gara Ô Tô Thống Nhất',
            'phone': '0988777666'
        }, format='json')
        self.assertEqual(res_create_gar.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_create_gar.data['data']['code'].startswith('GAR'))

        # 3. API POST tạo NCC không truyền code -> tự sinh SPLxxx
        res_create_spl = self.client.post('/api/master-data/subcontractors/', {
            'partner_type': PartnerType.SUPPLIER,
            'name': 'Cửa Hàng Lốp Bridgestone',
            'phone': '0911222333'
        }, format='json')
        self.assertEqual(res_create_spl.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res_create_spl.data['data']['code'].startswith('SPL'))

    def test_new_driver_bumps_version_after_commit_and_appears_in_form_options(self):
        from apps.master_data.version import get_master_data_version
        from apps.personnel.models import Employee, EmployeeRole, Department
        v1 = get_master_data_version()
        with self.captureOnCommitCallbacks(execute=True):
            Employee.objects.create(code='TX-SYNC-01', full_name='Tài Xế Đồng Bộ', nickname='SYNC1',
                                    role=EmployeeRole.DRIVER, department=Department.FLEET, phone_number='0900000001')
        self.assertGreater(get_master_data_version(), v1)
        res = self.client.get('/api/master-data/form-options/')
        self.assertIn('SYNC1', [d['nickname'] for d in res.data['drivers']])

    def test_master_data_version_api_and_signal_bump(self):
        from apps.master_data.version import get_master_data_version
        from apps.customers.models import Customer
        from apps.fleet.models import Vehicle

        # 1. API version endpoint
        res = self.client.get('/api/master-data/version/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('version', res.data)
        v1 = res.data['version']
        self.assertIsInstance(v1, int)

        # 2. Form options endpoint also contains version
        res_opts = self.client.get('/api/master-data/form-options/')
        self.assertEqual(res_opts.status_code, status.HTTP_200_OK)
        self.assertIn('version', res_opts.data)
        self.assertEqual(res_opts.data['version'], v1)

        # 3. Create a Customer -> signal bumps version
        c = Customer.objects.create(name='Test Realtime Sync Customer', code='CUST_SYNC_01')
        v2 = get_master_data_version()
        self.assertGreaterEqual(v2, v1)

        # 4. Create a Vehicle -> signal bumps version
        v = Vehicle.objects.create(license_plate='51D-999.88', vehicle_type='TRACTOR')
        v3 = get_master_data_version()
        self.assertGreaterEqual(v3, v2)
