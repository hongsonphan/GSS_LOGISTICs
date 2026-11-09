"""Row-Level Security PostgreSQL (core/rls.py): cách ly đa doanh nghiệp ở tầng CSDL, kể cả với SQL viết tay."""
from django.contrib.auth.models import User
from django.db import connection, transaction
from django.db.utils import DatabaseError
from django.http import JsonResponse
from django.test import RequestFactory, TestCase

from apps.customers.models import Customer
from apps.personnel.models import Employee, EmployeeRole
from core import rls
from core.models import Company, get_default_company
from core.tenant import TenantMiddleware


def _raw_count(code_prefix):
    with connection.cursor() as c:
        c.execute("SELECT count(*) FROM master_data_party WHERE code LIKE %s", [code_prefix + '%'])
        return c.fetchone()[0]


class RowLevelSecurityTests(TestCase):
    def setUp(self):
        self.a = get_default_company()
        self.b = Company.objects.create(code='RLS_B', name='Công ty B')
        Customer.objects.create(code='RLS_A1', name='Khách A', company=self.a)
        Customer.objects.create(code='RLS_B1', name='Khách B', company=self.b)
        self.user_b = User.objects.create_user('rls_b', password='Rls-Pass#2026')
        Employee.objects.create(user=self.user_b, code='RLSB', full_name='NV B', phone_number='0900000777',
                                role=EmployeeRole.DIRECTOR, company=self.b)

    def _run_as(self, user, view):
        request = RequestFactory().get('/rls-test/')
        request.user = user
        return TenantMiddleware(view)(request)

    def test_policy_on_every_company_table(self):
        tables = rls.tenant_tables()
        self.assertIn('master_data_party', tables)
        self.assertIn('dispatch_dispatchtrip', tables)
        with connection.cursor() as c:
            c.execute("SELECT tablename FROM pg_policies WHERE policyname = %s", [rls.POLICY])
            covered = {r[0] for r in c.fetchall()}
        self.assertEqual(set(tables) - covered, set())

    def test_raw_sql_in_request_sees_only_own_company(self):
        seen = {}

        def view(request):
            seen['a'] = _raw_count('RLS_A')
            seen['b'] = _raw_count('RLS_B')
            with connection.cursor() as c:
                c.execute("SELECT current_user, current_setting('app.company_id', true)")
                seen['role'], seen['company'] = c.fetchone()
            return JsonResponse({})

        self._run_as(self.user_b, view)
        self.assertEqual((seen['a'], seen['b']), (0, 1))
        self.assertEqual(seen['role'], rls.role_name())
        self.assertEqual(seen['company'], str(self.b.pk))
        # hết request: trả lại vai trò cũ, ngoài request thấy đủ
        self.assertEqual((_raw_count('RLS_A'), _raw_count('RLS_B')), (1, 1))
        with connection.cursor() as c:
            c.execute("SELECT current_user <> %s", [rls.role_name()])
            self.assertTrue(c.fetchone()[0])

    def test_cannot_write_into_other_company(self):
        def view(request):
            try:
                with transaction.atomic():
                    with connection.cursor() as c:
                        c.execute("UPDATE master_data_party SET name = 'hack' WHERE code = 'RLS_A1'")
                        return JsonResponse({'rows': c.rowcount})
            except DatabaseError as e:
                return JsonResponse({'error': str(e)})

        res = self._run_as(self.user_b, view)
        self.assertEqual(res.content, b'{"rows": 0}')  # dòng của công ty A không nhìn thấy -> không sửa được
        self.assertEqual(Customer.all_objects.get(code='RLS_A1').name, 'Khách A')

    def test_disabled_with_tenant_enforce_off(self):
        seen = {}

        def view(request):
            seen['a'] = _raw_count('RLS_A')
            return JsonResponse({})

        with self.settings(TENANT_ENFORCE=False):
            self._run_as(self.user_b, view)
        self.assertEqual(seen['a'], 1)
