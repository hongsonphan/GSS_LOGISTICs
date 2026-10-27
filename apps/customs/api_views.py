import os
from datetime import datetime
from django.utils import timezone
from django.db.models import Q, Sum, Count
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

from core.models import SoftDeleteModel
from core.permissions import IsCustomsOrDirector
from apps.customers.models import Customer, BookingOrder
from apps.dispatch.models import DispatchTrip
from apps.billing.models import TripExpense
from apps.master_data.models import ExpenseItem
from .models import CustomsDeclaration, CustomsLane, CustomsDeclarationStatus, CustomsDirection


class CustomsDeclarationListCreateAPIView(APIView):
    """
    API Quản lý Danh Sách và Đăng Ký Tờ Khai Hải Quan VNACCS/VCIS.
    Hỗ trợ lọc đa tiêu chí, tính toán KPI phân luồng và thuế XNK.
    """
    permission_classes = [IsCustomsOrDirector]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        q = request.GET.get('q', '').strip()
        lane = request.GET.get('lane', '').strip()
        stat = request.GET.get('status', '').strip()
        direction = request.GET.get('direction', '').strip()
        customer_id = request.GET.get('customer_id', '').strip()
        is_tax_paid = request.GET.get('is_tax_paid', '').strip()
        from_date = request.GET.get('from_date') or request.GET.get('start_date')
        to_date = request.GET.get('to_date') or request.GET.get('end_date')

        qs = CustomsDeclaration.objects.select_related('customer', 'booking_order', 'dispatch_trip').all()

        if from_date:
            try:
                fd = datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                qs = qs.filter(Q(declaration_date__gte=fd) | Q(declaration_date__isnull=True, created_at__date__gte=fd))
            except Exception:
                pass
        if to_date:
            try:
                td = datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                qs = qs.filter(Q(declaration_date__lte=td) | Q(declaration_date__isnull=True, created_at__date__lte=td))
            except Exception:
                pass

        if q:
            qs = qs.filter(
                Q(declaration_number__icontains=q) |
                Q(bill_of_lading__icontains=q) |
                Q(container_numbers__icontains=q) |
                Q(customer__name__icontains=q) |
                Q(customs_office_name__icontains=q)
            )
        if lane:
            qs = qs.filter(customs_lane=lane.upper())
        if stat:
            qs = qs.filter(status=stat.upper())
        if direction:
            qs = qs.filter(direction=direction.upper())
        if customer_id and customer_id.isdigit():
            qs = qs.filter(customer_id=int(customer_id))
        if is_tax_paid != '':
            qs = qs.filter(is_tax_paid=(is_tax_paid.lower() in ['true', '1']))

        # Tính toán KPIs tổng quan theo tập dữ liệu đã lọc
        all_qs = qs
        green_count = all_qs.filter(customs_lane=CustomsLane.GREEN).count()
        yellow_count = all_qs.filter(customs_lane=CustomsLane.YELLOW).count()
        red_count = all_qs.filter(customs_lane=CustomsLane.RED).count()
        total_count = all_qs.count()
        cleared_count = all_qs.filter(status__in=[CustomsDeclarationStatus.CLEARED, CustomsDeclarationStatus.RELEASED]).count()
        
        unpaid_tax_qs = all_qs.filter(is_tax_paid=False)
        unpaid_tax_total = unpaid_tax_qs.aggregate(total=Sum('tax_amount_vnd'))['total'] or 0

        declarations_data = []
        for d in qs:
            declarations_data.append({
                'id': d.id,
                'declaration_number': d.declaration_number,
                'declaration_date': d.declaration_date.strftime('%Y-%m-%d') if d.declaration_date else '',
                'customer_id': d.customer_id,
                'customer_name': d.customer.name,
                'customs_office_code': d.customs_office_code,
                'customs_office_name': d.customs_office_name,
                'declaration_type': d.declaration_type,
                'direction': d.direction,
                'direction_display': d.get_direction_display(),
                'customs_lane': d.customs_lane,
                'customs_lane_display': d.get_customs_lane_display(),
                'status': d.status,
                'status_display': d.get_status_display(),
                'bill_of_lading': d.bill_of_lading,
                'container_numbers': d.container_numbers,
                'booking_order_id': d.booking_order_id,
                'booking_order_number': d.booking_order.booking_number if d.booking_order else '',
                'dispatch_trip_id': d.dispatch_trip_id,
                'trip_code': d.dispatch_trip.trip_code if d.dispatch_trip else '',
                'driver_name': d.dispatch_trip.driver.nickname if d.dispatch_trip and d.dispatch_trip.driver else '',
                'vehicle_plate': d.dispatch_trip.vehicle.license_plate if d.dispatch_trip and d.dispatch_trip.vehicle else '',
                'tax_amount_vnd': float(d.tax_amount_vnd),
                'is_tax_paid': d.is_tax_paid,
                'customs_service_fee': float(d.customs_service_fee),
                'reimbursable_fee': float(d.reimbursable_fee),
                'inspection_notes': d.inspection_notes,
                'document_url': d.declaration_document.url if d.declaration_document else None,
                'created_at': d.created_at.strftime('%Y-%m-%d %H:%M') if d.created_at else ''
            })

        export_count = all_qs.filter(direction=CustomsDirection.EXPORT).count()
        import_count = all_qs.filter(direction=CustomsDirection.IMPORT).count()
        pending_clearance = max(0, total_count - cleared_count)
        clearance_rate = round(cleared_count / total_count * 100, 1) if total_count > 0 else 0
        green_rate = round(green_count / total_count * 100, 1) if total_count > 0 else 0

        card_total = {
            'total': total_count,
            'line_1': f"Xuất: {export_count} · Nhập: {import_count}",
            'line_2': f"Thông quan: {cleared_count} · Chờ: {pending_clearance}"
        }
        card_green = {
            'total': green_count,
            'line_1': f"{green_count} Tờ tự động thông quan",
            'line_2': f"Tỷ lệ luồng {green_rate}%"
        }
        card_yellow = {
            'total': yellow_count,
            'line_1': f"{yellow_count} Tờ đang xét hồ sơ",
            'line_2': f"Check C/O, HĐ, B/L"
        }
        card_red = {
            'total': red_count,
            'line_1': f"{red_count} Tờ kiểm hóa / soi chiếu",
            'line_2': f"Mở cont kiểm thực tế"
        }
        card_clearance = {
            'total': f"{clearance_rate}%",
            'line_1': f"{cleared_count} Tờ đã thông quan",
            'line_2': f"Thuế treo: {unpaid_tax_qs.count()} Tờ ({int(unpaid_tax_total):,} đ)".replace(',', '.')
        }

        return Response({
            'stats': {
                'total': total_count,
                'green_count': green_count,
                'yellow_count': yellow_count,
                'red_count': red_count,
                'cleared_count': cleared_count,
                'clearance_rate': clearance_rate,
                'unpaid_tax_count': unpaid_tax_qs.count(),
                'unpaid_tax_total': float(unpaid_tax_total),
                # Chuẩn 5 Thẻ Hải Quan
                'card_total': card_total,
                'card_green': card_green,
                'card_yellow': card_yellow,
                'card_red': card_red,
                'card_clearance': card_clearance,
            },
            'results': declarations_data,
            'total': len(declarations_data)
        })

    def post(self, request):
        data = request.data
        decl_no = data.get('declaration_number', '').strip()
        if not decl_no:
            return Response({'error': 'Số tờ khai Hải quan không được để trống!'}, status=status.HTTP_400_BAD_REQUEST)

        # Kiểm tra trùng số tờ khai
        if CustomsDeclaration.objects.filter(declaration_number=decl_no).exists():
            return Response({'error': f'Số tờ khai {decl_no} đã tồn tại trong hệ thống!'}, status=status.HTTP_400_BAD_REQUEST)

        customer_id = data.get('customer_id')
        customer = None
        if customer_id and str(customer_id).isdigit():
            customer = Customer.objects.filter(id=int(customer_id)).first()
        elif data.get('customer_name'):
            customer = Customer.objects.filter(name__icontains=data.get('customer_name').strip()).first()

        if not customer:
            customer = Customer.objects.first()
            if not customer:
                return Response({'error': 'Vui lòng chọn khách hàng hợp lệ!'}, status=status.HTTP_400_BAD_REQUEST)

        # Liên kết Booking Order nếu có
        booking_order = None
        booking_order_id = data.get('booking_order_id')
        if booking_order_id and str(booking_order_id).isdigit():
            booking_order = BookingOrder.objects.filter(id=int(booking_order_id)).first()

        # Liên kết Chuyến xe nếu có
        dispatch_trip = None
        trip_code = data.get('trip_code', '').strip()
        trip_id = data.get('dispatch_trip_id')
        if trip_id and str(trip_id).isdigit():
            dispatch_trip = DispatchTrip.objects.filter(id=int(trip_id)).first()
        elif trip_code:
            dispatch_trip = DispatchTrip.objects.filter(trip_code__iexact=trip_code).first()

        # Xử lý tệp đính kèm tờ khai
        uploaded_doc = request.FILES.get('declaration_document') or request.FILES.get('document')

        decl_date_str = data.get('declaration_date')
        decl_date = timezone.now().date()
        if decl_date_str:
            try:
                decl_date = datetime.strptime(decl_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        parse_bool = lambda v: v is True or str(v).strip().lower() in ('true', '1', 'yes')

        declaration = CustomsDeclaration.objects.create(
            declaration_number=decl_no,
            declaration_date=decl_date,
            customer=customer,
            customs_office_code=data.get('customs_office_code', '02CI').strip().upper(),
            customs_office_name=data.get('customs_office_name', 'Chi cục HQ Cửa khẩu Cảng Sài Gòn KV4 (Cát Lái)').strip(),
            declaration_type=data.get('declaration_type', 'A11').strip().upper(),
            direction=data.get('direction', CustomsDirection.IMPORT).strip().upper(),
            customs_lane=data.get('customs_lane', CustomsLane.GREEN).strip().upper(),
            status=data.get('status', CustomsDeclarationStatus.SUBMITTED).strip().upper(),
            bill_of_lading=data.get('bill_of_lading', '').strip().upper(),
            container_numbers=data.get('container_numbers', '').strip().upper(),
            booking_order=booking_order,
            dispatch_trip=dispatch_trip,
            tax_amount_vnd=int(float(data.get('tax_amount_vnd') or 0)),
            is_tax_paid=parse_bool(data.get('is_tax_paid', False)),
            customs_service_fee=int(float(data.get('customs_service_fee') or 0)),
            reimbursable_fee=int(float(data.get('reimbursable_fee') or 0)),
            inspection_notes=data.get('inspection_notes', '').strip(),
            declaration_document=uploaded_doc
        )

        # Tự động đồng bộ chi phí chi hộ kiểm hóa vào chuyến xe (TripExpense) nếu có liên kết
        if dispatch_trip and declaration.reimbursable_fee > 0:
            expense_item, _ = ExpenseItem.objects.get_or_create(
                code='CUSTOMS_INSPECTION_FEE',
                defaults={'name': 'Lệ phí & Chi phí Kiểm hóa Hải quan', 'group_type': 'OTHER', 'requires_invoice': False}
            )
            TripExpense.objects.create(
                trip=dispatch_trip,
                item=expense_item,
                amount=declaration.reimbursable_fee,
                notes=f"Chi hộ kiểm hóa Tờ khai HQ: {declaration.declaration_number}",
                is_on_behalf_of_customer=True,
                reimbursement_status='PENDING'
            )

        return Response({
            'success': True,
            'message': f'Đã đăng ký tờ khai hải quan {declaration.declaration_number} thành công!',
            'id': declaration.id
        }, status=status.HTTP_201_CREATED)


class CustomsDeclarationDetailAPIView(APIView):
    """API Xem chi tiết, cập nhật và xóa tờ khai hải quan."""
    permission_classes = [IsCustomsOrDirector]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk):
        return CustomsDeclaration.objects.filter(id=pk).first()

    def get(self, request, pk):
        d = self.get_object(pk)
        if not d:
            return Response({'error': 'Không tìm thấy tờ khai hải quan!'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'id': d.id,
            'declaration_number': d.declaration_number,
            'declaration_date': d.declaration_date.strftime('%Y-%m-%d') if d.declaration_date else '',
            'customer_id': d.customer_id,
            'customer_name': d.customer.name,
            'customs_office_code': d.customs_office_code,
            'customs_office_name': d.customs_office_name,
            'declaration_type': d.declaration_type,
            'direction': d.direction,
            'direction_display': d.get_direction_display(),
            'customs_lane': d.customs_lane,
            'customs_lane_display': d.get_customs_lane_display(),
            'status': d.status,
            'status_display': d.get_status_display(),
            'bill_of_lading': d.bill_of_lading,
            'container_numbers': d.container_numbers,
            'booking_order_id': d.booking_order_id,
            'booking_order_number': d.booking_order.booking_number if d.booking_order else '',
            'dispatch_trip_id': d.dispatch_trip_id,
            'trip_code': d.dispatch_trip.trip_code if d.dispatch_trip else '',
            'tax_amount_vnd': float(d.tax_amount_vnd),
            'is_tax_paid': d.is_tax_paid,
            'customs_service_fee': float(d.customs_service_fee),
            'reimbursable_fee': float(d.reimbursable_fee),
            'inspection_notes': d.inspection_notes,
            'document_url': d.declaration_document.url if d.declaration_document else None,
        })

    def put(self, request, pk):
        d = self.get_object(pk)
        if not d:
            return Response({'error': 'Không tìm thấy tờ khai hải quan!'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        parse_bool = lambda v: v is True or str(v).strip().lower() in ('true', '1', 'yes')

        if 'customer_id' in data and str(data['customer_id']).isdigit():
            c = Customer.objects.filter(id=int(data['customer_id'])).first()
            if c: d.customer = c
        if 'declaration_date' in data and data['declaration_date']:
            try:
                d.declaration_date = datetime.strptime(data['declaration_date'], '%Y-%m-%d').date()
            except ValueError:
                pass
        if 'customs_office_code' in data: d.customs_office_code = data['customs_office_code'].strip().upper()
        if 'customs_office_name' in data: d.customs_office_name = data['customs_office_name'].strip()
        if 'declaration_type' in data: d.declaration_type = data['declaration_type'].strip().upper()
        if 'direction' in data: d.direction = data['direction'].strip().upper()
        if 'customs_lane' in data: d.customs_lane = data['customs_lane'].strip().upper()
        if 'status' in data: d.status = data['status'].strip().upper()
        if 'bill_of_lading' in data: d.bill_of_lading = data['bill_of_lading'].strip().upper()
        if 'container_numbers' in data: d.container_numbers = data['container_numbers'].strip().upper()
        if 'tax_amount_vnd' in data: d.tax_amount_vnd = int(float(data['tax_amount_vnd'] or 0))
        if 'is_tax_paid' in data: d.is_tax_paid = parse_bool(data['is_tax_paid'])
        if 'customs_service_fee' in data: d.customs_service_fee = int(float(data['customs_service_fee'] or 0))
        if 'reimbursable_fee' in data: d.reimbursable_fee = int(float(data['reimbursable_fee'] or 0))
        if 'inspection_notes' in data: d.inspection_notes = data['inspection_notes'].strip()

        # File upload update
        new_doc = request.FILES.get('declaration_document') or request.FILES.get('document')
        if new_doc:
            d.declaration_document = new_doc

        # Liên kết chuyến xe
        if 'dispatch_trip_id' in data:
            if data['dispatch_trip_id'] and str(data['dispatch_trip_id']).isdigit():
                d.dispatch_trip = DispatchTrip.objects.filter(id=int(data['dispatch_trip_id'])).first()
            else:
                d.dispatch_trip = None
        elif 'trip_code' in data and data['trip_code']:
            d.dispatch_trip = DispatchTrip.objects.filter(trip_code__iexact=data['trip_code'].strip()).first()

        d.save()
        return Response({'success': True, 'message': 'Đã cập nhật tờ khai hải quan thành công!'})

    def delete(self, request, pk):
        d = self.get_object(pk)
        if not d:
            return Response({'error': 'Không tìm thấy tờ khai hải quan!'}, status=status.HTTP_404_NOT_FOUND)
        
        # Soft delete theo chuẩn dự án (No Hard Delete on Legal Audit Trails)
        d.delete()
        return Response({'success': True, 'message': 'Đã xóa tờ khai hải quan vào thùng rác.'})


class CustomsQuickActionAPIView(APIView):
    """API Thao tác nhanh 1-chạm (Đổi luồng, Thông quan, Đổi trạng thái nộp thuế)."""
    permission_classes = [IsCustomsOrDirector]
    def post(self, request, pk):
        declaration = CustomsDeclaration.objects.filter(id=pk).first()
        if not declaration:
            return Response({'error': 'Không tìm thấy tờ khai hải quan!'}, status=status.HTTP_404_NOT_FOUND)

        raw_action = str(request.data.get('action') or '').strip().lower()

        if raw_action in ['set_lane', 'lane']:
            lane = request.data.get('lane', '').upper()
            if lane in [CustomsLane.GREEN, CustomsLane.YELLOW, CustomsLane.RED]:
                declaration.customs_lane = lane
                # Nếu đổi sang luồng xanh và trạng thái đang chờ, có thể tự động chuyển trạng thái
                if lane == CustomsLane.GREEN and declaration.status in [CustomsDeclarationStatus.DRAFT, CustomsDeclarationStatus.SUBMITTED]:
                    declaration.status = CustomsDeclarationStatus.CLEARED
                declaration.save()
                return Response({'success': True, 'message': f'Đã đổi phân luồng thành {declaration.get_customs_lane_display()}'})
            return Response({'error': 'Mã luồng không hợp lệ!'}, status=status.HTTP_400_BAD_REQUEST)

        elif raw_action in ['set_cleared', 'clear', 'cleared']:
            declaration.status = CustomsDeclarationStatus.CLEARED
            declaration.save()
            return Response({'success': True, 'message': f'Tờ khai {declaration.declaration_number} đã được xác nhận THÔNG QUAN!'})

        elif raw_action in ['set_released', 'release', 'released']:
            declaration.status = CustomsDeclarationStatus.RELEASED
            declaration.save()
            return Response({'success': True, 'message': f'Tờ khai {declaration.declaration_number} đã QUA KHU VỰC GIÁM SÁT!'})

        elif raw_action in ['toggle_tax', 'tax']:
            declaration.is_tax_paid = not declaration.is_tax_paid
            declaration.save()
            msg = 'ĐÃ HOÀN TẤT NỘP THUẾ' if declaration.is_tax_paid else 'CHƯA NỘP THUẾ'
            return Response({'success': True, 'message': f'Trạng thái thuế đã chuyển: {msg}', 'is_tax_paid': declaration.is_tax_paid})

        return Response({'error': 'Hành động không hợp lệ!'}, status=status.HTTP_400_BAD_REQUEST)


class CustomsExportExcelAPIView(APIView):
    """API Xuất Sổ Bảng Kê Tờ Khai Hải Quan & Theo Dõi Thông Quan Excel."""
    permission_classes = [IsCustomsOrDirector]
    def get(self, request):
        q = request.GET.get('q', '').strip()
        lane = request.GET.get('lane', '').strip()
        stat = request.GET.get('status', '').strip()

        qs = CustomsDeclaration.objects.select_related('customer', 'dispatch_trip').all()
        if q:
            qs = qs.filter(
                Q(declaration_number__icontains=q) |
                Q(bill_of_lading__icontains=q) |
                Q(container_numbers__icontains=q) |
                Q(customer__name__icontains=q)
            )
        if lane:
            qs = qs.filter(customs_lane=lane.upper())
        if stat:
            qs = qs.filter(status=stat.upper())

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Theo Dõi Tờ Khai HQ"
        ws.views.sheetView[0].showGridLines = True

        # Header Title
        ws.merge_cells('A1:L1')
        title_cell = ws['A1']
        title_cell.value = "BẢNG KÊ THEO DÕI TỜ KHAI HẢI QUAN & THÔNG QUAN ĐIỆN TỬ (VNACCS/VCIS)"
        title_cell.font = Font(name='Arial', size=14, bold=True, color='0F766E')
        title_cell.alignment = Alignment(horizontal='center', vertical='center')

        ws.merge_cells('A2:L2')
        sub_cell = ws['A2']
        sub_cell.value = f"Ngày xuất báo cáo: {timezone.now().strftime('%d/%m/%Y %H:%M')} | BIM LOGISTICS TMS PLATFORM"
        sub_cell.font = Font(name='Arial', size=9, italic=True, color='64748B')
        sub_cell.alignment = Alignment(horizontal='center', vertical='center')

        headers = [
            "STT", "Số Tờ Khai (VNACCS)", "Ngày ĐK", "Khách Hàng / Chủ Hàng", 
            "Loại Hình", "Chi Cục Hải Quan", "Phân Luồng", "Trạng Thái", 
            "Số B/L", "Số Cont / Chì", "Tiền Thuế (VNĐ)", "Tình Trạng Thuế"
        ]

        header_fill = PatternFill(start_color="115E59", end_color="115E59", fill_type="solid")
        header_font = Font(name='Arial', size=10, bold=True, color="FFFFFF")
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )

        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col_idx, value=h)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = thin_border

        ws.row_dimensions[4].height = 28

        for row_idx, d in enumerate(qs, 5):
            ws.cell(row=row_idx, column=1, value=row_idx - 4).alignment = Alignment(horizontal='center')
            ws.cell(row=row_idx, column=2, value=d.declaration_number).alignment = Alignment(horizontal='center')
            ws.cell(row=row_idx, column=3, value=d.declaration_date.strftime('%d/%m/%Y') if d.declaration_date else '').alignment = Alignment(horizontal='center')
            ws.cell(row=row_idx, column=4, value=d.customer.name).alignment = Alignment(horizontal='left')
            ws.cell(row=row_idx, column=5, value=d.declaration_type).alignment = Alignment(horizontal='center')
            ws.cell(row=row_idx, column=6, value=f"{d.customs_office_code} - {d.customs_office_name}").alignment = Alignment(horizontal='left')
            
            lane_cell = ws.cell(row=row_idx, column=7, value=d.get_customs_lane_display())
            lane_cell.alignment = Alignment(horizontal='center')
            if d.customs_lane == CustomsLane.GREEN:
                lane_cell.font = Font(bold=True, color='047857')
            elif d.customs_lane == CustomsLane.YELLOW:
                lane_cell.font = Font(bold=True, color='B45309')
            elif d.customs_lane == CustomsLane.RED:
                lane_cell.font = Font(bold=True, color='B91C1C')

            status_cell = ws.cell(row=row_idx, column=8, value=d.get_status_display())
            status_cell.alignment = Alignment(horizontal='center')
            
            ws.cell(row=row_idx, column=9, value=d.bill_of_lading).alignment = Alignment(horizontal='center')
            ws.cell(row=row_idx, column=10, value=d.container_numbers).alignment = Alignment(horizontal='left')
            
            tax_cell = ws.cell(row=row_idx, column=11, value=float(d.tax_amount_vnd))
            tax_cell.number_format = '#,##0'
            tax_cell.alignment = Alignment(horizontal='right')

            tax_stat_cell = ws.cell(row=row_idx, column=12, value="Đã nộp thuế" if d.is_tax_paid else "Chưa nộp thuế")
            tax_stat_cell.alignment = Alignment(horizontal='center')
            tax_stat_cell.font = Font(color='047857' if d.is_tax_paid else 'B91C1C', bold=True)

            for c in range(1, 13):
                ws.cell(row=row_idx, column=c).border = thin_border
            ws.row_dimensions[row_idx].height = 22

        # Auto fit column width
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 4, 12), 40)

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="Bang_Ke_To_Khai_Hai_Quan_{timezone.now().strftime("%Y%m%d_%H%M")}.xlsx"'
        wb.save(response)
        return response
