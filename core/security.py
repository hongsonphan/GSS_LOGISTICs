"""Mã định danh công khai (lộ ra URL / API / tên file), token truy cập và xác thực JWT.

- public_id: UUIDv7 (RFC 9562) — 48 bit thời gian + 74 bit ngẫu nhiên, sắp xếp theo thời gian, không đoán được id kế tiếp.
  Khoá chính bên trong vẫn là số tự tăng; chỉ public_id được đưa ra ngoài.
- Token truy cập (link tài xế, link tra cứu của khách, link nhà xe): chuỗi ngẫu nhiên riêng, thu hồi được.
"""
import json
import os
import secrets
import time
import uuid

from django.conf import settings


def uuid7() -> uuid.UUID:
    ms = time.time_ns() // 1_000_000
    rand = int.from_bytes(os.urandom(10), 'big')  # 80 bit, dùng 74 bit
    value = ((ms & ((1 << 48) - 1)) << 80) | (0x7 << 76) | (((rand >> 62) & 0xFFF) << 64) | (0b10 << 62) | (rand & ((1 << 62) - 1))
    return uuid.UUID(int=value)


def parse_public_id(value):
    """Chuỗi -> UUID; None nếu không phải UUID hợp lệ."""
    if not value or not isinstance(value, (str, uuid.UUID)):
        return None
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value).strip())
    except (ValueError, AttributeError):
        return None


def new_token(nbytes: int = 16) -> str:
    return secrets.token_urlsafe(nbytes)


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


def json_for_script(data, **kwargs):
    """JSON an toàn để nhúng vào <script> trong template: thoát < > & và dấu phân cách dòng Unicode
    để dữ liệu người dùng (vd. tên hiển thị chứa "</script>") không thoát khỏi thẻ script."""
    text = json.dumps(data, ensure_ascii=False, **kwargs)
    for ch, esc in (('<', '\\u003c'), ('>', '\\u003e'), ('&', '\\u0026'), ('\u2028', '\\u2028'), ('\u2029', '\\u2029')):
        text = text.replace(ch, esc)
    return text


# ----------------------------------------------------------------------------- Thu hồi JWT khi đổi mật khẩu
def password_fingerprint(user):
    """Dấu vân tay mã băm mật khẩu hiện tại; đổi/đặt lại mật khẩu thì dấu vân tay đổi và mọi JWT cũ mất hiệu lực."""
    import hashlib
    import hmac
    return hmac.new(settings.SECRET_KEY.encode(), (user.password or '').encode(), hashlib.sha256).hexdigest()[:16]


from rest_framework_simplejwt.exceptions import AuthenticationFailed as _JWTAuthFailed  # noqa: E402
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer  # noqa: E402


class FingerprintTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['pwf'] = password_fingerprint(user)
        return token


class FingerprintTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken(attrs['refresh'])
        claim = refresh.payload.get('pwf')
        user = get_user_model().objects.filter(pk=refresh.payload.get('user_id')).first()
        if user is None or not user.is_active or (claim and claim != password_fingerprint(user)):
            raise _JWTAuthFailed('Phiên đã bị thu hồi do đổi mật khẩu. Vui lòng đăng nhập lại.', code='token_revoked')
        return super().validate(attrs)


def _revoked_check(self, validated_token):
    user = super(GracefulJWTAuthentication, self).get_user(validated_token)
    claim = validated_token.get('pwf')
    if claim and claim != password_fingerprint(user):
        raise _JWTAuthFailed('Token đã bị thu hồi do đổi mật khẩu.', code='token_revoked')
    return user


GracefulJWTAuthentication.get_user = _revoked_check
