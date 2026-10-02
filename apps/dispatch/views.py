from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.tokens import RefreshToken
from apps.personnel.models import Employee

@never_cache
@csrf_exempt
def login_view(request):
    """
    Trang Đăng nhập Quản trị & Vận hành Bim Logistics (TMS).
    Kế thừa chuẩn giao diện & quy chuẩn bảo mật từ hệ sinh thái BIM Ecosystem.
    Hỗ trợ xác thực kép: Django Session Cookie + JWT Access Token.
    @csrf_exempt đảm bảo người dùng và demo roles không bị chặn bởi lỗi 403 CSRF token mismatch khi chuyển tài khoản hoặc bấm nút Back.
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

@never_cache
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
    response = HttpResponse(html_logout)
    response.delete_cookie('sessionid')
    return response

@never_cache
def index_view(request, *args, **kwargs):
    """Giao diện Quản trị Điều vận Bim Logistics (Hỗ trợ SPA Clean Semantic Routes)."""
    if not request.user.is_authenticated:
        return redirect(f"/login/?next={request.path}")

    employee = getattr(request.user, 'employee', None)
    return render(request, 'index.html', {'current_employee': employee})


def driver_portal_view(request, trip_hash):
    """
    Trang Mobile Portal dành riêng cho Tài xế xe đầu kéo / xe tải.
    - Truy cập an toàn qua Capability URL riêng của Tài xế (Driver Token chống IDOR).
    - Phân tách bảo mật: Khách hàng cầm Tracking Token không thể truy cập cổng này.
    - Khi đổi tài xế, link cũ của tài xế trước sẽ bị vô hiệu hóa để chống ghi đè dữ liệu.
    - Nghiệp vụ: Báo 6 mốc kho SOP, Kê khai chi phí dọc đường, Chụp ảnh POD/EIR, Gọi điều độ 1-chạm.
    - Bảo mật tuyệt đối: Không để lộ doanh thu bán khách hay tỷ suất lợi nhuận nội bộ.
    """
    from core.security import decode_driver_hashid, decode_trip_hashid
    from apps.dispatch.models import DispatchTrip
    from apps.customs.models import CustomsDeclaration
    import urllib.parse

    trip = None

    # 1. Tìm kiếm chính xác theo driver_token hiện hành (Dành cho tài xế đang được gán chuyến)
    trip = DispatchTrip.objects.filter(driver_token=trip_hash).select_related(
        'customer', 'vehicle', 'trailer', 'driver', 'dispatcher',
        'dropoff_driver', 'dropoff_vehicle', 'dropoff_trailer',
        'pickup_loc', 'warehouse_loc', 'dropoff_loc'
    ).first()

    # 2. Nếu không khớp driver_token hiện tại, kiểm tra xem có phải link cũ đã bị thu hồi do đổi tài xế không
    if not trip:
        # 2a. Kiểm tra token có nằm trong danh sách token đã thu hồi của chuyến nào không
        revoked_trip = DispatchTrip.objects.filter(revoked_driver_tokens__icontains=trip_hash).select_related(
            'customer', 'vehicle', 'driver', 'dispatcher'
        ).first()
        if revoked_trip:
            return render(request, 'driver_portal_revoked.html', {'trip': revoked_trip, 'trip_hash': trip_hash}, status=403)

        # 2b. Kiểm tra legacy driver hashid
        decoded_id = decode_driver_hashid(trip_hash)
        if decoded_id:
            old_trip = DispatchTrip.objects.filter(id=decoded_id).select_related(
                'customer', 'vehicle', 'driver', 'dispatcher'
            ).first()
            if old_trip:
                if old_trip.driver_token and old_trip.driver_token != trip_hash:
                    # Link cũ đã bị thu hồi do Điều độ phân lại tài xế khác!
                    return render(request, 'driver_portal_revoked.html', {'trip': old_trip, 'trip_hash': trip_hash}, status=403)
                elif not old_trip.driver_token:
                    # Gán token mới cho bản ghi cũ
                    old_trip.regenerate_driver_token(save=True)
                    trip = old_trip

    # 3. Hỗ trợ nhân viên nội bộ / Điều độ đã ĐĂNG NHẬP hệ thống mở xem trước qua trip_hashid hoặc trip_code
    if not trip and request.user.is_authenticated:
        decoded_trip_id = decode_trip_hashid(trip_hash)
        if decoded_trip_id:
            trip = DispatchTrip.objects.filter(id=decoded_trip_id).select_related(
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

    # Số điện thoại người nhận hàng / Thủ kho khách hàng
    consignee_phone = ''
    consignee_name = 'Thủ kho / Người nhận'
    if trip.warehouse_loc and trip.warehouse_loc.contact_phone:
        consignee_phone = trip.warehouse_loc.contact_phone
        consignee_name = trip.warehouse_loc.contact_person or trip.warehouse_loc.name
    elif trip.customer and trip.customer.phone:
        consignee_phone = trip.customer.phone
        consignee_name = trip.customer.name
    if not consignee_phone:
        consignee_phone = dispatcher_phone  # Fallback về hotline điều độ

    # Điểm đến hiện tại theo trạng thái
    st = trip.status
    if st in ['CONTAINER_PICKED', 'IN_TRANSIT', 'AT_WAREHOUSE', 'UNLOADING', 'DELIVERED']:
        current_leg_title = 'Điểm 2: Kho Đóng / Trả Hàng'
        current_leg_target_name = trip.delivery_warehouse or trip.warehouse_location or 'Kho khách hàng'
        current_maps_url = maps_url_warehouse
    elif st == 'RETURNING_EMPTY':
        current_leg_title = 'Điểm 3: Bãi Hạ Vỏ Cont'
        current_leg_target_name = trip.dropoff_depot or trip.dropoff_location or 'Bãi hạ cont'
        current_maps_url = maps_url_dropoff
    elif st == 'COMPLETED':
        current_leg_title = 'Lộ Trình Đã Hoàn Tất'
        current_leg_target_name = 'Đã hạ cont hoàn tất toàn tuyến'
        current_maps_url = maps_url_dropoff
    else:
        current_leg_title = 'Điểm 1: Lấy Cont / Hàng'
        current_leg_target_name = trip.pickup_depot or trip.pickup_location or 'Bãi lấy cont'
        current_maps_url = maps_url_pickup

    context = {
        'trip': trip,
        'trip_hash': trip.driver_hashid,
        'driver': trip.driver,
        'vehicle': trip.vehicle,
        'trailer': trip.trailer,
        'dispatcher_name': dispatcher_name,
        'dispatcher_phone': dispatcher_phone,
        'consignee_name': consignee_name,
        'consignee_phone': consignee_phone,
        'current_leg_title': current_leg_title,
        'current_leg_target_name': current_leg_target_name,
        'current_maps_url': current_maps_url,
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
    Cổng Tra Cứu Vận Đơn Dành Cho Khách Hàng (Customer Tracking Portal).
    - Khách hàng không cần đăng nhập, truy cập qua Capability Tracking Token riêng biệt.
    - BẢO MẬT:
      + Phân tách độc lập với Driver Portal (không thể đổi URL sang /driver/ để xem thông tin nội bộ).
      + Chặn hoàn toàn tra cứu bằng mã chuyến thô (chống quét dữ liệu IDOR).
      + Giấu 100% chi phí, cước nội bộ, lương tài xế, tờ khai hải quan.
      + KHÔNG đưa tracklog nội bộ 10 bước hay lộ trình bãi rỗng vào trang khách hàng.
    - Trải nghiệm Khách hàng: Hiển thị đúng 3 mốc cốt lõi (Vận chuyển -> Đến kho -> Ký nhận POD) kèm ảnh POD.
    """
    from core.security import decode_tracking_hashid, decode_trip_hashid
    from apps.dispatch.models import DispatchTrip
    from apps.documents.models import DocumentType

    # 1. Giải mã token riêng của Customer Tracking Portal (Hỗ trợ graceful cả hashid cũ)
    decoded_id = decode_tracking_hashid(trip_hash) or decode_trip_hashid(trip_hash)
    trip = None
    if decoded_id:
        trip = DispatchTrip.objects.filter(id=decoded_id).select_related(
            'customer', 'vehicle', 'trailer', 'driver',
            'warehouse_loc'
        ).first()

    # Chỉ cho phép tìm bằng trip_code công khai nếu nhân viên đã ĐĂNG NHẬP hệ thống
    if not trip and request.user.is_authenticated:
        trip = DispatchTrip.objects.filter(trip_code=trip_hash).select_related(
            'customer', 'vehicle', 'trailer', 'driver',
            'warehouse_loc'
        ).first()

    if not trip:
        return render(request, 'driver_portal_404.html', {'trip_hash': trip_hash}, status=404)

    # 2. Xây dựng 6 mốc giao nhận chuẩn hoá B2B Logistics cho Khách Hàng (An tâm, minh bạch, không lộ tác nghiệp nội bộ)
    from apps.dispatch.timeline_service import build_customer_milestones
    customer_milestones = build_customer_milestones(trip)
    destination_wh = trip.delivery_warehouse or trip.warehouse_location or 'Kho Khách Hàng'

    # Chỉ hiển thị Biên bản bàn giao hàng (POD) có chữ ký xác nhận cho Khách hàng
    public_documents = trip.documents.filter(
        is_deleted=False,
        document_type=DocumentType.POD
    ).order_by('-created_at')

    context = {
        'trip': trip,
        'trip_hash': trip.tracking_hashid,
        'customer_name': trip.customer.name if trip.customer else 'Khách hàng',
        'destination_warehouse': destination_wh,
        'customer_milestones': customer_milestones,
        'documents': public_documents,
        'share_url': request.build_absolute_uri(),
    }
    return render(request, 'public_tracking.html', context)

