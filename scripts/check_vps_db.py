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

    # 1. Test ky 01/10/2026 - 12/10/2026
    req_oct = rf.get('/api/sales/?from_date=2026-10-01&to_date=2026-10-12')
    req_oct.user = user
    res_oct = SalesAPIView.as_view()(req_oct)
    quotes_oct = res_oct.data.get('quotations', [])
    bookings_oct = res_oct.data.get('bookings', [])

    print('=== KET QUA KHI CHON 01/10/2026 - 12/10/2026 ===')
    print(f'Quotations count: {len(quotes_oct)}')
    for q in quotes_oct:
        print(f"  Quotation: {q['code']} | Ngay tao: {q['created_at']}")
    print(f'Bookings count: {len(bookings_oct)}')
    for b in bookings_oct:
        print(f"  Booking: {b['booking_code']} | Ngay dong hang: {b['loading_date']}")

    # 2. Test ky 01/09/2026 - 30/09/2026
    req_sep = rf.get('/api/sales/?from_date=2026-09-01&to_date=2026-09-30')
    req_sep.user = user
    res_sep = SalesAPIView.as_view()(req_sep)
    quotes_sep = res_sep.data.get('quotations', [])
    bookings_sep = res_sep.data.get('bookings', [])

    print('\n=== KET QUA KHI CHON 01/09/2026 - 30/09/2026 ===')
    print(f'Quotations count: {len(quotes_sep)}')
    for q in quotes_sep:
        print(f"  Quotation: {q['code']} | Ngay tao: {q['created_at']}")
    print(f'Bookings count: {len(bookings_sep)}')
    for b in bookings_sep:
        print(f"  Booking: {b['booking_code']} | Ngay dong hang: {b['loading_date']}")

if __name__ == '__main__':
    main()
