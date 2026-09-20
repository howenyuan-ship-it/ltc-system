from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import ServiceItemViewSet, ServiceRecordViewSet

router = DefaultRouter()
router.register('items', ServiceItemViewSet, basename='service-item')
router.register('records', ServiceRecordViewSet, basename='service-record')
urlpatterns = router.urls
