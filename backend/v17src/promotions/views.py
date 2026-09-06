from rest_framework import viewsets
from .models import Promotion
from .serializers import PromotionSerializer
from accounts.permissions import AdminManager
class PromotionViewSet(viewsets.ModelViewSet):
    queryset=Promotion.objects.select_related("product","category").all().order_by("-starts_at").order_by("-starts_at")
    serializer_class=PromotionSerializer; permission_classes=[AdminManager]
    filterset_fields=["active","kind","product","category"]
