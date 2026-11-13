"""Chia cont cho nhà xe (điều vận) và Vendor Link (nhà xe, không cần đăng nhập)."""
from django.core.exceptions import ValidationError
from django.http import Http404
from django.utils import timezone
from rest_framework.exceptions import APIException
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
        summaries = []
        for a in allocs:
            raw = (a.draft_rows or {}).get('_raw_token')
            if not raw or not svc.allocation_by_token(raw):
                raw = svc.regenerate_link(a, user=request.user)
                a.refresh_from_db()
            summaries.append(svc.allocation_summary(a, request))
        return Response({'success': True, 'data': {
            'booking_id': b.id, 'booking_code': b.booking_code, 'total_containers': b.total_containers,
            'allocated': svc.allocated_total(b), 'remaining': max(0, b.total_containers - svc.allocated_total(b)),
            'allocations': summaries}})

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

        email_result = None
        if request.data.get('send_email'):
            send_ok, send_msg = svc.send_vendor_allocation_email(alloc, raw, request)
            email_result = {'sent': send_ok, 'message': send_msg}

        return Response({
            'success': True,
            'message': f'Đã chia {count} cont cho {sub.short_name or sub.name}.' + (f' ({email_result["message"]})' if email_result else ''),
            'data': svc.allocation_summary(alloc, request),
            'link': _link(request, raw),
            'email': email_result
        }, status=status.HTTP_201_CREATED)


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
        return Response({'success': True, 'data': {**svc.allocation_summary(a, request), 'rows': svc.rows_for(a, for_vendor=False)}})

    def patch(self, request, pk):
        if (off := _feature_off(request)):
            return off
        a = self._alloc(pk)
        action = request.data.get('action')
        try:
            if action == 'regenerate':
                raw = svc.regenerate_link(a, int(request.data.get('expires_days', svc.DEFAULT_LINK_DAYS)), user=request.user)
                email_result = None
                if request.data.get('send_email'):
                    send_ok, send_msg = svc.send_vendor_allocation_email(a, raw, request)
                    email_result = {'sent': send_ok, 'message': send_msg}
                return Response({'success': True, 'message': 'Đã cấp link mới, link cũ không còn dùng được.' + (f' ({email_result["message"]})' if email_result else ''),
                                 'link': _link(request, raw), 'data': svc.allocation_summary(a, request), 'email': email_result})
            if action == 'send_email':
                raw = svc.regenerate_link(a, int(request.data.get('expires_days', svc.DEFAULT_LINK_DAYS)), user=request.user)
                send_ok, send_msg = svc.send_vendor_allocation_email(a, raw, request)
                return Response({'success': send_ok, 'message': send_msg, 'link': _link(request, raw), 'data': svc.allocation_summary(a, request)})
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
        return Response({'success': True, 'message': 'Đã cập nhật phiếu chia cont.', 'data': svc.allocation_summary(a, request)})

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
        return Response({'success': True, **out, 'data': {**svc.allocation_summary(a, request), 'rows': svc.rows_for(a, for_vendor=False)}})


# ---------- cổng nhà xe (công khai bằng token) ----------
def _portal_payload(alloc, request, session_pair=None):
    b = alloc.booking
    co = CompanyProfile.get_default_company()
    notes = svc.effective_notes(b)
    sess_info = None
    if session_pair:
        acct, _sess, rem = session_pair
        sess_info = {
            'authenticated': True,
            'username': acct.username,
            'idle_timeout_minutes': acct.idle_timeout_minutes,
            'remaining_idle_seconds': rem,
        }
    return {
        'company_name': co.short_name or co.company_name,
        'alloc_id': alloc.id,
        'subcontractor': alloc.subcontractor.short_name or alloc.subcontractor.name,
        'subcontractor_code': alloc.subcontractor.code or '',
        'requires_auth': svc.subcontractor_requires_portal_auth(alloc.subcontractor),
        'session': sess_info,
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


class _VendorAuthRejected(APIException):
    def __init__(self, message, auth_code='vendor_auth_required', http_status=status.HTTP_401_UNAUTHORIZED):
        self.status_code = http_status
        self.detail = {'detail': message, 'code': auth_code}
        self.default_code = auth_code


def _require_vendor_session(request, expected_sub_id=None):
    passive = request.META.get('HTTP_X_VENDOR_PASSIVE_POLL') == '1'
    pair, st = svc.vendor_session_state(request, touch=not passive)
    if not pair:
        if st == 'idle_expired':
            raise _VendorAuthRejected(
                'Phiên làm việc đã tự động đăng xuất do lâu không thao tác. Vui lòng đăng nhập lại.',
                auth_code='vendor_session_idle',
                http_status=status.HTTP_401_UNAUTHORIZED,
            )
        raise _VendorAuthRejected(
            'Vui lòng đăng nhập tài khoản Cổng Nhà Xe để truy cập.',
            auth_code='vendor_auth_required',
            http_status=status.HTTP_401_UNAUTHORIZED,
        )
    if expected_sub_id and pair[0].subcontractor_id != expected_sub_id:
        raise _VendorAuthRejected(
            'Tài khoản nhà xe hiện tại không có quyền truy cập dữ liệu của nhà xe khác.',
            auth_code='vendor_forbidden',
            http_status=status.HTTP_403_FORBIDDEN,
        )
    return pair


def _no_store(payload, http_status=status.HTTP_200_OK):
    resp = Response(payload, status=http_status)
    resp['Cache-Control'] = 'no-store'
    return resp


def _portal_response(alloc, request, extra=None, session_pair=None):
    return _no_store({'success': True, **(extra or {}), 'data': _portal_payload(alloc, request, session_pair=session_pair)})


class VendorPortalAPIView(APIView):
    """GET: bảng N dòng của phiếu. PUT: nhà xe lưu các dòng xe/tài/cont. DELETE: hủy gán xe dòng READY."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def _alloc(self, request, token):
        if not has_feature('vendor_portal', request):
            raise Http404
        alloc = svc.allocation_by_token(token)
        if not alloc or svc.lifecycle(alloc)['closed']:
            raise Http404  # lệnh đã hoàn tất quá số ngày chỉ-xem: link tự đóng
        if svc.subcontractor_requires_portal_auth(alloc.subcontractor):
            self._vendor_pair = _require_vendor_session(request, expected_sub_id=alloc.subcontractor_id)
        else:
            pair, _st = svc.vendor_session_state(request, touch=False)
            if pair and pair[0].subcontractor_id != alloc.subcontractor_id:
                raise _VendorAuthRejected(
                    'Phiên đăng nhập hiện tại thuộc nhà xe khác. Vui lòng đăng xuất trước khi mở liên kết này.',
                    http_status=status.HTTP_403_FORBIDDEN,
                    auth_code='vendor_wrong_subcontractor',
                )
            self._vendor_pair = pair
        return alloc

    def get(self, request, token):
        alloc = self._alloc(request, token)
        alloc.last_opened_at = timezone.now()
        alloc.save(update_fields=['last_opened_at'])
        return _portal_response(alloc, request, session_pair=getattr(self, '_vendor_pair', None))

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
        return _portal_response(alloc, request, extra=out, session_pair=getattr(self, '_vendor_pair', None))

    def delete(self, request, token):
        alloc = self._alloc(request, token)
        line_no = request.data.get('line_no') or request.query_params.get('line_no')
        try:
            out = svc.clear_row(alloc, line_no, source='vendor')
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        alloc.refresh_from_db()
        return _portal_response(alloc, request, extra=out, session_pair=getattr(self, '_vendor_pair', None))


class VendorPortalCatalogAPIView(VendorPortalAPIView):
    """GET/POST/PUT/DELETE: danh mục Đầu kéo, Rơ-moóc, Tài xế thuộc riêng nhà xe để chọn từ droplist hoặc quản lý (thêm/sửa/xóa)."""

    def get(self, request, token):
        alloc = self._alloc(request, token)
        return _no_store({'success': True, 'data': svc.vendor_catalog(alloc.subcontractor)})

    def post(self, request, token):
        alloc = self._alloc(request, token)
        action = str(request.data.get('action') or '').strip().lower()
        try:
            if action == 'delete':
                out = svc.delete_subcontractor_catalog_item(alloc.subcontractor, request.data)
                return _no_store({'success': True, 'data': out['catalog']})
            elif action == 'update' or request.data.get('id'):
                out = svc.update_subcontractor_catalog_item(alloc.subcontractor, request.data)
                return _no_store({'success': True, 'item': out.get('item'), 'data': out['catalog']})
            out = svc.add_vendor_catalog_item(alloc, request.data)
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        return _no_store({'success': True, 'item': out.get('item'), 'data': out['catalog']}, http_status=status.HTTP_201_CREATED)

    def put(self, request, token):
        alloc = self._alloc(request, token)
        try:
            out = svc.update_subcontractor_catalog_item(alloc.subcontractor, request.data)
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        return _no_store({'success': True, 'item': out.get('item'), 'data': out['catalog']})

    def delete(self, request, token):
        alloc = self._alloc(request, token)
        try:
            out = svc.delete_subcontractor_catalog_item(alloc.subcontractor, request.data)
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        return _no_store({'success': True, 'data': out['catalog']})


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
        return _portal_response(alloc, request, extra=out, session_pair=getattr(self, '_vendor_pair', None))


# ---------- Xác thực & Workspace Desktop riêng cho Nhà Xe ----------
class _VendorPublicAPIView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


class VendorPortalAuthStatusAPIView(_VendorPublicAPIView):
    """GET: kiểm tra trạng thái phiên đăng nhập Portal Nhà Xe và chế độ xác thực của token (nếu có)."""

    def get(self, request):
        if not has_feature('vendor_portal', request):
            raise Http404
        pair, st = svc.vendor_session_state(request, touch=False)
        token = (request.query_params.get('token') or '').strip()
        alloc_hint = None
        if token:
            alloc = svc.allocation_by_token(token)
            if not alloc or svc.lifecycle(alloc)['closed']:
                return _no_store({
                    'success': False, 'token_invalid': True,
                    'authenticated': bool(pair), 'idle_expired': st == 'idle_expired',
                    'message': 'Liên kết lệnh điều vận không tồn tại, đã thu hồi hoặc đã hết hạn lưu trữ.',
                }, http_status=status.HTTP_404_NOT_FOUND)
            req_auth = svc.subcontractor_requires_portal_auth(alloc.subcontractor)
            alloc_hint = {
                'alloc_id': alloc.id,
                'booking_code': alloc.booking.booking_code,
                'subcontractor': alloc.subcontractor.short_name or alloc.subcontractor.name,
                'subcontractor_code': alloc.subcontractor.code or '',
                'requires_auth': req_auth,
                'wrong_account': bool(pair and pair[0].subcontractor_id != alloc.subcontractor_id),
            }
        sess_data = None
        if pair:
            acct, _sess, rem = pair
            sess_data = {
                'username': acct.username,
                'subcontractor_id': acct.subcontractor_id,
                'subcontractor': acct.subcontractor.short_name or acct.subcontractor.name,
                'subcontractor_code': acct.subcontractor.code or '',
                'idle_timeout_minutes': acct.idle_timeout_minutes,
                'remaining_idle_seconds': rem,
            }
        return _no_store({
            'success': True,
            'authenticated': bool(pair),
            'idle_expired': st == 'idle_expired',
            'session': sess_data,
            'token_hint': alloc_hint,
        })


class VendorPortalLoginAPIView(_VendorPublicAPIView):
    """POST: đăng nhập Portal Nhà Xe (Username + Password + Token xác nhận)."""

    def post(self, request):
        if not has_feature('vendor_portal', request):
            raise Http404
        try:
            out = svc.vendor_login(
                request,
                request.data.get('username'),
                request.data.get('password'),
                request.data.get('confirm_token') or request.data.get('token') or '',
            )
        except ValidationError as exc:
            if getattr(exc, 'code', None) == 'vendor_account_locked':
                msg = _msg(exc)
                return _no_store({
                    'success': False,
                    'message': msg,
                    'error': msg,
                    'details': {'detail': msg, 'code': 'vendor_account_locked'},
                }, http_status=status.HTTP_403_FORBIDDEN)
            return _err(_msg(exc), status.HTTP_401_UNAUTHORIZED)
        return _no_store({'success': True, 'data': out})


class VendorPortalLogoutAPIView(_VendorPublicAPIView):
    """POST: đăng xuất phiên Portal Nhà Xe."""

    def post(self, request):
        svc.vendor_logout(request)
        return _no_store({'success': True, 'message': 'Đã đăng xuất khỏi Cổng Nhà Xe.'})


class VendorPortalHeartbeatAPIView(_VendorPublicAPIView):
    """POST: ghi nhận thao tác thực tế của nhà xe để gia hạn thời gian nhàn rỗi."""

    def post(self, request):
        if not has_feature('vendor_portal', request):
            raise Http404
        acct, _sess, rem = _require_vendor_session(request)
        return _no_store({
            'success': True,
            'data': {
                'idle_timeout_minutes': acct.idle_timeout_minutes,
                'remaining_idle_seconds': rem,
            },
        })


class _VendorWorkspaceBase(_VendorPublicAPIView):
    """Base API yêu cầu phiên _vendor_auth hợp lệ và khóa chặt dữ liệu theo đúng subcontractor_id."""

    def _vendor(self, request):
        if not has_feature('vendor_portal', request):
            raise Http404
        pair = _require_vendor_session(request)
        self._vendor_pair = pair
        return pair[0].subcontractor

    def _vendor_alloc(self, request, alloc_id):
        sub = self._vendor(request)
        alloc = (
            BookingVendorAllocation.objects
            .select_related('booking', 'booking__customer', 'subcontractor')
            .filter(pk=alloc_id, subcontractor=sub, is_deleted=False)
            .exclude(status=AllocationStatus.REVOKED)
            .first()
        )
        if not alloc or svc.lifecycle(alloc)['closed']:
            raise Http404
        return alloc


class VendorWorkspaceOverviewAPIView(_VendorWorkspaceBase):
    """GET: tổng quan KPI & danh sách các lệnh phân bổ thuộc chính nhà xe đang đăng nhập."""

    def get(self, request):
        sub = self._vendor(request)
        acct, _sess, rem = self._vendor_pair
        data = svc.vendor_overview(sub)
        data['session'] = {
            'authenticated': True,
            'username': acct.username,
            'idle_timeout_minutes': acct.idle_timeout_minutes,
            'remaining_idle_seconds': rem,
        }
        return _no_store({'success': True, 'data': data})


class VendorWorkspaceAllocationAPIView(_VendorWorkspaceBase):
    """GET/PUT/DELETE trên 1 phiếu phân bổ thuộc chính nhà xe đang đăng nhập."""

    def get(self, request, alloc_id):
        alloc = self._vendor_alloc(request, alloc_id)
        alloc.last_opened_at = timezone.now()
        alloc.save(update_fields=['last_opened_at'])
        return _portal_response(alloc, request, session_pair=self._vendor_pair)

    def put(self, request, alloc_id):
        alloc = self._vendor_alloc(request, alloc_id)
        rows = request.data.get('rows')
        if not isinstance(rows, list) or len(rows) > 200:
            return _err('Danh sách dòng không hợp lệ.')
        try:
            out = svc.submit_rows(alloc, rows, source='vendor')
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        alloc.refresh_from_db()
        return _portal_response(alloc, request, extra=out, session_pair=self._vendor_pair)

    def delete(self, request, alloc_id):
        alloc = self._vendor_alloc(request, alloc_id)
        line_no = request.data.get('line_no') or request.query_params.get('line_no')
        try:
            out = svc.clear_row(alloc, line_no, source='vendor')
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        alloc.refresh_from_db()
        return _portal_response(alloc, request, extra=out, session_pair=self._vendor_pair)


class VendorWorkspaceExcelAPIView(_VendorWorkspaceBase):
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request, alloc_id):
        from apps.gss import vendor_excel
        alloc = self._vendor_alloc(request, alloc_id)
        return vendor_excel.template_response(alloc, svc.rows_for(alloc))

    def post(self, request, alloc_id):
        from apps.gss import vendor_excel
        alloc = self._vendor_alloc(request, alloc_id)
        f = request.FILES.get('file')
        if not f or f.size > 2 * 1024 * 1024:
            return _err('Chọn file Excel (.xlsx) dưới 2MB.')
        try:
            rows = vendor_excel.read_rows(alloc, f)
            out = svc.submit_rows(alloc, rows, source='vendor')
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        alloc.refresh_from_db()
        return _portal_response(alloc, request, extra=out, session_pair=self._vendor_pair)


class VendorWorkspaceCatalogAPIView(_VendorWorkspaceBase):
    """GET/POST/PUT/DELETE: danh mục Đầu kéo, Rơ-moóc, Tài xế thuộc riêng nhà xe đang đăng nhập."""

    def get(self, request):
        sub = self._vendor(request)
        return _no_store({'success': True, 'data': svc.vendor_catalog(sub)})

    def post(self, request):
        sub = self._vendor(request)
        action = str(request.data.get('action') or '').strip().lower()
        try:
            if action == 'delete':
                out = svc.delete_subcontractor_catalog_item(sub, request.data)
                return _no_store({'success': True, 'data': out['catalog']})
            elif action == 'update' or request.data.get('id'):
                out = svc.update_subcontractor_catalog_item(sub, request.data)
                return _no_store({'success': True, 'item': out.get('item'), 'data': out['catalog']})
            out = svc.upsert_subcontractor_catalog_item(sub, request.data)
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        return _no_store({'success': True, 'item': out.get('item'), 'data': out['catalog']}, http_status=status.HTTP_201_CREATED)

    def put(self, request):
        sub = self._vendor(request)
        try:
            out = svc.update_subcontractor_catalog_item(sub, request.data)
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        return _no_store({'success': True, 'item': out.get('item'), 'data': out['catalog']})

    def delete(self, request):
        sub = self._vendor(request)
        try:
            out = svc.delete_subcontractor_catalog_item(sub, request.data)
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)
        return _no_store({'success': True, 'data': out['catalog']})


class VendorWorkspaceTrackingAPIView(_VendorWorkspaceBase):
    """GET: theo dõi hành trình 7 chặng & nhật ký sự kiện của các xe thuộc chính nhà xe đang đăng nhập."""

    def get(self, request):
        sub = self._vendor(request)
        raw_alloc = request.query_params.get('alloc_id')
        alloc_id = int(raw_alloc) if raw_alloc and str(raw_alloc).isdigit() else None
        acct, _sess, rem = self._vendor_pair
        return _no_store({
            'success': True,
            'data': svc.vendor_tracking_rows(sub, alloc_id=alloc_id),
            'session': {
                'idle_timeout_minutes': acct.idle_timeout_minutes,
                'remaining_idle_seconds': rem,
            },
        })


class VendorPortalAccountAdminAPIView(APIView):
    """GET/POST/PUT: Điều vận / Admin GSS cấp và quản lý tài khoản Portal cho từng nhà xe."""
    permission_classes = [IsDispatcher]

    def _sub(self, pk):
        sub = Subcontractor.objects.filter(pk=pk, is_deleted=False).first()
        if not sub:
            raise Http404
        return sub

    def get(self, request, pk):
        from apps.master_data.models import SubcontractorPortalAccount
        sub = self._sub(pk)
        acct = SubcontractorPortalAccount.objects.filter(subcontractor=sub, is_deleted=False).first()
        if not acct:
            return Response({'success': True, 'data': {'has_account': False, 'suggested_username': (sub.code or f'vendor{sub.id}').lower(), 'idle_timeout_minutes': 15}})
        return Response({'success': True, 'data': {
            'has_account': True,
            'username': acct.username,
            'confirm_token_preview': acct.confirm_token_preview,
            'idle_timeout_minutes': acct.idle_timeout_minutes,
            'is_active': acct.is_active,
            'locked': bool(acct.locked_until and acct.locked_until > timezone.now()),
            'locked_until': acct.locked_until.isoformat() if acct.locked_until else None,
            'last_login_at': acct.last_login_at.isoformat() if acct.last_login_at else None,
            'notes': acct.notes,
        }})

    def post(self, request, pk):
        sub = self._sub(pk)
        try:
            data = svc.provision_portal_account(sub, request.data, user=request.user)
        except ValidationError as exc:
            return _err(_msg(exc))
        return Response({'success': True, 'message': f'Đã cập nhật tài khoản Cổng Nhà Xe cho {sub.short_name or sub.name}.', 'data': data})

    put = post


class VendorContainersMonitoringAPIView(APIView):
    """
    GET: API Giam sat Ma tran Tung Container va Phan Bo Vendor (Tab 2 Dieu Van).
    Tra ve danh sach tat ca container thuoc cac Booking/Lenh dieu dong, tinh trang gan xe, ma VC va hanh trinh.
    """
    permission_classes = [IsDispatcher]

    def get(self, request):
        from apps.gss.models import BookingContainer
        from django.db.models import Q

        qs = (
            BookingContainer.objects.filter(is_deleted=False)
            .select_related(
                'booking', 'booking__customer', 'allocation', 'allocation__subcontractor',
                'trip', 'trip__vehicle', 'trip__trailer', 'trip__driver'
            )
            .order_by('-booking_id', 'line_no')
        )

        vendor_id = request.query_params.get('vendor_id')
        if vendor_id and str(vendor_id).isdigit():
            qs = qs.filter(allocation__subcontractor_id=int(vendor_id))

        booking_id = request.query_params.get('booking_id')
        if booking_id and str(booking_id).isdigit():
            qs = qs.filter(booking_id=int(booking_id))

        status_filter = request.query_params.get('status')
        q_term = (request.query_params.get('q') or '').strip().lower()

        rows = []
        stats = {
            'total': 0,
            'unassigned': 0,
            'waiting_vehicle': 0,
            'assigned': 0,
            'in_transit': 0,
            'completed': 0,
        }

        for c in qs:
            b = c.booking
            alloc = c.allocation
            sub = alloc.subcontractor if alloc else None
            t = c.trip

            if not alloc or not sub:
                st_code = 'UNASSIGNED'
                st_label = 'Chưa phân bổ Nhà xe'
                st_color = 'rose'
                stats['unassigned'] += 1
            elif not t or not (t.vehicle or t.subcontractor_driver_name or t.driver):
                st_code = 'WAITING_VEHICLE'
                st_label = f'Chờ {sub.short_name or sub.name} gán xe'
                st_color = 'amber'
                stats['waiting_vehicle'] += 1
            elif t.step_status in ('EMPTY_RETURNED',) or t.status in ('COMPLETED', 'DELIVERED'):
                st_code = 'COMPLETED'
                st_label = 'Đã hoàn thành / Hạ rỗng'
                st_color = 'slate'
                stats['completed'] += 1
            elif t.step_status in ('EMPTY_RETURNING',):
                st_code = 'EMPTY_RETURNING'
                st_label = 'Đang hạ bãi rỗng'
                st_color = 'purple'
                stats['in_transit'] += 1
            elif t.step_status in ('EN_ROUTE_PICKUP', 'LOADED_ON_VEHICLE', 'EN_ROUTE_DELIVERY', 'ARRIVED_AT_DELIVERY', 'UNLOADED'):
                st_code = 'IN_TRANSIT'
                st_label = 'Đang trên tuyến (Đang chạy)'
                st_color = 'emerald'
                stats['in_transit'] += 1
            else:
                st_code = 'ASSIGNED'
                st_label = 'Đã gán xe (Chờ chạy)'
                st_color = 'blue'
                stats['assigned'] += 1

            stats['total'] += 1

            if status_filter and status_filter != 'ALL':
                if status_filter == 'UNASSIGNED' and st_code != 'UNASSIGNED':
                    continue
                elif status_filter == 'WAITING_VEHICLE' and st_code != 'WAITING_VEHICLE':
                    continue
                elif status_filter == 'ASSIGNED' and st_code != 'ASSIGNED':
                    continue
                elif status_filter == 'IN_TRANSIT' and st_code not in ('IN_TRANSIT', 'EMPTY_RETURNING'):
                    continue
                elif status_filter == 'COMPLETED' and st_code != 'COMPLETED':
                    continue

            # Tra cứu thông tin xe & tài xế
            tractor = t.vehicle.license_plate if (t and t.vehicle) else ((t.draft_rows or {}).get('tractor_plate') if t else '')
            trailer = t.trailer.license_plate if (t and t.trailer) else (t.trailer_plate_text if t else '')
            driver = t.driver.full_name if (t and t.driver) else (t.subcontractor_driver_name if t else '')
            phone = t.driver.phone if (t and t.driver) else (t.subcontractor_driver_phone if t else '')

            is_full_alloc = (b.total_containers or 0) > 0 and (b.containers.filter(allocation__isnull=False, is_deleted=False).count() >= (b.total_containers or 0))
            dispatch_code = f"LDD.{b.booking_code}" if is_full_alloc else b.booking_code

            # Tìm kiếm từ khóa nếu có
            search_str = f"{c.container_number} {c.seal_number or ''} {b.booking_code} {dispatch_code} {b.booking_number or ''} {sub.name if sub else ''} {sub.short_name if sub else ''} {tractor} {trailer} {driver} {phone}".lower()
            if q_term and q_term not in search_str:
                continue

            raw_tok = (alloc.draft_rows or {}).get('_raw_token') if alloc else None

            rows.append({
                'id': c.id,
                'line_no': c.line_no,
                'container_number': c.container_number,
                'container_type': c.container_type or '40HC',
                'seal_number': c.seal_number or '--',
                'gross_weight_kg': int(c.gross_weight_kg) if c.gross_weight_kg is not None else None,
                'booking_id': b.id,
                'booking_code': b.booking_code,
                'booking_number': b.booking_number or '',
                'dispatch_order_code': dispatch_code,
                'is_full_dispatched': is_full_alloc,
                'customer_name': b.customer.short_name or b.customer.name if b.customer else 'Khách hàng',
                'pickup_location': b.pickup_location or 'Cảng/Depot',
                'delivery_location': b.delivery_location or 'Kho khách',
                'dropoff_location': b.dropoff_location or 'Depot hạ rỗng',
                'vendor_id': sub.id if sub else None,
                'vendor_name': sub.name if sub else 'Chưa phân bổ',
                'vendor_short': sub.short_name if sub else (sub.name if sub else 'Chưa phân bổ'),
                'vendor_code': sub.code if sub else '',
                'allocation_id': alloc.id if alloc else None,
                'portal_token': raw_tok,
                'trip_id': t.id if t else None,
                'trip_code': t.trip_code if t else None,
                'step_status': t.step_status if t else None,
                'step_status_display': t.get_step_status_display() if (t and hasattr(t, 'get_step_status_display')) else (t.step_status if t else ''),
                'tractor_plate': tractor or '--',
                'trailer_plate': trailer or '--',
                'driver_name': driver or '--',
                'driver_phone': phone or '--',
                'status_code': st_code,
                'status_label': st_label,
                'status_color': st_color,
                'dem_free_days': b.free_time_demurrage or 7,
                'det_free_days': b.free_time_detention or 7,
                'notes': c.notes or '',
            })

        return Response({
            'success': True,
            'stats': stats,
            'total_rows': len(rows),
            'data': rows,
        })



class VendorPortalStepAPIView(VendorPortalAPIView):
    """POST: Điều độ nhà xe (truy cập qua link token) cập nhật tiến trình chặng giúp tài xế."""

    def post(self, request, token):
        alloc = self._alloc(request, token)
        line_no = request.data.get('line_no')
        target = (request.data.get('to') or '').strip()
        reason = (request.data.get('reason') or '').strip() or 'Điều độ nhà xe cập nhật tiến trình giúp tài xế'
        fields = request.data.get('fields') or {}

        if not line_no or not target:
            return _err('Thiếu số dòng (line_no) hoặc bước đích (to).')

        trip = alloc.trips.select_for_update().filter(is_deleted=False, vendor_line_no=int(line_no)).exclude(step_status='CANCELLED').first()
        if not trip:
            return _err(f'Không tìm thấy chuyến xe hợp lệ tại dòng #{line_no}.')

        from apps.dispatch import gss_workflow as wf
        try:
            actor = 'Điều độ nhà xe'
            if getattr(self, '_vendor_pair', None) and self._vendor_pair[0]:
                actor = f'Điều độ {self._vendor_pair[0].username}'
            trip = wf.advance(trip, target, user=request.user, actor_label=actor, reason=reason, fields=fields, by_vendor=True)
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)

        alloc.refresh_from_db()
        return _portal_response(alloc, request, extra={'message': f'Đã cập nhật sang chặng: {wf.STEP_LABELS.get(trip.step_status, trip.step_status)}.'}, session_pair=getattr(self, '_vendor_pair', None))


class VendorWorkspaceStepAPIView(_VendorWorkspaceBase):
    """POST: Điều độ nhà xe (đăng nhập tài khoản) cập nhật tiến trình chặng giúp tài xế."""

    def post(self, request, alloc_id):
        alloc = self._vendor_alloc(request, alloc_id)
        line_no = request.data.get('line_no')
        target = (request.data.get('to') or '').strip()
        reason = (request.data.get('reason') or '').strip() or 'Điều độ nhà xe cập nhật tiến trình giúp tài xế'
        fields = request.data.get('fields') or {}

        if not line_no or not target:
            return _err('Thiếu số dòng (line_no) hoặc bước đích (to).')

        trip = alloc.trips.select_for_update().filter(is_deleted=False, vendor_line_no=int(line_no)).exclude(step_status='CANCELLED').first()
        if not trip:
            return _err(f'Không tìm thấy chuyến xe hợp lệ tại dòng #{line_no}.')

        from apps.dispatch import gss_workflow as wf
        try:
            acct, _, _ = self._vendor_pair
            actor = f'Điều độ {acct.username}' if acct else 'Điều độ nhà xe'
            trip = wf.advance(trip, target, user=request.user, actor_label=actor, reason=reason, fields=fields, by_vendor=True)
        except ValidationError as exc:
            return _err(_msg(exc), status.HTTP_409_CONFLICT)

        alloc.refresh_from_db()
        return _portal_response(alloc, request, extra={'message': f'Đã cập nhật sang chặng: {wf.STEP_LABELS.get(trip.step_status, trip.step_status)}.'}, session_pair=self._vendor_pair)
