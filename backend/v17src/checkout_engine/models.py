from django.db import models
from django.conf import settings
from stores.models import Store

class CheckoutExecution(models.Model):
    transaction_id=models.OneToOneField("transaction_engine.BusinessTransaction",on_delete=models.PROTECT,related_name="checkout")
    store=models.ForeignKey(Store,on_delete=models.PROTECT)
    sale=models.ForeignKey("sales.Sale",null=True,blank=True,on_delete=models.PROTECT)
    stage=models.CharField(max_length=40,default="CREATED")
    pricing_total=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    tax_total=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    payment_total=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    inventory_total=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    error=models.TextField(blank=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
