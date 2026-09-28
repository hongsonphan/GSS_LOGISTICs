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

def build_customer_milestones(trip: DispatchTrip):
    """
    Xây dựng tiến độ giao nhận lô hàng dành riêng cho Khách Hàng (Customer Tracking Portal).
    Chuẩn hoá 6 mốc B2B rõ ràng, giúp khách hàng an tâm theo dõi hành trình hàng hóa:
      1. Tiếp nhận đơn
      2. Đã điều xe
      3. Đã nhận hàng / Đã đến kho hàng (tùy tình huống Giao hay Nhận: Import, Export, Domestic)
      4. Đang vận chuyển / Đã nhận hàng
      5. Đã đến kho hàng / Đang vận chuyển
      6. Đã giao thành công (Ký nhận POD)
    Tuyệt đối không để lộ tác nghiệp nội bộ (hạ vỏ rỗng, hãng tàu, chi phí, lệnh điều xe, đối soát).
    """
    from apps.documents.models import DocumentType
    from apps.dispatch.models import ShipmentType

    wh_name = trip.delivery_warehouse or trip.warehouse_location or 'Kho khách hàng'
    pickup_name = trip.pickup_location or 'Điểm lấy hàng'
    vehicle_plate = trip.vehicle.license_plate if trip.vehicle else ''
    cont_no = trip.container_number or 'Container'

    date_str = trip.loading_date.strftime('%d/%m') if trip.loading_date else (trip.created_at.strftime('%d/%m') if trip.created_at else '')
    t_create = trip.created_at.strftime('%H:%M %d/%m') if trip.created_at else f"08:00 {date_str}"
    t_gate_in = trip.actual_gate_in_at.strftime('%H:%M %d/%m') if trip.actual_gate_in_at else (trip.actual_gate_in_time or '')
    t_gate_out = trip.actual_gate_out_at.strftime('%H:%M %d/%m') if trip.actual_gate_out_at else (trip.actual_gate_out_time or '')

    # Lấy map thời gian từ các mốc timeline nếu có
    t_map = {item.step_number: item.time_display for item in trip.timeline_items.all()}

    # Kiểm tra chứng từ POD
    has_pod = trip.documents.filter(is_deleted=False, document_type=DocumentType.POD).exists()
    pod_doc = trip.documents.filter(is_deleted=False, document_type=DocumentType.POD).order_by('-created_at').first()
    t_pod = pod_doc.created_at.strftime('%H:%M %d/%m') if (pod_doc and pod_doc.created_at) else t_gate_out

    # TH1: HÀNG XUẤT (EXPORT) - Xe cấp cont rỗng đến kho khách đóng hàng rồi chở hạ cảng/bãi
    if trip.shipment_type == ShipmentType.EXPORT:
        m1_done = True
        m1_active = False
        m1_time = t_create

        m2_done = (trip.status != TripStatus.DRAFT) and bool(trip.vehicle)
        m2_active = (trip.status == TripStatus.DRAFT)
        m2_time = t_map.get(2) or t_create

        m3_done = trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m3_active = trip.status in [TripStatus.DISPATCHED, TripStatus.ACCEPTED, TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT]
        m3_time = t_gate_in or t_map.get(6) or ''

        m4_done = trip.status in [TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m4_active = trip.status == TripStatus.UNLOADING
        m4_time = t_map.get(7) or t_gate_out or ''

        m5_done = trip.status in [TripStatus.DELIVERED, TripStatus.COMPLETED]
        m5_active = trip.status == TripStatus.RETURNING_EMPTY
        m5_time = t_map.get(9) or ''

        m6_done = (trip.status in [TripStatus.DELIVERED, TripStatus.COMPLETED]) or has_pod
        m6_active = (trip.status == TripStatus.RETURNING_EMPTY) and not m6_done
        m6_time = trip.actual_dropoff_time or t_map.get(9) or t_pod or ''

        milestones = [
            {
                'step': 1,
                'title': 'Tiếp nhận đơn',
                'desc': 'Đơn hàng đóng hàng xuất khẩu đã được tiếp nhận và xác nhận trên hệ thống',
                'is_done': m1_done,
                'is_active': m1_active,
                'time': m1_time
            },
            {
                'step': 2,
                'title': 'Đã điều xe',
                'desc': f"Đã phân công xe {vehicle_plate} cấp cont rỗng về kho đóng hàng" if vehicle_plate else "Đang sắp xếp phương tiện và tài xế",
                'is_done': m2_done,
                'is_active': m2_active,
                'time': m2_time
            },
            {
                'step': 3,
                'title': 'Đã đến kho hàng',
                'desc': f"Xe đã có mặt tại {wh_name} để chuẩn bị đóng hàng",
                'is_done': m3_done,
                'is_active': m3_active,
                'time': m3_time
            },
            {
                'step': 4,
                'title': 'Đã nhận hàng',
                'desc': f"Đã hoàn tất đóng hàng vào cont {cont_no}, kiểm tra kẹp chì seal xuất khẩu an toàn",
                'is_done': m4_done,
                'is_active': m4_active,
                'time': m4_time
            },
            {
                'step': 5,
                'title': 'Đang vận chuyển',
                'desc': "Phương tiện đang vận chuyển cont hàng xuất khẩu ra cảng/ICD",
                'is_done': m5_done,
                'is_active': m5_active,
                'time': m5_time
            },
            {
                'step': 6,
                'title': 'Đã giao thành công',
                'desc': "Đã hạ cont an toàn vào cảng/bãi xuất và hoàn tất chứng từ giao nhận",
                'is_done': m6_done,
                'is_active': m6_active,
                'time': m6_time
            }
        ]

    # TH2: HÀNG NỘI ĐỊA / CHUYỂN KHO (DOMESTIC)
    elif trip.shipment_type == ShipmentType.DOMESTIC:
        m1_done = True
        m1_active = False
        m1_time = t_create

        m2_done = (trip.status != TripStatus.DRAFT) and bool(trip.vehicle)
        m2_active = (trip.status == TripStatus.DRAFT)
        m2_time = t_map.get(2) or t_create

        m3_done = trip.status in [TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m3_active = trip.status in [TripStatus.DISPATCHED, TripStatus.ACCEPTED]
        m3_time = t_map.get(4) or ''

        m4_done = trip.status in [TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m4_active = trip.status == TripStatus.CONTAINER_PICKED
        m4_time = t_map.get(4) or ''

        m5_done = trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m5_active = trip.status in [TripStatus.IN_TRANSIT, TripStatus.CONTAINER_PICKED]
        m5_time = t_map.get(5) or ''

        m6_done = (trip.status in [TripStatus.DELIVERED, TripStatus.COMPLETED]) or has_pod
        m6_active = (trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING]) and not m6_done
        m6_time = t_gate_out or t_map.get(8) or t_pod or ''

        milestones = [
            {
                'step': 1,
                'title': 'Tiếp nhận đơn',
                'desc': 'Đơn hàng vận chuyển nội địa đã được xác nhận tiếp nhận trên hệ thống',
                'is_done': m1_done,
                'is_active': m1_active,
                'time': m1_time
            },
            {
                'step': 2,
                'title': 'Đã điều xe',
                'desc': f"Đã phân công xe {vehicle_plate} tiếp nhận vận chuyển" if vehicle_plate else "Đang bố trí phương tiện và tài xế",
                'is_done': m2_done,
                'is_active': m2_active,
                'time': m2_time
            },
            {
                'step': 3,
                'title': 'Đã đến kho hàng',
                'desc': f"Xe đã có mặt tại điểm nhận hàng: {pickup_name}",
                'is_done': m3_done,
                'is_active': m3_active,
                'time': m3_time
            },
            {
                'step': 4,
                'title': 'Đã nhận hàng',
                'desc': "Hoàn tất bốc xếp và kiểm đếm hàng hóa lên phương tiện an toàn",
                'is_done': m4_done,
                'is_active': m4_active,
                'time': m4_time
            },
            {
                'step': 5,
                'title': 'Đang vận chuyển',
                'desc': f"Phương tiện đang lưu thông trên tuyến đường giao tới {wh_name}",
                'is_done': m5_done,
                'is_active': m5_active,
                'time': m5_time
            },
            {
                'step': 6,
                'title': 'Đã giao thành công',
                'desc': f"Đã giao hàng an toàn tại {wh_name} và ký biên bản giao nhận POD",
                'is_done': m6_done,
                'is_active': m6_active,
                'time': m6_time
            }
        ]

    # TH3: HÀNG NHẬP (IMPORT) - Khách hàng nhận hàng từ Cảng/ICD về Kho
    else:
        m1_done = True
        m1_active = False
        m1_time = t_create

        m2_done = (trip.status != TripStatus.DRAFT) and bool(trip.vehicle)
        m2_active = (trip.status == TripStatus.DRAFT)
        m2_time = t_map.get(2) or t_create

        m3_done = trip.status in [TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m3_active = trip.status in [TripStatus.DISPATCHED, TripStatus.ACCEPTED]
        m3_time = t_map.get(4) or ''

        m4_done = trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m4_active = trip.status in [TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT]
        m4_time = t_map.get(5) or ''

        m5_done = trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m5_active = trip.status == TripStatus.IN_TRANSIT
        m5_time = t_gate_in or t_map.get(6) or ''

        m6_done = (trip.status in [TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]) or has_pod
        m6_active = (trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING]) and not m6_done
        m6_time = t_gate_out or t_map.get(8) or t_pod or ''

        milestones = [
            {
                'step': 1,
                'title': 'Tiếp nhận đơn',
                'desc': 'Đơn hàng vận chuyển đã được tiếp nhận và xác nhận trên hệ thống BIM Logistics',
                'is_done': m1_done,
                'is_active': m1_active,
                'time': m1_time
            },
            {
                'step': 2,
                'title': 'Đã điều xe',
                'desc': f"Đã phân công xe {vehicle_plate} tiếp nhận vận chuyển lô hàng" if vehicle_plate else "Đang bố trí phương tiện và tài xế",
                'is_done': m2_done,
                'is_active': m2_active,
                'time': m2_time
            },
            {
                'step': 3,
                'title': 'Đã nhận hàng',
                'desc': f"Đã nhận container {cont_no} tại điểm xuất phát, kiểm tra nguyên seal kẹp chì",
                'is_done': m3_done,
                'is_active': m3_active,
                'time': m3_time
            },
            {
                'step': 4,
                'title': 'Đang vận chuyển',
                'desc': f"Phương tiện đang lưu thông trên tuyến hành trình về {wh_name}",
                'is_done': m4_done,
                'is_active': m4_active,
                'time': m4_time
            },
            {
                'step': 5,
                'title': 'Đã đến kho hàng',
                'desc': f"Xe đã cập bến an toàn tại kho giao hàng: {wh_name}",
                'is_done': m5_done,
                'is_active': m5_active,
                'time': m5_time
            },
            {
                'step': 6,
                'title': 'Đã giao thành công',
                'desc': "Đã hoàn tất dỡ hàng và bàn giao chứng từ có chữ ký xác nhận của thủ kho",
                'is_done': m6_done,
                'is_active': m6_active,
                'time': m6_time
            }
        ]

    # Khi chuyến xe đã hoàn tất (COMPLETED), đảm bảo 100% mốc đều là done và không active
    if trip.status == TripStatus.COMPLETED:
        for m in milestones:
            m['is_done'] = True
            m['is_active'] = False
            if not m['time']:
                m['time'] = t_create

    return milestones
