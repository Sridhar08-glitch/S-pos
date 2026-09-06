from rest_framework.routers import DefaultRouter
from .views import SyncEventViewSet
router=DefaultRouter(); router.register("events",SyncEventViewSet)
urlpatterns=router.urls
