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
from apps.billing.models import TripExpense, ExpenseCategory, ApprovalStatus
from apps.fleet.models import Vehicle, Trailer
from apps.customers.models import Customer
from apps.personnel.models import Employee, EmployeeRole


class ReportsAPIView(APIView):
    """
    API Báo Cáo Quản Trị & Thống Kê TMS Đa Chiều (6 Báo Cáo Chuẩn Kế Hoạch).
    Hỗ trợ lọc theo Kỳ (Hôm nay, Tuần này, Tháng này, Quý này, Tất cả), Khách hàng, Xe.
    Phân quyền:
    - Ban Giám Đốc (DIRECTOR) & Kế Toán (ACCOUNTANT): Toàn quyền xem P&L, doanh thu, lợi nhuận, chi phí.
    - Điều Phối (DISPATCHER): Xem toàn bộ chỉ số vận hành nhưng BẢO MẬT (MASK) doanh thu, lợi nhuận và P&L.
    - Tài Xế (DRIVER) & Thợ Máy (MECHANIC): Bị từ chối (403 Forbidden).
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [CanViewOperationalReports]

    def get(self, request):
        period = request.GET.get('period', 'month') # today, week, month, quarter, all
        customer_id = request.GET.get('customer_id', '')
        vehicle_id = request.GET.get('vehicle_id', '')

        # 1. Xác định khung thời gian lọc (Ưu tiên loading_date, fallback created_at__date)
        now = timezone.now()
        today = now.date()

        date_filter = Q(is_deleted=False)

        def make_date_range_q(start_d, end_d=None):
            if end_d:
                return (
                    Q(loading_date__gte=start_d, loading_date__lte=end_d) |
                    Q(loading_date__isnull=True, created_at__date__gte=start_d, created_at__date__lte=end_d)
                )
            else:
                return (
                    Q(loading_date=start_d) |
                    Q(loading_date__isnull=True, created_at__date=start_d)
                )

        if period == 'today':
            date_filter &= make_date_range_q(today)
        elif period == 'week':
            start_week = today - datetime.timedelta(days=today.weekday())
            date_filter &= make_date_range_q(start_week, today)
        elif period == 'month':
            start_month = today.replace(day=1)
            date_filter &= make_date_range_q(start_month, today)
        elif period == 'quarter':
            quarter_start_month = ((today.month - 1) // 3) * 3 + 1
            start_quarter = today.replace(month=quarter_start_month, day=1)
            date_filter &= make_date_range_q(start_quarter, today)

        if customer_id:
            date_filter &= Q(customer_id=customer_id)
        if vehicle_id:
            date_filter &= Q(vehicle_id=vehicle_id)

        trips_qs = DispatchTrip.objects.filter(date_filter).select_related(
            'customer', 'vehicle', 'driver', 'trailer', 'dropoff_driver', 'dropoff_vehicle', 'booking_order'
        ).prefetch_related('expenses', 'event_logs', 'timeline_items', 'documents')

        # Helper tính doanh thu / chi phí thực tế cho từng chuyến nếu cache chưa cập nhật
        def get_trip_financials(t):
            rev = int(t.cached_revenue or 0)
            if rev <= 0:
                if t.booking_order and t.booking_order.selling_freight_price > 0:
                    rev = int(t.booking_order.selling_freight_price)
                elif t.customer:
                    tariff = t.customer.tariffs.filter(
                        pickup_loc=t.pickup_loc, delivery_loc=t.warehouse_loc
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
                    'revenue': 0,
                    'expense': 0,
                    'profit': 0,
                    'margin_percent': 0.0
                }
            vehicles_dict[plate]['trips_count'] += 1
            vehicles_dict[plate]['revenue'] += rev
            vehicles_dict[plate]['expense'] += exp
            vehicles_dict[plate]['profit'] += prof

        margin_avg = round(float(total_profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0

        fleet_pnl = list(vehicles_dict.values())
        for f in fleet_pnl:
            if f['revenue'] > 0:
                f['margin_percent'] = round(f['profit'] / f['revenue'] * 100, 1)
        fleet_pnl.sort(key=lambda x: x['revenue'], reverse=True)

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
        # Dữ liệu phục vụ Báo cáo 4: Đối Soát Chi Phí & Hoàn Ứng Chi Hộ
        # -------------------------------------------------------------
        all_expenses = TripExpense.objects.filter(trip__in=trips_qs, is_deleted=False).select_related('trip', 'trip__customer')
        reimbursable_expenses = []
        total_reimbursable = 0
        total_reimbursable_collected = 0

        for exp in all_expenses:
            if exp.is_on_behalf_of_customer:
                total_reimbursable += int(exp.amount)
                is_settled = (exp.status == ApprovalStatus.SETTLED or getattr(exp, 'reimbursement_status', '') == 'COLLECTED')
                if is_settled:
                    total_reimbursable_collected += int(exp.amount)
                reimbursable_expenses.append({
                    'id': exp.id,
                    'trip_code': exp.trip.trip_code,
                    'customer_name': exp.trip.customer.name if exp.trip.customer else 'Khách lẻ',
                    'expense_name': exp.notes or exp.get_category_display(),
                    'expense_type': exp.get_category_display(),
                    'amount': int(exp.amount),
                    'invoice_number': exp.invoice_number or 'Chưa có',
                    'date': exp.created_at.strftime('%d/%m/%Y'),
                    'is_settled': is_settled,
                    'settled_status': 'Đã thu hồi' if is_settled else 'Chờ khách trả'
                })

        # Đối soát BOT và Cẩu nâng/hạ
        total_bot = sum(exp.amount for exp in all_expenses if exp.category in [ExpenseCategory.TOLL_FEE, ExpenseCategory.BOT_TOLL])
        total_fuel = 0
        total_port_lift = sum(exp.amount for exp in all_expenses if exp.category in [ExpenseCategory.LIFT_ON, ExpenseCategory.LIFT_OFF, ExpenseCategory.LIFT_ON_OFF])

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
                    'total_teu': 0.0,
                    'teu_20_count': 0,
                    'teu_40_count': 0,
                    'teu_45_count': 0,
                    'revenue': 0,
                    'expense': 0,
                    'profit': 0,
                    'margin_percent': 0.0,
                    'revenue_share': 0.0,
                    'routes_dict': {},
                    'top_route': '-'
                }

            row = customer_analytics_dict[c_name]
            row['trips_count'] += 1
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

            # Thống kê tuyến đường phổ biến nhất của khách
            route_name = f"{t.pickup_location} ➔ {t.delivery_warehouse or t.dropoff_location or 'Kho KH'}"
            row['routes_dict'][route_name] = row['routes_dict'].get(route_name, 0) + 1

        customer_analytics_list = list(customer_analytics_dict.values())
        for c in customer_analytics_list:
            c['total_teu'] = round(c['total_teu'], 2)
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
            is_sub = (t.vehicle and t.vehicle.ownership_type == 'SUBCONTRACTOR') or (t.subcontractor_cost > 0)
            if not is_sub:
                continue

            total_subcontractor_trips += 1
            cost = int(t.subcontractor_cost or t.cached_expense or 0)
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
                dp['net_salary'] = 0

        # Phản hồi JSON hoàn chỉnh cho 9 Báo Cáo Chuẩn Kế Hoạch
        data = {
            'period': period,
            'can_view_finance': can_view_finance,
            'summary': {
                'total_trips': total_trips,
                'total_revenue': total_revenue,
                'total_expense': total_expense,
                'total_profit': total_profit,
                'margin_avg': margin_avg,
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
                'total_payroll_fund': total_payroll_fund
            },
            'report1_fleet_utilization': {
                'total_tractors': Vehicle.objects.filter(is_deleted=False).count(),
                'owned_ratio': owned_ratio,
                'owned_trips': owned_trips,
                'partner_trips': partner_trips,
                'fleet_pnl': fleet_pnl,
                'driver_scorecards': driver_scorecards
            },
            'report2_container_dem_det': {
                'safe_count': det_safe_count,
                'warning_count': det_warning_count,
                'overdue_count': det_overdue_count,
                'estimated_fines': estimated_fines_total,
                'containers': dem_det_list,
                'shipping_lines_summary': shipping_lines_summary
            },
            'report3_on_time_performance': {
                'otp_rate': otp_rate,
                'pickup_on_time': otp_pickup_on_time,
                'arrival_on_time': otp_arrival_on_time,
                'closing_on_time': otp_closing_on_time,
                'delay_reasons': delay_reasons,
                'trips': otp_trips_data
            },
            'report4_expenses_reimbursement': {
                'total_bot': total_bot,
                'total_fuel': total_fuel,
                'total_port_lift': total_port_lift,
                'total_reimbursable': total_reimbursable,
                'total_reimbursable_collected': total_reimbursable_collected,
                'pending_reimbursement': total_reimbursable - total_reimbursable_collected,
                'items': reimbursable_expenses
            },
            'report5_drop_hook_and_layover': {
                'overnight_trips_count': overnight_trips_count,
                'total_detention_fees': total_detention_fees,
                'total_overnight_allowances': total_overnight_allowances,
                'records': drop_hook_and_layover_list
            },
            'report6_osd_exceptions': {
                'damaged_cont_count': damaged_cont_count,
                'broken_seal_count': broken_seal_count,
                'incidents': osd_list
            },
            'report7_customer_analytics': {
                'total_system_teu': round(total_system_teu, 2),
                'total_customer_revenue': total_revenue,
                'top_key_account': top_key_account,
                'top_key_account_share': top_key_account_share,
                'avg_teu_per_trip': avg_teu_per_trip,
                'customers': customer_analytics_list
            },
            'report8_subcontractor_settlements': {
                'total_subcontractor_trips': total_subcontractor_trips,
                'total_gross_payable': total_gross_payable,
                'total_subcontractor_advance': total_subcontractor_advance,
                'total_subcontractor_settled': total_subcontractor_settled,
                'total_balance_due': total_balance_due,
                'subcontractors': subcontractors_summary,
                'trips': subcontractor_trips_data
            },
            'report9_driver_payroll_performance': {
                'total_payroll_fund': total_payroll_fund,
                'active_drivers_count': active_drivers_count,
                'avg_salary_per_driver': avg_salary_per_driver,
                'top_driver_name': top_driver_name,
                'drivers': driver_payroll_list
            }
        }

        return Response(data)

