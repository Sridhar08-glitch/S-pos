from rest_framework import serializers
from .models import SyncEvent
class SyncEventSerializer(serializers.ModelSerializer):
    class Meta:
        model=SyncEvent
        fields="__all__"
        read_only_fields=["created_by","created_at","processed_at","status","error"]
