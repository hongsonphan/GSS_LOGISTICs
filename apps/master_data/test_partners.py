from django.test import TestCase

from apps.customers.models import Customer
from apps.master_data.models import Partner, PartnerType, Subcontractor


class PartnerSyncTestCase(TestCase):
    def test_customer_creates_partner(self):
        c = Customer.objects.create(code="P_C1", name="Cty A", tax_code="0301111111", address="HCM")
        c.refresh_from_db()
        self.assertIsNotNone(c.partner_id)
        p = c.partner
        self.assertTrue(p.is_customer)
        self.assertEqual(p.tax_code, "0301111111")
        self.assertTrue(p.code.startswith("DT."))

    def test_same_tax_code_merges_customer_and_carrier(self):
        c = Customer.objects.create(code="P_C2", name="Cty B", tax_code="0302222222", address="HN")
        s = Subcontractor.objects.create(name="Cty B Vận tải", tax_code="0302222222", partner_type=PartnerType.CARRIER)
        c.refresh_from_db(); s.refresh_from_db()
        self.assertEqual(c.partner_id, s.partner_id)
        p = Partner.objects.get(pk=c.partner_id)
        self.assertTrue(p.is_customer and p.is_carrier)
        self.assertEqual(Partner.objects.filter(tax_code="0302222222").count(), 1)

    def test_update_propagates_name(self):
        c = Customer.objects.create(code="P_C3", name="Tên cũ", address="DN")
        c.name = "Tên mới"
        c.save()
        c.refresh_from_db()
        self.assertEqual(c.partner.name, "Tên mới")
