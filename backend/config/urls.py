from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Apps
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/cases/', include('apps.cases.urls')),
    path('api/staff/', include('apps.staff.urls')),
    path('api/services/', include('apps.services.urls')),
    path('api/incidents/', include('apps.incidents.urls')),
    path('api/care-plans/', include('apps.care_plans.urls')),
    path('api/assessments/', include('apps.assessments.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/quality/', include('apps.quality.urls')),
    path('api/geo/', include('apps.geo.urls')),

    # API Docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
