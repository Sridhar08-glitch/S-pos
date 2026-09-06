from decimal import Decimal
from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Supplier,Purchase,PurchaseItem
from .serializers import SupplierSerializer,PurchaseSerializer,PurchaseItemSerializer
from .receiving import receive_purchase
from catalog.models import Product
from accounts.permissions import InventoryStaff
class SupplierViewSet(viewsets.ModelViewSet):
    queryset=Supplier.objects.all().order_by("name"); serializer_class=SupplierSerializer; permission_classes=[InventoryStaff]; search_fields=["name","phone","email"]
class PurchaseItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=PurchaseItem.objects.select_related("purchase","product").all().order_by("purchase_id","id"); serializer_class=PurchaseItemSerializer; permission_classes=[InventoryStaff]; filterset_fields=["purchase","product"]
class PurchaseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from api_core.scope import scope_store_queryset
        return scope_store_queryset(self.request, super().get_queryset(), "store")
    queryset=Purchase.objects.select_related("supplier","store","created_by").prefetch_related("items").all().order_by("-created_at")
    serializer_class=PurchaseSerializer; permission_classes=[InventoryStaff]; filterset_fields=["supplier","store","status"]
    @transaction.atomic
    def create(self,request,*args,**kwargs):
        d=request.data
        from api_core.scope import scoped_store_id
        from rest_framework.exceptions import PermissionDenied
        own_store=scoped_store_id(request)  # None for ADMIN/superuser
        if own_store and d.get("store") and str(d.get("store"))!=str(own_store):
            raise PermissionDenied("You may only create purchases for your own store.")
        store_id=d.get("store") or getattr(request.user,"store_id",None)
        invoice_number=d.get("invoice_number") or d.get("reference")
        if not store_id: raise ValidationError({"store":"Store is required or user must be assigned to a store"})
        if not invoice_number: raise ValidationError({"invoice_number":"invoice_number or reference is required"})
        purchase=Purchase.objects.create(supplier_id=d["supplier"],store_id=store_id,invoice_number=invoice_number,created_by=request.user,status="DRAFT")
        subtotal=Decimal("0")
        for row in d.get("items",[]):
            p=Product.objects.get(pk=row["product"])
            q=Decimal(str(row["quantity"])); c=Decimal(str(row["unit_cost"]))
            if q<=0 or c<0: raise ValueError("Invalid purchase item")
            PurchaseItem.objects.create(purchase=purchase,product=p,quantity=q,unit_cost=c,tax_rate=row.get("tax_rate",p.tax_rate))
            subtotal+=q*c
        purchase.subtotal=subtotal; purchase.tax_amount=Decimal(str(d.get("tax_amount",0))); purchase.total_amount=subtotal+purchase.tax_amount; purchase.save(update_fields=["subtotal","tax_amount","total_amount"])
        return Response(self.get_serializer(purchase).data,status=201)
    @action(detail=True,methods=["post"])
    @transaction.atomic
    def receive(self,request,pk=None):
        purchase=self.get_object()
        if purchase.status=="RECEIVED": return Response({"detail":"Purchase already received"},status=400)
        rows=[]
        requested={int(x["item_id"]):Decimal(str(x["quantity"])) for x in request.data.get("items",[])}
        for item in purchase.items.select_related("product"):
            remaining=item.quantity-item.received_quantity
            qty=requested.get(item.id,remaining) if request.data.get("items") else remaining
            if qty<0 or qty>remaining: raise ValidationError({"items":f"Invalid quantity for item {item.id}"})
            if qty: rows.append({"product":item.product,"quantity":qty,"unit_cost":item.unit_cost,"batch_number":request.data.get("batch_number"),"expiry_date":request.data.get("expiry_date")})
        receive_purchase(purchase=purchase,store=purchase.store,user=request.user,items=rows)
        for item in purchase.items.all():
            if item.id in requested: item.received_quantity += requested[item.id]; item.save(update_fields=["received_quantity"])
        purchase.refresh_from_db(); purchase.status="RECEIVED" if all(i.received_quantity>=i.quantity for i in purchase.items.all()) else "ORDERED"; purchase.save(update_fields=["status"])
        return Response(self.get_serializer(purchase).data)
