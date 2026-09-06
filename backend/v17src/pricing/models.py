from django.db import models
from catalog.models import Product
from customers.models import Customer

class PriceList(models.Model):
    name=models.CharField(max_length=120,unique=True)
    currency=models.CharField(max_length=10,default="QAR")
    active=models.BooleanField(default=True)

class PriceListItem(models.Model):
    price_list=models.ForeignKey(PriceList,on_delete=models.CASCADE,related_name="items")
    product=models.ForeignKey(Product,on_delete=models.CASCADE)
    price=models.DecimalField(max_digits=12,decimal_places=2)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["price_list","product"],name="uniq_price_list_product")]

class CustomerPriceList(models.Model):
    customer=models.OneToOneField(Customer,on_delete=models.CASCADE,related_name="price_list")
    price_list=models.ForeignKey(PriceList,on_delete=models.PROTECT)

class Unit(models.Model):
    code=models.CharField(max_length=20,unique=True)
    name=models.CharField(max_length=50)
    decimals=models.PositiveSmallIntegerField(default=0)
    weight_based=models.BooleanField(default=False)
