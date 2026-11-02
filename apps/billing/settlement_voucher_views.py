"""
Phiếu Quyết Toán cho Tài xế / Đối tác 3PL / Khách hàng.

Quy trình: chọn chuyến -> lập phiếu (bảng kê để rà soát, lưu nháp) -> Duyệt (khóa chuyến, tùy chọn phát sinh phiếu Thu/Chi)
-> có thể Mở lại để Sửa | Lưu | Xóa | In.
Bảng kê của từng đối tượng chỉ chứa thông tin liên quan: tài xế/đối tác không thấy giá cước khách hàng,
khách hàng không thấy chi phí tài xế/đối tác.
"""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import (
    ApprovalStatus, CashFlowCategory, CashTransaction, DriverAdvanceStatus, PaymentMethod, SettlementDiffType,
    SettlementVoucher, TransactionType, VoucherPartyType, VoucherStatus,
)
from apps.dispatch.models import DispatchTrip, TripStatus
from core.permissions import CanViewSettlementVoucherReport, IsAccountant
from core.security import GracefulJWTAuthentication
from core.sequences import next_code

PARTY_PREFIX = {'DRIVER': 'QT-TX', 'PARTNER': 'QT-DT', 'CUSTOMER': 'QT-KH'}
CASH_PARTNER = {'DRIVER': 'DRIVER', 'PARTNER': 'SUBCONTRACTOR', 'CUSTOMER': 'CUSTOMER'}


def _live_expenses(trip):
    return [e for e in trip.expenses.all() if not e.is_deleted and e.status != ApprovalStatus.REJECTED]


def _trip_base(trip):
    return {
        'trip_id': trip.id,
        'trip_code': trip.trip_code,
        'date': trip.loading_date.strftime('%d/%m/%Y') if trip.loading_date else '',
        'container_number': trip.container_number or '',
        'container_type': trip.container_type or '',
        'route': f"{trip.pickup_location or 'Cảng'} ➔ {trip.warehouse_location or 'Kho'}",
    }


def build_line(party_type, trip, adjustment=0, split_ratio=None):
    """Bản chụp một chuyến cho bảng kê; chỉ đưa vào các trường phù hợp với đối tượng quyết toán."""
    line = _trip_base(trip)
    expenses = _live_expenses(trip)
    if party_type == VoucherPartyType.DRIVER:
        advance = int(sum(a.amount for a in trip.driver_advances.all() if not a.is_deleted))
        spent = int(sum(e.amount for e in expenses))
        line.update({
            'driver_name': (trip.driver.nickname or trip.driver.full_name) if trip.driver else '',
            'license_plate': trip.vehicle.license_plate if trip.vehicle else '',
            'expense_lines': [{'name': e.expense_name, 'leg': e.get_trip_leg_display(), 'amount': int(e.amount)} for e in expenses],
            'advance': advance,
            'spent': spent,
            'is_split_trip': trip.is_split_trip,
            'dropoff_driver_name': (trip.dropoff_driver.nickname or trip.dropoff_driver.full_name) if trip.dropoff_driver else '',
            'split_ratio': float(split_ratio if split_ratio is not None else (trip.driver_split_ratio or 50)),
            # >0: tài xế nộp lại tiền thừa; <0: công ty chi bù
            'total': advance - spent - adjustment,
        })
    elif party_type == VoucherPartyType.PARTNER:
        reimb = [e for e in expenses if e.reimburse_to_subcontractor]
        cost = int(trip.subcontractor_cost or 0)
        advance = int(trip.subcontractor_advance or 0)
        reimb_total = int(sum(e.amount for e in reimb))
        line.update({
            'license_plate': trip.vehicle.license_plate if trip.vehicle else '',
            'driver_name': trip.assigned_driver_name or '',
            'freight_cost': cost,
            'expense_lines': [{'name': e.expense_name, 'leg': e.get_trip_leg_display(), 'amount': int(e.amount)} for e in reimb],
            'advance': advance,
            'total': cost + reimb_total - advance + adjustment,
        })
    else:
        obh = [e for e in expenses if e.is_on_behalf_of_customer]
        revenue = int(trip.cached_revenue or 0)
        line.update({
            'booking_or_bill': trip.booking_or_bill or '',
            'freight': revenue,
            'expense_lines': [{'name': e.expense_name, 'leg': '', 'amount': int(e.amount)} for e in obh],
            'total': revenue + int(sum(e.amount for e in obh)) + adjustment,
        })
    line['adjustment'] = adjustment
    return line


def _totals(party_type, lines):
    net = sum(int(l['total']) for l in lines)
    if party_type == VoucherPartyType.DRIVER:
        return abs(net), ('RECEIVE' if net > 0 else 'PAY')
    if party_type == VoucherPartyType.PARTNER:
        return abs(net), 'PAY'
    return abs(net), 'RECEIVE'


def _party_of(party_type, trip):
    if party_type == VoucherPartyType.DRIVER:
        return str(trip.driver_id or ''), (trip.driver.nickname or trip.driver.full_name) if trip.driver else 'Tài xế'
    if party_type == VoucherPartyType.PARTNER:
        sub = trip.subcontractor
        return str(sub.id if sub else ''), (sub.name if sub else (trip.carrier_name or 'Đối tác 3PL'))
    return str(trip.customer_id or ''), trip.customer.name if trip.customer else 'Khách hàng'


def serialize(v, with_lines=True):
    data = {
        'id': v.id, 'code': v.code, 'party_type': v.party_type, 'party_type_label': v.get_party_type_display(),
        'party_name': v.party_name, 'amount': int(v.amount), 'direction': v.direction,
        'status': v.status, 'status_label': v.get_status_display(), 'with_cash': v.with_cash,
        'payment_method': v.payment_method, 'notes': v.notes, 'trips_count': len(v.lines or []),
        'cash_transaction_code': v.cash_transaction.code if v.cash_transaction else '',
        'created_at': v.created_at.strftime('%d/%m/%Y %H:%M'),
        'approved_at': v.approved_at.strftime('%d/%m/%Y %H:%M') if v.approved_at else '',
    }
    if with_lines:
        data['lines'] = v.lines
    return data


def _parse_maps(data):
    try:
        ratios = {int(k): float(x) for k, x in (data.get('split_ratios') or {}).items()}
        adjusts = {int(k): int(x) for k, x in (data.get('adjustments') or {}).items()}
    except (TypeError, ValueError, AttributeError):
        return None, None, 'Tỷ lệ thù lao hoặc số phát sinh không hợp lệ'
    if any(r < 0 or r > 100 for r in ratios.values()):
        return None, None, 'Tỷ lệ thù lao phải nằm trong khoảng 0 - 100%'
    return ratios, adjusts, ''


def _already_settled(party_type, trip):
    if party_type == VoucherPartyType.DRIVER:
        return trip.is_expenses_settled
    if party_type == VoucherPartyType.PARTNER:
        return trip.subcontractor_settlement_status == 'SETTLED'
    return trip.is_customer_settled


class SettlementVoucherListCreateAPIView(APIView):
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]
    access_actions = {'POST': 'create'}

    def get(self, request):
        qs = SettlementVoucher.objects.filter(is_deleted=False).select_related('cash_transaction')
        for param, field in (('party_type', 'party_type'), ('status', 'status')):
            if request.query_params.get(param):
                qs = qs.filter(**{field: request.query_params[param]})
        return Response({'success': True, 'vouchers': [serialize(v, with_lines=False) for v in qs[:300]]})

    @transaction.atomic
    def post(self, request):
        party_type = request.data.get('party_type')
        if party_type not in VoucherPartyType.values:
            return Response({'error': 'Đối tượng quyết toán không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)
        trip_ids = request.data.get('trip_ids') or []
        if not trip_ids and request.data.get('trip_codes'):
            trip_ids = list(DispatchTrip.objects.filter(trip_code__in=request.data['trip_codes'], is_deleted=False).values_list('id', flat=True))
        if not isinstance(trip_ids, list) or not trip_ids:
            return Response({'error': 'Vui lòng chọn ít nhất một chuyến để quyết toán'}, status=status.HTTP_400_BAD_REQUEST)
        ratios, adjusts, err = _parse_maps(request.data)
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        trips = list(DispatchTrip.objects.filter(id__in=trip_ids, is_deleted=False).select_related(
            'driver', 'vehicle', 'customer', 'subcontractor', 'dropoff_driver').prefetch_related('expenses', 'driver_advances'))
        if len(trips) != len(set(trip_ids)):
            return Response({'error': 'Có chuyến không tồn tại'}, status=status.HTTP_404_NOT_FOUND)
        if party_type == VoucherPartyType.DRIVER and any(
                t.status in (TripStatus.DRAFT, TripStatus.DISPATCHED, TripStatus.IN_TRANSIT, TripStatus.CANCELLED) for t in trips):
            return Response({'error': 'Chỉ quyết toán các chuyến đã đến kho giao hoặc hoàn thành'}, status=status.HTTP_400_BAD_REQUEST)
        done = [t.trip_code for t in trips if _already_settled(party_type, t)]
        if done:
            return Response({'error': f'Chuyến đã quyết toán: {", ".join(done[:5])}'}, status=status.HTTP_400_BAD_REQUEST)
        taken = SettlementVoucher.objects.filter(
            is_deleted=False, party_type=party_type, trips__in=[t.id for t in trips]).values_list('code', flat=True).distinct()
        if taken:
            return Response({'error': f'Chuyến đã nằm trong phiếu quyết toán khác: {", ".join(list(taken)[:3])}'}, status=status.HTTP_400_BAD_REQUEST)

        parties = {_party_of(party_type, t) for t in trips}
        if len(parties) > 1:
            return Response({'error': 'Mỗi phiếu chỉ gồm các chuyến của cùng một đối tượng quyết toán'}, status=status.HTTP_400_BAD_REQUEST)
        party_ref, party_name = parties.pop()

        lines = [build_line(party_type, t, adjusts.get(t.id, 0), ratios.get(t.id)) for t in trips]
        amount, direction = _totals(party_type, lines)
        code = next_code(SettlementVoucher, 'code', f"{PARTY_PREFIX[party_type]}.{timezone.now().strftime('%y%m')}.", 3)
        voucher = SettlementVoucher.objects.create(
            code=code, party_type=party_type, party_ref=party_ref, party_name=party_name, lines=lines,
            amount=amount, direction=direction, notes=(request.data.get('notes') or '').strip(),
            with_cash=bool(request.data.get('with_cash')),
            payment_method=request.data.get('payment_method') or PaymentMethod.BANK,
            created_by=getattr(request.user, 'employee', None),
        )
        voucher.trips.set(trips)
        return Response({'success': True, 'voucher': serialize(voucher)}, status=status.HTTP_201_CREATED)


class SettlementVoucherDetailAPIView(APIView):
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]
    access_actions = {'PUT': 'edit', 'PATCH': 'edit', 'DELETE': 'delete'}

    def _get(self, pk):
        return SettlementVoucher.objects.filter(pk=pk, is_deleted=False).select_related('cash_transaction').first()

    def get(self, request, pk):
        v = self._get(pk)
        if not v:
            return Response({'error': 'Không tìm thấy phiếu quyết toán'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'voucher': serialize(v)})

    @transaction.atomic
    def put(self, request, pk):
        v = self._get(pk)
        if not v:
            return Response({'error': 'Không tìm thấy phiếu quyết toán'}, status=status.HTTP_404_NOT_FOUND)
        if v.status != VoucherStatus.DRAFT:
            return Response({'error': 'Phiếu đã duyệt, cần Mở lại phiếu trước khi chỉnh sửa'}, status=status.HTTP_400_BAD_REQUEST)
        ratios, adjusts, err = _parse_maps(request.data)
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        old = {l['trip_id']: l for l in v.lines}
        trips = v.trips.select_related('driver', 'vehicle', 'customer', 'subcontractor', 'dropoff_driver').prefetch_related('expenses', 'driver_advances')
        lines = []
        for t in trips:
            prev = old.get(t.id, {})
            adj = adjusts.get(t.id, prev.get('adjustment', 0)) if 'adjustments' in request.data else prev.get('adjustment', 0)
            ratio = ratios.get(t.id, prev.get('split_ratio')) if 'split_ratios' in request.data else prev.get('split_ratio')
            lines.append(build_line(v.party_type, t, adj, ratio))
        v.lines = lines
        v.amount, v.direction = _totals(v.party_type, lines)
        for field in ('notes', 'payment_method'):
            if field in request.data:
                setattr(v, field, request.data[field] or ('BANK' if field == 'payment_method' else ''))
        if 'with_cash' in request.data:
            v.with_cash = bool(request.data['with_cash'])
        v.save()
        return Response({'success': True, 'voucher': serialize(v)})

    patch = put

    @transaction.atomic
    def delete(self, request, pk):
        v = self._get(pk)
        if not v:
            return Response({'error': 'Không tìm thấy phiếu quyết toán'}, status=status.HTTP_404_NOT_FOUND)
        if v.status != VoucherStatus.DRAFT:
            return Response({'error': 'Phiếu đã duyệt, cần Mở lại phiếu trước khi xóa'}, status=status.HTTP_400_BAD_REQUEST)
        v.delete()
        return Response({'success': True, 'message': f'Đã xóa phiếu {v.code}'})


class SettlementVoucherApproveAPIView(APIView):
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]
    access_actions = {'POST': 'approve'}

    @transaction.atomic
    def post(self, request, pk):
        v = SettlementVoucher.objects.filter(pk=pk, is_deleted=False).first()
        if not v:
            return Response({'error': 'Không tìm thấy phiếu quyết toán'}, status=status.HTTP_404_NOT_FOUND)
        if v.status != VoucherStatus.DRAFT:
            return Response({'error': 'Phiếu đã được duyệt'}, status=status.HTTP_400_BAD_REQUEST)
        if 'with_cash' in request.data:
            v.with_cash = bool(request.data['with_cash'])
        if request.data.get('payment_method'):
            v.payment_method = request.data['payment_method']

        emp = getattr(request.user, 'employee', None)
        now = timezone.now()
        trips = list(v.trips.select_related('driver').prefetch_related('expenses', 'driver_advances'))
        if any(_already_settled(v.party_type, t) for t in trips):
            return Response({'error': 'Có chuyến đã được quyết toán ở phiếu khác'}, status=status.HTTP_400_BAD_REQUEST)
        lines = {l['trip_id']: l for l in v.lines}

        for t in trips:
            line = lines.get(t.id, {})
            if v.party_type == VoucherPartyType.DRIVER:
                if t.is_split_trip and 'split_ratio' in line:
                    t.driver_split_ratio = line['split_ratio']
                t.is_expenses_settled = True
                t.settled_at = now
                t.settled_by = emp
                t.advance_settlement_status = 'SETTLED'
                if t.status in [TripStatus.AT_WAREHOUSE, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY]:
                    t.status = TripStatus.COMPLETED
                t.save()
                t.expenses.filter(is_deleted=False).exclude(status=ApprovalStatus.REJECTED).update(status=ApprovalStatus.SETTLED)
                spent = line.get('spent', 0) + line.get('adjustment', 0)
                for adv in t.driver_advances.filter(is_deleted=False, status=DriverAdvanceStatus.ADVANCED):
                    diff = int(adv.amount) - spent
                    adv.status = DriverAdvanceStatus.SETTLED
                    adv.actual_spent = spent
                    adv.settlement_diff_type = (SettlementDiffType.DRIVER_REFUND if diff > 0
                                                else SettlementDiffType.COMPANY_REIMBURSE if diff < 0 else SettlementDiffType.BALANCED)
                    adv.refund_amount = max(diff, 0)
                    adv.reimburse_amount = max(-diff, 0)
                    adv.settled_at = now
                    adv.settled_by = emp
                    adv.settlement_notes = f"Phiếu quyết toán {v.code}"
                    adv.save()
            elif v.party_type == VoucherPartyType.PARTNER:
                t.subcontractor_settlement_status = 'SETTLED'
                t.subcontractor_settled_at = now
                t.save(update_fields=['subcontractor_settlement_status', 'subcontractor_settled_at'])
            else:
                t.is_customer_settled = True
                t.customer_reconciled = True
                t.customer_settled_at = now
                t.customer_settled_by = emp
                t.customer_reconciled_at = now
                t.customer_reconciled_by = emp
                t.customer_soa_code = v.code
                t.save(update_fields=['is_customer_settled', 'customer_reconciled', 'customer_settled_at', 'customer_settled_by',
                                      'customer_reconciled_at', 'customer_reconciled_by', 'customer_soa_code'])

        if v.with_cash and v.amount > 0:
            inflow = v.direction == 'RECEIVE'
            if v.party_type == VoucherPartyType.CUSTOMER:
                category = CashFlowCategory.FREIGHT_REVENUE
            elif v.party_type == VoucherPartyType.PARTNER:
                category = CashFlowCategory.SUBCONTRACTOR_PAYMENT
            else:
                category = CashFlowCategory.ADVANCE_REFUND if inflow else CashFlowCategory.ADVANCE_REIMBURSE
            prefix = f"{'PT' if inflow else 'PC'}.{now.strftime('%y%m')}."
            v.cash_transaction = CashTransaction.objects.create(
                code=next_code(CashTransaction, 'code', prefix, 3),
                transaction_type=TransactionType.INFLOW if inflow else TransactionType.OUTFLOW,
                payment_method=v.payment_method, category=category, amount=v.amount,
                transaction_date=now.date(), partner_type=CASH_PARTNER[v.party_type], partner_name=v.party_name,
                ref_code=v.code, created_by=emp, notes=f"Quyết toán {v.get_party_type_display()} - phiếu {v.code}",
            )

        v.status = VoucherStatus.APPROVED
        v.approved_by = emp
        v.approved_at = now
        v.save()
        return Response({'success': True, 'message': f'Đã duyệt phiếu {v.code}', 'voucher': serialize(v)})


class SettlementVoucherReopenAPIView(APIView):
    """Mở lại phiếu đã duyệt để sửa/xóa: gỡ khóa chuyến và xóa phiếu Thu/Chi đã phát sinh."""
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAccountant]
    access_actions = {'POST': 'approve'}

    @transaction.atomic
    def post(self, request, pk):
        v = SettlementVoucher.objects.filter(pk=pk, is_deleted=False).select_related('cash_transaction').first()
        if not v:
            return Response({'error': 'Không tìm thấy phiếu quyết toán'}, status=status.HTTP_404_NOT_FOUND)
        if v.status != VoucherStatus.APPROVED:
            return Response({'error': 'Phiếu chưa được duyệt'}, status=status.HTTP_400_BAD_REQUEST)

        for t in v.trips.all():
            if v.party_type == VoucherPartyType.DRIVER:
                t.is_expenses_settled = False
                t.settled_at = None
                t.settled_by = None
                t.advance_settlement_status = 'PENDING'
                t.save()
                t.expenses.filter(is_deleted=False, status=ApprovalStatus.SETTLED).update(status=ApprovalStatus.APPROVED)
                t.driver_advances.filter(is_deleted=False, settled_at=v.approved_at).update(
                    status=DriverAdvanceStatus.ADVANCED, settled_at=None, settled_by=None, actual_spent=0,
                    refund_amount=0, reimburse_amount=0)
            elif v.party_type == VoucherPartyType.PARTNER:
                t.subcontractor_settlement_status = 'PENDING'
                t.subcontractor_settled_at = None
                t.save(update_fields=['subcontractor_settlement_status', 'subcontractor_settled_at'])
            else:
                t.is_customer_settled = False
                t.customer_reconciled = False
                t.customer_settled_at = None
                t.customer_settled_by = None
                t.customer_reconciled_at = None
                t.customer_reconciled_by = None
                t.customer_soa_code = ''
                t.save(update_fields=['is_customer_settled', 'customer_reconciled', 'customer_settled_at', 'customer_settled_by',
                                      'customer_reconciled_at', 'customer_reconciled_by', 'customer_soa_code'])

        if v.cash_transaction:
            v.cash_transaction.delete()
            v.cash_transaction = None
        v.status = VoucherStatus.DRAFT
        v.approved_by = None
        v.approved_at = None
        v.save()
        return Response({'success': True, 'message': f'Đã mở lại phiếu {v.code}', 'voucher': serialize(v)})


# ---------------------------------------------------------------- báo cáo (chỉ xem) --------------------------------------

class SettlementVoucherReportAPIView(APIView):
    """Báo cáo Bảng kê quyết toán & đối soát: chỉ đọc. Thao tác lập/sửa/duyệt nằm ở phân hệ Kế toán."""
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [CanViewSettlementVoucherReport]

    def get(self, request):
        import datetime
        qs = SettlementVoucher.objects.filter(is_deleted=False).select_related('cash_transaction')
        p = request.query_params
        if p.get('party_type'):
            qs = qs.filter(party_type=p['party_type'])
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        for key, lookup in (('from', 'created_at__date__gte'), ('to', 'created_at__date__lte')):
            if p.get(key):
                try:
                    qs = qs.filter(**{lookup: datetime.date.fromisoformat(p[key])})
                except ValueError:
                    return Response({'error': 'Ngày không hợp lệ, dùng YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        vouchers = list(qs[:1000])
        if p.get('export') == 'xlsx':
            return self._xlsx(vouchers)
        total = {'RECEIVE': 0, 'PAY': 0}
        approved = 0
        for v in vouchers:
            total[v.direction] += int(v.amount)
            approved += v.status == VoucherStatus.APPROVED
        return Response({
            'success': True,
            'summary': {'count': len(vouchers), 'approved': approved, 'draft': len(vouchers) - approved,
                        'total_receive': total['RECEIVE'], 'total_pay': total['PAY']},
            'vouchers': [serialize(v, with_lines=False) for v in vouchers],
        })

    @staticmethod
    def _xlsx(vouchers):
        import io
        from django.http import HttpResponse
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = 'Bang ke quyet toan'
        ws.append(['Số phiếu', 'Đối tượng', 'Tên', 'Số chuyến', 'Số tiền', 'Thu/Chi', 'Tình trạng', 'Phiếu thu/chi', 'Ngày lập', 'Ngày duyệt'])
        for v in vouchers:
            d = serialize(v, with_lines=False)
            ws.append([d['code'], d['party_type_label'], d['party_name'], d['trips_count'], d['amount'],
                       'Thu' if d['direction'] == 'RECEIVE' else 'Chi', d['status_label'], d['cash_transaction_code'], d['created_at'], d['approved_at']])
        buf = io.BytesIO()
        wb.save(buf)
        res = HttpResponse(buf.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res['Content-Disposition'] = 'attachment; filename="bang-ke-quyet-toan.xlsx"'
        return res


class SettlementVoucherReportDetailAPIView(APIView):
    authentication_classes = [GracefulJWTAuthentication, SessionAuthentication]
    permission_classes = [CanViewSettlementVoucherReport]

    def get(self, request, pk):
        v = SettlementVoucher.objects.filter(pk=pk, is_deleted=False).select_related('cash_transaction').first()
        if not v:
            return Response({'error': 'Không tìm thấy phiếu quyết toán'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'voucher': serialize(v)})
