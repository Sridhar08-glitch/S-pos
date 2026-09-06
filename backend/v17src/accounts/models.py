from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN="ADMIN","Admin"
        MANAGER="MANAGER","Manager"
        CASHIER="CASHIER","Cashier"
        INVENTORY="INVENTORY","Inventory"
    role=models.CharField(max_length=20,choices=Role.choices,default=Role.CASHIER)
    phone=models.CharField(max_length=30,blank=True)
    pos_pin_hash=models.CharField(max_length=128,blank=True)
    store=models.ForeignKey("stores.Store",null=True,blank=True,on_delete=models.SET_NULL,related_name="users")

class TimeEntry(models.Model):
    user=models.ForeignKey("accounts.User",on_delete=models.CASCADE,related_name="time_entries")
    store=models.ForeignKey("stores.Store",null=True,blank=True,on_delete=models.SET_NULL)
    clock_in=models.DateTimeField(auto_now_add=True)
    clock_out=models.DateTimeField(null=True,blank=True)
    note=models.CharField(max_length=200,blank=True)
    class Meta:
        ordering=["-clock_in"]
    @property
    def minutes(self):
        if not self.clock_out: return None
        return int((self.clock_out-self.clock_in).total_seconds()//60)
