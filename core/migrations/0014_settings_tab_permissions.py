"""Phân quyền trang Cài đặt theo từng tab (cfg_*): quyền sửa Danh mục đã lưu được chuyển sang 4 tab dữ liệu.

Chỉ áp dụng cho nhóm đã tuỳ chỉnh (trừ nhóm Kinh doanh). Chức danh và ngoại lệ từng người không tự chuyển:
ai cần vào Cài đặt thì cấp lại trong trang Phân quyền (quyền Cài đặt riêng lẻ trước đây đã bị bỏ).
"""
from django.db import migrations

CFG_DATA = ['cfg_finance', 'cfg_partners', 'cfg_network', 'cfg_fleet']
ACTIONS = ['view', 'create', 'edit', 'delete', 'export']


def convert(grants):
    if not isinstance(grants, dict) or any(k.startswith('cfg_') for k in grants):
        return grants, False
    md = set(grants.get('master_data') or [])
    writes = md & {'create', 'edit', 'delete', 'export'}
    if not writes and 'settings' not in grants:
        return grants, False
    out = {k: v for k, v in grants.items() if k != 'settings'}
    acts = [a for a in ACTIONS if a in writes] + (['view'] if writes else [])
    for key in CFG_DATA:
        out[key] = [a for a in ACTIONS if a in acts]
    out['cfg_company'] = ['view']
    out['master_data'] = ['view']
    return out, True


def forwards(apps, schema_editor):
    AccessGroup = apps.get_model('core', 'AccessGroup')
    for row in AccessGroup.objects.exclude(key='sales'):
        new, changed = convert(row.grants)
        if changed:
            row.grants = new
            row.save(update_fields=['grants'])


class Migration(migrations.Migration):
    dependencies = [('core', '0013_settings_permission')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
