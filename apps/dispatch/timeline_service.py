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

def format_vietnam_time(dt, fmt='%H:%M %d/%m'):
    """Chuyển đổi datetime sang chuẩn Giờ Địa Phương Việt Nam (Asia/Ho_Chi_Minh - UTC+7)."""
    if not dt:
        return ''
    if hasattr(dt, 'tzinfo') and dt.tzinfo:
        return timezone.localtime(dt).strftime(fmt)
    return dt.strftime(fmt)


def build_10_step_timeline_spec(trip: DispatchTrip):
    """
    Xây dựng đặc tả chi tiết 10 bước điều vận thực tế theo dữ liệu cụ thể của chuyến xe.
    Đảm bảo tính nhất quán thời gian (Chronological Coherence), ánh xạ chính xác chứng từ và nhân sự xử lý.
    """
    from apps.documents.models import DocumentType

    pickup_name = trip.pickup_depot or trip.pickup_location or 'Bãi lấy cont'
    dropoff_name = trip.dropoff_depot or trip.dropoff_location or 'Bãi hạ cont'
    wh_name = trip.delivery_warehouse or trip.warehouse_location or 'Kho khách hàng'
    driver_name = trip.driver.nickname or trip.driver.full_name if trip.driver else 'Tài xế'
    vehicle_plate = trip.vehicle.license_plate if trip.vehicle else 'Xe công ty'
    dock_name = trip.warehouse_dock or 'dock kho'

    # Ánh xạ toàn bộ tài liệu đính kèm thực tế của chuyến xe
    docs_by_type = {}
    if trip.pk:
        for doc in trip.documents.filter(is_deleted=False).order_by('created_at'):
            if doc.file_path:
                url = doc.file_path if (doc.file_path.startswith('/media/') or doc.file_path.startswith('http')) else f"/media/{doc.file_path}"
                docs_by_type[doc.document_type] = {
                    'url': url,
                    'title': doc.title or doc.get_document_type_display(),
                    'created_at': doc.created_at
                }

    booking_url = trip.booking_file.url if trip.booking_file else (docs_by_type.get(DocumentType.BOOKING_NOTE, {}).get('url', ''))
    eir_pickup_url = docs_by_type.get(DocumentType.EIR_PICKUP, {}).get('url', '')
    seal_url = docs_by_type.get(DocumentType.SEAL_IMAGE, {}).get('url', '') or docs_by_type.get(DocumentType.CONTAINER_CHECK, {}).get('url', '')
    weight_url = docs_by_type.get(DocumentType.WEIGHT_TICKET, {}).get('url', '')
    pod_url = docs_by_type.get(DocumentType.POD, {}).get('url', '')
    eir_dropoff_url = docs_by_type.get(DocumentType.EIR_DROPOFF, {}).get('url', '')
    invoice_url = docs_by_type.get(DocumentType.INVOICE, {}).get('url', '')

    # Chuẩn hoá ngày giờ cơ sở theo múi giờ Việt Nam
    created_dt = trip.created_at or timezone.now()
    date_str = trip.loading_date.strftime('%d/%m') if trip.loading_date else format_vietnam_time(created_dt, '%d/%m')
    t_create = format_vietnam_time(created_dt)

    # Xử lý thời gian hợp lý theo chuỗi tiến trình thực tế của Tài xế / Điều vận
    if trip.actual_start_time:
        start_dt = trip.actual_start_time
        t_pickup = format_vietnam_time(start_dt)
        
        # Giờ phát lệnh phải trước hoặc cùng lúc xuất phát
        if trip.dispatched_at:
            t_dispatch = format_vietnam_time(trip.dispatched_at)
        else:
            disp_dt = created_dt if created_dt < start_dt else (start_dt - timedelta(hours=1))
            t_dispatch = format_vietnam_time(disp_dt)

        # Giờ tài xế xác nhận nhận chuyến
        if trip.accepted_at:
            t_accept = format_vietnam_time(trip.accepted_at)
        else:
            acc_dt = min(start_dt, created_dt + timedelta(minutes=15))
            t_accept = format_vietnam_time(acc_dt)
    else:
        # Chưa xuất phát
        t_dispatch = format_vietnam_time(trip.dispatched_at) if trip.dispatched_at else (
            t_create if trip.status != TripStatus.DRAFT else 'Chờ phát lệnh'
        )
        t_accept = format_vietnam_time(trip.accepted_at) if trip.accepted_at else (
            format_vietnam_time(created_dt + timedelta(minutes=15)) if trip.status not in [TripStatus.DRAFT, TripStatus.DISPATCHED] else 'Chờ tài xế nhận'
        )
        t_pickup = f"Hẹn: {trip.loading_time or '08:00'} {date_str}"

    # Bước 5: Đến cổng kho
    if trip.actual_gate_in_time and trip.actual_gate_in_time != '-':
        t_wh_in = trip.actual_gate_in_time
    elif trip.actual_gate_in_at:
        t_wh_in = format_vietnam_time(trip.actual_gate_in_at)
    else:
        t_wh_in = f"ETA: {trip.eta_warehouse_time}" if (trip.eta_warehouse_time and trip.eta_warehouse_time != '-') else f"Hẹn: {trip.loading_time or '09:30'}"

    # Bước 6: Bắt đầu Đóng / Trả hàng tại kho
    if trip.unloading_started_at:
        t_unload = format_vietnam_time(trip.unloading_started_at)
    elif trip.warehouse_call_in_time and trip.warehouse_call_in_time != '-':
        t_unload = trip.warehouse_call_in_time
    else:
        t_unload = f"Hẹn: {trip.loading_time}" if trip.loading_time else f"Hẹn: {date_str}"

    # Bước 7: Đóng hàng / Xuống hàng xong
    if trip.warehouse_call_out_time and trip.warehouse_call_out_time != '-':
        t_finish_unload = trip.warehouse_call_out_time
    elif trip.unloading_started_at:
        t_finish_unload = format_vietnam_time(trip.unloading_started_at + timedelta(minutes=45))
    else:
        t_finish_unload = f"Hẹn: {trip.loading_time}" if trip.loading_time else f"Hẹn: {date_str}"

    # Bước 8: Hoàn tất chứng từ giao nhận (Ký POD)
    if trip.actual_gate_out_time and trip.actual_gate_out_time != '-':
        t_wh_out = trip.actual_gate_out_time
    elif trip.actual_gate_out_at:
        t_wh_out = format_vietnam_time(trip.actual_gate_out_at)
    elif docs_by_type.get(DocumentType.POD):
        t_wh_out = format_vietnam_time(docs_by_type[DocumentType.POD]['created_at'])
    else:
        t_wh_out = f"Sau đóng hàng"

    # Bước 9: Vận chuyển về bãi hạ
    if trip.dropoff_appointment_time and trip.dropoff_appointment_time != '-':
        t_dropoff_transit = f"Hẹn: {trip.dropoff_appointment_time}"
    elif trip.actual_gate_out_at:
        t_dropoff_transit = format_vietnam_time(trip.actual_gate_out_at + timedelta(minutes=30))
    else:
        t_dropoff_transit = f"Đang kéo về bãi {date_str}" if trip.status in [TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED] else ""

    # Bước 10: Đã hạ Cont / Phiếu EIR hạ bãi
    if trip.actual_dropoff_time and trip.actual_dropoff_time != '-':
        t_dropoff = trip.actual_dropoff_time
    elif trip.actual_dropoff_at:
        t_dropoff = format_vietnam_time(trip.actual_dropoff_at)
    elif docs_by_type.get(DocumentType.EIR_DROPOFF):
        t_dropoff = format_vietnam_time(docs_by_type[DocumentType.EIR_DROPOFF]['created_at'])
    elif trip.status == TripStatus.COMPLETED:
        t_dropoff = trip.actual_gate_out_time or f"Đã hạ bãi {date_str}"
    else:
        t_dropoff = ""

    # Bước 11: Tổng hợp chi phí & Đối soát
    if trip.settled_at:
        t_settle = format_vietnam_time(trip.settled_at)
    else:
        t_settle = 'Chờ chốt sổ' if trip.status == TripStatus.COMPLETED else ''

    # Xác định nhân sự & bộ phận phụ trách từng bước
    dispatcher_actor = f"{trip.dispatcher.nickname or trip.dispatcher.full_name} - Điều Vận" if trip.dispatcher else "Trần Điều Độ - Điều Vận"
    accountant_actor = f"{trip.settled_by.nickname or trip.settled_by.full_name} - Kế Toán" if trip.settled_by else "Trần Kế Toán - Kế Toán"
    driver_actor = f"{driver_name} - Đội Xe"
    warehouse_actor = f"{driver_name} / Thủ Kho"

    # Xác định bước hiện tại dựa trên máy trạng thái
    try:
        curr_idx = STATUS_PROGRESSION.index(trip.status)
    except ValueError:
        curr_idx = 0

    # Xác định danh sách chứng từ con THỰC TẾ đã đính kèm (Chỉ hiện khi có file/ảnh thật)
    step1_docs = [{'name': 'File Booking / Lệnh cấp cont KH', 'url': booking_url}] if booking_url else []
    step4_docs = []
    if eir_pickup_url:
        step4_docs.append({'name': 'Phiếu EIR nhận cont', 'url': eir_pickup_url})
    if seal_url:
        step4_docs.append({'name': 'Ảnh Số Cont & Kẹp Chì Seal', 'url': seal_url})
    step6_docs = [{'name': 'Packing List / Lệnh giao hàng', 'url': invoice_url}] if invoice_url else []
    step7_docs = []
    if seal_url:
        step7_docs.append({'name': 'Ảnh Kẹp Chì Seal mới', 'url': seal_url})
    if weight_url:
        step7_docs.append({'name': 'Phiếu Cân xe', 'url': weight_url})
    step8_docs = [{'name': 'Biên bản giao nhận POD có chữ ký', 'url': pod_url}] if pod_url else []
    step10_docs = [{'name': 'Phiếu EIR hạ cont', 'url': eir_dropoff_url}] if eir_dropoff_url else []
    step11_docs = [{'name': 'Bảng kê chi phí & Hóa đơn điện tử', 'url': invoice_url}] if invoice_url else []

    specs = [
        {
            'step': 1,
            'title': 'Nhận Booking',
            'time': t_create,
            'docs': step1_docs,
            'actor': 'Thuận - Kinh Doanh'
        },
        {
            'step': 2,
            'title': f'Phát lệnh Điều vận ({driver_name} - {vehicle_plate})',
            'time': t_dispatch,
            'docs': [],
            'actor': dispatcher_actor
        },
        {
            'step': 3,
            'title': f'Tài xế {driver_name} xác nhận nhận chuyến',
            'time': t_accept,
            'docs': [],
            'actor': driver_actor
        },
        {
            'step': 4,
            'title': f'Tài xế xuất phát & Hẹn giờ đến ({pickup_name})',
            'time': t_pickup,
            'docs': step4_docs,
            'actor': driver_actor
        },
        {
            'step': 5,
            'title': f'Đã đến cổng kho {wh_name}',
            'time': t_wh_in,
            'docs': [],
            'actor': warehouse_actor
        },
        {
            'step': 6,
            'title': f'Bắt đầu Đóng / Trả hàng tại kho ({dock_name})',
            'time': t_unload,
            'docs': step6_docs,
            'actor': warehouse_actor
        },
        {
            'step': 7,
            'title': 'Đóng hàng / Xuống hàng xong',
            'time': t_finish_unload,
            'docs': step7_docs,
            'actor': warehouse_actor
        },
        {
            'step': 8,
            'title': 'Đã ký đủ chứng từ Giao / Nhận (POD)',
            'time': t_wh_out,
            'docs': step8_docs,
            'actor': driver_actor
        },
        {
            'step': 9,
            'title': f'Vận chuyển về Bãi hạ Rỗng / Cảng Xuất ({dropoff_name})',
            'time': t_dropoff_transit,
            'docs': [],
            'actor': driver_actor
        },
        {
            'step': 10,
            'title': f'Đã hạ Cont: lấy phiếu EIR hạ bãi ({dropoff_name})',
            'time': t_dropoff,
            'docs': step10_docs,
            'actor': driver_actor
        },
        {
            'step': 11,
            'title': 'Tổng hợp chi phí & Đối soát thanh toán',
            'time': t_settle,
            'docs': step11_docs,
            'actor': accountant_actor
        }
    ]

    # Xác định bước mục tiêu đang diễn ra (target_active_step) theo State Machine 11 bước
    if trip.status == TripStatus.COMPLETED:
        target_active_step = 99  # Tất cả 11 bước đều hoàn thành
    elif trip.status == TripStatus.CANCELLED:
        target_active_step = -1  # Đã hủy, không có bước nào active
    elif trip.status == TripStatus.DRAFT:
        target_active_step = 2   # Bước 1 (Booking) xong, Bước 2 (Lập & Phát lệnh) active
    elif trip.status == TripStatus.DISPATCHED:
        target_active_step = 3   # Bước 2 (Phát lệnh) xong, Bước 3 (Chờ tài xế xác nhận) active
    elif trip.status == TripStatus.ACCEPTED:
        target_active_step = 4   # Bước 3 (Xác nhận) xong, Bước 4 (Xuất phát & Hẹn giờ lấy cont) active
    elif trip.status in [TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT]:
        target_active_step = 5   # Bước 4 (Lấy cont) xong, Bước 5 (Đến cổng kho) active
    elif trip.status == TripStatus.AT_WAREHOUSE:
        target_active_step = 6   # Bước 5 (Cổng kho) xong, Bước 6 (Bắt đầu đóng/trả hàng) active
    elif trip.status == TripStatus.UNLOADING:
        target_active_step = 7   # Bước 6 (Bắt đầu) xong, Bước 7 (Đóng/xuống hàng xong) active
    elif trip.status == TripStatus.DELIVERED:
        if pod_url or (trip.actual_gate_out_time and trip.actual_gate_out_time != '-') or trip.actual_gate_out_at:
            target_active_step = 9   # Đã có POD/rời kho -> Bước 8 xong, Bước 9 (Vận chuyển về bãi) active
        else:
            target_active_step = 8   # Bước 7 xong, Bước 8 (Ký chứng từ POD) active
    elif trip.status == TripStatus.RETURNING_EMPTY:
        has_eir = bool(eir_dropoff_url or (trip.actual_dropoff_time and trip.actual_dropoff_time != '-') or trip.actual_dropoff_at)
        if has_eir:
            target_active_step = 10  # Đang ở bước 10 (Hạ cont & nhận EIR)
        else:
            if trip.dropoff_appointment_time and trip.dropoff_appointment_time != '-':
                target_active_step = 10  # Đã đến bãi hẹn -> Bước 9 xong, Bước 10 (Đang cẩu hạ cont / lấy phiếu) active
            else:
                target_active_step = 9   # Đang trên đường vận chuyển về bãi hạ
    else:
        target_active_step = 1

    result = []
    for s in specs:
        step_num = s['step']
        if trip.status == TripStatus.COMPLETED:
            if step_num == 11:
                # Bước 11 (Tổng hợp chi phí & Đối soát): Chỉ hoàn thành khi Kế Toán đã chốt sổ (settled_at hoặc is_expenses_settled)
                # Khi mới hạ cont xong, trạng thái là "Chờ chốt sổ" và hiển thị xám mờ chứ không phải xanh hoàn thành
                is_settled = bool(trip.settled_at or getattr(trip, 'is_expenses_settled', False))
                is_done = is_settled
                is_active = False
                time_val = s['time'] if is_settled else 'Chờ chốt sổ'
                actor_val = s.get('actor', '—')
            else:
                is_done = True
                is_active = False
                time_val = s['time']
                actor_val = s.get('actor', '—')
        elif trip.status == TripStatus.CANCELLED:
            is_done = False
            is_active = False
            time_val = 'Đã hủy'
            actor_val = '—'
        else:
            if step_num < target_active_step:
                is_done = True
                is_active = False
                time_val = s['time']
                actor_val = s.get('actor', '—')
            elif step_num == target_active_step:
                is_done = False
                is_active = True
                time_val = s['time'] if s['time'] else 'Đang thực hiện'
                actor_val = s.get('actor', '—')
            else:
                is_done = False
                is_active = False
                time_val = ''
                actor_val = '—'

        result.append({
            'step': step_num,
            'title': s['title'],
            'time': time_val,
            'done': is_done,
            'active': is_active,
            'docs': s.get('docs', []) if (is_done or is_active) else [],
            'actor': actor_val
        })

    return result

def sync_trip_10_step_timeline(trip: DispatchTrip):
    """
    Đồng bộ hoặc khởi tạo chính xác 11 bản ghi TripTimelineItem cho chuyến xe trong Database (SOP 11 bước chuẩn).
    Xóa sạch mọi bản ghi thừa (> 11) để bảo toàn kiến trúc 11 bước chuẩn.
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

    # Dọn dẹp bản ghi trùng lặp hoặc mốc log thừa > 11 nếu có
    trip.timeline_items.filter(step_number__gt=11).delete()

# Alias đồng bộ tương thích ngược
sync_trip_timeline = sync_trip_10_step_timeline
build_timeline_spec = build_10_step_timeline_spec

def get_derived_7_milestones(trip: DispatchTrip):
    """
    Tính toán và trích xuất dữ liệu 7 Mốc Thời Gian Vận Chuyển & Hạ Cont (7 Mốc Kho Thực Tế)
    trực tiếp từ Single Source of Truth (Dữ liệu 10 Bước & Nhật ký mốc thời gian TripTimelineItem).
    Tự động cập nhật ngược lại (back-propagate) vào các trường tương ứng trên DispatchTrip nếu đang trống.

    7 Mốc gồm:
      1. Hẹn đến (ETA): Kế hoạch đến
      2. Kho Gọi Vào: Thông báo cửa
      3. Vào Thực Tế: Qua cổng bảo vệ
      4. Kho Gọi Ra: Hoàn tất đóng Cont
      5. Ra Thực Tế: Kéo Cont rời kho
      6. Giờ Hẹn Hạ: Yêu cầu từ Kho/ KH
      7. Giờ Hạ Thực Tế: Cẩu Cont / Phiếu EIR
    """
    items = list(trip.timeline_items.all().order_by('step_number'))

    # Helper tìm time_display theo từ khóa trong title
    def find_time_by_keywords(*keywords):
        for item in items:
            t_lower = item.title.lower()
            if any(k.lower() in t_lower for k in keywords):
                if item.time_display and item.time_display != '-' and not item.time_display.startswith('Đang'):
                    # Bỏ prefix nếu có
                    val = item.time_display
                    for pfx in ['ETA: ', 'Hẹn: ', 'Sau: ']:
                        if val.startswith(pfx):
                            val = val[len(pfx):]
                    return val
        return None

    # 1. Hẹn đến (ETA)
    eta = (
        find_time_by_keywords('sắp đến kho', 'báo sắp đến')
        or (trip.eta_warehouse_time if trip.eta_warehouse_time and trip.eta_warehouse_time != '-' else None)
        or (trip.loading_time if trip.loading_time and trip.loading_time != '-' else None)
        or '-'
    )

    # 2. Kho Gọi Vào
    call_in = (
        find_time_by_keywords('kho gọi vào', 'thông báo cửa', 'gọi xe vào')
        or (trip.warehouse_call_in_time if trip.warehouse_call_in_time and trip.warehouse_call_in_time != '-' else None)
        or '-'
    )

    # 3. Vào Thực Tế (Qua cổng bảo vệ)
    actual_in = (
        find_time_by_keywords('đã đến cổng kho', 'check-in cổng', 'vào cổng kho')
        or (trip.actual_gate_in_time if trip.actual_gate_in_time and trip.actual_gate_in_time != '-' else None)
        or (trip.actual_gate_in_at.strftime('%H:%M %d/%m') if trip.actual_gate_in_at else None)
        or '-'
    )

    # 4. Kho Gọi Ra (Hoàn tất đóng Cont)
    call_out = (
        find_time_by_keywords('kho gọi ra')
        or (trip.warehouse_call_out_time if trip.warehouse_call_out_time and trip.warehouse_call_out_time != '-' else None)
        or find_time_by_keywords('bắt đầu xuống hàng', 'bắt đầu đóng', 'vào dock đóng')
        or '-'
    )

    # 5. Ra Thực Tế (Kéo Cont rời kho)
    actual_out = (
        find_time_by_keywords('kéo cont rời kho', 'đã đóng/trút hàng xong', 'rời kho', 'chuẩn bị hạ bãi', 'vận chuyển về bãi hạ')
        or (trip.actual_gate_out_time if trip.actual_gate_out_time and trip.actual_gate_out_time != '-' else None)
        or (trip.actual_gate_out_at.strftime('%H:%M %d/%m') if trip.actual_gate_out_at else None)
        or '-'
    )

    # 6. Giờ Hẹn Hạ (Yêu cầu từ Kho/ KH)
    dropoff_appoint = (
        find_time_by_keywords('lưu xe chờ hạ', 'chờ hạ sau 0h', 'sau 00:00')
        or (trip.dropoff_appointment_time if trip.dropoff_appointment_time and trip.dropoff_appointment_time != '-' else None)
        or '-'
    )

    # 7. Giờ Hạ Thực Tế (Cẩu Cont / Phiếu EIR)
    actual_dropoff = (
        find_time_by_keywords('cẩu hạ cont', 'hạ bãi thực tế', 'hạ cont thành công', 'hạ bãi rỗng', 'đã hạ cont')
        or (trip.actual_dropoff_time if trip.actual_dropoff_time and trip.actual_dropoff_time != '-' else None)
        or (trip.actual_dropoff_at.strftime('%H:%M %d/%m') if trip.actual_dropoff_at else None)
        or '-'
    )

    # Tự động cập nhật ngược lại vào DispatchTrip nếu các trường chưa có dữ liệu
    updates = []
    if eta != '-' and not trip.eta_warehouse_time:
        trip.eta_warehouse_time = eta
        updates.append('eta_warehouse_time')
    if call_in != '-' and not trip.warehouse_call_in_time:
        trip.warehouse_call_in_time = call_in
        updates.append('warehouse_call_in_time')
    if actual_in != '-' and not trip.actual_gate_in_time:
        trip.actual_gate_in_time = actual_in
        updates.append('actual_gate_in_time')
    if call_out != '-' and not trip.warehouse_call_out_time:
        trip.warehouse_call_out_time = call_out
        updates.append('warehouse_call_out_time')
    if actual_out != '-' and not trip.actual_gate_out_time:
        trip.actual_gate_out_time = actual_out
        updates.append('actual_gate_out_time')
    if dropoff_appoint != '-' and not trip.dropoff_appointment_time:
        trip.dropoff_appointment_time = dropoff_appoint
        updates.append('dropoff_appointment_time')
    if actual_dropoff != '-' and not trip.actual_dropoff_time:
        trip.actual_dropoff_time = actual_dropoff
        updates.append('actual_dropoff_time')

    if updates:
        try:
            trip.save(update_fields=updates)
        except Exception:
            pass

    return {
        'eta_warehouse_time': eta,
        'warehouse_call_in_time': call_in,
        'actual_gate_in_time': actual_in,
        'warehouse_call_out_time': call_out,
        'actual_gate_out_time': actual_out,
        'dropoff_appointment_time': dropoff_appoint,
        'actual_dropoff_time': actual_dropoff,
    }

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
    BẢO MẬT & NHẤT QUÁN STATE MACHINE:
      - Tuyệt đối không để lộ tác nghiệp nội bộ (hạ vỏ rỗng, hãng tàu, chi phí, lệnh điều xe, đối soát).
      - Tuân thủ máy trạng thái nghiêm ngặt: Mốc sau KHÔNG BAO GIỜ hoàn thành khi chuyến xe chưa đạt trạng thái đó.
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
    pod_doc = trip.documents.filter(is_deleted=False, document_type=DocumentType.POD).order_by('-created_at').first()
    t_pod = pod_doc.created_at.strftime('%H:%M %d/%m') if (pod_doc and pod_doc.created_at) else t_gate_out

    # TH1: HÀNG XUẤT (EXPORT) - Xe cấp cont rỗng đến kho khách đóng hàng rồi chở hạ cảng/bãi
    if trip.shipment_type == ShipmentType.EXPORT:
        m1_done = True
        m1_active = False
        m1_time = t_create

        m2_done = (trip.status != TripStatus.DRAFT) and bool(trip.vehicle)
        m2_active = (trip.status == TripStatus.DRAFT)
        m2_time = (t_map.get(2) or t_create) if m2_done else ''

        m3_done = trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m3_active = trip.status in [TripStatus.DISPATCHED, TripStatus.ACCEPTED, TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT]
        m3_time = (t_gate_in or t_map.get(5) or t_map.get(6) or '') if m3_done else ''

        m4_done = trip.status in [TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m4_active = trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING]
        m4_time = (t_map.get(7) or t_gate_out or '') if m4_done else ''

        m5_done = trip.status in [TripStatus.DELIVERED, TripStatus.COMPLETED]
        m5_active = trip.status == TripStatus.RETURNING_EMPTY
        m5_time = (t_map.get(9) or '') if m5_done else ''

        m6_done = trip.status in [TripStatus.DELIVERED, TripStatus.COMPLETED]
        m6_active = (trip.status == TripStatus.RETURNING_EMPTY) and not m6_done
        m6_time = (trip.actual_dropoff_time or t_map.get(9) or t_pod or '') if m6_done else ''

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
        m2_time = (t_map.get(2) or t_create) if m2_done else ''

        m3_done = trip.status in [TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m3_active = trip.status in [TripStatus.DISPATCHED, TripStatus.ACCEPTED]
        m3_time = (t_map.get(3) or t_map.get(4) or '') if m3_done else ''

        m4_done = trip.status in [TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m4_active = trip.status == TripStatus.CONTAINER_PICKED
        m4_time = (t_map.get(4) or '') if m4_done else ''

        m5_done = trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m5_active = trip.status == TripStatus.IN_TRANSIT
        m5_time = (t_gate_in or t_map.get(5) or '') if m5_done else ''

        m6_done = trip.status in [TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m6_active = (trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING]) and not m6_done
        m6_time = (t_gate_out or t_map.get(8) or t_pod or '') if m6_done else ''

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
                'title': 'Đã đến điểm nhận hàng',
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
        m2_time = (t_map.get(2) or t_create) if m2_done else ''

        m3_done = trip.status in [TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT, TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m3_active = trip.status in [TripStatus.DISPATCHED, TripStatus.ACCEPTED]
        m3_time = (t_map.get(4) or (trip.actual_start_time.strftime('%H:%M %d/%m') if trip.actual_start_time else '')) if m3_done else ''

        m4_done = trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m4_active = trip.status in [TripStatus.CONTAINER_PICKED, TripStatus.IN_TRANSIT]
        m4_time = (t_map.get(5) or '') if m4_done else ''

        m5_done = trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m5_active = (trip.status == TripStatus.IN_TRANSIT)
        m5_time = (t_gate_in or t_map.get(5) or t_map.get(6) or '') if m5_done else ''

        m6_done = trip.status in [TripStatus.DELIVERED, TripStatus.RETURNING_EMPTY, TripStatus.COMPLETED]
        m6_active = (trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING]) and not m6_done
        m6_time = (t_gate_out or t_map.get(8) or t_pod or '') if m6_done else ''

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
    elif trip.status == TripStatus.CANCELLED:
        for m in milestones:
            if m['step'] > 1:
                m['is_done'] = False
                m['is_active'] = False
                m['time'] = ''

    # Kiểm tra bảo toàn dữ liệu: Mốc chưa hoàn thành và không active thì tuyệt đối không được có timestamp
    for m in milestones:
        if not m['is_done'] and not m['is_active']:
            m['time'] = ''

    return milestones

