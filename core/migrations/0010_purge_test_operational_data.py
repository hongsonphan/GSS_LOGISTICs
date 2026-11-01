# Generated data migration to purge test operational data while preserving master data
from django.db import migrations


def purge_test_operational_data_forward(apps, schema_editor):
    from core.management.commands.purge_operational_data import run_purge_operational_data
    run_purge_operational_data(clean_media=True)


def purge_test_operational_data_backward(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_access_groups'),
        ('dispatch', '0022_backfill_containers_times'),
        ('billing', '0014_cashtransaction_company_customerinvoice_company_and_more'),
        ('customers', '0020_customer_partner'),
        ('collaboration', '0005_chatroom_company_companypost_company_and_more'),
        ('personnel', '0012_employee_company_laborcontract_company_and_more'),
        ('customs', '0002_customsdeclaration_company'),
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
