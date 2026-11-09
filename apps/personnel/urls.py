from django.urls import path
from apps.personnel.quick_driver_views import DriverQuickCreateAPIView
from apps.personnel.api_views import (
    EmployeeListCreateAPIView,
    EmployeeDetailAPIView,
    EmployeeStatsAPIView,
    EmployeeExportTemplateAPIView,
    EmployeeImportAPIView,
    EmployeeExportDataAPIView,
    AvailableUsersAPIView,
)

urlpatterns = [
    path('drivers/quick-create/', DriverQuickCreateAPIView.as_view(), name='api-driver-quick-create'),
    path('employees/', EmployeeListCreateAPIView.as_view(), name='api-employee-list-create'),
    path('employees/export-template/', EmployeeExportTemplateAPIView.as_view(), name='api-employee-export-template'),
    path('employees/import/', EmployeeImportAPIView.as_view(), name='api-employee-import'),
    path('employees/export-data/', EmployeeExportDataAPIView.as_view(), name='api-employee-export-data'),
    path('employees/<int:pk>/', EmployeeDetailAPIView.as_view(), name='api-employee-detail'),
    path('users-available/', AvailableUsersAPIView.as_view(), name='api-available-users'),
    path('stats/', EmployeeStatsAPIView.as_view(), name='api-employee-stats'),
]
