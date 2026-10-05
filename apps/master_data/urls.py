from django.urls import path
from apps.master_data.api_views import (
    MasterDataSummaryAPIView,
    MasterDataFormOptionsAPIView,
    LocationListCreateAPIView, LocationDetailAPIView,
    ContainerTypeListCreateAPIView, ContainerTypeDetailAPIView,
    ExpenseItemListCreateAPIView, ExpenseItemDetailAPIView,
    CustomerMasterListCreateAPIView, CustomerMasterDetailAPIView,
    TariffMasterListCreateAPIView, TariffMasterDetailAPIView,
    VehicleMasterListCreateAPIView, VehicleMasterDetailAPIView,
    DriverSalaryTariffListCreateAPIView, DriverSalaryTariffDetailAPIView,
    DriverAllowanceListCreateAPIView, DriverAllowanceDetailAPIView,
    ShippingLineListCreateAPIView, ShippingLineDetailAPIView,
    TrailerMasterListCreateAPIView, TrailerMasterDetailAPIView,
    SubcontractorListCreateAPIView, SubcontractorDetailAPIView,
    CompanyProfileAPIView,
)

urlpatterns = [
    path('summary/', MasterDataSummaryAPIView.as_view(), name='master-summary'),
    path('form-options/', MasterDataFormOptionsAPIView.as_view(), name='master-form-options'),
    
    # 0. Khai báo Hệ Thống / Thông Tin Công Ty
    path('company/', CompanyProfileAPIView.as_view(), name='master-company-profile'),

    # 1. Địa điểm / Cảng bãi
    path('locations/', LocationListCreateAPIView.as_view(), name='master-locations'),
    path('locations/<int:pk>/', LocationDetailAPIView.as_view(), name='master-location-detail'),
    
    # 2. Quy cách Cont & Xe
    path('container-types/', ContainerTypeListCreateAPIView.as_view(), name='master-containers'),
    path('container-types/<int:pk>/', ContainerTypeDetailAPIView.as_view(), name='master-container-detail'),
    
    # 3. Khoản mục Chi phí
    path('expense-items/', ExpenseItemListCreateAPIView.as_view(), name='master-expenses'),
    path('expense-items/<int:pk>/', ExpenseItemDetailAPIView.as_view(), name='master-expense-detail'),
    
    # 4. Khách hàng
    path('customers/', CustomerMasterListCreateAPIView.as_view(), name='master-customers'),
    path('customers/<int:pk>/', CustomerMasterDetailAPIView.as_view(), name='master-customer-detail'),
    
    # 5. Biểu cước
    path('tariffs/', TariffMasterListCreateAPIView.as_view(), name='master-tariffs'),
    path('tariffs/<int:pk>/', TariffMasterDetailAPIView.as_view(), name='master-tariff-detail'),
    
    # 6. Phương tiện (Đầu kéo & Xe tải)
    path('vehicles/', VehicleMasterListCreateAPIView.as_view(), name='master-vehicles'),
    path('vehicles/<int:pk>/', VehicleMasterDetailAPIView.as_view(), name='master-vehicle-detail'),

    # 7. Biểu phí Lương Chuyến Tài Xế
    path('driver-tariffs/', DriverSalaryTariffListCreateAPIView.as_view(), name='master-driver-tariffs'),
    path('driver-tariffs/<int:pk>/', DriverSalaryTariffDetailAPIView.as_view(), name='master-driver-tariff-detail'),

    # 8. Phụ Cấp Cảng Xa & Kiểm Hóa
    path('allowances/', DriverAllowanceListCreateAPIView.as_view(), name='master-allowances'),
    path('allowances/<int:pk>/', DriverAllowanceDetailAPIView.as_view(), name='master-allowance-detail'),

    # 9. Hãng Tàu Biển
    path('shipping-lines/', ShippingLineListCreateAPIView.as_view(), name='master-shipping-lines'),
    path('shipping-lines/<int:pk>/', ShippingLineDetailAPIView.as_view(), name='master-shipping-line-detail'),

    # 10. Rơ-Moóc Container
    path('trailers/', TrailerMasterListCreateAPIView.as_view(), name='master-trailers'),
    path('trailers/<int:pk>/', TrailerMasterDetailAPIView.as_view(), name='master-trailer-detail'),

    # 11. Nhà Xe Thầu Phụ / 3PL
    path('subcontractors/', SubcontractorListCreateAPIView.as_view(), name='master-subcontractors'),
    path('subcontractors/<int:pk>/', SubcontractorDetailAPIView.as_view(), name='master-subcontractor-detail'),
]
