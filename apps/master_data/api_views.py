from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from core.permissions import CanManageMasterData
from apps.master_data.import_export_service import (
    generate_catalog_template,
    generate_catalog_data_export,
    process_catalog_import,
    CATALOG_REGISTRY
)

class MasterDataBaseAPIView(APIView):
    permission_classes = [CanManageMasterData]


from apps.master_data.models import (
    Location, LocationType,
    ContainerType, ContainerCategory,
    ExpenseItem, ExpenseCategoryGroup,
    DriverSalaryTariff, DriverAllowanceCatalog, AllowanceCategory,
    ShippingLine, Subcontractor, SubcontractorDriver, CompanyProfile,
    OpeningBalance, OpeningBalanceCategory,
    ACCOUNT_CHART_CHOICES, ACCOUNT_NAME_MAP
)
from apps.customers.models import Customer, RouteTariff
from apps.fleet.models import Vehicle, Trailer, VehicleType, VehicleOwnership, VehicleStatus
from apps.personnel.models import Employee

class MasterDataSummaryAPIView(APIView):
    """Thống kê tổng quan số lượng bản ghi của các danh mục cốt lõi."""
    def get(self, request):
        company = CompanyProfile.get_default_company()
        return Response({
            'stats': {
                'driver_tariffs_count': DriverSalaryTariff.objects.count(),
                'allowances_count': DriverAllowanceCatalog.objects.count(),
                'locations_count': Location.objects.count(),
                'tariffs_count': RouteTariff.objects.count(),
                'customers_count': Customer.objects.count(),
                'expense_items_count': ExpenseItem.objects.count(),
                'container_types_count': ContainerType.objects.count(),
                'vehicles_count': Vehicle.objects.count(),
                'trailers_count': Trailer.objects.count(),
                'shipping_lines_count': ShippingLine.objects.count(),
                'subcontractors_count': Subcontractor.objects.count(),
                'company_name': company.short_name or company.company_name,
            }
        })

class MasterDataFormOptionsAPIView(APIView):
    """
    API cung cấp toàn bộ danh mục lựa chọn (Dropdown Options) cho các Form điều vận,
    Booking và Báo giá: Khách hàng, Địa điểm lấy/đóng/hạ (theo phân nhóm), Tài xế, Loại cont.
    Loại bỏ triệt để việc nhập tự do (free text).
    """
    def get(self, request):
        # 1. Khách hàng
        customers = [
            {
                'id': c.id,
                'code': c.code,
                'name': c.name,
                'short_name': c.short_name,
                'label': f"[{c.short_name}] {c.name}" if c.short_name else (f"{c.name} ({c.code})" if c.code else c.name)
            }
            for c in Customer.objects.all().order_by('name')
        ]

        # 2. Địa điểm (Location)
        locations_qs = Location.objects.all().order_by('name')
        
        ports = []
        icds = []
        depots = []
        warehouses = []
        all_locations = []

        for loc in locations_qs:
            loc_dict = {
                'id': loc.id,
                'code': loc.code,
                'name': loc.name,
                'type': loc.location_type,
                'type_label': loc.get_location_type_display(),
                'address': loc.address,
                'label': f"{loc.name} ({loc.get_location_type_display()})" if loc.location_type != LocationType.WAREHOUSE else loc.name
            }
            all_locations.append(loc_dict)
            if loc.location_type == LocationType.PORT:
                ports.append(loc_dict)
            elif loc.location_type == LocationType.ICD:
                icds.append(loc_dict)
            elif loc.location_type in [LocationType.DEPOT, LocationType.YARD]:
                depots.append(loc_dict)
            elif loc.location_type == LocationType.WAREHOUSE:
                warehouses.append(loc_dict)
            else:
                warehouses.append(loc_dict)

        # 3. Tài xế & Xe được gán
        from apps.personnel.models import EmployeeRole
        drivers = []
        for drv in Employee.objects.filter(role=EmployeeRole.DRIVER).order_by('nickname', 'full_name'):
            veh = getattr(drv, 'assigned_vehicle', None)
            if not veh and hasattr(drv, 'vehicles'):
                veh = drv.vehicles.first()
            plate_info = f" - Xe: {veh.license_plate}" if veh else ""
            drivers.append({
                'id': drv.id,
                'code': drv.code,
                'nickname': drv.nickname or drv.full_name,
                'full_name': drv.full_name,
                'phone': drv.phone_number,
                'label': f"{drv.nickname or drv.full_name} ({drv.code}){plate_info}"
            })

        # 4. Quy cách container / Xe
        container_types = [
            {
                'code': ct.code,
                'name': ct.name,
                'category': ct.category,
                'teu_factor': float(ct.teu_factor),
                'label': f"{ct.code} - {ct.name}"
            }
            for ct in ContainerType.objects.all().order_by('category', 'code')
        ]

        # 5. Danh sách Đầu Kéo & Rơ-mooc
        vehicles = [
            {
                'id': v.id,
                'plate': v.license_plate,
                'ownership': v.get_ownership_type_display(),
                'ownership_code': v.ownership_type,
                'driver_id': v.current_driver_id,
                'driver_name': (v.current_driver.nickname or v.current_driver.full_name) if v.current_driver else '',
                'label': f"{v.license_plate} ({v.get_ownership_type_display()})"
            }
            for v in Vehicle.objects.all().order_by('license_plate')
        ]

        trailers = [
            {
                'id': tr.id,
                'plate': tr.license_plate,
                'type': tr.trailer_type,
                'label': f"{tr.license_plate} ({tr.trailer_type})"
            }
            for tr in Trailer.objects.all().order_by('license_plate')
        ]

        # 6. Hãng Tàu Biển
        shipping_lines = [
            {
                'id': sl.id,
                'code': sl.code,
                'name': sl.name,
                'free_dem_days': sl.free_dem_days,
                'free_det_days': sl.free_det_days,
                'label': f"{sl.code} - {sl.name}"
            }
            for sl in ShippingLine.objects.filter(is_active=True).order_by('code')
        ]

        # 7. Nhà Xe Thầu Phụ / 3PL
        subcontractors = [
            {
                'id': sc.id,
                'code': sc.code,
                'short_name': sc.short_name or sc.code,
                'name': sc.name,
                'phone': sc.phone,
                'contact_person': sc.contact_person,
                'label': f"[{sc.short_name or sc.code}] {sc.name}"
            }
            for sc in Subcontractor.objects.filter(is_active=True).order_by('name')
        ]

        # 8. Tuyến đường & Khu Vực (DriverSalaryTariff)
        routes = [
            {
                'id': dst.id,
                'area_group': dst.area_group,
                'route_name': dst.route_name,
                'estimated_km': dst.estimated_km or 0,
                'salary_rate': float(dst.salary_rate),
                'label': f"[{dst.area_group}] {dst.route_name}{f' (~{dst.estimated_km}km)' if dst.estimated_km else ''}"
            }
            for dst in DriverSalaryTariff.objects.all().order_by('area_group', 'route_name')
        ]

        # 9. Danh mục Biểu cước khách hàng (RouteTariff)
        customer_tariffs = [
            {
                'id': ct.id,
                'customer_id': ct.customer_id,
                'customer_name': ct.customer.name,
                'origin_zone': ct.origin_zone,
                'destination_zone': ct.destination_zone,
                'pickup_location': ct.pickup_location,
                'delivery_location': ct.delivery_location,
                'dropoff_location': ct.dropoff_location,
                'estimated_km': ct.estimated_km or 0,
                'freight_price': float(ct.freight_price),
                'driver_trip_pay': float(ct.driver_trip_pay),
                'toll_standard_fee': float(ct.toll_standard_fee or 0),
                'label': f"{ct.customer.name}: {ct.pickup_location} ➔ {ct.delivery_location}{f' (~{ct.estimated_km}km)' if ct.estimated_km else ''}"
            }
            for ct in RouteTariff.objects.select_related('customer').all().order_by('customer__name', 'pickup_location')
        ]

        return Response({
            'customers': customers,
            'customer_tariffs': customer_tariffs,
            'locations': {
                'all': all_locations,
                'ports': ports,
                'icds': icds,
                'depots': depots,
                'warehouses': warehouses,
                'pickup_options': ports + icds + depots,
                'warehouse_options': warehouses,
                'dropoff_options': depots + ports + icds,
            },
            'drivers': drivers,
            'vehicles': vehicles,
            'trailers': trailers,
            'shipping_lines': shipping_lines,
            'subcontractors': subcontractors,
            'container_types': container_types,
            'routes': routes,
        })

# ==============================================================================
# 1. DANH MỤC ĐỊA ĐIỂM / CẢNG / DEPOT / KHO BÃI
# ==============================================================================
class LocationListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        l_type = request.GET.get('type', '').strip()
        qs = Location.objects.all()
        if q:
            qs = qs.filter(Q(code__icontains=q) | Q(name__icontains=q) | Q(address__icontains=q))
        if l_type and l_type != 'ALL':
            qs = qs.filter(location_type=l_type)

        data = []
        for item in qs:
            data.append({
                'id': item.id,
                'code': item.code,
                'name': item.name,
                'location_type': item.location_type,
                'location_type_label': item.get_location_type_display(),
                'address': item.address,
                'province': item.province,
                'contact_person': item.contact_person,
                'contact_phone': item.contact_phone,
                'notes': item.notes,
                'is_active': item.is_active,
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        code = data.get('code', '').strip().upper()
        name = data.get('name', '').strip()
        if not code or not name:
            return Response({'error': 'Mã và Tên địa điểm không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        if Location.objects.filter(code=code).exists():
            return Response({'error': f'Mã địa điểm [{code}] đã tồn tại trong hệ thống!'}, status=status.HTTP_400_BAD_REQUEST)

        location = Location.objects.create(
            code=code,
            name=name,
            location_type=data.get('location_type', LocationType.PORT),
            address=data.get('address', '').strip(),
            province=data.get('province', 'TP. Hồ Chí Minh').strip(),
            contact_person=data.get('contact_person', '').strip(),
            contact_phone=data.get('contact_phone', '').strip(),
            notes=data.get('notes', '').strip(),
            is_active=bool(data.get('is_active', True)),
        )
        return Response({
            'success': True,
            'message': f'Đã thêm mới địa điểm [{location.name}] thành công!',
            'id': location.id
        }, status=status.HTTP_201_CREATED)

class LocationDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        location = Location.objects.filter(id=pk).first()
        if not location:
            return Response({'error': 'Không tìm thấy địa điểm!'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'name' in data: location.name = data['name'].strip()
        if 'location_type' in data: location.location_type = data['location_type']
        if 'address' in data: location.address = data['address'].strip()
        if 'province' in data: location.province = data['province'].strip()
        if 'contact_person' in data: location.contact_person = data['contact_person'].strip()
        if 'contact_phone' in data: location.contact_phone = data['contact_phone'].strip()
        if 'notes' in data: location.notes = data['notes'].strip()
        if 'is_active' in data: location.is_active = bool(data['is_active'])
        location.save()

        return Response({'success': True, 'message': f'Đã cập nhật địa điểm [{location.name}] thành công!'})

    def delete(self, request, pk):
        location = Location.objects.filter(id=pk).first()
        if not location:
            return Response({'error': 'Không tìm thấy địa điểm!'}, status=status.HTTP_404_NOT_FOUND)
        location.delete() # Soft delete
        return Response({'success': True, 'message': f'Đã xóa địa điểm [{location.name}].'})

# ==============================================================================
# 2. DANH MỤC QUY CÁCH CONTAINER & XE TẢI
# ==============================================================================
class ContainerTypeListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        qs = ContainerType.objects.all()
        if q:
            qs = qs.filter(Q(code__icontains=q) | Q(name__icontains=q))

        data = []
        for item in qs:
            data.append({
                'id': item.id,
                'code': item.code,
                'name': item.name,
                'category': item.category,
                'category_label': item.get_category_display(),
                'teu_factor': float(item.teu_factor),
                'max_payload_kg': item.max_payload_kg,
                'cbm_capacity': float(item.cbm_capacity),
                'is_active': item.is_active,
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        code = data.get('code', '').strip().upper()
        name = data.get('name', '').strip()
        if not code or not name:
            return Response({'error': 'Mã và tên quy cách không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        if ContainerType.objects.filter(code=code).exists():
            return Response({'error': f'Quy cách [{code}] đã tồn tại!'}, status=status.HTTP_400_BAD_REQUEST)

        cont = ContainerType.objects.create(
            code=code,
            name=name,
            category=data.get('category', ContainerCategory.CONTAINER),
            teu_factor=float(data.get('teu_factor', 1.0)),
            max_payload_kg=int(data.get('max_payload_kg', 30000)),
            cbm_capacity=float(data.get('cbm_capacity', 67.0)),
            is_active=bool(data.get('is_active', True)),
        )
        return Response({'success': True, 'message': f'Đã thêm quy cách [{cont.code}] thành công!', 'id': cont.id}, status=status.HTTP_201_CREATED)

class ContainerTypeDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        item = ContainerType.objects.filter(id=pk).first()
        if not item:
            return Response({'error': 'Không tìm thấy quy cách!'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        if 'name' in data: item.name = data['name'].strip()
        if 'category' in data: item.category = data['category']
        if 'teu_factor' in data: item.teu_factor = float(data['teu_factor'])
        if 'max_payload_kg' in data: item.max_payload_kg = int(data['max_payload_kg'])
        if 'cbm_capacity' in data: item.cbm_capacity = float(data['cbm_capacity'])
        if 'is_active' in data: item.is_active = bool(data['is_active'])
        item.save()
        return Response({'success': True, 'message': f'Đã cập nhật quy cách [{item.code}] thành công!'})

    def delete(self, request, pk):
        item = ContainerType.objects.filter(id=pk).first()
        if not item:
            return Response({'error': 'Không tìm thấy quy cách!'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response({'success': True, 'message': f'Đã xóa quy cách [{item.code}].'})

# ==============================================================================
# 3. DANH MỤC KHOẢN MỤC CHI PHÍ
# ==============================================================================
class ExpenseItemListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        group = request.GET.get('group', '').strip()
        qs = ExpenseItem.objects.all()
        if q:
            qs = qs.filter(Q(code__icontains=q) | Q(name__icontains=q))
        if group and group != 'ALL':
            qs = qs.filter(group_type=group)

        data = []
        for item in qs:
            data.append({
                'id': item.id,
                'code': item.code,
                'name': item.name,
                'group_type': item.group_type,
                'group_type_label': item.get_group_type_display(),
                'default_amount': float(item.default_amount),
                'requires_invoice': item.requires_invoice,
                'notes': item.notes,
                'is_active': item.is_active,
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        code = data.get('code', '').strip().upper()
        name = data.get('name', '').strip()
        if not code or not name:
            return Response({'error': 'Mã và Tên khoản chi không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        if ExpenseItem.objects.filter(code=code).exists():
            return Response({'error': f'Mã khoản chi [{code}] đã tồn tại!'}, status=status.HTTP_400_BAD_REQUEST)

        exp = ExpenseItem.objects.create(
            code=code,
            name=name,
            group_type=data.get('group_type', ExpenseCategoryGroup.TOLL),
            default_amount=int(data.get('default_amount', 0)),
            requires_invoice=bool(data.get('requires_invoice', False)),
            notes=data.get('notes', '').strip(),
            is_active=bool(data.get('is_active', True)),
        )
        return Response({'success': True, 'message': f'Đã thêm khoản chi [{exp.name}] thành công!', 'id': exp.id}, status=status.HTTP_201_CREATED)

class ExpenseItemDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        item = ExpenseItem.objects.filter(id=pk).first()
        if not item:
            return Response({'error': 'Không tìm thấy khoản chi!'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        if 'name' in data: item.name = data['name'].strip()
        if 'group_type' in data: item.group_type = data['group_type']
        if 'default_amount' in data: item.default_amount = int(data['default_amount'])
        if 'requires_invoice' in data: item.requires_invoice = bool(data['requires_invoice'])
        if 'notes' in data: item.notes = data['notes'].strip()
        if 'is_active' in data: item.is_active = bool(data['is_active'])
        item.save()
        return Response({'success': True, 'message': f'Đã cập nhật khoản chi [{item.name}] thành công!'})

    def delete(self, request, pk):
        item = ExpenseItem.objects.filter(id=pk).first()
        if not item:
            return Response({'error': 'Không tìm thấy khoản chi!'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response({'success': True, 'message': f'Đã xóa khoản chi [{item.name}].'})

# ==============================================================================
# 4. DANH MỤC KHÁCH HÀNG (CRUD TẬP TRUNG)
# ==============================================================================
class CustomerMasterListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        qs = Customer.objects.all()
        if q:
            qs = qs.filter(Q(code__icontains=q) | Q(name__icontains=q) | Q(short_name__icontains=q) | Q(tax_code__icontains=q))

        data = []
        for c in qs:
            data.append({
                'id': c.id,
                'code': c.code,
                'name': c.name,
                'short_name': c.short_name,
                'tax_code': c.tax_code,
                'address': c.address,
                'contact_person': c.contact_person,
                'phone': c.phone,
                'notes': c.notes,
                'tariffs_count': c.tariffs.count(),
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        name = data.get('name', '').strip()
        short_name = data.get('short_name', '').strip()
        code = data.get('code', '').strip().upper()
        if not name:
            return Response({'error': 'Tên khách hàng không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)
        if not code:
            code = f"KH_{Customer.objects.count() + 1:03d}"

        if Customer.objects.filter(code=code).exists():
            return Response({'error': f'Mã khách hàng [{code}] đã tồn tại!'}, status=status.HTTP_400_BAD_REQUEST)

        cust = Customer.objects.create(
            code=code,
            name=name,
            short_name=short_name,
            tax_code=data.get('tax_code', '').strip(),
            address=data.get('address', '').strip(),
            contact_person=data.get('contact_person', '').strip(),
            phone=data.get('phone', '').strip(),
            notes=data.get('notes', '').strip(),
        )
        return Response({'success': True, 'message': f'Đã thêm khách hàng [{cust.name}] thành công!', 'id': cust.id}, status=status.HTTP_201_CREATED)

class CustomerMasterDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        cust = Customer.objects.filter(id=pk).first()
        if not cust:
            return Response({'error': 'Không tìm thấy khách hàng!'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        if 'name' in data: cust.name = data['name'].strip()
        if 'short_name' in data: cust.short_name = data['short_name'].strip()
        if 'tax_code' in data: cust.tax_code = data['tax_code'].strip()
        if 'address' in data: cust.address = data['address'].strip()
        if 'contact_person' in data: cust.contact_person = data['contact_person'].strip()
        if 'phone' in data: cust.phone = data['phone'].strip()
        if 'notes' in data: cust.notes = data['notes'].strip()
        cust.save()
        return Response({'success': True, 'message': f'Đã cập nhật thông tin khách hàng [{cust.name}]!'})

    def delete(self, request, pk):
        cust = Customer.objects.filter(id=pk).first()
        if not cust:
            return Response({'error': 'Không tìm thấy khách hàng!'}, status=status.HTTP_404_NOT_FOUND)
        cust.delete()
        return Response({'success': True, 'message': f'Đã xóa khách hàng [{cust.name}].'})

# ==============================================================================
# 5. DANH MỤC BIỂU CƯỚC TUYẾN ĐƯỜNG (CRUD TẬP TRUNG)
# ==============================================================================
class TariffMasterListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        cust_id = request.GET.get('customer_id')
        qs = RouteTariff.objects.select_related('customer').all()
        if q:
            qs = qs.filter(Q(pickup_location__icontains=q) | Q(delivery_location__icontains=q) | Q(customer__name__icontains=q))
        if cust_id:
            qs = qs.filter(customer_id=cust_id)

        data = []
        for t in qs:
            data.append({
                'id': t.id,
                'customer_id': t.customer.id,
                'customer_name': t.customer.name,
                'origin_zone': t.origin_zone or '',
                'destination_zone': t.destination_zone or '',
                'estimated_km': t.estimated_km or 0,
                'pickup_location': t.pickup_location,
                'delivery_location': t.delivery_location,
                'dropoff_location': t.dropoff_location,
                'container_size': t.container_size,
                'freight_price': float(t.freight_price),
                'driver_trip_pay': float(t.driver_trip_pay),
                'toll_standard_fee': float(getattr(t, 'toll_standard_fee', 0) or 0),
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        cust_id = data.get('customer_id')
        customer = Customer.objects.filter(id=cust_id).first() if cust_id else Customer.objects.first()
        if not customer:
            return Response({'error': 'Vui lòng chọn khách hàng!'}, status=status.HTTP_400_BAD_REQUEST)

        tariff = RouteTariff.objects.create(
            customer=customer,
            origin_zone=data.get('origin_zone', '').strip(),
            destination_zone=data.get('destination_zone', '').strip(),
            estimated_km=int(data.get('estimated_km') or 0),
            pickup_location=data.get('pickup_location', '').strip().upper(),
            delivery_location=data.get('delivery_location', '').strip().upper(),
            dropoff_location=data.get('dropoff_location', '').strip().upper(),
            container_size=data.get('container_size', '40HC').strip(),
            freight_price=int(data.get('freight_price', 0)),
            driver_trip_pay=int(data.get('driver_trip_pay', 500000)),
            toll_standard_fee=int(data.get('toll_standard_fee', 0)),
        )
        return Response({'success': True, 'message': 'Đã thêm biểu cước tuyến đường thành công!', 'id': tariff.id}, status=status.HTTP_201_CREATED)

class TariffMasterDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        tariff = RouteTariff.objects.filter(id=pk).first()
        if not tariff:
            return Response({'error': 'Không tìm thấy biểu cước!'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        if 'customer_id' in data:
            cust = Customer.objects.filter(id=data['customer_id']).first()
            if cust: tariff.customer = cust
        if 'origin_zone' in data: tariff.origin_zone = data['origin_zone'].strip()
        if 'destination_zone' in data: tariff.destination_zone = data['destination_zone'].strip()
        if 'estimated_km' in data: tariff.estimated_km = int(data['estimated_km'] or 0)
        if 'pickup_location' in data: tariff.pickup_location = data['pickup_location'].strip().upper()
        if 'delivery_location' in data: tariff.delivery_location = data['delivery_location'].strip().upper()
        if 'dropoff_location' in data: tariff.dropoff_location = data['dropoff_location'].strip().upper()
        if 'container_size' in data: tariff.container_size = data['container_size'].strip()
        if 'freight_price' in data: tariff.freight_price = int(data['freight_price'])
        if 'driver_trip_pay' in data: tariff.driver_trip_pay = int(data['driver_trip_pay'])
        if 'toll_standard_fee' in data: tariff.toll_standard_fee = int(data['toll_standard_fee'])
        tariff.save()
        return Response({'success': True, 'message': 'Đã cập nhật biểu cước thành công!'})

    def delete(self, request, pk):
        tariff = RouteTariff.objects.filter(id=pk).first()
        if not tariff:
            return Response({'error': 'Không tìm thấy biểu cước!'}, status=status.HTTP_404_NOT_FOUND)
        tariff.delete()
        return Response({'success': True, 'message': 'Đã xóa biểu cước.'})

# ==============================================================================
# 6. DANH MỤC PHƯƠNG TIỆN & RƠ-MOÓC (CRUD TẬP TRUNG)
# ==============================================================================
class VehicleMasterListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        ownership = request.GET.get('ownership', '').strip()
        qs = Vehicle.objects.select_related('current_driver', 'subcontractor').all()
        if q:
            qs = qs.filter(Q(license_plate__icontains=q) | Q(brand__icontains=q))
        if ownership and ownership != 'ALL':
            qs = qs.filter(ownership_type=ownership)

        data = []
        for v in qs:
            data.append({
                'id': v.id,
                'license_plate': v.license_plate,
                'vehicle_type': v.vehicle_type,
                'vehicle_type_label': v.get_vehicle_type_display(),
                'ownership_type': v.ownership_type,
                'ownership_type_label': v.get_ownership_type_display(),
                'brand': v.brand,
                'payload_capacity_kg': v.payload_capacity_kg,
                'registration_expiry': v.registration_expiry.strftime('%d/%m/%Y') if v.registration_expiry else '-',
                'insurance_expiry': v.insurance_expiry.strftime('%d/%m/%Y') if v.insurance_expiry else '-',
                'next_maintenance_date': v.next_maintenance_date.strftime('%d/%m/%Y') if v.next_maintenance_date else '-',
                'current_driver_id': v.current_driver_id,
                'driver_name': (v.current_driver.nickname or v.current_driver.full_name) if v.current_driver else '-',
                'subcontractor_id': v.subcontractor_id,
                'subcontractor_name': (v.subcontractor.short_name or v.subcontractor.name) if v.subcontractor else '-',
                'status': v.status,
                'status_label': v.get_status_display(),
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        plate = data.get('license_plate', '').strip().upper()
        if not plate:
            return Response({'error': 'Biển số xe không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        if Vehicle.objects.filter(license_plate=plate).exists():
            return Response({'error': f'Xe biển số [{plate}] đã tồn tại!'}, status=status.HTTP_400_BAD_REQUEST)

        import datetime
        reg_expiry = data.get('registration_expiry')
        if reg_expiry:
            try:
                if '/' in reg_expiry:
                    reg_expiry = datetime.datetime.strptime(reg_expiry, '%d/%m/%Y').date()
                else:
                    reg_expiry = datetime.datetime.strptime(reg_expiry, '%Y-%m-%d').date()
            except ValueError:
                reg_expiry = datetime.date.today() + datetime.timedelta(days=180)
        else:
            reg_expiry = datetime.date.today() + datetime.timedelta(days=180)

        ins_expiry = data.get('insurance_expiry')
        if ins_expiry:
            try:
                if '/' in ins_expiry:
                    ins_expiry = datetime.datetime.strptime(ins_expiry, '%d/%m/%Y').date()
                else:
                    ins_expiry = datetime.datetime.strptime(ins_expiry, '%Y-%m-%d').date()
            except ValueError:
                ins_expiry = None

        maint_date = data.get('next_maintenance_date')
        if maint_date:
            try:
                if '/' in maint_date:
                    maint_date = datetime.datetime.strptime(maint_date, '%d/%m/%Y').date()
                else:
                    maint_date = datetime.datetime.strptime(maint_date, '%Y-%m-%d').date()
            except ValueError:
                maint_date = None

        driver_id = data.get('current_driver_id')
        driver = Employee.objects.filter(id=driver_id).first() if driver_id else None
        subcontractor_id = data.get('subcontractor_id')
        subcontractor = Subcontractor.objects.filter(id=subcontractor_id).first() if subcontractor_id else None
        ownership = data.get('ownership_type', VehicleOwnership.OWNED)

        veh = Vehicle.objects.create(
            license_plate=plate,
            vehicle_type=data.get('vehicle_type', VehicleType.TRACTOR),
            ownership_type=ownership,
            subcontractor=subcontractor if ownership == VehicleOwnership.SUBCONTRACTOR else None,
            brand=data.get('brand', 'Freightliner').strip(),
            payload_capacity_kg=int(data.get('payload_capacity_kg', 30000)),
            registration_expiry=reg_expiry,
            insurance_expiry=ins_expiry,
            next_maintenance_date=maint_date,
            current_driver=driver,
            status=data.get('status', VehicleStatus.IDLE),
        )
        return Response({'success': True, 'message': f'Đã thêm xe [{veh.license_plate}] thành công!', 'id': veh.id}, status=status.HTTP_201_CREATED)

class VehicleMasterDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        veh = Vehicle.objects.filter(id=pk).first()
        if not veh:
            return Response({'error': 'Không tìm thấy xe!'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        if 'brand' in data: veh.brand = data['brand'].strip()
        if 'vehicle_type' in data: veh.vehicle_type = data['vehicle_type']
        if 'ownership_type' in data: veh.ownership_type = data['ownership_type']
        if 'payload_capacity_kg' in data: veh.payload_capacity_kg = int(data['payload_capacity_kg'])
        if 'status' in data: veh.status = data['status']
        if 'current_driver_id' in data:
            d_id = data['current_driver_id']
            veh.current_driver = Employee.objects.filter(id=d_id).first() if d_id else None
        if 'subcontractor_id' in data:
            s_id = data['subcontractor_id']
            veh.subcontractor = Subcontractor.objects.filter(id=s_id).first() if s_id else None
        if veh.ownership_type != VehicleOwnership.SUBCONTRACTOR:
            veh.subcontractor = None

        import datetime
        if 'registration_expiry' in data and data['registration_expiry']:
            try:
                val = data['registration_expiry']
                veh.registration_expiry = datetime.datetime.strptime(val, '%d/%m/%Y').date() if '/' in val else datetime.datetime.strptime(val, '%Y-%m-%d').date()
            except ValueError:
                pass
        if 'insurance_expiry' in data:
            val = data['insurance_expiry']
            if val:
                try:
                    veh.insurance_expiry = datetime.datetime.strptime(val, '%d/%m/%Y').date() if '/' in val else datetime.datetime.strptime(val, '%Y-%m-%d').date()
                except ValueError:
                    pass
            else:
                veh.insurance_expiry = None
        if 'next_maintenance_date' in data:
            val = data['next_maintenance_date']
            if val:
                try:
                    veh.next_maintenance_date = datetime.datetime.strptime(val, '%d/%m/%Y').date() if '/' in val else datetime.datetime.strptime(val, '%Y-%m-%d').date()
                except ValueError:
                    pass
            else:
                veh.next_maintenance_date = None

        veh.save()
        return Response({'success': True, 'message': f'Đã cập nhật xe [{veh.license_plate}]!'})

    def delete(self, request, pk):
        veh = Vehicle.objects.filter(id=pk).first()
        if not veh:
            return Response({'error': 'Không tìm thấy xe!'}, status=status.HTTP_404_NOT_FOUND)
        veh.delete()
        return Response({'success': True, 'message': f'Đã xóa xe [{veh.license_plate}].'})

# ==============================================================================
# 7. DANH MỤC BIỂU PHÍ LƯƠNG CHUYẾN TÀI XẾ (DRIVER SALARY TARIFFS)
# ==============================================================================
class DriverSalaryTariffListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        area = request.GET.get('area', '').strip()
        qs = DriverSalaryTariff.objects.all()
        if q:
            qs = qs.filter(Q(route_name__icontains=q) | Q(area_group__icontains=q) | Q(notes__icontains=q) | Q(pickup_drop_area__icontains=q))
        if area and area != 'ALL':
            qs = qs.filter(area_group=area)

        data = []
        for t in qs:
            data.append({
                'id': t.id,
                'area_group': t.area_group,
                'route_name': t.route_name,
                'pickup_drop_area': t.pickup_drop_area,
                'estimated_km': t.estimated_km or 0,
                'salary_rate': float(t.salary_rate),
                'notes': t.notes,
                'is_active': t.is_active,
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        route_name = data.get('route_name', '').strip()
        area_group = data.get('area_group', 'Khu Vực Bình Dương').strip()
        pickup_drop = data.get('pickup_drop_area', 'Cát Lái, SPITC, Thủ Đức, Tân Vạn, Sóng Thần, VICT, Q4, Q7').strip()
        salary_rate = int(data.get('salary_rate', 600000))
        estimated_km = int(data.get('estimated_km') or 0)
        if not route_name:
            return Response({'error': 'Tên tuyến / KCN không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        tariff = DriverSalaryTariff.objects.create(
            area_group=area_group,
            route_name=route_name,
            pickup_drop_area=pickup_drop or 'Cát Lái, SPITC, Thủ Đức, Tân Vạn, Sóng Thần, VICT, Q4, Q7',
            estimated_km=estimated_km,
            salary_rate=salary_rate,
            notes=data.get('notes', '').strip(),
            is_active=bool(data.get('is_active', True)),
        )
        return Response({'success': True, 'message': f'Đã thêm tuyến lương [{tariff.route_name}] thành công!', 'id': tariff.id}, status=status.HTTP_201_CREATED)

class DriverSalaryTariffDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        tariff = DriverSalaryTariff.objects.filter(id=pk).first()
        if not tariff:
            return Response({'error': 'Không tìm thấy tuyến lương!'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        if 'route_name' in data: tariff.route_name = data['route_name'].strip()
        if 'area_group' in data: tariff.area_group = data['area_group'].strip()
        if 'pickup_drop_area' in data: tariff.pickup_drop_area = data['pickup_drop_area'].strip()
        if 'estimated_km' in data and data['estimated_km'] is not None: tariff.estimated_km = int(data['estimated_km'] or 0)
        if 'salary_rate' in data: tariff.salary_rate = int(data['salary_rate'])
        if 'notes' in data: tariff.notes = data['notes'].strip()
        if 'is_active' in data: tariff.is_active = bool(data['is_active'])
        tariff.save()
        return Response({'success': True, 'message': f'Đã cập nhật tuyến lương [{tariff.route_name}] thành công!'})

    def delete(self, request, pk):
        tariff = DriverSalaryTariff.objects.filter(id=pk).first()
        if not tariff:
            return Response({'error': 'Không tìm thấy tuyến lương!'}, status=status.HTTP_404_NOT_FOUND)
        tariff.delete()
        return Response({'success': True, 'message': f'Đã xóa tuyến lương [{tariff.route_name}].'})

# ==============================================================================
# 8. DANH MỤC PHỤ CẤP CẢNG XA & KIỂM HÓA (DRIVER ALLOWANCES)
# ==============================================================================
class DriverAllowanceListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        cat = request.GET.get('category', '').strip()
        qs = DriverAllowanceCatalog.objects.all()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(code__icontains=q) | Q(notes__icontains=q))
        if cat and cat != 'ALL':
            qs = qs.filter(category=cat)

        data = []
        for a in qs:
            data.append({
                'id': a.id,
                'code': a.code,
                'name': a.name,
                'category': a.category,
                'category_label': a.get_category_display(),
                'amount': float(a.amount),
                'notes': a.notes,
                'is_active': a.is_active,
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        code = data.get('code', '').strip().upper()
        name = data.get('name', '').strip()
        amount = int(data.get('amount', 0))
        if not code or not name:
            return Response({'error': 'Mã và Tên phụ cấp không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        if DriverAllowanceCatalog.objects.filter(code=code).exists():
            return Response({'error': f'Mã phụ cấp [{code}] đã tồn tại!'}, status=status.HTTP_400_BAD_REQUEST)

        allowance = DriverAllowanceCatalog.objects.create(
            code=code,
            name=name,
            category=data.get('category', AllowanceCategory.PORT),
            amount=amount,
            notes=data.get('notes', '').strip(),
            is_active=bool(data.get('is_active', True)),
        )
        return Response({'success': True, 'message': f'Đã thêm phụ cấp [{allowance.name}] thành công!', 'id': allowance.id}, status=status.HTTP_201_CREATED)

class DriverAllowanceDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        item = DriverAllowanceCatalog.objects.filter(id=pk).first()
        if not item:
            return Response({'error': 'Không tìm thấy phụ cấp!'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        if 'name' in data: item.name = data['name'].strip()
        if 'category' in data: item.category = data['category']
        if 'amount' in data: item.amount = int(data['amount'])
        if 'notes' in data: item.notes = data['notes'].strip()
        if 'is_active' in data: item.is_active = bool(data['is_active'])
        item.save()
        return Response({'success': True, 'message': f'Đã cập nhật phụ cấp [{item.name}] thành công!'})

    def delete(self, request, pk):
        item = DriverAllowanceCatalog.objects.filter(id=pk).first()
        if not item:
            return Response({'error': 'Không tìm thấy phụ cấp!'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response({'success': True, 'message': f'Đã xóa phụ cấp [{item.name}].'})

# ==============================================================================
# 9. DANH MỤC HÃNG TÀU (SHIPPING LINES)
# ==============================================================================
class ShippingLineListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        qs = ShippingLine.objects.all()
        if q:
            qs = qs.filter(Q(code__icontains=q) | Q(name__icontains=q) | Q(notes__icontains=q))

        data = []
        for sl in qs:
            data.append({
                'id': sl.id,
                'code': sl.code,
                'name': sl.name,
                'contact_phone': sl.contact_phone,
                'contact_email': sl.contact_email,
                'website': sl.website,
                'free_dem_days': sl.free_dem_days,
                'free_det_days': sl.free_det_days,
                'notes': sl.notes,
                'is_active': sl.is_active,
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        code = data.get('code', '').strip().upper()
        name = data.get('name', '').strip()
        if not code or not name:
            return Response({'error': 'Mã và Tên hãng tàu không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        if ShippingLine.objects.filter(code=code).exists():
            return Response({'error': f'Mã hãng tàu [{code}] đã tồn tại trong hệ thống!'}, status=status.HTTP_400_BAD_REQUEST)

        sl = ShippingLine.objects.create(
            code=code,
            name=name,
            contact_phone=data.get('contact_phone', '').strip(),
            contact_email=data.get('contact_email', '').strip(),
            website=data.get('website', '').strip(),
            free_dem_days=int(data.get('free_dem_days', 7)),
            free_det_days=int(data.get('free_det_days', 5)),
            notes=data.get('notes', '').strip(),
            is_active=bool(data.get('is_active', True)),
        )
        return Response({
            'success': True,
            'message': f'Đã thêm hãng tàu [{sl.name}] thành công!',
            'id': sl.id
        }, status=status.HTTP_201_CREATED)

class ShippingLineDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        sl = ShippingLine.objects.filter(id=pk).first()
        if not sl:
            return Response({'error': 'Không tìm thấy hãng tàu!'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'name' in data: sl.name = data['name'].strip()
        if 'contact_phone' in data: sl.contact_phone = data['contact_phone'].strip()
        if 'contact_email' in data: sl.contact_email = data['contact_email'].strip()
        if 'website' in data: sl.website = data['website'].strip()
        if 'free_dem_days' in data: sl.free_dem_days = int(data['free_dem_days'])
        if 'free_det_days' in data: sl.free_det_days = int(data['free_det_days'])
        if 'notes' in data: sl.notes = data['notes'].strip()
        if 'is_active' in data: sl.is_active = bool(data['is_active'])
        sl.save()

        return Response({'success': True, 'message': f'Đã cập nhật hãng tàu [{sl.name}] thành công!'})

    def delete(self, request, pk):
        sl = ShippingLine.objects.filter(id=pk).first()
        if not sl:
            return Response({'error': 'Không tìm thấy hãng tàu!'}, status=status.HTTP_404_NOT_FOUND)
        sl.delete()
        return Response({'success': True, 'message': f'Đã xóa hãng tàu [{sl.name}].'})

# ==============================================================================
# 10. DANH MỤC RƠ-MOÓC (TRAILERS)
# ==============================================================================
class TrailerMasterListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        t_type = request.GET.get('trailer_type', '').strip()
        qs = Trailer.objects.all()
        if q:
            qs = qs.filter(Q(license_plate__icontains=q) | Q(brand__icontains=q) | Q(trailer_type__icontains=q))
        if t_type and t_type != 'ALL':
            qs = qs.filter(trailer_type=t_type)

        data = []
        for tr in qs:
            data.append({
                'id': tr.id,
                'license_plate': tr.license_plate,
                'trailer_type': tr.trailer_type,
                'brand': tr.brand,
                'payload_capacity_kg': tr.payload_capacity_kg,
                'registration_expiry': tr.registration_expiry.strftime('%d/%m/%Y') if tr.registration_expiry else '-',
                'status': tr.status,
                'is_registration_warning': tr.is_registration_warning,
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        plate = data.get('license_plate', '').strip().upper()
        if not plate:
            return Response({'error': 'Biển số rơ-moóc không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        if Trailer.objects.filter(license_plate=plate).exists():
            return Response({'error': f'Biển số moóc [{plate}] đã tồn tại trong hệ thống!'}, status=status.HTTP_400_BAD_REQUEST)

        reg_expiry = data.get('registration_expiry')
        if reg_expiry:
            from datetime import datetime
            try:
                if '/' in reg_expiry:
                    reg_expiry = datetime.strptime(reg_expiry, '%d/%m/%Y').date()
                else:
                    reg_expiry = datetime.strptime(reg_expiry, '%Y-%m-%d').date()
            except ValueError:
                reg_expiry = None

        tr = Trailer.objects.create(
            license_plate=plate,
            trailer_type=data.get('trailer_type', 'MOOC_XUONG_40').strip(),
            brand=data.get('brand', '').strip(),
            payload_capacity_kg=int(data.get('payload_capacity_kg', 32000)),
            registration_expiry=reg_expiry,
            status=data.get('status', 'IDLE').strip(),
        )
        return Response({
            'success': True,
            'message': f'Đã thêm rơ-moóc [{tr.license_plate}] thành công!',
            'id': tr.id
        }, status=status.HTTP_201_CREATED)

class TrailerMasterDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        tr = Trailer.objects.filter(id=pk).first()
        if not tr:
            return Response({'error': 'Không tìm thấy rơ-moóc!'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'trailer_type' in data: tr.trailer_type = data['trailer_type'].strip()
        if 'brand' in data: tr.brand = data['brand'].strip()
        if 'payload_capacity_kg' in data: tr.payload_capacity_kg = int(data['payload_capacity_kg'])
        if 'status' in data: tr.status = data['status'].strip()
        if 'registration_expiry' in data:
            reg_expiry = data['registration_expiry']
            if reg_expiry:
                from datetime import datetime
                try:
                    if '/' in reg_expiry:
                        tr.registration_expiry = datetime.strptime(reg_expiry, '%d/%m/%Y').date()
                    else:
                        tr.registration_expiry = datetime.strptime(reg_expiry, '%Y-%m-%d').date()
                except ValueError:
                    pass
        tr.save()

        return Response({'success': True, 'message': f'Đã cập nhật rơ-moóc [{tr.license_plate}] thành công!'})

    def delete(self, request, pk):
        tr = Trailer.objects.filter(id=pk).first()
        if not tr:
            return Response({'error': 'Không tìm thấy rơ-moóc!'}, status=status.HTTP_404_NOT_FOUND)
        tr.delete()
        return Response({'success': True, 'message': f'Đã xóa rơ-moóc [{tr.license_plate}].'})

# ==============================================================================
# 11. DANH MỤC NHÀ XE THẦU PHỤ / ĐỐI TÁC VẬN TẢI (SUBCONTRACTORS)
# ==============================================================================
class SubcontractorListCreateAPIView(MasterDataBaseAPIView):
    def get(self, request):
        q = request.GET.get('q', '').strip()
        qs = Subcontractor.objects.all()
        if q:
            qs = qs.filter(
                Q(code__icontains=q) |
                Q(name__icontains=q) |
                Q(contact_person__icontains=q) |
                Q(phone__icontains=q) |
                Q(tax_code__icontains=q)
            )

        data = []
        for sc in qs:
            data.append({
                'id': sc.id,
                'code': sc.code,
                'short_name': sc.short_name or sc.code,
                'name': sc.name,
                'tax_code': sc.tax_code,
                'contact_person': sc.contact_person,
                'phone': sc.phone,
                'address': sc.address,
                'bank_account_number': sc.bank_account_number,
                'bank_name': sc.bank_name,
                'bank_account_holder': sc.bank_account_holder,
                'notes': sc.notes,
                'is_active': sc.is_active,
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        code = data.get('code', '').strip().upper()
        name = data.get('name', '').strip()
        short_name = data.get('short_name', '').strip()
        if not name:
            return Response({'error': 'Tên nhà xe không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        if not code:
            import unidecode
            clean = unidecode.unidecode(name).upper().replace(' ', '_')
            import re
            clean = re.sub(r'[^A-Z0-9_]', '', clean)[:15]
            code = f"NX_{clean}"

        if not short_name:
            short_name = code

        if Subcontractor.objects.filter(code=code).exists():
            return Response({'error': f'Mã nhà xe [{code}] đã tồn tại trong hệ thống!'}, status=status.HTTP_400_BAD_REQUEST)

        sc = Subcontractor.objects.create(
            code=code,
            short_name=short_name,
            name=name,
            tax_code=data.get('tax_code', '').strip(),
            contact_person=data.get('contact_person', '').strip(),
            phone=data.get('phone', '').strip(),
            address=data.get('address', '').strip(),
            bank_account_number=data.get('bank_account_number', '').strip(),
            bank_name=data.get('bank_name', '').strip(),
            bank_account_holder=data.get('bank_account_holder', '').strip(),
            notes=data.get('notes', '').strip(),
            is_active=bool(data.get('is_active', True)),
        )
        return Response({
            'success': True,
            'message': f'Đã thêm nhà xe thầu phụ [{sc.name}] thành công!',
            'id': sc.id
        }, status=status.HTTP_201_CREATED)

class SubcontractorDetailAPIView(MasterDataBaseAPIView):
    def put(self, request, pk):
        sc = Subcontractor.objects.filter(id=pk).first()
        if not sc:
            return Response({'error': 'Không tìm thấy nhà xe thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'name' in data: sc.name = data['name'].strip()
        if 'short_name' in data: sc.short_name = data['short_name'].strip()
        if 'tax_code' in data: sc.tax_code = data['tax_code'].strip()
        if 'contact_person' in data: sc.contact_person = data['contact_person'].strip()
        if 'phone' in data: sc.phone = data['phone'].strip()
        if 'address' in data: sc.address = data['address'].strip()
        if 'bank_account_number' in data: sc.bank_account_number = data['bank_account_number'].strip()
        if 'bank_name' in data: sc.bank_name = data['bank_name'].strip()
        if 'bank_account_holder' in data: sc.bank_account_holder = data['bank_account_holder'].strip()
        if 'notes' in data: sc.notes = data['notes'].strip()
        if 'is_active' in data: sc.is_active = bool(data['is_active'])
        sc.save()

        return Response({'success': True, 'message': f'Đã cập nhật nhà xe thầu phụ [{sc.name}] thành công!'})

    def delete(self, request, pk):
        sc = Subcontractor.objects.filter(id=pk).first()
        if not sc:
            return Response({'error': 'Không tìm thấy nhà xe thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)
        sc.delete()
        return Response({'success': True, 'message': f'Đã xóa nhà xe thầu phụ [{sc.name}].'})

class SubcontractorFleetAPIView(MasterDataBaseAPIView):
    """
    API Lấy danh sách Toàn bộ Đội xe & Tài xế trực thuộc một Đối tác 3PL / Nhà xe Thầu phụ.
    Dành cho màn hình Điều Vận: Khi chọn 1 Đối tác 3PL, tự động tải xe và tài xế của đối tác đó.
    """
    def get(self, request, pk):
        sc = Subcontractor.objects.filter(id=pk, is_deleted=False).first()
        if not sc:
            return Response({'error': 'Không tìm thấy nhà xe thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)

        vehicles = Vehicle.objects.filter(
            subcontractor=sc,
            is_deleted=False
        ).order_by('license_plate')

        drivers = SubcontractorDriver.objects.filter(
            subcontractor=sc,
            is_deleted=False,
            is_active=True
        ).order_by('full_name')

        return Response({
            'success': True,
            'subcontractor': {
                'id': sc.id,
                'code': sc.code,
                'short_name': sc.short_name or sc.code,
                'name': sc.name,
                'phone': sc.phone,
                'contact_person': sc.contact_person,
                'tax_code': sc.tax_code,
            },
            'vehicles': [
                {
                    'id': v.id,
                    'license_plate': v.license_plate,
                    'vehicle_type': v.get_vehicle_type_display(),
                    'vehicle_type_code': v.vehicle_type,
                    'payload_capacity_kg': v.payload_capacity_kg,
                    'brand': v.brand,
                    'status': v.status,
                }
                for v in vehicles
            ],
            'drivers': [
                {
                    'id': d.id,
                    'full_name': d.full_name,
                    'phone': d.phone,
                    'license_number': d.license_number,
                    'notes': d.notes,
                }
                for d in drivers
            ]
        })

class SubcontractorVehicleListCreateAPIView(MasterDataBaseAPIView):
    """
    API Danh sách & Thêm mới Phương tiện thuộc Nhà xe Thầu phụ (Xe Bạn).
    """
    def get(self, request, pk):
        sc = Subcontractor.objects.filter(id=pk, is_deleted=False).first()
        if not sc:
            return Response({'error': 'Không tìm thấy nhà xe thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)
        vehicles = Vehicle.objects.filter(subcontractor=sc, is_deleted=False).order_by('license_plate')
        return Response({
            'results': [
                {
                    'id': v.id,
                    'license_plate': v.license_plate,
                    'vehicle_type': v.get_vehicle_type_display(),
                    'vehicle_type_code': v.vehicle_type,
                    'brand': v.brand,
                    'payload_capacity_kg': v.payload_capacity_kg,
                    'status': v.status,
                    'status_label': v.get_status_display(),
                }
                for v in vehicles
            ],
            'total': len(vehicles)
        })

    def post(self, request, pk):
        sc = Subcontractor.objects.filter(id=pk, is_deleted=False).first()
        if not sc:
            return Response({'error': 'Không tìm thấy nhà xe thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        plate = data.get('license_plate', '').strip().upper()
        if not plate:
            return Response({'error': 'Biển số xe không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        payload = 30000
        if 'payload_capacity_kg' in data and data['payload_capacity_kg']:
            try:
                payload = int(str(data['payload_capacity_kg']).replace('.', '').replace(',', ''))
            except ValueError:
                payload = 30000

        veh = Vehicle.objects.filter(license_plate=plate).first()
        if veh:
            veh.subcontractor = sc
            veh.ownership_type = VehicleOwnership.SUBCONTRACTOR
            if 'vehicle_type' in data and data['vehicle_type']:
                veh.vehicle_type = data['vehicle_type']
            if payload:
                veh.payload_capacity_kg = payload
            if 'brand' in data and data['brand']:
                veh.brand = data['brand'].strip()
            veh.is_deleted = False
            veh.save()
            msg = f'Đã gán xe [{veh.license_plate}] cho nhà xe {sc.short_name or sc.name}!'
        else:
            veh = Vehicle.objects.create(
                license_plate=plate,
                vehicle_type=data.get('vehicle_type', VehicleType.TRACTOR),
                ownership_type=VehicleOwnership.SUBCONTRACTOR,
                subcontractor=sc,
                brand=data.get('brand', '').strip(),
                payload_capacity_kg=payload,
                status=VehicleStatus.IDLE,
            )
            msg = f'Đã thêm xe [{veh.license_plate}] vào đội xe của {sc.short_name or sc.name}!'

        return Response({
            'success': True,
            'message': msg,
            'vehicle': {
                'id': veh.id,
                'license_plate': veh.license_plate,
                'vehicle_type': veh.get_vehicle_type_display(),
                'payload_capacity_kg': veh.payload_capacity_kg,
            }
        }, status=status.HTTP_201_CREATED)


class SubcontractorVehicleDetailAPIView(MasterDataBaseAPIView):
    """
    API Sửa / Gỡ phương tiện khỏi Nhà xe Thầu phụ.
    """
    def put(self, request, pk, vehicle_id):
        sc = Subcontractor.objects.filter(id=pk, is_deleted=False).first()
        if not sc:
            return Response({'error': 'Không tìm thấy nhà xe thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)
        veh = Vehicle.objects.filter(id=vehicle_id, subcontractor=sc, is_deleted=False).first()
        if not veh:
            return Response({'error': 'Không tìm thấy xe thuộc nhà xe này!'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'license_plate' in data and data['license_plate'].strip():
            new_plate = data['license_plate'].strip().upper()
            existing = Vehicle.objects.filter(license_plate=new_plate, is_deleted=False).exclude(id=veh.id).first()
            if existing:
                return Response({'error': f'Biển số xe [{new_plate}] đã tồn tại trong hệ thống!'}, status=status.HTTP_400_BAD_REQUEST)
            veh.license_plate = new_plate

        if 'vehicle_type' in data and data['vehicle_type']:
            veh.vehicle_type = data['vehicle_type']

        if 'brand' in data:
            veh.brand = data['brand'].strip()

        if 'payload_capacity_kg' in data and data['payload_capacity_kg']:
            try:
                veh.payload_capacity_kg = int(str(data['payload_capacity_kg']).replace('.', '').replace(',', ''))
            except (ValueError, TypeError):
                pass

        veh.save()
        return Response({
            'success': True,
            'message': f'Đã cập nhật phương tiện [{veh.license_plate}] thành công!',
            'vehicle': {
                'id': veh.id,
                'license_plate': veh.license_plate,
                'vehicle_type': veh.get_vehicle_type_display(),
                'vehicle_type_code': veh.vehicle_type,
                'brand': veh.brand,
                'payload_capacity_kg': veh.payload_capacity_kg,
            }
        })

    def patch(self, request, pk, vehicle_id):
        return self.put(request, pk, vehicle_id)

    def delete(self, request, pk, vehicle_id):
        sc = Subcontractor.objects.filter(id=pk, is_deleted=False).first()
        if not sc:
            return Response({'error': 'Không tìm thấy nhà xe thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)
        veh = Vehicle.objects.filter(id=vehicle_id, subcontractor=sc).first()
        if not veh:
            return Response({'error': 'Không tìm thấy xe thuộc nhà xe này!'}, status=status.HTTP_404_NOT_FOUND)
        veh.subcontractor = None
        veh.save()
        return Response({'success': True, 'message': f'Đã gỡ xe [{veh.license_plate}] khỏi nhà xe {sc.short_name or sc.name}!'})


class SubcontractorDriverListCreateAPIView(MasterDataBaseAPIView):
    """
    API Danh sách & Thêm mới Tài xế trực thuộc một Đơn vị 3PL / Nhà xe Thầu phụ.
    """
    def get(self, request, pk):
        sc = Subcontractor.objects.filter(id=pk, is_deleted=False).first()
        if not sc:
            return Response({'error': 'Không tìm thấy nhà xe thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)

        drivers = SubcontractorDriver.objects.filter(subcontractor=sc, is_deleted=False).order_by('full_name')
        return Response({
            'results': [
                {
                    'id': d.id,
                    'subcontractor_id': sc.id,
                    'subcontractor_name': sc.name,
                    'full_name': d.full_name,
                    'phone': d.phone,
                    'license_number': d.license_number,
                    'notes': d.notes,
                    'is_active': d.is_active,
                    'created_at': d.created_at.strftime('%d/%m/%Y') if d.created_at else ''
                }
                for d in drivers
            ],
            'total': len(drivers)
        })

    def post(self, request, pk):
        sc = Subcontractor.objects.filter(id=pk, is_deleted=False).first()
        if not sc:
            return Response({'error': 'Không tìm thấy nhà xe thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        full_name = data.get('full_name', '').strip()
        phone = data.get('phone', '').strip()
        if not full_name:
            return Response({'error': 'Họ tên tài xế không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        driver = SubcontractorDriver.objects.create(
            subcontractor=sc,
            full_name=full_name,
            phone=phone,
            license_number=data.get('license_number', '').strip(),
            notes=data.get('notes', '').strip(),
            is_active=bool(data.get('is_active', True))
        )

        return Response({
            'success': True,
            'message': f'Đã thêm tài xế [{driver.full_name}] cho nhà xe {sc.name}!',
            'driver': {
                'id': driver.id,
                'full_name': driver.full_name,
                'phone': driver.phone,
                'license_number': driver.license_number
            }
        }, status=status.HTTP_201_CREATED)

class SubcontractorDriverDetailAPIView(MasterDataBaseAPIView):
    """
    API Sửa / Xóa Tài xế Thầu phụ.
    """
    def put(self, request, pk):
        driver = SubcontractorDriver.objects.filter(id=pk, is_deleted=False).first()
        if not driver:
            return Response({'error': 'Không tìm thấy tài xế thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'full_name' in data and data['full_name'].strip():
            driver.full_name = data['full_name'].strip()
        if 'phone' in data:
            driver.phone = data['phone'].strip()
        if 'license_number' in data:
            driver.license_number = data['license_number'].strip()
        if 'notes' in data:
            driver.notes = data['notes'].strip()
        if 'is_active' in data:
            driver.is_active = bool(data['is_active'])

        driver.save()
        return Response({
            'success': True,
            'message': f'Đã cập nhật thông tin tài xế [{driver.full_name}]!',
            'driver': {
                'id': driver.id,
                'full_name': driver.full_name,
                'phone': driver.phone,
                'license_number': driver.license_number,
                'is_active': driver.is_active
            }
        })

    def delete(self, request, pk):
        driver = SubcontractorDriver.objects.filter(id=pk, is_deleted=False).first()
        if not driver:
            return Response({'error': 'Không tìm thấy tài xế thầu phụ!'}, status=status.HTTP_404_NOT_FOUND)

        driver.delete()
        return Response({'success': True, 'message': f'Đã xóa tài xế [{driver.full_name}].'})

# ==============================================================================
# 12. KHAI BÁO THÔNG TIN CÔNG TY & HỆ THỐNG (COMPANY PROFILE & SYSTEM SETTINGS)
# ==============================================================================
class CompanyProfileAPIView(MasterDataBaseAPIView):
    """
    API Khai báo & Cập nhật Thông tin Công ty / Tham số Hệ thống Cài đặt.
    GET: Lấy thông tin công ty hiện tại.
    PUT / POST: Cập nhật thông tin công ty.
    """
    def get(self, request):
        company = CompanyProfile.get_default_company()
        c_dict = {
            'id': company.id,
            'company_name': company.company_name,
            'short_name': company.short_name,
            'tax_code': company.tax_code,
            'phone': company.phone,
            'email': company.email,
            'website': company.website,
            'address': company.address,
            'representative_name': company.representative_name,
            'representative_role': company.representative_role,
            'bank_account_number': company.bank_account_number,
            'bank_name': company.bank_name,
            'bank_branch': company.bank_branch,
            'operating_license': company.operating_license,
            'branch_name': company.branch_name,
            'branch_address': company.branch_address,
            'branch_phone': company.branch_phone,
            'fleet_yard_name': company.fleet_yard_name,
            'fleet_yard_address': company.fleet_yard_address,
            'fleet_yard_hotline': company.fleet_yard_hotline,
            'default_vat_rate': float(company.default_vat_rate),
            'fuel_reference_price': float(company.fuel_reference_price),
            'cbm_formula_divisor': company.cbm_formula_divisor,
            'logo_url': company.logo_url,
            'notes': company.notes,
            'is_default': company.is_default,
            'is_active': True,
            'updated_at': company.updated_at.strftime('%H:%M %d/%m/%Y') if company.updated_at else '-',
        }
        return Response({
            'success': True,
            'data': c_dict,
            'results': [c_dict],
            'items': [c_dict],
            'count': 1,
        })

    def put(self, request):
        return self._update_company(request)

    def post(self, request):
        return self._update_company(request)

    def _update_company(self, request):
        company = CompanyProfile.get_default_company()
        data = request.data
        if 'company_name' in data and data['company_name'].strip():
            company.company_name = data['company_name'].strip()
        if 'short_name' in data:
            company.short_name = data['short_name'].strip()
        if 'tax_code' in data:
            company.tax_code = data['tax_code'].strip()
        if 'phone' in data:
            company.phone = data['phone'].strip()
        if 'email' in data:
            company.email = data['email'].strip()
        if 'website' in data:
            company.website = data['website'].strip()
        if 'address' in data:
            company.address = data['address'].strip()
        if 'representative_name' in data:
            company.representative_name = data['representative_name'].strip()
        if 'representative_role' in data:
            company.representative_role = data['representative_role'].strip()
        if 'bank_account_number' in data:
            company.bank_account_number = data['bank_account_number'].strip()
        if 'bank_name' in data:
            company.bank_name = data['bank_name'].strip()
        if 'bank_branch' in data:
            company.bank_branch = data['bank_branch'].strip()
        if 'operating_license' in data:
            company.operating_license = data['operating_license'].strip()
        if 'branch_name' in data:
            company.branch_name = data['branch_name'].strip()
        if 'branch_address' in data:
            company.branch_address = data['branch_address'].strip()
        if 'branch_phone' in data:
            company.branch_phone = data['branch_phone'].strip()
        if 'fleet_yard_name' in data:
            company.fleet_yard_name = data['fleet_yard_name'].strip()
        if 'fleet_yard_address' in data:
            company.fleet_yard_address = data['fleet_yard_address'].strip()
        if 'fleet_yard_hotline' in data:
            company.fleet_yard_hotline = data['fleet_yard_hotline'].strip()
        if 'notes' in data:
            company.notes = data['notes'].strip()
        if 'default_vat_rate' in data and data['default_vat_rate'] is not None:
            try:
                company.default_vat_rate = float(data['default_vat_rate'])
            except (ValueError, TypeError):
                pass
        if 'fuel_reference_price' in data and data['fuel_reference_price'] is not None:
            try:
                company.fuel_reference_price = float(data['fuel_reference_price'])
            except (ValueError, TypeError):
                pass
        if 'cbm_formula_divisor' in data and data['cbm_formula_divisor'] is not None:
            try:
                company.cbm_formula_divisor = int(data['cbm_formula_divisor'])
            except (ValueError, TypeError):
                pass
        if 'logo_url' in data:
            company.logo_url = data['logo_url'].strip()

        company.save()

        return Response({
            'success': True,
            'message': 'Đã cập nhật thông tin công ty và cấu hình hệ thống thành công!',
            'data': {
                'id': company.id,
                'company_name': company.company_name,
                'short_name': company.short_name,
                'tax_code': company.tax_code,
                'phone': company.phone,
                'email': company.email,
                'website': company.website,
                'address': company.address,
                'representative_name': company.representative_name,
                'representative_role': company.representative_role,
                'bank_account_number': company.bank_account_number,
                'bank_name': company.bank_name,
                'bank_branch': company.bank_branch,
                'operating_license': company.operating_license,
                'branch_name': company.branch_name,
                'branch_address': company.branch_address,
                'branch_phone': company.branch_phone,
                'fleet_yard_name': company.fleet_yard_name,
                'fleet_yard_address': company.fleet_yard_address,
                'fleet_yard_hotline': company.fleet_yard_hotline,
                'default_vat_rate': float(company.default_vat_rate),
                'fuel_reference_price': float(company.fuel_reference_price),
                'cbm_formula_divisor': company.cbm_formula_divisor,
                'logo_url': company.logo_url,
                'notes': company.notes,
                'is_default': company.is_default,
                'updated_at': company.updated_at.strftime('%H:%M %d/%m/%Y') if company.updated_at else '-',
            }
        })


def _format_date_val(val):
    if not val:
        return ''
    if hasattr(val, 'strftime'):
        return val.strftime('%Y-%m-%d')
    return str(val)


class OpeningBalanceListCreateAPIView(MasterDataBaseAPIView):
    """
    API Quản lý Số dư đầu kỳ Kế toán (Opening Balances - TT 200 & TT 133):
    - GET: Lấy danh sách số dư, KPIs cân đối kế toán, danh mục tài khoản (COA), gợi ý đối tượng.
    - POST: Thêm mới bản ghi số dư đầu kỳ.
    """
    def get(self, request):
        category = request.query_params.get('category', '').strip()
        account_code = request.query_params.get('account_code', '').strip()
        search = request.query_params.get('search', '').strip()

        all_balances = OpeningBalance.objects.all()

        # Tính toán KPIs tổng quan theo chuẩn kế toán
        total_debit = 0
        total_credit = 0
        total_cash_bank = 0
        total_customer_ar = 0
        total_subcontractor_ap = 0
        total_driver_advance = 0
        total_dispatcher_fund = 0

        for b in all_balances:
            d_amt = float(b.debit_amount or (b.amount if b.is_debit else 0))
            c_amt = float(b.credit_amount or (b.amount if not b.is_debit else 0))
            total_debit += d_amt
            total_credit += c_amt

            ac = b.account_code or ''
            if ac.startswith('111') or ac.startswith('112'):
                total_cash_bank += (d_amt - c_amt)
            elif ac == '131':
                total_customer_ar += (d_amt - c_amt)
            elif ac == '331':
                total_subcontractor_ap += (c_amt - d_amt)
            elif ac == '141':
                if b.category == OpeningBalanceCategory.DISPATCHER_FUND:
                    total_dispatcher_fund += (d_amt - c_amt)
                else:
                    total_driver_advance += (d_amt - c_amt)

        filtered_qs = all_balances
        if category and category != 'ALL':
            filtered_qs = filtered_qs.filter(category=category)
        if account_code and account_code != 'ALL':
            filtered_qs = filtered_qs.filter(account_code=account_code)
        if search:
            filtered_qs = filtered_qs.filter(
                Q(entity_name__icontains=search) |
                Q(entity_code__icontains=search) |
                Q(account_code__icontains=search) |
                Q(account_name__icontains=search) |
                Q(bank_account_number__icontains=search) |
                Q(notes__icontains=search)
            )

        items = []
        for b in filtered_qs:
            items.append({
                'id': b.id,
                'account_code': b.account_code,
                'account_name': b.account_name,
                'bank_account_number': b.bank_account_number or '',
                'bank_name': b.bank_name or '',
                'category': b.category,
                'category_display': b.get_category_display(),
                'partner_type': b.partner_type,
                'entity_code': b.entity_code,
                'entity_name': b.entity_name,
                'opening_date': _format_date_val(b.opening_date),
                'fiscal_year': b.fiscal_year,
                'debit_amount': float(b.debit_amount or (b.amount if b.is_debit else 0)),
                'credit_amount': float(b.credit_amount or (b.amount if not b.is_debit else 0)),
                'amount': float(b.amount),
                'is_debit': b.is_debit,
                'notes': b.notes,
                'created_at': b.created_at.strftime('%d/%m/%Y %H:%M') if b.created_at else '',
            })

        # Danh mục Tài khoản Kế toán Chuẩn Thông tư
        account_charts = [
            {'code': c[0], 'label': c[1], 'name': ACCOUNT_NAME_MAP.get(c[0], c[1])}
            for c in ACCOUNT_CHART_CHOICES
        ]

        # Danh mục phân loại
        categories = [
            {'value': k, 'label': label}
            for k, label in OpeningBalanceCategory.choices
        ]

        # Gợi ý đối tượng từ dữ liệu hệ thống
        company = CompanyProfile.get_default_company()
        company_data = {
            'code': 'TVL',
            'name': company.short_name or company.company_name or 'TRIỀN VÕ LOGISTICS',
            'full_name': company.company_name or 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI TRIỀN VÕ',
            'bank_account_number': company.bank_account_number or '',
            'bank_name': company.bank_name or '',
        }
        customers = list(Customer.objects.all().order_by('name').values('code', 'name'))
        subcontractors = list(Subcontractor.objects.filter(is_active=True).order_by('name').values('code', 'name', 'bank_account_number', 'bank_name'))
        drivers = list(Employee.objects.filter(is_active=True, role='DRIVER').order_by('full_name').values('code', 'full_name', 'nickname'))
        if not drivers:
            drivers = list(Employee.objects.filter(is_active=True).order_by('full_name').values('code', 'full_name', 'nickname'))
        employees = list(Employee.objects.filter(is_active=True).order_by('role', 'full_name').values('code', 'full_name', 'nickname', 'role'))

        return Response({
            'success': True,
            'kpis': {
                'total_debit': total_debit,
                'total_credit': total_credit,
                'total_cash_bank': total_cash_bank,
                'total_customer_ar': total_customer_ar,
                'total_subcontractor_ap': total_subcontractor_ap,
                'total_driver_advance': total_driver_advance,
                'total_dispatcher_fund': total_dispatcher_fund,
                'total_records': all_balances.count(),
            },
            'items': items,
            'results': items,
            'account_charts': account_charts,
            'categories': categories,
            'suggestions': {
                'company': company_data,
                'customers': customers,
                'subcontractors': subcontractors,
                'drivers': drivers,
                'employees': employees,
            }
        })

    def post(self, request):
        data = request.data
        account_code = data.get('account_code', '1111').strip()
        account_name = data.get('account_name', '').strip()
        bank_account_number = data.get('bank_account_number', '').strip()
        bank_name = data.get('bank_name', '').strip()
        category = data.get('category', '').strip()
        partner_type = data.get('partner_type', 'INTERNAL').strip()
        entity_code = data.get('entity_code', '').strip()
        entity_name = data.get('entity_name', '').strip()
        opening_date = data.get('opening_date', '').strip()
        notes = data.get('notes', '').strip()

        debit_amount_raw = data.get('debit_amount', 0)
        credit_amount_raw = data.get('credit_amount', 0)
        amount_raw = data.get('amount', 0)
        is_debit = bool(data.get('is_debit', True))

        if not entity_name:
            return Response({'error': 'Tên đối tượng hoặc khoản mục là bắt buộc.'}, status=status.HTTP_400_BAD_REQUEST)
        if not opening_date:
            return Response({'error': 'Ngày chốt số dư đầu kỳ là bắt buộc.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            debit_amt = float(debit_amount_raw)
            credit_amt = float(credit_amount_raw)
            amt = float(amount_raw)
            if debit_amt < 0 or credit_amt < 0 or amt < 0:
                return Response({'error': 'Số tiền phải lớn hơn hoặc bằng 0.'}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Số tiền không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)

        # Quyết định Nợ/Có
        if debit_amt > 0 and credit_amt == 0:
            final_amount = debit_amt
            final_is_debit = True
        elif credit_amt > 0 and debit_amt == 0:
            final_amount = credit_amt
            final_is_debit = False
        else:
            final_amount = amt
            final_is_debit = is_debit
            debit_amt = final_amount if final_is_debit else 0
            credit_amt = final_amount if not final_is_debit else 0

        if not account_name:
            account_name = ACCOUNT_NAME_MAP.get(account_code, account_code)

        record = OpeningBalance.objects.create(
            account_code=account_code,
            account_name=account_name,
            bank_account_number=bank_account_number,
            bank_name=bank_name,
            category=category or OpeningBalanceCategory.CASH_FUND,
            partner_type=partner_type,
            entity_code=entity_code,
            entity_name=entity_name,
            opening_date=opening_date,
            debit_amount=debit_amt,
            credit_amount=credit_amt,
            amount=final_amount,
            is_debit=final_is_debit,
            notes=notes,
        )

        return Response({
            'success': True,
            'message': f'Đã ghi nhận số dư đầu kỳ cho "{record.entity_name}" ({record.account_code}) thành công!',
            'data': {
                'id': record.id,
                'account_code': record.account_code,
                'account_name': record.account_name,
                'bank_account_number': record.bank_account_number,
                'bank_name': record.bank_name,
                'category': record.category,
                'category_display': record.get_category_display(),
                'entity_code': record.entity_code,
                'entity_name': record.entity_name,
                'opening_date': _format_date_val(record.opening_date),
                'debit_amount': float(record.debit_amount),
                'credit_amount': float(record.credit_amount),
                'amount': float(record.amount),
                'is_debit': record.is_debit,
                'notes': record.notes,
            }
        }, status=status.HTTP_201_CREATED)


class OpeningBalanceDetailAPIView(MasterDataBaseAPIView):
    """API Cập nhật & Xóa Số dư đầu kỳ Kế toán."""
    def get(self, request, pk):
        try:
            b = OpeningBalance.objects.get(pk=pk)
        except OpeningBalance.DoesNotExist:
            return Response({'error': 'Không tìm thấy bản ghi số dư.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': True,
            'data': {
                'id': b.id,
                'account_code': b.account_code,
                'account_name': b.account_name,
                'bank_account_number': b.bank_account_number,
                'bank_name': b.bank_name,
                'category': b.category,
                'category_display': b.get_category_display(),
                'partner_type': b.partner_type,
                'entity_code': b.entity_code,
                'entity_name': b.entity_name,
                'opening_date': _format_date_val(b.opening_date),
                'debit_amount': float(b.debit_amount),
                'credit_amount': float(b.credit_amount),
                'amount': float(b.amount),
                'is_debit': b.is_debit,
                'notes': b.notes,
            }
        })

    def put(self, request, pk):
        try:
            record = OpeningBalance.objects.get(pk=pk)
        except OpeningBalance.DoesNotExist:
            return Response({'error': 'Không tìm thấy bản ghi số dư.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'account_code' in data:
            record.account_code = data['account_code'].strip()
            record.account_name = ACCOUNT_NAME_MAP.get(record.account_code, record.account_code)
        if 'account_name' in data and data['account_name'].strip():
            record.account_name = data['account_name'].strip()
        if 'bank_account_number' in data:
            record.bank_account_number = data['bank_account_number'].strip()
        if 'bank_name' in data:
            record.bank_name = data['bank_name'].strip()
        if 'category' in data and data['category'] in [c[0] for c in OpeningBalanceCategory.choices]:
            record.category = data['category']
        if 'partner_type' in data:
            record.partner_type = data['partner_type'].strip()
        if 'entity_code' in data:
            record.entity_code = data['entity_code'].strip()
        if 'entity_name' in data and data['entity_name'].strip():
            record.entity_name = data['entity_name'].strip()
        if 'opening_date' in data and data['opening_date'].strip():
            record.opening_date = data['opening_date'].strip()
        if 'notes' in data:
            record.notes = data['notes'].strip()

        # Cập nhật số tiền Nợ / Có
        if 'debit_amount' in data or 'credit_amount' in data:
            try:
                d_amt = float(data.get('debit_amount', 0))
                c_amt = float(data.get('credit_amount', 0))
                record.debit_amount = d_amt
                record.credit_amount = c_amt
                if d_amt > 0:
                    record.amount = d_amt
                    record.is_debit = True
                else:
                    record.amount = c_amt
                    record.is_debit = False
            except (ValueError, TypeError):
                pass
        elif 'amount' in data:
            try:
                amt = float(data['amount'])
                if amt >= 0:
                    record.amount = amt
                    if 'is_debit' in data:
                        record.is_debit = bool(data['is_debit'])
                    if record.is_debit:
                        record.debit_amount = amt
                        record.credit_amount = 0
                    else:
                        record.credit_amount = amt
                        record.debit_amount = 0
            except (ValueError, TypeError):
                pass

        record.save()
        return Response({
            'success': True,
            'message': 'Đã cập nhật số dư đầu kỳ kế toán thành công!',
            'data': {
                'id': record.id,
                'account_code': record.account_code,
                'account_name': record.account_name,
                'bank_account_number': record.bank_account_number,
                'bank_name': record.bank_name,
                'category': record.category,
                'category_display': record.get_category_display(),
                'entity_code': record.entity_code,
                'entity_name': record.entity_name,
                'opening_date': _format_date_val(record.opening_date),
                'debit_amount': float(record.debit_amount),
                'credit_amount': float(record.credit_amount),
                'amount': float(record.amount),
                'is_debit': record.is_debit,
                'notes': record.notes,
            }
        })

    def delete(self, request, pk):
        try:
            record = OpeningBalance.objects.get(pk=pk)
        except OpeningBalance.DoesNotExist:
            return Response({'error': 'Không tìm thấy bản ghi số dư.'}, status=status.HTTP_404_NOT_FOUND)

        record.delete()
        return Response({
            'success': True,
            'message': f'Đã xóa số dư đầu kỳ "{record.entity_name}".'
        })




# =====================================================================
# TÍNH NĂNG XUẤT MẪU & NHẬP EXCEL DANH MỤC BAN ĐẦU (MASTER DATA IMPORT/EXPORT)
# =====================================================================

class MasterDataExportTemplateAPIView(APIView):
    """API xuất file Excel mẫu chuẩn hóa để người dùng nhập liệu ban đầu."""
    permission_classes = [CanManageMasterData]

    def get(self, request):
        catalog = request.GET.get('catalog', '').strip().lower()
        if not catalog or catalog not in CATALOG_REGISTRY:
            return Response(
                {'error': f"Danh mục '{catalog}' không hợp lệ. Các danh mục hỗ trợ: {', '.join(CATALOG_REGISTRY.keys())}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            wb, filename = generate_catalog_template(catalog)
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            wb.save(response)
            return response
        except Exception as e:
            return Response({'error': f'Lỗi xuất file mẫu: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MasterDataExportDataAPIView(APIView):
    """API xuất toàn bộ dữ liệu danh mục hiện hành ra file Excel."""
    permission_classes = [CanManageMasterData]

    def get(self, request):
        catalog = request.GET.get('catalog', '').strip().lower()
        if not catalog or catalog not in CATALOG_REGISTRY:
            return Response(
                {'error': f"Danh mục '{catalog}' không hợp lệ. Các danh mục hỗ trợ: {', '.join(CATALOG_REGISTRY.keys())}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            wb, filename = generate_catalog_data_export(catalog)
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            wb.save(response)
            return response
        except Exception as e:
            return Response({'error': f'Lỗi xuất dữ liệu: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MasterDataImportAPIView(APIView):
    """API nhập danh mục từ tệp Excel chuẩn hóa."""
    permission_classes = [CanManageMasterData]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        catalog = request.data.get('catalog', '').strip().lower()
        if not catalog or catalog not in CATALOG_REGISTRY:
            return Response(
                {'success': False, 'message': f"Danh mục '{catalog}' không hợp lệ. Các danh mục hỗ trợ: {', '.join(CATALOG_REGISTRY.keys())}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'success': False, 'message': 'Vui lòng chọn tệp Excel (.xlsx) để tải lên.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not (file_obj.name.endswith('.xlsx') or file_obj.name.endswith('.xls')):
            return Response(
                {'success': False, 'message': 'Định dạng tệp không hợp lệ. Hệ thống chỉ hỗ trợ tệp Excel (.xlsx).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        update_existing = str(request.data.get('update_existing', 'true')).lower() in ['true', '1', 'yes']

        result = process_catalog_import(
            catalog_key=catalog,
            file_obj=file_obj,
            update_existing=update_existing,
            user=request.user
        )

        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_400_BAD_REQUEST)
