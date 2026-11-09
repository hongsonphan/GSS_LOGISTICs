"""API Booking của giao diện GSS: danh sách, tạo, xem/sửa, tệp đính kèm."""
from django.core.exceptions import ValidationError
from django.http import Http404

from apps.customers.models import BookingDocument, BookingOrder
from apps.dispatch import gss_bookings as svc
from apps.dispatch import vendor_service as vsvc
from apps.dispatch.api_views.gss import annotated, err, trip_row, vmsg
from apps.dispatch.models import AllocationStatus, BookingVendorAllocation, DispatchTrip
from core.permissions import any_module_view
from ._common import *  # noqa: F401,F403

BookingPerm = any_module_view('sales', 'dispatch')


def _booking(pk):
    b = BookingOrder.objects.select_related('customer').filter(pk=pk, is_deleted=False).first()
    if not b:
        raise Http404
    return b


class GssBookingListAPIView(APIView):
    permission_classes = [BookingPerm]
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    LIMIT = 300

    def get(self, request):
        qs = svc.listing((request.query_params.get('q') or '').strip(), request.query_params.get('status', ''))
        total = qs.count()
        rows = [svc.serialize(b) for b in qs[:self.LIMIT]]
        if request.query_params.get('alert') == '1':
            rows = [r for r in rows if r['dem']['level'] in ('warn', 'overdue') or r['det']['level'] in ('warn', 'overdue')]
        return Response({'success': True, 'total': total, 'truncated': total > self.LIMIT, 'results': rows})

    def post(self, request):
        try:
            b = svc.save_booking(request.data)
        except ValidationError as exc:
            return err(vmsg(exc))
        return Response({'success': True, 'message': f'Đã tạo booking {b.booking_code}.', 'data': svc.serialize(b, detail=True)}, status=status.HTTP_201_CREATED)


class GssBookingDetailAPIView(APIView):
    permission_classes = [BookingPerm]
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get(self, request, pk):
        b = _booking(pk)
        allocs = BookingVendorAllocation.objects.filter(booking=b, is_deleted=False).exclude(status=AllocationStatus.REVOKED).select_related('subcontractor')
        trips = annotated(DispatchTrip.objects.filter(booking_order=b, is_deleted=False).exclude(step_status='CANCELLED')
                          .select_related('customer', 'vehicle', 'trailer', 'subcontractor', 'booking_order')).order_by('subcontractor_id', 'vendor_line_no')
        return Response({'success': True, 'data': {**svc.serialize(b, detail=True), 'allocations': [vsvc.allocation_summary(a) for a in allocs],
                                                   'trips': [trip_row(t) for t in trips]}})

    def put(self, request, pk):
        try:
            b = svc.save_booking(request.data, _booking(pk))
        except ValidationError as exc:
            return err(vmsg(exc))
        return Response({'success': True, 'message': 'Đã lưu booking.', 'data': svc.serialize(b, detail=True)})


class GssBookingDocumentsAPIView(APIView):
    permission_classes = [BookingPerm]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, pk):
        b = _booking(pk)
        try:
            svc.add_documents(b, request.FILES.getlist('files'))
        except ValidationError as exc:
            return err(vmsg(exc))
        return Response({'success': True, 'data': svc.serialize(b, detail=True)}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk, doc_id):
        b = _booking(pk)
        doc = BookingDocument.objects.filter(pk=doc_id, booking=b, is_deleted=False).first()
        if not doc:
            raise Http404
        doc.delete()  # xóa mềm
        return Response({'success': True, 'data': svc.serialize(b, detail=True)})
