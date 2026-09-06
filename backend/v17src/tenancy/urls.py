from rest_framework.routers import DefaultRouter
from .views import CompanySettingViewSet,CompanySequenceViewSet
router=DefaultRouter(); router.register("settings",CompanySettingViewSet); router.register("sequences",CompanySequenceViewSet)
urlpatterns=router.urls
