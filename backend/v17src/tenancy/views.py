from rest_framework import viewsets
from .models import CompanySetting,CompanySequence
from .serializers import CompanySettingSerializer,CompanySequenceSerializer
from accounts.permissions import AdminManager
class CompanySettingViewSet(viewsets.ModelViewSet):
    queryset=CompanySetting.objects.select_related("company").all().order_by("company_id"); serializer_class=CompanySettingSerializer; permission_classes=[AdminManager]
class CompanySequenceViewSet(viewsets.ModelViewSet):
    queryset=CompanySequence.objects.select_related("company").all().order_by("company_id","name"); serializer_class=CompanySequenceSerializer; permission_classes=[AdminManager]
