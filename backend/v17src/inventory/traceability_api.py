from rest_framework import viewsets
from .traceability import ProductSerial,ProductBatch
from rest_framework import serializers
from accounts.permissions import AdminManager
class SerialSerializer(serializers.ModelSerializer):
    class Meta: model=ProductSerial; fields="__all__"
class BatchSerializer(serializers.ModelSerializer):
    class Meta: model=ProductBatch; fields="__all__"
class SerialViewSet(viewsets.ModelViewSet):
    queryset=ProductSerial.objects.select_related("product","store").all().order_by("id"); serializer_class=SerialSerializer; permission_classes=[AdminManager]
class BatchViewSet(viewsets.ModelViewSet):
    queryset=ProductBatch.objects.select_related("product","store").all().order_by("-expiry_date","id"); serializer_class=BatchSerializer; permission_classes=[AdminManager]
