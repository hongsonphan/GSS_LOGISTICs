"""API Bãi container cho nhân viên (thủ bãi, điều vận)."""
import datetime

from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import Http404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.depot_yard import service
from apps.depot_yard.models import DepotContainerMovement, MovementStatus, Yard
from core.permissions import IsDispatcher


def _err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'message': message}, status=code)


def _yard(request):
    yid = request.query_params.get('yard')
    if not yid and request.method == 'POST':
        yid = request.data.get('yard_id')
    if yid:
        y = Yard.objects.filter(pk=yid, is_deleted=False, is_active=True).first()
        if not y:
            raise Http404
        return y
    return service.default_yard()


def _movement(pk):
    m = DepotContainerMovement.objects.select_related('yard', 'trip', 'subcontractor', 'customer').filter(pk=pk, is_deleted=False).first()
    if not m:
        raise Http404
    return m


class YardListAPIView(APIView):
    permission_classes = [IsDispatcher]

    def get(self, request):
        service.default_yard()
        return Response({'success': True, 'results': [{'id': y.id, 'code': y.code, 'name': y.name, 'capacity': y.capacity}
                                                      for y in Yard.objects.filter(is_deleted=False, is_active=True)]})


class DepotStatsAPIView(APIView):
    permission_classes = [IsDispatcher]

    def get(self, request):
        return Response({'success': True, 'data': service.stats(_yard(request))})


class MovementListCreateAPIView(APIView):
    permission_classes = [IsDispatcher]
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    LIMIT = 300

    def get(self, request):
        yard = _yard(request)
        qs = DepotContainerMovement.objects.filter(is_deleted=False, yard=yard).select_related('yard', 'trip', 'subcontractor', 'customer')
        st = request.query_params.get('status', 'IN_YARD')
        if st in MovementStatus.values:
            qs = qs.filter(status=st)
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(container_number__icontains=q) | Q(in_vehicle_plate__icontains=q) | Q(out_vehicle_plate__icontains=q) | Q(in_driver_name__icontains=q))
        cargo = request.query_params.get('cargo')
        if cargo in ('FULL', 'EMPTY'):
            qs = qs.filter(cargo_status=cargo)
        vendor = request.query_params.get('vendor')
        if vendor and vendor.isdigit():
            qs = qs.filter(subcontractor_id=int(vendor))
        day = request.query_params.get('day')
        if day in ('in_today', 'out_today'):
            start = timezone.make_aware(datetime.datetime.combine(timezone.localdate(), datetime.time.min))
            qs = qs.filter(**{('gate_in_at__gte' if day == 'in_today' else 'gate_out_at__gte'): start})
        total = qs.count()
        return Response({'success': True, 'total': total, 'results': [service.serialize(m) for m in qs[:self.LIMIT]]})

    def post(self, request):
        yard = _yard(request)
        try:
            m, warnings = service.gate_in(yard, request.data, label=request.user.get_username())
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        return Response({'success': True, 'message': f'Đã ghi nhận cont {m.container_number} vào bãi.', 'warnings': warnings,
                         'data': service.serialize(m)}, status=status.HTTP_201_CREATED)


class MovementDetailAPIView(APIView):
    permission_classes = [IsDispatcher]

    def get(self, request, pk):
        return Response({'success': True, 'data': service.serialize(_movement(pk), with_photos=True)})


class MovementGateOutAPIView(APIView):
    permission_classes = [IsDispatcher]

    def post(self, request, pk):
        try:
            m = service.gate_out(_movement(pk), request.data, label=request.user.get_username())
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        return Response({'success': True, 'message': f'Cont {m.container_number} đã rời bãi.', 'data': service.serialize(m)})


class MovementPhotosAPIView(APIView):
    permission_classes = [IsDispatcher]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, pk):
        m = _movement(pk)
        try:
            service.add_photos(m, request.data.get('phase', 'IN'), request.FILES.getlist('files'), label=request.user.get_username())
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        return Response({'success': True, 'data': service.serialize(m, with_photos=True)}, status=status.HTTP_201_CREATED)


class DepotLookupAPIView(APIView):
    """Tra nhanh theo số cont: đang trong bãi chưa, và lệnh điều vận liên quan (để điền sẵn Gate-in)."""
    permission_classes = [IsDispatcher]

    def get(self, request):
        cont = service._norm_cont(request.query_params.get('container'))
        if not cont:
            return _err('Thiếu số container.')
        m = DepotContainerMovement.objects.filter(container_number=cont, status=MovementStatus.IN_YARD, is_deleted=False) \
            .select_related('yard', 'trip', 'subcontractor', 'customer').first()
        trip = service._find_trip(cont)
        info = None
        if trip:
            info = {'trip_code': trip.trip_code, 'container_type': trip.container_type, 'vendor': (trip.subcontractor.short_name or trip.subcontractor.name) if trip.subcontractor_id else '',
                    'driver_name': trip.subcontractor_driver_name, 'driver_phone': trip.subcontractor_driver_phone,
                    'tractor_plate': trip.vehicle.license_plate if trip.vehicle_id else ''}
        return Response({'success': True, 'in_yard': service.serialize(m) if m else None, 'trip': info})
