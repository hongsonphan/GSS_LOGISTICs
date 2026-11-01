"""Kinh doanh: báo giá, tra giá booking, danh sách booking đang chạy."""
from ._common import *  # noqa: F401,F403

class BookingActiveAPIView(APIView):
    """API lấy danh sách các Booking đang hoạt động để Điều độ viên chọn kế thừa khi tạo lệnh."""
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        # Sắp xếp phiếu mới tạo nhất lên trên đầu (mới nhất theo ngày tạo và id)
        bookings = BookingOrder.objects.select_related('customer').filter(
            status__in=[BookingStatus.PENDING_DISPATCH, BookingStatus.PARTIALLY_DISPATCHED]
        ).order_by('-created_at', '-id')
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

class BookingPriceLookupAPIView(APIView):
    """
    API tự động tra cứu giá cước khi lập Booking dựa trên Khách hàng và Tuyến đường/Khu vực.
    Nguồn tra cứu ưu tiên:
    1. Báo giá ký kết (Quotation / QuotationItem) của khách hàng
    2. Biểu cước khách hàng (RouteTariff)
    3. Chuyến xe gần nhất của khách hàng trên cùng tuyến
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        customer_param = request.GET.get('customer') or request.GET.get('customer_id') or ''
        pickup = (request.GET.get('pickup') or request.GET.get('pickup_location') or '').strip()
        delivery = (request.GET.get('delivery') or request.GET.get('delivery_location') or '').strip()
        container_size = (request.GET.get('container_size') or '40HC').strip().upper()

        customer = resolve_customer(customer_param)
        if not customer:
            return Response({
                'found': False,
                'price': None,
                'message': 'Vui lòng chọn khách hàng trước khi tra cứu giá cước.'
            })

        # 1. Tra cứu trong Báo Giá (Quotation) của khách hàng
        quotes = Quotation.objects.filter(customer=customer, is_deleted=False).order_by(
            models.Case(
                models.When(status='APPROVED', then=models.Value(1)),
                models.When(status='PENDING_APPROVAL', then=models.Value(2)),
                default=models.Value(3),
                output_field=models.IntegerField()
            ),
            '-created_at'
        )

        for q in quotes:
            items = q.items.filter(is_deleted=False)
            if items.exists():
                for it in items:
                    r_desc = (it.route_description or '').upper()
                    dest_z = (it.destination_zone or '').upper()
                    orig_z = (it.origin_zone or '').upper()
                    deliv_upper = delivery.upper()

                    match_dest = deliv_upper and (deliv_upper in r_desc or deliv_upper in dest_z or dest_z in deliv_upper)
                    if match_dest:
                        price = int(it.unit_price)
                        if price > 0:
                            return Response({
                                'found': True,
                                'price': price,
                                'source': f"Báo giá #{q.quotation_code} ({q.get_status_display()})",
                                'quotation_code': q.quotation_code,
                                'route': it.route_description,
                                'message': f"Đã tự động áp dụng giá theo Báo giá #{q.quotation_code}"
                            })

            r_desc = (q.route_description or '').upper()
            dest_z = (q.destination_zone or '').upper()
            deliv_upper = delivery.upper()
            if deliv_upper and (deliv_upper in r_desc or deliv_upper in dest_z or dest_z in deliv_upper):
                price = int(q.unit_price)
                if price > 0:
                    return Response({
                        'found': True,
                        'price': price,
                        'source': f"Báo giá #{q.quotation_code} ({q.get_status_display()})",
                        'quotation_code': q.quotation_code,
                        'route': q.route_description,
                        'message': f"Đã tự động áp dụng giá theo Báo giá #{q.quotation_code}"
                    })

        # 2. Tra cứu trong Biểu Cước Khách Hàng (RouteTariff)
        tariffs = customer.tariffs.filter(is_deleted=False)
        if delivery:
            matched_tar = tariffs.filter(
                Q(delivery_location__icontains=delivery) | Q(destination_zone__icontains=delivery)
            )
            if container_size:
                size_tar = matched_tar.filter(container_size__iexact=container_size).first()
                if size_tar and size_tar.freight_price > 0:
                    return Response({
                        'found': True,
                        'price': int(size_tar.freight_price),
                        'source': f"Biểu cước khách hàng [{size_tar.pickup_location} ➔ {size_tar.delivery_location}]",
                        'route': f"{size_tar.pickup_location} ➔ {size_tar.delivery_location}",
                        'message': "Đã tự động áp dụng giá theo Biểu cước hợp đồng"
                    })
            first_tar = matched_tar.first()
            if first_tar and first_tar.freight_price > 0:
                return Response({
                    'found': True,
                    'price': int(first_tar.freight_price),
                    'source': f"Biểu cước khách hàng [{first_tar.pickup_location} ➔ {first_tar.delivery_location}]",
                    'route': f"{first_tar.pickup_location} ➔ {first_tar.delivery_location}",
                    'message': "Đã tự động áp dụng giá theo Biểu cước hợp đồng"
                })

        # 3. Tra cứu lịch sử chuyến xe gần nhất của khách
        if delivery:
            recent_trip = DispatchTrip.objects.filter(
                customer=customer,
                is_deleted=False,
                delivery_location__icontains=delivery
            ).exclude(cached_revenue=0).order_by('-created_at').first()
            if recent_trip and recent_trip.cached_revenue > 0:
                return Response({
                    'found': True,
                    'price': int(recent_trip.cached_revenue),
                    'source': f"Lịch sử chuyến #{recent_trip.trip_code}",
                    'route': f"{recent_trip.pickup_location} ➔ {recent_trip.delivery_location}",
                    'message': f"Áp dụng theo chuyến gần nhất #{recent_trip.trip_code}"
                })

        return Response({
            'found': False,
            'price': None,
            'message': 'Chưa có báo giá ký kết cho tuyến này. Vui lòng kiểm tra kỹ và nhập đơn giá cước bán (Bắt buộc)!'
        })


class SalesAPIView(APIView):
    """API Báo giá & Quản lý Đơn hàng Booking Sale CRM."""
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [IsSalesOrDirector]
    def get(self, request):
        # Tham số riêng biệt cho Báo giá (quote) và Đơn hàng (booking)
        quote_from = request.GET.get('quote_from_date') or request.GET.get('from_date') or request.GET.get('start_date')
        quote_to = request.GET.get('quote_to_date') or request.GET.get('to_date') or request.GET.get('end_date')
        quote_period = request.GET.get('quote_period')

        booking_from = request.GET.get('booking_from_date') or request.GET.get('from_date') or request.GET.get('start_date')
        booking_to = request.GET.get('booking_to_date') or request.GET.get('to_date') or request.GET.get('end_date')
        booking_period = request.GET.get('booking_period')

        quotations = Quotation.objects.filter(is_deleted=False).select_related('customer').prefetch_related('items').all()
        # Nếu chọn kỳ Tất Cả (all), không giới hạn ngày tạo để hiển thị trọn vẹn mọi hợp đồng tuyến
        if quote_period != 'all':
            if quote_from:
                try:
                    fd = datetime.datetime.strptime(quote_from.strip(), '%Y-%m-%d').date()
                    quotations = quotations.filter(created_at__date__gte=fd)
                except Exception:
                    pass
            if quote_to:
                try:
                    td = datetime.datetime.strptime(quote_to.strip(), '%Y-%m-%d').date()
                    quotations = quotations.filter(created_at__date__lte=td)
                except Exception:
                    pass

        q_results = []
        total_monthly_expected_revenue = 0
        sent_count = 0
        negotiating_count = 0
        pending_approval_count = 0
        approved_count = 0
        rejected_count = 0

        for q in quotations:
            rev = float(q.expected_revenue)
            total_monthly_expected_revenue += rev
            if q.status == 'SENT':
                sent_count += 1
            elif q.status == 'NEGOTIATING':
                negotiating_count += 1
            elif q.status == 'PENDING_APPROVAL':
                pending_approval_count += 1
            elif q.status == 'APPROVED':
                approved_count += 1
            elif q.status in ['REJECTED', 'EXPIRED']:
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
                'monthly_trips': q.total_expected_trips,
                'total_trips': q.total_expected_trips,
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
        if booking_period != 'all':
            if booking_from:
                try:
                    fd = datetime.datetime.strptime(booking_from.strip(), '%Y-%m-%d').date()
                    bookings = bookings.filter(
                        Q(loading_date__gte=fd) | 
                        Q(loading_date__isnull=True, created_at__date__gte=fd)
                    )
                except Exception:
                    pass
            if booking_to:
                try:
                    td = datetime.datetime.strptime(booking_to.strip(), '%Y-%m-%d').date()
                    bookings = bookings.filter(
                        Q(loading_date__lte=td) | 
                        Q(loading_date__isnull=True, created_at__date__lte=td)
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

            trips_list = [t for t in b.trips.select_related('vehicle', 'driver', 'subcontractor').all() if not t.is_deleted]
            has_drop_hook = any(t.is_split_trip for t in trips_list)
            drop_hook_count = sum(1 for t in trips_list if t.is_split_trip)
            vehicles_str = ' '.join(set([t.vehicle.plate_number for t in trips_list if t.vehicle and t.vehicle.plate_number]))
            trip_codes_str = ' '.join([t.trip_id or f"TVL-{t.id}" for t in trips_list])
            vendors_str = ' '.join(set([t.subcontractor.name for t in trips_list if t.subcontractor and t.subcontractor.name] + [t.carrier_name for t in trips_list if t.carrier_name]))
            drivers_str = ' '.join(set([t.driver.full_name for t in trips_list if t.driver and t.driver.full_name] + [t.subcontractor_driver_name for t in trips_list if t.subcontractor_driver_name]))

            b_results.append({
                'id': b.id,
                'booking_code': b.booking_code,
                'customer': b.customer.name,
                'customer_id': b.customer.id,
                'vehicles': vehicles_str,
                'trip_codes': trip_codes_str,
                'vendors': vendors_str,
                'drivers': drivers_str,
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

        # 1. Thống kê 5 nhóm BÁO GIÁ & HỢP ĐỒNG KHÁCH HÀNG:
        # [ĐÃ KÝ HỢP ĐỒNG | CHỜ KÝ HỢP ĐỒNG | ĐANG ĐÀM PHÁN | ĐÃ GỬI BÁO GIÁ | TỪ CHỐI]
        def calc_quote_group(qs_group):
            rev = sum(float(q.expected_revenue or 0) for q in qs_group)
            routes = sum(q.items.filter(is_deleted=False).count() or 1 for q in qs_group)
            trips = sum(int(q.total_expected_trips or 0) for q in qs_group)
            return {'count': qs_group.count(), 'revenue': rev, 'routes': routes, 'trips': trips}

        q_signed = calc_quote_group(quotations.filter(status='APPROVED'))
        q_pending = calc_quote_group(quotations.filter(status='PENDING_APPROVAL'))
        q_negotiating = calc_quote_group(quotations.filter(status='NEGOTIATING'))
        q_sent = calc_quote_group(quotations.filter(status='SENT'))
        q_rejected = calc_quote_group(quotations.filter(status__in=['REJECTED', 'EXPIRED']))

        # Tính toán Doanh thu thực hiện từ các chuyến vận tải đã hoàn thành (DELIVERED / COMPLETED)
        from apps.dispatch.models import DispatchTrip, TripStatus
        completed_trips_qs = DispatchTrip.objects.filter(is_deleted=False, status__in=[TripStatus.DELIVERED, TripStatus.COMPLETED])
        if (booking_from or booking_to) and booking_period != 'all':
            # Nếu người dùng chọn lọc khoảng ngày cụ thể, lọc chuyến theo ngày hoàn thành/đóng hàng
            b_ids = bookings.values_list('id', flat=True)
            matched_trips = completed_trips_qs.filter(booking_order_id__in=b_ids)
            if matched_trips.exists():
                completed_trips_qs = matched_trips

        def _calc_t_rev(t):
            r = int(t.cached_revenue or 0)
            if r <= 0 and t.booking_order and t.booking_order.selling_freight_price > 0:
                r = int(t.booking_order.selling_freight_price)
            if r <= 0 and t.customer:
                tar = t.customer.tariffs.first()
                if tar:
                    r = int(tar.freight_price)
            return r

        earned_revenue_total = sum(_calc_t_rev(t) for t in completed_trips_qs)
        settled_trips_count = completed_trips_qs.filter(is_customer_settled=True).count()
        total_completed_trips = completed_trips_qs.count()

        # Số đơn hàng gấp (cần xử lý trong 48h hoặc đang chờ điều xe)
        urgent_bookings_qs = bookings.exclude(status=BookingStatus.COMPLETED).filter(
            Q(loading_date__lte=today + datetime.timedelta(days=2)) | Q(status=BookingStatus.PENDING_DISPATCH)
        ).distinct()
        urgent_bookings_count = urgent_bookings_qs.count()
        urgent_in_48h_count = bookings.exclude(status=BookingStatus.COMPLETED).filter(
            loading_date__lte=today + datetime.timedelta(days=2)
        ).distinct().count()

        # Cụm 5 chỉ số tổng hợp kinh doanh tái cấu trúc theo chuẩn ERP:
        # 1. DOANH THU THỰC HIỆN | 2. DOANH THU DỰ KIẾN | 3. TỔNG ĐƠN HÀNG | 4. SỐ ĐƠN GẤP | 5. TỶ LỆ CHỐT BÁO GIÁ
        overview_metrics = {
            # Thẻ 1: DOANH THU THỰC HIỆN
            'earned_revenue': earned_revenue_total,
            'earned_revenue_trend': f"{settled_trips_count}/{total_completed_trips} Chuyến Đối Soát",
            'earned_revenue_note': f"{total_completed_trips} chuyến xe hoàn tất" + (f" · {settled_trips_count} đã đối soát" if settled_trips_count > 0 else ""),

            # Thẻ 2: DOANH THU DỰ KIẾN (Kế hoạch từ HĐ đã ký & phễu)
            'expected_revenue': q_signed['revenue'], # Doanh thu kế hoạch thực tế từ các HĐ đã ký
            'revenue_monthly': q_signed['revenue'], # Tương thích ngược
            'revenue_total_pipeline': total_monthly_expected_revenue, # Tổng toàn phễu
            'expected_revenue_trend': f"{approved_count} HĐ Đã Ký",
            'expected_revenue_note': f"{approved_count} HĐ ({q_signed['routes']} tuyến đã ký)" + (f" · {q_negotiating['count']} đang đàm phán" if q_negotiating['count'] > 0 else ""),
            'revenue_trend': f"{approved_count} HĐ Đã Ký",
            'revenue_note': f"{approved_count} HĐ ({q_signed['routes']} tuyến đã ký)",

            # Thẻ 3: TỔNG ĐƠN HÀNG
            'total_bookings': bookings.count(),
            'booking_trend': f"{bookings.count()} Đơn Tiếp Nhận",
            'booking_trend_direction': 'neutral',
            'booking_note': f"{bookings.filter(status=BookingStatus.PENDING_DISPATCH).count()} Chờ điều · {bookings.filter(status=BookingStatus.PARTIALLY_DISPATCHED).count()} Đang chạy",

            # Thẻ 4: SỐ ĐƠN GẤP
            'urgent_bookings': urgent_bookings_count,
            'urgent_trend': f"{urgent_bookings_count} Đơn Cần Xử Lý",
            'urgent_note': f"{urgent_in_48h_count} đơn đóng hàng trong 48h",

            # Thẻ 5: TỶ LỆ CHỐT BÁO GIÁ (WIN RATE %)
            'win_rate': win_rate,
            'win_rate_trend': f"{approved_count}/{total_quotes} Báo Giá Đã Chốt",
            'win_rate_trend_direction': 'neutral',
            'win_rate_note': f"{negotiating_count} đang đàm phán" + (f" · {pending_approval_count} chờ duyệt" if pending_approval_count > 0 else ""),

            # Tương thích ngược các trường cũ
            'total_containers': total_containers_sum,
            'dispatched_containers': dispatched_containers_sum,
            'remaining_containers': remaining_containers_sum,
            'container_trend': f"{total_containers_sum} Cont Kế Hoạch",
            'container_trend_direction': 'neutral',
            'container_note': f"Đã kéo: {dispatched_containers_sum} · Còn lại: {remaining_containers_sum} cont"
        }

        # 2. Thống kê 5 nhóm BOOKING / ĐƠN ĐẶT HÀNG:
        # [CHỜ ĐIỀU XE | ĐANG ĐIỀU XE | ĐƠN GẤP | CHẠY CẮT KÉO | ĐÃ HOÀN TẤT]
        def calc_booking_group(b_group, is_completed_group=False):
            cnt = b_group.count()
            conts = sum(b.total_containers or 1 for b in b_group)
            trips_qs = DispatchTrip.objects.filter(is_deleted=False, booking_order__in=b_group)
            trips_cnt = trips_qs.count()
            if is_completed_group:
                completed_conts = conts
                uncompleted_conts = 0
            else:
                completed_conts = sum(b.dispatched_containers or 0 for b in b_group)
                uncompleted_conts = max(0, conts - completed_conts)
            return {
                'count': cnt,
                'total_trips': trips_cnt,
                'total_containers': conts,
                'completed_containers': completed_conts,
                'uncompleted_containers': uncompleted_conts
            }

        bk_pending = calc_booking_group(bookings.filter(status=BookingStatus.PENDING_DISPATCH))
        bk_dispatching = calc_booking_group(bookings.filter(status=BookingStatus.PARTIALLY_DISPATCHED))
        bk_urgent = calc_booking_group(bookings.exclude(status=BookingStatus.COMPLETED).filter(
            Q(loading_date__lte=today + datetime.timedelta(days=2)) | Q(status=BookingStatus.PENDING_DISPATCH)
        ).distinct())
        bk_drop_hook = calc_booking_group(bookings.filter(trips__is_split_trip=True).distinct())
        bk_completed = calc_booking_group(bookings.filter(status=BookingStatus.COMPLETED), is_completed_group=True)

        return Response({
            'quotations': q_results,
            'bookings': b_results,
            'overview_metrics': overview_metrics,
            'stats': {
                'overview': overview_metrics,
                'quotation_stats': {
                    'signed': q_signed,
                    'pending': q_pending,
                    'negotiating': q_negotiating,
                    'sent': q_sent,
                    'rejected': q_rejected,
                    # Tương thích ngược
                    'total_quotes': total_quotes,
                    'negotiating_count': q_negotiating['count'],
                    'pending_approval': q_pending['count'],
                    'approved': q_signed['count'],
                    'rejected_count': q_rejected['count'],
                    'expected_revenue': total_monthly_expected_revenue
                },
                'booking_stats': {
                    'pending_dispatch_group': bk_pending,
                    'partially_dispatched_group': bk_dispatching,
                    'urgent_group': bk_urgent,
                    'drop_hook_group': bk_drop_hook,
                    'completed_group': bk_completed,
                    # Tương thích ngược
                    'total_bookings': bookings.count(),
                    'pending_dispatch': bk_pending['count'],
                    'partially_dispatched': bk_dispatching['count'],
                    'completed': bk_completed['count'],
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
            booking_code = next_code(BookingOrder, 'booking_code', bk_prefix, 3)  # mã tuần tự an toàn, không trùng
            
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
                format_booking_attachment_filename(bf, booking_code)

            uploaded_bk_file = uploaded_bk_files[0] if uploaded_bk_files else None

            # Chuẩn hóa giờ hẹn (mặc định 08:00)
            loading_time_str = str(data.get('loading_time') or '08:00').strip()
            if loading_time_str.upper() in ['8H', '8']:
                loading_time_str = '08:00'

            selling_freight_price = float(data.get('selling_freight_price') or 0)
            if selling_freight_price <= 0:
                # Tự động tra cứu giá từ Báo giá ký kết hoặc Biểu cước của khách hàng theo yêu cầu
                auto_price = 0
                quotes = Quotation.objects.filter(customer=customer, is_deleted=False).order_by(
                    models.Case(
                        models.When(status='APPROVED', then=models.Value(1)),
                        models.When(status='PENDING_APPROVAL', then=models.Value(2)),
                        default=models.Value(3),
                        output_field=models.IntegerField()
                    ),
                    '-created_at'
                )
                for q in quotes:
                    for it in q.items.filter(is_deleted=False):
                        if delivery_str and (delivery_str.upper() in (it.route_description or '').upper() or delivery_str.upper() in (it.destination_zone or '').upper()):
                            if it.unit_price > 0:
                                auto_price = float(it.unit_price)
                                break
                    if auto_price > 0:
                        break
                    if q.unit_price > 0:
                        auto_price = float(q.unit_price)
                        break

                if auto_price <= 0:
                    tar = customer.tariffs.filter(is_deleted=False).first()
                    if tar and tar.freight_price > 0:
                        auto_price = float(tar.freight_price)

                if auto_price > 0:
                    selling_freight_price = auto_price
                else:
                    return Response({'error': 'Đơn giá cước vận chuyển là bắt buộc và phải lớn hơn 0! Vui lòng kiểm tra và nhập giá cước bán.'}, status=status.HTTP_400_BAD_REQUEST)

            curr_emp = getattr(request.user, 'employee', None)
            booking = BookingOrder.objects.create(
                booking_code=booking_code,
                customer=customer,
                created_by=curr_emp,
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
                selling_freight_price=selling_freight_price,
                booking_file=uploaded_bk_file,
                status=data.get('status', BookingStatus.PENDING_DISPATCH),
                notes=data.get('notes', '')
            )

            # Lưu tất cả các file đính kèm vào BookingDocument với tên đã gán mã Booking
            for bf in uploaded_bk_files:
                doc_file_name = getattr(bf, 'name', '') or f"{booking.booking_code}_booking_document"
                BookingDocument.objects.create(
                    booking=booking,
                    file=bf,
                    file_name=doc_file_name,
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
            q_code = next_code(Quotation, 'quotation_code', q_prefix, 3)  # mã tuần tự an toàn, không trùng

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
            first_unit_price = float(data.get('unit_price') or 0)
            first_trips = int(data.get('monthly_trips') or data.get('expected_trips_monthly') or 1)
            first_orig_zone = data.get('origin_zone', '').strip()
            first_dest_zone = data.get('destination_zone', '').strip()
            first_est_km = int(data.get('estimated_km') or 0)
            first_cargo = data.get('cargo_type', 'Container 40HC / Hàng tổng hợp').strip()

            if items_list and len(items_list) > 0:
                it0 = items_list[0]
                first_route = it0.get('route_description', first_route) or first_route
                first_unit_price = float(it0.get('unit_price', first_unit_price) or first_unit_price)
                first_trips = sum(int(it.get('expected_trips_monthly') or 0) for it in items_list) or int(it0.get('expected_trips_monthly', first_trips) or first_trips)
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
                curr_emp = getattr(request.user, 'employee', None)
                quotation = Quotation.objects.create(
                    quotation_code=q_code,
                    customer=customer,
                    created_by=curr_emp,
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
            'created_at_iso': q.created_at.strftime('%Y-%m-%d') if q.created_at else '',
            'can_edit': check_can_edit_or_delete(request.user, q, owner_field='created_by', action='edit')[0],
            'can_delete': (
                check_can_edit_or_delete(request.user, q, owner_field='created_by', action='edit')[0]
                and q.status != 'APPROVED'
            ),
            'creator_name': (q.created_by.nickname or q.created_by.full_name) if q.created_by else ''
        })

    def put(self, request, pk):
        q = Quotation.objects.filter(pk=pk, is_deleted=False).first()
        if not q:
            return Response({'error': 'Không tìm thấy báo giá'}, status=status.HTTP_404_NOT_FOUND)
        can_edit, edit_msg = check_can_edit_or_delete(request.user, q, owner_field='created_by', action='edit')
        if not can_edit:
            return Response({'error': edit_msg}, status=status.HTTP_403_FORBIDDEN)
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
                q.expected_trips_monthly = sum(int(it.get('expected_trips_monthly') or 0) for it in items_list) or int(it0.get('expected_trips_monthly', q.expected_trips_monthly) or q.expected_trips_monthly)
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
        can_del, del_msg = check_can_edit_or_delete(request.user, q, owner_field='created_by', action='delete')
        if not can_del:
            return Response({'error': del_msg}, status=status.HTTP_403_FORBIDDEN)
        if q.status == 'APPROVED':
            return Response({
                'error': f"Báo giá [{q.quotation_code}] đã được phê duyệt chính thức (APPROVED). Vui lòng chuyển trạng thái sang TỪ CHỐI hoặc HẾT HẠN trước khi xóa."
            }, status=status.HTTP_400_BAD_REQUEST)
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
        valid_statuses = ['SENT', 'NEGOTIATING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED']
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
