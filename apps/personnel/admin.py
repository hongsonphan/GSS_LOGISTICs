from django.contrib import admin
from .models import Employee

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('code', 'full_name', 'nickname', 'role', 'department', 'phone_number', 'user', 'is_active')
    list_filter = ('role', 'department', 'is_active')
    search_fields = ('code', 'full_name', 'nickname', 'phone_number', 'user__username')
    ordering = ('code',)
