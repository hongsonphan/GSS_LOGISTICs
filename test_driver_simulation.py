"""
Kịch bản giả lập đầy đủ luồng thao tác trên Mobile Driver Portal
"""
import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import io
from PIL import Image
from django.test import Client
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from apps.dispatch.models import DispatchTrip, TripTimelineItem
from apps.billing.models import TripExpense, ExpenseCategory
from apps.documents.models import TripDocument, DocumentType
from apps.personnel.models import Employee, EmployeeRole
from apps.fleet.models import Vehicle, VehicleType
from apps.customers.models import Customer
# Using trip.hashid property directly

def create_mock_image(name="test_receipt.jpg"):
    file_obj = io.BytesIO()
    img = Image.new("RGB", (100, 100), color=(73, 109, 137))
    img.save(file_obj, format="JPEG")
    file_bytes = file_obj.getvalue()
    return SimpleUploadedFile(name, file_bytes, content_type="image/jpeg")

def run_simulation():
    print("=" * 70)
    print(" BẮT ĐẦU GIẢ LẬP LUỒNG THAO TÁC TRÊN ĐIỆN THOẠI TÀI XẾ (DRIVER PORTAL)")
    print("=" * 70)

    # 1. Chuẩn bị khách hàng, xe, tài xế
    customer = Customer.objects.first()
    if not customer:
        customer = Customer.objects.create(
            code="CUST_SIM",
            name="Công ty TNHH Logistics Mẫu",
            address="KCN Sóng Thần 1, Bình Dương"
        )

    driver = Employee.objects.filter(role=EmployeeRole.DRIVER).first()
    if not driver:
        driver = Employee.objects.create(
            code="TX_SIM",
            full_name="Nguyễn Văn Lái",
            nickname="Bảy Lái",
            phone_number="0988776655",
            role=EmployeeRole.DRIVER
        )

    vehicle = Vehicle.objects.filter(vehicle_type=VehicleType.TRACTOR).first()
    if not vehicle:
        vehicle = Vehicle.objects.create(
            license_plate="51C-999.88",
            vehicle_type=VehicleType.TRACTOR
        )

    trip_code = f"SIM-{timezone.now().strftime('%m%d%H%M%S')}"
    trip = DispatchTrip.objects.create(
        trip_code=trip_code,
        customer=customer,
        driver=driver,
        vehicle=vehicle,
        container_number="BIMU1234567",
        seal_number="ML-VN98765",
        pickup_location="Cảng Cát Lái, Cổng B",
        warehouse_location="Kho Tân Tạo, Lô 12 Đường số 3",
        dropoff_location="ICD Phước Long 3",
        status="DISPATCHED",
        loading_date=timezone.now().date(),
        shipment_type="IMPORT"
    )

    trip_hash = trip.hashid
    print(f"[OK] 1. Khởi tạo chuyến xe: {trip.trip_code}")
    print(f"     Tài xế: {driver.full_name} ({driver.nickname}) | Xe: {vehicle.license_plate} | HashID: {trip_hash}")
    print(f"     URL truy cập: /driver/{trip_hash}/")

    client = Client()

    # 2. Truy cập màn hình Portal
    resp = client.get(f"/driver/{trip_hash}/")
    assert resp.status_code == 200, f"Lỗi truy cập Driver Portal: {resp.status_code}"
    assert trip.trip_code.encode() in resp.content
    assert vehicle.license_plate.encode() in resp.content
    print("[PASS] 2. Màn hình Driver Portal hiển thị chuẩn xác (HTTP 200)")

    # 3. Báo mốc 1: Sắp đến kho (30p trước)
    m1_resp = client.post(
        f"/api/trips/{trip_hash}/milestones/",
        data={"milestone": "APPROACHING_WAREHOUSE", "notes": "Cách kho 5km"},
        content_type="application/json",
        HTTP_X_TRIP_HASH=trip_hash
    )
    assert m1_resp.status_code == 200, f"Lỗi mốc 1: {m1_resp.content}"
    trip.refresh_from_db()
    assert trip.status == "IN_TRANSIT"
    print(f"[PASS] 3. Mốc 1 'Sắp đến kho': Thành công -> Status: {trip.status}")

    # 4. Báo mốc 2: Đã đến cổng kho
    m2_resp = client.post(
        f"/api/trips/{trip_hash}/milestones/",
        data={"milestone": "ARRIVED_WAREHOUSE", "notes": "Đã đậu trước cổng bảo vệ"},
        content_type="application/json",
        HTTP_X_TRIP_HASH=trip_hash
    )
    assert m2_resp.status_code == 200, f"Lỗi mốc 2: {m2_resp.content}"
    trip.refresh_from_db()
    assert trip.status == "AT_WAREHOUSE"
    print(f"[PASS] 4. Mốc 2 'Đã đến cổng kho': Thành công -> Status: {trip.status}")

    # 5. Báo mốc 3: Bắt đầu dỡ hàng / vào dock
    m3_resp = client.post(
        f"/api/trips/{trip_hash}/milestones/",
        data={"milestone": "START_UNLOADING", "notes": "Vào dock số 4"},
        content_type="application/json",
        HTTP_X_TRIP_HASH=trip_hash
    )
    assert m3_resp.status_code == 200, f"Lỗi mốc 3: {m3_resp.content}"
    trip.refresh_from_db()
    assert trip.status == "UNLOADING"
    print(f"[PASS] 5. Mốc 3 'Bắt đầu dỡ hàng': Thành công -> Status: {trip.status}")

    # 6. Kê khai chi phí phát sinh: Vé BOT 35.000đ kèm hóa đơn chụp
    mock_receipt = create_mock_image("ve_bot_rach_chiec.jpg")
    exp_resp = client.post(
        f"/api/trips/{trip_hash}/expenses/",
        data={
            "category": "TOLL_FEE",
            "amount": "35000",
            "notes": "Vé trạm Rạch Chiếc lượt về",
            "receipt": mock_receipt
        },
        HTTP_X_TRIP_HASH=trip_hash
    )
    assert exp_resp.status_code == 200, f"Lỗi kê chi phí: {exp_resp.content}"
    latest_exp = TripExpense.objects.filter(trip=trip).latest('created_at')
    assert latest_exp.amount == 35000
    assert latest_exp.category == "TOLL_FEE"
    print(f"[PASS] 6. Kê chi phí: BOT 35,000đ -> TripExpense ID {latest_exp.id} lưu thành công kèm ảnh.")

    # 7. Chụp nghiệm thu chứng từ số POD (Thủ kho ký nhận)
    mock_pod = create_mock_image("bien_ban_pod_signed.jpg")
    pod_resp = client.post(
        f"/api/trips/{trip_hash}/documents/",
        data={
            "doc_type": "Biên bản giao nhận hàng",
            "container_no": "BIMU1234567",
            "seal_no": "ML-VN98765",
            "document": mock_pod
        },
        HTTP_X_TRIP_HASH=trip_hash
    )
    assert pod_resp.status_code == 200, f"Lỗi upload POD: {pod_resp.content}"
    latest_doc = TripDocument.objects.filter(trip=trip, document_type=DocumentType.POD).latest('created_at')
    trip.refresh_from_db()
    assert trip.status == "DELIVERED"
    print(f"[PASS] 7. Nghiệm thu POD: Đã upload chứng từ ID {latest_doc.id} -> Status: {trip.status}")

    # 8. Báo mốc đóng hàng xong / chuẩn bị kéo cont ra cổng
    m4_resp = client.post(
        f"/api/trips/{trip_hash}/milestones/",
        data={"milestone": "FINISHED_UNLOADING", "notes": "Đã ký biên bản xong, đang ra cổng"},
        content_type="application/json",
        HTTP_X_TRIP_HASH=trip_hash
    )
    assert m4_resp.status_code == 200, f"Lỗi mốc 4: {m4_resp.content}"
    trip.refresh_from_db()
    assert trip.status == "RETURNING_EMPTY"
    print(f"[PASS] 8. Mốc 4 'Hoàn tất đóng dỡ': Thành công -> Status: {trip.status}")

    # 9. Báo lưu xe sau 0h (OVERNIGHT_WAIT) nếu kho/cảng yêu cầu
    ov_resp = client.post(
        f"/api/trips/{trip_hash}/milestones/",
        data={"milestone": "OVERNIGHT_WAIT", "notes": "Kho quá tải, hẹn 7h sáng mai dỡ tiếp"},
        content_type="application/json",
        HTTP_X_TRIP_HASH=trip_hash
    )
    assert ov_resp.status_code == 200, f"Lỗi báo lưu xe: {ov_resp.content}"
    trip.refresh_from_db()
    assert trip.is_overnight_detention is True
    print(f"[PASS] 9. Mốc 'Chờ qua đêm sau 0h': Thành công -> is_overnight_detention = {trip.is_overnight_detention}")

    # 10. Chụp chứng từ hạ rỗng EIR và Báo mốc hạ cont hoàn tất
    mock_eir = create_mock_image("phieu_eir_ha_rong.jpg")
    eir_resp = client.post(
        f"/api/trips/{trip_hash}/documents/",
        data={
            "doc_type": "Phiếu EIR Hạ Cont",
            "container_no": "BIMU1234567",
            "seal_no": "ML-VN98765",
            "document": mock_eir
        },
        HTTP_X_TRIP_HASH=trip_hash
    )
    assert eir_resp.status_code == 200, f"Lỗi upload EIR: {eir_resp.content}"

    m5_resp = client.post(
        f"/api/trips/{trip_hash}/milestones/",
        data={"milestone": "DROPOFF_COMPLETED", "notes": "Đã hạ bãi rỗng ICD Phước Long"},
        content_type="application/json",
        HTTP_X_TRIP_HASH=trip_hash
    )
    assert m5_resp.status_code == 200, f"Lỗi mốc 5: {m5_resp.content}"
    trip.refresh_from_db()
    assert trip.status == "COMPLETED"
    print(f"[PASS] 10. Mốc cuối 'Đã hạ cont xong': Thành công -> Status: {trip.status}")

    # 11. Kiểm tra lại toàn bộ dữ liệu trên trang sau khi hoàn thành
    final_view = client.get(f"/driver/{trip_hash}/")
    assert final_view.status_code == 200
    assert b"35000" in final_view.content or b"35,000" in final_view.content

    print("=" * 70)
    print(" TẤT CẢ CÁC BƯỚC GIẢ LẬP TRÊN ĐIỆN THOẠI ĐÃ HOÀN TẤT VÀ ĐẠT 100% TIÊU CHUẨN!")
    print(f" Chuyến xe: {trip.trip_code} | Tổng mốc timeline: {trip.timeline_items.count()} | Chi phí: {trip.expenses.count()} | Chứng từ: {trip.documents.count()}")
    print("=" * 70)

if __name__ == "__main__":
    run_simulation()
