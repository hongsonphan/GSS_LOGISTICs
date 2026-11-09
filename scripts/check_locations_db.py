import sys, os
sys.path.insert(0, os.path.abspath('.'))
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.dispatch.models import DispatchTrip
from apps.customers.models import BookingOrder

with open('temp_db_check.txt', 'w', encoding='utf-8') as out:
    out.write('=== 15 CHUYẾN XE GẦN NHẤT TRONG DB ===\n')
    for t in DispatchTrip.objects.filter(is_deleted=False).order_by('-id')[:15]:
        out.write(f'Mã: {t.trip_code} | ID: {t.id} | Loại: {t.shipment_type}\n')
        out.write(f'  pickup_location (Nơi lấy): {t.pickup_location}\n')
        out.write(f'  warehouse_location (Kho đóng/trả): {t.warehouse_location}\n')
        out.write(f'  dropoff_location (Nơi hạ): {t.dropoff_location}\n')
        out.write('-'*60 + '\n')

    out.write('\n=== 10 ĐƠN HÀNG BOOKING GẦN NHẤT TRONG DB ===\n')
    for b in BookingOrder.objects.filter(is_deleted=False).order_by('-id')[:10]:
        out.write(f'Booking: {b.booking_code} | Số BL: {b.booking_number} | Loại: {b.booking_type}\n')
        out.write(f'  pickup_location: {b.pickup_location}\n')
        out.write(f'  delivery_location: {b.delivery_location}\n')
        out.write(f'  dropoff_location: {b.dropoff_location}\n')
        out.write('-'*60 + '\n')

print("Wrote temp_db_check.txt")
