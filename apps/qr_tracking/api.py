"""API công khai theo token QR: tài xế mở QR lệnh để xem thông tin, đổi bước, gửi chứng từ; quét kiện hàng lẻ.

Quyền = nắm token (lệnh đã cấp cho tài xế) HOẶC đăng nhập nhân viên. Token không nhúng dữ liệu nghiệp vụ.
Không trả doanh thu / chi phí / lợi nhuận.
"""
from django.core.exceptions import ValidationError
from django.http import Http404, HttpResponse
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dispatch import gss_attachments as att
from apps.dispatch import gss_messages as msg
from apps.dispatch import gss_workflow as wf
from apps.dispatch.api_views.gss import trip_row
from apps.dispatch.vendor_service import effective_notes
from apps.qr_tracking import service as qr
from core.features import has_feature

LOCKED_FOR_DRIVER = ('EMPTY_RETURNED', 'CANCELLED')


def _err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'message': message}, status=code)


def _ip(request):
    return request.META.get('HTTP_X_REAL_IP') or request.META.get('REMOTE_ADDR', '')


def _actor(request):
    u = request.user
    return u.get_username() if getattr(u, 'is_authenticated', False) else 'tài xế qua QR'


class _TokenView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def trip(self, request, token):
        if not has_feature('qr_tracking', request):
            raise Http404
        trip = qr.trip_by_token(token)
        if not trip:
            raise Http404
        return trip


class TripQrSvgAPIView(_TokenView):
    """Trang anh QR (SVG) theo token de hien thi ma QR tai xe khong can quyen dispatcher."""
    def get(self, request, token):
        trip = self.trip(request, token)
        from core import qr_tokens
        from apps.dispatch.api_views.gss import base_url
        url = msg.trip_link(trip, base_url(request))
        resp = HttpResponse(qr_tokens.qr_svg(url), content_type='image/svg+xml')
        resp['Cache-Control'] = 'public, max-age=3600'
        return resp

class TripQrInfoAPIView(_TokenView):
    def get(self, request, token):
        trip = self.trip(request, token)
        msg.mark_opened(trip)
        qr.log_scan('TRIP', trip.pk, 'OPEN', actor_label=_actor(request), ip=_ip(request))
        row = trip_row(trip)
        for key in ('customer', 'customer_short'):  # tài xế không cần tên khách ở đây; giữ gọn
            row.pop(key, None)
        notes = effective_notes(trip.booking_order) if trip.booking_order_id else {'destination_notes': '', 'road_restrictions': ''}
        resp = Response({'success': True, 'data': {
            **row, **notes, 'action': wf.available_action(trip), 'counts': att.counts(trip), 'max_files': wf.MAX_FILES_PER_STAGE,
            'steps': [{'key': s, 'label': wf.STEP_LABELS[s]} for s in wf.STEPS], 'locked': trip.step_status in LOCKED_FOR_DRIVER,
            'packages': [qr.serialize(p) for p in trip.packages.filter(is_deleted=False)], 'package_summary': qr.summary(trip),
            'staff': bool(request.user and request.user.is_authenticated), **_driver_extras(trip)}})
        resp['Cache-Control'] = 'no-store'
        return resp


class TripQrStepAPIView(_TokenView):
    def post(self, request, token):
        trip = self.trip(request, token)
        if trip.step_status in LOCKED_FOR_DRIVER:
            return _err('Chuyến đã kết thúc, không cập nhật được nữa.', status.HTTP_409_CONFLICT)
        d = request.data
        try:
            # Tài xế (không đăng nhập) chỉ đi tiến đúng bước kế tiếp: không truyền user nên không có quyền force/lùi bước
            trip = wf.advance(trip, d.get('to'), actor_label='tài xế qua QR', fields=d.get('fields') or {}, swap=d.get('swap') or None)
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        qr.log_scan('TRIP', trip.pk, f'STEP_{trip.step_status}', actor_label='tài xế qua QR', ip=_ip(request))
        return Response({'success': True, 'message': f'Đã cập nhật: {wf.STEP_LABELS[trip.step_status]}.',
                         'data': trip_row(trip), 'action': wf.available_action(trip), 'counts': att.counts(trip)})


class TripQrAttachmentsAPIView(_TokenView):
    def post(self, request, token):
        trip = self.trip(request, token)
        if trip.step_status in LOCKED_FOR_DRIVER:
            return _err('Chuyến đã kết thúc, không tải thêm chứng từ.', status.HTTP_409_CONFLICT)
        try:
            authed = bool(request.user and request.user.is_authenticated)
            docs = att.add_attachments(trip, request.data.get('stage'), request.FILES.getlist('files'), label=_actor(request),
                                       meta=_capture_meta(request), staff=authed)
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        qr.log_scan('TRIP', trip.pk, 'UPLOAD', detail=f'{len(docs)} file', actor_label='tài xế qua QR', ip=_ip(request))
        return Response({'success': True, 'message': f'Đã tải lên {len(docs)} file.', 'counts': att.counts(trip),
                         'action': wf.available_action(trip)}, status=status.HTTP_201_CREATED)


class PackageQrScanAPIView(_TokenView):
    """Quét tem QR của kiện. Cho phép khi đăng nhập nhân viên hoặc kèm token lệnh của đúng chuyến chứa kiện."""

    def post(self, request, token):
        if not has_feature('qr_tracking', request) or not has_feature('lcl_packages', request):
            raise Http404
        pkg = qr.package_by_token(token)
        if not pkg:
            raise Http404
        authed = bool(request.user and request.user.is_authenticated)
        if not authed:
            trip_token = str(request.data.get('trip_token') or '')
            owner = qr.trip_by_token(trip_token)
            if not owner or owner.pk != pkg.trip_id:
                return _err('Cần đăng nhập hoặc mở từ lệnh của đúng chuyến để quét kiện.', status.HTTP_403_FORBIDDEN)
        try:
            out = qr.scan_package(pkg, request.data.get('phase'), seal_seen=request.data.get('seal_seen') or '',
                                  damaged=bool(request.data.get('damaged')), note=str(request.data.get('note') or ''),
                                  actor_label=_actor(request), ip=_ip(request))
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        return Response({'success': True, **out})


def _capture_meta(request):
    d = request.data
    meta = {'source': str(d.get('capture_source') or '')[:20], 'device_time': str(d.get('device_time') or '')[:40]}
    try:
        lat, lng = float(d.get('lat')), float(d.get('lng'))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            meta['gps'] = {'lat': round(lat, 6), 'lng': round(lng, 6)}
    except (TypeError, ValueError):
        pass
    return meta


def _driver_extras(trip):
    """Dữ liệu thêm cho trang tài xế: khoản chi hộ được khai, các khoản đã khai, trạm/bãi để bấm mốc, khung giờ nhận hàng."""
    from apps.depot_yard.models import Yard
    from apps.gss.models import ChargeCode
    codes = [{'id': c.id, 'code': c.code, 'name': c.name} for c in ChargeCode.objects.filter(is_deleted=False, is_active=True)
             .exclude(kind='FREIGHT').order_by('kind', 'code')]
    claims = [{'id': c.id, 'charge': c.charge_code.name, 'amount': str(c.amount), 'status': c.status, 'status_label': c.get_status_display(),
               'at': c.created_at.isoformat()} for c in trip.cost_claims.filter(is_deleted=False).select_related('charge_code')]
    places = [y.name for y in Yard.objects.filter(is_deleted=False, is_active=True).order_by('name')]
    loc = trip.warehouse_loc
    return {'claim_codes': codes, 'claims': claims, 'checkpoint_places': places,
            'delivery_opening_hours': (loc.opening_hours if loc else '') or '',
            'street_turn': bool(trip.is_street_turn)}


class TripQrClaimAPIView(_TokenView):
    """Tài xế khai chi phí chi hộ / phát sinh kèm ảnh hoá đơn (bắt buộc ảnh)."""

    def post(self, request, token):
        from apps.gss import claims as cl
        from apps.gss.models import ChargeCode
        trip = self.trip(request, token)
        if trip.step_status == 'CANCELLED':
            return _err('Chuyến đã huỷ.', status.HTTP_409_CONFLICT)
        code = ChargeCode.objects.filter(pk=request.data.get('charge_code_id'), is_deleted=False, is_active=True).exclude(kind='FREIGHT').first()
        try:
            claim = cl.submit_claim(trip, charge_code=code, amount=request.data.get('amount'), description=request.data.get('description') or '',
                                    photo=request.FILES.get('photo'), user=request.user, label=_actor(request))
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        qr.log_scan('TRIP', trip.pk, 'CLAIM', detail=f'{claim.charge_code.code} {claim.amount}', actor_label=_actor(request), ip=_ip(request))
        return Response({'success': True, 'message': 'Đã gửi khai chi phí, chờ kế toán duyệt.', **_driver_extras(trip)}, status=status.HTTP_201_CREATED)


class TripQrCheckpointAPIView(_TokenView):
    """Mốc phụ 'qua trạm/bãi' (không đổi bước chính)."""

    def post(self, request, token):
        from apps.gss import journey
        trip = self.trip(request, token)
        meta = _capture_meta(request)
        try:
            journey.record_checkpoint(trip, place=request.data.get('place'), note=request.data.get('note') or '', actor_label=_actor(request),
                                      gps=meta.get('gps'), device_time=meta.get('device_time'))
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        qr.log_scan('TRIP', trip.pk, 'CHECKPOINT', detail=str(request.data.get('place') or '')[:100], actor_label=_actor(request), ip=_ip(request))
        return Response({'success': True, 'message': 'Đã ghi nhận qua trạm/bãi.'}, status=status.HTTP_201_CREATED)
