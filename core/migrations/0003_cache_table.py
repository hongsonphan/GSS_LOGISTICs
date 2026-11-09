"""Tạo bảng bộ nhớ đệm dùng chung (DatabaseCache 'bim_cache') giữa các tiến trình gunicorn."""
from django.core.management import call_command
from django.db import migrations


def create_cache_table(apps, schema_editor):
    call_command('createcachetable', 'bim_cache', database=schema_editor.connection.alias, verbosity=0)


class Migration(migrations.Migration):
    dependencies = [('core', '0002_initial')]
    operations = [migrations.RunPython(create_cache_table, migrations.RunPython.noop)]
