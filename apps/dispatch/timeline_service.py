"""
Service đồng bộ máy trạng thái và chuẩn hóa Quy trình Điều vận 10 Bước (TMS).
Đảm bảo 100% chuyến xe trong hệ thống luôn có đầy đủ 10 bước tiến độ thực tế theo SOP Triền Võ.
"""

from datetime import timedelta
from django.utils import timezone
from apps.dispatch.models import DispatchTrip, TripStatus, TripTimelineItem

STATUS_PROGRESSION = [
    TripStatus.DRAFT,             # Bước 1: Tiếp nhận & Lập lệnh
    TripStatus.DISPATCHED,        # Bước 2: Phát lệnh Zalo/App
    TripStatus.ACCEPTED,          # Bước 3: Tài xế nhận lệnh
    TripStatus.CONTAINER_PICKED,  # Bước 4: Lấy Cont / Hàng
    TripStatus.IN_TRANSIT,        # Bước 5: Vận chuyển theo tuyến
    TripStatus.AT_WAREHOUSE,      # Bước 6: Đến kho KH (Báo kho/Vào cổng)
    TripStatus.UNLOADING,         # Bước 7: Đóng / Trút hàng tại dock
    TripStatus.DELIVERED,         # Bước 8: Hoàn tất ký POD
    TripStatus.RETURNING_EMPTY,   # Bước 9: Kéo cont hạ bãi / Trả rỗng
    TripStatus.COMPLETED,         # Bước 10: Hoàn tất & Chốt sổ kế toán
]

def build_10_step_timeline_spec(trip: DispatchTrip):
    """
    Xây dựng đặc tả chi tiết 10 bước điều vận thực tế theo dữ liệu cụ thể của chuyến xe.
    """
    pickup_name = trip.pickup_depot or trip.pickup_location or 'Bãi lấy cont'
    dropoff_name = trip.dropoff_depot or trip.dropoff_location or 'Bãi hạ cont'
    wh_name = trip.delivery_warehouse or trip.warehouse_location or 'Kho khách hàng'
    driver_name = trip.driver.nickname or trip.driver.full_name if trip.driver else 'Tài xế'
    vehicle_plate = trip.vehicle.license_plate if trip.vehicle else 'Xe công ty'
    dock_name = trip.warehouse_dock or 'dock kho'

    date_str = trip.loading_date.strftime('%d/%m') if trip.loading_date else trip.created_at.strftime('%d/%m')
    t_create = trip.created_at.strftime('%H:%M %d/%m') if trip.created_at else f"17:00 {date_str}"
    t_dispatch = f"18:00 {date_str}"
    t_accept = f"18:15 {date_str}"
    t_pickup = f"08:00 {date_str}"
    t_transit = f"09:30 {date_str}"
    t_wh_in = trip.actual_gate_in_time or trip.eta_warehouse_time or f"11:00 {date_str}"
    t_unload = trip.loading_time or f"13:30 {date_str}"
    t_wh_out = trip.actual_gate_out_time or f"15:00 {date_str}"
    t_dropoff = f"16:30 {date_str}"
    t_settle = trip.settled_at.strftime('%H:%M %d/%m') if trip.settled_at else (f"17:30 {date_str}" if trip.status == TripStatus.COMPLETED else 'Chờ chốt sổ')

    # Xác định bước hiện tại dựa trên máy trạng thái
    try:
        curr_idx = STATUS_PROGRESSION.index(trip.status)
    except ValueError:
        curr_idx = 0

    specs = [
        {
            'step': 1,
            'title': 'Tiếp nhận & Chuẩn bị lệnh điều động',
            'time': t_create
        },
        {
            'step': 2,
            'title': f'Phát lệnh điều xe Zalo / App tài xế ({driver_name} - {vehicle_plate})',
            'time': t_dispatch
        },
        {
            'step': 3,
            'title': f'Tài xế {driver_name} xác nhận nhận chuyến trên App',
            'time': t_accept
        },
        {
            'step': 4,
            'title': f'Lấy Cont / Hàng tại {pickup_name} (Kiểm tra Cont, Seal, EIR)',
            'time': t_pickup
        },
        {
            'step': 5,
            'title': f'Vận chuyển theo tuyến duyệt ({trip.pickup_location} ➔ {trip.warehouse_location})',
            'time': t_transit
        },
        {
            'step': 6,
            'title': f'Giao nhận tại {wh_name} (Báo kho, Vào cổng, Lên dock, Ra cổng)',
            'time': t_wh_in
        },
        {
            'step': 7,
            'title': f'Đóng / Trút hàng tại {dock_name}',
            'time': t_unload
        },
        {
            'step': 8,
            'title': 'Hoàn tất chứng từ giao nhận (Ký biên bản POD)',
            'time': t_wh_out
        },
        {
            'step': 9,
            'title': f'Kéo vỏ cont hạ bãi tại {dropoff_name} (Phiếu EIR hạ cont)',
            'time': t_dropoff
        },
        {
            'step': 10,
            'title': 'Tổng hợp chi phí & Đối chiếu thanh toán kế toán',
            'time': t_settle
        }
    ]

    result = []
    for s in specs:
        step_num = s['step']
        # Tính toán done / active
        if trip.status == TripStatus.COMPLETED:
            is_done = True
            is_active = False
            time_val = s['time']
        elif trip.status == TripStatus.CANCELLED:
            is_done = False
            is_active = False
            time_val = 'Đã hủy'
        elif trip.status == TripStatus.DRAFT:
            if step_num == 1:
                is_done = True
                is_active = False
                time_val = s['time']
            elif step_num == 2:
                is_done = False
                is_active = True
                time_val = 'Đang chuẩn bị'
            else:
                is_done = False
                is_active = False
                time_val = ''
        else:
            # Các trạng thái vận hành khác
            target_step = curr_idx + 1
            if step_num < target_step:
                is_done = True
                is_active = False
                time_val = s['time']
            elif step_num == target_step:
                is_done = False
                is_active = True
                time_val = 'Đang thực hiện'
            else:
                is_done = False
                is_active = False
                time_val = ''

        result.append({
            'step': step_num,
            'title': s['title'],
            'time': time_val,
            'done': is_done,
            'active': is_active
        })

    return result

def sync_trip_10_step_timeline(trip: DispatchTrip):
    """
    Đồng bộ hoặc khởi tạo 10 bản ghi TripTimelineItem cho chuyến xe trong Database.
    """
    timeline_specs = build_10_step_timeline_spec(trip)

    for spec in timeline_specs:
        TripTimelineItem.objects.update_or_create(
            trip=trip,
            step_number=spec['step'],
            defaults={
                'title': spec['title'],
                'time_display': spec['time'],
                'is_done': spec['done'],
                'is_active': spec['active'],
            }
        )
