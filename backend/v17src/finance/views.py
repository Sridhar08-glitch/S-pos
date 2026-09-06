from rest_framework import viewsets
from .models import Account,JournalEntry,PaymentReconciliation
from .serializers import AccountSerializer,JournalEntrySerializer,PaymentReconciliationSerializer
from accounts.permissions import AdminManager
class AccountViewSet(viewsets.ModelViewSet):
    queryset=Account.objects.all().order_by("code"); serializer_class=AccountSerializer; permission_classes=[AdminManager]
class JournalEntryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset=JournalEntry.objects.prefetch_related("lines").all().order_by("-created_at"); serializer_class=JournalEntrySerializer; permission_classes=[AdminManager]
class PaymentReconciliationViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        from api_core.scope import scope_store_queryset
        return scope_store_queryset(self.request, super().get_queryset(), "store")
    queryset=PaymentReconciliation.objects.all().order_by("-created_at"); serializer_class=PaymentReconciliationSerializer; permission_classes=[AdminManager]
