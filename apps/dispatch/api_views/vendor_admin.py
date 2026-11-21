"""Tab «Quản lý Vendor» ở màn Điều vận: theo dõi cổng nhà xe, link nhà xe và link tài xế; thu hồi / đặt hạn dùng.

Tài khoản và mật khẩu nhà xe đã có API riêng (`/api/vendor-portal-accounts/<id>/`), link nhà xe dùng
`/api/vendor-allocations/<id>/`. Module này gom dữ liệu để theo dõi và thêm thao tác cho link tài xế `/q/<token>/`.
"""
import datetime

from django.utils import timezone

from apps.dispatch import vendor_service as svc
from apps.dispatch.gss_messages import trip_token
from apps.dispatch.models import AllocationStatus, BookingVendorAllocation
from apps.fleet.models import Vehicle
from apps.master_data.models import Subcontractor, SubcontractorPortalAccount
from core.features import has_feature
from core.models import AuditLog
from ._common import *  # noqa: F401,F403

MAX_DRIVER_LINK_DAYS = 365
_DONE_STEPS = ('EMPTY_RETURNED', 'CANCELLED')


def _err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'message': message}, status=code)


def _feature_off(request):
    if not has_feature('vendor_portal', request):
        return _err('Tính năng cổng nhà xe chưa được bật.', status.HTTP_403_FORBIDDEN)
    return None


def _iso(value):
    return value.isoformat() if value else None


def driver_link_state(trip, now=None):
    """valid | expired (hết hạn hoặc đã thu hồi)."""
    now = now or timezone.now()
    return 'expired' if (trip.qr_expires_at and trip.qr_expires_at <= now) else 'valid'


def serialize_driver_link(trip, request, now=None):
    alloc = trip.vendor_allocation
    sub = alloc.subcontractor if alloc else None
    driver = (trip.subcontractor_driver_name or (trip.driver.full_name if trip.driver_id else '') or '')
    driver_phone = trip.subcontractor_driver_phone or (trip.driver.phone if trip.driver_id else '') or ''
    cust = (alloc.booking.customer if alloc and alloc.booking else None) or getattr(trip, 'customer', None)
    customer_name = (cust.short_name or cust.name) if cust else ''
    pickup = trip.pickup_depot or trip.pickup_location or ''
    delivery = trip.delivery_warehouse or trip.warehouse_location or ''
    dropoff = trip.dropoff_depot or trip.dropoff_location or ''
    return {
        'trip_id': trip.id, 'trip_code': trip.trip_code, 'container_number': trip.container_number or '',
        'booking_code': alloc.booking.booking_code if alloc and alloc.booking else '',
        'customer': customer_name,
        'vendor_id': sub.id if sub else None, 'vendor': (sub.short_name or sub.name) if sub else '',
        'driver_name': driver, 'driver_phone': driver_phone,
        'plate': trip.vehicle.license_plate if trip.vehicle_id else '',
        'pickup_place': pickup,
        'delivery_place': delivery,
        'empty_return_place': dropoff,
        'step_status': trip.step_status, 'step_label': trip.get_step_status_display(),
        'timestamps': {
            'ready': _iso(trip.created_at),
            'arrived_pickup': _iso(trip.arrived_pickup_at),
            'loaded': _iso(trip.loaded_at),
            'arrived_delivery': _iso(trip.arrived_delivery_at),
            'unloaded': _iso(trip.unloaded_at),
            'empty_returning': _iso(trip.empty_returning_at),
            'empty_returned': _iso(trip.empty_returned_at),
        },
        'link': request.build_absolute_uri(f'/q/{trip_token(trip)}/'),
        'expires_at': _iso(trip.qr_expires_at), 'state': driver_link_state(trip, now),
    }
def _audit_driver_link(trip, event, user, extra=None):
    ok = user is not None and getattr(user, 'is_authenticated', False)
    AuditLog.objects.create(
        actor=user if ok else None, actor_label=user.get_username() if ok else 'hệ thống', action='update',
        model_label='dispatch.dispatchtrip', object_id=str(trip.pk),
        object_repr=f'Link tài xế {trip.trip_code}'[:255], changes={'event': event, **(extra or {})}, company=trip.company)


def _account_payload(acct, now, request=None):
    if not acct:
        return None
    plain = acct.get_plain_token()
    base = request.build_absolute_uri('/')[:-1] if request else ''
    magic = f"{base}/vendor/login/?u={acct.username}&t={plain}" if plain else f"{base}/vendor/login/?u={acct.username}"
    return {
        'username': acct.username,
        'is_active': acct.is_active,
        'token_preview': acct.confirm_token_preview,
        'plain_token': plain,
        'token_expires_at': _iso(acct.token_expires_at),
        'token_expired': acct.is_token_expired(),
        'magic_link': magic,
        'locked': bool(acct.locked_until and acct.locked_until > now),
        'last_login_at': _iso(acct.last_login_at),
        'idle_timeout_minutes': acct.idle_timeout_minutes,
    }


class VendorAdminOverviewAPIView(APIView):
    """GET: nhà xe + tài khoản cổng, link nhà xe (phiếu chia) và link tài xế để Điều vận theo dõi, thu hồi, đặt hạn."""
    permission_classes = [IsDispatcher]

    def get(self, request):
        if (off := _feature_off(request)):
            return off
        now = timezone.now()
        include_done = request.query_params.get('include_done') == '1'

        allocs = list(BookingVendorAllocation.objects.filter(is_deleted=False, booking__is_deleted=False)
                      .exclude(status=AllocationStatus.REVOKED).select_related('booking', 'booking__customer', 'subcontractor')
                      .order_by('-id')[:500])
        accounts = {a.subcontractor_id: a for a in SubcontractorPortalAccount.objects.filter(is_deleted=False)}
        sub_ids = {a.subcontractor_id for a in allocs} | set(accounts)
        subs = Subcontractor.objects.filter(Q(pk__in=sub_ids) | Q(is_carrier=True, is_active=True), is_deleted=False).order_by('name')

        trips_qs = (DispatchTrip.objects.filter(is_deleted=False, vendor_allocation__isnull=False)
                    .exclude(step_status='CANCELLED')
                    .select_related('vendor_allocation', 'vendor_allocation__booking', 'vendor_allocation__subcontractor', 'vehicle', 'driver')
                    .order_by('-id'))
        if not include_done:
            trips_qs = trips_qs.exclude(step_status__in=_DONE_STEPS)
        trips = list(trips_qs[:500])

        links = []
        for a in allocs:
            s = svc.allocation_summary(a, request)
            cust = a.booking.customer
            b = a.booking
            links.append({
                **s,
                'booking_id': a.booking_id,
                'booking_code': b.booking_code,
                'customer': (cust.short_name or cust.name) if cust else '',
                'customer_short_name': (cust.short_name or cust.code or cust.name) if cust else '',
                'customer_name': cust.name if cust else '',
                'pickup_location': b.pickup_location or 'Cảng/Depot',
                'delivery_location': b.delivery_location or 'Kho khách',
                'dropoff_location': b.dropoff_location or 'Depot hạ rỗng',
                'state': 'expired' if s['expired'] else ('locked' if s['locked'] else 'valid')
            })

        reg_vehicles = list(Vehicle.objects.filter(is_deleted=False).select_related('current_driver'))
        reg_vehicles_by_sub = {}
        for rv in reg_vehicles:
            if rv.subcontractor_id:
                reg_vehicles_by_sub.setdefault(rv.subcontractor_id, []).append(rv)

        vendors = []
        for s in subs:
            mine = [l for l in links if l['subcontractor_id'] == s.id]
            sub_trips = [t for t in trips if t.vendor_allocation and t.vendor_allocation.subcontractor_id == s.id]
            drivers_map = {}
            vehicles_map = {}

            # Nạp phương tiện đã đăng ký trong hồ sơ đội xe (Fleet)
            for rv in reg_vehicles_by_sub.get(s.id, []):
                p = (rv.license_plate or '').strip()
                if p:
                    d_cur = rv.current_driver
                    vehicles_map[p] = {
                        'plate': p,
                        'vehicle_type': rv.get_vehicle_type_display(),
                        'brand': rv.brand or '',
                        'status': rv.get_status_display(),
                        'payload': rv.display_payload or '',
                        'driver_name': d_cur.full_name if d_cur else '',
                        'driver_phone': d_cur.phone if d_cur else '',
                        'latest_trip_id': None,
                        'latest_trip_code': '',
                        'latest_status': '',
                        'trips_count': 0,
                    }

            for t in sub_trips:
                d_name = (t.subcontractor_driver_name or (t.driver.full_name if t.driver_id else '') or '').strip()
                d_phone = (t.subcontractor_driver_phone or (t.driver.phone if t.driver_id else '') or '').strip()
                v_plate = (t.vehicle.license_plate if t.vehicle_id else '').strip()
                v_obj = t.vehicle
                if v_plate:
                    if v_plate not in vehicles_map:
                        vehicles_map[v_plate] = {
                            'plate': v_plate,
                            'vehicle_type': v_obj.get_vehicle_type_display() if v_obj else 'Đầu kéo Container',
                            'brand': v_obj.brand if v_obj else '',
                            'status': 'Đang chạy chuyến' if t.step_status not in _DONE_STEPS else 'Sẵn sàng',
                            'payload': (v_obj.display_payload if v_obj else '') or '',
                            'driver_name': d_name,
                            'driver_phone': d_phone,
                            'latest_trip_id': t.id,
                            'latest_trip_code': t.trip_code,
                            'latest_status': t.step_status,
                            'trips_count': 1,
                        }
                    else:
                        vehicles_map[v_plate]['trips_count'] += 1
                        if not vehicles_map[v_plate]['latest_trip_code']:
                            vehicles_map[v_plate]['latest_trip_id'] = t.id
                            vehicles_map[v_plate]['latest_trip_code'] = t.trip_code
                            vehicles_map[v_plate]['latest_status'] = t.step_status
                            if not vehicles_map[v_plate]['driver_name']:
                                vehicles_map[v_plate]['driver_name'] = d_name
                                vehicles_map[v_plate]['driver_phone'] = d_phone
                            if t.step_status not in _DONE_STEPS:
                                vehicles_map[v_plate]['status'] = 'Đang chạy chuyến'

                if d_name:
                    k = (d_name, d_phone)
                    if k not in drivers_map:
                        drivers_map[k] = {
                            'name': d_name, 'phone': d_phone,
                            'latest_trip_id': t.id, 'latest_trip_code': t.trip_code,
                            'latest_plate': v_plate, 'latest_status': t.step_status,
                            'link': request.build_absolute_uri(f'/q/{trip_token(t)}/'),
                        }

            vendors.append({
                'id': s.id, 'name': s.name, 'short_name': s.short_name or s.name, 'code': s.code or '',
                'tax_code': s.tax_code or '',
                'address': s.address or '',
                'phone': s.phone or '',
                'company_email': s.company_email or '',
                'contact_person': s.contact_person or '',
                'contact_title': s.contact_title or '',
                'contact_phone': s.contact_phone or '',
                'contact_email': s.contact_email or '',
                'yard_address': s.yard_address or '',
                'is_active': bool(s.is_active),
                'account': _account_payload(accounts.get(s.id), now, request),
                'links_valid': sum(1 for l in mine if l['state'] == 'valid'),
                'links_total': len(mine),
                'driver_links_valid': sum(1 for t in sub_trips if driver_link_state(t, now) == 'valid'),
                'vehicles': sorted(list(vehicles_map.values()), key=lambda x: x['plate']),
                'drivers': list(drivers_map.values()),
                'allocated_trips': [serialize_driver_link(t, request, now) for t in sub_trips],
            })
        return Response({'success': True, 'data': {
            'vendors': vendors, 'links': links,
            'driver_links': [serialize_driver_link(t, request, now) for t in trips],
            'default_link_days': svc.DEFAULT_LINK_DAYS, 'max_driver_link_days': MAX_DRIVER_LINK_DAYS}})


class DriverLinkAdminAPIView(APIView):
    """POST: thu hồi / cấp lại / đặt hạn dùng link tài xế của một chuyến.

    action = revoke (link cũ chết ngay) · regenerate (+ days) · set_expiry (days; 0 hoặc trống = không giới hạn).
    """
    permission_classes = [IsDispatcher]

    def post(self, request, trip_id):
        if (off := _feature_off(request)):
            return off
        trip = (DispatchTrip.objects.select_related('vendor_allocation', 'vendor_allocation__booking', 'vendor_allocation__subcontractor', 'vehicle', 'driver')
                .filter(pk=trip_id, is_deleted=False, vendor_allocation__isnull=False).first())
        if not trip:
            return _err('Không tìm thấy chuyến của nhà xe.', status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        days = request.data.get('days')
        try:
            days = None if days in (None, '', 0, '0') else int(days)
            if days is not None and not 1 <= days <= MAX_DRIVER_LINK_DAYS:
                raise ValueError
        except (TypeError, ValueError):
            return _err(f'Số ngày hiệu lực phải từ 1 đến {MAX_DRIVER_LINK_DAYS}.')
        now = timezone.now()
        deadline = now + datetime.timedelta(days=days) if days else None

        if action == 'revoke':
            trip.qr_version += 1  # token cũ không còn khớp chữ ký
            trip.qr_expires_at = now
            message = 'Đã thu hồi link tài xế. Link và QR đã phát không còn dùng được.'
            event, extra = 'DRIVER_LINK_REVOKE', {}
        elif action == 'regenerate':
            trip.qr_version += 1
            trip.qr_expires_at = deadline
            message = 'Đã cấp link tài xế mới, link cũ không còn dùng được.'
            event, extra = 'DRIVER_LINK_REGRANT', {'days': days}
        elif action == 'set_expiry':
            trip.qr_expires_at = deadline
            message = 'Đã đặt hạn dùng link tài xế.' if deadline else 'Link tài xế không giới hạn thời gian.'
            event, extra = 'DRIVER_LINK_EXPIRY', {'days': days}
        else:
            return _err('Thiếu thao tác hợp lệ (revoke, regenerate, set_expiry).')
        trip.save(update_fields=['qr_version', 'qr_expires_at', 'updated_at'])
        _audit_driver_link(trip, event, request.user, extra)
        return Response({'success': True, 'message': message, 'data': serialize_driver_link(trip, request, now)})


class VendorAllocationExcelAdminAPIView(APIView):
    """Điều vận xuất Excel hoặc nạp file Excel gán xe / tài xế / seal của phiếu phân bổ."""
    permission_classes = [IsDispatcher]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request, pk):
        from apps.gss import vendor_excel
        alloc = BookingVendorAllocation.objects.filter(pk=pk, is_deleted=False).first()
        if not alloc:
            return _err('Không tìm thấy phiếu phân bổ.', status.HTTP_404_NOT_FOUND)
        return vendor_excel.template_response(alloc, svc.rows_for(alloc))

    def post(self, request, pk):
        from apps.gss import vendor_excel
        alloc = BookingVendorAllocation.objects.filter(pk=pk, is_deleted=False).first()
        if not alloc:
            return _err('Không tìm thấy phiếu phân bổ.', status.HTTP_404_NOT_FOUND)
        f = request.FILES.get('file')
        if not f or f.size > 2 * 1024 * 1024:
            return _err('Chọn file Excel (.xlsx) dưới 2MB.')
        try:
            rows = vendor_excel.read_rows(alloc, f)
            out = svc.submit_rows(alloc, rows, source='dispatcher', user=request.user)
        except ValidationError as exc:
            return _err(' '.join(exc.messages), status.HTTP_409_CONFLICT)
        alloc.refresh_from_db()
        return Response({'success': True, 'message': f'Đã cập nhật thành công {out.get("saved", 0)} dòng từ Excel.', 'data': out})


class VendorAllocationBatchMessageAPIView(APIView):
    """Tạo bản tin tổng hợp danh sách link lệnh điều xe gửi Điều vận nhà xe qua Zalo / Email."""
    permission_classes = [IsDispatcher]

    def get(self, request, pk):
        from apps.dispatch import gss_messages as msg
        from apps.dispatch.api_views.gss import base_url
        alloc = BookingVendorAllocation.objects.select_related('booking', 'subcontractor').filter(pk=pk, is_deleted=False).first()
        if not alloc:
            return _err('Không tìm thấy phiếu phân bổ.', status.HTTP_404_NOT_FOUND)
        sub = alloc.subcontractor
        message = msg.compose_vendor_batch_message(alloc, base_url(request))
        phone = (getattr(sub, 'phone', '') or '') if sub else ''
        email = (getattr(sub, 'email', '') or '') if sub else ''
        return Response({
            'success': True,
            'data': {
                'allocation_id': alloc.id,
                'vendor_name': (sub.short_name or sub.name) if sub else '',
                'vendor_phone': phone,
                'vendor_email': email,
                'zalo_url': msg.zalo_url(phone) if phone else '',
                'message': message,
            }
        })
