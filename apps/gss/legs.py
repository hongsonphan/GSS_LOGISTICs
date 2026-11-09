"""Vận đơn (MBL ◄ HBL), chặng (Leg), lượt xe (TruckRun) – đặc tả §4.

- Vận đơn: đồng bộ từ số MBL/HBL của đơn hàng (BookingOrder) khi lưu. Hãng phát hành MBL lấy theo mã/tên hãng tàu
  của đơn trong danh mục (Party vai trò hãng tàu); chưa có thì giữ tên dạng chữ.
- Chặng: sinh từ địa điểm của chuyến (lấy hàng -> giao -> hạ rỗng) hoặc từ mẫu tuyến (RouteTemplate).
  Bước hành trình GSS cập nhật trạng thái chặng: UNLOADED -> chặng giao xong; EMPTY_RETURNED -> mọi chặng xong.
- Lượt xe: gom nhiều chặng của một hoặc hai chuyến; tổng TEU các chuyến không vượt sức chở rơ-moóc (mặc định 2 TEU).
"""
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from core.sequences import next_code


# ------------------------------------------------------------------ vận đơn
def _issuer(booking):
    from apps.master_data.models import ShippingLine
    key = (booking.shipping_line or '').strip()
    if not key:
        return None, ''
    sl = ShippingLine.objects.filter(Q(code__iexact=key) | Q(name__iexact=key) | Q(short_name__iexact=key)).first()
    return sl, ('' if sl else key[:100])


def sync_bill_of_lading(booking):
    """Tạo/gắn vận đơn cho đơn hàng theo số MBL/HBL. Trả về vận đơn chính (HBL nếu có, không thì MBL)."""
    from apps.gss.models import BillOfLading
    mbl_no = (booking.mbl_number or '').strip().upper()
    hbl_no = (booking.hbl_number or '').strip().upper()
    if not mbl_no and not hbl_no:
        main = None
    else:
        issuer, issuer_name = _issuer(booking)
        mbl = None
        if mbl_no:
            mbl, _ = BillOfLading.objects.get_or_create(
                company_id=booking.company_id, kind='MBL', number=mbl_no, issuer=issuer,
                issuer_name='' if issuer else issuer_name)
        main = mbl
        if hbl_no:
            hbl, _ = BillOfLading.objects.get_or_create(company_id=booking.company_id, kind='HBL', number=hbl_no,
                                                         issuer=None, issuer_name='')
            if mbl and hbl.master_id != mbl.pk:
                hbl.master = mbl
                hbl.save(update_fields=['master', 'updated_at'])
            main = hbl
    if booking.bill_of_lading_id != (main.pk if main else None):
        type(booking)._base_manager.filter(pk=booking.pk).update(bill_of_lading=main)
        booking.bill_of_lading = main
    return main


def _on_booking_saved(sender, instance, raw=False, **kwargs):
    if raw:
        return
    sync_bill_of_lading(instance)


# ------------------------------------------------------------------ TEU
def teu_of(trip):
    """TEU của một chuyến: cont 20' = 1, 40'/45' = 2, ghép 2×20' = 2; xe tải hàng rời = 0."""
    if getattr(trip, 'is_twin_container', False):
        return 2
    ctype = (trip.container_type or '').upper()
    if not ctype or 'XE' in ctype or 'TẢI' in ctype or 'TAI' in ctype:
        return 0
    return 1 if ctype.startswith('20') or ctype.startswith('22') else 2


# ------------------------------------------------------------------ chặng
def _point(loc, text):
    return {'loc': loc, 'text': (text or (loc.name if loc else ''))[:150]}


def _default_points(trip):
    pts = [_point(trip.pickup_loc, trip.pickup_location), _point(trip.warehouse_loc, trip.warehouse_location)]
    if trip.dropoff_loc_id or (trip.dropoff_location or '').strip():
        pts.append(_point(trip.dropoff_loc, trip.dropoff_location))
    return pts, ['DELIVERY', 'EMPTY_RETURN'][:len(pts) - 1]


def _template_points(template):
    from apps.master_data.models import Location
    steps = [s for s in (template.steps or []) if isinstance(s, dict)]
    locs = {l.pk: l for l in Location.objects.filter(pk__in=[s.get('location_id') for s in steps if s.get('location_id')])}
    pts = [_point(locs.get(s.get('location_id')), s.get('label', '')) for s in steps]
    kinds = [str(s.get('kind') or 'TRANSFER') for s in steps[1:]]
    return pts, kinds


@transaction.atomic
def ensure_legs(trip, template=None, *, rebuild=False):
    """Sinh chặng cho chuyến nếu chưa có (hoặc dựng lại khi rebuild=True và chưa chặng nào chạy xong)."""
    from apps.gss.models import Leg, LEG_KINDS
    legs = list(Leg.objects.filter(trip=trip).order_by('seq'))
    if legs and not rebuild:
        return legs
    if any(l.status == 'DONE' for l in legs):
        raise ValidationError('Đã có chặng chạy xong, không dựng lại được.')
    Leg.objects.filter(trip=trip).delete()
    Leg.all_objects.filter(trip=trip, is_deleted=True).hard_delete()
    pts, kinds = _template_points(template) if template else _default_points(trip)
    valid = {k for k, _ in LEG_KINDS}
    out = []
    for i in range(len(pts) - 1):
        kind = kinds[i] if i < len(kinds) and kinds[i] in valid else 'TRANSFER'
        out.append(Leg.objects.create(company_id=trip.company_id, trip=trip, seq=i + 1, kind=kind,
                                      from_loc=pts[i]['loc'], to_loc=pts[i + 1]['loc'],
                                      from_text=pts[i]['text'], to_text=pts[i + 1]['text']))
    return out


def on_step(trip, step):
    """Cập nhật trạng thái chặng theo bước hành trình GSS."""
    from apps.gss.models import Leg
    now = timezone.now()
    qs = Leg.objects.filter(trip=trip, status='PLANNED')
    if step == 'UNLOADED':
        qs.filter(kind__in=['PICKUP', 'DELIVERY']).update(status='DONE', done_at=now)
    elif step == 'EMPTY_RETURNED':
        qs.update(status='DONE', done_at=now)


# ------------------------------------------------------------------ lượt xe
def run_teu(run, extra_trips=()):
    trips = {l.trip_id: l.trip for l in run.legs.filter(is_deleted=False).select_related('trip')}
    for t in extra_trips:
        trips[t.pk] = t
    return sum(teu_of(t) for t in trips.values())


@transaction.atomic
def assign_legs(legs, *, run=None, **run_fields):
    """Gán các chặng vào một lượt xe (tạo mới nếu chưa truyền `run`). Chặn khi tổng TEU vượt sức chở."""
    from apps.gss.models import TruckRun
    legs = list(legs)
    if not legs:
        raise ValidationError('Chưa chọn chặng nào.')
    if run is None:
        run = TruckRun.objects.create(company_id=legs[0].company_id, code=next_code(TruckRun, 'code', 'LX.', 4),
                                      **{k: v for k, v in run_fields.items() if v not in (None, '')})
    if run.status in ('DONE', 'CANCELLED'):
        raise ValidationError('Lượt xe đã kết thúc.')
    total = run_teu(run, [l.trip for l in legs])
    if total > run.capacity_teu:
        raise ValidationError(f'Vượt sức chở rơ-moóc: {total} TEU > {run.capacity_teu} TEU.')
    for leg in legs:
        leg.truck_run = run
        leg.save(update_fields=['truck_run', 'updated_at'])
    return run


def serialize_leg(leg):
    return {'id': leg.pk, 'seq': leg.seq, 'kind': leg.kind, 'kind_label': leg.get_kind_display(),
            'from': leg.from_text, 'to': leg.to_text, 'status': leg.status, 'status_label': leg.get_status_display(),
            'done_at': leg.done_at, 'truck_run': leg.truck_run.code if leg.truck_run_id else None,
            'truck_run_id': leg.truck_run_id}
