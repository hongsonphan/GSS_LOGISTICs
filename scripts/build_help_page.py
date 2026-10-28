"""Đồng bộ trang Trợ giúp /helps (templates/help.html) từ sổ tay docs/USER_GUIDE.md.

docs/USER_GUIDE.md là nguồn nội dung duy nhất. Sau khi sửa file Markdown, chạy:
    python scripts/build_help_page.py
    python scripts/build_css.py        # build lại static/css/tailwind-help.css
Script giữ nguyên phần <head>, topbar, hero, footer và JavaScript hiện có của help.html,
chỉ sinh lại mục lục (sidebar) và nội dung. Cần: pip install markdown
"""
import re
import sys
import html as htmlmod
import markdown

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
md_path = ROOT / 'docs' / 'USER_GUIDE.md'
out_path = ROOT / 'templates' / 'help.html'
src = open(md_path, encoding='utf-8').read()
src = re.sub(r'<!-- TOC -->.*?<!-- /TOC -->', '', src, flags=re.S)
_cur = open(out_path, encoding='utf-8').read()
head = _cur[:_cur.index('<!-- MAIN WRAPPER -->')]
tail = _cur[_cur.index('<!-- FOOTER (NO-PRINT) -->'):]

head = head.replace('>v1.0<', '>v1.1<').replace('(Phiên bản v1.0)', '(Phiên bản v1.1)')

lines = src.split('\n')

# ---- Tách phần mở đầu (trước PHẦN A) ----
first_part = next(i for i, l in enumerate(lines) if l.startswith('# PHẦN'))
intro_md = '\n'.join(l for l in lines[1:first_part] if l.strip() != '---')
body_lines = lines[first_part:]

def slug(code):
    return 'sec-' + re.sub(r'[^a-z0-9]+', '-', code.lower()).strip('-')

# ---- Phân tích cấu trúc: parts -> sections(H2) -> subsections(H3) ----
parts = []
cur_part = cur_sec = None
for l in body_lines:
    if l.startswith('# '):
        cur_part = {'title': l[2:].strip(), 'sections': []}
        parts.append(cur_part)
        cur_sec = None
    elif l.startswith('## '):
        t = l[3:].strip()
        code = t.split('.')[0].strip()
        cur_sec = {'title': t, 'code': code, 'id': slug(code), 'lines': [], 'subs': []}
        cur_part['sections'].append(cur_sec)
    elif cur_sec is not None:
        if l.startswith('### '):
            t = l[4:].strip()
            code = t.split('. ')[0].strip().rstrip('.')
            cur_sec['subs'].append({'title': t, 'id': slug(code)})
        if l.strip() == '---':
            continue
        cur_sec['lines'].append(l)
    # dòng ngoài section (sau H1) bỏ qua

CHIP = ('inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold text-teal-800 '
        'bg-teal-50 border border-teal-300 whitespace-nowrap')

def style_html(h):
    # Nút bấm **`X`** -> chip
    h = re.sub(r'<strong><code>(.*?)</code></strong>', lambda m: f'<span class="{CHIP}">{m.group(1)}</span>', h)
    h = re.sub(r'<code>', '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs">', h)
    h = h.replace('<strong>', '<strong class="font-bold text-slate-900">')
    h = re.sub(r'<table>', '<div class="overflow-x-auto border border-slate-200 rounded-lg my-3"><table class="w-full text-left text-xs erp-table border-collapse">', h)
    h = h.replace('</table>', '</table></div>')
    h = h.replace('<thead>', '<thead class="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">')
    h = h.replace('<tbody>', '<tbody class="divide-y divide-slate-100 bg-white">')
    h = re.sub(r'<th( style="[^"]*")?>', '<th class="p-2.5 align-top">', h)
    h = re.sub(r'<td( style="[^"]*")?>', '<td class="p-2.5 align-top">', h)
    h = h.replace('<ul>', '<ul class="list-disc pl-5 space-y-1.5">')
    h = re.sub(r'<ol( start="\d+")?>', lambda m: f'<ol{m.group(1) or ""} class="list-decimal pl-5 space-y-1.5">', h)
    h = h.replace('<p>', '<p class="leading-relaxed">')
    h = h.replace('<blockquote>', '<blockquote class="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-slate-800">')
    h = re.sub(r'<h3 id="[^"]*">', '<h3>', h)
    return h

LIST_RE = re.compile(r'^(\s*)([-*]|\d+\.)\s')

def normalize_md(md_text):
    out = []
    for l in md_text.split('\n'):
        m = re.match(r'^( {2,3})(\S)', l)
        if m and LIST_RE.match(l):
            l = '    ' + l.lstrip()
        elif m:  # dòng tiếp nối của mục danh sách
            l = '    ' + l.lstrip()
        if LIST_RE.match(l) and out and out[-1].strip() and not LIST_RE.match(out[-1]) and not out[-1].startswith('    '):
            out.append('')
        out.append(l)
    return '\n'.join(out)

def render(md_text):
    md_text = normalize_md(md_text)
    return style_html(markdown.markdown(md_text, extensions=['tables', 'sane_lists']))

def render_section(sec):
    body = []
    buf = []
    sub_idx = 0
    def flush():
        if buf:
            body.append(render('\n'.join(buf)))
            buf.clear()
    open_sub = False
    for l in sec['lines']:
        if l.startswith('### '):
            flush()
            if open_sub:
                body.append('</div>')
            sub = sec['subs'][sub_idx]; sub_idx += 1
            body.append(f'<div id="{sub["id"]}" class="scroll-mt-24 space-y-3 pt-2">'
                        f'<h4 class="text-base font-bold text-slate-900 font-heading">{htmlmod.escape(sub["title"])}</h4>')
            open_sub = True
        else:
            buf.append(l)
    flush()
    if open_sub:
        body.append('</div>')
    return (f'<section id="{sec["id"]}" class="help-section scroll-mt-24 space-y-4 pb-8 border-b border-slate-200">\n'
            f'<h3 class="text-lg sm:text-xl font-black text-slate-900 font-heading">{htmlmod.escape(sec["title"])}</h3>\n'
            f'<div class="text-sm text-slate-700 space-y-3">\n' + '\n'.join(body) + '\n</div>\n</section>')

ICONS = ['ph-rocket-launch', 'ph-gear-six', 'ph-squares-four', 'ph-question']

# ---- Sidebar ----
nav = []
for pi, p in enumerate(parts):
    icon = ICONS[pi % len(ICONS)]
    links = []
    for s in p['sections']:
        links.append(f'<a href="#{s["id"]}" class="nav-link flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-teal-800 transition-all font-semibold text-[13px]">'
                     f'<span class="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span><span class="truncate">{htmlmod.escape(s["title"])}</span></a>')
        for sub in s['subs']:
            links.append(f'<a href="#{sub["id"]}" class="nav-link block pl-8 pr-2.5 py-1 rounded-lg text-slate-600 hover:text-teal-800 text-[12.5px] truncate">{htmlmod.escape(sub["title"])}</a>')
    nav.append(f'''<div class="tree-parent-group border-b border-slate-100 pb-2.5">
<div class="tree-header flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-50 cursor-pointer font-bold text-teal-900 group" onclick="toggleTreeGroup(this)">
<div class="flex items-center gap-2 truncate"><i class="ph-bold {icon} text-sm text-teal-700 shrink-0"></i>
<span class="text-xs sm:text-[13px] font-black uppercase tracking-tight">{htmlmod.escape(p["title"])}</span></div>
<i class="ph-bold ph-caret-down text-xs text-slate-400 transition-transform duration-200 tree-arrow"></i></div>
<div class="tree-children space-y-0.5 pl-3 mt-1">
{chr(10).join(links)}
</div></div>''')

sidebar = f'''<!-- MAIN WRAPPER -->
    <div class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        <aside id="help-sidebar" class="w-80 shrink-0 hidden lg:block no-print select-none transition-all duration-300">
            <div class="sticky top-20 space-y-3">
                <div class="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs">
                    <div class="mb-3 px-1">
                        <div class="flex items-center justify-between text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5">
                            <span class="flex items-center gap-2 text-teal-900 font-heading">
                                <i class="ph-bold ph-list-bullets text-teal-700 text-base"></i>
                                <span class="text-sm">MỤC LỤC HƯỚNG DẪN</span>
                            </span>
                            <button type="button" onclick="toggleHelpSidebar()" class="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center bg-white" title="Ẩn thanh mục lục để mở rộng không gian đọc">
                                <svg class="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3"></rect><path d="M9 3v18"></path><path d="m16 9-3 3 3 3"></path></svg>
                            </button>
                        </div>
                        <div class="relative">
                            <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                            <input type="text" id="sidebar-tree-search" oninput="filterSidebarTree()" placeholder="Tìm nhanh mục lục..."
                                   class="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-600 transition-all shadow-2xs">
                            <button type="button" id="sidebar-tree-clear" onclick="clearSidebarTreeSearch()" class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><i class="ph-bold ph-x text-sm"></i></button>
                        </div>
                    </div>
                    <nav class="space-y-1.5 max-h-[calc(100vh-270px)] overflow-y-auto custom-scrollbar pr-1" id="help-tree-nav">
{chr(10).join(nav)}
                    </nav>
                </div>
                <div class="bg-teal-50/80 border border-teal-200/80 rounded-2xl p-4 text-xs">
                    <div class="font-black text-teal-900 flex items-center gap-2 mb-1.5 font-heading">
                        <i class="ph-bold ph-headphones text-teal-700 text-base"></i>
                        <span class="text-xs sm:text-[13px]">BIM LOGISTICS - BIZ SOLUTIONS</span>
                    </div>
                    <div class="space-y-1 text-xs text-slate-700 mt-2">
                        <div>Hotline: <strong class="text-teal-900 font-mono font-bold text-[13px]">0903.012.099</strong></div>
                        <div>Email: <a href="mailto:bimconsultingvn@gmail.com" class="text-teal-800 font-medium hover:underline">bimconsultingvn@gmail.com</a></div>
                    </div>
                </div>
            </div>
        </aside>
'''

# ---- Main content ----
main = ['''        <main class="flex-1 min-w-0 print-full" id="help-content-container">
            <div class="doc-page-container rounded-2xl p-8 sm:p-14 border border-slate-200 bg-white shadow-2xs space-y-12">''']
main.append('<section id="sec-intro" class="help-section scroll-mt-24 space-y-3 p-5 rounded-2xl bg-gradient-to-br from-teal-50/70 via-white to-amber-50/50 border-2 border-teal-300 shadow-sm text-sm text-slate-700">'
            + render(intro_md) + '</section>')
for pi, p in enumerate(parts):
    main.append(f'<div id="sec-group-{pi+1}"><h2 class="text-xl sm:text-2xl font-black text-slate-900 uppercase font-heading tracking-tight border-b-2 border-slate-900 pb-3 mb-8">{htmlmod.escape(p["title"])}</h2></div>')
    for s in p['sections']:
        main.append(render_section(s))
main.append('''                <div class="pt-8 border-t border-slate-200 text-center text-xs text-slate-500">
                    <p class="font-bold text-slate-800 font-heading">© 2026 Bản quyền thuộc BIM LOGISTICS — BIZ SOLUTIONS</p>
                </div>
            </div>
        </main>
    </div>

    ''')

out = head + sidebar + '\n'.join(main) + tail
# Tránh cú pháp template Django vô tình trong nội dung
body_only = sidebar + '\n'.join(main)
assert '{%' not in body_only and '{{' not in body_only, 'Nội dung chứa cú pháp template Django'
open(out_path, 'w', encoding='utf-8').write(out)
ids = re.findall(r'id="(sec-[^"]+)"', out)
dups = {i for i in ids if ids.count(i) > 1}
print('parts', len(parts), 'sections', sum(len(p['sections']) for p in parts),
      'subs', sum(len(s['subs']) for p in parts for s in p['sections']), 'bytes', len(out), 'dup ids', dups)
