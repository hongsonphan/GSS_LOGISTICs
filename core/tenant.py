"""Xác định doanh nghiệp (tenant) của request hiện tại.

- TenantMiddleware gắn request.company (lười: chỉ truy vấn khi cần) và lưu request vào contextvar để
  CompanyOwnedModel.save() tự gán đúng công ty của người dùng cho dữ liệu mới.
- Công ty của người dùng = công ty của hồ sơ nhân viên gắn với tài khoản; không có thì dùng công ty mặc định.
- Khi bật TENANT_ENFORCE: manager mặc định của mọi model thuộc công ty (core.models.tenant_scope) tự lọc theo
  công ty của người dùng trong request; scope_queryset() dùng cho truy vấn tự viết.
"""
import contextvars

from django.conf import settings
from django.utils.functional import SimpleLazyObject

_request = contextvars.ContextVar("bim_tenant_request", default=None)


def company_for_user(user):
    from core.models import get_default_company

    if user is not None and getattr(user, "is_authenticated", False):
        employee = getattr(user, "employee", None)
        company = getattr(employee, "company", None) if employee is not None else None
        if company is not None:
            return company
    return get_default_company()


def current_company():
    """Công ty của request đang xử lý, hoặc None khi chạy ngoài request (lệnh quản trị, tác vụ nền)."""
    request = _request.get()
    if request is None:
        return None
    cached = request.__dict__.get("_tenant_company")
    if cached is None:
        cached = company_for_user(getattr(request, "user", None))
        # chỉ ghi nhớ khi đã xác thực xong (trước đó user có thể còn là AnonymousUser)
        if getattr(getattr(request, "user", None), "is_authenticated", False):
            request.__dict__["_tenant_company"] = cached
    return cached


def scoping_company():
    """Công ty dùng để lọc dữ liệu: chỉ khi request có người dùng đã đăng nhập.

    Trang công khai (cổng tài xế, tra cứu vận đơn) đã được bảo vệ bằng mã băm riêng từng chuyến nên không lọc,
    tránh chặn nhầm dữ liệu của công ty không phải mặc định.
    """
    request = _request.get()
    if request is None or not getattr(getattr(request, "user", None), "is_authenticated", False):
        return None
    return current_company()


def scope_queryset(queryset, request=None):
    if not getattr(settings, "TENANT_ENFORCE", False):
        return queryset
    if not any(f.name == "company" for f in queryset.model._meta.fields):
        return queryset
    company = company_for_user(getattr(request, "user", None)) if request is not None else current_company()
    return queryset.filter(company=company) if company is not None else queryset.none()


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.company = SimpleLazyObject(lambda: company_for_user(getattr(request, "user", None)))
        token = _request.set(request)
        try:
            return self.get_response(request)
        finally:
            _request.reset(token)
