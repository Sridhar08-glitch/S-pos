from rest_framework import viewsets
from .models import Company,Store,Register
from .serializers import CompanySerializer,StoreSerializer,RegisterSerializer
from accounts.permissions import AdminOnly,AdminManager
class CompanyViewSet(viewsets.ModelViewSet):
    queryset=Company.objects.all().order_by("name"); serializer_class=CompanySerializer; permission_classes=[AdminOnly]
class StoreViewSet(viewsets.ModelViewSet):
    queryset=Store.objects.select_related("company").all().order_by("company_id","name"); serializer_class=StoreSerializer; permission_classes=[AdminManager]
class RegisterViewSet(viewsets.ModelViewSet):
    queryset=Register.objects.select_related("store").all().order_by("store_id","name"); serializer_class=RegisterSerializer; permission_classes=[AdminManager]
