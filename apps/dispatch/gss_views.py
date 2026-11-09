"""Trang HTML của GSS: trang tài xế mở từ QR (/q/<token>/). Màn hình điều hành nằm trong khung chính `/` (templates/views/view_gss.html)."""
from django.http import Http404
from django.shortcuts import render
from django.views.decorators.cache import never_cache

from core.features import has_feature


@never_cache
def qr_trip_page_view(request, token):
    """Trang di động mở từ QR. Token xác thực ở API; trang này chỉ là khung tĩnh."""
    if not has_feature('qr_tracking', request):
        raise Http404
    response = render(request, 'qr_trip.html')
    response['Referrer-Policy'] = 'no-referrer'
    response['X-Robots-Tag'] = 'noindex, nofollow'
    return response
