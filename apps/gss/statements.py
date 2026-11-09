"""Bảng kê đối soát khách hàng / nhà xe (đặc tả §5.11).

- Lấy các dòng giá (JobCharge) của chuyến ĐÃ HOÀN TẤT trong kỳ (theo ngày hoàn tất), đúng chiều (khách = bán, nhà xe = mua),
  chưa nằm trong bảng kê khác (trừ bảng kê đã huỷ). Chi hộ nằm ở mục riêng, tách khỏi cước.
- Mỗi dòng bảng kê chụp lại đơn giá, số lượng, cont, B/L tại thời điểm lập.
- Chốt (LOCKED) thì khoá, không sửa/xoá dòng; phát sinh bút toán sổ cái nguồn `gss_statement`:
  cước đã ghi theo từng chuyến (posting.build_trip), bảng kê chỉ ghi phần chi hộ để không ghi trùng:
    · Nhà xe: Nợ 138 (phải thu khác – khách) / Có 331 (phải trả nhà xe) cho chi hộ nhà xe đã ứng.
    · Khách hàng: Nợ 131 (phải thu khách) / Có 138 – chuyển chi hộ thành công nợ khách khi gửi bảng kê.
- Huỷ bảng kê đã chốt cần lý do; bút toán bị gỡ.
"""
import datetime
import io
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.gss.models import JobCharge, Statement, StatementLine

SIDE_OF = {'CUSTOMER': 'SELL', 'VENDOR': 'BUY'}


def _bl(trip):
    b = trip.booking_order
    return (b.hbl_number or b.mbl_number or b.booking_number) if b else ''


def candidates(side, party, date_from, date_to):
    if side not in SIDE_OF:
        raise ValidationError('Loại bảng kê không hợp lệ.')
    if date_from > date_to:
        raise ValidationError('Từ ngày phải trước đến ngày.')
    start = timezone.make_aware(datetime.datetime.combine(date_from, datetime.time.min))
    end = timezone.make_aware(datetime.datetime.combine(date_to, datetime.time.max))
    qs = JobCharge.objects.filter(is_deleted=False, side=SIDE_OF[side], trip__is_deleted=False, trip__step_status='EMPTY_RETURNED',
                                  trip__actual_end_time__range=(start, end))
    qs = qs.filter(trip__customer=party) if side == 'CUSTOMER' else qs.filter(trip__subcontractor=party)
    used = StatementLine.objects.filter(statement__is_deleted=False).exclude(statement__status='CANCELLED').values('job_line_id')
    return qs.exclude(pk__in=used).select_related('trip', 'trip__booking_order', 'charge_code').order_by('trip__actual_end_time', 'trip_id', 'id')


def _line_from(job):
    t = job.trip
    reimb = job.charge_code.kind == 'REIMBURSABLE'
    vat = Decimal('0') if reimb else (job.amount * job.vat_rate / 100).quantize(Decimal('1'))
    return dict(trip=t, job_line=job, section='REIMBURSABLE' if reimb else 'FREIGHT',
                description=f'{job.charge_code.name}' + (f' – {job.description}' if job.description and job.description != job.charge_code.name else ''),
                quantity=job.quantity, unit_price=job.unit_price, amount=job.amount, vat_amount=vat,
                snapshot={'trip_code': t.trip_code, 'container': t.container_number, 'return_container': t.return_container_number,
                          'bl': _bl(t), 'booking': t.booking_order.booking_code if t.booking_order_id else '',
                          'completed_at': t.actual_end_time.isoformat() if t.actual_end_time else None, 'charge_code': job.charge_code.code,
                          'source': job.source, 'job_snapshot': job.snapshot})


def _totals(lines):
    tot = {'freight': Decimal('0'), 'vat': Decimal('0'), 'reimbursable': Decimal('0')}
    trips = set()
    for ln in lines:
        trips.add(ln.trip_id)
        if ln.section == 'REIMBURSABLE':
            tot['reimbursable'] += ln.amount
        else:
            tot['freight'] += ln.amount
            tot['vat'] += ln.vat_amount
    grand = tot['freight'] + tot['vat'] + tot['reimbursable']
    return {k: str(v) for k, v in tot.items()} | {'grand': str(grand), 'trips': len(trips), 'lines': len(lines)}


@transaction.atomic
def create(side, party, date_from, date_to, *, user, notes=''):
    from core.sequences import next_code
    jobs = list(candidates(side, party, date_from, date_to))
    if not jobs:
        raise ValidationError('Không có chuyến hoàn tất nào chưa đối soát trong kỳ này.')
    prefix = 'BKKH' if side == 'CUSTOMER' else 'BKNX'
    st = Statement.objects.create(
        code=next_code(Statement, 'code', f'{prefix}.{date_to:%y%m}.', 3), side=side, period_from=date_from, period_to=date_to,
        customer=party if side == 'CUSTOMER' else None, subcontractor=party if side == 'VENDOR' else None,
        notes=str(notes or '')[:255], created_by=user, company=getattr(party, 'company', None))
    objs = [StatementLine(statement=st, **_line_from(j)) for j in jobs]
    StatementLine.objects.bulk_create(objs)
    st.totals = _totals(objs)
    st.save(update_fields=['totals', 'updated_at'])
    return st


@transaction.atomic
def refresh(st, user):
    """Bảng kê nháp: lấy lại dòng (thêm chuyến mới hoàn tất trong kỳ, cập nhật giá đã sửa)."""
    st = Statement.objects.select_for_update().get(pk=st.pk)
    if st.status != 'DRAFT':
        raise ValidationError('Chỉ làm mới được bảng kê nháp.')
    st.lines.all().delete()
    party = st.customer if st.side == 'CUSTOMER' else st.subcontractor
    objs = [StatementLine(statement=st, **_line_from(j)) for j in candidates(st.side, party, st.period_from, st.period_to)]
    StatementLine.objects.bulk_create(objs)
    st.totals = _totals(objs)
    st.save(update_fields=['totals', 'updated_at'])
    return st


@transaction.atomic
def lock(st, user):
    st = Statement.objects.select_for_update().get(pk=st.pk)
    if st.status != 'DRAFT':
        raise ValidationError('Chỉ chốt được bảng kê nháp.')
    lines = list(st.lines.all())
    if not lines:
        raise ValidationError('Bảng kê không có dòng nào.')
    st.totals = _totals(lines)
    st.status, st.locked_by, st.locked_at = 'LOCKED', user, timezone.now()
    st.save(update_fields=['status', 'locked_by', 'locked_at', 'totals', 'updated_at'])
    _audit(st, user, {'event': 'LOCK', 'totals': st.totals})
    from apps.ledger import posting
    posting.post('gss_statement', st)
    return st


@transaction.atomic
def cancel(st, user, reason):
    st = Statement.objects.select_for_update().get(pk=st.pk)
    if st.status == 'CANCELLED':
        raise ValidationError('Bảng kê đã huỷ.')
    if st.status == 'LOCKED' and len((reason or '').strip()) < 5:
        raise ValidationError('Huỷ bảng kê đã chốt cần lý do (≥ 5 ký tự).')
    st.status = 'CANCELLED'
    st.notes = (f'{st.notes} | Huỷ: {reason}' if reason else st.notes)[:255]
    st.save(update_fields=['status', 'notes', 'updated_at'])
    _audit(st, user, {'event': 'CANCEL', 'reason': reason})
    from apps.ledger import posting
    posting.post('gss_statement', st)  # builder trả None khi đã huỷ -> gỡ bút toán
    return st


def _audit(st, user, changes):
    from core.models import AuditLog
    AuditLog.objects.create(actor=user, actor_label=user.get_username(), action='update', model_label='gss.statement', object_id=str(st.pk),
                            object_repr=st.code, changes=changes, company=st.company)


def build_ledger(st):
    """Builder cho apps.ledger.posting (nguồn 'gss_statement'): chỉ phần chi hộ, xem docstring module."""
    if st.is_deleted or st.status != 'LOCKED':
        return None
    from apps.ledger.posting import _d, _partner_of_customer, _partner_of_sub
    lines = []
    for ln in st.lines.filter(section='REIMBURSABLE').select_related('trip', 'trip__customer', 'trip__subcontractor'):
        amount = _d(ln.amount)
        if amount <= 0:
            continue
        cust = _partner_of_customer(ln.trip.customer)
        memo = f'Chi hộ {ln.snapshot.get("container", "")} {ln.description}'[:255]
        if st.side == 'VENDOR':
            lines += [dict(key='other_receivable', debit=amount, partner=cust, trip=ln.trip, memo=memo),
                      dict(key='payable', credit=amount, partner=_partner_of_sub(st.subcontractor), trip=ln.trip, memo=memo)]
        else:
            lines += [dict(key='receivable', debit=amount, partner=cust, trip=ln.trip, memo=memo),
                      dict(key='other_receivable', credit=amount, partner=cust, trip=ln.trip, memo=memo)]
    if not lines:
        return None
    return timezone.localtime(st.locked_at).date() if st.locked_at else st.period_to, f'Bảng kê {st.code} ({st.party_name})'[:500], st.code, lines


def serialize(st, with_lines=False):
    d = {'id': st.id, 'code': st.code, 'side': st.side, 'side_label': st.get_side_display(), 'party': st.party_name,
         'customer_id': st.customer_id, 'subcontractor_id': st.subcontractor_id,
         'period_from': st.period_from.isoformat(), 'period_to': st.period_to.isoformat(), 'status': st.status,
         'status_label': st.get_status_display(), 'totals': st.totals, 'notes': st.notes, 'currency': st.currency,
         'created_at': st.created_at.isoformat(), 'locked_at': st.locked_at.isoformat() if st.locked_at else None,
         'locked_by': st.locked_by.get_username() if st.locked_by_id else ''}
    if with_lines:
        d['lines'] = [{'id': ln.id, 'section': ln.section, 'trip_code': ln.snapshot.get('trip_code'), 'container': ln.snapshot.get('container'),
                       'bl': ln.snapshot.get('bl'), 'completed_at': ln.snapshot.get('completed_at'), 'description': ln.description,
                       'quantity': str(ln.quantity), 'unit_price': str(ln.unit_price), 'amount': str(ln.amount), 'vat_amount': str(ln.vat_amount)}
                      for ln in st.lines.all()]
    return d


def export_xlsx(st):
    from openpyxl import Workbook
    from openpyxl.styles import Font
    from core.validators import excel_safe
    wb = Workbook()
    ws = wb.active
    ws.title = 'Bảng kê'
    ws.append([f'{st.get_side_display().upper()} {st.code}'])
    ws.append([f'Đối tượng: {excel_safe(st.party_name)}', f'Kỳ: {st.period_from:%d/%m/%Y} – {st.period_to:%d/%m/%Y}', f'Trạng thái: {st.get_status_display()}'])
    ws.append([])
    head = ['STT', 'Mã chuyến', 'Số B/L', 'Số cont', 'Ngày hoàn tất', 'Khoản phí', 'SL', 'Đơn giá', 'Thành tiền', 'VAT']
    for section, title in (('FREIGHT', 'I. CƯỚC & PHỤ PHÍ'), ('REIMBURSABLE', 'II. CHI HỘ (không chịu VAT, tách khỏi doanh thu cước)')):
        ws.append([title])
        ws[ws.max_row][0].font = Font(bold=True)
        ws.append(head)
        for c in ws[ws.max_row]:
            c.font = Font(bold=True)
        n = 0
        sub_amt, sub_vat = Decimal('0'), Decimal('0')
        for ln in st.lines.filter(section=section).order_by('id'):
            n += 1
            s = ln.snapshot
            ws.append([n, s.get('trip_code'), excel_safe(s.get('bl', '')), excel_safe(s.get('container', '')), (s.get('completed_at') or '')[:10],
                       excel_safe(ln.description), float(ln.quantity), float(ln.unit_price), float(ln.amount), float(ln.vat_amount)])
            sub_amt += ln.amount
            sub_vat += ln.vat_amount
        ws.append(['', '', '', '', '', 'Cộng mục', '', '', float(sub_amt), float(sub_vat)])
        ws[ws.max_row][5].font = Font(bold=True)
        ws.append([])
    t = st.totals or {}
    ws.append(['', '', '', '', '', 'TỔNG THANH TOÁN', '', '', float(Decimal(t.get('grand', '0')))])
    ws[ws.max_row][5].font = Font(bold=True)
    for col, w in zip('ABCDEFGHIJ', (6, 14, 16, 15, 13, 36, 8, 14, 16, 14)):
        ws.column_dimensions[col].width = w
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
