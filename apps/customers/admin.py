from django.contrib import admin
from .models import Customer, RouteTariff, Quotation, QuotationItem, BookingOrder, BookingDocument

class RouteTariffInline(admin.TabularInline):
    model = RouteTariff
    extra = 0
    fields = ('pickup_location', 'delivery_location', 'container_size', 'freight_price', 'driver_trip_pay', 'toll_standard_fee', 'is_deleted')

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('code', 'short_name', 'name', 'customer_group', 'tax_code', 'company_email', 'contact_person', 'phone', 'bank_name', 'is_deleted', 'created_at')
    list_filter = ('customer_group', 'is_deleted', 'created_at')
    search_fields = ('code', 'short_name', 'name', 'tax_code', 'phone', 'contact_person', 'company_email', 'contact_email', 'bank_account_number')
    inlines = [RouteTariffInline]

@admin.register(RouteTariff)
class RouteTariffAdmin(admin.ModelAdmin):
    list_display = ('customer', 'pickup_location', 'delivery_location', 'container_size', 'freight_price', 'driver_trip_pay', 'toll_standard_fee', 'is_deleted')
    list_filter = ('container_size', 'is_deleted', 'customer')
    search_fields = ('customer__name', 'customer__code', 'pickup_location', 'delivery_location')

class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 0

@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ('quotation_code', 'customer', 'origin_zone', 'destination_zone', 'unit_price', 'status', 'valid_until', 'created_at')
    list_filter = ('status', 'pricing_method', 'created_at')
    search_fields = ('quotation_code', 'customer__name', 'customer__code', 'origin_zone', 'destination_zone')
    inlines = [QuotationItemInline]

class BookingDocumentInline(admin.TabularInline):
    model = BookingDocument
    extra = 0

@admin.register(BookingOrder)
class BookingOrderAdmin(admin.ModelAdmin):
    list_display = ('booking_code', 'customer', 'booking_type', 'booking_number', 'container_size', 'total_containers', 'status', 'created_at')
    list_filter = ('status', 'booking_type', 'created_at')
    search_fields = ('booking_code', 'customer__name', 'customer__code', 'booking_number', 'shipping_line')
    inlines = [BookingDocumentInline]

@admin.register(QuotationItem)
class QuotationItemAdmin(admin.ModelAdmin):
    list_display = ('quotation', 'origin_zone', 'destination_zone', 'cargo_type', 'unit_price', 'expected_trips_monthly', 'is_deleted')
    list_filter = ('cargo_type', 'is_deleted', 'created_at')
    search_fields = ('quotation__quotation_code', 'origin_zone', 'destination_zone', 'route_description')

@admin.register(BookingDocument)
class BookingDocumentAdmin(admin.ModelAdmin):
    list_display = ('booking', 'file_name', 'file_size', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('booking__booking_code', 'file_name')

