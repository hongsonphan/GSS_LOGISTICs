"""Chuẩn hoá đường dẫn file media lưu trong CSDL (dữ liệu cũ có bản ghi thiếu tiền tố /media/)."""
from django import template
from django.conf import settings

register = template.Library()


@register.filter
def media_url(path):
    """'booking_files/a.pdf' -> '/media/booking_files/a.pdf'; giữ nguyên '/media/...', '/static/...', 'http(s)://...'."""
    if not path:
        return ''
    path = str(path).strip()
    if path.startswith(('http://', 'https://', '/', 'data:')):
        return path
    return settings.MEDIA_URL.rstrip('/') + '/' + path
