from rest_framework import viewsets
from .models import AuditLog
from .serializers import AuditLogSerializer
from accounts.permissions import AdminManager
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=AuditLog.objects.select_related("user","store").all().order_by("-created_at")
    serializer_class=AuditLogSerializer
    permission_classes=[AdminManager]
    filterset_fields=["action","entity_type","user","store"]
