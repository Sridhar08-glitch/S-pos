from decimal import Decimal
import uuid
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from accounts.permissions import InventoryStaff
from api_core.scope import scope_store_queryset, scoped_store_id
from .models import StockCount, StockCountItem, StoreInventory
from .services import post_stock_count


class StockCountItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)
    class Meta:
        model = StockCountItem
        fields = ["id", "product", "product_name", "sku", "system_quantity", "counted_quantity", "variance"]
        read_only_fields = ["system_quantity", "variance"]


class StockCountSerializer(serializers.ModelSerializer):
    items = StockCountItemSerializer(many=True, read_only=True)
    class Meta:
        model = StockCount
        fields = ["id", "store", "reference", "status", "note", "created_by", "created_at", "posted_at", "items"]
        read_only_fields = ["reference", "status", "created_by", "created_at", "posted_at"]


class StockCountViewSet(viewsets.ModelViewSet):
    queryset = StockCount.objects.select_related("store", "created_by").prefetch_related("items__product").all().order_by("-created_at")
    serializer_class = StockCountSerializer
    permission_classes = [InventoryStaff]
    filterset_fields = ["store", "status"]

    def get_queryset(self):
        return scope_store_queryset(self.request, super().get_queryset(), "store")

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        d = request.data
        own = scoped_store_id(request)
        store_id = d.get("store") or getattr(request.user, "store_id", None)
        if not store_id:
            return Response({"detail": "Store is required or user must be assigned to a store."}, status=400)
        if own and str(d.get("store") or store_id) != str(own):
            raise PermissionDenied("You may only count your own store.")
        count = StockCount.objects.create(
            store_id=store_id, reference=f"CNT-{uuid.uuid4().hex[:8].upper()}",
            note=d.get("note", ""), created_by=request.user)
        for row in d.get("items", []):
            inv = StoreInventory.objects.filter(store_id=store_id, product_id=row["product"]).first()
            system = inv.quantity if inv else Decimal("0")
            StockCountItem.objects.create(
                count=count, product_id=row["product"], system_quantity=system,
                counted_quantity=Decimal(str(row.get("counted_quantity", 0))))
        return Response(self.get_serializer(count).data, status=201)

    @action(detail=True, methods=["post"], url_path="post")
    def post_count(self, request, pk=None):
        try:
            return Response(self.get_serializer(post_stock_count(user=request.user, count=self.get_object())).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)
