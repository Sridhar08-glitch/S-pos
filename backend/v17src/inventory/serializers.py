from rest_framework import serializers
from .models import StoreInventory, InventoryLedger, StockTransfer, StockTransferItem

class StoreInventorySerializer(serializers.ModelSerializer):
    product_name=serializers.CharField(source="product.name",read_only=True)
    sku=serializers.CharField(source="product.sku",read_only=True)
    reorder_level=serializers.DecimalField(source="minimum_stock",max_digits=14,decimal_places=3,required=False)
    class Meta:
        model=StoreInventory; fields=["id","store","product","quantity","reserved_quantity","minimum_stock","reorder_level","updated_at","product_name","sku"]
        read_only_fields=["id","updated_at","product_name","sku"]

class InventoryLedgerSerializer(serializers.ModelSerializer):
    product_name=serializers.CharField(source="product.name",read_only=True)
    class Meta: model=InventoryLedger; fields="__all__"

class StockTransferItemSerializer(serializers.ModelSerializer):
    class Meta: model=StockTransferItem; fields="__all__"

class StockTransferSerializer(serializers.ModelSerializer):
    items=StockTransferItemSerializer(many=True,read_only=True)
    from_store=serializers.PrimaryKeyRelatedField(source="source_store",queryset=__import__("stores.models",fromlist=["Store"]).Store.objects.all(),required=False,write_only=True)
    to_store=serializers.PrimaryKeyRelatedField(source="destination_store",queryset=__import__("stores.models",fromlist=["Store"]).Store.objects.all(),required=False,write_only=True)
    class Meta:
        model=StockTransfer; fields=["id","transfer_number","source_store","destination_store","from_store","to_store","status","created_by","approved_by","shipped_at","received_at","created_at","items"]
        read_only_fields=["id","transfer_number","created_by","approved_by","shipped_at","received_at","created_at","items"]
