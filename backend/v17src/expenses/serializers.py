from rest_framework import serializers
from .models import Expense
class ExpenseSerializer(serializers.ModelSerializer):
    class Meta: model=Expense; fields="__all__"; read_only_fields=["status","approved_by","paid_at","created_by","created_at"]
