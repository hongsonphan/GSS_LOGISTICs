"""Build Tailwind CSS cho giao diện (thay cho cdn.tailwindcss.com).

Cần Node.js. Chạy sau khi sửa template / JS có thêm class Tailwind mới:
    python scripts/build_css.py
Kết quả: static/css/tailwind.css (toàn hệ thống) và static/css/tailwind-help.css (trang Hướng dẫn).
Class ghép động trong JS/Python phải khai báo trong safelist của tailwind.config.js.
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION = "3.4.17"
BUILDS = [
    ("tailwind.config.js", "static/css/tailwind.css"),
    ("tailwind.help.config.js", "static/css/tailwind-help.css"),
]


def main():
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        sys.exit("Cần cài Node.js (lệnh npx) để build Tailwind CSS.")
    for config, output in BUILDS:
        cmd = [npx, "--yes", f"tailwindcss@{VERSION}", "-c", config, "-i", "static/css/tailwind.input.css",
               "-o", output, "--minify"]
        subprocess.run(cmd, cwd=ROOT, check=True)
        print(f"Đã build {output}")


if __name__ == "__main__":
    main()
