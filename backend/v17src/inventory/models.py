from django.db import models
from django.conf import settings
from stores.models import Store
from catalog.models import Product

class StoreInventory(models.Model):
    store=models.ForeignKey(Store,on_delete=models.CASCADE,related_name="inventory")
    product=models.ForeignKey(Product,on_delete=models.CASCADE,related_name="store_inventory")
    quantity=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    reserved_quantity=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    minimum_stock=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    updated_at=models.DateTimeField(auto_now=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["store","product"],name="uniq_product_per_store")]
        indexes=[models.Index(fields=["store","product"])]

class InventoryLedger(models.Model):
    class Type(models.TextChoices):
        OPENING="OPENING","Opening"; PURCHASE="PURCHASE","Purchase"; SALE="SALE","Sale"
        RETURN="RETURN","Return"; ADJUSTMENT="ADJUSTMENT","Adjustment"; DAMAGE="DAMAGE","Damage"
        TRANSFER_IN="TRANSFER_IN","Transfer In"; TRANSFER_OUT="TRANSFER_OUT","Transfer Out"
    store=models.ForeignKey(Store,on_delete=models.PROTECT,related_name="inventory_ledger")
    product=models.ForeignKey(Product,on_delete=models.PROTECT,related_name="inventory_ledger")
    transaction_type=models.CharField(max_length=20,choices=Type.choices)
    quantity=models.DecimalField(max_digits=14,decimal_places=3)
    before_quantity=models.DecimalField(max_digits=14,decimal_places=3)
    after_quantity=models.DecimalField(max_digits=14,decimal_places=3)
    reference_type=models.CharField(max_length=80,blank=True)
    reference_id=models.CharField(max_length=100,blank=True)
    note=models.TextField(blank=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering=["-created_at"]
        indexes=[models.Index(fields=["store","product","created_at"])]

class StockTransfer(models.Model):
    class Status(models.TextChoices):
        DRAFT="DRAFT","Draft"; APPROVED="APPROVED","Approved"; SHIPPED="SHIPPED","Shipped"; RECEIVED="RECEIVED","Received"; CANCELLED="CANCELLED","Cancelled"
    transfer_number=models.CharField(max_length=40,unique=True)
    source_store=models.ForeignKey(Store,on_delete=models.PROTECT,related_name="outgoing_transfers")
    destination_store=models.ForeignKey(Store,on_delete=models.PROTECT,related_name="incoming_transfers")
    status=models.CharField(max_length=20,choices=Status.choices,default=Status.DRAFT)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="created_transfers")
    approved_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.PROTECT,related_name="approved_transfers")
    shipped_at=models.DateTimeField(null=True,blank=True)
    received_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)

class StockTransferItem(models.Model):
    transfer=models.ForeignKey(StockTransfer,on_delete=models.CASCADE,related_name="items")
    product=models.ForeignKey(Product,on_delete=models.PROTECT)
    quantity=models.DecimalField(max_digits=14,decimal_places=3)
    received_quantity=models.DecimalField(max_digits=14,decimal_places=3,default=0)

class StockCount(models.Model):
    class Status(models.TextChoices):
        DRAFT="DRAFT","Draft"; POSTED="POSTED","Posted"
    store=models.ForeignKey(Store,on_delete=models.PROTECT,related_name="stock_counts")
    reference=models.CharField(max_length=40,unique=True)
    status=models.CharField(max_length=10,choices=Status.choices,default=Status.DRAFT)
    note=models.CharField(max_length=250,blank=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    created_at=models.DateTimeField(auto_now_add=True)
    posted_at=models.DateTimeField(null=True,blank=True)

class StockCountItem(models.Model):
    count=models.ForeignKey(StockCount,related_name="items",on_delete=models.CASCADE)
    product=models.ForeignKey(Product,on_delete=models.PROTECT)
    system_quantity=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    counted_quantity=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    variance=models.DecimalField(max_digits=14,decimal_places=3,default=0)

# Register traceability models for Django migrations/app registry.
from .traceability import ProductSerial, ProductBatch  # noqa: E402,F401
