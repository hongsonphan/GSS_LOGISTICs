#!/usr/bin/env python3
"""Ghép các file nguồn trong static/js/src/app/ thành static/js/app.js.

Cách dùng:
    python scripts/build_app_js.py          # build lại app.js
    python scripts/build_app_js.py --check  # báo lỗi nếu app.js lệch với nguồn (dùng trong CI / deploy)

Không cần Node.js. Thứ tự ghép nằm trong static/js/src/app/manifest.txt.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "static" / "js" / "src" / "app"
OUT = ROOT / "static" / "js" / "app.js"
HEADER = (
    "// ==========================================================================\n"
    "// FILE TỰ SINH — KHÔNG SỬA TRỰC TIẾP.\n"
    "// Sửa mã trong static/js/src/app/ rồi chạy: python scripts/build_app_js.py\n"
    "// ==========================================================================\n"
)


def read_manifest():
    files = []
    for line in (SRC / "manifest.txt").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            files.append(line)
    return files


def build():
    files = read_manifest()
    on_disk = {p.relative_to(SRC).as_posix() for p in SRC.rglob("*.js")}
    missing = [f for f in files if f not in on_disk]
    unlisted = sorted(on_disk - set(files))
    if missing or unlisted:
        sys.exit(f"manifest.txt lệch: thiếu file {missing}, file chưa khai báo {unlisted}")
    parts = [HEADER]
    for f in files:
        body = (SRC / f).read_text(encoding="utf-8").replace("\r\n", "\n")
        parts.append(f"\n// ---- src/app/{f} ----\n")
        parts.append(body if body.endswith("\n") else body + "\n")
    return "".join(parts).replace("\n", "\r\n")


def main():
    content = build()
    if "--check" in sys.argv:
        current = OUT.read_bytes().decode("utf-8") if OUT.exists() else ""
        if current != content:
            sys.exit("static/js/app.js không khớp với static/js/src/app/. Chạy: python scripts/build_app_js.py")
        print("app.js khớp với mã nguồn.")
        return
    OUT.write_bytes(content.encode("utf-8"))
    print(f"Đã build {OUT.relative_to(ROOT)} từ {len(read_manifest())} file.")


if __name__ == "__main__":
    main()
