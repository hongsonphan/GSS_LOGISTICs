"""Thêm quyền "Cài đặt" (vào trang Cài đặt & Danh mục) vào quyền đã lưu của những nhóm / chức danh / người
trước đây vào được trang này nhờ sửa Danh mục hoặc quản trị. Không tự cấp cho nhóm Kinh doanh, cho chức danh và cho từng
người (kể cả quyền tự chuyển đổi cũ): ai cần thì cấp lại trong trang Phân quyền."""
from django.db import migrations


def _has(grants, mod, acts):
    return isinstance(grants, dict) and bool(set(grants.get(mod) or []) & set(acts))


def _grant(grants):
    if not isinstance(grants, dict) or 'settings' in grants:
        return grants, False
    if _has(grants, 'master_data', ('create', 'edit')) or _has(grants, 'admin', ('view', 'edit')):
        return {**grants, 'settings': ['view']}, True
    return grants, False


def forwards(apps, schema_editor):
    for model, field in (('AccessGroup', 'grants'),):
        Model = apps.get_model('core', model)
        for row in Model.objects.all():
            if model == 'AccessGroup' and row.key == 'sales':
                continue
            new, changed = _grant(getattr(row, field))
            if changed:
                setattr(row, field, new)
                row.save(update_fields=[field])


class Migration(migrations.Migration):
    dependencies = [('core', '0012_report_permissions')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
