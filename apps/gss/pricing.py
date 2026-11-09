"""Biểu giá và tự áp giá khi chuyến hoàn tất (đặc tả §5.2).

- Bảng giá đã duyệt thì không sửa được; đổi giá = `new_version()` (bản cũ chuyển "Hết hiệu lực" từ ngày bản mới có hiệu lực).
- Áp giá: với mỗi khoản phí, chọn dòng giá cụ thể nhất (bảng riêng của khách/nhà xe > bảng chung; khớp nơi lấy, nơi giao,
  tuyến, loại cont). Dòng sinh ra (`JobCharge`) chụp lại đơn giá, mã bảng giá, phiên bản và dòng giá đã dùng.
- Sau khi áp: cước bán (không gồm chi hộ) ghi vào `cached_revenue`, cước mua vào `subcontractor_cost` (chỉ khi đối soát
  nhà xe còn "Chờ đối soát") để sổ cái tự ghi bút toán chuyến như cũ (apps/ledger/posting.build_trip).
- Sửa tay dòng giá phải có lý do; dòng đã nằm trong bảng kê đã chốt thì không sửa được.
"""
import datetime
import logging
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from apps.gss.models import ChargeCode, JobCharge, RateCard, RateLine

log = logging.getLogger(__name__)
CENT = Decimal('0.01')
MAX_MONEY = Decimal('1000000000000')


def money(value, label='Số tiền', allow_negative=False):
    try:
        d = Decimal(str(value if value not in (None, '') else 0)).quantize(CENT, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        raise ValidationError(f'{label} không hợp lệ.')
    if (d < 0 and not allow_negative) or abs(d) > MAX_MONEY:
        raise ValidationError(f'{label} phải từ 0 đến {int(MAX_MONEY):,}.'.replace(',', '.'))
    return d


def qty(value):
    try:
        d = Decimal(str(value if value not in (None, '') else 1))
    except (InvalidOperation, ValueError):
        raise ValidationError('Số lượng không hợp lệ.')
    if d <= 0 or d > 100000:
        raise ValidationError('Số lượng phải lớn hơn 0.')
    return d.quantize(Decimal('0.001'))


# ------------------------------------------------------------------ bảng giá
def _check_overlap(card):
    q = RateCard.objects.filter(is_deleted=False, status='APPROVED', side=card.side, customer=card.customer,
                                subcontractor=card.subcontractor).exclude(pk=card.pk)
    end = card.valid_to
    for other in q:
        o_end = other.valid_to
        if (end is None or other.valid_from <= end) and (o_end is None or card.valid_from <= o_end):
            return other
    return None


@transaction.atomic
def approve(card, user):
    if card.status != 'DRAFT':
        raise ValidationError('Chỉ duyệt được bảng giá nháp.')
    if not card.lines.exists():
        raise ValidationError('Bảng giá chưa có dòng giá nào.')
    if card.valid_to and card.valid_to < card.valid_from:
        raise ValidationError('Ngày hết hiệu lực phải sau ngày bắt đầu.')
    other = _check_overlap(card)
    if other and other.pk != (card.previous_id or 0):
        raise ValidationError(f'Trùng thời gian hiệu lực với bảng giá {other.code} v{other.version} đã duyệt.')
    if card.previous_id:
        prev = card.previous
        if prev.status == 'APPROVED':
            prev.valid_to = card.valid_from - datetime.timedelta(days=1)
            prev.status = 'ARCHIVED' if prev.valid_to < prev.valid_from else 'APPROVED'
            prev.save(update_fields=['valid_to', 'status', 'updated_at'])
    card.status, card.approved_by, card.approved_at = 'APPROVED', user, timezone.now()
    card.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
    _audit(card, user, {'event': 'APPROVE', 'version': card.version})
    return card


@transaction.atomic
def new_version(card, valid_from, user):
    """Tạo bản nháp mới chép toàn bộ dòng giá; bản cũ giữ nguyên cho tới khi bản mới được duyệt."""
    if card.status == 'DRAFT':
        raise ValidationError('Bảng giá đang là nháp, sửa trực tiếp.')
    if valid_from <= card.valid_from:
        raise ValidationError('Ngày hiệu lực của phiên bản mới phải sau ngày hiệu lực của bản hiện tại.')
    new = RateCard.objects.create(code=card.code, name=card.name, side=card.side, customer=card.customer, subcontractor=card.subcontractor,
                                  valid_from=valid_from, valid_to=None, status='DRAFT', version=card.version + 1, previous=card,
                                  currency=card.currency, notes=card.notes, company=card.company)
    for ln in card.lines.all():
        ln.pk = None
        ln.card = new
        ln.save()
    _audit(new, user, {'event': 'NEW_VERSION', 'from_version': card.version})
    return new


def _audit(obj, user, changes):
    from core.models import AuditLog
    ok = user is not None and getattr(user, 'is_authenticated', False)
    AuditLog.objects.create(actor=user if ok else None, actor_label=user.get_username() if ok else 'hệ thống', action='update',
                            model_label=obj._meta.label_lower, object_id=str(obj.pk), object_repr=str(obj)[:255], changes=changes,
                            company=getattr(obj, 'company', None))


# ------------------------------------------------------------------ chọn giá
def _trip_date(trip):
    d = trip.actual_end_time or trip.loading_date or trip.created_at
    return timezone.localtime(d).date() if hasattr(d, 'hour') else d


def _party_filter(side, trip):
    if side == 'SELL':
        return Q(customer=trip.customer_id) | Q(customer__isnull=True, subcontractor__isnull=True)
    return Q(subcontractor=trip.subcontractor_id) | Q(customer__isnull=True, subcontractor__isnull=True)


def candidate_lines(trip, side):
    day = _trip_date(trip)
    cards = RateCard.objects.filter(is_deleted=False, status='APPROVED', side=side, valid_from__lte=day) \
        .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=day)).filter(_party_filter(side, trip))
    if side == 'BUY' and not trip.subcontractor_id:
        return []
    ctype = (trip.container_type or '').upper()
    dest = (trip.warehouse_location or '').upper()
    best = {}
    for ln in RateLine.objects.filter(card__in=cards, auto_apply=True).select_related('card', 'charge_code'):
        if not ln.charge_code.is_active or ln.charge_code.is_deleted:
            continue
        if ln.container_type and ln.container_type.upper() != ctype:
            continue
        if ln.pickup_loc_id and ln.pickup_loc_id != trip.pickup_loc_id:
            continue
        if ln.delivery_loc_id and ln.delivery_loc_id != trip.warehouse_loc_id:
            continue
        if ln.route_text and ln.route_text.strip().upper() not in dest:
            continue
        party = 8 if (ln.card.customer_id or ln.card.subcontractor_id) else 0
        score = party + (4 if ln.delivery_loc_id or ln.route_text else 0) + (2 if ln.pickup_loc_id else 0) + (1 if ln.container_type else 0)
        cur = best.get(ln.charge_code_id)
        if cur is None or score > cur[0] or (score == cur[0] and ln.card.valid_from > cur[1].card.valid_from):
            best[ln.charge_code_id] = (score, ln)
    return [v[1] for v in best.values()]


def _quantity(trip, ln):
    if ln.unit == 'CONT':
        return Decimal('2') if (trip.container_number_2 or '').strip() else Decimal('1')
    if ln.unit == 'TON':
        bc = getattr(trip, 'booking_container', None)
        w = bc.gross_weight_kg if bc is not None and bc.gross_weight_kg else None
        return (Decimal(w) / 1000).quantize(Decimal('0.001')) if w else Decimal('1')
    return Decimal('1')


def _locked_line_ids(trip):
    from apps.gss.models import StatementLine
    return set(StatementLine.objects.filter(trip=trip, statement__is_deleted=False).exclude(statement__status='CANCELLED')
               .values_list('job_line_id', flat=True))


@transaction.atomic
def apply_rates(trip, user=None, *, force=False):
    """Áp biểu giá cho chuyến. Đã có dòng tự áp thì bỏ qua (trừ khi force=True – áp lại, giữ dòng nhập tay/chi hộ)."""
    existing = JobCharge.objects.filter(trip=trip, source='AUTO', is_deleted=False)
    if existing.exists() and not force:
        return {'created': 0, 'skipped': True}
    locked = _locked_line_ids(trip)
    if existing.filter(pk__in=locked).exists():
        raise ValidationError('Chuyến đã nằm trong bảng kê, không áp lại giá được. Hãy huỷ bảng kê nháp trước.')
    for old in existing:
        old.delete()
    created = 0
    for side in ('SELL', 'BUY'):
        for ln in candidate_lines(trip, side):
            q = _quantity(trip, ln)
            JobCharge.objects.create(
                trip=trip, side=side, charge_code=ln.charge_code, description=ln.charge_code.name, quantity=q, unit=ln.unit,
                unit_price=ln.unit_price, amount=(q * ln.unit_price).quantize(CENT), vat_rate=ln.charge_code.vat_rate,
                currency=ln.card.currency, rate_line=ln, source='AUTO', created_by=user if (user and user.is_authenticated) else None,
                company=trip.company,
                snapshot={'card': ln.card.code, 'card_id': ln.card_id, 'version': ln.card.version, 'line_id': ln.id,
                          'unit_price': str(ln.unit_price), 'unit': ln.unit, 'container_type': trip.container_type,
                          'route': ln.route_text, 'applied_at': timezone.now().isoformat()})
            created += 1
    sync_trip_totals(trip)
    return {'created': created, 'skipped': False}


def totals(trip):
    base = JobCharge.objects.filter(trip=trip, is_deleted=False)
    out = {}
    for side in ('SELL', 'BUY'):
        q = base.filter(side=side)
        out[side] = {'freight': q.exclude(charge_code__kind='REIMBURSABLE').aggregate(s=Sum('amount'))['s'] or Decimal('0'),
                     'reimbursable': q.filter(charge_code__kind='REIMBURSABLE').aggregate(s=Sum('amount'))['s'] or Decimal('0')}
    return out


def sync_trip_totals(trip):
    """Ghi cước bán/mua (không gồm chi hộ) vào chuyến để báo cáo lãi lỗ và sổ cái chuyến dùng tiếp."""
    from apps.dispatch.models import DispatchTrip
    t = totals(trip)
    upd = {}
    sell = t['SELL']['freight'].quantize(Decimal('1'))
    if sell != (trip.cached_revenue or 0):
        upd['cached_revenue'] = sell
    buy = t['BUY']['freight'].quantize(Decimal('1'))
    if trip.subcontractor_id and trip.subcontractor_settlement_status == 'PENDING' and buy != (trip.subcontractor_cost or 0) and \
            JobCharge.objects.filter(trip=trip, side='BUY', is_deleted=False).exists():
        upd['subcontractor_cost'] = buy
    if upd:
        DispatchTrip.objects.filter(pk=trip.pk).update(**upd)
        for k, v in upd.items():
            setattr(trip, k, v)
        try:
            from apps.ledger import posting
            transaction.on_commit(lambda: posting.safe_post('trip', trip.pk))
        except Exception:  # pragma: no cover
            log.exception('Không lên lịch ghi sổ chuyến %s', trip.pk)
    return t


def on_trip_completed(trip):
    """Gọi khi chuyến hoàn tất (hạ rỗng / street-turn). Lỗi áp giá không được làm hỏng thao tác của tài xế."""
    try:
        with transaction.atomic():
            return apply_rates(trip)
    except Exception:
        log.exception('Áp giá tự động lỗi cho chuyến %s', trip.pk)
        return None


# ------------------------------------------------------------------ sửa tay
def _guard_editable(line):
    if line.pk in _locked_line_ids(line.trip):
        raise ValidationError('Dòng đã nằm trong bảng kê đối soát, không sửa được.')


@transaction.atomic
def add_manual(trip, *, side, charge_code, quantity, unit_price, description='', reason, user):
    if side not in ('SELL', 'BUY'):
        raise ValidationError('Chiều giá không hợp lệ.')
    if side == 'BUY' and not trip.subcontractor_id:
        raise ValidationError('Chuyến xe nhà không có giá mua nhà xe.')
    if len((reason or '').strip()) < 5:
        raise ValidationError('Cần nhập lý do (≥ 5 ký tự) khi thêm giá tay.')
    q, p = qty(quantity), money(unit_price, 'Đơn giá')
    line = JobCharge.objects.create(trip=trip, side=side, charge_code=charge_code, description=(description or charge_code.name)[:255], quantity=q,
                                    unit='TRIP', unit_price=p, amount=(q * p).quantize(CENT), vat_rate=charge_code.vat_rate, source='MANUAL',
                                    manual_reason=reason.strip()[:255], created_by=user, company=trip.company,
                                    snapshot={'manual': True, 'by': user.get_username(), 'at': timezone.now().isoformat()})
    _audit(line, user, {'event': 'ADD', 'side': side, 'amount': str(line.amount), 'reason': reason})
    sync_trip_totals(trip)
    return line


@transaction.atomic
def edit_line(line, *, quantity=None, unit_price=None, description=None, reason, user):
    _guard_editable(line)
    if len((reason or '').strip()) < 5:
        raise ValidationError('Cần nhập lý do (≥ 5 ký tự) khi sửa giá.')
    old = {'quantity': str(line.quantity), 'unit_price': str(line.unit_price), 'amount': str(line.amount)}
    if quantity is not None:
        line.quantity = qty(quantity)
    if unit_price is not None:
        line.unit_price = money(unit_price, 'Đơn giá')
    if description is not None:
        line.description = str(description)[:255]
    line.amount = (line.quantity * line.unit_price).quantize(CENT)
    line.manual_reason = reason.strip()[:255]
    line.snapshot = {**(line.snapshot or {}), 'edited_by': user.get_username(), 'edited_at': timezone.now().isoformat(), 'before': old}
    line.save()
    _audit(line, user, {'event': 'EDIT', 'before': old, 'after': {'quantity': str(line.quantity), 'unit_price': str(line.unit_price),
                                                                   'amount': str(line.amount)}, 'reason': reason})
    sync_trip_totals(line.trip)
    return line


@transaction.atomic
def delete_line(line, *, reason, user):
    _guard_editable(line)
    if len((reason or '').strip()) < 5:
        raise ValidationError('Cần nhập lý do (≥ 5 ký tự) khi xoá dòng giá.')
    line.delete()
    _audit(line, user, {'event': 'DELETE', 'amount': str(line.amount), 'reason': reason})
    sync_trip_totals(line.trip)


def serialize_line(ln):
    return {'id': ln.id, 'side': ln.side, 'charge_code': ln.charge_code.code, 'charge_name': ln.charge_code.name, 'kind': ln.charge_code.kind,
            'description': ln.description, 'quantity': str(ln.quantity), 'unit': ln.unit, 'unit_price': str(ln.unit_price),
            'amount': str(ln.amount), 'vat_rate': str(ln.vat_rate), 'currency': ln.currency, 'source': ln.source,
            'manual_reason': ln.manual_reason, 'snapshot': ln.snapshot}


def serialize_card(card, with_lines=False):
    d = {'id': card.id, 'code': card.code, 'name': card.name, 'side': card.side, 'side_label': card.get_side_display(),
         'customer_id': card.customer_id, 'customer': card.customer.name if card.customer_id else '',
         'subcontractor_id': card.subcontractor_id, 'subcontractor': (card.subcontractor.short_name or card.subcontractor.name) if card.subcontractor_id else '',
         'valid_from': card.valid_from.isoformat(), 'valid_to': card.valid_to.isoformat() if card.valid_to else None,
         'status': card.status, 'status_label': card.get_status_display(), 'version': card.version, 'currency': card.currency,
         'approved_at': card.approved_at.isoformat() if card.approved_at else None, 'notes': card.notes,
         'line_count': card.lines.count()}
    if with_lines:
        d['lines'] = [{'id': ln.id, 'charge_code_id': ln.charge_code_id, 'charge_code': ln.charge_code.code, 'charge_name': ln.charge_code.name,
                       'pickup_loc_id': ln.pickup_loc_id, 'pickup_loc': ln.pickup_loc.name if ln.pickup_loc_id else '',
                       'delivery_loc_id': ln.delivery_loc_id, 'delivery_loc': ln.delivery_loc.name if ln.delivery_loc_id else '',
                       'route_text': ln.route_text, 'container_type': ln.container_type, 'unit': ln.unit, 'unit_price': str(ln.unit_price),
                       'auto_apply': ln.auto_apply, 'notes': ln.notes}
                      for ln in card.lines.select_related('charge_code', 'pickup_loc', 'delivery_loc')]
    return d


DEFAULT_CHARGE_CODES = [
    ('CUOC', 'Cước vận chuyển container', 'FREIGHT', '8'), ('NANG', 'Phí nâng container', 'REIMBURSABLE', '0'),
    ('HA', 'Phí hạ container', 'REIMBURSABLE', '0'), ('LUUBAI', 'Phí lưu bãi', 'SURCHARGE', '8'),
    ('CHO', 'Phí chờ / neo xe', 'SURCHARGE', '8'), ('THEMDIEM', 'Phụ phí giao thêm điểm', 'SURCHARGE', '8'),
    ('CHIHO', 'Chi hộ khác', 'REIMBURSABLE', '0'),
]


def ensure_default_charge_codes(company=None):
    made = 0
    for code, name, kind, vat in DEFAULT_CHARGE_CODES:
        if not ChargeCode.objects.filter(code=code, is_deleted=False).exists():
            ChargeCode.objects.create(code=code, name=name, kind=kind, vat_rate=Decimal(vat), company=company)
            made += 1
    return made
