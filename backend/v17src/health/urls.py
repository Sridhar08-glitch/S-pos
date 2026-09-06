from django.urls import path
from .views import HealthView,ReadinessView
urlpatterns=[path("",HealthView.as_view()),path("ready/",ReadinessView.as_view())]
