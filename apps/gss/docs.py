"""Đặt tên chuẩn và cây thư mục ảo cho chứng từ (đặc tả §5.7).

Tên: {BL}_{CONT}_{VENDOR}_{TYPE}_{YYYYMMDD}_{SEQ}.ext – B/L lấy HBL nếu có, không thì MBL (rồi số booking).
Cây: /[Nam_Thang]/[So_BL]/[So_Cont]/Chung_Tu_Hanh_Trinh/  và  /Hoa_Don_Nang_Ha_OCR/
File lưu theo khoá duy nhất (không đổi khi dữ liệu đổi); tên chuẩn và cây chỉ sinh khi xem/tải zip.
"""
import io
import os
import re
import zipfile

from django.conf import settings
from django.utils import timezone

TYPE_CODE = {'PICKUP': 'EIR', 'DELIVERY': 'POD', 'EMPTY_RETURN': 'EIR'}
DOC_TYPE_CODE = {'SEAL_PHOTO': 'SEAL', 'POD': 'POD', 'EIR_PICKUP': 'EIR', 'EIR_DROPOFF': 'EIR', 'INVOICE': 'INV'}
JOURNEY_DIR = 'Chung_Tu_Hanh_Trinh'
INVOICE_DIR = 'Hoa_Don_Nang_Ha_OCR'
MAX_ZIP_FILES = 3000


def _safe(s, n=30):
    s = re.sub(r'[^A-Za-z0-9]+', '', str(s or '').upper())
    return s[:n] or 'NA'


def bl_of(trip):
    b = trip.booking_order
    if b is None:
        return 'NOBL'
    return _safe(b.hbl_number or b.mbl_number or b.booking_number or b.booking_code)


def vendor_code(trip):
    s = trip.subcontractor
    return _safe(s.code if s else 'GSS', 12)


def _ext(path):
    e = os.path.splitext(str(path or ''))[1].lower()
    return e if re.match(r'^\.[a-z0-9]{2,5}$', e) else '.jpg'


def standard_name(trip, type_code, when, seq, path):
    day = timezone.localtime(when).strftime('%Y%m%d') if hasattr(when, 'hour') else when.strftime('%Y%m%d')
    return f'{bl_of(trip)}_{_safe(trip.container_number, 15)}_{vendor_code(trip)}_{type_code}_{day}_{seq:02d}{_ext(path)}'


def folder_of(trip, when):
    month = timezone.localtime(when).strftime('%Y_%m') if hasattr(when, 'hour') else when.strftime('%Y_%m')
    return f'{month}/{bl_of(trip)}/{_safe(trip.container_number, 15)}'


def entries_for_trip(trip):
    """[(đường dẫn trong cây, đường dẫn file /media/..., nhãn)] của một chuyến: chứng từ hành trình + ảnh/XML hoá đơn."""
    from apps.documents.models import TripDocument
    out = []
    base = folder_of(trip, trip.created_at)
    counters = {}
    for d in TripDocument.objects.filter(trip=trip, is_deleted=False).exclude(file_path='').order_by('created_at', 'id'):
        code = TYPE_CODE.get(d.workflow_stage) or DOC_TYPE_CODE.get(d.document_type, 'OTHER')
        counters[code] = counters.get(code, 0) + 1
        out.append((f'{base}/{JOURNEY_DIR}/{standard_name(trip, code, d.created_at, counters[code], d.file_path)}', d.file_path, d.title))
    n = 0
    for c in trip.cost_claims.filter(is_deleted=False).select_related('einvoice'):
        for path in (c.photo_path, c.einvoice.image_path if c.einvoice_id else '', c.einvoice.xml_path if c.einvoice_id else ''):
            if path:
                n += 1
                out.append((f'{base}/{INVOICE_DIR}/{standard_name(trip, "INV", c.created_at, n, path)}', path, c.charge_code.name))
    return out


def _local(path):
    """/media/x → đường dẫn trên đĩa, chặn thoát khỏi MEDIA_ROOT."""
    if not str(path).startswith('/media/'):
        return None
    root = os.path.realpath(settings.MEDIA_ROOT)
    full = os.path.realpath(os.path.join(root, str(path)[len('/media/'):]))
    return full if full.startswith(root + os.sep) and os.path.isfile(full) else None


def zip_bytes(trips):
    buf = io.BytesIO()
    count, missing = 0, []
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for t in trips:
            for arc, path, _label in entries_for_trip(t):
                full = _local(path)
                if not full:
                    missing.append(arc)
                    continue
                zf.write(full, arc)
                count += 1
                if count >= MAX_ZIP_FILES:
                    break
        if missing:
            zf.writestr('THIEU_FILE.txt', '\n'.join(missing))
    return buf.getvalue(), count, missing


def tree(trips):
    """Cây thư mục ảo dạng danh sách cho giao diện: [{path, url, label}]."""
    rows = []
    for t in trips:
        for arc, path, label in entries_for_trip(t):
            rows.append({'path': arc, 'url': path, 'label': label, 'trip_code': t.trip_code})
    return rows
