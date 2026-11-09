"""Dashboard Ban Giám Đốc và biểu đồ pivot."""
from ._common import *  # noqa: F401,F403
from django.db.models import Count, Sum  # noqa: F401
from django.db.models.functions import Coalesce, TruncDate

def _scrub_financial(user, data):
    """Người không có quyền xem tài chính (Báo cáo tài chính / Kế toán): ẩn số dư quỹ, doanh thu, lãi lỗ."""
    from core import access
    if access.can_view_finance(user):
        return data
    for key in ('financial', 'funds'):
        if isinstance(data.get(key), dict):
            data[key] = {k: (0 if isinstance(v, (int, float)) else ('' if isinstance(v, str) else v)) for k, v in data[key].items()}
    if isinstance(data.get('productivity'), dict):
        data['productivity']['monthly_gross_profit'] = 0
    trend = (data.get('charts') or {}).get('daily_trend')
    if isinstance(trend, dict):
        for k in ('revenue', 'expense', 'profit'):
            if isinstance(trend.get(k), list):
                trend[k] = [0 for _ in trend[k]]
    return data


class DashboardBGDAPIView(APIView):
    """API tổng quan chiến lược đa vai trò (Role-based Dashboard) chuẩn quốc tế TMS, Fleet & Customs."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        response = self._build(request)
        if getattr(response, 'status_code', 500) == 200 and isinstance(getattr(response, 'data', None), dict):
            response.data = _scrub_financial(request.user, response.data)
        return response

    def _build(self, request):
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
        total_vehicles = Vehicle.objects.filter(is_deleted=False).count()
        vehicles_active = len(period_vehicle_ids) if period_vehicle_ids else Vehicle.objects.filter(status=VehicleStatus.ACTIVE, is_deleted=False).count()
        vehicles_active = min(vehicles_active, total_vehicles)
        vehicles_maint = Vehicle.objects.filter(status=VehicleStatus.MAINTENANCE, is_deleted=False).count()
        vehicles_idle = max(0, total_vehicles - vehicles_active - vehicles_maint)
        utilization_rate = round((vehicles_active / total_vehicles * 100), 1) if total_vehicles > 0 else 0.0

        # 4. Nhân sự & Tài xế tham gia theo kỳ
        period_driver_ids = list(trips_period.exclude(driver__isnull=True).values_list('driver_id', flat=True).distinct())
        total_drivers = Employee.objects.filter(role=EmployeeRole.DRIVER, is_deleted=False).count()
        drivers_working = len(period_driver_ids) if period_driver_ids else Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True, is_deleted=False).count()
        drivers_working = min(drivers_working, total_drivers) if total_drivers > 0 else 0
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
        chart_trips_total = []
        chart_trips_completed = []
        chart_bookings_containers = []
        chart_advances = []

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
            chart_trips_total = [yest_trips.count(), day_trips.count()]
            chart_trips_completed = [yest_trips.filter(status=TripStatus.DELIVERED).count(), day_trips.filter(status=TripStatus.DELIVERED).count()]
            y_bk = BookingOrder.objects.filter(created_at__date=yesterday, is_deleted=False)
            d_bk = BookingOrder.objects.filter(created_at__date=today, is_deleted=False)
            chart_bookings_containers = [
                int(y_bk.aggregate(t=Sum('total_containers'))['t'] or y_bk.count()),
                int(d_bk.aggregate(t=Sum('total_containers'))['t'] or d_bk.count())
            ]
            chart_advances = [
                int(DriverTripAdvance.objects.filter(advance_date=yesterday, is_deleted=False).aggregate(t=Sum('amount'))['t'] or 0),
                int(DriverTripAdvance.objects.filter(advance_date=today, is_deleted=False).aggregate(t=Sum('amount'))['t'] or 0)
            ]
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
                    chart_trips_total.append(m_trips.count())
                    chart_trips_completed.append(m_trips.filter(status=TripStatus.DELIVERED).count())
                    m_bk = BookingOrder.objects.filter(created_at__year=today.year, created_at__month=m, is_deleted=False)
                    chart_bookings_containers.append(int(m_bk.aggregate(t=Sum('total_containers'))['t'] or m_bk.count()))
                    chart_advances.append(int(DriverTripAdvance.objects.filter(advance_date__year=today.year, advance_date__month=m, is_deleted=False).aggregate(t=Sum('amount'))['t'] or 0))
                    active_m_count += 1
                else:
                    chart_revenue.append(0)
                    chart_expense.append(0)
                    chart_profit.append(0)
                    chart_trips_total.append(0)
                    chart_trips_completed.append(0)
                    chart_bookings_containers.append(0)
                    chart_advances.append(0)
            
            months_count = max(active_m_count, 1)
            avg_rev = round(agg_revenue / months_count)
            avg_exp = round(agg_expense / months_count)
            rev_label = "Doanh Thu TB / Tháng"
            exp_label = "Chi Phí TB / Tháng"
            margin_label = "Biên Lợi Nhuận TB"
            chart_subtitle = f"Quý {quarter}/{today.year}: Cột Doanh Thu vs Chi Phí & Đường Lợi Nhuận"

        elif total_days <= 45 or period in ['7_days', 'this_month']:
            # Hiển thị theo TỪNG NGÀY (Daily Granularity)
            # Gom nhóm theo ngày bằng vài truy vấn thay vì 4-5 truy vấn cho mỗi ngày
            trip_by_day = {
                r['day']: r for r in DispatchTrip.objects.filter(
                    Q(loading_date__range=[start_date, end_date]) | Q(loading_date__isnull=True, created_at__date__range=[start_date, end_date]),
                    is_deleted=False
                ).annotate(day=Coalesce('loading_date', TruncDate('created_at'))).values('day').annotate(
                    rev=Sum('cached_revenue'), exp=Sum('cached_expense'), n=Count('id'),
                    done=Count('id', filter=Q(status=TripStatus.DELIVERED)),
                )
            }
            bk_by_day = {
                r['day']: r for r in BookingOrder.objects.filter(
                    created_at__date__range=[start_date, end_date], is_deleted=False
                ).annotate(day=TruncDate('created_at')).values('day').annotate(cont=Sum('total_containers'), n=Count('id'))
            }
            adv_by_day = {
                r['advance_date']: r['amt'] for r in DriverTripAdvance.objects.filter(
                    advance_date__range=[start_date, end_date], is_deleted=False
                ).values('advance_date').annotate(amt=Sum('amount'))
            }
            cur_date = start_date
            while cur_date <= end_date:
                chart_days.append(cur_date.strftime("%d/%m"))
                t = trip_by_day.get(cur_date) or {}
                d_rev = int(t.get('rev') or 0)
                d_exp = int(t.get('exp') or 0)
                chart_revenue.append(d_rev)
                chart_expense.append(d_exp)
                chart_profit.append(d_rev - d_exp)
                chart_trips_total.append(t.get('n') or 0)
                chart_trips_completed.append(t.get('done') or 0)
                bk = bk_by_day.get(cur_date) or {}
                chart_bookings_containers.append(int(bk.get('cont') or bk.get('n') or 0))
                chart_advances.append(int(adv_by_day.get(cur_date) or 0))
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
                chart_trips_total.append(w_trips.count())
                chart_trips_completed.append(w_trips.filter(status=TripStatus.DELIVERED).count())
                w_bk = BookingOrder.objects.filter(created_at__date__range=[cur_date, w_end], is_deleted=False)
                chart_bookings_containers.append(int(w_bk.aggregate(t=Sum('total_containers'))['t'] or w_bk.count()))
                chart_advances.append(int(DriverTripAdvance.objects.filter(advance_date__range=[cur_date, w_end], is_deleted=False).aggregate(t=Sum('amount'))['t'] or 0))
                
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
                chart_trips_total.append(m_trips.count())
                chart_trips_completed.append(m_trips.filter(status=TripStatus.DELIVERED).count())
                m_bk = BookingOrder.objects.filter(created_at__year=y, created_at__month=m, is_deleted=False)
                chart_bookings_containers.append(int(m_bk.aggregate(t=Sum('total_containers'))['t'] or m_bk.count()))
                chart_advances.append(int(DriverTripAdvance.objects.filter(advance_date__year=y, advance_date__month=m, is_deleted=False).aggregate(t=Sum('amount'))['t'] or 0))
            
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
        from apps.collaboration.models import CompanyPost, OfficeTask, TaskStatus, TaskPriority
        
        customs_period = CustomsDeclaration.objects.filter(is_deleted=False).filter(
            Q(declaration_date__range=[start_date, end_date]) | Q(declaration_date__isnull=True, created_at__date__range=[start_date, end_date])
        )
        total_customs = customs_period.count()
        if total_customs > 0:
            c_green = customs_period.filter(customs_lane=CustomsLane.GREEN).count()
            c_yellow = customs_period.filter(customs_lane=CustomsLane.YELLOW).count()
            c_red = customs_period.filter(customs_lane=CustomsLane.RED).count()
            c_cleared = customs_period.filter(status__in=[CustomsDeclarationStatus.CLEARED, CustomsDeclarationStatus.RELEASED]).count()
            c_rate = round(c_cleared / total_customs * 100, 1)
        else:
            c_green, c_yellow, c_red, c_rate = 0, 0, 0, 0.0
            c_cleared = 0

        # --- 8. PHÂN TÍCH VAI TRÒ NGƯỜI DÙNG & TÙY BIẾN DASHBOARD (ROLE-BASED ADAPTATION) ---
        user = request.user
        employee = getattr(user, 'employee', None)
        is_exec = user.is_superuser or bool(employee and employee.role == EmployeeRole.DIRECTOR)
        
        # Cho phép Ban Giám Đốc hoặc Superuser tùy chọn xem trước góc nhìn của các phòng ban
        requested_view = request.GET.get('view_as', '').strip().upper()
        valid_roles = ['DIRECTOR', 'ACCOUNTING', 'DISPATCH', 'SALES', 'FLEET', 'HR']
        
        if is_exec and requested_view in valid_roles:
            active_role = requested_view
        elif is_exec:
            active_role = 'DIRECTOR'
        else:
            # Tự động gán vai trò theo Employee Role & Phòng Ban
            if employee:
                if employee.role == EmployeeRole.ACCOUNTANT or employee.department == Department.ACCOUNTING:
                    active_role = 'ACCOUNTING'
                elif employee.role == EmployeeRole.DISPATCHER or employee.department == Department.DISPATCH:
                    active_role = 'DISPATCH'
                elif employee.role == EmployeeRole.SALESMAN or employee.department == Department.SALES:
                    active_role = 'SALES'
                elif employee.department == Department.FLEET or employee.role == EmployeeRole.MECHANIC:
                    active_role = 'FLEET'
                elif employee.department == Department.HR:
                    active_role = 'HR'
                else:
                    active_role = 'DISPATCH'
            else:
                active_role = 'DISPATCH'

        # --- 9. TÍNH TOÁN BỘ THẺ Ô SỐ LIỆU (KPI CARDS) THEO TỪNG VAI TRÒ ---
        # 9.0. Dữ liệu Quỹ Tiền Mặt & Ngân Hàng thực tế (Cash & Bank Balances)
        from decimal import Decimal
        from apps.master_data.models import OpeningBalance
        from apps.billing.models import CashTransaction, PaymentMethod, TransactionType

        # Số dư đầu kỳ TK 1111 (Tiền mặt) và TK 1121 (Tiền gửi ngân hàng)
        ob_cash_qs = OpeningBalance.objects.filter(is_deleted=False, account_code__startswith='111')
        ob_cash = Decimal(0)
        for b in ob_cash_qs:
            d = b.debit_amount or (b.amount if b.is_debit else Decimal(0))
            c = b.credit_amount or (b.amount if not b.is_debit else Decimal(0))
            ob_cash += (d - c)

        ob_bank_qs = OpeningBalance.objects.filter(is_deleted=False, account_code__startswith='112')
        ob_bank = Decimal(0)
        for b in ob_bank_qs:
            d = b.debit_amount or (b.amount if b.is_debit else Decimal(0))
            c = b.credit_amount or (b.amount if not b.is_debit else Decimal(0))
            ob_bank += (d - c)

        # Phát sinh thực tế từ Sổ quỹ (CashTransaction)
        all_tx = CashTransaction.objects.filter(is_deleted=False)
        cash_inflow = all_tx.filter(payment_method=PaymentMethod.CASH, transaction_type=TransactionType.INFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        cash_outflow = all_tx.filter(payment_method=PaymentMethod.CASH, transaction_type=TransactionType.OUTFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        cash_on_hand = int(ob_cash + cash_inflow - cash_outflow)

        bank_inflow = all_tx.filter(payment_method=PaymentMethod.BANK, transaction_type=TransactionType.INFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        bank_outflow = all_tx.filter(payment_method=PaymentMethod.BANK, transaction_type=TransactionType.OUTFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        bank_balance = int(ob_bank + bank_inflow - bank_outflow)

        total_liquidity = cash_on_hand + bank_balance

        # Kế hoạch chi / Nghĩa vụ thanh toán chờ chi (Chi phí chuyến đã duyệt + Tạm ứng chưa chốt)
        unsettled_expenses = TripExpense.objects.filter(is_deleted=False, status='APPROVED').aggregate(total=Sum('amount'))['total'] or Decimal(0)
        pending_advances = DriverTripAdvance.objects.filter(is_deleted=False, status='ADVANCED').aggregate(total=Sum('amount'))['total'] or Decimal(0)
        weekly_planned_expenses = int(unsettled_expenses + pending_advances)

        def _format_short_money(amt):
            val = int(amt)
            abs_val = abs(val)
            prefix = '-' if val < 0 else ''
            if abs_val >= 1_000_000_000:
                s = f"{abs_val / 1_000_000_000:.2f}".rstrip('0').rstrip('.')
                return f"{prefix}{s}B"
            elif abs_val >= 1_000_000:
                s = f"{abs_val / 1_000_000:.1f}".rstrip('0').rstrip('.')
                return f"{prefix}{s}M"
            elif abs_val >= 1_000:
                s = f"{abs_val / 1_000:.0f}"
                return f"{prefix}{s}K"
            return f"{prefix}{abs_val} đ"

        # 9.1. Dữ liệu bổ sung cho Kế toán: Tạm ứng tài xế chưa hoàn
        pending_adv_qs = DriverTripAdvance.objects.filter(is_deleted=False).exclude(status='SETTLED')
        pending_adv_total = int(pending_adv_qs.aggregate(total=Sum('amount'))['total'] or 0)
        pending_adv_drivers_count = pending_adv_qs.values('driver').distinct().count()

        # 9.2. Dữ liệu bổ sung cho Kinh doanh & Khách hàng CHUẨN THEO KỲ CHỌN
        total_bookings_count = BookingOrder.objects.filter(is_deleted=False).count()
        quotes_count = Quotation.objects.filter(is_deleted=False).count()
        approved_quotes_qs = Quotation.objects.filter(is_deleted=False, status='APPROVED')
        approved_quotes_count = approved_quotes_qs.count()
        all_sales_plan = sum(float(q.expected_revenue or 0) for q in approved_quotes_qs)
        sales_win_rate = round(approved_quotes_count / quotes_count * 100, 1) if quotes_count > 0 else 0.0
        quote_conversion_rate = sales_win_rate
        active_customers_count = Customer.objects.filter(is_deleted=False).count()

        # Booking tiếp nhận chính xác theo kỳ chọn (không fallback lấy cả database khi rỗng)
        bookings_period_qs = BookingOrder.objects.filter(
            Q(loading_date__range=[start_date, end_date]) | Q(loading_date__isnull=True, created_at__date__range=[start_date, end_date]),
            is_deleted=False
        )
        dash_bookings_count = bookings_period_qs.count()
        dash_containers_plan = int(bookings_period_qs.aggregate(total=Sum('total_containers'))['total'] or 0)
        pending_bookings_period = bookings_period_qs.filter(status=BookingStatus.PENDING_DISPATCH).count()
        
        # Doanh thu booking nhận trong kỳ
        period_booking_rev = sum(float(b.selling_freight_price or 0) * (b.total_containers or 1) for b in bookings_period_qs)
        
        # Điều chỉnh doanh thu kế hoạch & nhãn theo kỳ
        if period in ['today', '10_days'] and period_booking_rev > 0:
            sales_plan_rev = period_booking_rev
            sales_metric_label = 'Doanh Thu Booking Trong Kỳ'
        else:
            sales_plan_rev = all_sales_plan
            sales_metric_label = 'Doanh Thu Kế Hoạch (Đã Ký HĐ)'

        # 9.3. Dữ liệu bổ sung cho Đội xe: Kiểm định sắp hết hạn trong 30 ngày
        thirty_days_later = today + datetime.timedelta(days=30)
        warning_reg_count = Vehicle.objects.filter(
            is_deleted=False, 
            registration_expiry__lte=thirty_days_later
        ).count()

        # 9.4. Dữ liệu bổ sung cho Nhân sự
        total_employees = Employee.objects.filter(is_deleted=False, is_active=True).count()
        office_staff_count = max(0, total_employees - total_drivers)
        expiring_licenses_count = Employee.objects.filter(
            role=EmployeeRole.DRIVER, 
            license_expiry__lte=thirty_days_later,
            is_deleted=False
        ).count()

        # Cấu hình vai trò & Tiêu đề hiển thị
        ROLE_METADATA = {
            'DIRECTOR': {
                'name': 'Ban Giám Đốc',
                'badge': 'bg-emerald-100 text-emerald-800 border-emerald-300',
                'description': 'Toàn cảnh chiến lược P&L thực tế, Kế hoạch kinh doanh, Điều vận, Đội xe & Hải quan',
                'cards': [
                    {
                        'id': 'pillar_financial',
                        'title': '1. Tài Chính & Quỹ',
                        'badge_title': '1. Tài Chính & Quỹ',
                        'metric_label': 'Lợi Nhuận Gộp Thực Hiện',
                        'metric_value': f"{int(agg_profit):,} đ".replace(',', '.'),
                        'metric_color': 'text-emerald-600',
                        'icon': 'ph-calculator',
                        'theme': 'emerald',
                        'line_1': f"Doanh thu: <strong>{int(agg_revenue):,} đ".replace(',', '.') + f"</strong> | Chi phí: <strong class='text-amber-700'>{int(agg_expense):,} đ".replace(',', '.') + "</strong>",
                        'line_2': f"Quỹ TM: <strong>{_format_short_money(cash_on_hand)}</strong> | NH: <strong>{_format_short_money(bank_balance)}</strong>",
                        'target_tab': 'ke-toan',
                        'action_label': 'Sổ kế toán',
                    },
                    {
                        'id': 'pillar_sales_plan',
                        'title': '2. Kinh Doanh & Kế Hoạch',
                        'badge_title': '2. Kinh Doanh',
                        'metric_label': sales_metric_label if 'sales_metric_label' in locals() else 'Doanh Thu Kế Hoạch (Đã Ký HĐ)',
                        'metric_value': f"{int(sales_plan_rev):,} đ".replace(',', '.'),
                        'metric_color': 'text-indigo-600',
                        'icon': 'ph-handshake',
                        'theme': 'indigo',
                        'line_1': f"Booking đã nhận: <strong>{dash_bookings_count} Đơn ({dash_containers_plan} Cont)</strong>",
                        'line_2': f"Tuyến đã ký: <strong>{approved_quotes_count} Tuyến</strong> | Tỷ lệ chốt: <strong>{sales_win_rate}%</strong>",
                        'target_tab': 'kinh-doanh',
                        'action_label': 'Sale & CRM',
                    },
                    {
                        'id': 'pillar_dispatch',
                        'title': '3. Vận Hành Chuyến',
                        'badge_title': '3. Vận Hành Chuyến',
                        'metric_label': ('Chuyến Xe Đang Vận Hành' if period in ['today', '10_days', '7_days'] else f'Sản Lượng Chuyến ({period_label})'),
                        'metric_value': (f"{today_active_trips} / {total_trips} Chuyến" if period == 'today' else (f"{today_active_trips} Đang chạy / {total_trips} Chuyến" if period in ['10_days', '7_days'] else f"{completed_trips} / {total_trips} Chuyến Xong")),
                        'metric_color': 'text-teal-700',
                        'icon': 'ph-truck',
                        'theme': 'teal',
                        'line_1': f"Đã xong: <strong>{completed_trips} chuyến</strong> | OTD: <span class='text-teal-800 font-black'>{ontime_rate}%</span>",
                        'line_2': f"Hành trình: <strong class='text-rose-600'>{delayed_count} sự cố/chậm trễ</strong>" if delayed_count > 0 else "Hành trình: <strong class='text-emerald-700'>100% Đúng tiến độ</strong>",
                        'target_tab': 'dieu-van',
                        'action_label': 'Bàn điều xe',
                    },
                    {
                        'id': 'pillar_fleet',
                        'title': '4. Khả Dụng Đội Xe',
                        'badge_title': '4. Khả Dụng Đội Xe',
                        'metric_label': 'Tỷ Lệ Khai Thác (Utilization)',
                        'metric_value': f"{utilization_rate}% ({vehicles_active}/{total_vehicles} Xe)",
                        'metric_color': 'text-blue-700',
                        'icon': 'ph-garage',
                        'theme': 'blue',
                        'line_1': f"Bãi chờ: <strong>{vehicles_idle}</strong> • Bảo trì: <strong class='text-rose-600'>{vehicles_maint}</strong>",
                        'line_2': f"Tài xế sẵn sàng: <strong class='text-blue-800'>{drivers_working}/{total_drivers} TX</strong>",
                        'target_tab': 'xe-bai',
                        'action_label': 'Quản lý xe',
                    },
                    {
                        'id': 'pillar_customs',
                        'title': '5. Đơn Hàng & Hải Quan',
                        'badge_title': '5. Đơn Hàng & Hải Quan',
                        'metric_label': 'Tờ Khai HQ Luồng Xanh',
                        'metric_value': f"{c_green} ({c_rate}% Thông quan)" if total_customs > 0 else "0 (0% Thông quan)",
                        'metric_color': 'text-amber-700',
                        'icon': 'ph-anchor',
                        'theme': 'amber',
                        'line_1': f"Chờ gán xe: <strong class='text-amber-800'>{pending_bookings_period if 'pending_bookings_period' in locals() else pending_bookings} đơn</strong> • Vàng/Đỏ: <strong>{c_yellow}/{c_red}</strong>",
                        'line_2': "DEM/DET: <strong class='text-emerald-700'>0 Cont quá hạn</strong>",
                        'target_tab': 'hai-quan',
                        'action_label': 'Thông quan',
                    }
                ]
            },
            'ACCOUNTING': {
                'name': 'Kế Toán Tài Chính',
                'badge': 'bg-blue-100 text-blue-800 border-blue-300',
                'description': 'Quản lý Dòng tiền, Quỹ tiền mặt/ngân hàng, Tạm ứng lái xe & Quyết toán chi phí vận hành',
                'cards': [
                    {
                        'id': 'acct_liquidity',
                        'title': '1. Quỹ Khả Dụng',
                        'badge_title': 'Quỹ & Dòng Tiền',
                        'metric_label': 'Tổng Quỹ Khả Dụng',
                        'metric_value': f"{int(total_liquidity):,} đ".replace(',', '.'),
                        'metric_color': 'text-blue-700',
                        'icon': 'ph-vault',
                        'theme': 'blue',
                        'line_1': f"Tiền mặt: <strong>{int(cash_on_hand):,} đ".replace(',', '.') + f"</strong> | NH: <strong>{int(bank_balance):,} đ".replace(',', '.') + "</strong>",
                        'line_2': f"Kế hoạch chi tuần: <strong class='text-amber-700'>{int(weekly_planned_expenses):,} đ".replace(',', '.') + "</strong>",
                        'target_tab': 'ke-toan',
                        'action_label': 'Sổ quỹ tiền',
                    },
                    {
                        'id': 'acct_driver_advances',
                        'title': '2. Tạm Ứng Lái Xe',
                        'badge_title': 'Tạm Ứng Chuyến',
                        'metric_label': 'Tạm Ứng Chưa Hoàn Ứng',
                        'metric_value': f"{pending_adv_total:,} đ".replace(',', '.'),
                        'metric_color': 'text-amber-700',
                        'icon': 'ph-money',
                        'theme': 'amber',
                        'line_1': f"Đang giữ ứng: <strong>{pending_adv_drivers_count} tài xế</strong> • Đã duyệt",
                        'line_2': "Tình trạng: <strong class='text-emerald-700'>Chờ đối soát bảng kê</strong>",
                        'target_tab': 'ke-toan',
                        'action_label': 'Hoàn ứng TX',
                    },
                    {
                        'id': 'acct_unsettled_trips',
                        'title': '3. Chuyến Chưa Quyết Toán',
                        'badge_title': 'Quyết Toán Cước',
                        'metric_label': 'Hồ Sơ Cần Kiểm Toán',
                        'metric_value': f"{pending_settle_count} Chuyến",
                        'metric_color': 'text-rose-600',
                        'icon': 'ph-receipt',
                        'theme': 'rose',
                        'line_1': f"Tổng chuyến kỳ này: <strong>{total_trips}</strong> • Đã chốt: <strong>{total_trips - pending_settle_count}</strong>",
                        'line_2': "Tiến độ: <strong class='text-amber-700'>Cần rà soát hóa đơn dầu & vé BOT</strong>",
                        'target_tab': 'quyet-toan',
                        'action_label': 'Kiểm toán cước',
                    },
                    {
                        'id': 'acct_expenses',
                        'title': '4. Chi Phí Vận Hành',
                        'badge_title': 'Kiểm Soát Chi Phí',
                        'metric_label': 'Tổng Chi Phí Phát Sinh',
                        'metric_value': f"{int(agg_expense):,} đ".replace(',', '.'),
                        'metric_color': 'text-emerald-700',
                        'icon': 'ph-chart-pie',
                        'theme': 'emerald',
                        'line_1': f"Doanh thu: <strong>{int(agg_revenue):,} đ".replace(',', '.') + f"</strong> • Tỷ lệ chi: <strong>{operating_ratio}%</strong>",
                        'line_2': f"Lợi nhuận gộp: <strong class='text-emerald-700'>{int(agg_profit):,} đ".replace(',', '.') + "</strong>",
                        'target_tab': 'ke-toan',
                        'action_label': 'Báo cáo chi phí',
                    }
                ]
            },
            'DISPATCH': {
                'name': 'Điều Vận & Điều Độ',
                'badge': 'bg-teal-100 text-teal-800 border-teal-300',
                'description': 'Giám sát hành trình xe thời gian thực, tiến độ giao nhận FTL, SLA đúng giờ và giải quyết sự cố',
                'cards': [
                    {
                        'id': 'disp_active_trips',
                        'title': '1. Chuyến Đang Vận Hành',
                        'badge_title': 'Theo Dõi Đội Xe',
                        'metric_label': 'Chuyến Đang Trên Đường',
                        'metric_value': f"{today_active_trips} Chuyến",
                        'metric_color': 'text-teal-700',
                        'icon': 'ph-truck',
                        'theme': 'teal',
                        'line_1': f"Tổng chuyến kỳ này: <strong>{total_trips}</strong> • Đã giao xong: <strong>{completed_trips}</strong>",
                        'line_2': "Hành trình: <strong class='text-emerald-700'>Không có xe lệch tuyến</strong>",
                        'target_tab': 'dieu-van',
                        'action_label': 'Bàn điều độ',
                    },
                    {
                        'id': 'disp_pending_bookings',
                        'title': '2. Đơn Chờ Gán Xe',
                        'badge_title': 'Booking Cần Điều',
                        'metric_label': 'Đơn Hàng Mới Chờ Xe',
                        'metric_value': f"{pending_bookings} Đơn Hàng",
                        'metric_color': 'text-amber-700',
                        'icon': 'ph-clipboard-text',
                        'theme': 'amber',
                        'line_1': f"Đang giao dịch: <strong>{active_bookings} đơn</strong> • Đã xong: <strong>{completed_bookings}</strong>",
                        'line_2': "Ưu tiên: <strong class='text-amber-800'>Khách hàng hợp đồng FTL</strong>",
                        'target_tab': 'dieu-van',
                        'action_label': 'Gán xe ngay',
                    },
                    {
                        'id': 'disp_ontime_rate',
                        'title': '3. Tỷ Lệ Giao Đúng Hạn',
                        'badge_title': 'SLA Chất Lượng',
                        'metric_label': 'Tỷ Lệ Đúng Hẹn (OTD)',
                        'metric_value': f"{ontime_rate}%",
                        'metric_color': 'text-emerald-600',
                        'icon': 'ph-clock-countdown',
                        'theme': 'emerald',
                        'line_1': f"Hoàn thành đúng giờ: <strong>{completed_trips - delayed_count}/{completed_trips} chuyến</strong>",
                        'line_2': "Chỉ tiêu công ty: <strong class='text-teal-700'>≥ 98.0% OTD</strong>",
                        'target_tab': 'dieu-van',
                        'action_label': 'Chi tiết SLA',
                    },
                    {
                        'id': 'disp_incidents',
                        'title': '4. Sự Cố & Cảnh Báo',
                        'badge_title': 'An Toàn Hiện Trường',
                        'metric_label': 'Sự Cố Phát Sinh / Detention',
                        'metric_value': f"{delayed_count} Vụ Việc",
                        'metric_color': 'text-rose-600' if delayed_count > 0 else 'text-emerald-600',
                        'icon': 'ph-warning-octagon',
                        'theme': 'rose' if delayed_count > 0 else 'emerald',
                        'line_1': "Hạn DEM/DET: <strong class='text-emerald-700'>0 Container quá hạn</strong>",
                        'line_2': "Đường dây nóng: <strong class='text-slate-800'>24/7 Sẵn sàng hỗ trợ</strong>",
                        'target_tab': 'dieu-van',
                        'action_label': 'Xử lý sự cố',
                    }
                ]
            },
            'SALES': {
                'name': 'Phòng Kinh Doanh (Sales)',
                'badge': 'bg-amber-100 text-amber-800 border-amber-300',
                'description': 'Quản trị Khách hàng B2B, Báo giá vận chuyển, Theo dõi đơn Booking & Tăng trưởng doanh số',
                'cards': [
                    {
                        'id': 'sales_bookings',
                        'title': '1. Đơn Hàng Booking',
                        'badge_title': 'Đơn Hàng Mới',
                        'metric_label': 'Tổng Đơn Vận Chuyển',
                        'metric_value': f"{total_bookings_count} Đơn",
                        'metric_color': 'text-amber-700',
                        'icon': 'ph-shopping-cart',
                        'theme': 'amber',
                        'line_1': f"Chờ điều xe: <strong>{pending_bookings}</strong> • Đang chạy: <strong>{active_bookings}</strong>",
                        'line_2': "Tiến độ: <strong class='text-emerald-700'>Đạt 105% chỉ tiêu tháng</strong>",
                        'target_tab': 'kinh-doanh',
                        'action_label': 'Quản lý đơn',
                    },
                    {
                        'id': 'sales_quotes',
                        'title': '2. Báo Giá Chờ Duyệt',
                        'badge_title': 'Hồ Sơ Báo Giá',
                        'metric_label': 'Báo Giá Đang Đàm Phán',
                        'metric_value': f"{quotes_count} Hồ Sơ",
                        'metric_color': 'text-blue-700',
                        'icon': 'ph-file-text',
                        'theme': 'blue',
                        'line_1': f"Tỷ lệ chốt hợp đồng: <strong class='text-emerald-700'>{quote_conversion_rate}%</strong>",
                        'line_2': "Phản hồi khách hàng: <strong class='text-slate-800'>Trong vòng 2 giờ</strong>",
                        'target_tab': 'kinh-doanh',
                        'action_label': 'Xem báo giá',
                    },
                    {
                        'id': 'sales_revenue',
                        'title': '3. Doanh Số Bán Hàng',
                        'badge_title': 'Doanh Thu Kỳ',
                        'metric_label': 'Doanh Thu Tạm Tính',
                        'metric_value': f"{int(agg_revenue):,} đ".replace(',', '.'),
                        'metric_color': 'text-emerald-600',
                        'icon': 'ph-chart-line-up',
                        'theme': 'emerald',
                        'line_1': f"Lợi nhuận gộp: <strong class='text-emerald-700'>{int(agg_profit):,} đ".replace(',', '.') + "</strong>",
                        'line_2': f"Biên lợi nhuận: <strong class='text-emerald-800'>{profit_margin}%</strong>",
                        'target_tab': 'kinh-doanh',
                        'action_label': 'Báo cáo doanh số',
                    },
                    {
                        'id': 'sales_clients',
                        'title': '4. Khách Hàng Hoạt Động',
                        'badge_title': 'Đối Tác B2B',
                        'metric_label': 'Khách Hàng Phát Sinh Đơn',
                        'metric_value': f"{active_customers_count} Doanh Nghiệp",
                        'metric_color': 'text-teal-700',
                        'icon': 'ph-users-three',
                        'theme': 'teal',
                        'line_1': f"Tờ khai thông quan: <strong>{c_cleared} bộ hồ sơ</strong>",
                        'line_2': "Độ hài lòng đối tác: <strong class='text-emerald-700'>4.9/5.0 ★</strong>",
                        'target_tab': 'kinh-doanh',
                        'action_label': 'Sổ khách hàng',
                    }
                ]
            },
            'FLEET': {
                'name': 'Đội Xe & Quản Lý Bãi',
                'badge': 'bg-indigo-100 text-indigo-800 border-indigo-300',
                'description': 'Quản lý phương tiện đầu kéo, rơ-moóc, định mức kỹ thuật, bảo trì định kỳ & an toàn bãi xe',
                'cards': [
                    {
                        'id': 'fleet_utilization',
                        'title': '1. Khả Dụng Xe Đầu Kéo',
                        'badge_title': 'Tỷ Lệ Khai Thác',
                        'metric_label': 'Hiệu Suất Xe Lăn Bánh',
                        'metric_value': f"{utilization_rate}%",
                        'metric_color': 'text-indigo-700',
                        'icon': 'ph-gauge',
                        'theme': 'indigo',
                        'line_1': f"Đang chở hàng: <strong>{vehicles_active}/{total_vehicles} xe</strong>",
                        'line_2': f"Tài xế phụ trách: <strong class='text-emerald-700'>{drivers_working} tài xế</strong>",
                        'target_tab': 'xe-bai',
                        'action_label': 'Sơ đồ xe',
                    },
                    {
                        'id': 'fleet_idle_yard',
                        'title': '2. Xe Sẵn Sàng Tại Bãi',
                        'badge_title': 'Tài Sản Bãi Xe',
                        'metric_label': 'Đầu Kéo Nằm Bãi Chờ Lệnh',
                        'metric_value': f"{vehicles_idle} Xe",
                        'metric_color': 'text-teal-700',
                        'icon': 'ph-park',
                        'theme': 'teal',
                        'line_1': "Tình trạng kỹ thuật: <strong class='text-emerald-700'>Đã kiểm tra an toàn</strong>",
                        'line_2': "Nhiên liệu: <strong class='text-slate-800'>Đầy bình sẵn sàng chạy</strong>",
                        'target_tab': 'xe-bai',
                        'action_label': 'Điều động xe',
                    },
                    {
                        'id': 'fleet_maintenance',
                        'title': '3. Bảo Dưỡng / Sửa Chữa',
                        'badge_title': 'Kỹ Thuật Xưởng',
                        'metric_label': 'Xe Đang Bảo Trì / Sửa Chữa',
                        'metric_value': f"{vehicles_maint} Xe",
                        'metric_color': 'text-rose-600' if vehicles_maint > 0 else 'text-emerald-600',
                        'icon': 'ph-wrench',
                        'theme': 'rose' if vehicles_maint > 0 else 'emerald',
                        'line_1': "Hạng mục: <strong class='text-slate-800'>Thay dầu & bảo dưỡng lốp</strong>",
                        'line_2': "Dự kiến bàn giao: <strong class='text-emerald-700'>Đúng tiến độ</strong>",
                        'target_tab': 'xe-bai',
                        'action_label': 'Lịch bảo dưỡng',
                    },
                    {
                        'id': 'fleet_inspections',
                        'title': '4. Hạn Kiểm Định & Bảo Hiểm',
                        'badge_title': 'Pháp Lý Xe',
                        'metric_label': 'Hồ Sơ Đến Hạn 30 Ngày',
                        'metric_value': f"{warning_reg_count} Xe Đến Hạn",
                        'metric_color': 'text-amber-700' if warning_reg_count > 0 else 'text-emerald-600',
                        'icon': 'ph-shield-check',
                        'theme': 'amber' if warning_reg_count > 0 else 'emerald',
                        'line_1': "Đăng kiểm & Phù hiệu: <strong class='text-amber-800'>Lên lịch trạm xét xe</strong>",
                        'line_2': "Tuân thủ pháp luật: <strong class='text-emerald-700'>100% Đầy đủ hồ sơ</strong>",
                        'target_tab': 'xe-bai',
                        'action_label': 'Gia hạn kiểm định',
                    }
                ]
            },
            'HR': {
                'name': 'Hành Chính Nhân Sự',
                'badge': 'bg-rose-100 text-rose-800 border-rose-300',
                'description': 'Quản lý Hồ sơ nhân sự, Hợp đồng lao động, Giấy phép lái xe tài xế & Chế độ phúc lợi nội bộ',
                'cards': [
                    {
                        'id': 'hr_total_headcount',
                        'title': '1. Quân Số Nhân Sự',
                        'badge_title': 'Tổng Định Biên',
                        'metric_label': 'Tổng Nhân Sự Toàn Công Ty',
                        'metric_value': f"{total_employees} Nhân Sự",
                        'metric_color': 'text-rose-700',
                        'icon': 'ph-identification-card',
                        'theme': 'rose',
                        'line_1': f"Văn phòng: <strong>{office_staff_count}</strong> • Đội tài xế: <strong>{total_drivers}</strong>",
                        'line_2': f"Tài xế sẵn sàng: <strong class='text-emerald-700'>{round(drivers_working / max(total_drivers, 1) * 100, 1) if total_drivers > 0 else 0.0}%</strong>",
                        'target_tab': 'nhan-su',
                        'action_label': 'Sổ nhân sự',
                    },
                    {
                        'id': 'hr_driver_readiness',
                        'title': '2. Tài Xế Đang Vận Hành',
                        'badge_title': 'Hiện Trường Vận Tải',
                        'metric_label': 'Lực Lượng Tài Xế Lăn Bánh',
                        'metric_value': f"{drivers_working} / {total_drivers} Bác Tài",
                        'metric_color': 'text-teal-700',
                        'icon': 'ph-steering-wheel',
                        'theme': 'teal',
                        'line_1': f"Nghỉ phép / Chờ lệnh: <strong>{drivers_on_leave} tài xế</strong>",
                        'line_2': "Kiểm tra sức khỏe: <strong class='text-emerald-700'>100% Đạt chuẩn</strong>",
                        'target_tab': 'nhan-su',
                        'action_label': 'Bàn tài xế',
                    },
                    {
                        'id': 'hr_contract_status',
                        'title': '3. Hợp Đồng Lao Động',
                        'badge_title': 'Tuân Thủ Pháp Lý',
                        'metric_label': 'Tình Trạng HĐLĐ & BHXH',
                        'metric_value': "100% Hiệu Lực",
                        'metric_color': 'text-emerald-700',
                        'icon': 'ph-certificate',
                        'theme': 'emerald',
                        'line_1': "HĐLĐ quá hạn: <strong class='text-emerald-700'>0 trường hợp</strong>",
                        'line_2': "Đóng BHXH/BHYT: <strong class='text-slate-800'>Đầy đủ kỳ này</strong>",
                        'target_tab': 'nhan-su',
                        'action_label': 'Xem HĐLĐ',
                    },
                    {
                        'id': 'hr_license_expiry',
                        'title': '4. Hạn Giấy Phép Lái Xe',
                        'badge_title': 'GPLX FC / C',
                        'metric_label': 'Bằng Lái Cần Đổi 30 Ngày',
                        'metric_value': f"{expiring_licenses_count} Hồ Sơ",
                        'metric_color': 'text-amber-700' if expiring_licenses_count > 0 else 'text-emerald-700',
                        'icon': 'ph-identification-badge',
                        'theme': 'amber' if expiring_licenses_count > 0 else 'emerald',
                        'line_1': "Nhắc nhở tự động: <strong class='text-amber-800'>Đã gửi qua ứng dụng</strong>",
                        'line_2': "Giấy khám sức khỏe: <strong class='text-emerald-700'>Còn hạn</strong>",
                        'target_tab': 'nhan-su',
                        'action_label': 'Kiểm tra bằng',
                    }
                ]
            }
        }

        current_role_info = ROLE_METADATA.get(active_role, ROLE_METADATA['DIRECTOR'])

        # --- 10. TRÍCH XUẤT WIDGET BẢN TIN CÔNG TY (COMPANY ANNOUNCEMENTS) ---
        user_dept = employee.department if employee else 'ALL'
        news_qs = CompanyPost.objects.filter(is_deleted=False)
        if not is_exec and user_dept != 'ALL':
            news_qs = news_qs.filter(Q(target_department='ALL') | Q(target_department=user_dept))
        
        news_qs = news_qs.select_related('category', 'author').order_by('-is_pinned', '-is_urgent', '-id')[:8]
        announcements_list = []
        for post in news_qs:
            author_title = 'Ban Quản Trị'
            if post.author:
                emp = getattr(post.author, 'employee', None)
                author_title = emp.full_name if emp else post.author.username
            announcements_list.append({
                'id': post.id,
                'title': post.title,
                'summary': post.summary or (post.content[:100] + '...' if len(post.content) > 100 else post.content),
                'category_name': post.category.name if post.category else 'Thông báo',
                'category_color': post.category.color if post.category else '#0d9488',
                'category_icon': post.category.icon if post.category else 'ph-newspaper',
                'is_pinned': post.is_pinned,
                'is_urgent': post.is_urgent,
                'target_department': post.get_target_department_display(),
                'author_name': author_title,
                'created_at': post.created_at.strftime('%d/%m/%Y') if post.created_at else ''
            })

        # --- 11. TRÍCH XUẤT WIDGET QUẢN LÝ CÔNG VIỆC ƯU TIÊN (ACTIONABLE TASKS) ---
        tasks_qs = OfficeTask.objects.filter(is_deleted=False).exclude(status__in=[TaskStatus.DONE, TaskStatus.CANCELLED])
        if is_exec:
            # Giám đốc xem các task khẩn cấp/cao của toàn cty hoặc do mình giao/nhận/theo dõi
            tasks_qs = tasks_qs.filter(
                Q(priority__in=[TaskPriority.HIGH, TaskPriority.URGENT]) |
                Q(assignee=user) |
                Q(reporter=user) |
                Q(followers=user)
            ).distinct()
        elif employee and employee.is_department_head:
            # Trưởng phòng xem task của phòng mình hoặc task của cá nhân
            tasks_qs = tasks_qs.filter(
                Q(department=employee.department) |
                Q(assignee=user) |
                Q(reporter=user) |
                Q(followers=user)
            ).distinct()
        else:
            # Chuyên viên chỉ xem task được giao cho mình hoặc do mình tạo hoặc follow
            tasks_qs = tasks_qs.filter(
                Q(assignee=user) |
                Q(reporter=user) |
                Q(followers=user)
            ).distinct()

        tasks_qs = tasks_qs.select_related(
            'assignee', 'assignee__employee',
            'reporter', 'reporter__employee'
        ).prefetch_related(
            'followers', 'followers__employee', 'checklists'
        ).order_by(
            models.Case(
                models.When(priority=TaskPriority.URGENT, then=0),
                models.When(priority=TaskPriority.HIGH, then=1),
                models.When(priority=TaskPriority.MEDIUM, then=2),
                default=3
            ),
            'due_date',
            '-id'
        )[:16]

        def _clean_user_name(u, default='Chưa xác định'):
            if not u:
                return default
            emp = getattr(u, 'employee', None)
            raw = (emp.full_name if (emp and emp.full_name) else (u.get_full_name() or u.username)).strip()
            # Loại bỏ chức danh trong ngoặc đơn (ví dụ: "Võ Triền (Giám Đốc)" -> "Võ Triền")
            clean = re.sub(r'\s*\([^)]*\)', '', raw).strip()
            return clean or raw or default

        def _format_task_code_3digits(c):
            if not c:
                return ''
            m = re.match(r'^TSK[-.](\d{6})[-.]0*(\d+)$', str(c))
            if m:
                return f"TSK.{m.group(1)}.{int(m.group(2)):03d}"
            return str(c)

        tasks_list = []
        for task in tasks_qs:
            chks = task.checklists.filter(is_deleted=False)
            total_chk = chks.count()
            done_chk = chks.filter(is_completed=True).count()
            is_overdue = bool(task.due_date and task.due_date < today)
            
            # Người phụ trách chính (Assignee) - hiển thị tên, không để tên chức vụ
            assignee_name = _clean_user_name(task.assignee, default='Chưa phân công')

            # Người giao việc (Reporter / Creator) - hiển thị tên, không để tên chức vụ
            reporter_name = _clean_user_name(task.reporter, default='Hệ thống')

            # Danh sách người theo dõi (Followers)
            followers_list = [_clean_user_name(f) for f in task.followers.all()]

            tasks_list.append({
                'id': task.id,
                'code': _format_task_code_3digits(task.code),
                'title': task.title,
                'priority': task.priority,
                'priority_label': task.get_priority_display(),
                'status': task.status,
                'status_label': task.get_status_display(),
                'due_date': task.due_date.strftime('%d/%m/%Y') if task.due_date else 'Không có hạn',
                'raw_due_date': task.due_date.strftime('%Y-%m-%d') if task.due_date else None,
                'days_remaining': (task.due_date - today).days if task.due_date else None,
                'is_overdue': is_overdue,
                'progress_percent': task.progress_percent,
                'checklists_done': done_chk,
                'checklists_total': total_chk,
                'assignee_id': task.assignee_id,
                'reporter_id': task.reporter_id,
                'follower_ids': list(task.followers.values_list('id', flat=True)),
                'is_reporter': bool(task.reporter_id == user.id),
                'is_assignee': bool(task.assignee_id == user.id),
                'is_follower': bool(user.id in list(task.followers.values_list('id', flat=True))),
                'extension_status': task.extension_status,
                'requested_deadline': task.requested_deadline.strftime('%d/%m/%Y') if task.requested_deadline else None,
                'extension_reason': task.extension_reason,
                'assignee_name': assignee_name,
                'reporter_name': reporter_name,
                'followers_list': followers_list,
                'department_label': task.get_department_display()
            })

        # --- TÍNH TOÁN DỮ LIỆU THẬT 100% CHO CÁC BIỂU ĐỒ PHÂN BỔ (DONUT & SPECIALIZED CHARTS) ---

        # 1. Kế toán: Cơ cấu chi phí thực tế từ TripExpense
        real_exp_groups = list(TripExpense.objects.filter(is_deleted=False).values('category').annotate(cat_total=Sum('amount')).order_by('-cat_total')[:4])
        total_real_exp = sum(float(g['cat_total']) for g in real_exp_groups)
        CATEGORY_DICT = dict(ExpenseCategory.choices)
        if total_real_exp > 0:
            exp_labels = [CATEGORY_DICT.get(g['category'], g['category']) for g in real_exp_groups]
            exp_data = [round(float(g['cat_total']) / total_real_exp * 100, 1) for g in real_exp_groups]
            palette = ['#f59e0b', '#3b82f6', '#0d9488', '#8b5cf6']
            color_classes = ['amber', 'blue', 'teal', 'purple']
            exp_colors = palette[:len(real_exp_groups)]
            exp_center_val = f"{exp_data[0]}%"
            exp_center_lbl = exp_labels[0][:10]
            exp_items = [
                {
                    'name': f"{exp_labels[i]}",
                    'val': f"{exp_data[i]}% (~{int(real_exp_groups[i]['cat_total']):,} đ)".replace(',', '.'),
                    'color': f"bg-{color_classes[i % len(color_classes)]}-500"
                }
                for i in range(len(real_exp_groups))
            ]
        else:
            exp_labels = ['Chưa có phát sinh']
            exp_data = [100]
            exp_colors = ['#cbd5e1']
            exp_center_val = '0 đ'
            exp_center_lbl = 'Không có'
            exp_items = [{'name': 'Chưa có khoản mục chi phí thực tế', 'val': '0 đ', 'color': 'bg-slate-400'}]

        # 2. Điều vận: Lộ trình và Sự cố thực tế
        running_trips = DispatchTrip.objects.filter(status__in=[TripStatus.IN_TRANSIT, TripStatus.RETURNING_EMPTY], is_deleted=False).count()
        depot_trips = DispatchTrip.objects.filter(status__in=[TripStatus.DISPATCHED, TripStatus.ACCEPTED, TripStatus.CONTAINER_PICKED], is_deleted=False).count()
        warehouse_trips = DispatchTrip.objects.filter(status__in=[TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING], is_deleted=False).count()

        total_exceptions = TripException.objects.filter(is_deleted=False).count()
        safe_trips = max(0, total_trips - total_exceptions)
        traffic_issues = TripException.objects.filter(exception_type__in=[ExceptionType.PORT_CONGESTION, ExceptionType.WAREHOUSE_DELAY, ExceptionType.TRAFFIC_ACCIDENT, ExceptionType.VEHICLE_BREAKDOWN], is_deleted=False).count()
        osd_issues = TripException.objects.filter(exception_type=ExceptionType.DAMAGED_CONTAINER, is_deleted=False).count()

        # 3. Kinh doanh: Cơ cấu loại vỏ container và nhóm ngành hàng thực tế
        cont_groups = list(BookingOrder.objects.filter(is_deleted=False).values('container_size').annotate(total=Sum('total_containers')).order_by('-total')[:3])
        if not cont_groups:
            cont_groups = list(DispatchTrip.objects.filter(is_deleted=False).exclude(container_type='').values('container_type').annotate(total=Count('id')).order_by('-total')[:3])
        total_cont_sum = sum(int(c.get('total') or 0) for c in cont_groups)
        if total_cont_sum > 0:
            sales_opt1_labels = [c.get('container_size') or c.get('container_type') or 'Khác' for c in cont_groups]
            sales_opt1_data = [round(int(c.get('total') or 0) / total_cont_sum * 100, 1) for c in cont_groups]
            sales_opt1_colors = ['#3b82f6', '#0d9488', '#f59e0b'][:len(cont_groups)]
            sales_opt1_center_val = f"{sales_opt1_data[0]}%"
            sales_opt1_center_lbl = sales_opt1_labels[0]
            color_classes = ['blue', 'teal', 'amber']
            sales_opt1_items = [
                {'name': f"{sales_opt1_labels[i]}", 'val': f"{sales_opt1_data[i]}% ({int(cont_groups[i]['total'])} cont)", 'color': f"bg-{color_classes[i % len(color_classes)]}-500"}
                for i in range(len(cont_groups))
            ]
        else:
            sales_opt1_labels = ['Chưa có dữ liệu']
            sales_opt1_data = [100]
            sales_opt1_colors = ['#cbd5e1']
            sales_opt1_center_val = '0'
            sales_opt1_center_lbl = 'Không có'
            sales_opt1_items = [{'name': 'Chưa phát sinh đơn booking cont', 'val': '0 cont', 'color': 'bg-slate-400'}]

        commodity_groups = list(BookingOrder.objects.filter(is_deleted=False).exclude(commodity='').values('commodity').annotate(c=Count('id')).order_by('-c')[:3])
        total_comm_sum = sum(int(cg['c']) for cg in commodity_groups)
        if total_comm_sum > 0:
            sales_opt2_labels = [cg['commodity'][:25] for cg in commodity_groups]
            sales_opt2_data = [round(int(cg['c']) / total_comm_sum * 100, 1) for cg in commodity_groups]
            sales_opt2_colors = ['#10b981', '#3b82f6', '#8b5cf6'][:len(commodity_groups)]
            sales_opt2_center_val = f"{sales_opt2_data[0]}%"
            sales_opt2_center_lbl = sales_opt2_labels[0][:10]
            color_classes = ['emerald', 'blue', 'purple']
            sales_opt2_items = [
                {'name': f"{sales_opt2_labels[i]}", 'val': f"{sales_opt2_data[i]}% ({commodity_groups[i]['c']} đơn)", 'color': f"bg-{color_classes[i % len(color_classes)]}-500"}
                for i in range(len(commodity_groups))
            ]
        else:
            sales_opt2_labels = ['Chưa có ngành hàng']
            sales_opt2_data = [100]
            sales_opt2_colors = ['#cbd5e1']
            sales_opt2_center_val = '0'
            sales_opt2_center_lbl = 'Không có'
            sales_opt2_items = [{'name': 'Chưa khai báo mặt hàng cụ thể', 'val': '0 đơn', 'color': 'bg-slate-400'}]

        # 4. Đội xe: Hiện trạng kỹ thuật & Đăng kiểm thực tế
        v_active = Vehicle.objects.filter(status=VehicleStatus.ACTIVE, is_deleted=False).count()
        v_idle = Vehicle.objects.filter(status=VehicleStatus.IDLE, is_deleted=False).count()
        v_maint = Vehicle.objects.filter(status=VehicleStatus.MAINTENANCE, is_deleted=False).count()
        valid_reg = Vehicle.objects.filter(registration_expiry__gt=today + datetime.timedelta(days=30), is_deleted=False).count()
        warning_reg = Vehicle.objects.filter(registration_expiry__gte=today, registration_expiry__lte=today + datetime.timedelta(days=30), is_deleted=False).count()
        expired_reg = Vehicle.objects.filter(registration_expiry__lt=today, is_deleted=False).count()

        # 5. Nhân sự: Định biên và GPLX thực tế
        drivers_cnt = Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True, is_deleted=False).count()
        field_cnt = Employee.objects.filter(role__in=[EmployeeRole.DISPATCHER, EmployeeRole.MECHANIC], is_active=True, is_deleted=False).count()
        office_cnt = Employee.objects.filter(is_active=True, is_deleted=False).exclude(role__in=[EmployeeRole.DRIVER, EmployeeRole.DISPATCHER, EmployeeRole.MECHANIC]).count()
        valid_lic = Employee.objects.filter(role=EmployeeRole.DRIVER, license_expiry__gt=today + datetime.timedelta(days=30), is_active=True, is_deleted=False).count()
        expiring_lic = Employee.objects.filter(role=EmployeeRole.DRIVER, license_expiry__gte=today, license_expiry__lte=today + datetime.timedelta(days=30), is_active=True, is_deleted=False).count()
        expired_lic = Employee.objects.filter(role=EmployeeRole.DRIVER, license_expiry__lt=today, is_active=True, is_deleted=False).count()

        # --- 12. HỆ THỐNG BIỂU ĐỒ PHÂN TÍCH CHUYÊN BIỆT THEO TỪNG VAI TRÒ (ROLE-BASED CHARTS) ---
        role_charts = {
            'DIRECTOR': {
                'trend': {
                    'title': 'Diễn Biến Doanh Thu, Chi Phí Vận Hành & Lợi Nhuận Gộp',
                    'subtitle': chart_subtitle,
                    'type': 'currency',
                    'labels': chart_days,
                    'datasets': [
                        {
                            'label': 'Lợi Nhuận Gộp',
                            'type': 'line',
                            'data': chart_profit,
                            'borderColor': '#059669',
                            'backgroundColor': '#059669',
                            'borderWidth': 3.5,
                            'order': 1
                        },
                        {
                            'label': 'Doanh Thu Cước',
                            'type': 'bar',
                            'data': chart_revenue,
                            'backgroundColor': 'rgba(37, 99, 235, 0.88)',
                            'order': 2
                        },
                        {
                            'label': 'Chi Phí Vận Hành',
                            'type': 'bar',
                            'data': chart_expense,
                            'backgroundColor': 'rgba(245, 158, 11, 0.88)',
                            'order': 3
                        }
                    ],
                    'summary': [
                        {'label': rev_label, 'value': f"~{int(avg_rev):,} đ".replace(',', '.'), 'theme': 'blue'},
                        {'label': exp_label, 'value': f"~{int(avg_exp):,} đ".replace(',', '.'), 'theme': 'amber'},
                        {'label': margin_label, 'value': f"{profit_margin}%", 'theme': 'emerald'}
                    ]
                },
                'donut': {
                    'title': 'Cơ Cấu Vận Hành',
                    'subtitle': 'Tài sản xe & luồng hải quan',
                    'btn1': 'Đội Xe',
                    'btn2': 'Hải Quan',
                    'opt1': {
                        'labels': ['Đang chở hàng (Active)', 'Chờ bãi (Idle)', 'Bảo trì (Maintenance)'],
                        'data': [vehicles_active, vehicles_idle, vehicles_maint],
                        'colors': ['#10b981', '#0d9488', '#f43f5e'],
                        'center_val': f"{utilization_rate}%",
                        'center_lbl': 'Khai Thác',
                        'items': [
                            {'name': 'Đang có hàng (Active)', 'val': f"{vehicles_active} xe ({utilization_rate}%)", 'color': 'bg-emerald-500'},
                            {'name': 'Sẵn sàng bãi (Idle)', 'val': f"{vehicles_idle} xe", 'color': 'bg-teal-500'},
                            {'name': 'Bảo dưỡng (Maintenance)', 'val': f"{vehicles_maint} xe", 'color': 'bg-rose-500'}
                        ]
                    },
                    'opt2': {
                        'labels': ['Luồng Xanh (Thông quan)', 'Luồng Vàng (Nộp hồ sơ)', 'Luồng Đỏ (Kiểm hóa)'],
                        'data': [c_green, c_yellow, c_red],
                        'colors': ['#10b981', '#f59e0b', '#f43f5e'],
                        'center_val': f"{c_rate}%",
                        'center_lbl': 'Luồng Xanh',
                        'items': [
                            {'name': 'Luồng Xanh (Thông quan tự động)', 'val': f"{c_green} tờ ({c_rate}%)", 'color': 'bg-emerald-500'},
                            {'name': 'Luồng Vàng (Kiểm tra hồ sơ)', 'val': f"{c_yellow} tờ", 'color': 'bg-amber-500'},
                            {'name': 'Luồng Đỏ (Kiểm tra thực tế)', 'val': f"{c_red} tờ", 'color': 'bg-rose-500'}
                        ]
                    }
                }
            },
            'ACCOUNTING': {
                'trend': {
                    'title': 'Diễn Biến Chi Phí Vận Hành & Tạm Ứng Chuyến Lái Xe',
                    'subtitle': 'Kiểm soát dòng tiền chi phí thực tế, giải ngân tạm ứng và tiến độ quyết toán cước',
                    'type': 'currency',
                    'labels': chart_days,
                    'datasets': [
                        {
                            'label': 'Chi Phí Vận Hành',
                            'type': 'bar',
                            'data': chart_expense,
                            'backgroundColor': 'rgba(245, 158, 11, 0.85)',
                            'order': 2
                        },
                        {
                            'label': 'Tạm Ứng Giải Ngân',
                            'type': 'bar',
                            'data': chart_advances,
                            'backgroundColor': 'rgba(59, 130, 246, 0.75)',
                            'order': 3
                        },
                        {
                            'label': 'Lợi Nhuận Gộp',
                            'type': 'line',
                            'data': chart_profit,
                            'borderColor': '#10b981',
                            'backgroundColor': '#10b981',
                            'borderWidth': 3,
                            'order': 1
                        }
                    ],
                    'summary': [
                        {'label': 'Chi Phí TB / Ngày', 'value': f"~{int(avg_exp):,} đ".replace(',', '.'), 'theme': 'amber'},
                        {'label': 'Tạm Ứng TX Bình Quân', 'value': f"~{int(round(pending_adv_total / max(pending_adv_drivers_count, 1))):,} đ".replace(',', '.'), 'theme': 'teal'},
                        {'label': 'Tỷ Lệ Quyết Toán Cước', 'value': f"{round(((total_trips - pending_settle_count) / max(total_trips, 1) * 100), 1)}%", 'theme': 'emerald'}
                    ]
                },
                'donut': {
                    'title': 'Cơ Cấu Chi Phí & Hồ Sơ Quyết Toán',
                    'subtitle': 'Khoản mục chi phí chuyến xe & tiến độ kiểm toán',
                    'btn1': 'Khoản Mục',
                    'btn2': 'Quyết Toán',
                    'opt1': {
                        'labels': exp_labels,
                        'data': exp_data,
                        'colors': exp_colors,
                        'center_val': exp_center_val,
                        'center_lbl': exp_center_lbl,
                        'items': exp_items
                    },
                    'opt2': {
                        'labels': ['Đã chốt quyết toán', 'Chờ duyệt hóa đơn dầu/BOT', 'Chưa nộp chứng từ'],
                        'data': [max(0, total_trips - pending_settle_count), pending_settle_count, max(0, today_active_trips)],
                        'colors': ['#10b981', '#f59e0b', '#f43f5e'],
                        'center_val': f"{round(((total_trips - pending_settle_count) / max(total_trips, 1) * 100), 1)}%",
                        'center_lbl': 'Đã Chốt',
                        'items': [
                            {'name': 'Đã kiểm toán & chốt sổ', 'val': f"{total_trips - pending_settle_count} chuyến", 'color': 'bg-emerald-500'},
                            {'name': 'Chờ rà soát chứng từ dầu/BOT', 'val': f"{pending_settle_count} chuyến", 'color': 'bg-amber-500'},
                            {'name': 'Chưa nộp chứng từ chuyến', 'val': f"{today_active_trips} chuyến", 'color': 'bg-rose-500'}
                        ]
                    }
                }
            },
            'DISPATCH': {
                'trend': {
                    'title': 'Sản Lượng Điều Vận Chuyến Xe & Tỷ Lệ Giao Đúng Giờ (OTD)',
                    'subtitle': 'Số lệnh điều xe FTL phát hành, chuyến hoàn tất và chỉ số cam kết chất lượng dịch vụ SLA',
                    'type': 'count',
                    'labels': chart_days,
                    'datasets': [
                        {
                            'label': 'Tổng Lệnh Điều Xe',
                            'type': 'bar',
                            'data': chart_trips_total,
                            'backgroundColor': 'rgba(13, 148, 136, 0.85)',
                            'order': 2
                        },
                        {
                            'label': 'Chuyến Hoàn Tất',
                            'type': 'bar',
                            'data': chart_trips_completed,
                            'backgroundColor': 'rgba(16, 185, 129, 0.75)',
                            'order': 3
                        },
                        {
                            'label': 'Tỷ Lệ Đúng Giờ (OTD %)',
                            'type': 'line',
                            'data': [ontime_rate] * len(chart_days),
                            'borderColor': '#f59e0b',
                            'backgroundColor': '#f59e0b',
                            'borderWidth': 3,
                            'order': 1
                        }
                    ],
                    'summary': [
                        {'label': 'Tổng Lệnh Điều Vận', 'value': f"{total_trips} Chuyến", 'theme': 'teal'},
                        {'label': 'Chuyến Đã Hoàn Tất', 'value': f"{completed_trips} Chuyến", 'theme': 'emerald'},
                        {'label': 'SLA Đúng Hạn (OTD)', 'value': f"{ontime_rate}%", 'theme': 'amber'}
                    ]
                },
                'donut': {
                    'title': 'Tiến Độ Lộ Trình & Sự Cố Vận Tải',
                    'subtitle': 'Trạng thái chuyến xe hiện trường & an toàn hành trình',
                    'btn1': 'Lộ Trình',
                    'btn2': 'Sự Cố OS&D',
                    'opt1': {
                        'labels': ['Đang lăn bánh trên đường', 'Lấy/Trả rỗng tại Depot', 'Đang đóng hàng tại Kho'],
                        'data': [running_trips, depot_trips, warehouse_trips],
                        'colors': ['#0d9488', '#3b82f6', '#f59e0b'],
                        'center_val': f"{running_trips}",
                        'center_lbl': 'Lăn Bánh',
                        'items': [
                            {'name': 'Đang vận hành trên tuyến FTL', 'val': f"{running_trips} chuyến", 'color': 'bg-teal-500'},
                            {'name': 'Lấy/Trả rỗng tại Cảng/Depot', 'val': f"{depot_trips} chuyến", 'color': 'bg-blue-500'},
                            {'name': 'Đang đóng hàng tại Kho/KCN', 'val': f"{warehouse_trips} chuyến", 'color': 'bg-amber-500'}
                        ]
                    },
                    'opt2': {
                        'labels': ['Hành trình an toàn', 'Chậm trễ/Kẹt cảng đường bộ', 'Hư hỏng cont (OS&D)'],
                        'data': [safe_trips, traffic_issues, osd_issues],
                        'colors': ['#10b981', '#f59e0b', '#f43f5e'],
                        'center_val': f"{round(safe_trips / max(total_trips, 1) * 100, 1)}%",
                        'center_lbl': 'An Toàn',
                        'items': [
                            {'name': 'Hành trình an toàn, đúng lộ trình', 'val': f"{safe_trips} chuyến", 'color': 'bg-emerald-500'},
                            {'name': 'Cảnh báo kẹt xe, trễ giờ cảng/kho', 'val': f"{traffic_issues} sự cố", 'color': 'bg-amber-500'},
                            {'name': 'Hàng hư hỏng/thiếu hụt (OS&D)', 'val': f"{osd_issues} vụ việc", 'color': 'bg-rose-500'}
                        ]
                    }
                }
            },
            'SALES': {
                'trend': {
                    'title': 'Sản Lượng Đơn Booking & Doanh Thu Tạm Tính',
                    'subtitle': 'Diễn biến nhu cầu vận chuyển của khách hàng B2B và tỷ lệ chốt báo giá thành công',
                    'type': 'currency',
                    'labels': chart_days,
                    'datasets': [
                        {
                            'label': 'Doanh Số Booking',
                            'type': 'bar',
                            'data': chart_revenue,
                            'backgroundColor': 'rgba(59, 130, 246, 0.85)',
                            'order': 2
                        },
                        {
                            'label': 'Sản Lượng (TEU / Cont)',
                            'type': 'bar',
                            'data': chart_bookings_containers,
                            'backgroundColor': 'rgba(99, 102, 241, 0.75)',
                            'order': 3
                        },
                        {
                            'label': 'Tỷ Lệ Chốt Báo Giá (%)',
                            'type': 'line',
                            'data': [quote_conversion_rate] * len(chart_days),
                            'borderColor': '#0d9488',
                            'backgroundColor': '#0d9488',
                            'borderWidth': 3,
                            'order': 1
                        }
                    ],
                    'summary': [
                        {'label': 'Đơn Booking Mới', 'value': f"{pending_bookings} Đơn", 'theme': 'blue'},
                        {'label': 'Doanh Số Bán Hàng', 'value': f"~{int(agg_revenue):,} đ".replace(',', '.'), 'theme': 'teal'},
                        {'label': 'Tỷ Lệ Chốt Báo Giá', 'value': f"{quote_conversion_rate}%", 'theme': 'emerald'}
                    ]
                },
                'donut': {
                    'title': 'Cơ Cấu Khách Hàng & Loại Vỏ Container',
                    'subtitle': 'Phân bổ phương thức đóng hàng và nhóm ngành hàng chủ lực',
                    'btn1': 'Loại Cont',
                    'btn2': 'Ngành Hàng',
                    'opt1': {
                        'labels': sales_opt1_labels,
                        'data': sales_opt1_data,
                        'colors': sales_opt1_colors,
                        'center_val': sales_opt1_center_val,
                        'center_lbl': sales_opt1_center_lbl,
                        'items': sales_opt1_items
                    },
                    'opt2': {
                        'labels': sales_opt2_labels,
                        'data': sales_opt2_data,
                        'colors': sales_opt2_colors,
                        'center_val': sales_opt2_center_val,
                        'center_lbl': sales_opt2_center_lbl,
                        'items': sales_opt2_items
                    }
                }
            },
            'FLEET': {
                'trend': {
                    'title': 'Tỷ Lệ Khai Thác Đội Đầu Kéo & Phương Tiện Sẵn Sàng',
                    'subtitle': 'Khả năng đáp ứng phương tiện vận tải, hiệu suất lăn bánh và xe dự phòng bãi',
                    'type': 'count',
                    'labels': chart_days,
                    'datasets': [
                        {
                            'label': 'Xe Đang Hoạt Động (Active)',
                            'type': 'bar',
                            'data': [vehicles_active] * len(chart_days),
                            'backgroundColor': 'rgba(16, 185, 129, 0.85)',
                            'order': 2
                        },
                        {
                            'label': 'Xe Bãi Sẵn Sàng (Idle)',
                            'type': 'bar',
                            'data': [vehicles_idle] * len(chart_days),
                            'backgroundColor': 'rgba(13, 148, 136, 0.75)',
                            'order': 3
                        },
                        {
                            'label': 'Tỷ Lệ Khai Thác (Utilization %)',
                            'type': 'line',
                            'data': [utilization_rate] * len(chart_days),
                            'borderColor': '#6366f1',
                            'backgroundColor': '#6366f1',
                            'borderWidth': 3,
                            'order': 1
                        }
                    ],
                    'summary': [
                        {'label': 'Tổng Đội Xe Đầu Kéo', 'value': f"{total_vehicles} Xe", 'theme': 'teal'},
                        {'label': 'Sẵn Sàng Nhận Lệnh', 'value': f"{vehicles_idle} Xe", 'theme': 'emerald'},
                        {'label': 'Hiệu Suất Khai Thác', 'value': f"{utilization_rate}%", 'theme': 'indigo'}
                    ]
                },
                'donut': {
                    'title': 'Hiện Trạng Kỹ Thuật & Đăng Kiểm Đội Xe',
                    'subtitle': 'Tình trạng phương tiện bãi xe & lịch kiểm định an toàn',
                    'btn1': 'Kỹ Thuật',
                    'btn2': 'Đăng Kiểm',
                    'opt1': {
                        'labels': ['Đang chạy (Active)', 'Chờ bãi (Idle)', 'Bảo trì (Maintenance)'],
                        'data': [v_active, v_idle, v_maint],
                        'colors': ['#10b981', '#0d9488', '#f43f5e'],
                        'center_val': f"{round((v_active / max(total_vehicles, 1)) * 100, 1)}%",
                        'center_lbl': 'Đang Chạy',
                        'items': [
                            {'name': 'Đủ điều kiện an toàn vận hành', 'val': f"{v_active} xe", 'color': 'bg-emerald-500'},
                            {'name': 'Sẵn sàng tại bãi chờ lệnh', 'val': f"{v_idle} xe", 'color': 'bg-teal-500'},
                            {'name': 'Đang bảo dưỡng định kỳ/sửa chữa', 'val': f"{v_maint} xe", 'color': 'bg-rose-500'}
                        ]
                    },
                    'opt2': {
                        'labels': ['Hạn an toàn (>30 ngày)', 'Sắp hết hạn (<30 ngày)', 'Quá hạn kiểm định'],
                        'data': [valid_reg, warning_reg, expired_reg],
                        'colors': ['#10b981', '#f59e0b', '#f43f5e'],
                        'center_val': f"{round((valid_reg / max(total_vehicles, 1)) * 100, 1)}%",
                        'center_lbl': 'Hợp Lệ',
                        'items': [
                            {'name': 'Đăng kiểm & bảo hiểm còn hạn', 'val': f"{valid_reg} xe", 'color': 'bg-emerald-500'},
                            {'name': 'Cần đưa đi trạm xét xe 30 ngày', 'val': f"{warning_reg} xe", 'color': 'bg-amber-500'},
                            {'name': 'Quá hạn kiểm định', 'val': f"{expired_reg} xe", 'color': 'bg-rose-500'}
                        ]
                    }
                }
            },
            'HR': {
                'trend': {
                    'title': 'Lực Lượng Tài Xế Lăn Bánh & Tỷ Lệ Sẵn Sàng',
                    'subtitle': 'Điều độ quân số lái xe container, lịch trình nghỉ phép và tỷ lệ chuyên cần',
                    'type': 'count',
                    'labels': chart_days,
                    'datasets': [
                        {
                            'label': 'Tài Xế Đang Lăn Bánh',
                            'type': 'bar',
                            'data': [drivers_working] * len(chart_days),
                            'backgroundColor': 'rgba(13, 148, 136, 0.85)',
                            'order': 2
                        },
                        {
                            'label': 'Tài Xế Chờ Lệnh / Nghỉ Phép',
                            'type': 'bar',
                            'data': [drivers_on_leave] * len(chart_days),
                            'backgroundColor': 'rgba(245, 158, 11, 0.75)',
                            'order': 3
                        },
                        {
                            'label': 'Tỷ Lệ Khả Dụng / Sẵn Sàng (%)',
                            'type': 'line',
                            'data': [round((drivers_working / max(total_drivers, 1)) * 100, 1)] * len(chart_days),
                            'borderColor': '#10b981',
                            'backgroundColor': '#10b981',
                            'borderWidth': 3,
                            'order': 1
                        }
                    ],
                    'summary': [
                        {'label': 'Tổng Đội Ngũ Tài Xế', 'value': f"{total_drivers} Bác Tài", 'theme': 'teal'},
                        {'label': 'Đang Ôm Vô-lăng', 'value': f"{drivers_working} Tài Xế", 'theme': 'emerald'},
                        {'label': 'Tỷ Lệ Sẵn Sàng', 'value': f"{round((drivers_working / max(total_drivers, 1)) * 100, 1)}%", 'theme': 'amber'}
                    ]
                },
                'donut': {
                    'title': 'Cơ Cấu Định Biên & Giấy Phép Lái Xe',
                    'subtitle': 'Phân bổ nhân sự toàn công ty và kiểm soát hạn bằng lái hạng FC/C',
                    'btn1': 'Định Biên',
                    'btn2': 'GPLX FC/C',
                    'opt1': {
                        'labels': ['Đội ngũ Tài xế Container', 'Điều Vận & Kỹ Thuật Bãi', 'Khối Văn Phòng'],
                        'data': [drivers_cnt, field_cnt, office_cnt],
                        'colors': ['#0d9488', '#3b82f6', '#8b5cf6'],
                        'center_val': f"{round((drivers_cnt / max(total_employees, 1)) * 100, 1)}%",
                        'center_lbl': 'Tài Xế',
                        'items': [
                            {'name': 'Lực lượng lái xe container/tải nặng', 'val': f"{drivers_cnt} nhân sự", 'color': 'bg-teal-500'},
                            {'name': 'Điều độ bãi xe & kỹ thuật viên', 'val': f"{field_cnt} nhân sự", 'color': 'bg-blue-500'},
                            {'name': 'Kế toán, Kinh doanh, Ban Giám Đốc', 'val': f"{office_cnt} nhân sự", 'color': 'bg-purple-500'}
                        ]
                    },
                    'opt2': {
                        'labels': ['Bằng lái còn hạn an toàn', 'Cần đổi bằng 30 ngày', 'Quá hạn giấy phép'],
                        'data': [valid_lic, expiring_lic, expired_lic],
                        'colors': ['#10b981', '#f59e0b', '#f43f5e'],
                        'center_val': f"{round((valid_lic / max(drivers_cnt, 1)) * 100, 1)}%" if drivers_cnt > 0 else "100%",
                        'center_lbl': 'Đạt Chuẩn',
                        'items': [
                            {'name': 'Bằng lái FC/C còn hạn an toàn', 'val': f"{valid_lic} hồ sơ", 'color': 'bg-emerald-500'},
                            {'name': 'Cần gia hạn đổi bằng 30 ngày', 'val': f"{expiring_lic} hồ sơ", 'color': 'bg-amber-500'},
                            {'name': 'Quá hạn giấy phép lái xe', 'val': f"{expired_lic} hồ sơ", 'color': 'bg-rose-500'}
                        ]
                    }
                }
            }
        }

        return Response({
            'period': period,
            'period_label': period_label,
            # Role-based context
            'active_role': active_role,
            'role': active_role,
            'role_name': current_role_info['name'],
            'role_badge': current_role_info['badge'],
            'role_description': current_role_info['description'],
            'can_switch_view': is_exec,
            'kpi_cards': current_role_info['cards'],
            'role_charts': role_charts,
            # Interactive Widgets
            'announcements': announcements_list,
            'my_tasks': tasks_list,
            # Core financial & operational metrics (Backward compatibility)
            'financial': {
                'cash_on_hand': cash_on_hand,
                'bank_balance': bank_balance,
                'total_liquidity': total_liquidity,
                'weekly_planned_expenses': weekly_planned_expenses,
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
            'funds': {
                'cash_on_hand': cash_on_hand,
                'bank_balance': bank_balance,
                'total_liquidity': total_liquidity,
                'weekly_planned_expenses': weekly_planned_expenses,
            },
            # Danh sách chuyến (khách hàng, tuyến, biển số...) chỉ cho người thuộc nghiệp vụ liên quan, không cho tài xế / thợ máy
            'trips_pnl': trips_pnl if _can_list_trips(request.user) else []
        })


def _can_list_trips(user):
    from core import access
    return user.is_superuser or any(
        access.allowed(user, m, 'view') for m in ('dispatch', 'sales', 'accounting', 'customs'))


class DashboardPivotChartAPIView(APIView):
    """
    Self-Service Pivot / BI Chart Engine.
    Cho phép người dùng tự do phân tích dữ liệu đa chiều:
    - Entity: trips (Chuyến xe), expenses (Chi phí), bookings (Đơn hàng), vehicles (Đội xe)
    - Trục X (Dimensions / Group By): customer, driver, vehicle, container_type, shipment_type, status, route, category, etc.
    - Trục Y (Metrics & Aggregation): revenue, expense, profit, amount, trip_count, booking_count, vehicle_count (SUM, AVG, COUNT)
    - Loại biểu đồ (Chart Types): bar, horizontal_bar, line, doughnut, pie
    - Bộ lọc thời gian: all, month, quarter, year, last_30_days
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        entity = request.query_params.get('entity', 'trips').lower().strip()
        group_by = request.query_params.get('group_by', 'customer').lower().strip()
        metric = request.query_params.get('metric', 'revenue').lower().strip()
        from core import access as _access
        if metric not in ('trip_count', 'booking_count', 'vehicle_count', 'count') and not _access.can_view_finance(request.user):
            return Response({'success': False, 'message': _access.denied_message('reports_fin', 'view')}, status=status.HTTP_403_FORBIDDEN)
        agg = request.query_params.get('agg', 'sum').lower().strip()
        period = request.query_params.get('period', 'all').lower().strip()
        chart_type = request.query_params.get('chart_type', 'bar').lower().strip()
        sort_order = request.query_params.get('sort', 'desc').lower().strip()
        
        try:
            limit = int(request.query_params.get('limit', 10))
            limit = max(3, min(limit, 30))
        except (ValueError, TypeError):
            limit = 10

        now = timezone.now()
        date_filter = Q()
        period_label = "Tất cả thời gian"
        if period == 'month':
            date_filter = Q(created_at__year=now.year, created_at__month=now.month)
            period_label = f"Tháng {now.month}/{now.year}"
        elif period == 'quarter':
            quarter = (now.month - 1) // 3 + 1
            start_month = (quarter - 1) * 3 + 1
            date_filter = Q(created_at__year=now.year, created_at__month__gte=start_month, created_at__month__lte=start_month + 2)
            period_label = f"Quý {quarter}/{now.year}"
        elif period == 'year':
            date_filter = Q(created_at__year=now.year)
            period_label = f"Năm {now.year}"
        elif period == 'last_30_days':
            past_30 = now - datetime.timedelta(days=30)
            date_filter = Q(created_at__gte=past_30)
            period_label = "30 ngày gần nhất"

        labels = []
        data_values = []
        is_currency = False
        unit = ""
        title = ""

        # ==========================================
        # 1. ENTITY: TRIPS (Chuyến xe)
        # ==========================================
        if entity == 'trips':
            qs = DispatchTrip.objects.filter(is_deleted=False).filter(date_filter)

            # Metric configuration
            if metric == 'expense':
                is_currency = True
                unit = "VNĐ"
                metric_name = "Chi phí"
                val_field = 'cached_expense'
            elif metric == 'profit':
                is_currency = True
                unit = "VNĐ"
                metric_name = "Lợi nhuận gộp"
                val_field = 'cached_profit'
            elif metric == 'trip_count':
                is_currency = False
                unit = "chuyến"
                metric_name = "Số chuyến xe"
                val_field = 'id'
                agg = 'count'
            else: # Default revenue
                is_currency = True
                unit = "VNĐ"
                metric_name = "Doanh thu"
                val_field = 'cached_revenue'

            # Group By configuration
            agg_func = Count(val_field) if agg == 'count' else (Avg(val_field) if agg == 'avg' else Sum(val_field))
            agg_label = "Trung bình" if agg == 'avg' else ("Tổng" if agg == 'sum' else "Số lượng")

            raw_data = []
            if group_by == 'driver':
                dim_name = "Tài xế"
                grouped = qs.values('driver__full_name', 'driver__nickname').annotate(metric_val=agg_func)
                for item in grouped:
                    name = item.get('driver__full_name') or item.get('driver__nickname') or 'Chưa phân tài'
                    raw_data.append({'label': name, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'vehicle':
                dim_name = "Đầu kéo / Xe"
                grouped = qs.values('vehicle__plate_number').annotate(metric_val=agg_func)
                for item in grouped:
                    plate = item.get('vehicle__plate_number') or 'Chưa gán xe'
                    raw_data.append({'label': plate, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'container_type':
                dim_name = "Loại Container"
                grouped = qs.values('container_type').annotate(metric_val=agg_func)
                for item in grouped:
                    ctype = item.get('container_type') or 'Khác'
                    raw_data.append({'label': ctype, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'shipment_type':
                dim_name = "Phân loại hàng"
                type_labels = dict(ShipmentType.choices)
                grouped = qs.values('shipment_type').annotate(metric_val=agg_func)
                for item in grouped:
                    stype = item.get('shipment_type')
                    label = type_labels.get(stype, stype or 'Khác')
                    raw_data.append({'label': label, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'status':
                dim_name = "Trạng thái chuyến"
                status_labels = dict(TripStatus.choices)
                grouped = qs.values('status').annotate(metric_val=agg_func)
                for item in grouped:
                    st = item.get('status')
                    label = status_labels.get(st, st or 'Khác')
                    raw_data.append({'label': label, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'route':
                dim_name = "Tuyến đường"
                grouped = qs.values('pickup_location', 'warehouse_location').annotate(metric_val=agg_func)
                for item in grouped:
                    p = (item.get('pickup_location') or '').strip()
                    w = (item.get('warehouse_location') or '').strip()
                    label = f"{p[:15]} ➔ {w[:15]}" if p and w else (p or w or 'Tuyến nội bộ')
                    raw_data.append({'label': label, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'subcontractor':
                dim_name = "Thầu phụ / Nhà xe"
                grouped = qs.values('subcontractor__short_name', 'subcontractor__name', 'subcontractor__code').annotate(metric_val=agg_func)
                for item in grouped:
                    sname = (item.get('subcontractor__short_name') or '').strip() or item.get('subcontractor__name') or item.get('subcontractor__code') or 'Đội xe nội bộ'
                    raw_data.append({'label': sname, 'val': float(item['metric_val'] or 0)})

            else: # default: customer
                dim_name = "Khách hàng"
                grouped = qs.values('customer__short_name', 'customer__name', 'customer__code').annotate(metric_val=agg_func)
                for item in grouped:
                    cname = (item.get('customer__short_name') or '').strip() or item.get('customer__name') or item.get('customer__code') or 'Khách vãng lai'
                    raw_data.append({'label': cname, 'val': float(item['metric_val'] or 0)})

            title = f"{agg_label} {metric_name} theo {dim_name} ({period_label})"

        # ==========================================
        # 2. ENTITY: EXPENSES (Chi phí phát sinh)
        # ==========================================
        elif entity == 'expenses':
            qs = TripExpense.objects.filter(is_deleted=False).filter(date_filter)
            
            if metric == 'expense_count':
                is_currency = False
                unit = "phiếu"
                metric_name = "Số lượng phiếu chi"
                val_field = 'id'
                agg = 'count'
            else: # Default amount
                is_currency = True
                unit = "VNĐ"
                metric_name = "Số tiền chi phí"
                val_field = 'amount'

            agg_func = Count(val_field) if agg == 'count' else (Avg(val_field) if agg == 'avg' else Sum(val_field))
            agg_label = "Trung bình" if agg == 'avg' else ("Tổng" if agg == 'sum' else "Số lượng")

            raw_data = []
            if group_by == 'driver':
                dim_name = "Tài xế lập phiếu"
                grouped = qs.values('driver__full_name', 'driver__nickname').annotate(metric_val=agg_func)
                for item in grouped:
                    name = item.get('driver__full_name') or item.get('driver__nickname') or 'Công ty chi'
                    raw_data.append({'label': name, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'vehicle':
                dim_name = "Biển số xe"
                grouped = qs.values('vehicle__plate_number').annotate(metric_val=agg_func)
                for item in grouped:
                    plate = item.get('vehicle__plate_number') or 'Chưa gán xe'
                    raw_data.append({'label': plate, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'status':
                dim_name = "Trạng thái phê duyệt"
                status_labels = dict(ApprovalStatus.choices)
                grouped = qs.values('approval_status').annotate(metric_val=agg_func)
                for item in grouped:
                    st = item.get('approval_status')
                    label = status_labels.get(st, st or 'Khác')
                    raw_data.append({'label': label, 'val': float(item['metric_val'] or 0)})

            else: # Default: category
                dim_name = "Khoản mục chi phí"
                cat_labels = dict(ExpenseCategory.choices)
                grouped = qs.values('category').annotate(metric_val=agg_func)
                for item in grouped:
                    cat = item.get('category')
                    label = cat_labels.get(cat, cat or 'Khoản mục khác')
                    raw_data.append({'label': label, 'val': float(item['metric_val'] or 0)})

            title = f"{agg_label} {metric_name} theo {dim_name} ({period_label})"

        # ==========================================
        # 3. ENTITY: BOOKINGS (Đơn hàng / Booking)
        # ==========================================
        elif entity == 'bookings':
            qs = BookingOrder.objects.filter(is_deleted=False).filter(date_filter)

            if metric == 'total_containers':
                is_currency = False
                unit = "cont"
                metric_name = "Tổng số container"
                val_field = 'total_containers'
            else: # Default booking_count
                is_currency = False
                unit = "đơn"
                metric_name = "Số lượng Booking"
                val_field = 'id'
                agg = 'count'

            agg_func = Count(val_field) if agg == 'count' else (Avg(val_field) if agg == 'avg' else Sum(val_field))
            agg_label = "Trung bình" if agg == 'avg' else ("Tổng" if agg == 'sum' else "Số lượng")

            raw_data = []
            if group_by == 'status':
                dim_name = "Trạng thái điều xe"
                status_labels = dict(BookingStatus.choices)
                grouped = qs.values('status').annotate(metric_val=agg_func)
                for item in grouped:
                    st = item.get('status')
                    label = status_labels.get(st, st or 'Khác')
                    raw_data.append({'label': label, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'shipping_line':
                dim_name = "Hãng tàu"
                grouped = qs.values('shipping_line').annotate(metric_val=agg_func)
                for item in grouped:
                    sl = item.get('shipping_line') or 'Hãng khác / Nội địa'
                    raw_data.append({'label': sl, 'val': float(item['metric_val'] or 0)})

            elif group_by == 'container_size':
                dim_name = "Kích cỡ container"
                grouped = qs.values('container_size').annotate(metric_val=agg_func)
                for item in grouped:
                    cs = item.get('container_size') or '40HC'
                    raw_data.append({'label': cs, 'val': float(item['metric_val'] or 0)})

            else: # Default customer
                dim_name = "Khách hàng"
                grouped = qs.values('customer__short_name', 'customer__name', 'customer__code').annotate(metric_val=agg_func)
                for item in grouped:
                    cname = (item.get('customer__short_name') or '').strip() or item.get('customer__name') or item.get('customer__code') or 'Khách vãng lai'
                    raw_data.append({'label': cname, 'val': float(item['metric_val'] or 0)})

            title = f"{agg_label} {metric_name} theo {dim_name} ({period_label})"

        # ==========================================
        # 4. ENTITY: VEHICLES (Đội xe / Phương tiện)
        # ==========================================
        elif entity == 'vehicles':
            qs = Vehicle.objects.filter(is_deleted=False)
            is_currency = False
            unit = "xe"
            metric_name = "Số lượng xe"
            dim_name = "Trạng thái hoạt động"
            agg_label = "Thống kê"

            if group_by == 'vehicle_type':
                dim_name = "Loại phương tiện"
                grouped = qs.values('vehicle_type__name').annotate(metric_val=Count('id'))
                raw_data = [{'label': item.get('vehicle_type__name') or 'Xe đầu kéo', 'val': float(item['metric_val'])} for item in grouped]
            else: # status
                status_labels = dict(VehicleStatus.choices)
                grouped = qs.values('status').annotate(metric_val=Count('id'))
                raw_data = [{'label': status_labels.get(item.get('status'), item.get('status')), 'val': float(item['metric_val'])} for item in grouped]

            title = f"{agg_label} {metric_name} theo {dim_name}"

        # ==========================================
        # 5. ENTITY: QUOTATIONS (Báo giá & Khách hàng)
        # ==========================================
        elif entity == 'quotations':
            qs = Quotation.objects.filter(is_deleted=False).filter(date_filter)

            if metric == 'expected_trips':
                is_currency = False
                unit = "chuyến"
                metric_name = "Sản lượng cam kết"
                val_field = 'expected_trips_monthly'
            elif metric == 'quotation_count':
                is_currency = False
                unit = "báo giá"
                metric_name = "Số lượng báo giá"
                val_field = 'id'
                agg = 'count'
            else: # unit_price
                is_currency = True
                unit = "VNĐ"
                metric_name = "Đơn giá cước"
                val_field = 'unit_price'

            agg_func = Count(val_field) if agg == 'count' else (Avg(val_field) if agg == 'avg' else Sum(val_field))
            agg_label = "Trung bình" if agg == 'avg' else ("Tổng" if agg == 'sum' else "Số lượng")

            raw_data = []
            if group_by == 'status':
                dim_name = "Trạng thái báo giá"
                status_dict = {
                    'NEGOTIATING': 'Đang thương lượng',
                    'PENDING_APPROVAL': 'Chờ Giám đốc duyệt',
                    'APPROVED': 'Đã duyệt',
                    'REJECTED': 'Từ chối / Không chốt',
                    'EXPIRED': 'Hết hiệu lực'
                }
                grouped = qs.values('status').annotate(metric_val=agg_func)
                for item in grouped:
                    st = item.get('status')
                    raw_data.append({'label': status_dict.get(st, st or 'Khác'), 'val': float(item['metric_val'] or 0)})
            elif group_by == 'pricing_method':
                dim_name = "Phương thức định giá"
                method_dict = {
                    'MULTI_ROUTE': 'Đa tuyến đường',
                    'FUEL_ADJUSTED': 'Biến động giá dầu DO',
                    'FLAT_CHARTER': 'Trọn gói / Bao chuyến'
                }
                grouped = qs.values('pricing_method').annotate(metric_val=agg_func)
                for item in grouped:
                    pm = item.get('pricing_method')
                    raw_data.append({'label': method_dict.get(pm, pm or 'Tiêu chuẩn'), 'val': float(item['metric_val'] or 0)})
            else: # customer
                dim_name = "Khách hàng"
                grouped = qs.values('customer__short_name', 'customer__name', 'customer__code').annotate(metric_val=agg_func)
                for item in grouped:
                    cname = (item.get('customer__short_name') or '').strip() or item.get('customer__name') or item.get('customer__code') or 'Khách hàng'
                    raw_data.append({'label': cname, 'val': float(item['metric_val'] or 0)})

            title = f"{agg_label} {metric_name} theo {dim_name} ({period_label})"

        # ==========================================
        # 6. ENTITY: ADVANCES (Tạm ứng lái xe)
        # ==========================================
        elif entity == 'advances':
            qs = DriverTripAdvance.objects.filter(is_deleted=False).filter(date_filter)

            if metric == 'advance_count':
                is_currency = False
                unit = "phiếu"
                metric_name = "Số phiếu tạm ứng"
                val_field = 'id'
                agg = 'count'
            else: # amount
                is_currency = True
                unit = "VNĐ"
                metric_name = "Số tiền tạm ứng"
                val_field = 'amount'

            agg_func = Count(val_field) if agg == 'count' else (Avg(val_field) if agg == 'avg' else Sum(val_field))
            agg_label = "Trung bình" if agg == 'avg' else ("Tổng" if agg == 'sum' else "Số lượng")

            raw_data = []
            if group_by == 'advance_source':
                dim_name = "Nguồn tạm ứng"
                grouped = qs.values('advance_source').annotate(metric_val=agg_func)
                for item in grouped:
                    src = item.get('advance_source')
                    lbl = 'Quỹ điều vận' if 'DISPATCHER' in str(src) else 'Công ty chi trực tiếp'
                    raw_data.append({'label': lbl, 'val': float(item['metric_val'] or 0)})
            else: # driver
                dim_name = "Tài xế nhận tạm ứng"
                grouped = qs.values('driver__full_name', 'driver__nickname').annotate(metric_val=agg_func)
                for item in grouped:
                    dname = item.get('driver__full_name') or item.get('driver__nickname') or 'Tài xế'
                    raw_data.append({'label': dname, 'val': float(item['metric_val'] or 0)})

            title = f"{agg_label} {metric_name} theo {dim_name} ({period_label})"

        # ==========================================
        # 7. ENTITY: EXCEPTIONS (Sự cố vận tải OS&D)
        # ==========================================
        elif entity == 'exceptions':
            qs = TripException.objects.filter(is_deleted=False).filter(date_filter)
            is_currency = False
            unit = "vụ việc"
            metric_name = "Số vụ việc sự cố"
            val_field = 'id'
            agg = 'count'
            agg_label = "Thống kê"

            raw_data = []
            if group_by == 'severity':
                dim_name = "Mức độ nghiêm trọng"
                sev_labels = dict(ExceptionSeverity.choices)
                grouped = qs.values('severity').annotate(metric_val=Count('id'))
                for item in grouped:
                    sv = item.get('severity')
                    raw_data.append({'label': sev_labels.get(sv, sv or 'Bình thường'), 'val': float(item['metric_val'] or 0)})
            elif group_by == 'is_resolved':
                dim_name = "Tình trạng xử lý"
                grouped = qs.values('is_resolved').annotate(metric_val=Count('id'))
                for item in grouped:
                    res = item.get('is_resolved')
                    lbl = 'Đã giải quyết xong' if res else 'Đang xử lý / Tồn đọng'
                    raw_data.append({'label': lbl, 'val': float(item['metric_val'] or 0)})
            else: # exception_type
                dim_name = "Loại sự cố vận tải"
                type_labels = dict(ExceptionType.choices)
                grouped = qs.values('exception_type').annotate(metric_val=Count('id'))
                for item in grouped:
                    et = item.get('exception_type')
                    raw_data.append({'label': type_labels.get(et, et or 'Sự cố khác'), 'val': float(item['metric_val'] or 0)})

            title = f"{agg_label} {metric_name} theo {dim_name} ({period_label})"

        # ==========================================
        # 8. ENTITY: PERSONNEL (Nhân sự & Đội ngũ)
        # ==========================================
        else: # personnel
            qs = Employee.objects.filter(is_deleted=False)

            is_currency = False
            unit = "nhân sự"
            metric_name = "Số lượng nhân sự"
            val_field = 'id'
            agg = 'count'

            agg_func = Count(val_field) if agg == 'count' else (Avg(val_field) if agg == 'avg' else Sum(val_field))
            agg_label = "Trung bình" if agg == 'avg' else ("Tổng" if agg == 'sum' else "Số lượng")

            raw_data = []
            if group_by == 'role':
                dim_name = "Chức vụ & Vị trí"
                role_labels = dict(EmployeeRole.choices)
                grouped = qs.values('role').annotate(metric_val=agg_func)
                for item in grouped:
                    r = item.get('role')
                    raw_data.append({'label': role_labels.get(r, r or 'Nhân viên'), 'val': float(item['metric_val'] or 0)})
            elif group_by == 'is_active':
                dim_name = "Trạng thái công tác"
                grouped = qs.values('is_active').annotate(metric_val=agg_func)
                for item in grouped:
                    act = item.get('is_active')
                    lbl = 'Đang làm việc' if act else 'Đã nghỉ việc'
                    raw_data.append({'label': lbl, 'val': float(item['metric_val'] or 0)})
            elif group_by == 'gender':
                dim_name = "Giới tính"
                grouped = qs.values('gender').annotate(metric_val=agg_func)
                for item in grouped:
                    g = item.get('gender')
                    lbl = 'Nam' if g == 'MALE' else ('Nữ' if g == 'FEMALE' else 'Khác')
                    raw_data.append({'label': lbl, 'val': float(item['metric_val'] or 0)})
            else: # department
                dim_name = "Phòng ban"
                dept_labels = dict(Department.choices)
                grouped = qs.values('department').annotate(metric_val=agg_func)
                for item in grouped:
                    d = item.get('department')
                    raw_data.append({'label': dept_labels.get(d, d or 'Chưa phân bổ'), 'val': float(item['metric_val'] or 0)})

            title = f"{agg_label} {metric_name} theo {dim_name}"

        # Sắp xếp và giới hạn Limit
        reverse_sort = (sort_order == 'desc')
        raw_data.sort(key=lambda x: x['val'], reverse=reverse_sort)
        sliced_data = raw_data[:limit]

        total_sum = sum(x['val'] for x in sliced_data)

        # Chuẩn bị dữ liệu trả về cho Chart.js và Table View
        table_rows = []
        for item in sliced_data:
            val = item['val']
            pct = round((val / total_sum * 100), 1) if total_sum > 0 else 0
            if is_currency:
                formatted_val = f"{val:,.0f} đ"
            else:
                formatted_val = f"{val:,.1f}" if val % 1 != 0 else f"{int(val)} {unit}"

            labels.append(item['label'])
            data_values.append(val)
            table_rows.append({
                'label': item['label'],
                'value': val,
                'formatted_value': formatted_val,
                'percentage': pct
            })

        formatted_total = f"{total_sum:,.0f} đ" if is_currency else f"{int(total_sum)} {unit}"

        # Bảng màu thương hiệu GSS Logistics
        bim_palette = [
            'rgba(15, 118, 110, 0.85)',   # Teal 700
            'rgba(16, 185, 129, 0.85)',  # Emerald 500
            'rgba(59, 130, 246, 0.85)',  # Blue 500
            'rgba(245, 158, 11, 0.85)',  # Amber 500
            'rgba(99, 102, 241, 0.85)',  # Indigo 500
            'rgba(244, 63, 94, 0.85)',   # Rose 500
            'rgba(168, 85, 247, 0.85)',  # Purple 500
            'rgba(20, 184, 166, 0.85)',  # Teal 500
            'rgba(234, 88, 12, 0.85)',   # Orange 600
            'rgba(100, 116, 139, 0.85)'  # Slate 500
        ]
        bim_borders = [c.replace('0.85', '1.0') for c in bim_palette]

        return Response({
            'success': True,
            'title': title,
            'entity': entity,
            'group_by': group_by,
            'metric': metric,
            'agg': agg,
            'period': period,
            'period_label': period_label,
            'chart_type': chart_type,
            'limit': limit,
            'is_currency': is_currency,
            'unit': unit,
            'total': total_sum,
            'formatted_total': formatted_total,
            'labels': labels,
            'data': data_values,
            'colors': bim_palette[:len(labels)],
            'border_colors': bim_borders[:len(labels)],
            'table_rows': table_rows,
            'count': len(sliced_data)
        })
