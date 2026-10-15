# -*- coding: utf-8 -*-
import os
import sys
import json
from decimal import Decimal
import django

sys.stdout.reconfigure(encoding='utf-8')
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.personnel.models import (
    Employee, Department, EmployeeRole, EmployeeGender,
    LaborContract, ContractType, ContractStatus,
    EmployeeDependent, PayrollPeriod, PayrollPeriodStatus, PayrollSlip,
    MonthlyAttendanceSummary
)
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.billing.models import DriverTripAdvance, DriverAdvanceStatus, AdvanceSourceType, CashTransaction

User = get_user_model()

def run_multi_role_simulation():
    print("=" * 110)
    print("       BIM LOGISTICS — KIỂM THỬ THAO TÁC THỰC TẾ ĐA VAI TRÒ (MULTI-ROLE E2E SIMULATION)      ")
    print("=" * 110)

    # Đảm bảo các User có sẵn
    user_hr = User.objects.filter(username='nhansu').first()
    user_dispatch = User.objects.filter(username='dieudo').first()
    user_accountant = User.objects.filter(username='ketoan').first()
    user_director = User.objects.filter(username='admin').first()

    if not user_hr:
        user_hr = User.objects.create_user('nhansu', 'nhansu@trienvo.com', 'password123')
    if not user_dispatch:
        user_dispatch = User.objects.create_user('dieudo', 'dieudo@trienvo.com', 'password123')
    if not user_accountant:
        user_accountant = User.objects.create_user('ketoan', 'ketoan@trienvo.com', 'password123')
    if not user_director:
        user_director = User.objects.create_superuser('admin', 'admin@trienvo.com', 'admin123')

    # Liên kết user với employee tương ứng
    emp_hr = Employee.objects.filter(code='NS001').first()
    if emp_hr and emp_hr.user != user_hr:
        emp_hr.user = user_hr
        emp_hr.save()

    emp_director = Employee.objects.filter(code='BGD01').first()
    if emp_director and emp_director.user != user_director:
        emp_director.user = user_director
        emp_director.save()

    emp_accountant = Employee.objects.filter(code='KT001').first()
    if emp_accountant and emp_accountant.user != user_accountant:
        emp_accountant.user = user_accountant
        emp_accountant.save()

    client = Client()

    # =========================================================================
    # VAI TRÒ 1: CHUYÊN VIÊN NHÂN SỰ (HR Specialist - 'nhansu')
    # =========================================================================
    print("\n>>> VAI TRÒ 1: CHUYÊN VIÊN NHÂN SỰ (Lê Thị Thu Thảo - NS001)")
    client.force_login(user_hr)

    # 1.1 Khai báo nhân sự mới
    import time
    ts = int(time.time())
    test_emp_code = f"TX-S{ts}"
    emp_payload = {
        'code': test_emp_code,
        'full_name': 'Hoàng Văn Thật',
        'nickname': 'Thật Xe Tải',
        'phone_number': '0988776655',
        'department': Department.FLEET,
        'role': EmployeeRole.DRIVER,
        'gender': EmployeeGender.MALE,
        'date_of_birth': '1988-08-18',
        'national_id': '079088001122',
        'license_number': 'FC-99887766',
        'license_expiry': '2029-08-18',
        'bank_account': '998877665544',
        'bank_name': 'Vietcombank',
        'bank_beneficiary': 'HOANG VAN THAT',
        'base_salary': 8000000,
        'insurance_salary': 5000000,
        'is_social_insurance_participant': True,
        'join_date': '2026-09-01'
    }
    res = client.post('/api/personnel/employees/', json.dumps(emp_payload), content_type='application/json')
    print(f"  [1.1] Khai báo tài xế mới '{emp_payload['full_name']}': HTTP {res.status_code}")
    assert res.status_code in [200, 201], f"Lỗi tạo NV: {res.json()}"
    new_emp_id = res.json()['data']['id']
    new_driver = Employee.objects.get(id=new_emp_id)

    # 1.2 Ký Hợp đồng lao động
    contract_num = f"HDLD-HVT-{ts}"
    LaborContract.all_objects.filter(contract_number=contract_num).delete()
    ct_payload = {
        'contract_number': contract_num,
        'employee': new_emp_id,
        'contract_type': ContractType.DEFINITE_TERM,
        'status': ContractStatus.ACTIVE,
        'job_title': 'Tài xế xe đầu kéo container',
        'working_address': 'Bãi xe Triền Võ, TP.HCM & các tuyến cảng',
        'sign_date': '2026-09-01',
        'start_date': '2026-09-01',
        'end_date': '2027-09-01',
        'base_salary': 8000000,
        'insurance_salary': 5000000,
        'allowance_notes': 'Phụ cấp ăn trưa 730k, điện thoại 300k, phụ cấp neo xe'
    }
    res = client.post('/api/personnel/contracts/', json.dumps(ct_payload), content_type='application/json')
    print(f"  [1.2] Ký hợp đồng lao động '{contract_num}': HTTP {res.status_code}")
    assert res.status_code in [200, 201], f"Lỗi tạo HĐ: {res.json()}"

    # 1.3 Khai báo Người Phụ Thuộc (giảm trừ gia cảnh thuế TNCN)
    dep_payload = {
        'employee': new_emp_id,
        'full_name': 'Hoàng Gia Bảo',
        'relationship': 'Con ruột',
        'national_id': '079215000999',
        'date_of_birth': '2015-06-01',
        'start_date': '2026-09-01',
        'is_active': True
    }
    res = client.post('/api/personnel/dependents/', json.dumps(dep_payload), content_type='application/json')
    print(f"  [1.3] Đăng ký người phụ thuộc giảm trừ gia cảnh '{dep_payload['full_name']}': HTTP {res.status_code}")
    assert res.status_code in [200, 201]

    # =========================================================================
    # VAI TRÒ 2: ĐIỀU ĐỘ VIÊN (Dispatcher - 'dieudo')
    # =========================================================================
    print("\n>>> VAI TRÒ 2: ĐIỀU ĐỘ VIÊN (Trần Điều Độ - DD001)")
    client.force_login(user_dispatch)

    # 2.1 Điều phối 3 chuyến xe trong tháng 09/2026 cho tài xế Hoàng Văn Thật
    from apps.customers.models import Customer
    from apps.fleet.models import Vehicle
    cust = Customer.objects.first()
    veh = Vehicle.objects.first()

    trip1_code = f'TVL-S{ts}-1'
    trip2_code = f'TVL-S{ts}-2'
    trip3_code = f'TVL-S{ts}-3'

    trip1 = DispatchTrip.objects.create(
        trip_code=trip1_code,
        customer=cust,
        vehicle=veh,
        driver=new_driver,
        pickup_location='Cảng Cát Lái, TP.HCM',
        warehouse_location='KCN VSIP 1, Bình Dương',
        loading_date='2026-09-05',
        driver_allowance=Decimal('850000'), # Chuyến chính: 850k
        status=TripStatus.COMPLETED
    )

    primary_driver = Employee.objects.filter(code='TX001').first()

    trip2 = DispatchTrip.objects.create(
        trip_code=trip2_code,
        customer=cust,
        vehicle=veh,
        driver=primary_driver,
        dropoff_driver=new_driver, # Chuyến cắt kéo / hạ cont: 350k
        pickup_location='Cảng SP-ITC',
        warehouse_location='ICD Phước Long',
        loading_date='2026-09-12',
        driver_allowance=Decimal('500000'),
        dropoff_driver_allowance=Decimal('350000'),
        status=TripStatus.COMPLETED
    )

    trip3 = DispatchTrip.objects.create(
        trip_code=trip3_code,
        customer=cust,
        vehicle=veh,
        driver=new_driver,
        pickup_location='Cảng Tân Cảng Hiệp Phước',
        warehouse_location='KCN Long Hậu',
        loading_date='2026-09-20',
        driver_allowance=Decimal('750000'), # Chuyến chính: 750k
        detention_driver_allowance=Decimal('300000'), # Neo xe qua đêm: 300k
        status=TripStatus.COMPLETED
    )
    print(f"  [2.1] Đã tạo 3 chuyến xe thực tế trong tháng 09/2026 cho tài xế {new_driver.full_name}:")
    print(f"        - Chuyến 1 (Chính): 850,000 đ")
    print(f"        - Chuyến 2 (Cắt kéo): 350,000 đ")
    print(f"        - Chuyến 3 (Chính + Neo xe): 750,000 đ + 300,000 đ = 1,050,000 đ")
    print(f"        => Tổng lương chuyến dự kiến = 2,250,000 đ")

    # 2.2 Cấp tạm ứng chuyến xe cho tài xế
    DriverTripAdvance.objects.filter(trip__in=[trip1, trip2, trip3]).delete()
    adv1 = DriverTripAdvance.objects.create(
        code=f'TU-{ts}-1',
        trip=trip1,
        driver=new_driver,
        advance_source=AdvanceSourceType.DISPATCHER_FUND,
        amount=Decimal('1200000'),
        actual_spent=Decimal('1200000'),
        advance_date='2026-09-05',
        status=DriverAdvanceStatus.SETTLED # Đã nộp hóa đơn dầu & hoàn ứng xong
    )
    adv3 = DriverTripAdvance.objects.create(
        code=f'TU-{ts}-2',
        trip=trip3,
        driver=new_driver,
        advance_source=AdvanceSourceType.DISPATCHER_FUND,
        amount=Decimal('1000000'),
        advance_date='2026-09-20',
        status=DriverAdvanceStatus.ADVANCED # Chưa nộp hóa đơn hoàn ứng
    )
    print(f"  [2.2] Quản lý tạm ứng chuyến xe:")
    print(f"        - Phiếu 1: 1,200,000 đ (Đã quyết toán xong - SETTLED) => Không trừ vào lương")
    print(f"        - Phiếu 2: 1,000,000 đ (Đang tạm ứng chưa hoàn - ADVANCED) => Cần trừ vào lương")

    # =========================================================================
    # VAI TRÒ 3: NHÂN VIÊN TẠM ỨNG LƯƠNG & CHUYÊN VIÊN CHẤM CÔNG
    # =========================================================================
    print("\n>>> VAI TRÒ 3: TẠM ỨNG LƯƠNG & CHẤM CÔNG THỰC TẾ")
    # Nhân viên tạm ứng lương giữa tháng:
    new_driver.current_advance = Decimal('1500000') # 1.5 triệu
    new_driver.save()
    print(f"  [3.1] Ghi nhận tạm ứng lương trong tháng của tài xế {new_driver.full_name}: {new_driver.current_advance:,.0f} đ")

    # Chấm công tháng 09/2026
    period = PayrollPeriod.objects.get(period_code='2026-09')
    period.status = PayrollPeriodStatus.DRAFT
    period.cash_transaction = None
    period.save()
    # Tự động sinh công
    res = client.post('/api/personnel/monthly-attendance/auto-generate/', json.dumps({'period_id': period.id}), content_type='application/json')
    assert res.status_code == 200

    # Chấm công chi tiết cho Hoàng Văn Thật: 24 ngày đi làm + 2 ngày phép năm P = 26 ngày
    att_new = MonthlyAttendanceSummary.objects.get(employee=new_driver, period=period)
    att_new.worked_days = Decimal('24.0')
    att_new.paid_leave_days = Decimal('2.0')
    att_new.calculate_total_paid_days()
    att_new.save()
    print(f"  [3.2] Chấm công chi tiết cho {new_driver.full_name}: Đi làm {att_new.worked_days} ngày + {att_new.paid_leave_days} ngày phép năm => Tổng công hưởng lương: {att_new.total_paid_days} ngày.")

    # =========================================================================
    # VAI TRÒ 4: KẾ TOÁN TIỀN LƯƠNG (Payroll Accountant - 'ketoan')
    # =========================================================================
    print("\n>>> VAI TRÒ 4: KẾ TOÁN TIỀN LƯƠNG (Trần Thị Kế Toán - KT001)")
    client.force_login(user_accountant)

    # 4.1 Chạy tính toán lương toàn kỳ
    res_calc = client.post(f'/api/personnel/periods/{period.id}/calculate/')
    print(f"  [4.1] Động cơ tính lương Hybrid Payroll: HTTP {res_calc.status_code}")
    assert res_calc.status_code == 200

    # 4.2 Lấy phiếu lương của Hoàng Văn Thật để đối soát chi tiết
    slip_hvt = PayrollSlip.objects.get(period=period, employee=new_driver)
    total_trip_sal = slip_hvt.trip_allowance + slip_hvt.dropoff_allowance + slip_hvt.detention_allowance + slip_hvt.fuel_bonus
    print(f"\n  [4.2] BẢNG ĐỐI SOÁT CHI TIẾT PHIẾU LƯƠNG TÀI XẾ [{new_driver.code}] {new_driver.full_name}:")
    print(f"        -------------------------------------------------------------")
    print(f"        - Lương HĐLĐ căn bản      : {slip_hvt.base_salary:>12,.0f} đ")
    print(f"        - Ngày công hưởng lương   : {slip_hvt.actual_working_days:>12.1f} / 26 ngày")
    print(f"        - 1. LƯƠNG NGÀY CÔNG (TG) : {slip_hvt.time_salary:>12,.0f} đ  (Công thức: 8tr / 26 * 26)")
    print(f"        - 2. LƯƠNG CHUYẾN XE (SP) : {total_trip_sal:>12,.0f} đ  (3 chuyến: 850k + 350k + 1,050k)")
    print(f"             + Chuyến chính       : {slip_hvt.trip_allowance:>12,.0f} đ")
    print(f"             + Chuyến hạ cont     : {slip_hvt.dropoff_allowance:>12,.0f} đ")
    print(f"             + Neo xe qua đêm     : {slip_hvt.detention_allowance:>12,.0f} đ")
    print(f"        - 3. PHỤ CẤP & THƯỞNG KPI :")
    print(f"             + Tiền ăn trưa       : {slip_hvt.lunch_allowance:>12,.0f} đ")
    print(f"             + Tiền điện thoại    : {slip_hvt.phone_allowance:>12,.0f} đ")
    print(f"             + Thưởng KPI         : {slip_hvt.kpi_bonus:>12,.0f} đ")
    print(f"        => TỔNG GROSS             : {slip_hvt.gross_income:>12,.0f} đ")
    print(f"        - 4. KHẤU TRỪ BẢO HIỂM    : {slip_hvt.total_insurance_employee:>12,.0f} đ  (10.5% lương BHXH 5tr)")
    print(f"        - 5. THUẾ TNCN            : {slip_hvt.pit_amount:>12,.0f} đ  (Giảm trừ 15.4tr > Thu nhập chịu thuế)")
    print(f"        - 6. KHẤU TRỪ TẠM ỨNG     : {slip_hvt.advance_deductions:>12,.0f} đ  (Lương 1.5tr + Chuyến chưa hoàn 1tr)")
    print(f"        => THỰC LĨNH CHUYỂN KHOẢN : {slip_hvt.net_salary:>12,.0f} đ")
    print(f"        -------------------------------------------------------------")

    # Kiểm tra tính toán
    assert slip_hvt.time_salary == Decimal('8000000'), "Sai lương ngày!"
    assert total_trip_sal == Decimal('2250000'), "Sai lương chuyến!"
    assert slip_hvt.total_insurance_employee == Decimal('525000'), "Sai bảo hiểm!"
    assert slip_hvt.advance_deductions == Decimal('2500000'), f"Sai tạm ứng! Mong muốn 2,500,000 nhưng được {slip_hvt.advance_deductions}"
    assert slip_hvt.net_salary == Decimal('7225000'), f"Sai Net! Mong muốn 7,225,000 nhưng được {slip_hvt.net_salary}"
    print("        ==> TOÀN BỘ CÔNG THỨC KHỚP CHÍNH XÁC 100% TUYỆT ĐỐI! ✓")

    # 4.3 Kế toán điều chỉnh thưởng KPI thêm 500k cho tài xế Hoàng Văn Thật
    res_edit = client.put(f'/api/personnel/slips/{slip_hvt.id}/', json.dumps({
        'kpi_bonus': 500000,
        'lunch_allowance': 730000,
        'phone_allowance': 300000,
        'advance_deductions': 2500000,
        'notes': 'Thưởng thành tích hoàn thành chuyến xe xuất sắc an toàn'
    }), content_type='application/json')
    print(f"\n  [4.3] Kế toán điều chỉnh thưởng KPI 500k & phụ cấp ăn trưa 730k: HTTP {res_edit.status_code}")
    assert res_edit.status_code == 200
    slip_hvt.refresh_from_db()
    print(f"        => Gross sau điều chỉnh: {slip_hvt.gross_income:>12,.0f} đ | Thực lĩnh Net mới: {slip_hvt.net_salary:>12,.0f} đ ✓")
    assert slip_hvt.gross_income == Decimal('11780000')
    assert slip_hvt.net_salary == Decimal('8755000')

    # 4.4 Kế toán xuất danh sách chuyển khoản ngân hàng lô (Batch Payment)
    res_bank = client.get(f'/api/personnel/periods/{period.id}/bank-export/')
    print(f"  [4.4] Xuất danh sách chuyển khoản ngân hàng lô: HTTP {res_bank.status_code} | Tổng số NV: {res_bank.json()['total_employees']} | Tổng tiền: {res_bank.json()['total_transfer_formatted']}")
    assert res_bank.status_code == 200

    # 4.5 Kế toán lấy dữ liệu in phiếu lương cá nhân (Printable Payslip)
    res_print = client.get(f'/api/personnel/slips/{slip_hvt.id}/print/')
    print(f"  [4.5] Tạo dữ liệu in phiếu lương cá nhân: HTTP {res_print.status_code} | Mã phiếu: {res_print.json()['slip']['slip_code']}")
    assert res_print.status_code == 200

    # 4.6 Kế toán trình duyệt kỳ lương (chuyển sang LOCKED)
    res_lock = client.post(f'/api/personnel/periods/{period.id}/status/', json.dumps({'status': PayrollPeriodStatus.LOCKED}), content_type='application/json')
    print(f"  [4.6] Khóa bảng lương và trình duyệt: HTTP {res_lock.status_code} | Trạng thái: {res_lock.json()['period']['status_label']}")
    assert res_lock.status_code == 200

    # =========================================================================
    # VAI TRÒ 5: BAN GIÁM ĐỐC (Director - 'admin' / Võ Triền)
    # =========================================================================
    print("\n>>> VAI TRÒ 5: BAN GIÁM ĐỐC (Võ Triền - BGD01)")
    client.force_login(user_director)

    # 5.1 Giám đốc bấm Duyệt & Chi trả lương (chuyển sang PAID)
    res_pay = client.post(f'/api/personnel/periods/{period.id}/status/', json.dumps({'status': PayrollPeriodStatus.PAID}), content_type='application/json')
    print(f"  [5.1] Giám đốc phê duyệt chi lương: HTTP {res_pay.status_code} | Trạng thái: {res_pay.json()['period']['status_label']}")
    assert res_pay.status_code == 200

    period.refresh_from_db()
    assert period.status == PayrollPeriodStatus.PAID
    assert period.cash_transaction is not None
    print(f"  [5.2] Hệ thống tự động sinh Phiếu Chi Sổ Quỹ (CashTransaction):")
    print(f"        - Số chứng từ : {period.cash_transaction.code}")
    print(f"        - Số tiền chi : {period.cash_transaction.amount:,.0f} đ (Khớp đúng Tổng Net toàn công ty)")
    print(f"        - Ngày chi    : {period.cash_transaction.transaction_date}")
    print(f"        - Diễn giải   : {period.cash_transaction.partner_name}")

    # =========================================================================
    # VAI TRÒ 6: TÀI XẾ (Driver - Hoàng Văn Thật)
    # =========================================================================
    print("\n>>> VAI TRÒ 6: TÀI XẾ (Hoàng Văn Thật - TX-SIM-01)")
    # Tạo user tài xế theo phiên
    user_driver = User.objects.create_user(username=f'tx_that_{ts}', email=f'that_{ts}@trienvo.com')
    new_driver.user = user_driver
    new_driver.save()
    client.force_login(user_driver)

    # Tài xế xem chi tiết phiếu lương cá nhân của mình
    res_driver_view = client.get(f'/api/personnel/slips/{slip_hvt.id}/')
    print(f"  [6.1] Tài xế đăng nhập kiểm tra phiếu lương cá nhân: HTTP {res_driver_view.status_code}")
    assert res_driver_view.status_code == 200
    slip_data = res_driver_view.json()
    print(f"        - Số công được duyệt     : {slip_data['actual_working_days']} ngày")
    print(f"        - Lương ngày công nhận   : {float(slip_data['time_salary']):,.0f} đ")
    print(f"        - Số chuyến xe hoàn thành : {slip_data['trip_count']} chuyến")
    driver_trip_sal = (
        Decimal(str(slip_data['trip_allowance'])) +
        Decimal(str(slip_data['dropoff_allowance'])) +
        Decimal(str(slip_data['detention_allowance'])) +
        Decimal(str(slip_data['fuel_bonus']))
    )
    print(f"        - Lương chuyến nhận      : {driver_trip_sal:,.0f} đ")
    print(f"        - Tiền tạm ứng đã trừ    : {float(slip_data['advance_deductions']):,.0f} đ")
    print(f"        - Thực nhận tài khoản VCB: {float(slip_data['net_salary']):,.0f} đ")
    print(f"        - Trạng thái thanh toán  : {'Đã chi trả thành công' if slip_data['is_paid'] else 'Chưa chi trả'}")

    print("\n" + "=" * 110)
    print(" KẾT QUẢ KIỂM THỬ: 100% CÁC THAO TÁC THẬT CỦA CẢ 6 VAI TRÒ ĐỀU HOÀN TOÀN CHÍNH XÁC VÀ TRƠN TRU! ")
    print("=" * 110 + "\n")

if __name__ == '__main__':
    run_multi_role_simulation()
