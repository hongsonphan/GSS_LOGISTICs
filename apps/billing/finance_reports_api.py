import datetime
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q, F, Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from core.security import GracefulJWTAuthentication
from core.permissions import IsAccountant
from apps.billing.models import (
    TripExpense,
    ReimbursementStatus,
    ApprovalStatus,
    ExpenseCategory,
    CashTransaction,
    TransactionType,
    PaymentMethod,
    CashFlowCategory,
    DispatcherAdvanceFund,
    DriverTripAdvance,
)
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.fleet.models import Vehicle, VehicleOwnership
from apps.customers.models import Customer, RouteTariff
from apps.personnel.models import Employee


class CustomerReimbursablesAPIView(APIView):
    """
    API 1: Bảng Kê Đối Soát & Thu Hồi Chi Hộ Khách Hàng (Customer Reimbursables / Debit Note).
    Quản lý các khoản chi hộ phát sinh hiện trường (nâng hạ cont, cược vỏ, bốc xếp, lưu bãi, kiểm dịch...)
    cho phép gom nhóm xuất Debit Note và chốt hoàn tiền 1-chạm.
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]

    def get(self, request):
        status_filter = request.GET.get('reimbursement_status', 'ALL')
        customer_id = request.GET.get('customer_id')
        search_query = request.GET.get('search', '').strip()
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')

        qs = TripExpense.objects.filter(
            is_on_behalf_of_customer=True,
            is_deleted=False
        ).select_related(
            'trip',
            'trip__customer',
            'trip__vehicle',
            'driver',
            'expense_item',
            'approved_by',
            'reimbursed_by'
        ).order_by('-created_at')

        if customer_id and customer_id.isdigit():
            qs = qs.filter(trip__customer_id=int(customer_id))

        if status_filter and status_filter != 'ALL':
            qs = qs.filter(reimbursement_status=status_filter)

        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
                qs = qs.filter(created_at__date__gte=fd)
            except ValueError:
                pass

        if to_date:
            try:
                td = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
                qs = qs.filter(created_at__date__lte=td)
            except ValueError:
                pass

        if search_query:
            qs = qs.filter(
                Q(invoice_number__icontains=search_query) |
                Q(invoice_lookup_code__icontains=search_query) |
                Q(trip__trip_code__icontains=search_query) |
                Q(trip__container_number__icontains=search_query) |
                Q(trip__booking_or_bill__icontains=search_query) |
                Q(debit_note_number__icontains=search_query) |
                Q(notes__icontains=search_query)
            )

        # Tính toán KPIs tổng hợp
        all_reimbursables = TripExpense.objects.filter(is_on_behalf_of_customer=True, is_deleted=False)
        total_amount = all_reimbursables.aggregate(total=Sum('amount'))['total'] or Decimal(0)
        collected_amount = all_reimbursables.filter(
            reimbursement_status=ReimbursementStatus.COLLECTED
        ).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        pending_amount = all_reimbursables.filter(
            reimbursement_status__in=[ReimbursementStatus.PENDING, ReimbursementStatus.BILLED]
        ).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        billed_amount = all_reimbursables.filter(
            reimbursement_status=ReimbursementStatus.BILLED
        ).aggregate(total=Sum('amount'))['total'] or Decimal(0)

        # Thống kê gom nhóm theo khách hàng
        customers_summary = {}
        items_data = []

        for exp in qs:
            cust = exp.trip.customer if exp.trip and exp.trip.customer else None
            cust_name = cust.name if cust else 'Khách lẻ / Không xác định'
            cust_id = cust.id if cust else 0

            if cust_name not in customers_summary:
                customers_summary[cust_name] = {
                    'customer_id': cust_id,
                    'customer_name': cust_name,
                    'total_count': 0,
                    'total_amount': 0,
                    'pending_amount': 0,
                    'collected_amount': 0,
                }
            
            customers_summary[cust_name]['total_count'] += 1
            customers_summary[cust_name]['total_amount'] += int(exp.amount)
            if exp.reimbursement_status in [ReimbursementStatus.PENDING, ReimbursementStatus.BILLED]:
                customers_summary[cust_name]['pending_amount'] += int(exp.amount)
            elif exp.reimbursement_status == ReimbursementStatus.COLLECTED:
                customers_summary[cust_name]['collected_amount'] += int(exp.amount)

            items_data.append({
                'id': exp.id,
                'trip_id': exp.trip_id,
                'trip_code': exp.trip.trip_code if exp.trip else '',
                'customer_id': cust_id,
                'customer_name': cust_name,
                'container_number': exp.trip.container_number if exp.trip else '',
                'booking_or_bill': exp.trip.booking_or_bill if exp.trip else '',
                'driver_name': (exp.driver.nickname or exp.driver.full_name) if exp.driver else (
                    (exp.trip.driver.nickname or exp.trip.driver.full_name) if (exp.trip and exp.trip.driver) else ''
                ),
                'vehicle_plate': exp.vehicle.license_plate if exp.vehicle else (
                    exp.trip.vehicle.license_plate if (exp.trip and exp.trip.vehicle) else ''
                ),
                'category': exp.category,
                'category_display': exp.get_category_display(),
                'expense_item_name': exp.expense_item.name if exp.expense_item else exp.get_category_display(),
                'amount': int(exp.amount),
                'invoice_number': exp.invoice_number or '',
                'invoice_lookup_code': exp.invoice_lookup_code or '',
                'invoice_lookup_url': exp.invoice_lookup_url or '',
                'invoice_issuer': exp.invoice_issuer or '',
                'receipt_image': exp.receipt_image.url if exp.receipt_image else (exp.receipt_image_path or ''),
                'reimbursement_status': exp.reimbursement_status,
                'reimbursement_status_label': exp.get_reimbursement_status_display(),
                'debit_note_number': exp.debit_note_number or '',
                'reimbursed_at': exp.reimbursed_at.strftime('%d/%m/%Y %H:%M') if exp.reimbursed_at else '',
                'reimbursed_by_name': (exp.reimbursed_by.nickname or exp.reimbursed_by.full_name) if exp.reimbursed_by else '',
                'reimbursement_notes': exp.reimbursement_notes or '',
                'notes': exp.notes or '',
                'created_at': exp.created_at.strftime('%d/%m/%Y %H:%M') if exp.created_at else ''
            })

        return Response({
            'success': True,
            'kpis': {
                'total_amount': int(total_amount),
                'collected_amount': int(collected_amount),
                'pending_amount': int(pending_amount),
                'billed_amount': int(billed_amount),
                'total_items_count': all_reimbursables.count(),
                'pending_items_count': all_reimbursables.filter(reimbursement_status__in=['PENDING', 'BILLED']).count()
            },
            'by_customer': list(customers_summary.values()),
            'items': items_data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request):
        action = request.data.get('action')
        user_emp = getattr(request.user, 'employee', None)

        if action == 'create_debit_note':
            expense_ids = request.data.get('expense_ids', [])
            debit_note_number = request.data.get('debit_note_number', '').strip()
            notes = request.data.get('notes', '').strip()

            if not expense_ids:
                return Response({'error': 'Vui lòng chọn ít nhất một khoản chi hộ để lập Debit Note!'}, status=status.HTTP_400_BAD_REQUEST)

            if not debit_note_number:
                today_str = timezone.now().strftime('%Y%m%d')
                debit_note_number = f"DN-{today_str}-{timezone.now().strftime('%H%M%S')}"

            updated_count = TripExpense.objects.filter(
                id__in=expense_ids,
                is_on_behalf_of_customer=True,
                is_deleted=False
            ).update(
                reimbursement_status=ReimbursementStatus.BILLED,
                debit_note_number=debit_note_number,
                reimbursement_notes=notes or F('reimbursement_notes')
            )

            return Response({
                'success': True,
                'message': f"Đã lập Debit Note [{debit_note_number}] cho {updated_count} khoản chi hộ thành công!",
                'debit_note_number': debit_note_number,
                'updated_count': updated_count
            }, status=status.HTTP_200_OK)

        elif action == 'settle_reimbursement':
            expense_ids = request.data.get('expense_ids', [])
            debit_note_number = request.data.get('debit_note_number', '').strip()
            payment_method = request.data.get('payment_method', PaymentMethod.BANK)
            bank_name = request.data.get('bank_name', '')
            bank_account = request.data.get('bank_account', '')
            notes = request.data.get('notes', 'Khách hàng thanh toán hoàn ứng chi hộ')

            qs = TripExpense.objects.filter(is_on_behalf_of_customer=True, is_deleted=False)
            if debit_note_number:
                qs = qs.filter(debit_note_number=debit_note_number)
            elif expense_ids:
                qs = qs.filter(id__in=expense_ids)
            else:
                return Response({'error': 'Cần cung cấp mã Debit Note hoặc danh sách khoản chi hộ!'}, status=status.HTTP_400_BAD_REQUEST)

            now = timezone.now()
            total_settled = qs.aggregate(total=Sum('amount'))['total'] or Decimal(0)
            first_exp = qs.first()
            customer_name = (first_exp.trip.customer.name if (first_exp and first_exp.trip and first_exp.trip.customer) else 'Khách hàng')

            updated_count = qs.update(
                reimbursement_status=ReimbursementStatus.COLLECTED,
                reimbursed_at=now,
                reimbursed_by=user_emp,
                reimbursement_notes=notes
            )

            # Tự động tạo 1 phiếu thu vào Sổ Quỹ Thu - Chi (CashTransaction)
            today_str = now.strftime('%Y%m%d')
            pt_code = f"PT-DN-{today_str}-{now.strftime('%H%M%S')}"
            ref = debit_note_number or f"EXP-{len(expense_ids)}-ITEMS"

            CashTransaction.objects.create(
                code=pt_code,
                transaction_type=TransactionType.INFLOW,
                payment_method=payment_method,
                category=CashFlowCategory.REIMBURSABLE_COLLECTION,
                amount=total_settled,
                transaction_date=now.date(),
                partner_type='CUSTOMER',
                partner_name=customer_name,
                ref_code=ref,
                bank_name=bank_name,
                bank_account=bank_account,
                created_by=user_emp,
                notes=f"Thu tiền hoàn ứng chi hộ [{ref}]: {notes}"
            )

            return Response({
                'success': True,
                'message': f"Đã xác nhận thu hồi tiền chi hộ {total_settled:,.0f} đ và tự động ghi Sổ Quỹ [{pt_code}]!",
                'total_settled': int(total_settled),
                'updated_count': updated_count,
                'cash_transaction_code': pt_code
            }, status=status.HTTP_200_OK)

        return Response({'error': 'Hành động không hợp lệ!'}, status=status.HTTP_400_BAD_REQUEST)


class CashBookAPIView(APIView):
    """
    API 2: Sổ Quỹ Thu - Chi & Quản Trị Dòng Tiền Vận Tải (Mẫu S03a-DN).
    Hạch toán minh bạch dòng tiền Tiền mặt và Ngân hàng.
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]

    def get(self, request):
        method_filter = request.GET.get('payment_method', 'ALL')
        type_filter = request.GET.get('transaction_type', 'ALL')
        category_filter = request.GET.get('category', 'ALL')
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        search = request.GET.get('search', '').strip()

        all_tx = CashTransaction.objects.filter(is_deleted=False)

        # Tính tồn quỹ lũy kế tổng quan toàn hệ thống
        cash_inflow = all_tx.filter(payment_method=PaymentMethod.CASH, transaction_type=TransactionType.INFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        cash_outflow = all_tx.filter(payment_method=PaymentMethod.CASH, transaction_type=TransactionType.OUTFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        cash_balance = cash_inflow - cash_outflow

        bank_inflow = all_tx.filter(payment_method=PaymentMethod.BANK, transaction_type=TransactionType.INFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        bank_outflow = all_tx.filter(payment_method=PaymentMethod.BANK, transaction_type=TransactionType.OUTFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        bank_balance = bank_inflow - bank_outflow

        total_funds = cash_balance + bank_balance

        # Áp dụng bộ lọc cho danh sách
        qs = all_tx.select_related('created_by').order_by('-transaction_date', '-id')

        if method_filter and method_filter != 'ALL':
            qs = qs.filter(payment_method=method_filter)

        if type_filter and type_filter != 'ALL':
            qs = qs.filter(transaction_type=type_filter)

        if category_filter and category_filter != 'ALL':
            qs = qs.filter(category=category_filter)

        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
                qs = qs.filter(transaction_date__gte=fd)
            except ValueError:
                pass

        if to_date:
            try:
                td = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
                qs = qs.filter(transaction_date__lte=td)
            except ValueError:
                pass

        if search:
            qs = qs.filter(
                Q(code__icontains=search) |
                Q(partner_name__icontains=search) |
                Q(ref_code__icontains=search) |
                Q(notes__icontains=search)
            )

        period_inflow = qs.filter(transaction_type=TransactionType.INFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)
        period_outflow = qs.filter(transaction_type=TransactionType.OUTFLOW).aggregate(total=Sum('amount'))['total'] or Decimal(0)

        tx_list = []
        for t in qs:
            tx_list.append({
                'id': t.id,
                'code': t.code,
                'transaction_type': t.transaction_type,
                'transaction_type_label': t.get_transaction_type_display(),
                'payment_method': t.payment_method,
                'payment_method_label': t.get_payment_method_display(),
                'category': t.category,
                'category_label': t.get_category_display(),
                'amount': int(t.amount),
                'transaction_date': t.transaction_date.strftime('%d/%m/%Y') if t.transaction_date else '',
                'partner_type': t.partner_type,
                'partner_type_label': t.get_partner_type_display() if t.partner_type else '',
                'partner_name': t.partner_name,
                'ref_code': t.ref_code,
                'bank_name': t.bank_name,
                'bank_account': t.bank_account,
                'created_by': (t.created_by.nickname or t.created_by.full_name) if t.created_by else '',
                'notes': t.notes,
                'created_at': t.created_at.strftime('%d/%m/%Y %H:%M') if t.created_at else ''
            })

        return Response({
            'success': True,
            'kpis': {
                'cash_balance': int(cash_balance),
                'bank_balance': int(bank_balance),
                'total_balance': int(total_funds),
                'period_inflow': int(period_inflow),
                'period_outflow': int(period_outflow),
                'period_net': int(period_inflow - period_outflow),
            },
            'transactions': tx_list
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request):
        """Tạo phiếu thu hoặc phiếu chi thủ công."""
        user_emp = getattr(request.user, 'employee', None)
        t_type = request.data.get('transaction_type') # INFLOW / OUTFLOW
        p_method = request.data.get('payment_method', PaymentMethod.BANK)
        category = request.data.get('category')
        amount_val = request.data.get('amount')
        trans_date_str = request.data.get('transaction_date')
        partner_type = request.data.get('partner_type', '')
        partner_name = request.data.get('partner_name', '').strip()
        ref_code = request.data.get('ref_code', '').strip()
        bank_name = request.data.get('bank_name', '').strip()
        bank_account = request.data.get('bank_account', '').strip()
        notes = request.data.get('notes', '').strip()

        if not t_type or t_type not in [TransactionType.INFLOW, TransactionType.OUTFLOW]:
            return Response({'error': 'Loại giao dịch phải là Thu tiền hoặc Chi tiền!'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_val))
            if amount <= 0:
                raise ValueError
        except Exception:
            return Response({'error': 'Số tiền giao dịch phải lớn hơn 0 đ!'}, status=status.HTTP_400_BAD_REQUEST)

        if trans_date_str:
            try:
                t_date = datetime.datetime.strptime(trans_date_str, '%Y-%m-%d').date()
            except ValueError:
                t_date = timezone.now().date()
        else:
            t_date = timezone.now().date()

        # Tạo mã phiếu
        now = timezone.now()
        prefix = "PT" if t_type == TransactionType.INFLOW else "PC"
        code = f"{prefix}-{t_date.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}"

        tx = CashTransaction.objects.create(
            code=code,
            transaction_type=t_type,
            payment_method=p_method,
            category=category or (CashFlowCategory.OTHER_INFLOW if t_type == TransactionType.INFLOW else CashFlowCategory.OTHER_OUTFLOW),
            amount=amount,
            transaction_date=t_date,
            partner_type=partner_type,
            partner_name=partner_name,
            ref_code=ref_code,
            bank_name=bank_name,
            bank_account=bank_account,
            created_by=user_emp,
            notes=notes
        )

        return Response({
            'success': True,
            'message': f"Đã tạo phiếu {tx.get_transaction_type_display()} [{tx.code}] thành công: {int(tx.amount):,} đ",
            'transaction_id': tx.id,
            'code': tx.code
        }, status=status.HTTP_201_CREATED)


class SubcontractorSettlementsAPIView(APIView):
    """
    API 3: Quyết Toán & Đối Soát Nhà Xe Bạn / Thầu Phụ 3PL (Subcontractor Payables).
    Theo dõi cước thuê xe ngoài, tạm ứng chi phí và công nợ còn phải thanh toán cho thầu phụ.
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]

    def get(self, request):
        status_filter = request.GET.get('status', 'ALL')
        vehicle_id = request.GET.get('vehicle_id')
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        search = request.GET.get('search', '').strip()

        # Chỉ lấy các chuyến xe do Thầu phụ / Xe bạn chạy (ownership_type == 'SUBCONTRACTOR')
        qs = DispatchTrip.objects.filter(
            is_deleted=False,
            vehicle__ownership_type=VehicleOwnership.SUBCONTRACTOR
        ).select_related(
            'vehicle',
            'driver',
            'customer',
            'booking_order'
        ).order_by('-created_at')

        if status_filter and status_filter != 'ALL':
            qs = qs.filter(subcontractor_settlement_status=status_filter)

        if vehicle_id and vehicle_id.isdigit():
            qs = qs.filter(vehicle_id=int(vehicle_id))

        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
                qs = qs.filter(created_at__date__gte=fd)
            except ValueError:
                pass

        if to_date:
            try:
                td = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
                qs = qs.filter(created_at__date__lte=td)
            except ValueError:
                pass

        if search:
            qs = qs.filter(
                Q(trip_code__icontains=search) |
                Q(vehicle__license_plate__icontains=search) |
                Q(container_number__icontains=search) |
                Q(booking_or_bill__icontains=search) |
                Q(subcontractor_notes__icontains=search)
            )

        # Tính toán KPIs
        all_sub_trips = DispatchTrip.objects.filter(
            is_deleted=False,
            vehicle__ownership_type=VehicleOwnership.SUBCONTRACTOR
        )
        total_trips = all_sub_trips.count()
        total_cost = all_sub_trips.aggregate(total=Sum('subcontractor_cost'))['total'] or Decimal(0)
        total_advance = all_sub_trips.aggregate(total=Sum('subcontractor_advance'))['total'] or Decimal(0)
        total_remaining = total_cost - total_advance
        settled_count = all_sub_trips.filter(subcontractor_settlement_status='SETTLED').count()

        # Tổng hợp theo Đầu Xe Bạn
        by_partner = {}
        items = []

        for trip in qs:
            plate = trip.vehicle.license_plate if trip.vehicle else 'Xe ngoài chưa gán'
            c_cost = int(trip.subcontractor_cost)
            c_adv = int(trip.subcontractor_advance)
            rem = max(0, c_cost - c_adv)

            if plate not in by_partner:
                by_partner[plate] = {
                    'license_plate': plate,
                    'trips_count': 0,
                    'total_cost': 0,
                    'total_advance': 0,
                    'remaining_payable': 0
                }
            by_partner[plate]['trips_count'] += 1
            by_partner[plate]['total_cost'] += c_cost
            by_partner[plate]['total_advance'] += c_adv
            by_partner[plate]['remaining_payable'] += rem

            items.append({
                'trip_id': trip.id,
                'trip_code': trip.trip_code,
                'vehicle_plate': plate,
                'driver_name': (trip.driver.nickname or trip.driver.full_name) if trip.driver else 'Tài xế xe bạn',
                'customer_name': trip.customer.name if trip.customer else '',
                'route_name': f"{trip.pickup_location or ''} ➔ {trip.warehouse_location or ''}",
                'container_number': trip.container_number or '',
                'booking_or_bill': trip.booking_or_bill or '',
                'trip_status': trip.status,
                'trip_status_label': trip.get_status_display(),
                'cached_revenue': int(trip.cached_revenue),
                'subcontractor_cost': c_cost,
                'subcontractor_advance': c_adv,
                'remaining_payable': rem,
                'gross_company_margin': int(trip.cached_revenue - trip.subcontractor_cost),
                'subcontractor_settlement_status': trip.subcontractor_settlement_status,
                'subcontractor_settlement_status_label': trip.get_subcontractor_settlement_status_display(),
                'subcontractor_settled_at': trip.subcontractor_settled_at.strftime('%d/%m/%Y %H:%M') if trip.subcontractor_settled_at else '',
                'subcontractor_notes': trip.subcontractor_notes or '',
                'created_at': trip.created_at.strftime('%d/%m/%Y') if trip.created_at else ''
            })

        return Response({
            'success': True,
            'kpis': {
                'total_trips': total_trips,
                'total_cost': int(total_cost),
                'total_advance': int(total_advance),
                'total_remaining': int(total_remaining),
                'settled_count': settled_count,
                'pending_count': total_trips - settled_count
            },
            'by_partner': list(by_partner.values()),
            'trips': items
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request):
        action = request.data.get('action')
        trip_id = request.data.get('trip_id')
        user_emp = getattr(request.user, 'employee', None)

        trip = DispatchTrip.objects.filter(id=trip_id, is_deleted=False).first()
        if not trip:
            return Response({'error': 'Không tìm thấy thông tin chuyến xe bạn!'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'update_cost':
            cost = request.data.get('subcontractor_cost')
            advance = request.data.get('subcontractor_advance', 0)
            notes = request.data.get('notes', '')

            try:
                trip.subcontractor_cost = Decimal(str(cost))
                trip.subcontractor_advance = Decimal(str(advance))
                trip.subcontractor_notes = notes
                trip.save(update_fields=['subcontractor_cost', 'subcontractor_advance', 'subcontractor_notes'])
            except Exception as e:
                return Response({'error': f'Lỗi dữ liệu: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'success': True,
                'message': f"Đã cập nhật thỏa thuận cước xe bạn [{trip.trip_code}] thành công!",
                'trip_id': trip.id
            }, status=status.HTTP_200_OK)

        elif action == 'settle':
            payment_method = request.data.get('payment_method', PaymentMethod.BANK)
            bank_name = request.data.get('bank_name', '')
            bank_account = request.data.get('bank_account', '')
            notes = request.data.get('notes', '')

            rem = trip.subcontractor_cost - trip.subcontractor_advance
            now = timezone.now()

            trip.subcontractor_settlement_status = 'SETTLED'
            trip.subcontractor_settled_at = now
            if notes:
                trip.subcontractor_notes = notes
            trip.save(update_fields=['subcontractor_settlement_status', 'subcontractor_settled_at', 'subcontractor_notes'])

            # Tự động lập phiếu chi Sổ Quỹ cho số tiền còn lại phải thanh toán
            pt_code = None
            if rem > 0:
                today_str = now.strftime('%Y%m%d')
                pt_code = f"PC-3PL-{today_str}-{now.strftime('%H%M%S')}"
                CashTransaction.objects.create(
                    code=pt_code,
                    transaction_type=TransactionType.OUTFLOW,
                    payment_method=payment_method,
                    category=CashFlowCategory.SUBCONTRACTOR_PAYMENT,
                    amount=rem,
                    transaction_date=now.date(),
                    partner_type='SUBCONTRACTOR',
                    partner_name=f"Xe bạn: {trip.vehicle.license_plate if trip.vehicle else ''}",
                    ref_code=trip.trip_code,
                    bank_name=bank_name,
                    bank_account=bank_account,
                    created_by=user_emp,
                    notes=f"Thanh toán cước xe bạn chuyến [{trip.trip_code}]: {notes or 'Quyết toán cước hoàn tất'}"
                )

            return Response({
                'success': True,
                'message': f"Đã quyết toán cước xe bạn chuyến [{trip.trip_code}] thành công!" + (f" Tự động lập phiếu chi [{pt_code}] số tiền {int(rem):,} đ" if pt_code else ""),
                'trip_id': trip.id,
                'settlement_code': pt_code
            }, status=status.HTTP_200_OK)

        return Response({'error': 'Hành động không hợp lệ!'}, status=status.HTTP_400_BAD_REQUEST)


class BotTollAuditAPIView(APIView):
    """
    API 4: Đối Soát Chuyên Sâu Vé Cầu Đường BOT/ETC vs Định Mức Tuyến.
    Đối chiếu chi phí vé BOT thực tế tài xế nộp/quét OCR với định mức trong bảng giá cước RouteTariff.
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]

    def get(self, request):
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')

        # Lấy tất cả các chuyến xe có vé cầu đường
        expenses_qs = TripExpense.objects.filter(
            is_deleted=False,
            category=ExpenseCategory.TOLL_FEE
        ).select_related('trip', 'trip__customer', 'trip__vehicle', 'driver')

        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
                expenses_qs = expenses_qs.filter(created_at__date__gte=fd)
            except ValueError:
                pass

        if to_date:
            try:
                td = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
                expenses_qs = expenses_qs.filter(created_at__date__lte=td)
            except ValueError:
                pass

        # Gom nhóm chi phí BOT theo từng Chuyến xe
        trips_bot = {}
        for exp in expenses_qs:
            tid = exp.trip_id
            if tid not in trips_bot:
                trip = exp.trip
                # Tìm định mức BOT của tuyến (nếu có)
                standard_toll = Decimal(0)
                if trip:
                    tariff = RouteTariff.objects.filter(
                        customer=trip.customer,
                        pickup_location__iexact=trip.pickup_location,
                        delivery_location__iexact=trip.warehouse_location
                    ).first()
                    if tariff and tariff.toll_standard_fee > 0:
                        standard_toll = tariff.toll_standard_fee

                trips_bot[tid] = {
                    'trip_id': tid,
                    'trip_code': trip.trip_code if trip else '',
                    'vehicle_plate': trip.vehicle.license_plate if (trip and trip.vehicle) else '',
                    'driver_name': (trip.driver.nickname or trip.driver.full_name) if (trip and trip.driver) else '',
                    'route_name': f"{trip.pickup_location or ''} ➔ {trip.warehouse_location or ''}" if trip else '',
                    'actual_toll': 0,
                    'standard_toll': int(standard_toll),
                    'tickets_count': 0,
                    'tickets_detail': []
                }
            
            trips_bot[tid]['actual_toll'] += int(exp.amount)
            trips_bot[tid]['tickets_count'] += 1
            trips_bot[tid]['tickets_detail'].append({
                'id': exp.id,
                'amount': int(exp.amount),
                'invoice_number': exp.invoice_number or '',
                'invoice_issuer': exp.invoice_issuer or '',
                'ocr_raw_text': exp.ocr_raw_text or '',
                'created_at': exp.created_at.strftime('%d/%m/%Y %H:%M') if exp.created_at else ''
            })

        items = list(trips_bot.values())
        total_actual_toll = sum(it['actual_toll'] for it in items)
        total_standard_toll = sum(it['standard_toll'] for it in items if it['standard_toll'] > 0)
        variance_count = 0

        for it in items:
            diff = it['actual_toll'] - it['standard_toll']
            it['variance_amount'] = diff
            if it['standard_toll'] > 0:
                pct = round((diff / it['standard_toll']) * 100, 1)
                it['variance_percent'] = pct
                if pct > 15:
                    it['warning_level'] = 'HIGH' # Vượt định mức > 15%
                    variance_count += 1
                elif pct < -15:
                    it['warning_level'] = 'SAVING' # Tiết kiệm > 15%
                else:
                    it['warning_level'] = 'NORMAL'
            else:
                it['variance_percent'] = 0
                it['warning_level'] = 'NO_STANDARD'

        return Response({
            'success': True,
            'kpis': {
                'total_trips_with_toll': len(items),
                'total_actual_toll': total_actual_toll,
                'total_standard_toll': total_standard_toll,
                'variance_count': variance_count,
            },
            'items': items
        }, status=status.HTTP_200_OK)
