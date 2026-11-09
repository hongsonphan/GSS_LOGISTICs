from django.contrib import admin

from .models import Account, JournalEntry, JournalLine


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'account_type', 'company', 'is_active')
    list_filter = ('company', 'account_type')
    search_fields = ('code', 'name')


class JournalLineInline(admin.TabularInline):
    model = JournalLine
    extra = 0
    raw_id_fields = ('account', 'partner', 'employee', 'trip')


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('code', 'entry_date', 'description', 'source_type', 'company')
    list_filter = ('company', 'source_type', 'entry_date')
    search_fields = ('code', 'description', 'source_ref')
    inlines = [JournalLineInline]
    date_hierarchy = 'entry_date'
