from rest_framework import serializers
from .models import LoyaltyAccount,LoyaltyTransaction
class LoyaltyAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model=LoyaltyAccount; fields="__all__"
        read_only_fields=["points","lifetime_points"]  # points move only via earn()/redeem() actions
class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    class Meta: model=LoyaltyTransaction; fields="__all__"
