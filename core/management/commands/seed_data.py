import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.personnel.models import Employee, Department, EmployeeRole
from apps.fleet.models import Vehicle, Trailer, VehicleType, VehicleStatus
from apps.customers.models import Customer, RouteTariff, Quotation
from apps.dispatch.models import DispatchTrip, ShipmentType, TripStatus, TripTimelineItem
from apps.billing.models import TripExpense, ExpenseCategory, ApprovalStatus
from apps.documents.models import TripDocument, DocumentType
from apps.exceptions.models import TripException, ExceptionType, ExceptionSeverity
from core.models import TrackingEventLog

class Command(BaseCommand):
    help = 'Nạp toàn bộ dữ liệu mẫu nghiệp vụ thực tế cho Bim Logistics'

    def handle(self, *args, **options):
        self.stdout.write("Bat dau nap du lieu mau (Seeding data)...")

        # 1. Nhân sự & Tài xế
        employees_data = [
            {'code': 'DD001', 'full_name': 'Trần Điều Độ', 'nickname': 'ĐIỀU ĐỘ CHÍNH', 'phone': '0908111222', 'dept': Department.DISPATCH, 'role': EmployeeRole.DISPATCHER},
            {'code': 'BGD01', 'full_name': 'Triền Võ Giám Đốc', 'nickname': 'BGD', 'phone': '0909000111', 'dept': Department.MANAGEMENT, 'role': EmployeeRole.DIRECTOR},
            {'code': 'TX001', 'full_name': 'Nguyễn Văn Bụi', 'nickname': 'BỤI 94', 'phone': '0901234567', 'dept': Department.FLEET, 'role': EmployeeRole.DRIVER, 'base_salary': 7500000, 'current_advance': 3000000},
            {'code': 'TX002', 'full_name': 'Trần Văn Li', 'nickname': 'LIBRA', 'phone': '0902345678', 'dept': Department.FLEET, 'role': EmployeeRole.DRIVER, 'base_salary': 8500000, 'current_advance': 0},
            {'code': 'TX003', 'full_name': 'Lê Hòa', 'nickname': 'HÒA PHÁT', 'phone': '0903456789', 'dept': Department.FLEET, 'role': EmployeeRole.DRIVER, 'base_salary': 7500000, 'current_advance': 5000000},
            {'code': 'TX004', 'full_name': 'Phạm Sơn', 'nickname': '3S', 'phone': '0904567890', 'dept': Department.FLEET, 'role': EmployeeRole.DRIVER, 'base_salary': 8500000, 'current_advance': 2000000},
            {'code': 'TX005', 'full_name': 'Hoàng Hải', 'nickname': 'HẢI ĐĂNG', 'phone': '0905678901', 'dept': Department.FLEET, 'role': EmployeeRole.DRIVER, 'base_salary': 7500000, 'current_advance': 0},
            {'code': 'TX006', 'full_name': 'Trần Sắt', 'nickname': '61S', 'phone': '0906789012', 'dept': Department.FLEET, 'role': EmployeeRole.DRIVER, 'base_salary': 8500000, 'current_advance': 1000000},
            {'code': 'TX007', 'full_name': 'Nguyễn Văn Phong', 'nickname': 'Phong', 'phone': '0904776978', 'dept': Department.FLEET, 'role': EmployeeRole.DRIVER, 'base_salary': 7500000, 'current_advance': 1500000},
        ]
        emp_map = {}
        for ed in employees_data:
            emp, _ = Employee.objects.update_or_create(
                code=ed['code'],
                defaults={
                    'full_name': ed['full_name'],
                    'nickname': ed['nickname'],
                    'phone_number': ed['phone'],
                    'department': ed['dept'],
                    'role': ed['role'],
                    'base_salary': ed.get('base_salary', 5000000),
                    'current_advance': ed.get('current_advance', 0),
                    'is_active': True
                }
            )
            emp_map[ed['code']] = emp
            emp_map[ed['nickname']] = emp

        # 2. Xe & Rơ-moóc
        vehicles_data = [
            {'plate': '51C-123.45', 'type': VehicleType.TRACTOR, 'brand': 'Freightliner', 'reg': datetime.date(2026, 10, 15), 'maint': datetime.date(2026, 9, 20), 'status': VehicleStatus.ACTIVE, 'driver': emp_map['BỤI 94']},
            {'plate': '51C-888.99', 'type': VehicleType.TRACTOR, 'brand': 'Hyundai HD1000', 'reg': datetime.date(2026, 9, 22), 'maint': datetime.date(2026, 9, 18), 'status': VehicleStatus.ACTIVE, 'driver': emp_map['LIBRA']},
            {'plate': '61C-393.29', 'type': VehicleType.TRACTOR, 'brand': 'International ProStar', 'reg': datetime.date(2026, 8, 1), 'maint': datetime.date(2026, 8, 30), 'status': VehicleStatus.ACTIVE, 'driver': emp_map['HÒA PHÁT']},
            {'plate': '50E-745.02', 'type': VehicleType.TRUCK_10T, 'brand': 'Hino 500', 'reg': datetime.date(2026, 12, 12), 'maint': datetime.date(2026, 9, 17), 'status': VehicleStatus.ACTIVE, 'driver': emp_map['3S']},
            {'plate': '50E-112.34', 'type': VehicleType.TRUCK_2T, 'brand': 'Isuzu QKR', 'reg': datetime.date(2026, 11, 20), 'maint': datetime.date(2026, 9, 25), 'status': VehicleStatus.IDLE, 'driver': emp_map['HẢI ĐĂNG']},
            {'plate': '61S-999.00', 'type': VehicleType.TRACTOR, 'brand': 'MaxxForce', 'reg': datetime.date(2026, 10, 30), 'maint': datetime.date(2026, 9, 15), 'status': VehicleStatus.ACTIVE, 'driver': emp_map['61S']},
            {'plate': '50H-896.50', 'type': VehicleType.TRACTOR, 'brand': 'Freightliner Cascadia', 'reg': datetime.date(2026, 12, 31), 'maint': datetime.date(2026, 9, 16), 'status': VehicleStatus.ACTIVE, 'driver': emp_map['Phong']},
        ]
        veh_map = {}
        for vd in vehicles_data:
            veh, _ = Vehicle.objects.update_or_create(
                license_plate=vd['plate'],
                defaults={
                    'vehicle_type': vd['type'],
                    'brand': vd['brand'],
                    'registration_expiry': vd['reg'],
                    'next_maintenance_date': vd['maint'],
                    'status': vd['status'],
                    'current_driver': vd['driver']
                }
            )
            veh_map[vd['plate']] = veh

        # Rơ-moóc
        trailers = ['51R-444.22', '51R-555.33', '61R-123.88']
        for tp in trailers:
            Trailer.objects.update_or_create(
                license_plate=tp,
                defaults={
                    'trailer_type': 'MOOC_XUONG_40',
                    'registration_expiry': datetime.date(2026, 11, 10),
                    'status': 'ACTIVE'
                }
            )

        # 3. Khách hàng & Tuyến cước (Bổ sung CÔNG TY TNHH SẢN XUẤT - THƯƠNG MẠI - DỊCH VỤ AN DI VN từ chứng từ thực tế)
        customers_data = [
            {'code': 'TDA_VICACO', 'name': 'TĐÁ - VICACO', 'address': 'Bình Dương - TP.HCM'},
            {'code': 'OASIS', 'name': 'OASIS - HƯƠNG LỘ 2', 'address': 'Bình Tân, TP.HCM'},
            {'code': 'WCA_TTI', 'name': 'WCA - TTI - CỦ CHI', 'address': 'Khu Công Nghiệp Tây Bắc Củ Chi'},
            {'code': 'TAKIGAWA', 'name': 'TAKIGAWA VSIP 2 - VSIP 3', 'address': 'KCN VSIP 2, Bình Dương'},
            {'code': 'POLIFILM', 'name': 'POLIFILM (MP3)', 'address': 'KCN Mỹ Phước 3, Bình Dương'},
            {'code': 'GPF', 'name': 'GPF', 'address': 'KCN Sóng Thần, Bình Dương'},
            {'code': 'TAN_UYEN', 'name': 'TÂN UYÊN - TÂY NINH', 'address': 'Tân Uyên, Bình Dương -> Tây Ninh'},
            {'code': 'ANDI', 'name': 'AN DI VN (0312256832)', 'address': '540/5 Nguyễn Văn Khối, P. Thông Tây Hội, TP.HCM'},
        ]
        cust_map = {}
        for cd in customers_data:
            cust, _ = Customer.objects.update_or_create(
                code=cd['code'],
                defaults={'name': cd['name'], 'address': cd['address']}
            )
            cust_map[cd['code']] = cust
            cust_map[cd['name']] = cust

        # Biểu cước
        tariffs_data = [
            {'cust': 'TDA_VICACO', 'from': 'TĐÁ', 'to': 'VICACO', 'drop': 'Hạ bãi', 'price': 3500000, 'pay': 500000},
            {'cust': 'OASIS', 'from': 'SPITC', 'to': 'MACSTAR TÂN VẠN', 'drop': 'Hạ bãi', 'price': 4500000, 'pay': 550000},
            {'cust': 'WCA_TTI', 'from': 'CÁT LÁI', 'to': 'KHO WCA', 'drop': 'SOLOG LIBRA', 'price': 3800000, 'pay': 500000},
            {'cust': 'TAKIGAWA', 'from': 'VSIP 2', 'to': 'VSIP 3', 'drop': 'VSIP 2', 'price': 2200000, 'pay': 400000},
            {'cust': 'POLIFILM', 'from': 'MP3', 'to': 'VSIP 3', 'drop': 'MP3', 'price': 2500000, 'pay': 450000},
            {'cust': 'GPF', 'from': 'GPF', 'to': 'VSIP 3', 'drop': 'GPF', 'price': 3500000, 'pay': 500000},
            {'cust': 'TAN_UYEN', 'from': 'TÂN UYÊN', 'to': 'TÂY NINH', 'drop': '-', 'price': 4095000, 'pay': 600000},
            {'cust': 'ANDI', 'from': 'ICD TÂY NAM', 'to': 'KHO AN DI', 'drop': 'CÁT LÁI', 'price': 3800000, 'pay': 550000},
            {'cust': 'ANDI', 'from': 'AP-622 DEPOT', 'to': 'KHO AN DI', 'drop': 'CÁT LÁI', 'price': 4200000, 'pay': 600000},
        ]
        for td in tariffs_data:
            RouteTariff.objects.update_or_create(
                customer=cust_map[td['cust']],
                pickup_location=td['from'],
                delivery_location=td['to'],
                defaults={
                    'dropoff_location': td['drop'],
                    'container_size': '40HC',
                    'freight_price': td['price'],
                    'driver_trip_pay': td['pay']
                }
            )

        # Báo giá (Sales / CRM)
        quotations_data = [
            {'code': 'BG-0916-01', 'cust': 'TAKIGAWA', 'route': 'VSIP 2 -> VSIP 3', 'price': 2200000, 'trips': 45, 'status': 'APPROVED'},
            {'code': 'BG-0916-02', 'cust': 'POLIFILM', 'route': 'MP3 -> VSIP 3', 'price': 2500000, 'trips': 20, 'status': 'APPROVED'},
            {'code': 'BG-0916-03', 'cust': 'GPF', 'route': 'GPF -> VSIP 3', 'price': 3500000, 'trips': 15, 'status': 'NEGOTIATING'},
            {'code': 'BG-0916-04', 'cust': 'WCA_TTI', 'route': 'CÁT LÁI -> CỦ CHI', 'price': 3800000, 'trips': 60, 'status': 'PENDING_APPROVAL'},
        ]
        for qd in quotations_data:
            Quotation.objects.update_or_create(
                quotation_code=qd['code'],
                defaults={
                    'customer': cust_map[qd['cust']],
                    'route_description': qd['route'],
                    'unit_price': qd['price'],
                    'expected_trips_monthly': qd['trips'],
                    'status': qd['status']
                }
            )

        # 4. Chuyến xe & Timeline 10 bước (Khớp 100% App Demo)
        trips_data = [
            {
                'code': 'TVL-0916-001', 'cust': 'TDA_VICACO', 'type': ShipmentType.IMPORT,
                'pickup': 'TĐÁ', 'wh': 'VICACO', 'drop': 'Hạ bãi',
                'status': TripStatus.COMPLETED, 'driver': emp_map['61S'], 'veh': veh_map['61S-999.00'],
                'cont': 'BỘT SẮT (CONT 40)', 'seal': '-', 'booking': '-', 'cutoff': '-',
                'notes': 'Sáng 8H 1/7 lấy bột sắt sau đó bốc hàng 30T bột 2/7 giao',
                'rev': 3500000, 'exp': 850000,
                'timeline': [
                    {'step': 1, 'title': 'Điều độ phát lệnh', 'time': '17:00 30/06', 'done': True},
                    {'step': 2, 'title': 'Tài xế nhận lệnh', 'time': '17:15 30/06', 'done': True},
                    {'step': 3, 'title': 'Lấy Bột sắt (TĐÁ)', 'time': '08:00 01/07', 'done': True},
                    {'step': 4, 'title': 'Bốc hàng (30T)', 'time': '14:00 01/07', 'done': True},
                    {'step': 5, 'title': 'Giao hàng (VICACO)', 'time': '08:00 02/07', 'done': True},
                ]
            },
            {
                'code': 'TVL-0916-002', 'cust': 'OASIS', 'type': ShipmentType.EXPORT,
                'pickup': 'SPITC', 'wh': 'MACSTAR TÂN VẠN', 'drop': 'Hạ bãi',
                'status': TripStatus.COMPLETED, 'driver': emp_map['BỤI 94'], 'veh': veh_map['51C-123.45'],
                'cont': 'CAAU5214215XX (40)', 'seal': 'SL-998877', 'booking': '235601091589', 'cutoff': 'SI 10:00',
                'notes': 'Lưu ý chứng từ về cty sớm',
                'rev': 4500000, 'exp': 1250000,
                'timeline': [
                    {'step': 1, 'title': 'Điều độ phát lệnh', 'time': '18:00 30/06', 'done': True},
                    {'step': 2, 'title': 'Tài xế nhận lệnh', 'time': '18:15 30/06', 'done': True},
                    {'step': 3, 'title': 'Lấy Container rỗng (SPITC)', 'time': '08:45 01/07', 'done': True},
                    {'step': 4, 'title': 'Đóng hàng tại kho', 'time': '11:00 01/07', 'done': True},
                    {'step': 5, 'title': 'Hạ Container cảng', 'time': '14:30 01/07', 'done': True},
                ],
                'expenses': [
                    {'cat': ExpenseCategory.LIFT_ON_OFF, 'amt': 450000, 'status': ApprovalStatus.APPROVED, 'time': '09:00 01/07'}
                ],
                'docs': [
                    {'type': DocumentType.EIR_DROPOFF, 'title': 'Phiếu EIR Hạ Cont', 'raw': 'Cont: CAAU5214215XX', 'time': '14:45 01/07'}
                ]
            },
            {
                'code': 'TVL-0916-003', 'cust': 'WCA_TTI', 'type': ShipmentType.IMPORT,
                'pickup': 'CÁT LÁI', 'wh': 'KHO WCA', 'drop': 'SOLOG LIBRA',
                'status': TripStatus.IN_TRANSIT, 'driver': emp_map['LIBRA'], 'veh': veh_map['51C-888.99'],
                'cont': 'FFAU5774044 (40)', 'seal': 'CHƯA CẬP NHẬT', 'booking': '271758013', 'cutoff': '-',
                'notes': 'Free time 3 NGÀY',
                'rev': 3800000, 'exp': 0,
                'timeline': [
                    {'step': 1, 'title': 'Điều độ phát lệnh', 'time': '18:00 30/06', 'done': True},
                    {'step': 2, 'title': 'Tài xế nhận lệnh', 'time': '18:15 30/06', 'done': True},
                    {'step': 3, 'title': 'Lấy Container (Cát Lái)', 'time': '07:30 01/07', 'done': True},
                    {'step': 4, 'title': 'Đang di chuyển trên đường', 'time': 'Hiện tại', 'done': False, 'active': True},
                    {'step': 5, 'title': 'Đóng/Trả hàng tại kho', 'time': '', 'done': False},
                    {'step': 6, 'title': 'Trả rỗng', 'time': '', 'done': False}
                ]
            },
            {
                'code': 'TVL-0916-004', 'cust': 'WCA_TTI', 'type': ShipmentType.IMPORT,
                'pickup': 'CÁT LÁI', 'wh': 'KHO WCA', 'drop': 'GFT THỦ ĐỨC',
                'status': TripStatus.UNLOADING, 'driver': emp_map['BỤI 94'], 'veh': veh_map['51C-123.45'],
                'cont': 'BMOU5528219 (40)', 'seal': 'CHƯA CẬP NHẬT', 'booking': 'YMJAI226535616', 'cutoff': '-',
                'notes': 'Free time 7 NGÀY',
                'rev': 3800000, 'exp': 0,
                'timeline': [
                    {'step': 1, 'title': 'Điều độ phát lệnh', 'time': '18:00 30/06', 'done': True},
                    {'step': 2, 'title': 'Tài xế nhận lệnh', 'time': '18:15 30/06', 'done': True},
                    {'step': 3, 'title': 'Lấy Container', 'time': '18:30 01/07', 'done': True},
                    {'step': 4, 'title': 'Đang giao hàng / Trút hàng', 'time': 'Hiện tại', 'done': False, 'active': True},
                    {'step': 5, 'title': 'Hạ rỗng', 'time': '', 'done': False}
                ]
            },
            {
                'code': 'TVL-0916-005', 'cust': 'TAKIGAWA', 'type': ShipmentType.DOMESTIC,
                'pickup': 'VSIP 2', 'wh': 'VSIP 3', 'drop': 'VSIP 2',
                'status': TripStatus.COMPLETED, 'driver': emp_map['HÒA PHÁT'], 'veh': veh_map['61C-393.29'],
                'cont': 'VOSU8802430 (40)', 'seal': '61C39329', 'booking': 'NỘI BỘ', 'cutoff': '-',
                'notes': 'LẤY HÀNG TỪ 30/6 - TÍNH TAKI QUAY ĐẦU (Cước 2tr2)',
                'rev': 2200000, 'exp': 500000,
                'timeline': [
                    {'step': 1, 'title': 'Lấy hàng (VSIP 2)', 'time': '08:30 01/07', 'done': True},
                    {'step': 2, 'title': 'Giao hàng (VSIP 3)', 'time': '11:30 01/07', 'done': True},
                    {'step': 3, 'title': 'Quay đầu (VSIP 2)', 'time': '14:00 01/07', 'done': True}
                ]
            },
            {
                'code': 'TVL-0916-006', 'cust': 'TAN_UYEN', 'type': ShipmentType.DOMESTIC,
                'pickup': 'TÂN UYÊN', 'wh': 'TÂY NINH', 'drop': '-',
                'status': TripStatus.COMPLETED, 'driver': emp_map['3S'], 'veh': veh_map['50E-745.02'],
                'cont': 'XE TẢI 10T', 'seal': '-', 'booking': '-', 'cutoff': '-',
                'notes': 'Chuyến xe tải - Cước 4095k',
                'rev': 4095000, 'exp': 1100000,
                'timeline': [
                    {'step': 1, 'title': 'Lấy hàng', 'time': '08:00 01/07', 'done': True},
                    {'step': 2, 'title': 'Giao hàng', 'time': '13:00 01/07', 'done': True}
                ],
                'expenses': [
                    {'cat': ExpenseCategory.BOT_TOLL, 'amt': 150000, 'status': ApprovalStatus.PENDING, 'time': '09:30 01/07'}
                ],
                'docs': [
                    {'type': DocumentType.POD, 'title': 'Biên bản giao nhận hàng', 'raw': 'Đã ký nhận đủ 10T', 'time': '13:15 01/07'}
                ]
            },
            {
                'code': 'TVL-0916-007', 'cust': 'ANDI', 'type': ShipmentType.EXPORT,
                'pickup': 'ICD TÂY NAM (TANAMEXCO - QK7)', 'wh': 'Kho An Di (540/5 Nguyễn Văn Khối)', 'drop': 'Cảng Cát Lái',
                'pickup_depot': 'Tây Nam', 'dropoff_depot': 'Cát Lái', 'wh_name': 'Kho An Di - Thông Tây Hội',
                'status': TripStatus.COMPLETED, 'driver': emp_map['Phong'], 'veh': veh_map['50H-896.50'],
                'cont': 'MRKU6074874', 'cont_type': '40HC', 'seal': 'MLVN1739611', 'booking': '276039921', 'cutoff': '10:44 16/09',
                'eir_no': '1955', 'shipping_line': 'MAE (Maersk)', 'vessel_voyage': 'USAL-UMM SALAL / 637E', 'dest_port': 'NEWARK', 'vgm': '10.93 D26C',
                'notes': 'Chuyến cont 40HC xuất Newark - Lấy Tây Nam, hạ Cát Lái (Khớp chứng từ 16/09/2026)',
                'rev': 3800000, 'exp': 1548000,
                'timeline': [
                    {'step': 1, 'title': 'Điều độ phát lệnh Zalo', 'time': '07:30 16/09', 'done': True},
                    {'step': 2, 'title': 'Tài xế Phong nhận lệnh', 'time': '07:45 16/09', 'done': True},
                    {'step': 3, 'title': 'Lấy Cont tại ICD Tây Nam (EIR 1955)', 'time': '10:44 16/09', 'done': True},
                    {'step': 4, 'title': 'Đóng hàng tại Kho An Di', 'time': '13:00 16/09', 'done': True},
                    {'step': 5, 'title': 'Hạ Cont cảng Cát Lái', 'time': '16:00 16/09', 'done': True},
                ],
                'expenses': [
                    {
                        'cat': ExpenseCategory.LIFT_OFF, 'amt': 1518000, 'status': ApprovalStatus.APPROVED, 'time': '10:44 16/09',
                        'doc_type': 'EINVOICE', 'issuer': 'CÔNG TY TNHH MTV CẢNG ICD TÂY NAM', 'inv_no': '138001',
                        'lookup_code': 'HD11202609-06654', 'lookup_url': 'https://icdtanamexco-tt78.vnpt-invoice.com.vn/',
                        'amount_before': 1405556, 'tax_rate': 8, 'tax_amt': 112444,
                        'notes': 'Hạ cont 40HC xuất bãi - Biên nhận HĐ 138001'
                    },
                    {
                        'cat': ExpenseCategory.TOLL_FEE, 'amt': 30000, 'status': ApprovalStatus.APPROVED, 'time': '11:15 16/09',
                        'doc_type': 'TOLL_TICKET', 'issuer': 'Trạm BOT Xa Lộ Hà Nội', 'inv_no': 'BOT-30K',
                        'lookup_code': '', 'lookup_url': '',
                        'amount_before': 30000, 'tax_rate': 0, 'tax_amt': 0,
                        'notes': 'Vé cầu đường Xa Lộ Hà Nội'
                    }
                ],
                'docs': [
                    {'type': DocumentType.EIR_PICKUP, 'title': 'Phiếu EIR Giao Nhận Container No 1955', 'raw': 'Cont: MRKU6074874 - Seal: MLVN1739611 - MAE - Tàu USAL-UMM SALAL 637E', 'time': '10:44 16/09'},
                    {'type': DocumentType.INVOICE, 'title': 'Biên Nhận Điện Tử ICD Tây Nam 138001', 'raw': 'HD11202609-06654 - Tiền: 1.518.000 đ', 'time': '10:45 16/09'},
                ]
            },
            {
                'code': 'TVL-0916-008', 'cust': 'ANDI', 'type': ShipmentType.EXPORT,
                'pickup': 'AP-622 DEPOT (429/4 XL Song Hành)', 'wh': 'Kho An Di (540/5 Nguyễn Văn Khối)', 'drop': 'Cảng Cát Lái',
                'pickup_depot': 'AP622', 'dropoff_depot': 'Cát Lái', 'wh_name': 'Kho An Di',
                'status': TripStatus.COMPLETED, 'driver': emp_map['Phong'], 'veh': veh_map['50H-896.50'],
                'cont': 'CSNU8011022', 'cont_type': '40HC', 'seal': '34192379', 'booking': '6466005230', 'cutoff': '04:28 16/09',
                'eir_no': '0034976', 'shipping_line': 'COS (Cosco) / CMA CGM', 'vessel_voyage': 'CMA CGM J MADISON / E19', 'dest_port': 'WORLDWIDE', 'vgm': '40HC',
                'notes': 'Chuyến cont 40HC lấy vỏ rỗng tại AP-622 Depot theo phiếu EIR 0034976',
                'rev': 4200000, 'exp': 2025000,
                'timeline': [
                    {'step': 1, 'title': 'Điều độ phát lệnh Zalo', 'time': '03:30 16/09', 'done': True},
                    {'step': 2, 'title': 'Tài xế Phong nhận lệnh', 'time': '03:45 16/09', 'done': True},
                    {'step': 3, 'title': 'Lấy Cont rỗng AP-622 (EIR 0034976)', 'time': '04:28 16/09', 'done': True},
                    {'step': 4, 'title': 'Đóng hàng tại Kho An Di', 'time': '08:00 16/09', 'done': True},
                    {'step': 5, 'title': 'Hạ Cont cảng Cát Lái', 'time': '11:30 16/09', 'done': True},
                ],
                'expenses': [
                    {
                        'cat': ExpenseCategory.LIFT_ON, 'amt': 1925000, 'status': ApprovalStatus.APPROVED, 'time': '04:29 16/09',
                        'doc_type': 'EINVOICE', 'issuer': 'CÔNG TY TNHH DỊCH VỤ VẬN TẢI ANH PHONG', 'inv_no': '0060962',
                        'lookup_code': 'QXC39QWL4H9', 'lookup_url': 'http://solog.ehoadon.vn',
                        'amount_before': 1782407, 'tax_rate': 8, 'tax_amt': 142593,
                        'notes': 'Phí nâng rỗng, phụ phí nâng hạ container - HĐ 0060962'
                    },
                    {
                        'cat': ExpenseCategory.TOLL_FEE, 'amt': 100000, 'status': ApprovalStatus.APPROVED, 'time': '05:30 16/09',
                        'doc_type': 'TOLL_TICKET', 'issuer': 'Trạm BOT Phú Mỹ - Cát Lái', 'inv_no': 'BOT-100K',
                        'lookup_code': '', 'lookup_url': '',
                        'amount_before': 100000, 'tax_rate': 0, 'tax_amt': 0,
                        'notes': 'Vé cầu đường khứ hồi Phú Mỹ'
                    }
                ],
                'docs': [
                    {'type': DocumentType.EIR_PICKUP, 'title': 'Phiếu EIR Lấy Cont Rỗng AP-622 No 0034976', 'raw': 'Cont: CSNU 8011022 - Seal: 34192379 - COS - Tàu CMA CGM J MADISON E19', 'time': '04:28 16/09'},
                    {'type': DocumentType.INVOICE, 'title': 'Phiếu Tra Cứu HĐĐT Anh Phong 0060962', 'raw': 'QXC39QWL4H9 - Tiền: 1.925.000 đ', 'time': '04:29 16/09'},
                ]
            }
        ]

        for trd in trips_data:
            profit = trd['rev'] - trd['exp']
            margin = round((profit / trd['rev']) * 100, 2) if trd['rev'] > 0 else 0
            trip, _ = DispatchTrip.objects.update_or_create(
                trip_code=trd['code'],
                defaults={
                    'customer': cust_map[trd['cust']],
                    'shipment_type': trd['type'],
                    'vehicle': trd['veh'],
                    'driver': trd['driver'],
                    'dispatcher': emp_map['DD001'],
                    'container_number': trd['cont'],
                    'container_type': trd.get('cont_type', '40HC'),
                    'seal_number': trd['seal'],
                    'booking_or_bill': trd['booking'],
                    'cutoff_time': trd['cutoff'],
                    'pickup_location': trd['pickup'],
                    'warehouse_location': trd['wh'],
                    'dropoff_location': trd['drop'],
                    'pickup_depot': trd.get('pickup_depot', ''),
                    'dropoff_depot': trd.get('dropoff_depot', ''),
                    'delivery_warehouse': trd.get('wh_name', ''),
                    'eir_number': trd.get('eir_no', ''),
                    'shipping_line': trd.get('shipping_line', ''),
                    'vessel_voyage': trd.get('vessel_voyage', ''),
                    'destination_port': trd.get('dest_port', ''),
                    'vgm_weight': trd.get('vgm', ''),
                    'status': trd['status'],
                    'special_notes': trd['notes'],
                    'cached_revenue': trd['rev'],
                    'cached_expense': trd['exp'],
                    'cached_profit': profit,
                    'cached_margin_percent': margin,
                }
            )

            # Timeline
            TripTimelineItem.objects.filter(trip=trip).delete()
            for tli in trd['timeline']:
                TripTimelineItem.objects.create(
                    trip=trip,
                    step_number=tli['step'],
                    title=tli['title'],
                    time_display=tli['time'],
                    is_done=tli.get('done', False),
                    is_active=tli.get('active', False)
                )

            # Chi phí
            if 'expenses' in trd:
                TripExpense.objects.filter(trip=trip).delete()
                for exp in trd['expenses']:
                    TripExpense.objects.create(
                        trip=trip,
                        category=exp['cat'],
                        amount=exp['amt'],
                        status=exp['status'],
                        invoice_issuer=exp.get('issuer', ''),
                        invoice_number=exp.get('inv_no', ''),
                        invoice_lookup_code=exp.get('lookup_code', ''),
                        invoice_lookup_url=exp.get('lookup_url', ''),
                        amount_before_tax=exp.get('amount_before', exp['amt']),
                        tax_rate=exp.get('tax_rate', 0),
                        tax_amount=exp.get('tax_amt', 0),
                        notes=exp.get('notes', f"Phát sinh lúc {exp.get('time', '')}")
                    )

            # Chứng từ
            if 'docs' in trd:
                for doc in trd['docs']:
                    TripDocument.objects.create(
                        trip=trip,
                        document_type=doc['type'],
                        title=doc['title'],
                        ocr_raw_text=doc['raw'],
                        is_verified=True,
                        verified_by=emp_map['DD001']
                    )

            # Tracking Event Log
            TrackingEventLog.objects.create(
                trip=trip,
                actor=emp_map['DD001'],
                event_type='SEED_DATA',
                title=f"Khởi tạo chuyến xe {trip.trip_code}",
                description=f"Khách hàng: {trip.customer.name}, Tuyến: {trip.pickup_location} -> {trip.warehouse_location}"
            )

        self.stdout.write(self.style.SUCCESS("Da nap toan bo du lieu mau thanh cong (Seeding completed successfully)!"))
