from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Sale,Refund
from .serializers import SaleSerializer,RefundSerializer
from .services import checkout,refund_sale,void_sale
from customers.models import Customer
from registers.models import RegisterSession
from accounts.permissions import SalesStaff,AdminManager
from audit.utils import log_action

def _fiscal_qr(seller,vat,timestamp,total,vat_total):
    """ZATCA-style TLV fiscal QR as a data-URL PNG. Returns '' if the qrcode lib is unavailable."""
    try:
        import base64,io,qrcode
        def tlv(t,v):
            vb=str(v).encode("utf-8"); return bytes([t,len(vb)])+vb
        payload=tlv(1,seller or "")+tlv(2,vat or "")+tlv(3,timestamp)+tlv(4,total)+tlv(5,vat_total)
        b64=base64.b64encode(payload).decode()
        img=qrcode.make(b64); buf=io.BytesIO(); img.save(buf,format="PNG")
        return "data:image/png;base64,"+base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return ""

class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        from api_core.scope import scope_store_queryset
        return scope_store_queryset(self.request, super().get_queryset(), "store")
    queryset=Sale.objects.select_related("store","register","register_session","customer","cashier").prefetch_related("items","payments","refunds__items").all().order_by("-created_at")
    serializer_class=SaleSerializer
    permission_classes=[SalesStaff]
    search_fields=["invoice_number","customer__name","customer__phone"]
    filterset_fields=["store","register","status","cashier"]
    @action(detail=False,methods=["post"])
    @transaction.atomic
    def checkout(self,request):
        try:
            session=RegisterSession.objects.select_for_update().get(id=request.data.get("register_session_id"),cashier=request.user,status="OPEN")
            customer=Customer.objects.filter(id=request.data.get("customer_id")).first() if request.data.get("customer_id") else None
            sale=checkout(user=request.user,session=session,customer=customer,items=request.data.get("items",[]),
                discount_percent=request.data.get("discount_percent",0),payments=request.data.get("payments",[]),notes=request.data.get("notes",""),
                price_list_id=request.data.get("price_list_id"),manager_pin=request.data.get("manager_pin"))
            log_action(request=request,action="SALE_CREATED",entity_type="Sale",entity_id=sale.id,store=sale.store,after={"invoice_number":sale.invoice_number,"total":str(sale.total_amount)})
            return Response(SaleSerializer(sale).data,status=201)
        except Exception as e: return Response({"detail":str(e)},status=400)
    @action(detail=True,methods=["post"],permission_classes=[AdminManager])
    @transaction.atomic
    def void(self,request,pk=None):
        sale=self.get_object()
        if sale.status!="COMPLETED": return Response({"detail":"Only completed sales can be voided"},status=400)
        try:
            sale=void_sale(user=request.user,sale=sale,reason=request.data.get("reason",""))
        except Exception as e:
            return Response({"detail":str(e)},status=400)
        log_action(request=request,action="SALE_VOIDED",entity_type="Sale",entity_id=sale.id,store=sale.store)
        return Response(SaleSerializer(sale).data)
    @action(detail=True,methods=["post"],permission_classes=[AdminManager])
    def refund(self,request,pk=None):
        try:
            sale=self.get_object()
            refund=refund_sale(user=request.user,sale=sale,items=request.data.get("items",[]),reason=request.data.get("reason",""))
            log_action(request=request,action="SALE_REFUNDED",entity_type="Refund",entity_id=refund.id,store=sale.store,after={"amount":str(refund.amount)})
            return Response(RefundSerializer(refund).data,status=201)
        except Exception as e: return Response({"detail":str(e)},status=400)
    @action(detail=True,methods=["get"])
    def receipt(self,request,pk=None):
        sale=self.get_object()
        return Response({
            "invoice_number":sale.invoice_number,
            "store":getattr(sale.store,"name",None),
            "cashier":getattr(sale.cashier,"username",None),
            "customer":getattr(sale.customer,"name",None),
            "status":sale.status,
            "created_at":sale.created_at,
            "items":[{"name":i.product_name,"sku":i.sku,"quantity":str(i.quantity),
                      "unit_price":str(i.unit_price),"line_total":str(i.line_total)} for i in sale.items.all()],
            "subtotal":str(sale.subtotal),"discount_amount":str(sale.discount_amount),
            "tax_amount":str(sale.tax_amount),"total_amount":str(sale.total_amount),
            "payments":[{"method":p.method,"amount":str(p.amount),"status":p.status} for p in sale.payments.all()],
            "currency":getattr(getattr(sale.store,"company",None),"currency",None) or "QAR",
            "tax_number":getattr(getattr(sale.store,"company",None),"tax_number","") or "",
            "qr":_fiscal_qr(getattr(getattr(sale.store,"company",None),"name",""),
                            getattr(getattr(sale.store,"company",None),"tax_number",""),
                            sale.created_at.isoformat(),str(sale.total_amount),str(sale.tax_amount)),
        })
    @action(detail=True,methods=["post"],url_path="email-receipt")
    def email_receipt(self,request,pk=None):
        from django.core.mail import send_mail
        from django.conf import settings as dj_settings
        sale=self.get_object()
        to=request.data.get("to") or getattr(sale.customer,"email","")
        if not to: return Response({"detail":"No recipient email (pass 'to' or set customer email)."},status=400)
        cur=getattr(getattr(sale.store,"company",None),"currency",None) or "QAR"
        lines="\n".join(f"  {i.quantity} x {i.product_name} @ {i.unit_price} = {i.line_total}" for i in sale.items.all())
        body=(f"Invoice {sale.invoice_number}\nStore: {getattr(sale.store,'name','')}\nDate: {sale.created_at}\n\n{lines}\n\n"
              f"Subtotal: {sale.subtotal}\nDiscount: {sale.discount_amount}\nTax: {sale.tax_amount}\nTotal: {sale.total_amount} {cur}\n\nThank you!")
        try:
            send_mail(f"Your receipt {sale.invoice_number}",body,getattr(dj_settings,"DEFAULT_FROM_EMAIL","noreply@novapos"),[to],fail_silently=False)
        except Exception as e:
            return Response({"detail":f"Email failed: {e}"},status=400)
        return Response({"detail":f"Receipt emailed to {to}","invoice_number":sale.invoice_number})

class RefundViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=Refund.objects.select_related("sale","cashier").prefetch_related("items").all().order_by("-created_at")
    serializer_class=RefundSerializer
    permission_classes=[SalesStaff]
    filterset_fields=["sale","cashier"]
