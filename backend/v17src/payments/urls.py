from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.permissions import SalesStaff
from .views import PaymentIntentViewSet
from .gateway import available_providers, get_active_name


class ProvidersView(APIView):
    """Lists every supported payment provider worldwide and which one is active."""
    permission_classes = [SalesStaff]
    def get(self, request):
        return Response({"active": get_active_name(), "providers": available_providers()})


router = DefaultRouter()
router.register("intents", PaymentIntentViewSet)
urlpatterns = router.urls + [path("providers/", ProvidersView.as_view())]
