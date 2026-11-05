"""Hàng lẻ (LCL) theo kiện có Seal, quét QR từng kiện, nhật ký quét và chốt chặn chuyển bước."""
import re

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.dispatch.models import DispatchTrip
from apps.qr_tracking.models import PackageStatus, QRScanLog, TripPackageSeal
from core import qr_tokens

MAX_PACKAGES_PER_TRIP = 500
_SEAL_RE = re.compile(r'[^A-Z0-9]')


def norm_seal(value):
    """So sánh seal không phân biệt hoa/thường, khoảng trắng, dấu gạch."""
    return _SEAL_RE.sub('', (value or '').upper())


def package_token(pkg):
    return qr_tokens.make_token(qr_tokens.PACKAGE, pkg.pk, pkg.qr_version)


def package_by_token(token):
    parsed = qr_tokens.parse_token(token)
    if not parsed or parsed[0] != qr_tokens.PACKAGE:
        return None
    pkg = TripPackageSeal.objects.select_related('trip').filter(pk=parsed[1], is_deleted=False).first()
    return pkg if pkg and qr_tokens.verify(token, qr_tokens.PACKAGE, pkg.pk, pkg.qr_version) else None


def trip_by_token(token):
    parsed = qr_tokens.parse_token(token)
    if not parsed or parsed[0] != qr_tokens.TRIP:
        return None
    trip = DispatchTrip.objects.select_related('customer', 'vehicle', 'trailer', 'booking_order', 'subcontractor') \
        .filter(pk=parsed[1], is_deleted=False).first()
    return trip if trip and qr_tokens.verify(token, qr_tokens.TRIP, trip.pk, trip.qr_version) else None


def log_scan(target_type, target_id, action, result='OK', detail='', actor_label='', ip=''):
    return QRScanLog.objects.create(target_type=target_type, target_id=target_id, action=action, result=result,
                                    detail=detail[:255], actor_label=actor_label[:150], ip_address=ip[:64])


# ---------- danh sách kiện ----------
def summary(trip):
    qs = TripPackageSeal.objects.filter(trip=trip, is_deleted=False)
    agg = qs.aggregate(
        total=Count('id'), loaded=Count('id', filter=~Q(status=PackageStatus.CREATED)),
        delivered=Count('id', filter=Q(status=PackageStatus.DELIVERED)),
        problem=Count('id', filter=Q(status__in=[PackageStatus.DAMAGED, PackageStatus.MISSING])))
    return {k: agg[k] or 0 for k in agg}


def serialize(pkg):
    return {'id': pkg.id, 'code': pkg.package_code, 'index': pkg.package_index, 'total': pkg.package_total,
            'seal_number': pkg.seal_number, 'weight_kg': float(pkg.weight_kg), 'cbm': float(pkg.cbm),
            'recipient_name': pkg.recipient_name, 'recipient_address': pkg.recipient_address, 'status': pkg.status,
            'status_label': pkg.get_status_display(), 'scanned_at_pickup': pkg.scanned_at_pickup.isoformat() if pkg.scanned_at_pickup else None,
            'scanned_at_delivery': pkg.scanned_at_delivery.isoformat() if pkg.scanned_at_delivery else None,
            'delivered_seal_ok': pkg.delivered_seal_ok, 'note': pkg.note, 'token': package_token(pkg)}


def _clean_item(raw):
    seal = (raw.get('seal_number') or '').strip().upper()
    if not seal:
        raise ValidationError('Mỗi kiện phải có số seal.')
    try:
        weight, cbm = float(raw.get('weight_kg') or 0), float(raw.get('cbm') or 0)
    except (TypeError, ValueError):
        raise ValidationError('Trọng lượng/số khối không hợp lệ.')
    if weight < 0 or cbm < 0:
        raise ValidationError('Trọng lượng/số khối không được âm.')
    return {'seal_number': seal[:50], 'weight_kg': weight, 'cbm': cbm,
            'recipient_name': (raw.get('recipient_name') or '').strip()[:150],
            'recipient_address': (raw.get('recipient_address') or '').strip()[:255]}


@transaction.atomic
def add_packages(trip, items):
    """Thêm kiện cho chuyến (đánh số tiếp theo). Chỉ khi chuyến chưa nhận cont; không trùng số seal trong chuyến."""
    trip = DispatchTrip.objects.select_for_update().get(pk=trip.pk)
    if trip.step_status not in ('READY', 'ARRIVED_AT_PICKUP'):
        raise ValidationError('Chuyến đã nhận cont, không thêm kiện được nữa.')
    items = [_clean_item(i) for i in items or []]
    if not items:
        raise ValidationError('Chưa có kiện nào.')
    existing = list(TripPackageSeal.objects.filter(trip=trip, is_deleted=False))
    if len(existing) + len(items) > MAX_PACKAGES_PER_TRIP:
        raise ValidationError(f'Tối đa {MAX_PACKAGES_PER_TRIP} kiện mỗi chuyến.')
    seals = {norm_seal(p.seal_number) for p in existing}
    for it in items:
        key = norm_seal(it['seal_number'])
        if key in seals:
            raise ValidationError(f'Số seal {it["seal_number"]} bị trùng trong chuyến.')
        seals.add(key)
    start = max((p.package_index for p in existing), default=0)
    total = len(existing) + len(items)
    created = [TripPackageSeal.objects.create(trip=trip, package_index=start + i + 1, package_total=total,
                                              package_code=f'{trip.trip_code}-K{start + i + 1:03d}', **it)
               for i, it in enumerate(items)]
    TripPackageSeal.objects.filter(trip=trip, is_deleted=False).update(package_total=total)
    return created


def remove_package(pkg, reason=''):
    if pkg.trip.step_status not in ('READY', 'ARRIVED_AT_PICKUP') or pkg.status != PackageStatus.CREATED:
        raise ValidationError('Kiện đã được xử lý, không xóa được.')
    pkg.delete()
    remaining = TripPackageSeal.objects.filter(trip=pkg.trip, is_deleted=False)
    remaining.update(package_total=remaining.count())


# ---------- quét kiện ----------
@transaction.atomic
def scan_package(pkg, phase, *, seal_seen='', damaged=False, note='', actor_label='', ip=''):
    """Quét một kiện. phase: 'PICKUP' (bốc lên xe) hoặc 'DELIVERY' (giao). Trả dict kết quả kèm cảnh báo."""
    pkg = TripPackageSeal.objects.select_for_update().select_related('trip').get(pk=pkg.pk)
    trip, now, warnings = pkg.trip, timezone.now(), []
    if trip.step_status == 'CANCELLED':
        raise ValidationError('Chuyến đã hủy.')
    result = 'OK'
    if phase == 'PICKUP':
        if trip.step_status not in ('READY', 'ARRIVED_AT_PICKUP'):
            raise ValidationError('Chuyến đã rời điểm nhận, không quét bốc hàng nữa.')
        if pkg.status == PackageStatus.CREATED:
            pkg.status, pkg.scanned_at_pickup = PackageStatus.LOADED, now
        else:
            warnings.append('Kiện này đã được quét bốc lên xe trước đó.')
            result = 'WARN'
    elif phase == 'DELIVERY':
        if trip.step_status not in ('LOADED_ON_VEHICLE', 'ARRIVED_AT_DELIVERY', 'UNLOADED'):
            raise ValidationError('Chuyến chưa ở bước giao hàng.')
        if pkg.status == PackageStatus.CREATED:
            raise ValidationError('Kiện chưa được quét bốc lên xe.')
        if pkg.status == PackageStatus.DELIVERED:
            warnings.append('Kiện này đã giao rồi.')
            result = 'WARN'
        else:
            seal_ok = norm_seal(seal_seen) == norm_seal(pkg.seal_number) if seal_seen else None
            pkg.scanned_at_delivery = now
            pkg.delivered_seal_ok = seal_ok
            if damaged:
                pkg.status, result = PackageStatus.DAMAGED, 'FAIL'
                warnings.append('Kiện bị rách/hỏng seal, đã ghi nhận sự cố.')
            elif seal_ok is False:
                pkg.status, result = PackageStatus.DAMAGED, 'FAIL'
                warnings.append(f'SEAL KHÔNG KHỚP: hệ thống {pkg.seal_number}, thực tế {seal_seen.strip().upper()}.')
            else:
                pkg.status = PackageStatus.DELIVERED
                if seal_ok is None:
                    warnings.append('Chưa đối chiếu số seal thực tế trên kiện.')
                    result = 'WARN'
    else:
        raise ValidationError('Giai đoạn quét không hợp lệ.')
    if note:
        pkg.note = note[:255]
    pkg.save()
    if result == 'FAIL':
        from core.models import TrackingEventLog
        TrackingEventLog.objects.create(trip=trip, event_type='SEAL_ALERT', title=f'Cảnh báo kiện {pkg.package_code}',
                                        description='; '.join(warnings), metadata={'package': pkg.package_code, 'by': actor_label})
    log_scan('PACKAGE', pkg.pk, f'SCAN_{phase}', result, '; '.join(warnings), actor_label, ip)
    return {'package': serialize(pkg), 'warnings': warnings, 'result': result, 'summary': summary(trip)}


def guard_step(trip, target):
    """Chốt chặn của workflow: hàng lẻ phải quét đủ kiện mới được sang bước tương ứng."""
    if not trip.pk:
        return
    s = summary(trip)
    if not s['total']:
        return
    if target == 'LOADED_ON_VEHICLE' and s['loaded'] < s['total']:
        raise ValidationError(f'Mới quét bốc {s["loaded"]}/{s["total"]} kiện lên xe, hãy quét đủ kiện.')
    if target == 'UNLOADED':
        if s['problem']:
            raise ValidationError(f'Có {s["problem"]} kiện hỏng/thiếu/sai seal, điều vận cần xử lý trước khi chốt giao.')
        if s['delivered'] < s['total']:
            raise ValidationError(f'Mới giao {s["delivered"]}/{s["total"]} kiện, hãy quét đủ kiện.')
