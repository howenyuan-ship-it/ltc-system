from rest_framework import serializers
from .models import Case


class CaseListSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.chinese_name', read_only=True)
    primary_caregiver_name = serializers.CharField(source='primary_caregiver.chinese_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cms_level_display = serializers.CharField(source='get_cms_level_display', read_only=True)
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = Case
        fields = [
            'id', 'case_no', 'welfare_no', 'name', 'gender', 'age',
            'cms_level', 'cms_level_display', 'status', 'status_display',
            'district', 'city', 'phone',
            'supervisor_name', 'primary_caregiver_name',
            'service_start_date', 'service_end_date',
        ]


class CaseDetailSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.chinese_name', read_only=True)
    primary_caregiver_name = serializers.CharField(source='primary_caregiver.chinese_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = Case
        fields = '__all__'
