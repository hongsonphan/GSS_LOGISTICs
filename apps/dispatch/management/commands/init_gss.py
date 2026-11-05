"""Khởi tạo một triển khai Green Solutions Smart: nhận diện công ty, loại hình DN, bãi Đắk Nông, mẫu POD mặc định.

Chạy lại được nhiều lần (idempotent). Không động tới dữ liệu nghiệp vụ.
    python manage.py init_gss --name "CÔNG TY ..." --short GSS [--model GSS_VENDOR_DEPOT_QR] [--keep-identity]
"""
from core.console import safe_text
from django.core.management.base import BaseCommand

from apps.customers.models import PodTemplate
from apps.depot_yard.service import default_yard
from apps.dispatch.gss_messages import DEFAULT_POD
from apps.master_data.models import CompanyProfile
from core.features import PROFILES

BLANK_IDENTITY = dict(tax_code='', phone='', email='', website='', address='', representative_name='', representative_role='',
                      bank_account_number='', bank_name='', bank_branch='', operating_license='', branch_name='', branch_address='',
                      branch_phone='', fleet_yard_name='', fleet_yard_address='', fleet_yard_hotline='', logo_url='')


class Command(BaseCommand):
    help = 'Khởi tạo nhận diện & cấu hình mặc định cho triển khai GSS.'

    def add_arguments(self, parser):
        parser.add_argument('--name', default='CÔNG TY GREEN SOLUTIONS SMART', help='Tên pháp nhân')
        parser.add_argument('--short', default='GSS', help='Tên thương hiệu')
        parser.add_argument('--model', default='GSS_VENDOR_DEPOT_QR', choices=sorted(PROFILES))
        parser.add_argument('--keep-identity', action='store_true', help='Giữ nguyên thông tin pháp lý/ngân hàng hiện có')

    def handle(self, *args, **opts):
        co = CompanyProfile.get_default_company()
        co.company_name, co.short_name, co.business_model = opts['name'], opts['short'], opts['model']
        if not opts['keep_identity']:
            # Xóa dữ liệu mặc định của khách hàng cũ để không in nhầm MST/ngân hàng của doanh nghiệp khác
            for k, v in BLANK_IDENTITY.items():
                setattr(co, k, v)
        co.save()
        yard = default_yard()
        tpl, created = PodTemplate.objects.get_or_create(
            code='MAC_DINH', defaults=dict(name='Biên bản giao nhận (mặc định)', is_default=True, header_html=DEFAULT_POD['header_html'],
                                           body_html=DEFAULT_POD['body_html'], terms_html=DEFAULT_POD['terms_html']))
        self.stdout.write(self.style.SUCCESS(safe_text(
            f'Đã cấu hình: {co.short_name} · loại hình {co.business_model} · bãi "{yard.name}" · mẫu POD {"mới" if created else "đã có"} ({tpl.code}).')))
