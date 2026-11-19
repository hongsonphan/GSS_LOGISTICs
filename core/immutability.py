"""Nhật ký bất biến ở tầng CSDL (bất biến số 1): chặn UPDATE/DELETE trên bảng chỉ-ghi-thêm bằng trigger PostgreSQL.

Trigger áp cho MỌI vai trò (kể cả chủ bảng/superuser), nên SQL viết tay hay lỗi mã cũng không sửa/xoá được nhật ký.
Ngoại lệ có chủ đích:
- UPDATE chỉ được đổi `actor_id`/`company_id` về NULL (khoá ngoại SET_NULL khi xoá tài khoản/công ty); mọi cột khác phải giữ nguyên.
- DELETE chỉ được phép khi giao dịch đặt `SET LOCAL gss.allow_log_purge = 'on'` (dọn nhật ký quá hạn lưu trữ, có người chủ đích ra lệnh).
TRUNCATE không bị chặn bởi trigger dòng: quyền TRUNCATE đã được thu hồi khỏi vai trò ứng dụng (core/rls.py); chỉ superuser mới làm được.
Tự (tạo lại) sau mỗi `migrate` (post_migrate), nên bảng mới trong APPEND_ONLY_TABLES tự được bảo vệ.
"""
import logging

from django.db import connections

logger = logging.getLogger(__name__)

# bảng -> các cột được phép đổi về NULL
APPEND_ONLY_TABLES = {
    'core_auditlog': ('actor_id', 'company_id'),
    'core_trackingeventlog': ('actor_id',),
}
FUNCTION = 'gss_block_log_mutation'
TRIGGER = 'gss_append_only'


def _function_sql():
    return f"""
CREATE OR REPLACE FUNCTION {FUNCTION}() RETURNS trigger AS $fn$
DECLARE
    nullable text[] := string_to_array(TG_ARGV[0], ',');
    o jsonb;
    n jsonb;
    col text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF coalesce(current_setting('gss.allow_log_purge', true), '') = 'on' THEN
            RETURN OLD;
        END IF;
        RAISE EXCEPTION 'Bảng % là nhật ký bất biến: không được xoá dòng', TG_TABLE_NAME USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    o := to_jsonb(OLD);
    n := to_jsonb(NEW);
    FOREACH col IN ARRAY nullable LOOP
        IF col <> '' THEN
            o := o - col;
            n := n - col;
        END IF;
    END LOOP;
    IF o IS DISTINCT FROM n THEN
        RAISE EXCEPTION 'Bảng % là nhật ký bất biến: không được sửa dòng', TG_TABLE_NAME USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NEW;
END
$fn$ LANGUAGE plpgsql;
"""


def apply(using='default'):
    """Tạo hàm + trigger chặn sửa/xoá. Gọi lại nhiều lần không sao. Trả về danh sách bảng đã bảo vệ."""
    conn = connections[using]
    if conn.vendor != 'postgresql':
        return []
    done = []
    with conn.cursor() as c:
        c.execute(_function_sql())
        for table, nullable in APPEND_ONLY_TABLES.items():
            c.execute("SELECT to_regclass(%s)", [f'public.{table}'])
            if c.fetchone()[0] is None:
                continue
            c.execute(f'DROP TRIGGER IF EXISTS {TRIGGER} ON {table}')
            c.execute(f"CREATE TRIGGER {TRIGGER} BEFORE UPDATE OR DELETE ON {table} "
                      f"FOR EACH ROW EXECUTE FUNCTION {FUNCTION}(%s)", [','.join(nullable)])
            done.append(table)
    return done


def on_post_migrate(sender, app_config=None, using='default', **kwargs):
    if app_config is None or app_config.label != 'core':
        return
    try:
        apply(using)
    except Exception:
        logger.exception('Không bật được trigger nhật ký bất biến')
