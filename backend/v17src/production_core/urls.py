from rest_framework.routers import DefaultRouter
from .views import AuditEventViewSet,DeviceHeartbeatViewSet
router=DefaultRouter(); router.register("audit",AuditEventViewSet); router.register("heartbeats",DeviceHeartbeatViewSet)
urlpatterns=router.urls
