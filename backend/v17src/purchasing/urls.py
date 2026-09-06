from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet,PurchaseViewSet,PurchaseItemViewSet
router=DefaultRouter(); router.register("suppliers",SupplierViewSet); router.register("purchases",PurchaseViewSet); router.register("items",PurchaseItemViewSet)
urlpatterns=router.urls
