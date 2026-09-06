from django.db import models
from django.conf import settings
from customers.models import Customer

class LoyaltyAccount(models.Model):
    customer=models.OneToOneField(Customer,on_delete=models.CASCADE,related_name="loyalty")
    points=models.IntegerField(default=0)
    lifetime_points=models.IntegerField(default=0)
    updated_at=models.DateTimeField(auto_now=True)

class LoyaltyTransaction(models.Model):
    class Type(models.TextChoices):
        EARN="EARN","Earn"; REDEEM="REDEEM","Redeem"; ADJUST="ADJUST","Adjust"
    account=models.ForeignKey(LoyaltyAccount,on_delete=models.PROTECT,related_name="transactions")
    transaction_type=models.CharField(max_length=10,choices=Type.choices)
    points=models.IntegerField()
    reference=models.CharField(max_length=120,blank=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    created_at=models.DateTimeField(auto_now_add=True)
