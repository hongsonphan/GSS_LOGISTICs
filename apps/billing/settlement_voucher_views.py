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
    ApprovalStatus, CashFlowCategory, CashTransaction, DriverAdvanceStatus, PaymentMethod, ReimbursementStatus, SettlementDiffType,
    SettlementVoucher, SettlementVoucherLog, TransactionType, VoucherPartyType, VoucherStatus,
)
from apps.dispatch.models import DispatchTrip, TripStatus
from core.permissions import CanViewSettlementVoucherReport, IsAccountant
from core.security import GracefulJWTAuthentication
from core.sequences import next_code

PARTY_PREFIX = {'DRIVER': 'QTTX', 'PARTNER': 'QT3PL', 'CUSTOMER': 'QTKH'}
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


def _expense_line(e, leg=True, borne=None):
    return {
        'id': e.id, 'name': e.expense_name, 'leg': e.get_trip_leg_display() if leg else '', 'amount': int(e.amount),
        'payer': e.get_expense_payer_type_display(), 'company_borne': e.company_borne if borne is None else borne,
        'status': e.get_status_display(), 'invoice': e.invoice_number or '',
    }


def build_line(party_type, trip, adjustment=0, split_ratio=None, note='', borne_overrides=None):
    """Bản chụp một chuyến cho bảng kê; chỉ đưa vào các trường phù hợp với đối tượng quyết toán."""
    line = _trip_base(trip)
    expenses = _live_expenses(trip)
    if party_type == VoucherPartyType.DRIVER:
        advances = [a for a in trip.driver_advances.all() if not a.is_deleted and a.status == DriverAdvanceStatus.ADVANCED]
        advance = int(sum(a.amount for a in advances))
        spent = int(sum(e.amount for e in expenses))
        # Khoản tài xế chịu (trừ lương): theo lựa chọn khi quyết toán, mặc định theo khoản chi
        overrides = borne_overrides or {}
        expense_lines = [_expense_line(e, borne=overrides.get(e.id, e.company_borne)) for e in expenses]
        salary_deduct = sum(x['amount'] for x in expense_lines if not x['company_borne'])
        line.update({
            'driver_name': (trip.driver.nickname or trip.driver.full_name) if trip.driver else '',
            'license_plate': trip.vehicle.license_plate if trip.vehicle else '',
            'expense_lines': expense_lines,
            'salary_deduct': salary_deduct,
            'advance_lines': [{
                'code': a.code, 'source': a.get_advance_source_display(), 'source_code': a.advance_source,
                'date': a.advance_date.strftime('%d/%m/%Y'), 'amount': int(a.amount), 'purpose': a.purpose,
            } for a in sorted(advances, key=lambda a: (a.advance_date, a.id))],
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
            'expense_lines': [_expense_line(e) for e in reimb],
            'advance': advance,
            'total': cost + reimb_total - advance + adjustment,
        })
    else:
        # Khoản chi hộ đã gửi Debit Note hoặc đã thu hồi được thu ở luồng riêng, không tính lại để tránh thu trùng
        obh = [e for e in expenses if e.is_on_behalf_of_customer
               and e.reimbursement_status in (ReimbursementStatus.NOT_APPLICABLE, ReimbursementStatus.PENDING)
               and not e.debit_note_number]
        revenue = int(trip.cached_revenue or 0)
        line.update({
            'booking_or_bill': trip.booking_or_bill or '',
            'freight': revenue,
            'expense_lines': [_expense_line(e, leg=False) for e in obh],
            'total': revenue + int(sum(e.amount for e in obh)) + adjustment,
        })
    line['adjustment'] = adjustment
    line['adjustment_note'] = note
    return line


def _totals(party_type, lines):
    net = sum(int(l['total']) for l in lines)
    if party_type == VoucherPartyType.DRIVER:
        return abs(net), ('RECEIVE' if net > 0 else 'PAY')
    if party_type == VoucherPartyType.PARTNER:
        # Tạm ứng vượt cước: đối tác nợ lại công ty
        return abs(net), ('PAY' if net >= 0 else 'RECEIVE')
    return abs(net), 'RECEIVE'


LINE_FIELD_LABELS = {
    'adjustment': 'Phát sinh', 'adjustment_note': 'Lý do phát sinh', 'split_ratio': 'Tỷ lệ thù lao cắt kéo',
    'advance': 'Tạm ứng', 'spent': 'Thực chi', 'freight': 'Cước vận chuyển', 'freight_cost': 'Cước thuê xe',
    'expense_total': 'Tổng chi phí/chi hộ', 'salary_deduct': 'Trừ lương tài xế', 'total': 'Chênh lệch/Phải thu/Phải trả',
}


def _line_view(line):
    view = {k: line.get(k) for k in LINE_FIELD_LABELS if k in line}
    if 'expense_lines' in line:
        view['expense_total'] = sum(int(e['amount']) for e in line['expense_lines'])
    return view


def _diff_lines(old_lines, new_lines):
    """So sánh hai bản chụp bảng kê, trả về danh sách thay đổi theo từng chuyến."""
    old_by_trip = {l['trip_id']: l for l in old_lines}
    changes = []
    for line in new_lines:
        old_view = _line_view(old_by_trip.get(line['trip_id'], {}))
        for key, new_val in _line_view(line).items():
            old_val = old_view.get(key)
            if old_val != new_val:
                changes.append({'field': LINE_FIELD_LABELS[key], 'trip_code': line['trip_code'], 'old': old_val, 'new': new_val})
    return changes


def _write_log(voucher, request, action, changes=None, reason=''):
    emp = getattr(request.user, 'employee', None)
    label = (emp.full_name if emp else '') or getattr(request.user, 'username', '') or 'hệ thống'
    SettlementVoucherLog.objects.create(
        voucher=voucher, action=action, actor=emp, actor_label=label[:150], reason=(reason or '').strip()[:255],
        changes=changes or [], amount_after=voucher.amount,
    )


def _missing_adjustment_note(lines):
    return [l['trip_code'] for l in lines if int(l.get('adjustment') or 0) != 0 and not (l.get('adjustment_note') or '').strip()]


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
        data['logs'] = [{
            'action': g.action, 'action_label': g.get_action_display(), 'actor': g.actor_label, 'reason': g.reason,
            'changes': g.changes, 'amount_after': int(g.amount_after), 'at': timezone.localtime(g.created_at).strftime('%d/%m/%Y %H:%M'),
        } for g in v.logs.all()]
    return data


def _parse_maps(data):
    try:
        ratios = {int(k): float(x) for k, x in (data.get('split_ratios') or {}).items()}
        adjusts = {int(k): int(x) for k, x in (data.get('adjustments') or {}).items()}
        notes = {int(k): str(x or '').strip()[:255] for k, x in (data.get('adjustment_notes') or {}).items()}
        # salary_deductions: {mã khoản chi: true nếu trừ lương tài xế} -> company_borne = not deduct
        borne = {int(k): not bool(x) for k, x in (data.get('salary_deductions') or {}).items()}
    except (TypeError, ValueError, AttributeError):
        return None, None, None, None, 'Tỷ lệ thù lao hoặc số phát sinh không hợp lệ'
    if any(r < 0 or r > 100 for r in ratios.values()):
        return None, None, None, None, 'Tỷ lệ thù lao phải nằm trong khoảng 0 - 100%'
    return ratios, adjusts, notes, borne, ''


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
        ratios, adjusts, notes, borne, err = _parse_maps(request.data)
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
        taken = list(SettlementVoucher.objects.filter(
            is_deleted=False, party_type=party_type, trips__in=[t.id for t in trips]).distinct())
        if taken:
            # Chọn lại đúng các chuyến của một phiếu nháp: mở lại phiếu đó thay vì báo lỗi
            same = taken[0] if len(taken) == 1 and taken[0].status == VoucherStatus.DRAFT and                 set(taken[0].trips.values_list('id', flat=True)) == {t.id for t in trips} else None
            if same:
                return Response({'success': True, 'reused': True, 'voucher': serialize(same), 'vouchers': [serialize(same, with_lines=False)]})
            return Response({
                'error': f'Chuyến đã nằm trong phiếu quyết toán khác: {", ".join(v.code for v in taken[:3])}',
                'existing_vouchers': [{'id': v.id, 'code': v.code, 'status': v.status} for v in taken[:5]],
            }, status=status.HTTP_400_BAD_REQUEST)

        groups = {}
        for t in trips:
            groups.setdefault(_party_of(party_type, t), []).append(t)
        if len(groups) > 1 and not request.data.get('split_by_party'):
            return Response({'error': 'Mỗi phiếu chỉ gồm các chuyến của cùng một đối tượng quyết toán'}, status=status.HTTP_400_BAD_REQUEST)

        vouchers = []
        for (party_ref, party_name), group in groups.items():
            lines = [build_line(party_type, t, adjusts.get(t.id, 0), ratios.get(t.id), notes.get(t.id, ''), borne) for t in group]
            missing = _missing_adjustment_note(lines)
            if missing:
                transaction.set_rollback(True)
                return Response({'error': f'Nhập lý do cho số phát sinh của chuyến: {", ".join(missing[:5])}'}, status=status.HTTP_400_BAD_REQUEST)
            amount, direction = _totals(party_type, lines)
            code = next_code(SettlementVoucher, 'code', f"{PARTY_PREFIX[party_type]}.{timezone.now().strftime('%y%m')}.", 3)
            voucher = SettlementVoucher.objects.create(
                code=code, party_type=party_type, party_ref=party_ref, party_name=party_name, lines=lines,
                amount=amount, direction=direction, notes=(request.data.get('notes') or '').strip(),
                with_cash=bool(request.data.get('with_cash')),
                payment_method=request.data.get('payment_method') or PaymentMethod.BANK,
                created_by=getattr(request.user, 'employee', None),
            )
            voucher.trips.set(group)
            _write_log(voucher, request, 'CREATE', reason=voucher.notes)
            vouchers.append(voucher)
        return Response({'success': True, 'voucher': serialize(vouchers[0]), 'vouchers': [serialize(v, with_lines=False) for v in vouchers]},
                        status=status.HTTP_201_CREATED)


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
        ratios, adjusts, notes, borne, err = _parse_maps(request.data)
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        old_lines = v.lines
        old_header = {'notes': v.notes, 'payment_method': v.payment_method, 'with_cash': v.with_cash}
        old = {l['trip_id']: l for l in old_lines}
        trips = v.trips.select_related('driver', 'vehicle', 'customer', 'subcontractor', 'dropoff_driver').prefetch_related('expenses', 'driver_advances')
        lines = []
        for t in trips:
            prev = old.get(t.id, {})
            adj = adjusts.get(t.id, prev.get('adjustment', 0)) if 'adjustments' in request.data else prev.get('adjustment', 0)
            ratio = ratios.get(t.id, prev.get('split_ratio')) if 'split_ratios' in request.data else prev.get('split_ratio')
            note = notes.get(t.id, prev.get('adjustment_note', '')) if 'adjustment_notes' in request.data else prev.get('adjustment_note', '')
            # Lựa chọn trừ lương đã lưu trên phiếu, được ghi đè bởi lựa chọn mới gửi lên
            kept = {x['id']: x['company_borne'] for x in prev.get('expense_lines', []) if 'id' in x}
            kept.update(borne)
            lines.append(build_line(v.party_type, t, adj, ratio, note, kept))
        missing = _missing_adjustment_note(lines)
        if missing:
            return Response({'error': f'Nhập lý do cho số phát sinh của chuyến: {", ".join(missing[:5])}'}, status=status.HTTP_400_BAD_REQUEST)
        v.lines = lines
        v.amount, v.direction = _totals(v.party_type, lines)
        for field in ('notes', 'payment_method'):
            if field in request.data:
                setattr(v, field, request.data[field] or ('BANK' if field == 'payment_method' else ''))
        if 'with_cash' in request.data:
            v.with_cash = bool(request.data['with_cash'])
        v.save()
        changes = _diff_lines(old_lines, lines)
        header_labels = {'notes': 'Ghi chú', 'payment_method': 'Hình thức thanh toán', 'with_cash': 'Phát sinh phiếu Thu/Chi'}
        changes += [{'field': header_labels[k], 'trip_code': '', 'old': old_header[k], 'new': getattr(v, k)}
                    for k in old_header if old_header[k] != getattr(v, k)]
        if changes:
            _write_log(v, request, 'UPDATE', changes)
        return Response({'success': True, 'voucher': serialize(v)})

    patch = put

    @transaction.atomic
    def delete(self, request, pk):
        v = self._get(pk)
        if not v:
            return Response({'error': 'Không tìm thấy phiếu quyết toán'}, status=status.HTTP_404_NOT_FOUND)
        if v.status != VoucherStatus.DRAFT:
            return Response({'error': 'Phiếu đã duyệt, cần Mở lại phiếu trước khi xóa'}, status=status.HTTP_400_BAD_REQUEST)
        _write_log(v, request, 'DELETE', reason=request.data.get('reason', ''))
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
                # Ghi lựa chọn "trừ lương tài xế" lên khoản chi trước khi chốt sổ (khoản chi bị khóa sau khi chốt)
                chosen = {x['id']: x['company_borne'] for x in line.get('expense_lines', []) if 'id' in x}
                for exp in t.expenses.filter(is_deleted=False, id__in=list(chosen)):
                    if exp.company_borne != chosen[exp.id]:
                        exp.company_borne = chosen[exp.id]
                        exp.save(update_fields=['company_borne', 'updated_at'])
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
                # Phân bổ thực chi lần lượt lên từng phiếu tạm ứng; phiếu cuối nhận phần còn lại (kể cả phần vượt)
                advances = list(t.driver_advances.filter(is_deleted=False, status=DriverAdvanceStatus.ADVANCED).order_by('advance_date', 'id'))
                remaining = spent
                for idx, adv in enumerate(advances):
                    share = remaining if idx == len(advances) - 1 else min(int(adv.amount), max(remaining, 0))
                    remaining -= share
                    diff = int(adv.amount) - share
                    adv.status = DriverAdvanceStatus.SETTLED
                    adv.actual_spent = share
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
        _write_log(v, request, 'APPROVE')
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
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'error': 'Nhập lý do mở lại phiếu để lưu vết'}, status=status.HTTP_400_BAD_REQUEST)

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
        _write_log(v, request, 'REOPEN', reason=reason)
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
