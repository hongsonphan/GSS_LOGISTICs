"""API công khai theo token QR: tài xế mở QR lệnh để xem thông tin, đổi bước, gửi chứng từ; quét kiện hàng lẻ.

Quyền = nắm token (lệnh đã cấp cho tài xế) HOẶC đăng nhập nhân viên. Token không nhúng dữ liệu nghiệp vụ.
Không trả doanh thu / chi phí / lợi nhuận.
"""
from django.core.exceptions import ValidationError
from django.http import Http404
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


class TripQrInfoAPIView(_TokenView):
    def get(self, request, token):
        trip = self.trip(request, token)
        msg.mark_opened(trip)
        qr.log_scan('TRIP', trip.pk, 'OPEN', actor_label=_actor(request), ip=_ip(request))
        row = trip_row(trip)
        for key in ('customer',):  # tài xế không cần tên khách ở đây; giữ gọn
            row.pop(key, None)
        notes = effective_notes(trip.booking_order) if trip.booking_order_id else {'destination_notes': '', 'road_restrictions': ''}
        resp = Response({'success': True, 'data': {
            **row, **notes, 'action': wf.available_action(trip), 'counts': att.counts(trip), 'max_files': wf.MAX_FILES_PER_STAGE,
            'steps': [{'key': s, 'label': wf.STEP_LABELS[s]} for s in wf.STEPS], 'locked': trip.step_status in LOCKED_FOR_DRIVER,
            'packages': [qr.serialize(p) for p in trip.packages.filter(is_deleted=False)], 'package_summary': qr.summary(trip),
            'staff': bool(request.user and request.user.is_authenticated)}})
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
            docs = att.add_attachments(trip, request.data.get('stage'), request.FILES.getlist('files'), label='tài xế qua QR')
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
