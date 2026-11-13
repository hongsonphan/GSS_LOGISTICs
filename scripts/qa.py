#!/usr/bin/env python3
"""Cổng kiểm thử cục bộ của GSS TMS, dùng chung cho dev, đội AI (.claude/) và hook.

    python scripts/qa.py verify            # build khớp + cú pháp + migration + check + test gss/dispatch/billing
    python scripts/qa.py verify --fast     # bỏ test (sau sửa nhỏ)
    python scripts/qa.py verify --full     # test toàn bộ dự án (giống CI)
    python scripts/qa.py audit             # verify --full + bảo mật + cách ly công ty + giao diện + tài liệu -> báo cáo

CSDL: test cần PostgreSQL (RLS, ràng buộc chỉ có trên Postgres). Nếu biến DB_HOST đã đặt thì dùng nó; nếu không,
script tự dựng container tạm `gss_qa_pg` (postgres:16-alpine, 127.0.0.1:5438). Không bao giờ dùng CSDL của
stack 8086 (cổng 5436). Dừng container tạm: `docker stop gss_qa_pg`.

Mã thoát: 0 = không có FAIL; 1 = có FAIL. WARN không chặn nhưng phải được báo cáo.
Công cụ tùy chọn (bandit, pip-audit, node, ruff) thiếu thì SKIP, không FAIL.
"""
import datetime
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
PY = sys.executable
RESULTS = []  # (mức, tên, chi tiết)
TEST_APPS_DEFAULT = ["apps.gss", "apps.dispatch", "apps.billing"]
STACK_DB_PORT = "5436"  # CSDL của stack Docker 8086 - không dùng cho test
QA_PG = {"name": "gss_qa_pg", "port": "5438", "password": "gss_qa_local"}


def add(level, name, detail=""):
    RESULTS.append((level, name, detail))
    tag = {"PASS": "[ OK ]", "FAIL": "[FAIL]", "WARN": "[WARN]", "SKIP": "[SKIP]", "INFO": "[INFO]"}[level]
    print(f"{tag} {name}" + (f" - {detail.splitlines()[0]}" if detail else ""), flush=True)


def run(cmd, env_extra=None, timeout=1800):
    env = dict(os.environ)
    env.update(env_extra or {})
    env["PYTHONIOENCODING"] = "utf-8"
    try:
        p = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except subprocess.TimeoutExpired:
        return 124, "quá thời gian chờ"


def tail(out, n=15):
    return "\n".join(out.strip().splitlines()[-n:])


def step(name, cmd, env_extra=None, fail_level="FAIL"):
    code, out = run(cmd, env_extra)
    if code == 0:
        add("PASS", name)
    else:
        add(fail_level, name, tail(out))
        if fail_level == "FAIL":
            print(tail(out), flush=True)
    return code == 0


DJ_ENV = {"DEBUG": "True", "SECRET_KEY": os.environ.get("SECRET_KEY", "x")}


def pg_env():
    """Trả biến môi trường trỏ tới PostgreSQL dùng cho test; None nếu không có."""
    if os.environ.get("DB_HOST"):
        if os.environ.get("DB_PORT", "5432") == STACK_DB_PORT:
            add("FAIL", "CSDL test", f"DB_PORT={STACK_DB_PORT} là CSDL của stack 8086 - dùng Postgres tạm khác")
            return None
        return {}
    if not shutil.which("docker"):
        add("FAIL", "CSDL test", "chưa đặt DB_HOST và không có docker để dựng Postgres tạm")
        return None
    name, port, pw = QA_PG["name"], QA_PG["port"], QA_PG["password"]
    code, out = run(["docker", "ps", "-q", "-f", f"name=^{name}$"])
    if code != 0:
        add("FAIL", "CSDL test", "docker không chạy: " + tail(out, 2))
        return None
    if not out.strip():
        code, out = run(["docker", "run", "-d", "--rm", "--name", name, "-p", f"127.0.0.1:{port}:5432",
                         "-e", f"POSTGRES_PASSWORD={pw}", "postgres:16-alpine"], timeout=300)
        if code != 0:
            add("FAIL", "CSDL test", "không dựng được Postgres tạm: " + tail(out, 3))
            return None
    for _ in range(60):
        if run(["docker", "exec", name, "pg_isready", "-U", "postgres"])[0] == 0:
            break
        time.sleep(1)
    else:
        add("FAIL", "CSDL test", f"Postgres tạm {name} không sẵn sàng sau 60 giây")
        return None
    add("INFO", f"CSDL test: Postgres tạm {name} (127.0.0.1:{port})")
    return {"DB_ENGINE": "django.db.backends.postgresql", "DB_HOST": "127.0.0.1", "DB_PORT": port,
            "DB_NAME": "postgres", "DB_USER": "postgres", "DB_PASSWORD": pw}


# ------------------------------------------------------------------ verify
def verify(fast=False, full=False):
    print("== VERIFY: cổng kiểm thử cục bộ ==", flush=True)
    step("app.js khớp mã nguồn module", [PY, "scripts/build_app_js.py", "--check"])
    step("tailwind.css khớp giao diện", [PY, "scripts/build_css.py", "--check"])
    if shutil.which("node"):
        step("Cú pháp JavaScript (node --check)", ["node", "--check", "static/js/app.js"])
    else:
        add("SKIP", "Cú pháp JavaScript", "chưa cài Node.js")
    if shutil.which("ruff"):
        step("Python: lỗi nghiêm trọng (ruff E9,F63,F7,F82)",
             ["ruff", "check", "--select", "E9,F63,F7,F82", "apps", "core", "config", "scripts"])
    else:
        add("SKIP", "ruff", "chưa cài ruff (pip install ruff)")
    db = pg_env()
    if db is None:
        add("SKIP", "Migration / check / test", "không có PostgreSQL (xem FAIL ở trên)")
        return
    env = {**DJ_ENV, **db}
    step("Migration đầy đủ (makemigrations --check)", [PY, "manage.py", "makemigrations", "--check", "--dry-run"], env)
    step("Django system check", [PY, "manage.py", "check"], env)
    if fast:
        add("SKIP", "Test", "--fast")
    else:
        targets = [] if full else TEST_APPS_DEFAULT
        label = "toàn bộ dự án" if full else " ".join(targets)
        step(f"Test: {label}", [PY, "manage.py", "test", "--noinput", *targets], env)


# ------------------------------------------------------------------ audit
def tracked(*globs):
    code, out = run(["git", "ls-files", *globs])
    return [ROOT / l for l in out.splitlines() if l.strip()] if code == 0 else []


def grep_files(files, pattern, flags=0, limit=8):
    rx = re.compile(pattern, flags)
    hits = []
    for f in files:
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            if rx.search(line):
                hits.append(f"{f.relative_to(ROOT).as_posix()}:{i}")
    return hits[:limit], len(hits)


def audit_security():
    print("\n== AUDIT: BẢO MẬT ==", flush=True)
    check_env = {"DEBUG": "False", "SECRET_KEY": "audit-only-" + "k" * 60, "SECURE_SSL_REDIRECT": "False"}
    step("Django check --deploy (cấu hình production)",
         [PY, "manage.py", "check", "--deploy", "--fail-level", "ERROR"], check_env)
    if shutil.which("bandit"):
        step("Bandit (mức Medium trở lên)", ["bandit", "-q", "-r", "apps", "core", "config",
             "-x", "*/tests*,*/test_*,*/migrations/*", "-ll"], fail_level="FAIL")
    else:
        add("SKIP", "Bandit", "pip install bandit")
    if shutil.which("pip-audit"):
        step("Lỗ hổng thư viện (pip-audit)", ["pip-audit", "-r", "requirements.txt"], fail_level="WARN")
    else:
        add("SKIP", "pip-audit", "pip install pip-audit")

    py = [f for f in tracked("apps/*.py", "core/*.py", "config/*.py", "apps/**/*.py", "core/**/*.py")
          if "test" not in f.name and "migrations" not in f.parts]
    # (mô tả, regex, mức)
    rules = [
        ("Bí mật nghi lộ trong mã", r"(?i)(secret|passwd|password|api[_-]?key|token)\s*=\s*['\"][A-Za-z0-9_\-+/=]{16,}['\"]", "FAIL"),
        ("Khóa riêng tư", r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----", "FAIL"),
        ("eval/exec", r"\b(eval|exec)\(", "FAIL"),
        ("SQL ghép chuỗi (execute f-string/format/%; bỏ qua tên định danh đã quote_name)", r"^(?!.*(\{q\(|quote_name)).*\.(execute|raw|extra)\(\s*(f['\"]|['\"].*['\"]\s*(%|\.format))", "FAIL"),
        ("verify=False (TLS)", r"verify\s*=\s*False", "FAIL"),
        ("ALLOWED_HOSTS = ['*'] (chỉ chấp nhận trong nhánh DEBUG)", r"ALLOWED_HOSTS\s*=\s*\[\s*['\"]\*['\"]", "WARN"),
        ("csrf_exempt", r"csrf_exempt", "WARN"),
        ("mark_safe", r"\bmark_safe\(", "WARN"),
        ("Xóa cứng .delete() ngoài test", r"\.delete\(\)", "WARN"),
        ("SQL viết tay raw()/cursor.execute (kiểm tham số hoá + RLS)", r"\.raw\(|cursor\(\)\.execute\(|\.execute\(", "INFO"),
        ("Dấu vết hệ thống cũ (Triền Võ/TVL/hashids)", r"Triền Võ|\bTVL\b|hashids", "WARN"),
    ]
    for desc, pat, lvl in rules:
        hits, n = grep_files(py, pat)
        if n:
            add(lvl, f"{desc}: {n} chỗ", ", ".join(hits))
        else:
            add("PASS", desc)

    settings_py = ROOT / "config" / "settings.py"
    if "sqlite3" in settings_py.read_text(encoding="utf-8", errors="ignore"):
        add("WARN", "settings.py còn nhánh dự phòng SQLite khi thiếu DB_HOST (quy ước: chỉ PostgreSQL)",
            "config/settings.py")
    leaked = [f.relative_to(ROOT).as_posix() for f in tracked(".env", "gss_local_credentials.txt", "*.dump", "*.pem", "*.key")]
    if leaked:
        add("FAIL", f"File bí mật bị git theo dõi: {len(leaked)}", ", ".join(leaked))
    else:
        add("PASS", "Không có .env / credentials / khóa trong git")


def audit_ui():
    print("\n== AUDIT: GIAO DIỆN ==", flush=True)
    tpl = tracked("templates/*.html", "templates/**/*.html")
    js = [f for f in tracked("static/js/src/app/*.js", "static/js/src/app/**/*.js")]

    unbalanced = []
    for f in tpl:
        t = f.read_text(encoding="utf-8", errors="ignore")
        t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
        t = re.sub(r"<(script|style)\b.*?</\1>", "", t, flags=re.S | re.I)
        o, c = len(re.findall(r"<div\b", t)), len(re.findall(r"</div>", t))
        if o != c:
            unbalanced.append(f"{f.relative_to(ROOT).as_posix()} (mở {o}/đóng {c})")
    if unbalanced:
        add("WARN", f"Template lệch thẻ <div>: {len(unbalanced)} file (có thể là mảnh ghép include)", ", ".join(unbalanced[:6]))
    else:
        add("PASS", "Thẻ <div> cân bằng trong mọi template")

    hits, n = grep_files(tpl + js, r"\b(bg|text|border)-(red|green|yellow)-\d{2,3}\b")
    if n:
        add("WARN", f"Màu thô red/green/yellow (chuẩn: rose/emerald/amber): {n} chỗ", ", ".join(hits))
    else:
        add("PASS", "Không dùng màu red/green/yellow thô")

    # onclick="fn(" phải có định nghĩa trong JS nguồn (nguyên nhân phổ biến của 'nút mất tác dụng')
    # Nguồn định nghĩa: JS module + script nhúng trong template (driver_portal, help, ...)
    src = "\n".join(f.read_text(encoding="utf-8", errors="ignore") for f in js + tpl)
    called = {}
    for f in tpl + js:
        t = f.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r"""\bon(?:click|change|input|submit|keyup|keydown|blur)\s*=\s*\\?["'](?:return\s+)?([A-Za-z_$][\w$]*)\s*\(""", t):
            called.setdefault(m.group(1), f.relative_to(ROOT).as_posix())
    builtin = {"if", "confirm", "alert", "event", "this", "window", "document", "history", "setTimeout",
               "prompt", "parseInt", "parseFloat", "Number", "String", "fetch", "console", "location", "open", "print"}
    missing = []
    for name, where in sorted(called.items()):
        if name in builtin:
            continue
        if not re.search(rf"(function\s+{re.escape(name)}\b|\b{re.escape(name)}\s*=|window\.{re.escape(name)}\b|\b(?:const|let|var)\s+{re.escape(name)}\b)", src):
            missing.append(f"{name} ({where})")
    if missing:
        add("FAIL", f"Handler onclick/onchange không có định nghĩa trong JS nguồn: {len(missing)}", ", ".join(missing[:8]))
    else:
        add("PASS", f"Mọi handler inline ({len(called)}) đều có định nghĩa")

    # 10-ui-ux-guidelines: không badge/pill trong bảng (mục 0, 2.6); không số đếm trên tab (đã chốt 09/11/2026)
    def where(path, text, pos):
        return f"{path.relative_to(ROOT).as_posix()}:{text.count(chr(10), 0, pos) + 1}"

    # Badge = thẻ có class vừa bo tròn (rounded-full) vừa có padding ngang (px-), hoặc class chứa "badge".
    # Thanh tiến độ, chấm tròn, icon tròn (không có px-) không tính.
    td_rx = re.compile(
        r"<td\b[^>]*>(?:(?!</td>).){0,900}?"
        r"class=[\"'`][^\"'`]*(?:\bpx-[\d.]+[^\"'`]*\brounded-full|\brounded-full[^\"'`]*\bpx-[\d.]+|(?<![\w-])badge(?![\w-]))",
        re.S | re.I)
    tab_rx = re.compile(r"<button\b[^>]*(?:switch\w*Tab|subtab|tab-btn|data-[\w-]*tab)[^>]*>(?:(?!</button>).){0,700}?"
                        r"(?:rounded-full|id=\"badge-|\(\s*\$\{|\(\s*\d+\s*%?\s*\))", re.S | re.I)
    badge_hits, tab_hits = [], []
    for f in tpl + js:
        t = f.read_text(encoding="utf-8", errors="ignore")
        badge_hits += [where(f, t, m.start()) for m in td_rx.finditer(t)]
        tab_hits += [where(f, t, m.start()) for m in tab_rx.finditer(t)]
    if badge_hits:
        add("WARN", f"Badge/pill trong bảng (10-ui-ux-guidelines mục 0, 2.6: trong bảng dùng chữ màu + icon): {len(badge_hits)} chỗ", ", ".join(badge_hits[:8]))
    else:
        add("PASS", "Không badge/pill trong bảng")
    if tab_hits:
        add("FAIL", f"Số đếm trên tên thẻ tab (cấm theo 10-ui-ux-guidelines 2.6/4.9): {len(tab_hits)} chỗ", ", ".join(tab_hits[:8]))
    else:
        add("PASS", "Tên thẻ tab không có số đếm")


def audit_docs():
    print("\n== AUDIT: TÀI LIỆU ==", flush=True)
    cl = (ROOT / "docs" / "CHANGELOG.md").read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"^## (\d{4}-\d{2}-\d{2})", cl, re.M)
    add("INFO", f"Mục CHANGELOG mới nhất: {m.group(1) if m else 'không đọc được'}")

    # Link tương đối hỏng trong tài liệu chỉ dẫn (CLAUDE.md, docs/, .claude/)
    md = sorted({*ROOT.glob("*.md"), *(ROOT / "docs").glob("*.md"), *(ROOT / ".claude").rglob("*.md"),
                 ROOT / "static/js/src/app/README.md"} - set((ROOT / ".claude" / "worktrees").rglob("*.md")))
    md = [f for f in md if f.exists()]
    broken = []
    for f in md:
        t = f.read_text(encoding="utf-8", errors="ignore")
        for mm in re.finditer(r"\]\(([^)#\s]+)(?:#[^)]*)?\)", t):
            target = mm.group(1)
            if re.match(r"^[a-z]+:", target):
                continue
            if not (f.parent / target).exists():
                broken.append(f"{f.relative_to(ROOT).as_posix()} -> {target}")
    if broken:
        add("WARN", f"Link tương đối hỏng trong tài liệu: {len(broken)}", ", ".join(broken[:8]))
    else:
        add("PASS", f"Link tương đối trong {len(md)} file .md đều trỏ đúng")

    for need in ("docs/12-backlog.md", "docs/03-features.md", "docs/14-ai-team.md"):
        if not (ROOT / need).exists():
            add("WARN", f"Thiếu {need}")
    code, out = run(["git", "status", "--porcelain"])
    dirty = [l for l in out.splitlines() if l.strip()]
    add("INFO", f"Cây làm việc có {len(dirty)} thay đổi chưa commit")


def audit():
    verify(full=True)
    audit_security()
    audit_ui()
    audit_docs()


def report():
    counts = {k: sum(1 for r in RESULTS if r[0] == k) for k in ("PASS", "FAIL", "WARN", "SKIP", "INFO")}
    print("\n" + "=" * 60)
    print("TỔNG KẾT: " + "  ".join(f"{k}={v}" for k, v in counts.items()))
    for lvl in ("FAIL", "WARN"):
        for l, name, detail in RESULTS:
            if l == lvl:
                print(f"  [{lvl}] {name}" + (f"\n         {detail.splitlines()[0][:300]}" if detail else ""))
    verdict = "KHÔNG ĐẠT" if counts["FAIL"] else ("ĐẠT (có cảnh báo)" if counts["WARN"] else "ĐẠT")
    print(f"KẾT LUẬN: {verdict}")
    out_dir = ROOT / "scratch"
    out_dir.mkdir(exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    lines = [f"# Báo cáo QA {stamp}", ""]
    for l, name, detail in RESULTS:
        lines.append(f"- **{l}** {name}" + (f"\n  ```\n  {detail}\n  ```" if detail and l != "PASS" else ""))
    (out_dir / f"qa-{stamp}.md").write_text("\n".join(lines), encoding="utf-8")
    return 1 if counts["FAIL"] else 0


def main(argv):
    if len(argv) < 2 or argv[1] not in ("verify", "audit"):
        print(__doc__)
        return 2
    if argv[1] == "verify":
        verify(fast="--fast" in argv, full="--full" in argv)
    else:
        audit()
    return report()


if __name__ == "__main__":
    sys.exit(main(sys.argv))
