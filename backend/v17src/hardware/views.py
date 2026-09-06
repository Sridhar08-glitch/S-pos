from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Device
from .serializers import DeviceSerializer
from accounts.permissions import AdminManager,SalesStaff
class DeviceViewSet(viewsets.ModelViewSet):
    queryset=Device.objects.select_related("store","register").all().order_by("-last_seen_at")
    serializer_class=DeviceSerializer
    permission_classes=[AdminManager]
    @action(detail=True,methods=["post"],permission_classes=[SalesStaff])
    def heartbeat(self,request,pk=None):
        d=self.get_object()
        d.last_seen_at=timezone.now()
        d.save(update_fields=["last_seen_at"])
        return Response({"status":"ok","last_seen_at":d.last_seen_at})
