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
from core.permissions import IsAccountant, IsDispatcherOrAccountant
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


class CashBookDetailAPIView(APIView):
    """
    API Chi Tiết Phiếu Thu / Phiếu Chi (Xem & In Chứng Từ Mẫu 01-TT / 02-TT).
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsDispatcherOrAccountant]

    def get(self, request, pk):
        try:
            if str(pk).isdigit():
                t = CashTransaction.objects.select_related('created_by').get(id=int(pk), is_deleted=False)
            else:
                t = CashTransaction.objects.select_related('created_by').get(code=pk, is_deleted=False)
        except CashTransaction.DoesNotExist:
            return Response({'error': 'Không tìm thấy phiếu thu/chi tương ứng'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': True,
            'transaction': {
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
                'transaction_date_iso': t.transaction_date.strftime('%Y-%m-%d') if t.transaction_date else '',
                'day': t.transaction_date.strftime('%d') if t.transaction_date else '',
                'month': t.transaction_date.strftime('%m') if t.transaction_date else '',
                'year': t.transaction_date.strftime('%Y') if t.transaction_date else '',
                'partner_type': t.partner_type,
                'partner_type_label': t.get_partner_type_display() if t.partner_type else '',
                'partner_name': t.partner_name,
                'ref_code': t.ref_code,
                'bank_name': t.bank_name,
                'bank_account': t.bank_account,
                'created_by': (t.created_by.nickname or t.created_by.full_name) if t.created_by else '',
                'notes': t.notes,
                'created_at': t.created_at.strftime('%d/%m/%Y %H:%M') if t.created_at else ''
            }
        }, status=status.HTTP_200_OK)


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


class AccountingReportsAPIView(APIView):
    """
    API 5: Trung Tâm Báo Cáo Kế Toán & Quản Trị Tài Chính Vận Tải Đa Chiều.
    Hỗ trợ 5 loại báo cáo chuẩn mực:
    - BY_CUSTOMER: Báo cáo Doanh thu, Chi phí & Chi hộ theo Khách hàng
    - BY_SUBCONTRACTOR: Báo cáo Quyết toán cước & Công nợ theo Xe bạn / Thầu phụ (3PL)
    - BY_DRIVER: Báo cáo Bảng kê Lương chuyến, Tạm ứng & Quyết toán theo Tài xế
    - BY_ROUTE: Báo cáo Hiệu quả kinh doanh & Đối soát BOT theo Tuyến đường
    - BY_CASHFLOW: Báo cáo Sổ quỹ & Dòng tiền Thu - Chi (Mẫu S03a-DN)
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]

    def get(self, request):
        report_type = request.GET.get('report_type') or request.GET.get('type') or 'BY_CUSTOMER'
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')
        customer_id = request.GET.get('customer_id')
        driver_id = request.GET.get('driver_id')
        vehicle_id = request.GET.get('vehicle_id')

        # Bộ lọc thời gian chung cho Chuyến xe
        trips_qs = DispatchTrip.objects.filter(is_deleted=False).select_related(
            'customer', 'driver', 'vehicle', 'booking_order'
        )

        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
                trips_qs = trips_qs.filter(created_at__date__gte=fd)
            except ValueError:
                pass

        if to_date:
            try:
                td = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
                trips_qs = trips_qs.filter(created_at__date__lte=td)
            except ValueError:
                pass

        # ---------------------------------------------------------------------
        # 1. BÁO CÁO THEO KHÁCH HÀNG (BY_CUSTOMER)
        # ---------------------------------------------------------------------
        if report_type == 'BY_CUSTOMER':
            if customer_id and customer_id.isdigit():
                trips_qs = trips_qs.filter(customer_id=int(customer_id))

            customers_map = {}
            total_rev = Decimal(0)
            total_exp = Decimal(0)
            total_profit = Decimal(0)
            total_reimbursables = Decimal(0)
            total_trips_count = 0

            for t in trips_qs:
                cust_key = t.customer_id or 0
                cust_name = t.customer.name if t.customer else 'Khách vãng lai / Chưa gán'
                cust_code = getattr(t.customer, 'code', '') if t.customer else 'VANG_LAI'

                if cust_key not in customers_map:
                    customers_map[cust_key] = {
                        'customer_id': cust_key,
                        'customer_code': cust_code,
                        'customer_name': cust_name,
                        'trips_count': 0,
                        'cont_20_count': 0,
                        'cont_40_count': 0,
                        'revenue': 0,
                        'operating_expenses': 0,
                        'reimbursables': 0,
                        'gross_profit': 0,
                        'profit_margin_pct': 0,
                        'settled_trips_count': 0,
                    }

                c_rev = int(t.cached_revenue)
                c_exp = int(t.cached_expense)
                c_prof = int(t.cached_profit)

                customers_map[cust_key]['trips_count'] += 1
                total_trips_count += 1
                if '20' in (t.container_type or ''):
                    customers_map[cust_key]['cont_20_count'] += 1
                else:
                    customers_map[cust_key]['cont_40_count'] += 1

                customers_map[cust_key]['revenue'] += c_rev
                customers_map[cust_key]['operating_expenses'] += c_exp
                customers_map[cust_key]['gross_profit'] += c_prof
                if t.is_expenses_settled:
                    customers_map[cust_key]['settled_trips_count'] += 1

                total_rev += Decimal(c_rev)
                total_exp += Decimal(c_exp)
                total_profit += Decimal(c_prof)

            # Lấy chi hộ theo từng khách hàng
            reimb_qs = TripExpense.objects.filter(is_on_behalf_of_customer=True, is_deleted=False)
            if from_date:
                reimb_qs = reimb_qs.filter(created_at__date__gte=fd)
            if to_date:
                reimb_qs = reimb_qs.filter(created_at__date__lte=td)

            for rexp in reimb_qs:
                cid = rexp.trip.customer_id if (rexp.trip and rexp.trip.customer_id) else 0
                if cid in customers_map:
                    customers_map[cid]['reimbursables'] += int(rexp.amount)
                total_reimbursables += Decimal(rexp.amount)

            # Tính tỷ suất lợi nhuận
            rows = list(customers_map.values())
            for r in rows:
                if r['revenue'] > 0:
                    r['profit_margin_pct'] = round((r['gross_profit'] / r['revenue']) * 100, 1)
                else:
                    r['profit_margin_pct'] = 0

            # Sắp xếp theo doanh thu giảm dần
            rows.sort(key=lambda x: x['revenue'], reverse=True)

            avg_margin = round((float(total_profit) / float(total_rev) * 100), 1) if total_rev > 0 else 0

            return Response({
                'success': True,
                'report_type': 'BY_CUSTOMER',
                'report_title': 'Báo Cáo Doanh Thu, Chi Phí & Chi Hộ Theo Khách Hàng',
                'kpis': {
                    'total_customers': len(rows),
                    'total_trips': total_trips_count,
                    'total_revenue': int(total_rev),
                    'total_operating_expenses': int(total_exp),
                    'total_reimbursables': int(total_reimbursables),
                    'total_gross_profit': int(total_profit),
                    'avg_profit_margin_pct': avg_margin,
                },
                'headers': [
                    {'key': 'customer_name', 'label': 'Khách Hàng', 'align': 'left'},
                    {'key': 'trips_count', 'label': 'Số Chuyến', 'align': 'center'},
                    {'key': 'revenue', 'label': 'Doanh Thu Cước (VNĐ)', 'align': 'right'},
                    {'key': 'operating_expenses', 'label': 'Chi Phí Chuyến (VNĐ)', 'align': 'right'},
                    {'key': 'reimbursables', 'label': 'Tiền Chi Hộ (Debit Note)', 'align': 'right'},
                    {'key': 'gross_profit', 'label': 'Lợi Nhuận Gộp (VNĐ)', 'align': 'right'},
                    {'key': 'profit_margin_pct', 'label': 'Biên LN (%)', 'align': 'center'},
                ],
                'rows': rows
            }, status=status.HTTP_200_OK)

        # ---------------------------------------------------------------------
        # 2. BÁO CÁO THEO XE BẠN / THẦU PHỤ 3PL (BY_SUBCONTRACTOR)
        # ---------------------------------------------------------------------
        elif report_type == 'BY_SUBCONTRACTOR':
            sub_trips = trips_qs.filter(vehicle__ownership_type=VehicleOwnership.SUBCONTRACTOR)
            if vehicle_id and vehicle_id.isdigit():
                sub_trips = sub_trips.filter(vehicle_id=int(vehicle_id))

            sub_map = {}
            total_cust_rev = Decimal(0)
            total_sub_cost = Decimal(0)
            total_sub_adv = Decimal(0)
            total_sub_rem = Decimal(0)
            total_sub_margin = Decimal(0)

            for t in sub_trips:
                plate = t.vehicle.license_plate if t.vehicle else 'Xe ngoài chưa gán'
                if plate not in sub_map:
                    sub_map[plate] = {
                        'vehicle_plate': plate,
                        'driver_name': (t.driver.nickname or t.driver.full_name) if t.driver else 'Tài xế xe bạn',
                        'trips_count': 0,
                        'customer_revenue': 0,
                        'subcontractor_cost': 0,
                        'subcontractor_advance': 0,
                        'remaining_payable': 0,
                        'company_margin': 0,
                        'settled_count': 0,
                    }

                c_cost = int(t.subcontractor_cost)
                c_adv = int(t.subcontractor_advance)
                c_rem = max(0, c_cost - c_adv)
                c_rev = int(t.cached_revenue)
                c_margin = c_rev - c_cost

                sub_map[plate]['trips_count'] += 1
                sub_map[plate]['customer_revenue'] += c_rev
                sub_map[plate]['subcontractor_cost'] += c_cost
                sub_map[plate]['subcontractor_advance'] += c_adv
                sub_map[plate]['remaining_payable'] += c_rem
                sub_map[plate]['company_margin'] += c_margin
                if t.subcontractor_settlement_status == 'SETTLED':
                    sub_map[plate]['settled_count'] += 1

                total_cust_rev += Decimal(c_rev)
                total_sub_cost += Decimal(c_cost)
                total_sub_adv += Decimal(c_adv)
                total_sub_rem += Decimal(c_rem)
                total_sub_margin += Decimal(c_margin)

            rows = list(sub_map.values())
            rows.sort(key=lambda x: x['subcontractor_cost'], reverse=True)

            return Response({
                'success': True,
                'report_type': 'BY_SUBCONTRACTOR',
                'report_title': 'Báo Cáo Quyết Toán Cước & Công Nợ Xe Bạn / Thầu Phụ (3PL)',
                'kpis': {
                    'total_vehicles': len(rows),
                    'total_trips': sum(r['trips_count'] for r in rows),
                    'total_customer_revenue': int(total_cust_rev),
                    'total_subcontractor_cost': int(total_sub_cost),
                    'total_advance_paid': int(total_sub_adv),
                    'total_remaining_payable': int(total_sub_rem),
                    'total_company_margin': int(total_sub_margin),
                },
                'headers': [
                    {'key': 'vehicle_plate', 'label': 'Biển Số Xe Bạn', 'align': 'left'},
                    {'key': 'driver_name', 'label': 'Tài Xế / Chủ Xe', 'align': 'left'},
                    {'key': 'trips_count', 'label': 'Số Chuyến', 'align': 'center'},
                    {'key': 'customer_revenue', 'label': 'Cước Thu Khách', 'align': 'right'},
                    {'key': 'subcontractor_cost', 'label': 'Cước Thuê Xe Bạn', 'align': 'right'},
                    {'key': 'subcontractor_advance', 'label': 'Đã Tạm Ứng', 'align': 'right'},
                    {'key': 'remaining_payable', 'label': 'Còn Phải Trả (AP)', 'align': 'right'},
                    {'key': 'company_margin', 'label': 'Lợi Nhuận Giữ Lại', 'align': 'right'},
                ],
                'rows': rows
            }, status=status.HTTP_200_OK)

        # ---------------------------------------------------------------------
        # 3. BÁO CÁO THEO TÀI XẾ (BY_DRIVER)
        # ---------------------------------------------------------------------
        elif report_type == 'BY_DRIVER':
            # Danh sách tài xế chính thức & thầu phụ được phân quyền
            drivers_qs = Employee.objects.filter(is_deleted=False)
            if driver_id and driver_id.isdigit():
                drivers_qs = drivers_qs.filter(id=int(driver_id))
            else:
                drivers_qs = drivers_qs.filter(Q(role='DRIVER') | Q(dispatched_trips__isnull=False)).distinct()

            drivers_map = {}
            for d in drivers_qs:
                d_id = d.id
                assigned_v = getattr(d, 'assigned_vehicle', None)
                v_plate = assigned_v.license_plate if assigned_v else ''
                d_name = d.full_name or d.nickname or f'Tài xế #{d_id}'
                d_code = d.code or f'TX-{d_id}'

                drivers_map[d_id] = {
                    'driver_id': d_id,
                    'driver_code': d_code,
                    'driver_name': d_name,
                    'assigned_vehicle': v_plate,
                    'trips_count': 0,
                    'completed_trips_count': 0,
                    'estimated_trip_salary': 0,
                    'total_advance_received': 0,
                    'total_actual_expense': 0,
                    'reimbursable_expense': 0,
                    'settlement_balance': 0,
                    'refund_to_company': 0,
                    'company_reimburse': 0,
                    'settled_advances_count': 0,
                }

            # Map chuyến xe của tài xế trong kỳ
            for t in trips_qs:
                d_id = t.driver_id
                if not d_id:
                    continue
                if d_id not in drivers_map:
                    d_name = (t.driver.nickname or t.driver.full_name) if t.driver else 'Tài xế'
                    d_code = getattr(t.driver, 'code', f'TX-{d_id}') if t.driver else f'TX-{d_id}'
                    drivers_map[d_id] = {
                        'driver_id': d_id,
                        'driver_code': d_code,
                        'driver_name': d_name,
                        'assigned_vehicle': t.vehicle.license_plate if t.vehicle else '',
                        'trips_count': 0,
                        'completed_trips_count': 0,
                        'estimated_trip_salary': 0,
                        'total_advance_received': 0,
                        'total_actual_expense': 0,
                        'reimbursable_expense': 0,
                        'settlement_balance': 0,
                        'refund_to_company': 0,
                        'company_reimburse': 0,
                        'settled_advances_count': 0,
                    }

                d_row = drivers_map[d_id]
                d_row['trips_count'] += 1
                if not d_row['assigned_vehicle'] and t.vehicle:
                    d_row['assigned_vehicle'] = t.vehicle.license_plate

                if t.status == 'COMPLETED':
                    d_row['completed_trips_count'] += 1
                    d_row['estimated_trip_salary'] += 400000

            # Map tiền tạm ứng cấp cho tài xế
            adv_qs = DriverTripAdvance.objects.filter(is_deleted=False)
            if from_date:
                adv_qs = adv_qs.filter(created_at__date__gte=fd)
            if to_date:
                adv_qs = adv_qs.filter(created_at__date__lte=td)

            for adv in adv_qs:
                d_id = adv.driver_id
                if not d_id or d_id not in drivers_map:
                    continue
                d_row = drivers_map[d_id]
                adv_amount = Decimal(adv.amount or 0)
                d_row['total_advance_received'] += int(adv_amount)

                if adv.status == 'SETTLED':
                    d_row['settled_advances_count'] += 1
                    if adv.refund_amount > 0:
                        d_row['refund_to_company'] += int(adv.refund_amount)
                    if adv.reimburse_amount > 0:
                        d_row['company_reimburse'] += int(adv.reimburse_amount)

            # Map chi phí thực tế phát sinh của tài xế từ Bảng Kê Chi Phí
            exp_qs = TripExpense.objects.filter(is_deleted=False)
            if from_date:
                exp_qs = exp_qs.filter(created_at__date__gte=fd)
            if to_date:
                exp_qs = exp_qs.filter(created_at__date__lte=td)

            for exp in exp_qs:
                d_id = exp.driver_id or (exp.trip.driver_id if exp.trip else None)
                if not d_id or d_id not in drivers_map:
                    continue
                d_row = drivers_map[d_id]
                amt = int(exp.amount or 0)
                d_row['total_actual_expense'] += amt
                if exp.is_on_behalf_of_customer:
                    d_row['reimbursable_expense'] += amt

            # Tính toán chênh lệch & số dư đối soát hoàn ứng
            total_trips_count = 0
            total_driver_trip_pay = Decimal(0)
            total_advances_given = Decimal(0)
            total_actual_expenses = Decimal(0)
            total_driver_refund = Decimal(0)
            total_company_reimburse = Decimal(0)

            for d_row in drivers_map.values():
                total_trips_count += d_row['completed_trips_count']
                total_driver_trip_pay += Decimal(d_row['estimated_trip_salary'])
                total_advances_given += Decimal(d_row['total_advance_received'])
                total_actual_expenses += Decimal(d_row['total_actual_expense'])
                total_driver_refund += Decimal(d_row['refund_to_company'])
                total_company_reimburse += Decimal(d_row['company_reimburse'])
                
                # Số dư đối soát (Tạm ứng - Thực chi)
                d_row['settlement_balance'] = d_row['total_advance_received'] - d_row['total_actual_expense']

            rows = list(drivers_map.values())
            # Sắp xếp ưu tiên: Tài xế có nhiều chuyến / chi phí nhiều nhất lên đầu
            rows.sort(key=lambda x: (x['trips_count'], x['total_actual_expense']), reverse=True)

            return Response({
                'success': True,
                'report_type': 'BY_DRIVER',
                'report_title': 'Báo Cáo Bảng Kê Lương Chuyến, Tạm Ứng & Quyết Toán Theo Tài Xế',
                'kpis': {
                    'total_drivers': len(rows),
                    'total_trips_completed': total_trips_count,
                    'total_trip_salary': int(total_driver_trip_pay),
                    'total_advance_given': int(total_advances_given),
                    'total_actual_expense': int(total_actual_expenses),
                    'total_driver_refund': int(total_driver_refund),
                    'total_company_reimburse': int(total_company_reimburse),
                },
                'headers': [
                    {'key': 'driver_name', 'label': 'Họ Tên Bác Tài', 'align': 'left'},
                    {'key': 'assigned_vehicle', 'label': 'Đầu Kéo Phụ Trách', 'align': 'center'},
                    {'key': 'trips_count', 'label': 'Tổng Chuyến (Xong)', 'align': 'center'},
                    {'key': 'estimated_trip_salary', 'label': 'Lương Chuyến (VNĐ)', 'align': 'right'},
                    {'key': 'total_advance_received', 'label': 'Tạm Ứng Đã Cấp', 'align': 'right'},
                    {'key': 'total_actual_expense', 'label': 'Chi Phí Thực Chi (BOT/Phí)', 'align': 'right'},
                    {'key': 'settlement_balance', 'label': 'Số Dư Đối Soát (+/-)', 'align': 'right'},
                    {'key': 'settled_advances_count', 'label': 'Phiếu Đã Chốt', 'align': 'center'},
                ],
                'rows': rows
            }, status=status.HTTP_200_OK)

        # ---------------------------------------------------------------------
        # 4. BÁO CÁO THEO TUYẾN ĐƯỜNG & HIỆU QUẢ BOT (BY_ROUTE)
        # ---------------------------------------------------------------------
        elif report_type == 'BY_ROUTE':
            routes_map = {}
            total_rev = Decimal(0)
            total_toll = Decimal(0)
            total_exp = Decimal(0)
            total_profit = Decimal(0)

            for t in trips_qs:
                p_loc = t.pickup_location or 'Điểm lấy'
                w_loc = t.warehouse_location or 'Kho giao'
                route_key = f"{p_loc} ➔ {w_loc}"

                if route_key not in routes_map:
                    routes_map[route_key] = {
                        'route_name': route_key,
                        'trips_count': 0,
                        'revenue': 0,
                        'actual_toll': 0,
                        'total_expense': 0,
                        'gross_profit': 0,
                        'avg_profit_per_trip': 0,
                    }

                c_rev = int(t.cached_revenue)
                c_exp = int(t.cached_expense)
                c_prof = int(t.cached_profit)

                routes_map[route_key]['trips_count'] += 1
                routes_map[route_key]['revenue'] += c_rev
                routes_map[route_key]['total_expense'] += c_exp
                routes_map[route_key]['gross_profit'] += c_prof

                total_rev += Decimal(c_rev)
                total_exp += Decimal(c_exp)
                total_profit += Decimal(c_prof)

            # Lấy chi phí BOT theo tuyến
            bot_expenses = TripExpense.objects.filter(
                category=ExpenseCategory.TOLL_FEE,
                is_deleted=False
            ).select_related('trip')
            if from_date:
                bot_expenses = bot_expenses.filter(created_at__date__gte=fd)
            if to_date:
                bot_expenses = bot_expenses.filter(created_at__date__lte=td)

            for b in bot_expenses:
                if b.trip:
                    r_key = f"{b.trip.pickup_location or 'Điểm lấy'} ➔ {b.trip.warehouse_location or 'Kho giao'}"
                    if r_key in routes_map:
                        routes_map[r_key]['actual_toll'] += int(b.amount)
                    total_toll += Decimal(b.amount)

            rows = list(routes_map.values())
            for r in rows:
                if r['trips_count'] > 0:
                    r['avg_profit_per_trip'] = int(r['gross_profit'] / r['trips_count'])

            rows.sort(key=lambda x: x['trips_count'], reverse=True)

            return Response({
                'success': True,
                'report_type': 'BY_ROUTE',
                'report_title': 'Báo Cáo Hiệu Quả Kinh Doanh & Chi Phí BOT Theo Tuyến Vận Tải',
                'kpis': {
                    'total_routes': len(rows),
                    'total_trips': sum(r['trips_count'] for r in rows),
                    'total_revenue': int(total_rev),
                    'total_toll_fee': int(total_toll),
                    'total_expense': int(total_exp),
                    'total_gross_profit': int(total_profit),
                },
                'headers': [
                    {'key': 'route_name', 'label': 'Tuyến Đường Vận Chuyển', 'align': 'left'},
                    {'key': 'trips_count', 'label': 'Số Chuyến', 'align': 'center'},
                    {'key': 'revenue', 'label': 'Doanh Thu Tuyến', 'align': 'right'},
                    {'key': 'actual_toll', 'label': 'Chi Phí Vé BOT', 'align': 'right'},
                    {'key': 'total_expense', 'label': 'Tổng Chi Phí Tuyến', 'align': 'right'},
                    {'key': 'gross_profit', 'label': 'Lợi Nhuận Tuyến', 'align': 'right'},
                    {'key': 'avg_profit_per_trip', 'label': 'Lợi Nhuận TB/Chuyến', 'align': 'right'},
                ],
                'rows': rows
            }, status=status.HTTP_200_OK)

        return Response({'error': 'Loại báo cáo không hợp lệ!'}, status=status.HTTP_400_BAD_REQUEST)


class AccountingReportDrilldownAPIView(APIView):
    """
    API 6: Báo Cáo Chi Tiết Chuyến Xe & Chi Phí Từng Đối Tượng (Drill-down).
    Hỗ trợ xem chi tiết toàn bộ các chuyến xe, bảng kê chi phí và phân tích tài chính
    cho từng Khách hàng, Tài xế, Xe bạn (3PL) hoặc Tuyến đường vận chuyển.
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]

    def get(self, request):
        report_type = request.GET.get('report_type') or request.GET.get('type') or 'BY_CUSTOMER'
        target_id = request.GET.get('target_id')
        target_key = request.GET.get('target_key') or ''
        from_date = request.GET.get('from_date')
        to_date = request.GET.get('to_date')

        trips_qs = DispatchTrip.objects.filter(is_deleted=False).select_related(
            'customer', 'driver', 'vehicle', 'booking_order'
        ).prefetch_related('expenses')

        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date, '%Y-%m-%d').date()
                trips_qs = trips_qs.filter(created_at__date__gte=fd)
            except ValueError:
                pass

        if to_date:
            try:
                td = datetime.datetime.strptime(to_date, '%Y-%m-%d').date()
                trips_qs = trips_qs.filter(created_at__date__lte=td)
            except ValueError:
                pass

        target_name = target_key or 'Đối Tượng'
        target_subtext = ''

        # 1. Drill-down theo Khách Hàng
        if report_type == 'BY_CUSTOMER':
            if target_id and target_id.isdigit() and int(target_id) > 0:
                trips_qs = trips_qs.filter(customer_id=int(target_id))
                cust = Customer.objects.filter(id=int(target_id)).first()
                if cust:
                    target_name = cust.name
                    target_subtext = f"Mã KH: {cust.code or 'KH'} | MST: {getattr(cust, 'tax_code', '') or 'Chưa có'}"
            else:
                trips_qs = trips_qs.filter(Q(customer__name=target_key) | Q(customer__isnull=True))
                target_name = target_key or 'Khách vãng lai'

        # 2. Drill-down theo Xe Bạn / Thầu Phụ 3PL
        elif report_type == 'BY_SUBCONTRACTOR':
            if target_key:
                trips_qs = trips_qs.filter(vehicle__license_plate=target_key)
                target_name = f"Đầu Kéo Xe Bạn: {target_key}"
                target_subtext = "Đơn vị vận tải / Thầu phụ ngoài (3PL)"
            elif target_id and target_id.isdigit():
                trips_qs = trips_qs.filter(vehicle_id=int(target_id))
                target_name = f"Xe Bạn #{target_id}"

        # 3. Drill-down theo Bác Tài
        elif report_type == 'BY_DRIVER':
            if target_id and target_id.isdigit():
                trips_qs = trips_qs.filter(driver_id=int(target_id))
                emp = Employee.objects.filter(id=int(target_id)).first()
                if emp:
                    target_name = emp.full_name or emp.nickname or f"Bác tài #{target_id}"
                    target_subtext = f"Mã NV: {emp.code or 'TX'} | SĐT: {emp.phone_number or 'Chưa có'}"
            elif target_key:
                trips_qs = trips_qs.filter(Q(driver__full_name=target_key) | Q(driver__nickname=target_key) | Q(driver__code=target_key))
                target_name = f"Bác Tài: {target_key}"

        # 4. Drill-down theo Tuyến Đường
        elif report_type == 'BY_ROUTE':
            if '➔' in target_key:
                parts = [p.strip() for p in target_key.split('➔')]
                p_from = parts[0]
                p_to = parts[1] if len(parts) > 1 else ''
                trips_qs = trips_qs.filter(pickup_location__icontains=p_from, warehouse_location__icontains=p_to)
            target_name = f"Tuyến: {target_key}"
            target_subtext = "Phân tích doanh thu cước, vé BOT và chi phí theo lộ trình"

        # Tính toán danh sách chi tiết chuyến xe
        trips_list = []
        all_trip_ids = []
        tot_rev = Decimal(0)
        tot_exp = Decimal(0)
        tot_reimb = Decimal(0)
        tot_profit = Decimal(0)
        tot_sub_payable = Decimal(0)

        for t in trips_qs.order_by('-created_at'):
            all_trip_ids.append(t.id)
            c_rev = int(t.cached_revenue)
            c_exp = int(t.cached_expense)
            c_prof = int(t.cached_profit)
            c_reimb = sum(e.amount for e in t.expenses.all() if not e.is_deleted and e.is_on_behalf_of_customer)
            
            sub_cost = int(t.subcontractor_cost or 0)
            sub_adv = int(t.subcontractor_advance or 0)
            sub_payable = max(0, sub_cost - sub_adv)

            tot_rev += Decimal(c_rev)
            tot_exp += Decimal(c_exp)
            tot_reimb += Decimal(c_reimb)
            tot_profit += Decimal(c_prof)
            tot_sub_payable += Decimal(sub_payable)

            trips_list.append({
                'id': t.id,
                'trip_code': t.trip_code,
                'created_date': t.created_at.strftime('%d/%m/%Y %H:%M'),
                'customer_name': t.customer.name if t.customer else 'Khách vãng lai',
                'driver_name': (t.driver.nickname or t.driver.full_name) if t.driver else 'Chưa gán',
                'driver_phone': getattr(t.driver, 'phone_number', '') if t.driver else '',
                'vehicle_plate': t.vehicle.license_plate if t.vehicle else 'Chưa gán',
                'vehicle_type': t.vehicle.get_ownership_type_display() if t.vehicle else 'Xe nhà',
                'container_number': t.container_number or 'Chưa cont',
                'container_type': t.container_type or '40GP',
                'seal_number': t.seal_number or '-',
                'route': f"{t.pickup_location or 'Cảng'} ➔ {t.warehouse_location or 'Kho'} ➔ {t.dropoff_location or 'Bãi hạ'}",
                'status': t.status,
                'status_display': t.get_status_display(),
                'revenue': c_rev,
                'operating_expense': c_exp,
                'reimbursable_expense': int(c_reimb),
                'gross_profit': c_prof,
                'subcontractor_cost': sub_cost,
                'subcontractor_advance': sub_adv,
                'subcontractor_payable': sub_payable,
                'is_expenses_settled': t.is_expenses_settled,
                'expenses_count': t.expenses.filter(is_deleted=False).count(),
            })

        # Lấy danh sách chi tiết các khoản chi phí phát sinh
        expenses_qs = TripExpense.objects.filter(
            trip_id__in=all_trip_ids,
            is_deleted=False
        ).select_related('trip', 'driver', 'vehicle', 'expense_item').order_by('-created_at')

        expenses_list = []
        for e in expenses_qs:
            expenses_list.append({
                'id': e.id,
                'trip_code': e.trip.trip_code if e.trip else '',
                'category': e.category,
                'category_display': e.get_category_display() if hasattr(e, 'get_category_display') else e.category,
                'expense_item_name': e.expense_item.name if e.expense_item else '',
                'amount': int(e.amount),
                'receipt_type_display': e.get_receipt_type_display() if hasattr(e, 'get_receipt_type_display') else e.receipt_type,
                'invoice_number': e.invoice_number or e.invoice_lookup_code or '',
                'is_on_behalf_of_customer': e.is_on_behalf_of_customer,
                'status': e.status,
                'status_display': e.get_status_display() if hasattr(e, 'get_status_display') else e.status,
                'created_at': e.created_at.strftime('%d/%m/%Y %H:%M'),
            })

        return Response({
            'success': True,
            'report_type': report_type,
            'target_name': target_name,
            'target_subtext': target_subtext,
            'summary': {
                'total_trips': len(trips_list),
                'total_revenue': int(tot_rev),
                'total_expense': int(tot_exp),
                'total_reimbursable': int(tot_reimb),
                'total_gross_profit': int(tot_profit),
                'total_subcontractor_payable': int(tot_sub_payable),
                'total_expenses_items': len(expenses_list),
            },
            'trips': trips_list,
            'expenses': expenses_list,
        }, status=status.HTTP_200_OK)
