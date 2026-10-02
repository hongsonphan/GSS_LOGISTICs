from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from core.permissions import CanManageMasterData

class MasterDataBaseAPIView(APIView):
    permission_classes = [CanManageMasterData]


from apps.master_data.models import (
    Location, LocationType,
    ContainerType, ContainerCategory,
    ExpenseItem, ExpenseCategoryGroup,
    DriverSalaryTariff, DriverAllowanceCatalog, AllowanceCategory,
    ShippingLine, Subcontractor
)
from apps.customers.models import Customer, RouteTariff
from apps.fleet.models import Vehicle, Trailer, VehicleType, VehicleOwnership, VehicleStatus
from apps.personnel.models import Employee

class MasterDataSummaryAPIView(APIView):
    """Thống kê tổng quan số lượng bản ghi của các danh mục cốt lõi."""
    def get(self, request):
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
                'label': f"{c.name} ({c.code})" if c.code else c.name
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
                'name': sc.name,
                'phone': sc.phone,
                'contact_person': sc.contact_person,
                'label': f"{sc.name} ({sc.code})"
            }
            for sc in Subcontractor.objects.filter(is_active=True).order_by('name')
        ]

        # 8. Tuyến đường & Khu Vực (DriverSalaryTariff & RouteTariff)
        routes = [
            {
                'id': dst.id,
                'area_group': dst.area_group,
                'route_name': dst.route_name,
                'salary_rate': float(dst.salary_rate),
                'label': f"[{dst.area_group}] {dst.route_name}"
            }
            for dst in DriverSalaryTariff.objects.all().order_by('area_group', 'route_name')
        ]

        return Response({
            'customers': customers,
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
            qs = qs.filter(Q(code__icontains=q) | Q(name__icontains=q) | Q(tax_code__icontains=q))

        data = []
        for c in qs:
            data.append({
                'id': c.id,
                'code': c.code,
                'name': c.name,
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
        qs = Vehicle.objects.select_related('current_driver').all()
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
                'driver_name': v.current_driver.nickname or v.current_driver.full_name if v.current_driver else '-',
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
        if not reg_expiry:
            reg_expiry = (datetime.date.today() + datetime.timedelta(days=180)).strftime('%Y-%m-%d')

        veh = Vehicle.objects.create(
            license_plate=plate,
            vehicle_type=data.get('vehicle_type', VehicleType.TRACTOR),
            ownership_type=data.get('ownership_type', VehicleOwnership.OWNED),
            brand=data.get('brand', 'Freightliner').strip(),
            payload_capacity_kg=int(data.get('payload_capacity_kg', 30000)),
            registration_expiry=reg_expiry,
            status=VehicleStatus.IDLE,
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
            qs = qs.filter(Q(route_name__icontains=q) | Q(area_group__icontains=q) | Q(notes__icontains=q))
        if area and area != 'ALL':
            qs = qs.filter(area_group=area)

        data = []
        for t in qs:
            data.append({
                'id': t.id,
                'area_group': t.area_group,
                'route_name': t.route_name,
                'pickup_drop_area': t.pickup_drop_area,
                'salary_rate': float(t.salary_rate),
                'notes': t.notes,
                'is_active': t.is_active,
            })
        return Response({'results': data, 'total': len(data)})

    def post(self, request):
        data = request.data
        route_name = data.get('route_name', '').strip()
        area_group = data.get('area_group', 'Khu Vực Bình Dương').strip()
        salary_rate = int(data.get('salary_rate', 600000))
        if not route_name:
            return Response({'error': 'Tên tuyến / KCN không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        tariff = DriverSalaryTariff.objects.create(
            area_group=area_group,
            route_name=route_name,
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
        if not name:
            return Response({'error': 'Tên nhà xe không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        if not code:
            import unidecode
            clean = unidecode.unidecode(name).upper().replace(' ', '_')
            import re
            clean = re.sub(r'[^A-Z0-9_]', '', clean)[:15]
            code = f"NX_{clean}"

        if Subcontractor.objects.filter(code=code).exists():
            return Response({'error': f'Mã nhà xe [{code}] đã tồn tại trong hệ thống!'}, status=status.HTTP_400_BAD_REQUEST)

        sc = Subcontractor.objects.create(
            code=code,
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

