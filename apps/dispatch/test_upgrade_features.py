import io
import openpyxl
from rest_framework.test import APIClient

from apps.fleet.models import Trailer, Vehicle
from apps.master_data.models import ContainerType
from apps.dispatch.test_gss import GssBase
from apps.dispatch import gss_workflow as wf
from apps.dispatch import gss_messages as msg


class UpgradeFeaturesTests(GssBase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=self.staff)

    def test_iso_container_types_seeded(self):
        """Mục 2: Danh mục container phải có các loại ISO chuẩn: 20RF, 40RF, 20FR, 40FR, 20OT, 40OT, 20GP, 40GP, 40HC, 45HQ."""
        expected_codes = ['20GP', '40GP', '40HC', '45HQ', '20RF', '40RF', '20FR', '40FR', '20OT', '40OT']
        existing = set(ContainerType.objects.values_list('code', flat=True))
        for code in expected_codes:
            self.assertIn(code, existing, f"Thiếu mã container {code} trong danh mục ISO")

    def test_vehicle_default_trailer(self):
        """Mục 3: Gán mặc định Đầu kéo đi cùng Rơ-moóc."""
        trailer = Trailer.objects.create(
            license_plate="51R-99999",
            trailer_type="FLATBED",
        )
        vehicle = Vehicle.objects.create(
            license_plate="50H-88888",
            vehicle_type="TRACTOR",
            default_trailer=trailer,
        )
        self.assertEqual(vehicle.default_trailer, trailer)
        self.assertIn(vehicle, trailer.default_for_vehicles.all())

        # Test options API exposes default_trailer
        res = self.client.get("/api/master-data/form-options/")
        self.assertEqual(res.status_code, 200)
        vehicles = res.json().get("vehicles", [])
        matched = [t for t in vehicles if t.get("plate") == vehicle.license_plate]
        self.assertTrue(len(matched) > 0)
        self.assertEqual(matched[0].get("default_trailer_id"), trailer.id)
        self.assertEqual(matched[0].get("default_trailer_plate"), trailer.license_plate)

    def test_dynamic_step_labels_by_shipment_type(self):
        """Mục 4: 7 bước cốt lõi ánh xạ nhãn hiển thị theo loại hàng (Nhập, Xuất, Nội địa)."""
        # Nhập: Đến cảng nhận -> Đến kho -> Đã giao -> Hạ rỗng
        import_labels = wf.step_labels_for('IMPORT')
        self.assertEqual(import_labels['ARRIVED_AT_PICKUP'], 'Đến cảng nhận')
        self.assertEqual(import_labels['ARRIVED_AT_DELIVERY'], 'Đến kho')
        self.assertEqual(import_labels['UNLOADED'], 'Đã giao')
        self.assertEqual(import_labels['EMPTY_RETURNED'], 'Hạ rỗng')

        # Xuất: Lấy Cont Rỗng -> Đến Nhà máy -> Đã đóng hàng -> Đã hạ Cont
        export_labels = wf.step_labels_for('EXPORT')
        self.assertEqual(export_labels['LOADED_ON_VEHICLE'], 'Lấy Cont Rỗng')
        self.assertEqual(export_labels['ARRIVED_AT_DELIVERY'], 'Đến Nhà máy')
        self.assertEqual(export_labels['UNLOADED'], 'Đã đóng hàng')
        self.assertEqual(export_labels['EMPTY_RETURNED'], 'Đã hạ Cont')

        # Nội địa: Đã nhận -> Đã giao
        dom_labels = wf.step_labels_for('DOMESTIC')
        self.assertEqual(dom_labels['LOADED_ON_VEHICLE'], 'Đã nhận')
        self.assertEqual(dom_labels['UNLOADED'], 'Đã giao')

    def test_compose_driver_message_structure(self):
        """Mục 10 & 11: Cấu trúc tin nhắn chuẩn gửi tài xế có đầy đủ GIẢI PHÁP XANH, VC, B/L - Cont - Seal, SDT KHO, Ghi chú."""
        trip = self.trip(1, cont='CSQU3054383')
        trip.seal_number = 'SL9988'
        trip.contact_phone = '0987654321'
        trip.special_notes = 'Tài xế lưu ý mang theo phiếu cân'
        trip.save()

        msg_text = msg.compose_message(trip, base_url="https://app.gpxlogistics.vn")
        self.assertIn("GIẢI PHÁP XANH LOGISTICS", msg_text)
        self.assertIn("Lệnh Vận chuyển: " + trip.trip_code, msg_text)
        self.assertIn("Cont: CSQU3054383", msg_text)
        self.assertIn("Seal: SL9988", msg_text)
        self.assertIn("Ghi chú:\n- Tài xế lưu ý mang theo phiếu cân", msg_text)
        self.assertIn("https://app.gpxlogistics.vn/q/", msg_text)

    def test_vendor_batch_message_and_excel_roundtrip(self):
        """Mục 1 & 11: Bulk message gửi Zalo điều vận & Excel round-trip."""
        t1 = self.trip(1, cont='CSQU3054383')
        alloc = self.alloc

        # 1. Batch message
        batch_text = msg.compose_vendor_batch_message(alloc, base_url="https://app.gpxlogistics.vn")
        self.assertIn("GIẢI PHÁP XANH", batch_text)
        self.assertIn(t1.trip_code, batch_text)

        # Batch message API endpoint
        url = f"/api/vendor-allocations/{alloc.id}/batch-message/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertIn("GIẢI PHÁP XANH", data.get("message", ""))

        # 2. Excel Export
        excel_res = self.client.get(f"/api/vendor-allocations/{alloc.id}/excel/")
        self.assertEqual(excel_res.status_code, 200)
        self.assertEqual(excel_res['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

        # 3. Excel Import back
        wb = openpyxl.load_workbook(io.BytesIO(excel_res.content))
        ws = wb.active
        # Điền Biển số xe, moóc, tài xế vào dòng 2
        ws.cell(row=2, column=6, value="51C-12345")
        ws.cell(row=2, column=7, value="51R-67890")
        ws.cell(row=2, column=8, value="Nguyễn Văn A")
        ws.cell(row=2, column=9, value="0901234567")

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)

        upload_res = self.client.post(
            f"/api/vendor-allocations/{alloc.id}/excel/",
            {'file': out},
            format='multipart'
        )
        self.assertEqual(upload_res.status_code, 200)
        resp_data = upload_res.json()
        self.assertTrue(resp_data.get("success"))
        self.assertEqual(resp_data.get("data", {}).get("saved"), 1)
