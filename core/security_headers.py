"""Header bảo mật bổ sung: Content-Security-Policy, Permissions-Policy.

Mọi thư viện giao diện đã tự host (static/vendor) nên nguồn tài nguyên chỉ là chính máy chủ.
'unsafe-inline' cho script/style vẫn cần vì giao diện dùng onclick="..." và <script> nội tuyến;
CSP vẫn chặn tải script/khung/kết nối từ tên miền lạ, chặn nhúng trang vào site khác (frame-ancestors)
và chặn <object>/<base> độc hại.
"""
from django.conf import settings

DEFAULT_CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    # Xem trước tệp Word/Excel đính kèm bản tin qua Office Online
    "frame-src 'self' blob: https://view.officeapps.live.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
])

PERMISSIONS_POLICY = "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()"


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.csp = getattr(settings, 'CONTENT_SECURITY_POLICY', DEFAULT_CSP)
        self.report_only = getattr(settings, 'CSP_REPORT_ONLY', False)

    def __call__(self, request):
        response = self.get_response(request)
        if self.csp:
            header = 'Content-Security-Policy-Report-Only' if self.report_only else 'Content-Security-Policy'
            response.headers.setdefault(header, self.csp)
        response.headers.setdefault('Permissions-Policy', PERMISSIONS_POLICY)
        return response
