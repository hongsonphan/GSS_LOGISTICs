"""API GSS theo đặc tả 08/11/2026: danh sách cont theo B/L, phân bổ theo cont (+Excel hai pha), tờ khai, free time,
biểu giá, dòng giá chuyến, chi hộ + hoá đơn, bảng kê đối soát, phiếu giao hàng theo điểm giao, lệnh điều vận in,
chứng từ đặt tên chuẩn (zip), street-turn, Trip Card. Mọi lỗi nghiệp vụ trả {'success': False, 'message'} mã 400."""
import datetime

from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import Http404, HttpResponse
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.customers.models import BookingOrder, Customer
from apps.dispatch.models import DispatchTrip
from apps.gss import claims as cl
from apps.gss import containers as cs
from apps.gss import docs as dc
from apps.gss import journey as jr
from apps.gss import pricing as pr
from apps.gss import statements as stm
from apps.gss.models import (ChargeCode, CostClaim, CustomsDeclarationRef, DeliveryNote, EInvoice, FreeTimeRule, JobCharge,
                             RateCard, RateLine, Statement)
from apps.master_data.models import Location, Subcontractor
from core.permissions import IsBookingStaff, IsDispatcher, IsFinanceStaff, IsPricing, IsTripFinance

XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
PARSERS = (JSONParser, MultiPartParser, FormParser)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'message': message}, status=code)


def vmsg(exc):
    return ' '.join(getattr(exc, 'messages', None) or [str(exc)])


def ok(data=None, message='', code=status.HTTP_200_OK, **extra):
    body = {'success': True, **extra}
    if message:
        body['message'] = message
    if data is not None:
        body['data'] = data
    return Response(body, status=code)


def booking_or_404(pk):
    b = BookingOrder.objects.select_related('customer', 'delivery_loc').filter(pk=pk, is_deleted=False).first()
    if not b:
        raise Http404
    return b


def trip_or_404(code):
    t = DispatchTrip.objects.select_related('customer', 'subcontractor', 'vehicle', 'trailer', 'booking_order', 'warehouse_loc') \
        .filter(trip_code=code, is_deleted=False).first()
    if not t:
        raise Http404
    return t


def obj_or_404(model, pk, **flt):
    o = model.objects.filter(pk=pk, **flt).first()
    if o is None or getattr(o, 'is_deleted', False):
        raise Http404
    return o


def parse_date(value, label, required=False):
    if not value:
        if required:
            raise ValidationError(f'Thiếu {label}.')
        return None
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except ValueError:
        raise ValidationError(f'{label} không hợp lệ (YYYY-MM-DD).')


def xlsx(content, name):
    resp = HttpResponse(content, content_type=XLSX)
    resp['Content-Disposition'] = f'attachment; filename="{name}"'
    resp['Cache-Control'] = 'no-store'
    return resp


def html(content):
    resp = HttpResponse(content, content_type='text/html; charset=utf-8')
    resp['Cache-Control'] = 'no-store'
    resp['X-Frame-Options'] = 'SAMEORIGIN'
    return resp


class Base(APIView):
    parser_classes = PARSERS

    def handle_exception(self, exc):
        if isinstance(exc, ValidationError):
            return err(vmsg(exc))
        return super().handle_exception(exc)


# ================================================================== B/L: danh sách cont
class BookingContainersAPI(Base):
    """GET: danh sách cont + tiến độ. POST: nhập cont (dán `text` hoặc file `file`); `commit=0` chỉ kiểm tra."""
    permission_classes = [IsBookingStaff]

    def get(self, request, pk):
        b = booking_or_404(pk)
        return ok({'booking_id': b.id, 'booking_code': b.booking_code, 'bl_number': b.hbl_number or b.mbl_number,
                   'containers': cs.list_for(b), 'progress': cs.progress(b), 'container_mode': cs.has_container_list(b)})

    def post(self, request, pk):
        b = booking_or_404(pk)
        f = request.FILES.get('file')
        if f is not None:
            if f.size > 3 * 1024 * 1024:
                return err('File quá lớn (tối đa 3MB).')
            rows = cs.parse_xlsx(f)
        elif 'rows' in request.data and isinstance(request.data.get('rows'), list):
            rows = request.data.get('rows')
        else:
            rows = cs.parse_text(request.data.get('text'))
        if not rows:
            return err('Chưa có dòng cont nào.')
        commit = str(request.data.get('commit', '1')) not in ('0', 'false', 'False')
        skip = str(request.data.get('skip_invalid', '0')) in ('1', 'true', 'True')
        out = cs.import_containers(b, rows, user=request.user, commit=commit, skip_invalid=skip)
        if out['committed']:
            out['applied_free_time'] = cs.apply_free_time(b, overwrite_days=False) if b.discharge_date or b.eta else {}
        msg = (f"Đã ghi {out['create']} cont mới, cập nhật {out['update']} cont." if out['committed']
               else (f"Có {out['errors']} dòng lỗi, chưa ghi gì." if out['errors'] else f"Hợp lệ {out['valid']} dòng, bấm xác nhận để ghi."))
        return ok(out, msg, containers=cs.list_for(b) if out['committed'] else None)


class ContainerDetailAPI(Base):
    permission_classes = [IsBookingStaff]

    def patch(self, request, pk):
        from apps.gss.models import BookingContainer
        c = obj_or_404(BookingContainer, pk)
        d = request.data
        fields = []
        if 'tractor_plate' in d or 'driver_name' in d:
            plate = str(d.get('tractor_plate') or '').strip().upper()
            driver = str(d.get('driver_name') or '').strip()
            if c.trip_id:
                t = c.trip
                if plate:
                    t.subcontractor_truck = plate
                if driver:
                    t.subcontractor_driver_name = driver
                t.save(update_fields=['subcontractor_truck', 'subcontractor_driver_name', 'updated_at'])
            note_parts = []
            if plate:
                note_parts.append(f'Xe: {plate}')
            if driver:
                note_parts.append(f'Tài: {driver}')
            if note_parts:
                c.notes = ' | '.join(note_parts)
                fields.append('notes')
        if 'container_number' in d:
            num = cs.normalize_container(d.get('container_number'))
            if not cs._CONT_TOKEN.match(num):
                return err('Số cont không hợp lệ (gồm 4-15 ký tự chữ và số).')
            if BookingContainer.objects.filter(booking=c.booking, container_number=num, is_deleted=False).exclude(pk=c.pk).exists():
                return err(f'Số cont {num} đã tồn tại trong đơn hàng này.')
            c.container_number = num
            c.raw_input = str(d.get('container_number') or '')[:60]
            c.iso_valid = cs.iso6346_valid(num)
            fields.extend(['container_number', 'raw_input', 'iso_valid'])
        if 'container_type' in d:
            c.container_type = str(d.get('container_type') or '').strip().upper()[:10]
            fields.append('container_type')
        if 'seal_number' in d:
            c.seal_number = str(d.get('seal_number') or '').strip().upper()[:50]
            fields.append('seal_number')
        if 'gross_weight_kg' in d:
            w = d.get('gross_weight_kg')
            c.gross_weight_kg = pr.money(w, 'Trọng lượng') if w not in (None, '') else None
            fields.append('gross_weight_kg')
        if 'delivery_loc_id' in d:
            lid = d.get('delivery_loc_id')
            c.delivery_loc = Location.objects.filter(pk=lid, is_active=True).first() if lid else None
            if lid and c.delivery_loc is None:
                return err('Địa điểm giao không hợp lệ.')
            fields.append('delivery_loc')
        if 'delivery_address' in d:
            c.delivery_address = str(d.get('delivery_address') or '').strip()[:255]
            fields.append('delivery_address')
        for k, label in (('dem_expiry_override', 'Hạn DEM riêng'), ('det_expiry_override', 'Hạn DET riêng')):
            if k in d:
                setattr(c, k, parse_date(d.get(k), label))
                fields.append(k)
        if 'notes' in d:
            c.notes = str(d.get('notes') or '')[:255]
            fields.append('notes')
        if not fields:
            return err('Không có trường nào để cập nhật.')
        c.save(update_fields=fields + ['updated_at'])
        if c.trip_id:
            cs._apply_container_to_trip(c, c.trip)
        cs._audit(c.booking, 'update', request.user, {'container': c.container_number, 'fields': fields})
        return ok(cs.serialize(c), 'Đã cập nhật cont.')

    def delete(self, request, pk):
        from apps.gss.models import BookingContainer
        c = obj_or_404(BookingContainer, pk)
        cs.remove_container(c, user=request.user, reason=str(request.data.get('reason') or ''))
        return ok(None, 'Đã xoá container khỏi danh sách.')
        return ok(None, 'Đã xoá cont khỏi danh sách.')


class AssignContainersAPI(Base):
    """Giao cont cho nhà xe (subcontractor_id rỗng = bỏ phân bổ). Phiếu mới thì trả link một lần."""
    permission_classes = [IsBookingStaff]

    def post(self, request, pk):
        b = booking_or_404(pk)
        sid = request.data.get('subcontractor_id')
        sub = None
        if sid not in (None, '', 0, '0'):
            sub = Subcontractor.objects.filter(pk=sid, is_deleted=False).first()
            if sub is None:
                return err('Nhà xe không hợp lệ.')
        ids = request.data.get('container_ids') or []
        if not isinstance(ids, list) or len(ids) > 1000:
            return err('Danh sách cont không hợp lệ.')
        out = cs.assign(b, ids, sub, user=request.user, reason=str(request.data.get('reason') or ''))
        link = request.build_absolute_uri(f"/vendor/{out['raw_token']}/") if out['raw_token'] else None
        msg = f"Đã đổi phân bổ {len(out['changed'])} cont." + (f" {len(out['errors'])} cont không đổi được." if out['errors'] else '')
        return ok({'changed': out['changed'], 'errors': out['errors'], 'containers': cs.list_for(b), 'progress': cs.progress(b)}, msg, link=link)


class AllocationTemplateAPI(Base):
    permission_classes = [IsDispatcher]

    def get(self, request, pk):
        from apps.gss import vendor_excel
        b = booking_or_404(pk)
        if not cs.has_container_list(b):
            return err('Booking chưa có danh sách cont.')
        return vendor_excel.allocation_template(b)


class AllocationImportAPI(Base):
    """Pha 1 (POST file): kiểm tra + xem trước, `?as=xlsx` trả file đánh dấu lỗi. Pha 2: POST commit/ {token}."""
    permission_classes = [IsDispatcher]

    def post(self, request, pk):
        from apps.gss import vendor_excel
        b = booking_or_404(pk)
        f = request.FILES.get('file')
        if not f or f.size > 3 * 1024 * 1024:
            return err('Chọn file Excel phân bổ (.xlsx, tối đa 3MB).')
        preview = vendor_excel.preview_allocation(b, f, request.user)
        if request.query_params.get('as') == 'xlsx':
            return vendor_excel.error_workbook(b, preview)
        msg = (f"Có {preview['errors']} dòng lỗi, tải file kết quả để sửa." if preview['errors']
               else (f"Sẽ thay đổi {preview['changes']} cont. Bấm xác nhận để ghi." if preview['changes'] else 'Không có thay đổi nào.'))
        return ok(preview, msg)


class AllocationImportCommitAPI(Base):
    permission_classes = [IsDispatcher]

    def post(self, request, pk):
        from apps.gss import vendor_excel
        b = booking_or_404(pk)
        out = vendor_excel.commit_allocation(b, str(request.data.get('token') or ''), request.user, str(request.data.get('reason') or ''))
        return ok({**out, 'containers': cs.list_for(b), 'progress': cs.progress(b)}, f"Đã áp dụng {out['applied']} thay đổi phân bổ.")


class BookingOverviewAPI(Base):
    """Tiến độ B/L + điểm giao + tờ khai + phiếu giao hàng đã lập (dùng cho màn chi tiết đơn hàng)."""
    permission_classes = [IsBookingStaff]

    def get(self, request, pk):
        b = booking_or_404(pk)
        return ok({'booking_id': b.id, 'booking_code': b.booking_code, 'mbl_number': b.mbl_number, 'hbl_number': b.hbl_number,
                   'progress': cs.progress(b), 'stops': jr.stops_of(b),
                   'customs': [_customs_json(c) for c in b.customs_refs.filter(is_deleted=False)],
                   'delivery_notes': [_note_json(n) for n in b.delivery_notes.filter(is_deleted=False)],
                   'dem_expiry': b.dem_expiry.isoformat() if b.dem_expiry else None, 'det_expiry': b.det_expiry.isoformat() if b.det_expiry else None,
                   'free_time': {'DEM': getattr(cs.match_rule(b, 'DEM'), 'name', None), 'DET': getattr(cs.match_rule(b, 'DET'), 'name', None)}})


class ApplyFreeTimeAPI(Base):
    permission_classes = [IsBookingStaff]

    def post(self, request, pk):
        b = booking_or_404(pk)
        applied = cs.apply_free_time(b)
        cs.propagate_expiry(b)
        if not applied:
            return err('Không có quy tắc free time nào khớp hãng tàu / khách / loại cont của đơn.')
        b.refresh_from_db()
        return ok({'applied': applied, 'free_time_demurrage': b.free_time_demurrage, 'free_time_detention': b.free_time_detention,
                   'dem_expiry': b.dem_expiry.isoformat() if b.dem_expiry else None, 'det_expiry': b.det_expiry.isoformat() if b.det_expiry else None},
                  'Đã áp quy tắc free time: ' + ', '.join(f'{k}: {v}' for k, v in applied.items()))


# ------------------------------------------------------------------ tờ khai
def _customs_json(c):
    return {'id': c.id, 'number': c.number, 'declared_on': c.declared_on.isoformat() if c.declared_on else None, 'channel': c.channel,
            'channel_label': c.get_channel_display(), 'note': c.note}


class CustomsRefsAPI(Base):
    permission_classes = [IsBookingStaff]

    def get(self, request, pk):
        b = booking_or_404(pk)
        return ok([_customs_json(c) for c in b.customs_refs.filter(is_deleted=False)])

    def post(self, request, pk):
        b = booking_or_404(pk)
        num = str(request.data.get('number') or '').strip().upper()
        if not num or len(num) > 30:
            return err('Số tờ khai không hợp lệ.')
        if b.customs_refs.filter(number=num, is_deleted=False).exists():
            return err('Tờ khai đã có trong đơn.')
        ch = str(request.data.get('channel') or '')
        if ch not in dict(CustomsDeclarationRef.CHANNELS):
            return err('Luồng tờ khai không hợp lệ.')
        c = CustomsDeclarationRef.objects.create(booking=b, number=num, declared_on=parse_date(request.data.get('declared_on'), 'Ngày tờ khai'),
                                                 channel=ch, note=str(request.data.get('note') or '')[:255], company=b.company)
        return ok(_customs_json(c), 'Đã thêm tờ khai.', code=status.HTTP_201_CREATED)


class CustomsRefDetailAPI(Base):
    permission_classes = [IsBookingStaff]

    def delete(self, request, pk):
        c = obj_or_404(CustomsDeclarationRef, pk)
        c.delete()
        return ok(None, 'Đã xoá tờ khai.')


# ------------------------------------------------------------------ free time
def _rule_json(r):
    return {'id': r.id, 'name': r.name, 'shipping_line': r.shipping_line, 'customer_id': r.customer_id, 'customer': r.customer.name if r.customer_id else '',
            'container_type': r.container_type, 'kind': r.kind, 'free_days': r.free_days, 'start_event': r.start_event,
            'start_event_label': r.get_start_event_display(), 'is_active': r.is_active}


def _save_rule(r, d):
    name = str(d.get('name') or '').strip()
    if not name:
        raise ValidationError('Cần tên quy tắc.')
    kind = d.get('kind')
    if kind not in ('DEM', 'DET'):
        raise ValidationError('Loại quy tắc phải là DEM hoặc DET.')
    try:
        days = int(d.get('free_days'))
        if not 0 <= days <= 120:
            raise ValueError
    except (TypeError, ValueError):
        raise ValidationError('Số ngày miễn phí phải từ 0 đến 120.')
    ev = d.get('start_event') or 'DISCHARGE'
    if ev not in dict(FreeTimeRule.START_EVENTS):
        raise ValidationError('Mốc bắt đầu tính không hợp lệ.')
    cid = d.get('customer_id')
    r.customer = Customer.objects.filter(pk=cid, is_deleted=False).first() if cid else None
    if cid and r.customer is None:
        raise ValidationError('Khách hàng không hợp lệ.')
    r.name, r.kind, r.free_days, r.start_event = name[:120], kind, days, ev
    r.shipping_line = str(d.get('shipping_line') or '').strip().upper()[:50]
    r.container_type = str(d.get('container_type') or '').strip().upper()[:10]
    r.is_active = bool(d.get('is_active', True))
    r.save()
    return r


class FreeTimeRulesAPI(Base):
    permission_classes = [IsBookingStaff]

    def get(self, request):
        return ok([_rule_json(r) for r in FreeTimeRule.objects.filter(is_deleted=False).select_related('customer')])

    def post(self, request):
        return ok(_rule_json(_save_rule(FreeTimeRule(), request.data)), 'Đã thêm quy tắc.', code=status.HTTP_201_CREATED)


class FreeTimeRuleDetailAPI(Base):
    permission_classes = [IsBookingStaff]

    def put(self, request, pk):
        return ok(_rule_json(_save_rule(obj_or_404(FreeTimeRule, pk), request.data)), 'Đã lưu quy tắc.')

    def delete(self, request, pk):
        obj_or_404(FreeTimeRule, pk).delete()
        return ok(None, 'Đã xoá quy tắc.')


# ------------------------------------------------------------------ lệnh điều vận, phiếu giao hàng, chứng từ
class DispatchOrderPrintAPI(Base):
    permission_classes = [IsDispatcher]

    def get(self, request, pk):
        b = booking_or_404(pk)
        vid = request.query_params.get('vendor')
        vendor = Subcontractor.objects.filter(pk=vid).first() if vid else None
        if vid and vendor is None:
            raise Http404
        return html(jr.dispatch_order_html(b, vendor))


def _note_json(n):
    return {'id': n.id, 'code': n.code, 'stop_label': n.stop_label, 'template_code': n.template_code, 'created_at': n.created_at.isoformat(),
            'containers': n.data_snapshot.get('containers', []), 'signed_scan': n.signed_scan_path,
            'by': n.created_by.get_username() if n.created_by_id else ''}


class DeliveryNotesAPI(Base):
    permission_classes = [IsBookingStaff]

    def get(self, request, pk):
        b = booking_or_404(pk)
        return ok({'stops': jr.stops_of(b), 'notes': [_note_json(n) for n in b.delivery_notes.filter(is_deleted=False)]})

    def post(self, request, pk):
        b = booking_or_404(pk)
        note = jr.create_delivery_note(b, str(request.data.get('stop_key') or ''), user=request.user)
        return ok(_note_json(note), f'Đã lập phiếu giao hàng {note.code}.', code=status.HTTP_201_CREATED)


class DeliveryNoteDetailAPI(Base):
    permission_classes = [IsBookingStaff]

    def get(self, request, pk):
        return html(obj_or_404(DeliveryNote, pk).html_snapshot)

    def post(self, request, pk):
        note = obj_or_404(DeliveryNote, pk)
        f = request.FILES.get('file')
        if not f:
            return err('Chọn file scan phiếu có chữ ký.')
        jr.attach_signed_scan(note, f, request.user)
        return ok(_note_json(note), 'Đã lưu bản scan có chữ ký.')


class BookingDocumentsAPI(Base):
    """GET: cây thư mục ảo các chứng từ của B/L (tên chuẩn). ?zip=1: tải zip theo cây."""
    permission_classes = [IsBookingStaff]

    def get(self, request, pk):
        b = booking_or_404(pk)
        trips = list(DispatchTrip.objects.filter(booking_order=b, is_deleted=False).select_related('booking_order', 'subcontractor').order_by('id'))
        if request.query_params.get('zip') == '1':
            content, n, _missing = dc.zip_bytes(trips)
            if not n:
                return err('Đơn chưa có chứng từ nào.')
            resp = HttpResponse(content, content_type='application/zip')
            resp['Content-Disposition'] = f'attachment; filename="chung-tu-{dc._safe(b.hbl_number or b.mbl_number or b.booking_code)}.zip"'
            resp['Cache-Control'] = 'no-store'
            return resp
        return ok(dc.tree(trips))


# ================================================================== biểu giá
def _charge_json(c):
    return {'id': c.id, 'code': c.code, 'name': c.name, 'kind': c.kind, 'kind_label': c.get_kind_display(), 'vat_rate': str(c.vat_rate),
            'revenue_account': c.revenue_account, 'cost_account': c.cost_account, 'is_active': c.is_active}


def _save_charge(c, d):
    import re
    code = str(d.get('code') or c.code or '').strip().upper()
    if not re.match(r'^[A-Z0-9_\-]{2,20}$', code):
        raise ValidationError('Mã khoản phí 2–20 ký tự chữ/số.')
    if ChargeCode.objects.filter(code=code, is_deleted=False).exclude(pk=c.pk).exists():
        raise ValidationError('Mã khoản phí đã tồn tại.')
    name = str(d.get('name') or '').strip()
    if not name:
        raise ValidationError('Cần tên khoản phí.')
    kind = d.get('kind') or 'FREIGHT'
    if kind not in dict(ChargeCode.KINDS):
        raise ValidationError('Loại khoản phí không hợp lệ.')
    vat = pr.money(d.get('vat_rate', 8 if kind != 'REIMBURSABLE' else 0), 'VAT')
    if vat > 100:
        raise ValidationError('VAT không hợp lệ.')
    c.code, c.name, c.kind, c.vat_rate = code, name[:120], kind, vat
    c.revenue_account = str(d.get('revenue_account') or '')[:10]
    c.cost_account = str(d.get('cost_account') or '')[:10]
    c.is_active = bool(d.get('is_active', True))
    c.save()
    return c


class ChargeCodesAPI(Base):
    permission_classes = [IsPricing]

    def get(self, request):
        pr.ensure_default_charge_codes()
        return ok([_charge_json(c) for c in ChargeCode.objects.filter(is_deleted=False)])

    def post(self, request):
        return ok(_charge_json(_save_charge(ChargeCode(), request.data)), 'Đã thêm khoản phí.', code=status.HTTP_201_CREATED)


class ChargeCodeDetailAPI(Base):
    permission_classes = [IsPricing]

    def put(self, request, pk):
        return ok(_charge_json(_save_charge(obj_or_404(ChargeCode, pk), request.data)), 'Đã lưu khoản phí.')

    def delete(self, request, pk):
        c = obj_or_404(ChargeCode, pk)
        if JobCharge.objects.filter(charge_code=c, is_deleted=False).exists() or RateLine.objects.filter(charge_code=c).exists():
            c.is_active = False
            c.save(update_fields=['is_active', 'updated_at'])
            return ok(None, 'Khoản phí đã được dùng nên chỉ ngừng sử dụng.')
        c.delete()
        return ok(None, 'Đã xoá khoản phí.')


def _save_card(card, d):
    side = d.get('side') or card.side
    if side not in ('SELL', 'BUY'):
        raise ValidationError('Chiều bảng giá phải là bán (SELL) hoặc mua (BUY).')
    code = str(d.get('code') or card.code or '').strip().upper()[:40]
    name = str(d.get('name') or '').strip()
    if not code or not name:
        raise ValidationError('Cần mã và tên bảng giá.')
    card.side, card.code, card.name = side, code, name[:150]
    card.customer, card.subcontractor = None, None
    pid = d.get('customer_id') if side == 'SELL' else d.get('subcontractor_id')
    if pid:
        model = Customer if side == 'SELL' else Subcontractor
        party = model.objects.filter(pk=pid, is_deleted=False).first()
        if party is None:
            raise ValidationError('Đối tượng áp dụng không hợp lệ.')
        if side == 'SELL':
            card.customer = party
        else:
            card.subcontractor = party
    card.valid_from = parse_date(d.get('valid_from'), 'Ngày hiệu lực', required=True)
    card.valid_to = parse_date(d.get('valid_to'), 'Ngày hết hiệu lực')
    if card.valid_to and card.valid_to < card.valid_from:
        raise ValidationError('Ngày hết hiệu lực phải sau ngày bắt đầu.')
    card.notes = str(d.get('notes') or '')[:255]
    card.save()
    return card


class RateCardsAPI(Base):
    permission_classes = [IsPricing]

    def get(self, request):
        qs = RateCard.objects.filter(is_deleted=False).select_related('customer', 'subcontractor')
        side = request.query_params.get('side')
        if side in ('SELL', 'BUY'):
            qs = qs.filter(side=side)
        st = request.query_params.get('status')
        if st in ('DRAFT', 'APPROVED', 'ARCHIVED'):
            qs = qs.filter(status=st)
        return ok([pr.serialize_card(c) for c in qs[:500]])

    def post(self, request):
        card = _save_card(RateCard(status='DRAFT'), request.data)
        pr._audit(card, request.user, {'event': 'CREATE'})
        return ok(pr.serialize_card(card, True), 'Đã tạo bảng giá nháp.', code=status.HTTP_201_CREATED)


class RateCardDetailAPI(Base):
    permission_classes = [IsPricing]

    def get(self, request, pk):
        return ok(pr.serialize_card(obj_or_404(RateCard, pk), True))

    def put(self, request, pk):
        card = obj_or_404(RateCard, pk)
        if card.status != 'DRAFT':
            return err('Bảng giá đã duyệt không sửa được; hãy tạo phiên bản mới.')
        _save_card(card, request.data)
        return ok(pr.serialize_card(card, True), 'Đã lưu bảng giá.')

    def delete(self, request, pk):
        card = obj_or_404(RateCard, pk)
        if card.status != 'DRAFT':
            return err('Chỉ xoá được bảng giá nháp.')
        card.delete()
        return ok(None, 'Đã xoá bảng giá nháp.')


class RateCardActionAPI(Base):
    permission_classes = [IsPricing]
    access_actions = {'POST': 'approve'}

    def post(self, request, pk, action):
        card = obj_or_404(RateCard, pk)
        if action == 'approve':
            pr.approve(card, request.user)
            return ok(pr.serialize_card(card, True), 'Đã duyệt bảng giá.')
        if action == 'new-version':
            new = pr.new_version(card, parse_date(request.data.get('valid_from'), 'Ngày hiệu lực', required=True), request.user)
            return ok(pr.serialize_card(new, True), f'Đã tạo phiên bản {new.version} (nháp).', code=status.HTTP_201_CREATED)
        raise Http404


def _save_line(ln, d):
    cc = ChargeCode.objects.filter(pk=d.get('charge_code_id'), is_deleted=False).first()
    if cc is None:
        raise ValidationError('Chưa chọn khoản phí.')
    ln.charge_code = cc
    for key in ('pickup_loc', 'delivery_loc'):
        lid = d.get(f'{key}_id')
        loc = Location.objects.filter(pk=lid).first() if lid else None
        if lid and loc is None:
            raise ValidationError('Địa điểm không hợp lệ.')
        setattr(ln, key, loc)
    ln.route_text = str(d.get('route_text') or '').strip().upper()[:150]
    ln.container_type = str(d.get('container_type') or '').strip().upper()[:10]
    unit = d.get('unit') or 'CONT'
    if unit not in dict(RateLine.UNITS):
        raise ValidationError('Đơn vị tính không hợp lệ.')
    ln.unit = unit
    ln.unit_price = pr.money(d.get('unit_price'), 'Đơn giá')
    ln.auto_apply = bool(d.get('auto_apply', True))
    ln.notes = str(d.get('notes') or '')[:255]
    ln.save()
    return ln


class RateLinesAPI(Base):
    permission_classes = [IsPricing]

    def post(self, request, pk):
        card = obj_or_404(RateCard, pk)
        if card.status != 'DRAFT':
            return err('Bảng giá đã duyệt không sửa được; hãy tạo phiên bản mới.')
        _save_line(RateLine(card=card), request.data)
        return ok(pr.serialize_card(card, True), 'Đã thêm dòng giá.', code=status.HTTP_201_CREATED)


class RateLineDetailAPI(Base):
    permission_classes = [IsPricing]

    def _line(self, pk):
        ln = RateLine.objects.select_related('card').filter(pk=pk, card__is_deleted=False).first()
        if not ln:
            raise Http404
        if ln.card.status != 'DRAFT':
            raise ValidationError('Bảng giá đã duyệt không sửa được; hãy tạo phiên bản mới.')
        return ln

    def put(self, request, pk):
        ln = _save_line(self._line(pk), request.data)
        return ok(pr.serialize_card(ln.card, True), 'Đã lưu dòng giá.')

    def delete(self, request, pk):
        ln = self._line(pk)
        card = ln.card
        ln.delete()
        return ok(pr.serialize_card(card, True), 'Đã xoá dòng giá.')


# ================================================================== tài chính chuyến (Trip Card)
def _finance_of(trip):
    lines = JobCharge.objects.filter(trip=trip, is_deleted=False).select_related('charge_code')
    t = pr.totals(trip)
    return {'lines': [pr.serialize_line(ln) for ln in lines],
            'totals': {s: {k: str(v) for k, v in d.items()} for s, d in t.items()},
            'claims': [cl.serialize_claim(c) for c in trip.cost_claims.filter(is_deleted=False).select_related('charge_code', 'einvoice', 'trip', 'trip__subcontractor')],
            'invoices': [cl.serialize_invoice(i) for i in trip.einvoices.filter(is_deleted=False)]}


class TripChargesAPI(Base):
    """GET: dòng bán/mua + chi hộ + hoá đơn của chuyến. POST: thêm dòng tay (bắt buộc lý do)."""
    permission_classes = [IsTripFinance]

    def get(self, request, code):
        return ok(_finance_of(trip_or_404(code)))

    def post(self, request, code):
        t = trip_or_404(code)
        cc = ChargeCode.objects.filter(pk=request.data.get('charge_code_id'), is_deleted=False, is_active=True).first()
        if cc is None:
            return err('Chưa chọn khoản phí.')
        pr.add_manual(t, side=request.data.get('side'), charge_code=cc, quantity=request.data.get('quantity', 1),
                      unit_price=request.data.get('unit_price'), description=request.data.get('description') or '',
                      reason=str(request.data.get('reason') or ''), user=request.user)
        return ok(_finance_of(t), 'Đã thêm dòng giá.', code=status.HTTP_201_CREATED)


class JobLineDetailAPI(Base):
    permission_classes = [IsTripFinance]

    def put(self, request, pk):
        ln = obj_or_404(JobCharge, pk)
        d = request.data
        pr.edit_line(ln, quantity=d.get('quantity'), unit_price=d.get('unit_price'), description=d.get('description'),
                     reason=str(d.get('reason') or ''), user=request.user)
        return ok(_finance_of(ln.trip), 'Đã sửa dòng giá.')

    def delete(self, request, pk):
        ln = obj_or_404(JobCharge, pk)
        pr.delete_line(ln, reason=str(request.data.get('reason') or request.query_params.get('reason') or ''), user=request.user)
        return ok(_finance_of(ln.trip), 'Đã xoá dòng giá.')


class TripApplyRatesAPI(Base):
    permission_classes = [IsTripFinance]

    def post(self, request, code):
        t = trip_or_404(code)
        out = pr.apply_rates(t, request.user, force=str(request.data.get('force', '1')) in ('1', 'true', 'True'))
        msg = 'Chuyến đã có giá tự áp.' if out['skipped'] else (f"Đã áp {out['created']} dòng giá." if out['created'] else 'Không có dòng giá nào khớp chuyến.')
        return ok(_finance_of(t), msg)


class TripStreetTurnAPI(Base):
    permission_classes = [IsDispatcher]

    def post(self, request, code):
        t = trip_or_404(code)
        b = BookingOrder.objects.filter(pk=request.data.get('booking_id'), is_deleted=False).first()
        jr.street_turn(t, b, user=request.user, reason=str(request.data.get('reason') or ''))
        return ok({'trip_code': t.trip_code}, f'Đã chuyển street-turn sang booking {b.booking_code}.')


class TripClaimsAPI(Base):
    """Nhân viên khai chi phí thay tài xế (ảnh không bắt buộc với nhân viên)."""
    permission_classes = [IsTripFinance]

    def post(self, request, code):
        t = trip_or_404(code)
        cc = ChargeCode.objects.filter(pk=request.data.get('charge_code_id'), is_deleted=False, is_active=True).exclude(kind='FREIGHT').first()
        payer = request.data.get('payer') or 'VENDOR'
        cl.submit_claim(t, charge_code=cc, amount=request.data.get('amount'), description=request.data.get('description') or '',
                        photo=request.FILES.get('photo'), payer=payer, user=request.user)
        return ok(_finance_of(t), 'Đã ghi nhận khoản khai.', code=status.HTTP_201_CREATED)


class TripCardAPI(Base):
    """Trip Card: B/L, tờ khai, khách, cont, seal, DEM/DET đếm ngược, nhà xe/xe/tài, timeline đầy đủ (gồm đổi vỏ, street-turn,
    qua trạm), thư viện chứng từ (tên chuẩn), dòng giá + chi hộ + hoá đơn (chỉ người có quyền tài chính chuyến)."""
    permission_classes = [IsDispatcher]

    def get(self, request, code):
        from apps.dispatch.api_views.gss import trip_row
        from core.access import can_view_trip_finance
        t = trip_or_404(code)
        b = t.booking_order
        row = trip_row(t)
        events = [{'type': e.event_type, 'title': e.title, 'at': e.event_time.isoformat(), 'by': e.metadata.get('by', ''), 'note': e.description or '',
                   'meta': {k: v for k, v in e.metadata.items() if k in ('place', 'gps', 'export_booking', 'return_container_number', 'swapped')}}
                  for e in t.event_logs.order_by('event_time')[:200]]
        data = {**row, 'bl': {'mbl': b.mbl_number if b else '', 'hbl': b.hbl_number if b else '', 'booking_code': b.booking_code if b else '',
                              'booking_id': b.id if b else None, 'shipping_line': b.shipping_line if b else '', 'vessel_voyage': b.vessel_voyage if b else '',
                              'eta': b.eta.isoformat() if b and b.eta else None, 'do_expiry': b.do_expiry.isoformat() if b and b.do_expiry else None,
                              'customs': [_customs_json(c) for c in b.customs_refs.filter(is_deleted=False)] if b else []},
                'street_turn': {'is': t.is_street_turn, 'booking': t.street_turn_booking.booking_code if t.street_turn_booking_id else '',
                                'reason': t.street_turn_reason},
                'timeline': events, 'documents': dc.tree([t])}
        if can_view_trip_finance(request.user):
            data['finance'] = _finance_of(t)
        return ok(data)


# ================================================================== chi hộ & hoá đơn (kế toán)
class ClaimsAPI(Base):
    permission_classes = [IsFinanceStaff]

    def get(self, request):
        qs = CostClaim.objects.filter(is_deleted=False).select_related('trip', 'trip__subcontractor', 'charge_code', 'einvoice', 'reviewed_by')
        st = request.query_params.get('status')
        if st in ('PENDING', 'APPROVED', 'REJECTED'):
            qs = qs.filter(status=st)
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(trip__trip_code__icontains=q) | Q(trip__container_number__icontains=q) | Q(description__icontains=q))
        return ok([cl.serialize_claim(c) for c in qs[:500]], total=qs.count())


class ClaimReviewAPI(Base):
    permission_classes = [IsFinanceStaff]
    access_actions = {'POST': 'approve'}

    def post(self, request, pk):
        c = obj_or_404(CostClaim, pk)
        approve = str(request.data.get('approve')) in ('1', 'true', 'True')
        cl.review_claim(c, approve=approve, user=request.user, note=str(request.data.get('note') or ''))
        c.refresh_from_db()
        return ok(cl.serialize_claim(c), 'Đã duyệt khoản chi.' if approve else 'Đã từ chối khoản chi.')


class ClaimInvoiceAPI(Base):
    """Gắn hoá đơn cho khoản khai: `qr` (chuỗi QR đã giải mã) / các trường nhập tay / file `xml`."""
    permission_classes = [IsTripFinance]

    def post(self, request, pk):
        c = obj_or_404(CostClaim, pk)
        if c.einvoice_id:
            return err('Khoản khai đã có hoá đơn.')
        x = request.FILES.get('xml')
        if x is not None:
            data, source = cl.parse_xml(x.read()), 'XML'
            x.seek(0)
        elif request.data.get('qr'):
            data, source = cl.parse_qr(request.data.get('qr')), 'QR'
            for k in ('total_amount', 'buyer_name', 'buyer_tax_code'):
                if request.data.get(k):
                    data[k] = request.data.get(k)
        else:
            data, source = {k: request.data.get(k) for k in ('seller_tax_code', 'seller_name', 'series', 'number', 'issue_date', 'buyer_name',
                                                             'buyer_tax_code', 'amount_before_vat', 'vat_amount', 'total_amount', 'lookup_code')}, 'MANUAL'
        inv = cl.register_invoice(data, claim=c, source=source, user=request.user, xml_file=x, image=request.FILES.get('image'))
        return ok(cl.serialize_invoice(inv), 'Đã ghi nhận hoá đơn, chờ kế toán xác nhận.', code=status.HTTP_201_CREATED)


class ParseQrAPI(Base):
    permission_classes = [IsTripFinance]

    def post(self, request):
        return ok(cl.parse_qr(request.data.get('qr')))


class InvoiceOcrPreviewAPI(Base):
    """Nhận ảnh hóa đơn để trích xuất OCR (nếu đã cấu hình) hoặc trả fallback nhập tay (MANUAL)."""
    permission_classes = [IsTripFinance]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        from apps.gss import ocr
        return ok({
            'ocr_configured': ocr.is_ocr_configured(),
            'einvoice_fetch_configured': ocr.is_einvoice_fetch_configured(),
        })

    def post(self, request):
        from apps.gss import ocr
        return ok(ocr.extract_invoice_from_image(request.FILES.get('file')))

class InvoicesAPI(Base):
    permission_classes = [IsFinanceStaff]

    def get(self, request):
        qs = EInvoice.objects.filter(is_deleted=False).select_related('trip')
        st = request.query_params.get('status')
        if st in ('PENDING', 'CONFIRMED', 'REJECTED'):
            qs = qs.filter(status=st)
        q = (request.query_params.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(number__icontains=q) | Q(seller_tax_code__icontains=q) | Q(trip__container_number__icontains=q) | Q(buyer_name__icontains=q))
        return ok([cl.serialize_invoice(i) for i in qs[:500]], total=qs.count())


class InvoiceActionAPI(Base):
    permission_classes = [IsFinanceStaff]
    access_actions = {'POST': 'approve'}

    def post(self, request, pk, action):
        inv = obj_or_404(EInvoice, pk)
        if action == 'confirm':
            cl.confirm_invoice(inv, user=request.user, accept=str(request.data.get('accept', '1')) in ('1', 'true', 'True'),
                               note=str(request.data.get('note') or ''))
            return ok(cl.serialize_invoice(inv), 'Đã xử lý hoá đơn.')
        if action == 'xml':
            f = request.FILES.get('xml')
            if not f:
                return err('Chọn file XML hoá đơn.')
            cl.attach_xml(inv, f.read(), f)
            return ok(cl.serialize_invoice(inv), 'Đã đối chiếu với XML gốc.')
        raise Http404


# ================================================================== bảng kê
def _party(side, pid):
    model = Customer if side == 'CUSTOMER' else Subcontractor
    p = model.objects.filter(pk=pid, is_deleted=False).first() if pid else None
    if p is None:
        raise ValidationError('Chưa chọn khách hàng / nhà xe.')
    return p


class StatementsAPI(Base):
    permission_classes = [IsFinanceStaff]

    def get(self, request):
        qs = Statement.objects.filter(is_deleted=False).select_related('customer', 'subcontractor', 'locked_by')
        side = request.query_params.get('side')
        if side in ('CUSTOMER', 'VENDOR'):
            qs = qs.filter(side=side)
        st = request.query_params.get('status')
        if st in ('DRAFT', 'LOCKED', 'CANCELLED'):
            qs = qs.filter(status=st)
        return ok([stm.serialize(s) for s in qs[:300]])

    def post(self, request):
        d = request.data
        side = d.get('side')
        party = _party(side, d.get('party_id'))
        s = stm.create(side, party, parse_date(d.get('period_from'), 'Từ ngày', True), parse_date(d.get('period_to'), 'Đến ngày', True),
                       user=request.user, notes=d.get('notes') or '')
        return ok(stm.serialize(s, True), f'Đã lập bảng kê {s.code}.', code=status.HTTP_201_CREATED)


class StatementCandidatesAPI(Base):
    """Xem trước các dòng sẽ vào bảng kê (không ghi)."""
    permission_classes = [IsFinanceStaff]

    def get(self, request):
        q = request.query_params
        side = q.get('side')
        party = _party(side, q.get('party_id'))
        rows = stm.candidates(side, party, parse_date(q.get('period_from'), 'Từ ngày', True), parse_date(q.get('period_to'), 'Đến ngày', True), (q.get('bl') or '').strip())
        return ok([{'trip_code': j.trip.trip_code, 'container': j.trip.container_number, 'charge': j.charge_code.name, 'kind': j.charge_code.kind,
                    'amount': str(j.amount)} for j in rows[:1000]])


class StatementDetailAPI(Base):
    permission_classes = [IsFinanceStaff]

    def get(self, request, pk):
        s = obj_or_404(Statement, pk)
        if request.query_params.get('as') == 'xlsx':
            return xlsx(stm.export_xlsx(s), f'{s.code}.xlsx')
        return ok(stm.serialize(s, True))


class StatementActionAPI(Base):
    permission_classes = [IsFinanceStaff]
    access_actions = {'POST': 'approve'}

    def post(self, request, pk, action):
        s = obj_or_404(Statement, pk)
        if action == 'refresh':
            s = stm.refresh(s, request.user)
            msg = 'Đã làm mới bảng kê.'
        elif action == 'lock':
            s = stm.lock(s, request.user)
            msg = 'Đã chốt bảng kê và ghi sổ phần chi hộ.'
        elif action == 'cancel':
            s = stm.cancel(s, request.user, str(request.data.get('reason') or ''))
            msg = 'Đã huỷ bảng kê.'
        else:
            raise Http404
        return ok(stm.serialize(s, True), msg)


# ================================================================== tra cứu B/L / cont
class LookupAPI(Base):
    """Tra theo số B/L (MBL/HBL), số booking hoặc số cont: toàn bộ cont, chuyến, nhà xe, trạng thái, số chứng từ."""
    permission_classes = [IsBookingStaff]

    def get(self, request):
        from apps.gss.models import BookingContainer
        q = (request.query_params.get('q') or '').strip().upper().replace(' ', '')
        if len(q) < 3:
            return err('Nhập ít nhất 3 ký tự số B/L hoặc số cont.')
        bookings = BookingOrder.objects.filter(is_deleted=False).filter(
            Q(mbl_number__icontains=q) | Q(hbl_number__icontains=q) | Q(booking_number__icontains=q) | Q(booking_code__icontains=q)
            | Q(containers__container_number__icontains=q, containers__is_deleted=False)
            | Q(trips__container_number__icontains=q) | Q(trips__return_container_number__icontains=q)).distinct().select_related('customer')[:20]
        out = []
        for b in bookings:
            conts = cs.list_for(b)
            trips = DispatchTrip.objects.filter(booking_order=b, is_deleted=False).select_related('vehicle', 'subcontractor')
            out.append({'booking_id': b.id, 'booking_code': b.booking_code, 'mbl': b.mbl_number, 'hbl': b.hbl_number,
                        'customer': b.customer.name, 'progress': cs.progress(b) if conts else None, 'containers': conts,
                        'trips': [{'trip_code': t.trip_code, 'container_number': t.container_number, 'step_label': t.get_step_status_display(),
                                   'vendor': (t.subcontractor.short_name or t.subcontractor.name) if t.subcontractor_id else '',
                                   'plate': t.vehicle.license_plate if t.vehicle_id else '', 'docs': t.documents.filter(is_deleted=False).count()}
                                  for t in trips[:300]]})
        del BookingContainer
        return ok(out)


# ================================================================== Chặng & lượt xe (Leg / TruckRun)
class TripLegsAPI(Base):
    """GET: các chặng của chuyến (tự sinh nếu chưa có). POST action=assign (gán chặng vào lượt xe mới/có sẵn)
    hoặc action=rebuild (dựng lại theo mẫu tuyến template_id)."""
    permission_classes = [IsDispatcher]

    def _payload(self, t):
        from apps.gss import legs as lg
        rows = lg.ensure_legs(t)
        return {'trip_code': t.trip_code, 'teu': lg.teu_of(t), 'legs': [lg.serialize_leg(x) for x in rows]}

    def get(self, request, code):
        return ok(self._payload(trip_or_404(code)))

    def post(self, request, code):
        from apps.gss import legs as lg
        from apps.gss.models import Leg, RouteTemplate, TruckRun
        t = trip_or_404(code)
        action = request.data.get('action') or 'assign'
        if action == 'rebuild':
            tpl = RouteTemplate.objects.filter(pk=request.data.get('template_id'), is_deleted=False).first()
            lg.ensure_legs(t, tpl, rebuild=True)
            return ok(self._payload(t), 'Đã dựng lại chặng.')
        ids = request.data.get('leg_ids') or []
        legs = list(Leg.objects.filter(trip=t, pk__in=ids)) if ids else lg.ensure_legs(t)
        run = None
        if request.data.get('truck_run_id'):
            run = TruckRun.objects.filter(pk=request.data.get('truck_run_id'), is_deleted=False).first()
            if run is None:
                raise Http404
        fields = {k: request.data.get(k) for k in ('tractor_plate', 'trailer_plate', 'driver_name', 'driver_phone')}
        if request.data.get('capacity_teu'):
            fields['capacity_teu'] = int(request.data.get('capacity_teu'))
        if t.subcontractor_id:
            fields['subcontractor_id'] = t.subcontractor_id
        run = lg.assign_legs(legs, run=run, **fields)
        return ok(self._payload(t), f'Đã gán vào lượt xe {run.code}.')

class ContainerSampleExcelAPI(Base):
    """Tải file Excel mẫu danh sách 10 cột chuẩn: tiêu đề Teal #0F766E, font Calibri 12px, tách riêng cột Đầu Kéo và Tài Xế."""
    permission_classes = []

    def get(self, request):
        import io
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        wb = Workbook()
        ws = wb.active
        ws.title = 'DanhSachContainer'
        ws.views.sheetView[0].showGridLines = True

        headers = [
            'STT',
            'Số Container',
            'Loại Cont',
            'Số Chì (Seal)',
            'Trọng Lượng VGM (kg)',
            'Nơi Giao Hàng',
            'Nơi Trả Rỗng',
            'Hạn Lệnh DEM/DET',
            'Số Đầu Kéo',
            'Tài Xế'
        ]

        teal_fill = PatternFill(start_color='0F766E', end_color='0F766E', fill_type='solid')
        header_font = Font(name='Calibri', size=12, bold=True, color='FFFFFF')
        data_font = Font(name='Calibri', size=12, bold=False, color='0F172A')
        center_align = Alignment(horizontal='center', vertical='center')
        left_align = Alignment(horizontal='left', vertical='center')
        right_align = Alignment(horizontal='right', vertical='center')
        header_align = Alignment(horizontal='center', vertical='center', wrap_text=True)

        thin_side = Side(border_style='thin', color='CBD5E1')
        thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

        ws.append(headers)
        ws.row_dimensions[1].height = 28

        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = teal_fill
            cell.alignment = header_align
            cell.border = thin_border

        sample_rows = [
            [1, 'MSCU1234565', '40HC', 'MLVN98765', 24500, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '20/11/2026', '51C-123.45', 'Nguyễn Văn An (0901234567)'],
            [2, 'TCNU1234567', '40HC', 'MLVN98766', 26000, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '20/11/2026', '51C-234.56', 'Trần Văn Bình (0902345678)'],
            [3, 'ONEU9988776', '40HC', 'MLVN98767', 25200, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '21/11/2026', '51C-345.67', 'Lê Văn Cường (0903456789)'],
            [4, 'CMAU1122334', '20GP', 'MLVN98768', 18000, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '21/11/2026', '51C-456.78', 'Phạm Văn Dũng (0904567890)'],
            [5, 'EMCU5566778', '40HC', 'MLVN98769', 24800, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '22/11/2026', '51C-567.89', 'Hoàng Văn Em (0905678901)'],
            [6, 'SUDU7890123', '40HC', 'MLVN98770', 25500, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '22/11/2026', '51C-678.90', 'Đỗ Văn Phúc (0906789012)'],
            [7, 'TEMU3456789', '20GP', 'MLVN98771', 19500, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '23/11/2026', '51C-789.01', 'Vũ Văn Giáp (0907890123)'],
            [8, 'YMLU4567890', '40HC', 'MLVN98772', 26200, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '23/11/2026', '51C-890.12', 'Bùi Văn Hùng (0908901234)'],
            [9, 'OOCU5678901', '40HC', 'MLVN98773', 25000, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '24/11/2026', '51C-901.23', 'Ngô Văn Khang (0909012345)'],
            [10, 'WHLU6789012', '40HC', 'MLVN98774', 24700, 'KHO NHÀ MÁY ĐẮK NÔNG', 'CẢNG CÁT LÁI', '24/11/2026', '51C-012.34', 'Lý Văn Long (0909123456)']
        ]

        col_alignments = [
            center_align, center_align, center_align, center_align, right_align,
            left_align, left_align, center_align, center_align, left_align
        ]

        col_widths = [8, 18, 14, 16, 22, 32, 28, 20, 18, 26]
        for col_idx, width in enumerate(col_widths, start=1):
            ws.column_dimensions[get_column_letter(col_idx)].width = width

        for r_idx, r_data in enumerate(sample_rows, start=2):
            ws.row_dimensions[r_idx].height = 22
            for c_idx, val in enumerate(r_data, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                cell.font = data_font
                cell.border = thin_border
                cell.alignment = col_alignments[c_idx - 1]
                if c_idx == 5:
                    cell.number_format = '#,##0'

        bio = io.BytesIO()
        wb.save(bio)
        bio.seek(0)
        return xlsx(bio.getvalue(), 'Mau_Danh_Sach_Container_10_Cot_Chuan_GSS.xlsx')
