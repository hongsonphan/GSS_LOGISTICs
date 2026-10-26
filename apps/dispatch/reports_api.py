import datetime
from decimal import Decimal
from django.db.models import Sum, Count, Q, F, Avg
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.security import GracefulJWTAuthentication
from core.permissions import CanViewOperationalReports
from apps.dispatch.models import DispatchTrip, TripStatus, ShipmentType
from apps.billing.models import (
    TripExpense, ExpenseCategory, ApprovalStatus,
    DispatcherAdvanceFund, DriverTripAdvance, FundStatus,
    DriverAdvanceStatus, AdvanceSourceType, SettlementDiffType,
    CashTransaction, TransactionType, CashFlowCategory, ReimbursementStatus
)
from apps.fleet.models import Vehicle, Trailer
from apps.customers.models import Customer
from apps.personnel.models import Employee, EmployeeRole


class ReportsAPIView(APIView):
    """
    API Báo Cáo Quản Trị & Thống Kê TMS Đa Chiều (11 Báo Cáo Chuẩn Kế Hoạch).
    Hỗ trợ lọc theo Kỳ (Hôm nay, Tuần này, Tháng này, Quý này, Tất cả), Khách hàng, Xe.
    Phân quyền:
    - Ban Giám Đốc (DIRECTOR) & Kế Toán (ACCOUNTANT): Toàn quyền xem P&L, doanh thu, lợi nhuận, chi phí, quỹ điều vận.
    - Điều Phối (DISPATCHER): Xem toàn bộ chỉ số vận hành, quản lý tạm ứng/chi phí tài xế, nhưng BẢO MẬT (MASK) doanh thu, lợi nhuận và P&L công ty.
    - Tài Xế (DRIVER) & Thợ Máy (MECHANIC): Bị từ chối (403 Forbidden).
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [CanViewOperationalReports]

    def get(self, request):
        period = request.GET.get('period', 'month') # today, 10_days, week, month, quarter, all
        from_date = request.GET.get('from_date') or request.GET.get('start_date')
        to_date = request.GET.get('to_date') or request.GET.get('end_date')
        customer_id = request.GET.get('customer_id', '')
        vehicle_id = request.GET.get('vehicle_id', '')

        # 1. Xác định khung thời gian lọc (Ưu tiên loading_date, fallback created_at__date)
        now = timezone.now()
        today = now.date()

        date_filter = Q(is_deleted=False)

        def make_date_range_q(start_d, end_d=None):
            if end_d:
                return (Q(loading_date__gte=start_d, loading_date__lte=end_d) | 
                        Q(loading_date__isnull=True, created_at__date__gte=start_d, created_at__date__lte=end_d))
            else:
                return (Q(loading_date=start_d) | 
                        Q(loading_date__isnull=True, created_at__date=start_d))

        start_d = None
        end_d = None
        if from_date or to_date:
            if from_date:
                try:
                    start_d = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                    date_filter &= (Q(loading_date__gte=start_d) | Q(loading_date__isnull=True, created_at__date__gte=start_d))
                except Exception:
                    pass
            if to_date:
                try:
                    end_d = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                    date_filter &= (Q(loading_date__lte=end_d) | Q(loading_date__isnull=True, created_at__date__lte=end_d))
                except Exception:
                    pass
        elif period == 'today':
            start_d = today
            end_d = today
            date_filter &= make_date_range_q(today)
        elif period in ('10_days', '10days', 'ten_days'):
            start_10 = today - datetime.timedelta(days=9)
            start_d = start_10
            end_d = today
            date_filter &= make_date_range_q(start_10, today)
        elif period == 'week':
            start_week = today - datetime.timedelta(days=today.weekday())
            start_d = start_week
            end_d = today
            date_filter &= make_date_range_q(start_week, today)
        elif period == 'month':
            start_month = today.replace(day=1)
            start_d = start_month
            end_d = today
            date_filter &= make_date_range_q(start_month, today)
        elif period == 'quarter':
            quarter_start_month = ((today.month - 1) // 3) * 3 + 1
            start_quarter = today.replace(month=quarter_start_month, day=1)
            start_d = start_quarter
            end_d = today
            date_filter &= make_date_range_q(start_quarter, today)
        elif period in ('year', 'this_year'):
            start_year = today.replace(month=1, day=1)
            start_d = start_year
            end_d = today
            date_filter &= make_date_range_q(start_year, today)

        if customer_id:
            date_filter &= Q(customer_id=customer_id)
        if vehicle_id:
            date_filter &= Q(vehicle_id=vehicle_id)

        trips_qs = DispatchTrip.objects.filter(date_filter).select_related(
            'customer', 'vehicle', 'driver', 'trailer', 'dropoff_driver', 'dropoff_vehicle', 'booking_order'
        ).prefetch_related('expenses', 'event_logs', 'timeline_items', 'documents', 'driver_advances', 'driver_advances__settled_by')

        # Helper tính doanh thu / chi phí thực tế cho từng chuyến nếu cache chưa cập nhật
        def get_trip_financials(t):
            rev = int(t.cached_revenue or 0)
            if rev <= 0:
                if t.booking_order and t.booking_order.selling_freight_price > 0:
                    rev = int(t.booking_order.selling_freight_price)
                elif t.customer:
                    tariff = None
                    if t.pickup_loc and t.warehouse_loc:
                        tariff = t.customer.tariffs.filter(
                            pickup_loc=t.pickup_loc, delivery_loc=t.warehouse_loc
                        ).first()
                    if not tariff and t.pickup_location and t.warehouse_location:
                        tariff = t.customer.tariffs.filter(
                            pickup_location__iexact=t.pickup_location.strip(),
                            delivery_location__iexact=t.warehouse_location.strip()
                        ).first()
                    if tariff:
                        rev = int(tariff.freight_price)

            exp = int(t.cached_expense or 0)
            if exp <= 0 and t.expenses.exists():
                direct_exp = sum(
                    int(e.amount) for e in t.expenses.all() 
                    if not e.is_deleted and not e.is_on_behalf_of_customer and e.status != ApprovalStatus.REJECTED
                )
                drv_pay = int(t.driver_allowance or 0) + int(t.detention_driver_allowance or 0) + int(t.dropoff_driver_allowance or 0)
                exp = direct_exp + drv_pay

            profit = rev - exp
            return rev, exp, profit

        # Dữ liệu phục vụ Báo cáo 1: Hiệu suất Đội xe & P&L Đầu Xe
        total_trips = trips_qs.count()
        owned_trips = trips_qs.filter(vehicle__ownership_type='OWNED').count()
        partner_trips = total_trips - owned_trips
        owned_ratio = round((owned_trips / total_trips * 100), 1) if total_trips > 0 else 0.0

        split_trips_count = trips_qs.filter(is_split_trip=True).count()
        twin_trips_count = trips_qs.filter(is_twin_container=True).count()
        
        # Tổng hợp tài chính chuẩn xác từ các record trong database
        total_revenue = 0
        total_expense = 0
        total_profit = 0

        # Gom nhóm P&L theo đầu xe
        vehicles_dict = {}
        for t in trips_qs:
            rev, exp, prof = get_trip_financials(t)
            total_revenue += rev
            total_expense += exp
            total_profit += prof

            plate = t.vehicle.license_plate if t.vehicle else 'Chưa gán'
            if plate not in vehicles_dict:
                vehicles_dict[plate] = {
                    'plate': plate,
                    'vehicle_type': t.vehicle.get_vehicle_type_display() if t.vehicle else 'Đầu kéo',
                    'ownership': 'Xe Nhà' if t.vehicle and t.vehicle.ownership_type == 'OWNED' else 'Xe Bạn / 3PL',
                    'ownership_code': t.vehicle.ownership_type if t.vehicle else 'OWNED',
                    'driver': t.driver.full_name if t.driver else '-',
                    'trips_count': 0,
                    'containers_count': 0,
                    'revenue': 0,
                    'expense': 0,
                    'profit': 0,
                    'margin_percent': 0.0,
                    'avg_revenue_per_trip': 0,
                    'avg_revenue_per_container': 0,
                    'revenue_share': 0.0,
                    'trips': []
                }
            conts = 2 if t.is_twin_container else 1
            vehicles_dict[plate]['trips_count'] += 1
            vehicles_dict[plate]['containers_count'] += conts
            vehicles_dict[plate]['revenue'] += rev
            vehicles_dict[plate]['expense'] += exp
            vehicles_dict[plate]['profit'] += prof

            t_date = t.loading_date or (t.created_at.date() if t.created_at else None)
            vehicles_dict[plate]['trips'].append({
                'id': t.id,
                'trip_code': t.trip_code,
                'date': t_date.strftime('%d/%m/%Y') if t_date else '-',
                'customer_name': t.customer.name if t.customer else 'Khách lẻ',
                'customer_code': t.customer.code if t.customer else '-',
                'driver_name': t.driver.nickname or t.driver.full_name if t.driver else '-',
                'vehicle_plate': plate,
                'container_number': t.container_number or '-',
                'container_type': t.container_type or ('40HC' if not t.container_type else t.container_type),
                'route': f"{t.pickup_location or 'Cảng'} ➔ {t.delivery_warehouse or t.dropoff_location or 'Kho KH'}",
                'status': t.status,
                'status_label': t.get_status_display(),
                'revenue': rev,
                'expense': exp,
            })

        margin_avg = round(float(total_profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0

        fleet_pnl = list(vehicles_dict.values())
        for f in fleet_pnl:
            trips = f['trips_count']
            conts = f['containers_count']
            rev = f['revenue']
            f['avg_revenue_per_trip'] = round(rev / trips) if trips > 0 else 0
            f['avg_revenue_per_container'] = round(rev / conts) if conts > 0 else 0
            f['revenue_share'] = round(rev / total_revenue * 100, 1) if total_revenue > 0 else 0.0
            if rev > 0:
                f['margin_percent'] = round(f['profit'] / rev * 100, 1)
        fleet_pnl.sort(key=lambda x: x['revenue'], reverse=True)
        total_fleet_containers = sum(f['containers_count'] for f in fleet_pnl)

        # Xếp hạng tài xế
        driver_dict = {}
        for t in trips_qs:
            rev, _, _ = get_trip_financials(t)
            drv = t.driver.full_name if t.driver else 'Chưa gán'
            if drv not in driver_dict:
                driver_dict[drv] = {
                    'driver_name': drv,
                    'code': t.driver.code if t.driver else '-',
                    'trips_count': 0,
                    'revenue': 0,
                    'allowance': 0,
                    'on_time_trips': 0,
                    'otp_rate': 100.0
                }
            driver_dict[drv]['trips_count'] += 1
            driver_dict[drv]['revenue'] += rev
            driver_dict[drv]['allowance'] += int(t.driver_allowance or 0)
            if t.status in [TripStatus.DELIVERED, TripStatus.COMPLETED, TripStatus.RETURNING_EMPTY]:
                driver_dict[drv]['on_time_trips'] += 1

        driver_scorecards = list(driver_dict.values())
        for d in driver_scorecards:
            if d['trips_count'] > 0:
                d['otp_rate'] = round(d['on_time_trips'] / d['trips_count'] * 100, 1)
        driver_scorecards.sort(key=lambda x: x['trips_count'], reverse=True)

        # -------------------------------------------------------------
        # Dữ liệu phục vụ Báo cáo 2: Chu trình Vỏ Container & DEM/DET (kèm Hãng Tàu)
        # -------------------------------------------------------------
        dem_det_list = []
        det_safe_count = 0
        det_warning_count = 0
        det_overdue_count = 0
        estimated_fines_total = 0

        # Thống kê theo Hãng Tàu (Shipping Lines Summary)
        shipping_line_dict = {}

        for t in trips_qs:
            if not t.container_number:
                continue
            
            # Tính trạng thái Free DET dựa trên dữ liệu thực tế
            status_det = 'SAFE'
            days_left = 99
            fines = 0

            # Nếu chuyến đã hoàn tất hoặc đã hạ cont xong: Không tính quá hạn nữa
            is_dropped_off = t.status in [TripStatus.COMPLETED, TripStatus.RETURNING_EMPTY]

            if t.det_expiry_date:
                delta_days = (t.det_expiry_date - today).days
                days_left = delta_days

                if is_dropped_off:
                    status_det = 'SAFE'
                    det_safe_count += 1
                elif delta_days < 0:
                    status_det = 'OVERDUE'
                    det_overdue_count += 1
                    fines = abs(delta_days) * 750000 # 750k/ngày ước tính
                    estimated_fines_total += fines
                elif delta_days <= 1:
                    status_det = 'WARNING'
                    det_warning_count += 1
                else:
                    status_det = 'SAFE'
                    det_safe_count += 1
            else:
                det_safe_count += 1

            sline_name = (t.shipping_line or 'Chưa rõ').strip()
            if sline_name not in shipping_line_dict:
                shipping_line_dict[sline_name] = {
                    'shipping_line': sline_name,
                    'total_containers': 0,
                    'safe_count': 0,
                    'warning_count': 0,
                    'overdue_count': 0,
                    'estimated_fines': 0
                }
            shipping_line_dict[sline_name]['total_containers'] += 1
            if status_det == 'SAFE':
                shipping_line_dict[sline_name]['safe_count'] += 1
            elif status_det == 'WARNING':
                shipping_line_dict[sline_name]['warning_count'] += 1
            elif status_det == 'OVERDUE':
                shipping_line_dict[sline_name]['overdue_count'] += 1
                shipping_line_dict[sline_name]['estimated_fines'] += fines

            dem_det_list.append({
                'trip_code': t.trip_code,
                'container_number': t.container_number,
                'container_type': t.container_type or '40HC',
                'customer_name': t.customer.name if t.customer else 'Khách lẻ',
                'shipping_line': sline_name,
                'location_type': t.cont_location_type or 'KHO KHÁCH',
                'det_free_days': t.det_free_days,
                'det_expiry_date': t.det_expiry_date.strftime('%d/%m/%Y') if t.det_expiry_date else 'Không có',
                'days_left': days_left,
                'det_status': status_det,
                'estimated_fines': fines,
                'trip_status': t.get_status_display()
            })

        shipping_lines_summary = sorted(list(shipping_line_dict.values()), key=lambda x: x['total_containers'], reverse=True)

        # -------------------------------------------------------------
        # Dữ liệu phục vụ Báo cáo 3: Đúng Giờ & Chất Lượng OTP (SLA) TỪ RECORD THỰC TẾ
        # -------------------------------------------------------------
        otp_pickup_on_time = 0
        otp_arrival_on_time = 0
        otp_closing_on_time = 0
        delay_reasons = {
            'Kẹt xe / Phân luồng cầu cảng': 0,
            'Cảng / Depot lấy hàng ùn tắc': 0,
            'Kho khách bốc dỡ chậm': 0,
            'Thủ tục Hải quan kiểm hóa': 0,
            'Sự cố kỹ thuật xe': 0,
            'Lưu bãi chờ mở CY qua đêm': 0
        }

        otp_trips_data = []
        for t in trips_qs:
            is_on_time = True
            delay_reason = '-'

            # Truy xuất sự cố thật từ TrackingEventLog (event_logs)
            incident_log = next((log for log in t.event_logs.all() if log.event_type == 'INCIDENT'), None)
            
            if incident_log:
                is_on_time = False
                desc = incident_log.description or incident_log.title
                delay_reason = desc
                desc_lower = desc.lower()
                if any(k in desc_lower for k in ['hỏng xe', 'nổ lốp', 'sự cố kỹ thuật', 'va quẹt']):
                    delay_reasons['Sự cố kỹ thuật xe'] += 1
                elif any(k in desc_lower for k in ['kẹt xe', 'kẹt đường', 'phân luồng', 'csgt']):
                    delay_reasons['Kẹt xe / Phân luồng cầu cảng'] += 1
                elif any(k in desc_lower for k in ['kho từ chối', 'bốc dỡ', 'dock', 'chậm']):
                    delay_reasons['Kho khách bốc dỡ chậm'] += 1
                elif any(k in desc_lower for k in ['hải quan', 'kiểm hóa']):
                    delay_reasons['Thủ tục Hải quan kiểm hóa'] += 1
                else:
                    delay_reasons['Cảng / Depot lấy hàng ùn tắc'] += 1
            elif t.is_overnight_detention or (t.overnight_wait_hours and t.overnight_wait_hours > 0):
                is_on_time = False
                delay_reason = t.detention_reason or 'Neo xe chờ hạ sau 0h / Chờ mở CY'
                delay_reasons['Lưu bãi chờ mở CY qua đêm'] += 1
            elif t.status == TripStatus.CANCELLED:
                is_on_time = False
                delay_reason = 'Hủy chuyến theo yêu cầu khách hàng'
                delay_reasons['Kho khách bốc dỡ chậm'] += 1
            else:
                # Chuyến vận hành bình thường đúng giờ
                otp_pickup_on_time += 1
                otp_arrival_on_time += 1
                otp_closing_on_time += 1

            otp_trips_data.append({
                'trip_code': t.trip_code,
                'customer_name': t.customer.name if t.customer else 'Khách lẻ',
                'route': f"{t.pickup_location} ➔ {t.dropoff_location or t.delivery_warehouse or 'Kho KH'}",
                'driver_name': t.driver.full_name if t.driver else '-',
                'vehicle': t.vehicle.license_plate if t.vehicle else '-',
                'loading_time': t.loading_time or '08:00',
                'gate_in_time': t.actual_gate_in_time or t.loading_time or '08:00',
                'closing_time': t.cutoff_time or 'Không yêu cầu',
                'is_on_time': is_on_time,
                'delay_reason': delay_reason,
                'status': t.get_status_display()
            })

        otp_rate = round(otp_arrival_on_time / total_trips * 100, 1) if total_trips > 0 else 100.0

        # -------------------------------------------------------------
        # Dữ liệu phục vụ Báo cáo 4: Chi Phí Phát Sinh Tuyến (Theo Xe, Theo Tài & Theo Khách Hàng)
        # -------------------------------------------------------------
        all_expenses = TripExpense.objects.filter(trip__in=trips_qs, is_deleted=False).select_related(
            'trip', 'trip__customer', 'trip__vehicle', 'trip__driver'
        )
        reimbursable_expenses = []
        total_reimbursable = 0
        total_reimbursable_collected = 0

        for exp in all_expenses:
            if exp.is_on_behalf_of_customer:
                total_reimbursable += int(exp.amount or 0)
                is_settled = (exp.status == ApprovalStatus.SETTLED or getattr(exp, 'reimbursement_status', '') == 'COLLECTED')
                if is_settled:
                    total_reimbursable_collected += int(exp.amount or 0)
                reimbursable_expenses.append({
                    'id': exp.id,
                    'trip_code': exp.trip.trip_code,
                    'customer_name': exp.trip.customer.name if exp.trip.customer else 'Khách lẻ',
                    'expense_name': exp.notes or exp.get_category_display(),
                    'expense_type': exp.get_category_display(),
                    'amount': int(exp.amount or 0),
                    'invoice_number': exp.invoice_number or 'Chưa có',
                    'date': exp.created_at.strftime('%d/%m/%Y'),
                    'is_settled': is_settled,
                    'settled_status': 'Đã thu hồi' if is_settled else 'Chờ khách trả'
                })

        total_bot = sum(int(exp.amount or 0) for exp in all_expenses if exp.category in [ExpenseCategory.TOLL_FEE, ExpenseCategory.BOT_TOLL])
        total_fuel = 0
        total_port_lift = sum(int(exp.amount or 0) for exp in all_expenses if exp.category in [ExpenseCategory.LIFT_ON, ExpenseCategory.LIFT_OFF, ExpenseCategory.LIFT_ON_OFF, ExpenseCategory.PORT_STORAGE])
        total_route_cost = 0

        # Khởi tạo các từ điển gom nhóm đa chiều
        routes_dict = {}
        veh_cost_dict = {}
        drv_cost_dict = {}
        cust_cost_dict = {}

        for t in trips_qs:
            t_date = t.loading_date or (t.created_at.date() if t.created_at else None)
            t_route = f"{t.pickup_location or 'Cảng'} ➔ {t.delivery_warehouse or t.dropoff_location or 'Kho KH'}"
            t_plate = t.vehicle.license_plate if t.vehicle else 'Chưa gán xe'
            t_driver = t.driver.nickname or t.driver.full_name if t.driver else 'Chưa gán tài'
            t_driver_code = t.driver.code if t.driver else '-'
            t_cust = t.customer.name if t.customer else 'Khách lẻ'
            t_cust_code = t.customer.code if t.customer else '-'

            rev, _, _ = get_trip_financials(t)

            # Phân rã chi phí chi tiết của từng chuyến
            t_bot = 0
            t_lift = 0
            t_reimb = 0
            t_other = 0
            for e in t.expenses.all():
                if e.is_deleted or e.status == ApprovalStatus.REJECTED:
                    continue
                amt = int(e.amount or 0)
                if e.is_on_behalf_of_customer:
                    t_reimb += amt
                elif e.category in [ExpenseCategory.TOLL_FEE, ExpenseCategory.BOT_TOLL]:
                    t_bot += amt
                elif e.category in [ExpenseCategory.LIFT_ON, ExpenseCategory.LIFT_OFF, ExpenseCategory.LIFT_ON_OFF, ExpenseCategory.PORT_STORAGE]:
                    t_lift += amt
                else:
                    t_other += amt

            t_drv_pay = int(t.driver_allowance or 0) + int(t.detention_driver_allowance or 0) + int(t.dropoff_driver_allowance or 0)
            t_direct_exp = t_bot + t_lift + t_other + t_drv_pay
            t_total_cost = t_direct_exp + t_reimb
            total_route_cost += t_direct_exp

            trip_item = {
                'id': t.id,
                'trip_code': t.trip_code,
                'date': t_date.strftime('%d/%m/%Y') if t_date else '-',
                'route': t_route,
                'vehicle_plate': t_plate,
                'driver_name': t_driver,
                'customer_name': t_cust,
                'customer_code': t_cust_code,
                'container_number': t.container_number or '-',
                'container_type': t.container_type or '40HC',
                'status': t.status,
                'status_label': t.get_status_display(),
                'revenue': rev,
                'expense': t_direct_exp,
                'bot_fee': t_bot,
                'lift_fee': t_lift,
                'reimbursable_fee': t_reimb,
                'other_fee': t_other,
                'driver_allowance': t_drv_pay,
                'total_cost': t_total_cost
            }

            # 1. Gom nhóm theo Tuyến đường (Route)
            if t_route not in routes_dict:
                routes_dict[t_route] = {
                    'route_name': t_route,
                    'trips_count': 0,
                    'containers_count': 0,
                    'revenue': 0,
                    'direct_expense': 0,
                    'bot_fee': 0,
                    'lift_fee': 0,
                    'reimbursable_fee': 0,
                    'other_fee': 0,
                    'driver_allowance': 0,
                    'total_cost': 0,
                    'trips': []
                }
            r_entry = routes_dict[t_route]
            r_entry['trips_count'] += 1
            r_entry['containers_count'] += (2 if t.is_twin_container else 1)
            r_entry['revenue'] += rev
            r_entry['direct_expense'] += t_direct_exp
            r_entry['bot_fee'] += t_bot
            r_entry['lift_fee'] += t_lift
            r_entry['reimbursable_fee'] += t_reimb
            r_entry['other_fee'] += t_other
            r_entry['driver_allowance'] += t_drv_pay
            r_entry['total_cost'] += t_total_cost
            r_entry['trips'].append(trip_item)

            # 2. Gom nhóm theo Đầu xe (Vehicle)
            if t_plate not in veh_cost_dict:
                veh_cost_dict[t_plate] = {
                    'plate': t_plate,
                    'vehicle_type': t.vehicle.vehicle_type if t.vehicle else 'Đầu kéo',
                    'ownership': t.vehicle.ownership_type if t.vehicle else 'Xe Nhà',
                    'routes_freq': {},
                    'trips_count': 0,
                    'revenue': 0,
                    'direct_expense': 0,
                    'bot_fee': 0,
                    'lift_fee': 0,
                    'reimbursable_fee': 0,
                    'other_fee': 0,
                    'total_cost': 0,
                    'trips': []
                }
            v_entry = veh_cost_dict[t_plate]
            v_entry['trips_count'] += 1
            v_entry['revenue'] += rev
            v_entry['direct_expense'] += t_direct_exp
            v_entry['bot_fee'] += t_bot
            v_entry['lift_fee'] += t_lift
            v_entry['reimbursable_fee'] += t_reimb
            v_entry['other_fee'] += t_other
            v_entry['total_cost'] += t_total_cost
            v_entry['routes_freq'][t_route] = v_entry['routes_freq'].get(t_route, 0) + 1
            v_entry['trips'].append(trip_item)

            # 3. Gom nhóm theo Tài xế (Driver)
            if t_driver not in drv_cost_dict:
                drv_cost_dict[t_driver] = {
                    'driver_name': t_driver,
                    'driver_code': t_driver_code,
                    'assigned_vehicle': t_plate,
                    'routes_freq': {},
                    'trips_count': 0,
                    'direct_expense': 0,
                    'bot_fee': 0,
                    'lift_fee': 0,
                    'other_fee': 0,
                    'driver_allowance': 0,
                    'total_cost': 0,
                    'trips': []
                }
            d_entry = drv_cost_dict[t_driver]
            d_entry['trips_count'] += 1
            d_entry['direct_expense'] += t_direct_exp
            d_entry['bot_fee'] += t_bot
            d_entry['lift_fee'] += t_lift
            d_entry['other_fee'] += t_other
            d_entry['driver_allowance'] += t_drv_pay
            d_entry['total_cost'] += t_total_cost
            d_entry['routes_freq'][t_route] = d_entry['routes_freq'].get(t_route, 0) + 1
            d_entry['trips'].append(trip_item)

            # 4. Gom nhóm theo Khách hàng (Customer)
            if t_cust not in cust_cost_dict:
                cust_cost_dict[t_cust] = {
                    'customer_name': t_cust,
                    'customer_code': t_cust_code,
                    'routes_freq': {},
                    'trips_count': 0,
                    'revenue': 0,
                    'direct_expense': 0,
                    'reimbursable_fee': 0,
                    'total_cost': 0,
                    'gross_profit': 0,
                    'margin_percent': 0.0,
                    'trips': []
                }
            c_entry = cust_cost_dict[t_cust]
            c_entry['trips_count'] += 1
            c_entry['revenue'] += rev
            c_entry['direct_expense'] += t_direct_exp
            c_entry['reimbursable_fee'] += t_reimb
            c_entry['total_cost'] += t_total_cost
            c_entry['routes_freq'][t_route] = c_entry['routes_freq'].get(t_route, 0) + 1
            c_entry['trips'].append(trip_item)

        # Tính toán các chỉ số phái sinh và sắp xếp
        routes_cost_list = list(routes_dict.values())
        for r in routes_cost_list:
            r_trips = r['trips_count']
            r['avg_cost_per_trip'] = round(r['direct_expense'] / r_trips) if r_trips > 0 else 0
            r['cost_ratio'] = round(r['direct_expense'] / r['revenue'] * 100, 1) if r['revenue'] > 0 else 0.0
        routes_cost_list.sort(key=lambda x: x['direct_expense'], reverse=True)

        vehicles_cost_list = list(veh_cost_dict.values())
        for v in vehicles_cost_list:
            v_trips = v['trips_count']
            v['avg_cost_per_trip'] = round(v['direct_expense'] / v_trips) if v_trips > 0 else 0
            v['cost_ratio'] = round(v['direct_expense'] / v['revenue'] * 100, 1) if v['revenue'] > 0 else 0.0
            v['top_route'] = max(v['routes_freq'], key=v['routes_freq'].get) if v['routes_freq'] else '-'
            del v['routes_freq']
        vehicles_cost_list.sort(key=lambda x: x['direct_expense'], reverse=True)

        drivers_cost_list = list(drv_cost_dict.values())
        for d in drivers_cost_list:
            d_trips = d['trips_count']
            d['avg_cost_per_trip'] = round(d['direct_expense'] / d_trips) if d_trips > 0 else 0
            d['top_route'] = max(d['routes_freq'], key=d['routes_freq'].get) if d['routes_freq'] else '-'
            del d['routes_freq']
        drivers_cost_list.sort(key=lambda x: x['direct_expense'], reverse=True)

        customers_cost_list = list(cust_cost_dict.values())
        for c in customers_cost_list:
            c_profit = c['revenue'] - c['direct_expense']
            c['gross_profit'] = c_profit
            c['margin_percent'] = round(c_profit / c['revenue'] * 100, 1) if c['revenue'] > 0 else 0.0
            c['top_route'] = max(c['routes_freq'], key=c['routes_freq'].get) if c['routes_freq'] else '-'
            del c['routes_freq']
        customers_cost_list.sort(key=lambda x: x['direct_expense'], reverse=True)

        # -------------------------------------------------------------
        # Dữ liệu phục vụ Báo cáo 5: Bàn Giao Cắt Kéo & Lưu Xe Sau 0H
        # -------------------------------------------------------------
        drop_hook_and_layover_list = []
        overnight_trips_count = 0
        total_detention_fees = 0
        total_overnight_allowances = 0

        for t in trips_qs:
            has_layover = t.is_overnight_detention or bool(t.dropoff_appointment_time) or (t.detention_fee_customer > 0)
            if has_layover:
                overnight_trips_count += 1
                total_detention_fees += int(t.detention_fee_customer or 0)
                total_overnight_allowances += int(t.detention_driver_allowance or 0)

            # Chỉ đưa vào bảng nếu là Cắt Kéo hoặc có Lưu xe / Neo xe sau 0h
            if t.is_split_trip or has_layover:
                drop_hook_and_layover_list.append({
                    'trip_code': t.trip_code,
                    'customer_name': t.customer.name if t.customer else 'Khách lẻ',
                    'container_number': t.container_number or '-',
                    'is_split_trip': t.is_split_trip,
                    'driver_leg1': t.driver.full_name if t.driver else '-',
                    'vehicle_leg1': t.vehicle.license_plate if t.vehicle else '-',
                    'driver_leg2': t.dropoff_driver.full_name if t.dropoff_driver else (t.driver.full_name if t.driver else '-'),
                    'vehicle_leg2': t.dropoff_vehicle.license_plate if t.dropoff_vehicle else '-',
                    'gate_out_time': t.actual_gate_out_time or '-',
                    'appointment_dropoff': t.dropoff_appointment_time or ( 'Sau 00:00' if t.is_overnight_detention else '-' ),
                    'actual_dropoff': t.actual_dropoff_time or '-',
                    'wait_hours': float(t.overnight_wait_hours or 0),
                    'detention_fee': int(t.detention_fee_customer or 0),
                    'driver_allowance': int(t.detention_driver_allowance or 0),
                    'reason': t.detention_reason or ('Chờ mở CY bãi cảng sau 0h' if t.is_overnight_detention else 'Cắt kéo đảo đầu xe'),
                    'is_overnight': has_layover
                })

        # -------------------------------------------------------------
        # Dữ liệu phục vụ Báo cáo 6: Ngoại Lệ & Bồi Thường Hàng Hóa (OS&D) TỪ RECORD THẬT
        # -------------------------------------------------------------
        osd_list = []
        damaged_cont_count = 0
        broken_seal_count = 0

        for t in trips_qs:
            has_condition_issue = t.container_condition in ['DAMAGED', 'CLEANING_REQUIRED'] or bool(t.damage_description)
            incident_log = next((log for log in t.event_logs.all() if log.event_type == 'INCIDENT'), None)
            incident_doc = next((d for d in t.documents.all() if 'INCIDENT' in str(d.document_type).upper()), None)
            has_pod = any('POD' in str(d.document_type).upper() or 'biên bản' in str(d.title).lower() for d in t.documents.all())

            if has_condition_issue or incident_log or incident_doc:
                if t.container_condition == 'DAMAGED' or (incident_log and 'hỏng' in incident_log.description.lower()):
                    damaged_cont_count += 1

                # Xác định loại sự cố
                if incident_log:
                    inc_type = incident_log.title.replace('CẢNH BÁO SỰ CỐ: ', '')
                    inc_desc = incident_log.description
                elif t.container_condition == 'DAMAGED':
                    inc_type = 'Hư hỏng vỏ container'
                    inc_desc = t.damage_description or 'Hư hỏng vỏ cont ghi nhận khi nhận cont'
                elif t.container_condition == 'CLEANING_REQUIRED':
                    inc_type = 'Vỏ cont bẩn cần vệ sinh'
                    inc_desc = t.damage_description or 'Vỏ cont bẩn, cần xịt rửa/vệ sinh'
                else:
                    inc_type = 'Sự cố hiện trường'
                    inc_desc = t.damage_description or 'Biên bản sự cố ghi nhận tại cảng'

                if 'seal' in inc_desc.lower() or 'chì' in inc_desc.lower():
                    broken_seal_count += 1

                # Tìm chi phí thực tế phát sinh từ bảng chi phí
                real_repair_cost = sum(
                    int(e.amount) for e in t.expenses.all() 
                    if not e.is_deleted and (e.category in ['REPAIR_TIRE', 'OTHER'] or 'sửa' in (e.notes or '').lower() or 'vá' in (e.notes or '').lower())
                )

                settlement_txt = 'Đã chốt quyết toán' if t.is_expenses_settled else ('Đã có E-POD / Chờ đối soát' if has_pod else 'Chờ biên bản hiện trường')

                osd_list.append({
                    'trip_code': t.trip_code,
                    'date': t.loading_date.strftime('%d/%m/%Y') if t.loading_date else t.created_at.strftime('%d/%m/%Y'),
                    'customer_name': t.customer.name if t.customer else 'Khách lẻ',
                    'container_number': t.container_number or '-',
                    'seal_number': t.seal_number or '-',
                    'incident_type': inc_type,
                    'description': inc_desc,
                    'estimated_damage': real_repair_cost,
                    'settlement_status': settlement_txt,
                    'has_pod_photo': has_pod
                })

        # =============================================================
        # BÁO CÁO 7: PHÂN TÍCH DOANH THU KHÁCH HÀNG & SẢN LƯỢNG TEU
        # =============================================================
        customer_analytics_dict = {}
        total_system_teu = 0.0

        for t in trips_qs:
            c_name = t.customer.name if t.customer else 'Khách vãng lai'
            c_code = t.customer.code if t.customer else 'CUST_WALKIN'

            # Tính TEU quy đổi cho chuyến
            c_type = (t.container_type or '40HC').upper()
            teu_factor = 2.0
            is_20 = False
            is_40 = False
            is_45 = False

            if t.is_twin_container:
                teu_factor = 2.0
                is_20 = True # Ghép 2 cont 20
            elif '20' in c_type:
                teu_factor = 1.0
                is_20 = True
            elif '45' in c_type:
                teu_factor = 2.25
                is_45 = True
            else:
                teu_factor = 2.0
                is_40 = True

            total_system_teu += teu_factor

            if c_name not in customer_analytics_dict:
                customer_analytics_dict[c_name] = {
                    'customer_name': c_name,
                    'customer_code': c_code,
                    'trips_count': 0,
                    'containers_count': 0,
                    'total_teu': 0.0,
                    'teu_20_count': 0,
                    'teu_40_count': 0,
                    'teu_45_count': 0,
                    'revenue': 0,
                    'expense': 0,
                    'profit': 0,
                    'margin_percent': 0.0,
                    'revenue_share': 0.0,
                    'avg_revenue_per_trip': 0,
                    'avg_revenue_per_container': 0,
                    'routes_dict': {},
                    'top_route': '-',
                    'trips': []
                }

            row = customer_analytics_dict[c_name]
            row['trips_count'] += 1
            row['containers_count'] += (2 if t.is_twin_container else 1)
            row['total_teu'] += teu_factor
            if is_20:
                row['teu_20_count'] += (2 if t.is_twin_container else 1)
            elif is_45:
                row['teu_45_count'] += 1
            else:
                row['teu_40_count'] += 1

            rev, exp, prof = get_trip_financials(t)
            row['revenue'] += rev
            row['expense'] += exp
            row['profit'] += prof

            t_date = t.loading_date or (t.created_at.date() if t.created_at else None)
            row['trips'].append({
                'id': t.id,
                'trip_code': t.trip_code,
                'date': t_date.strftime('%d/%m/%Y') if t_date else '-',
                'customer_name': c_name,
                'customer_code': c_code,
                'driver_name': t.driver.nickname or t.driver.full_name if t.driver else '-',
                'vehicle_plate': t.vehicle.license_plate if t.vehicle else 'Chưa gán xe',
                'container_number': t.container_number or '-',
                'container_type': t.container_type or ('40HC' if not t.container_type else t.container_type),
                'route': f"{t.pickup_location or 'Cảng'} ➔ {t.delivery_warehouse or t.dropoff_location or 'Kho KH'}",
                'status': t.status,
                'status_label': t.get_status_display(),
                'revenue': rev,
                'expense': exp,
            })

            # Thống kê tuyến đường phổ biến nhất của khách
            route_name = f"{t.pickup_location} ➔ {t.delivery_warehouse or t.dropoff_location or 'Kho KH'}"
            row['routes_dict'][route_name] = row['routes_dict'].get(route_name, 0) + 1

        customer_analytics_list = list(customer_analytics_dict.values())
        for c in customer_analytics_list:
            c['total_teu'] = round(c['total_teu'], 2)
            c_trips = c['trips_count']
            c_conts = c['containers_count']
            c_rev = c['revenue']
            c['avg_revenue_per_trip'] = round(c_rev / c_trips) if c_trips > 0 else 0
            c['avg_revenue_per_container'] = round(c_rev / c_conts) if c_conts > 0 else 0
            if c['revenue'] > 0:
                c['margin_percent'] = round(c['profit'] / c['revenue'] * 100, 1)
                c['revenue_share'] = round(c['revenue'] / total_revenue * 100, 1) if total_revenue > 0 else 0.0
            # Tìm tuyến có tần suất cao nhất
            if c['routes_dict']:
                c['top_route'] = max(c['routes_dict'], key=c['routes_dict'].get)
            del c['routes_dict']

        customer_analytics_list.sort(key=lambda x: x['revenue'], reverse=True)
        top_key_account = customer_analytics_list[0]['customer_name'] if customer_analytics_list else '-'
        top_key_account_share = customer_analytics_list[0]['revenue_share'] if customer_analytics_list else 0.0
        avg_teu_per_trip = round(total_system_teu / total_trips, 2) if total_trips > 0 else 0.0

        # =============================================================
        # BÁO CÁO 8: QUYẾT TOÁN & CÔNG NỢ NHÀ XE THẦU PHỤ 3PL
        # =============================================================
        from apps.master_data.models import Subcontractor
        subcontractors_master = {s.name.lower(): s for s in Subcontractor.objects.filter(is_active=True, is_deleted=False)}

        subcontractor_dict = {}
        subcontractor_trips_data = []
        total_subcontractor_trips = 0
        total_gross_payable = 0
        total_subcontractor_advance = 0
        total_subcontractor_settled = 0

        for t in trips_qs:
            is_sub = (t.subcontractor_cost > 0) or (t.vehicle and t.vehicle.ownership_type == 'SUBCONTRACTOR')
            if not is_sub:
                continue

            total_subcontractor_trips += 1
            cost = int(t.subcontractor_cost) if t.subcontractor_cost > 0 else int(t.cached_expense or 0)
            advance = int(t.subcontractor_advance or 0)
            settled = cost if t.subcontractor_settlement_status == 'SETTLED' else advance
            balance = max(0, cost - settled)

            total_gross_payable += cost
            total_subcontractor_advance += advance
            total_subcontractor_settled += settled

            # Xác định tên nhà xe
            sub_name = (t.subcontractor_notes or '').split('-')[0].strip() if t.subcontractor_notes else ''
            if not sub_name and t.vehicle:
                sub_name = f"Nhà xe {t.vehicle.brand or 'Đối tác'}"
            if not sub_name:
                sub_name = 'Xe Thuê Ngoài / Vãng lai'


            # Tra cứu master data
            m_sub = subcontractors_master.get(sub_name.lower())
            bank_info = '-'
            contact_info = '-'
            if m_sub:
                sub_name = m_sub.name
                if m_sub.bank_account_number:
                    bank_info = f"{m_sub.bank_account_number} - {m_sub.bank_name or ''} ({m_sub.bank_account_holder or ''})".strip()
                if m_sub.phone or m_sub.contact_person:
                    contact_info = f"{m_sub.contact_person or ''} - {m_sub.phone or ''}".strip(' -')

            if sub_name not in subcontractor_dict:
                subcontractor_dict[sub_name] = {
                    'subcontractor_name': sub_name,
                    'contact_info': contact_info,
                    'bank_info': bank_info,
                    'trips_count': 0,
                    'gross_payable': 0,
                    'advance_amount': 0,
                    'settled_amount': 0,
                    'balance_due': 0,
                    'settlement_status': 'Chờ quyết toán'
                }

            s_row = subcontractor_dict[sub_name]
            s_row['trips_count'] += 1
            s_row['gross_payable'] += cost
            s_row['advance_amount'] += advance
            s_row['settled_amount'] += settled
            s_row['balance_due'] += balance

            subcontractor_trips_data.append({
                'trip_code': t.trip_code,
                'date': t.loading_date.strftime('%d/%m/%Y') if t.loading_date else '-',
                'subcontractor_name': sub_name,
                'vehicle': t.vehicle.license_plate if t.vehicle else 'Xe ngoài',
                'driver': t.driver.full_name if t.driver else '-',
                'route': f"{t.pickup_location} ➔ {t.dropoff_location or 'Kho KH'}",
                'container_number': t.container_number or '-',
                'gross_cost': cost,
                'advance': advance,
                'balance': balance,
                'status': t.get_subcontractor_settlement_status_display() if hasattr(t, 'get_subcontractor_settlement_status_display') else t.subcontractor_settlement_status,
                'bank_info': bank_info
            })

        subcontractors_summary = list(subcontractor_dict.values())
        for s in subcontractors_summary:
            if s['balance_due'] <= 0:
                s['settlement_status'] = 'Đã quyết toán xong'
            elif s['advance_amount'] > 0:
                s['settlement_status'] = 'Đã tạm ứng 1 phần'
            else:
                s['settlement_status'] = 'Chờ xuất UNC thanh toán'
        subcontractors_summary.sort(key=lambda x: x['balance_due'], reverse=True)

        total_balance_due = max(0, total_gross_payable - total_subcontractor_settled)

        # =============================================================
        # BÁO CÁO 9: BẢNG LƯƠNG CHUYẾN & NĂNG SUẤT TÀI XẾ
        # =============================================================
        driver_payroll_dict = {}
        total_payroll_fund = 0

        for t in trips_qs:
            # Chặng chính 1
            if t.driver:
                d_name = t.driver.full_name
                if d_name not in driver_payroll_dict:
                    driver_payroll_dict[d_name] = {
                        'driver_name': d_name,
                        'driver_code': t.driver.code or '-',
                        'phone': getattr(t.driver, 'phone_number', '') or '-',
                        'trips_count': 0,
                        'split_trips_count': 0,
                        'base_trip_salary': 0,
                        'layover_allowance': 0,
                        'special_allowances': 0,
                        'total_advances': 0,
                        'net_salary': 0,
                        'on_time_trips': 0,
                        'otp_rate': 100.0,
                        'incident_count': 0
                    }

                d_row = driver_payroll_dict[d_name]
                d_row['trips_count'] += 1
                if t.is_split_trip:
                    d_row['split_trips_count'] += 1

                b_sal = int(t.driver_allowance or 0)
                l_sal = int(t.detention_driver_allowance or 0)
                adv = int(t.driver_advance_amount or 0)

                d_row['base_trip_salary'] += b_sal
                d_row['layover_allowance'] += l_sal
                d_row['total_advances'] += adv
                total_payroll_fund += (b_sal + l_sal)

                if t.status in [TripStatus.DELIVERED, TripStatus.IN_TRANSIT]:
                    d_row['on_time_trips'] += 1
                if t.container_condition in ['DAMAGED', 'CLEANING_REQUIRED']:
                    d_row['incident_count'] += 1

            # Nếu chuyến cắt kéo có tài xế chặng 2 khác
            if t.is_split_trip and t.dropoff_driver and t.dropoff_driver != t.driver:
                d2_name = t.dropoff_driver.full_name
                if d2_name not in driver_payroll_dict:
                    driver_payroll_dict[d2_name] = {
                        'driver_name': d2_name,
                        'driver_code': t.dropoff_driver.code or '-',
                        'phone': getattr(t.dropoff_driver, 'phone_number', '') or '-',
                        'trips_count': 0,
                        'split_trips_count': 0,
                        'base_trip_salary': 0,
                        'layover_allowance': 0,
                        'special_allowances': 0,
                        'total_advances': 0,
                        'net_salary': 0,
                        'on_time_trips': 0,
                        'otp_rate': 100.0,
                        'incident_count': 0
                    }
                d2_row = driver_payroll_dict[d2_name]
                d2_row['trips_count'] += 1
                d2_row['split_trips_count'] += 1
                d2_sal = int(t.dropoff_driver_allowance or 0)
                d2_row['base_trip_salary'] += d2_sal
                total_payroll_fund += d2_sal
                d2_row['on_time_trips'] += 1

        driver_payroll_list = list(driver_payroll_dict.values())
        for dp in driver_payroll_list:
            dp['net_salary'] = (dp['base_trip_salary'] + dp['layover_allowance'] + dp['special_allowances']) - dp['total_advances']
            if dp['trips_count'] > 0:
                dp['otp_rate'] = round(dp['on_time_trips'] / dp['trips_count'] * 100, 1)

        driver_payroll_list.sort(key=lambda x: x['base_trip_salary'], reverse=True)
        active_drivers_count = len(driver_payroll_list)
        avg_salary_per_driver = int(total_payroll_fund / active_drivers_count) if active_drivers_count > 0 else 0
        top_driver_name = driver_payroll_list[0]['driver_name'] if driver_payroll_list else '-'

        # -------------------------------------------------------------
        # Kiểm tra thẩm quyền xem số liệu tài chính P&L (Bảo vệ thông tin kinh doanh)
        # -------------------------------------------------------------
        emp = getattr(request.user, 'employee', None)
        can_view_finance = request.user.is_superuser or request.user.is_staff or (
            emp and emp.role in [EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT]
        )

        if not can_view_finance:
            # Mask toàn bộ dữ liệu tài chính nhạy cảm với Điều độ viên
            total_revenue = 0
            total_expense = 0
            total_profit = 0
            margin_avg = 0.0
            total_reimbursable = 0
            for f in fleet_pnl:
                f['revenue'] = 0
                f['expense'] = 0
                f['profit'] = 0
                f['margin_percent'] = 0.0
                for tr in f.get('trips', []):
                    tr['revenue'] = 0
                    tr['expense'] = 0
            for d in driver_scorecards:
                d['revenue'] = 0
                d['allowance'] = 0
            total_bot = 0
            total_fuel = 0
            total_port_lift = 0
            total_reimbursable_collected = 0
            reimbursable_expenses = []

            # Mask Report 7 (Khách hàng)
            for c in customer_analytics_list:
                c['revenue'] = 0
                c['expense'] = 0
                c['profit'] = 0
                c['margin_percent'] = 0.0
                c['revenue_share'] = 0.0
                for tr in c.get('trips', []):
                    tr['revenue'] = 0
                    tr['expense'] = 0
            top_key_account_share = 0.0

            # Mask Report 8 (Thầu phụ 3PL)
            total_gross_payable = 0
            total_subcontractor_advance = 0
            total_subcontractor_settled = 0
            total_balance_due = 0
            for s in subcontractors_summary:
                s['gross_payable'] = 0
                s['advance_amount'] = 0
                s['settled_amount'] = 0
                s['balance_due'] = 0
            for st in subcontractor_trips_data:
                st['gross_cost'] = 0
                st['advance'] = 0
                st['balance'] = 0

            # Mask Report 9 (Lương chuyến)
            total_payroll_fund = 0
            avg_salary_per_driver = 0
            for dp in driver_payroll_list:
                dp['base_trip_salary'] = 0
                dp['layover_allowance'] = 0
                dp['special_allowances'] = 0
                dp['total_advances'] = 0
        # =============================================================
        # 10. BÁO CÁO QUỸ TẠM ỨNG ĐIỀU VẬN (KẾ TOÁN & GIÁM ĐỐC QUẢN LÝ)
        # =============================================================
        fund_date_q = Q(is_deleted=False)
        if start_d and end_d:
            fund_date_q &= Q(advance_date__gte=start_d, advance_date__lte=end_d)

        funds_qs = DispatcherAdvanceFund.objects.filter(fund_date_q).select_related(
            'dispatcher', 'approved_by', 'settled_by'
        ).prefetch_related('trip_advances').order_by('-advance_date', '-id')

        # Nếu không có quyền tài chính toàn quyền (tức là Điều phối viên), chỉ xem quỹ cấp cho chính mình
        if not can_view_finance and emp:
            funds_qs = funds_qs.filter(dispatcher=emp)

        total_funds_granted = 0
        total_disbursed_funds = 0
        total_settled_funds = 0
        total_refunds_funds = 0
        total_remaining_funds = 0
        active_funds_count = 0
        settled_funds_count = 0

        funds_list = []
        for f in funds_qs:
            disbursed = int(f.total_disbursed)
            settled_spent = int(f.total_settled_spent)
            refunds = int(f.total_refunds_returned)
            bal = int(f.remaining_balance)
            f_amt = int(f.amount)

            if f.status == FundStatus.APPROVED:
                active_funds_count += 1
                total_funds_granted += f_amt
                total_disbursed_funds += disbursed
                total_settled_funds += settled_spent
                total_refunds_funds += refunds
                total_remaining_funds += bal
            elif f.status == FundStatus.SETTLED:
                settled_funds_count += 1
                total_funds_granted += f_amt
                total_settled_funds += settled_spent

            util_rate = round(disbursed / f_amt * 100, 1) if f_amt > 0 else 0.0

            funds_list.append({
                'id': f.id,
                'code': f.code,
                'dispatcher_name': (f.dispatcher.nickname or f.dispatcher.full_name) if f.dispatcher else 'Chưa gán',
                'dispatcher_code': f.dispatcher.code if f.dispatcher else '-',
                'amount': f_amt,
                'advance_date': f.advance_date.strftime('%d/%m/%Y') if f.advance_date else '',
                'purpose': f.purpose,
                'status': f.status,
                'status_label': f.get_status_display(),
                'disbursed_amount': disbursed,
                'settled_amount': settled_spent,
                'refunds_returned': refunds,
                'remaining_balance': bal,
                'utilization_rate': util_rate,
                'approved_by': (f.approved_by.nickname or f.approved_by.full_name) if f.approved_by else '',
                'approved_at': f.approved_at.strftime('%d/%m/%Y %H:%M') if f.approved_at else '',
                'settled_by': (f.settled_by.nickname or f.settled_by.full_name) if f.settled_by else '',
                'settled_at': f.settled_at.strftime('%d/%m/%Y %H:%M') if f.settled_at else '',
                'settlement_notes': f.settlement_notes or '',
                'notes': f.notes or ''
            })

        # =============================================================
        # 11. BÁO CÁO TẠM ỨNG & CHI PHÍ PHÁT SINH TÀI XẾ (ĐIỀU VẬN QUẢN LÝ)
        # =============================================================
        driver_advances_trips_data = []
        total_driver_advances = 0
        total_driver_actual_expenses = 0
        total_driver_refund_due = 0
        total_driver_reimburse_due = 0
        pending_driver_settlement_count = 0
        settled_driver_advances_count = 0

        for t in trips_qs:
            adv_records = list(t.driver_advances.filter(is_deleted=False))
            adv_amount = sum(int(a.amount) for a in adv_records) if adv_records else int(t.driver_advance_amount or 0)

            valid_expenses = [e for e in t.expenses.all() if not e.is_deleted and e.status != ApprovalStatus.REJECTED]
            actual_exp = sum(int(e.amount) for e in valid_expenses)

            # Bỏ qua nếu chuyến xe không có cả tạm ứng lẫn chi phí phát sinh
            if adv_amount == 0 and actual_exp == 0:
                continue

            # Phân tách chi phí theo danh mục chuẩn Logistics
            bot_exp = sum(int(e.amount) for e in valid_expenses if e.category in [ExpenseCategory.TOLL_FEE, ExpenseCategory.BOT_TOLL])
            port_lift_exp = sum(int(e.amount) for e in valid_expenses if e.category in [ExpenseCategory.LIFT_ON, ExpenseCategory.LIFT_OFF, ExpenseCategory.LIFT_ON_OFF, ExpenseCategory.PORT_STORAGE])
            deposit_exp = sum(int(e.amount) for e in valid_expenses if e.category == ExpenseCategory.CONTAINER_DEPOSIT)
            other_exp = actual_exp - bot_exp - port_lift_exp - deposit_exp

            diff = adv_amount - actual_exp

            is_settled = False
            adv_status = 'PENDING'
            adv_code = '-'
            adv_source_label = 'Quỹ Điều Vận'
            fund_code = '-'
            settled_at_str = ''
            settled_by_name = ''

            if adv_records:
                primary_adv = adv_records[0]
                adv_code = primary_adv.code
                adv_source_label = primary_adv.get_advance_source_display()
                if primary_adv.dispatcher_fund:
                    fund_code = primary_adv.dispatcher_fund.code
                adv_status = primary_adv.status
                is_settled = (primary_adv.status == DriverAdvanceStatus.SETTLED)
                if primary_adv.settled_at:
                    settled_at_str = primary_adv.settled_at.strftime('%d/%m/%Y %H:%M')
                if primary_adv.settled_by:
                    settled_by_name = primary_adv.settled_by.nickname or primary_adv.settled_by.full_name
            elif t.advance_settlement_status == 'SETTLED':
                is_settled = True
                adv_status = 'SETTLED'
            elif adv_amount > 0:
                adv_status = 'ADVANCED'

            if is_settled:
                settled_driver_advances_count += 1
            else:
                pending_driver_settlement_count += 1
                total_driver_advances += adv_amount
                total_driver_actual_expenses += actual_exp
                if diff > 0:
                    total_driver_refund_due += diff
                elif diff < 0:
                    total_driver_reimburse_due += abs(diff)

            driver_name = t.driver.nickname or t.driver.full_name if t.driver else 'Chưa gán'
            driver_code = t.driver.code if t.driver else '-'
            driver_phone = getattr(t.driver, 'phone_number', '') or '-'
            plate = t.vehicle.license_plate if t.vehicle else 'Chưa gán'
            cust_name = t.customer.name if t.customer else '-'

            driver_advances_trips_data.append({
                'trip_id': t.id,
                'trip_code': t.trip_code,
                'advance_code': adv_code,
                'fund_code': fund_code,
                'customer_name': cust_name,
                'route': f"{t.pickup_location or t.pickup_loc or 'Kho nhận'} ➔ {t.warehouse_location or t.warehouse_loc or 'Kho giao'}",
                'driver_name': driver_name,
                'driver_code': driver_code,
                'driver_phone': driver_phone,
                'license_plate': plate,
                'advance_date': t.loading_date.strftime('%d/%m/%Y') if t.loading_date else t.created_at.strftime('%d/%m/%Y'),
                'advance_source': adv_source_label,
                'advance_amount': adv_amount,
                'actual_expenses': actual_exp,
                'bot_expense': bot_exp,
                'port_lift_expense': port_lift_exp,
                'deposit_expense': deposit_exp,
                'other_expense': other_exp,
                'difference': diff,
                'difference_abs': abs(diff),
                'settlement_action': 'REFUND' if diff > 0 else ('REIMBURSE' if diff < 0 else 'BALANCED'),
                'settlement_action_label': 'Tài xế nộp lại' if diff > 0 else ('Cty/ĐV bù thêm' if diff < 0 else 'Khớp đúng'),
                'status': adv_status,
                'status_label': 'Đã hoàn ứng' if is_settled else 'Đang tạm ứng',
                'is_settled': is_settled,
                'settled_at': settled_at_str,
                'settled_by': settled_by_name,
                'documents_count': t.documents.count() + len([e for e in valid_expenses if e.receipt_image]),
                'notes': (t.special_notes or t.cargo_notes or '')
            })

        # =========================================================================
        # BÁO CÁO 12: BÁO CÁO QUYẾT TOÁN CHUYẾN XE & BACKLOG CHUYỂN KỲ
        # =========================================================================
        settlement_trips_data = []
        settlement_total_count = 0
        settlement_settled_count = 0
        settlement_unsettled_count = 0
        settlement_carryover_count = 0
        settlement_settled_rev = 0
        settlement_settled_prof = 0
        settlement_unsettled_rev = 0

        current_trip_ids = set(trips_qs.values_list('id', flat=True))

        extra_settled_trips = []
        if start_d and end_d:
            extra_settled_trips = list(DispatchTrip.objects.filter(
                is_deleted=False,
                is_expenses_settled=True,
                settled_at__date__gte=start_d,
                settled_at__date__lte=end_d
            ).exclude(id__in=current_trip_ids).select_related(
                'customer', 'vehicle', 'driver', 'trailer', 'dropoff_driver', 'dropoff_vehicle', 'booking_order', 'settled_by'
            ).prefetch_related('expenses', 'documents'))

        combined_settlement_trips = list(trips_qs) + extra_settled_trips

        for t in combined_settlement_trips:
            rev, exp, prof = get_trip_financials(t)
            margin = round((prof / rev * 100), 1) if rev > 0 else 0.0
            is_settled = bool(t.is_expenses_settled)
            t_date = t.loading_date or t.created_at.date()
            
            is_carry_over = False
            if start_d and t_date < start_d:
                is_carry_over = True
            
            if is_settled:
                settlement_settled_count += 1
                settlement_settled_rev += rev
                settlement_settled_prof += prof
                if is_carry_over:
                    category_tag = 'BACKLOG_SETTLED'
                    category_label = 'Tồn kỳ trước ➔ Đã Quyết Toán'
                    settlement_carryover_count += 1
                else:
                    category_tag = 'CURRENT_SETTLED'
                    category_label = 'Trong kỳ ➔ Đã Quyết Toán'
            else:
                settlement_unsettled_count += 1
                settlement_unsettled_rev += rev
                if is_carry_over:
                    category_tag = 'BACKLOG_PENDING'
                    category_label = 'Tồn kỳ trước ➔ Chưa Quyết Toán (Nợ tiếp)'
                    settlement_carryover_count += 1
                else:
                    category_tag = 'CURRENT_PENDING'
                    category_label = 'Trong kỳ ➔ Chưa Quyết Toán'

            settlement_total_count += 1

            plate = t.vehicle.license_plate if t.vehicle else 'Chưa gán'
            dropoff_plate = t.dropoff_vehicle.license_plate if t.dropoff_vehicle else ''
            driver_name = t.driver.nickname or t.driver.full_name if t.driver else 'Chưa gán'
            dropoff_driver_name = t.dropoff_driver.nickname or t.dropoff_driver.full_name if t.dropoff_driver else ''
            
            ownership_code = 'OWNED'
            ownership_label = 'Xe Nhà'
            if t.vehicle and getattr(t.vehicle, 'ownership_type', 'OWNED') == 'PARTNER':
                ownership_code = 'PARTNER'
                ownership_label = 'Xe Bạn / 3PL'
            
            has_pod = t.documents.filter(document_type__in=['POD_RETURN', 'EIR_RECEIPT']).exists() or bool(t.actual_gate_out_time)
            reimbursable_sum = sum(e.amount for e in t.expenses.filter(is_deleted=False, is_on_behalf_of_customer=True))
            
            settled_at_str = t.settled_at.strftime('%d/%m/%Y %H:%M') if t.settled_at else '-'
            settled_by_name = (t.settled_by.nickname or t.settled_by.full_name) if t.settled_by else '-'

            settlement_trips_data.append({
                'trip_id': t.id,
                'trip_code': t.trip_code,
                'loading_date': t_date.strftime('%d/%m/%Y') if t_date else '-',
                'loading_date_iso': t_date.isoformat() if t_date else '',
                'customer_name': t.customer.name if t.customer else 'Khách lẻ',
                'customer_code': t.customer.code if t.customer else '-',
                'route': f"{t.pickup_location or 'Cảng/Bãi'} ➔ {t.warehouse_location or 'Kho'}",
                'container_number': t.container_number or '-',
                'vehicle_plate': plate,
                'dropoff_vehicle_plate': dropoff_plate,
                'driver_name': driver_name,
                'dropoff_driver_name': dropoff_driver_name,
                'vehicle_ownership': ownership_code,
                'ownership_label': ownership_label,
                'revenue': rev,
                'expense': exp,
                'reimbursable': reimbursable_sum,
                'profit': prof,
                'margin_percent': margin,
                'is_settled': is_settled,
                'is_carry_over': is_carry_over,
                'category_tag': category_tag,
                'category_label': category_label,
                'has_pod': has_pod,
                'pod_status_label': 'Đã nộp POD' if has_pod else 'Chưa có POD',
                'settled_at': settled_at_str,
                'settled_by': settled_by_name,
                'settlement_batch_code': getattr(t, 'settlement_batch_code', '') or '-',
                'special_notes': t.special_notes or ''
            })

        # =========================================================================
        # BÁO CÁO 13: BÁO CÁO THEO DÕI CÔNG NỢ PHẢI THU (AR AGING) & THU TIỀN
        # Quy chuẩn: Chỉ ghi nhận các chuyến xe ĐÃ HOÀN THÀNH (COMPLETED) có loading_date trong kỳ.
        # Các chuyến đang vận hành dở dang (WIP) tuyệt đối KHÔNG đưa vào công nợ AR.
        # Phân định rõ ràng: Đối soát Khách hàng (Thương mại) vs Quyết toán Tài xế (Nội bộ).
        # =========================================================================
        customer_ar_map = {}
        all_customers = Customer.objects.all()
        for cust in all_customers:
            customer_ar_map[cust.id] = {
                'customer_id': cust.id,
                'customer_code': cust.code,
                'customer_name': cust.name,
                'tax_code': cust.tax_code or '-',
                'contact_phone': cust.phone or '-',
                'trips_count': 0,
                'settled_trips_count': 0,           # Đã quyết toán với khách (Tính nợ)
                'pending_settlement_trips_count': 0,# Chờ quyết toán với khách (Chưa tính nợ)
                'reconciled_trips_count': 0,        # Đã đối soát với khách
                'pending_reconcile_trips_count': 0, # Chờ đối soát với khách
                'driver_settled_trips_count': 0,    # Đã quyết toán tài xế (Nội bộ)
                'driver_unsettled_trips_count': 0,  # Chưa quyết toán tài xế (Nội bộ)
                'subcontractor_settled_count': 0,   # Đã quyết toán thầu phụ 3PL
                'subcontractor_pending_count': 0,   # Chờ quyết toán thầu phụ 3PL
                'freight_revenue': 0,
                'reimbursable_amount': 0,
                'total_receivable': 0,              # Tổng nợ phát sinh trong kỳ
                'reconciled_amount': 0,             # Công nợ chuẩn ĐÃ ĐỐI SOÁT (Confirmed AR)
                'pending_settlement_amount': 0,     # Chờ quyết toán khách (Chưa tính nợ)
                'pending_reconcile_amount': 0,      # Công nợ CHỜ ĐỐI SOÁT (Pending AR)
                'collected_amount': 0,              # Đã thu tiền
                'remaining_balance': 0,             # Còn phải thu
                'aging_current': 0,
                'aging_31_60': 0,
                'aging_61_90': 0,
                'aging_over_90': 0,
                'trips': [],
            }

        # Lấy các phiếu thu tiền cước / thu tiền từ khách hàng trong kỳ
        cash_inflows = CashTransaction.objects.filter(
            is_deleted=False,
            transaction_type=TransactionType.INFLOW
        ).filter(
            Q(partner_type='CUSTOMER') | Q(category=CashFlowCategory.FREIGHT_REVENUE)
        )
        if start_d and end_d:
            cash_inflows = cash_inflows.filter(transaction_date__gte=start_d, transaction_date__lte=end_d)
        
        customer_collected_map = {}
        for tx in cash_inflows:
            p_name = (tx.partner_name or '').strip().lower()
            if p_name:
                customer_collected_map[p_name] = customer_collected_map.get(p_name, 0) + int(tx.amount)

        # Lấy các chuyến đã hoàn thành giao hàng (COMPLETED / DELIVERED) hoặc đã phát sinh doanh thu trong kỳ
        completed_trips_in_period = trips_qs.filter(
            status__in=[TripStatus.COMPLETED, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.DRAFT],
            loading_date__isnull=False
        ).select_related(
            'customer', 'vehicle', 'driver', 'booking_order'
        ).prefetch_related('expenses', 'documents')

        for t in completed_trips_in_period:
            cust_obj = t.customer
            cid = cust_obj.id if cust_obj else None
            
            if not cid or cid not in customer_ar_map:
                c_name = cust_obj.name if cust_obj else 'Khách Vãng Lai'
                if not cid:
                    cid = f"adhoc_{c_name}"
                if cid not in customer_ar_map:
                    customer_ar_map[cid] = {
                        'customer_id': cid,
                        'customer_code': getattr(cust_obj, 'code', '-') or '-',
                        'customer_name': c_name,
                        'tax_code': getattr(cust_obj, 'tax_code', '-') or '-',
                        'contact_phone': getattr(cust_obj, 'phone', '-') or '-',
                        'trips_count': 0,
                        'settled_trips_count': 0,           # Đã quyết toán với khách (Tính nợ)
                        'pending_settlement_trips_count': 0,# Chờ quyết toán với khách (Chưa tính nợ)
                        'reconciled_trips_count': 0,        # Alias
                        'pending_reconcile_trips_count': 0, # Alias
                        'driver_settled_trips_count': 0,    # Đã quyết toán tài xế (Nội bộ)
                        'driver_unsettled_trips_count': 0,  # Chưa quyết toán tài xế (Nội bộ)
                        'subcontractor_settled_count': 0,   # Đã quyết toán thầu phụ 3PL
                        'subcontractor_pending_count': 0,   # Chờ quyết toán thầu phụ 3PL
                        'freight_revenue': 0,
                        'reimbursable_amount': 0,
                        'total_receivable': 0,              # Công nợ chính thức ĐÃ QUYẾT TOÁN (Official AR)
                        'reconciled_amount': 0,             # Đã chốt số / Quyết toán khách
                        'pending_settlement_amount': 0,     # Chờ quyết toán khách (Chưa tính nợ)
                        'pending_reconcile_amount': 0,      # Alias
                        'collected_amount': 0,              # Đã thu tiền (Sổ quỹ)
                        'remaining_balance': 0,             # Còn phải thu
                        'aging_current': 0,
                        'aging_31_60': 0,
                        'aging_61_90': 0,
                        'aging_over_90': 0,
                        'trips': [],
                    }

            c_entry = customer_ar_map[cid]
            c_entry['trips_count'] += 1

            # Phân định rõ 4 tiến trình:
            # 1. Hoàn thành chuyến: Đã hoàn thành (do lọc status=COMPLETED)
            # 2. Quyết toán tài xế:
            is_drv_settled = bool(t.is_expenses_settled)
            if is_drv_settled:
                c_entry['driver_settled_trips_count'] += 1
            else:
                c_entry['driver_unsettled_trips_count'] += 1

            # 3. Quyết toán thầu phụ:
            is_sub = (t.vehicle and getattr(t.vehicle, 'ownership_type', 'OWNED') in ['SUBCONTRACTOR', 'PARTNER']) or (t.subcontractor_cost > 0)
            is_sub_settled = (t.subcontractor_settlement_status == 'SETTLED')
            if is_sub:
                if is_sub_settled:
                    c_entry['subcontractor_settled_count'] += 1
                else:
                    c_entry['subcontractor_pending_count'] += 1

            # 4. Quyết toán / Đối soát với khách hàng (Độc lập 100% với tài xế/thầu phụ):
            is_cust_settled = bool(
                getattr(t, 'is_customer_settled', False) or 
                getattr(t, 'customer_reconciled', False)
            )
            if is_cust_settled:
                c_entry['settled_trips_count'] += 1
                c_entry['reconciled_trips_count'] += 1
            else:
                c_entry['pending_settlement_trips_count'] += 1
                c_entry['pending_reconcile_trips_count'] += 1

            rev, exp, prof = get_trip_financials(t)
            reim = sum(e.amount for e in t.expenses.filter(is_deleted=False, is_on_behalf_of_customer=True))
            trip_total = rev + reim

            c_entry['freight_revenue'] += rev
            c_entry['reimbursable_amount'] += reim

            t_date = t.loading_date
            days_diff = (today - t_date).days if t_date else 0

            # QUY TẮC CỐT LÕI: CHỈ KHI ĐÃ QUYẾT TOÁN VỚI KHÁCH HÀNG THÌ MỚI TÍNH CÔNG NỢ (AR)
            if is_cust_settled:
                c_entry['total_receivable'] += trip_total
                c_entry['reconciled_amount'] += trip_total
                # Tuổi nợ chỉ tính trên công nợ chính thức đã quyết toán
                if days_diff <= 30:
                    c_entry['aging_current'] += trip_total
                elif days_diff <= 60:
                    c_entry['aging_31_60'] += trip_total
                elif days_diff <= 90:
                    c_entry['aging_61_90'] += trip_total
                else:
                    c_entry['aging_over_90'] += trip_total
            else:
                # Doanh thu chờ quyết toán / chưa chốt số -> Chưa tính công nợ
                c_entry['pending_settlement_amount'] += trip_total
                c_entry['pending_reconcile_amount'] += trip_total

            has_pod = t.documents.filter(document_type__in=['POD_RETURN', 'EIR_RECEIPT', 'POD', 'E_POD', 'DELIVERY_NOTE']).exists() or bool(t.actual_gate_out_time)
            plate = t.vehicle.license_plate if t.vehicle else 'Chưa gán'
            drv_name = t.driver.nickname or t.driver.full_name if t.driver else 'Chưa gán'
            ownership = getattr(t.vehicle, 'ownership_type', 'OWNED') if t.vehicle else 'OWNED'

            vat_inv = getattr(t, 'vat_invoice_number', '') or ''
            vat_date_str = t.vat_invoice_date.strftime('%d/%m/%Y') if getattr(t, 'vat_invoice_date', None) else ''

            c_entry['trips'].append({
                'trip_id': t.id,
                'trip_code': t.trip_code,
                'loading_date': t_date.strftime('%d/%m/%Y') if t_date else '-',
                'loading_date_iso': t_date.isoformat() if t_date else '',
                'vehicle_plate': plate,
                'vehicle_ownership': ownership,
                'container_number': t.container_number or '-',
                'seal_number': t.seal_number or '-',
                'route': f"{t.pickup_location or 'Cảng/Bãi'} ➔ {t.warehouse_location or 'Kho KH'}",
                'driver_name': drv_name,
                'revenue': rev,
                'reimbursable': reim,
                'total_receivable': trip_total,
                # 4 Trạng thái chuẩn xác:
                'is_trip_completed': True,                     # 1. Đã hoàn thành chuyến
                'is_driver_settled': is_drv_settled,           # 2. Đã quyết toán với tài xế (xe nhà)
                'is_subcontractor': is_sub,                    # Xe thầu phụ?
                'is_subcontractor_settled': is_sub_settled,    # 3. Đã quyết toán với thầu phụ
                'is_customer_settled': is_cust_settled,        # 4. Đã quyết toán với khách hàng
                'customer_reconciled': is_cust_settled,        # Alias tương thích
                'customer_settlement_status': getattr(t, 'customer_settlement_status', 'PENDING'),
                'customer_soa_code': getattr(t, 'customer_soa_code', '') or '-',
                'vat_invoice_number': vat_inv,
                'vat_invoice_date': vat_date_str,
                'has_pod': has_pod,
                'days_diff': days_diff,
                'status': t.status
            })

        ar_summary_list = []
        total_ar_receivable = 0
        total_ar_reconciled = 0
        total_ar_pending = 0
        total_ar_freight = 0
        total_ar_reimbursable = 0
        total_ar_collected = 0
        total_ar_balance = 0
        total_ar_overdue = 0

        for cid, entry in customer_ar_map.items():
            if entry['trips_count'] == 0:
                continue
            
            c_name_lower = entry['customer_name'].strip().lower()
            collected = customer_collected_map.get(c_name_lower, 0)
            
            # Số tiền đã thu hồi thực tế cho các đơn nợ trong kỳ (không vượt quá tổng nợ phát sinh)
            allocated_collected = min(entry['total_receivable'], collected)
            remaining = max(0, entry['total_receivable'] - collected)

            entry['collected_amount'] = allocated_collected
            entry['remaining_balance'] = remaining

            total_ar_receivable += entry['total_receivable']
            total_ar_reconciled += entry['reconciled_amount']
            total_ar_pending += entry['pending_reconcile_amount']
            total_ar_freight += entry['freight_revenue']
            total_ar_reimbursable += entry['reimbursable_amount']
            total_ar_collected += allocated_collected
            total_ar_balance += remaining
            total_ar_overdue += (entry['aging_31_60'] + entry['aging_61_90'] + entry['aging_over_90'])

            ar_summary_list.append(entry)

        ar_summary_list.sort(key=lambda x: x['total_receivable'], reverse=True)


        # =========================================================================
        # BÁO CÁO 14: BÁO CÁO TUỔI ĐƠN TỒN ĐỌNG CHƯA QUYẾT TOÁN (UNSETTLED AGING)
        # =========================================================================
        all_unsettled_trips = DispatchTrip.objects.filter(
            is_deleted=False,
            is_expenses_settled=False
        ).select_related(
            'customer', 'vehicle', 'driver', 'trailer', 'dropoff_vehicle', 'dropoff_driver', 'booking_order'
        ).prefetch_related('expenses', 'documents').order_by('loading_date', 'created_at')

        unsettled_aging_records = []
        unsettled_over_30_count = 0
        unsettled_missing_pod_count = 0
        unsettled_total_rev_stuck = 0
        unsettled_total_exp_stuck = 0

        for t in all_unsettled_trips:
            rev, exp, prof = get_trip_financials(t)
            margin = round((prof / rev * 100), 1) if rev > 0 else 0.0
            t_date = t.loading_date or t.created_at.date()
            days_unsettled = (today - t_date).days if t_date else 0
            
            has_pod = t.documents.filter(document_type__in=['POD_RETURN', 'EIR_RECEIPT']).exists() or bool(t.actual_gate_out_time)
            has_pending_expenses = t.expenses.filter(is_deleted=False, status=ApprovalStatus.PENDING).exists()

            reasons = []
            if not has_pod:
                reasons.append("Thiếu POD gốc / Ảnh mờ")
                unsettled_missing_pod_count += 1
            if has_pending_expenses:
                reasons.append("Chi phí hiện trường chờ duyệt")
            if days_unsettled > 30:
                reasons.append("Chuyến tháng trước (Nợ kỳ đối soát 25-24)")
            if not reasons:
                reasons.append("Đang chờ gom bảng kê quyết toán")

            if days_unsettled > 30:
                aging_level = 'CRITICAL'
                aging_badge = '> 30 Ngày (Cảnh Báo Đỏ)'
                unsettled_over_30_count += 1
            elif days_unsettled >= 16:
                aging_level = 'WARNING'
                aging_badge = '16 - 30 Ngày (Cảnh Báo Vàng)'
            elif days_unsettled >= 8:
                aging_level = 'WATCH'
                aging_badge = '8 - 15 Ngày (Cần Thu Hồi POD)'
            else:
                aging_level = 'NORMAL'
                aging_badge = '0 - 7 Ngày (Bình Thường)'

            unsettled_total_rev_stuck += rev
            unsettled_total_exp_stuck += exp

            plate = t.vehicle.license_plate if t.vehicle else 'Chưa gán xe'
            driver_name = t.driver.nickname or t.driver.full_name if t.driver else 'Chưa gán tài'

            ownership_label = 'Xe Nhà'
            if t.vehicle and getattr(t.vehicle, 'ownership_type', 'OWNED') == 'PARTNER':
                ownership_label = 'Xe Bạn / 3PL'

            unsettled_aging_records.append({
                'trip_id': t.id,
                'trip_code': t.trip_code,
                'loading_date': t_date.strftime('%d/%m/%Y') if t_date else '-',
                'days_unsettled': days_unsettled,
                'aging_level': aging_level,
                'aging_badge': aging_badge,
                'customer_name': t.customer.name if t.customer else 'Khách lẻ',
                'customer_code': t.customer.code if t.customer else '-',
                'route': f"{t.pickup_location or 'Cảng'} ➔ {t.warehouse_location or 'Kho'}",
                'container_number': t.container_number or '-',
                'vehicle_plate': plate,
                'ownership_label': ownership_label,
                'driver_name': driver_name,
                'revenue': rev,
                'expense': exp,
                'pending_reason': '; '.join(reasons),
                'has_pod': has_pod,
                'has_pending_expenses': has_pending_expenses,
                'status': t.status,
                'status_label': t.get_status_display()
            })

        # -------------------------------------------------------------
        # KIỂM TRA QUYỀN TRUY CẬP TỪNG BÁO CÁO (DJANGO PERMISSIONS CHUẨN)
        # -------------------------------------------------------------
        u = request.user
        is_sup = bool(u.is_superuser)
        emp = getattr(u, 'employee', None)
        role = emp.role if emp else None

        # Helper kiểm tra quyền có bị loại trừ tường minh không
        excluded_perms = set()
        if emp and emp.pk:
            excluded_perms = {
                f"{p.content_type.app_label}.{p.codename}"
                for p in emp.excluded_permissions.select_related('content_type').all()
            }

        def check_report_perm(perm_codename, allowed_roles=None):
            if is_sup:
                return True
            full_code = f"reports.{perm_codename}"
            # 1. Nếu bị loại trừ tường minh -> Chặn ngay lập tức
            if full_code in excluded_perms:
                return False
            # 2. Nếu có Django permission (từ Group hoặc user_permissions) -> Cho phép
            if u.has_perm(full_code):
                return True
            # 3. Fallback theo vai trò Employee / Group nếu user chưa được gán permission object cụ thể
            if allowed_roles and role in allowed_roles:
                return True
            return False

        # Định nghĩa các nhóm vai trò mặc định cho từng báo cáo theo ma trận phân quyền chuẩn:
        finance_roles = [EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT, EmployeeRole.LEAD_ADMIN_ACC]
        ops_roles = [EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT, EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH, EmployeeRole.DISPATCH_ASST]

        can_pnl = check_report_perm('view_report_pnl', finance_roles)
        can_dem_det = check_report_perm('view_report_dem_det', ops_roles)
        can_otp = check_report_perm('view_report_otp', ops_roles)
        can_route = check_report_perm('view_report_route_cost', ops_roles)
        can_layover = check_report_perm('view_report_layover', ops_roles)
        can_incidents = check_report_perm('view_report_incidents', ops_roles)
        can_cust_rev = check_report_perm('view_report_customer_rev', finance_roles)
        can_sub = check_report_perm('view_report_subcontractor', finance_roles)
        can_drv_sal = check_report_perm('view_report_driver_salary', finance_roles)
        can_funds = check_report_perm('view_report_dispatcher_funds', finance_roles)
        can_advances = check_report_perm('view_report_driver_advances', finance_roles + [EmployeeRole.DISPATCHER])
        can_settle = check_report_perm('view_report_settlement_backlog', finance_roles)
        can_ar = check_report_perm('view_report_ar_aging', finance_roles)
        can_unsettled = check_report_perm('view_report_unsettled_aging', finance_roles)

        can_view_finance = can_pnl

        # Phản hồi JSON hoàn chỉnh cho 14 Báo Cáo Chuẩn Kế Hoạch & Quyết Toán
        data = {
            'period': period,
            'can_view_finance': can_view_finance,
            'summary': {
                'total_trips': total_trips,
                'total_revenue': total_revenue if can_pnl else 0,
                'total_expense': total_expense if can_pnl else 0,
                'total_profit': total_profit if can_pnl else 0,
                'margin_avg': margin_avg if can_pnl else 0.0,
                'owned_ratio': owned_ratio,
                'partner_trips': partner_trips,
                'split_trips_count': split_trips_count,
                'twin_trips_count': twin_trips_count,
                'otp_rate': otp_rate,
                'overnight_trips_count': overnight_trips_count,
                'total_reimbursable': total_reimbursable,
                'estimated_fines_total': estimated_fines_total,
                'total_system_teu': round(total_system_teu, 2),
                'total_subcontractor_trips': total_subcontractor_trips,
                'total_payroll_fund': total_payroll_fund,
                'total_dispatcher_funds': total_funds_granted,
                'total_dispatcher_balance': total_remaining_funds,
                'total_driver_advances': total_driver_advances,
                'total_driver_actual_expenses': total_driver_actual_expenses,
                'pending_driver_settlement_count': pending_driver_settlement_count,
                'settlement_settled_count': settlement_settled_count,
                'settlement_unsettled_count': settlement_unsettled_count,
                'settlement_carryover_count': settlement_carryover_count,
                'total_ar_receivable': total_ar_receivable,
                'total_ar_reconciled': total_ar_reconciled,
                'total_ar_pending': total_ar_pending,
                'total_ar_balance': total_ar_balance,
                'unsettled_over_30_count': unsettled_over_30_count,
                'unsettled_missing_pod_count': unsettled_missing_pod_count
            },
            'report1_fleet_utilization': {
                'total_tractors': Vehicle.objects.filter(is_deleted=False).count(),
                'total_trips': total_trips,
                'total_containers': total_fleet_containers,
                'total_revenue': total_revenue,
                'total_expense': total_expense,
                'avg_revenue_per_trip': round(total_revenue / total_trips) if total_trips > 0 else 0,
                'avg_revenue_per_container': round(total_revenue / total_fleet_containers) if total_fleet_containers > 0 else 0,
                'owned_ratio': owned_ratio,
                'owned_trips': owned_trips,
                'partner_trips': partner_trips,
                'fleet_pnl': fleet_pnl,
                'driver_scorecards': driver_scorecards
            } if can_pnl else None,
            'report2_container_dem_det': {
                'safe_count': det_safe_count,
                'warning_count': det_warning_count,
                'overdue_count': det_overdue_count,
                'estimated_fines': estimated_fines_total,
                'containers': dem_det_list,
                'shipping_lines_summary': shipping_lines_summary
            } if can_dem_det else None,
            'report3_on_time_performance': {
                'otp_rate': otp_rate,
                'pickup_on_time': otp_pickup_on_time,
                'arrival_on_time': otp_arrival_on_time,
                'closing_on_time': otp_closing_on_time,
                'delay_reasons': delay_reasons,
                'trips': otp_trips_data
            } if can_otp else None,
            'report4_expenses_reimbursement': {
                'total_cost': total_route_cost,
                'total_bot': total_bot,
                'total_fuel': total_fuel,
                'total_port_lift': total_port_lift,
                'total_reimbursable': total_reimbursable,
                'total_reimbursable_collected': total_reimbursable_collected,
                'pending_reimbursement': total_reimbursable - total_reimbursable_collected,
                'routes': routes_cost_list,
                'vehicles': vehicles_cost_list,
                'drivers': drivers_cost_list,
                'customers': customers_cost_list,
                'items': reimbursable_expenses
            } if can_route else None,
            'report5_drop_hook_and_layover': {
                'overnight_trips_count': overnight_trips_count,
                'total_detention_fees': total_detention_fees,
                'total_overnight_allowances': total_overnight_allowances,
                'records': drop_hook_and_layover_list
            } if can_layover else None,
            'report6_osd_exceptions': {
                'damaged_cont_count': damaged_cont_count,
                'broken_seal_count': broken_seal_count,
                'incidents': osd_list
            } if can_incidents else None,
            'report7_customer_analytics': {
                'total_system_teu': round(total_system_teu, 2),
                'total_customer_revenue': total_revenue,
                'top_key_account': top_key_account,
                'top_key_account_share': top_key_account_share,
                'avg_teu_per_trip': avg_teu_per_trip,
                'customers': customer_analytics_list
            } if can_cust_rev else None,
            'report8_subcontractor_settlements': {
                'total_subcontractor_trips': total_subcontractor_trips,
                'total_gross_payable': total_gross_payable,
                'total_subcontractor_advance': total_subcontractor_advance,
                'total_subcontractor_settled': total_subcontractor_settled,
                'total_balance_due': total_balance_due,
                'subcontractors': subcontractors_summary,
                'trips': subcontractor_trips_data
            } if can_sub else None,
            'report9_driver_payroll_performance': {
                'total_payroll_fund': total_payroll_fund,
                'active_drivers_count': active_drivers_count,
                'avg_salary_per_driver': avg_salary_per_driver,
                'top_driver_name': top_driver_name,
                'drivers': driver_payroll_list
            } if can_drv_sal else None,
            'report10_dispatcher_funds': {
                'total_funds_granted': total_funds_granted,
                'total_disbursed': total_disbursed_funds,
                'total_settled_spent': total_settled_funds,
                'total_refunds_returned': total_refunds_funds,
                'remaining_balance_total': total_remaining_funds,
                'active_funds_count': active_funds_count,
                'settled_funds_count': settled_funds_count,
                'funds': funds_list
            } if can_funds else None,
            'report11_driver_advances_expenses': {
                'total_driver_advances': total_driver_advances,
                'total_actual_expenses': total_driver_actual_expenses,
                'total_refund_due': total_driver_refund_due,
                'total_reimburse_due': total_driver_reimburse_due,
                'pending_settlement_count': pending_driver_settlement_count,
                'settled_count': settled_driver_advances_count,
                'trips': driver_advances_trips_data
            } if can_advances else None,
            'report12_settlement_backlog': {
                'total_trips_count': settlement_total_count,
                'settled_trips_count': settlement_settled_count,
                'unsettled_trips_count': settlement_unsettled_count,
                'carryover_trips_count': settlement_carryover_count,
                'settled_revenue': settlement_settled_rev,
                'settled_profit': settlement_settled_prof,
                'unsettled_revenue': settlement_unsettled_rev,
                'trips': settlement_trips_data
            } if can_settle else None,
            'report13_ar_aging': {
                'total_receivable': total_ar_receivable,
                'total_reconciled': total_ar_reconciled,
                'total_pending_reconcile': total_ar_pending,
                'total_freight_revenue': total_ar_freight,
                'total_reimbursable': total_ar_reimbursable,
                'total_collected': total_ar_collected,
                'total_remaining_balance': total_ar_balance,
                'total_overdue': total_ar_overdue,
                'customers': ar_summary_list
            } if can_ar else None,
            'report14_unsettled_aging': {
                'total_unsettled_count': len(unsettled_aging_records),
                'total_unsettled_revenue': unsettled_total_rev_stuck,
                'total_unsettled_expense': unsettled_total_exp_stuck,
                'over_30_days_count': unsettled_over_30_count,
                'missing_pod_count': unsettled_missing_pod_count,
                'records': unsettled_aging_records
            } if can_unsettled else None
        }

        return Response(data)

