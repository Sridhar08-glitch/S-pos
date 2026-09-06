from rest_framework import viewsets
from .models import LoyaltyAccount,LoyaltyTransaction
from .serializers import LoyaltyAccountSerializer,LoyaltyTransactionSerializer
from accounts.permissions import SalesStaff,AdminManager
from rest_framework.decorators import action
from rest_framework.response import Response
from .services import adjust_points
class LoyaltyAccountViewSet(viewsets.ModelViewSet):
    queryset=LoyaltyAccount.objects.select_related("customer").all().order_by("-updated_at")
    serializer_class=LoyaltyAccountSerializer; permission_classes=[SalesStaff]
    filterset_fields=["customer"]
    @action(detail=True,methods=["post"])
    def earn(self,request,pk=None):
        try:return Response(self.get_serializer(adjust_points(customer=self.get_object().customer,points=request.data.get("points",0),user=request.user,transaction_type="EARN",reference=request.data.get("reference",""))).data)
        except Exception as e:return Response({"detail":str(e)},status=400)
    @action(detail=True,methods=["post"])
    def redeem(self,request,pk=None):
        try:return Response(self.get_serializer(adjust_points(customer=self.get_object().customer,points=request.data.get("points",0),user=request.user,transaction_type="REDEEM",reference=request.data.get("reference",""))).data)
        except Exception as e:return Response({"detail":str(e)},status=400)
class LoyaltyTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=LoyaltyTransaction.objects.select_related("account","created_by").all().order_by("-created_at")
    serializer_class=LoyaltyTransactionSerializer; permission_classes=[AdminManager]
