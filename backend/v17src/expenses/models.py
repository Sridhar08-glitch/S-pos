from django.db import models
from django.conf import settings
from stores.models import Store
class Expense(models.Model):
    class Status(models.TextChoices):
        DRAFT="DRAFT","Draft"; APPROVED="APPROVED","Approved"; PAID="PAID","Paid"; VOID="VOID","Void"
    store=models.ForeignKey(Store,on_delete=models.PROTECT,related_name="expenses")
    category=models.CharField(max_length=100)
    description=models.CharField(max_length=250)
    amount=models.DecimalField(max_digits=14,decimal_places=2)
    payment_method=models.CharField(max_length=30,default="CASH")
    status=models.CharField(max_length=20,choices=Status.choices,default="DRAFT")
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    approved_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.PROTECT,related_name="approved_expenses")
    created_at=models.DateTimeField(auto_now_add=True)
    paid_at=models.DateTimeField(null=True,blank=True)
