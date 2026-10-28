"""Sinh mã chứng từ tuần tự an toàn khi nhiều người lưu cùng lúc (không trùng mã).

Trước đây mã được tính bằng `count() + 1` hoặc `order_by('-id').first()` ngay trong view,
hai người bấm Lưu cùng lúc có thể nhận cùng một mã. Hàm next_code() khoá dòng đếm trong
bảng DocumentSequence (SELECT ... FOR UPDATE) nên mỗi lần gọi trả về một mã duy nhất.
Định dạng mã giữ nguyên như cũ, ví dụ: DV.2610.001, BK.2610.012, PT.2610.003, TUTX-202610-0004.
"""
from django.db import IntegrityError, transaction


def _manager(model):
    return getattr(model, "all_objects", model._default_manager)


def _max_existing_suffix(model, field, prefix):
    highest = 0
    for code in _manager(model).filter(**{f"{field}__startswith": prefix}).values_list(field, flat=True):
        rest = (code or "")[len(prefix):]
        if rest.isdigit():
            highest = max(highest, int(rest))
    return highest


def next_code(model, field, prefix, width=3):
    """Trả về mã kế tiếp dạng f"{prefix}{số:0{width}d}" cho model.field."""
    from core.models import DocumentSequence

    key = f"{model._meta.label}:{field}:{prefix}"
    for _attempt in range(3):
        try:
            with transaction.atomic():
                seq = DocumentSequence.objects.select_for_update().filter(key=key).first()
                if seq is None:
                    seq = DocumentSequence.objects.create(key=key, last_value=_max_existing_suffix(model, field, prefix))
                    seq = DocumentSequence.objects.select_for_update().get(pk=seq.pk)
                value = seq.last_value
                manager = _manager(model)
                while True:
                    value += 1
                    code = f"{prefix}{value:0{width}d}"
                    if not manager.filter(**{field: code}).exists():
                        break
                seq.last_value = value
                seq.save(update_fields=["last_value", "updated_at"])
                return code
        except IntegrityError:
            # Hai tiến trình cùng tạo dòng đếm lần đầu: thử lại, lần sau sẽ khoá được dòng đã có
            continue
    raise RuntimeError(f"Không sinh được mã chứng từ cho {key}")
