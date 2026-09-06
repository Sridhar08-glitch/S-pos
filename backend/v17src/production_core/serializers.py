from rest_framework import serializers
from .models import AuditEvent,DeviceHeartbeat
class AuditEventSerializer(serializers.ModelSerializer):
    class Meta: model=AuditEvent; fields="__all__"
class DeviceHeartbeatSerializer(serializers.ModelSerializer):
    class Meta: model=DeviceHeartbeat; fields="__all__"
