"""Đội xe, rơ-moóc."""
from ._common import *  # noqa: F401,F403

class FleetAPIView(APIView):
    """API Đội xe & Rơ-moóc với cảnh báo đăng kiểm & bảo hiểm thông minh."""
    permission_classes = [CanManageFleet]
    def get(self, request):
        vehicles = Vehicle.objects.select_related('current_driver').all()
        today = timezone.now().date()
        veh_list = []
        for v in vehicles:
            reg_days = (v.registration_expiry - today).days if v.registration_expiry else None
            maint_days = (v.next_maintenance_date - today).days if v.next_maintenance_date else None
            ins_days = (v.insurance_expiry - today).days if v.insurance_expiry else None

            veh_list.append({
                'id': v.id,
                'plate': v.license_plate,
                'type': v.get_vehicle_type_display(),
                'driver': v.current_driver.nickname if v.current_driver else '-',
                'reg_expiry': v.registration_expiry.strftime('%d/%m/%Y') if v.registration_expiry else '-',
                'reg_days_left': reg_days,
                'is_reg_expired': (reg_days is not None and reg_days <= 0),
                'is_reg_warning': (reg_days is not None and 0 < reg_days <= 15),
                'insurance_expiry': v.insurance_expiry.strftime('%d/%m/%Y') if v.insurance_expiry else '-',
                'ins_days_left': ins_days,
                'is_ins_expired': (ins_days is not None and ins_days <= 0),
                'is_ins_warning': (ins_days is not None and 0 < ins_days <= 15),
                'maint_date': v.next_maintenance_date.strftime('%d/%m/%Y') if v.next_maintenance_date else '-',
                'maint_days_left': maint_days,
                'is_maint_warning': (maint_days is not None and maint_days <= 7),
                'ownership_type': v.get_ownership_type_display(),
                'ownership_code': v.ownership_type,
                'status': v.get_status_display(),
                'status_raw': v.status
            })

        trailers = Trailer.objects.filter(is_deleted=False)
        trailer_list = []
        for tr in trailers:
            reg_days = (tr.registration_expiry - today).days if tr.registration_expiry else None
            st = tr.status
            if st == 'IDLE':
                st_disp = 'Nằm bãi (Chờ việc)'
            elif st == 'ACTIVE':
                st_disp = 'Đang kéo (Có hàng)'
            elif st == 'MAINTENANCE':
                st_disp = 'Hư hỏng / Bảo trì'
            elif st == 'DECOMMISSIONED':
                st_disp = 'Ngừng sử dụng'
            else:
                st_disp = st

            trailer_list.append({
                'id': tr.id,
                'plate': tr.license_plate,
                'type': tr.trailer_type,
                'brand': tr.brand or '-',
                'payload_display': tr.display_payload or (f"{tr.payload_capacity_kg:,}".replace(',', '.') if tr.payload_capacity_kg else '-'),
                'payload_capacity_kg': tr.payload_capacity_kg,
                'design_payload_kg': tr.design_payload_kg,
                'reg_expiry': tr.registration_expiry.strftime('%d/%m/%Y') if tr.registration_expiry else '-',
                'reg_days_left': reg_days,
                'is_reg_expired': (reg_days is not None and reg_days <= 0),
                'is_reg_warning': (reg_days is not None and 0 < reg_days <= 15),
                'status': st_disp,
                'status_raw': tr.status
            })

        total_tractors = Vehicle.objects.filter(vehicle_type=VehicleType.TRACTOR, is_deleted=False).count()
        owned_tractors = Vehicle.objects.filter(vehicle_type=VehicleType.TRACTOR, ownership_type=VehicleOwnership.OWNED, is_deleted=False).count()
        subcontractor_tractors = max(0, total_tractors - owned_tractors)
        active_tractors = Vehicle.objects.filter(vehicle_type=VehicleType.TRACTOR, status=VehicleStatus.ACTIVE, is_deleted=False).count()
        idle_tractors = Vehicle.objects.filter(vehicle_type=VehicleType.TRACTOR, status=VehicleStatus.IDLE, is_deleted=False).count()

        total_trailers = len(trailer_list)
        active_trailers = sum(1 for t in trailer_list if t['status_raw'] == 'ACTIVE')
        idle_trailers = sum(1 for t in trailer_list if t['status_raw'] == 'IDLE')

        total_fleet = total_tractors + total_trailers
        ready_fleet = active_tractors + idle_tractors + active_trailers + idle_trailers
        availability_rate = round(ready_fleet / total_fleet * 100, 1) if total_fleet > 0 else 100.0

        reg_expired_count = sum(1 for v in veh_list if v['is_reg_expired']) + sum(1 for t in trailer_list if t['is_reg_expired'])
        reg_warning_count = sum(1 for v in veh_list if v['is_reg_warning']) + sum(1 for t in trailer_list if t['is_reg_warning'])
        total_reg_warning = reg_expired_count + reg_warning_count

        maint_warning_count = sum(1 for v in veh_list if v['is_maint_warning'])
        ins_warning_count = sum(1 for v in veh_list if v['is_ins_warning'] or v['is_ins_expired'])

        # Cấu trúc Bộ 5 Thẻ Vận Hành Kỹ Thuật Đội Xe
        card_tractors = {
            'total': total_tractors,
            'line_1': f"{owned_tractors} Xe Nhà · {subcontractor_tractors} Thầu Phụ",
            'line_2': f"{active_tractors} Hoạt động · {idle_tractors} Bãi"
        }
        card_trailers = {
            'total': total_trailers,
            'line_1': f"{active_trailers} Đang kéo · {idle_trailers} Nằm bãi",
            'line_2': f"Tải trọng 30 - 32 Tấn"
        }
        card_availability = {
            'rate': f"{availability_rate}%",
            'line_1': f"{active_tractors + idle_tractors} Xe khả dụng",
            'line_2': f"{active_tractors} Trên đường"
        }
        card_reg = {
            'total': total_reg_warning,
            'line_1': f"{reg_expired_count} Quá hạn",
            'line_2': f"{reg_warning_count} Sắp đến hạn"
        }
        card_maint = {
            'total': maint_warning_count,
            'line_1': f"{maint_warning_count} Đến hạn bảo dưỡng",
            'line_2': f"{ins_warning_count} Hạn bảo hiểm"
        }

        return Response({
            'total_tractors': total_tractors,
            'total_trailers': total_trailers,
            'reg_warning_count': total_reg_warning,
            'ins_warning_count': ins_warning_count,
            'maint_warning_count': maint_warning_count,
            'card_tractors': card_tractors,
            'card_trailers': card_trailers,
            'card_availability': card_availability,
            'card_reg': card_reg,
            'card_maint': card_maint,
            'vehicles': veh_list,
            'trailers': trailer_list
        })
