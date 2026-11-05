"""Bảo mật tài khoản: nhật ký đăng nhập, khoá khi dò mật khẩu, cảnh báo thiết bị mới, email đặt lại mật khẩu.

- Đếm lần sai mật khẩu bằng bảng LoginEvent (dùng chung cho mọi tiến trình gunicorn, không phụ thuộc bộ nhớ đệm).
- Khoá theo IP + tài khoản sau LOGIN_MAX_FAILURES lần; khoá cả tài khoản (mọi IP) sau LOGIN_ACCOUNT_MAX_FAILURES lần.
- Email gửi qua SMTP cấu hình trong .env (Gmail: EMAIL_HOST_USER + EMAIL_HOST_PASSWORD là "Mật khẩu ứng dụng").
"""
import datetime
import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

logger = logging.getLogger('bim.security')


def client_ip(request):
    real = request.META.get('HTTP_X_REAL_IP')
    if real:
        return real.strip()
    fwd = request.META.get('HTTP_X_FORWARDED_FOR')
    if fwd:
        return fwd.split(',')[-1].strip()
    return request.META.get('REMOTE_ADDR') or ''


def user_agent(request):
    return (request.META.get('HTTP_USER_AGENT') or '')[:255]


def device_key(ua):
    """Nhận diện thiết bị thô: hệ điều hành + trình duyệt (bỏ số phiên bản để cập nhật trình duyệt không bị coi là máy mới)."""
    ua = (ua or '').lower()
    os_ = next((n for k, n in (('android', 'android'), ('iphone', 'ios'), ('ipad', 'ios'), ('windows', 'windows'),
                                ('mac os', 'mac'), ('linux', 'linux')) if k in ua), 'other')
    br = next((n for k, n in (('edg/', 'edge'), ('opr/', 'opera'), ('zalo', 'zalo'), ('coc_coc', 'coccoc'), ('chrome', 'chrome'),
                                ('firefox', 'firefox'), ('safari', 'safari')) if k in ua), 'other')
    return f'{os_}/{br}'


def log_event(request, kind, user=None, username=''):
    from core.models import LoginEvent
    try:
        return LoginEvent.objects.create(user=user, username=(username or getattr(user, 'username', ''))[:150], kind=kind,
                                         ip_address=client_ip(request)[:64] if request else '',
                                         user_agent=user_agent(request) if request else '')
    except Exception:  # nhật ký không được chặn đăng nhập
        logger.exception('Không ghi được nhật ký đăng nhập')
        return None


def _since(seconds):
    return timezone.now() - datetime.timedelta(seconds=seconds)


def lock_status(request, username):
    """Trả về thông báo khoá (str) nếu đang bị khoá, ngược lại None. Chỉ đếm lần sai sau lần đăng nhập đúng gần nhất."""
    from core.models import LoginEvent
    window = settings.LOGIN_LOCKOUT_SECONDS
    uname = (username or '')[:150]
    since = _since(window)
    last_ok = LoginEvent.objects.filter(kind__in=('login', 'reset_done'), username__iexact=uname, created_at__gte=since) \
        .order_by('-created_at').values_list('created_at', flat=True).first()
    fails = LoginEvent.objects.filter(kind='failed', username__iexact=uname, created_at__gte=last_ok or since)
    minutes = max(1, window // 60)
    if fails.filter(ip_address=client_ip(request)[:64]).count() >= settings.LOGIN_MAX_FAILURES:
        return f'Bạn đã nhập sai quá {settings.LOGIN_MAX_FAILURES} lần. Vui lòng thử lại sau {minutes} phút hoặc dùng "Quên mật khẩu".'
    if fails.count() >= settings.LOGIN_ACCOUNT_MAX_FAILURES:
        return (f'Tài khoản tạm khoá {minutes} phút do có nhiều lần đăng nhập sai. '
                'Nếu không phải bạn, hãy đặt lại mật khẩu ngay.')
    return None


def is_new_device(user, request):
    """Lần đầu đăng nhập từ loại thiết bị/trình duyệt này hoặc từ địa chỉ IP lạ trong 90 ngày."""
    from core.models import LoginEvent
    recent = LoginEvent.objects.filter(user=user, kind='login', created_at__gte=_since(90 * 86400)).only('ip_address', 'user_agent')[:200]
    recent = list(recent)
    if not recent:
        return False  # lần đăng nhập đầu tiên sau khi bật tính năng: không cảnh báo
    dev = device_key(user_agent(request))
    ip = client_ip(request)
    ip_prefix = '.'.join(ip.split('.')[:3])
    seen_dev = any(device_key(e.user_agent) == dev for e in recent)
    seen_net = any('.'.join((e.ip_address or '').split('.')[:3]) == ip_prefix for e in recent)
    return not (seen_dev and seen_net)


# ----------------------------------------------------------------------------- Email
def email_enabled():
    return bool(getattr(settings, 'EMAIL_HOST_USER', '') and getattr(settings, 'EMAIL_HOST_PASSWORD', '')) or \
        settings.EMAIL_BACKEND != 'django.core.mail.backends.smtp.EmailBackend'


def user_email(user):
    email = (user.email or '').strip()
    if not email:
        emp = getattr(user, 'employee', None)
        email = (getattr(emp, 'email', '') or '').strip()
    return email


def site_url(request=None):
    base = getattr(settings, 'SITE_URL', '') or ''
    if base:
        return base.rstrip('/')
    if request is not None:
        return '://'.join((request.scheme, request.get_host()))
    return ''


def display_name(user):
    emp = getattr(user, 'employee', None)
    return (emp.full_name if emp else '') or user.get_full_name() or user.username


def send_mail(to, subject, template, context):
    """Gửi email HTML + văn bản. Trả về True nếu gửi được."""
    if not to or not email_enabled():
        return False
    ctx = {'brand': getattr(settings, 'EMAIL_BRAND_NAME', 'GSS Logistics'), **context}
    try:
        text = render_to_string(f'emails/{template}.txt', ctx)
        html = render_to_string(f'emails/{template}.html', ctx)
        msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [to])
        msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=False)
        return True
    except Exception:
        logger.exception('Gửi email "%s" thất bại', subject)
        return False


def reset_link(user, request=None):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f'{site_url(request)}/password-reset/{uid}/{token}/'


def send_reset_email(user, request=None, by_admin=None):
    to = user_email(user)
    hours = max(1, settings.PASSWORD_RESET_TIMEOUT // 3600)
    return send_mail(to, f'[{getattr(settings, "EMAIL_BRAND_NAME", "GSS Logistics")}] Đặt lại mật khẩu', 'password_reset', {
        'name': display_name(user), 'username': user.username, 'link': reset_link(user, request), 'hours': hours,
        'by_admin': display_name(by_admin) if by_admin else '', 'ip': client_ip(request) if request else '',
    })


def notify_password_changed(user, request=None):
    send_mail(user_email(user), f'[{getattr(settings, "EMAIL_BRAND_NAME", "GSS Logistics")}] Mật khẩu đã được thay đổi', 'password_changed', {
        'name': display_name(user), 'username': user.username, 'when': timezone.localtime().strftime('%H:%M %d/%m/%Y'),
        'ip': client_ip(request) if request else '', 'reset_url': f'{site_url(request)}/password-reset/',
    })


def notify_new_device(user, request):
    send_mail(user_email(user), f'[{getattr(settings, "EMAIL_BRAND_NAME", "GSS Logistics")}] Đăng nhập từ thiết bị mới', 'new_login', {
        'name': display_name(user), 'username': user.username, 'when': timezone.localtime().strftime('%H:%M %d/%m/%Y'),
        'ip': client_ip(request), 'device': device_key(user_agent(request)).replace('/', ' · '),
        'reset_url': f'{site_url(request)}/password-reset/',
    })


def password_is_weak(password, user):
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError
    try:
        validate_password(password, user=user)
        return False
    except ValidationError:
        return True
