"""Dashboard điều hành theo nhà xe. Ô số trên bảng và danh sách khi bấm vào dùng CHUNG một bộ lọc (`metric_filter`),
nên hai nơi không thể lệch nhau."""
import datetime

from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.dispatch.gss_workflow import STEPS
from apps.dispatch.models import AllocationStatus, BookingVendorAllocation, DispatchTrip

AFTER_LOAD = STEPS[STEPS.index('LOADED_ON_VEHICLE'):]
DELIVERING = ['LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY']
AFTER_UNLOAD = STEPS[STEPS.index('UNLOADED'):]
METRICS = ['received', 'delivering', 'delivered', 'returned', 'swapped', 'alert']
METRIC_LABELS = {
    'received': 'Đã nhận cont', 'delivering': 'Đang đi giao', 'delivered': 'Đã giao hàng', 'returned': 'Đã hạ rỗng',
    'swapped': 'Đổi vỏ hạ', 'alert': 'Cảnh báo DEM/DET', 'pending': 'Chờ nhập xe/tài', 'all': 'Tất cả',
}


def gss_trips():
    """Mọi chuyến sinh từ phiếu chia cont (chưa hủy)."""
    return DispatchTrip.objects.filter(is_deleted=False, vendor_allocation__isnull=False, vendor_allocation__is_deleted=False) \
        .exclude(step_status='CANCELLED').exclude(vendor_allocation__status=AllocationStatus.REVOKED)


def metric_filter(metric, warn_days, today=None):
    today = today or timezone.localdate()
    limit = today + datetime.timedelta(days=warn_days)
    if metric == 'received':
        return Q(step_status__in=AFTER_LOAD)
    if metric == 'delivering':
        return Q(step_status__in=DELIVERING)
    if metric == 'delivered':
        return Q(step_status__in=AFTER_UNLOAD)
    if metric == 'returned':
        return Q(step_status='EMPTY_RETURNED')
    if metric == 'swapped':
        return Q(is_container_swapped=True)
    if metric == 'alert':
        # DEM chỉ còn ý nghĩa tới khi lấy cont khỏi cảng; DET tới khi trả vỏ rỗng
        return ~Q(step_status='EMPTY_RETURNED') & (
            (Q(dem_expiry_date__isnull=False, dem_expiry_date__lte=limit) & ~Q(step_status__in=AFTER_LOAD))
            | Q(det_expiry_date__isnull=False, det_expiry_date__lte=limit))
    return Q()


def _warn_days():
    from apps.master_data.models import CompanyProfile
    return CompanyProfile.get_default_company().warn_days


def trips_for(vendor_id=None, metric='all', *, search='', step=''):
    qs = gss_trips().select_related('customer', 'vehicle', 'trailer', 'subcontractor', 'vendor_allocation')
    if vendor_id:
        qs = qs.filter(subcontractor_id=vendor_id)
    if metric in METRICS:
        qs = qs.filter(metric_filter(metric, _warn_days()))
    if step:
        qs = qs.filter(step_status=step)
    if search:
        qs = qs.filter(Q(container_number__icontains=search) | Q(return_container_number__icontains=search) | Q(trip_code__icontains=search)
                       | Q(vehicle__license_plate__icontains=search) | Q(subcontractor_driver_name__icontains=search)
                       | Q(booking_or_bill__icontains=search))
    return qs


def dashboard():
    warn = _warn_days()
    today = timezone.localdate()
    allocs = BookingVendorAllocation.objects.filter(is_deleted=False).exclude(status=AllocationStatus.REVOKED)
    allocated = {r['subcontractor_id']: r['n'] for r in allocs.values('subcontractor_id').annotate(n=Sum('allocated_containers'))}
    trips = gss_trips()
    cols = {m: Count('id', filter=metric_filter(m, warn, today)) for m in METRICS}
    rows = {r['subcontractor_id']: r for r in trips.values('subcontractor_id').annotate(filled=Count('id'), **cols)}
    from apps.master_data.models import Subcontractor
    names = {s.id: (s.short_name or s.name) for s in Subcontractor.objects.filter(id__in=allocated.keys())}
    matrix = []
    for sid, total in sorted(allocated.items(), key=lambda kv: names.get(kv[0], '')):
        r = rows.get(sid, {})
        matrix.append({'vendor_id': sid, 'vendor': names.get(sid, '?'), 'total': total, 'pending': max(0, total - r.get('filled', 0)),
                       **{m: r.get(m, 0) for m in METRICS}})
    totals = {k: sum(r[k] for r in matrix) for k in ['total', 'pending', *METRICS]}
    from apps.depot_yard import service as depot
    ys = depot.stats()
    return {
        'warn_days': warn, 'metric_labels': METRIC_LABELS,
        'kpi': {
            'dispatching': {'containers': totals['total'], 'vendors': len(matrix)},
            'progress': {'received': totals['received'], 'delivered': totals['delivered'], 'returned': totals['returned']},
            'yard': {'in_yard': ys['in_yard'], 'in_today': ys['in_today'], 'out_today': ys['out_today'], 'full': ys['full'], 'empty': ys['empty']},
            'alerts': {'count': totals['alert']},
        },
        'matrix': matrix, 'totals': totals,
    }
