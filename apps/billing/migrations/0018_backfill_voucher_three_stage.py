from django.db import migrations
from django.db.models import F


def backfill(apps, schema_editor):
    """Đưa phiếu và chuyến hiện có về mô hình 3 bước.

    Phiếu nháp  -> Đối soát (chuyến: RECONCILING).
    Phiếu đã duyệt theo cách cũ: nếu đã phát sinh phiếu thu/chi -> Đã quyết toán, nếu chưa -> Đã duyệt (lên công nợ).
    """
    Voucher = apps.get_model('billing', 'SettlementVoucher')
    Trip = apps.get_model('dispatch', 'DispatchTrip')
    field_of = {'CUSTOMER': 'customer_settlement_status', 'DRIVER': 'driver_settlement_status', 'PARTNER': 'subcontractor_settlement_status'}

    for v in Voucher.objects.filter(is_deleted=False):
        trip_ids = list(v.trips.values_list('id', flat=True))
        field = field_of.get(v.party_type)
        if not field or not trip_ids:
            continue
        if v.status == 'DRAFT':
            stage = 'RECONCILING'
        else:
            settled = v.cash_transaction_id is not None
            stage = 'SETTLED' if settled else 'APPROVED'
            v.counterparty_confirmed = True
            v.counterparty_confirmed_at = v.approved_at
            v.counterparty_confirm_note = 'Chuyển đổi từ phiếu đã duyệt trước khi có bước xác nhận'
            if settled:
                v.status = 'SETTLED'
                v.settled_at = v.approved_at
                v.settled_by_id = v.approved_by_id
            v.save(update_fields=['counterparty_confirmed', 'counterparty_confirmed_at', 'counterparty_confirm_note',
                                  'status', 'settled_at', 'settled_by'])
        Trip.objects.filter(id__in=trip_ids).update(**{field: stage})


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0017_settlement_voucher_three_stage'),
        ('dispatch', '0023_settlement_three_stage_status'),
    ]

    operations = [migrations.RunPython(backfill, noop)]
