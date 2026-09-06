from rest_framework.routers import DefaultRouter
from .views import LoyaltyAccountViewSet,LoyaltyTransactionViewSet
router=DefaultRouter(); router.register("accounts",LoyaltyAccountViewSet); router.register("transactions",LoyaltyTransactionViewSet)
urlpatterns=router.urls
