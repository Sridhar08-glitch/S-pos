from rest_framework import serializers
from .models import Supplier,Purchase,PurchaseItem
class SupplierSerializer(serializers.ModelSerializer):
    class Meta: model=Supplier; fields="__all__"
class PurchaseItemSerializer(serializers.ModelSerializer):
    class Meta: model=PurchaseItem; fields="__all__"; read_only_fields=["received_quantity"]
class PurchaseSerializer(serializers.ModelSerializer):
    items=PurchaseItemSerializer(many=True,read_only=True)
    class Meta: model=Purchase; fields="__all__"; read_only_fields=["status","subtotal","tax_amount","total_amount","created_by"]
