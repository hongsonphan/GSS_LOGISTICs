"""API bổ sung cho GSS: tạo chuyến thủ công, đối soát cước nhà xe, xuất Excel điều vận/bãi."""
import io

from django.core.exceptions import ValidationError
from django.http import Http404, HttpResponse
from django.utils import timezone

from apps.dispatch import gss_dashboard as dash
from apps.dispatch import gss_settlement as st
from apps.dispatch import gss_trips
from apps.dispatch.api_views.gss import annotated, err, trip_row, vmsg
from apps.dispatch.models import DispatchTrip
from core.features import has_feature
from core.permissions import IsAccountant, any_module_view
from ._common import *  # noqa: F401,F403

XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


def _xlsx(content, name):
    resp = HttpResponse(content, content_type=XLSX)
    resp['Content-Disposition'] = f'attachment; filename="{name}"'
    resp['Cache-Control'] = 'no-store'
    return resp


class GssManualTripAPIView(APIView):
    """POST: tạo chuyến thủ công (xe nhà hoặc xe nhà xe, có/không Booking)."""
    permission_classes = [IsDispatcher]

    def post(self, request):
        try:
            trip = gss_trips.create_manual_trip(request.data)
        except ValidationError as exc:
            return err(vmsg(exc))
        trip = DispatchTrip.objects.select_related('customer', 'vehicle', 'trailer', 'subcontractor', 'booking_order').get(pk=trip.pk)
        return Response({'success': True, 'message': f'Đã tạo chuyến {trip.trip_code}.', 'data': trip_row(trip)}, status=status.HTTP_201_CREATED)


class GssTripExportAPIView(APIView):
    permission_classes = [IsDispatcher]

    def get(self, request):
        metric = request.query_params.get('metric', 'all')
        if metric != 'all' and metric not in dash.METRICS:
            return err('Chỉ số không hợp lệ.')
        vendor = request.query_params.get('vendor')
        qs = annotated(dash.trips_for(int(vendor) if vendor and vendor.isdigit() else None, metric, search=(request.query_params.get('q') or '').strip(),
                                      step=request.query_params.get('step', ''))).order_by('-created_at')[:5000]
        from openpyxl import Workbook
        from core.validators import excel_safe
        wb = Workbook()
        ws = wb.active
        ws.title = 'Điều vận'
        ws.append(['Mã chuyến', 'Booking', 'Dòng', 'Nhà xe', 'Số cont', 'Cont hạ rỗng (đổi vỏ)', 'Seal', 'Xe đầu kéo', 'Rơ-moóc', 'Tài xế', 'SĐT', 'Bước hiện tại',
                   'Hạn DEM', 'Hạn DET', 'CT nhận', 'CT giao', 'CT hạ'])
        for t in qs:
            r = trip_row(t)
            ws.append([r['trip_code'], excel_safe(r['booking_code']), r['line_no'], excel_safe(r['vendor']), excel_safe(r['container_number']),
                       excel_safe(r['return_container_number'] if r['swapped'] else ''), excel_safe(r['seal_number']), excel_safe(r['tractor_plate']), excel_safe(r['trailer_plate']),
                       excel_safe(r['driver_name']), excel_safe(r['driver_phone']), r['step_label'], r['dem']['expiry'] or '', r['det']['expiry'] or '',
                       r['docs']['PICKUP'], r['docs']['DELIVERY'], r['docs']['EMPTY_RETURN']])
        buf = io.BytesIO()
        wb.save(buf)
        return _xlsx(buf.getvalue(), f'dieu-van-{timezone.localdate():%Y%m%d}.xlsx')


class _SettlementBase(APIView):
    permission_classes = [IsAccountant]
    access_actions = {'POST': 'approve', 'PUT': 'approve', 'PATCH': 'approve'}

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not has_feature('accounting', request):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Tính năng Kế toán/đối soát chưa được bật.')

    def filtered(self, request):
        q = request.query_params
        try:
            return st.queryset(int(q['vendor']) if q.get('vendor', '').isdigit() else None, q.get('status', ''),
                               st.parse_date(q.get('from'), 'Từ ngày'), st.parse_date(q.get('to'), 'Đến ngày'), (q.get('q') or '').strip())
        except ValidationError as exc:
            from rest_framework.exceptions import ValidationError as DRFError
            raise DRFError(vmsg(exc))


class GssSettlementListAPIView(_SettlementBase):
    LIMIT = 500

    def get(self, request):
        qs = self.filtered(request)
        total = qs.count()
        rows = [st.row(t) for t in qs[:self.LIMIT]]
        return Response({'success': True, 'total': total, 'truncated': total > self.LIMIT, 'results': rows, 'summary': st.summarize(rows)})


class GssSettlementExportAPIView(_SettlementBase):
    def get(self, request):
        rows = [st.row(t) for t in self.filtered(request)[:5000]]
        return _xlsx(st.export_xlsx(rows, st.summarize(rows)), f'doi-soat-nha-xe-{timezone.localdate():%Y%m%d}.xlsx')


class GssSettlementTripAPIView(_SettlementBase):
    """POST {action: update_cost|reconcile|reopen, ...} cho một chuyến."""

    def post(self, request, code):
        trip = DispatchTrip.objects.filter(trip_code=code, is_deleted=False, subcontractor__isnull=False).exclude(step_status='CANCELLED').first()
        if not trip:
            raise Http404
        d, action = request.data, request.data.get('action')
        try:
            if action == 'update_cost':
                st.update_cost(trip, d.get('cost'), d.get('advance'), d.get('notes'), request.user)
            elif action == 'reconcile':
                st.reconcile(trip, request.user, d.get('reason') or '')
            elif action == 'reopen':
                st.reopen(trip, request.user, d.get('reason') or '')
            else:
                return err('Thao tác không hợp lệ.')
        except ValidationError as exc:
            return err(vmsg(exc))
        fresh = st.queryset().filter(pk=trip.pk).first()
        return Response({'success': True, 'message': 'Đã cập nhật.', 'data': st.row(fresh)})


class GssDemDetAlertsAPIView(APIView):
    """GET: danh sách chuyến sắp/đã quá hạn DEM/DET. POST: tạo thông báo chuông còn thiếu cho Điều vận (chạy tay)."""
    permission_classes = [IsDispatcher]

    def get(self, request):
        from apps.dispatch import gss_alerts
        rows = [gss_alerts.serialize(a) for a in gss_alerts.pending_alerts()]
        return Response({'success': True, 'total': len(rows), 'warn_days': dash._warn_days(), 'results': rows})

    def post(self, request):
        from apps.dispatch import gss_alerts
        res = gss_alerts.notify()
        return Response({'success': True, 'message': f'Đã tạo {res["created"]} thông báo mới cho {res["recipients"]} người.', 'data': res})


class GssGlobalSearchAPIView(APIView):
    """GET ?q= : tìm chuyến / booking / nhà xe / cont bãi; mỗi nhóm chỉ trả khi người dùng có quyền Xem phân hệ tương ứng."""
    permission_classes = [any_module_view('dispatch', 'sales', 'depot', name='GssSearchPermission')]

    def get(self, request):
        from apps.dispatch import gss_search
        from core import access
        u = request.user
        return Response({'success': True, **gss_search.search(
            request.query_params.get('q'), can_dispatch=access.can(u, 'dispatch'), can_sales=access.can(u, 'sales'), can_depot=access.can(u, 'depot'))})
