from django.db import transaction
from django.utils import timezone
from .models import SyncEvent

@transaction.atomic
def accept_event(*,device_id,event_id,payload):
    existing=SyncEvent.objects.filter(event_id=event_id).first()
    if existing:
        return existing,False
    obj=SyncEvent.objects.create(device_id=device_id,event_id=event_id,payload=payload,status="RECEIVED",
                                 attempt_count=0,last_attempt_at=timezone.now())
    return obj,True
