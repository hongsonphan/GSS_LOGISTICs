from django.test import TestCase

from apps.customers.models import Customer
from apps.master_data.models import Party, PartnerType, ShippingLine, Subcontractor


class PartySingleTableTestCase(TestCase):
    def test_roles_share_one_table(self):
        c = Customer.objects.create(code="P_C1", name="Cty A", tax_code="0301111111", address="HCM")
        s = Subcontractor.objects.create(name="Nhà xe B", partner_type=PartnerType.CARRIER)
        sl = ShippingLine.objects.create(code="MSCX", name="MSC")
        self.assertEqual(set(Party.objects.values_list('pk', flat=True)), {c.pk, s.pk, sl.pk})
        self.assertTrue(Party.objects.get(pk=c.pk).is_customer)
        self.assertTrue(Party.objects.get(pk=s.pk).is_carrier)
        self.assertTrue(Party.objects.get(pk=sl.pk).is_shipping_line)
        self.assertEqual(list(Customer.objects.values_list('pk', flat=True)), [c.pk])
        self.assertEqual(list(Subcontractor.objects.values_list('pk', flat=True)), [s.pk])
        self.assertEqual(list(ShippingLine.objects.values_list('pk', flat=True)), [sl.pk])
        self.assertIsNotNone(c.public_id)

    def test_same_tax_code_has_one_ledger_party(self):
        c = Customer.objects.create(code="P_C2", name="Cty B", tax_code="0302222222", address="HN")
        s = Subcontractor.objects.create(name="Cty B Vận tải", tax_code="0302222222", partner_type=PartnerType.CARRIER)
        self.assertEqual(c.partner.pk, s.partner.pk)
        self.assertEqual(c.partner.pk, c.pk)

    def test_one_party_can_hold_two_roles(self):
        p = Party.objects.create(code="DUAL1", name="Cty kiêm hai vai trò", is_customer=True, is_carrier=True)
        self.assertTrue(Customer.objects.filter(pk=p.pk).exists())
        self.assertTrue(Subcontractor.objects.filter(pk=p.pk).exists())
        self.assertEqual(Party.objects.get(pk=p.pk).roles, ['customer', 'carrier'])

    def test_garage_is_supplier_not_carrier(self):
        g = Subcontractor.objects.create(name="Gara X", partner_type=PartnerType.GARAGE)
        self.assertTrue(g.code.startswith('GAR'))
        p = Party.objects.get(pk=g.pk)
        self.assertTrue(p.is_supplier and not p.is_carrier)
