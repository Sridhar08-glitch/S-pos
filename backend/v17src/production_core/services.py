from .models import AuditEvent,DeviceHeartbeat
def audit(*,actor=None,action,request=None,reference_type="",reference_id="",store_id=None,register_id=None,device_id="",before=None,after=None,reason=""):
    ip=None
    if request:
        forwarded=request.META.get("HTTP_X_FORWARDED_FOR","")
        ip=(forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR"))
    return AuditEvent.objects.create(actor=actor,action=action,reference_type=reference_type,reference_id=str(reference_id or ""),
        store_id=store_id,register_id=register_id,device_id=device_id,request_id=request.headers.get("X-Request-ID","") if request else "",
        ip_address=ip,before=before or {},after=after or {},reason=reason)
