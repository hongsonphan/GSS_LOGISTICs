"""Đồng bộ lại bảng TripContainer và các mốc giờ *_at cho mọi chuyến (chạy lại an toàn)."""
from django.core.management.base import BaseCommand

from apps.dispatch.models import DispatchTrip, sync_trip_containers
from apps.dispatch.time_utils import fill_missing_datetimes


class Command(BaseCommand):
    help = 'Đồng bộ container và mốc giờ cho các chuyến hiện có'

    def handle(self, *args, **options):
        trips = containers = times = 0
        for trip in DispatchTrip.objects.all().iterator(chunk_size=500):
            trips += 1
            sync_trip_containers(trip)
            containers += 1
            filled = fill_missing_datetimes(trip)
            if filled:
                DispatchTrip.objects.filter(pk=trip.pk).update(**{f: getattr(trip, f) for f in filled})
                times += 1
        self.stdout.write(self.style.SUCCESS(f'{trips} chuyến; {times} chuyến được điền mốc giờ.'))
