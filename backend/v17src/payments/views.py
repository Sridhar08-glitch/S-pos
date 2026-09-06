from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PaymentIntent
from .serializers import PaymentIntentSerializer
from .services import create_intent,transition
from accounts.permissions import SalesStaff
class PaymentIntentViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        return super().get_queryset()
    queryset=PaymentIntent.objects.all().order_by("-created_at"); serializer_class=PaymentIntentSerializer; permission_classes=[SalesStaff]
    @action(detail=False,methods=["post"],url_path="create-intent")
    def create_payment_intent(self,request):
        key=request.headers.get("Idempotency-Key") or request.data.get("idempotency_key")
        if not key:return Response({"detail":"Idempotency-Key required"},status=400)
        try:
            x=create_intent(method=request.data["method"],amount=request.data["amount"],idempotency_key=key,
                provider=request.data.get("provider",""),currency=request.data.get("currency","QAR"),metadata=request.data.get("metadata"))
            return Response(self.get_serializer(x).data)
        except Exception as e:return Response({"detail":str(e)},status=400)
    @action(detail=True,methods=["post"])
    def transition(self,request,pk=None):
        try:return Response(self.get_serializer(transition(self.get_object(),request.data["state"],request.data.get("provider_reference",""))).data)
        except Exception as e:return Response({"detail":str(e)},status=400)
