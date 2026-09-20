from django.urls import path
from .views import DashboardStatsView, ServiceReportView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('services/', ServiceReportView.as_view(), name='service-report'),
]
