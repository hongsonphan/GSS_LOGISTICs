"""Token cho mã QR: chữ ký HMAC, không lưu token gốc nên có thể in lại bất cứ lúc nào.

Định dạng: <loại><id>.<chữ ký>, ví dụ T123.AbCd... (T = lệnh/cont, P = kiện hàng).
Chữ ký phụ thuộc `qr_version` của đối tượng: tăng version để vô hiệu hóa mã đã phát.
QR chỉ chứa đường dẫn + token, không nhúng dữ liệu nghiệp vụ.
"""
import base64
import hashlib
import hmac
import re

from django.conf import settings

TRIP, PACKAGE = 'T', 'P'
_TOKEN_RE = re.compile(r'^([TP])(\d{1,12})\.([A-Za-z0-9_-]{16})$')


def _sig(kind, pk, version):
    msg = f'qr:{kind}:{pk}:{version}'.encode()
    digest = hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).digest()[:12]
    return base64.urlsafe_b64encode(digest).decode().rstrip('=')


def make_token(kind, pk, version):
    return f'{kind}{pk}.{_sig(kind, pk, version)}'


def parse_token(token):
    """Trả (loại, id, chữ ký) hoặc None nếu sai định dạng."""
    m = _TOKEN_RE.match(token or '')
    return (m.group(1), int(m.group(2)), m.group(3)) if m else None


def verify(token, kind, pk, version):
    parsed = parse_token(token)
    if not parsed or parsed[0] != kind or parsed[1] != pk:
        return False
    return hmac.compare_digest(parsed[2], _sig(kind, pk, version))


def qr_svg(url, box_size=8):
    """Ảnh QR dạng SVG (chuỗi) cho URL; dùng thư viện `qrcode`."""
    import io
    import qrcode
    import qrcode.image.svg
    img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, box_size=box_size, border=2,
                      error_correction=qrcode.constants.ERROR_CORRECT_M)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode()
