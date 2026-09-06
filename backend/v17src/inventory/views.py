from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import StoreInventory,InventoryLedger,StockTransfer
from .serializers import StoreInventorySerializer,InventoryLedgerSerializer,StockTransferSerializer
from .services import create_transfer,ship_transfer,receive_transfer
from stores.models import Store
from accounts.permissions import InventoryStaff

class StoreInventoryViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from api_core.scope import scope_store_queryset
        return scope_store_queryset(self.request, super().get_queryset(), "store")
    queryset=StoreInventory.objects.select_related("store","product").all().order_by("store_id","product_id")
    serializer_class=StoreInventorySerializer; permission_classes=[InventoryStaff]
    filterset_fields=["store","product"]; search_fields=["product__name","product__sku","product__barcode"]

    def update(self,request,*args,**kwargs):
        from decimal import Decimal
        from .services import adjust_stock
        obj=self.get_object()
        if "store" in request.data and int(request.data["store"]) != obj.store_id:
            return Response({"detail":"Store cannot be changed on an inventory record."},status=400)
        if "product" in request.data and int(request.data["product"]) != obj.product_id:
            return Response({"detail":"Product cannot be changed on an inventory record."},status=400)
        if "quantity" in request.data:
            try: target=Decimal(str(request.data["quantity"]))
            except Exception: return Response({"detail":"Invalid quantity."},status=400)
            delta=target-obj.quantity
            if delta:
                obj=adjust_stock(store=obj.store,product=obj.product,delta=delta,user=request.user,transaction_type="ADJUSTMENT",reference_type="INVENTORY",reference_id=obj.id,note="Inventory quantity edited via API")
        if "minimum_stock" in request.data or "reorder_level" in request.data:
            value=request.data.get("minimum_stock",request.data.get("reorder_level"))
            obj.minimum_stock=Decimal(str(value)); obj.save(update_fields=["minimum_stock","updated_at"])
        return Response(StoreInventorySerializer(obj).data)

    def destroy(self,request,*args,**kwargs):
        return Response({"detail":"Inventory records are ledger-backed and cannot be deleted. Use an adjustment to set the correct quantity."},status=405)

    def create(self,request,*args,**kwargs):
        # Treat direct stock creation as an opening/adjustment operation.
        from .services import adjust_stock
        from catalog.models import Product
        from stores.models import Store
        from decimal import Decimal
        try:
            store=Store.objects.get(pk=request.data.get("store"))
            product=Product.objects.get(pk=request.data.get("product"),active=True)
            qty=Decimal(str(request.data.get("quantity",0)))
            if qty < 0: raise ValueError("Quantity cannot be negative")
            inv=adjust_stock(store=store,product=product,delta=qty,user=request.user,transaction_type="OPENING",reference_type="MANUAL",reference_id="",note="Initial stock created via API")
            return Response(StoreInventorySerializer(inv).data,status=201)
        except Exception as e:
            return Response({"detail":str(e)},status=400)


class InventoryLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        from api_core.scope import scope_store_queryset
        return scope_store_queryset(self.request, super().get_queryset(), "store")
    queryset=InventoryLedger.objects.select_related("product","store","created_by").all().order_by("-created_at")
    serializer_class=InventoryLedgerSerializer; permission_classes=[InventoryStaff]
    filterset_fields=["store","product","transaction_type"]

class StockTransferViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from api_core.scope import scope_store_queryset
        return scope_store_queryset(self.request, super().get_queryset(), "source_store")
    queryset=StockTransfer.objects.select_related("source_store","destination_store","created_by").prefetch_related("items").all().order_by("-created_at")
    serializer_class=StockTransferSerializer; permission_classes=[InventoryStaff]
    filterset_fields=["source_store","destination_store","status"]
    @action(detail=False,methods=["post"],url_path="create")
    def create_transfer(self,request):
        try:
            src=Store.objects.get(id=request.data["source_store_id"])
            dst=Store.objects.get(id=request.data["destination_store_id"])
            t=create_transfer(user=request.user,source_store=src,destination_store=dst,items=request.data["items"])
            return Response(StockTransferSerializer(t).data,status=201)
        except Exception as e:return Response({"detail":str(e)},status=400)
    @action(detail=True,methods=["post"])
    def ship(self,request,pk=None):
        try:return Response(StockTransferSerializer(ship_transfer(user=request.user,transfer=self.get_object())).data)
        except Exception as e:return Response({"detail":str(e)},status=400)
    @action(detail=True,methods=["post"])
    def receive(self,request,pk=None):
        try:return Response(StockTransferSerializer(receive_transfer(user=request.user,transfer=self.get_object(),items=request.data.get("items"))).data)
        except Exception as e:return Response({"detail":str(e)},status=400)
