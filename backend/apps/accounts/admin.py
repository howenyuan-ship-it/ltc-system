from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'phone', 'is_active']
    search_fields = ['name', 'code']
    list_filter = ['is_active']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'chinese_name', 'role', 'organization', 'is_active']
    list_filter = ['role', 'organization', 'is_active']
    search_fields = ['username', 'chinese_name', 'employee_id', 'email']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('長照系統資訊', {'fields': ('chinese_name', 'role', 'organization', 'employee_id', 'phone', 'avatar')}),
    )
