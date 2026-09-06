from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet,StoreViewSet,RegisterViewSet
router=DefaultRouter()
router.register("companies",CompanyViewSet)
router.register("stores",StoreViewSet)
router.register("registers",RegisterViewSet)
urlpatterns=router.urls
