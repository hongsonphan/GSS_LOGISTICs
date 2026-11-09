"""Ghi nhật ký kiểm toán tự động cho mọi model nghiệp vụ (CompanyOwnedModel).

- Middleware AuditContextMiddleware lưu người dùng / IP của request hiện tại (contextvars, an toàn đa luồng).
- Tín hiệu pre_save lấy giá trị cũ, post_save so sánh và ghi các trường thay đổi; post_delete ghi xoá cứng.
- Xoá mềm (is_deleted False -> True) được ghi là 'delete'.
- Không ghi các thay đổi qua QuerySet.update()/bulk_create (Django không phát tín hiệu cho các lệnh này).
"""
import contextvars
import logging
from decimal import Decimal

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

logger = logging.getLogger("bim.audit")
_current = contextvars.ContextVar("bim_audit_context", default=None)

SKIP_FIELDS = {"updated_at", "created_at", "ocr_raw_text", "cached_revenue", "cached_expense", "cached_profit", "cached_margin_percent"}
MAX_VALUE_LEN = 300


class AuditContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = _current.set({"request": request})
        try:
            return self.get_response(request)
        finally:
            _current.reset(token)


def _actor():
    ctx = _current.get()
    if not ctx:
        return None, "hệ thống", ""
    request = ctx["request"]
    ip = request.META.get("HTTP_X_REAL_IP") or request.META.get("REMOTE_ADDR") or ""
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        return user, user.get_username(), ip
    if request.path.startswith(("/api/vendor/", "/vendor/")):
        return None, "nhà xe qua link", ip
    if request.headers.get("X-Trip-Hash") or request.path.startswith("/driver/") or "/api/trips/" in request.path:
        return None, "tài xế qua link", ip
    return None, "khách (chưa đăng nhập)", ip


def _plain(value):
    if value is None or isinstance(value, (bool, int, float, str)):
        out = value
    elif isinstance(value, Decimal):
        out = str(value)
    elif hasattr(value, "isoformat"):
        out = value.isoformat()
    elif hasattr(value, "name"):  # FileField
        out = value.name or ""
    else:
        out = str(value)
    if isinstance(out, str) and len(out) > MAX_VALUE_LEN:
        out = out[:MAX_VALUE_LEN] + "…"
    return out


def _snapshot(instance):
    data = {}
    for field in instance._meta.concrete_fields:
        if field.name in SKIP_FIELDS:
            continue
        data[field.attname] = _plain(getattr(instance, field.attname, None))
    return data


def _is_audited(sender):
    from core.models import CompanyOwnedModel
    return isinstance(sender, type) and issubclass(sender, CompanyOwnedModel)


def _write(action, instance, changes):
    from core.models import AuditLog
    user, label, ip = _actor()
    try:
        AuditLog.objects.create(
            actor=user, actor_label=label[:150], ip_address=ip[:64], action=action,
            model_label=instance._meta.label, object_id=str(instance.pk), object_repr=str(instance)[:255],
            changes=changes, company_id=getattr(instance, "company_id", None),
        )
    except Exception:  # nhật ký không được làm hỏng thao tác nghiệp vụ
        logger.exception("Không ghi được nhật ký kiểm toán cho %s#%s", instance._meta.label, instance.pk)


@receiver(pre_save, dispatch_uid="bim_audit_pre_save")
def _audit_pre_save(sender, instance, raw=False, **kwargs):
    if raw or not _is_audited(sender) or instance.pk is None:
        return
    old = sender._base_manager.filter(pk=instance.pk).first()
    instance._audit_old = _snapshot(old) if old is not None else None


@receiver(post_save, dispatch_uid="bim_audit_post_save")
def _audit_post_save(sender, instance, created, raw=False, update_fields=None, **kwargs):
    if raw or not _is_audited(sender):
        return
    new = _snapshot(instance)
    if created or getattr(instance, "_audit_old", None) is None:
        _write("create", instance, {k: [None, v] for k, v in new.items() if v not in (None, "", False)})
        return
    old = instance._audit_old
    changes = {k: [old.get(k), v] for k, v in new.items() if old.get(k) != v}
    instance._audit_old = new
    if not changes:
        return
    action = "delete" if changes.get("is_deleted") == [False, True] else "update"
    _write(action, instance, changes)


@receiver(post_delete, dispatch_uid="bim_audit_post_delete")
def _audit_post_delete(sender, instance, **kwargs):
    if not _is_audited(sender):
        return
    _write("delete", instance, {"hard_delete": [False, True]})
