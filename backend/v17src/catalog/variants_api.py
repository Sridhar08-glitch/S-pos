from rest_framework import viewsets
from accounts.permissions import InventoryStaff
from .variants import ProductVariant, ModifierGroup, Modifier, ProductModifierGroup
from .serializers import (ProductVariantSerializer, ModifierGroupSerializer,
                          ModifierSerializer, ProductModifierGroupSerializer)


class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.select_related("product").all().order_by("product_id", "name")
    serializer_class = ProductVariantSerializer
    permission_classes = [InventoryStaff]
    filterset_fields = ["product", "active"]
    search_fields = ["name", "sku", "barcode"]


class ModifierGroupViewSet(viewsets.ModelViewSet):
    queryset = ModifierGroup.objects.prefetch_related("modifiers").all().order_by("name")
    serializer_class = ModifierGroupSerializer
    permission_classes = [InventoryStaff]
    filterset_fields = ["active"]


class ModifierViewSet(viewsets.ModelViewSet):
    queryset = Modifier.objects.select_related("group").all().order_by("group_id", "name")
    serializer_class = ModifierSerializer
    permission_classes = [InventoryStaff]
    filterset_fields = ["group", "active"]


class ProductModifierGroupViewSet(viewsets.ModelViewSet):
    queryset = ProductModifierGroup.objects.select_related("product", "group").all().order_by("product_id")
    serializer_class = ProductModifierGroupSerializer
    permission_classes = [InventoryStaff]
    filterset_fields = ["product", "group"]
