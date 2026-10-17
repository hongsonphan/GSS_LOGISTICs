from pathlib import Path
import os
import datetime

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass

SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-bim-logistics-trien-vo-enterprise-key-2026'
)

DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1')

# Danh sách domain cho phép truy cập
allowed_hosts_raw = os.environ.get('ALLOWED_HOSTS', '')
if allowed_hosts_raw:
    ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(',') if h.strip()]
    if 'testserver' not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append('testserver')
elif DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'logistics.bim.info.vn', 'bim.info.vn', '149.118.60.194', 'testserver', 'web']

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
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
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
            'NAME': os.environ.get('DB_NAME', 'bim_logistics_db'),
            'USER': os.environ.get('DB_USER', 'bim_logistics_user'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'bim_logistics_secret_2026'),
            'HOST': DB_HOST or '127.0.0.1',
            'PORT': os.environ.get('DB_PORT', '5432'),
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

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
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
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 16. Strict CORS Configuration (Tiêu chuẩn 16 - SECURITY_AUDIT.md)
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1')

cors_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if cors_env:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in cors_env.split(',') if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        'https://logistics.bim.info.vn',
        'http://logistics.bim.info.vn',
        'https://bim.info.vn',
        'http://bim.info.vn',
        'http://149.118.60.194:8085',
        'http://localhost:8085',
        'http://127.0.0.1:8085',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ]

CORS_ALLOW_CREDENTIALS = True

csrf_env = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
if csrf_env:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in csrf_env.split(',') if o.strip()]
else:
    CSRF_TRUSTED_ORIGINS = [
        'https://logistics.bim.info.vn',
        'http://logistics.bim.info.vn',
        'https://bim.info.vn',
        'http://bim.info.vn',
        'http://149.118.60.194:8085',
        'http://149.118.60.194',
        'http://localhost:8085',
        'http://127.0.0.1:8085',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ]

# 2 & 6. DRF Settings: Throttling, Authentication & Custom Error Handler (Tiêu chuẩn 2, 3, 6)
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.security.GracefulJWTAuthentication',
        'core.security.CsrfExemptSessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
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
}

# 8. File Upload Limits (Tiêu chuẩn 8: Tối đa 5MB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024

# 14 & 15. Security Headers & Cookie Protection (Tiêu chuẩn 14, 15)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# Cấu hình Reverse Proxy SSL Header cho Nginx / Docker
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Danh sách nguồn tin cậy cho CSRF (Bắt buộc từ Django 4.0+ khi chạy HTTPS qua domain)
CSRF_TRUSTED_ORIGINS = [
    'https://logistics.bim.info.vn',
    'http://logistics.bim.info.vn',
    'https://bim.info.vn',
    'http://149.118.60.194:8085',
    'http://149.118.60.194',
    'http://localhost:8085',
    'http://127.0.0.1:8085',
]

csrf_trusted_raw = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
if csrf_trusted_raw:
    for origin in csrf_trusted_raw.split(','):
        cleaned = origin.strip()
        if cleaned and cleaned not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(cleaned)

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# 13. HTTPS Enforcement (Chỉ kích hoạt khi trên VPS có SSL)
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1')
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() in ('true', '1')
CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'False').lower() in ('true', '1')

if not DEBUG and SECURE_SSL_REDIRECT:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

