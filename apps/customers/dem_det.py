"""Hạn lệnh DEM/DET: hạn = ngày bắt đầu + (số ngày miễn phí - 1), có thể ghi đè tay.

Quy ước cộng (free_days - 1) giữ đúng cách tính hiện có ở API tạo chuyến (tính cả ngày đầu).
"""
import datetime

OK, WARN, OVERDUE, NONE = 'ok', 'warn', 'overdue', 'none'


def compute_expiry(start_date, free_days, override=None):
    if override:
        return override
    if not start_date or not free_days or free_days <= 0:
        return None
    return start_date + datetime.timedelta(days=free_days - 1)


def today_vn():
    from django.utils import timezone
    return timezone.localdate()  # settings.TIME_ZONE (Asia/Ho_Chi_Minh)


def alert_level(expiry, warn_days=2, done=False, today=None):
    """Mức cảnh báo: none (không có hạn / đã xong), ok, warn (còn ≤ warn_days ngày), overdue (quá hạn)."""
    if done or expiry is None:
        return NONE
    today = today or today_vn()
    days_left = (expiry - today).days
    if days_left < 0:
        return OVERDUE
    return WARN if days_left <= warn_days else OK


def describe(expiry, warn_days=2, done=False, today=None):
    level = alert_level(expiry, warn_days, done, today)
    today = today or today_vn()
    return {
        'expiry': expiry.isoformat() if expiry else None,
        'level': level,
        'days_left': (expiry - today).days if expiry else None,
    }
