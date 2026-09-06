from celery import shared_task
from django.utils import timezone
from .models import BusinessTransaction
@shared_task
def expire_stale_transactions(minutes=30):
    cutoff=timezone.now()-timezone.timedelta(minutes=minutes)
    count=BusinessTransaction.objects.filter(status="PENDING",created_at__lt=cutoff).update(status="FAILED",error="Expired pending transaction")
    return count
