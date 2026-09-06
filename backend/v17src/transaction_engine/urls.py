from rest_framework.routers import DefaultRouter
from .views import BusinessTransactionViewSet
router=DefaultRouter(); router.register("transactions",BusinessTransactionViewSet)
urlpatterns=router.urls
