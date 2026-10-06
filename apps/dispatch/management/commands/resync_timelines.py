import sys
from django.core.management.base import BaseCommand
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.dispatch.timeline_service import sync_trip_10_step_timeline, get_derived_7_milestones


class Command(BaseCommand):
    help = 'Re-sync 11-step timeline và trích xuất 7 mốc thời gian kho cho tất cả chuyến xe trong DB'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Sync tất cả chuyến (kể cả COMPLETED/CANCELLED). Mặc định chỉ sync active.',
        )
        parser.add_argument(
            '--trip',
            type=str,
            help='Sync 1 chuyến cụ thể theo trip_code (vd: SIM-0927060140)',
        )

    def handle(self, *args, **options):
        if hasattr(sys.stdout, 'reconfigure'):
            try:
                sys.stdout.reconfigure(encoding='utf-8')
            except Exception:
                pass
        if hasattr(sys.stderr, 'reconfigure'):
            try:
                sys.stderr.reconfigure(encoding='utf-8')
            except Exception:
                pass

        if options['trip']:
            trips = DispatchTrip.objects.filter(trip_code=options['trip'])
            if not trips.exists():
                self.stderr.write(f"Không tìm thấy chuyến: {options['trip']}")
                return
        elif options['all']:
            trips = DispatchTrip.objects.all()
        else:
            # Chỉ sync các chuyến đang hoạt động (không phải COMPLETED/CANCELLED)
            trips = DispatchTrip.objects.exclude(
                status__in=[TripStatus.COMPLETED, TripStatus.CANCELLED]
            )

        total = trips.count()
        self.stdout.write(f"Bắt đầu sync {total} chuyến xe...")

        success = 0
        errors = 0
        for trip in trips.select_related('driver', 'vehicle', 'trailer'):
            try:
                get_derived_7_milestones(trip)
                sync_trip_10_step_timeline(trip)
                success += 1
                if total <= 20 or success % 10 == 0:
                    self.stdout.write(f"  ✓ [{success}/{total}] {trip.trip_code} ({trip.get_status_display()})")
            except Exception as e:
                errors += 1
                self.stderr.write(f"  ✗ {trip.trip_code}: {e}")

        self.stdout.write(
            self.style.SUCCESS(f"\nHoàn tất: {success} thành công, {errors} lỗi / {total} tổng")
        )
