from rest_framework import serializers
from .models import Customer
from .credit_models import CustomerCreditAccount,CreditLedger,GiftCard,GiftCardLedger,StoreCredit,StoreCreditLedger
class CustomerSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(source="active", required=False)
    class Meta:
        model = Customer
        fields = ["id","name","phone","email","address","notes","active","is_active","created_at"]
        read_only_fields = ["id","created_at"]


class CreditLedgerSerializer(serializers.ModelSerializer):
    class Meta: model=CreditLedger; fields="__all__"
class GiftCardLedgerSerializer(serializers.ModelSerializer):
    class Meta: model=GiftCardLedger; fields="__all__"
class StoreCreditLedgerSerializer(serializers.ModelSerializer):
    class Meta: model=StoreCreditLedger; fields="__all__"
