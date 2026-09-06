from .models import AuditLog
def get_ip(request):
    return request.META.get("HTTP_X_FORWARDED_FOR","").split(",")[0].strip() or request.META.get("REMOTE_ADDR")
def log_action(*,request,action,entity_type,entity_id="",before=None,after=None,store=None):
    return AuditLog.objects.create(user=request.user if request.user.is_authenticated else None,store=store,
        action=action,entity_type=entity_type,entity_id=str(entity_id),before_data=before,after_data=after,ip_address=get_ip(request))
