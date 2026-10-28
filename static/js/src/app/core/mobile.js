/**
 * Giao diện điện thoại (màn hình < 768px): ưu tiên XEM số liệu, thao tác chỉ khi thật cần.
 *
 * - Thẻ KPI: lưới 2 cột, chỉ nhãn + con số (ẩn huy hiệu, dòng phụ).
 * - Thanh tab: một hàng cuộn ngang.
 * - Bảng: mỗi dòng thành một thẻ, chỉ hiện trường chính (mã, đối tượng, trạng thái, số tiền);
 *   chạm thẻ để xem đủ trường và nút của dòng. Dòng có sẵn thao tác mở chi tiết giữ nguyên.
 * - Nút thao tác (tạo, sửa, xuất, in, làm mới, quyết toán...): thu vào nút "⋯" trên thanh tiêu đề.
 * - Ô lọc dạng danh sách chọn: thu vào nút "Bộ lọc"; ô tìm kiếm luôn hiện.
 * Máy tính không bị ảnh hưởng: mọi kiểu dáng nằm trong @media (max-width: 767px) ở main.css.
 * Thêm data-m-actions cho vùng chứa nút cần thu gọn; data-m-keep để giữ nguyên một phần tử.
 */
(function () {
    const MQ = window.matchMedia('(max-width: 767px)');

    const ACTION_RE = /^\s*(?:event\.stopPropagation\(\);\s*)?(?:open\w*(?:Create|New|Add|Edit|Import|Batch|Settle|Cash|Voucher|Fund|Advance|Column|Customizer|Upload|Ocr|OCR|Modal)\w*|create\w*|add\w*|export\w*|download\w*|print\w*|import\w*|delete\w*|remove\w*|duplicate\w*|copy\w*|send\w*|settle\w*|unsettle\w*|save\w*|reset\w*|load\w*|refresh\w*|reload\w*|batch\w*|approve\w*|reject\w*|lock\w*|unlock\w*|upload\w*|quick\w*|mark\w*|generate\w*|calculate\w*|auto\w*|confirm\w*|decline\w*|accept\w*|reassign\w*|toggleDriverPhone|deleteOrCancelTrip|submit\w*)\s*\(/i;
    const KEEP_RE = /(Detail|switch\w*|Period|period|filter|Filter|search|Search|sort|Sort|toggleSidebar|collapseSidebar|Dropdown|Chat|chat|backTo|goBack)/;
    const MONEY_RE = /(VNĐ|\(Đ\)|\bĐ\b|TIỀN|DOANH THU|TỔNG|CHI PHÍ|LỢI NHUẬN|SỐ DƯ|CƯỚC|LƯƠNG|THỰC NHẬN|ĐƠN GIÁ)/i;
    const KEY_RE = /(KHÁCH|ĐỐI TÁC|TÀI XẾ|NHÂN VIÊN|HỌ VÀ TÊN|HỌ TÊN|BIỂN SỐ|TUYẾN|TRẠNG THÁI|TÌNH TRẠNG|NHÀ XE|THẦU PHỤ)/i;
    // cột mô tả: ưu tiên làm tiêu đề thẻ khi cột đầu chỉ là mã/biểu tượng ngắn
    const DESC_RE = /^(NỘI DUNG|MÔ TẢ|DIỄN GIẢI|KHOẢN MỤC|HẠNG MỤC)/i;
    const SKIP_RE = /^(STT|#|BƯỚC|)$/i;

    const isMobile = () => MQ.matches;
    const inOverlay = el => !!el.closest('[id*=modal], [role=dialog], #m-sheet, .fixed, aside, #topbar-notification-container, #topbar-user-dropdown-container, header');
    const viewOf = el => el.closest('.view') || document.body;
    const visibleView = el => { const v = viewOf(el); return v === document.body || (!v.classList.contains('hidden-view') && v.offsetParent !== null); };

    // ---------------------------------------------------------------- KPI
    function markKpis(root) {
        root.querySelectorAll('p.tabular-nums.font-black:is(.text-xl, .text-2xl, .text-3xl)').forEach(p => {
            if (inOverlay(p) || p.closest('table')) return;
            let card = p.parentElement;
            while (card && card.parentElement) {
                const parent = card.parentElement;
                const disp = getComputedStyle(parent).display;
                if (disp === 'grid' && parent.children.length >= 2) {
                    parent.classList.add('m-kpi-grid');
                    [...parent.children].forEach(c => c.classList.add('m-kpi-card'));
                    return;
                }
                card = parent;
                if (card.matches('.view, main, body')) return;
            }
        });
    }

    // ---------------------------------------------------------------- Tabs
    function markTabs(root) {
        root.querySelectorAll('div, nav').forEach(c => {
            if (c.classList.contains('m-tabs') || inOverlay(c)) return;
            const btns = [...c.children].filter(b => b.matches('button') && /^\s*switch\w*\(/.test(b.getAttribute('onclick') || ''));
            if (btns.length >= 2) c.classList.add('m-tabs');
        });
    }

    // ---------------------------------------------------------------- Actions
    function markActions(root) {
        root.querySelectorAll('[data-m-actions] button, [data-m-actions] a, [data-m-hide] button, button[onclick], a[onclick]').forEach(b => {
            if (b.classList.contains('m-act') || b.closest('[data-m-keep]') || b.closest('table') || b.closest('.m-kpi-card') || inOverlay(b)) return;
            if (b.matches('a') && !b.getAttribute('onclick') && (!b.getAttribute('href') || b.getAttribute('href') === '#') && b.classList.contains('hidden')) return;
            const on = b.getAttribute('onclick') || '';
            const forced = !!b.closest('[data-m-actions], [data-m-hide]');
            if (!forced && (!ACTION_RE.test(on) || KEEP_RE.test(on.split('(')[0]))) return;
            if (b.closest('.m-tabs')) return;
            b.classList.add('m-act');
        });
    }

    // ---------------------------------------------------------------- Filters
    function markFilters(root) {
        root.querySelectorAll('select').forEach(sel => {
            if (inOverlay(sel) || sel.closest('table') || sel.closest('[data-m-keep]') || sel.closest('form')) return;
            // vùng lọc = tổ tiên gần nhất chứa >= 2 select
            let box = sel.parentElement;
            while (box && box.querySelectorAll('select').length < 2 && !box.matches('.view, main')) box = box.parentElement;
            if (!box || box.matches('.view, main') || box.classList.contains('m-filters')) return;
            if (box.closest('.m-filters') || box.querySelector('.m-filters')) return;
            box.classList.add('m-filters');
            const t = document.createElement('button');
            t.type = 'button';
            t.className = 'm-filter-toggle';
            t.innerHTML = '<i class="ph-bold ph-funnel"></i><span>Bộ lọc</span><b class="m-filter-count"></b>';
            t.addEventListener('click', () => { box.classList.toggle('m-open'); updateFilterCount(box); });
            box.insertBefore(t, box.firstChild);
            box.querySelectorAll('select').forEach(s => { s.dataset.mDefault = s.value; });
            box.addEventListener('change', () => updateFilterCount(box));
            updateFilterCount(box);
        });
    }

    function updateFilterCount(box) {
        const n = [...box.querySelectorAll('select')].filter(s => s.dataset.mDefault !== undefined && s.value !== s.dataset.mDefault).length;
        const b = box.querySelector(':scope > .m-filter-toggle .m-filter-count');
        if (b) b.textContent = n ? String(n) : '';
    }

    // Dòng mô tả "Bộ Lọc & Sắp Xếp: ..." thừa trên điện thoại (đã có nút Bộ lọc)
    function markFilterCaptions(root) {
        root.querySelectorAll('span').forEach(sp => {
            if (sp.classList.contains('m-hide') || !/^\s*Bộ Lọc & Sắp Xếp/i.test(sp.textContent || '')) return;
            const row = sp.parentElement;
            const target = row && row.children.length <= 2 && !row.querySelector('button, select, input') ? row : sp;
            target.classList.add('m-hide');
        });
    }

    // ---------------------------------------------------------------- Tables -> cards
    function headerCells(table) {
        const rows = table.tHead ? [...table.tHead.rows] : [];
        if (!rows.length) return null;
        const cols = [];
        for (const th of rows[rows.length - 1].cells) {
            const span = +(th.getAttribute('colspan') || 1);
            const label = (th.innerText || '').replace(/\s+/g, ' ').replace(/[↑↓⇅]/g, '').trim();
            const isCheck = !!th.querySelector('input[type=checkbox]');
            const isAct = th.getAttribute('data-col-key') === 'actions' || /THAO TÁC/i.test(label);
            for (let i = 0; i < span; i++) cols.push({ label, isCheck, isAct });
        }
        return cols;
    }

    function rolesFor(cols) {
        let title = -1, keys = 0, money = 0;
        const descIdx = cols.findIndex(c => DESC_RE.test(c.label));
        return cols.map((c, i) => {
            if (c.isCheck || SKIP_RE.test(c.label)) return 'm-skip';
            if (c.isAct) return 'm-actions';
            if (descIdx >= 0 && i === descIdx) { title = i; return 'm-title'; }
            if (title < 0 && (descIdx < 0 || i > descIdx)) { title = i; return 'm-title'; }
            if (title < 0 && descIdx >= 0 && i < descIdx) return 'm-key';
            if (MONEY_RE.test(c.label) && money < 2) { money++; return 'm-key m-money'; }
            if (KEY_RE.test(c.label) && keys < 3) { keys++; return 'm-key'; }
            return 'm-minor';
        });
    }

    function cardifyTable(table) {
        if (table.closest('[data-m-keep]') || inOverlay(table)) return;
        const cols = headerCells(table);
        if (!cols || cols.length < 4) return;
        const roles = rolesFor(cols);
        const sig = cols.map(c => c.label).join('|');
        table.classList.add('m-cards');
        const rows = [...(table.tBodies[0] ? table.tBodies[0].rows : []), ...(table.tFoot ? table.tFoot.rows : [])];
        for (const tr of rows) {
            if (tr.dataset.mSig === sig) continue;
            tr.dataset.mSig = sig;
            let idx = 0, hasMinor = false;
            for (const td of tr.cells) {
                const span = +(td.getAttribute('colspan') || 1);
                td.classList.remove('m-skip', 'm-actions', 'm-title', 'm-key', 'm-money', 'm-minor');
                if (span >= Math.max(3, cols.length - 2)) { td.classList.add('m-full'); idx += span; continue; }
                const role = roles[idx] || 'm-minor';
                role.split(' ').forEach(r => td.classList.add(r));
                if (role === 'm-minor' || role === 'm-actions') hasMinor = hasMinor || (td.innerText || '').trim() !== '' || !!td.querySelector('button, a');
                td.setAttribute('data-label', (cols[idx] && cols[idx].label) || '');
                idx += span;
            }
            const opensDetail = tr.hasAttribute('onclick') || !!tr.querySelector(':scope > td[onclick]');
            tr.classList.toggle('m-expandable', hasMinor && !opensDetail);
            tr.classList.toggle('m-opens', opensDetail);
        }
    }

    function markTables(root) {
        root.querySelectorAll('table').forEach(cardifyTable);
    }

    document.addEventListener('click', e => {
        if (!isMobile()) return;
        const tr = e.target.closest('tr.m-expandable');
        if (!tr || e.target.closest('button, a, input, select, textarea, label')) return;
        tr.classList.toggle('m-expanded');
    });

    // ---------------------------------------------------------------- Bảng chọn "Thao tác"
    function ensureSheet() {
        let sheet = document.getElementById('m-sheet');
        if (sheet) return sheet;
        sheet = document.createElement('div');
        sheet.id = 'm-sheet';
        sheet.innerHTML = '<div class="m-sheet-backdrop"></div><div class="m-sheet-panel" role="dialog" aria-label="Thao tác">' +
            '<div class="m-sheet-head"><span>Thao tác</span><button type="button" class="m-sheet-close" aria-label="Đóng"><i class="ph-bold ph-x"></i></button></div>' +
            '<div class="m-sheet-list"></div></div>';
        document.body.appendChild(sheet);
        sheet.querySelector('.m-sheet-backdrop').addEventListener('click', closeSheet);
        sheet.querySelector('.m-sheet-close').addEventListener('click', closeSheet);
        return sheet;
    }

    function closeSheet() { const s = document.getElementById('m-sheet'); if (s) s.classList.remove('m-open'); }

    function currentActions() {
        const seen = new Set();
        return [...document.querySelectorAll('.m-act')].filter(b => {
            if (!visibleView(b) || b.disabled) return false;
            const host = b.closest('.hidden, .hidden-view, [hidden]');
            // vùng [data-m-hide] chỉ ẩn trên điện thoại, nút bên trong vẫn đưa vào bảng chọn
            if (host && !host.classList.contains('m-act')) return false;
            const label = (b.innerText || b.title || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
            if (!label || seen.has(label)) return false;
            seen.add(label);
            b._mLabel = label;
            return true;
        });
    }

    function openSheet() {
        const sheet = ensureSheet();
        const list = sheet.querySelector('.m-sheet-list');
        list.innerHTML = '';
        const danger = b => /^(xóa|xoá|hủy|huỷ|từ chối|delete)/i.test(b._mLabel) || /delete|remove|cancel/i.test(b.getAttribute('onclick') || '');
        const acts = currentActions();
        [...acts.filter(b => !danger(b)), ...acts.filter(danger)].forEach(b => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'm-sheet-item' + (danger(b) ? ' m-danger' : '');
            const icon = b.querySelector('i');
            item.innerHTML = (icon ? `<i class="${icon.className.replace(/\btext-\S+/g, '')}"></i>` : '<i class="ph-bold ph-dot-outline"></i>') + '<span></span>';
            item.querySelector('span').textContent = b._mLabel;
            item.addEventListener('click', () => { closeSheet(); b.click(); });
            list.appendChild(item);
        });
        sheet.classList.add('m-open');
    }

    function updateActionsButton() {
        const btn = document.getElementById('m-actions-btn');
        if (!btn) return;
        const show = isMobile() && currentActions().length > 0;
        btn.classList.toggle('hidden', !show);
        btn.classList.toggle('flex', show);
    }

    // ---------------------------------------------------------------- Khe hiển thị: đưa phần tử quan trọng lên đầu
    function applySlots() {
        document.querySelectorAll('[data-m-slot]').forEach(slot => {
            const el = document.getElementById(slot.getAttribute('data-m-slot'));
            if (!el) return;
            if (!el._mHome) { el._mHome = document.createComment('m-slot-home'); el.parentNode.insertBefore(el._mHome, el); }
            if (isMobile()) { if (el.parentNode !== slot) { slot.appendChild(el); el.classList.add('m-slotted'); } }
            else if (el._mHome.parentNode && el.parentNode === slot) { el._mHome.parentNode.insertBefore(el, el._mHome.nextSibling); el.classList.remove('m-slotted'); }
        });
    }

    // ---------------------------------------------------------------- Chạy
    function scan() {
        applySlots();
        if (!isMobile()) { updateActionsButton(); return; }
        const root = document.body;
        markKpis(root);
        markTabs(root);
        markActions(root);
        markFilters(root);
        markFilterCaptions(root);
        markTables(root);
        updateActionsButton();
    }

    let timer = null;
    const schedule = () => { if (timer) return; timer = setTimeout(() => { timer = null; scan(); }, 200); };

    function start() {
        const btn = document.getElementById('m-actions-btn');
        if (btn) btn.addEventListener('click', openSheet);
        scan();
        if (typeof MutationObserver === 'function') {
            new MutationObserver(muts => {
                if (!isMobile()) return;
                if (muts.some(m => m.target.id !== 'm-sheet' && !(m.target.closest && m.target.closest('#m-sheet')))) schedule();
            }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        }
        if (MQ.addEventListener) MQ.addEventListener('change', scan); else if (MQ.addListener) MQ.addListener(scan);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
