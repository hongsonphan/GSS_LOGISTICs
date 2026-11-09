"""Chia cont cho nhà xe (điều vận) và Vendor Link (nhà xe, không cần đăng nhập)."""
from django.core.exceptions import ValidationError
from django.http import Http404
from django.utils import timezone
from rest_framework.parsers import FormParser, MultiPartParser

from apps.customers.dem_det import describe
from apps.dispatch import vendor_service as svc
from apps.dispatch.models import AllocationStatus, BookingVendorAllocation
from apps.master_data.models import CompanyProfile, Subcontractor
from core.features import has_feature
from ._common import *  # noqa: F401,F403


def _err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'message': message}, status=code)


def _msg(exc):
    return ' '.join(exc.messages)


def _feature_off(request):
    if not has_feature('vendor_portal', request):
        return _err('Tính năng chia cont cho nhà xe chưa được bật.', status.HTTP_403_FORBIDDEN)
    return None


def _link(request, raw):
    return request.build_absolute_uri(f'/vendor/{raw}/')


class BookingVendorAllocationsAPIView(APIView):
    """GET: danh sách phiếu chia của booking. POST: chia thêm cho một nhà xe (trả link một lần)."""
    permission_classes = [IsDispatcher]

    def _booking(self, pk):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            raise Http404
        return b

    def get(self, request, pk):
        if (off := _feature_off(request)):
            return off
        b = self._booking(pk)
        allocs = BookingVendorAllocation.objects.filter(booking=b, is_deleted=False) \
            .exclude(status=AllocationStatus.REVOKED).select_related('subcontractor')
        return Response({'success': True, 'data': {
            'booking_id': b.id, 'booking_code': b.booking_code, 'total_containers': b.total_containers,
            'allocated': svc.allocated_total(b), 'remaining': max(0, b.total_containers - svc.allocated_total(b)),
            'allocations': [svc.allocation_summary(a) for a in allocs]}})

    def post(self, request, pk):
        if (off := _feature_off(request)):
            return off
        b = self._booking(pk)
        sub = Subcontractor.objects.filter(pk=request.data.get('subcontractor_id'), is_deleted=False).first()
        if not sub:
            return _err('Chưa chọn nhà xe hợp lệ.')
        try:
            count = int(request.data.get('allocated_containers'))
            days = int(request.data.get('expires_days', svc.DEFAULT_LINK_DAYS))
            if not 0 <= days <= 365:
                raise ValueError
        except (TypeError, ValueError):
            return _err('Số cont hoặc số ngày hiệu lực không hợp lệ.')
        try:
            alloc, raw = svc.create_allocation(b, sub, count, expires_days=days, note=str(request.data.get('note') or ''), user=request.user)
        except ValidationError as exc:
            return _err(_msg(exc))
        return Response({'success': True, 'message': f'Đã chia {count} cont cho {sub.short_name or sub.name}.',
                         'data': svc.allocation_summary(alloc), 'link': _link(request, raw)}, status=status.HTTP_201_CREATED)


class VendorAllocationDetailAPIView(APIView):
    """Điều vận xem/sửa một phiếu: đổi số cont, cấp link mới, khóa/mở khóa, thu hồi, sửa dòng."""
    permission_classes = [IsDispatcher]

    def _alloc(self, pk):
        a = BookingVendorAllocation.objects.select_related('booking', 'booking__delivery_loc', 'subcontractor') \
            .filter(pk=pk, is_deleted=False).first()
        if not a:
            raise Http404
        return a

    def get(self, request, pk):
        if (off := _feature_off(request)):
            return off
        a = self._alloc(pk)
        return Response({'success': True, 'data': {**svc.allocation_summary(a), 'rows': svc.rows_for(a, for_vendor=False)}})

    def patch(self, request, pk):
        if (off := _feature_off(request)):
            return off
        a = self._alloc(pk)
        action = request.data.get('action')
        try:
            if action == 'regenerate':
                raw = svc.regenerate_link(a, int(request.data.get('expires_days', svc.DEFAULT_LINK_DAYS)), user=request.user)
                return Response({'success': True, 'message': 'Đã cấp link mới, link cũ không còn dùng được.',
                                 'link': _link(request, raw), 'data': svc.allocation_summary(a)})
            if action in ('lock', 'unlock'):
                svc.set_locked(a, action == 'lock', user=request.user)
            elif action == 'revoke':
                svc.revoke_allocation(a, user=request.user)
            elif 'allocated_containers' in request.data:
                svc.resize_allocation(a, int(request.data['allocated_containers']))
            else:
                return _err('Thiếu thao tác hợp lệ.')
        except (ValidationError, ValueError, TypeError) as exc:
            return _err(_msg(exc) if isinstance(exc, ValidationError) else 'Giá trị không hợp lệ.')
        a.refresh_from_db()
        return Response({'success': True, 'message': 'Đã cập nhật phiếu chia cont.', 'data': svc.allocation_summary(a)})

    def put(self, request, pk):
        """Điều vận sửa dòng (không bị giới hạn bởi trạng thái chạy như nhà xe)."""
        if (off := _feature_off(request)):
            return off
        a = self._alloc(pk)
        rows = request.data.get('rows')
        if not isinstance(rows, list):
            return _err('Thiếu danh sách dòng.')
        try:
            out = svc.submit_rows(a, rows, source='dispatcher', user=request.user)
        except ValidationError as exc:
            return _err(_msg(exc))
        a.refresh_from_db()
        return Response({'success': True, **out, 'data': {**svc.allocation_summary(a), 'rows': svc.rows_for(a, for_vendor=False)}})


# ---------- cổng nhà xe (công khai bằng token) ----------
def _portal_payload(alloc, request):
    b = alloc.booking
    co = CompanyProfile.get_default_company()
    notes = svc.effective_notes(b)
    return {
        'company_name': co.short_name or co.company_name,
        'subcontractor': alloc.subcontractor.short_name or alloc.subcontractor.name,
        'status': alloc.status, 'locked': bool(alloc.locked_at), 'expired': svc.is_expired(alloc),
        'expires_at': alloc.expires_at.isoformat() if alloc.expires_at else None,
        'allocated_containers': alloc.allocated_containers, 'lifecycle': svc.lifecycle(alloc),
        # Không trả tên khách hàng, đơn giá hay thông tin tài chính cho nhà xe
        'booking': {
            'code': b.booking_code, 'booking_number': b.booking_number, 'shipping_line': b.shipping_line,
            'container_size': b.container_size, 'commodity': b.commodity,
            'pickup_location': b.pickup_location, 'delivery_location': b.delivery_location,
            'dropoff_location': b.dropoff_location, 'loading_date': b.loading_date.isoformat() if b.loading_date else None,
            'loading_time': b.loading_time, **notes, 'bl_number': b.hbl_number or b.mbl_number,
            'eta': b.eta.isoformat() if b.eta else None, 'cargo_mode': b.cargo_mode,
            'dem': describe(b.dem_expiry, co.warn_days), 'det': describe(b.det_expiry, co.warn_days),
        },
        'rows': svc.rows_for(alloc),
    }


class VendorPortalAPIView(APIView):
    """GET: bảng N dòng của phiếu. PUT: nhà xe lưu các dòng xe/tài/cont."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def _alloc(self, request, token):
        if not has_feature('vendor_portal', request):
            raise Http404
        alloc = svc.allocation_by_token(token)
        if not alloc or svc.lifecycle(alloc)['closed']:
            raise Http404  # lệnh đã hoàn tất quá số ngày chỉ-xem: link tự đóng
        return alloc

    def get(self, request, token):
        alloc = self._alloc(request, token)
        alloc.last_opened_at = timezone.now()
        alloc.save(update_fields=['last_opened_at'])
        resp = Response({'success': True, 'data': _portal_payload(alloc, request)})
        resp['Cache-Control'] = 'no-store'
        return resp

    def put(self, request, token):
        alloc = self._alloc(request, token)
        rows = request.data.get('rows')
        if not isinstance(rows, list) or len(rows) > 200:
            return _err('Danh sách dòng không hợp lệ.')
        try:
            out = svc.submit_rows(alloc, rows, source='vendor')
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        alloc.refresh_from_db()
        resp = Response({'success': True, **out, 'data': _portal_payload(alloc, request)})
        resp['Cache-Control'] = 'no-store'
        return resp


class VendorPortalCatalogAPIView(VendorPortalAPIView):
    """GET: danh mục đã dùng của nhà xe (biển số đầu kéo, rơ-moóc, tài xế theo SĐT) để gõ tìm/chọn nhanh."""

    def get(self, request, token):
        from apps.dispatch.models import DispatchTrip
        from apps.fleet.models import Vehicle
        alloc = self._alloc(request, token)
        sub = alloc.subcontractor
        plates = list(Vehicle.objects.filter(subcontractor=sub).order_by('license_plate').values_list('license_plate', flat=True)[:500])
        trips = DispatchTrip.objects.filter(subcontractor=sub, is_deleted=False).select_related('trailer').order_by('-id')[:2000]
        trailers, drivers = [], {}
        for t in trips:
            tp = (t.trailer.license_plate if t.trailer_id else t.trailer_plate_text) or ''
            if tp and tp not in trailers:
                trailers.append(tp)
            phone = (t.subcontractor_driver_phone or '').strip()
            if phone and phone not in drivers:
                drivers[phone] = t.subcontractor_driver_name or ''
        resp = Response({'success': True, 'data': {'tractors': plates, 'trailers': trailers[:500],
                                                   'drivers': [{'phone': p, 'name': n} for p, n in list(drivers.items())[:500]]}})
        resp['Cache-Control'] = 'no-store'
        return resp


class VendorPortalExcelAPIView(VendorPortalAPIView):
    """GET: tải file Excel mẫu (có sẵn số cont được giao). POST: nhà xe nhập lại file đã điền xe/tài xế."""
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request, token):
        from apps.gss import vendor_excel
        alloc = self._alloc(request, token)
        return vendor_excel.template_response(alloc, svc.rows_for(alloc))

    def post(self, request, token):
        from apps.gss import vendor_excel
        alloc = self._alloc(request, token)
        f = request.FILES.get('file')
        if not f or f.size > 2 * 1024 * 1024:
            return _err('Chọn file Excel (.xlsx) dưới 2MB.')
        try:
            rows = vendor_excel.read_rows(alloc, f)
            out = svc.submit_rows(alloc, rows, source='vendor')
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        alloc.refresh_from_db()
        resp = Response({'success': True, **out, 'data': _portal_payload(alloc, request)})
        resp['Cache-Control'] = 'no-store'
        return resp
