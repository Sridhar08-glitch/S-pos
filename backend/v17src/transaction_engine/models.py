from django.db import models
from django.conf import settings
from stores.models import Store

class BusinessTransaction(models.Model):
    class Status(models.TextChoices):
        PENDING="PENDING","Pending"; COMMITTED="COMMITTED","Committed"; FAILED="FAILED","Failed"; REVERSED="REVERSED","Reversed"
    transaction_id=models.CharField(max_length=80,unique=True)
    transaction_type=models.CharField(max_length=50)
    store=models.ForeignKey(Store,on_delete=models.PROTECT)
    status=models.CharField(max_length=20,choices=Status.choices,default="PENDING")
    idempotency_key=models.CharField(max_length=150,unique=True)
    device_id=models.CharField(max_length=150,blank=True)
    user=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    payload_hash=models.CharField(max_length=128,blank=True)
    error=models.TextField(blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    committed_at=models.DateTimeField(null=True,blank=True)
    class Meta:
        indexes=[models.Index(fields=["store","created_at"]),models.Index(fields=["status","created_at"])]

class TransactionEvent(models.Model):
    transaction=models.ForeignKey(BusinessTransaction,on_delete=models.PROTECT,related_name="events")
    event_type=models.CharField(max_length=80)
    sequence=models.PositiveIntegerField()
    payload=models.JSONField(default=dict)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["transaction","sequence"],name="uniq_tx_event_sequence")]
        ordering=["sequence"]
