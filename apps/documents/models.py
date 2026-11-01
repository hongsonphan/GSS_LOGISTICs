from django.db import models
from core.models import TimeStampedModel, SoftDeleteModel

class DocumentType(models.TextChoices):
    EIR_PICKUP = 'EIR_PICKUP', 'Phiếu EIR Lấy Cont'
    EIR_DROPOFF = 'EIR_DROPOFF', 'Phiếu EIR Hạ Cont'
    POD = 'POD', 'Biên bản giao nhận có chữ ký (POD)'
    WEIGHT_TICKET = 'WEIGHT_TICKET', 'Phiếu Cân Hàng/Xe'
    CONTAINER_CHECK = 'CONTAINER_CHECK', 'Ảnh giám định vỏ Cont'
    SEAL_IMAGE = 'SEAL_IMAGE', 'Ảnh Niêm Phong Chì (Seal)'
    INCIDENT_PHOTO = 'INCIDENT_PHOTO', 'Ảnh Hiện Trường Sự Cố'
    INVOICE = 'INVOICE', 'Hóa đơn GTGT nâng hạ / cước'
    BOOKING_NOTE = 'BOOKING_NOTE', 'File Booking / Lệnh cấp rỗng'

class TripDocument(TimeStampedModel, SoftDeleteModel):
    """
    Quản lý chứng từ pháp lý số chụp từ hiện trường.
    Hỗ trợ OCR AI trích xuất tự động thông tin đối chiếu số Cont, số Seal.
    """
    trip = models.ForeignKey('dispatch.DispatchTrip', on_delete=models.PROTECT, related_name='documents')
    document_type = models.CharField(max_length=30, choices=DocumentType.choices, default=DocumentType.EIR_DROPOFF)
    title = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500, blank=True)
    
    # Kết quả OCR AI phân tích
    ocr_raw_text = models.TextField(blank=True, help_text="Dữ liệu OCR thô trích xuất từ tài liệu")
    ocr_confidence = models.IntegerField(default=95, help_text="Độ tin cậy nhận diện (%)")
    extracted_container_no = models.CharField(max_length=30, blank=True)
    extracted_seal_no = models.CharField(max_length=50, blank=True)
    
    # Nghiệm thu từ điều phối viên
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey('personnel.Employee', on_delete=models.SET_NULL, null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_document_type_display()}] {self.trip.trip_code} - {self.title}"


# Cách ly đa doanh nghiệp cho model con không có cột company (xem core.models.tenant_scope)
TripDocument.tenant_path = 'trip__company'
