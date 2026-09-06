from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RegisterSession,CashMovement
from .serializers import RegisterSessionSerializer,CashMovementSerializer
from accounts.permissions import SalesStaff,AdminManager

class RegisterSessionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from api_core.scope import scope_store_queryset
        qs=scope_store_queryset(self.request, super().get_queryset(), "store")
        if getattr(self.request.user,"role","")=="CASHIER": qs=qs.filter(cashier=self.request.user)
        return qs
    queryset=RegisterSession.objects.select_related("register","store","cashier").all().order_by("-opened_at")
    serializer_class=RegisterSessionSerializer
    permission_classes=[SalesStaff]
    @action(detail=False,methods=["post"])
    @transaction.atomic
    def open(self,request):
        if RegisterSession.objects.filter(cashier=request.user,status="OPEN").exists():
            return Response({"detail":"Cashier already has an open register session"},status=400)
        register_id=request.data.get("register_id")
        from stores.models import Register
        reg=Register.objects.select_for_update().get(id=register_id,active=True)
        if RegisterSession.objects.filter(register=reg,status="OPEN").exists():
            return Response({"detail":"Register is already open"},status=400)
        s=RegisterSession.objects.create(register=reg,store=reg.store,cashier=request.user,opening_cash=request.data.get("opening_cash",0))
        return Response(RegisterSessionSerializer(s).data,status=201)
    @action(detail=True,methods=["post"])
    @transaction.atomic
    def close(self,request,pk=None):
        s=self.get_object()
        if s.cashier_id!=request.user.id and getattr(request.user,"role","") not in {"ADMIN","MANAGER"}: return Response({"detail":"Only the session cashier or a manager/admin can close this session"},status=403)
        if s.status!="OPEN": return Response({"detail":"Session is already closed"},status=400)
        from sales.models import Payment
        sales_cash=Payment.objects.filter(sale__register_session=s,method="CASH",sale__status="COMPLETED").aggregate(v=Sum("amount"))["v"] or Decimal("0")
        ins=s.cash_movements.filter(movement_type="IN").aggregate(v=Sum("amount"))["v"] or Decimal("0")
        outs=s.cash_movements.filter(movement_type="OUT").aggregate(v=Sum("amount"))["v"] or Decimal("0")
        expected=s.opening_cash+sales_cash+ins-outs
        actual=Decimal(str(request.data.get("closing_cash",0)))
        s.expected_cash=expected; s.closing_cash=actual; s.difference=actual-expected
        s.status="CLOSED"; s.closed_at=timezone.now(); s.save()
        return Response(RegisterSessionSerializer(s).data)

class CashMovementViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from api_core.scope import scope_store_queryset
        return scope_store_queryset(self.request, super().get_queryset(), "session__store")
    queryset=CashMovement.objects.all().order_by("-created_at")
    serializer_class=CashMovementSerializer
    permission_classes=[SalesStaff]
    def perform_create(self,serializer):
        session=serializer.validated_data.get("session")
        if not session or session.status!="OPEN":
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"session":"Cash movement requires an open register session"})
        if session.cashier_id!=self.request.user.id and getattr(self.request.user,"role","") not in {"ADMIN","MANAGER"}:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the session cashier or a manager/admin can add cash movements")
        serializer.save(created_by=self.request.user)
