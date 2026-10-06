import os
from django.conf import settings
from hashids import Hashids

# Salt bí mật từ settings hoặc biến môi trường
DEFAULT_SALT = getattr(settings, 'HASHIDS_SALT', 'BIM_LOGISTICS_SECURE_SALT_2026')
ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
MIN_LENGTH = 8

# Singleton Hashids instances theo domain nghiệp vụ (Phân tách bảo mật đa phân hệ)
_TRIP_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_TRIP", min_length=MIN_LENGTH, alphabet=ALPHABET)
_DRIVER_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_DRIVER", min_length=MIN_LENGTH, alphabet=ALPHABET)
_TRACKING_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_TRACKING", min_length=MIN_LENGTH, alphabet=ALPHABET)
_BOOKING_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_BOOKING", min_length=MIN_LENGTH, alphabet=ALPHABET)
_QUOTATION_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_QUOTATION", min_length=MIN_LENGTH, alphabet=ALPHABET)
_EXPENSE_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_EXPENSE", min_length=MIN_LENGTH, alphabet=ALPHABET)


def encode_id(number: int, domain: str = 'TRIP') -> str:
    """Mã hóa số nguyên ID thành chuỗi HashID bảo mật chống IDOR."""
    if not isinstance(number, int) or number < 0:
        return ''
    if domain == 'DRIVER':
        return _DRIVER_HASHIDS.encode(number)
    elif domain == 'TRACKING':
        return _TRACKING_HASHIDS.encode(number)
    elif domain == 'BOOKING':
        return _BOOKING_HASHIDS.encode(number)
    elif domain == 'QUOTATION':
        return _QUOTATION_HASHIDS.encode(number)
    elif domain == 'EXPENSE':
        return _EXPENSE_HASHIDS.encode(number)
    return _TRIP_HASHIDS.encode(number)


def decode_id(hashid_str: str, domain: str = 'TRIP') -> int | None:
    """Giải mã chuỗi HashID về số nguyên ID ban đầu. Trả về None nếu không hợp lệ."""
    if not hashid_str or not isinstance(hashid_str, str):
        return None
    try:
        if domain == 'DRIVER':
            numbers = _DRIVER_HASHIDS.decode(hashid_str.strip())
        elif domain == 'TRACKING':
            numbers = _TRACKING_HASHIDS.decode(hashid_str.strip())
        elif domain == 'BOOKING':
            numbers = _BOOKING_HASHIDS.decode(hashid_str.strip())
        elif domain == 'QUOTATION':
            numbers = _QUOTATION_HASHIDS.decode(hashid_str.strip())
        elif domain == 'EXPENSE':
            numbers = _EXPENSE_HASHIDS.decode(hashid_str.strip())
        else:
            numbers = _TRIP_HASHIDS.decode(hashid_str.strip())

        if numbers and len(numbers) > 0:
            return numbers[0]
    except Exception:
        pass
    return None


def get_trip_hashid(trip_id: int) -> str:
    """Helper mã hóa ID chuyến xe chung (Internal)."""
    return encode_id(trip_id, domain='TRIP')


def decode_trip_hashid(hashid_str: str) -> int | None:
    """Helper giải mã HashID chuyến xe chung."""
    return decode_id(hashid_str, domain='TRIP')


def get_driver_hashid(trip_id: int) -> str:
    """Helper mã hóa Capability Token dành riêng cho Cổng Tài Xế Mobile (Driver Portal)."""
    return encode_id(trip_id, domain='DRIVER')


def decode_driver_hashid(hashid_str: str) -> int | None:
    """Helper giải mã Capability Token Cổng Tài Xế Mobile."""
    return decode_id(hashid_str, domain='DRIVER')


def get_tracking_hashid(trip_id: int) -> str:
    """Helper mã hóa Capability Token dành riêng cho Khách Hàng Tra Cứu (Customer Tracking)."""
    return encode_id(trip_id, domain='TRACKING')


def decode_tracking_hashid(hashid_str: str) -> int | None:
    """Helper giải mã Capability Token Khách Hàng Tra Cứu."""
    return decode_id(hashid_str, domain='TRACKING')


def get_quotation_hashid(quote_id: int) -> str:
    """Helper mã hóa ID Báo Giá thành chuỗi HashID bảo mật cho URL SPA."""
    return encode_id(quote_id, domain='QUOTATION')


def decode_quotation_hashid(hashid_str: str) -> int | None:
    """Helper giải mã HashID Báo Giá về số nguyên ID ban đầu."""
    return decode_id(hashid_str, domain='QUOTATION')


from rest_framework_simplejwt.authentication import JWTAuthentication

class GracefulJWTAuthentication(JWTAuthentication):
    """
    Xác thực JWT thông minh (Graceful Fallback):
    - Nếu JWT token hợp lệ: Xác thực người dùng bình thường.
    - Nếu JWT token hết hạn hoặc không hợp lệ:
      + Nếu request đã được xác thực qua Django Session Cookie (người dùng trên trình duyệt):
        Bỏ qua lỗi JWT và trả về None để DRF chuyển tiếp sang SessionAuthentication.
      + Nếu request không có Session: Raise exception như bình thường để bảo vệ API.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except Exception:
            # Kiểm tra xem Django session cookie có user đang đăng nhập không
            django_request = getattr(request, '_request', request)
            user = getattr(django_request, 'user', None)
            if user and user.is_authenticated:
                return None
            raise


from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication không enforce CSRF nếu request sở hữu Capability Token hợp lệ (X-Trip-Hash).
    Bảo vệ các thao tác hiện trường của tài xế trên thiết bị di động (Mobile Portal chống lỗi CSRF).
    """
    def enforce_csrf(self, request):
        trip_identifier = request.headers.get('X-Trip-Hash') or request.META.get('HTTP_X_TRIP_HASH') or request.GET.get('trip_hash')
        if trip_identifier:
            if decode_driver_hashid(trip_identifier) or decode_trip_hashid(trip_identifier):
                return
        return super().enforce_csrf(request)


