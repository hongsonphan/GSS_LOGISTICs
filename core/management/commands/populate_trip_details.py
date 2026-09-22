"""
Management command bổ sung đầy đủ Chứng từ gốc và Đồng bộ Quy trình 10 Bước cho toàn bộ chuyến xe.
"""

from django.core.management.base import BaseCommand
from apps.dispatch.models import DispatchTrip, TripStatus
from apps.dispatch.timeline_service import sync_trip_10_step_timeline
from apps.documents.models import TripDocument, DocumentType
from apps.personnel.models import Employee

class Command(BaseCommand):
    help = "Bổ sung chứng từ gốc và đồng bộ 10 bước tiến độ điều vận cho tất cả chuyến xe"

    def handle(self, *args, **options):
        self.stdout.write("Bắt đầu chuẩn hóa 10 bước tiến độ & chứng từ gốc...")
        dispatcher = Employee.objects.filter(code='DD001').first() or Employee.objects.first()

        # 1. Đồng bộ 10 bước tiến độ cho toàn bộ chuyến xe
        trips = DispatchTrip.objects.all()
        for trip in trips:
            sync_trip_10_step_timeline(trip)
            self.stdout.write(f"  -> Đã đồng bộ 10 bước cho chuyến: {trip.trip_code}")

        # 2. Xóa các chứng từ trùng lặp nếu có
        for trip in trips:
            seen_titles = set()
            for doc in trip.documents.all():
                if doc.title in seen_titles:
                    doc.delete()
                else:
                    seen_titles.add(doc.title)

        # 3. Định nghĩa bộ chứng từ gốc chuẩn cho từng chuyến xe
        docs_payload = {
            'TVL-0917-007': [
                {
                    'type': DocumentType.POD,
                    'title': 'Biên Bản Giao Nhận Hàng Hóa (POD) Takigawa VN',
                    'raw': 'Xác nhận chuyển kho cont 40HC WOSU6802430 - Seal 61C39329 - Nghiệm thu đủ kiện',
                    'cont': 'WOSU6802430',
                    'seal': '61C39329',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Biên Nhận Dịch Vụ Cẩu & Nâng Hạ Depot VSIP 3',
                    'raw': 'Hóa đơn GTGT số 0041289 - Cước nâng hạ cont 40HC - Mã tra cứu: TKG-202609',
                    'cont': 'WOSU6802430',
                    'seal': '61C39329',
                },
                {
                    'type': DocumentType.WEIGHT_TICKET,
                    'title': 'Phiếu Cân Tải Trọng Trạm Cân KCN VSIP 3',
                    'raw': 'Xe 61C-393.29 - Tổng tải: 32.500 kg - Tự trọng: 14.200 kg - Khối lượng hàng: 18.300 kg',
                    'cont': 'WOSU6802430',
                    'seal': '61C39329',
                }
            ],
            'TVL-0917-006': [
                {
                    'type': DocumentType.POD,
                    'title': 'Biên Bản Giao Nhận Hàng Ký POD - Vicaco Đồng Tháp',
                    'raw': 'Bàn giao 10T phụ gia bao bì - Người nhận: Kho Trưởng Vicaco - Tình trạng nguyên vẹn',
                    'cont': 'XE TẢI 10T',
                    'seal': '',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Vé Điện Tử Thu Phí BOT Cầu Mỹ Thuận 2',
                    'raw': 'Trạm BOT Mỹ Thuận 2 - Xe tải 10T - Vé điện tử ePass - Không xuất VAT',
                    'cont': 'XE TẢI 10T',
                    'seal': '',
                }
            ],
            'TVL-0917-005': [
                {
                    'type': DocumentType.EIR_PICKUP,
                    'title': 'Phiếu EIR Giao Nhận Container Cảng Bình Dương (No 088421)',
                    'raw': 'Cont: MOLU3891024 - Seal: ML-448102 - Tàu ONE HARBOUR / 042W - Vị trí: BÃI D2',
                    'cont': 'MOLU3891024',
                    'seal': 'ML-448102',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Hóa Đơn Dịch Vụ Cảng Bình Dương HĐ 0055192',
                    'raw': 'Phí nâng cont 40HC nhập khẩu - Mã tra cứu VNPT: BD2026-99182',
                    'cont': 'MOLU3891024',
                    'seal': 'ML-448102',
                },
                {
                    'type': DocumentType.POD,
                    'title': 'Biên Bản Giao Nhận POD Kho TTI - KCN Tây Bắc Củ Chi',
                    'raw': 'Bàn giao cont nguyên seal ML-448102 - Hàng linh kiện may mặc kiểm đếm đủ',
                    'cont': 'MOLU3891024',
                    'seal': 'ML-448102',
                }
            ],
            'TVL-0917-004': [
                {
                    'type': DocumentType.EIR_PICKUP,
                    'title': 'Phiếu EIR Giao Nhận Cont Tân Cảng Hải Minh (No 119283)',
                    'raw': 'Cont: TCNU9912048 - Seal: ML-992100 - Hãng tàu ONE - Trọng lượng: 24.500 kg',
                    'cont': 'TCNU9912048',
                    'seal': 'ML-992100',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Hóa Đơn Dịch Vụ Tân Cảng Hải Minh HĐ 0072183',
                    'raw': 'Nâng hạ bãi cont nhập - Mã tra cứu Viettel: HM-202609-00192',
                    'cont': 'TCNU9912048',
                    'seal': 'ML-992100',
                },
                {
                    'type': DocumentType.CONTAINER_CHECK,
                    'title': 'Biên Bản Giám Định Vỏ Container 40HC Tân Cảng',
                    'raw': 'Giám định Tân Cảng Hải Minh: Vỏ cont sạch, kín nước, sàn gỗ phẳng đạt chuẩn',
                    'cont': 'TCNU9912048',
                    'seal': 'ML-992100',
                }
            ],
            'TVL-0917-003': [
                {
                    'type': DocumentType.EIR_PICKUP,
                    'title': 'Phiếu EIR Lấy Cont Cảng Tân Cảng Cát Lái (No 291840)',
                    'raw': 'Cont: CAAU8819203 - Seal: AD-771920 - Hãng tàu CMA CGM - Tàu CMA CHEROKEE',
                    'cont': 'CAAU8819203',
                    'seal': 'AD-771920',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Hóa Đơn Dịch Vụ Cảng Tân Cảng Cát Lái HĐ 0091823',
                    'raw': 'Cước nâng hạ cont nhập khẩu - Mã tra cứu: TCCL-9821-44 - Tiền: 1.450.000 đ',
                    'cont': 'CAAU8819203',
                    'seal': 'AD-771920',
                },
                {
                    'type': DocumentType.POD,
                    'title': 'Biên Bản Bàn Giao Hàng Hóa (POD) Kho An Di',
                    'raw': 'Ký nhận đủ 1.200 thùng hàng may mặc - Tình trạng seal nguyên vẹn AD-771920',
                    'cont': 'CAAU8819203',
                    'seal': 'AD-771920',
                },
                {
                    'type': DocumentType.EIR_DROPOFF,
                    'title': 'Phiếu EIR Hạ Rỗng Cát Lái Depot 6A (No 440192)',
                    'raw': 'Hạ vỏ cont rỗng 40HC tình trạng tốt - Bãi cont Depot 6A Cát Lái',
                    'cont': 'CAAU8819203',
                    'seal': 'AD-771920',
                }
            ],
            'TVL-0917-002': [
                {
                    'type': DocumentType.EIR_PICKUP,
                    'title': 'Phiếu EIR Lấy Cont Rỗng AP-622 (No 0038192)',
                    'raw': 'Cont: MSKU1928301 - Seal: ML-182901 - Maersk Line - Cấp vỏ đóng hàng xuất',
                    'cont': 'MSKU1928301',
                    'seal': 'ML-182901',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Hóa Đơn Điện Tử Công Ty Anh Phong HĐ 0061201',
                    'raw': 'Phí nâng vỏ rỗng 40HC tại AP622 - Tra cứu: solog.ehoadon.vn - Mã: AP-99120',
                    'cont': 'MSKU1928301',
                    'seal': 'ML-182901',
                },
                {
                    'type': DocumentType.POD,
                    'title': 'Biên Bản Giao Nhận Ký POD Kho An Di',
                    'raw': 'Đã hoàn tất đóng hàng may mặc xuất khẩu đi Mỹ - Bấm seal hãng tàu ML-182901',
                    'cont': 'MSKU1928301',
                    'seal': 'ML-182901',
                },
                {
                    'type': DocumentType.EIR_DROPOFF,
                    'title': 'Phiếu EIR Hạ Cont Cảng Tanamexco ICD Tây Nam (No 1982)',
                    'raw': 'Hạ cont 40HC xuất bãi ICD Tây Nam - Phiếu số 1982 - Cắt máng thành công',
                    'cont': 'MSKU1928301',
                    'seal': 'ML-182901',
                }
            ],
            'TVL-0917-001': [
                {
                    'type': DocumentType.EIR_PICKUP,
                    'title': 'Phiếu EIR Giao Nhận Cont Sinovnil Tân Thuận (No 008129)',
                    'raw': 'Cont: SITU8192019 - Seal: CD-991283 - Hãng tàu SITC - Vị trí bãi: A-04',
                    'cont': 'SITU8192019',
                    'seal': 'CD-991283',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Biên Nhận Dịch Vụ Cảng Tân Thuận HĐ 0019284',
                    'raw': 'Cước nâng cont 20DC - Mã tra cứu: SINO-TT-2026 - Tiền: 850.000 đ',
                    'cont': 'SITU8192019',
                    'seal': 'CD-991283',
                },
                {
                    'type': DocumentType.POD,
                    'title': 'Biên Bản Giao Hàng (POD) Cát Đằng - Hương Lộ 2',
                    'raw': 'Ký nhận đủ 22 tấn hạt nhựa nguyên sinh - Bàn giao thủ kho Cát Đằng hoàn tất',
                    'cont': 'SITU8192019',
                    'seal': 'CD-991283',
                },
                {
                    'type': DocumentType.EIR_DROPOFF,
                    'title': 'Phiếu EIR Hạ Cont Cảng Cát Lái Xuất Khẩu',
                    'raw': 'Hạ cont 20DC cảng Cát Lái - Tàu SITC DALIAN / 2410N - Vào bãi CY an toàn',
                    'cont': 'SITU8192019',
                    'seal': 'CD-991283',
                }
            ],
            'TVL-0921-009': [
                {
                    'type': DocumentType.EIR_PICKUP,
                    'title': 'Phiếu EIR Lấy Cont Cảng Tân Cảng Cát Lái (No 301928)',
                    'raw': 'Cont: BMOU4419201 - Seal: SL-881920 - Hãng tàu YangMing',
                    'cont': 'BMOU4419201',
                    'seal': 'SL-881920',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Hóa Đơn Dịch Vụ Cảng Cát Lái HĐ 0098192',
                    'raw': 'Phí nâng cont 40HC - Tra cứu ePort Tổng công ty Tân Cảng',
                    'cont': 'BMOU4419201',
                    'seal': 'SL-881920',
                }
            ],
            'TVL-0916-001': [
                {
                    'type': DocumentType.EIR_PICKUP,
                    'title': 'Phiếu EIR Lấy Cont Bột Sắt TĐÁ (No 09182)',
                    'raw': 'Cont: BỘT SẮT (CONT 40) - Bãi TĐÁ - Hàng xá 30T',
                    'cont': 'BỘT SẮT (CONT 40)',
                    'seal': 'VC-00192',
                },
                {
                    'type': DocumentType.WEIGHT_TICKET,
                    'title': 'Phiếu Cân Tải Trọng 30T Trạm Cân TĐÁ',
                    'raw': 'Trạm cân TĐÁ - Xe 61S-999.00 - Khối lượng hàng tịnh: 30.150 kg',
                    'cont': 'BỘT SẮT (CONT 40)',
                    'seal': 'VC-00192',
                },
                {
                    'type': DocumentType.POD,
                    'title': 'Biên Bản Giao Nhận Hàng Bột Sắt Vicaco',
                    'raw': 'Đã giao nhận đủ 30T bột sắt tại nhà máy Vicaco - Biên bản có ký đóng dấu',
                    'cont': 'BỘT SẮT (CONT 40)',
                    'seal': 'VC-00192',
                }
            ],
            'TVL-0916-003': [
                {
                    'type': DocumentType.EIR_PICKUP,
                    'title': 'Phiếu EIR Giao Nhận Cont Cát Lái (No 18291)',
                    'raw': 'Cont: FFAU5774044 - Seal: WC-99182 - Khách hàng: WCA_TTI',
                    'cont': 'FFAU5774044',
                    'seal': 'WC-99182',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Hóa Đơn Nâng Hạ Cảng Cát Lái HĐ 0077182',
                    'raw': 'Phí nâng cont 40HC nhập khẩu - ePort Tân Cảng Cát Lái',
                    'cont': 'FFAU5774044',
                    'seal': 'WC-99182',
                }
            ],
            'TVL-0916-004': [
                {
                    'type': DocumentType.EIR_PICKUP,
                    'title': 'Phiếu EIR Lấy Cont Cảng Cát Lái (No 19284)',
                    'raw': 'Cont: BMOU5528219 - Seal: WC-88291 - Hãng tàu YangMing',
                    'cont': 'BMOU5528219',
                    'seal': 'WC-88291',
                },
                {
                    'type': DocumentType.INVOICE,
                    'title': 'Hóa Đơn Điện Tử Cảng Cát Lái HĐ 0081290',
                    'raw': 'Phí nâng hạ cont 40HC - Mã tra cứu HD-2026-9918',
                    'cont': 'BMOU5528219',
                    'seal': 'WC-88291',
                }
            ],
            'TVL-0916-005': [
                {
                    'type': DocumentType.POD,
                    'title': 'Biên Bản Giao Nhận Hàng Nội Bộ Takigawa VN',
                    'raw': 'Cont VOSU8802430 - Seal 61C39329 - Chuyển hàng nội bộ VSIP 2 sang VSIP 3',
                    'cont': 'VOSU8802430',
                    'seal': '61C39329',
                },
                {
                    'type': DocumentType.WEIGHT_TICKET,
                    'title': 'Phiếu Cân Hàng Nhà Máy Takigawa VSIP 2',
                    'raw': 'Xe 61C-393.29 - Trọng lượng hàng: 18.500 kg - Đạt tải',
                    'cont': 'VOSU8802430',
                    'seal': '61C39329',
                }
            ]
        }

        for trip_code, doc_list in docs_payload.items():
            trip = DispatchTrip.objects.filter(trip_code=trip_code).first()
            if not trip:
                continue

            for doc_item in doc_list:
                TripDocument.objects.update_or_create(
                    trip=trip,
                    title=doc_item['title'],
                    defaults={
                        'document_type': doc_item['type'],
                        'ocr_raw_text': doc_item['raw'],
                        'extracted_container_no': doc_item.get('cont', trip.container_number),
                        'extracted_seal_no': doc_item.get('seal', trip.seal_number),
                        'is_verified': True,
                        'verified_by': dispatcher
                    }
                )
            self.stdout.write(f"  -> Đã bổ sung {len(doc_list)} chứng từ cho chuyến {trip_code}")

        self.stdout.write(self.style.SUCCESS("Hoàn tất nạp chứng từ và đồng bộ 10 bước tiến độ thành công!"))
