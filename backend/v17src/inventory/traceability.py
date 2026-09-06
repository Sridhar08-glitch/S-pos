from django.db import models
from catalog.models import Product
from stores.models import Store
class ProductSerial(models.Model):
    product=models.ForeignKey(Product,on_delete=models.PROTECT,related_name="serials")
    serial_number=models.CharField(max_length=150,unique=True)
    store=models.ForeignKey(Store,null=True,blank=True,on_delete=models.PROTECT)
    status=models.CharField(max_length=30,default="IN_STOCK")
    sale_id=models.BigIntegerField(null=True,blank=True)
class ProductBatch(models.Model):
    product=models.ForeignKey(Product,on_delete=models.PROTECT,related_name="batches")
    store=models.ForeignKey(Store,on_delete=models.PROTECT)
    batch_number=models.CharField(max_length=100)
    expiry_date=models.DateField(null=True,blank=True)
    quantity=models.DecimalField(max_digits=14,decimal_places=3,default=0)
    unit_cost=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["product","store","batch_number"],name="uniq_product_store_batch")]
