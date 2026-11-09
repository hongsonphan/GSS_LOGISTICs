"""Phiên đăng nhập an toàn.

- Tự đăng xuất khi không thao tác quá SESSION_IDLE_HOURS giờ (trang và API đều tính là thao tác).
- Phiên bị đánh dấu "phải đổi mật khẩu" (mật khẩu yếu theo chính sách mới): chỉ cho vào trang đổi mật khẩu.
"""
import time
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import logout
from django.http import JsonResponse
from django.shortcuts import redirect

FORCE_KEY = '_bim_force_pw_change'
LAST_KEY = '_bim_last_seen'
ALLOW_WHEN_FORCED = ('/account/password/', '/logout/', '/static/', '/healthz/', '/password-reset/', '/login/')


class SessionSecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated and hasattr(request, 'session'):
            now = int(time.time())
            last = request.session.get(LAST_KEY)
            idle_limit = int(settings.SESSION_IDLE_HOURS * 3600)
            if last and idle_limit and now - int(last) > idle_limit:
                from core.account_security import log_event
                log_event(request, 'logout', user)
                logout(request)
                if request.path.startswith('/api/'):
                    return JsonResponse({'detail': 'Phiên đăng nhập đã hết hạn do lâu không thao tác. Vui lòng đăng nhập lại.',
                                         'code': 'session_idle'}, status=401)
                # next là đường dẫn nội bộ của chính request này (không nhận từ người dùng), được mã hoá URL
                return redirect('/login/?' + urlencode({'expired': 1, 'next': request.path}))  # nosemgrep: python.django.security.injection.open-redirect.open-redirect
            # Ghi mốc thao tác tối đa mỗi phút một lần (tránh ghi phiên liên tục)
            if not last or now - int(last) > 60:
                request.session[LAST_KEY] = now

            if request.session.get(FORCE_KEY) and not request.path.startswith(ALLOW_WHEN_FORCED):
                if request.path.startswith('/api/'):
                    return JsonResponse({'detail': 'Bạn cần đổi mật khẩu theo chính sách bảo mật mới trước khi tiếp tục.',
                                         'code': 'password_change_required'}, status=403)
                return redirect('/account/password/?required=1')
        return self.get_response(request)
