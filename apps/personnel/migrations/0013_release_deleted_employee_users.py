from django.db import migrations


def release_deleted_employee_users(apps, schema_editor):
    schema_editor.execute("UPDATE personnel_employee SET user_id = NULL WHERE is_deleted = TRUE AND user_id IS NOT NULL;")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('personnel', '0012_employee_company_laborcontract_company_and_more'),
    ]

    operations = [
        migrations.RunPython(release_deleted_employee_users, noop),
    ]
