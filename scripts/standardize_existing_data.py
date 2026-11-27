"""
Script rà soát và chuẩn hóa dữ liệu lịch sử theo quy chuẩn BIM LOGISTICS & GSS TMS.
Hỗ trợ cả chế độ --dry-run (chỉ kiểm tra và báo cáo) và --apply (thực thi ghi vào CSDL).
"""
import os
import sys
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Khởi tạo Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.db import transaction
from apps.master_data.models import Location, Party, Subcontractor, Supplier, ShippingLine
from apps.customers.models import Customer, BookingOrder
from apps.personnel.models import Employee
from apps.fleet.models import Vehicle, Trailer, normalize_license_plate
from apps.collaboration.models import OfficeTask
from apps.dispatch.models import DispatchTrip
from apps.billing.models import DriverTripAdvance, DispatcherAdvanceFund, SettlementVoucher, CashTransaction

DRY_RUN = '--apply' not in sys.argv

print(f"{'='*70}")
print(f"RÀ SOÁT & CHUẨN HÓA MÃ VÀ DỮ LIỆU LỊCH SỬ (GSS TMS)")
print(f"Chế độ: {'[DRY-RUN] (Chỉ kiểm tra, KHÔNG thay đổi DB)' if DRY_RUN else '[APPLY] (ĐANG GHI THAY ĐỔI VÀO DB)'}")
print(f"{'='*70}\n")

total_changes = 0

def clean_str(s):
    if not s:
        return ''
    return re.sub(r'\s+', ' ', str(s)).strip().upper()


def archive_deleted_codes(model_cls, label):
    """Giải phóng mã 001..00n từ các bản ghi đã xóa mềm để bản ghi đang dùng bắt đầu từ 001."""
    global total_changes
    for obj in model_cls.all_objects.filter(is_deleted=True).order_by('id'):
        if obj.code and not obj.code.startswith('DEL-'):
            new_code = f"DEL-{obj.id}-{obj.code}"[:50]
            print(f"  [{label} #{obj.id} (đã xóa)] Mã: '{obj.code}' ➔ '{new_code}'")
            total_changes += 1
            if not DRY_RUN:
                model_cls.all_objects.filter(pk=obj.pk).update(code=new_code)


def resequence_active(items, label, prefix, name_field='name', short_field=None):
    """Đánh số lại các bản ghi đang hoạt động từ 001 -> 00n, an toàn với UniqueConstraint."""
    global total_changes
    pending = []
    for seq, obj in enumerate(items, 1):
        exp_code = f"{prefix}{seq:03d}"
        exp_name = clean_str(getattr(obj, name_field))
        exp_short = clean_str(getattr(obj, short_field)) if short_field else None
        diffs = []
        if obj.code != exp_code:
            diffs.append(f"Mã: '{obj.code}' ➔ '{exp_code}'")
        if getattr(obj, name_field) != exp_name:
            diffs.append(f"Tên: '{getattr(obj, name_field)}' ➔ '{exp_name}'")
        if short_field and getattr(obj, short_field) != exp_short:
            diffs.append(f"Tên VT: '{getattr(obj, short_field)}' ➔ '{exp_short}'")
        if diffs:
            print(f"  [{label} #{obj.id}] " + " | ".join(diffs))
            total_changes += 1
            pending.append((obj, exp_code, exp_name, exp_short))
    if not DRY_RUN and pending:
        with transaction.atomic():
            for obj, _, _, _ in pending:
                obj.__class__.all_objects.filter(pk=obj.pk).update(code=f"TMP-{obj.pk}")
            for obj, exp_code, exp_name, exp_short in pending:
                obj.code = exp_code
                setattr(obj, name_field, exp_name)
                if short_field:
                    setattr(obj, short_field, exp_short)
                obj.save()

# ---------------------------------------------------------
# 1. KHÁCH HÀNG (CUSTOMER / PARTY is_customer=True)
# ---------------------------------------------------------
print(">>> 1. RÀ SOÁT KHÁCH HÀNG (CUSTOMER):")
# Kiểm tra trùng MST
tax_map = {}
for c in Customer.all_objects.filter(tax_code__isnull=False).exclude(tax_code=''):
    mst = c.tax_code.strip()
    tax_map.setdefault(mst, []).append(c)

for mst, dupes in tax_map.items():
    if len(dupes) > 1:
        print(f"  [CẢNH BÁO TRÙNG MST] MST {mst} xuất hiện trên {len(dupes)} khách hàng: {[c.id for c in dupes]}")

archive_deleted_codes(Customer, 'Customer')
resequence_active(Customer.objects.all().order_by('id'), 'Customer', 'CUS', name_field='name', short_field='short_name')

# ---------------------------------------------------------
# 2. MẠNG LƯỚI ĐỊA ĐIỂM (LOCATION)
# ---------------------------------------------------------
print("\n>>> 2. RÀ SOÁT MẠNG LƯỚI ĐỊA ĐIỂM (LOCATION):")
archive_deleted_codes(Location, 'Location')
for loc_type, prefix in Location.PREFIX_MAP.items():
    resequence_active(Location.objects.filter(location_type=loc_type).order_by('id'), f'Location-{loc_type}', prefix)

# ---------------------------------------------------------
# 3. ĐỐI TÁC, NHÀ XE & NHÀ CUNG CẤP (SUBCONTRACTOR & SUPPLIER)
# ---------------------------------------------------------
print("\n>>> 3. RÀ SOÁT ĐỐI TÁC, NHÀ XE & THẦU PHỤ (SUBCONTRACTOR):")
PARTNER_PREFIX_MAP = {
    'CARRIER': '3PL',
    'GARAGE': 'GAR',
    'SUPPLIER': 'SPL',
}
archive_deleted_codes(Subcontractor, 'Subcontractor')
for ptype, prefix in PARTNER_PREFIX_MAP.items():
    resequence_active(
        Subcontractor.objects.filter(partner_type=ptype).order_by('id'),
        f'Subcontractor-{ptype}', prefix, name_field='name', short_field='short_name'
    )

archive_deleted_codes(Supplier, 'Shipper')
resequence_active(Supplier.objects.all().order_by('id'), 'Shipper', 'SHP', name_field='name', short_field='short_name')

# ---------------------------------------------------------
# 4. NHÂN SỰ & TÀI XẾ (EMPLOYEE)
# ---------------------------------------------------------
print("\n>>> 4. RÀ SOÁT NHÂN SỰ & TÀI XẾ (EMPLOYEE):")
archive_deleted_codes(Employee, 'Employee')
resequence_active(Employee.objects.all().order_by('id'), 'Employee', 'EMP', name_field='full_name', short_field='nickname')

# ---------------------------------------------------------
# 5. XE ĐẦU KÉO & RƠ-MOÓC (VEHICLE & TRAILER) & CHUYẾN XE
# ---------------------------------------------------------
print("\n>>> 5. RÀ SOÁT BIỂN SỐ XE (VEHICLE, TRAILER & CHUYẾN XE):")
vehicles = Vehicle.all_objects.all().order_by('id')
for v in vehicles:
    expected_plate = normalize_license_plate(v.license_plate, is_trailer=False)
    if v.license_plate != expected_plate:
        print(f"  [Vehicle #{v.id}] Biển số: '{v.license_plate}' ➔ '{expected_plate}'")
        total_changes += 1
        if not DRY_RUN:
            v.license_plate = expected_plate
            v.save()

trailers = Trailer.all_objects.all().order_by('id')
for tr in trailers:
    expected_plate = normalize_license_plate(tr.license_plate, is_trailer=True)
    if tr.license_plate != expected_plate:
        print(f"  [Trailer #{tr.id}] Biển số: '{tr.license_plate}' ➔ '{expected_plate}'")
        total_changes += 1
        if not DRY_RUN:
            tr.license_plate = expected_plate
            tr.save()

# Rà soát mã chuyến xe DispatchTrip (đảm bảo tuân thủ chuẩn GSS: VC, không dùng DV)
trips_all = DispatchTrip.all_objects.all().order_by('id')
for t in trips_all:
    if t.trip_code and t.trip_code.startswith('DV.'):
        new_trip_code = 'VC.' + t.trip_code[3:]
        print(f"  [Trip #{t.id}] Mã chuyến: '{t.trip_code}' ➔ '{new_trip_code}' (chuẩn hóa DV sang VC theo rule GSS)")
        total_changes += 1
        if not DRY_RUN:
            t.trip_code = new_trip_code
            t.save(update_fields=['trip_code'])

# Rà soát biển số text trên chuyến xe DispatchTrip nếu có
trips = DispatchTrip.all_objects.filter(trailer_plate_text__gt='').order_by('id')
for tr_item in trips:
    norm_trailer = normalize_license_plate(tr_item.trailer_plate_text, is_trailer=True)
    if tr_item.trailer_plate_text != norm_trailer:
        print(f"  [Trip #{tr_item.id} - {tr_item.trip_code}] Rơ-moóc text: '{tr_item.trailer_plate_text}' ➔ '{norm_trailer}'")
        total_changes += 1
        if not DRY_RUN:
            tr_item.trailer_plate_text = norm_trailer
            tr_item.save(update_fields=['trailer_plate_text'])

# ---------------------------------------------------------
# 6. HÃNG TÀU (SHIPPING LINE)
# ---------------------------------------------------------
print("\n>>> 6. RÀ SOÁT HÃNG TÀU (SHIPPING LINE):")
shipping_lines = ShippingLine.all_objects.all().order_by('id')
for sl in shipping_lines:
    exp_name = clean_str(sl.name)
    exp_short = clean_str(sl.short_name)
    if sl.name != exp_name or sl.short_name != exp_short:
        print(f"  [ShippingLine #{sl.id}] Tên: '{sl.name}' ➔ '{exp_name}' | Tên VT: '{sl.short_name}' ➔ '{exp_short}'")
        total_changes += 1
        if not DRY_RUN:
            sl.name = exp_name
            sl.short_name = exp_short
            sl.save()

# ---------------------------------------------------------
# 7. PHIẾU GIAO VIỆC / TASK (OFFICETASK)
# ---------------------------------------------------------
print("\n>>> 7. RÀ SOÁT MÃ PHIẾU GIAO VIỆC / TASK:")
tasks = OfficeTask.all_objects.all().order_by('id')
for tk in tasks:
    # Nếu mã bắt đầu bằng TSK -> đổi sang TK
    if tk.code and tk.code.startswith('TSK'):
        new_code = 'TK' + tk.code[3:]
        print(f"  [Task #{tk.id}] Mã: '{tk.code}' ➔ '{new_code}'")
        total_changes += 1
        if not DRY_RUN:
            tk.code = new_code
            tk.save()

# ---------------------------------------------------------
# 8. CHỨNG TỪ TẠM ỨNG & QUYẾT TOÁN (NẾU CÓ DỮ LIỆU)
# ---------------------------------------------------------
print("\n>>> 8. RÀ SOÁT MÃ CHỨNG TỪ TẠM ỨNG & QUYẾT TOÁN:")
# DriverTripAdvance
for adv in DriverTripAdvance.all_objects.all().order_by('id'):
    code = getattr(adv, 'advance_code', None)
    if code and not code.startswith('TUTX'):
        print(f"  [TUTX #{adv.id}] Mã: '{code}' cần rà soát")

# DispatcherAdvanceFund
for fund in DispatcherAdvanceFund.all_objects.all().order_by('id'):
    code = getattr(fund, 'fund_code', None)
    if code and not code.startswith('TUNV'):
        print(f"  [TUNV #{fund.id}] Mã: '{code}' cần rà soát")

print(f"\n{'='*70}")
print(f"KẾT QUẢ RÀ SOÁT: Tổng cộng phát hiện {total_changes} trường dữ liệu cần chuẩn hóa.")
if DRY_RUN:
    print("Đây là chế độ xem trước (dry-run). Chạy với cờ --apply để ghi nhận thay đổi.")
else:
    print("ĐÃ THỰC THI GHI VÀO CƠ SỞ DỮ LIỆU THÀNH CÔNG.")
print(f"{'='*70}\n")
