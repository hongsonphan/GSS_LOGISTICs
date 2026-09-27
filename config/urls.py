from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from apps.dispatch.views import index_view, login_view, logout_view, driver_portal_view
from apps.dispatch.api_views import (
    DashboardBGDAPIView,
    TripListCreateAPIView,
    TripDetailAPIView,
    TripAddExpenseAPIView,
    TripExpenseDetailAPIView,
    TripSettleExpensesAPIView,
    TripUnsettleExpensesAPIView,
    TripDriverMilestoneAPIView,
    TripDriverIncidentAPIView,
    TripAddDocumentAPIView,
    PersonnelPayrollAPIView,
    FleetAPIView,
    BookingActiveAPIView,
    SalesAPIView,
    QuotationDetailAPIView,
    QuotationStatusAPIView,
    BookingOrderDetailAPIView,
    BookingOrderStatusAPIView,
    BookingDocumentDeleteAPIView,
    CustomsAPIView,
    AccountingAPIView,
)
from apps.dispatch.reports_api import ReportsAPIView
from apps.billing.advance_views import (
    AccountingAdvancesAPIView,
    DispatcherFundCreateAPIView,
    DispatcherFundActionAPIView,
    DriverAdvanceCreateAPIView,
    DriverAdvanceSettleAPIView,
)
from apps.billing.finance_reports_api import (
    CustomerReimbursablesAPIView,
    CashBookAPIView,
    SubcontractorSettlementsAPIView,
    BotTollAuditAPIView,
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
    TokenBlacklistView,
)
from core.auth_views import CurrentUserAPIView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Giao diện Web SPA & Xác thực
    path('', index_view, name='home'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),

    # Clean Semantic Routes cho Web SPA (Tiêu chuẩn UI/UX & Quản trị Quốc tế)
    path('dashboard/', index_view, name='spa-dashboard'),
    path('dispatch/', index_view, name='spa-dispatch'),
    path('dispatch/trips/<str:trip_hash>/', index_view, name='spa-dispatch-trip-slash'),
    path('dispatch/trips/<str:trip_hash>', index_view, name='spa-dispatch-trip'),
    path('sales/', index_view, name='spa-sales'),
    path('fleet/', index_view, name='spa-fleet'),
    path('hr/', index_view, name='spa-hr'),
    path('accounting/', index_view, name='spa-accounting'),
    path('customs/', index_view, name='spa-customs'),
    path('reports/', index_view, name='spa-reports'),
    path('settings/', index_view, name='spa-settings'),

    # Mobile Portal dành riêng cho Tài xế xe đầu kéo (Capability Token HashID)
    path('driver/<str:trip_hash>/', driver_portal_view, name='driver-portal'),
    path('driver/<str:trip_hash>', driver_portal_view, name='driver-portal-noslash'),

    # Xác thực người dùng & Mobile JWT Authentication (Tiêu chuẩn 1 & 3)
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token-verify'),
    path('api/auth/token/blacklist/', TokenBlacklistView.as_view(), name='token-blacklist'),
    path('api/auth/me/', CurrentUserAPIView.as_view(), name='auth-me'),

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
    path('api/trips/<str:trip_code>/incidents/', TripDriverIncidentAPIView.as_view(), name='api-trip-incidents'),
    
    path('api/personnel/', PersonnelPayrollAPIView.as_view(), name='api-personnel'),
    path('api/fleet/', FleetAPIView.as_view(), name='api-fleet'),
    path('api/bookings/active/', BookingActiveAPIView.as_view(), name='api-bookings-active'),
    path('api/sales/', SalesAPIView.as_view(), name='api-sales'),
    path('api/quotations/<int:pk>/', QuotationDetailAPIView.as_view(), name='api-quotation-detail'),
    path('api/quotations/<int:pk>/status/', QuotationStatusAPIView.as_view(), name='api-quotation-status'),
    path('api/bookings/<int:pk>/', BookingOrderDetailAPIView.as_view(), name='api-booking-detail'),
    path('api/bookings/<int:pk>/status/', BookingOrderStatusAPIView.as_view(), name='api-booking-status'),
    path('api/bookings/<int:pk>/documents/<int:doc_id>/', BookingDocumentDeleteAPIView.as_view(), name='api-booking-doc-delete'),
    path('api/customs/', include('apps.customs.urls')),
    path('api/accounting/', AccountingAPIView.as_view(), name='api-accounting'),
    path('api/accounting/advances/', AccountingAdvancesAPIView.as_view(), name='api-accounting-advances'),
    path('api/accounting/dispatcher-funds/', DispatcherFundCreateAPIView.as_view(), name='api-dispatcher-fund-create'),
    path('api/accounting/dispatcher-funds/<int:pk>/action/', DispatcherFundActionAPIView.as_view(), name='api-dispatcher-fund-action'),
    path('api/accounting/driver-advances/', DriverAdvanceCreateAPIView.as_view(), name='api-driver-advance-create'),
    path('api/accounting/driver-advances/<int:pk>/settle/', DriverAdvanceSettleAPIView.as_view(), name='api-driver-advance-settle'),
    path('api/accounting/reimbursables/', CustomerReimbursablesAPIView.as_view(), name='api-accounting-reimbursables'),
    path('api/accounting/cashbook/', CashBookAPIView.as_view(), name='api-accounting-cashbook'),
    path('api/accounting/subcontractor-settlements/', SubcontractorSettlementsAPIView.as_view(), name='api-accounting-subcontractors'),
    path('api/accounting/bot-audit/', BotTollAuditAPIView.as_view(), name='api-accounting-bot-audit'),
    path('api/reports/', ReportsAPIView.as_view(), name='api-reports'),
    path('api/master-data/', include('apps.master_data.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
