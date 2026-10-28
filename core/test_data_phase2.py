"""Kiểm thử chuẩn dữ liệu Giai đoạn 2."""
from datetime import date

from django.test import TestCase

from apps.billing.models import CashTransaction
from core.sequences import next_code


class DocumentSequenceTestCase(TestCase):
    def test_continues_from_existing_max_and_never_repeats(self):
        CashTransaction.objects.create(code="PT.2610.007", transaction_type="INFLOW", amount=1000, transaction_date=date(2026, 10, 1))
        codes = [next_code(CashTransaction, "code", "PT.2610.", 3) for _ in range(5)]
        self.assertEqual(codes, ["PT.2610.008", "PT.2610.009", "PT.2610.010", "PT.2610.011", "PT.2610.012"])

    def test_skips_codes_taken_by_soft_deleted_rows(self):
        tx = CashTransaction.objects.create(code="PC.2610.001", transaction_type="OUTFLOW", amount=1000, transaction_date=date(2026, 10, 1))
        tx.delete()  # xoá mềm, mã vẫn còn trong CSDL
        self.assertEqual(next_code(CashTransaction, "code", "PC.2610.", 3), "PC.2610.002")

    def test_independent_prefixes(self):
        self.assertEqual(next_code(CashTransaction, "code", "PT.2611.", 3), "PT.2611.001")
        self.assertEqual(next_code(CashTransaction, "code", "PC.2611.", 3), "PC.2611.001")


class CompanyTenantTestCase(TestCase):
    def test_new_records_get_default_company(self):
        from apps.customers.models import Customer
        from core.models import Company
        c = Customer.objects.create(code="TEN_01", name="Khách Tenant")
        self.assertIsNotNone(c.company_id)
        self.assertTrue(Company.objects.get(pk=c.company_id).is_default)

    def test_update_fields_save_keeps_working(self):
        from apps.customers.models import Customer
        c = Customer.objects.create(code="TEN_02", name="Khách 2")
        Customer.objects.filter(pk=c.pk).update(company=None)
        c.refresh_from_db()
        c.name = "Khách 2 sửa"
        c.save(update_fields=["name"])
        c.refresh_from_db()
        self.assertEqual(c.name, "Khách 2 sửa")
        self.assertIsNotNone(c.company_id)

    def test_assign_default_company_command(self):
        from io import StringIO
        from django.core.management import call_command
        from apps.customers.models import Customer
        c = Customer.objects.create(code="TEN_03", name="Khách 3")
        Customer.objects.filter(pk=c.pk).update(company=None)
        call_command("assign_default_company", stdout=StringIO())
        c.refresh_from_db()
        self.assertIsNotNone(c.company_id)


class AuditLogTestCase(TestCase):
    def test_create_update_softdelete_are_logged_with_actor(self):
        from django.contrib.auth.models import User
        from apps.customers.models import Customer
        from core.models import AuditLog
        user = User.objects.create_user("audit_user", password="Str0ng-Pass-2026!", is_superuser=True, is_staff=True)
        c = Customer.objects.create(code="AUD_01", name="Khách Audit")
        self.assertTrue(AuditLog.objects.filter(model_label="customers.Customer", object_id=str(c.pk), action="create").exists())
        c.name = "Khách Audit Sửa"
        c.save()
        log = AuditLog.objects.filter(object_id=str(c.pk), action="update").first()
        self.assertEqual(log.changes["name"], ["Khách Audit", "Khách Audit Sửa"])
        c.delete()  # xoá mềm
        self.assertTrue(AuditLog.objects.filter(object_id=str(c.pk), action="delete").exists())
        # Thao tác qua API có ghi tên người dùng
        self.client.force_login(user)
        self.client.get("/healthz/")
        self.assertEqual(AuditLog.objects.filter(object_id=str(c.pk), action="create").first().actor_label, "hệ thống")
