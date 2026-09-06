from django.urls import path
from .views import DashboardView,SalesReportView,ZReportView,XReportView,ByItemReportView,ByCashierReportView,ByHourReportView,LowStockView
urlpatterns=[
    path("low-stock/",LowStockView.as_view()),
    path("dashboard/",DashboardView.as_view()),
    path("sales/",SalesReportView.as_view()),
    path("z-report/",ZReportView.as_view()),
    path("x-report/",XReportView.as_view()),
    path("by-item/",ByItemReportView.as_view()),
    path("by-cashier/",ByCashierReportView.as_view()),
    path("by-hour/",ByHourReportView.as_view()),
]
