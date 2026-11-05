"""Chi tiết & trạng thái booking, xoá tài liệu booking."""
from ._common import *  # noqa: F401,F403

def _parse_optional_date(value):
    """'' / None -> None; 'YYYY-MM-DD' -> date; sai định dạng -> ValueError."""
    import datetime as _dt
    if value in (None, ''):
        return None
    return _dt.date.fromisoformat(str(value).strip())


def describe_dem_det(expiry):
    from apps.customers.dem_det import describe
    from apps.master_data.models import CompanyProfile
    return describe(expiry, CompanyProfile.get_default_company().warn_days)


class BookingOrderDetailAPIView(APIView):
    """API Xem chi tiết, Cập nhật và Xóa mềm Đơn Đặt Hàng / Booking."""
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [IsSalesOrDirector]
    def get(self, request, pk):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        # Lấy danh sách các container / chuyến xe thuộc Booking này (vòng đời Container Cycle)
        trips_in_booking = b.trips.filter(is_deleted=False).select_related(
            'driver', 'vehicle', 'dropoff_driver', 'dropoff_vehicle'
        ).order_by('created_at')
        trips_data = []
        for t in trips_in_booking:
            trips_data.append({
                'id': t.trip_code,
                'trip_code': t.trip_code,
                'container_number': t.container_number or 'Chưa gán cont',
                'container_type': t.container_type,
                'seal_number': t.seal_number or '-',
                'status': t.status,
                'status_label': t.get_status_display(),
                'is_split_trip': t.is_split_trip,
                'cont_location_type': t.cont_location_type or 'NHÀ MÁY',
                'pickup_location': t.pickup_location,
                'warehouse_location': t.warehouse_location,
                'dropoff_location': t.dropoff_location or 'Hạ bãi',
                'driver': (t.driver.nickname or t.driver.full_name) if t.driver else '-',
                'vehicle': t.vehicle.license_plate if t.vehicle else '-',
                'dropoff_driver': (t.dropoff_driver.nickname or t.dropoff_driver.full_name) if t.dropoff_driver else '-',
                'dropoff_vehicle': t.dropoff_vehicle.license_plate if t.dropoff_vehicle else '-',
                'driver_split_ratio': float(t.driver_split_ratio or 50.0),
                'loading_date': t.loading_date.strftime('%d/%m/%Y') if t.loading_date else '',
                'revenue': float(t.cached_revenue or 0),
                'expense': float(t.cached_expense or 0),
                'profit': float(t.cached_profit or 0),
            })

        def get_clean_booking_doc_name(raw_name, booking_code):
            raw_base = os.path.basename(raw_name or '').strip()
            if not raw_base:
                return f"{booking_code}_booking_document"
            code_prefix = f"{booking_code}_"
            if not raw_base.startswith(code_prefix):
                return f"{code_prefix}{raw_base}"
            return raw_base

        docs_data = []
        for d in b.documents.filter(is_deleted=False):
            raw_name = d.file_name or (os.path.basename(d.file.name) if d.file else '')
            clean_name = get_clean_booking_doc_name(raw_name, b.booking_code)
            file_url = d.file.url if d.file else ''
            f_size = d.file_size or (d.file.size if d.file else 0)
            size_fmt = f"{round(f_size / 1024, 1)} KB" if f_size < 1024*1024 else f"{round(f_size / (1024*1024), 2)} MB"
            docs_data.append({
                'id': d.id,
                'name': clean_name,
                'file_name': clean_name,
                'url': file_url,
                'file_url': file_url,
                'size': f_size,
                'file_size': f_size,
                'size_formatted': size_fmt,
                'file_size_formatted': size_fmt,
                'created_at': d.created_at.strftime('%H:%M %d/%m/%Y')
            })

        if b.booking_file and not docs_data:
            raw_name = os.path.basename(b.booking_file.name)
            clean_name = get_clean_booking_doc_name(raw_name, b.booking_code)
            try:
                f_size = b.booking_file.size
            except Exception:
                f_size = 0
            size_fmt = f"{round(f_size / 1024, 1)} KB" if f_size < 1024*1024 else f"{round(f_size / (1024*1024), 2)} MB"
            docs_data.append({
                'id': 0,
                'name': clean_name,
                'file_name': clean_name,
                'url': b.booking_file.url,
                'file_url': b.booking_file.url,
                'size': f_size,
                'file_size': f_size,
                'size_formatted': size_fmt,
                'file_size_formatted': size_fmt,
                'created_at': b.created_at.strftime('%H:%M %d/%m/%Y')
            })

        return Response({
            'id': b.id,
            'booking_code': b.booking_code,
            'customer_id': b.customer.id,
            'customer_name': b.customer.name,
            'booking_type': b.booking_type,
            'booking_type_display': b.get_booking_type_display(),
            'booking_number': b.booking_number,
            'shipping_line': b.shipping_line,
            'vessel_voyage': b.vessel_voyage,
            'destination_port': b.destination_port,
            'container_size': b.container_size,
            'total_containers': b.total_containers,
            'dispatched_containers': b.dispatched_containers,
            'commodity': b.commodity,
            'hs_code': b.hs_code,
            'pickup_location': b.pickup_location,
            'delivery_location': b.delivery_location,
            'dropoff_location': b.dropoff_location,
            'si_cutoff': b.si_cutoff,
            'vgm_cutoff': b.vgm_cutoff,
            'closing_time': b.closing_time,
            'loading_date': b.loading_date.strftime('%Y-%m-%d') if b.loading_date else '',
            'loading_time': b.loading_time,
            'free_time_detention': b.free_time_detention,
            'free_time_demurrage': b.free_time_demurrage,
            'dem_start_date': b.dem_start_date.isoformat() if b.dem_start_date else '',
            'det_start_date': b.det_start_date.isoformat() if b.det_start_date else '',
            'dem_expiry_override': b.dem_expiry_override.isoformat() if b.dem_expiry_override else '',
            'det_expiry_override': b.det_expiry_override.isoformat() if b.det_expiry_override else '',
            'dem': describe_dem_det(b.dem_expiry), 'det': describe_dem_det(b.det_expiry),
            'destination_notes': b.destination_notes, 'road_restrictions': b.road_restrictions,
            'selling_freight_price': float(b.selling_freight_price),
            'status': b.status,
            'status_label': b.get_status_display(),
            'trips': trips_data,
            'booking_file_url': b.booking_file.url if b.booking_file else '',
            'booking_file_name': get_clean_booking_doc_name(b.booking_file.name, b.booking_code) if b.booking_file else '',
            'documents': docs_data,
            'documents_count': len(docs_data),
            'notes': b.notes,
            'can_edit': check_can_edit_or_delete(request.user, b, owner_field='created_by', action='edit')[0],
            'can_delete': (
                check_can_edit_or_delete(request.user, b, owner_field='created_by', action='edit')[0]
                and not DispatchTrip.objects.filter(booking_order=b, is_deleted=False).exists()
            ),
            'creator_name': (b.created_by.nickname or b.created_by.full_name) if b.created_by else ''
        })

    def put(self, request, pk):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        can_edit, edit_msg = check_can_edit_or_delete(request.user, b, owner_field='created_by', action='edit')
        if not can_edit:
            return Response({'error': edit_msg}, status=status.HTTP_403_FORBIDDEN)
        data = request.data

        # Hỗ trợ đa tệp đính kèm (Multi-files: booking_files[])
        uploaded_bk_files = request.FILES.getlist('booking_files') or request.FILES.getlist('files')
        if not uploaded_bk_files:
            single_f = request.FILES.get('booking_file') or request.FILES.get('file')
            if single_f:
                uploaded_bk_files = [single_f]

        if uploaded_bk_files:
            for bf in uploaded_bk_files:
                try:
                    validate_uploaded_document(bf)
                except DjangoValidationError as ve:
                    return Response({'error': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
                format_booking_attachment_filename(bf, b.booking_code)

            b.booking_file = uploaded_bk_files[0]
            for bf in uploaded_bk_files:
                doc_file_name = getattr(bf, 'name', '') or f"{b.booking_code}_booking_document"
                BookingDocument.objects.create(
                    booking=b,
                    file=bf,
                    file_name=doc_file_name,
                    file_size=getattr(bf, 'size', 0)
                )

        customer_name = data.get('customer', '').strip()
        if customer_name:
            customer = resolve_customer(customer_name)
            if customer:
                b.customer = customer

        if 'booking_type' in data:
            b.booking_type = data['booking_type']
        if 'booking_number' in data:
            b.booking_number = data['booking_number'].strip().upper()
        if 'shipping_line' in data:
            b.shipping_line = data['shipping_line'].strip().upper()
        if 'vessel_voyage' in data:
            b.vessel_voyage = data['vessel_voyage'].strip()
        if 'container_size' in data:
            b.container_size = data['container_size']
        if 'total_containers' in data and data['total_containers']:
            b.total_containers = int(data['total_containers'])
        if 'commodity' in data:
            b.commodity = data['commodity'].strip()
        if 'hs_code' in data:
            b.hs_code = data['hs_code'].strip()
        from apps.master_data.models import Location
        if 'pickup_location' in data:
            b.pickup_location = data['pickup_location'].strip().upper()
            b.pickup_loc = Location.objects.filter(name__iexact=b.pickup_location).first() or Location.objects.filter(name__icontains=b.pickup_location).first()
        if 'delivery_location' in data:
            b.delivery_location = data['delivery_location'].strip().upper()
            b.delivery_loc = Location.objects.filter(name__iexact=b.delivery_location).first() or Location.objects.filter(name__icontains=b.delivery_location).first()
        if 'dropoff_location' in data:
            b.dropoff_location = data['dropoff_location'].strip().upper()
            b.dropoff_loc = Location.objects.filter(name__iexact=b.dropoff_location).first() or Location.objects.filter(name__icontains=b.dropoff_location).first()
        if 'si_cutoff' in data:
            b.si_cutoff = data['si_cutoff']
        if 'vgm_cutoff' in data:
            b.vgm_cutoff = data['vgm_cutoff']
        if 'closing_time' in data:
            b.closing_time = data['closing_time']
        if 'loading_date' in data and data['loading_date']:
            b.loading_date = data['loading_date']
        if 'loading_time' in data:
            b.loading_time = data['loading_time']
        if 'free_time_detention' in data and data['free_time_detention'] is not None:
            b.free_time_detention = int(data['free_time_detention'])
        if 'free_time_demurrage' in data and data['free_time_demurrage'] is not None:
            b.free_time_demurrage = int(data['free_time_demurrage'])
        for fld in ('dem_start_date', 'det_start_date', 'dem_expiry_override', 'det_expiry_override'):
            if fld in data:
                try:
                    setattr(b, fld, _parse_optional_date(data[fld]))
                except ValueError:
                    return Response({'error': f'Ngày không hợp lệ ở trường {fld} (định dạng YYYY-MM-DD).'}, status=status.HTTP_400_BAD_REQUEST)
        if 'destination_notes' in data:
            b.destination_notes = str(data['destination_notes'] or '').strip()
        if 'road_restrictions' in data:
            b.road_restrictions = str(data['road_restrictions'] or '').strip()
        if 'selling_freight_price' in data:
            try:
                price_val = float(data.get('selling_freight_price') or 0)
                if price_val <= 0:
                    return Response({'error': 'Đơn giá cước vận chuyển là bắt buộc và phải lớn hơn 0! Vui lòng kiểm tra và nhập giá cước bán.'}, status=status.HTTP_400_BAD_REQUEST)
                b.selling_freight_price = price_val
            except (ValueError, TypeError):
                return Response({'error': 'Đơn giá cước không hợp lệ!'}, status=status.HTTP_400_BAD_REQUEST)
        if 'status' in data and data['status']:
            b.status = data['status']
        if 'notes' in data:
            b.notes = data['notes']

        b.save()
        return Response({
            'success': True,
            'message': f'Cập nhật đơn hàng / booking {b.booking_code} thành công!',
            'booking_id': b.id
        })

    def patch(self, request, pk):
        return self.put(request, pk)

    def post(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        can_del, del_msg = check_can_edit_or_delete(request.user, b, owner_field='created_by', action='delete')
        if not can_del:
            return Response({'error': del_msg}, status=status.HTTP_403_FORBIDDEN)

        # Kiểm tra toàn vẹn: Không cho phép xóa Booking đã phát sinh chuyến xe
        t_count = DispatchTrip.objects.filter(booking_order=b, is_deleted=False).count()
        if t_count > 0:
            return Response({
                'error': f"Không thể xóa đơn Booking [{b.booking_code}] vì đã điều động {t_count} chuyến xe thực tế! Vui lòng hủy hoặc xóa các chuyến xe liên quan trước khi xóa đơn hàng."
            }, status=status.HTTP_400_BAD_REQUEST)

        b.is_deleted = True
        b.save(update_fields=['is_deleted'])
        return Response({
            'success': True,
            'message': f'Đã xóa đơn hàng / booking {b.booking_code}'
        })


class BookingOrderStatusAPIView(APIView):
    """API Đổi nhanh trạng thái chu trình Đơn Hàng / Booking."""
    permission_classes = [IsSalesOrDirector]
    def patch(self, request, pk):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        valid_statuses = [s.value for s in BookingStatus]
        if new_status not in valid_statuses:
            return Response({'error': f'Trạng thái không hợp lệ. Cho phép: {valid_statuses}'}, status=status.HTTP_400_BAD_REQUEST)
        b.status = new_status
        b.save(update_fields=['status', 'updated_at'])
        return Response({
            'success': True,
            'message': f'Đã chuyển trạng thái đơn hàng {b.booking_code} sang [{b.get_status_display()}]!',
            'status': b.status,
            'status_display': b.get_status_display()
        })

    def post(self, request, pk):
        return self.patch(request, pk)


class BookingDocumentDeleteAPIView(APIView):
    """API xóa tệp đính kèm lẻ của Booking."""
    permission_classes = [IsSalesOrDirector]
    def delete(self, request, pk, doc_id):
        b = BookingOrder.objects.filter(pk=pk, is_deleted=False).first()
        if not b:
            return Response({'error': 'Không tìm thấy đơn hàng / booking'}, status=status.HTTP_404_NOT_FOUND)
        doc = b.documents.filter(pk=doc_id, is_deleted=False).first()
        if doc:
            doc.is_deleted = True
            doc.save(update_fields=['is_deleted'])
            return Response({'success': True, 'message': 'Đã xóa tệp đính kèm'})
        return Response({'error': 'Không tìm thấy tệp đính kèm'}, status=status.HTTP_404_NOT_FOUND)
