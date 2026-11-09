from pathlib import Path
import os
import sys
import datetime

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

from django.core.exceptions import ImproperlyConfigured

# Mặc định TẮT chế độ DEBUG. Máy phát triển bật bằng DEBUG=True trong .env
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1')

# SECRET_KEY bắt buộc khai báo trong .env khi chạy production (DEBUG=False)
SECRET_KEY = os.environ.get('SECRET_KEY', '')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-local-dev-only-key'
    else:
        raise ImproperlyConfigured('Thiếu biến môi trường SECRET_KEY (bắt buộc khi DEBUG=False).')

# Frontend: True = nạp từng module JS riêng (dev), False = nạp app.js đã ghép (production)
FRONTEND_SPLIT_SCRIPTS = os.environ.get('FRONTEND_SPLIT_SCRIPTS', str(DEBUG)).lower() in ('true', '1')

# Danh sách domain cho phép truy cập
allowed_hosts_raw = os.environ.get('ALLOWED_HOSTS', '')
if allowed_hosts_raw:
    ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(',') if h.strip()]
    if 'testserver' not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append('testserver')
elif DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'gss-logistics.example.com', 'testserver', 'web']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party security & API libraries
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    
    # Core platform
    'core',
    
    # Modular Monolith Apps
    'apps.fleet',
    'apps.personnel',
    'apps.customers',
    'apps.dispatch',
    'apps.documents',
    'apps.billing',
    'apps.exceptions',
    'apps.master_data',
    'apps.customs',
    'apps.collaboration',
    'apps.ledger',
    'apps.depot_yard',
    'apps.qr_tracking',
    'apps.gss',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'core.security_headers.SecurityHeadersMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.audit.AuditContextMiddleware',
    'core.tenant.TenantMiddleware',
    'core.features.FeatureGateMiddleware',
    'core.session_security.SessionSecurityMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'core.context_processors.access_menu',
                'core.context_processors.brand',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database Configuration
DB_ENGINE = os.environ.get('DB_ENGINE', '')
DB_HOST = os.environ.get('DB_HOST', '')

if DB_HOST or 'postgresql' in DB_ENGINE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'gss_logistics_db'),
            'USER': os.environ.get('DB_USER', 'gss_logistics_user'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': DB_HOST or '127.0.0.1',
            'PORT': os.environ.get('DB_PORT', '5432'),
            # Giữ kết nối Postgres giữa các request (đỡ mở kết nối mới mỗi lần gọi API)
            'CONN_MAX_AGE': int(os.environ.get('DB_CONN_MAX_AGE', '60')),
            'CONN_HEALTH_CHECKS': True,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# 1. Password Hashing (Tiêu chuẩn 1 - SECURITY_AUDIT.md: Argon2 + PBKDF2)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

AUTHENTICATION_BACKENDS = [
    'apps.master_data.auth_backends.BimPermissionBackend',
]

# Băm mật khẩu bằng Argon2id (khuyến nghị OWASP); mật khẩu cũ (PBKDF2) tự nâng cấp khi người dùng đăng nhập
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.ScryptPasswordHasher',
]
if 'test' in sys.argv:  # test chạy nhanh
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher', *PASSWORD_HASHERS]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'core.validators.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'vi-vn'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'
# Django 5.1+ dùng STORAGES (STATICFILES_STORAGE cũ đã bị bỏ nên trước đây WhiteNoise không nén file).
# Manifest: tên file có mã băm nội dung -> cache 1 năm an toàn; bản nén .gz sẵn cho Nginx (gzip_static).
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'
                    if not DEBUG and 'test' not in sys.argv else 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
WHITENOISE_MANIFEST_STRICT = False  # thiếu mục trong manifest thì dùng tên gốc thay vì báo lỗi

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
if 'test' in sys.argv[1:2]:
    # Chạy test: file tải lên ghi vào thư mục tạm, không đụng tới media thật
    import tempfile
    MEDIA_ROOT = Path(tempfile.mkdtemp(prefix='bim_test_media_'))

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 16. Strict CORS Configuration (Tiêu chuẩn 16 - SECURITY_AUDIT.md)
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1')

cors_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if cors_env:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_env.split(',') if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        'https://gss-logistics.example.com',
        'http://localhost:8086',
        'http://127.0.0.1:8086',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ]

CORS_ALLOW_CREDENTIALS = True

csrf_env = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
if csrf_env:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in csrf_env.split(',') if o.strip()]
else:
    CSRF_TRUSTED_ORIGINS = [
        'https://gss-logistics.example.com',
        'http://localhost:8086',
        'http://127.0.0.1:8086',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ]

# Luôn tin cậy domain production chính thức (trước đây được thêm cứng ở cuối file)
for _origin in ('https://gss-logistics.example.com',):
    if _origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_origin)

# 2 & 6. DRF Settings: Throttling, Authentication & Custom Error Handler (Tiêu chuẩn 2, 3, 6)
# Số proxy tin cậy phía trước ứng dụng (Nginx = 1; thêm Cloudflare = 2). Không đặt thì DRF tin cả X-Forwarded-For do client gửi.
THROTTLE_NUM_PROXIES = int(os.environ.get('THROTTLE_NUM_PROXIES', '1'))

REST_FRAMEWORK = {
    'NUM_PROXIES': THROTTLE_NUM_PROXIES,
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.security.GracefulJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/minute',
        'user': '600/minute',
        'tracking': '20/minute',
        'gps': '30/minute',
    },
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DATETIME_FORMAT': '%d/%m/%Y %H:%M',
    'DATE_FORMAT': '%d/%m/%Y',
    'DATE_INPUT_FORMATS': [
        '%Y-%m-%d',
        '%d/%m/%Y',
        '%d-%m-%Y',
        '%d.%m.%Y',
        'iso-8601',
    ],
    'DATETIME_INPUT_FORMATS': [
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M',
        '%d/%m/%Y %H:%M:%S',
        '%d/%m/%Y %H:%M',
        '%d-%m-%Y %H:%M:%S',
        '%d-%m-%Y %H:%M',
        'iso-8601',
    ],
}
# Production: chỉ trả JSON (tắt giao diện "Browsable API" của DRF — lộ cấu trúc API và form gửi dữ liệu)
if not DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = ['rest_framework.renderers.JSONRenderer']

# 3. Simple JWT Configuration (Tiêu chuẩn 3 - Mobile Token Expiration & Blacklist)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': datetime.timedelta(hours=4),
    'REFRESH_TOKEN_LIFETIME': datetime.timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    # Token mang dấu vân tay mật khẩu: đổi / đặt lại mật khẩu thì token cũ bị thu hồi (core/security.py)
    'TOKEN_OBTAIN_SERIALIZER': 'core.security.FingerprintTokenObtainPairSerializer',
    'TOKEN_REFRESH_SERIALIZER': 'core.security.FingerprintTokenRefreshSerializer',
}

# 8. File Upload Limits (Tiêu chuẩn 8: Tối đa 5MB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024

# 14 & 15. Security Headers & Cookie Protection (Tiêu chuẩn 14, 15)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
# SAMEORIGIN: khớp header Nginx phía trước (tránh 2 giá trị mâu thuẫn) và cho phép xem trước tệp trong khung cùng site
X_FRAME_OPTIONS = 'SAMEORIGIN'

# Cấu hình Reverse Proxy SSL Header cho Nginx / Docker
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# 13. HTTPS Enforcement (Chỉ kích hoạt khi trên VPS có SSL)
def _env_bool(name, default):
    return os.environ.get(name, str(default)).lower() in ('true', '1')

SECURE_SSL_REDIRECT = _env_bool('SECURE_SSL_REDIRECT', False)
SECURE_REDIRECT_EXEMPT = [r'^healthz/$']  # kiểm tra nội bộ (Docker/script triển khai) gọi qua HTTP
# Cookie chỉ gửi qua HTTPS khi chạy production (mặc định theo DEBUG, ghi đè được bằng .env)
SESSION_COOKIE_SECURE = _env_bool('SESSION_COOKIE_SECURE', not DEBUG)
CSRF_COOKIE_SECURE = _env_bool('CSRF_COOKIE_SECURE', not DEBUG)
SECURE_REFERRER_POLICY = 'same-origin'
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'

# HSTS: bật khi production chạy HTTPS (Nginx + Certbot)
if not DEBUG and _env_bool('ENABLE_HSTS', SECURE_SSL_REDIRECT):
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = False

# Trang lỗi CSRF thân thiện: đưa người dùng về trang đăng nhập thay vì màn hình 403
CSRF_FAILURE_VIEW = 'core.auth_views.csrf_failure'

# Media: True khi Nginx có location /protected-media/ (internal) -> Nginx gửi file, Django chỉ kiểm quyền
MEDIA_USE_X_ACCEL = _env_bool('MEDIA_USE_X_ACCEL', False)


# Khoá đăng nhập tạm thời sau nhiều lần sai mật khẩu
LOGIN_MAX_FAILURES = int(os.environ.get('LOGIN_MAX_FAILURES', '5'))
LOGIN_LOCKOUT_SECONDS = int(os.environ.get('LOGIN_LOCKOUT_SECONDS', '900'))
# Khoá cả tài khoản (mọi địa chỉ IP) khi bị dò mật khẩu từ nhiều nơi
LOGIN_ACCOUNT_MAX_FAILURES = int(os.environ.get('LOGIN_ACCOUNT_MAX_FAILURES', '10'))

# Phiên làm việc: tự đăng xuất khi không thao tác SESSION_IDLE_HOURS giờ; tối đa SESSION_MAX_DAYS ngày dù có "Ghi nhớ"
SESSION_IDLE_HOURS = float(os.environ.get('SESSION_IDLE_HOURS', '8'))
SESSION_MAX_DAYS = int(os.environ.get('SESSION_MAX_DAYS', '14'))
SESSION_COOKIE_AGE = SESSION_MAX_DAYS * 86400

# Link đặt lại mật khẩu dùng một lần, hết hạn sau 1 giờ
PASSWORD_RESET_TIMEOUT = int(os.environ.get('PASSWORD_RESET_TIMEOUT', '3600'))
SITE_URL = os.environ.get('SITE_URL', '').rstrip('/')

# Email gửi đi (đặt lại mật khẩu, cảnh báo đăng nhập). Gmail / Google Workspace:
#   EMAIL_HOST_USER=hop-thu@gmail.com  EMAIL_HOST_PASSWORD=<Mật khẩu ứng dụng 16 ký tự>  (xem docs/CAU_HINH_EMAIL.md)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = _env_bool('EMAIL_USE_TLS', True)
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_TIMEOUT = 15
EMAIL_BRAND_NAME = os.environ.get('EMAIL_BRAND_NAME', 'GSS Logistics')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL') or (f'{EMAIL_BRAND_NAME} <{EMAIL_HOST_USER}>' if EMAIL_HOST_USER else 'noreply@localhost')
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND') or (
    'django.core.mail.backends.smtp.EmailBackend' if EMAIL_HOST_USER or not DEBUG else 'django.core.mail.backends.console.EmailBackend')

# Bộ nhớ đệm dùng chung giữa các tiến trình gunicorn (giới hạn tần suất API, giới hạn yêu cầu đặt lại mật khẩu, phiên bản danh mục).
# Có REDIS_URL thì dùng Redis (không ghi vào Postgres mỗi request); không có thì dùng bảng bim_cache (migration core/0008).
REDIS_URL = os.environ.get('REDIS_URL', '')
if 'test' in sys.argv:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache', 'LOCATION': 'bim_cache'}}
elif REDIS_URL:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.redis.RedisCache', 'LOCATION': REDIS_URL, 'TIMEOUT': 3600}}
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
            'LOCATION': 'bim_cache',
            'TIMEOUT': 3600,
            'OPTIONS': {'MAX_ENTRIES': 20000},
        }
    }

# Nhật ký hệ thống: ghi ra console (Docker thu lại bằng `docker compose logs`)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {'plain': {'format': '%(asctime)s %(levelname)s %(name)s: %(message)s'}},
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'plain'}},
    'root': {'handlers': ['console'], 'level': os.environ.get('LOG_LEVEL', 'INFO')},
    'loggers': {
        'django.request': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
        'django.security': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
        'bim.security': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
    },
}

# Tài liệu API tự sinh (OpenAPI 3) — chỉ quản trị viên xem được tại /api/docs/
SPECTACULAR_SETTINGS = {
    'TITLE': 'GSS Logistics API',
    'DESCRIPTION': 'API nội bộ hệ thống quản lý vận tải GSS Logistics',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAdminUser'],
}

# Đa doanh nghiệp: người dùng đăng nhập chỉ thấy dữ liệu công ty của mình (lọc ở manager mặc định của mọi model
# thuộc công ty — core.models.tenant_scope). Với một công ty hành vi không đổi. Tắt khẩn cấp: TENANT_ENFORCE=false
# Loại hình DN của công ty tạo mới lần đầu: GSS_VENDOR_DEPOT_QR | INTERNAL_FLEET_PNL | ENTERPRISE_FULL
DEFAULT_BUSINESS_MODEL = os.environ.get('DEFAULT_BUSINESS_MODEL', 'ENTERPRISE_FULL')
# Gửi tin tự động cho tài xế (Zalo ZNS/SMS) qua cổng trung gian: xem core/messaging.py. Rỗng = chỉ soạn tin, gửi tay.
MESSAGING_PROVIDER = os.environ.get('MESSAGING_PROVIDER', '')
MESSAGING_WEBHOOK_URL = os.environ.get('MESSAGING_WEBHOOK_URL', '')
MESSAGING_WEBHOOK_TOKEN = os.environ.get('MESSAGING_WEBHOOK_TOKEN', '')
MESSAGING_TEMPLATE_ID = os.environ.get('MESSAGING_TEMPLATE_ID', '')
TENANT_ENFORCE = _env_bool('TENANT_ENFORCE', True)
# Row-Level Security PostgreSQL (core/rls.py): lớp cách ly thứ hai ở CSDL. Tắt khẩn cấp: TENANT_RLS=false
TENANT_RLS = _env_bool('TENANT_RLS', True)
DB_RLS_ROLE = os.environ.get('DB_RLS_ROLE', 'gss_rls')
# Content-Security-Policy (core/security_headers.py). CSP_REPORT_ONLY=true để chỉ báo cáo khi cần dò lỗi
CSP_REPORT_ONLY = _env_bool('CSP_REPORT_ONLY', False)
LEDGER_AUTO_POST = _env_bool('LEDGER_AUTO_POST', True)
