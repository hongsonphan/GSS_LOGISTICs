from django.contrib import admin
from .models import TripDocument

@admin.register(TripDocument)
class TripDocumentAdmin(admin.ModelAdmin):
    list_display = ('trip', 'document_type', 'title', 'extracted_container_no', 'extracted_seal_no', 'ocr_confidence', 'is_verified', 'verified_by', 'verified_at', 'is_deleted')
    list_filter = ('document_type', 'is_verified', 'is_deleted', 'created_at')
    search_fields = ('trip__trip_code', 'title', 'extracted_container_no', 'extracted_seal_no')
    date_hierarchy = 'created_at'
