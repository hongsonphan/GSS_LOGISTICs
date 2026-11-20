"""Thêm dòng phân quyền 'audit_log' (Nhật ký hoạt động) trong phần Cài đặt.

Quyền đã lưu trong cơ sở dữ liệu ghi đè mặc định trong mã, nên phải bổ sung tay: nhóm Admin và Giám đốc đã lưu được thêm Xem + Xuất.
Không ai khác được cấp (trưởng bộ phận do Giám đốc / Admin cấp trong ma trận Phân quyền).
Chạy lại an toàn: khoá đã có thì bỏ qua. Không hoàn tác dữ liệu (reverse là noop)."""
from django.db import migrations

NEW = 'audit_log'
GROUPS = ('admin', 'director')


def grant(grants):
    """Thêm Xem + Xuất cho dòng mới nếu nhóm chưa có khoá; trả (dữ liệu mới, có đổi không). Không sửa dữ liệu truyền vào."""
    if not isinstance(grants, dict) or NEW in grants:
        return grants, False
    out = dict(grants)
    out[NEW] = ['view', 'export']
    return out, True


def forwards(apps, schema_editor):
    Group = apps.get_model('core', 'AccessGroup')
    for row in Group.objects.filter(key__in=GROUPS):
        new, changed = grant(row.grants)
        if changed:
            row.grants = new
            row.save(update_fields=['grants'])


class Migration(migrations.Migration):
    dependencies = [('core', '0003_cache_table')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
