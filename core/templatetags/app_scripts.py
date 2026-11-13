"""Nạp mã frontend của app: từng module riêng (chế độ phát triển) hoặc 1 file app.js đã ghép (production).

Dùng trong template:  {% load app_scripts %}{% app_scripts %}

- FRONTEND_SPLIT_SCRIPTS = True  -> nạp 58 file trong static/js/src/app/ theo manifest.txt
  (DevTools hiện đúng tên file, sửa xong chỉ cần F5, không cần build).
- FRONTEND_SPLIT_SCRIPTS = False -> nạp static/js/app.js (1 request, dùng cho production).
Mặc định: bằng DEBUG. Ghi đè bằng biến môi trường FRONTEND_SPLIT_SCRIPTS=true/false.
"""
import hashlib
from functools import lru_cache
from pathlib import Path

from django import template
from django.conf import settings
from django.templatetags.static import static
from django.utils.html import format_html, format_html_join

register = template.Library()

SRC_DIR = Path(settings.BASE_DIR) / "static" / "js" / "src" / "app"
BUNDLE = Path(settings.BASE_DIR) / "static" / "js" / "app.js"


def _manifest():
    lines = (SRC_DIR / "manifest.txt").read_text(encoding="utf-8").splitlines()
    return [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]


@lru_cache(maxsize=1)
def _bundle_version():
    # Phiên bản theo nội dung file: trình duyệt tự tải lại khi app.js thay đổi
    try:
        return hashlib.md5(BUNDLE.read_bytes(), usedforsecurity=False).hexdigest()[:10]
    except OSError:
        return "0"


@register.simple_tag
def app_scripts():
    ver = _bundle_version()
    if getattr(settings, "FRONTEND_SPLIT_SCRIPTS", settings.DEBUG):
        return format_html_join(
            "\n    ",
            '<script src="{}?v=' + ver + '"></script>',
            ((static(f"js/src/app/{name}"),) for name in _manifest()),
        )
    return format_html('<script src="{}?v={}"></script>', static("js/app.js"), ver)
