"""Tạo Đối tác hợp nhất cho mọi Khách hàng và Nhà xe/Nhà cung cấp hiện có (gộp theo Mã số thuế trong cùng công ty)."""
from django.db import migrations


def forwards(apps, schema_editor):
    Partner = apps.get_model('master_data', 'Partner')
    Customer = apps.get_model('customers', 'Customer')
    Subcontractor = apps.get_model('master_data', 'Subcontractor')
    counter = {'n': Partner.objects.count()}

    def get_or_make(profile, role_field):
        tax = (profile.tax_code or '').strip()
        partner = None
        if tax:
            partner = Partner.objects.filter(company_id=profile.company_id, tax_code=tax).first()
        if partner is None:
            counter['n'] += 1
            partner = Partner(company_id=profile.company_id, code=f"DT.{counter['n']:04d}", name=profile.name,
                              short_name=getattr(profile, 'short_name', '') or '', tax_code=tax,
                              address=getattr(profile, 'address', '') or '', phone=getattr(profile, 'phone', '') or '',
                              email=getattr(profile, 'company_email', '') or '',
                              bank_account_number=profile.bank_account_number or '', bank_name=profile.bank_name or '',
                              bank_account_holder=getattr(profile, 'bank_account_holder', '') or '',
                              is_deleted=profile.is_deleted)
        setattr(partner, role_field, True)
        partner.save()
        type(profile).objects.filter(pk=profile.pk).update(partner=partner)

    for c in Customer.objects.all().order_by('id'):
        get_or_make(c, 'is_customer')
    for s in Subcontractor.objects.all().order_by('id'):
        get_or_make(s, 'is_carrier' if s.partner_type == 'CARRIER' else 'is_supplier')


class Migration(migrations.Migration):
    dependencies = [
        ('master_data', '0015_partner'),
        ('customers', '0020_customer_partner'),
    ]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
