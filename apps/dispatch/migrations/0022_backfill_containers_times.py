"""Sao chép container 1/2 sang bảng TripContainer và điền các mốc giờ *_at còn trống từ cột chữ."""
from django.db import migrations


def forwards(apps, schema_editor):
    from apps.dispatch.time_utils import TIME_PAIRS, parse_vn_datetime

    Trip = apps.get_model('dispatch', 'DispatchTrip')
    TripContainer = apps.get_model('dispatch', 'TripContainer')
    batch = []
    for trip in Trip.objects.all().iterator(chunk_size=500):
        batch.append(TripContainer(
            trip_id=trip.pk, seq=1, container_number=trip.container_number or '', seal_number=trip.seal_number or '',
            container_type=trip.container_type or '', booking_or_bill=trip.booking_or_bill or '',
            vgm_weight=trip.vgm_weight or '', cargo_notes=trip.cargo_notes or ''))
        if trip.is_twin_container or trip.container_number_2:
            batch.append(TripContainer(
                trip_id=trip.pk, seq=2, container_number=trip.container_number_2 or '', seal_number=trip.seal_number_2 or '',
                container_type=trip.container_type or '', booking_or_bill=trip.booking_or_bill_2 or '',
                vgm_weight=trip.vgm_weight_2 or '', cargo_notes=trip.cargo_notes_2 or ''))
        base = trip.loading_date or (trip.created_at.date() if trip.created_at else None)
        updates = {}
        for text_field, dt_field in TIME_PAIRS:
            if getattr(trip, dt_field) is None:
                value = parse_vn_datetime(getattr(trip, text_field), base)
                if value is not None:
                    updates[dt_field] = value
        if updates:
            Trip.objects.filter(pk=trip.pk).update(**updates)
        if len(batch) >= 500:
            TripContainer.objects.bulk_create(batch, ignore_conflicts=True)
            batch = []
    if batch:
        TripContainer.objects.bulk_create(batch, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [('dispatch', '0021_trip_container')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
