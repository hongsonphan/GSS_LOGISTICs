from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import CompanyOwnedModel, TimeStampedModel, SoftDeleteModel
from apps.personnel.models import Department, Employee


class TaskPriority(models.TextChoices):
    LOW = 'LOW', 'Thấp'
    MEDIUM = 'MEDIUM', 'Bình thường'
    HIGH = 'HIGH', 'Cao'
    URGENT = 'URGENT', 'Khẩn cấp'


class TaskStatus(models.TextChoices):
    TODO = 'TODO', 'Cần làm'
    IN_PROGRESS = 'IN_PROGRESS', 'Đang thực hiện'
    REVIEW = 'REVIEW', 'Chờ nghiệm thu'
    DONE = 'DONE', 'Hoàn thành'
    CANCELLED = 'CANCELLED', 'Đã hủy'


class TaskExtensionStatus(models.TextChoices):
    NONE = 'NONE', 'Bình thường'
    PENDING = 'PENDING', 'Chờ duyệt gia hạn'
    APPROVED = 'APPROVED', 'Đã duyệt gia hạn'
    REJECTED = 'REJECTED', 'Đã từ chối gia hạn'


class OfficeTask(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """
    Công việc văn phòng nội bộ & Quản lý điều hành (Chuẩn Jira / Asana).
    Áp dụng riêng cho Ban Giám Đốc, Quản lý và Nhân viên Văn phòng các phòng ban.
    Độc lập hoàn toàn với tài xế xe đầu kéo.
    """
    code = models.CharField(max_length=50, unique=True, db_index=True, verbose_name="Mã công việc")
    title = models.CharField(max_length=255, verbose_name="Tên công việc")
    description = models.TextField(blank=True, verbose_name="Mô tả chi tiết")

    department = models.CharField(
        max_length=20,
        choices=Department.choices,
        default=Department.DISPATCH,
        verbose_name="Phòng ban phụ trách"
    )

    priority = models.CharField(
        max_length=20,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
        db_index=True,
        verbose_name="Mức độ ưu tiên"
    )

    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TODO,
        db_index=True,
        verbose_name="Trạng thái"
    )

    # Phân công trách nhiệm
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_tasks',
        verbose_name="Người giao việc"
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
        verbose_name="Người thực hiện chính"
    )
    followers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='followed_tasks',
        verbose_name="Người theo dõi"
    )

    # Mốc thời gian & tiến độ
    start_date = models.DateField(null=True, blank=True, verbose_name="Ngày bắt đầu")
    due_date = models.DateField(null=True, blank=True, db_index=True, verbose_name="Hạn hoàn thành")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Thời điểm hoàn thành")
    progress_percent = models.PositiveSmallIntegerField(default=0, verbose_name="Tiến độ (%)")

    # Quản lý đề xuất & Phê duyệt gia hạn hạn chót (Chuẩn ERP Bim Logistics)
    extension_status = models.CharField(
        max_length=20,
        choices=TaskExtensionStatus.choices,
        default=TaskExtensionStatus.NONE,
        db_index=True,
        verbose_name="Trạng thái đề xuất gia hạn"
    )
    requested_deadline = models.DateField(
        null=True,
        blank=True,
        verbose_name="Hạn mới đề xuất"
    )
    extension_reason = models.TextField(
        blank=True,
        verbose_name="Lý do đề xuất gia hạn"
    )
    extension_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Thời điểm gửi đề xuất gia hạn"
    )
    extension_requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requested_task_extensions',
        verbose_name="Người gửi đề xuất gia hạn"
    )
    extension_reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Thời điểm duyệt gia hạn"
    )
    extension_reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_task_extensions',
        verbose_name="Người duyệt gia hạn"
    )
    extension_review_note = models.TextField(
        blank=True,
        verbose_name="Ghi chú phản hồi duyệt gia hạn"
    )

    # Ngữ cảnh liên kết Logistics tùy chọn (Optional B2B Context)
    related_trip = models.ForeignKey(
        'dispatch.DispatchTrip',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='office_tasks',
        verbose_name="Chuyến xe liên quan"
    )
    related_customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='office_tasks',
        verbose_name="Khách hàng liên quan"
    )
    related_vehicle = models.ForeignKey(
        'fleet.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='office_tasks',
        verbose_name="Đầu xe / Rơ-moóc liên quan"
    )

    class Meta:
        verbose_name = "Công việc Văn phòng"
        verbose_name_plural = "Quản lý Giao việc"
        ordering = ['-priority', 'due_date', '-created_at']

    def __str__(self):
        return f"[{self.code}] {self.title}"

    @property
    def days_remaining(self):
        """Số ngày còn lại đến hạn (dương: còn hạn, 0: hôm nay, âm: quá hạn)."""
        if self.due_date:
            d = self.due_date
            if isinstance(d, str):
                try:
                    from datetime import date
                    d = date.fromisoformat(d[:10])
                except Exception:
                    return None
            return (d - timezone.now().date()).days
        return None

    @property
    def is_overdue(self):
        """Kiểm tra xem task có bị quá hạn không."""
        if self.due_date and self.status not in [TaskStatus.DONE, TaskStatus.CANCELLED]:
            d = self.due_date
            if isinstance(d, str):
                try:
                    from datetime import date
                    d = date.fromisoformat(d[:10])
                except Exception:
                    return False
            return d < timezone.now().date()
        return False

    @property
    def assignee_name(self):
        if self.assignee:
            import re
            employee = getattr(self.assignee, 'employee', None)
            raw = employee.full_name if (employee and employee.full_name) else (self.assignee.get_full_name() or self.assignee.username)
            clean = re.sub(r'\s*\([^)]*\)', '', raw).strip()
            return clean or raw
        return "Chưa phân công"

    @property
    def reporter_name(self):
        if self.reporter:
            import re
            employee = getattr(self.reporter, 'employee', None)
            raw = employee.full_name if (employee and employee.full_name) else (self.reporter.get_full_name() or self.reporter.username)
            clean = re.sub(r'\s*\([^)]*\)', '', raw).strip()
            return clean or raw
        return "Hệ thống"

    @property
    def hashid(self):
        """Mã HashID bảo mật cho URL (/tasks/<hashid>/) chống IDOR."""
        from core.security import get_task_hashid
        return get_task_hashid(self.id)

    def recalculate_progress(self):
        """Tự động tính lại % tiến độ dựa trên số lượng checklist đã hoàn thành."""
        total = self.checklists.filter(is_deleted=False).count()
        if total == 0:
            if self.status == TaskStatus.DONE:
                self.progress_percent = 100
            elif self.status == TaskStatus.IN_PROGRESS:
                self.progress_percent = max(self.progress_percent, 50)
            else:
                self.progress_percent = 0
        else:
            done_count = self.checklists.filter(is_deleted=False, is_completed=True).count()
            self.progress_percent = int((done_count / total) * 100)
            if self.progress_percent == 100 and self.status != TaskStatus.DONE:
                self.status = TaskStatus.REVIEW
        self.save(update_fields=['progress_percent', 'status'])


class TaskChecklist(TimeStampedModel, SoftDeleteModel):
    """Mục kiểm tra / công việc con trong một Task."""
    task = models.ForeignKey(OfficeTask, on_delete=models.CASCADE, related_name='checklists')
    title = models.CharField(max_length=255, verbose_name="Nội dung mục kiểm tra")
    is_completed = models.BooleanField(default=False, verbose_name="Đã hoàn thành")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Thời điểm hoàn thành")
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_checklists'
    )
    order = models.PositiveIntegerField(default=0, verbose_name="Thứ tự")

    class Meta:
        verbose_name = "Mục kiểm tra Task"
        verbose_name_plural = "Mục kiểm tra Task"
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.title} ({'✓' if self.is_completed else '○'})"


class TaskComment(TimeStampedModel, SoftDeleteModel):
    """Trao đổi & Thảo luận trực tiếp trên Task."""
    task = models.ForeignKey(OfficeTask, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_comments')
    content = models.TextField(verbose_name="Nội dung trao đổi")

    class Meta:
        verbose_name = "Thảo luận Task"
        verbose_name_plural = "Thảo luận Task"
        ordering = ['created_at']

    @property
    def author_name(self):
        employee = getattr(self.author, 'employee', None)
        if employee:
            return employee.full_name
        return self.author.get_full_name() or self.author.username


class TaskAttachment(TimeStampedModel, SoftDeleteModel):
    """Tệp đính kèm công việc (Hợp đồng, excel, ảnh sự cố, bản vẽ, tài liệu hướng dẫn)."""
    task = models.ForeignKey(OfficeTask, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='office_tasks/%Y/%m/', verbose_name="Tệp đính kèm")
    original_name = models.CharField(max_length=255, verbose_name="Tên tệp gốc")
    file_size = models.PositiveIntegerField(default=0, verbose_name="Dung lượng (bytes)")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = "Đính kèm Task"
        verbose_name_plural = "Đính kèm Task"

    def __str__(self):
        return self.original_name


class TaskActivityLog(models.Model):
    """Nhật ký thay đổi trạng thái và hoạt động của Task (Audit Trail)."""
    task = models.ForeignKey(OfficeTask, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100, verbose_name="Hành động")
    description = models.TextField(verbose_name="Chi tiết thay đổi")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Nhật ký Task"
        verbose_name_plural = "Nhật ký Task"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.action} ({self.created_at.strftime('%d/%m/%Y %H:%M')})"


# Cách ly đa doanh nghiệp cho model con không có cột company (xem core.models.tenant_scope)
TaskChecklist.tenant_path = 'task__company'
TaskComment.tenant_path = 'task__company'
TaskAttachment.tenant_path = 'task__company'
