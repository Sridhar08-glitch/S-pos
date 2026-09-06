from django.db import models
from django.conf import settings
from .models import Customer
class CustomerCreditAccount(models.Model):
    customer=models.OneToOneField(Customer,on_delete=models.CASCADE,related_name="credit_account")
    credit_limit=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    balance=models.DecimalField(max_digits=14,decimal_places=2,default=0)
    active=models.BooleanField(default=True)
class CreditLedger(models.Model):
    account=models.ForeignKey(CustomerCreditAccount,on_delete=models.PROTECT,related_name="ledger")
    transaction_type=models.CharField(max_length=30)
    amount=models.DecimalField(max_digits=14,decimal_places=2)
    balance_after=models.DecimalField(max_digits=14,decimal_places=2)
    reference_type=models.CharField(max_length=80,blank=True)
    reference_id=models.CharField(max_length=100,blank=True)
    note=models.TextField(blank=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    created_at=models.DateTimeField(auto_now_add=True)
class GiftCard(models.Model):
    code=models.CharField(max_length=80,unique=True)
    original_amount=models.DecimalField(max_digits=14,decimal_places=2)
    balance=models.DecimalField(max_digits=14,decimal_places=2)
    active=models.BooleanField(default=True)
    expires_at=models.DateTimeField(null=True,blank=True)
class GiftCardLedger(models.Model):
    gift_card=models.ForeignKey(GiftCard,on_delete=models.PROTECT,related_name="ledger")
    transaction_type=models.CharField(max_length=30)
    amount=models.DecimalField(max_digits=14,decimal_places=2)
    balance_after=models.DecimalField(max_digits=14,decimal_places=2)
    reference_type=models.CharField(max_length=80,blank=True)
    reference_id=models.CharField(max_length=100,blank=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    created_at=models.DateTimeField(auto_now_add=True)
class StoreCredit(models.Model):
    customer=models.ForeignKey(Customer,on_delete=models.CASCADE,related_name="store_credits")
    amount=models.DecimalField(max_digits=14,decimal_places=2)
    balance=models.DecimalField(max_digits=14,decimal_places=2)
    reason=models.CharField(max_length=250,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
class StoreCreditLedger(models.Model):
    store_credit=models.ForeignKey(StoreCredit,on_delete=models.PROTECT,related_name="ledger")
    transaction_type=models.CharField(max_length=30)
    amount=models.DecimalField(max_digits=14,decimal_places=2)
    balance_after=models.DecimalField(max_digits=14,decimal_places=2)
    reference_type=models.CharField(max_length=80,blank=True)
    reference_id=models.CharField(max_length=100,blank=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    created_at=models.DateTimeField(auto_now_add=True)
