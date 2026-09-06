from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEBUG = os.getenv("DEBUG", "True").lower() == "true"
# Desktop mode: self-contained single-process app (SQLite, local cache, bundled frontend, LAN access).
DESKTOP = os.getenv("NOVAPOS_DESKTOP", "").lower() in ("1", "true", "yes")
DATA_DIR = Path(os.getenv("NOVAPOS_DATA", BASE_DIR))
if DESKTOP:
    try: DATA_DIR.mkdir(parents=True, exist_ok=True)
    except Exception: pass
SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-spos-dev-key" if DEBUG else "")
if not SECRET_KEY and DESKTOP:
    keyfile = DATA_DIR / "secret.key"
    if keyfile.exists():
        SECRET_KEY = keyfile.read_text().strip()
    else:
        from django.core.management.utils import get_random_secret_key
        SECRET_KEY = get_random_secret_key()
        try: keyfile.write_text(SECRET_KEY)
        except Exception: pass
if not SECRET_KEY and not DEBUG:
    raise RuntimeError("SECRET_KEY must be set when DEBUG=False")
ALLOWED_HOSTS = ["*"] if DESKTOP else [x.strip() for x in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if x.strip()]

INSTALLED_APPS = [
    "django.contrib.admin","django.contrib.auth","django.contrib.contenttypes","django.contrib.sessions","django.contrib.messages","django.contrib.staticfiles",
    "corsheaders","rest_framework","rest_framework_simplejwt.token_blacklist","django_filters","drf_spectacular",
    "accounts","stores","catalog","inventory","customers","sales","registers","audit","reports","purchasing","promotions","loyalty","offline_sync","tests_support","finance","expenses","hardware","pricing","transaction_engine","taxes","health","checkout_engine","approvals","tenancy","production_core","payments",
]
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "production_core.middleware.RequestIDMiddleware",
    "production_core.idempotency.IdempotencyMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF="config.urls"
TEMPLATES=[{"BACKEND":"django.template.backends.django.DjangoTemplates","DIRS":[],"APP_DIRS":True,"OPTIONS":{"context_processors":["django.template.context_processors.request","django.contrib.auth.context_processors.auth","django.contrib.messages.context_processors.messages"]}}]
WSGI_APPLICATION="config.wsgi.application"
ASGI_APPLICATION="config.asgi.application"

if DESKTOP or os.getenv("NOVAPOS_DB","").lower()=="sqlite":
    DATABASES={"default":{"ENGINE":"django.db.backends.sqlite3","NAME":str(DATA_DIR/"spos.sqlite3")}}
else:
    DATABASES={"default":{"ENGINE":"django.db.backends.postgresql","NAME":os.getenv("POSTGRES_DB","novapos"),"USER":os.getenv("POSTGRES_USER","postgres"),"PASSWORD":os.getenv("POSTGRES_PASSWORD",""),"HOST":os.getenv("POSTGRES_HOST","127.0.0.1"),"PORT":os.getenv("POSTGRES_PORT","5432"),"CONN_MAX_AGE":60,"OPTIONS":{"connect_timeout":10}}}
AUTH_USER_MODEL="accounts.User"
AUTH_PASSWORD_VALIDATORS=[
    {"NAME":"django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME":"django.contrib.auth.password_validation.MinimumLengthValidator","OPTIONS":{"min_length":8}},
]
LANGUAGE_CODE="en-us"
TIME_ZONE="Asia/Qatar"
USE_I18N=True
USE_TZ=True
STATIC_URL="static/"
STATIC_ROOT=str((DATA_DIR if DESKTOP else BASE_DIR)/"staticfiles")
MEDIA_URL="/media/"
MEDIA_ROOT=str((DATA_DIR if DESKTOP else BASE_DIR)/"media")
DEFAULT_AUTO_FIELD="django.db.models.BigAutoField"
# Bundled single-page frontend served by the backend (one process) via WhiteNoise.
WEBAPP_DIR=Path(os.getenv("NOVAPOS_WEBAPP", BASE_DIR/"webapp"))
if WEBAPP_DIR.exists():
    WHITENOISE_ROOT=str(WEBAPP_DIR); WHITENOISE_INDEX_FILE=True
STORAGES={"default":{"BACKEND":"django.core.files.storage.FileSystemStorage"},"staticfiles":{"BACKEND":"whitenoise.storage.CompressedStaticFilesStorage"}}

CORS_ALLOWED_ORIGINS=[x.strip() for x in os.getenv("CORS_ALLOWED_ORIGINS","http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()]
CORS_ALLOW_HEADERS=list(default_headers)+["x-request-id","idempotency-key"]
CORS_ALLOW_CREDENTIALS=True
# Desktop/LAN server: clients (mobile app, browsers on other devices) connect
# from arbitrary origins on the local network; auth is token-based, not cookie-based.
if DESKTOP:
    CORS_ALLOW_ALL_ORIGINS=True
    CORS_ALLOW_CREDENTIALS=False
CSRF_TRUSTED_ORIGINS=[x.strip() for x in os.getenv("CSRF_TRUSTED_ORIGINS","http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()]

REST_FRAMEWORK={
    "DEFAULT_AUTHENTICATION_CLASSES":("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES":("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS":("django_filters.rest_framework.DjangoFilterBackend","rest_framework.filters.SearchFilter","rest_framework.filters.OrderingFilter"),
    "DEFAULT_SCHEMA_CLASS":"drf_spectacular.openapi.AutoSchema",
    "DEFAULT_VERSIONING_CLASS":"rest_framework.versioning.URLPathVersioning",
    "DEFAULT_THROTTLE_CLASSES":("rest_framework.throttling.AnonRateThrottle","rest_framework.throttling.UserRateThrottle"),
    "DEFAULT_THROTTLE_RATES":{"anon":"60/min","user":"600/min"},
    "DEFAULT_PAGINATION_CLASS":"rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE":50,
}
SIMPLE_JWT={
    "ACCESS_TOKEN_LIFETIME":timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES","30"))),
    "REFRESH_TOKEN_LIFETIME":timedelta(days=int(os.getenv("JWT_REFRESH_DAYS","7"))),
    "ROTATE_REFRESH_TOKENS":True,
    "BLACKLIST_AFTER_ROTATION":True,
    "UPDATE_LAST_LOGIN":True,
    "AUTH_HEADER_TYPES":("Bearer",),
}
SPECTACULAR_SETTINGS={"TITLE":"S POS API","DESCRIPTION":"S POS — retail point of sale, inventory, payments, customers and accounting. Developed by Sridhar Mahalingam.","VERSION":"18.0.0","SERVE_INCLUDE_SCHEMA":False,"COMPONENT_SPLIT_REQUEST":True}

SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO","https")
SECURE_CONTENT_TYPE_NOSNIFF=True
X_FRAME_OPTIONS="DENY"
SESSION_COOKIE_SECURE=not DEBUG and not DESKTOP
CSRF_COOKIE_SECURE=not DEBUG and not DESKTOP
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE="Lax"
CSRF_COOKIE_SAMESITE="Lax"
SECURE_SSL_REDIRECT=not DEBUG and not DESKTOP
if not DEBUG and not DESKTOP:
    SECURE_HSTS_SECONDS=31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS=True
    SECURE_HSTS_PRELOAD=True

REDIS_URL=os.getenv("REDIS_URL","redis://127.0.0.1:6379/0")
CELERY_BROKER_URL=REDIS_URL
CELERY_RESULT_BACKEND=REDIS_URL
CELERY_ACCEPT_CONTENT=["json"]
CELERY_TASK_SERIALIZER="json"
CELERY_RESULT_SERIALIZER="json"
CELERY_TIMEZONE=TIME_ZONE
CELERY_ENABLE_UTC=True
if DESKTOP or not os.getenv("REDIS_URL"):
    CACHES={"default":{"BACKEND":"django.core.cache.backends.locmem.LocMemCache"}}
else:
    CACHES={"default":{"BACKEND":"django.core.cache.backends.redis.RedisCache","LOCATION":REDIS_URL,"TIMEOUT":300}}

EMAIL_BACKEND=os.getenv("EMAIL_BACKEND","django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL=os.getenv("DEFAULT_FROM_EMAIL","S POS <noreply@localhost>")
PAYMENT_WEBHOOK_SECRET=os.getenv("PAYMENT_WEBHOOK_SECRET","")
# Pluggable payment gateway: any provider worldwide (see payments/gateway.py).
PAYMENT_PROVIDER=os.getenv("PAYMENT_PROVIDER","manual")
PAYMENT_PROVIDER_CONFIG={"api_key":os.getenv("PAYMENT_API_KEY",""),"api_secret":os.getenv("PAYMENT_API_SECRET",""),"merchant_id":os.getenv("PAYMENT_MERCHANT_ID",""),"webhook_secret":os.getenv("PAYMENT_WEBHOOK_SECRET","")}
# Optional error monitoring (Sentry). Enabled only when SENTRY_DSN is set and not in desktop mode.
SENTRY_DSN=os.getenv("SENTRY_DSN","")
if SENTRY_DSN and not DESKTOP:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
        sentry_sdk.init(dsn=SENTRY_DSN,integrations=[DjangoIntegration()],
                        traces_sample_rate=float(os.getenv("SENTRY_TRACES","0.1")),send_default_pii=False,
                        environment=os.getenv("SENTRY_ENV","production"))
    except Exception:
        pass
LOG_LEVEL=os.getenv("LOG_LEVEL","INFO")
LOGGING={"version":1,"disable_existing_loggers":False,"handlers":{"console":{"class":"logging.StreamHandler"}},"root":{"handlers":["console"],"level":LOG_LEVEL}}
NOVAPOS={"API_VERSION":"v1","DEFAULT_CURRENCY":"QAR","DEFAULT_COUNTRY":"QA","DEFAULT_TIMEZONE":"Asia/Qatar","ENABLE_OFFLINE_MODE":True,"ENABLE_IDEMPOTENCY":True,"ENABLE_AUDIT_LOG":True,"ENABLE_DEVICE_HEARTBEAT":True,"ENABLE_PAYMENT_INTENTS":True,"REQUIRE_IDEMPOTENCY_FOR_CHECKOUT":True,
    "IDEMPOTENCY_TTL_SECONDS":86400,
    "MAX_REQUEST_BODY_BYTES":10485760,"DEFAULT_PAGE_SIZE":50}
