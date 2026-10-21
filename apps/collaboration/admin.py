from django.contrib import admin
from .models import (
    PostCategory, CompanyPost, PostAttachment, PostComment, PostReadStatus,
    OfficeTask, TaskChecklist, TaskComment, TaskAttachment, TaskActivityLog,
    ChatRoom, ChatParticipant, ChatMessage, ChatAttachment, Notification
)

class PostAttachmentInline(admin.TabularInline):
    model = PostAttachment
    extra = 0

class PostCommentInline(admin.TabularInline):
    model = PostComment
    extra = 0

@admin.register(PostCategory)
class PostCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'color', 'icon', 'order', 'is_deleted')
    list_filter = ('is_deleted',)
    search_fields = ('name', 'code')
    ordering = ('order',)

@admin.register(CompanyPost)
class CompanyPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'author', 'is_pinned', 'is_urgent', 'is_published', 'published_at', 'view_count', 'is_deleted')
    list_filter = ('category', 'is_pinned', 'is_urgent', 'is_published', 'is_deleted', 'created_at')
    search_fields = ('title', 'summary', 'content', 'author__username')
    inlines = [PostAttachmentInline, PostCommentInline]
    date_hierarchy = 'created_at'

@admin.register(PostAttachment)
class PostAttachmentAdmin(admin.ModelAdmin):
    list_display = ('post', 'file_name', 'file_size', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('post__title', 'file_name')

@admin.register(PostComment)
class PostCommentAdmin(admin.ModelAdmin):
    list_display = ('post', 'author', 'content', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('post__title', 'author__username', 'content')

@admin.register(PostReadStatus)
class PostReadStatusAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'read_at')
    list_filter = ('read_at',)
    search_fields = ('post__title', 'user__username')

class TaskChecklistInline(admin.TabularInline):
    model = TaskChecklist
    extra = 0

class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0

class TaskAttachmentInline(admin.TabularInline):
    model = TaskAttachment
    extra = 0

@admin.register(OfficeTask)
class OfficeTaskAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'department', 'priority', 'status', 'reporter', 'assignee', 'start_date', 'due_date', 'progress_percent', 'is_deleted')
    list_filter = ('status', 'priority', 'department', 'is_deleted', 'created_at')
    search_fields = ('code', 'title', 'description', 'reporter__username', 'assignee__username')
    inlines = [TaskChecklistInline, TaskCommentInline, TaskAttachmentInline]
    date_hierarchy = 'created_at'

@admin.register(TaskChecklist)
class TaskChecklistAdmin(admin.ModelAdmin):
    list_display = ('task', 'title', 'is_completed', 'completed_at', 'completed_by', 'order', 'is_deleted')
    list_filter = ('is_completed', 'is_deleted')
    search_fields = ('task__code', 'task__title', 'title')
    ordering = ('task', 'order')

@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'author', 'content', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('task__code', 'task__title', 'author__username', 'content')

@admin.register(TaskAttachment)
class TaskAttachmentAdmin(admin.ModelAdmin):
    list_display = ('task', 'original_name', 'file_size', 'uploaded_by', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('task__code', 'task__title', 'original_name')

@admin.register(TaskActivityLog)
class TaskActivityLogAdmin(admin.ModelAdmin):
    list_display = ('task', 'user', 'action', 'description', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('task__code', 'task__title', 'user__username', 'description')
    date_hierarchy = 'created_at'

class ChatParticipantInline(admin.TabularInline):
    model = ChatParticipant
    extra = 0

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'room_type', 'department', 'related_trip', 'created_by', 'last_message_at', 'is_deleted')
    list_filter = ('room_type', 'department', 'is_deleted', 'created_at')
    search_fields = ('name', 'description', 'created_by__username')
    inlines = [ChatParticipantInline]

@admin.register(ChatParticipant)
class ChatParticipantAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'is_admin', 'last_read_at', 'created_at')
    list_filter = ('is_admin', 'created_at')
    search_fields = ('room__name', 'user__username')

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('room', 'sender', 'content', 'related_task', 'is_system_event', 'created_at', 'is_deleted')
    list_filter = ('is_system_event', 'is_deleted', 'created_at')
    search_fields = ('room__name', 'sender__username', 'content')
    date_hierarchy = 'created_at'

@admin.register(ChatAttachment)
class ChatAttachmentAdmin(admin.ModelAdmin):
    list_display = ('message', 'original_name', 'file_size', 'expires_at', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('message__room__name', 'original_name')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'sender', 'notification_type', 'title', 'is_read', 'read_at', 'created_at', 'is_deleted')
    list_filter = ('notification_type', 'is_read', 'is_deleted', 'created_at')
    search_fields = ('recipient__username', 'sender__username', 'title', 'message')
    date_hierarchy = 'created_at'
