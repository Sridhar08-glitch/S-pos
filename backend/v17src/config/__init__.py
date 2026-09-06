# Celery is only needed for the server/website's background tasks. The self-contained
# desktop build runs without it, so import gracefully instead of crashing at startup.
try:
    from .celery import app as celery_app
except Exception:
    celery_app = None
__all__ = ['celery_app']
