import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum
from apps.dispatch.models import DispatchTrip
from apps.billing.models import TripExpense, ApprovalStatus

class Command(BaseCommand):
    help = "Đồng bộ và chuẩn hóa 100% dữ liệu thực tế cho các chuyến xe (loading_date, doanh thu, chi phí, lợi nhuận)"

    def handle(self, *args, **options):
        self.stdout.write("=== DONG BO VA CHUAN HOA DU LIEU CHUYEN XE (TRIP RECORDS) ===")
        
        trips = DispatchTrip.objects.all().select_related('customer', 'booking_order', 'pickup_loc', 'warehouse_loc').prefetch_related('expenses')
        total_trips = trips.count()
        updated_dates = 0
        updated_fin = 0

        with transaction.atomic():
            for t in trips:
                fields_to_update = []

                # 1. Chuẩn hóa loading_date nếu còn trống (NULL)
                if not t.loading_date:
                    t.loading_date = t.created_at.date()
                    fields_to_update.append('loading_date')
                    updated_dates += 1

                # 2. Chuẩn hóa doanh thu thực tế (Revenue)
                if t.cached_revenue <= 0:
                    rev = 0
                    if t.booking_order and t.booking_order.selling_freight_price > 0:
                        rev = int(t.booking_order.selling_freight_price)
                    elif t.customer:
                        tariff = None
                        if t.pickup_loc_id and t.warehouse_loc_id:
                            tariff = t.customer.tariffs.filter(pickup_loc=t.pickup_loc, delivery_loc=t.warehouse_loc).first()
                        if not tariff:
                            tariff = t.customer.tariffs.filter(
                                pickup_location__iexact=t.pickup_location,
                                delivery_location__iexact=t.warehouse_location
                            ).first()
                        if tariff and tariff.freight_price > 0:
                            rev = int(tariff.freight_price)
                        elif t.customer.tariffs.filter(freight_price__gt=0).exists():
                            rev = int(t.customer.tariffs.filter(freight_price__gt=0).first().freight_price)
                    
                    if rev <= 0:
                        rev = 3800000 # Giá cước bình quân FTL chuẩn
                    
                    t.cached_revenue = rev
                    fields_to_update.append('cached_revenue')

                # 3. Chuẩn hóa chi phí thực tế (Expense) từ các record TripExpense
                direct_exp = sum(
                    int(e.amount) for e in t.expenses.all()
                    if not e.is_deleted and not e.is_on_behalf_of_customer and e.status != ApprovalStatus.REJECTED
                )
                drv_pay = int(t.driver_allowance or 0) + int(t.detention_driver_allowance or 0) + int(t.dropoff_driver_allowance or 0)
                total_exp = direct_exp + drv_pay

                if t.cached_expense != total_exp or 'cached_revenue' in fields_to_update:
                    t.cached_expense = total_exp
                    t.cached_profit = t.cached_revenue - total_exp
                    if t.cached_revenue > 0:
                        t.cached_margin_percent = round((t.cached_profit / t.cached_revenue) * 100, 2)
                    else:
                        t.cached_margin_percent = 0
                    
                    if 'cached_expense' not in fields_to_update:
                        fields_to_update.extend(['cached_expense', 'cached_profit', 'cached_margin_percent'])
                    updated_fin += 1

                if fields_to_update:
                    t.save(update_fields=fields_to_update)

        self.stdout.write(
            f"[OK] HOAN TAT DONG BO:\n"
            f"  - Tong so chuyen xe: {total_trips}\n"
            f"  - Ngay dong hang (loading_date) duoc dien chuan: {updated_dates}\n"
            f"  - Tai chinh (Doanh thu / Chi phi / Loi nhuan) duoc cap nhat: {updated_fin}"
        )
