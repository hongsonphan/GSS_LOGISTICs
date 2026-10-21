from django.contrib import admin
from .models import (
    Location, ContainerType, ExpenseItem, DriverSalaryTariff,
    DriverAllowanceCatalog, ShippingLine, Subcontractor, SubcontractorDriver, CompanyProfile,
    OpeningBalance
)

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'location_type', 'province', 'contact_phone', 'is_active', 'is_deleted')
    list_filter = ('location_type', 'province', 'is_active', 'is_deleted')
    search_fields = ('code', 'name', 'address', 'contact_person')

@admin.register(ContainerType)
class ContainerTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category', 'teu_factor', 'max_payload_kg', 'cbm_capacity', 'is_active')
    list_filter = ('category', 'is_active', 'is_deleted')
    search_fields = ('code', 'name')

@admin.register(ExpenseItem)
class ExpenseItemAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'group_type', 'default_amount', 'requires_invoice', 'is_active')
    list_filter = ('group_type', 'requires_invoice', 'is_active', 'is_deleted')
    search_fields = ('code', 'name')

@admin.register(DriverSalaryTariff)
class DriverSalaryTariffAdmin(admin.ModelAdmin):
    list_display = ('area_group', 'route_name', 'estimated_km', 'salary_rate', 'is_active')
    list_filter = ('area_group', 'is_active', 'is_deleted')
    search_fields = ('area_group', 'route_name', 'pickup_drop_area')

@admin.register(DriverAllowanceCatalog)
class DriverAllowanceCatalogAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category', 'amount', 'is_active')
    list_filter = ('category', 'is_active', 'is_deleted')
    search_fields = ('code', 'name')

@admin.register(ShippingLine)
class ShippingLineAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'contact_phone', 'free_dem_days', 'free_det_days', 'is_active')
    list_filter = ('is_active', 'is_deleted')
    search_fields = ('code', 'name', 'contact_phone', 'website')

class SubcontractorDriverInline(admin.TabularInline):
    model = SubcontractorDriver
    extra = 1
    fields = ('full_name', 'phone', 'license_number', 'is_active', 'notes')

@admin.register(Subcontractor)
class SubcontractorAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'tax_code', 'contact_person', 'phone', 'is_active')
    list_filter = ('is_active', 'is_deleted')
    search_fields = ('code', 'name', 'tax_code', 'contact_person', 'phone')
    inlines = [SubcontractorDriverInline]

@admin.register(SubcontractorDriver)
class SubcontractorDriverAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'subcontractor', 'license_number', 'is_active')
    list_filter = ('subcontractor', 'is_active', 'is_deleted')
    search_fields = ('full_name', 'phone', 'license_number', 'subcontractor__name')

@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'short_name', 'tax_code', 'phone', 'email', 'is_default')
    search_fields = ('company_name', 'short_name', 'tax_code')

@admin.register(OpeningBalance)
class OpeningBalanceAdmin(admin.ModelAdmin):
    list_display = ('account_code', 'account_name', 'category', 'partner_type', 'entity_code', 'entity_name', 'opening_date', 'fiscal_year', 'debit_amount', 'credit_amount', 'is_deleted')
    list_filter = ('fiscal_year', 'category', 'partner_type', 'is_deleted')
    search_fields = ('account_code', 'account_name', 'entity_code', 'entity_name', 'bank_account_number')
    date_hierarchy = 'opening_date'

