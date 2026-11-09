"""Biến dùng chung cho template: menu được phép theo ma trận phân quyền (core/access.py)."""
import json

from core import access
from core.security import json_for_script


def access_menu(request):
    user = getattr(request, 'user', None)
    if user is None or not user.is_authenticated:
        return {'menu': {}, 'access_json': 'null'}
    from core.features import company_features
    flags = company_features()
    ctx = _menu(user)
    # Ẩn mục menu của phân hệ đã tắt theo Loại hình doanh nghiệp
    for key, feature in (('sales', 'sales'), ('fleet', 'fleet'), ('hr', 'hr'), ('accounting', 'accounting'),
                         ('customs', 'customs')):
        if not flags.get(feature, True):
            ctx['menu'][key] = False
    return {**ctx, 'access_json': json_for_script(access.effective_grants(user)),
            'features_json': json_for_script(flags), 'gss_on': bool(flags.get('gss_dispatch'))}


def _menu(user):
    if user.is_superuser:
        return {'menu': {k: True for k in ('sales', 'dispatch', 'fleet', 'hr', 'accounting', 'customs', 'reports',
                                           'settings', 'access_admin', 'depot')}}
    v = lambda m, a='view': access.allowed(user, m, a)
    return {'menu': {
        'sales': v('sales'), 'dispatch': v('dispatch'), 'fleet': v('fleet'), 'customs': v('customs'), 'depot': v('depot'),
        'hr': v('hr'),
        'accounting': v('accounting') or v('advances') or v('ledger'),
        'reports': v('reports_any'),
        'settings': v('settings') or v('admin'),
        'access_admin': v('admin'),
    }}


def brand(request):
    """Tên thương hiệu hiển thị ở trang đăng nhập/tiêu đề: gói GSS dùng tên công ty đã khai báo, gói khác giữ GSS LOGISTICS."""
    try:
        from apps.master_data.models import CompanyProfile
        co = CompanyProfile.get_default_company()
        if co.business_model == 'GSS_VENDOR_DEPOT_QR':
            return {'brand_name': (co.short_name or co.company_name).upper(), 'brand_gss': True}
    except Exception:  # chưa migrate / DB chưa sẵn sàng: dùng nhận diện mặc định
        pass
    return {'brand_name': 'GSS LOGISTICS', 'brand_gss': False}
