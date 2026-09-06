from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import SaleViewSet,RefundViewSet
from .payment_views import PaymentWebhookView
from .payment_api import PaymentViewSet
router=DefaultRouter(); router.register("sales",SaleViewSet); router.register("refunds",RefundViewSet); router.register("payments",PaymentViewSet)
urlpatterns=router.urls+[path("payments/webhook/",PaymentWebhookView.as_view())]
