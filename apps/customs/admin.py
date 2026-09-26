from django.contrib import admin
from .models import CustomsDeclaration

@admin.register(CustomsDeclaration)
class CustomsDeclarationAdmin(admin.ModelAdmin):
    list_display = ('declaration_number', 'declaration_date', 'customer', 'declaration_type', 'customs_lane', 'status', 'is_tax_paid', 'dispatch_trip')
    list_filter = ('customs_lane', 'status', 'direction', 'is_tax_paid', 'declaration_date')
    search_fields = ('declaration_number', 'bill_of_lading', 'container_numbers', 'customer__name')
    date_hierarchy = 'declaration_date'
