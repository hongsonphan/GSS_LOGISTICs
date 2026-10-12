import os
import django
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.customers.models import Quotation, BookingOrder
from apps.dispatch.models import DispatchTrip
from apps.billing.models import TripExpense, CashTransaction, DriverTripAdvance
from apps.customs.models import CustomsDeclaration

def main():
    q_count = Quotation.objects.filter(quotation_code__startswith='BG-202609-').update(
        created_at=timezone.make_aware(datetime.datetime(2026, 9, 1, 8, 0, 0))
    )
    print(f'Aligned {q_count} September quotations.')

    b_count = 0
    for b in BookingOrder.objects.filter(booking_code__startswith='BK-2609-'):
        if b.loading_date:
            dt = timezone.make_aware(datetime.datetime(b.loading_date.year, b.loading_date.month, b.loading_date.day, 7, 30, 0))
            BookingOrder.objects.filter(id=b.id).update(created_at=dt)
            b_count += 1
    print(f'Aligned {b_count} September bookings.')

    t_count = 0
    for t in DispatchTrip.objects.filter(trip_code__startswith='TVL-2609-'):
        if t.loading_date:
            dt = timezone.make_aware(datetime.datetime(t.loading_date.year, t.loading_date.month, t.loading_date.day, 8, 0, 0))
            DispatchTrip.objects.filter(id=t.id).update(created_at=dt)
            t_count += 1
    print(f'Aligned {t_count} September trips.')

    exp_count = 0
    for exp in TripExpense.objects.filter(trip__trip_code__startswith='TVL-2609-'):
        if exp.trip and exp.trip.loading_date:
            dt = timezone.make_aware(datetime.datetime(exp.trip.loading_date.year, exp.trip.loading_date.month, exp.trip.loading_date.day, 10, 0, 0))
            TripExpense.objects.filter(id=exp.id).update(created_at=dt)
            exp_count += 1
    print(f'Aligned {exp_count} September expenses.')

    tx_count = 0
    for tx in CashTransaction.objects.filter(code__startswith='PT-2609-') | CashTransaction.objects.filter(code__startswith='PC-2609-'):
        if tx.transaction_date:
            dt = timezone.make_aware(datetime.datetime(tx.transaction_date.year, tx.transaction_date.month, tx.transaction_date.day, 11, 0, 0))
            CashTransaction.objects.filter(id=tx.id).update(created_at=dt)
            tx_count += 1
    print(f'Aligned {tx_count} September cash transactions.')

    adv_count = 0
    for adv in DriverTripAdvance.objects.filter(trip__trip_code__startswith='TVL-2609-'):
        if adv.trip and adv.trip.loading_date:
            dt = timezone.make_aware(datetime.datetime(adv.trip.loading_date.year, adv.trip.loading_date.month, adv.trip.loading_date.day, 8, 30, 0))
            DriverTripAdvance.objects.filter(id=adv.id).update(created_at=dt)
            adv_count += 1
    print(f'Aligned {adv_count} September driver advances.')

    decl_count = 0
    for d in CustomsDeclaration.objects.filter(declaration_number__startswith='105909'):
        if d.declaration_date:
            dt = timezone.make_aware(datetime.datetime(d.declaration_date.year, d.declaration_date.month, d.declaration_date.day, 9, 0, 0))
            CustomsDeclaration.objects.filter(id=d.id).update(created_at=dt)
            decl_count += 1
    print(f'Aligned {decl_count} September customs declarations.')

if __name__ == '__main__':
    main()
