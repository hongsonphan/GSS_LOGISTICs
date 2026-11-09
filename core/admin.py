from django.contrib import admin
from .models import TrackingEventLog

@admin.register(TrackingEventLog)
class TrackingEventLogAdmin(admin.ModelAdmin):
    list_display = ('event_time', 'trip', 'actor', 'event_type', 'title', 'latitude', 'longitude')
    list_filter = ('event_type', 'event_time')
    search_fields = ('trip__trip_code', 'actor__username', 'title', 'description')
    date_hierarchy = 'event_time'

from core.models import AuditLog, Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'tax_code', 'is_default', 'is_active')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'actor_label', 'action', 'model_label', 'object_id', 'object_repr', 'ip_address')
    list_filter = ('action', 'model_label')
    search_fields = ('object_id', 'object_repr', 'actor_label')
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
