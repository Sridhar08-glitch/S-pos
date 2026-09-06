from django.db import connection
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.cache import cache
class HealthView(APIView):
    permission_classes=[AllowAny]; authentication_classes=[]
    def get(self,request):
        checks={}
        try:
            with connection.cursor() as c: c.execute("SELECT 1")
            checks["database"]="ok"
        except Exception as e: checks["database"]=f"error: {type(e).__name__}"
        try:
            cache.set("novapos_health","ok",5)
            checks["cache"]="ok" if cache.get("novapos_health")=="ok" else "error"
        except Exception as e: checks["cache"]=f"error: {type(e).__name__}"
        healthy=all(v=="ok" for v in checks.values())
        return Response({"status":"ok" if healthy else "degraded","version":"18.0","checks":checks},
                        status=200 if healthy else 503)
class ReadinessView(HealthView): pass
