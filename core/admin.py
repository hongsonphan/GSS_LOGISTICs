from django.contrib import admin
from .models import TrackingEventLog

@admin.register(TrackingEventLog)
class TrackingEventLogAdmin(admin.ModelAdmin):
    list_display = ('event_time', 'trip', 'actor', 'event_type', 'title', 'latitude', 'longitude')
    list_filter = ('event_type', 'event_time')
    search_fields = ('trip__trip_code', 'actor__username', 'title', 'description')
    date_hierarchy = 'event_time'
