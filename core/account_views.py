"""Trang tài khoản: quên mật khẩu (email), đặt lại mật khẩu qua link, đổi mật khẩu (kể cả bắt buộc đổi)."""
from django.conf import settings
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.shortcuts import render
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core import account_security as sec
from core.permissions import CanAdministerAccess
from core.session_security import FORCE_KEY

RESET_RATE_PER_HOUR = 5  # số yêu cầu đặt lại tối đa mỗi giờ cho một IP


def _users_for(identifier):
    """Tài khoản khớp email / tên đăng nhập / mã nhân viên (không tiết lộ ra ngoài có hay không)."""
    from apps.personnel.models import Employee
    ident = (identifier or '').strip()
    if not ident:
        return []
    User = get_user_model()
    users = list(User.objects.filter(is_active=True).filter(Q(username__iexact=ident) | Q(email__iexact=ident)))
    for emp in Employee.objects.filter(Q(code__iexact=ident) | Q(email__iexact=ident), user__isnull=False, user__is_active=True) \
            .select_related('user'):
        if emp.user not in users:
            users.append(emp.user)
    return users[:5]


def _validate_new(request, user):
    p1, p2 = request.POST.get('new_password1', ''), request.POST.get('new_password2', '')
    if p1 != p2:
        return ['Hai lần nhập mật khẩu mới không khớp.']
    try:
        validate_password(p1, user=user)
    except ValidationError as exc:
        return list(exc.messages)
    return []


@never_cache
@sensitive_post_parameters()
def password_reset_request(request):
    ctx = {'email_ready': sec.email_enabled(), 'hours': max(1, settings.PASSWORD_RESET_TIMEOUT // 3600)}
    if request.method == 'POST' and ctx['email_ready']:
        ident = request.POST.get('identifier', '')[:150]
        key = f'pwreset-ip:{sec.client_ip(request)}'
        count = cache.get(key, 0)
        if count >= RESET_RATE_PER_HOUR:
            ctx.update(error='Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 1 giờ.', identifier=ident)
            return render(request, 'account/password_reset_request.html', ctx, status=429)
        cache.set(key, count + 1, 3600)
        for user in _users_for(ident):
            # Giới hạn theo tài khoản (chống dội email từ nhiều IP): tối đa RESET_RATE_PER_HOUR email/giờ cho một tài khoản
            ukey = f'pwreset-user:{user.pk}'
            ucount = cache.get(ukey, 0)
            cache.set(ukey, ucount + 1, 3600)
            if ucount < RESET_RATE_PER_HOUR and sec.user_email(user):
                sec.send_reset_email(user, request)
            sec.log_event(request, 'reset_request', user)
        if not _users_for(ident):
            sec.log_event(request, 'reset_request', None, ident)
        ctx['sent'] = True  # trả lời giống nhau dù có tài khoản hay không (chống dò tài khoản)
    return render(request, 'account/password_reset_request.html', ctx)


@never_cache
@sensitive_post_parameters()
def password_reset_confirm(request, uidb64, token):
    User = get_user_model()
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uidb64)), is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        user = None
    valid = user is not None and default_token_generator.check_token(user, token)
    ctx = {'valid': valid, 'username': user.username if user else ''}
    if valid and request.method == 'POST':
        errors = _validate_new(request, user)
        if errors:
            ctx['errors'] = errors
        else:
            user.set_password(request.POST['new_password1'])
            user.save()  # đổi mật khẩu làm mã băm phiên thay đổi -> mọi phiên cũ bị đăng xuất; link cũng hết hiệu lực
            sec.log_event(request, 'reset_done', user)
            sec.notify_password_changed(user, request)
            ctx['done'] = True
    return render(request, 'account/password_reset_confirm.html', ctx)


@never_cache
@sensitive_post_parameters()
@login_required(login_url='/login/')
def password_change(request):
    user = request.user
    # so sánh chuỗi với '1', không chuyển sang số
    ctx = {'required': bool(request.session.get(FORCE_KEY)) or request.GET.get('required') == '1'}  # nosemgrep: python.django.security.nan-injection.nan-injection
    if request.method == 'POST':
        if not user.check_password(request.POST.get('old_password', '')):
            ctx['errors'] = ['Mật khẩu hiện tại không đúng.']
        elif request.POST.get('old_password') == request.POST.get('new_password1'):
            ctx['errors'] = ['Mật khẩu mới phải khác mật khẩu hiện tại.']
        else:
            errors = _validate_new(request, user)
            if errors:
                ctx['errors'] = errors
            else:
                user.set_password(request.POST['new_password1'])
                user.save()
                update_session_auth_hash(request, user)  # giữ phiên hiện tại, đăng xuất thiết bị khác
                request.session.pop(FORCE_KEY, None)
                sec.log_event(request, 'password_change', user)
                sec.notify_password_changed(user, request)
                ctx = {'done': True}
    return render(request, 'account/password_change.html', ctx)


class SendPasswordResetAPIView(APIView):
    """Quản trị gửi link đặt lại mật khẩu tới email của một nhân viên (trang Phân quyền › Ngoại lệ theo người)."""
    permission_classes = [CanAdministerAccess]
    access_actions = {'POST': 'edit'}

    def post(self, request, pk):
        from core.tenant import company_for_user, users_of_company
        user = users_of_company(company_for_user(request.user), get_user_model().objects.filter(pk=pk, is_active=True)).first()
        if user is None:
            return Response({'detail': 'Không tìm thấy tài khoản'}, status=status.HTTP_404_NOT_FOUND)
        if not sec.email_enabled():
            return Response({'detail': 'Hệ thống chưa cấu hình email gửi đi (xem docs/CAU_HINH_EMAIL.md)'}, status=status.HTTP_400_BAD_REQUEST)
        to = sec.user_email(user)
        if not to:
            return Response({'detail': 'Tài khoản chưa có email. Hãy bổ sung email trong hồ sơ nhân sự.'}, status=status.HTTP_400_BAD_REQUEST)
        if not sec.send_reset_email(user, request, by_admin=request.user):
            return Response({'detail': 'Gửi email thất bại, kiểm tra cấu hình SMTP'}, status=status.HTTP_502_BAD_GATEWAY)
        sec.log_event(request, 'admin_reset', user)
        masked = to[0] + '***' + to[to.index('@'):] if '@' in to else '***'
        return Response({'detail': f'Đã gửi link đặt lại mật khẩu tới {masked}'})


def admin_login_redirect(request):
    """Trang đăng nhập Django admin dùng chung trang đăng nhập hệ thống (có khoá dò mật khẩu, nhật ký, chính sách mật khẩu)."""
    from django.shortcuts import redirect
    from django.utils.http import url_has_allowed_host_and_scheme
    nxt = request.GET.get('next') or '/admin/'
    if not url_has_allowed_host_and_scheme(nxt, allowed_hosts={request.get_host()}):
        nxt = '/admin/'
    from urllib.parse import urlencode
    return redirect('/login/?' + urlencode({'next': nxt}))


try:
    from rest_framework_simplejwt.views import TokenObtainPairView as _TokenObtainPairView
except ImportError:  # pragma: no cover
    _TokenObtainPairView = None

if _TokenObtainPairView is not None:
    class SecureTokenObtainPairView(_TokenObtainPairView):
        """Cấp JWT (ứng dụng di động / tích hợp) với cùng cơ chế khoá dò mật khẩu và nhật ký như trang đăng nhập."""

        def post(self, request, *args, **kwargs):
            username = str(request.data.get('username', ''))[:150]
            locked = sec.lock_status(request, username)
            if locked:
                sec.log_event(request, 'locked', None, username)
                return Response({'detail': locked}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            user = get_user_model().objects.filter(username__iexact=username).first()
            try:
                response = super().post(request, *args, **kwargs)
            except Exception:
                # Sai mật khẩu / dữ liệu không hợp lệ: simplejwt ném ngoại lệ -> vẫn phải ghi lần sai để khoá đếm được
                sec.log_event(request, 'failed', user, username)
                raise
            sec.log_event(request, 'login' if response.status_code == 200 else 'failed', user, username)
            return response
