"""Nhân sự & bảng lương tạm tính."""
from ._common import *  # noqa: F401,F403

class PersonnelPayrollAPIView(APIView):
    """API Bảng lương tài xế theo đúng dữ liệu chuyến xe thực tế trong cơ sở dữ liệu."""
    permission_classes = [CanViewPayroll]
    def get(self, request):
        drivers = Employee.objects.filter(role=EmployeeRole.DRIVER, is_active=True)
        from_date = request.GET.get('from_date') or request.GET.get('start_date')
        to_date = request.GET.get('to_date') or request.GET.get('end_date')
        results = []

        for d in drivers:
            # Lấy toàn bộ chuyến xe thực tế mà tài xế đã thực hiện (Chặng chính hoặc Chặng 2 hạ cont)
            driver_trips = DispatchTrip.objects.filter(
                Q(driver=d) | Q(dropoff_driver=d),
                status__in=[TripStatus.DELIVERED, TripStatus.COMPLETED, TripStatus.RETURNING_EMPTY],
                is_deleted=False
            )
            if from_date:
                try:
                    fd = datetime.datetime.strptime(from_date.strip(), '%Y-%m-%d').date()
                    driver_trips = driver_trips.filter(Q(loading_date__gte=fd) | Q(loading_date__isnull=True, created_at__date__gte=fd))
                except Exception:
                    pass
            if to_date:
                try:
                    td = datetime.datetime.strptime(to_date.strip(), '%Y-%m-%d').date()
                    driver_trips = driver_trips.filter(Q(loading_date__lte=td) | Q(loading_date__isnull=True, created_at__date__lte=td))
                except Exception:
                    pass

            trips_count = driver_trips.count()

            # Tính lương chuyến thực tế theo từng record trong database
            trip_salary = 0
            for t in driver_trips:
                if t.driver == d:
                    trip_salary += int(t.driver_allowance or 0)
                    trip_salary += int(t.detention_driver_allowance or 0)
                if t.is_split_trip and t.dropoff_driver == d:
                    trip_salary += int(t.dropoff_driver_allowance or 0)

            # Thưởng sản lượng vượt mốc 40 chuyến/tháng (+50.000đ/chuyến từ chuyến thứ 41)
            bonus_over_40 = (trips_count - 40) * 50000 if trips_count > 40 else 0

            # Tạm ứng thực tế từ Employee.current_advance
            actual_advance = int(d.current_advance or 0)
            base_sal = int(d.base_salary or 0)

            total_gross = base_sal + trip_salary + bonus_over_40
            total_net = total_gross - actual_advance

            results.append({
                'code': d.code,
                'name': f"{d.full_name} ({d.nickname})" if d.nickname else d.full_name,
                'trips': trips_count,
                'base_salary': base_sal,
                'trip_salary': trip_salary,
                'bonus_over_40': bonus_over_40,
                'advance': actual_advance,
                'net_salary': total_net
            })
        return Response(results)
