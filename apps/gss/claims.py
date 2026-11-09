"""Chi hộ / chi phí phát sinh do tài xế khai và hoá đơn điện tử (đặc tả §5.6, §5.8).

- Tài xế (qua QR, không đăng nhập) hoặc nhân viên khai: khoản phí, số tiền, ảnh hoá đơn (bắt buộc chụp).
- Kế toán duyệt → sinh dòng giá: BUY (trả lại nhà xe đã ứng) và SELL (thu lại của khách nếu là chi hộ).
- Hoá đơn điện tử: đọc chuỗi QR in trên hoá đơn (giao diện giải mã ảnh, máy chủ phân tích), nhập tay hoặc tải XML (nguồn sự thật).
  Chặn trùng (MST người bán + ký hiệu + số) và chặn một hoá đơn gắn hai chuyến; cảnh báo khi người mua không phải khách hàng
  của chuyến (chi hộ phải đứng tên khách); đối chiếu số tiền giữa khai báo, QR/OCR và XML.
- OCR ảnh hoá đơn chưa có (cần dịch vụ OCR); trường `source='OCR'` để dành.
"""
import re
import uuid
from decimal import Decimal
from xml.etree import ElementTree

from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.gss.models import ChargeCode, CostClaim, EInvoice, JobCharge
from apps.gss.pricing import money, sync_trip_totals

_TAX_RE = re.compile(r'^\d{10}(-\d{3})?$')
_SERIES_RE = re.compile(r'^[0-9][A-Z]\d{2}[A-Z]{3}$|^[A-Z0-9]{1,2}[A-Z]{2}/\d{2}[A-Z]$|^[A-Z0-9/]{4,12}$')


def _label(user, fallback):
    return user.get_username() if (user is not None and getattr(user, 'is_authenticated', False)) else fallback


def _save_file(f, folder):
    from core.validators import optimize_and_resize_image, sanitize_filename, validate_uploaded_document
    validate_uploaded_document(f)
    opt = optimize_and_resize_image(f)
    name = default_storage.save(f'{folder}/{uuid.uuid4().hex}_{sanitize_filename(opt.name)}', opt)
    return f'/media/{name}'


# ------------------------------------------------------------------ khai chi phí
@transaction.atomic
def submit_claim(trip, *, charge_code, amount, description='', photo=None, payer='VENDOR', bill_to_customer=None, user=None, label=''):
    if trip.step_status == 'CANCELLED':
        raise ValidationError('Chuyến đã huỷ.')
    if not isinstance(charge_code, ChargeCode) or not charge_code.is_active:
        raise ValidationError('Chưa chọn khoản phí hợp lệ.')
    amt = money(amount, 'Số tiền')
    if amt <= 0:
        raise ValidationError('Số tiền phải lớn hơn 0.')
    if payer not in ('VENDOR', 'COMPANY'):
        raise ValidationError('Người chi không hợp lệ.')
    staff = user is not None and getattr(user, 'is_authenticated', False)
    if photo is None and not staff:
        raise ValidationError('Phải chụp ảnh hoá đơn/biên lai khi khai chi phí.')
    path = _save_file(photo, f'gss_claims/{trip.trip_code}') if photo is not None else ''
    if CostClaim.objects.filter(trip=trip, is_deleted=False).count() >= 30:
        raise ValidationError('Chuyến đã có quá nhiều khoản khai.')
    claim = CostClaim.objects.create(
        trip=trip, charge_code=charge_code, amount=amt, description=str(description or '')[:255], payer=payer,
        bill_to_customer=(charge_code.kind == 'REIMBURSABLE') if bill_to_customer is None else bool(bill_to_customer),
        photo_path=path, submitted_label=(label or _label(user, 'tài xế qua QR'))[:150], company=trip.company)
    from core.models import TrackingEventLog
    TrackingEventLog.objects.create(trip=trip, event_type='COST_CLAIM', title=f'Khai {charge_code.name}: {int(amt):,} đ'.replace(',', '.'),
                                    description=claim.description, metadata={'claim_id': claim.id, 'by': claim.submitted_label})
    return claim


@transaction.atomic
def review_claim(claim, *, approve, user, note=''):
    claim = CostClaim.objects.select_for_update().get(pk=claim.pk)
    if claim.status != 'PENDING':
        raise ValidationError('Khoản khai đã được xử lý.')
    if not approve and len((note or '').strip()) < 5:
        raise ValidationError('Cần nhập lý do từ chối (≥ 5 ký tự).')
    claim.status = 'APPROVED' if approve else 'REJECTED'
    claim.reviewed_by, claim.reviewed_at, claim.review_note = user, timezone.now(), str(note or '')[:255]
    claim.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_note', 'updated_at'])
    if approve:
        trip = claim.trip
        common = dict(trip=trip, charge_code=claim.charge_code, description=(claim.description or claim.charge_code.name)[:255],
                      quantity=Decimal('1'), unit='TRIP', unit_price=claim.amount, amount=claim.amount, vat_rate=Decimal('0'),
                      source='CLAIM', created_by=user, company=trip.company,
                      snapshot={'claim_id': claim.id, 'invoice': str(claim.einvoice) if claim.einvoice_id else '', 'approved_by': user.get_username()})
        if claim.payer == 'VENDOR' and trip.subcontractor_id:
            JobCharge.objects.create(side='BUY', claim=claim, **common)
        if claim.bill_to_customer:
            JobCharge.objects.create(side='SELL', claim=None if (claim.payer == 'VENDOR' and trip.subcontractor_id) else claim, **common)
        sync_trip_totals(trip)
    return claim


def serialize_claim(c):
    inv = c.einvoice
    return {'id': c.id, 'trip_code': c.trip.trip_code, 'container_number': c.trip.container_number,
            'vendor': (c.trip.subcontractor.short_name or c.trip.subcontractor.name) if c.trip.subcontractor_id else '',
            'charge_code': c.charge_code.code, 'charge_name': c.charge_code.name, 'kind': c.charge_code.kind,
            'amount': str(c.amount), 'description': c.description, 'payer': c.payer, 'bill_to_customer': c.bill_to_customer,
            'photo': c.photo_path, 'status': c.status, 'status_label': c.get_status_display(), 'submitted_by': c.submitted_label,
            'submitted_at': c.created_at.isoformat(), 'review_note': c.review_note,
            'reviewed_by': c.reviewed_by.get_username() if c.reviewed_by_id else '',
            'einvoice': serialize_invoice(inv) if inv else None}


# ------------------------------------------------------------------ hoá đơn điện tử
def parse_qr(text):
    """Phân tích chuỗi QR trên hoá đơn điện tử (nhiều định dạng nhà cung cấp): tìm MST, ký hiệu, số, ngày, tổng tiền, mã tra cứu."""
    raw = str(text or '').strip()
    if not raw or len(raw) > 2000:
        raise ValidationError('Chuỗi QR trống hoặc quá dài.')
    out = {'raw_qr': raw}
    url = re.search(r'https?://\S+', raw)
    if url:
        out['lookup_url'] = url.group(0)[:255]
        q = dict(re.findall(r'[?&]([A-Za-z_]+)=([^&]+)', url.group(0)))
        for k, v in q.items():
            kl = k.lower()
            if kl in ('mst', 'taxcode', 'masothue', 'sellertaxcode'):
                out['seller_tax_code'] = v
            elif kl in ('khhdon', 'kyhieu', 'series', 'pattern'):
                out['series'] = v.upper()
            elif kl in ('shdon', 'sohoadon', 'number', 'invoiceno', 'no'):
                out['number'] = v
            elif kl in ('matracuu', 'code', 'lookupcode', 'mtc'):
                out['lookup_code'] = v
    parts = [p.strip() for p in re.split(r'[|;\n\t]+', raw) if p.strip()]
    for p in parts:
        up = p.upper()
        if 'seller_tax_code' not in out and _TAX_RE.match(p):
            out['seller_tax_code'] = p
        elif 'series' not in out and re.match(r'^[0-9][A-Z]\d{2}[A-Z]{3}$', up):
            out['series'] = up
        elif 'issue_date' not in out and re.match(r'^\d{4}-\d{2}-\d{2}|^\d{2}/\d{2}/\d{4}$|^\d{8}$', p):
            out['issue_date'] = _parse_date(p)
        elif 'number' not in out and re.match(r'^\d{1,8}$', p) and 'series' in out:
            out['number'] = p.lstrip('0') or '0'
        elif 'total_amount' not in out and re.match(r'^\d{1,15}([.,]\d{1,2})?$', p) and 'number' in out:
            out['total_amount'] = p.replace(',', '.')
    if not out.get('seller_tax_code') or not out.get('series') or not out.get('number'):
        raise ValidationError('Không đọc được đủ MST người bán, ký hiệu và số hoá đơn từ mã QR. Hãy nhập tay.')
    return out


def _parse_date(v):
    v = str(v or '').strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y%m%d'):
        try:
            return timezone.datetime.strptime(v[:10], fmt).date()
        except ValueError:
            continue
    return None


def _strip_ns(tag):
    return tag.rsplit('}', 1)[-1]


def parse_xml(data):
    """XML hoá đơn theo chuẩn TCVN của Tổng cục Thuế (HDon/DLHDon/TTChung, NDHDon/NBan, NMua, TToan)."""
    if len(data) > 2 * 1024 * 1024:
        raise ValidationError('File XML quá lớn.')
    if b'<!DOCTYPE' in data[:2000].upper() or b'<!ENTITY' in data.upper():
        raise ValidationError('File XML chứa khai báo DOCTYPE/ENTITY, không được chấp nhận.')
    try:
        root = ElementTree.fromstring(data)
    except ElementTree.ParseError:
        raise ValidationError('File XML không hợp lệ.')
    found = {}
    for el in root.iter():
        found.setdefault(_strip_ns(el.tag), []).append(el)

    def first(path):
        """path: 'NBan/MST' – tìm phần tử con trong phần tử cha theo tên (bỏ namespace)."""
        parent, child = path.split('/') if '/' in path else (None, path)
        for el in found.get(parent or child, []):
            if parent is None:
                return (el.text or '').strip()
            for c in el:
                if _strip_ns(c.tag) == child:
                    return (c.text or '').strip()
        return ''

    out = {
        'seller_tax_code': first('NBan/MST'), 'seller_name': first('NBan/Ten'), 'buyer_name': first('NMua/Ten'),
        'buyer_tax_code': first('NMua/MST'), 'series': (first('TTChung/KHHDon') or '').upper(),
        'number': (first('TTChung/SHDon') or '').lstrip('0') or '', 'issue_date': _parse_date(first('TTChung/NLap')),
        'amount_before_vat': first('TToan/TgTCThue') or '0', 'vat_amount': first('TToan/TgTThue') or '0',
        'total_amount': first('TToan/TgTTTBSo') or '0', 'lookup_code': first('MCCQT') or '',
    }
    khmshd = first('TTChung/KHMSHDon')
    if khmshd and out['series'] and not out['series'][0].isdigit():
        out['series'] = f'{khmshd}{out["series"]}'
    if not out['seller_tax_code'] or not out['series'] or not out['number']:
        raise ValidationError('XML thiếu MST người bán, ký hiệu hoặc số hoá đơn.')
    return out


def _norm(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip().upper()


def _checks(inv, trip, claim_amount=None):
    checks = {}
    if trip is not None:
        cust = trip.customer
        tax = (getattr(cust, 'tax_code', '') or '').strip()
        if inv.buyer_tax_code or inv.buyer_name:
            match = (tax and inv.buyer_tax_code and tax == inv.buyer_tax_code) or (_norm(inv.buyer_name) and _norm(inv.buyer_name) == _norm(cust.name))
            checks['buyer_is_customer'] = bool(match)
            if not match:
                checks['buyer_warning'] = f'Hoá đơn đứng tên "{inv.buyer_name or inv.buyer_tax_code}", không phải khách hàng {cust.name}. Chi hộ phải đứng tên khách.'
    if claim_amount is not None and inv.total_amount:
        diff = (Decimal(inv.total_amount) - Decimal(claim_amount)).copy_abs()
        checks['amount_match'] = diff <= Decimal('1')
        if diff > Decimal('1'):
            checks['amount_warning'] = f'Số tiền hoá đơn {int(inv.total_amount):,} khác số khai {int(Decimal(claim_amount)):,}.'.replace(',', '.')
    return checks


@transaction.atomic
def register_invoice(data, *, trip=None, claim=None, source='MANUAL', user=None, xml_file=None, image=None):
    """Ghi nhận hoá đơn (trạng thái chờ xác nhận). Trùng hoá đơn / hoá đơn đã gắn chuyến khác → lỗi rõ ràng."""
    seller = re.sub(r'\s', '', str(data.get('seller_tax_code') or ''))
    series = str(data.get('series') or '').strip().upper()
    number = str(data.get('number') or '').strip().lstrip('0')
    if not _TAX_RE.match(seller):
        raise ValidationError('MST người bán không hợp lệ (10 hoặc 13 số).')
    if not series or len(series) > 12:
        raise ValidationError('Ký hiệu hoá đơn không hợp lệ.')
    if not number.isdigit() or len(number) > 12:
        raise ValidationError('Số hoá đơn không hợp lệ.')
    trip = trip or (claim.trip if claim else None)
    dup = EInvoice.objects.filter(seller_tax_code=seller, series=series, number=number, is_deleted=False).select_related('trip').first()
    if dup:
        if dup.trip_id and trip is not None and dup.trip_id != trip.id:
            raise ValidationError(f'Hoá đơn {series}/{number} đã khai cho chuyến {dup.trip.trip_code} (cont {dup.trip.container_number}). Một hoá đơn không gắn cho hai container.')
        raise ValidationError(f'Hoá đơn {series}/{number} của MST {seller} đã được khai trước đó.')
    inv = EInvoice(seller_tax_code=seller, series=series, number=number, seller_name=str(data.get('seller_name') or '')[:255],
                   issue_date=data.get('issue_date') if not isinstance(data.get('issue_date'), str) else _parse_date(data.get('issue_date')),
                   buyer_name=str(data.get('buyer_name') or '')[:255], buyer_tax_code=str(data.get('buyer_tax_code') or '')[:14],
                   amount_before_vat=money(data.get('amount_before_vat'), 'Tiền trước thuế'), vat_amount=money(data.get('vat_amount'), 'Tiền thuế'),
                   total_amount=money(data.get('total_amount'), 'Tổng tiền'), lookup_code=str(data.get('lookup_code') or '')[:60],
                   lookup_url=str(data.get('lookup_url') or '')[:255], raw_qr=str(data.get('raw_qr') or '')[:2000], source=source,
                   trip=trip, company=trip.company if trip else None)
    if xml_file is not None:
        name = default_storage.save(f'gss_invoices/xml/{uuid.uuid4().hex}.xml', xml_file)
        inv.xml_path = f'/media/{name}'
    if image is not None:
        inv.image_path = _save_file(image, 'gss_invoices/img')
    inv.checks = _checks(inv, trip, claim.amount if claim else None)
    try:
        with transaction.atomic():
            inv.save()
    except IntegrityError:
        raise ValidationError('Hoá đơn này đã được khai trước đó.')
    if claim is not None:
        claim.einvoice = inv
        claim.save(update_fields=['einvoice', 'updated_at'])
    return inv


@transaction.atomic
def attach_xml(inv, data_bytes, fileobj=None):
    """Tải XML gốc về sau: XML là nguồn sự thật, ghi đè số tiền/người mua và đối chiếu lại."""
    parsed = parse_xml(data_bytes)
    if (parsed['seller_tax_code'], parsed['series'], parsed['number']) != (inv.seller_tax_code, inv.series, inv.number):
        raise ValidationError('XML không khớp MST / ký hiệu / số của hoá đơn đang chọn.')
    before = {'total': str(inv.total_amount)}
    for k in ('seller_name', 'buyer_name', 'buyer_tax_code', 'lookup_code'):
        if parsed.get(k):
            setattr(inv, k, parsed[k][:255])
    inv.issue_date = parsed.get('issue_date') or inv.issue_date
    inv.amount_before_vat, inv.vat_amount, inv.total_amount = (money(parsed['amount_before_vat']), money(parsed['vat_amount']),
                                                               money(parsed['total_amount']))
    if fileobj is not None:
        fileobj.seek(0)
        name = default_storage.save(f'gss_invoices/xml/{uuid.uuid4().hex}.xml', fileobj)
        inv.xml_path = f'/media/{name}'
    claim = inv.claims.filter(is_deleted=False).first()
    inv.checks = {**_checks(inv, inv.trip, claim.amount if claim else None),
                  'xml_vs_previous': {'before': before['total'], 'xml': str(inv.total_amount),
                                      'match': before['total'] in ('0.00', str(inv.total_amount))}}
    inv.source = 'XML'
    inv.save()
    return inv


@transaction.atomic
def confirm_invoice(inv, *, user, accept=True, note=''):
    if inv.status != 'PENDING':
        raise ValidationError('Hoá đơn đã được xử lý.')
    if not accept and len((note or '').strip()) < 5:
        raise ValidationError('Cần lý do từ chối (≥ 5 ký tự).')
    inv.status = 'CONFIRMED' if accept else 'REJECTED'
    inv.confirmed_by, inv.confirmed_at = user, timezone.now()
    inv.checks = {**(inv.checks or {}), 'review_note': note}
    inv.save(update_fields=['status', 'confirmed_by', 'confirmed_at', 'checks', 'updated_at'])
    return inv


def serialize_invoice(inv):
    return {'id': inv.id, 'seller_tax_code': inv.seller_tax_code, 'seller_name': inv.seller_name, 'series': inv.series, 'number': inv.number,
            'issue_date': inv.issue_date.isoformat() if inv.issue_date else None, 'buyer_name': inv.buyer_name, 'buyer_tax_code': inv.buyer_tax_code,
            'amount_before_vat': str(inv.amount_before_vat), 'vat_amount': str(inv.vat_amount), 'total_amount': str(inv.total_amount),
            'lookup_code': inv.lookup_code, 'lookup_url': inv.lookup_url, 'source': inv.source, 'status': inv.status,
            'status_label': inv.get_status_display(), 'checks': inv.checks, 'xml': inv.xml_path, 'image': inv.image_path,
            'trip_code': inv.trip.trip_code if inv.trip_id else None, 'container_number': inv.trip.container_number if inv.trip_id else ''}
