from rest_framework import viewsets
from .models import Expense
from .serializers import ExpenseSerializer
from accounts.permissions import AdminManager
from rest_framework.decorators import action
from rest_framework.response import Response
from .services import approve_expense,pay_expense,void_expense
class ExpenseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from api_core.scope import scope_store_queryset
        return scope_store_queryset(self.request, super().get_queryset(), "store")
    queryset=Expense.objects.select_related("store","created_by","approved_by").all().order_by("-created_at")
    serializer_class=ExpenseSerializer
    permission_classes=[AdminManager]
    def perform_create(self,serializer):
        from rest_framework.exceptions import ValidationError,PermissionDenied
        from api_core.scope import scoped_store_id
        own_store=scoped_store_id(self.request)  # None for ADMIN/superuser
        requested=self.request.data.get("store")
        if own_store and requested and str(requested)!=str(own_store):
            raise PermissionDenied("You may only create expenses for your own store.")
        store_id=requested or getattr(self.request.user,"store_id",None)
        if not store_id:
            raise ValidationError({"store":"Store is required or must be assigned to the user."})
        serializer.save(created_by=self.request.user,store_id=store_id)
    filterset_fields=["store","category","status","payment_method"]

    @action(detail=True,methods=["post"])
    def approve(self,request,pk=None):
        try:return Response(self.get_serializer(approve_expense(expense=self.get_object(),user=request.user)).data)
        except Exception as e:return Response({"detail":str(e)},status=400)
    @action(detail=True,methods=["post"])
    def pay(self,request,pk=None):
        try:return Response(self.get_serializer(pay_expense(expense=self.get_object(),user=request.user)).data)
        except Exception as e:return Response({"detail":str(e)},status=400)
    @action(detail=True,methods=["post"])
    def void(self,request,pk=None):
        try:return Response(self.get_serializer(void_expense(expense=self.get_object(),user=request.user)).data)
        except Exception as e:return Response({"detail":str(e)},status=400)
