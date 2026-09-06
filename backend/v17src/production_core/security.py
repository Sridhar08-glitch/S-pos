"""Small production security helpers shared by API code."""
from functools import wraps
from django.http import JsonResponse


def require_idempotency_key(view):
    """Require Idempotency-Key on a mutation endpoint."""
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if request.method in {"POST", "PUT", "PATCH", "DELETE"} and not request.headers.get("Idempotency-Key"):
            return JsonResponse({
                "error": {"code": "IDEMPOTENCY_KEY_REQUIRED", "message": "Idempotency-Key header is required."}
            }, status=400)
        return view(request, *args, **kwargs)
    return wrapped
