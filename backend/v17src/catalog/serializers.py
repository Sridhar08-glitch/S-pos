from rest_framework import serializers
from .models import Category, Product
from .variants import ProductVariant, ModifierGroup, Modifier, ProductModifierGroup

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ["id", "product", "name", "sku", "barcode", "price", "active"]

class ModifierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modifier
        fields = ["id", "group", "name", "price_delta", "active"]

class ModifierGroupSerializer(serializers.ModelSerializer):
    modifiers = ModifierSerializer(many=True, read_only=True)
    class Meta:
        model = ModifierGroup
        fields = ["id", "name", "min_select", "max_select", "active", "modifiers"]

class ProductModifierGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductModifierGroup
        fields = ["id", "product", "group"]

class ProductSerializer(serializers.ModelSerializer):
    stock_status = serializers.ReadOnlyField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    cost_price = serializers.DecimalField(source="purchase_price", max_digits=12, decimal_places=2, required=False)
    reorder_level = serializers.DecimalField(source="minimum_stock", max_digits=14, decimal_places=3, required=False)
    is_active = serializers.BooleanField(source="active", required=False)
    variants = serializers.SerializerMethodField()
    modifier_groups = serializers.SerializerMethodField()

    def get_variants(self, obj):
        return ProductVariantSerializer([v for v in obj.variants.all() if v.active], many=True).data

    def get_modifier_groups(self, obj):
        return ModifierGroupSerializer([l.group for l in obj.modifier_links.all() if l.group.active], many=True).data

    class Meta:
        model = Product
        fields = [
            "id", "name", "sku", "barcode", "qr_code", "category",
            "purchase_price", "cost_price", "selling_price", "tax_rate",
            "stock_quantity", "minimum_stock", "reorder_level", "image",
            "active", "is_active", "stock_status", "category_name",
            "variants", "modifier_groups", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "stock_status", "category_name", "variants", "modifier_groups"]

class ProductLookupSerializer(serializers.ModelSerializer):
    stock_status = serializers.ReadOnlyField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    class Meta:
        model = Product
        fields = ["id", "name", "sku", "barcode", "qr_code", "category_name", "selling_price", "tax_rate", "stock_quantity", "stock_status"]
