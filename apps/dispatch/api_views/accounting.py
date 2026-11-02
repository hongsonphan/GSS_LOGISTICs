"""Kế toán: đối soát chi phí chuyến."""
from ._common import *  # noqa: F401,F403

class AccountingAPIView(APIView):
    """API Phân hệ Quản lý Kế toán: Đối soát Chi phí, Hóa đơn chứng từ và Chốt sổ chuyến xe."""
    permission_classes = [IsAccountant]
    access_actions = {'POST': 'approve', 'PUT': 'approve', 'PATCH': 'approve'}
    def get(self, request):
        trips = DispatchTrip.objects.select_related('customer', 'driver', 'vehicle', 'settled_by', 'booking_order').prefetch_related('expenses').filter(is_deleted=False).order_by('-created_at')

        from_date = request.GET.get('from_date') or request.GET.get('start_date')
        to_date = request.GET.get('to_date') or request.GET.get('end_date')
        if from_date:
            try:
                fd = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                trips = trips.filter(Q(loading_date__gte=fd) | Q(loading_date__isnull=True, created_at__date__gte=fd))
            except Exception:
                pass
        if to_date:
            try:
                td = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                trips = trips.filter(Q(loading_date__lte=td) | Q(loading_date__isnull=True, created_at__date__lte=td))
            except Exception:
                pass

        total_revenue = 0
        total_expense = 0
        total_profit = 0
        settled_count = 0
        pending_settle_count = 0

        settlement_list = []
        for t in trips:
            rev = float(t.cached_revenue or 0)
            if rev <= 0 and t.booking_order and t.booking_order.selling_freight_price:
                rev = float(t.booking_order.selling_freight_price)
            if rev <= 0:
                rev = 0.0

            exp = float(t.cached_expense or 0)
            profit = rev - exp

            total_revenue += rev
            total_expense += exp
            total_profit += profit

            if t.is_expenses_settled:
                settled_count += 1
            else:
                pending_settle_count += 1

            exp_list = [e for e in t.expenses.all() if not e.is_deleted]
            inv_count = sum(1 for e in exp_list if e.invoice_number)
            sample_inv = next((e.invoice_number for e in exp_list if e.invoice_number), '')

            margin_percent = round((profit / rev * 100), 1) if rev > 0 else 0

            settlement_list.append({
                'id': t.id,
                'trip_code': t.trip_code,
                'loading_date': t.loading_date.strftime('%d/%m/%Y') if t.loading_date else '',
                'customer_name': t.customer.name if t.customer else '-',
                'route': f"{t.pickup_location} ➔ {t.warehouse_location}",
                'driver_name': t.driver.nickname or t.driver.full_name if t.driver else '-',
                'license_plate': t.vehicle.license_plate if t.vehicle else '-',
                'container_number': t.container_number or '-',
                'revenue': rev,
                'expense': exp,
                'profit': profit,
                'margin_percent': margin_percent,
                'expenses_count': len(exp_list),
                'invoices_count': inv_count,
                'sample_invoice': sample_inv,
                'is_settled': t.is_expenses_settled,
                'settled_at': t.settled_at.strftime('%d/%m/%Y %H:%M') if t.settled_at else '',
                'settled_by': (t.settled_by.nickname or t.settled_by.full_name) if t.settled_by else '',
                'status': t.status,
                'status_label': t.get_status_display(),
            })

        return Response({
            'stats': {
                'total_revenue': total_revenue,
                'total_expense': total_expense,
                'total_profit': total_profit,
                'profit_margin': round((total_profit / total_revenue * 100), 1) if total_revenue > 0 else 0,
                'settled_count': settled_count,
                'pending_settle_count': pending_settle_count,
                'total_trips': len(trips),
            },
            'settlements': settlement_list
        })

    def post(self, request):
        action = request.data.get('action')
        trip_codes = request.data.get('trip_codes', [])
        if not trip_codes or not isinstance(trip_codes, list):
            return Response({'error': 'Vui lòng chọn ít nhất một chuyến xe để thao tác.'}, status=status.HTTP_400_BAD_REQUEST)

        trips = DispatchTrip.objects.filter(trip_code__in=trip_codes, is_deleted=False)
        if not trips.exists():
            return Response({'error': 'Không tìm thấy các chuyến xe tương ứng.'}, status=status.HTTP_404_NOT_FOUND)

        accountant = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or \
                     Employee.objects.filter(role=EmployeeRole.ACCOUNTANT).first()

        now = timezone.now()
        settled_codes = []

        if action == 'batch_settle':
            with transaction.atomic():
                for t in trips:
                    t.is_expenses_settled = True
                    t.settled_at = now
                    t.settled_by = accountant
                    t.save(update_fields=['is_expenses_settled', 'settled_at', 'settled_by'])

                    t.expenses.filter(is_deleted=False).update(
                        status=ApprovalStatus.SETTLED,
                        approved_at=now,
                        approved_by=accountant
                    )
                    t.update_financials()
                    settled_codes.append(t.trip_code)

            return Response({
                'success': True,
                'message': f'Đã chốt sổ quyết toán chi phí cho {len(settled_codes)} chuyến xe thành công!',
                'settled_codes': settled_codes
            })

        elif action == 'batch_unsettle':
            with transaction.atomic():
                for t in trips:
                    t.is_expenses_settled = False
                    t.settled_at = None
                    t.settled_by = None
                    t.save(update_fields=['is_expenses_settled', 'settled_at', 'settled_by'])

                    t.expenses.filter(is_deleted=False, status=ApprovalStatus.SETTLED).update(
                        status=ApprovalStatus.APPROVED
                    )
                    t.update_financials()
                    settled_codes.append(t.trip_code)

            return Response({
                'success': True,
                'message': f'Đã mở lại sổ quyết toán cho {len(settled_codes)} chuyến xe thành công!',
                'settled_codes': settled_codes
            })

        return Response({'error': f'Hành động không hợp lệ: {action}'}, status=status.HTTP_400_BAD_REQUEST)

