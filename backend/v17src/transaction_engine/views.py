from rest_framework import viewsets
from .models import BusinessTransaction
from .serializers import BusinessTransactionSerializer
from accounts.permissions import AdminManager
class BusinessTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=BusinessTransaction.objects.select_related("store","user").prefetch_related("events").all().order_by("-created_at")
    serializer_class=BusinessTransactionSerializer
    permission_classes=[AdminManager]
    filterset_fields=["store","status","transaction_type","device_id"]
