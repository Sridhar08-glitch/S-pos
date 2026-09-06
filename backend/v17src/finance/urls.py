from rest_framework.routers import DefaultRouter
from .views import AccountViewSet,JournalEntryViewSet,PaymentReconciliationViewSet
router=DefaultRouter()
router.register("accounts",AccountViewSet)
router.register("journal",JournalEntryViewSet)
router.register("reconciliation",PaymentReconciliationViewSet)
urlpatterns=router.urls
