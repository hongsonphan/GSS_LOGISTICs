from django.urls import path
from apps.master_data.api_views import (
    MasterDataSummaryAPIView,
    MasterDataFormOptionsAPIView,
    MasterDataVersionAPIView,
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
    SubcontractorListCreateAPIView, SubcontractorDetailAPIView, SubcontractorNextCodeAPIView,
    SubcontractorFleetAPIView, SubcontractorDriverListCreateAPIView, SubcontractorDriverDetailAPIView,
    SubcontractorVehicleListCreateAPIView, SubcontractorVehicleDetailAPIView,
    CompanyProfileAPIView,
    OpeningBalanceListCreateAPIView, OpeningBalanceDetailAPIView,
    MasterDataExportTemplateAPIView,
    MasterDataExportDataAPIView,
    MasterDataImportAPIView,
)
from apps.master_data.permission_views import RolesPermissionsAPIView

urlpatterns = [
    path('summary/', MasterDataSummaryAPIView.as_view(), name='master-summary'),
    path('form-options/', MasterDataFormOptionsAPIView.as_view(), name='master-form-options'),
    path('version/', MasterDataVersionAPIView.as_view(), name='master-data-version'),
    
    # 0. Khai báo Hệ Thống / Thông Tin Công Ty, Phân Quyền & Số Dư Đầu Kỳ
    path('company/', CompanyProfileAPIView.as_view(), name='master-company-profile'),
    path('roles-permissions/', RolesPermissionsAPIView.as_view(), name='master-roles-permissions'),
    path('opening-balances/', OpeningBalanceListCreateAPIView.as_view(), name='master-opening-balances'),
    path('opening-balances/<int:pk>/', OpeningBalanceDetailAPIView.as_view(), name='master-opening-balance-detail'),

    # Export mẫu & Nhập Excel danh mục ban đầu
    path('export-template/', MasterDataExportTemplateAPIView.as_view(), name='master-export-template'),
    path('export-data/', MasterDataExportDataAPIView.as_view(), name='master-export-data'),
    path('import/', MasterDataImportAPIView.as_view(), name='master-import'),

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

    # 11. Nhà Xe Thầu Phụ / 3PL / Gara / NCC
    path('subcontractors/', SubcontractorListCreateAPIView.as_view(), name='master-subcontractors'),
    path('subcontractors/next-code/', SubcontractorNextCodeAPIView.as_view(), name='master-subcontractor-next-code'),
    path('subcontractors/<int:pk>/', SubcontractorDetailAPIView.as_view(), name='master-subcontractor-detail'),
    path('subcontractors/<int:pk>/fleet/', SubcontractorFleetAPIView.as_view(), name='master-subcontractor-fleet'),
    path('subcontractors/<int:pk>/vehicles/', SubcontractorVehicleListCreateAPIView.as_view(), name='master-subcontractor-vehicles'),
    path('subcontractors/<int:pk>/vehicles/<int:vehicle_id>/', SubcontractorVehicleDetailAPIView.as_view(), name='master-subcontractor-vehicle-detail'),
    path('subcontractors/<int:pk>/drivers/', SubcontractorDriverListCreateAPIView.as_view(), name='master-subcontractor-drivers'),
    path('subcontractor-drivers/<int:pk>/', SubcontractorDriverDetailAPIView.as_view(), name='master-subcontractor-driver-detail'),
]
