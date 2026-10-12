import os
import sys
import django

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from apps.dispatch.api_views import SalesAPIView

def main():
    User = get_user_model()
    user = User.objects.filter(is_superuser=True).first()
    rf = RequestFactory()
    req = rf.get('/api/sales/?from_date=2026-10-01&to_date=2026-10-12')
    req.user = user

    res = SalesAPIView.as_view()(req)
    quotes = res.data.get('quotations', [])
    bookings = res.data.get('bookings', [])

    print('=== VERIFICATION KHI CHON 01/10/2026 - 12/10/2026 ===')
    print(f'Quotations count: {len(quotes)}')
    for q in quotes:
        print(f"  Quotation: {q['code']} | Ngay: {q['created_at']} | Trang thai: {q['status_raw']}")

    print(f'Bookings count: {len(bookings)}')
    for b in bookings:
        print(f"  Booking: {b['booking_code']} | Ngay dong hang: {b['loading_date']} | Trang thai: {b['status']}")

    sep_quotes = [q for q in quotes if '2609' in q['code'] or '09/' in q['created_at']]
    sep_bookings = [b for b in bookings if '2609' in b['booking_code'] or '09/' in b['loading_date']]
    print(f'September quotes leaking: {len(sep_quotes)}')
    print(f'September bookings leaking: {len(sep_bookings)}')

if __name__ == '__main__':
    main()
