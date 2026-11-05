"""Soạn / ghi nhận tin gửi tài xế và in Biên bản giao hàng (POD) theo mẫu từng khách hàng."""
import re
from html import escape
from html.parser import HTMLParser

from django.utils import timezone

from apps.dispatch.models import DriverNotificationLog
from apps.dispatch.vendor_service import effective_notes
from core import qr_tokens


def trip_token(trip):
    return qr_tokens.make_token(qr_tokens.TRIP, trip.pk, trip.qr_version)


def trip_link(trip, base_url):
    return f'{base_url.rstrip("/")}/q/{trip_token(trip)}/'


def _fmt_date(d):
    return d.strftime('%d/%m/%Y') if d else '—'


def compose_message(trip, base_url):
    """Bản tin chuẩn gửi tài xế: chuyến, lộ trình, hạn DEM/DET, lưu ý điểm đến & cấm đường, link kèm QR."""
    notes = effective_notes(trip.booking_order) if trip.booking_order_id else {'destination_notes': '', 'road_restrictions': ''}
    lines = [
        f'LỆNH ĐIỀU XE {trip.trip_code}',
        f'Cont: {trip.container_number or "(chưa có số)"} · Loại: {trip.container_type or "—"} · Seal: {"" if trip.seal_number in ("", "-") else trip.seal_number or "—"}',
        f'Nhận: {trip.pickup_location or "—"}',
        f'Giao: {trip.warehouse_location or "—"}',
        f'Hạ rỗng: {trip.dropoff_location or "—"}',
        f'Hạn DEM: {_fmt_date(trip.dem_expiry_date)} · Hạn DET: {_fmt_date(trip.det_expiry_date)}',
    ]
    if notes['destination_notes']:
        lines.append(f'LƯU Ý ĐIỂM ĐẾN: {notes["destination_notes"]}')
    if notes['road_restrictions']:
        lines.append(f'CẤM ĐƯỜNG / GIỜ CẤM TẢI: {notes["road_restrictions"]}')
    lines.append(f'Mở lệnh, cập nhật bước và gửi chứng từ tại: {trip_link(trip, base_url)}')
    return '\n'.join(lines)


def zalo_url(phone):
    digits = re.sub(r'\D', '', phone or '')
    if digits.startswith('0'):
        digits = '84' + digits[1:]
    return f'https://zalo.me/{digits}' if digits else ''


def log_message(trip, *, channel, content, user=None):
    return DriverNotificationLog.objects.create(
        trip=trip, driver_name=trip.subcontractor_driver_name or (trip.driver.full_name if trip.driver_id else ''),
        driver_phone=trip.subcontractor_driver_phone or '', channel=channel, message_content=content,
        sent_by=user if (user and user.is_authenticated) else None)


def mark_opened(trip):
    """Tài xế mở link/QR: đánh dấu các tin gửi qua link chưa đọc là đã mở."""
    DriverNotificationLog.objects.filter(trip=trip, opened_at__isnull=True, channel__in=['ZALO', 'SMS', 'PORTAL_LINK']) \
        .update(opened_at=timezone.now())


def serialize_log(log):
    return {'id': log.id, 'channel': log.channel, 'channel_label': log.get_channel_display(), 'driver_name': log.driver_name,
            'driver_phone': log.driver_phone, 'sent_by': log.sent_by.get_username() if log.sent_by_id else '',
            'sent_at': log.sent_at.isoformat(), 'opened_at': log.opened_at.isoformat() if log.opened_at else None,
            'is_read': log.is_read, 'content': log.message_content}


# ---------- POD ----------
DEFAULT_POD = {
    'header_html': '<h1 style="text-align:center;margin:0">BIÊN BẢN GIAO NHẬN HÀNG HÓA</h1><p style="text-align:center">{{ company_name }}</p>',
    'body_html': (
        '<table class="kv">'
        '<tr><th>Khách hàng</th><td>{{ customer_name }}</td><th>Mã chuyến</th><td>{{ trip_code }}</td></tr>'
        '<tr><th>Số booking</th><td>{{ booking_number }}</td><th>Ngày in</th><td>{{ printed_at }}</td></tr>'
        '<tr><th>Số container</th><td>{{ container_number }}</td><th>Số seal</th><td>{{ seal_number }}</td></tr>'
        '<tr><th>Xe đầu kéo</th><td>{{ tractor_plate }}</td><th>Rơ-moóc</th><td>{{ trailer_plate }}</td></tr>'
        '<tr><th>Tài xế</th><td>{{ driver_name }}</td><th>SĐT</th><td>{{ driver_phone }}</td></tr>'
        '<tr><th>Nơi nhận</th><td colspan="3">{{ pickup_location }}</td></tr>'
        '<tr><th>Nơi giao</th><td colspan="3">{{ delivery_location }}</td></tr>'
        '</table>{{ packages_table }}'),
    'terms_html': '<p>Hai bên xác nhận đã giao nhận đúng số lượng, tình trạng niêm phong như trên.</p>',
}
_VAR = re.compile(r'\{\{\s*([a-z_]+)\s*\}\}')
_ALLOWED_TAGS = {'h1', 'h2', 'h3', 'h4', 'p', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 'br', 'hr', 'small', 'sup', 'sub', 'table', 'thead',
                 'tbody', 'tr', 'th', 'td', 'colgroup', 'col', 'ul', 'ol', 'li', 'img', 'a'}
_ALLOWED_ATTRS = {'class', 'style', 'colspan', 'rowspan', 'align', 'width', 'height', 'alt', 'title', 'href', 'src'}
_VOID = {'br', 'hr', 'img', 'col'}
_SAFE_URL = re.compile(r'^(https?://|/static/|/media/|#|mailto:)', re.I)


class _Sanitizer(HTMLParser):
    """Danh sách cho phép (allowlist): chỉ giữ thẻ/thuộc tính in ấn an toàn; bỏ hẳn script/style và nội dung của chúng."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template'):
            self.skip += 1
            return
        if self.skip or tag not in _ALLOWED_TAGS:
            return
        keep = []
        for name, value in attrs:
            name, value = (name or '').lower(), value or ''
            if name not in _ALLOWED_ATTRS:
                continue
            if name in ('href', 'src') and not _SAFE_URL.match(value.strip()):
                continue
            if name == 'style' and re.search(r'expression|url\s*\(|@import|behavior|javascript', value, re.I):
                continue
            keep.append(f' {name}="{escape(value, quote=True)}"')
        self.out.append(f'<{tag}{"".join(keep)}>')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template'):
            self.skip = max(0, self.skip - 1)
        elif not self.skip and tag in _ALLOWED_TAGS and tag not in _VOID:
            self.out.append(f'</{tag}>')

    def handle_data(self, data):
        if not self.skip:
            self.out.append(escape(data, quote=False))


def sanitize_template_html(html):
    """Lọc mẫu biên bản do quản trị nhập: giữ biến {{ ... }} và định dạng in, loại mọi thứ có thể chạy mã."""
    p = _Sanitizer()
    p.feed(html or '')
    p.close()
    return ''.join(p.out)


def pod_context(trip):
    from apps.master_data.models import CompanyProfile
    co = CompanyProfile.get_default_company()
    packages = list(trip.packages.filter(is_deleted=False).order_by('package_index')) if hasattr(trip, 'packages') else []
    rows = ''.join(
        f'<tr><td>{p.package_index}/{p.package_total}</td><td>{escape(p.package_code)}</td><td>{escape(p.seal_number)}</td>'
        f'<td>{escape(p.recipient_name)}</td><td>{p.get_status_display()}</td></tr>' for p in packages)
    table = ('<h3>Danh sách kiện</h3><table class="grid"><tr><th>Kiện</th><th>Mã kiện</th><th>Seal</th><th>Người nhận</th><th>Tình trạng</th></tr>'
             + rows + '</table>') if packages else ''
    plate = lambda: trip.vehicle.license_plate if trip.vehicle_id else ''
    trailer = (trip.trailer.license_plate if trip.trailer_id else trip.trailer_plate_text) or ''
    values = {
        'company_name': co.company_name, 'customer_name': trip.customer.name, 'trip_code': trip.trip_code,
        'booking_number': trip.booking_or_bill if trip.booking_or_bill != '-' else '',
        'container_number': (f'{trip.container_number} (hạ rỗng: {trip.return_container_number})'
                             if trip.is_container_swapped and trip.return_container_number else trip.container_number),
        'seal_number': '' if trip.seal_number == '-' else trip.seal_number, 'tractor_plate': plate(), 'trailer_plate': trailer,
        'driver_name': trip.subcontractor_driver_name or (trip.driver.full_name if trip.driver_id else ''),
        'driver_phone': trip.subcontractor_driver_phone, 'pickup_location': trip.pickup_location,
        'delivery_location': trip.warehouse_location, 'dropoff_location': trip.dropoff_location,
        'package_count': str(len(packages)), 'printed_at': timezone.localtime().strftime('%d/%m/%Y %H:%M'),
    }
    return {k: escape(str(v or '')) for k, v in values.items()} | {'packages_table': table}


def pick_template(trip):
    from apps.customers.models import PodTemplate
    tpl = trip.customer.pod_template if trip.customer.pod_template_id else None
    if tpl is None or not tpl.is_active or tpl.is_deleted:
        tpl = PodTemplate.objects.filter(is_default=True, is_active=True, is_deleted=False).first()
    return tpl


SAMPLE_CONTEXT = {
    'company_name': 'CÔNG TY MẪU', 'customer_name': 'Khách hàng mẫu', 'trip_code': 'DV.0000.001', 'booking_number': 'BKG123456',
    'container_number': 'CSQU3054383', 'seal_number': 'SL-0001', 'tractor_plate': '51C-123.45', 'trailer_plate': '51R-456.78',
    'driver_name': 'Nguyễn Văn A', 'driver_phone': '0901234567', 'pickup_location': 'Cảng Cát Lái', 'delivery_location': 'Kho khách hàng',
    'dropoff_location': 'Bãi hạ rỗng', 'package_count': '0', 'printed_at': '01/01/2026 08:00', 'packages_table': '',
}


def render_pod(trip):
    """HTML đầy đủ của biên bản (A4). Giá trị chèn vào đã escape; mẫu đã lọc script khi lưu và khi in."""
    tpl = pick_template(trip)
    parts = (tpl.header_html, tpl.body_html, tpl.terms_html) if tpl else (DEFAULT_POD['header_html'], DEFAULT_POD['body_html'], DEFAULT_POD['terms_html'])
    return _render_pod_html(parts, pod_context(trip), tpl.name if tpl else 'Biên bản giao hàng', trip.trip_code)


def render_pod_preview(tpl):
    """Xem trước một mẫu với dữ liệu mẫu."""
    return _render_pod_html((tpl.header_html, tpl.body_html, tpl.terms_html), {k: escape(v) for k, v in SAMPLE_CONTEXT.items() if k != 'packages_table'} | {'packages_table': ''},
                            tpl.name, 'XEM TRƯỚC')


def _render_pod_html(parts, ctx, name, code):
    fill = lambda html: _VAR.sub(lambda m: ctx.get(m.group(1), ''), sanitize_template_html(html))
    head, body, terms = (fill(p) for p in parts)
    title = escape(name)
    return (
        '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>' + title + f' {escape(code)}</title>'
        '<style>@page{size:A4;margin:14mm}body{font:13px/1.45 Arial,sans-serif;color:#000}'
        'table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #444;padding:5px 7px;text-align:left;vertical-align:top}'
        'th{background:#eee;width:16%}.grid th{width:auto}.sign{display:flex;justify-content:space-between;margin-top:36px;text-align:center}'
        '.sign div{width:30%}.sign p{height:70px}@media print{.noprint{display:none}}</style></head><body>'
        '<p class="noprint"><button onclick="window.print()">In biên bản</button></p>'
        + head + body + terms +
        '<div class="sign"><div><b>Tài xế</b><p></p>(ký, ghi rõ họ tên)</div><div><b>Người nhận hàng</b><p></p>(ký, đóng dấu)</div>'
        '<div><b>Điều vận</b><p></p>(ký, ghi rõ họ tên)</div></div></body></html>')
