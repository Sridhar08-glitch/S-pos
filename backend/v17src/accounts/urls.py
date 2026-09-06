from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView, SetPINView, VerifyPINView, LogoutView, BootstrapView
from .user_api import UserAdminViewSet
from .timeclock_api import TimeEntryViewSet
router=DefaultRouter(); router.register("users",UserAdminViewSet); router.register("time-entries",TimeEntryViewSet,basename="timeentry")
urlpatterns=router.urls+[
    path("token/",TokenObtainPairView.as_view(),name="token_obtain_pair"),
    path("token/refresh/",TokenRefreshView.as_view(),name="token_refresh"),
    path("register/",RegisterView.as_view(),name="register"),
    path("logout/",LogoutView.as_view(),name="logout"),
    path("bootstrap/",BootstrapView.as_view(),name="bootstrap"),
    path("me/",MeView.as_view(),name="me"),
    path("users/<int:user_id>/pin/",SetPINView.as_view(),name="set_pin"),
    path("pin/verify/",VerifyPINView.as_view(),name="verify_pin"),
]
