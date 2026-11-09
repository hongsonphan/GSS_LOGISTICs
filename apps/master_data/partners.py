"""Đồng bộ Đối tác hợp nhất (Partner) từ hồ sơ Khách hàng và Nhà xe/Nhà cung cấp."""
from django.db.models.signals import post_save

from core.sequences import next_code

ROLE_FIELD = {'customer': 'is_customer', 'carrier': 'is_carrier', 'supplier': 'is_supplier'}


def _role_of(profile):
    if profile._meta.label == 'customers.Customer':
        return 'customer'
    from apps.master_data.models import PartnerType
    return 'carrier' if getattr(profile, 'partner_type', PartnerType.CARRIER) == PartnerType.CARRIER else 'supplier'


def sync_partner(profile):
    """Tạo/cập nhật Partner cho 1 hồ sơ Customer hoặc Subcontractor và gắn liên kết. Trả về Partner."""
    from apps.master_data.models import Partner
    role = _role_of(profile)
    tax = (profile.tax_code or '').strip()
    partner = None
    if profile.partner_id:
        partner = Partner.all_objects.filter(pk=profile.partner_id).first()
    if partner is None and tax:
        partner = Partner.objects.filter(company_id=profile.company_id, tax_code=tax).first()
    if partner is None:
        partner = Partner(company_id=profile.company_id, code=next_code(Partner, 'code', 'DT.', 4))
    partner.name = profile.name or partner.name
    partner.short_name = getattr(profile, 'short_name', '') or partner.short_name
    partner.tax_code = tax or partner.tax_code
    partner.address = getattr(profile, 'address', '') or partner.address
    partner.phone = getattr(profile, 'phone', '') or partner.phone
    partner.email = getattr(profile, 'company_email', '') or partner.email
    partner.bank_account_number = getattr(profile, 'bank_account_number', '') or partner.bank_account_number
    partner.bank_name = getattr(profile, 'bank_name', '') or partner.bank_name
    partner.bank_account_holder = getattr(profile, 'bank_account_holder', '') or partner.bank_account_holder
    setattr(partner, ROLE_FIELD[role], True)
    partner.save()
    if profile.partner_id != partner.pk:
        type(profile)._base_manager.filter(pk=profile.pk).update(partner=partner)
        profile.partner_id = partner.pk
    return partner


def _on_profile_saved(sender, instance, raw=False, **kwargs):
    if raw or instance.is_deleted:
        return
    sync_partner(instance)


def _connect():
    from apps.customers.models import Customer
    from apps.master_data.models import Subcontractor
    post_save.connect(_on_profile_saved, sender=Customer, dispatch_uid='partner_sync_customer')
    post_save.connect(_on_profile_saved, sender=Subcontractor, dispatch_uid='partner_sync_subcontractor')
