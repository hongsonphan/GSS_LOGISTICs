from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import DispatchTrip

@receiver(post_save, sender=DispatchTrip)
def handle_trip_status_change(sender, instance, created, **kwargs):
    """Đồng bộ trạng thái xe và tài xế khi chuyến thay đổi trạng thái."""
    vehicle = instance.vehicle
    if vehicle:
        if instance.status in ['ACCEPTED', 'CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY']:
            if vehicle.status != 'ACTIVE':
                vehicle.status = 'ACTIVE'
                vehicle.save(update_fields=['status'])
        elif instance.status in ['COMPLETED', 'CANCELLED']:
            # Kiểm tra xem xe có chuyến nào khác đang chạy không
            other_active = DispatchTrip.objects.filter(
                vehicle=vehicle,
                status__in=['ACCEPTED', 'CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'RETURNING_EMPTY']
            ).exclude(id=instance.id).exists()
            if not other_active and vehicle.status == 'ACTIVE':
                vehicle.status = 'IDLE'
                vehicle.save(update_fields=['status'])

from django.db.models.signals import post_save as _post_save


def _sync_containers(sender, instance, raw=False, **kwargs):
    if raw:
        return
    from apps.dispatch.models import sync_trip_containers
    sync_trip_containers(instance)


def _connect_container_sync():
    from apps.dispatch.models import DispatchTrip
    _post_save.connect(_sync_containers, sender=DispatchTrip, weak=False, dispatch_uid="sync_trip_containers")


_connect_container_sync()
