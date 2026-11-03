import os, sys
sys.path.insert(0, '/app')
sys.path.insert(0, os.path.abspath('.'))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.dispatch.models import DispatchTrip
from apps.customers.models import BookingOrder

print("=== 15 CHUYEN XE LIVE TREN DATABASE VPS ===")
for t in DispatchTrip.objects.filter(is_deleted=False).order_by('-id')[:15]:
    print(f"Mã chuyến: {t.trip_code} | ID: {t.id} | Loại hàng: {t.shipment_type}")
    print(f"   [1] Nơi lấy (pickup_location):        '{t.pickup_location}'")
    print(f"   [2] Kho đóng/giao (warehouse_location): '{t.warehouse_location}'")
    print(f"   [3] Nơi hạ (dropoff_location):          '{t.dropoff_location}'")
    print(f"   FKs: pickup_loc={t.pickup_loc}, warehouse_loc={t.warehouse_loc}, dropoff_loc={t.dropoff_loc}")
    print("-" * 65)

print("\n=== 10 DON HANG BOOKING LIVE TREN DATABASE VPS ===")
for b in BookingOrder.objects.filter(is_deleted=False).order_by('-id')[:10]:
    print(f"Mã đơn: {b.booking_code} | Số BL: {b.booking_number} | Loại: {b.booking_type}")
    print(f"   [1] Lấy (pickup_location):     '{b.pickup_location}'")
    print(f"   [2] Kho (delivery_location):   '{b.delivery_location}'")
    print(f"   [3] Hạ (dropoff_location):     '{b.dropoff_location}'")
    print("-" * 65)
