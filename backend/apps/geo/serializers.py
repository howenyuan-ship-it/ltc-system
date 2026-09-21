from decimal import Decimal

from rest_framework import serializers

from apps.geo.models import CaregiverLocation


class LocationReportSerializer(serializers.Serializer):
    """居服員手機回報目前位置。"""
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    accuracy_m = serializers.FloatField(required=False, allow_null=True)
    source = serializers.ChoiceField(
        choices=CaregiverLocation.Source.choices,
        default=CaregiverLocation.Source.MOBILE,
    )


class CheckInSerializer(serializers.Serializer):
    """到案家打卡開始服務。"""
    record_id = serializers.IntegerField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    accuracy_m = serializers.FloatField(required=False, allow_null=True)


class CheckOutSerializer(CheckInSerializer):
    """服務結束簽退。"""
    service_notes = serializers.CharField(required=False, allow_blank=True, default='')


class CaregiverLocationSerializer(serializers.ModelSerializer):
    caregiver_name = serializers.CharField(source='caregiver.chinese_name', read_only=True)

    class Meta:
        model = CaregiverLocation
        fields = ['id', 'caregiver', 'caregiver_name', 'latitude', 'longitude',
                  'accuracy_m', 'source', 'recorded_at']
        read_only_fields = ['id', 'caregiver', 'caregiver_name']


class CaseLocationSerializer(serializers.Serializer):
    """人工在地圖上點選／貼上座標，為個案設定居家位置。"""
    case_id = serializers.IntegerField()
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, min_value=Decimal('-90'), max_value=Decimal('90'))
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, min_value=Decimal('-180'), max_value=Decimal('180'))
    address = serializers.CharField(required=False, allow_blank=True)
