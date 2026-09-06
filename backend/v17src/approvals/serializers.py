from rest_framework import serializers
from .models import ApprovalRequest
class ApprovalRequestSerializer(serializers.ModelSerializer):
    class Meta: model=ApprovalRequest; fields="__all__"
