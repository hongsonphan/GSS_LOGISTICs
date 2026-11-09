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
from core.permissions import IsDepotStaff, IsDispatcher


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


def _yard_json(y):
    return {'id': y.id, 'code': y.code, 'name': y.name, 'address': y.address, 'capacity': y.capacity, 'is_active': y.is_active,
            'in_yard': y.movements.filter(status=MovementStatus.IN_YARD, is_deleted=False).count()}


def _save_yard(request, yard):
    import re
    d = request.data
    code = str(d.get('code') or (yard.code if yard else '')).strip().upper()
    name = str(d.get('name') or '').strip()
    if not re.match(r'^[A-Z0-9_-]{2,30}$', code) or not name:
        return _err('Cần mã bãi (2–30 ký tự chữ/số/gạch) và tên bãi.')
    if Yard.objects.filter(code=code).exclude(pk=yard.pk if yard else None).exists():
        return _err('Mã bãi đã tồn tại.')
    try:
        cap = int(d.get('capacity') or 0)
        if not 0 <= cap <= 1000000:
            raise ValueError
    except (TypeError, ValueError):
        return _err('Sức chứa phải là số từ 0 đến 1.000.000 (0 = không giới hạn).')
    active = bool(d.get('is_active', True))
    if yard and yard.is_active and not active and yard.movements.filter(status=MovementStatus.IN_YARD, is_deleted=False).exists():
        return _err('Bãi còn cont tồn, không ngừng hoạt động được.')
    yard = yard or Yard()
    yard.code, yard.name, yard.address, yard.capacity, yard.is_active = code, name[:150], str(d.get('address') or '')[:255], cap, active
    yard.save()
    return Response({'success': True, 'message': 'Đã lưu bãi.', 'data': _yard_json(yard)})


class YardListAPIView(APIView):
    permission_classes = [IsDispatcher]  # tạo/sửa bãi: Điều vận; xem danh sách bãi: cả Thủ bãi

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [IsDepotStaff()]
        return super().get_permissions()

    def get(self, request):
        service.default_yard()
        qs = Yard.objects.filter(is_deleted=False)
        if request.query_params.get('all') != '1':
            qs = qs.filter(is_active=True)
        return Response({'success': True, 'results': [_yard_json(y) for y in qs]})

    def post(self, request):
        return _save_yard(request, None)


class YardDetailAPIView(APIView):
    permission_classes = [IsDispatcher]

    def put(self, request, pk):
        y = Yard.objects.filter(pk=pk, is_deleted=False).first()
        if not y:
            raise Http404
        return _save_yard(request, y)


class DepotStatsAPIView(APIView):
    permission_classes = [IsDepotStaff]

    def get(self, request):
        return Response({'success': True, 'data': service.stats(_yard(request))})


class MovementListCreateAPIView(APIView):
    permission_classes = [IsDepotStaff]
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
    permission_classes = [IsDepotStaff]

    def get(self, request, pk):
        return Response({'success': True, 'data': service.serialize(_movement(pk), with_photos=True)})


class MovementGateOutAPIView(APIView):
    permission_classes = [IsDepotStaff]

    def post(self, request, pk):
        try:
            m = service.gate_out(_movement(pk), request.data, label=request.user.get_username())
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        return Response({'success': True, 'message': f'Cont {m.container_number} đã rời bãi.', 'data': service.serialize(m)})


class MovementPhotosAPIView(APIView):
    permission_classes = [IsDepotStaff]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, pk):
        m = _movement(pk)
        try:
            service.add_photos(m, request.data.get('phase', 'IN'), request.FILES.getlist('files'), label=request.user.get_username())
        except ValidationError as exc:
            return _err(' '.join(exc.messages))
        return Response({'success': True, 'data': service.serialize(m, with_photos=True)}, status=status.HTTP_201_CREATED)


class MovementExportAPIView(APIView):
    """Xuất Excel danh sách cont trong bãi / lượt vào ra theo bộ lọc hiện tại."""
    permission_classes = [IsDepotStaff]

    def get(self, request):
        import io
        from django.http import HttpResponse
        from openpyxl import Workbook
        from core.validators import excel_safe
        yard = _yard(request)
        qs = DepotContainerMovement.objects.filter(is_deleted=False, yard=yard).select_related('yard', 'trip', 'subcontractor', 'customer')
        st = request.query_params.get('status', 'IN_YARD')
        if st in MovementStatus.values:
            qs = qs.filter(status=st)
        wb = Workbook()
        ws = wb.active
        ws.title = 'Bãi cont'
        ws.append(['Số cont', 'Loại', 'Hàng/Rỗng', 'Nhà xe', 'Chủ hàng', 'Vào bãi', 'Xe vào', 'Tài xế vào', 'Số ngày lưu', 'Ra bãi', 'Xe ra', 'Mục đích', 'Tình trạng vỏ'])
        for m in qs[:5000]:
            d = service.serialize(m)
            ws.append([excel_safe(d['container_number']), excel_safe(d['container_type']), d['cargo_label'], excel_safe(d['subcontractor']), excel_safe(d['customer']),
                       d['gate_in_at'][:16].replace('T', ' '), excel_safe(d['in_vehicle_plate']), excel_safe(d['in_driver_name']), d['storage_days'],
                       (d['gate_out_at'] or '')[:16].replace('T', ' '), excel_safe(d['out_vehicle_plate']), d['out_purpose_label'], excel_safe(d['condition_notes'])])
        buf = io.BytesIO()
        wb.save(buf)
        resp = HttpResponse(buf.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        resp['Content-Disposition'] = 'attachment; filename="bai-cont.xlsx"'
        return resp


class DepotLookupAPIView(APIView):
    """Tra nhanh theo số cont: đang trong bãi chưa, và lệnh điều vận liên quan (để điền sẵn Gate-in)."""
    permission_classes = [IsDepotStaff]

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
