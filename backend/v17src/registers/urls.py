from rest_framework.routers import DefaultRouter
from .views import RegisterSessionViewSet,CashMovementViewSet
from stores.views import RegisterViewSet
router=DefaultRouter()
router.register("sessions",RegisterSessionViewSet)
# Compatibility endpoint: physical register CRUD lives in stores, but is exposed here for POS clients.
router.register("registers",RegisterViewSet,basename="register")
router.register("cash-movements",CashMovementViewSet)
urlpatterns=router.urls
