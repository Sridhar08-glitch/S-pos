from rest_framework.routers import DefaultRouter
from .views import PriceListViewSet,PriceListItemViewSet,CustomerPriceListViewSet,UnitViewSet
router=DefaultRouter()
router.register("lists",PriceListViewSet)
router.register("items",PriceListItemViewSet)
router.register("customer-lists",CustomerPriceListViewSet)
router.register("units",UnitViewSet)
urlpatterns=router.urls
