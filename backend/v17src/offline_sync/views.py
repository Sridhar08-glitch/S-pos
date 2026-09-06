from django.utils import timezone
from rest_framework import viewsets,status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import SyncEvent
from .serializers import SyncEventSerializer
from accounts.permissions import SalesStaff
class SyncEventViewSet(viewsets.ModelViewSet):
    queryset=SyncEvent.objects.all().order_by("created_at")
    serializer_class=SyncEventSerializer
    permission_classes=[SalesStaff]
    filterset_fields=["device_id","status"]
    def perform_create(self,serializer):
        serializer.save(created_by=self.request.user)
    @action(detail=False,methods=["post"])
    def push(self,request):
        events=request.data.get("events",[])
        accepted=[]; errors=[]
        for item in events:
            try:
                obj,created=SyncEvent.objects.get_or_create(
                    client_event_id=item["client_event_id"],
                    defaults={"device_id":item.get("device_id",""),"event_type":item["event_type"],
                              "payload":item.get("payload",{}),"created_by":request.user})
                if created:
                    obj.status="QUEUED"; obj.attempt_count=0; obj.error=""; obj.save(update_fields=["status","attempt_count","error"])
                accepted.append(obj.client_event_id)
            except Exception as e: errors.append({"client_event_id":item.get("client_event_id"),"error":str(e)})
        return Response({"accepted":accepted,"errors":errors},status=status.HTTP_200_OK)
