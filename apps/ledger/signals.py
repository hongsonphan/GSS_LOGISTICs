"""Tự ghi sổ cái khi chứng từ nghiệp vụ thay đổi (chạy sau khi giao dịch commit, lỗi chỉ ghi log)."""
from functools import partial

from django.db import transaction
from django.db.models.signals import post_delete, post_save

from . import posting


def _schedule(source_type, sender, instance, **kwargs):
    transaction.on_commit(partial(posting.safe_post, source_type, instance.pk))


_HANDLERS = []


def connect():
    from apps.billing.models import CashTransaction, CustomerInvoice, TripExpense
    from apps.dispatch.models import DispatchTrip
    from apps.personnel.models import PayrollPeriod

    for model, source_type in ((CashTransaction, 'cash'), (CustomerInvoice, 'invoice'), (TripExpense, 'trip_expense'),
                               (DispatchTrip, 'trip'), (PayrollPeriod, 'payroll')):
        handler = partial(_schedule, source_type)
        _HANDLERS.append(handler)  # giữ tham chiếu để receiver không bị thu gom
        uid = f'ledger_{source_type}'
        post_save.connect(handler, sender=model, weak=False, dispatch_uid=uid + '_save')
        post_delete.connect(handler, sender=model, weak=False, dispatch_uid=uid + '_delete')
