"""Cổng tài xế: báo mốc hành trình, báo sự cố."""
from ._common import *  # noqa: F401,F403

class TripDriverMilestoneAPIView(APIView):
    """API Tài xế cập nhật nhanh mốc thời gian kho (Bước 6 SOP Điều Vận 10 Bước)."""
    permission_classes = [IsTripDriverOrDispatcher]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, trip)

        # ── KHÓA TUYỆT ĐỐI KHI CHUYẾN XE ĐÃ HOÀN TẤT ──
        if trip.status == TripStatus.COMPLETED:
            return Response({
                'error': 'Chuyến xe đã hoàn tất! Toàn bộ mốc thời gian đã được chốt và khóa cố định.'
            }, status=status.HTTP_400_BAD_REQUEST)

        milestone_code = request.data.get('milestone')
        notes = request.data.get('notes', '')
        now_dt = timezone.now()
        local_now = timezone.localtime(now_dt)
        now_str = request.data.get('custom_time', '').strip() or local_now.strftime('%H:%M %d/%m')

        mapping = {
            'APPROACHING_WAREHOUSE': {
                'title': 'Tài xế báo sắp đến kho (trước 30 phút)',
                'status': TripStatus.IN_TRANSIT,
                'msg': 'Đã thông báo sắp đến kho khách hàng (trước 30 phút).'
            },
            'ARRIVED_WAREHOUSE': {
                'title': f'Đã đến cổng kho ({trip.warehouse_location})',
                'status': TripStatus.AT_WAREHOUSE,
                'msg': 'Đã check-in tại cổng kho khách hàng.'
            },
            'START_UNLOADING': {
                'title': 'Bắt đầu xuống hàng / đóng hàng tại kho',
                'status': TripStatus.UNLOADING,
                'msg': 'Bắt đầu quá trình đóng/trút hàng.'
            },
            'FINISHED_UNLOADING': {
                'title': 'Đã đóng/trút hàng xong - Chuẩn bị hạ bãi',
                'status': TripStatus.RETURNING_EMPTY,
                'msg': 'Đã hoàn tất đóng hàng, chuẩn bị vận chuyển cont về bãi hạ.'
            },
            'OVERNIGHT_WAIT': {
                'title': 'Tài xế báo lưu xe chờ hạ sau 0h (Kho yêu cầu)',
                'status': TripStatus.RETURNING_EMPTY,
                'msg': 'Đã ghi nhận xe neo chờ hạ sau 0h theo yêu cầu của kho/khách hàng.'
            },
            'DROPOFF_COMPLETED': {
                'title': f'Đã cẩu hạ cont thành công tại bãi/cảng ({trip.dropoff_location})',
                'status': TripStatus.COMPLETED,
                'msg': 'Đã hoàn tất hạ cont tại cảng/bãi. Kết thúc hành trình.'
            },
            'ACCEPTED_TRIP': {
                'title': 'Tài xế xác nhận nhận chuyến',
                'status': TripStatus.ACCEPTED,
                'msg': 'Tài xế đã xác nhận nhận chuyến trên App.'
            },
            'DEPARTED': {
                'title': 'Tài xế xuất phát đi lấy cont/hàng',
                'status': TripStatus.CONTAINER_PICKED,
                'msg': 'Tài xế đã xuất phát từ bãi lấy cont.'
            },
            'DEPART_TO_DROPOFF': {
                'title': f'Kéo cont rời kho — Vận chuyển về bãi hạ',
                'status': TripStatus.RETURNING_EMPTY,
                'msg': 'Xe đã ra cổng kho, đang kéo về bãi hạ cont.'
            },
            'DECLINED_TRIP': {
                'title': 'Tài xế từ chối chuyến — Cần phân xe lại',
                'status': TripStatus.DISPATCHED,  # revert về DISPATCHED để điều độ phân lại
                'msg': 'Tài xế đã từ chối nhận chuyến. Vui lòng liên hệ điều độ để phân xe lại.'
            },
            'PICKED_UP': {
                'title': 'Tài xế đã nhận cont / đóng hàng xong',
                'status': TripStatus.CONTAINER_PICKED,
                'msg': 'Đã nhận container và niêm phong seal thành công.'
            },
            'IN_TRANSIT': {
                'title': 'Xe đang trên đường vận chuyển',
                'status': TripStatus.IN_TRANSIT,
                'msg': 'Phương tiện đang lưu thông trên tuyến đường.'
            },
            'DELIVERED': {
                'title': f'Đã giao hàng / cẩu hạ cont thành công ({trip.dropoff_location})',
                'status': TripStatus.DELIVERED,
                'msg': 'Đã hoàn tất giao hàng / hạ bãi cont.'
            },
        }

        info = mapping.get(milestone_code)
        if not info:
            return Response({'error': 'Mã mốc thời gian không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

        # ── Lưu timestamp fields TRƯỚC khi gọi transition_trip ──
        # (transition_trip gọi sync_trip_10_step_timeline ngay sau khi đổi status,
        #  nên các field phải được lưu trước để hiển thị giờ thực tế đúng)
        now_dt = timezone.now()
        extra_update_fields = []

        if milestone_code == 'OVERNIGHT_WAIT':
            trip.is_overnight_detention = True
            if not trip.dropoff_appointment_time or trip.dropoff_appointment_time == '-':
                trip.dropoff_appointment_time = 'Sau 00:00'
            extra_update_fields = ['is_overnight_detention', 'dropoff_appointment_time']

        elif milestone_code == 'DROPOFF_COMPLETED':
            trip.actual_dropoff_time = now_str
            trip.actual_dropoff_at = now_dt
            trip.actual_end_time = now_dt
            extra_update_fields = ['actual_dropoff_time', 'actual_dropoff_at', 'actual_end_time']

        elif milestone_code == 'ACCEPTED_TRIP':
            trip.accepted_at = now_dt
            trip.declined_at = None
            trip.decline_reason = ''
            extra_update_fields = ['accepted_at', 'declined_at', 'decline_reason']

        elif milestone_code == 'DEPARTED':
            trip.actual_start_time = now_dt
            extra_update_fields = ['actual_start_time']

        elif milestone_code == 'ARRIVED_WAREHOUSE':
            # Ghi nhận giờ đến cổng thực tế
            trip.actual_gate_in_time = now_str
            trip.actual_gate_in_at = now_dt
            extra_update_fields = ['actual_gate_in_time', 'actual_gate_in_at']

        elif milestone_code == 'START_UNLOADING':
            trip.unloading_started_at = now_dt
            extra_update_fields = ['unloading_started_at']

        elif milestone_code == 'FINISHED_UNLOADING':
            if not trip.actual_gate_out_time:
                trip.actual_gate_out_time = now_str
                trip.actual_gate_out_at = now_dt
                extra_update_fields = ['actual_gate_out_time', 'actual_gate_out_at']

        elif milestone_code == 'DEPART_TO_DROPOFF':
            # "Ra Thực Tế" = lúc xe lăn bánh rời kho hướng về bãi hạ
            trip.actual_gate_out_time = now_str
            trip.actual_gate_out_at = now_dt
            extra_update_fields = ['actual_gate_out_time', 'actual_gate_out_at']

        if extra_update_fields:
            trip.save(update_fields=extra_update_fields)

        # ── Xử lý DECLINED_TRIP đặc biệt: revert status, ghi log, không tạo timeline item ──
        if milestone_code == 'DECLINED_TRIP':
            actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.driver
            trip.declined_at = now_dt
            trip.decline_reason = notes or 'Tài xế từ chối nhận chuyến'
            trip.accepted_at = None
            trip.status = TripStatus.DISPATCHED
            trip.save(update_fields=['declined_at', 'decline_reason', 'accepted_at', 'status'])
            from core.models import TrackingEventLog
            TrackingEventLog.objects.create(
                trip=trip,
                actor=actor,
                event_type=TripStatus.DISPATCHED,
                title=f"Mốc thời gian: {info['title']}",
                description=notes or info['msg']
            )
            return Response({
                'success': True,
                'message': info['msg'],
                'new_status': trip.status,
                'new_status_label': trip.get_status_display(),
                'declined_at': trip.declined_at.isoformat(),
                'decline_reason': trip.decline_reason,
                'time': now_str
            })

        # ── Chuyển trạng thái qua State Machine (gọi sync_trip_10_step_timeline bên trong) ──
        target_status = info['status']
        actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.driver
        if trip.status != target_status:
            try:
                transition_trip(trip, target_status, actor=actor, description=notes or info['title'])
            except ValidationError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as ex:
                return Response({'error': f'Không thể chuyển mốc trạng thái: {str(ex)}'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Không đổi status nhưng đã lưu fields mới → sync timeline thủ công
            try:
                from apps.dispatch.timeline_service import sync_trip_10_step_timeline
                sync_trip_10_step_timeline(trip)
            except Exception as st_err:
                logger.warning(f"[TripDriverMilestone] sync_trip_10_step_timeline warning: {st_err}")
            try:
                from core.models import TrackingEventLog
                TrackingEventLog.objects.create(
                    trip=trip,
                    actor=actor,
                    event_type=target_status,
                    title=f"Mốc thời gian: {info['title']}",
                    description=notes or info['msg']
                )
            except Exception as log_ex:
                logger.warning(f"[TripDriverMilestone] TrackingEventLog creation warning: {log_ex}")

        return Response({
            'success': True,
            'message': info['msg'],
            'new_status': trip.status,
            'new_status_label': trip.get_status_display(),
            'time': now_str
        })


class TripDriverIncidentAPIView(APIView):
    """API Tài xế báo sự cố dọc đường khẩn cấp (Hỏng xe, CSGT, kẹt đường, kho từ chối)."""
    permission_classes = [IsTripDriverOrDispatcher]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, trip)

        incident_type = request.data.get('incident_type', 'OTHER')
        notes = request.data.get('notes', '').strip()
        location_text = request.data.get('location', '').strip()
        now_dt = timezone.now()
        local_now = timezone.localtime(now_dt)
        now_str = local_now.strftime('%H:%M %d/%m')

        type_labels = {
            'VEHICLE_BREAKDOWN': 'Hỏng xe / Nổ lốp / Sự cố kỹ thuật',
            'TRAFFIC_JAM': 'Kẹt đường / Cháy giờ SI / Trễ giờ kho',
            'POLICE_CHECK': 'Kiểm tra tải trọng / CSGT',
            'WAREHOUSE_ISSUE': 'Kho từ chối / Quá tải dock bốc hàng',
            'ACCIDENT': 'Va quẹt / Sự cố giao thông',
            'OTHER': 'Sự cố phát sinh khác'
        }
        label = type_labels.get(incident_type, 'Sự cố phát sinh')

        # Lưu ảnh hiện trường nếu có
        uploaded_file = request.FILES.get('photo') or request.FILES.get('file') or request.FILES.get('document')
        file_path_str = ''
        if uploaded_file:
            try:
                validate_uploaded_document(uploaded_file)
                from django.core.files.storage import default_storage
                saved_name = default_storage.save(f"incidents/{trip.trip_code}_{sanitize_filename(uploaded_file.name)}", uploaded_file)
                file_path_str = f"/media/{saved_name}"
                TripDocument.objects.create(
                    trip=trip,
                    document_type=DocumentType.INCIDENT_PHOTO,
                    title=f"Ảnh sự cố: {label}",
                    file_path=file_path_str,
                    extracted_container_no=trip.container_number,
                    ocr_raw_text=f"Sự cố: {label} - {notes}",
                    is_verified=False
                )
            except DjangoValidationError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

        # Ghi nhận vào TrackingEventLog
        actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.driver
        from core.models import TrackingEventLog

        desc = f"[{label}] {notes}"
        if location_text:
            desc += f" (Vị trí: {location_text})"

        TrackingEventLog.objects.create(
            trip=trip,
            actor=actor,
            event_type='INCIDENT',
            title=f"CẢNH BÁO SỰ CỐ: {label}",
            description=desc,
            metadata={'incident_type': incident_type, 'location': location_text, 'photo_url': file_path_str}
        )

        # Thêm mốc cảnh báo vào Timeline
        TripTimelineItem.objects.create(
            trip=trip,
            step_number=trip.timeline_items.count() + 1,
            title=f"⚠️ CẢNH BÁO: {label}" + (f" - {notes}" if notes else ""),
            time_display=now_str,
            is_done=True,
            is_active=False
        )

        # Cập nhật ghi chú chuyến xe
        warning_line = f"[⚠️ CẢNH BÁO {now_str}]: {label} - {notes}"
        if trip.special_notes:
            trip.special_notes = f"{warning_line}\n{trip.special_notes}"
        else:
            trip.special_notes = warning_line
        trip.save(update_fields=['special_notes'])

        return Response({
            'success': True,
            'message': 'Đã gửi cảnh báo khẩn cấp tới Điều độ viên thành công! Điều độ sẽ liên hệ hỗ trợ bác tài ngay.',
            'incident_type': incident_type,
            'label': label,
            'time': now_str
        })
