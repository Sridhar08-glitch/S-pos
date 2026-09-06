from rest_framework import serializers
from .models import Sale,SaleItem,Payment,Refund,RefundItem
class SaleItemSerializer(serializers.ModelSerializer):
    class Meta: model=SaleItem; fields="__all__"
class PaymentSerializer(serializers.ModelSerializer):
    class Meta: model=Payment; fields="__all__"
class RefundItemSerializer(serializers.ModelSerializer):
    class Meta: model=RefundItem; fields="__all__"
class RefundSerializer(serializers.ModelSerializer):
    items=RefundItemSerializer(many=True,read_only=True)
    class Meta: model=Refund; fields="__all__"
class SaleSerializer(serializers.ModelSerializer):
    items=SaleItemSerializer(many=True,read_only=True)
    payments=PaymentSerializer(many=True,read_only=True)
    refunds=RefundSerializer(many=True,read_only=True)
    class Meta: model=Sale; fields="__all__"
