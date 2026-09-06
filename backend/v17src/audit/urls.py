from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet
router=DefaultRouter(); router.register("logs",AuditLogViewSet)
urlpatterns=router.urls
