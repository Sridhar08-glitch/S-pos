from django.db import models
from stores.models import Store,Register
class Device(models.Model):
    class Kind(models.TextChoices):
        POS="POS","POS"; SCANNER="SCANNER","Scanner"; PRINTER="PRINTER","Printer"; SCALE="SCALE","Scale"; DISPLAY="DISPLAY","Display"; CASH_DRAWER="CASH_DRAWER","Cash Drawer"
    store=models.ForeignKey(Store,on_delete=models.PROTECT,related_name="devices")
    register=models.ForeignKey(Register,null=True,blank=True,on_delete=models.PROTECT,related_name="devices")
    device_id=models.CharField(max_length=150,unique=True)
    name=models.CharField(max_length=150)
    kind=models.CharField(max_length=30,choices=Kind.choices)
    connection_type=models.CharField(max_length=30,default="NETWORK")
    address=models.CharField(max_length=250,blank=True)
    active=models.BooleanField(default=True)
    last_seen_at=models.DateTimeField(null=True,blank=True)
