from django.db import models
from django.conf import settings
from core.models import TimeStampedModel, SoftDeleteModel


class NotificationType(models.TextChoices):
    TASK_ASSIGNED = 'TASK_ASSIGNED', 'Được giao công việc mới'
    TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED', 'Cập nhật trạng thái công việc'
    TASK_COMMENT = 'TASK_COMMENT', 'Thảo luận trong công việc'
    TASK_EXTENSION_REQUESTED = 'TASK_EXTENSION_REQUESTED', 'Đề xuất gia hạn hạn chót'
    TASK_EXTENSION_REVIEWED = 'TASK_EXTENSION_REVIEWED', 'Kết quả duyệt gia hạn hạn chót'
    NEWS_URGENT = 'NEWS_URGENT', 'Bản tin khẩn cấp từ Ban Giám Đốc'
    NEWS_NEW = 'NEWS_NEW', 'Bản tin công ty mới'
    CHAT_MENTION = 'CHAT_MENTION', 'Được nhắc tên trong tin nhắn'
    SYSTEM = 'SYSTEM', 'Thông báo hệ thống'


class Notification(TimeStampedModel, SoftDeleteModel):
    """
    Thông báo đẩy nội bộ (In-App Notification) hiển thị lên biểu tượng Chuông của từng người.
    """
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Người nhận thông báo"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_notifications',
        verbose_name="Người gửi / kích hoạt"
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True
    )
    title = models.CharField(max_length=255, verbose_name="Tiêu đề thông báo")
    message = models.TextField(verbose_name="Nội dung thông báo")
    
    # Mục tiêu điều hướng khi người dùng nhấp vào thông báo
    target_type = models.CharField(max_length=50, blank=True, help_text="TASK, NEWS, CHAT, SYSTEM")
    target_id = models.IntegerField(null=True, blank=True, help_text="ID của đối tượng (Task ID, Post ID, Room ID)")
    link_url = models.CharField(max_length=255, blank=True, help_text="Đường dẫn anchor (#tasks, #news, ...)")

    is_read = models.BooleanField(default=False, db_index=True, verbose_name="Đã đọc")
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="Thời điểm đọc")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Thông báo nội bộ"
        verbose_name_plural = "Thông báo nội bộ"

    def __str__(self):
        return f"[{self.recipient.username}] {self.title} ({'Đã đọc' if self.is_read else 'Chưa đọc'})"
