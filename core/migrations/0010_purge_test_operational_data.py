# Bản gốc xóa dữ liệu vận hành + thư mục media mỗi khi dựng DB mới (kể cả DB test) nên làm mất file thật.
# Các DB đã chạy migration này thì không chạy lại; DB mới vốn trống. Nay là no-op; muốn dọn dữ liệu thử thì chạy
# `python manage.py purge_operational_data --confirm` thủ công.
from django.db import migrations


def purge_test_operational_data_forward(apps, schema_editor):
    pass


def purge_test_operational_data_backward(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_access_groups'),
        ('dispatch', '0022_backfill_containers_times'),
        ('billing', '0014_cashtransaction_company_customerinvoice_company_and_more'),
        ('customs', '0002_customsdeclaration_company'),
        ('customers', '0020_customer_partner'),
        ('collaboration', '0005_chatroom_company_companypost_company_and_more'),
        ('personnel', '0012_employee_company_laborcontract_company_and_more'),
        ('exceptions', '0001_initial'),
        ('documents', '0003_alter_tripdocument_document_type'),
        ('ledger', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            purge_test_operational_data_forward,
            purge_test_operational_data_backward
        ),
    ]
