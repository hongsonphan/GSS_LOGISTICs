import sys
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.dispatch.models import DispatchTrip, TripTimelineItem
from apps.billing.models import TripExpense, ApprovalStatus
from apps.documents.models import TripDocument, DocumentType
from core.models import TrackingEventLog


class Command(BaseCommand):
    help = "Rà soát toàn diện cơ sở dữ liệu, khử trùng lặp chứng từ/chi phí và đối chiếu chéo chi phí - chứng từ số."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Chỉ quét và báo cáo kiểm toán, không thực hiện xóa dữ liệu',
        )

    def handle(self, *args, **options):
        try:
            if hasattr(sys.stdout, 'reconfigure'):
                sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

        dry_run = options.get('dry_run', False)
        mode_label = "[DRY-RUN - CHI KIEM TRA]" if dry_run else "[THUC THI DON DEP & DOI CHIEU]"
        self.stdout.write(self.style.WARNING(f"\n=== {mode_label} RA SOAT & KHU TRUNG TOAN DIEN HE THONG ==="))

        total_docs_removed = 0
        total_expenses_removed = 0
        total_timeline_removed = 0
        total_logs_removed = 0

        trips = DispatchTrip.objects.all().order_by('trip_code')
        if not trips.exists():
            self.stdout.write(self.style.WARNING("Chưa có chuyến xe nào trong cơ sở dữ liệu."))
            return

        report_rows = []

        with transaction.atomic():
            for trip in trips:
                trip_report = {
                    'code': trip.trip_code,
                    'customer': trip.customer.name if trip.customer else 'N/A',
                    'docs_before': 0,
                    'docs_after': 0,
                    'docs_removed': 0,
                    'exp_before': 0,
                    'exp_after': 0,
                    'exp_removed': 0,
                    'total_expense': 0,
                    'revenue': trip.cached_revenue,
                    'profit': 0,
                    'cross_check_status': 'OK',
                    'cross_check_notes': []
                }

                # 1. RÀ SOÁT & KHỬ TRÙNG CHỨNG TỪ (TripDocument)
                all_docs = list(TripDocument.all_objects.filter(trip=trip).order_by('id'))
                trip_report['docs_before'] = len(all_docs)

                # Nhóm theo (document_type, title)
                grouped_docs = {}
                for doc in all_docs:
                    key = (doc.document_type, (doc.title or '').strip())
                    grouped_docs.setdefault(key, []).append(doc)

                kept_docs = []
                docs_to_delete = []

                for key, doc_list in grouped_docs.items():
                    # Ưu tiên giữ lại:
                    # 1. is_deleted == False
                    # 2. is_verified == True
                    # 3. có ocr_raw_text hoặc file_path
                    # 4. id nhỏ nhất (bản ghi gốc đầu tiên)
                    doc_list.sort(key=lambda d: (
                        not d.is_deleted,
                        d.is_verified,
                        bool(d.ocr_raw_text or d.file_path),
                        -d.id
                    ), reverse=True)

                    best_doc = doc_list[0]
                    # Phục hồi nếu bản ghi được chọn từng bị soft-delete
                    if best_doc.is_deleted and not dry_run:
                        best_doc.is_deleted = False
                        best_doc.deleted_at = None
                        best_doc.save(update_fields=['is_deleted', 'deleted_at'])

                    kept_docs.append(best_doc)
                    for dup in doc_list[1:]:
                        docs_to_delete.append(dup)

                trip_report['docs_after'] = len(kept_docs)
                trip_report['docs_removed'] = len(docs_to_delete)
                total_docs_removed += len(docs_to_delete)

                if not dry_run and docs_to_delete:
                    delete_ids = [d.id for d in docs_to_delete]
                    TripDocument.all_objects.filter(id__in=delete_ids).hard_delete()

                # 2. RÀ SOÁT & KHỬ TRÙNG CHI PHÍ (TripExpense)
                all_expenses = list(TripExpense.objects.filter(trip=trip, is_deleted=False).order_by('id'))
                trip_report['exp_before'] = len(all_expenses)

                grouped_expenses = {}
                for exp in all_expenses:
                    # Nhóm theo category, amount, invoice_number
                    key = (exp.category, exp.amount, (exp.invoice_number or '').strip())
                    grouped_expenses.setdefault(key, []).append(exp)

                kept_expenses = []
                expenses_to_delete = []

                for key, exp_list in grouped_expenses.items():
                    exp_list.sort(key=lambda e: (
                        e.status == ApprovalStatus.APPROVED,
                        bool(e.invoice_issuer or e.invoice_lookup_code),
                        -e.id
                    ), reverse=True)

                    kept_expenses.append(exp_list[0])
                    for dup in exp_list[1:]:
                        expenses_to_delete.append(dup)

                trip_report['exp_after'] = len(kept_expenses)
                trip_report['exp_removed'] = len(expenses_to_delete)
                total_expenses_removed += len(expenses_to_delete)

                if not dry_run and expenses_to_delete:
                    del_exp_ids = [e.id for e in expenses_to_delete]
                    TripExpense.all_objects.filter(id__in=del_exp_ids).hard_delete()

                # 3. RÀ SOÁT & KHỬ TRÙNG 10 BƯỚC TIẾN ĐỘ (TripTimelineItem)
                timeline_items = list(TripTimelineItem.objects.filter(trip=trip).order_by('step_number', 'id'))
                grouped_timeline = {}
                for tli in timeline_items:
                    grouped_timeline.setdefault(tli.step_number, []).append(tli)

                for step_num, step_list in grouped_timeline.items():
                    if len(step_list) > 1:
                        # Giữ lại bản ghi có time_display hoặc is_done hợp lệ
                        step_list.sort(key=lambda item: (item.is_done, bool(item.time_display)), reverse=True)
                        for dup_tli in step_list[1:]:
                            total_timeline_removed += 1
                            if not dry_run:
                                dup_tli.delete()

                # 4. RÀ SOÁT & KHỬ TRÙNG SỰ KIỆN KHỞI TẠO SEED (TrackingEventLog)
                seed_logs = list(TrackingEventLog.objects.filter(trip=trip, event_type='SEED_DATA').order_by('created_at'))
                if len(seed_logs) > 1:
                    for dup_log in seed_logs[1:]:
                        total_logs_removed += 1
                        if not dry_run:
                            dup_log.delete()

                # 5. ĐỐI CHIẾU CHÉO (CROSS-CHECK) CHI PHÍ VÀ CHỨNG TỪ SỐ
                valid_expenses = [e for e in kept_expenses if e.status != ApprovalStatus.REJECTED]
                total_actual_expense = sum(e.amount for e in valid_expenses)
                trip_report['total_expense'] = total_actual_expense
                profit = trip.cached_revenue - total_actual_expense
                trip_report['profit'] = profit

                # Đồng bộ lại cached tài chính nếu có thay đổi
                if not dry_run:
                    margin_pct = round((profit / trip.cached_revenue) * 100, 2) if trip.cached_revenue > 0 else 0
                    if (trip.cached_expense != total_actual_expense or
                        trip.cached_profit != profit or
                        trip.cached_margin_percent != margin_pct):
                        trip.cached_expense = total_actual_expense
                        trip.cached_profit = profit
                        trip.cached_margin_percent = margin_pct
                        trip.save(update_fields=['cached_expense', 'cached_profit', 'cached_margin_percent'])

                # Kiểm tra đối chiếu chéo từng khoản chi có HĐĐT với chứng từ
                invoice_expenses = [e for e in valid_expenses if e.invoice_number]
                doc_invoices = [d for d in kept_docs if d.document_type == DocumentType.INVOICE]

                for ie in invoice_expenses:
                    # Kiểm tra xem có chứng từ HĐĐT nào khớp số HĐ hoặc số tiền không
                    match_doc = None
                    for di in doc_invoices:
                        if ie.invoice_number in (di.title or '') or ie.invoice_number in (di.ocr_raw_text or ''):
                            match_doc = di
                            break

                    if match_doc:
                        trip_report['cross_check_notes'].append(
                            f"Khớp HĐ {ie.invoice_number} ({ie.amount:,} đ) -> Chứng từ: '{match_doc.title}'"
                        )
                    else:
                        trip_report['cross_check_notes'].append(
                            f"HĐ {ie.invoice_number} ({ie.amount:,} đ) [Chưa có file chứng từ riêng]"
                        )

                # Kiểm tra chứng từ EIR
                eir_docs = [d for d in kept_docs if d.document_type in [DocumentType.EIR_PICKUP, DocumentType.EIR_DROPOFF]]
                if eir_docs:
                    trip_report['cross_check_notes'].append(f"Có {len(eir_docs)} phiếu EIR hiện trường")

                # Kiểm tra chứng từ POD
                pod_docs = [d for d in kept_docs if d.document_type == DocumentType.POD]
                if pod_docs:
                    trip_report['cross_check_notes'].append(f"Có {len(pod_docs)} biên bản POD giao hàng")

                report_rows.append(trip_report)

        # IN BẢNG BÁO CÁO KIỂM TOÁN VÀ ĐỐI CHIẾU CHÉO
        self.stdout.write("\n" + "=" * 90)
        self.stdout.write(f"{'MÃ CHUYẾN':<14} | {'KHÁCH HÀNG':<16} | {'CHỨNG TỪ (CŨ -> MỚI)':<22} | {'CHI PHÍ':<12} | {'ĐỐI CHIẾU'}")
        self.stdout.write("-" * 90)

        for r in report_rows:
            doc_str = f"{r['docs_before']} -> {r['docs_after']} (-{r['docs_removed']})"
            exp_str = f"{r['total_expense']:,} đ"
            notes = "; ".join(r['cross_check_notes']) if r['cross_check_notes'] else 'Không phát sinh HĐ'
            self.stdout.write(
                f"{r['code']:<14} | {r['customer'][:16]:<16} | {doc_str:<22} | {exp_str:<12} | {notes}"
            )

        self.stdout.write("-" * 90)
        self.stdout.write(self.style.SUCCESS(
            f"TỔNG KẾT DỌN DẸP:\n"
            f"  - Chứng từ trùng lặp đã xóa: {total_docs_removed}\n"
            f"  - Khoản chi trùng lặp đã xóa: {total_expenses_removed}\n"
            f"  - Mốc tiến độ trùng lặp đã xóa: {total_timeline_removed}\n"
            f"  - Log sự kiện trùng lặp đã xóa: {total_logs_removed}\n"
            f"  - Trạng thái: {'KIỂM THỬ XONG (Chưa lưu)' if dry_run else 'HOÀN TẤT DỌN DẸP & ĐỒNG BỘ 100%'}"
        ))
        self.stdout.write("=" * 90 + "\n")
