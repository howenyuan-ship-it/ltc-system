from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from .models import Case
from .serializers import CaseListSerializer, CaseDetailSerializer


class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.select_related('supervisor', 'primary_caregiver', 'organization').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'cms_level', 'organization', 'supervisor', 'city', 'district']
    search_fields = ['case_no', 'welfare_no', 'name', 'id_number', 'phone']
    ordering_fields = ['case_no', 'name', 'service_start_date', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return CaseListSerializer
        return CaseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """個案統計資料"""
        qs = self.get_queryset()
        total = qs.count()
        by_status = dict(qs.values_list('status').annotate(count=Count('id')))
        by_cms = dict(qs.values_list('cms_level').annotate(count=Count('id')))
        return Response({
            'total': total,
            'by_status': by_status,
            'by_cms_level': by_cms,
        })
