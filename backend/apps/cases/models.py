from django.db import models
from apps.accounts.models import Organization, User


class Case(models.Model):
    """照顧個案（受照顧者）"""
    class CareLevel(models.TextChoices):
        CMS1 = '1', 'CMS 1級'
        CMS2 = '2', 'CMS 2級'
        CMS3 = '3', 'CMS 3級'
        CMS4 = '4', 'CMS 4級'
        CMS5 = '5', 'CMS 5級'
        CMS6 = '6', 'CMS 6級'
        CMS7 = '7', 'CMS 7級'
        CMS8 = '8', 'CMS 8級'

    class Gender(models.TextChoices):
        MALE = 'M', '男'
        FEMALE = 'F', '女'

    class Status(models.TextChoices):
        ACTIVE = 'active', '服務中'
        SUSPENDED = 'suspended', '暫停服務'
        CLOSED = 'closed', '結案'
        PENDING = 'pending', '待開案'

    # 基本資料
    case_no = models.CharField('案號', max_length=20, unique=True)
    welfare_no = models.CharField('衛福案號', max_length=30, blank=True)
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name='cases', verbose_name='所屬機構')
    name = models.CharField('姓名', max_length=50)
    id_number = models.CharField('身分證字號', max_length=10, blank=True)
    gender = models.CharField('性別', max_length=1, choices=Gender.choices)
    birth_date = models.DateField('出生日期', null=True, blank=True)
    phone = models.CharField('電話', max_length=20, blank=True)
    address = models.CharField('居住地址', max_length=200, blank=True)
    district = models.CharField('居住區域', max_length=50, blank=True)
    city = models.CharField('居住縣市', max_length=20, blank=True)
    latitude = models.DecimalField('緯度', max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField('經度', max_digits=9, decimal_places=6, null=True, blank=True)
    geocoded_at = models.DateTimeField('定位時間', null=True, blank=True)
    geocode_source = models.CharField('定位來源', max_length=20, blank=True)

    # 長照資訊
    cms_level = models.CharField('CMS等級', max_length=1, choices=CareLevel.choices, blank=True)
    status = models.CharField('狀態', max_length=10, choices=Status.choices, default=Status.PENDING)
    service_start_date = models.DateField('服務開始日期', null=True, blank=True)
    service_end_date = models.DateField('服務結束日期', null=True, blank=True)
    source = models.CharField('來源', max_length=50, blank=True)

    # 負責人員
    supervisor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='supervised_cases', verbose_name='督導'
    )
    sub_supervisor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sub_supervised_cases', verbose_name='副督導'
    )
    primary_caregiver = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='primary_cases', verbose_name='主責居服員'
    )

    # 緊急聯絡人
    emergency_contact_name = models.CharField('緊急聯絡人', max_length=50, blank=True)
    emergency_contact_phone = models.CharField('緊急聯絡電話', max_length=20, blank=True)
    emergency_contact_relation = models.CharField('關係', max_length=20, blank=True)

    notes = models.TextField('備註', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_cases')

    class Meta:
        verbose_name = '個案'
        verbose_name_plural = '個案管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.case_no} - {self.name}"

    @property
    def age(self):
        if self.birth_date:
            from datetime import date
            today = date.today()
            return today.year - self.birth_date.year - (
                (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
            )
        return None

    @property
    def full_address(self):
        return f"{self.city}{self.district}{self.address}".strip()

    @property
    def has_location(self):
        return self.latitude is not None and self.longitude is not None
