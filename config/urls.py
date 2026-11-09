from django.contrib import admin
from django.urls import path, include
from core import access_views, account_views
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic.base import RedirectView

from apps.dispatch.vendor_views import vendor_portal_view
from apps.dispatch.gss_views import qr_trip_page_view
from apps.dispatch.api_views import gss as gss_api
from apps.dispatch.api_views import gss_booking as gss_booking_api
from apps.dispatch.api_views import gss_ops as gss_ops_api
from apps.depot_yard import api as depot_api
from apps.qr_tracking import api as qr_api
from apps.dispatch.views import index_view, login_view, logout_view, public_tracking_view, help_view, news_detail_page_view
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
    FleetAPIView,
    BookingActiveAPIView,
    BookingPriceLookupAPIView,
    SalesAPIView,
    QuotationDetailAPIView,
    QuotationStatusAPIView,
    BookingOrderDetailAPIView,
    BookingVendorAllocationsAPIView,
    VendorAllocationDetailAPIView,
    VendorPortalAPIView, VendorPortalCatalogAPIView, VendorPortalExcelAPIView,
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
from apps.billing.settlement_voucher_views import (
    SettlementVoucherListCreateAPIView,
    SettlementVoucherDetailAPIView,
    SettlementVoucherApproveAPIView,
    SettlementVoucherReopenAPIView,
    SettlementVoucherSettleAPIView,
    SettlementVoucherUnsettleAPIView,
    SettlementVoucherOffsetAPIView,
    SettlementVoucherReportAPIView,
    SettlementVoucherReportDetailAPIView,
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
    path('vendor/<str:token>/', vendor_portal_view, name='vendor-portal'),
    path('q/<str:token>/', qr_trip_page_view, name='qr-trip-page'),

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
    path('api/access/groups/<str:key>/', access_views.GroupAccessAPIView.as_view(), name='api-access-group'),
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
    
    path('api/personnel/', include('apps.personnel.urls')),
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
    path('api/bookings/<int:pk>/vendor-allocations/', BookingVendorAllocationsAPIView.as_view(), name='api-booking-vendor-allocations'),
    path('api/vendor-allocations/<int:pk>/', VendorAllocationDetailAPIView.as_view(), name='api-vendor-allocation-detail'),
    path('api/vendor/<str:token>/', VendorPortalAPIView.as_view(), name='api-vendor-portal'),
    # GSS: điều vận Nhận–Giao–Hạ, chứng từ, kiện hàng lẻ, tem QR
    path('api/gss/bookings/', gss_booking_api.GssBookingListAPIView.as_view()),
    path('api/gss/bookings/<int:pk>/', gss_booking_api.GssBookingDetailAPIView.as_view()),
    path('api/gss/bookings/<int:pk>/documents/', gss_booking_api.GssBookingDocumentsAPIView.as_view()),
    path('api/gss/bookings/<int:pk>/documents/<int:doc_id>/', gss_booking_api.GssBookingDocumentsAPIView.as_view()),
    path('api/gss/manual-trips/', gss_ops_api.GssManualTripAPIView.as_view()),
    path('api/gss/trips-export/', gss_ops_api.GssTripExportAPIView.as_view()),
    path('api/gss/search/', gss_ops_api.GssGlobalSearchAPIView.as_view()),
    path('api/gss/dem-det-alerts/', gss_ops_api.GssDemDetAlertsAPIView.as_view()),
    path('api/gss/settlement/', gss_ops_api.GssSettlementListAPIView.as_view()),
    path('api/gss/settlement/export/', gss_ops_api.GssSettlementExportAPIView.as_view()),
    path('api/gss/settlement/<str:code>/', gss_ops_api.GssSettlementTripAPIView.as_view()),
    path('api/gss/dashboard/', gss_api.GssDashboardAPIView.as_view()),
    path('api/gss/trips/', gss_api.GssTripListAPIView.as_view()),
    path('api/gss/trips/<str:code>/', gss_api.GssTripDetailAPIView.as_view()),
    path('api/gss/trips/<str:code>/step/', gss_api.GssTripStepAPIView.as_view()),
    path('api/gss/trips/<str:code>/attachments/', gss_api.GssTripAttachmentsAPIView.as_view()),
    path('api/gss/trips/<str:code>/attachments/<int:doc_id>/', gss_api.GssTripAttachmentDetailAPIView.as_view()),
    path('api/gss/trips/<str:code>/message/', gss_api.GssTripMessageAPIView.as_view()),
    path('api/gss/trips/<str:code>/pod/', gss_api.GssTripPodAPIView.as_view()),
    path('api/gss/trips/<str:code>/qr.svg', gss_api.GssTripQrAPIView.as_view()),
    path('api/gss/trips/<str:code>/labels/', gss_api.GssLabelsAPIView.as_view()),
    path('api/gss/trips/<str:code>/packages/', gss_api.GssPackagesAPIView.as_view()),
    path('api/gss/packages/<int:pk>/', gss_api.GssPackageDetailAPIView.as_view()),
    path('api/gss/packages/<int:pk>/scan/', gss_api.GssPackageScanAPIView.as_view()),
    path('api/gss/resolve/', gss_api.GssResolveQrAPIView.as_view()),
    path('api/gss/pod-templates/', gss_api.GssPodTemplatesAPIView.as_view()),
    path('api/gss/pod-templates/<int:pk>/', gss_api.GssPodTemplateDetailAPIView.as_view()),
    path('api/gss/pod-templates/<int:pk>/preview/', gss_api.GssPodTemplatePreviewAPIView.as_view()),
    path('api/gss/customers/<int:pk>/pod-template/', gss_api.GssCustomerPodTemplateAPIView.as_view()),
    path('api/depot/yards/', depot_api.YardListAPIView.as_view()),
    path('api/depot/yards/<int:pk>/', depot_api.YardDetailAPIView.as_view()),
    path('api/depot/stats/', depot_api.DepotStatsAPIView.as_view()),
    path('api/depot/lookup/', depot_api.DepotLookupAPIView.as_view()),
    path('api/depot/export/', depot_api.MovementExportAPIView.as_view()),
    path('api/depot/movements/', depot_api.MovementListCreateAPIView.as_view()),
    path('api/depot/movements/<int:pk>/', depot_api.MovementDetailAPIView.as_view()),
    path('api/depot/movements/<int:pk>/gate-out/', depot_api.MovementGateOutAPIView.as_view()),
    path('api/depot/movements/<int:pk>/photos/', depot_api.MovementPhotosAPIView.as_view()),
    path('api/qr/t/<str:token>/', qr_api.TripQrInfoAPIView.as_view()),
    path('api/qr/t/<str:token>/step/', qr_api.TripQrStepAPIView.as_view()),
    path('api/qr/t/<str:token>/attachments/', qr_api.TripQrAttachmentsAPIView.as_view()),
    path('api/qr/t/<str:token>/claims/', qr_api.TripQrClaimAPIView.as_view()),
    path('api/qr/t/<str:token>/checkpoint/', qr_api.TripQrCheckpointAPIView.as_view()),
    path('api/vendor/<str:token>/catalog/', VendorPortalCatalogAPIView.as_view()),
    path('api/vendor/<str:token>/excel/', VendorPortalExcelAPIView.as_view()),
    path('', include('apps.gss.urls')),
    path('api/qr/p/<str:token>/scan/', qr_api.PackageQrScanAPIView.as_view()),
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
    path('api/accounting/settlement-vouchers/', SettlementVoucherListCreateAPIView.as_view(), name='api-settlement-vouchers'),
    path('api/accounting/settlement-vouchers/<int:pk>/', SettlementVoucherDetailAPIView.as_view(), name='api-settlement-voucher-detail'),
    path('api/accounting/settlement-vouchers/<int:pk>/approve/', SettlementVoucherApproveAPIView.as_view(), name='api-settlement-voucher-approve'),
    path('api/accounting/settlement-vouchers/<int:pk>/reopen/', SettlementVoucherReopenAPIView.as_view(), name='api-settlement-voucher-reopen'),
    path('api/accounting/settlement-vouchers/<int:pk>/settle/', SettlementVoucherSettleAPIView.as_view(), name='api-settlement-voucher-settle'),
    path('api/accounting/settlement-vouchers/<int:pk>/unsettle/', SettlementVoucherUnsettleAPIView.as_view(), name='api-settlement-voucher-unsettle'),
    path('api/accounting/settlement-vouchers/<int:pk>/offset/', SettlementVoucherOffsetAPIView.as_view(), name='api-settlement-voucher-offset'),

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
    path('api/reports/settlement-vouchers/', SettlementVoucherReportAPIView.as_view(), name='api-report-settlement-vouchers'),
    path('api/reports/settlement-vouchers/<int:pk>/', SettlementVoucherReportDetailAPIView.as_view(), name='api-report-settlement-voucher-detail'),
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
