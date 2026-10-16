from datetime import timedelta
from rest_framework import views, status, permissions
from rest_framework.response import Response
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Q, Max
from django.contrib.auth import get_user_model
from apps.collaboration.models import (
    RoomType, ChatRoom, ChatParticipant, ChatMessage, ChatAttachment
)
from apps.collaboration.serializers import (
    ChatRoomListSerializer, ChatMessageSerializer, UserSimpleSerializer
)
from apps.personnel.models import Department, Employee

User = get_user_model()


def ensure_default_system_rooms():
    """Đảm bảo các kênh phòng chat mặc định luôn tồn tại."""
    # 1. Kênh chung toàn văn phòng
    all_hands = ChatRoom.objects.filter(room_type=RoomType.COMPANY).first()
    if not all_hands:
        ChatRoom.objects.create(
            name="Toàn thể Văn phòng Triền Võ Logistics",
            room_type=RoomType.COMPANY,
            description="Kênh thảo luận chung cho toàn thể cán bộ nhân viên văn phòng",
            last_message_at=timezone.now()
        )

    # 2. Kênh từng phòng ban
    for dept_code, dept_name in Department.choices:
        room = ChatRoom.objects.filter(room_type=RoomType.DEPARTMENT, department=dept_code).first()
        if not room:
            ChatRoom.objects.create(
                name=f"Kênh {dept_name}",
                room_type=RoomType.DEPARTMENT,
                department=dept_code,
                description=f"Thảo luận nội bộ {dept_name}",
                last_message_at=timezone.now()
            )


class ChatRoomListCreateAPIView(views.APIView):
    """Lấy danh sách các phòng chat của nhân viên hiện tại hoặc mở chat 1-1."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ensure_default_system_rooms()

        employee = getattr(request.user, 'employee', None)
        user_dept = employee.department if employee else None

        # Lấy các phòng: Toàn công ty, Kênh phòng ban của nhân viên, Kênh 1-1 tham gia
        qs = ChatRoom.objects.filter(
            Q(room_type=RoomType.COMPANY) |
            Q(room_type=RoomType.DEPARTMENT, department=user_dept) |
            Q(participants__user=request.user) |
            Q(created_by=request.user)
        ).distinct().order_by('-last_message_at', '-created_at')

        serializer = ChatRoomListSerializer(qs, many=True, context={'request': request})
        
        # Đếm tổng số tin nhắn chưa đọc của tất cả các phòng
        total_unread = 0
        for r_data in serializer.data:
            total_unread += r_data.get('unread_count', 0)

        return Response({
            'success': True,
            'data': serializer.data,
            'total_unread': total_unread
        })

    def post(self, request):
        """Khởi tạo cuộc trò chuyện 1-1 hoặc nhóm thảo luận."""
        target_user_id = request.data.get('target_user_id')
        if target_user_id:
            try:
                target_user = User.objects.get(id=target_user_id)
            except User.DoesNotExist:
                return Response({'success': False, 'message': 'Người dùng không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

            if target_user.id == request.user.id:
                return Response({'success': False, 'message': 'Không thể tự chat với chính mình.'}, status=status.HTTP_400_BAD_REQUEST)

            # Tìm xem đã có phòng chat 1-1 giữa 2 người chưa
            existing_room = ChatRoom.objects.filter(
                room_type=RoomType.DIRECT,
                participants__user=request.user
            ).filter(participants__user=target_user).first()

            if existing_room:
                serializer = ChatRoomListSerializer(existing_room, context={'request': request})
                return Response({'success': True, 'data': serializer.data, 'message': 'Đã mở phòng chat có sẵn.'})

            # Tạo phòng chat 1-1 mới
            emp_target = getattr(target_user, 'employee', None)
            target_name = emp_target.full_name if emp_target else target_user.username
            emp_curr = getattr(request.user, 'employee', None)
            curr_name = emp_curr.full_name if emp_curr else request.user.username

            room = ChatRoom.objects.create(
                name=f"{curr_name} & {target_name}",
                room_type=RoomType.DIRECT,
                created_by=request.user,
                last_message_at=timezone.now()
            )
            ChatParticipant.objects.create(room=room, user=request.user, is_admin=True)
            ChatParticipant.objects.create(room=room, user=target_user, is_admin=False)

            serializer = ChatRoomListSerializer(room, context={'request': request})
            return Response({'success': True, 'data': serializer.data, 'message': 'Khởi tạo cuộc trò chuyện thành công.'}, status=status.HTTP_201_CREATED)

        return Response({'success': False, 'message': 'Tham số không hợp lệ.'}, status=status.HTTP_400_BAD_REQUEST)


class ChatMessageListCreateAPIView(views.APIView):
    """
    Lấy tin nhắn và gửi tin nhắn mới trong phòng chat.
    Tối ưu Cache Polling qua after_id như dự án bim_consulting.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id, is_deleted=False)
        except ChatRoom.DoesNotExist:
            return Response({'success': False, 'message': 'Phòng chat không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        after_id = int(request.GET.get('after_id', 0) or 0)
        before_id = request.GET.get('before_id')
        before_id = int(before_id) if before_id else None

        # Tối ưu Cache Polling
        cache_key = f"chat_room_{room_id}_latest_msg_id"
        latest_cached_id = cache.get(cache_key)

        # Tính mốc tin nhắn lớn nhất mà thành viên khác trong phòng đã đọc
        max_other_read_id = ChatParticipant.objects.filter(
            room=room
        ).exclude(user=request.user).aggregate(max_id=Max('last_read_message_id'))['max_id'] or 0

        # Nếu client đang hỏi after_id X và cache báo latest_id <= X -> trả rỗng ngay lập tức kèm mốc đọc
        if latest_cached_id is not None and after_id > 0 and latest_cached_id <= after_id:
            return Response({
                'success': True,
                'messages': [],
                'latest_id': after_id,
                'has_more': False,
                'max_other_read_id': max_other_read_id
            })

        qs = ChatMessage.objects.filter(room=room, is_deleted=False).select_related(
            'sender', 'reply_to', 'reply_to__sender', 'related_task'
        ).prefetch_related('attachments')

        has_more = False
        if before_id:
            # Lấy tin nhắn cũ hơn (cuộn lên trên)
            messages = list(qs.filter(id__lt=before_id).order_by('-id')[:25])[::-1]
            if messages:
                oldest_id = messages[0].id
                has_more = qs.filter(id__lt=oldest_id).exists()
        elif after_id > 0:
            # Polling tin nhắn mới
            messages = list(qs.filter(id__gt=after_id).order_by('id')[:50])
        else:
            # Tải ban đầu (25 tin mới nhất)
            messages = list(qs.order_by('-id')[:25])[::-1]
            if messages:
                oldest_id = messages[0].id
                has_more = qs.filter(id__lt=oldest_id).exists()

        max_id = after_id
        for msg in messages:
            if msg.id > max_id:
                max_id = msg.id

        # Cập nhật cache latest_id
        if max_id > 0 and (latest_cached_id is None or max_id > latest_cached_id):
            cache.set(cache_key, max_id, 300)

        # Cập nhật trạng thái đã đọc cho participant
        ChatParticipant.objects.update_or_create(
            room=room,
            user=request.user,
            defaults={
                'last_read_message_id': max_id,
                'last_read_at': timezone.now()
            }
        )

        serializer = ChatMessageSerializer(
            messages,
            many=True,
            context={'request': request, 'max_other_read_id': max_other_read_id}
        )
        return Response({
            'success': True,
            'messages': serializer.data,
            'latest_id': max_id,
            'has_more': has_more,
            'max_other_read_id': max_other_read_id
        })

    def post(self, request, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id, is_deleted=False)
        except ChatRoom.DoesNotExist:
            return Response({'success': False, 'message': 'Phòng chat không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        content = request.data.get('content', '').strip()
        files = request.FILES.getlist('files')

        if not content and not files:
            return Response({'success': False, 'message': 'Tin nhắn không có nội dung.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        msg = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            content=content,
            reply_to_id=request.data.get('reply_to_id') or None,
            related_task_id=request.data.get('related_task_id') or None
        )

        for f in files:
            ChatAttachment.objects.create(
                message=msg,
                file=f,
                original_name=f.name,
                file_size=f.size,
                expires_at=now + timedelta(days=30)
            )

        # Cập nhật thời điểm tin nhắn cuối của phòng
        room.last_message_at = now
        room.save(update_fields=['last_message_at'])

        # Cập nhật cache latest_id
        cache_key = f"chat_room_{room_id}_latest_msg_id"
        cache.set(cache_key, msg.id, 300)

        # Đánh dấu người gửi đã đọc tin của chính mình
        ChatParticipant.objects.update_or_create(
            room=room,
            user=request.user,
            defaults={
                'last_read_message_id': msg.id,
                'last_read_at': now
            }
        )

        serializer = ChatMessageSerializer(
            msg,
            context={'request': request, 'max_other_read_id': 0}
        )
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_201_CREATED)


class ChatMarkReadAPIView(views.APIView):
    """Đánh dấu tất cả tin nhắn trong phòng là đã đọc."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        last_msg = ChatMessage.objects.filter(room_id=room_id, is_deleted=False).order_by('-id').first()
        last_id = last_msg.id if last_msg else 0

        ChatParticipant.objects.update_or_create(
            room_id=room_id,
            user=request.user,
            defaults={
                'last_read_message_id': last_id,
                'last_read_at': timezone.now()
            }
        )
        return Response({'success': True, 'last_read_id': last_id})
