from rest_framework import viewsets
from .models import Customer
from .credit_models import CreditLedger,GiftCardLedger,StoreCreditLedger
from .serializers import CustomerSerializer,CreditLedgerSerializer,GiftCardLedgerSerializer,StoreCreditLedgerSerializer
from accounts.permissions import SalesStaff
class CustomerViewSet(viewsets.ModelViewSet):
    queryset=Customer.objects.all().order_by("name")
    serializer_class=CustomerSerializer
    search_fields=["name","phone","email"]
    permission_classes=[SalesStaff]


class CreditLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=CreditLedger.objects.select_related("account","account__customer","created_by").order_by("-created_at"); serializer_class=CreditLedgerSerializer; permission_classes=[SalesStaff]
class GiftCardLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=GiftCardLedger.objects.select_related("gift_card","created_by").order_by("-created_at"); serializer_class=GiftCardLedgerSerializer; permission_classes=[SalesStaff]
class StoreCreditLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=StoreCreditLedger.objects.select_related("store_credit","store_credit__customer","created_by").order_by("-created_at"); serializer_class=StoreCreditLedgerSerializer; permission_classes=[SalesStaff]
