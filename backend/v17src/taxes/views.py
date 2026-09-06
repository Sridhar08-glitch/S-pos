from decimal import Decimal
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import TaxRate
from .serializers import TaxRateSerializer
from .services import calculate_tax
from accounts.permissions import AdminManager
class TaxRateViewSet(viewsets.ModelViewSet):
    queryset=TaxRate.objects.all().order_by("name").order_by("name"); serializer_class=TaxRateSerializer; permission_classes=[AdminManager]
    @action(detail=False,methods=["post"])
    def calculate(self,request):
        return Response(calculate_tax(net_amount=request.data.get("amount",0),rate=request.data.get("rate",0),
            inclusive=bool(request.data.get("inclusive",False))))
