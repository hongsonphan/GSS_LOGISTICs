import os
import sys
from pathlib import Path

sys.path.insert(0, '/app' if os.path.exists('/app') else str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from apps.dispatch.models import DispatchTrip
from apps.customers.models import BookingOrder, Quotation
from apps.billing.models import CashTransaction

def migrate_trip_codes():
    print("=== MIGRATING DISPATCH TRIPS ===")
    trips = list(DispatchTrip.all_objects.order_by('created_at', 'id'))
    counters = {}
    updated = 0
    for t in trips:
        d = t.loading_date or (t.created_at.date() if t.created_at else None)
        if not d:
            continue
        yymm = d.strftime('%y%m')
        prefix = f"DV.{yymm}."
        counters[prefix] = counters.get(prefix, 0) + 1
        new_code = f"{prefix}{counters[prefix]:03d}"
        if t.trip_code != new_code:
            old_code = t.trip_code
            # Check if new_code is taken by someone else
            existing = DispatchTrip.all_objects.filter(trip_code=new_code).exclude(id=t.id).first()
            if existing:
                temp_code = f"TMP.{new_code}.{existing.id}"
                existing.trip_code = temp_code
                existing.save(update_fields=['trip_code'])
            t.trip_code = new_code
            t.save(update_fields=['trip_code'])
            # Update ref_codes in CashTransaction
            CashTransaction.objects.filter(ref_code=old_code).update(ref_code=new_code)
            updated += 1
            print(f"  Trip {t.id}: {old_code} -> {new_code}")
    print(f"Done Trips: {updated} updated.")

def migrate_booking_codes():
    print("\n=== MIGRATING BOOKINGS ===")
    bookings = list(BookingOrder.all_objects.order_by('created_at', 'id'))
    counters = {}
    updated = 0
    for b in bookings:
        d = b.loading_date or (b.created_at.date() if b.created_at else None)
        if not d:
            continue
        yymm = d.strftime('%y%m')
        prefix = f"BK.{yymm}."
        counters[prefix] = counters.get(prefix, 0) + 1
        new_code = f"{prefix}{counters[prefix]:03d}"
        if b.booking_code != new_code:
            old_code = b.booking_code
            existing = BookingOrder.all_objects.filter(booking_code=new_code).exclude(id=b.id).first()
            if existing:
                temp_code = f"TMP.{new_code}.{existing.id}"
                existing.booking_code = temp_code
                existing.save(update_fields=['booking_code'])
            b.booking_code = new_code
            b.save(update_fields=['booking_code'])
            updated += 1
            print(f"  Booking {b.id}: {old_code} -> {new_code}")
    print(f"Done Bookings: {updated} updated.")

def migrate_quotation_codes():
    print("\n=== MIGRATING QUOTATIONS ===")
    quotes = list(Quotation.all_objects.order_by('created_at', 'id'))
    counters = {}
    updated = 0
    for q in quotes:
        d = q.created_at.date() if q.created_at else None
        if not d:
            continue
        yymm = d.strftime('%y%m')
        prefix = f"BG.{yymm}."
        counters[prefix] = counters.get(prefix, 0) + 1
        new_code = f"{prefix}{counters[prefix]:03d}"
        if q.quotation_code != new_code:
            old_code = q.quotation_code
            existing = Quotation.all_objects.filter(quotation_code=new_code).exclude(id=q.id).first()
            if existing:
                temp_code = f"TMP.{new_code}.{existing.id}"
                existing.quotation_code = temp_code
                existing.save(update_fields=['quotation_code'])
            q.quotation_code = new_code
            q.save(update_fields=['quotation_code'])
            updated += 1
            print(f"  Quotation {q.id}: {old_code} -> {new_code}")
    print(f"Done Quotations: {updated} updated.")

def migrate_cash_codes():
    print("\n=== MIGRATING CASH TRANSACTIONS ===")
    txs = list(CashTransaction.all_objects.order_by('transaction_date', 'created_at', 'id'))
    counters = {}
    updated = 0
    for c in txs:
        d = c.transaction_date or (c.created_at.date() if c.created_at else None)
        if not d:
            continue
        yymm = d.strftime('%y%m')
        prefix_type = "PT" if c.transaction_type == 'INFLOW' else "PC"
        prefix = f"{prefix_type}.{yymm}."
        counters[prefix] = counters.get(prefix, 0) + 1
        new_code = f"{prefix}{counters[prefix]:03d}"
        if c.code != new_code:
            old_code = c.code
            existing = CashTransaction.all_objects.filter(code=new_code).exclude(id=c.id).first()
            if existing:
                temp_code = f"TMP.{new_code}.{existing.id}"
                existing.code = temp_code
                existing.save(update_fields=['code'])
            c.code = new_code
            c.save(update_fields=['code'])
            updated += 1
            print(f"  Cash {c.id}: {old_code} -> {new_code}")
    print(f"Done Cash: {updated} updated.")

if __name__ == '__main__':
    migrate_trip_codes()
    migrate_booking_codes()
    migrate_quotation_codes()
    migrate_cash_codes()
    print("\n=== ALL TRANSACTIONS STANDARDIZED SUCCESSFULLY ===")
