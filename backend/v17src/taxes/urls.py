from rest_framework.routers import DefaultRouter
from .views import TaxRateViewSet
router=DefaultRouter(); router.register("rates",TaxRateViewSet)
urlpatterns=router.urls
