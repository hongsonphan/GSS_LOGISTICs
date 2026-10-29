from django.contrib import admin
from django.urls import path, include
from core import access_views, account_views
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic.base import RedirectView

from apps.dispatch.views import index_view, login_view, logout_view, driver_portal_view, public_tracking_view, help_view, news_detail_page_view
from apps.dispatch.api_views import (
    DashboardBGDAPIView,
    DashboardPivotChartAPIView,
    TripListCreateAPIView,
    TripDetailAPIView,
    TripAddExpenseAPIView,
    TripExpenseDetailAPIView,
    TripSettleExpensesAPIView,
    TripUnsettleExpensesAPIView,
    TripDriverMilestoneAPIView,
    TripDriverIncidentAPIView,
    TripAddDocumentAPIView,
    TripDocumentDetailAPIView,
    PersonnelPayrollAPIView,
    FleetAPIView,
    BookingActiveAPIView,
    BookingPriceLookupAPIView,
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
    DispatcherFundDetailAPIView,
    DriverAdvanceCreateAPIView,
    DriverAdvanceSettleAPIView,
    DriverAdvanceDetailAPIView,
    DriverBatchSettlementQueryAPIView,
    DriverBatchSettlementExecuteAPIView,
    CustomerARReconciliationAPIView,
)
from apps.billing.customer_statement_views import (
    CustomerMonthlyStatementAPIView,
    CustomerMonthlyStatementExportExcelAPIView,
)
from apps.billing.finance_reports_api import (
    CustomerReimbursablesAPIView,
    CashBookAPIView,
    CashBookDetailAPIView,
    SubcontractorSettlementsAPIView,
    BotTollAuditAPIView,
    AccountingReportsAPIView,
    AccountingReportDrilldownAPIView,
)
from apps.master_data.api_views import CustomerMasterListCreateAPIView

from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
    TokenBlacklistView,
)
from core.auth_views import CurrentUserAPIView
from core.health import healthz
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import IsAdminUser

urlpatterns = [
    path('favicon.ico', RedirectView.as_view(url='/static/favicon.ico', permanent=True)),
    path('robots.txt', RedirectView.as_view(url='/static/robots.txt', permanent=True)),
    path('healthz/', healthz, name='healthz'),
    path('api/schema/', SpectacularAPIView.as_view(permission_classes=[IsAdminUser]), name='api-schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='api-schema', permission_classes=[IsAdminUser]), name='api-docs'),
    path('admin/login/', account_views.admin_login_redirect, name='admin-login-redirect'),
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
    path('settlements/', index_view, name='spa-settlements'),
    path('settlements', index_view, name='spa-settlements-noslash'),
    path('quyet-toan/', index_view, name='spa-quyet-toan'),
    path('quyet-toan', index_view, name='spa-quyet-toan-noslash'),
    path('sales/', index_view, name='spa-sales'),
    path('sales/quotations/<str:quote_hash>/', index_view, name='spa-sales-quotation-slash'),
    path('sales/quotations/<str:quote_hash>', index_view, name='spa-sales-quotation'),
    path('sales/bookings/<str:booking_id>/', index_view, name='spa-sales-booking-slash'),
    path('sales/bookings/<str:booking_id>', index_view, name='spa-sales-booking'),
    path('fleet/', index_view, name='spa-fleet'),
    path('hr/', index_view, name='spa-hr'),
    path('accounting/', index_view, name='spa-accounting'),
    path('accounting/vouchers/<str:voucher_id>/', index_view, name='spa-accounting-voucher-slash'),
    path('accounting/vouchers/<str:voucher_id>', index_view, name='spa-accounting-voucher'),
    path('customs/', index_view, name='spa-customs'),
    # Trang riêng (tải lại / mở link trực tiếp không bị 404): tờ khai, hồ sơ nhân sự, hợp đồng lao động
    path('customs/declarations/<str:declaration_id>/', index_view, name='spa-customs-declaration-slash'),
    path('customs/declarations/<str:declaration_id>', index_view, name='spa-customs-declaration'),
    path('personnel/employees/<str:employee_id>/', index_view, name='spa-personnel-employee-slash'),
    path('personnel/employees/<str:employee_id>', index_view, name='spa-personnel-employee'),
    path('personnel/contracts/<str:contract_id>/', index_view, name='spa-personnel-contract-slash'),
    path('personnel/contracts/<str:contract_id>', index_view, name='spa-personnel-contract'),
    path('reports/', index_view, name='spa-reports'),
    path('settings/', index_view, name='spa-settings'),
    path('master-data/', index_view, name='spa-master-data'),
    path('master-data', index_view, name='spa-master-data-noslash'),
    path('danh-muc/', index_view, name='spa-danhmuc'),
    # Trang Chi Tiết Bản Tin & Xem Trước Tệp Đính Kèm (PDF, Word, Excel) — Chuẩn HashID Bảo Mật IDOR
    path('news/<str:post_identifier>/', news_detail_page_view, name='news-detail-page'),
    path('news/<str:post_identifier>', news_detail_page_view, name='news-detail-page-noslash'),
    path('news/', index_view, name='spa-news'),
    path('news', index_view, name='spa-news-noslash'),
    path('tasks/<str:task_hash>/', index_view, name='spa-tasks-detail-slash'),
    path('tasks/<str:task_hash>', index_view, name='spa-tasks-detail'),
    path('tasks/', index_view, name='spa-tasks'),
    path('tasks', index_view, name='spa-tasks-noslash'),

    # Trung Tâm Trợ Giúp & Hướng Dẫn Sử Dụng Hệ Thống (/helps)
    path('helps/', help_view, name='help-center'),
    path('helps', help_view, name='help-center-noslash'),
    path('help/', help_view, name='help-alias'),
    path('help', help_view, name='help-alias-noslash'),

    # Mobile Portal dành riêng cho Tài xế xe đầu kéo (Capability Token HashID)
    path('driver/<str:trip_hash>/', driver_portal_view, name='driver-portal'),
    path('driver/<str:trip_hash>', driver_portal_view, name='driver-portal-noslash'),

    # Cổng Tra Cứu Vận Đơn Công Khai Cho Khách Hàng (Public Tracking Portal)
    path('tracking/<str:trip_hash>/', public_tracking_view, name='public-tracking'),
    path('tracking/<str:trip_hash>', public_tracking_view, name='public-tracking-noslash'),

    # Xác thực người dùng & Mobile JWT Authentication (Tiêu chuẩn 1 & 3)
    path('api/auth/token/', account_views.SecureTokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token-verify'),
    path('api/auth/token/blacklist/', TokenBlacklistView.as_view(), name='token-blacklist'),
    path('api/ledger/', include('apps.ledger.urls')),
    # Phân quyền theo ma trận Chức danh × Phân hệ × Thao tác (core/access.py)
    path('api/access/me/', access_views.MyAccessAPIView.as_view(), name='api-access-me'),
    path('api/access/matrix/', access_views.AccessMatrixAPIView.as_view(), name='api-access-matrix'),
    path('api/access/roles/<str:role>/', access_views.RoleAccessAPIView.as_view(), name='api-access-role'),
    path('api/access/users/<int:pk>/', access_views.UserAccessAPIView.as_view(), name='api-access-user'),
    path('api/access/users/<int:pk>/send-reset/', account_views.SendPasswordResetAPIView.as_view(), name='api-access-user-send-reset'),
    # Tài khoản: quên mật khẩu qua email, đặt lại bằng link, đổi mật khẩu
    path('password-reset/', account_views.password_reset_request, name='password-reset'),
    path('password-reset/<str:uidb64>/<str:token>/', account_views.password_reset_confirm, name='password-reset-confirm'),
    path('account/password/', account_views.password_change, name='account-password'),
    path('api/auth/me/', CurrentUserAPIView.as_view(), name='auth-me'),

    # REST APIs
    path('api/dashboard/', DashboardBGDAPIView.as_view(), name='api-dashboard'),
    path('api/dashboard/pivot/', DashboardPivotChartAPIView.as_view(), name='api-dashboard-pivot'),
    path('api/trips/', TripListCreateAPIView.as_view(), name='api-trips'),
    path('api/trips/<str:trip_code>/', TripDetailAPIView.as_view(), name='api-trip-detail'),
    path('api/trips/<str:trip_code>/expenses/', TripAddExpenseAPIView.as_view(), name='api-trip-add-expense'),
    path('api/trips/<str:trip_code>/expenses/<int:expense_id>/', TripExpenseDetailAPIView.as_view(), name='api-trip-expense-detail'),
    path('api/trips/<str:trip_code>/settle-expenses/', TripSettleExpensesAPIView.as_view(), name='api-trip-settle-expenses'),
    path('api/trips/<str:trip_code>/unsettle-expenses/', TripUnsettleExpensesAPIView.as_view(), name='api-trip-unsettle-expenses'),
    path('api/trips/<str:trip_code>/milestones/', TripDriverMilestoneAPIView.as_view(), name='api-trip-milestones'),
    path('api/trips/<str:trip_code>/documents/', TripAddDocumentAPIView.as_view(), name='api-trip-add-document'),
    path('api/trips/<str:trip_code>/documents/<int:doc_id>/', TripDocumentDetailAPIView.as_view(), name='api-trip-document-detail'),
    path('api/trips/<str:trip_code>/incidents/', TripDriverIncidentAPIView.as_view(), name='api-trip-incidents'),
    
    path('api/personnel/', PersonnelPayrollAPIView.as_view(), name='api-personnel'),
    path('api/personnel/', include('apps.personnel.urls')),
    path('api/personnel/payroll/', PersonnelPayrollAPIView.as_view(), name='api-personnel-payroll'),
    path('api/fleet/', FleetAPIView.as_view(), name='api-fleet'),
    path('api/customers/', CustomerMasterListCreateAPIView.as_view(), name='api-customers-alias'),
    path('api/bookings/active/', BookingActiveAPIView.as_view(), name='api-bookings-active'),
    path('api/sales/price-lookup/', BookingPriceLookupAPIView.as_view(), name='api-sales-price-lookup'),
    path('api/sales/', SalesAPIView.as_view(), name='api-sales'),
    path('api/quotations/<str:pk>/', QuotationDetailAPIView.as_view(), name='api-quotation-detail'),
    path('api/quotations/<int:pk>/status/', QuotationStatusAPIView.as_view(), name='api-quotation-status'),
    path('api/bookings/<int:pk>/', BookingOrderDetailAPIView.as_view(), name='api-booking-detail'),
    path('api/bookings/<int:pk>/status/', BookingOrderStatusAPIView.as_view(), name='api-booking-status'),
    path('api/bookings/<int:pk>/documents/<int:doc_id>/', BookingDocumentDeleteAPIView.as_view(), name='api-booking-doc-delete'),
    path('api/customs/', include('apps.customs.urls')),
    path('api/accounting/', AccountingAPIView.as_view(), name='api-accounting'),
    path('api/accounting/advances/', AccountingAdvancesAPIView.as_view(), name='api-accounting-advances'),
    path('api/accounting/dispatcher-funds/', DispatcherFundCreateAPIView.as_view(), name='api-dispatcher-fund-create'),
    path('api/accounting/dispatcher-funds/<int:pk>/', DispatcherFundDetailAPIView.as_view(), name='api-dispatcher-fund-detail'),
    path('api/accounting/dispatcher-funds/<int:pk>/action/', DispatcherFundActionAPIView.as_view(), name='api-dispatcher-fund-action'),
    path('api/accounting/driver-advances/', DriverAdvanceCreateAPIView.as_view(), name='api-driver-advance-create'),
    path('api/accounting/driver-advances/<int:pk>/', DriverAdvanceDetailAPIView.as_view(), name='api-driver-advance-detail'),
    path('api/accounting/driver-advances/<int:pk>/settle/', DriverAdvanceSettleAPIView.as_view(), name='api-driver-advance-settle'),
    path('api/accounting/driver-settlements/batch-preview/', DriverBatchSettlementQueryAPIView.as_view(), name='api-driver-batch-settlement-query'),
    path('api/accounting/driver-settlements/batch-settle/', DriverBatchSettlementExecuteAPIView.as_view(), name='api-driver-batch-settlement-execute'),
    path('api/accounting/customer-reconciliation/', CustomerARReconciliationAPIView.as_view(), name='api-customer-ar-reconciliation'),
    path('api/accounting/customer-statement/', CustomerMonthlyStatementAPIView.as_view(), name='api-customer-statement'),
    path('api/accounting/customer-statement/export-excel/', CustomerMonthlyStatementExportExcelAPIView.as_view(), name='api-customer-statement-export-excel'),
    path('api/accounting/reimbursables/', CustomerReimbursablesAPIView.as_view(), name='api-accounting-reimbursables'),
    path('api/accounting/cashbook/', CashBookAPIView.as_view(), name='api-accounting-cashbook'),
    path('api/accounting/cashbook/<str:pk>/', CashBookDetailAPIView.as_view(), name='api-accounting-cashbook-detail'),
    path('api/accounting/cash-transactions/', CashBookAPIView.as_view(), name='api-accounting-cash-transactions'),
    path('api/accounting/cash-transactions/<str:pk>/', CashBookDetailAPIView.as_view(), name='api-accounting-cash-transactions-detail'),
    path('api/accounting/subcontractor-settlements/', SubcontractorSettlementsAPIView.as_view(), name='api-accounting-subcontractors'),
    path('api/accounting/bot-audit/', BotTollAuditAPIView.as_view(), name='api-accounting-bot-audit'),
    path('api/accounting/reports/', AccountingReportsAPIView.as_view(), name='api-accounting-reports'),
    path('api/accounting/reports/drilldown/', AccountingReportDrilldownAPIView.as_view(), name='api-accounting-reports-drilldown'),
    path('api/reports/', ReportsAPIView.as_view(), name='api-reports'),
    path('api/master-data/', include('apps.master_data.urls')),
    path('api/collaboration/', include('apps.collaboration.urls')),
]

from django.urls import re_path
from core.media_views import safe_media_serve

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', safe_media_serve, {'document_root': settings.MEDIA_ROOT}, name='safe-media'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
