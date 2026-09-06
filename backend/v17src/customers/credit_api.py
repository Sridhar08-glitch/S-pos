from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers,viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .credit_models import CustomerCreditAccount,GiftCard,StoreCredit
from .ledger_services import redeem_gift_card
from accounts.permissions import SalesStaff,AdminManager
class CreditAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model=CustomerCreditAccount; fields="__all__"
        read_only_fields=["balance"]  # balance moves only through the credit ledger service
class GiftCardSerializer(serializers.ModelSerializer):
    class Meta:
        model=GiftCard; fields="__all__"
        read_only_fields=["balance"]  # set to original_amount at issue; then only redeem() changes it
    def create(self,validated_data):
        validated_data["balance"]=validated_data.get("original_amount",0)
        return super().create(validated_data)
class StoreCreditSerializer(serializers.ModelSerializer):
    class Meta:
        model=StoreCredit; fields="__all__"
        read_only_fields=["balance"]  # balance starts at issued amount; ledger service adjusts it
    def create(self,validated_data):
        validated_data["balance"]=validated_data.get("amount",0)
        return super().create(validated_data)
class CreditAccountViewSet(viewsets.ModelViewSet):
    queryset=CustomerCreditAccount.objects.select_related("customer").all().order_by("customer_id"); serializer_class=CreditAccountSerializer; permission_classes=[AdminManager]
class GiftCardViewSet(viewsets.ModelViewSet):
    queryset=GiftCard.objects.all().order_by("-id"); serializer_class=GiftCardSerializer; permission_classes=[SalesStaff]
    @action(detail=True,methods=["post"])
    @transaction.atomic
    def redeem(self,request,pk=None):
        try:
            x=redeem_gift_card(card=self.get_object(),amount=request.data.get("amount",0),user=request.user,reference_type=request.data.get("reference_type",""),reference_id=request.data.get("reference_id",""))
            if x.balance==0 and x.active: x.active=False; x.save(update_fields=["active"])
            return Response(self.get_serializer(x).data)
        except Exception as e: return Response({"detail":str(e)},status=400)
class StoreCreditViewSet(viewsets.ModelViewSet):
    queryset=StoreCredit.objects.select_related("customer").all().order_by("-created_at").order_by("-created_at"); serializer_class=StoreCreditSerializer; permission_classes=[SalesStaff]
