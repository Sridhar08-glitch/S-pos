from django.db import models
from django.db.models import Sum,Count
from django.db.models.functions import ExtractHour
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from sales.models import Sale,Payment
from inventory.models import StoreInventory
from accounts.permissions import AdminManager

def _filtered(request,qs):
    if getattr(request.user,"store_id",None) and getattr(request.user,"role","")!="ADMIN": qs=qs.filter(store_id=request.user.store_id)
    date=request.query_params.get("date"); start=request.query_params.get("start"); end=request.query_params.get("end")
    if date: qs=qs.filter(created_at__date=date)
    if start: qs=qs.filter(created_at__date__gte=start)
    if end: qs=qs.filter(created_at__date__lte=end)
    for field in ["store_id","register_id","register_session_id","cashier_id"]:
        if request.query_params.get(field): qs=qs.filter(**{field:request.query_params[field]})
    return qs

class DashboardView(APIView):
    permission_classes=[AdminManager]
    def get(self,request):
        qs=_filtered(request,Sale.objects.filter(status="COMPLETED")); inv=StoreInventory.objects.filter(quantity__lte=models.F("minimum_stock"))
        if request.query_params.get("store_id"): inv=inv.filter(store_id=request.query_params["store_id"])
        return Response({"date":timezone.localdate(),"sales_total":qs.aggregate(v=Sum("total_amount"))["v"] or 0,"sales_count":qs.count(),"low_stock_count":inv.count()})

class SalesReportView(APIView):
    permission_classes=[AdminManager]
    def get(self,request):
        qs=_filtered(request,Sale.objects.filter(status="COMPLETED")); p=Payment.objects.filter(sale__in=qs,status="CAPTURED")
        return Response({"sales_count":qs.count(),"gross_sales":qs.aggregate(v=Sum("total_amount"))["v"] or 0,"discounts":qs.aggregate(v=Sum("discount_amount"))["v"] or 0,"tax":qs.aggregate(v=Sum("tax_amount"))["v"] or 0,"payments":list(p.values("method").annotate(total=Sum("amount")).order_by("-total"))})

class ZReportView(APIView):
    permission_classes=[AdminManager]
    def get(self,request):
        qs=_filtered(request,Sale.objects.filter(status="COMPLETED")); p=Payment.objects.filter(sale__in=qs,status="CAPTURED")
        return Response({"sales_count":qs.count(),"gross_sales":qs.aggregate(v=Sum("total_amount"))["v"] or 0,"tax":qs.aggregate(v=Sum("tax_amount"))["v"] or 0,"discounts":qs.aggregate(v=Sum("discount_amount"))["v"] or 0,"payments":list(p.values("method").annotate(total=Sum("amount")))})

class LowStockView(APIView):
    permission_classes=[AdminManager]
    def get(self,request):
        from inventory.models import StoreInventory
        qs=StoreInventory.objects.select_related("product","store").filter(quantity__lte=models.F("minimum_stock"))
        if getattr(request.user,"store_id",None) and getattr(request.user,"role","")!="ADMIN": qs=qs.filter(store_id=request.user.store_id)
        if request.query_params.get("store_id"): qs=qs.filter(store_id=request.query_params["store_id"])
        return Response([{"product":i.product.name,"sku":i.product.sku,"store":i.store.name,"quantity":str(i.quantity),"minimum_stock":str(i.minimum_stock)} for i in qs.order_by("quantity")[:200]])

class ByItemReportView(APIView):
    permission_classes=[AdminManager]
    def get(self,request):
        from sales.models import SaleItem
        sales=_filtered(request,Sale.objects.filter(status="COMPLETED"))
        rows=SaleItem.objects.filter(sale__in=sales).values("product_name","sku").annotate(
            quantity=Sum("quantity"),revenue=Sum("line_total"),cost=Sum("cost_total")).order_by("-revenue")[:200]
        return Response([{**r,"margin":(float(r["revenue"] or 0)-float(r["cost"] or 0))} for r in rows])

class ByCashierReportView(APIView):
    permission_classes=[AdminManager]
    def get(self,request):
        sales=_filtered(request,Sale.objects.filter(status="COMPLETED"))
        rows=sales.values("cashier__username").annotate(sales_count=Count("id"),total=Sum("total_amount"),tax=Sum("tax_amount")).order_by("-total")
        return Response(list(rows))

class ByHourReportView(APIView):
    permission_classes=[AdminManager]
    def get(self,request):
        sales=_filtered(request,Sale.objects.filter(status="COMPLETED"))
        rows=sales.annotate(hour=ExtractHour("created_at")).values("hour").annotate(sales_count=Count("id"),total=Sum("total_amount")).order_by("hour")
        return Response(list(rows))

class XReportView(APIView):
    # Mid-shift, non-resetting snapshot for currently OPEN register sessions.
    permission_classes=[AdminManager]
    def get(self,request):
        from registers.models import RegisterSession
        open_sessions=RegisterSession.objects.filter(status="OPEN")
        if getattr(request.user,"store_id",None) and getattr(request.user,"role","")!="ADMIN":
            open_sessions=open_sessions.filter(store_id=request.user.store_id)
        if request.query_params.get("store_id"): open_sessions=open_sessions.filter(store_id=request.query_params["store_id"])
        session_ids=list(open_sessions.values_list("id",flat=True))
        qs=Sale.objects.filter(status="COMPLETED",register_session_id__in=session_ids)
        p=Payment.objects.filter(sale__in=qs,status="CAPTURED")
        return Response({"open_sessions":len(session_ids),"sales_count":qs.count(),
            "gross_sales":qs.aggregate(v=Sum("total_amount"))["v"] or 0,"tax":qs.aggregate(v=Sum("tax_amount"))["v"] or 0,
            "discounts":qs.aggregate(v=Sum("discount_amount"))["v"] or 0,
            "payments":list(p.values("method").annotate(total=Sum("amount")).order_by("-total"))})
