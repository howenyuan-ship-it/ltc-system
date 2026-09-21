from datetime import date as date_cls

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status as http_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.geo import services
from apps.geo.models import CaregiverLocation
from apps.geo.serializers import (
    CaseLocationSerializer,
    CheckInSerializer,
    CheckOutSerializer,
    LocationReportSerializer,
)
from apps.services.models import ServiceRecord


def _int_or_none(value):
    try:
        return int(value) if value not in (None, '') else None
    except (TypeError, ValueError):
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def map_data(request):
    """地圖頁需要的全部資料：班次、居服員位置、服務據點、統計。

    查詢參數：
      date                 預設今天
      q                    關鍵字（個案姓名/案號/居服員/服務項目）
      status               以逗號分隔：completed,pending,late,late_completed
      supervisor           以個案督導過濾
      caregiver_supervisor 以居服員督導過濾
      organization         限定機構
    """
    day = parse_date(request.query_params.get('date', '')) or timezone.localdate()
    statuses = [s for s in request.query_params.get('status', '').split(',') if s]

    data = services.build_map_data(
        day=day,
        search=request.query_params.get('q', '').strip(),
        statuses=statuses or None,
        case_supervisor_id=_int_or_none(request.query_params.get('supervisor')),
        caregiver_supervisor_id=_int_or_none(request.query_params.get('caregiver_supervisor')),
        organization_id=_int_or_none(request.query_params.get('organization')),
    )
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def supervisors(request):
    """過濾下拉選單用的督導清單。"""
    from apps.accounts.models import User

    qs = User.objects.filter(
        is_active=True,
        role__in=[User.Role.SUPERVISOR, User.Role.ORG_ADMIN, User.Role.SUPER_ADMIN],
    ).order_by('chinese_name')
    return Response([
        {'id': u.id, 'name': u.chinese_name or u.username, 'role': u.get_role_display()}
        for u in qs
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_schedule(request):
    """登入中的居服員今日班表，供手機打卡頁使用。"""
    day = parse_date(request.query_params.get('date', '')) or timezone.localdate()
    now = timezone.now()
    records = (
        ServiceRecord.objects
        .filter(scheduled_date=day, caregiver=request.user)
        .select_related('case', 'case__supervisor', 'service_item')
        .order_by('scheduled_start_time')
    )
    items = [services.serialize_record(r, now) for r in records]
    return Response({
        'date': day.isoformat(),
        'now': timezone.localtime(now).isoformat(),
        'caregiver_name': request.user.chinese_name or request.user.username,
        'records': items,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_location(request):
    """手機定時回報目前位置。"""
    serializer = LocationReportSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    location = CaregiverLocation.objects.create(
        caregiver=request.user,
        latitude=data['latitude'],
        longitude=data['longitude'],
        accuracy_m=data.get('accuracy_m'),
        source=data['source'],
        recorded_at=timezone.now(),
    )
    return Response(
        {'id': location.id, 'recorded_at': timezone.localtime(location.recorded_at).isoformat()},
        status=http_status.HTTP_201_CREATED,
    )


def _fetch_own_record(request, record_id):
    try:
        record = ServiceRecord.objects.select_related('case', 'service_item').get(pk=record_id)
    except ServiceRecord.DoesNotExist:
        return None, Response({'detail': '找不到此班次'}, status=http_status.HTTP_404_NOT_FOUND)

    is_owner = record.caregiver_id == request.user.id
    is_manager = request.user.is_superuser or request.user.role in ('super_admin', 'org_admin', 'supervisor')
    if not (is_owner or is_manager):
        return None, Response({'detail': '無權操作此班次'}, status=http_status.HTTP_403_FORBIDDEN)
    return record, None


def _save_location(user, data, source):
    if data.get('latitude') is None or data.get('longitude') is None:
        return
    CaregiverLocation.objects.create(
        caregiver=user,
        latitude=data['latitude'],
        longitude=data['longitude'],
        accuracy_m=data.get('accuracy_m'),
        source=source,
        recorded_at=timezone.now(),
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_in(request):
    """到案家打卡，開始服務。"""
    serializer = CheckInSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    record, error = _fetch_own_record(request, data['record_id'])
    if error:
        return error
    if record.actual_start_time:
        return Response({'detail': '此班次已經打卡過了'}, status=http_status.HTTP_400_BAD_REQUEST)

    record.actual_start_time = timezone.now()
    record.status = ServiceRecord.Status.IN_PROGRESS
    record.checkin_latitude = data.get('latitude')
    record.checkin_longitude = data.get('longitude')
    record.save(update_fields=[
        'actual_start_time', 'status', 'checkin_latitude', 'checkin_longitude', 'updated_at'
    ])
    _save_location(request.user, data, CaregiverLocation.Source.CHECKIN)

    return Response(services.serialize_record(record, timezone.now()))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_out(request):
    """服務結束簽退。"""
    serializer = CheckOutSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    record, error = _fetch_own_record(request, data['record_id'])
    if error:
        return error
    if not record.actual_start_time:
        return Response({'detail': '尚未打卡開始，無法簽退'}, status=http_status.HTTP_400_BAD_REQUEST)
    if record.actual_end_time:
        return Response({'detail': '此班次已經簽退過了'}, status=http_status.HTTP_400_BAD_REQUEST)

    record.actual_end_time = timezone.now()
    record.status = ServiceRecord.Status.COMPLETED
    record.checkout_latitude = data.get('latitude')
    record.checkout_longitude = data.get('longitude')
    if data.get('service_notes'):
        record.service_notes = data['service_notes']
    record.save(update_fields=[
        'actual_end_time', 'status', 'checkout_latitude', 'checkout_longitude',
        'service_notes', 'updated_at'
    ])
    _save_location(request.user, data, CaregiverLocation.Source.CHECKIN)

    return Response(services.serialize_record(record, timezone.now()))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_case_location(request):
    """人工設定個案居家座標（地圖拖曳圖釘或貼上座標）。

    標記 geocode_source='manual'，與定位服務算出來的點區分開來——
    人工點選的通常更準，之後批次定位不應該覆蓋掉它。
    """
    from apps.cases.models import Case

    serializer = CaseLocationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        case = Case.objects.get(pk=data['case_id'])
    except Case.DoesNotExist:
        return Response({'detail': '找不到此個案'}, status=http_status.HTTP_404_NOT_FOUND)

    case.latitude = data['latitude']
    case.longitude = data['longitude']
    case.geocoded_at = timezone.now()
    case.geocode_source = 'manual'
    fields = ['latitude', 'longitude', 'geocoded_at', 'geocode_source', 'updated_at']

    if 'address' in data and data['address'].strip():
        case.address = data['address'].strip()
        fields.append('address')

    case.save(update_fields=fields)

    return Response({
        'case_id': case.id,
        'case_name': case.name,
        'address': case.full_address,
        'latitude': float(case.latitude),
        'longitude': float(case.longitude),
        'geocode_source': case.geocode_source,
        'geocoded_at': timezone.localtime(case.geocoded_at).isoformat(),
    })
