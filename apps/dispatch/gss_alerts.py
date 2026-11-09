"""Cảnh báo hạn DEM/DET: quét chuyến GSS còn hiệu lực, tạo thông báo chuông (Notification) cho Điều vận.

- DEM chỉ còn ý nghĩa tới khi lấy cont khỏi cảng; DET tới khi trả vỏ rỗng (cùng quy tắc `metric_filter('alert')`).
- Chống trùng: mỗi (người nhận, chuyến, loại, số ngày còn lại) chỉ một thông báo; quá hạn chỉ báo một lần cho mỗi hạn.
- Chạy mỗi sáng bằng `python manage.py notify_dem_det` (cron / scheduler của VPS); có thể gọi tay qua API.
"""
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.dispatch import gss_dashboard as dash
from apps.customers import dem_det

TARGET = 'GSS_DEMDET'


def pending_alerts(today=None, warn_days=None):
    """[{trip, kind, expiry, level, days_left}] cho mọi chuyến cần cảnh báo."""
    today = today or timezone.localdate()
    warn = dash._warn_days() if warn_days is None else warn_days
    qs = dash.gss_trips().filter(dash.metric_filter('alert', warn, today)).select_related('customer', 'subcontractor')
    out = []
    for t in qs:
        for kind, expiry, done in (
            ('DEM', t.dem_expiry_date, t.step_status in dash.AFTER_LOAD),
            ('DET', t.det_expiry_date, t.step_status == 'EMPTY_RETURNED'),
        ):
            level = dem_det.alert_level(expiry, warn, done, today)
            if level in (dem_det.WARN, dem_det.OVERDUE):
                out.append({'trip': t, 'kind': kind, 'expiry': expiry, 'level': level, 'days_left': (expiry - today).days})
    out.sort(key=lambda a: (a['days_left'], a['trip'].trip_code))
    return out


def recipients():
    """Quản trị + người có quyền sửa Điều vận."""
    from core import access
    users = get_user_model().objects.filter(is_active=True)
    return [u for u in users if u.is_superuser or access.allowed(u, 'dispatch', 'edit')]


def _compose(a):
    t, kind, exp = a['trip'], a['kind'], a['expiry']
    who = (t.subcontractor.short_name or t.subcontractor.name) if t.subcontractor_id else ''
    label = f'{kind} · {t.container_number or t.trip_code}'
    if a['level'] == dem_det.OVERDUE:
        title = f'{label} đã quá hạn {exp:%d/%m/%Y}'
    else:
        title = f'{label} còn {a["days_left"]} ngày (hạn {exp:%d/%m/%Y})' if a['days_left'] else f'{label} hết hạn hôm nay ({exp:%d/%m/%Y})'
    msg = f'Chuyến {t.trip_code}' + (f' · nhà xe {who}' if who else '') + (f' · khách {t.customer.name}' if t.customer_id else '') \
        + f'. Hạn {kind} {exp:%d/%m/%Y}; bước hiện tại: {t.get_step_status_display() if hasattr(t, "get_step_status_display") else t.step_status}.'
    return title[:255], msg


@transaction.atomic
def notify(today=None, warn_days=None, users=None):
    """Tạo thông báo còn thiếu. Trả {'alerts': n, 'created': n, 'recipients': n}."""
    from apps.collaboration.models import Notification, NotificationType
    alerts = pending_alerts(today, warn_days)
    users = recipients() if users is None else users
    created = 0
    for a in alerts:
        title, msg = _compose(a)
        for u in users:
            _, was_new = Notification.objects.get_or_create(
                recipient=u, target_type=TARGET, target_id=a['trip'].id, title=title,
                defaults={'notification_type': NotificationType.SYSTEM, 'message': msg, 'link_url': '#gss'})
            created += was_new
    return {'alerts': len(alerts), 'created': created, 'recipients': len(users)}


def serialize(a):
    t = a['trip']
    return {'trip_code': t.trip_code, 'container_number': t.container_number, 'kind': a['kind'], 'level': a['level'],
            'expiry': a['expiry'].isoformat(), 'days_left': a['days_left'],
            'vendor': (t.subcontractor.short_name or t.subcontractor.name) if t.subcontractor_id else '',
            'customer': t.customer.name if t.customer_id else ''}
