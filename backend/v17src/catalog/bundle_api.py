from rest_framework import viewsets,serializers
from .bundles import ProductBundle,ProductBundleItem
from accounts.permissions import AdminManager
class BundleSerializer(serializers.ModelSerializer):
    class Meta: model=ProductBundle; fields="__all__"
class BundleItemSerializer(serializers.ModelSerializer):
    class Meta: model=ProductBundleItem; fields="__all__"
class BundleViewSet(viewsets.ModelViewSet):
    queryset=ProductBundle.objects.select_related("product").prefetch_related("items").all(); serializer_class=BundleSerializer; permission_classes=[AdminManager]
class BundleItemViewSet(viewsets.ModelViewSet):
    queryset=ProductBundleItem.objects.select_related("bundle","component").all(); serializer_class=BundleItemSerializer; permission_classes=[AdminManager]
