"""Tiện ích chuẩn hóa Thời gian & Múi giờ Việt Nam (GMT+7 - Asia/Ho_Chi_Minh).

Đảm bảo toàn bộ hệ thống Bim_Logisstic_GSS hiển thị, tính toán, và xuất báo cáo
đồng bộ theo đúng chuẩn giờ hệ thống của Việt Nam GMT+7.
"""
import datetime
from django.utils import timezone


def vietnam_now():
    """Trả về datetime hiện tại đã được chuyển đổi sang múi giờ Việt Nam (Asia/Ho_Chi_Minh - GMT+7)."""
    return timezone.localtime()


def to_vietnam_time(dt):
    """Chuyển đổi một đối tượng datetime (aware hoặc naive) sang múi giờ Việt Nam.
    
    Nếu dt là None -> trả về None.
    Nếu dt là aware (ví dụ lưu UTC trong DB) -> chuyển sang Asia/Ho_Chi_Minh.
    Nếu dt là naive -> make_aware với default timezone (Asia/Ho_Chi_Minh).
    """
    if dt is None:
        return None
    if isinstance(dt, datetime.datetime):
        if timezone.is_aware(dt):
            return timezone.localtime(dt)
        return timezone.make_aware(dt, timezone.get_default_timezone())
    return dt


def format_vietnam_datetime(dt, fmt='%d/%m/%Y %H:%M', default=''):
    """Định dạng DateTime sang chuỗi theo giờ Việt Nam GMT+7 (mặc định: DD/MM/YYYY HH:mm).
    
    Tự động chuyển đổi từ UTC trong CSDL sang giờ Việt Nam trước khi strftime.
    """
    if not dt:
        return default
    try:
        vn_dt = to_vietnam_time(dt)
        return vn_dt.strftime(fmt)
    except Exception:
        return default if dt is None else str(dt)


def format_vietnam_time_short(dt, fmt='%H:%M %d/%m', default=''):
    """Định dạng DateTime ngắn gọn theo giờ Việt Nam GMT+7 (mặc định: HH:mm DD/MM)."""
    return format_vietnam_datetime(dt, fmt=fmt, default=default)


def format_vietnam_date(dt, fmt='%d/%m/%Y', default=''):
    """Định dạng Ngày theo chuẩn Việt Nam DD/MM/YYYY."""
    if not dt:
        return default
    try:
        if isinstance(dt, datetime.datetime):
            return to_vietnam_time(dt).strftime(fmt)
        if isinstance(dt, datetime.date):
            return dt.strftime(fmt)
        return str(dt)
    except Exception:
        return default if dt is None else str(dt)
