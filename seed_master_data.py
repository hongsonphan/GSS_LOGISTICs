import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.master_data.models import ShippingLine, Subcontractor
from apps.fleet.models import Trailer
import datetime

# 1. Shipping lines
sl_data = [
    ('MAEU', 'Maersk Line', '1900-5454-99', 'vn.export@maersk.com', 'https://www.maersk.com', 7, 5, 'Hạ rỗng tại Depot Tân Cảng Suối Tiên / ICD Sotrans'),
    ('ONE', 'Ocean Network Express (ONE Line)', '028-3827-0100', 'vn.cs@one-line.com', 'https://vn.one-line.com', 7, 5, 'Lệnh e-DO trên cổng ONE portal'),
    ('COSCO', 'Cosco Shipping Lines', '028-3829-1119', 'cosco.hcm@coscon.com', 'https://lines.coscoshipping.com', 7, 7, 'Cấp vỏ tại Depot TBS Tân Vạn'),
    ('EVERGREEN', 'Evergreen Marine Corp', '028-3512-1888', 'hcm@evergreen-shipping.com.vn', 'https://www.evergreen-marine.com', 7, 5, 'Hạ bãi Solog Libra / Cát Lái'),
    ('SITC', 'SITC Container Lines', '028-5404-7415', 'sitc.hcm@sitc.vn', 'https://www.sitc.com', 7, 5, 'Chuyên tuyến Đông Nam Á, Trung Quốc'),
    ('CMA', 'CMA CGM Vietnam', '028-3914-8400', 'ssc.service@cma-cgm.com', 'https://www.cma-cgm.com', 7, 7, 'e-DO qua Cảng Đồng Nai / Cát Lái'),
    ('MSC', 'Mediterranean Shipping Company', '028-3636-3333', 'vnm-info@msc.com', 'https://www.msc.com', 7, 5, 'Depot Gemadept Bình Dương / ICD Phước Long'),
    ('YANGMING', 'Yang Ming Marine Transport', '028-3825-7890', 'cs@yangming.com.vn', 'https://www.yangming.com', 7, 5, 'Hạ rỗng tại Tân Cảng Hiệp Phước'),
    ('KMTC', 'KMTC Line Vietnam', '028-3911-0000', 'kmtchcm@ekmtc.com', 'https://www.ekmtc.com', 7, 5, 'Chuyên tuyến Hàn Quốc, Đông Á'),
    ('BIENDONG', 'Vận tải Biển Đông (Nội Địa)', '028-3823-0101', 'cs@biendong.com.vn', 'https://biendong.com.vn', 10, 7, 'Tuyến Bắc Nam: Hải Phòng - Cát Lái'),
]

for code, name, phone, email, web, dem, det, notes in sl_data:
    ShippingLine.objects.get_or_create(code=code, defaults={
        'name': name,
        'contact_phone': phone,
        'contact_email': email,
        'website': web,
        'free_dem_days': dem,
        'free_det_days': det,
        'notes': notes,
        'is_active': True
    })

# 2. Subcontractors
sc_data = [
    ('NX_HOANGNAM', 'Công ty TNHH Vận tải Hoàng Nam', '0314892831', 'Nguyễn Hoàng Nam', '0918.234.567', '45 QL1A, P. An Phú Đông, Q.12, TP.HCM', '0071001234567', 'Vietcombank - CN Tân Định', 'CTY TNHH VT HOANG NAM', 'Chuyên kéo cont KCN Long An, Đức Hòa, Tây Ninh'),
    ('NX_MINHTHU', 'Công ty Cổ phần Vận tải Minh Thư', '0315902123', 'Trần Minh Thư', '0903.882.119', '128 Xa Lộ Hà Nội, P. Linh Trung, TP. Thủ Đức', '19034567890012', 'Techcombank - CN Sài Gòn', 'CTY CP VT MINH THU', 'Thế mạnh tuyến Cảng Cái Mép, Cát Lái, Tân Vạn'),
    ('NX_TRIENTHANH', 'Nhà xe Triển Thành Vận Tải', '3702194821', 'Võ Triển Thành', '0979.112.334', '88 ĐT743, P. An Phú, Thuận An, Bình Dương', '0441000678910', 'Vietcombank - CN Sóng Thần', 'VO TRIEN THANH', 'Đội xe 15 đầu kéo tuyến KCN Bình Dương, VSIP 1-2, Bàu Bàng'),
]

for code, name, tax, person, phone, addr, acc, bank, holder, notes in sc_data:
    Subcontractor.objects.get_or_create(code=code, defaults={
        'name': name,
        'tax_code': tax,
        'contact_person': person,
        'phone': phone,
        'address': addr,
        'bank_account_number': acc,
        'bank_name': bank,
        'bank_account_holder': holder,
        'notes': notes,
        'is_active': True
    })

# 3. Trailers
tr_data = [
    ('51R-023.45', 'MOOC_XUONG_40', 'Tân Thanh', 32000, datetime.date(2027, 8, 15), 'IDLE'),
    ('51R-088.92', 'MOOC_CO_CO_40', 'CIMC', 32500, datetime.date(2027, 5, 20), 'IDLE'),
    ('51R-145.67', 'MOOC_XUONG_20', 'Doosung', 31000, datetime.date(2027, 10, 10), 'IDLE'),
    ('51R-233.11', 'MOOC_SAN_45', 'Tân Thanh', 33000, datetime.date(2027, 12, 1), 'IDLE'),
    ('61R-012.89', 'MOOC_XUONG_40', 'CIMC', 32000, datetime.date(2027, 4, 30), 'IDLE'),
]

for plate, t_type, brand, payload, expiry, status in tr_data:
    Trailer.objects.get_or_create(license_plate=plate, defaults={
        'trailer_type': t_type,
        'brand': brand,
        'payload_capacity_kg': payload,
        'registration_expiry': expiry,
        'status': status
    })

print('VPS Seed Success: Shipping lines:', ShippingLine.objects.count(), 'Subcontractors:', Subcontractor.objects.count(), 'Trailers:', Trailer.objects.count())
