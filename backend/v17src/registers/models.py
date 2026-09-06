from decimal import Decimal
from django.db import models
from django.conf import settings
from stores.models import Register,Store

class RegisterSession(models.Model):
    class Status(models.TextChoices):
        OPEN="OPEN","Open"; CLOSED="CLOSED","Closed"
    register=models.ForeignKey(Register,on_delete=models.PROTECT,related_name="sessions")
    store=models.ForeignKey(Store,on_delete=models.PROTECT,related_name="register_sessions")
    cashier=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    status=models.CharField(max_length=10,choices=Status.choices,default=Status.OPEN)
    opening_cash=models.DecimalField(max_digits=12,decimal_places=2,default=0)
    closing_cash=models.DecimalField(max_digits=12,decimal_places=2,null=True,blank=True)
    expected_cash=models.DecimalField(max_digits=12,decimal_places=2,null=True,blank=True)
    difference=models.DecimalField(max_digits=12,decimal_places=2,null=True,blank=True)
    opened_at=models.DateTimeField(auto_now_add=True)
    closed_at=models.DateTimeField(null=True,blank=True)

class CashMovement(models.Model):
    class Type(models.TextChoices):
        IN="IN","Cash In"; OUT="OUT","Cash Out"
    session=models.ForeignKey(RegisterSession,on_delete=models.PROTECT,related_name="cash_movements")
    movement_type=models.CharField(max_length=5,choices=Type.choices)
    amount=models.DecimalField(max_digits=12,decimal_places=2)
    reason=models.CharField(max_length=250)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT)
    created_at=models.DateTimeField(auto_now_add=True)
