from django.db import models
from django.conf import settings
from stores.models import Store
from catalog.models import Product

class Supplier(models.Model):
    name=models.CharField(max_length=200)
    phone=models.CharField(max_length=40,blank=True)
    email=models.EmailField(blank=True)
    tax_number=models.CharField(max_length=100,blank=True)
    address=models.TextField(blank=True)
    active=models.BooleanField(default=True)
    def __str__(self): return self.name

class Purchase(models.Model):
    class Status(models.TextChoices):
        DRAFT="DRAFT","Draft"; ORDERED="ORDERED","Ordered"; RECEIVED="RECEIVED","Received"; CANCELLED="CANCELLED","Cancelled"
    supplier=models.ForeignKey(Supplier,on_delete=models.PROTECT,related_name="purchases")
    store=models.ForeignKey(Store,on_delete=models.PROTECT,related_name="purchases")
    invoice_number=models.CharField(max_length=80)
    status=models.CharField(max_length=20,choices=Status.choices,default=Status.DRAFT)
    subtotal=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    tax_amount=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    total_amount=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    created_at=models.DateTimeField(auto_now_add=True)

class PurchaseItem(models.Model):
    purchase=models.ForeignKey(Purchase,on_delete=models.CASCADE,related_name="items")
    product=models.ForeignKey(Product,on_delete=models.PROTECT)
    quantity=models.DecimalField(max_digits=14,decimal_places=3)
    received_quantity=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    unit_cost=models.DecimalField(max_digits=12,decimal_places=2)
    tax_rate=models.DecimalField(max_digits=6,decimal_places=4,default=.05)
