from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta, date
from apps.cases.models import Case
from apps.services.models import ServiceRecord, ServiceItem
from apps.incidents.models import Incident
from apps.accounts.models import User


class DashboardStatsView(APIView):
    """首頁儀表板統計"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        last_week = today - timedelta(days=7)

        # 個案統計
        total_cases = Case.objects.filter(status='active').count()
        new_cases_week = Case.objects.filter(service_start_date__gte=last_week).count()

        # 在職居服員
        active_caregivers = User.objects.filter(role='caregiver', is_active=True).count()

        # 今日服務班次
        today_services = ServiceRecord.objects.filter(scheduled_date=today).count()
        yesterday_services = ServiceRecord.objects.filter(
            scheduled_date=today - timedelta(days=1)
        ).count()

        # 待追蹤事項
        pending_incidents = Incident.objects.filter(
            status__in=['pending', 'tracking']
        ).count()

        # 今日服務名單
        today_service_list = ServiceRecord.objects.filter(
            scheduled_date=today
        ).select_related('case', 'caregiver', 'service_item').order_by('scheduled_start_time')[:10]

        today_list = [
            {
                'id': sr.id,
                'time': sr.scheduled_start_time.strftime('%H:%M'),
                'case_name': sr.case.name,
                'service_code': sr.service_item.code,
                'service_name': sr.service_item.name,
                'caregiver_name': sr.caregiver.chinese_name if sr.caregiver else '',
                'status': sr.status,
                'status_display': sr.get_status_display(),
            }
            for sr in today_service_list
        ]

        # 近7日服務趨勢
        trend_data = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            count = ServiceRecord.objects.filter(scheduled_date=d).count()
            trend_data.append({'date': d.strftime('%m/%d'), 'count': count})

        # 服務類型分布（本月）
        month_start = today.replace(day=1)
        service_distribution = (
            ServiceRecord.objects.filter(
                scheduled_date__gte=month_start,
                status='completed'
            ).values('service_item__code', 'service_item__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:6]
        )

        dist_data = [
            {
                'code': item['service_item__code'],
                'name': item['service_item__name'],
                'count': item['count'],
            }
            for item in service_distribution
        ]

        # 重要提醒
        reminders = []
        cases_needing_eval = Case.objects.filter(
            status='active',
            # simplified: cases created more than 90 days ago
            service_start_date__lte=today - timedelta(days=90)
        ).count()
        if cases_needing_eval:
            reminders.append({'type': 'evaluation', 'count': cases_needing_eval, 'message': f'{cases_needing_eval} 位個案需三個月評估'})

        urgent_incidents = Incident.objects.filter(status__in=['pending', 'tracking']).count()
        if urgent_incidents:
            reminders.append({'type': 'incident', 'count': urgent_incidents, 'message': f'{urgent_incidents} 件異常事件待追蹤'})

        return Response({
            'summary': {
                'total_cases': total_cases,
                'new_cases_week': new_cases_week,
                'active_caregivers': active_caregivers,
                'today_services': today_services,
                'yesterday_services': yesterday_services,
                'pending_incidents': pending_incidents,
            },
            'today_service_list': today_list,
            'service_trend': trend_data,
            'service_distribution': dist_data,
            'reminders': reminders,
        })


class ServiceReportView(APIView):
    """服務報表"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'monthly')
        today = date.today()

        if period == 'daily':
            target_date = date.fromisoformat(request.query_params.get('date', str(today)))
            qs = ServiceRecord.objects.filter(scheduled_date=target_date)
        elif period == 'weekly':
            week_start = today - timedelta(days=today.weekday())
            qs = ServiceRecord.objects.filter(scheduled_date__gte=week_start, scheduled_date__lte=today)
        elif period == 'monthly':
            qs = ServiceRecord.objects.filter(scheduled_date__year=today.year, scheduled_date__month=today.month)
        elif period == 'quarterly':
            quarter_start_month = ((today.month - 1) // 3) * 3 + 1
            qs = ServiceRecord.objects.filter(
                scheduled_date__year=today.year,
                scheduled_date__month__gte=quarter_start_month
            )
        else:  # yearly
            qs = ServiceRecord.objects.filter(scheduled_date__year=today.year)

        total = qs.count()
        completed = qs.filter(status='completed').count()
        cancelled = qs.filter(status='cancelled').count()
        pending = qs.filter(status='pending').count()

        by_service = list(
            qs.values('service_item__code', 'service_item__name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        return Response({
            'period': period,
            'total': total,
            'completed': completed,
            'cancelled': cancelled,
            'pending': pending,
            'completion_rate': round(completed / total * 100, 1) if total else 0,
            'by_service': by_service,
        })
