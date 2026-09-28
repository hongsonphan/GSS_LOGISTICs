import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.personnel.models import Employee, EmployeeRole
from apps.dispatch.models import DispatchTrip
from apps.billing.models import (
    DispatcherAdvanceFund,
    DriverTripAdvance,
    FundStatus,
    DriverAdvanceStatus,
    AdvanceSourceType,
    SettlementDiffType,
    TripExpense,
    ExpenseCategory,
    ApprovalStatus,
    ExpenseReceiptType
)


class Command(BaseCommand):
    help = "Tạo dữ liệu đối soát chuẩn thực tế cho Quỹ Điều Vận và Tạm Ứng - Chi Phí Tài Xế (Báo Cáo 10 & 11)"

    def handle(self, *args, **options):
        self.stdout.write("=== KHOI TAO DU LIEU DOI SOAT TAM UNG - HOAN UNG THUC TE ===")

        # 1. Tìm nhân sự liên quan
        dispatcher = Employee.objects.filter(role=EmployeeRole.DISPATCHER, is_deleted=False).first()
        if not dispatcher:
            dispatcher = Employee.objects.filter(is_deleted=False).first()

        accountant = Employee.objects.filter(role=EmployeeRole.ACCOUNTANT, is_deleted=False).first()
        director = Employee.objects.filter(role=EmployeeRole.DIRECTOR, is_deleted=False).first()

        today = timezone.now().date()
        start_of_month = today.replace(day=1)

        with transaction.atomic():
            # 2. Tạo 2 gói Quỹ Tạm Ứng Điều Vận (Cấp 1: Kế toán quản lý)
            # Gói 1: Đang lưu hành trong tháng này
            fund1, created1 = DispatcherAdvanceFund.objects.get_or_create(
                code=f"TUDV-{today.strftime('%Y%m')}-0001",
                defaults={
                    'dispatcher': dispatcher,
                    'amount': 25000000, # 25 triệu VNĐ
                    'advance_date': start_of_month,
                    'purpose': 'Quỹ điều vận tạm ứng chi phí đường dài & chi phát sinh đội xe Tháng ' + str(today.month),
                    'status': FundStatus.APPROVED,
                    'approved_by': accountant or director,
                    'approved_at': timezone.now() - datetime.timedelta(days=10),
                    'notes': 'Kế toán đã duyệt xuất quỹ tiền mặt bàn giao cho Điều phối viên.'
                }
            )
            if created1:
                self.stdout.write(f"  + Da tao Quy Dieu Van 1: {fund1.code} ({fund1.amount:,} d)")

            # Gói 2: Đã quyết toán hoàn tất tháng trước
            last_month_date = (start_of_month - datetime.timedelta(days=15)).replace(day=1)
            fund2, created2 = DispatcherAdvanceFund.objects.get_or_create(
                code=f"TUDV-{last_month_date.strftime('%Y%m')}-0001",
                defaults={
                    'dispatcher': dispatcher,
                    'amount': 20000000, # 20 triệu VNĐ
                    'advance_date': last_month_date,
                    'purpose': 'Quỹ điều vận tạm ứng chi phí đội xe Tháng ' + str(last_month_date.month),
                    'status': FundStatus.SETTLED,
                    'approved_by': director,
                    'approved_at': timezone.now() - datetime.timedelta(days=40),
                    'settled_by': accountant,
                    'settled_at': timezone.now() - datetime.timedelta(days=1),
                    'settlement_notes': 'Kế toán đã đối soát đủ toàn bộ hóa đơn chứng từ và thu hồi số dư về công ty.',
                    'notes': 'Quỹ đã hoàn tất quyết toán.'
                }
            )
            if created2:
                self.stdout.write(f"  + Da tao Quy Dieu Van 2: {fund2.code} ({fund2.amount:,} d) - DA QUYET TOAN")

            # 3. Lấy danh sách chuyến xe thực tế để gán Tạm Ứng & Chi Phí Phát Sinh
            trips = list(DispatchTrip.objects.filter(is_deleted=False).select_related('driver', 'vehicle', 'customer')[:10])
            self.stdout.write(f"  * Tim thay {len(trips)} chuyen xe thuc te de lien ket doi soat...")

            adv_created_count = 0
            expense_created_count = 0

            # Kịch bản đối soát thực tế cho từng chuyến:
            scenarios = [
                # (tạm ứng, chi phí phát sinh, trạng thái hoàn ứng, ghi chú)
                (2000000, [
                    (ExpenseCategory.TOLL_FEE, 480000, 'Vé BOT cao tốc Long Thành - Dầu Giây', ExpenseReceiptType.TOLL_TICKET),
                    (ExpenseCategory.LIFT_ON, 550000, 'Hạ cont bãi Cát Lái cổng B', ExpenseReceiptType.EIR_RECEIPT),
                    (ExpenseCategory.OTHER, 200000, 'Bồi dưỡng tổ cân hàng & kiểm hóa', ExpenseReceiptType.OTHER_RECEIPT)
                ], DriverAdvanceStatus.SETTLED, 'Tài xế nộp lại tiền thừa 770.000 đ vào quỹ điều vận'),

                (2500000, [
                    (ExpenseCategory.TOLL_FEE, 750000, 'Vé BOT QL51 + Cao tốc Phan Thiết', ExpenseReceiptType.TOLL_TICKET),
                    (ExpenseCategory.LIFT_ON, 600000, 'Nâng cont rỗng ICD Sóng Thần', ExpenseReceiptType.EIR_RECEIPT),
                    (ExpenseCategory.CONTAINER_DEPOSIT, 1200000, 'Cược vỏ container hãng tàu Maersk', ExpenseReceiptType.EINVOICE),
                    (ExpenseCategory.WEIGHING, 150000, 'Phiếu cân xe trạm Tân Vạn', ExpenseReceiptType.WEIGHING_TICKET)
                ], DriverAdvanceStatus.SETTLED, 'Thực chi 2.700.000 đ > Ứng 2.500.000 đ. Điều vận đã chi bù 200.000 đ cho tài xế'),

                (1800000, [
                    (ExpenseCategory.TOLL_FEE, 380000, 'Vé trạm thu phí Mỹ Phước - Tân Vạn', ExpenseReceiptType.TOLL_TICKET),
                    (ExpenseCategory.LIFT_OFF, 550000, 'Hạ cont cảng SP-PSA Cái Mép', ExpenseReceiptType.EIR_RECEIPT)
                ], DriverAdvanceStatus.ADVANCED, 'Chuyến xe đang chạy, tài xế giữ tạm ứng chờ về bãi đối soát'),

                (3000000, [
                    (ExpenseCategory.TOLL_FEE, 850000, 'Vé cầu đường liên tỉnh Bình Dương - Vũng Tàu', ExpenseReceiptType.TOLL_TICKET),
                    (ExpenseCategory.CONTAINER_DEPOSIT, 1500000, 'Cược seal & vỏ cont hãng tàu ONE', ExpenseReceiptType.EINVOICE),
                    (ExpenseCategory.LIFT_ON, 650000, 'Nâng cont Cảng Tân Cảng Hiệp Phước', ExpenseReceiptType.EIR_RECEIPT)
                ], DriverAdvanceStatus.ADVANCED, 'Đang tạm ứng đường dài, chưa nộp hóa đơn VAT về VP'),

                (1500000, [
                    (ExpenseCategory.TOLL_FEE, 450000, 'Vé trạm thu phí BOT Xa Lộ Hà Nội', ExpenseReceiptType.TOLL_TICKET),
                    (ExpenseCategory.LIFT_ON, 600000, 'Phí nâng cont ICD Phước Long 3', ExpenseReceiptType.EIR_RECEIPT),
                    (ExpenseCategory.OTHER, 450000, 'Phí lưu ca & bốc xếp tăng bo', ExpenseReceiptType.OTHER_RECEIPT)
                ], DriverAdvanceStatus.SETTLED, 'Khớp đúng 100% (Ứng 1.500.000 đ = Chi 1.500.000 đ), đã chốt sổ hoàn ứng'),

                (2200000, [
                    (ExpenseCategory.TOLL_FEE, 520000, 'Vé BOT cao tốc Trung Lương - Mỹ Thuận', ExpenseReceiptType.TOLL_TICKET),
                    (ExpenseCategory.LIFT_OFF, 580000, 'Hạ cont Cảng Quốc Tế Long An', ExpenseReceiptType.EIR_RECEIPT),
                    (ExpenseCategory.WEIGHING, 120000, 'Cân tải trọng cầu cảng', ExpenseReceiptType.WEIGHING_TICKET)
                ], DriverAdvanceStatus.ADVANCED, 'Chờ kế toán đối chiếu cuống vé BOT')
            ]

            for idx, trip in enumerate(trips):
                if idx >= len(scenarios):
                    break

                sc = scenarios[idx]
                adv_amt = sc[0]
                exp_items = sc[1]
                adv_stat = sc[2]
                note = sc[3]

                driver = trip.driver
                if not driver:
                    driver = Employee.objects.filter(role=EmployeeRole.DRIVER, is_deleted=False).first()

                # Tạo các khoản TripExpense nếu chưa có
                total_exp_spent = 0
                for exp_cat, exp_amt, exp_note, rc_type in exp_items:
                    total_exp_spent += exp_amt
                    # Kiểm tra xem khoản chi này đã tồn tại trên chuyến chưa
                    existing_exp = TripExpense.objects.filter(trip=trip, category=exp_cat, amount=exp_amt).first()
                    if not existing_exp:
                        TripExpense.objects.create(
                            trip=trip,
                            driver=driver,
                            category=exp_cat,
                            amount=exp_amt,
                            notes=exp_note,
                            receipt_type=rc_type,
                            status=ApprovalStatus.APPROVED if adv_stat == DriverAdvanceStatus.SETTLED else ApprovalStatus.PENDING,
                            is_on_behalf_of_customer=False
                        )
                        expense_created_count += 1

                # Tính chênh lệch hoàn ứng
                diff = adv_amt - total_exp_spent
                refund_amt = diff if diff > 0 else 0
                reimburse_amt = abs(diff) if diff < 0 else 0
                diff_type = SettlementDiffType.BALANCED
                if diff > 0:
                    diff_type = SettlementDiffType.DRIVER_REFUND
                elif diff < 0:
                    diff_type = SettlementDiffType.COMPANY_REIMBURSE

                adv_code = f"TUTX-{today.strftime('%Y%m')}-{idx+1:04d}"
                adv, created = DriverTripAdvance.objects.get_or_create(
                    code=adv_code,
                    defaults={
                        'trip': trip,
                        'driver': driver,
                        'dispatcher_fund': fund1,
                        'advance_source': AdvanceSourceType.DISPATCHER_FUND,
                        'amount': adv_amt,
                        'advance_date': trip.loading_date or today,
                        'purpose': 'Chi phí cầu đường BOT, nâng hạ cont & cược vỏ chuyến ' + trip.trip_code,
                        'status': adv_stat,
                        'actual_spent': total_exp_spent if adv_stat == DriverAdvanceStatus.SETTLED else 0,
                        'settlement_diff_type': diff_type if adv_stat == DriverAdvanceStatus.SETTLED else SettlementDiffType.BALANCED,
                        'refund_amount': refund_amt if adv_stat == DriverAdvanceStatus.SETTLED else 0,
                        'reimburse_amount': reimburse_amt if adv_stat == DriverAdvanceStatus.SETTLED else 0,
                        'settled_at': (timezone.now() - datetime.timedelta(hours=6)) if adv_stat == DriverAdvanceStatus.SETTLED else None,
                        'settled_by': accountant if adv_stat == DriverAdvanceStatus.SETTLED else None,
                        'settlement_notes': note if adv_stat == DriverAdvanceStatus.SETTLED else '',
                        'notes': note
                    }
                )

                if created:
                    adv_created_count += 1

                # Cập nhật vào DispatchTrip
                trip.driver_advance_amount = adv_amt
                trip.advance_settlement_status = 'SETTLED' if adv_stat == DriverAdvanceStatus.SETTLED else 'ADVANCED'
                trip.save(update_fields=['driver_advance_amount', 'advance_settlement_status'])

        self.stdout.write(
            f"[OK] KHOI TAO THANH CONG:\n"
            f"  - 2 Goi Quy Dieu Van da tao/dong bo (1 APPROVED, 1 SETTLED)\n"
            f"  - {adv_created_count} Phieu Tam Ung Chuyen Xe (TUTX) duoc tao moi\n"
            f"  - {expense_created_count} Khoan chi phi phat sinh (BOT, Nang ha, Cuoc cont, Can xe) duoc them thuc te\n"
            f"  - So du kha dung Quy Dieu Van hien tai: {fund1.remaining_balance:,} d\n"
            f"  - Toan bo chuyen xe da duoc lien ket va dong bo 100%!"
        )
