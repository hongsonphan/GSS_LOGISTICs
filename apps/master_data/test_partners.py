from django.test import TestCase

from apps.customers.models import Customer
from apps.master_data.models import Party, PartnerType, ShippingLine, Subcontractor, Supplier


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

    def test_shipper_uses_shp_and_excluded_from_subcontractors(self):
        shp = Supplier.objects.create(name="Shipper Z")
        self.assertTrue(shp.code.startswith('SHP'))
        p = Party.objects.get(pk=shp.pk)
        self.assertTrue(p.is_shipper and not p.is_supplier and not p.is_carrier)
        self.assertFalse(Subcontractor.objects.filter(pk=shp.pk).exists())
        car = Subcontractor.objects.create(name="Nhà xe C", partner_type=PartnerType.CARRIER)
        self.assertFalse(Supplier.objects.filter(pk=car.pk).exists())

    def test_delete_unused_customer_hard_deletes_and_reuses_code(self):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient
        from apps.customers.models import BookingOrder
        u = get_user_model().objects.create_superuser('admin_test_del', 'a@b.c', 'password123')
        api = APIClient()
        api.force_authenticate(user=u)
        c1 = Customer.objects.create(name="Khách 1")
        c2 = Customer.objects.create(name="Khách 2")
        self.assertEqual((c1.code, c2.code), ('CUS001', 'CUS002'))
        # Chưa phát sinh chứng từ -> xóa hẳn và cấp lại CUS002
        r = api.delete(f'/api/master-data/customers/{c2.pk}/')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Customer.all_objects.filter(pk=c2.pk).exists())
        c2_new = Customer.objects.create(name="Khách 2 mới")
        self.assertEqual(c2_new.code, 'CUS002')
        # Đã phát sinh Booking -> chặn xóa hẳn
        BookingOrder.objects.create(customer=c1, booking_code='BK.TEST.001')
        r_blocked = api.delete(f'/api/master-data/customers/{c1.pk}/')
        self.assertEqual(r_blocked.status_code, 400)
        self.assertTrue(Customer.objects.filter(pk=c1.pk).exists())
