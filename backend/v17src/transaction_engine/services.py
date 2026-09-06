import hashlib,json,uuid
from django.db import transaction
from django.utils import timezone
from .models import BusinessTransaction,TransactionEvent

@transaction.atomic
def begin(*,store,user,idempotency_key,transaction_type,payload,device_id=""):
    raw=json.dumps(payload,sort_keys=True,separators=(",",":")).encode()
    payload_hash=hashlib.sha256(raw).hexdigest()
    existing=BusinessTransaction.objects.select_for_update().filter(idempotency_key=idempotency_key).first()
    if existing:
        if existing.payload_hash and existing.payload_hash!=payload_hash:
            raise ValueError("Idempotency key was reused with a different payload")
        return existing,False
    tx=BusinessTransaction.objects.create(
        transaction_id=f"TX-{uuid.uuid4().hex.upper()}",
        transaction_type=transaction_type,store=store,status="PENDING",
        idempotency_key=idempotency_key,device_id=device_id,user=user,payload_hash=payload_hash)
    return tx,True

def event(tx,event_type,payload):
    next_seq=(tx.events.order_by("-sequence").values_list("sequence",flat=True).first() or 0)+1
    return TransactionEvent.objects.create(transaction=tx,event_type=event_type,sequence=next_seq,payload=payload)

def commit(tx):
    tx.status="COMMITTED"; tx.committed_at=timezone.now(); tx.save(update_fields=["status","committed_at"])
    return tx

def fail(tx,error):
    tx.status="FAILED"; tx.error=str(error)[:5000]; tx.save(update_fields=["status","error"])
    return tx
