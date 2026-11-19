"""Nhật ký bất biến ở tầng CSDL (core/immutability.py) và thu hồi TRUNCATE khỏi vai trò ứng dụng (core/rls.py)."""
from django.db import connection, transaction
from django.db.utils import DatabaseError
from django.test import TestCase

from core import immutability, rls
from core.models import AuditLog, Company, get_default_company


class AppendOnlyLogTests(TestCase):
    def setUp(self):
        self.log = AuditLog.objects.create(action='create', model_label='x.Y', object_id='1', object_repr='r',
                                           actor_label='u', company=get_default_company())

    def _sql(self, sql, params=()):
        with connection.cursor() as c:
            c.execute(sql, params)

    def test_trigger_installed_on_every_append_only_table(self):
        with connection.cursor() as c:
            c.execute("SELECT c.relname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE t.tgname = %s",
                      [immutability.TRIGGER])
            have = {r[0] for r in c.fetchall()}
        self.assertEqual(set(immutability.APPEND_ONLY_TABLES) - have, set())

    def test_cannot_edit_content(self):
        with self.assertRaises(DatabaseError), transaction.atomic():
            self._sql("UPDATE core_auditlog SET object_repr = 'sua' WHERE id = %s", [self.log.pk])
        self.log.refresh_from_db()
        self.assertEqual(self.log.object_repr, 'r')

    def test_cannot_delete(self):
        with self.assertRaises(DatabaseError), transaction.atomic():
            self._sql("DELETE FROM core_auditlog WHERE id = %s", [self.log.pk])
        with self.assertRaises(DatabaseError), transaction.atomic():
            AuditLog.objects.filter(pk=self.log.pk).delete()
        self.assertTrue(AuditLog.objects.filter(pk=self.log.pk).exists())

    def test_set_null_on_company_delete_still_allowed(self):
        company = Company.objects.create(code='IMM_X', name='X')
        log = AuditLog.objects.create(action='update', model_label='x.Y', object_id='2', company=company)
        self._sql("UPDATE core_auditlog SET company_id = NULL WHERE id = %s", [log.pk])
        log.refresh_from_db()
        self.assertIsNone(log.company_id)

    def test_purge_needs_explicit_switch(self):
        self._sql("SELECT set_config('gss.allow_log_purge', 'on', true)")
        self._sql("DELETE FROM core_auditlog WHERE id = %s", [self.log.pk])
        self.assertFalse(AuditLog.objects.filter(pk=self.log.pk).exists())

    def test_app_role_has_no_truncate(self):
        with connection.cursor() as c:
            c.execute("SELECT has_table_privilege(%s, 'core_auditlog', 'TRUNCATE')", [rls.role_name()])
            self.assertFalse(c.fetchone()[0])
            c.execute("SELECT has_table_privilege(%s, 'core_auditlog', 'SELECT')", [rls.role_name()])
            self.assertTrue(c.fetchone()[0])
