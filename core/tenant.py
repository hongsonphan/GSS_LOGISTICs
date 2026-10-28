"""Xác định doanh nghiệp (tenant) của request hiện tại.

- TenantMiddleware gắn request.company (lười: chỉ truy vấn khi cần) và lưu request vào contextvar để
  CompanyOwnedModel.save() tự gán đúng công ty của người dùng cho dữ liệu mới.
- Công ty của người dùng = công ty của hồ sơ nhân viên gắn với tài khoản; không có thì dùng công ty mặc định.
- scope_queryset() lọc dữ liệu theo công ty khi bật TENANT_ENFORCE (chuẩn bị cho chế độ nhiều doanh nghiệp;
  hiện chỉ có một công ty nên mặc định tắt, hành vi không đổi).
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
    return company_for_user(getattr(request, "user", None))


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
