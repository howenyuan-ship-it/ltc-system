from django.urls import path

from apps.geo import views

urlpatterns = [
    path('map-data/', views.map_data, name='geo-map-data'),
    path('supervisors/', views.supervisors, name='geo-supervisors'),
    path('my-schedule/', views.my_schedule, name='geo-my-schedule'),
    path('location/', views.report_location, name='geo-report-location'),
    path('check-in/', views.check_in, name='geo-check-in'),
    path('check-out/', views.check_out, name='geo-check-out'),
    path('case-location/', views.set_case_location, name='geo-set-case-location'),
]
