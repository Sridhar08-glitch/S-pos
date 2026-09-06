from rest_framework.routers import DefaultRouter
from .views import CheckoutExecutionViewSet
router=DefaultRouter(); router.register("executions",CheckoutExecutionViewSet)
urlpatterns=router.urls
