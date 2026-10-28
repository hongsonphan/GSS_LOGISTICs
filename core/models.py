import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone

class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def dead(self):
        return self.filter(is_deleted=True)

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(is_deleted=False)

class AllObjectsManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """Soft delete - Không bao giờ xóa cứng dữ liệu vận tải và chứng từ."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def hard_delete(self, using=None, keep_parents=False):
        """Chỉ cho phép chạy trong môi trường test nếu bắt buộc."""
        super().delete(using=using, keep_parents=keep_parents)

class TrackingEventLog(TimeStampedModel):
    """
    Chuỗi sự kiện bất biến (Immutable Event Sourcing).
    Ghi nhận mọi mốc quét mã, thay đổi trạng thái, vị trí trạm và chứng từ.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, related_name='event_logs')
    actor = models.ForeignKey('personnel.Employee', on_delete=models.PROTECT, null=True, blank=True)
    event_type = models.CharField(max_length=50, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    event_time = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-event_time']
        indexes = [
            models.Index(fields=['trip', 'event_type']),
            models.Index(fields=['event_time']),
        ]

    def __str__(self):
        return f"[{self.event_time.strftime('%d/%m %H:%M')}] {self.title}"


class DocumentSequence(models.Model):
    """Bộ đếm số thứ tự chứng từ theo tiền tố (mỗi tiền tố một dòng). Dùng qua core.sequences.next_code()."""
    key = models.CharField(max_length=150, unique=True)
    last_value = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Bộ đếm mã chứng từ'
        verbose_name_plural = 'Bộ đếm mã chứng từ'

    def __str__(self):
        return f"{self.key} = {self.last_value}"


class Company(TimeStampedModel):
    """Doanh nghiệp sử dụng hệ thống (tenant). Hiện tại chỉ có Triền Võ; sẵn sàng phục vụ nhiều công ty khi bán SaaS."""
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=255)
    tax_code = models.CharField(max_length=30, blank=True, default='')
    is_default = models.BooleanField(default=False, help_text='Công ty mặc định gán cho dữ liệu mới khi chưa chọn công ty')
    is_active = models.BooleanField(default=True)
    accounting_regime = models.CharField(
        max_length=10, default='TT133',
        choices=[('TT133', 'Thông tư 133/2016 (DN nhỏ và vừa)'), ('TT200', 'Thông tư 200/2014')],
        help_text='Chế độ kế toán áp dụng: quyết định hệ thống tài khoản và mẫu sổ sách')
    ledger_account_overrides = models.JSONField(
        default=dict, blank=True,
        help_text='Ghi đè tài khoản hạch toán mặc định, vd {"fuel": "1521"} (xem apps/ledger/charts.py)')

    class Meta:
        verbose_name = 'Doanh nghiệp (tenant)'
        verbose_name_plural = 'Doanh nghiệp (tenant)'
        ordering = ['id']

    def __str__(self):
        return f"{self.code} - {self.name}"


def get_default_company():
    """Công ty mặc định (tạo nếu chưa có). Dùng khi dữ liệu mới chưa được gán công ty."""
    company = Company.objects.filter(is_default=True).order_by('id').first() or Company.objects.order_by('id').first()
    if company is None:
        company = Company.objects.create(code='DEFAULT', name='Công ty mặc định', is_default=True)
    return company


class CompanyOwnedModel(models.Model):
    """Dữ liệu thuộc về một doanh nghiệp (tenant). Tự gán công ty mặc định khi lưu nếu chưa có."""
    company = models.ForeignKey(
        'core.Company', on_delete=models.PROTECT, null=True, blank=True,
        related_name='+', db_index=True, verbose_name='Doanh nghiệp',
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.company_id is None:
            self.company = get_default_company()
            update_fields = kwargs.get('update_fields')
            if update_fields is not None and 'company' not in update_fields:
                kwargs['update_fields'] = list(update_fields) + ['company']
        super().save(*args, **kwargs)


class AuditLog(models.Model):
    """Nhật ký kiểm toán bất biến: ai đã tạo / sửa / xoá dữ liệu nghiệp vụ, lúc nào, thay đổi gì."""
    ACTION_CHOICES = [('create', 'Tạo mới'), ('update', 'Cập nhật'), ('delete', 'Xoá')]

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    actor_label = models.CharField(max_length=150, blank=True, default='', help_text='Tên đăng nhập hoặc "tài xế qua link", "hệ thống"')
    ip_address = models.CharField(max_length=64, blank=True, default='')
    action = models.CharField(max_length=10, choices=ACTION_CHOICES, db_index=True)
    model_label = models.CharField(max_length=100, db_index=True)
    object_id = models.CharField(max_length=64, db_index=True)
    object_repr = models.CharField(max_length=255, blank=True, default='')
    changes = models.JSONField(default=dict, blank=True)
    company = models.ForeignKey('core.Company', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Nhật ký kiểm toán'
        verbose_name_plural = 'Nhật ký kiểm toán'
        indexes = [models.Index(fields=['model_label', 'object_id'])]

    def __str__(self):
        return f"[{self.created_at:%d/%m/%Y %H:%M}] {self.actor_label} {self.action} {self.model_label}#{self.object_id}"
