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
    TripExpenseDetailAPIView,
    TripSettleExpensesAPIView,
    TripUnsettleExpensesAPIView,
    TripDriverMilestoneAPIView,
    TripAddDocumentAPIView,
    PersonnelPayrollAPIView,
    FleetAPIView,
    BookingActiveAPIView,
    SalesAPIView,
    QuotationDetailAPIView,
    QuotationStatusAPIView,
    BookingOrderDetailAPIView,
    BookingOrderStatusAPIView,
    CustomsAPIView,
    AccountingAPIView,
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
    path('api/trips/<str:trip_code>/expenses/<int:expense_id>/', TripExpenseDetailAPIView.as_view(), name='api-trip-expense-detail'),
    path('api/trips/<str:trip_code>/settle-expenses/', TripSettleExpensesAPIView.as_view(), name='api-trip-settle-expenses'),
    path('api/trips/<str:trip_code>/unsettle-expenses/', TripUnsettleExpensesAPIView.as_view(), name='api-trip-unsettle-expenses'),
    path('api/trips/<str:trip_code>/milestones/', TripDriverMilestoneAPIView.as_view(), name='api-trip-milestones'),
    path('api/trips/<str:trip_code>/documents/', TripAddDocumentAPIView.as_view(), name='api-trip-add-document'),
    
    path('api/personnel/', PersonnelPayrollAPIView.as_view(), name='api-personnel'),
    path('api/fleet/', FleetAPIView.as_view(), name='api-fleet'),
    path('api/bookings/active/', BookingActiveAPIView.as_view(), name='api-bookings-active'),
    path('api/sales/', SalesAPIView.as_view(), name='api-sales'),
    path('api/quotations/<int:pk>/', QuotationDetailAPIView.as_view(), name='api-quotation-detail'),
    path('api/quotations/<int:pk>/status/', QuotationStatusAPIView.as_view(), name='api-quotation-status'),
    path('api/bookings/<int:pk>/', BookingOrderDetailAPIView.as_view(), name='api-booking-detail'),
    path('api/bookings/<int:pk>/status/', BookingOrderStatusAPIView.as_view(), name='api-booking-status'),
    path('api/customs/', CustomsAPIView.as_view(), name='api-customs'),
    path('api/accounting/', AccountingAPIView.as_view(), name='api-accounting'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
