"""Chứng từ chuyến xe (EIR, POD, ảnh hiện trường)."""
from ._common import *  # noqa: F401,F403

class TripAddDocumentAPIView(APIView):
    """API mô phỏng tài xế chụp ảnh trả chứng từ hoàn thành (EIR, POD)."""
    permission_classes = [IsTripDriverOrDispatcher]

    def post(self, request, trip_code):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, trip)

        # Tiêu chuẩn 7 & 8: Kiểm định file upload an toàn (Magic Bytes, Size <= 5MB)
        uploaded_files = request.FILES.getlist('documents') or request.FILES.getlist('files') or request.FILES.getlist('document') or request.FILES.getlist('file')
        if not uploaded_files:
            single = request.FILES.get('file') or request.FILES.get('document') or request.FILES.get('photo')
            if single:
                uploaded_files = [single]

        doc_name = request.data.get('doc_type', 'Phiếu EIR Hạ Cont')
        cont_no = request.data.get('container_no', trip.container_number)
        seal_no = request.data.get('seal_no', trip.seal_number)

        doc_map = {
            'Phiếu EIR Hạ Cont': DocumentType.EIR_DROPOFF,
            'EIR_DROPOFF': DocumentType.EIR_DROPOFF,
            'Biên bản giao nhận hàng': DocumentType.POD,
            'Biên bản giao nhận hàng (POD)': DocumentType.POD,
            'Biên bản giao nhận có chữ ký (POD)': DocumentType.POD,
            'POD': DocumentType.POD,
            'Ảnh giám định vỏ Cont': DocumentType.CONTAINER_CHECK,
            'CONTAINER_CHECK': DocumentType.CONTAINER_CHECK,
            'Ảnh Niêm Phong Chì (Seal)': DocumentType.SEAL_IMAGE,
            'SEAL_IMAGE': DocumentType.SEAL_IMAGE,
            'Ảnh Hiện Trường Sự Cố': DocumentType.INCIDENT_PHOTO,
            'INCIDENT_PHOTO': DocumentType.INCIDENT_PHOTO,
            'Phiếu EIR Lấy Cont': DocumentType.EIR_PICKUP,
            'EIR_PICKUP': DocumentType.EIR_PICKUP,
            'Phiếu cân xe': DocumentType.WEIGHT_TICKET,
            'WEIGHT_TICKET': DocumentType.WEIGHT_TICKET,
            'Hóa đơn GTGT': DocumentType.INVOICE,
            'INVOICE': DocumentType.INVOICE,
        }
        doc_type = doc_map.get(doc_name, DocumentType.EIR_DROPOFF)

        created_docs = []
        import uuid
        from django.core.files.storage import default_storage
        from core.validators import validate_uploaded_document, sanitize_filename, optimize_and_resize_image
        for idx, ufile in enumerate(uploaded_files):
            try:
                validate_uploaded_document(ufile)
                optimized_ufile = optimize_and_resize_image(ufile)
                saved_name = default_storage.save(f"documents/{trip.trip_code}_{uuid.uuid4().hex[:12]}_{sanitize_filename(optimized_ufile.name)}", optimized_ufile)
                file_path_str = f"/media/{saved_name}"
                title_str = doc_name if len(uploaded_files) == 1 else f"{doc_name} (#{idx+1})"
                doc = TripDocument.objects.create(
                    trip=trip,
                    document_type=doc_type,
                    title=title_str,
                    file_path=file_path_str,
                    extracted_container_no=cont_no,
                    extracted_seal_no=seal_no,
                    ocr_raw_text=f"AI Nhận diện: {doc_name} - Cont: {cont_no} - Seal: {seal_no}",
                    is_verified=True
                )
                created_docs.append(doc)
            except DjangoValidationError as ve:
                return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)

        if not created_docs and not uploaded_files:
            # Cho phép tạo doc không kèm file (ví dụ chữ ký E-POD hoặc metadata)
            doc = TripDocument.objects.create(
                trip=trip,
                document_type=doc_type,
                title=doc_name,
                file_path='',
                extracted_container_no=cont_no,
                extracted_seal_no=seal_no,
                ocr_raw_text=f"AI Nhận diện: {doc_name} - Cont: {cont_no} - Seal: {seal_no}",
                is_verified=True
            )
            created_docs.append(doc)

        # Xử lý nghiệp vụ đặc thù theo loại chứng từ
        now_str = timezone.now().strftime('%H:%M %d/%m')
        if doc_type == DocumentType.CONTAINER_CHECK:
            cond = request.data.get('container_condition', '').strip()
            notes = request.data.get('notes', '').strip()
            if cond == 'DAMAGED':
                trip.container_condition = 'DAMAGED'
                trip.damage_description = notes or 'Có hư hỏng ghi nhận lúc nhận vỏ tại cảng/bãi'
            elif cond == 'GOOD':
                trip.container_condition = 'GOOD'
                trip.damage_description = notes or ''
            else:
                if any(k in notes.lower() for k in ['bị rách', 'bị thủng', 'bị móp', 'hư hỏng', 'mục sàn']):
                    trip.container_condition = 'DAMAGED'
                    trip.damage_description = notes
                else:
                    trip.container_condition = 'GOOD'
            trip.save(update_fields=['container_condition', 'damage_description'])

            TripTimelineItem.objects.create(
                trip=trip,
                step_number=trip.timeline_items.count() + 1,
                title=f"Giám định vỏ cont lúc nhận: {trip.get_container_condition_display()}" + (f" ({notes})" if notes else ""),
                time_display=now_str,
                is_done=True,
                is_active=False
            )
        elif doc_type == DocumentType.SEAL_IMAGE:
            if seal_no:
                trip.seal_number = seal_no
                trip.save(update_fields=['seal_number'])
            TripTimelineItem.objects.create(
                trip=trip,
                step_number=trip.timeline_items.count() + 1,
                title=f"Đã chụp ảnh bấm chì niêm phong (Seal: {seal_no or trip.seal_number})",
                time_display=now_str,
                is_done=True,
                is_active=False
            )

        # Cập nhật chuyến sang trạng thái tương ứng qua State Machine & ghi TrackingEventLog (Tiêu chuẩn 20)
        actor = (getattr(request.user, 'employee', None) if request.user and request.user.is_authenticated else None) or trip.driver
        if doc_type == DocumentType.POD:
            if trip.status in [TripStatus.AT_WAREHOUSE, TripStatus.UNLOADING, TripStatus.IN_TRANSIT]:
                try:
                    transition_trip(trip, TripStatus.DELIVERED, actor=actor, description=f"Nghiệm thu chứng từ {doc_name}")
                except Exception:
                    trip.status = TripStatus.DELIVERED
                    trip.save(update_fields=['status'])
                    from core.models import TrackingEventLog
                    TrackingEventLog.objects.create(
                        trip=trip,
                        actor=actor,
                        event_type='DELIVERED',
                        title='Giao nhận thành công (Có POD)',
                        description=f"Chứng từ: {doc_name}"
                    )
        elif doc_type == DocumentType.EIR_DROPOFF:
            if trip.status != TripStatus.COMPLETED:
                try:
                    transition_trip(trip, TripStatus.COMPLETED, actor=actor, description=f"Nghiệm thu chứng từ {doc_name}")
                except Exception:
                    trip.status = TripStatus.COMPLETED
                    trip.actual_end_time = timezone.now()
                    trip.save(update_fields=['status', 'actual_end_time'])
                    from core.models import TrackingEventLog
                    TrackingEventLog.objects.create(
                        trip=trip,
                        actor=actor,
                        event_type='COMPLETED',
                        title='Hoàn tất chuyến xe kèm chứng từ hạ cont',
                        description=f"Chứng từ: {doc_name}"
                    )

            # Thêm mốc timeline hoàn tất nếu chưa có
            TripTimelineItem.objects.create(
                trip=trip,
                step_number=trip.timeline_items.count() + 1,
                title='Tài xế đã hoàn tất chứng từ & nghiệm thu',
                time_display=timezone.now().strftime('%H:%M %d/%m'),
                is_done=True,
                is_active=False
            )

        return Response({
            'success': True,
            'message': 'Đã gửi và nghiệm thu chứng từ số an toàn thành công!',
            'doc_id': doc.id
        })

class TripDocumentDetailAPIView(APIView):
    """API Cho phép Tài xế và Điều độ Hiệu chỉnh hoặc Xóa (Soft-delete) chứng từ đã nộp nhầm."""
    permission_classes = [IsTripDriverOrDispatcher]

    def put(self, request, trip_code, doc_id):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, trip)

        doc = trip.documents.filter(id=doc_id, is_deleted=False).first()
        if not doc:
            return Response({'error': 'Không tìm thấy chứng từ'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'title' in data and data['title']:
            doc.title = str(data['title']).strip()
        if 'container_no' in data or 'extracted_container_no' in data:
            val = str(data.get('container_no') if 'container_no' in data else data.get('extracted_container_no', '')).strip().upper()
            doc.extracted_container_no = val
            if val and not trip.container_number:
                trip.container_number = val
                trip.save(update_fields=['container_number'])
        if 'seal_no' in data or 'extracted_seal_no' in data:
            val = str(data.get('seal_no') if 'seal_no' in data else data.get('extracted_seal_no', '')).strip().upper()
            doc.extracted_seal_no = val
            if val and not trip.seal_number:
                trip.seal_number = val
                trip.save(update_fields=['seal_number'])
        if 'notes' in data or 'ocr_raw_text' in data:
            doc.ocr_raw_text = str(data.get('notes') if 'notes' in data else data.get('ocr_raw_text', '')).strip()

        doc.save()
        return Response({
            'success': True,
            'message': f'Đã cập nhật chứng từ "{doc.title}" thành công!',
            'doc_id': doc.id,
            'title': doc.title,
            'container_no': doc.extracted_container_no,
            'seal_no': doc.extracted_seal_no
        })

    def delete(self, request, trip_code, doc_id):
        trip = get_trip_by_code_or_hash(trip_code)
        if not trip:
            return Response({'error': 'Không tìm thấy chuyến xe'}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, trip)

        doc = trip.documents.filter(id=doc_id, is_deleted=False).first()
        if not doc:
            return Response({'error': 'Không tìm thấy chứng từ'}, status=status.HTTP_404_NOT_FOUND)

        doc_title = doc.title
        doc.delete()  # Soft delete
        return Response({
            'success': True,
            'message': f'Đã xóa chứng từ "{doc_title}" thành công!'
        })
