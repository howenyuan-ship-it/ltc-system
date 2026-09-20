from django.contrib import admin
from .models import Case


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['case_no', 'name', 'cms_level', 'status', 'city', 'supervisor', 'service_start_date']
    list_filter = ['status', 'cms_level', 'city', 'organization']
    search_fields = ['case_no', 'welfare_no', 'name', 'id_number']
    date_hierarchy = 'service_start_date'
    raw_id_fields = ['supervisor', 'primary_caregiver', 'created_by']
