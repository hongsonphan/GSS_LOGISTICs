"""Gửi tin tự động (Zalo ZNS / SMS) qua cổng trung gian cấu hình bằng biến môi trường.

Mặc định TẮT (MESSAGING_PROVIDER rỗng): hệ thống chỉ soạn tin và ghi lịch sử, điều vận gửi tay qua Zalo/SMS như trước.
- `console`: chỉ ghi log (môi trường dev/test, không gửi thật).
- `webhook`: POST JSON {channel, to, text, template_id, params} tới MESSAGING_WEBHOOK_URL (bắt buộc https), kèm
  `Authorization: Bearer MESSAGING_WEBHOOK_TOKEN`. Cổng này (nhà cung cấp ZNS/eSMS/Stringee... hoặc dịch vụ trung gian của công ty)
  chịu trách nhiệm đổi sang API riêng của nhà mạng; trả JSON có thể chứa `id`/`message_id`.
Không bao giờ ghi token vào log hoặc CSDL.
"""
import json
import logging
import re
import urllib.error
import urllib.request

from django.conf import settings

log = logging.getLogger(__name__)
TIMEOUT = 10


class SendResult:
    def __init__(self, ok, ref='', error=''):
        self.ok, self.ref, self.error = ok, ref, error


def provider_name():
    return (getattr(settings, 'MESSAGING_PROVIDER', '') or '').strip().lower()


def is_enabled():
    return provider_name() in ('console', 'webhook')


def normalize_phone(phone):
    digits = re.sub(r'\D', '', phone or '')
    if digits.startswith('0'):
        digits = '84' + digits[1:]
    return digits if 9 <= len(digits) <= 15 else ''


def send(channel, phone, text, *, params=None):
    """Gửi một tin. Không ném lỗi: luôn trả SendResult để ghi trạng thái."""
    to = normalize_phone(phone)
    if not to:
        return SendResult(False, error='Số điện thoại không hợp lệ.')
    name = provider_name()
    if name == 'console':
        log.info('messaging[console] %s -> %s: %s', channel, to, text[:80])
        return SendResult(True, ref='console')
    if name != 'webhook':
        return SendResult(False, error='Chưa bật kênh gửi tự động.')
    url = getattr(settings, 'MESSAGING_WEBHOOK_URL', '') or ''
    if not url.startswith('https://') and not (settings.DEBUG and url.startswith('http://')):
        return SendResult(False, error='MESSAGING_WEBHOOK_URL phải là địa chỉ https.')
    body = json.dumps({'channel': channel, 'to': to, 'text': text, 'params': params or {},
                       'template_id': getattr(settings, 'MESSAGING_TEMPLATE_ID', '') or ''}).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='POST', headers={'Content-Type': 'application/json; charset=utf-8'})
    token = getattr(settings, 'MESSAGING_WEBHOOK_TOKEN', '') or ''
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        # URL do quan tri cau hinh, da kiem tra https
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:  # nosec B310
            raw = resp.read(4096).decode('utf-8', 'replace')
        try:
            data = json.loads(raw)
            ref = str(data.get('id') or data.get('message_id') or '')[:60] if isinstance(data, dict) else ''
        except ValueError:
            ref = ''
        return SendResult(True, ref=ref)
    except urllib.error.HTTPError as exc:
        return SendResult(False, error=f'Cổng gửi trả mã {exc.code}.')
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        log.warning('messaging webhook lỗi: %s', type(exc).__name__)
        return SendResult(False, error='Không kết nối được cổng gửi tin.')
