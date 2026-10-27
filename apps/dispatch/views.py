from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import HttpResponse, Http404
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.tokens import RefreshToken
from apps.personnel.models import Employee
from apps.master_data.models import CompanyProfile

from django.utils.http import url_has_allowed_host_and_scheme
import json

@never_cache
@csrf_exempt
def login_view(request):
    """
    Trang Đăng nhập Quản trị & Vận hành Bim Logistics (TMS).
    Kế thừa chuẩn giao diện & quy chuẩn bảo mật từ hệ sinh thái BIM Ecosystem.
    Hỗ trợ xác thực kép: Django Session Cookie + JWT Access Token.
    @csrf_exempt đảm bảo người dùng và demo roles không bị chặn bởi lỗi 403 CSRF token mismatch khi chuyển tài khoản hoặc bấm nút Back.
    """
    raw_next_url = request.GET.get('next') or request.POST.get('next') or '/'
    # Bảo vệ chống Open Redirect & XSS
    if raw_next_url and url_has_allowed_host_and_scheme(raw_next_url, allowed_hosts={request.get_host()}):
        next_url = raw_next_url
    else:
        next_url = '/'

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

            # JSON dumps an toàn tuyệt đối, chống XSS injection
            safe_access = json.dumps(access_token)
            safe_refresh = json.dumps(refresh_token)
            safe_redirect_target = json.dumps(next_url)

            # Trả về trang trung gian lưu token vào localStorage và chuyển tiếp
            html_redirect = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đang đăng nhập...</title>
    <script>
        localStorage.setItem('access_token', {safe_access});
        localStorage.setItem('refresh_token', {safe_refresh});
        window.location.href = {safe_redirect_target};
    </script>
</head>
<body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0fdfa; color: #0d9488;">
    <p>Đăng nhập thành công. Đang tải không gian làm việc...</p>
</body>
</html>"""
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

    # Preload danh bạ nhân sự văn phòng cho tính năng Giao việc & Phối hợp (Zero-latency)
    office_users_data = []
    try:
        from django.contrib.auth import get_user_model
        from apps.personnel.models import Employee
        User = get_user_model()
        is_super = request.user.is_superuser or (employee and employee.hierarchy_level >= 100)
        
        # Lấy tất cả tài khoản User đang hoạt động được cấp trong hệ thống
        active_users = User.objects.filter(is_active=True).select_related('employee').order_by('username')

        for u in active_users:
            emp = getattr(u, 'employee', None)
            can_assign = False
            if is_super:
                can_assign = True
            elif employee and emp:
                can_assign = employee.can_assign_task_to(emp)

            if emp:
                full_name = emp.full_name
                department = emp.department
                department_name = emp.get_department_display()
                role = emp.get_role_display()
                emp_code = emp.code
                h_level = emp.hierarchy_level
                is_head = emp.is_department_head
            else:
                full_name = u.get_full_name() or u.username
                department = 'BGD' if u.is_superuser else 'OFFICE'
                department_name = 'Ban Giám Đốc' if u.is_superuser else 'Khối Văn Phòng'
                role = 'Quản trị viên' if u.is_superuser else 'Nhân viên'
                emp_code = u.username.upper()
                h_level = 100 if u.is_superuser else 10
                is_head = u.is_superuser

            office_users_data.append({
                'user_id': u.id,
                'username': u.username,
                'full_name': full_name,
                'employee_code': emp_code,
                'department': department,
                'department_name': department_name,
                'role': role,
                'hierarchy_level': h_level,
                'is_department_head': is_head,
                'can_assign': can_assign
            })
    except Exception as e:
        office_users_data = []

    from apps.master_data.models import CompanyProfile
    try:
        company = CompanyProfile.get_default_company()
        company_profile_data = {
            'id': company.id,
            'company_name': company.company_name,
            'short_name': company.short_name,
            'tax_code': company.tax_code,
            'phone': company.phone,
            'email': company.email,
            'website': company.website,
            'address': company.address,
            'representative_name': company.representative_name,
            'representative_role': company.representative_role,
            'bank_account_number': company.bank_account_number,
            'bank_name': company.bank_name,
            'bank_branch': company.bank_branch,
            'operating_license': company.operating_license,
            'default_vat_rate': float(company.default_vat_rate) if company.default_vat_rate else 8.0,
            'fuel_reference_price': float(company.fuel_reference_price) if company.fuel_reference_price else 21000.0,
            'logo_url': company.logo_url or '/static/images/trienvo_logo.png',
        }
    except Exception as e:
        company_profile_data = {}

    office_users_json = json.dumps(office_users_data, ensure_ascii=False)
    company_profile_json = json.dumps(company_profile_data, ensure_ascii=False)

    return render(request, 'index.html', {
        'current_employee': employee,
        'office_users_json': office_users_json,
        'company_profile_json': company_profile_json,
    })


@never_cache
def help_view(request):
    """
    Trang Trung Tâm Trợ Giúp & Hướng Dẫn Sử Dụng Toàn Diện BIM Logistics (/helps).
    Cung cấp tài liệu hướng dẫn tương tác, tra cứu trường dữ liệu và quy trình SOP từng phân hệ.
    Bảo mật: Yêu cầu nhân viên đăng nhập hệ thống trước khi xem tài liệu SOP nội bộ.
    """
    if not request.user.is_authenticated:
        return redirect(f"/login/?next={request.path}")

    employee = getattr(request.user, 'employee', None)
    return render(request, 'help.html', {
        'current_employee': employee,
        'user': request.user,
    })


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

    # 4. Kiểm tra Link Tài Xế Tự Động Vô Hiệu 10 Phút Sau Khi Chuyến Hoàn Tất (Xong Bước 10)
    from apps.personnel.models import EmployeeRole
    is_internal_dispatcher = bool(
        request.user.is_authenticated and (
            request.user.is_superuser or request.user.is_staff or (
                hasattr(request.user, 'employee') and request.user.employee.role in [
                    EmployeeRole.DISPATCHER, EmployeeRole.LEAD_DISPATCH, EmployeeRole.DIRECTOR, EmployeeRole.ACCOUNTANT
                ]
            )
        )
    )

    if not is_internal_dispatcher and trip.is_driver_portal_expired():
        return render(request, 'driver_portal_revoked.html', {
            'trip': trip,
            'trip_hash': trip_hash,
            'is_completed_expired': True
        }, status=403)

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
        'assigned_driver_name': trip.assigned_driver_name,
        'assigned_driver_phone': trip.assigned_driver_phone,
        'carrier_name': trip.carrier_name,
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
        'portal_expire_seconds': trip.get_driver_portal_seconds_left(),
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
        'assigned_driver_name': trip.assigned_driver_name,
        'assigned_driver_phone': trip.assigned_driver_phone,
        'carrier_name': trip.carrier_name,
        'share_url': request.build_absolute_uri(),
    }
    return render(request, 'public_tracking.html', context)


@never_cache
def news_detail_page_view(request, post_identifier):
    """
    Trang Xem Chi Tiết Bản Tin & Xem Trước Tệp Đính Kèm (PDF, Word, Excel).
    Mở ra một trang chuyên dụng độc lập khi nhân viên bấm vào thông báo.
    Bảo mật: Chuẩn mã hóa HashID chống quét IDOR, kiểm soát phân quyền phòng ban và chế độ xuất bản.
    Tự động Redirect 301 chuyển đổi các link ID số nguyên cũ (/news/2/) sang HashID chuẩn (/news/<hashid>/).
    """
    import os
    from django.shortcuts import get_object_or_404, redirect, render
    from django.db.models import F
    from apps.collaboration.models.news import CompanyPost, PostAttachment, PostReadStatus
    from apps.master_data.models import CompanyProfile
    from core.security import decode_news_hashid, get_news_hashid

    # 1. Phân giải HashID hoặc ID nguyên bản (Hỗ trợ tương thích ngược)
    post_id = None
    is_raw_numeric_id = False

    if str(post_identifier).isdigit():
        post_id = int(post_identifier)
        is_raw_numeric_id = True
    else:
        post_id = decode_news_hashid(post_identifier)

    if not post_id:
        return render(request, '404.html', status=404)

    post = get_object_or_404(
        CompanyPost.objects.select_related('category', 'author'),
        pk=post_id,
        is_deleted=False
    )

    # 2. Chuẩn hóa URL: Nếu truy cập bằng ID số thô (/news/2/),
    # tự động redirect vĩnh viễn (301) sang URL HashID bảo mật (/news/<hashid>/) ngay lập tức
    # (kể cả trước khi kiểm tra đăng nhập để trình duyệt cập nhật URL và ?next= luôn là HashID)
    secure_hashid = post.hashid
    if is_raw_numeric_id and secure_hashid:
        return redirect(f"/news/{secure_hashid}/", permanent=True)

    # 3. Yêu cầu đăng nhập hệ thống
    if not request.user.is_authenticated:
        return redirect(f"/login/?next={request.path}")

    employee = getattr(request.user, 'employee', None)
    is_privileged = (
        request.user.is_superuser or
        (post.author_id == request.user.id) or
        (employee and employee.hierarchy_level >= 80)
    )

    # 1. Nếu bản tin chưa xuất bản, chỉ người đăng hoặc quản lý cấp cao mới được xem trước
    if not post.is_published and not is_privileged:
        return render(request, '404.html', status=404)

    # 2. Nếu bản tin giới hạn phòng ban, chỉ nhân viên cùng phòng ban hoặc quản lý cấp cao mới được xem
    if post.target_department != 'ALL':
        user_dept = employee.department if employee else None
        if not (is_privileged or user_dept == post.target_department):
            return render(request, '403.html', {
                'message': f'Bản tin này chỉ dành riêng cho phòng ban {post.get_target_department_display()}. Tài khoản của bạn không thuộc phạm vi tiếp nhận thông báo này.'
            }, status=403)

    # Tăng lượt xem & ghi nhận đã đọc
    CompanyPost.objects.filter(pk=post.id).update(view_count=F('view_count') + 1)
    post.view_count += 1
    PostReadStatus.objects.get_or_create(post=post, user=request.user)

    # Phân tích danh sách tệp đính kèm và loại tệp
    raw_attachments = post.attachments.filter(is_deleted=False).order_by('created_at')
    attachments_data = []
    
    for att in raw_attachments:
        try:
            fname = att.file_name or (os.path.basename(att.file.name) if att.file else "Tệp đính kèm")
        except Exception:
            fname = "Tệp đính kèm"
        ext = os.path.splitext(fname)[1].lower()
        
        file_type = 'other'
        icon_class = 'ph-file-text'
        icon_color = 'text-slate-500'
        badge_bg = 'bg-slate-100 text-slate-700'
        
        if ext in ['.pdf']:
            file_type = 'pdf'
            icon_class = 'ph-file-pdf'
            icon_color = 'text-rose-600'
            badge_bg = 'bg-rose-50 text-rose-700 border-rose-200'
        elif ext in ['.doc', '.docx']:
            file_type = 'word'
            icon_class = 'ph-file-doc'
            icon_color = 'text-blue-600'
            badge_bg = 'bg-blue-50 text-blue-700 border-blue-200'
        elif ext in ['.xls', '.xlsx', '.csv']:
            file_type = 'excel'
            icon_class = 'ph-file-xls'
            icon_color = 'text-emerald-600'
            badge_bg = 'bg-emerald-50 text-emerald-700 border-emerald-200'
        elif ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
            file_type = 'image'
            icon_class = 'ph-file-image'
            icon_color = 'text-purple-600'
            badge_bg = 'bg-purple-50 text-purple-700 border-purple-200'

        # Tính dung lượng hiển thị
        try:
            size_bytes = att.file_size or (att.file.size if att.file else 0)
        except Exception:
            size_bytes = 0

        if size_bytes >= 1024 * 1024:
            size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
        elif size_bytes >= 1024:
            size_str = f"{size_bytes / 1024:.0f} KB"
        else:
            size_str = f"{size_bytes} B"

        try:
            file_url = att.file.url if att.file else ''
            absolute_file_url = request.build_absolute_uri(file_url) if file_url else ''
        except Exception:
            file_url = ''
            absolute_file_url = ''

        attachments_data.append({
            'id': att.id,
            'file_name': fname,
            'file_url': file_url,
            'absolute_url': absolute_file_url,
            'file_type': file_type,
            'ext': ext.replace('.', '').upper(),
            'size_str': size_str,
            'icon_class': icon_class,
            'icon_color': icon_color,
            'badge_bg': badge_bg,
        })

    # Bình luận phản hồi
    comments = post.comments.filter(is_deleted=False).select_related('author').order_by('created_at')

    # Thông tin tác giả
    author_emp = getattr(post.author, 'employee', None) if post.author else None
    author_name = author_emp.full_name if author_emp else (post.author.get_full_name() or post.author.username if post.author else 'Ban Giám Đốc')
    author_role = author_emp.get_role_display() if author_emp else 'Quản trị viên'
    author_dept = author_emp.get_department_display() if author_emp else 'Toàn công ty'

    try:
        company = CompanyProfile.get_default_company()
    except Exception:
        company = None

    import json
    try:
        company_profile_data = {
            'id': company.id,
            'company_name': company.company_name,
            'short_name': company.short_name,
            'tax_code': company.tax_code,
            'phone': company.phone,
            'email': company.email,
            'website': company.website,
            'address': company.address,
            'representative_name': company.representative_name,
            'representative_role': company.representative_role,
            'bank_account_number': company.bank_account_number,
            'bank_name': company.bank_name,
            'bank_branch': company.bank_branch,
            'operating_license': company.operating_license,
            'default_vat_rate': float(company.default_vat_rate) if company.default_vat_rate else 8.0,
            'fuel_reference_price': float(company.fuel_reference_price) if company.fuel_reference_price else 21000.0,
            'logo_url': company.logo_url or '/static/images/trienvo_logo.png',
        } if company else {}
    except Exception:
        company_profile_data = {}
    company_profile_json = json.dumps(company_profile_data, ensure_ascii=False)

    from apps.collaboration.models.news import PostCategory
    categories = PostCategory.objects.all().order_by('order', 'name')
    can_edit = bool(is_privileged or (post.author_id == request.user.id))

    context = {
        'post': post,
        'company': company,
        'current_employee': employee,
        'company_profile_json': company_profile_json,
        'author_name': author_name,
        'author_role': author_role,
        'author_dept': author_dept,
        'attachments': attachments_data,
        'has_attachments': len(attachments_data) > 0,
        'primary_attachment': attachments_data[0] if attachments_data else None,
        'comments': comments,
        'comments_count': comments.count(),
        'share_url': request.build_absolute_uri(f'/news/{post.hashid}/'),
        'post_hashid': post.hashid,
        'current_user': request.user,
        'can_edit': can_edit,
        'can_delete': can_edit,
        'is_author': (post.author_id == request.user.id),
        'categories': categories,
    }
    return render(request, 'news_detail.html', context)


