from rest_framework import viewsets
from .models import ServiceItem, ServiceRecord
from rest_framework import serializers


class ServiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceItem
        fields = '__all__'


class ServiceRecordSerializer(serializers.ModelSerializer):
    case_name = serializers.CharField(source='case.name', read_only=True)
    caregiver_name = serializers.CharField(source='caregiver.chinese_name', read_only=True)
    service_code = serializers.CharField(source='service_item.code', read_only=True)
    service_name = serializers.CharField(source='service_item.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ServiceRecord
        fields = '__all__'


class ServiceItemViewSet(viewsets.ModelViewSet):
    queryset = ServiceItem.objects.filter(is_active=True)
    serializer_class = ServiceItemSerializer
    search_fields = ['code', 'name']


class ServiceRecordViewSet(viewsets.ModelViewSet):
    queryset = ServiceRecord.objects.select_related(
        'case', 'caregiver', 'service_item'
    ).all()
    serializer_class = ServiceRecordSerializer
    filterset_fields = ['status', 'scheduled_date', 'caregiver', 'case']
    search_fields = ['case__name', 'case__case_no', 'caregiver__chinese_name']
    ordering_fields = ['scheduled_date', 'scheduled_start_time', 'status']
