from django.contrib import admin
from .models import Vehicle, Trailer

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('license_plate', 'vehicle_type', 'ownership_type', 'brand', 'payload_capacity_kg', 'registration_expiry', 'status', 'current_driver')
    list_filter = ('vehicle_type', 'ownership_type', 'status', 'is_deleted')
    search_fields = ('license_plate', 'brand', 'current_driver__full_name')

@admin.register(Trailer)
class TrailerAdmin(admin.ModelAdmin):
    list_display = ('license_plate', 'trailer_type', 'status', 'is_deleted', 'created_at')
    list_filter = ('trailer_type', 'status', 'is_deleted')
    search_fields = ('license_plate',)
