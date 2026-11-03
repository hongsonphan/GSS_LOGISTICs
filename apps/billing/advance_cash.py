"""Phiếu chi thật khi cấp tạm ứng (quỹ điều vận / công ty chi trực tiếp cho tài xế), để TK 141 phản ánh đúng tiền đã ra khỏi quỹ.

Mỗi phiếu tạm ứng sinh đúng một phiếu chi trong Sổ quỹ, nhận diện bằng ghi chú bắt đầu bằng mã phiếu tạm ứng
(không cần thêm cột); sửa số tiền thì cập nhật phiếu chi, xóa/từ chối phiếu tạm ứng thì hủy phiếu chi.
"""
from core.sequences import next_code
from apps.billing.models import CashFlowCategory, CashTransaction, PaymentMethod, TransactionType


def _marker(code):
    return f'Tạm ứng {code}'


def _find(category, code):
    return CashTransaction.objects.filter(
        is_deleted=False, category=category, notes__startswith=_marker(code)).first()


def _name(emp):
    return (emp.full_name if emp else '') or ''


def post_fund_cash(fund, emp):
    """Chi quỹ điều vận khi quỹ được duyệt (công ty chi tiền cho điều phối viên)."""
    if _find(CashFlowCategory.DISPATCHER_FUND_ADVANCE, fund.code):
        return None
    return CashTransaction.objects.create(
        code=next_code(CashTransaction, 'code', f"PC.{fund.advance_date.strftime('%y%m')}.", 3),
        transaction_type=TransactionType.OUTFLOW, payment_method=PaymentMethod.BANK,
        category=CashFlowCategory.DISPATCHER_FUND_ADVANCE, amount=fund.amount, transaction_date=fund.advance_date,
        partner_type='DISPATCHER', partner_name=_name(fund.dispatcher), ref_code=fund.code, created_by=emp,
        notes=f'{_marker(fund.code)} quỹ điều vận: {fund.purpose}'[:500])


def post_fund_return(fund, amount, emp, today):
    """Quyết toán quỹ: phần quỹ chưa cấp cho chuyến nào được điều phối viên nộp lại công ty."""
    if amount <= 0:
        return None
    return CashTransaction.objects.create(
        code=next_code(CashTransaction, 'code', f"PT.{today.strftime('%y%m')}.", 3),
        transaction_type=TransactionType.INFLOW, payment_method=PaymentMethod.BANK,
        category=CashFlowCategory.ADVANCE_REFUND, amount=amount, transaction_date=today,
        partner_type='DISPATCHER', partner_name=_name(fund.dispatcher), ref_code=fund.code, created_by=emp,
        notes=f'Hoàn quỹ {fund.code}: quỹ chưa cấp cho chuyến nộp lại công ty')


def post_driver_cash(advance, emp):
    """Chi tạm ứng chuyến khi công ty chi trực tiếp cho tài xế (nguồn quỹ điều vận không sinh thêm tiền ra)."""
    if advance.advance_source != 'COMPANY_DIRECT' or _find(CashFlowCategory.DRIVER_TRIP_ADVANCE, advance.code):
        return None
    return CashTransaction.objects.create(
        code=next_code(CashTransaction, 'code', f"PC.{advance.advance_date.strftime('%y%m')}.", 3),
        transaction_type=TransactionType.OUTFLOW, payment_method=PaymentMethod.BANK,
        category=CashFlowCategory.DRIVER_TRIP_ADVANCE, amount=advance.amount, transaction_date=advance.advance_date,
        partner_type='DRIVER', partner_name=_name(advance.driver), ref_code=advance.trip.trip_code, created_by=emp,
        notes=f'{_marker(advance.code)} chuyến {advance.trip.trip_code}: {advance.purpose}'[:500])


def sync_cash(category, code, amount, date=None):
    """Số tiền / ngày của phiếu tạm ứng đổi thì phiếu chi đi theo."""
    tx = _find(category, code)
    if tx and (int(tx.amount) != int(amount) or (date and tx.transaction_date != date)):
        tx.amount = amount
        if date:
            tx.transaction_date = date
        tx.save()


def cancel_cash(category, code):
    tx = _find(category, code)
    if tx:
        tx.delete()
    return tx
