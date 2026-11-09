from django.apps import AppConfig

class MasterDataConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.master_data'
    verbose_name = 'Hệ Thống Danh Mục'

    def ready(self):
        from apps.master_data.signals import connect_master_data_signals
        connect_master_data_signals()
        from apps.master_data.signals import connect_live_sync_signals
        connect_live_sync_signals()
