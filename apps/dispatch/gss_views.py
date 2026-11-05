"""Trang HTML của GSS: Bảng điều hành (console, cần đăng nhập) và trang tài xế mở từ QR (/q/<token>/)."""
from urllib.parse import quote

from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import redirect, render
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie

from core.features import has_feature, company_features
from core.security import json_for_script


@never_cache
@ensure_csrf_cookie
def gss_console_view(request):
    if not request.user.is_authenticated:
        return redirect(f'/login/?next={quote("/gss/")}')
    if not has_feature('gss_dispatch', request):
        raise Http404
    from apps.master_data.models import CompanyProfile
    co = CompanyProfile.get_default_company()
    return render(request, 'gss_console.html', {
        'company_name': co.short_name or co.company_name, 'features': company_features(co), 'features_json': json_for_script(company_features(co)),
        'is_superuser': request.user.is_superuser})


@never_cache
def qr_trip_page_view(request, token):
    """Trang di động mở từ QR. Token xác thực ở API; trang này chỉ là khung tĩnh."""
    if not has_feature('qr_tracking', request):
        raise Http404
    response = render(request, 'qr_trip.html')
    response['Referrer-Policy'] = 'no-referrer'
    response['X-Robots-Tag'] = 'noindex, nofollow'
    return response
