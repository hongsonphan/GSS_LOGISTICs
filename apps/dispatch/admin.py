from django.contrib import admin
from .models import DispatchTrip, TripTimelineItem

class TripTimelineItemInline(admin.TabularInline):
    model = TripTimelineItem
    extra = 0
    readonly_fields = ('created_at', 'updated_at')

@admin.register(DispatchTrip)
class DispatchTripAdmin(admin.ModelAdmin):
    list_display = ('trip_code', 'shipment_type', 'customer', 'vehicle', 'driver', 'status', 'created_at')
    list_filter = ('status', 'shipment_type', 'is_twin_container', 'created_at')
    search_fields = ('trip_code', 'container_number', 'container_number_2', 'booking_or_bill', 'customer__name', 'driver__full_name')
    date_hierarchy = 'created_at'
    inlines = [TripTimelineItemInline]

@admin.register(TripTimelineItem)
class TripTimelineItemAdmin(admin.ModelAdmin):
    list_display = ('trip', 'step_number', 'title', 'time_display', 'is_done', 'is_active')
    list_filter = ('is_done', 'is_active')
    search_fields = ('trip__trip_code', 'title')
