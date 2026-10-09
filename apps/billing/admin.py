from django.contrib import admin
from .models import TripExpense, DispatcherAdvanceFund, DriverTripAdvance, CashTransaction

@admin.register(TripExpense)
class TripExpenseAdmin(admin.ModelAdmin):
    list_display = ('trip', 'driver', 'category', 'amount', 'status', 'is_on_behalf_of_customer', 'reimbursement_status', 'created_at')
    list_filter = ('status', 'category', 'is_on_behalf_of_customer', 'reimbursement_status', 'trip_leg')
    search_fields = ('trip__trip_code', 'driver__full_name', 'invoice_number', 'notes')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(DispatcherAdvanceFund)
class DispatcherAdvanceFundAdmin(admin.ModelAdmin):
    list_display = ('code', 'dispatcher', 'amount', 'advance_date', 'status', 'approved_by', 'created_at')
    list_filter = ('status', 'advance_date')
    search_fields = ('code', 'dispatcher__full_name', 'purpose')

@admin.register(DriverTripAdvance)
class DriverTripAdvanceAdmin(admin.ModelAdmin):
    list_display = ('code', 'trip', 'driver', 'amount', 'advance_date', 'status', 'advance_source', 'created_at')
    list_filter = ('status', 'advance_source', 'advance_date')
    search_fields = ('code', 'trip__trip_code', 'driver__full_name')

@admin.register(CashTransaction)
class CashTransactionAdmin(admin.ModelAdmin):
    list_display = ('code', 'transaction_type', 'payment_method', 'category', 'amount', 'transaction_date', 'partner_name', 'ref_code')
    list_filter = ('transaction_type', 'payment_method', 'category', 'transaction_date')
    search_fields = ('code', 'partner_name', 'ref_code', 'notes')
