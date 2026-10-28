"""Phục vụ file media (/media/...) có kiểm soát truy cập.

Quy tắc:
- Đường dẫn được chuẩn hoá bằng safe_join: không thể đọc file ngoài MEDIA_ROOT (chống path traversal).
- Người dùng nội bộ đã đăng nhập: được xem, trừ hồ sơ nhân sự nhạy cảm (hợp đồng lao động, phụ lục, chữ ký mẫu
  trong personnel/contracts/ và personnel/signatures/) chỉ dành cho Ban Giám đốc, Hành chính - Kế toán,
  nhóm Quản lý nhân sự và chính nhân viên sở hữu hồ sơ.
- Tài xế / khách hàng không đăng nhập: chỉ được xem file thuộc đúng chuyến mà họ vừa mở bằng link
  capability (/driver/<token>/ hoặc /tracking/<hash>/). Quyền này được ghi trong cookie ký số
  `bim_media_scope` do driver_portal_view / public_tracking_view cấp, hết hạn sau 7 ngày.
- File không tồn tại: trả 404. Không còn tự sinh file PDF/ảnh giả.
- Production sau Nginx: đặt MEDIA_USE_X_ACCEL=True để Nginx gửi file qua location /protected-media/ (internal).
"""
import mimetypes
import os

from django.conf import settings
from django.core import signing
from django.http import FileResponse, Http404, HttpResponse
from django.utils._os import safe_join
from django.views.decorators.clickjacking import xframe_options_sameorigin

MEDIA_SCOPE_COOKIE = "bim_media_scope"
MEDIA_SCOPE_SALT = "bim.media.scope"
MEDIA_SCOPE_MAX_AGE = 7 * 24 * 3600
MEDIA_SCOPE_MAX_ITEMS = 20


def _read_scope(request):
    try:
        raw = request.get_signed_cookie(MEDIA_SCOPE_COOKIE, salt=MEDIA_SCOPE_SALT, max_age=MEDIA_SCOPE_MAX_AGE)
    except (KeyError, signing.BadSignature):
        return []
    return [item for item in raw.split(",") if item]


def grant_media_scope(request, response, kind, trip_id):
    """Cấp quyền xem media của 1 chuyến cho trình duyệt hiện tại. kind: 'd' (tài xế) hoặc 't' (khách tra cứu)."""
    item = f"{kind}:{int(trip_id)}"
    items = [i for i in _read_scope(request) if i != item]
    items = (items + [item])[-MEDIA_SCOPE_MAX_ITEMS:]
    response.set_signed_cookie(
        MEDIA_SCOPE_COOKIE, ",".join(items), salt=MEDIA_SCOPE_SALT, max_age=MEDIA_SCOPE_MAX_AGE,
        httponly=True, samesite="Lax", secure=getattr(settings, "SESSION_COOKIE_SECURE", False), path="/media/",
    )
    return response


def _path_variants(rel_path):
    rel = rel_path.lstrip("/")
    return {rel, "/" + rel, settings.MEDIA_URL.rstrip("/") + "/" + rel}


RESTRICTED_PREFIXES = ("personnel/contracts/", "personnel/signatures/")
HR_ROLES = {"DIRECTOR", "LEAD_ADMIN_ACC", "STAFF_ADMIN_ACC", "ACCOUNTANT"}
HR_GROUPS = ("Quản Lý Nhân Sự", "Ban Giám Đốc")


def _staff_can_view(user, rel_path):
    rel = rel_path.lstrip("/")
    if not rel.startswith(RESTRICTED_PREFIXES) or user.is_superuser:
        return True
    employee = getattr(user, "employee", None)
    if employee is not None and employee.role in HR_ROLES:
        return True
    if user.groups.filter(name__in=HR_GROUPS).exists():
        return True
    if employee is None:
        return False
    from apps.personnel.models import ContractAppendix, LaborContract

    if employee.signature_image and employee.signature_image.name == rel:
        return True
    if LaborContract.objects.filter(employee=employee, contract_file=rel).exists():
        return True
    return ContractAppendix.objects.filter(contract__employee=employee, appendix_file=rel).exists()


def _anonymous_can_view(request, rel_path):
    scope = _read_scope(request)
    if not scope:
        return False
    driver_ids = [int(i[2:]) for i in scope if i.startswith("d:")]
    tracking_ids = [int(i[2:]) for i in scope if i.startswith("t:")]
    variants = _path_variants(rel_path)
    rel = rel_path.lstrip("/")

    from apps.billing.models import TripExpense
    from apps.dispatch.models import DispatchTrip
    from apps.documents.models import DocumentType, TripDocument

    if driver_ids:
        if TripDocument.objects.filter(trip_id__in=driver_ids, file_path__in=variants).exists():
            return True
        if TripExpense.objects.filter(trip_id__in=driver_ids, receipt_image_path__in=variants).exists():
            return True
        if TripExpense.objects.filter(trip_id__in=driver_ids, receipt_image=rel).exists():
            return True
        if DispatchTrip.objects.filter(id__in=driver_ids, booking_file=rel).exists():
            return True
    if tracking_ids:
        if TripDocument.objects.filter(trip_id__in=tracking_ids, document_type=DocumentType.POD, file_path__in=variants).exists():
            return True
    return False


@xframe_options_sameorigin
def safe_media_serve(request, path, document_root=None, show_indexes=False):
    doc_root = str(settings.MEDIA_ROOT)  # luôn lấy theo settings (document_root trong urls chỉ để tương thích)
    try:
        full_path = safe_join(doc_root, path)
    except Exception:
        raise Http404("Không tìm thấy tệp")
    if not os.path.isfile(full_path):
        raise Http404("Không tìm thấy tệp")

    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        if not _staff_can_view(user, path):
            raise Http404("Không tìm thấy tệp")
    elif not _anonymous_can_view(request, path):
        # Trả 404 thay vì 403 để không lộ việc file có tồn tại hay không
        raise Http404("Không tìm thấy tệp")

    content_type, _ = mimetypes.guess_type(full_path)
    content_type = content_type or "application/octet-stream"
    filename = os.path.basename(full_path)

    if getattr(settings, "MEDIA_USE_X_ACCEL", False):
        response = HttpResponse(content_type=content_type)
        rel = os.path.relpath(full_path, doc_root).replace(os.sep, "/")
        response["X-Accel-Redirect"] = "/protected-media/" + rel
    else:
        response = FileResponse(open(full_path, "rb"), content_type=content_type)
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    response["Cache-Control"] = "private, max-age=3600"
    response["X-Content-Type-Options"] = "nosniff"
    return response
