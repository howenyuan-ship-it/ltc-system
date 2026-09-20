from rest_framework import viewsets, serializers
from .models import Incident


class IncidentSerializer(serializers.ModelSerializer):
    case_name = serializers.CharField(source='case.name', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.chinese_name', read_only=True)

    class Meta:
        model = Incident
        fields = '__all__'


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.select_related('case', 'reported_by', 'assigned_to').all()
    serializer_class = IncidentSerializer
    filterset_fields = ['incident_type', 'severity', 'status', 'case']
    search_fields = ['description', 'case__name', 'case__case_no']
    ordering_fields = ['occurred_at', 'severity', 'status']

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)
