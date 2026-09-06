from rest_framework import serializers,viewsets
from .models import ProductBarcode
from accounts.permissions import AdminManager,SalesStaff
class ProductBarcodeSerializer(serializers.ModelSerializer):
    class Meta: model=ProductBarcode; fields="__all__"
class ProductBarcodeViewSet(viewsets.ModelViewSet):
    queryset=ProductBarcode.objects.select_related("product").all().order_by("barcode").order_by("barcode")
    serializer_class=ProductBarcodeSerializer
    filterset_fields=["product","barcode_type","is_primary"]
    search_fields=["barcode","product__name","product__sku"]
    def get_permissions(self): return [SalesStaff()] if self.action in ["list","retrieve"] else [AdminManager()]
