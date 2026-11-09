"""Row-Level Security PostgreSQL – lớp cách ly đa doanh nghiệp thứ hai, dưới lớp lọc ORM (core.models.tenant_scope).

Cách hoạt động:
- Mọi bảng có cột `company_id` (model kế thừa CompanyOwnedModel) bật RLS với policy `gss_tenant_isolation`:
  chỉ thấy / ghi được dòng của công ty đang đặt trong biến phiên `app.company_id` (dòng chưa gán công ty vẫn thấy).
  Khi biến chưa đặt (lệnh quản trị, migration, trang công khai dùng token) thì không lọc.
- Superuser và chủ sở hữu bảng của Postgres bỏ qua RLS, nên trong request của người dùng đã đăng nhập, kết nối
  chuyển sang vai trò riêng `gss_rls` (không phải superuser, không BYPASSRLS) và đặt `app.company_id`
  (TenantMiddleware + execute wrapper bên dưới). Hết request thì trả về vai trò cũ.
- Policy, vai trò và quyền được (tạo lại) sau mỗi lần `migrate` (tín hiệu post_migrate), nên bảng mới tự được bảo vệ.

Tắt khẩn cấp: biến môi trường TENANT_RLS=false (policy vẫn còn nhưng không chuyển vai trò -> không có hiệu lực).
Bảng con không có cột company (vd. dòng của một phiếu) chưa được RLS bảo vệ: vẫn dựa vào lọc theo bản ghi cha.
"""
import contextvars
import logging

from django.conf import settings
from django.db import connections

logger = logging.getLogger(__name__)

POLICY = 'gss_tenant_isolation'
_busy = contextvars.ContextVar('gss_rls_busy', default=False)


def enabled():
    """RLS chỉ có hiệu lực khi bật cả lớp lọc đa doanh nghiệp (TENANT_ENFORCE) và TENANT_RLS."""
    return bool(getattr(settings, 'TENANT_RLS', True) and getattr(settings, 'TENANT_ENFORCE', False))


def role_name():
    return getattr(settings, 'DB_RLS_ROLE', 'gss_rls')


def tenant_tables():
    from django.apps import apps
    out = []
    for model in apps.get_models():
        opts = model._meta
        if opts.proxy or not opts.managed or opts.label == 'core.Company':
            continue
        field = next((f for f in opts.concrete_fields if f.name == 'company'), None)
        if field is not None and getattr(field, 'related_model', None) is not None and field.related_model._meta.label == 'core.Company':
            out.append(opts.db_table)
    return sorted(set(out))


def apply(using='default'):
    """Tạo vai trò, cấp quyền và bật policy cho mọi bảng thuộc công ty. Gọi lại nhiều lần không sao."""
    conn = connections[using]
    if conn.vendor != 'postgresql':
        return []
    role = role_name()
    q = conn.ops.quote_name
    tables = tenant_tables()
    with conn.cursor() as c:
        c.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", [role])
        if c.fetchone() is None:
            c.execute(f'CREATE ROLE {q(role)} NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT')
        c.execute(f'GRANT USAGE ON SCHEMA public TO {q(role)}')
        c.execute(f'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO {q(role)}')
        c.execute(f'GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO {q(role)}')
        c.execute("SELECT rolsuper FROM pg_roles WHERE rolname = current_user")
        if not c.fetchone()[0]:
            c.execute(f'GRANT {q(role)} TO current_user')
        cond = ("company_id IS NULL OR company_id = "
                "coalesce(nullif(current_setting('app.company_id', true), '')::bigint, company_id)")
        for table in tables:
            c.execute(f'ALTER TABLE {q(table)} ENABLE ROW LEVEL SECURITY')
            c.execute(f'DROP POLICY IF EXISTS {POLICY} ON {q(table)}')
            c.execute(f'CREATE POLICY {POLICY} ON {q(table)} USING ({cond}) WITH CHECK ({cond})')
    return tables


def on_post_migrate(sender, app_config=None, using='default', **kwargs):
    if app_config is None or app_config.label != 'core':
        return
    try:
        apply(using)
    except Exception:  # thiếu quyền tạo vai trò...: hệ thống vẫn chạy với lớp lọc ORM
        logger.exception('Không bật được Row-Level Security')


# ------------------------------------------------------------------ trong request

def _wrapper(execute, sql, params, many, context):
    if not _busy.get():
        token = _busy.set(True)
        try:
            from core.tenant import scoping_company
            conn = context['connection']
            company = scoping_company() if enabled() else None
            if company is not None:
                # Đặt lại trước MỖI câu lệnh (biến phiên bị huỷ cùng giao dịch khi rollback nên không ghi nhớ trạng thái).
                # Dùng con trỏ riêng: con trỏ của câu lệnh có thể là con trỏ có tên (.iterator()), chỉ chạy được một lệnh.
                with conn.connection.cursor() as raw:
                    raw.execute("SELECT set_config('role', %s, false), set_config('app.company_id', %s, false)",
                                [role_name(), str(company.pk)])
                conn._gss_rls_active = True
            elif getattr(conn, '_gss_rls_active', False):
                reset(conn)
        finally:
            _busy.reset(token)
    return execute(sql, params, many, context)


def reset(conn):
    if getattr(conn, '_gss_rls_active', False) and conn.connection is not None:
        try:
            with conn.connection.cursor() as raw:
                raw.execute("RESET ROLE")
                raw.execute("SELECT set_config('app.company_id', '', false)")
        except Exception:  # giao dịch đã hỏng: kết nối sẽ bị đóng/rollback, vai trò SET trong giao dịch tự huỷ
            logger.debug('Không trả lại vai trò sau request', exc_info=True)
    conn._gss_rls_active = False


class RlsScope:
    """Ngữ cảnh cho một request: gắn execute wrapper vào kết nối mặc định, hết request thì trả lại vai trò."""

    def __init__(self, using='default'):
        self.conn = connections[using]
        self.cm = None

    def __enter__(self):
        if self.conn.vendor == 'postgresql':
            reset(self.conn)
            self.cm = self.conn.execute_wrapper(_wrapper)
            self.cm.__enter__()
        return self

    def __exit__(self, *exc):
        if self.cm is not None:
            self.cm.__exit__(*exc)
            reset(self.conn)
        return False
