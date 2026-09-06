from django.db import models
class PaymentIntent(models.Model):
    class State(models.TextChoices):
        CREATED="CREATED","Created"; PENDING="PENDING","Pending"; AUTHORIZED="AUTHORIZED","Authorized"; CAPTURED="CAPTURED","Captured"; FAILED="FAILED","Failed"; REFUNDED="REFUNDED","Refunded"; PARTIAL_REFUND="PARTIAL_REFUND","Partial refund"
    intent_id=models.CharField(max_length=100,unique=True)
    method=models.CharField(max_length=30)
    provider=models.CharField(max_length=80,blank=True)
    amount=models.DecimalField(max_digits=14,decimal_places=2)
    currency=models.CharField(max_length=10,default="QAR")
    state=models.CharField(max_length=30,choices=State.choices,default="CREATED")
    provider_reference=models.CharField(max_length=150,blank=True)
    idempotency_key=models.CharField(max_length=150,unique=True)
    metadata=models.JSONField(default=dict,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
