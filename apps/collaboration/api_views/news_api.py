from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from apps.collaboration.models import (
    PostCategory, CompanyPost, PostComment, PostReadStatus, PostAttachment,
    Notification, NotificationType
)
from apps.personnel.models import Employee, EmployeeRole, Department
from apps.collaboration.serializers import (
    PostCategorySerializer, CompanyPostListSerializer,
    CompanyPostDetailSerializer, PostCommentSerializer
)


class PostCategoryListAPIView(views.APIView):
    """Lấy danh sách các danh mục bản tin công ty."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        categories = PostCategory.objects.all().order_by('order', 'name')
        # Tự động gieo dữ liệu danh mục mẫu nếu chưa có
        if not categories.exists():
            default_categories = [
                {'name': 'Thông báo Ban Giám Đốc', 'code': 'MANAGEMENT', 'color': '#0d9488', 'icon': 'ph-megaphone', 'order': 1},
                {'name': 'Vận hành Tuyến & Cảng', 'code': 'OPERATIONS', 'color': '#0284c7', 'icon': 'ph-truck', 'order': 2},
                {'name': 'Chính sách & Chế độ', 'code': 'POLICIES', 'color': '#7c3aed', 'icon': 'ph-file-text', 'order': 3},
                {'name': 'Sự kiện & Khen thưởng', 'code': 'EVENTS', 'color': '#d97706', 'icon': 'ph-sparkle', 'order': 4},
            ]
            for item in default_categories:
                PostCategory.objects.create(**item)
            categories = PostCategory.objects.all().order_by('order', 'name')

        serializer = PostCategorySerializer(categories, many=True)
        return Response({'success': True, 'data': serializer.data})


class CompanyPostListCreateAPIView(views.APIView):
    """Danh sách bản tin công ty và tạo bản tin mới."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        category_id = request.GET.get('category_id')
        search = request.GET.get('search')
        is_urgent = request.GET.get('urgent')

        qs = CompanyPost.objects.filter(is_published=True).select_related('category', 'author')

        # Lọc theo danh mục
        if category_id:
            qs = qs.filter(category_id=category_id)

        # Lọc khẩn cấp
        if is_urgent == '1':
            qs = qs.filter(is_urgent=True)

        # Tìm kiếm theo từ khóa
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search) |
                Q(content__icontains=search)
            )

        # Phân quyền & lọc theo phòng ban đích
        target_dept = request.GET.get('department')
        user = request.user
        employee = getattr(user, 'employee', None)
        is_privileged = (
            user.is_superuser or
            (employee and (
                getattr(employee, 'hierarchy_level', 0) >= 80 or
                getattr(employee, 'role', '') == EmployeeRole.DIRECTOR or
                getattr(employee, 'department', '') == Department.MANAGEMENT
            ))
        )

        if target_dept and target_dept != 'ALL':
            qs = qs.filter(target_department=target_dept)
        elif not is_privileged:
            user_dept = getattr(employee, 'department', None) if employee else None
            if user_dept and user_dept != 'ALL':
                qs = qs.filter(Q(target_department='ALL') | Q(target_department=user_dept) | Q(author=user))
            else:
                qs = qs.filter(Q(target_department='ALL') | Q(author=user))

        posts = qs.order_by('-is_pinned', '-is_urgent', '-created_at')[:50]
        serializer = CompanyPostListSerializer(posts, many=True, context={'request': request})
        
        can_post = request.user.is_superuser or (employee and employee.can_post_news())
        return Response({
            'success': True,
            'data': serializer.data,
            'can_create_post': bool(can_post)
        })

    def post(self, request):
        employee = getattr(request.user, 'employee', None)
        can_post = request.user.is_superuser or (employee and employee.can_post_news())
        if not can_post:
            return Response({
                'success': False,
                'message': 'Bạn không có quyền đăng bản tin công ty. Chỉ Ban Giám Đốc, Hành chính Nhân sự hoặc Trưởng các phòng ban mới được đăng thông báo.'
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        title = data.get('title')
        content = data.get('content')

        if not title or not content:
            return Response({'success': False, 'message': 'Vui lòng cung cấp tiêu đề và nội dung.'}, status=status.HTTP_400_BAD_REQUEST)

        post = CompanyPost.objects.create(
            title=title,
            category_id=data.get('category_id') or None,
            author=request.user,
            summary=data.get('summary', ''),
            content=content,
            cover_image=request.FILES.get('cover_image'),
            is_pinned=str(data.get('is_pinned', '')).lower() in ['true', '1'],
            is_urgent=str(data.get('is_urgent', '')).lower() in ['true', '1'],
            target_department=data.get('target_department', 'ALL'),
            published_at=timezone.now(),
            is_published=True
        )

        # Xử lý tệp đính kèm nếu có
        files = request.FILES.getlist('attachments')
        for f in files:
            PostAttachment.objects.create(
                post=post,
                file=f,
                file_name=f.name,
                file_size=f.size
            )

        # Đẩy thông báo lên chuông cho các nhân sự văn phòng liên quan
        try:
            target_emps = Employee.objects.filter(is_deleted=False, user__isnull=False).exclude(user=request.user)
            if post.target_department != 'ALL':
                target_emps = target_emps.filter(department=post.target_department)

            notif_type = NotificationType.NEWS_URGENT if post.is_urgent else NotificationType.NEWS_NEW
            prefix = "[KHẨN CẤP] " if post.is_urgent else "[BẢN TIN] "
            msg_preview = post.summary or (post.content[:100] + '...')

            notifications_list = [
                Notification(
                    recipient=emp.user,
                    sender=request.user,
                    notification_type=notif_type,
                    title=f"{prefix}{post.title}",
                    message=msg_preview,
                    target_type='NEWS',
                    target_id=post.id,
                    link_url=f"/news/{post.hashid}/"
                )
                for emp in target_emps
            ]
            if notifications_list:
                Notification.objects.bulk_create(notifications_list)
        except Exception as e:
            print("Error creating post notifications:", e)

        serializer = CompanyPostDetailSerializer(post, context={'request': request})
        return Response({'success': True, 'data': serializer.data, 'message': 'Đã đăng bản tin thành công.'}, status=status.HTTP_201_CREATED)


def resolve_post_id(pk_val):
    """Phân giải pk từ chuỗi số hoặc HashID bảo mật."""
    if not pk_val:
        return None
    if str(pk_val).isdigit():
        return int(pk_val)
    from core.security import decode_news_hashid
    return decode_news_hashid(str(pk_val))


class CompanyPostDetailAPIView(views.APIView):
    """Chi tiết bản tin, tự động tăng view_count và ghi nhận đã đọc."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        post_id = resolve_post_id(pk)
        if not post_id:
            return Response({'success': False, 'message': 'Không tìm thấy bản tin.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            post = CompanyPost.objects.select_related('category', 'author').get(pk=post_id, is_deleted=False)
        except CompanyPost.DoesNotExist:
            return Response({'success': False, 'message': 'Không tìm thấy bản tin.'}, status=status.HTTP_404_NOT_FOUND)

        employee = getattr(request.user, 'employee', None)
        is_privileged = (
            request.user.is_superuser or
            (post.author_id == request.user.id) or
            (employee and (
                getattr(employee, 'hierarchy_level', 0) >= 80 or
                getattr(employee, 'role', '') == EmployeeRole.DIRECTOR or
                getattr(employee, 'department', '') == Department.MANAGEMENT
            ))
        )

        if not post.is_published and not is_privileged:
            return Response({'success': False, 'message': 'Không tìm thấy bản tin.'}, status=status.HTTP_404_NOT_FOUND)

        if post.target_department != 'ALL':
            user_dept = employee.department if employee else None
            if not (is_privileged or user_dept == post.target_department):
                return Response({
                    'success': False,
                    'message': f'Bản tin này chỉ dành riêng cho phòng ban {post.get_target_department_display()}.'
                }, status=status.HTTP_403_FORBIDDEN)

        # Tăng view_count
        post.view_count += 1
        post.save(update_fields=['view_count'])

        # Ghi nhận trạng thái đã đọc của người dùng
        PostReadStatus.objects.get_or_create(post=post, user=request.user)

        serializer = CompanyPostDetailSerializer(post, context={'request': request})
        return Response({'success': True, 'data': serializer.data})

    def delete(self, request, pk):
        post_id = resolve_post_id(pk)
        if not post_id:
            return Response({'success': False, 'message': 'Bản tin không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            post = CompanyPost.objects.get(pk=post_id, is_deleted=False)
        except CompanyPost.DoesNotExist:
            return Response({'success': False, 'message': 'Bản tin không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        employee = getattr(request.user, 'employee', None)
        from apps.personnel.models import Department
        is_bgd_or_hr = employee and (
            employee.hierarchy_level >= 100 or 
            (employee.department == Department.HR and employee.is_department_head)
        )
        can_delete = (
            request.user.is_superuser or
            (post.author_id == request.user.id) or
            is_bgd_or_hr
        )
        if not can_delete:
            return Response({
                'success': False,
                'message': 'Bạn không có quyền xóa bản tin này. Chỉ người đăng, Ban Giám Đốc hoặc Trưởng phòng Nhân sự mới có thẩm quyền xóa.'
            }, status=status.HTTP_403_FORBIDDEN)

        post.delete() # Soft delete
        return Response({'success': True, 'message': 'Đã xóa bản tin.'})


class CompanyPostCommentCreateAPIView(views.APIView):
    """Thêm bình luận vào bài viết bản tin."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'success': False, 'message': 'Nội dung bình luận không được rỗng.'}, status=status.HTTP_400_BAD_REQUEST)

        post_id = resolve_post_id(pk)
        if not post_id:
            return Response({'success': False, 'message': 'Bản tin không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            post = CompanyPost.objects.get(pk=post_id, is_deleted=False)
        except CompanyPost.DoesNotExist:
            return Response({'success': False, 'message': 'Bản tin không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        comment = PostComment.objects.create(
            post=post,
            author=request.user,
            content=content
        )

        serializer = PostCommentSerializer(comment, context={'request': request})
        return Response({'success': True, 'data': serializer.data, 'message': 'Bình luận thành công.'}, status=status.HTTP_201_CREATED)


class CompanyPostPinAPIView(views.APIView):
    """Ghim hoặc bỏ ghim bài viết bản tin."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post_id = resolve_post_id(pk)
        if not post_id:
            return Response({'success': False, 'message': 'Bản tin không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            post = CompanyPost.objects.get(pk=post_id, is_deleted=False)
        except CompanyPost.DoesNotExist:
            return Response({'success': False, 'message': 'Bản tin không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        employee = getattr(request.user, 'employee', None)
        can_pin = request.user.is_superuser or (employee and employee.can_post_news()) or post.author == request.user
        if not can_pin:
            return Response({
                'success': False,
                'message': 'Bạn không có quyền ghim bài viết. Chỉ Ban Giám Đốc, Trưởng phòng hoặc người đăng bài mới có thẩm quyền này.'
            }, status=status.HTTP_403_FORBIDDEN)

        post.is_pinned = not post.is_pinned
        post.save(update_fields=['is_pinned'])
        return Response({
            'success': True, 
            'is_pinned': post.is_pinned,
            'message': 'Đã ghim bài viết lên đầu trang' if post.is_pinned else 'Đã bỏ ghim bài viết'
        })
