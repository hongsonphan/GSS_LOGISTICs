import datetime
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q, F
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication

from core.security import GracefulJWTAuthentication
from core.permissions import IsAccountant, IsDispatcher, IsDispatcherOrAccountant
from apps.billing.models import (
    DispatcherAdvanceFund,
    DriverTripAdvance,
    FundStatus,
    DriverAdvanceStatus,
    AdvanceSourceType,
    SettlementDiffType,
    TripExpense,
    ApprovalStatus,
    PaymentMethod,
    TransactionType,
    CashFlowCategory,
    CashTransaction
)
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.personnel.models import Employee, Department, EmployeeRole


class AccountingAdvancesAPIView(APIView):
    """
    API Tổng Hợp & Quản Trị Tạm Ứng - Hoàn Ứng 2 Cấp:
    1. Quỹ Tạm Ứng Điều Vận (Kế toán & Giám đốc quản lý).
    2. Tạm Ứng & Hoàn Ứng Theo Chuyến Cho Tài Xế (Điều vận & Kế toán quản lý).
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsDispatcherOrAccountant]

    def get(self, request):
        today = timezone.now().date()

        # 1. Quỹ Điều Vận
        funds_qs = DispatcherAdvanceFund.objects.filter(is_deleted=False).select_related(
            'dispatcher', 'approved_by', 'settled_by'
        ).prefetch_related('trip_advances').order_by('-advance_date', '-id')

        funds_data = []
        total_dispatcher_funds = 0
        total_fund_disbursed = 0
        total_fund_settled = 0
        total_fund_remaining = 0

        for f in funds_qs:
            disbursed = f.total_disbursed
            settled_spent = f.total_settled_spent
            refunds = f.total_refunds_returned
            bal = f.remaining_balance

            if f.status == FundStatus.APPROVED:
                total_dispatcher_funds += int(f.amount)
                total_fund_disbursed += int(disbursed)
                total_fund_settled += int(settled_spent)
                total_fund_remaining += int(bal)

            funds_data.append({
                'id': f.id,
                'code': f.code,
                'dispatcher_name': f.dispatcher.nickname or f.dispatcher.full_name if f.dispatcher else 'Chưa gán',
                'amount': int(f.amount),
                'advance_date': f.advance_date.strftime('%d/%m/%Y') if f.advance_date else '',
                'purpose': f.purpose,
                'status': f.status,
                'status_label': f.get_status_display(),
                'disbursed_amount': int(disbursed),
                'settled_amount': int(settled_spent),
                'refunds_returned': int(refunds),
                'remaining_balance': int(bal),
                'approved_by': (f.approved_by.nickname or f.approved_by.full_name) if f.approved_by else '',
                'approved_at': f.approved_at.strftime('%d/%m/%Y %H:%M') if f.approved_at else '',
                'settled_by': (f.settled_by.nickname or f.settled_by.full_name) if f.settled_by else '',
                'settled_at': f.settled_at.strftime('%d/%m/%Y %H:%M') if f.settled_at else '',
                'notes': f.notes or ''
            })

        # 2. Tạm Ứng Chuyến Cho Tài Xế
        driver_advances_qs = DriverTripAdvance.objects.filter(is_deleted=False).select_related(
            'trip', 'trip__customer', 'trip__vehicle', 'driver', 'dispatcher_fund', 'settled_by'
        ).prefetch_related('trip__expenses').order_by('-advance_date', '-id')

        driver_advances_data = []
        total_driver_advance_amount = 0
        total_driver_actual_spent = 0
        total_refund_due = 0
        total_reimburse_due = 0
        pending_advances_count = 0
        settled_advances_count = 0

        for a in driver_advances_qs:
            # Lấy tổng chi phí thực tế của chuyến (nếu chưa chốt)
            if a.trip:
                trip_expenses_sum = sum(
                    e.amount for e in a.trip.expenses.all() if not e.is_deleted
                )
            else:
                trip_expenses_sum = 0

            # Nếu đã settled thì lấy theo a.actual_spent, nếu chưa thì tạm tính theo trip_expenses_sum
            actual_spent = int(a.actual_spent) if a.status == DriverAdvanceStatus.SETTLED else int(trip_expenses_sum)
            diff = int(a.amount) - actual_spent

            if a.status == DriverAdvanceStatus.ADVANCED:
                pending_advances_count += 1
                total_driver_advance_amount += int(a.amount)
                total_driver_actual_spent += actual_spent
                if diff > 0:
                    total_refund_due += diff
                elif diff < 0:
                    total_reimburse_due += abs(diff)
            elif a.status == DriverAdvanceStatus.SETTLED:
                settled_advances_count += 1

            driver_advances_data.append({
                'id': a.id,
                'code': a.code,
                'trip_code': a.trip.trip_code if a.trip else '-',
                'customer_name': a.trip.customer.name if (a.trip and a.trip.customer) else '-',
                'driver_name': a.driver.nickname or a.driver.full_name if a.driver else '-',
                'license_plate': a.trip.vehicle.license_plate if (a.trip and a.trip.vehicle) else '-',
                'amount': int(a.amount),
                'advance_date': a.advance_date.strftime('%d/%m/%Y') if a.advance_date else '',
                'advance_source': a.advance_source,
                'advance_source_label': a.get_advance_source_display(),
                'fund_code': a.dispatcher_fund.code if a.dispatcher_fund else 'Công ty chi trực tiếp',
                'purpose': a.purpose,
                'status': a.status,
                'status_label': a.get_status_display(),
                'actual_spent': actual_spent,
                'difference': diff,
                'settlement_diff_type': a.settlement_diff_type,
                'settlement_diff_label': a.get_settlement_diff_type_display(),
                'refund_amount': int(a.refund_amount),
                'reimburse_amount': int(a.reimburse_amount),
                'settled_at': a.settled_at.strftime('%d/%m/%Y %H:%M') if a.settled_at else '',
                'settled_by': (a.settled_by.nickname or a.settled_by.full_name) if a.settled_by else '',
                'settlement_notes': a.settlement_notes or '',
                'notes': a.notes or ''
            })

        # 3. Danh mục phục vụ Tạo mới
        # Chuyến xe có thể cấp tạm ứng (chưa chốt sổ kế toán hoặc đang chạy)
        trips_for_advance = DispatchTrip.objects.filter(
            is_deleted=False,
            is_expenses_settled=False
        ).select_related('customer', 'driver', 'vehicle').order_by('-created_at')[:50]

        available_trips_data = [{
            'id': t.id,
            'trip_code': t.trip_code,
            'customer_name': t.customer.name if t.customer else '-',
            'driver_id': t.driver_id,
            'driver_name': t.driver.nickname or t.driver.full_name if t.driver else 'Chưa gán',
            'license_plate': t.vehicle.license_plate if t.vehicle else 'Chưa gán',
            'current_advance': int(t.driver_advance_amount or 0),
            'advance_status': t.advance_settlement_status,
            'route': f"{t.pickup_location} ➔ {t.warehouse_location}"
        } for t in trips_for_advance]

        # Quỹ điều vận đang khả dụng
        active_funds = [{
            'id': f.id,
            'code': f.code,
            'dispatcher_name': f.dispatcher.nickname or f.dispatcher.full_name if f.dispatcher else '',
            'remaining_balance': int(f.remaining_balance)
        } for f in funds_qs if f.status == FundStatus.APPROVED and f.remaining_balance > 0]

        # Danh sách tài xế
        drivers = [{
            'id': d.id,
            'name': d.nickname or d.full_name,
            'code': d.code
        } for d in Employee.objects.filter(is_deleted=False, role=EmployeeRole.DRIVER).order_by('full_name')]

        # Danh sách nhân viên Điều vận
        dispatchers = [{
            'id': dp.id,
            'name': dp.nickname or dp.full_name,
            'code': dp.code
        } for dp in Employee.objects.filter(
            is_deleted=False
        ).filter(Q(role=EmployeeRole.DISPATCHER) | Q(department=Department.DISPATCH)).order_by('full_name')]

        return Response({
            'stats': {
                'total_dispatcher_funds': total_dispatcher_funds,
                'total_fund_disbursed': total_fund_disbursed,
                'total_fund_settled': total_fund_settled,
                'total_fund_remaining': total_fund_remaining,
                'total_driver_advance_amount': total_driver_advance_amount,
                'total_driver_actual_spent': total_driver_actual_spent,
                'pending_advances_count': pending_advances_count,
                'settled_advances_count': settled_advances_count,
                'total_refund_due': total_refund_due,
                'total_reimburse_due': total_reimburse_due,
            },
            'dispatcher_funds': funds_data,
            'driver_advances': driver_advances_data,
            'available_trips': available_trips_data,
            'active_funds': active_funds,
            'drivers': drivers,
            'dispatchers': dispatchers
        })


class DispatcherFundCreateAPIView(APIView):
    """API Tạo mới yêu cầu Tạm Ứng Quỹ từ Công ty cho Điều vận."""
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsDispatcherOrAccountant]

    def post(self, request):
        dispatcher_id = request.data.get('dispatcher_id')
        amount_raw = request.data.get('amount', 0)
        advance_date_raw = request.data.get('advance_date')
        purpose = request.data.get('purpose', 'Quỹ điều vận tạm ứng chuyến xe & chi phát sinh').strip()
        notes = request.data.get('notes', '').strip()

        try:
            amount = int(str(amount_raw).replace('.', '').replace(',', '').strip())
        except (ValueError, TypeError):
            return Response({'error': 'Số tiền tạm ứng không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'error': 'Số tiền tạm ứng quỹ phải lớn hơn 0 đ'}, status=status.HTTP_400_BAD_REQUEST)

        dispatcher = Employee.objects.filter(id=dispatcher_id, is_deleted=False).first()
        if not dispatcher:
            return Response({'error': 'Vui lòng chọn nhân viên Điều phối viên nhận tạm ứng'}, status=status.HTTP_400_BAD_REQUEST)

        advance_date = timezone.now().date()
        if advance_date_raw:
            try:
                advance_date = datetime.datetime.strptime(advance_date_raw, '%Y-%m-%d').date()
            except ValueError:
                pass

        # Sinh mã phiếu TUDV-YYYYMM-XXXX
        today = timezone.now().date()
        date_prefix = f"TUDV-{today.strftime('%Y%m')}"
        last_fund = DispatcherAdvanceFund.objects.filter(code__startswith=date_prefix).order_by('-id').first()
        seq = 1
        if last_fund and last_fund.code.split('-')[-1].isdigit():
            seq = int(last_fund.code.split('-')[-1]) + 1
        code = f"{date_prefix}-{seq:04d}"
        # Mặc định tạo phiếu là PENDING (chờ duyệt xuất quỹ), trừ khi có cờ auto_approve
        auto_approve = request.data.get('auto_approve', False)
        curr_emp = getattr(request.user, 'employee', None)
        is_approver = request.user.is_superuser or (curr_emp and curr_emp.role in [EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT])
        is_approved = is_approver and auto_approve
        
        fund = DispatcherAdvanceFund.objects.create(
            code=code,
            dispatcher=dispatcher,
            amount=amount,
            advance_date=advance_date,
            purpose=purpose,
            status=FundStatus.APPROVED if is_approved else FundStatus.PENDING,
            approved_by=curr_emp if is_approved else None,
            approved_at=timezone.now() if is_approved else None,
            notes=notes
        )

        return Response({
            'success': True,
            'message': f'Đã tạo phiếu tạm ứng quỹ {fund.code} thành công ({fund.get_status_display()})',
            'fund_id': fund.id,
            'code': fund.code
        })


class DispatcherFundActionAPIView(APIView):
    """API Phê duyệt hoặc Quyết toán hoàn ứng Quỹ Điều Vận."""
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]

    def post(self, request, pk):
        action = request.data.get('action') # approve, settle, reject
        notes = request.data.get('notes', '').strip()
        curr_emp = getattr(request.user, 'employee', None)

        with transaction.atomic():
            fund = DispatcherAdvanceFund.objects.select_for_update().filter(id=pk, is_deleted=False).first()
            if not fund:
                return Response({'error': 'Không tìm thấy phiếu tạm ứng quỹ'}, status=status.HTTP_404_NOT_FOUND)

            if action == 'approve':
                if fund.status != FundStatus.PENDING:
                    return Response({'error': f'Phiếu đang ở trạng thái "{fund.get_status_display()}", không thể duyệt lại'}, status=status.HTTP_400_BAD_REQUEST)
                fund.status = FundStatus.APPROVED
                fund.approved_by = curr_emp
                fund.approved_at = timezone.now()
                fund.save()
                return Response({'success': True, 'message': f'Đã duyệt xuất quỹ {fund.code} số tiền {fund.amount:,} đ'})

            elif action == 'settle':
                if fund.status != FundStatus.APPROVED:
                    return Response({'error': 'Chỉ có thể quyết toán hoàn ứng quỹ đang lưu hành (APPROVED)'}, status=status.HTTP_400_BAD_REQUEST)
                fund.status = FundStatus.SETTLED
                fund.settled_by = curr_emp
                fund.settled_at = timezone.now()
                fund.settlement_notes = notes or 'Kế toán đã nhận đủ chứng từ và thu hồi số dư hoàn ứng về công ty.'
                fund.save()
                return Response({'success': True, 'message': f'Đã quyết toán hoàn tất quỹ điều vận {fund.code} về công ty'})

            elif action == 'reject':
                fund.status = FundStatus.REJECTED
                fund.save()
                return Response({'success': True, 'message': f'Đã từ chối cấp quỹ {fund.code}'})

        return Response({'error': 'Thao tác không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)


class DriverAdvanceCreateAPIView(APIView):
    """API Cấp Tạm Ứng Chuyến Cho Tài Xế (Từ Quỹ Điều Vận hoặc Công Ty Chi Trực Tiếp)."""
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsDispatcherOrAccountant]

    def post(self, request):
        trip_id = request.data.get('trip_id')
        driver_id = request.data.get('driver_id')
        dispatcher_fund_id = request.data.get('dispatcher_fund_id')
        amount_raw = request.data.get('amount', 0)
        advance_date_raw = request.data.get('advance_date')
        advance_source = request.data.get('advance_source', AdvanceSourceType.DISPATCHER_FUND)
        purpose = request.data.get('purpose', 'Chi phí cầu đường BOT, nâng hạ, cược cont').strip()
        notes = request.data.get('notes', '').strip()
        try:
            amount = int(str(amount_raw).replace('.', '').replace(',', '').strip())
        except (ValueError, TypeError):
            return Response({'error': 'Số tiền tạm ứng không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'error': 'Số tiền tạm ứng chuyến phải lớn hơn 0 đ'}, status=status.HTTP_400_BAD_REQUEST)

        advance_date = timezone.now().date()
        if advance_date_raw:
            try:
                advance_date = datetime.datetime.strptime(advance_date_raw, '%Y-%m-%d').date()
            except ValueError:
                pass

        # Sinh mã phiếu TUTX-YYYYMM-XXXX
        today = timezone.now().date()
        date_prefix = f"TUTX-{today.strftime('%Y%m')}"
        last_adv = DriverTripAdvance.objects.filter(code__startswith=date_prefix).order_by('-id').first()
        seq = 1
        if last_adv and last_adv.code.split('-')[-1].isdigit():
            seq = int(last_adv.code.split('-')[-1]) + 1
        code = f"{date_prefix}-{seq:04d}"

        with transaction.atomic():
            trip = DispatchTrip.objects.select_for_update().filter(id=trip_id, is_deleted=False).first()
            if not trip:
                return Response({'error': 'Vui lòng chọn chuyến xe hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

            driver = Employee.objects.filter(id=driver_id, is_deleted=False).first() if driver_id else trip.driver
            if not driver:
                return Response({'error': 'Chuyến xe này chưa được gán tài xế nhận tạm ứng'}, status=status.HTTP_400_BAD_REQUEST)

            fund = None
            if advance_source == AdvanceSourceType.DISPATCHER_FUND:
                if dispatcher_fund_id:
                    fund = DispatcherAdvanceFund.objects.select_for_update().filter(id=dispatcher_fund_id, is_deleted=False, status=FundStatus.APPROVED).first()
                else:
                    # Tự động lấy quỹ điều vận đang còn dư khả dụng
                    fund = DispatcherAdvanceFund.objects.select_for_update().filter(status=FundStatus.APPROVED, is_deleted=False).first()

                if not fund:
                    return Response({'error': 'Không tìm thấy Quỹ Điều Vận khả dụng để trích tiền. Vui lòng chọn "Công ty chi trực tiếp" hoặc tạo Quỹ Điều Vận mới.'}, status=status.HTTP_400_BAD_REQUEST)

                if fund.remaining_balance < amount:
                    return Response({'error': f'Số dư Quỹ Điều Vận ({fund.code}) chỉ còn {fund.remaining_balance:,} đ, không đủ để tạm ứng {amount:,} đ'}, status=status.HTTP_400_BAD_REQUEST)

            advance = DriverTripAdvance.objects.create(
                code=code,
                trip=trip,
                driver=driver,
                dispatcher_fund=fund,
                advance_source=advance_source,
                amount=amount,
                advance_date=advance_date,
                purpose=purpose,
                status=DriverAdvanceStatus.ADVANCED,
                notes=notes
            )

            # Cập nhật thông tin vào DispatchTrip
            trip.driver_advance_amount = (trip.driver_advance_amount or 0) + amount
            trip.advance_settlement_status = 'ADVANCED'
            trip.save(update_fields=['driver_advance_amount', 'advance_settlement_status'])

        return Response({
            'success': True,
            'message': f'Đã cấp tạm ứng chuyến {code} cho tài xế {driver.full_name} ({amount:,} đ) thành công!',
            'advance_id': advance.id,
            'code': advance.code
        })


class DriverAdvanceSettleAPIView(APIView):
    """API Quyết Toán Hoàn Ứng Chuyến Cho Tài Xế (Điều Vận hoặc Kế Toán Đối Soát Thực Chi & Chênh Lệch)."""
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsDispatcherOrAccountant]

    def post(self, request, pk):
        with transaction.atomic():
            advance = DriverTripAdvance.objects.select_for_update().filter(id=pk, is_deleted=False).first()
            if not advance:
                return Response({'error': 'Không tìm thấy phiếu tạm ứng chuyến'}, status=status.HTTP_404_NOT_FOUND)

            if advance.status == DriverAdvanceStatus.SETTLED:
                return Response({'error': 'Phiếu tạm ứng này đã được quyết toán hoàn ứng trước đó'}, status=status.HTTP_400_BAD_REQUEST)

            # Lấy số tiền thực chi từ request hoặc tự động tính từ các khoản TripExpense của chuyến
            actual_spent_raw = request.data.get('actual_spent')
            settlement_notes = request.data.get('settlement_notes', '').strip()

            if actual_spent_raw is not None and str(actual_spent_raw).strip() != '':
                try:
                    actual_spent = int(str(actual_spent_raw).replace('.', '').replace(',', '').strip())
                except ValueError:
                    return Response({'error': 'Số tiền thực tế chi không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Tự động tính từ các hóa đơn chứng từ đã tạo trên chuyến
                trip_expenses = advance.trip.expenses.filter(is_deleted=False)
                actual_spent = int(sum(e.amount for e in trip_expenses))

            advance_amt = int(advance.amount)
            diff = advance_amt - actual_spent

            refund_amount = 0
            reimburse_amount = 0
            if diff > 0:
                # Tạm ứng nhiều hơn thực chi -> Tài xế trả lại tiền thừa
                diff_type = SettlementDiffType.DRIVER_REFUND
                refund_amount = diff
            elif diff < 0:
                # Thực chi nhiều hơn tạm ứng -> Cty / Điều vận chi bù thêm
                diff_type = SettlementDiffType.COMPANY_REIMBURSE
                reimburse_amount = abs(diff)
            else:
                diff_type = SettlementDiffType.BALANCED

            curr_emp = getattr(request.user, 'employee', None)
            advance.status = DriverAdvanceStatus.SETTLED
            advance.actual_spent = actual_spent
            advance.settlement_diff_type = diff_type
            advance.refund_amount = refund_amount
            advance.reimburse_amount = reimburse_amount
            advance.settled_at = timezone.now()
            advance.settled_by = curr_emp
            advance.settlement_notes = settlement_notes or (
                f"Đã đối soát hoàn tất. Ứng: {advance_amt:,} đ | Thực chi: {actual_spent:,} đ. "
                + (f"Tài xế đã nộp lại tiền thừa: {refund_amount:,} đ." if refund_amount > 0 else "")
                + (f"Công ty đã chi trả bù cho tài xế: {reimburse_amount:,} đ." if reimburse_amount > 0 else "")
                + ("Số liệu cân bằng chính xác." if diff == 0 else "")
            )
            advance.save()

            # Cập nhật trạng thái hoàn ứng chuyến nếu tất cả tạm ứng của chuyến đã chốt
            remaining_advances = advance.trip.driver_advances.filter(is_deleted=False, status=DriverAdvanceStatus.ADVANCED).count()
            if remaining_advances == 0:
                advance.trip.advance_settlement_status = 'SETTLED'
                advance.trip.save(update_fields=['advance_settlement_status'])

        return Response({
            'success': True,
            'message': f'Đã quyết toán hoàn ứng chuyến {advance.code} thành công!',
            'difference': diff,
            'diff_type': diff_type,
            'refund_amount': refund_amount,
            'reimburse_amount': reimburse_amount
        })


class DriverBatchSettlementQueryAPIView(APIView):
    """
    API Truy vấn & Gom Chuyến Quyết Toán Chi Phí Tài Xế theo Đợt:
    - Khoảng thời gian: Từ ngày -> Đến ngày
    - Gom nhóm theo: Tài Xế (Driver), Đầu Xe (Vehicle), hoặc Ngày Chạy (Date)
    - Tự động đối soát Tạm ứng vs Thực chi và tính chênh lệch tổng hợp.
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsDispatcherOrAccountant]

    def get(self, request):
        from_date_str = request.query_params.get('from_date')
        to_date_str = request.query_params.get('to_date')
        driver_id = request.query_params.get('driver_id')
        vehicle_id = request.query_params.get('vehicle_id')
        customer_id = request.query_params.get('customer_id')
        group_by = request.query_params.get('group_by', 'driver') # 'driver', 'customer', 'vehicle', 'date'
        settle_filter = request.query_params.get('settlement_status', 'ALL') # 'ALL', 'PENDING', 'SETTLED'

        trips_qs = DispatchTrip.objects.filter(
            is_deleted=False,
            status=TripStatus.COMPLETED
        ).select_related(
            'driver', 'vehicle', 'customer', 'booking_order'
        ).prefetch_related(
            'expenses', 'driver_advances', 'documents'
        ).order_by('-loading_date', '-id')

        if from_date_str:
            try:
                from_date = datetime.datetime.strptime(from_date_str, '%Y-%m-%d').date()
                trips_qs = trips_qs.filter(loading_date__gte=from_date)
            except ValueError:
                pass

        if to_date_str:
            try:
                to_date = datetime.datetime.strptime(to_date_str, '%Y-%m-%d').date()
                trips_qs = trips_qs.filter(loading_date__lte=to_date)
            except ValueError:
                pass

        if driver_id:
            trips_qs = trips_qs.filter(driver_id=driver_id)

        if vehicle_id:
            trips_qs = trips_qs.filter(vehicle_id=vehicle_id)

        if customer_id:
            trips_qs = trips_qs.filter(customer_id=customer_id)

        if settle_filter == 'PENDING':
            trips_qs = trips_qs.filter(is_expenses_settled=False)
        elif settle_filter == 'SETTLED':
            trips_qs = trips_qs.filter(is_expenses_settled=True)

        # Gom nhóm theo group_by
        grouped_data = {}
        total_trips_count = 0
        grand_total_advance = 0
        grand_total_spent = 0

        for trip in trips_qs:
            total_trips_count += 1
            # Tính tổng tạm ứng của chuyến
            advances_list = [a for a in trip.driver_advances.all() if not a.is_deleted]
            trip_advance = int(sum(a.amount for a in advances_list))

            # Tính tổng thực chi của chuyến (các khoản hợp lệ chưa bị xóa / reject)
            expenses_list = [e for e in trip.expenses.all() if not e.is_deleted and e.status != ApprovalStatus.REJECTED]
            trip_spent = int(sum(e.amount for e in expenses_list))

            trip_diff = trip_advance - trip_spent # >0: tài xế nộp thừa, <0: cty chi bù
            grand_total_advance += trip_advance
            grand_total_spent += trip_spent

            trip_item = {
                'id': trip.id,
                'trip_code': trip.trip_code,
                'loading_date': trip.loading_date.strftime('%d/%m/%Y') if trip.loading_date else '-',
                'loading_date_raw': trip.loading_date.strftime('%Y-%m-%d') if trip.loading_date else '',
                'customer_name': trip.customer.name if trip.customer else '-',
                'route': f"{trip.pickup_location or 'Cảng'} ➔ {trip.warehouse_location or 'Kho'}",
                'container_number': trip.container_number or '-',
                'seal_number': trip.seal_number or '-',
                'driver_id': trip.driver_id,
                'driver_name': (trip.driver.nickname or trip.driver.full_name) if trip.driver else 'Chưa gán tài',
                'driver_phone': trip.driver.phone_number if trip.driver else '',
                'vehicle_id': trip.vehicle_id,
                'license_plate': trip.vehicle.license_plate if trip.vehicle else '-',
                'status': trip.status,
                'status_label': trip.get_status_display(),
                'is_settled': trip.is_expenses_settled,
                'advance_amount': trip_advance,
                'actual_spent': trip_spent,
                'diff': trip_diff,
                'expenses_count': len(expenses_list),
                'advances_count': len(advances_list),
                'has_pod': trip.documents.filter(document_type__in=['POD', 'E_POD', 'DELIVERY_NOTE'], is_verified=True).exists(),
            }

            # Xác định khóa gom nhóm
            if group_by == 'customer':
                group_key = f"cust_{trip.customer_id or 0}"
                cust_name = trip.customer.name if trip.customer else 'Khách Vãng Lai'
                cust_phone = trip.customer.phone if (trip.customer and trip.customer.phone) else ''
                group_label = f"Khách Hàng: {cust_name}"
                group_sub = f"Mã KH: {trip.customer.code if trip.customer else '-'} {(' · SĐT: ' + cust_phone) if cust_phone else ''}"
            elif group_by == 'vehicle':
                group_key = f"xe_{trip.vehicle_id or 0}"
                group_label = f"Đầu Xe: {trip.vehicle.license_plate if trip.vehicle else 'Chưa gán xe'}"
                group_sub = f"Tài xế phụ trách: {(trip.driver.nickname or trip.driver.full_name) if trip.driver else '-'}"
            elif group_by == 'date':
                d_str = trip.loading_date.strftime('%d/%m/%Y') if trip.loading_date else 'Không ngày'
                group_key = f"date_{trip.loading_date.strftime('%Y%m%d') if trip.loading_date else 'none'}"
                group_label = f"Ngày Vận Hành: {d_str}"
                group_sub = f"Các chuyến chạy trong ngày {d_str}"
            else: # default: driver
                group_key = f"driver_{trip.driver_id or 0}"
                driver_name = (trip.driver.nickname or trip.driver.full_name) if trip.driver else 'Chưa gán tài xế'
                group_label = f"Tài Xế: {driver_name}"
                group_sub = f"SĐT: {trip.driver.phone_number if trip.driver else '-'} | Xe thường trực: {trip.vehicle.license_plate if trip.vehicle else '-'}"

            if group_key not in grouped_data:
                grouped_data[group_key] = {
                    'group_key': group_key,
                    'group_label': group_label,
                    'group_sub': group_sub,
                    'driver_id': trip.driver_id,
                    'vehicle_id': trip.vehicle_id,
                    'total_trips': 0,
                    'settled_trips': 0,
                    'pending_trips': 0,
                    'total_advance': 0,
                    'total_spent': 0,
                    'total_diff': 0,
                    'trips': []
                }

            g = grouped_data[group_key]
            g['total_trips'] += 1
            if trip.is_expenses_settled:
                g['settled_trips'] += 1
            else:
                g['pending_trips'] += 1
            g['total_advance'] += trip_advance
            g['total_spent'] += trip_spent
            g['total_diff'] += trip_diff
            g['trips'].append(trip_item)

        groups_list = list(grouped_data.values())

        return Response({
            'success': True,
            'summary': {
                'total_trips': total_trips_count,
                'total_groups': len(groups_list),
                'grand_total_advance': grand_total_advance,
                'grand_total_spent': grand_total_spent,
                'grand_total_diff': grand_total_advance - grand_total_spent,
            },
            'groups': groups_list
        })


class DriverBatchSettlementExecuteAPIView(APIView):
    """
    API Thực Thi Quyết Toán Gom Chuyến Hàng Loạt:
    - Khóa sổ chi phí các chuyến xe được chọn (is_expenses_settled = True).
    - Quyết toán tất cả các phiếu tạm ứng của các chuyến này.
    - Tự động tạo bút toán Sổ Quỹ (CashTransaction) cho phần chênh lệch (Chi bù hoặc Thu hồi).
    """
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsDispatcherOrAccountant]

    def post(self, request):
        trip_ids = request.data.get('trip_ids', [])
        if not trip_ids or not isinstance(trip_ids, list):
            return Response({'error': 'Vui lòng chọn ít nhất một chuyến xe để quyết toán gom'}, status=status.HTTP_400_BAD_REQUEST)

        settlement_notes = request.data.get('settlement_notes', '').strip()
        payment_method = request.data.get('payment_method', PaymentMethod.BANK)
        auto_create_cash = request.data.get('auto_create_cash_transaction', True)
        curr_emp = getattr(request.user, 'employee', None)

        trips = DispatchTrip.objects.filter(id__in=trip_ids, is_deleted=False).select_related('driver', 'vehicle')
        if not trips.exists():
            return Response({'error': 'Không tìm thấy các chuyến xe tương ứng'}, status=status.HTTP_404_NOT_FOUND)

        # Kiểm tra điều kiện chỉ quyết toán các chuyến đã COMPLETED
        uncompleted_trips = trips.exclude(status=TripStatus.COMPLETED)
        if uncompleted_trips.exists():
            codes = ", ".join(uncompleted_trips.values_list('trip_code', flat=True)[:3])
            return Response({
                'error': f'Không thể quyết toán vì có chuyến chưa hoàn thành ({codes}). Chỉ được quyết toán các chuyến đã ở trạng thái ĐÃ HOÀN THÀNH (COMPLETED)!'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        total_advance_all = 0
        total_spent_all = 0
        settled_trip_codes = []

        with transaction.atomic():
            for trip in trips:
                settled_trip_codes.append(trip.trip_code)

                # 1. Khóa sổ chi phí chuyến xe
                trip.is_expenses_settled = True
                trip.settled_at = now
                trip.settled_by = curr_emp
                trip.advance_settlement_status = 'SETTLED'
                trip.save(update_fields=['is_expenses_settled', 'settled_at', 'settled_by', 'advance_settlement_status'])

                # 2. Chốt các khoản chi phí của chuyến
                trip.expenses.filter(is_deleted=False).exclude(status=ApprovalStatus.REJECTED).update(
                    status=ApprovalStatus.SETTLED
                )

                # 3. Tính tiền của chuyến
                advances = trip.driver_advances.filter(is_deleted=False)
                t_adv = int(sum(a.amount for a in advances))
                t_exp = int(sum(e.amount for e in trip.expenses.filter(is_deleted=False).exclude(status=ApprovalStatus.REJECTED)))
                total_advance_all += t_adv
                total_spent_all += t_exp

                # 4. Quyết toán từng phiếu tạm ứng
                for adv in advances.filter(status=DriverAdvanceStatus.ADVANCED):
                    adv.status = DriverAdvanceStatus.SETTLED
                    adv.actual_spent = t_exp
                    diff_one = int(adv.amount) - t_exp
                    if diff_one > 0:
                        adv.settlement_diff_type = SettlementDiffType.DRIVER_REFUND
                        adv.refund_amount = diff_one
                        adv.reimburse_amount = 0
                    elif diff_one < 0:
                        adv.settlement_diff_type = SettlementDiffType.COMPANY_REIMBURSE
                        adv.refund_amount = 0
                        adv.reimburse_amount = abs(diff_one)
                    else:
                        adv.settlement_diff_type = SettlementDiffType.BALANCED
                        adv.refund_amount = 0
                        adv.reimburse_amount = 0
                    adv.settled_at = now
                    adv.settled_by = curr_emp
                    adv.settlement_notes = f"Quyết toán gom đợt: {settlement_notes}" if settlement_notes else "Quyết toán gom nhiều chuyến"
                    adv.save()

            # 5. Xử lý Chênh lệch toàn đợt vào Sổ Quỹ Thu Chi
            net_diff = total_advance_all - total_spent_all # >0: thu lại tiền thừa, <0: chi trả bù
            cash_tx_code = ''

            if auto_create_cash and net_diff != 0:
                today_date = now.date()
                if net_diff > 0:
                    # Thu tiền thừa từ tài xế
                    tx_type = TransactionType.INFLOW
                    tx_category = CashFlowCategory.ADVANCE_REFUND
                    tx_amount = net_diff
                    tx_prefix = f"PT-{today_date.strftime('%Y%m')}"
                    partner_name = (trips.first().driver.full_name if trips.first().driver else 'Tài xế')
                    tx_notes = f"Thu hoàn ứng tiền thừa quyết toán gom {len(trip_ids)} chuyến: {', '.join(settled_trip_codes[:5])}"
                else:
                    # Chi bù tiền vượt ứng cho tài xế
                    tx_type = TransactionType.OUTFLOW
                    tx_category = CashFlowCategory.ADVANCE_REIMBURSE
                    tx_amount = abs(net_diff)
                    tx_prefix = f"PC-{today_date.strftime('%Y%m')}"
                    partner_name = (trips.first().driver.full_name if trips.first().driver else 'Tài xế')
                    tx_notes = f"Chi bù vượt ứng quyết toán gom {len(trip_ids)} chuyến: {', '.join(settled_trip_codes[:5])}"

                last_tx = CashTransaction.objects.filter(code__startswith=tx_prefix).order_by('-id').first()
                seq = 1
                if last_tx and last_tx.code.split('-')[-1].isdigit():
                    seq = int(last_tx.code.split('-')[-1]) + 1
                cash_tx_code = f"{tx_prefix}-{seq:04d}"

                CashTransaction.objects.create(
                    code=cash_tx_code,
                    transaction_type=tx_type,
                    payment_method=payment_method,
                    category=tx_category,
                    amount=tx_amount,
                    transaction_date=today_date,
                    partner_type='DRIVER',
                    partner_name=partner_name,
                    ref_code=', '.join(settled_trip_codes[:3]),
                    created_by=curr_emp,
                    notes=settlement_notes or tx_notes
                )

        return Response({
            'success': True,
            'message': f'Đã quyết toán gom thành công {len(trip_ids)} chuyến xe!',
            'settled_trips_count': len(trip_ids),
            'total_advance': total_advance_all,
            'total_spent': total_spent_all,
            'net_difference': net_diff,
            'cash_transaction_code': cash_tx_code
        })

