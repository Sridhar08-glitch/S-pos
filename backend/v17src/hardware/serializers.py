from rest_framework import serializers
from .models import Device
class DeviceSerializer(serializers.ModelSerializer):
    device_type=serializers.CharField(source="kind",required=False)
    is_active=serializers.BooleanField(source="active",required=False)
    class Meta:
        model=Device
        fields=["id","store","register","device_id","name","kind","device_type","connection_type","address","active","is_active","last_seen_at"]
        read_only_fields=["id","last_seen_at"]
