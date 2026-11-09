"""Báo cáo mới "Bảng kê quyết toán & đối soát" (rpt_settlement_vouchers): cấp cho ai đang được xem báo cáo "Chuyến tồn quyết toán"."""
from django.db import migrations

SRC, NEW = 'rpt_settlement_backlog', 'rpt_settlement_vouchers'


def convert(grants):
    if not isinstance(grants, dict) or SRC not in grants or NEW in grants:
        return grants, False
    out = dict(grants)
    out[NEW] = sorted(set(grants[SRC]) & {'view', 'export'})
    return out, True


def forwards(apps, schema_editor):
    for model, fields in (('AccessGroup', ['grants']), ('RoleAccess', ['add']), ('UserAccessOverride', ['allow'])):
        Model = apps.get_model('core', model)
        for row in Model.objects.all():
            dirty = False
            for field in fields:
                new, changed = convert(getattr(row, field))
                if changed:
                    setattr(row, field, new)
                    dirty = True
            if dirty:
                row.save(update_fields=fields)


class Migration(migrations.Migration):
    dependencies = [('core', '0016_company_ledger_active_accounts')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
