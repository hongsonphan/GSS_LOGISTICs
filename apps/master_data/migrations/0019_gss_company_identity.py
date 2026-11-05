"""Đặt thông tin pháp nhân của GSS thay cho dữ liệu công ty cũ (Triền Võ) còn sót trong CSDL.

Chỉ ghi đè hồ sơ nào vẫn mang thông tin công ty cũ; hồ sơ GSS đã chỉnh tay thì giữ nguyên.
Các trường chưa có thông tin chính thức (điện thoại, email, website, ngân hàng, người đại diện...) được để trống.
"""
from django.db import migrations

OLD_MARKERS = ('TRIỀN VÕ', 'TRIEN VO')
GSS = {
    'company_name': 'CÔNG TY TNHH CUNG ỨNG GIẢI PHÁP XANH',
    'company_name_en': 'GREEN SOLUTIONS SUPPLY COMPANY LIMITED',
    'short_name': 'Green Solutions Supply Co., Ltd.',
    'tax_code': '0316657112',
    'address': '302/5 Lê Đức Thọ, Phường An Nhơn, TP Hồ Chí Minh, Việt Nam',
    'phone': '', 'email': '', 'website': '',
    'representative_name': '', 'bank_account_number': '', 'bank_name': '', 'bank_branch': '',
    'operating_license': '', 'branch_name': '', 'branch_address': '', 'branch_phone': '',
    'fleet_yard_name': '', 'fleet_yard_address': '', 'fleet_yard_hotline': '',
    'logo_url': '/static/images/gss_logo.svg',
}


def forwards(apps, schema_editor):
    CompanyProfile = apps.get_model('master_data', 'CompanyProfile')
    for profile in CompanyProfile._base_manager.all():
        name = (profile.company_name or '').upper()
        if any(m in name for m in OLD_MARKERS):
            for field, value in GSS.items():
                setattr(profile, field, value)
            profile.save()
    Company = apps.get_model('core', 'Company')
    for company in Company.objects.all():
        if any(m in (company.name or '').upper() for m in OLD_MARKERS) or company.code == 'TVL':
            if not Company.objects.filter(code='GSS').exclude(pk=company.pk).exists():
                company.code = 'GSS'
            company.name = GSS['company_name']
            company.tax_code = GSS['tax_code']
            company.save()


class Migration(migrations.Migration):
    dependencies = [
        ('master_data', '0018_companyprofile_company_name_en_and_more'),
        ('core', '0017_report_settlement_vouchers_permission'),
    ]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
