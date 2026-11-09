"""Dữ liệu minh họa cho GSS (chỉ dùng máy local/dev): booking, chia cont cho 3 nhà xe, chuyến ở nhiều bước, bãi Đắk Nông, kiện hàng lẻ.

    python manage.py seed_gss_demo [--create-admin]
--create-admin tạo tài khoản quản trị `gss_admin` với mật khẩu ngẫu nhiên, ghi vào file gss_local_credentials.txt (đã .gitignore).
"""
import datetime
import io
import secrets
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from core.console import safe_text
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from PIL import Image

from apps.customers.models import BookingOrder, Customer
from apps.depot_yard import service as depot
from apps.dispatch import gss_attachments as att
from apps.dispatch import gss_workflow as wf
from apps.dispatch import vendor_service as vs
from apps.dispatch.models import BookingVendorAllocation, DispatchTrip
from apps.master_data.models import Location, Subcontractor
from apps.qr_tracking import service as qr


def _png(name='anh.png'):
    buf = io.BytesIO()
    Image.new('RGB', (320, 220), (15, 118, 110)).save(buf, 'PNG')
    return SimpleUploadedFile(name, buf.getvalue(), content_type='image/png')


class Command(BaseCommand):
    help = 'Nạp dữ liệu minh họa GSS (chỉ khi DEBUG).'

    def add_arguments(self, parser):
        parser.add_argument('--create-admin', action='store_true')

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError('Lệnh này chỉ chạy khi DEBUG=True (không dùng trên production).')
        call_command('init_gss', verbosity=0)
        if BookingOrder.objects.filter(booking_code__startswith='DEMO.').exists():
            self.stdout.write(safe_text('Dữ liệu minh họa đã có, bỏ qua.'))
        else:
            with transaction.atomic():  # lỗi giữa chừng không để lại dữ liệu nửa vời
                self._seed()
        if not BookingOrder.objects.filter(booking_code='DEMO.BL.001').exists():
            with transaction.atomic():
                self._seed_bl()
        if opts['create_admin']:
            self._admin()

    def _admin(self):
        User = get_user_model()
        if User.objects.filter(username='gss_admin').exists():
            self.stdout.write(safe_text('Tài khoản gss_admin đã tồn tại.'))
            return
        pwd = secrets.token_urlsafe(12)
        User.objects.create_superuser('gss_admin', 'gss_admin@local.test', pwd)
        path = Path(settings.BASE_DIR) / 'gss_local_credentials.txt'
        path.write_text(f'Tài khoản local: gss_admin\nMật khẩu: {pwd}\n', encoding='utf-8')
        self.stdout.write(self.style.SUCCESS(safe_text(f'Đã tạo gss_admin, mật khẩu ghi trong {path.name}')))

    def _seed(self):
        today = timezone.localdate()
        kho = Location.objects.create(code='DEMO-KHO', name='KHO NHÀ MÁY ĐẮK MIL', destination_notes='Cổng số 2, gặp bảo vệ đăng ký trước 30 phút. Bắt buộc mang giày bảo hộ.',
                                      road_restrictions='QL14 cấm xe trên 10 tấn 6h-8h và 16h-19h. Cầu Đắk R\'Tih tải trọng hạn chế.')
        cust = Customer.objects.create(code='DEMO-KH1', name='CÔNG TY CÀ PHÊ XUẤT KHẨU MINH PHÚC', address='Đắk Nông')
        subs = [Subcontractor.objects.create(name=n, short_name=s) for n, s in
                (('Công ty vận tải Hoàng Nam', 'Hoàng Nam'), ('Nhà xe Tây Nguyên Express', 'TN Express'), ('Vận tải Thành Đạt', 'Thành Đạt'))]
        bk = BookingOrder.objects.create(
            booking_code='DEMO.BK.001', customer=cust, booking_number='ONEYSGNB12345', shipping_line='ONE', container_size='40HC', total_containers=10,
            commodity='Cà phê nhân', pickup_location='CẢNG CÁT LÁI', delivery_location='KHO NHÀ MÁY ĐẮK MIL', delivery_loc=kho,
            dropoff_location='BÃI RỖNG ICD LONG BÌNH', loading_date=today, dem_start_date=today - datetime.timedelta(days=2), free_time_demurrage=7,
            det_start_date=today - datetime.timedelta(days=2), free_time_detention=7, booking_type='EXPORT_FCL')
        allocs = [vs.create_allocation(bk, s, n)[0] for s, n in zip(subs, (5, 3, 2))]
        plates = iter(f'51C-{i:03d}.{i:02d}' for i in range(100, 200))
        conts = iter(['CSQU3054383', 'MSKU0000000', 'TGHU0000000', 'TCNU1234560', 'OOLU1234567', 'HLXU1234560', 'EGHU1234560', 'ZIMU1234560'])

        def make(alloc, line, upto):
            vs.submit_rows(alloc, [{'line_no': line, 'tractor_plate': next(plates), 'trailer_plate': f'51R-{line:03d}.9{line}', 'container_number': next(conts),
                                    'seal_number': f'SEAL{alloc.id}{line}', 'driver_name': f'Tài xế {alloc.id}-{line}', 'driver_phone': f'09012345{alloc.id}{line}'}], source='dispatcher')
            trip = DispatchTrip.objects.get(vendor_allocation=alloc, vendor_line_no=line)
            for nxt in wf.STEPS[1:wf.STEPS.index(upto) + 1]:
                stage = wf.EVIDENCE_STAGE.get(nxt)
                if stage and not wf.stage_file_count(trip, stage):
                    att.add_attachments(trip, stage, [_png('a.png'), _png('b.png')], label='demo')
                trip = wf.advance(trip, nxt, actor_label='demo')
            return trip

        a, b, c = allocs
        for line, upto in ((1, 'EMPTY_RETURNED'), (2, 'RETURNING_EMPTY'), (3, 'UNLOADED'), (4, 'LOADED_ON_VEHICLE'), (5, 'READY')):
            make(a, line, upto)
        for line, upto in ((1, 'ARRIVED_AT_DELIVERY'), (2, 'ARRIVED_AT_PICKUP')):
            make(b, line, upto)
        t_swap = make(c, 1, 'RETURNING_EMPTY')
        att.add_attachments(t_swap, 'EMPTY_RETURN', [_png()], label='demo')
        wf.advance(t_swap, 'EMPTY_RETURNED', actor_label='demo', swap={'new_number': 'WHLU7654321', 'reason': 'Nhà xe giữ vỏ cũ đóng hàng khác'})
        # DEM/DET quá hạn một chuyến để minh họa cảnh báo
        DispatchTrip.objects.filter(vendor_allocation=b, vendor_line_no=1).update(det_expiry_date=today - datetime.timedelta(days=1))
        # kiện hàng lẻ có seal
        lcl = DispatchTrip.objects.get(vendor_allocation=a, vendor_line_no=5)
        qr.add_packages(lcl, [{'seal_number': f'LCL-{i:03d}', 'recipient_name': 'Đại lý Gia Nghĩa', 'weight_kg': 120 + i, 'cbm': 1.2} for i in range(1, 5)])
        # bãi Đắk Nông
        yard = depot.default_yard()
        m1, _ = depot.gate_in(yard, {'container_number': 'TCNU1234560', 'in_vehicle_plate': '51C-100.01', 'cargo_status': 'FULL', 'container_type': '40HC', 'in_driver_name': 'Tài xế demo'}, label='demo')
        depot.gate_in(yard, {'container_number': 'ABCD1234567', 'in_vehicle_plate': '48C-123.45', 'cargo_status': 'EMPTY', 'container_type': '20DC',
                             'gate_in_at': (timezone.now() - datetime.timedelta(days=9)).isoformat()}, label='demo')
        m3, _ = depot.gate_in(yard, {'container_number': 'WXYZ7654321', 'in_vehicle_plate': '48C-543.21', 'cargo_status': 'EMPTY',
                                     'gate_in_at': (timezone.now() - datetime.timedelta(hours=5)).isoformat()}, label='demo')
        depot.gate_out(m3, {'out_vehicle_plate': '48C-999.99', 'out_purpose': 'RETURN_EMPTY'}, label='demo')
        depot.add_photos(m1, 'IN', [_png('cong1.png')], label='demo')
        self.stdout.write(self.style.SUCCESS(safe_text(f'Đã nạp dữ liệu minh họa: booking {bk.booking_code}, 3 nhà xe, {DispatchTrip.objects.filter(vendor_allocation__in=allocs).count()} chuyến.')))

    def _seed_bl(self):
        """Đơn hàng nhập theo B/L có danh sách cont (đặc tả 08/11/2026): biểu giá, quy tắc DEM/DET, phân bổ theo cont, chi hộ."""
        from decimal import Decimal
        from apps.gss import claims as cl
        from apps.gss import containers as cs
        from apps.gss import pricing as pr
        from apps.gss.models import ChargeCode, CustomsDeclarationRef, FreeTimeRule, RateCard, RateLine
        today = timezone.localdate()
        pr.ensure_default_charge_codes()
        cuoc, nang = ChargeCode.objects.get(code='CUOC'), ChargeCode.objects.get(code='NANG')
        cust = Customer.objects.filter(code='DEMO-KH1').first() or Customer.objects.create(code='DEMO-KH1', name='CÔNG TY CÀ PHÊ XUẤT KHẨU MINH PHÚC')
        kho = Location.objects.filter(code='DEMO-KHO').first()
        kho2 = Location.objects.create(code='DEMO-KHO2', name='KHO SÓNG THẦN', opening_hours='07:30-11:30, 13:30-17:00',
                                       destination_notes='Vào cổng 1, xuất trình lệnh.')
        subs = list(Subcontractor.objects.filter(short_name__in=['Hoàng Nam', 'TN Express']).order_by('id'))
        for i, sub in enumerate(subs, 1):
            if not sub.code or sub.code.startswith('NX'):
                sub.code = f'VND{i:02d}'
                sub.save(update_fields=['code'])
        FreeTimeRule.objects.get_or_create(name='MSC – DEM 7 ngày', defaults={'shipping_line': 'MSC', 'kind': 'DEM', 'free_days': 7, 'start_event': 'DISCHARGE'})
        FreeTimeRule.objects.get_or_create(name='MSC – DET 10 ngày', defaults={'shipping_line': 'MSC', 'kind': 'DET', 'free_days': 10, 'start_event': 'DISCHARGE'})
        sell = RateCard.objects.create(code='DEMO-BAN', name='Giá bán Minh Phúc 2026', side='SELL', customer=cust, valid_from=today.replace(month=1, day=1))
        RateLine.objects.create(card=sell, charge_code=cuoc, container_type='40HC', unit='CONT', unit_price=Decimal('6500000'))
        pr.approve(sell, None)
        for sub, price in zip(subs, (Decimal('5200000'), Decimal('5000000'))):
            buy = RateCard.objects.create(code=f'DEMO-MUA-{sub.code}', name=f'Giá mua {sub.short_name}', side='BUY', subcontractor=sub, valid_from=today.replace(month=1, day=1))
            RateLine.objects.create(card=buy, charge_code=cuoc, unit='CONT', unit_price=price)
            pr.approve(buy, None)
        bk = BookingOrder.objects.create(
            booking_code='DEMO.BL.001', customer=cust, booking_type='IMPORT_FCL', mbl_number='MEDUVN123456', hbl_number='HBLGSS2611001',
            booking_number='MEDUVN123456', shipping_line='MSC', vessel_voyage='MSC ANNA 611N', container_size='40HC', total_containers=0,
            commodity='Phân bón', pickup_location='CẢNG CÁT LÁI', delivery_location=kho.name if kho else 'KHO NHÀ MÁY', delivery_loc=kho,
            dropoff_location='DEPOT TÂN CẢNG LONG BÌNH', eta=today - datetime.timedelta(days=4), discharge_date=today - datetime.timedelta(days=3),
            do_expiry=today + datetime.timedelta(days=5), port_of_loading='SHANGHAI', port_of_discharge='CÁT LÁI', loading_date=today)
        CustomsDeclarationRef.objects.create(booking=bk, number='106123456780', declared_on=today - datetime.timedelta(days=2), channel='GREEN')
        def iso(owner, serial):  # số cont minh họa hợp lệ ISO 6346
            base = f'{owner}{serial:06d}'
            return next(base + str(d) for d in range(10) if vs.iso6346_valid(base + str(d)))
        conts = [iso('MSCU', 123456), iso('MEDU', 305438), iso('MSCU', 765432), iso('TGHU', 100001), iso('CAIU', 200002), iso('TCNU', 300003)]
        rows = [{'source_line': i, 'raw': c, 'container_type': '40HC', 'seal_number': f'MSC{i:05d}', 'gross_weight_kg': str(24000 + i * 150)} for i, c in enumerate(conts, 1)]
        valid = [r for r in rows if cs.validate_rows(bk, [r])[0]['ok']]
        cs.import_containers(bk, valid)
        cs.apply_free_time(bk)
        bcs = list(bk.containers.filter(is_deleted=False).order_by('line_no'))
        if len(bcs) >= 2 and kho2:
            bcs[-1].delivery_loc = kho2
            bcs[-1].save(update_fields=['delivery_loc'])
        half = (len(bcs) + 1) // 2
        allocs = []
        for sub, group in zip(subs, (bcs[:half], bcs[half:])):
            if group:
                out = cs.assign(bk, [c.id for c in group], sub)
                allocs.append(out['allocation'])
        plates = iter(f'50H-{i:03d}.{i % 90 + 10:02d}' for i in range(300, 400))
        made = []
        for alloc in allocs:
            for r in vs.rows_for(alloc, for_vendor=False)[:2]:
                vs.submit_rows(alloc, [{'line_no': r['line_no'], 'tractor_plate': next(plates), 'trailer_plate': f'50R-{r["line_no"]:03d}.88',
                                        'driver_name': f'Tài xế {alloc.subcontractor.short_name} {r["line_no"]}', 'driver_phone': f'0987{alloc.id:02d}{r["line_no"]:04d}'}], source='dispatcher')
                made.append(DispatchTrip.objects.get(vendor_allocation=alloc, vendor_line_no=r['line_no']))
        if made:
            t = made[0]
            for nxt in wf.STEPS[1:]:
                stage = wf.EVIDENCE_STAGE.get(nxt)
                if stage and not wf.stage_file_count(t, stage):
                    att.add_attachments(t, stage, [_png('ct.png')], label='demo', staff=True)
                t = wf.advance(t, nxt, actor_label='demo')
            claim = cl.submit_claim(t, charge_code=nang, amount=550000, description='Nâng cont tại Cát Lái', photo=_png('hoadon.png'), label='tài xế demo')
            cl.register_invoice({'seller_tax_code': '0300000001', 'series': '1C26TAA', 'number': '1234', 'buyer_name': cust.name, 'total_amount': '550000'},
                                claim=claim, source='MANUAL')
        if len(made) > 1:
            t2 = made[1]
            for nxt in ('ARRIVED_AT_PICKUP', 'LOADED_ON_VEHICLE'):
                stage = wf.EVIDENCE_STAGE.get(nxt)
                if stage:
                    att.add_attachments(t2, stage, [_png('n.png')], label='demo', staff=True)
                t2 = wf.advance(t2, nxt, actor_label='demo')
        self.stdout.write(self.style.SUCCESS(safe_text(f'Đã nạp đơn hàng B/L minh họa {bk.booking_code}: {len(bcs)} cont, {len(made)} chuyến, biểu giá + chi hộ.')))
