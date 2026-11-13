"""Đối soát cước nhà xe (GSS): nhập cước thỏa thuận/tạm ứng theo từng cont, chốt đối soát khi đủ chứng từ, xuất Excel.

Phạm vi cố ý hẹp: chỉ đưa chuyến tới trạng thái `RECONCILING` (Đối soát). Duyệt công nợ, phiếu chi và quyết toán tiền vẫn ở phân hệ Kế toán
(ghi sổ quỹ/sổ cái), nên không có đường nào ở đây làm lệch sổ.
"""
import datetime
import io
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from django.utils import timezone

from apps.dispatch.gss_workflow import STAGE_LABELS, STEP_LABELS
from apps.dispatch.models import DispatchTrip

EDITABLE = ('PENDING', 'RECONCILING')
STATUS_LABELS = {'PENDING': 'Chờ đối soát', 'RECONCILING': 'Đã chốt đối soát', 'APPROVED': 'Đã duyệt công nợ', 'PARTIAL': 'Thanh toán 1 phần', 'SETTLED': 'Đã quyết toán'}
MAX_AMOUNT = Decimal('100000000000')


def queryset(vendor_id=None, status='', date_from=None, date_to=None, search='', bl=''):
    qs = DispatchTrip.objects.filter(is_deleted=False, subcontractor__isnull=False).exclude(step_status='CANCELLED') \
        .select_related('subcontractor', 'vehicle', 'trailer', 'booking_order', 'customer')
    qs = qs.annotate(**{f'n_{s.lower()}': Count('documents', filter=Q(documents__workflow_stage=s, documents__is_deleted=False) & ~Q(documents__file_path=''), distinct=True)
                        for s in STAGE_LABELS})
    if vendor_id:
        qs = qs.filter(subcontractor_id=vendor_id)
    if status in STATUS_LABELS:
        qs = qs.filter(subcontractor_settlement_status=status)
    if date_from:
        qs = qs.filter(Q(loading_date__gte=date_from) | Q(loading_date__isnull=True, created_at__date__gte=date_from))
    if date_to:
        qs = qs.filter(Q(loading_date__lte=date_to) | Q(loading_date__isnull=True, created_at__date__lte=date_to))
    if bl:
        bl = bl.strip()
        qs = qs.filter(Q(booking_order__hbl_number__icontains=bl) | Q(booking_order__mbl_number__icontains=bl)
                       | Q(booking_order__booking_number__icontains=bl) | Q(booking_order__booking_code__icontains=bl))
    if search:
        qs = qs.filter(Q(container_number__icontains=search) | Q(container_number_2__icontains=search)
                       | Q(return_container_number__icontains=search) | Q(trip_code__icontains=search)
                       | Q(vehicle__license_plate__icontains=search) | Q(booking_order__booking_code__icontains=search)
                       | Q(booking_order__mbl_number__icontains=search) | Q(booking_order__hbl_number__icontains=search))


    return qs.order_by('subcontractor__name', '-created_at')


def parse_date(value, label):
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(str(value))
    except ValueError:
        raise ValidationError(f'{label} không hợp lệ (YYYY-MM-DD).')


def docs_complete(t):
    return all(getattr(t, f'n_{s.lower()}', 0) >= 1 for s in STAGE_LABELS)


def row(t):
    cost, adv = int(t.subcontractor_cost or 0), int(t.subcontractor_advance or 0)
    done = t.step_status == 'EMPTY_RETURNED'
    return {
        'trip_code': t.trip_code, 'booking_code': t.booking_order.booking_code if t.booking_order_id else '', 'vendor_id': t.subcontractor_id,
        'vendor': t.subcontractor.short_name or t.subcontractor.name, 'container_number': t.container_number,
        'return_container_number': t.return_container_number, 'swapped': t.is_container_swapped,
        'tractor_plate': t.vehicle.license_plate if t.vehicle_id else '', 'step': t.step_status, 'step_label': STEP_LABELS.get(t.step_status, t.step_status),
        'completed': done, 'docs': {s: getattr(t, f'n_{s.lower()}', 0) for s in STAGE_LABELS}, 'docs_complete': docs_complete(t),
        'loading_date': t.loading_date.isoformat() if t.loading_date else '', 'cost': cost, 'advance': adv, 'remaining': max(0, cost - adv),
        'status': t.subcontractor_settlement_status, 'status_label': STATUS_LABELS.get(t.subcontractor_settlement_status, t.subcontractor_settlement_status),
        'editable': t.subcontractor_settlement_status in EDITABLE, 'notes': t.subcontractor_notes,
        'can_reconcile': done and cost > 0 and docs_complete(t) and t.subcontractor_settlement_status == 'PENDING',
    }


def summarize(rows):
    out = {}
    for r in rows:
        s = out.setdefault(r['vendor_id'], {'vendor_id': r['vendor_id'], 'vendor': r['vendor'], 'trips': 0, 'completed': 0, 'cost': 0, 'advance': 0, 'remaining': 0, 'reconciled': 0})
        s['trips'] += 1
        s['completed'] += 1 if r['completed'] else 0
        s['cost'] += r['cost']; s['advance'] += r['advance']; s['remaining'] += r['remaining']
        s['reconciled'] += 1 if r['status'] != 'PENDING' else 0
    return list(out.values())


def _money(value, label):
    try:
        d = Decimal(str(value if value not in (None, '') else 0))
    except InvalidOperation:
        raise ValidationError(f'{label} không hợp lệ.')
    if d < 0 or d > MAX_AMOUNT or d != d.to_integral_value():
        raise ValidationError(f'{label} phải là số nguyên đồng từ 0 đến {int(MAX_AMOUNT):,}.')
    return d


def update_cost(trip, cost, advance, notes, user):
    if trip.subcontractor_settlement_status not in EDITABLE:
        raise ValidationError('Chuyến đã duyệt công nợ/quyết toán. Hãy hoàn tác ở phân hệ Kế toán trước khi sửa cước.')
    c, a = _money(cost, 'Cước thỏa thuận'), _money(advance, 'Tạm ứng')
    if a > c:
        raise ValidationError('Tạm ứng không được lớn hơn cước thỏa thuận.')
    changes = {'cost': (int(trip.subcontractor_cost), int(c)), 'advance': (int(trip.subcontractor_advance), int(a))}
    trip.subcontractor_cost, trip.subcontractor_advance = c, a
    trip.subcontractor_notes = str(notes or '').strip()[:255]
    # Sửa cước sau khi đã chốt đối soát thì phải chốt lại
    if trip.subcontractor_settlement_status == 'RECONCILING' and (changes['cost'][0] != changes['cost'][1] or changes['advance'][0] != changes['advance'][1]):
        trip.subcontractor_settlement_status = 'PENDING'
    trip.save(update_fields=['subcontractor_cost', 'subcontractor_advance', 'subcontractor_notes', 'subcontractor_settlement_status', 'updated_at'])
    _log(trip, 'SETTLE_COST', 'Cập nhật cước nhà xe', user, {k: {'old': v[0], 'new': v[1]} for k, v in changes.items()})
    return trip


def reconcile(trip, user, reason=''):
    """Chốt đối soát: yêu cầu hạ rỗng xong, có cước, đủ chứng từ 3 chặng. Nhân viên có thể bỏ qua chứng từ kèm lý do."""
    if trip.subcontractor_settlement_status != 'PENDING':
        raise ValidationError('Chuyến không ở trạng thái chờ đối soát.')
    if trip.step_status != 'EMPTY_RETURNED':
        raise ValidationError('Chỉ chốt đối soát khi chuyến đã hạ rỗng xong.')
    if not trip.subcontractor_cost or trip.subcontractor_cost <= 0:
        raise ValidationError('Chưa nhập cước thỏa thuận.')
    missing = [STAGE_LABELS[s] for s in STAGE_LABELS if _count(trip, s) < 1]
    if missing:
        if len((reason or '').strip()) < 5:
            raise ValidationError('Thiếu chứng từ chặng: ' + ', '.join(missing) + '. Bổ sung chứng từ, hoặc nhập lý do (≥ 5 ký tự) để chốt ngoại lệ.')
    trip.subcontractor_settlement_status = 'RECONCILING'
    trip.save(update_fields=['subcontractor_settlement_status', 'updated_at'])
    _log(trip, 'SETTLE_RECONCILED', 'Chốt đối soát cước nhà xe', user, {'missing_docs': missing, 'reason': reason})
    return trip


def reopen(trip, user, reason):
    if trip.subcontractor_settlement_status != 'RECONCILING':
        raise ValidationError('Chỉ mở lại được chuyến đang ở trạng thái đã chốt đối soát.')
    if len((reason or '').strip()) < 5:
        raise ValidationError('Cần nhập lý do mở lại (≥ 5 ký tự).')
    trip.subcontractor_settlement_status = 'PENDING'
    trip.save(update_fields=['subcontractor_settlement_status', 'updated_at'])
    _log(trip, 'SETTLE_REOPENED', 'Mở lại đối soát cước nhà xe', user, {'reason': reason})
    return trip


def _count(trip, stage):
    from apps.dispatch.gss_workflow import stage_file_count
    return stage_file_count(trip, stage)


def _log(trip, event, title, user, meta):
    from core.models import TrackingEventLog
    TrackingEventLog.objects.create(trip=trip, event_type=event, title=title, description='', metadata={**meta, 'by': user.get_username() if user else ''})


def export_xlsx(rows, summary):
    """Excel đối soát: sheet tổng hợp theo nhà xe + sheet chi tiết từng cont. Ô văn bản được chống chèn công thức."""
    from openpyxl import Workbook
    from openpyxl.styles import Font
    from core.validators import excel_safe
    wb = Workbook()
    ws = wb.active
    ws.title = 'Tổng hợp nhà xe'
    ws.append(['Nhà xe', 'Số chuyến', 'Đã hạ rỗng', 'Cước thỏa thuận', 'Đã tạm ứng', 'Còn phải trả', 'Đã chốt đối soát'])
    for s in summary:
        ws.append([excel_safe(s['vendor']), s['trips'], s['completed'], s['cost'], s['advance'], s['remaining'], s['reconciled']])
    ws.append(['TỔNG', sum(s['trips'] for s in summary), sum(s['completed'] for s in summary), sum(s['cost'] for s in summary),
               sum(s['advance'] for s in summary), sum(s['remaining'] for s in summary), sum(s['reconciled'] for s in summary)])
    d = wb.create_sheet('Chi tiết cont')
    d.append(['Nhà xe', 'Mã chuyến', 'Booking', 'Số cont', 'Cont hạ rỗng (đổi vỏ)', 'Biển số xe', 'Ngày hẹn', 'Bước hiện tại', 'Chứng từ nhận', 'Chứng từ giao', 'Chứng từ hạ',
              'Cước thỏa thuận', 'Tạm ứng', 'Còn phải trả', 'Trạng thái', 'Ghi chú'])
    for r in rows:
        d.append([excel_safe(r['vendor']), r['trip_code'], excel_safe(r['booking_code']), excel_safe(r['container_number']), excel_safe(r['return_container_number'] if r['swapped'] else ''),
                  excel_safe(r['tractor_plate']), r['loading_date'], r['step_label'], r['docs']['PICKUP'], r['docs']['DELIVERY'], r['docs']['EMPTY_RETURN'],
                  r['cost'], r['advance'], r['remaining'], r['status_label'], excel_safe(r['notes'])])
    for sheet in (ws, d):
        for c in sheet[1]:
            c.font = Font(bold=True)
        sheet.freeze_panes = 'A2'
        for col in sheet.columns:
            sheet.column_dimensions[col[0].column_letter].width = min(40, max(12, max(len(str(c.value or '')) for c in col) + 2))
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
