from django.db import models
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Category,Product,ProductBarcode
from .serializers import CategorySerializer,ProductSerializer,ProductLookupSerializer
from accounts.permissions import AdminManager,SalesStaff,InventoryStaff

class CategoryViewSet(viewsets.ModelViewSet):
    queryset=Category.objects.all().order_by("name")
    serializer_class=CategorySerializer
    permission_classes=[AdminManager]

class ProductViewSet(viewsets.ModelViewSet):
    queryset=Product.objects.select_related("category").all().order_by("name")
    serializer_class=ProductSerializer
    search_fields=["name","sku","barcode","qr_code"]
    def get_queryset(self):
        qs=super().get_queryset()
        # Products are global catalog data; inventory/store access is enforced on stock operations.
        return qs
    filterset_fields=["category","active"]
    def get_permissions(self):
        if self.action in ["list","retrieve"]: return [SalesStaff()]
        return [AdminManager()]
    @action(detail=False,methods=["get"],url_path="lookup")
    def lookup(self,request):
        code=request.query_params.get("code","").strip()
        if not code:return Response({"detail":"code is required"},status=400)
        p=Product.objects.select_related("category").filter(active=True).filter(
            models.Q(barcode=code)|models.Q(qr_code=code)|models.Q(sku=code)|models.Q(barcodes__barcode=code)).distinct().first()
        if not p:return Response({"detail":"Product not found"},status=404)
        return Response(ProductLookupSerializer(p).data)
