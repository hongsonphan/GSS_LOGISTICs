from datetime import timedelta
from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import CompanyOwnedModel, TimeStampedModel, SoftDeleteModel
from apps.personnel.models import Department, Employee


class RoomType(models.TextChoices):
    COMPANY = 'COMPANY', 'Toàn thể Văn phòng'
    DEPARTMENT = 'DEPARTMENT', 'Kênh Phòng ban'
    TRIP = 'TRIP', 'Kênh Chuyến xe'
    DIRECT = 'DIRECT', 'Tin nhắn Trực tiếp (1-1)'
    GROUP = 'GROUP', 'Nhóm Dự án / Tự tạo'


class ChatRoom(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Phòng trò chuyện & Kênh thảo luận văn phòng."""
    name = models.CharField(max_length=255, verbose_name="Tên phòng chat")
    room_type = models.CharField(
        max_length=20,
        choices=RoomType.choices,
        default=RoomType.COMPANY,
        db_index=True,
        verbose_name="Loại kênh"
    )
    description = models.TextField(blank=True, verbose_name="Mô tả kênh")
    
    department = models.CharField(
        max_length=20,
        choices=Department.choices,
        null=True,
        blank=True,
        verbose_name="Phòng ban trực thuộc"
    )

    related_trip = models.ForeignKey(
        'dispatch.DispatchTrip',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_rooms',
        verbose_name="Chuyến xe liên quan"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_chat_rooms',
        verbose_name="Người tạo kênh"
    )

    last_message_at = models.DateTimeField(null=True, blank=True, verbose_name="Thời điểm tin nhắn cuối")

    class Meta:
        verbose_name = "Phòng Trò chuyện"
        verbose_name_plural = "Phòng Trò chuyện"
        ordering = ['-last_message_at', '-created_at']

    def __str__(self):
        return f"[{self.get_room_type_display()}] {self.name}"


class ChatParticipant(TimeStampedModel):
    """Người tham gia phòng trò chuyện."""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_participations')
    last_read_message_id = models.PositiveIntegerField(default=0, verbose_name="ID tin nhắn đã đọc sau cùng")
    last_read_at = models.DateTimeField(null=True, blank=True)
    is_admin = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Thành viên Phòng chat"
        verbose_name_plural = "Thành viên Phòng chat"
        unique_together = ('room', 'user')

    def __str__(self):
        return f"{self.user.username} in {self.room.name}"


class ChatMessage(TimeStampedModel, SoftDeleteModel):
    """Tin nhắn thảo luận trong phòng chat."""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_collaboration_messages',
        verbose_name="Người gửi"
    )
    content = models.TextField(blank=True, verbose_name="Nội dung tin nhắn")
    
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name="Trả lời tin nhắn"
    )

    # Đính kèm ngữ cảnh nhanh (Optional Quick Reference)
    related_task = models.ForeignKey(
        'collaboration.OfficeTask',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chat_mentions',
        verbose_name="Gắn thẻ công việc"
    )

    is_system_event = models.BooleanField(default=False, verbose_name="Tin nhắn hệ thống")

    class Meta:
        verbose_name = "Tin nhắn"
        verbose_name_plural = "Tin nhắn"
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:30]}"

    @property
    def sender_name(self):
        employee = getattr(self.sender, 'employee', None)
        if employee:
            return employee.full_name
        return self.sender.get_full_name() or self.sender.username


class ChatAttachment(TimeStampedModel, SoftDeleteModel):
    """File hoặc hình ảnh đính kèm tin nhắn chat."""
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='chat_attachments/%Y/%m/', verbose_name="Tệp đính kèm")
    original_name = models.CharField(max_length=255, verbose_name="Tên tệp gốc")
    file_size = models.PositiveIntegerField(default=0, verbose_name="Dung lượng (bytes)")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Ngày hết hạn lưu trữ")

    class Meta:
        verbose_name = "Đính kèm Chat"
        verbose_name_plural = "Đính kèm Chat"

    def __str__(self):
        return self.original_name

    def save(self, *args, **kwargs):
        if not self.id and not self.expires_at:
            # Tự động gán thời hạn 30 ngày để tiết kiệm dung lượng như bim_consulting
            self.expires_at = timezone.now() + timedelta(days=30)
        super().save(*args, **kwargs)
