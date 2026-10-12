import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.customers.models import Quotation, BookingOrder

def main():
    print(f'Quotations total: {Quotation.objects.count()}')
    for q in Quotation.objects.all()[:10]:
        print(f'  Quotation: {q.quotation_code} | created_at: {q.created_at}')

    print(f'Bookings total: {BookingOrder.objects.count()}')
    for b in BookingOrder.objects.all()[:10]:
        print(f'  Booking: {b.booking_code} | loading_date: {b.loading_date} | created_at: {b.created_at}')

if __name__ == '__main__':
    main()
