from decimal import Decimal
from uuid import uuid4
from django.db import transaction
from .models import PaymentIntent
ALLOWED={"CASH":{"CREATED","CAPTURED"},"CARD":{"CREATED","PENDING","AUTHORIZED","CAPTURED","FAILED","REFUNDED","PARTIAL_REFUND"},"QR":{"CREATED","PENDING","AUTHORIZED","CAPTURED","FAILED","REFUNDED","PARTIAL_REFUND"},"WALLET":{"CREATED","PENDING","AUTHORIZED","CAPTURED","FAILED","REFUNDED","PARTIAL_REFUND"},"BANK":{"CREATED","PENDING","AUTHORIZED","CAPTURED","FAILED","REFUNDED","PARTIAL_REFUND"}}
TRANSITIONS={"CREATED":{"PENDING","AUTHORIZED","CAPTURED","FAILED"},"PENDING":{"AUTHORIZED","CAPTURED","FAILED"},"AUTHORIZED":{"CAPTURED","FAILED"},"CAPTURED":{"REFUNDED","PARTIAL_REFUND"},"PARTIAL_REFUND":{"REFUNDED"}}
@transaction.atomic
def create_intent(*,method,amount,idempotency_key,provider="",currency="QAR",metadata=None):
    if method not in ALLOWED: raise ValueError(f"Unsupported payment method: {method}")
    amount=Decimal(str(amount))
    if amount<=0: raise ValueError("Payment amount must be positive")
    old=PaymentIntent.objects.select_for_update().filter(idempotency_key=idempotency_key).first()
    if old:return old
    state="CAPTURED" if method=="CASH" else "CREATED"
    return PaymentIntent.objects.create(intent_id=f"PI-{uuid4().hex.upper()}",method=method,amount=amount,idempotency_key=idempotency_key,provider=provider,currency=currency,metadata=metadata or {},state=state)
@transaction.atomic
def transition(intent,state,provider_reference=""):
    intent=PaymentIntent.objects.select_for_update().get(pk=intent.pk)
    if state not in ALLOWED.get(intent.method,set()): raise ValueError(f"State {state} is not allowed for {intent.method}")
    if state not in TRANSITIONS.get(intent.state,set()): raise ValueError(f"Invalid payment transition {intent.state} → {state}")
    intent.state=state
    if provider_reference:intent.provider_reference=provider_reference
    intent.save(update_fields=["state","provider_reference","updated_at"]); return intent
