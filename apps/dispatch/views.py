from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import HttpResponse
from rest_framework_simplejwt.tokens import RefreshToken
from apps.personnel.models import Employee

def login_view(request):
    """
    Trang Đăng nhập Quản trị & Vận hành Bim Logistics (TMS).
    Kế thừa chuẩn giao diện & quy chuẩn bảo mật từ hệ sinh thái BIM Ecosystem.
    Hỗ trợ xác thực kép: Django Session Cookie + JWT Access Token.
    """
    next_url = request.GET.get('next') or request.POST.get('next') or '/'

    if request.user.is_authenticated:
        return redirect(next_url)

    if request.method == 'POST':
        username_raw = request.POST.get('username', '').strip()
        password_raw = request.POST.get('password', '').strip()
        remember_me = request.POST.get('remember_me')

        user = None
        # 1. Thử xác thực trực tiếp qua Username
        user = authenticate(request, username=username_raw, password=password_raw)

        # 2. Nếu không tìm thấy, thử tìm theo Mã nhân viên (code) hoặc Số điện thoại
        if not user:
            emp = Employee.objects.filter(code__iexact=username_raw, user__isnull=False).first() or \
                  Employee.objects.filter(phone_number=username_raw, user__isnull=False).first()
            if emp and emp.user:
                user = authenticate(request, username=emp.user.username, password=password_raw)

        if user and user.is_active:
            login(request, user)
            if remember_me:
                request.session.set_expiry(1209600)  # Ghi nhớ 2 tuần
            else:
                request.session.set_expiry(0)  # Hết hạn khi đóng trình duyệt

            # Cấp cặp JWT Token cho client SPA
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # Trả về trang trung gian lưu token vào localStorage và chuyển tiếp
            html_redirect = f"""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <title>Đang đăng nhập...</title>
                <script>
                    localStorage.setItem('access_token', '{access_token}');
                    localStorage.setItem('refresh_token', '{refresh_token}');
                    window.location.href = "{next_url}";
                </script>
            </head>
            <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0fdfa; color: #0d9488;">
                <p>Đăng nhập thành công. Đang tải không gian làm việc...</p>
            </body>
            </html>
            """
            return HttpResponse(html_redirect)
        else:
            return render(request, 'login.html', {
                'error': 'Tên đăng nhập hoặc mật khẩu không chính xác.',
                'username': username_raw,
                'next_url': next_url,
            })

    return render(request, 'login.html', {'next_url': next_url})

def logout_view(request):
    """Đăng xuất khỏi hệ thống và dọn dẹp token phía client."""
    logout(request)
    html_logout = """
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Đang đăng xuất...</title>
        <script>
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = "/login/";
        </script>
    </head>
    <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8fafc; color: #64748b;">
        <p>Đang đăng xuất khỏi hệ thống...</p>
    </body>
    </html>
    """
    return HttpResponse(html_logout)

def index_view(request, *args, **kwargs):
    """Giao diện Quản trị Điều vận Bim Logistics (Hỗ trợ SPA Clean Semantic Routes)."""
    if not request.user.is_authenticated:
        return redirect(f"/login/?next={request.path}")

    employee = getattr(request.user, 'employee', None)
    return render(request, 'index.html', {'current_employee': employee})


def driver_portal_view(request, trip_hash):
    """
    Trang Mobile Portal dành riêng cho Tài xế xe đầu kéo / xe tải.
    - Truy cập không cần mật khẩu phức tạp qua Capability URL (HashID an toàn chống IDOR).
    - Giao diện 100% Mobile-first, nút chạm lớn, trực quan dưới trời nắng.
    - Nghiệp vụ: Báo 6 mốc kho SOP, Kê khai chi phí dọc đường, Chụp ảnh POD/EIR, Gọi điều độ 1-chạm, Chỉ đường Google Maps.
    - Bảo mật tuyệt đối: Không để lộ doanh thu bán khách hay tỷ suất lợi nhuận nội bộ.
    """
    from core.security import decode_trip_hashid
    from apps.dispatch.models import DispatchTrip
    from apps.customs.models import CustomsDeclaration
    import urllib.parse

    decoded_id = decode_trip_hashid(trip_hash)
    trip = None
    if decoded_id:
        trip = DispatchTrip.objects.filter(id=decoded_id).select_related(
            'customer', 'vehicle', 'trailer', 'driver', 'dispatcher',
            'dropoff_driver', 'dropoff_vehicle', 'dropoff_trailer',
            'pickup_loc', 'warehouse_loc', 'dropoff_loc'
        ).first()

    if not trip:
        trip = DispatchTrip.objects.filter(trip_code=trip_hash).select_related(
            'customer', 'vehicle', 'trailer', 'driver', 'dispatcher',
            'dropoff_driver', 'dropoff_vehicle', 'dropoff_trailer',
            'pickup_loc', 'warehouse_loc', 'dropoff_loc'
        ).first()

    if not trip:
        return render(request, 'driver_portal_404.html', {'trip_hash': trip_hash}, status=404)

    # Google Maps URL cho 3 điểm lộ trình
    pickup_target = trip.pickup_depot or trip.pickup_location
    warehouse_target = trip.delivery_warehouse or trip.warehouse_location
    dropoff_target = trip.dropoff_depot or trip.dropoff_location

    maps_url_pickup = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(pickup_target)}" if pickup_target else '#'
    maps_url_warehouse = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(warehouse_target)}" if warehouse_target else '#'
    maps_url_dropoff = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(dropoff_target)}" if dropoff_target else '#'

    # Liên thông tờ khai hải quan (nếu có)
    customs_dec = CustomsDeclaration.objects.filter(dispatch_trip=trip).first()
    if not customs_dec and trip.booking_or_bill:
        customs_dec = CustomsDeclaration.objects.filter(bill_of_lading__iexact=trip.booking_or_bill).first()
    if not customs_dec and trip.container_number:
        customs_dec = CustomsDeclaration.objects.filter(container_numbers__icontains=trip.container_number).first()

    # Danh sách chi phí tài xế đã kê khai cho chuyến này
    expenses = trip.expenses.filter(is_deleted=False).order_by('-created_at')
    total_driver_expenses = sum([e.amount for e in expenses])

    # Danh sách chứng từ đã tải lên
    documents = trip.documents.filter(is_deleted=False).order_by('-created_at')

    # Danh sách timeline mốc đã thực hiện
    timelines = trip.timeline_items.all().order_by('step_number')

    # Số điện thoại điều độ liên hệ
    dispatcher_phone = ''
    dispatcher_name = 'Điều độ BIM Logistics'
    if trip.dispatcher:
        dispatcher_phone = trip.dispatcher.phone_number
        dispatcher_name = trip.dispatcher.nickname or trip.dispatcher.full_name
    if not dispatcher_phone:
        dispatcher_phone = '0908123456'

    context = {
        'trip': trip,
        'trip_hash': trip.hashid,
        'driver': trip.driver,
        'vehicle': trip.vehicle,
        'trailer': trip.trailer,
        'dispatcher_name': dispatcher_name,
        'dispatcher_phone': dispatcher_phone,
        'maps_url_pickup': maps_url_pickup,
        'maps_url_warehouse': maps_url_warehouse,
        'maps_url_dropoff': maps_url_dropoff,
        'customs_dec': customs_dec,
        'expenses': expenses,
        'total_driver_expenses': total_driver_expenses,
        'documents': documents,
        'timelines': timelines,
    }
    return render(request, 'driver_portal.html', context)


def public_tracking_view(request, trip_hash):
    """
    Cổng Tra Cứu Vận Đơn Công Khai Dành Cho Khách Hàng (Public Shipment Tracking Portal).
    - Khách hàng không cần đăng nhập, chỉ cần đường link hoặc mã QR.
    - Hiển thị tiến độ container thời gian thực, lộ trình 3 điểm và ảnh POD / Chữ ký điện tử.
    - BẢO MẬT: Giấu 100% doanh thu, giá cước, chi phí xe và lương tài xế.
    """
    from core.security import decode_trip_hashid
    from apps.dispatch.models import DispatchTrip
    from apps.documents.models import DocumentType

    decoded_id = decode_trip_hashid(trip_hash)
    trip = None
    if decoded_id:
        trip = DispatchTrip.objects.filter(id=decoded_id).select_related(
            'customer', 'vehicle', 'trailer', 'driver',
            'pickup_loc', 'warehouse_loc', 'dropoff_loc'
        ).first()

    if not trip:
        trip = DispatchTrip.objects.filter(trip_code=trip_hash).select_related(
            'customer', 'vehicle', 'trailer', 'driver',
            'pickup_loc', 'warehouse_loc', 'dropoff_loc'
        ).first()

    if not trip:
        return render(request, 'driver_portal_404.html', {'trip_hash': trip_hash}, status=404)

    # Lấy các mốc tiến độ
    timelines = trip.timeline_items.all().order_by('step_number')

    # Chỉ hiển thị các chứng từ bàn giao hàng (POD, Chữ ký số, EIR hạ cont) cho khách hàng xem
    public_documents = trip.documents.filter(
        is_deleted=False,
        document_type__in=[DocumentType.POD, DocumentType.EIR_DROPOFF]
    ).order_by('-created_at')

    context = {
        'trip': trip,
        'trip_hash': trip.hashid,
        'customer_name': trip.customer.name if trip.customer else 'Khách hàng',
        'timelines': timelines,
        'documents': public_documents,
        'share_url': request.build_absolute_uri(),
    }
    return render(request, 'public_tracking.html', context)

