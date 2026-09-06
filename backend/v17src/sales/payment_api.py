from rest_framework import serializers,viewsets
from .models import Payment
from accounts.permissions import SalesStaff
class PaymentSerializer(serializers.ModelSerializer):
    class Meta: model=Payment; fields="__all__"
class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=Payment.objects.select_related("sale").all().order_by("-paid_at"); serializer_class=PaymentSerializer; permission_classes=[SalesStaff]
    filterset_fields=["sale","method","status","provider"]
