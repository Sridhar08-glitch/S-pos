from django.contrib import admin
from .models import AuditEvent,DeviceHeartbeat
admin.site.register(AuditEvent); admin.site.register(DeviceHeartbeat)
