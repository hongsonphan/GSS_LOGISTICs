# Generated data migration to purge test personnel data while preserving system users & configs
from django.db import migrations


def purge_test_personnel_forward(apps, schema_editor):
    """Đã bỏ: chỉ dùng để dọn dữ liệu thử của hệ thống cũ."""


def purge_test_personnel_backward(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_purge_test_operational_data'),
        ('fleet', '0007_trailer_company_vehicle_company'),
        ('personnel', '0012_employee_company_laborcontract_company_and_more'),
    ]

    operations = [
        migrations.RunPython(
            purge_test_personnel_forward,
            purge_test_personnel_backward
        ),
    ]
