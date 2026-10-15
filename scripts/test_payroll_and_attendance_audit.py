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
from django.db.models import Sum, Q, Count
from apps.personnel.models import (
    Employee, PayrollPeriod, PayrollPeriodStatus, PayrollSlip,
    MonthlyAttendanceSummary, DailyAttendance, AttendanceCode,
    LaborContract, ContractStatus
)
from apps.dispatch.models import DispatchTrip
from apps.billing.models import DriverTripAdvance

def run_payroll_and_attendance_audit():
    User = get_user_model()
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        admin = User.objects.create_superuser('admin_audit', 'admin@trienvo.com', 'admin123')

    client = Client()
    client.force_login(admin)

    print("==========================================================================================")
    print("           BIM LOGISTICS — KIỂM THỬ & RÀ SOÁT CHẤM CÔNG VÀ TÍNH TOÁN LƯƠNG TỪNG NGƯỜI     ")
    print("==========================================================================================\n")

    # BƯỚC 1: KHỞI TẠO HOẶC CHUẨN BỊ KỲ LƯƠNG THÁNG 09/2026 (Kỳ có 82 chuyến xe thực tế của tài xế)
    period_code = "2026-09"
    period, created = PayrollPeriod.objects.get_or_create(
        period_code=period_code,
        defaults={
            'name': 'Bảng lương Tháng 09/2026',
            'from_date': '2026-09-01',
            'to_date': '2026-09-30',
            'standard_days': Decimal('26.0'),
            'status': PayrollPeriodStatus.DRAFT
        }
    )
    if period.is_deleted:
        period.is_deleted = False
        period.save()

    print(f"1. KỲ LƯƠNG: [{period.period_code}] {period.name} (Từ {period.from_date} đến {period.to_date})")
    print(f"   - Công tiêu chuẩn tháng: {period.standard_days} ngày")

    # BƯỚC 2: KIỂM THỬ TÍNH NĂNG CHẤM CÔNG (ATTENDANCE)
    print("\n2. KIỂM THỬ TÍNH NĂNG CHẤM CÔNG:")
    res_gen = client.post('/api/personnel/monthly-attendance/auto-generate/', json.dumps({'period_id': period.id}), content_type='application/json')
    print(f"   - Tự động khởi tạo bảng chấm công: HTTP {res_gen.status_code} | {res_gen.json().get('message')}")

    # Thử điều chỉnh ngày công thực tế cho một số nhân viên để kiểm tra tính linh hoạt:
    # TX001: Đi làm đủ 26 ngày (100% lương ngày)
    # TX002: Nghỉ 2 ngày không lương (Ro=2) => 24 ngày công
    # TX003: Đi làm 25 ngày + 1 ngày phép năm (P=1) => 26 ngày công hưởng lương
    tx002 = Employee.objects.filter(code='TX002').first()
    if tx002:
        att_tx002 = MonthlyAttendanceSummary.objects.filter(employee=tx002, period=period).first()
        if att_tx002:
            att_tx002.worked_days = Decimal('24.0')
            att_tx002.unpaid_leave_days = Decimal('2.0')
            att_tx002.calculate_total_paid_days()
            att_tx002.save()
            print(f"   - Đã điều chỉnh công [{tx002.code}] {tx002.full_name}: Đi làm {att_tx002.worked_days} ngày, nghỉ không lương {att_tx002.unpaid_leave_days} ngày => Công tính lương: {att_tx002.total_paid_days} ngày.")

    tx003 = Employee.objects.filter(code='TX003').first()
    if tx003:
        att_tx003 = MonthlyAttendanceSummary.objects.filter(employee=tx003, period=period).first()
        if att_tx003:
            att_tx003.worked_days = Decimal('25.0')
            att_tx003.paid_leave_days = Decimal('1.0')
            att_tx003.calculate_total_paid_days()
            att_tx003.save()
            print(f"   - Đã điều chỉnh công [{tx003.code}] {tx003.full_name}: Đi làm {att_tx003.worked_days} ngày + 1 ngày phép năm => Công tính lương: {att_tx003.total_paid_days} ngày.")

    # BƯỚC 3: CHẠY TÍNH TOÁN LƯƠNG (HYBRID PAYROLL ENGINE)
    print("\n3. CHẠY ĐỘNG CƠ TÍNH LƯƠNG KẾT HỢP (HYBRID PAYROLL ENGINE):")
    res_calc = client.post(f'/api/personnel/periods/{period.id}/calculate/')
    print(f"   - Kết quả tính toán: HTTP {res_calc.status_code} | {res_calc.json().get('message')}")
    assert res_calc.status_code == 200, f"Tính lương thất bại: {res_calc.json()}"

    period.refresh_from_db()
    slips = period.slips.select_related('employee').filter(is_deleted=False).order_by('employee__role', 'employee__code')

    print(f"\n4. RÀ SOÁT CHI TIẾT BẢNG LƯƠNG TỪNG NGƯỜI ({slips.count()} CBNV):")
    print("-" * 128)
    print(f"{'MÃ NV':<8} | {'HỌ VÀ TÊN':<22} | {'VAI TRÒ':<10} | {'CÔNG':<5} | {'LƯƠNG NGÀY':<11} | {'CHUYẾN':<6} | {'LƯƠNG CHUYẾN':<12} | {'PHỤ CẤP':<10} | {'TẠM ỨNG':<10} | {'THỰC LĨNH NET':<12}")
    print("-" * 128)

    discrepancy_count = 0
    audit_results = []

    for s in slips:
        emp = s.employee
        # 1. Kiểm tra Lương Ngày Công
        # Lương căn cứ: Hợp đồng lao động active hoặc base_salary
        ct = emp.contracts.filter(status=ContractStatus.ACTIVE, is_deleted=False).order_by('-start_date').first()
        expected_base = ct.base_salary if (ct and ct.base_salary > 0) else (emp.base_salary or Decimal('0'))
        
        # Công hưởng lương
        att = MonthlyAttendanceSummary.objects.filter(employee=emp, period=period).first()
        paid_days = att.total_paid_days if att else period.standard_days
        
        expected_time_salary = round(expected_base / period.standard_days * paid_days)
        is_time_sal_correct = (abs(s.time_salary - expected_time_salary) <= 1)

        # 2. Kiểm tra Lương Chuyến Xe (Logistics Piecework)
        trips = DispatchTrip.objects.filter(
            driver=emp,
            is_deleted=False
        ).exclude(status='CANCELLED').filter(
            Q(loading_date__gte=period.from_date, loading_date__lte=period.to_date) |
            Q(loading_date__isnull=True, created_at__date__gte=period.from_date, created_at__date__lte=period.to_date)
        )
        expected_trip_allowance = trips.aggregate(s=Sum('driver_allowance'))['s'] or Decimal('0')
        dropoff_trips = DispatchTrip.objects.filter(
            dropoff_driver=emp,
            is_deleted=False
        ).exclude(status='CANCELLED').filter(
            Q(loading_date__gte=period.from_date, loading_date__lte=period.to_date) |
            Q(loading_date__isnull=True, created_at__date__gte=period.from_date, created_at__date__lte=period.to_date)
        )
        expected_dropoff = dropoff_trips.aggregate(s=Sum('dropoff_driver_allowance'))['s'] or Decimal('0')
        expected_detention = (trips.aggregate(s=Sum('detention_driver_allowance'))['s'] or Decimal('0')) + (dropoff_trips.aggregate(s=Sum('detention_driver_allowance'))['s'] or Decimal('0'))
        
        expected_total_piecework = expected_trip_allowance + expected_dropoff + expected_detention
        actual_total_piecework = s.trip_allowance + s.dropoff_allowance + s.detention_allowance
        is_trip_sal_correct = (actual_total_piecework == expected_total_piecework)

        # 3. Kiểm tra Tạm Ứng (Advance Deductions)
        # Tạm ứng lương cá nhân hoặc tạm ứng chuyến
        adv_qs = DriverTripAdvance.objects.filter(
            driver=emp,
            is_deleted=False
        ).filter(
            Q(advance_date__gte=period.from_date, advance_date__lte=period.to_date) |
            Q(advance_date__isnull=True, created_at__date__gte=period.from_date, created_at__date__lte=period.to_date)
        )
        unsettled_adv = adv_qs.filter(status='ADVANCED').aggregate(s=Sum('amount'))['s'] or Decimal('0')
        tot_adv = adv_qs.aggregate(s=Sum('amount'))['s'] or Decimal('0')
        emp_adv = emp.current_advance or Decimal('0')

        if emp_adv > 0:
            expected_adv = emp_adv + unsettled_adv
        else:
            expected_adv = unsettled_adv if unsettled_adv > 0 else tot_adv

        is_adv_correct = (s.advance_deductions == expected_adv)

        # 4. Kiểm tra Thực Lĩnh Net
        expected_net = max(Decimal('0'), s.gross_income - s.total_insurance_employee - s.pit_amount - s.advance_deductions - s.other_deductions)
        is_net_correct = (s.net_salary == expected_net)

        status_flag = "✓"
        if not (is_time_sal_correct and is_trip_sal_correct and is_adv_correct and is_net_correct):
            status_flag = "✗"
            discrepancy_count += 1

        total_allowance_other = s.phone_allowance + s.lunch_allowance + s.other_allowance + s.kpi_bonus
        
        print(f"{emp.code:<8} | {emp.full_name:<22} | {emp.get_role_display():<10} | {float(s.actual_working_days):<5.1f} | {s.time_salary:>11,.0f} | {s.trip_count:>6} | {actual_total_piecework:>12,.0f} | {total_allowance_other:>10,.0f} | {s.advance_deductions:>10,.0f} | {s.net_salary:>12,.0f} {status_flag}")

        audit_results.append({
            'code': emp.code,
            'name': emp.full_name,
            'role': emp.get_role_display(),
            'paid_days': float(s.actual_working_days),
            'time_salary': int(s.time_salary),
            'trip_count': s.trip_count,
            'trip_piecework': int(actual_total_piecework),
            'advance_deductions': int(s.advance_deductions),
            'insurance_employee': int(s.total_insurance_employee),
            'pit_amount': int(s.pit_amount),
            'net_salary': int(s.net_salary),
            'is_correct': (status_flag == "✓")
        })

    print("-" * 128)
    print(f"TỔNG KỲ LƯƠNG: Tổng Gross: {period.total_gross:,.0f} đ | Tổng BHXH NLĐ: {period.total_insurance_employee:,.0f} đ | Tổng Thuế TNCN: {period.total_pit:,.0f} đ | Tổng Tạm Ứng Trừ: {period.total_advances_deducted:,.0f} đ | Tổng Thực Lĩnh Net: {period.total_net:,.0f} đ")
    print(f"KẾT QUẢ ĐỐI SOÁT: {'100% CHÍNH XÁC KHÔNG SAI LỆCH' if discrepancy_count == 0 else f'Có {discrepancy_count} bản ghi cần kiểm tra'}\n")

    return audit_results

if __name__ == '__main__':
    run_payroll_and_attendance_audit()
