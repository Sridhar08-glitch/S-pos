from django.db import models
from django.conf import settings

class SyncEvent(models.Model):
    device_id=models.CharField(max_length=120)
    client_event_id=models.CharField(max_length=120,unique=True)
    event_type=models.CharField(max_length=100)
    payload=models.JSONField()
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    created_at=models.DateTimeField(auto_now_add=True)
    processed_at=models.DateTimeField(null=True,blank=True)
    status=models.CharField(max_length=20,default="PENDING")
    attempt_count=models.PositiveIntegerField(default=0)
    last_attempt_at=models.DateTimeField(null=True,blank=True)
    server_sequence=models.BigIntegerField(null=True,blank=True)
    error=models.TextField(blank=True)
