from django.apps import AppConfig


class LedgerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ledger'
    verbose_name = 'Sổ cái kế toán'

    def ready(self):
        from . import signals
        signals.connect()
