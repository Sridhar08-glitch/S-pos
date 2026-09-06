from rest_framework import serializers
from .models import Company, Store, Register

class CompanySerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(source="active", required=False)
    class Meta:
        model = Company
        fields = ["id","name","legal_name","tax_number","currency","active","is_active"]

class StoreSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(source="active", required=False)
    class Meta:
        model = Store
        fields = ["id","company","name","code","address","phone","active","is_active"]

class RegisterSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(source="active", required=False)
    class Meta:
        model = Register
        fields = ["id","store","name","code","active","is_active"]
