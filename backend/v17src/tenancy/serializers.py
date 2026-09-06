from rest_framework import serializers
from .models import CompanySetting,CompanySequence
class CompanySettingSerializer(serializers.ModelSerializer):
    class Meta: model=CompanySetting; fields="__all__"
class CompanySequenceSerializer(serializers.ModelSerializer):
    class Meta: model=CompanySequence; fields="__all__"
