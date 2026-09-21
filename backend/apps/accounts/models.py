from django.contrib.auth.models import AbstractUser
from django.db import models


class Organization(models.Model):
    """機構 / 服務單位"""
    name = models.CharField('機構名稱', max_length=100)
    code = models.CharField('機構代碼', max_length=20, unique=True)
    address = models.CharField('地址', max_length=200, blank=True)
    phone = models.CharField('電話', max_length=20, blank=True)
    latitude = models.DecimalField('緯度', max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField('經度', max_digits=9, decimal_places=6, null=True, blank=True)
    is_service_site = models.BooleanField('為服務據點', default=True)
    is_active = models.BooleanField('啟用', default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '機構'
        verbose_name_plural = '機構管理'

    def __str__(self):
        return self.name


class User(AbstractUser):
    """系統使用者"""
    class Role(models.TextChoices):
        SUPER_ADMIN = 'super_admin', '超級管理員'
        ORG_ADMIN = 'org_admin', '機構管理員'
        SUPERVISOR = 'supervisor', '督導'
        SOCIAL_WORKER = 'social_worker', '社工'
        CAREGIVER = 'caregiver', '居服員'
        VIEWER = 'viewer', '檢視者'

    organization = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='users', verbose_name='所屬機構'
    )
    role = models.CharField('角色', max_length=20, choices=Role.choices, default=Role.VIEWER)
    supervisor = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='supervised_staff', verbose_name='所屬督導'
    )
    chinese_name = models.CharField('中文姓名', max_length=50, blank=True)
    employee_id = models.CharField('員工編號', max_length=20, blank=True)
    phone = models.CharField('電話', max_length=20, blank=True)
    avatar = models.ImageField('頭像', upload_to='avatars/', null=True, blank=True)
    is_active = models.BooleanField('啟用', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = '使用者'
        verbose_name_plural = '使用者管理'

    def __str__(self):
        return f"{self.chinese_name or self.username} ({self.get_role_display()})"
