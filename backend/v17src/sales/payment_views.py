import hashlib,hmac,json
from django.conf import settings
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Payment
class PaymentWebhookView(APIView):
    permission_classes=[AllowAny]; authentication_classes=[]
    @transaction.atomic
    def post(self,request):
        secret=getattr(settings,"PAYMENT_WEBHOOK_SECRET","")
        signature=request.headers.get("X-NovaPOS-Signature","")
        if not secret or not signature:
            return Response({"detail":"Webhook signature is required"},status=401)
        expected=hmac.new(secret.encode(),request.body,hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature,expected): return Response({"detail":"Invalid webhook signature"},status=401)
        data=request.data; key=request.headers.get("Idempotency-Key") or data.get("idempotency_key")
        if key:
            existing=Payment.objects.filter(idempotency_key=key).select_related("sale").first()
            if existing:return Response({"payment_id":existing.id,"status":existing.status})
        pid=data.get("payment_id")
        if not pid:return Response({"detail":"payment_id required"},status=400)
        p=Payment.objects.select_for_update().get(id=pid)
        new_status=data.get("status","CAPTURED")
        if new_status not in dict(Payment.Status.choices): return Response({"detail":"Invalid payment status"},status=400)
        p.status=new_status; p.reference=data.get("reference",p.reference)
        if key:p.idempotency_key=key
        p.save(update_fields=["status","reference","idempotency_key"]); return Response({"payment_id":p.id,"status":p.status})
