"""Tạo doanh nghiệp mặc định (Triền Võ) từ Hồ sơ công ty và gán cho toàn bộ dữ liệu hiện có."""
from django.db import migrations

MODELS = [
    ('customers', 'Customer'), ('customers', 'RouteTariff'), ('customers', 'Quotation'), ('customers', 'BookingOrder'),
    ('dispatch', 'DispatchTrip'), ('fleet', 'Vehicle'), ('fleet', 'Trailer'),
    ('personnel', 'Employee'), ('personnel', 'LaborContract'), ('personnel', 'PayrollPeriod'),
    ('master_data', 'Location'), ('master_data', 'Subcontractor'), ('master_data', 'CompanyProfile'), ('master_data', 'OpeningBalance'),
    ('billing', 'TripExpense'), ('billing', 'DispatcherAdvanceFund'), ('billing', 'DriverTripAdvance'), ('billing', 'CashTransaction'),
    ('billing', 'CustomerInvoice'), ('billing', 'SubcontractorSettlement'), ('billing', 'DriverPayrollSettlement'), ('billing', 'DebitNote'),
    ('customs', 'CustomsDeclaration'), ('collaboration', 'ChatRoom'), ('collaboration', 'CompanyPost'), ('collaboration', 'OfficeTask'),
]


def forwards(apps, schema_editor):
    Company = apps.get_model('core', 'Company')
    CompanyProfile = apps.get_model('master_data', 'CompanyProfile')
    company = Company.objects.filter(is_default=True).first()
    if company is None:
        profile = CompanyProfile.objects.filter(is_deleted=False, is_default=True).first() or CompanyProfile.objects.filter(is_deleted=False).first()
        company = Company.objects.create(
            code='TVL',
            name=(profile.company_name if profile and profile.company_name else 'Công ty TNHH Vận tải & Tiếp vận Triền Võ'),
            tax_code=(profile.tax_code if profile and profile.tax_code else ''),
            is_default=True,
        )
    for app_label, model_name in MODELS:
        model = apps.get_model(app_label, model_name)
        model._base_manager.filter(company__isnull=True).update(company=company)


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0003_company_tenant'),
        ('customers', '0019_bookingorder_company_customer_company_and_more'),
        ('dispatch', '0020_dispatchtrip_company'),
        ('fleet', '0007_trailer_company_vehicle_company'),
        ('personnel', '0012_employee_company_laborcontract_company_and_more'),
        ('master_data', '0014_companyprofile_company_location_company_and_more'),
        ('billing', '0014_cashtransaction_company_customerinvoice_company_and_more'),
        ('customs', '0002_customsdeclaration_company'),
        ('collaboration', '0005_chatroom_company_companypost_company_and_more'),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
