from django.db import models
from django.conf import settings
from stores.models import Store

class AuditLog(models.Model):
    user=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,on_delete=models.SET_NULL)
    store=models.ForeignKey(Store,null=True,blank=True,on_delete=models.SET_NULL)
    action=models.CharField(max_length=100)
    entity_type=models.CharField(max_length=100)
    entity_id=models.CharField(max_length=100,blank=True)
    before_data=models.JSONField(null=True,blank=True)
    after_data=models.JSONField(null=True,blank=True)
    ip_address=models.GenericIPAddressField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta: ordering=["-created_at"]
