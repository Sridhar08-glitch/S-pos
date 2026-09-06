from django.db import models
from django.conf import settings
class AuditEvent(models.Model):
    actor=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.SET_NULL)
    action=models.CharField(max_length=100)
    reference_type=models.CharField(max_length=100,blank=True)
    reference_id=models.CharField(max_length=120,blank=True)
    store_id=models.BigIntegerField(null=True,blank=True)
    register_id=models.BigIntegerField(null=True,blank=True)
    device_id=models.CharField(max_length=150,blank=True)
    request_id=models.CharField(max_length=120,blank=True)
    ip_address=models.GenericIPAddressField(null=True,blank=True)
    before=models.JSONField(default=dict,blank=True)
    after=models.JSONField(default=dict,blank=True)
    reason=models.TextField(blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes=[models.Index(fields=["action","created_at"]),models.Index(fields=["reference_type","reference_id"]),models.Index(fields=["actor","created_at"])]
        ordering=["-created_at"]
class DeviceHeartbeat(models.Model):
    device_id=models.CharField(max_length=150,unique=True)
    store_id=models.BigIntegerField(null=True,blank=True)
    last_seen=models.DateTimeField(auto_now=True)
    app_version=models.CharField(max_length=50,blank=True)
    status=models.CharField(max_length=30,default="ONLINE")
