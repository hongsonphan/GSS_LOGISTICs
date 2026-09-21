from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from apps.dispatch.views import index_view
from apps.dispatch.api_views import (
    DashboardBGDAPIView,
    TripListCreateAPIView,
    TripDetailAPIView,
    TripAddExpenseAPIView,
    TripAddDocumentAPIView,
    PersonnelPayrollAPIView,
    FleetAPIView,
    SalesAPIView,
    CustomsAPIView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Giao diện Web SPA
    path('', index_view, name='home'),

    # REST APIs
    path('api/dashboard/', DashboardBGDAPIView.as_view(), name='api-dashboard'),
    path('api/trips/', TripListCreateAPIView.as_view(), name='api-trips'),
    path('api/trips/<str:trip_code>/', TripDetailAPIView.as_view(), name='api-trip-detail'),
    path('api/trips/<str:trip_code>/expenses/', TripAddExpenseAPIView.as_view(), name='api-trip-add-expense'),
    path('api/trips/<str:trip_code>/documents/', TripAddDocumentAPIView.as_view(), name='api-trip-add-document'),
    
    path('api/personnel/', PersonnelPayrollAPIView.as_view(), name='api-personnel'),
    path('api/fleet/', FleetAPIView.as_view(), name='api-fleet'),
    path('api/sales/', SalesAPIView.as_view(), name='api-sales'),
    path('api/customs/', CustomsAPIView.as_view(), name='api-customs'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
