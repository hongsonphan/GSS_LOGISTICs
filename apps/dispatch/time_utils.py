"""Chuẩn hoá mốc giờ: các cột giờ nhập dạng chữ (vd '14:05 27/10', '16H30') được quy đổi sang DateTime có múi giờ.

Cột chữ vẫn giữ nguyên để hiển thị như cũ; cột *_at (DateTime) dùng cho tính toán SLA, DEM/DET, báo cáo.
"""
import datetime
import re

from django.utils import timezone

# (cột chữ, cột DateTime)
TIME_PAIRS = [
    ('actual_gate_in_time', 'actual_gate_in_at'),
    ('actual_gate_out_time', 'actual_gate_out_at'),
    ('dropoff_appointment_time', 'dropoff_appointment_at'),
    ('actual_dropoff_time', 'actual_dropoff_at'),
]

_TIME = r"(?P<h>\d{1,2})\s*[:hH]\s*(?P<m>\d{1,2})?"
_DATE = r"(?P<d>\d{1,2})[/.-](?P<mo>\d{1,2})(?:[/.-](?P<y>\d{2,4}))?"
_PATTERNS = [
    re.compile(rf"^\s*{_TIME}\s*(?:ngày\s*)?{_DATE}\s*$", re.I),   # 14:05 27/10/2026, 8H 27/10
    re.compile(rf"^\s*{_DATE}\s+{_TIME}\s*$", re.I),                 # 27/10/2026 14:05
    re.compile(rf"^\s*{_TIME}\s*$", re.I),                            # 14:05, 16H30, 8H
]


def parse_vn_datetime(text, base_date=None):
    """Đọc giờ kiểu Việt Nam. Thiếu ngày thì lấy base_date (hoặc hôm nay). Không đọc được -> None."""
    if not text or not isinstance(text, str):
        return None
    for pattern in _PATTERNS:
        m = pattern.match(text.strip())
        if not m:
            continue
        g = m.groupdict()
        try:
            hour, minute = int(g['h']), int(g.get('m') or 0)
            if g.get('d'):
                base = base_date or timezone.localdate()
                year = int(g['y']) if g.get('y') else base.year
                if year < 100:
                    year += 2000
                day = datetime.date(year, int(g['mo']), int(g['d']))
            else:
                day = base_date or timezone.localdate()
            naive = datetime.datetime.combine(day, datetime.time(hour, minute))
        except (ValueError, TypeError):
            return None
        return timezone.make_aware(naive, timezone.get_default_timezone())
    return None


def fill_missing_datetimes(trip):
    """Điền các cột *_at còn trống từ cột chữ tương ứng. Trả về danh sách cột đã điền."""
    filled = []
    base = trip.loading_date or (timezone.localtime(trip.created_at).date() if trip.created_at else None)
    for text_field, dt_field in TIME_PAIRS:
        if getattr(trip, dt_field) is None:
            value = parse_vn_datetime(getattr(trip, text_field), base)
            if value is not None:
                setattr(trip, dt_field, value)
                filled.append(dt_field)
    return filled
