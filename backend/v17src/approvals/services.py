from django.db import transaction
from django.utils import timezone
from .models import ApprovalRequest

@transaction.atomic
def require_approval(*,action,reference_type,reference_id,user,reason=""):
    return ApprovalRequest.objects.create(action=action,reference_type=reference_type,reference_id=str(reference_id),
        requested_by=user,reason=reason,status="PENDING")
