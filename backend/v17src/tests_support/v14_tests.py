from django.test import SimpleTestCase, override_settings
from django.core.cache import cache
from django.http import JsonResponse
from production_core.idempotency import IdempotencyMiddleware


class IdempotencyMiddlewareTests(SimpleTestCase):
    @override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "v14-test"}})
    def test_duplicate_success_is_replayed(self):
        calls = {"count": 0}

        def view(request):
            calls["count"] += 1
            return JsonResponse({"ok": True, "call": calls["count"]}, status=201)

        middleware = IdempotencyMiddleware(view)
        req1 = self.client.post("/api/v1/test/", data='{"x":1}', content_type="application/json", HTTP_IDEMPOTENCY_KEY="abc")
        req2 = self.client.post("/api/v1/test/", data='{"x":1}', content_type="application/json", HTTP_IDEMPOTENCY_KEY="abc")
        r1 = middleware(req1)
        r2 = middleware(req2)
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(r2.headers.get("X-Idempotent-Replay"), "true")
        self.assertEqual(calls["count"], 1)
        cache.clear()

    @override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "v14-test-2"}})
    def test_same_key_with_different_body_is_rejected(self):
        def view(request):
            return JsonResponse({"ok": True}, status=200)
        middleware = IdempotencyMiddleware(view)
        r1 = middleware(self.client.post("/x", data='{"x":1}', content_type="application/json", HTTP_IDEMPOTENCY_KEY="abc"))
        r2 = middleware(self.client.post("/x", data='{"x":2}', content_type="application/json", HTTP_IDEMPOTENCY_KEY="abc"))
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 409)
        cache.clear()
