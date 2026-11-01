"""Build Tailwind CSS cho giao diện (thay cho cdn.tailwindcss.com).

Cần Node.js. Chạy sau khi sửa template / JS có thêm class Tailwind mới:
    python scripts/build_css.py
Kết quả: static/css/tailwind.css (toàn hệ thống) và static/css/tailwind-help.css (trang Hướng dẫn).
    python scripts/build_css.py --check   # (CI) báo lỗi nếu file CSS chưa build lại sau khi sửa giao diện
Class ghép động trong JS/Python phải khai báo trong safelist của tailwind.config.js.
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
VERSION = "3.4.17"
BUILDS = [
    ("tailwind.config.js", "static/css/tailwind.css"),
    ("tailwind.help.config.js", "static/css/tailwind-help.css"),
]


def main():
    check = "--check" in sys.argv
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        sys.exit("Cần cài Node.js (lệnh npx) để build Tailwind CSS.")
    stale = []
    for config, output in BUILDS:
        target = ROOT / output
        if check:
            fd, temp_path = tempfile.mkstemp(suffix=".css")
            os.close(fd)
            out = Path(temp_path)
        else:
            out = target
        cmd = [npx, "--yes", f"tailwindcss@{VERSION}", "-c", config, "-i", "static/css/tailwind.input.css",
               "-o", str(out), "--minify"]
        subprocess.run(cmd, cwd=ROOT, check=True, capture_output=check)
        if check:
            if out.read_bytes().strip() != target.read_bytes().strip():
                stale.append(output)
            out.unlink()
        else:
            print(f"Đã build {output}")
    if stale:
        sys.exit("CSS chưa build lại sau khi sửa giao diện: " + ", ".join(stale) + ". Chạy: python scripts/build_css.py")
    if check:
        print("CSS khớp với mã nguồn giao diện.")


if __name__ == "__main__":
    main()
