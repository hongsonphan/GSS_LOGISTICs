"""Chứng từ theo chặng (Nhận / Giao / Hạ rỗng): bắt buộc 1–10 file mỗi chặng, kiểm tra ở máy chủ."""
import uuid

from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.db import transaction

from apps.dispatch.gss_workflow import MAX_FILES_PER_STAGE, STAGE_LABELS, stage_file_count
from apps.dispatch.models import DispatchTrip
from apps.documents.models import DocumentType, TripDocument
from core.validators import optimize_and_resize_image, sanitize_filename, validate_uploaded_document

STAGE_DOC_TYPE = {'PICKUP': DocumentType.EIR_PICKUP, 'DELIVERY': DocumentType.POD, 'EMPTY_RETURN': DocumentType.EIR_DROPOFF}


def serialize(doc):
    return {'id': doc.id, 'stage': doc.workflow_stage, 'seq': doc.sequence_no, 'title': doc.title, 'url': doc.file_path,
            'by': doc.uploaded_by_label, 'at': doc.created_at.isoformat()}


def list_attachments(trip):
    docs = TripDocument.objects.filter(trip=trip, is_deleted=False).exclude(workflow_stage='').order_by('workflow_stage', 'sequence_no')
    return [serialize(d) for d in docs]


def counts(trip):
    return {stage: stage_file_count(trip, stage) for stage in STAGE_LABELS}


def add_attachments(trip, stage, files, *, label=''):
    """Thêm file vào chặng; hoặc tất cả cùng được nhận hoặc không file nào (trả lỗi rõ ràng)."""
    if stage not in STAGE_LABELS:
        raise ValidationError('Chặng chứng từ không hợp lệ.')
    files = list(files or [])
    if not files:
        raise ValidationError('Chưa chọn file nào.')
    # Kiểm tra trước toàn bộ file để không lưu dở dang
    for f in files:
        validate_uploaded_document(f)
    saved_names = []
    try:
        with transaction.atomic():
            locked = DispatchTrip.objects.select_for_update().get(pk=trip.pk)
            if locked.step_status == 'CANCELLED':
                raise ValidationError('Chuyến đã hủy, không thể thêm chứng từ.')
            existing = stage_file_count(locked, stage)
            if existing + len(files) > MAX_FILES_PER_STAGE:
                left = MAX_FILES_PER_STAGE - existing
                raise ValidationError(f'Mỗi chặng tối đa {MAX_FILES_PER_STAGE} file; chặng "{STAGE_LABELS[stage]}" còn nhận thêm được {max(left, 0)} file.')
            seq = (TripDocument.objects.filter(trip=locked, workflow_stage=stage).order_by('-sequence_no')
                   .values_list('sequence_no', flat=True).first() or 0)
            created = []
            for f in files:
                seq += 1
                opt = optimize_and_resize_image(f)
                name = default_storage.save(f'gss_docs/{locked.trip_code}/{stage}_{seq:02d}_{uuid.uuid4().hex[:10]}_{sanitize_filename(opt.name)}', opt)
                saved_names.append(name)
                created.append(TripDocument.objects.create(
                    trip=locked, document_type=STAGE_DOC_TYPE[stage], title=f'{STAGE_LABELS[stage]} #{seq}',
                    file_path=f'/media/{name}', workflow_stage=stage, sequence_no=seq, uploaded_by_label=label[:150],
                    extracted_container_no=locked.container_number, extracted_seal_no=locked.seal_number, ocr_confidence=0))
            return created
    except Exception:
        for name in saved_names:  # hoàn tác file đã ghi nếu giao dịch lỗi
            try:
                default_storage.delete(name)
            except Exception:
                pass
        raise


def remove_attachment(trip, doc_id, *, user, reason):
    """Chỉ nhân viên được gỡ chứng từ (xóa mềm, giữ file) và phải có lý do."""
    if not (user and user.is_authenticated):
        raise ValidationError('Chỉ nhân viên được gỡ chứng từ.')
    if len((reason or '').strip()) < 5:
        raise ValidationError('Cần nhập lý do gỡ chứng từ.')
    doc = TripDocument.objects.filter(pk=doc_id, trip=trip, is_deleted=False).exclude(workflow_stage='').first()
    if not doc:
        raise ValidationError('Không tìm thấy chứng từ.')
    doc.delete()  # xóa mềm
    from core.models import TrackingEventLog
    TrackingEventLog.objects.create(trip=trip, event_type='DOC_REMOVED', title=f'Gỡ chứng từ {doc.title}', description=reason,
                                    metadata={'by': user.get_username(), 'doc_id': doc.id, 'stage': doc.workflow_stage})
    return doc
