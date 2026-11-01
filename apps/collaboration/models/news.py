from django.db import models
from django.conf import settings
from core.models import CompanyOwnedModel, TimeStampedModel, SoftDeleteModel
from apps.personnel.models import Department, Employee


class PostCategory(TimeStampedModel, SoftDeleteModel):
    """Danh mục bản tin nội bộ công ty."""
    name = models.CharField(max_length=100, verbose_name="Tên danh mục")
    code = models.CharField(max_length=50, unique=True, verbose_name="Mã danh mục")
    color = models.CharField(max_length=20, default="#0d9488", verbose_name="Màu nhận diện") # Mã hex Tailwind/CSS
    icon = models.CharField(max_length=50, default="ph-newspaper", verbose_name="Icon Phosphor")
    order = models.PositiveIntegerField(default=0, verbose_name="Thứ tự hiển thị")

    class Meta:
        verbose_name = "Danh mục Bản tin"
        verbose_name_plural = "Danh mục Bản tin"
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class CompanyPost(CompanyOwnedModel, TimeStampedModel, SoftDeleteModel):
    """Bài viết / Thông báo bản tin công ty dành cho nhân viên văn phòng & quản lý."""
    title = models.CharField(max_length=255, verbose_name="Tiêu đề thông báo")
    category = models.ForeignKey(
        PostCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='posts',
        verbose_name="Danh mục"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='company_posts',
        verbose_name="Người đăng"
    )
    summary = models.TextField(blank=True, verbose_name="Tóm tắt ngắn")
    content = models.TextField(verbose_name="Nội dung bài viết")
    cover_image = models.FileField(
        upload_to='company_news/covers/%Y/%m/', 
        null=True, 
        blank=True, 
        verbose_name="Ảnh bìa"
    )
    
    # Cấu hình nổi bật & phạm vi
    is_pinned = models.BooleanField(default=False, db_index=True, verbose_name="Ghim lên đầu trang")
    is_urgent = models.BooleanField(default=False, db_index=True, verbose_name="Thông báo khẩn cấp")
    target_department = models.CharField(
        max_length=20, 
        choices=[('ALL', 'Toàn thể công ty')] + list(Department.choices),
        default='ALL',
        verbose_name="Phòng ban đích"
    )

    is_published = models.BooleanField(default=True, db_index=True, verbose_name="Đã xuất bản")
    published_at = models.DateTimeField(null=True, blank=True, verbose_name="Thời gian xuất bản")
    view_count = models.PositiveIntegerField(default=0, verbose_name="Lượt xem")

    class Meta:
        verbose_name = "Bản tin Công ty"
        verbose_name_plural = "Bản tin Công ty"
        ordering = ['-is_pinned', '-is_urgent', '-created_at']

    def __str__(self):
        return self.title

    @property
    def author_name(self):
        if self.author:
            employee = getattr(self.author, 'employee', None)
            if employee:
                return employee.full_name
            return self.author.get_full_name() or self.author.username
        return "Ban Giám Đốc"

    @property
    def comments_count(self):
        return self.comments.filter(is_deleted=False).count()

    @property
    def hashid(self):
        """Mã HashID bảo mật cho URL (/news/<hashid>/) chống IDOR."""
        from core.security import get_news_hashid
        return get_news_hashid(self.id)


class PostAttachment(TimeStampedModel, SoftDeleteModel):
    """Tệp đính kèm bài viết bản tin (PDF, văn bản, thông tư, quy chế)."""
    post = models.ForeignKey(CompanyPost, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='company_news/attachments/%Y/%m/', verbose_name="Tệp đính kèm")
    file_name = models.CharField(max_length=255, verbose_name="Tên tệp gốc")
    file_size = models.PositiveIntegerField(default=0, verbose_name="Dung lượng (bytes)")

    class Meta:
        verbose_name = "Đính kèm Bản tin"
        verbose_name_plural = "Đính kèm Bản tin"

    def __str__(self):
        return self.file_name


class PostComment(TimeStampedModel, SoftDeleteModel):
    """Bình luận & phản hồi dưới bài viết bản tin công ty."""
    post = models.ForeignKey(CompanyPost, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_comments')
    content = models.TextField(verbose_name="Nội dung phản hồi")

    class Meta:
        verbose_name = "Bình luận Bản tin"
        verbose_name_plural = "Bình luận Bản tin"
        ordering = ['created_at']

    def __str__(self):
        return f"{self.author.username} trên {self.post.title}"

    @property
    def author_name(self):
        employee = getattr(self.author, 'employee', None)
        if employee:
            return employee.full_name
        return self.author.get_full_name() or self.author.username


class PostReadStatus(models.Model):
    """Ghi nhận nhân viên nào đã đọc thông báo bản tin."""
    post = models.ForeignKey(CompanyPost, on_delete=models.CASCADE, related_name='read_statuses')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='read_posts')
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Trạng thái đọc Bản tin"
        verbose_name_plural = "Trạng thái đọc Bản tin"
        unique_together = ('post', 'user')


# Cách ly đa doanh nghiệp cho model con không có cột company (xem core.models.tenant_scope)
PostAttachment.tenant_path = 'post__company'
PostComment.tenant_path = 'post__company'
