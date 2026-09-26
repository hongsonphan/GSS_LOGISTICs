import os
from django.conf import settings
from hashids import Hashids

# Salt bí mật từ settings hoặc biến môi trường
DEFAULT_SALT = getattr(settings, 'HASHIDS_SALT', 'BIM_LOGISTICS_SECURE_SALT_2026')
ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
MIN_LENGTH = 8

# Singleton Hashids instances theo domain nghiệp vụ
_TRIP_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_TRIP", min_length=MIN_LENGTH, alphabet=ALPHABET)
_BOOKING_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_BOOKING", min_length=MIN_LENGTH, alphabet=ALPHABET)
_QUOTATION_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_QUOTATION", min_length=MIN_LENGTH, alphabet=ALPHABET)
_EXPENSE_HASHIDS = Hashids(salt=f"{DEFAULT_SALT}_EXPENSE", min_length=MIN_LENGTH, alphabet=ALPHABET)


def encode_id(number: int, domain: str = 'TRIP') -> str:
    """Mã hóa số nguyên ID thành chuỗi HashID bảo mật chống IDOR."""
    if not isinstance(number, int) or number < 0:
        return ''
    if domain == 'BOOKING':
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
        if domain == 'BOOKING':
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
    """Helper mã hóa ID chuyến xe."""
    return encode_id(trip_id, domain='TRIP')


def decode_trip_hashid(hashid_str: str) -> int | None:
    """Helper giải mã HashID chuyến xe."""
    return decode_id(hashid_str, domain='TRIP')


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

