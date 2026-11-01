import os
import sys
import shutil
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

# Model imports
from apps.collaboration.models import (
    ChatAttachment, ChatMessage, ChatParticipant, ChatRoom,
    TaskActivityLog, TaskComment, TaskAttachment, TaskChecklist, OfficeTask,
    PostReadStatus, PostComment, PostAttachment, CompanyPost, Notification
)
from core.models import TrackingEventLog, LoginEvent, AuditLog, DocumentSequence
from apps.personnel.models import (
    PayrollSlip, MonthlyAttendanceSummary, DailyAttendance, PayrollPeriod, Employee
)
from apps.billing.models import (
    CustomerInvoice, DebitNote, SubcontractorSettlement, DriverPayrollSettlement,
    CashTransaction, DriverTripAdvance, DispatcherAdvanceFund, TripExpense
)
from apps.documents.models import TripDocument
from apps.exceptions.models import TripException
from apps.customs.models import CustomsDeclaration
from apps.dispatch.models import TripTimelineItem, TripContainer, DispatchTrip
from apps.customers.models import BookingDocument, BookingOrder, QuotationItem, Quotation
from apps.ledger.models import JournalLine, JournalEntry


def run_purge_operational_data(clean_media=True, stdout=None):
    """
    Xóa toàn bộ dữ liệu nghiệp vụ phát sinh (operational/transactional data)
    nhưng BẢO LƯU 100% DANH MỤC GỐC (Master Data / Catalogs / Categories).
    """
    if hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

    def log(msg):
        if stdout:
            try:
                stdout.write(msg)
            except UnicodeEncodeError:
                stdout.write(msg.encode('ascii', 'replace').decode('ascii'))
        else:
            try:
                print(msg)
            except UnicodeEncodeError:
                print(msg.encode('ascii', 'replace').decode('ascii'))

    purged_counts = {}

    with transaction.atomic():
        # 1. Gỡ quan hệ nhiều-nhiều (ManyToMany) trước khi xóa
        for inv in CustomerInvoice.objects.all():
            inv.trips.clear()
        for dn in DebitNote.objects.all():
            dn.expenses.clear()
        for sub_s in SubcontractorSettlement.objects.all():
            sub_s.trips.clear()
        for drv_s in DriverPayrollSettlement.objects.all():
            drv_s.trips.clear()
        for task in OfficeTask.objects.all():
            task.followers.clear()

        # 2. Xóa các liên kết khóa ngoại tự tham chiếu / chéo
        ChatMessage.objects.all().update(reply_to=None, related_task=None)
        PayrollPeriod.objects.all().update(cash_transaction=None)
        DispatchTrip.objects.all().update(booking_order=None)

        # 3. Thứ tự xóa theo quan hệ phụ thuộc ngược (Reverse dependency order)
        deletion_plan = [
            # Chat & Thông báo
            ('ChatAttachment', ChatAttachment),
            ('ChatMessage', ChatMessage),
            ('ChatParticipant', ChatParticipant),
            ('ChatRoom', ChatRoom),
            ('Notification', Notification),

            # Nhiệm vụ nội bộ (OfficeTask & sub-models)
            ('TaskActivityLog', TaskActivityLog),
            ('TaskComment', TaskComment),
            ('TaskAttachment', TaskAttachment),
            ('TaskChecklist', TaskChecklist),
            ('OfficeTask', OfficeTask),

            # Bản tin nội bộ (CompanyPost & sub-models)
            ('PostReadStatus', PostReadStatus),
            ('PostComment', PostComment),
            ('PostAttachment', PostAttachment),
            ('CompanyPost', CompanyPost),

            # Nhật ký vận hành & bảo mật hệ thống
            ('TrackingEventLog', TrackingEventLog),
            ('LoginEvent', LoginEvent),
            ('AuditLog', AuditLog),
            ('DocumentSequence', DocumentSequence),

            # Chấm công & tính lương phát sinh hàng kỳ
            ('PayrollSlip', PayrollSlip),
            ('MonthlyAttendanceSummary', MonthlyAttendanceSummary),
            ('DailyAttendance', DailyAttendance),
            ('PayrollPeriod', PayrollPeriod),

            # Kế toán, thanh toán, hoá đơn, tạm ứng chuyến
            ('CustomerInvoice', CustomerInvoice),
            ('DebitNote', DebitNote),
            ('SubcontractorSettlement', SubcontractorSettlement),
            ('DriverPayrollSettlement', DriverPayrollSettlement),
            ('CashTransaction', CashTransaction),
            ('DriverTripAdvance', DriverTripAdvance),
            ('DispatcherAdvanceFund', DispatcherAdvanceFund),
            ('TripExpense', TripExpense),

            # Chứng từ & sự cố chuyến xe
            ('TripDocument', TripDocument),
            ('TripException', TripException),

            # Hải quan phát sinh
            ('CustomsDeclaration', CustomsDeclaration),

            # Điều độ chuyến xe & container
            ('TripTimelineItem', TripTimelineItem),
            ('TripContainer', TripContainer),
            ('DispatchTrip', DispatchTrip),

            # Bán hàng & Đơn hàng booking
            ('BookingDocument', BookingDocument),
            ('BookingOrder', BookingOrder),
            ('QuotationItem', QuotationItem),
            ('Quotation', Quotation),

            # Sổ cái kế toán phát sinh
            ('JournalLine', JournalLine),
            ('JournalEntry', JournalEntry),
        ]

        for model_name, model_cls in deletion_plan:
            cnt = model_cls.objects.count()
            purged_counts[model_name] = cnt
            model_cls.objects.all().delete()
            log(f"  - [X] Đã xóa {model_name}: {cnt} bản ghi")

        # 4. Đặt lại số dư tạm ứng phát sinh của tài xế/nhân viên về 0
        updated_adv = Employee.objects.filter(current_advance__gt=0).update(current_advance=0)
        log(f"  - [X] Đã đặt lại công nợ tạm ứng về 0đ cho {updated_adv} nhân sự/tài xế")

    # 5. Dọn dẹp tệp tin rác phát sinh trong media/ (chỉ dọn các thư mục test, bảo toàn logo & avatar danh mục)
    purged_files_count = 0
    if clean_media and hasattr(settings, 'MEDIA_ROOT') and os.path.isdir(settings.MEDIA_ROOT):
        media_root = settings.MEDIA_ROOT
        dirs_to_clean = [
            'booking_files', 'documents', 'receipts', 'incidents',
            'office_tasks', 'company_news', 'chat_attachments',
            'trip_docs', 'customs_docs'
        ]
        for sub_dir in dirs_to_clean:
            target_path = os.path.join(media_root, sub_dir)
            if os.path.exists(target_path):
                cnt = sum(len(files) for _, _, files in os.walk(target_path))
                purged_files_count += cnt
                try:
                    shutil.rmtree(target_path)
                    os.makedirs(target_path, exist_ok=True)
                    log(f"  - [X] Đã xóa thư mục media/{sub_dir} ({cnt} tệp đính kèm)")
                except Exception as e:
                    log(f"  - [!] Cảnh báo khi dọn dẹp media/{sub_dir}: {e}")

    purged_counts['purged_media_files'] = purged_files_count
    return purged_counts


class Command(BaseCommand):
    help = 'Xóa toàn bộ dữ liệu phát sinh nghiệp vụ (trips, bookings, invoices, cash transactions, tasks...) và giữ nguyên toàn bộ Danh mục gốc.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Bắt buộc cờ này để xác nhận xóa thực sự trong database.'
        )
        parser.add_argument(
            '--no-clean-media',
            action='store_true',
            help='Bỏ qua việc xóa tệp phát sinh trong media/.'
        )

    def handle(self, *args, **options):
        if hasattr(sys.stdout, 'reconfigure'):
            try:
                sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            except Exception:
                pass

        def safe_write(msg, style_func=None):
            styled = style_func(msg) if style_func else msg
            try:
                self.stdout.write(styled)
            except UnicodeEncodeError:
                self.stdout.write(styled.encode('ascii', 'replace').decode('ascii'))

        if not options['confirm']:
            safe_write(
                "CHE DO XEM TRUOC (DRY-RUN): Ban chua truyen co --confirm. "
                "He thong se chi thong ke so luong du lieu se bi xoa ma khong thay doi database.",
                self.style.WARNING
            )
            # Dry-run count
            models_to_check = [
                ('Chat (Tin nhan, file, phong)', ChatMessage.objects.count() + ChatAttachment.objects.count() + ChatRoom.objects.count()),
                ('Nhiem vu noi bo (Tasks, Checklist)', OfficeTask.objects.count() + TaskChecklist.objects.count()),
                ('Tin tuc noi bo', CompanyPost.objects.count()),
                ('Thong bao (Notifications)', Notification.objects.count()),
                ('Log dang nhap & Tracking', LoginEvent.objects.count() + TrackingEventLog.objects.count()),
                ('Ky luong & Phieu luong', PayrollPeriod.objects.count() + PayrollSlip.objects.count() + MonthlyAttendanceSummary.objects.count()),
                ('Hoa don ban hang & Debit Notes', CustomerInvoice.objects.count() + DebitNote.objects.count()),
                ('Quyet toan thau phu & tai xe', SubcontractorSettlement.objects.count() + DriverPayrollSettlement.objects.count()),
                ('Phieu thu/chi tien mat & Tam ung', CashTransaction.objects.count() + DriverTripAdvance.objects.count() + DispatcherAdvanceFund.objects.count()),
                ('Chi phi chuyen xe (Trip Expense)', TripExpense.objects.count()),
                ('To khai Hai quan', CustomsDeclaration.objects.count()),
                ('Chuyen xe dieu do & Container', DispatchTrip.objects.count() + TripContainer.objects.count() + TripTimelineItem.objects.count()),
                ('Don hang Booking & Bao gia', BookingOrder.objects.count() + Quotation.objects.count() + QuotationItem.objects.count()),
                ('So cai ke toan', JournalLine.objects.count() + JournalEntry.objects.count()),
            ]
            total_recs = 0
            for name, cnt in models_to_check:
                safe_write(f"  * {name}: {cnt} ban ghi")
                total_recs += cnt

            safe_write(f"\nTong cong: {total_recs} ban ghi phat sinh san sang duoc xoa.", self.style.SUCCESS)
            safe_write("De thuc hien xoa that, chay: python manage.py purge_operational_data --confirm")
            return

        safe_write("Dang bat dau xoa toan bo du lieu phat sinh nghiep vu...", self.style.WARNING)
        clean_media = not options.get('no_clean_media', False)
        counts = run_purge_operational_data(clean_media=clean_media, stdout=self.stdout)
        safe_write(
            "\n[HOAN TAT] Toan bo du lieu phat sinh da duoc don sach thanh cong! Toan bo Danh muc goc duoc bao luu nguyen ven.",
            self.style.SUCCESS
        )
