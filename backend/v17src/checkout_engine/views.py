from rest_framework import viewsets,status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CheckoutExecution
from .serializers import CheckoutExecutionSerializer
from .services import execute_checkout
from accounts.permissions import AdminManager,SalesStaff
class CheckoutExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=CheckoutExecution.objects.select_related("store","sale","created_by","transaction_id").all().order_by("-created_at")
    serializer_class=CheckoutExecutionSerializer
    permission_classes=[AdminManager]
    filterset_fields=["store","stage"]
    @action(detail=False,methods=["post"],permission_classes=[SalesStaff],url_path="execute")
    def execute(self,request):
        data=request.data
        session_id=data.get("session_id") or data.get("register_session_id")
        if not session_id: return Response({"detail":"session_id is required"},status=400)
        from registers.models import RegisterSession
        try: session=RegisterSession.objects.select_related("store").get(id=session_id,cashier=request.user,status="OPEN")
        except RegisterSession.DoesNotExist: return Response({"detail":"Register session not found"},status=404)
        key=request.headers.get("Idempotency-Key") or data.get("idempotency_key")
        if not key: return Response({"detail":"Idempotency-Key is required"},status=400)
        try:
            tx=execute_checkout(user=request.user,session=session,items=data.get("items",[]),
                payments=data.get("payments",[]),idempotency_key=key,device_id=data.get("device_id",""),
                tax_rate=data.get("tax_rate","0"),customer_id=data.get("customer_id"),
                discount_percent=data.get("discount_percent","0"),price_list_id=data.get("price_list_id"),manager_pin=data.get("manager_pin"),round_to=data.get("round_to"))
            return Response({"transaction_id":tx.transaction_id,"status":tx.status},status=200)
        except Exception as e:
            return Response({"detail":str(e)},status=400)
