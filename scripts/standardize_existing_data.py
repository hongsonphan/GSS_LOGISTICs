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

customers = Customer.all_objects.all().order_by('id')
cus_seq = 1
for c in customers:
    expected_code = f"CUS{cus_seq:03d}"
    expected_name = clean_str(c.name)
    expected_short = clean_str(c.short_name)
    
    code_diff = (c.code != expected_code)
    name_diff = (c.name != expected_name)
    short_diff = (c.short_name != expected_short)
    
    if code_diff or name_diff or short_diff:
        print(f"  [Customer #{c.id}]")
        if code_diff:
            print(f"    - Mã: '{c.code}' ➔ '{expected_code}'")
        if name_diff:
            print(f"    - Tên: '{c.name}' ➔ '{expected_name}'")
        if short_diff:
            print(f"    - Tên VT: '{c.short_name}' ➔ '{expected_short}'")
        total_changes += 1
        if not DRY_RUN:
            c.code = expected_code
            c.name = expected_name
            c.short_name = expected_short
            c.save()
    cus_seq += 1

# ---------------------------------------------------------
# 2. MẠNG LƯỚI ĐỊA ĐIỂM (LOCATION)
# ---------------------------------------------------------
print("\n>>> 2. RÀ SOÁT MẠNG LƯỚI ĐỊA ĐIỂM (LOCATION):")
# Chuẩn hóa theo từng loại địa điểm
for loc_type, prefix in Location.PREFIX_MAP.items():
    locs = Location.all_objects.filter(location_type=loc_type).order_by('id')
    seq = 1
    for loc in locs:
        expected_code = f"{prefix}{seq:03d}"
        expected_name = clean_str(loc.name)
        
        code_diff = (loc.code != expected_code)
        name_diff = (loc.name != expected_name)
        
        if code_diff or name_diff:
            print(f"  [Location #{loc.id} - {loc_type}]")
            if code_diff:
                print(f"    - Mã: '{loc.code}' ➔ '{expected_code}'")
            if name_diff:
                print(f"    - Tên: '{loc.name}' ➔ '{expected_name}'")
            total_changes += 1
            if not DRY_RUN:
                loc.code = expected_code
                loc.name = expected_name
                loc.save()
        seq += 1

# ---------------------------------------------------------
# 3. ĐỐI TÁC, NHÀ XE & NHÀ CUNG CẤP (SUBCONTRACTOR & SUPPLIER)
# ---------------------------------------------------------
print("\n>>> 3. RÀ SOÁT ĐỐI TÁC, NHÀ XE & THẦU PHỤ (SUBCONTRACTOR):")
PARTNER_PREFIX_MAP = {
    'CARRIER': '3PL',
    'GARAGE': 'GAR',
    'SUPPLIER': 'SPL',
}
# Group by partner_type
for ptype, prefix in PARTNER_PREFIX_MAP.items():
    scs = Subcontractor.all_objects.filter(partner_type=ptype).order_by('id')
    seq = 1
    for sc in scs:
        expected_code = f"{prefix}{seq:03d}"
        expected_name = clean_str(sc.name)
        expected_short = clean_str(sc.short_name)
        
        code_diff = (sc.code != expected_code)
        name_diff = (sc.name != expected_name)
        short_diff = (sc.short_name != expected_short)
        
        if code_diff or name_diff or short_diff:
            print(f"  [Subcontractor #{sc.id} - {ptype}]")
            if code_diff:
                print(f"    - Mã: '{sc.code}' ➔ '{expected_code}'")
            if name_diff:
                print(f"    - Tên: '{sc.name}' ➔ '{expected_name}'")
            if short_diff:
                print(f"    - Tên VT: '{sc.short_name}' ➔ '{expected_short}'")
            total_changes += 1
            if not DRY_RUN:
                sc.code = expected_code
                sc.name = expected_name
                sc.short_name = expected_short
                sc.save()
        seq += 1

# Rà soát Supplier riêng nếu có
suppliers = Supplier.all_objects.all().order_by('id')
spl_seq = 1
for spl in suppliers:
    expected_code = f"SPL{spl_seq:03d}"
    expected_name = clean_str(spl.name)
    if spl.code != expected_code or spl.name != expected_name:
        print(f"  [Supplier #{spl.id}] Mã: '{spl.code}' ➔ '{expected_code}' | Tên: '{spl.name}' ➔ '{expected_name}'")
        total_changes += 1
        if not DRY_RUN:
            spl.code = expected_code
            spl.name = expected_name
            spl.save()
        spl_seq += 1

# ---------------------------------------------------------
# 4. NHÂN SỰ & TÀI XẾ (EMPLOYEE)
# ---------------------------------------------------------
print("\n>>> 4. RÀ SOÁT NHÂN SỰ & TÀI XẾ (EMPLOYEE):")
employees = Employee.all_objects.all().order_by('id')
emp_seq = 1
for emp in employees:
    expected_code = f"EMP{emp_seq:03d}"
    expected_name = clean_str(emp.full_name)
    expected_nick = clean_str(emp.nickname)
    
    code_diff = (emp.code != expected_code)
    name_diff = (emp.full_name != expected_name)
    nick_diff = (emp.nickname != expected_nick)
    
    if code_diff or name_diff or nick_diff:
        print(f"  [Employee #{emp.id} - {emp.role}]")
        if code_diff:
            print(f"    - Mã: '{emp.code}' ➔ '{expected_code}'")
        if name_diff:
            print(f"    - Họ tên: '{emp.full_name}' ➔ '{expected_name}'")
        if nick_diff:
            print(f"    - Biệt danh: '{emp.nickname}' ➔ '{expected_nick}'")
        total_changes += 1
        if not DRY_RUN:
            emp.code = expected_code
            emp.full_name = expected_name
            emp.nickname = expected_nick
            emp.save()
    emp_seq += 1

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
