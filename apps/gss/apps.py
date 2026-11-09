from django.apps import AppConfig


class GssConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.gss"
    verbose_name = "GSS nghiep vu container"

    def ready(self):
        from django.db.models.signals import post_save
        from apps.customers.models import BookingOrder
        from apps.gss.legs import _on_booking_saved
        post_save.connect(_on_booking_saved, sender=BookingOrder, dispatch_uid='gss_sync_bill_of_lading')
