"""Trang Vendor Link (nhà xe nhập xe/tài/cont). Dữ liệu qua /api/vendor/<token>/."""
from django.http import Http404
from django.shortcuts import render
from django.views.decorators.cache import never_cache

from core.features import has_feature


@never_cache
def vendor_portal_view(request, token=''):
    if not has_feature('vendor_portal', request):
        raise Http404
    token = (token or '').strip('/')
    response = render(request, 'vendor_portal.html', {'initial_token': token})
    response['Referrer-Policy'] = 'no-referrer'  # không rò token qua header Referer
    response['X-Robots-Tag'] = 'noindex, nofollow'
    response['Cache-Control'] = 'no-store'
    return response
