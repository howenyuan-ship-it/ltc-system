"""地理位置管理的商業邏輯：班次狀態判定與地圖資料彙整。"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date as date_cls, datetime, timedelta
from typing import Iterable, Optional

from django.conf import settings
from django.db.models import Q, QuerySet
from django.utils import timezone

from apps.accounts.models import Organization, User
from apps.geo.models import CaregiverLocation
from apps.services.models import ServiceRecord

# 地圖與清單使用的四種狀態
STATUS_COMPLETED = 'completed'            # 綠：準時完成
STATUS_PENDING = 'pending'                # 黃：未完成且尚未逾時
STATUS_LATE = 'late'                      # 紅：已逾時仍未完成
STATUS_LATE_COMPLETED = 'late_completed'  # 紅/綠：遲到後補做完成
STATUS_CANCELLED = 'cancelled'            # 灰：已取消，不計入統計

STATUS_LABELS = {
    STATUS_COMPLETED: '已完成',
    STATUS_PENDING: '未完成',
    STATUS_LATE: '遲到',
    STATUS_LATE_COMPLETED: '遲到後完成',
    STATUS_CANCELLED: '已取消',
}

# 排序權重：遲到最優先置頂，其次未完成，已完成墊底
STATUS_ORDER = {
    STATUS_LATE: 0,
    STATUS_LATE_COMPLETED: 1,
    STATUS_PENDING: 2,
    STATUS_COMPLETED: 3,
    STATUS_CANCELLED: 4,
}


def grace_minutes() -> int:
    return settings.SERVICE_LATE_GRACE_MINUTES


def local_datetime(day: date_cls, clock) -> datetime:
    """把 DateField + TimeField 合成帶時區的 datetime（依 settings.TIME_ZONE）。"""
    return timezone.make_aware(datetime.combine(day, clock), timezone.get_current_timezone())


@dataclass(frozen=True)
class RecordStatus:
    code: str
    label: str
    is_late: bool
    late_minutes: int


def evaluate_record(record: ServiceRecord, now: Optional[datetime] = None) -> RecordStatus:
    """判定單一班次目前該顯示成哪一種顏色。

    遲到的認定有兩種情形：
      1. 已打卡，但打卡時間晚於排定開始時間加寬限
      2. 尚未打卡，而現在時間已超過排定開始時間加寬限
    """
    now = now or timezone.now()

    if record.status == ServiceRecord.Status.CANCELLED:
        return RecordStatus(STATUS_CANCELLED, STATUS_LABELS[STATUS_CANCELLED], False, 0)

    deadline = local_datetime(record.scheduled_date, record.scheduled_start_time) + timedelta(
        minutes=grace_minutes()
    )
    is_done = record.status == ServiceRecord.Status.COMPLETED

    if record.actual_start_time:
        is_late = record.actual_start_time > deadline
        late_delta = record.actual_start_time - deadline
    else:
        is_late = now > deadline
        late_delta = now - deadline

    late_min = max(0, int(late_delta.total_seconds() // 60)) if is_late else 0

    if is_done:
        code = STATUS_LATE_COMPLETED if is_late else STATUS_COMPLETED
    else:
        code = STATUS_LATE if is_late else STATUS_PENDING

    return RecordStatus(code, STATUS_LABELS[code], is_late, late_min)


def _hhmm(value) -> str:
    return value.strftime('%H:%M') if value else ''


def _local_hhmm(value) -> str:
    return timezone.localtime(value).strftime('%H:%M') if value else ''


def _decimal(value):
    return float(value) if value is not None else None


def serialize_record(record: ServiceRecord, now: datetime) -> dict:
    state = evaluate_record(record, now)
    case = record.case
    caregiver = record.caregiver
    return {
        'id': record.id,
        'case_id': case.id,
        'case_no': case.case_no,
        'case_name': case.name,
        'address': case.full_address,
        'latitude': _decimal(case.latitude),
        'longitude': _decimal(case.longitude),
        'geocode_source': case.geocode_source,
        'has_location': case.has_location,
        'address_quality': case.address_quality,
        'address_quality_label': case.address_quality_label,
        'caregiver_id': caregiver.id if caregiver else None,
        'caregiver_name': (caregiver.chinese_name or caregiver.username) if caregiver else '未指派',
        'service_code': record.service_item.code,
        'service_name': record.service_item.name,
        'scheduled_date': record.scheduled_date.isoformat(),
        'scheduled_start': _hhmm(record.scheduled_start_time),
        'scheduled_end': _hhmm(record.scheduled_end_time),
        'actual_start': _local_hhmm(record.actual_start_time),
        'actual_end': _local_hhmm(record.actual_end_time),
        'raw_status': record.status,
        'map_status': state.code,
        'status_label': state.label,
        'is_late': state.is_late,
        'late_minutes': state.late_minutes,
        'supervisor_id': case.supervisor_id,
        'supervisor_name': (
            case.supervisor.chinese_name or case.supervisor.username
        ) if case.supervisor else '',
    }


def latest_locations(caregiver_ids: Iterable[int]) -> dict[int, CaregiverLocation]:
    """每位居服員取最新一筆位置。"""
    result: dict[int, CaregiverLocation] = {}
    qs = CaregiverLocation.objects.filter(caregiver_id__in=list(caregiver_ids)).order_by(
        'caregiver_id', '-recorded_at'
    )
    for loc in qs:
        result.setdefault(loc.caregiver_id, loc)
    return result


def build_map_data(
    *,
    day: date_cls,
    search: str = '',
    statuses: Optional[list[str]] = None,
    case_supervisor_id: Optional[int] = None,
    caregiver_supervisor_id: Optional[int] = None,
    organization_id: Optional[int] = None,
) -> dict:
    """組出地圖頁需要的全部資料。"""
    now = timezone.now()

    records: QuerySet[ServiceRecord] = (
        ServiceRecord.objects
        .filter(scheduled_date=day)
        .select_related('case', 'case__supervisor', 'caregiver', 'service_item')
        .order_by('scheduled_start_time')
    )

    if organization_id:
        records = records.filter(case__organization_id=organization_id)
    if case_supervisor_id:
        records = records.filter(
            Q(case__supervisor_id=case_supervisor_id) | Q(case__sub_supervisor_id=case_supervisor_id)
        )
    if caregiver_supervisor_id:
        records = records.filter(caregiver__supervisor_id=caregiver_supervisor_id)
    if search:
        records = records.filter(
            Q(case__name__icontains=search)
            | Q(case__case_no__icontains=search)
            | Q(caregiver__chinese_name__icontains=search)
            | Q(caregiver__username__icontains=search)
            | Q(service_item__name__icontains=search)
        )

    serialized = [serialize_record(r, now) for r in records]

    # 統計以過濾「前」的狀態為準，避免狀態篩選讓底部數字跟著跳動
    stats = {
        'scheduled_total': sum(1 for r in serialized if r['map_status'] != STATUS_CANCELLED),
        'completed': sum(1 for r in serialized if r['map_status'] == STATUS_COMPLETED),
        'late_completed': sum(1 for r in serialized if r['map_status'] == STATUS_LATE_COMPLETED),
        'pending': sum(1 for r in serialized if r['map_status'] == STATUS_PENDING),
        'late': sum(1 for r in serialized if r['map_status'] == STATUS_LATE),
        'cancelled': sum(1 for r in serialized if r['map_status'] == STATUS_CANCELLED),
    }
    stats['completed_total'] = stats['completed'] + stats['late_completed']
    # 未定位的個案在地圖上完全看不到，必須另外統計出來提醒督導，
    # 否則畫面上少了幾個人是察覺不到的
    stats['unlocated_records'] = sum(1 for r in serialized if not r['has_location'])
    stats['unlocated_cases'] = len({r['case_id'] for r in serialized if not r['has_location']})
    stats['completed_cases'] = len({
        r['case_id'] for r in serialized
        if r['map_status'] in (STATUS_COMPLETED, STATUS_LATE_COMPLETED)
    })

    if statuses:
        serialized = [r for r in serialized if r['map_status'] in statuses]

    # 遲到置頂，其次未完成，最後已完成；同組內依排定時間
    serialized.sort(key=lambda r: (STATUS_ORDER.get(r['map_status'], 9), r['scheduled_start']))

    caregivers = _build_caregivers(records, serialized, now)
    sites = _build_sites(organization_id)

    return {
        'date': day.isoformat(),
        'now': timezone.localtime(now).isoformat(),
        'grace_minutes': grace_minutes(),
        'stats': stats,
        'records': serialized,
        'caregivers': caregivers,
        'sites': sites,
    }


def _build_caregivers(records: QuerySet[ServiceRecord], serialized: list[dict], now: datetime) -> list[dict]:
    caregiver_ids = {r.caregiver_id for r in records if r.caregiver_id}
    if not caregiver_ids:
        return []

    locations = latest_locations(caregiver_ids)
    stale_after = timedelta(minutes=settings.CAREGIVER_LOCATION_STALE_MINUTES)

    # 每位居服員當日最近一次打卡
    last_checkin: dict[int, ServiceRecord] = {}
    for record in records:
        if record.caregiver_id and record.actual_start_time:
            current = last_checkin.get(record.caregiver_id)
            if current is None or record.actual_start_time > current.actual_start_time:
                last_checkin[record.caregiver_id] = record

    visible_ids = {r['caregiver_id'] for r in serialized if r['caregiver_id']}
    result = []
    for user in User.objects.filter(id__in=caregiver_ids).select_related('supervisor'):
        loc = locations.get(user.id)
        own = [r for r in serialized if r['caregiver_id'] == user.id]
        checkin = last_checkin.get(user.id)
        result.append({
            'id': user.id,
            'name': user.chinese_name or user.username,
            'employee_id': user.employee_id,
            'phone': user.phone,
            'supervisor_id': user.supervisor_id,
            'supervisor_name': (
                user.supervisor.chinese_name or user.supervisor.username
            ) if user.supervisor else '',
            'latitude': _decimal(loc.latitude) if loc else None,
            'longitude': _decimal(loc.longitude) if loc else None,
            'recorded_at': timezone.localtime(loc.recorded_at).isoformat() if loc else None,
            'recorded_at_label': _local_hhmm(loc.recorded_at) if loc else '',
            'location_source': loc.source if loc else '',
            'is_stale': (now - loc.recorded_at) > stale_after if loc else True,
            'last_checkin': {
                'record_id': checkin.id,
                'case_name': checkin.case.name,
                'service': f'{checkin.service_item.code} {checkin.service_item.name}',
                'time': _local_hhmm(checkin.actual_start_time),
            } if checkin else None,
            'today_total': len(own),
            'today_completed': sum(
                1 for r in own if r['map_status'] in (STATUS_COMPLETED, STATUS_LATE_COMPLETED)
            ),
            'matches_filter': user.id in visible_ids,
        })
    result.sort(key=lambda c: c['name'])
    return result


def _build_sites(organization_id: Optional[int]) -> list[dict]:
    qs = Organization.objects.filter(is_active=True, is_service_site=True)
    if organization_id:
        qs = qs.filter(id=organization_id)
    return [
        {
            'id': org.id,
            'name': org.name,
            'code': org.code,
            'address': org.address,
            'phone': org.phone,
            'latitude': _decimal(org.latitude),
            'longitude': _decimal(org.longitude),
        }
        for org in qs
        if org.latitude is not None and org.longitude is not None
    ]
