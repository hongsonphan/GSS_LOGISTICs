"""Nghiệp vụ hành trình bổ sung: street-turn, mốc qua trạm/bãi, phiếu giao hàng theo điểm giao, lệnh điều vận in.

Street-turn: sau khi dỡ hàng nhập (đã "Giao xong"), vỏ chuyển thẳng sang booking xuất → chuyến nhập kết thúc
(step EMPTY_RETURNED, cờ is_street_turn) không cần chặng hạ rỗng và không cần chứng từ hạ rỗng; ghi sự kiện STREET_TURN.
"""
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.html import escape

from apps.dispatch.models import DispatchTrip, TripStatus


@transaction.atomic
def street_turn(trip, export_booking, *, user, reason):
    from core.models import TrackingEventLog
    if not (user and user.is_authenticated):
        raise ValidationError('Chỉ điều vận được chuyển street-turn.')
    trip = DispatchTrip.objects.select_for_update().get(pk=trip.pk)
    if trip.step_status not in ('UNLOADED', 'RETURNING_EMPTY'):
        raise ValidationError('Chỉ street-turn được sau khi đã dỡ hàng xong và trước khi hạ rỗng.')
    if export_booking is None or export_booking.is_deleted:
        raise ValidationError('Chưa chọn booking xuất nhận vỏ.')
    if export_booking.booking_type != 'EXPORT_FCL':
        raise ValidationError('Booking nhận vỏ phải là booking hàng xuất.')
    if export_booking.pk == trip.booking_order_id:
        raise ValidationError('Booking xuất phải khác booking nhập.')
    if len((reason or '').strip()) < 3:
        raise ValidationError('Cần ghi chú lý do / số lệnh street-turn.')
    now = timezone.now()
    trip.is_street_turn, trip.street_turn_booking, trip.street_turn_reason = True, export_booking, reason.strip()[:255]
    trip.step_status, trip.status = 'EMPTY_RETURNED', TripStatus.COMPLETED
    trip.empty_returned_at = trip.empty_returned_at or now
    trip.actual_end_time = now
    trip.save()
    TrackingEventLog.objects.create(trip=trip, event_type='STREET_TURN', title=f'Street-turn sang booking {export_booking.booking_code}',
                                    description=reason, event_time=now,
                                    metadata={'by': user.get_username(), 'export_booking': export_booking.booking_code, 'container': trip.container_number})
    from apps.gss.pricing import on_trip_completed
    on_trip_completed(trip)
    return trip


def record_checkpoint(trip, *, place, note='', actor_label='', gps=None, device_time=None):
    """Mốc phụ 'qua trạm/bãi' (Sóng Thần, Đắk Nông...): chỉ ghi sự kiện, không đổi bước chính."""
    from core.models import TrackingEventLog
    place = str(place or '').strip()
    if len(place) < 2:
        raise ValidationError('Chưa chọn trạm/bãi.')
    if trip.step_status in ('READY', 'EMPTY_RETURNED', 'CANCELLED'):
        raise ValidationError('Chuyến chưa chạy hoặc đã kết thúc.')
    meta = {'place': place[:120], 'by': actor_label[:150] or 'tài xế qua QR', 'server_time': timezone.now().isoformat()}
    if gps:
        meta['gps'] = gps
    if device_time:
        meta['device_time'] = str(device_time)[:40]
    return TrackingEventLog.objects.create(trip=trip, event_type='CHECKPOINT', title=f'Qua {place[:120]}', description=str(note or '')[:500],
                                           metadata=meta)


# ------------------------------------------------------------------ phiếu giao hàng theo điểm giao
def stops_of(booking):
    """Các điểm giao của B/L: theo nơi giao riêng của cont, không có thì nơi giao của B/L."""
    from apps.gss.models import BookingContainer
    stops = {}
    for c in BookingContainer.objects.filter(booking=booking, is_deleted=False).select_related('delivery_loc', 'trip'):
        key = f'L{c.delivery_loc_id}' if c.delivery_loc_id else (f'A:{c.delivery_address.strip().upper()}' if c.delivery_address.strip() else 'DEFAULT')
        label = c.delivery_loc.name if c.delivery_loc_id else (c.delivery_address.strip() or booking.delivery_location)
        s = stops.setdefault(key, {'key': key, 'label': label, 'delivery_loc_id': c.delivery_loc_id, 'containers': [], 'trips': []})
        s['containers'].append(c.container_number)
        if c.trip_id and c.trip.step_status != 'CANCELLED':
            s['trips'].append(c.trip.trip_code)
    if not stops:
        trips = DispatchTrip.objects.filter(booking_order=booking, is_deleted=False).exclude(step_status='CANCELLED')
        stops['DEFAULT'] = {'key': 'DEFAULT', 'label': booking.delivery_location, 'delivery_loc_id': booking.delivery_loc_id,
                            'containers': [t.container_number for t in trips], 'trips': [t.trip_code for t in trips]}
    return list(stops.values())


@transaction.atomic
def create_delivery_note(booking, stop_key, *, user):
    from apps.dispatch import gss_messages as msg
    from apps.gss.models import DeliveryNote
    from core.sequences import next_code
    stop = next((s for s in stops_of(booking) if s['key'] == stop_key), None)
    if not stop:
        raise ValidationError('Không tìm thấy điểm giao.')
    trips = list(DispatchTrip.objects.filter(trip_code__in=stop['trips'], is_deleted=False).select_related('customer', 'vehicle', 'trailer', 'driver'))
    if not trips:
        raise ValidationError('Điểm giao chưa có chuyến xe nào.')
    tpl = booking.pod_template if booking.pod_template_id and booking.pod_template.is_active and not booking.pod_template.is_deleted else msg.pick_template(trips[0])
    ctx = msg.pod_context(trips[0])
    code = next_code(DeliveryNote, 'code', f'PGH.{timezone.localdate():%y%m}.', 3)
    rows = ''.join(
        f'<tr><td>{i}</td><td>{escape(t.container_number)}</td><td>{escape("" if t.seal_number == "-" else t.seal_number)}</td>'
        f'<td>{escape(t.vehicle.license_plate if t.vehicle_id else "")}</td><td>{escape(t.subcontractor_driver_name)}</td>'
        f'<td>{escape(t.get_step_status_display())}</td></tr>' for i, t in enumerate(trips, 1))
    table = ('<h3>Danh sách container giao tại điểm này</h3><table class="grid"><tr><th>STT</th><th>Số cont</th><th>Seal</th><th>Xe</th>'
             '<th>Tài xế</th><th>Tình trạng</th></tr>' + rows + '</table>')
    ctx.update({'trip_code': escape(code), 'container_number': escape(', '.join(t.container_number for t in trips)),
                'delivery_location': escape(stop['label']), 'booking_number': escape(booking.hbl_number or booking.mbl_number or booking.booking_number),
                'packages_table': table})
    parts = (tpl.header_html, tpl.body_html, tpl.terms_html) if tpl else (msg.DEFAULT_POD['header_html'], msg.DEFAULT_POD['body_html'], msg.DEFAULT_POD['terms_html'])
    html = msg._render_pod_html(parts, ctx, tpl.name if tpl else 'Phiếu giao hàng', code)
    note = DeliveryNote.objects.create(code=code, booking=booking, stop_label=str(stop['label'])[:255], delivery_loc_id=stop['delivery_loc_id'],
                                       template_code=tpl.code if tpl else 'DEFAULT', html_snapshot=html, created_by=user, company=booking.company,
                                       data_snapshot={'containers': [t.container_number for t in trips], 'trips': [t.trip_code for t in trips],
                                                      'template_version': tpl.updated_at.isoformat() if tpl else '', 'context': {k: str(v) for k, v in ctx.items() if k != 'packages_table'}})
    note.trips.set(trips)
    return note


def attach_signed_scan(note, fileobj, user):
    from apps.gss.claims import _save_file
    note.signed_scan_path = _save_file(fileobj, f'gss_delivery_notes/{note.code}')
    note.save(update_fields=['signed_scan_path', 'updated_at'])
    return note


# ------------------------------------------------------------------ lệnh điều vận (in)
def auto_delivery_note_for_trip(trip):
    """Tự động sinh Phiếu giao hàng theo PodTemplate khi chuyến hạ hàng/hoàn tất (idempotent, không làm lỗi luồng)."""
    if not trip or not trip.booking_order_id:
        return None
    from apps.gss.models import DeliveryNote
    if DeliveryNote.objects.filter(trips=trip, is_deleted=False).exists():
        return None
    booking = trip.booking_order
    stop = next((s for s in stops_of(booking) if trip.trip_code in s.get('trips', [])), None)
    if not stop:
        return None
    return create_delivery_note(booking, stop['key'], user=None)


def dispatch_order_html(booking, vendor=None):
    """Lệnh điều vận tổng (mọi nhà xe) hoặc chi tiết của một nhà xe. Không có giá cước."""
    from apps.gss import containers as cs
    from apps.master_data.models import CompanyProfile
    co = CompanyProfile.get_default_company()
    rows = [r for r in cs.list_for(booking) if vendor is None or r['vendor_id'] == vendor.id]
    if not rows:
        trips = DispatchTrip.objects.filter(booking_order=booking, is_deleted=False).exclude(step_status='CANCELLED').select_related('vehicle', 'subcontractor')
        if vendor is not None:
            trips = trips.filter(subcontractor=vendor)
        rows = [{'line_no': i, 'container_number': t.container_number, 'container_type': t.container_type, 'seal_number': '' if t.seal_number == '-' else t.seal_number,
                 'vendor': (t.subcontractor.short_name or t.subcontractor.name) if t.subcontractor_id else 'Xe nhà', 'delivery_loc': t.warehouse_location,
                 'delivery_address': '', 'tractor_plate': t.vehicle.license_plate if t.vehicle_id else '', 'driver_name': t.subcontractor_driver_name,
                 'driver_phone': t.subcontractor_driver_phone, 'step_label': t.get_step_status_display()} for i, t in enumerate(trips, 1)]
    summary = {}
    for r in rows:
        summary[r['vendor'] or '(chưa phân bổ)'] = summary.get(r['vendor'] or '(chưa phân bổ)', 0) + 1
    e = escape
    bl = booking.hbl_number or booking.mbl_number or booking.booking_number
    head = (f'<h1>LỆNH ĐIỀU VẬN{" – " + e(vendor.short_name or vendor.name) if vendor else " TỔNG"}</h1>'
            f'<p>{e(co.company_name)} · In lúc {timezone.localtime():%d/%m/%Y %H:%M}</p>'
            '<table class="kv">'
            f'<tr><th>Mã đơn</th><td>{e(booking.booking_code)}</td><th>Số B/L</th><td>{e(bl)}</td></tr>'
            f'<tr><th>Hãng tàu</th><td>{e(booking.shipping_line)}</td><th>Tàu/chuyến</th><td>{e(booking.vessel_voyage)}</td></tr>'
            f'<tr><th>Nơi lấy</th><td>{e(booking.pickup_location)}</td><th>Nơi trả rỗng</th><td>{e(booking.dropoff_location)}</td></tr>'
            f'<tr><th>Nơi giao</th><td colspan="3">{e(booking.delivery_location)}</td></tr>'
            f'<tr><th>Hạn DEM</th><td>{booking.dem_expiry or ""}</td><th>Hạn DET</th><td>{booking.det_expiry or ""}</td></tr>'
            f'<tr><th>Lưu ý điểm đến</th><td colspan="3">{e(booking.destination_notes)}</td></tr>'
            f'<tr><th>Cấm đường/tải</th><td colspan="3">{e(booking.road_restrictions)}</td></tr></table>')
    summ = '' if vendor else ('<h3>Tổng hợp theo nhà xe</h3><table class="grid"><tr><th>Nhà xe</th><th>Số cont</th></tr>'
                              + ''.join(f'<tr><td>{e(k)}</td><td>{v}</td></tr>' for k, v in summary.items()) + '</table>')
    detail = ('<h3>Chi tiết container</h3><table class="grid"><tr><th>STT</th><th>Số cont</th><th>Loại</th><th>Seal</th><th>Nhà xe</th>'
              '<th>Nơi giao</th><th>Đầu kéo</th><th>Tài xế</th><th>SĐT</th><th>Trạng thái</th></tr>'
              + ''.join(f'<tr><td>{i}</td><td>{e(r["container_number"])}</td><td>{e(r["container_type"])}</td><td>{e(r["seal_number"])}</td>'
                        f'<td>{e(r["vendor"])}</td><td>{e(r["delivery_loc"] or r["delivery_address"])}</td><td>{e(r["tractor_plate"])}</td>'
                        f'<td>{e(r["driver_name"])}</td><td>{e(r["driver_phone"])}</td><td>{e(r["step_label"])}</td></tr>'
                        for i, r in enumerate(rows, 1)) + '</table>')
    return ('<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Lệnh điều vận ' + e(booking.booking_code) + '</title>'
            '<style>@page{size:A4 landscape;margin:12mm}body{font:12px/1.4 Arial,sans-serif;color:#000}h1{font-size:18px;margin:0 0 4px}'
            'table{width:100%;border-collapse:collapse;margin:6px 0}th,td{border:1px solid #555;padding:4px 6px;text-align:left}'
            'th{background:#eee}.kv th{width:12%}</style></head><body>' + head + summ + detail
            + '<p style="margin-top:28px">Điều vận GSS (ký, ghi rõ họ tên)</p></body></html>')
