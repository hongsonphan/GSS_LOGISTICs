from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.utils import timezone
from apps.collaboration.models import Notification
from apps.collaboration.serializers import NotificationSerializer


class NotificationListAPIView(views.APIView):
    """
    Lấy danh sách thông báo gửi đến chuông của người dùng hiện tại và đếm số tin chưa đọc.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        unread_only = request.GET.get('unread') == '1'
        limit = int(request.GET.get('limit', 30))

        qs = Notification.objects.filter(recipient=request.user)
        total_unread = qs.filter(is_read=False).count()

        if unread_only:
            qs = qs.filter(is_read=False)

        notifications = qs.select_related('sender').order_by('-created_at')[:limit]
        serializer = NotificationSerializer(notifications, many=True)

        return Response({
            'success': True,
            'total_unread': total_unread,
            'data': serializer.data
        })


class NotificationMarkReadAPIView(views.APIView):
    """Đánh dấu một thông báo cụ thể là đã đọc."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = Notification.objects.filter(id=pk, recipient=request.user).first()
        if not notification:
            return Response({
                'success': False,
                'message': 'Thông báo không tồn tại hoặc bạn không có quyền.'
            }, status=status.HTTP_404_NOT_FOUND)

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])

        total_unread = Notification.objects.filter(recipient=request.user, is_read=False).count()

        return Response({
            'success': True,
            'total_unread': total_unread,
            'message': 'Đã đánh dấu thông báo là đã đọc.'
        })


class NotificationMarkAllReadAPIView(views.APIView):
    """Đánh dấu tất cả thông báo của người dùng là đã đọc."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True, read_at=now)

        return Response({
            'success': True,
            'total_unread': 0,
            'updated_count': updated_count,
            'message': f'Đã đánh dấu tất cả ({updated_count}) thông báo là đã đọc.'
        })
