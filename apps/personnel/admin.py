from django.contrib import admin
from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('code', 'full_name', 'user', 'role', 'department', 'phone_number', 'national_id', 'is_active')
    list_filter = ('role', 'department', 'is_active', ('user', admin.EmptyFieldListFilter))
    search_fields = ('code', 'full_name', 'nickname', 'phone_number', 'national_id', 'user__username', 'user__email')
    raw_id_fields = ('user',)
    ordering = ('code',)
