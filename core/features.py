"""Feature flag theo Loại hình doanh nghiệp (CompanyProfile.business_model).

- Mỗi gói (profile) bật sẵn một tập tính năng; `enabled_features` (JSON {tên: bool}) ghi đè từng tính năng.
- Ẩn trên giao diện chưa đủ: FeatureGateMiddleware chặn luôn ở URL/API của tính năng đang tắt.
- Mặc định ENTERPRISE_FULL = bật tất cả, nên triển khai cũ không đổi hành vi.
"""
from django.http import JsonResponse

INTERNAL_FLEET_PNL = 'INTERNAL_FLEET_PNL'
GSS_VENDOR_DEPOT_QR = 'GSS_VENDOR_DEPOT_QR'
ENTERPRISE_FULL = 'ENTERPRISE_FULL'

BUSINESS_MODEL_CHOICES = [
    (GSS_VENDOR_DEPOT_QR, 'Điều phối nhà xe, Bãi cont & QR (Green Solutions Smart)'),
    (INTERNAL_FLEET_PNL, 'Đội xe nội bộ & P&L'),
    (ENTERPRISE_FULL, 'Toàn bộ tính năng'),
]

# Tên tính năng -> nhãn hiển thị (dùng cho bảng bật/tắt ở Cài đặt)
FEATURES = {
    'sales': 'Kinh doanh & Booking',
    'dem_det_alerts': 'Hạn lệnh DEM/DET & cảnh báo',
    'vendor_portal': 'Chia cont cho nhà xe & Vendor Link',
    'gss_dispatch': 'Luồng điều vận Nhận – Giao – Hạ & chứng từ 1–10 file',
    'driver_messages': 'Gửi tin cho tài xế',
    'pod_templates': 'Mẫu biên bản giao hàng theo khách',
    'depot_yard': 'Bãi container (Gate-in / Gate-out)',
    'qr_tracking': 'Mã QR lệnh & tracking',
    'lcl_packages': 'Hàng lẻ theo kiện có Seal',
    'fleet': 'Đội xe & Rơ-moóc',
    'fleet_internal': 'Đội xe nội bộ (tạm ứng, lương chuyến, P&L)',
    'accounting': 'Kế toán & đối soát',
    'ledger': 'Sổ cái / Báo cáo tài chính',
    'hr': 'Nhân sự',
    'payroll': 'Lương & BHXH',
    'customs': 'Hải quan',
}

_GSS_ONLY = {'dem_det_alerts', 'vendor_portal', 'gss_dispatch', 'driver_messages', 'pod_templates', 'depot_yard',
             'qr_tracking', 'lcl_packages'}
_FLEET_ONLY = {'fleet_internal', 'ledger', 'hr', 'payroll'}

PROFILES = {
    ENTERPRISE_FULL: set(FEATURES),
    GSS_VENDOR_DEPOT_QR: {'sales', 'fleet', 'accounting'} | _GSS_ONLY,
    INTERNAL_FLEET_PNL: {'sales', 'fleet', 'accounting', 'customs'} | _FLEET_ONLY,
}
# INTERNAL_FLEET_PNL không dùng hải quan theo đặc tả (Đội xe, tạm ứng, lương chuyến, P&L)
PROFILES[INTERNAL_FLEET_PNL].discard('customs')

# Tiền tố URL -> tính năng bắt buộc đang bật
GATED_PREFIXES = (
    ('/api/customs/', 'customs'),
    ('/customs/', 'customs'),
    ('/api/ledger/', 'ledger'),
    ('/api/personnel/payroll/', 'payroll'),
    ('/hr/', 'hr'),
    ('/api/accounting/', 'accounting'),
    ('/accounting/', 'accounting'),
    ('/api/gss/', 'gss_dispatch'),
    ('/api/vendor/', 'vendor_portal'),
    ('/api/vendor-allocations/', 'vendor_portal'),
    ('/vendor/', 'vendor_portal'),
    ('/api/depot/', 'depot_yard'),
    ('/depot/', 'depot_yard'),
    ('/api/qr/', 'qr_tracking'),
    ('/qr/', 'qr_tracking'),
    ('/q/', 'qr_tracking'),
    ('/gss/', 'gss_dispatch'),
)


def resolve_features(business_model, overrides=None):
    """Trả về {tên_tính_năng: bool} cho mọi tính năng đã biết."""
    base = PROFILES.get(business_model, PROFILES[ENTERPRISE_FULL])
    result = {name: name in base for name in FEATURES}
    for name, value in (overrides or {}).items():
        if name in result:
            result[name] = bool(value)
    return result


def clean_overrides(raw):
    """Chuẩn hóa dữ liệu bật/tắt từ client: bỏ khóa lạ, ép bool. Ném ValueError nếu không phải object."""
    if raw in (None, ''):
        return {}
    if not isinstance(raw, dict):
        raise ValueError('enabled_features phải là đối tượng {tên: true/false}')
    return {k: bool(v) for k, v in raw.items() if k in FEATURES}


def company_features(profile=None):
    if profile is None:
        from apps.master_data.models import CompanyProfile
        profile = CompanyProfile.get_default_company()
    return resolve_features(profile.business_model, profile.enabled_features)


def has_feature(name, request=None):
    """Kiểm tra tính năng đang bật; ghi nhớ kết quả trong request để chỉ truy vấn một lần."""
    flags = None
    if request is not None:
        flags = request.__dict__.get('_feature_flags')
    if flags is None:
        flags = company_features()
        if request is not None:
            request.__dict__['_feature_flags'] = flags
    return flags.get(name, True)


class FeatureGateMiddleware:
    """Chặn URL/API của tính năng đã tắt (403), tránh chỉ ẩn menu mà vẫn gọi được endpoint."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        for prefix, feature in GATED_PREFIXES:
            if path.startswith(prefix):
                if not has_feature(feature, request):
                    msg = f'Tính năng "{FEATURES[feature]}" chưa được bật cho doanh nghiệp này.'
                    if path.startswith('/api/'):
                        return JsonResponse({'success': False, 'message': msg, 'code': 'feature_disabled'}, status=403)
                    from django.http import HttpResponseForbidden
                    return HttpResponseForbidden(msg)
                break
        return self.get_response(request)
