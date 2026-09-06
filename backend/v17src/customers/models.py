from django.db import models
class Customer(models.Model):
    name=models.CharField(max_length=200)
    phone=models.CharField(max_length=30,unique=True,null=True,blank=True)
    email=models.EmailField(blank=True)
    address=models.TextField(blank=True)
    notes=models.TextField(blank=True)
    active=models.BooleanField(default=True)
    created_at=models.DateTimeField(auto_now_add=True)

# Register credit models for Django migrations/app registry.
from .credit_models import CustomerCreditAccount, GiftCard, StoreCredit  # noqa: E402,F401
