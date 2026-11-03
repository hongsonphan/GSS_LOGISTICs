from django.db import migrations


def backfill(apps, schema_editor):
    """Phiếu đã quyết toán trước khi có bảng thanh toán: tạo một lần thanh toán đủ số tiền, gắn với phiếu thu/chi cũ (nếu có)."""
    Voucher = apps.get_model('billing', 'SettlementVoucher')
    Payment = apps.get_model('billing', 'SettlementVoucherPayment')
    Cash = apps.get_model('billing', 'CashTransaction')
    for v in Voucher.objects.filter(is_deleted=False, status='SETTLED'):
        if Payment.objects.filter(voucher=v).exists():
            continue
        paid_date = (v.settled_at or v.approved_at or v.created_at).date()
        pay = Payment.objects.create(
            voucher=v, kind='CASH' if v.cash_transaction_id else 'MANUAL', amount=v.amount,
            payment_method=(v.payment_method if v.cash_transaction_id else ''), paid_date=paid_date,
            note='Chuyển đổi từ phiếu quyết toán một bước', created_by_id=v.settled_by_id,
        )
        if v.cash_transaction_id:
            Cash.objects.filter(pk=v.cash_transaction_id).update(settlement_payment=pay)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [('billing', '0019_settlement_voucher_payments')]

    operations = [migrations.RunPython(backfill, noop)]
