from rest_framework import viewsets
from .models import PriceList,PriceListItem,CustomerPriceList,Unit
from .serializers import PriceListSerializer,PriceListItemSerializer,CustomerPriceListSerializer,UnitSerializer
from accounts.permissions import AdminManager
class PriceListViewSet(viewsets.ModelViewSet):
    queryset=PriceList.objects.all().order_by("name"); serializer_class=PriceListSerializer; permission_classes=[AdminManager]
class PriceListItemViewSet(viewsets.ModelViewSet):
    queryset=PriceListItem.objects.select_related("price_list","product").all().order_by("price_list_id","product_id"); serializer_class=PriceListItemSerializer; permission_classes=[AdminManager]
class CustomerPriceListViewSet(viewsets.ModelViewSet):
    queryset=CustomerPriceList.objects.select_related("customer","price_list").all().order_by("customer_id"); serializer_class=CustomerPriceListSerializer; permission_classes=[AdminManager]
class UnitViewSet(viewsets.ModelViewSet):
    queryset=Unit.objects.all().order_by("code"); serializer_class=UnitSerializer; permission_classes=[AdminManager]
