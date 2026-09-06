from django.db import models
from .models import Product
class ProductBundle(models.Model):
    product=models.OneToOneField(Product,on_delete=models.CASCADE,related_name="bundle")
    name=models.CharField(max_length=150)
    active=models.BooleanField(default=True)
class ProductBundleItem(models.Model):
    bundle=models.ForeignKey(ProductBundle,on_delete=models.CASCADE,related_name="items")
    component=models.ForeignKey(Product,on_delete=models.PROTECT)
    quantity=models.DecimalField(max_digits=14,decimal_places=3)
