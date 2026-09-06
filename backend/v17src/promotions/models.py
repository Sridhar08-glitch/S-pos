from django.db import models
from django.utils import timezone
from catalog.models import Product,Category

class Promotion(models.Model):
    class Kind(models.TextChoices):
        PERCENT="PERCENT","Percent"; FIXED="FIXED","Fixed"; BUY_X_GET_Y="BUY_X_GET_Y","Buy X Get Y"
    name=models.CharField(max_length=200)
    kind=models.CharField(max_length=20,choices=Kind.choices)
    value=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    buy_quantity=models.DecimalField(max_digits=12,decimal_places=3,default=0)
    get_quantity=models.DecimalField(max_digits=12,decimal_places=3,default=0)
    product=models.ForeignKey(Product,null=True,blank=True,on_delete=models.CASCADE)
    category=models.ForeignKey(Category,null=True,blank=True,on_delete=models.CASCADE)
    starts_at=models.DateTimeField()
    ends_at=models.DateTimeField()
    active=models.BooleanField(default=True)
    def is_live(self):
        now=timezone.now()
        return self.active and self.starts_at<=now<=self.ends_at
