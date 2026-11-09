"""API điều vận GSS cho nhân viên: dashboard nhà xe, danh sách/chi tiết dòng điều vận, đổi bước, chứng từ,
gửi tin tài xế, biên bản POD, kiện hàng lẻ có Seal và tem QR."""
from html import escape

from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from django.http import Http404, HttpResponse

from apps.customers.dem_det import describe
from apps.dispatch import gss_attachments as att
from apps.dispatch import gss_dashboard as dash
from apps.dispatch import gss_messages as msg
from core import messaging
from apps.dispatch import gss_workflow as wf
from apps.dispatch.models import DispatchTrip
from apps.master_data.models import CompanyProfile
from apps.qr_tracking import service as qr
from core import qr_tokens
from ._common import *  # noqa: F401,F403


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'message': message}, status=code)


def vmsg(exc):
    return ' '.join(exc.messages)


def get_trip(code):
    trip = DispatchTrip.objects.select_related('customer', 'vehicle', 'trailer', 'subcontractor', 'booking_order', 'driver', 'vendor_allocation') \
        .filter(trip_code=code, is_deleted=False).first()
    if not trip:
        raise Http404
    return trip


def base_url(request):
    return request.build_absolute_uri('/')


def trip_row(t, warn=None):
    """Một dòng điều vận ở dạng JSON. Dùng chung cho danh sách và chi tiết."""
    warn = CompanyProfile.get_default_company().warn_days if warn is None else warn
    after_load = t.step_status in dash.AFTER_LOAD
    docs = {s: getattr(t, f'n_{s.lower()}', None) for s in wf.STAGE_LABELS}
    if any(v is None for v in docs.values()):
        docs = att.counts(t)
    return {
        'trip_code': t.trip_code, 'booking_code': t.booking_order.booking_code if t.booking_order_id else '',
        'line_no': t.vendor_line_no, 'vendor_id': t.subcontractor_id,
        'vendor': (t.subcontractor.short_name or t.subcontractor.name) if t.subcontractor_id else '',
        'customer': t.customer.name, 'customer_short': t.customer.short_name or t.customer.name, 'container_number': t.container_number, 'container_number_2': t.container_number_2 or '', 'return_container_number': t.return_container_number,
        'swapped': t.is_container_swapped, 'swap_label': wf.swap_label(t), 'swap_reason': t.container_swap_reason,
        'seal_number': '' if t.seal_number == '-' else t.seal_number, 'container_type': t.container_type,
        'tractor_plate': t.vehicle.license_plate if t.vehicle_id else '',
        'trailer_plate': (t.trailer.license_plate if t.trailer_id else t.trailer_plate_text) or '',
        'driver_name': t.subcontractor_driver_name, 'driver_phone': t.subcontractor_driver_phone,
        'step': t.step_status, 'step_label': wf.STEP_LABELS.get(t.step_status, t.step_status),
        'docs': docs, 'pickup_location': t.pickup_location, 'delivery_location': t.warehouse_location, 'dropoff_location': t.dropoff_location,
        'dem': describe(t.dem_expiry_date, warn, done=after_load or t.step_status == 'CANCELLED'),
        'det': describe(t.det_expiry_date, warn, done=t.step_status in ('EMPTY_RETURNED', 'CANCELLED')),
        'created_at': t.created_at.isoformat(),
    }


def annotated(qs):
    ann = {f'n_{s.lower()}': Count('documents', filter=Q(documents__workflow_stage=s, documents__is_deleted=False) & ~Q(documents__file_path=''), distinct=True)
           for s in wf.STAGE_LABELS}
    return qs.annotate(**ann)


class GssDashboardAPIView(APIView):
    permission_classes = [IsDispatcher]

    def get(self, request):
        return Response({'success': True, 'data': dash.dashboard()})


class GssTripListAPIView(APIView):
    permission_classes = [IsDispatcher]
    LIMIT = 300

    def get(self, request):
        metric = request.query_params.get('metric', 'all')
        vendor = request.query_params.get('vendor')
        if metric == 'pending':
            return self._pending(vendor)
        if metric != 'all' and metric not in dash.METRICS:
            return err('Chỉ số không hợp lệ.')
        try:
            vendor_id = int(vendor) if vendor else None
        except ValueError:
            return err('Nhà xe không hợp lệ.')
        qs = annotated(dash.trips_for(vendor_id, metric, search=(request.query_params.get('q') or '').strip(),
                                      step=request.query_params.get('step', ''))).order_by('-created_at')
        total = qs.count()
        warn = CompanyProfile.get_default_company().warn_days
        return Response({'success': True, 'total': total, 'truncated': total > self.LIMIT,
                         'results': [trip_row(t, warn) for t in qs[:self.LIMIT]]})

    def _pending(self, vendor):
        from apps.dispatch.models import AllocationStatus, BookingVendorAllocation
        qs = BookingVendorAllocation.objects.filter(is_deleted=False).exclude(status=AllocationStatus.REVOKED).select_related('booking', 'subcontractor')
        if vendor:
            qs = qs.filter(subcontractor_id=vendor)
        rows = []
        for a in qs:
            filled = a.trips.filter(is_deleted=False).count()
            if filled < a.allocated_containers:
                rows.append({'allocation_id': a.id, 'booking_code': a.booking.booking_code, 'vendor': a.subcontractor.short_name or a.subcontractor.name,
                             'missing': a.allocated_containers - filled, 'allocated': a.allocated_containers})
        return Response({'success': True, 'pending': rows, 'results': []})


class GssTripDetailAPIView(APIView):
    permission_classes = [IsDispatcher]

    def get(self, request, code):
        t = get_trip(code)
        row = trip_row(t)
        return Response({'success': True, 'data': {
            **row, 'steps': [{'key': s, 'label': wf.STEP_LABELS[s], 'at': (getattr(t, wf.TIMESTAMP_FIELD[s]).isoformat() if s in wf.TIMESTAMP_FIELD and getattr(t, wf.TIMESTAMP_FIELD[s]) else None)} for s in wf.STEPS],
            'action': wf.available_action(t), 'attachments': att.list_attachments(t), 'max_files': wf.MAX_FILES_PER_STAGE,
            'packages': [qr.serialize(p) for p in t.packages.filter(is_deleted=False)], 'package_summary': qr.summary(t),
            'messages': [msg.serialize_log(m) for m in t.driver_messages.all()[:20]],
            'qr_url': msg.trip_link(t, base_url(request)),
            'events': [{'title': e.title, 'at': e.event_time.isoformat(), 'by': e.metadata.get('by', ''), 'note': e.description or ''}
                       for e in t.event_logs.order_by('-event_time')[:30]],
            **dash_notes(t)}})


def dash_notes(t):
    from apps.dispatch.vendor_service import effective_notes
    return effective_notes(t.booking_order) if t.booking_order_id else {'destination_notes': '', 'road_restrictions': ''}


class GssTripStepAPIView(APIView):
    permission_classes = [IsDispatcher]

    def post(self, request, code):
        t = get_trip(code)
        d = request.data
        try:
            if d.get('cancel'):
                t = wf.cancel(t, user=request.user, reason=d.get('reason'))
            else:
                t = wf.advance(t, d.get('to'), user=request.user, reason=d.get('reason') or '', fields=d.get('fields') or {},
                               swap=d.get('swap') or None, force=bool(d.get('force')))
        except ValidationError as exc:
            return err(vmsg(exc))
        t = get_trip(code)
        return Response({'success': True, 'message': f'Đã chuyển sang: {wf.STEP_LABELS[t.step_status]}.',
                         'data': trip_row(t), 'action': wf.available_action(t), 'warning': getattr(t, '_swap_warning', None)})


class GssTripAttachmentsAPIView(APIView):
    permission_classes = [IsDispatcher]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request, code):
        t = get_trip(code)
        return Response({'success': True, 'attachments': att.list_attachments(t), 'counts': att.counts(t), 'max_files': wf.MAX_FILES_PER_STAGE})

    def post(self, request, code):
        t = get_trip(code)
        try:
            docs = att.add_attachments(t, request.data.get('stage'), request.FILES.getlist('files'), label=request.user.get_username(), staff=True)
        except ValidationError as exc:
            return err(vmsg(exc))
        return Response({'success': True, 'message': f'Đã tải lên {len(docs)} file.', 'attachments': att.list_attachments(t), 'counts': att.counts(t)},
                        status=status.HTTP_201_CREATED)


class GssTripAttachmentDetailAPIView(APIView):
    permission_classes = [IsDispatcher]

    def delete(self, request, code, doc_id):
        t = get_trip(code)
        try:
            att.remove_attachment(t, doc_id, user=request.user, reason=request.data.get('reason'))
        except ValidationError as exc:
            return err(vmsg(exc))
        return Response({'success': True, 'attachments': att.list_attachments(t), 'counts': att.counts(t)})


class GssTripMessageAPIView(APIView):
    """GET: soạn bản tin + danh sách đã gửi. POST: ghi nhận đã gửi (kênh, nội dung)."""
    permission_classes = [IsDispatcher]

    def get(self, request, code):
        t = get_trip(code)
        return Response({'success': True, 'content': msg.compose_message(t, base_url(request)), 'zalo_url': msg.zalo_url(t.subcontractor_driver_phone),
                         'phone': t.subcontractor_driver_phone, 'can_send': messaging.is_enabled(), 'history': [msg.serialize_log(m) for m in t.driver_messages.all()[:20]]})

    def post(self, request, code):
        t = get_trip(code)
        channel = request.data.get('channel')
        if channel not in ('ZALO', 'SMS', 'PORTAL_LINK', 'COPY'):
            return err('Kênh gửi không hợp lệ.')
        if channel in ('ZALO', 'SMS') and not t.subcontractor_driver_phone:
            return err('Chưa có số điện thoại tài xế.')
        # Nội dung luôn soạn lại ở máy chủ để không bị sửa lén (kèm link đúng của chuyến)
        content = msg.compose_message(t, base_url(request))
        extra = str(request.data.get('extra') or '').strip()[:500]
        content = content + (f'\n{extra}' if extra else '')
        if request.data.get('send') in (True, 'true', '1', 1):
            if channel not in ('ZALO', 'SMS') or not messaging.is_enabled():
                return err('Chưa bật gửi tự động cho kênh này; hãy gửi tay rồi ghi nhận.')
            log = msg.send_and_log(t, channel=channel, content=content, user=request.user)
            ok = log.delivery == 'SENT'
            return Response({'success': ok, 'message': 'Đã gửi tin cho tài xế.' if ok else f'Gửi lỗi: {log.delivery_error}', 'log': msg.serialize_log(log)},
                            status=status.HTTP_201_CREATED if ok else status.HTTP_502_BAD_GATEWAY)
        log = msg.log_message(t, channel=channel, content=content, user=request.user)
        return Response({'success': True, 'message': 'Đã ghi nhận lịch sử gửi tin.', 'log': msg.serialize_log(log)}, status=status.HTTP_201_CREATED)


class GssTripPodAPIView(APIView):
    permission_classes = [IsDispatcher]

    def get(self, request, code):
        resp = HttpResponse(msg.render_pod(get_trip(code)), content_type='text/html; charset=utf-8')
        resp['Cache-Control'] = 'no-store'
        return resp


class GssTripQrAPIView(APIView):
    """Ảnh QR (SVG) của lệnh, hoặc trang tem in cho nhiều kiện."""
    permission_classes = [IsDispatcher]

    def get(self, request, code):
        t = get_trip(code)
        return HttpResponse(qr_tokens.qr_svg(msg.trip_link(t, base_url(request))), content_type='image/svg+xml')


class GssPackagesAPIView(APIView):
    permission_classes = [IsDispatcher]

    def post(self, request, code):
        t = get_trip(code)
        data = request.data
        items = data.get('items')
        if items is None and data.get('count'):  # tạo nhanh N kiện, seal điền sau theo dãy
            try:
                n = int(data['count'])
            except (TypeError, ValueError):
                return err('Số kiện không hợp lệ.')
            prefix = str(data.get('seal_prefix') or '').strip().upper()
            start = int(data.get('seal_start') or 1)
            if not prefix or not 1 <= n <= qr.MAX_PACKAGES_PER_TRIP:
                return err('Cần tiền tố seal và số kiện từ 1 đến %d.' % qr.MAX_PACKAGES_PER_TRIP)
            items = [{'seal_number': f'{prefix}{start + i}', 'recipient_name': data.get('recipient_name', '')} for i in range(n)]
        try:
            created = qr.add_packages(t, items)
        except ValidationError as exc:
            return err(vmsg(exc))
        return Response({'success': True, 'message': f'Đã thêm {len(created)} kiện.', 'packages': [qr.serialize(p) for p in t.packages.filter(is_deleted=False)],
                         'summary': qr.summary(t)}, status=status.HTTP_201_CREATED)


class GssPackageDetailAPIView(APIView):
    permission_classes = [IsDispatcher]

    def delete(self, request, pk):
        from apps.qr_tracking.models import TripPackageSeal
        pkg = TripPackageSeal.objects.select_related('trip').filter(pk=pk, is_deleted=False).first()
        if not pkg:
            raise Http404
        try:
            qr.remove_package(pkg)
        except ValidationError as exc:
            return err(vmsg(exc))
        return Response({'success': True, 'summary': qr.summary(pkg.trip)})


class GssLabelsAPIView(APIView):
    """Trang in tem QR: 1 tem lệnh + các kiện của chuyến (A4 lưới hoặc tem nhiệt)."""
    permission_classes = [IsDispatcher]

    def get(self, request, code):
        t = get_trip(code)
        base = base_url(request).rstrip('/')
        cells = [(f'LỆNH {t.trip_code}', t.container_number or 'chưa có số cont', qr_tokens.qr_svg(msg.trip_link(t, base), 5))]
        for p in t.packages.filter(is_deleted=False):
            cells.append((f'KIỆN {p.package_index}/{p.package_total} · {p.package_code}', f'Seal: {p.seal_number}',
                          qr_tokens.qr_svg(f'{base}/q/{qr.package_token(p)}/', 5)))
        body = ''.join(f'<div class="tem">{svg}<b>{escape(a)}</b><span>{escape(b)}</span></div>' for a, b, svg in cells)
        html = ('<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Tem QR ' + escape(t.trip_code) + '</title><style>'
                '@page{size:A4;margin:10mm}body{font:12px Arial,sans-serif;margin:0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}'
                '.tem{border:1px dashed #666;padding:4mm;text-align:center;break-inside:avoid}.tem svg{width:38mm;height:38mm}.tem b,.tem span{display:block}'
                '@media print{.noprint{display:none}}</style></head><body><p class="noprint"><button onclick="window.print()">In tem</button></p>'
                f'<div class="grid">{body}</div></body></html>')
        return HttpResponse(html, content_type='text/html; charset=utf-8')


class GssResolveQrAPIView(APIView):
    """Nhân viên quét QR (lệnh/kiện) -> trả về đối tượng để hiển thị và tác nghiệp."""
    permission_classes = [IsDispatcher]

    def get(self, request):
        raw = (request.query_params.get('token') or '').strip()
        token = raw.rstrip('/').rsplit('/', 1)[-1]  # chấp nhận cả URL đầy đủ lẫn token
        trip = qr.trip_by_token(token)
        if trip:
            qr.log_scan('TRIP', trip.pk, 'RESOLVE', actor_label=request.user.get_username())
            return Response({'success': True, 'type': 'TRIP', 'trip_code': trip.trip_code, 'data': trip_row(trip)})
        pkg = qr.package_by_token(token)
        if pkg:
            return Response({'success': True, 'type': 'PACKAGE', 'trip_code': pkg.trip.trip_code, 'package': qr.serialize(pkg),
                             'summary': qr.summary(pkg.trip), 'trip_step': pkg.trip.step_status})
        return err('Mã QR không hợp lệ hoặc đã bị vô hiệu hóa.', status.HTTP_404_NOT_FOUND)


class GssPackageScanAPIView(APIView):
    permission_classes = [IsDispatcher]

    def post(self, request, pk):
        from apps.qr_tracking.models import TripPackageSeal
        pkg = TripPackageSeal.objects.select_related('trip').filter(pk=pk, is_deleted=False).first()
        if not pkg:
            raise Http404
        try:
            out = qr.scan_package(pkg, request.data.get('phase'), seal_seen=request.data.get('seal_seen') or '',
                                  damaged=bool(request.data.get('damaged')), note=str(request.data.get('note') or ''),
                                  actor_label=request.user.get_username(), ip=request.META.get('REMOTE_ADDR', ''))
        except ValidationError as exc:
            return err(vmsg(exc))
        return Response({'success': True, **out})


# ---------- Mẫu biên bản giao hàng (POD) ----------
def _tpl_json(t, with_body=True):
    d = {'id': t.id, 'code': t.code, 'name': t.name, 'is_default': t.is_default, 'is_active': t.is_active,
         'customers': t.customers.filter(is_deleted=False).count()}
    if with_body:
        d.update(header_html=t.header_html, body_html=t.body_html, terms_html=t.terms_html)
    return d


class GssPodTemplatesAPIView(APIView):
    """GET: danh sách mẫu + khách hàng (để gán mẫu). POST: tạo mẫu mới (Ban giám đốc/quản trị)."""

    def get_permissions(self):
        return [IsDispatcher()] if self.request.method == 'GET' else [IsAdminOrDirector()]

    def get(self, request):
        from apps.customers.models import Customer, PodTemplate
        tpls = PodTemplate.objects.filter(is_deleted=False)
        custs = Customer.objects.filter(is_deleted=False).order_by('name')[:1000]
        return Response({'success': True, 'placeholders': sorted(msg.SAMPLE_CONTEXT), 'default_template': msg.DEFAULT_POD,
                         'templates': [_tpl_json(t) for t in tpls],
                         'customers': [{'id': c.id, 'name': c.name, 'pod_template_id': c.pod_template_id} for c in custs]})

    def post(self, request):
        return _save_tpl(request, None)


def _save_tpl(request, tpl):
    from apps.customers.models import PodTemplate
    d = request.data
    code, name = str(d.get('code') or (tpl.code if tpl else '')).strip().upper()[:40], str(d.get('name') or '').strip()[:150]
    if not code or not name or not str(d.get('body_html') or '').strip():
        return err('Cần nhập mã, tên và nội dung biên bản.')
    if PodTemplate.all_objects.filter(code=code).exclude(pk=tpl.pk if tpl else None).exists():
        return err('Mã mẫu đã tồn tại.')
    tpl = tpl or PodTemplate()
    tpl.code, tpl.name = code, name
    # Lọc ngay khi lưu: dữ liệu trong DB luôn sạch, và lọc lại lần nữa lúc in
    tpl.header_html = msg.sanitize_template_html(d.get('header_html') or '')
    tpl.body_html = msg.sanitize_template_html(d.get('body_html') or '')
    tpl.terms_html = msg.sanitize_template_html(d.get('terms_html') or '')
    tpl.is_active = bool(d.get('is_active', True))
    make_default = bool(d.get('is_default'))
    tpl.is_default = make_default
    tpl.save()
    if make_default:
        PodTemplate.objects.exclude(pk=tpl.pk).filter(is_default=True).update(is_default=False)
    return Response({'success': True, 'message': 'Đã lưu mẫu biên bản.', 'data': _tpl_json(tpl)})


class GssPodTemplateDetailAPIView(APIView):
    permission_classes = [IsAdminOrDirector]

    def _get(self, pk):
        from apps.customers.models import PodTemplate
        t = PodTemplate.objects.filter(pk=pk, is_deleted=False).first()
        if not t:
            raise Http404
        return t

    def put(self, request, pk):
        return _save_tpl(request, self._get(pk))

    def delete(self, request, pk):
        t = self._get(pk)
        if t.customers.filter(is_deleted=False).exists():
            return err('Mẫu đang được gán cho khách hàng, hãy gỡ gán trước khi xóa.')
        t.delete()
        return Response({'success': True})


class GssPodTemplatePreviewAPIView(APIView):
    permission_classes = [IsDispatcher]

    def get(self, request, pk):
        from apps.customers.models import PodTemplate
        t = PodTemplate.objects.filter(pk=pk, is_deleted=False).first()
        if not t:
            raise Http404
        resp = HttpResponse(msg.render_pod_preview(t), content_type='text/html; charset=utf-8')
        resp['Cache-Control'] = 'no-store'
        return resp


class GssCustomerPodTemplateAPIView(APIView):
    permission_classes = [IsAdminOrDirector]

    def put(self, request, pk):
        from apps.customers.models import Customer, PodTemplate
        c = Customer.objects.filter(pk=pk, is_deleted=False).first()
        if not c:
            raise Http404
        tid = request.data.get('template_id')
        tpl = None
        if tid:
            tpl = PodTemplate.objects.filter(pk=tid, is_deleted=False, is_active=True).first()
            if not tpl:
                return err('Mẫu không tồn tại hoặc đã tắt.')
        c.pod_template = tpl
        c.save(update_fields=['pod_template', 'updated_at'])
        return Response({'success': True, 'message': 'Đã cập nhật mẫu biên bản cho khách hàng.'})
