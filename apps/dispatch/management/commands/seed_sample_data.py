import datetime
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.customers.models import Customer, RouteTariff, Quotation, QuotationItem, BookingOrder, BookingStatus
from apps.fleet.models import Vehicle, Trailer, VehicleType, VehicleOwnership, VehicleStatus
from apps.personnel.models import Employee, EmployeeRole, Department
from apps.dispatch.models import DispatchTrip, TripStatus, ShipmentType
from apps.billing.models import (
    TripExpense, ExpenseCategory, ReimbursementStatus, ApprovalStatus,
    CashTransaction, TransactionType, PaymentMethod, CashFlowCategory,
    DispatcherAdvanceFund, DriverTripAdvance, FundStatus, DriverAdvanceStatus, AdvanceSourceType
)
from apps.customs.models import CustomsDeclaration, CustomsLane, CustomsDeclarationStatus, CustomsDirection
from apps.master_data.models import (
    Location, LocationType, ContainerType, ContainerCategory, ExpenseItem, ExpenseCategoryGroup,
    DriverSalaryTariff, DriverAllowanceCatalog, AllowanceCategory, ShippingLine, Subcontractor, CompanyProfile
)

class Command(BaseCommand):
    help = 'Tạo dữ liệu mẫu phong phú và chuẩn nghiệp vụ cho toàn bộ các phân hệ BIM Logistics'

    def handle(self, *args, **options):
        self.stdout.write('Bat dau khoi tao du lieu mau toan dien...')
        today = timezone.now().date()
        now = timezone.now()

        # 1. Company Profile
        company = CompanyProfile.get_default_company()
        company.company_name = 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI TRIỀN VÕ'
        company.short_name = 'TRIỀN VÕ LOGISTICS'
        company.tax_code = '0314567890'
        company.phone = '0965 559 561'
        company.email = 'phongkinhdoanh.tvl@trienvo.com'
        company.website = 'https://trienvo.com'
        company.address = '153/1 Quốc Lộ 1A, P. An Phú Đông, Quận 12, TP. Hồ Chí Minh'
        company.bank_account_number = '19030000000001'
        company.bank_name = 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank) - CN Nam Sài Gòn'
        company.save()

        # 2. Master Data - Locations
        locations_data = [
            ('CAT_LAI', 'Cảng Tân Cảng - Cát Lái', LocationType.PORT, 'Đường Nguyễn Thị Định, P. Cát Lái, TP. Thủ Đức, TP.HCM'),
            ('SP_ITC', 'Cảng Quốc Tế SP-ITC', LocationType.PORT, 'Đường 990, P. Phú Hữu, TP. Thủ Đức, TP.HCM'),
            ('CAI_MEP', 'Cụm Cảng Quốc Tế Cái Mép - Thị Vải', LocationType.PORT, 'TX. Phú Mỹ, Bà Rịa - Vũng Tàu'),
            ('ICD_TAY_NAM', 'ICD Tây Nam (Transimex)', LocationType.ICD, 'P. Trường Thọ, TP. Thủ Đức, TP.HCM'),
            ('DEPOT_SUOI_TIEN', 'Bãi Cont Tân Cảng Suối Tiên', LocationType.DEPOT, 'Xa Lộ Hà Nội, TP. Thủ Đức, TP.HCM'),
            ('DEPOT_SOLOG', 'Bãi Cont Solog Libra', LocationType.DEPOT, 'KCN Sóng Thần, Dĩ An, Bình Dương'),
            ('KHO_VIETTHANG', 'Kho Nhà Máy Dệt May Việt Thắng', LocationType.WAREHOUSE, 'KCN Linh Trung 1, Thủ Đức, TP.HCM'),
            ('KHO_ASIAFOOD', 'Kho Thực Phẩm Đông Lạnh Á Châu', LocationType.WAREHOUSE, 'KCN VSIP 1, Thuận An, Bình Dương'),
            ('KHO_SAMSUNG', 'Kho Logistics Samsung Electronics VN', LocationType.WAREHOUSE, 'Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM'),
            ('KHO_VIETNHAT', 'Kho Nhà Máy Thép Việt Nhật (VJS)', LocationType.WAREHOUSE, 'KCN Nhơn Trạch 3, Đồng Nai'),
            ('BAI_XE_TVL', 'Bãi Đỗ Xe & Trạm Điều Phối TVL', LocationType.YARD, 'Đường Nguyễn Thị Định, P. Cát Lái, TP. Thủ Đức, TP.HCM'),
        ]
        loc_map = {}
        for code, name, ltype, addr in locations_data:
            loc, _ = Location.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'location_type': ltype,
                    'address': addr,
                    'province': 'TP. Hồ Chí Minh' if 'TP.HCM' in addr else ('Bình Dương' if 'Bình Dương' in addr else 'Đồng Nai'),
                    'is_active': True
                }
            )
            loc_map[code] = loc

        # 3. Master Data - Shipping Lines
        shipping_lines_data = [
            ('ONE', 'Ocean Network Express (ONE)', '028 3821 8888', 'https://vn.one-line.com', 7, 5),
            ('MAEU', 'Maersk Line A/S', '028 3823 0000', 'https://www.maersk.com', 7, 7),
            ('COSCO', 'COSCO Shipping Lines', '028 3822 5555', 'https://lines.coscoshipping.com', 8, 5),
            ('EMC', 'Evergreen Marine Corp', '028 3910 1111', 'https://www.evergreen-marine.com', 7, 5),
            ('SITC', 'SITC Container Lines', '028 3915 2222', 'https://www.sitc.com', 5, 4),
        ]
        for code, name, phone, web, dem, det in shipping_lines_data:
            ShippingLine.objects.get_or_create(
                code=code,
                defaults={'name': name, 'contact_phone': phone, 'website': web, 'free_dem_days': dem, 'free_det_days': det, 'is_active': True}
            )

        # 4. Master Data - Subcontractors (Nhà xe bạn)
        subcontractors_data = [
            ('NX_HOANGNAM', 'Công ty TNHH Vận Tải Hoàng Nam', '0315888111', 'Nguyễn Hoàng Nam', '0903111222', '120 Xa Lộ Hà Nội, TP. Thủ Đức', '007100111222', 'Vietcombank'),
            ('NX_MINHTHU', 'DNTN Vận Tải & Dịch Vụ Minh Thư', '0316999222', 'Trần Minh Thư', '0908333444', '45 QL1A, P. Linh Trung, Thủ Đức', '190300222333', 'Techcombank'),
            ('NX_ANHPHONG', 'Công ty Vận Tải & Tiếp Vận Anh Phong', '0317111333', 'Lê Anh Phong', '0912555666', '88 Huỳnh Tấn Phát, Nhà Bè, TP.HCM', '018100333444', 'Vietcombank'),
        ]
        for code, name, tax, contact, phone, addr, bank_acc, bank_name in subcontractors_data:
            Subcontractor.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'tax_code': tax,
                    'contact_person': contact,
                    'phone': phone,
                    'address': addr,
                    'bank_account_number': bank_acc,
                    'bank_name': bank_name,
                    'is_active': True
                }
            )

        # 5. Master Data - Expense Items
        expense_items_data = [
            ('LIFT_ON', 'Phí Nâng Vỏ Cont Rỗng / Cont Hàng', ExpenseCategoryGroup.LIFT_ON, Decimal(480000), True),
            ('LIFT_OFF', 'Phí Hạ Vỏ Cont Rỗng / Cont Hàng', ExpenseCategoryGroup.LIFT_OFF, Decimal(480000), True),
            ('TOLL_FEE', 'Vé Cầu Đường BOT Điện Tử (ETC)', ExpenseCategoryGroup.TOLL, Decimal(180000), True),
            ('CONTAINER_DEPOSIT', 'Cược Vỏ Container Hãng Tàu', ExpenseCategoryGroup.DEPOSIT, Decimal(2000000), False),
            ('WEIGHING', 'Phí Cân Tải Trọng / Cân Phiếu VGM', ExpenseCategoryGroup.WEIGHING, Decimal(120000), True),
            ('LABOR_STEVEDORING', 'Phí Bốc Xếp / Bồi Dưỡng Dock Kho', ExpenseCategoryGroup.LABOR, Decimal(150000), False),
        ]
        for code, name, group, amt, req_inv in expense_items_data:
            ExpenseItem.objects.get_or_create(
                code=code,
                defaults={'name': name, 'group_type': group, 'default_amount': amt, 'requires_invoice': req_inv, 'is_active': True}
            )

        # 6. Employees (Nhân sự)
        employees_data = [
            ('TX001', 'Trần Văn Mạnh', 'MẠNH BỤI', '0909111222', Department.FLEET, EmployeeRole.DRIVER, 'FC-091283', Decimal(7500000)),
            ('TX002', 'Lê Hữu Nghĩa', 'NGHĨA 61S', '0909222333', Department.FLEET, EmployeeRole.DRIVER, 'FC-091284', Decimal(7500000)),
            ('TX003', 'Nguyễn Hoàng Long', 'LONG LIBRA', '0909333444', Department.FLEET, EmployeeRole.DRIVER, 'FC-091285', Decimal(7500000)),
            ('TX004', 'Vũ Đức Thành', 'THÀNH CÁT LÁI', '0909444555', Department.FLEET, EmployeeRole.DRIVER, 'FC-091286', Decimal(7500000)),
            ('DD001', 'Võ Văn Triền', 'ĐIỀU ĐỘ CHÍNH', '0965559561', Department.DISPATCH, EmployeeRole.DISPATCHER, '', Decimal(15000000)),
            ('DD002', 'Phạm Quốc Hùng', 'HÙNG ĐIỀU ĐỘ', '0908888999', Department.DISPATCH, EmployeeRole.DISPATCHER, '', Decimal(12000000)),
            ('KT001', 'Nguyễn Thị Thu Thảo', 'THẢO KẾ TOÁN', '0907777888', Department.ACCOUNTING, EmployeeRole.ACCOUNTANT, '', Decimal(14000000)),
            ('KD001', 'Lê Hoàng Nam', 'NAM SALES', '0906666777', Department.SALES, EmployeeRole.SALESMAN, '', Decimal(13000000)),
        ]
        emp_map = {}
        for code, name, nick, phone, dept, role, lic, salary in employees_data:
            emp, _ = Employee.objects.get_or_create(
                code=code,
                defaults={
                    'full_name': name,
                    'nickname': nick,
                    'phone_number': phone,
                    'department': dept,
                    'role': role,
                    'license_number': lic,
                    'base_salary': salary,
                    'is_active': True
                }
            )
            emp_map[code] = emp

        # 7. Fleet (Xe & Mooc)
        vehicles_data = [
            ('51C-888.12', VehicleType.TRACTOR, VehicleOwnership.OWNED, 'Freightliner Cascadia', 32000, emp_map['TX001']),
            ('51C-999.34', VehicleType.TRACTOR, VehicleOwnership.OWNED, 'International ProStar', 31500, emp_map['TX002']),
            ('61C-393.29', VehicleType.TRACTOR, VehicleOwnership.OWNED, 'Hyundai HD1000', 30000, emp_map['TX003']),
            ('50H-123.45', VehicleType.TRACTOR, VehicleOwnership.OWNED, 'Hino 700 Series', 32000, emp_map['TX004']),
            ('51C-777.89', VehicleType.TRACTOR, VehicleOwnership.SUBCONTRACTOR, 'Dongfeng 420', 30000, None),
        ]
        veh_map = {}
        for plate, vtype, own, brand, payload, driver in vehicles_data:
            veh, _ = Vehicle.objects.get_or_create(
                license_plate=plate,
                defaults={
                    'vehicle_type': vtype,
                    'ownership_type': own,
                    'brand': brand,
                    'payload_capacity_kg': payload,
                    'registration_expiry': today + datetime.timedelta(days=120),
                    'insurance_expiry': today + datetime.timedelta(days=180),
                    'status': VehicleStatus.ACTIVE if driver else VehicleStatus.IDLE,
                    'current_driver': driver
                }
            )
            veh_map[plate] = veh

        trailers_data = [
            ('51R-444.22', 'CIMC 3 Trục 40ft', 35000),
            ('51R-555.33', 'Tân Thanh 3 Trục Cổ Cò 40ft', 34500),
            ('51R-666.44', 'Doosung 2 Trục 20ft', 30000),
            ('51R-777.55', 'CIMC 3 Trục 45ft', 36000),
        ]
        trl_map = {}
        for plate, brand, payload in trailers_data:
            trl, _ = Trailer.objects.get_or_create(
                license_plate=plate,
                defaults={
                    'brand': brand,
                    'payload_capacity_kg': payload,
                    'registration_expiry': today + datetime.timedelta(days=150),
                    'status': 'ACTIVE'
                }
            )
            trl_map[plate] = trl

        # 8. Customers
        customers_data = [
            ('CÔNG TY TNHH DỆT MAY XUẤT KHẨU VIỆT THẮNG', 'VIETTHANG', '0301234567', 'KCN Linh Trung 1, Thủ Đức, TP.HCM', 'Dệt may & May mặc'),
            ('CÔNG TY CỔ PHẦN THỰC PHẨM & ĐỒ UỐNG Á CHÂU', 'ASIA_FOOD', '0302345678', 'KCN VSIP 1, Thuận An, Bình Dương', 'Thực phẩm đông lạnh'),
            ('TẬP ĐOÀN ĐIỆN TỬ SAMSUNG ELECTRONICS VN', 'SAMSUNG_VN', '0303456789', 'Khu Công Nghệ Cao, TP. Thủ Đức, TP.HCM', 'Linh kiện điện tử'),
            ('CÔNG TY TNHH THÉP VIỆT NHẬT (VJS)', 'VIET_NHAT_STEEL', '0304567890', 'KCN Nhơn Trạch 3, Đồng Nai', 'Sắt thép & Kim loại'),
            ('CÔNG TY TNHH NHỰA & HÓA CHẤT DUY TÂN', 'DUY_TAN_PLASTICS', '0305678901', 'KCN Tân Tạo, Bình Tân, TP.HCM', 'Hạt nhựa & Bao bì'),
            ('TẬP ĐOÀN THỦY SẢN MINH PHÚ', 'MINH_PHU_SEAFOOD', '0306789012', 'Cảng Cát Lái / KCN Sông Hậu', 'Thủy hải sản đông lạnh'),
        ]
        cust_map = {}
        for name, code, tax, addr, field in customers_data:
            c, _ = Customer.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'tax_code': tax,
                    'address': addr,
                    'contact_person': 'Nguyễn Văn Phụ Trách',
                    'phone': '0908123456',
                    'notes': f'Ngành nghề: {field}'
                }
            )
            cust_map[code] = (c, field)

        # 9. Quotations (Báo giá đa tuyến - Tạo đúng ngày hôm nay)
        Quotation.objects.filter(customer__in=[c[0] for c in cust_map.values()]).delete()
        for idx, (code, (cust, field)) in enumerate(cust_map.items()):
            q_code = f"BG-{today.strftime('%m%d')}-{str(idx+1).zfill(2)}"
            q = Quotation.objects.create(
                quotation_code=q_code,
                customer=cust,
                origin_zone='Cảng Cát Lái, TP.HCM',
                destination_zone=cust.address.split(',')[0],
                estimated_km=35 + idx * 10,
                route_description=f"Cảng Cát Lái ➔ {cust.address.split(',')[0]}",
                unit_price=Decimal(3500000 + idx * 300000),
                expected_trips_monthly=15,
                status='APPROVED',
                pricing_method='MULTI_ROUTE',
                cargo_type=f'Cont 40HC - {field}',
                valid_until=today + datetime.timedelta(days=90),
                notes='Bảng giá cước vận chuyển chuẩn áp dụng quý hiện tại.'
            )
            # Add multi-routes (QuotationItem)
            QuotationItem.objects.create(
                quotation=q,
                route_description=f"Cảng Cát Lái ➔ {cust.address.split(',')[0]}",
                origin_zone='Cảng Cát Lái, TP.HCM',
                destination_zone=cust.address,
                cargo_type='Cont 40HC',
                estimated_km=35 + idx * 10,
                unit_price=Decimal(3500000 + idx * 300000),
                expected_trips_monthly=15,
                notes='Tuyến chính container 40HC'
            )
            QuotationItem.objects.create(
                quotation=q,
                route_description=f"Cảng SP-ITC ➔ {cust.address.split(',')[0]}",
                origin_zone='Cảng SP-ITC, Q9, TP.HCM',
                destination_zone=cust.address,
                cargo_type='Cont 20GP',
                estimated_km=40 + idx * 10,
                unit_price=Decimal(3200000 + idx * 250000),
                expected_trips_monthly=10,
                notes='Tuyến phụ container 20GP'
            )

        # 10. Bookings (Đơn hàng vận chuyển)
        booking_list = []
        for idx, (code, (cust, field)) in enumerate(list(cust_map.items())[:4]):
            b_code = f"BK-2026-{today.strftime('%m%d')}-{str(idx+1).zfill(2)}"
            b, _ = BookingOrder.objects.get_or_create(
                booking_code=b_code,
                defaults={
                    'customer': cust,
                    'booking_type': 'EXPORT_FCL' if idx % 2 == 0 else 'IMPORT_FCL',
                    'booking_number': f"BK-ONE-8923{idx+1}",
                    'shipping_line': 'ONE' if idx % 2 == 0 else 'MAERSK',
                    'vessel_voyage': f'ONE INTEGRITY 01{idx}E',
                    'container_size': '40HC',
                    'total_containers': 4,
                    'dispatched_containers': 2 if idx == 0 else 1,
                    'commodity': field,
                    'pickup_location': 'Bãi Cont Tân Cảng Suối Tiên',
                    'delivery_location': cust.address,
                    'dropoff_location': 'Cảng Cát Lái',
                    'loading_date': today + datetime.timedelta(days=idx),
                    'loading_time': '08:30',
                    'free_time_detention': 7,
                    'free_time_demurrage': 7,
                    'selling_freight_price': Decimal(3800000 + idx * 200000),
                    'status': BookingStatus.PARTIALLY_DISPATCHED if idx == 0 else BookingStatus.PENDING_DISPATCH
                }
            )
            booking_list.append(b)

        # 11. Dispatch Trips (Chuyến xe điều vận mẫu)
        trips = []
        drivers_list = [emp_map['TX001'], emp_map['TX002'], emp_map['TX003'], emp_map['TX004']]
        vehicles_list = [veh_map['51C-888.12'], veh_map['51C-999.34'], veh_map['61C-393.29'], veh_map['50H-123.45']]
        trailers_list = [trl_map['51R-444.22'], trl_map['51R-555.33'], trl_map['51R-666.44'], trl_map['51R-777.55']]
        
        for idx in range(4):
            trip_code = f"TVL-{today.strftime('%m%d')}-{str(idx+1).zfill(3)}"
            b = booking_list[idx]
            cust = b.customer
            driver = drivers_list[idx]
            vehicle = vehicles_list[idx]
            trailer = trailers_list[idx]

            t, _ = DispatchTrip.objects.get_or_create(
                trip_code=trip_code,
                defaults={
                    'shipment_type': ShipmentType.EXPORT if idx % 2 == 0 else ShipmentType.IMPORT,
                    'customer': cust,
                    'booking_order': b,
                    'vehicle': vehicle,
                    'trailer': trailer,
                    'driver': driver,
                    'dispatcher': emp_map['DD001'],
                    'container_number': f"TGHU98234{idx+1}0",
                    'seal_number': f"ONE8923{idx+1}",
                    'container_type': '40HC',
                    'booking_or_bill': b.booking_number,
                    'pickup_location': b.pickup_location,
                    'warehouse_location': b.delivery_location,
                    'dropoff_location': b.dropoff_location,
                    'loading_date': today,
                    'loading_time': '08:00',
                    'status': TripStatus.IN_TRANSIT if idx == 0 else (TripStatus.DELIVERED if idx == 1 else TripStatus.DISPATCHED),
                    'dispatched_at': now - datetime.timedelta(hours=6),
                    'accepted_at': now - datetime.timedelta(hours=5),
                    'planned_start_time': now - datetime.timedelta(hours=4),
                    'actual_start_time': now - datetime.timedelta(hours=4),
                    'cached_revenue': b.selling_freight_price,
                    'cached_expense': Decimal(1850000),
                    'cached_profit': b.selling_freight_price - Decimal(1850000),
                    'cached_margin_percent': Decimal(42.5),
                }
            )
            trips.append(t)

        # 12. Reimbursable & Operation Expenses (Chi Hộ & Phí Hiện Trường)
        for idx, t in enumerate(trips):
            # Expense 1: Phí Nâng vỏ cont Cát Lái (Chi Hộ Khách - Đã xuất Debit Note)
            TripExpense.objects.get_or_create(
                trip=t,
                category=ExpenseCategory.LIFT_ON,
                amount=Decimal(480000),
                is_on_behalf_of_customer=True,
                defaults={
                    'driver': t.driver,
                    'vehicle': t.vehicle,
                    'reimbursement_status': ReimbursementStatus.BILLED if idx % 2 == 0 else ReimbursementStatus.PENDING,
                    'invoice_issuer': 'Công ty CP Cảng Cát Lái',
                    'invoice_number': f"HD-CL-00{idx+1}88",
                    'invoice_lookup_code': f"CL-2026-09-0{idx+1}",
                    'status': ApprovalStatus.APPROVED,
                    'notes': f'Phí nâng vỏ cont tại Cảng Cát Lái cho chuyến {t.trip_code}'
                }
            )
            # Expense 2: Cân Xe Cảng (Chi Hộ Khách - Chờ thu)
            TripExpense.objects.get_or_create(
                trip=t,
                category=ExpenseCategory.WEIGHING,
                amount=Decimal(120000),
                is_on_behalf_of_customer=True,
                defaults={
                    'driver': t.driver,
                    'vehicle': t.vehicle,
                    'reimbursement_status': ReimbursementStatus.PENDING,
                    'invoice_issuer': 'Trạm Cân Cát Lái',
                    'invoice_number': f"CAN-2026-00{idx+1}",
                    'status': ApprovalStatus.APPROVED,
                    'notes': 'Phí cân tải trọng container VGM tại trạm cân'
                }
            )
            # Expense 3: Vé Cầu Đường BOT (Công ty chi)
            TripExpense.objects.get_or_create(
                trip=t,
                category=ExpenseCategory.TOLL_FEE,
                amount=Decimal(180000),
                is_on_behalf_of_customer=False,
                defaults={
                    'driver': t.driver,
                    'vehicle': t.vehicle,
                    'reimbursement_status': ReimbursementStatus.NOT_APPLICABLE,
                    'invoice_issuer': 'Công ty CP BOT Cầu Phú Mỹ / Xa Lộ Hà Nội',
                    'invoice_number': f"BOT-ETC-{900+idx}",
                    'status': ApprovalStatus.APPROVED,
                    'notes': 'Vé BOT Phú Mỹ & Xa Lộ Hà Nội'
                }
            )

        # 13. Dispatcher Advance Fund & Driver Advances (Tạm ứng điều vận & tài xế)
        fund, _ = DispatcherAdvanceFund.objects.get_or_create(
            code=f"QDV-{today.strftime('%Y%m')}-01",
            defaults={
                'dispatcher': emp_map['DD001'],
                'amount': Decimal(20000000),
                'advance_date': today - datetime.timedelta(days=2),
                'status': FundStatus.APPROVED,
                'approved_by': emp_map['KT001'],
                'approved_at': now - datetime.timedelta(days=2),
                'notes': 'Cấp quỹ điều vận luân chuyển đầu tuần'
            }
        )

        for idx, t in enumerate(trips[:3]):
            DriverTripAdvance.objects.get_or_create(
                code=f"TUTX-{today.strftime('%Y%m%d')}-00{idx+1}",
                defaults={
                    'trip': t,
                    'driver': t.driver,
                    'dispatcher_fund': fund,
                    'advance_source': AdvanceSourceType.DISPATCHER_FUND,
                    'amount': Decimal(1000000),
                    'advance_date': today,
                    'purpose': f'Tạm ứng tiền nâng hạ & vé BOT chuyến {t.trip_code}',
                    'status': DriverAdvanceStatus.ADVANCED,
                    'actual_spent': Decimal(780000),
                }
            )

        # 14. Cash Transactions (Sổ Quỹ Thu - Chi)
        for idx, (code, (cust, field)) in enumerate(list(cust_map.items())[:3]):
            # Thu cước vận tải
            CashTransaction.objects.get_or_create(
                code=f"PT-{today.strftime('%Y%m%d')}-{idx+1:03d}",
                defaults={
                    'transaction_type': TransactionType.INFLOW,
                    'payment_method': PaymentMethod.BANK,
                    'category': CashFlowCategory.FREIGHT_REVENUE,
                    'amount': Decimal(25000000 + idx * 10000000),
                    'partner_type': 'CUSTOMER',
                    'partner_name': cust.name,
                    'transaction_date': today,
                    'bank_name': 'Vietcombank',
                    'bank_account': '0071000888999',
                    'created_by': emp_map['KT001'],
                    'notes': f'Khách hàng {cust.name} thanh toán cước vận chuyển kỳ quyết toán'
                }
            )
            # Chi mua xăng dầu
            CashTransaction.objects.get_or_create(
                code=f"PC-{today.strftime('%Y%m%d')}-{idx+1:03d}",
                defaults={
                    'transaction_type': TransactionType.OUTFLOW,
                    'payment_method': PaymentMethod.BANK if idx % 2 == 0 else PaymentMethod.CASH,
                    'category': CashFlowCategory.FUEL_PAYMENT,
                    'amount': Decimal(8500000 + idx * 2000000),
                    'partner_type': 'VENDOR',
                    'partner_name': 'Petrolimex Sài Gòn - Cửa hàng 02',
                    'transaction_date': today,
                    'created_by': emp_map['KT001'],
                    'notes': 'Chi tiền dầu Diesel cấp bồn nội bộ cho đội xe đầu kéo'
                }
            )

        # 15. Customs Declarations (Tờ khai Hải quan)
        for idx, (code, (cust, field)) in enumerate(list(cust_map.items())[:4]):
            CustomsDeclaration.objects.get_or_create(
                declaration_number=f"1059{today.strftime('%m%d')}{idx+1:04d}",
                defaults={
                    'declaration_date': today,
                    'customer': cust,
                    'customs_office_code': '02CI',
                    'customs_office_name': 'Chi cục HQ Cửa khẩu Cảng Sài Gòn KV4 (Cát Lái)',
                    'declaration_type': 'B11' if idx % 2 == 0 else 'A11',
                    'direction': CustomsDirection.EXPORT if idx % 2 == 0 else CustomsDirection.IMPORT,
                    'customs_lane': CustomsLane.GREEN if idx == 0 else (CustomsLane.YELLOW if idx == 1 else CustomsLane.RED),
                    'status': CustomsDeclarationStatus.CLEARED if idx % 2 == 0 else CustomsDeclarationStatus.SUBMITTED,
                    'bill_of_lading': f"BL-ONE-2026-00{idx+1}",
                    'container_numbers': f"TGHU98234{idx+1}0 / 40HC",
                    'tax_amount_vnd': Decimal(45000000 + idx * 15000000),
                    'is_tax_paid': idx % 2 == 0,
                    'customs_service_fee': Decimal(1200000),
                    'reimbursable_fee': Decimal(350000),
                    'inspection_notes': f'Tờ khai thông quan mặt hàng {field} cập nhật hệ thống VNACCS'
                }
            )

        self.stdout.write('Khoi tao du lieu mau toan he thong thanh cong!')
