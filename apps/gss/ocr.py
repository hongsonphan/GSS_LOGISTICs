"""Module OCR hóa đơn nâng/hạ & tra cứu tải HĐĐT gốc (kiến trúc cắm thêm, fallback nhập tay).

- Khi chưa cấu hình `GSS_OCR_ENDPOINT` / `GSS_OCR_API_KEY` trong Django settings hoặc biến môi trường:
  `extract_invoice_from_image()` trả về `configured=False, source='MANUAL', fields={}` để người dùng nhập tay bình thường.
- Khi đã cấu hình endpoint OCR: gửi ảnh lên dịch vụ OCR, chuẩn hóa các trường
  (`seller_tax_code`, `series`, `number`, `issue_date`, `total_amount`, `lookup_code`, `lookup_url`)
  và nếu lỗi mạng/provider vẫn fallback an toàn sang `MANUAL`.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

OCR_FIELDS = ('seller_tax_code', 'series', 'number', 'issue_date', 'total_amount', 'lookup_code', 'lookup_url')


def is_ocr_configured():
    endpoint = (getattr(settings, 'GSS_OCR_ENDPOINT', '') or '').strip()
    return bool(endpoint)


def is_einvoice_fetch_configured():
    endpoint = (getattr(settings, 'GSS_EINVOICE_FETCH_ENDPOINT', '') or '').strip()
    return bool(endpoint)


def _normalize_ocr_fields(raw):
    raw = raw if isinstance(raw, dict) else {}
    return {k: str(raw.get(k) or '').strip() for k in OCR_FIELDS}


def extract_invoice_from_image(fileobj):
    """Trích xuất thông tin hóa đơn từ ảnh chụp; nếu chưa cấu hình OCR thì trả về chế độ nhập tay (MANUAL)."""
    if fileobj is None:
        raise ValidationError('Chưa chọn file ảnh hóa đơn.')
    from core.validators import validate_uploaded_document
    validate_uploaded_document(fileobj)

    if not is_ocr_configured():
        return {
            'configured': False,
            'source': 'MANUAL',
            'message': 'Dịch vụ OCR chưa được cấu hình. Vui lòng nhập tay hoặc quét mã QR/XML hóa đơn.',
            'fields': {k: '' for k in OCR_FIELDS},
        }

    endpoint = getattr(settings, 'GSS_OCR_ENDPOINT', '').strip()
    api_key = (getattr(settings, 'GSS_OCR_API_KEY', '') or '').strip()
    timeout = int(getattr(settings, 'GSS_OCR_TIMEOUT', 15) or 15)
    try:
        fileobj.seek(0)
        payload = fileobj.read()
        req = urllib.request.Request(
            endpoint,
            data=payload,
            method='POST',
            headers={
                'Content-Type': getattr(fileobj, 'content_type', None) or 'application/octet-stream',
                **({'Authorization': f'Bearer {api_key}'} if api_key else {}),
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # nosec B310
            data = json.loads(resp.read().decode('utf-8'))
        fields = _normalize_ocr_fields(data.get('fields') or data)
        return {
            'configured': True,
            'source': 'OCR',
            'message': 'Đã trích xuất thông tin hóa đơn bằng OCR. Vui lòng kiểm tra lại trước khi lưu.',
            'fields': fields,
        }
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as exc:
        logger.warning('GSS OCR provider error: %s', exc)
        return {
            'configured': True,
            'source': 'MANUAL',
            'error': 'Không kết nối được dịch vụ OCR. Hệ thống chuyển sang chế độ nhập tay.',
            'fields': {k: '' for k in OCR_FIELDS},
        }
    finally:
        try:
            fileobj.seek(0)
        except Exception:
            pass


def fetch_einvoice_files(seller_tax_code='', lookup_code='', lookup_url=''):
    """Tra cứu tải file PDF/XML HĐĐT gốc (chỉ chạy khi cấu hình GSS_EINVOICE_FETCH_ENDPOINT)."""
    if not is_einvoice_fetch_configured():
        return {
            'configured': False,
            'downloaded': False,
            'message': 'Cổng tải HĐĐT gốc chưa được cấu hình. Vui lòng tải file XML/PDF thủ công.',
        }
    endpoint = getattr(settings, 'GSS_EINVOICE_FETCH_ENDPOINT', '').strip()
    api_key = (getattr(settings, 'GSS_EINVOICE_FETCH_API_KEY', '') or '').strip()
    timeout = int(getattr(settings, 'GSS_OCR_TIMEOUT', 15) or 15)
    body = json.dumps({
        'seller_tax_code': (seller_tax_code or '').strip(),
        'lookup_code': (lookup_code or '').strip(),
        'lookup_url': (lookup_url or '').strip(),
    }).encode('utf-8')
    try:
        req = urllib.request.Request(
            endpoint,
            data=body,
            method='POST',
            headers={
                'Content-Type': 'application/json',
                **({'Authorization': f'Bearer {api_key}'} if api_key else {}),
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # nosec B310
            data = json.loads(resp.read().decode('utf-8'))
        return {'configured': True, 'downloaded': bool(data.get('xml') or data.get('pdf')), 'data': data}
    except Exception as exc:
        logger.warning('GSS EInvoice fetch error: %s', exc)
        return {'configured': True, 'downloaded': False, 'error': str(exc)}
