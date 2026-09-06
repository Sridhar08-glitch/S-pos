from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet,CreditLedgerViewSet,GiftCardLedgerViewSet,StoreCreditLedgerViewSet
from .credit_api import CreditAccountViewSet,GiftCardViewSet,StoreCreditViewSet
router=DefaultRouter(); router.register("customers",CustomerViewSet); router.register("credit-accounts",CreditAccountViewSet); router.register("gift-cards",GiftCardViewSet); router.register("store-credits",StoreCreditViewSet); router.register("credit-ledger",CreditLedgerViewSet); router.register("gift-card-ledger",GiftCardLedgerViewSet); router.register("store-credit-ledger",StoreCreditLedgerViewSet)
urlpatterns=router.urls
