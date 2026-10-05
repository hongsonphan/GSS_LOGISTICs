from django.urls import path
from apps.personnel.api_views import (
    EmployeeListCreateAPIView,
    EmployeeDetailAPIView,
    EmployeeStatsAPIView
)

urlpatterns = [
    path('employees/', EmployeeListCreateAPIView.as_view(), name='api-employee-list-create'),
    path('employees/<int:pk>/', EmployeeDetailAPIView.as_view(), name='api-employee-detail'),
    path('stats/', EmployeeStatsAPIView.as_view(), name='api-employee-stats'),
]
