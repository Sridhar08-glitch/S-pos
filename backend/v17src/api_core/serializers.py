from rest_framework import serializers
class DynamicSerializer(serializers.ModelSerializer):
    class Meta:
        model=None
        fields="__all__"
