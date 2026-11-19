from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        from core import audit  # noqa: F401  (đăng ký tín hiệu ghi nhật ký kiểm toán)
        from django.db.models.signals import post_migrate
        from core.rls import on_post_migrate
        post_migrate.connect(on_post_migrate, dispatch_uid='gss_rls_post_migrate')
        from core.immutability import on_post_migrate as on_post_migrate_immutable
        post_migrate.connect(on_post_migrate_immutable, dispatch_uid='gss_log_immutability_post_migrate')
