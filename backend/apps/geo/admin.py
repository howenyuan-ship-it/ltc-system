from django.contrib import admin

from .models import CaregiverLocation


@admin.register(CaregiverLocation)
class CaregiverLocationAdmin(admin.ModelAdmin):
    list_display = ('caregiver', 'latitude', 'longitude', 'source', 'recorded_at')
    list_filter = ('source', 'recorded_at')
    search_fields = ('caregiver__username', 'caregiver__chinese_name')
