from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.collaboration.models import (
    PostCategory, CompanyPost, PostAttachment, PostComment, PostReadStatus,
    TaskPriority, TaskStatus, OfficeTask, TaskChecklist, TaskComment, TaskAttachment, TaskActivityLog,
    RoomType, ChatRoom, ChatParticipant, ChatMessage, ChatAttachment, Notification
)
from apps.personnel.models import Employee

User = get_user_model()


class UserSimpleSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    employee_code = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'employee_code', 'department']

    def get_full_name(self, obj):
        import re
        employee = getattr(obj, 'employee', None)
        raw = employee.full_name if (employee and employee.full_name) else (obj.get_full_name() or obj.username)
        clean = re.sub(r'\s*\([^)]*\)', '', raw).strip()
        return clean or raw

    def get_employee_code(self, obj):
        employee = getattr(obj, 'employee', None)
        return employee.code if employee else ''

    def get_department(self, obj):
        employee = getattr(obj, 'employee', None)
        return employee.get_department_display() if employee else ''


# ==========================================
# SERIALIZERS BẢN TIN CÔNG TY
# ==========================================

class PostCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PostCategory
        fields = ['id', 'name', 'code', 'color', 'icon', 'order']


class PostCommentSerializer(serializers.ModelSerializer):
    author_info = UserSimpleSerializer(source='author', read_only=True)

    class Meta:
        model = PostComment
        fields = ['id', 'post', 'author', 'author_info', 'content', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']


class PostAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostAttachment
        fields = ['id', 'file', 'file_name', 'file_size', 'created_at']


class CompanyPostListSerializer(serializers.ModelSerializer):
    category_info = PostCategorySerializer(source='category', read_only=True)
    author_name = serializers.CharField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = CompanyPost
        fields = [
            'id', 'hashid', 'title', 'category', 'category_info', 'author_name',
            'summary', 'cover_image', 'is_pinned', 'is_urgent',
            'target_department', 'published_at', 'view_count',
            'comments_count', 'is_read', 'created_at'
        ]

    def get_is_read(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return PostReadStatus.objects.filter(post=obj, user=user).exists()
        return False


class CompanyPostDetailSerializer(serializers.ModelSerializer):
    category_info = PostCategorySerializer(source='category', read_only=True)
    author_info = UserSimpleSerializer(source='author', read_only=True)
    comments = serializers.SerializerMethodField()
    attachments = PostAttachmentSerializer(many=True, read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = CompanyPost
        fields = [
            'id', 'hashid', 'title', 'category', 'category_info', 'author_info',
            'summary', 'content', 'cover_image', 'is_pinned', 'is_urgent',
            'target_department', 'is_published', 'published_at', 'view_count',
            'attachments', 'comments', 'is_read', 'created_at', 'updated_at'
        ]

    def get_comments(self, obj):
        comments = obj.comments.filter(is_deleted=False).order_by('created_at')
        return PostCommentSerializer(comments, many=True, context=self.context).data

    def get_is_read(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return PostReadStatus.objects.filter(post=obj, user=user).exists()
        return False


# ==========================================
# SERIALIZERS GIAO VIỆC VĂN PHÒNG (TASKS)
# ==========================================

class TaskChecklistSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskChecklist
        fields = ['id', 'task', 'title', 'is_completed', 'completed_at', 'completed_by_name', 'order']
        read_only_fields = ['id', 'completed_at', 'completed_by_name']

    def get_completed_by_name(self, obj):
        if obj.completed_by:
            employee = getattr(obj.completed_by, 'employee', None)
            return employee.full_name if employee else obj.completed_by.username
        return None


class TaskCommentSerializer(serializers.ModelSerializer):
    author_info = UserSimpleSerializer(source='author', read_only=True)

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'author', 'author_info', 'content', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']


class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskAttachment
        fields = ['id', 'task', 'file', 'original_name', 'file_size', 'uploaded_by_name', 'created_at']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            employee = getattr(obj.uploaded_by, 'employee', None)
            return employee.full_name if employee else obj.uploaded_by.username
        return None


class TaskActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskActivityLog
        fields = ['id', 'user_name', 'action', 'description', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            employee = getattr(obj.user, 'employee', None)
            return employee.full_name if employee else obj.user.username
        return "Hệ thống"


class OfficeTaskListSerializer(serializers.ModelSerializer):
    assignee_info = UserSimpleSerializer(source='assignee', read_only=True)
    reporter_info = UserSimpleSerializer(source='reporter', read_only=True)
    followers_info = UserSimpleSerializer(source='followers', many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    checklists_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    extension_requested_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OfficeTask
        fields = [
            'id', 'hashid', 'code', 'title', 'department', 'priority', 'status',
            'assignee', 'assignee_info', 'reporter', 'reporter_info',
            'followers', 'followers_info',
            'start_date', 'due_date', 'days_remaining', 'progress_percent', 'is_overdue',
            'extension_status', 'requested_deadline', 'extension_reason',
            'extension_requested_at', 'extension_requested_by', 'extension_requested_by_name',
            'related_trip', 'related_customer', 'related_vehicle',
            'checklists_count', 'comments_count', 'created_at'
        ]

    def get_extension_requested_by_name(self, obj):
        if obj.extension_requested_by:
            emp = getattr(obj.extension_requested_by, 'employee', None)
            return emp.full_name if emp else (obj.extension_requested_by.get_full_name() or obj.extension_requested_by.username)
        return None

    def get_checklists_count(self, obj):
        total = obj.checklists.filter(is_deleted=False).count()
        done = obj.checklists.filter(is_deleted=False, is_completed=True).count()
        return {'total': total, 'done': done}

    def get_comments_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()


class OfficeTaskDetailSerializer(serializers.ModelSerializer):
    assignee_info = UserSimpleSerializer(source='assignee', read_only=True)
    reporter_info = UserSimpleSerializer(source='reporter', read_only=True)
    followers_info = UserSimpleSerializer(source='followers', many=True, read_only=True)
    checklists = TaskChecklistSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    activities = TaskActivityLogSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    extension_requested_by_info = UserSimpleSerializer(source='extension_requested_by', read_only=True)
    extension_reviewed_by_info = UserSimpleSerializer(source='extension_reviewed_by', read_only=True)
    related_trip_code = serializers.SerializerMethodField()
    related_customer_name = serializers.SerializerMethodField()
    related_vehicle_plate = serializers.SerializerMethodField()

    class Meta:
        model = OfficeTask
        fields = [
            'id', 'hashid', 'code', 'title', 'description', 'department', 'priority', 'status',
            'assignee', 'assignee_info', 'reporter', 'reporter_info',
            'followers', 'followers_info',
            'start_date', 'due_date', 'days_remaining', 'completed_at', 'progress_percent', 'is_overdue',
            'extension_status', 'requested_deadline', 'extension_reason',
            'extension_requested_at', 'extension_requested_by', 'extension_requested_by_info',
            'extension_reviewed_at', 'extension_reviewed_by', 'extension_reviewed_by_info',
            'extension_review_note',
            'related_trip', 'related_trip_code',
            'related_customer', 'related_customer_name',
            'related_vehicle', 'related_vehicle_plate',
            'checklists', 'comments', 'attachments', 'activities',
            'created_at', 'updated_at'
        ]

    def get_related_trip_code(self, obj):
        return obj.related_trip.trip_code if obj.related_trip else None

    def get_related_customer_name(self, obj):
        return obj.related_customer.name if obj.related_customer else None

    def get_related_vehicle_plate(self, obj):
        return obj.related_vehicle.plate_number if obj.related_vehicle else None


# ==========================================
# SERIALIZERS CHAT NỘI BỘ VĂN PHÒNG
# ==========================================

class ChatAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatAttachment
        fields = ['id', 'file', 'original_name', 'file_size', 'expires_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_info = UserSimpleSerializer(source='sender', read_only=True)
    attachments = ChatAttachmentSerializer(many=True, read_only=True)
    reply_to_snippet = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'sender', 'sender_info', 'content',
            'reply_to', 'reply_to_snippet', 'related_task',
            'is_system_event', 'attachments', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'sender', 'created_at']

    def get_reply_to_snippet(self, obj):
        if obj.reply_to:
            sender_name = obj.reply_to.sender_name
            snippet = obj.reply_to.content[:50]
            return {'id': obj.reply_to.id, 'sender_name': sender_name, 'snippet': snippet}
        return None

    def get_is_read(self, obj):
        max_other_read_id = self.context.get('max_other_read_id')
        if max_other_read_id is not None:
            return obj.id <= max_other_read_id
        return obj.room.participants.exclude(user=obj.sender).filter(last_read_message_id__gte=obj.id).exists()


class ChatRoomListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'name', 'room_type', 'room_type_display', 'description',
            'department', 'related_trip', 'last_message_at',
            'last_message', 'unread_count'
        ]

    def get_last_message(self, obj):
        msg = obj.messages.filter(is_deleted=False).order_by('-created_at').first()
        if msg:
            return {
                'id': msg.id,
                'sender_name': msg.sender_name,
                'content': msg.content,
                'created_at': msg.created_at
            }
        return None

    def get_unread_count(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if not user or not user.is_authenticated:
            return 0
        part = obj.participants.filter(user=user).first()
        last_read_id = part.last_read_message_id if part else 0
        return obj.messages.filter(is_deleted=False, id__gt=last_read_id).exclude(sender=user).count()


# ==========================================
# SERIALIZERS THÔNG BÁO NỘI BỘ (BELL)
# ==========================================

class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'sender', 'sender_name',
            'notification_type', 'type_display', 'title', 'message',
            'target_type', 'target_id', 'link_url',
            'is_read', 'read_at', 'created_at'
        ]

    def get_sender_name(self, obj):
        if obj.sender:
            emp = getattr(obj.sender, 'employee', None)
            return emp.full_name if emp else (obj.sender.get_full_name() or obj.sender.username)
        return "Hệ thống"
