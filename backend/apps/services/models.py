from django.db import models
from apps.accounts.models import User
from apps.cases.models import Case


class ServiceItem(models.Model):
    """服務項目定義 (BA01、BA05 等)"""
    code = models.CharField('服務代碼', max_length=10, unique=True)
    name = models.CharField('服務名稱', max_length=100)
    category = models.CharField('類別', max_length=50, blank=True)
    unit = models.CharField('單位', max_length=10, default='次')
    is_active = models.BooleanField('啟用', default=True)

    class Meta:
        verbose_name = '服務項目'
        verbose_name_plural = '服務項目管理'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} {self.name}"


class ServiceRecord(models.Model):
    """服務紀錄（每次服務班次）"""
    class Status(models.TextChoices):
        PENDING = 'pending', '待服務'
        IN_PROGRESS = 'in_progress', '進行中'
        COMPLETED = 'completed', '已完成'
        CANCELLED = 'cancelled', '已取消'
        ABNORMAL = 'abnormal', '異常'

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='service_records', verbose_name='個案')
    caregiver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='service_records', verbose_name='居服員')
    service_item = models.ForeignKey(ServiceItem, on_delete=models.PROTECT, verbose_name='服務項目')

    scheduled_date = models.DateField('排定日期')
    scheduled_start_time = models.TimeField('排定開始時間')
    scheduled_end_time = models.TimeField('排定結束時間')
    actual_start_time = models.DateTimeField('實際開始時間', null=True, blank=True)
    actual_end_time = models.DateTimeField('實際結束時間', null=True, blank=True)

    status = models.CharField('狀態', max_length=15, choices=Status.choices, default=Status.PENDING)
    service_notes = models.TextField('服務紀錄', blank=True)
    client_signature = models.BooleanField('案家簽名確認', default=False)
    quality_score = models.PositiveSmallIntegerField('服務品質評分', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = '服務紀錄'
        verbose_name_plural = '服務紀錄管理'
        ordering = ['-scheduled_date', '-scheduled_start_time']

    def __str__(self):
        return f"{self.scheduled_date} {self.case} - {self.service_item}"


class Schedule(models.Model):
    """排班計畫"""
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='schedules', verbose_name='個案')
    caregiver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='schedules', verbose_name='居服員')
    service_item = models.ForeignKey(ServiceItem, on_delete=models.PROTECT, verbose_name='服務項目')
    weekday = models.PositiveSmallIntegerField('星期幾 (0=週一)', choices=[(i, str(i)) for i in range(7)])
    start_time = models.TimeField('開始時間')
    end_time = models.TimeField('結束時間')
    effective_from = models.DateField('生效日期')
    effective_to = models.DateField('結束日期', null=True, blank=True)
    is_active = models.BooleanField('啟用', default=True)

    class Meta:
        verbose_name = '排班'
        verbose_name_plural = '排班管理'
