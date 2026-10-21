from django.contrib import admin
from .models import TripException

@admin.register(TripException)
class TripExceptionAdmin(admin.ModelAdmin):
    list_display = ('trip', 'exception_type', 'severity', 'reported_by', 'is_resolved', 'resolved_at', 'created_at', 'is_deleted')
    list_filter = ('exception_type', 'severity', 'is_resolved', 'is_deleted', 'created_at')
    search_fields = ('trip__trip_code', 'description', 'resolution_note')
    date_hierarchy = 'created_at'
