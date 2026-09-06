from rest_framework import serializers
from .models import PriceList,PriceListItem,CustomerPriceList,Unit
class PriceListSerializer(serializers.ModelSerializer):
    class Meta: model=PriceList; fields="__all__"
class PriceListItemSerializer(serializers.ModelSerializer):
    class Meta: model=PriceListItem; fields="__all__"
class CustomerPriceListSerializer(serializers.ModelSerializer):
    class Meta: model=CustomerPriceList; fields="__all__"
class UnitSerializer(serializers.ModelSerializer):
    class Meta: model=Unit; fields="__all__"
