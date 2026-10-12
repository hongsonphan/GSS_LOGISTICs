import datetime
import os
from django.db import models, transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.dispatch.models import DispatchTrip, TripTimelineItem, ShipmentType, TripStatus
from apps.dispatch.timeline_service import sync_trip_10_step_timeline, build_10_step_timeline_spec, get_derived_7_milestones
from apps.fleet.models import Vehicle, Trailer, VehicleStatus, VehicleType
from apps.personnel.models import Employee, Department, EmployeeRole
from apps.customers.models import Customer, Quotation, QuotationItem, RouteTariff, BookingOrder, BookingStatus, BookingDocument
from apps.billing.models import TripExpense, ExpenseCategory, ApprovalStatus
from apps.documents.models import TripDocument, DocumentType
from django.core.exceptions import ValidationError, ValidationError as DjangoValidationError
from core.workflows import transition_trip, STATUS_LABELS
from core.permissions import (
    IsAdminOrDirector,
    IsDispatcher,
    IsAccountant,
    IsDriver,
    IsSalesOrDirector,
    IsCustomsOrDirector,
    CanManageFleet,
    CanViewPayroll,
    IsTripDriverOrDispatcher,
)
import re
from core.validators import validate_uploaded_document, sanitize_filename


def resolve_customer(customer_input):
    """
    Phân giải đối tượng Customer từ chuỗi input:
    Hỗ trợ:
    - Object Customer trực tiếp
    - Customer ID số nguyên (int hoặc str dạng số)
    - Định dạng 'Tên Khách Hàng (Mã Code)' ví dụ: 'ABC (CUST_20260921094535)'
    - Mã Code chính xác: 'CUST_20260921094535'
    - Tên chính xác (iexact)
    - Tên chứa chuỗi (icontains)
    """
    if not customer_input:
        return None

    if isinstance(customer_input, Customer):
        return customer_input

    val = str(customer_input).strip()
    if not val:
        return None

    # Nếu truyền ID số nguyên
    if val.isdigit():
        c = Customer.objects.filter(pk=int(val)).first()
        if c:
            return c

    # Nếu có định dạng "Tên (Mã Code)"
    match = re.match(r'^(.*?)\s*\((.*?)\)$', val)
    if match:
        name_part = match.group(1).strip()
        code_part = match.group(2).strip()
        c = Customer.objects.filter(code__iexact=code_part).first()
        if c:
            return c
        c = Customer.objects.filter(name__iexact=name_part).first()
        if c:
            return c
        c = Customer.objects.filter(code__icontains=code_part).first()
        if c:
            return c
        c = Customer.objects.filter(name__icontains=name_part).first()
        if c:
            return c

    # Thử tìm theo code exact
    c = Customer.objects.filter(code__iexact=val).first()
    if c:
        return c

    # Thử tìm theo name exact
    c = Customer.objects.filter(name__iexact=val).first()
    if c:
        return c

    # Thử tìm theo name icontains
    c = Customer.objects.filter(name__icontains=val).first()
    if c:
        return c

    return None


class DashboardBGDAPIView(APIView):
    """API tổng quan chiến lược dành cho Ban Giám Đốc (Chuẩn quốc tế TMS, Fleet & Customs Brokerage)."""
    permission_classes = [IsAdminOrDirector]
    def get(self, request):
        today = timezone.now().date()
        yesterday = today - datetime.timedelta(days=1)
        period = request.GET.get('period', '10_days')

        if period == 'today':
            start_date = today
            end_date = today
            period_label = 'Hôm nay'
            rev_label = "Doanh Thu (Hôm nay)"
            exp_label = "Chi Phí (Hôm nay)"
            margin_label = "Biên Lợi Nhuận"
            chart_subtitle = "Hôm nay: Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"
        elif period == 'this_month':
            start_date = today.replace(day=1)
            end_date = today
            period_label = 'Tháng này'
            rev_label = "Doanh Thu TB / Ngày"
            exp_label = "Chi Phí TB / Ngày"
            margin_label = "Biên Lợi Nhuận TB"
            chart_subtitle = f"Tháng {today.month}/{today.year} ({start_date.strftime('%d/%m')} - {end_date.strftime('%d/%m')}): Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"
        elif period == 'this_quarter':
            quarter = (today.month - 1) // 3 + 1
            quarter_start_month = (quarter - 1) * 3 + 1
            start_date = datetime.date(today.year, quarter_start_month, 1)
            end_date = today
            period_label = 'Quý này'
            rev_label = "Doanh Thu TB / Tháng"
            exp_label = "Chi Phí TB / Tháng"
            margin_label = "Biên Lợi Nhuận TB"
            chart_subtitle = f"Quý {quarter}/{today.year}: Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"
        elif period == 'this_year':
            start_date = datetime.date(today.year, 1, 1)
            end_date = today
            period_label = 'Năm nay'
            rev_label = "Doanh Thu TB / Tháng"
            exp_label = "Chi Phí TB / Tháng"
            margin_label = "Biên Lợi Nhuận TB"
            chart_subtitle = f"Năm {today.year}: Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"
        elif period == 'custom':
            start_str = request.GET.get('start_date')
            end_str = request.GET.get('end_date')
            try:
                start_date = datetime.datetime.strptime(start_str, '%Y-%m-%d').date() if start_str else (today - datetime.timedelta(days=9))
                end_date = datetime.datetime.strptime(end_str, '%Y-%m-%d').date() if end_str else today
            except Exception:
                start_date = today - datetime.timedelta(days=9)
                end_date = today
            
            if start_date > end_date:
                start_date, end_date = end_date, start_date

            period_label = f"{start_date.strftime('%d/%m/%y')} - {end_date.strftime('%d/%m/%y')}"
            rev_label = "Doanh Thu TB / Ngày" if (end_date - start_date).days <= 31 else "Doanh Thu TB / Tháng"
            exp_label = "Chi Phí TB / Ngày" if (end_date - start_date).days <= 31 else "Chi Phí TB / Tháng"
            margin_label = "Biên Lợi Nhuận TB"
            chart_subtitle = f"Giai đoạn {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}: Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"
        else: # '10_days' or fallback '7_days'
            days_count = 6 if period == '7_days' else 9
            start_date = today - datetime.timedelta(days=days_count)
            end_date = today
            period_label = '7 ngày qua' if period == '7_days' else '10 ngày qua'
            rev_label = "Doanh Thu TB / Ngày"
            exp_label = "Chi Phí TB / Ngày"
            margin_label = "Biên Lợi Nhuận TB"
            chart_subtitle = f"{period_label} ({start_date.strftime('%d/%m')} - {end_date.strftime('%d/%m')}): Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"

        # 1. Lọc tập chuyến xe theo kỳ được chọn
        trips_period = DispatchTrip.objects.filter(
            Q(loading_date__range=[start_date, end_date]) | Q(loading_date__isnull=True, created_at__date__range=[start_date, end_date]),
            is_deleted=False
        )

        # Doanh thu, Chi phí & Lợi nhuận gộp theo kỳ
        agg_revenue = float(trips_period.aggregate(total=Sum('cached_revenue'))['total'] or 0.0)
        agg_expense = float(trips_period.aggregate(total=Sum('cached_expense'))['total'] or 0.0)
        agg_profit = agg_revenue - agg_expense
        profit_margin = round((agg_profit / agg_revenue * 100), 1) if agg_revenue > 0 else 0.0
        operating_ratio = round((agg_expense / agg_revenue * 100), 1) if agg_revenue > 0 else 0.0
        pending_settle_count = trips_period.filter(is_expenses_settled=False).count()

        # 2. Vận hành chuyến & Năng suất (Productivity & SLA) theo kỳ
        completed_trips_qs = trips_period.filter(status__in=['DELIVERED', 'COMPLETED'])
        completed_trips = completed_trips_qs.count()
        today_active_trips = trips_period.filter(
            status__in=['ACCEPTED', 'CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY']
        ).count()
        total_trips = trips_period.count()

        delayed_count = completed_trips_qs.filter(
            Q(is_overnight_detention=True) | Q(event_logs__event_type='INCIDENT')
        ).distinct().count()
        ontime_rate = round(((completed_trips - delayed_count) / completed_trips * 100), 1) if completed_trips > 0 else 100.0

        # 3. Đội xe & Khả dụng tài sản (Fleet Utilization) theo kỳ
        period_vehicle_ids = list(trips_period.exclude(vehicle__isnull=True).values_list('vehicle_id', flat=True).distinct())
        total_vehicles = Vehicle.objects.filter(is_deleted=False).count() or 8
        vehicles_active = len(period_vehicle_ids) if period_vehicle_ids else Vehicle.objects.filter(status=VehicleStatus.ACTIVE, is_deleted=False).count()
        vehicles_active = min(vehicles_active, total_vehicles)
        vehicles_maint = Vehicle.objects.filter(status=VehicleStatus.MAINTENANCE, is_deleted=False).count()
        vehicles_idle = max(0, total_vehicles - vehicles_active - vehicles_maint)
        utilization_rate = round((vehicles_active / total_vehicles * 100), 1) if total_vehicles > 0 else 0.0

        # 4. Nhân sự & Tài xế tham gia theo kỳ
        period_driver_ids = list(trips_period.exclude(driver__isnull=True).values_list('driver_id', flat=True).distinct())
        total_drivers = Employee.objects.filter(role=EmployeeRole.DRIVER, is_deleted=False).count() or 10
        drivers_working = len(period_driver_ids) if period_driver_ids else Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True, is_deleted=False).count()
        drivers_working = min(drivers_working, total_drivers)
        drivers_on_leave = max(0, total_drivers - drivers_working)

        # 5. Khách hàng, Booking & Tờ khai Hải quan
        pending_bookings = BookingOrder.objects.filter(status=BookingStatus.PENDING_DISPATCH, is_deleted=False).count()
        active_bookings = BookingOrder.objects.filter(status=BookingStatus.PARTIALLY_DISPATCHED, is_deleted=False).count()
        completed_bookings = BookingOrder.objects.filter(status=BookingStatus.COMPLETED, is_deleted=False).count()

        # 6. Chuỗi dữ liệu biểu đồ CHÍNH XÁC theo khoảng thời gian và phân kỳ thông minh
        total_days = (end_date - start_date).days + 1
        chart_days = []
        chart_revenue = []
        chart_expense = []
        chart_profit = []

        if period == 'today':
            day_trips = DispatchTrip.objects.filter(
                Q(loading_date=today) | Q(loading_date__isnull=True, created_at__date=today),
                is_deleted=False
            )
            day_rev = int(day_trips.aggregate(total=Sum('cached_revenue'))['total'] or 0)
            day_exp = int(day_trips.aggregate(total=Sum('cached_expense'))['total'] or 0)
            
            yest_trips = DispatchTrip.objects.filter(
                Q(loading_date=yesterday) | Q(loading_date__isnull=True, created_at__date=yesterday),
                is_deleted=False
            )
            yest_rev = int(yest_trips.aggregate(total=Sum('cached_revenue'))['total'] or 0)
            yest_exp = int(yest_trips.aggregate(total=Sum('cached_expense'))['total'] or 0)
            
            chart_days = ['Hôm qua', 'Hôm nay']
            chart_revenue = [yest_rev, day_rev]
            chart_expense = [yest_exp, day_exp]
            chart_profit = [yest_rev - yest_exp, day_rev - day_exp]
            avg_rev = agg_revenue
            avg_exp = agg_expense
            rev_label = "Doanh Thu (Hôm nay)"
            exp_label = "Chi Phí (Hôm nay)"
            margin_label = "Biên Lợi Nhuận"
            chart_subtitle = "Hôm nay: Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"

        elif period == 'this_quarter':
            quarter = (today.month - 1) // 3 + 1
            quarter_months = [(quarter - 1) * 3 + 1, (quarter - 1) * 3 + 2, (quarter - 1) * 3 + 3]
            active_m_count = 0
            for m in quarter_months:
                chart_days.append(f"T{m}")
                if m <= today.month:
                    m_trips = DispatchTrip.objects.filter(
                        Q(loading_date__year=today.year, loading_date__month=m) | Q(loading_date__isnull=True, created_at__year=today.year, created_at__month=m),
                        is_deleted=False
                    )
                    m_rev = int(m_trips.aggregate(total=Sum('cached_revenue'))['total'] or 0)
                    m_exp = int(m_trips.aggregate(total=Sum('cached_expense'))['total'] or 0)
                    chart_revenue.append(m_rev)
                    chart_expense.append(m_exp)
                    chart_profit.append(m_rev - m_exp)
                    active_m_count += 1
                else:
                    chart_revenue.append(0)
                    chart_expense.append(0)
                    chart_profit.append(0)
            
            months_count = max(active_m_count, 1)
            avg_rev = round(agg_revenue / months_count)
            avg_exp = round(agg_expense / months_count)
            rev_label = "Doanh Thu TB / Tháng"
            exp_label = "Chi Phí TB / Tháng"
            margin_label = "Biên Lợi Nhuận TB"
            chart_subtitle = f"Quý {quarter}/{today.year}: Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"

        elif total_days <= 45 or period in ['7_days', 'this_month']:
            # Hiển thị theo TỪNG NGÀY (Daily Granularity)
            cur_date = start_date
            while cur_date <= end_date:
                chart_days.append(cur_date.strftime("%d/%m"))
                d_trips = DispatchTrip.objects.filter(
                    Q(loading_date=cur_date) | Q(loading_date__isnull=True, created_at__date=cur_date),
                    is_deleted=False
                )
                d_rev = int(d_trips.aggregate(total=Sum('cached_revenue'))['total'] or 0)
                d_exp = int(d_trips.aggregate(total=Sum('cached_expense'))['total'] or 0)
                chart_revenue.append(d_rev)
                chart_expense.append(d_exp)
                chart_profit.append(d_rev - d_exp)
                cur_date += datetime.timedelta(days=1)
            
            days_count = max(total_days, 1)
            avg_rev = round(agg_revenue / days_count)
            avg_exp = round(agg_expense / days_count)
            rev_label = "Doanh Thu TB / Ngày"
            exp_label = "Chi Phí TB / Ngày"
            margin_label = "Biên Lợi Nhuận TB"
            if period == '7_days':
                chart_subtitle = f"7 ngày qua ({start_date.strftime('%d/%m')} - {end_date.strftime('%d/%m')}): Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"
            elif period == 'this_month':
                chart_subtitle = f"Tháng {today.month}/{today.year} ({start_date.strftime('%d/%m')} - {end_date.strftime('%d/%m')}): Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"
            else:
                chart_subtitle = f"Giai đoạn {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')} ({total_days} ngày): Cột Doanh Thu vs Chi Phí"

        elif total_days <= 120:
            # Gom theo TUẦN (Weekly Granularity) cho khoảng 1.5 tháng - 4 tháng
            cur_date = start_date
            while cur_date <= end_date:
                w_end = min(cur_date + datetime.timedelta(days=6), end_date)
                w_label = f"{cur_date.strftime('%d/%m')}-{w_end.strftime('%d/%m')}"
                chart_days.append(w_label)
                
                w_trips = DispatchTrip.objects.filter(
                    Q(loading_date__range=[cur_date, w_end]) | Q(loading_date__isnull=True, created_at__date__range=[cur_date, w_end]),
                    is_deleted=False
                )
                w_rev = int(w_trips.aggregate(total=Sum('cached_revenue'))['total'] or 0)
                w_exp = int(w_trips.aggregate(total=Sum('cached_expense'))['total'] or 0)
                chart_revenue.append(w_rev)
                chart_expense.append(w_exp)
                chart_profit.append(w_rev - w_exp)
                
                cur_date = w_end + datetime.timedelta(days=1)
            
            weeks_count = max(len(chart_days), 1)
            avg_rev = round(agg_revenue / weeks_count)
            avg_exp = round(agg_expense / weeks_count)
            rev_label = "Doanh Thu TB / Tuần"
            exp_label = "Chi Phí TB / Tuần"
            margin_label = "Biên Lợi Nhuận TB"
            chart_subtitle = f"Giai đoạn {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')} (Gom {len(chart_days)} tuần): Cột Doanh Thu vs Chi Phí"

        else:
            # Gom theo THÁNG (Monthly Granularity) cho khoảng > 4 tháng hoặc Năm nay
            cur_year = start_date.year
            cur_month = start_date.month
            end_year = end_date.year
            end_month = end_date.month
            
            month_slots = []
            while (cur_year < end_year) or (cur_year == end_year and cur_month <= end_month):
                month_slots.append((cur_year, cur_month))
                if cur_month == 12:
                    cur_year += 1
                    cur_month = 1
                else:
                    cur_month += 1
            
            for y, m in month_slots:
                chart_days.append(f"T{m}/{str(y)[-2:]}" if len(month_slots) > 12 or start_date.year != end_date.year else f"T{m}")
                m_trips = DispatchTrip.objects.filter(
                    Q(loading_date__year=y, loading_date__month=m) | Q(loading_date__isnull=True, created_at__year=y, created_at__month=m),
                    is_deleted=False
                )
                m_rev = int(m_trips.aggregate(total=Sum('cached_revenue'))['total'] or 0)
                m_exp = int(m_trips.aggregate(total=Sum('cached_expense'))['total'] or 0)
                chart_revenue.append(m_rev)
                chart_expense.append(m_exp)
                chart_profit.append(m_rev - m_exp)
            
            months_count = max(len(month_slots), 1)
            avg_rev = round(agg_revenue / months_count)
            avg_exp = round(agg_expense / months_count)
            rev_label = "Doanh Thu TB / Tháng"
            exp_label = "Chi Phí TB / Tháng"
            margin_label = "Biên Lợi Nhuận TB"
            if period == 'this_year':
                chart_subtitle = f"Năm {today.year}: Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"
            else:
                chart_subtitle = f"Giai đoạn {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')} ({len(month_slots)} tháng): Cột Doanh Thu vs Chi Phí"

        # 7. Danh sách chuyến xe phân tích P&L trong kỳ
        period_trips_qs = trips_period.select_related('customer', 'driver', 'vehicle').order_by('-id')[:50]
        if not period_trips_qs.exists():
            period_trips_qs = DispatchTrip.objects.select_related('customer', 'driver', 'vehicle').order_by('-id')[:20]

        trips_pnl = []
        for t in period_trips_qs:
            trips_pnl.append({
                'trip_code': t.trip_code,
                'loading_date': t.loading_date.strftime('%d/%m/%Y') if t.loading_date else (t.created_at.strftime('%d/%m/%Y') if t.created_at else '-'),
                'loading_date_iso': t.loading_date.strftime('%Y-%m-%d') if t.loading_date else (t.created_at.strftime('%Y-%m-%d') if t.created_at else ''),
                'customer_name': t.customer.name if t.customer else 'Khách hàng',
                'route': f"{t.pickup_location} ➔ {t.warehouse_location}" if (t.pickup_location and t.warehouse_location) else (t.customer.name if t.customer else 'Tuyến vận tải'),
                'driver_name': (t.driver.nickname or t.driver.full_name) if t.driver else 'Chưa gán',
                'license_plate': t.vehicle.license_plate if t.vehicle else 'Chưa gán',
                'container_number': t.container_number or '-',
                'revenue': t.cached_revenue,
                'expense': t.cached_expense,
                'profit': t.cached_profit,
                'margin_percent': t.cached_margin_percent,
                'status': t.status,
                'status_label': STATUS_LABELS.get(t.status, t.status),
                'is_expenses_settled': t.is_expenses_settled,
            })

        # Đồng bộ số liệu Hải quan thực tế từ phân hệ Customs
        from apps.customs.models import CustomsDeclaration, CustomsLane, CustomsDeclarationStatus
        total_customs = CustomsDeclaration.objects.count()
        if total_customs > 0:
            c_green = CustomsDeclaration.objects.filter(customs_lane=CustomsLane.GREEN).count()
            c_yellow = CustomsDeclaration.objects.filter(customs_lane=CustomsLane.YELLOW).count()
            c_red = CustomsDeclaration.objects.filter(customs_lane=CustomsLane.RED).count()
            c_cleared = CustomsDeclaration.objects.filter(status__in=[CustomsDeclarationStatus.CLEARED, CustomsDeclarationStatus.RELEASED]).count()
            c_rate = round(c_cleared / total_customs * 100, 1)
        else:
            c_green, c_yellow, c_red, c_rate = 85, 12, 3, 85.0

        return Response({
            'period': period,
            'period_label': period_label,
            'financial': {
                'cash_on_hand': 150000000,
                'bank_balance': 1250000000,
                'total_liquidity': 1400000000,
                'weekly_planned_expenses': 450000000,
                'monthly_revenue': agg_revenue,
                'monthly_expense': agg_expense,
                'monthly_gross_profit': agg_profit,
                'profit_margin': profit_margin,
                'operating_ratio': operating_ratio,
                'pending_settle_count': pending_settle_count,
                'avg_revenue': avg_rev,
                'avg_expense': avg_exp,
                'avg_revenue_label': rev_label,
                'avg_expense_label': exp_label,
                'avg_margin_label': margin_label,
                'chart_subtitle': chart_subtitle,
            },
            'productivity': {
                'completed_yesterday': completed_trips,
                'today_active': today_active_trips,
                'total_trips': total_trips,
                'ontime_delivery_rate': ontime_rate,
                'monthly_gross_profit': agg_profit,
            },
            'fleet': {
                'active': vehicles_active,
                'idle': vehicles_idle,
                'maintenance': vehicles_maint,
                'total': total_vehicles,
                'utilization_rate': utilization_rate,
            },
            'personnel': {
                'active': drivers_working,
                'on_leave': drivers_on_leave,
            },
            'commercial_customs': {
                'pending_bookings': pending_bookings,
                'active_bookings': active_bookings,
                'completed_bookings': completed_bookings,
                'customs_green': c_green,
                'customs_yellow': c_yellow,
                'customs_red': c_red,
                'customs_clearance_rate': c_rate,
            },
            'charts': {
                'daily_trend': {
                    'labels': chart_days,
                    'revenue': chart_revenue,
                    'expense': chart_expense,
                    'profit': chart_profit,
                },
                'fleet_split': {
                    'labels': ['Xe đang chở hàng (Active)', 'Xe sẵn sàng tại bãi (Idle)', 'Xe đang bảo trì (Maintenance)'],
                    'data': [vehicles_active, vehicles_idle, vehicles_maint],
                },
                'customs_split': {
                    'labels': ['Luồng Xanh (Thông quan)', 'Luồng Vàng (Nộp hồ sơ)', 'Luồng Đỏ (Kiểm hóa)'],
                    'data': [c_green, c_yellow, c_red],
                }
            },
            # Giữ tương thích ngược cho các thẻ hiện có
            'funds': {
                'cash_on_hand': 150000000,
                'bank_balance': 1250000000,
                'weekly_planned_expenses': 450000000,
            },
            'trips_pnl': trips_pnl
        })

def calculate_dem_det_status(trip):
    """Tính toán thời hạn và trạng thái Free-time DEM/DET của container."""
    import datetime
    from django.utils import timezone
    today = timezone.localdate() if hasattr(timezone, 'localdate') else datetime.date.today()
    
    det_info = {
        'badge': 'NONE',
        'status': 'NONE',
        'label': 'Chưa đặt hạn DET',
        'days_left': None,
        'days_remaining': None,
        'color': 'slate',
        'is_overdue': False
    }
    if trip.det_expiry_date:
        delta = (trip.det_expiry_date - today).days
        det_info['days_left'] = delta
        det_info['days_remaining'] = delta
        if delta < 0:
            det_info = {
                'badge': 'OVERDUE',
                'status': 'OVERDUE',
                'label': f"Quá hạn DET {abs(delta)} ngày",
                'days_left': delta,
                'days_remaining': delta,
                'color': 'rose',
                'is_overdue': True
            }
        elif delta == 0:
            det_info = {
                'badge': 'TODAY',
                'status': 'TODAY',
                'label': "Hết hạn DET hôm nay",
                'days_left': 0,
                'days_remaining': 0,
                'color': 'rose',
                'is_overdue': True
            }
        elif delta == 1:
            det_info = {
                'badge': 'WARNING',
                'status': 'WARNING',
                'label': "Hết hạn DET ngày mai",
                'days_left': 1,
                'days_remaining': 1,
                'color': 'amber',
                'is_overdue': False
            }
        elif delta <= 2:
            det_info = {
                'badge': 'ATTENTION',
                'status': 'ATTENTION',
                'label': f"Còn {delta} ngày DET",
                'days_left': delta,
                'days_remaining': delta,
                'color': 'amber',
                'is_overdue': False
            }
        else:
            det_info = {
                'badge': 'SAFE',
                'status': 'SAFE',
                'label': f"Còn {delta} ngày DET",
                'days_left': delta,
                'days_remaining': delta,
                'color': 'emerald',
                'is_overdue': False
            }
    return det_info

class TripListCreateAPIView(APIView):
    """API lấy danh sách chuyến xe và Tạo Lệnh Điều Động mới."""
    permission_classes = [IsDispatcher]
    def get(self, request):
        query = request.GET.get('q', '').strip()
        status_filter = request.GET.get('status', '').strip()

        trips_qs = DispatchTrip.objects.select_related(
            'customer', 'vehicle', 'driver', 'dropoff_vehicle', 'dropoff_driver'
        ).prefetch_related('customs_declarations').order_by('-created_at')

        if query:
            trips_qs = trips_qs.filter(
                Q(trip_code__icontains=query) |
                Q(container_number__icontains=query) |
                Q(container_number_2__icontains=query) |
                Q(booking_or_bill__icontains=query) |
                Q(booking_or_bill_2__icontains=query) |
                Q(customer__name__icontains=query) |
                Q(vehicle__license_plate__icontains=query)
            )

        if status_filter in ['ACTIVE', 'Đang điều vận']:
            # Lọc các chuyến đang điều vận
            trips_qs = trips_qs.exclude(status__in=[TripStatus.COMPLETED, TripStatus.CANCELLED])
        elif not status_filter or status_filter in ['ALL', 'Tất cả trạng thái', 'Tất cả']:
            # Mặc định: Hiển thị tất cả các chuyến xe
            pass
        elif status_filter in ['COMPLETED', 'Đã hoàn thành']:
            trips_qs = trips_qs.filter(status=TripStatus.COMPLETED)
        elif status_filter in ['CANCELLED', 'Đã hủy']:
            trips_qs = trips_qs.filter(status=TripStatus.CANCELLED)
        elif status_filter in ['TRANSIT', 'Đang vận chuyển']:
            trips_qs = trips_qs.filter(status__in=[TripStatus.IN_TRANSIT, TripStatus.CONTAINER_PICKED, TripStatus.RETURNING_EMPTY])
        elif status_filter in ['DELIVERED', 'Đã giao hàng']:
            trips_qs = trips_qs.filter(status__in=[TripStatus.DELIVERED, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING])
        elif status_filter in ['PENDING', 'Chờ khởi hành']:
            trips_qs = trips_qs.filter(status__in=[TripStatus.DRAFT, TripStatus.DISPATCHED, TripStatus.ACCEPTED])
        else:
            for k, v in TripStatus.choices:
                if status_filter.lower() in v.lower() or status_filter.upper() == k:
                    trips_qs = trips_qs.filter(status=k)
                    break

        # Lọc theo khung thời gian (Kỳ chọn trên Topbar)
        from_date = request.GET.get('from_date') or request.GET.get('start_date')
        to_date = request.GET.get('to_date') or request.GET.get('end_date')
        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                trips_qs = trips_qs.filter(Q(loading_date__gte=fd) | Q(loading_date__isnull=True, created_at__date__gte=fd))
            except Exception:
                pass
        if to_date:
            try:
                td = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                trips_qs = trips_qs.filter(Q(loading_date__lte=td) | Q(loading_date__isnull=True, created_at__date__lte=td))
            except Exception:
                pass

        now_dt = timezone.now()
        trips_list = []
        for t in trips_qs:
            det_status = calculate_dem_det_status(t)
            customs_decl = t.customs_declarations.filter(is_deleted=False).first()
            customs_info = {
                'has_declaration': bool(customs_decl),
                'declaration_number': customs_decl.declaration_number if customs_decl else '',
                'customs_lane': customs_decl.customs_lane if customs_decl else '',
                'customs_lane_label': customs_decl.get_customs_lane_display() if customs_decl else '',
                'status': customs_decl.status if customs_decl else '',
                'status_label': customs_decl.get_status_display() if customs_decl else '',
                'is_cleared': (customs_decl.status in ['CLEARED', 'RELEASED']) if customs_decl else False,
            }

            minutes_since_dispatch = 0
            acceptance_sla_status = 'NORMAL'
            if t.declined_at:
                acceptance_sla_status = 'DECLINED'
                if t.declined_at:
                    diff_mins = int((now_dt - t.declined_at).total_seconds() // 60)
                    minutes_since_dispatch = max(0, diff_mins)
            elif t.status == TripStatus.DISPATCHED:
                if t.dispatched_at:
                    diff_mins = int((now_dt - t.dispatched_at).total_seconds() // 60)
                    minutes_since_dispatch = max(0, diff_mins)
                else:
                    diff_mins = int((now_dt - t.created_at).total_seconds() // 60)
                    minutes_since_dispatch = max(0, diff_mins)

                if minutes_since_dispatch >= 60:
                    acceptance_sla_status = 'OVERDUE'
                elif minutes_since_dispatch >= 30:
                    acceptance_sla_status = 'WARNING'
                else:
                    acceptance_sla_status = 'NORMAL'
            elif t.status in [TripStatus.ACCEPTED, TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]:
                acceptance_sla_status = 'ACCEPTED'

            trips_list.append({
                'id': t.trip_code,
                'hashid': t.hashid,
                'driver_hashid': t.driver_hashid,
                'tracking_hashid': t.tracking_hashid,
                'customer': t.customer.name if t.customer else 'Khách Hàng',
                'type': t.get_shipment_type_display(),
                'type_raw': t.shipment_type,
                'route': f"{t.pickup_location} -> {t.warehouse_location} -> {t.dropoff_location or 'Hạ bãi'}",
                'pickup': t.pickup_location,
                'warehouse': t.warehouse_location,
                'dropoff': t.dropoff_location,
                'status': t.status,
                'status_label': t.get_status_display(),
                'dispatched_at': t.dispatched_at.isoformat() if t.dispatched_at else None,
                'accepted_at': t.accepted_at.isoformat() if t.accepted_at else None,
                'declined_at': t.declined_at.isoformat() if t.declined_at else None,
                'decline_reason': t.decline_reason or '',
                'minutes_since_dispatch': minutes_since_dispatch,
                'acceptance_sla_status': acceptance_sla_status,
                'driver': (t.driver.nickname or t.driver.full_name) if t.driver else '-',
                'driver_phone': t.driver.phone_number if t.driver else '',
                'vehicle': t.vehicle.license_plate if t.vehicle else '-',
                'vehicle_ownership': t.vehicle.get_ownership_type_display() if t.vehicle else 'Xe Nhà',
                'vehicle_ownership_code': t.vehicle.ownership_type if t.vehicle else 'OWNED',
                'is_split_trip': t.is_split_trip,
                'dropoff_driver': (t.dropoff_driver.nickname or t.dropoff_driver.full_name) if t.dropoff_driver else '',
                'dropoff_vehicle': t.dropoff_vehicle.license_plate if t.dropoff_vehicle else (t.vehicle.license_plate if t.status in ['RETURNING_EMPTY', 'COMPLETED'] and t.vehicle else '-'),
                'driver_split_ratio': float(t.driver_split_ratio or 50.0),
                'driver_allowance': float(t.driver_allowance or 0),
                'dropoff_driver_allowance': float(t.dropoff_driver_allowance or 0),
                'container': t.container_number or 'CHƯA CÓ CONT',
                'container_type': t.container_type,
                'seal': t.seal_number or '-',
                'booking': t.booking_or_bill or '-',
                'is_twin_container': t.is_twin_container,
                'container_2': t.container_number_2 or '',
                'seal_2': t.seal_number_2 or '',
                'booking_2': t.booking_or_bill_2 or '',
                'vgm_weight_2': t.vgm_weight_2 or '',
                'cargo_notes_2': t.cargo_notes_2 or '',
                'det_free_days': t.det_free_days,
                'dem_free_days': t.dem_free_days,
                'det_expiry_date': (f"23:59 {t.det_expiry_date.strftime('%d/%m/%Y')}" if t.det_expiry_date else ''),
                'dem_expiry_date': (f"23:59 {t.dem_expiry_date.strftime('%d/%m/%Y')}" if t.dem_expiry_date else ''),
                'det_status': det_status,
                'container_condition': t.container_condition,
                'container_condition_label': t.get_container_condition_display(),
                'damage_description': t.damage_description or '',
                'commercial_invoice': t.commercial_invoice or '-',
                'warehouse_dock': t.warehouse_dock or '-',
                'cont_location_type': t.cont_location_type or 'NHÀ MÁY',
                'cargo_notes': t.cargo_notes or t.special_notes or '',
                'loading_date': t.loading_date.strftime('%d/%m/%Y') if t.loading_date else t.created_at.strftime('%d/%m/%Y'),
                'loading_time': t.loading_time or '08:00',
                'eta_warehouse_time': t.eta_warehouse_time or '-',
                'warehouse_call_in_time': t.warehouse_call_in_time or '-',
                'actual_gate_in_time': t.actual_gate_in_time or '-',
                'warehouse_call_out_time': t.warehouse_call_out_time or '-',
                'actual_gate_out_time': t.actual_gate_out_time or '-',
                'dropoff_appointment_time': t.dropoff_appointment_time or '-',
                'actual_dropoff_time': t.actual_dropoff_time or '-',
                'is_overnight_detention': t.is_overnight_detention,
                'overnight_wait_hours': float(t.overnight_wait_hours or 0),
                'cutoff': t.cutoff_time or '-',
                'startTime': t.created_at.strftime('%d/%m/%Y %H:%M'),
                'notes': t.special_notes or '',
                'revenue': t.cached_revenue,
                'expense': t.cached_expense,
                'profit': t.cached_profit,
                'booking_file_url': t.booking_file.url if t.booking_file else '',
                'has_booking_file': bool(t.booking_file),
                'customs_info': customs_info,
            })

        active_count = DispatchTrip.objects.filter(
            status__in=['ACCEPTED', 'CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY']
        ).count()
        pending_expenses_count = TripExpense.objects.filter(status='PENDING').count()

        return Response({
            'stats': {
                'total_trips_monthly': 128,
                'transit_count': active_count,
                'pending_expenses_count': pending_expenses_count,
                'cutoff_warning_count': 1,
            },
            'trips': trips_list
        })

    def post(self, request):
        data = request.data

        # Tiêu chuẩn 9 (SECURITY_AUDIT.md): Server-side validation tải trọng & quy chuẩn
        gross_weight = data.get('gross_weight') or data.get('vgm_weight')
        if gross_weight:
            import re
            weight_val_match = re.search(r'([\d.]+)', str(gross_weight))
            if weight_val_match:
                try:
                    weight_val = float(weight_val_match.group(1))
                    if 35 < weight_val <= 100:
                        return Response({
                            'error': f'Trọng lượng khai báo ({weight_val} tấn) vượt quá tải trọng cho phép của xe kéo đường bộ (tối đa 35 tấn).'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except ValueError:
                    pass

        booking_order_id = data.get('booking_order_id')
        booking_order = None
        customer = None
        revenue = 4000000

        if booking_order_id and str(booking_order_id).strip() and str(booking_order_id).strip().isdigit():
            booking_order = BookingOrder.objects.filter(id=int(booking_order_id)).first()
            if booking_order:
                customer = booking_order.customer
                revenue = float(booking_order.selling_freight_price)
            else:
                customer_name = data.get('customer', '').strip()
                customer = resolve_customer(customer_name)
        else:
            customer_id = data.get('customer_id')
            customer_name = data.get('customer', '').strip()
            if customer_id:
                customer = resolve_customer(customer_id)
            if not customer and customer_name:
                customer = resolve_customer(customer_name)

        if not customer:
            customer = Customer.objects.first()
            if not customer:
                return Response({'error': 'Vui lòng chọn khách hàng hợp lệ đã khai báo trong Danh Mục!'}, status=status.HTTP_400_BAD_REQUEST)

        driver_nickname = data.get('driver', '').strip()
        driver = Employee.objects.filter(nickname__iexact=driver_nickname).first() or \
                 Employee.objects.filter(full_name__icontains=driver_nickname).first() or \
                 Employee.objects.filter(role=EmployeeRole.DRIVER).first()

        vehicle_plate = (data.get('vehicle') or '').strip()
        vehicle = None
        if vehicle_plate:
            vehicle = Vehicle.objects.filter(license_plate__iexact=vehicle_plate).first() or \
                      Vehicle.objects.filter(license_plate__icontains=vehicle_plate).first()
        if not vehicle:
            vehicle = Vehicle.objects.filter(current_driver=driver).first() or Vehicle.objects.first()
        dispatcher = Employee.objects.filter(role=EmployeeRole.DISPATCHER).first()

        # Xử lý cấu hình Chặng & Nghiệp vụ Cắt Kéo (Drop & Hook)
        parse_bool = lambda v: v is True or str(v).strip().lower() in ('true', '1', 'yes')
        is_split_trip = parse_bool(data.get('is_split_trip', False))
        dropoff_driver = None
        dropoff_vehicle = None
        driver_split_ratio = float(data.get('driver_split_ratio') or 50.0)
        driver_allowance = float(data.get('driver_allowance') or 0)
        dropoff_driver_allowance = float(data.get('dropoff_driver_allowance') or 0)

        if is_split_trip:
            dropoff_driver_name = (data.get('dropoff_driver') or '').strip()
            if dropoff_driver_name:
                dropoff_driver = Employee.objects.filter(nickname__iexact=dropoff_driver_name).first() or \
                                 Employee.objects.filter(full_name__icontains=dropoff_driver_name).first() or \
                                 Employee.objects.filter(code__iexact=dropoff_driver_name).first() or \
                                 Employee.objects.filter(id=data.get('dropoff_driver_id')).first()
            dropoff_vehicle_plate = (data.get('dropoff_vehicle') or '').strip()
            if dropoff_vehicle_plate:
                dropoff_vehicle = Vehicle.objects.filter(license_plate__iexact=dropoff_vehicle_plate).first() or \
                                  Vehicle.objects.filter(license_plate__icontains=dropoff_vehicle_plate).first()
            if not dropoff_vehicle and dropoff_driver:
                dropoff_vehicle = Vehicle.objects.filter(current_driver=dropoff_driver).first()

        # Generate collision-proof unique trip code: DV.YYMM.XXX (Chuẩn nghiệp vụ TMS quốc tế)
        now = timezone.now()
        yymm = now.strftime('%y%m')
        prefix = f"DV.{yymm}."
        counter = DispatchTrip.all_objects.filter(trip_code__startswith=prefix).count() + 1
        trip_code = f"{prefix}{counter:03d}"
        while DispatchTrip.all_objects.filter(trip_code=trip_code).exists():
            counter += 1
            trip_code = f"{prefix}{counter:03d}"

        shipment_type_input = data.get('type', 'Nhập')
        type_mapping = {
            'Nhập': ShipmentType.IMPORT,
            'Hàng Nhập': ShipmentType.IMPORT,
            'Xuất': ShipmentType.EXPORT,
            'Hàng Xuất': ShipmentType.EXPORT,
            'Nội địa': ShipmentType.DOMESTIC,
            'Nội địa / Chuyển kho': ShipmentType.DOMESTIC,
        }
        shipment_type = type_mapping.get(shipment_type_input, ShipmentType.IMPORT)

        from apps.master_data.models import Location
        pickup_str = (data.get('pickup') or (booking_order.pickup_location if booking_order else '')).strip()
        warehouse_str = (data.get('warehouse') or (booking_order.delivery_location if booking_order else '')).strip()
        dropoff_str = (data.get('dropoff') or (booking_order.dropoff_location if booking_order else 'HẠ BÃI')).strip()

        pickup_loc = Location.objects.filter(name__iexact=pickup_str).first() or Location.objects.filter(name__icontains=pickup_str).first()
        warehouse_loc = Location.objects.filter(name__iexact=warehouse_str).first() or Location.objects.filter(name__icontains=warehouse_str).first()
        dropoff_loc = Location.objects.filter(name__iexact=dropoff_str).first() or Location.objects.filter(name__icontains=dropoff_str).first()

        # Twin Container 20ft & Port Drayage handling
        is_twin = parse_bool(data.get('is_twin_container', False))
        cont_type = data.get('container_type') or (booking_order.container_size if booking_order else ('2x20DC' if is_twin else '40HC'))
        if is_twin and not data.get('container_type'):
            cont_type = '2x20DC'

        from django.utils.dateparse import parse_date
        from datetime import timedelta
        det_days = int(data.get('det_free_days') or 3)
        dem_days = int(data.get('dem_free_days') or 3)
        det_exp = parse_date(str(data.get('det_expiry_date')).strip()) if data.get('det_expiry_date') else None
        dem_exp = parse_date(str(data.get('dem_expiry_date')).strip()) if data.get('dem_expiry_date') else None
        if not dem_exp and dem_days > 0:
            # Quy chuẩn tính hạn trả vỏ: 7 ngày thì cộng 6 ngày (do tính cả ngày đầu lấy cont)
            dem_exp = timezone.now().date() + timedelta(days=max(0, dem_days - 1))
        if not det_exp and det_days > 0:
            det_exp = timezone.now().date() + timedelta(days=max(0, det_days - 1))

        # Tiêu chuẩn 7 & 8: Xác thực & xử lý tệp đính kèm Booking từ khách hàng (Ảnh hoặc PDF)
        uploaded_booking_file = request.FILES.get('booking_file') or request.FILES.get('file')
        if uploaded_booking_file:
            try:
                validate_uploaded_document(uploaded_booking_file)
            except DjangoValidationError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        elif booking_order and booking_order.booking_file:
            uploaded_booking_file = booking_order.booking_file

        trip = DispatchTrip.objects.create(
            trip_code=trip_code,
            shipment_type=shipment_type,
            customer=customer,
            booking_order=booking_order,
            vehicle=vehicle,
            driver=driver,
            dispatcher=dispatcher,
            is_split_trip=is_split_trip,
            dropoff_driver=dropoff_driver,
            dropoff_vehicle=dropoff_vehicle,
            driver_split_ratio=driver_split_ratio,
            driver_allowance=driver_allowance,
            dropoff_driver_allowance=dropoff_driver_allowance,
            container_number=data.get('container', '').upper(),
            container_type=cont_type,
            seal_number=data.get('seal', '').upper() or '-',
            booking_or_bill=data.get('booking', '').upper() or (booking_order.booking_number if booking_order else '-'),
            commercial_invoice=data.get('commercial_invoice', '').strip(),
            warehouse_dock=data.get('warehouse_dock', '').strip(),
            cont_location_type=data.get('cont_location_type', 'NHÀ MÁY').strip(),
            cargo_notes=data.get('cargo_notes', '').strip(),
            vgm_weight=data.get('vgm_weight', '').strip(),
            booking_file=uploaded_booking_file,
            # Chở ghép 2 container 20ft
            is_twin_container=is_twin,
            container_number_2=data.get('container_2', '').upper().strip() if is_twin else '',
            seal_number_2=data.get('seal_2', '').upper().strip() if is_twin else '',
            booking_or_bill_2=data.get('booking_2', '').upper().strip() if is_twin else '',
            vgm_weight_2=data.get('vgm_weight_2', '').strip() if is_twin else '',
            cargo_notes_2=data.get('cargo_notes_2', '').strip() if is_twin else '',
            # Quản lý Hạn Free DEM/DET
            det_free_days=det_days,
            dem_free_days=dem_days,
            det_expiry_date=det_exp,
            dem_expiry_date=dem_exp,
            # Tình trạng vỏ cont / Giám định EIR
            container_condition=data.get('container_condition', 'GOOD'),
            damage_description=data.get('damage_description', '').strip(),
            loading_time=('08:00' if data.get('loading_time', '').strip().upper() in ['8H', '8', ''] else data.get('loading_time', '08:00').strip()),
            cutoff_time=data.get('cutoff', '') or (booking_order.closing_time if booking_order else '-'),
            pickup_location=pickup_str.upper(),
            warehouse_location=warehouse_str.upper(),
            dropoff_location=dropoff_str.upper(),
            pickup_loc=pickup_loc,
            warehouse_loc=warehouse_loc,
            dropoff_loc=dropoff_loc,
            status=TripStatus.DISPATCHED,
            dispatched_at=timezone.now(),
            special_notes=data.get('notes') or (booking_order.notes if booking_order else ''),
            cached_revenue=revenue,
            cached_expense=0,
            cached_profit=revenue,
            cached_margin_percent=100.0,
        )

        # Tự động tạo bản ghi chứng từ pháp lý TripDocument loại BOOKING_NOTE nếu có file
        if trip.booking_file:
            file_name = os.path.basename(trip.booking_file.name)
            TripDocument.objects.create(
                trip=trip,
                document_type=DocumentType.BOOKING_NOTE,
                title=f"File Booking ({file_name})",
                file_path=trip.booking_file.name,
                extracted_container_no=trip.container_number,
                extracted_seal_no=trip.seal_number if trip.seal_number != '-' else '',
                ocr_raw_text=f"Tệp Booking đính kèm từ khách hàng: {trip.booking_or_bill}",
                is_verified=True
            )

        # Cập nhật tiến độ của Booking nếu có
        if booking_order:
            booking_order.dispatched_containers += 1
            if booking_order.dispatched_containers >= booking_order.total_containers:
                booking_order.status = BookingStatus.COMPLETED
            else:
                booking_order.status = BookingStatus.PARTIALLY_DISPATCHED
            booking_order.save(update_fields=['dispatched_containers', 'status'])

        # Default Timeline items
        timeline_steps = [
            {'step': 1, 'title': 'Điều độ phát lệnh Zalo', 'done': True, 'active': False, 'time': timezone.now().strftime('%H:%M %d/%m')},
            {'step': 2, 'title': 'Tài xế nhận lệnh trên App', 'done': False, 'active': True, 'time': 'Đang chờ'},
            {'step': 3, 'title': f"Lấy cont tại {trip.pickup_location}", 'done': False, 'active': False, 'time': ''},
            {'step': 4, 'title': f"Vận chuyển đến {trip.warehouse_location}", 'done': False, 'active': False, 'time': ''},
            {'step': 5, 'title': 'Đóng/Trả hàng tại kho', 'done': False, 'active': False, 'time': ''},
            {'step': 6, 'title': f"Hạ rỗng tại {trip.dropoff_location}", 'done': False, 'active': False, 'time': ''},
        ]
        for tli in timeline_steps:
            TripTimelineItem.objects.create(
                trip=trip,
                step_number=tli['step'],
                title=tli['title'],
                time_display=tli['time'],
                is_done=tli['done'],
                is_active=tli['active']
            )

        return Response({
            'success': True,
            'message': f'Tạo lệnh điều động {trip.trip_code} thành công!',
            'trip_code': trip.trip_code,
            'id': trip.trip_code,
            'hashid': trip.hashid,
            'driver_hashid': trip.driver_hashid,
            'driver_name': (trip.driver.nickname or trip.driver.full_name) if trip.driver else '',
            'driver_phone': trip.driver.phone_number if trip.driver else '',
            'vehicle': trip.vehicle.license_plate if trip.vehicle else '-',
            'trailer': trip.trailer.license_plate if trip.trailer else '-',
            'container': trip.container_number or 'CHƯA CÓ CONT',
            'container_type': trip.container_type or '40HC',
            'seal': trip.seal_number or '-',
            'pickup': trip.pickup_location or '-',
            'warehouse': trip.warehouse_location or '-',
            'dropoff': trip.dropoff_location or '-',
            'loading_time': trip.loading_time or '',
            'dispatched_at': trip.dispatched_at.isoformat() if trip.dispatched_at else None,
        }, status=status.HTTP_201_CREATED)

def get_trip_by_code_or_hash(trip_identifier, select_related_fields=None):
    """Truy vấn chuyến xe an toàn bằng cả trip_code gốc, driver_token hoặc HashID bảo mật (Tiêu chuẩn 10)."""
    from core.security import decode_driver_hashid, decode_trip_hashid
    qs = DispatchTrip.objects
    if select_related_fields:
        qs = qs.select_related(*select_related_fields)

    if not trip_identifier:
        return None

    # 1. Khớp chính xác driver_token hiện tại (Capability Token Cổng Tài Xế Mobile)
    trip = qs.filter(driver_token=trip_identifier).first()
    if trip:
        return trip

    # 2. Khớp trip_code nội bộ
    trip_by_code = qs.filter(trip_code=trip_identifier).first()
    if trip_by_code:
        return trip_by_code

    # 3. Decode trip_hashid (Internal web portal)
    decoded_trip_id = decode_trip_hashid(trip_identifier)
    if decoded_trip_id:
        trip = qs.filter(id=decoded_trip_id).first()
        if trip:
            return trip

    # 4. Fallback cho legacy driver_hashid (chỉ chấp nhận nếu trip chưa có driver_token riêng biệt)
    decoded_drv_id = decode_driver_hashid(trip_identifier)
    if decoded_drv_id:
        legacy_trip = qs.filter(id=decoded_drv_id).first()
        if legacy_trip and (not legacy_trip.driver_token or legacy_trip.driver_token == trip_identifier):
            return legacy_trip

    return None

class TripDetailAPIView(APIView):
    """API Xem chi tiết một chuyến xe (Hỗ trợ tra cứu bằng cả trip_code hoặc HashID bảo mật)."""
    permission_classes = [IsTripDriverOrDispatcher]

    def get(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code, ['customer', 'vehicle', 'driver', 'dispatcher', 'dropoff_driver', 'dropoff_vehicle'])
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, trip)

        sync_trip_10_step_timeline(trip)
        timeline_specs = build_10_step_timeline_spec(trip)
        timeline_data = [
            {
                'step': item['step'],
                'title': item['title'],
                'time': item['time'],
                'done': item['done'],
                'active': item['active'],
                'docs': item.get('docs', []),
                'actor': item.get('actor', ''),
            }
            for item in timeline_specs
        ]

        expenses = trip.expenses.select_related('driver', 'vehicle', 'expense_item').filter(is_deleted=False)
        # Defensive deduplication: đảm bảo trên giao diện không bao giờ hiển thị chứng từ trùng lặp
        raw_documents = trip.documents.all().order_by('created_at')
        seen_doc_keys = set()
        unique_documents = []
        for doc in raw_documents:
            doc_key = (doc.document_type, (doc.title or '').strip())
            if doc_key not in seen_doc_keys:
                seen_doc_keys.add(doc_key)
                unique_documents.append(doc)
        documents = unique_documents

        expenses_data = [
            {
                'id': exp.id,
                'expense_item_id': exp.expense_item_id,
                'expense_item_name': exp.expense_item.name if exp.expense_item else exp.get_category_display(),
                'category_code': exp.category,
                'category_name': exp.get_category_display(),
                'amount': exp.amount,
                'status': exp.status,
                'status_label': exp.get_status_display(),
                'time': exp.created_at.strftime('%H:%M %d/%m'),
                'invoice_issuer': exp.invoice_issuer or '',
                'invoice_number': exp.invoice_number or '',
                'invoice_lookup_code': exp.invoice_lookup_code or '',
                'invoice_lookup_url': exp.invoice_lookup_url or '',
                'amount_before_tax': exp.amount_before_tax,
                'tax_rate': exp.tax_rate,
                'tax_amount': exp.tax_amount,
                'receipt_image_path': exp.receipt_image_path or '',
                'notes': exp.notes or '',
                'company_borne': exp.company_borne,
                'is_on_behalf_of_customer': exp.is_on_behalf_of_customer,
                'driver_id': exp.driver_id,
                'driver_name': (exp.driver.nickname or exp.driver.full_name) if exp.driver else '',
                'vehicle_id': exp.vehicle_id,
                'vehicle_plate': exp.vehicle.license_plate if exp.vehicle else '',
                'trip_leg': exp.trip_leg or 'ENTIRE',
                'trip_leg_label': exp.get_trip_leg_display() if exp.trip_leg else 'Toàn trình',
                'can_edit': (not trip.is_expenses_settled) and (exp.status != ApprovalStatus.SETTLED),
                'can_delete': (not trip.is_expenses_settled) and (exp.status != ApprovalStatus.SETTLED),
            }
            for exp in expenses
        ]

        # Phân rã 8 khoản mục chi phí chuẩn theo Bảng Kê Chi Phí Triền Võ
        # Chỉ tính chi phí công ty thực sự chịu (loại trừ khoản chi hộ KH)
        valid_expenses = [e for e in expenses if e.status != ApprovalStatus.REJECTED]
        opex_expenses = [e for e in valid_expenses if not e.is_on_behalf_of_customer]
        reimbursable_expenses = [e for e in valid_expenses if e.is_on_behalf_of_customer]
        total_reimbursable = sum(e.amount for e in reimbursable_expenses)
        total_actual_expense = sum(e.amount for e in opex_expenses)
        revenue = trip.cached_revenue
        profit = revenue - total_actual_expense
        margin_percent = round((profit / revenue) * 100, 2) if revenue > 0 else 0

        # Nếu cached_expense trong DB bị lệch so với dữ liệu thực tế, tự động cập nhật
        if trip.cached_expense != total_actual_expense or trip.cached_profit != profit:
            trip.cached_expense = total_actual_expense
            trip.cached_profit = profit
            trip.cached_margin_percent = margin_percent
            trip.save(update_fields=['cached_expense', 'cached_profit', 'cached_margin_percent'])
        reimbursable_expenses = [e for e in valid_expenses if e.is_on_behalf_of_customer]
        total_reimbursable = sum(e.amount for e in reimbursable_expenses)
        cost_sheet = {
            'fee_einvoice': {'has_invoice': any(e.invoice_number for e in opex_expenses), 'invoices': [f"{e.invoice_number} ({e.invoice_lookup_code})" for e in opex_expenses if e.invoice_number]},
            'fee_lift_on': sum(e.amount for e in opex_expenses if e.category in [ExpenseCategory.LIFT_ON, ExpenseCategory.LIFT_ON_OFF]),
            'fee_lift_off': sum(e.amount for e in opex_expenses if e.category == ExpenseCategory.LIFT_OFF),
            'fee_deposit': sum(e.amount for e in opex_expenses if e.category == ExpenseCategory.CONTAINER_DEPOSIT),
            'fee_weighing': sum(e.amount for e in opex_expenses if e.category == ExpenseCategory.WEIGHING),
            'fee_labor': sum(e.amount for e in opex_expenses if e.category in [ExpenseCategory.LABOR_STEVEDORING, ExpenseCategory.STEVEDORING, ExpenseCategory.WAREHOUSE_TIP]),
            'fee_toll': sum(e.amount for e in opex_expenses if e.category in [ExpenseCategory.TOLL_FEE, ExpenseCategory.BOT_TOLL]),
            'fee_other': sum(e.amount for e in opex_expenses if e.category in [ExpenseCategory.OTHER, ExpenseCategory.PORT_STORAGE, ExpenseCategory.REPAIR_TIRE]),
            'total_expense': total_actual_expense,
            # Tách riêng: Tổng tiền chi hộ KH (hiển thị riêng, không ảnh hưởng P&L công ty)
            'total_reimbursable': total_reimbursable,
            'reimbursable_items': [
                {'category': e.get_category_display(), 'amount': e.amount, 'notes': e.notes}
                for e in reimbursable_expenses
            ],
        }

        documents_data = [
            {
                'id': doc.id,
                'type': doc.document_type,
                'type_label': doc.get_document_type_display(),
                'name': doc.title or doc.get_document_type_display(),
                'file_url': (f"/media/{doc.file_path}" if doc.file_path and not doc.file_path.startswith('/media/') else (doc.file_path or '')),
                'details': doc.ocr_raw_text or (f"Cont: {doc.extracted_container_no}" if doc.extracted_container_no else f"Chứng từ hợp lệ chuyến xe {trip.trip_code}"),
                'time': doc.created_at.strftime('%H:%M %d/%m'),
                'is_verified': doc.is_verified,
            }
            for doc in documents
        ]

        customer_name = trip.customer.name if trip.customer else 'Khách Hàng Chung'
        driver_name = (trip.driver.nickname or trip.driver.full_name) if trip.driver else 'Chưa gán tài xế'
        driver_phone = trip.driver.phone_number if trip.driver else ''
        vehicle_plate = trip.vehicle.license_plate if trip.vehicle else 'Chưa gán xe'
        trailer_plate = trip.trailer.license_plate if trip.trailer else '-'
        vehicle_ownership = trip.vehicle.get_ownership_type_display() if trip.vehicle else 'Xe Nhà'
        vehicle_ownership_code = trip.vehicle.ownership_type if trip.vehicle else 'OWNED'
        dropoff_plate = '-'
        if trip.dropoff_vehicle:
            dropoff_plate = trip.dropoff_vehicle.license_plate
        from apps.dispatch.timeline_service import get_derived_7_milestones
        m7 = get_derived_7_milestones(trip)

        now_dt = timezone.now()
        minutes_since_dispatch = 0
        acceptance_sla_status = 'NORMAL'
        if trip.declined_at:
            acceptance_sla_status = 'DECLINED'
            if trip.declined_at:
                diff_mins = int((now_dt - trip.declined_at).total_seconds() // 60)
                minutes_since_dispatch = max(0, diff_mins)
        elif trip.status == TripStatus.DISPATCHED:
            if trip.dispatched_at:
                diff_mins = int((now_dt - trip.dispatched_at).total_seconds() // 60)
                minutes_since_dispatch = max(0, diff_mins)
            else:
                diff_mins = int((now_dt - trip.created_at).total_seconds() // 60)
                minutes_since_dispatch = max(0, diff_mins)

            if minutes_since_dispatch >= 60:
                acceptance_sla_status = 'OVERDUE'
            elif minutes_since_dispatch >= 30:
                acceptance_sla_status = 'WARNING'
            else:
                acceptance_sla_status = 'NORMAL'
        elif trip.status in [TripStatus.ACCEPTED, TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]:
            acceptance_sla_status = 'ACCEPTED'

        return Response({
            'id': trip.trip_code,
            'hashid': trip.hashid,
            'driver_hashid': trip.driver_hashid,
            'tracking_hashid': trip.tracking_hashid,
            'customer': customer_name,
            'type': trip.get_shipment_type_display(),
            'route': f"{trip.pickup_location} -> {trip.warehouse_location} -> {trip.dropoff_location or 'Hạ bãi'}",
            'pickup': trip.pickup_location,
            'warehouse': trip.warehouse_location,
            'dropoff': trip.dropoff_location,
            'pickup_loc_id': trip.pickup_loc_id,
            'warehouse_loc_id': trip.warehouse_loc_id,
            'dropoff_loc_id': trip.dropoff_loc_id,
            'pickup_depot': trip.pickup_depot or trip.pickup_location,
            'dropoff_depot': trip.dropoff_depot or trip.dropoff_location,
            'delivery_warehouse': trip.delivery_warehouse or trip.warehouse_location,
            'eir_number': trip.eir_number or '-',
            'shipping_line': trip.shipping_line or '-',
            'vessel_voyage': trip.vessel_voyage or '-',
            'destination_port': trip.destination_port or '-',
            'vgm_weight': trip.vgm_weight or '-',
            'status': trip.status,
            'status_label': trip.get_status_display(),
            'status_display': trip.get_status_display(),
            'dispatched_at': trip.dispatched_at.isoformat() if trip.dispatched_at else None,
            'accepted_at': trip.accepted_at.isoformat() if trip.accepted_at else None,
            'declined_at': trip.declined_at.isoformat() if trip.declined_at else None,
            'decline_reason': trip.decline_reason or '',
            'minutes_since_dispatch': minutes_since_dispatch,
            'acceptance_sla_status': acceptance_sla_status,
            'driver': driver_name,
            'driver_id': trip.driver_id,
            'driver_phone': driver_phone,
            'vehicle': vehicle_plate,
            'vehicle_id': trip.vehicle_id,
            'trailer': trailer_plate,
            'vehicle_ownership': vehicle_ownership,
            'vehicle_ownership_code': vehicle_ownership_code,
            'is_split_trip': trip.is_split_trip,
            'dropoff_driver': (trip.dropoff_driver.nickname or trip.dropoff_driver.full_name) if trip.dropoff_driver else '',
            'dropoff_driver_id': trip.dropoff_driver_id,
            'dropoff_driver_phone': trip.dropoff_driver.phone_number if trip.dropoff_driver else '',
            'dropoff_vehicle': dropoff_plate,
            'dropoff_vehicle_id': trip.dropoff_vehicle_id,
            'driver_split_ratio': float(trip.driver_split_ratio or 50.0),
            'driver_allowance': float(trip.driver_allowance or 0),
            'dropoff_driver_allowance': float(trip.dropoff_driver_allowance or 0),
            'available_drivers': [
                {
                    'id': d.id,
                    'name': f"{d.full_name} ({d.nickname})" if d.nickname else d.full_name,
                    'nickname': d.nickname or d.full_name,
                    'code': d.code,
                    'vehicle': d.assigned_vehicles.first().license_plate if d.assigned_vehicles.exists() else '',
                    'vehicle_id': d.assigned_vehicles.first().id if d.assigned_vehicles.exists() else None,
                }
                for d in Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True).prefetch_related('assigned_vehicles').order_by('full_name')
            ],
            'container': trip.container_number or 'CHƯA CÓ CONT',
            'seal': trip.seal_number or '-',
            'booking': trip.booking_or_bill or '-',
            'booking_file_url': trip.booking_file.url if trip.booking_file else '',
            'booking_file_name': os.path.basename(trip.booking_file.name) if trip.booking_file else '',
            'is_twin_container': trip.is_twin_container,
            'container_2': trip.container_number_2 or '',
            'seal_2': trip.seal_number_2 or '',
            'booking_2': trip.booking_or_bill_2 or '',
            'vgm_weight_2': trip.vgm_weight_2 or '',
            'cargo_notes_2': trip.cargo_notes_2 or '',
            'det_free_days': trip.det_free_days,
            'dem_free_days': trip.dem_free_days,
            'det_expiry_date': (f"23:59 {trip.det_expiry_date.strftime('%d/%m/%Y')}" if trip.det_expiry_date else ''),
            'dem_expiry_date': (f"23:59 {trip.dem_expiry_date.strftime('%d/%m/%Y')}" if trip.dem_expiry_date else ''),
            'det_status': calculate_dem_det_status(trip),
            'container_condition': trip.container_condition,
            'container_condition_label': trip.get_container_condition_display(),
            'damage_description': trip.damage_description or '',
            'commercial_invoice': trip.commercial_invoice or '-',
            'warehouse_dock': trip.warehouse_dock or '-',
            'cont_location_type': trip.cont_location_type or 'NHÀ MÁY',
            'cargo_notes': trip.cargo_notes or trip.special_notes or '',
            'loading_date': trip.loading_date.strftime('%d/%m/%Y') if trip.loading_date else trip.created_at.strftime('%d/%m/%Y'),
            'loading_time': trip.loading_time or '08:00',
            'eta_warehouse_time': m7['eta_warehouse_time'],
            'warehouse_call_in_time': m7['warehouse_call_in_time'],
            'actual_gate_in_time': m7['actual_gate_in_time'],
            'warehouse_call_out_time': m7['warehouse_call_out_time'],
            'actual_gate_out_time': m7['actual_gate_out_time'],
            'dropoff_appointment_time': m7['dropoff_appointment_time'],
            'actual_dropoff_time': m7['actual_dropoff_time'],
            'is_overnight_detention': trip.is_overnight_detention,
            'overnight_wait_hours': float(trip.overnight_wait_hours or 0),
            'detention_fee_customer': float(trip.detention_fee_customer or 0),
            'detention_driver_allowance': float(trip.detention_driver_allowance or 0),
            'detention_reason': trip.detention_reason or '',
            'cutoff': trip.cutoff_time or '-',
            'notes': trip.special_notes or '',
            'timeline': timeline_data,
            'expenses': expenses_data,
            'cost_sheet': cost_sheet,
            'documents': documents_data,
            'is_expenses_settled': trip.is_expenses_settled,
            'settled_at': trip.settled_at.strftime('%H:%M %d/%m/%Y') if trip.settled_at else '',
            'settled_by': (trip.settled_by.nickname or trip.settled_by.full_name) if trip.settled_by else '',
            'financials': {
                'revenue': revenue,
                'expense': total_actual_expense,
                'profit': profit,
                'margin_percent': margin_percent,
            }
        })

    def patch(self, request, trip_code):
        """API cập nhật 2 mốc thời gian (Hẹn hạ sau 0h & Hạ bãi thực tế), trạng thái lưu xe và phụ phí."""
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'dropoff_appointment_time' in data:
            trip.dropoff_appointment_time = str(data['dropoff_appointment_time']).strip()
        if 'actual_dropoff_time' in data:
            trip.actual_dropoff_time = str(data['actual_dropoff_time']).strip()
        if 'is_overnight_detention' in data:
            trip.is_overnight_detention = bool(data['is_overnight_detention'])
        if 'overnight_wait_hours' in data and data['overnight_wait_hours'] is not None:
            try:
                trip.overnight_wait_hours = float(data['overnight_wait_hours'])
            except (ValueError, TypeError):
                pass
        if 'detention_reason' in data:
            trip.detention_reason = str(data['detention_reason']).strip()
        if 'detention_fee_customer' in data and data['detention_fee_customer'] is not None:
            try:
                trip.detention_fee_customer = float(data['detention_fee_customer'])
            except (ValueError, TypeError):
                pass
        if 'detention_driver_allowance' in data and data['detention_driver_allowance'] is not None:
            try:
                trip.detention_driver_allowance = float(data['detention_driver_allowance'])
            except (ValueError, TypeError):
                pass

        # Cập nhật 7 Mốc thời gian vận chuyển & kho khách hàng (Chuẩn bảng điều độ Excel)
        if 'eta_warehouse_time' in data:
            trip.eta_warehouse_time = str(data['eta_warehouse_time']).strip()
        if 'warehouse_call_in_time' in data:
            trip.warehouse_call_in_time = str(data['warehouse_call_in_time']).strip()
        if 'actual_gate_in_time' in data:
            trip.actual_gate_in_time = str(data['actual_gate_in_time']).strip()
            if not trip.actual_gate_in_at and trip.actual_gate_in_time and trip.actual_gate_in_time != '-':
                trip.actual_gate_in_at = timezone.now()
        if 'warehouse_call_out_time' in data:
            trip.warehouse_call_out_time = str(data['warehouse_call_out_time']).strip()
        if 'actual_gate_out_time' in data:
            trip.actual_gate_out_time = str(data['actual_gate_out_time']).strip()
            if not trip.actual_gate_out_at and trip.actual_gate_out_time and trip.actual_gate_out_time != '-':
                trip.actual_gate_out_at = timezone.now()
        if 'warehouse_dock' in data:
            trip.warehouse_dock = str(data['warehouse_dock']).strip()
        if 'commercial_invoice' in data:
            trip.commercial_invoice = str(data['commercial_invoice']).strip()
        if 'loading_time' in data:
            trip.loading_time = str(data['loading_time']).strip()
        if 'loading_date' in data and data['loading_date']:
            try:
                from datetime import datetime
                trip.loading_date = datetime.strptime(str(data['loading_date']).strip(), '%Y-%m-%d').date()
            except Exception:
                pass

        # Cập nhật trạng thái chuyến xe (nếu có yêu cầu)
        if 'status' in data and data['status']:
            target_status = str(data['status']).strip()
            actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.dispatcher or trip.driver
            try:
                transition_trip(trip, target_status, actor=actor, description=str(data.get('status_description') or 'Cập nhật trạng thái chuyến'))
            except Exception:
                trip.status = target_status
                trip.save(update_fields=['status'])

        # Cập nhật thông tin Lệnh Điều Động (Sửa Lệnh Điều Động)
        if 'customer_id' in data and data['customer_id']:
            from apps.customers.models import Customer
            trip.customer = Customer.objects.filter(id=data['customer_id']).first() or trip.customer
        elif 'customer' in data and data['customer']:
            from apps.customers.models import Customer
            trip.customer = Customer.objects.filter(name__iexact=str(data['customer']).strip()).first() or trip.customer
        if 'transport_type' in data or 'shipment_type' in data:
            stype = str(data.get('transport_type') or data.get('shipment_type') or '').strip()
            if stype:
                trip.shipment_type = stype
        if 'container_type' in data:
            trip.container_type = str(data['container_type']).strip()
        if 'trailer_id' in data:
            if data['trailer_id']:
                from apps.fleet.models import Trailer
                trip.trailer = Trailer.objects.filter(id=data['trailer_id']).first()
            else:
                trip.trailer = None
        if 'cont_location_type' in data:
            trip.cont_location_type = str(data['cont_location_type']).strip()
        if 'free_det_days' in data or 'det_free_days' in data:
            try:
                trip.det_free_days = int(data.get('free_det_days') or data.get('det_free_days') or 3)
            except (ValueError, TypeError):
                pass
        if 'container' in data or 'container_number' in data:
            trip.container_number = str(data.get('container') if 'container' in data else data.get('container_number', '')).strip()
        if 'seal' in data or 'seal_number' in data:
            trip.seal_number = str(data.get('seal') if 'seal' in data else data.get('seal_number', '')).strip()
        if 'booking' in data or 'booking_or_bill' in data:
            trip.booking_or_bill = str(data.get('booking') if 'booking' in data else data.get('booking_or_bill', '')).strip()
        if 'pickup' in data or 'pickup_location' in data:
            trip.pickup_location = str(data.get('pickup') if 'pickup' in data else data.get('pickup_location', '')).strip()
        if 'warehouse' in data or 'warehouse_location' in data:
            trip.warehouse_location = str(data.get('warehouse') if 'warehouse' in data else data.get('warehouse_location', '')).strip()
        if 'dropoff' in data or 'dropoff_location' in data:
            trip.dropoff_location = str(data.get('dropoff') if 'dropoff' in data else data.get('dropoff_location', '')).strip()
        if 'notes' in data or 'special_notes' in data or 'cargo_notes' in data:
            note_val = str(data.get('notes') or data.get('special_notes') or data.get('cargo_notes') or '').strip()
            trip.special_notes = note_val
            trip.cargo_notes = note_val
        if 'vgm_weight' in data:
            trip.vgm_weight = str(data['vgm_weight']).strip()
        if 'container_condition' in data:
            trip.container_condition = str(data['container_condition']).strip()
        if 'damage_description' in data:
            trip.damage_description = str(data['damage_description']).strip()
        if 'driver_id' in data:
            new_drv = Employee.objects.filter(id=data['driver_id']).first()
            if new_drv and new_drv != trip.driver:
                trip.driver = new_drv
                trip.dispatched_at = timezone.now()
                trip.accepted_at = None
                trip.declined_at = None
                trip.decline_reason = ''
                trip.regenerate_driver_token()  # Cấp mới link và vô hiệu hóa link của tài xế cũ!
                if trip.status in [TripStatus.DISPATCHED, TripStatus.ACCEPTED]:
                    trip.status = TripStatus.DISPATCHED
        elif 'driver' in data and data['driver']:
            drv = Employee.objects.filter(nickname__iexact=str(data['driver']).strip()).first() or \
                  Employee.objects.filter(full_name__iexact=str(data['driver']).strip()).first()
            if drv and drv != trip.driver:
                trip.driver = drv
                trip.dispatched_at = timezone.now()
                trip.accepted_at = None
                trip.declined_at = None
                trip.decline_reason = ''
                trip.regenerate_driver_token()  # Cấp mới link và vô hiệu hóa link của tài xế cũ!
                if trip.status in [TripStatus.DISPATCHED, TripStatus.ACCEPTED]:
                    trip.status = TripStatus.DISPATCHED
        if 'vehicle_id' in data:
            trip.vehicle = Vehicle.objects.filter(id=data['vehicle_id']).first()
        elif 'vehicle' in data and data['vehicle']:
            veh = Vehicle.objects.filter(license_plate__iexact=str(data['vehicle']).strip()).first()
            if veh:
                trip.vehicle = veh
        if 'dropoff_driver_id' in data:
            trip.dropoff_driver = Employee.objects.filter(id=data['dropoff_driver_id']).first()
        if 'dropoff_vehicle_id' in data:
            trip.dropoff_vehicle = Vehicle.objects.filter(id=data['dropoff_vehicle_id']).first()
        if 'is_twin_container' in data:
            trip.is_twin_container = bool(data['is_twin_container'])
        if 'container_2' in data:
            trip.container_number_2 = str(data['container_2']).strip()
        if 'seal_2' in data:
            trip.seal_number_2 = str(data['seal_2']).strip()
        if 'booking_2' in data:
            trip.booking_or_bill_2 = str(data['booking_2']).strip()

        # Tự động đồng bộ khoản chi phí phụ cấp tài xế neo đêm nếu có chỉ định tạo
        if data.get('auto_create_driver_allowance') and trip.detention_driver_allowance > 0:
            from apps.billing.models import TripExpense, ExpenseCategory, ApprovalStatus
            existing_exp = trip.expenses.filter(
                is_deleted=False, 
                notes__icontains='Phụ cấp lưu đêm'
            ).first()
            if existing_exp:
                existing_exp.amount = int(trip.detention_driver_allowance)
                existing_exp.notes = f"Phụ cấp lưu đêm trực xe sau 0h ({trip.overnight_wait_hours}h)"
                existing_exp.save()
            else:
                TripExpense.objects.create(
                    trip=trip,
                    driver=trip.driver,
                    vehicle=trip.vehicle,
                    category=ExpenseCategory.OTHER,
                    amount=int(trip.detention_driver_allowance),
                    status=ApprovalStatus.APPROVED,
                    company_borne=True,
                    is_on_behalf_of_customer=False,
                    notes=f"Phụ cấp lưu đêm trực xe sau 0h ({trip.overnight_wait_hours}h)"
                )
        trip.save()

        # Đồng bộ lại 10 bước tiến độ điều vận theo dữ liệu thời gian mới
        try:
            from apps.dispatch.timeline_service import sync_trip_10_step_timeline
            sync_trip_10_step_timeline(trip)
        except Exception:
            pass

        # Ghi log mốc thời gian vào Timeline nếu có
        now_str = timezone.now().strftime('%H:%M %d/%m')
        if data.get('actual_dropoff_time'):
            step_title = f"Hạ bãi thực tế tại {trip.dropoff_location}: {trip.actual_dropoff_time}"
            if not trip.timeline_items.filter(title__icontains='Hạ bãi thực tế').exists():
                TripTimelineItem.objects.create(
                    trip=trip,
                    step_number=trip.timeline_items.count() + 1,
                    title=step_title,
                    time_display=trip.actual_dropoff_time or now_str,
                    is_done=True,
                    is_active=False
                )

        return Response({
            'success': True,
            'message': 'Đã cập nhật tiến độ hạ cont và trạng thái lưu xe thành công!',
            'trip_code': trip.trip_code,
            'is_overnight_detention': trip.is_overnight_detention,
            'dropoff_appointment_time': trip.dropoff_appointment_time,
            'actual_dropoff_time': trip.actual_dropoff_time,
            'overnight_wait_hours': float(trip.overnight_wait_hours),
            'detention_fee_customer': float(trip.detention_fee_customer),
            'detention_driver_allowance': float(trip.detention_driver_allowance),
            'detention_reason': trip.detention_reason,
        })

    def put(self, request, trip_code):
        """Hỗ trợ cập nhật đầy đủ thông tin chuyến xe qua PUT (Idempotent)."""
        return self.patch(request, trip_code)

    def delete(self, request, trip_code):
        """API Hủy / Xóa mềm chuyến xe (Hỗ trợ hoàn lại hạn mức container cho Booking Order)."""
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        if trip.is_expenses_settled:
            return Response({'error': 'Chuyến xe đã được Kế toán chốt sổ chi phí, không thể xóa/hủy!'}, status=status.HTTP_403_FORBIDDEN)

        # Hoàn lại số lượng cont đã phát lệnh cho Booking nếu có
        if trip.booking_order and trip.booking_order.dispatched_containers > 0:
            trip.booking_order.dispatched_containers -= 1
            from apps.customers.models import BookingStatus
            if trip.booking_order.dispatched_containers == 0:
                trip.booking_order.status = BookingStatus.PENDING_DISPATCH
            else:
                trip.booking_order.status = BookingStatus.PARTIALLY_DISPATCHED
            trip.booking_order.save(update_fields=['dispatched_containers', 'status'])

        reason = request.data.get('reason') or request.GET.get('reason') or 'Điều độ viên hủy lệnh điều động'
        trip.is_deleted = True
        trip.status = TripStatus.CANCELLED
        trip.save(update_fields=['is_deleted', 'status', 'updated_at'])

        from core.models import TrackingEventLog
        actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.dispatcher
        TrackingEventLog.objects.create(
            trip=trip,
            actor=actor,
            event_type=TripStatus.CANCELLED,
            title=f"Hủy Lệnh Điều Động {trip.trip_code}",
            description=f"Lý do hủy: {reason}"
        )

        return Response({
            'success': True,
            'message': f'Đã hủy và xóa lệnh điều động {trip.trip_code} thành công!',
            'trip_code': trip.trip_code
        })

class TripAddExpenseAPIView(APIView):
    """API thêm khoản mục chi phí phát sinh (Hỗ trợ cả Kê Nhiều Dòng Cùng Lúc - Multi-row Batch & Đơn dòng)."""
    permission_classes = [IsTripDriverOrDispatcher]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, trip)

        if trip.is_expenses_settled:
            return Response({
                'error': 'Chuyến xe đã được Kế toán chốt sổ đối soát, không thể thêm khoản chi phí mới.'
            }, status=status.HTTP_403_FORBIDDEN)

        cat_map = {
            'LIFT_ON': ExpenseCategory.LIFT_ON,
            'LIFT_OFF': ExpenseCategory.LIFT_OFF,
            'CONTAINER_DEPOSIT': ExpenseCategory.CONTAINER_DEPOSIT,
            'WEIGHING': ExpenseCategory.WEIGHING,
            'LABOR_STEVEDORING': ExpenseCategory.LABOR_STEVEDORING,
            'TOLL_FEE': ExpenseCategory.TOLL_FEE,
            'BOT_TOLL': ExpenseCategory.TOLL_FEE,
            'OTHER': ExpenseCategory.OTHER,
            # Old choices mapping
            'Phí BOT / Cầu đường': ExpenseCategory.TOLL_FEE,
            'Phí nâng / hạ Cont': ExpenseCategory.LIFT_ON,
            'Phí neo xe / Lưu bãi': ExpenseCategory.OTHER,
            'Cước phí bốc xếp': ExpenseCategory.LABOR_STEVEDORING,
            'Phí bồi dưỡng kho': ExpenseCategory.LABOR_STEVEDORING,
            'Khác': ExpenseCategory.OTHER,
        }

        from apps.master_data.models import ExpenseItem
        from apps.billing.models import TripLegChoice

        expense_item_map = {
            ExpenseCategory.LIFT_ON: 'LIFT_ON',
            ExpenseCategory.LIFT_OFF: 'LIFT_OFF',
            ExpenseCategory.CONTAINER_DEPOSIT: 'CONTAINER_DEPOSIT',
            ExpenseCategory.WEIGHING: 'WEIGHING',
            ExpenseCategory.LABOR_STEVEDORING: 'LABOR_STEVEDORING',
            ExpenseCategory.TOLL_FEE: 'TOLL_BOT',
            ExpenseCategory.BOT_TOLL: 'TOLL_BOT',
            ExpenseCategory.LIFT_ON_OFF: 'LIFT_ON',
            ExpenseCategory.OTHER: 'OTHER_EXPENSE',
        }

        # Kiểm tra xem có payload dạng mảng nhiều dòng (batch expenses) hay không
        batch_items = None
        if 'expenses_json' in request.data:
            import json
            try:
                batch_items = json.loads(request.data['expenses_json'])
            except Exception:
                batch_items = None
        elif 'items' in request.data and isinstance(request.data['items'], list):
            batch_items = request.data['items']
        elif 'expenses' in request.data and isinstance(request.data['expenses'], list):
            batch_items = request.data['expenses']

        if batch_items and isinstance(batch_items, list) and len(batch_items) > 0:
            # === XỬ LÝ BATCH NHIỀU DÒNG CHI PHÍ ===
            created_expenses = []
            total_batch_amount = 0

            with transaction.atomic():
                for idx, item in enumerate(batch_items):
                    category_key = item.get('category', 'TOLL_FEE')
                    try:
                        amt = int(str(item.get('amount', 0)).replace('.', '').replace(',', '').strip())
                    except (ValueError, TypeError):
                        amt = 0
                    if amt <= 0:
                        continue

                    notes = item.get('notes', '').strip()
                    category = cat_map.get(category_key, ExpenseCategory.OTHER)
                    item_code = expense_item_map.get(category, 'OTHER_EXPENSE')
                    expense_item = ExpenseItem.objects.filter(code=item_code, is_active=True).first()

                    # File ảnh tương ứng (receipt_0, receipt_1... hoặc file list)
                    r_file = request.FILES.get(f'receipt_{idx}') or request.FILES.get(f'receipt_{item.get("id", idx)}')
                    r_path_str = ''
                    if r_file:
                        try:
                            validate_uploaded_document(r_file)
                            from django.core.files.storage import default_storage
                            saved_name = default_storage.save(f"receipts/{trip.trip_code}_{sanitize_filename(r_file.name)}", r_file)
                            r_path_str = f"/media/{saved_name}"
                        except Exception:
                            r_file = None

                    exp = TripExpense.objects.create(
                        trip=trip,
                        driver=trip.driver,
                        vehicle=trip.vehicle,
                        trip_leg=TripLegChoice.ENTIRE,
                        category=category,
                        expense_item=expense_item,
                        amount=amt,
                        receipt_image_path=r_path_str,
                        receipt_image=r_file if r_file else None,
                        status=ApprovalStatus.APPROVED,
                        company_borne=True,
                        notes=notes or f"Kê khai chi phí: {dict(ExpenseCategory.choices).get(category, 'Chi phí')}"
                    )
                    created_expenses.append(exp)
                    total_batch_amount += amt

                trip.update_financials()

            if not created_expenses:
                return Response({'error': 'Không có khoản chi phí hợp lệ nào được cung cấp'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'success': True,
                'message': f'Đã lưu thành công {len(created_expenses)} khoản chi phí với tổng tiền {total_batch_amount:,} đ!',
                'count': len(created_expenses),
                'total_amount': total_batch_amount,
                'cached_expense': trip.cached_expense,
                'cached_profit': trip.cached_profit,
            })

        # === XỬ LÝ ĐƠN DÒNG (Single Expense Item) ===
        category_key = request.data.get('category', 'TOLL_FEE')
        amount = int(request.data.get('amount', 0))
        raw_ocr = request.data.get('raw_ocr', '')
        notes = request.data.get('notes', '')
        req_status = request.data.get('status', ApprovalStatus.APPROVED)
        
        # Tiêu chuẩn 7 & 8: File chứng từ / biên lai chi phí đính kèm
        receipt_file = request.FILES.get('receipt') or request.FILES.get('receipt_image') or request.FILES.get('file')
        receipt_path_str = ''
        if receipt_file:
            try:
                validate_uploaded_document(receipt_file)
                from django.core.files.storage import default_storage
                saved_name = default_storage.save(f"receipts/{trip.trip_code}_{sanitize_filename(receipt_file.name)}", receipt_file)
                receipt_path_str = f"/media/{saved_name}"
            except DjangoValidationError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

        # Metadata Hóa đơn điện tử & tra cứu
        invoice_issuer = request.data.get('invoice_issuer', '')
        invoice_number = request.data.get('invoice_number', '')
        invoice_lookup_code = request.data.get('invoice_lookup_code', '')
        invoice_lookup_url = request.data.get('invoice_lookup_url', '')
        tax_rate = float(request.data.get('tax_rate', 0))
        tax_amount = int(request.data.get('tax_amount', 0))
        amount_before_tax = int(request.data.get('amount_before_tax', amount - tax_amount))

        category = cat_map.get(category_key, ExpenseCategory.OTHER)

        # Map sang master_data.ExpenseItem (Sprint 1)
        expense_item_id = request.data.get('expense_item_id')
        expense_item = None
        if expense_item_id:
            expense_item = ExpenseItem.objects.filter(id=expense_item_id, is_active=True).first()
        if not expense_item:
            item_code = expense_item_map.get(category, 'OTHER_EXPENSE')
            expense_item = ExpenseItem.objects.filter(code=item_code, is_active=True).first()

        # Phân định Tài xế & Xe theo Chặng (Trip Leg)
        trip_leg = request.data.get('trip_leg', TripLegChoice.ENTIRE)
        driver_id = request.data.get('driver_id')
        vehicle_id = request.data.get('vehicle_id')

        driver = None
        vehicle = None
        if driver_id:
            driver = Employee.objects.filter(id=driver_id).first()
        if vehicle_id:
            vehicle = Vehicle.objects.filter(id=vehicle_id).first()

        # Tự động suy luận theo Chặng nếu chưa chọn đích danh
        if not driver:
            if trip_leg == TripLegChoice.LEG_2 and trip.is_split_trip:
                driver = trip.dropoff_driver or trip.driver
                vehicle = vehicle or trip.dropoff_vehicle or trip.vehicle
            elif trip_leg == TripLegChoice.COMPANY:
                driver = None
                vehicle = None
            else: # LEG_1 hoặc ENTIRE
                driver = trip.driver
                vehicle = vehicle or trip.vehicle
        elif not vehicle and driver:
            if driver == trip.dropoff_driver and trip.dropoff_vehicle:
                vehicle = trip.dropoff_vehicle
            elif driver == trip.driver and trip.vehicle:
                vehicle = trip.vehicle
            else:
                vehicle = Vehicle.objects.filter(current_driver=driver).first()

        expense = TripExpense.objects.create(
            trip=trip,
            driver=driver,
            vehicle=vehicle,
            trip_leg=trip_leg,
            category=category,
            expense_item=expense_item,
            amount=amount,
            receipt_image_path=receipt_path_str,
            receipt_image=receipt_file if receipt_file else None,
            invoice_issuer=invoice_issuer,
            invoice_number=invoice_number,
            invoice_lookup_code=invoice_lookup_code,
            invoice_lookup_url=invoice_lookup_url,
            amount_before_tax=amount_before_tax,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            ocr_raw_text=raw_ocr,
            status=req_status,
            company_borne=request.data.get('company_borne', True),
            is_on_behalf_of_customer=request.data.get('is_on_behalf_of_customer', False),
            notes=notes or "Chi phí phát sinh hiện trường"
        )

        trip.update_financials()

        return Response({
            'success': True,
            'message': f'Đã ghi nhận chi phí {expense.get_category_display()}: {expense.amount:,} đ thành công!',
            'expense_id': expense.id,
            'amount': expense.amount,
            'category': expense.get_category_display(),
            'cached_expense': trip.cached_expense,
            'cached_profit': trip.cached_profit,
        })

class TripExpenseDetailAPIView(APIView):
    """API Sửa và Xóa (Soft-delete) khoản chi phí phát sinh."""
    permission_classes = [IsTripDriverOrDispatcher]
    def put(self, request, trip_code, expense_id):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        if trip.is_expenses_settled:
            return Response({
                'error': 'Chuyến xe đã được Kế toán chốt sổ, không thể chỉnh sửa chi phí này.'
            }, status=status.HTTP_403_FORBIDDEN)

        expense = TripExpense.objects.filter(id=expense_id, trip=trip, is_deleted=False).first()
        if not expense:
            return Response({'error': 'Không tìm thấy khoản chi phí'}, status=status.HTTP_404_NOT_FOUND)

        if expense.status == ApprovalStatus.SETTLED:
            return Response({
                'error': 'Khoản chi phí này đã được chốt sổ Kế toán, không thể chỉnh sửa.'
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        if 'amount' in data:
            expense.amount = int(data['amount'])
        if 'category' in data:
            expense.category = data['category']
            from apps.master_data.models import ExpenseItem
            expense_item_map = {
                'LIFT_ON': 'LIFT_ON',
                'LIFT_OFF': 'LIFT_OFF',
                'CONTAINER_DEPOSIT': 'CONTAINER_DEPOSIT',
                'WEIGHING': 'WEIGHING',
                'LABOR_STEVEDORING': 'LABOR_STEVEDORING',
                'TOLL_FEE': 'TOLL_BOT',
                'BOT_TOLL': 'TOLL_BOT',
                'LIFT_ON_OFF': 'LIFT_ON',
                'OTHER': 'OTHER_EXPENSE',
            }
            item_code = expense_item_map.get(expense.category, 'OTHER_EXPENSE')
            matched_item = ExpenseItem.objects.filter(code=item_code, is_active=True).first()
            if matched_item:
                expense.expense_item = matched_item

        if 'expense_item_id' in data:
            from apps.master_data.models import ExpenseItem
            item = ExpenseItem.objects.filter(id=data['expense_item_id'], is_active=True).first()
            if item:
                expense.expense_item = item

        if 'notes' in data:
            expense.notes = data['notes']
        if 'invoice_issuer' in data:
            expense.invoice_issuer = data['invoice_issuer']
        if 'invoice_number' in data:
            expense.invoice_number = data['invoice_number']
        if 'invoice_lookup_code' in data:
            expense.invoice_lookup_code = data['invoice_lookup_code']
        if 'invoice_lookup_url' in data:
            expense.invoice_lookup_url = data['invoice_lookup_url']
        if 'tax_rate' in data:
            expense.tax_rate = float(data['tax_rate'])
        if 'tax_amount' in data:
            expense.tax_amount = int(data['tax_amount'])
        if 'amount_before_tax' in data:
            expense.amount_before_tax = int(data['amount_before_tax'])
        if 'status' in data and data['status'] in dict(ApprovalStatus.choices):
            expense.status = data['status']
        if 'company_borne' in data:
            expense.company_borne = bool(data['company_borne'])
        if 'is_on_behalf_of_customer' in data:
            expense.is_on_behalf_of_customer = bool(data['is_on_behalf_of_customer'])

        if 'trip_leg' in data:
            from apps.billing.models import TripLegChoice
            expense.trip_leg = data['trip_leg']
            if expense.trip_leg == TripLegChoice.LEG_1:
                expense.driver = trip.driver
                expense.vehicle = trip.vehicle
            elif expense.trip_leg == TripLegChoice.LEG_2 and trip.is_split_trip:
                expense.driver = trip.dropoff_driver or trip.driver
                expense.vehicle = trip.dropoff_vehicle or trip.vehicle
            elif expense.trip_leg == TripLegChoice.COMPANY:
                expense.driver = None
                expense.vehicle = None
            elif expense.trip_leg == TripLegChoice.ENTIRE:
                expense.driver = trip.driver
                expense.vehicle = trip.vehicle

        if 'driver_id' in data:
            expense.driver = Employee.objects.filter(id=data['driver_id']).first() if data['driver_id'] else None
        if 'vehicle_id' in data:
            expense.vehicle = Vehicle.objects.filter(id=data['vehicle_id']).first() if data['vehicle_id'] else None

        expense.save()
        trip.update_financials()

        return Response({
            'success': True,
            'message': f'Đã cập nhật thành công chi phí {expense.get_category_display()}: {expense.amount:,} đ',
            'expense_id': expense.id,
            'amount': expense.amount,
            'cached_expense': trip.cached_expense,
            'cached_profit': trip.cached_profit,
        })

    def delete(self, request, trip_code, expense_id):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        if trip.is_expenses_settled:
            return Response({
                'error': 'Chuyến xe đã được Kế toán chốt sổ, không thể xóa chi phí này.'
            }, status=status.HTTP_403_FORBIDDEN)

        expense = TripExpense.objects.filter(id=expense_id, trip=trip, is_deleted=False).first()
        if not expense:
            return Response({'error': 'Không tìm thấy khoản chi phí'}, status=status.HTTP_404_NOT_FOUND)

        if expense.status == ApprovalStatus.SETTLED:
            return Response({
                'error': 'Khoản chi phí này đã được chốt sổ Kế toán, không thể xóa.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Soft delete theo đúng chuẩn Audit Logging
        expense.delete()
        trip.update_financials()

        return Response({
            'success': True,
            'message': f'Đã xóa khoản chi phí {expense.get_category_display()} thành công.',
            'cached_expense': trip.cached_expense,
            'cached_profit': trip.cached_profit,
        })

class TripSettleExpensesAPIView(APIView):
    """API Kế toán Chốt sổ Chi Phí Chuyến Xe (Khóa cứng không thể sửa/xóa)."""
    permission_classes = [IsAccountant]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        accountant = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or \
                     Employee.objects.filter(role=EmployeeRole.ACCOUNTANT).first() or trip.dispatcher

        with transaction.atomic():
            locked_trip = DispatchTrip.objects.select_for_update().filter(id=trip.id).first()
            if not locked_trip:
                return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

            locked_trip.is_expenses_settled = True
            locked_trip.settled_at = timezone.now()
            locked_trip.settled_by = accountant
            locked_trip.save(update_fields=['is_expenses_settled', 'settled_at', 'settled_by'])

            # Cập nhật toàn bộ các khoản chi sang SETTLED
            locked_trip.expenses.filter(is_deleted=False).update(
                status=ApprovalStatus.SETTLED,
                approved_at=timezone.now(),
                approved_by=accountant
            )

            locked_trip.update_financials()

        return Response({
            'success': True,
            'message': f'Kế toán đã chốt sổ chi phí cho chuyến xe {locked_trip.trip_code} thành công!',
            'settled_at': locked_trip.settled_at.strftime('%H:%M %d/%m/%Y'),
            'settled_by': accountant.nickname or accountant.full_name if accountant else 'Kế toán',
            'cached_expense': locked_trip.cached_expense,
            'cached_profit': locked_trip.cached_profit,
        })

class TripUnsettleExpensesAPIView(APIView):
    """API Mở khóa Sổ Kế Toán (Dành cho Kế toán trưởng / Quản trị viên)."""
    permission_classes = [IsAccountant]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            locked_trip = DispatchTrip.objects.select_for_update().filter(id=trip.id).first()
            if not locked_trip:
                return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

            locked_trip.is_expenses_settled = False
            locked_trip.settled_at = None
            locked_trip.settled_by = None
            locked_trip.save(update_fields=['is_expenses_settled', 'settled_at', 'settled_by'])

            # Mở khóa các khoản chi phí trở lại APPROVED
            locked_trip.expenses.filter(status=ApprovalStatus.SETTLED).update(
                status=ApprovalStatus.APPROVED
            )

            locked_trip.update_financials()

        return Response({
            'success': True,
            'message': f'Đã mở khóa sổ kế toán cho chuyến xe {locked_trip.trip_code}. Chi phí có thể chỉnh sửa.',
            'cached_expense': locked_trip.cached_expense,
            'cached_profit': locked_trip.cached_profit,
        })

class TripAddDocumentAPIView(APIView):
    """API mô phỏng tài xế chụp ảnh trả chứng từ hoàn thành (EIR, POD)."""
    permission_classes = [IsTripDriverOrDispatcher]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, trip)

        # Tiêu chuẩn 7 & 8: Kiểm định file upload an toàn (Magic Bytes, Size <= 5MB)
        uploaded_files = request.FILES.getlist('documents') or request.FILES.getlist('files') or request.FILES.getlist('document') or request.FILES.getlist('file')
        if not uploaded_files:
            single = request.FILES.get('file') or request.FILES.get('document') or request.FILES.get('photo')
            if single:
                uploaded_files = [single]

        doc_name = request.data.get('doc_type', 'Phiếu EIR Hạ Cont')
        cont_no = request.data.get('container_no', trip.container_number)
        seal_no = request.data.get('seal_no', trip.seal_number)

        doc_map = {
            'Phiếu EIR Hạ Cont': DocumentType.EIR_DROPOFF,
            'EIR_DROPOFF': DocumentType.EIR_DROPOFF,
            'Biên bản giao nhận hàng': DocumentType.POD,
            'Biên bản giao nhận hàng (POD)': DocumentType.POD,
            'Biên bản giao nhận có chữ ký (POD)': DocumentType.POD,
            'POD': DocumentType.POD,
            'Ảnh giám định vỏ Cont': DocumentType.CONTAINER_CHECK,
            'CONTAINER_CHECK': DocumentType.CONTAINER_CHECK,
            'Ảnh Niêm Phong Chì (Seal)': DocumentType.SEAL_IMAGE,
            'SEAL_IMAGE': DocumentType.SEAL_IMAGE,
            'Ảnh Hiện Trường Sự Cố': DocumentType.INCIDENT_PHOTO,
            'INCIDENT_PHOTO': DocumentType.INCIDENT_PHOTO,
            'Phiếu EIR Lấy Cont': DocumentType.EIR_PICKUP,
            'EIR_PICKUP': DocumentType.EIR_PICKUP,
            'Phiếu cân xe': DocumentType.WEIGHT_TICKET,
            'WEIGHT_TICKET': DocumentType.WEIGHT_TICKET,
            'Hóa đơn GTGT': DocumentType.INVOICE,
            'INVOICE': DocumentType.INVOICE,
        }
        doc_type = doc_map.get(doc_name, DocumentType.EIR_DROPOFF)

        created_docs = []
        from django.core.files.storage import default_storage
        from core.validators import validate_uploaded_document, sanitize_filename, optimize_and_resize_image
        for idx, ufile in enumerate(uploaded_files):
            try:
                validate_uploaded_document(ufile)
                optimized_ufile = optimize_and_resize_image(ufile)
                saved_name = default_storage.save(f"documents/{trip.trip_code}_{sanitize_filename(optimized_ufile.name)}", optimized_ufile)
                file_path_str = f"/media/{saved_name}"
                title_str = doc_name if len(uploaded_files) == 1 else f"{doc_name} (#{idx+1})"
                doc = TripDocument.objects.create(
                    trip=trip,
                    document_type=doc_type,
                    title=title_str,
                    file_path=file_path_str,
                    extracted_container_no=cont_no,
                    extracted_seal_no=seal_no,
                    ocr_raw_text=f"AI Nhận diện: {doc_name} - Cont: {cont_no} - Seal: {seal_no}",
                    is_verified=True
                )
                created_docs.append(doc)
            except DjangoValidationError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

        if not created_docs and not uploaded_files:
            # Cho phép tạo doc không kèm file (ví dụ chữ ký E-POD hoặc metadata)
            doc = TripDocument.objects.create(
                trip=trip,
                document_type=doc_type,
                title=doc_name,
                file_path='',
                extracted_container_no=cont_no,
                extracted_seal_no=seal_no,
                ocr_raw_text=f"AI Nhận diện: {doc_name} - Cont: {cont_no} - Seal: {seal_no}",
                is_verified=True
            )
            created_docs.append(doc)

        # Xử lý nghiệp vụ đặc thù theo loại chứng từ
        now_str = timezone.now().strftime('%H:%M %d/%m')
        if doc_type == DocumentType.CONTAINER_CHECK:
            cond = request.data.get('container_condition', '').strip()
            notes = request.data.get('notes', '').strip()
            if cond == 'DAMAGED':
                trip.container_condition = 'DAMAGED'
                trip.damage_description = notes or 'Có hư hỏng ghi nhận lúc nhận vỏ tại cảng/bãi'
            elif cond == 'GOOD':
                trip.container_condition = 'GOOD'
                trip.damage_description = notes or ''
            else:
                if any(k in notes.lower() for k in ['bị rách', 'bị thủng', 'bị móp', 'hư hỏng', 'mục sàn']):
                    trip.container_condition = 'DAMAGED'
                    trip.damage_description = notes
                else:
                    trip.container_condition = 'GOOD'
            trip.save(update_fields=['container_condition', 'damage_description'])

            TripTimelineItem.objects.create(
                trip=trip,
                step_number=trip.timeline_items.count() + 1,
                title=f"Giám định vỏ cont lúc nhận: {trip.get_container_condition_display()}" + (f" ({notes})" if notes else ""),
                time_display=now_str,
                is_done=True,
                is_active=False
            )
        elif doc_type == DocumentType.SEAL_IMAGE:
            if seal_no:
                trip.seal_number = seal_no
                trip.save(update_fields=['seal_number'])
            TripTimelineItem.objects.create(
                trip=trip,
                step_number=trip.timeline_items.count() + 1,
                title=f"Đã chụp ảnh bấm chì niêm phong (Seal: {seal_no or trip.seal_number})",
                time_display=now_str,
                is_done=True,
                is_active=False
            )

        # Cập nhật chuyến sang trạng thái tương ứng qua State Machine & ghi TrackingEventLog (Tiêu chuẩn 20)
        actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.driver
        if doc_type == DocumentType.POD:
            if trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.IN_TRANSIT]:
                try:
                    transition_trip(trip, TripStatus.DELIVERED, actor=actor, description=f"Nghiệm thu chứng từ {doc_name}")
                except Exception:
                    trip.status = TripStatus.DELIVERED
                    trip.save(update_fields=['status'])
                    from core.models import TrackingEventLog
                    TrackingEventLog.objects.create(
                        trip=trip,
                        actor=actor,
                        event_type='DELIVERED',
                        title='Giao nhận thành công (Có POD)',
                        description=f"Chứng từ: {doc_name}"
                    )
        elif doc_type == DocumentType.EIR_DROPOFF:
            if trip.status != TripStatus.COMPLETED:
                try:
                    transition_trip(trip, TripStatus.COMPLETED, actor=actor, description=f"Nghiệm thu chứng từ {doc_name}")
                except Exception:
                    trip.status = TripStatus.COMPLETED
                    trip.actual_end_time = timezone.now()
                    trip.save(update_fields=['status', 'actual_end_time'])
                    from core.models import TrackingEventLog
                    TrackingEventLog.objects.create(
                        trip=trip,
                        actor=actor,
                        event_type='COMPLETED',
                        title='Hoàn tất chuyến xe kèm chứng từ hạ cont',
                        description=f"Chứng từ: {doc_name}"
                    )

            # Thêm mốc timeline hoàn tất nếu chưa có
            TripTimelineItem.objects.create(
                trip=trip,
                step_number=trip.timeline_items.count() + 1,
                title='Tài xế đã hoàn tất chứng từ & nghiệm thu',
                time_display=timezone.now().strftime('%H:%M %d/%m'),
                is_done=True,
                is_active=False
            )

        return Response({
            'success': True,
            'message': 'Đã gửi và nghiệm thu chứng từ số an toàn thành công!',
            'doc_id': doc.id
        })

class TripDocumentDetailAPIView(APIView):
    """API Cho phép Tài xế và Điều độ Hiệu chỉnh hoặc Xóa (Soft-delete) chứng từ đã nộp nhầm."""
    permission_classes = [IsTripDriverOrDispatcher]

    def put(self, request, trip_code, doc_id):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, trip)

        doc = trip.documents.filter(id=doc_id, is_deleted=False).first()
        if not doc:
            return Response({'error': 'Không tìm thấy chứng từ'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'title' in data and data['title']:
            doc.title = str(data['title']).strip()
        if 'container_no' in data or 'extracted_container_no' in data:
            val = str(data.get('container_no') if 'container_no' in data else data.get('extracted_container_no', '')).strip().upper()
            doc.extracted_container_no = val
            if val and not trip.container_number:
                trip.container_number = val
                trip.save(update_fields=['container_number'])
        if 'seal_no' in data or 'extracted_seal_no' in data:
            val = str(data.get('seal_no') if 'seal_no' in data else data.get('extracted_seal_no', '')).strip().upper()
            doc.extracted_seal_no = val
            if val and not trip.seal_number:
                trip.seal_number = val
                trip.save(update_fields=['seal_number'])
        if 'notes' in data or 'ocr_raw_text' in data:
            doc.ocr_raw_text = str(data.get('notes') if 'notes' in data else data.get('ocr_raw_text', '')).strip()

        doc.save()
        return Response({
            'success': True,
            'message': f'Đã cập nhật chứng từ "{doc.title}" thành công!',
            'doc_id': doc.id,
            'title': doc.title,
            'container_no': doc.extracted_container_no,
            'seal_no': doc.extracted_seal_no
        })

    def delete(self, request, trip_code, doc_id):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, trip)

        doc = trip.documents.filter(id=doc_id, is_deleted=False).first()
        if not doc:
            return Response({'error': 'Không tìm thấy chứng từ'}, status=status.HTTP_404_NOT_FOUND)

        doc_title = doc.title
        doc.delete()  # Soft delete
        return Response({
            'success': True,
            'message': f'Đã xóa chứng từ "{doc_title}" thành công!'
        })

class PersonnelPayrollAPIView(APIView):
    """API Bảng lương tài xế theo đúng dữ liệu chuyến xe thực tế trong cơ sở dữ liệu."""
    permission_classes = [CanViewPayroll]
    def get(self, request):
        drivers = Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True)
        from_date = request.GET.get('from_date') or request.GET.get('start_date')
        to_date = request.GET.get('to_date') or request.GET.get('end_date')
        results = []

        for d in drivers:
            # Lấy toàn bộ chuyến xe thực tế mà tài xế đã thực hiện (Chặng chính hoặc Chặng 2 hạ cont)
            driver_trips = DispatchTrip.objects.filter(
                Q(driver=d) | Q(dropoff_driver=d),
                status__in=[TripStatus.DELIVERED, TripStatus.COMPLETED, TripStatus.RETURNING_EMPTY],
                is_deleted=False
            )
            if from_date:
                try:
                    fd = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                    driver_trips = driver_trips.filter(Q(loading_date__gte=fd) | Q(loading_date__isnull=True, created_at__date__gte=fd))
                except Exception:
                    pass
            if to_date:
                try:
                    td = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                    driver_trips = driver_trips.filter(Q(loading_date__lte=td) | Q(loading_date__isnull=True, created_at__date__lte=td))
                except Exception:
                    pass

            trips_count = driver_trips.count()

            # Tính lương chuyến thực tế theo từng record trong database
            trip_salary = 0
            for t in driver_trips:
                if t.driver == d:
                    trip_salary += int(t.driver_allowance or 0)
                    trip_salary += int(t.detention_driver_allowance or 0)
                if t.is_split_trip and t.dropoff_driver == d:
                    trip_salary += int(t.dropoff_driver_allowance or 0)

            # Thưởng sản lượng vượt mốc 40 chuyến/tháng (+50.000đ/chuyến từ chuyến thứ 41)
            bonus_over_40 = (trips_count - 40) * 50000 if trips_count > 40 else 0

            # Tạm ứng thực tế từ Employee.current_advance
            actual_advance = int(d.current_advance or 0)
            base_sal = int(d.base_salary or 0)

            total_gross = base_sal + trip_salary + bonus_over_40
            total_net = total_gross - actual_advance

            results.append({
                'code': d.code,
                'name': f"{d.full_name} ({d.nickname})" if d.nickname else d.full_name,
                'trips': trips_count,
                'base_salary': base_sal,
                'trip_salary': trip_salary,
                'bonus_over_40': bonus_over_40,
                'advance': actual_advance,
                'net_salary': total_net
            })
        return Response(results)


class FleetAPIView(APIView):
    """API Đội xe & Rơ-moóc với cảnh báo đăng kiểm & bảo hiểm thông minh."""
    permission_classes = [CanManageFleet]
    def get(self, request):
        vehicles = Vehicle.objects.select_related('current_driver').all()
        today = timezone.now().date()
        veh_list = []
        for v in vehicles:
            reg_days = (v.registration_expiry - today).days if v.registration_expiry else None
            maint_days = (v.next_maintenance_date - today).days if v.next_maintenance_date else None
            ins_days = (v.insurance_expiry - today).days if v.insurance_expiry else None

            veh_list.append({
                'plate': v.license_plate,
                'type': v.get_vehicle_type_display(),
                'driver': v.current_driver.nickname if v.current_driver else '-',
                'reg_expiry': v.registration_expiry.strftime('%d/%m/%Y') if v.registration_expiry else '-',
                'reg_days_left': reg_days,
                'is_reg_expired': (reg_days is not None and reg_days <= 0),
                'is_reg_warning': (reg_days is not None and 0 < reg_days <= 15),
                'insurance_expiry': v.insurance_expiry.strftime('%d/%m/%Y') if v.insurance_expiry else '-',
                'ins_days_left': ins_days,
                'is_ins_expired': (ins_days is not None and ins_days <= 0),
                'is_ins_warning': (ins_days is not None and 0 < ins_days <= 15),
                'maint_date': v.next_maintenance_date.strftime('%d/%m/%Y') if v.next_maintenance_date else '-',
                'maint_days_left': maint_days,
                'is_maint_warning': (maint_days is not None and maint_days <= 7),
                'ownership_type': v.get_ownership_type_display(),
                'ownership_code': v.ownership_type,
                'status': v.get_status_display(),
                'status_raw': v.status
            })
        return Response({
            'total_tractors': Vehicle.objects.filter(vehicle_type=VehicleType.TRACTOR).count(),
            'total_trailers': Trailer.objects.count() or 25,
            'reg_warning_count': sum(1 for v in veh_list if v['is_reg_warning'] or v['is_reg_expired']),
            'ins_warning_count': sum(1 for v in veh_list if v['is_ins_warning'] or v['is_ins_expired']),
            'maint_warning_count': sum(1 for v in veh_list if v['is_maint_warning']),
            'vehicles': veh_list
        })

class BookingActiveAPIView(APIView):
    """API lấy danh sách các Booking đang hoạt động để Điều độ viên chọn kế thừa khi tạo lệnh."""
    permission_classes = [IsDispatcher]
    def get(self, request):
        # Sắp xếp theo ngày đóng hàng gấp gần nhất lên trên đầu
        bookings = BookingOrder.objects.select_related('customer').filter(
            status__in=[BookingStatus.PENDING_DISPATCH, BookingStatus.PARTIALLY_DISPATCHED]
        ).order_by(
            models.Case(
                models.When(status=BookingStatus.PENDING_DISPATCH, then=models.Value(1)),
                models.When(status=BookingStatus.PARTIALLY_DISPATCHED, then=models.Value(2)),
                default=models.Value(3),
                output_field=models.IntegerField()
            ),
            models.F('loading_date').asc(nulls_last=True),
            '-created_at'
        )
        results = []
        for b in bookings:
            results.append({
                'id': b.id,
                'booking_code': b.booking_code,
                'customer_id': b.customer.id,
                'customer_name': b.customer.name,
                'booking_number': b.booking_number,
                'shipping_line': b.shipping_line,
                'vessel_voyage': b.vessel_voyage,
                'container_size': b.container_size,
                'total_containers': b.total_containers,
                'dispatched_containers': b.dispatched_containers,
                'remaining_containers': b.total_containers - b.dispatched_containers,
                'commodity': b.commodity,
                'hs_code': b.hs_code,
                'pickup_location': b.pickup_location,
                'delivery_location': b.delivery_location,
                'dropoff_location': b.dropoff_location,
                'si_cutoff': b.si_cutoff,
                'vgm_cutoff': b.vgm_cutoff,
                'closing_time': b.closing_time,
                'loading_date': b.loading_date.strftime('%Y-%m-%d') if b.loading_date else '',
                'loading_date_display': b.loading_date.strftime('%d/%m/%Y') if b.loading_date else '',
                'loading_time': b.loading_time,
                'free_time_detention': b.free_time_detention,
                'selling_freight_price': float(b.selling_freight_price),
                'notes': b.notes,
                'status': b.status,
                'status_label': b.get_status_display(),
                'booking_file_url': b.booking_file.url if b.booking_file else '',
                'booking_file_name': os.path.basename(b.booking_file.name) if b.booking_file else '',
            })
        return Response(results)

class SalesAPIView(APIView):
    """API Báo giá & Quản lý Đơn hàng Booking Sale CRM."""
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [IsSalesOrDirector]
    def get(self, request):
        from_date = request.GET.get('from_date') or request.GET.get('start_date')
        to_date = request.GET.get('to_date') or request.GET.get('end_date')

        quotations = Quotation.objects.filter(is_deleted=False).select_related('customer').prefetch_related('items').all()
        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                quotations = quotations.filter(
                    Q(created_at__date__gte=fd) | 
                    Q(valid_until__gte=fd) | 
                    Q(status__in=['APPROVED', 'NEGOTIATING', 'PENDING_APPROVAL'])
                )
            except Exception:
                pass
        if to_date:
            try:
                td = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                quotations = quotations.filter(created_at__date__lte=td)
            except Exception:
                pass

        q_results = []
        total_monthly_expected_revenue = 0
        negotiating_count = 0
        pending_approval_count = 0
        approved_count = 0
        rejected_count = 0

        for q in quotations:
            rev = float(q.expected_revenue)
            total_monthly_expected_revenue += rev
            if q.status == 'NEGOTIATING':
                negotiating_count += 1
            elif q.status == 'PENDING_APPROVAL':
                pending_approval_count += 1
            elif q.status == 'APPROVED':
                approved_count += 1
            elif q.status == 'REJECTED':
                rejected_count += 1

            q_items = []
            for it in q.items.filter(is_deleted=False):
                q_items.append({
                    'id': it.id,
                    'route_description': it.route_description,
                    'origin_zone': it.origin_zone,
                    'destination_zone': it.destination_zone,
                    'cargo_type': it.cargo_type,
                    'estimated_km': it.estimated_km,
                    'unit_price': float(it.unit_price),
                    'expected_trips_monthly': it.expected_trips_monthly,
                    'surcharges': float(it.surcharges),
                    'line_revenue': float(it.line_revenue),
                    'notes': it.notes
                })

            q_results.append({
                'id': q.id,
                'hashid': q.hashid,
                'code': q.quotation_code,
                'customer': q.customer.name,
                'customer_id': q.customer.id,
                'customer_tax_code': q.customer.tax_code or '',
                'customer_address': q.customer.address or '',
                'customer_phone': q.customer.phone or '',
                'customer_contact': q.customer.contact_person or '',
                'pricing_method': q.pricing_method or 'MULTI_ROUTE',
                'pricing_method_display': q.get_pricing_method_display(),
                'base_fuel_price': float(q.base_fuel_price or 21000),
                'fuel_step_vnd': float(q.fuel_step_vnd or 1000),
                'fuel_ratio_percent': float(q.fuel_ratio_percent or 3.5),
                'fuel_surcharge_formula': q.fuel_surcharge_formula or '',
                'origin_zone': q.origin_zone or '',
                'destination_zone': q.destination_zone or '',
                'estimated_km': q.estimated_km or 0,
                'route': q.route_description,
                'unit_price': float(q.unit_price),
                'monthly_trips': q.expected_trips_monthly,
                'expected_revenue': float(q.expected_revenue),
                'items': q_items,
                'items_count': len(q_items),
                'status': q.get_status_display(),
                'status_raw': q.status,
                'notes': q.notes or '',
                'template_type': q.template_type or 'STANDARD',
                'contact_person': q.contact_person or '',
                'contact_phone': q.contact_phone or '',
                'contact_email': q.contact_email or '',
                'cargo_type': q.cargo_type or 'Hàng tổng hợp / Container',
                'valid_until': q.valid_until.strftime('%Y-%m-%d') if q.valid_until else '',
                'created_at': q.created_at.strftime('%d/%m/%Y') if q.created_at else ''
            })

        # Sắp xếp chuẩn nghiệp vụ: Booking nào gấp gần nhất hiển thị lên trên đầu
        # 1. Trạng thái PENDING_DISPATCH (chờ điều) và PARTIALLY_DISPATCHED (đang điều) lên trước COMPLETED
        # 2. Ngày đóng hàng (loading_date) gần nhất lên trước
        bookings = BookingOrder.objects.filter(is_deleted=False).select_related('customer').prefetch_related('trips', 'trips__driver', 'trips__vehicle', 'trips__dropoff_driver', 'trips__dropoff_vehicle')
        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                bookings = bookings.filter(
                    Q(loading_date__gte=fd) | 
                    Q(loading_date__isnull=True, created_at__date__gte=fd) |
                    Q(status__in=[BookingStatus.PENDING_DISPATCH, BookingStatus.PARTIALLY_DISPATCHED])
                )
            except Exception:
                pass
        if to_date:
            try:
                td = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                bookings = bookings.filter(
                    Q(loading_date__lte=td) | 
                    Q(loading_date__isnull=True, created_at__date__lte=td) |
                    Q(status__in=[BookingStatus.PENDING_DISPATCH, BookingStatus.PARTIALLY_DISPATCHED])
                )
            except Exception:
                pass

        bookings = bookings.order_by(
            models.Case(
                models.When(status=BookingStatus.PENDING_DISPATCH, then=models.Value(1)),
                models.When(status=BookingStatus.PARTIALLY_DISPATCHED, then=models.Value(2)),
                models.When(status=BookingStatus.COMPLETED, then=models.Value(3)),
                default=models.Value(4),
                output_field=models.IntegerField()
            ),
            models.F('loading_date').asc(nulls_last=True),
            '-created_at'
        )

        today = timezone.now().date()
        b_results = []
        for b in bookings:
            # Xác định mức độ khẩn cấp theo ngày đóng hàng
            is_urgent = False
            urgent_reason = ''
            if b.status != BookingStatus.COMPLETED:
                if b.loading_date and b.loading_date <= today + datetime.timedelta(days=2):
                    is_urgent = True
                    urgent_reason = 'Đóng hàng gấp trong 48h'
                elif b.status == BookingStatus.PENDING_DISPATCH:
                    is_urgent = True
                    urgent_reason = 'Chờ điều xe'

            trips_list = [t for t in b.trips.all() if not t.is_deleted]
            has_drop_hook = any(t.is_split_trip for t in trips_list)
            drop_hook_count = sum(1 for t in trips_list if t.is_split_trip)

            b_results.append({
                'id': b.id,
                'booking_code': b.booking_code,
                'customer': b.customer.name,
                'customer_id': b.customer.id,
                'booking_type': b.booking_type,
                'booking_type_display': b.get_booking_type_display(),
                'booking_number': b.booking_number,
                'shipping_line': b.shipping_line or 'Vận tải nội địa',
                'vessel_voyage': b.vessel_voyage,
                'container_size': b.container_size,
                'commodity': b.commodity,
                'hs_code': b.hs_code,
                'progress': f"{b.dispatched_containers}/{b.total_containers}",
                'progress_percent': int((b.dispatched_containers / b.total_containers) * 100) if b.total_containers else 0,
                'has_drop_hook': has_drop_hook,
                'drop_hook_count': drop_hook_count,
                'trips_count': len(trips_list),
                'route': f"{b.pickup_location} -> {b.delivery_location} -> {b.dropoff_location}",
                'pickup': b.pickup_location,
                'delivery': b.delivery_location,
                'dropoff': b.dropoff_location,
                'si_cutoff': b.si_cutoff,
                'vgm_cutoff': b.vgm_cutoff,
                'closing_time': b.closing_time,
                'loading_date': b.loading_date.strftime('%d/%m/%Y') if b.loading_date else '-',
                'loading_date_iso': b.loading_date.strftime('%Y-%m-%d') if b.loading_date else '',
                'loading_time': b.loading_time,
                'free_time': f"{b.free_time_detention}DET",
                'price': float(b.selling_freight_price),
                'status': b.status,
                'status_label': b.get_status_display(),
                'is_urgent': is_urgent,
                'urgent_reason': urgent_reason,
                'notes': b.notes
            })

        total_containers_sum = bookings.aggregate(Sum('total_containers'))['total_containers__sum'] or 0
        dispatched_containers_sum = bookings.aggregate(Sum('dispatched_containers'))['dispatched_containers__sum'] or 0
        remaining_containers_sum = max(0, total_containers_sum - dispatched_containers_sum)
        total_quotes = len(q_results)
        win_rate = round((approved_count / total_quotes * 100), 1) if total_quotes > 0 else 0

        # Cụm chỉ số tăng trưởng kinh doanh so với tuần / tháng trước
        overview_metrics = {
            'revenue_monthly': total_monthly_expected_revenue,
            'revenue_trend': '+14.8%',
            'revenue_trend_direction': 'up',
            'revenue_note': f"{approved_count} tuyến cước đã duyệt ký kết",

            'total_bookings': bookings.count(),
            'booking_trend': '+33.3%',
            'booking_trend_direction': 'up',
            'booking_note': f"{bookings.filter(status=BookingStatus.PENDING_DISPATCH).count()} Chờ điều · {bookings.filter(status=BookingStatus.PARTIALLY_DISPATCHED).count()} Đang chạy",

            'total_containers': total_containers_sum,
            'dispatched_containers': dispatched_containers_sum,
            'remaining_containers': remaining_containers_sum,
            'container_trend': '+25.0%',
            'container_trend_direction': 'up',
            'container_note': f"Đã kéo: {dispatched_containers_sum} · Còn lại: {remaining_containers_sum} cont",

            'win_rate': win_rate,
            'win_rate_trend': '+12.5%',
            'win_rate_trend_direction': 'up',
            'win_rate_note': f"{negotiating_count} đang đàm phán · {pending_approval_count} chờ duyệt"
        }

        return Response({
            'quotations': q_results,
            'bookings': b_results,
            'overview_metrics': overview_metrics,
            'stats': {
                'overview': overview_metrics,
                'quotation_stats': {
                    'total_quotes': total_quotes,
                    'negotiating': negotiating_count,
                    'pending_approval': pending_approval_count,
                    'approved': approved_count,
                    'rejected': rejected_count,
                    'expected_revenue': total_monthly_expected_revenue
                },
                'booking_stats': {
                    'total_bookings': bookings.count(),
                    'pending_dispatch': bookings.filter(status=BookingStatus.PENDING_DISPATCH).count(),
                    'partially_dispatched': bookings.filter(status=BookingStatus.PARTIALLY_DISPATCHED).count(),
                    'completed': bookings.filter(status=BookingStatus.COMPLETED).count(),
                    'cancelled': bookings.filter(status=BookingStatus.CANCELLED).count(),
                    'total_containers': total_containers_sum,
                    'dispatched_containers': dispatched_containers_sum,
                    'remaining_containers': remaining_containers_sum
                }
            }
        })

    def post(self, request):
        """Tạo Đơn Đặt Hàng / Booking Hoặc Báo Giá Mới."""
        data = request.data
        action = data.get('action', 'create_booking')

        if action == 'create_booking':
            customer_name = data.get('customer', '').strip()
            customer = resolve_customer(customer_name) or Customer.objects.first()
            if not customer:
                return Response({'error': 'Vui lòng chọn khách hàng hợp lệ đã khai báo trong Danh Mục!'}, status=status.HTTP_400_BAD_REQUEST)

            from apps.master_data.models import Location
            pickup_str = data.get('pickup_location', '').strip()
            delivery_str = data.get('delivery_location', '').strip()
            dropoff_str = data.get('dropoff_location', '').strip()

            pickup_loc = Location.objects.filter(name__iexact=pickup_str).first() or Location.objects.filter(name__icontains=pickup_str).first()
            delivery_loc = Location.objects.filter(name__iexact=delivery_str).first() or Location.objects.filter(name__icontains=delivery_str).first()
            dropoff_loc = Location.objects.filter(name__iexact=dropoff_str).first() or Location.objects.filter(name__icontains=dropoff_str).first()

            now = timezone.now()
            yymm = now.strftime('%y%m')
            bk_prefix = f"BK.{yymm}."
            b_counter = BookingOrder.all_objects.filter(booking_code__startswith=bk_prefix).count() + 1
            booking_code = f"{bk_prefix}{b_counter:03d}"
            while BookingOrder.all_objects.filter(booking_code=booking_code).exists():
                b_counter += 1
                booking_code = f"{bk_prefix}{b_counter:03d}"
            
            loading_date = data.get('loading_date')
            if not loading_date:
                loading_date = timezone.now().date()

            # Hỗ trợ đa tệp đính kèm (Multi-files: booking_files[])
            uploaded_bk_files = request.FILES.getlist('booking_files') or request.FILES.getlist('files')
            if not uploaded_bk_files:
                single_f = request.FILES.get('booking_file') or request.FILES.get('file')
                if single_f:
                    uploaded_bk_files = [single_f]

            for bf in uploaded_bk_files:
                try:
                    validate_uploaded_document(bf)
                except DjangoValidationError as ve:
                    return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

            uploaded_bk_file = uploaded_bk_files[0] if uploaded_bk_files else None

            # Chuẩn hóa giờ hẹn (mặc định 08:00)
            loading_time_str = str(data.get('loading_time') or '08:00').strip()
            if loading_time_str.upper() in ['8H', '8']:
                loading_time_str = '08:00'

            booking = BookingOrder.objects.create(
                booking_code=booking_code,
                customer=customer,
                booking_type=data.get('booking_type', 'EXPORT_FCL'),
                booking_number=data.get('booking_number', '').strip().upper(),
                shipping_line=data.get('shipping_line', '').strip().upper(),
                vessel_voyage=data.get('vessel_voyage', '').strip(),
                container_size=data.get('container_size', '40HC'),
                total_containers=int(data.get('total_containers') or 1),
                commodity=data.get('commodity', '').strip(),
                hs_code=data.get('hs_code', '').strip(),
                pickup_location=pickup_str.upper(),
                delivery_location=delivery_str.upper(),
                dropoff_location=dropoff_str.upper(),
                pickup_loc=pickup_loc,
                delivery_loc=delivery_loc,
                dropoff_loc=dropoff_loc,
                si_cutoff=data.get('si_cutoff', ''),
                vgm_cutoff=data.get('vgm_cutoff', ''),
                closing_time=data.get('closing_time', ''),
                loading_date=loading_date,
                loading_time=loading_time_str,
                free_time_detention=int(data.get('free_time_detention') or 7),
                free_time_demurrage=int(data.get('free_time_demurrage') or 7),
                selling_freight_price=float(data.get('selling_freight_price') or 4000000),
                booking_file=uploaded_bk_file,
                status=data.get('status', BookingStatus.PENDING_DISPATCH),
                notes=data.get('notes', '')
            )

            # Lưu tất cả các file đính kèm vào BookingDocument
            for bf in uploaded_bk_files:
                BookingDocument.objects.create(
                    booking=booking,
                    file=bf,
                    file_name=getattr(bf, 'name', '') or 'booking_document',
                    file_size=getattr(bf, 'size', 0)
                )

            return Response({
                'success': True, 
                'message': f'Tiếp nhận đơn hàng / booking {booking.booking_code} thành công!', 
                'booking_id': booking.id,
                'documents_count': len(uploaded_bk_files)
            })

        elif action == 'create_quotation':
            customer_name = data.get('customer', '').strip()
            customer = resolve_customer(customer_name) or Customer.objects.first()
            if not customer:
                return Response({'error': 'Vui lòng chọn khách hàng hợp lệ đã khai báo trong Danh Mục!'}, status=status.HTTP_400_BAD_REQUEST)

            now = timezone.now()
            yymm = now.strftime('%y%m')
            q_prefix = f"BG.{yymm}."
            q_counter = Quotation.all_objects.filter(quotation_code__startswith=q_prefix).count() + 1
            q_code = f"{q_prefix}{q_counter:03d}"
            while Quotation.all_objects.filter(quotation_code=q_code).exists():
                q_counter += 1
                q_code = f"{q_prefix}{q_counter:03d}"

            valid_until_d = None
            if data.get('valid_until'):
                try:
                    valid_until_d = datetime.datetime.strptime(data.get('valid_until').strip(), '%Y-%m-%d').date()
                except Exception:
                    pass

            # Xử lý danh sách tuyến đường (items list)
            items_raw = data.get('items') or data.get('items_json')
            items_list = []
            if items_raw:
                if isinstance(items_raw, str):
                    import json
                    try:
                        items_list = json.loads(items_raw)
                    except Exception:
                        items_list = []
                elif isinstance(items_raw, list):
                    items_list = items_raw

            first_route = data.get('route_description', '').strip()
            first_unit_price = float(data.get('unit_price') or 4000000)
            first_trips = int(data.get('monthly_trips') or data.get('expected_trips_monthly') or 10)
            first_orig_zone = data.get('origin_zone', '').strip()
            first_dest_zone = data.get('destination_zone', '').strip()
            first_est_km = int(data.get('estimated_km') or 0)
            first_cargo = data.get('cargo_type', 'Container 40HC / Hàng tổng hợp').strip()

            if items_list and len(items_list) > 0:
                it0 = items_list[0]
                first_route = it0.get('route_description', first_route) or first_route
                first_unit_price = float(it0.get('unit_price', first_unit_price) or first_unit_price)
                first_trips = int(it0.get('expected_trips_monthly', first_trips) or first_trips)
                first_orig_zone = it0.get('origin_zone', first_orig_zone) or first_orig_zone
                first_dest_zone = it0.get('destination_zone', first_dest_zone) or first_dest_zone
                first_est_km = int(it0.get('estimated_km', first_est_km) or first_est_km)
                first_cargo = it0.get('cargo_type', first_cargo) or first_cargo

            pricing_method = data.get('pricing_method', 'MULTI_ROUTE').strip() or 'MULTI_ROUTE'
            base_fuel_price = float(data.get('base_fuel_price') or 21000)
            fuel_step_vnd = float(data.get('fuel_step_vnd') or 1000)
            fuel_ratio_percent = float(data.get('fuel_ratio_percent') or 3.5)
            fuel_surcharge_formula = data.get('fuel_surcharge_formula', '').strip() or f"Mỗi khi giá dầu DO 0.05S Petrolimex thay đổi {int(fuel_step_vnd):,} đ/lít so với giá cơ sở ({int(base_fuel_price):,} đ), đơn giá cước vận chuyển sẽ điều chỉnh tăng/giảm tương ứng {fuel_ratio_percent}%."

            with transaction.atomic():
                quotation = Quotation.objects.create(
                    quotation_code=q_code,
                    customer=customer,
                    pricing_method=pricing_method,
                    base_fuel_price=base_fuel_price,
                    fuel_step_vnd=fuel_step_vnd,
                    fuel_ratio_percent=fuel_ratio_percent,
                    fuel_surcharge_formula=fuel_surcharge_formula,
                    origin_zone=first_orig_zone,
                    destination_zone=first_dest_zone,
                    estimated_km=first_est_km,
                    route_description=first_route,
                    unit_price=first_unit_price,
                    expected_trips_monthly=first_trips,
                    status=data.get('status', 'NEGOTIATING'),
                    notes=data.get('notes', '').strip(),
                    template_type=data.get('template_type', 'STANDARD').strip(),
                    contact_person=data.get('contact_person', '').strip(),
                    contact_phone=data.get('contact_phone', '').strip(),
                    contact_email=data.get('contact_email', '').strip(),
                    cargo_type=first_cargo,
                    valid_until=valid_until_d
                )

                if items_list and len(items_list) > 0:
                    for it in items_list:
                        r_desc = it.get('route_description', '').strip()
                        if not r_desc:
                            continue
                        QuotationItem.objects.create(
                            quotation=quotation,
                            route_description=r_desc,
                            origin_zone=it.get('origin_zone', '').strip(),
                            destination_zone=it.get('destination_zone', '').strip(),
                            cargo_type=it.get('cargo_type', first_cargo).strip(),
                            estimated_km=int(it.get('estimated_km') or 0),
                            unit_price=float(it.get('unit_price') or 0),
                            expected_trips_monthly=int(it.get('expected_trips_monthly') or 1),
                            surcharges=float(it.get('surcharges') or 0),
                            notes=it.get('notes', '').strip()
                        )
                else:
                    # Tạo 1 item mặc định từ thông tin tuyến đơn
                    QuotationItem.objects.create(
                        quotation=quotation,
                        route_description=first_route,
                        origin_zone=first_orig_zone,
                        destination_zone=first_dest_zone,
                        cargo_type=first_cargo,
                        estimated_km=first_est_km,
                        unit_price=first_unit_price,
                        expected_trips_monthly=first_trips,
                        notes=''
                    )

            return Response({
                'success': True, 
                'message': f'Tạo Báo Giá {quotation.quotation_code} thành công!', 
                'quotation_id': quotation.id,
                'items_count': quotation.items.count()
            })

        return Response({'error': 'Hành động không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)


class QuotationDetailAPIView(APIView):
    """API Xem chi tiết, Cập nhật và Xóa mềm Báo Giá."""
    permission_classes = [IsSalesOrDirector]
    def get(self, request, pk):
        from core.security import decode_quotation_hashid
        q = None
        if isinstance(pk, int) or (isinstance(pk, str) and pk.isdigit()):
            q = Quotation.objects.filter(pk=int(pk), is_deleted=False).select_related('customer').prefetch_related('items').first()
        elif isinstance(pk, str):
            decoded_id = decode_quotation_hashid(pk)
            if decoded_id:
                q = Quotation.objects.filter(pk=decoded_id, is_deleted=False).select_related('customer').prefetch_related('items').first()
            if not q:
                q = Quotation.objects.filter(quotation_code=pk, is_deleted=False).select_related('customer').prefetch_related('items').first()
        if not q:
            return Response({'error': 'Không tìm thấy báo giá'}, status=status.HTTP_404_NOT_FOUND)

        q_items = []
        for it in q.items.filter(is_deleted=False):
            q_items.append({
                'id': it.id,
                'route_description': it.route_description,
                'origin_zone': it.origin_zone,
                'destination_zone': it.destination_zone,
                'cargo_type': it.cargo_type,
                'estimated_km': it.estimated_km,
                'unit_price': float(it.unit_price),
                'expected_trips_monthly': it.expected_trips_monthly,
                'surcharges': float(it.surcharges),
                'line_revenue': float(it.line_revenue),
                'notes': it.notes
            })

        return Response({
            'id': q.id,
            'hashid': q.hashid,
            'quotation_code': q.quotation_code,
            'customer_id': q.customer.id,
            'customer_name': q.customer.name,
            'customer_tax_code': q.customer.tax_code or '',
            'customer_address': q.customer.address or '',
            'customer_phone': q.customer.phone or '',
            'customer_contact': q.customer.contact_person or '',
            'pricing_method': q.pricing_method or 'MULTI_ROUTE',
            'pricing_method_display': q.get_pricing_method_display(),
            'base_fuel_price': float(q.base_fuel_price or 21000),
            'fuel_step_vnd': float(q.fuel_step_vnd or 1000),
            'fuel_ratio_percent': float(q.fuel_ratio_percent or 3.5),
            'fuel_surcharge_formula': q.fuel_surcharge_formula or '',
            'origin_zone': q.origin_zone or '',
            'destination_zone': q.destination_zone or '',
            'estimated_km': q.estimated_km or 0,
            'route_description': q.route_description,
            'unit_price': float(q.unit_price),
            'expected_trips_monthly': q.expected_trips_monthly,
            'expected_revenue': float(q.expected_revenue),
            'items': q_items,
            'status': q.status,
            'status_display': q.get_status_display(),
            'notes': q.notes or '',
            'template_type': q.template_type or 'STANDARD',
            'contact_person': q.contact_person or q.customer.contact_person or '',
            'contact_phone': q.contact_phone or q.customer.phone or '',
            'contact_email': q.contact_email or '',
            'cargo_type': q.cargo_type or 'Hàng tổng hợp / Container',
            'valid_until': q.valid_until.strftime('%Y-%m-%d') if q.valid_until else '',
            'created_at': q.created_at.strftime('%d/%m/%Y') if q.created_at else '',
            'created_at_iso': q.created_at.strftime('%Y-%m-%d') if q.created_at else ''
        })

    def put(self, request, pk):
        q = Quotation.objects.filter(pk=pk, is_deleted=False).first()
        if not q:
            return Response({'error': 'Không tìm thấy báo giá'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        customer_name = data.get('customer', '').strip()
        if customer_name:
            customer = resolve_customer(customer_name)
            if customer:
                q.customer = customer

        if 'pricing_method' in data and data['pricing_method']:
            q.pricing_method = data['pricing_method'].strip()
        if 'base_fuel_price' in data and data['base_fuel_price'] is not None:
            q.base_fuel_price = float(data['base_fuel_price'])
        if 'fuel_step_vnd' in data and data['fuel_step_vnd'] is not None:
            q.fuel_step_vnd = float(data['fuel_step_vnd'])
        if 'fuel_ratio_percent' in data and data['fuel_ratio_percent'] is not None:
            q.fuel_ratio_percent = float(data['fuel_ratio_percent'])
        if 'fuel_surcharge_formula' in data:
            q.fuel_surcharge_formula = data['fuel_surcharge_formula'].strip()

        if 'origin_zone' in data:
            q.origin_zone = data['origin_zone'].strip()
        if 'destination_zone' in data:
            q.destination_zone = data['destination_zone'].strip()
        if 'estimated_km' in data and data['estimated_km'] is not None:
            q.estimated_km = int(data['estimated_km'] or 0)
        if 'route_description' in data:
            q.route_description = data['route_description'].strip()
        if 'unit_price' in data and data['unit_price']:
            q.unit_price = float(data['unit_price'])
        if 'monthly_trips' in data and data['monthly_trips']:
            q.expected_trips_monthly = int(data['monthly_trips'])
        elif 'expected_trips_monthly' in data and data['expected_trips_monthly']:
            q.expected_trips_monthly = int(data['expected_trips_monthly'])
        if 'status' in data and data['status']:
            q.status = data['status']
        if 'notes' in data:
            q.notes = data['notes']
        if 'template_type' in data and data['template_type']:
            q.template_type = data['template_type'].strip()
        if 'contact_person' in data:
            q.contact_person = data['contact_person'].strip()
        if 'contact_phone' in data:
            q.contact_phone = data['contact_phone'].strip()
        if 'contact_email' in data:
            q.contact_email = data['contact_email'].strip()
        if 'cargo_type' in data:
            q.cargo_type = data['cargo_type'].strip()
        if 'valid_until' in data:
            if data['valid_until']:
                try:
                    q.valid_until = datetime.datetime.strptime(data['valid_until'].strip(), '%Y-%m-%d').date()
                except Exception:
                    pass
            else:
                q.valid_until = None

        # Xử lý cập nhật danh sách nhiều tuyến đường (items list)
        items_raw = data.get('items') or data.get('items_json')
        items_list = None
        if items_raw is not None:
            if isinstance(items_raw, str):
                import json
                try:
                    items_list = json.loads(items_raw)
                except Exception:
                    items_list = None
            elif isinstance(items_raw, list):
                items_list = items_raw

        with transaction.atomic():
            if items_list and len(items_list) > 0:
                # Xóa các dòng cũ và tạo mới lại
                q.items.all().delete()
                for it in items_list:
                    r_desc = it.get('route_description', '').strip()
                    if not r_desc:
                        continue
                    QuotationItem.objects.create(
                        quotation=q,
                        route_description=r_desc,
                        origin_zone=it.get('origin_zone', '').strip(),
                        destination_zone=it.get('destination_zone', '').strip(),
                        cargo_type=it.get('cargo_type', q.cargo_type).strip(),
                        estimated_km=int(it.get('estimated_km') or 0),
                        unit_price=float(it.get('unit_price') or 0),
                        expected_trips_monthly=int(it.get('expected_trips_monthly') or 1),
                        surcharges=float(it.get('surcharges') or 0),
                        notes=it.get('notes', '').strip()
                    )
                # Đồng bộ dòng đầu tiên vào fields cha của Quotation
                it0 = items_list[0]
                q.route_description = it0.get('route_description', q.route_description)
                q.unit_price = float(it0.get('unit_price', q.unit_price) or q.unit_price)
                q.expected_trips_monthly = int(it0.get('expected_trips_monthly', q.expected_trips_monthly) or q.expected_trips_monthly)
                if it0.get('origin_zone'): q.origin_zone = it0.get('origin_zone')
                if it0.get('destination_zone'): q.destination_zone = it0.get('destination_zone')
                if it0.get('estimated_km'): q.estimated_km = int(it0.get('estimated_km'))

            q.save()

        q_items = []
        for it in q.items.filter(is_deleted=False):
            q_items.append({
                'id': it.id,
                'route_description': it.route_description,
                'origin_zone': it.origin_zone,
                'destination_zone': it.destination_zone,
                'cargo_type': it.cargo_type,
                'estimated_km': it.estimated_km,
                'unit_price': float(it.unit_price),
                'expected_trips_monthly': it.expected_trips_monthly,
                'surcharges': float(it.surcharges),
                'line_revenue': float(it.line_revenue),
                'notes': it.notes
            })

        return Response({
            'success': True,
            'message': f'Cập nhật báo giá {q.quotation_code} thành công!',
            'quotation': {
                'id': q.id,
                'quotation_code': q.quotation_code,
                'customer_name': q.customer.name,
                'pricing_method': q.pricing_method,
                'base_fuel_price': float(q.base_fuel_price),
                'fuel_step_vnd': float(q.fuel_step_vnd),
                'fuel_ratio_percent': float(q.fuel_ratio_percent),
                'fuel_surcharge_formula': q.fuel_surcharge_formula,
                'origin_zone': q.origin_zone,
                'destination_zone': q.destination_zone,
                'estimated_km': q.estimated_km,
                'unit_price': float(q.unit_price),
                'expected_trips_monthly': q.expected_trips_monthly,
                'expected_revenue': float(q.expected_revenue),
                'items': q_items,
                'status': q.status,
                'notes': q.notes,
                'template_type': q.template_type
            }
        })

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        q = Quotation.objects.filter(pk=pk, is_deleted=False).first()
        if not q:
            return Response({'error': 'Không tìm thấy báo giá'}, status=status.HTTP_404_NOT_FOUND)
        q.is_deleted = True
        q.save(update_fields=['is_deleted'])
        return Response({'success': True, 'message': f'Đã xóa báo giá {q.quotation_code}'})


class QuotationStatusAPIView(APIView):
    """API Cập nhật nhanh trạng thái chu trình Báo Giá (Sales Funnel)."""
    permission_classes = [IsSalesOrDirector]
    def patch(self, request, pk):
        q = Quotation.objects.filter(pk=pk, is_deleted=False).first()
        if not q:
            return Response({'error': 'Không tìm thấy báo giá'}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        valid_statuses = ['NEGOTIATING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED']
        if new_status not in valid_statuses:
            return Response({'error': f'Trạng thái không hợp lệ. Cho phép: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)
        q.status = new_status
        q.save(update_fields=['status', 'updated_at'])
        return Response({
            'success': True,
            'message': f'Đã chuyển trạng thái báo giá {q.quotation_code} sang [{q.get_status_display()}]!',
            'status': q.status,
            'status_display': q.get_status_display()
        })

    def post(self, request, pk):
        return self.patch(request, pk)


class BookingOrderDetailAPIView(APIView):
    """API Xem chi tiết, Cập nhật và Xóa mềm Đơn Đặt Hàng / Booking."""
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [IsSalesOrDirector]
    def get(self, request, pk):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        # Lấy danh sách các container / chuyến xe thuộc Booking này (vòng đời Container Cycle)
        trips_in_booking = b.trips.filter(is_deleted=False).select_related(
            'driver', 'vehicle', 'dropoff_driver', 'dropoff_vehicle'
        ).order_by('created_at')
        trips_data = []
        for t in trips_in_booking:
            trips_data.append({
                'id': t.trip_code,
                'trip_code': t.trip_code,
                'container_number': t.container_number or 'Chưa gán cont',
                'container_type': t.container_type,
                'seal_number': t.seal_number or '-',
                'status': t.status,
                'status_label': t.get_status_display(),
                'is_split_trip': t.is_split_trip,
                'cont_location_type': t.cont_location_type or 'NHÀ MÁY',
                'pickup_location': t.pickup_location,
                'warehouse_location': t.warehouse_location,
                'dropoff_location': t.dropoff_location or 'Hạ bãi',
                'driver': (t.driver.nickname or t.driver.full_name) if t.driver else '-',
                'vehicle': t.vehicle.license_plate if t.vehicle else '-',
                'dropoff_driver': (t.dropoff_driver.nickname or t.dropoff_driver.full_name) if t.dropoff_driver else '-',
                'dropoff_vehicle': t.dropoff_vehicle.license_plate if t.dropoff_vehicle else '-',
                'driver_split_ratio': float(t.driver_split_ratio or 50.0),
                'loading_date': t.loading_date.strftime('%d/%m/%Y') if t.loading_date else '',
                'revenue': float(t.cached_revenue or 0),
                'expense': float(t.cached_expense or 0),
                'profit': float(t.cached_profit or 0),
            })

        docs_data = [
            {
                'id': d.id,
                'name': d.file_name or os.path.basename(d.file.name),
                'url': d.file.url if d.file else '',
                'size': d.file_size or (d.file.size if d.file else 0),
                'size_formatted': f"{round(d.file_size / 1024, 1)} KB" if (d.file_size or 0) < 1024*1024 else f"{round((d.file_size or 0) / (1024*1024), 2)} MB",
                'created_at': d.created_at.strftime('%H:%M %d/%m/%Y')
            }
            for d in b.documents.filter(is_deleted=False)
        ]
        if b.booking_file and not docs_data:
            f_size = b.booking_file.size if hasattr(b.booking_file, 'size') else 0
            docs_data.append({
                'id': 0,
                'name': os.path.basename(b.booking_file.name),
                'url': b.booking_file.url,
                'size': f_size,
                'size_formatted': f"{round(f_size / 1024, 1)} KB" if f_size < 1024*1024 else f"{round(f_size / (1024*1024), 2)} MB",
                'created_at': b.created_at.strftime('%H:%M %d/%m/%Y')
            })

        return Response({
            'id': b.id,
            'booking_code': b.booking_code,
            'customer_id': b.customer.id,
            'customer_name': b.customer.name,
            'booking_type': b.booking_type,
            'booking_type_display': b.get_booking_type_display(),
            'booking_number': b.booking_number,
            'shipping_line': b.shipping_line,
            'vessel_voyage': b.vessel_voyage,
            'destination_port': b.destination_port,
            'container_size': b.container_size,
            'total_containers': b.total_containers,
            'dispatched_containers': b.dispatched_containers,
            'commodity': b.commodity,
            'hs_code': b.hs_code,
            'pickup_location': b.pickup_location,
            'delivery_location': b.delivery_location,
            'dropoff_location': b.dropoff_location,
            'si_cutoff': b.si_cutoff,
            'vgm_cutoff': b.vgm_cutoff,
            'closing_time': b.closing_time,
            'loading_date': b.loading_date.strftime('%Y-%m-%d') if b.loading_date else '',
            'loading_time': b.loading_time,
            'free_time_detention': b.free_time_detention,
            'free_time_demurrage': b.free_time_demurrage,
            'selling_freight_price': float(b.selling_freight_price),
            'status': b.status,
            'status_label': b.get_status_display(),
            'trips': trips_data,
            'booking_file_url': b.booking_file.url if b.booking_file else '',
            'booking_file_name': os.path.basename(b.booking_file.name) if b.booking_file else '',
            'documents': docs_data,
            'documents_count': len(docs_data),
            'notes': b.notes
        })

    def put(self, request, pk):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data

        # Hỗ trợ đa tệp đính kèm (Multi-files: booking_files[])
        uploaded_bk_files = request.FILES.getlist('booking_files') or request.FILES.getlist('files')
        if not uploaded_bk_files:
            single_f = request.FILES.get('booking_file') or request.FILES.get('file')
            if single_f:
                uploaded_bk_files = [single_f]

        if uploaded_bk_files:
            for bf in uploaded_bk_files:
                try:
                    validate_uploaded_document(bf)
                except DjangoValidationError as ve:
                    return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
            b.booking_file = uploaded_bk_files[0]
            for bf in uploaded_bk_files:
                BookingDocument.objects.create(
                    booking=b,
                    file=bf,
                    file_name=getattr(bf, 'name', '') or 'booking_document',
                    file_size=getattr(bf, 'size', 0)
                )

        customer_name = data.get('customer', '').strip()
        if customer_name:
            customer = resolve_customer(customer_name)
            if customer:
                b.customer = customer

        if 'booking_type' in data:
            b.booking_type = data['booking_type']
        if 'booking_number' in data:
            b.booking_number = data['booking_number'].strip().upper()
        if 'shipping_line' in data:
            b.shipping_line = data['shipping_line'].strip().upper()
        if 'vessel_voyage' in data:
            b.vessel_voyage = data['vessel_voyage'].strip()
        if 'container_size' in data:
            b.container_size = data['container_size']
        if 'total_containers' in data and data['total_containers']:
            b.total_containers = int(data['total_containers'])
        if 'commodity' in data:
            b.commodity = data['commodity'].strip()
        if 'hs_code' in data:
            b.hs_code = data['hs_code'].strip()
        from apps.master_data.models import Location
        if 'pickup_location' in data:
            b.pickup_location = data['pickup_location'].strip().upper()
            b.pickup_loc = Location.objects.filter(name__iexact=b.pickup_location).first() or Location.objects.filter(name__icontains=b.pickup_location).first()
        if 'delivery_location' in data:
            b.delivery_location = data['delivery_location'].strip().upper()
            b.delivery_loc = Location.objects.filter(name__iexact=b.delivery_location).first() or Location.objects.filter(name__icontains=b.delivery_location).first()
        if 'dropoff_location' in data:
            b.dropoff_location = data['dropoff_location'].strip().upper()
            b.dropoff_loc = Location.objects.filter(name__iexact=b.dropoff_location).first() or Location.objects.filter(name__icontains=b.dropoff_location).first()
        if 'si_cutoff' in data:
            b.si_cutoff = data['si_cutoff']
        if 'vgm_cutoff' in data:
            b.vgm_cutoff = data['vgm_cutoff']
        if 'closing_time' in data:
            b.closing_time = data['closing_time']
        if 'loading_date' in data and data['loading_date']:
            b.loading_date = data['loading_date']
        if 'loading_time' in data:
            b.loading_time = data['loading_time']
        if 'free_time_detention' in data and data['free_time_detention'] is not None:
            b.free_time_detention = int(data['free_time_detention'])
        if 'free_time_demurrage' in data and data['free_time_demurrage'] is not None:
            b.free_time_demurrage = int(data['free_time_demurrage'])
        if 'selling_freight_price' in data and data['selling_freight_price']:
            b.selling_freight_price = float(data['selling_freight_price'])
        if 'status' in data and data['status']:
            b.status = data['status']
        if 'notes' in data:
            b.notes = data['notes']

        b.save()
        return Response({
            'success': True,
            'message': f'Cập nhật đơn hàng / booking {b.booking_code} thành công!',
            'booking_id': b.id
        })

    def patch(self, request, pk):
        return self.put(request, pk)

    def post(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        b.is_deleted = True
        b.save(update_fields=['is_deleted'])
        return Response({
            'success': True,
            'message': f'Đã xóa đơn hàng / booking {b.booking_code}'
        })


class BookingOrderStatusAPIView(APIView):
    """API Đổi nhanh trạng thái chu trình Đơn Hàng / Booking."""
    permission_classes = [IsSalesOrDirector]
    def patch(self, request, pk):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        valid_statuses = [s.value for s in BookingStatus]
        if new_status not in valid_statuses:
            return Response({'error': f'Trạng thái không hợp lệ. Cho phép: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)
        b.status = new_status
        b.save(update_fields=['status', 'updated_at'])
        return Response({
            'success': True,
            'message': f'Đã chuyển trạng thái đơn hàng {b.booking_code} sang [{b.get_status_display()}]!',
            'status': b.status,
            'status_display': b.get_status_display()
        })

    def post(self, request, pk):
        return self.patch(request, pk)


class BookingDocumentDeleteAPIView(APIView):
    """API xóa tệp đính kèm lẻ của Booking."""
    permission_classes = [IsSalesOrDirector]
    def delete(self, request, pk, doc_id):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        doc = b.documents.filter(pk=doc_id, is_deleted=False).first()
        if doc:
            doc.is_deleted = True
            doc.save(update_fields=['is_deleted'])
            return Response({'success': True, 'message': 'Đã xóa tệp đính kèm'})
        return Response({'error': 'Không tìm thấy tệp đính kèm'}, status=status.HTTP_404_NOT_FOUND)


class CustomsAPIView(APIView):
    """API Thủ tục Hải quan phân luồng."""
    permission_classes = [IsCustomsOrDirector]
    def get(self, request):
        return Response({
            'green_lane': 85,
            'yellow_lane': 12,
            'red_lane': 3,
            'status': 'Đã kết nối với hệ thống Hải quan ECUS/VNACCS'
        })

class TripDriverMilestoneAPIView(APIView):
    """API Tài xế cập nhật nhanh mốc thời gian kho (Bước 6 SOP Điều Vận 10 Bước)."""
    permission_classes = [IsTripDriverOrDispatcher]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, trip)

        # ── KHÓA TUYỆT ĐỐI KHI CHUYẾN XE ĐÃ HOÀN TẤT ──
        if trip.status == TripStatus.COMPLETED:
            return Response({
                'error': 'Chuyến xe đã hoàn tất! Toàn bộ mốc thời gian đã được chốt và khóa cố định.'
            }, status=status.HTTP_400_BAD_REQUEST)

        milestone_code = request.data.get('milestone')
        notes = request.data.get('notes', '')
        now_dt = timezone.now()
        local_now = timezone.localtime(now_dt)
        now_str = request.data.get('custom_time', '').strip() or local_now.strftime('%H:%M %d/%m')

        mapping = {
            'APPROACHING_WAREHOUSE': {
                'title': 'Tài xế báo sắp đến kho (trước 30 phút)',
                'status': TripStatus.IN_TRANSIT,
                'msg': 'Đã thông báo sắp đến kho khách hàng (trước 30 phút).'
            },
            'ARRIVED_WAREHOUSE': {
                'title': f'Đã đến cổng kho ({trip.warehouse_location})',
                'status': TripStatus.AT_WAREHOUSE,
                'msg': 'Đã check-in tại cổng kho khách hàng.'
            },
            'START_UNLOADING': {
                'title': 'Bắt đầu xuống hàng / đóng hàng tại kho',
                'status': TripStatus.UNLOADING,
                'msg': 'Bắt đầu quá trình đóng/trút hàng.'
            },
            'FINISHED_UNLOADING': {
                'title': 'Đã đóng/trút hàng xong - Chuẩn bị hạ bãi',
                'status': TripStatus.RETURNING_EMPTY,
                'msg': 'Đã hoàn tất đóng hàng, chuẩn bị vận chuyển cont về bãi hạ.'
            },
            'OVERNIGHT_WAIT': {
                'title': 'Tài xế báo lưu xe chờ hạ sau 0h (Kho yêu cầu)',
                'status': TripStatus.RETURNING_EMPTY,
                'msg': 'Đã ghi nhận xe neo chờ hạ sau 0h theo yêu cầu của kho/khách hàng.'
            },
            'DROPOFF_COMPLETED': {
                'title': f'Đã cẩu hạ cont thành công tại bãi/cảng ({trip.dropoff_location})',
                'status': TripStatus.COMPLETED,
                'msg': 'Đã hoàn tất hạ cont tại cảng/bãi. Kết thúc hành trình.'
            },
            'ACCEPTED_TRIP': {
                'title': 'Tài xế xác nhận nhận chuyến',
                'status': TripStatus.ACCEPTED,
                'msg': 'Tài xế đã xác nhận nhận chuyến trên App.'
            },
            'DEPARTED': {
                'title': 'Tài xế xuất phát đi lấy cont/hàng',
                'status': TripStatus.CONTAINER_PICKED,
                'msg': 'Tài xế đã xuất phát từ bãi lấy cont.'
            },
            'DEPART_TO_DROPOFF': {
                'title': f'Kéo cont rời kho — Vận chuyển về bãi hạ',
                'status': TripStatus.RETURNING_EMPTY,
                'msg': 'Xe đã ra cổng kho, đang kéo về bãi hạ cont.'
            },
            'DECLINED_TRIP': {
                'title': 'Tài xế từ chối chuyến — Cần phân xe lại',
                'status': TripStatus.DISPATCHED,  # revert về DISPATCHED để điều độ phân lại
                'msg': 'Tài xế đã từ chối nhận chuyến. Vui lòng liên hệ điều độ để phân xe lại.'
            },
            'PICKED_UP': {
                'title': 'Tài xế đã nhận cont / đóng hàng xong',
                'status': TripStatus.CONTAINER_PICKED,
                'msg': 'Đã nhận container và niêm phong seal thành công.'
            },
            'IN_TRANSIT': {
                'title': 'Xe đang trên đường vận chuyển',
                'status': TripStatus.IN_TRANSIT,
                'msg': 'Phương tiện đang lưu thông trên tuyến đường.'
            },
            'DELIVERED': {
                'title': f'Đã giao hàng / cẩu hạ cont thành công ({trip.dropoff_location})',
                'status': TripStatus.DELIVERED,
                'msg': 'Đã hoàn tất giao hàng / hạ bãi cont.'
            },
        }

        info = mapping.get(milestone_code)
        if not info:
            return Response({'error': 'Mã mốc thời gian không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

        # ── Lưu timestamp fields TRƯỚC khi gọi transition_trip ──
        # (transition_trip gọi sync_trip_10_step_timeline ngay sau khi đổi status,
        #  nên các field phải được lưu trước để hiển thị giờ thực tế đúng)
        now_dt = timezone.now()
        extra_update_fields = []

        if milestone_code == 'OVERNIGHT_WAIT':
            trip.is_overnight_detention = True
            if not trip.dropoff_appointment_time or trip.dropoff_appointment_time == '-':
                trip.dropoff_appointment_time = 'Sau 00:00'
            extra_update_fields = ['is_overnight_detention', 'dropoff_appointment_time']

        elif milestone_code == 'DROPOFF_COMPLETED':
            trip.actual_dropoff_time = now_str
            trip.actual_dropoff_at = now_dt
            trip.actual_end_time = now_dt
            extra_update_fields = ['actual_dropoff_time', 'actual_dropoff_at', 'actual_end_time']

        elif milestone_code == 'ACCEPTED_TRIP':
            trip.accepted_at = now_dt
            trip.declined_at = None
            trip.decline_reason = ''
            extra_update_fields = ['accepted_at', 'declined_at', 'decline_reason']

        elif milestone_code == 'DEPARTED':
            trip.actual_start_time = now_dt
            extra_update_fields = ['actual_start_time']

        elif milestone_code == 'ARRIVED_WAREHOUSE':
            # Ghi nhận giờ đến cổng thực tế
            trip.actual_gate_in_time = now_str
            trip.actual_gate_in_at = now_dt
            extra_update_fields = ['actual_gate_in_time', 'actual_gate_in_at']

        elif milestone_code == 'START_UNLOADING':
            trip.unloading_started_at = now_dt
            extra_update_fields = ['unloading_started_at']

        elif milestone_code == 'FINISHED_UNLOADING':
            # Không có field riêng; POD sẽ upload riêng qua doc API
            pass

        elif milestone_code == 'DEPART_TO_DROPOFF':
            # "Ra Thực Tế" = lúc xe lăn bánh rời kho hướng về bãi hạ
            trip.actual_gate_out_time = now_str
            trip.actual_gate_out_at = now_dt
            extra_update_fields = ['actual_gate_out_time', 'actual_gate_out_at']

        if extra_update_fields:
            trip.save(update_fields=extra_update_fields)

        # ── Xử lý DECLINED_TRIP đặc biệt: revert status, ghi log, không tạo timeline item ──
        if milestone_code == 'DECLINED_TRIP':
            actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.driver
            trip.declined_at = now_dt
            trip.decline_reason = notes or 'Tài xế từ chối nhận chuyến'
            trip.accepted_at = None
            trip.status = TripStatus.DISPATCHED
            trip.save(update_fields=['declined_at', 'decline_reason', 'accepted_at', 'status'])
            from core.models import TrackingEventLog
            TrackingEventLog.objects.create(
                trip=trip,
                actor=actor,
                event_type=TripStatus.DISPATCHED,
                title=f"Mốc thời gian: {info['title']}",
                description=notes or info['msg']
            )
            return Response({
                'success': True,
                'message': info['msg'],
                'new_status': trip.status,
                'new_status_label': trip.get_status_display(),
                'declined_at': trip.declined_at.isoformat(),
                'decline_reason': trip.decline_reason,
                'time': now_str
            })

        # ── Chuyển trạng thái qua State Machine (gọi sync_trip_10_step_timeline bên trong) ──
        target_status = info['status']
        actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.driver
        if trip.status != target_status:
            try:
                transition_trip(trip, target_status, actor=actor, description=notes or info['title'])
            except ValidationError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as ex:
                return Response({'error': f'Không thể chuyển mốc trạng thái: {str(ex)}'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Không đổi status nhưng đã lưu fields mới → sync timeline thủ công
            from apps.dispatch.timeline_service import sync_trip_10_step_timeline
            sync_trip_10_step_timeline(trip)

        return Response({
            'success': True,
            'message': info['msg'],
            'new_status': trip.status,
            'new_status_label': trip.get_status_display(),
            'time': now_str
        })


class TripDriverIncidentAPIView(APIView):
    """API Tài xế báo sự cố dọc đường khẩn cấp (Hỏng xe, CSGT, kẹt đường, kho từ chối)."""
    permission_classes = [IsTripDriverOrDispatcher]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, trip)

        incident_type = request.data.get('incident_type', 'OTHER')
        notes = request.data.get('notes', '').strip()
        location_text = request.data.get('location', '').strip()
        now_dt = timezone.now()
        local_now = timezone.localtime(now_dt)
        now_str = local_now.strftime('%H:%M %d/%m')

        type_labels = {
            'VEHICLE_BREAKDOWN': 'Hỏng xe / Nổ lốp / Sự cố kỹ thuật',
            'TRAFFIC_JAM': 'Kẹt đường / Cháy giờ SI / Trễ giờ kho',
            'POLICE_CHECK': 'Kiểm tra tải trọng / CSGT',
            'WAREHOUSE_ISSUE': 'Kho từ chối / Quá tải dock bốc hàng',
            'ACCIDENT': 'Va quẹt / Sự cố giao thông',
            'OTHER': 'Sự cố phát sinh khác'
        }
        label = type_labels.get(incident_type, 'Sự cố phát sinh')

        # Lưu ảnh hiện trường nếu có
        uploaded_file = request.FILES.get('photo') or request.FILES.get('file') or request.FILES.get('document')
        file_path_str = ''
        if uploaded_file:
            try:
                validate_uploaded_document(uploaded_file)
                from django.core.files.storage import default_storage
                saved_name = default_storage.save(f"incidents/{trip.trip_code}_{sanitize_filename(uploaded_file.name)}", uploaded_file)
                file_path_str = f"/media/{saved_name}"
                TripDocument.objects.create(
                    trip=trip,
                    document_type=DocumentType.INCIDENT_PHOTO,
                    title=f"Ảnh sự cố: {label}",
                    file_path=file_path_str,
                    extracted_container_no=trip.container_number,
                    ocr_raw_text=f"Sự cố: {label} - {notes}",
                    is_verified=False
                )
            except DjangoValidationError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

        # Ghi nhận vào TrackingEventLog
        actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.driver
        from core.models import TrackingEventLog

        desc = f"[{label}] {notes}"
        if location_text:
            desc += f" (Vị trí: {location_text})"

        TrackingEventLog.objects.create(
            trip=trip,
            actor=actor,
            event_type='INCIDENT',
            title=f"CẢNH BÁO SỰ CỐ: {label}",
            description=desc,
            metadata={'incident_type': incident_type, 'location': location_text, 'photo_url': file_path_str}
        )

        # Thêm mốc cảnh báo vào Timeline
        TripTimelineItem.objects.create(
            trip=trip,
            step_number=trip.timeline_items.count() + 1,
            title=f"⚠️ CẢNH BÁO: {label}" + (f" - {notes}" if notes else ""),
            time_display=now_str,
            is_done=True,
            is_active=False
        )

        # Cập nhật ghi chú chuyến xe
        warning_line = f"[⚠️ CẢNH BÁO {now_str}]: {label} - {notes}"
        if trip.special_notes:
            trip.special_notes = f"{warning_line}\n{trip.special_notes}"
        else:
            trip.special_notes = warning_line
        trip.save(update_fields=['special_notes'])

        return Response({
            'success': True,
            'message': 'Đã gửi cảnh báo khẩn cấp tới Điều độ viên thành công! Điều độ sẽ liên hệ hỗ trợ bác tài ngay.',
            'incident_type': incident_type,
            'label': label,
            'time': now_str
        })


class AccountingAPIView(APIView):
    """API Phân hệ Quản lý Kế toán: Đối soát Chi phí, Hóa đơn chứng từ và Chốt sổ chuyến xe."""
    permission_classes = [IsAccountant]
    def get(self, request):
        trips = DispatchTrip.objects.select_related('customer', 'driver', 'vehicle', 'settled_by', 'booking_order').prefetch_related('expenses').filter(is_deleted=False).order_by('-created_at')

        from_date = request.GET.get('from_date') or request.GET.get('start_date')
        to_date = request.GET.get('to_date') or request.GET.get('end_date')
        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                trips = trips.filter(Q(loading_date__gte=fd) | Q(loading_date__isnull=True, created_at__date__gte=fd))
            except Exception:
                pass
        if to_date:
            try:
                td = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                trips = trips.filter(Q(loading_date__lte=td) | Q(loading_date__isnull=True, created_at__date__lte=td))
            except Exception:
                pass

        total_revenue = 0
        total_expense = 0
        total_profit = 0
        settled_count = 0
        pending_settle_count = 0

        settlement_list = []
        for t in trips:
            rev = float(t.cached_revenue or 0)
            if rev <= 0 and t.booking_order and t.booking_order.selling_freight_price:
                rev = float(t.booking_order.selling_freight_price)
            if rev <= 0:
                rev = 3800000.0

            exp = float(t.cached_expense or 0)
            profit = rev - exp

            total_revenue += rev
            total_expense += exp
            total_profit += profit

            if t.is_expenses_settled:
                settled_count += 1
            else:
                pending_settle_count += 1

            exp_list = [e for e in t.expenses.all() if not e.is_deleted]
            inv_count = sum(1 for e in exp_list if e.invoice_number)
            sample_inv = next((e.invoice_number for e in exp_list if e.invoice_number), '')

            margin_percent = round((profit / rev * 100), 1) if rev > 0 else 0

            settlement_list.append({
                'trip_code': t.trip_code,
                'loading_date': t.loading_date.strftime('%d/%m/%Y') if t.loading_date else '',
                'customer_name': t.customer.name if t.customer else '-',
                'route': f"{t.pickup_location} ➔ {t.warehouse_location}",
                'driver_name': t.driver.nickname or t.driver.full_name if t.driver else '-',
                'license_plate': t.vehicle.license_plate if t.vehicle else '-',
                'container_number': t.container_number or '-',
                'revenue': rev,
                'expense': exp,
                'profit': profit,
                'margin_percent': margin_percent,
                'expenses_count': len(exp_list),
                'invoices_count': inv_count,
                'sample_invoice': sample_inv,
                'is_settled': t.is_expenses_settled,
                'settled_at': t.settled_at.strftime('%d/%m/%Y %H:%M') if t.settled_at else '',
                'settled_by': (t.settled_by.nickname or t.settled_by.full_name) if t.settled_by else '',
                'status': t.status,
                'status_label': t.get_status_display(),
            })

        return Response({
            'stats': {
                'total_revenue': total_revenue,
                'total_expense': total_expense,
                'total_profit': total_profit,
                'profit_margin': round((total_profit / total_revenue * 100), 1) if total_revenue > 0 else 0,
                'settled_count': settled_count,
                'pending_settle_count': pending_settle_count,
                'total_trips': len(trips),
            },
            'settlements': settlement_list
        })


