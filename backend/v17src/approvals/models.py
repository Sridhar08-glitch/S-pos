from django.db import models
from django.conf import settings
class ApprovalRequest(models.Model):
    action=models.CharField(max_length=50)
    reference_type=models.CharField(max_length=80)
    reference_id=models.CharField(max_length=100)
    reason=models.TextField(blank=True)
    requested_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="approval_requests")
    approved_by=models.ForeignKey(settings.AUTH_USER_MODEL,null=True,blank=True,on_delete=models.PROTECT,related_name="approvals")
    status=models.CharField(max_length=20,default="PENDING")
    created_at=models.DateTimeField(auto_now_add=True)
    decided_at=models.DateTimeField(null=True,blank=True)
