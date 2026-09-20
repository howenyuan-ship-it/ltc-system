from django.db import models
from apps.accounts.models import User
from apps.cases.models import Case


class Incident(models.Model):
    """異常事件"""
    class IncidentType(models.TextChoices):
        FALL = 'fall', '跌倒/意外事件'
        HEALTH = 'health', '身體狀況異常'
        ENVIRONMENT = 'environment', '環境安全問題'
        BEHAVIOR = 'behavior', '情緒/行為異常'
        COMPLAINT = 'complaint', '投訴/申訴'
        CAREGIVER = 'caregiver', '居服員問題'
        OTHER = 'other', '其他'

    class Severity(models.TextChoices):
        LOW = 'low', '輕微'
        MEDIUM = 'medium', '中等'
        HIGH = 'high', '嚴重'
        CRITICAL = 'critical', '緊急'

    class Status(models.TextChoices):
        PENDING = 'pending', '待處理'
        PROCESSING = 'processing', '處理中'
        RESOLVED = 'resolved', '已結案'
        TRACKING = 'tracking', '追蹤中'

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='incidents', verbose_name='個案')
    incident_type = models.CharField('事件類型', max_length=20, choices=IncidentType.choices)
    severity = models.CharField('嚴重程度', max_length=10, choices=Severity.choices, default=Severity.LOW)
    status = models.CharField('狀態', max_length=15, choices=Status.choices, default=Status.PENDING)

    occurred_at = models.DateTimeField('發生時間')
    location = models.CharField('發生地點', max_length=100, blank=True)
    description = models.TextField('事件描述')
    immediate_action = models.TextField('立即處理措施', blank=True)

    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reported_incidents', verbose_name='回報人員')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents', verbose_name='負責處理人員')

    follow_up_notes = models.TextField('追蹤紀錄', blank=True)
    resolved_at = models.DateTimeField('結案時間', null=True, blank=True)
    resolution_summary = models.TextField('處理結果摘要', blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = '異常事件'
        verbose_name_plural = '異常事件管理'
        ordering = ['-occurred_at']

    def __str__(self):
        return f"{self.get_incident_type_display()} - {self.case} ({self.occurred_at.date()})"
