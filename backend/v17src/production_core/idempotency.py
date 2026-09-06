"""Production-safe HTTP idempotency middleware for mutation requests.

Uses Django's configured cache. A completed successful mutation is replayed for
retries using the same Idempotency-Key. Concurrent requests with the same key
receive 409 while the first request is in progress.
"""
import hashlib
import json
import time
from django.core.cache import cache
from django.http import HttpResponse, JsonResponse

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
DEFAULT_TTL = 24 * 60 * 60
LOCK_TTL = 120


def _fingerprint(request):
    body = request.body or b""
    return hashlib.sha256(body).hexdigest()


class IdempotencyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method not in MUTATING_METHODS:
            return self.get_response(request)

        key = request.headers.get("Idempotency-Key")
        if not key:
            return self.get_response(request)

        # Keep keys bounded and avoid leaking raw keys into cache names/logs.
        if len(key) > 200:
            return JsonResponse({
                "error": {"code": "INVALID_IDEMPOTENCY_KEY", "message": "Idempotency-Key is too long."}
            }, status=400)

        scope = f"{request.method}:{request.path}:{getattr(request, 'user', None).pk if getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False) else 'anonymous'}"
        digest = hashlib.sha256(f"{scope}:{key}".encode()).hexdigest()
        record_key = f"novapos:idempotency:result:{digest}"
        lock_key = f"novapos:idempotency:lock:{digest}"
        fingerprint = _fingerprint(request)

        existing = cache.get(record_key)
        if existing:
            if existing.get("fingerprint") != fingerprint:
                return JsonResponse({
                    "error": {"code": "IDEMPOTENCY_KEY_REUSED", "message": "Idempotency-Key was already used with a different request."}
                }, status=409)
            return self._replay(existing)

        # cache.add is atomic for Redis/Memcached and gives us a simple single-flight guard.
        if not cache.add(lock_key, {"fingerprint": fingerprint, "started": time.time()}, LOCK_TTL):
            return JsonResponse({
                "error": {"code": "IDEMPOTENCY_IN_PROGRESS", "message": "An identical request is already being processed."}
            }, status=409)

        try:
            response = self.get_response(request)
            # Only cache successful mutation results. Failures are safe to retry.
            if 200 <= response.status_code < 300:
                payload = {
                    "status": response.status_code,
                    "content": bytes(response.content),
                    "content_type": response.get("Content-Type", "application/json"),
                    "fingerprint": fingerprint,
                }
                cache.set(record_key, payload, DEFAULT_TTL)
            return response
        finally:
            cache.delete(lock_key)

    @staticmethod
    def _replay(record):
        response = HttpResponse(record["content"], status=record["status"], content_type=record["content_type"])
        response["X-Idempotent-Replay"] = "true"
        return response
