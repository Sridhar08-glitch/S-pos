from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ApprovalRequest
from .serializers import ApprovalRequestSerializer
from accounts.permissions import AdminManager
class ApprovalRequestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=ApprovalRequest.objects.select_related("requested_by","approved_by").all().order_by("-created_at")
    serializer_class=ApprovalRequestSerializer
    permission_classes=[AdminManager]
    def perform_create(self,serializer):
        serializer.save(requested_by=self.request.user)
    @action(detail=True,methods=["post"])
    def approve(self,request,pk=None):
        obj=self.get_object(); obj.status="APPROVED"; obj.approved_by=request.user; obj.decided_at=timezone.now()
        obj.save(update_fields=["status","approved_by","decided_at"]); return Response(self.get_serializer(obj).data)
    @action(detail=True,methods=["post"])
    def reject(self,request,pk=None):
        obj=self.get_object(); obj.status="REJECTED"; obj.approved_by=request.user; obj.decided_at=timezone.now()
        obj.save(update_fields=["status","approved_by","decided_at"]); return Response(self.get_serializer(obj).data)
