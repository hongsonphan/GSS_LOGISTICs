# Generated data migration to purge test personnel data while preserving system users & configs
from django.db import migrations


def purge_test_personnel_forward(apps, schema_editor):
    from apps.fleet.models import Vehicle
    from apps.personnel.models import (
        Employee, LaborContract, ContractAppendix, EmployeeDependent,
        DailyAttendance, MonthlyAttendanceSummary, PayrollSlip, PayrollPeriod
    )

    # 1. Unlink current_driver from all vehicles
    Vehicle.objects.all().update(current_driver=None)

    # 2. Delete any residual operational payroll & attendance records
    PayrollSlip.objects.all().delete()
    MonthlyAttendanceSummary.objects.all().delete()
    DailyAttendance.objects.all().delete()
    PayrollPeriod.objects.all().delete()

    # 3. Delete all personnel profiles, contracts, appendices, dependents
    ContractAppendix.objects.all().delete()
    LaborContract.objects.all().delete()
    EmployeeDependent.objects.all().delete()
    Employee.objects.all().delete()


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
