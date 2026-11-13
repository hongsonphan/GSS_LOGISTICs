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


def _exif(f):
    """EXIF của ảnh gốc: giờ chụp, GPS, thiết bị (không lỗi nếu không có)."""
    out = {}
    try:
        from PIL import ExifTags, Image
        f.seek(0)
        img = Image.open(f)
        ex = img.getexif()
        if ex:
            dt = ex.get(36867) or ex.get(306)
            if not dt:
                sub = ex.get_ifd(0x8769)
                dt = sub.get(36867) if sub else None
            if dt:
                out['taken_at'] = str(dt)[:25]
            if ex.get(271) or ex.get(272):
                out['device'] = f'{ex.get(271) or ""} {ex.get(272) or ""}'.strip()[:80]
            gps = ex.get_ifd(0x8825)
            if gps and gps.get(2) and gps.get(4):
                def deg(v, ref):
                    d = float(v[0]) + float(v[1]) / 60 + float(v[2]) / 3600
                    return round(-d if ref in ('S', 'W') else d, 6)
                out['gps'] = {'lat': deg(gps[2], gps.get(1)), 'lng': deg(gps[4], gps.get(3))}
        del ExifTags
    except Exception:
        pass
    finally:
        try:
            f.seek(0)
        except Exception:
            pass
    return out


def _timemark(fileobj, text):
    """Bản phái sinh có dấu thời gian máy chủ (góc dưới ảnh). Không phải ảnh JPEG/PNG thì trả nguyên file."""
    import io
    import os
    from django.core.files.base import ContentFile
    ext = os.path.splitext(getattr(fileobj, 'name', '') or '')[1].lower()
    if ext not in ('.jpg', '.jpeg', '.png'):
        return fileobj
    try:
        from PIL import Image, ImageDraw
        fileobj.seek(0)
        img = Image.open(fileobj).convert('RGB')
        draw = ImageDraw.Draw(img)
        w, h = img.size
        bar = max(18, h // 40)
        draw.rectangle([0, h - bar - 6, w, h], fill=(0, 0, 0))
        draw.text((8, h - bar - 2), text, fill=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=85)
        name = os.path.splitext(os.path.basename(fileobj.name))[0] + '.jpg'
        return ContentFile(buf.getvalue(), name=name)
    except Exception:
        fileobj.seek(0)
        return fileobj


def add_attachments(trip, stage, files, *, label='', meta=None, staff=False):
    """Thêm file vào chặng; hoặc tất cả cùng được nhận hoặc không file nào (trả lỗi rõ ràng).

    meta (từ thiết bị): {'source': 'camera'|'library', 'device_time', 'gps': {lat,lng}}. Tài xế (không phải nhân viên) phải chụp
    bằng camera cho ảnh bằng chứng. Lưu bản gốc (giữ EXIF) và bản phái sinh có dấu thời gian máy chủ.
    """
    meta = dict(meta or {})
    if not staff and meta.get('source') == 'library':
        raise ValidationError('Ảnh bằng chứng phải chụp trực tiếp bằng camera, không chọn từ thư viện.')
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
            from django.utils import timezone as tz
            for f in files:
                seq += 1
                key = uuid.uuid4().hex
                exif = _exif(f)
                f.seek(0)
                orig = default_storage.save(f'gss_docs/{locked.trip_code}/orig/{key}_{sanitize_filename(f.name)}', f)
                saved_names.append(orig)
                f.seek(0)
                now = tz.now()
                opt = optimize_and_resize_image(f)
                stamped = _timemark(opt, f'GSS {tz.localtime(now):%d/%m/%Y %H:%M:%S} | {locked.trip_code} | {locked.container_number or ""} | {STAGE_LABELS[stage]}')
                from apps.gss.docs import storage_rel_path
                rel = storage_rel_path(locked, stage, seq, now, stamped.name, key=key)
                name = default_storage.save(rel, stamped)
                saved_names.append(name)
                cap = {'original': f'/media/{orig}', 'server_time': now.isoformat(), 'exif': exif,
                       'source': str(meta.get('source') or ('staff_upload' if staff else 'unknown'))[:20],
                       'device_time': str(meta.get('device_time') or '')[:40], 'gps': meta.get('gps') if isinstance(meta.get('gps'), dict) else None}
                created.append(TripDocument.objects.create(
                    trip=locked, document_type=STAGE_DOC_TYPE[stage], title=f'{STAGE_LABELS[stage]} #{seq}',
                    file_path=f'/media/{name}', workflow_stage=stage, sequence_no=seq, uploaded_by_label=label[:150],
                    extracted_container_no=locked.container_number, extracted_seal_no=locked.seal_number, ocr_confidence=0,
                    capture_meta=cap))
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
