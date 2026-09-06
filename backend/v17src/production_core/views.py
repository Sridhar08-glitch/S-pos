from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import AuditEvent,DeviceHeartbeat
from .serializers import AuditEventSerializer,DeviceHeartbeatSerializer
from accounts.permissions import AdminManager
class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=AuditEvent.objects.select_related("actor").all().order_by("-created_at"); serializer_class=AuditEventSerializer; permission_classes=[AdminManager]
    filterset_fields=["action","reference_type","store_id","device_id","actor"]
class DeviceHeartbeatViewSet(viewsets.ModelViewSet):
    queryset=DeviceHeartbeat.objects.all(); serializer_class=DeviceHeartbeatSerializer; permission_classes=[AdminManager]
    @action(detail=True,methods=["post"])
    def heartbeat(self,request,pk=None):
        x=self.get_object(); x.last_seen=timezone.now(); x.status="ONLINE"; x.app_version=request.data.get("app_version",x.app_version); x.save()
        return Response(self.get_serializer(x).data)
