// Màn Điều vận: tab "Phân bổ & gán xe", chế độ "Theo bước" của "Theo dõi hành trình" và tab "Quản lý Vendor".
// Dữ liệu: GET /api/vendor-admin/overview/ (nhà xe + tài khoản, link nhà xe, link tài xế),
// thao tác link tài xế: POST /api/vendor-admin/driver-links/<trip_id>/ (revoke | regenerate | set_expiry),
// tài khoản nhà xe: /api/vendor-portal-accounts/<id>/, link nhà xe: PATCH /api/vendor-allocations/<id>/.

var vaData = null;
var vaSection = 'accounts';
var vaLoading = false;
window.currentJourneyMode = window.currentJourneyMode || 'table';
var jboardRows = [];

const VA_SEC_ON = 'h-8 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-teal-50/90 text-teal-900 border-teal-600';
const VA_SEC_OFF = 'h-8 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white text-slate-700 border-slate-200';
const VA_BTN = 'h-7 px-2.5 text-xs font-bold rounded-lg border inline-flex items-center gap-1 cursor-pointer transition-colors ';
const VA_BTN_TEAL = VA_BTN + 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-600 hover:text-white';
const VA_BTN_GRAY = VA_BTN + 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100';
const VA_BTN_AMBER = VA_BTN + 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
const VA_BTN_ROSE = VA_BTN + 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white';

function vaEsc(v) { return (typeof escapeHtml === 'function') ? escapeHtml(v == null ? '' : String(v)) : String(v == null ? '' : v); }

function vaFmt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function vaState(cls, icon, text) {
    return `<span class="text-xs font-bold ${cls} inline-flex items-center gap-1"><i class="ph-bold ${icon}"></i> ${text}</span>`;
}

function vaExpiry(iso, expired) {
    if (!iso) return '<span class="text-slate-600">Không giới hạn</span>';
    return `<span class="${expired ? 'text-rose-700 font-bold' : 'text-slate-700'}">${vaFmt(iso)}</span>`;
}

async function vaApi(url, method, body) {
    const res = await fetchWithAuth(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined
    });
    let out = {};
    try { out = await res.json(); } catch (e) { /* phản hồi không phải JSON */ }
    return { ok: res.ok && out.success !== false, out };
}

function vaCopy(text, okMsg) {
    if (!text) return;
    const done = () => showToast('success', okMsg || 'Đã sao chép link.');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => prompt('Sao chép liên kết:', text));
    } else {
        prompt('Sao chép liên kết:', text);
    }
}

// ---------- hộp thoại dùng chung ----------
function vaCloseModal() {
    const el = document.getElementById('va-modal-root');
    if (el) el.remove();
}

function vaOpenModal(title, bodyHtml, okText, onOk, opts = {}) {
    vaCloseModal();
    const root = document.createElement('div');
    root.id = 'va-modal-root';
    root.className = 'fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4';
    root.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm w-full ${opts.wide ? 'max-w-lg' : 'max-w-md'} overflow-hidden border border-slate-200" role="dialog" aria-modal="true">
            <div class="px-5 py-3 bg-gradient-to-r from-teal-800 to-teal-950 text-white flex items-center justify-between">
                <h3 class="text-sm font-bold font-heading">${vaEsc(title)}</h3>
                <button type="button" onclick="vaCloseModal()" class="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center cursor-pointer" title="Đóng"><i class="ph-bold ph-x"></i></button>
            </div>
            <div class="p-5 max-h-[70vh] overflow-auto text-sm">${bodyHtml}</div>
            <div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" onclick="vaCloseModal()" class="h-9 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer">${okText ? 'Huỷ bỏ' : 'Đóng'}</button>
                ${okText ? `<button type="button" id="va-modal-ok" class="btn-keep-solid h-9 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">${vaEsc(okText)}</button>` : ''}
            </div>
        </div>`;
    document.body.appendChild(root);
    const ok = document.getElementById('va-modal-ok');
    if (ok && onOk) {
        ok.addEventListener('click', async () => {
            if (ok.disabled) return;
            ok.disabled = true;
            const old = ok.innerHTML;
            ok.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Đang xử lý...';
            try {
                const keepOpen = await onOk();
                if (keepOpen === false) { ok.disabled = false; ok.innerHTML = old; }
            } catch (e) {
                showToast('danger', e.message || 'Có lỗi xảy ra.');
                ok.disabled = false; ok.innerHTML = old;
            }
        });
    }
    const first = root.querySelector('input,select');
    if (first) first.focus();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') vaCloseModal(); });

function vaDaysForm(desc, defaultDays, allowUnlimited) {
    return `
        <p class="text-slate-600 text-sm mb-3">${desc}</p>
        <label class="block text-xs font-bold text-slate-700 mb-1.5" for="va-days">Số ngày hiệu lực</label>
        <input id="va-days" type="number" min="${allowUnlimited ? 0 : 1}" max="365" value="${defaultDays == null ? '' : defaultDays}" class="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-none">
        <p class="text-xs text-slate-500 mt-1.5">${allowUnlimited ? 'Nhập 0 hoặc để trống nếu không giới hạn thời gian. ' : ''}Tối đa 365 ngày.</p>
        <p id="va-days-err" class="text-xs font-bold text-rose-700 mt-1.5 hidden"></p>`;
}

function vaReadDays(allowUnlimited) {
    const inp = document.getElementById('va-days');
    const err = document.getElementById('va-days-err');
    const raw = (inp.value || '').trim();
    const n = raw === '' ? 0 : Number(raw);
    const bad = !Number.isInteger(n) || n < 0 || n > 365 || (!allowUnlimited && n < 1);
    if (bad) {
        err.textContent = allowUnlimited ? 'Số ngày phải từ 0 đến 365.' : 'Số ngày phải từ 1 đến 365.';
        err.classList.remove('hidden');
        inp.classList.add('border-rose-500');
        inp.focus();
        return null;
    }
    return n;
}

// ---------- dữ liệu chung ----------
async function loadVendorAdminData(force) {
    if (vaLoading) return vaData;
    if (vaData && !force) return vaData;
    vaLoading = true;
    try {
        const incl = document.getElementById('va-include-done');
        const res = await fetchWithAuth('/api/vendor-admin/overview/' + (incl && incl.checked ? '?include_done=1' : ''));
        const out = await res.json();
        if (!res.ok || out.success === false) throw new Error(out.message || 'Không tải được dữ liệu nhà xe.');
        vaData = out.data;
        return vaData;
    } finally {
        vaLoading = false;
    }
}

function vaFillVendorSelect(selId) {
    const sel = document.getElementById(selId);
    if (!sel || !vaData) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Tất cả nhà xe</option>' + vaData.vendors.map(v => `<option value="${v.id}">${vaEsc(v.short_name)}</option>`).join('');
    sel.value = cur;
}

// =============================================================
// TAB 2: PHÂN BỔ & GÁN XE
// =============================================================
async function loadAllocationsTab(force) {
    const tbody = document.getElementById('dispatch-allocations-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400">Đang tải danh sách phân bổ...</td></tr>';
    try {
        await loadVendorAdminData(force !== false);
        vaFillVendorSelect('alloc-filter-vendor');
        renderAllocationsTable();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-rose-700 font-bold">${vaEsc(e.message)}</td></tr>`;
    }
}

function renderAllocationsTable() {
    const tbody = document.getElementById('dispatch-allocations-tbody');
    if (!tbody || !vaData) return;
    const vendor = (document.getElementById('alloc-filter-vendor') || {}).value || '';
    const showAll = !!(document.getElementById('alloc-show-all') || {}).checked;
    let rows = vaData.links.filter(l => !vendor || String(l.subcontractor_id) === vendor);
    const total = rows.length;
    if (!showAll) rows = rows.filter(l => l.filled < l.allocated_containers);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
    set('alloc-shown-count', rows.length);
    set('alloc-total-count', total);
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-400 font-medium">Mọi phiếu phân bổ đã gán đủ xe/tài. Không có việc cần gán tiếp.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map((l, i) => {
        const left = l.allocated_containers - l.filled;
        const pct = l.allocated_containers ? Math.round(100 * l.filled / l.allocated_containers) : 0;
        let st;
        if (l.expired) st = vaState('text-rose-700', 'ph-warning-circle', 'Link hết hạn');
        else if (l.locked) st = vaState('text-slate-600', 'ph-lock', 'Đã khóa');
        else if (left <= 0) st = vaState('text-emerald-700', 'ph-check-circle', 'Đã gán đủ');
        else if (l.filled === 0) st = vaState('text-rose-700', 'ph-hourglass-medium', `Chưa gán xe nào (còn ${left})`);
        else st = vaState('text-amber-700', 'ph-arrows-split', `Gán chưa hết (còn ${left})`);
        return `
        <tr class="hover:bg-teal-50/30 cursor-pointer" onclick="openDispatchOrderPage(${l.booking_id})" title="Bấm để mở lệnh và gán tiếp">
            <td class="p-2.5 text-center text-slate-400 font-mono text-xs">${i + 1}</td>
            <td class="p-2.5"><div class="font-mono font-bold text-teal-900 text-xs">${vaEsc(l.booking_code)}</div><div class="text-xs text-slate-600">${vaEsc(l.customer)}</div></td>
            <td class="p-2.5 font-bold text-slate-800">${vaEsc(l.subcontractor)}</td>
            <td class="p-2.5 text-right font-bold tabular-nums">${l.allocated_containers}</td>
            <td class="p-2.5">
                <div class="text-xs font-bold text-slate-800 tabular-nums">${l.filled} / ${l.allocated_containers} cont đã gán xe</div>
                <div class="h-1.5 mt-1 rounded bg-slate-200 w-40"><div class="h-1.5 rounded ${left <= 0 ? 'bg-emerald-600' : 'bg-amber-500'}" style="width:${pct}%"></div></div>
            </td>
            <td class="p-2.5">${st}</td>
            <td class="p-2.5 text-xs">${vaExpiry(l.expires_at, l.expired)}</td>
            <td class="p-2.5 text-center" onclick="event.stopPropagation()">
                <div class="inline-flex items-center gap-1.5">
                    <button type="button" class="${VA_BTN_TEAL}" onclick="openDispatchOrderPage(${l.booking_id})" title="Mở lệnh để gán tiếp xe/tài"><i class="ph-bold ph-plus-circle"></i> Gán tiếp</button>
                    <button type="button" class="${VA_BTN_GRAY}" onclick="vaCopyAlloc(${l.id})" title="Sao chép link nhà xe để nhắc gán xe"><i class="ph-bold ph-copy"></i> Link</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// =============================================================
// TAB 3: THEO DÕI HÀNH TRÌNH (chế độ xem)
// =============================================================
function setJourneyMode(mode) {
    if (!['table', 'board', 'trips'].includes(mode)) mode = 'table';
    window.currentJourneyMode = mode;
    ['dispatch-vendor-containers-view', 'dispatch-journey-board-view', 'dispatch-trips-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    });
    [['table', 'jmode-table'], ['board', 'jmode-board'], ['trips', 'jmode-trips']].forEach(([m, id]) => {
        const b = document.getElementById(id);
        if (b) b.className = (m === mode ? VA_SEC_ON : VA_SEC_OFF);
    });
    const show = id => { const el = document.getElementById(id); if (el) { el.classList.remove('hidden'); el.classList.add('flex'); } };
    if (mode === 'table') {
        show('dispatch-vendor-containers-view');
        if (typeof loadVendorContainersTab === 'function') loadVendorContainersTab();
    } else if (mode === 'board') {
        show('dispatch-journey-board-view');
        loadJourneyBoard();
    } else {
        show('dispatch-trips-view');
        if (typeof loadTripsData === 'function') loadTripsData();
    }
}

const JOURNEY_COLUMNS = [
    ['READY', 'Đã nhận lệnh', 'ph-file-text', 'text-slate-700'],
    ['ARRIVED_AT_PICKUP', 'Đã đến nơi nhận', 'ph-map-pin', 'text-teal-700'],
    ['LOADED_ON_VEHICLE', 'Đã nhận cont/hàng', 'ph-truck', 'text-indigo-700'],
    ['ARRIVED_AT_DELIVERY', 'Đã đến nơi giao', 'ph-flag', 'text-indigo-700'],
    ['UNLOADED', 'Đã giao xong', 'ph-package', 'text-amber-700'],
    ['RETURNING_EMPTY', 'Đang đi hạ rỗng', 'ph-arrow-u-down-left', 'text-amber-700'],
];

async function loadJourneyBoard() {
    const body = document.getElementById('jboard-body');
    if (!body) return;
    body.innerHTML = '<div class="p-6 text-slate-400 text-sm">Đang tải hành trình...</div>';
    try {
        const res = await fetchWithAuth('/api/dispatch/vendor-containers/?status=ACTIVE');
        const out = await res.json();
        if (!res.ok || out.success === false) throw new Error(out.message || 'Không tải được hành trình.');
        jboardRows = out.data || [];
        renderJourneyBoard();
    } catch (e) {
        body.innerHTML = `<div class="p-6 text-rose-700 font-bold text-sm">${vaEsc(e.message)}</div>`;
    }
}

function renderJourneyBoard() {
    const body = document.getElementById('jboard-body');
    if (!body) return;
    const q = ((document.getElementById('jboard-search') || {}).value || '').trim().toLowerCase();
    const rows = jboardRows.filter(r => !q || [r.container_number, r.tractor_plate, r.driver_name, r.vendor_short, r.vendor_name, r.trip_code]
        .some(x => String(x || '').toLowerCase().includes(q)));
    if (!rows.length) {
        body.innerHTML = '<div class="p-8 text-slate-400 font-medium text-sm">Chưa có xe nào đang hành trình.</div>';
        return;
    }
    body.innerHTML = JOURNEY_COLUMNS.map(([step, label, icon, cls]) => {
        const items = rows.filter(r => (r.step_status || 'READY') === step);
        const cards = items.length ? items.map(r => `
            <div class="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-teal-50/40 cursor-pointer" onclick="viewTripDetail('${vaEsc(r.trip_code)}')" title="Xem phiếu vận chuyển ${vaEsc(r.trip_code)}">
                <div class="font-mono font-bold text-xs text-slate-900">${vaEsc(r.container_number)}</div>
                <div class="text-xs font-bold text-teal-800 mt-0.5">${vaEsc(r.vendor_short || r.vendor_name)}</div>
                <div class="text-xs text-slate-600 mt-0.5 font-mono">${vaEsc(r.tractor_plate && r.tractor_plate !== '--' ? r.tractor_plate : 'Chưa có biển số')}</div>
                <div class="text-xs text-slate-600">${vaEsc(r.driver_name && r.driver_name !== '--' ? r.driver_name : 'Chưa gán tài')}</div>
            </div>`).join('') : '<div class="text-xs text-slate-400 px-1 py-2">Không có</div>';
        return `
        <div class="w-60 shrink-0 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
            <div class="text-xs font-bold ${cls} flex items-center gap-1.5 mb-2 uppercase tracking-wider"><i class="ph-bold ${icon}"></i><span>${label}</span><span class="text-slate-500 tabular-nums">(${items.length})</span></div>
            <div class="space-y-2">${cards}</div>
        </div>`;
    }).join('');
}

// =============================================================
// TAB 4: QUẢN LÝ VENDOR
// =============================================================
async function loadVendorAdminTab(force) {
    const body = document.getElementById('va-body');
    if (!body) return;
    body.innerHTML = '<div class="p-6 text-slate-400 text-sm">Đang tải dữ liệu cổng nhà xe...</div>';
    try {
        await loadVendorAdminData(force !== false);
        vaFillVendorSelect('va-filter-vendor');
        renderVendorAdmin();
    } catch (e) {
        body.innerHTML = `<div class="p-6 text-rose-700 font-bold text-sm">${vaEsc(e.message)}</div>`;
    }
}

function setVendorAdminSection(sec) {
    vaSection = sec;
    [['accounts', 'vasec-accounts'], ['links', 'vasec-links'], ['drivers', 'vasec-drivers']].forEach(([k, id]) => {
        const b = document.getElementById(id);
        if (b) b.className = (k === sec ? VA_SEC_ON : VA_SEC_OFF);
    });
    const wrap = document.getElementById('va-done-wrap');
    if (wrap) { wrap.classList.toggle('hidden', sec !== 'drivers'); wrap.classList.toggle('flex', sec === 'drivers'); }
    renderVendorAdmin();
}

function renderVendorAdmin() {
    const body = document.getElementById('va-body');
    if (!body || !vaData) return;
    const vendor = (document.getElementById('va-filter-vendor') || {}).value || '';
    const sum = document.getElementById('va-summary');
    const withAcct = vaData.vendors.filter(v => v.account).length;
    const linksOk = vaData.links.filter(l => l.state === 'valid').length;
    const drvOk = vaData.driver_links.filter(d => d.state === 'valid').length;
    if (sum) sum.innerText = `${withAcct}/${vaData.vendors.length} nhà xe có tài khoản · ${linksOk} link nhà xe và ${drvOk} link tài xế còn hiệu lực`;
    if (vaSection === 'links') body.innerHTML = vaRenderLinks(vendor);
    else if (vaSection === 'drivers') body.innerHTML = vaRenderDrivers(vendor);
    else body.innerHTML = vaRenderAccounts(vendor);
}

const VA_TH = 'p-2.5 font-bold uppercase tracking-wider text-xs text-slate-700';
function vaTable(headers, rowsHtml, empty) {
    return `<table class="w-full text-left erp-table whitespace-nowrap text-xs" data-no-toolbar="true">
        <thead class="bg-slate-100 sticky top-0 z-10 shadow-2xs font-heading"><tr>${headers.map(h => `<th class="${VA_TH}">${h}</th>`).join('')}</tr></thead>
        <tbody class="divide-y divide-slate-100 bg-white">${rowsHtml || `<tr><td colspan="${headers.length}" class="p-8 text-center text-slate-400 font-medium">${empty}</td></tr>`}</tbody></table>`;
}

function vaRenderAccounts(vendor) {
    const rows = vaData.vendors.filter(v => !vendor || String(v.id) === vendor).map(v => {
        const a = v.account;
        let st, acctCell, tokenCell, actions;
        if (!a) {
            st = vaState('text-amber-700', 'ph-user-minus', 'Chưa cấp tài khoản');
            acctCell = '<span class="text-slate-400">—</span>';
            tokenCell = '<span class="text-slate-400">—</span>';
            actions = `<button type="button" class="${VA_BTN_TEAL}" onclick="vaAccountModal(${v.id})"><i class="ph ph-user-plus"></i> Cấp tài khoản</button>`;
        } else {
            st = a.locked ? vaState('text-rose-700', 'ph-lock', 'Đang bị khóa (sai quá nhiều lần)')
                : a.is_active ? vaState('text-emerald-700', 'ph-check-circle', 'Đang hoạt động')
                    : vaState('text-slate-600', 'ph-prohibit', 'Đã tắt');
            acctCell = `<span class="font-mono font-bold text-slate-800">${vaEsc(a.username)}</span><div class="text-xs text-slate-500">Tự đăng xuất sau ${a.idle_timeout_minutes} phút</div>`;

            let tokDisplay = '';
            if (a.plain_token) {
                tokDisplay = `
                    <div class="flex items-center gap-1.5">
                        <span id="va-tok-txt-${v.id}" class="font-mono font-bold text-slate-800 text-xs">••••••••</span>
                        <button type="button" class="text-slate-400 hover:text-teal-700 p-0.5 rounded cursor-pointer transition-colors" onclick="vaToggleShowToken(${v.id})" title="Hiện/ẩn mã token"><i id="va-tok-eye-${v.id}" class="ph ph-eye text-sm"></i></button>
                        <button type="button" class="text-slate-400 hover:text-teal-700 p-0.5 rounded cursor-pointer transition-colors" onclick="vaCopy('${vaEsc(a.plain_token)}', 'Đã sao chép mã token.')" title="Sao chép Token"><i class="ph ph-copy text-sm"></i></button>
                        <button type="button" class="text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors" onclick="vaCopy('${vaEsc(a.magic_link)}', 'Đã sao chép Link đăng nhập nhanh (Magic Link).')" title="Sao chép Link đăng nhập 1-chạm"><i class="ph ph-link text-xs"></i> Link</button>
                    </div>`;
            } else if (a.token_preview) {
                tokDisplay = `<span class="font-mono text-slate-600 text-xs">GSSV-••••${vaEsc(a.token_preview)}</span>`;
            } else {
                tokDisplay = '<span class="text-amber-700 font-bold text-xs">Chưa có token</span>';
            }

            let expDisplay = '';
            if (a.token_expires_at) {
                if (a.token_expired) {
                    expDisplay = `<div class="text-[11px] text-rose-700 font-bold flex items-center gap-1 mt-0.5"><i class="ph ph-warning-circle"></i> Hết hạn (${vaFmt(a.token_expires_at)})</div>`;
                } else {
                    expDisplay = `<div class="text-[11px] text-teal-700 font-medium flex items-center gap-1 mt-0.5"><i class="ph ph-clock"></i> Hạn: ${vaFmt(a.token_expires_at)}</div>`;
                }
            } else if (a.plain_token || a.token_preview) {
                expDisplay = `<div class="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><i class="ph ph-shield-check text-emerald-600"></i> Vô thời hạn</div>`;
            }

            tokenCell = `${tokDisplay}${expDisplay}`;

            actions = `
                <button type="button" class="${VA_BTN_TEAL}" onclick="vaIssueTokenModal(${v.id})" title="Chủ động đặt mã token và hạn dùng"><i class="ph ph-key"></i> Đặt Token</button>
                <button type="button" class="${VA_BTN_AMBER}" onclick="vaAccountModal(${v.id})" title="Sửa tên đăng nhập, mật khẩu, thời gian tự đăng xuất"><i class="ph ph-pencil-simple"></i> Sửa</button>
                <button type="button" class="${VA_BTN_GRAY}" onclick="vaShareVendorZaloModal(${v.id})" title="Xem mẫu tin nhắn gửi nhà xe qua Zalo"><i class="ph ph-chat-teardrop-text"></i> Zalo</button>
                ${a.locked ? `<button type="button" class="${VA_BTN_GRAY}" onclick="vaAccountAction(${v.id}, {unlock: true}, 'Đã mở khóa tài khoản.')"><i class="ph ph-lock-open"></i> Mở khóa</button>` : ''}
                <button type="button" class="${a.is_active ? VA_BTN_ROSE : VA_BTN_GRAY}" onclick="vaToggleAccount(${v.id}, ${a.is_active ? 'false' : 'true'})">${a.is_active ? '<i class="ph ph-prohibit"></i> Tắt' : '<i class="ph ph-power"></i> Bật'}</button>`;
        }
        return `<tr class="hover:bg-teal-50/30">
            <td class="p-2.5"><div class="font-bold text-slate-900">${vaEsc(v.short_name)}</div><div class="text-xs text-slate-500 font-mono">${vaEsc(v.code)}</div></td>
            <td class="p-2.5">${acctCell}</td>
            <td class="p-2.5">${tokenCell}</td>
            <td class="p-2.5">${st}</td>
            <td class="p-2.5 text-xs text-slate-600">${a && a.last_login_at ? vaFmt(a.last_login_at) : 'Chưa đăng nhập'}</td>
            <td class="p-2.5 text-xs tabular-nums"><strong>${v.links_valid}</strong> / ${v.links_total} link nhà xe<div class="text-slate-600"><strong>${v.driver_links_valid}</strong> link tài xế</div></td>
            <td class="p-2.5 text-center"><div class="inline-flex items-center gap-1.5 flex-wrap justify-center">${actions}</div></td>
        </tr>`;
    }).join('');
    return vaTable(['Nhà xe', 'Tài khoản', 'Token xác nhận', 'Trạng thái', 'Đăng nhập gần nhất', 'Link hiệu lực', 'Thao tác'], rows, 'Chưa có nhà xe nào.');
}

function vaRenderLinks(vendor) {
    const rows = vaData.links.filter(l => !vendor || String(l.subcontractor_id) === vendor).map(l => {
        const st = l.expired ? vaState('text-rose-700', 'ph-clock-countdown', 'Hết hạn')
            : l.locked ? vaState('text-slate-600', 'ph-lock', 'Đã khóa')
                : vaState('text-emerald-700', 'ph-check-circle', 'Còn hiệu lực');
        return `<tr class="hover:bg-teal-50/30">
            <td class="p-2.5 font-mono font-bold text-teal-900">${vaEsc(l.booking_code)}</td>
            <td class="p-2.5 font-bold text-slate-800">${vaEsc(l.subcontractor)}</td>
            <td class="p-2.5 tabular-nums">${l.filled} / ${l.allocated_containers} cont</td>
            <td class="p-2.5">${st}</td>
            <td class="p-2.5">${vaExpiry(l.expires_at, l.expired)}</td>
            <td class="p-2.5 text-xs text-slate-600">${l.last_opened_at ? vaFmt(l.last_opened_at) : 'Chưa mở'}</td>
            <td class="p-2.5 text-center"><div class="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <button type="button" class="${VA_BTN_GRAY}" onclick="vaCopyAlloc(${l.id})"><i class="ph ph-copy"></i> Sao chép</button>
                <button type="button" class="${VA_BTN_GRAY}" onclick="vaShareAllocZalo(${l.id})" title="Sao chép tin nhắn Zalo gửi Nhà xe"><i class="ph ph-chat-teardrop-text"></i> Zalo</button>
                <button type="button" class="${VA_BTN_TEAL}" onclick="vaRegenAlloc(${l.id})" title="Cấp link mới và đặt hạn, link cũ mất hiệu lực"><i class="ph ph-arrows-clockwise"></i> Cấp lại / đặt hạn</button>
                <button type="button" class="${VA_BTN_AMBER}" onclick="vaLockAlloc(${l.id}, ${l.locked ? 'false' : 'true'})">${l.locked ? '<i class="ph-bold ph-lock-open"></i> Mở khóa' : '<i class="ph-bold ph-lock"></i> Khóa'}</button>
                <button type="button" class="${VA_BTN_ROSE}" onclick="vaRevokeAlloc(${l.id})" title="Thu hồi phiếu (chỉ khi chưa sinh chuyến xe)"><i class="ph-bold ph-prohibit"></i> Thu hồi</button>
            </div></td>
        </tr>`;
    }).join('');
    return vaTable(['Lệnh', 'Nhà xe', 'Đã gán xe', 'Trạng thái link', 'Hạn dùng', 'Mở gần nhất', 'Thao tác'], rows, 'Chưa có link nhà xe nào.');
}

function vaRenderDrivers(vendor) {
    const rows = vaData.driver_links.filter(d => !vendor || String(d.vendor_id) === vendor).map(d => {
        const st = d.state === 'valid' ? vaState('text-emerald-700', 'ph-check-circle', 'Còn hiệu lực') : vaState('text-rose-700', 'ph-prohibit', 'Hết hạn / đã thu hồi');
        return `<tr class="hover:bg-teal-50/30">
            <td class="p-2.5"><button type="button" class="font-mono font-bold text-teal-800 hover:underline cursor-pointer" onclick="viewTripDetail('${vaEsc(d.trip_code)}')">${vaEsc(d.trip_code)}</button><div class="text-xs text-slate-500 font-mono">${vaEsc(d.container_number)}</div></td>
            <td class="p-2.5 font-bold text-slate-800">${vaEsc(d.vendor)}</td>
            <td class="p-2.5"><div class="font-semibold text-slate-800">${vaEsc(d.driver_name || 'Chưa gán tài')}</div><div class="text-xs text-slate-500 font-mono">${vaEsc(d.driver_phone)}${d.plate ? ' · ' + vaEsc(d.plate) : ''}</div></td>
            <td class="p-2.5 text-xs text-slate-700">${vaEsc(d.step_label)}</td>
            <td class="p-2.5">${st}</td>
            <td class="p-2.5">${vaExpiry(d.expires_at, d.state !== 'valid')}</td>
            <td class="p-2.5 text-center"><div class="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <button type="button" class="${VA_BTN_GRAY}" ${d.state === 'valid' ? '' : 'disabled style="opacity:.45;cursor:not-allowed"'} onclick="vaCopyDriver(${d.trip_id})"><i class="ph ph-copy"></i> Sao chép</button>
                <button type="button" class="${VA_BTN_GRAY}" ${d.state === 'valid' ? '' : 'disabled style="opacity:.45;cursor:not-allowed"'} onclick="vaShareDriverZalo(${d.trip_id})" title="Sao chép tin nhắn Zalo điều lệnh gửi Bác tài"><i class="ph ph-chat-teardrop-text"></i> Zalo</button>
                <button type="button" class="${VA_BTN_AMBER}" onclick="vaDriverExpiry(${d.trip_id})" title="Đặt hạn dùng, giữ nguyên link"><i class="ph ph-clock-countdown"></i> Đặt hạn</button>
                <button type="button" class="${VA_BTN_TEAL}" onclick="vaDriverRegen(${d.trip_id})" title="Cấp link mới, link cũ mất hiệu lực"><i class="ph-bold ph-arrows-clockwise"></i> Cấp lại</button>
                <button type="button" class="${VA_BTN_ROSE}" ${d.state === 'valid' ? '' : 'disabled style="opacity:.45;cursor:not-allowed"'} onclick="vaDriverRevoke(${d.trip_id})"><i class="ph-bold ph-prohibit"></i> Thu hồi</button>
            </div></td>
        </tr>`;
    }).join('');
    return vaTable(['Chuyến / cont', 'Nhà xe', 'Tài xế / xe', 'Bước hiện tại', 'Trạng thái link', 'Hạn dùng', 'Thao tác'], rows, 'Chưa có link tài xế nào đang chạy.');
}

// ---------- thao tác link nhà xe (phiếu chia) ----------
function vaFindAlloc(id) { return (vaData && vaData.links || []).find(l => l.id === id); }
function vaFindDriver(id) { return (vaData && vaData.driver_links || []).find(d => d.trip_id === id); }

function vaCopyAlloc(id) {
    const l = vaFindAlloc(id);
    if (!l || !l.vendor_link) { showToast('warning', 'Chưa có link để sao chép. Hãy bấm "Cấp lại / đặt hạn".'); return; }
    vaCopy(l.vendor_link, 'Đã sao chép link nhà xe, gửi qua Zalo/SMS.');
}

function vaRegenAlloc(id) {
    const l = vaFindAlloc(id);
    if (!l) return;
    vaOpenModal(`Cấp lại link nhà xe ${l.subcontractor}`, vaDaysForm(`Link cũ của lệnh <strong>${vaEsc(l.booking_code)}</strong> sẽ mất hiệu lực ngay. Link mới có hạn:`, vaData.default_link_days, true), 'Cấp link mới', async () => {
        const days = vaReadDays(true);
        if (days === null) return false;
        const { ok, out } = await vaApi(`/api/vendor-allocations/${id}/`, 'PATCH', { action: 'regenerate', expires_days: days });
        if (!ok) { showToast('danger', out.message || 'Không cấp được link mới.'); return false; }
        vaCloseModal();
        showToast('success', out.message || 'Đã cấp link mới.');
        if (out.link) vaCopy(out.link, 'Đã cấp link mới và sao chép vào clipboard.');
        await vaReload();
    });
}

async function vaLockAlloc(id, lock) {
    const { ok, out } = await vaApi(`/api/vendor-allocations/${id}/`, 'PATCH', { action: lock ? 'lock' : 'unlock' });
    showToast(ok ? 'success' : 'danger', ok ? (lock ? 'Đã khóa phiếu, nhà xe chỉ xem.' : 'Đã mở khóa phiếu.') : (out.message || 'Không thực hiện được.'));
    if (ok) await vaReload();
}

async function vaRevokeAlloc(id) {
    const l = vaFindAlloc(id);
    const yes = await showConfirmModal({ type: 'danger', title: 'Thu hồi phiếu chia cont', message: `Thu hồi phiếu của ${l ? l.subcontractor : 'nhà xe'} (lệnh ${l ? l.booking_code : ''})? Link nhà xe mất hiệu lực ngay. Chỉ thu hồi được khi chưa có chuyến xe.`, confirmText: 'Thu hồi' });
    if (!yes) return;
    const { ok, out } = await vaApi(`/api/vendor-allocations/${id}/`, 'PATCH', { action: 'revoke' });
    showToast(ok ? 'success' : 'danger', ok ? 'Đã thu hồi phiếu chia cont.' : (out.message || 'Không thu hồi được.'));
    if (ok) await vaReload();
}

// ---------- thao tác link tài xế ----------
function vaCopyDriver(tripId) {
    const d = vaFindDriver(tripId);
    if (d) vaCopy(d.link, 'Đã sao chép link tài xế, gửi qua Zalo.');
}

async function vaDriverPost(tripId, body, okMsg) {
    const { ok, out } = await vaApi(`/api/vendor-admin/driver-links/${tripId}/`, 'POST', body);
    if (!ok) { showToast('danger', out.message || 'Không thực hiện được.'); return false; }
    showToast('success', out.message || okMsg);
    await vaReload();
    return out;
}

function vaDriverExpiry(tripId) {
    const d = vaFindDriver(tripId);
    if (!d) return;
    vaOpenModal(`Đặt hạn link tài xế ${d.trip_code}`, vaDaysForm('Giữ nguyên link đã gửi, chỉ đổi thời hạn dùng tính từ bây giờ.', 3, true), 'Lưu hạn dùng', async () => {
        const days = vaReadDays(true);
        if (days === null) return false;
        const out = await vaDriverPost(tripId, { action: 'set_expiry', days }, 'Đã đặt hạn dùng.');
        if (!out) return false;
        vaCloseModal();
    });
}

function vaDriverRegen(tripId) {
    const d = vaFindDriver(tripId);
    if (!d) return;
    vaOpenModal(`Cấp lại link tài xế ${d.trip_code}`, vaDaysForm('Link và QR cũ của chuyến này mất hiệu lực ngay. Link mới có hạn:', 3, true), 'Cấp link mới', async () => {
        const days = vaReadDays(true);
        if (days === null) return false;
        const out = await vaDriverPost(tripId, { action: 'regenerate', days }, 'Đã cấp link mới.');
        if (!out) return false;
        vaCloseModal();
        if (out.data && out.data.link) vaCopy(out.data.link, 'Đã cấp link mới và sao chép vào clipboard.');
    });
}

async function vaDriverRevoke(tripId) {
    const d = vaFindDriver(tripId);
    const yes = await showConfirmModal({ type: 'danger', title: 'Thu hồi link tài xế', message: `Thu hồi link và QR của chuyến ${d ? d.trip_code : ''}? Tài xế mở link cũ sẽ thấy báo hết hạn. Có thể cấp lại sau.`, confirmText: 'Thu hồi link' });
    if (!yes) return;
    await vaDriverPost(tripId, { action: 'revoke' }, 'Đã thu hồi link tài xế.');
}

// ---------- tài khoản nhà xe ----------
async function vaReload() {
    await loadVendorAdminData(true);
    if (currentDispatchTab === 'vendor-admin') renderVendorAdmin();
    if (currentDispatchTab === 'allocations') renderAllocationsTable();
}

const vaTokenVisibility = {};

function vaToggleShowToken(vendorId) {
    vaTokenVisibility[vendorId] = !vaTokenVisibility[vendorId];
    const v = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
    if (!v || !v.account) return;
    const txtEl = document.getElementById(`va-tok-txt-${vendorId}`);
    const eyeEl = document.getElementById(`va-tok-eye-${vendorId}`);
    if (!txtEl || !eyeEl) return;
    const tok = v.account.plain_token || '';
    if (vaTokenVisibility[vendorId]) {
        txtEl.textContent = tok || '(chưa có)';
        txtEl.classList.add('text-teal-900', 'bg-teal-50', 'px-1.5', 'py-0.5', 'rounded');
        eyeEl.className = 'ph ph-eye-slash text-sm';
        eyeEl.title = 'Ẩn mã token';
    } else {
        txtEl.textContent = '••••••••';
        txtEl.classList.remove('text-teal-900', 'bg-teal-50', 'px-1.5', 'py-0.5', 'rounded');
        eyeEl.className = 'ph ph-eye text-sm';
        eyeEl.title = 'Hiện mã token';
    }
}

function vaGenRandomToken(targetInputId = 'va-token-custom') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const token = 'GSS-' + rand;
    const inp = document.getElementById(targetInputId);
    if (inp) {
        inp.value = token;
        inp.classList.add('bg-amber-50');
        setTimeout(() => inp.classList.remove('bg-amber-50'), 600);
        inp.focus();
    }
    return token;
}

function vaShowTokenResult(vendorName, data) {
    const tok = data.plain_token || data.issued_confirm_token || '';
    const expText = data.token_expires_at ? vaFmt(data.token_expires_at) : 'Vô thời hạn (Không bao giờ hết hạn)';
    const magic = data.magic_link || '';
    const zaloMsg = `Kính gửi Quý đối tác vận tải ${vendorName},\nPhòng Điều Vận GSS gửi thông tin tài khoản truy cập Cổng Nhà Xe:\n- Tên đăng nhập: ${data.username}\n- Mã Token xác nhận: ${tok}\n- Hạn dùng token: ${expText}\n- Link đăng nhập nhanh (1-chạm tự điền): ${magic}\nQuý nhà xe vui lòng mở link trên để cập nhật xe/tài và theo dõi lệnh vận chuyển.\nTrân trọng!`;

    const body = `
        <div class="space-y-3.5 text-xs">
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold flex items-center gap-2">
                <i class="ph ph-check-circle text-lg text-emerald-600"></i>
                <span>Token đã được lưu an toàn. Bạn có thể tra cứu và sao chép lại bất kỳ lúc nào!</span>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">Mã Token xác nhận:</label>
                <div class="flex items-center gap-2">
                    <input id="va-res-tok" readonly value="${vaEsc(tok)}" class="flex-1 h-10 px-3.5 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-slate-50 text-teal-900">
                    <button type="button" class="${VA_BTN_TEAL} h-10 px-3" onclick="vaCopy(document.getElementById('va-res-tok').value, 'Đã sao chép token.')"><i class="ph ph-copy"></i> Sao chép</button>
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">Thời hạn hiệu lực:</label>
                <div class="h-9 px-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center font-semibold text-slate-800">
                    <i class="ph ph-clock mr-1.5 text-teal-700"></i> ${vaEsc(expText)}
                </div>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">Link đăng nhập 1-chạm (Magic Link):</label>
                <div class="flex items-center gap-2">
                    <input id="va-res-magic" readonly value="${vaEsc(magic)}" class="flex-1 h-10 px-3.5 rounded-xl border border-slate-300 font-mono text-xs bg-slate-50 text-slate-700">
                    <button type="button" class="${VA_BTN_TEAL} h-10 px-3" onclick="vaCopy(document.getElementById('va-res-magic').value, 'Đã sao chép link đăng nhập nhanh.')"><i class="ph ph-link"></i> Sao chép Link</button>
                </div>
                <p class="text-[11px] text-slate-500 mt-1">Gửi link này cho Nhà xe: khi mở trang, Tên đăng nhập và Token sẽ được tự động điền sẵn.</p>
            </div>

            <div>
                <label class="block font-bold text-slate-700 mb-1">Mẫu tin nhắn Zalo gửi Nhà xe:</label>
                <textarea id="va-res-zalo" readonly rows="4" class="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 text-xs font-mono">${vaEsc(zaloMsg)}</textarea>
                <div class="mt-1.5 flex justify-end">
                    <button type="button" class="${VA_BTN_GRAY} h-9 px-3 font-semibold" onclick="vaCopy(document.getElementById('va-res-zalo').value, 'Đã sao chép toàn bộ tin nhắn Zalo.')"><i class="ph ph-chat-teardrop-text"></i> Sao chép tin nhắn Zalo</button>
                </div>
            </div>
        </div>
    `;
    vaOpenModal(`Thông tin Token & Cổng: ${vendorName}`, body, null, null, { wide: true });
}

function vaIssueTokenModal(vendorId) {
    const v = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
    if (!v) return;
    const a = v.account;
    const curTok = (a && a.plain_token) || '';
    const curExp = (a && a.token_expires_at) || '';
    const body = `
        <div class="mb-3.5">
            <label class="block text-xs font-bold text-slate-700 mb-1" for="va-token-custom">Mã Token xác nhận <span class="text-rose-600">*</span></label>
            <div class="flex items-center gap-2">
                <input id="va-token-custom" class="flex-1 h-10 px-3.5 rounded-xl border border-slate-300 font-mono font-bold text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-none uppercase" placeholder="Ví dụ: ANPHAT-2026 hoặc HP26" value="${vaEsc(curTok)}">
                <button type="button" class="${VA_BTN_GRAY} h-10 px-3 whitespace-nowrap cursor-pointer" onclick="vaGenRandomToken('va-token-custom')" title="Hệ thống tự sinh mã ngẫu nhiên"><i class="ph ph-magic-wand"></i> Sinh mã</button>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">Chủ động tự gõ mã theo ý muốn (ít nhất 4 ký tự) hoặc bấm <strong>Sinh mã</strong>.</p>
            <p id="va-token-custom-err" class="text-xs font-bold text-rose-700 mt-1 hidden"></p>
        </div>
        <div class="mb-3">
            <label class="block text-xs font-bold text-slate-700 mb-1" for="va-token-expiry">Thời hạn hiệu lực của Token</label>
            <select id="va-token-expiry" class="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-none" onchange="const d = document.getElementById('va-token-date-box'); if (this.value==='custom') d.classList.remove('hidden'); else d.classList.add('hidden');">
                <option value="never" ${!curExp ? 'selected' : ''}>Vô thời hạn (Khuyên dùng - Không bao giờ hết hạn)</option>
                <option value="30d">30 ngày (1 tháng)</option>
                <option value="90d">90 ngày (1 quý)</option>
                <option value="365d">365 ngày (1 năm)</option>
                <option value="7d">7 ngày (Ngắn hạn / Dự án)</option>
                <option value="custom" ${curExp ? 'selected' : ''}>Tùy chọn ngày hết hạn cụ thể...</option>
            </select>
            <div id="va-token-date-box" class="${curExp ? '' : 'hidden'} mt-2">
                <input id="va-token-custom-date" type="date" class="w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-none" value="${curExp ? curExp.slice(0, 10) : ''}">
            </div>
            <p class="text-[11px] text-slate-500 mt-1">Hết thời hạn này, nhà xe phải được gia hạn hoặc đổi token mới để truy cập.</p>
        </div>
    `;
    vaOpenModal(`Cấp / Đổi Token xác nhận: ${v.short_name}`, body, 'Lưu & Kích hoạt Token', async () => {
        const tokVal = document.getElementById('va-token-custom').value.trim();
        const expPreset = document.getElementById('va-token-expiry').value;
        const custDate = document.getElementById('va-token-custom-date').value;
        const errEl = document.getElementById('va-token-custom-err');
        errEl.classList.add('hidden');
        if (tokVal.length < 4) {
            errEl.textContent = 'Mã Token xác nhận phải có ít nhất 4 ký tự.';
            errEl.classList.remove('hidden');
            document.getElementById('va-token-custom').focus();
            return false;
        }
        const payload = { confirm_token: tokVal, token_expiry_preset: expPreset };
        if (expPreset === 'custom' && custDate) {
            payload.token_expires_at = custDate;
        }
        const out = await vaAccountAction(vendorId, payload, 'Đã kích hoạt Token xác nhận mới.');
        if (!out) return false;
        vaCloseModal();
        if (out.data) {
            vaShowTokenResult(v.short_name, out.data);
        }
    });
}

function vaShareVendorZaloModal(vendorId) {
    const v = (vaData && vaData.vendors || []).find(x => x.id === vendorId);
    if (!v || !v.account) return;
    vaShowTokenResult(v.short_name, {
        username: v.account.username,
        plain_token: v.account.plain_token || '',
        token_expires_at: v.account.token_expires_at,
        magic_link: v.account.magic_link || '',
    });
}

function vaShareAllocZalo(allocId) {
    const l = vaFindAlloc(allocId);
    if (!l) return;
    const expText = l.expires_at ? vaFmt(l.expires_at) : 'Không giới hạn';
    const msg = `Kính gửi Quý đối tác vận tải ${l.subcontractor},\nPhòng Điều Vận GSS thông báo Lệnh điều động Booking ${l.booking_code}${l.customer ? ' (' + l.customer + ')' : ''}:\n- Số lượng: ${l.allocated_containers} cont\n- Link nhận lệnh & gán xe/tài: ${l.vendor_link || '—'}\n- Hạn link: ${expText}\nQuý nhà xe vui lòng mở link trên điện thoại hoặc máy tính để gán Đầu kéo/Moóc và Bác tài nhận lệnh.\nTrân trọng!`;
    vaCopy(msg, 'Đã sao chép tin nhắn Zalo lệnh điều động cho nhà xe.');
}

function vaShareDriverZalo(tripId) {
    const d = vaFindDriver(tripId);
    if (!d) return;
    const expText = d.expires_at ? vaFmt(d.expires_at) : 'Không giới hạn';
    const msg = `LỆNH ĐIỀU ĐỘNG GSS - Bác tài: ${d.driver_name || 'Bác tài'}${d.driver_phone ? ' (' + d.driver_phone + ')' : ''}\n- Chuyến xe: ${d.trip_code} | Cont: ${d.container_number || 'Theo lệnh'}\n- Đầu kéo: ${d.plate || 'Theo lệnh'}\n- Link mở lệnh di động & cập nhật POD: ${d.link}\n- Hạn lệnh: ${expText}\nBác tài bấm link trên điện thoại khi đến cảng/kho lấy cont và giao hàng nhé!\nTrân trọng!`;
    vaCopy(msg, 'Đã sao chép tin nhắn Zalo điều lệnh gửi Bác tài.');
}

function vaShowToken(vendorName, token) {
    vaShowTokenResult(vendorName, { issued_confirm_token: token });
}

async function vaAccountAction(vendorId, body, okMsg) {
    const { ok, out } = await vaApi(`/api/vendor-portal-accounts/${vendorId}/`, 'POST', body);
    if (!ok) { showToast('danger', out.message || 'Không thực hiện được.'); return null; }
    showToast('success', okMsg || out.message || 'Đã cập nhật.');
    await vaReload();
    return out;
}

async function vaToggleAccount(vendorId, active) {
    if (!active) {
        const yes = await showConfirmModal({ type: 'danger', title: 'Tắt tài khoản cổng nhà xe', message: 'Nhà xe sẽ không đăng nhập được vào cổng cho tới khi bật lại.', confirmText: 'Tắt tài khoản' });
        if (!yes) return;
    }
    await vaAccountAction(vendorId, { is_active: active }, active ? 'Đã bật tài khoản.' : 'Đã tắt tài khoản.');
}

async function vaIssueToken(vendorId) {
    return vaIssueTokenModal(vendorId);
}

function vaAccountModal(vendorId) {
    const v = vaData.vendors.find(x => x.id === vendorId);
    if (!v) return;
    const a = v.account;
    const field = (id, label, input, hint) => `<div class="mb-3"><label class="block text-xs font-bold text-slate-700 mb-1.5" for="${id}">${label}</label>${input}${hint ? `<p class="text-xs text-slate-500 mt-1">${hint}</p>` : ''}<p id="${id}-err" class="text-xs font-bold text-rose-700 mt-1 hidden"></p></div>`;
    const cls = 'w-full h-10 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-none';
    const curTok = (a && a.plain_token) || '';
    const curExp = (a && a.token_expires_at) || '';
    const body = `
        ${field('va-f-user', 'Tên đăng nhập <span class="text-rose-600">*</span>', `<input id="va-f-user" class="${cls}" autocomplete="off" value="${vaEsc(a ? a.username : (v.code || '').toLowerCase())}">`, 'Ít nhất 3 ký tự, không trùng nhà xe khác.')}
        ${field('va-f-pass', a ? 'Mật khẩu mới' : 'Mật khẩu khởi tạo <span class="text-rose-600">*</span>', `<input id="va-f-pass" type="password" class="${cls}" autocomplete="new-password">`, a ? 'Để trống nếu không đổi mật khẩu.' : 'Ít nhất 6 ký tự.')}
        <div class="mb-3">
            <label class="block text-xs font-bold text-slate-700 mb-1.5" for="va-f-tok">Mã Token xác nhận</label>
            <div class="flex items-center gap-2">
                <input id="va-f-tok" class="${cls} flex-1 font-mono uppercase" placeholder="Tự gõ hoặc bấm Sinh mã" value="${vaEsc(curTok)}">
                <button type="button" class="${VA_BTN_GRAY} h-10 px-3 whitespace-nowrap cursor-pointer" onclick="vaGenRandomToken('va-f-tok')" title="Sinh mã ngẫu nhiên"><i class="ph ph-magic-wand"></i> Sinh mã</button>
            </div>
            <p class="text-xs text-slate-500 mt-1">Để trống nếu muốn giữ nguyên token hiện tại hoặc sinh tự động khi tạo mới.</p>
            <p id="va-f-tok-err" class="text-xs font-bold text-rose-700 mt-1 hidden"></p>
        </div>
        <div class="mb-3">
            <label class="block text-xs font-bold text-slate-700 mb-1.5" for="va-f-exp">Thời hạn Token</label>
            <select id="va-f-exp" class="${cls}">
                <option value="never" ${!curExp ? 'selected' : ''}>Vô thời hạn (Khuyên dùng - Không bao giờ hết hạn)</option>
                <option value="30d">30 ngày</option>
                <option value="90d">90 ngày</option>
                <option value="365d">365 ngày (1 năm)</option>
                <option value="7d">7 ngày</option>
            </select>
        </div>
        ${field('va-f-idle', 'Tự đăng xuất sau (phút)', `<input id="va-f-idle" type="number" min="1" max="480" class="${cls}" value="${a ? a.idle_timeout_minutes : 15}">`, 'Từ 1 đến 480 phút.')}`;
    vaOpenModal(`${a ? 'Sửa' : 'Cấp'} tài khoản cổng: ${v.short_name}`, body, a ? 'Lưu thay đổi' : 'Cấp tài khoản', async () => {
        const user = document.getElementById('va-f-user').value.trim();
        const pass = document.getElementById('va-f-pass').value;
        const idle = Number(document.getElementById('va-f-idle').value || 15);
        const tokInput = document.getElementById('va-f-tok').value.trim();
        const expPreset = document.getElementById('va-f-exp').value;
        const showErr = (id, msg) => { const e = document.getElementById(id + '-err'); e.textContent = msg; e.classList.remove('hidden'); document.getElementById(id).focus(); };
        ['va-f-user', 'va-f-pass', 'va-f-tok', 'va-f-idle'].forEach(i => {
            const el = document.getElementById(i + '-err');
            if (el) el.classList.add('hidden');
        });
        if (user.length < 3) { showErr('va-f-user', 'Tên đăng nhập phải có ít nhất 3 ký tự.'); return false; }
        if ((!a && pass.length < 6) || (a && pass && pass.length < 6)) { showErr('va-f-pass', 'Mật khẩu phải có ít nhất 6 ký tự.'); return false; }
        if (tokInput && tokInput.length < 4) { showErr('va-f-tok', 'Mã Token phải có ít nhất 4 ký tự.'); return false; }
        if (!Number.isInteger(idle) || idle < 1 || idle > 480) { showErr('va-f-idle', 'Thời gian phải từ 1 đến 480 phút.'); return false; }
        const payload = { username: user, idle_timeout_minutes: idle };
        if (pass) payload.password = pass;
        if (tokInput) payload.confirm_token = tokInput;
        payload.token_expiry_preset = expPreset;
        const out = await vaAccountAction(vendorId, payload, a ? 'Đã lưu tài khoản.' : 'Đã cấp tài khoản cổng nhà xe.');
        if (!out) return false;
        vaCloseModal();
        if (out.data) vaShowTokenResult(v.short_name, out.data);
    }, { wide: true });
}

window.loadAllocationsTab = loadAllocationsTab;
window.renderAllocationsTable = renderAllocationsTable;
window.setJourneyMode = setJourneyMode;
window.loadJourneyBoard = loadJourneyBoard;
window.renderJourneyBoard = renderJourneyBoard;
window.loadVendorAdminTab = loadVendorAdminTab;
window.setVendorAdminSection = setVendorAdminSection;
window.renderVendorAdmin = renderVendorAdmin;
window.vaCloseModal = vaCloseModal;
window.vaCopy = vaCopy;
window.vaCopyAlloc = vaCopyAlloc;
window.vaRegenAlloc = vaRegenAlloc;
window.vaLockAlloc = vaLockAlloc;
window.vaRevokeAlloc = vaRevokeAlloc;
window.vaCopyDriver = vaCopyDriver;
window.vaDriverExpiry = vaDriverExpiry;
window.vaDriverRegen = vaDriverRegen;
window.vaDriverRevoke = vaDriverRevoke;
window.vaAccountModal = vaAccountModal;
window.vaAccountAction = vaAccountAction;
window.vaToggleAccount = vaToggleAccount;
window.vaIssueToken = vaIssueToken;
window.vaToggleShowToken = vaToggleShowToken;
window.vaGenRandomToken = vaGenRandomToken;
window.vaIssueTokenModal = vaIssueTokenModal;
window.vaShowTokenResult = vaShowTokenResult;
window.vaShareVendorZaloModal = vaShareVendorZaloModal;
window.vaShareAllocZalo = vaShareAllocZalo;
window.vaShareDriverZalo = vaShareDriverZalo;
