"""Tách quyền báo cáo: từ 2 phân hệ chung (Báo cáo vận hành / tài chính) thành từng báo cáo (rpt_<tên>).

Quyền đã lưu được đổi sang khoá mới sao cho người dùng thấy đúng các báo cáo như trước:
- reports_fin / reports_ops -> các báo cáo cùng nhóm;
- Kinh doanh (xem) -> Báo giá, Booking, Chuyến đang chạy; Tạm ứng (xem) -> Tạm ứng & chi phí tài xế
  (trước đây các báo cáo này được mở theo phân hệ khác).
Bản ghi đã có khoá rpt_* thì giữ nguyên.
"""
from django.db import migrations

FIN = ['pnl', 'customer_rev', 'subcontractor', 'driver_salary', 'dispatcher_funds', 'settlement_backlog',
       'ar_aging', 'unsettled_aging', 'driver_advances']
OPS = ['dem_det', 'otp', 'route_cost', 'layover', 'incidents', 'wip_trips']
LEGACY = {'reports_fin': FIN, 'reports_ops': OPS}
SALES_VIEW = ['crm_quotations', 'active_bookings', 'wip_trips']
ACTIONS = ['view', 'export']


def convert(grants, positive):
    if not isinstance(grants, dict):
        return grants, False
    has_new = any(k.startswith('rpt_') for k in grants)
    out, changed = {}, False
    for mod, acts in grants.items():
        if mod in LEGACY:
            changed = True
            for r in LEGACY[mod]:
                key = f'rpt_{r}'
                out[key] = sorted(set(out.get(key, [])) | (set(acts) & set(ACTIONS)))
        else:
            out[mod] = acts
    if not has_new:
        extra = []
        if 'view' in (grants.get('sales') or []):
            extra += SALES_VIEW if positive else SALES_VIEW[:2]
        if positive and 'view' in (grants.get('advances') or []):
            extra.append('driver_advances')
        for r in extra:
            key = f'rpt_{r}'
            if 'view' not in out.get(key, []):
                out[key] = sorted(set(out.get(key, [])) | {'view'})
                changed = True
    return out, changed


def forwards(apps, schema_editor):
    for model, fields in (('AccessGroup', [('grants', True)]), ('RoleAccess', [('add', True), ('remove', False)]),
                          ('UserAccessOverride', [('allow', True), ('deny', False)])):
        Model = apps.get_model('core', model)
        for row in Model.objects.all():
            dirty = False
            for field, positive in fields:
                new, changed = convert(getattr(row, field), positive)
                if changed:
                    setattr(row, field, new)
                    dirty = True
            if dirty:
                row.save(update_fields=[f for f, _p in fields])


class Migration(migrations.Migration):
    dependencies = [('core', '0011_purge_test_personnel')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
