from rest_framework import serializers
from .models import Account,JournalEntry,JournalLine,PaymentReconciliation
class AccountSerializer(serializers.ModelSerializer):
    class Meta: model=Account; fields="__all__"
class JournalLineSerializer(serializers.ModelSerializer):
    class Meta: model=JournalLine; fields="__all__"
class JournalEntrySerializer(serializers.ModelSerializer):
    lines=JournalLineSerializer(many=True,read_only=True)
    class Meta: model=JournalEntry; fields="__all__"
class PaymentReconciliationSerializer(serializers.ModelSerializer):
    class Meta: model=PaymentReconciliation; fields="__all__"; read_only_fields=["difference","status","created_at"]
