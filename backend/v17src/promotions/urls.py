from rest_framework.routers import DefaultRouter
from .views import PromotionViewSet
router=DefaultRouter(); router.register("promotions",PromotionViewSet)
urlpatterns=router.urls
