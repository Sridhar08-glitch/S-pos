from rest_framework import serializers
from .models import CheckoutExecution
class CheckoutExecutionSerializer(serializers.ModelSerializer):
    class Meta: model=CheckoutExecution; fields="__all__"
