import datetime
from decimal import Decimal
import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.customers.models import Customer, RouteTariff, Quotation, QuotationItem, BookingOrder, BookingStatus
from apps.fleet.models import Vehicle, Trailer, VehicleType, VehicleOwnership, VehicleStatus
from apps.personnel.models import Employee, EmployeeRole, Department
from apps.dispatch.models import DispatchTrip, TripStatus, ShipmentType
from apps.billing.models import (
    TripExpense, ExpenseCategory, ReimbursementStatus, ApprovalStatus,
    CashTransaction, TransactionType, PaymentMethod, CashFlowCategory,
    DispatcherAdvanceFund, DriverTripAdvance, FundStatus, DriverAdvanceStatus, AdvanceSourceType,
    CustomerInvoice, SubcontractorSettlement, DriverPayrollSettlement, DebitNote, SettlementStatus
)
from apps.customs.models import CustomsDeclaration, CustomsLane, CustomsDeclarationStatus, CustomsDirection
from apps.master_data.models import (
    Location, LocationType, ContainerType, ContainerCategory, ExpenseItem, ExpenseCategoryGroup,
    DriverSalaryTariff, DriverAllowanceCatalog, ShippingLine, Subcontractor, CompanyProfile, OpeningBalance
)

class Command(BaseCommand):
    help = 'Tạo dữ liệu thực tế chuẩn quốc tế cho tháng 9/2026 (1/9/2026 - 30/9/2026) bao gồm toàn bộ nghiệp vụ'

    def handle(self, *args, **options):
        self.stdout.write('Bat dau khoi tao du lieu Thang 9/2026 chuan quoc te...')

        # 0. Dọn sạch các bảng giao dịch cũ trước khi khởi tạo
        from apps.documents.models import TripDocument
        from core.models import TrackingEventLog
        TripDocument.all_objects.all().hard_delete()
        TrackingEventLog.objects.all().delete()
        TripExpense.all_objects.all().hard_delete()
        CustomerInvoice.all_objects.all().hard_delete()
        SubcontractorSettlement.all_objects.all().hard_delete()
        DriverPayrollSettlement.all_objects.all().hard_delete()
        DebitNote.all_objects.all().hard_delete()
        DriverTripAdvance.all_objects.all().hard_delete()
        DispatcherAdvanceFund.all_objects.all().hard_delete()
        CashTransaction.all_objects.all().hard_delete()
        DispatchTrip.all_objects.all().hard_delete()
        BookingOrder.all_objects.all().hard_delete()
        QuotationItem.all_objects.all().hard_delete()
        Quotation.all_objects.all().hard_delete()
        CustomsDeclaration.all_objects.all().hard_delete()



        # 1. Bảo tồn & Chuẩn hóa Hồ sơ Công ty Triền Võ
        company = CompanyProfile.get_default_company()
        company.company_name = 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI TRIỀN VÕ'

        company.short_name = 'TRIỀN VÕ LOGISTICS'
        company.tax_code = '0314567890'
        company.phone = '0965 559 561'
        company.email = 'phongkinhdoanh.tvl@trienvo.com'
        company.website = 'https://trienvo.com'
        company.address = '153/1 Quốc Lộ 1A, P. An Phú Đông, Quận 12, TP. Hồ Chí Minh'
        company.bank_account_number = '19030000000001'
        company.bank_name = 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank) - CN Nam Sài Gòn'
        company.save()
        self.stdout.write('Da bao ton Ho so Cong ty Trien Vo Logistics.')


        # 2. Khai báo Số Dư Đầu Kỳ Kế Toán 01/09/2026 (COA TT 200/TT 133)
        OpeningBalance.objects.all().delete()
        opening_balances_data = [
            ('1111', 'Tiền mặt tại quỹ công ty', 'INTERNAL', 'QUY_TM', 'Quỹ Tiền Mặt Triền Võ', Decimal(85000000), True, 'Số dư quỹ tiền mặt đầu tháng 9'),
            ('1121', 'Tiền gửi Techcombank - CN Nam Sài Gòn', 'BANK', 'TCB_0001', 'Techcombank CN Nam Sài Gòn (19030000000001)', Decimal(350000000), True, 'Số dư tài khoản ngân hàng chính'),
            ('141', 'Tạm ứng Điều vận (Võ Triền)', 'DISPATCHER', 'DD001', 'Võ Văn Triền (Điều vận)', Decimal(25000000), True, 'Quỹ điều vận luân chuyển đầu kỳ'),
            ('131', 'Công nợ phải thu: Dệt May Việt Thắng', 'CUSTOMER', 'VIETTHANG', 'CÔNG TY TNHH DỆT MAY XUẤT KHẨU VIỆT THẮNG', Decimal(42000000), True, 'Cước vận chuyển tháng 8 chưa thanh toán'),
            ('131', 'Công nợ phải thu: Thực Phẩm Á Châu', 'CUSTOMER', 'ASIA_FOOD', 'CÔNG TY CỔ PHẦN THỰC PHẨM & ĐỒ UỐNG Á CHÂU', Decimal(28500000), True, 'Cước vận chuyển tháng 8'),
            ('331', 'Công nợ phải trả: Vận Tải Hoàng Nam', 'SUBCONTRACTOR', 'NX_HOANGNAM', 'Công ty TNHH Vận Tải Hoàng Nam', Decimal(18000000), False, 'Cước xe bạn tháng 8 chưa thanh toán'),
            ('334', 'Phải trả lương nhân viên & tài xế', 'INTERNAL', 'PAYROLL_AUG', 'Lương Nhân sự & Đội xe', Decimal(52000000), False, 'Lương tháng 8 chi trả vào 05/09'),
        ]
        for acc_code, acc_name, p_type, e_code, e_name, amt, is_deb, note in opening_balances_data:
            OpeningBalance.objects.create(
                account_code=acc_code,
                account_name=acc_name,
                partner_type=p_type,
                entity_code=e_code,
                entity_name=e_name,
                opening_date=datetime.date(2026, 9, 1),
                fiscal_year=2026,
                debit_amount=amt if is_deb else Decimal(0),
                credit_amount=Decimal(0) if is_deb else amt,
                amount=amt,
                is_debit=is_deb,
                notes=note
            )
        self.stdout.write('Da thiet lap So du dau ky 01/09/2026 chuan COA.')


        # 3. Nhân sự cốt lõi
        emp_map = {e.code: e for e in Employee.objects.all()}
        # Lấy danh sách tài xế
        drivers = [e for e in Employee.objects.filter(role=EmployeeRole.DRIVER)]
        dispatcher = emp_map.get('DD001') or Employee.objects.filter(role=EmployeeRole.DISPATCHER).first()
        accountant = emp_map.get('KT001') or Employee.objects.filter(role=EmployeeRole.ACCOUNTANT).first()

        # 4. Xe & Mooc
        vehicles = list(Vehicle.objects.all())
        trailers = list(Trailer.objects.all())

        # 5. Khách hàng trọng điểm
        customers = list(Customer.objects.filter(code__in=['VIETTHANG', 'ASIA_FOOD', 'SAMSUNG_VN', 'VIET_NHAT_STEEL', 'DUY_TAN_PLASTICS']))
        if not customers:
            customers = list(Customer.objects.all()[:5])

        # 6. Hãng tàu & Nhà xe thầu phụ
        subcontractors = list(Subcontractor.objects.all())
        shipping_lines = ['ONE', 'MAERSK', 'COSCO', 'EVERGREEN', 'SITC', 'YANGMING']

        # 7. Khởi tạo Báo Giá (Quotations) cho tháng 9
        quotations = []
        for idx, cust in enumerate(customers):
            q_code = f"BG-202609-{idx+1:02d}"
            q, _ = Quotation.objects.get_or_create(
                quotation_code=q_code,
                defaults={
                    'customer': cust,
                    'origin_zone': 'Cảng Tân Cảng Cát Lái',
                    'destination_zone': cust.address.split(',')[0],
                    'estimated_km': 35 + idx * 8,
                    'route_description': f"Cảng Cát Lái ➔ {cust.address.split(',')[0]}",
                    'unit_price': Decimal(3600000 + idx * 250000),
                    'expected_trips_monthly': 20,
                    'status': 'APPROVED',
                    'pricing_method': 'MULTI_ROUTE',
                    'cargo_type': 'Container 40HC / 20GP',
                    'valid_until': datetime.date(2026, 12, 31),
                    'notes': 'Bảng giá cước vận chuyển áp dụng quý 3/2026'
                }
            )
            Quotation.objects.filter(id=q.id).update(created_at=timezone.make_aware(datetime.datetime(2026, 9, 1, 8, 0, 0)))
            quotations.append(q)

        # 8. Khởi tạo Quỹ Tạm Ứng Điều Vận (Tuần 1 & Tuần 3 tháng 9)
        fund_w1 = DispatcherAdvanceFund.objects.create(
            code="QDV-202609-01",
            dispatcher=dispatcher,
            amount=Decimal(35000000),
            advance_date=datetime.date(2026, 9, 1),
            purpose="Quỹ điều vận tạm ứng chuyến xe nửa đầu tháng 9",
            status=FundStatus.APPROVED,
            approved_by=accountant,
            approved_at=timezone.make_aware(datetime.datetime(2026, 9, 1, 8, 30))
        )
        fund_w3 = DispatcherAdvanceFund.objects.create(
            code="QDV-202609-02",
            dispatcher=dispatcher,
            amount=Decimal(40000000),
            advance_date=datetime.date(2026, 9, 15),
            purpose="Quỹ điều vận tạm ứng chuyến xe nửa cuối tháng 9",
            status=FundStatus.APPROVED,
            approved_by=accountant,
            approved_at=timezone.make_aware(datetime.datetime(2026, 9, 15, 8, 30))
        )

        # 9. Sinh Dữ Liệu 30 Ngày Tháng 9 (1/9/2026 - 30/9/2026)
        all_trips = []
        all_expenses = []
        day_trip_counter = 1

        for day in range(1, 31):
            curr_date = datetime.date(2026, 9, day)
            active_fund = fund_w1 if day <= 15 else fund_w3
            
            # Mỗi ngày sinh 2 - 3 chuyến xe (Tổng cộng ~70 chuyến cho tháng 9)
            trips_today_count = 2 if curr_date.weekday() in (5, 6) else 3

            for t_idx in range(trips_today_count):
                cust = customers[(day + t_idx) % len(customers)]
                s_line = shipping_lines[(day + t_idx) % len(shipping_lines)]
                is_sub = (day % 4 == 0 and t_idx == 0) # Mỗi 4 ngày có 1 chuyến thuê xe bạn
                is_twin = (day % 5 == 0 and t_idx == 1) # Chở ghép 2 cont 20ft
                is_split = (day % 6 == 0 and t_idx == 0) # Cắt kéo đổi đầu xe
                is_export = (day % 2 == 0)

                # 1 Booking tương ứng
                b_code = f"BK-2609-{day_trip_counter:03d}"
                b_order = BookingOrder.objects.create(
                    booking_code=b_code,
                    customer=cust,
                    booking_type='EXPORT_FCL' if is_export else 'IMPORT_FCL',
                    booking_number=f"BK-{s_line}-{curr_date.strftime('%m%d')}-{day_trip_counter:02d}",
                    shipping_line=s_line,
                    vessel_voyage=f"{s_line} VOYAGE 09{day:02d}",
                    container_size='2x20DC' if is_twin else '40HC',
                    total_containers=1,
                    dispatched_containers=1,
                    commodity=f"Hàng hóa phục vụ sản xuất ({cust.name.split()[-1]})",
                    pickup_location='Cảng Tân Cảng Cát Lái' if is_export else 'Bãi Cont Suối Tiên',
                    delivery_location=cust.address,
                    dropoff_location='Bãi Cont Tân Cảng Cát Lái' if not is_export else 'Cảng Tân Cảng SP-ITC',
                    loading_date=curr_date,
                    loading_time='08:30',
                    free_time_detention=7,
                    free_time_demurrage=7,
                    selling_freight_price=Decimal(4200000 if is_twin else (3800000 + (day % 3) * 150000)),
                    status=BookingStatus.COMPLETED if day < 28 else BookingStatus.PARTIALLY_DISPATCHED
                )
                BookingOrder.objects.filter(id=b_order.id).update(created_at=timezone.make_aware(datetime.datetime(2026, 9, day, 7, 30, 0)))


                # Chọn tài xế và xe
                driver = drivers[(day + t_idx) % len(drivers)]
                veh = vehicles[(day + t_idx) % len(vehicles)]
                trl = trailers[(day + t_idx) % len(trailers)]

                trip_code = f"TVL-2609-{day_trip_counter:03d}"
                # Trạng thái theo mốc ngày: Các ngày đầu tháng đã hoàn tất và chốt sổ, các ngày cuối tháng đang vận hành
                if day <= 25:
                    trip_status = TripStatus.COMPLETED
                    is_settled = True
                elif day <= 28:
                    trip_status = TripStatus.DELIVERED
                    is_settled = False
                elif day == 29:
                    trip_status = TripStatus.IN_TRANSIT
                    is_settled = False
                else:
                    trip_status = TripStatus.DISPATCHED
                    is_settled = False

                revenue = b_order.selling_freight_price
                trip_cost = Decimal(2100000 if is_twin else (1850000 + (day % 4) * 50000))

                trip = DispatchTrip.objects.create(
                    trip_code=trip_code,
                    shipment_type=ShipmentType.EXPORT if is_export else ShipmentType.IMPORT,
                    customer=cust,
                    booking_order=b_order,
                    vehicle=veh,
                    trailer=trl,
                    driver=driver,
                    dispatcher=dispatcher,
                    container_number=f"TGHU{curr_date.strftime('%m%d')}{day_trip_counter:03d}7",
                    seal_number=f"{s_line}{curr_date.strftime('%d%m')}{day_trip_counter:02d}",
                    container_type='2x20DC' if is_twin else '40HC',
                    booking_or_bill=b_order.booking_number,
                    pickup_location=b_order.pickup_location,
                    warehouse_location=b_order.delivery_location,
                    dropoff_location=b_order.dropoff_location,
                    loading_date=curr_date,
                    loading_time='08:00',
                    status=trip_status,
                    is_split_trip=is_split,
                    is_twin_container=is_twin,
                    driver_allowance=Decimal(0) if is_sub else Decimal(450000),
                    driver_advance_amount=Decimal(1200000) if trip_status in (TripStatus.COMPLETED, TripStatus.DELIVERED, TripStatus.IN_TRANSIT) else Decimal(0),
                    advance_settlement_status='SETTLED' if is_settled else ('ADVANCED' if trip_status in (TripStatus.COMPLETED, TripStatus.DELIVERED, TripStatus.IN_TRANSIT) else 'NO_ADVANCE'),
                    subcontractor_cost=Decimal(3100000) if is_sub else Decimal(0),
                    subcontractor_advance=Decimal(1000000) if is_sub else Decimal(0),
                    subcontractor_settlement_status='SETTLED' if (is_sub and day <= 25) else ('PENDING' if is_sub else 'PENDING'),
                    subcontractor_notes='Công ty TNHH Vận Tải Hoàng Nam - HĐ 2026/HN' if is_sub else '',
                    is_customer_settled=(day <= 25 and cust in customers[:3]),
                    customer_settlement_status='SETTLED' if (day <= 25 and cust in customers[:3]) else 'PENDING',
                    customer_soa_code=f"INV-2609-{cust.code}" if (day <= 25 and cust in customers[:3]) else '',
                    cached_revenue=revenue,
                    cached_expense=trip_cost,
                    cached_profit=revenue - trip_cost,
                    cached_margin_percent=Decimal(round((revenue - trip_cost) / revenue * 100, 1)),
                    special_notes='Thuê xe thầu phụ 3PL' if is_sub else ('Cắt kéo đổi đầu xe chặng 2' if is_split else '')
                )
                DispatchTrip.objects.filter(id=trip.id).update(created_at=timezone.make_aware(datetime.datetime(2026, 9, day, 8, 0, 0)))
                all_trips.append(trip)


                # Tạm ứng tài xế
                if trip_status in (TripStatus.COMPLETED, TripStatus.DELIVERED, TripStatus.IN_TRANSIT):
                    d_adv = DriverTripAdvance.objects.create(
                        code=f"TUTX-2609-{day_trip_counter:03d}",
                        trip=trip,
                        driver=driver,
                        dispatcher_fund=active_fund,
                        advance_source=AdvanceSourceType.DISPATCHER_FUND,
                        amount=Decimal(1200000),
                        advance_date=curr_date,
                        purpose=f"Tạm ứng phí nâng hạ và BOT chuyến {trip_code}",
                        status=DriverAdvanceStatus.SETTLED if is_settled else DriverAdvanceStatus.ADVANCED,
                        actual_spent=Decimal(1150000)
                    )
                    DriverTripAdvance.objects.filter(id=d_adv.id).update(created_at=timezone.make_aware(datetime.datetime(2026, 9, day, 8, 30, 0)))

                # Chi phí chuyến xe
                # 1. Nâng cont (Chi hộ khách hàng)
                exp1 = TripExpense.objects.create(
                    trip=trip,
                    driver=driver,
                    vehicle=veh,
                    category=ExpenseCategory.LIFT_ON,
                    amount=Decimal(480000),
                    is_on_behalf_of_customer=True,
                    reimbursement_status=ReimbursementStatus.BILLED if day <= 25 else ReimbursementStatus.PENDING,
                    invoice_issuer='Cảng Tân Cảng Cát Lái',
                    invoice_number=f"HD-CL-2609-{day_trip_counter:03d}",
                    invoice_lookup_code=f"CL2609{day_trip_counter:03d}",
                    status=ApprovalStatus.SETTLED if is_settled else ApprovalStatus.APPROVED,
                    notes='Phí nâng vỏ container'
                )
                all_expenses.append(exp1)

                # 2. Cân xe VGM (Chi hộ khách hàng)
                if day % 2 == 0:
                    exp2 = TripExpense.objects.create(
                        trip=trip,
                        driver=driver,
                        vehicle=veh,
                        category=ExpenseCategory.WEIGHING,
                        amount=Decimal(120000),
                        is_on_behalf_of_customer=True,
                        reimbursement_status=ReimbursementStatus.BILLED if day <= 25 else ReimbursementStatus.PENDING,
                        invoice_issuer='Trạm Cân Cát Lái',
                        invoice_number=f"CAN-2609-{day_trip_counter:03d}",
                        status=ApprovalStatus.SETTLED if is_settled else ApprovalStatus.APPROVED,
                        notes='Phiếu cân tải trọng xe VGM'
                    )
                    all_expenses.append(exp2)
                else:
                    exp2 = None

                # 3. Vé BOT cầu đường (Công ty chịu)
                exp3 = TripExpense.objects.create(
                    trip=trip,
                    driver=driver,
                    vehicle=veh,
                    category=ExpenseCategory.TOLL_FEE,
                    amount=Decimal(180000),
                    is_on_behalf_of_customer=False,
                    reimbursement_status=ReimbursementStatus.NOT_APPLICABLE,
                    invoice_issuer='BOT Xa Lộ Hà Nội / Phú Mỹ',
                    invoice_number=f"BOT-ETC-{day_trip_counter:03d}",
                    status=ApprovalStatus.SETTLED if is_settled else ApprovalStatus.APPROVED,
                    notes='Vé cầu đường ETC'
                )
                all_expenses.append(exp3)

                for e_item in [exp1, exp2, exp3]:
                    if e_item:
                        TripExpense.objects.filter(id=e_item.id).update(created_at=timezone.make_aware(datetime.datetime(2026, 9, day, 10, 0, 0)))

                if is_settled:
                    trip.is_expenses_settled = True
                    trip.save(update_fields=['is_expenses_settled'])


                day_trip_counter += 1

        self.stdout.write(f"Da sinh thanh cong {len(all_trips)} chuyen xe va {len(all_expenses)} khoan chi phi trai deu 30 ngay Thang 9/2026.")

        # 10. Khép Kín Giao Dịch Tháng 9 với 4 Model Mới:
        # A. CustomerInvoice (Hóa đơn kỳ đối soát 1 - 25/09 cho 3 khách hàng lớn)
        for idx, cust in enumerate(customers[:3]):
            cust_trips = [t for t in all_trips if t.customer == cust and t.loading_date <= datetime.date(2026, 9, 25)]
            f_subtotal = sum(t.cached_revenue for t in cust_trips)
            reimb = Decimal(len(cust_trips) * 480000)
            vat = Decimal(round(f_subtotal * Decimal('0.08')))
            g_total = f_subtotal + vat + reimb

            inv = CustomerInvoice.objects.create(
                code=f"INV-2609-{cust.code}",
                customer=cust,
                period_start=datetime.date(2026, 9, 1),
                period_end=datetime.date(2026, 9, 25),
                due_date=datetime.date(2026, 10, 10),
                freight_subtotal=f_subtotal,
                vat_rate=Decimal(8),
                vat_amount=vat,
                reimbursement_total=reimb,
                grand_total=g_total,
                paid_amount=g_total if idx == 0 else (g_total / 2 if idx == 1 else Decimal(0)),
                status=SettlementStatus.PAID if idx == 0 else (SettlementStatus.PARTIAL if idx == 1 else SettlementStatus.CONFIRMED),
                is_locked=True,
                created_by=accountant,
                notes=f"Bảng kê đối soát cước và chi hộ kỳ tháng 9/2026 cho {cust.name}"
            )
            inv.trips.set(cust_trips)

        # B. SubcontractorSettlement (Đối soát Thầu phụ Hoàng Nam kỳ tháng 9)
        if subcontractors:
            sub = subcontractors[0]
            sub_trips = all_trips[::4][:6] # Lấy các chuyến thuê xe bạn
            cost_total = Decimal(len(sub_trips) * 3100000)
            adv = Decimal(len(sub_trips) * 1000000)
            sub_settle = SubcontractorSettlement.objects.create(
                code="DS-TP-2609-01",
                subcontractor=sub,
                period_start=datetime.date(2026, 9, 1),
                period_end=datetime.date(2026, 9, 30),
                total_freight_cost=cost_total,
                advance_deducted=adv,
                payable_amount=cost_total - adv,
                paid_amount=cost_total - adv,
                status=SettlementStatus.PAID,
                is_locked=True,
                created_by=accountant,
                notes="Thanh toán quyết toán cước xe chạy thuê ngoài tháng 9"
            )
            sub_settle.trips.set(sub_trips)

        # C. DriverPayrollSettlement (Quyết toán lương chuyến cho tài xế Mạnh và Nghĩa)
        for d in drivers[:2]:
            d_trips = [t for t in all_trips if t.driver == d and t.loading_date <= datetime.date(2026, 9, 25)]
            b_salary = Decimal(len(d_trips) * 450000)
            ovn = Decimal(600000)
            ded = Decimal(500000)
            net = b_salary + ovn - ded

            d_payroll = DriverPayrollSettlement.objects.create(
                code=f"LC-TX-2609-{d.code}",
                driver=d,
                period_start=datetime.date(2026, 9, 1),
                period_end=datetime.date(2026, 9, 25),
                base_trip_salary=b_salary,
                overnight_allowance=ovn,
                bonus_amount=Decimal(500000),
                deductions=ded,
                net_salary=net + Decimal(500000),
                paid_amount=net + Decimal(500000),
                status=SettlementStatus.PAID,
                is_locked=True,
                created_by=accountant,
                notes=f"Bảng thanh toán lương chuyến và phụ cấp tháng 9 cho lái xe {d.full_name}"
            )
            d_payroll.trips.set(d_trips)

        # D. DebitNote (Phiếu yêu cầu hoàn ứng chi hộ gửi khách hàng Việt Thắng)
        dn_expenses = [e for e in all_expenses if e.is_on_behalf_of_customer and e.trip.customer == customers[0]][:10]
        dn_total = sum(e.amount for e in dn_expenses)
        dn = DebitNote.objects.create(
            code="DN-2609-VIETTHANG",
            customer=customers[0],
            due_date=datetime.date(2026, 10, 5),
            total_amount=dn_total,
            collected_amount=dn_total,
            status=SettlementStatus.PAID,
            created_by=accountant,
            notes="Debit Note phí nâng hạ cảng và cân xe kỳ 1 tháng 9/2026"
        )
        dn.expenses.set(dn_expenses)

        # 11. Sổ Quỹ Thu - Chi (CashTransaction) trong tháng 9
        # Thu cước khách hàng
        CashTransaction.objects.create(
            code="PT-2609-001",
            transaction_type=TransactionType.INFLOW,
            payment_method=PaymentMethod.BANK,
            category=CashFlowCategory.FREIGHT_REVENUE,
            amount=Decimal(85000000),
            transaction_date=datetime.date(2026, 9, 10),
            partner_type='CUSTOMER',
            partner_name=customers[0].name,
            ref_code="INV-2609-VIETTHANG",
            bank_name='Techcombank',
            bank_account='19030000000001',
            created_by=accountant,
            notes="Thu thanh toán cước vận chuyển đợt 1 tháng 9 từ Việt Thắng"
        )
        # Thu hồi chi hộ Debit Note
        CashTransaction.objects.create(
            code="PT-2609-002",
            transaction_type=TransactionType.INFLOW,
            payment_method=PaymentMethod.BANK,
            category=CashFlowCategory.REIMBURSABLE_COLLECTION,
            amount=dn_total,
            transaction_date=datetime.date(2026, 9, 15),
            partner_type='CUSTOMER',
            partner_name=customers[0].name,
            ref_code="DN-2609-VIETTHANG",
            bank_name='Techcombank',
            bank_account='19030000000001',
            created_by=accountant,
            notes="Thu hồi hoàn ứng Debit Note chi hộ nâng hạ cảng"
        )
        # Chi tạm ứng Quỹ Điều vận
        CashTransaction.objects.create(
            code="PC-2609-001",
            transaction_type=TransactionType.OUTFLOW,
            payment_method=PaymentMethod.BANK,
            category=CashFlowCategory.DISPATCHER_FUND_ADVANCE,
            amount=Decimal(35000000),
            transaction_date=datetime.date(2026, 9, 1),
            partner_type='DISPATCHER',
            partner_name=dispatcher.full_name,
            ref_code="QDV-202609-01",
            created_by=accountant,
            notes="Chi tạm ứng Quỹ Điều vận phục vụ chi phí đội xe tuần 1-2"
        )
        # Chi tiền dầu Diesel
        CashTransaction.objects.create(
            code="PC-2609-002",
            transaction_type=TransactionType.OUTFLOW,
            payment_method=PaymentMethod.BANK,
            category=CashFlowCategory.FUEL_PAYMENT,
            amount=Decimal(48500000),
            transaction_date=datetime.date(2026, 9, 12),
            partner_type='VENDOR',
            partner_name="Petrolimex Sài Gòn",
            ref_code="HD-D-2609-881",
            created_by=accountant,
            notes="Thanh toán hóa đơn dầu Diesel cấp bồn nội bộ bãi xe Triền Võ"
        )
        # Chi thanh toán Thầu phụ Hoàng Nam
        if subcontractors:
            CashTransaction.objects.create(
                code="PC-2609-003",
                transaction_type=TransactionType.OUTFLOW,
                payment_method=PaymentMethod.BANK,
                category=CashFlowCategory.SUBCONTRACTOR_PAYMENT,
                amount=Decimal(12600000),
                transaction_date=datetime.date(2026, 9, 28),
                partner_type='SUBCONTRACTOR',
                partner_name=subcontractors[0].name,
                ref_code="DS-TP-2609-01",
                created_by=accountant,
                notes="Thanh toán quyết toán cước xe chạy thuê ngoài tháng 9"
            )

        for tx_code, tx_day in [("PT-2609-001", 10), ("PT-2609-002", 15), ("PC-2609-001", 1), ("PC-2609-002", 12), ("PC-2609-003", 28)]:
            CashTransaction.objects.filter(code=tx_code).update(
                created_at=timezone.make_aware(datetime.datetime(2026, 9, tx_day, 11, 0, 0))
            )

        # 12. Tờ Khai Hải Quan trong tháng 9
        for idx, t in enumerate(all_trips[:15]):
            c_decl = CustomsDeclaration.objects.create(
                declaration_number=f"105909{idx+1:02d}882{idx:02d}",
                declaration_date=t.loading_date,
                customer=t.customer,
                customs_office_code='02CI',
                customs_office_name='Chi cục HQ Cửa khẩu Cảng Sài Gòn KV4 (Cát Lái)',
                declaration_type='B11' if t.shipment_type == ShipmentType.EXPORT else 'A11',
                direction=CustomsDirection.EXPORT if t.shipment_type == ShipmentType.EXPORT else CustomsDirection.IMPORT,
                customs_lane=CustomsLane.GREEN if idx % 3 == 0 else (CustomsLane.YELLOW if idx % 3 == 1 else CustomsLane.RED),
                status=CustomsDeclarationStatus.CLEARED if idx < 12 else CustomsDeclarationStatus.SUBMITTED,
                bill_of_lading=t.booking_or_bill,
                container_numbers=f"{t.container_number} / {t.container_type}",
                tax_amount_vnd=Decimal(25000000 + idx * 5000000),
                is_tax_paid=idx < 12,
                customs_service_fee=Decimal(1200000),
                reimbursable_fee=Decimal(350000),
                inspection_notes=f"Tờ khai thông quan container {t.container_number}"
            )
            CustomsDeclaration.objects.filter(id=c_decl.id).update(
                created_at=timezone.make_aware(datetime.datetime(2026, 9, t.loading_date.day, 9, 0, 0))
            )

        self.stdout.write(self.style.SUCCESS("=== KHOI TAO TOAN DIEN DU LIEU THANG 9/2026 THANH CONG 100%! ==="))

