from django.db import models
from django.conf import settings
from stores.models import Store

class Account(models.Model):
    code=models.CharField(max_length=30,unique=True)
    name=models.CharField(max_length=150)
    account_type=models.CharField(max_length=30)
    active=models.BooleanField(default=True)

class JournalEntry(models.Model):
    reference_type=models.CharField(max_length=80)
    reference_id=models.CharField(max_length=100)
    description=models.CharField(max_length=250)
    store=models.ForeignKey(Store,null=True,blank=True,on_delete=models.PROTECT)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering=["-created_at"]

class JournalLine(models.Model):
    entry=models.ForeignKey(JournalEntry,on_delete=models.PROTECT,related_name="lines")
    account=models.ForeignKey(Account,on_delete=models.PROTECT)
    debit=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    credit=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    description=models.CharField(max_length=250,blank=True)

class PaymentReconciliation(models.Model):
    store=models.ForeignKey(Store,on_delete=models.PROTECT)
    payment_method=models.CharField(max_length=30)
    business_date=models.DateField()
    expected_amount=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    actual_amount=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    difference=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    status=models.CharField(max_length=20,default="OPEN")
    created_at=models.DateTimeField(auto_now_add=True)
