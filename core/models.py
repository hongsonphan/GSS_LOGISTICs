import uuid
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
