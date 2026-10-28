"""Danh sách, tạo mới và chi tiết chuyến xe."""
from ._common import *  # noqa: F401,F403

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
            # dùng dữ liệu đã prefetch (tránh 1 truy vấn/chuyến); manager mặc định đã bỏ bản ghi đã xoá
            customs_decl = min((d for d in t.customs_declarations.all() if not d.is_deleted), key=lambda d: d.pk, default=None)
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

            disp_type, raw_type = normalize_shipment_type(t.shipment_type)
            trips_list.append({
                'id': t.trip_code,
                'hashid': t.hashid,
                'driver_hashid': t.driver_hashid,
                'tracking_hashid': t.tracking_hashid,
                'customer': t.customer.name if t.customer else 'Khách Hàng',
                'type': disp_type,
                'type_raw': raw_type,
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

        # =========================================================================
        # TÍNH TOÁN BỘ 5 THẺ VẬN HÀNH CHIẾN LƯỢC TRANG ĐIỀU VẬN (DISPATCH PIPELINE)
        # =========================================================================
        # 1. Tập hợp các chuyến xe theo Kỳ đang chọn (không bị bộ lọc cột làm sai lệch tổng thể)
        period_trips_qs = DispatchTrip.objects.filter(is_deleted=False)
        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                period_trips_qs = period_trips_qs.filter(Q(loading_date__gte=fd) | Q(loading_date__isnull=True, created_at__date__gte=fd))
            except Exception:
                pass
        if to_date:
            try:
                td = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                period_trips_qs = period_trips_qs.filter(Q(loading_date__lte=td) | Q(loading_date__isnull=True, created_at__date__lte=td))
            except Exception:
                pass

        # THẺ 1: TỔNG KẾ HOẠCH ĐIỀU ĐỘ
        total_plan_trips = period_trips_qs.count()
        total_plan_containers = sum(2 if t.is_twin_container else 1 for t in period_trips_qs)
        owned_vehicles_count = period_trips_qs.filter(vehicle__ownership_type='OWNED').count()
        subcontractor_count = period_trips_qs.filter(Q(vehicle__ownership_type='SUBCONTRACTOR') | Q(subcontractor__isnull=False)).count()

        # THẺ 2: CHỜ TÀI XẾ NHẬN LỆNH & XUẤT BÃI
        pending_acceptance_qs = period_trips_qs.filter(status__in=[TripStatus.DRAFT, TripStatus.DISPATCHED])
        pending_acceptance_count = pending_acceptance_qs.count()
        sla_warning_count = 0
        for pt in pending_acceptance_qs:
            if pt.declined_at:
                sla_warning_count += 1
            elif pt.status == TripStatus.DISPATCHED:
                pt_time = pt.dispatched_at or pt.created_at
                diff_m = int((now_dt - pt_time).total_seconds() // 60)
                if diff_m >= 30:
                    sla_warning_count += 1

        # THẺ 3: ĐANG LĂN BÁNH TRÊN ĐƯỜNG
        transit_qs = period_trips_qs.filter(status__in=[
            TripStatus.ACCEPTED, TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT,
            TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.RETURNING_EMPTY
        ])
        transit_total_count = transit_qs.count()
        carrying_cargo_count = transit_qs.filter(status__in=[
            TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT,
            TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING
        ]).count()
        returning_or_split_count = transit_qs.filter(
            Q(status=TripStatus.RETURNING_EMPTY) | Q(is_split_trip=True)
        ).distinct().count()

        # THẺ 4: CẢNH BÁO RỦI RO (CẮT MÁNG & LƯU CA)
        cutoff_risk_count = 0
        detention_risk_count = 0
        risk_trip_ids = set()
        for rt in period_trips_qs.exclude(status__in=[TripStatus.COMPLETED, TripStatus.CANCELLED]):
            # Rủi ro Cắt Máng: Hàng xuất có giờ closing time
            if rt.shipment_type in ['EXPORT', 'EXP'] and rt.cutoff_time:
                cutoff_risk_count += 1
                risk_trip_ids.add(rt.id)
            # Rủi ro Hạn DEM/DET hoặc Lưu ca kho
            det_info = calculate_dem_det_status(rt)
            if det_info.get('is_overdue') or det_info.get('status') in ['OVERDUE', 'TODAY', 'WARNING'] or rt.is_overnight_detention or rt.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING]:
                detention_risk_count += 1
                risk_trip_ids.add(rt.id)

        risk_total_count = len(risk_trip_ids)

        # THẺ 5: ĐÃ GIAO HÀNG & THU HỒI POD
        delivered_qs = period_trips_qs.filter(status__in=[TripStatus.DELIVERED, TripStatus.COMPLETED])
        delivered_total_count = delivered_qs.count()
        pod_completed_count = 0
        for dt in delivered_qs:
            has_pod = dt.documents.filter(document_type='POD', is_deleted=False).exists() or dt.status == TripStatus.COMPLETED
            if has_pod:
                pod_completed_count += 1
        pod_pending_count = max(0, delivered_total_count - pod_completed_count)

        pending_expenses_count = TripExpense.objects.filter(status='PENDING').count()

        return Response({
            'stats': {
                # Tương thích ngược hệ thống cũ
                'total_trips_monthly': total_plan_trips,
                'transit_count': transit_total_count,
                'pending_expenses_count': pending_expenses_count,
                'cutoff_warning_count': cutoff_risk_count,
                # Chuẩn 5 Thẻ Vận Hành Chiến Lược (TMS Dispatch Pipeline)
                'card_plan': {
                    'total_trips': total_plan_trips,
                    'total_containers': total_plan_containers,
                    'owned_vehicles': owned_vehicles_count,
                    'subcontractor_vehicles': subcontractor_count,
                    'line_1': f"{total_plan_trips} Chuyến ({total_plan_containers} Cont)",
                    'line_2': f"{owned_vehicles_count} Xe Nhà · {subcontractor_count} Thầu Phụ"
                },
                'card_pending': {
                    'pending_count': pending_acceptance_count,
                    'sla_warning_count': sla_warning_count,
                    'line_1': f"Đã phát lệnh: {pending_acceptance_count}",
                    'line_2': f"Cảnh báo SLA: {sla_warning_count}"
                },
                'card_transit': {
                    'transit_count': transit_total_count,
                    'carrying_cargo_count': carrying_cargo_count,
                    'returning_or_split_count': returning_or_split_count,
                    'line_1': f"Đang chở hàng: {carrying_cargo_count}",
                    'line_2': f"Cắt kéo / Rỗng: {returning_or_split_count}"
                },
                'card_risk': {
                    'risk_count': risk_total_count,
                    'cutoff_count': cutoff_risk_count,
                    'detention_count': detention_risk_count,
                    'line_1': f"Gần cắt máng: {cutoff_risk_count}",
                    'line_2': f"Hạn rỗng / kho: {detention_risk_count}"
                },
                'card_delivered': {
                    'delivered_count': delivered_total_count,
                    'pod_completed_count': pod_completed_count,
                    'pod_pending_count': pod_pending_count,
                    'line_1': f"Đã có POD: {pod_completed_count}",
                    'line_2': f"Chờ thu hồi: {pod_pending_count}"
                }
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
        raw_rev = data.get('selling_freight_price') if data.get('selling_freight_price') is not None else data.get('revenue')
        try:
            revenue = float(str(raw_rev).replace('.', '').replace(',', '')) if raw_rev is not None and str(raw_rev).strip() else 0.0
        except (ValueError, TypeError):
            revenue = 0.0

        if booking_order_id and str(booking_order_id).strip() and str(booking_order_id).strip().isdigit():
            booking_order = BookingOrder.objects.filter(id=int(booking_order_id)).first()
            if booking_order:
                customer = booking_order.customer
                if revenue <= 0 and booking_order.selling_freight_price:
                    revenue = float(booking_order.selling_freight_price)
            else:
                customer_name = data.get('customer', '').strip()
                customer = resolve_customer(customer_name)
        else:
            bk_val = data.get('booking') or data.get('booking_number') or data.get('booking_code')
            if bk_val and str(bk_val).strip():
                booking_order = (
                    BookingOrder.objects.filter(booking_number__iexact=str(bk_val).strip(), is_deleted=False).first() or
                    BookingOrder.objects.filter(booking_code__iexact=str(bk_val).strip(), is_deleted=False).first()
                )
                if booking_order:
                    customer = booking_order.customer
                    if revenue <= 0 and booking_order.selling_freight_price:
                        revenue = float(booking_order.selling_freight_price)
            customer_id = data.get('customer_id')
            customer_name = data.get('customer', '').strip()
            if customer_id:
                customer = resolve_customer(customer_id)
            if not customer and customer_name:
                customer = resolve_customer(customer_name)

        if not customer and customer_name:
            import secrets
            rand_suffix = ''.join(secrets.choice('0123456789') for _ in range(4))
            code_cand = f"KH_{timezone.now().strftime('%m%d')}_{rand_suffix}"
            customer = Customer.objects.create(name=customer_name, code=code_cand)

        if not customer:
            return Response({'error': 'Vui lòng chọn hoặc nhập tên khách hàng hợp lệ!'}, status=status.HTTP_400_BAD_REQUEST)

        parse_bool = lambda v: v is True or str(v).strip().lower() in ('true', '1', 'yes')

        # Xử lý thông tin Thầu phụ / Xe bạn 3PL (Phương án 3: Quản lý theo Đối tác)
        subcontractor = None
        subcontractor_id = data.get('subcontractor_id') or data.get('subcontractor')
        if subcontractor_id and str(subcontractor_id).isdigit():
            from apps.master_data.models import Subcontractor
            subcontractor = Subcontractor.objects.filter(id=int(subcontractor_id), is_deleted=False).first()

        vehicle_plate = (data.get('vehicle') or '').strip()
        vehicle = None
        if vehicle_plate:
            vehicle = Vehicle.objects.filter(license_plate__iexact=vehicle_plate).first() or \
                      Vehicle.objects.filter(license_plate__icontains=vehicle_plate).first()
            if not vehicle and subcontractor:
                # Tự động tạo bản ghi xe ngoài nếu đối tác 3PL điều xe mới
                vehicle = Vehicle.objects.create(
                    license_plate=vehicle_plate.upper(),
                    ownership_type=VehicleOwnership.SUBCONTRACTOR,
                    subcontractor=subcontractor
                )
            elif vehicle and subcontractor and not vehicle.subcontractor:
                vehicle.subcontractor = subcontractor
                vehicle.save(update_fields=['subcontractor'])

        if vehicle and getattr(vehicle, 'subcontractor', None) and not subcontractor:
            subcontractor = vehicle.subcontractor

        is_subcontractor_trip = bool(subcontractor or (vehicle and vehicle.ownership_type == VehicleOwnership.SUBCONTRACTOR))

        subcontractor_driver = None
        subcontractor_driver_name = str(data.get('subcontractor_driver_name') or '').strip()
        subcontractor_driver_phone = str(data.get('subcontractor_driver_phone') or '').strip()
        subcontractor_driver_id = data.get('subcontractor_driver_id')

        if subcontractor_driver_id and str(subcontractor_driver_id).isdigit():
            from apps.master_data.models import SubcontractorDriver
            subcontractor_driver = SubcontractorDriver.objects.filter(id=int(subcontractor_driver_id), is_deleted=False).first()
            if subcontractor_driver:
                if not subcontractor:
                    subcontractor = subcontractor_driver.subcontractor
                subcontractor_driver_name = subcontractor_driver.full_name
                subcontractor_driver_phone = subcontractor_driver.phone

        driver_input = data.get('driver', '').strip()
        if is_subcontractor_trip:
            driver = None
            if not subcontractor_driver_name and driver_input:
                subcontractor_driver_name = driver_input
            if not subcontractor_driver_phone and data.get('driver_phone'):
                subcontractor_driver_phone = str(data.get('driver_phone')).strip()

            if subcontractor and not subcontractor_driver and subcontractor_driver_name:
                from apps.master_data.models import SubcontractorDriver
                subcontractor_driver = SubcontractorDriver.objects.filter(
                    subcontractor=subcontractor,
                    full_name__iexact=subcontractor_driver_name,
                    is_deleted=False
                ).first()
                if not subcontractor_driver and parse_bool(data.get('save_subcontractor_driver', True)):
                    subcontractor_driver = SubcontractorDriver.objects.create(
                        subcontractor=subcontractor,
                        full_name=subcontractor_driver_name,
                        phone=subcontractor_driver_phone,
                        notes="Tự động lưu từ Lệnh điều xe"
                    )
        else:
            driver = Employee.objects.filter(nickname__iexact=driver_input).first() or \
                     Employee.objects.filter(full_name__icontains=driver_input).first() or \
                     Employee.objects.filter(role=EmployeeRole.DRIVER).first()

        if not vehicle:
            if driver:
                vehicle = Vehicle.objects.filter(current_driver=driver).first() or Vehicle.objects.first()
            else:
                vehicle = Vehicle.objects.first()

        curr_emp = getattr(request.user, 'employee', None)
        dispatcher = curr_emp if (curr_emp and curr_emp.role in [EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH, EmployeeRole.DIRECTOR]) else (
            Employee.objects.filter(role__in=[EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH]).first() or curr_emp
        )

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
        trip_code = next_code(DispatchTrip, 'trip_code', prefix, 3)  # mã tuần tự an toàn, không trùng

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
            subcontractor=subcontractor,
            subcontractor_driver=subcontractor_driver,
            subcontractor_driver_name=subcontractor_driver_name,
            subcontractor_driver_phone=subcontractor_driver_phone,
            subcontractor_cost=float(data.get('subcontractor_cost') or 0),
            subcontractor_advance=float(data.get('subcontractor_advance') or 0),
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
            'driver_name': trip.assigned_driver_name,
            'driver_phone': trip.assigned_driver_phone,
            'subcontractor_id': trip.subcontractor_id,
            'subcontractor_name': trip.subcontractor.name if trip.subcontractor else '',
            'subcontractor_driver_id': trip.subcontractor_driver_id,
            'carrier_name': trip.carrier_name,
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
                'expense_payer_type': getattr(exp, 'expense_payer_type', 'TVL_COST'),
                'expense_payer_label': exp.get_expense_payer_type_display() if hasattr(exp, 'get_expense_payer_type_display') else ('Chi phí TVL' if not exp.is_on_behalf_of_customer else ('3PL chi hộ' if getattr(exp, 'reimburse_to_subcontractor', False) else 'TVL chi hộ')),
                'reimburse_to_subcontractor': getattr(exp, 'reimburse_to_subcontractor', False),
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
        driver_name = trip.assigned_driver_name
        driver_phone = trip.assigned_driver_phone
        carrier_name = trip.carrier_name
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
            'type': normalize_shipment_type(trip.shipment_type)[0],
            'type_raw': normalize_shipment_type(trip.shipment_type)[1],
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
            'subcontractor_id': trip.subcontractor_id,
            'subcontractor_name': trip.subcontractor.name if trip.subcontractor else '',
            'subcontractor_driver_id': trip.subcontractor_driver_id,
            'subcontractor_driver_name': trip.subcontractor_driver.full_name if trip.subcontractor_driver else (trip.subcontractor_driver_name or ''),
            'subcontractor_driver_phone': trip.subcontractor_driver.phone if trip.subcontractor_driver else (trip.subcontractor_driver_phone or ''),
            'carrier_name': carrier_name,
            'subcontractor_cost': float(trip.subcontractor_cost),
            'subcontractor_advance': float(trip.subcontractor_advance),
            'subcontractor_settlement_status': trip.subcontractor_settlement_status,
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
            },
            'can_edit': check_can_edit_or_delete(request.user, trip, owner_field='dispatcher', action='edit')[0],
            'can_delete': (
                check_can_edit_or_delete(request.user, trip, owner_field='dispatcher', action='edit')[0]
                and not trip.is_expenses_settled
                and not getattr(trip, 'is_customer_settled', False)
                and not DriverTripAdvance.objects.filter(trip=trip, is_deleted=False).exists()
            ),
            'creator_name': (trip.dispatcher.nickname or trip.dispatcher.full_name) if trip.dispatcher else ''
        })

    def patch(self, request, trip_code):
        """API cập nhật 2 mốc thời gian (Hẹn hạ sau 0h & Hạ bãi thực tế), trạng thái lưu xe và phụ phí."""
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        # Cho phép xác thực qua Driver Capability Token trên Mobile Driver Portal
        is_driver_token = bool(trip.driver_token and (trip.driver_token == trip_code or request.headers.get('X-Trip-Hash') == trip.driver_token))
        if not is_driver_token:
            can_edit, edit_msg = check_can_edit_or_delete(request.user, trip, owner_field='dispatcher', action='edit')
            if not can_edit:
                return Response({'error': edit_msg}, status=status.HTTP_403_FORBIDDEN)

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
        if 'subcontractor_id' in data:
            sub_id = data.get('subcontractor_id')
            if sub_id:
                from apps.master_data.models import Subcontractor
                trip.subcontractor = Subcontractor.objects.filter(id=sub_id).first()
                if trip.subcontractor:
                    trip.driver = None  # Xóa driver nội bộ khi đã gán thầu phụ
            else:
                trip.subcontractor = None

        if 'subcontractor_driver_id' in data:
            drv_id = data.get('subcontractor_driver_id')
            if drv_id:
                from apps.master_data.models import SubcontractorDriver
                trip.subcontractor_driver = SubcontractorDriver.objects.filter(id=drv_id).first()
                if trip.subcontractor_driver:
                    trip.subcontractor_driver_name = trip.subcontractor_driver.full_name
                    trip.subcontractor_driver_phone = trip.subcontractor_driver.phone
            else:
                trip.subcontractor_driver = None

        if 'subcontractor_driver_name' in data:
            trip.subcontractor_driver_name = str(data['subcontractor_driver_name']).strip()
        if 'subcontractor_driver_phone' in data:
            trip.subcontractor_driver_phone = str(data['subcontractor_driver_phone']).strip()
        if 'subcontractor_cost' in data:
            try:
                trip.subcontractor_cost = float(data['subcontractor_cost'])
            except (ValueError, TypeError):
                pass
        if 'subcontractor_advance' in data:
            try:
                trip.subcontractor_advance = float(data['subcontractor_advance'])
            except (ValueError, TypeError):
                pass

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
            drop_drv_id = data.get('dropoff_driver_id')
            if drop_drv_id and str(drop_drv_id).isdigit():
                trip.dropoff_driver = Employee.objects.filter(id=int(drop_drv_id)).first()
            else:
                trip.dropoff_driver = None
        if 'dropoff_vehicle_id' in data:
            drop_veh_id = data.get('dropoff_vehicle_id')
            if drop_veh_id and str(drop_veh_id).isdigit():
                trip.dropoff_vehicle = Vehicle.objects.filter(id=int(drop_veh_id)).first()
            else:
                trip.dropoff_vehicle = None
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
        """API Hủy / Xóa mềm chuyến xe (Hỗ trợ hoàn lại hạn mức container cho Booking Order và dọn dẹp chi phí liên quan)."""
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        can_delete, del_msg = check_can_edit_or_delete(request.user, trip, owner_field='dispatcher', action='delete')
        if not can_delete:
            return Response({'error': del_msg}, status=status.HTTP_403_FORBIDDEN)

        if trip.is_expenses_settled:
            return Response({'error': 'Chuyến xe đã được Kế toán chốt sổ chi phí quyết toán, không thể xóa/hủy!'}, status=status.HTTP_403_FORBIDDEN)

        # Kiểm tra tạm ứng tài xế
        adv_active = DriverTripAdvance.objects.filter(trip=trip, is_deleted=False)
        if adv_active.exists():
            adv_count = adv_active.count()
            return Response({
                'error': f"Chuyến xe [{trip.trip_code}] đã phát sinh {adv_count} phiếu tạm ứng tài xế. Vui lòng hoàn ứng/hủy tạm ứng trước khi xóa chuyến xe!"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Kiểm tra chi phí phát sinh
        active_expenses = trip.expenses.filter(is_deleted=False)
        exp_count = active_expenses.count()
        cascade_delete = request.data.get('cascade') or request.GET.get('cascade') or request.data.get('force')
        if exp_count > 0:
            if str(cascade_delete).lower() in ['true', '1', 'yes']:
                active_expenses.update(is_deleted=True, updated_at=timezone.now())
            else:
                return Response({
                    'error': f"Chuyến xe [{trip.trip_code}] đã phát sinh {exp_count} chứng từ chi phí. Vui lòng xác nhận xóa kèm chi phí hoặc xử lý chứng từ chi phí trước khi xóa chuyến!",
                    'requires_cascade': True,
                    'expense_count': exp_count
                }, status=status.HTTP_400_BAD_REQUEST)

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

        # Đồng bộ xóa mềm chứng từ hình ảnh đính kèm (EIR, POD...)
        trip.documents.filter(is_deleted=False).update(is_deleted=True)

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
