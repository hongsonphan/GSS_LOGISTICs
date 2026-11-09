"""Tìm kiếm toàn cục GSS: chuyến, booking, nhà xe, cont trong bãi. Trả tối đa LIMIT dòng mỗi nhóm, chỉ nhóm người dùng được phép xem."""
from django.db.models import Q

from apps.customers.models import BookingOrder
from apps.depot_yard.models import DepotContainerMovement
from apps.dispatch import gss_dashboard as dash
from apps.master_data.models import Subcontractor

LIMIT = 8
MIN_LEN = 2


def search(q, *, can_dispatch=True, can_sales=True, can_depot=True):
    q = (q or '').strip()[:60]
    out = {'q': q, 'trips': [], 'bookings': [], 'vendors': [], 'depot': []}
    if len(q) < MIN_LEN:
        return out
    if can_dispatch:
        trips = dash.gss_trips().filter(
            Q(trip_code__icontains=q) | Q(container_number__icontains=q) | Q(return_container_number__icontains=q)
            | Q(subcontractor_driver_name__icontains=q) | Q(vehicle__license_plate__icontains=q) | Q(trailer_plate_text__icontains=q)
        ).select_related('vehicle', 'subcontractor').order_by('-id')[:LIMIT]
        out['trips'] = [{'trip_code': t.trip_code, 'container_number': t.container_number, 'step_status': t.step_status,
                         'plate': t.vehicle.license_plate if t.vehicle_id else '', 'driver': t.subcontractor_driver_name,
                         'vendor': (t.subcontractor.short_name or t.subcontractor.name) if t.subcontractor_id else ''} for t in trips]
        out['vendors'] = [{'id': v.id, 'name': v.name, 'short_name': v.short_name}
                          for v in Subcontractor.objects.filter(is_deleted=False).filter(Q(name__icontains=q) | Q(short_name__icontains=q))[:LIMIT]]
    if can_sales:
        bks = BookingOrder.objects.filter(is_deleted=False).filter(
            Q(booking_code__icontains=q) | Q(booking_number__icontains=q) | Q(customer__name__icontains=q)).select_related('customer').order_by('-id')[:LIMIT]
        out['bookings'] = [{'id': b.id, 'booking_code': b.booking_code, 'booking_number': b.booking_number,
                            'customer': b.customer.name if b.customer_id else ''} for b in bks]
    if can_depot:
        mv = DepotContainerMovement.objects.filter(is_deleted=False).filter(
            Q(container_number__icontains=q) | Q(in_vehicle_plate__icontains=q) | Q(out_vehicle_plate__icontains=q)).select_related('yard').order_by('-id')[:LIMIT]
        out['depot'] = [{'id': m.id, 'container_number': m.container_number, 'status': m.status, 'yard': m.yard.name} for m in mv]
    return out
