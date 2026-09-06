from rest_framework import serializers
from .models import RegisterSession,CashMovement
class RegisterSessionSerializer(serializers.ModelSerializer):
    class Meta: model=RegisterSession; fields="__all__"; read_only_fields=["opened_at","closed_at","expected_cash","difference","status","opening_cash","closing_cash","cashier"]
class CashMovementSerializer(serializers.ModelSerializer):
    class Meta: model=CashMovement; fields="__all__"; read_only_fields=["created_by","created_at"]
