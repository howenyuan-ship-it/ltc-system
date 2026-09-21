from django.db import models

from apps.accounts.models import User


class CaregiverLocation(models.Model):
    """居服員回報的位置點（保留歷史軌跡，地圖只取每人最新一筆）"""

    class Source(models.TextChoices):
        MOBILE = 'mobile', '手機回報'
        CHECKIN = 'checkin', '服務打卡'
        MANUAL = 'manual', '人工設定'
        MOCK = 'mock', '模擬資料'

    caregiver = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='locations', verbose_name='居服員'
    )
    latitude = models.DecimalField('緯度', max_digits=9, decimal_places=6)
    longitude = models.DecimalField('經度', max_digits=9, decimal_places=6)
    accuracy_m = models.FloatField('定位誤差(公尺)', null=True, blank=True)
    source = models.CharField('來源', max_length=10, choices=Source.choices, default=Source.MOBILE)
    recorded_at = models.DateTimeField('回報時間', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '居服員位置'
        verbose_name_plural = '居服員位置紀錄'
        ordering = ['-recorded_at']
        indexes = [models.Index(fields=['caregiver', '-recorded_at'])]

    def __str__(self):
        return f"{self.caregiver} @ {self.recorded_at:%Y-%m-%d %H:%M}"
