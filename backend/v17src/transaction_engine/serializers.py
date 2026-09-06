from rest_framework import serializers
from .models import BusinessTransaction,TransactionEvent
class TransactionEventSerializer(serializers.ModelSerializer):
    class Meta: model=TransactionEvent; fields="__all__"
class BusinessTransactionSerializer(serializers.ModelSerializer):
    events=TransactionEventSerializer(many=True,read_only=True)
    class Meta: model=BusinessTransaction; fields="__all__"
