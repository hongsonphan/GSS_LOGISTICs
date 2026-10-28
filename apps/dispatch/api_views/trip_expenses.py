"""Chi phí chuyến xe: kê khai, sửa, chốt/mở sổ."""
from ._common import *  # noqa: F401,F403

class TripAddExpenseAPIView(APIView):
    """API thêm khoản mục chi phí phát sinh (Hỗ trợ cả Kê Nhiều Dòng Cùng Lúc - Multi-row Batch & Đơn dòng)."""
    permission_classes = [IsTripDriverOrDispatcher]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, trip)

        if trip.is_expenses_settled:
            return Response({
                'error': 'Chuyến xe đã được Kế toán chốt sổ đối soát, không thể thêm khoản chi phí mới.'
            }, status=status.HTTP_403_FORBIDDEN)

        cat_map = {
            'LIFT_ON': ExpenseCategory.LIFT_ON,
            'LIFT_OFF': ExpenseCategory.LIFT_OFF,
            'CONTAINER_DEPOSIT': ExpenseCategory.CONTAINER_DEPOSIT,
            'WEIGHING': ExpenseCategory.WEIGHING,
            'LABOR_STEVEDORING': ExpenseCategory.LABOR_STEVEDORING,
            'TOLL_FEE': ExpenseCategory.TOLL_FEE,
            'BOT_TOLL': ExpenseCategory.TOLL_FEE,
            'OTHER': ExpenseCategory.OTHER,
            # Old choices mapping
            'Phí BOT / Cầu đường': ExpenseCategory.TOLL_FEE,
            'Phí nâng / hạ Cont': ExpenseCategory.LIFT_ON,
            'Phí neo xe / Lưu bãi': ExpenseCategory.OTHER,
            'Cước phí bốc xếp': ExpenseCategory.LABOR_STEVEDORING,
            'Phí bồi dưỡng kho': ExpenseCategory.LABOR_STEVEDORING,
            'Khác': ExpenseCategory.OTHER,
        }

        from apps.master_data.models import ExpenseItem
        from apps.billing.models import TripLegChoice

        expense_item_map = {
            ExpenseCategory.LIFT_ON: 'LIFT_ON',
            ExpenseCategory.LIFT_OFF: 'LIFT_OFF',
            ExpenseCategory.CONTAINER_DEPOSIT: 'CONTAINER_DEPOSIT',
            ExpenseCategory.WEIGHING: 'WEIGHING',
            ExpenseCategory.LABOR_STEVEDORING: 'LABOR_STEVEDORING',
            ExpenseCategory.TOLL_FEE: 'TOLL_BOT',
            ExpenseCategory.BOT_TOLL: 'TOLL_BOT',
            ExpenseCategory.LIFT_ON_OFF: 'LIFT_ON',
            ExpenseCategory.OTHER: 'OTHER_EXPENSE',
        }

        # Kiểm tra xem có payload dạng mảng nhiều dòng (batch expenses) hay không
        batch_items = None
        if 'expenses_json' in request.data:
            import json
            try:
                batch_items = json.loads(request.data['expenses_json'])
            except Exception:
                batch_items = None
        elif 'items' in request.data and isinstance(request.data['items'], list):
            batch_items = request.data['items']
        elif 'expenses' in request.data and isinstance(request.data['expenses'], list):
            batch_items = request.data['expenses']

        if batch_items and isinstance(batch_items, list) and len(batch_items) > 0:
            # === XỬ LÝ BATCH NHIỀU DÒNG CHI PHÍ ===
            created_expenses = []
            total_batch_amount = 0

            with transaction.atomic():
                for idx, item in enumerate(batch_items):
                    category_key = item.get('category', 'TOLL_FEE')
                    try:
                        amt = int(str(item.get('amount', 0)).replace('.', '').replace(',', '').strip())
                    except (ValueError, TypeError):
                        amt = 0
                    if amt <= 0:
                        continue

                    notes = item.get('notes', '').strip()
                    category = cat_map.get(category_key, ExpenseCategory.OTHER)
                    item_code = expense_item_map.get(category, 'OTHER_EXPENSE')
                    expense_item = ExpenseItem.objects.filter(code=item_code, is_active=True).first()

                    # File ảnh tương ứng (receipt_0, receipt_1... hoặc file list)
                    r_file = request.FILES.get(f'receipt_{idx}') or request.FILES.get(f'receipt_{item.get("id", idx)}')
                    r_path_str = ''
                    if r_file:
                        try:
                            validate_uploaded_document(r_file)
                            from django.core.files.storage import default_storage
                            saved_name = default_storage.save(f"receipts/{trip.trip_code}_{sanitize_filename(r_file.name)}", r_file)
                            r_path_str = f"/media/{saved_name}"
                        except Exception:
                            r_file = None

                    from apps.billing.models import ExpensePayerType
                    payer_choice = item.get('expense_payer_type') or item.get('payer_type')
                    if not payer_choice:
                        payer_choice = ExpensePayerType.TVL_OBH if item.get('is_on_behalf_of_customer') else ExpensePayerType.TVL_COST

                    exp = TripExpense.objects.create(
                        trip=trip,
                        driver=trip.driver,
                        vehicle=trip.vehicle,
                        trip_leg=TripLegChoice.ENTIRE,
                        category=category,
                        expense_item=expense_item,
                        amount=amt,
                        receipt_image_path=r_path_str,
                        receipt_image=r_file if r_file else None,
                        status=ApprovalStatus.APPROVED,
                        expense_payer_type=payer_choice,
                        company_borne=True,
                        notes=notes or f"Kê khai chi phí: {dict(ExpenseCategory.choices).get(category, 'Chi phí')}"
                    )
                    created_expenses.append(exp)
                    total_batch_amount += amt

                trip.update_financials()

            if not created_expenses:
                return Response({'error': 'Không có khoản chi phí hợp lệ nào được cung cấp'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'success': True,
                'message': f'Đã lưu thành công {len(created_expenses)} khoản chi phí với tổng tiền {total_batch_amount:,} đ!',
                'count': len(created_expenses),
                'total_amount': total_batch_amount,
                'cached_expense': trip.cached_expense,
                'cached_profit': trip.cached_profit,
            })

        # === XỬ LÝ ĐƠN DÒNG (Single Expense Item) ===
        category_key = request.data.get('category', 'TOLL_FEE')
        amount = int(request.data.get('amount', 0))
        raw_ocr = request.data.get('raw_ocr', '')
        notes = request.data.get('notes', '')
        req_status = request.data.get('status', ApprovalStatus.APPROVED)
        
        # Tiêu chuẩn 7 & 8: File chứng từ / biên lai chi phí đính kèm
        receipt_file = request.FILES.get('receipt') or request.FILES.get('receipt_image') or request.FILES.get('file')
        receipt_path_str = ''
        if receipt_file:
            try:
                validate_uploaded_document(receipt_file)
                from django.core.files.storage import default_storage
                saved_name = default_storage.save(f"receipts/{trip.trip_code}_{sanitize_filename(receipt_file.name)}", receipt_file)
                receipt_path_str = f"/media/{saved_name}"
            except DjangoValidationError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

        # Metadata Hóa đơn điện tử & tra cứu
        invoice_issuer = request.data.get('invoice_issuer', '')
        invoice_number = request.data.get('invoice_number', '')
        invoice_lookup_code = request.data.get('invoice_lookup_code', '')
        invoice_lookup_url = request.data.get('invoice_lookup_url', '')
        tax_rate = float(request.data.get('tax_rate', 0))
        tax_amount = int(request.data.get('tax_amount', 0))
        amount_before_tax = int(request.data.get('amount_before_tax', amount - tax_amount))

        category = cat_map.get(category_key, ExpenseCategory.OTHER)

        # Map sang master_data.ExpenseItem (Sprint 1)
        expense_item_id = request.data.get('expense_item_id')
        expense_item = None
        if expense_item_id:
            expense_item = ExpenseItem.objects.filter(id=expense_item_id, is_active=True).first()
        if not expense_item:
            item_code = expense_item_map.get(category, 'OTHER_EXPENSE')
            expense_item = ExpenseItem.objects.filter(code=item_code, is_active=True).first()

        # Phân định Tài xế & Xe theo Chặng (Trip Leg)
        trip_leg = request.data.get('trip_leg', TripLegChoice.ENTIRE)
        driver_id = request.data.get('driver_id')
        vehicle_id = request.data.get('vehicle_id')

        driver = None
        vehicle = None
        if driver_id:
            driver = Employee.objects.filter(id=driver_id).first()
        if vehicle_id:
            vehicle = Vehicle.objects.filter(id=vehicle_id).first()

        # Tự động suy luận theo Chặng nếu chưa chọn đích danh
        if not driver:
            if trip_leg == TripLegChoice.LEG_2 and trip.is_split_trip:
                driver = trip.dropoff_driver or trip.driver
                vehicle = vehicle or trip.dropoff_vehicle or trip.vehicle
            elif trip_leg == TripLegChoice.COMPANY:
                driver = None
                vehicle = None
            else: # LEG_1 hoặc ENTIRE
                driver = trip.driver
                vehicle = vehicle or trip.vehicle
        elif not vehicle and driver:
            if driver == trip.dropoff_driver and trip.dropoff_vehicle:
                vehicle = trip.dropoff_vehicle
            elif driver == trip.driver and trip.vehicle:
                vehicle = trip.vehicle
            else:
                vehicle = Vehicle.objects.filter(current_driver=driver).first()

        from apps.billing.models import ExpensePayerType
        req_payer_type = request.data.get('expense_payer_type') or request.data.get('payer_type')
        if not req_payer_type:
            req_payer_type = ExpensePayerType.TVL_OBH if request.data.get('is_on_behalf_of_customer') else ExpensePayerType.TVL_COST

        expense = TripExpense.objects.create(
            trip=trip,
            driver=driver,
            vehicle=vehicle,
            trip_leg=trip_leg,
            category=category,
            expense_item=expense_item,
            amount=amount,
            receipt_image_path=receipt_path_str,
            receipt_image=receipt_file if receipt_file else None,
            invoice_issuer=invoice_issuer,
            invoice_number=invoice_number,
            invoice_lookup_code=invoice_lookup_code,
            invoice_lookup_url=invoice_lookup_url,
            amount_before_tax=amount_before_tax,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            ocr_raw_text=raw_ocr,
            status=req_status,
            expense_payer_type=req_payer_type,
            company_borne=request.data.get('company_borne', True),
            notes=notes or "Chi phí phát sinh hiện trường"
        )

        trip.update_financials()

        return Response({
            'success': True,
            'message': f'Đã ghi nhận chi phí {expense.get_category_display()}: {expense.amount:,} đ thành công!',
            'expense_id': expense.id,
            'amount': expense.amount,
            'category': expense.get_category_display(),
            'cached_expense': trip.cached_expense,
            'cached_profit': trip.cached_profit,
        })

class TripExpenseDetailAPIView(APIView):
    """API Sửa và Xóa (Soft-delete) khoản chi phí phát sinh."""
    permission_classes = [IsTripDriverOrDispatcher]
    def put(self, request, trip_code, expense_id):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        if trip.is_expenses_settled:
            return Response({
                'error': 'Chuyến xe đã được Kế toán chốt sổ, không thể chỉnh sửa chi phí này.'
            }, status=status.HTTP_403_FORBIDDEN)

        expense = TripExpense.objects.filter(id=expense_id, trip=trip, is_deleted=False).first()
        if not expense:
            return Response({'error': 'Không tìm thấy khoản chi phí'}, status=status.HTTP_404_NOT_FOUND)

        if expense.status == ApprovalStatus.SETTLED:
            return Response({
                'error': 'Khoản chi phí này đã được chốt sổ Kế toán, không thể chỉnh sửa.'
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        if 'amount' in data:
            expense.amount = int(data['amount'])
        if 'category' in data:
            expense.category = data['category']
            from apps.master_data.models import ExpenseItem
            expense_item_map = {
                'LIFT_ON': 'LIFT_ON',
                'LIFT_OFF': 'LIFT_OFF',
                'CONTAINER_DEPOSIT': 'CONTAINER_DEPOSIT',
                'WEIGHING': 'WEIGHING',
                'LABOR_STEVEDORING': 'LABOR_STEVEDORING',
                'TOLL_FEE': 'TOLL_BOT',
                'BOT_TOLL': 'TOLL_BOT',
                'LIFT_ON_OFF': 'LIFT_ON',
                'OTHER': 'OTHER_EXPENSE',
            }
            item_code = expense_item_map.get(expense.category, 'OTHER_EXPENSE')
            matched_item = ExpenseItem.objects.filter(code=item_code, is_active=True).first()
            if matched_item:
                expense.expense_item = matched_item

        if 'expense_item_id' in data:
            from apps.master_data.models import ExpenseItem
            item = ExpenseItem.objects.filter(id=data['expense_item_id'], is_active=True).first()
            if item:
                expense.expense_item = item

        if 'notes' in data:
            expense.notes = data['notes']
        if 'invoice_issuer' in data:
            expense.invoice_issuer = data['invoice_issuer']
        if 'invoice_number' in data:
            expense.invoice_number = data['invoice_number']
        if 'invoice_lookup_code' in data:
            expense.invoice_lookup_code = data['invoice_lookup_code']
        if 'invoice_lookup_url' in data:
            expense.invoice_lookup_url = data['invoice_lookup_url']
        if 'tax_rate' in data:
            expense.tax_rate = float(data['tax_rate'])
        if 'tax_amount' in data:
            expense.tax_amount = int(data['tax_amount'])
        if 'amount_before_tax' in data:
            expense.amount_before_tax = int(data['amount_before_tax'])
        if 'status' in data and data['status'] in dict(ApprovalStatus.choices):
            expense.status = data['status']
        if 'company_borne' in data:
            expense.company_borne = bool(data['company_borne'])
        if 'expense_payer_type' in data or 'payer_type' in data:
            expense.expense_payer_type = data.get('expense_payer_type') or data.get('payer_type')
        elif 'is_on_behalf_of_customer' in data:
            from apps.billing.models import ExpensePayerType
            expense.expense_payer_type = ExpensePayerType.TVL_OBH if data['is_on_behalf_of_customer'] else ExpensePayerType.TVL_COST

        if 'trip_leg' in data:
            from apps.billing.models import TripLegChoice
            expense.trip_leg = data['trip_leg']
            if expense.trip_leg == TripLegChoice.LEG_1:
                expense.driver = trip.driver
                expense.vehicle = trip.vehicle
            elif expense.trip_leg == TripLegChoice.LEG_2 and trip.is_split_trip:
                expense.driver = trip.dropoff_driver or trip.driver
                expense.vehicle = trip.dropoff_vehicle or trip.vehicle
            elif expense.trip_leg == TripLegChoice.COMPANY:
                expense.driver = None
                expense.vehicle = None
            elif expense.trip_leg == TripLegChoice.ENTIRE:
                expense.driver = trip.driver
                expense.vehicle = trip.vehicle

        if 'driver_id' in data:
            expense.driver = Employee.objects.filter(id=data['driver_id']).first() if data['driver_id'] else None
        if 'vehicle_id' in data:
            expense.vehicle = Vehicle.objects.filter(id=data['vehicle_id']).first() if data['vehicle_id'] else None

        expense.save()
        trip.update_financials()

        return Response({
            'success': True,
            'message': f'Đã cập nhật thành công chi phí {expense.get_category_display()}: {expense.amount:,} đ',
            'expense_id': expense.id,
            'amount': expense.amount,
            'cached_expense': trip.cached_expense,
            'cached_profit': trip.cached_profit,
        })

    def delete(self, request, trip_code, expense_id):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        if trip.is_expenses_settled:
            return Response({
                'error': 'Chuyến xe đã được Kế toán chốt sổ, không thể xóa chi phí này.'
            }, status=status.HTTP_403_FORBIDDEN)

        expense = TripExpense.objects.filter(id=expense_id, trip=trip, is_deleted=False).first()
        if not expense:
            return Response({'error': 'Không tìm thấy khoản chi phí'}, status=status.HTTP_404_NOT_FOUND)

        if expense.status == ApprovalStatus.SETTLED:
            return Response({
                'error': 'Khoản chi phí này đã được chốt sổ Kế toán, không thể xóa.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Soft delete theo đúng chuẩn Audit Logging
        expense.delete()
        trip.update_financials()

        return Response({
            'success': True,
            'message': f'Đã xóa khoản chi phí {expense.get_category_display()} thành công.',
            'cached_expense': trip.cached_expense,
            'cached_profit': trip.cached_profit,
        })

class TripSettleExpensesAPIView(APIView):
    """API Kế toán Chốt sổ Chi Phí Chuyến Xe (Khóa cứng không thể sửa/xóa)."""
    permission_classes = [IsAccountant]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        accountant = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or \
                     Employee.objects.filter(role=EmployeeRole.ACCOUNTANT).first() or trip.dispatcher

        with transaction.atomic():
            locked_trip = DispatchTrip.objects.select_for_update().filter(id=trip.id).first()
            if not locked_trip:
                return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

            locked_trip.is_expenses_settled = True
            locked_trip.settled_at = timezone.now()
            locked_trip.settled_by = accountant
            locked_trip.save(update_fields=['is_expenses_settled', 'settled_at', 'settled_by'])

            # Cập nhật toàn bộ các khoản chi sang SETTLED
            locked_trip.expenses.filter(is_deleted=False).update(
                status=ApprovalStatus.SETTLED,
                approved_at=timezone.now(),
                approved_by=accountant
            )

            locked_trip.update_financials()

        return Response({
            'success': True,
            'message': f'Kế toán đã chốt sổ chi phí cho chuyến xe {locked_trip.trip_code} thành công!',
            'settled_at': locked_trip.settled_at.strftime('%H:%M %d/%m/%Y'),
            'settled_by': accountant.nickname or accountant.full_name if accountant else 'Kế toán',
            'cached_expense': locked_trip.cached_expense,
            'cached_profit': locked_trip.cached_profit,
        })

class TripUnsettleExpensesAPIView(APIView):
    """API Mở khóa Sổ Kế Toán (Dành cho Kế toán trưởng / Quản trị viên)."""
    permission_classes = [IsAccountant]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            locked_trip = DispatchTrip.objects.select_for_update().filter(id=trip.id).first()
            if not locked_trip:
                return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

            locked_trip.is_expenses_settled = False
            locked_trip.settled_at = None
            locked_trip.settled_by = None
            locked_trip.save(update_fields=['is_expenses_settled', 'settled_at', 'settled_by'])

            # Mở khóa các khoản chi phí trở lại APPROVED
            locked_trip.expenses.filter(status=ApprovalStatus.SETTLED).update(
                status=ApprovalStatus.APPROVED
            )

            locked_trip.update_financials()

        return Response({
            'success': True,
            'message': f'Đã mở khóa sổ kế toán cho chuyến xe {locked_trip.trip_code}. Chi phí có thể chỉnh sửa.',
            'cached_expense': locked_trip.cached_expense,
            'cached_profit': locked_trip.cached_profit,
        })
